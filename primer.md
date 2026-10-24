# Show Portal — Project Primer

> Read this first at the start of any session on a show built from this template (or the template itself).
> It is the working context for Claude. `README.md` is the human setup guide.

## What this is

A single-page **production portal and call board** for a theatre production. Families, cast and crew see rehearsal calls, cast assignments, rehearsal music and the season calendar. Directors/crew log in with a PIN to post and archive rehearsal calls.

**Hosting model: AWS only.** The site is on S3 + CloudFront, the call board is a Lambda + DynamoDB API, and Google (Sheet, Calendar, Drive) still holds the cast list, schedule and music so non-technical partners can edit them. The older GitHub-Pages-plus-Sheet call board is no longer supported by the template.

- **Template repo:** `Cheeseman25/ShowPortalTemplate`. Each show is its own repo created from it ("Use this template"), served at its own subdomain named show+year, e.g. `https://seussical2027.ttsplayershaverhillbradford.com` (one subdomain per show so each show has its own browser-storage origin).
- **Engine vs show:** everything show-specific is in `show/show.config.js` (+ images in `public/`). `src/` is the shared engine; keep show-specific text, colors and IDs out of it.
- Engine improvements go into the template first. Past shows keep their copy; port a change by copying the affected `src/` files.

## Architecture at a glance

```
Browser (S3 + CloudFront: dist/ — index.html + assets/app-<hash>.js + assets/styles-<hash>.css)
   │  same-origin  /api/calls  (GET list, POST {action, pin, …})   /api/videos (GET)
   ▼
CloudFront → Lambda function URL (IAM auth via CloudFront OAC)  aws/callboard-api/index.mjs
   ├── DynamoDB table            → rehearsal calls (read/write, archive only, never delete)
   ├── SSM SecureStrings         → staff PIN, bridge secret, YouTube key (never in the repo or browser)
   └── Apps Script bridge        → calendar updates only (awsSync / awsAttach / awsCreate)

Browser also calls the Apps Script web app (backendUrl …/exec), bound to the show's Google Sheet:
   ├── Sheet tab "Cast"       → cast roster (read)
   ├── Google Calendar (Script Property CALENDAR_ID) → season schedule (read)
   └── Drive folder (Script Property MUSIC_ROOT_FOLDER_ID) + subfolders → audio tracks (read)

Fallback: cast also loads from a published-to-web CSV of the Cast tab (castCsvUrl) if the backend fails.
```

**Build:** `npm run build` (scripts/build.mjs) bundles `src/main.jsx` with esbuild into one minified `assets/app-<hash>.js`, compiles Tailwind v3 + `src/styles.css` into `assets/styles-<hash>.css`, fills `src/index.html` placeholders (`{{pageTitle}}`, `{{icon}}`, languages, `<!--ANALYTICS-->`) from the show settings, and copies `public/` into `dist/`. React 18.3.1 / ReactDOM load as global UMD scripts from unpkg; canvas-confetti, Google Translate, GA4 and Google Fonts from CDNs.

**Deploy:** infrastructure is `aws/cloudformation/show-stack.yaml`; follow `aws/README.md` (create the stack, upload `dist/` to the site bucket, invalidate CloudFront). `.github/workflows/deploy.yml` only checks that the site builds; publishing to GitHub Pages is opt-in with the repo variable `PAGES_DEPLOY=true`.

## Files

