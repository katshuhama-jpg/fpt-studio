import { Handle, Position, type NodeProps } from "reactflow";
import { useMemo } from "react";
import { User } from "lucide-react";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import type { PersonNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";

export default function PersonNode({ id, data, selected }: NodeProps<PersonNodeData>) {
  const { onConfigure, onDelete } = useWorkforceNodeActions();
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const member = members.find(m => m.id === data.memberId);

  return (
    <div
      className={`relative min-w-[220px] max-w-[220px] rounded-xl border bg-surface shadow-soft transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <NodeTypeTab icon={<User size={10} />} label="Người trong Org" />
      <NodeToolbarMenu
        visible={!!selected}
        onConfigure={() => onConfigure(id)}
        onDelete={() => onDelete(id)}
        configureLabel="Đổi người nhận"
      />
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
          {member?.initials ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold leading-tight truncate">{member?.name ?? "Chưa chọn người nhận"}</div>
          <div className="text-[10px] text-muted-foreground truncate">{member?.email ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
