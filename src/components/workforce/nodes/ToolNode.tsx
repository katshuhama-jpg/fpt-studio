import { useState } from "react";
import { type NodeProps } from "reactflow";
import { Wrench } from "lucide-react";
import type { ToolNodeData } from "../types";
import { getBuiltin } from "@/components/tool-builder/types";
import { CATALOG as CONNECTOR_CATALOG } from "@/components/configure/ConnectionsTab";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";
import MissingTriggerNotice from "./MissingTriggerNotice";

/** Documents a capability available to this Workforce — an installed Tool Store plugin or a
 * Connector/Integration app (S-gap-4) — mirroring Relevance AI's own Workforce "Tool" node.
 * Deliberately has NO Handles at all, unlike every routing node type: it doesn't participate in
 * the flow graph (same reason Note has none), so it's excluded from the unreachable-from-Trigger
 * check in graphOps.ts and can't be dragged into a connection either way. */
export default function ToolNode({ id, data, selected }: NodeProps<ToolNodeData>) {
  const { onDelete } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);

  const builtin = data.ref?.source === "builtin" ? getBuiltin(data.ref.id) : undefined;
  const connector = data.ref?.source === "connector" ? CONNECTOR_CATALOG.find(c => c.id === data.ref!.id) : undefined;
  const notConfigured = !builtin && !connector;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${notConfigured ? "var(--wf-warn)" : selected || hovered ? "var(--wf-tool)" : "var(--wf-border)"}`,
        boxShadow: selected || hovered ? "var(--wf-node-shadow-selected)" : "var(--wf-node-shadow)",
      }}
    >
      <NodeToolbarMenu visible={!!selected} onDelete={() => onDelete(id)} />
      <NodeTypeTab icon={<Wrench size={12} />} label="Tool" kind="tool" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 overflow-hidden text-[17px]"
          style={{ background: "var(--wf-tool-bg)", color: "var(--wf-tool)" }}
        >
          {builtin ? builtin.pluginAvatar
            : connector ? <img src={connector.logo} alt={connector.name} className="w-full h-full object-contain p-1.5" />
            : <Wrench size={17} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug truncate m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            {builtin?.name ?? connector?.name ?? "Chưa chọn tool"}
          </p>
          <p className="text-[12px] leading-[1.45] truncate mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            {builtin?.description ?? connector?.desc ?? "Tool hoặc integration cho Workforce này"}
          </p>
        </div>
      </div>
      {notConfigured && <MissingTriggerNotice text="Chưa chọn tool — chưa sẵn sàng dùng" />}
    </div>
  );
}
