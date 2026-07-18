# AWS Demo Project — Personal Blog

A personal engineering blog built with NestJS, containerised with Docker, and deployed to an
AWS EC2 instance by a Jenkins CI/CD pipeline. Pushing to `main` rebuilds the image, runs the
test suite, replaces the running container and verifies the deploy — automatically.

---

## Where the app is running

| | |
|---|---|
| **Blog** | http://16.171.254.209:3000/ |
| **Tags** | http://16.171.254.209:3000/tags |
| **Admin dashboard** | http://16.171.254.209:3000/admin |
| **Sign in** | http://16.171.254.209:3000/login |
| **Health check** | http://16.171.254.209:3000/health |
| **Jenkins** | http://16.171.254.209:8080/ |

**Public IP:** `16.171.254.209`
**Private IP:** `172.31.45.234`
**Host:** AWS EC2, Ubuntu 26.04 LTS
**App port:** `3000` · **Jenkins port:** `8080`

> Both ports must be open as inbound TCP rules in the instance's security group.
> Served over plain HTTP — there is no TLS on this demo, so treat the admin password
> as low-value and never reuse a real one.

---

## Features

**Reading**
- Post feed with reading-time estimates, excerpts and view counts
- Full article pages with Markdown rendering (headings, lists, links, fenced code)
- Key highlight shown as a pull quote on both the card and the article
- Tag pages and a tag index, with usage counts
- Full-text search across titles, subtitles, bodies and tags
- Related posts, ranked by shared tags
- Light and dark themes, following the system setting
- Responsive down to mobile widths

**Writing**
- Password-protected admin dashboard
- Create, edit and delete posts
- Draft and published states — drafts never appear publicly
- Markdown editor with subtitle, key highlight and tags
- Tags normalised automatically: lowercased, trimmed, deduplicated, capped at 8
- Slugs generated from titles, kept stable when the title is unchanged
- Dashboard KPIs: published, drafts, tags, views, word count, total reading time

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `GET /` | public | Post feed |
| `GET /post/:slug` | public | Single article |
| `GET /tag/:tag` | public | Posts with a tag |
| `GET /tags` | public | Tag index |
| `GET /search?q=` | public | Search results |
| `GET /health` | public | `{ status, uptime, posts }` |
| `GET /login` · `POST /login` | public | Sign in |
| `GET /logout` | public | Sign out |
| `GET /admin` | **protected** | Dashboard |
| `GET|POST /admin/posts/new` | **protected** | Create |
| `GET|POST /admin/posts/:id/edit` | **protected** | Update |
| `POST /admin/posts/:id/delete` | **protected** | Delete |

---

## First-time server setup

### 1. Set the admin password

The password is **never** stored in this repository. Create it on the EC2 host:

```bash
sudo mkdir -p /opt/blog
echo "ADMIN_PASSWORD=choose-a-strong-password" | sudo tee /opt/blog/.env
echo "SESSION_SECRET=$(openssl rand -hex 32)" | sudo tee -a /opt/blog/.env
sudo chmod 600 /opt/blog/.env
```

The pipeline passes this file to the container with `--env-file`. If it is missing the blog
still serves normally, but sign-in is disabled and a warning is logged.

`SESSION_SECRET` is optional. Without it a random secret is generated per boot, which simply
means you are signed out whenever the container restarts.

### 2. Data persistence

Posts are stored as JSON in a Docker named volume, `blog_data`, mounted at `/app/data`.
The pipeline creates it automatically. **Without the volume every post would be lost on the
next deploy**, since the pipeline destroys and recreates the container each run.

```bash
docker volume inspect blog_data
sudo cat /var/lib/docker/volumes/blog_data/_data/posts.json   # raw content
```

---

## Tech stack

### Application
- **NestJS 11** — Node.js framework
- **TypeScript 5.7**
- **Node.js 18**
- **marked 4** — Markdown rendering (v4 is CommonJS; v16+ is ESM-only and will not load here)
- **cookie-parser** — session cookie handling
- **Jest** + **Supertest** — 21 unit tests, 11 e2e tests
- **ESLint** + **Prettier**

### Storage
- JSON file on a Docker named volume
- Atomic writes (temp file + rename) so a crash mid-write cannot truncate the store
- Suitable for a single-author blog; swap `PostsService` for a database if that changes

### Security
- Single-password admin auth via `ADMIN_PASSWORD`
- Constant-time password comparison
- HMAC-signed session cookie, `httpOnly`, `sameSite=lax`, 12-hour expiry
- All HTML output escaped
- Secrets kept out of the repository

### Container
- **Docker** — `node:18-alpine`
- Container `nestjs-app`, image `nestjs-image`, volume `blog_data`
- Restart policy `unless-stopped`

### CI/CD
- **Jenkins** declarative pipeline — [`Jenkinsfile`](Jenkinsfile)
- **Poll SCM** trigger (`H/5 * * * *`)
- **GitHub webhook** as a secondary path
- **Email Extension** — notifications on success and failure

### Infrastructure
- **AWS EC2** — Ubuntu 26.04 LTS
- **Security groups** — inbound `3000` and `8080`
- **SSH key authentication** — `automation.pem`

---

## Pipeline

```
git push → GitHub → Jenkins (Poll SCM) → Build → Test → Deploy → Verify → live on :3000
```

| Stage | What it does |
|---|---|
| **Checkout** | `checkout scm` |
| **Build** | Builds the image from `automation/`, tagged with the build number and `latest` |
| **Test** | Runs the Jest suite inside the freshly built image — a failing test stops the deploy |
| **Deploy** | Recreates the container with the data volume and host env file attached |
| **Verify** | Polls `/health` for up to 40s; dumps container logs and fails the build if it never answers |

Builds are pruned to the last 15, and dangling image layers are removed after every run to
protect the small root volume.

---

## Repository layout

```
AWS_Demo_Project/
├── Jenkinsfile              # pipeline definition (must stay at repo root)
├── README.md
└── automation/              # the NestJS application
    ├── Dockerfile
    ├── package.json
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── auth/            # password auth + route guard
    │   ├── posts/           # model, storage, public + admin controllers
    │   └── views/           # server-rendered HTML
    └── test/
```

> The `Jenkinsfile` lives at the **repository root**. Jenkins looks for it there by default;
> moving it breaks the build unless the job's **Script Path** is updated to match.

---

## Running locally

```bash
cd automation
npm install
ADMIN_PASSWORD=dev npm run start:dev     # http://localhost:3000
```

Posts are written to `automation/data/posts.json` locally. On first run the store is seeded
with starter posts so the site is never empty.

Tests:

```bash
npm test                 # unit
npm run test:e2e         # end to end
```

With Docker:

```bash
cd automation
docker build -t nestjs-image .
docker volume create blog_data
docker run -d --name nestjs-app -p 3000:3000 \
  -v blog_data:/app/data \
  -e ADMIN_PASSWORD=dev \
  nestjs-image
```

---

## Server operations

```bash
ssh -i "automation.pem" ubuntu@16.171.254.209

docker ps                        # is the container up?
docker logs nestjs-app --tail 50
curl http://localhost:3000/health
```

If `curl` works on the server but the public URL does not, the cause is the security group,
not the application.

### Docker permissions

Jenkins runs as its own user, so that is the permission that matters:

```bash
sudo -u jenkins docker ps
```

If it fails:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### Disk space

The root volume is 6.6 GB and each build adds roughly 500 MB of image layers:

```bash
df -h /
docker system df
docker image prune -af
```

---

## Author

**Saidul Islam Rajib** — Software Engineer
[Portfolio](https://portfolio-rajib.vercel.app/)
