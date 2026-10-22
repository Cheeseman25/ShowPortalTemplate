/**
 * calendarSync.gs  VERSION 4 (2026-10-21, branch calendar-sync)
 * STAGED; not deployed or tested in Apps Script yet.
 *
 * Writes call board details into EXISTING calendar events.
 *   - Each call is matched to the event on the same date whose time window overlaps it.
 *   - Several calls can land on one event; each gets its own labeled section.
 *   - Sections are rebuilt from the Sheet every sync, so nothing is duplicated or stale.
 *   - Event times and titles are never changed.
 *   - A call with no matching event is logged, NOT created (create-on-miss comes later,
 *     with the in-app prompt).
 *   - A time that can't be read is logged and skipped. No guessing.
 *
 * Privacy: only CHARACTER names are posted. Called performers are stored as
 * "Name (Character)" and only the character part is used. Notes stay off unless
 * SYNC_INCLUDE_NOTES is true.
 *
 * Hook points (Code.gs):
 *   saveRehearsalCall        -> syncRehearsalById(rowData[0])
 *   setRehearsalArchivedStatus -> syncRehearsalById(id)
 */

var SYNC_INCLUDE_NOTES = false;
var SYNC_DEFAULT_DURATION_MIN = 60;   // used when a call gives only a start time
var SYNC_MARKER = "[Call board: updates automatically]";

// ---------- entry points ----------

/** Re-sync the date of one call. Safe to call from the save/archive hooks. */
function syncRehearsalById(id) {
  var hit = getRehearsalCalls().filter(function(r) { return String(r.id) === String(id); });
  if (hit.length === 0) return { status: "error", message: "call not found: " + id };
  return syncDate_(hit[0].date);
}

/**
 * Called from the app after the user answers the prompt.
 *   choice = "attach": attach this call to eventId (an existing event on that date)
 *   choice = "create": create a new calendar event for this call's time
 */
function resolveCallChoice(id, choice, eventId) {
  var hit = getRehearsalCalls().filter(function(r) { return String(r.id) === String(id); });
  if (hit.length === 0) return { status: "error", message: "call not found: " + id };
  var call = hit[0];
  var day = dateAtMidnight_(call.date);
  var w = callWindow_(call, day);
  if (!w) return { status: "error", message: "time could not be read for this call" };

  try {
    var cal = CalendarApp.getCalendarById(getSetting("CALENDAR_ID"));
    if (choice === "attach") {
      var ev = cal.getEventById(eventId);
      if (!ev) return { status: "error", message: "event not found" };
      // Rebuild the event's text from every active call that overlaps it, plus this call.
      var active = [];
      getRehearsalCalls().forEach(function(r) {
        if (r.date !== call.date || r.isArchived) return;
        var cw = callWindow_(r, day);
        if (cw && (String(r.id) === String(id) || overlaps_(cw.start, cw.end, ev.getStartTime(), ev.getEndTime()))) active.push(cw);
      });
      active.sort(function(a, b) { return a.start - b.start; });
      ev.setDescription(buildDescription_(active));
      var locs = uniq_(active.map(function(x) { return x.call.location; }).filter(Boolean));
      if (locs.length === 1) ev.setLocation(locs[0]);
      return { status: "success", action: "attached", event: ev.getTitle() };
    }
    if (choice === "create") {
      var created = cal.createEvent(cleanTitle_(call.title), w.start, w.end,
                                    { location: call.location || "", description: buildDescription_([w]) });
      return { status: "success", action: "created", event: created.getTitle() };
    }
    return { status: "error", message: "unknown choice: " + choice };
  } catch (err) {
    Logger.log("resolveCallChoice error: " + err);
    return { status: "error", message: String(err) };
  }
}

/** Manual run: re-syncs every date on the call board. Run once after deploying. */
function syncAllRehearsalsToCalendar() {
  var dates = {};
  getRehearsalCalls().forEach(function(r) { if (r.date) dates[r.date] = true; });
  var lines = Object.keys(dates).sort().map(function(d) {
    var res = syncDate_(d);
    return d + ": " + res.status + (res.report ? "\n  " + res.report.join("\n  ") : (res.message ? " " + res.message : ""));
  });
  Logger.log(lines.join("\n"));
  return lines;
}

