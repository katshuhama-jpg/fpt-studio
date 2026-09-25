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

export type GovResourceType = "agent" | "knowledge" | "skill" | "guardrail" | "connector";
export type GovRequestStatus = "pending" | "approved" | "rejected" | "revoked";
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
  group: "Nhóm cộng tác (vượt ngưỡng trùng lặp)",
};

export const STATUS_LABEL: Record<GovRequestStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  revoked: "Đã thu hồi",
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

export interface GovHistoryEntry {
  id: string;
  at: number;
  action: "submitted" | "approved" | "rejected" | "revoked";
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

const REQ_KEY = "governance_request_store_v3";
const LIVE_KEY = "governance_live_snapshots_v3";
const SEEDED_KEY = "governance_store_seeded_v3";

const store = loadMap<string, GovRequest>(REQ_KEY);
/** "type:resourceId" → last-approved snapshot. A resource "has cleared governance at least once"
 * iff it has an entry here. */
const liveSnapshots = loadMap<string, ResourceSnapshot>(LIVE_KEY);
const persist = () => saveMap(REQ_KEY, store);
const persistLive = () => saveMap(LIVE_KEY, liveSnapshots);

const snapshotKey = (type: GovResourceType, id: string) => `${type}:${id}`;

let seq = 1000;
const nextId = () => `req-${seq++}`;
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
    case "agent": obj = getAgent(id) as unknown as Record<string, unknown> | undefined; break;
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

/* ───────────────────────── seed ───────────────────────── */

function seed() {
  if (seededOnce()) return;
  markSeeded();
  const t = now();

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

  [agentReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq].forEach(r => store.set(r.id, r));
  persist();

  // Seed the live-snapshot ledger to match the stories above: weekly-digest + kb-1/kb-2/
  // email-drafter already cleared review before; kb-7 / g-6 / cc-3 / g-9 / kb-4 have not.
  (["skill:weekly-digest", "knowledge:kb-1", "knowledge:kb-2", "skill:email-drafter"] as const).forEach(k => {
    const [type, id] = k.split(":") as [Exclude<GovResourceType, "agent">, string];
    const snap = buildSnapshot(type, id);
    if (snap) liveSnapshots.set(snapshotKey(type, id), snap);
  });
  persistLive();

  // Mirror the seed into the audit log so /governance/audit-log has matching history from day one.
  for (const r of [agentReq, kbReq, skillReq, guardrailReq, connectorReq, agentCleanReq]) {
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
    resourceRefs?: AgentResourceRef[]; scopeSummary?: string;
  }): GovRequest {
    seed();
    const id = nextId();
    const t = now();
    const req: GovRequest = {
      id, resourceType: input.resourceType, resourceId: input.resourceId, resourceName: input.resourceName,
      resourceIcon: input.resourceIcon, requesterId: input.requesterId, requesterName: input.requesterName,
      audience: input.audience, scopeSummary: input.scopeSummary, note: input.note, version: input.version, status: "pending",
      submittedAt: t, updatedAt: t, resourceRefs: input.resourceRefs,
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
