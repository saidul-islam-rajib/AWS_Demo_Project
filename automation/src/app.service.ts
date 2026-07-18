import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getLoginPage(): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in — AWS Demo Project</title>
<style>
  :root {
    --bg: #0f172a;
    --card: #1e293b;
    --border: #334155;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #6366f1;
    --accent-hover: #4f46e5;
    --input: #0f172a;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: #f1f5f9;
      --card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --input: #f8fafc;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background:
      radial-gradient(900px circle at 15% 10%, rgba(99, 102, 241, 0.18), transparent 45%),
      radial-gradient(700px circle at 85% 90%, rgba(14, 165, 233, 0.14), transparent 45%),
      var(--bg);
    color: var(--text);
  }
  .card {
    width: 100%;
    max-width: 400px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.75rem;
  }
  .logo {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: linear-gradient(135deg, var(--accent), #0ea5e9);
    display: grid;
    place-items: center;
    font-weight: 700;
    color: #fff;
    font-size: 0.95rem;
  }
  .brand span { font-weight: 600; letter-spacing: -0.01em; }
  h1 { font-size: 1.4rem; letter-spacing: -0.02em; margin-bottom: 0.35rem; }
  .sub { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.75rem; }
  label {
    display: block;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--muted);
    margin-bottom: 0.4rem;
  }
  input[type="email"], input[type="password"] {
    width: 100%;
    padding: 0.7rem 0.85rem;
    margin-bottom: 1.1rem;
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--text);
    font-size: 0.94rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    font-size: 0.84rem;
  }
  .remember { display: flex; align-items: center; gap: 0.45rem; color: var(--muted); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  button {
    width: 100%;
    padding: 0.75rem;
    border: 0;
    border-radius: 9px;
    background: var(--accent);
    color: #fff;
    font-size: 0.94rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: var(--accent-hover); }
  .note {
    margin-top: 1.25rem;
    padding: 0.7rem 0.8rem;
    border-radius: 9px;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.25);
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.5;
    text-align: center;
  }
  .deploy { color: var(--accent); font-weight: 600; }
  .msg {
    margin-top: 0.9rem;
    font-size: 0.84rem;
    color: var(--muted);
    text-align: center;
    min-height: 1.2em;
  }
</style>
</head>
<body>
  <main class="card">
    <div class="brand">
      <div class="logo">AW</div>
      <span>AWS Demo Project</span>
    </div>

    <h1>Welcome back</h1>
    <p class="sub">Sign in to continue to your dashboard.</p>

    <form id="login">
      <label for="email">Email address</label>
      <input type="email" id="email" placeholder="you@example.com" required />

      <label for="password">Password</label>
      <input type="password" id="password" placeholder="••••••••" required />

      <div class="row">
        <span class="remember"><input type="checkbox" id="remember" /> <label for="remember" style="margin:0">Remember me</label></span>
        <a href="#">Forgot password?</a>
      </div>

      <button type="submit">Sign in</button>
    </form>

    <p class="msg" id="msg"></p>

    <p class="note">
      UI demo only — no authentication backend.<br />
      Deployed by Jenkins CI/CD · <span class="deploy">Deploy #2</span>
    </p>
  </main>

  <script>
    document.getElementById('login').addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('msg').textContent =
        'This is a design demo — no credentials are sent anywhere.';
    });
  </script>
</body>
</html>`;
  }
}
