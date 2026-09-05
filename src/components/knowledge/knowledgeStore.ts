// sessionStorage-backed AGENT-level knowledge store — private to one Agent, kept deliberately
// separate from knowledgeBaseStore.ts (the shareable Console-level store). Used by Inventor.tsx
// to seed a knowledge inventory when an agent is scaffolded, and by AgentBuilder.tsx's
// KnowledgeTab for the Agent's own upload/website/FAQ items plus its linked Console KBs.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";
import { knowledgeBaseStore, CURRENT_USER, type Sharing, type KnowledgeBaseType } from "./knowledgeBaseStore";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeFaqStore } from "./knowledgeFaqStore";
import { knowledgeChunkStore, markChunksSeeded } from "./knowledgeChunkStore";
import type { KnowledgeFaqStatus } from "./knowledgeStatus";

export type KnowledgeKind = "doc" | "url" | "faq";

export interface KnowledgeItem {
  id: string;
  agentId: string;
  name: string;
  kind: KnowledgeKind;
  /** url items only — the page's title, distinct from `name` (which holds the raw URL). Used
   * to pre-fill a human-readable name when promoting the item to a Console KB. */
  title?: string;
  description: string;
  /** Widened to the FAQ superset (adds "invalid") since a kind:"faq" item can land there — doc
   * and url items are only ever assigned the 5-value KnowledgeProcessingStatus subset. */
  status?: KnowledgeFaqStatus;
  statusReason?: string;
  chunkCount?: number;
  sizeBytes?: number;
  version?: number;
  /** Management-access sharing for this specific item, same model as a Console KB's sharing —
   * distinct from "linking" a Console KB to an Agent (that's attachConsoleKb below). Absent
   * means private ("Chỉ mình tôi"). */
  sharing?: Sharing;
  createdAt?: number;
  updatedAt: number;
  updatedBy: string;
}

const STORE_KEY = "agent_knowledge_store_v3";
const ATTACHED_KEY = "agent_knowledge_attached_v3";
const SEEDED_KEY = "agent_knowledge_store_seeded_v3";
const store = loadMap<string, KnowledgeItem>(STORE_KEY);
const attached = loadMap<string, string[]>(ATTACHED_KEY);
const k = (a: string, id: string) => `${a}:${id}`;
const persist = () => saveMap(STORE_KEY, store);
const persistAttached = () => saveMap(ATTACHED_KEY, attached);
const normalize = (i: KnowledgeItem): KnowledgeItem => (i.createdAt && i.updatedBy ? i : { ...i, createdAt: i.createdAt ?? i.updatedAt, updatedBy: i.updatedBy ?? CURRENT_USER.name });

const DAY = 86_400_000;

/** Demo data so opening an Agent's Knowledge screen shows real rows across every status,
 * sharing state and source type instead of a permanent empty state — seeded once per agent. */
