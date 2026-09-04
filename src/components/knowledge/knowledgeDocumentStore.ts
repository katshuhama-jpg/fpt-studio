// sessionStorage-backed Documents store for a Console Knowledge Base's "Tài liệu" tab.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";

export interface KnowledgeDocument {
  id: string;
  kbId: string;
  name: string;
  isFolder: boolean;
  folderId: string | null;
  status: KnowledgeProcessingStatus;
  statusReason?: string;
  sizeBytes: number;
  chunkCount: number;
  version: number;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

const STORE_KEY = "knowledge_document_store_v1";
const SEEDED_KEY = "knowledge_document_store_seeded_v1";
const store = loadMap<string, KnowledgeDocument>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seedKb(kbId: string) {
  const flagKey = `${SEEDED_KEY}:${kbId}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (d: KnowledgeDocument) => store.set(d.id, d);

  if (kbId === "kb-1") {
    put({ id: "doc-1-f1", kbId, name: "Biểu phí & lãi suất", isFolder: true, folderId: null, status: "done", sizeBytes: 0, chunkCount: 0, version: 1, createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-1", kbId, name: "Biểu lãi suất tiết kiệm 2026.pdf", isFolder: false, folderId: "doc-1-f1", status: "done", sizeBytes: 1_240_000, chunkCount: 42, version: 2, createdAt: now - 6 * DAY, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-2", kbId, name: "Chính sách khiếu nại.docx", isFolder: false, folderId: null, status: "done", sizeBytes: 340_000, chunkCount: 18, version: 1, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-3", kbId, name: "Quy trình mở thẻ tín dụng.pdf", isFolder: false, folderId: null, status: "processing", sizeBytes: 2_100_000, chunkCount: 0, version: 1, createdAt: now - 5 * 60_000, updatedAt: now - 5 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "doc-1-4", kbId, name: "Sổ tay sản phẩm vay.pptx", isFolder: false, folderId: null, status: "failed", statusReason: "Không đọc được nội dung tệp. Thử tải lại hoặc dùng bản PDF.", sizeBytes: 8_400_000, chunkCount: 0, version: 1, createdAt: now - DAY, updatedAt: now - DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-5", kbId, name: "Câu hỏi khiếu nại thường gặp.csv", isFolder: false, folderId: null, status: "pending", sizeBytes: 90_000, chunkCount: 0, version: 1, createdAt: now - 60_000, updatedAt: now - 60_000, updatedBy: "Tran Nam" });
  }

  if (kbId === "kb-3") {
    put({ id: "doc-3-1", kbId, name: "Quy trình xử lý sự cố hạ tầng.pdf", isFolder: false, folderId: null, status: "done", sizeBytes: 980_000, chunkCount: 55, version: 3, createdAt: now - 9 * DAY, updatedAt: now - 4 * DAY, updatedBy: "Linh Phan" });
    put({ id: "doc-3-2", kbId, name: "Mẫu email thông báo bảo trì.docx", isFolder: false, folderId: null, status: "done", sizeBytes: 60_000, chunkCount: 6, version: 1, createdAt: now - 10 * DAY, updatedAt: now - 10 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-3-3", kbId, name: "Runbook triển khai phiên bản mới.md", isFolder: false, folderId: null, status: "done", sizeBytes: 120_000, chunkCount: 31, version: 5, createdAt: now - 15 * DAY, updatedAt: now - DAY, updatedBy: "Duy Nguyen" });
  }

  persist();
}

// Normalizes records created before `createdAt` existed on this store (stale sessionStorage
// data from earlier in development) so components can always assume the field is present.
const normalize = (d: KnowledgeDocument): KnowledgeDocument => (d.createdAt ? d : { ...d, createdAt: d.updatedAt });

export const knowledgeDocumentStore = {
  list(kbId: string): KnowledgeDocument[] {
    seedKb(kbId);
    return [...store.values()]
      .filter(d => d.kbId === kbId)
      .sort((a, b) => (b.isFolder ? 1 : 0) - (a.isFolder ? 1 : 0) || b.updatedAt - a.updatedAt)
      .map(normalize);
  },
  get(kbId: string, id: string): KnowledgeDocument | undefined {
    seedKb(kbId);
    const d = store.get(id);
    return d ? normalize(d) : undefined;
  },
  listFolders(kbId: string): KnowledgeDocument[] {
    return this.list(kbId).filter(d => d.isFolder);
  },
  isDuplicateName(kbId: string, name: string, folderId: string | null): boolean {
    return this.list(kbId).some(d => !d.isFolder && d.folderId === folderId && d.name.trim().toLowerCase() === name.trim().toLowerCase());
  },
  isDuplicateFolderName(kbId: string, name: string, parentFolderId: string | null, excludeId?: string): boolean {
    return this.list(kbId).some(d => d.isFolder && d.id !== excludeId && d.folderId === parentFolderId && d.name.trim().toLowerCase() === name.trim().toLowerCase());
  },
  /** Every folder id nested (at any depth) under `folderId` — used to keep a folder from being
   * moved into itself or one of its own descendants. */
  getDescendantFolderIds(kbId: string, folderId: string): Set<string> {
    const all = this.list(kbId);
    const result = new Set<string>();
    const queue = [folderId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const d of all) {
        if (d.isFolder && d.folderId === cur && !result.has(d.id)) {
          result.add(d.id);
          queue.push(d.id);
        }
      }
    }
    return result;
  },
  /** Total non-folder documents nested (at any depth) under `folderId` — drives the delete
   * confirmation's cascade count. */
  countDocumentsInFolder(kbId: string, folderId: string): number {
    const descendantFolders = this.getDescendantFolderIds(kbId, folderId);
    descendantFolders.add(folderId);
    return this.list(kbId).filter(d => !d.isFolder && d.folderId !== null && descendantFolders.has(d.folderId)).length;
  },
  /** Deletes a folder and everything nested inside it (sub-folders and documents alike). */
  removeFolderCascade(kbId: string, folderId: string) {
    const descendantFolders = this.getDescendantFolderIds(kbId, folderId);
    descendantFolders.add(folderId);
    const ids = this.list(kbId).filter(d => d.id === folderId || (d.folderId !== null && descendantFolders.has(d.folderId))).map(d => d.id);
    this.removeMany(ids);
  },
  createFolder(kbId: string, name: string, folderId: string | null = null): KnowledgeDocument {
    const id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeDocument = {
      id, kbId, name: name.trim(), isFolder: true, folderId, status: "done",
      sizeBytes: 0, chunkCount: 0, version: 1, createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  addDocument(kbId: string, data: { name: string; sizeBytes: number; folderId: string | null }): KnowledgeDocument {
    const isNewVersion = this.isDuplicateName(kbId, data.name, data.folderId);
    const id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeDocument = {
      id, kbId, name: data.name, isFolder: false, folderId: data.folderId, status: "pending",
      sizeBytes: data.sizeBytes, chunkCount: 0, version: isNewVersion ? 2 : 1,
      createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  updateStatus(id: string, status: KnowledgeProcessingStatus, patch?: Partial<Pick<KnowledgeDocument, "chunkCount" | "statusReason">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status, ...patch, updatedAt: Date.now() });
    persist();
  },
  rename(id: string, name: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, name: name.trim(), updatedAt: Date.now() });
    persist();
  },
  /** Restoring an older version creates a new version on top (standard versioning behavior —
   * history is never rewritten). */
  restoreVersion(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, version: cur.version + 1, updatedAt: Date.now(), updatedBy: "Tran Nam" });
    persist();
  },
  reprocess(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status: "pending", statusReason: undefined, updatedAt: Date.now() });
    persist();
  },
  moveMany(ids: string[], folderId: string | null) {
    for (const id of ids) {
      const cur = store.get(id);
      if (cur) store.set(id, { ...cur, folderId, updatedAt: Date.now() });
    }
    persist();
  },
  removeMany(ids: string[]) {
    for (const id of ids) store.delete(id);
    persist();
  },
};
