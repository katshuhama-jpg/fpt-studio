// sessionStorage-backed Chunk store — shared shape for a document's, URL's, or Agent
// Knowledge item's chunks, opened from any of their "Mở" row actions via ChunkViewerModal.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeFaqStatus, KnowledgeProcessingStatus } from "./knowledgeStatus";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { MOCK_PAGES } from "./mockDocumentPages";

export type ChunkSourceType = "document" | "url" | "agent-item";
export type ChunkContentType = "text" | "html";

/** Where on the rendered page a chunk's content was extracted from — every field is a 0-1
 * fraction of the page's own width/height, so it stays correct across zoom levels and doesn't
 * depend on the page's actual pixel size at render time. */
export interface ChunkBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  box: ChunkBox;
}

const STORE_KEY = "knowledge_chunk_store_v2";
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
const DEFAULT_BOX: ChunkBox = { page: 0, x: 0.08, y: 0.06, width: 0.84, height: 0.35 };

/** Cheap deterministic pseudo-random in [0, 1) — no real randomness needed (or wanted, for
 * reproducible seed data across reloads), just enough spread that stacked boxes on the same
 * page don't all line up in a perfectly uniform grid. */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Lays out `count` chunk boxes across MOCK_PAGES round-robin, stacking multiple chunks on the
 * same page in vertical bands with a small deterministic jitter — bands are allowed to overlap
 * slightly (by design, matching real paragraph spacing), never forced into a hard grid. */
function assignBoxes(count: number): ChunkBox[] {
  const totalPages = MOCK_PAGES.length;
  const byPage: number[][] = Array.from({ length: totalPages }, () => []);
  for (let i = 0; i < count; i++) byPage[i % totalPages].push(i);

  const boxes: ChunkBox[] = new Array(count);
  for (let page = 0; page < totalPages; page++) {
    const idxs = byPage[page];
    const n = idxs.length;
    idxs.forEach((globalIdx, slot) => {
      const bandHeight = 1 / Math.max(n, 1);
      const jitter = (seededRand(globalIdx + 1) - 0.5) * 0.03;
      const y = Math.max(0.03, Math.min(0.9, slot * bandHeight + bandHeight * 0.12 + jitter));
      const height = Math.max(0.12, bandHeight * 0.78);
      const x = 0.06 + seededRand(globalIdx + 7) * 0.05;
      const width = Math.min(0.9, 0.82 + seededRand(globalIdx + 13) * 0.06);
      boxes[globalIdx] = { page, x, y, width: Math.min(width, 0.94 - x), height: Math.min(height, 1 - y - 0.02) };
    });
  }
  return boxes;
}

/** Derives a chunk's content from the page text underneath its box (approximating what real
 * extraction would return for that region) — used both when seeding chunks and whenever a box
 * is resized, so the linked content visibly follows the region the user drags. Falls back to
 * `fallback` if the region maps to an unreasonably short slice. */
export function extractContentForBox(box: ChunkBox, fallback?: string): string {
  const text = MOCK_PAGES[box.page] ?? MOCK_PAGES[0];
  const start = Math.max(0, Math.min(text.length, Math.round(box.y * text.length)));
  const end = Math.max(start, Math.min(text.length, Math.round((box.y + box.height) * text.length)));
  const slice = text.slice(start, end).trim();
  if (slice.length >= 20) return slice;
  return fallback && fallback.trim().length >= 20 ? fallback : text;
}

/** Splits each page's text evenly among however many chunks land on that page, so every one of
 * them gets its own distinct, real, non-degenerate substring — unlike deriving content from
 * `assignBoxes`' page-*height* bands (a chunk's box is a fraction of the page's fixed pixel
 * height, which has no relationship to the page's *text length*; on a page with many chunks
 * and/or short text, most bands mapped past the end of the actual rendered text, producing
 * empty slices — see DocumentPreviewPane's real per-chunk measurement, which this now feeds
 * real substrings into instead of relying on a page-height-derived guess). */
function assignContentSlices(count: number): string[] {
  const totalPages = MOCK_PAGES.length;
  const byPage: number[][] = Array.from({ length: totalPages }, () => []);
  for (let i = 0; i < count; i++) byPage[i % totalPages].push(i);

  const contents: string[] = new Array(count);
  for (let page = 0; page < totalPages; page++) {
    const idxs = byPage[page];
    const text = MOCK_PAGES[page];
    const n = idxs.length;
    idxs.forEach((globalIdx, slot) => {
      const start = Math.floor((slot / n) * text.length);
      const end = slot === n - 1 ? text.length : Math.floor(((slot + 1) / n) * text.length);
      contents[globalIdx] = text.slice(start, end).trim() || text;
    });
  }
  return contents;
}

function generateMockChunks(count: number): { title: string; content: string; box: ChunkBox }[] {
  const boxes = assignBoxes(count);
  const contents = assignContentSlices(count);
  return Array.from({ length: count }, (_, i) => {
    const base = MOCK_TITLES[i % MOCK_TITLES.length];
    const round = Math.floor(i / MOCK_TITLES.length);
    return { title: round === 0 ? base : `${base} (${round + 1})`, content: contents[i], box: boxes[i] };
  });
}

/** Fills in a plausible default box for any chunk missing one (e.g. seeded before this field
 * existed, in an already-open sessionStorage session) — self-heals in place. */
function backfillBox(c: KnowledgeChunk): KnowledgeChunk {
  if (c.box) return c;
  const page = (c.index - 1) % MOCK_PAGES.length;
  const healed: KnowledgeChunk = { ...c, box: { ...DEFAULT_BOX, page } };
  store.set(c.id, healed);
  return healed;
}

