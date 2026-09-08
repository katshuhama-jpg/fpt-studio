import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch, AlertCircle } from "lucide-react";
import type { ConditionNodeData } from "../types";
import { isConditionInvalid } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";

export default function ConditionNode({ id, data, selected }: NodeProps<ConditionNodeData>) {
  const { onDelete } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);
  const unconfigured = isConditionInvalid(data);
  const invalid = !!data.invalid;

  const statusText = unconfigured
    ? "Chưa cấu hình điều kiện"
    : data.type === "llm"
      ? data.llmText
      : `${data.rules.length} điều kiện`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`min-w-[200px] max-w-[224px] rounded-full border bg-surface shadow-soft cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        invalid ? "border-destructive ring-2 ring-destructive/25" : selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} deleteLabel="Xóa route" />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <div className="flex items-center gap-2 pl-2 pr-3.5 py-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${unconfigured ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"}`}>
          {unconfigured ? <AlertCircle size={12} /> : <GitBranch size={12} />}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground truncate flex-1">{statusText}</span>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
