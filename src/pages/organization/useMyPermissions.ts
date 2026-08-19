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

  const role: RoleDef | undefined = useMemo(() => {
    const members = collectMembers(tree);
    const me =
      members.find(m => (m.email ?? "").trim().toLowerCase() === email) ??
      members.find(m => m.name === "Tran Nam");
    const roleId = me?.roleId ?? "admin";
    return roles.find(r => r.id === roleId) ?? roles.find(r => r.id === DEFAULT_ROLE_ID);
  }, [tree, roles, email]);

  const permissionIds = role?.permissionIds ?? new Set<string>();

  return {
    role,
    permissionIds,
    can: (permissionId: string) => permissionIds.has(permissionId),
  };
}
