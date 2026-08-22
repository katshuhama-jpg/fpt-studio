// In-memory per-agent "kind" store — chosen once at creation time (R1), never inferred.
// A Conversational Agent is human-triggered and publishable; an Automation Agent runs
// unattended off Console triggers and is never published. Kind is immutable once the
// agent leaves DRAFT (see isAgentDraft below).
import { agentPublishStore } from "./agentPublishStore";
import { automationStore } from "./automationStore";

export type AgentKind = "conversational" | "automation";

/** Demo seed data for the pre-existing agents in AgentsList.tsx — this is the single
 * source of truth for their kind, read by both the list and the builder header/sidebar. */
const store = new Map<string, AgentKind>([
  ["cskh", "conversational"],
  ["hr", "conversational"],
  ["faq", "conversational"],
  ["sales", "conversational"],
  ["ops", "conversational"],
  ["nightly-report", "automation"],
  ["invoice-reminder", "automation"],
]);

export const agentKindStore = {
  get(agentId: string): AgentKind {
    return store.get(agentId) ?? "conversational";
  },
  set(agentId: string, kind: AgentKind) {
    store.set(agentId, kind);
  },
};

// Demo variety: one automation agent already running, one still draft.
automationStore.activate("nightly-report");

/** An agent is DRAFT until it has actually gone live — published (conversational) or
 * activated (automation). Only while DRAFT can its kind still be changed. */
export function isAgentDraft(agentId: string, kind: AgentKind): boolean {
  return kind === "automation"
    ? !automationStore.isActivated(agentId)
    : !agentPublishStore.isPublished(agentId);
}
