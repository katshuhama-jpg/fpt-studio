import { createContext, useContext, useState, ReactNode } from "react";
import { ALL_PERMISSION_IDS } from "./permissionsData";

export type RoleDef = {
  id: string;
  name: string;
  isDefault: boolean;
  permissionIds: Set<string>;
};

const ADMIN_IDS = new Set(ALL_PERMISSION_IDS);
const BUILDER_IDS = new Set([
  "agents.publish", "agents.manage",
  "knowledge.publish", "knowledge.manage",
  "skills.publish", "skills.manage",
  "connectors.publish", "connectors.manage",
  "structure.view",
]);
const VIEWER_IDS = new Set([
  "structure.view",
  "roles.view",
  "members.view",
]);

const SEED_ROLES: RoleDef[] = [
  { id: "admin", name: "Admin", isDefault: true, permissionIds: ADMIN_IDS },
  { id: "builder", name: "Builder", isDefault: true, permissionIds: BUILDER_IDS },
  { id: "viewer", name: "Viewer", isDefault: true, permissionIds: VIEWER_IDS },
];

type RolesContextValue = {
  roles: RoleDef[];
  createRole: (name: string, permissionIds: Set<string>) => void;
  updateRole: (id: string, name: string, permissionIds: Set<string>) => void;
  deleteRole: (id: string) => void;
};

const RolesContext = createContext<RolesContextValue | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<RoleDef[]>(SEED_ROLES);

  const createRole = (name: string, permissionIds: Set<string>) => {
    setRoles(prev => [...prev, { id: `custom-${Date.now()}`, name, isDefault: false, permissionIds }]);
  };

  const updateRole = (id: string, name: string, permissionIds: Set<string>) => {
    setRoles(prev => prev.map(r => (r.id === id ? { ...r, name, permissionIds } : r)));
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
