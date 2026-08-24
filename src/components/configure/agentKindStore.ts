// Agent kind is DERIVED, read-only — never chosen or stored. An agent with >=1 Console
// trigger runs unattended for the whole organization ("automation"); with none, a human
// talks to it directly ("conversational"). This is a live computation, so adding or
// removing the last trigger instantly flips the kind everywhere it's read.
import { triggerStore } from "./triggerStore";
import { agentPublishStore } from "./agentPublishStore";

export type AgentKind = "conversational" | "automation";

export function getAgentKind(agentId: string): AgentKind {
  return triggerStore.list(agentId).length > 0 ? "automation" : "conversational";
}

export function isAgentDraft(agentId: string): boolean {
  return !agentPublishStore.isPublished(agentId);
}

/** Tracks whether the Builder has already seen the one-time "this agent just became
 * Automation" heads-up, so it never fires again for the same agent. */
const seenAutomationHeadsUp = new Set<string>();
export const automationHeadsUpStore = {
  hasSeen(agentId: string): boolean {
    return seenAutomationHeadsUp.has(agentId);
  },
  markSeen(agentId: string) {
    seenAutomationHeadsUp.add(agentId);
  },
};
