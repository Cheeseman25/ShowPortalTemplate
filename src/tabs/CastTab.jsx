// #cast: mystery reveal cast cards with search and category filters.

import { SHOW } from "../config";

export function CastTab({ ctx }) {
  const { activeTab, actorList, isLoadingCast, castError, selectedCategoryFilter, setSelectedCategoryFilter, castFilterQuery, setCastFilterQuery, revealedCardIds, rehearsals, loadLiveCast, openCelebration, revealAllRoles, resetHiddenRoles, availableCategories, filteredActorCards, allRevealed } = ctx;

  return (
    <>
      {activeTab === 'cast' && (
        <div className="space-y-6">
          {SHOW.castNotice && (
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-primary-950/60 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-900/80 border border-purple-400/40 flex items-center justify-center text-2xl shrink-0 shadow-lg">
                  ✨
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-purple-950 text-purple-300 px-2.5 py-0.5 rounded border border-purple-700/60">
                    Casting & Role Assignment Notice
                  </span>
                  <h3 className="font-cinzel font-bold text-white text-base md:text-lg mt-1">
                    Cast & Ensemble Assignments
                  </h3>
                  <p className="text-xs md:text-sm text-purple-100/90 mt-1.5 leading-relaxed font-medium">
                    {SHOW.castNotice}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border-l-4 border-l-primary-400">
            <div className="flex items-center gap-3">
              <div className="text-2xl shrink-0">🎁</div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Mystery Reveal Cards
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h4>
                <p className="text-xs text-slate-300">
                  Roles and categories are completely hidden until tapped! Or click <strong>Reveal All Roles</strong> to expose everyone.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allRevealed ? (
                <button
                  onClick={resetHiddenRoles}
                  className="bg-amber-950/90 hover:bg-amber-900 text-amber-300 text-xs font-bold px-3.5 py-2 rounded-xl border border-amber-600/80 flex items-center gap-1.5 transition shadow-lg shadow-amber-950/40"
                >
                  <span>🔒</span>
                  <span>Re-hide All Roles</span>
                </button>
              ) : (
                <button
                  onClick={revealAllRoles}
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
                >
                  <span>🔓</span>
                  <span>Reveal All Roles</span>
                </button>
              )}

              <button
                onClick={loadLiveCast}
                disabled={isLoadingCast}
                className="bg-slate-800 hover:bg-slate-700 text-primary-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-primary-800 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <span className={isLoadingCast ? 'animate-spin' : ''}>↻</span>
                <span>{isLoadingCast ? 'Fetching...' : 'Refresh Cast'}</span>
              </button>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="Search performer or character..."
                value={castFilterQuery}
                onChange={(e) => setCastFilterQuery(e.target.value)}
                className="w-full bg-slate-950/70 border border-primary-800/70 rounded-xl px-3.5 py-2 text-xs text-primary-100 placeholder-slate-400 focus:outline-none focus:border-primary-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                    selectedCategoryFilter === cat 
                      ? 'bg-primary-600 text-white shadow-md' 
                      : 'bg-slate-950/80 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? 'All Cast (A-Z)' : cat}
                </button>
              ))}
            </div>
          </div>

          {isLoadingCast && actorList.length === 0 ? (
            <div className="glass-card p-12 text-center text-primary-300 rounded-3xl">
              <div className="text-4xl animate-bounce mb-3">{SHOW.icon}</div>
              <p className="font-cinzel text-lg">Fetching Latest Cast...</p>
            </div>
          ) : castError && actorList.length === 0 ? (
            <div className="glass-card p-8 text-center text-amber-300 rounded-3xl">
              <p className="font-bold">{castError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActorCards.map((item) => {
                const isRevealed = revealedCardIds.includes(item.id);
                const isEnsemble = item.isFeaturedEnsembleOrChorus;

                let badgeClass = 'bg-slate-800/80 text-slate-400 border-slate-700';
                let cardBorderClass = 'border-primary-500/20 hover:border-primary-400';
                let badgeLabel = '🎭 Cast Member';
                let icon = SHOW.icon;

                if (isRevealed) {
                  badgeLabel = item.category || (isEnsemble ? 'Ensemble' : 'Lead');
                  if (isEnsemble) {
                    badgeClass = 'bg-purple-950/80 text-purple-300 border-purple-800/80';
                    cardBorderClass = 'border-purple-500/40 bg-purple-950/20 hover:border-purple-400';
                    icon = '✨';
                  } else {
                    badgeClass = 'bg-primary-950 text-primary-300 border-primary-800';
                    cardBorderClass = 'border-primary-500/30 hover:border-primary-400';
                    icon = '🎭';
                  }
                }

                return (
                  <div 
                    key={item.id}
                    onClick={() => openCelebration(item)}
                    className={`glass-card p-5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-200 transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary-500/20 active:scale-95 group ${cardBorderClass}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border transition ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                        <span className="text-sm group-hover:scale-125 transition-transform">
                          {isRevealed ? icon : '🎁'}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold font-cinzel text-white group-hover:text-primary-200 transition-colors tracking-wide leading-tight mt-1">
                        {item.actorName}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                        Assigned Role:
                      </div>
                      {isRevealed ? (
                        <div className="text-sm font-extrabold text-primary-300 group-hover:text-primary-100 flex items-center gap-1.5 animate-in fade-in duration-300">
                          <span>❄</span>
                          <span className="leading-snug">{item.role}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-300 bg-slate-900/80 border border-slate-700/80 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 mt-0.5 group-hover:border-primary-500 group-hover:text-primary-300 transition-colors">
                          <span>🎁</span>
                          <span>Tap card to reveal role!</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
