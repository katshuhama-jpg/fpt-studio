import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Zap, MessageSquare, Clock, Webhook, Globe } from "lucide-react";
import type { TriggerNodeData } from "../types";
import { triggerStore, type TriggerType } from "@/components/configure/triggerStore";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";
import MissingTriggerNotice from "./MissingTriggerNotice";

const TYPE_ICON: Record<TriggerType, typeof Clock> = { manual: MessageSquare, scheduled: Clock, developer: Webhook, external: Globe };

/** What starts this Workforce running. Unlike every other node type, a Trigger only ever acts as
 * a source — it has no target Handle at all, since nothing can hand a conversation off *to* a
 * trigger. Its one outgoing connection always goes straight to an Agent with no Condition in
 * between (see createDirectEdge in graphOps.ts) — there's no decision to branch on here.
 *
 * Backed by a real triggerStore record (S-gap-3), not free text — same record the target Agent's
 * own Builder → Triggers tab shows, so this card and that tab can never say different things
 * about what starts the Agent running. Which real trigger applies depends on which Agent this
 * node is connected to (triggers are scoped per-agent), so both pieces come from
 * `triggerAgentIds`/`triggerStore` rather than from `data` directly. */
export default function TriggerNode({ id, data, selected }: NodeProps<TriggerNodeData>) {
  const { onDelete, triggerAgentIds, runTrace } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);
  const runStatus = runTrace?.nodeStatus.get(id);
  const agentId = triggerAgentIds.get(id) ?? null;
  const record = agentId && data.triggerId ? triggerStore.get(agentId, data.triggerId) : undefined;
  // Two distinct "this won't fire" states, both rendered with the same warning strip as the
  // downstream unreachable-node case: not wired to an Agent at all, or wired but no real trigger
  // picked yet (including a picked trigger that no longer resolves, e.g. after reconnecting to a
  // different Agent — its triggerId is scoped to the old one).
  const notConnected = !agentId;
  const notConfigured = !notConnected && !record;
  const TypeIcon = record ? TYPE_ICON[record.type] : MessageSquare;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${runStatus === "current" ? "wf-run-current" : ""}`}
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${notConnected || notConfigured ? "var(--wf-warn)" : selected || hovered ? "var(--wf-trigger)" : "var(--wf-border)"}`,
        boxShadow: selected || hovered ? "var(--wf-node-shadow-selected)" : "var(--wf-node-shadow)",
        outline: runStatus === "current" ? "3px solid var(--wf-accent)" : runStatus === "done" ? "2px solid var(--wf-pub-ink)" : "none",
        outlineOffset: 2,
      }}
    >
      <NodeToolbarMenu visible={!!selected} onDelete={() => onDelete(id)} />
      <NodeTypeTab icon={<Zap size={12} />} label="Trigger" kind="trigger" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
          style={{ background: "var(--wf-trigger-bg)", color: "var(--wf-trigger)" }}
        >
          <TypeIcon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug truncate m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            {record?.name ?? "Chưa chọn trigger"}
          </p>
          <p className="text-[12px] leading-[1.45] truncate mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            {record?.description || "Bắt đầu Workforce này"}
          </p>
        </div>
      </div>
      {notConnected && <MissingTriggerNotice text="Chưa kết nối tới Agent — sẽ không chạy" />}
      {notConfigured && <MissingTriggerNotice text="Chưa chọn trigger thật — sẽ không chạy" />}
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
