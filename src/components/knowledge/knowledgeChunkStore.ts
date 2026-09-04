// sessionStorage-backed Chunk store — shared shape for a document's, URL's, or Agent
// Knowledge item's chunks, opened from any of their "Mở" row actions via ChunkViewerModal.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";

export type ChunkSourceType = "document" | "url" | "agent-item";
export type ChunkContentType = "text" | "html";

export interface KnowledgeChunk {
  id: string;
  kbId: string;
  sourceType: ChunkSourceType;
  sourceId: string;
  index: number;
  title: string;
  content: string;
  contentType: ChunkContentType;
  manuallyEdited: boolean;
  status: KnowledgeProcessingStatus;
  updatedAt: number;
}

const STORE_KEY = "knowledge_chunk_store_v1";
const store = loadMap<string, KnowledgeChunk>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);
const sourceKey = (sourceType: ChunkSourceType, sourceId: string) => `${sourceType}:${sourceId}`;

function seedIfEmpty(kbId: string, sourceType: ChunkSourceType, sourceId: string) {
  const flagKey = `knowledge_chunk_seeded_v1:${sourceKey(sourceType, sourceId)}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  // Only pre-populate chunks for a couple of seeded "done" sources, so most sources correctly
  // show the "Chưa có chunk nào" empty state until "Xử lý kết quả" is clicked.
  const now = Date.now();
  if (sourceType === "document" && sourceId === "doc-1-2") {
    const seedTexts = [
      { title: "Phạm vi áp dụng", content: "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của ngân hàng ABC." },
      { title: "Thời gian tiếp nhận", content: "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài, ứng dụng hoặc tại quầy giao dịch." },
      { title: "Thời gian xử lý", content: "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc." },
    ];
    seedTexts.forEach((t, i) => {
      const id = `chunk-${sourceId}-${i}`;
      store.set(id, {
        id, kbId, sourceType, sourceId, index: i + 1, title: t.title, content: t.content,
        contentType: "text", manuallyEdited: false, status: "done", updatedAt: now,
      });
    });
    persist();
  }
}

export const knowledgeChunkStore = {
  list(kbId: string, sourceType: ChunkSourceType, sourceId: string): KnowledgeChunk[] {
    seedIfEmpty(kbId, sourceType, sourceId);
    return [...store.values()]
      .filter(c => c.sourceType === sourceType && c.sourceId === sourceId)
      .sort((a, b) => a.index - b.index);
  },
  /** Simulates "Xử lý kết quả" populating chunks for a source that has none yet. */
  populate(kbId: string, sourceType: ChunkSourceType, sourceId: string, chunks: { title: string; content: string }[]) {
    const now = Date.now();
    chunks.forEach((c, i) => {
      const id = `chunk-${sourceId}-${i}`;
      store.set(id, {
        id, kbId, sourceType, sourceId, index: i + 1, title: c.title, content: c.content,
        contentType: "text", manuallyEdited: false, status: "done", updatedAt: now,
      });
    });
    persist();
  },
  /** "Xử lý lại" — regenerates every non-manually-edited chunk, keeps edited ones untouched
   * (and reports how many were kept so the caller can show the info banner). */
  reprocessAll(sourceType: ChunkSourceType, sourceId: string): { keptCount: number } {
    const all = [...store.values()].filter(c => c.sourceType === sourceType && c.sourceId === sourceId);
    const kept = all.filter(c => c.manuallyEdited);
    for (const c of all) {
      if (c.manuallyEdited) continue;
      store.set(c.id, { ...c, status: "processing", updatedAt: Date.now() });
    }
    persist();
    return { keptCount: kept.length };
  },
  update(id: string, patch: Partial<Pick<KnowledgeChunk, "title" | "content" | "contentType">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, ...patch, manuallyEdited: true, status: "processing", updatedAt: Date.now() });
    persist();
  },
  updateStatus(id: string, status: KnowledgeProcessingStatus) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status, updatedAt: Date.now() });
    persist();
  },
  /** "Cập nhật theo nội dung mới" — opts a single manually-edited chunk back into auto-sync. */
  acceptLatest(id: string, content: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, content, manuallyEdited: false, status: "done", updatedAt: Date.now() });
    persist();
  },
  add(kbId: string, sourceType: ChunkSourceType, sourceId: string, data: { title: string; content: string }): KnowledgeChunk {
    const existing = this.list(kbId, sourceType, sourceId);
    const id = `chunk-${sourceId}-${Date.now().toString(36)}`;
    const rec: KnowledgeChunk = {
      id, kbId, sourceType, sourceId, index: existing.length + 1,
      title: data.title, content: data.content, contentType: "text",
      manuallyEdited: true, status: "processing", updatedAt: Date.now(),
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  remove(id: string) {
    store.delete(id);
    persist();
  },
};
