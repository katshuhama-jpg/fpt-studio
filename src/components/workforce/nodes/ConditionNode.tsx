import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch, AlertTriangle } from "lucide-react";
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

  // Empty vs. configured is the one thing worth spotting at a glance while scanning a big
  // Workforce — orange for "still needs setup", green once a route actually has conditions on
  // it — with the post-publish "invalid" state (still empty when Publish was clicked) taking
  // over both as the strongest, most alarming color of the three.
  const stateColor = invalid ? "hsl(var(--destructive))" : unconfigured ? "var(--wf-warn)" : "var(--wf-ok)";
  const borderColor = stateColor;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center min-w-[150px] max-w-[190px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        gap: 7,
        padding: "8px 12px",
        background: "var(--wf-surface)",
        border: `1px dashed ${borderColor}`,
        borderRadius: "var(--wf-radius-sm)",
        boxShadow: selected ? "0 0 0 2px var(--wf-agent-bg)" : "none",
        color: stateColor,
      }}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} deleteLabel="Xóa route" />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      {unconfigured ? <AlertTriangle size={13} className="shrink-0" /> : <GitBranch size={13} className="shrink-0" />}
      <span className="text-[12px] truncate flex-1" style={{ fontFamily: "var(--wf-font-body)" }}>{statusText}</span>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
