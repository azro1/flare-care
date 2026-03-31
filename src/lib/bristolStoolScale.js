/** Bristol Stool Chart — standard 7 types (clinical wording, short labels for UI). */
export const BRISTOL_TYPES = [
  { type: 1, shortLabel: 'Separate hard lumps', description: 'Hard to pass' },
  { type: 2, shortLabel: 'Lumpy sausage', description: 'Lumpy and sausage-like' },
  { type: 3, shortLabel: 'Cracked sausage', description: 'Sausage with surface cracks' },
  { type: 4, shortLabel: 'Smooth sausage', description: 'Smooth and soft' },
  { type: 5, shortLabel: 'Soft blobs', description: 'Soft blobs with clear edges' },
  { type: 6, shortLabel: 'Fluffy pieces', description: 'Mushy consistency' },
  { type: 7, shortLabel: 'Liquid', description: 'Watery, no solid pieces' },
]

export function getBristolTypeMeta(type) {
  const n = Number(type)
  return BRISTOL_TYPES.find((t) => t.type === n) || null
}

/** e.g. "Type 4 — Smooth sausage" (reports, exports, tooltips) */
export function formatBristolLine(type) {
  const meta = getBristolTypeMeta(type)
  if (!meta) return `Type ${type}`
  return `Type ${meta.type} — ${meta.shortLabel}`
}

/** e.g. "Type 4" — compact label for list rows */
export function formatBristolTypeOnly(type) {
  const meta = getBristolTypeMeta(type)
  if (!meta) return `Type ${type}`
  return `Type ${meta.type}`
}

/** Full wording for title / screen readers */
export function formatBristolDetailLabel(type) {
  const meta = getBristolTypeMeta(type)
  if (!meta) return `Type ${type}`
  return `Type ${meta.type}: ${meta.shortLabel}. ${meta.description}`
}
