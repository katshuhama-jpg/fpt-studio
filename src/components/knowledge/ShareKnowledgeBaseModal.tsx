import { useState } from "react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { agentsBlockingUnshare, agentsUsing, ResourceInUseDialog } from "@/components/governance/resourceInUseGuard";
import type { AgentRecord } from "@/components/configure/agentStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { type Sharing, type SharingMode } from "./knowledgeBaseStore";
import { AccessScopeSection, ACCESS_COPY } from "./QueryScopeSection";
import { REVOKED_COPY } from "@/components/governance/revokedResources";

/** Generic "Chia sẻ" modal — reused for a Console KB (S4) and for an individual Agent
 * Knowledge item's "Quyền" (S14), so both share the exact same sharing UI and copy instead of
 * drifting into two pickers. The caller owns persistence via onSave. */
export default function ShareKnowledgeBaseModal({
  open, onClose, name, ownerName, sharing: initialSharing, onSave, resourceOwnerId, attachedAgentIds, title = ACCESS_COPY.title, agentOnlyFor: agentOnlyForProp, originAgentName,
}: {
  open: boolean;
  onClose: () => void;
  /** Subtitle under the title — omit for a bulk share (the title's count already says enough). */
  name?: string;
  ownerName: string;
  sharing: Sharing;
  onSave: (sharing: Sharing) => void;
  /** Owner + Agents currently using this resource — narrowing sharing so one of those
   * Agents' owners loses access is blocked (see resourceInUseGuard.tsx). */
  resourceOwnerId?: string;
  attachedAgentIds?: string[];
  title?: string;
  /** Agent id when opened inside an Agent for a resource that Agent owns — adds the
   * "Chỉ Agent này" option (turning sharing off). */
  agentOnlyFor?: string;
  /** Opened from the Space library for a knowledge base created in an Agent: that Agent's name. */
  originAgentName?: string;
}) {
  // Set only inside the Agent a resource was created in. There, turning sharing off on a Space
  // resource takes it back into that Agent ("Chỉ Agent này"); elsewhere it stays in the Space,
  // unshared (only its owner and Admins see it).
  const agentOnlyFor = agentOnlyForProp;
  const takingBack = !!agentOnlyFor && initialSharing.mode !== "private";
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
    toast.success(ACCESS_COPY.toast);
    onClose();
  };

  const save = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    if (mode === "private") {
      // Turning sharing off: allowed, but every OTHER Agent using the knowledge base loses it -
      // confirm first (they show it as "Đã bị thu hồi").
      // Back to one Agent: every other Agent loses it. Space-only owner: other people's Agents do.
      const others = takingBack
        ? agentsUsing((attachedAgentIds ?? []).filter(id => id !== agentOnlyFor))
        : agentsBlockingUnshare(attachedAgentIds, resourceOwnerId, { mode, people: [] });
      if (others.length > 0) { setBlockingAgents(others); return; }
      if (initialSharing.mode !== "private") { setShowRevokeConfirm(true); return; }
      applySave();
      return;
    }
    const blockers = agentsBlockingUnshare(attachedAgentIds, resourceOwnerId, { mode, people: mode === "specific" ? people : [] });
    if (blockers.length > 0) { setBlockingAgents(blockers); return; }
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
        <DialogContent className="sm:max-w-[520px]" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {name && <DialogDescription>{name}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-5 py-1">
            <AccessScopeSection
              mode={mode}
              people={people}
              onModeChange={setMode}
              onPeopleChange={setPeople}
              submitAttempted={submitAttempted}
              ownerRow={{ name: ownerName, email: "" }}
              agentOnly={!!agentOnlyFor}
              agentName={originAgentName}
              hideTitle={title === ACCESS_COPY.title}
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
                <AlertDialogDescription>{agentOnlyFor ? `Chỉ Agent ${originAgentName ? `"${originAgentName}"` : "này"} dùng được kho này.` : `Chỉ ${onlyWho} liên kết được kho này vào Agent.`} Người khác sẽ không liên kết được kho vào Agent của họ nữa.</AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>{ACCESS_COPY.narrowTitle}</AlertDialogTitle>
                <AlertDialogDescription>{initialSharing.mode === "all"
                  ? "Chỉ người trong danh sách còn liên kết được kho này vào Agent."
                  : `${revokedCount} người sẽ không liên kết được kho này vào Agent nữa.`}</AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowRevokeConfirm(false); applySave(); }}>{mode === "private" ? "Tắt chia sẻ" : ACCESS_COPY.narrowAction}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResourceInUseDialog
        open={blockingAgents.length > 0}
        onClose={() => setBlockingAgents([])}
        title={takingBack && mode === "private" ? REVOKED_COPY.takeBackTitle("kho tri thức này") : REVOKED_COPY.confirmTitle("kho tri thức này")}
        description={takingBack && mode === "private" ? REVOKED_COPY.takeBackBody(blockingAgents.length, "kho tri thức này", "kho tri thức") : REVOKED_COPY.confirmBody(blockingAgents.length, "kho tri thức này", "kho tri thức")}
        agents={blockingAgents}
        onConfirm={() => { setBlockingAgents([]); applySave(); }}
        confirmLabel={takingBack && mode === "private" ? REVOKED_COPY.takeBackAction : REVOKED_COPY.confirmAction}
      />
    </>
  );
}
