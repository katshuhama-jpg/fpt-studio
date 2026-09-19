import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Zap, MessageSquare } from "lucide-react";
import type { TriggerNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";

/** What starts this Workforce running. Unlike every other node type, a Trigger only ever acts as
 * a source — it has no target Handle at all, since nothing can hand a conversation off *to* a
 * trigger. Its one outgoing connection always goes straight to an Agent with no Condition in
 * between (see createDirectEdge in graphOps.ts) — there's no decision to branch on here. */
export default function TriggerNode({ id, data, selected }: NodeProps<TriggerNodeData>) {
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
        border: `1px solid ${selected ? "var(--wf-trigger)" : hovered ? "var(--wf-border-hover)" : "var(--wf-border)"}`,
        boxShadow: selected ? "0 0 0 2px var(--wf-trigger-bg)" : hovered ? "var(--wf-node-shadow-hover)" : "var(--wf-node-shadow)",
      }}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <NodeTypeTab icon={<Zap size={12} />} label="Trigger" kind="trigger" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
          style={{ background: "var(--wf-trigger-bg)", color: "var(--wf-trigger)" }}
        >
          <MessageSquare size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug truncate m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            {data.label || "Chưa đặt tên"}
          </p>
          <p className="text-[12px] leading-[1.45] truncate mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            {data.description || "Bắt đầu Workforce này"}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
