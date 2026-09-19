import { BaseEdge, getSmoothStepPath, type EdgeProps } from "reactflow";
import { WF_CONNECTOR_COLOR, WF_DOTMARK_COLOR, WF_RUN_COLOR } from "../slateTheme";
import { useWorkforceNodeActions } from "../nodes/nodeActionsContext";
import { PACKET_TRAVEL_MS } from "../useRunTrace";

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
  // Mid-hop, between the source node going "current" and the commit that flips this edge to
  // `traversed` (see PACKET_TRAVEL_MS / useRunTrace.ts) — the edge itself stays neutral for this
  // beat; the travelling packet below is what sells the motion, not a color change here yet.
  const traveling = !!runTrace?.travelingEdgeIds.has(id);
  const strokeColor = traversed ? WF_RUN_COLOR : selected ? WF_DOTMARK_COLOR : WF_CONNECTOR_COLOR;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: traversed || selected ? 2.5 : 1.6, stroke: strokeColor, cursor: "pointer" }}
        interactionWidth={20}
      />
      {/* Travelling-packet animation (S-gap-7, "chạy thử"): a small glowing dot rides along this
          exact edge path — native SVG <animateMotion> rather than a JS-driven position, so it
          follows the real orthogonal route (including the corner) with no extra math. `fill="freeze"`
          holds it at the arrival point for the last frame so there's no snap-back before this
          element unmounts (React removes it the instant `traveling` goes false, right as
          useRunTrace's commit lands and the edge flips to solid green above). Remounts fresh
          every time `traveling` turns true, so the animation always restarts from the source end.
          Purely decorative — no pointer-events, so it never competes with the edge's own click
          target. */}
      {traveling && (
        <circle r={4.5} fill={WF_DOTMARK_COLOR} stroke="#FFFFFF" strokeWidth={2} style={{ pointerEvents: "none" }}>
          <animateMotion dur={`${PACKET_TRAVEL_MS}ms`} fill="freeze" path={edgePath} />
        </circle>
      )}
    </>
  );
}
