// sessionStorage-backed Console Knowledge store — mutations survive a page reload and
// client-side navigation within the same browser session. This is the CONSOLE-level store
// (lives at /knowledge, shareable across many Agents) — kept deliberately separate from
// src/components/knowledge/knowledgeStore.ts (the per-Agent Knowledge store) per the
// two-store architecture: an Agent can attach a Console KB by reference, or promote one of
// its own items into a new Console KB, but the two stores are never merged.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export type KnowledgeBaseType = "internal" | "external_api";
export type SharingMode = "private" | "all" | "specific";
export type SharingAccess = "view" | "edit";

export interface SharedPerson {
  userId: string;
  name: string;
  email: string;
  access: SharingAccess;
}

export interface Sharing {
  mode: SharingMode;
  people: SharedPerson[];
}

export interface KnowledgeBaseStats {
  docs: number;
  urls: number;
  faqs: number;
  chunks: number;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: KnowledgeBaseType;
  ownerId: string;
  ownerName: string;
  sharing: Sharing;
  /** external_api only */
  apiEndpoint?: string;
  hasApiKey?: boolean;
  stats: KnowledgeBaseStats;
  /** Agent ids currently attaching this KB by reference — drives the Delete-KB warning
   * ("N Agent đang dùng kho tri thức này..."). */
  attachedByAgentIds: string[];
  createdAt: number;
  updatedAt: number;
}

export const CURRENT_USER = { id: "tran-nam", name: "Tran Nam", email: "tran.nam@fpt.com" };

const STORE_KEY = "knowledge_base_store_v1";
const SEEDED_KEY = "knowledge_base_store_seeded_v1";
const store = loadMap<string, KnowledgeBase>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seed() {
  if (sessionStorage.getItem(SEEDED_KEY)) return;
  sessionStorage.setItem(SEEDED_KEY, "1");
  const now = Date.now();
  const DAY = 86_400_000;

  const put = (kb: KnowledgeBase) => store.set(kb.id, kb);

  // Owned by current user — private (default)
  put({
    id: "kb-1", name: "Chính sách ngân hàng ABC",
    description: "Chính sách sản phẩm, lãi suất và quy trình xử lý khiếu nại của ngân hàng ABC.",
    type: "internal", ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: { mode: "private", people: [] },
    stats: { docs: 18, urls: 6, faqs: 24, chunks: 842 },
    attachedByAgentIds: ["cskh"],
    createdAt: now - 30 * DAY, updatedAt: now - 2 * 3_600_000,
  });

  // Owned by current user — shared to all console users
  put({
    id: "kb-2", name: "FAQ chăm sóc khách hàng",
    description: "Câu hỏi thường gặp dùng chung cho các Agent chăm sóc khách hàng.",
    type: "internal", ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: { mode: "all", people: [] },
    stats: { docs: 4, urls: 0, faqs: 63, chunks: 63 },
    attachedByAgentIds: ["cskh", "ops"],
    createdAt: now - 21 * DAY, updatedAt: now - DAY,
  });

  // Owned by current user — shared with 3 specific people
  put({
    id: "kb-3", name: "Tài liệu vận hành nội bộ",
    description: "Quy trình vận hành, mẫu email và hướng dẫn xử lý sự cố nội bộ.",
    type: "internal", ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: {
      mode: "specific",
      people: [
        { userId: "m-fsoft-coo", name: "Linh Phan", email: "linh.phan@fpt.com", access: "edit" },
        { userId: "m-plat-1", name: "Mai Hoang", email: "mai.hoang@fpt.com", access: "view" },
        { userId: "m-fsoft-vn-1", name: "Duy Nguyen", email: "duy.nguyen@fpt.com", access: "view" },
      ],
    },
    stats: { docs: 27, urls: 3, faqs: 8, chunks: 511 },
    attachedByAgentIds: [],
    createdAt: now - 45 * DAY, updatedAt: now - 6 * 3_600_000,
  });

  // Shared TO current user — view only
  put({
    id: "kb-4", name: "Chính sách nhân sự",
    description: "Chính sách nghỉ phép, phúc lợi và quy định nhân sự công ty.",
    type: "internal", ownerId: "m-fsoft-coo", ownerName: "Linh Phan",
    sharing: {
      mode: "specific",
      people: [{ userId: CURRENT_USER.id, name: CURRENT_USER.name, email: CURRENT_USER.email, access: "view" }],
    },
    stats: { docs: 9, urls: 1, faqs: 15, chunks: 203 },
    attachedByAgentIds: [],
    createdAt: now - 60 * DAY, updatedAt: now - 5 * DAY,
  });

  // Shared TO current user — editable
  put({
    id: "kb-5", name: "Kịch bản bán hàng",
    description: "Kịch bản tư vấn và xử lý từ chối cho đội ngũ bán hàng.",
    type: "internal", ownerId: "m-plat-1", ownerName: "Mai Hoang",
    sharing: {
      mode: "specific",
      people: [{ userId: CURRENT_USER.id, name: CURRENT_USER.name, email: CURRENT_USER.email, access: "edit" }],
    },
    stats: { docs: 12, urls: 0, faqs: 30, chunks: 268 },
    attachedByAgentIds: ["sales"],
    createdAt: now - 12 * DAY, updatedAt: now - 3 * 3_600_000,
  });

  // External API-connected KB
  put({
    id: "kb-6", name: "Cổng tri thức pháp lý",
    description: "Kết nối tới hệ thống tra cứu văn bản pháp lý của tập đoàn qua API.",
    type: "external_api", ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name,
    sharing: { mode: "private", people: [] },
    apiEndpoint: "https://legal-kb.abc-corp.vn/api/v1/retrieve", hasApiKey: true,
    stats: { docs: 0, urls: 0, faqs: 0, chunks: 0 },
    attachedByAgentIds: [],
    createdAt: now - 7 * DAY, updatedAt: now - 7 * DAY,
  });

  persist();
}

