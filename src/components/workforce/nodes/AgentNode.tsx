import { Handle, Position, type NodeProps } from "reactflow";
import { Bot, ExternalLink } from "lucide-react";
import { AGENTS } from "@/components/configure/agentStore";
import type { AgentNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";

export default function AgentNode({ id, data, selected }: NodeProps<AgentNodeData>) {
  const { onConfigure, onDelete } = useWorkforceNodeActions();
  const agent = AGENTS.find(a => a.id === data.agentId);

  const openAgent = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/agents/${data.agentId}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`relative min-w-[240px] max-w-[240px] rounded-xl border bg-surface shadow-soft transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <NodeTypeTab icon={<Bot size={10} />} label="Agent" />
      <NodeToolbarMenu visible={!!selected} onConfigure={() => onConfigure(id)} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${agent?.bg ?? "bg-surface-muted"}`}>
          {agent?.emoji ?? "🤖"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold leading-tight truncate">{agent?.name ?? "Agent không tồn tại"}</div>
          <div className="text-[10px] text-muted-foreground truncate">{agent?.desc}</div>
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
