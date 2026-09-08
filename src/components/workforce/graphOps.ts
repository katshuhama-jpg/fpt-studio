import { MarkerType, type XYPosition } from "reactflow";
import type { WorkforceNode, WorkforceEdge } from "./types";

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** Small arrowhead marking the entry point into the destination — shared by every edge the
 * canvas creates (both the seed data and routes drawn at runtime). */
export const ROUTE_ARROW = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "hsl(var(--border-strong))" };

export function createAgentNode(agentId: string, position: XYPosition, keepContext = true): WorkforceNode {
  return { id: uid("agent"), type: "agent", position, data: { kind: "agent", agentId, keepContext } };
}

export function createOmniNode(position: XYPosition): WorkforceNode {
  return { id: uid("omni"), type: "omni", position, data: { kind: "omni", reasonDefault: "" } };
}

export function createPersonNode(memberId: string, position: XYPosition): WorkforceNode {
  return { id: uid("person"), type: "person", position, data: { kind: "person", memberId } };
}

export function createNoteNode(position: XYPosition): WorkforceNode {
  return { id: uid("note"), type: "note", position, data: { kind: "note", text: "" }, style: { width: 220, height: 140 } };
}

export function createConditionNode(position: XYPosition): WorkforceNode {
  return { id: uid("cond"), type: "condition", position, data: { kind: "condition", type: "llm", llmText: "", ruleMatch: "all", rules: [] } };
}

/** Every completed connection auto-inserts a Condition node between source and destination —
 * this builds that trio (condition node + the two edge halves) for a given source/destination
 * node id pair, positioning the condition node at the midpoint. */
export function createRoute(sourceId: string, destPosition: XYPosition, sourcePosition: XYPosition, destId: string): { condition: WorkforceNode; edges: WorkforceEdge[] } {
  const mid: XYPosition = { x: (sourcePosition.x + destPosition.x) / 2, y: (sourcePosition.y + destPosition.y) / 2 };
  const condition = createConditionNode(mid);
  const edges: WorkforceEdge[] = [
    { id: uid("edge"), source: sourceId, target: condition.id, type: "deletable", markerEnd: ROUTE_ARROW },
    { id: uid("edge"), source: condition.id, target: destId, type: "deletable", markerEnd: ROUTE_ARROW },
  ];
  return { condition, edges };
}

/** Deleting an Agent/Omni/Person/Note node also removes every route touching it — since a
 * route is always [node] -> Condition -> [node], the "other end" of any edge on the deleted
 * node is always a Condition node, which is removed along with its own far edge too. */
export function removeNodeCascade(nodeId: string, nodes: WorkforceNode[], edges: WorkforceEdge[]): { nodes: WorkforceNode[]; edges: WorkforceEdge[] } {
  const nodesToRemove = new Set<string>([nodeId]);
  const edgesToRemove = new Set<string>();
  const touching = edges.filter(e => e.source === nodeId || e.target === nodeId);
  for (const e of touching) {
    edgesToRemove.add(e.id);
    const otherId = e.source === nodeId ? e.target : e.source;
    const otherNode = nodes.find(n => n.id === otherId);
    if (otherNode?.data.kind === "condition") {
      nodesToRemove.add(otherNode.id);
      for (const ce of edges) {
        if ((ce.source === otherNode.id || ce.target === otherNode.id) && ce.id !== e.id) edgesToRemove.add(ce.id);
      }
    }
  }
  return {
    nodes: nodes.filter(n => !nodesToRemove.has(n.id)),
    edges: edges.filter(e => !edgesToRemove.has(e.id)),
  };
}

/** For a Condition node id, finds the route's source node (edge whose target is this
 * Condition) and destination node (edge whose source is this Condition). */
export function getRouteEndpoints(conditionId: string, nodes: WorkforceNode[], edges: WorkforceEdge[]): { source: WorkforceNode | null; destination: WorkforceNode | null } {
  const inEdge = edges.find(e => e.target === conditionId);
  const outEdge = edges.find(e => e.source === conditionId);
  return {
    source: inEdge ? nodes.find(n => n.id === inEdge.source) ?? null : null,
    destination: outEdge ? nodes.find(n => n.id === outEdge.target) ?? null : null,
  };
}

/** True if the given Agent node has at least one route handing off to it (i.e. it is acting
 * as a destination for some route) — used to decide whether its drawer shows the "Giữ ngữ
 * cảnh hội thoại" toggle (source-only Agent nodes have nothing to configure there). */
export function isDestinationNode(nodeId: string, edges: WorkforceEdge[]): boolean {
  return edges.some(e => e.target === nodeId);
}

/** Deleting either half of a route (by edge id) removes the whole route: both edge halves
 * plus the Condition node sitting between them. */
export function removeRouteByEdgeId(edgeId: string, nodes: WorkforceNode[], edges: WorkforceEdge[]): { nodes: WorkforceNode[]; edges: WorkforceEdge[] } {
  const target = edges.find(e => e.id === edgeId);
  if (!target) return { nodes, edges };
  const conditionId = [target.source, target.target].find(id => nodes.find(n => n.id === id)?.data.kind === "condition");
  if (!conditionId) return { nodes, edges: edges.filter(e => e.id !== edgeId) };
  const routeEdgeIds = new Set(edges.filter(e => e.source === conditionId || e.target === conditionId).map(e => e.id));
  return {
    nodes: nodes.filter(n => n.id !== conditionId),
    edges: edges.filter(e => !routeEdgeIds.has(e.id)),
  };
}
