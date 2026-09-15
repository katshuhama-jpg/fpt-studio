// sessionStorage-backed Governance store — request-to-publish workflow shared by all five
// builder-created resource types (Agent, Knowledge, Skill, Guardrail, Connector). Mirrors the
// persistence pattern used by agentPublishStore.ts / agentConnectorStore.ts (loadMap/saveMap,
// survives reload + client-side nav, clears when the tab closes).
//
// Design decision (confirmed with PO): when an Agent is submitted for publish and it references
// Knowledge/Skill/Guardrail/Connector items that are new or modified, the whole thing becomes
// ONE governance request (see `bundledItems`) — not N separate parent/child requests. An item
// already approved and unchanged since is shown as "unchanged_approved" inside the bundle and
// does not need to be re-reviewed; only new/modified items actually gate the Agent's approval.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";
import { agentPublishStore } from "../configure/agentPublishStore";
import { knowledgeStore } from "@/components/knowledge/knowledgeStore";
import { knowledgeBaseStore } from "@/components/knowledge/knowledgeBaseStore";
import { agentSkillStore } from "../configure/agentSkillStore";
import { skillStore } from "../configure/skillStore";
import { agentGuardrailStore } from "../configure/agentGuardrailStore";
import { guardrailConsoleStore } from "../configure/guardrailConsoleStore";
import { agentConnectorStore } from "../configure/agentConnectorStore";
import { customConnectorStore } from "../configure/customConnectorStore";
import { auditLogStore } from "./auditLogStore";
import { getAgent } from "../configure/agentStore";

export type GovResourceType = "agent" | "knowledge" | "skill" | "guardrail" | "connector";
export type GovRequestStatus = "pending" | "needs_changes" | "approved" | "rejected";
/** Scope requested for — same two "beyond just me" tiers Agent's Publish modal already offers
 * ("Only me" never creates a governance request; nothing to review there). */
export type GovAudience = "org" | "community";
export type GovChangeState = "new" | "modified" | "unchanged_approved";

export const RESOURCE_TYPE_LABEL: Record<GovResourceType, string> = {
  agent: "Agent",
  knowledge: "Knowledge",
  skill: "Skill",
  guardrail: "Guardrails",
  connector: "Connector",
};

export const AUDIENCE_LABEL: Record<GovAudience, string> = {
  org: "Company / department",
  community: "FPT AI Agent community",
};

