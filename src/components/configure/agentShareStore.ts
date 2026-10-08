import { useSyncExternalStore } from "react";
import { AGENTS, type AgentRecord } from "./agentStore";
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { collectMembers, orgTree, type OrgMember } from "@/pages/organization/orgData";

/** Who an Agent is shared with inside the Console (co-building / viewing), separate from Publish
 * (which decides who chats with it in Workspace). What a shared person can do on the Agent is not
 * picked per person: it follows their Role ("Build agents" → chỉnh sửa, otherwise chỉ xem).
 *
 * The share state is written straight onto the AgentRecord (sharedWith / sharedAll) so every
 * existing Scope check (scopeAccess.isOwnedOrShared) picks it up, and kept in sessionStorage so a
 * "Xem với vai trò" persona switch (which reloads the app) still sees the share. */
export type AgentShareMode = "private" | "all" | "specific";
export interface AgentShare { mode: AgentShareMode; people: string[] }

const KEY = "agent_share_v1";
const saved = loadMap<string, AgentShare>(KEY);
for (const [id, s] of saved) {
  const a = AGENTS.find(x => x.id === id);
  if (a) apply(a, s);
}

function apply(a: AgentRecord, s: AgentShare) {
  a.sharedAll = s.mode === "all";
  a.sharedWith = s.mode === "specific" ? [...s.people] : [];
}

let version = 0;
const listeners = new Set<() => void>();

export const agentShareStore = {
  get(id: string): AgentShare {
    const a = AGENTS.find(x => x.id === id);
    if (!a) return { mode: "private", people: [] };
    if (a.sharedAll) return { mode: "all", people: [] };
    if (a.sharedWith?.length) return { mode: "specific", people: [...a.sharedWith] };
    return { mode: "private", people: [] };
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
