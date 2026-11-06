// Engine-side view of the show settings (show/show.config.js) plus the page registry.
// Show-specific values belong in show/show.config.js, not here.
// "show-config" is resolved by the build (scripts/build.mjs) to the chosen show settings file.
import SHOW from "show-config";

export { SHOW };

export const CALENDAR_ID = SHOW.calendarId;
export const YOUTUBE_REHEARSAL_PLAYLIST_ID = SHOW.youtubePlaylistId;
export const YOUTUBE_CHOREO_PLAYLIST_ID = SHOW.videosPlaylistId || "";
export const YOUTUBE_API_KEY = SHOW.youtubeApiKey || "";
// Server-side playlist list ([{ id, title, thumb }]). When set, the browser never needs a YouTube key.
export const VIDEOS_API_URL = SHOW.videosApiUrl || "";
export const ARTWORK_URL = SHOW.artworkUrl;
export const LOGO_URL = SHOW.company.logoUrl;
export const CALLBOARD_BACKEND_URL = SHOW.backendUrl;
// Call board reads/writes/login. Defaults to the Apps Script backend; a show can point it at its own API.
export const CALL_API_URL = SHOW.callBoardUrl || SHOW.backendUrl;
// Where the page reads the published cast sheet. The show's own API route (castApiUrl) wins, so the
// Google link can stay on the server; otherwise the published CSV link is used directly.
export const CAST_SOURCE_URL = SHOW.castApiUrl || SHOW.castCsvUrl || "";
// Adds a cache-busting parameter to a URL whether or not it already has a query string.
export const noCache = (url) => `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
export const GOOGLE_DRIVE_MUSIC_FOLDER_URL = SHOW.musicFolderUrl;
export const FALLBACK_TRACKS = SHOW.fallbackTracks || [];
export const INITIAL_CALL_TYPES = SHOW.callTypes;
// Where the page reads the sheet tab holding each show's cast (Character/Actor blocks side by side):
// the show's own API route (showsApiUrl) if set, else the published CSV link (showsCsvUrl).
export const SHOWS_SOURCE_URL = SHOW.showsApiUrl || SHOW.showsCsvUrl || "";
// Dates and times of each show, matched by order to the blocks in the Shows sheet tab.
export const SHOW_SCHEDULE = SHOW.showSchedule || [];

// Every page the engine knows how to render. Each key is a #hash route.
const ALL_TABS = {
  callboard: { label: 'Call Board & Schedule', icon: '📅', path: 'callboard' },
  cast: { label: 'Cast Members', icon: '🎭', path: 'cast' },
  shows: { label: 'Show Casts', icon: '🎟️', path: 'shows' },
  costumes: { label: 'Costumes', icon: '👗', path: 'costumes' },
  music: { label: 'Rehearsal Tracks', icon: '🎵', path: 'music' },
  videos: { label: 'Choreography Vault', icon: '🎬', path: 'videos' },
  calendar: { label: 'Master Schedule', icon: '🗓️', path: 'calendar' }
};

// The pages this show turns on, in the show's order.
export const TAB_INFO = Object.fromEntries(
  SHOW.tabs.filter((key) => ALL_TABS[key]).map((key) => [key, ALL_TABS[key]])
);
export const DEFAULT_TAB = Object.keys(TAB_INFO)[0];

// Browser-storage key for this show, e.g. storageKey("rehearsals") -> "<storagePrefix>_rehearsals".
export const storageKey = (name) => `${SHOW.storagePrefix}_${name}`;
