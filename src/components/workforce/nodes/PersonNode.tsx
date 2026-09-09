import { useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { User } from "lucide-react";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import type { PersonNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";

export default function PersonNode({ id, data, selected }: NodeProps<PersonNodeData>) {
  const { onDelete } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const member = members.find(m => m.id === data.memberId);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${selected ? "var(--wf-person)" : "var(--wf-border)"}`,
        boxShadow: selected ? "0 0 0 2px var(--wf-person-bg)" : "var(--wf-node-shadow)",
      }}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <NodeTypeTab icon={<User size={12} />} label="Người trong tổ chức" kind="person" />
      <div className="flex items-start gap-[11px]" style={{ padding: "12px 14px 14px" }}>
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 text-[12px] font-bold [font-family:var(--wf-font-display)]"
          style={{ background: "var(--wf-person-bg)", color: "var(--wf-person)" }}
        >
          {member?.initials ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug truncate m-0 [font-family:var(--wf-font-display)]" style={{ color: "var(--wf-text)" }}>
            {member?.name ?? "Chưa chọn người nhận"}
          </p>
          <p className="text-[12px] leading-[1.45] truncate mt-[3px] mb-0" style={{ color: "var(--wf-muted)", fontFamily: "var(--wf-font-body)" }}>
            {member?.email ?? "—"}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}
