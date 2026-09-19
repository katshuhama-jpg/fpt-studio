import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Boxes, ExternalLink } from "lucide-react";
import type { SubProcessNodeData } from "../types";
import { workforceStore } from "../workforceStore";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";
import MissingTriggerNotice from "./MissingTriggerNotice";

/** Calls another Workforce as a reusable step (S-gap-6) — a normal routing node with both
 * Handles, like Agent, so the flow continues here once the called Workforce finishes. */
export default function SubProcessNode({ id, data, selected }: NodeProps<SubProcessNodeData>) {
  const { onDelete, unreachableNodeIds } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);
  const target = data.workforceId ? workforceStore.get(data.workforceId) : undefined;
  const missingTrigger = unreachableNodeIds.has(id);
  const notConfigured = !target;

  const openTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.workforceId) window.open(`/workforce/${data.workforceId}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${missingTrigger || notConfigured ? "var(--wf-warn)" : selected || hovered ? "var(--wf-subprocess)" : "var(--wf-border)"}`,
        boxShadow: selected || hovered ? "var(--wf-node-shadow-selected)" : "var(--wf-node-shadow)",
      }}
    >
      <NodeToolbarMenu visible={!!selected} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <NodeTypeTab icon={<Boxes size={12} />} label="Sub-process" kind="subprocess" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
          style={{ background: "var(--wf-subprocess-bg)", color: "var(--wf-subprocess)" }}
        >
          <Boxes size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug truncate m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            {target?.name ?? "Chưa chọn Workforce"}
          </p>
          <p className="text-[12px] leading-[1.45] truncate mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            {target ? (target.status === "published" ? "Published" : "Draft") : "Gọi một Workforce khác làm bước con"}
          </p>
        </div>
        {target && (
          <button
            type="button"
            aria-label="Mở Workforce"
            onClick={openTarget}
            className="nodrag w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-md flex items-center justify-center shrink-0 transition-base hover:text-[var(--wf-subprocess)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ color: "var(--wf-muted)" }}
          >
            <ExternalLink size={13} />
          </button>
        )}
      </div>
      {notConfigured && <MissingTriggerNotice text="Chưa chọn Workforce — chưa sẵn sàng dùng" />}
      {missingTrigger && <MissingTriggerNotice />}
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
