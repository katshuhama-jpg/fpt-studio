import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Sharing } from "./knowledgeBaseStore";
import PermissionFields, { DEFAULT_SHARING, isPermissionInvalid } from "./PermissionFields";
import type { KnowledgeDocument } from "./knowledgeDocumentStore";

const NAME_MAX = 50;

const same = (a: Sharing, b: Sharing) => a.mode === b.mode && a.people.length === b.people.length && a.people.every((p, i) => p.userId === b.people[i]?.userId && p.access === b.people[i]?.access);

/** "Tạo thư mục mới" / folder edit modal for the Console Documents tab. Unlike the plain
 * name-only CreateFolderModal (still used as-is by the Website tab, which has no permission
 * concept for its folders), this one also shows the two Knowledge permission fields, since a
 * folder's settings become the default a document uploaded into it inherits (see
 * UploadDocumentsModal). Pass `editingFolder` to edit an existing folder's name/permissions
 * instead of creating a new one — changing permissions on an existing, non-empty folder offers
 * an explicit "apply to existing documents too?" choice rather than silently cascading. */
export default function DocumentFolderModal({
  open, isDuplicate, onClose, onCreate, editingFolder, onSaveEdit, existingDocCount = 0,
}: {
  open: boolean;
  isDuplicate: (name: string) => boolean;
  onClose: () => void;
  onCreate?: (name: string, sharing: Sharing, querySharing: Sharing) => void;
  editingFolder?: KnowledgeDocument;
  onSaveEdit?: (name: string, sharing: Sharing, querySharing: Sharing, applyToExisting: boolean) => void;
  existingDocCount?: number;
}) {
  const isEdit = !!editingFolder;
  const [name, setName] = useState("");
  const [sharing, setSharing] = useState<Sharing>(DEFAULT_SHARING);
  const [querySharing, setQuerySharing] = useState<Sharing>(DEFAULT_SHARING);
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ name: string; sharing: Sharing; querySharing: Sharing } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editingFolder?.name ?? "");
    setSharing(editingFolder?.sharing ?? DEFAULT_SHARING);
    setQuerySharing(editingFolder?.querySharing ?? DEFAULT_SHARING);
    setError(null);
  }, [open, editingFolder]);

  const reset = () => { setName(""); setSharing(DEFAULT_SHARING); setQuerySharing(DEFAULT_SHARING); setError(null); };

  const dirty = isEdit
    ? name.trim() !== editingFolder!.name
      || !same(sharing, editingFolder!.sharing ?? DEFAULT_SHARING)
      || !same(querySharing, editingFolder!.querySharing ?? DEFAULT_SHARING)
    : name.trim().length > 0;

  const attemptClose = () => {
    if (dirty) { setShowDiscardConfirm(true); return; }
    reset();
    onClose();
  };

  const validate = (): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Vui lòng nhập tên thư mục.";
    if (isDuplicate(trimmed)) return "Tên thư mục đã tồn tại. Vui lòng chọn tên khác.";
    return null;
  };

  const invalid = isPermissionInvalid(sharing, querySharing);

  const submit = () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (invalid) return;
    const trimmed = name.trim();
    if (isEdit) {
      const permissionsChanged = !same(sharing, editingFolder!.sharing ?? DEFAULT_SHARING) || !same(querySharing, editingFolder!.querySharing ?? DEFAULT_SHARING);
      if (permissionsChanged && existingDocCount > 0) {
        setPendingSave({ name: trimmed, sharing, querySharing });
        setShowApplyConfirm(true);
        return;
      }
      onSaveEdit?.(trimmed, sharing, querySharing, false);
    } else {
      onCreate?.(trimmed, sharing, querySharing);
    }
    reset();
    onClose();
  };

  const finishApplyChoice = (applyToExisting: boolean) => {
    if (pendingSave) onSaveEdit?.(pendingSave.name, pendingSave.sharing, pendingSave.querySharing, applyToExisting);
    setShowApplyConfirm(false);
    setPendingSave(null);
    reset();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && attemptClose()}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEdit ? "Chỉnh sửa thư mục" : "Tạo thư mục mới"}</DialogTitle></DialogHeader>
          <div className="py-1 space-y-4">
            <div>
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

            <PermissionFields sharing={sharing} onSharingChange={setSharing} querySharing={querySharing} onQuerySharingChange={setQuerySharing} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tài liệu tải lên vào thư mục này sẽ mặc định áp dụng hai quyền trên — vẫn có thể chỉnh riêng cho từng tài liệu khi tải lên.
            </p>
          </div>
          <DialogFooter>
            <button onClick={attemptClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={submit} disabled={name.trim().length === 0 || invalid} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">{isEdit ? "Lưu" : "Tạo mới"}</button>
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
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDiscardConfirm(false); reset(); onClose(); }} className="bg-surface text-foreground border border-border hover:bg-surface-muted">Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showApplyConfirm} onOpenChange={v => !v && setShowApplyConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Áp dụng cho {existingDocCount} tài liệu đã có trong thư mục?</AlertDialogTitle>
            <AlertDialogDescription>
              Quyền mới chỉ áp dụng mặc định cho tài liệu tải lên sau này. Bạn có muốn áp dụng luôn cho các tài liệu đã có trong thư mục không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finishApplyChoice(false)} className="bg-surface text-foreground border border-border hover:bg-surface-muted">Chỉ áp dụng cho tài liệu mới</AlertDialogCancel>
            <AlertDialogAction onClick={() => finishApplyChoice(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">Áp dụng cho tất cả</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
