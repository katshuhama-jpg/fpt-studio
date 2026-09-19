import { X, Trash2, UserCog, ListChecks, User as UserIcon } from "lucide-react";
import { useReturnFocusOnUnmount } from "./useReturnFocus";
import type { HumanTaskKind } from "./types";

// "Cần duyệt" used to live here as a third option — it's gone. Approval moved onto the
// Condition/edge that leads to a step (see ConditionDrawer's "Yêu cầu phê duyệt" section),
// matching Relevance AI's model instead of a Person node whose Duyệt/Từ chối outcome had to be
// routed via a Condition rule on a variable (`outcome`) that never actually existed.
const TASK_KIND_OPTIONS: { value: HumanTaskKind; label: string; desc: string; icon: typeof ListChecks }[] = [
  { value: "do", label: "Cần thực hiện", desc: "Một việc được giao — luồng tiếp tục sau khi hoàn thành.", icon: ListChecks },
  { value: "notify", label: "Thông báo", desc: "Chỉ báo cho người này biết — không cần phản hồi, kết thúc ở đây.", icon: UserIcon },
];

const SLA_PRESETS = [15, 30, 60, 240, 1440];

function formatSlaPreset(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${minutes / 60} giờ`;
  return `${minutes / 1440} ngày`;
}

export default function PersonConfigDrawer({
  name, email, initials, taskKind, onChangeTaskKind, slaMinutes, onChangeSla,
  escalationName, escalationInitials, onChangeEscalation, onClearEscalation,
  onChangePerson, onClose, onDelete,
}: {
  name: string;
  email: string;
  initials: string;
  taskKind: HumanTaskKind;
  onChangeTaskKind: (value: HumanTaskKind) => void;
  slaMinutes: number | null;
  onChangeSla: (value: number | null) => void;
  escalationName: string | null;
  escalationInitials: string;
  onChangeEscalation: () => void;
  onClearEscalation: () => void;
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
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Trash2 size={14} />
        </button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-surface-muted">
          <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{email}</div>
          </div>
          <button
            onClick={onChangePerson}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserCog size={12} /> Đổi
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium mb-1.5 block">Loại việc</label>
          <div className="space-y-1.5">
            {TASK_KIND_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = taskKind === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeTaskKind(opt.value)}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
                  }`}
                >
                  <Icon size={15} className={`shrink-0 mt-0.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${active ? "text-primary" : ""}`}>{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">SLA</label>
            {slaMinutes != null && (
              <button
                type="button"
                onClick={() => onChangeSla(null)}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-base"
              >
                Bỏ SLA
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
            Thời gian tối đa để hoàn tất việc này trước khi bị đánh dấu quá hạn.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SLA_PRESETS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeSla(m)}
                className={`h-7 px-2.5 rounded-md text-xs font-medium transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  slaMinutes === m ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {formatSlaPreset(m)}
              </button>
            ))}
          </div>
        </div>

        {slaMinutes != null && (
          <div className="pt-3 mt-3 border-t border-border">
            <label className="text-sm font-medium mb-1.5 block">Chuyển việc khi quá hạn</label>
            <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
              Nếu không có phản hồi trong {formatSlaPreset(slaMinutes)}, tự động chuyển việc cho người này. Để trống nếu chỉ cần đánh dấu quá hạn.
            </p>
            {escalationName ? (
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface">
                <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {escalationInitials}
                </div>
                <span className="text-sm font-medium truncate flex-1">{escalationName}</span>
                <button
                  onClick={onChangeEscalation}
                  className="text-[11px] text-primary hover:underline font-medium shrink-0"
                >
                  Đổi
                </button>
                <button
                  onClick={onClearEscalation}
                  aria-label="Bỏ người thay thế"
                  className="w-7 h-7 min-w-[44px] min-h-[44px] -m-1.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={onChangeEscalation}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserCog size={13} /> Chọn người thay thế
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
