// Single source of truth for the trigger <-> per-user-connector mutual-exclusion invariant:
// an agent can never have both >=1 Console trigger (any status — ACTIVE, PAUSED, or
// NEEDS_SETUP all count) and a per-user connection at the same time. Every screen that
// gates trigger creation or connector-scope selection — and the two stores' own write-time
// backstops — must call these two functions rather than recomputing the condition locally.
// Recomputing it per-component is exactly how earlier rounds ended up with entry points that
// silently fell out of sync (e.g. a stale closure caching the answer from an earlier render).
import { triggerStore } from "./triggerStore";
import { agentConnectorStore, type AgentConnector } from "./agentConnectorStore";

/** True if the agent has any trigger at all, regardless of status. */
export function hasTriggers(agentId: string): boolean {
  return triggerStore.list(agentId).length > 0;
}

/** The agent's first per-user connector, or null if every connection is shared. */
export function perUserConnector(agentId: string): AgentConnector | null {
  return agentConnectorStore.list(agentId).find(c => c.scope === "personal") ?? null;
}
