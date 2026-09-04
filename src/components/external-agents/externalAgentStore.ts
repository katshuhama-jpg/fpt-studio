// sessionStorage-backed store for the External Agents prototype — no backend, so create →
// list → detail → status changes all read/write the same in-memory + sessionStorage map and
// stay in sync across navigation within the session, the same pattern as triggerStore.ts /
// agentConnectorStore.ts.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";

// Five statuses: Draft -> Pending approval -> Published (or -> Rejected -> back to Pending
// approval), and Published <-> Paused. This is a BA/UX-review prototype — approve/reject are
// simulated as if the current user were an FPT admin, with no real role check.
export type ExternalAgentStatus = "draft" | "pending_approval" | "rejected" | "published" | "paused";
export type AuthMethod = "bearer" | "none";
/** Controls how much prior conversation the platform includes in each call to this agent's
 * /runs endpoint. "last_n" carries the turn count in `lastN`. */
export type HistoryDeliveryMode = "full" | "last_n" | "none";

export interface ValidationResult {
  at: number;
  endpointReachable: boolean;
  authVerified: boolean;
  protocolSupported: boolean;
  runsAvailable: boolean;
  passed: boolean; // all four checks passed
}

export interface ExternalAgent {
  id: string;
  name: string;
  description: string;
  /** Per-agent identity, same emoji+bg pattern as the internal Agent's AGENTS seed data
   * (agentStore.ts) — gives each row/breadcrumb a distinct icon instead of one generic mark. */
  emoji: string;
  bg: string;
  baseUrl: string;
  authMethod: AuthMethod;
  // Never store/display the real secret — a prototype stand-in that only proves "a token
  // was saved" without ever letting a saved token round-trip back into the UI.
  hasToken: boolean;
  /** HMAC signing secret used for X-FPT-Signature — shown masked, rotatable. Every request the
   * platform sends is signed with this regardless of authMethod. */
  signingSecret: string;
  /** Hostnames the platform will accept as `authorizeUrl` redirect targets when this agent
   * registers a per-user credential (see the /credentials endpoint). At least one required. */
  allowedAuthorizeHosts: string[];
  /** How much prior conversation the platform sends to this agent on each /runs call. */
  historyDelivery: { mode: HistoryDeliveryMode; lastN?: number };
  guardrail: string | null;
  status: ExternalAgentStatus;
  createdAt: number;
  updatedAt: number;
  lastHealthCheckAt: number | null;
  lastHealthCheckOk: boolean | null;
  /** Timestamp of the last health check that actually passed — kept as-is when a later check
   * fails, so the Instruction tab can say how long the agent has been unreachable. Null if it
   * has never once passed a check. */
  lastHealthyAt: number | null;
  lastValidation: ValidationResult | null;
  /** Only set while status is "rejected" — the reason an FPT admin gave, shown as a banner on
   * the Build tab. Cleared the next time the agent is submitted for approval. */
  rejection: { at: number; by: string; reason: string } | null;
  /** Soft-delete: Delete wipes the connection settings below and hides the agent from list()/
   * get(), but keeps its Activity log and conversation history (archived, not wiped) in case a
   * later audit-export surface needs them. Never true for a Published agent — Delete requires
   * Pause first. */
  archived: boolean;
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
// signingSecret/guardrail existed) would load stale objects missing the new fields, and the
// page would crash on render with no error boundary — a blank white screen for anyone who had
// the External Agents page open across a deploy that changed the data shape.
const STORE_KEY = "external_agent_store_v7";
const HISTORY_KEY = "external_agent_history_v7";
const SEEDED_KEY = "external_agent_store_seeded_v7";
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
  at: Date.now(), endpointReachable: true, authVerified: true, protocolSupported: true, runsAvailable: true, passed: true,
};

/** Demo data so opening External Agents shows real content covering every status instead of
 * an empty list — seeded once per session. */
