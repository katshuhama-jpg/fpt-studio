// sessionStorage-backed per-agent publish state. An agent is published to exactly one
// placement — Workspace (people install it and chat with it) or Automation (it runs
// unattended for the whole org, driven by Console triggers) — plus an independent set of
// external channels available to either placement (their meaning differs: inbound for
// Workspace, outbound for Automation). Kind (agentKindStore.ts) is derived from trigger
// count, not stored here, so removing the last trigger instantly reopens the Workspace
// placement. Mutations survive a page reload and client-side navigation within the session.
import { loadMap, saveMap, loadSet, saveSet } from "@/lib/sessionPersist";

export type Placement = "workspace" | "automation" | null;

export interface AgentPublishState {
  placement: Placement;
  channels: string[];
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
  "shipping-alerts": { placement: "automation", channels: ["slack"] },
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
    return store.get(agentId) ?? { placement: null, channels: [] };
  },
  publish(agentId: string, placement: Placement, channels: string[]) {
    seedAgent(agentId);
    store.set(agentId, { placement, channels });
    persist();
  },
  unpublish(agentId: string) {
    seedAgent(agentId);
    store.set(agentId, { placement: null, channels: [] });
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
  `This agent uses a per-user connection (${connectorName}). Triggers run in the background with nobody signed in, so there's no personal account to borrow.`;
export const CONNECTOR_BLOCKED_BY_TRIGGER_REASON = (n: number) =>
  `This agent has ${n} background trigger${n === 1 ? "" : "s"} running, so it's in Automation mode for the whole organization. When a trigger fires, there's no signed-in user to borrow an account from.`;

// Warn-then-allow variants: unlike the two reasons above (still used to hard-block the
// compact right-sidebar Connectors/Triggers panels), the main Connections and Triggers
// tabs let the Builder proceed and resolve the conflict by pausing instead.
export const TRIGGER_PERSONAL_CONNECTOR_PAUSE_WARNING = (connectorName: string) =>
  `This agent uses a per-user connection (${connectorName}). Triggers run with nobody signed in, so the new trigger will be created paused — enable it once you've resolved the connection.`;
export const CONNECTOR_TRIGGER_PAUSE_WARNING = (n: number) =>
  `This agent has ${n} active trigger${n === 1 ? "" : "s"}. Switching to a per-user connection will pause ${n === 1 ? "it" : "them"}, since a trigger runs with nobody signed in to borrow an account from.`;
