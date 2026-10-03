import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { agentGuardrailStore } from "./agentGuardrailStore";
import type { Guardrail } from "./guardrailConsoleStore";
import { type Sharing, type SharingMode } from "./guardrailSharing";
import GuardrailMemberPicker from "./GuardrailMemberPicker";
import { AccessScopeSection, resourceAccessCopy } from "@/components/knowledge/QueryScopeSection";

const NAME_MAX = 100;

/** "Chuyển thành guardrail chung" — promotes an Agent-private guardrail into the Console list,
 * re-linking this Agent to the new Console record. Field-for-field port of
 * PromoteToConsoleDialog.tsx. */
export default function PromoteGuardrailToConsoleDialog({ agentId, item, currentUser, onClose, onPromoted }: {
  agentId: string; item: Guardrail; currentUser: { name: string; email: string };
  onClose: () => void; onPromoted?: (guardrailId: string) => void;
}) {
  const [name, setName] = useState(item.name.slice(0, NAME_MAX));
  const [mode, setMode] = useState<SharingMode>("all");
  const [people, setPeople] = useState<Sharing["people"]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const canSubmit = name.trim().length > 0 && (mode !== "specific" || people.length > 0);

  const submit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    const sharing: Sharing = { mode, people: mode === "specific" ? people : [] };
    const result = agentGuardrailStore.promoteToConsole(agentId, item.id, sharing);
    if (result) {
      toast.success(`Đã chuyển thành guardrail chung "${name.trim()}".`, {
        action: { label: "Mở guardrail", onClick: () => { window.location.href = `/guardrails?open=${result.guardrailId}`; } },
      });
      onPromoted?.(result.guardrailId);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Chuyển thành guardrail chung</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Guardrail sẽ được chuyển sang mục Guardrails của Console và vẫn liên kết với Agent này.
        </p>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Tên guardrail <span className="text-destructive">*</span></label>
            <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
          </div>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={e => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
          />
        </div>

        <div className="border-t border-border pt-5">
          <AccessScopeSection
            mode={mode} people={people} onModeChange={setMode} onPeopleChange={setPeople}
            submitAttempted={submitAttempted} ownerRow={{ name: currentUser.name, email: currentUser.email }}
            copy={resourceAccessCopy("guardrail này")}
            picker={<GuardrailMemberPicker value={people} onChange={setPeople} ownerRow={{ name: currentUser.name, email: currentUser.email }} />}
          />
        </div>

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Chuyển</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
