// sessionStorage-backed sitemap-subscription store for a Console Knowledge Base's "Website"
// tab — tracks the sitemap.xml feeds registered for auto-discovery, independent of the
// individual URLs they've produced (those live in knowledgeUrlStore, tagged source: "sitemap").
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";

export interface KnowledgeSitemap {
  id: string;
  kbId: string;
  url: string;
  status: KnowledgeProcessingStatus;
  urlsDiscovered: number;
  lastSyncAt: number | null;
  createdAt: number;
}

const STORE_KEY = "knowledge_sitemap_store_v1";
const SEEDED_KEY = "knowledge_sitemap_store_seeded_v1";
const store = loadMap<string, KnowledgeSitemap>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seedKb(kbId: string) {
  const flagKey = `${SEEDED_KEY}:${kbId}`;
  if (sessionStorage.getItem(flagKey)) return;
  sessionStorage.setItem(flagKey, "1");
  if (kbId === "kb-1") {
    const now = Date.now();
    const HOUR = 3_600_000;
    const DAY = 86_400_000;
    store.set("sitemap-1-1", {
      id: "sitemap-1-1", kbId, url: "https://abcbank.com/sitemap.xml",
      status: "done", urlsDiscovered: 2, lastSyncAt: now - 2 * HOUR, createdAt: now - 2 * DAY,
    });
    persist();
  }
}

export const knowledgeSitemapStore = {
  list(kbId: string): KnowledgeSitemap[] {
    seedKb(kbId);
    return [...store.values()].filter(s => s.kbId === kbId).sort((a, b) => b.createdAt - a.createdAt);
  },
  add(kbId: string, url: string, urlsDiscovered: number): KnowledgeSitemap {
    const id = `sitemap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const now = Date.now();
    const rec: KnowledgeSitemap = { id, kbId, url, status: "done", urlsDiscovered, lastSyncAt: now, createdAt: now };
    store.set(id, rec);
    persist();
    return rec;
  },
  syncNow(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status: "processing" });
    persist();
  },
  markSynced(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, status: "done", lastSyncAt: Date.now() });
    persist();
  },
  remove(id: string) {
    store.delete(id);
    persist();
  },
};
