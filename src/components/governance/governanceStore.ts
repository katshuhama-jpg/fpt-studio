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
import { CHANNEL_CATALOG } from "../configure/channelCatalog";
import { externalAgentStore } from "../external-agents/externalAgentStore";
import { notificationStore, REVIEWERS, type AppNotification, type NotificationKind } from "../notifications/notificationStore";

/** External Agents live under ids "ext-…" and go through the exact same Agent approval model. */
export const isExternalAgentId = (id: string) => id.startsWith("ext-");
/** What a reviewer needs to judge an External Agent — the connection, not model/skills. Frozen at submit. */
export interface ExternalAgentSnap {
  description: string;
  baseUrl: string;
  authMethod: string;
  guardrail: string | null;
  historyDelivery: string;
  authorizeHosts: string[];
  endpointsOk: boolean | null;
  lastHealthCheckAt: number | null;
}
export function externalSnapOf(id: string): ExternalAgentSnap | undefined {
  const a = externalAgentStore.get(id);
  if (!a) return undefined;
  return {
    description: a.description,
    baseUrl: a.baseUrl,
    authMethod: a.authMethod === "bearer" ? "Bearer token" : a.authMethod === "headers" ? "Custom headers" : "Không xác thực",
    guardrail: a.guardrail,
    historyDelivery: a.historyDelivery.mode === "full" ? "Toàn bộ hội thoại" : a.historyDelivery.mode === "last_n" ? `${a.historyDelivery.lastN ?? 10} tin gần nhất` : "Không gửi",
    authorizeHosts: a.allowedAuthorizeHosts,
    endpointsOk: a.lastHealthCheckOk,
    lastHealthCheckAt: a.lastHealthCheckAt,
  };
}

const EXTRA_CHANNEL_NAMES: Record<string, string> = { teams: "Microsoft Teams", email: "Email" };
/** Display name of an external channel id ("slack" → "Slack"). */
export function channelLabel(id: string): string {
  const k = id.toLowerCase();
  return CHANNEL_CATALOG.find(c => c.id === k)?.name ?? EXTRA_CHANNEL_NAMES[k] ?? id;
}

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
  org: "Công ty / phòng ban",
  community: "Cộng đồng FPT AI Agent",
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

/** What an Agent request asks for. "publish" (default) = a new version going live to a Workspace
 * scope. "channels" = turning on one or more external channels for the version already live —
 * external channels are their own publish scope (outside Agent Workspace), so switching one ON
 * always needs Org/Unit Admin review whatever the Workspace scope is; switching one OFF is
 * immediate and never needs review. The two kinds are tracked independently: each can have its
 * own open request at the same time. */
export type GovRequestKind = "publish" | "channels";
export const requestKind = (r: GovRequest): GovRequestKind => r.kind ?? "publish";
/** What a request is about, for the Audit Log line ("Bật kênh API" / "v1.2.0"). */
export function auditDetail(r: GovRequest): string | undefined {
  if (r.resourceType !== "agent") return undefined;
  if (requestKind(r) === "channels") return `Bật kênh ${(r.channelsAdded ?? []).map(channelLabel).join(", ")}`;
  return r.version;
}

export interface GovRequest {
  id: string;
  kind?: GovRequestKind;
  /** kind "channels" only — the channels this request switches ON (ids from CHANNEL_CATALOG). */
  channelsAdded?: string[];
  /** Set for an External Agent request (resourceId "ext-…") — its connection, frozen at submit. */
  externalSnap?: ExternalAgentSnap;
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
  /** Frozen at submit: what kind of change this request was, and the field diff, vs. the live
   * version at that moment. Once a request is decided these are what the page shows — comparing
   * an approved version with itself afterwards would read "Không thay đổi". */
  changeStateAtSubmit?: GovChangeState;
  diffAtSubmit?: FieldDiff[];
  /** Fields of the main resource itself, captured at submit time — diffed against its current
   * fields to detect "builder kept editing after submitting" (see checkDrift), and against its
   * last-approved live snapshot for the "Xem thay đổi" panel. */
  mainSnapshotAtSubmit?: ResourceSnapshot;
  /** Nhóm cộng tác publish: which group + the roster frozen at submit (what gets approved). */
  groupId?: string;
  groupMemberIds?: string[];
  /** Who reviews a Nhóm cộng tác request: "single" = the smallest unit holding ≥80% of the group's
   * members; "any" = every department that has members in the group — any one of their Admins
   * deciding is enough. Shown on the request; permission still gates who can press the buttons. */
  reviewUnits?: { id: string; name: string }[];
  reviewMode?: "single" | "any";
  /** Re-approval opened because members were added to an already-approved group. */
  addedMemberNames?: string[];
  /** Agent connections frozen at submit (connector id + scope) — what the Admin reviews. */
  connectionsAtSubmit?: { connectorId: string; scope: "shared" | "personal" }[];
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
  revokedAt?: number;
  revokedBy?: string;
  revokeReason?: string;
  /** Set when the Admin revoked back to the previous live version instead of stopping the Agent. */
  revokedToVersion?: string;
  history: GovHistoryEntry[];
}

const REQ_KEY = "governance_request_store_v15";
const LIVE_KEY = "governance_live_snapshots_v9";
const SEEDED_KEY = "governance_store_seeded_v15";
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
export function mainChangeState(req: GovRequest): GovChangeState | null {
  if (requestKind(req) === "channels") return "modified";
  if (req.externalSnap) return req.changeStateAtSubmit ?? null;
  // Decided requests keep the state they were submitted with (null → unknown, chip hidden).
  if (req.status !== "pending") return req.changeStateAtSubmit ?? null;
  // What is under review is the content frozen at submit, not whatever the Builder edited since.
  const live = liveSnapshots.get(snapshotKey(req.resourceType, req.resourceId));
  const candidate = req.mainSnapshotAtSubmit ?? buildSnapshot(req.resourceType, req.resourceId);
  return classifyChange(live, candidate);
}

