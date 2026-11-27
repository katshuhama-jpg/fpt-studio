import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Analytics01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { reminderStore } from "@/components/reminders/reminderStore";
import { CSAT_LIMITS, csatStore, validateCsat, type CsatConfig, type CsatField } from "./csatStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

export const CSAT_REMINDER_NOTE = "CSAT chỉ được gửi khi gắn vào reminder. Bật CSAT rating trong một reminder để sử dụng.";

/** Reminders (enabled or not) of the draft that have CSAT rating on. */
export const csatReminderCount = (agentId: string) => reminderStore.list(agentId).filter(r => r.csat).length;

/** Icon thống kê → màn Lịch sử của Agent. */
const openHistory = () => {
  const u = new URL(window.location.href);
  u.searchParams.set("tab", "insights");
  u.searchParams.set("section", "history");
  u.searchParams.delete("item");
  window.history.pushState({}, "", u);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const FIELDS: { key: CsatField; label: string; multiline?: boolean; hint?: string }[] = [
  { key: "webviewTitle", label: "Tiêu đề webview" },
  { key: "webviewDescription", label: "Mô tả webview", multiline: true },
  { key: "commentPlaceholder", label: "Nhận xét", hint: "Placeholder của ô nhận xét." },
  { key: "thankYou", label: "Lời cảm ơn", multiline: true, hint: "Hiện sau khi khách gửi đánh giá." },
  { key: "expired", label: "Thông báo hết hạn", hint: "Hiện khi khách mở link sau 7 ngày." },
];

/**
 * Popup "Đánh giá CSAT" — one config per Agent, opened from Conversation settings
 * and from the CSAT rating block of a reminder (stacks on top of the right sheet).
 */
export default function CsatConfigDialog({ agentId, readOnly, onClose, onSaved, onOpenReminders }: {
  agentId: string; readOnly?: boolean; onClose: () => void; onSaved?: () => void;
  /** Link "Nhắc nhở" trong cảnh báo cuối popup. Không truyền thì chỉ hiện chữ. */
  onOpenReminders?: () => void;
}) {
  const [initial] = useState<CsatConfig>(() => csatStore.get(agentId));
  const [draft, setDraft] = useState<CsatConfig>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Set<CsatField>>(new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const configured = csatStore.isConfigured(agentId);
  // Lần đầu (chưa Lưu lần nào) thì Lưu luôn được, kể cả khi giữ nguyên mặc định (AC-02).
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const errors = validateCsat(draft);
  const err = (k: CsatField) => (submitted || touched.has(k) ? errors[k] : undefined);
  const set = (k: CsatField, v: string) => setDraft(d => ({ ...d, [k]: v }));
  const touch = (k: CsatField) => setTouched(t => (t.has(k) ? t : new Set(t).add(k)));
  const csatReminders = csatReminderCount(agentId);

  const requestClose = () => { if (dirty && !readOnly) setConfirmDiscard(true); else onClose(); };
  const save = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    csatStore.save(agentId, { ...draft });
    toast.success("Đã lưu cấu hình CSAT vào bản nháp.");
    onSaved?.();
    onClose();
  };

  const field = ({ key, label, multiline, hint }: { key: CsatField; label: string; multiline?: boolean; hint?: string }) => {
    const id = `csat-${key}`;
    const e = err(key);
    const common = {
      id, value: draft[key], disabled: readOnly, "aria-invalid": !!e, "data-field": key,
      onBlur: () => touch(key),
    };
    return (
      <div key={key}>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-sm font-medium">{label} <span className="text-destructive">*</span></label>
          <span className={`text-[11px] tabular-nums ${draft[key].length > CSAT_LIMITS[key] ? "text-destructive" : "text-muted-foreground"}`}>{draft[key].length}/{CSAT_LIMITS[key]}</span>
        </div>
        {multiline
          ? <Textarea {...common} rows={2} onChange={ev => set(key, ev.target.value)} className={`mt-1.5 ${e ? "border-destructive" : ""}`} />
          : <Input {...common} onChange={ev => set(key, ev.target.value)} className={`mt-1.5 ${e ? "border-destructive" : ""}`} />}
        {hint && !e && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        {e && <p className="mt-1.5 text-xs text-destructive" role="alert">{e}</p>}
      </div>
    );
  };

  return (
    <>
      <Dialog open onOpenChange={o => { if (!o) requestClose(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] p-0 gap-0 flex flex-col"
          onOpenAutoFocus={e => { if (!readOnly) { e.preventDefault(); document.getElementById("csat-buttonTitle")?.focus(); } }}>
          <DialogHeader className="px-6 pt-5 pb-4 border-b text-left">
            <DialogTitle>Đánh giá CSAT</DialogTitle>
            <DialogDescription>Cấu hình cách khách hàng đánh giá trải nghiệm khi kết thúc hội thoại.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Thông tin đánh giá</h3>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Xem kết quả CSAT trong Lịch sử"
                        onClick={() => { onClose(); openHistory(); }}>
                        <Icon icon={Analytics01Icon} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Xem kết quả trong Lịch sử</TooltipContent>
                  </Tooltip>
                  <Switch checked={draft.enabled} disabled={readOnly} onCheckedChange={v => setDraft(d => ({ ...d, enabled: v }))} aria-label="Bật đánh giá CSAT" />
                </div>
              </div>
              {!draft.enabled && initial.enabled && csatReminders > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-warning" role="status">
                  <Icon icon={Alert02Icon} size={13} className="mt-0.5 shrink-0" />
                  <span>{csatReminders} reminder đang bật CSAT sẽ gửi tin nhắc không kèm đánh giá.</span>
                </p>
              )}
              {field({ key: "buttonTitle", label: "Tiêu đề nút", hint: "Nhãn nút gửi kèm tin nhắc, bấm để mở webview đánh giá." })}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Nội dung webview</h3>
              {FIELDS.slice(0, 2).map(field)}
              <div>
                <p className="text-sm font-medium">Thang đánh giá</p>
                <div className="mt-1.5 flex items-center gap-1" role="img" aria-label="Thang 5 sao">
                  {[1, 2, 3, 4, 5].map(i => <Icon key={i} icon={StarIcon} size={20} className="text-warning" />)}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Cố định 5 sao. Khách chọn từ 1 đến 5 sao.</p>
              </div>
              {FIELDS.slice(2).map(field)}
            </section>

            <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              <Icon icon={Alert02Icon} size={13} className="mt-0.5 shrink-0 text-warning" />
              <span>
                {CSAT_REMINDER_NOTE}{" "}
                {onOpenReminders
                  ? <button type="button" onClick={() => { onClose(); onOpenReminders(); }} className="font-medium text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Nhắc nhở</button>
                  : null}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
            <p className="min-w-0 text-xs text-muted-foreground">{readOnly ? "Bạn chỉ có quyền xem." : "Lưu vào bản nháp. Có hiệu lực sau khi Publish."}</p>
            <div className="flex shrink-0 gap-2">
              {readOnly
                ? <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
                : <>
                    <Button type="button" variant="outline" onClick={requestClose}>Hủy</Button>
                    <Button type="button" onClick={save} disabled={configured && !dirty}>Lưu</Button>
                  </>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi chưa lưu?</AlertDialogTitle>
            <AlertDialogDescription>Những gì bạn vừa sửa trong cấu hình CSAT sẽ mất.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục sửa</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirmDiscard(false); onClose(); }}>Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
