// sessionStorage-backed Governance store — request-to-publish workflow shared by all five
// builder-created resource types (Agent, Knowledge, Skill, Guardrail, Connector).
//
// Design (v3 — confirmed with PO, supersedes the old "bundle" model): publishing an Agent and
// sharing a Resource (Knowledge/Skill/Guardrail/Connector) into the Tenant Library for reuse by
// OTHER builders are two INDEPENDENT decisions, made by two different reviewers, and neither one
// gates the other:
//   - An Agent's governance request is reviewed by the Org/Unit Admin who owns the Workspace it's
//     being published into. Approving it is the ONLY thing that decides whether the Agent reaches
//     real users. The reviewer sees the Agent's full detail — including every resource it uses,
//     whatever that resource's own Tenant-sharing status is (see `AgentResourceRef` below, purely
//     informational, never gates approval).
//   - A Resource's governance request (submitted independently from the resource's own page —
//     Knowledge/Skill/Guardrail/Connector — via RequestPublishModal) is reviewed by the Tenant
//     Admin. Approving it only adds the resource to the Tenant Library so other builders can reuse
//     it. Rejecting it never removes the resource from any Agent already using it — that Agent
//     keeps working with its own private copy, unaffected.
// This replaces the old "bundle everything an Agent references into one request, one reviewer,
// per-item approve/reject" model, which conflated the two decisions above.
//
// Versioning model: every resource that has ever cleared review has a "live snapshot" — a
// lightweight fingerprint of its fields as of the last approval. Submitting a request captures a
// "candidate snapshot" (current fields) to diff against that live snapshot — this is what drives
// changeState (new / modified / unchanged_approved) and the "Xem thay đổi" diff panel. Deliberately
// simple (confirmed with PO — no "which fields count as a big change" classification, since that
// was hard to define and not worth the implementation complexity): any changed tracked field just
// means "modified", full stop. Every edit goes back through the same reviewer's queue; the existing
// diff view + a fast Approve action are what keep that queue fast, not auto-classification.
import { loadMap, saveMap } from "@/lib/sessionPersist";
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
import { agentModelStore } from "../configure/agentModelStore";

export type GovResourceType = "agent" | "knowledge" | "skill" | "guardrail" | "connector";
/** "withdrawn" = the requester pulled it back, or it was replaced by a newer submission for the
 * same resource (see `submit`) — never decided by an Admin. */
export type GovRequestStatus = "pending" | "approved" | "rejected" | "revoked" | "withdrawn";
/** Scope requested for. "group" is an Agent published to a Nhóm cộng tác (collaboration group)
 * whose roster currently overlaps an Org/Unit roster above the anti-bypass threshold — see
 * collabGroupStore.ts. It reviews exactly like "org" (Org/Unit Admin decides), just labeled so the
 * reviewer sees why this one needed a look. */
export type GovAudience = "org" | "community" | "group";
export type GovChangeState = "new" | "modified" | "unchanged_approved";
export type GovItemDecision = "approved" | "rejected";

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
  group: "Nhóm cộng tác",
};

export const STATUS_LABEL: Record<GovRequestStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  revoked: "Đã thu hồi",
  withdrawn: "Đã rút",
};

/** Fields tracked per type for the live/candidate snapshot diff — no heavy/light distinction
 * (dropped per PO: too hard to define cleanly, and every change should go through the same
 * reviewer queue anyway). */
const TRACKED_FIELDS: Record<GovResourceType, string[]> = {
  agent: ["instructions", "model", "channels", "name", "desc", "emoji"],
  knowledge: ["description", "apiEndpoint", "hasApiKey", "querySharing", "name"],
  skill: ["body", "name", "description"],
  guardrail: ["action", "enabled", "name", "desc"],
  connector: ["url", "authType", "headers", "name"],
};
/** Human labels for the field keys above, for the diff view — falls back to the raw key. */
export const FIELD_LABEL: Record<string, string> = {
  instructions: "Instructions", model: "Model", channels: "Channels", name: "Tên", desc: "Mô tả",
  emoji: "Icon", description: "Mô tả", apiEndpoint: "API endpoint", hasApiKey: "API key",
  querySharing: "Query sharing", body: "Nội dung / instructions", action: "Hành động",
  enabled: "Bật/tắt", url: "URL", authType: "Kiểu xác thực", headers: "Headers",
};

export interface ResourceSnapshot {
  fields: Record<string, string>;
  capturedAt: number;
}

/** A resource an Agent references, captured at submit time — shown to the Org/Unit Admin as
 * read-only context ("what's inside this Agent"). Its sharing status is resolved LIVE at render
 * time (via `resourceShareStatus` below), not frozen at submit time, so the Admin always sees the
 * current picture — but it's informational only: it never blocks or gates the Agent decision. */
export interface AgentResourceRef {
  type: Exclude<GovResourceType, "agent">;
  resourceId: string;
  name: string;
}

/** One audience an Agent is published to inside Agent Workspace — mirrors the Deploy tab's
 * "Agent Workspace" list (a company, a department, a Nhóm cộng tác, individual people, or the
 * whole FPT AI Agent community). An Agent can target several at once. */
