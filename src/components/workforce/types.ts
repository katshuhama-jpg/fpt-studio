import type { Node, Edge } from "reactflow";

export type ConditionType = "llm" | "rule" | "agent-judgment";
export type RuleMatch = "all" | "any";

export interface ConditionRule {
  id: string;
  variable: string;
  operator: string;
  value: string;
  /** Only meaningful when `variable` isn't one of ConditionDrawer's fixed VARIABLES (a
   * user-typed custom variable, e.g. `discount_percent` sourced from an upstream agent's
   * structured output) — picks numeric operators/input instead of text ones. Ignored for a
   * known variable, whose type is already fixed. Optional so existing saved rules default to
   * the old text behavior. */
  numeric?: boolean;
}

/** Gap: approval was a Person(taskKind: "approve") node needing a downstream Condition to
 * route on a synthetic `outcome` variable that was never actually wired anywhere (Condition's
 * variable list never included it) — a real bug, not just a UX rough edge. Redesigned to match
 * how Relevance AI's own Workforce models it: approval is a property of the CONNECTION
 * (attached here to the Condition node, which already stands in for "the edge" per the
 * [source] -> Condition -> [destination] invariant every route already follows), not a
 * separate node type or a variable to route on. */
export type ApprovalMode = "required" | "agent-decide";

export interface ConditionApproval {
  mode: ApprovalMode;
  /** Org member id (orgData.ts) who must approve. Null = not yet assigned. */
  assigneeId: string | null;
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

export type HumanTaskKind = "do" | "notify";

export interface PersonNodeData {
  kind: "person";
  memberId: string | null;
  /** What kind of handoff this is (S-gap-5, generalizing this into a real Human Task node,
   * matching the Human-in-the-loop node every benchmarked competitor has — Dify's Human Input,
   * Stack AI's dedicated HITL node, n8n's Wait node, Copilot Studio's approval flows):
   * - "do" — a task assigned to be completed; the flow continues once done (one route out,
   *   same shape as an Agent node continuing to a destination).
   * - "notify" — fire-and-forget, no response expected; terminal, same as every Person node
   *   was before this field existed (the default for any node predating it).
   * A third kind, "approve", used to live here — it's gone. Approval moved onto the
   * Condition/edge (see `ConditionApproval` above), matching Relevance AI's model and fixing
   * the unwired `outcome` variable this node type used to require. */
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
  /** For `type: "llm"` this is the required matching criteria. For `type: "agent-judgment"`
   * it's optional free-text guidance for the agent's own reasoning — never required, since the
   * whole point of this type is that there's no fixed criteria to write down. Unused for
   * `type: "rule"`. */
  llmText: string;
  ruleMatch: RuleMatch;
  rules: ConditionRule[];
  /** Non-persisted, computed at publish-validation time and stamped onto the node for
   * rendering the red "invalid" outline (S11). */
  invalid?: boolean;
  /** Null = "Auto Run" (Relevance's term) — the route just fires, no approval gate. Set = a
   * human must weigh in before this route is taken (S-demo gap 1, from the Relevance AI
   * research: approval as a property of the connection, not a separate Person node). */
  approval: ConditionApproval | null;
}

export interface NoteNodeData {
  kind: "note";
  text: string;
}

export interface SubProcessNodeData {
  kind: "subprocess";
  /** Id of another Workforce (workforceStore.ts) to call as a reusable step — never this
   * Workforce's own id (S-gap-6: reusable sub-process, not self-recursion). Unlike Tool/Trigger,
   * this node IS a normal routing step — it has both Handles, like Agent, so the flow can
   * continue after the called Workforce finishes. Null until picked via the drawer. */
  workforceId: string | null;
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

export type WorkforceNodeData = AgentNodeData | OmniNodeData | PersonNodeData | ConditionNodeData | NoteNodeData | TriggerNodeData | ToolNodeData | SubProcessNodeData;
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
  return { id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, variable: "", operator: "bằng", value: "", numeric: false };
}

export function isConditionInvalid(data: ConditionNodeData): boolean {
  if (data.type === "llm") return data.llmText.trim().length === 0;
  // "agent-judgment" is never invalid by design — there's no fixed criteria to require.
  if (data.type === "agent-judgment") return false;
  return data.rules.length === 0 || data.rules.some(r => !r.variable.trim() || !r.value.trim());
}
