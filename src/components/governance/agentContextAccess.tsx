import { Link, useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { getAgent, AGENTS, type AgentRecord } from "@/components/configure/agentStore";
import { useGroupAccess, isOwnedOrShared } from "@/pages/organization/scopeAccess";

/**
 * "Xem trong phạm vi Agent" — product rule for resources attached to an Agent.
 *
 * Sharing a Skill / Guardrail / Connector / Knowledge base only decides who can REUSE it for
 * their own Agents (library access). It never hides the resource from people working on an
 * Agent that already uses it: anyone who can open Agent A can see the name and details of every
 * resource attached to A, read-only, even if it isn't shared with them. Editing, sharing and
 * deleting the resource stay with its owner / people it's shared to with edit access.
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

/** Banner shown on a resource detail page reached only through an Agent's context. */
export function AgentContextBanner({ agent, ownerName, noun }: { agent: AgentRecord; ownerName?: string; noun: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm">
      <Eye size={15} className="shrink-0 mt-0.5 text-primary" aria-hidden />
      <p className="text-foreground leading-relaxed">
        Bạn đang xem {noun} này ở chế độ chỉ xem vì nó được dùng trong Agent{" "}
        <Link to={`/agents/${agent.id}?tab=build`} className="font-medium text-primary hover:underline">{agent.name}</Link>.
        {ownerName ? ` Chỉ ${ownerName} hoặc người được chia sẻ quyền chỉnh sửa mới sửa được.` : ""}
      </p>
    </div>
  );
}
