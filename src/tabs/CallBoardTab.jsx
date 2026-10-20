// #callboard: rehearsal notices from the Sheet, filter, archive vault, admin add.

import { renderCallCard } from "../components/CallCard";

export function CallBoardTab({ ctx }) {
  const { activeTab, rehearsals, backendStatus, callSearchRole, setCallSearchRole, showArchivedSection, setShowArchivedSection, isAdmin, openAddCall, activeCalls, archivedCalls } = ctx;

  return (
    <>
      {activeTab === 'callboard' && (
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-auto flex-1">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Filter by actor or character role..."
                  value={callSearchRole}
                  onChange={(e) => setCallSearchRole(e.target.value)}
                  className="w-full bg-slate-950/70 border border-primary-800/70 rounded-xl px-4 py-2.5 text-sm text-primary-100 placeholder-slate-400 focus:outline-none focus:border-primary-400"
                />
                {callSearchRole && (
                  <button 
                    onClick={() => setCallSearchRole('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white">
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span>💡 Active notices are displayed newest first. Past calls stay archived below.</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  ● {backendStatus}
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={openAddCall}
                  className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <span className="text-base font-black">+</span> Post New Rehearsal Call
                </button>
              </div>
            )}
          </div>

          {/* Active Rehearsal Notices */}
          <div className="grid gap-5">
            {activeCalls.map((reh) => renderCallCard(reh, false, ctx))}

            {activeCalls.length === 0 && (
              <div className="glass-card p-12 text-center rounded-2xl">
                <div className="text-4xl mb-3">📋</div>
                <h4 className="text-lg font-bold font-cinzel text-white">No Active Rehearsal Calls</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  All notices are either fulfilled or archived. Check the archive vault below or look for upcoming calls posted after rehearsals.
                </p>
              </div>
            )}
          </div>

          {/* COLLAPSIBLE ARCHIVED VAULT BANNER */}
          {archivedCalls.length > 0 && (
            <div className="pt-4 border-t border-primary-900/40">
              <div className="glass-card rounded-2xl overflow-hidden border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowArchivedSection(!showArchivedSection)}
                  className="w-full px-5 py-3.5 bg-slate-900/90 hover:bg-slate-850 flex items-center justify-between text-left transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📦</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-200">
                          Archived Rehearsal Notices
                        </h4>
                        <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                          {archivedCalls.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Past calls kept for schedule history and attendance traceability
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-primary-400 flex items-center gap-1">
                    <span>{showArchivedSection ? 'Hide Archived' : 'View Archived'}</span>
                    <span className={`transform transition-transform duration-200 ${showArchivedSection ? 'rotate-180' : ''}`}>▼</span>
                  </span>
                </button>

                {showArchivedSection && (
                  <div className="p-4 bg-slate-950/70 border-t border-slate-800/80 space-y-4">
                    {archivedCalls.map((reh) => renderCallCard(reh, true, ctx))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