/** Field-level diff for a request's main resource vs. its last-approved live snapshot — the
 * "Thay đổi so với lần duyệt trước" panel on Request Detail. Falls back to the submit-time
 * snapshot when the resource has since been deleted, so the panel still shows *something*
 * rather than silently going blank. */
export function requestDiff(req: GovRequest): FieldDiff[] {
  if (requestKind(req) === "channels" || req.externalSnap) return req.diffAtSubmit ?? [];
  if (req.status !== "pending") return req.diffAtSubmit ?? [];
  const live = liveSnapshots.get(snapshotKey(req.resourceType, req.resourceId));
  const candidate = req.mainSnapshotAtSubmit ?? buildSnapshot(req.resourceType, req.resourceId);
  return diffSnapshots(live, candidate);
}

/** Has the main resource (the Agent, or the standalone Knowledge/Skill/Guardrail/Connector this
 * request is about) been edited again since this request was submitted, and the request is still
 * awaiting a decision? Drives the drift banner on Request Detail. */
export function checkDrift(req: GovRequest): { drifted: boolean; at?: number } {
  if (requestKind(req) === "channels" || req.externalSnap) return { drifted: false };
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
  if (req.audience === "community") return [{ kind: "community", name: "Cộng đồng FPT AI Agent" }];
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

  // History timestamps are set explicitly so each request's timeline matches its submittedAt /
  // updatedAt (historyEntry() stamps "now", which made "Gửi lúc" and "Lịch sử" disagree).
  const hAt = (action: GovHistoryEntry["action"], actorId: string, actorName: string, at: number, note?: string): GovHistoryEntry =>
    ({ id: `h-${seq++}`, at, action, actorId, actorName, note });

  // 1 — the centerpiece: an Agent request. Its resourceRefs are shown to the Org/Unit Admin as
  // read-only context — 2 of the 3 haven't cleared Tenant review yet, but that never blocks this
  // Agent's own approval (see the module doc comment above).
  const agentReq = mk(
    {
      id: "req-1001", resourceType: "agent", resourceId: "hr", resourceName: "HR Onboarding Bot",
      resourceIcon: "🤝", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "org", note: "Mở rộng agent Onboarding cho toàn bộ phòng Nhân sự — bổ sung lộ trình sản phẩm và cảnh báo leo thang.",
      version: "v1.1.0", status: "pending", submittedAt: t - 3 * HOUR, updatedAt: t - 3 * HOUR,
      scopeSummary: "Phòng Nhân sự (36 người)", channels: [],
      workspaceTargets: [{ kind: "department", name: "Phòng Nhân sự", members: 36 }, { kind: "department", name: "Ban Giám đốc", members: 3 }],
      connections: [conn("Microsoft Outlook", "outlook", "shared"), conn("Google Calendar", "gcalendar", "personal")],
      subAgents: [],
      starterPrompts: ["Tuần đầu onboarding gồm những gì?", "Đặt lịch gặp HRBP giúp tôi"],
      resourceRefs: [
        { type: "knowledge", resourceId: "kb-7", name: "Lộ trình sản phẩm nội bộ" },
        { type: "skill", resourceId: "weekly-digest", name: "weekly-digest" },
        { type: "guardrail", resourceId: "g-6", name: "Escalate risky replies" },
      ],
    },
    [hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 3 * HOUR)],
  );

  // 2 — standalone Knowledge, rejected (Tenant Admin's own queue — unrelated to any Agent).
  const kbReq = mk(
    {
      id: "req-1002", changeStateAtSubmit: "new", resourceType: "knowledge", resourceId: "kb-4", resourceName: "Chính sách nhân sự",
      requesterId: "m-fsoft-coo", requesterName: "Linh Phan",
      audience: "org", note: "Chia sẻ chính sách nghỉ phép & phúc lợi mới nhất cho toàn công ty.",
      status: "rejected", submittedAt: t - 1 * DAY, updatedAt: t - 5 * HOUR,
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
      reviewNote: "Cần bổ sung nguồn tài liệu gốc (link phòng Nhân sự) trước khi duyệt — hiện chưa có căn cứ để đối chiếu.",
    },
    [
      hAt("submitted", "m-fsoft-coo", "Linh Phan", t - 1 * DAY),
      hAt("rejected", "m-fsoft-ceo", "Tran Nam", t - 5 * HOUR, "Cần bổ sung nguồn tài liệu gốc (link phòng Nhân sự) trước khi duyệt — hiện chưa có căn cứ để đối chiếu."),
    ],
  );

  // 3 — standalone Skill, already approved.
  const skillReq = mk(
    {
      id: "req-1003", changeStateAtSubmit: "new", resourceType: "skill", resourceId: "email-drafter", resourceName: "email-drafter",
      requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "community", note: "Skill soạn email đã dùng ổn định 2 tuần trong team — đề xuất mở cho toàn bộ Cộng đồng FPT AI Agent.",
      status: "approved", submittedAt: t - 3 * DAY, updatedAt: t - 2 * DAY,
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam", reviewNote: "Đã test thử — hoạt động tốt, duyệt.",
    },
    [
      hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 3 * DAY),
      hAt("approved", "m-fsoft-ceo", "Tran Nam", t - 2 * DAY, "Đã test thử — hoạt động tốt, duyệt."),
    ],
  );

  // 4 — standalone Guardrail, rejected.
  const guardrailReq = mk(
    {
      id: "req-1004", changeStateAtSubmit: "new", resourceType: "guardrail", resourceId: "g-9", resourceName: "Vendor pricing disclosure",
      requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", note: "Áp dụng cho toàn bộ Agent bán hàng để tránh lộ giá vendor nội bộ.",
      status: "rejected", submittedAt: t - 6 * DAY, updatedAt: t - 5 * DAY,
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
      reviewNote: "Chưa rõ phạm vi áp dụng — vui lòng làm rõ áp dụng cho Agent nào và bổ sung ví dụ câu trả lời mẫu trước khi gửi lại.",
    },
    [
      hAt("submitted", "m-plat-1", "Mai Hoang", t - 6 * DAY),
      hAt("rejected", "m-fsoft-ceo", "Tran Nam", t - 5 * DAY, "Chưa rõ phạm vi áp dụng — vui lòng làm rõ áp dụng cho Agent nào và bổ sung ví dụ câu trả lời mẫu trước khi gửi lại."),
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
    [hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 6 * HOUR)],
  );

  // 6 — historical Agent request, fully approved — IT Helpdesk's current live v1.3.0 (its later
  // v1.4.0 request, req-2004, is a real "Có chỉnh sửa" against this).
  const agentCleanReq = mk(
    {
      id: "req-1006", changeStateAtSubmit: "new", resourceType: "agent", resourceId: "ops", resourceName: "IT Helpdesk",
      resourceIcon: "🛠️", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "org", scopeSummary: "FPT Smart Cloud (35 người)", channels: ["web", "api"],
      workspaceTargets: [{ kind: "company", name: "FPT Smart Cloud", members: 35 }],
      connections: [conn("Slack", "slack", "shared")],
      subAgents: [],
      starterPrompts: ["Tôi quên mật khẩu", "Hướng dẫn cài VPN trên macOS"],
      note: "Publish bản chính thức Helpdesk L1 cho toàn công ty.",
      version: "v1.3.0", status: "approved", submittedAt: t - 8 * DAY, updatedAt: t - 7 * DAY,
      resourceRefs: [{ type: "knowledge", resourceId: "kb-3", name: "Tài liệu vận hành nội bộ" }],
      reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam", reviewNote: "Đạt yêu cầu, duyệt bản chính thức.",
    },
    [
      hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 8 * DAY),
      hAt("approved", "m-fsoft-ceo", "Tran Nam", t - 7 * DAY, "Đạt yêu cầu, duyệt bản chính thức."),
    ],
  );


  // ── More Agent requests, so the Agent Requests queue demos realistically (several pending
  // requests across different audiences/channels, plus resolved ones). History timestamps are
  // set explicitly (hAt) so the timeline matches submittedAt instead of "now".

  const quoteReq = mk(
    {
      id: "req-2001", resourceType: "agent", resourceId: "faq", resourceName: "Product FAQ Assistant",
      resourceIcon: "📦", requesterId: "m-fsoft-coo", requesterName: "Linh Phan",
      audience: "org", scopeSummary: "Phòng Chăm sóc khách hàng (22 người), Phòng Kinh doanh (48 người), Linh Phan, Tran Nam",
      // A version request carries only the channels already live (web); new channels are their
      // own "channels" request (see req-2008), never bundled into a version publish.
      channels: ["web"],
      workspaceTargets: [
        { kind: "department", name: "Phòng Chăm sóc khách hàng", members: 22 },
        { kind: "department", name: "Phòng Kinh doanh", members: 48 },
        { kind: "people", name: "Linh Phan, Tran Nam", members: 2 },
      ],
      connections: [conn("Google Drive", "gdrive", "shared"), conn("Microsoft SharePoint", "sharepoint", "shared"), conn("Salesforce", "salesforce", "personal")],
      subAgents: [
        { name: "warranty-checker", description: "Tra cứu tình trạng bảo hành theo số serial và hướng dẫn thủ tục đổi trả.", model: "DeepSeek V4 Flash", status: "active" },
        { name: "manual-finder", description: "Tìm đúng trang hướng dẫn sử dụng theo model sản phẩm.", model: "DeepSeek V4 Flash", status: "active" },
      ],
      starterPrompts: ["Chính sách bảo hành sản phẩm?", "Cách reset thiết bị về mặc định", "Kiểm tra bảo hành theo số serial"],
      note: "Đổi model và mở rộng cho phòng Kinh doanh — thêm tra cứu bảo hành theo serial.",
      version: "v1.2.0", status: "pending", submittedAt: t - 45 * 60 * 1000, updatedAt: t - 45 * 60 * 1000,
      resourceRefs: [
        { type: "knowledge", resourceId: "kb-2", name: "FAQ chăm sóc khách hàng" },
        { type: "knowledge", resourceId: "kb-5", name: "Kịch bản bán hàng" },
        { type: "skill", resourceId: "email-drafter", name: "email-drafter" },
        { type: "guardrail", resourceId: "g-4", name: "Commercial response policy" },
        { type: "guardrail", resourceId: "g-7", name: "Competitor mention block" },
        { type: "connector", resourceId: "cc-1", name: "internal-crm-mcp" },
      ],
    },
    [hAt("submitted", "m-fsoft-coo", "Linh Phan", t - 45 * 60 * 1000)],
  );

  const legalReq = mk(
    {
      id: "req-2002", resourceType: "agent", resourceId: "legal-review", resourceName: "AI Agent Pháp chế — Điều khoản hợp đồng",
      resourceIcon: "⚖️", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "group", scopeSummary: "Nhóm cộng tác 'Pháp chế EOS' (12 người, 83% thuộc Ban Pháp chế)", channels: ["slack"],
      workspaceTargets: [{ kind: "group", name: "Nhóm cộng tác 'Pháp chế EOS'", members: 12, detail: "10/12 thành viên (83%) thuộc Ban Pháp chế" }],
      reviewUnits: [{ id: "corp-legal", name: "Ban Pháp chế" }], reviewMode: "single",
      connections: [conn("Microsoft Outlook", "outlook", "shared"), conn("Microsoft SharePoint", "sharepoint", "shared")],
      subAgents: [
        { name: "clause-matcher", description: "Đối chiếu điều khoản trong hợp đồng với thư viện điều khoản chuẩn.", model: "Claude 3.5", status: "active" },
        { name: "risk-scorer", description: "Chấm điểm rủi ro hợp đồng theo checklist pháp chế.", model: "Claude 3.5", status: "paused" },
      ],
      starterPrompts: ["Có hợp đồng nào đang chờ Legal duyệt không?", "Tóm tắt rủi ro của hợp đồng mới nhất"],
      note: "Mở Agent cho nhóm Pháp chế EOS dùng thử trước khi mở rộng.",
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
      audience: "org", scopeSummary: "Phòng Tài chính (14 người), Phòng Kinh doanh (48 người)", channels: ["slack"],
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
      workspaceTargets: [{ kind: "community", name: "Cộng đồng FPT AI Agent" }],
      connections: [conn("Slack", "slack", "shared")],
      subAgents: [{ name: "vpn-helper", description: "Hướng dẫn cài đặt và xử lý lỗi VPN từng bước.", model: "DeepSeek V4 Flash", status: "active" }],
      starterPrompts: ["Tôi quên mật khẩu", "Hướng dẫn cài VPN trên macOS", "Tạo ticket hỗ trợ"],
      note: "Agent đã chạy ổn định 1 tháng nội bộ — đề xuất chia sẻ cho Cộng đồng FPT AI Agent làm mẫu Helpdesk L1.",
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
      id: "req-2005", changeStateAtSubmit: "new", resourceType: "agent", resourceId: "faq", resourceName: "Product FAQ Assistant",
      resourceIcon: "📦", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", scopeSummary: "Toàn công ty", channels: ["web"],
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
      id: "req-2006", changeStateAtSubmit: "new", resourceType: "agent", resourceId: "sales", resourceName: "Sales Lead Qualifier",
      resourceIcon: "🎯", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "community", channels: [],
      workspaceTargets: [{ kind: "community", name: "Cộng đồng FPT AI Agent" }],
      note: "Chia sẻ Agent chấm điểm lead cho community.",
      version: "v1.0.2", status: "rejected", submittedAt: t - 6 * DAY, updatedAt: t - 5 * DAY,
      resourceRefs: [{ type: "connector", resourceId: "cc-1", name: "internal-crm-mcp" }],
      reviewerId: "m-fsoft-coo", reviewerName: "Linh Phan",
      reviewNote: "Agent đang gọi CRM nội bộ — không phù hợp publish ra community. Vui lòng chọn phạm vi Công ty / phòng ban.",
    },
    [
      hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 6 * DAY),
      hAt("rejected", "m-fsoft-coo", "Linh Phan", t - 5 * DAY, "Agent đang gọi CRM nội bộ — không phù hợp publish ra community. Vui lòng chọn phạm vi Công ty / phòng ban."),
    ],
  );
  // Channel request: turn on API for the Legal Agent's live v1.1.0 — external channels are their
  // own publish scope, reviewed separately from any version/Workspace publish request.
  const legalApiReq = mk(
    {
      id: "req-2008", kind: "channels", channelsAdded: ["api"], changeStateAtSubmit: "modified",
      diffAtSubmit: [{ key: "channels", label: "Kênh ngoài", before: "Slack", after: "Slack, API" }],
      resourceType: "agent", resourceId: "legal-review", resourceName: "AI Agent Pháp chế — Điều khoản hợp đồng",
      resourceIcon: "⚖️", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", scopeSummary: "Ban Pháp chế (14 người)", channels: ["slack", "api"],
      workspaceTargets: [{ kind: "department", name: "Ban Pháp chế", members: 14 }],
      note: "Bật API để hệ thống quản lý hợp đồng gọi Agent kiểm tra điều khoản tự động.",
      version: "v1.1.0", status: "pending", submittedAt: t - 3 * HOUR, updatedAt: t - 3 * HOUR,
    },
    [hAt("submitted", "m-plat-1", "Mai Hoang", t - 3 * HOUR)],
  );
  // External Agents — same approval model as Agents (Agent Requests queue, Role permission,
  // Workspace scope). Statuses mirror the External Agent seed (externalAgentStore.ts).
  const extFlightReq = mk(
    {
      id: "req-3001", changeStateAtSubmit: "new", resourceType: "agent", resourceId: "ext-seed-1", resourceName: "Flight Assistant",
      resourceIcon: "✈️", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", scopeSummary: "Toàn công ty", channels: [],
      workspaceTargets: [{ kind: "company", name: "FPT Smart Cloud", members: 1250 }],
      externalSnap: externalSnapOf("ext-seed-1"),
      note: "Trợ lý đặt vé công tác — đối tác ABC, đã ký NDA.",
      version: "v1.0.2", status: "approved", submittedAt: t - 9 * DAY, updatedAt: t - 8 * DAY,
      reviewerId: "m-fsoft-coo", reviewerName: "Linh Phan", reviewNote: "Đã test tìm và giữ chỗ chuyến bay nội địa — duyệt.",
    },
    [hAt("submitted", "m-plat-1", "Mai Hoang", t - 9 * DAY), hAt("approved", "m-fsoft-coo", "Linh Phan", t - 8 * DAY, "Đã test tìm và giữ chỗ chuyến bay nội địa — duyệt.")],
  );
  const extLegalReq = mk(
    {
      id: "req-3002", changeStateAtSubmit: "new", resourceType: "agent", resourceId: "ext-seed-4", resourceName: "Legal Doc Checker",
      resourceIcon: "📜", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", scopeSummary: "Ban Pháp chế (14 người)", channels: [],
      workspaceTargets: [{ kind: "department", name: "Ban Pháp chế", members: 14 }],
      externalSnap: externalSnapOf("ext-seed-4"),
      note: "Agent đối tác rà soát điều khoản hợp đồng theo chính sách công ty — dùng thử cho Ban Pháp chế.",
      version: "v1.0.1", status: "pending", submittedAt: t - 5 * HOUR, updatedAt: t - 5 * HOUR,
    },
    [hAt("submitted", "m-plat-1", "Mai Hoang", t - 5 * HOUR)],
  );
  const extWarehouseReq = mk(
    {
      id: "req-3003", changeStateAtSubmit: "new", resourceType: "agent", resourceId: "ext-seed-5", resourceName: "Warehouse Bot",
      resourceIcon: "📦", requesterId: "m-fsoft-vn-1", requesterName: "Duy Nguyen",
      audience: "org", scopeSummary: "Phòng Vận hành (18 người)", channels: [],
      workspaceTargets: [{ kind: "department", name: "Phòng Vận hành", members: 18 }],
      externalSnap: externalSnapOf("ext-seed-5"),
      note: "Tra tồn kho và gợi ý nhập hàng.",
      version: "v1.0.1", status: "rejected", submittedAt: t - 2 * DAY, updatedAt: t - 1 * DAY,
      reviewerId: "m-fsoft-coo", reviewerName: "Linh Phan", reviewNote: "Domain wh.partner.io chưa có trong danh sách đối tác được phê duyệt.",
    },
    [hAt("submitted", "m-fsoft-vn-1", "Duy Nguyen", t - 2 * DAY), hAt("rejected", "m-fsoft-coo", "Linh Phan", t - 1 * DAY, "Domain wh.partner.io chưa có trong danh sách đối tác được phê duyệt.")],
  );
  // External Agent channel request: Flight Assistant (live v1.0.2 on Web widget + API) asks to add Slack.
  const extFlightSlackReq = mk(
    {
      id: "req-3004", kind: "channels", channelsAdded: ["slack"], changeStateAtSubmit: "modified",
      diffAtSubmit: [{ key: "channels", label: "Kênh ngoài", before: "Web widget, API", after: "Web widget, API, Slack" }],
      resourceType: "agent", resourceId: "ext-seed-1", resourceName: "Flight Assistant",
      resourceIcon: "✈️", requesterId: "m-plat-1", requesterName: "Mai Hoang",
      audience: "org", scopeSummary: "Toàn công ty", channels: ["web", "api", "slack"],
      workspaceTargets: [{ kind: "company", name: "FPT Smart Cloud", members: 1250 }],
      externalSnap: externalSnapOf("ext-seed-1"),
      note: "Bật Slack để nhân viên đặt vé công tác ngay trong kênh #travel.",
      version: "v1.0.2", status: "pending", submittedAt: t - 2 * HOUR, updatedAt: t - 2 * HOUR,
    },
    [hAt("submitted", "m-plat-1", "Mai Hoang", t - 2 * HOUR)],
  );
  const extraAgentReqs = [quoteReq, legalReq, financeReq, helpdeskReq, faqReq, salesReq, legalApiReq, extFlightReq, extLegalReq, extWarehouseReq, extFlightSlackReq];

  [agentReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq, ...extraAgentReqs].forEach(r => store.set(r.id, r));
  persist();

  // Seed the live-snapshot ledger to match the stories above: weekly-digest + kb-1/kb-2/
  // email-drafter already cleared review before; kb-7 / g-6 / cc-3 / g-9 / kb-4 have not.
  (["skill:weekly-digest", "knowledge:kb-1", "knowledge:kb-2", "skill:email-drafter"] as const).forEach(k => {
    const [type, id] = k.split(":") as [Exclude<GovResourceType, "agent">, string];
    const snap = buildSnapshot(type, id);
    if (snap) liveSnapshots.set(snapshotKey(type, id), snap);
  });
  // faq's live v1.1.0 and ops's live v1.3.0 predate their pending requests (req-2001 / req-2004),
  // so those show "Có chỉnh sửa" with a real field diff (model + description).
  const faqSnap = buildSnapshot("agent", "faq");
  if (faqSnap) liveSnapshots.set(snapshotKey("agent", "faq"), {
    capturedAt: t - 3 * DAY,
    fields: { ...faqSnap.fields, model: "Qwen Turbo", desc: "Product manuals and troubleshooting." },
  });
  // finance-check / legal-review are live with the same configuration their pending requests
  // carry (those requests only widen the audience) → "Không thay đổi", not "Bản mới".
  for (const aid of ["finance-check", "legal-review"]) {
    const snap = buildSnapshot("agent", aid);
    if (snap) liveSnapshots.set(snapshotKey("agent", aid), snap);
  }
  const opsSnap = buildSnapshot("agent", "ops");
  if (opsSnap) liveSnapshots.set(snapshotKey("agent", "ops"), {
    capturedAt: t - 7 * DAY,
    fields: { ...opsSnap.fields, model: "Qwen Turbo" },
  });
  persistLive();

  // Mirror the seed into the audit log so /governance/audit-log has matching history from day one.
  for (const r of [agentReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq, ...extraAgentReqs]) {
    for (const h of r.history) {
      auditLogStore.log({
        actorId: h.actorId, actorName: h.actorName, action: h.action,
        resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName,
        requestId: r.id, note: h.note, at: h.at, detail: auditDetail(r),
      });
    }
  }

  // Mirror the seed into notifications: pending Agent requests → reviewers; decisions →
  // owner + shared-with members (see notificationStore).
  const seeded: AppNotification[] = [];
  for (const r of [agentReq, agentCleanReq, ...extraAgentReqs]) {
    if (r.resourceType !== "agent") continue;
    for (const h of r.history) {
      const n = buildNotification(r, h.action, h.actorId, h.actorName);
      if (!n) continue;
      if (h.action === "submitted" && r.status !== "pending") continue;
      seeded.push({ ...n, id: `ntf-seed-${r.id}-${h.action}`, at: h.at, readBy: t - h.at > (h.action === "submitted" ? DAY : 6 * DAY) ? ["m-fsoft-ceo"] : [] });
    }
  }
  notificationStore.reset(seeded);
}


