// sessionStorage-backed Chunk store — shared shape for a document's, URL's, or Agent
// Knowledge item's chunks, opened from any of their "Mở" row actions via ChunkViewerModal.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";

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

// A document/URL at status "done" has, by definition, already been processed — so it must open
// with a real chunk list whose length matches the chunkCount shown in the table/aggregate
// stats, rather than the empty state (which is reserved for sources genuinely never processed).
// No historical per-document content exists in this prototype, so titles/content are generated
// deterministically from a rotating template, consistent with this app's other seeded mock data.
const MOCK_TITLES = [
  "Phạm vi áp dụng", "Thời gian tiếp nhận", "Thời gian xử lý", "Điều kiện áp dụng",
  "Quy trình thực hiện", "Trách nhiệm các bên", "Mức phí và lệ phí", "Kênh tiếp nhận yêu cầu",
  "Hồ sơ cần chuẩn bị", "Thời hạn hiệu lực", "Ngoại lệ và trường hợp đặc biệt", "Liên hệ hỗ trợ",
];
const MOCK_BODY = "Nội dung chi tiết được trích xuất tự động từ tài liệu gốc, mô tả các quy định và hướng dẫn liên quan đến mục này.";

function generateMockChunks(count: number): { title: string; content: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const base = MOCK_TITLES[i % MOCK_TITLES.length];
    const round = Math.floor(i / MOCK_TITLES.length);
    return { title: round === 0 ? base : `${base} (${round + 1})`, content: MOCK_BODY };
  });
}

function seedIfEmpty(kbId: string, sourceType: ChunkSourceType, sourceId: string) {
  const flagKey = `knowledge_chunk_seeded_v1:${sourceKey(sourceType, sourceId)}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  const now = Date.now();

  let chunkCount = 0;
  let status: KnowledgeProcessingStatus | undefined;
  if (sourceType === "document") {
    const doc = knowledgeDocumentStore.get(kbId, sourceId);
    chunkCount = doc?.chunkCount ?? 0;
    status = doc?.status;
  } else if (sourceType === "url") {
    const url = knowledgeUrlStore.get(kbId, sourceId);
    chunkCount = url?.chunkCount ?? 0;
    status = url?.status;
  }

  if (status === "done" && chunkCount > 0) {
    generateMockChunks(chunkCount).forEach((t, i) => {
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
