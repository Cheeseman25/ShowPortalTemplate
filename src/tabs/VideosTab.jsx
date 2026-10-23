// #videos: Choreography & blocking videos.
// Lists the YouTube playlist through the Data API so entries added in YouTube appear
// without a code change. Falls back to the plain playlist embed if no key is set or the call fails.

import { SHOW, YOUTUBE_CHOREO_PLAYLIST_ID, YOUTUBE_API_KEY } from "../config";

// Pagination cap: 10 pages x 50 items = 500 entries, which bounds quota use and response size.
const MAX_PAGES = 10;
const PAGE_SIZE = 50;

// YouTube video IDs are 11 characters from this set. Anything else is rejected before it reaches a URL.
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

// Titles YouTube gives to entries it has hidden or removed.
const HIDDEN_TITLES = ["Private video", "Deleted video"];

// Fetches every playlist entry (up to MAX_PAGES) and returns [{ id, title, thumb }].
// Returns null on any failure so the caller can fall back to the embed.
async function fetchPlaylistVideos(playlistId, apiKey) {
  try {
    const videos = [];
    let pageToken = "";
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        part: "snippet",
        maxResults: String(PAGE_SIZE),
        playlistId,
        key: apiKey,
      });
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
      if (!res.ok) return null;
      const data = await res.json();

      for (const entry of data.items || []) {
        const snippet = entry.snippet || {};
        const id = snippet.resourceId && snippet.resourceId.videoId;
        // Skip entries without a valid ID or that YouTube has hidden.
        if (!id || !VIDEO_ID_PATTERN.test(id) || HIDDEN_TITLES.includes(snippet.title)) continue;
        const thumbs = snippet.thumbnails || {};
        const thumb = (thumbs.medium || thumbs.default || {}).url || "";
        videos.push({ id, title: snippet.title || "Untitled video", thumb });
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
    return videos;
  } catch (err) {
    // Safe default: null tells the page to show the plain embed instead.
    return null;
  }
}

// Page section for the Choreography Vault. Renders only when its tab is active.
export function VideosTab({ ctx }) {
  const { activeTab } = ctx;

  // "idle" until the tab opens, then "loading", then "ready" or "failed".
  const [status, setStatus] = React.useState("idle");
  const [videos, setVideos] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");

  // Set once the load starts, so the fetch runs once per visit and is never cancelled by a re-render.
  const startedRef = React.useRef(false);

  // Load the playlist only when this tab is open, so quota is spent only when someone looks at it.
  React.useEffect(() => {
    if (activeTab !== "videos" || startedRef.current || !YOUTUBE_CHOREO_PLAYLIST_ID || !YOUTUBE_API_KEY) return;
    startedRef.current = true;

    setStatus("loading");
    fetchPlaylistVideos(YOUTUBE_CHOREO_PLAYLIST_ID, YOUTUBE_API_KEY).then((list) => {
      if (list === null) {
        setStatus("failed");
        return;
      }
      setVideos(list);
      setSelectedId(list.length ? list[0].id : "");
      setStatus("ready");
    });
  }, [activeTab]);

  if (activeTab !== "videos") return null;

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary-400 bg-primary-950 px-2.5 py-1 rounded-full border border-primary-800">
            Video Staging Vault
          </span>
          <h3 className="text-xl font-bold font-cinzel text-white mt-1.5">Choreography & Blocking Videos</h3>
          <p className="text-xs text-slate-300">
            Instructional dance videos, stage blocking, and combinations recorded during rehearsals.
          </p>
        </div>
      </div>

      {!YOUTUBE_CHOREO_PLAYLIST_ID ? (
        <ComingSoon />
      ) : status === "ready" && videos.length > 0 ? (
        <VideoPicker videos={videos} selectedId={selectedId} onSelect={setSelectedId} title={SHOW.videosPlaylistTitle} />
      ) : status === "ready" ? (
        <div className="glass-card p-12 text-center rounded-3xl border border-primary-500/20">
          <p className="text-sm text-slate-300">No choreography videos have been added to the playlist yet.</p>
        </div>
      ) : !YOUTUBE_API_KEY || status === "failed" ? (
        <PlaylistEmbed title={SHOW.videosPlaylistTitle} />
      ) : (
        <div className="glass-card p-12 text-center rounded-3xl border border-primary-500/20">
          <p className="text-sm text-slate-300">Loading choreography videos...</p>
        </div>
      )}
    </div>
  );
}

// Thumbnail grid plus the selected video. The grid is the direct parent of the cards.
function VideoPicker({ videos, selectedId, onSelect, title }) {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-3xl overflow-hidden p-3 md:p-5 border border-primary-500/20 shadow-2xl">
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${selectedId}`}
            title={title || "Choreography video"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => onSelect(video.id)}
            aria-pressed={video.id === selectedId}
            className={`glass-card rounded-2xl p-2 text-left border ${video.id === selectedId ? "border-primary-400" : "border-primary-500/20"}`}
          >
            {video.thumb && (
              <img src={video.thumb} alt="" loading="lazy" className="w-full aspect-video object-cover rounded-xl" />
            )}
            <span className="block mt-2 text-sm font-semibold text-white">{video.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Plain playlist embed. Used when the API key is missing or the API call fails.
function PlaylistEmbed({ title }) {
  return (
    <div className="glass-card rounded-3xl overflow-hidden p-3 md:p-5 border border-primary-500/20 shadow-2xl">
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/videoseries?list=${YOUTUBE_CHOREO_PLAYLIST_ID}`}
          title={title || "Choreography videos"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
      <p className="text-[11px] text-slate-400 mt-3 text-center">
        Videos are pulled live from the YouTube playlist. Use the playlist controls to pick a video.
      </p>
    </div>
  );
}

// Shown when no playlist is configured.
function ComingSoon() {
  return (
    <div className="glass-card p-12 text-center rounded-3xl border border-primary-500/20">
      <div className="w-16 h-16 bg-primary-950 border border-primary-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
        🎬
      </div>
      <h3 className="text-xl font-bold font-cinzel text-white">Choreography Videos Coming Soon</h3>
      <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
        {SHOW.exampleNumbers.length > 0 ? (
          <>As our choreographers and directors stage numbers like {SHOW.exampleNumbers.map((n, i, all) => (
            <React.Fragment key={n}>{i > 0 && (i === all.length - 1 ? ', and ' : ', ')}<em>{n}</em></React.Fragment>
          ))}, rehearsal breakdown videos will be linked here for home practice.</>
        ) : (
          <>As our choreographers and directors stage each number, rehearsal breakdown videos will be linked here for home practice.</>
        )}
      </p>
    </div>
  );
}