export type WorkspaceTargetKind = "company" | "department" | "group" | "people" | "community";
export interface WorkspaceTarget {
  kind: WorkspaceTargetKind;
  name: string;
  members?: number;
  /** Optional one-liner, e.g. why a Nhóm cộng tác needed review ("trùng 85% với Ban Pháp chế"). */
  detail?: string;
}

/** Snapshot of the rest of an Agent's configuration at submit time — the same sections the
 * Agent's own Build page shows (Kết nối, Agent phụ, Câu hỏi gợi ý), so the reviewer approves
 * exactly the version that was submitted. */
export interface AgentConnectionSnap { name: string; logoUrl?: string; scope: "shared" | "personal" }
export interface SubAgentSnap { name: string; description: string; model?: string; status?: "active" | "paused" }

export interface GovHistoryEntry {
  id: string;
  at: number;
  action: "submitted" | "approved" | "rejected" | "revoked" | "withdrawn";
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
  /** Human-readable "who exactly" for an `audience: "org"`/`"group"` request — e.g. "Ban Giam doc
   * (2 người), Nhóm Product Management (1 người)" or "Nhóm cộng tác 'Ra mắt Q4' (9 người, trùng 90%
   * với phòng Kinh doanh)". Undefined for "community" (always everyone) and older requests. */
  scopeSummary?: string;
  note: string;
  version?: string;
  status: GovRequestStatus;
  submittedAt: number;
  updatedAt: number;
  /** Only set for resourceType "agent" — the resources it references, for read-only display next
   * to the Agent (see AgentResourceRef doc comment). Never used to gate this request's decision. */
  resourceRefs?: AgentResourceRef[];
  /** Only set for resourceType "agent" — the external channels this publish request asks for
   * (e.g. "web", "zalo"). Workspace is implicit: every Agent governance request publishes to
   * Workspace, so it's always shown first on Request Detail. Undefined on older requests —
   * Request Detail then falls back to the Agent's configured channels. */
  channels?: string[];
  /** Only set for resourceType "agent" — who inside Agent Workspace this publish reaches. Falls
   * back to `audience` + `scopeSummary` on older requests (see workspaceTargetsOf). */
  workspaceTargets?: WorkspaceTarget[];
  /** Agent only — config snapshots (see AgentConnectionSnap). Undefined = fall back to live data
   * where the prototype has it (connections), else shown as "Chưa có". */
  connections?: AgentConnectionSnap[];
  subAgents?: SubAgentSnap[];
  starterPrompts?: string[];
  /** Agent only — model display name and the Agent's own (private) knowledge items at submit. */
  model?: string;
  privateKnowledge?: { name: string; kind: "doc" | "url" | "faq" }[];
  /** Fields of the main resource itself, captured at submit time — diffed against its current
   * fields to detect "builder kept editing after submitting" (see checkDrift), and against its
   * last-approved live snapshot for the "Xem thay đổi" panel. */
  mainSnapshotAtSubmit?: ResourceSnapshot;
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
  revokedAt?: number;
  revokedBy?: string;
  revokeReason?: string;
  history: GovHistoryEntry[];
}

const REQ_KEY = "governance_request_store_v6";
const LIVE_KEY = "governance_live_snapshots_v6";
const SEEDED_KEY = "governance_store_seeded_v6";
const DISMISSED_KEY = "governance_dismissed_rejections_v1";

const store = loadMap<string, GovRequest>(REQ_KEY);
/** "type:resourceId" → last-approved snapshot. A resource "has cleared governance at least once"
 * iff it has an entry here. */
const liveSnapshots = loadMap<string, ResourceSnapshot>(LIVE_KEY);
const persist = () => saveMap(REQ_KEY, store);
const persistLive = () => saveMap(LIVE_KEY, liveSnapshots);

const snapshotKey = (type: GovResourceType, id: string) => `${type}:${id}`;

let seq = 1000;
/** Next request id — one above the highest existing numeric id. `seq` alone restarts at 1000 on
 * every page load, which after a reload could hand out an id already in the store (e.g. the
 * seeded req-1001) and silently overwrite that request. */
const nextId = () => {
  let max = 999;
  for (const k of store.keys()) { const n = Number(k.replace(/^req-/, "")); if (Number.isFinite(n) && n > max) max = n; }
  return `req-${max + 1}`;
};
const now = () => Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function historyEntry(action: GovHistoryEntry["action"], actorId: string, actorName: string, note?: string): GovHistoryEntry {
  return { id: `h-${seq++}`, at: now(), action, actorId, actorName, note };
}

/* ───────────────────────── snapshot + diff ───────────────────────── */

