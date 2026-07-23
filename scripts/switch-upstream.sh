#!/bin/sh

set -eu

UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/caddy/upstream.conf}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"

log() { echo "[switch] $*"; }
fail() { echo "[switch] ERROR: $*" >&2; exit 1; }

unavailable() {
    echo "[switch] $*" >&2
    echo "[switch] Blue/green switching is unavailable, so the deploy will fall back." >&2
    echo "[switch] Set it up once on the host with:" >&2
    echo "[switch]     sudo sh scripts/setup-jenkins-permissions.sh" >&2
    exit 2
}

probe() {
    command -v caddy > /dev/null 2>&1 \
        || unavailable "caddy is not installed on this host."

    [ -f "$CADDYFILE" ] \
        || unavailable "$CADDYFILE is missing, so Caddy is not configured yet."

    sudo -n -l > /dev/null 2>&1 \
        || unavailable "the $(id -un) user cannot use sudo without a password."

    sudo -n -l 2>/dev/null | grep -q "$UPSTREAM_FILE" \
        || unavailable "there is no sudoers rule allowing $(id -un) to write $UPSTREAM_FILE."

    sudo -n -l 2>/dev/null | grep -q 'reload caddy' \
        || unavailable "there is no sudoers rule allowing $(id -un) to reload caddy."
}

validate_config() {
    if caddy validate --config "$CADDYFILE" > /dev/null 2>&1; then
        return 0
    fi

    if sudo -n caddy validate --config "$CADDYFILE" > /dev/null 2>&1; then
        return 0
    fi

    return 1
}

if [ "${1:-}" = "--check" ]; then
    probe
    log "Blue/green switching is available."
    exit 0
fi

PORT="${1:-}"

case "$PORT" in
    ''|*[!0-9]*) fail "usage: $0 <port> | --check   (got '${PORT:-<empty>}')" ;;
esac

probe

curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/health" > /dev/null 2>&1 \
    || fail "nothing healthy on port $PORT — refusing to switch."

PREVIOUS="$(cat "$UPSTREAM_FILE" 2> /dev/null || true)"

log "Pointing Caddy at 127.0.0.1:${PORT}"

cat <<EOF | sudo -n tee "$UPSTREAM_FILE" > /dev/null
reverse_proxy 127.0.0.1:${PORT} {
	health_uri /health
	health_interval 10s
	health_timeout 2s
}
EOF

restore_previous() {
    if [ -n "$PREVIOUS" ]; then
        printf '%s\n' "$PREVIOUS" | sudo -n tee "$UPSTREAM_FILE" > /dev/null || true
        log "Restored the previous upstream."
    fi
}

if ! validate_config; then
    restore_previous
    fail "Caddy config is invalid — not reloading. The live site is untouched."
fi

if ! sudo -n systemctl reload caddy; then
    restore_previous
    fail "caddy reload failed. The live site is untouched."
fi

log "Caddy reloaded. Live upstream is now 127.0.0.1:${PORT}."
