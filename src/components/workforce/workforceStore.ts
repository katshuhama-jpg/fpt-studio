import type { Workforce, WorkforceNode, WorkforceEdge } from "./types";
import { ROUTE_ARROW } from "./graphOps";
import { CSKH_WEBHOOK_TRIGGER_ID, SALES_QUOTE_TRIGGER_ID } from "../configure/triggerStore";

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
      { id: "trigger-cskh", type: "trigger", position: { x: -260, y: 60 }, data: {
        kind: "trigger", triggerId: CSKH_WEBHOOK_TRIGGER_ID,
      } },
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
      { id: "dest-person-1", type: "person", position: { x: 660, y: 260 }, data: {
        kind: "person", memberId: "m-fsoft-coo", taskKind: "approve", slaMinutes: 60, escalation: { memberId: "m-fsoft-ceo" },
      } },

      // Standalone — documents that "cskh" can look things up on the web mid-conversation. No
      // edges: Tool nodes never participate in the routing graph (S-gap-4).
      { id: "tool-web-search", type: "tool", position: { x: 60, y: 660 }, data: { kind: "tool", ref: { source: "builtin", id: "web-search" } } },

      // Continuation of the HR branch — once "hr" replies, hand off to the existing FAQ-escalation
      // Workforce as a reusable sub-flow instead of re-building the same escalation logic here
      // (S-gap-6). A normal routing node, so it still needs its own Condition to reach it.
      { id: "cond-4", type: "condition", position: { x: 940, y: 460 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Câu hỏi tuyển dụng vượt ngoài phạm vi FAQ nội bộ, cần leo thang.",
      } },
      { id: "subprocess-1", type: "subprocess", position: { x: 1220, y: 460 }, data: {
        kind: "subprocess", workforceId: "wf-faq-escalation",
      } },
    ],
    edges: [
      { id: "e-trigger-cskh", source: "trigger-cskh", target: "src-cskh", type: "deletable", markerEnd: ROUTE_ARROW },
      edge("e-src-cskh-cond-1", "src-cskh", "cond-1", "cond-1"),
      edge("e-cond-1-omni-1", "cond-1", "dest-omni-1", "cond-1"),
      edge("e-src-cskh-cond-3", "src-cskh", "cond-3", "cond-3"),
      edge("e-cond-3-person-1", "cond-3", "dest-person-1", "cond-3"),
      edge("e-src-sales-cond-2", "src-sales", "cond-2", "cond-2"),
      edge("e-cond-2-hr", "cond-2", "dest-hr", "cond-2"),
      edge("e-hr-cond-4", "dest-hr", "cond-4", "cond-4"),
      edge("e-cond-4-subprocess-1", "cond-4", "subprocess-1", "cond-4"),
    ],
  };

  // Built from the "Một yêu cầu kết nối cả doanh nghiệp" EOS diagram (2026-09-19): Mai's ACME
  // quote request → Sales Agent drafts from CRM/ERP → within EOS's own stated discount policy
  // (≤10%) the Sales Agent is trusted to send directly; above 10% it hands off to the Finance
  // Agent for a policy check, then to a human Finance Manager for one-tap approve/reject
  // (S-demo-1) — then either path converges on the Legal Agent, which attaches the current
  // standard contract clauses before the quote is final. Every step is captured automatically
  // by "Lịch sử chạy" (S-gap-8), matching the diagram's "mọi bước được ghi lại".
  const salesQuoteAcme: Workforce = {
    id: "wf-sales-quote-acme",
    name: "Báo giá ACME — Chiết khấu & Phê duyệt",
    status: "published",
    createdAt: Date.now() - 6 * HOUR,
    updatedAt: Date.now() - 25 * 60_000,
    updatedBy: "Tran Nam",
    nodes: [
      { id: "trigger-quote", type: "trigger", position: { x: -260, y: 140 }, data: {
        kind: "trigger", triggerId: SALES_QUOTE_TRIGGER_ID,
      } },
      { id: "sales-quote", type: "agent", position: { x: 60, y: 140 }, data: { kind: "agent", agentId: "sales-quote", keepContext: true } },

      // Within EOS's own stated discount policy — Sales Agent's authority, no human needed.
      { id: "cond-auto", type: "condition", position: { x: 380, y: -20 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Mức chiết khấu Agent đề xuất trong báo giá ở mức 10% trở xuống — nằm trong thẩm quyền tự phê duyệt của Sales theo chính sách EOS.",
      } },

      // Above the threshold — needs Finance's policy check, then a human approval.
      { id: "cond-escalate", type: "condition", position: { x: 380, y: 300 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Mức chiết khấu Agent đề xuất trong báo giá vượt quá 10% — ngoài thẩm quyền tự phê duyệt, cần Tài chính kiểm tra và Quản lý phê duyệt.",
      } },
      { id: "finance-check", type: "agent", position: { x: 660, y: 300 }, data: { kind: "agent", agentId: "finance-check", keepContext: true } },
      { id: "cond-to-approval", type: "condition", position: { x: 940, y: 300 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Tài chính đã kiểm tra xong mức chiết khấu — chuyển cho Quản lý Tài chính phê duyệt.",
      } },
      { id: "person-finance-mgr", type: "person", position: { x: 1220, y: 300 }, data: {
        kind: "person", memberId: "corp-finance-1", taskKind: "approve", slaMinutes: 60, escalation: null,
      } },
      { id: "cond-approved", type: "condition", position: { x: 1500, y: 300 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Quản lý Tài chính đã phê duyệt mức chiết khấu đề xuất.",
      } },

      // Both paths converge here — Legal attaches the current standard clauses before the quote
      // is final, matching the diagram's step 5 ("Gửi kèm điều khoản Pháp chế").
      { id: "legal-review", type: "agent", position: { x: 1780, y: 140 }, data: { kind: "agent", agentId: "legal-review", keepContext: false } },

      // Standalone — document the shared assets each Agent draws on (S-gap-4: Tool nodes never
      // route, they just show what's available), matching the diagram's "dùng: ..." footnotes.
      { id: "tool-crm", type: "tool", position: { x: 60, y: 480 }, data: { kind: "tool", ref: { source: "builtin", id: "crm-lookup" } } },
      { id: "tool-email", type: "tool", position: { x: 1780, y: 380 }, data: { kind: "tool", ref: { source: "builtin", id: "email-sms" } } },
    ],
    edges: [
      { id: "e-trigger-quote", source: "trigger-quote", target: "sales-quote", type: "deletable", markerEnd: ROUTE_ARROW },
      edge("e-sales-cond-auto", "sales-quote", "cond-auto", "cond-auto"),
      edge("e-cond-auto-legal", "cond-auto", "legal-review", "cond-auto"),
      edge("e-sales-cond-escalate", "sales-quote", "cond-escalate", "cond-escalate"),
      edge("e-cond-escalate-finance", "cond-escalate", "finance-check", "cond-escalate"),
      edge("e-finance-cond-approval", "finance-check", "cond-to-approval", "cond-to-approval"),
      edge("e-cond-approval-person", "cond-to-approval", "person-finance-mgr", "cond-to-approval"),
      edge("e-person-cond-approved", "person-finance-mgr", "cond-approved", "cond-approved"),
      edge("e-cond-approved-legal", "cond-approved", "legal-review", "cond-approved"),
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

  return [published, salesQuoteAcme, draft, empty];
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
