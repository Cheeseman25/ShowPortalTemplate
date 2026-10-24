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
export const DIRECT_CAST_CSV_URL = SHOW.castCsvUrl;
export const GOOGLE_DRIVE_MUSIC_FOLDER_URL = SHOW.musicFolderUrl;
export const FALLBACK_TRACKS = SHOW.fallbackTracks || [];
export const INITIAL_CALL_TYPES = SHOW.callTypes;

// Every page the engine knows how to render. Each key is a #hash route.
const ALL_TABS = {
  callboard: { label: 'Call Board & Schedule', icon: '📅', path: 'callboard' },
  cast: { label: 'Cast Members', icon: '🎭', path: 'cast' },
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
