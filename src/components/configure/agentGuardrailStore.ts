// sessionStorage-backed AGENT-level guardrail store — private to one Agent, kept deliberately
// separate from guardrailConsoleStore.ts (the shareable Console-level store), mirroring the
// knowledgeStore.ts/knowledgeBaseStore.ts split. Used by the Agent's Guardrails tab for its own
// "Guardrails riêng của Agent" items plus which Console guardrails it has linked.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";
import { guardrailConsoleStore, type Guardrail, type ActionKind } from "./guardrailConsoleStore";
import type { Sharing } from "./guardrailSharing";

const STORE_KEY = "agent_guardrail_store_v1";
const ATTACHED_KEY = "agent_guardrail_attached_v1";
const SEEDED_KEY = "agent_guardrail_store_seeded_v1";
const store = loadMap<string, Guardrail>(STORE_KEY);
const attached = loadMap<string, string[]>(ATTACHED_KEY);
const k = (agentId: string, id: string) => `${agentId}:${id}`;
const persist = () => saveMap(STORE_KEY, store);
const persistAttached = () => saveMap(ATTACHED_KEY, attached);

/** Matches guardrailConsoleStore.ts's seed, which already lists "cskh" in g-4's and g-7's own
 * `attachedByAgentIds` — without this, a fresh session would show those two as linked on the
 * Console card but not-yet-linked on the Agent's own Guardrails tab. */
function seedAgent(agentId: string) {
  const seededFlag = loadSet<string>(SEEDED_KEY);
  if (seededFlag.has(agentId)) return;
  seededFlag.add(agentId);
  saveSet(SEEDED_KEY, seededFlag);
  if (agentId === "cskh") {
    const cur = new Set(attached.get(agentId) ?? []);
    cur.add("g-4");
    cur.add("g-7");
    attached.set(agentId, [...cur]);
    persistAttached();
  }
}

// Agent id -> guardrail id embedded per-record isn't tracked separately here (the map key
// already scopes by agent), so `list` just filters by key prefix.
export const agentGuardrailStore = {
  list(agentId: string): Guardrail[] {
    seedAgent(agentId);
    const prefix = `${agentId}:`;
    return [...store.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, g]) => g)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(agentId: string, id: string): Guardrail | undefined {
    return store.get(k(agentId, id));
  },
  create(agentId: string, data: {
    name: string; desc: string; action: ActionKind; allAgents?: boolean; enabled: boolean;
    ownerId: string; ownerName: string; sharing: Sharing;
  }): Guardrail {
    const id = `ag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const g: Guardrail = { ...data, id, mandatory: false, agents: [], attachedByAgentIds: [], createdAt: now, updatedAt: now };
    store.set(k(agentId, id), g);
    persist();
    return g;
  },
  update(agentId: string, id: string, patch: Partial<Pick<Guardrail, "name" | "desc" | "action" | "allAgents" | "sharing">>) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, ...patch, updatedAt: Date.now() });
    persist();
  },
  updateSharing(agentId: string, id: string, sharing: Sharing) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, sharing, updatedAt: Date.now() });
    persist();
  },
  toggleEnabled(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, enabled: !cur.enabled, updatedAt: Date.now() });
    persist();
  },
  remove(agentId: string, id: string) {
    store.delete(k(agentId, id));
    persist();
  },

  // --- Linked Console Guardrails (read-only reference) ---
  listAttachedConsoleGuardrailIds(agentId: string): string[] {
    seedAgent(agentId);
    return attached.get(agentId) ?? [];
  },
  attachConsoleGuardrail(agentId: string, guardrailId: string) {
    const cur = new Set(attached.get(agentId) ?? []);
    cur.add(guardrailId);
    attached.set(agentId, [...cur]);
    persistAttached();
    guardrailConsoleStore.addAttachingAgent(guardrailId, agentId);
  },
  detachConsoleGuardrail(agentId: string, guardrailId: string) {
    const cur = (attached.get(agentId) ?? []).filter(id => id !== guardrailId);
    attached.set(agentId, cur);
    persistAttached();
    guardrailConsoleStore.removeAttachingAgent(guardrailId, agentId);
  },

  /** Creates a new Console guardrail from this Agent-private one, then re-links the Agent to
   * it — the Agent keeps using it, but it stops being agent-only and becomes shareable. */
  promoteToConsole(agentId: string, itemId: string, sharing: Sharing): { guardrailId: string } | null {
    const item = store.get(k(agentId, itemId));
    if (!item) return null;
    const created = guardrailConsoleStore.create({
      name: item.name, desc: item.desc, action: item.action, allAgents: item.allAgents,
      enabled: item.enabled, ownerId: item.ownerId!, ownerName: item.ownerName!, sharing,
    });
    this.remove(agentId, itemId);
    this.attachConsoleGuardrail(agentId, created.id);
    return { guardrailId: created.id };
  },
};
