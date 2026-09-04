// sessionStorage-backed FAQ store for a Console Knowledge Base's "Câu hỏi thường gặp" tab.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";

export interface KnowledgeFaq {
  id: string;
  kbId: string;
  question: string;
  answer: string;
  categories: string[];
  status: KnowledgeProcessingStatus;
  chunkCount: number;
  updatedAt: number;
  updatedBy: string;
}

const STORE_KEY = "knowledge_faq_store_v1";
const SEEDED_KEY = "knowledge_faq_store_seeded_v1";
const store = loadMap<string, KnowledgeFaq>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seedKb(kbId: string) {
  const flagKey = `${SEEDED_KEY}:${kbId}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (f: KnowledgeFaq) => store.set(f.id, f);

  if (kbId === "kb-2") {
    put({ id: "faq-2-1", kbId, question: "Làm sao để khóa thẻ khi bị mất?", answer: "Bạn có thể khóa thẻ ngay trên ứng dụng ABC Bank tại mục Thẻ của tôi, hoặc gọi hotline 1900 xxxx để được hỗ trợ khóa thẻ tức thì.", categories: ["Thẻ"], status: "done", chunkCount: 1, updatedAt: now - 3 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-2", kbId, question: "Thời gian xử lý yêu cầu mở thẻ tín dụng là bao lâu?", answer: "Thông thường từ 3-5 ngày làm việc kể từ khi hồ sơ đầy đủ và hợp lệ.", categories: ["Thẻ", "Xử lý"], status: "done", chunkCount: 1, updatedAt: now - 6 * DAY, updatedBy: "Tran Nam" });
    put({ id: "faq-2-3", kbId, question: "Tôi có thể thay đổi hạn mức thẻ tín dụng không?", answer: "Có, bạn có thể gửi yêu cầu điều chỉnh hạn mức qua ứng dụng hoặc tại quầy giao dịch, kèm theo chứng minh thu nhập nếu tăng hạn mức.", categories: ["Thẻ"], status: "processing", chunkCount: 0, updatedAt: now - 10 * 60_000, updatedBy: "Tran Nam" });
  }

  persist();
}

// Normalizes records created before `categories` existed on this store (stale sessionStorage
// data from earlier in development) so components can always assume an array.
const normalize = (f: KnowledgeFaq): KnowledgeFaq => (f.categories ? f : { ...f, categories: [] });

export const knowledgeFaqStore = {
  list(kbId: string): KnowledgeFaq[] {
    seedKb(kbId);
    return [...store.values()].filter(f => f.kbId === kbId).sort((a, b) => b.updatedAt - a.updatedAt).map(normalize);
  },
  get(kbId: string, id: string): KnowledgeFaq | undefined {
    seedKb(kbId);
    const f = store.get(id);
    return f ? normalize(f) : undefined;
  },
  listCategories(kbId: string): string[] {
    const set = new Set<string>(this.list(kbId).flatMap(f => f.categories));
    return [...set].sort();
  },
  isDuplicateQuestion(kbId: string, question: string, excludeId?: string): boolean {
    const n = question.trim().toLowerCase();
    return this.list(kbId).some(f => f.id !== excludeId && f.question.trim().toLowerCase() === n);
  },
  create(kbId: string, data: { question: string; answer: string; categories: string[] }): KnowledgeFaq {
    const id = `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const rec: KnowledgeFaq = {
      id, kbId, question: data.question.trim(), answer: data.answer.trim(), categories: data.categories,
      status: "pending", chunkCount: 0, updatedAt: Date.now(), updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  update(id: string, patch: Partial<Pick<KnowledgeFaq, "question" | "answer" | "categories">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, ...patch, status: "pending", chunkCount: 0, updatedAt: Date.now() });
    persist();
  },
  updateStatus(id: string, status: KnowledgeProcessingStatus, patch?: Partial<Pick<KnowledgeFaq, "chunkCount">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status, ...patch, updatedAt: Date.now() });
    persist();
  },
  removeMany(ids: string[]) {
    for (const id of ids) store.delete(id);
    persist();
  },
};
