import { useState } from "react";
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

/** Generic "Chia sẻ" modal — reused for a Console KB (S4) and for an individual Agent
 * Knowledge item's "Quyền" (S14), so both share the exact same sharing UI and copy instead of
 * drifting into two pickers. The caller owns persistence via onSave. */
export default function ShareKnowledgeBaseModal({
  open, onClose, name, ownerName, sharing: initialSharing, onSave, resourceOwnerId, attachedAgentIds, title = ACCESS_COPY.title, agentOnlyFor,
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
}) {
  const [mode, setMode] = useState<SharingMode>(initialSharing.mode === "private" && !agentOnlyFor ? "all" : initialSharing.mode);
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
      // Turning sharing off: blocked while any OTHER Agent still uses this resource.
      const others = agentsUsing((attachedAgentIds ?? []).filter(id => id !== agentOnlyFor));
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
                <AlertDialogDescription>Chỉ Agent này dùng được kho này. Người khác sẽ không liên kết được kho vào Agent của họ nữa.</AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>Thu hẹp quyền truy cập?</AlertDialogTitle>
                <AlertDialogDescription>{initialSharing.mode === "all"
                  ? "Chỉ người trong danh sách còn liên kết được kho này vào Agent."
                  : `${revokedCount} người sẽ không liên kết được kho này vào Agent nữa.`}</AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setShowRevokeConfirm(false); applySave(); }}>{mode === "private" ? "Tắt chia sẻ" : "Thu hẹp quyền truy cập"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResourceInUseDialog
        open={blockingAgents.length > 0}
        onClose={() => setBlockingAgents([])}
        title={mode === "private" ? "Chưa thể tắt chia sẻ" : "Chưa thể thu hẹp quyền truy cập"}
        description={mode === "private" ? "Các Agent dưới đây đang dùng kho tri thức này. Gỡ kho tri thức khỏi các Agent đó trước, rồi tắt chia sẻ." : "Những người dưới đây sẽ mất quyền truy cập trong khi Agent của họ vẫn đang dùng kho tri thức này. Nhờ họ gỡ kho tri thức khỏi Agent trước, rồi đổi quyền truy cập."}
        agents={blockingAgents}
      />
    </>
  );
}
