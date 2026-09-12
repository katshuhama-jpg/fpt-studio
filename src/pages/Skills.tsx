import { useState, useRef, useEffect, useMemo } from "react";
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
import { isAccessibleTo, isViewOnly, type Sharing } from "@/components/configure/skillSharing";
import CreateSkillModal, { type SkillFormData } from "@/components/configure/CreateSkillModal";
import SkillShareModal from "@/components/configure/SkillShareModal";

type MainTab = "all" | "mine" | "shared";

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
    { label: "Mở", onClick: onOpen },
    { label: "Chỉnh sửa", onClick: onEdit, blocked: editBlocked },
    { label: "Chia sẻ", onClick: onShare, blocked: shareBlocked },
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

  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;
  const skills = skillStore.list();

  const [view, setView] = useState<"grid"|"list">("grid");
  const [tab, setTab] = useState<MainTab>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Skill | null>(null);
  const [shareTarget, setShareTarget] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);

  const openSkill = (s: Skill) => navigate(`/tools/${s.id}`);

  // A role whose Skills View Scope is "Own & Shared" (or with no View permission at all) only
  // ever sees skills it created or that were shared with it — not just on a filter tab, but in
  // every count and list below.
  const visibleSkills = access.canSeeAll ? skills : skills.filter(s => isAccessibleTo(s.sharing, s.ownerId, access.userId));

  const isMine = (s: Skill) => s.ownerId === access.userId;
  const isSharedWithMe = (s: Skill) => !isMine(s) && isAccessibleTo(s.sharing, s.ownerId, access.userId);

  const counts = {
    all: visibleSkills.length,
    mine: visibleSkills.filter(isMine).length,
    shared: visibleSkills.filter(isSharedWithMe).length,
  };

  const tabFiltered = tab === "mine" ? visibleSkills.filter(isMine)
    : tab === "shared" ? visibleSkills.filter(isSharedWithMe)
    : visibleSkills;

  const q = search.trim().toLowerCase();
  const visible = q
    ? tabFiltered.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    : tabFiltered;

  const TABS: { key: MainTab; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "mine", label: "Của tôi" },
    { key: "shared", label: "Được chia sẻ" },
  ];

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
    const shareBlocked = !isOwner ? "Chỉ chủ sở hữu mới có thể chia sẻ skill này."
      : !access.hasPermission("publish") ? NO_ROLE_PERMISSION
      : !access.canAct("publish", accessible) ? NOT_OWNED_OR_SHARED
      : undefined;
    const deleteBlocked = !isOwner ? "Chỉ chủ sở hữu mới có thể xóa skill này."
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
            <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Skills</h1>
            <p className="text-sm text-muted-foreground">Skill dùng chung cho tất cả Agent trong workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Browse Library</button>
            <button
              onClick={() => canCreateSkill && setShowCreate(true)}
              disabled={!canCreateSkill}
              title={!canCreateSkill ? "You don't have permission to create skills." : undefined}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Create Skill
            </button>
          </div>
        </div>
      </div>

      {/* Ownership tabs + search + view toggle */}
      <div className="border-b border-border bg-background shrink-0">
        <div className="max-w-[1200px] mx-auto px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
                  tab === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
                }`}
              >
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary/10 text-primary" : "bg-surface-sunken text-muted-foreground"}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-surface border border-border">
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-base ${view === "grid" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Grid view"><LayoutGrid size={14} /></button>
              <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-base ${view === "list" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="List view"><List size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-5 border border-primary/15">
            <Puzzle size={26} />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">No skills yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">Skills teach your agents how to handle specific tasks. Create your own, or browse pre-built templates from the skill library.</p>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Browse Library</button>
            <button
              onClick={() => canCreateSkill && setShowCreate(true)}
              disabled={!canCreateSkill}
              title={!canCreateSkill ? "You don't have permission to create skills." : undefined}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Create Skill
            </button>
          </div>
        </div>
      ) : view === "grid" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(s => {
                const isOwner = s.ownerId === access.userId;
                return (
                <div key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSkill(s)}
                  onKeyDown={e => { if (e.key === "Enter") openSkill(s); }}
                  className="rounded-xl border p-4 cursor-pointer transition-base border-border bg-surface hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: s.iconBg }}>{s.icon}</div>
                    {menuFor(s)}
                  </div>
                  <div className="font-semibold text-sm leading-snug mb-1.5 truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.description}</div>
                  <div className="text-xs text-muted-foreground mt-3">Người tạo: {isOwner ? "Bạn" : s.ownerName}</div>
                  {s.attachedByAgentIds.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1.5">{s.attachedByAgentIds.length} Agent đang dùng</div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-8">
            {visible.map(s => {
              const isOwner = s.ownerId === access.userId;
              return (
              <div key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => openSkill(s)}
                onKeyDown={e => { if (e.key === "Enter") openSkill(s); }}
                className="flex items-center gap-3 py-3 border-b border-border cursor-pointer transition-base hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: s.iconBg }}>{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.description} · Người tạo: {isOwner ? "Bạn" : s.ownerName}
                  </div>
                </div>
                {s.attachedByAgentIds.length > 0 && (
                  <div className="text-xs text-muted-foreground shrink-0">{s.attachedByAgentIds.length} Agent</div>
                )}
                {menuFor(s)}
              </div>
              );
            })}
          </div>
        </div>
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
          onSave={(sharing: Sharing) => { skillStore.updateSharing(shareTarget.id, sharing); refresh(); }}
          onClose={() => setShareTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa skill "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Skill sẽ bị xóa vĩnh viễn khỏi workspace. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && deleteTarget.attachedByAgentIds.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
              <p className="text-xs text-destructive leading-relaxed">
                {deleteTarget.attachedByAgentIds.length} Agent đang dùng skill này và sẽ mất khả năng này: {deleteTarget.attachedByAgentIds.map(id => getAgent(id).name).join(", ")}.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) skillStore.remove(deleteTarget.id);
                setDeleteTarget(null);
                refresh();
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
