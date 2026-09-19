import { BaseEdge, getSmoothStepPath, type EdgeProps } from "reactflow";
import { WF_CONNECTOR_COLOR, WF_DOTMARK_COLOR, WF_RUN_COLOR } from "../slateTheme";
import { useWorkforceNodeActions } from "../nodes/nodeActionsContext";

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
  id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, style, markerEnd, selected,
}: EdgeProps) {
  const { runTrace } = useWorkforceNodeActions();
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: CORNER_RADIUS,
  });
  // Line itself is a neutral slate gray; the endpoint dots (the nodes' own Handles) and the
  // arrowhead carry the accent color, so a route reads as one continuous line with clearly
  // marked start/end rather than a solid-accent line end to end. An edge the simulated run has
  // traversed (S-gap-7) overrides both — same green as a "done" node's outline, so the whole
  // path the run took reads as one continuous, unambiguous line across the canvas.
  const traversed = !!runTrace?.edgeIds.has(id);
  const strokeColor = traversed ? WF_RUN_COLOR : selected ? WF_DOTMARK_COLOR : WF_CONNECTOR_COLOR;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: traversed || selected ? 2.5 : 1.6, stroke: strokeColor, cursor: "pointer" }}
        interactionWidth={20}
      />
      {/* Traversed-only flow animation: a marching white dash on top of the solid green line
          (`.wf-edge-flow`, index.css), sharing the exact same path as the BaseEdge above so it
          reads as motion ON that line rather than a second, separate line. Purely decorative —
          pointer-events off so it never steals the click/selection target from the real edge. */}
      {traversed && (
        <path
          d={edgePath}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeDasharray="3 9"
          strokeLinecap="round"
          opacity={0.85}
          className="wf-edge-flow"
          style={{ pointerEvents: "none" }}
        />
      )}
    </>
  );
}
