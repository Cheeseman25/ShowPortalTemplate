// Role reveal overlay shown when a cast card is tapped.

import { ARTWORK_URL, SHOW } from "../config";
import { launchFanfareCelebration } from "../lib/celebration";
import { trackAnalyticsEvent } from "../lib/analytics";

export function CelebrationModal({ ctx }) {
  const { celebrationTarget, setCelebrationTarget, rehearsals } = ctx;

  return (
    <>
      {celebrationTarget && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setCelebrationTarget(null)}
        >
          <div 
            className="max-w-md w-full celebration-border p-1 rounded-3xl shadow-2xl relative animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-950/95 rounded-[22px] p-6 md:p-8 text-center flex flex-col items-center relative overflow-hidden">
              <button 
                onClick={() => setCelebrationTarget(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
              >
                ✕
              </button>

              {ARTWORK_URL && <div className="mb-4">
                <img 
                  src={ARTWORK_URL} 
                  alt={`${SHOW.title} Official Artwork`}
                  className="h-16 md:h-20 w-auto rounded-xl object-contain shadow-xl border border-primary-400/40 bg-slate-950/90 p-1"
                />
              </div>}

              <span className="text-[11px] uppercase tracking-widest text-primary-400 font-extrabold bg-primary-950/90 border border-primary-700/60 px-3 py-1 rounded-full mb-2">
                OFFICIAL PRODUCTION CASTING
              </span>

              <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
                Congratulations to
              </h4>

              <h2 className="text-3xl md:text-4xl font-extrabold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-accent-200 via-white to-primary-200 tracking-wide mt-1 mb-4 leading-tight">
                {celebrationTarget.actorName}
              </h2>

              <div className="w-full bg-gradient-to-r from-primary-950/80 via-slate-900 to-primary-950/80 border border-primary-500/40 p-4 rounded-2xl mb-4 shadow-inner">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-widest block mb-1">
                  Cast in the Role of
                </span>
                <span className="text-xl md:text-2xl font-cinzel font-black text-primary-300 block">
                  {celebrationTarget.role}
                </span>
                <div className="mt-2 inline-block text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2.5 py-0.5 rounded border border-slate-800">
                  {celebrationTarget.category || 'Company'}
                </div>
              </div>

              <p className="text-xs text-primary-200/80 italic mb-6 leading-relaxed">
                "Some people are worth melting for." ❄ Have a magical time in rehearsals!
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    launchFanfareCelebration();
                    trackAnalyticsEvent('replay_fanfare_click', { actor_name: celebrationTarget.actorName });
                  }}
                  className="w-full bg-gradient-to-r from-primary-500 via-accent-400 to-indigo-500 hover:from-primary-400 hover:to-indigo-400 text-slate-950 font-black py-2.5 rounded-xl text-xs md:text-sm shadow-lg shadow-primary-500/30 transition transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>🎺</span>
                  <span>Play Fanfare Again!</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCelebrationTarget(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-2.5 rounded-xl text-xs border border-slate-800 transition"
                >
                  Close Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
