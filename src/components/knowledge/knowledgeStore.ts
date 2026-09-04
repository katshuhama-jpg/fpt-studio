// sessionStorage-backed AGENT-level knowledge store — private to one Agent, kept deliberately
// separate from knowledgeBaseStore.ts (the shareable Console-level store). Used by Inventor.tsx
// to seed a knowledge inventory when an agent is scaffolded, and by AgentBuilder.tsx's
// KnowledgeTab for the Agent's own upload/website/FAQ items plus its linked Console KBs.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { knowledgeBaseStore, CURRENT_USER, type Sharing, type KnowledgeBaseType } from "./knowledgeBaseStore";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeFaqStore } from "./knowledgeFaqStore";
import type { KnowledgeProcessingStatus } from "./knowledgeStatus";

export type KnowledgeKind = "doc" | "url" | "faq";

export interface KnowledgeItem {
  id: string;
  agentId: string;
  name: string;
  kind: KnowledgeKind;
  description: string;
  status?: KnowledgeProcessingStatus;
  chunkCount?: number;
  sizeBytes?: number;
  version?: number;
  /** Management-access sharing for this specific item, same model as a Console KB's sharing —
   * distinct from "linking" a Console KB to an Agent (that's attachConsoleKb below). Absent
   * means private ("Chỉ mình tôi"). */
  sharing?: Sharing;
  createdAt?: number;
  updatedAt: number;
}

const STORE_KEY = "agent_knowledge_store_v1";
const ATTACHED_KEY = "agent_knowledge_attached_v1";
const store = loadMap<string, KnowledgeItem>(STORE_KEY);
const attached = loadMap<string, string[]>(ATTACHED_KEY);
const k = (a: string, id: string) => `${a}:${id}`;
const persist = () => saveMap(STORE_KEY, store);
const persistAttached = () => saveMap(ATTACHED_KEY, attached);
const normalize = (i: KnowledgeItem): KnowledgeItem => (i.createdAt ? i : { ...i, createdAt: i.updatedAt });

export const knowledgeStore = {
  list(agentId: string): KnowledgeItem[] {
    return [...store.values()]
      .filter(i => i.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(normalize);
  },
  get(agentId: string, id: string): KnowledgeItem | undefined {
    const item = store.get(k(agentId, id));
    return item ? normalize(item) : undefined;
  },
  add(agentId: string, item: Omit<KnowledgeItem, "id" | "agentId" | "updatedAt">) {
    const id = `kn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const rec: KnowledgeItem = { status: "pending", version: 1, ...item, id, agentId, createdAt: now, updatedAt: now };
    store.set(k(agentId, id), rec);
    persist();
    return rec;
  },
  updateStatus(agentId: string, id: string, status: KnowledgeProcessingStatus, patch?: Partial<Pick<KnowledgeItem, "chunkCount">>) {
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
