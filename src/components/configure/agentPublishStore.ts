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
  /** Set by collabGroupStore.recheckGroupPublishes when a live "group" Agent's roster overlap
   * has crossed the anti-bypass threshold since it was last approved — the Agent has been
   * pulled back to pending review (see that function) and this flags why, for the banner on
   * the Agent's own page. Cleared on the request's next approval. */
  needsRegovernance?: { reason: string; unitName: string; overlapPct: number; at: number };
}

const STORE_KEY = "agent_publish_store";
const SEEDED_KEY = "agent_publish_store_seeded";
const store = loadMap<string, AgentPublishState>(STORE_KEY);
const seededAgents = loadSet<string>(SEEDED_KEY);
const persist = () => saveMap(STORE_KEY, store);

/** Demo agent seeded as already Published with a live outbound channel, so the
 * published-automation state can be reviewed without publishing it manually first.
 * Seeded once per session — unpublishing it during the session is not undone on reload. */
const AUTO_PUBLISHED_SEED: Record<string, AgentPublishState> = {
  "shipping-alerts": { placement: "automation", channels: ["slack"], version: BASELINE_VERSION },
};

function seedAgent(agentId: string) {
  if (seededAgents.has(agentId)) return;
  seededAgents.add(agentId);
  saveSet(SEEDED_KEY, seededAgents);
  const seed = AUTO_PUBLISHED_SEED[agentId];
  if (!seed) return;
  store.set(agentId, seed);
  persist();
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
      scopeSummary: s.scopeSummary, groupId: s.groupId, needsRegovernance: s.needsRegovernance,
    };
  },
  publish(agentId: string, placement: Placement, channels: string[], version: string, audience?: PublishAudience, extra?: { scopeSummary?: string; groupId?: string }) {
    seedAgent(agentId);
    const cur = store.get(agentId);
    store.set(agentId, {
      placement, audience: audience ?? cur?.audience, channels, version,
      scopeSummary: extra ? extra.scopeSummary : cur?.scopeSummary,
      groupId: extra ? extra.groupId : cur?.groupId,
      needsRegovernance: undefined,
    });
    persist();
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
