import { BaseEdge, getSmoothStepPath, type EdgeProps } from "reactflow";

const CORNER_RADIUS = 6;

/** Both halves of a route (source→Condition, Condition→destination) use this edge type.
 * Routing is strict orthogonal (step) with small rounded corners — never a bezier/S-curve —
 * matching the reference canvas: a straight horizontal line when both ends share a row, or a
 * horizontal→vertical→horizontal path when they don't. Small dots mark the exact points where
 * the line meets each node's edge, and an arrowhead marks the entry into the destination.
 * Clicking either half opens the same Condition drawer as clicking the Condition node itself
 * (wired via `onEdgeClick` on the parent `<ReactFlow>`, using `data.conditionId`) — deleting a
 * route only happens from inside that drawer or the Condition node's own hover affordance, not
 * from clicking the line, so this component has no delete UI of its own. */
export default function DeletableEdge({
  sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: CORNER_RADIUS,
  });
  // A muted gray line read as too low-contrast against the canvas — use the brand primary
  // (indigo) at reduced strength by default, full-strength when selected, so routes are easy
  // to trace at a glance without losing the selected/unselected distinction.
  const strokeColor = selected ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)";

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: selected ? 2.5 : 2, stroke: strokeColor, cursor: "pointer" }}
        interactionWidth={20}
      />
      <circle cx={sourceX} cy={sourceY} r={3.5} fill={strokeColor} />
      <circle cx={targetX} cy={targetY} r={3.5} fill={strokeColor} />
    </>
  );
}
