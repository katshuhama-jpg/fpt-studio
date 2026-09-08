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
    { id: uid("edge"), source: sourceId, target: condition.id, type: "deletable", markerEnd: ROUTE_ARROW, data: { conditionId: condition.id } },
    { id: uid("edge"), source: condition.id, target: destId, type: "deletable", markerEnd: ROUTE_ARROW, data: { conditionId: condition.id } },
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

/** Deleting a route (by its Condition node id) removes that Condition node plus both edge
 * halves touching it — used whether the delete was triggered from the Condition drawer's own
 * trash icon or from the Condition node's on-canvas hover affordance. */
export function removeRouteByConditionId(conditionId: string, nodes: WorkforceNode[], edges: WorkforceEdge[]): { nodes: WorkforceNode[]; edges: WorkforceEdge[] } {
  const routeEdgeIds = new Set(edges.filter(e => e.source === conditionId || e.target === conditionId).map(e => e.id));
  return {
    nodes: nodes.filter(n => n.id !== conditionId),
    edges: edges.filter(e => !routeEdgeIds.has(e.id)),
  };
}

const ARRANGE_LAYER_X = 320;
const ARRANGE_ROW_Y = 160;
const ARRANGE_ORIGIN: XYPosition = { x: 60, y: 60 };

/** "Tidy layout" — a lightweight left-to-right layered arrangement (longest-path layering,
 * one column per hop from a source node) rather than a full force-directed layout, which is
 * plenty for the shallow source→Condition→destination graphs this canvas produces. Notes have
 * no connections, so they're pulled out and laid out in their own row underneath. */
export function autoArrange(nodes: WorkforceNode[], edges: WorkforceEdge[]): WorkforceNode[] {
  const incoming = new Map<string, string[]>();
  for (const n of nodes) incoming.set(n.id, []);
  for (const e of edges) incoming.get(e.target)?.push(e.source);

  const connectedIds = new Set(nodes.filter(n => edges.some(e => e.source === n.id || e.target === n.id)).map(n => n.id));
  const connected = nodes.filter(n => connectedIds.has(n.id));
  const isolated = nodes.filter(n => !connectedIds.has(n.id));

  const layer = new Map<string, number>();
  for (const n of connected) layer.set(n.id, 0);
  for (let pass = 0; pass < connected.length + 1; pass++) {
    let changed = false;
    for (const n of connected) {
      const preds = (incoming.get(n.id) ?? []).filter(id => connectedIds.has(id));
      if (preds.length === 0) continue;
      const desired = Math.max(...preds.map(p => layer.get(p) ?? 0)) + 1;
      if (desired !== layer.get(n.id)) { layer.set(n.id, desired); changed = true; }
    }
    if (!changed) break;
  }

  const byLayer = new Map<number, WorkforceNode[]>();
  for (const n of connected) {
    const l = layer.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n);
  }

  const positioned = new Map<string, XYPosition>();
  for (const [l, rowNodes] of byLayer) {
    const sorted = rowNodes.slice().sort((a, b) => a.position.y - b.position.y);
    sorted.forEach((n, i) => {
      positioned.set(n.id, { x: ARRANGE_ORIGIN.x + l * ARRANGE_LAYER_X, y: ARRANGE_ORIGIN.y + i * ARRANGE_ROW_Y });
    });
  }

  const maxRows = byLayer.size > 0 ? Math.max(...[...byLayer.values()].map(r => r.length)) : 0;
  isolated.forEach((n, i) => {
    positioned.set(n.id, { x: ARRANGE_ORIGIN.x + i * 260, y: ARRANGE_ORIGIN.y + (maxRows + 1) * ARRANGE_ROW_Y });
  });

  return nodes.map(n => ({ ...n, position: positioned.get(n.id) ?? n.position }));
}
