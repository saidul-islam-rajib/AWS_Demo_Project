# AWS Demo Project — Personal Blog & Portfolio

A server-rendered blog and project portfolio built with **NestJS**, packaged with **Docker**, and
deployed to an **AWS EC2** instance by a **Jenkins** pipeline. Pushing to `main` rebuilds the image,
runs the test suite inside it, replaces the running container, and verifies the deploy answers
before reporting success.

The application and its delivery pipeline are both part of this repository — the blog is the
subject, and the CI/CD that ships it is half the point.

| | |
|---|---|
| **Blog** | http://16.171.254.209:3000/ |
| **Admin** | http://16.171.254.209:3000/admin |
| **Health** | http://16.171.254.209:3000/health |
| **Jenkins** | http://16.171.254.209:8080/ |
| **Host** | AWS EC2 · Ubuntu |

> Served over plain HTTP. There is no TLS, so the admin password crosses the network in the
> clear — treat it as low value and never reuse a real one. See [Known limitations](#known-limitations).

---

## Contents

- [What it does](#what-it-does)
- [Technology](#technology)
- [System design](#system-design)
- [Backend](#backend)
- [Frontend](#frontend)
- [Data and persistence](#data-and-persistence)
- [Running locally](#running-locally)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [HTTPS](#https)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

---

## What it does

### Writing and publishing
- Markdown posts with subtitles, key highlights, and tags
- Draft and published states — drafts are never publicly reachable
- **Scheduling**: backdate a post, or set a future time and it stays hidden until it arrives
- **Hand-picked related posts** — choose what appears under *More like this*, or leave it to
  the automatic suggestion by shared tags
- Image uploads pasted straight into the editor as Markdown
- Slugs generated from titles and kept stable when a title is edited

### Project portfolio
- Projects with short and detailed descriptions, each independently shown or hidden
- Four browsable taxonomies — **technologies, topics, keywords, tags** — every term its own page
- Grouped by year, filterable, searchable
- Importable from a GitHub username

### About page
- Intro, a journey timeline, skill groups, and a learning curve board
- Photo gallery with multiple images per entry, an inline slider, and a full-size modal
- Entirely editable from the admin — nothing is hardcoded

### Reading experience
- Live search across posts, tags and projects
- Light and dark themes following the system setting
- Responsive to mobile, with an off-canvas navigation drawer
- Reading-time estimates, view counts, tag pages

### Discovery and sharing
- Open Graph and Twitter Card metadata on every page
- **Generated 1200×630 share cards** — an uploaded photo is fitted whole into a correctly
  proportioned card rather than cropped or misdeclared
- An editable *sharing intro* controlling the text under a shared link
- `sitemap.xml`, `robots.txt`, and JSON-LD structured data

---

## Technology

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 20 (Alpine) | NestJS 11 requires ≥ 20 |
| Framework | NestJS 11 + Express | Modules and DI without a heavyweight runtime |
| Language | TypeScript 5.7 | Strict mode throughout |
| Rendering | Server-side, template literals | No view engine — see [Frontend](#frontend) |
| Markdown | `marked` v4 | v16 is ESM-only and will not load under CommonJS |
| Images | `sharp` | Resizing, WebP encoding, EXIF orientation |
| Compression | `compression` | gzip; `/about` drops 30.6 KB → 8.1 KB |
| Auth | Node `crypto` | HMAC-signed cookie, no dependency needed |
| Storage | JSON on a Docker volume | See [Data and persistence](#data-and-persistence) |
| Tests | Jest + Supertest | 222 unit, 101 end-to-end |
| Container | Docker | Build artifact and runtime |
| CI/CD | Jenkins (declarative) | Runs on the same EC2 host |
| Cloud | AWS EC2 | Single instance, Ubuntu |

---

## System design

One EC2 instance runs everything: Jenkins, the Docker daemon, and the application container.

```
   git push
      │
      ▼
┌──────────────┐   webhook    ┌─────────────────────────────────────────┐
│    GitHub    │─────────────▶│         EC2 instance (Ubuntu)           │
└──────────────┘              │                                         │
                              │  ┌───────────────────────────────────┐  │
                              │  │ Jenkins  :8080                    │  │
                              │  │                                   │  │
                              │  │ Preflight → Checkout → Build      │  │
                              │  │     → Test → Deploy → Verify      │  │
                              │  └───────────────┬───────────────────┘  │
                              │                  │ docker build/run     │
                              │                  ▼                      │
                              │  ┌───────────────────────────────────┐  │
                              │  │ Container: nestjs-app  :3000      │  │
                              │  │   NestJS · server-rendered HTML   │  │
                              │  └───────────────┬───────────────────┘  │
                              │                  │ /app/data            │
                              │                  ▼                      │
                              │  ┌───────────────────────────────────┐  │
                              │  │ Docker volume: blog_data          │  │
                              │  │   *.json · uploads/ · cache/      │  │
                              │  └───────────────────────────────────┘  │
                              └─────────────────────────────────────────┘
```

**The design decision that matters:** the container is disposable and the volume is not. Every
deploy destroys and recreates the container, so all state lives on `blog_data`. The pipeline
prunes images aggressively and *never* prunes volumes.

### Request flow

```
Request
  → compression (gzip)
  → cookie-parser
  → Cache-Control middleware   no-store for /admin · revalidate for pages
  → /uploads static            immutable, 1 year
  → NestJS router
      Controller → Service → JSON store (in-memory, atomic writes to disk)
      Controller → View function → HTML string
```

---

## Backend

**NestJS modules**, one per domain: `posts`, `projects`, `about`, `settings`, `uploads`, `auth`, `seo`.

Each follows the same shape — a controller for HTTP, a service holding logic and state, a model
file with pure functions (slugs, word counts, normalisation) that are unit-tested without booting
the framework.

### Authentication
A single admin password, compared with `timingSafeEqual` so the comparison cannot be timed. On
success the server sets an **HMAC-SHA256 signed session cookie** — `httpOnly`, 12-hour expiry,
carrying its own expiry inside the signed payload. No session store and no JWT library.

**Sign-in is rate limited per client address**: five wrong passwords locks that address out for
15 minutes, and the lock is checked *before* the password is examined, so guessing gains nothing
even if the attacker happens to be right. Failures older than the window are forgotten, a correct
password clears the record, and one address being locked never affects another. Attempts are keyed
on the socket address rather than `X-Forwarded-For`, which is client-supplied and would otherwise
let an attacker reset their own limit by changing one header.

### Image pipeline
`GET /img/:name?w=` serves resized variants generated **on demand** and cached to disk:

- Widths are restricted to `200, 400, 800, 1600`; anything else passes through untouched
- Output is WebP at quality 82 — roughly half the bytes of quality 90, visually identical here
- `.rotate()` applies EXIF orientation, which resizing otherwise discards
- Never upscales: a 300px original requested at 800 stays 300px
- Cached outside `uploads/` so variants are never served as user uploads
- A `CACHE_VERSION` constant invalidates every cached variant when the encoder changes

`GET /img/og/:name` builds the 1200×630 social card: the photo fitted whole into the frame over a
blurred, darkened copy of itself. Nothing is cropped, so a portrait photo keeps its subject.

### Caching strategy
| Resource | Header |
|---|---|
| HTML pages | `no-cache, must-revalidate` → 304 with no body |
| `/admin`, `/login` | `no-store` |
| `/uploads`, `/img` | `public, max-age=31536000, immutable` |

Upload filenames carry a timestamp and random suffix, so a given URL always names the same
bytes and can safely be cached for a year.

---

## Frontend

**There is no frontend framework, no build step, and no client-side router.** Every page is HTML
generated on the server by plain TypeScript functions in `src/views/`, returned as a string.

```ts
export function aboutPage(about: AboutContent, introHtml: string): string {
  return layout({ title: '…', body: `…`, path: '/about' });
}
```

CSS and JavaScript are inlined into the page rather than served as separate files. On a
single-instance deployment this trades a slightly larger HTML document — which gzip compresses
very well — for zero additional round trips.

- **Styling**: CSS custom properties for theming, `prefers-color-scheme` for dark mode, grid and
  flexbox for layout, `color-mix()` for accent tints
- **JavaScript**: small vanilla IIFEs for the gallery slider, live search, chip inputs, the mobile
  drawer, and image skeletons. No bundler, no dependencies
- **Progressive enhancement**: image skeletons paint as the image's own background, so a failed
  script leaves a visible photo rather than a blank box
- **A guard test** (`inline-scripts.spec.ts`) renders all 13 pages and parses every inline script
  with `vm.Script`, because escaping bugs inside template literals shipped five times before it existed

---

## Data and persistence

No database. Four JSON files on the mounted volume:

```
/app/data/
├── posts.json          ├── uploads/          uploaded images
├── projects.json       └── cache/images/     generated variants + OG cards
├── about.json
└── settings.json
```

Each service loads its file into memory at boot and writes the whole file on change. Writes are
**atomic** — to a temporary file, then `renameSync` — so a crash mid-write cannot truncate the
store. Missing fields are backfilled on read, which is how older records survive schema changes
without a migration step.

This suits the workload: a single author, low write volume, and reads served from memory. It
would not survive horizontal scaling.

---

## Running locally

**Requirements:** Node.js ≥ 20, npm. Docker optional.

```bash
git clone git@github.com:saidul-islam-rajib/AWS_Demo_Project.git
cd AWS_Demo_Project/automation
npm install

ADMIN_PASSWORD=dev-password npm run start:dev
```

Open http://localhost:3000 — the store seeds itself with starter posts and projects on first run.
Sign in at `/login`.

### With Docker

```bash
cd automation
docker build -t blog .
docker run -d --name blog -p 3000:3000 \
  -e ADMIN_PASSWORD=dev-password \
  -v blog_data:/app/data \
  blog
```

### npm scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` | ESLint + Prettier, autofixing |

---

## Configuration

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | — | Admin password. **Unset disables sign-in entirely** |
| `SESSION_SECRET` | random at boot | HMAC key. Unset means sessions drop on restart |
| `DATA_DIR` | `/app/data` | Where JSON and uploads are written |
| `PORT` | `3000` | Listen port |

On the server these live in `/opt/blog/.env`, outside the repository, and are passed with
`--env-file`. That file must be readable by the `jenkins` user:

```bash
sudo chown root:jenkins /opt/blog/.env
sudo chmod 640 /opt/blog/.env
```

> `chmod 600` is a root-only permission. Docker runs as `jenkins`, so 600 makes the file
> unreadable at deploy time and sign-in silently breaks.

### In-app settings

Everything else is configured from **Admin → Settings**, not from code: author name, role, bio,
avatar, site title, tagline, site URL, GitHub username, sharing intro, and footer links.

`Site URL` matters — Open Graph requires absolute URLs, so link previews depend on it being correct.

---

## Deployment

Triggered by a push to `main` via GitHub webhook, with SCM polling as a fallback.

| Stage | What it does |
|---|---|
| **Preflight** | Prunes containers, images and build cache *before* the build needs space; fails with a clear message below 1 GB free |
| **Checkout** | `checkout scm` |
| **Build** | `docker build`, tagged with the build number and `latest` |
| **Test** | Runs the suite **inside the built image**, so what is tested is what ships |
| **Deploy** | Stops the old container, starts the new one with the volume and env file attached |
| **Verify** | Polls `/health` up to 20 times before declaring success |
| **Post** | Prunes numbered tags beyond the three newest; emails the outcome |

Pipeline options: build history capped at 8, concurrent builds disabled, 20-minute timeout.

**Rollback** is running a previous image tag:

```bash
docker stop nestjs-app && docker rm nestjs-app
docker run -d --name nestjs-app --restart unless-stopped -p 3000:3000 \
  -v blog_data:/app/data --env-file /opt/blog/.env nestjs-image:<build-number>
```

### Why cleanup runs before the build

`docker image prune -f` removes only *dangling* images. Every build here is tagged, so nothing was
ever collected and the disk filled at build #15. Cleanup was added to `post` — which then failed at
build #41, because once the disk is full a build cannot reach the step that would free it. The
**Preflight** stage exists to break that deadlock.

---

## HTTPS

Caddy is installed on the instance and reverse-proxies `16.171.254.209.sslip.io` to the app on
port 3000. The config is in [`deploy/Caddyfile`](deploy/Caddyfile) and lives at `/etc/caddy/Caddyfile`
on the server. `sslip.io` resolves any embedded IP back to itself, so this needs no domain
registration.

Certificates are issued by Let's Encrypt automatically, which requires inbound **80 and 443** in
the EC2 security group. Until those are open, Caddy serves HTTP only and retries issuance.

Once HTTPS is confirmed working, finish in this order:

1. **Close public access to port 3000.** Caddy reaches the app over localhost, so the app no
   longer needs to be exposed directly.
2. **Set `TRUST_PROXY=1`** in `/opt/blog/.env` and redeploy.

The order matters. `TRUST_PROXY=1` tells Express to believe `X-Forwarded-For`, which is only safe
when every request genuinely arrives through the proxy. Setting it while port 3000 is still
publicly reachable lets an attacker connect directly and forge that header, which defeats the
sign-in rate limit entirely.

---

## Testing

```bash
npm test          # 222 unit tests across 10 suites
npm run test:e2e  # 101 end-to-end tests
```

End-to-end tests boot the real Nest application against a temporary `DATA_DIR`, exercising HTTP
in and HTML out. They cover auth, drafts and scheduling, taxonomies, uploads, image variants,
caching headers, Open Graph output, and related-post selection.

Most tests exist because something broke first, and each is written to fail for the reason it
claims — a test asserting that hand-picked related posts win is set up so the automatic
suggestion would produce a different answer.

---

## Project structure

```
AWS_Demo_Project/
├── Jenkinsfile               pipeline definition
├── README.md
└── automation/
    ├── Dockerfile
    ├── src/
    │   ├── main.ts           bootstrap, middleware, static mounts
    │   ├── app.module.ts
    │   ├── posts/            posts + admin editor
    │   ├── projects/         portfolio + taxonomies
    │   ├── about/            timeline, skills, gallery
    │   ├── settings/         site configuration
    │   ├── uploads/          upload, resize, OG cards
    │   ├── auth/             signed-cookie session
    │   ├── seo/              sitemap, robots
    │   └── views/            HTML generation
    └── test/                 end-to-end suite
```

---

## Known limitations

Honest about what is not production-grade:

- **No HTTPS.** The admin password is sent in plaintext, and LinkedIn will not render link
  previews for a raw IP on a non-standard port. A domain and a certificate fix both.
- **6.7 GB root volume.** Disk exhaustion has stopped the pipeline twice. Preflight cleanup
  mitigates it; a larger EBS volume solves it.
- **No backups.** `blog_data` exists in exactly one place.
- **Single instance.** In-memory state with file writes does not scale horizontally.
- **Rate limiting is per instance and in memory.** Locks are cleared by a restart, and a
  reverse proxy in front of the app would need Express's `trust proxy` enabled or every
  visitor arrives as the proxy and shares one bucket.
