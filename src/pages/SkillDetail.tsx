import { useMemo, useState } from "react";
import { agentsUsing, ResourceInUseDialog } from "@/components/governance/resourceInUseGuard";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MoreHorizontal, Puzzle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { useAgentContextAccess } from "@/components/governance/agentContextAccess";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { skillStore } from "@/components/configure/skillStore";
import { isAccessibleTo, isViewOnly, type Sharing } from "@/components/configure/skillSharing";
import SkillOwnershipTag from "@/components/configure/SkillOwnershipTag";
import CreateSkillModal, { type SkillFormData } from "@/components/configure/CreateSkillModal";
import SkillShareModal from "@/components/configure/SkillShareModal";
import RequestPublishModal from "@/components/governance/RequestPublishModal";
import { governanceStore } from "@/components/governance/governanceStore";
import { StatusBadge } from "@/components/governance/governanceUi";
import { Rocket } from "lucide-react";
import { renderSkillBody } from "@/components/configure/skillMarkdown";

/** Dedicated detail page for a single Console skill — same structure as KnowledgeDetail.tsx
 * (breadcrumb, header with icon/name/description/ownership tag/"..." menu), so a skill's full
 * content is reachable at its own URL instead of only through the list's inline sheet. */
export default function SkillDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const access = useGroupAccess("skills");
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const currentUser = useMemo(() => {
    const me = members.find(m => m.id === access.userId);
    return { id: access.userId, name: me?.name ?? "Tran Nam", email: me?.email ?? "tran.nam@fpt.com" };
  }, [members, access.userId]);

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;
  const skill = skillStore.get(id);
  // Opened from an Agent that uses this skill (?viaAgent=) — read-only access even when the
  // skill isn't shared with the viewer (see agentContextAccess.tsx).
  const agentCtx = useAgentContextAccess(skill?.attachedByAgentIds);

  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (!skill) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <Puzzle size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">Skill này không tồn tại hoặc đã bị xóa.</p>
        <Link to="/tools" className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base flex items-center">
          Về Skills
        </Link>
      </div>
    );
  }

  // A role whose Skills View Scope is "Own & Shared" (or with no View permission at all) can't
  // reach a skill it doesn't own and wasn't shared with just by typing its URL.
  const viaAgentOnly = !access.canSeeAll && !isAccessibleTo(skill.sharing, skill.ownerId, access.userId);
  // Agent context counts as inside the viewer's scope; they still need "View skills" or
  // "Build skills" (Build implies seeing what you edit — the default Builder role has no View).
  if (viaAgentOnly && (!agentCtx.allowed || !(access.hasPermission("view") || access.hasPermission("manage")))) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <Puzzle size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">Bạn không có quyền truy cập skill này. Liên hệ {skill.ownerName} nếu cần được chia sẻ quyền truy cập.</p>
        <Link to="/tools" className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base flex items-center">
          Về Skills
        </Link>
      </div>
    );
  }

  const isOwner = skill.ownerId === access.userId;
  // Reached through an Agent that uses it: treat as inside the viewer's Own & Shared scope, and
  // let their Role's "Build skills" decide editing (the per-person share access doesn't apply).
  const accessible = isAccessibleTo(skill.sharing, skill.ownerId, access.userId) || (viaAgentOnly && agentCtx.allowed);
  const viewOnly = !isOwner && !viaAgentOnly && isViewOnly(skill.sharing, skill.ownerId, access.userId);
  const canEdit = access.canAct("manage", accessible) && !viewOnly;
  const canShare = isOwner && access.canAct("publish", accessible);
  const canDelete = isOwner && access.canAct("delete", accessible);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border bg-surface px-4 sm:px-6 pt-4 pb-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate("/tools")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <ChevronLeft size={16} />
          </button>
          <Link to="/tools" className="text-sm text-muted-foreground hover:text-foreground transition-base">Skills</Link>
          <span className="text-sm text-muted-foreground/50">/</span>
          <span className="text-sm text-foreground font-medium truncate">{skill.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mt-0.5 shrink-0" style={{ background: skill.iconBg }}>{skill.icon}</div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold tracking-tight truncate">{skill.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{skill.description || "Chưa có mô tả"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <SkillOwnershipTag skill={skill} userId={access.userId} />
            {(() => {
              const openReq = governanceStore.getOpenRequestForResource("skill", skill.id);
              const isApproved = governanceStore.isResourceApproved("skill", skill.id);
              if (openReq) return <StatusBadge status={openReq.status} />;
              if (isApproved) return <StatusBadge status="approved" />;
              return null;
            })()}
            {canShare && (
              <button
                onClick={() => setShowPublish(true)}
                className="h-9 px-3.5 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base"
              >
                <Rocket size={14} /> Publish
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                aria-label="Thao tác với skill"
                className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
                    <button
                      disabled={!canEdit}
                      title={!canEdit ? (viewOnly ? "Bạn chỉ có quyền xem skill này." : "Bạn không có quyền chỉnh sửa skill này.") : undefined}
                      onClick={() => { setShowEdit(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-base"
                    >
                      Sửa
                    </button>
                    {isOwner && (
                      <button
                        disabled={!canShare}
                        title={!canShare ? "Bạn không có quyền đổi quyền truy cập của skill này." : undefined}
                        onClick={() => { setShowShare(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-base"
                      >
                        Quyền truy cập
                      </button>
                    )}
                    {isOwner && (
                      <div className="mt-1 pt-1 border-t border-border">
                        <button
                          disabled={!canDelete}
                          title={!canDelete ? "Bạn không có quyền xóa skill này." : undefined}
                          onClick={() => { setShowDelete(true); setShowMenu(false); }}
                          className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-[hsl(var(--destructive-soft))] disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-base"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewOnly && !viaAgentOnly && (
        <div className="px-4 sm:px-6 py-2.5 bg-surface-muted border-b border-border text-xs text-muted-foreground shrink-0">
          Bạn đang xem skill được chia sẻ. Liên hệ {skill.ownerName} nếu cần quyền chỉnh sửa.
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-semibold mb-3">Nội dung</div>
            <div>{renderSkillBody(skill.body)}</div>
          </div>

          {/* Who a skill is shared with is the owner's business — not shown to someone who only
            * sees the skill because an Agent they work on uses it. */}
          {!viaAgentOnly && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-semibold mb-1">Quyền truy cập</div>
            <p className="text-xs text-muted-foreground mb-3">Ai được liên kết skill này vào Agent khi xây dựng.</p>
            <p className="text-sm text-muted-foreground">
              {skill.sharing.mode === "private" && "Chỉ mình tôi"}
              {skill.sharing.mode === "all" && "Cả Space"}
              {skill.sharing.mode === "specific" && "Người cụ thể"}
            </p>
            {skill.sharing.mode === "specific" && skill.sharing.people.length > 0 && (
              <ul className="mt-3 space-y-2">
                {skill.sharing.people.map(p => (
                  <li key={p.userId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{p.name} <span className="text-muted-foreground">· {p.email}</span></span>
                    <span className="chip chip-info shrink-0">{p.access === "edit" ? "Có thể chỉnh sửa" : "Có thể xem"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}
        </div>
      </div>

      {showEdit && (
        <CreateSkillModal
          onClose={() => setShowEdit(false)}
          onSubmit={(data: SkillFormData) => { skillStore.update(skill.id, data); setShowEdit(false); refresh(); }}
          initialData={skill}
          currentUser={currentUser}
          isDuplicateName={name => skillStore.isDuplicateName(name, skill.id)}
        />
      )}

      {showShare && (
        <SkillShareModal
          open
          name={skill.name}
          ownerName={skill.ownerName}
          sharing={skill.sharing}
          resourceOwnerId={skill.ownerId}
          attachedAgentIds={skill.attachedByAgentIds}
          onSave={(sharing: Sharing) => { skillStore.updateSharing(skill.id, sharing); refresh(); }}
          onClose={() => setShowShare(false)}
        />
      )}

      {showPublish && (
        <RequestPublishModal
          resourceType="skill" resourceId={skill.id} resourceName={skill.name}
          onClose={() => setShowPublish(false)}
        />
      )}

      <ResourceInUseDialog
        open={showDelete && skill.attachedByAgentIds.length > 0}
        onClose={() => setShowDelete(false)}
        title="Chưa thể xóa skill"
        description={"Skill vẫn đang được các Agent dưới đây sử dụng. Chủ sở hữu cần gỡ skill khỏi Agent trước, sau đó bạn mới xóa được."}
        agents={agentsUsing(skill.attachedByAgentIds)}
      />
      <AlertDialog open={showDelete && skill.attachedByAgentIds.length === 0} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa skill "{skill.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Skill sẽ bị xóa vĩnh viễn khỏi workspace. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { skillStore.remove(skill.id); setShowDelete(false); navigate("/tools"); }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
