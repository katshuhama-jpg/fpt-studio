/** Console-level ownership & sharing shape for Guardrails — mirrors Knowledge's own
 * `Sharing`/`SharedPerson` model (src/components/knowledge/knowledgeBaseStore.ts) field-for-
 * field, so the two modules' sharing UI and permission behavior are identical, without coupling
 * Guardrails to the Knowledge module's files. */
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

/** True when the user is neither owner nor shared on this resource (read-only via the Space).
 * Being shared no longer carries a view/edit level: what a shared person can do (sửa, chia sẻ, xóa)
 * follows their Role permissions, checked by the caller with useGroupAccess. */
export function isViewOnly(sharing: Sharing, ownerId: string, userId: string): boolean {
  if (ownerId === userId) return false;
  if (sharing.mode === "all") return false;
  const person = sharing.people.find(p => p.userId === userId);
  return !person;
}
