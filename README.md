# Show Portal Template

A production portal and call board for a theatre show, hosted on AWS (S3 + CloudFront, with a Lambda
and DynamoDB call board). Families, cast and crew get the rehearsal call board, cast list, rehearsal
tracks and season calendar on one page. Staff log in with a PIN to post and archive calls.

Google still holds the content your partners edit: a Google Sheet (cast list), a Google Calendar
(schedule) and a Drive folder (rehearsal tracks). A small Google Apps Script attached to the Sheet
connects them to the website, and writes call details into calendar events.

**Each show gets its own copy of this template.** Everything specific to a show is in one file,
`show/show.config.js`. The code in `src/` is shared and shouldn't need changes from show to show.

---

## Starting a new show

About an hour. Do the Google steps first (the website settings need values from them), then the AWS runbook.

### 1. Google Sheet and backend script

1. Create a new Google Sheet (e.g. "Seussical 2027 Portal").
2. **Extensions -> Apps Script.** Delete the starter code. Paste in [`apps-script/Code.gs`](apps-script/Code.gs),
   then add a second file (+ next to Files, Script) named `calendarSync` and paste in
   [`apps-script/calendarSync.gs`](apps-script/calendarSync.gs). Save.
3. Choose **`setupSheets`** in the function menu and press **Run**. Approve the permission prompts. This creates the **Cast** tab.
4. **Project Settings -> Script Properties -> Add script property**, three times:
   | Property | Value |
   |---|---|
   | `CALENDAR_ID` | From step 2 below |
   | `MUSIC_ROOT_FOLDER_ID` | From step 3 below |
   | `AWS_SYNC_SECRET` | A random string of 32+ characters. The same value goes in AWS (see `aws/README.md`) |
5. **Deploy -> New deployment -> Web app.** Execute as: **Me**. Who has access: **Anyone**. Copy the
   **Web app URL** (ends in `/exec`). This is `backendUrl`.
   - Later changes: **Deploy -> Manage deployments -> pencil -> Version: New version** keeps the same URL.
6. Optional backup cast source: **File -> Share -> Publish to web**, choose the **Cast** tab and **CSV**, and copy the link (`castCsvUrl`).

**Cast tab format:** one row per role. Columns: `Category` (Principal, Featured Ensemble, Ensemble...),
`Role`, then one column per cast. If your casts have names (e.g. "Red Cast" / "Blue Cast"), put those
words in `castColumnKeywords`.

### 2. Google Calendar

1. Create a new calendar for the show (Google Calendar -> Other calendars -> **+ -> Create new calendar**).
2. Its settings -> **Access permissions -> Make available to public**.
3. Its settings -> **Integrate calendar -> Calendar ID** (ends in `@group.calendar.google.com`).
   Use it for `CALENDAR_ID` in the script and `calendarId` in the website settings.
4. Put Google Meet links in an event's location or description and the site shows a Join button.
5. Calls are written into **existing** events by date and time. Staff can attach a call to an event or create one from the call board.

### 3. Drive music folder

1. Create a folder for rehearsal tracks and **Share -> General access -> Anyone with the link (Viewer)**.
2. Its ID is the part of the folder URL after `/folders/`. That's `MUSIC_ROOT_FOLDER_ID`.
   The full share link is `musicFolderUrl`.
3. Audio files directly in the folder show as **Practice Tracks**. Each subfolder becomes its own tab on the music page.

### 4. The website settings

1. On this template's GitHub page: **Use this template -> Create a new repository.** Name it after the show (e.g. `Seussical2027`).
2. Fill in [`show/show.config.js`](show/show.config.js). Set a unique `storagePrefix` first.
   Images (logo, show artwork) go in `public/` and are referenced by file name, e.g. `logoUrl: "logo.png"`.
   Leave `callBoardUrl` and `videosApiUrl` as they are (they are same-site paths).

### 5. AWS hosting

Follow [`aws/README.md`](aws/README.md): secrets, the Lambda zip, the CloudFormation stack, the DNS record,
then build (`npm run build`) and upload `dist/`.

### 6. Check it

- The call board loads, Staff Login works with your PIN, and a test call stays after a reload.
- Cast, calendar and music pages show your data.
- Saving a call updates the matching calendar event.

---

## How it fits together

```
Browser  ->  CloudFront  (your show's subdomain)
              |-- /*           S3 bucket (the built site, private)
              |-- /api/calls   Lambda -> DynamoDB (calls), SSM (PIN, secrets)
              '-- /api/videos  Lambda -> YouTube (key stays server side)
Browser  ->  Apps Script web app (backendUrl) -> Cast tab, Google Calendar, Drive tracks
Lambda   ->  Apps Script (shared secret) -> writes call details into calendar events
```

| Path | What it is |
|---|---|
| `show/show.config.js` | **All show settings.** The only file a new show normally edits. |
| `public/` | Show images and any other files to publish as-is (logo, artwork). |
| `aws/README.md` | Runbook for launching a show on AWS. |
| `aws/cloudformation/show-stack.yaml` | The per-show hosting stack. |
| `aws/callboard-api/` | The call board Lambda and its tests. |
| `apps-script/` | Google Apps Script (`Code.gs`, `calendarSync.gs`) to paste into the Sheet's editor. Contains no secrets. |
| `src/` | Shared engine: `App.jsx` (state and data loading), `tabs/` (one file per page), `modals/`, `components/`, `lib/` helpers, `effects/` backgrounds, `styles.css`. |
| `scripts/build.mjs` | Build: compiles the app and styles into `dist/`. |
| `.github/workflows/deploy.yml` | Checks the site builds on every push. Publishing to GitHub Pages is off unless the repo variable `PAGES_DEPLOY` is `true`. |
| `primer.md` | Technical notes for working on this project with Claude. |

Pages (shown as `#hash` links, e.g. `.../#cast`): `callboard`, `cast`, `costumes`, `music`, `videos`, `calendar`.
Turn pages on or off and reorder them with `tabs` in the show settings. Costumes and Choreography are placeholder pages for now.

## Improving the engine

Fix or improve the shared engine here in the template, so every future show starts
with it. Past shows keep the version they were created with. To bring an
improvement into a running show, copy the changed `src/` files into that show's repo.
