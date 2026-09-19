import { X, Headset, Trash2 } from "lucide-react";
import { useReturnFocusOnUnmount } from "./useReturnFocus";

const MAX = 300;

export default function OmniConfigDrawer({
  reasonDefault, onChange, onClose, onDelete,
}: {
  reasonDefault: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  useReturnFocusOnUnmount();
  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[420px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Headset size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">Omni Supports</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">Lý do chuyển giao (mặc định)</label>
          <span className="text-xs text-muted-foreground">{reasonDefault.length}/{MAX}</span>
        </div>
        <textarea
          rows={5}
          value={reasonDefault}
          maxLength={MAX}
          onChange={e => onChange(e.target.value)}
          placeholder="Ví dụ: Khách hàng yêu cầu gặp tư vấn viên."
          className="ds-textarea"
        />
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Nội dung này được đính kèm cùng lịch sử hội thoại khi chuyển giao, giúp tư vấn viên bên Omni nắm bối cảnh nhanh hơn.
        </p>
      </div>
    </aside>
  );
}
