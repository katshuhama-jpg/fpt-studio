import type { Node, Edge } from "reactflow";

export type ConditionType = "llm" | "rule";
export type RuleMatch = "all" | "any";

export interface ConditionRule {
  id: string;
  variable: string;
  operator: string;
  value: string;
}

export interface AgentNodeData {
  kind: "agent";
  agentId: string;
  /** "Giữ ngữ cảnh hội thoại" — only meaningful when this node is acting as a route
   * destination, but stored on the node itself so the setting is shared between the node's
   * own drawer and the Condition drawer of any route that hands off to it (S6 + S8). */
  keepContext: boolean;
}

export interface OmniNodeData {
  kind: "omni";
  reasonDefault: string;
}

export interface PersonNodeData {
  kind: "person";
  memberId: string | null;
}

export interface ConditionNodeData {
  kind: "condition";
  type: ConditionType;
  llmText: string;
  ruleMatch: RuleMatch;
  rules: ConditionRule[];
  /** Non-persisted, computed at publish-validation time and stamped onto the node for
   * rendering the red "invalid" outline (S11). */
  invalid?: boolean;
}

export interface NoteNodeData {
  kind: "note";
  text: string;
}

export interface TriggerNodeData {
  kind: "trigger";
  /** Id into triggerStore (configure/triggerStore.ts) — the real, Agent-scoped trigger this node
   * fires. Null until the user picks or creates one via the drawer. Deliberately does NOT store
   * its own free-text label/description (S-gap-3 fix) — those are display-only derived from the
   * real TriggerRecord, the same record shown on the Agent Builder's own Triggers tab, so a
   * Workforce Trigger and an Agent-level Trigger can never drift apart the way the old
   * free-text fields could. Which Agent this trigger is scoped to is NOT stored here either — a
   * Trigger node always connects straight to exactly one Agent node (see isValidConnection in
   * Canvas.tsx), so that Agent's id is looked up live from the canvas edges each render (see
   * `triggerAgentIds` in nodeActionsContext.ts) rather than duplicated and risking going stale
   * if the connection is rewired. */
  triggerId: string | null;
}

export type WorkforceNodeData = AgentNodeData | OmniNodeData | PersonNodeData | ConditionNodeData | NoteNodeData | TriggerNodeData;
export type WorkforceNode = Node<WorkforceNodeData>;
export type WorkforceEdge = Edge;

export type WorkforceStatus = "draft" | "published";

export interface Workforce {
  id: string;
  name: string;
  status: WorkforceStatus;
  nodes: WorkforceNode[];
  edges: WorkforceEdge[];
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

export function newConditionRule(): ConditionRule {
  return { id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, variable: "", operator: "bằng", value: "" };
}

export function isConditionInvalid(data: ConditionNodeData): boolean {
  if (data.type === "llm") return data.llmText.trim().length === 0;
  return data.rules.length === 0 || data.rules.some(r => !r.variable.trim() || !r.value.trim());
}
