import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Code2 } from "lucide-react";
import type { CodeNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";
import MissingTriggerNotice from "./MissingTriggerNotice";
import FlowControlChips from "./FlowControlChips";

/** Deterministic Code step - a normal routing node (both Handles, like Agent). Its declared
 * outputs are what downstream Condition rules route on. */
export default function CodeNode({ id, data, selected }: NodeProps<CodeNodeData>) {
  const { onDelete, unreachableNodeIds, runTrace } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);
  const missingTrigger = unreachableNodeIds.has(id);
  const notConfigured = !data.code.trim() || data.outputs.length === 0;
  const runStatus = runTrace?.nodeStatus.get(id);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base ${runStatus === "current" ? "wf-run-current" : ""}`}
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${missingTrigger || notConfigured ? "var(--wf-warn)" : selected || hovered ? "var(--wf-code)" : "var(--wf-border)"}`,
        boxShadow: selected || hovered ? "var(--wf-node-shadow-selected)" : "var(--wf-node-shadow)",
        outline: runStatus === "current" ? "3px solid var(--wf-accent)" : runStatus === "done" ? "2px solid var(--wf-pub-ink)" : "none",
        outlineOffset: 2,
      }}
    >
      <NodeToolbarMenu visible={!!selected} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <NodeTypeTab icon={<Code2 size={12} />} label="Code" kind="code" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 12px" }}>
        <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0" style={{ background: "var(--wf-code-bg)", color: "var(--wf-code)" }}>
          <Code2 size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug truncate m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>{data.name || "Bước Code"}</p>
          <p className="text-[12px] leading-[1.45] truncate mt-[3px] mb-0" style={{ color: "var(--wf-muted)" }}>
            {data.lang} · tất định · {data.outputs.length} đầu ra
          </p>
        </div>
      </div>
      <FlowControlChips data={data} />
      {notConfigured && <MissingTriggerNotice text="Chưa có code hoặc đầu ra - Chưa sẵn sàng dùng" />}
      {missingTrigger && <MissingTriggerNotice />}
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
