// Per-AGENT knowledge ATTACHMENT layer — this file stores no document/URL/FAQ content of its
// own. Every document, URL, and FAQ lives in exactly one Console Knowledge Base (see
// knowledgeBaseStore.ts / knowledgeDocumentStore.ts / knowledgeUrlStore.ts / knowledgeFaqStore.ts)
// — someone's personal "Cá nhân" KB, or a named one they created. An Agent "has" a piece of
// knowledge purely by that item's `attachedAgentIds` including this Agent's id, whether that
// attachment came from linking a whole KB (attachConsoleKb explodes every item in it) or from
// creating something directly on this Agent's Knowledge screen (which files it into the
// creator's Cá nhân KB and attaches it here in the same step — see createDocument/createUrl/
// createFaq below). "Gỡ khỏi Agent" only ever removes this Agent's id from that list; the
// underlying item is untouched and keeps living in its KB.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";
import { knowledgeBaseStore, CURRENT_USER, type Sharing, type KnowledgeBase } from "./knowledgeBaseStore";
import { knowledgeDocumentStore, type KnowledgeDocument } from "./knowledgeDocumentStore";
import { knowledgeUrlStore, type KnowledgeUrl } from "./knowledgeUrlStore";
import { knowledgeFaqStore, type KnowledgeFaq, type CategoryOption } from "./knowledgeFaqStore";
import type { KnowledgeFaqStatus } from "./knowledgeStatus";
import { type SemVer } from "./semver";

export type KnowledgeKind = "doc" | "url" | "faq";

/** Normalized shape the Knowledge screens render, regardless of which of the 3 content stores
 * a row actually lives in. */
