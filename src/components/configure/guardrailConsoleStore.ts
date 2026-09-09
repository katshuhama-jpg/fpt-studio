// sessionStorage-backed CONSOLE-level guardrail store — the one true guardrail data model and
// persistence layer product-wide (/guardrails, and every Agent's Guardrails tab). Kept
// deliberately separate from agentGuardrailStore.ts (agent-private guardrails not yet promoted,
// plus which console guardrails an agent has linked), mirroring the
// knowledgeBaseStore.ts/knowledgeStore.ts split.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { Sharing } from "./guardrailSharing";

export type ActionKind = "Autogenerate response" | "Custom response" | "Require approval" | "Block" | "Redact and warn" | "Politely decline";
export interface AgentChip { name: string; color: string }

export interface Guardrail {
  id: string;
  name: string;
  desc: string;
  action: ActionKind;
  /** Built-in compliance rules (PII protection, etc.) — always visible to everyone, never
   * "owned" by a person, and out of scope for the ownership/sharing model below. */
  mandatory: boolean;
  agents: AgentChip[];
  allAgents?: boolean;
  enabled: boolean;
  /** Org-member id + display name of whoever created this guardrail, and the console-level
   * sharing settings they chose ("Quyền truy cập") — unset for mandatory rules. */
  ownerId?: string;
  ownerName?: string;
  sharing?: Sharing;
  /** Agent ids that have this guardrail linked via "+ Liên kết guardrail" on their Guardrails
   * tab — drives the "N Agent đang dùng guardrail này" kind of bookkeeping and lets an Agent's
   * "Guardrails đã liên kết" section resolve back to this record. */
  attachedByAgentIds: string[];
  createdAt: number;
  updatedAt: number;
}

type StoredGuardrail = Guardrail;

const STORE_KEY = "guardrail_console_store_v1";
const SEEDED_KEY = "guardrail_console_store_seeded_v1";
const store = loadMap<string, StoredGuardrail>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seed() {
  if (sessionStorage.getItem(SEEDED_KEY)) return;
  sessionStorage.setItem(SEEDED_KEY, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (g: StoredGuardrail) => store.set(g.id, g);

  put({ id: "g-1", name: "PII protection",            desc: "Never expose personal identifiers — CCID, passport, phone — in any response.",          action: "Autogenerate response", mandatory: true,  agents: [], enabled: true, attachedByAgentIds: [], createdAt: now - 90 * DAY, updatedAt: now - 90 * DAY });
  put({ id: "g-2", name: "Prohibited content filter", desc: "Block violent, adult, or discriminatory content across all channels.",                    action: "Autogenerate response", mandatory: true,  agents: [], enabled: true, attachedByAgentIds: [], createdAt: now - 90 * DAY, updatedAt: now - 90 * DAY });
  put({ id: "g-3", name: "Compliance disclaimer",     desc: "Append regulatory disclaimer to all financial and legal responses.",                      action: "Custom response",       mandatory: true,  agents: [], enabled: true, attachedByAgentIds: [], createdAt: now - 90 * DAY, updatedAt: now - 90 * DAY });
  put({
    id: "g-4", name: "Commercial response policy", desc: "Prevent AI from making pricing commitments or answering restricted topics.",
    action: "Autogenerate response", mandatory: false,
    agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "IT Helpdesk", color: "#059669" }, { name: "Product FAQ", color: "#d97706" }, { name: "Sales Qualifier", color: "#db2777" }],
    enabled: true, ownerId: "m-fsoft-ceo", ownerName: "Tran Nam", sharing: { mode: "private", people: [] },
    attachedByAgentIds: ["cskh"], createdAt: now - 20 * DAY, updatedAt: now - 2 * 3_600_000,
  });
  put({ id: "g-5", name: "Legal and medical advice", desc: "Do not provide legal or medical advice — refer to a specialist.", action: "Custom response", mandatory: false, agents: [], allAgents: true, enabled: true, attachedByAgentIds: [], createdAt: now - 60 * DAY, updatedAt: now - 60 * DAY });
  put({
    id: "g-6", name: "Escalate risky replies", desc: "Human approval for any commitments about future roadmap.",
    action: "Require approval", mandatory: false, agents: [{ name: "Sales Qualifier", color: "#d97706" }], enabled: false,
    ownerId: "m-fsoft-coo", ownerName: "Linh Phan", sharing: { mode: "private", people: [] },
    attachedByAgentIds: [], createdAt: now - 15 * DAY, updatedAt: now - 15 * DAY,
  });
  put({
    id: "g-7", name: "Competitor mention block", desc: "Avoid naming or comparing direct competitors in any response.",
    action: "Autogenerate response", mandatory: false,
    agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "HR Onboarding", color: "#7c3aed" }, { name: "IT Helpdesk", color: "#059669" }],
    enabled: true, ownerId: "m-fsoft-vn-1", ownerName: "Duy Nguyen",
    sharing: { mode: "specific", people: [{ userId: "m-fsoft-ceo", name: "Tran Nam", email: "tran.nam@fpt.com", access: "edit" }] },
    attachedByAgentIds: ["cskh"], createdAt: now - 25 * DAY, updatedAt: now - 25 * DAY,
  });
  put({
    id: "g-8", name: "Data retention notice", desc: "Remind customers of the data retention period whenever personal data is collected.",
    action: "Custom response", mandatory: false, agents: [], enabled: true,
    ownerId: "m-fsoft-ceo", ownerName: "Tran Nam", sharing: { mode: "all", people: [] },
    attachedByAgentIds: [], createdAt: now - 10 * DAY, updatedAt: now - 10 * DAY,
  });
  put({
    id: "g-9", name: "Vendor pricing disclosure", desc: "Never quote vendor cost prices — only publicly listed retail prices.",
    action: "Custom response", mandatory: false, agents: [],
    enabled: true, ownerId: "m-plat-1", ownerName: "Mai Hoang",
    sharing: { mode: "specific", people: [{ userId: "m-fsoft-ceo", name: "Tran Nam", email: "tran.nam@fpt.com", access: "view" }] },
    attachedByAgentIds: [], createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY,
  });

  persist();
}

export const guardrailConsoleStore = {
  list(): Guardrail[] {
    seed();
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Guardrail | undefined {
    seed();
    return store.get(id);
  },
  create(data: {
    name: string; desc: string; action: ActionKind; allAgents?: boolean; enabled: boolean;
    ownerId: string; ownerName: string; sharing: Sharing;
  }): Guardrail {
    const id = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const g: Guardrail = { ...data, id, mandatory: false, agents: [], attachedByAgentIds: [], createdAt: now, updatedAt: now };
    store.set(id, g);
    persist();
    return g;
  },
  update(id: string, patch: Partial<Pick<Guardrail, "name" | "desc" | "action" | "allAgents" | "sharing">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, ...patch, updatedAt: Date.now() });
    persist();
  },
  updateSharing(id: string, sharing: Sharing) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, sharing, updatedAt: Date.now() });
    persist();
  },
  toggleEnabled(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, enabled: !cur.enabled, updatedAt: Date.now() });
    persist();
  },
  remove(id: string) {
    store.delete(id);
    persist();
  },
  addAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur || cur.attachedByAgentIds.includes(agentId)) return;
    store.set(id, { ...cur, attachedByAgentIds: [...cur.attachedByAgentIds, agentId] });
    persist();
  },
  removeAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, attachedByAgentIds: cur.attachedByAgentIds.filter(a => a !== agentId) });
    persist();
  },
};
