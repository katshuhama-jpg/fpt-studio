import { X, Trash2, UserCog } from "lucide-react";
import { useReturnFocusOnUnmount } from "./useReturnFocus";

export default function PersonConfigDrawer({
  name, email, initials, onChangePerson, onClose, onDelete,
}: {
  name: string;
  email: string;
  initials: string;
  onChangePerson: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  useReturnFocusOnUnmount();

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[420px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">{name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Người trong tổ chức</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-surface-muted">
          <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{email}</div>
          </div>
        </div>

        <button
          onClick={onChangePerson}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base"
        >
          <UserCog size={12} /> Đổi người nhận
        </button>
      </div>
    </aside>
  );
}
