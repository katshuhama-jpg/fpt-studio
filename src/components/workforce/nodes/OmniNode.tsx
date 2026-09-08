import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Headset } from "lucide-react";
import type { OmniNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";

export default function OmniNode({ id, selected }: NodeProps<OmniNodeData>) {
  const { onDelete } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative min-w-[252px] max-w-[252px] rounded-2xl border bg-surface shadow-soft cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <NodeTypeTab icon={<Headset size={10} />} label="Omni Supports" variant="accent" />
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Headset size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug">Omni Supports</div>
          <div className="text-[11.5px] text-muted-foreground leading-relaxed mt-1">
            Tư vấn viên tiếp nhận từ hệ thống Omni — hệ thống Omni tự phân bổ, Workforce không chọn người cụ thể.
          </div>
        </div>
      </div>
    </div>
  );
}
