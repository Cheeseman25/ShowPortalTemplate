// Company logo, show/company line and licensing line.

import { LOGO_URL, SHOW } from "../config";

export function Footer({ ctx }) {
  return (
    <>
      <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-8 pb-4 flex flex-col items-center justify-center space-y-4">
        {LOGO_URL && <div className="relative group">
          <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-primary-500/25 to-accent-500/25 opacity-50 blur-md group-hover:opacity-100 transition duration-300"></div>
          <img 
            src={LOGO_URL} 
            alt={SHOW.company.logoAlt} 
            className="relative h-28 md:h-32 w-auto object-contain bg-slate-950/60 p-2.5 rounded-2xl border border-primary-500/30 shadow-xl"
          />
        </div>}
        <div>
          <p className="font-bold text-slate-300 text-sm tracking-wide">
            {SHOW.title} • {SHOW.company.name} • {SHOW.company.location}
          </p>
          <p className="mt-1 text-slate-500 text-[11px]">
            {SHOW.licenseLine}
          </p>
        </div>
      </footer>
    </>
  );
}
