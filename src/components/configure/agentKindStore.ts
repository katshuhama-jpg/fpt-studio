// Agent kind is DERIVED, read-only — never chosen or stored. An agent with >=1 Console
// trigger runs unattended for the whole organization ("automation"); with none, a human
// talks to it directly ("conversational"). This is a live computation, so adding or
// removing the last trigger instantly flips the kind everywhere it's read.
import { agentPublishStore } from "./agentPublishStore";
import { hasTriggers } from "./agentAutomationGuard";

export type AgentKind = "conversational" | "automation";

export function getAgentKind(agentId: string): AgentKind {
  return hasTriggers(agentId) ? "automation" : "conversational";
}

export function isAgentDraft(agentId: string): boolean {
  return !agentPublishStore.isPublished(agentId);
}