function seedAgent(agentId: string) {
  const seededFlag = loadSet<string>(SEEDED_KEY);
  if (seededFlag.has(agentId)) return;
  seededFlag.add(agentId);
  saveSet(SEEDED_KEY, seededFlag);
  const now = Date.now();

  const put = (item: KnowledgeItem) => store.set(k(item.agentId, item.id), item);
  const sharedWith = (people: { userId: string; name: string; email: string; access: "view" | "edit" }[]): Sharing => ({ mode: "specific", people });

  if (agentId === "cskh") {
    put({ id: "kn-cskh-1", agentId, kind: "doc", name: "Kịch bản trả lời khiếu nại.pdf", description: "Kịch bản chuẩn cho tổng đài viên khi tiếp nhận khiếu nại.", status: "done", chunkCount: 12, sizeBytes: 480_000, version: 1, createdAt: now - 10 * DAY, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "kn-cskh-2", agentId, kind: "doc", name: "Mẫu email chăm sóc khách hàng.docx", description: "Các mẫu email phản hồi khách hàng theo từng tình huống.", status: "done", chunkCount: 8, sizeBytes: 210_000, version: 1, sharing: { mode: "all", people: [] }, createdAt: now - 8 * DAY, updatedAt: now - 6 * DAY, updatedBy: "Tran Nam" });
    put({ id: "kn-cskh-3", agentId, kind: "url", name: "https://abcbank.com/cskh/lien-he", title: "Liên hệ chăm sóc khách hàng", description: "", status: "processing", chunkCount: 0, version: 1, sharing: sharedWith([
      { userId: "m-linh", name: "Linh Phan", email: "linh.phan@fpt.com", access: "view" },
      { userId: "m-mai", name: "Mai Hoang", email: "mai.hoang@fpt.com", access: "edit" },
    ]), createdAt: now - 3 * DAY, updatedAt: now - 20 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "kn-cskh-4", agentId, kind: "faq", name: "Thời gian phản hồi khiếu nại tối đa là bao lâu?", description: "Ngân hàng cam kết phản hồi trong vòng 48 giờ làm việc kể từ khi tiếp nhận khiếu nại.", status: "pending", chunkCount: 0, version: 1, createdAt: now - 60_000, updatedAt: now - 60_000, updatedBy: "Tran Nam" });
    put({ id: "kn-cskh-5", agentId, kind: "doc", name: "Quy trình xử lý phàn nàn qua tổng đài.xlsx", description: "Bảng phân loại mức độ phàn nàn và thời hạn xử lý tương ứng.", status: "failed", statusReason: "Không đọc được nội dung tệp. Thử tải lại hoặc dùng bản PDF.", chunkCount: 0, sizeBytes: 3_200_000, version: 1, createdAt: now - 4 * DAY, updatedAt: now - 4 * DAY, updatedBy: "Tran Nam" });
    put({ id: "kn-cskh-6", agentId, kind: "url", name: "https://abcbank.com/cskh/danh-gia-dich-vu", title: "Đánh giá dịch vụ", description: "", status: "cancelled", chunkCount: 0, version: 1, createdAt: now - 15 * DAY, updatedAt: now - 12 * DAY, updatedBy: "Tran Nam" });
    put({ id: "kn-cskh-7", agentId, kind: "doc", name: "Sổ tay xử lý tình huống khó.pptx", description: "Hướng dẫn xử lý các tình huống khách hàng khó tính, leo thang.", status: "done", chunkCount: 20, sizeBytes: 5_100_000, version: 3, sharing: { mode: "all", people: [] }, createdAt: now - 25 * DAY, updatedAt: now - DAY, updatedBy: "Tran Nam" });
    put({ id: "kn-cskh-8", agentId, kind: "faq", name: "Khách hàng có thể đổi trả dịch vụ đã đăng ký không?", description: "Có, trong vòng 7 ngày kể từ ngày đăng ký nếu chưa sử dụng dịch vụ, không áp dụng với các gói đã kích hoạt.", status: "done", chunkCount: 1, version: 1, createdAt: now - 6 * DAY, updatedAt: now - 5 * DAY, updatedBy: "Tran Nam" });

    // kn-cskh-8 gets one manually-edited chunk so its "Đã chỉnh sửa thủ công" chip is visible
    // when opened — populate directly (bypassing the lazy auto-seed) so the edit sticks.
    knowledgeChunkStore.populate(agentId, "agent-item", "kn-cskh-8", [{ title: "Điều kiện đổi trả", content: MOCK_BODY }]);
    markChunksSeeded("agent-item", "kn-cskh-8");
    const seededChunk = knowledgeChunkStore.list(agentId, "agent-item", "kn-cskh-8")[0];
    if (seededChunk) {
      knowledgeChunkStore.update(seededChunk.id, { content: "Có, trong vòng 7 ngày kể từ ngày đăng ký nếu chưa sử dụng dịch vụ — đã làm rõ thêm điều kiện áp dụng theo phản hồi của đội vận hành." });
      knowledgeChunkStore.updateStatus(seededChunk.id, "done");
    }

    // A KB already linked so "Kho tri thức đã liên kết" isn't empty by default.
    knowledgeStore.attachConsoleKb(agentId, "kb-1");
    knowledgeStore.attachConsoleKb(agentId, "kb-2");
  }

  if (agentId === "hr") {
    put({ id: "kn-hr-1", agentId, kind: "doc", name: "Checklist ngày đầu tiên.pdf", description: "Danh sách việc cần làm cho nhân viên mới trong ngày đầu tiên.", status: "done", chunkCount: 6, sizeBytes: 150_000, version: 1, createdAt: now - 12 * DAY, updatedAt: now - 9 * DAY, updatedBy: "Tran Nam" });
    put({ id: "kn-hr-2", agentId, kind: "url", name: "https://intranet.abc.com/hr/quy-dinh-nghi-phep", title: "Quy định nghỉ phép", description: "", status: "done", chunkCount: 4, version: 1, sharing: { mode: "all", people: [] }, createdAt: now - 7 * DAY, updatedAt: now - 3 * DAY, updatedBy: "Tran Nam" });
    put({ id: "kn-hr-3", agentId, kind: "faq", name: "Bảo hiểm y tế cho nhân viên mới bắt đầu từ khi nào?", description: "Bảo hiểm y tế được kích hoạt từ ngày ký hợp đồng chính thức, sau thời gian thử việc.", status: "pending", chunkCount: 0, version: 1, createdAt: now - 30 * 60_000, updatedAt: now - 30 * 60_000, updatedBy: "Tran Nam" });
  }

  persist();
}

