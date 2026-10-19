import { useSyncExternalStore } from "react";
import { AGENTS, type AgentRecord } from "./agentStore";
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { collectMembers, orgTree, type OrgMember } from "@/pages/organization/orgData";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useRoles } from "@/pages/organization/rolesStore";
import { DEFAULT_ROLE_ID } from "@/pages/organization/Members";

/** Who works on a Nhân sự số besides its owner - separate from Publish (who chats with it).
 *
 * Confirmed with Tyler 16/10: every person (and the Cả Space general access) is either
 *  - "role"   (Theo Vai trò): the permissions their Role grants on Agents, following the Role live;
 *  - "custom" (Tuỳ chỉnh):    a fixed set ticked by hand, may go beyond the Role;
 *  - "none"   (Gỡ quyền under Cả Space): left out of the Space-wide access.
 * Ticking a set equal to the Role turns back into "role"; any difference makes it "custom".
 * A person's own entry ("Quyền riêng") always replaces the Cả Space access.
 *
 * Mirrored onto the AgentRecord (sharedWith / sharedAll / sharedExcept) so Scope checks
 * (scopeAccess.isOwnedOrShared) keep working; kept in sessionStorage so a persona switch
 * (which reloads the app) still sees it. */
export type AgentPerm = "view" | "history" | "build" | "publish" | "delete";
export const AGENT_PERMS: { id: AgentPerm; name: string; desc: string; need?: AgentPerm[] }[] = [
  { id: "view", name: "Xem Nhân sự số", desc: "Mở, xem cấu hình, chạy Evaluate." },
  { id: "history", name: "Xem và export lịch sử hội thoại", desc: "Insights › History, Trace và tải ra Excel hoặc CSV.", need: ["view"] },
  { id: "build", name: "Build", desc: "Sửa Instructions, Skill, Knowledge, Channels.", need: ["view"] },
  { id: "publish", name: "Publish / Gỡ publish", desc: "Gửi yêu cầu duyệt, gỡ bản đang live.", need: ["build"] },
  { id: "delete", name: "Xóa", desc: "Xóa hẳn Nhân sự số.", need: ["build"] },
];
export const ALL_AGENT_PERMS = AGENT_PERMS.map(p => p.id);

export type AgentShareMode = "role" | "custom" | "none";
export interface AgentMember { userId: string; mode: AgentShareMode; perms?: AgentPerm[] }
export type AgentGeneralAccess = "none" | "space";
export interface AgentShare { general: AgentGeneralAccess; generalMode: "role" | "custom"; generalPerms?: AgentPerm[]; people: AgentMember[] }

const EMPTY: AgentShare = { general: "none", generalMode: "role", people: [] };
const KEY = "agent_share_v3";
const saved = loadMap<string, AgentShare>(KEY);

// One-time carry-over from v2 ({ generalLevel, people: { level } }) so a demo already set up keeps working.
const V2: Record<string, AgentPerm[]> = { view: ["view", "history"], edit: ["view", "history", "build", "publish"] };
const fromV2 = (level: string): Pick<AgentMember, "mode" | "perms"> =>
  level === "none" ? { mode: "none" } : V2[level] ? { mode: "custom", perms: V2[level] } : { mode: "role" };
for (const [id, old] of loadMap<string, { general: AgentGeneralAccess; generalLevel: string; people: { userId: string; level: string }[] }>("agent_share_v2")) {
  if (saved.has(id)) continue;
  const g = fromV2(old.generalLevel);
  saved.set(id, {
    general: old.general, generalMode: g.mode === "custom" ? "custom" : "role", generalPerms: g.perms,
    people: old.people.map(p => ({ userId: p.userId, ...fromV2(p.level) })),
  });
}
// "Cấp quyền tiếp" was retired (19/10) - drop it from anything saved before.
const known = (ps?: string[]) => ps?.filter((p): p is AgentPerm => (["view", "history", "build", "publish", "delete"] as string[]).includes(p));
for (const [id, s] of saved) {
  s.generalPerms = known(s.generalPerms);
  s.people = s.people.map(p => (p.perms ? { ...p, perms: known(p.perms) } : p));
}
for (const [id, s] of saved) {
  const a = AGENTS.find(x => x.id === id);
  if (a) apply(a, s);
}

function apply(a: AgentRecord, s: AgentShare) {
  a.sharedAll = s.general === "space";
  a.sharedWith = s.people.filter(p => p.mode !== "none").map(p => p.userId);
  a.sharedExcept = s.people.filter(p => p.mode === "none").map(p => p.userId);
}

let version = 0;
const listeners = new Set<() => void>();