export const STATUS_LABEL: Record<GovRequestStatus, string> = {
  pending: "Chờ duyệt",
  needs_changes: "Cần cập nhật",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export interface GovBundledItem {
  type: Exclude<GovResourceType, "agent">;
  resourceId: string;
  name: string;
  changeState: GovChangeState;
}

export interface GovHistoryEntry {
  id: string;
  at: number;
  action: "submitted" | "resubmitted" | "approved" | "rejected" | "changes_requested";
  actorId: string;
  actorName: string;
  note?: string;
}

export interface GovRequest {
  id: string;
  resourceType: GovResourceType;
  resourceId: string;
  resourceName: string;
  resourceIcon?: string;
  requesterId: string;
  requesterName: string;
  audience: GovAudience;
  note: string;
  version?: string;
  status: GovRequestStatus;
  submittedAt: number;
  updatedAt: number;
  bundledItems: GovBundledItem[];
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
  history: GovHistoryEntry[];
}

const REQ_KEY = "governance_request_store_v1";
const APPROVED_KEY = "governance_approved_resources_v1";
const SEEDED_KEY = "governance_store_seeded_v1";

const store = loadMap<string, GovRequest>(REQ_KEY);
/** Set of "type:resourceId" — a resource that has already cleared governance review at least
 * once. Drives the "unchanged_approved" vs "new"/"modified" distinction inside a bundle. */
const approved = loadSet<string>(APPROVED_KEY);
const persist = () => saveMap(REQ_KEY, store);
const persistApproved = () => saveSet(APPROVED_KEY, approved);

const approvalKey = (type: Exclude<GovResourceType, "agent">, id: string) => `${type}:${id}`;

let seq = 1000;
const nextId = () => `req-${seq++}`;
const now = () => Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function historyEntry(action: GovHistoryEntry["action"], actorId: string, actorName: string, note?: string): GovHistoryEntry {
  return { id: `h-${seq++}`, at: now(), action, actorId, actorName, note };
}

/* ───────────────────────── seed ───────────────────────── */

function seed() {
  if (seededOnce()) return;
  markSeeded();
  const t = now();

  const mk = (r: Omit<GovRequest, "history">, hist: GovHistoryEntry[]): GovRequest => ({ ...r, history: hist });

  // 1 — the centerpiece: Agent bundling a mix of an already-approved item and two new ones.
  const agentBundleReq = mk(
    {
      id: "req-1001", resourceType: "agent", resourceId: "hr", resourceName: "HR Onboarding Bot",
      resourceIcon: "🤝", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "org", note: "Mở rộng agent Onboarding cho toàn bộ phòng Nhân sự — bổ sung lộ trình sản phẩm và cảnh báo leo thang.",
      version: "v1.1.0", status: "pending", submittedAt: t - 3 * HOUR, updatedAt: t - 3 * HOUR,
      bundledItems: [
        { type: "knowledge", resourceId: "kb-7", name: "Lộ trình sản phẩm nội bộ", changeState: "new" },
        { type: "skill", resourceId: "weekly-digest", name: "weekly-digest", changeState: "unchanged_approved" },
        { type: "guardrail", resourceId: "g-6", name: "Escalate risky replies", changeState: "new" },
      ],
    },
    [historyEntry("submitted", "m-fsoft-vn-1", "Duy Nguyen")],
  );

  // 2 — standalone Knowledge, sent back for changes.
  const kbReq = mk(
    {
      id: "req-1002", resourceType: "knowledge", resourceId: "kb-4", resourceName: "Chính sách nhân sự",
      requesterId: "m-fsoft-coo", requesterName: "Linh Phan",
      audience: "org", note: "Chia sẻ chính sách nghỉ phép & phúc lợi mới nhất cho toàn công ty.",
      status: "needs_changes", submittedAt: t - 1 * DAY, updatedAt: t - 5 * HOUR,
      bundledItems: [], reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
      reviewNote: "Cần bổ sung nguồn tài liệu gốc (link phòng Nhân sự) trước khi duyệt — hiện chưa có căn cứ để đối chiếu.",
    },
    [
      historyEntry("submitted", "m-fsoft-coo", "Linh Phan"),
      historyEntry("changes_requested", "m-fsoft-ceo", "Tran Nam", "Cần bổ sung nguồn tài liệu gốc (link phòng Nhân sự) trước khi duyệt — hiện chưa có căn cứ để đối chiếu."),
    ],
  );

  // 3 — standalone Skill, already approved.
  const skillReq = mk(
    {
      id: "req-1003", resourceType: "skill", resourceId: "email-drafter", resourceName: "email-drafter",
      requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "community", note: "Skill soạn email đã dùng ổn định 2 tuần trong team — đề xuất mở cho toàn bộ FPT AI Agent community.",
      status: "approved", submittedAt: t - 3 * DAY, updatedAt: t - 2 * DAY,
      bundledItems: [], reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam", reviewNote: "Đã test thử — hoạt động tốt, duyệt.",
    },
    [
      historyEntry("submitted", "m-fsoft-vn-1", "Duy Nguyen"),
      historyEntry("approved", "m-fsoft-ceo", "Tran Nam", "Đã test thử — hoạt động tốt, duyệt."),
    ],
  );

  // 4 — standalone Guardrail, rejected.
  const guardrailReq = mk(
    {
      id: "req-1004", resourceType: "guardrail", resourceId: "g-9", resourceName: "Vendor pricing disclosure",
      requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", note: "Áp dụng cho toàn bộ Agent bán hàng để tránh lộ giá vendor nội bộ.",
      status: "rejected", submittedAt: t - 6 * DAY, updatedAt: t - 5 * DAY,
      bundledItems: [], reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
      reviewNote: "Chưa rõ phạm vi áp dụng — vui lòng làm rõ áp dụng cho Agent nào và bổ sung ví dụ câu trả lời mẫu trước khi gửi lại.",
    },
    [
      historyEntry("submitted", "m-plat-1", "Mai Hoang"),
      historyEntry("rejected", "m-fsoft-ceo", "Tran Nam", "Chưa rõ phạm vi áp dụng — vui lòng làm rõ áp dụng cho Agent nào và bổ sung ví dụ câu trả lời mẫu trước khi gửi lại."),
    ],
  );

  // 5 — standalone Custom Connector, pending.
  const connectorReq = mk(
    {
      id: "req-1005", resourceType: "connector", resourceId: "cc-3", resourceName: "legal-search-mcp",
      requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "org", note: "Kết nối tra cứu văn bản pháp lý — đề xuất dùng chung cho các Agent pháp chế & tuân thủ.",
      status: "pending", submittedAt: t - 6 * HOUR, updatedAt: t - 6 * HOUR,
      bundledItems: [],
    },
    [historyEntry("submitted", "m-fsoft-vn-1", "Duy Nguyen")],
  );

  // 6 — historical Agent request, fully approved, all bundled items already clean — gives the
  // Audit Log something with real depth and shows the "everything already approved" case.
  const agentCleanReq = mk(
    {
      id: "req-1006", resourceType: "agent", resourceId: "cskh", resourceName: "Banking ABC — Customer Care",
      resourceIcon: "🏦", requesterId: "m-fsoft-ceo", requesterName: "Tran Nam",
      audience: "org", note: "Publish bản chính thức phục vụ tổng đài CSKH.",
      version: "v1.0.1", status: "approved", submittedAt: t - 8 * DAY, updatedAt: t - 7 * DAY,
      bundledItems: [
        { type: "knowledge", resourceId: "kb-1", name: "Chính sách ngân hàng ABC", changeState: "unchanged_approved" },
        { type: "knowledge", resourceId: "kb-2", name: "FAQ chăm sóc khách hàng", changeState: "unchanged_approved" },
      ],
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam", reviewNote: "Đạt yêu cầu, duyệt bản chính thức.",
    },
    [
      historyEntry("submitted", "m-fsoft-ceo", "Tran Nam"),
      historyEntry("approved", "m-fsoft-ceo", "Tran Nam", "Đạt yêu cầu, duyệt bản chính thức."),
    ],
  );

  [agentBundleReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq].forEach(r => store.set(r.id, r));
  persist();

  // Seed the approval ledger to match the stories above: weekly-digest + kb-1/kb-2 already
  // cleared review before; kb-7 / g-6 / cc-3 / g-9 / kb-4 have not.
  ["skill:weekly-digest", "knowledge:kb-1", "knowledge:kb-2", "skill:email-drafter"].forEach(k => approved.add(k as any));
  persistApproved();

  // Mirror the seed into the audit log so /governance/audit-log has matching history from day one.
  for (const r of [agentBundleReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq]) {
    for (const h of r.history) {
      auditLogStore.log({
        actorId: h.actorId, actorName: h.actorName, action: h.action,
        resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName,
        requestId: r.id, note: h.note, at: h.at,
      });
    }
  }
}

function seededOnce(): boolean {
  try { return sessionStorage.getItem(SEEDED_KEY) === "1"; } catch { return false; }
}
function markSeeded() {
  try { sessionStorage.setItem(SEEDED_KEY, "1"); } catch { /* ignore */ }
}

/* ───────────────────────── bundle computation ───────────────────────── */

/** What an Agent's Publish modal would bundle *right now* if submitted for governance review —
 * every Knowledge/Skill/Guardrail/Connector it references, each tagged with whether it already
 * cleared review before (so the admin only has to look closely at what's actually new). Built-in
 * / mandatory / marketplace items (e.g. the PII protection guardrail, the Gmail connector) are
 * excluded — they're not builder-owned resources and aren't part of this workflow. */
export function computeAgentBundle(agentId: string): GovBundledItem[] {
  const items: GovBundledItem[] = [];

  const kbIds = knowledgeStore.listAttachedConsoleKbIds(agentId);
  for (const id of kbIds) {
    const kb = knowledgeBaseStore.get(id);
    if (!kb) continue;
    items.push({
      type: "knowledge", resourceId: kb.id, name: kb.name,
      changeState: approved.has(approvalKey("knowledge", kb.id)) ? "unchanged_approved" : "new",
    });
  }

  const skillIds = agentSkillStore.listAttachedConsoleSkillIds(agentId);
  for (const id of skillIds) {
    const s = skillStore.get(id);
    if (!s) continue;
    items.push({
      type: "skill", resourceId: s.id, name: s.name,
      changeState: approved.has(approvalKey("skill", s.id)) ? "unchanged_approved" : "new",
    });
  }

  const guardrailIds = agentGuardrailStore.listAttachedConsoleGuardrailIds(agentId);
  for (const id of guardrailIds) {
    const g = guardrailConsoleStore.get(id);
    if (!g || g.mandatory) continue; // mandatory compliance rules aren't a builder resource
    items.push({
      type: "guardrail", resourceId: g.id, name: g.name,
      changeState: approved.has(approvalKey("guardrail", g.id)) ? "unchanged_approved" : "new",
    });
  }

  const connectors = agentConnectorStore.list(agentId);
  for (const c of connectors) {
    const cc = customConnectorStore.get(c.connectorId);
    if (!cc) continue; // marketplace/built-in connector (e.g. Gmail) — not a governance resource
    items.push({
      type: "connector", resourceId: cc.id, name: cc.name,
      changeState: approved.has(approvalKey("connector", cc.id)) ? "unchanged_approved" : "new",
    });
  }

  return items;
}

/* ───────────────────────── store API ───────────────────────── */

export const governanceStore = {
  list(): GovRequest[] {
    seed();
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },

  get(id: string): GovRequest | undefined {
    seed();
    return store.get(id);
  },

  /** The one open (pending or needs_changes) request for a resource, if any — drives the Agent
   * Builder top-bar "Đang chờ duyệt" pill and blocks a second concurrent submission. */
  getOpenRequestForResource(resourceType: GovResourceType, resourceId: string): GovRequest | undefined {
    seed();
    return [...store.values()]
      .filter(r => r.resourceType === resourceType && r.resourceId === resourceId && (r.status === "pending" || r.status === "needs_changes"))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  },

  listForResource(resourceType: GovResourceType, resourceId: string): GovRequest[] {
    seed();
    return [...store.values()]
      .filter(r => r.resourceType === resourceType && r.resourceId === resourceId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  pendingCount(): number {
    seed();
    return [...store.values()].filter(r => r.status === "pending" || r.status === "needs_changes").length;
  },

  isResourceApproved(type: Exclude<GovResourceType, "agent">, id: string): boolean {
    seed();
    return approved.has(approvalKey(type, id));
  },

  submit(input: {
    resourceType: GovResourceType; resourceId: string; resourceName: string; resourceIcon?: string;
    requesterId: string; requesterName: string; audience: GovAudience; note: string; version?: string;
    bundledItems?: GovBundledItem[];
  }): GovRequest {
    seed();
    const id = nextId();
    const t = now();
    const req: GovRequest = {
      id, resourceType: input.resourceType, resourceId: input.resourceId, resourceName: input.resourceName,
      resourceIcon: input.resourceIcon, requesterId: input.requesterId, requesterName: input.requesterName,
      audience: input.audience, note: input.note, version: input.version, status: "pending",
      submittedAt: t, updatedAt: t, bundledItems: input.bundledItems ?? [],
      history: [historyEntry("submitted", input.requesterId, input.requesterName)],
    };
    store.set(id, req);
    persist();
    auditLogStore.log({
      actorId: input.requesterId, actorName: input.requesterName, action: "submitted",
      resourceType: input.resourceType, resourceId: input.resourceId, resourceName: input.resourceName,
      requestId: id, at: t,
    });
    return req;
  },

  /** Builder edits the resource and resends a "needs_changes" request — goes back to the end
   * of the Pending queue, history keeps every earlier round intact. */
  resubmit(id: string, actorId: string, actorName: string, note?: string): GovRequest | undefined {
    seed();
    const r = store.get(id);
    if (!r || r.status !== "needs_changes") return r;
    const t = now();
    r.status = "pending";
    r.updatedAt = t;
    r.reviewNote = undefined;
    r.history.push(historyEntry("resubmitted", actorId, actorName, note));
    store.set(id, r);
    persist();
    auditLogStore.log({ actorId, actorName, action: "resubmitted", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note, at: t });
    return r;
  },

  approve(id: string, reviewerId: string, reviewerName: string, note?: string): GovRequest | undefined {
    seed();
    const r = store.get(id);
    if (!r) return r;
    const t = now();
    r.status = "approved";
    r.updatedAt = t;
    r.reviewerId = reviewerId; r.reviewerName = reviewerName; r.reviewNote = note;
    r.history.push(historyEntry("approved", reviewerId, reviewerName, note));
    store.set(id, r);
    persist();

    // Clear the whole bundle (including the resource itself, for non-agent types) into the
    // approval ledger, then — for an Agent — actually flip it live via agentPublishStore so the
    // rest of the prototype (top-bar pill, My agents list) reflects the approval immediately.
    r.bundledItems.forEach(it => approved.add(approvalKey(it.type, it.resourceId)));
    if (r.resourceType !== "agent") approved.add(approvalKey(r.resourceType, r.resourceId));
    persistApproved();

    if (r.resourceType === "agent") {
      const current = agentPublishStore.get(r.resourceId);
      agentPublishStore.publish(r.resourceId, "workspace", current.channels, r.version ?? current.version, r.audience);
    }

    auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "approved", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note, at: t });
    return r;
  },

  reject(id: string, reviewerId: string, reviewerName: string, reason: string): GovRequest | undefined {
    seed();
    const r = store.get(id);
    if (!r) return r;
    const t = now();
    r.status = "rejected";
    r.updatedAt = t;
    r.reviewerId = reviewerId; r.reviewerName = reviewerName; r.reviewNote = reason;
    r.history.push(historyEntry("rejected", reviewerId, reviewerName, reason));
    store.set(id, r);
    persist();
    auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "rejected", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note: reason, at: t });
    return r;
  },

  requestChanges(id: string, reviewerId: string, reviewerName: string, comment: string): GovRequest | undefined {
    seed();
    const r = store.get(id);
    if (!r) return r;
    const t = now();
    r.status = "needs_changes";
    r.updatedAt = t;
    r.reviewerId = reviewerId; r.reviewerName = reviewerName; r.reviewNote = comment;
    r.history.push(historyEntry("changes_requested", reviewerId, reviewerName, comment));
    store.set(id, r);
    persist();
    auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "changes_requested", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note: comment, at: t });
    return r;
  },
};

/** Best-effort resolver so the Request Detail screen can deep-link "Xem chi tiết" back to the
 * real resource page for every type (Agent has its own route; the other four are workspace list
 * pages that accept a ?open= query to jump straight to the item). */
export function resourcePath(type: GovResourceType, id: string): string {
  switch (type) {
    case "agent": return `/agents/${id}`;
    case "knowledge": return `/knowledge/${id}`;
    case "skill": return `/tools/${id}`;
    case "guardrail": return `/guardrails?open=${id}`;
    case "connector": return `/connectors?tab=custom&open=${id}`;
  }
}

export function agentEmoji(agentId: string): string | undefined {
  try { return getAgent(agentId)?.emoji; } catch { return undefined; }
}
