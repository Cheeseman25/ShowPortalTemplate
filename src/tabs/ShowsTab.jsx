// #shows: who is in which of the six shows. Four views over one table:
// Grid, By Show (full cast), By Performer (their shows), Together (shows shared by chosen performers).
// Reads the per-show cast tab as CSV from showsApiUrl (server route) or showsCsvUrl (published link).

import { SHOWS_SOURCE_URL, SHOW_SCHEDULE, noCache, storageKey } from "../config";
import { parseCsv, parseShowRows, indexAssignments, buildCharacterRows, togetherByShow } from "../lib/shows";

const { useState, useMemo, useEffect } = React;

// Cached copy so the page shows instantly on repeat visits, then refreshes.
const CACHE_KEY = 'shows_data_v2';
function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(CACHE_KEY)));
    if (saved && Array.isArray(saved.shows) && Array.isArray(saved.assignments)) return saved;
  } catch (e) {}
  return { shows: [], assignments: [] };
}

const MODES = [
  { id: 'grid', label: 'Grid' },
  { id: 'show', label: 'By Show' },
  { id: 'person', label: 'By Performer' },
  { id: 'together', label: 'Together' },
];

const chipBase = 'px-3 py-1.5 text-xs font-bold rounded-xl transition border';
const chipOn = 'bg-primary-600 text-white border-primary-500 shadow-md';
const chipOff = 'bg-slate-950/80 text-slate-300 hover:text-white border-slate-800';

