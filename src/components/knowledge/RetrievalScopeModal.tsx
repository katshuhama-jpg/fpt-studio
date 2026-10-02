import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { QuerySharing } from "./knowledgeBaseStore";
import QueryScopeSection, { RETRIEVAL_COPY, isQueryScopeValid, isRetrievalNarrowing, normalizeQuerySharing } from "./QueryScopeSection";

/** "Quyền truy xuất" popup — edits which end users an Agent may answer with this knowledge.
 * Narrowing (Cả tổ chức → Phòng ban, or removing a department) asks for confirmation first. */
export default function RetrievalScopeModal({ name, value, onSave, onClose }: {
  name?: string;
  value: QuerySharing | undefined;
  onSave: (next: QuerySharing) => void;
  onClose: () => void;
}) {
  const initial = normalizeQuerySharing(value);
  const [draft, setDraft] = useState<QuerySharing>(initial);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [confirmNarrow, setConfirmNarrow] = useState(false);

  const apply = () => {
    onSave({ ...draft, people: [], departmentIds: draft.mode === "department" ? draft.departmentIds : [] });
    toast.success(RETRIEVAL_COPY.toast);
    onClose();
  };
  const save = () => {
    setSubmitAttempted(true);
    if (!isQueryScopeValid(draft)) return;
    if (isRetrievalNarrowing(initial, draft)) { setConfirmNarrow(true); return; }
    apply();
  };

  return (
    <>
      <Dialog open onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{RETRIEVAL_COPY.title}</DialogTitle>
            {name && <DialogDescription>{name}</DialogDescription>}
          </DialogHeader>
          <div className="py-1">
            <QueryScopeSection value={draft} onChange={setDraft} submitAttempted={submitAttempted} hideTitle />
          </div>
          <DialogFooter>
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={save} className="btn-primary h-9">Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmNarrow} onOpenChange={setConfirmNarrow}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hẹp quyền truy xuất?</AlertDialogTitle>
            <AlertDialogDescription>Agent sẽ ngừng trả lời từ kho này cho người ngoài các phòng ban đã chọn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirmNarrow(false); apply(); }}>Thu hẹp quyền</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
