// sessionStorage-backed Website (URL) store for a Console Knowledge Base's "Website" tab.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";
import type { ScheduleConfig } from "./knowledgeSettingsStore";

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
  version: number;
  lastSyncAt: number | null;
  lastSyncOk: boolean | null;
  lastSyncError?: string;
  scheduleOverride?: UrlScheduleOverride;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

const STORE_KEY = "knowledge_url_store_v1";
const SEEDED_KEY = "knowledge_url_store_seeded_v1";
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
    put({ id: "url-1-f1", kbId, name: "abcbank.com/products (sitemap)", isFolder: true, folderId: null, status: "done", chunkCount: 0, version: 1, lastSyncAt: null, lastSyncOk: null, createdAt: now - 2 * DAY, updatedAt: now - 2 * DAY, updatedBy: "Tran Nam" });
    put({ id: "url-1-1", kbId, name: "Sản phẩm vay mua nhà", isFolder: false, folderId: "url-1-f1", url: "https://abcbank.com/products/vay-mua-nha", title: "Sản phẩm vay mua nhà", source: "sitemap", status: "done", chunkCount: 22, version: 1, lastSyncAt: now - 2 * HOUR, lastSyncOk: true, createdAt: now - 2 * DAY, updatedAt: now - 2 * HOUR, updatedBy: "Tran Nam" });
    put({ id: "url-1-2", kbId, name: "Sản phẩm thẻ tín dụng", isFolder: false, folderId: "url-1-f1", url: "https://abcbank.com/products/the-tin-dung", title: "Sản phẩm thẻ tín dụng", source: "sitemap", status: "done", chunkCount: 19, version: 2, lastSyncAt: now - 2 * HOUR, lastSyncOk: true, createdAt: now - 2 * DAY, updatedAt: now - 2 * HOUR, updatedBy: "Tran Nam" });
    put({ id: "url-1-3", kbId, name: "Trang chủ ABC Bank", isFolder: false, folderId: null, url: "https://abcbank.com", title: "ABC Bank — Ngân hàng số hàng đầu", source: "specified", status: "failed", chunkCount: 0, version: 1, lastSyncAt: now - 6 * HOUR, lastSyncOk: false, lastSyncError: "Không kết nối được tới máy chủ.", createdAt: now - 6 * HOUR, updatedAt: now - 6 * HOUR, updatedBy: "Tran Nam" });
    put({ id: "url-1-4", kbId, name: "Câu hỏi thường gặp", isFolder: false, folderId: null, url: "https://abcbank.com/faq", title: "Câu hỏi thường gặp — ABC Bank", source: "crawled_child", status: "processing", chunkCount: 0, version: 1, lastSyncAt: null, lastSyncOk: null, createdAt: now - 5 * 60_000, updatedAt: now - 5 * 60_000, updatedBy: "Tran Nam" });
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
  createFolder(kbId: string, name: string): KnowledgeUrl {
    const id = `url-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeUrl = {
      id, kbId, name: name.trim(), isFolder: true, folderId: null, status: "done",
      chunkCount: 0, version: 1, lastSyncAt: null, lastSyncOk: null,
      createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  addUrl(kbId: string, data: { url: string; source: UrlSource; folderId?: string | null }): KnowledgeUrl {
    const id = `url-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeUrl = {
      id, kbId, name: data.url, isFolder: false, folderId: data.folderId ?? null,
      url: data.url, title: data.url.replace(/^https?:\/\//, ""), source: data.source,
      status: "pending", chunkCount: 0, version: 1,
      lastSyncAt: null, lastSyncOk: null, createdAt: now, updatedAt: now, updatedBy: "Tran Nam",
    };
    store.set(id, rec);
    persist();
    return rec;
  },
  updateStatus(id: string, status: KnowledgeProcessingStatus, patch?: Partial<Pick<KnowledgeUrl, "chunkCount" | "lastSyncAt" | "lastSyncOk" | "lastSyncError">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status, ...patch, updatedAt: Date.now() });
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
    store.set(id, { ...cur, version: cur.version + 1, updatedAt: Date.now(), updatedBy: "Tran Nam" });
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
