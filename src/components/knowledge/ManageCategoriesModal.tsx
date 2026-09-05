import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { knowledgeFaqStore } from "./knowledgeFaqStore";

const CATEGORY_MAX = 30;

/** "Quản lý danh mục" — kept out of the primary FAQ toolbar path. Lists every category in this
 * Kho tri thức with its usage count, and lets the user rename, delete, or merge them. Categories
 * are free-typed elsewhere, so a real KB accumulates near-duplicates ("Tài khoản" / "tài khoản")
 * — merge exists specifically so the category filter doesn't degrade into noise. */
export default function ManageCategoriesModal({ open, kbId, onClose, onChanged }: {
  open: boolean; kbId: string; onClose: () => void; onChanged: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; count: number } | null>(null);
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set());
  const [showMerge, setShowMerge] = useState(false);
  void tick;
  const refresh = () => setTick(t => t + 1);

  const options = knowledgeFaqStore.listCategoriesWithCounts(kbId);

  const startRename = (name: string) => { setRenaming(name); setRenameValue(name); };
  const cancelRename = () => { setRenaming(null); setRenameValue(""); };
  const renameError = renaming && renameValue.trim() && renameValue.trim().toLowerCase() !== renaming.toLowerCase()
    && options.some(o => o.name.toLowerCase() === renameValue.trim().toLowerCase())
    ? "Danh mục này đã tồn tại."
    : null;

  const commitRename = () => {
    if (!renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed || renameError) return;
    if (trimmed !== renaming) {
      knowledgeFaqStore.renameCategory(kbId, renaming, trimmed);
      toast.success("Đã đổi tên danh mục.");
      onChanged();
    }
    cancelRename();
    refresh();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    knowledgeFaqStore.deleteCategory(kbId, deleteTarget.name);
    toast.success("Đã xóa danh mục.");
    setDeleteTarget(null);
    onChanged();
    refresh();
  };

  const toggleMerge = (name: string) => setMergeSelection(prev => {
    const n = new Set(prev);
    n.has(name) ? n.delete(name) : n.add(name);
    return n;
  });

  const close = () => { setMergeSelection(new Set()); cancelRename(); setDeleteTarget(null); onClose(); };

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && close()}>
        <SheetContent className="w-full sm:max-w-[440px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Quản lý danh mục</SheetTitle>
          </SheetHeader>

          {options.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <p className="text-sm text-muted-foreground">Chưa có danh mục nào. Danh mục được tạo khi bạn gắn vào câu hỏi.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto mt-2 -mx-1 px-1">
              {options.map(o => (
                <div key={o.name} className="group flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-surface-muted transition-base">
                  <input
                    type="checkbox"
                    checked={mergeSelection.has(o.name)}
                    onChange={() => toggleMerge(o.name)}
                    className="w-3.5 h-3.5 accent-primary shrink-0"
                    aria-label={`Chọn ${o.name} để gộp`}
                  />
                  {renaming === o.name ? (
                    <div className="flex-1 min-w-0">
                      <input
                        autoFocus
                        value={renameValue}
                        maxLength={CATEGORY_MAX}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }}
                        className="w-full h-8 px-2 rounded-md border border-primary bg-white text-sm outline-none"
                      />
                      {renameError && <p className="text-xs text-destructive mt-0.5">{renameError}</p>}
                    </div>
                  ) : (
                    <span className="flex-1 min-w-0 truncate text-sm font-medium">{o.name}</span>
                  )}
                  {renaming === o.name ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={commitRename} disabled={!renameValue.trim() || !!renameError} className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:pointer-events-none">Lưu</button>
                      <button onClick={cancelRename} className="text-xs font-semibold text-muted-foreground hover:underline">Hủy</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground shrink-0">{o.count} câu hỏi</span>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-base">
                        <button onClick={() => startRename(o.name)} aria-label={`Đổi tên ${o.name}`} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-base">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget({ name: o.name, count: o.count })} aria-label={`Xóa ${o.name}`} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {mergeSelection.size >= 2 && (
            <div className="flex items-center gap-3 mt-2 px-3 h-11 rounded-lg bg-primary-soft border border-primary/15 shrink-0">
              <span className="text-sm font-medium text-primary">Đã chọn {mergeSelection.size} danh mục</span>
              <button onClick={() => setShowMerge(true)} className="text-xs font-semibold text-primary hover:underline ml-auto">Gộp danh mục</button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa danh mục này?</AlertDialogTitle>
            <AlertDialogDescription>
              Danh mục "{deleteTarget?.name}" sẽ được gỡ khỏi {deleteTarget?.count} câu hỏi. Nội dung câu hỏi không bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>Xóa danh mục</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showMerge && (
        <MergeCategoriesModal
          kbId={kbId}
          names={[...mergeSelection]}
          onClose={() => setShowMerge(false)}
          onDone={() => { setShowMerge(false); setMergeSelection(new Set()); onChanged(); refresh(); }}
        />
      )}
    </>
  );
}

function MergeCategoriesModal({ kbId, names, onClose, onDone }: {
  kbId: string; names: string[]; onClose: () => void; onDone: () => void;
}) {
  const [keep, setKeep] = useState(names[0]);

  const submit = () => {
    knowledgeFaqStore.mergeCategories(kbId, names, keep);
    toast.success(`Đã gộp thành danh mục "${keep}".`);
    onDone();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Gộp {names.length} danh mục</DialogTitle>
        </DialogHeader>
        <div className="py-1 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">Các câu hỏi đang dùng những danh mục này sẽ chuyển sang danh mục bạn giữ lại.</p>
          <div className="space-y-1.5">
            {names.map(name => (
              <label key={name} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                <input type="radio" name="merge-keep" checked={keep === name} onChange={() => setKeep(name)} className="accent-primary" />
                <span className="text-sm font-medium truncate">{name}</span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} className="btn-primary h-9">Gộp</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
