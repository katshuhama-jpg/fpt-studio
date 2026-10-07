import { useState, type ReactNode } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { agentsBlockingUnshare, ResourceInUseDialog } from "@/components/governance/resourceInUseGuard";
import type { AgentRecord } from "@/components/configure/agentStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { REVOKED_COPY } from "@/components/governance/revokedResources";
import { AccessScopeSection, ACCESS_COPY, resourceAccessCopy } from "@/components/knowledge/QueryScopeSection";

type SharingMode = "private" | "all" | "specific";
type SharedPerson = { userId: string; name: string; email: string; access: "view" | "edit" };
type Sharing = { mode: SharingMode; people: SharedPerson[] };

export type PickerProps = { value: SharedPerson[]; onChange: (p: SharedPerson[]) => void; ownerRow: { name: string; email: string } };

/** "Quyền truy cập" popup for Skill, Guardrail, Custom Connector and API Tool — same options,
 * copy and confirmations as Knowledge's popup (ShareKnowledgeBaseModal), worded for the resource.
 * `noun` is how the resource is named in sentences: "skill" / "guardrail" / "kết nối" / "API Tool". */
export default function ResourceAccessModal({
  open, onClose, name, ownerName, sharing: initialSharing, onSave, resourceOwnerId, attachedAgentIds, agentOnlyFor: agentOnlyForProp, originAgentName, noun, renderPicker,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  ownerName: string;
  sharing: Sharing;
  onSave: (sharing: Sharing) => void;
  /** Owner + Agents using this resource — narrowing so one of those Agents' owners loses
   * access asks for confirmation first (see resourceInUseGuard.tsx). */
  resourceOwnerId?: string;
  attachedAgentIds?: string[];
  /** Agent id when opened inside an Agent that owns the resource — adds "Chỉ Agent này". */
  agentOnlyFor?: string;
  /** Opened from the Space library for a resource created in an Agent: that Agent's name. */
  originAgentName?: string;
  noun: string;
  renderPicker: (p: PickerProps) => ReactNode;
}) {
  const it = `${noun} này`;
  // Only a resource that is still the Agent's own (never shared) is "Chỉ Agent này". Once a
  // resource is on the Space, turning sharing off keeps it there (only its owner and Admins see it).
  const agentOnlyFor = initialSharing.mode === "private" ? agentOnlyForProp : undefined;
  // A Space Admin turning off someone else's resource: only its owner keeps linking it.
  const { userId: viewerId } = useMyPermissions();
  const onlyWho = resourceOwnerId && resourceOwnerId !== viewerId ? ownerName : "bạn";
  const [mode, setMode] = useState<SharingMode>(initialSharing.mode);
  const [people, setPeople] = useState(initialSharing.people);
  const [blockingAgents, setBlockingAgents] = useState<AgentRecord[]>([]);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const canSubmit = mode !== "specific" || people.length > 0;
  const revokedCount = (() => {
    if (initialSharing.mode !== "specific" || mode !== "specific") return 0;
    return initialSharing.people.filter(p => !people.some(n => n.userId === p.userId)).length;
  })();
  const narrowingFromAll = initialSharing.mode === "all" && mode === "specific";

  const applySave = () => {
    onSave({ mode, people: mode === "specific" ? people : [] });
    toast.success(ACCESS_COPY.toast);
    onClose();
  };

  const save = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    if (mode === "private") {
      // Turning sharing off: allowed, but confirm when other people's Agents lose the resource.
      const losing = agentsBlockingUnshare((attachedAgentIds ?? []).filter(id => id !== agentOnlyFor), resourceOwnerId, { mode, people: [] });
      if (losing.length > 0) { setBlockingAgents(losing); return; }
      if (initialSharing.mode !== "private") { setShowRevokeConfirm(true); return; }
      applySave();
      return;
    }
    const blockers = agentsBlockingUnshare(attachedAgentIds, resourceOwnerId, { mode, people: mode === "specific" ? people : [] });
    if (blockers.length > 0) { setBlockingAgents(blockers); return; }
    if (narrowingFromAll || revokedCount > 0) { setShowRevokeConfirm(true); return; }
    applySave();
  };

  const ownerRow = { name: ownerName, email: "" };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{resourceAccessCopy(it).title}</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>
          <div className="py-1">
            <AccessScopeSection
              mode={mode}
              people={people}
              onModeChange={setMode}
              onPeopleChange={setPeople}
              submitAttempted={submitAttempted}
              ownerRow={ownerRow}
              agentOnly={!!agentOnlyFor}
              agentName={originAgentName}
              hideTitle
              copy={resourceAccessCopy(it)}
              picker={renderPicker({ value: people, onChange: setPeople, ownerRow })}
            />
          </div>
          <DialogFooter>
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={save} className="btn-primary h-9">Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {mode === "private" ? (
              <>
                <AlertDialogTitle>Tắt chia sẻ?</AlertDialogTitle>
                <AlertDialogDescription>{agentOnlyFor ? `Chỉ Agent ${originAgentName ? `"${originAgentName}"` : "này"} dùng được ${it}.` : `Chỉ ${onlyWho} liên kết được ${it} vào Agent.`} Người khác sẽ không liên kết được vào Agent của họ nữa.</AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>{ACCESS_COPY.narrowTitle}</AlertDialogTitle>
                <AlertDialogDescription>{narrowingFromAll
                  ? `Chỉ người trong danh sách còn liên kết được ${it} vào Agent.`
                  : `${revokedCount} người sẽ không liên kết được ${it} vào Agent nữa.`}</AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowRevokeConfirm(false); applySave(); }}>
              {mode === "private" ? "Tắt chia sẻ" : ACCESS_COPY.narrowAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResourceInUseDialog
        open={blockingAgents.length > 0}
        onClose={() => setBlockingAgents([])}
        title={REVOKED_COPY.confirmTitle(it)}
        description={REVOKED_COPY.confirmBody(blockingAgents.length, it, noun)}
        agents={blockingAgents}
        onConfirm={() => { setBlockingAgents([]); applySave(); }}
        confirmLabel={REVOKED_COPY.confirmAction}
      />
    </>
  );
}
