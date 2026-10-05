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

// Demo seed (once per session): "Product FAQ Assistant" uses Linh Phan's "debt-lookup" skill,
// mirrored on the skill side via skillStore's attachedByAgentIds.
const DEMO_SEEDED_KEY = "agent_skill_attached_demo_seeded_v1";
if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(DEMO_SEEDED_KEY)) {
  sessionStorage.setItem(DEMO_SEEDED_KEY, "1");
  attached.set("faq", [...new Set([...(attached.get("faq") ?? []), "debt-lookup"])]);
  persistAttached();
}

// Demo seed for the "slash-demo" agent (Instructions "/" menu): two Agent-only skills (one
// switched off => "Đang tắt"), plus three linked Console skills, one of them switched off.
const SLASH_DEMO_SEEDED_KEY = "agent_skill_slash_demo_seeded_v1";
if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(SLASH_DEMO_SEEDED_KEY)) {
  sessionStorage.setItem(SLASH_DEMO_SEEDED_KEY, "1");
  const now = Date.now();
  const mk = (id: string, name: string, description: string, icon: string, iconBg: string): Skill => ({
    id, name, description, body: `# ${name}\n\n${description}`, icon, iconBg,
    ownerId: "m-fsoft-ceo", ownerName: "Tran Nam", sharing: { mode: "private", people: [] },
    attachedByAgentIds: [], createdAt: now, updatedAt: now,
  });
  const own = [
    mk("askill-demo-report", "viet-bao-cao-tuan", "Tổng hợp số liệu và viết báo cáo tuần cho quản lý.", "📝", "hsl(231 90% 93%)"),
    mk("askill-demo-faq", "tra-cuu-faq-noi-bo", "Tra cứu câu hỏi thường gặp nội bộ (đang tạm tắt).", "❓", "hsl(38 92% 93%)"),
  ];
  for (const s of own) store.set(k("slash-demo", s.id), s);
  persist();
  active.set(k("slash-demo", "askill-demo-faq"), false);
  active.set(k("slash-demo", "email-drafter"), false);
  persistActive();
  attached.set("slash-demo", ["debt-lookup", "email-drafter", "account-briefing"]);
  persistAttached();
}

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
    // Only content fields — the edit form also carries a sharing value, which must not
    // overwrite the skill's real sharing.
    const { name, description, body } = patch;
    store.set(k(agentId, id), {
      ...cur,
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(body !== undefined ? { body } : {}),
      updatedAt: Date.now(),
    });
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

  /** Reverse of promoteToConsole — "Tắt chia sẻ" on a skill this Agent shared: moves it back
   * into this Agent as a private skill and removes it from the Space library. Callers must make
   * sure no other Agent uses it (SkillShareModal blocks that case). */
  demoteToAgent(agentId: string, skillId: string): Skill | null {
    const src = skillStore.get(skillId);
    if (!src) return null;
    const created = this.create(agentId, {
      name: src.name, description: src.description, body: src.body,
      ownerId: src.ownerId ?? "", ownerName: src.ownerName ?? "",
      sharing: { mode: "private", people: [] },
    });
    this.detachConsoleSkill(agentId, skillId);
    skillStore.remove(skillId);
    return created;
  },
};
