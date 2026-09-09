/** Console-level ownership & sharing shape for Skills — mirrors Knowledge's own
 * `Sharing`/`SharedPerson` model (src/components/knowledge/knowledgeBaseStore.ts) field-for-
 * field, so the two modules' sharing UI and permission behavior are identical, without coupling
 * Skills to the Knowledge module's files. */
export type SharingMode = "private" | "all" | "specific";
export type SharingAccess = "view" | "edit";

export interface SharedPerson {
  userId: string;
  name: string;
  email: string;
  access: SharingAccess;
}

export interface Sharing {
  mode: SharingMode;
  people: SharedPerson[];
}

/** True when `userId` created the resource, it's shared with every Console user, or they're
 * one of its explicitly-shared people. */
export function isAccessibleTo(sharing: Sharing, ownerId: string, userId: string): boolean {
  if (ownerId === userId) return true;
  if (sharing.mode === "all") return true;
  return sharing.people.some(p => p.userId === userId);
}

/** True when `userId` can only view (not edit/share/delete) — the owner and anyone with "edit"
 * access (or a resource shared to "all") can manage it; a "view"-only shared person cannot. */
export function isViewOnly(sharing: Sharing, ownerId: string, userId: string): boolean {
  if (ownerId === userId) return false;
  if (sharing.mode === "all") return false;
  const person = sharing.people.find(p => p.userId === userId);
  return !person || person.access === "view";
}
