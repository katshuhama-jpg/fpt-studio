// sessionStorage-backed per-agent governance level for each connector ACTION — the "Auto / Ask /
// Block" step shown right after an agent connects a connector. Scoped per agent+connector
// because two agents on the same Shared account can still be trusted differently: a support bot
// may send mail automatically while a sales bot has to ask first.
import { loadMap, saveMap } from "@/lib/sessionPersist";

export type ActionPermission = "auto" | "ask" | "block";

export const ACTION_PERMISSION_LABEL: Record<ActionPermission, string> = {
  auto: "Auto",
  ask: "Ask",
  block: "Block",
};

/** Mock action catalogue — a real build reads this from the connector's MCP manifest. */
const CONNECTOR_ACTIONS: Record<string, string[]> = {
  gmail: ["Read emails", "Send email", "Draft email", "Mark as read", "Archive email", "Apply label"],
  drive: ["List files", "Read file", "Upload file", "Create folder", "Share file"],
  sheets: ["Read sheet", "Append row", "Update cell", "Create spreadsheet"],
  slack: ["Read messages", "Send message", "Create channel", "Invite member"],
  notion: ["Read page", "Create page", "Update page", "Search workspace"],
  hubspot: ["Read contact", "Create contact", "Update deal", "Log activity"],
  github: ["Read repository", "Create issue", "Comment on pull request", "Merge pull request"],
  exa: ["Search the web", "Fetch page contents"],
};

const FALLBACK_ACTIONS = ["Read data", "Create record", "Update record", "Delete record"];

export function actionsForConnector(connectorId: string): string[] {
  return CONNECTOR_ACTIONS[connectorId] ?? FALLBACK_ACTIONS;
}

const STORE_KEY = "connector_action_permissions_v1";
const store = loadMap<string, ActionPermission>(STORE_KEY);
const k = (agentId: string, connectorId: string, action: string) => `${agentId}:${connectorId}:${action}`;
const persist = () => saveMap(STORE_KEY, store);

/** Everything starts on Auto so a freshly connected connector actually works; the reviewer then
 * dials individual actions down to Ask or Block. Only non-default choices are stored, so an
 * untouched connector costs nothing and new actions added later inherit Auto. */
export const DEFAULT_ACTION_PERMISSION: ActionPermission = "auto";

export const connectorActionStore = {
  get(agentId: string, connectorId: string, action: string): ActionPermission {
    return store.get(k(agentId, connectorId, action)) ?? DEFAULT_ACTION_PERMISSION;
  },
  set(agentId: string, connectorId: string, action: string, value: ActionPermission) {
    if (value === DEFAULT_ACTION_PERMISSION) store.delete(k(agentId, connectorId, action));
    else store.set(k(agentId, connectorId, action), value);
    persist();
  },
  /** Every action for this connector with its current level — drives the permissions step. */
  listFor(agentId: string, connectorId: string): { action: string; permission: ActionPermission }[] {
    return actionsForConnector(connectorId).map(action => ({
      action,
      permission: this.get(agentId, connectorId, action),
    }));
  },
  /** How many actions are NOT on Auto — shown as a summary next to a connected connector. */
  restrictedCount(agentId: string, connectorId: string): number {
    return this.listFor(agentId, connectorId).filter(a => a.permission !== "auto").length;
  },
  /** Drops this agent's overrides when the connector is detached, so re-adding it later starts
   * from the defaults instead of inheriting decisions the user can no longer see. */
  clear(agentId: string, connectorId: string) {
    for (const action of actionsForConnector(connectorId)) store.delete(k(agentId, connectorId, action));
    persist();
  },
};
