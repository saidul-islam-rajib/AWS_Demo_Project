#!/bin/sh

set -eu

VOLUME="${DATA_VOLUME:-blog_data}"
BACKUP_DIR="${BACKUP_DIR:-/opt/blog/backups}"
KEEP="${BACKUP_KEEP:-14}"
S3_BUCKET="${S3_BUCKET:-}"
MIN_FREE_KB="${MIN_FREE_KB:-524288}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
ARCHIVE="blog_data-${STAMP}.tar.gz"

log() { echo "[backup] $*"; }
fail() { echo "[backup] ERROR: $*" >&2; exit 1; }

command -v docker > /dev/null 2>&1 || fail "docker is not on PATH."

docker volume inspect "$VOLUME" > /dev/null 2>&1 \
    || fail "volume '$VOLUME' does not exist — nothing to back up."

mkdir -p "$BACKUP_DIR" || fail "cannot create $BACKUP_DIR"

prune_old() {
    ls -1t "$BACKUP_DIR"/blog_data-*.tar.gz 2> /dev/null \
        | tail -n "+$((KEEP + 1))" \
        | while read -r old; do
            log "Removing old archive $(basename "$old")"
            rm -f "$old"
          done
}

prune_old

free_kb="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
if [ "$free_kb" -lt "$MIN_FREE_KB" ]; then
    log "Only ${free_kb}KB free in $BACKUP_DIR, need ${MIN_FREE_KB}KB. Skipping."
    log "This is a skip, not a failure — the running site is untouched."
    exit 2
fi

log "Backing up volume '$VOLUME' → $BACKUP_DIR/$ARCHIVE"

docker run --rm \
    -v "$VOLUME":/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine:3.20 \
    tar czf "/backup/${ARCHIVE}.part" -C /data . \
    || fail "tar failed — no archive written."

docker run --rm \
    -v "$BACKUP_DIR":/backup:ro \
    alpine:3.20 \
    tar tzf "/backup/${ARCHIVE}.part" > /dev/null 2>&1 \
    || { rm -f "$BACKUP_DIR/${ARCHIVE}.part"; fail "archive failed verification — discarded."; }

mv "$BACKUP_DIR/${ARCHIVE}.part" "$BACKUP_DIR/$ARCHIVE"

size="$(du -h "$BACKUP_DIR/$ARCHIVE" | cut -f1)"
log "Wrote $ARCHIVE ($size)"

if [ -n "$S3_BUCKET" ]; then
    if command -v aws > /dev/null 2>&1; then
        log "Uploading to s3://$S3_BUCKET/blog-backups/$ARCHIVE"
        if aws s3 cp "$BACKUP_DIR/$ARCHIVE" \
            "s3://$S3_BUCKET/blog-backups/$ARCHIVE" --only-show-errors; then
            log "Upload complete."
        else
            log "WARNING: upload failed. The local archive is still valid."
        fi
    else
        log "WARNING: S3_BUCKET is set but the aws CLI is not installed. Local only."
    fi
else
    log "S3_BUCKET not set — archive is local only, on the same disk as the volume."
fi

prune_old

count="$(ls -1 "$BACKUP_DIR"/blog_data-*.tar.gz 2> /dev/null | wc -l | tr -d ' ')"
log "Done. $count archive(s) retained in $BACKUP_DIR."
