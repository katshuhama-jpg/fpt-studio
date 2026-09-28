import { Link, useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
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

/** Banner shown on a resource detail page reached only through an Agent's context. */
export function AgentContextBanner({ agent, ownerName, noun, canEdit }: { agent: AgentRecord; ownerName?: string; noun: string; canEdit?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm">
      <Eye size={15} className="shrink-0 mt-0.5 text-primary" aria-hidden />
      <p className="text-foreground leading-relaxed">
        Bạn truy cập {noun} này vì nó được dùng trong Agent{" "}
        <Link to={`/agents/${agent.id}?tab=build`} className="font-medium text-primary hover:underline">{agent.name}</Link>.
        {canEdit
          ? " Role của bạn cho phép chỉnh sửa, nhưng chỉ chủ sở hữu mới chia sẻ hoặc xóa được."
          : ` Role của bạn chỉ cho phép xem.${ownerName ? ` Liên hệ ${ownerName} nếu cần chỉnh sửa.` : ""}`}
      </p>
    </div>
  );
}
