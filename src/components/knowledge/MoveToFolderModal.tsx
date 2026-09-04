import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check } from "lucide-react";

/** Store-agnostic folder picker for "Di chuyển" — only folders within the same Kho tri thức are
 * selectable, matching the source's own folder list (documents move among document folders,
 * URLs among URL folders). */
export default function MoveToFolderModal({ open, folders, count, rootLabel = "Danh sách chung", onClose, onConfirm }: {
  open: boolean; folders: { id: string; name: string }[]; count: number; rootLabel?: string;
  onClose: () => void; onConfirm: (folderId: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { if (open) setSelected(null); }, [open]);

  const Row = ({ id, label }: { id: string | null; label: string }) => (
    <button
      onClick={() => setSelected(id)}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-base ${
        selected === id ? "bg-primary-soft text-primary font-medium" : "hover:bg-surface-muted"
      }`}
    >
      {label}
      {selected === id && <Check size={14} />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Di chuyển {count > 1 ? `${count} mục` : "mục này"}</DialogTitle></DialogHeader>
        <div className="py-1 space-y-1 max-h-64 overflow-y-auto">
          <Row id={null} label={rootLabel} />
          {folders.map(f => <Row key={f.id} id={f.id} label={f.name} />)}
          {folders.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">Kho tri thức chưa có thư mục nào khác.</p>}
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={() => { onConfirm(selected); onClose(); }} className="btn-primary h-9">Xác nhận</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
