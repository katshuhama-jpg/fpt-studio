import { useEffect, useRef, useState } from "react";
import { NodeToolbar, Position } from "reactflow";
import { Settings, MoreVertical } from "lucide-react";

/** Shared floating toolbar rendered above a selected node — a settings shortcut plus a "..."
 * menu (Cấu hình / Xóa), per the general node-interaction rules that apply to every node type. */
export default function NodeToolbarMenu({
  visible, onConfigure, onDelete, deleteLabel = "Xóa", configureLabel = "Cấu hình",
}: {
  visible: boolean;
  onConfigure?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  configureLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <NodeToolbar isVisible={visible} position={Position.Top} offset={10} className="nodrag nopan">
      <div ref={ref} className="flex items-center gap-0.5 bg-white rounded-lg border border-border shadow-elev p-1">
        {onConfigure && (
          <button
            type="button"
            aria-label={configureLabel}
            onClick={onConfigure}
            className="w-8 h-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings size={14} />
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            aria-label="Thao tác"
            onClick={() => setOpen(v => !v)}
            className="w-8 h-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreVertical size={14} />
          </button>
          {open && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-40 rounded-lg border border-border bg-white shadow-elev py-1 z-10">
              {onConfigure && (
                <button
                  onClick={() => { setOpen(false); onConfigure(); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base"
                >
                  {configureLabel}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { setOpen(false); onDelete(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base"
                >
                  {deleteLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </NodeToolbar>
  );
}