| File | Purpose |
|---|---|
| `show/show.config.js` | All show settings (CommonJS so Node, Tailwind and esbuild can all read it): names/text, artwork/logo, Google IDs, analytics, languages, call types, cast column keywords, enabled `tabs`, background effect, theme colors, `storagePrefix`. |
| `public/` | Copied as-is into the site root (logo, artwork). |
| `src/index.html` | HTML shell with build placeholders. |
| `src/main.jsx` | Entry: mounts `<ProductionApp />`. |
| `src/App.jsx` | Root component: all state, data loading, handlers, memos. Builds a `ctx` object passed to every section. |
| `src/config.js` | Engine view of the settings (`SHOW` + named constants), the page registry (`ALL_TABS` → `TAB_INFO` filtered by `tabs`), `DEFAULT_TAB`, `storageKey()`. |
| `src/lib/` | `analytics` (gtag events), `dates`, `music` (natural sort), `celebration` (fanfare + confetti), `links` (auto-link URLs), `cast` (`processCastRows`). |
| `src/effects/` | Page background effects (`snow.js`). Add new ones here and select them with `background`. |
| `src/components/` | `Header`, `NavBar` (breadcrumb + tabs), `Footer`, `CallCard` (`renderCallCard(reh, isArchived, ctx)`). |
| `src/tabs/` | One file per route; each renders only when its tab is active. |
| `src/modals/` | `CalendarEventModal`, `CelebrationModal`, `LoginModal`, `EditCallModal` (call form), `CalendarChoiceModal` (attach-or-create prompt after a save). |
| `src/components/PickerInput.jsx` | Date/time input with a light drawn icon; the browser's dark icon is hidden in `styles.css`. |
| `src/lib/callTimes.js` | Time helpers for the call form (`to24`, `fromTimeInput`, `splitLegacyTime`, `timeRangeLabel`). |
| `src/styles.css` | Custom CSS (colors via Tailwind `theme()`), then the Tailwind directives. Tailwind must stay **after** the custom CSS so utilities override custom classes like `.glass-card`. |
| `tailwind.config.js` | Maps `primary`, `accent`, `page` colors from the show theme. Use `primary-*` / `accent-*` classes, never hardcoded palette names, for themed elements. |
| `apps-script/Code.gs` | Backend script, **VERSION 6** (no secrets; settings in Script Properties). Pasted into the Sheet's Apps Script editor; it is not deployed from the repo. |
| `aws/callboard-api/` | The call board Lambda (`index.mjs`) and its tests. |
| `aws/cloudformation/show-stack.yaml` | One stack per show: site bucket, CloudFront, Lambda, DynamoDB. |
| `aws/README.md` | Runbook for launching a show on AWS. |
| `apps-script/calendarSync.gs` | Calendar sync module, **VERSION 4**. Writes call details into existing calendar events by time overlap; never creates events from a save. Paste as a second file in the same Apps Script project. |
| `scripts/build.mjs` | Build (`--cdn-css` = preview build using the Tailwind CDN instead of the CLI). |
| `.github/workflows/deploy.yml` | Build + deploy. |

## Routing

Hash-based routing on a single page. `TAB_INFO` is the route table; `getInitialTab()` reads `location.hash` on load, `navigateToTab()` sets it, and a `hashchange` listener keeps state in sync with back/forward. Only the pages listed in the show's `tabs` setting exist; unknown hashes fall back to the first one. Every navigation fires a GA4 `page_view`.

| Route | Label | Content |
|---|---|---|
| `#callboard` | 📅 Call Board & Schedule | Rehearsal call notices from the AWS call board API |
| `#cast` | 🎭 Cast Members | Mystery reveal cast cards |
| `#costumes` | 👗 Costumes | **Placeholder** ("coming soon") |
| `#music` | 🎵 Rehearsal Tracks | Drive audio player + YouTube playlist sub-view |
| `#videos` | 🎬 Choreography Vault | Thumbnail picker over the choreography YouTube playlist (see section below) |
| `#calendar` | 🗓️ Master Schedule | Live Google Calendar feed |

Sub-views and overlays (not routed, component state only):
- Music tab sub-view: one button per Drive folder category plus `youtube`.
- Calendar view mode: `next8` (default) or `full`.
- Modals: Staff Login, Add/Edit Rehearsal Call, Calendar Event Details, Cast Celebration (role reveal).

A breadcrumb bar shows the current route and has a **Copy Direct Link** button that copies `…/<RepoName>/#<tab>`.

## Feature list

### Global
- Dark UI (Tailwind, Cinzel headings) themed by the show's `primary` / `accent` colors; optional animated background (`background: "snow"`).
- **Language switcher** from the `languages` setting, via a hidden Google Translate widget (sets `googtrans` cookie; Arabic switches the page to RTL).
- **Staff Login** (PIN) → "Director / Crew Admin" badge with Lock (logout). Session persists in `sessionStorage` for the tab.
- Header with show artwork; footer with company logo, show/company line and licensing line (each hidden when blank).
- **Cache-first loading**: cast, rehearsals, calendar and music are read from `localStorage` instantly, then refreshed from the backend on load.
- GA4 analytics events: `page_view`, `change_site_language`, `admin_login_success` / `admin_login_failed`, `select_rehearsal_track`, `calendar_view_mode_change`, `join_google_meet_click`, `open_google_calendar_click`, and others via `trackAnalyticsEvent()`.

