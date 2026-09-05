import { createContext, useContext, useState, ReactNode } from "react";
import { ALL_PERMISSION_IDS } from "./permissionsData";

/** The 5 resource groups whose permissions (other than Create) can be scoped to either every
 * item in the Console or only items the role's member created or was shared with. */
export const SCOPABLE_GROUP_IDS = ["agents", "knowledge", "skills", "guardrails", "connectors"] as const;
export type ScopeValue = "all" | "own_shared";
/** Keyed by permission id (e.g. "agents.publish") — scope is chosen independently per
 * permission, not shared across a whole resource group. */
export type ScopeMap = Record<string, ScopeValue>;

/** True for View/Publish/Build/Pause/Delete on one of the 5 publishable resource groups —
 * false for Create (always personal-only) and for every Governance/Org-management permission. */
export function isScopablePermission(permId: string): boolean {
  const groupId = permId.split(".")[0];
  return (SCOPABLE_GROUP_IDS as readonly string[]).includes(groupId) && !permId.endsWith(".create");
}

export function defaultScope(): ScopeMap {
  const map: ScopeMap = {};
  for (const id of ALL_PERMISSION_IDS) if (isScopablePermission(id)) map[id] = "all";
  return map;
}

export type RoleDef = {
  id: string;
  name: string;
  isDefault: boolean;
  permissionIds: Set<string>;
  /** Per-permission scope for View/Publish/Build/Pause/Delete across the 5 publishable resource
   * groups — "all" (every item in the Console) or "own_shared" (only items the member created
   * or that were shared with them). Create is never scoped — it always applies only to items
   * the person creates themselves. */
  scope: ScopeMap;
};

const ADMIN_IDS = new Set(ALL_PERMISSION_IDS);
const BUILDER_IDS = new Set([
  "agents.create", "agents.publish", "agents.manage",
  "knowledge.create", "knowledge.publish", "knowledge.manage",
  "skills.create", "skills.publish", "skills.manage",
  "guardrails.create", "guardrails.publish", "guardrails.manage",
  "connectors.create", "connectors.publish", "connectors.manage",
  "members.view",
]);
const VIEWER_IDS = new Set([
  "agents.view",
  "knowledge.view",
  "skills.view",
  "guardrails.view",
  "connectors.view",
]);

/** Builder can publish/build only what its own member created or was shared with — never every
 * resource in the Console — across all 5 publishable groups. Create has no Scope. */
const BUILDER_SCOPE: ScopeMap = {
  ...defaultScope(),
  "agents.publish": "own_shared", "agents.manage": "own_shared",
  "knowledge.publish": "own_shared", "knowledge.manage": "own_shared",
  "skills.publish": "own_shared", "skills.manage": "own_shared",
  "guardrails.publish": "own_shared", "guardrails.manage": "own_shared",
  "connectors.publish": "own_shared", "connectors.manage": "own_shared",
};

/** Viewer can only see resources its own member created or was shared with, not every resource
 * in the Console. */
const VIEWER_SCOPE: ScopeMap = {
  ...defaultScope(),
  "agents.view": "own_shared",
  "knowledge.view": "own_shared",
  "skills.view": "own_shared",
  "guardrails.view": "own_shared",
  "connectors.view": "own_shared",
};

const SEED_ROLES: RoleDef[] = [
  { id: "admin", name: "Admin", isDefault: true, permissionIds: ADMIN_IDS, scope: defaultScope() },
  { id: "builder", name: "Builder", isDefault: true, permissionIds: BUILDER_IDS, scope: BUILDER_SCOPE },
  { id: "viewer", name: "Viewer", isDefault: true, permissionIds: VIEWER_IDS, scope: VIEWER_SCOPE },
];

type RolesContextValue = {
  roles: RoleDef[];
  createRole: (name: string, permissionIds: Set<string>, scope: ScopeMap) => void;
  updateRole: (id: string, name: string, permissionIds: Set<string>, scope: ScopeMap) => void;
  deleteRole: (id: string) => void;
};

const RolesContext = createContext<RolesContextValue | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<RoleDef[]>(SEED_ROLES);

  const createRole = (name: string, permissionIds: Set<string>, scope: ScopeMap) => {
    setRoles(prev => [...prev, { id: `custom-${Date.now()}`, name, isDefault: false, permissionIds, scope }]);
  };

  const updateRole = (id: string, name: string, permissionIds: Set<string>, scope: ScopeMap) => {
    setRoles(prev => prev.map(r => (r.id === id ? { ...r, name, permissionIds, scope } : r)));
  };

  const deleteRole = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
  };

  return (
    <RolesContext.Provider value={{ roles, createRole, updateRole, deleteRole }}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles(): RolesContextValue {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error("useRoles must be used within a RolesProvider");
  return ctx;
}
