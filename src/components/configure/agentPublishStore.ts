// In-memory per-agent publish state. An agent is published to exactly one placement —
// Workspace (people install it and chat with it) or Automation (it runs unattended for
// the whole org, driven by Console triggers) — plus an independent set of external
// channels available to either placement (their meaning differs: inbound for Workspace,
// outbound for Automation). Kind (agentKindStore.ts) is derived from trigger count, not
// stored here, so removing the last trigger instantly reopens the Workspace placement.
export type Placement = "workspace" | "automation" | null;

export interface AgentPublishState {
  placement: Placement;
  channels: string[];
}

const store = new Map<string, AgentPublishState>();

export const agentPublishStore = {
  get(agentId: string): AgentPublishState {
    return store.get(agentId) ?? { placement: null, channels: [] };
  },
  publish(agentId: string, placement: Placement, channels: string[]) {
    store.set(agentId, { placement, channels });
  },
  unpublish(agentId: string) {
    store.set(agentId, { placement: null, channels: [] });
  },
  isPublished(agentId: string): boolean {
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
