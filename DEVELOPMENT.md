# Development & operations guide

How to run this project locally, set and manage the admin password, and get
unstuck when sign-in misbehaves. For architecture and deployment, see
[README.md](README.md); for a Docker-first walkthrough, see [DOCKER.md](DOCKER.md).

All commands are run from the `automation/` folder unless stated otherwise:

```
cd "c:\Users\Saidul islam rajib.BS-01696\Desktop\Learning\AWS_Demo_Project\automation"
```

---

## Contents

- [Prerequisites](#prerequisites)
- [Running the app](#running-the-app)
- [The admin password](#the-admin-password)
  - [Set it](#set-it)
  - [See it](#see-it)
  - [Clear or change it](#clear-or-change-it)
- [Environment variables](#environment-variables)
- [Learner accounts vs the admin password](#learner-accounts-vs-the-admin-password)
- [npm scripts](#npm-scripts)
- [Troubleshooting sign-in](#troubleshooting-sign-in)

---

## Prerequisites

- Node.js ≥ 20 and npm
- First time only: install dependencies

```bash
npm install
```

---

## Running the app

The app reads its configuration from **environment variables at startup**. Two
matter for local work: `ADMIN_PASSWORD` (without it, admin sign-in is disabled)
and `SESSION_SECRET` (without it, you are signed out on every restart).

Set them, then start — **in the same terminal window, in that order**, because
the variables are read once when the process boots.

### PowerShell (prompt starts with `PS C:\...>`)

```powershell
$env:ADMIN_PASSWORD = "dev-password"
$env:SESSION_SECRET = "dev-secret"
npm run start
```

### Git Bash (prompt shows `MINGW64`)

```bash
export ADMIN_PASSWORD="dev-password"
export SESSION_SECRET="dev-secret"
npm run start
```

Or inline, for a single run:

```bash
ADMIN_PASSWORD="dev-password" SESSION_SECRET="dev-secret" npm run start
```

### Command Prompt (cmd)

```cmd
set ADMIN_PASSWORD=dev-password
set SESSION_SECRET=dev-secret
npm run start
```

> In cmd, do **not** put spaces around `=`. `set ADMIN_PASSWORD = x` creates a
> variable literally named `ADMIN_PASSWORD ` (with a trailing space).

Then open **http://localhost:3000** and sign in at **http://localhost:3000/login**.

Use `npm run start:dev` instead of `npm run start` for watch mode (restarts on
file changes). Note that each restart drops sessions unless `SESSION_SECRET` is
set.

---

## The admin password

There is no stored admin password to look up. The app compares your input
against the `ADMIN_PASSWORD` environment variable of the running process
([`auth.service.ts`](automation/src/auth/auth.service.ts)). Whatever that
variable holds **is** the password — in plain text, only in memory, never
written to disk or logged.

### Set it

Use the block for your shell in [Running the app](#running-the-app). Setting the
variable this way lasts only for the current terminal window; open a new one and
you set it again.

To make it **persist across all new terminals** (PowerShell/cmd), set a user
environment variable once:

```powershell
setx ADMIN_PASSWORD "dev-password"
setx SESSION_SECRET "dev-secret"
```

`setx` writes to your Windows user profile. It takes effect in **newly opened**
terminals, not the one you ran it in. Remove them later with:

```powershell
[Environment]::SetEnvironmentVariable("ADMIN_PASSWORD", $null, "User")
[Environment]::SetEnvironmentVariable("SESSION_SECRET", $null, "User")
```

### See it

Read the variable back **in the same window where you set it**:

| Shell | Command |
|---|---|
| PowerShell | `$env:ADMIN_PASSWORD` |
| Git Bash | `echo "$ADMIN_PASSWORD"` |
| cmd | `echo %ADMIN_PASSWORD%` |
| Docker container | `docker exec blog printenv ADMIN_PASSWORD` |
| Deployed server | `grep ADMIN_PASSWORD /opt/blog/.env` |

If it prints nothing, the variable is not set in that shell — which also means a
server launched from that shell has no password and shows *"ADMIN_PASSWORD is not
set on the server, so sign-in is disabled."*

If you set it in one window but ran `npm run start` in another, the app never
received it. Set and start in the same window.

### Clear or change it

There is nothing to "reset" — the password is just the current value of the
variable. To change it, set a new value and restart the app so the new process
reads it:

```powershell
# stop the running server(s)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# set the new password and start again
$env:ADMIN_PASSWORD = "a-new-password"
$env:SESSION_SECRET = "dev-secret"
npm run start
```

Because sign-in only ever checks the current variable, there is no old password
lingering to conflict with. Existing admin sessions are signed out when the
`SESSION_SECRET` changes; keeping the same secret keeps you signed in across the
restart.

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | — | Admin sign-in password. **Unset disables admin sign-in.** |
| `SESSION_SECRET` | random per boot | HMAC key for session cookies. Unset means every restart signs you out. |
| `DATA_DIR` | `./data` | Where JSON data and uploads are written. Point elsewhere for a throwaway run. |
| `PORT` | `3000` | Port the app listens on. |
| `TRUST_PROXY` | unset | Set to `1` only when behind a reverse proxy (see [README → Security](README.md#security)). |

A clean-slate local run, writing to a temporary data folder on a spare port:

```powershell
$env:ADMIN_PASSWORD = "dev-password"
$env:SESSION_SECRET = "dev-secret"
$env:PORT = "3001"
$env:DATA_DIR = "$env:TEMP\blog-dev-data"
npm run start
```

Delete the `DATA_DIR` folder to start from empty (removes posts, accounts,
uploads, settings and platform configuration).

---

## Learner accounts vs the admin password

Two separate things — do not confuse them:

- **Admin password** (`/login`) — the single site-owner login, controlled by the
  `ADMIN_PASSWORD` environment variable. No self-service recovery; you change it
  by changing the variable.
- **Learner accounts** (`/account`) — visitors register with an email and
  password and receive a recovery code. They can reset their own password with
  the code, swap a lost code from their account page, and — if they lose both —
  the owner can issue a one-time reset from **Admin → Accounts**
  (`/admin/accounts`). Operational limits for all of this live under
  **Admin → Settings → Platform configuration**.

See [README → Learner accounts and recovery](README.md#learner-accounts-and-recovery)
for the full recovery model.

---

## npm scripts

| Script | Purpose |
|---|---|
| `npm run start` | Start the app once |
| `npm run start:dev` | Start in watch mode (restarts on changes) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run the compiled build (`node dist/main`) |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` | ESLint + Prettier, autofixing |
| `npm run format` | Prettier only |

---

## Troubleshooting sign-in

Match the symptom to the cause:

| What you see | Cause | Fix |
|---|---|---|
| *"ADMIN_PASSWORD is not set…"* | The running process has no password — usually a **stale server** from an earlier session still holding port 3000, or the variable was set in a different window than `npm run start`. | Stop all node processes and start fresh (below). |
| *"Incorrect password."* | The app has a password, but your input does not match. | Confirm with `$env:ADMIN_PASSWORD` in the launching window. Watch for a trailing space or a value set with `=` spaced (cmd). |
| *"Too many failed attempts."* | The rate limiter locked your address after repeated failures. | Wait for the lockout window, or restart the app to clear it. The threshold and lockout length are configurable under Admin → Settings. |
| Page will not load / connection refused | The app is not running. | Check the `npm run start` terminal for an error such as `EADDRINUSE` (port already taken). |

**The reliable reset** — stop everything, confirm the port is free, then set and
start in one window:

```powershell
# 1. Stop any running node servers
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Confirm port 3000 is free (prints nothing when free)
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# 3. Set the password and start, in this same window
cd "c:\Users\Saidul islam rajib.BS-01696\Desktop\Learning\AWS_Demo_Project\automation"
$env:ADMIN_PASSWORD = "dev-password"
$env:SESSION_SECRET = "dev-secret"
npm run start
```

Then sign in at **http://localhost:3000/login** with `dev-password`.

**Confirm the running server actually has a password** without using the browser:

```powershell
# 200 = a real page; the same request against a passwordless server still 200s,
# so also grep the sign-in page text:
(Invoke-WebRequest http://localhost:3000/login -UseBasicParsing).Content `
  -match 'ADMIN_PASSWORD is not set'
```

`True` means the server is running **without** a password (stale or wrongly
launched); `False` means the password is set and you should be able to sign in.
