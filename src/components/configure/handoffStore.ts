// "Chuyển cho nhân viên" (human handoff) — BRD "Kết nối AI Agent – Contact Center (EOS/Omni)".
// Per agent: the capability switch (Dựng agent › Năng lực), the Contact Center connection, and
// which external channels hand conversations over. sessionStorage-backed, no backend: connecting,
// conversation counts and the handoff report are simulated.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { getAgent } from "./agentStore";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";

export type ContactCenterId = "eos" | "genesys" | "zendesk";
export const CONTACT_CENTERS: { id: ContactCenterId; name: string; sub: string; available: boolean }[] = [
  { id: "eos", name: "EOS Contact Center", sub: "Omni-channel CSKH của FPT", available: true },
  { id: "genesys", name: "Genesys Cloud", sub: "Chưa kết nối", available: false },
  { id: "zendesk", name: "Zendesk", sub: "Chưa khả dụng", available: false },
];

/** Channels listed in the Contact Center panel. Only external ones can hand off (BR-07). */
export const HANDOFF_CHANNELS: { id: string; name: string; kind: "external" | "internal" | "unavailable" }[] = [
  { id: "web", name: "Web widget", kind: "external" },
  { id: "zalo", name: "Zalo", kind: "external" },
  { id: "fptchat", name: "FPT Chat", kind: "external" },
  { id: "messenger", name: "Messenger", kind: "unavailable" },
  { id: "workspace", name: "Agent Workspace", kind: "internal" },
];
export const channelName = (id: string) => HANDOFF_CHANNELS.find(c => c.id === id)?.name ?? id;

export interface CcConnection {
  provider: ContactCenterId;
  org: string;
  /** The signed-in user's EOS login the link comes from. */
  account: string;
  /** "error" = token revoked (401) or disconnected from the Contact Center side (BR-08). */
  status: "connected" | "error";
  errorReason?: string;
}

/** EOS Contact Center accounts of the demo users. A user who has one is linked automatically on
 * sign-in — there is no separate "Kết nối" step; a user without one can't turn handoff on. */
const EOS_ACCOUNTS: Record<string, { org: string; login: string }> = {
  "m-fsoft-ceo": { org: "cskh-fpt.eos.vn", login: "tran.nam@fpt.com" },
};
export const eosAccount = (userId: string = CURRENT_USER.id) => EOS_ACCOUNTS[userId] ?? null;

interface AgentHandoff {
  capability: boolean;
  /** Set while the EOS link is broken (demo of UC-05); cleared by "Thử lại". */
  error?: string;
  /** channelId -> provider it hands off to (one Contact Center per channel, BR-03). */
  channels: Record<string, ContactCenterId>;
}

const KEY = "agent_handoff_v1";
const store = loadMap<string, AgentHandoff>(KEY);
const persist = () => saveMap(KEY, store);
const get = (agentId: string): AgentHandoff => store.get(agentId) ?? { capability: false, channels: {} };
const put = (agentId: string, v: AgentHandoff) => { store.set(agentId, v); persist(); };

/** Short agent name for inbox labels: "Mai – Trợ lý CSKH" -> "Mai". */
export function agentShortName(agentId: string): string {
  return getAgent(agentId).name.split(/\s[-–]\s/)[0].trim();
}

// Deterministic mock numbers so the screen doesn't flicker between renders.
function seedNum(s: string, mod: number): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % mod;
}

export const handoffStore = {
  get,
  capabilityOn: (agentId: string) => get(agentId).capability,
  setCapability(agentId: string, on: boolean) { put(agentId, { ...get(agentId), capability: on }); },

  /** Derived from the signed-in user's EOS account — null when they don't have one. */
  connection(agentId: string): CcConnection | null {
    const acc = eosAccount();
    if (!acc) return null;
    const err = get(agentId).error;
    return { provider: "eos", org: acc.org, account: acc.login, status: err ? "error" : "connected", errorReason: err };
  },
  /** Demo of UC-05: token revoked or disconnected from the Contact Center side. */
  simulateError(agentId: string, reason = "Token bị thu hồi (401)") { put(agentId, { ...get(agentId), error: reason }); },
  retry(agentId: string) { const cur = get(agentId); delete cur.error; put(agentId, { ...cur }); },

  channelOn: (agentId: string, channelId: string) => !!get(agentId).channels[channelId],
  setChannel(agentId: string, channelId: string, on: boolean) {
    const cur = get(agentId);
    const channels = { ...cur.channels };
    if (on && eosAccount()) channels[channelId] = "eos"; else delete channels[channelId];
    put(agentId, { ...cur, channels });
  },
  activeChannels: (agentId: string) => Object.keys(get(agentId).channels),
  /** Handoff only runs when the capability is on, the connection is healthy and the channel is on. */
  isWorking(agentId: string) {
    const h = get(agentId);
    return h.capability && !!eosAccount() && !h.error && Object.keys(h.channels).length > 0;
  },
  /** BR-01: capability off while channels still have handoff on -> warn at Publish. */
  publishWarning(agentId: string): string[] {
    const h = get(agentId);
    return !h.capability ? Object.keys(h.channels).map(channelName) : [];
  },

  inboxName: (agentId: string, channelId: string) => `${channelName(channelId)} – ${agentShortName(agentId)}`,
  /** Conversations currently with a human agent on this channel (simulated). */
  withStaff: (agentId: string, channelId: string) => (handoffStore.channelOn(agentId, channelId) ? seedNum(agentId + channelId, 6) : 0),
  /** Last-7-days handoff report (simulated): volume, reasons, outcomes (BR-09). */
  report(agentId: string) {
    const active = Object.keys(get(agentId).channels);
    const total = active.reduce((s, c) => s + 8 + seedNum(agentId + c + "r", 30), 0);
    const failed = active.length ? seedNum(agentId + "f", 3) : 0;
    const resolved = Math.round((total - failed) * 0.78);
    return {
      total,
      resolved,
      returned: total - failed - resolved,
      failed,
      reasons: total ? [
        { label: "Khách yêu cầu gặp nhân viên", pct: 46 },
        { label: "Ngoài khả năng của Nhân sự số", pct: 38 },
        { label: "Khiếu nại cần xác minh", pct: 16 },
      ] : [],
    };
  },
};
