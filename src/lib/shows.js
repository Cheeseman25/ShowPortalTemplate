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

// Character rows in sheet (billing) order for the grid:
// [{ row, role, byShow: { showId -> actor name } }]. Rows are matched by sheet position, so a
// repeated role such as "Chorus" stays as separate rows.
export function buildCharacterRows(assignments) {
  const rows = new Map();
  assignments.forEach(({ show, role, name, row }) => {
    if (!rows.has(row)) rows.set(row, { row, role, byShow: {} });
    rows.get(row).byShow[show] = name;
  });
  return [...rows.values()].sort((a, b) => a.row - b.row);
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
