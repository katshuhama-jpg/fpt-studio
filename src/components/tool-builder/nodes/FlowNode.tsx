import { Handle, Position, type NodeProps } from "reactflow";
import { specByKind } from "../NodeLibrary";
import type { NodeData } from "../types";

export default function FlowNode({ data, selected }: NodeProps<NodeData>) {
  const spec = specByKind(data.kind);
  const Icon = spec.icon;
  const showInput = data.kind !== "trigger";
  const showOutput = data.kind !== "output";
  const errorBranch = data.config?.errorMode === "branch";

  return (
    <div
      className={`min-w-[200px] rounded-xl border bg-surface shadow-soft transition-base ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      {showInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-surface !border-2 !border-primary"
        />
      )}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className={`w-7 h-7 rounded-md ${spec.bg} ${spec.color} flex items-center justify-center shrink-0`}>
          <Icon size={13} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold leading-tight truncate">{data.label || spec.label}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{spec.category}</div>
        </div>
      </div>
      <div className="px-3 py-2 text-[11px] text-muted-foreground line-clamp-2">
        {data.config?.summary || spec.description}
      </div>
      {showOutput && (
        <Handle
          id="out"
          type="source"
          position={Position.Right}
          style={{ top: errorBranch ? "40%" : "50%" }}
          className="!w-2.5 !h-2.5 !bg-surface !border-2 !border-primary"
        />
      )}
      {errorBranch && (
        <Handle
          id="error"
          type="source"
          position={Position.Right}
          style={{ top: "75%" }}
          className="!w-2.5 !h-2.5 !bg-surface !border-2 !border-warning"
        />
      )}
    </div>
  );
}