/* ───────────────────────── notifications ───────────────────────── */

/** Owner + members the Agent is shared with + the requester. External Agents belong to the
 * demo Space's owner in this prototype. */
function agentAudience(r: GovRequest): string[] {
  const a = getAgent(r.resourceId);
  const owner = isExternalAgentId(r.resourceId) ? "m-fsoft-ceo" : a?.ownerId;
  return [owner, ...(a?.sharedWith ?? []), r.requesterId].filter(Boolean) as string[];
}

function buildNotification(r: GovRequest, action: GovHistoryEntry["action"], actorId: string, actorName: string):
  Omit<AppNotification, "id" | "readBy" | "at"> | null {
  if (r.resourceType !== "agent") return null;
  const isCh = requestKind(r) === "channels";
  const chs = (r.channelsAdded ?? []).map(channelLabel).join(", ");
  const path = resourcePath("agent", r.resourceId);
  const A: [string, boolean] = [r.resourceName, true];
  let kind: NotificationKind; let seg: [string, boolean?][]; let href = path;
  let recipients = agentAudience(r);
  switch (action) {
    case "submitted":
      kind = "request_submitted"; recipients = [REVIEWERS]; href = `/governance/requests/${r.id}`;
      seg = isCh ? [[actorName, true], [` gửi yêu cầu duyệt bật kênh ${chs} cho `], A] : [[actorName, true], [" gửi yêu cầu duyệt publish "], A];
      break;
    case "approved":
      kind = isCh ? "channel_approved" : "request_approved";
      seg = isCh ? [[`Yêu cầu bật kênh ${chs} cho `], A, [" đã được duyệt"]] : [["Yêu cầu publish "], A, [" đã được duyệt"]];
      if (!isCh) href = `${path}?tab=build&section=versions`;
      break;
    case "rejected":
      kind = isCh ? "channel_rejected" : "request_rejected";
      seg = isCh ? [[`Yêu cầu bật kênh ${chs} cho `], A, [" bị từ chối"]] : [["Yêu cầu publish "], A, [" bị từ chối"]];
      break;
    case "revoked":
      kind = isCh ? "channel_revoked" : "request_revoked";
      seg = isCh ? [[`Kênh ${chs} của `], A, [" đã bị tắt"]] : [["Agent "], A, [r.revokedToVersion ? ` đã bị thu hồi, quay về ${r.revokedToVersion}` : " đã bị thu hồi"]];
      break;
    default:
      return null;
  }
  return { actorId, actorName, resourceId: r.resourceId, resourceIcon: r.resourceIcon, requestId: r.id, kind, href, recipients,
    segments: seg, title: seg.map(x => x[0]).join("") };
}

