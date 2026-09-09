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

  // Exactly two visual states: warn (empty/unconfigured — including the post-publish "invalid"
  // flag, which only ever gets set on a condition that's still unconfigured) and the neutral
  // default otherwise. The warn color lives on the border + icon only — body text always stays
  // the same neutral color in both states.
  const isWarn = unconfigured || invalid;
  const accentColor = isWarn ? "var(--wf-warn)" : "var(--wf-cond-border)";
  const iconColor = isWarn ? "var(--wf-warn)" : "var(--wf-muted)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center min-w-[150px] max-w-[190px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        gap: 7,
        padding: "8px 12px",
        background: "var(--wf-surface)",
        border: `1px dashed ${accentColor}`,
        borderRadius: "var(--wf-radius-sm)",
        boxShadow: selected ? "0 0 0 2px var(--wf-agent-bg)" : "none",
        color: "var(--wf-text)",
      }}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} deleteLabel="Xóa route" />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      {unconfigured
        ? <AlertTriangle size={13} className="shrink-0" style={{ color: iconColor }} />
        : <GitBranch size={13} className="shrink-0" style={{ color: iconColor }} />}
      <span className="text-[12px] truncate flex-1" style={{ fontFamily: "var(--wf-font-body)" }}>{statusText}</span>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
