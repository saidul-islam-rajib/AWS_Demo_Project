# AWS Demo Project — Personal Blog & Portfolio

A server-rendered blog and project portfolio built with **NestJS**, containerised with **Docker**,
and deployed to an **AWS EC2** instance by a **Jenkins** pipeline. A push to `main` rebuilds the
image, runs 323 tests inside it, replaces the running container, and verifies the deployment
answers before reporting success.

The application and the pipeline that ships it are both part of this repository. The blog is the
subject; the delivery pipeline is half the point.

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)
![Node](https://img.shields.io/badge/Node.js-20-339933)
![Docker](https://img.shields.io/badge/Docker-containerised-2496ED)
![Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins-D24939)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900)
![Tests](https://img.shields.io/badge/tests-323%20passing-brightgreen)

| | |
|---|---|
| **Blog** | http://16.171.254.209:3000/ |
| **Admin** | http://16.171.254.209:3000/admin |
| **Health** | http://16.171.254.209:3000/health |
| **Jenkins** | http://16.171.254.209:8080/ |
| **Host** | AWS EC2 · Ubuntu · eu-north-1 |

> **Served over plain HTTP.** There is no TLS, so the admin password crosses the network in the
> clear. Treat it as low value and never reuse a real one. See [Known limitations](#known-limitations).

---

## Contents

- [Project goals](#project-goals)
- [Why this project exists](#why-this-project-exists)
- [What it does](#what-it-does)
- [Technology stack](#technology-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Database and persistence](#database-and-persistence)
  - [Infrastructure](#infrastructure)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [Performance and memory](#performance-and-memory)
- [Scalability](#scalability)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

---

## Project goals

The application is a working blog. The repository is a demonstration of shipping one end to end.

| Goal | How it is met |
|---|---|
| **Build a complete product, not a demo** | Posts, portfolio, about page, search, uploads, SEO — all editable from an admin UI, nothing hardcoded |
| **Own the delivery pipeline** | Push to `main` builds, tests, deploys and verifies without manual intervention |
| **Run on real cloud infrastructure** | A live AWS EC2 instance with the constraints that come with it — a small disk, one host, no managed services |
| **Keep the dependency surface small** | 8 runtime dependencies. No frontend framework, no ORM, no session library, no bundler |
| **Test what actually ships** | The suite runs *inside the built image* during the pipeline, so the tested artifact is the deployed artifact |

---

## Why this project exists

> **Note for the author:** this section states motivation, which only you can speak to. What follows
> is drafted from what the repository shows — please rewrite it in your own words or confirm it.

The project was built to learn cloud deployment and CI/CD by doing the whole thing rather than
reading about it — provisioning an EC2 instance, installing Jenkins on it, writing a pipeline,
and living with the consequences when it broke.

Much of the design records something that went wrong first. The **Preflight** cleanup stage exists
because the disk filled at build #15 and again at #41. The guard test on inline scripts exists
because escaping bugs inside template literals shipped five times. Sign-in rate limiting was added
because a public IP attracts attention. That history is kept visible in this document deliberately:
the decisions are more useful with the reason attached.

**It is publicly accessible** because a deployment nobody can reach proves nothing. A public URL
means real link previews, real search engine crawlers, real uptime, and real exposure — which is
also why the security trade-offs below are documented honestly rather than quietly.

---

## What it does

### Writing and publishing
- Markdown posts with subtitles, key highlights, and tags
- Draft and published states — drafts are never publicly reachable
- **Scheduling** — backdate a post, or set a future time and it stays hidden until it arrives
- **Hand-picked related posts** — choose what appears under *More like this*, or let it fall back to automatic suggestion by shared tags
- Image uploads pasted straight into the editor as Markdown
- Slugs generated from titles and kept stable when a title is later edited

### Project portfolio
- Projects with short and detailed descriptions, each independently shown or hidden
- Four browsable taxonomies — **technologies, topics, keywords, tags** — every term with its own page
- Grouped by year, filterable, searchable
- Importable from a GitHub username

### About page
- Intro, journey timeline, skill groups, and a learning-curve board
- Photo gallery with multiple images per entry, an inline slider, and a full-size modal
- Entirely editable from the admin — nothing hardcoded

### Reading experience
- Live search across posts, tags and projects
- Light and dark themes following the system setting
- Responsive to mobile, with an off-canvas navigation drawer
- Reading-time estimates, view counts, tag pages

### Discovery and sharing
- Open Graph and Twitter Card metadata on every page
- **Generated 1200×630 share cards** — an uploaded photo fitted whole into a correctly proportioned card rather than cropped or misdeclared
- An editable *sharing intro* controlling the text under a shared link
- `sitemap.xml`, `robots.txt`, and JSON-LD structured data

---

## Technology stack

| Layer | Choice | Why this one |
|---|---|---|
| Runtime | Node.js 20 (Alpine) | NestJS 11 requires ≥ 20; Alpine keeps the image small |
| Framework | NestJS 11 + Express | Modules and dependency injection without a heavyweight runtime |
| Language | TypeScript 5.7 | Strict mode throughout |
| Rendering | Server-side, template literals | No view engine — see [Frontend](#frontend) |
| Markdown | `marked` v4 | Pinned: v16 is ESM-only and will not load under CommonJS |
| Images | `sharp` | Resizing, WebP encoding, EXIF orientation |
| Compression | `compression` | gzip; `/about` drops 30.6 KB → 8.1 KB |
| Auth | Node `crypto` | HMAC-signed cookie — no session store, no JWT library |
| Storage | JSON files on a Docker volume | See [Database and persistence](#database-and-persistence) |
| Tests | Jest + Supertest | 222 unit, 101 end-to-end |
| Container | Docker | Both the build artifact and the runtime |
| CI/CD | Jenkins (declarative pipeline) | Runs on the same EC2 host |
| Cloud | AWS EC2 | Single Ubuntu instance |

### Frontend

**There is no frontend framework, no build step, and no client-side router.** Every page is HTML
generated on the server by plain TypeScript functions in `src/views/`, returned as a string.

```ts
export function aboutPage(about: AboutContent, introHtml: string): string {
  return layout({ title: '…', body: `…`, path: '/about' });
}
```

| Concern | Approach |
|---|---|
| Templating | TypeScript template literals — typed, testable, no engine |
| Styling | Hand-written CSS with custom properties for theming, grid and flexbox for layout, `color-mix()` for accent tints |
| Dark mode | `prefers-color-scheme`, following the system setting |
| JavaScript | Small vanilla IIFEs — gallery slider, live search, chip inputs, mobile drawer, image skeletons |
| Delivery | CSS and JS inlined into the document rather than served as separate files |
| Dependencies | **None.** No React, no jQuery, no bundler, no CSS framework |

Inlining assets trades a slightly larger HTML document — which gzip compresses very well — for zero
additional round trips. On a single-instance deployment with no CDN, that is the right side of the
trade.

**Progressive enhancement:** image skeletons paint as the image's own background, so a script that
fails to run leaves a visible photo rather than a blank box.

**A guard test** (`inline-scripts.spec.ts`) renders all 13 pages and parses every inline script with
`vm.Script`, because escaping bugs inside template literals shipped five times before it existed.

### Backend

**NestJS modules, one per domain:** `posts`, `projects`, `about`, `settings`, `uploads`, `auth`, `seo`.

Each module follows the same three-part shape:

| File | Responsibility |
|---|---|
| `*.controller.ts` | HTTP routing, request parsing, response headers |
| `*.service.ts` | Business logic and in-memory state, injected via DI |
| `*.model.ts` | Pure functions — slug generation, word counts, normalisation — unit-tested without booting the framework |

Keeping the pure logic in a separate file is what makes 222 unit tests run in about 3 seconds: most
of them never start Nest at all.

**Middleware chain**, in order, from `src/main.ts`:

```
compression (gzip)
  → cookie-parser
  → Cache-Control middleware      no-store for /admin and /login · revalidate elsewhere
  → urlencoded body parser        2 MB limit
  → /uploads static               immutable, max-age 1 year
  → NestJS router
```

**Image pipeline.** `GET /img/:name?w=` serves resized variants generated **on demand** and cached
to disk:

- Widths restricted to `200, 400, 800, 1600` — anything else passes through untouched
- Output is WebP at quality 82, roughly half the bytes of quality 90 and visually identical here
- `.rotate()` applies EXIF orientation, which resizing otherwise discards
- Never upscales: a 300 px original requested at 800 stays 300 px
- Cached outside `uploads/`, so generated variants can never be served as user uploads
- A `CACHE_VERSION` constant invalidates every cached variant when the encoder changes

`GET /img/og/:name` builds the 1200×630 social card: the photo fitted whole into the frame over a
blurred, darkened copy of itself. Nothing is cropped, so a portrait photo keeps its subject.

### Database and persistence

**There is no database.** Persistence is four JSON files on a mounted Docker volume:

```
/app/data/
├── posts.json          ├── uploads/          uploaded images
├── projects.json       └── cache/images/     generated variants + OG cards
├── about.json
└── settings.json
```

| Property | Implementation |
|---|---|
| Reads | Served from memory — each service loads its file once at boot |
| Writes | The whole file is rewritten on change |
| Durability | **Atomic** — written to a temporary file, then `renameSync`, so a crash mid-write cannot truncate the store |
| Migrations | None. Missing fields are backfilled on read, which is how older records survive schema changes |
| Seeding | First run seeds starter posts and projects |

**Why no database:** a single author, a low write volume, and a dataset that fits comfortably in
memory. A database would add a service to run, back up, and connect to, in exchange for guarantees
this workload does not need. The honest cost is stated under [Scalability](#scalability) — this
choice is the main thing standing between the application and horizontal scaling.

### Infrastructure

| Concern | Where it runs |
|---|---|
| **Cloud provider** | AWS |
| **Compute** | A single EC2 instance — Ubuntu, `eu-north-1`, 6.7 GB root volume |
| **Container runtime** | Docker daemon on that same instance |
| **Application container** | `nestjs-app`, published on port 3000, `--restart unless-stopped` |
| **CI/CD** | Jenkins on the same instance, port 8080 |
| **Persistent storage** | Docker named volume `blog_data`, mounted at `/app/data` |
| **Secrets** | `/opt/blog/.env` on the host, outside the repository, passed with `--env-file` |
| **Registry** | None — images are built on the host where they run |

One instance runs everything: Jenkins, the Docker daemon, and the application container. There is
no separate build agent, no image registry, and no load balancer. For a single-author blog that is
proportionate; the trade-offs are listed under [Known limitations](#known-limitations).

---

## Architecture

**Pattern: a modular monolith.** One deployable unit, internally divided into domain modules with
explicit boundaries and dependency injection between them. Layered as controller → service → model,
with server-side rendering rather than an API-plus-client split.

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
deploy destroys and recreates the container, so all state must live on `blog_data`. The pipeline
prunes images aggressively and *never* prunes volumes.

### Request flow

```
Request
  → compression (gzip)
  → cookie-parser
  → Cache-Control middleware
  → /uploads static (immutable)
  → NestJS router
      Controller → Service → JSON store (in memory, atomic writes to disk)
      Controller → View function → HTML string → response
```

### Architectural choices, stated plainly

| Decision | Alternative rejected | Reasoning |
|---|---|---|
| Modular monolith | Microservices | One author, one deployable. Service boundaries would add network calls between modules that share a process happily |
| Server-side rendering | SPA + JSON API | Content site. SSR gives faster first paint, working SEO, and no client bundle |
| JSON files | PostgreSQL / MongoDB | Dataset fits in memory; no ops burden. Revisit when it stops fitting |
| Signed cookie | JWT library / session store | HMAC-SHA256 is ~15 lines of `crypto`. A dependency here would carry more risk than it removes |
| Build on the host | Registry + pull | No registry to run or pay for. Costs build time and disk on the instance |

---

## Getting started

### Requirements

Node.js ≥ 20 and npm. Docker optional — or Docker alone, with no Node.js on the host.

### Option A — Local development

```bash
git clone git@github.com:saidul-islam-rajib/AWS_Demo_Project.git
cd AWS_Demo_Project/automation
npm install
```

Start it with an admin password set:

```bash
ADMIN_PASSWORD=dev-password npm run start:dev
```

On **Windows PowerShell** there is no inline environment-variable prefix, so set it first:

```powershell
$env:ADMIN_PASSWORD = "dev-password"
npm run start:dev
```

Open **http://localhost:3000**. The store seeds itself with starter posts and projects on first
run; sign in at `/login`. Data is written to `automation/data/` unless `DATA_DIR` says otherwise.

### Option B — Docker

Run from `automation/`, which is the build context.

```bash
docker build -t blog .

docker run -d --name blog -p 3000:3000 \
  -e ADMIN_PASSWORD=dev-password \
  -e SESSION_SECRET=dev-secret \
  -v blog_data:/app/data \
  blog
```

PowerShell uses a backtick for line continuation, so a single line is simplest:

```powershell
docker run -d --name blog -p 3000:3000 -e ADMIN_PASSWORD=dev-password -e SESSION_SECRET=dev-secret -v blog_data:/app/data blog
```

Then open **http://localhost:3000**. `docker ps` confirms it is `Up`; `docker logs -f blog` follows
the output.

`DATA_DIR` does not need passing — the Dockerfile sets it to `/app/data`. The `-v blog_data:/app/data`
mount is what keeps posts and uploads alive when the container is replaced.

A fuller walkthrough, aimed at someone new to Docker, is in **[DOCKER.md](DOCKER.md)**.

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
| `SESSION_SECRET` | random at boot | HMAC key. Unset means sessions drop on every restart |
| `DATA_DIR` | `./data` (`/app/data` in Docker) | Where JSON files and uploads are written |
| `PORT` | `3000` | Listen port |
| `TRUST_PROXY` | unset | Set to `1` to enable Express `trust proxy`. Required if a reverse proxy is ever put in front — see [Security](#security) |

On the server these live in `/opt/blog/.env`, outside the repository, passed with `--env-file`.
That file must be readable by the `jenkins` user:

```bash
sudo chown root:jenkins /opt/blog/.env
sudo chmod 640 /opt/blog/.env
```

> `chmod 600` is root-only. Docker runs as `jenkins`, so 600 makes the file unreadable at deploy
> time and sign-in silently breaks.

### In-app settings

Everything else is configured from **Admin → Settings** rather than in code: author name, role,
bio, avatar, site title, tagline, site URL, GitHub username, sharing intro, and footer links.

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

## Testing

```bash
npm test          # 222 unit tests across 10 suites
npm run test:e2e  # 101 end-to-end tests
```

**323 tests in total, all passing** — verified by running both suites, not by counting files.

| Suite | File | Covers |
|---|---|---|
| Posts | `posts.service.spec.ts` | CRUD, drafts, scheduling, slugs, related posts |
| Projects | `projects.service.spec.ts` | Portfolio, taxonomies, GitHub import |
| About | `about.service.spec.ts` | Timeline, skills, gallery |
| Settings | `settings.service.spec.ts` | Site configuration |
| Auth | `auth.service.spec.ts` | Password comparison, token signing and expiry |
| Throttle | `login-throttle.service.spec.ts` | Lockout, windowing, per-address isolation |
| Uploads | `uploads.service.spec.ts` | Filenames, validation, storage |
| Images | `images.service.spec.ts` | Resizing, WebP, OG cards, cache keys |
| Markdown | `markdown.spec.ts` | Rendering, escaping |
| Views | `inline-scripts.spec.ts` | Parses every inline script on all 13 pages |

Unit tests run in roughly 3 seconds because most exercise pure functions without booting Nest.
End-to-end tests boot the real application against a temporary `DATA_DIR`, exercising HTTP in and
HTML out: auth, drafts and scheduling, taxonomies, uploads, image variants, caching headers, Open
Graph output, and related-post selection.

Most tests exist because something broke first, and each is written to fail for the reason it
claims — the test asserting that hand-picked related posts win is set up so that automatic
suggestion would produce a different answer.

---

## Security

| Area | Implementation |
|---|---|
| **Password comparison** | `crypto.timingSafeEqual` — content comparison is constant-time |
| **Session** | HMAC-SHA256 signed cookie, `httpOnly`, `sameSite=lax`, 12-hour expiry carried inside the signed payload |
| **Session storage** | None — the cookie is self-verifying. No store to leak, no JWT library to patch |
| **Signature check** | Also `timingSafeEqual`, after a length check |
| **Rate limiting** | 5 failed attempts locks that client address for 15 minutes |
| **Lockout ordering** | The lock is checked **before** the password is examined, so guessing gains nothing even if the guess is correct |
| **Attempt key** | The socket address, **not** `X-Forwarded-For` — that header is client-supplied and would let an attacker reset their own limit by changing it |
| **Admin caching** | `no-store` on `/admin` and `/login`, so pages are never written to disk cache |
| **Upload isolation** | Generated image variants are cached outside `uploads/`, so they can never be served as user uploads |
| **Body limit** | 2 MB on urlencoded bodies |
| **Secrets** | Held in `/opt/blog/.env` outside the repository, `640 root:jenkins` |

Rate limiting details, from `login-throttle.service.ts`: failures older than the 15-minute window
are forgotten, a correct password clears the record immediately, expired records are swept on
write, and one address being locked never affects another.

### Known weaknesses, stated honestly

- **No HTTPS.** This is the significant one. The admin password is transmitted in plaintext, and
  the session cookie carries no `secure` flag because it could not be sent over plain HTTP if it
  did. A domain and a certificate fix both.
- **Password length leaks.** `timingSafeEqual` requires equal-length buffers, so an unequal length
  returns early. The content comparison is constant-time; the length comparison is not. Hashing
  both sides before comparing would close it.
- **Rate limiting is in-memory and per instance.** Locks are cleared by a restart. Behind a reverse
  proxy, `TRUST_PROXY=1` must be set or every visitor arrives as the proxy and shares one bucket.
- **Single shared password.** No user accounts, no rotation, no audit trail.

---

## Performance and memory

### Where the work was done

| Technique | Effect |
|---|---|
| **gzip compression** | `/about` drops 30.6 KB → 8.1 KB |
| **Inlined CSS and JS** | Zero extra round trips; the larger document compresses well |
| **Reads from memory** | No disk I/O and no query on the read path — every page is served from an in-process object |
| **`no-cache, must-revalidate` on HTML** | Unchanged pages return **304 with no body** |
| **Immutable asset caching** | `/uploads` and `/img` carry `max-age=31536000, immutable` |
| **Timestamped filenames** | A given upload URL always names the same bytes, which is what makes a one-year cache safe |
| **On-demand image variants** | Generated once on first request, then cached to disk — no build-time batch, no wasted work for sizes never requested |
| **WebP at quality 82** | Roughly half the bytes of quality 90, visually identical for this content |
| **Never upscaling** | A 300 px original requested at 800 stays 300 px rather than wasting bytes |
| **`CACHE_VERSION` key** | Encoder changes invalidate cached variants without a manual purge |
| **Alpine base image** | Smaller image, faster deploys on a constrained disk |

### Memory profile

State is deliberately bounded and predictable:

- Each service holds one parsed JSON file. Total resident state scales with post and project count, and at present is well under a megabyte.
- The rate-limit map holds one small record per failing address and is **swept on every write**, so abandoned records cannot accumulate.
- `sharp` streams image work rather than buffering whole decoded bitmaps, and generated variants go to disk rather than an in-memory cache.
- There is no unbounded in-process cache anywhere. The image cache is on disk, capped naturally by the four allowed widths.

The pressure point is not RAM but **disk**: a 6.7 GB root volume shared between Jenkins, Docker
images, and the data volume. That is what the Preflight stage manages.

---

## Scalability

**This runs on one instance, and the architecture assumes it.** Being specific about what that
means:

| Dimension | Current state |
|---|---|
| **Read throughput** | Strong. Pages are rendered from memory with no database round trip, and gzip plus 304 responses keep bandwidth low |
| **Write throughput** | Low by design. Every write rewrites a whole JSON file — fine for one author, unsuitable for concurrent writers |
| **Vertical scaling** | Available and probably sufficient. A larger instance and a larger EBS volume address the real constraint, which is disk |
| **Horizontal scaling** | **Not currently possible** — see below |
| **Deployment scaling** | Manual. No auto-scaling group, no load balancer, no health-check-driven replacement beyond the pipeline's own verify step |

### What blocks horizontal scaling

Three things, in order of difficulty:

1. **In-memory state with file writes.** Two instances would each hold their own copy and overwrite each other's changes. This is the real blocker, and it is the JSON store — moving to PostgreSQL or DynamoDB would resolve it.
2. **Local disk for uploads and image cache.** An instance would only serve images it had generated. S3 with CloudFront in front is the standard answer.
3. **In-memory rate limiting.** Each instance would keep its own counters, so the effective limit multiplies by the instance count. Redis would centralise it.

### The path, if it were needed

```
Now          →  single EC2 · JSON files · local disk
Step 1       →  managed database (RDS or DynamoDB)
Step 2       →  S3 + CloudFront for uploads and generated images
Step 3       →  Redis for rate limiting and shared ephemeral state
Step 4       →  ALB + auto-scaling group across availability zones
```

None of this is implemented, and for a single-author blog none of it is warranted. It is documented
because knowing *where* the ceiling is matters more than raising it prematurely.

---

## Project structure

```
AWS_Demo_Project/
├── Jenkinsfile               pipeline definition
├── README.md
├── DOCKER.md                 Docker walkthrough
└── automation/
    ├── Dockerfile
    ├── src/
    │   ├── main.ts           bootstrap, middleware, static mounts
    │   ├── app.module.ts
    │   ├── posts/            posts + admin editor + /health
    │   ├── projects/         portfolio + taxonomies
    │   ├── about/            timeline, skills, gallery
    │   ├── settings/         site configuration
    │   ├── uploads/          upload, resize, OG cards
    │   ├── auth/             signed-cookie session + login throttle
    │   ├── seo/              sitemap, robots
    │   └── views/            HTML generation
    └── test/                 end-to-end suite
```

---

## Known limitations

Honest about what is not production-grade:

- **No HTTPS.** The admin password is sent in plaintext, and LinkedIn will not render link previews for a raw IP on a non-standard port. A domain and a certificate fix both.
- **6.7 GB root volume.** Disk exhaustion has stopped the pipeline twice. Preflight cleanup mitigates it; a larger EBS volume solves it.
- **No backups.** `blog_data` exists in exactly one place, on one instance, with no snapshot schedule.
- **Single instance.** In-memory state with file writes does not scale horizontally, and there is no redundancy — the instance is a single point of failure.
- **Rate limiting is per instance and in memory.** Locks are cleared by a restart.
- **No image registry.** Images are built on the same host that runs them, consuming build time and disk on a machine that is short of both.
- **Single admin password.** No user accounts, no rotation, no audit log.

---

## License

UNLICENSED — private project, published for demonstration.
