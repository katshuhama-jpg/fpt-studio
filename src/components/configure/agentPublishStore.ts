// sessionStorage-backed per-agent publish state. An agent is published to exactly one
// placement — Workspace (people install it and chat with it) or Automation (it runs
// unattended for the whole org, driven by Console triggers) — plus an independent set of
// external channels available to either placement (their meaning differs: inbound for
// Workspace, outbound for Automation). Kind (agentKindStore.ts) is derived from trigger
// count, not stored here, so removing the last trigger instantly reopens the Workspace
// placement. Mutations survive a page reload and client-side navigation within the session.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";

export type Placement = "workspace" | "automation" | null;

export const BASELINE_VERSION = "v1.0.1";

export interface AgentPublishState {
  placement: Placement;
  channels: string[];
  /** The version currently live. Stays at BASELINE_VERSION until the agent is actually
   * published; unpublishing doesn't reset it, so a later republish keeps counting up. */
  version: string;
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
    if (!s) return { placement: null, channels: [], version: BASELINE_VERSION };
    // Defend against sessionStorage from an earlier build that predates a field — e.g. `version`
    // added after some sessions had already persisted state without it.
    return { placement: s.placement, channels: s.channels ?? [], version: s.version ?? BASELINE_VERSION };
  },
  publish(agentId: string, placement: Placement, channels: string[], version: string) {
    seedAgent(agentId);
    store.set(agentId, { placement, channels, version });
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
};

/** Deterministic mock install count for a Workspace-published agent — this prototype has
 * no real install data, so derive a stable, non-zero small number from the agentId, the
 * same way other mock counts are derived elsewhere in this app. */
export function mockInstallCount(agentId: string): number {
  let h = 0;
  for (const c of agentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 8) + 1;
}

export const WORKSPACE_BLOCKED_BY_TRIGGER_REASON = (n: number) =>
  `This agent already has ${n} trigger${n === 1 ? "" : "s"} set up in Console, so it runs organization-wide in Automation mode. To let people install it to Workspace and set up their own triggers instead, remove the triggers in Console first.`;
export const AUTOMATION_BLOCKED_BY_NO_TRIGGER_REASON =
  "Add at least one trigger to use this mode.";
export const TRIGGER_BLOCKED_BY_PERSONAL_CONNECTOR_REASON = (connectorName: string) =>
  `Agent đang dùng kết nối riêng của từng người (${connectorName}). Trigger chạy nền khi không có ai đăng nhập nên không dùng được kết nối này. Mỗi người vẫn có thể tự đặt trigger cho bản agent họ cài trong Workspace.`;
export const CONNECTOR_BLOCKED_BY_TRIGGER_REASON = (n: number) =>
  `Agent đang có ${n} trigger nên chạy ở chế độ Automation cho cả tổ chức. Kết nối riêng của từng người cần có người đăng nhập.`;
export const CONNECTOR_BLOCKED_BY_TRIGGER_TOAST = (n: number) =>
  `Agent đang có ${n} trigger nên phải dùng kết nối dùng chung. Xoá hết trigger nếu muốn chuyển sang kết nối riêng của từng người.`;
