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
      className={`relative flex flex-col overflow-hidden min-w-[252px] max-w-[252px] rounded-xl border bg-surface shadow-soft cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <NodeTypeTab icon={<User size={10} />} label="Người trong tổ chức" />
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {member?.initials ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug truncate">{member?.name ?? "Chưa chọn người nhận"}</div>
          <div className="text-[11.5px] text-muted-foreground leading-snug truncate mt-0.5">{member?.email ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
