// Music library helpers.

export function naturalTrackSorter(a, b) {
  const nameA = a.filename || a.title || '';
  const nameB = b.filename || b.title || '';
  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
}
