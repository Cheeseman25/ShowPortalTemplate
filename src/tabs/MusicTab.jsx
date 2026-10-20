// #music: Drive rehearsal tracks by folder, player, downloads, YouTube playlist.

import { YOUTUBE_REHEARSAL_PLAYLIST_ID, GOOGLE_DRIVE_MUSIC_FOLDER_URL, SHOW, storageKey } from "../config";

export function MusicTab({ ctx }) {
  const { activeTab, musicTracks, activeTrackIndex, setActiveTrackIndex, isLoadingMusic, musicTabSubView, setMusicTabSubView, folderCategories, folderNames, currentFolderTracks, fetchMusicLibrary, currentTrack, selectTrack } = ctx;

  return (
    <>
      {activeTab === 'music' && (
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-l-primary-400">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary-400 bg-primary-950 px-2.5 py-1 rounded-full border border-primary-800">
                Official Rehearsal Audio Vault
              </span>
              <h3 className="text-xl font-bold font-cinzel text-white mt-1.5">Show Music & Guide Vocals</h3>
              <p className="text-xs text-slate-300">
                Direct streaming audio with full scrub controls and downloads.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {GOOGLE_DRIVE_MUSIC_FOLDER_URL && (
                <a
                  href={GOOGLE_DRIVE_MUSIC_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-primary-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-primary-800 transition flex items-center gap-2 shadow-md"
                >
                  <span>Open Drive Folder ↗</span>
                </a>
              )}

              <button
                onClick={() => {
                  localStorage.removeItem(storageKey('music_tracks'));
                  fetchMusicLibrary();
                }}
                disabled={isLoadingMusic}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span className={isLoadingMusic ? 'animate-spin' : ''}>↻</span>
                <span>Sync Folder</span>
              </button>
            </div>
          </div>

          {/* Dynamic Multi-Folder Switcher */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-primary-900/80 w-fit">
            {folderNames.map(folder => {
              const count = folderCategories[folder]?.length || 0;
              const isSelected = musicTabSubView === folder;
              return (
                <button
                  key={folder}
                  type="button"
                  onClick={() => {
                    setMusicTabSubView(folder);
                    const firstInFolder = folderCategories[folder]?.[0];
                    if (firstInFolder) {
                      setActiveTrackIndex(musicTracks.indexOf(firstInFolder));
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🎧 {folder}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                    isSelected 
                      ? 'bg-primary-950/80 border-primary-400/50 text-primary-200' 
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {YOUTUBE_REHEARSAL_PLAYLIST_ID && (
              <button
                type="button"
                onClick={() => setMusicTabSubView('youtube')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  musicTabSubView === 'youtube'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>YouTube Stream</span>
              </button>
            )}
          </div>

          {musicTabSubView !== 'youtube' && !currentTrack && (
            <div className="glass-card p-8 text-center text-slate-400 rounded-3xl">
              No rehearsal tracks yet. Add audio files to the show's Drive music folder, then press Sync Folder.
            </div>
          )}

          {musicTabSubView !== 'youtube' && currentTrack && (
            <div className="space-y-4">
              {/* Active Player Card */}
              <div className="glass-card p-6 rounded-3xl border border-primary-400/50 shadow-2xl relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-950/95">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary-900/60 pb-5 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-widest text-primary-400 font-extrabold bg-primary-950 px-2 py-0.5 rounded border border-primary-800">
                        STREAMING AUDIO
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {currentTrack.category}
                      </span>
                    </div>
                    <h3 className="text-2xl font-extrabold font-cinzel text-white leading-tight">
                      {currentTrack.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {currentTrack.filename}
                    </p>
                  </div>

                  <a
                    href={currentTrack.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 hover:bg-slate-800 text-primary-300 px-4 py-2.5 rounded-xl border border-primary-900 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center shadow-md"
                  >
                    <span>⬇ Download Audio</span>
                  </a>
                </div>

                <div className="w-full bg-slate-950/95 rounded-2xl p-2.5 border border-primary-500/40 overflow-hidden shadow-2xl">
                  <iframe
                    src={currentTrack.previewUrl}
                    width="100%"
                    height="180"
                    allow="autoplay"
                    className="w-full rounded-xl border-0 block"
                    title={currentTrack.title}
                  ></iframe>
                </div>
              </div>

              {/* Scoped Track List */}
              <div className="glass-card p-5 rounded-3xl border border-primary-500/20">
                <div className="flex items-center justify-between pb-3 border-b border-primary-950 mb-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>{musicTabSubView} Tracks ({currentFolderTracks.length})</span>
                  <span>Action</span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {currentFolderTracks.map((track, idx) => {
                    const globalIdx = musicTracks.indexOf(track);
                    const isActive = globalIdx === activeTrackIndex;

                    return (
                      <div
                        key={track.id || idx}
                        onClick={() => selectTrack(globalIdx)}
                        className={`py-3.5 px-3 rounded-2xl transition flex items-center justify-between gap-4 cursor-pointer group ${
                          isActive ? 'bg-primary-950/60 border border-primary-800/60' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${
                            isActive 
                              ? 'bg-primary-500 text-slate-950 font-black' 
                              : 'bg-slate-900 border border-slate-800 text-primary-400 group-hover:border-primary-500'
                          }`}>
                            {idx + 1}
                          </div>

                          <div>
                            <h4 className={`text-sm font-bold font-cinzel leading-snug transition ${
                              isActive ? 'text-primary-300' : 'text-white group-hover:text-primary-200'
                            }`}>
                              {track.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {track.filename}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTrack(globalIdx);
                            }}
                            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${
                              isActive
                                ? 'bg-primary-500 text-slate-950 font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-primary-300 border border-slate-700'
                            }`}
                          >
                            <span>{isActive ? 'Selected' : 'Load Track'}</span>
                          </button>

                          <a
                            href={track.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-400 hover:text-white p-1.5"
                            title="Download"
                          >
                            ⬇
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {musicTabSubView === 'youtube' && (
            <div className="glass-card rounded-3xl overflow-hidden p-3 md:p-5 border border-primary-500/20 shadow-2xl">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/videoseries?list=${YOUTUBE_REHEARSAL_PLAYLIST_ID}`}
                  title={SHOW.playlistTitle}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
