import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type SharingMode, type SharedPerson } from "./skillSharing";
import SkillMemberPicker from "./SkillMemberPicker";

const NAME_MAX = 60;
const DESC_MAX = 400;
const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được skill này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

export interface SkillFormData {
  name: string; description: string; body: string;
  sharing: { mode: SharingMode; people: SharedPerson[] };
}

/** THE working "Create/edit Skill" flow — Name / Description / Source (same fields as the
 * Console detail drawer), ending with the same "Quyền truy cập" step as Knowledge/Guardrails.
 * Used for creating a Console skill, creating an Agent-private skill, and editing an
 * Agent-private one (Quyền truy cập is create-only, matching CreateKnowledgeBaseModal.tsx's own
 * convention — an existing item's sharing is changed via its own "Chia sẻ" action instead). */
export default function CreateSkillModal({ onClose, onSubmit, initialData, currentUser, isDuplicateName, title = "Create Skill" }: {
  onClose: () => void;
  onSubmit: (data: SkillFormData) => void;
  initialData?: { name: string; description: string; body: string };
  currentUser: { id: string; name: string; email: string };
  isDuplicateName?: (name: string, excludeName?: string) => boolean;
  title?: string;
}) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [sharingMode, setSharingMode] = useState<SharingMode>("private");
  const [people, setPeople] = useState<SharedPerson[]>([]);
  const [nameTouched, setNameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const trimmedName = name.trim();
  const isDuplicate = isDuplicateName ? isDuplicateName(trimmedName, initialData?.name) : false;
  const showNameError = nameTouched || submitAttempted;
  const nameError = showNameError
    ? trimmedName.length === 0
      ? "Vui lòng nhập tên skill."
      : isDuplicate
        ? "Tên skill đã tồn tại. Vui lòng chọn tên khác."
        : null
    : null;
  const peopleError = !isEdit && sharingMode === "specific" && people.length === 0;

  const isDirty = isEdit
    ? trimmedName !== initialData!.name || description !== initialData!.description || body !== initialData!.body
    : trimmedName.length > 0 || description.trim().length > 0 || body.trim().length > 0;
  const canSubmit = trimmedName.length > 0 && trimmedName.length <= NAME_MAX && !isDuplicate && (isEdit || sharingMode !== "specific" || people.length > 0);

  const requestClose = () => {
    if (isDirty) setShowDiscardConfirm(true);
    else onClose();
  };

  const submit = () => {
    setSubmitAttempted(true);
    setNameTouched(true);
    if (!canSubmit) return;
    onSubmit({
      name: trimmedName, description: description.trim(), body,
      sharing: { mode: sharingMode, people: sharingMode === "specific" ? people : [] },
    });
    onClose();
  };

  return (
    <>
      <Dialog open onOpenChange={v => { if (!v) requestClose(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Sửa Skill" : title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
              </div>
              <input
                autoFocus
                value={name}
                maxLength={NAME_MAX}
                onChange={e => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. account-briefing"
                className={`w-full h-10 px-3 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base ${
                  nameError ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
                }`}
              />
              {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Description</label>
                <span className="text-xs text-muted-foreground">{description.length}/{DESC_MAX}</span>
              </div>
              <textarea
                rows={3}
                maxLength={DESC_MAX}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Khi nào Agent nên dùng skill này?"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Source</label>
              <textarea
                rows={8}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={"# Tên skill\n\nHướng dẫn từng bước Agent nên làm theo..."}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm font-mono leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
                spellCheck={false}
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
                            <SkillMemberPicker value={people} onChange={setPeople} ownerRow={{ name: currentUser.name, email: currentUser.email }} />
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
            <button onClick={submit} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">{isEdit ? "Lưu" : "Tạo"}</button>
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
