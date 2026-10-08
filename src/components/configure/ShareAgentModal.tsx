import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccessScopeSection, type AccessCopy } from "@/components/knowledge/QueryScopeSection";
import MemberPicker from "@/components/knowledge/MemberPicker";
import type { SharedPerson, SharingMode } from "@/components/knowledge/knowledgeBaseStore";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { useRoles } from "@/pages/organization/rolesStore";
import { DEFAULT_ROLE_ID } from "@/pages/organization/Members";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { getAgent } from "./agentStore";
import { agentShareStore } from "./agentShareStore";
import { notificationStore } from "@/components/notifications/notificationStore";
import { currentPersona } from "@/lib/demoPersona";

const AGENT_SHARE_COPY: AccessCopy = {
  title: "Ai được vào Agent này",
  description: "Người được chia sẻ mở được Agent này trong Console. Xem hay chỉnh sửa tùy theo Vai trò của họ.",
  agentDescription: "Người được chia sẻ mở được Agent này trong Console. Xem hay chỉnh sửa tùy theo Vai trò của họ.",
  allHelper: "Mọi thành viên Space đều mở được Agent này.",
  specificHelper: "Chỉ người bạn chọn mới mở được Agent này.",
  privateHelper: "Không chia sẻ. Chỉ bạn và Admin mở được Agent này.",
  switchHelper: "Bật để người khác trong Space mở được Agent này.",
};

/** Only the Agent's owner, or someone whose Role publishes Agents across the whole Console
 * (Admin by default), can change who an Agent is shared with. Read from the Roles config, not
 * the role name, so a custom Admin-like role works the same. */
export function useCanShareAgent(agentId: string) {
  const access = useGroupAccess("agents");
  const a = getAgent(agentId);
  if (agentId === "new") return false;
  if (a.ownerId === access.userId) return true;
  return access.hasPermission("publish") && access.scopeOf("publish") === "all";
}

/** What a member's Role lets them do on an Agent shared with them. */
export function useAgentRoleAbility() {
  const { roles } = useRoles();
  const { tree } = useOrg();
  const members = useMemo(() => new Map(collectMembers(tree).map(m => [m.id, m])), [tree]);
  return (userId: string): "edit" | "view" => {
    const m = members.get(userId);
    const role = roles.find(r => r.id === (m?.roleId ?? DEFAULT_ROLE_ID));
    return role?.permissionIds.has("agents.manage") ? "edit" : "view";
  };
}

export function AgentAbilityChip({ ability }: { ability: "edit" | "view" }) {
  return ability === "edit"
    ? <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary-soft text-primary shrink-0">Chỉnh sửa</span>
    : <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-surface-muted text-muted-foreground border border-border shrink-0">Chỉ xem</span>;
}

export default function ShareAgentModal({ agentId, open, onClose }: { agentId: string; open: boolean; onClose: () => void }) {
  const agent = getAgent(agentId);
  const { tree } = useOrg();
  const { userId } = useMyPermissions();
  const abilityOf = useAgentRoleAbility();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const owner = members.find(m => m.id === agent.ownerId);

  const initial = agentShareStore.get(agentId);
  const [mode, setMode] = useState<SharingMode>(initial.mode);
  const [people, setPeople] = useState<SharedPerson[]>(() => initial.people.map(id => {
    const m = members.find(x => x.id === id);
    return { userId: id, name: m?.name ?? id, email: m?.email ?? "", access: "view" };
  }));
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [confirmNarrow, setConfirmNarrow] = useState(false);

  const removedCount = initial.mode === "specific"
    ? initial.people.filter(id => mode !== "specific" ? mode === "private" : !people.some(p => p.userId === id)).length
    : 0;
  const narrowing = (initial.mode === "all" && mode !== "all") || removedCount > 0;

  const apply = () => {
    const nextPeople = mode === "specific" ? people.map(p => p.userId) : [];
    agentShareStore.set(agentId, { mode, people: nextPeople });
    // Tell each newly added person (not the whole Space — that would flood every bell).
    const added = nextPeople.filter(id => !(initial.mode === "specific" && initial.people.includes(id)));
    if (added.length) {
      const actor = currentPersona();
      notificationStore.push({
        kind: "agent_shared", recipients: added, actorId: actor.id, actorName: actor.name,
        title: `${actor.name} đã chia sẻ Agent ${agent.name} với bạn`,
        segments: [[actor.name, true], [" đã chia sẻ Agent "], [agent.name, true], [" với bạn"]],
        href: `/agents/${agentId}`, resourceId: agentId,
      });
    }
    toast.success("Đã lưu thay đổi.");
    onClose();
  };
  const save = () => {
    setSubmitAttempted(true);
    if (mode === "specific" && people.length === 0) return;
    if (narrowing) { setConfirmNarrow(true); return; }
    apply();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-[520px]" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Chia sẻ Agent</DialogTitle>
            <DialogDescription>{agent.name}</DialogDescription>
          </DialogHeader>
          <div className="py-1">
            <AccessScopeSection
              mode={mode}
              people={people}
              onModeChange={setMode}
              onPeopleChange={setPeople}
              submitAttempted={submitAttempted}
              ownerRow={{ name: owner?.name ?? "Bạn", email: owner?.email ?? "" }}
              copy={AGENT_SHARE_COPY}
              defaultSharedMode="specific"
              hideAudience
              picker={
                <MemberPicker
                  value={people}
                  onChange={setPeople}
                  ownerRow={{ name: owner?.name ?? "Bạn", email: owner?.email ?? "" }}
                  excludeUserIds={[agent.ownerId ?? "", userId]}
                  renderMeta={id => <AgentAbilityChip ability={abilityOf(id)} />}
                />
              }
            />
            <p className="text-xs text-muted-foreground mt-3">Chia sẻ để cùng xây dựng Agent trong Console. Ai được trò chuyện với Agent sẽ chọn khi Publish.</p>
          </div>
          <DialogFooter>
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
            <button onClick={save} className="btn-primary h-9">Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmNarrow} onOpenChange={setConfirmNarrow}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mode === "private" ? "Tắt chia sẻ?" : "Thu hẹp người được vào?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {mode === "private"
                ? "Chỉ bạn và Admin còn mở được Agent này."
                : initial.mode === "all"
                  ? "Chỉ người trong danh sách còn mở được Agent này."
                  : `${removedCount} người sẽ không mở được Agent này nữa.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirmNarrow(false); apply(); }}>
              {mode === "private" ? "Tắt chia sẻ" : "Thu hẹp"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
