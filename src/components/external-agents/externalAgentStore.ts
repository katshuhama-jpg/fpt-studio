// sessionStorage-backed store for the External Agents prototype — no backend, so create →
// list → detail → status changes all read/write the same in-memory + sessionStorage map and
// stay in sync across navigation within the session, the same pattern as triggerStore.ts /
// agentConnectorStore.ts.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";

export type ExternalAgentStatus = "draft" | "pending_approval" | "rejected" | "published" | "paused";
export type AuthMethod = "bearer" | "none";
export type PerUserConnectorState = "none" | "valid" | "non_compliant";

/** Which review level a Pending Approval agent is waiting on — purely informational, derived
 * from the base URL (partner-hosted domains route to FPT-level review). Not a real approval
 * chain: approving/rejecting a connection happens in a separate admin console that isn't part
 * of this Builder product — this label just tells the Builder who's holding it up. */
export function pendingApprovalLevel(baseUrl: string): "fpt" | "org" {
  return baseUrl.toLowerCase().includes("partner") ? "fpt" : "org";
}
export function approvalLevelLabel(baseUrl: string): string {
  return pendingApprovalLevel(baseUrl) === "fpt" ? "FPT admin" : "Org admin";
}

/** Fixed channel list for the Publish modal — ids are also what ExternalAgent.channels stores. */
export const PUBLISH_CHANNELS: { id: string; name: string }[] = [
  { id: "web", name: "Web" },
  { id: "zalo", name: "Zalo" },
  { id: "messenger", name: "Facebook Messenger" },
  { id: "slack", name: "Slack" },
  { id: "teams", name: "Microsoft Teams" },
  { id: "api", name: "API" },
  { id: "workspace", name: "Workspace" },
];
export function channelLabel(id: string): string {
  return PUBLISH_CHANNELS.find(c => c.id === id)?.name ?? id;
}

export interface ValidationResult {
  at: number;
  endpointReachable: boolean;
  authVerified: boolean;
  protocolSupported: boolean;
  runsAvailable: boolean;
  perUserConnector: PerUserConnectorState;
  passed: boolean; // all four blocking checks passed (per-user check never blocks, regardless of state)
}

export interface ExternalAgent {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authMethod: AuthMethod;
  // Never store/display the real secret — a prototype stand-in that only proves "a token
  // was saved" without ever letting a saved token round-trip back into the UI.
  hasToken: boolean;
  /** HMAC signing secret used for X-FPT-Signature — shown masked, rotatable. Every request the
   * platform sends is signed with this regardless of authMethod. */
  signingSecret: string;
  guardrail: string | null;
  status: ExternalAgentStatus;
  /** True once a connection has been approved at least once (by the separate admin console).
   * Persists across Draft (approved-but-not-yet-published) / Published / Paused, and is cleared
   * on rejection. A Draft with approved=true publishes immediately; approved=false sends the
   * connection for approval instead. */
  approved: boolean;
  /** Channel ids currently published to. Empty whenever status isn't "published". */
  channels: string[];
  /** Channels requested via Publish while not yet approved — applied automatically the moment
   * approval completes, then cleared. Null whenever there's no approval in flight. */
  pendingChannels: string[] | null;
  createdAt: number;
  updatedAt: number;
  lastHealthCheckAt: number | null;
  lastHealthCheckOk: boolean | null;
  lastValidation: ValidationResult | null;
  /** Only non-null while status is "rejected" — drives the live "fix and resubmit" banner. */
  rejection: { at: number; by: string; reason: string } | null;
  /** Set on every rejection and never auto-cleared — drives the "Previously rejected…" banner
   * that stays visible (until dismissed) even after the Builder has edited and moved back to
   * Draft, so the context isn't lost the moment the live banner disappears. */
  lastRejection: { at: number; by: string; reason: string } | null;
  rejectionBannerDismissed: boolean;
}

export interface HistoryEntry {
  id: string;
  agentId: string;
  at: number;
  actor: string;
  summary: string;
  detail?: string;
}

// Versioned keys: bump the suffix whenever ExternalAgent/HistoryEntry's shape changes.
// Without this, a browser tab that seeded data under an older shape (e.g. before authMethod/
// signingSecret/guardrail/pendingChannels existed) would load stale objects missing the new
// fields, and the page would crash on render with no error boundary — a blank white screen for
// anyone who had the External Agents page open across a deploy that changed the data shape.
const STORE_KEY = "external_agent_store_v2";
const HISTORY_KEY = "external_agent_history_v2";
const SEEDED_KEY = "external_agent_store_seeded_v2";
const store = loadMap<string, ExternalAgent>(STORE_KEY);
const history = loadMap<string, HistoryEntry[]>(HISTORY_KEY);
const persistStore = () => saveMap(STORE_KEY, store);
const persistHistory = () => saveMap(HISTORY_KEY, history);