### Call Board (`#callboard`)
- Active rehearsal notices, newest first; each card shows title, type badge, date/time, location, called performers, focus scenes/music, notes (URLs auto-linked).
- Full-cast calls are visually distinguished.
- Filter by actor or character name (full-cast/company calls always match).
- Backend status indicator.
- Collapsible **Archived Rehearsal Notices** vault.
- **Admin only:** + New Call, ✏️ Edit, 📦 Archive / 🔄 Restore. Edit modal has title, date, call type (list or custom), time, location, performer picker (search, + Full Company, + Principals, + All Ensemble, Clear), focus scenes, notes, archived checkbox. Saves optimistically to local state, then POSTs to backend.

### Cast (`#cast`)
- Optional casting notice (`castNotice`).
- **Mystery reveal cards**: each performer's role is hidden until tapped; tapping opens a celebration modal with confetti and a synthesized fanfare (Web Audio). Reveal All / Re-hide All.
- Search by performer or character; category filter chips (All Cast A–Z, Principal, Featured Ensemble, Ensemble).
- Refresh Cast button. Cast parsed by `processCastRows()`: finds columns by header keywords (category/type/group/tier; role/character/part; first cast = `castColumnKeywords.first` + cast a/actor/name; second cast = `castColumnKeywords.second` + cast b), drops "TBD", merges an actor's multiple roles into one card.

### Costumes (`#costumes`) — placeholder only.

### Rehearsal Tracks (`#music`)
- Folder switcher built dynamically from Drive subfolders (track counts shown).
- Embedded Drive audio preview player for the selected track, plus Download link.
- Track list per folder, natural-sorted by filename; Load Track / download per row.
- Open Drive Folder link, Sync Folder (clears cache and refetches).
- YouTube Stream sub-view embedding the rehearsal playlist (youtube-nocookie).

### Choreography Vault (`#videos`)

- Lists the playlist in `videosPlaylistId` through the YouTube Data API (`playlistItems.list`) when the tab opens. New entries appear on the next visit, with no code change.
- Renders a thumbnail grid. The selected video plays in a youtube-nocookie embed. The first entry plays by default.
- Pages through up to 500 entries (10 pages x 50). Skips hidden or removed entries and any ID that fails the 11-character check.
- Fetched through `/api/videos` (`videosApiUrl`); the Lambda holds the YouTube key and caches for 5 minutes. Falls back to the plain playlist embed when the API call fails. Shows "coming soon" when `videosPlaylistId` is blank.
- Calls the API only while the tab is open.
- Setup: create a YouTube Data API v3 key restricted to that API only (NO website restriction, requests come from AWS), store it in SSM at `<ParameterPrefix>/youtube-key`. The key is never in the repo or the browser.

### Master Schedule (`#calendar`)
- Events from Google Calendar (2 weeks back to ~8 months ahead), grouped by month.
- Next 8 Events vs Full Season Run toggle; search across title, location, description.
- Google Meet links auto-detected and badged; event details modal with Join Meet button.
- + Add to Google Calendar and Subscribe on iPhone/Mac (webcal ICS) links; Sync button.

## Backend APIs

### Call board API (AWS, `aws/callboard-api/index.mjs`)
Same-origin through CloudFront. Settings: `callBoardUrl: "/api/calls"`, `videosApiUrl: "/api/videos"`. See `aws/callboard-api/README.md` for env vars and behaviour.

