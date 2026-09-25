// Reverse-reference lookup for a standalone Resource (Knowledge/Skill/Guardrail/Connector): which
// Agents currently reference it, and whether each of those Agents is actually live. This is the
// "blast radius" a Tenant Admin needs before approving a Resource into the shared Tenant Library —
// every builder-owned resource store already tracks `attachedByAgentIds` for its own delete-warning
// UI, so this just resolves those ids to display info instead of introducing a new data model.
import { getAgent } from "../configure/agentStore";
import { knowledgeBaseStore } from "@/components/knowledge/knowledgeBaseStore";
import { skillStore } from "../configure/skillStore";
import { guardrailConsoleStore } from "../configure/guardrailConsoleStore";
import { customConnectorStore } from "../configure/customConnectorStore";
import type { GovResourceType } from "./governanceStore";

export interface AgentUsageRef {
  agentId: string;
  name: string;
  emoji: string;
  /** "Published" means this Agent has actually cleared its own governance and is live for real
   * users right now — not just that a Builder has wired the resource in locally. This is the
   * number that matters for blast radius: a Draft agent using this resource is zero-risk today. */
  status: "Published" | "Draft";
}

function attachedAgentIds(type: Exclude<GovResourceType, "agent">, id: string): string[] {
  switch (type) {
    case "knowledge": return knowledgeBaseStore.get(id)?.attachedByAgentIds ?? [];
    case "skill": return skillStore.get(id)?.attachedByAgentIds ?? [];
    case "guardrail": return guardrailConsoleStore.get(id)?.attachedByAgentIds ?? [];
    case "connector": return customConnectorStore.get(id)?.attachedByAgentIds ?? [];
  }
}

/** Every Agent currently wired to this resource, for the "Đang được sử dụng bởi" section on a
 * Resource's Request Detail page. Purely informational — same as the Agent side's read-only
 * "Thành phần Agent này sử dụng" list — never gates the Tenant Admin's approve/reject decision,
 * it just tells them what happens downstream either way. */
export function listResourceUsage(type: Exclude<GovResourceType, "agent">, id: string): AgentUsageRef[] {
  return attachedAgentIds(type, id).map(agentId => {
    const a = getAgent(agentId);
    return { agentId, name: a.name, emoji: a.emoji, status: a.status };
  });
}
