// Minimal in-memory knowledge store. Used so Inventor can commit a knowledge
// inventory to an agent. Full Knowledge tab UI is out of scope for this iteration.

export type KnowledgeKind = "doc" | "url" | "faq";

export interface KnowledgeItem {
  id: string;
  agentId: string;
  name: string;
  kind: KnowledgeKind;
  description: string;
  updatedAt: number;
}

const store = new Map<string, KnowledgeItem>();
const k = (a: string, id: string) => `${a}:${id}`;

export const knowledgeStore = {
  list(agentId: string): KnowledgeItem[] {
    return [...store.values()]
      .filter(i => i.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  add(agentId: string, item: Omit<KnowledgeItem, "id" | "agentId" | "updatedAt">) {
    const id = `kn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const rec: KnowledgeItem = { ...item, id, agentId, updatedAt: Date.now() };
    store.set(k(agentId, id), rec);
    return rec;
  },
  remove(agentId: string, id: string) {
    store.delete(k(agentId, id));
  },
};
