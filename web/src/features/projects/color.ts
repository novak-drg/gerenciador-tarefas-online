// Fixed palette for project identity squares. No entry may read as the interface accent or as a
// state colour (success green, warning amber, danger red): those hues always state something.
export const PROJECT_COLORS = [
  '#3E6B8C',
  '#8A4FB0',
  '#1F7A7A',
  '#A0527A',
  '#8C5A3C',
  '#7A7466',
] as const;

/** Deterministic colour for a project id (FNV-1a hash over the palette). Used until the list loads. */
export function projectColor(id: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return PROJECT_COLORS[hash % PROJECT_COLORS.length] as string;
}

/**
 * Collision-free colours for the projects one user sees: palette entries follow each project's
 * rank by id (ids are time-ordered), wrapping once the palette is used up.
 */
export function rankProjectColors(ids: readonly string[]): Map<string, string> {
  const sorted = [...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(
    sorted.map((id, rank) => [id, PROJECT_COLORS[rank % PROJECT_COLORS.length] as string]),
  );
}