function stringifyField(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function pickFields(obj: Record<string, unknown>, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = stringifyField(obj[k]);
  return out;
}

/** Builds a fresh fingerprint of a resource's tracked fields right now — undefined if the
 * resource no longer exists (deleted). */
export function buildSnapshot(type: GovResourceType, id: string): ResourceSnapshot | undefined {
  const keys = TRACKED_FIELDS[type];
  let obj: Record<string, unknown> | undefined;
  switch (type) {
    // Model comes from agentModelStore (what the Builder shows), not the static AgentRecord.
    case "agent": obj = { ...(getAgent(id) as unknown as Record<string, unknown>), model: agentModelStore.label(id) }; break;
    case "knowledge": obj = knowledgeBaseStore.get(id) as unknown as Record<string, unknown> | undefined; break;
    case "skill": obj = skillStore.get(id) as unknown as Record<string, unknown> | undefined; break;
    case "guardrail": obj = guardrailConsoleStore.get(id) as unknown as Record<string, unknown> | undefined; break;
    case "connector": obj = customConnectorStore.get(id) as unknown as Record<string, unknown> | undefined; break;
  }
  if (!obj) return undefined;
  return { fields: pickFields(obj, keys), capturedAt: now() };
}

function classifyChange(live: ResourceSnapshot | undefined, candidate: ResourceSnapshot | undefined): GovChangeState {
  if (!live || !candidate) return "new";
  const changedAny = Object.keys(candidate.fields).some(k => candidate.fields[k] !== (live.fields[k] ?? ""));
  return changedAny ? "modified" : "unchanged_approved";
}

export interface FieldDiff { key: string; label: string; before: string; after: string }

/** Field-level before/after for the "Xem thay đổi" panel — only the fields that actually differ. */
export function diffSnapshots(base: ResourceSnapshot | undefined, current: ResourceSnapshot | undefined): FieldDiff[] {
  if (!base || !current) return [];
  const out: FieldDiff[] = [];
  for (const k of Object.keys(current.fields)) {
    const before = base.fields[k] ?? "";
    const after = current.fields[k];
    if (before !== after) out.push({ key: k, label: FIELD_LABEL[k] ?? k, before: before || "(chưa có)", after: after || "(để trống)" });
  }
  return out;
}

/** The main resource's change state right now, relative to its last-approved live snapshot — shown
 * next to the request header so a reviewer immediately sees "Mới" / "Đã sửa" / "Không đổi". */
export function mainChangeState(req: GovRequest): GovChangeState {
  const live = liveSnapshots.get(snapshotKey(req.resourceType, req.resourceId));
  const candidate = buildSnapshot(req.resourceType, req.resourceId) ?? req.mainSnapshotAtSubmit;
  return classifyChange(live, candidate);
}

/** Field-level diff for a request's main resource vs. its last-approved live snapshot — the
 * "Thay đổi so với lần duyệt trước" panel on Request Detail. Falls back to the submit-time
 * snapshot when the resource has since been deleted, so the panel still shows *something*
 * rather than silently going blank. */
export function requestDiff(req: GovRequest): FieldDiff[] {
  const live = liveSnapshots.get(snapshotKey(req.resourceType, req.resourceId));
  const candidate = buildSnapshot(req.resourceType, req.resourceId) ?? req.mainSnapshotAtSubmit;
  return diffSnapshots(live, candidate);
}

/** Has the main resource (the Agent, or the standalone Knowledge/Skill/Guardrail/Connector this
 * request is about) been edited again since this request was submitted, and the request is still
 * awaiting a decision? Drives the drift banner on Request Detail. */
export function checkDrift(req: GovRequest): { drifted: boolean; at?: number } {
  if (req.status !== "pending") return { drifted: false };
  if (!req.mainSnapshotAtSubmit) return { drifted: false };
  const current = buildSnapshot(req.resourceType, req.resourceId);
  if (!current) return { drifted: false };
  const changed = Object.keys(current.fields).some(k => current.fields[k] !== (req.mainSnapshotAtSubmit!.fields[k] ?? ""));
  return { drifted: changed, at: current.capturedAt };
}

/** Live sharing status of a resource an Agent references, for the read-only "Thành phần Agent này
 * sử dụng" panel — resolved fresh every render, never frozen at the Agent request's submit time,
 * and never used to gate the Agent's own approval. */
export type ResourceShareStatus = "shared" | "pending_review" | "private";
export function resourceShareStatus(type: Exclude<GovResourceType, "agent">, id: string): ResourceShareStatus {
  seed();
  if (liveSnapshots.has(snapshotKey(type, id))) return "shared";
  const open = [...store.values()].find(r => r.resourceType === type && r.resourceId === id && r.status === "pending");
  if (open) return "pending_review";
  return "private";
}

/** Workspace audiences for an Agent request — the explicit list when the request has one, else a
 * single entry derived from the older `audience` + `scopeSummary` fields. */
export function workspaceTargetsOf(req: GovRequest): WorkspaceTarget[] {
  if (req.workspaceTargets && req.workspaceTargets.length > 0) return req.workspaceTargets;
  if (req.audience === "community") return [{ kind: "community", name: "FPT AI Agent community" }];
  return [{ kind: req.audience === "group" ? "group" : "department", name: req.scopeSummary ?? AUDIENCE_LABEL[req.audience] }];
}

/* ───────────────────────── seed ───────────────────────── */

function seed() {
  if (seededOnce()) return;
  markSeeded();
  const t = now();

  const LOGO = {
    outlook: "https://upload.wikimedia.org/wikipedia/commons/4/45/Microsoft_Office_Outlook_%282018%E2%80%932024%29.svg",
    sharepoint: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282018%E2%80%93present%29.svg",
    teams: "https://upload.wikimedia.org/wikipedia/commons/9/94/Microsoft_Office_Teams_%282019%E2%80%932025%29.svg",
    salesforce: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
    sheets: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Google_Sheets_2020_Logo.svg",
    slack: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
    gcalendar: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
    gdrive: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
  } as const;
  const conn = (name: string, logo: keyof typeof LOGO, scope: "shared" | "personal"): AgentConnectionSnap => ({ name, logoUrl: LOGO[logo], scope });

  const mk = (r: Omit<GovRequest, "history">, hist: GovHistoryEntry[]): GovRequest => ({ ...r, history: hist });

  // 1 — the centerpiece: an Agent request. Its resourceRefs are shown to the Org/Unit Admin as
  // read-only context — 2 of the 3 haven't cleared Tenant review yet, but that never blocks this
  // Agent's own approval (see the module doc comment above).
  const agentReq = mk(
    {
      id: "req-1001", resourceType: "agent", resourceId: "hr", resourceName: "HR Onboarding Bot",
      resourceIcon: "🤝", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "org", note: "Mở rộng agent Onboarding cho toàn bộ phòng Nhân sự — bổ sung lộ trình sản phẩm và cảnh báo leo thang.",
      version: "v1.1.0", status: "pending", submittedAt: t - 3 * HOUR, updatedAt: t - 3 * HOUR,
      scopeSummary: "Phòng Nhân sự (36 người)", channels: ["web"],
      workspaceTargets: [{ kind: "department", name: "Phòng Nhân sự", members: 36 }, { kind: "people", name: "Ban Giám đốc", members: 3 }],
      connections: [conn("Microsoft Outlook", "outlook", "shared"), conn("Google Calendar", "gcalendar", "personal")],
      subAgents: [],
      starterPrompts: ["Tuần đầu onboarding gồm những gì?", "Đặt lịch gặp HRBP giúp tôi"],
      resourceRefs: [
        { type: "knowledge", resourceId: "kb-7", name: "Lộ trình sản phẩm nội bộ" },
        { type: "skill", resourceId: "weekly-digest", name: "weekly-digest" },
        { type: "guardrail", resourceId: "g-6", name: "Escalate risky replies" },
      ],
    },
    [historyEntry("submitted", "m-fsoft-vn-1", "Duy Nguyen")],
  );

  // 2 — standalone Knowledge, rejected (Tenant Admin's own queue — unrelated to any Agent).
  const kbReq = mk(
    {
      id: "req-1002", resourceType: "knowledge", resourceId: "kb-4", resourceName: "Chính sách nhân sự",
      requesterId: "m-fsoft-coo", requesterName: "Linh Phan",
      audience: "org", note: "Chia sẻ chính sách nghỉ phép & phúc lợi mới nhất cho toàn công ty.",
      status: "rejected", submittedAt: t - 1 * DAY, updatedAt: t - 5 * HOUR,
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
      reviewNote: "Cần bổ sung nguồn tài liệu gốc (link phòng Nhân sự) trước khi duyệt — hiện chưa có căn cứ để đối chiếu.",
    },
    [
      historyEntry("submitted", "m-fsoft-coo", "Linh Phan"),
      historyEntry("rejected", "m-fsoft-ceo", "Tran Nam", "Cần bổ sung nguồn tài liệu gốc (link phòng Nhân sự) trước khi duyệt — hiện chưa có căn cứ để đối chiếu."),
    ],
  );

  // 3 — standalone Skill, already approved.
  const skillReq = mk(
    {
      id: "req-1003", resourceType: "skill", resourceId: "email-drafter", resourceName: "email-drafter",
      requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "community", note: "Skill soạn email đã dùng ổn định 2 tuần trong team — đề xuất mở cho toàn bộ FPT AI Agent community.",
      status: "approved", submittedAt: t - 3 * DAY, updatedAt: t - 2 * DAY,
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam", reviewNote: "Đã test thử — hoạt động tốt, duyệt.",
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
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
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
    },
    [historyEntry("submitted", "m-fsoft-vn-1", "Duy Nguyen")],
  );

  // 6 — historical Agent request, fully approved — gives the Audit Log something with real depth.
  const agentCleanReq = mk(
    {
      id: "req-1006", resourceType: "agent", resourceId: "cskh", resourceName: "Banking ABC — Customer Care",
      resourceIcon: "🏦", requesterId: "m-fsoft-ceo", requesterName: "Tran Nam",
      audience: "org", note: "Publish bản chính thức phục vụ tổng đài CSKH.",
      version: "v1.0.1", status: "approved", submittedAt: t - 8 * DAY, updatedAt: t - 7 * DAY,
      resourceRefs: [
        { type: "knowledge", resourceId: "kb-1", name: "Chính sách ngân hàng ABC" },
        { type: "knowledge", resourceId: "kb-2", name: "FAQ chăm sóc khách hàng" },
      ],
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam", reviewNote: "Đạt yêu cầu, duyệt bản chính thức.",
    },
    [
      historyEntry("submitted", "m-fsoft-ceo", "Tran Nam"),
      historyEntry("approved", "m-fsoft-ceo", "Tran Nam", "Đạt yêu cầu, duyệt bản chính thức."),
    ],
  );


  // ── More Agent requests, so the Agent Requests queue demos realistically (several pending
  // requests across different audiences/channels, plus resolved ones). History timestamps are
  // set explicitly (hAt) so the timeline matches submittedAt instead of "now".
  const hAt = (action: GovHistoryEntry["action"], actorId: string, actorName: string, at: number, note?: string): GovHistoryEntry =>
    ({ id: `h-${seq++}`, at, action, actorId, actorName, note });

  const quoteReq = mk(
    {
      id: "req-2001", resourceType: "agent", resourceId: "sales-quote", resourceName: "Trợ lý Báo giá (Sales)",
      resourceIcon: "💼", requesterId: "m-fsoft-coo", requesterName: "Linh Phan",
      audience: "org", scopeSummary: "Phòng Kinh doanh (48 người)", channels: ["web", "zalo", "teams", "api"],
      workspaceTargets: [
        { kind: "department", name: "Phòng Kinh doanh", members: 48 },
        { kind: "department", name: "Phòng Chăm sóc khách hàng", members: 22 },
        { kind: "group", name: "Nhóm cộng tác 'Ra mắt Q4'", members: 9 },
        { kind: "people", name: "Linh Phan, Tran Nam", members: 2 },
      ],
      connections: [conn("Microsoft Outlook", "outlook", "shared"), conn("Microsoft SharePoint", "sharepoint", "shared"), conn("Salesforce", "salesforce", "personal")],
      subAgents: [
        { name: "discount-checker", description: "Kiểm tra mức chiết khấu đề xuất so với hạn mức 10% trước khi soạn báo giá.", model: "DeepSeek V4 Flash", status: "active" },
        { name: "quote-formatter", description: "Định dạng báo giá theo mẫu chuẩn EOS và xuất PDF.", model: "DeepSeek V4 Flash", status: "active" },
      ],
      starterPrompts: ["Soạn báo giá cho khách hàng ABC Corp", "Chiết khấu tối đa cho gói Enterprise là bao nhiêu?", "Tạo báo giá từ deal mới nhất trên CRM"],
      note: "Nâng cấp model và cập nhật mô tả theo chính sách chiết khấu EOS mới — cần duyệt lại trước khi áp dụng cho toàn phòng Kinh doanh.",
      version: "v2.0.0", status: "pending", submittedAt: t - 45 * 60 * 1000, updatedAt: t - 45 * 60 * 1000,
      resourceRefs: [
        { type: "knowledge", resourceId: "kb-5", name: "Kịch bản bán hàng" },
        { type: "skill", resourceId: "vendor-pricing-lookup", name: "vendor-pricing-lookup" },
        { type: "skill", resourceId: "email-drafter", name: "email-drafter" },
        { type: "guardrail", resourceId: "g-4", name: "Commercial response policy" },
        { type: "guardrail", resourceId: "g-9", name: "Vendor pricing disclosure" },
        { type: "connector", resourceId: "cc-1", name: "internal-crm-mcp" },
      ],
    },
    [hAt("submitted", "m-fsoft-coo", "Linh Phan", t - 45 * 60 * 1000)],
  );

  const legalReq = mk(
    {
      id: "req-2002", resourceType: "agent", resourceId: "legal-review", resourceName: "AI Agent Pháp chế — Điều khoản hợp đồng",
      resourceIcon: "⚖️", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "group", scopeSummary: "Nhóm cộng tác 'Pháp chế EOS' (12 người, trùng 85% với Ban Pháp chế)", channels: ["teams"],
      workspaceTargets: [{ kind: "group", name: "Nhóm cộng tác 'Pháp chế EOS'", members: 12, detail: "Trùng 85% với Ban Pháp chế — vượt ngưỡng nên cần duyệt" }],
      connections: [conn("Microsoft Outlook", "outlook", "shared"), conn("Microsoft SharePoint", "sharepoint", "shared")],
      subAgents: [
        { name: "clause-matcher", description: "Đối chiếu điều khoản trong hợp đồng với thư viện điều khoản chuẩn.", model: "Claude 3.5", status: "active" },
        { name: "risk-scorer", description: "Chấm điểm rủi ro hợp đồng theo checklist pháp chế.", model: "Claude 3.5", status: "paused" },
      ],
      starterPrompts: ["Có hợp đồng nào đang chờ Legal duyệt không?", "Tóm tắt rủi ro của hợp đồng mới nhất"],
      note: "Nhóm cộng tác đã vượt ngưỡng trùng lặp với Ban Pháp chế — gửi duyệt theo quy định.",
      version: "v1.2.0", status: "pending", submittedAt: t - 5 * HOUR, updatedAt: t - 5 * HOUR,
      resourceRefs: [
        { type: "knowledge", resourceId: "kb-6", name: "Cổng tri thức pháp lý" },
        { type: "guardrail", resourceId: "g-5", name: "Legal and medical advice" },
        { type: "connector", resourceId: "cc-3", name: "legal-search-mcp" },
      ],
    },
    [hAt("submitted", "m-plat-1", "Mai Hoang", t - 5 * HOUR)],
  );

  const financeReq = mk(
    {
      id: "req-2003", resourceType: "agent", resourceId: "finance-check", resourceName: "AI Agent Tài chính — Kiểm duyệt chiết khấu",
      resourceIcon: "🧮", requesterId: "m-fsoft-coo", requesterName: "Linh Phan",
      audience: "org", scopeSummary: "Phòng Tài chính (14 người), Phòng Kinh doanh (48 người)", channels: ["teams", "email"],
      workspaceTargets: [{ kind: "department", name: "Phòng Tài chính", members: 14 }, { kind: "department", name: "Phòng Kinh doanh", members: 48 }],
      connections: [conn("Microsoft Teams", "teams", "shared"), conn("Google Sheets", "sheets", "shared")],
      subAgents: [],
      starterPrompts: ["Đề xuất chiết khấu 15% này có cần Quản lý duyệt không?", "Hạn mức chiết khấu hiện hành là bao nhiêu?"],
      note: "Mở rộng cho Phòng Kinh doanh tự kiểm tra đề xuất chiết khấu trước khi gửi Tài chính.",
      version: "v1.3.0", status: "pending", submittedAt: t - 1 * DAY - 2 * HOUR, updatedAt: t - 1 * DAY - 2 * HOUR,
      resourceRefs: [
        { type: "guardrail", resourceId: "g-4", name: "Commercial response policy" },
        { type: "connector", resourceId: "cc-2", name: "finance-reporting-mcp" },
      ],
    },
    [hAt("submitted", "m-fsoft-coo", "Linh Phan", t - 1 * DAY - 2 * HOUR)],
  );

  const helpdeskReq = mk(
    {
      id: "req-2004", resourceType: "agent", resourceId: "ops", resourceName: "IT Helpdesk",
      resourceIcon: "🛠️", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "community", channels: ["web", "api"],
      workspaceTargets: [{ kind: "community", name: "FPT AI Agent community" }],
      connections: [conn("Slack", "slack", "shared")],
      subAgents: [{ name: "vpn-helper", description: "Hướng dẫn cài đặt và xử lý lỗi VPN từng bước.", model: "DeepSeek V4 Flash", status: "active" }],
      starterPrompts: ["Tôi quên mật khẩu", "Hướng dẫn cài VPN trên macOS", "Tạo ticket hỗ trợ"],
      note: "Agent đã chạy ổn định 1 tháng nội bộ — đề xuất chia sẻ cho FPT AI Agent community làm mẫu Helpdesk L1.",
      version: "v1.4.0", status: "pending", submittedAt: t - 2 * DAY, updatedAt: t - 2 * DAY,
      resourceRefs: [
        { type: "knowledge", resourceId: "kb-3", name: "Tài liệu vận hành nội bộ" },
        { type: "skill", resourceId: "weekly-digest", name: "weekly-digest" },
      ],
    },
    [hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 2 * DAY)],
  );

  const faqReq = mk(
    {
      id: "req-2005", resourceType: "agent", resourceId: "faq", resourceName: "Product FAQ Assistant",
      resourceIcon: "📦", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", scopeSummary: "Toàn công ty", channels: ["web", "messenger"],
      workspaceTargets: [{ kind: "company", name: "FPT Smart Cloud", members: 1250 }],
      connections: [conn("Google Drive", "gdrive", "shared")],
      subAgents: [],
      starterPrompts: ["Chính sách bảo hành sản phẩm?", "Cách reset thiết bị về mặc định"],
      note: "Publish bản FAQ sản phẩm mới cho toàn công ty.",
      version: "v1.1.0", status: "approved", submittedAt: t - 4 * DAY, updatedAt: t - 3 * DAY,
      resourceRefs: [{ type: "knowledge", resourceId: "kb-2", name: "FAQ chăm sóc khách hàng" }],
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam", reviewNote: "Đã test các câu hỏi thường gặp — trả lời đúng, duyệt.",
    },
    [
      hAt("submitted", "m-plat-1", "Mai Hoang", t - 4 * DAY),
      hAt("approved", "m-fsoft-ceo", "Tran Nam", t - 3 * DAY, "Đã test các câu hỏi thường gặp — trả lời đúng, duyệt."),
    ],
  );

  const salesReq = mk(
    {
      id: "req-2006", resourceType: "agent", resourceId: "sales", resourceName: "Sales Lead Qualifier",
      resourceIcon: "🎯", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "community", channels: ["web"],
      workspaceTargets: [{ kind: "community", name: "FPT AI Agent community" }],
      note: "Chia sẻ Agent chấm điểm lead cho community.",
      version: "v1.0.2", status: "rejected", submittedAt: t - 6 * DAY, updatedAt: t - 5 * DAY,
      resourceRefs: [{ type: "connector", resourceId: "cc-1", name: "internal-crm-mcp" }],
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
      reviewNote: "Agent đang gọi CRM nội bộ — không phù hợp publish ra community. Vui lòng chọn phạm vi Company / department.",
    },
    [
      hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 6 * DAY),
      hAt("rejected", "m-fsoft-ceo", "Tran Nam", t - 5 * DAY, "Agent đang gọi CRM nội bộ — không phù hợp publish ra community. Vui lòng chọn phạm vi Company / department."),
    ],
  );
  const extraAgentReqs = [quoteReq, legalReq, financeReq, helpdeskReq, faqReq, salesReq];

  [agentReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq, ...extraAgentReqs].forEach(r => store.set(r.id, r));
  persist();

  // Seed the live-snapshot ledger to match the stories above: weekly-digest + kb-1/kb-2/
  // email-drafter already cleared review before; kb-7 / g-6 / cc-3 / g-9 / kb-4 have not.
  (["skill:weekly-digest", "knowledge:kb-1", "knowledge:kb-2", "skill:email-drafter"] as const).forEach(k => {
    const [type, id] = k.split(":") as [Exclude<GovResourceType, "agent">, string];
    const snap = buildSnapshot(type, id);
    if (snap) liveSnapshots.set(snapshotKey(type, id), snap);
  });
  const faqSnap = buildSnapshot("agent", "faq");
  if (faqSnap) liveSnapshots.set(snapshotKey("agent", "faq"), faqSnap);
  // sales-quote was approved before on an older model/description — so its pending v2.0.0
  // request shows "Có chỉnh sửa" with a real field diff.
  const quoteSnap = buildSnapshot("agent", "sales-quote");
  if (quoteSnap) liveSnapshots.set(snapshotKey("agent", "sales-quote"), {
    capturedAt: t - 20 * DAY,
    fields: { ...quoteSnap.fields, model: "Gemini 1.5 Flash", desc: "Soạn báo giá từ CRM & ERP theo mẫu báo giá chuẩn." },
  });
  persistLive();

  // Mirror the seed into the audit log so /governance/audit-log has matching history from day one.
  for (const r of [agentReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq, ...extraAgentReqs]) {
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

/* ───────────────────────── resource refs (Agent's read-only context) ───────────────────────── */

/** Every builder-owned resource an Agent references right now — Knowledge/Skill/Guardrail/
 * Connector, excluding built-in/mandatory/marketplace items that aren't part of this workflow at
 * all (e.g. the PII protection guardrail, the Gmail connector). Used two ways: (1) as read-only
 * context attached to the Agent's own governance request, so its reviewer can see what's inside
 * without that gating anything; (2) by the Publish modal's policy gate (a Guardrail/Connector an
 * Admin has blocked from new Agents — see resourceBlockStore — still can't ride along). */
export function listAgentResourceRefs(agentId: string): AgentResourceRef[] {
  const items: AgentResourceRef[] = [];

  const kbIds = knowledgeStore.listAttachedConsoleKbIds(agentId);
  for (const id of kbIds) {
    const kb = knowledgeBaseStore.get(id);
    if (!kb) continue;
    items.push({ type: "knowledge", resourceId: kb.id, name: kb.name });
  }

  const skillIds = agentSkillStore.listAttachedConsoleSkillIds(agentId);
  for (const id of skillIds) {
    const s = skillStore.get(id);
    if (!s) continue;
    items.push({ type: "skill", resourceId: s.id, name: s.name });
  }

  const guardrailIds = agentGuardrailStore.listAttachedConsoleGuardrailIds(agentId);
  for (const id of guardrailIds) {
    const g = guardrailConsoleStore.get(id);
    if (!g || g.mandatory) continue; // mandatory compliance rules aren't a builder resource
    items.push({ type: "guardrail", resourceId: g.id, name: g.name });
  }

  const connectors = agentConnectorStore.list(agentId);
  for (const c of connectors) {
    const cc = customConnectorStore.get(c.connectorId);
    if (!cc) continue; // marketplace/built-in connector (e.g. Gmail) — not a governance resource
    items.push({ type: "connector", resourceId: cc.id, name: cc.name });
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

  /** The one open (pending) request for a resource, if any — drives the Agent
   * Builder top-bar "Đang chờ duyệt" pill and blocks a second concurrent submission. */
  getOpenRequestForResource(resourceType: GovResourceType, resourceId: string): GovRequest | undefined {
    seed();
    return [...store.values()]
      .filter(r => r.resourceType === resourceType && r.resourceId === resourceId && r.status === "pending")
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  },

  /** Most recent request for a resource, any status — drives the Builder-side "Bị từ chối" pill,
   * banner and Agents-list badge (a rejection only matters while it's the latest word). */
  latestForResource(resourceType: GovResourceType, resourceId: string): GovRequest | undefined {
    seed();
    return [...store.values()]
      .filter(r => r.resourceType === resourceType && r.resourceId === resourceId)
      .sort((a, b) => b.submittedAt - a.submittedAt)[0];
  },

  /** Builder can hide the rejection banner for a given request (per browser session). */
  isRejectionDismissed(requestId: string): boolean {
    try { return (JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]") as string[]).includes(requestId); } catch { return false; }
  },
  dismissRejection(requestId: string) {
    try {
      const ids = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
      if (!ids.includes(requestId)) sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids, requestId]));
    } catch { /* ignore */ }
  },

  restoreRejection(requestId: string) {
    try {
      const ids = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.filter(x => x !== requestId)));
    } catch { /* ignore */ }
  },

  listForResource(resourceType: GovResourceType, resourceId: string): GovRequest[] {
    seed();
    return [...store.values()]
      .filter(r => r.resourceType === resourceType && r.resourceId === resourceId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /** Optional scope narrows the count to just the Agent queue or just the Resource queue —
   * the 2 are separate pages now (GovernanceRequests.tsx / GovernanceLibraryRequests.tsx), each
   * with its own sidebar badge, so the badge itself needs to know which page it points at. */
  pendingCount(scope?: "agent" | "resource"): number {
    seed();
    return [...store.values()].filter(r =>
      r.status === "pending" &&
      (!scope || (scope === "agent" ? r.resourceType === "agent" : r.resourceType !== "agent"))
    ).length;
  },

  isResourceApproved(type: Exclude<GovResourceType, "agent">, id: string): boolean {
    seed();
    return liveSnapshots.has(snapshotKey(type, id));
  },

  submit(input: {
    resourceType: GovResourceType; resourceId: string; resourceName: string; resourceIcon?: string;
    requesterId: string; requesterName: string; audience: GovAudience; note: string; version?: string;
    resourceRefs?: AgentResourceRef[]; scopeSummary?: string; channels?: string[]; workspaceTargets?: WorkspaceTarget[];
    connections?: AgentConnectionSnap[]; subAgents?: SubAgentSnap[]; starterPrompts?: string[];
    model?: string; privateKnowledge?: { name: string; kind: "doc" | "url" | "faq" }[];
  }): GovRequest {
    seed();
    // One open request per resource: submitting a newer version replaces the pending one
    // (withdrawn with a pointer to the new version), so the Admin only ever reviews the latest.
    const previous = this.getOpenRequestForResource(input.resourceType, input.resourceId);
    if (previous) {
      this.withdraw(previous.id, input.requesterId, input.requesterName,
        `Được thay thế bởi yêu cầu ${input.version ?? "mới hơn"}.`);
    }
    const id = nextId();
    const t = now();
    const req: GovRequest = {
      id, resourceType: input.resourceType, resourceId: input.resourceId, resourceName: input.resourceName,
      resourceIcon: input.resourceIcon, requesterId: input.requesterId, requesterName: input.requesterName,
      audience: input.audience, scopeSummary: input.scopeSummary, note: input.note, version: input.version, status: "pending",
      submittedAt: t, updatedAt: t, resourceRefs: input.resourceRefs, channels: input.channels, workspaceTargets: input.workspaceTargets,
      connections: input.connections, subAgents: input.subAgents, starterPrompts: input.starterPrompts,
      model: input.model, privateKnowledge: input.privateKnowledge,
      mainSnapshotAtSubmit: buildSnapshot(input.resourceType, input.resourceId),
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

  /** Requester pulls a pending request back (or `submit` replaces it with a newer one). The
   * resource's live state is untouched — nothing was ever approved from this request. */
  withdraw(id: string, actorId: string, actorName: string, note?: string): GovRequest | undefined {
    seed();
    const r = store.get(id);
    if (!r || r.status !== "pending") return r;
    const t = now();
    r.status = "withdrawn";
    r.updatedAt = t;
    r.history.push(historyEntry("withdrawn", actorId, actorName, note));
    store.set(id, r);
    persist();
    auditLogStore.log({ actorId, actorName, action: "withdrawn", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note, at: t });
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

    // Promote the resource's current fields to "live" — the only thing an approval does.
    const mainSnap = buildSnapshot(r.resourceType, r.resourceId);
    if (mainSnap) liveSnapshots.set(snapshotKey(r.resourceType, r.resourceId), mainSnap);
    persistLive();
    store.set(id, r);
    persist();

    // For an Agent, actually flip it live via agentPublishStore so the rest of the prototype
    // (top-bar pill, My agents list) reflects the approval immediately.
    if (r.resourceType === "agent") {
      const current = agentPublishStore.get(r.resourceId);
      agentPublishStore.publish(r.resourceId, "workspace", current.channels, r.version ?? current.version, r.audience === "group" ? "group" : r.audience === "community" ? "community" : "org");
      agentPublishStore.clearRegovernanceFlag(r.resourceId);
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

  /** Undo an approved request — rolls the resource back out of the live-snapshot ledger (next
   * computation sees it as "new" again) and un-publishes an Agent. Does not restore a prior live
   * snapshot (this ledger only ever tracks the current live version, not full history) — a
   * deliberate simplification for the prototype. */
  revoke(id: string, reviewerId: string, reviewerName: string, reason: string): GovRequest | undefined {
    seed();
    const r = store.get(id);
    if (!r || r.status !== "approved") return r;
    const t = now();
    r.status = "revoked";
    r.updatedAt = t;
    r.revokedAt = t; r.revokedBy = reviewerName; r.revokeReason = reason;
    r.history.push(historyEntry("revoked", reviewerId, reviewerName, reason));
    store.set(id, r);
    persist();

    liveSnapshots.delete(snapshotKey(r.resourceType, r.resourceId));
    persistLive();

    if (r.resourceType === "agent") agentPublishStore.unpublish(r.resourceId);

    auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "revoked", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note: reason, at: t });
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
