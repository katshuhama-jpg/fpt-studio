/** Shared file-size formatter for every place a document's size is displayed across Knowledge
 * screens (Agent knowledge table, Console Documents tab, Upload modal) so the same byte count
 * always renders identically. Below 1024 KB shows whole KB; at or above shows MB with one
 * decimal; at or above 1024 MB shows GB with one decimal. */
export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
