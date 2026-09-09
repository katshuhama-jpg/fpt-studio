import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const NAME_MAX = 100;

export default function CreateWorkforceModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const reset = () => { setName(""); setTouched(false); };
  const close = () => { reset(); onClose(); };

  const submit = () => {
    onCreate(name.trim());
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && close()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Tạo Workforce mới</DialogTitle></DialogHeader>
        <div className="py-1">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Tên Workforce <span className="text-destructive">*</span></label>
            <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
          </div>
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX}
            onChange={e => setName(e.target.value)}
            onBlur={() => { setName(n => n.trim()); setTouched(true); }}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            placeholder="Ví dụ: Điều phối Banking ABC"
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
          />
          {touched && !name.trim() && (
            <p className="text-xs text-muted-foreground mt-1.5">Để trống, hệ thống sẽ đặt tên là "Untitled workforce".</p>
          )}
        </div>
        <DialogFooter>
          <button onClick={close} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} className="btn-primary h-9">Tạo</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
