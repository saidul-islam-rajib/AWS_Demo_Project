export const ACCOUNT_BUNDLE = 'account';
export const ACCOUNT_ADMIN_BUNDLE = 'account-admin';

export const ACCOUNT_PUBLIC_CSS = `
.account-shell {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
  gap: 0; margin: 1.5rem auto 4rem; max-width: 60rem;
  border: 1px solid var(--border); border-radius: 18px;
  background: var(--surface); overflow: hidden;
}
.account-shell.solo { grid-template-columns: minmax(0, 1fr); max-width: 32rem; }
.account-main { padding: 2.5rem 2.25rem; }
.account-eyebrow {
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em;
  font-weight: 700; color: var(--accent); margin-bottom: 0.6rem;
}
.account-shell h1 {
  font-family: var(--serif); font-size: clamp(1.7rem, 3.5vw, 2.2rem);
  letter-spacing: -0.03em; margin-bottom: 0.5rem;
}
.account-lede {
  color: var(--ink-3); font-size: 0.92rem; line-height: 1.6; margin-bottom: 1.75rem;
}
.account-shell button[type="submit"] {
  width: 100%; justify-content: center; padding: 0.7rem 1rem;
  font-size: 0.92rem; margin-top: 0.35rem;
}
.account-alt {
  margin-top: 1.5rem; padding-top: 1.25rem; font-size: 0.87rem;
  color: var(--ink-3); border-top: 1px solid var(--border);
}
.account-alt a { color: var(--accent); font-weight: 600; }
.account-alt-row { display: flex; flex-wrap: wrap; gap: 0.4rem 0.9rem; justify-content: space-between; }

.account-aside { padding: 2.5rem 2rem; background: var(--surface-2); border-left: 1px solid var(--border); }
.account-aside h2 {
  font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.09em;
  color: var(--ink-3); margin-bottom: 1.4rem;
}
.account-perks { list-style: none; display: grid; gap: 1.35rem; }
.account-perk { display: flex; gap: 0.85rem; }
.perk-icon {
  flex: none; width: 1.85rem; height: 1.85rem; border-radius: 50%;
  display: grid; place-items: center; font-size: 0.8rem;
  background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent);
}
.account-perk b { display: block; font-size: 0.9rem; color: var(--ink); margin-bottom: 0.2rem; }
.account-perk span { font-size: 0.82rem; color: var(--ink-3); line-height: 1.55; }

.account-steps { list-style: none; counter-reset: step; display: grid; gap: 1.35rem; }
.account-step { display: flex; gap: 0.85rem; counter-increment: step; }
.account-step::before {
  content: counter(step); flex: none;
  width: 1.85rem; height: 1.85rem; border-radius: 50%;
  display: grid; place-items: center; font-size: 0.8rem; font-weight: 700;
  background: var(--accent); color: var(--accent-ink);
}
.account-step b { display: block; font-size: 0.9rem; color: var(--ink); margin-bottom: 0.2rem; }
.account-step span { font-size: 0.82rem; color: var(--ink-3); line-height: 1.55; }

.account-head { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.4rem; }
.account-avatar {
  flex: none; width: 3rem; height: 3rem; border-radius: 50%;
  display: grid; place-items: center; font-weight: 700; font-size: 1.05rem;
  background: var(--accent); color: var(--accent-ink);
}
.account-section {
  font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.09em;
  color: var(--ink-3); font-weight: 700; margin: 2.25rem 0 1rem;
  padding-bottom: 0.6rem; border-bottom: 1px solid var(--border);
}
.account-cert {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.9rem 1rem; margin-bottom: 0.55rem;
  border: 1px solid var(--border); border-radius: 12px; background: var(--surface);
}
.account-cert:hover { border-color: var(--accent); }
.account-cert-mark {
  flex: none; width: 2.1rem; height: 2.1rem; border-radius: 8px;
  display: grid; place-items: center; font-size: 0.9rem;
  background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent);
}
.account-cert b { display: block; font-size: 0.94rem; color: var(--ink); }
.account-cert span { font-size: 0.78rem; color: var(--ink-3); }
.account-empty {
  font-size: 0.87rem; color: var(--ink-3); line-height: 1.6;
  padding: 1.1rem; border: 1px dashed var(--border); border-radius: 12px;
}
.account-signout { margin-top: 2.25rem; }

.recovery-warn { font-size: 0.83rem; color: var(--ink-3); line-height: 1.6; margin-bottom: 1.5rem; }
.recovery-warn a { color: var(--accent); font-weight: 600; }
.recovery-panel { border: 1px solid var(--border); border-radius: 12px; padding: 1.1rem 1.15rem; background: var(--surface-2); }
.recovery-panel p { font-size: 0.85rem; color: var(--ink-3); line-height: 1.6; margin-bottom: 1.1rem; }
.recovery-panel button[type="submit"] { margin-top: 0; }

.account-stuck { margin-top: 1.75rem; padding: 1.1rem 1.15rem; border: 1px dashed var(--border); border-radius: 12px; }
.account-stuck b { display: block; font-size: 0.9rem; color: var(--ink); }
.account-stuck p { font-size: 0.83rem; color: var(--ink-3); line-height: 1.6; margin-top: 0.5rem; }
.account-stuck a { color: var(--accent); font-weight: 600; }

@media (max-width: 800px) {
  .account-shell { grid-template-columns: minmax(0, 1fr); }
  .account-main { padding: 2rem 1.4rem; }
  .account-aside { border-left: 0; border-top: 1px solid var(--border); padding: 2rem 1.4rem; }
}
`;

export const ACCOUNT_ADMIN_CSS = `
.acct-search { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.acct-search input { flex: 1; min-width: 200px; border-radius: 100px; padding-left: 1rem; }

.acct-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.75rem; align-items: start; }
@media (max-width: 880px) { .acct-grid { grid-template-columns: 1fr; } }

.issued-link {
  font-family: var(--mono); font-size: 0.8rem; color: var(--ink-2);
  word-break: break-all; padding: 0.6rem 0.7rem; margin: 0.5rem 0;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
}

.who { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1.25rem; }
.who .avatar {
  flex: none; width: 2.8rem; height: 2.8rem; border-radius: 50%;
  display: grid; place-items: center; font-weight: 700;
  background: var(--accent); color: var(--accent-ink);
}
.who b { display: block; color: var(--ink); font-size: 1.05rem; }
.who span { font-size: 0.84rem; color: var(--ink-3); }

.facts { list-style: none; display: grid; gap: 0.55rem; }
.facts li { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.84rem; color: var(--ink-2); }
.facts li span { color: var(--ink-3); }

.trail { list-style: none; display: grid; gap: 0.5rem; }
.trail li { border: 1px solid var(--border); border-radius: 10px; padding: 0.65rem 0.8rem; background: var(--surface-2); }
.trail .top { display: flex; align-items: center; gap: 0.5rem; justify-content: space-between; flex-wrap: wrap; }
.trail b { font-size: 0.82rem; color: var(--ink); }
.trail .note { font-size: 0.82rem; color: var(--ink-2); margin-top: 0.35rem; }
.trail .when { font-size: 0.76rem; color: var(--ink-3); }
`;
