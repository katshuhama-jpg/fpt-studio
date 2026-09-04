import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { type Sharing, type SharingMode } from "./knowledgeBaseStore";
import MemberPicker from "./MemberPicker";

const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được kho này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

/** Generic "Chia sẻ" modal — reused for a Console KB (S4) and for an individual Agent
 * Knowledge item's "Quyền" (S14), so both share the exact same sharing UI and copy instead of
 * drifting into two pickers. The caller owns persistence via onSave. */
export default function ShareKnowledgeBaseModal({
  open, onClose, name, ownerName, sharing: initialSharing, onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  ownerName: string;
  sharing: Sharing;
  onSave: (sharing: Sharing) => void;
}) {
  const [mode, setMode] = useState<SharingMode>(initialSharing.mode);
  const [people, setPeople] = useState(initialSharing.people);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  const canSubmit = mode !== "specific" || people.length > 0;

  const revokedCount = (() => {
    if (initialSharing.mode === "all" && mode !== "all") {
      // Downgrading from "all" — every previously-shared person loses access.
      return mode === "specific" ? Math.max(0, initialSharing.people.length) : 1;
    }
    const before = new Map(initialSharing.people.map(p => [p.userId, p.access]));
    let count = 0;
    for (const [userId, access] of before) {
      if (access !== "edit") continue;
      const now = people.find(p => p.userId === userId);
      if (!now || now.access !== "edit") count++;
    }
    return count;
  })();

  const applySave = () => {
    const sharing: Sharing = { mode, people: mode === "specific" ? people : [] };
    onSave(sharing);
    toast.success("Đã cập nhật quyền truy cập.");
    onClose();
  };

  const save = () => {
    if (!canSubmit) return;
    const downgrading = initialSharing.mode === "all" && mode !== "all";
    if (downgrading || revokedCount > 0) {
      setShowRevokeConfirm(true);
      return;
    }
    applySave();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Chia sẻ kho tri thức</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div>
              <label className="text-sm font-medium mb-2 block">Ai có quyền truy cập</label>
              <div className="space-y-2">
                {SHARING_OPTIONS.map(opt => {
                  const selected = mode === opt.value;
                  return (
                    <div key={opt.value}>
                      <div
                        onClick={() => setMode(opt.value)}
                        className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
                          selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary" : "border-border"}`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{opt.label}</div>
                          {opt.helper && <div className="text-xs text-muted-foreground mt-0.5">{opt.helper}</div>}
                        </div>
                      </div>
                      {selected && opt.value === "specific" && (
                        <div className="mt-2 pl-3.5">
                          <MemberPicker value={people} onChange={setPeople} ownerRow={{ name: ownerName, email: "" }} />
                          {people.length === 0 && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Quyền này áp dụng cho việc quản lý kho tri thức trong Console. Nó không thay đổi phạm vi tri thức mà người dùng cuối truy vấn được khi trò chuyện với Agent.
            </p>
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
