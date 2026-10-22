// Shown after a call is saved when no calendar event matches its time.
// Lets the admin attach the call to an existing event on that date, or create a new one.

export function CalendarChoiceModal({ pending, onAttach, onCreate, onClose, busy }) {
  if (!pending) return null;
  const { call, events } = pending;
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full p-6 rounded-3xl border border-primary-500/50 shadow-2xl">
        <h3 className="text-lg font-bold font-cinzel text-white mb-1">No calendar event matches this call</h3>
        <p className="text-xs text-slate-300 mb-4">
          <span className="font-bold text-white">{call.title}</span> is {call.startLabel} – {call.endLabel} on {pending.dateLabel}.
          Attach it to one of the events already on that date, or create a new calendar invite for its time.
        </p>

        <div className="space-y-2 mb-4">
          {events.length === 0 && (
            <p className="text-xs text-slate-400">There are no calendar events on that date.</p>
          )}
          {events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              disabled={busy}
              onClick={() => onAttach(ev.id)}
              className="w-full text-left bg-slate-900 border border-slate-700 hover:border-primary-500 rounded-xl p-3 disabled:opacity-50"
            >
              <div className="text-sm font-bold text-white">Attach to: {ev.title}</div>
              <div className="text-[11px] text-slate-400">{ev.timeLabel}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={busy}
            className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white disabled:opacity-50">
            Decide later
          </button>
          <button type="button" onClick={onCreate} disabled={busy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50">
            Create new invite {call.startLabel} – {call.endLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
