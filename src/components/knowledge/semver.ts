// Semantic version helpers shared by every Knowledge store that tracks a document/URL/item's
// version (knowledgeDocumentStore, knowledgeUrlStore, knowledgeStore) and by VersionHistoryPanel,
// so "vN" integer badges become real "major.minor.patch" strings with a consistent bump rule:
//   - Initial upload/creation: 1.0.0.
//   - A reprocess/re-sync that changes content (auto-sync, "Xử lý lại", "Ghi đè", "Khôi phục"):
//     bump minor, reset patch.
//   - A manual chunk edit that doesn't trigger a full reprocess: bump patch.
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export const INITIAL_VERSION: SemVer = { major: 1, minor: 0, patch: 0 };

export function bumpMinor(v: SemVer): SemVer {
  return { major: v.major, minor: v.minor + 1, patch: 0 };
}

export function bumpPatch(v: SemVer): SemVer {
  return { ...v, patch: v.patch + 1 };
}

export function formatVersion(v: SemVer): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/** Synthesizes a plausible, deterministic version sequence from 1.0.0 up to `current`, oldest
 * first, by walking `current.minor` minor bumps followed by `current.patch` patch bumps — mirrors
 * the real bump rule so VersionHistoryPanel's fabricated timeline (this prototype has no real
 * historical-content store, see its own comment) stays internally consistent with it instead of
 * just counting down a flat integer. The last entry always equals `current`. */
export function synthesizeVersionSequence(current: SemVer): SemVer[] {
  const seq: SemVer[] = [{ major: current.major, minor: 0, patch: 0 }];
  for (let m = 1; m <= current.minor; m++) seq.push({ major: current.major, minor: m, patch: 0 });
  for (let p = 1; p <= current.patch; p++) seq.push({ major: current.major, minor: current.minor, patch: p });
  return seq;
}
