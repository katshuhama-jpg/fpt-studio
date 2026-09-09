import { BaseEdge, getSmoothStepPath, type EdgeProps } from "reactflow";
import { WF_CONNECTOR_COLOR, WF_DOTMARK_COLOR } from "../slateTheme";

const CORNER_RADIUS = 6;

/** Both halves of a route (source→Condition, Condition→destination) use this edge type.
 * Routing is strict orthogonal (step) with small rounded corners — never a bezier/S-curve —
 * matching the reference canvas: a straight horizontal line when both ends share a row, or a
 * horizontal→vertical→horizontal path when they don't. The small dot at each connection point is
 * the node's own Handle (see handleStyle.ts) — not drawn here — so it isn't double-rendered on
 * top of itself; an open-chevron arrowhead (ROUTE_ARROW in graphOps.ts, applied only to the
 * Condition→destination half — see workforceStore.ts's `edge()` helper) marks the entry into a
 * route's final destination. Clicking either half opens the same Condition drawer as clicking
 * the Condition node itself (wired via `onEdgeClick` on the parent `<ReactFlow>`, using
 * `data.conditionId`) — deleting a route only happens from inside that drawer or the Condition
 * node's own hover affordance, not from clicking the line, so this component has no delete UI of
 * its own. */
export default function DeletableEdge({
  sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, style, markerEnd, selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: CORNER_RADIUS,
  });
  // Line itself is a neutral slate gray; the endpoint dots (the nodes' own Handles) and the
  // arrowhead carry the accent color, so a route reads as one continuous line with clearly
  // marked start/end rather than a solid-accent line end to end.
  const strokeColor = selected ? WF_DOTMARK_COLOR : WF_CONNECTOR_COLOR;

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{ ...style, strokeWidth: selected ? 2.5 : 1.6, stroke: strokeColor, cursor: "pointer" }}
      interactionWidth={20}
    />
  );
}
