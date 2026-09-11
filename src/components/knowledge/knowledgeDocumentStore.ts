// sessionStorage-backed Documents store for a Console Knowledge Base's "Tài liệu" tab.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";
import type { Sharing } from "./knowledgeBaseStore";
import { INITIAL_VERSION, bumpMinor, bumpPatch, type SemVer } from "./semver";

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
  version: SemVer;
  /** Console-management access chosen at upload time — who can see/edit/delete this document in
   * Console (defaults to "Chỉ mình tôi" when unset). A folder carries one too, applied by default
   * to documents uploaded into it (see CreateFolderModal / knowledgeDocumentStore.createFolder). */
  sharing?: Sharing;
  /** Chat-time query scope — which end-users an Agent may draw on this document's content for
   * when answering, independent of `sharing` above (which only governs Console visibility) and
   * independent of who the Agent itself is published to. Defaults to "Chỉ trả lời cho tôi" when
   * unset. A folder carries one too, applied by default to documents uploaded into it. */
  querySharing?: Sharing;
  /** Agent ids currently relying on this document — populated either by bulk-linking its whole
   * KB to an Agent (knowledgeStore.attachConsoleKb explodes every item in the KB) or by creating
   * the document directly from an Agent's Knowledge screen (which attaches it in the same step).
   * Absent/empty means no Agent currently uses it, even though it still lives in its KB. */
  attachedAgentIds?: string[];
  /** Agent ids that have this document attached (see attachedAgentIds) but currently have its
   * "Kích hoạt" toggle switched off — that Agent stops drawing on this document to answer without
   * detaching it: the document stays listed, stays in its KB, and stays active for every other
   * Agent. Absent/empty means active for every Agent it's attached to. */
  disabledForAgentIds?: string[];
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

