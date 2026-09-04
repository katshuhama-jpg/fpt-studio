import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NAME_MAX = 50;

/** Store-agnostic "Tạo thư mục mới" modal — shared by the Documents and Website tabs, each of
 * which passes its own existing folder names (for duplicate checking) and its own creation
 * callback (which store, and any highlight/toast behavior, is the caller's concern). */
export default function CreateFolderModal({ open, existingNames, onClose, onCreate }: {
  open: boolean; existingNames: string[]; onClose: () => void; onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const reset = () => { setName(""); setError(null); };

  const attemptClose = () => {
    if (name.trim().length > 0) { setShowDiscardConfirm(true); return; }
    reset();
    onClose();
  };

  const validate = (): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Vui lòng nhập tên thư mục.";
    if (existingNames.some(n => n.trim().toLowerCase() === trimmed.toLowerCase())) return "Tên thư mục đã tồn tại. Vui lòng chọn tên khác.";
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) { setError(err); return; }
    onCreate(name.trim());
    reset();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && attemptClose()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Tạo thư mục mới</DialogTitle></DialogHeader>
          <div className="py-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Tên thư mục <span className="text-destructive">*</span></label>
              <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
            </div>
            <input
              autoFocus
              value={name}
              maxLength={NAME_MAX}
              onChange={e => { setName(e.target.value); setError(null); }}
              onBlur={() => setName(n => n.trim())}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              className={`w-full h-10 px-3 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base ${error ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
            />
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
          <DialogFooter>
            <button onClick={attemptClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={submit} disabled={name.trim().length === 0} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Tạo mới</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>Thông tin bạn vừa nhập sẽ không được lưu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDiscardConfirm(false); reset(); onClose(); }}>Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
