// sessionStorage-backed AGENT-level skill store — private to one Agent, kept deliberately
// separate from skillStore.ts (the shareable Console-level store), mirroring the
// agentGuardrailStore.ts/guardrailConsoleStore.ts split.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { skillStore, type Skill } from "./skillStore";
import type { Sharing } from "./skillSharing";

const STORE_KEY = "agent_skill_store_v1";
const ATTACHED_KEY = "agent_skill_attached_v1";
// Per-Agent "Kích hoạt" state (Round 8: sync with Knowledge's per-Agent activate toggle) —
// keyed by `${agentId}:${skillId}` for BOTH this Agent's own skills and any Console skill it
// has linked, so one Agent turning a shared skill off never affects another Agent using the
// same skill. Skill has no Console-level enabled concept, so this is the only on/off state.
const ACTIVE_KEY = "agent_skill_active_v1";
const store = loadMap<string, Skill>(STORE_KEY);
const attached = loadMap<string, string[]>(ATTACHED_KEY);
const active = loadMap<string, boolean>(ACTIVE_KEY);
const k = (agentId: string, id: string) => `${agentId}:${id}`;
const persist = () => saveMap(STORE_KEY, store);
const persistAttached = () => saveMap(ATTACHED_KEY, attached);
const persistActive = () => saveMap(ACTIVE_KEY, active);

export const agentSkillStore = {
  list(agentId: string): Skill[] {
    const prefix = `${agentId}:`;
    return [...store.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, s]) => s)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(agentId: string, id: string): Skill | undefined {
    return store.get(k(agentId, id));
  },
  create(agentId: string, data: {
    name: string; description: string; body: string;
    ownerId: string; ownerName: string; sharing: Sharing;
  }): Skill {
    const id = `askill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const s: Skill = {
      id, name: data.name.trim(), description: data.description.trim(), body: data.body,
      icon: "🧩", iconBg: "hsl(231 90% 93%)",
      ownerId: data.ownerId, ownerName: data.ownerName, sharing: data.sharing,
      attachedByAgentIds: [],
      createdAt: now, updatedAt: now,
    };
    store.set(k(agentId, id), s);
    persist();
    return s;
  },
  update(agentId: string, id: string, patch: Partial<Pick<Skill, "name" | "description" | "body">>) {
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
  remove(agentId: string, id: string) {
    store.delete(k(agentId, id));
    persist();
  },

  // --- Linked Console Skills (read-only reference) ---
  listAttachedConsoleSkillIds(agentId: string): string[] {
    return attached.get(agentId) ?? [];
  },
  attachConsoleSkill(agentId: string, skillId: string) {
    const cur = new Set(attached.get(agentId) ?? []);
    cur.add(skillId);
    attached.set(agentId, [...cur]);
    persistAttached();
    skillStore.addAttachingAgent(skillId, agentId);
  },
  detachConsoleSkill(agentId: string, skillId: string) {
    const cur = (attached.get(agentId) ?? []).filter(id => id !== skillId);
    attached.set(agentId, cur);
    persistAttached();
    skillStore.removeAttachingAgent(skillId, agentId);
  },

  // --- Per-Agent "Kích hoạt" ---
  isActive(agentId: string, id: string): boolean {
    const v = active.get(k(agentId, id));
    return v ?? true;
  },
  setActive(agentId: string, id: string, val: boolean) {
    active.set(k(agentId, id), val);
    persistActive();
  },

  /** Creates a new Console skill from this Agent-private one, then re-links the Agent to it. */
  promoteToConsole(agentId: string, itemId: string, sharing: Sharing): { skillId: string } | null {
    const item = store.get(k(agentId, itemId));
    if (!item) return null;
    const created = skillStore.create({
      name: item.name, description: item.description, body: item.body,
      icon: item.icon, iconBg: item.iconBg,
      ownerId: item.ownerId, ownerName: item.ownerName, sharing,
    });
    this.remove(agentId, itemId);
    this.attachConsoleSkill(agentId, created.id);
    return { skillId: created.id };
  },
};