const CURRENT_USER = "Tran Nam";

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function generateSigningSecret(): string {
  const bytes = new Uint8Array(24);
  (globalThis.crypto ?? ({} as Crypto)).getRandomValues?.(bytes);
  return "whsec_" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

const PASSED_VALIDATION: ValidationResult = {
  at: Date.now(), endpointReachable: true, authVerified: true, protocolSupported: true,
  runsAvailable: true, perUserConnector: "none", passed: true,
};

/** Demo data so opening External Agents shows real content covering every status instead of
 * an empty list — seeded once per session. Draft and Pending Approval are left with little to
 * no Activity (one shows the genuine empty state, the other just a couple of entries) since
 * neither has ever actually run. */
function seedDefaultAgents() {
  const seededFlag = loadSet<string>(SEEDED_KEY);
  if (seededFlag.has("done")) return;
  seededFlag.add("done");
  saveSet(SEEDED_KEY, seededFlag);
  const now = Date.now();

  const put = (agent: ExternalAgent) => store.set(agent.id, agent);

  // 1 — Flight Assistant (Published, Web + Zalo)
  put({
    id: "ext-seed-1", name: "Flight Assistant", description: "Search and book flights for staff travel.",
    baseUrl: "https://agent.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    guardrail: "Standard content safety", status: "published", approved: true, channels: ["web", "zalo"], pendingChannels: null,
    createdAt: now - 20 * DAY, updatedAt: now - 2 * HOUR,
    lastHealthCheckAt: now - 2 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null, lastRejection: null, rejectionBannerDismissed: false,
  });
  addHistory("ext-seed-1", { at: now - 20 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-1", { at: now - 19 * DAY, actor: CURRENT_USER, summary: "Submitted for approval", detail: "Channels requested: Web, Zalo" });
  addHistory("ext-seed-1", { at: now - 18 * DAY, actor: approvalLevelLabel("https://agent.abc.ai"), summary: `Approved by ${approvalLevelLabel("https://agent.abc.ai")}` });
  addHistory("ext-seed-1", { at: now - 17 * DAY, actor: CURRENT_USER, summary: "Published to Web, Zalo" });

  // 2 — HR Helpdesk (Published, Slack)
  put({
    id: "ext-seed-2", name: "HR Helpdesk", description: "Leave balance, payroll and policy questions.",
    baseUrl: "https://hr.xyz-ai.com", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    guardrail: null, status: "published", approved: true, channels: ["slack"], pendingChannels: null,
    createdAt: now - 15 * DAY, updatedAt: now - 1 * DAY,
    lastHealthCheckAt: now - 1 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null, lastRejection: null, rejectionBannerDismissed: false,
  });
  addHistory("ext-seed-2", { at: now - 15 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-2", { at: now - 14 * DAY, actor: CURRENT_USER, summary: "Submitted for approval", detail: "Channels requested: Slack" });
  addHistory("ext-seed-2", { at: now - 13 * DAY, actor: approvalLevelLabel("https://hr.xyz-ai.com"), summary: `Approved by ${approvalLevelLabel("https://hr.xyz-ai.com")}` });
  addHistory("ext-seed-2", { at: now - 12 * DAY, actor: CURRENT_USER, summary: "Published to Slack" });

  // 3 — Finance Reporter (Draft — already approved, not published yet)
  put({
    id: "ext-seed-3", name: "Finance Reporter", description: "Monthly revenue summary from the finance system.",
    baseUrl: "https://fin.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    guardrail: null, status: "draft", approved: true, channels: [], pendingChannels: null,
    createdAt: now - 5 * DAY, updatedAt: now - 3 * HOUR,
    lastHealthCheckAt: now - 5 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null, lastRejection: null, rejectionBannerDismissed: false,
  });
  addHistory("ext-seed-3", { at: now - 5 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-3", { at: now - 4 * DAY, actor: CURRENT_USER, summary: "Submitted for approval", detail: "Channels requested: none" });
  addHistory("ext-seed-3", { at: now - 3 * HOUR, actor: approvalLevelLabel("https://fin.abc.ai"), summary: `Approved by ${approvalLevelLabel("https://fin.abc.ai")}` });

  // 4 — Legal Doc Checker (Pending approval — partner domain, so FPT-level review)
  put({
    id: "ext-seed-4", name: "Legal Doc Checker", description: "Contract clause review against company policy.",
    baseUrl: "https://legal.partner-ai.com", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    guardrail: null, status: "pending_approval", approved: false, channels: [], pendingChannels: ["web"],
    createdAt: now - 1 * DAY, updatedAt: now - 30 * MIN,
    lastHealthCheckAt: now - 30 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null, lastRejection: null, rejectionBannerDismissed: false,
  });
  addHistory("ext-seed-4", { at: now - 1 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-4", { at: now - 30 * MIN, actor: CURRENT_USER, summary: "Submitted for approval", detail: "Channels requested: Web" });

  // 5 — Warehouse Bot (Rejected)
  put({
    id: "ext-seed-5", name: "Warehouse Bot", description: "Stock lookup and restock suggestions.",
    baseUrl: "https://wh.partner.io", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    guardrail: null, status: "rejected", approved: false, channels: [], pendingChannels: null,
    createdAt: now - 3 * DAY, updatedAt: now - 1 * DAY,
    lastHealthCheckAt: now - 1 * DAY, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION,
    rejection: { at: now - 1 * DAY, by: approvalLevelLabel("https://wh.partner.io"), reason: "Domain is not on the approved partner list." },
    lastRejection: { at: now - 1 * DAY, by: approvalLevelLabel("https://wh.partner.io"), reason: "Domain is not on the approved partner list." },
    rejectionBannerDismissed: false,
  });
  addHistory("ext-seed-5", { at: now - 3 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-5", { at: now - 2 * DAY, actor: CURRENT_USER, summary: "Submitted for approval", detail: "Channels requested: none" });
  addHistory("ext-seed-5", { at: now - 1 * DAY, actor: approvalLevelLabel("https://wh.partner.io"), summary: "Rejected", detail: "Domain is not on the approved partner list." });

  // 6 — Marketing Copywriter (Paused, was published to Web)
  put({
    id: "ext-seed-6", name: "Marketing Copywriter", description: "Campaign copy drafts for social channels.",
    baseUrl: "https://mkt.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    guardrail: "Marketing brand-safety set", status: "paused", approved: true, channels: ["web"], pendingChannels: null,
    createdAt: now - 10 * DAY, updatedAt: now - 4 * DAY,
    lastHealthCheckAt: now - 4 * DAY, lastHealthCheckOk: false,
    lastValidation: PASSED_VALIDATION, rejection: null, lastRejection: null, rejectionBannerDismissed: false,
  });
  addHistory("ext-seed-6", { at: now - 10 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-6", { at: now - 9 * DAY, actor: CURRENT_USER, summary: "Submitted for approval", detail: "Channels requested: Web" });
  addHistory("ext-seed-6", { at: now - 8 * DAY, actor: approvalLevelLabel("https://mkt.abc.ai"), summary: `Approved by ${approvalLevelLabel("https://mkt.abc.ai")}` });
  addHistory("ext-seed-6", { at: now - 7 * DAY, actor: CURRENT_USER, summary: "Published to Web" });
  addHistory("ext-seed-6", { at: now - 4 * DAY, actor: "Tran Nam", summary: "Paused" });

  // 7 — Insurance Claim Agent (Draft, no description, no Activity at all)
  put({
    id: "ext-seed-7", name: "Insurance Claim Agent", description: "",
    baseUrl: "https://claims.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    guardrail: null, status: "draft", approved: false, channels: [], pendingChannels: null,
    createdAt: now, updatedAt: now,
    lastHealthCheckAt: now, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null, lastRejection: null, rejectionBannerDismissed: false,
  });

  persistStore();
  persistHistory();
}

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function addHistory(agentId: string, entry: Omit<HistoryEntry, "id" | "agentId">) {
  const list = history.get(agentId) ?? [];
  list.unshift({ id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, agentId, ...entry });
  history.set(agentId, list);
  persistHistory();
}

function perUserConnectorState(baseUrl: string, bearerToken: string): PerUserConnectorState {
  const t = bearerToken.toLowerCase();
  if (t.includes("noncompliant")) return "non_compliant";
  if (t.includes("peruser")) return "valid";
  const h = hashString(baseUrl) % 3;
  return h === 0 ? "none" : h === 1 ? "valid" : "non_compliant";
}

/** Deterministic mock connection check — a real backend would actually call the endpoint.
 * Typing "unreachable" in the URL or "invalid" in the token lets a tester deliberately
 * reproduce each blocking failure; "peruser"/"noncompliant" in the token force the per-user
 * connector state; otherwise it's derived from the URL so it stays stable across reloads. */
export function runValidation(baseUrl: string, bearerToken: string): ValidationResult {
  const endpointReachable = !baseUrl.toLowerCase().includes("unreachable");
  const authVerified = endpointReachable && !bearerToken.toLowerCase().includes("invalid");
  const protocolSupported = authVerified;
  const runsAvailable = authVerified;
  return {
    at: Date.now(),
    endpointReachable,
    authVerified,
    protocolSupported,
    runsAvailable,
    perUserConnector: perUserConnectorState(baseUrl, bearerToken),
    passed: endpointReachable && authVerified && protocolSupported && runsAvailable,
  };
}

export const externalAgentStore = {
  list(): ExternalAgent[] {
    seedDefaultAgents();
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): ExternalAgent | undefined {
    seedDefaultAgents();
    return store.get(id);
  },
  isDuplicateName(name: string, excludeId?: string): boolean {
    const n = name.trim().toLowerCase();
    return [...store.values()].some(a => a.id !== excludeId && a.name.trim().toLowerCase() === n);
  },
  create(data: { name: string; description: string; baseUrl: string; authMethod: AuthMethod; validation: ValidationResult }): ExternalAgent {
    const id = `ext-${Date.now().toString(36)}`;
    const now = Date.now();
    const agent: ExternalAgent = {
      id,
      name: data.name.trim(),
      description: data.description.trim(),
      baseUrl: data.baseUrl.trim(),
      authMethod: data.authMethod,
      hasToken: data.authMethod === "bearer",
      signingSecret: generateSigningSecret(),
      guardrail: null,
      status: "draft",
      approved: false,
      channels: [],
      pendingChannels: null,
      createdAt: now,
      updatedAt: now,
      lastHealthCheckAt: null,
      lastHealthCheckOk: null,
      lastValidation: data.validation,
      rejection: null,
      lastRejection: null,
      rejectionBannerDismissed: false,
    };
    store.set(id, agent);
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Connection created" });
    return agent;
  },
  update(id: string, patch: {
    name?: string; description?: string; baseUrl?: string; authMethod?: AuthMethod;
    tokenReplaced?: boolean; validation?: ValidationResult;
  }) {
    const cur = store.get(id);
    if (!cur) return;
    const details: string[] = [];
    if (patch.name !== undefined && patch.name.trim() !== cur.name) details.push(`Agent name: ${cur.name} → ${patch.name.trim()}`);
    if (patch.description !== undefined && patch.description.trim() !== cur.description) details.push("Description updated");
    if (patch.baseUrl !== undefined && patch.baseUrl.trim() !== cur.baseUrl) details.push(`Base URL: ${cur.baseUrl} → ${patch.baseUrl.trim()}`);
    if (patch.authMethod !== undefined && patch.authMethod !== cur.authMethod) {
      details.push(`Authentication: ${cur.authMethod === "bearer" ? "Bearer Token" : "None"} → ${patch.authMethod === "bearer" ? "Bearer Token" : "None"}`);
    }
    // Editing and saving a Rejected connection is how the creator resubmits it — moves the
    // agent back to Draft, regardless of which fields changed. The live rejection banner
    // clears, but lastRejection/rejectionBannerDismissed are untouched so the "Previously
    // rejected…" banner keeps showing on Draft until the Builder dismisses it.
    const wasRejected = cur.status === "rejected";
    const next: ExternalAgent = {
      ...cur,
      name: patch.name !== undefined ? patch.name.trim() : cur.name,
      description: patch.description !== undefined ? patch.description.trim() : cur.description,
      baseUrl: patch.baseUrl !== undefined ? patch.baseUrl.trim() : cur.baseUrl,
      authMethod: patch.authMethod ?? cur.authMethod,
      hasToken: patch.tokenReplaced ? true : cur.hasToken,
      lastValidation: patch.validation ?? cur.lastValidation,
      status: wasRejected ? "draft" : cur.status,
      approved: wasRejected ? false : cur.approved,
      rejection: wasRejected ? null : cur.rejection,
      updatedAt: Date.now(),
    };
    store.set(id, next);
    persistStore();
    if (patch.tokenReplaced) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, summary: "Token replaced", detail: "Bearer token replaced" });
    }
    if (details.length > 0) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, summary: "Connection edited", detail: details.join(" · ") });
    } else if (wasRejected && !patch.tokenReplaced) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, summary: "Connection edited", detail: "Resubmitted after rejection" });
    }
  },
  rotateSigningSecret(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    const now = Date.now();
    store.set(id, { ...cur, signingSecret: generateSigningSecret(), updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Secret rotated" });
  },
  dismissRejectionBanner(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, rejectionBannerDismissed: true });
    persistStore();
  },
  /** The single "Publish" action on a Draft agent. If the connection is already approved this
   * publishes immediately; otherwise it sends the connection for approval (in the separate
   * admin console this Builder doesn't have access to) and stores the requested channels so
   * they're applied automatically the moment approval completes — see approve() below. */
  publishOrSubmit(id: string, channels: string[]): { ok: boolean; mode?: "published" | "pending" } {
    const cur = store.get(id);
    if (!cur || cur.status !== "draft") return { ok: false };
    if (cur.approved) {
      this.publish(id, channels);
      return { ok: true, mode: "published" };
    }
    const now = Date.now();
    store.set(id, { ...cur, status: "pending_approval", pendingChannels: channels, updatedAt: now });
    persistStore();
    addHistory(id, {
      at: now, actor: CURRENT_USER, summary: "Submitted for approval",
      detail: `Channels requested: ${channels.length > 0 ? channels.map(channelLabel).join(", ") : "none"}`,
    });
    return { ok: true, mode: "pending" };
  },
  /** Called by the separate admin console (not reachable from this Builder's UI) once a
   * connection is approved. Applies any channels that were requested when it was submitted. */
  approve(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "pending_approval") return;
    const now = Date.now();
    const channels = cur.pendingChannels ?? [];
    const nowPublished = channels.length > 0;
    store.set(id, {
      ...cur, status: nowPublished ? "published" : "draft", approved: true,
      channels, pendingChannels: null, rejection: null, updatedAt: now,
    });
    persistStore();
    addHistory(id, { at: now, actor: approvalLevelLabel(cur.baseUrl), summary: `Approved by ${approvalLevelLabel(cur.baseUrl)}` });
    if (nowPublished) {
      addHistory(id, { at: now, actor: CURRENT_USER, summary: `Published to ${channels.map(channelLabel).join(", ")}` });
    }
  },
  /** Called by the separate admin console (not reachable from this Builder's UI). */
  reject(id: string, reason: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "pending_approval") return;
    const now = Date.now();
    const by = approvalLevelLabel(cur.baseUrl);
    store.set(id, {
      ...cur, status: "rejected", approved: false, pendingChannels: null,
      rejection: { at: now, by, reason: reason.trim() },
      lastRejection: { at: now, by, reason: reason.trim() },
      rejectionBannerDismissed: false,
      updatedAt: now,
    });
    persistStore();
    addHistory(id, { at: now, actor: by, summary: "Rejected", detail: reason.trim() });
  },
  /** Approved Draft -> Published (channels.length > 0) or Published -> Draft (channels.length
   * === 0, i.e. unpublished from every channel — stays approved). Published -> Published with a
   * different channel selection just updates the list — the UI decides when to confirm an
   * unpublish-all before calling this. */
  publish(id: string, channels: string[]) {
    const cur = store.get(id);
    if (!cur || !((cur.status === "draft" && cur.approved) || cur.status === "published")) return;
    const now = Date.now();
    const nowPublished = channels.length > 0;
    store.set(id, { ...cur, status: nowPublished ? "published" : "draft", channels, updatedAt: now });
    persistStore();
    if (nowPublished) {
      addHistory(id, { at: now, actor: CURRENT_USER, summary: `Published to ${channels.map(channelLabel).join(", ")}` });
    } else {
      addHistory(id, { at: now, actor: CURRENT_USER, summary: "Unpublished from all channels" });
    }
  },
  pause(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "published") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "paused", updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Paused" });
  },
  resume(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "paused") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "published", updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Resumed" });
  },
  remove(id: string) {
    store.delete(id);
    history.delete(id);
    persistStore();
    persistHistory();
  },
  runHealthCheck(id: string): boolean {
    const cur = store.get(id);
    if (!cur) return false;
    const ok = !cur.baseUrl.toLowerCase().includes("unreachable");
    const now = Date.now();
    store.set(id, { ...cur, lastHealthCheckAt: now, lastHealthCheckOk: ok, updatedAt: cur.updatedAt });
    persistStore();
    return ok;
  },
  /** Activity — the connection lifecycle log (Connection created, Submitted for approval,
   * Approved/Rejected, Published/Unpublished, Paused/Resumed, Connection edited, Token
   * replaced, Secret rotated). Conversations live in externalAgentConversationStore instead. */
  activity(id: string): HistoryEntry[] {
    return [...(history.get(id) ?? [])].sort((a, b) => b.at - a.at);
  },
};
