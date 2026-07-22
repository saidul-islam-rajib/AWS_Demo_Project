set -e

NEW_PORT="${1:-3001}"
UPSTREAM_CONF="/etc/caddy/upstream.conf"
CADDY_RELOAD_CMD="systemctl reload caddy"

echo "[switch] Pointing Caddy at 127.0.0.1:${NEW_PORT}"

# Update the upstream configuration
echo "127.0.0.1:${NEW_PORT}" | sudo tee "${UPSTREAM_CONF}" > /dev/null

# Reload Caddy to apply the new configuration
sudo ${CADDY_RELOAD_CMD}

echo "[switch] Caddy reloaded successfully"
