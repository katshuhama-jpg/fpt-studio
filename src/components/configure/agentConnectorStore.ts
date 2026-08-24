// sessionStorage-backed per-agent connector attachment store — tracks whether each
// connector an agent uses is a shared (organization) account or a personal (per-user) one.
// Mutations survive a page reload and client-side navigation within the same session.
import { loadMap, saveMap } from "@/lib/sessionPersist";

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
  add(agentId: string, connectorId: string, scope: ConnectorScope) {
    const list = store.get(agentId) ?? [];
    store.set(agentId, [...list.filter(c => c.connectorId !== connectorId), { connectorId, scope }]);
    persist();
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
