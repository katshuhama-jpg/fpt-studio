import { Handle, Position, type NodeProps } from "reactflow";
import { Headset } from "lucide-react";
import type { OmniNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";

export default function OmniNode({ id, selected }: NodeProps<OmniNodeData>) {
  const { onConfigure, onDelete } = useWorkforceNodeActions();

  return (
    <div
      className={`min-w-[220px] max-w-[220px] rounded-xl border bg-surface shadow-soft transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <NodeToolbarMenu visible={!!selected} onConfigure={() => onConfigure(id)} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Headset size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold leading-tight">Omni Supports</div>
          <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">
            Tư vấn viên tiếp nhận từ hệ thống Omni — hệ thống Omni tự phân bổ, Workforce không chọn người cụ thể.
          </div>
        </div>
      </div>
    </div>
  );
}
