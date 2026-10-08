import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAgent } from "@/components/configure/agentStore";
import {
  Plus, ChevronDown, Search, MoreVertical, AlertTriangle, BookOpen, FolderKanban,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  knowledgeBaseStore, CURRENT_USER, isViewOnly, isAccessibleTo, type KnowledgeBase,
} from "@/components/knowledge/knowledgeBaseStore";
import KnowledgeTypeIcon from "@/components/knowledge/KnowledgeTypeIcon";
import CreateKnowledgeBaseModal from "@/components/knowledge/CreateKnowledgeBaseModal";
import ConnectExternalKnowledgeBaseModal from "@/components/knowledge/ConnectExternalKnowledgeBaseModal";
import ShareKnowledgeBaseModal from "@/components/knowledge/ShareKnowledgeBaseModal";
import RetrievalScopeModal from "@/components/knowledge/RetrievalScopeModal";
import { ACCESS_COPY, RETRIEVAL_COPY } from "@/components/knowledge/QueryScopeSection";
import DeleteKnowledgeBaseDialog from "@/components/knowledge/DeleteKnowledgeBaseDialog";
import { notifySpaceOwner, useSpaceActor, spaceDeleteLabel, SpaceUnshareDialog } from "@/components/governance/spaceDelete";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import {
  isShared, ownershipTags, countByTab, matchesTab, OwnershipTabs, ownershipEmptyCopy, ResourceCard, CardCreator, AgentCount, type OwnershipTab,
} from "@/components/governance/resourceOwnership";

