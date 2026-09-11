// sessionStorage-backed Website (URL) store for a Console Knowledge Base's "Website" tab.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";
import type { ScheduleConfig } from "./knowledgeSettingsStore";
import { INITIAL_VERSION, bumpMinor, bumpPatch, type SemVer } from "./semver";
import type { Sharing } from "./knowledgeBaseStore";

export type UrlSource = "specified" | "crawled_child" | "sitemap";

export interface UrlScheduleOverride {
  enabled: boolean;
  schedule: ScheduleConfig;
}

export interface KnowledgeUrl {
  id: string;
  kbId: string;
  name: string; // folder name when isFolder
  isFolder: boolean;
  folderId: string | null;
  url?: string;
  title?: string;
  source?: UrlSource;
  status: KnowledgeProcessingStatus;
  chunkCount: number;
  version: SemVer;
  lastSyncAt: number | null;
  lastSyncOk: boolean | null;
  lastSyncError?: string;
  scheduleOverride?: UrlScheduleOverride;
  /** Console-management access — same model/meaning as a Document's own `sharing` field. */
  sharing?: Sharing;
  /** Chat-time query scope — same model/meaning as a Document's own `querySharing` field. */
  querySharing?: Sharing;
  /** Agent ids currently relying on this URL — same meaning as KnowledgeDocument's field. */
  attachedAgentIds?: string[];
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

const STORE_KEY = "knowledge_url_store_v5";
const SEEDED_KEY = "knowledge_url_store_seeded_v5";
const store = loadMap<string, KnowledgeUrl>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seedKb(kbId: string) {
  const flagKey = `${SEEDED_KEY}:${kbId}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  const now = Date.now();
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  const put = (u: KnowledgeUrl) => store.set(u.id, u);

  if (kbId === "kb-1") {
    put({ id: "url-1-f1", kbId, name: "abcbank.com/products (sitemap)", isFolder: true, folderId: null, status: "done", chunkCount: 0, version: INITIAL_VERSION, lastSyncAt: null, lastSyncOk: null, createdAt: now - 2 * DAY, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "url-1-1", kbId, name: "Sản phẩm vay mua nhà", isFolder: false, folderId: "url-1-f1", url: "https://abcbank.com/products/vay-mua-nha", title: "Sản phẩm vay mua nhà", source: "sitemap", status: "done", chunkCount: 22, version: INITIAL_VERSION, lastSyncAt: now - 2 * HOUR, lastSyncOk: true, createdAt: now - 2 * DAY, updatedAt: now - 2 * HOUR, updatedBy: "Tran Nam" });
    put({ id: "url-1-2", kbId, name: "Sản phẩm thẻ tín dụng", isFolder: false, folderId: "url-1-f1", url: "https://abcbank.com/products/the-tin-dung", title: "Sản phẩm thẻ tín dụng", source: "sitemap", status: "done", chunkCount: 19, version: { major: 1, minor: 1, patch: 0 }, lastSyncAt: now - 2 * HOUR, lastSyncOk: true, createdAt: now - 2 * DAY, updatedAt: now - 2 * HOUR, updatedBy: "Tran Nam" });
    put({ id: "url-1-3", kbId, name: "Trang chủ ABC Bank", isFolder: false, folderId: null, url: "https://abcbank.com", title: "ABC Bank — Ngân hàng số hàng đầu", source: "specified", status: "failed", chunkCount: 0, version: INITIAL_VERSION, lastSyncAt: now - 6 * HOUR, lastSyncOk: false, lastSyncError: "Không kết nối được tới máy chủ.", createdAt: now - 6 * HOUR, updatedAt: now - 6 * HOUR, updatedBy: "Tran Nam" });
    put({ id: "url-1-4", kbId, name: "Câu hỏi thường gặp", isFolder: false, folderId: null, url: "https://abcbank.com/faq", title: "Câu hỏi thường gặp — ABC Bank", source: "crawled_child", status: "processing", chunkCount: 0, version: INITIAL_VERSION, lastSyncAt: null, lastSyncOk: null, createdAt: now - 5 * 60_000, updatedAt: now - 5 * 60_000, updatedBy: "Tran Nam" });
  }

  // kb-4 "Chính sách nhân sự" — shared to Tran Nam by Linh Phan with "Có thể xem" access.
  if (kbId === "kb-4") {
    put({ id: "url-4-1", kbId, name: "Chính sách nghỉ phép", isFolder: false, folderId: null, url: "https://intranet.abc.com/hr/chinh-sach-nghi-phep", title: "Chính sách nghỉ phép", source: "specified", status: "done", chunkCount: 9, version: INITIAL_VERSION, lastSyncAt: now - 4 * HOUR, lastSyncOk: true, createdAt: now - 12 * DAY, updatedAt: now - 4 * HOUR, updatedBy: "Linh Phan" });
    put({ id: "url-4-2", kbId, name: "Phúc lợi nhân viên", isFolder: false, folderId: null, url: "https://intranet.abc.com/hr/phuc-loi-nhan-vien", title: "Phúc lợi nhân viên", source: "specified", status: "processing", chunkCount: 0, version: INITIAL_VERSION, lastSyncAt: null, lastSyncOk: null, createdAt: now - 12 * 60_000, updatedAt: now - 12 * 60_000, updatedBy: "Linh Phan" });
  }

  persist();
}

// Normalizes records created before `createdAt` existed on this store (stale sessionStorage
// data from earlier in development) so components can always assume the field is present.
const normalize = (u: KnowledgeUrl): KnowledgeUrl => (u.createdAt ? u : { ...u, createdAt: u.updatedAt });

export const knowledgeUrlStore = {
  list(kbId: string): KnowledgeUrl[] {
    seedKb(kbId);
    return [...store.values()]
      .filter(u => u.kbId === kbId)
      .sort((a, b) => (b.isFolder ? 1 : 0) - (a.isFolder ? 1 : 0) || b.updatedAt - a.updatedAt)
      .map(normalize);
  },
  get(kbId: string, id: string): KnowledgeUrl | undefined {
    seedKb(kbId);
    const u = store.get(id);
    return u ? normalize(u) : undefined;
  },
  listFolders(kbId: string): KnowledgeUrl[] {
    return this.list(kbId).filter(u => u.isFolder);
  },
  isDuplicate(kbId: string, url: string): boolean {
    const n = url.trim().toLowerCase();
    return this.list(kbId).some(u => !u.isFolder && u.url?.trim().toLowerCase() === n);
  },
  isDuplicateFolderName(kbId: string, name: string, parentFolderId: string | null, excludeId?: string): boolean {
    return this.list(kbId).some(u => u.isFolder && u.id !== excludeId && u.folderId === parentFolderId && u.name.trim().toLowerCase() === name.trim().toLowerCase());
  },
  /** Every folder id nested (at any depth) under `folderId` — used to keep a folder from being
   * moved into itself or one of its own descendants. */
  getDescendantFolderIds(kbId: string, folderId: string): Set<string> {
    const all = this.list(kbId);
    const result = new Set<string>();
    const queue = [folderId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const u of all) {
        if (u.isFolder && u.folderId === cur && !result.has(u.id)) {
          result.add(u.id);
          queue.push(u.id);
        }
      }
    }
    return result;
  },
  /** Total non-folder URLs nested (at any depth) under `folderId` — drives the delete
   * confirmation's cascade count. */
  countUrlsInFolder(kbId: string, folderId: string): number {
    const descendantFolders = this.getDescendantFolderIds(kbId, folderId);
    descendantFolders.add(folderId);
    return this.list(kbId).filter(u => !u.isFolder && u.folderId !== null && descendantFolders.has(u.folderId)).length;
  },
  /** Deletes a folder and everything nested inside it (sub-folders and URLs alike). */
  removeFolderCascade(kbId: string, folderId: string) {
    const descendantFolders = this.getDescendantFolderIds(kbId, folderId);
    descendantFolders.add(folderId);
    const ids = this.list(kbId).filter(u => u.id === folderId || (u.folderId !== null && descendantFolders.has(u.folderId))).map(u => u.id);
    this.removeMany(ids);
  },
  createFolder(kbId: string, name: string): KnowledgeUrl {
    const id = `url-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeUrl = {
      id, kbId, name: name.trim(), isFolder: true, folderId: null, status: "done",
      chunkCount: 0, version: INITIAL_VERSION, lastSyncAt: null, lastSyncOk: null,
      createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  addUrl(kbId: string, data: { url: string; source: UrlSource; folderId?: string | null; sharing?: Sharing; querySharing?: Sharing; attachedAgentIds?: string[] }): KnowledgeUrl {
    const id = `url-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeUrl = {
      id, kbId, name: data.url, isFolder: false, folderId: data.folderId ?? null,
      url: data.url, title: data.url.replace(/^https?:\/\//, ""), source: data.source,
      status: "pending", chunkCount: 0, version: INITIAL_VERSION,
      sharing: data.sharing, querySharing: data.querySharing, attachedAgentIds: data.attachedAgentIds,
      lastSyncAt: null, lastSyncOk: null, createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  updateStatus(id: string, status: KnowledgeProcessingStatus, patch?: Partial<Pick<KnowledgeUrl, "chunkCount" | "lastSyncAt" | "lastSyncOk" | "lastSyncError">>) {
    const cur = store.get(id);
    if (!cur) return;
    // A completed re-sync of content that has already synced at least once before is a content
    // change — bump minor, same as a document reprocess. The very first sync ever (lastSyncAt
    // still null going in) just reaches 1.0.0, no bump.
    const isResync = status === "done" && cur.lastSyncAt !== null;
    store.set(id, { ...cur, status, ...patch, version: isResync ? bumpMinor(cur.version) : cur.version, updatedAt: Date.now() });
    persist();
  },
  rename(id: string, name: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, name: name.trim(), updatedAt: Date.now() });
    persist();
  },
  setScheduleOverride(id: string, override: UrlScheduleOverride | undefined) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, scheduleOverride: override, updatedAt: Date.now() });
    persist();
  },
  restoreVersion(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, version: bumpMinor(cur.version), updatedAt: Date.now(), updatedBy: "Tran Nam" });
    persist();
  },
  /** A manual chunk edit doesn't re-sync the whole page, so it only bumps patch (not minor). */
  bumpPatchVersion(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, version: bumpPatch(cur.version), updatedAt: Date.now() });
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
  /** Links this URL to an Agent without moving or copying it — see attachedAgentIds. */
  attachToAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur || cur.attachedAgentIds?.includes(agentId)) return;
    store.set(id, { ...cur, attachedAgentIds: [...(cur.attachedAgentIds ?? []), agentId] });
    persist();
  },
  /** "Gỡ khỏi Agent" — the URL stays exactly where it is, only this Agent stops using it. */
  detachFromAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, attachedAgentIds: (cur.attachedAgentIds ?? []).filter(a => a !== agentId) });
    persist();
  },
};
