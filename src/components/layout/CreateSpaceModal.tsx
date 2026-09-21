import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const NAME_MAX = 100;

/**
 * "Create new Space" — collects just the enterprise/company name. In the real product this
 * step belongs to Super Admin (who provisions the Tenant); this prototype round only builds
 * the Tenant Admin side (the Organization setup wizard that follows), so this modal stands in
 * for "a Super Admin already provisioned this Space" and hands straight to that wizard — see
 * `addTenant` in spaceStore.ts, which creates the Space with an empty, not-yet-configured
 * Organization.
 */
export default function CreateSpaceModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const reset = () => { setName(""); setTouched(false); };
  const close = () => { reset(); onClose(); };

  const nameValid = name.trim().length > 0;

  const submit = () => {
    if (!nameValid) { setTouched(true); return; }
    onCreate(name.trim());
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && close()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Tạo Space mới</DialogTitle></DialogHeader>
        <div className="py-1">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Tên doanh nghiệp <span className="text-destructive">*</span></label>
            <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
          </div>
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX}
            onChange={e => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            placeholder="Ví dụ: Ngân hàng ABC"
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
          />
          {touched && !nameValid && (
            <p className="text-xs text-destructive mt-1.5">Vui lòng nhập tên doanh nghiệp.</p>
          )}
          <p className="text-xs text-muted-foreground mt-2.5">
            Space mới sẽ có Organization trống — bạn sẽ thiết lập ngay sau khi tạo.
          </p>
        </div>
        <DialogFooter>
          <button onClick={close} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} className="btn-primary h-9">Tạo Space</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
