import { useMemo, useState } from "react";
import { X, Boxes, Trash2, Search, AlertTriangle } from "lucide-react";
import { useReturnFocusOnUnmount } from "./useReturnFocus";
import { workforceStore } from "./workforceStore";

/** Picks which other Workforce this Sub-process node calls (S-gap-6). Excludes the current
 * Workforce itself (no self-recursion) and flags — without hard-blocking, since the underlying
 * data can always change later — any candidate that already has its own Sub-process node
 * pointing back at this Workforce, which would form an immediate two-step cycle. */
export default function SubProcessConfigDrawer({
  currentWorkforceId, workforceId, onSelect, onClose, onDelete,
}: {
  currentWorkforceId: string;
  workforceId: string | null;
  onSelect: (workforceId: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  useReturnFocusOnUnmount();
  const [search, setSearch] = useState("");

  const options = useMemo(
    () => workforceStore.list().filter(wf => wf.id !== currentWorkforceId),
    [currentWorkforceId],
  );
  const q = search.trim().toLowerCase();
  const filtered = options.filter(wf => !q || wf.name.toLowerCase().includes(q));

  const wouldCycle = (wf: ReturnType<typeof workforceStore.list>[number]) =>
    wf.nodes.some(n => n.data.kind === "subprocess" && n.data.workforceId === currentWorkforceId);

  return (
    <aside className="fixed right-0 top-24 bottom-0 w-[420px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--wf-subprocess-bg)", color: "var(--wf-subprocess)" }}>
          <Boxes size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">Sub-process</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X size={14} />
        </button>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm Workforce..."
            className="ds-input h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Chưa có Workforce nào khác để gọi.</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Không tìm thấy Workforce phù hợp.</p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(wf => {
              const selected = wf.id === workforceId;
              const cycle = wouldCycle(wf);
              return (
                <div
                  key={wf.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !cycle && onSelect(wf.id)}
                  onKeyDown={e => { if (!cycle && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(wf.id); } }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    cycle ? "border-border bg-surface-muted/60 opacity-60 cursor-not-allowed" :
                    selected ? "border-primary bg-primary-soft cursor-pointer" : "border-border bg-surface hover:border-primary/40 cursor-pointer"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--wf-subprocess-bg)", color: "var(--wf-subprocess)" }}>
                    <Boxes size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{wf.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {wf.status === "published" ? "Published" : "Draft"}
                      {cycle && " · Sẽ tạo vòng lặp"}
                    </p>
                  </div>
                  {cycle && <AlertTriangle size={13} className="text-warning shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          Node Sub-process gọi toàn bộ một Workforce khác làm một bước trong Workforce này — dùng để tái sử dụng một quy trình con thay vì xây lại từ đầu.
        </p>
      </div>
    </aside>
  );
}
