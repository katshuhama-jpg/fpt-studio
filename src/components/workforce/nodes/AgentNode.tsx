import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Bot, ExternalLink } from "lucide-react";
import { AGENTS } from "@/components/configure/agentStore";
import type { AgentNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";

export default function AgentNode({ id, data, selected }: NodeProps<AgentNodeData>) {
  const { onDelete } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);
  const agent = AGENTS.find(a => a.id === data.agentId);

  const openAgent = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/agents/${data.agentId}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${selected ? "var(--wf-agent)" : "var(--wf-border)"}`,
        boxShadow: selected ? "0 0 0 2px var(--wf-agent-bg)" : "var(--wf-node-shadow)",
      }}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <NodeTypeTab icon={<Bot size={12} />} label="Agent" kind="agent" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
          style={{ background: "var(--wf-agent-bg)", color: "var(--wf-agent)" }}
        >
          <Bot size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug truncate m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            {agent?.name ?? "Agent không tồn tại"}
          </p>
          <p className="text-[12px] leading-[1.45] truncate mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            {agent?.desc}
          </p>
        </div>
        <button
          type="button"
          aria-label="Mở Agent"
          onClick={openAgent}
          className="nodrag w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-md flex items-center justify-center shrink-0 transition-base hover:text-[var(--wf-agent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ color: "var(--wf-muted)" }}
        >
          <ExternalLink size={13} />
        </button>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
