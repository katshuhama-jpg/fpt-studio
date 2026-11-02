import { useState } from "react";
import { Gauge, Lock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtNum, usageStore, useBuildCap } from "@/lib/usageStore";

const REASON_MAX = 200;

/** Form "Xin thêm hạn mức" - người dùng Console gửi Space Admin duyệt. */
export function BuildCapRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const n = amount ? Number(amount) : null;
  const amountErr = amount && (!n || n <= 0) ? "Nhập số credit lớn hơn 0." : null;
  const reasonErr = !reason.trim() ? "Cho Admin biết vì sao bạn cần thêm hạn mức." : reason.length > REASON_MAX ? `Lý do tối đa ${REASON_MAX} ký tự.` : null;
  const reset = () => { setAmount(""); setReason(""); setTouched(false); };
  const submit = () => {
    setTouched(true);
    if (amountErr || reasonErr) return;
    usageStore.requestBuildCap(n, reason.trim());
    toast.success("Đã gửi yêu cầu. Bạn sẽ nhận thông báo khi Admin duyệt.");
    reset(); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Xin thêm hạn mức chạy thử</DialogTitle>
          <DialogDescription>Space Admin sẽ duyệt và có thể đổi số credit. Hạn mức thêm chỉ dùng trong kỳ này.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <label htmlFor="cap-amount" className="text-sm font-medium mb-1.5 block">Số credit muốn thêm</label>
            <input id="cap-amount" inputMode="numeric" value={n ? fmtNum(n) : amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Ví dụ: 5.000" className="ds-input tabular-nums" />
            {touched && amountErr ? <p className="text-xs text-destructive mt-1">{amountErr}</p> : <p className="text-xs text-muted-foreground mt-1">Không bắt buộc. Để trống thì Admin tự quyết số credit.</p>}
          </div>
          <div>
            <label htmlFor="cap-reason" className="text-sm font-medium mb-1.5 block">Lý do <span className="text-destructive">*</span></label>
            <textarea id="cap-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ví dụ: Cần chạy lại bộ test trước khi triển khai Nhân sự số CSKH thứ Sáu này" className="ds-textarea resize-none" />
            <div className="flex justify-between gap-2">
              {touched && reasonErr ? <p className="text-xs text-destructive mt-1">{reasonErr}</p> : <span />}
              <span className="text-xs text-muted-foreground tabular-nums mt-1">{reason.length}/{REASON_MAX}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => { reset(); onClose(); }} className="btn-secondary">Hủy</button>
          <button type="button" onClick={submit} disabled={touched && !!(amountErr || reasonErr)} className="btn-primary disabled:opacity-40 disabled:pointer-events-none">Gửi yêu cầu</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Báo hạn mức chạy thử của người đang đăng nhập (Test run, Refine với AI, chạy bộ test).
 * Từ 80% hiện dòng nhắc; chạm trần thì hiện khối khóa + nút Xin thêm hạn mức.
 */
export function BuildCapNotice({ className = "" }: { className?: string }) {
  const b = useBuildCap();
  const [open, setOpen] = useState(false);
  if (!b.cap || !b.near) return null;
  if (!b.blocked) return (
    <div role="status" className={`rounded-lg border border-warning/30 bg-[hsl(var(--warning-soft))] px-3 py-2 text-xs text-[hsl(var(--warning-strong))] flex gap-2 ${className}`}>
      <Gauge size={13} className="shrink-0 mt-0.5" aria-hidden />
      <span>Bạn đã dùng {Math.round(b.pct * 100)}% hạn mức chạy thử tháng này ({fmtNum(b.used)} / {fmtNum(b.cap)} credit).</span>
    </div>
  );
  return (
    <div role="alert" className={`rounded-lg border border-destructive/30 bg-[hsl(var(--destructive-soft))] px-3 py-2.5 text-xs text-[hsl(var(--destructive-strong))] ${className}`}>
      <div className="flex gap-2">
        <Lock size={13} className="shrink-0 mt-0.5" aria-hidden />
        <span><b>Bạn đã dùng hết hạn mức chạy thử tháng này ({fmtNum(b.cap)} credit).</b> Chạy thử, Refine với AI và chạy bộ test tạm khóa với bạn. Nhân sự số đã triển khai vẫn chạy bình thường.</span>
      </div>
      <div className="mt-2 pl-5">
        {b.pending
          ? <span className="chip chip-warning">Đã gửi yêu cầu, chờ Admin duyệt</span>
          : <button type="button" onClick={() => setOpen(true)} className="btn-primary h-7 px-3 text-xs">Xin thêm hạn mức</button>}
      </div>
      <BuildCapRequestDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
