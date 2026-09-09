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
      className="relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${selected ? "var(--wf-omni)" : "var(--wf-border)"}`,
        boxShadow: selected ? "0 0 0 2px var(--wf-omni-bg)" : "var(--wf-node-shadow)",
      }}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <NodeTypeTab icon={<Headset size={12} />} label="Omni Supports" kind="omni" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
          style={{ background: "var(--wf-omni-bg)", color: "var(--wf-omni)" }}
        >
          <Headset size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            Omni Supports
          </p>
          <p className="text-[12px] leading-[1.45] mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            Tư vấn viên tiếp nhận từ hệ thống Omni — hệ thống Omni tự phân bổ, Workforce không chọn người cụ thể.
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