const STORE_KEY = "knowledge_document_store_v8";
const SEEDED_KEY = "knowledge_document_store_seeded_v8";
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
    put({ id: "doc-1-f1", kbId, name: "Biểu phí & lãi suất", isFolder: true, folderId: null, status: "done", sizeBytes: 0, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-1", kbId, name: "Biểu lãi suất tiết kiệm 2026.pdf", isFolder: false, folderId: "doc-1-f1", status: "done", sizeBytes: 1_240_000, chunkCount: 42, version: { major: 1, minor: 1, patch: 0 }, createdAt: now - 6 * DAY, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-2", kbId, name: "Chính sách khiếu nại.docx", isFolder: false, folderId: null, status: "done", sizeBytes: 340_000, chunkCount: 18, version: INITIAL_VERSION, createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-3", kbId, name: "Quy trình mở thẻ tín dụng.pdf", isFolder: false, folderId: null, status: "processing", sizeBytes: 2_100_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 5 * 60_000, updatedAt: now - 5 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "doc-1-4", kbId, name: "Sổ tay sản phẩm vay.pptx", isFolder: false, folderId: null, status: "failed", statusReason: "Không đọc được nội dung tệp. Thử tải lại hoặc dùng bản PDF.", sizeBytes: 8_400_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - DAY, updatedAt: now - DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-1-5", kbId, name: "Câu hỏi khiếu nại thường gặp.xlsx", isFolder: false, folderId: null, status: "pending", sizeBytes: 90_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 60_000, updatedAt: now - 60_000, updatedBy: "Tran Nam" });
    // Uploaded by a teammate and shared to the whole Console — demonstrates the "Được chia sẻ
    // với tôi" ownership tab, which would otherwise be permanently empty since every other
    // seeded document in this prototype is uploaded by CURRENT_USER.
    put({ id: "doc-1-6", kbId, name: "Hướng dẫn xác minh danh tính KYC.pdf", isFolder: false, folderId: null, status: "done", sizeBytes: 620_000, chunkCount: 15, version: INITIAL_VERSION, sharing: { mode: "all", people: [] }, createdAt: now - 9 * DAY, updatedAt: now - 9 * DAY, updatedBy: "Linh Phan" });
  }

  if (kbId === "kb-2") {
    put({ id: "doc-2-1", kbId, name: "Kịch bản trả lời khiếu nại qua tổng đài.docx", isFolder: false, folderId: null, status: "done", sizeBytes: 210_000, chunkCount: 14, version: INITIAL_VERSION, createdAt: now - 5 * DAY, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-2-2", kbId, name: "Mẫu email xin lỗi khách hàng.docx", isFolder: false, folderId: null, status: "done", sizeBytes: 85_000, chunkCount: 6, version: INITIAL_VERSION, createdAt: now - 9 * DAY, updatedAt: now - 9 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-2-3", kbId, name: "Quy trình chăm sóc khách hàng VIP.pdf", isFolder: false, folderId: null, status: "processing", sizeBytes: 640_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 10 * 60_000, updatedAt: now - 10 * 60_000, updatedBy: "Tran Nam" });
    put({ id: "doc-2-4", kbId, name: "Bộ câu hỏi khảo sát hài lòng khách hàng.xlsx", isFolder: false, folderId: null, status: "done", sizeBytes: 55_000, chunkCount: 3, version: INITIAL_VERSION, createdAt: now - 14 * DAY, updatedAt: now - 14 * DAY, updatedBy: "Tran Nam" });
  }

  if (kbId === "kb-3") {
    put({ id: "doc-3-1", kbId, name: "Quy trình xử lý sự cố hạ tầng.pdf", isFolder: false, folderId: null, status: "done", sizeBytes: 980_000, chunkCount: 55, version: { major: 1, minor: 2, patch: 0 }, createdAt: now - 9 * DAY, updatedAt: now - 4 * DAY, updatedBy: "Linh Phan" });
    put({ id: "doc-3-2", kbId, name: "Mẫu email thông báo bảo trì.docx", isFolder: false, folderId: null, status: "done", sizeBytes: 60_000, chunkCount: 6, version: INITIAL_VERSION, createdAt: now - 10 * DAY, updatedAt: now - 10 * DAY, updatedBy: "Tran Nam" });
    put({ id: "doc-3-3", kbId, name: "Runbook triển khai phiên bản mới.md", isFolder: false, folderId: null, status: "done", sizeBytes: 120_000, chunkCount: 31, version: { major: 1, minor: 4, patch: 0 }, createdAt: now - 15 * DAY, updatedAt: now - DAY, updatedBy: "Duy Nguyen" });
  }

  // kb-4 "Chính sách nhân sự" — shared to Tran Nam by Linh Phan with "Có thể xem" (view-only)
  // access, used to verify the read-only Documents table state.
  if (kbId === "kb-4") {
    put({ id: "doc-4-1", kbId, name: "Chính sách nghỉ phép 2026.pdf", isFolder: false, folderId: null, status: "done", sizeBytes: 410_000, chunkCount: 28, version: { major: 1, minor: 1, patch: 0 }, createdAt: now - 20 * DAY, updatedAt: now - 3 * DAY, updatedBy: "Linh Phan" });
    put({ id: "doc-4-2", kbId, name: "Bảng lương và phúc lợi.xlsx", isFolder: false, folderId: null, status: "done", sizeBytes: 95_000, chunkCount: 11, version: INITIAL_VERSION, createdAt: now - 18 * DAY, updatedAt: now - 18 * DAY, updatedBy: "Linh Phan" });
    put({ id: "doc-4-3", kbId, name: "Quy trình onboarding nhân viên mới.docx", isFolder: false, folderId: null, status: "processing", sizeBytes: 260_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 15 * 60_000, updatedAt: now - 15 * 60_000, updatedBy: "Linh Phan" });
    put({ id: "doc-4-4", kbId, name: "Hướng dẫn đăng ký bảo hiểm y tế.pdf", isFolder: false, folderId: null, status: "pending", sizeBytes: 180_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 5 * 60_000, updatedAt: now - 5 * 60_000, updatedBy: "Linh Phan" });
    put({ id: "doc-4-5", kbId, name: "Mẫu đơn xin nghỉ phép.docx", isFolder: false, folderId: null, status: "failed", statusReason: "Không đọc được nội dung tệp. Thử tải lại hoặc dùng bản PDF.", sizeBytes: 45_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 2 * DAY, updatedAt: now - 2 * DAY, updatedBy: "Linh Phan" });
  }

  // kb-5 "Kịch bản bán hàng" — shared to Tran Nam by Mai Hoang with "Có thể chỉnh sửa" (edit)
  // access, used to verify the shared-edit Documents table state.
  if (kbId === "kb-5") {
    put({ id: "doc-5-1", kbId, name: "Kịch bản tư vấn khách hàng mới.docx", isFolder: false, folderId: null, status: "done", sizeBytes: 130_000, chunkCount: 16, version: INITIAL_VERSION, createdAt: now - 10 * DAY, updatedAt: now - 4 * DAY, updatedBy: "Mai Hoang" });
    put({ id: "doc-5-2", kbId, name: "Kịch bản xử lý từ chối giá.pdf", isFolder: false, folderId: null, status: "done", sizeBytes: 175_000, chunkCount: 12, version: INITIAL_VERSION, createdAt: now - 8 * DAY, updatedAt: now - 8 * DAY, updatedBy: "Mai Hoang" });
    put({ id: "doc-5-3", kbId, name: "Bộ câu hỏi khảo sát nhu cầu khách hàng.xlsx", isFolder: false, folderId: null, status: "processing", sizeBytes: 62_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 20 * 60_000, updatedAt: now - 20 * 60_000, updatedBy: "Mai Hoang" });
    put({ id: "doc-5-4", kbId, name: "Quy trình chốt đơn qua điện thoại.docx", isFolder: false, folderId: null, status: "pending", sizeBytes: 88_000, chunkCount: 0, version: INITIAL_VERSION, createdAt: now - 8 * 60_000, updatedAt: now - 8 * 60_000, updatedBy: "Mai Hoang" });
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
  createFolder(kbId: string, name: string, folderId: string | null = null, sharing?: Sharing, querySharing?: Sharing): KnowledgeDocument {
    const id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeDocument = {
      id, kbId, name: name.trim(), isFolder: true, folderId, status: "done",
      sizeBytes: 0, chunkCount: 0, version: INITIAL_VERSION, sharing, querySharing,
      createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  /** Updates a folder's own default permission fields — by itself this ONLY changes what future
   * uploads into it will default to (see UploadDocumentsModal, which reads the destination
   * folder's sharing/querySharing to pre-fill its own fields). Pass `applyToExisting: true` to
   * also cascade the new values onto every document already inside the folder (and its
   * subfolders) — an explicit opt-in the caller gets via a confirmation dialog, never silent. */
  updateFolderPermissions(id: string, sharing: Sharing, querySharing: Sharing, applyToExisting: boolean) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, sharing, querySharing, updatedAt: Date.now() });
    if (applyToExisting) {
      const descendantFolders = this.getDescendantFolderIds(cur.kbId, id);
      descendantFolders.add(id);
      for (const d of this.list(cur.kbId)) {
        if (!d.isFolder && d.folderId !== null && descendantFolders.has(d.folderId)) {
          store.set(d.id, { ...d, sharing, querySharing, updatedAt: Date.now() });
        }
      }
    }
    persist();
  },
  addDocument(kbId: string, data: { name: string; sizeBytes: number; folderId: string | null; sharing?: Sharing; querySharing?: Sharing; attachedAgentIds?: string[] }): KnowledgeDocument {
    const id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeDocument = {
      id, kbId, name: data.name, isFolder: false, folderId: data.folderId, status: "pending",
      sizeBytes: data.sizeBytes, chunkCount: 0, version: INITIAL_VERSION,
      sharing: data.sharing, querySharing: data.querySharing, attachedAgentIds: data.attachedAgentIds,
      createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  /** "Ghi đè" on a name-conflicting upload — replaces the content of an existing document in
   * place (same id/row) and bumps its version, restarting the processing pipeline. Sharing is
   * left untouched: overwriting a document's content shouldn't silently change who can access
   * it (that's a separate "Chia sẻ" concern). A full content replace is a minor bump (resets
   * patch), same as any other reprocess. */
  overwriteDocument(id: string, data: { sizeBytes: number }): KnowledgeDocument | undefined {
    const cur = store.get(id);
    if (!cur) return undefined;
    const rec: KnowledgeDocument = {
      ...cur,
      sizeBytes: data.sizeBytes,
      status: "pending",
      statusReason: undefined,
      chunkCount: 0,
      version: bumpMinor(cur.version),
      updatedAt: Date.now(),
      updatedBy: "Tran Nam",
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
  updateSharing(id: string, sharing: Sharing) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, sharing, updatedAt: Date.now() });
    persist();
  },
  updateQueryScope(id: string, querySharing: Sharing) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, querySharing, updatedAt: Date.now() });
    persist();
  },
  /** A manual chunk edit/resize doesn't reprocess the whole document, so it only bumps patch
   * (not minor) — see ChunkViewerModal's saveEdit/applyResize, which call this after persisting
   * the chunk-level change. */
  bumpPatchVersion(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, version: bumpPatch(cur.version), updatedAt: Date.now() });
    persist();
  },
  /** Restoring an older version creates a new version on top (standard versioning behavior —
   * history is never rewritten) — a minor bump, same as any other content-changing event. */
  restoreVersion(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, version: bumpMinor(cur.version), updatedAt: Date.now(), updatedBy: "Tran Nam" });
    persist();
  },
  /** "Xử lý lại" — a full reprocess changes the extracted content, so it's a minor bump (resets
   * patch), same as "Ghi đè"/"Khôi phục". */
  reprocess(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status: "pending", statusReason: undefined, version: bumpMinor(cur.version), updatedAt: Date.now() });
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
  /** Links this document to an Agent without moving or copying it — see attachedAgentIds. */
  attachToAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur || cur.attachedAgentIds?.includes(agentId)) return;
    store.set(id, { ...cur, attachedAgentIds: [...(cur.attachedAgentIds ?? []), agentId] });
    persist();
  },
  /** "Gỡ khỏi Agent" — the document stays exactly where it is, only this Agent stops using it. */
  detachFromAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, {
      ...cur,
      attachedAgentIds: (cur.attachedAgentIds ?? []).filter(a => a !== agentId),
      disabledForAgentIds: (cur.disabledForAgentIds ?? []).filter(a => a !== agentId),
    });
    persist();
  },
  /** "Kích hoạt" toggle — an Agent-level on/off for one Agent's use of this document, distinct
   * from attachedAgentIds (which controls whether it's connected at all). Turning it back on
   * resumes use immediately; no reprocessing needed since the document itself never changed. */
  setEnabledForAgent(id: string, agentId: string, enabled: boolean) {
    const cur = store.get(id);
    if (!cur) return;
    const disabled = new Set(cur.disabledForAgentIds ?? []);
    if (enabled) disabled.delete(agentId); else disabled.add(agentId);
    store.set(id, { ...cur, disabledForAgentIds: [...disabled] });
    persist();
  },
};
