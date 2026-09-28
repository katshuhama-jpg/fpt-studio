import { useSearchParams } from "react-router-dom";
import { getAgent, AGENTS, type AgentRecord } from "@/components/configure/agentStore";
import { useGroupAccess, isOwnedOrShared } from "@/pages/organization/scopeAccess";

/**
 * "Xem trong phạm vi Agent" — product rule for resources attached to an Agent.
 *
 * Sharing a Skill / Guardrail / Connector / Knowledge base only decides who can REUSE it for
 * their own Agents (library access). It never hides the resource from people working on an
 * Agent that already uses it: for anyone who can open Agent A, every resource attached to A
 * counts as inside their "Own & Shared" scope — within that Agent only. What they can then do
 * with it follows their Role's permission for that resource type: "View" to see the details,
 * "Build" to edit it. Sharing and deleting stay with the owner.
 *
 * Detail pages opened from an Agent carry `?viaAgent=<agentId>`; this hook decides whether that
 * context grants read-only access to the resource.
 */
export function useAgentContextAccess(attachedAgentIds: string[] | undefined): {
  agent?: AgentRecord;
  allowed: boolean;
} {
  const [params] = useSearchParams();
  const agentAccess = useGroupAccess("agents");
  const agentId = params.get("viaAgent");
  if (!agentId || !attachedAgentIds?.includes(agentId)) return { allowed: false };
  const record = AGENTS.find(a => a.id === agentId);
  if (!record) return { allowed: false };
  const canOpenAgent = agentAccess.canSeeAll || isOwnedOrShared(record, agentAccess.userId);
  return { agent: getAgent(agentId), allowed: canOpenAgent };
}
