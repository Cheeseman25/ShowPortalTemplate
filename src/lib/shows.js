// Turns the Shows sheet tab into the lookups the #shows page needs.

// Collapses stray spaces so "Olivia  York " and "olivia york" count as one person.
const cleanName = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

// Splits CSV text into rows of cells. Handles quoted cells, commas and "" escapes inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

// Parses the raw sheet rows (2D array) into { shows, assignments }.
// The sheet holds one block per show, side by side: a "Character" column then an "Actor" column,
// with the show's label in the row above the headings. Schedule entries ([{ week, date, time }])
// are matched to blocks by order; missing entries fall back to the sheet's own label.
export function parseShowRows(rows, schedule = []) {
  if (!Array.isArray(rows) || rows.length < 2) return { shows: [], assignments: [] };

  const lower = (v) => String(v == null ? '' : v).toLowerCase().trim();
  const headerRow = rows.findIndex((r) => Array.isArray(r) && r.some((c, i) => lower(c).startsWith('character') && lower(r[i + 1]).startsWith('actor')));
  if (headerRow === -1) return { shows: [], assignments: [] };

  const header = rows[headerRow];
  const labels = headerRow > 0 ? rows[headerRow - 1] : [];
  const blocks = [];
  header.forEach((cell, c) => {
    if (lower(cell).startsWith('character') && lower(header[c + 1]).startsWith('actor')) blocks.push(c);
  });

  const shows = [];
  const assignments = [];
  blocks.forEach((c, i) => {
    const id = `s${i + 1}`;
    const plan = schedule[i] || {};
    shows.push({
      id,
      label: plan.label || `Show ${i + 1}`,
      week: plan.week || (i < blocks.length / 2 ? 1 : 2),
      date: plan.date || cleanName(labels[c]),
      time: plan.time || '',
    });
    rows.slice(headerRow + 1).forEach((r, row) => {
      const role = cleanName(r[c]);
      const name = cleanName(r[c + 1]);
      // row = position in the sheet, which is the billing order of the characters
      if (role && name) assignments.push({ show: id, role, name, row });
    });
  });
  return { shows, assignments };
}

// Regroups the sheet rows of one repeated role (such as "Chorus") into lines where each actor
// sits on exactly one line. Why: the sheet may enter the same chorus actor on a different row in
// each show; the grid must show that actor on one line. Actors in the most shows are placed
// first; each takes the first line where none of their shows is already filled, so alternating
// casts share a line. Returns lines as { row, byShow }, in order of first appearance in the sheet.
function mergeRepeatedRole(roleRows) {
  const actors = new Map();  // lowercase name -> { name, shows: {showId -> true}, firstRow }
  roleRows.forEach(({ row, byShow }) => {
    Object.entries(byShow).forEach(([show, name]) => {
      const key = name.toLowerCase();
      if (!actors.has(key)) actors.set(key, { name, shows: {}, firstRow: row });
      const a = actors.get(key);
      a.shows[show] = true;
      a.firstRow = Math.min(a.firstRow, row);
    });
  });
  const ordered = [...actors.values()].sort((a, b) =>
    Object.keys(b.shows).length - Object.keys(a.shows).length || a.firstRow - b.firstRow);

  const lines = [];
  ordered.forEach((actor) => {
    let line = lines.find((l) => Object.keys(actor.shows).every((s) => !l.byShow[s]));
    if (!line) { line = { row: actor.firstRow, byShow: {} }; lines.push(line); }
    Object.keys(actor.shows).forEach((s) => { line.byShow[s] = actor.name; });
    line.row = Math.min(line.row, actor.firstRow);
  });
  return lines.sort((a, b) => a.row - b.row);
}

// Character rows in sheet (billing) order for the grid:
// [{ key, row, role, byShow: { showId -> actor name } }].
// Every assignment keeps its own role and show exactly as the sheet states them; only the line it
// is drawn on can change. The sheet's role label can differ between show blocks on the same row
// (row 42 may be "Snow Ballet" in show 1 and "Sun Chorus" in show 4), so lines are built per role,
// never per sheet row. A role found on one sheet row keeps that row. A role repeated on several
// rows (Chorus, Sun Chorus...) is consolidated opportunistically so an actor sits on one line.
// Roles match ignoring case and extra spaces.
export function buildCharacterRows(assignments) {
  const roles = new Map();  // normalized role -> { role, rows: Map(sheet row -> { row, byShow }) }
  assignments.forEach(({ show, role, name, row }) => {
    const k = role.toLowerCase();
    if (!roles.has(k)) roles.set(k, { role, rows: new Map() });
    const rows = roles.get(k).rows;
    if (!rows.has(row)) rows.set(row, { row, byShow: {} });
    rows.get(row).byShow[show] = name;
  });

  const out = [];
  roles.forEach(({ role, rows }) => {
    const sheetRows = [...rows.values()].sort((a, b) => a.row - b.row);
    const lines = sheetRows.length > 1 ? mergeRepeatedRole(sheetRows) : sheetRows;
    lines.forEach((l) => out.push({ row: l.row, role, byShow: l.byShow }));
  });
  out.sort((a, b) => a.row - b.row);
  return out.map((r, i) => ({ ...r, key: i }));
}

// Builds { byShow, byPerson, people } from shows + assignments.
//   byShow:   showId -> [{ name, roles }]   one entry per person, even with several roles in that show
//   byPerson: name   -> { showId -> [roles] }
//   people:   all performer names, A-Z
export function indexAssignments(shows, assignments) {
  const byShow = {};
  const byPerson = {};
  const display = {};  // lowercase key -> first spelling seen, so case variants merge
  shows.forEach((s) => { byShow[s.id] = []; });

  assignments.forEach(({ show, role, name }) => {
    if (!byShow[show]) return;
    const key = name.toLowerCase();
    const shown = display[key] || (display[key] = name);
    if (!byPerson[shown]) byPerson[shown] = {};
    if (!byPerson[shown][show]) {
      byPerson[shown][show] = [];
      byShow[show].push({ name: shown, roles: byPerson[shown][show] });
    }
    if (!byPerson[shown][show].includes(role)) byPerson[shown][show].push(role);
  });

  const people = Object.keys(byPerson).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return { byShow, byPerson, people };
}

// For the Together view: per show, which of the chosen performers are in it.
// mode 'all' keeps shows containing every chosen performer; 'any' keeps shows with at least one.
export function togetherByShow(shows, byPerson, chosen, mode) {
  return shows.map((show) => {
    const present = chosen.filter((name) => byPerson[name]?.[show.id]);
    const match = chosen.length > 0 && (mode === 'all' ? present.length === chosen.length : present.length > 0);
    return { show, present, match };
  });
}
