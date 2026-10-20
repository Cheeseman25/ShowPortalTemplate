// #calendar: live Google Calendar feed grouped by month.

import { CALENDAR_ID } from "../config";
import { renderWithLinks } from "../lib/links";
import { trackAnalyticsEvent } from "../lib/analytics";

export function CalendarTab({ ctx }) {
  const { activeTab, rehearsals, calendarEvents, isLoadingCalendar, calendarSearch, setCalendarSearch, calendarViewMode, setCalendarViewMode, fetchCalendarEvents, openCalendarEventDetails, groupedCalendarEvents } = ctx;

  return (
    <>
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-primary-500/20 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-primary-900/60">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-primary-400 font-bold bg-primary-950 px-2.5 py-1 rounded-full border border-primary-800">
                  Live Production Schedule
                </span>
                <h3 className="text-2xl font-bold font-cinzel text-white mt-1.5">Rehearsal & Performance Calendar</h3>
                <p className="text-xs md:text-sm text-slate-300 mt-1">
                  Direct schedule feed showing all scheduled rehearsals, calls, and performance dates. Tap any event to view full details.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {CALENDAR_ID && (
                  <a
                    href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(CALENDAR_ID)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-primary-500/40 text-primary-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-md hover:border-primary-400"
                  >
                    <svg className="w-4 h-4 fill-current text-primary-400" viewBox="0 0 24 24">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                    </svg>
                    <span>+ Add to Google Calendar</span>
                  </a>
                )}

                {CALENDAR_ID && (
                  <a
                    href={`webcal://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`}
                    className="flex items-center gap-2 bg-gradient-to-r from-accent-600 to-primary-500 hover:from-accent-500 hover:to-primary-400 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl transition shadow-lg shadow-primary-500/20"
                  >
                    <svg className="w-4 h-4 fill-current text-slate-950" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-1.09 1.74-.95 2.77.99.08 2.04-.52 2.68-1.27z"/>
                    </svg>
                    <span>Subscribe on iPhone / Mac</span>
                  </a>
                )}

                <button
                  onClick={fetchCalendarEvents}
                  disabled={isLoadingCalendar}
                  className="bg-slate-800 hover:bg-slate-700 text-primary-300 text-xs font-bold px-3 py-2.5 rounded-xl border border-primary-800 flex items-center gap-1.5 transition disabled:opacity-50"
                  title="Sync calendar events now"
                >
                  <span className={isLoadingCalendar ? 'animate-spin' : ''}>↻</span>
                  <span>Sync</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div className="w-full md:w-80">
                <input
                  type="text"
                  placeholder="Search events, scenes, or locations..."
                  value={calendarSearch}
                  onChange={(e) => setCalendarSearch(e.target.value)}
                  className="w-full bg-slate-950/70 border border-primary-800/70 rounded-xl px-3.5 py-2 text-xs text-primary-100 placeholder-slate-400 focus:outline-none focus:border-primary-400"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-primary-900/80 w-full md:w-auto justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarViewMode('next8');
                    trackAnalyticsEvent('calendar_view_mode_change', { mode: 'next8' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    calendarViewMode === 'next8'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚡ Next 8 Events</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarViewMode('full');
                    trackAnalyticsEvent('calendar_view_mode_change', { mode: 'full' });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    calendarViewMode === 'full'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🗓 Full Season Run ({calendarEvents.length})</span>
                </button>
              </div>
            </div>

            {isLoadingCalendar && calendarEvents.length === 0 ? (
              <div className="p-12 text-center text-primary-300">
                <div className="text-3xl animate-bounce mb-2">🗓</div>
                <p className="font-cinzel text-sm">Syncing live calendar schedule...</p>
              </div>
            ) : Object.keys(groupedCalendarEvents).length > 0 ? (
              <div className="space-y-6">
                {Object.keys(groupedCalendarEvents).map(monthYear => (
                  <div key={monthYear} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-cinzel font-bold text-sm tracking-wider text-primary-300 uppercase">
                        {monthYear}
                      </h4>
                      <div className="flex-1 border-t border-primary-900/60"></div>
                    </div>

                    <div className="grid gap-3">
                      {groupedCalendarEvents[monthYear].map(evt => {
                        const start = new Date(evt.startTime);
                        const end = new Date(evt.endTime);

                        const timeFormatted = evt.isAllDay
                          ? 'All Day'
                          : `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

                        const hasMeet = Boolean(evt.meetLink || (evt.location && evt.location.includes('meet.google.com')) || (evt.description && evt.description.includes('meet.google.com')));

                        return (
                          <div
                            key={evt.id}
                            onClick={() => openCalendarEventDetails(evt)}
                            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-primary-400/60 hover:bg-slate-900/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                          >
                            <div className="flex items-start sm:items-center gap-4">
                              <div className="text-center bg-gradient-to-b from-primary-950 to-slate-900 border border-primary-700/60 px-3.5 py-2 rounded-xl shrink-0 min-w-[64px] group-hover:border-primary-400 transition">
                                <div className="text-[10px] uppercase font-bold text-primary-400">
                                  {start.toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                                <div className="text-xl font-black text-white font-cinzel leading-none my-1">
                                  {start.toLocaleDateString('en-US', { day: 'numeric' })}
                                </div>
                                <div className="text-[9px] uppercase font-semibold text-slate-400">
                                  {start.toLocaleDateString('en-US', { month: 'short' })}
                                </div>
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h4 className="text-base font-bold text-white font-cinzel leading-snug group-hover:text-primary-300 transition-colors">
                                    {evt.title}
                                  </h4>
                                  {hasMeet && (
                                    <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600/80 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                                      📹 Google Meet
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                                  <span className="text-primary-300 font-semibold flex items-center gap-1">
                                    ⏰ {timeFormatted}
                                  </span>
                                  {evt.location && (
                                    <span className="text-slate-300 flex items-center gap-1">
                                      📍 {renderWithLinks(evt.location)}
                                    </span>
                                  )}
                                </div>
                                {evt.description && (
                                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                                    {renderWithLinks(evt.description)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="self-end sm:self-center shrink-0">
                              <span className="text-xs font-bold text-primary-400/80 group-hover:text-primary-200 transition flex items-center gap-1 bg-slate-900/80 group-hover:bg-primary-950/80 border border-slate-700 group-hover:border-primary-500/50 px-3 py-1.5 rounded-xl">
                                <span>Details</span>
                                <span>→</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {calendarViewMode === 'next8' && calendarEvents.length > 8 && !calendarSearch && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarViewMode('full');
                        trackAnalyticsEvent('calendar_view_mode_change', { mode: 'full' });
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-primary-300 hover:text-white border border-primary-800/80 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md"
                    >
                      View All Remaining {calendarEvents.length - 8} Season Events & Performances ↓
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">
                  {calendarEvents.length === 0 
                    ? 'No upcoming calendar events found in feed.' 
                    : 'No events match your search.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