// ---------- core ----------

function syncDate_(dateStr) {
  try {
    var cal = CalendarApp.getCalendarById(getSetting("CALENDAR_ID"));
    if (!cal) throw new Error("Calendar not found: " + getSetting("CALENDAR_ID"));

    var day = dateAtMidnight_(dateStr);
    if (!day) return { status: "skipped", message: "bad date " + dateStr };
    var dayEnd = new Date(day.getTime() + 86400000);

    var report = [];
    var windows = [];
    getRehearsalCalls().forEach(function(r) {
      if (r.date !== dateStr) return;
      var w = callWindow_(r, day);
      if (w) windows.push(w);
      else report.push("SKIPPED, unreadable time: " + r.id + " \"" + r.title + "\" time=\"" + r.time + "\"");
    });

    var active = windows.filter(function(w) { return !w.call.isArchived; });
    var events = cal.getEvents(day, dayEnd);

    events.forEach(function(ev) {
      var evStart = ev.getStartTime(), evEnd = ev.getEndTime();
      var mine = active.filter(function(w) { return overlaps_(w.start, w.end, evStart, evEnd); });
      var desc = ev.getDescription() || "";

      if (mine.length) {
        mine.sort(function(a, b) { return a.start - b.start; });
        ev.setDescription(buildDescription_(mine));
        var locs = uniq_(mine.map(function(w) { return w.call.location; }).filter(Boolean));
        if (locs.length === 1) ev.setLocation(locs[0]);
        report.push("updated: \"" + ev.getTitle() + "\" " + fmtTime_(evStart) + "–" + fmtTime_(evEnd) +
                    " with " + mine.length + " call(s)");
      } else if (desc.indexOf(SYNC_MARKER) === 0) {
        // Previously filled by us, but no active call matches any more (archived or moved):
        // clear our section. Events without our marker are never touched.
        ev.setDescription("");
        report.push("cleared stale call board text: \"" + ev.getTitle() + "\"");
      }
    });

    var unmatched = [];
    active.forEach(function(w) {
      var hit = events.some(function(ev) { return overlaps_(w.start, w.end, ev.getStartTime(), ev.getEndTime()); });
      if (!hit) {
        report.push("NO MATCHING EVENT, not created: " + w.call.id + " \"" + w.call.title +
                    "\" " + fmtTime_(w.start) + "–" + fmtTime_(w.end));
        unmatched.push({ id: String(w.call.id), title: cleanTitle_(w.call.title),
                         startLabel: fmtTime_(w.start), endLabel: fmtTime_(w.end) });
      }
    });

    return {
      status: "success",
      report: report,
      unmatched: unmatched,
      events: unmatched.length ? events.map(function(ev) {
        return { id: ev.getId(), title: ev.getTitle(),
                 timeLabel: fmtTime_(ev.getStartTime()) + "–" + fmtTime_(ev.getEndTime()) };
      }) : []
    };
  } catch (err) {
    Logger.log("calendarSync error for " + dateStr + ": " + err);
    return { status: "error", message: String(err) };
  }
}

function callWindow_(r, dayMidnight) {
  // v3 sheet has StartTime and EndTime columns; fall back to a combined time string.
  var t = parseTimeRange_(r.startTime && r.endTime ? r.startTime + " - " + r.endTime : r.time);
  if (!t) return null;
  var start = new Date(dayMidnight.getTime() + t.startMin * 60000);
  var end = new Date(dayMidnight.getTime() + t.endMin * 60000);
  return { call: r, start: start, end: end };
}

