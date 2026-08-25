// sessionStorage-backed per-agent connector attachment store — tracks whether each
// connector an agent uses is a shared (organization) account or a personal (per-user) one.
// Mutations survive a page reload and client-side navigation within the same session.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { hasTriggers } from "./agentAutomationGuard";

export type ConnectorScope = "shared" | "personal";

export interface AgentConnector {
  connectorId: string;
  scope: ConnectorScope;
}

const STORE_KEY = "agent_connector_store";
const store = loadMap<string, AgentConnector[]>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

export const agentConnectorStore = {
  list(agentId: string): AgentConnector[] {
    return store.get(agentId) ?? [];
  },
  /** Returns false (and writes nothing) when saving a per-user connector on an agent that
   * already has a trigger — an agent can never have both, regardless of what any caller's
   * own UI-level check already did. */
  add(agentId: string, connectorId: string, scope: ConnectorScope): boolean {
    if (scope === "personal" && hasTriggers(agentId)) return false;
    const list = store.get(agentId) ?? [];
    store.set(agentId, [...list.filter(c => c.connectorId !== connectorId), { connectorId, scope }]);
    persist();
    return true;
  },
  remove(agentId: string, connectorId: string) {
    const list = store.get(agentId);
    if (!list) return;
    store.set(agentId, list.filter(c => c.connectorId !== connectorId));
    persist();
  },
  hasPersonalConnector(agentId: string): boolean {
    return (store.get(agentId) ?? []).some(c => c.scope === "personal");
  },
};