| Request | Effect |
|---|---|
| `GET /api/calls` | `[{id,title,date(YYYY-MM-DD),time,location,type,calledRoles[],focusScenes[],notes,isArchived}]` |
| `GET /api/videos` | Playlist items (cached 5 min; 502 if nothing cached and Google fails) |
| `POST {action:"verifyPin", pin}` | success/error; 10 wrong PINs in 15 min locks attempts for 15 min |
| `POST {action:"save", pin, item}` | Upsert by ID (new ID = `reh-<ms>`); returns `{status, id, sync}` (`sync.unmatched` and `sync.events` drive the app's calendar prompt) |
| `POST {action:"calendarAttach", pin, id, eventId}` / `calendarCreate` | Writes the call into a calendar event via the Apps Script bridge |
| `POST {action:"archive"/"delete"/"unarchive", pin, id}` | Sets isArchived; never deletes |

Every POST through CloudFront must carry header `x-amz-content-sha256` (hex SHA-256 of the body); `src/lib/callApi.js` adds it. Secrets live in SSM SecureStrings (created by hand, outside CloudFormation).

### Apps Script (Google, `apps-script/Code.gs` + `calendarSync.gs`)
Per-show values are **Script Properties**, not code: `CALENDAR_ID`, `MUSIC_ROOT_FOLDER_ID`, `AWS_SYNC_SECRET` (32+ chars, equals the SSM `<ParameterPrefix>/sync-secret`). `setupSheets()` creates the Cast tab.

**GET** `backendUrl?action=…` (frontend adds `&t=<timestamp>` cache-buster)
| action | Returns |
|---|---|
| `getCalendarEvents` | `[{id,title,startTime,endTime(ISO),isAllDay,location,description,meetLink}]` sorted by start |
| `getMusic` | `{status:"success", tracks:[{id,title,filename,category,previewUrl,downloadUrl}]}` — root folder files = "Practice Tracks", each direct subfolder = its own category (not recursive below one level) |
| `getCast` | Raw 2D array of the cast sheet (`getValues()`), parsed client-side |

**POST** (only from the AWS Lambda, authenticated by `secret`): `awsSync {secret, date, calls}`, `awsAttach {secret, id, eventId, calls}`, `awsCreate {secret, id, calls}`. `calls` is the AWS copy of that date's calls, used instead of any Sheet for that one request.

**Deploying backend changes:** edit in the Apps Script editor → Deploy → Manage deployments → edit the existing deployment → New version. That keeps the same `/exec` URL. Creating a *new* deployment changes the URL and requires updating `backendUrl` in the show settings and `AppsScriptUrl` in the stack.

## Gotchas

- **Browser storage is per origin.** Each show has its own subdomain, but all saved data goes through `storageKey()` with the show's `storagePrefix`; never call `localStorage` with a literal key.
- Auth is a shared PIN sent with every write (checked in the Lambda, lockout after repeated failures); fine for a call board, not real security. Never put the PIN, bridge secret or YouTube key in a tracked file.
- Admin edits update local state and `localStorage` before the backend confirms; a failed save alerts, but the local view can differ until refresh.
- Visitors' cached data can look like stale-backend bugs.
- `getMusic` reads only one level of subfolders; calendar window is fixed at −14 / +240 days in the script.
- Cast data contains students' names: keep it in the Sheet, never hardcoded in the repo.

## Keep the engine in sync (Frozen ⇄ template)

Engine changes are made in BOTH repos in the same session, as separate commits:
`Cheeseman25/FrozenJR2026` (the running show, where changes are tested with real data)
and `Cheeseman25/ShowPortalTemplate` (the starting point for future shows).

- **Copy** (engine, identical in both): `src/`, `scripts/`, `tailwind.config.js`, `package.json` devDependencies, `.github/workflows/`.
- **Never copy** (per show): `show/show.config.js`, `public/`, `music/`, `primer.md`, `README.md`.
- **New setting:** add it to the engine with a safe default for blank values, then add it to the template's blank `show/show.config.js` (commented) as well as Frozen's.
- **Also copy:** `aws/callboard-api/` (Lambda and tests). Frozen's CloudFormation was built by hand; the template's `aws/cloudformation/show-stack.yaml` is for new shows.
- **Backend:** the template's `apps-script/Code.gs` and `calendarSync.gs` are the generic versions (settings in Script Properties). Port backend logic changes to them; Frozen's own script is local only (git-ignored, contains its secrets).
- After copying, `diff -r` the engine paths between the two repos; the only expected difference is none.
- A settings-only change (new call type, colors, text) stays in the one show.

## Workflow notes for Claude

- Show-specific change → `show/show.config.js` or `public/`. Engine change → `src/`, and make it in the template too.
- Adding state or a handler a section needs: declare it in `App.jsx`, add it to `ctx`, destructure it in the section. A missing name is silently `undefined`; type-check or click through to catch it.
- Never edit `dist/` (generated, git-ignored).
- Backend changes: Lambda in `aws/callboard-api/` (run `npm test` there); Google side in `apps-script/Code.gs` and `calendarSync.gs`, which the user pastes into the Apps Script editor and deploys a **new version of the existing deployment** (keeps the URL).
- **Cloud sessions:** GitHub is the source of truth. Attach this repo, read this file, and work from a clone. Device-shell (Mac) access is only available when a session is linked to the Mac.
- The cloud workspace can't reach npm but has esbuild at /opt/npm-tools: symlink `node_modules/esbuild` and `node_modules/@esbuild` to it and run `node scripts/build.mjs --cdn-css` for a preview build. Full builds run in GitHub Actions.
- Regression check for engine refactors: render old and new builds in headless Chromium (Playwright at /opt/npm-tools, browsers at /opt/pw-browsers) with mocked backend responses, click through every page and modal, and diff `#root` HTML. For styling, compare computed styles in the browser pane against the live site.
