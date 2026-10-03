// What part of a linked Space knowledge base an Agent uses.
// "all": every document, website and FAQ in the KB, including content added later.
// "partial": only the chosen items. A chosen folder covers everything inside it, including
// documents added to that folder later. FAQs are chosen by category (UNCATEGORIZED_FAQ for
// questions without one).
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeFaqStore } from "./knowledgeFaqStore";

export interface KbLinkScope {
  mode: "all" | "partial";
  docIds: string[];
  urlIds: string[];
  faqCategories: string[];
}

/** LATER: linking only some folders, documents, websites or FAQ categories of a Space knowledge
 * base. Off for now - an Agent links whole knowledge bases only, and any stored partial scope is
 * read as the whole knowledge base. The scope code stays so turning this on brings it back. */
export const PARTIAL_LINK_ENABLED = false;

export const UNCATEGORIZED_FAQ = "__none__";
export const UNCATEGORIZED_FAQ_LABEL = "Chưa có danh mục";
export const FULL_SCOPE: KbLinkScope = { mode: "all", docIds: [], urlIds: [], faqCategories: [] };

type Node = { id: string; isFolder: boolean; folderId: string | null };

/** True when `id` or one of its parent folders is in `selected`. */
export function coveredBy(nodes: Node[], selected: Set<string>, id: string): boolean {
  const byId = new Map(nodes.map(n => [n.id, n]));
  let cur = byId.get(id);
  while (cur) {
    if (selected.has(cur.id)) return true;
    cur = cur.folderId ? byId.get(cur.folderId) : undefined;
  }
  return false;
}

const faqKeys = (categories: string[]) => (categories.length ? categories : [UNCATEGORIZED_FAQ]);

/** Drops ids/categories that no longer exist in the knowledge base. */
export function pruneScope(kbId: string, scope: KbLinkScope): KbLinkScope {
  if (scope.mode === "all") return scope;
  const docIds = new Set(knowledgeDocumentStore.list(kbId).map(d => d.id));
  const urlIds = new Set(knowledgeUrlStore.list(kbId).map(u => u.id));
  const cats = new Set(knowledgeFaqStore.list(kbId).flatMap(f => faqKeys(f.categories)));
  return {
    mode: "partial",
    docIds: scope.docIds.filter(id => docIds.has(id)),
    urlIds: scope.urlIds.filter(id => urlIds.has(id)),
    faqCategories: scope.faqCategories.filter(c => cats.has(c)),
  };
}

export function scopeItemCount(scope: KbLinkScope): number {
  return scope.docIds.length + scope.urlIds.length + scope.faqCategories.length;
}

/** Short label for a chip or a row: "Toàn bộ kho" / "8 mục được chọn". */
export function scopeLabel(kbId: string, scope: KbLinkScope): { label: string; empty: boolean } {
  if (scope.mode === "all") return { label: "Toàn bộ kho", empty: false };
  const n = scopeItemCount(pruneScope(kbId, scope));
  return n === 0 ? { label: "Chưa chọn mục nào", empty: true } : { label: `${n} mục được chọn`, empty: false };
}

export function isDocInScope(kbId: string, scope: KbLinkScope, docId: string): boolean {
  if (scope.mode === "all") return true;
  return coveredBy(knowledgeDocumentStore.list(kbId), new Set(scope.docIds), docId);
}

/** A folder stays reachable when it is covered itself or holds something that is. */
export function isDocFolderVisible(kbId: string, scope: KbLinkScope, folderId: string): boolean {
  if (scope.mode === "all") return true;
  if (isDocInScope(kbId, scope, folderId)) return true;
  const inside = knowledgeDocumentStore.getDescendantFolderIds(kbId, folderId);
  inside.add(folderId);
  return knowledgeDocumentStore.list(kbId).some(d => d.folderId && inside.has(d.folderId) && scope.docIds.includes(d.id));
}

export function isUrlInScope(kbId: string, scope: KbLinkScope, urlId: string): boolean {
  if (scope.mode === "all") return true;
  return coveredBy(knowledgeUrlStore.list(kbId), new Set(scope.urlIds), urlId);
}

export function isFaqInScope(scope: KbLinkScope, categories: string[]): boolean {
  if (scope.mode === "all") return true;
  return faqKeys(categories).some(c => scope.faqCategories.includes(c));
}
