// sessionStorage-backed Governance store — request-to-publish workflow shared by all five
// builder-created resource types (Agent, Knowledge, Skill, Guardrail, Connector). Mirrors the
// persistence pattern used by agentPublishStore.ts / agentConnectorStore.ts (loadMap/saveMap,
// survives reload + client-side nav, clears when the tab closes).
//
// Versioning model (v2): every resource that has ever cleared review has a "live snapshot" — a
// lightweight fingerprint of its fields as of the last approval. Submitting a request captures a
// "candidate snapshot" (current fields) to diff against that live snapshot. This is what drives:
//   - changeState per bundled item: new (no live snapshot yet) / modified_major (a field the team
//     considers behavior-affecting changed) / modified_minor (only cosmetic fields changed) /
//     unchanged_approved (nothing changed since the live snapshot).
//   - per-item approve/reject inside a bundle: rejecting one sub-resource does NOT block the rest
//     of the request — the old live snapshot simply stays live for that one item (its edit is not
//     promoted), while everything else the admin didn't reject still gets promoted. This mirrors
//     "merge a PR despite one unrelated failing check" rather than an all-or-nothing gate.
//   - drift detection: if the underlying resource's fields change again AFTER a request was
//     submitted but BEFORE an admin decided, the Request Detail page flags it (comparing the
//     candidate-at-submit snapshot to the resource's current fields).
//
// Design decision (confirmed with PO): when an Agent is submitted for publish and it references
// Knowledge/Skill/Guardrail/Connector items that are new or modified, the whole thing becomes
// ONE governance request (see `bundledItems`) — not N separate parent/child requests.
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
/** Scope requested for — same two "beyond just me" tiers Agent's Publish modal already offers
 * ("Only me" never creates a governance request; nothing to review there). */
export type GovAudience = "org" | "community";
/** "modified" was a single bucket before — split so a name/description tweak doesn't demand the
 * same scrutiny as a change to what the resource actually does (instructions/rule/auth/data
 * source). See HEAVY_FIELDS below for exactly which fields tip an item into "_major". */
export type GovChangeState = "new" | "modified_major" | "modified_minor" | "unchanged_approved";
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
};

export const STATUS_LABEL: Record<GovRequestStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  revoked: "Đã thu hồi",
};

/** Which fields count as "changes the resource's actual behavior" per type — a change here always
 * classifies a bundled item as modified_major (blocks the "does this need a fresh look" question
 * with a hard yes). Everything else tracked in the snapshot is modified_minor when it changes. */
