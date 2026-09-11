import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { type Sharing } from "./knowledgeBaseStore";
import PermissionFields, { isPermissionInvalid } from "./PermissionFields";

/** Generic "Chia sẻ" modal — reused for a Console KB (S4) and for an individual document/Agent
 * Knowledge item's "Quyền" (S14), so both share the exact same sharing UI and copy instead of
 * drifting into two pickers. The caller owns persistence via onSave. */
export default function ShareKnowledgeBaseModal({
  open, onClose, name, ownerName, sharing: initialSharing, querySharing: initialQuerySharing, onSave, title = "Chia sẻ kho tri thức",
}: {
  open: boolean;
  onClose: () => void;
  /** Subtitle under the title — omit for a bulk share (the title's count already says enough). */
  name?: string;
  ownerName: string;
  sharing: Sharing;
  /** Omit for a whole Console KB share (no query-scope concept there); pass the document/item's
   * current query scope (defaulting to `{ mode: "private", people: [] }` when unset) to also
   * show and edit the "Phạm vi trả lời của Agent" section below. */
  querySharing?: Sharing;
  onSave: (sharing: Sharing, querySharing?: Sharing) => void;
  title?: string;
}) {
  const [sharing, setSharing] = useState<Sharing>(initialSharing);
  const [querySharing, setQuerySharing] = useState<Sharing>(initialQuerySharing ?? { mode: "private", people: [] });
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const canSubmit = !isPermissionInvalid(sharing, initialQuerySharing ? querySharing : undefined);

  const revokedCount = (() => {
    if (initialSharing.mode === "all" && sharing.mode !== "all") {
      // Downgrading from "all" — every previously-shared person loses access.
      return sharing.mode === "specific" ? Math.max(0, initialSharing.people.length) : 1;
    }
    const before = new Map(initialSharing.people.map(p => [p.userId, p.access]));
    let count = 0;
    for (const [userId, access] of before) {
      if (access !== "edit") continue;
      const now = sharing.people.find(p => p.userId === userId);
      if (!now || now.access !== "edit") count++;
    }
    return count;
  })();

  const applySave = () => {
    onSave(sharing, initialQuerySharing ? querySharing : undefined);
    toast.success("Đã cập nhật quyền truy cập.");
    onClose();
  };

  const save = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    const downgrading = initialSharing.mode === "all" && sharing.mode !== "all";
    if (downgrading || revokedCount > 0) {
      setShowRevokeConfirm(true);
      return;
    }
    applySave();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[520px]" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {name && <DialogDescription>{name}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-5 py-1">
            <PermissionFields
              sharing={sharing}
              onSharingChange={setSharing}
              querySharing={initialQuerySharing ? querySharing : undefined}
              onQuerySharingChange={initialQuerySharing ? setQuerySharing : undefined}
              showErrors={submitAttempted}
              ownerRow={{ name: ownerName, email: "" }}
            />
          </div>

          <DialogFooter>
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={save} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hồi quyền truy cập?</AlertDialogTitle>
            <AlertDialogDescription>{revokedCount} người sẽ không còn xem được kho tri thức này.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowRevokeConfirm(false); applySave(); }}>Thu hồi quyền</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
