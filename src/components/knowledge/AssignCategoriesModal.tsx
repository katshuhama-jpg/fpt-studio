import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { knowledgeFaqStore, type CategoryOption, type KnowledgeFaq } from "./knowledgeFaqStore";
import CategoryChipsInput from "./CategoryChipsInput";

const MAX_CATEGORIES = 10;
const CATEGORY_MAX = 30;

type ApplyMode = "add" | "replace";

/** Bulk "Gán danh mục" — applies the chosen categories to every selected FAQ, either merging
 * with (default) or replacing each row's existing categories, per the "Cách áp dụng" radio.
 * Purely metadata: never touches processing status or triggers re-ingest. */
export default function AssignCategoriesModal({ open, targets, options, onClose, onDone }: {
  open: boolean; targets: KnowledgeFaq[]; options: CategoryOption[]; onClose: () => void; onDone: () => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [mode, setMode] = useState<ApplyMode>("add");
  const [maxMsg, setMaxMsg] = useState(false);

  const lengthError = categories.some(c => c.length > CATEGORY_MAX) ? `Mỗi danh mục tối đa ${CATEGORY_MAX} ký tự.` : null;

  const overflow = mode === "add" && categories.length > 0 && targets.some(f => {
    const merged = new Set(f.categories.map(c => c.toLowerCase()));
    for (const c of categories) merged.add(c.toLowerCase());
    return merged.size > MAX_CATEGORIES;
  });
  const overflowMsg = overflow ? "Một số câu hỏi sẽ vượt quá 10 danh mục. Hãy bớt danh mục hoặc chọn cách \"Thay thế toàn bộ danh mục\"." : null;

  const error = lengthError || overflowMsg;
  const canSubmit = categories.length > 0 && !error;

  const close = () => { setCategories([]); setMode("add"); onClose(); };

  const submit = () => {
    if (!canSubmit) return;
    knowledgeFaqStore.assignCategories(targets.map(f => f.id), categories, mode);
    toast.success(`Đã cập nhật danh mục cho ${targets.length} câu hỏi.`);
    setCategories([]);
    setMode("add");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && close()}>
      <DialogContent className="sm:max-w-[460px]" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Gán danh mục cho {targets.length} câu hỏi</DialogTitle>
        </DialogHeader>
        <div className="py-1 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Danh mục</label>
            <CategoryChipsInput
              value={categories}
              onChange={next => { setCategories(next); setMaxMsg(false); }}
              options={options}
              maxCount={MAX_CATEGORIES}
              onMaxAttempt={() => setMaxMsg(true)}
            />
            {maxMsg && <p className="text-xs text-warning mt-1">Chỉ gắn được tối đa {MAX_CATEGORIES} danh mục cho một câu hỏi.</p>}
            {lengthError && <p className="text-xs text-destructive mt-1">{lengthError}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Cách áp dụng</label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                <input type="radio" name="assign-mode" checked={mode === "add"} onChange={() => setMode("add")} className="mt-0.5 accent-primary" />
                <div>
                  <div className="text-sm font-medium">Thêm vào danh mục hiện có</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Giữ nguyên danh mục cũ và thêm danh mục mới.</div>
                </div>
              </label>
              <label className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                <input type="radio" name="assign-mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-0.5 accent-primary" />
                <div>
                  <div className="text-sm font-medium">Thay thế toàn bộ danh mục</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Xóa danh mục cũ của các câu hỏi đang chọn và chỉ giữ danh mục mới.</div>
                </div>
              </label>
            </div>
            {mode === "replace" && (
              <p className="text-xs text-warning mt-2">Danh mục cũ của {targets.length} câu hỏi sẽ bị xóa.</p>
            )}
          </div>

          {overflowMsg && <p className="text-xs text-destructive">{overflowMsg}</p>}
          <p className="text-xs text-muted-foreground leading-relaxed">Thay đổi danh mục không cần xử lý lại.</p>
        </div>
        <DialogFooter>
          <button onClick={close} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Áp dụng</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
