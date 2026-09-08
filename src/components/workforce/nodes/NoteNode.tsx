import { useState } from "react";
import { NodeResizer, type NodeProps } from "reactflow";
import { StickyNote } from "lucide-react";
import type { NoteNodeData } from "../types";
import { useWorkforceNodeActions } from "./nodeActionsContext";
import NodeToolbarMenu from "./NodeToolbarMenu";

export default function NoteNode({ id, data, selected }: NodeProps<NoteNodeData>) {
  const { onDelete, onNoteTextChange } = useWorkforceNodeActions();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full h-full min-w-[180px] min-h-[120px] rounded-xl border bg-warning-soft shadow-soft transition-base flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-warning ring-2 ring-warning/25" : "border-border"
      }`}
    >
      <NodeResizer isVisible={!!selected} minWidth={180} minHeight={120} handleClassName="!w-2.5 !h-2.5 !bg-warning !border !border-white !rounded-sm" />
      <NodeToolbarMenu visible={!!selected || hovered} onDelete={() => onDelete(id)} />
      <div className="flex items-center gap-1.5 px-2.5 pt-2 text-warning">
        <StickyNote size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-wider">Ghi chú</span>
      </div>
      <textarea
        value={data.text}
        onChange={e => onNoteTextChange(id, e.target.value)}
        placeholder="Nhập ghi chú của bạn..."
        className="nodrag flex-1 w-full bg-transparent resize-none outline-none px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70"
      />
    </div>
  );
}
