import { useMemo } from "react";
import { getUser } from "@/lib/onboarding";
import { useOrg } from "./orgStore";
import { useRoles, RoleDef } from "./rolesStore";
import { collectMembers } from "./orgData";
import { DEFAULT_ROLE_ID } from "./Members";

/**
 * Resolves the signed-in user's effective permission set by matching their account
 * email against the org tree (falling back to the "Tran Nam" seed member, then to
 * the Admin role, so a data mismatch never locks the demo persona out of everything —
 * the workspace chrome already displays them as "Workspace Admin").
 */
export function useMyPermissions() {
  const { tree } = useOrg();
  const { roles } = useRoles();
  const email = (getUser()?.email || "tran.nam@fpt.com").trim().toLowerCase();

  // Resolved once and reused for both the role lookup and the caller's own identity — scope
  // enforcement (see scopeAccess.ts) needs the actual org-member id to compare against a
  // resource's ownerId/sharedWith, not just the permission set.
  const me = useMemo(() => {
    const members = collectMembers(tree);
    return (
      members.find(m => (m.email ?? "").trim().toLowerCase() === email) ??
      members.find(m => m.name === "Tran Nam")
    );
  }, [tree, email]);

  const role: RoleDef | undefined = useMemo(() => {
    const roleId = me?.roleId ?? "admin";
    return roles.find(r => r.id === roleId) ?? roles.find(r => r.id === DEFAULT_ROLE_ID);
  }, [me, roles]);

  const permissionIds = role?.permissionIds ?? new Set<string>();

  return {
    role,
    userId: me?.id ?? "m-fsoft-ceo",
    permissionIds,
    can: (permissionId: string) => permissionIds.has(permissionId),
  };
}
