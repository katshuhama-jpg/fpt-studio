// sessionStorage-backed store for the External Agents prototype — no backend, so create →
// list → detail → status changes all read/write the same in-memory + sessionStorage map and
// stay in sync across navigation within the session, the same pattern as triggerStore.ts /
// agentConnectorStore.ts.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export type ExternalAgentStatus = "draft" | "waiting_approved" | "active" | "paused";

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
const store = loadMap<string, ExternalAgent>(STORE_KEY);
const history = loadMap<string, HistoryEntry[]>(HISTORY_KEY);
const persistStore = () => saveMap(STORE_KEY, store);
const persistHistory = () => saveMap(HISTORY_KEY, history);

const CURRENT_USER = "Tran Nam";

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
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): ExternalAgent | undefined {
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
    const next: ExternalAgent = {
      ...cur,
      name: patch.name !== undefined ? patch.name.trim() : cur.name,
      description: patch.description !== undefined ? patch.description.trim() : cur.description,
      baseUrl: patch.baseUrl !== undefined ? patch.baseUrl.trim() : cur.baseUrl,
      hasToken: patch.tokenReplaced ? true : cur.hasToken,
      lastValidation: patch.validation ?? cur.lastValidation,
      updatedAt: Date.now(),
    };
    store.set(id, next);
    persistStore();
    if (changed.length > 0) {
      addHistory(id, { at: next.updatedAt, actor: CURRENT_USER, kind: "change", summary: changed.join(" · ") || "Connection updated" });
    }
  },
  submitForApproval(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "draft" || !cur.lastValidation?.passed) return;
    const now = Date.now();
    store.set(id, { ...cur, status: "waiting_approved", updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Submitted for approval" });
  },
  approve(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "waiting_approved") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "active", rejection: null, updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Approved" });
    // Demo data — a real backend would have actual run history to show here; seed a few
    // believable runs the first time this agent goes live so History isn't empty on day one.
    if (!(history.get(id) ?? []).some(h => h.kind === "run")) {
      addHistory(id, { at: now - 900_000, actor: "System", kind: "run", runOk: true, durationMs: 820, summary: "Run completed", detail: "Responded to a customer support request in 0.8s." });
      addHistory(id, { at: now - 3_600_000, actor: "System", kind: "run", runOk: false, durationMs: 2200, summary: "Run failed", detail: "The agent returned a 500 error while processing the request." });
      addHistory(id, { at: now - 7_200_000, actor: "System", kind: "run", runOk: true, durationMs: 640, summary: "Run completed", detail: "Answered a question about order status." });
    }
  },
  reject(id: string, reason: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "waiting_approved") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "draft", rejection: { at: now, by: CURRENT_USER, reason: reason.trim() }, updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: `Rejected — "${reason.trim()}"` });
  },
  pause(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "active") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "paused", updatedAt: now });
    persistStore();
    addHistory(id, { at: now, actor: CURRENT_USER, kind: "change", summary: "Paused" });
  },
  resume(id: string) {
    const cur = store.get(id);
    if (!cur || cur.status !== "paused") return;
    const now = Date.now();
    store.set(id, { ...cur, status: "active", updatedAt: now });
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
