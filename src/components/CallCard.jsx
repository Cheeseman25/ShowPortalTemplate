// One rehearsal notice card on the Call Board (active or archived).

import { formatCallBoardDate } from "../lib/dates";
import { renderWithLinks } from "../lib/links";

export function renderCallCard(reh, isArchivedView, ctx) {
  const { isAdmin, openEditCall, toggleArchiveCall } = ctx;

  const isFullCast = (reh.type && reh.type.toLowerCase().includes('full cast')) || 
                     (Array.isArray(reh.calledRoles) && reh.calledRoles.some(r => r.toLowerCase().includes('full cast') || r.toLowerCase() === 'company'));
  const formattedDate = formatCallBoardDate(reh.date);

  return (
    <div 
      key={reh.id} 
      className={`glass-card p-6 rounded-2xl relative transition hover:border-primary-400/50 ${
        isArchivedView 
          ? 'opacity-80 border-l-4 border-l-slate-500 bg-slate-950/70' 
          : isFullCast ? 'border-l-4 border-l-primary-400' : 'border-l-4 border-l-amber-400'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700/50 pb-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
              isArchivedView
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : isFullCast 
                  ? 'bg-primary-950 text-primary-300 border border-primary-800' 
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
            }`}>
              {reh.type}
            </span>

            {isArchivedView && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded">
                📦 Archived
              </span>
            )}

            {reh.location && (
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                📍 {renderWithLinks(reh.location)}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white font-cinzel">
            {renderWithLinks(reh.title || 'Rehearsal Call')}
          </h3>
        </div>

        {(formattedDate || reh.time) && (
          <div className="bg-slate-900/90 border border-primary-900 px-4 py-2 rounded-xl text-left md:text-right shrink-0">
            {formattedDate && (
              <div className="text-sm font-black text-primary-300">
                {formattedDate}
              </div>
            )}
            {reh.time && <div className="text-xs text-slate-300 font-semibold">{reh.time}</div>}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-primary-400 font-bold mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">👥 Called Performers:</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {Array.isArray(reh.calledRoles) ? `${reh.calledRoles.length} called` : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
            {Array.isArray(reh.calledRoles) && reh.calledRoles.length > 0 ? (
              reh.calledRoles.map((roleTag, i) => (
                <span 
                  key={i} 
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-primary-500/20 text-primary-200 border-primary-500/40"
                >
                  {roleTag}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic text-xs">No specific performers selected.</span>
            )}
          </div>
        </div>

        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1.5">
            <span>🎭</span> Working Scenes & Music:
          </div>
          {Array.isArray(reh.focusScenes) && reh.focusScenes.length > 0 ? (
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
              {reh.focusScenes.map((sc, i) => (
                <li key={i}><span className="font-semibold text-slate-200">{renderWithLinks(sc)}</span></li>
              ))}
            </ul>
          ) : (
            <span className="text-slate-400 italic text-xs">General rehearsal / blocking.</span>
          )}
        </div>
      </div>

      {reh.notes && (
        <div className="mt-3 text-xs text-primary-200/90 bg-primary-950/30 border border-primary-800/40 p-2.5 rounded-lg flex items-start gap-2">
          <span className="text-primary-400 font-bold">📝 Note:</span>
          <span className="leading-relaxed">{renderWithLinks(reh.notes)}</span>
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={() => openEditCall(reh)}
            className="text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1">
            ✏️ Edit Call
          </button>

          <button
            type="button"
            onClick={() => toggleArchiveCall(reh)}
            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
            {reh.isArchived ? '🔄 Restore to Active' : '📦 Archive Notice'}
          </button>
        </div>
      )}
    </div>
  );
}
