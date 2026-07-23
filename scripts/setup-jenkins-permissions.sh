#!/bin/sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUDOERS_SRC="${SUDOERS_SRC:-$SCRIPT_DIR/jenkins-sudoers}"
SUDOERS_DEST="${SUDOERS_DEST:-/etc/sudoers.d/jenkins-caddy}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/caddy/upstream.conf}"
BACKUP_DIR="${BACKUP_DIR:-/opt/blog/backups}"
JENKINS_USER="${JENKINS_USER:-jenkins}"

log() { echo "[setup] $*"; }
fail() { echo "[setup] ERROR: $*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || fail "run this as root: sudo sh $0"

id "$JENKINS_USER" > /dev/null 2>&1 \
    || fail "user '$JENKINS_USER' does not exist on this host."

[ -f "$SUDOERS_SRC" ] || fail "cannot find $SUDOERS_SRC"

log "Validating $SUDOERS_SRC"
visudo -c -f "$SUDOERS_SRC" > /dev/null \
    || fail "sudoers syntax is invalid — refusing to install it."

install -m 0440 -o root -g root "$SUDOERS_SRC" "$SUDOERS_DEST"
log "Installed $SUDOERS_DEST"

mkdir -p "$(dirname "$UPSTREAM_FILE")"

if [ ! -f "$UPSTREAM_FILE" ]; then
    if curl -fsS --max-time 3 http://127.0.0.1:3000/health > /dev/null 2>&1; then
        START_PORT=3000
        log "Port 3000 is answering, so the first upstream will point there."
    else
        START_PORT=3001
        log "Nothing is answering on port 3000, so the first upstream will point at 3001."
    fi

    cat > "$UPSTREAM_FILE" <<EOF
reverse_proxy 127.0.0.1:${START_PORT} {
	health_uri /health
	health_interval 10s
	health_timeout 2s
}
EOF

    chown root:root "$UPSTREAM_FILE"
    chmod 0644 "$UPSTREAM_FILE"
    log "Created $UPSTREAM_FILE"
else
    log "$UPSTREAM_FILE already exists — leaving it alone."
fi

mkdir -p "$BACKUP_DIR"
chown "$JENKINS_USER":"$JENKINS_USER" "$BACKUP_DIR"
log "Backup directory ready at $BACKUP_DIR"

log "Checking what $JENKINS_USER can do"

sudo -u "$JENKINS_USER" sudo -n -l > /dev/null 2>&1 \
    || fail "$JENKINS_USER still cannot use sudo without a password."

sudo -u "$JENKINS_USER" sudo -n -l 2>/dev/null | grep -q "$UPSTREAM_FILE" \
    || fail "$JENKINS_USER cannot write $UPSTREAM_FILE."

sudo -u "$JENKINS_USER" sudo -n -l 2>/dev/null | grep -q 'reload caddy' \
    || fail "$JENKINS_USER cannot reload caddy."

log "Sudo rules are in place."

if command -v caddy > /dev/null 2>&1 && [ -f /etc/caddy/Caddyfile ]; then
    if caddy validate --config /etc/caddy/Caddyfile > /dev/null 2>&1; then
        log "Caddy config validates."
    else
        log "WARNING: /etc/caddy/Caddyfile does not validate. Fix it before the next deploy."
    fi
else
    log "WARNING: caddy or /etc/caddy/Caddyfile is missing. See deploy/README.md."
fi

log "Done. The next deploy can perform a blue/green switch."
