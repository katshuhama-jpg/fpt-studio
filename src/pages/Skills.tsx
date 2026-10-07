import { useState, useRef, useEffect, useMemo } from "react";
import { SpaceDeleteDialog, canManageSpaceResource, deleteFromSpace, notifySpaceOwner, useSpaceActor } from "@/components/governance/spaceDelete";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Puzzle, BookOpen, Plus, Search, LayoutGrid, List, MoreVertical, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { skillStore, type Skill } from "@/components/configure/skillStore";
import { getAgent } from "@/components/configure/agentStore";
import { agentSkillStore } from "@/components/configure/agentSkillStore";
import { isAccessibleTo, isViewOnly, type Sharing } from "@/components/configure/skillSharing";
import CreateSkillModal, { type SkillFormData } from "@/components/configure/CreateSkillModal";
import CreateSkillChoiceModal from "@/components/configure/CreateSkillChoiceModal";
import UploadSkillModal from "@/components/configure/UploadSkillModal";
import SkillShareModal from "@/components/configure/SkillShareModal";
import { VISIBLE_BUILTIN_SKILLS, type BuiltinSkill } from "@/components/configure/builtinSkillStore";
import { SystemResourceDetailModal } from "@/components/configure/AgentResourceDetailModal";
import {
  ownershipTags, countByTab, matchesTab, OwnershipTabs, ownershipEmptyCopy, OwnershipTagList, ResourceCard, ResourceIconTile, isCreatorRedundant,
  CardCreator, AgentCount, type OwnershipTab, type OwnershipTag,
} from "@/components/governance/resourceOwnership";

type MainTab = OwnershipTab;

// Ownership/share-status pills ("Của tôi", "Dùng chung", "Chia sẻ với N người") are gone —
// the Tất cả/Của tôi/Được chia sẻ tab already tells the viewer which group they're looking at,
// and who a skill is shared with isn't shown in the list at all. Instead every card/row carries
// one plain "Người tạo: <tên>" line, "Bạn" for the viewer's own skills, so ownership stays
// visible even while browsing "Tất cả" (see the card/row rendering below).

/** Card/row "..." menu — same permission matrix and structure as Knowledge's RowMenu: "Mở" is
 * always available, "Sửa"/"Chia sẻ"/"Xóa" are always rendered but individually
 * disabled+tooltipped by whichever gate (ownership, sharing access level, or role Scope) blocks
 * it, so an owner sees the full action set, an edit-shared viewer sees Mở/Sửa only, and a
 * view-only viewer sees only Mở enabled. */