export const agentShareStore = {
  get(id: string): AgentShare {
    const s = saved.get(id);
    if (s) return s;
    const a = AGENTS.find(x => x.id === id);
    if (!a) return EMPTY;
    // Seeded Agents: people shared by name follow their Role.
    return {
      general: a.sharedAll ? "space" : "none", generalMode: "role",
      people: [...(a.sharedWith ?? []).map(userId => ({ userId, mode: "role" as const })), ...(a.sharedExcept ?? []).map(userId => ({ userId, mode: "none" as const }))],
    };
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

/** What a Role grants on one Nhân sự số shared with its member, read live from Roles. Being
 * added always lets you open it. */
export function rolePerms(permissionIds: Set<string> | undefined): AgentPerm[] {
  const has = (p: string) => !!permissionIds?.has(p);
  const out: AgentPerm[] = ["view"];
  if (has("agents.history")) out.push("history");
  if (has("agents.manage")) out.push("build");
  if (has("agents.manage") && has("agents.publish")) out.push("publish");
  if (has("agents.manage") && has("agents.delete")) out.push("delete");
  return ALL_AGENT_PERMS.filter(p => out.includes(p));
}

/** Adds a permission with everything it needs, or removes it with everything that needs it. */
export function togglePerm(set: AgentPerm[], id: AgentPerm, on: boolean): AgentPerm[] {
  const s = new Set(set);
  const add = (x: AgentPerm) => { s.add(x); (AGENT_PERMS.find(p => p.id === x)?.need ?? []).forEach(add); };
  const drop = (x: AgentPerm) => { s.delete(x); AGENT_PERMS.filter(p => p.need?.includes(x)).forEach(p => drop(p.id)); };
  if (on) add(id); else drop(id);
  return ALL_AGENT_PERMS.filter(p => s.has(p));
}
export const samePerms = (a: AgentPerm[], b: AgentPerm[]) => a.length === b.length && a.every(x => b.includes(x));

/** What `userId` gets on this Agent through sharing alone (empty = no access). */
export function sharePermsFor(agentId: string, userId: string, roleSet: AgentPerm[]): AgentPerm[] {
  const s = agentShareStore.get(agentId);
  const mine = s.people.find(p => p.userId === userId);
  if (mine) return mine.mode === "none" ? [] : mine.mode === "role" ? roleSet : (mine.perms ?? []);
  if (s.general !== "space") return [];
  return s.generalMode === "role" ? roleSet : (s.generalPerms ?? []);
}

/** The signed-in user's permissions on an Agent. Owner and Space Admins (Build agents across the
 * whole Space) hold every permission. `null` = no access. */
export function useAgentPerms(agentId: string): { owner: boolean; perms: Set<AgentPerm> } | null {
  useAgentShareVersion();
  const { userId, permissionIds, role } = useMyPermissions();
  const a = AGENTS.find(x => x.id === agentId);
  if (!a || a.ownerId === userId) return { owner: true, perms: new Set(ALL_AGENT_PERMS) };
  if (permissionIds.has("agents.manage") && (role?.scope?.["agents.manage"] ?? "all") === "all") return { owner: false, perms: new Set(ALL_AGENT_PERMS) };
  const p = sharePermsFor(agentId, userId, rolePerms(permissionIds));
  return p.length ? { owner: false, perms: new Set(p) } : null;
}

/** Coarse level kept for the many screens that only ask "can edit / can view": "edit" = has Build. */
export function useAgentAccessLevel(agentId: string): "owner" | "edit" | "view" | null {
  const r = useAgentPerms(agentId);
  if (!r) return null;
  if (r.owner) return "owner";
  return r.perms.has("build") ? "edit" : "view";
}

/** A member's Role-based permissions on Agents (for "Theo Vai trò" and the auto switch). */
export function useRolePermsOf() {
  const { roles } = useRoles();
  return (member?: { roleId?: string }) => rolePerms(roles.find(r => r.id === (member?.roleId ?? DEFAULT_ROLE_ID))?.permissionIds);
}
export function useRoleNameOf() {
  const { roles } = useRoles();
  return (member?: { roleId?: string }) => roles.find(r => r.id === (member?.roleId ?? DEFAULT_ROLE_ID))?.name ?? "";
}

/** Space Admin = Build agents across the whole Space. They always hold every permission, so a
 * per-Agent setting can't limit them - the popup leaves them out of the people picker. */
export function useIsSpaceAdmin() {
  const { roles } = useRoles();
  return (member?: { roleId?: string }) => {
    const role = roles.find(r => r.id === (member?.roleId ?? DEFAULT_ROLE_ID));
    return !!role?.permissionIds.has("agents.manage") && (role.scope?.["agents.manage"] ?? "all") === "all";
  };
}

/** True when the signed-in user reaches this Agent only because they were added to it (not its
 * owner, not a Space Admin). Such a person never edits a resource that lives in the Space library,
 * even with Build - only the Agent's own resources ("Chỉ Nhân sự số này"). */
export function useIsAgentCollaborator(agentId: string | null | undefined): boolean {
  const r = useAgentPerms(agentId ?? "__none__");
  const { permissionIds, role } = useMyPermissions();
  const spaceAdmin = permissionIds.has("agents.manage") && (role?.scope?.["agents.manage"] ?? "all") === "all";
  if (!agentId || !AGENTS.find(a => a.id === agentId)) return false;
  return !!r && !r.owner && !spaceAdmin;
}
