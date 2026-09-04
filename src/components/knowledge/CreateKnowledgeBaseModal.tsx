import { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  knowledgeBaseStore, CURRENT_USER, type KnowledgeBase, type Sharing, type SharingMode,
} from "./knowledgeBaseStore";
import MemberPicker from "./MemberPicker";

const NAME_MAX = 50;
const DESC_MAX = 256;

const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được kho này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

export default function CreateKnowledgeBaseModal({
  open, onClose, onCreated, editingKb,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (kb: KnowledgeBase) => void;
  editingKb?: KnowledgeBase;
}) {
  const isEdit = !!editingKb;
  const [name, setName] = useState(editingKb?.name ?? "");
  const [description, setDescription] = useState(editingKb?.description ?? "");
  const [sharingMode, setSharingMode] = useState<SharingMode>(editingKb?.sharing.mode ?? "private");
  const [people, setPeople] = useState(editingKb?.sharing.people ?? []);
  const [nameTouched, setNameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const showNameError = nameTouched || submitAttempted;
  const nameError = showNameError
    ? trimmedName.length === 0
      ? "Vui lòng nhập tên kho tri thức."
      : knowledgeBaseStore.isDuplicateName(trimmedName, editingKb?.id)
        ? "Tên kho tri thức đã tồn tại. Vui lòng chọn tên khác."
        : null
    : null;
  const peopleError = sharingMode === "specific" && people.length === 0;

  const isDirty = trimmedName !== (editingKb?.name ?? "") || description.trim() !== (editingKb?.description ?? "") || sharingMode !== (editingKb?.sharing.mode ?? "private");
  const canSubmit = trimmedName.length > 0 && trimmedName.length <= NAME_MAX && (sharingMode !== "specific" || people.length > 0);

  const requestClose = () => {
    if (isDirty) setShowDiscardConfirm(true);
    else onClose();
  };

  const submit = () => {
    setSubmitAttempted(true);
    setNameTouched(true);
    if (!canSubmit) {
      if (trimmedName.length === 0 || knowledgeBaseStore.isDuplicateName(trimmedName, editingKb?.id)) nameRef.current?.focus();
      return;
    }
    if (knowledgeBaseStore.isDuplicateName(trimmedName, editingKb?.id)) return;
    setSubmitting(true);
    setSubmitError(null);
    const sharing: Sharing = { mode: sharingMode, people: sharingMode === "specific" ? people : [] };
    setTimeout(() => {
      try {
        if (isEdit) {
          knowledgeBaseStore.update(editingKb.id, { name: trimmedName, description: description.trim() });
          toast.success(`Đã lưu kho tri thức "${trimmedName}".`);
          onCreated?.(knowledgeBaseStore.get(editingKb.id)!);
        } else {
          const kb = knowledgeBaseStore.create({ name: trimmedName, description: description.trim(), type: "internal", sharing });
          toast.success(`Đã tạo kho tri thức "${trimmedName}".`);
          onCreated?.(kb);
        }
        setSubmitting(false);
        onClose();
      } catch {
        setSubmitting(false);
        setSubmitError("Chưa tạo được kho tri thức. Vui lòng thử lại.");
      }
    }, 500);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) requestClose(); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Chỉnh sửa kho tri thức" : "Tạo kho tri thức"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {submitError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
                <p className="text-xs text-destructive leading-relaxed">{submitError}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Tên kho tri thức <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
              </div>
              <input
                ref={nameRef}
                value={name}
                maxLength={NAME_MAX}
                onChange={e => setName(e.target.value)}
                onBlur={() => { setName(n => n.trim()); setNameTouched(true); }}
                className={`w-full h-10 px-3 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base ${
                  nameError ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
                }`}
              />
              {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Mô tả</label>
                <span className="text-xs text-muted-foreground">{description.length}/{DESC_MAX}</span>
              </div>
              <textarea
                rows={3}
                maxLength={DESC_MAX}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Mô tả ngắn về nội dung kho tri thức này."
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="text-sm font-medium mb-2 block">Quyền truy cập</label>
                <div className="space-y-2">
                  {SHARING_OPTIONS.map(opt => {
                    const selected = sharingMode === opt.value;
                    return (
                      <div key={opt.value}>
                        <div
                          onClick={() => setSharingMode(opt.value)}
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
                            <MemberPicker value={people} onChange={setPeople} ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }} />
                            {peopleError && submitAttempted && (
                              <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button onClick={requestClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "Lưu" : "Tạo"}
            </button>
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
            <AlertDialogAction onClick={() => { setShowDiscardConfirm(false); onClose(); }} className="bg-surface text-foreground border border-border hover:bg-surface-muted">Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
