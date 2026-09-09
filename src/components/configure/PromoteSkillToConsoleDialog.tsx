import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { agentSkillStore } from "./agentSkillStore";
import type { Skill } from "./skillStore";
import { type Sharing, type SharingMode } from "./skillSharing";
import SkillMemberPicker from "./SkillMemberPicker";

const NAME_MAX = 60;
const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được skill này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

/** "Chuyển thành skill chung" — promotes an Agent-private skill into the Console list,
 * re-linking this Agent to the new Console record. Field-for-field port of
 * PromoteToConsoleDialog.tsx / PromoteGuardrailToConsoleDialog.tsx. */
export default function PromoteSkillToConsoleDialog({ agentId, item, currentUser, onClose, onPromoted }: {
  agentId: string; item: Skill; currentUser: { name: string; email: string };
  onClose: () => void; onPromoted?: (skillId: string) => void;
}) {
  const [name, setName] = useState(item.name.slice(0, NAME_MAX));
  const [mode, setMode] = useState<SharingMode>("private");
  const [people, setPeople] = useState<Sharing["people"]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const canSubmit = name.trim().length > 0 && (mode !== "specific" || people.length > 0);

  const submit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    const sharing: Sharing = { mode, people: mode === "specific" ? people : [] };
    const result = agentSkillStore.promoteToConsole(agentId, item.id, sharing);
    if (result) {
      toast.success(`Đã chuyển thành skill chung "${name.trim()}".`, {
        action: { label: "Mở skill", onClick: () => { window.location.href = `/tools/${result.skillId}`; } },
      });
      onPromoted?.(result.skillId);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Chuyển thành skill chung</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Skill sẽ được chuyển sang mục Skills của Console và vẫn liên kết với Agent này.
        </p>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Tên skill <span className="text-destructive">*</span></label>
            <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
          </div>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={e => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Quyền truy cập</label>
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
                      <SkillMemberPicker value={people} onChange={setPeople} ownerRow={{ name: currentUser.name, email: currentUser.email }} />
                      {submitAttempted && people.length === 0 && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Chuyển</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