export interface AgentKnowledgeRow {
  kind: KnowledgeKind;
  id: string;
  kbId: string;
  kbName: string;
  kbIsDefault: boolean;
  name: string;
  description: string;
  status: KnowledgeFaqStatus;
  statusReason?: string;
  chunkCount: number;
  sizeBytes?: number;
  version?: SemVer;
  sharing?: Sharing;
  querySharing?: Sharing;
  categories?: string[];
  /** Every Agent id currently attached to this item (including the one being queried for). */
  attachedAgentIds: string[];
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

/** Bookkeeping-only: which whole Console KBs an Agent has bulk-linked via "Liên kết kho tri thức
 * có sẵn" — used solely so that modal can grey out/hide KBs already linked. It does NOT drive
 * what shows in the Agent's knowledge table (that's `attachedAgentIds` on each real item,
 * populated in bulk by attachConsoleKb below); a document added to a KB after it was linked
 * won't retroactively appear for the Agent unless linked again. */
const LINKED_KEY = "agent_knowledge_linked_kbs_v1";
const linkedKbs = loadMap<string, string[]>(LINKED_KEY);
const persistLinked = () => saveMap(LINKED_KEY, linkedKbs);

function toDocRow(d: KnowledgeDocument, kb: KnowledgeBase): AgentKnowledgeRow {
  return {
    kind: "doc", id: d.id, kbId: kb.id, kbName: kb.name, kbIsDefault: !!kb.isDefault,
    name: d.name, description: "", status: d.status, statusReason: d.statusReason,
    chunkCount: d.chunkCount, sizeBytes: d.sizeBytes, version: d.version,
    sharing: d.sharing, querySharing: d.querySharing,
    attachedAgentIds: d.attachedAgentIds ?? [], createdAt: d.createdAt, updatedAt: d.updatedAt, updatedBy: d.updatedBy,
  };
}
function toUrlRow(u: KnowledgeUrl, kb: KnowledgeBase): AgentKnowledgeRow {
  return {
    kind: "url", id: u.id, kbId: kb.id, kbName: kb.name, kbIsDefault: !!kb.isDefault,
    name: u.name, description: "", status: u.status, statusReason: u.lastSyncError,
    chunkCount: u.chunkCount, version: u.version,
    sharing: u.sharing, querySharing: u.querySharing,
    attachedAgentIds: u.attachedAgentIds ?? [], createdAt: u.createdAt, updatedAt: u.updatedAt, updatedBy: u.updatedBy,
  };
}
function toFaqRow(f: KnowledgeFaq, kb: KnowledgeBase): AgentKnowledgeRow {
  return {
    kind: "faq", id: f.id, kbId: kb.id, kbName: kb.name, kbIsDefault: !!kb.isDefault,
    name: f.question, description: f.answer, status: f.status, statusReason: f.statusReason,
    chunkCount: f.chunkCount, categories: f.categories,
    sharing: f.sharing, querySharing: f.querySharing,
    attachedAgentIds: f.attachedAgentIds ?? [], createdAt: f.updatedAt, updatedAt: f.updatedAt, updatedBy: f.updatedBy,
  };
}

const DEMO_SEEDED_KEY = "agent_knowledge_demo_seeded_v1";

/** Demo data so a fresh visit to a known seeded Agent's Knowledge screen shows real rows across
 * every status and both attachment mechanisms — a whole linked KB and directly-created content
 * filed into the creator's personal KB — instead of a permanent empty state. Runs once per
 * agentId. */
function seedAgentDemo(agentId: string) {
  const seeded = loadSet<string>(DEMO_SEEDED_KEY);
  if (seeded.has(agentId)) return;
  seeded.add(agentId);
  saveSet(DEMO_SEEDED_KEY, seeded);

  if (agentId === "cskh") {
    knowledgeStore.attachConsoleKb(agentId, "kb-1");
    knowledgeStore.attachConsoleKb(agentId, "kb-2");

    const d1 = knowledgeStore.createDocument(agentId, { name: "Kịch bản trả lời khiếu nại.pdf", sizeBytes: 480_000 });
    knowledgeDocumentStore.updateStatus(d1.id, "done", { chunkCount: 12 });
    const d2 = knowledgeStore.createDocument(agentId, { name: "Quy trình xử lý phàn nàn qua tổng đài.xlsx", sizeBytes: 3_200_000 });
    knowledgeDocumentStore.updateStatus(d2.id, "failed", { statusReason: "Không đọc được nội dung tệp. Thử tải lại hoặc dùng bản PDF." });
    const u1 = knowledgeStore.createUrl(agentId, { url: "https://abcbank.com/cskh/lien-he", source: "specified" });
    knowledgeUrlStore.updateStatus(u1.id, "processing");
    knowledgeStore.createFaq(agentId, { question: "Thời gian phản hồi khiếu nại tối đa là bao lâu?", answer: "Ngân hàng cam kết phản hồi trong vòng 48 giờ làm việc kể từ khi tiếp nhận khiếu nại.", categories: [] });
  }

  if (agentId === "hr") {
    const d1 = knowledgeStore.createDocument(agentId, { name: "Checklist ngày đầu tiên.pdf", sizeBytes: 150_000 });
    knowledgeDocumentStore.updateStatus(d1.id, "done", { chunkCount: 6 });
    const u1 = knowledgeStore.createUrl(agentId, { url: "https://intranet.abc.com/hr/quy-dinh-nghi-phep", source: "specified" });
    knowledgeUrlStore.updateStatus(u1.id, "done", { chunkCount: 4 });
    knowledgeStore.createFaq(agentId, { question: "Bảo hiểm y tế cho nhân viên mới bắt đầu từ khi nào?", answer: "Bảo hiểm y tế được kích hoạt từ ngày ký hợp đồng chính thức, sau thời gian thử việc.", categories: [] });
  }
}

export const knowledgeStore = {
  /** Every document/URL/FAQ currently attached to this Agent, across every KB — the single read
   * model behind both the full "Tri thức của Agent" table and the Instructions sidebar panel. */
  listForAgent(agentId: string): AgentKnowledgeRow[] {
    seedAgentDemo(agentId);
    const rows: AgentKnowledgeRow[] = [];
    for (const kb of knowledgeBaseStore.list()) {
      for (const d of knowledgeDocumentStore.list(kb.id)) {
        if (!d.isFolder && d.attachedAgentIds?.includes(agentId)) rows.push(toDocRow(d, kb));
      }
      for (const u of knowledgeUrlStore.list(kb.id)) {
        if (!u.isFolder && u.attachedAgentIds?.includes(agentId)) rows.push(toUrlRow(u, kb));
      }
      for (const f of knowledgeFaqStore.list(kb.id)) {
        if (f.attachedAgentIds?.includes(agentId)) rows.push(toFaqRow(f, kb));
      }
    }
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(agentId: string, kind: KnowledgeKind, id: string): AgentKnowledgeRow | undefined {
    return this.listForAgent(agentId).find(r => r.kind === kind && r.id === id);
  },

  /** Creates a new document filed into the creator's personal "Cá nhân" KB and attaches it to
   * this Agent in the same step. */
  createDocument(agentId: string, data: { name: string; sizeBytes: number; sharing?: Sharing; querySharing?: Sharing }): KnowledgeDocument {
    const kb = knowledgeBaseStore.getOrCreatePersonalKb();
    return knowledgeDocumentStore.addDocument(kb.id, { ...data, folderId: null, attachedAgentIds: [agentId] });
  },
  createUrl(agentId: string, data: { url: string; source: "specified" | "crawled_child" | "sitemap" }): KnowledgeUrl {
    const kb = knowledgeBaseStore.getOrCreatePersonalKb();
    return knowledgeUrlStore.addUrl(kb.id, { ...data, attachedAgentIds: [agentId] });
  },
  createFaq(agentId: string, data: { question: string; answer: string; categories: string[] }): KnowledgeFaq {
    const kb = knowledgeBaseStore.getOrCreatePersonalKb();
    return knowledgeFaqStore.create(kb.id, { ...data, attachedAgentIds: [agentId] });
  },

  updateSharing(kind: KnowledgeKind, id: string, sharing: Sharing) {
    if (kind === "doc") knowledgeDocumentStore.updateSharing(id, sharing);
    else if (kind === "url") knowledgeUrlStore.updateSharing(id, sharing);
    else knowledgeFaqStore.updateSharing(id, sharing);
  },
  updateQueryScope(kind: KnowledgeKind, id: string, querySharing: Sharing) {
    if (kind === "doc") knowledgeDocumentStore.updateQueryScope(id, querySharing);
    else if (kind === "url") knowledgeUrlStore.updateQueryScope(id, querySharing);
    else knowledgeFaqStore.updateQueryScope(id, querySharing);
  },
  /** "Gỡ khỏi Agent" — removes only this Agent's attachment; the item stays in its KB untouched. */
  detachFromAgent(agentId: string, kind: KnowledgeKind, id: string) {
    if (kind === "doc") knowledgeDocumentStore.detachFromAgent(id, agentId);
    else if (kind === "url") knowledgeUrlStore.detachFromAgent(id, agentId);
    else knowledgeFaqStore.detachFromAgent(id, agentId);
  },
  /** "Xóa hẳn" — permanently deletes the item everywhere (every Agent and KB referencing it). */
  deleteEverywhere(kind: KnowledgeKind, id: string) {
    if (kind === "doc") knowledgeDocumentStore.removeMany([id]);
    else if (kind === "url") knowledgeUrlStore.removeMany([id]);
    else knowledgeFaqStore.removeMany([id]);
  },
  /** "Xử lý lại" — dispatches to each store's own reprocess semantics: a document/URL always
   * accepts a reprocess; a FAQ only re-queues when it's currently "failed" (see
   * knowledgeFaqStore.reprocess's own rule — "invalid" content needs an edit first). */
  reprocess(kind: KnowledgeKind, id: string) {
    if (kind === "doc") knowledgeDocumentStore.reprocess(id);
    else if (kind === "url") knowledgeUrlStore.updateStatus(id, "pending");
    else knowledgeFaqStore.reprocess(id);
  },

  /** Category typeahead options for this Agent's "Tạo FAQ" dialog — every category already used
   * across the Agent's attached FAQs. */
  listFaqCategoriesWithCounts(agentId: string): CategoryOption[] {
    const counts = new Map<string, number>();
    for (const row of this.listForAgent(agentId)) {
      if (row.kind !== "faq") continue;
      for (const c of row.categories ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
  /** Exact-match (case-insensitive, trimmed) duplicate check across every FAQ already attached
   * to this Agent — used only while creating a brand-new one from the Agent's Knowledge screen. */
  findFaqDuplicate(agentId: string, question: string): boolean {
    const norm = question.trim().toLowerCase();
    if (!norm) return false;
    return this.listForAgent(agentId).some(r => r.kind === "faq" && r.name.trim().toLowerCase() === norm);
  },

  // --- Linked Console Knowledge Bases (bookkeeping only, see LINKED_KEY above) ---
  listAttachedConsoleKbIds(agentId: string): string[] {
    return linkedKbs.get(agentId) ?? [];
  },
  /** "Liên kết kho tri thức có sẵn" — attaches every document/URL/FAQ currently in this KB to
   * the Agent in one shot (a one-time explosion, not a live subscription: content added to the
   * KB afterwards needs linking again to reach this Agent). */
  attachConsoleKb(agentId: string, kbId: string) {
    const cur = new Set(linkedKbs.get(agentId) ?? []);
    cur.add(kbId);
    linkedKbs.set(agentId, [...cur]);
    persistLinked();
    knowledgeBaseStore.addAttachingAgent(kbId, agentId);
    for (const d of knowledgeDocumentStore.list(kbId)) if (!d.isFolder) knowledgeDocumentStore.attachToAgent(d.id, agentId);
    for (const u of knowledgeUrlStore.list(kbId)) if (!u.isFolder) knowledgeUrlStore.attachToAgent(u.id, agentId);
    for (const f of knowledgeFaqStore.list(kbId)) knowledgeFaqStore.attachToAgent(f.id, agentId);
  },
};

export { CURRENT_USER };
