/** Display a source's version as x.x.x. Each "Thay nội dung" (new file/content) is a new major
 * version, so stored version n reads as `n.0.0` (1 → 1.0.0, 2 → 2.0.0). */
export function formatVersion(version: number | undefined): string {
  const n = Math.max(1, Math.floor(version ?? 1));
  return `${n}.0.0`;
}
