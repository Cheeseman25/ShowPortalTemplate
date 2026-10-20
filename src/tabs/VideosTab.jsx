// #videos: placeholder for choreography and blocking videos.

import { SHOW, YOUTUBE_CHOREO_PLAYLIST_ID } from "../config";

export function VideosTab({ ctx }) {
  const { activeTab } = ctx;

  return (
    <>
      {activeTab === 'videos' && (
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

          {YOUTUBE_CHOREO_PLAYLIST_ID ? (
            <div className="glass-card rounded-3xl overflow-hidden p-3 md:p-5 border border-primary-500/20 shadow-2xl">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/videoseries?list=${YOUTUBE_CHOREO_PLAYLIST_ID}`}
                  title={SHOW.videosPlaylistTitle || "Choreography videos"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Videos are pulled live from the YouTube playlist. Use the playlist controls to pick a video.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </>
  );
}
