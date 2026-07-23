# Host setup — HTTPS, backups, zero-downtime deploys

One-time setup on the EC2 instance. Everything here runs as a user with sudo,
not as `jenkins`.

The pipeline works before any of this is done — it falls back to the old
single-container deploy on port 3000. Each section below can be applied
independently.

---

## 1. Backups

The most important part, and the one with no prerequisites.

```bash
sudo mkdir -p /opt/blog/backups
sudo chown jenkins:jenkins /opt/blog/backups
```

That is enough for the pipeline's **Backup** stage to start writing snapshots
before every deploy. Test it by hand first:

```bash
sh scripts/backup.sh
sh scripts/restore.sh          # lists what exists, restores nothing
```

### Nightly snapshots

Deploy-time backups only happen when you deploy. Add a cron entry so content
written between deploys is covered:

```bash
sudo crontab -e
```

```cron
# Snapshot the blog volume nightly at 03:00 UTC.
0 3 * * * /usr/bin/sh /var/lib/jenkins/workspace/<job-name>/scripts/backup.sh >> /var/log/blog-backup.log 2>&1
```

Point it at a stable checkout rather than a Jenkins workspace if you have one —
workspaces get wiped.

### Off-instance copies

**A backup on the same disk as the volume it protects is not a backup.** It
survives a bad deploy; it does not survive losing the instance. To fix that,
give the instance an IAM role with `s3:PutObject` on one bucket, then set
`S3_BUCKET` in the Jenkinsfile environment block (or in the cron line).

Until then the archives are local only, and `backup.sh` says so on every run.

### Restoring

```bash
sh scripts/restore.sh                              # list archives
sh scripts/restore.sh latest --yes                 # restore the newest
sh scripts/restore.sh blog_data-20260722-030000.tar.gz --yes
```

Restore takes a `pre-restore-*.tar.gz` snapshot of the current state before
overwriting anything, so restoring the wrong archive is itself undoable. It
refuses to run without `--yes`.

---

## 2. HTTPS with Caddy

### DNS

Let's Encrypt will not issue a certificate for a bare IP address, so a hostname
is a prerequisite rather than a nicety. The site uses `team-sober.com`,
registered through Cloudflare, with two A records:

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | `16.171.254.209` | DNS only |
| A | `www` | `16.171.254.209` | DNS only |

> **The records must be "DNS only", not proxied.** With Cloudflare's proxy
> enabled, Cloudflare terminates TLS itself and Caddy's ACME challenge never
> reaches this server, so certificate issuance fails.

An earlier iteration used `sslip.io` wildcard DNS to avoid registering a
domain. It worked from the server but resolved to a parking address on some
consumer networks, which is the failure mode a real domain removes.

### Open the ports

Caddy needs 80 (for the ACME challenge) and 443. In the EC2 **security group**,
allow inbound `80` and `443` from `0.0.0.0/0`.

Once this works, **close inbound 3000** — the app binds to `127.0.0.1` from
then on, so the port serves nothing, and leaving it open advertises a plaintext
route that no longer exists.

### Install

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### Configure

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo cp deploy/upstream.conf /etc/caddy/upstream.conf
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Watch the first certificate being issued:

```bash
sudo journalctl -u caddy -f
```

### Let Jenkins flip the upstream

The deploy rewrites `/etc/caddy/upstream.conf` and reloads Caddy, both of which
need root. Grant exactly those two things and nothing else:

```bash
sudo visudo -f /etc/sudoers.d/jenkins-caddy
```

```sudoers
jenkins ALL=(root) NOPASSWD: /usr/bin/tee /etc/caddy/upstream.conf
jenkins ALL=(root) NOPASSWD: /usr/bin/systemctl reload caddy
jenkins ALL=(root) NOPASSWD: /usr/bin/caddy validate --config /etc/caddy/Caddyfile
```

### Point the app at its own URL

Open **Admin → Settings** and set **Site URL** to
`https://team-sober.com`.

This is not cosmetic. Open Graph, the canonical link, `sitemap.xml` and
`feed.xml` all build absolute URLs from it, so link previews stay broken until
it is right.

Also set `TRUST_PROXY=1` in `/opt/blog/.env`. Behind a proxy every request
arrives from Caddy's address, so without it the login rate limiter puts every
visitor in one shared bucket — five failures from anyone would lock out
everyone.

```bash
echo 'TRUST_PROXY=1' | sudo tee -a /opt/blog/.env
```

---

## 3. Zero-downtime deploys

No setup beyond section 2 — the pipeline detects Caddy and switches
automatically.

### How it works

```
build → test → backup
                 │
                 ▼
        start the idle colour        blue :3001 / green :3002, on 127.0.0.1
                 │                   old colour still serving
                 ▼
        health-check it directly     up to 40s, on its own port
                 │
                 ├── fails → remove it, old colour never stopped, build fails
                 │
                 ▼
        rewrite upstream.conf
        caddy reload                 graceful: in-flight requests finish
                 │
                 ▼
        stop the old colour          stopped, not removed
```

The switch is a single graceful reload, so no request is dropped. A release
that cannot start never receives traffic at all.

### Rollback

The previous container is stopped rather than removed, so rolling back is:

```bash
docker start nestjs-app-blue          # or -green, whichever was previous
sh scripts/switch-upstream.sh 3001    # the port that colour runs on
```

Which colour is live:

```bash
grep reverse_proxy /etc/caddy/upstream.conf
docker ps -a --filter name=nestjs-app
```

### The one caveat worth understanding

Both containers are briefly running against the same volume — from when the
new one boots until the old one stops, typically five to fifteen seconds.

Each service reads its JSON file into memory at boot and writes the whole file
back on change. So if an admin write lands on the **old** container during that
window, the new container's in-memory copy is already stale, and its next write
overwrites that change.

This is a property of the JSON store, not of the deploy: it is the same reason
the application cannot run two instances at all. In practice the window is
seconds long, on a single-author blog, during a deploy you triggered. The
**Backup** stage runs immediately before, so anything lost this way is
recoverable.

Moving to a real database is what removes the caveat rather than shrinking it.

---

## Verifying the whole thing

```bash
curl -I https://team-sober.com/health     # 200, valid certificate
curl -I http://team-sober.com/health      # 308 redirect to HTTPS
curl -s https://team-sober.com/feed.xml | head -5
ls -lh /opt/blog/backups/
```

Then run the URL through
[LinkedIn's Post Inspector](https://www.linkedin.com/post-inspector/) to prime
its cache before posting — LinkedIn caches previews aggressively and for a long
time.
