// Top banner: artwork, language switcher and staff login/lock.

import { ARTWORK_URL, SHOW } from "../config";

export function Header({ ctx }) {
  const { currentLanguage, setShowLoginModal, isAdmin, triggerLanguageTranslation, handleLogout } = ctx;

  return (
    <>
      <header className="flex flex-col md:flex-row items-center justify-between gap-5 border-b border-primary-500/20 pb-6 mb-5">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {ARTWORK_URL && <div className="relative group shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent-400 to-primary-600 opacity-40 blur-md group-hover:opacity-75 transition duration-500"></div>
            <img 
              src={ARTWORK_URL} 
              alt={`${SHOW.title} Official Artwork`}
              className="relative h-20 md:h-24 w-auto max-w-[280px] sm:max-w-[340px] rounded-xl object-contain shadow-2xl border border-primary-400/40 bg-slate-950/80 p-1"
            />
          </div>}

          <div className="border-t sm:border-t-0 sm:border-l border-primary-700/50 pt-3 sm:pt-0 sm:pl-5">
            <span className="text-[11px] uppercase tracking-widest text-primary-300 font-extrabold bg-primary-950/90 px-3 py-1 rounded-full border border-primary-700/70 inline-block mb-1.5 shadow-sm">
              Production Portal & Call Board
            </span>
            <p className="text-xs md:text-sm text-primary-100/80 font-medium">
              Rehearsals • Live Cast & Characters • Music Vault • Schedule
            </p>
          </div>
        </div>

        {/* Language Controls + Staff Login */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950/90 border border-primary-700/80 p-1 rounded-xl text-xs shadow-md">
            <span className="text-slate-400 px-1 text-[11px]">🌐</span>
            {SHOW.languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => triggerLanguageTranslation(lang.code)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  currentLanguage === lang.code ? 'bg-primary-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold shadow-lg">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Director / Crew Admin
              <button 
                onClick={handleLogout}
                className="ml-2 text-emerald-400 hover:text-white underline text-xs">
                Lock
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 border border-primary-500/30 text-primary-200 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition shadow-md">
              <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Staff Login
            </button>
          )}
        </div>
      </header>
    </>
  );
}
