import { useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Clock, ListChecks, User } from "lucide-react";
import { collectMembers } from "@/pages/organization/orgData";
import { useOrg } from "@/pages/organization/orgStore";
import type { PersonNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import { HANDLE_CLASS } from "./handleStyle";
import NodeToolbarMenu from "./NodeToolbarMenu";
import NodeTypeTab from "./NodeTypeTab";
import MissingTriggerNotice from "./MissingTriggerNotice";

const TASK_KIND_META = {
  do: { label: "Cần thực hiện", icon: ListChecks },
  notify: { label: "Thông báo", icon: User },
} as const;

export default function PersonNode({ id, data, selected }: NodeProps<PersonNodeData>) {
  const { onDelete, unreachableNodeIds, runTrace } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const member = members.find(m => m.id === data.memberId);
  const missingTrigger = unreachableNodeIds.has(id);
  const runStatus = runTrace?.nodeStatus.get(id);
  // "notify" is fire-and-forget — no response to continue on, so (unlike "do") it gets no
  // source Handle, the same terminal shape every Person node had before task kinds existed
  // (S-gap-5).
  const continuable = data.taskKind !== "notify";
  const taskMeta = TASK_KIND_META[data.taskKind];
  const TaskIcon = taskMeta.icon;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col overflow-hidden w-[230px] cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${runStatus === "current" ? "wf-run-current" : ""}`}
      style={{
        borderRadius: "var(--wf-radius)",
        background: "var(--wf-surface)",
        border: `1px solid ${missingTrigger ? "var(--wf-warn)" : selected || hovered ? "var(--wf-person)" : "var(--wf-border)"}`,
        boxShadow: selected || hovered ? "var(--wf-node-shadow-selected)" : "var(--wf-node-shadow)",
        outline: runStatus === "current" ? "3px solid var(--wf-accent)" : runStatus === "done" ? "2px solid var(--wf-pub-ink)" : "none",
        outlineOffset: 2,
      }}
    >
      <NodeToolbarMenu visible={!!selected} onDelete={() => onDelete(id)} />
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
      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1" style={{ padding: "0 14px 12px" }}>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--wf-person)" }}>
          <TaskIcon size={11} /> {taskMeta.label}
        </span>
        {data.slaMinutes != null && (
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--wf-muted)" }}>
            <Clock size={11} /> SLA {data.slaMinutes} phút
          </span>
        )}
      </div>
      {missingTrigger && <MissingTriggerNotice />}
      {continuable && <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />}
    </div>
  );
}
