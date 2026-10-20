# Show Portal Template

A production portal and call board for a theatre show, hosted free on GitHub Pages.
Families, cast and crew get the rehearsal call board, cast list, rehearsal tracks and
season calendar on one page. Staff log in with a PIN to post and archive calls.

Data lives in Google: a Google Sheet (rehearsal calls and cast), a Google Calendar
(schedule) and a Drive folder (rehearsal tracks). A small Google Apps Script attached
to the Sheet connects them to the website.

**Each show gets its own copy of this template.** Everything specific to a show is in
one file, `show/show.config.js`. The code in `src/` is shared and shouldn't need
changes from show to show.

---

## Starting a new show

About 30 minutes. Do the Google steps first, since the website settings need values from them.

### 1. Google Sheet and backend script

1. Create a new Google Sheet (e.g. "Seussical 2027 Portal").
2. **Extensions → Apps Script.** Delete the starter code, paste in all of
   [`apps-script/Code.gs`](apps-script/Code.gs), and save.
3. In the function menu at the top, choose **`setupSheets`** and press **Run**.
   Approve the permission prompts. This creates the **Rehearsals** and **Cast** tabs.
4. **Project Settings (⚙️) → Script Properties → Add script property**, three times:
   | Property | Value |
   |---|---|
   | `ADMIN_PIN` | The staff PIN for posting rehearsal calls |
   | `CALENDAR_ID` | From step 2 below |
   | `MUSIC_ROOT_FOLDER_ID` | From step 3 below |
5. **Deploy → New deployment → ⚙️ Select type: Web app.**
   Execute as: **Me**. Who has access: **Anyone**. Press **Deploy** and copy the
   **Web app URL** (ends in `/exec`). This is `backendUrl`.
   - Later changes to the script: **Deploy → Manage deployments → ✏️ → Version: New version**.
     That keeps the same URL.
6. Optional backup cast source: **File → Share → Publish to web**, choose the **Cast**
   tab and **Comma-separated values (.csv)**, publish, and copy the link (`castCsvUrl`).

**Cast tab format:** one row per role. Columns: `Category` (Principal, Featured
Ensemble, Ensemble…), `Role`, then one column per cast. If your casts have names
(e.g. "Red Cast" / "Blue Cast"), put those words in `castColumnKeywords`.

### 2. Google Calendar

1. Create a new calendar for the show (Google Calendar → Other calendars → **+ → Create new calendar**).
2. Its settings → **Access permissions → Make available to public**.
3. Its settings → **Integrate calendar → Calendar ID** (ends in `@group.calendar.google.com`).
   Use it for `CALENDAR_ID` in the script and `calendarId` in the website settings.
4. Put Google Meet links in an event's location or description and the site shows a Join button.

### 3. Drive music folder

1. Create a folder for rehearsal tracks and **Share → General access → Anyone with the link (Viewer)**.
2. Its ID is the part of the folder URL after `/folders/`. That's `MUSIC_ROOT_FOLDER_ID`.
   The full share link is `musicFolderUrl`.
3. Audio files directly in the folder show as **Practice Tracks**. Each subfolder
   (e.g. "Performance Tracks") becomes its own tab on the music page.

### 4. The website

1. On this template's GitHub page: **Use this template → Create a new repository.**
   Name it after the show (e.g. `Seussical2027`) and make it **Public**.
   The site will be at `https://<your-username>.github.io/Seussical2027/`.
2. In the new repo: **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Fill in [`show/show.config.js`](show/show.config.js). Set a unique `storagePrefix` first.
   Images (logo, show artwork) go in `public/` and are referenced by file name, e.g. `logoUrl: "logo.png"`.
4. Commit. GitHub builds and publishes the site in about a minute (see the **Actions** tab).

### 5. Check it

- The call board says **Connected to Google Sheet Backend**.
- Staff Login works with your PIN, and a test call appears in the Rehearsals tab of the Sheet.
- Cast, calendar and music pages show your data.

---

## How it fits together

```
GitHub Pages (this repo, built by GitHub Actions)
   │  GET ?action=…  /  POST {action, pin, …}
   ▼
Apps Script web app (apps-script/Code.gs, attached to the show's Google Sheet)
   ├── Rehearsals tab     → rehearsal calls (read/write)
   ├── Cast tab           → cast list (read)
   ├── Google Calendar    → schedule (read)
   └── Drive folder       → rehearsal tracks (read)
```

| Path | What it is |
|---|---|
| `show/show.config.js` | **All show settings.** The only file a new show normally edits. |
| `public/` | Show images and any other files to publish as-is (logo, artwork). |
| `apps-script/Code.gs` | Backend script to paste into the Sheet's Apps Script editor. Contains no secrets. |
| `src/` | Shared engine: `App.jsx` (state and data loading), `tabs/` (one file per page), `modals/`, `components/`, `lib/` helpers, `effects/` backgrounds, `styles.css`. |
| `scripts/build.mjs` | Build: compiles the app and styles into `dist/`. |
| `.github/workflows/deploy.yml` | Builds on every push and publishes `main` to GitHub Pages. |
| `primer.md` | Technical notes for working on this project with Claude. |

Pages (shown as `#hash` links, e.g. `…/Seussical2027/#cast`): `callboard`, `cast`,
`costumes`, `music`, `videos`, `calendar`. Turn pages on or off and reorder them with
`tabs` in the show settings. Costumes and Choreography are placeholder pages for now.

## Improving the engine

Fix or improve the shared engine here in the template, so every future show starts
with it. Past shows keep the version they were created with. To bring an
improvement into a running show, copy the changed `src/` files into that show's repo.
