# AWS Demo Project

A NestJS application containerised with Docker and deployed to an AWS EC2 instance by a
Jenkins CI/CD pipeline. Pushing to `main` rebuilds the image and replaces the running
container automatically.

---

## Where the app is running

| | |
|---|---|
| **Blog dashboard** | http://16.171.254.209:3000/ |
| **Login page demo** | http://16.171.254.209:3000/login |
| **Health check** | http://16.171.254.209:3000/health |
| **Jenkins** | http://16.171.254.209:8080/ |

**Public IP:** `16.171.254.209`
**Private IP:** `172.31.45.234`
**Host:** AWS EC2, Ubuntu 26.04 LTS
**App port:** `3000` · **Jenkins port:** `8080`

> Both ports must be open as inbound TCP rules in the instance's security group.
> Served over plain HTTP — there is no TLS on this demo.

---

## Tech stack

### Application
- **NestJS 11** — Node.js framework
- **TypeScript 5.7**
- **Node.js 18**
- **Jest** + **Supertest** — unit and e2e tests
- **ESLint** + **Prettier**

### Container
- **Docker** — `node:18-alpine` base image
- Build runs `npm install` then `npm run build`, serving `dist/main`
- Container name `nestjs-app`, image `nestjs-image`
- Restart policy `unless-stopped`

### CI/CD
- **Jenkins** — declarative pipeline defined in [`Jenkinsfile`](Jenkinsfile)
- **Poll SCM** trigger (`H/5 * * * *`) — checks GitHub every ~5 minutes
- **GitHub webhook** configured as a secondary path
- **Email Extension plugin** — build notifications on success and failure

### Infrastructure
- **AWS EC2** — Ubuntu 26.04 LTS
- **Security groups** — inbound `3000` (app) and `8080` (Jenkins)
- **SSH key authentication** — `automation.pem`

---

## Routes

| Route | Response | Description |
|---|---|---|
| `GET /` | HTML | One-page blog dashboard |
| `GET /login` | HTML | Login page design (UI only, no auth backend) |
| `GET /health` | JSON | `{ "status": "ok", "uptime": <seconds> }` |

---

## Pipeline

```
git push → GitHub → Jenkins (Poll SCM) → Build → Test → Deploy → Verify → live on :3000
```

Stages in [`Jenkinsfile`](Jenkinsfile):

| Stage | What it does |
|---|---|
| **Checkout** | `checkout scm` |
| **Build** | Builds the image from `automation/`, tagged with the build number and `latest` |
| **Test** | Runs the Jest suite inside the freshly built image — a failing test stops the deploy |
| **Deploy** | Stops and removes the old container, starts the new one on port 3000 |
| **Verify** | Polls `/health` for up to 40s; dumps container logs and fails the build if it never answers |

Builds are pruned to the last 15, and dangling image layers are removed after every
run to protect the small root volume.

An email is sent on both success and failure via the `post` block.

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
    │   ├── app.controller.ts
    │   ├── app.service.ts
    │   ├── main.ts
    │   └── pages/
    │       ├── blog.page.ts
    │       └── login.page.ts
    └── test/
```

> The `Jenkinsfile` lives at the **repository root**, not inside `automation/`.
> Jenkins looks for it there by default; moving it breaks the build unless the
> job's **Script Path** is updated to match.

---

## Running locally

```bash
cd automation
npm install
npm run start:dev        # http://localhost:3000
```

Tests:

```bash
npm test                 # unit
npm run test:e2e         # end to end
```

With Docker:

```bash
cd automation
docker build -t nestjs-image .
docker run -d --name nestjs-app -p 3000:3000 nestjs-image
```

---

## Server operations

```bash
ssh -i "automation.pem" ubuntu@16.171.254.209

docker ps                        # is the container up?
docker logs nestjs-app --tail 50
curl http://localhost:3000/      # test from the server itself
```

If `curl` works on the server but the public URL does not, the cause is the
security group, not the application.

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

The root volume is 6.6 GB and each build adds roughly 500 MB of image layers.
Check it periodically:

```bash
df -h /
docker system df
docker image prune -af    # remove untagged images
```

---

## Author

**Saidul Islam Rajib** — Software Engineer
[Portfolio](https://portfolio-rajib.vercel.app/)
