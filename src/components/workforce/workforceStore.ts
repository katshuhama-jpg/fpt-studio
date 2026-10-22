import type { Workforce, WorkforceNode, WorkforceEdge } from "./types";
import { ROUTE_ARROW } from "./graphOps";
import { CSKH_WEBHOOK_TRIGGER_ID, SALES_QUOTE_TRIGGER_ID, PROCUREMENT_TRIGGER_ID, MBL_CLAIM_TRIGGER_ID } from "../configure/triggerStore";

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

      // Converted to "agent-judgment" (S-demo gap 2, from the Relevance AI research: agents can
      // hand off on their own judgment via an "AI connection", not only through an explicit
      // rule/LLM Condition) — src-cskh decides on its own whether this counts as "clearly wants
      // a human, or asking outside banking products", instead of a centrally-evaluated rule.
      // llmText is kept as optional guidance, not a requirement.
      { id: "cond-1", type: "condition", position: { x: 380, y: 80 }, data: {
        kind: "condition", type: "agent-judgment", ruleMatch: "all", rules: [], approval: null,
        llmText: "Khách hàng yêu cầu rõ ràng được nói chuyện với người thật, hoặc hỏi ngoài phạm vi sản phẩm ngân hàng.",
      } },
      { id: "dest-omni-1", type: "omni", position: { x: 660, y: 60 }, data: { kind: "omni", reasonDefault: "Khách hàng yêu cầu gặp tư vấn viên." } },

      { id: "cond-2", type: "condition", position: { x: 380, y: 460 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all", approval: null,
        rules: [{ id: "r1", variable: "topic", operator: "bằng", value: "Tuyển dụng nội bộ" }],
        llmText: "",
      } },
      { id: "dest-hr", type: "agent", position: { x: 660, y: 460 }, data: { kind: "agent", agentId: "hr", keepContext: false } },

      { id: "cond-3", type: "condition", position: { x: 380, y: 260 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], llmText: "", approval: null,
      } },
      // Terminal handoff to a human (no automated step continues afterward), so this is a "do"
      // task, not an approval gate — approval now lives on the Condition/edge leading INTO a
      // step that needs sign-off (see wf-sales-quote-acme's cond-to-approval below), never on a
      // Person node itself (S-demo gap 1 fix: the old "approve" task kind and its unwired
      // `outcome` Condition variable are both gone).
      { id: "dest-person-1", type: "person", position: { x: 660, y: 260 }, data: {
        kind: "person", memberId: "m-fsoft-coo", taskKind: "do", slaMinutes: 60, escalation: { memberId: "m-fsoft-ceo" },
      } },

      // Standalone — documents that "cskh" can look things up on the web mid-conversation. No
      // edges: Tool nodes never participate in the routing graph (S-gap-4).
      { id: "tool-web-search", type: "tool", position: { x: 60, y: 660 }, data: { kind: "tool", ref: { source: "builtin", id: "web-search" } } },

      // Continuation of the HR branch — once "hr" replies, hand off to the existing FAQ-escalation
      // Workforce as a reusable sub-flow instead of re-building the same escalation logic here
      // (S-gap-6). A normal routing node, so it still needs its own Condition to reach it.
      { id: "cond-4", type: "condition", position: { x: 940, y: 460 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
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
    name: "Báo giá ACME - Chiết khấu & Phê duyệt",
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
      // Rule-based on a custom numeric variable (S-demo gap 4, from the Relevance AI research:
      // Condition rules couldn't reference a real business number like a discount percentage —
      // only the fixed agent_output/topic/language/turns list). `discount_percent` is sourced
      // from the Sales Agent's structured output — llmText kept as a human-readable fallback.
      { id: "cond-auto", type: "condition", position: { x: 380, y: -20 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all", approval: null,
        rules: [{ id: "r-auto", variable: "discount_percent", operator: "nhỏ hơn hoặc bằng", value: "10", numeric: true }],
        llmText: "Mức chiết khấu Nhân sự số đề xuất trong báo giá ở mức 10% trở xuống - Nằm trong thẩm quyền tự phê duyệt của Sales theo chính sách EOS.",
      } },

      // Above the threshold — needs Finance's policy check, then a human approval.
      { id: "cond-escalate", type: "condition", position: { x: 380, y: 300 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all", approval: null,
        rules: [{ id: "r-escalate", variable: "discount_percent", operator: "lớn hơn", value: "10", numeric: true }],
        llmText: "Mức chiết khấu Nhân sự số đề xuất trong báo giá vượt quá 10% - Ngoài thẩm quyền tự phê duyệt, cần Tài chính kiểm tra và Quản lý phê duyệt.",
      } },
      { id: "finance-check", type: "agent", position: { x: 660, y: 300 }, data: { kind: "agent", agentId: "finance-check", keepContext: true } },
      // Approval now lives here, on the Condition/edge leading to Legal, instead of a separate
      // Person(approve) node + a second Condition trying to route on an unwired `outcome`
      // variable (S-demo gap 1 fix — matches how Relevance AI's own Workforce models it: a
      // connection can require a human to approve before it fires, no dedicated node needed).
      { id: "cond-to-approval", type: "condition", position: { x: 940, y: 300 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Tài chính đã kiểm tra xong mức chiết khấu - Chuyển cho Quản lý Tài chính phê duyệt.",
        approval: { mode: "required", assigneeId: "corp-finance-1" },
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
      edge("e-cond-approval-legal", "cond-to-approval", "legal-review", "cond-to-approval"),
    ],
  };

  // Built from the FCI wiki "10. Agentic BPM" page (2026-10-20): UiPath's own Purchase-to-Pay
  // example, re-told as the "Đề nghị mua sắm" case for Ban Mua Sắm FHO-FPD (PR-0142, 5 laptop,
  // 125 triệu). Demonstrates the same 6 BPMN/DMN step types the page catalogs against a real
  // EOS Workforce: Agent task, Human task, Business rule (DMN, via the numeric Condition
  // variable S-demo-4 already added for the ACME demo), and a Connector/robot task - all using
  // this canvas's existing node types, no new architecture.
  //
  // One deliberate simplification, called out on-canvas via a Note node: the wiki's cấp 2
  // approval is "Kế toán + Giám đốc duyệt cùng lúc" (a parallel AND-join, both sign off
  // independently) - this canvas's Condition.approval only models a single assignee/gate per
  // Condition, with no parallel-join primitive, so it's modeled sequentially here (Kế toán
  // reviews as a Person "do" task, Giám đốc holds the actual approval gate). The 50 triệu
  // threshold and 24/48h SLA are the wiki's own stated assumptions, not confirmed numbers.
  const procurementRequest: Workforce = {
    id: "wf-procurement-request",
    name: "Đề nghị mua sắm - Ban Mua Sắm FHO-FPD",
    status: "published",
    createdAt: Date.now() - 4 * HOUR,
    updatedAt: Date.now() - 18 * 60_000,
    updatedBy: "Tran Nam",
    nodes: [
      { id: "trigger-procurement", type: "trigger", position: { x: -260, y: 140 }, data: {
        kind: "trigger", triggerId: PROCUREMENT_TRIGGER_ID,
      } },
      { id: "procurement-agent-1", type: "agent", position: { x: 60, y: 140 }, data: { kind: "agent", agentId: "procurement-agent", keepContext: true } },

      // DMN "Tuyến duyệt" rule, rows 1-2 (the amount threshold) - on a custom numeric Condition
      // variable (S-demo-4), same mechanism the ACME demo's discount_percent uses. Trưởng phòng's
      // cấp-1 approval sits on these same two Conditions (not a separate step) since the real
      // approval card shows the already-computed route alongside the summary either way.
      { id: "cond-cap1", type: "condition", position: { x: 380, y: -20 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all",
        rules: [{ id: "r-cap1", variable: "tong_tien", operator: "nhỏ hơn hoặc bằng", value: "50000000", numeric: true }],
        llmText: "Trưởng phòng xem tóm tắt hồ sơ và bảng so sánh 3 báo giá - Duyệt cấp 1. Tổng tiền trong hạn mức tự duyệt (≤ 50 triệu) nên không cần thêm Kế toán/Giám đốc.",
        approval: { mode: "required", assigneeId: "m-plat-1" },
      } },
      { id: "cond-cap2", type: "condition", position: { x: 380, y: 300 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all",
        rules: [{ id: "r-cap2", variable: "tong_tien", operator: "lớn hơn", value: "50000000", numeric: true }],
        llmText: "Trưởng phòng duyệt cấp 1. Tổng tiền vượt hạn mức (> 50 triệu) nên tuyến duyệt cần thêm Kế toán + Giám đốc trước khi tạo PO.",
        approval: { mode: "required", assigneeId: "m-plat-1" },
      } },

      // Cấp 2 (modeled sequentially - see note above): Kế toán reviews as a "do" task, Giám đốc
      // holds the actual approval gate before the two paths converge back on the same Agent.
      { id: "ketoan-review", type: "person", position: { x: 660, y: 300 }, data: {
        kind: "person", memberId: "corp-finance-3", taskKind: "do", slaMinutes: 240, escalation: { memberId: "m-fsoft-coo" },
      } },
      { id: "cond-giamdoc-approval", type: "condition", position: { x: 940, y: 300 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [],
        llmText: "Kế toán đã xem hồ sơ cấp 2 - Giám đốc duyệt cuối (đủ Kế toán + Giám đốc) trước khi tạo PO.",
        approval: { mode: "required", assigneeId: "m-fsoft-coo" },
      } },

      // Both paths converge here - same Procurement Agent resuming, now to create the PO
      // (Connector/robot task, step 5 of the wiki's example).
      { id: "procurement-agent-2", type: "agent", position: { x: 1220, y: 140 }, data: { kind: "agent", agentId: "procurement-agent", keepContext: true } },

      { id: "cond-to-3way", type: "condition", position: { x: 1500, y: 140 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "PO đã tạo và gửi nhà cung cấp - Chờ nhận hàng và hóa đơn để đối chiếu.",
      } },
      { id: "three-way-match", type: "agent", position: { x: 1780, y: 140 }, data: { kind: "agent", agentId: "three-way-match-agent", keepContext: true } },

      { id: "cond-to-payment", type: "condition", position: { x: 2060, y: 140 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Đối chiếu khớp PO - phiếu nhập - hóa đơn - Chuyển Kế toán thanh toán và đóng hồ sơ.",
      } },
      // Terminal - closes the case (step 7), so "notify" not "do" (S-gap-5: no further routing).
      { id: "ketoan-payment", type: "person", position: { x: 2340, y: 140 }, data: {
        kind: "person", memberId: "corp-finance-3", taskKind: "notify", slaMinutes: null, escalation: null,
      } },

      // Standalone - documents the ERP/Odoo connector both procurement-agent-2 (create PO) and
      // three-way-match (read goods receipt/invoice) draw on (S-gap-4: Tool nodes never route).
      { id: "tool-erp-po", type: "tool", position: { x: 1220, y: 380 }, data: { kind: "tool", ref: { source: "builtin", id: "erp-po" } } },

      // Calls out the one real architecture gap this demo works around - see the comment above.
      { id: "note-parallel-gap", type: "note", position: { x: 60, y: 480 }, data: {
        kind: "note", text: "Mô phỏng: cấp duyệt 2 (Kế toán + Giám đốc \"song song\") hiện chạy tuần tự - Condition mới hỗ trợ 1 approver/gate, chưa có parallel AND-join thật trong engine. Ngưỡng 50 triệu và SLA là giả định theo wiki Agentic BPM, cần Ban Mua Sắm FHO-FPD xác nhận.",
      }, style: { width: 260, height: 170 } },
    ],
    edges: [
      { id: "e-trigger-procurement", source: "trigger-procurement", target: "procurement-agent-1", type: "deletable", markerEnd: ROUTE_ARROW },
      edge("e-agent1-cond-cap1", "procurement-agent-1", "cond-cap1", "cond-cap1"),
      edge("e-cond-cap1-agent2", "cond-cap1", "procurement-agent-2", "cond-cap1"),
      edge("e-agent1-cond-cap2", "procurement-agent-1", "cond-cap2", "cond-cap2"),
      edge("e-cond-cap2-ketoan", "cond-cap2", "ketoan-review", "cond-cap2"),
      edge("e-ketoan-cond-giamdoc", "ketoan-review", "cond-giamdoc-approval", "cond-giamdoc-approval"),
      edge("e-cond-giamdoc-agent2", "cond-giamdoc-approval", "procurement-agent-2", "cond-giamdoc-approval"),
      edge("e-agent2-cond-3way", "procurement-agent-2", "cond-to-3way", "cond-to-3way"),
      edge("e-cond-3way-match", "cond-to-3way", "three-way-match", "cond-to-3way"),
      edge("e-match-cond-payment", "three-way-match", "cond-to-payment", "cond-to-payment"),
      edge("e-cond-payment-ketoan", "cond-to-payment", "ketoan-payment", "cond-to-payment"),
    ],
  };

  // Built from the wiki "Logic xử lý bồi thường cho sản phẩm BHNT - Hỗ trợ viện phí/phẫu thuật"
  // (MB Life, pageId 119517464). S1 OCR -> S2 claim type, then S2 forks: S3 chứng từ -> S4 rule
  // (Nhân sự số Quy trình, tất định) -> S5 dự toán (Code) runs in parallel with S6 AI Summary,
  // both join at "Gộp hồ sơ", which routes on so_warn / so_not_evaluated to the right TĐV.
  // Numbers (X, hạn mức, ngưỡng OCR) live in the Workforce's paramPack, not in the steps.
  const mblClaim: Workforce = {
    id: "wf-mbl-claim",
    name: "Thẩm định bồi thường viện phí/phẫu thuật - MB Life",
    status: "draft",
    createdAt: Date.now() - 2 * HOUR,
    updatedAt: Date.now() - 5 * 60_000,
    updatedBy: "Tran Nam",
    paramPack: {
      name: "MB Life - Hỗ trợ viện phí/phẫu thuật HSCR 3.0",
      version: "2026.10",
      params: [
        { key: "nguong_do_tin_cay_ocr", value: "0.85", note: "Dưới ngưỡng thì chuyển nhân viên nhập liệu kiểm tra" },
        { key: "gioi_han_ngay_nam", value: "150", note: "Số ngày nằm viện tối đa được trả mỗi năm" },
        { key: "gioi_han_ngay_tron_doi", value: "1000", note: "Số ngày nằm viện tối đa trọn đời" },
        { key: "he_so_icu", value: "2", note: "Nằm ICU: 2X mỗi ngày" },
        { key: "he_so_benh_hiem_ngheo", value: "3", note: "Bệnh hiểm nghèo: 3X mỗi ngày" },
        { key: "nguong_ngay_tham_hoi", value: "8", note: "Nằm viện trên số ngày này thì có quyền lợi thay lời thăm hỏi" },
        { key: "tran_tham_hoi", value: "500000", note: "Trần quyền lợi thay lời thăm hỏi (đồng)" },
        { key: "he_so_phau_thuat", value: "10", note: "Phẫu thuật cơ bản: 10X" },
        { key: "so_lan_phau_thuat_nam", value: "2", note: "Số lần phẫu thuật tối đa được trả mỗi năm" },
        { key: "tran_tron_doi_x", value: "1000", note: "Tổng quyền lợi trọn đời tối đa 1000X" },
        { key: "rule_version", value: "MBL-HSCR3-2026.10", note: "Phiên bản bộ rule D/E/A Quy trình Rule thẩm định dùng" },
        { key: "bang_icd_version", value: "ICD-MBL-2026Q3", note: "Danh mục ICD nhóm bệnh và bệnh hiểm nghèo" },
      ],
    },
    nodes: [
      { id: "trigger-mbl", type: "trigger", position: { x: -260, y: 160 }, data: { kind: "trigger", triggerId: MBL_CLAIM_TRIGGER_ID } },
      { id: "s1-ocr", type: "agent", position: { x: 60, y: 160 }, data: { kind: "agent", agentId: "claim-ocr-agent", keepContext: true } },
      { id: "c-ocr-ok", type: "condition", position: { x: 380, y: 60 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all", approval: null, llmText: "",
        rules: [{ id: "r-ocr-ok", variable: "do_tin_cay", operator: "lớn hơn hoặc bằng", value: "0.85", numeric: true }],
      } },
      { id: "c-ocr-low", type: "condition", position: { x: 380, y: 300 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all", approval: null, llmText: "",
        rules: [{ id: "r-ocr-low", variable: "do_tin_cay", operator: "nhỏ hơn", value: "0.85", numeric: true }],
      } },
      { id: "p-verify", type: "person", position: { x: 660, y: 300 }, data: {
        kind: "person", memberId: "m-plat-3", taskKind: "do", slaMinutes: 120, escalation: { memberId: "m-plat-2" },
      } },
      { id: "c-verified", type: "condition", position: { x: 800, y: 460 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Nhân viên nhập liệu đã sửa trường sai và gán lại loại trang.",
      } },
      { id: "s2-type", type: "agent", position: { x: 940, y: 160 }, data: { kind: "agent", agentId: "claim-type-agent", keepContext: true, fanOut: "all" } },
      { id: "c-type", type: "condition", position: { x: 1220, y: 60 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Nhánh thẩm định: kiểm tra chứng từ, chạy rule, dự toán.",
      } },
      { id: "c-to-summary", type: "condition", position: { x: 1220, y: 560 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Nhánh song song: AI Summary đọc toàn bộ giấy tờ y tế.",
      } },
      { id: "s3-docs", type: "agent", position: { x: 1500, y: 60 }, data: { kind: "agent", agentId: "claim-docs-agent", keepContext: true } },
      { id: "c-docs-full", type: "condition", position: { x: 1780, y: -40 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all", approval: null, llmText: "",
        rules: [{ id: "r-docs-full", variable: "so_chung_tu_thieu", operator: "bằng", value: "0", numeric: true }],
      } },
      { id: "c-docs-missing", type: "condition", position: { x: 1780, y: 200 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all", approval: null, llmText: "",
        rules: [{ id: "r-docs-missing", variable: "so_chung_tu_thieu", operator: "lớn hơn", value: "0", numeric: true }],
      } },
      { id: "p-request-docs", type: "person", position: { x: 2060, y: 200 }, data: {
        kind: "person", memberId: "m-plat-4", taskKind: "do", slaMinutes: 1440, escalation: null,
      } },
      { id: "c-requested", type: "condition", position: { x: 2200, y: 340 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Đã gửi yêu cầu bổ sung chứng từ cho khách.",
      } },
      { id: "s4-rules", type: "agent", position: { x: 2340, y: 60 }, data: { kind: "agent", agentId: "claim-rules-process", keepContext: true } },
      { id: "c-rules", type: "condition", position: { x: 2620, y: 60 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Đã có kết quả PASS / WARN / NOT_EVALUATED cho bộ rule.",
      } },
      { id: "s5-estimate", type: "code", position: { x: 2900, y: 60 }, data: {
        kind: "code", name: "Dự toán chi phí (HSCR 3.0)", lang: "Python", toolIds: ["mbl-policy", "mbl-claim-history"],
        code: [
          "def main(inputs, params):",
          "    X = inputs[\"muc_x\"]  # từ Policy",
          "    days = inputs[\"so_ngay_giuong\"] or (inputs[\"ngay_ra\"] - inputs[\"ngay_vao\"]).days",
          "    con_nam = params[\"gioi_han_ngay_nam\"] - inputs[\"so_ngay_da_tra_nam\"]",
          "    con_tron_doi = params[\"gioi_han_ngay_tron_doi\"] - inputs[\"so_ngay_da_tra_tron_doi\"]",
          "    eligible = max(0, min(days, con_nam, con_tron_doi))",
          "    rate = params[\"he_so_benh_hiem_ngheo\"] if inputs[\"la_benh_hiem_ngheo\"] else (params[\"he_so_icu\"] if inputs[\"la_icu\"] else 1)",
          "    q51 = eligible * rate * X",
          "    q52 = min(X, params[\"tran_tham_hoi\"]) if days > params[\"nguong_ngay_tham_hoi\"] else 0",
          "    q61 = params[\"he_so_phau_thuat\"] * X if inputs[\"co_phau_thuat\"] and inputs[\"so_lan_phau_thuat_nam\"] < params[\"so_lan_phau_thuat_nam\"] else 0",
          "    tong = min(q51 + q52 + q61, params[\"tran_tron_doi_x\"] * X - inputs[\"tong_da_tra_tron_doi\"])",
          "    return {\"so_ngay_duoc_tra\": eligible, \"chi_tiet\": {\"5.1\": q51, \"5.2\": q52, \"6.1\": q61}, \"tong_du_toan\": tong}",
        ].join("\n"),
        outputs: [
          { key: "so_ngay_duoc_tra", label: "Số ngày được trả sau hạn mức", type: "number", sample: "5" },
          { key: "chi_tiet", label: "Số tiền từng quyền lợi (5.1, 5.2, 6.1) kèm công thức", type: "table", sample: "5.1: 1.500.000 · 6.1: 3.000.000" },
          { key: "tong_du_toan", label: "Tổng dự toán (đồng)", type: "number", sample: "4500000" },
        ],
      } },
      { id: "c-est", type: "condition", position: { x: 3180, y: 60 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Đã tính xong dự toán.",
      } },
      { id: "s6-summary", type: "agent", position: { x: 1500, y: 560 }, data: { kind: "agent", agentId: "claim-summary-agent", keepContext: true } },
      { id: "c-sum", type: "condition", position: { x: 2620, y: 560 }, data: {
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
        llmText: "Đã trả lời Q1-Q5 kèm dẫn chứng.",
      } },
      { id: "j-package", type: "code", position: { x: 3460, y: 240 }, data: {
        kind: "code", name: "Gộp hồ sơ cho thẩm định viên", lang: "Python", toolIds: [], joinAll: true,
        code: [
          "def main(inputs, params):",
          "    # Chờ đủ 2 nhánh: thẩm định (rule + dự toán) và AI Summary",
          "    return {",
          "        \"so_warn\": inputs[\"so_warn\"],",
          "        \"so_not_evaluated\": inputs[\"so_not_evaluated\"],",
          "        \"lech_voi_co\": inputs[\"lech_voi_co\"],",
          "        \"tong_du_toan\": inputs[\"tong_du_toan\"],",
          "        \"ho_so_tdv\": {k: inputs[k] for k in (\"claim_type\", \"ket_qua_rule\", \"chi_tiet\", \"tom_tat\")},",
          "    }",
        ].join("\n"),
        outputs: [
          { key: "so_warn", label: "Số rule WARN", type: "number", sample: "1" },
          { key: "so_not_evaluated", label: "Số rule NOT_EVALUATED", type: "number", sample: "1" },
          { key: "lech_voi_co", label: "AI Summary lệch với cờ S2", type: "boolean", sample: "false" },
          { key: "tong_du_toan", label: "Tổng dự toán (đồng)", type: "number", sample: "4500000" },
          { key: "ho_so_tdv", label: "Hồ sơ đầy đủ cho TĐV", type: "table" },
        ],
      } },
      { id: "c-tdv-clean", type: "condition", position: { x: 3740, y: 120 }, data: {
        kind: "condition", type: "rule", ruleMatch: "all",
        rules: [
          { id: "r-clean-1", variable: "so_warn", operator: "bằng", value: "0", numeric: true },
          { id: "r-clean-2", variable: "so_not_evaluated", operator: "bằng", value: "0", numeric: true },
        ],
        llmText: "",
        approval: { mode: "required", assigneeId: "m-plat-2" },
      } },
      { id: "c-tdv-warn", type: "condition", position: { x: 3740, y: 380 }, data: {
        kind: "condition", type: "rule", ruleMatch: "any",
        rules: [
          { id: "r-warn-1", variable: "so_warn", operator: "lớn hơn", value: "0", numeric: true },
          { id: "r-warn-2", variable: "so_not_evaluated", operator: "lớn hơn", value: "0", numeric: true },
        ],
        llmText: "",
        approval: { mode: "required", assigneeId: "m-plat-1" },
      } },
      { id: "p-result", type: "person", position: { x: 4020, y: 240 }, data: {
        kind: "person", memberId: "m-plat-4", taskKind: "notify", slaMinutes: null, escalation: null,
      } },

      { id: "t-policy", type: "tool", position: { x: 2340, y: 800 }, data: { kind: "tool", ref: { source: "builtin", id: "mbl-policy" } } },
      { id: "t-history", type: "tool", position: { x: 2620, y: 800 }, data: { kind: "tool", ref: { source: "builtin", id: "mbl-claim-history" } } },
      { id: "t-ref", type: "tool", position: { x: 2900, y: 800 }, data: { kind: "tool", ref: { source: "builtin", id: "ref-lookup" } } },
      { id: "t-fraud", type: "tool", position: { x: 3180, y: 800 }, data: { kind: "tool", ref: { source: "builtin", id: "vision-fraud" } } },

      { id: "note-mbl-flow", type: "note", position: { x: 60, y: 560 }, data: {
        kind: "note", text: "Rule thẩm định là Nhân sự số Quy trình, dự toán là bước Code: cả hai tất định, không dùng LLM tính ngày hay tiền. AI Summary chạy song song, bước Gộp hồ sơ chờ đủ hai nhánh rồi rẽ theo so_warn / so_not_evaluated. Ngưỡng và hạn mức nằm ở tab Tham số.",
      }, style: { width: 300, height: 170 } },
    ],
    edges: [
      { id: "e-trigger-mbl", source: "trigger-mbl", target: "s1-ocr", type: "deletable", markerEnd: ROUTE_ARROW },
      edge("e-s1-cok", "s1-ocr", "c-ocr-ok", "c-ocr-ok"),
      edge("e-cok-s2", "c-ocr-ok", "s2-type", "c-ocr-ok"),
      edge("e-s1-clow", "s1-ocr", "c-ocr-low", "c-ocr-low"),
      edge("e-clow-verify", "c-ocr-low", "p-verify", "c-ocr-low"),
      edge("e-verify-cv", "p-verify", "c-verified", "c-verified"),
      edge("e-cv-s2", "c-verified", "s2-type", "c-verified"),
      edge("e-s2-ctype", "s2-type", "c-type", "c-type"),
      edge("e-ctype-s3", "c-type", "s3-docs", "c-type"),
      edge("e-s2-csum", "s2-type", "c-to-summary", "c-to-summary"),
      edge("e-csum-s6", "c-to-summary", "s6-summary", "c-to-summary"),
      edge("e-s3-cfull", "s3-docs", "c-docs-full", "c-docs-full"),
      edge("e-cfull-s4", "c-docs-full", "s4-rules", "c-docs-full"),
      edge("e-s3-cmiss", "s3-docs", "c-docs-missing", "c-docs-missing"),
      edge("e-cmiss-req", "c-docs-missing", "p-request-docs", "c-docs-missing"),
      edge("e-req-cr", "p-request-docs", "c-requested", "c-requested"),
      edge("e-cr-s4", "c-requested", "s4-rules", "c-requested"),
      edge("e-s4-crules", "s4-rules", "c-rules", "c-rules"),
      edge("e-crules-s5", "c-rules", "s5-estimate", "c-rules"),
      edge("e-s5-cest", "s5-estimate", "c-est", "c-est"),
      edge("e-cest-j", "c-est", "j-package", "c-est"),
      edge("e-s6-csum2", "s6-summary", "c-sum", "c-sum"),
      edge("e-csum2-j", "c-sum", "j-package", "c-sum"),
      edge("e-j-clean", "j-package", "c-tdv-clean", "c-tdv-clean"),
      edge("e-clean-result", "c-tdv-clean", "p-result", "c-tdv-clean"),
      edge("e-j-warn", "j-package", "c-tdv-warn", "c-tdv-warn"),
      edge("e-warn-result", "c-tdv-warn", "p-result", "c-tdv-warn"),
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
        kind: "condition", type: "llm", ruleMatch: "all", rules: [], approval: null,
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

  return [published, salesQuoteAcme, procurementRequest, mblClaim, draft, empty];
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
  saveParams(id: string, paramPack: Workforce["paramPack"]) {
    const wf = store.get(id);
    if (!wf) return;
    store.set(id, touch({ ...wf, paramPack }));
  },
  publish(id: string) {
    const wf = store.get(id);
    if (!wf) return;
    store.set(id, touch({ ...wf, status: "published" }));
  },
};
