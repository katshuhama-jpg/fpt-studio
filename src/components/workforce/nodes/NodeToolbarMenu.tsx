import { NodeToolbar, Position } from "reactflow";
import { Trash2 } from "lucide-react";

/** Delete-only affordance floating above a node, shown on hover or selection — matching the
 * interaction model where a single click on the node body opens its config drawer directly, so
 * delete has to live somewhere else entirely (this, plus the same trash icon repeated inside
 * the open drawer's own header). */
export default function NodeToolbarMenu({
  visible, onDelete, deleteLabel = "Xóa",
}: {
  visible: boolean;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  return (
    <NodeToolbar isVisible={visible} position={Position.Top} offset={10} className="nodrag nopan">
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="w-8 h-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg bg-white border border-border shadow-elev flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 size={14} />
      </button>
    </NodeToolbar>
  );
}