const HEAVY_FIELDS: Record<GovResourceType, string[]> = {
  agent: ["instructions", "model", "channels"],
  knowledge: ["description", "apiEndpoint", "hasApiKey", "querySharing"],
  skill: ["body"],
  guardrail: ["action", "enabled"],
  connector: ["url", "authType", "headers"],
};
const LIGHT_FIELDS: Record<GovResourceType, string[]> = {
  agent: ["name", "desc", "emoji"],
  knowledge: ["name"],
  skill: ["name", "description"],
  guardrail: ["name", "desc"],
  connector: ["name"],
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

export interface GovBundledItem {
  type: Exclude<GovResourceType, "agent">;
  resourceId: string;
  name: string;
  changeState: GovChangeState;
  /** Admin's per-item call while reviewing a bundle — undefined defaults to "approved" when the
   * request is finalized, so the admin only has to actively click on the item(s) they want to
   * hold back, not confirm every single one. */
  decision?: GovItemDecision;
  /** Last-approved fields (undefined if this item has never cleared review before). */
  liveSnapshot?: ResourceSnapshot;
  /** Fields as of when this bundle was computed (submit time) — diffed against liveSnapshot for
   * the "Xem thay đổi" panel, and reused at approval time so what gets promoted is exactly what
   * the admin reviewed, not whatever the resource happens to be at click-time. */
  candidateSnapshot?: ResourceSnapshot;
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
  /** Human-readable "who exactly" for an `audience: "org"` request — e.g. "Ban Giam doc (2
   * người), Nhóm Product Management (1 người)". Undefined for "community" (always everyone,
   * nothing to scope) and for older requests submitted before scoping existed. Set from the
   * Publish modal's OrgSharePicker (AgentBuilder.tsx). */
  scopeSummary?: string;
  note: string;
  version?: string;
  status: GovRequestStatus;
  submittedAt: number;
  updatedAt: number;
  bundledItems: GovBundledItem[];
  /** Fields of the main resource itself, captured at submit time — diffed against its current
   * fields to detect "builder kept editing after submitting" (see checkDrift). */
  mainSnapshotAtSubmit?: ResourceSnapshot;
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
  revokedAt?: number;
  revokedBy?: string;
  revokeReason?: string;
  history: GovHistoryEntry[];
}

const REQ_KEY = "governance_request_store_v1";
const LIVE_KEY = "governance_live_snapshots_v2";
const SEEDED_KEY = "governance_store_seeded_v2";

const store = loadMap<string, GovRequest>(REQ_KEY);
/** "type:resourceId" → last-approved snapshot. A resource "has cleared governance at least once"
 * iff it has an entry here — this replaces the old plain approved-ids Set so classification can
 * actually diff content instead of just checking a boolean. */
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
  const keys = [...HEAVY_FIELDS[type], ...LIGHT_FIELDS[type]];
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

function classifyChange(type: GovResourceType, live: ResourceSnapshot | undefined, candidate: ResourceSnapshot | undefined): GovChangeState {
  if (!live || !candidate) return "new";
  const heavy = HEAVY_FIELDS[type];
  let changedAny = false, changedHeavy = false;
  for (const k of Object.keys(candidate.fields)) {
    if (candidate.fields[k] !== (live.fields[k] ?? "")) {
      changedAny = true;
      if (heavy.includes(k)) changedHeavy = true;
    }
  }
  if (!changedAny) return "unchanged_approved";
  return changedHeavy ? "modified_major" : "modified_minor";
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

/** A bundled item counts as "needs the admin's attention" — new or a behavior-affecting change.
 * modified_minor and unchanged_approved don't gate anything on their own. */
export function itemNeedsReview(state: GovChangeState): boolean {
  return state === "new" || state === "modified_major";
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

  // 2 — standalone Knowledge, rejected.
  const kbReq = mk(
    {
      id: "req-1002", resourceType: "knowledge", resourceId: "kb-4", resourceName: "Chính sách nhân sự",
      requesterId: "m-fsoft-coo", requesterName: "Linh Phan",
      audience: "org", note: "Chia sẻ chính sách nghỉ phép & phúc lợi mới nhất cho toàn công ty.",
      status: "rejected", submittedAt: t - 1 * DAY, updatedAt: t - 5 * HOUR,
      bundledItems: [], reviewerId: "m-fsoft-ceo", reviewerName: "Tran Nam",
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

  // Seed the live-snapshot ledger to match the stories above: weekly-digest + kb-1/kb-2/
  // email-drafter already cleared review before; kb-7 / g-6 / cc-3 / g-9 / kb-4 have not.
  (["skill:weekly-digest", "knowledge:kb-1", "knowledge:kb-2", "skill:email-drafter"] as const).forEach(k => {
    const [type, id] = k.split(":") as [Exclude<GovResourceType, "agent">, string];
    const snap = buildSnapshot(type, id);
    if (snap) liveSnapshots.set(snapshotKey(type, id), snap);
  });
  persistLive();

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
 * every Knowledge/Skill/Guardrail/Connector it references, each classified against its last-
 * approved snapshot (new / modified_major / modified_minor / unchanged_approved). Built-in /
 * mandatory / marketplace items (e.g. the PII protection guardrail, the Gmail connector) are
 * excluded — they're not builder-owned resources and aren't part of this workflow. */
export function computeAgentBundle(agentId: string): GovBundledItem[] {
  const items: GovBundledItem[] = [];

  const addItem = (type: Exclude<GovResourceType, "agent">, id: string, name: string) => {
    const live = liveSnapshots.get(snapshotKey(type, id));
    const candidate = buildSnapshot(type, id);
    items.push({
      type, resourceId: id, name,
      changeState: classifyChange(type, live, candidate),
      liveSnapshot: live, candidateSnapshot: candidate,
    });
  };

  const kbIds = knowledgeStore.listAttachedConsoleKbIds(agentId);
  for (const id of kbIds) {
    const kb = knowledgeBaseStore.get(id);
    if (!kb) continue;
    addItem("knowledge", kb.id, kb.name);
  }

  const skillIds = agentSkillStore.listAttachedConsoleSkillIds(agentId);
  for (const id of skillIds) {
    const s = skillStore.get(id);
    if (!s) continue;
    addItem("skill", s.id, s.name);
  }

  const guardrailIds = agentGuardrailStore.listAttachedConsoleGuardrailIds(agentId);
  for (const id of guardrailIds) {
    const g = guardrailConsoleStore.get(id);
    if (!g || g.mandatory) continue; // mandatory compliance rules aren't a builder resource
    addItem("guardrail", g.id, g.name);
  }

  const connectors = agentConnectorStore.list(agentId);
  for (const c of connectors) {
    const cc = customConnectorStore.get(c.connectorId);
    if (!cc) continue; // marketplace/built-in connector (e.g. Gmail) — not a governance resource
    addItem("connector", cc.id, cc.name);
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

  pendingCount(): number {
    seed();
    return [...store.values()].filter(r => r.status === "pending").length;
  },

  isResourceApproved(type: Exclude<GovResourceType, "agent">, id: string): boolean {
    seed();
    return liveSnapshots.has(snapshotKey(type, id));
  },

  submit(input: {
    resourceType: GovResourceType; resourceId: string; resourceName: string; resourceIcon?: string;
    requesterId: string; requesterName: string; audience: GovAudience; note: string; version?: string;
    bundledItems?: GovBundledItem[]; scopeSummary?: string;
  }): GovRequest {
    seed();
    const id = nextId();
    const t = now();
    const req: GovRequest = {
      id, resourceType: input.resourceType, resourceId: input.resourceId, resourceName: input.resourceName,
      resourceIcon: input.resourceIcon, requesterId: input.requesterId, requesterName: input.requesterName,
      audience: input.audience, scopeSummary: input.scopeSummary, note: input.note, version: input.version, status: "pending",
      submittedAt: t, updatedAt: t, bundledItems: input.bundledItems ?? [],
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

  /** Set (or clear) the admin's per-item call while reviewing a bundle — does not finalize
   * anything by itself, just records intent for the eventual approve() to honor. */
  decideBundledItem(requestId: string, itemType: Exclude<GovResourceType, "agent">, itemResourceId: string, decision: GovItemDecision | undefined): GovRequest | undefined {
    seed();
    const r = store.get(requestId);
    if (!r) return r;
    const it = r.bundledItems.find(b => b.type === itemType && b.resourceId === itemResourceId);
    if (!it) return r;
    it.decision = decision;
    r.updatedAt = now();
    store.set(requestId, r);
    persist();
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

    // Promote the main resource's current fields to "live".
    const mainSnap = buildSnapshot(r.resourceType, r.resourceId);
    if (mainSnap) liveSnapshots.set(snapshotKey(r.resourceType, r.resourceId), mainSnap);

    // Promote every bundled item the admin didn't explicitly reject. A rejected item keeps its
    // old live snapshot untouched — the Agent still "runs" against the last-approved version of
    // that one piece; the rejected edit itself just never gets promoted (no separate blocking of
    // the rest of the request, per the confirmed design).
    r.bundledItems.forEach(it => {
      if (it.decision === "rejected") {
        auditLogStore.log({
          actorId: reviewerId, actorName: reviewerName, action: "rejected",
          resourceType: it.type, resourceId: it.resourceId, resourceName: it.name,
          requestId: id, at: t, note: "Giữ nguyên bản đã duyệt trước đó trong bundle này — không áp dụng thay đổi mới.",
        });
        return;
      }
      const snap = it.candidateSnapshot ?? buildSnapshot(it.type, it.resourceId);
      if (snap) liveSnapshots.set(snapshotKey(it.type, it.resourceId), snap);
    });
    persistLive();
    store.set(id, r);
    persist();

    // For an Agent, actually flip it live via agentPublishStore so the rest of the prototype
    // (top-bar pill, My agents list) reflects the approval immediately.
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

  /** Undo an approved request — rolls the main resource (and every bundled item this request
   * promoted) back out of the live-snapshot ledger, so the next bundle computation sees them as
   * "new" again, and un-publishes an Agent. Does not restore a prior live snapshot (this ledger
   * only ever tracks the current live version, not full history) — a deliberate simplification
   * for the prototype, called out in the commit message. */
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

    r.bundledItems.forEach(it => {
      if (it.decision !== "rejected") liveSnapshots.delete(snapshotKey(it.type, it.resourceId));
    });
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
