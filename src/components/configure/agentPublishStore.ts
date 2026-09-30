// sessionStorage-backed per-agent publish state. An agent is published to exactly one
// placement — Workspace (people install it and chat with it) or Automation (it runs
// unattended for the whole org, driven by Console triggers) — plus an independent set of
// external channels available to either placement (their meaning differs: inbound for
// Workspace, outbound for Automation). Kind (agentKindStore.ts) is derived from trigger
// count, not stored here, so removing the last trigger instantly reopens the Workspace
// placement. Mutations survive a page reload and client-side navigation within the session.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";

export type Placement = "workspace" | "automation" | null;

/** Who can see/use a Workspace-placement agent. Chosen in the Publish modal's "Publish to"
 * section:
 *   - "me" — private, instant, no review.
 *   - "quick_share" — a hand-picked list of up to 10 specific people ("Chia sẻ nhanh"),
 *     instant, no review — genuinely small/ad-hoc sharing, same trust level as "me".
 *   - "group" — a named, rostered "Nhóm cộng tác" (collabGroupStore.ts). Instant while its
 *     roster's overlap with any real Org/Unit stays below the anti-bypass threshold; the
 *     moment it crosses that threshold (checked continuously, not just at publish time — see
 *     collabGroupStore.recheckGroupPublishes) it is treated exactly like "org": pulled back
 *     to pending Org/Unit Admin review.
 *   - "org" — Company / department, always reviewed.
 *   - "community" — FPT AI Agent community, always reviewed.
 * Independent of Placement, which stays "workspace" for all of these since they're all still
 * chat-based publishing, just at different visibility scopes. Undefined on older/seeded state
 * defaults to "me" wherever it's read. */
export type PublishAudience = "me" | "quick_share" | "group" | "org" | "community";

export const BASELINE_VERSION = "v1.0.1";

export interface AgentPublishState {
  placement: Placement;
  audience?: PublishAudience;
  channels: string[];
  /** The version currently live. Stays at BASELINE_VERSION until the agent is actually
   * published; unpublishing doesn't reset it, so a later republish keeps counting up. */
  version: string;
  /** Human-readable "who exactly" for quick_share/group — e.g. "9 người: ..." or "Nhóm cộng
   * tác 'Ra mắt Q4' (9 người)". Display-only. */
  scopeSummary?: string;
  /** Set only when audience is "group" — which collabGroupStore group this Agent is scoped to,
   * so the continuous overlap recheck knows which roster to re-evaluate. */
  groupId?: string;
  /** Group roster that was approved for this live version — members added to the group later
   * are not covered until a re-approval (collabGroupStore.recheckAgentGroupPublish). */
  groupMemberIds?: string[];
  /** Set by collabGroupStore.recheckGroupPublishes when a live "group" Agent's roster overlap
   * has crossed the anti-bypass threshold since it was last approved — the Agent has been
   * pulled back to pending review (see that function) and this flags why, for the banner on
   * the Agent's own page. Cleared on the request's next approval. */
  needsRegovernance?: { reason: string; unitName: string; overlapPct: number; at: number };
}

/** One entry per version that actually went live (direct publish, approved request, or
 * rollback) — what the Builder's "Phiên bản" page reads to know which older versions can be
 * restored and with exactly which scope/channels they were live. */
export interface ReleaseEntry {
  version: string;
  at: number;
  audience?: PublishAudience;
  scopeSummary?: string;
  groupId?: string;
  groupMemberIds?: string[];
  channels: string[];
  via: "direct" | "approved" | "rollback";
  /** Who put it live this time (rollback / direct publish); approvals are attributed via the request. */
  byName?: string;
}

const STORE_KEY = "agent_publish_store_v5";
const RELEASE_KEY = "agent_release_log_v2";
const releaseLog = loadMap<string, ReleaseEntry[]>(RELEASE_KEY);
const persistReleases = () => saveMap(RELEASE_KEY, releaseLog);
const DAY_MS = 86_400_000;
/** Earlier live versions for the seeded live Agents, so the Phiên bản page has real history to
 * show and restore (the last entry of each list is the version currently live). */
