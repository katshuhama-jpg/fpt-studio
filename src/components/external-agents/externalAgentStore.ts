// sessionStorage-backed store for the External Agents prototype — no backend, so create →
// list → detail → status changes all read/write the same in-memory + sessionStorage map and
// stay in sync across navigation within the session, the same pattern as triggerStore.ts /
// agentConnectorStore.ts.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";

export type ExternalAgentStatus = "draft" | "submitted_for_approval" | "approved" | "rejected" | "published" | "paused";

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
  requiresPerUserConnection: boolean;
  passed: boolean; // all four blocking checks passed (per-user check never blocks)
}

export interface ExternalAgent {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  // Never store/display the real secret — a prototype stand-in that only proves "a token
  // was saved" without ever letting a saved token round-trip back into the UI.
  hasToken: boolean;
  status: ExternalAgentStatus;
  /** Channel ids currently published to. Empty whenever status isn't "published". */
  channels: string[];
  createdAt: number;
  updatedAt: number;
  lastHealthCheckAt: number | null;
  lastHealthCheckOk: boolean | null;
  lastValidation: ValidationResult | null;
  rejection: { at: number; by: string; reason: string } | null;
}

export interface HistoryEntry {
  id: string;
  agentId: string;
  at: number;
  actor: string;
  kind: "run" | "change";
  summary: string;
  // run-only
  runOk?: boolean;
  durationMs?: number;
  detail?: string;
}

const STORE_KEY = "external_agent_store";
const HISTORY_KEY = "external_agent_history";
const SEEDED_KEY = "external_agent_store_seeded";
const store = loadMap<string, ExternalAgent>(STORE_KEY);
const history = loadMap<string, HistoryEntry[]>(HISTORY_KEY);
const persistStore = () => saveMap(STORE_KEY, store);
const persistHistory = () => saveMap(HISTORY_KEY, history);

const CURRENT_USER = "Tran Nam";

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const PASSED_VALIDATION: ValidationResult = {
  at: Date.now(), endpointReachable: true, authVerified: true, protocolSupported: true,
  runsAvailable: true, requiresPerUserConnection: false, passed: true,
};

function seedRun(agentId: string, at: number, runOk: boolean, durationMs: number, detail: string) {
  addHistory(agentId, { at, actor: "System", kind: "run", runOk, durationMs, summary: runOk ? "Run completed" : "Run failed", detail });
}

