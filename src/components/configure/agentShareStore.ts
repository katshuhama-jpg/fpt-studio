import { useSyncExternalStore } from "react";
import { AGENTS, type AgentRecord } from "./agentStore";
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { collectMembers, orgTree, type OrgMember } from "@/pages/organization/orgData";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useRoles } from "@/pages/organization/rolesStore";
import { DEFAULT_ROLE_ID } from "@/pages/organization/Members";

/** Who works on an Agent besides its owner - separate from Publish (who chats with it).
 *
 * Each added person gets a level:
 *  - "role" (Thêm nhanh): follows their Role - "Build agents" → edit, otherwise view.
 *  - "view" / "edit" (Thêm nâng cao): picked by hand and overrides the Role, both ways.
 * "Quyền chung" can also open the Agent to the whole Space at one level. When someone gets a
 * level both ways, the higher one wins.
 *
 * The state is mirrored onto the AgentRecord (sharedWith / sharedAll / shareLevels) so the
 * existing Scope checks (scopeAccess.isOwnedOrShared) keep working, and kept in sessionStorage so a
 * "Xem với vai trò" persona switch (which reloads the app) still sees it. */
export type AgentAccessLevel = "role" | "view" | "edit";
export type AgentGeneralAccess = "none" | "space";
export interface AgentMember { userId: string; level: AgentAccessLevel }
export interface AgentShare { general: AgentGeneralAccess; generalLevel: AgentAccessLevel; people: AgentMember[] }

const EMPTY: AgentShare = { general: "none", generalLevel: "role", people: [] };
const KEY = "agent_share_v2";
const saved = loadMap<string, AgentShare>(KEY);

// One-time carry-over from v1 ({ mode, people: string[] }) so a demo already set up keeps working.
for (const [id, old] of loadMap<string, { mode: string; people: string[] }>("agent_share_v1")) {
  if (saved.has(id)) continue;
  saved.set(id, {
    general: old.mode === "all" ? "space" : "none", generalLevel: "role",
    people: old.mode === "specific" ? old.people.map(userId => ({ userId, level: "role" as const })) : [],
  });
}
for (const [id, s] of saved) {
  const a = AGENTS.find(x => x.id === id);
  if (a) apply(a, s);
}

function apply(a: AgentRecord, s: AgentShare) {
  a.sharedAll = s.general === "space";
  a.sharedWith = s.people.map(p => p.userId);
  a.shareLevels = Object.fromEntries(s.people.map(p => [p.userId, p.level]));
  a.shareGeneralLevel = s.generalLevel;
}

let version = 0;
const listeners = new Set<() => void>();

export const agentShareStore = {
  get(id: string): AgentShare {
    const a = AGENTS.find(x => x.id === id);
    if (!a) return EMPTY;
    const people = (a.sharedWith ?? []).map(userId => ({ userId, level: (a.shareLevels?.[userId] ?? "role") as AgentAccessLevel }));
    return { general: a.sharedAll ? "space" : "none", generalLevel: (a.shareGeneralLevel ?? "role") as AgentAccessLevel, people };
  },
  set(id: string, s: AgentShare) {
    const a = AGENTS.find(x => x.id === id);
    if (!a) return;
    apply(a, s);
    saved.set(id, s);
    saveMap(KEY, saved);
    version++;
    listeners.forEach(l => l());
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** Re-render when any Agent's sharing changes. */
export function useAgentShareVersion() {
  return useSyncExternalStore(agentShareStore.subscribe, () => version);
}

export function memberById(id: string): OrgMember | undefined {
  return collectMembers(orgTree).find(m => m.id === id);
}

/** "role" turned into what it means for one person right now. */
export function resolveLevel(level: AgentAccessLevel, roleCanBuild: boolean): "view" | "edit" {
  return level === "role" ? (roleCanBuild ? "edit" : "view") : level;
}

/** What `userId` gets on this Agent through sharing alone (null = not shared with them). The
 * person's own entry and "Cả Space" both count; the higher level wins. */
export function shareLevelFor(agentId: string, userId: string, roleCanBuild: boolean): "view" | "edit" | null {
  const s = agentShareStore.get(agentId);
  const levels: ("view" | "edit")[] = [];
  const mine = s.people.find(p => p.userId === userId);
  if (mine) levels.push(resolveLevel(mine.level, roleCanBuild));
  if (s.general === "space") levels.push(resolveLevel(s.generalLevel, roleCanBuild));
  if (levels.length === 0) return null;
  return levels.includes("edit") ? "edit" : "view";
}

/** The signed-in user's level on an Agent: "owner", "edit" / "view" when it's shared with them,
 * or null. Space Admins (Build agents across the whole Console) count as "edit" everywhere. */
export function useAgentAccessLevel(agentId: string): "owner" | "edit" | "view" | null {
  useAgentShareVersion();
  const { userId, permissionIds, role } = useMyPermissions();
  const a = AGENTS.find(x => x.id === agentId);
  if (!a) return "owner"; // new / unsaved Agent - the creator
  if (a.ownerId === userId) return "owner";
  const canBuild = permissionIds.has("agents.manage");
  const viaShare = shareLevelFor(agentId, userId, canBuild);
  if (canBuild && (role?.scope?.["agents.manage"] ?? "all") === "all") return "edit";
  return viaShare;
}

/** Role-based ability of any member (for the "Theo Vai trò" hint next to each person). */
export function useRoleCanBuild() {
  const { roles } = useRoles();
  return (member?: { roleId?: string }) => {
    const role = roles.find(r => r.id === (member?.roleId ?? DEFAULT_ROLE_ID));
    return !!role?.permissionIds.has("agents.manage");
  };
}

/** True when the signed-in user reaches this Agent only because they were added to it (not its
 * owner, not a Space Admin). Such a person never edits a resource that lives in the Space library,
 * even at "Chỉnh sửa" - only the Agent's own resources ("Chỉ Agent này"). */
export function useIsAgentCollaborator(agentId: string | null | undefined): boolean {
  useAgentShareVersion();
  const { userId, permissionIds, role } = useMyPermissions();
  if (!agentId) return false;
  const a = AGENTS.find(x => x.id === agentId);
  if (!a || a.ownerId === userId) return false;
  const canBuild = permissionIds.has("agents.manage");
  if (canBuild && (role?.scope?.["agents.manage"] ?? "all") === "all") return false;
  return shareLevelFor(agentId, userId, canBuild) !== null;
}
