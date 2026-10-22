// Time helpers for call board entries.
// The form stores start and end as "HH:MM" (24-hour) from <input type="time">.
// The sheet and backend use "5:30 PM" style text.

const pad = (n) => String(n).padStart(2, '0');

// "5:30 PM", "5:30pm", "17:30", "5 PM" -> "17:30" (or '' if unreadable)
export function to24(value) {
  if (!value) return '';
  const m = String(value).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return '';
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3] ? m[3][0] : '';
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return '';
  return `${pad(h)}:${pad(min)}`;
}

// "17:30" -> "5:30 PM"
export function fromTimeInput(hhmm) {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Old combined text such as "5:30 PM - 6:15 PM", "5:30-6:15 pm" or "4pm-6pm"
// -> ['17:30', '18:15'].
// A start with no am/pm takes the end's. If that puts it after the end, it's am.
export function splitLegacyTime(text) {
  const parts = String(text || '').split(/\s*[-–]\s*/);
  const startRaw = (parts[0] || '').trim();
  const endRaw = (parts[1] || '').trim();
  const end = to24(endRaw);
  let start = to24(startRaw);
  const endMer = (endRaw.match(/([ap])\.?\s*m?\.?$/i) || [])[1];
  const startHasMer = /[ap]\.?\s*m?\.?$/i.test(startRaw);
  if (!startHasMer && endMer && start && end) {
    const inherited = to24(`${startRaw} ${endMer}m`);
    start = inherited && inherited <= end ? inherited : to24(`${startRaw} am`);
  }
  return [start, end];
}

// Display label, e.g. "5:30 PM - 6:15 PM"
export function timeRangeLabel(start, end) {
  if (!start || !end) return '';
  return `${fromTimeInput(start)} - ${fromTimeInput(end)}`;
}
