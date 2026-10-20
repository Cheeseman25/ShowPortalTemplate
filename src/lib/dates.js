// Date parsing/formatting for call board entries.

export function formatCallBoardDate(rawVal) {
  if (!rawVal) return '';
  if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
    return rawVal.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  const str = String(rawVal).trim();
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const dt = new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
  const mdy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mdy) {
    const dt = new Date(parseInt(mdy[3], 10), parseInt(mdy[1], 10) - 1, parseInt(mdy[2], 10));
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  return str;
}

export function parseDateTimestamp(val) {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  const str = String(val).trim();
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10)).getTime();
  }
  const mdy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mdy) {
    return new Date(parseInt(mdy[3], 10), parseInt(mdy[1], 10) - 1, parseInt(mdy[2], 10)).getTime();
  }
  const t = new Date(str).getTime();
  return isNaN(t) ? 0 : t;
}
