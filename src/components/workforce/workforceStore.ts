import type { Workforce, WorkforceNode, WorkforceEdge } from "./types";
import { ROUTE_ARROW } from "./graphOps";

const HOUR = 3_600_000;

function edge(id: string, source: string, target: string, conditionId: string): WorkforceEdge {
  // Only the Condition's own exit edge (Condition -> destination) gets the arrow marker — its
  // entry edge (source -> Condition) is a plain line, dots at both ends, no arrow at all.
  const isConditionExit = source === conditionId;
  return { id, source, target, type: "deletable", markerEnd: isConditionExit ? ROUTE_ARROW : undefined, data: { conditionId } };
}

function seedWorkforces(): Workforce[] {
  const published: Workforce = {
    id: "wf-cskh-orchestration",
    name: "Điều phối Banking ABC",
    status: "published",
    createdAt: Date.now() - 20 * HOUR,
    updatedAt: Date.now() - 2 * HOUR,
    updatedBy: "Tran Nam",
    nodes: [
      { id: "src-cskh", type: "agent", position: { x: 60, y: 60 }, data: { kind: "agent", agentId: "cskh", keepContext: true } },
      { id: "src-sales", type: "agent", position: { x: 60, y: 460 }, data: { kind: "agent", agentId: "sales", keepContext: true } },

      { id: "cond-1", type: "condition", position: { x: 380, y: 80 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Khách hàng yêu cầu rõ ràng được nói chuyện với người thật, hoặc hỏi ngoài phạm vi sản phẩm ngân hàng.",
      } },
      { id: "dest-omni-1", type: "omni", position: { x: 660, y: 60 }, data: { kind: "omni", reasonDefault: "Khách hàng yêu cầu gặp tư vấn viên." } },

      { id: "cond-2", type: "condition", position: { x: 380, y: 460 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all",
        rules: [{ id: "r1", variable: "topic", operator: "bằng", value: "Tuyển dụng nội bộ" }],
        llmText: "",
      } },
      { id: "dest-hr", type: "agent", position: { x: 660, y: 460 }, data: { kind: "agent", agentId: "hr", keepContext: false } },

      { id: "cond-3", type: "condition", position: { x: 380, y: 260 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], llmText: "",
      } },
      { id: "dest-person-1", type: "person", position: { x: 660, y: 260 }, data: { kind: "person", memberId: "m-fsoft-coo" } },
    ],
    edges: [
      edge("e-src-cskh-cond-1", "src-cskh", "cond-1", "cond-1"),
      edge("e-cond-1-omni-1", "cond-1", "dest-omni-1", "cond-1"),
      edge("e-src-cskh-cond-3", "src-cskh", "cond-3", "cond-3"),
      edge("e-cond-3-person-1", "cond-3", "dest-person-1", "cond-3"),
      edge("e-src-sales-cond-2", "src-sales", "cond-2", "cond-2"),
      edge("e-cond-2-hr", "cond-2", "dest-hr", "cond-2"),
    ],
  };

  const draft: Workforce = {
    id: "wf-faq-escalation",
    name: "FAQ escalation sang Omni",
    status: "draft",
    createdAt: Date.now() - 5 * HOUR,
    updatedAt: Date.now() - 40 * 60_000,
    updatedBy: "Linh Phan",
    nodes: [
      { id: "src-faq", type: "agent", position: { x: 60, y: 80 }, data: { kind: "agent", agentId: "faq", keepContext: true } },
      { id: "cond-faq-1", type: "condition", position: { x: 380, y: 100 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Câu hỏi không có trong tài liệu sản phẩm, hoặc khách hàng phàn nàn về chất lượng dịch vụ.",
      } },
      { id: "dest-omni-faq", type: "omni", position: { x: 660, y: 80 }, data: { kind: "omni", reasonDefault: "" } },
    ],
    edges: [
      edge("e-src-faq-cond", "src-faq", "cond-faq-1", "cond-faq-1"),
      edge("e-cond-faq-omni", "cond-faq-1", "dest-omni-faq", "cond-faq-1"),
    ],
  };

  const empty: Workforce = {
    id: "wf-empty-draft",
    name: "Untitled workforce",
    status: "draft",
    createdAt: Date.now() - 10 * 60_000,
    updatedAt: Date.now() - 10 * 60_000,
    updatedBy: "Tran Nam",
    nodes: [],
    edges: [],
  };

  return [published, draft, empty];
}

const store = new Map<string, Workforce>();
for (const wf of seedWorkforces()) store.set(wf.id, wf);

function touch(wf: Workforce): Workforce {
  return { ...wf, updatedAt: Date.now(), updatedBy: "Tran Nam" };
}

export const workforceStore = {
  list(): Workforce[] {
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Workforce | undefined {
    return store.get(id);
  },
  create(name: string): Workforce {
    const id = `wf-${Date.now()}`;
    const wf: Workforce = {
      id,
      name: name.trim() || "Untitled workforce",
      status: "draft",
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: "Tran Nam",
    };
    store.set(id, wf);
    return wf;
  },
  rename(id: string, name: string) {
    const wf = store.get(id);
    if (!wf) return;
    store.set(id, touch({ ...wf, name: name.trim() || "Untitled workforce" }));
  },
  remove(id: string) {
    store.delete(id);
  },
  saveGraph(id: string, nodes: WorkforceNode[], edges: WorkforceEdge[]) {
    const wf = store.get(id);
    if (!wf) return;
    store.set(id, touch({ ...wf, nodes, edges }));
  },
  publish(id: string) {
    const wf = store.get(id);
    if (!wf) return;
    store.set(id, touch({ ...wf, status: "published" }));
  },
};
