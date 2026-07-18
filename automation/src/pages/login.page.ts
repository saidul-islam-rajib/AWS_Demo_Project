/**
 * Login page design. UI demo only — there is no authentication backend and
 * the form deliberately submits nowhere.
 */
export const loginPage = (): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in — AWS Demo Project</title>
<style>
  :root {
    --bg: hsl(222, 47%, 11%);
    --card: hsl(222, 44%, 14%);
    --border: hsl(216, 33%, 22%);
    --ink: hsl(216, 100%, 95%);
    --ink-2: hsl(217, 24%, 72%);
    --ink-3: hsl(217, 17%, 52%);
    --accent: hsl(199, 89%, 49%);
    --accent-hover: hsl(199, 89%, 43%);
    --input: hsl(222, 47%, 10%);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 1.5rem;
    font-family: "Noto Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background:
      radial-gradient(900px circle at 15% 10%, hsla(199, 89%, 49%, 0.14), transparent 45%),
      radial-gradient(700px circle at 85% 90%, hsla(180, 90%, 43%, 0.10), transparent 45%),
      var(--bg);
    color: var(--ink-2);
  }
  .card {
    width: 100%; max-width: 400px;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 2.5rem 2rem;
    box-shadow: 0 20px 45px hsla(222, 60%, 4%, 0.45);
  }
  .brand { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.75rem; }
  .logo {
    width: 36px; height: 36px; border-radius: 9px;
    background: linear-gradient(135deg, #0ea5ea, #0bd1d1);
    display: grid; place-items: center;
    font-weight: 800; color: #04121e; font-size: 0.9rem;
  }
  .brand span { font-weight: 600; color: var(--ink); }
  h1 { font-size: 1.4rem; color: var(--ink); letter-spacing: -0.02em; margin-bottom: 0.35rem; }
  .sub { color: var(--ink-3); font-size: 0.9rem; margin-bottom: 1.75rem; }
  label { display: block; font-size: 0.82rem; font-weight: 500; color: var(--ink-3); margin-bottom: 0.4rem; }
  input[type="email"], input[type="password"] {
    width: 100%; padding: 0.7rem 0.85rem; margin-bottom: 1.1rem;
    background: var(--input); border: 1px solid var(--border);
    border-radius: 9px; color: var(--ink); font-size: 0.94rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input:focus {
    outline: none; border-color: var(--accent);
    box-shadow: 0 0 0 3px hsla(199, 89%, 49%, 0.2);
  }
  .row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1.5rem; font-size: 0.84rem;
  }
  .remember { display: flex; align-items: center; gap: 0.45rem; color: var(--ink-3); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  button {
    width: 100%; padding: 0.75rem; border: 0; border-radius: 9px;
    background: var(--accent); color: #04121e;
    font-size: 0.94rem; font-weight: 700; cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: var(--accent-hover); }
  .note {
    margin-top: 1.25rem; padding: 0.7rem 0.8rem; border-radius: 9px;
    background: hsla(199, 89%, 49%, 0.08);
    border: 1px solid hsla(199, 89%, 49%, 0.22);
    color: var(--ink-3); font-size: 0.78rem; line-height: 1.5; text-align: center;
  }
  .msg { margin-top: 0.9rem; font-size: 0.84rem; color: var(--ink-3); text-align: center; min-height: 1.2em; }
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
        <span class="remember">
          <input type="checkbox" id="remember" />
          <label for="remember" style="margin:0">Remember me</label>
        </span>
        <a href="#">Forgot password?</a>
      </div>

      <button type="submit">Sign in</button>
    </form>

    <p class="msg" id="msg"></p>

    <p class="note">
      UI demo only — no authentication backend.<br />
      <a href="/">Back to the blog</a>
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
