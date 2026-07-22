#!/bin/sh

set -eu

VOLUME="${DATA_VOLUME:-blog_data}"
BACKUP_DIR="${BACKUP_DIR:-/opt/blog/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-nestjs-app}"

log() { echo "[restore] $*"; }
fail() { echo "[restore] ERROR: $*" >&2; exit 1; }

command -v docker > /dev/null 2>&1 || fail "docker is not on PATH."
[ -d "$BACKUP_DIR" ] || fail "$BACKUP_DIR does not exist."

list_archives() {
    ls -1t "$BACKUP_DIR"/blog_data-*.tar.gz 2> /dev/null || true
}

if [ $# -eq 0 ]; then
    echo "Available archives in $BACKUP_DIR:"
    echo
    archives="$(list_archives)"
    if [ -z "$archives" ]; then
        echo "  (none)"
    else
        echo "$archives" | while read -r a; do
            printf '  %-42s %s\n' "$(basename "$a")" "$(du -h "$a" | cut -f1)"
        done
    fi
    echo
    echo "Restore with:  $0 latest --yes"
    exit 0
fi

TARGET="$1"
CONFIRM="${2:-}"

if [ "$TARGET" = "latest" ]; then
    TARGET="$(list_archives | head -1)"
    [ -n "$TARGET" ] || fail "no archives found in $BACKUP_DIR."
else
    case "$TARGET" in
        /*) : ;;
        *) TARGET="$BACKUP_DIR/$TARGET" ;;
    esac
fi

[ -f "$TARGET" ] || fail "archive not found: $TARGET"

docker run --rm -v "$(dirname "$TARGET")":/backup:ro alpine:3.20 \
    tar tzf "/backup/$(basename "$TARGET")" > /dev/null 2>&1 \
    || fail "archive is unreadable or corrupt: $(basename "$TARGET")"

if [ "$CONFIRM" != "--yes" ]; then
    echo
    echo "About to REPLACE the contents of volume '$VOLUME' with:"
    echo "    $(basename "$TARGET")  ($(du -h "$TARGET" | cut -f1))"
    echo
    echo "Every post, project and upload currently in the volume will be"
    echo "overwritten. A safety snapshot is taken first, but re-run with --yes"
    echo "to confirm you intend this:"
    echo
    echo "    $0 $(basename "$TARGET") --yes"
    exit 1
fi

log "Taking a safety snapshot of the current volume before overwriting it."
SAFETY="pre-restore-$(date -u +%Y%m%d-%H%M%S).tar.gz"
docker run --rm \
    -v "$VOLUME":/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine:3.20 \
    tar czf "/backup/$SAFETY" -C /data . \
    || fail "could not snapshot the current volume — refusing to overwrite it."
log "Current state saved as $SAFETY"

was_running=""
if [ "$(docker ps -q -f name="^${CONTAINER_NAME}$")" ]; then
    was_running="yes"
    log "Stopping $CONTAINER_NAME so it cannot write during the restore."
    docker stop "$CONTAINER_NAME" > /dev/null
fi

log "Restoring $(basename "$TARGET") into '$VOLUME'."

docker run --rm \
    -v "$VOLUME":/data \
    -v "$(dirname "$TARGET")":/backup:ro \
    alpine:3.20 \
    sh -c "rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf '/backup/$(basename "$TARGET")' -C /data" \
    || fail "restore failed. The safety snapshot is at $BACKUP_DIR/$SAFETY"

if [ -n "$was_running" ]; then
    log "Starting $CONTAINER_NAME."
    docker start "$CONTAINER_NAME" > /dev/null
else
    log "$CONTAINER_NAME was not running — start it or redeploy when ready."
fi

log "Restore complete."
log "If this was a mistake, undo it with:  $0 $SAFETY --yes"
