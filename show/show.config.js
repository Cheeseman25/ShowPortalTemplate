/**
 * SHOW SETTINGS: everything specific to one production lives in this file.
 * The rest of the site (src/) is the shared engine; a new show shouldn't need to touch it.
 *
 * Fill in each value marked TODO. Blank values are fine while you set up: the site
 * still builds, and sections without data stay empty or hidden.
 * See README.md ("Starting a new show") for where each Google value comes from.
 */
module.exports = {
  // TODO: short, unique, lowercase, no spaces (e.g. "seussical2027").
  // Prefixes the data this site saves in visitors' browsers. Every site on
  // <you>.github.io shares browser storage, so each show MUST use its own prefix.
  storagePrefix: "show",

  // ---------------------------------------------------------------- names & text
  title: "Show Title",                   // TODO full show name, e.g. "Disney's ... JR."
  shortTitle: "Show",                    // TODO short name for the breadcrumb
  pageTitle: "Production Portal & Call Board", // TODO browser tab title
  playlistTitle: "Rehearsal Music Playlist",
  icon: "🎭",                            // favicon, loading spinner and card icons
  breadcrumbIcon: "🎭",

  company: {
    name: "Company Name",                // TODO
    location: "Town, State",             // TODO
    logoUrl: "",                         // e.g. "logo.png" after adding public/logo.png; "" hides it
    logoAlt: "Company logo",
  },
  licenseLine: "",                       // e.g. "Authorized Performance Materials Supplied by Music Theatre International (MTI)"
  artworkUrl: "",                        // show artwork, e.g. "artwork.jpg" from public/; "" hides it

  castNotice: "",                        // optional note above the cast cards; "" hides it

  // Song titles used as examples on the Choreography page and in the call form.
  exampleNumbers: [],
  focusScenesPlaceholder: "e.g., Scene 4, Act 1 Harmonies",

  // ---------------------------------------------------------------- AWS (call board and videos)
  // This site is served from AWS on its own domain (see aws/README.md). The call board and the
  // Choreography playlist come from the site's own API, so these two normally stay as they are.
  callBoardUrl: "/api/calls",            // call board login, list and save (Lambda + DynamoDB)
  videosApiUrl: "/api/videos",           // Choreography Vault playlist (the YouTube key stays on the server)

  // ---------------------------------------------------------------- Google services
  // Cast, the calendar and the music folder still come from Google, edited by the production team.
  backendUrl: "",                        // TODO Apps Script web app URL ending in /exec
  castCsvUrl: "",                        // optional: Cast tab published to the web as CSV (backup source)
  calendarId: "",                        // TODO public Google Calendar ID (…@group.calendar.google.com)
  musicFolderUrl: "",                    // TODO Drive music folder share link
  youtubePlaylistId: "",                 // optional YouTube playlist ID
  videosPlaylistId: "",                  // optional YouTube playlist for the Choreography Vault (must be Public or Unlisted)
  videosPlaylistTitle: "",               // optional title for the Choreography Vault embed
  analyticsId: "",                       // optional Google Analytics 4 ID (G-…); "" turns analytics off

  // Shown on the music page if the Drive folder can't be loaded. Usually [].
  fallbackTracks: [],

  // ---------------------------------------------------------------- features
  // Pages shown in the menu, in order. Available: callboard, cast, costumes, music, videos, calendar.
  tabs: ["callboard", "cast", "costumes", "music", "videos", "calendar"],

  // Choices in the staff "New Rehearsal Call" form (staff can also type a custom one).
  callTypes: [
    "Full Cast Rehearsal",
    "Partial Call",
    "Parent Meeting",
    "Vocal Rehearsal",
    "Choreography",
    "Tech / Dress Rehearsal",
  ],

  // How the cast sheet's two cast columns are recognised (header text, lowercase).
  // "cast a" / "actor" / "name" and "cast b" always work; add your own cast names
  // here, e.g. { first: ["red"], second: ["blue"] } for "Red Cast" / "Blue Cast".
  castColumnKeywords: { first: [], second: [] },

  // Language buttons (Google Translate). First entry is the site's own language.
  languages: [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ],

  // ---------------------------------------------------------------- look
  background: "none",                    // "snow" or "none"
  theme: {
    // primary: buttons, borders, highlights. accent: secondary gradients and scrollbars.
    // Any 50–950 color scale works (hex). Defaults are Tailwind's cyan and sky;
    // https://tailwindcss.com/docs/customizing-colors lists other ready-made scales.
    primary: { 50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63", 950: "#083344" },
    accent:  { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1", 800: "#075985", 900: "#0c4a6e", 950: "#082f49" },
    pageGradient: { top: "#0c4a6e", bottom: "#031828" }, // page background, top to bottom
    confetti: ["#38bdf8", "#7dd3fc", "#bae6fd", "#f472b6", "#fbbf24", "#ffffff"],
  },
};
