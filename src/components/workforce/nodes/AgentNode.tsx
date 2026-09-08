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
      className={`relative flex flex-col overflow-hidden min-w-[268px] max-w-[268px] rounded-xl border bg-surface shadow-soft cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <NodeTypeTab icon={<Bot size={10} />} label="Agent" />
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${agent?.bg ?? "bg-surface-muted"}`}>
          {agent?.emoji ?? "🤖"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug truncate">{agent?.name ?? "Agent không tồn tại"}</div>
          <div className="text-[11.5px] text-muted-foreground leading-snug truncate mt-0.5">{agent?.desc}</div>
        </div>
        <button
          type="button"
          aria-label="Mở Agent"
          onClick={openAgent}
          className="nodrag w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-surface-muted transition-base shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink size={13} />
        </button>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
