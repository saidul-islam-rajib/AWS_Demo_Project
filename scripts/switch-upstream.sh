#!/bin/sh

set -eu

PORT="${1:-}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/caddy/upstream.conf}"

log() { echo "[switch] $*"; }
fail() { echo "[switch] ERROR: $*" >&2; exit 1; }

case "$PORT" in
    ''|*[!0-9]*) fail "usage: $0 <port>   (got '${PORT:-<empty>}')" ;;
esac

command -v caddy > /dev/null 2>&1 || fail "caddy is not installed on this host."

curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/health" > /dev/null 2>&1 \
    || fail "nothing healthy on port $PORT — refusing to switch."

log "Pointing Caddy at 127.0.0.1:${PORT}"

cat <<EOF | sudo tee "$UPSTREAM_FILE" > /dev/null
reverse_proxy 127.0.0.1:${PORT} {
	health_uri /health
	health_interval 10s
	health_timeout 2s
}
EOF

sudo caddy validate --config /etc/caddy/Caddyfile > /dev/null 2>&1 \
    || fail "Caddy config is invalid — not reloading. Site is untouched."

sudo systemctl reload caddy || fail "caddy reload failed."

log "Caddy reloaded. Live upstream is now 127.0.0.1:${PORT}."