/** Demo data so opening External Agents shows real content covering all 6 statuses instead of
 * an empty list — seeded once per session. Draft and Submitted for Approval are left with
 * little to no History (one shows the genuine empty state, the other just a couple of
 * entries) since neither has ever actually run. */
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
    baseUrl: "https://agent.abc.ai", hasToken: true, status: "published", channels: ["web", "zalo"],
    createdAt: now - 20 * DAY, updatedAt: now - 2 * HOUR,
    lastHealthCheckAt: now - 2 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null,
  });
  addHistory("ext-seed-1", { at: now - 20 * DAY, actor: CURRENT_USER, kind: "change", summary: "Connection created" });
  addHistory("ext-seed-1", { at: now - 19 * DAY, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });
  addHistory("ext-seed-1", { at: now - 18 * DAY, actor: CURRENT_USER, kind: "change", summary: "Approved" });
  addHistory("ext-seed-1", { at: now - 17 * DAY, actor: CURRENT_USER, kind: "change", summary: "Published to Web, Zalo" });
  seedRun("ext-seed-1", now - 3 * HOUR, true, 1400, "Booked a round-trip flight for a business trip.");
  seedRun("ext-seed-1", now - 26 * HOUR, false, 900, "No flights matched the requested dates.");
  seedRun("ext-seed-1", now - 3 * DAY, true, 1100, "Checked the status of an existing booking.");

  // 2 — HR Helpdesk (Published, Slack)
  put({
    id: "ext-seed-2", name: "HR Helpdesk", description: "Leave balance, payroll and policy questions.",
    baseUrl: "https://hr.xyz-ai.com", hasToken: true, status: "published", channels: ["slack"],
    createdAt: now - 15 * DAY, updatedAt: now - 1 * DAY,
    lastHealthCheckAt: now - 1 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null,
  });
  addHistory("ext-seed-2", { at: now - 15 * DAY, actor: CURRENT_USER, kind: "change", summary: "Connection created" });
  addHistory("ext-seed-2", { at: now - 14 * DAY, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });
  addHistory("ext-seed-2", { at: now - 13 * DAY, actor: CURRENT_USER, kind: "change", summary: "Approved" });
  addHistory("ext-seed-2", { at: now - 12 * DAY, actor: CURRENT_USER, kind: "change", summary: "Published to Slack" });
  seedRun("ext-seed-2", now - 5 * HOUR, true, 760, "Answered a question about remaining annual leave.");
  seedRun("ext-seed-2", now - 30 * HOUR, true, 640, "Explained a payroll deduction line item.");
  seedRun("ext-seed-2", now - 4 * DAY, false, 2100, "Could not find the requested policy document.");

  // 3 — Finance Reporter (Approved, not published yet)
  put({
    id: "ext-seed-3", name: "Finance Reporter", description: "Monthly revenue summary from the finance system.",
    baseUrl: "https://fin.abc.ai", hasToken: true, status: "approved", channels: [],
    createdAt: now - 5 * DAY, updatedAt: now - 3 * HOUR,
    lastHealthCheckAt: now - 5 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null,
  });
  addHistory("ext-seed-3", { at: now - 5 * DAY, actor: CURRENT_USER, kind: "change", summary: "Connection created" });
  addHistory("ext-seed-3", { at: now - 4 * DAY, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });
  addHistory("ext-seed-3", { at: now - 3 * HOUR, actor: CURRENT_USER, kind: "change", summary: "Approved" });

  // 4 — Legal Doc Checker (Submitted for approval)
  put({
    id: "ext-seed-4", name: "Legal Doc Checker", description: "Contract clause review against company policy.",
    baseUrl: "https://legal.partner-ai.com", hasToken: true, status: "submitted_for_approval", channels: [],
    createdAt: now - 1 * DAY, updatedAt: now - 30 * MIN,
    lastHealthCheckAt: now - 30 * MIN, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null,
  });
  addHistory("ext-seed-4", { at: now - 1 * DAY, actor: CURRENT_USER, kind: "change", summary: "Connection created" });
  addHistory("ext-seed-4", { at: now - 30 * MIN, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });

  // 5 — Warehouse Bot (Rejected)
  put({
    id: "ext-seed-5", name: "Warehouse Bot", description: "Stock lookup and restock suggestions.",
    baseUrl: "https://wh.partner.io", hasToken: true, status: "rejected", channels: [],
    createdAt: now - 3 * DAY, updatedAt: now - 1 * DAY,
    lastHealthCheckAt: now - 1 * DAY, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION,
    rejection: { at: now - 1 * DAY, by: "Tran Nam", reason: "Domain is not on the approved partner list." },
  });
  addHistory("ext-seed-5", { at: now - 3 * DAY, actor: CURRENT_USER, kind: "change", summary: "Connection created" });
  addHistory("ext-seed-5", { at: now - 2 * DAY, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });
  addHistory("ext-seed-5", { at: now - 1 * DAY, actor: "Tran Nam", kind: "change", summary: 'Rejected — "Domain is not on the approved partner list."' });

  // 6 — Marketing Copywriter (Paused, was published to Web)
  put({
    id: "ext-seed-6", name: "Marketing Copywriter", description: "Campaign copy drafts for social channels.",
    baseUrl: "https://mkt.abc.ai", hasToken: true, status: "paused", channels: ["web"],
    createdAt: now - 10 * DAY, updatedAt: now - 4 * DAY,
    lastHealthCheckAt: now - 4 * DAY, lastHealthCheckOk: false,
    lastValidation: PASSED_VALIDATION, rejection: null,
  });
  addHistory("ext-seed-6", { at: now - 10 * DAY, actor: CURRENT_USER, kind: "change", summary: "Connection created" });
  addHistory("ext-seed-6", { at: now - 9 * DAY, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });
  addHistory("ext-seed-6", { at: now - 8 * DAY, actor: CURRENT_USER, kind: "change", summary: "Approved" });
  addHistory("ext-seed-6", { at: now - 7 * DAY, actor: CURRENT_USER, kind: "change", summary: "Published to Web" });
  seedRun("ext-seed-6", now - 6 * DAY, true, 1800, "Drafted three social captions for a product launch.");
  seedRun("ext-seed-6", now - 5 * DAY, false, 4200, "Upstream image API timed out while generating a visual.");
  addHistory("ext-seed-6", { at: now - 4 * DAY, actor: "Tran Nam", kind: "change", summary: "Paused" });

  // 7 — Insurance Claim Agent (Draft, no description, no History at all)
  put({
    id: "ext-seed-7", name: "Insurance Claim Agent", description: "",
    baseUrl: "https://claims.abc.ai", hasToken: true, status: "draft", channels: [],
    createdAt: now, updatedAt: now,
    lastHealthCheckAt: now, lastHealthCheckOk: true,
    lastValidation: PASSED_VALIDATION, rejection: null,
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

/** Deterministic mock connection check — a real backend would actually call the endpoint.
 * Typing "unreachable" in the URL or "invalid" in the token lets a tester deliberately
 * reproduce each blocking failure; otherwise the check passes. */
export function runValidation(baseUrl: string, bearerToken: string): ValidationResult {
  const endpointReachable = !baseUrl.toLowerCase().includes("unreachable");
  const authVerified = endpointReachable && !bearerToken.toLowerCase().includes("invalid");
  const protocolSupported = authVerified;
  const runsAvailable = authVerified;
  const requiresPerUserConnection = bearerToken.toLowerCase().includes("peruser") || hashString(baseUrl) % 3 === 0;
  return {
    at: Date.now(),
    endpointReachable,
    authVerified,
    protocolSupported,
    runsAvailable,
    requiresPerUserConnection,
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
  create(data: { name: string; description: string; baseUrl: string; validation: ValidationResult }): ExternalAgent {
    const id = `ext-${Date.now().toString(36)}`;
    const now = Date.now();
    const agent: ExternalAgent = {
      id,
      name: data.name.trim(),
      description: data.description.trim(),
      baseUrl: data.baseUrl.trim(),
      hasToken: true,
      status: "draft",
      channels: [],
      createdAt: now,
      updatedAt: now,
      lastHealthCheckAt: null,
      lastHealthCheckOk: null,
      lastValidation: data.validation,
      rejection: null,
    };
    store.set(id, agent);
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Connection created" });
    return agent;
  },
  update(id: string, patch: { name?: string; description?: string; baseUrl?: string; tokenReplaced?: boolean; validation?: ValidationResult }) {
    const cur = store.get(id);
    if (!cur) return;
    const changed: string[] = [];
    if (patch.name !== undefined && patch.name.trim() !== cur.name) changed.push("Agent name changed");
    if (patch.description !== undefined && patch.description.trim() !== cur.description) changed.push("Description changed");
    if (patch.baseUrl !== undefined && patch.baseUrl.trim() !== cur.baseUrl) changed.push("Base URL changed");
    if (patch.tokenReplaced) changed.push("Bearer token replaced");
    // Editing and saving a Rejected connection is how the creator resubmits it — moves the
    // agent back to Draft and clears the rejection banner, regardless of which fields changed.
    const wasRejected = cur.status === "rejected";
    const next: ExternalAgent = {
      ...cur,
      name: patch.name !== undefined ? patch.name.trim() : cur.name,
      description: patch.description !== undefined ? patch.description.trim() : cur.description,
      baseUrl: patch.baseUrl !== undefined ? patch.baseUrl.trim() : cur.baseUrl,
      hasToken: patch.tokenReplaced ? true : cur.hasToken,
      lastValidation: patch.validation ?? cur.lastValidation,
      status: wasRejected ? "draft" : cur.status,
      rejection: wasRejected ? null : cur.rejection,
      updatedAt: Date.now(),
    };
    store.set(id, next);
    persistStore();
    if (changed.length > 0) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, kind: "change", summary: changed.join(" · ") });
    } else if (wasRejected) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, kind: "change", summary: "Connection updated" });
    }
  },
  submitForApproval(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "draft" || !cur.lastValidation?.passed) return;
    const now = Date.now();
    store.set(id, { ...cur, status: "submitted_for_approval", updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });
  },
  approve(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "submitted_for_approval") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "approved", rejection: null, updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Approved" });
  },
  reject(id: string, reason: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "submitted_for_approval") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "rejected", rejection: { at: now, by: CURRENT_USER, reason: reason.trim() }, updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: `Rejected — "${reason.trim()}"` });
  },
  /** Approved -> Published (channels.length > 0) or Published -> Approved (channels.length
   * === 0, i.e. unpublished from every channel). Published -> Published with a different
   * channel selection just updates the list — the UI decides when to confirm an unpublish-all
   * before calling this. */
  publish(id: string, channels: string[]) {
    const cur = store.get(id);
    if (!cur || (cur.status !== "approved" && cur.status !== "published")) return;
    const now = Date.now();
    const nowPublished = channels.length > 0;
    store.set(id, { ...cur, status: nowPublished ? "published" : "approved", channels, updatedAt: now });
    persistStore();
    if (nowPublished) {
      addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: `Published to ${channels.map(channelLabel).join(", ")}` });
      // Demo data — a real backend would have actual run history to show here; seed a few
      // believable runs the first time this agent goes live so History isn't empty on day one.
      if (!(history.get(id) ?? []).some(h => h.kind === "run")) {
        addHistory(id, { at: now - 900_000, actor: "System", kind: "run", runOk: true, durationMs: 820, summary: "Run completed", detail: "Responded to a customer support request in 0.8s." });
        addHistory(id, { at: now - 3_600_000, actor: "System", kind: "run", runOk: false, durationMs: 2200, summary: "Run failed", detail: "The agent returned a 500 error while processing the request." });
        addHistory(id, { at: now - 7_200_000, actor: "System", kind: "run", runOk: true, durationMs: 640, summary: "Run completed", detail: "Answered a question about order status." });
      }
    } else {
      addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Unpublished from all channels" });
    }
  },
  pause(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "published") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "paused", updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Paused" });
  },
  resume(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "paused") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "published", updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Resumed" });
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
    addHistory(id, {
      at: now, actor: CURRENT_USER, kind: "change",
      summary: `Health check run — ${ok ? "Healthy" : "Unreachable"}`,
    });
    return ok;
  },
  history(id: string): HistoryEntry[] {
    return [...(history.get(id) ?? [])].sort((a, b) => b.at - a.at);
  },
};
