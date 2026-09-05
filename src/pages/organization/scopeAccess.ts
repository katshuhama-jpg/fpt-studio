import { useMyPermissions } from "./useMyPermissions";
import { SCOPABLE_GROUP_IDS, type ScopeValue } from "./rolesStore";

export type ResourceGroupId = (typeof SCOPABLE_GROUP_IDS)[number];
export type ScopableVerb = "view" | "publish" | "manage" | "pause" | "delete";

/** Minimal ownership shape for the resource groups that don't have a richer sharing model of
 * their own (Agents, Skills, Guardrails, Connectors) — "who created it" plus "who it was
 * explicitly shared with," by org-member id. Knowledge's own `Sharing` object (mode + people)
 * is richer than this and is adapted separately in `knowledgeBaseStore.isAccessibleTo`. */
export interface Ownable {
  ownerId?: string;
  sharedWith?: string[];
}

/** True if `userId` created this resource or it was explicitly shared with them. */
export function isOwnedOrShared(resource: Ownable | undefined, userId: string): boolean {
  if (!resource || !userId) return false;
  if (resource.ownerId === userId) return true;
  return !!resource.sharedWith?.includes(userId);
}

/**
 * Resolves, for one of the 5 publishable resource groups, what the signed-in user's role
 * actually grants — read live from the Roles config (never hardcoded by role name), so editing
 * a role's Scope pill on /roles changes what its members can see/do immediately, with no code
 * change.
 *
 * `view` permission is only ever needed to see OTHER people's resources — using your own is
 * always free (this matches the copy on each View permission: "Not required to publish or
 * manage your own X"). So `canSeeAll` is true only when the role both has View AND its Scope is
 * "All in Console"; a role missing View entirely, or holding it at "Own & Shared", must have
 * every list pre-filtered to what the user owns or was shared with.
 */
export function useGroupAccess(groupId: ResourceGroupId) {
  const { permissionIds, role, userId } = useMyPermissions();
  const scope = role?.scope ?? {};

  const permId = (verb: ScopableVerb) => `${groupId}.${verb}`;
  const hasPermission = (verb: ScopableVerb) => permissionIds.has(permId(verb));
  const scopeOf = (verb: ScopableVerb): ScopeValue => scope[permId(verb)] ?? "all";

  const canSeeAll = hasPermission("view") && scopeOf("view") === "all";

  /** Whether the user can see one specific resource — always true under `canSeeAll`, otherwise
   * only if they own it or it was shared with them. Caller supplies the ownership check since
   * each resource group's sharing shape differs (simple `Ownable` vs Knowledge's `Sharing`). */
  const canSee = (ownedOrShared: boolean) => canSeeAll || ownedOrShared;

  /** Whether the user can perform `verb` (publish/manage/pause/delete) on one specific
   * resource: the permission must be granted, and either its Scope is "All in Console" or the
   * resource is owned by / shared with the user. */
  const canAct = (verb: ScopableVerb, ownedOrShared: boolean) =>
    hasPermission(verb) && (scopeOf(verb) === "all" || ownedOrShared);

  return { userId, hasPermission, scopeOf, canSeeAll, canSee, canAct };
}