function seedDefaultAgents() {
  const seededFlag = loadSet<string>(SEEDED_KEY);
  if (seededFlag.has("done")) return;
  seededFlag.add("done");
  saveSet(SEEDED_KEY, seededFlag);
  const now = Date.now();

  const put = (agent: ExternalAgent) => store.set(agent.id, agent);

  // 1 — Flight Assistant (Published)
  put({
    id: "ext-seed-1", name: "Flight Assistant", description: "Search and book flights for staff travel.",
    emoji: "✈️", bg: "bg-blue-50",
    baseUrl: "https://agent.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    allowedAuthorizeHosts: ["auth.abc.ai"], historyDelivery: { mode: "full" },
    guardrail: "Standard content safety", status: "published", rejection: null, archived: false,
    createdAt: now - 20 * DAY, updatedAt: now - 2 * HOUR,
    lastHealthCheckAt: now - 2 * MIN, lastHealthCheckOk: true, lastHealthyAt: now - 2 * MIN,
    lastValidation: PASSED_VALIDATION,
  });
  addHistory("ext-seed-1", { at: now - 20 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-1", { at: now - 19 * DAY, actor: CURRENT_USER, summary: "Submitted for approval" });
  addHistory("ext-seed-1", { at: now - 18 * DAY, actor: CURRENT_USER, summary: "Approved by Tran Nam" });

  // 2 — HR Helpdesk (Published)
  put({
    id: "ext-seed-2", name: "HR Helpdesk", description: "Leave balance, payroll and policy questions.",
    emoji: "🤝", bg: "bg-pink-50",
    baseUrl: "https://hr.xyz-ai.com", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    allowedAuthorizeHosts: ["auth.xyz-ai.com"], historyDelivery: { mode: "last_n", lastN: 10 },
    guardrail: null, status: "published", rejection: null, archived: false,
    createdAt: now - 15 * DAY, updatedAt: now - 1 * DAY,
    lastHealthCheckAt: now - 1 * MIN, lastHealthCheckOk: true, lastHealthyAt: now - 1 * MIN,
    lastValidation: PASSED_VALIDATION,
  });
  addHistory("ext-seed-2", { at: now - 15 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-2", { at: now - 14 * DAY, actor: CURRENT_USER, summary: "Submitted for approval" });
  addHistory("ext-seed-2", { at: now - 13 * DAY, actor: CURRENT_USER, summary: "Approved by Tran Nam" });

  // 3 — Finance Reporter (Draft)
  put({
    id: "ext-seed-3", name: "Finance Reporter", description: "Monthly revenue summary from the finance system.",
    emoji: "📊", bg: "bg-green-50",
    baseUrl: "https://fin.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    allowedAuthorizeHosts: ["auth.fin.abc.ai"], historyDelivery: { mode: "full" },
    guardrail: null, status: "draft", rejection: null, archived: false,
    createdAt: now - 5 * DAY, updatedAt: now - 3 * HOUR,
    lastHealthCheckAt: now - 5 * MIN, lastHealthCheckOk: true, lastHealthyAt: now - 5 * MIN,
    lastValidation: PASSED_VALIDATION,
  });
  addHistory("ext-seed-3", { at: now - 5 * DAY, actor: CURRENT_USER, summary: "Connection created" });

  // 4 — Legal Doc Checker (Pending approval)
  put({
    id: "ext-seed-4", name: "Legal Doc Checker", description: "Contract clause review against company policy.",
    emoji: "⚖️", bg: "bg-amber-50",
    baseUrl: "https://legal.partner-ai.com", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    allowedAuthorizeHosts: ["auth.partner-ai.com"], historyDelivery: { mode: "last_n", lastN: 5 },
    guardrail: null, status: "pending_approval", rejection: null, archived: false,
    createdAt: now - 1 * DAY, updatedAt: now - 30 * MIN,
    lastHealthCheckAt: now - 30 * MIN, lastHealthCheckOk: true, lastHealthyAt: now - 30 * MIN,
    lastValidation: PASSED_VALIDATION,
  });
  addHistory("ext-seed-4", { at: now - 1 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-4", { at: now - 30 * MIN, actor: CURRENT_USER, summary: "Submitted for approval" });

  // 5 — Warehouse Bot (Rejected)
  put({
    id: "ext-seed-5", name: "Warehouse Bot", description: "Stock lookup and restock suggestions.",
    emoji: "📦", bg: "bg-indigo-50",
    baseUrl: "https://wh.partner.io", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    allowedAuthorizeHosts: ["auth.partner.io"], historyDelivery: { mode: "none" },
    guardrail: null, status: "rejected",
    rejection: { at: now - 1 * DAY, by: CURRENT_USER, reason: "Domain is not on the approved partner list." },
    archived: false,
    createdAt: now - 3 * DAY, updatedAt: now - 1 * DAY,
    lastHealthCheckAt: now - 1 * DAY, lastHealthCheckOk: true, lastHealthyAt: now - 1 * DAY,
    lastValidation: PASSED_VALIDATION,
  });
  addHistory("ext-seed-5", { at: now - 3 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-5", { at: now - 2 * DAY, actor: CURRENT_USER, summary: "Submitted for approval" });
  addHistory("ext-seed-5", { at: now - 1 * DAY, actor: CURRENT_USER, summary: "Rejected by Tran Nam (Domain is not on the approved partner list.)" });

  // 6 — Marketing Copywriter (Paused, was published)
  put({
    id: "ext-seed-6", name: "Marketing Copywriter", description: "Campaign copy drafts for social channels.",
    emoji: "📣", bg: "bg-purple-50",
    baseUrl: "https://mkt.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    allowedAuthorizeHosts: ["auth.abc.ai"], historyDelivery: { mode: "full" },
    guardrail: "Marketing brand-safety set", status: "paused", rejection: null, archived: false,
    createdAt: now - 10 * DAY, updatedAt: now - 4 * DAY,
    lastHealthCheckAt: now - 4 * DAY, lastHealthCheckOk: false, lastHealthyAt: now - 5 * DAY,
    lastValidation: PASSED_VALIDATION,
  });
  addHistory("ext-seed-6", { at: now - 10 * DAY, actor: CURRENT_USER, summary: "Connection created" });
  addHistory("ext-seed-6", { at: now - 9 * DAY, actor: CURRENT_USER, summary: "Submitted for approval" });
  addHistory("ext-seed-6", { at: now - 8 * DAY, actor: CURRENT_USER, summary: "Approved by Tran Nam" });
  addHistory("ext-seed-6", { at: now - 4 * DAY, actor: CURRENT_USER, summary: "Paused" });

  // 7 — Insurance Claim Agent (Draft, no description, no Activity at all)
  put({
    id: "ext-seed-7", name: "Insurance Claim Agent", description: "",
    emoji: "🛡️", bg: "bg-rose-50",
    baseUrl: "https://claims.abc.ai", authMethod: "bearer", hasToken: true, signingSecret: generateSigningSecret(),
    allowedAuthorizeHosts: ["auth.claims.abc.ai"], historyDelivery: { mode: "full" },
    guardrail: null, status: "draft", rejection: null, archived: false,
    createdAt: now, updatedAt: now,
    lastHealthCheckAt: now, lastHealthCheckOk: true, lastHealthyAt: now,
    lastValidation: PASSED_VALIDATION,
  });

  persistStore();
  persistHistory();
}

function addHistory(agentId: string, entry: Omit<HistoryEntry, "id" | "agentId">) {
  const list = history.get(agentId) ?? [];
  list.unshift({ id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, agentId, ...entry });
  history.set(agentId, list);
  persistHistory();
}

/** Deterministic mock connection check — a real backend would actually call the endpoint.
 * Typing "unreachable" in the URL or "invalid" in the token lets a tester deliberately
 * reproduce each blocking failure. */
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
    passed: endpointReachable && authVerified && protocolSupported && runsAvailable,
  };
}

export const externalAgentStore = {
  list(): ExternalAgent[] {
    seedDefaultAgents();
    return [...store.values()].filter(a => !a.archived).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): ExternalAgent | undefined {
    seedDefaultAgents();
    return store.get(id);
  },
  isDuplicateName(name: string, excludeId?: string): boolean {
    const n = name.trim().toLowerCase();
    return [...store.values()].some(a => !a.archived && a.id !== excludeId && a.name.trim().toLowerCase() === n);
  },
  create(data: {
    name: string; description: string; baseUrl: string; authMethod: AuthMethod; validation: ValidationResult;
    allowedAuthorizeHosts: string[]; historyDelivery: { mode: HistoryDeliveryMode; lastN?: number };
  }): ExternalAgent {
    const id = `ext-${Date.now().toString(36)}`;
    const now = Date.now();
    const agent: ExternalAgent = {
      id,
      name: data.name.trim(),
      description: data.description.trim(),
      emoji: "🔌", bg: "bg-primary-soft",
      baseUrl: data.baseUrl.trim(),
      authMethod: data.authMethod,
      hasToken: data.authMethod === "bearer",
      signingSecret: generateSigningSecret(),
      allowedAuthorizeHosts: data.allowedAuthorizeHosts,
      historyDelivery: data.historyDelivery,
      guardrail: null,
      status: "draft",
      rejection: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
      lastHealthCheckAt: null,
      lastHealthCheckOk: null,
      lastHealthyAt: null,
      lastValidation: data.validation,
    };
    store.set(id, agent);
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Connection created" });
    return agent;
  },
  /** Editing a Published agent's connection unpublishes it immediately, regardless of which
   * field changed — returns `unpublished: true` so the caller can surface the "this agent was
   * unpublished" banner and toast. */
  update(id: string, patch: {
    name?: string; description?: string; baseUrl?: string; authMethod?: AuthMethod;
    tokenReplaced?: boolean; validation?: ValidationResult;
    allowedAuthorizeHosts?: string[]; historyDelivery?: { mode: HistoryDeliveryMode; lastN?: number };
  }): { unpublished: boolean } {
    const cur = store.get(id);
    if (!cur) return { unpublished: false };
    const details: string[] = [];
    if (patch.name !== undefined && patch.name.trim() !== cur.name) details.push(`Agent name: ${cur.name} → ${patch.name.trim()}`);
    if (patch.description !== undefined && patch.description.trim() !== cur.description) details.push("Description updated");
    if (patch.baseUrl !== undefined && patch.baseUrl.trim() !== cur.baseUrl) details.push(`Base URL: ${cur.baseUrl} → ${patch.baseUrl.trim()}`);
    if (patch.authMethod !== undefined && patch.authMethod !== cur.authMethod) {
      details.push(`Authentication: ${cur.authMethod === "bearer" ? "Bearer Token" : "None"} → ${patch.authMethod === "bearer" ? "Bearer Token" : "None"}`);
    }
    if (patch.allowedAuthorizeHosts !== undefined && patch.allowedAuthorizeHosts.join(",") !== cur.allowedAuthorizeHosts.join(",")) {
      details.push("Allowed hosts for authorizeUrl updated");
    }
    if (patch.historyDelivery !== undefined && (patch.historyDelivery.mode !== cur.historyDelivery.mode || patch.historyDelivery.lastN !== cur.historyDelivery.lastN)) {
      details.push("History delivery mode updated");
    }
    const wasPublished = cur.status === "published";
    const next: ExternalAgent = {
      ...cur,
      name: patch.name !== undefined ? patch.name.trim() : cur.name,
      description: patch.description !== undefined ? patch.description.trim() : cur.description,
      baseUrl: patch.baseUrl !== undefined ? patch.baseUrl.trim() : cur.baseUrl,
      authMethod: patch.authMethod ?? cur.authMethod,
      hasToken: patch.tokenReplaced ? true : cur.hasToken,
      allowedAuthorizeHosts: patch.allowedAuthorizeHosts ?? cur.allowedAuthorizeHosts,
      historyDelivery: patch.historyDelivery ?? cur.historyDelivery,
      lastValidation: patch.validation ?? cur.lastValidation,
      status: wasPublished ? "draft" : cur.status,
      updatedAt: Date.now(),
    };
    store.set(id, next);
    persistStore();
    if (patch.tokenReplaced) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, summary: "Token replaced", detail: "Bearer token replaced" });
    }
    if (wasPublished) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, summary: "Connection updated", detail: details.length > 0 ? details.join(" · ") : undefined });
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, summary: "Unpublished (edited)" });
    } else if (details.length > 0) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, summary: "Connection edited", detail: details.join(" · ") });
    }
    return { unpublished: wasPublished };
  },
  rotateSigningSecret(id: string) {
    const cur = store.get(id);
    if (!cur) return;
    const now = Date.now();
    store.set(id, { ...cur, signingSecret: generateSigningSecret(), updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Secret rotated" });
  },
  /** Draft -> Pending approval (first submission), or Rejected -> Pending approval ("Submit
   * again"). Either way, any previous rejection reason is cleared once resubmitted. */
  submitForApproval(id: string) {
    const cur = store.get(id);
    if (!cur || (cur.status !== "draft" && cur.status !== "rejected")) return;
    const now = Date.now();
    store.set(id, { ...cur, status: "pending_approval", rejection: null, updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Submitted for approval" });
  },
  /** Simulates the current user acting as an FPT admin — this prototype has no real
   * role-based access control, per the BA/UX review scope. */
  approve(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "pending_approval") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "published", rejection: null, updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: `Approved by ${CURRENT_USER}` });
  },
  /** Simulates the current user acting as an FPT admin. Requires a non-empty reason, enforced
   * by the caller's confirm dialog. */
  reject(id: string, reason: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "pending_approval") return;
    const now = Date.now();
    const trimmed = reason.trim();
    store.set(id, { ...cur, status: "rejected", rejection: { at: now, by: CURRENT_USER, reason: trimmed }, updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: `Rejected by ${CURRENT_USER} (${trimmed})` });
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
  /** Delete is blocked (in the UI) while Published — Pause first. Connection settings are
   * permanently wiped here; Activity and conversation history are kept (archived, not deleted)
   * for reference, matching the updated confirm-dialog copy. */
  remove(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status === "published") return;
    const now = Date.now();
    store.set(id, {
      ...cur, archived: true, baseUrl: "", hasToken: false, signingSecret: "", guardrail: null,
      lastValidation: null, updatedAt: now,
    });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, summary: "Deleted", detail: "Connection settings removed; history archived." });
  },
  runHealthCheck(id: string): boolean {
    const cur = store.get(id);
    if (!cur) return false;
    const ok = !cur.baseUrl.toLowerCase().includes("unreachable");
    const now = Date.now();
    store.set(id, {
      ...cur, lastHealthCheckAt: now, lastHealthCheckOk: ok,
      lastHealthyAt: ok ? now : cur.lastHealthyAt,
      updatedAt: cur.updatedAt,
    });
    persistStore();
    return ok;
  },
  /** Activity — the connection lifecycle log (created, updated, submitted, approved, rejected,
   * published, unpublished, paused, resumed). Conversations live in
   * externalAgentConversationStore instead. */
  activity(id: string): HistoryEntry[] {
    return [...(history.get(id) ?? [])].sort((a, b) => b.at - a.at);
  },
};