const SEED_RELEASES: Record<string, Omit<ReleaseEntry, "at">[]> = {
  faq: [
    { version: "v1.0.0", audience: "org", scopeSummary: "Phòng Chăm sóc khách hàng (22 người)", channels: ["web"], via: "approved" },
    { version: "v1.1.0", audience: "org", scopeSummary: "Toàn công ty", channels: ["web"], via: "approved" },
  ],
  ops: [
    { version: "v1.2.0", audience: "org", scopeSummary: "Phòng Vận hành (18 người)", channels: ["web"], via: "approved" },
    { version: "v1.3.0", audience: "org", scopeSummary: "FPT Smart Cloud (35 người)", channels: ["web", "api"], via: "approved" },
  ],
  "ext-seed-1": [{ version: "v1.0.2", audience: "org", scopeSummary: "Toàn công ty", channels: ["web", "api"], via: "approved" }],
  "ext-seed-2": [{ version: "v1.1.0", audience: "org", scopeSummary: "Phòng Nhân sự (36 người)", channels: ["web"], via: "approved" }],
  cskh: [{ version: "v2.0.0", audience: "group", scopeSummary: "Nhóm cộng tác \"Platform squad\" (4 người)", groupId: "grp-platform-squad", groupMemberIds: ["m-plat-1", "m-plat-2", "m-plat-3", "m-plat-4"], channels: ["web", "zalo"], via: "approved" }],
  "sales-quote": [{ version: "v1.0.0", audience: "org", scopeSummary: "Phòng Kinh doanh (48 người)", channels: [], via: "approved" }],
  "finance-check": [{ version: "v1.2.0", audience: "org", scopeSummary: "Phòng Tài chính (14 người)", channels: ["slack"], via: "approved" }],
  "legal-review": [{ version: "v1.1.0", audience: "org", scopeSummary: "Ban Pháp chế (14 người)", channels: ["slack"], via: "approved" }],
};
const SEEDED_KEY = "agent_publish_store_seeded_v5";
const store = loadMap<string, AgentPublishState>(STORE_KEY);
const seededAgents = loadSet<string>(SEEDED_KEY);
const persist = () => saveMap(STORE_KEY, store);

/** Demo agent seeded as already Published with a live outbound channel, so the
 * published-automation state can be reviewed without publishing it manually first.
 * Seeded once per session — unpublishing it during the session is not undone on reload. */
const AUTO_PUBLISHED_SEED: Record<string, AgentPublishState> = {
  "shipping-alerts": { placement: "automation", channels: ["slack"], version: BASELINE_VERSION },
  // Live Workspace Agents that also have governance history (governanceStore seed) — their
  // live version/audience/channels match the approved requests there, so the Builder pill,
  // Deploy tab and review page all tell the same story.
  faq: { placement: "workspace", audience: "org", channels: ["web"], version: "v1.1.0", scopeSummary: "Toàn công ty" },
  // External Agents that are live (externalAgentStore seed) — same publish model as Agents.
  "ext-seed-1": { placement: "workspace", audience: "org", channels: ["web", "api"], version: "v1.0.2", scopeSummary: "Toàn công ty" },
  "ext-seed-2": { placement: "workspace", audience: "org", channels: ["web"], version: "v1.1.0", scopeSummary: "Phòng Nhân sự (36 người)" },
  // Live for a Nhóm cộng tác approved with 4 members; the group has since grown to 6 (see
  // collabGroupStore seed) → the recheck opens a re-approval request for the 2 new members.
  cskh: { placement: "workspace", audience: "group", channels: ["web", "zalo"], version: "v2.0.0", scopeSummary: "Nhóm cộng tác \"Platform squad\" (4 người)", groupId: "grp-platform-squad", groupMemberIds: ["m-plat-1", "m-plat-2", "m-plat-3", "m-plat-4"] },
  "sales-quote": { placement: "workspace", audience: "org", channels: [], version: "v1.0.0", scopeSummary: "Phòng Kinh doanh (48 người)" },
  ops: { placement: "workspace", audience: "org", channels: ["web", "api"], version: "v1.3.0", scopeSummary: "FPT Smart Cloud (35 người)" },
  "finance-check": { placement: "workspace", audience: "org", channels: ["slack"], version: "v1.2.0", scopeSummary: "Phòng Tài chính (14 người)" },
  "legal-review": { placement: "workspace", audience: "org", channels: ["slack"], version: "v1.1.0", scopeSummary: "Ban Pháp chế (14 người)" },
};

function seedAgent(agentId: string) {
  if (seededAgents.has(agentId)) return;
  seededAgents.add(agentId);
  saveSet(SEEDED_KEY, seededAgents);
  const seed = AUTO_PUBLISHED_SEED[agentId];
  if (!seed) return;
  store.set(agentId, seed);
  persist();
  const rel = SEED_RELEASES[agentId];
  if (rel) {
    const base = Date.now() - (rel.length + 1) * 9 * DAY_MS;
    releaseLog.set(agentId, rel.map((r, i) => ({ ...r, at: base + i * 9 * DAY_MS })));
    persistReleases();
  }
}

