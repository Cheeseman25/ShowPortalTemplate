// Details overlay for a calendar event (Meet link, notes).

import { CALENDAR_ID } from "../config";
import { renderWithLinks } from "../lib/links";
import { trackAnalyticsEvent } from "../lib/analytics";

export function CalendarEventModal({ ctx }) {
  const { selectedCalendarEvent, setSelectedCalendarEvent } = ctx;

  return (
    <>
      {selectedCalendarEvent && (() => {
        const ev = selectedCalendarEvent;
        const start = new Date(ev.startTime);
        const end = new Date(ev.endTime);

        const timeStr = ev.isAllDay 
          ? 'All Day' 
          : `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

        const dateStr = start.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });

        let meetUrl = ev.meetLink || '';
        if (!meetUrl) {
          const fullText = (ev.location || '') + ' ' + (ev.description || '');
          const match = fullText.match(/https?:\/\/meet\.google\.com\/[a-zA-Z0-9_-]+/i);
          if (match) meetUrl = match[0];
        }

        return (
          <div 
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedCalendarEvent(null)}
          >
            <div 
              className="glass-card max-w-xl w-full p-6 md:p-8 rounded-3xl border border-primary-400/40 shadow-2xl relative animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedCalendarEvent(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest text-primary-400 font-extrabold bg-primary-950/90 border border-primary-700/60 px-3 py-1 rounded-full">
                  SCHEDULED EVENT
                </span>
                {ev.isAllDay && (
                  <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2.5 py-0.5 rounded-full">
                    ALL DAY
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-extrabold font-cinzel text-white leading-tight mb-2">
                {ev.title}
              </h2>

              <div className="bg-slate-900/90 border border-primary-900/80 rounded-2xl p-4 my-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-primary-200 font-bold">
                  <span>📅</span>
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                  <span>⏰</span>
                  <span>{timeStr}</span>
                </div>
                {ev.location && (
                  <div className="flex items-start gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    <span className="shrink-0 mt-0.5">📍</span>
                    <span className="leading-relaxed">{renderWithLinks(ev.location)}</span>
                  </div>
                )}
              </div>

              {meetUrl && (
                <div className="mb-4">
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAnalyticsEvent('join_google_meet_click', { event_title: ev.title })}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold py-3 px-4 rounded-2xl transition flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/50"
                  >
                    <span className="text-lg">📹</span>
                    <span>Join Google Meet Video Call ↗</span>
                  </a>
                </div>
              )}

              {ev.description ? (
                <div className="space-y-2 mb-6">
                  <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Event Details & Notes:
                  </h4>
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {renderWithLinks(ev.description)}
                  </div>
                </div>
              ) : (
                <div className="mb-6 text-xs text-slate-400 italic">
                  No additional notes provided for this calendar entry.
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-4 border-t border-slate-800">
                <a
                  href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(CALENDAR_ID)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackAnalyticsEvent('open_google_calendar_click', { event_title: ev.title })}
                  className="w-full sm:flex-1 bg-slate-900 hover:bg-slate-800 border border-primary-800 text-primary-300 hover:text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>🗓 Open in Google Calendar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedCalendarEvent(null)}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold px-6 py-2.5 rounded-xl text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
