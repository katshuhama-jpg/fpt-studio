// In-memory per-agent connector attachment store — tracks whether each connector
// an agent uses is a shared (organization) account or a personal (per-user) one.
export type ConnectorScope = "shared" | "personal";

export interface AgentConnector {
  connectorId: string;
  scope: ConnectorScope;
}

const store = new Map<string, AgentConnector[]>();

export const agentConnectorStore = {
  list(agentId: string): AgentConnector[] {
    return store.get(agentId) ?? [];
  },
  add(agentId: string, connectorId: string, scope: ConnectorScope) {
    const list = store.get(agentId) ?? [];
    store.set(agentId, [...list.filter(c => c.connectorId !== connectorId), { connectorId, scope }]);
  },
  remove(agentId: string, connectorId: string) {
    const list = store.get(agentId);
    if (!list) return;
    store.set(agentId, list.filter(c => c.connectorId !== connectorId));
  },
  hasPersonalConnector(agentId: string): boolean {
    return (store.get(agentId) ?? []).some(c => c.scope === "personal");
  },
};
