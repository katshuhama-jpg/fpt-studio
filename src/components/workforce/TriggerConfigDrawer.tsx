import { X, Zap, Trash2 } from "lucide-react";
import { useReturnFocusOnUnmount } from "./useReturnFocus";

const LABEL_MAX = 60;
const DESC_MAX = 200;

export default function TriggerConfigDrawer({
  label, description, onChangeLabel, onChangeDescription, onClose, onDelete,
}: {
  label: string;
  description: string;
  onChangeLabel: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  useReturnFocusOnUnmount();
  return (
    <aside className="fixed right-0 top-24 bottom-0 w-[420px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--wf-trigger-bg)", color: "var(--wf-trigger)" }}>
          <Zap size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">Trigger</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Two separate labeled fields, each on its own line — not merged into one row — so
            each field's purpose stays legible, matching the Condition drawer's own stacked
            Biến/Toán tử/Giá trị layout fixed earlier in this canvas. */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Tên trigger</label>
            <span className="text-xs text-muted-foreground">{label.length}/{LABEL_MAX}</span>
          </div>
          <input
            type="text"
            value={label}
            maxLength={LABEL_MAX}
            onChange={e => onChangeLabel(e.target.value)}
            placeholder="Ví dụ: Nhận tin nhắn từ khách hàng"
            className="ds-input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Mô tả</label>
            <span className="text-xs text-muted-foreground">{description.length}/{DESC_MAX}</span>
          </div>
          <textarea
            rows={4}
            value={description}
            maxLength={DESC_MAX}
            onChange={e => onChangeDescription(e.target.value)}
            placeholder="Ví dụ: Từ kênh chat hoặc API — bắt đầu Workforce này."
            className="ds-textarea"
          />
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Trigger là điểm bắt đầu của Workforce này — không thể có node nào kết nối vào Trigger, và Trigger chỉ kết nối thẳng tới một Agent.
          </p>
        </div>
      </div>
    </aside>
  );
}
