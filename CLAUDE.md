# Notes for Claude

Read `primer.md` first: architecture, pages, settings, backend API and workflow.

## Keep the engine in sync (Frozen ⇄ template)

Engine changes are made in BOTH repos in the same session, as separate commits:
`Cheeseman25/FrozenJR2026` (the running show, where changes are tested with real data)
and `Cheeseman25/ShowPortalTemplate` (the starting point for future shows).

- **Copy** (engine, identical in both): `src/`, `scripts/`, `tailwind.config.js`, `package.json` devDependencies, `.github/workflows/`.
- **Never copy** (per show): `show/show.config.js`, `public/`, `music/`, `primer.md`, `README.md`.
- **New setting:** add it to the engine with a safe default for blank values, then add it to the template's blank `show/show.config.js` (commented) as well as Frozen's.
- **Backend:** the template's `apps-script/Code.gs` is the generic version (settings in Script Properties). Port backend logic changes to it; Frozen's own script is local only (git-ignored, contains its PIN).
- After copying, `diff -r` the engine paths between the two repos; the only expected difference is none.
- A settings-only change (new call type, colors, text) stays in the one show.