// Week 1 and Week 2 show chips; onPick receives the show id.
function ShowChips({ shows, selected, onPick }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {[1, 2].map((week) => (
        <div key={week} className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mr-1">Week {week}</span>
          {shows.filter((s) => s.week === week).map((s) => (
            <button key={s.id} onClick={() => onPick(s.id)} className={`${chipBase} ${selected === s.id ? chipOn : chipOff}`}>
              <div>{s.label}</div>
              <div className="text-[10px] font-medium opacity-80">{s.date} {s.time}</div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// Clickable performer name (opens that performer's view).
function NameLink({ name, onOpen }) {
  return (
    <button onClick={() => onOpen(name)} className="text-left text-primary-200 hover:text-white underline-offset-2 hover:underline">
      {name}
    </button>
  );
}

export function ShowsTab({ ctx }) {
  const { activeTab } = ctx;
  const [data, setData] = useState(readCache);
  const [loadError, setLoadError] = useState('');
  const shows = data.shows;
  const { byShow, byPerson, people } = useMemo(() => indexAssignments(data.shows, data.assignments), [data]);

  // Fetches the sheet the first time the tab opens; keeps the cached copy if the fetch fails.
  useEffect(() => {
    if (activeTab !== 'shows' || !SHOWS_SOURCE_URL) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(noCache(SHOWS_SOURCE_URL));
        if (!res.ok) throw new Error('bad response');
        const parsed = parseShowRows(parseCsv(await res.text()), SHOW_SCHEDULE);
        if (parsed.shows.length === 0) throw new Error('no shows found');
        if (!cancelled) {
          setData(parsed);
          setLoadError('');
          try { localStorage.setItem(storageKey(CACHE_KEY), JSON.stringify(parsed)); } catch (e) {}
        }
      } catch (err) {
        if (!cancelled) setLoadError('Could not load the show casts. Try again later.');
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  const [mode, setMode] = useState('grid');
  const [pickedShow, setPickedShow] = useState('');
  const showId = pickedShow || shows[0]?.id || '';
  const setShowId = setPickedShow;
  const [person, setPerson] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [chosen, setChosen] = useState([]);
  const [togetherMode, setTogetherMode] = useState('all');
  const [togetherQuery, setTogetherQuery] = useState('');
  const [gridQuery, setGridQuery] = useState('');

  if (activeTab !== 'shows') return null;
  if (shows.length === 0) {
    return loadError
      ? <div className="glass-card p-6 text-center text-amber-300 rounded-2xl font-bold">{loadError}</div>
      : <div className="glass-card p-8 text-center text-primary-300 rounded-2xl">Loading show casts...</div>;
  }

  const openShow = (id) => { setShowId(id); setMode('show'); };
  const openPerson = (name) => { setPerson(name); setPersonQuery(''); setMode('person'); };
  const addChosen = (name) => { if (!chosen.includes(name)) setChosen([...chosen, name]); setTogetherQuery(''); };
  const removeChosen = (name) => setChosen(chosen.filter((n) => n !== name));
  const matches = (query) => people.filter((n) => query.trim() && n.toLowerCase().includes(query.trim().toLowerCase()));

  const gridQ = gridQuery.trim().toLowerCase();
  const nameHit = (name) => Boolean(gridQ) && name.toLowerCase().includes(gridQ);
  const characterRows = buildCharacterRows(data.assignments);
  const gridRows = gridQ
    ? characterRows.filter((c) => c.role.toLowerCase().includes(gridQ) || Object.values(c.byShow).some(nameHit))
    : characterRows;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} className={`${chipBase} ${mode === m.id ? chipOn : chipOff}`}>{m.label}</button>
        ))}
      </div>

      {mode === 'grid' && (
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <input
            type="text" placeholder="Filter by character or performer..." value={gridQuery} onChange={(e) => setGridQuery(e.target.value)}
            className="w-full sm:w-72 bg-slate-950/70 border border-primary-800/70 rounded-xl px-3.5 py-2 text-xs text-primary-100 placeholder-slate-400 focus:outline-none focus:border-primary-400"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th></th>
                  <th colSpan={3} className="px-1 pt-1 text-center text-[10px] uppercase tracking-widest text-slate-400 font-bold">Week 1</th>
                  <th colSpan={3} className="px-1 pt-1 text-center text-[10px] uppercase tracking-widest text-slate-400 font-bold">Week 2</th>
                </tr>
                <tr>
                  <th className="text-left p-2 text-slate-400 font-bold sticky left-0 bg-slate-900 z-10">Character</th>
                  {shows.map((s) => (
                    <th key={s.id} className="p-1 text-center">
                      <button onClick={() => openShow(s.id)} className="w-full min-w-[5.5rem] px-2 py-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-primary-400 leading-tight">
                        <div className="text-sm font-bold text-primary-100">{s.date}</div>
                        <div className="text-sm font-semibold text-slate-300">{s.time}</div>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridRows.map((c) => (
                  <tr key={c.row} className="border-t border-slate-800/80">
                    <td className="p-2 sticky left-0 bg-slate-900 z-10 font-bold text-primary-300 min-w-[7rem]">{c.role}</td>
                    {shows.map((s) => {
                      const name = c.byShow[s.id];
                      return (
                        <td key={s.id} className="p-1 text-center">
                          {name ? (
                            <button
                              onClick={() => openPerson(name)}
                              className={`w-full rounded-lg border px-1.5 py-1 leading-tight hover:border-primary-400 ${nameHit(name) ? 'bg-amber-900/50 border-amber-500/70 text-amber-100 font-bold' : 'bg-primary-900/70 border-primary-700/60 text-primary-100'}`}
                            >
                              {name}
                            </button>
                          ) : <span className="text-slate-700">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {gridRows.length === 0 && (
                  <tr><td colSpan={shows.length + 1} className="p-4 text-slate-400">No character or performer matches.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'show' && (
        <div className="space-y-4">
          <ShowChips shows={shows} selected={showId} onPick={setShowId} />
          <div className="glass-card rounded-2xl p-4">
            <h3 className="font-cinzel font-bold text-white mb-3">Cast <span className="text-xs text-slate-400 font-sans">({byShow[showId].length})</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {byShow[showId].map((p) => (
                <div key={p.name} className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                  <NameLink name={p.name} onOpen={openPerson} />
                  <div className="text-xs font-bold text-primary-300">{p.roles.join(' · ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'person' && (
        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text" placeholder="Search performer..." value={personQuery} onChange={(e) => setPersonQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-primary-800/70 rounded-xl px-3.5 py-2 text-xs text-primary-100 placeholder-slate-400 focus:outline-none focus:border-primary-400"
            />
            {personQuery.trim() && (
              <div className="absolute z-20 mt-1 w-full glass-card rounded-xl border border-primary-800 max-h-56 overflow-y-auto">
                {matches(personQuery).map((n) => (
                  <button key={n} onClick={() => openPerson(n)} className="block w-full text-left px-3 py-2 text-xs text-primary-100 hover:bg-slate-800">{n}</button>
                ))}
                {matches(personQuery).length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No match.</div>}
              </div>
            )}
          </div>

          {person ? (
            <div className="glass-card rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-cinzel font-bold text-white text-xl">{person}</h3>
              </div>
              {[1, 2].map((week) => (
                <div key={week}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">Week {week}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {shows.filter((s) => s.week === week).map((s) => {
                      const roles = byPerson[person][s.id];
                      return (
                        <button
                          key={s.id} onClick={() => openShow(s.id)}
                          className={`text-left rounded-xl border px-3 py-2 ${roles ? 'bg-primary-900/60 border-primary-600/70' : 'bg-slate-950/40 border-slate-800 opacity-50'}`}
                        >
                          <div className="text-sm font-bold text-white">{s.label}</div>
                          <div className="text-[11px] text-slate-400">{s.date} {s.time}</div>
                          <div className="text-xs font-bold text-primary-300 mt-1">{roles ? roles.join(', ') : 'Not in this show'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setChosen([person]); setTogetherQuery(''); setMode('together'); }}
                className={`${chipBase} ${chipOff}`}
              >
                Who am I on stage with? →
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Search for a performer to see their shows.</p>
          )}
        </div>
      )}

      {mode === 'together' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text" placeholder="Add a performer..." value={togetherQuery} onChange={(e) => setTogetherQuery(e.target.value)}
                className="w-full bg-slate-950/70 border border-primary-800/70 rounded-xl px-3.5 py-2 text-xs text-primary-100 placeholder-slate-400 focus:outline-none focus:border-primary-400"
              />
              {togetherQuery.trim() && (
                <div className="absolute z-20 mt-1 w-full glass-card rounded-xl border border-primary-800 max-h-56 overflow-y-auto">
                  {matches(togetherQuery).filter((n) => !chosen.includes(n)).map((n) => (
                    <button key={n} onClick={() => addChosen(n)} className="block w-full text-left px-3 py-2 text-xs text-primary-100 hover:bg-slate-800">{n}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {chosen.map((n) => (
                <button key={n} onClick={() => removeChosen(n)} className={`${chipBase} ${chipOn}`} title="Remove">{n} ✕</button>
              ))}
              {chosen.length === 0 && <span className="text-xs text-slate-400">Pick one or more performers.</span>}
              {chosen.length > 0 && (
                <button onClick={() => setChosen([])} className="text-xs text-slate-400 hover:text-white underline">Clear</button>
              )}
            </div>
            {chosen.length > 1 && (
              <div className="flex gap-2">
                <button onClick={() => setTogetherMode('all')} className={`${chipBase} ${togetherMode === 'all' ? chipOn : chipOff}`}>All together</button>
                <button onClick={() => setTogetherMode('any')} className={`${chipBase} ${togetherMode === 'any' ? chipOn : chipOff}`}>Any of them</button>
              </div>
            )}
          </div>

          {chosen.length > 0 && (() => {
            const mode2 = chosen.length > 1 ? togetherMode : 'any';
            const result = togetherByShow(shows, byPerson, chosen, mode2);
            const hits = result.filter((r) => r.match).length;
            return (
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary-300">
                  {hits === 0 ? 'No shows match.' : `${hits} of ${shows.length} shows match.`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {result.map(({ show, present, match }) => (
                    <button
                      key={show.id} onClick={() => openShow(show.id)}
                      className={`text-left rounded-xl border px-3 py-2 ${match ? 'bg-primary-900/60 border-primary-600/70' : 'bg-slate-950/40 border-slate-800 opacity-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{show.label} <span className="text-[10px] text-slate-400">W{show.week}</span></span>
                        <span className="text-xs font-bold text-primary-300">{present.length} of {chosen.length}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{show.date} {show.time}</div>
                      <div className="text-xs text-slate-200 mt-1">
                        {present.length ? present.map((n) => `${n} (${byPerson[n][show.id].join(', ')})`).join('; ') : 'None of them'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
