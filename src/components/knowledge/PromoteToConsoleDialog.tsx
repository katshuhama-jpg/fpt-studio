import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { knowledgeStore, type KnowledgeItem } from "./knowledgeStore";
import { CURRENT_USER, type Sharing, type SharingMode } from "./knowledgeBaseStore";
import MemberPicker from "./MemberPicker";

const NAME_MAX = 50;
const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được kho này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

export default function PromoteToConsoleDialog({ agentId, item, onClose, onPromoted }: {
  agentId: string; item: KnowledgeItem; onClose: () => void; onPromoted?: (kbId: string) => void;
}) {
  const [name, setName] = useState(item.name.slice(0, NAME_MAX));
  const [mode, setMode] = useState<SharingMode>("private");
  const [people, setPeople] = useState<Sharing["people"]>([]);

  const canSubmit = name.trim().length > 0 && (mode !== "specific" || people.length > 0);

  const submit = () => {
    if (!canSubmit) return;
    const sharing: Sharing = { mode, people: mode === "specific" ? people : [] };
    const result = knowledgeStore.promoteToConsole(agentId, item.id, name.trim(), sharing);
    if (result) {
      toast.success(`Đã chuyển thành kho tri thức "${name.trim()}".`, {
        action: { label: "Mở kho", onClick: () => { window.location.href = `/knowledge/${result.kbId}`; } },
      });
      onPromoted?.(result.kbId);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Chuyển thành kho tri thức chung</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Nội dung sẽ được chuyển sang mục Kho tri thức của Console và vẫn liên kết với Agent này.
        </p>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Tên kho tri thức <span className="text-destructive">*</span></label>
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
                      <MemberPicker value={people} onChange={setPeople} ownerRow={{ name: CURRENT_USER.name, email: CURRENT_USER.email }} />
                      {people.length === 0 && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>}
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
