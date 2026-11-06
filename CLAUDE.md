# Notes for Claude

Read `primer.md` first: architecture, pages, settings, backend API and workflow. To launch a show, follow `aws/README.md`.

## Before editing: start from the latest GitHub copy

GitHub `main` is the source of truth. At the start of every task, before changing anything:
1. `git fetch` + fast-forward to `origin/main` in the clone being edited.
2. Check the local copy of this repo for uncommitted or unpushed work. If there is any, ask the user before doing anything else; never overwrite it.
3. Only then edit.

## Show repos and the template

This repo is the template for future shows. Each show is its own repo created from it ("Use this template"). The engine is shared; the show is settings.

- **Engine** (same in the template and every show): `src/`, `scripts/`, `aws/callboard-api/`, `tailwind.config.js`, `package.json` devDependencies, `.github/workflows/`.
- **Per show** (never copied between repos): `show/show.config.js`, `public/`, `music/`, `primer.md`, `README.md`.
- **Engine change made in a show repo:** make the same change in the template repo in the same session, as a separate commit, so the next show gets it. Then `diff -r` the engine paths between the two repos; the expected difference is none. Past shows keep their copy and take a fix by copying the affected files.
- **New setting:** add it to the engine with a safe default for blank values, then add it, blank and commented, to the template's `show/show.config.js`.
- **Backend:** the template's `apps-script/Code.gs` and `calendarSync.gs` are the generic versions (settings in Script Properties). Port backend logic changes to them. A show's own deployed script is local only (git-ignored, contains its secrets).
- A settings-only change (new call type, colors, text, dates) stays in the one show.
- **Hosting is AWS only** (S3 + CloudFront + Lambda + DynamoDB); see `aws/README.md`.
- **Never commit** secrets (PIN, bridge secret, YouTube key), published-sheet links, or real cast names. Secrets live in SSM; sheet links go in the stack parameters `CastCsvUrl` / `ShowsCsvUrl` and are served through `/api/cast` and `/api/shows`.