export const agentPublishStore = {
  get(agentId: string): AgentPublishState {
    seedAgent(agentId);
    const s = store.get(agentId);
    if (!s) return { placement: null, audience: undefined, channels: [], version: BASELINE_VERSION };
    // Defend against sessionStorage from an earlier build that predates a field — e.g. `version`
    // added after some sessions had already persisted state without it.
    return {
      placement: s.placement, audience: s.audience, channels: s.channels ?? [], version: s.version ?? BASELINE_VERSION,
      scopeSummary: s.scopeSummary, groupId: s.groupId, groupMemberIds: s.groupMemberIds, needsRegovernance: s.needsRegovernance,
    };
  },
  publish(agentId: string, placement: Placement, channels: string[], version: string, audience?: PublishAudience, extra?: { scopeSummary?: string; groupId?: string; groupMemberIds?: string[]; via?: ReleaseEntry["via"]; byName?: string }) {
    seedAgent(agentId);
    const cur = store.get(agentId);
    const next: AgentPublishState = {
      placement, audience: audience ?? cur?.audience, channels, version,
      scopeSummary: extra && "scopeSummary" in extra ? extra.scopeSummary : cur?.scopeSummary,
      groupId: extra && "groupId" in extra ? extra.groupId : cur?.groupId,
      groupMemberIds: extra && "groupMemberIds" in extra ? extra.groupMemberIds : (audience === "group" || (!audience && cur?.audience === "group") ? cur?.groupMemberIds : undefined),
      needsRegovernance: undefined,
    };
    store.set(agentId, next);
    persist();
    if (placement !== null) {
      const log = (releaseLog.get(agentId) ?? []).filter(e => e.version !== version);
      log.push({ version, at: Date.now(), audience: next.audience, scopeSummary: next.scopeSummary, groupId: next.groupId, groupMemberIds: next.groupMemberIds, channels: [...channels], via: extra?.via ?? "direct", byName: extra?.byName });
      releaseLog.set(agentId, log);
      persistReleases();
    }
  },
  /** Every version that has been live for this Agent, oldest first. */
  releases(agentId: string): ReleaseEntry[] {
    seedAgent(agentId);
    return [...(releaseLog.get(agentId) ?? [])].sort((a, b) => a.at - b.at);
  },
  /** Toggles a channel's live/not-connected state on the currently-serving version,
   * without treating it as a new release. */
  setChannels(agentId: string, channels: string[]) {
    seedAgent(agentId);
    const cur = this.get(agentId);
    store.set(agentId, { ...cur, channels });
    persist();
  },
  unpublish(agentId: string) {
    seedAgent(agentId);
    const cur = this.get(agentId);
    store.set(agentId, { ...cur, placement: null, channels: [] });
    persist();
  },
  isPublished(agentId: string): boolean {
    seedAgent(agentId);
    const s = store.get(agentId);
    return !!s && s.placement !== null;
  },
  /** Called by collabGroupStore's continuous overlap recheck — pulls a live "group" Agent back
   * out of service (mirrors what an approved request's `revoke` does) and flags why, so the
   * Agent's own page can explain it plainly instead of it just silently stopping. */
  flagNeedsRegovernance(agentId: string, flag: { reason: string; unitName: string; overlapPct: number; at: number }) {
    seedAgent(agentId);
    const cur = this.get(agentId);
    store.set(agentId, { ...cur, placement: null, channels: [], needsRegovernance: flag });
    persist();
  },
  clearRegovernanceFlag(agentId: string) {
    seedAgent(agentId);
    const cur = this.get(agentId);
    if (!cur.needsRegovernance) return;
    store.set(agentId, { ...cur, needsRegovernance: undefined });
    persist();
  },
};

/** Deterministic mock install count for a Workspace-published agent — this prototype has
 * no real install data, so derive a stable, non-zero small number from the agentId, the
 * same way other mock counts are derived elsewhere in this app. */
export function mockInstallCount(agentId: string): number {
  let h = 0;
  for (const c of agentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 8) + 1;
}

export const TRIGGER_BLOCKED_BY_PERSONAL_CONNECTOR_REASON = (connectorName: string) =>
  `Agent đang dùng kết nối riêng của từng người (${connectorName}). Trigger chạy nền khi không có ai đăng nhập nên không dùng được kết nối này. Mỗi người vẫn có thể tự đặt trigger cho bản agent họ cài trong Workspace.`;
export const CONNECTOR_BLOCKED_BY_TRIGGER_REASON = () =>
  "Agent đang có Trigger nên chỉ dùng được kết nối Dùng chung.";
export const CONNECTOR_BLOCKED_BY_TRIGGER_TOAST = (n: number) =>
  `Agent đang có ${n} trigger nên phải dùng kết nối Dùng chung. Xoá hết trigger nếu muốn chuyển sang kết nối Riêng cá nhân.`;