function SkillRowMenu({ skill, onOpen, onEdit, onShare, onDelete, editBlocked, shareBlocked, deleteBlocked }: {
  skill: Skill;
  onOpen: () => void; onEdit: () => void; onShare: () => void; onDelete: () => void;
  editBlocked?: string; shareBlocked?: string; deleteBlocked?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const safeItems: { label: string; onClick: () => void; blocked?: string }[] = [
    { label: "Xem chi tiết", onClick: onOpen },
    { label: "Chỉnh sửa", onClick: onEdit, blocked: editBlocked },
    { label: "Ai được dùng", onClick: onShare, blocked: shareBlocked },
  ];

  const renderItem = (item: { label: string; onClick: () => void; blocked?: string }, danger?: boolean) => (
    <button
      key={item.label}
      type="button"
      disabled={!!item.blocked}
      title={item.blocked}
      onClick={() => { setOpen(false); item.onClick(); }}
      className={`w-full text-left px-3 py-2 text-sm transition-base ${
        item.blocked ? "text-muted-foreground/50 cursor-not-allowed" :
        danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"
      }`}
    >
      {item.label}
    </button>
  );

  return (
    <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`Thao tác với ${skill.name}`}
        className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
          {safeItems.map(item => renderItem(item))}
          <div className="mt-1 pt-1 border-t border-border">
            {renderItem({ label: "Xóa", onClick: onDelete, blocked: deleteBlocked }, true)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Skills() {
  const navigate = useNavigate();
  const { can } = useMyPermissions();
  const access = useGroupAccess("skills");
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const currentUser = useMemo(() => {
    const me = members.find(m => m.id === access.userId);
    return { id: access.userId, name: me?.name ?? "Tran Nam", email: me?.email ?? "tran.nam@fpt.com" };
  }, [members, access.userId]);
  const canCreateSkill = can("skills.create");
  const actor = useSpaceActor();

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;
  const skills = skillStore.list();

  const [view, setView] = useState<"grid"|"list">("grid");
  const [tab, setTab] = useState<MainTab>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editTarget, setEditTarget] = useState<Skill | null>(null);
  const [shareTarget, setShareTarget] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);

  const openSkill = (s: Skill) => navigate(`/tools/${s.id}`);

  // A role whose Skills View Scope is "Own & Shared" (or with no View permission at all) only
  // ever sees skills it created or that were shared with it — not just on a filter tab, but in
  // every count and list below.
  const visibleSkills = access.canSeeAll || actor.isAdmin ? skills : skills.filter(s => isAccessibleTo(s.sharing, s.ownerId, access.userId));

  // One list for the library: Space skills (tagged Của tôi / Được chia sẻ) + the platform's
  // built-in skills (tagged Hệ thống). Tabs filter by tag, so a skill you own and shared shows
  // under both "Của tôi" and "Được chia sẻ".
  type Item = { kind: "space"; skill: Skill; tags: OwnershipTag[] } | { kind: "system"; skill: BuiltinSkill; tags: OwnershipTag[] };
  const items: Item[] = [
    ...visibleSkills.map(s => ({ kind: "space" as const, skill: s, tags: ownershipTags({ ownerId: s.ownerId, sharing: s.sharing, userId: access.userId, admin: actor.isAdmin }) })),
    ...VISIBLE_BUILTIN_SKILLS.map(b => ({ kind: "system" as const, skill: b, tags: ["system"] as OwnershipTag[] })),
  ];
  const counts = countByTab(items, i => i.tags);
  const q = search.trim().toLowerCase();
  const visible = items
    .filter(i => matchesTab(i.tags, tab))
    .filter(i => !q || i.skill.name.toLowerCase().includes(q) || i.skill.description.toLowerCase().includes(q));
  const [systemTarget, setSystemTarget] = useState<BuiltinSkill | null>(null);

  const NO_ROLE_PERMISSION = "Bạn không có quyền thực hiện thao tác này.";
  const NOT_OWNED_OR_SHARED = "Bạn chỉ có thể thao tác trên skill bạn tạo hoặc được chia sẻ.";
  const VIEW_ONLY = "Bạn chỉ có quyền xem skill này.";

  function menuFor(s: Skill) {
    const isOwner = s.ownerId === access.userId;
    const accessible = isAccessibleTo(s.sharing, s.ownerId, access.userId);
    const viewOnly = !isOwner && isViewOnly(s.sharing, s.ownerId, access.userId);
    const editBlocked = !access.hasPermission("manage") ? NO_ROLE_PERMISSION
      : !access.canAct("manage", accessible) ? NOT_OWNED_OR_SHARED
      : viewOnly ? VIEW_ONLY : undefined;
    // Owner, or a Space Admin (who may turn sharing off / delete anyone's skill).
    const manages = canManageSpaceResource(actor, s.ownerId);
    const shareBlocked = !manages ? "Chỉ chủ sở hữu hoặc Admin của Space mới đổi được ai được dùng skill này."
      : actor.isAdmin ? undefined
      : !access.hasPermission("publish") ? NO_ROLE_PERMISSION
      : !access.canAct("publish", accessible) ? NOT_OWNED_OR_SHARED
      : undefined;
    const deleteBlocked = !manages ? "Chỉ chủ sở hữu hoặc Admin của Space mới xóa được skill này."
      : actor.isAdmin ? undefined
      : !access.hasPermission("delete") ? NO_ROLE_PERMISSION
      : !access.canAct("delete", accessible) ? NOT_OWNED_OR_SHARED
      : undefined;
    return (
      <SkillRowMenu
        skill={s}
        onOpen={() => openSkill(s)}
        onEdit={() => setEditTarget(s)}
        onShare={() => setShareTarget(s)}
        onDelete={() => setDeleteTarget(s)}
        editBlocked={editBlocked}
        shareBlocked={shareBlocked}
        deleteBlocked={deleteBlocked}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-surface shrink-0">
        <div className="max-w-[1200px] mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight mb-1">Skills</h1>
            <p className="text-sm text-muted-foreground">Skill dùng chung trong Space. Liên kết vào Agent nào cũng được.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Thư viện skill mẫu</button>
            <button
              onClick={() => canCreateSkill && setShowChoice(true)}
              disabled={!canCreateSkill}
              title={!canCreateSkill ? "Vai trò của bạn chưa có quyền tạo skill." : undefined}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Tạo skill
            </button>
          </div>
        </div>
      </div>

      {/* Ownership tabs + search + view toggle */}
      <div className="border-b border-border bg-background shrink-0">
        <div className="max-w-[1200px] mx-auto px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
          <OwnershipTabs tab={tab} onChange={setTab} counts={counts} noun="skill" />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm skill..."
                className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-surface border border-border">
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-base ${view === "grid" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Xem dạng lưới"><LayoutGrid size={14} /></button>
              <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-base ${view === "list" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Xem dạng danh sách"><List size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      {visible.length === 0 && (tab !== "all" || q) ? (
        <div className="flex-1 flex items-center justify-center text-center p-10 text-sm text-muted-foreground">
          {q ? "Không tìm thấy skill nào phù hợp." : ownershipEmptyCopy(tab, "skill") ? (
            <div className="max-w-md">
              <p className="font-medium text-foreground mb-1">{ownershipEmptyCopy(tab, "skill")!.title}</p>
              <p>{ownershipEmptyCopy(tab, "skill")!.body}</p>
            </div>
          ) : "Chưa có skill hệ thống nào."}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-5 border border-primary/15">
            <Puzzle size={26} />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">Chưa có skill nào</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">Skill giúp Agent xử lý một việc cụ thể. Tạo skill của riêng bạn, hoặc bắt đầu từ thư viện skill mẫu.</p>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Thư viện skill mẫu</button>
            <button
              onClick={() => canCreateSkill && setShowChoice(true)}
              disabled={!canCreateSkill}
              title={!canCreateSkill ? "Vai trò của bạn chưa có quyền tạo skill." : undefined}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Tạo skill
            </button>
          </div>
        </div>
      ) : view === "grid" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map(i => i.kind === "system" ? (
                <ResourceCard
                  key={`sys-${i.skill.id}`}
                  icon={<ResourceIconTile system><Puzzle size={18} /></ResourceIconTile>}
                  name={i.skill.name}
                  tags={i.tags}
                  description={i.skill.description}
                  creator={<CardCreator displayName="FPT AI Agents" system />}
                  agents={<AgentCount count={0} all />}
                  onOpen={() => setSystemTarget(i.skill as BuiltinSkill)}
                />
              ) : (
                <ResourceCard
                  key={i.skill.id}
                  icon={<ResourceIconTile><Puzzle size={18} /></ResourceIconTile>}
                  name={i.skill.name}
                  tags={i.tags}
                  menu={menuFor(i.skill as Skill)}
                  description={i.skill.description}
                  creator={<CardCreator displayName={(i.skill as Skill).ownerId === access.userId ? "Bạn" : (i.skill as Skill).ownerName} fullName={(i.skill as Skill).ownerId === access.userId ? currentUser.name : (i.skill as Skill).ownerName} />}
                  agents={<AgentCount count={(i.skill as Skill).attachedByAgentIds.length} />}
                  onOpen={() => openSkill(i.skill as Skill)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-8">
            {visible.map(i => {
              const system = i.kind === "system";
              const sk = i.skill;
              const owner = system ? "FPT AI Agents" : (sk as Skill).ownerId === access.userId ? "Bạn" : (sk as Skill).ownerName;
              const open = () => (system ? setSystemTarget(sk as BuiltinSkill) : openSkill(sk as Skill));
              return (
              <div key={`${i.kind}-${sk.id}`}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={e => { if (e.key === "Enter" && e.target === e.currentTarget) open(); }}
                className="flex items-center gap-3 py-3 border-b border-border cursor-pointer transition-base hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ResourceIconTile system={system}><Puzzle size={16} /></ResourceIconTile>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{sk.name}</span>
                    <OwnershipTagList tags={i.tags} className="shrink-0 flex-nowrap" />
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {sk.description}{isCreatorRedundant(i.tags) ? "" : ` · Người tạo: ${owner}`}
                  </div>
                </div>
                <div className="text-xs shrink-0"><AgentCount count={system ? 0 : (sk as Skill).attachedByAgentIds.length} all={system} /></div>
                {system ? <span className="w-7 shrink-0" /> : <div onClick={e => e.stopPropagation()}>{menuFor(sk as Skill)}</div>}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {systemTarget && (
        <SystemResourceDetailModal typeLabel="skill" name={systemTarget.name} description={systemTarget.description} onClose={() => setSystemTarget(null)} />
      )}

      {showChoice && (
        <CreateSkillChoiceModal
          onClose={() => setShowChoice(false)}
          onChooseManual={() => { setShowChoice(false); setShowCreate(true); }}
          onChooseUpload={() => { setShowChoice(false); setShowUpload(true); }}
        />
      )}

      {showCreate && (
        <CreateSkillModal
          onClose={() => setShowCreate(false)}
          onSubmit={data => {
            const skill = skillStore.create({ ...data, ownerId: currentUser.id, ownerName: currentUser.name });
            refresh();
            openSkill(skill);
          }}
          currentUser={currentUser}
          isDuplicateName={name => skillStore.isDuplicateName(name)}
        />
      )}

      {showUpload && (
        <UploadSkillModal
          onClose={() => setShowUpload(false)}
          onSubmit={data => {
            const skill = skillStore.create({ ...data, ownerId: currentUser.id, ownerName: currentUser.name });
            refresh();
            openSkill(skill);
          }}
          currentUser={currentUser}
          isDuplicateName={name => skillStore.isDuplicateName(name)}
        />
      )}

      {editTarget && (
        <CreateSkillModal
          onClose={() => setEditTarget(null)}
          onSubmit={(data: SkillFormData) => { skillStore.update(editTarget.id, data); setEditTarget(null); refresh(); }}
          initialData={editTarget}
          currentUser={currentUser}
          isDuplicateName={name => skillStore.isDuplicateName(name, editTarget.id)}
        />
      )}

      {shareTarget && (
        <SkillShareModal
          open
          name={shareTarget.name}
          ownerName={shareTarget.ownerName}
          sharing={shareTarget.sharing}
          resourceOwnerId={shareTarget.ownerId}
          attachedAgentIds={shareTarget.attachedByAgentIds}
          onSave={(sharing: Sharing) => {
            agentSkillStore.applySpaceSharing(shareTarget.id, sharing);
            if (sharing.mode === "private" && shareTarget.sharing.mode !== "private") notifySpaceOwner("resource_unshared", actor, shareTarget, "skill", `/tools/${shareTarget.id}`);
            refresh();
          }}
          onClose={() => setShareTarget(null)}
        />
      )}

      {deleteTarget && (
        <SpaceDeleteDialog
          open
          noun="skill"
          name={deleteTarget.name}
          originAgentId={deleteTarget.originAgentId}
          attachedAgentIds={deleteTarget.attachedByAgentIds}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteFromSpace(skillStore, deleteTarget, actor);
            notifySpaceOwner("resource_deleted", actor, deleteTarget, "skill", "/tools");
            toast.success(`Đã xóa skill "${deleteTarget.name}" khỏi Space.`);
            refresh();
          }}
        />
      )}
    </div>
  );
}