export const knowledgeBaseStore = {
  list(): KnowledgeBase[] {
    seed();
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): KnowledgeBase | undefined {
    seed();
    return store.get(id);
  },
  isDuplicateName(name: string, excludeId?: string): boolean {
    const n = name.trim().toLowerCase();
    return this.list().some(kb => kb.id !== excludeId && kb.name.trim().toLowerCase() === n);
  },
  create(data: {
    name: string; description: string; type: KnowledgeBaseType; sharing: Sharing;
    apiEndpoint?: string; hasApiKey?: boolean;
  }): KnowledgeBase {
    const id = `kb-${Date.now().toString(36)}`;
    const now = Date.now();
    const kb: KnowledgeBase = {
      id, name: data.name.trim(), description: data.description.trim(), type: data.type,
      ownerId: CURRENT_USER.id, ownerName: CURRENT_USER.name, sharing: data.sharing,
      apiEndpoint: data.apiEndpoint, hasApiKey: data.hasApiKey,
      stats: { docs: 0, urls: 0, faqs: 0, chunks: 0 },
      attachedByAgentIds: [], createdAt: now, updatedAt: now,
    };
    store.set(id, kb);
    persist();
    return kb;
  },
  update(id: string, patch: Partial<Pick<KnowledgeBase, "name" | "description" | "apiEndpoint" | "hasApiKey">>) {
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

/** True when the given user can only view (not edit/share/delete) a KB — the owner and
 * anyone with "edit" access (or a KB shared to "all") can manage it; a "view"-only shared
 * person cannot. */
export function isViewOnly(kb: KnowledgeBase, userId: string = CURRENT_USER.id): boolean {
  if (kb.ownerId === userId) return false;
  if (kb.sharing.mode === "all") return false;
  const person = kb.sharing.people.find(p => p.userId === userId);
  return !person || person.access === "view";
}