type MainTab = OwnershipTab;
type TypeFilter = "all" | "internal" | "external_api";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `Cập nhật ${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Cập nhật ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `Cập nhật ${days} ngày trước`;
}

function RowMenu({ kb, onOpen, onEdit, onShare, onRetrieval, onDelete, onUnshare, editBlocked, shareBlocked, deleteBlocked }: {
  onUnshare?: () => void;
  kb: KnowledgeBase;
  onOpen: () => void; onEdit: () => void; onShare: () => void; onRetrieval: () => void; onDelete: () => void;
  /** Set (with the reason to show as a tooltip) when the action is blocked — either by the
   * per-person sharing access level, or by the signed-in role's Scope for this permission. */
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
    { label: ACCESS_COPY.menu, onClick: onShare, blocked: shareBlocked },
    { label: RETRIEVAL_COPY.menu, onClick: onRetrieval, blocked: shareBlocked },
    // Quick on/off for sharing: "Tắt chia sẻ" asks once; "Chia sẻ" opens "Ai được dùng".
    isShared(kb.sharing)
      ? { label: "Tắt chia sẻ", onClick: onUnshare ?? onShare, blocked: shareBlocked }
      : { label: "Chia sẻ", onClick: onShare, blocked: shareBlocked },
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
        aria-label={`Thao tác với ${kb.name}`}
        className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
          {safeItems.map(item => renderItem(item))}
          <div className="mt-1 pt-1 border-t border-border">
            {renderItem({ label: spaceDeleteLabel(kb), onClick: onDelete, blocked: deleteBlocked }, true)}
          </div>
        </div>
      )}
    </div>
  );
}

function KbCard({ kb, userId, access, admin, onOpen, onEdit, onShare, onRetrieval, onDelete, onUnshare }: {
  onUnshare: () => void;
  kb: KnowledgeBase; userId: string; access: ReturnType<typeof useGroupAccess>;
  /** Space Admin: may turn sharing off / delete anyone's knowledge base (the owner is notified). */
  admin: boolean;
  onOpen: () => void; onEdit: () => void; onShare: () => void; onRetrieval: () => void; onDelete: () => void;
}) {
  const viewOnly = isViewOnly(kb, userId);
  const accessible = isAccessibleTo(kb, userId);
  const isOwner = kb.ownerId === userId;
  const NO_ROLE_PERMISSION = "Vai trò của bạn không có quyền thực hiện thao tác này.";
  const NOT_OWNED_OR_SHARED = "Bạn chỉ có thể thao tác trên kho tri thức bạn tạo hoặc được chia sẻ.";
  const VIEW_ONLY = "Bạn chỉ có quyền xem kho tri thức này.";
  const editBlocked = !access.hasPermission("manage") ? NO_ROLE_PERMISSION
    : !access.canAct("manage", accessible) ? NOT_OWNED_OR_SHARED
    : viewOnly ? VIEW_ONLY : undefined;
  // Sharing (like deleting the KB itself) is reserved for the owner — an editor can change
  // content but not the KB's own access list, matching KnowledgeDetail.tsx's header menu.
  const shareBlocked = !isOwner && !admin ? "Chỉ chủ sở hữu hoặc Admin của Space mới đổi được quyền của kho tri thức này."
    : admin ? undefined
    : !access.hasPermission("publish") ? NO_ROLE_PERMISSION
    : !access.canAct("publish", accessible) ? NOT_OWNED_OR_SHARED
    : undefined;
  const deleteBlocked = !isOwner && !admin ? "Chỉ chủ sở hữu hoặc Admin của Space mới xóa được kho tri thức này."
    : admin ? undefined
    : !access.hasPermission("delete") ? NO_ROLE_PERMISSION
    : !access.canAct("delete", accessible) ? NOT_OWNED_OR_SHARED
    : undefined;
  return (
    <ResourceCard
      icon={<KnowledgeTypeIcon type={kb.type} className="w-9 h-9 rounded-[10px]" />}
      name={kb.name}
      nameNode={
        <Link
          to={`/knowledge/${kb.id}`}
          onClick={e => e.stopPropagation()}
          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {kb.name}
        </Link>
      }
      tags={ownershipTags({ ownerId: kb.ownerId, sharing: kb.sharing, userId, admin })}
      menu={<RowMenu kb={kb} onOpen={onOpen} onEdit={onEdit} onShare={onShare} onRetrieval={onRetrieval} onDelete={onDelete} onUnshare={onUnshare} editBlocked={editBlocked} shareBlocked={shareBlocked} deleteBlocked={deleteBlocked} />}
      description={kb.description}
      extra={<p className="text-xs text-muted-foreground">{relativeTime(kb.updatedAt)}</p>}
      creator={<CardCreator displayName={isOwner ? "Bạn" : kb.ownerName} fullName={kb.ownerName} />}
      agents={<AgentCount count={kb.attachedByAgentIds.length} />}
      onOpen={onOpen}
    />
  );
}

export default function KnowledgeList() {
  const navigate = useNavigate();
  const access = useGroupAccess("knowledge");
  const userId = access.userId;
  const actor = useSpaceActor();
  const [params, setParams] = useSearchParams();
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [tab, setTab] = useState<MainTab>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  // Creating straight in the Space library needs the Role's "Create" permission (Builders create
  // knowledge inside an Agent instead). The button stays visible but locked, with the reason.
  const { can } = useMyPermissions();
  const canCreateKb = can("knowledge.create");
  const NO_CREATE_KB = "Vai trò của bạn chưa có quyền tạo kho tri thức.";
  const [showCreate, setShowCreate] = useState(params.get("new") === "1");
  const [showConnect, setShowConnect] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeBase | null>(null);
  const [shareTarget, setShareTarget] = useState<KnowledgeBase | null>(null);
  const [retrievalTarget, setRetrievalTarget] = useState<KnowledgeBase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null);
  const [unshareTarget, setUnshareTarget] = useState<KnowledgeBase | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadState("loading");
    const t = setTimeout(() => {
      try {
        setKbs(knowledgeBaseStore.listSpace());
        setLoadState("ready");
      } catch {
        setLoadState("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [tick]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!showAddMenu) return;
    const h = (e: MouseEvent) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showAddMenu]);

  const refresh = () => setTick(t => t + 1);

  const closeCreate = () => {
    setShowCreate(false);
    if (params.get("new") === "1") {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
    }
  };

  // A role whose Knowledge View Scope is "Own & Shared" (or that has no View permission at
  // all — View is only ever needed to see other people's KBs) never even sees KBs outside
  // what they own or were shared — not just on a filter tab, but in every count and list below.
  const visibleKbs = useMemo(
    () => access.canSeeAll || actor.isAdmin ? kbs : kbs.filter(kb => isAccessibleTo(kb, userId)),
    [kbs, access.canSeeAll, actor.isAdmin, userId],
  );

  // Tags per KB (Của tôi / Được chia sẻ — no built-in KBs exist yet, so Hệ thống stays empty).
  const tagsOf = (kb: KnowledgeBase) => ownershipTags({ ownerId: kb.ownerId, sharing: kb.sharing, userId, admin: actor.isAdmin });
  const counts = useMemo(() => countByTab(visibleKbs, tagsOf), [visibleKbs, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabFiltered = visibleKbs.filter(kb => matchesTab(tagsOf(kb), tab));
  const typeFiltered = typeFilter === "all" ? tabFiltered : tabFiltered.filter(kb => kb.type === typeFilter);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? typeFiltered.filter(kb => kb.name.toLowerCase().includes(q) || kb.description.toLowerCase().includes(q))
    : typeFiltered;

  const hasAnyKb = visibleKbs.length > 0;
  const hasActiveFilters = tab !== "all" || typeFilter !== "all" || search.trim().length > 0;
  const clearFilters = () => { setTab("all"); setTypeFilter("all"); setSearchInput(""); setSearch(""); };

  const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "internal", label: "Nội bộ" },
    { key: "external_api", label: "Kết nối ngoài (API)" },
  ];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight mb-1">Kho tri thức</h1>
          <p className="text-sm text-muted-foreground">Kho tri thức dùng chung của cả Space. Thêm tài liệu, website và FAQ một lần rồi liên kết vào các Agent cần tra cứu.</p>
        </div>
        <div className="relative shrink-0" ref={addMenuRef}>
          <button
            onClick={() => canCreateKb && setShowAddMenu(v => !v)}
            disabled={!canCreateKb}
            title={!canCreateKb ? NO_CREATE_KB : undefined}
            className="btn-primary h-9 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Thêm kho tri thức <ChevronDown size={13} className={`transition-base ${showAddMenu ? "rotate-180" : ""}`} />
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border border-border bg-white shadow-elev py-1">
              <button
                onClick={() => { setShowAddMenu(false); setShowCreate(true); }}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base"
              >
                <FolderKanban size={14} className="text-muted-foreground shrink-0" /> Tạo kho tri thức
              </button>
              <button
                onClick={() => { setShowAddMenu(false); setShowConnect(true); }}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base"
              >
                <BookOpen size={14} className="text-muted-foreground shrink-0" /> Kết nối kho tri thức ngoài
              </button>
            </div>
          )}
        </div>
      </div>

      {loadState === "ready" && hasAnyKb && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 border-b border-border pb-3">
          <OwnershipTabs tab={tab} onChange={setTab} counts={counts} noun="kho tri thức" />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm kho tri thức..."
                className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setTypeFilterOpen(v => !v)}
                onBlur={() => setTimeout(() => setTypeFilterOpen(false), 150)}
                className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
              >
                {TYPE_OPTIONS.find(o => o.key === typeFilter)?.label}
                <ChevronDown size={12} className={`text-muted-foreground transition-base ${typeFilterOpen ? "rotate-180" : ""}`} />
              </button>
              {typeFilterOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] w-52 bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                  {TYPE_OPTIONS.map(o => (
                    <button
                      key={o.key}
                      onMouseDown={() => setTypeFilter(o.key)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-base hover:bg-surface-muted ${typeFilter === o.key ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loadState === "loading" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="pt-3 border-t border-border"><Skeleton className="h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {loadState === "error" && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <AlertTriangle size={22} className="mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Chưa tải được danh sách kho tri thức.</p>
          <button onClick={refresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Thử lại</button>
        </div>
      )}

      {loadState === "ready" && !hasAnyKb && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted text-muted-foreground flex items-center justify-center mb-3">
            <BookOpen size={20} />
          </div>
          <h3 className="font-display text-base font-semibold mb-1">Chưa có kho tri thức nào</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Tạo kho tri thức đầu tiên để các Agent trong Space cùng tra cứu tài liệu, website và FAQ.
          </p>
          <button onClick={() => canCreateKb && setShowCreate(true)} disabled={!canCreateKb} title={!canCreateKb ? NO_CREATE_KB : undefined} className="btn-primary h-9 mx-auto disabled:opacity-50 disabled:cursor-not-allowed">Tạo kho tri thức</button>
        </div>
      )}

      {loadState === "ready" && hasAnyKb && filtered.length === 0 && tab === "system" && !q && typeFilter === "all" && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-base font-semibold mb-1">Chưa có kho tri thức hệ thống</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Kho tri thức do FPT AI Agents cung cấp sẵn sẽ hiện ở đây.</p>
        </div>
      )}

      {loadState === "ready" && hasAnyKb && filtered.length === 0 && !(tab === "system" && !q && typeFilter === "all") && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          {(() => { const ec = !q && typeFilter === "all" ? ownershipEmptyCopy(tab, "kho tri thức") : null; return ec ? (<>
          <h3 className="font-display text-base font-semibold mb-1">{ec.title}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">{ec.body}</p>
          </>) : (<>
          <h3 className="font-display text-base font-semibold mb-1">Không tìm thấy kho tri thức phù hợp</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
          </>); })()}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {loadState === "ready" && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(kb => (
            <KbCard
              key={kb.id}
              kb={kb}
              userId={userId}
              access={access}
              admin={actor.isAdmin}
              onOpen={() => navigate(`/knowledge/${kb.id}`)}
              onEdit={() => setEditTarget(kb)}
              onShare={() => setShareTarget(kb)}
              onRetrieval={() => setRetrievalTarget(kb)}
              onDelete={() => setDeleteTarget(kb)}
              onUnshare={() => setUnshareTarget(kb)}
            />
          ))}
        </div>
      )}

      <CreateKnowledgeBaseModal open={showCreate} onClose={closeCreate} onCreated={refresh} />
      <ConnectExternalKnowledgeBaseModal open={showConnect} onClose={() => { setShowConnect(false); refresh(); }} />
      {editTarget && (
        <CreateKnowledgeBaseModal open={!!editTarget} editingKb={editTarget} onClose={() => setEditTarget(null)} onCreated={refresh} />
      )}
      {shareTarget && (
        <ShareKnowledgeBaseModal
          open={!!shareTarget}
          name={shareTarget.name}
          ownerName={shareTarget.ownerName}
          sharing={shareTarget.sharing}
          resourceOwnerId={shareTarget.ownerId}
          attachedAgentIds={shareTarget.attachedByAgentIds}
          agentOnlyFor={shareTarget.agentOnlyFor}
          onSave={sharing => {
            knowledgeBaseStore.updateSharing(shareTarget.id, sharing);
            if (sharing.mode === "private" && shareTarget.sharing.mode !== "private") notifySpaceOwner("resource_unshared", actor, shareTarget, "kho tri thức", `/knowledge/${shareTarget.id}`);
          }}
          onClose={() => { setShareTarget(null); refresh(); }}
        />
      )}
      {retrievalTarget && (
        <RetrievalScopeModal
          name={retrievalTarget.name}
          value={retrievalTarget.querySharing}
          onSave={q => knowledgeBaseStore.updateQuerySharing(retrievalTarget.id, q)}
          onClose={() => { setRetrievalTarget(null); refresh(); }}
        />
      )}
      {unshareTarget && (
        <SpaceUnshareDialog
          open
          noun="kho tri thức"
          name={unshareTarget.name}
          ownerName={unshareTarget.ownerName}
          ownerId={unshareTarget.ownerId}
          attachedAgentIds={unshareTarget.attachedByAgentIds}
          actor={actor}
          onClose={() => setUnshareTarget(null)}
          onConfirm={() => {
            knowledgeBaseStore.updateSharing(unshareTarget.id, { mode: "private", people: [] });
            notifySpaceOwner("resource_unshared", actor, unshareTarget, "kho tri thức", `/knowledge/${unshareTarget.id}`);
            refresh();
          }}
        />
      )}
      {deleteTarget && (
        <DeleteKnowledgeBaseDialog open={!!deleteTarget} kb={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={refresh} />
      )}
    </div>
  );
}
