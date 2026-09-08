import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "reactflow";
import { X } from "lucide-react";
import { useWorkforceNodeActions } from "../nodes/nodeActionsContext";

const CORNER_RADIUS = 6;

/** Both halves of a route (source→Condition, Condition→destination) use this edge type.
 * Routing is strict orthogonal (step) with small rounded corners — never a bezier/S-curve —
 * matching the reference canvas: a straight horizontal line when both ends share a row, or a
 * horizontal→vertical→horizontal path when they don't. Small dots mark the exact points where
 * the line meets each node's edge, and an arrowhead marks the entry into the destination.
 * Selecting either half surfaces a small "Xóa kết nối" button at its midpoint — deleting
 * either half removes the whole route (both edge halves plus the Condition node between
 * them), per the delete rules for connections. */
export default function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected,
}: EdgeProps) {
  const { onDeleteEdge } = useWorkforceNodeActions();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: CORNER_RADIUS,
  });
  const strokeColor = selected ? "hsl(var(--primary))" : "hsl(var(--border-strong))";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: selected ? 2.5 : 2, stroke: strokeColor }}
      />
      <circle cx={sourceX} cy={sourceY} r={3.5} fill={strokeColor} />
      <circle cx={targetX} cy={targetY} r={3.5} fill={strokeColor} />
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            aria-label="Xóa kết nối"
            onClick={() => onDeleteEdge(id)}
            className="nodrag nopan absolute w-7 h-7 min-w-[44px] min-h-[44px] -m-[8.5px] rounded-full bg-white border border-destructive/40 text-destructive flex items-center justify-center shadow-elev hover:bg-[hsl(var(--destructive-soft))] transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
          >
            <X size={13} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