function notify(r: GovRequest, action: GovHistoryEntry["action"], actorId: string, actorName: string, _note?: string) {
  const n = buildNotification(r, action, actorId, actorName);
  if (n) notificationStore.push(n);
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
  getOpenRequestForResource(resourceType: GovResourceType, resourceId: string, kind: GovRequestKind = "publish"): GovRequest | undefined {
    seed();
    return [...store.values()]
      .filter(r => r.resourceType === resourceType && r.resourceId === resourceId && r.status === "pending" && requestKind(r) === kind)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  },

  /** Most recent request for a resource, any status — drives the Builder-side "Bị từ chối" pill,
   * banner and Agents-list badge (a rejection only matters while it's the latest word). */
  latestForResource(resourceType: GovResourceType, resourceId: string, kind: GovRequestKind = "publish"): GovRequest | undefined {
    seed();
    return [...store.values()]
      .filter(r => r.resourceType === resourceType && r.resourceId === resourceId && requestKind(r) === kind)
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
    kind?: GovRequestKind; channelsAdded?: string[]; externalSnap?: ExternalAgentSnap;
    groupId?: string; groupMemberIds?: string[]; reviewUnits?: { id: string; name: string }[]; reviewMode?: "single" | "any"; addedMemberNames?: string[];
  }): GovRequest {
    seed();
    const kind = input.kind ?? "publish";
    // One open request per resource and kind: submitting a newer one replaces the pending one
    // (withdrawn with a pointer to the new one), so the Admin only ever reviews the latest. For
    // "channels", the new request carries the union of both, so nothing asked for is lost.
    const previous = this.getOpenRequestForResource(input.resourceType, input.resourceId, kind);
    let channelsAdded = input.channelsAdded;
    if (previous) {
      if (kind === "channels") channelsAdded = [...new Set([...(previous.channelsAdded ?? []), ...(input.channelsAdded ?? [])])];
      this.withdraw(previous.id, input.requesterId, input.requesterName,
        kind === "channels" ? "Được gộp vào yêu cầu bật kênh mới hơn." : `Được thay thế bởi yêu cầu ${input.version ?? "mới hơn"}.`);
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
      kind, channelsAdded, externalSnap: input.externalSnap,
      groupId: input.groupId, groupMemberIds: input.groupMemberIds, reviewUnits: input.reviewUnits, reviewMode: input.reviewMode, addedMemberNames: input.addedMemberNames,
      mainSnapshotAtSubmit: input.externalSnap ? undefined : buildSnapshot(input.resourceType, input.resourceId),
      connectionsAtSubmit: input.resourceType === "agent" && !input.externalSnap && !input.connections
        ? agentConnectorStore.list(input.resourceId).map(c => ({ connectorId: c.connectorId, scope: c.scope }))
        : undefined,
      ...(kind === "channels" ? (() => {
        const before = input.channels ?? [];
        const after = [...new Set([...before, ...(channelsAdded ?? [])])];
        return {
          channels: after,
          changeStateAtSubmit: "modified" as GovChangeState,
          diffAtSubmit: [{ key: "channels", label: "Kênh ngoài", before: before.map(channelLabel).join(", ") || "Chưa có", after: after.map(channelLabel).join(", ") }],
        };
      })() : input.externalSnap ? (() => {
        // External Agent: diff its connection against the last approved External request.
        const prev = [...store.values()].filter(r => r.resourceId === input.resourceId && r.status === "approved" && r.externalSnap && requestKind(r) === "publish")
          .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.externalSnap;
        const cur = input.externalSnap!;
        const fields: [keyof ExternalAgentSnap, string][] = [["description", "Mô tả"], ["baseUrl", "Base URL"], ["authMethod", "Xác thực"], ["guardrail", "Guardrail"], ["historyDelivery", "Lịch sử hội thoại gửi kèm"]];
        const diff = prev ? fields.filter(([k]) => String(prev[k] ?? "") !== String(cur[k] ?? "")).map(([k, label]) => ({ key: String(k), label, before: String(prev[k] ?? "—"), after: String(cur[k] ?? "—") })) : [];
        return { changeStateAtSubmit: (prev ? (diff.length ? "modified" : "unchanged_approved") : "new") as GovChangeState, diffAtSubmit: diff };
      })() : (() => {
        const live = liveSnapshots.get(snapshotKey(input.resourceType, input.resourceId));
        const candidate = buildSnapshot(input.resourceType, input.resourceId);
        return { changeStateAtSubmit: classifyChange(live, candidate), diffAtSubmit: diffSnapshots(live, candidate) };
      })()),
      history: [historyEntry("submitted", input.requesterId, input.requesterName)],
    };
    store.set(id, req);
    persist();
    if (isExternalAgentId(input.resourceId) && kind === "publish") {
      const ext = externalAgentStore.get(input.resourceId);
      // A live External Agent stays "published" while its next version waits; otherwise it's pending.
      if (ext && ext.status !== "published") externalAgentStore.applyGovernance(input.resourceId, { status: "pending_approval", rejection: null }, `Đã gửi yêu cầu duyệt ${input.version ?? ""}`.trim(), input.note || undefined);
      else if (ext) externalAgentStore.applyGovernance(input.resourceId, {}, `Đã gửi yêu cầu duyệt ${input.version ?? ""}`.trim(), input.note || undefined);
    }
    auditLogStore.log({
      actorId: input.requesterId, actorName: input.requesterName, action: "submitted",
      resourceType: input.resourceType, resourceId: input.resourceId, resourceName: input.resourceName,
      requestId: id, at: t, detail: auditDetail(req),
    });
    notify(req, "submitted", input.requesterId, input.requesterName);
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
    if (isExternalAgentId(r.resourceId) && requestKind(r) === "publish") {
      const live = agentPublishStore.get(r.resourceId).placement !== null;
      const ext = externalAgentStore.get(r.resourceId);
      if (ext && ext.status === "pending_approval") externalAgentStore.applyGovernance(r.resourceId, { status: live ? "published" : "draft" }, `Đã rút yêu cầu ${r.version ?? ""}`.trim());
    }
    auditLogStore.log({ actorId, actorName, action: "withdrawn", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note, at: t, detail: auditDetail(r) });
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

    if (requestKind(r) === "channels") {
      // Turning channels ON for the version already live — no new version, no snapshot change.
      store.set(id, r);
      persist();
      const current = agentPublishStore.get(r.resourceId);
      const nextChannels = [...new Set([...current.channels, ...(r.channelsAdded ?? [])])];
      agentPublishStore.setChannels(r.resourceId, nextChannels);
      if (isExternalAgentId(r.resourceId)) externalAgentStore.applyGovernance(r.resourceId, { channels: nextChannels }, `Đã duyệt bật kênh ${(r.channelsAdded ?? []).map(channelLabel).join(", ")}`);
      auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "approved", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note, at: t, detail: auditDetail(r) });
      notify(r, "approved", reviewerId, reviewerName, note);
      return r;
    }

    // Promote the resource's current fields to "live" — the only thing an approval does.
    // Promote exactly what was reviewed (frozen at submit) — edits made after submitting are not
    // part of this approval and stay in the Builder's draft.
    const mainSnap = r.externalSnap ? undefined : (r.mainSnapshotAtSubmit ?? buildSnapshot(r.resourceType, r.resourceId));
    if (mainSnap) liveSnapshots.set(snapshotKey(r.resourceType, r.resourceId), mainSnap);
    persistLive();
    store.set(id, r);
    persist();

    // For an Agent, actually flip it live via agentPublishStore so the rest of the prototype
    // (top-bar pill, My agents list) reflects the approval immediately.
    if (r.resourceType === "agent") {
      const current = agentPublishStore.get(r.resourceId);
      agentPublishStore.publish(r.resourceId, "workspace", current.channels, r.version ?? current.version, r.audience === "group" ? "group" : r.audience === "community" ? "community" : "org",
        { scopeSummary: r.scopeSummary ?? (r.audience === "community" ? "Cộng đồng FPT AI Agent" : current.scopeSummary),
          groupId: r.groupId ?? (r.audience === "group" ? current.groupId : undefined),
          groupMemberIds: r.groupMemberIds ?? (r.audience === "group" ? current.groupMemberIds : undefined), via: "approved" });
      agentPublishStore.clearRegovernanceFlag(r.resourceId);
      if (isExternalAgentId(r.resourceId)) externalAgentStore.applyGovernance(r.resourceId, { status: "published", version: r.version ?? current.version, rejection: null, channels: current.channels }, `Đã được duyệt ${r.version ?? ""} bởi ${reviewerName}`.trim(), note);
    }

    auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "approved", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note, at: t, detail: auditDetail(r) });
    notify(r, "approved", reviewerId, reviewerName, note);
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
    if (isExternalAgentId(r.resourceId) && requestKind(r) === "publish") {
      const live = agentPublishStore.get(r.resourceId).placement !== null;
      externalAgentStore.applyGovernance(r.resourceId, { status: live ? "published" : "rejected", rejection: { at: t, by: reviewerName, reason } }, `${reviewerName} từ chối ${r.version ?? ""}`.trim(), reason);
    }
    auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "rejected", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note: reason, at: t, detail: auditDetail(r) });
    notify(r, "rejected", reviewerId, reviewerName, reason);
    return r;
  },

  /** Undo an approved request — rolls the resource back out of the live-snapshot ledger (next
   * computation sees it as "new" again) and un-publishes an Agent. Does not restore a prior live
   * snapshot (this ledger only ever tracks the current live version, not full history) — a
   * deliberate simplification for the prototype. */
  /** The version a revoke can fall back to: only for a publish request whose version is the one
   * serving right now, and only if an earlier version was live before it. */
  revokeFallback(r: GovRequest) {
    if (r.resourceType !== "agent" || requestKind(r) !== "publish") return undefined;
    const pub = agentPublishStore.get(r.resourceId);
    if (pub.placement === null || pub.version !== r.version) return undefined;
    return agentPublishStore.releases(r.resourceId).filter(e => e.version !== r.version).pop();
  },

  revoke(id: string, reviewerId: string, reviewerName: string, reason: string, mode: "previous" | "stop" = "stop"): GovRequest | undefined {
    seed();
    const r = store.get(id);
    if (!r || r.status !== "approved") return r;
    const fallback = mode === "previous" ? this.revokeFallback(r) : undefined;
    const t = now();
    r.status = "revoked";
    r.updatedAt = t;
    r.revokedAt = t; r.revokedBy = reviewerName; r.revokeReason = reason;
    r.history.push(historyEntry("revoked", reviewerId, reviewerName, reason));
    store.set(id, r);
    persist();

    if (requestKind(r) === "channels") {
      // Revoking a channel approval switches just those channels back off.
      const current = agentPublishStore.get(r.resourceId);
      agentPublishStore.setChannels(r.resourceId, current.channels.filter(c => !(r.channelsAdded ?? []).includes(c)));
    } else if (fallback) {
      // Back to the version that was live before — it had already cleared review.
      r.revokedToVersion = fallback.version;
      store.set(id, r);
      persist();
      agentPublishStore.publish(r.resourceId, "workspace", fallback.channels, fallback.version, fallback.audience,
        { scopeSummary: fallback.scopeSummary, groupId: fallback.groupId, groupMemberIds: fallback.groupMemberIds, via: "rollback", byName: reviewerName });
      if (isExternalAgentId(r.resourceId)) externalAgentStore.applyGovernance(r.resourceId, { status: "published", version: fallback.version, channels: fallback.channels }, `${reviewerName} thu hồi ${r.version ?? ""}, quay về ${fallback.version}`.trim(), reason);
    } else {
      liveSnapshots.delete(snapshotKey(r.resourceType, r.resourceId));
      persistLive();
      if (r.resourceType === "agent") agentPublishStore.unpublish(r.resourceId);
      if (isExternalAgentId(r.resourceId)) externalAgentStore.applyGovernance(r.resourceId, { status: "draft", channels: [] }, `${reviewerName} thu hồi ${r.version ?? ""}`.trim(), reason);
    }

    auditLogStore.log({ actorId: reviewerId, actorName: reviewerName, action: "revoked", resourceType: r.resourceType, resourceId: r.resourceId, resourceName: r.resourceName, requestId: id, note: reason, at: t, detail: auditDetail(r) });
    notify(r, "revoked", reviewerId, reviewerName, reason);
    return r;
  },
};

/** Best-effort resolver so the Request Detail screen can deep-link "Xem chi tiết" back to the
 * real resource page for every type (Agent has its own route; the other four are workspace list
 * pages that accept a ?open= query to jump straight to the item). */
export function resourcePath(type: GovResourceType, id: string): string {
  switch (type) {
    case "agent": return isExternalAgentId(id) ? `/external-agents/${id}` : `/agents/${id}`;
    case "knowledge": return `/knowledge/${id}`;
    case "skill": return `/tools/${id}`;
    case "guardrail": return `/guardrails?open=${id}`;
    case "connector": return `/connectors?tab=custom&open=${id}`;
  }
}

export function agentEmoji(agentId: string): string | undefined {
  if (isExternalAgentId(agentId)) return externalAgentStore.get(agentId)?.emoji;
  try { return getAgent(agentId)?.emoji; } catch { return undefined; }
}
