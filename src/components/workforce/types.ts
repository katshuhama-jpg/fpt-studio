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

export type HumanTaskKind = "approve" | "do" | "notify";

export interface PersonNodeData {
  kind: "person";
  memberId: string | null;
  /** What kind of handoff this is (S-gap-5, generalizing this into a real Human Task node,
   * matching the Human-in-the-loop node every benchmarked competitor has — Dify's Human Input,
   * Stack AI's dedicated HITL node, n8n's Wait node, Copilot Studio's approval flows):
   * - "approve" — the person must Approve or Reject; route a Condition out of this node on a
   *   rule matching the synthetic `outcome` variable ("approve" / "reject") to branch on it,
   *   reusing the existing Condition rule system rather than a new branching primitive.
   * - "do" — a task assigned to be completed; the flow continues once done (one route out,
   *   same shape as an Agent node continuing to a destination).
   * - "notify" — fire-and-forget, no response expected; terminal, same as every Person node
   *   was before this field existed (the default for any node predating it). */
  taskKind: HumanTaskKind;
  /** Minutes before this task is considered overdue. Null = no SLA tracked. */
  slaMinutes: number | null;
  /** Who gets this task if the SLA elapses with no response. Null = no automatic escalation
   * (just flagged overdue). Ignored when `slaMinutes` is null. */
  escalation: { memberId: string } | null;
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

export type ToolRefSource = "builtin" | "connector";

export interface ToolNodeData {
  kind: "tool";
  /** What this node documents — an installed Tool Store plugin (`source: "builtin"`, `id` is a
   * builtinCatalog setId from tool-builder/types.ts) or a Connector/Integration app (`source:
   * "connector"`, `id` is a CATALOG id from configure/ConnectionsTab.tsx) — the same two
   * catalogs ("Your Tools" and "Integrations") Relevance AI's own Workforce "Add tool" panel
   * pulls from (S-gap-4). Null until picked via the drawer.
   *
   * Unlike Agent/Omni/Person/Condition, a Tool node documents a capability available to this
   * Workforce rather than a step in the routing graph — it has no Handles at all (same reason
   * Note has none) and never appears in a route. */
  ref: { source: ToolRefSource; id: string } | null;
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

export type WorkforceNodeData = AgentNodeData | OmniNodeData | PersonNodeData | ConditionNodeData | NoteNodeData | TriggerNodeData | ToolNodeData;
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