function buildDescription_(windows) {
  var lines = [SYNC_MARKER];
  windows.forEach(function(w) {
    var c = w.call;
    lines.push("");
    lines.push(fmtTime_(w.start) + "–" + fmtTime_(w.end) + "  " + cleanTitle_(c.title));
    var roles = parseCommaList(c.calledRoles).map(function(entry) {
      var m = String(entry).match(/\(([^)]+)\)\s*$/);
      return m ? m[1].trim() : null;   // never post the performer name
    }).filter(Boolean);
    roles = uniq_(roles);
    if (roles.length) lines.push("Characters called: " + roles.join(", "));
    var focus = parseCommaList(c.focusScenes);
    if (focus.length) lines.push("Focus: " + focus.join(", "));
    if (SYNC_INCLUDE_NOTES && c.notes) lines.push(String(c.notes));
  });
  return lines.join("\n");
}

// ---------- time parsing ----------

/**
 * Accepts: "5:30PM - 6:00PM", "5:30-6:15 pm", "4pm-6pm", "4:00 PM", "18:30",
 * "4:00-6:00 pm", "6 PM", and Sheets' full Date strings ("Sat Dec 30 1899 18:30:00 GMT-0500 ...").
 * Returns { startMin, endMin } minutes after midnight, or null if unreadable.
 * If the start has no am/pm, it takes the end's ("5:30-6:15 pm" = 5:30 PM).
 */
function parseTimeRange_(s) {
  var raw = String(s == null ? "" : s).replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  if (!raw) return null;

  // Sheets date-cell form: take clock time from it
  if (/\d{4}\s+\d{1,2}:\d{2}/.test(raw) && /GMT|\(/.test(raw)) {
    var d0 = new Date(raw);
    if (isNaN(d0.getTime())) return null;
    var sm = d0.getHours() * 60 + d0.getMinutes();
    return { startMin: sm, endMin: sm + SYNC_DEFAULT_DURATION_MIN };
  }

  var parts = raw.split(/\s*(?:-|\bto\b)\s*/i);
  if (parts.length > 2) return null;

  var re = /^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?$|^(\d{1,2})(?::(\d{2}))?$/i;
  var parsed = parts.map(function(p) {
    var m = p.trim().match(re);
    if (!m) return null;
    if (m[1] !== undefined) return { h: +m[1], min: m[2] ? +m[2] : 0, mer: m[3].toLowerCase() };
    return { h: +m[4], min: m[5] ? +m[5] : 0, mer: null };
  });
  if (parsed.some(function(x) { return x === null; })) return null;

  var first = parsed[0], last = parsed[parsed.length - 1];
  if (first.min > 59 || last.min > 59) return null;

  var endMer = last.mer;
  var startMer = first.mer || (parsed.length === 2 ? endMer : null);

  var startMin = to24Min_(first.h, first.min, startMer);
  if (startMin === null) return null;

  var endMin;
  if (parsed.length === 2) {
    endMin = to24Min_(last.h, last.min, endMer || startMer);
    if (endMin === null) return null;
    // "11-1 pm" case: start inherited pm but is later than end, so it must be am
    if (!first.mer && startMin >= endMin && startMer) startMin -= 720;
    if (endMin <= startMin) return null;
  } else {
    endMin = startMin + SYNC_DEFAULT_DURATION_MIN;
  }
  if (startMin < 0 || endMin > 24 * 60) return null;
  return { startMin: startMin, endMin: endMin };
}

function to24Min_(h, min, mer) {
  if (mer) {
    if (h < 1 || h > 12) return null;
    if (mer === "p" && h < 12) h += 12;
    if (mer === "a" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  return h * 60 + min;
}

// ---------- helpers ----------

function dateAtMidnight_(dateStr) {
  var m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
}

function overlaps_(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function fmtTime_(d) {
  var h = d.getHours(), m = d.getMinutes();
  var ap = h >= 12 ? "PM" : "AM";
  var h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + (m ? ":" + ("0" + m).slice(-2) : "") + " " + ap;
}

function cleanTitle_(t) {
  return String(t || "Rehearsal").replace(/\s+/g, " ").trim();
}

function uniq_(arr) {
  return arr.filter(function(v, i, a) { return a.indexOf(v) === i; });
}
