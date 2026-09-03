/**
 * Human-friendly document numbers: PO-2026-0007, SO-2026-0031.
 *
 * We derive the next sequence from the highest existing number for the current
 * year rather than a database sequence, so the numbering stays readable and
 * restartable in a class demo.
 */
export function nextDocumentNumber(prefix, existingNumbers) {
  const year = new Date().getFullYear();
  const head = `${prefix}-${year}-`;
  const highest = existingNumbers
    .filter((n) => typeof n === 'string' && n.startsWith(head))
    .map((n) => Number.parseInt(n.slice(head.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);

  return `${head}${String(highest + 1).padStart(4, '0')}`;
}