const MOCK_BODY = "Nội dung chi tiết được trích xuất tự động từ tài liệu gốc, mô tả các quy định và hướng dẫn liên quan đến mục này.";

export const knowledgeStore = {
  list(agentId: string): KnowledgeItem[] {
    seedAgent(agentId);
    return [...store.values()]
      .filter(i => i.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(normalize);
  },
  get(agentId: string, id: string): KnowledgeItem | undefined {
    const item = store.get(k(agentId, id));
    return item ? normalize(item) : undefined;
  },
  add(agentId: string, item: Omit<KnowledgeItem, "id" | "agentId" | "updatedAt" | "updatedBy">) {
    const id = `kn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const rec: KnowledgeItem = { status: "pending", version: 1, ...item, id, agentId, createdAt: now, updatedAt: now, updatedBy: CURRENT_USER.name };
    store.set(k(agentId, id), rec);
    persist();
    return rec;
  },
  restoreVersion(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, version: (cur.version ?? 1) + 1, updatedAt: Date.now(), updatedBy: CURRENT_USER.name });
    persist();
  },
  updateStatus(agentId: string, id: string, status: KnowledgeFaqStatus, patch?: Partial<Pick<KnowledgeItem, "chunkCount">>) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, status, ...patch, updatedAt: Date.now() });
    persist();
  },
  updateSharing(agentId: string, id: string, sharing: Sharing) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, sharing, updatedAt: Date.now() });
    persist();
  },
  reprocess(agentId: string, id: string) {
    const cur = store.get(k(agentId, id));
    if (!cur) return;
    store.set(k(agentId, id), { ...cur, status: "pending", updatedAt: Date.now() });
    persist();
  },
  remove(agentId: string, id: string) {
    store.delete(k(agentId, id));
    persist();
  },

  // --- Linked Console Knowledge Bases (read-only reference, never copies data) ---
  listAttachedConsoleKbIds(agentId: string): string[] {
    return attached.get(agentId) ?? [];
  },
  attachConsoleKb(agentId: string, kbId: string) {
    const cur = new Set(attached.get(agentId) ?? []);
    cur.add(kbId);
    attached.set(agentId, [...cur]);
    persistAttached();
    knowledgeBaseStore.addAttachingAgent(kbId, agentId);
  },
  detachConsoleKb(agentId: string, kbId: string) {
    const cur = (attached.get(agentId) ?? []).filter(id => id !== kbId);
    attached.set(agentId, cur);
    persistAttached();
    knowledgeBaseStore.removeAttachingAgent(kbId, agentId);
  },

  /** Creates a new Console KB seeded from this Agent item, then converts the item into a
   * linked reference to that KB — the Agent keeps access, the item stops being agent-only. */
  promoteToConsole(agentId: string, itemId: string, kbName: string, sharing: Sharing, type: KnowledgeBaseType = "internal"): { kbId: string } | null {
    const item = store.get(k(agentId, itemId));
    if (!item) return null;
    const kb = knowledgeBaseStore.create({
      name: kbName.trim(),
      description: item.kind === "faq" ? "" : item.description,
      type,
      sharing,
    });
    const isDone = item.status === "done";
    if (item.kind === "faq") {
      const faq = knowledgeFaqStore.create(kb.id, { question: item.name, answer: item.description, categories: [] });
      if (isDone) knowledgeFaqStore.updateStatus(faq.id, "done", { chunkCount: item.chunkCount ?? 1 });
    } else if (item.kind === "doc") {
      const doc = knowledgeDocumentStore.addDocument(kb.id, { name: item.name, sizeBytes: item.sizeBytes ?? 0, folderId: null });
      if (isDone) knowledgeDocumentStore.updateStatus(doc.id, "done", { chunkCount: item.chunkCount ?? 0 });
    } else if (item.kind === "url") {
      const url = knowledgeUrlStore.addUrl(kb.id, { url: item.name, source: "specified", folderId: null });
      if (isDone) knowledgeUrlStore.updateStatus(url.id, "done", { chunkCount: item.chunkCount ?? 0 });
    }
    this.remove(agentId, itemId);
    this.attachConsoleKb(agentId, kb.id);
    return { kbId: kb.id };
  },
};

export { CURRENT_USER };