function seedIfEmpty(
  kbId: string, sourceType: ChunkSourceType, sourceId: string,
  agentItemHint?: { status?: KnowledgeFaqStatus; chunkCount?: number },
) {
  const flagKey = `knowledge_chunk_seeded_v1:${sourceKey(sourceType, sourceId)}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  const now = Date.now();

  let chunkCount = 0;
  let status: KnowledgeFaqStatus | undefined;
  if (sourceType === "document") {
    const doc = knowledgeDocumentStore.get(kbId, sourceId);
    chunkCount = doc?.chunkCount ?? 0;
    status = doc?.status;
  } else if (sourceType === "url") {
    const url = knowledgeUrlStore.get(kbId, sourceId);
    chunkCount = url?.chunkCount ?? 0;
    status = url?.status;
  } else if (sourceType === "agent-item") {
    // knowledgeStore.ts (agent items) can't be imported here without creating a circular
    // dependency — the caller (ChunkViewerModal) passes the item's status/chunkCount instead.
    chunkCount = agentItemHint?.chunkCount ?? 0;
    status = agentItemHint?.status;
  }

  if (status === "done" && chunkCount > 0) {
    generateMockChunks(chunkCount).forEach((t, i) => {
      const id = `chunk-${sourceId}-${i}`;
      store.set(id, {
        id, kbId, sourceType, sourceId, index: i + 1, title: t.title, content: t.content,
        contentType: "text", manuallyEdited: false, status: "done", updatedAt: now, box: t.box,
      });
    });
    persist();
  }
}

/** Marks a source as already chunk-seeded so the lazy `seedIfEmpty` auto-population never
 * overwrites chunks a caller populated directly (e.g. to pre-mark one as manually edited). */
export function markChunksSeeded(sourceType: ChunkSourceType, sourceId: string) {
  sessionStorage.setItem(`knowledge_chunk_seeded_v1:${sourceKey(sourceType, sourceId)}`, "1");
}

export const knowledgeChunkStore = {
  list(
    kbId: string, sourceType: ChunkSourceType, sourceId: string,
    agentItemHint?: { status?: KnowledgeFaqStatus; chunkCount?: number },
  ): KnowledgeChunk[] {
    seedIfEmpty(kbId, sourceType, sourceId, agentItemHint);
    const result = [...store.values()]
      .filter(c => c.sourceType === sourceType && c.sourceId === sourceId)
      .map(backfillBox)
      .sort((a, b) => a.index - b.index);
    return result;
  },
  /** Simulates "Xử lý kết quả" populating chunks for a source that has none yet — each of the
   * curated seed paragraphs is shown covering most of its own page (they're near-full-page
   * excerpts, not stacked sub-regions). */
  populate(kbId: string, sourceType: ChunkSourceType, sourceId: string, chunks: { title: string; content: string }[]) {
    const now = Date.now();
    chunks.forEach((c, i) => {
      const id = `chunk-${sourceId}-${i}`;
      const page = i % MOCK_PAGES.length;
      store.set(id, {
        id, kbId, sourceType, sourceId, index: i + 1, title: c.title, content: c.content,
        contentType: "text", manuallyEdited: false, status: "done", updatedAt: now,
        box: { page, x: 0.08, y: 0.08, width: 0.84, height: 0.7 },
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
  /** Reprocesses a single chunk (the quick action on its highlighted box) — a no-op if it's
   * manually edited, matching "Xử lý lại"'s own rule of never discarding manual edits. */
  reprocessOne(id: string) {
    const cur = store.get(id);
    if (!cur || cur.manuallyEdited) return;
    store.set(id, { ...cur, status: "processing", updatedAt: Date.now() });
    persist();
  },
  update(id: string, patch: Partial<Pick<KnowledgeChunk, "title" | "content" | "contentType">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, ...patch, manuallyEdited: true, status: "processing", updatedAt: Date.now() });
    persist();
  },
  /** "Xử lý kết quả" on a dragged box — commits it as a manual boundary override: re-derives
   * the chunk's content from whatever page region the box now covers, and locks it in as
   * manually edited (kept as-is by future bulk "Xử lý lại" runs), same as any other manual
   * edit. The drag itself only previews the new box; nothing is persisted until this is called. */
  applyBoxResize(id: string, box: ChunkBox) {
    const cur = store.get(id);
    if (!cur) return;
    const content = extractContentForBox(box, cur.content);
    store.set(id, { ...cur, box, content, manuallyEdited: true, status: "processing", updatedAt: Date.now() });
    persist();
  },
  /** "Xử lý lại" on a dragged box — re-runs extraction against the new boundary instead of
   * locking it in as a manual edit, so it stays eligible for a later bulk "Xử lý lại" like any
   * other system-generated chunk. */
  reprocessBoxResize(id: string, box: ChunkBox) {
    const cur = store.get(id);
    if (!cur) return;
    const content = extractContentForBox(box, cur.content);
    store.set(id, { ...cur, box, content, manuallyEdited: false, status: "processing", updatedAt: Date.now() });
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
  add(kbId: string, sourceType: ChunkSourceType, sourceId: string, data: { title: string; content: string; box?: ChunkBox }): KnowledgeChunk {
    const existing = this.list(kbId, sourceType, sourceId);
    const id = `chunk-${sourceId}-${Date.now().toString(36)}`;
    const rec: KnowledgeChunk = {
      id, kbId, sourceType, sourceId, index: existing.length + 1,
      title: data.title, content: data.content, contentType: "text",
      manuallyEdited: true, status: "processing", updatedAt: Date.now(),
      box: data.box ?? DEFAULT_BOX,
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
