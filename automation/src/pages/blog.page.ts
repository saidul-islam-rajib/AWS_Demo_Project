/**
 * One-page blog dashboard.
 *
 * Palette and type are lifted from portfolio-rajib.vercel.app so this page
 * reads as part of the same site. Posts document the real work done while
 * building this project's CI/CD pipeline.
 */
export const blogPage = (): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Saidul Islam Rajib — Engineering Blog</title>
<meta name="description" content="Notes on building a Jenkins CI/CD pipeline for a NestJS app on AWS EC2." />
<style>
  :root {
    --bg: hsl(222, 47%, 11%);
    --surface: hsl(222, 44%, 14%);
    --surface-2: hsl(216, 33%, 17%);
    --border: hsl(216, 33%, 22%);
    --ink: hsl(216, 100%, 95%);
    --ink-2: hsl(217, 24%, 72%);
    --ink-3: hsl(217, 17%, 52%);
    --accent: hsl(199, 89%, 49%);
    --accent-2: hsl(180, 90%, 43%);
    --gradient: linear-gradient(90deg, #0ea5ea, #0bd1d1 51%);
    --good: hsl(152, 60%, 45%);
    --warn: hsl(38, 92%, 55%);
    --bad: hsl(0, 72%, 58%);
    --radius: 14px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background:
      radial-gradient(1000px circle at 12% -5%, hsla(199, 89%, 49%, 0.10), transparent 45%),
      radial-gradient(800px circle at 95% 5%, hsla(180, 90%, 43%, 0.07), transparent 40%),
      var(--bg);
    color: var(--ink-2);
    font-family: "Noto Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 940px; margin: 0 auto; padding: 3rem 1.25rem 4rem; }

  /* ---------- header ---------- */
  header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
  .avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--gradient);
    display: grid; place-items: center;
    font-weight: 800; font-size: 1.25rem; color: #04121e;
    flex-shrink: 0;
  }
  .who h1 { font-size: 1.5rem; color: var(--ink); letter-spacing: -0.02em; line-height: 1.25; }
  .who p { font-size: 0.9rem; color: var(--ink-3); }
  .live {
    margin-left: auto;
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--border); border-radius: 100px;
    background: var(--surface);
    font-size: 0.78rem; color: var(--ink-2); white-space: nowrap;
  }
  .dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--good);
    box-shadow: 0 0 0 3px hsla(152, 60%, 45%, 0.18);
  }

  /* ---------- stat tiles ---------- */
  .stats {
    display: grid; gap: 0.85rem; margin-bottom: 2.75rem;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
  .tile {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1.1rem 1.15rem;
  }
  .tile .label {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 0.45rem;
  }
  .tile .value {
    font-size: 1.85rem; font-weight: 700; color: var(--ink);
    line-height: 1.1; letter-spacing: -0.02em;
  }
  .tile .meta { font-size: 0.78rem; color: var(--ink-3); margin-top: 0.3rem; }

  /* ---------- sections ---------- */
  h2 {
    font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.09em;
    color: var(--ink-3); font-weight: 600;
    margin: 0 0 1rem; padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border);
  }
  section { margin-bottom: 2.75rem; }

  /* ---------- posts ---------- */
  .post {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1.4rem 1.5rem; margin-bottom: 0.85rem;
    transition: border-color 0.18s, transform 0.18s;
  }
  .post:hover { border-color: hsl(199, 60%, 34%); transform: translateY(-2px); }
  .post h3 {
    font-size: 1.08rem; color: var(--ink); letter-spacing: -0.01em;
    margin-bottom: 0.5rem; line-height: 1.35;
  }
  .post p { font-size: 0.93rem; margin-bottom: 0.85rem; }
  .post p:last-child { margin-bottom: 0; }
  .tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
  .tag {
    font-size: 0.72rem; padding: 0.2rem 0.6rem; border-radius: 100px;
    background: var(--surface-2); border: 1px solid var(--border); color: var(--ink-3);
  }
  code {
    font-family: ui-monospace, SFMono-Regular, "Cascadia Code", Menlo, monospace;
    font-size: 0.86em; background: var(--surface-2);
    padding: 0.12em 0.4em; border-radius: 5px;
    color: var(--accent); border: 1px solid var(--border);
  }
  pre {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 9px; padding: 0.85rem 1rem;
    overflow-x: auto; margin: 0.75rem 0;
  }
  pre code { background: none; border: none; padding: 0; color: var(--ink-2); }
  .takeaway {
    border-left: 2px solid var(--accent);
    padding: 0.15rem 0 0.15rem 0.9rem;
    color: var(--ink-2); font-size: 0.9rem;
  }

  /* ---------- stack ---------- */
  .stack { display: grid; gap: 0.85rem; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .layer {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1.05rem 1.15rem;
  }
  .layer h4 {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--accent); margin-bottom: 0.55rem; font-weight: 600;
  }
  .layer ul { list-style: none; font-size: 0.88rem; }
  .layer li { padding: 0.2rem 0; color: var(--ink-2); }

  /* ---------- pipeline ---------- */
  .flow { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
  .step {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 100px; padding: 0.45rem 0.9rem; font-size: 0.82rem; color: var(--ink-2);
  }
  .arrow { color: var(--ink-3); font-size: 0.9rem; }

  footer {
    margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border);
    font-size: 0.83rem; color: var(--ink-3);
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  @media (max-width: 560px) {
    .wrap { padding: 2rem 1rem 3rem; }
    .live { margin-left: 0; }
    .who h1 { font-size: 1.3rem; }
  }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <div class="avatar">SR</div>
    <div class="who">
      <h1>Saidul Islam Rajib</h1>
      <p>Software Engineer · Engineering blog</p>
    </div>
    <span class="live"><span class="dot"></span> Deployed by Jenkins</span>
  </header>

  <div class="stats">
    <div class="tile">
      <div class="label">Pipeline stages</div>
      <div class="value">4</div>
      <div class="meta">checkout → build → stop → run</div>
    </div>
    <div class="tile">
      <div class="label">Builds to first green</div>
      <div class="value">4</div>
      <div class="meta">#1–#3 failed at checkout</div>
    </div>
    <div class="tile">
      <div class="label">Image size base</div>
      <div class="value">node:18</div>
      <div class="meta">alpine variant</div>
    </div>
    <div class="tile">
      <div class="label">Deploy target</div>
      <div class="value">EC2</div>
      <div class="meta">Ubuntu 26.04 LTS</div>
    </div>
  </div>

  <section>
    <h2>Delivery pipeline</h2>
    <div class="flow">
      <span class="step">git push</span><span class="arrow">→</span>
      <span class="step">GitHub</span><span class="arrow">→</span>
      <span class="step">Jenkins poll</span><span class="arrow">→</span>
      <span class="step">docker build</span><span class="arrow">→</span>
      <span class="step">replace container</span><span class="arrow">→</span>
      <span class="step">live on :3000</span>
    </div>
  </section>

  <section>
    <h2>Posts</h2>

    <article class="post">
      <div class="tags"><span class="tag">git</span><span class="tag">submodules</span></div>
      <h3>The commit that pushed nothing</h3>
      <p>
        My project folder was its own git repo, nested inside another git repo. When I ran
        <code>git add automation</code> from the parent, git didn't add the files — it recorded a
        <em>gitlink</em>: a pointer to a commit in the inner repo.
      </p>
      <pre><code>$ git ls-files -s
160000 50004e13… 0  automation</code></pre>
      <p>
        Mode <code>160000</code> means submodule. There was no <code>.gitmodules</code> either, so it was a
        broken one. GitHub showed a grey folder I couldn't click into, and the referenced commit
        only ever existed on my laptop. The push "succeeded" every time.
      </p>
      <p class="takeaway">
        A green push is not proof your code shipped. Check the file mode, and open the repo on
        GitHub to confirm the files are actually browsable.
      </p>
    </article>

    <article class="post">
      <div class="tags"><span class="tag">jenkins</span><span class="tag">groovy</span></div>
      <h3>A typo that killed every stage before stage one</h3>
      <p>
        My email step said <code>emailtext</code> instead of <code>emailext</code>, and was missing the
        commas between arguments. Because a declarative pipeline is compiled as Groovy before
        anything runs, that wasn't an email bug — it was a parse error. Not one stage executed.
      </p>
      <p>
        The <code>docker build</code> was also missing its trailing <code>.</code> build context, and a
        <code>docker run</code> was split across lines with no <code>\\</code> continuation, so the shell
        read it as two separate commands.
      </p>
      <p class="takeaway">
        Pipeline syntax errors don't fail a stage — they fail before stages exist. If nothing shows
        in the stage view, suspect the Jenkinsfile itself.
      </p>
    </article>

    <article class="post">
      <div class="tags"><span class="tag">jenkins</span><span class="tag">debugging</span></div>
      <h3>Builds that failed in 0.57 seconds</h3>
      <p>
        Three builds in a row failed almost instantly. That duration is the clue: a real run clones a
        repo, installs dependencies, and builds an image — it takes minutes. Half a second means it
        died before doing any work.
      </p>
      <p>
        The cause was <strong>Script Path</strong>. Jenkins looks for <code>Jenkinsfile</code> at the
        repository root by default, but mine lived one directory down. I moved it to the root rather
        than fight the setting.
      </p>
      <p class="takeaway">
        Build duration is a diagnostic. Sub-second failures are almost always configuration, not code.
      </p>
    </article>

    <article class="post">
      <div class="tags"><span class="tag">webhooks</span><span class="tag">polling</span></div>
      <h3>A green webhook that never built anything</h3>
      <p>
        GitHub showed green checkmarks for every delivery — ping and pushes alike. Jenkins was
        receiving them and returning HTTP 200. But no build ever started.
      </p>
      <p>
        Green in GitHub only means the request was <em>accepted</em>. Jenkins still has to match the
        payload to a job, and when it can't, it drops it silently. I switched to
        <code>Poll SCM</code> with <code>H/5 * * * *</code>, which has no matching logic at all — Jenkins
        just asks whether the commit hash changed.
      </p>
      <p>
        There was a second trap underneath. Polling compares against the last <em>successfully built</em>
        revision, and since every previous build died before finishing checkout, there was no baseline
        to compare against. One green build wrote it, and automatic triggering started working.
      </p>
      <p class="takeaway">
        "Delivered" and "acted upon" are different claims. Verify the effect, not the acknowledgement.
      </p>
    </article>

    <article class="post">
      <div class="tags"><span class="tag">docker</span><span class="tag">linux</span></div>
      <h3>Two users, one Docker socket</h3>
      <p>
        Jenkins runs as its own system user, so the permission that matters is the
        <code>jenkins</code> user's — not yours. Test it the way Jenkins will:
      </p>
      <pre><code>sudo -u jenkins docker ps</code></pre>
      <p>
        If it fails, add the user to the group and restart the service. The restart is required —
        a running process doesn't pick up new group membership.
      </p>
      <pre><code>sudo usermod -aG docker jenkins
sudo systemctl restart jenkins</code></pre>
      <p class="takeaway">
        Test permissions as the user that will actually run the command.
      </p>
    </article>

    <article class="post">
      <div class="tags"><span class="tag">aws</span><span class="tag">ec2</span></div>
      <h3>A small disk fills faster than you think</h3>
      <p>
        On a 6.6 GB root volume, a single pipeline run moved disk usage from 52.8% to 60.6% — roughly
        500 MB per build, since every run writes a fresh set of image layers and nothing prunes the
        old ones.
      </p>
      <p>
        At that rate it's about five builds to a full disk, and it doesn't announce itself as "out of
        space" — it surfaces as confusing, unrelated-looking build failures.
      </p>
      <p class="takeaway">
        On small instances, treat image cleanup as part of the pipeline, not as maintenance you'll get
        to later.
      </p>
    </article>

  </section>

  <section>
    <h2>Stack</h2>
    <div class="stack">
      <div class="layer">
        <h4>Application</h4>
        <ul>
          <li>NestJS 11</li>
          <li>TypeScript 5.7</li>
          <li>Node.js 18</li>
          <li>Jest · Supertest</li>
        </ul>
      </div>
      <div class="layer">
        <h4>Container</h4>
        <ul>
          <li>Docker</li>
          <li>node:18-alpine</li>
          <li>Multi-stage friendly</li>
          <li>Port 3000</li>
        </ul>
      </div>
      <div class="layer">
        <h4>CI / CD</h4>
        <ul>
          <li>Jenkins declarative pipeline</li>
          <li>Poll SCM trigger</li>
          <li>GitHub webhook</li>
          <li>Email Extension</li>
        </ul>
      </div>
      <div class="layer">
        <h4>Infrastructure</h4>
        <ul>
          <li>AWS EC2</li>
          <li>Ubuntu 26.04 LTS</li>
          <li>Security groups</li>
          <li>SSH key auth</li>
        </ul>
      </div>
    </div>
  </section>

  <footer>
    <span>Built and deployed from a Jenkins pipeline on AWS EC2.</span>
    <span><a href="/login">Login demo</a> · <a href="https://portfolio-rajib.vercel.app/">Portfolio</a></span>
  </footer>

</div>
</body>
</html>`;
