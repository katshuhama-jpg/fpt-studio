import { useState, useMemo, useRef, useEffect } from "react";
import {
  ownershipTags, countByTab, matchesTab, OwnershipTabs, OwnershipTagList, CreatorLabel, isCreatorRedundant, type OwnershipTab,
} from "@/components/governance/resourceOwnership";
import { agentsUsing, ResourceInUseDialog } from "@/components/governance/resourceInUseGuard";
import { useSearchParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete01Icon, MoreVerticalIcon, PencilEdit01Icon, Search01Icon, Share08Icon, EyeIcon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { isAccessibleTo, isViewOnly, type Sharing } from "@/components/configure/guardrailSharing";
import { guardrailConsoleStore, type Guardrail, actionLabelVi } from "@/components/configure/guardrailConsoleStore";
import CreateGuardrailModal, { type CreateGuardrailData } from "@/components/configure/CreateGuardrailModal";
import GuardrailDetailModal from "@/components/configure/GuardrailDetailModal";
import GuardrailShareModal from "@/components/configure/GuardrailShareModal";
import { governanceStore } from "@/components/governance/governanceStore";
import { StatusBadge } from "@/components/governance/governanceUi";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { getAgent } from "@/components/configure/agentStore";

/** True if `userId` can see this guardrail — always true for mandatory/all-agents compliance
 * rules, otherwise only if they created it, it's shared with every Console user, or it was
 * explicitly shared with them. */
function isGuardrailAccessible(g: Guardrail, userId: string): boolean {
  if (g.mandatory || g.allAgents) return true;
  if (!g.ownerId || !g.sharing) return false;
  return isAccessibleTo(g.sharing, g.ownerId, userId);
}

const NO_ROLE_PERMISSION = "Bạn không có quyền thực hiện thao tác này.";
const NOT_OWNED_OR_SHARED = "Bạn chỉ có thể thao tác trên guardrail bạn tạo hoặc được chia sẻ.";
const VIEW_ONLY = "Bạn chỉ có quyền xem guardrail này.";

/** Same "can this viewer edit this guardrail" gate the row menu uses, factored out so the
 * "Sửa" shortcut inside GuardrailDetailModal (opened from Row Menu "Mở") enforces the exact
 * same permission matrix instead of drifting from it. Returns the block reason, or undefined
 * when editing is allowed. */
function editBlockedFor(g: Guardrail, access: { userId: string; hasPermission: (a: string) => boolean; canAct: (a: string, accessible: boolean) => boolean }): string | undefined {
  const hasOwner = !g.mandatory && !!g.ownerId && !!g.sharing;
  const isOwner = hasOwner && g.ownerId === access.userId;
  const accessible = isGuardrailAccessible(g, access.userId);
  const viewOnly = hasOwner && !isOwner && isViewOnly(g.sharing!, g.ownerId!, access.userId);
  if (viewOnly) return VIEW_ONLY;
  if (!access.hasPermission("manage")) return NO_ROLE_PERMISSION;
  if (!access.canAct("manage", accessible)) return NOT_OWNED_OR_SHARED;
  return undefined;
}

// Ownership/share-status pills ("Của tôi", "Dùng chung", "Chia sẻ với N người") are gone — the
// Tất cả/Của tôi/Được chia sẻ tab already tells the viewer which group they're looking at, and
// who a guardrail is shared with isn't shown in the list at all. Instead every row carries one
// plain "Người tạo: <tên>" line, "Bạn" for the viewer's own guardrails, so ownership stays
// visible even while browsing "Tất cả" (see the row rendering below).

/* ─── Main page ──────────────────────────────────────────────────────── */
type MainTab = OwnershipTab;

export default function WorkspaceGuardrails() {
  const { can } = useMyPermissions();
  const access = useGroupAccess("guardrails");
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const currentUser = useMemo(() => {
    const me = members.find(m => m.id === access.userId);
    return { id: access.userId, name: me?.name ?? "Tran Nam", email: me?.email ?? "tran.nam@fpt.com" };
  }, [members, access.userId]);
  const canCreateGuardrail = can("guardrails.create");
  const [params, setParams] = useSearchParams();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;
  const items = guardrailConsoleStore.list();
  const [query, setQuery]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Guardrail | null>(null);
  const [viewItem, setViewItem] = useState<Guardrail | null>(null);
  const [shareItem, setShareItem] = useState<Guardrail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guardrail | null>(null);
  const [tab, setTab] = useState<MainTab>("all");

  // A guardrail linked to from elsewhere (e.g. an Agent's "Mở guardrail" row action) via
  // ?open=<id> auto-opens here — editable if the signed-in user can manage it, read-only
  // otherwise — instead of requiring a dedicated /guardrails/:id detail route.
  useEffect(() => {
    const openId = params.get("open");
    if (!openId) return;
    const g = guardrailConsoleStore.get(openId);
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
    if (!g) return;
    const accessible = isGuardrailAccessible(g, access.userId);
    const hasOwner = !g.mandatory && !!g.ownerId && !!g.sharing;
    const viewOnly = hasOwner && g.ownerId !== access.userId && isViewOnly(g.sharing!, g.ownerId!, access.userId);
    const canEdit = access.hasPermission("manage") && access.canAct("manage", accessible) && !viewOnly;
    if (canEdit) setEditItem(g); else setViewItem(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A role whose Guardrails View Scope is "Own & Shared" (or with no View permission at all)
  // only ever sees mandatory/all-agents compliance rules plus guardrails it created or that
  // were shared with it — not just on a filter tab, but in every count and list below.
  const visibleGuardrails = access.canSeeAll ? items : items.filter(g => isGuardrailAccessible(g, access.userId));

  // Mandatory compliance rules ship with the platform → "Hệ thống"; the rest are tagged
  // Của tôi / Được chia sẻ from the viewer's side (both at once for your own shared guardrail).
  const tagsOf = (g: Guardrail) => ownershipTags({ system: g.mandatory, ownerId: g.ownerId, sharing: g.sharing, userId: access.userId });
  const counts = useMemo(() => countByTab(visibleGuardrails, tagsOf), [visibleGuardrails, access.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabFiltered = visibleGuardrails.filter(g => matchesTab(tagsOf(g), tab));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tabFiltered.filter(g => !q || g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q));
  }, [tabFiltered, query]);


  const handleCreate = (g: CreateGuardrailData) => {
    guardrailConsoleStore.create(g);
    refresh();
  };
  const handleEdit = (id: string, g: CreateGuardrailData) => {
    guardrailConsoleStore.update(id, g);
    refresh();
  };
  const handleDelete = (id: string) => {
    guardrailConsoleStore.remove(id);
    refresh();
  };
  const toggleEnabled = (id: string) => {
    guardrailConsoleStore.toggleEnabled(id);
    refresh();
  };
  const handleShare = (id: string, sharing: Sharing) => {
    guardrailConsoleStore.updateSharing(id, sharing);
    refresh();
  };

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-fade-up">
      {showCreate && <CreateGuardrailModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} currentUser={currentUser} />}
      {editItem && <CreateGuardrailModal onClose={() => setEditItem(null)} onSubmit={g => { handleEdit(editItem.id, g); setEditItem(null); }} initialData={editItem} currentUser={currentUser} />}
      {viewItem && (
        <GuardrailDetailModal
          guardrail={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={!editBlockedFor(viewItem, access) ? () => { setViewItem(null); setEditItem(viewItem); } : undefined}
        />
      )}
      {shareItem && (
        <GuardrailShareModal
          open
          name={shareItem.name}
          ownerName={shareItem.ownerName ?? currentUser.name}
          sharing={shareItem.sharing ?? { mode: "private", people: [] }}
          resourceOwnerId={shareItem.ownerId}
          attachedAgentIds={shareItem.attachedByAgentIds}
          onSave={sharing => handleShare(shareItem.id, sharing)}
          onClose={() => setShareItem(null)}
        />
      )}


      <ResourceInUseDialog
        open={!!deleteTarget && (deleteTarget.attachedByAgentIds.length > 0 || !!deleteTarget.allAgents)}
        onClose={() => setDeleteTarget(null)}
        title="Chưa thể xóa guardrail"
        description={deleteTarget?.allAgents
          ? "Guardrail đang áp dụng cho mọi Agent. Bỏ chọn \"Áp dụng cho mọi Agent\" trong Chỉnh sửa trước, sau đó bạn mới xóa được."
          : "Guardrail vẫn đang được các Agent dưới đây sử dụng. Chủ sở hữu cần gỡ guardrail khỏi Agent trước, sau đó bạn mới xóa được."}
        agents={agentsUsing(deleteTarget?.attachedByAgentIds)}
      />
      <AlertDialog open={!!deleteTarget && deleteTarget.attachedByAgentIds.length === 0 && !deleteTarget.allAgents} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa guardrail "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Guardrail sẽ bị xóa vĩnh viễn khỏi workspace. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && deleteTarget.attachedByAgentIds.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
              <p className="text-xs text-destructive leading-relaxed">
                {deleteTarget.attachedByAgentIds.length} Agent đang dùng guardrail này và sẽ mất chính sách bảo vệ: {deleteTarget.attachedByAgentIds.map(id => getAgent(id).name).join(", ")}.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) handleDelete(deleteTarget.id); setDeleteTarget(null); }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Title + primary action share one row, exactly like Knowledge's header
          (KnowledgeList.tsx) — the button lives next to the H1, not down in the toolbar. */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight mb-1">Guardrails</h1>
          <p className="text-sm text-muted-foreground truncate">Chính sách an toàn dùng chung, áp dụng được cho mọi Agent — giới hạn nội dung, bảo vệ dữ liệu, luồng phê duyệt và quy tắc tùy chỉnh.</p>
        </div>
        <button
          onClick={() => canCreateGuardrail && setShowCreate(true)}
          disabled={!canCreateGuardrail}
          title={!canCreateGuardrail ? "You don't have permission to create guardrails." : undefined}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
        >
          <HugeiconsIcon icon={Add01Icon} size={14} /> Create guardrail
        </button>
      </div>

      {/* Ownership tabs (left) + search (right) share one row with a bottom border, exactly
          like Knowledge's tab/search bar. */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 border-b border-border pb-3">
        <OwnershipTabs tab={tab} onChange={setTab} counts={counts} />
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search guardrails"
            className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Table — all guardrails */}
      <Table>
        <THead cols="1fr 200px 1fr 72px 64px" cells={["Guardrail", "Response action", "Assigned agents", "Status", "Actions"]} lastRight />
        {filtered.length === 0 ? <EmptyRow /> : filtered.map(g => {
          const hasOwner = !g.mandatory && !!g.ownerId && !!g.sharing;
          const isOwner = hasOwner && g.ownerId === access.userId;
          const accessible = isGuardrailAccessible(g, access.userId);
          const canPause = access.canAct("pause", accessible);

          const editBlocked = editBlockedFor(g, access);
          const shareBlocked = !hasOwner ? undefined
            : g.allAgents ? "Guardrail đang áp dụng cho mọi Agent nên mọi người trong Space đều xem được. Bỏ \"Áp dụng cho mọi Agent\" trong Chỉnh sửa để đổi chia sẻ."
            : !isOwner ? "Chỉ chủ sở hữu mới có thể chia sẻ guardrail này."
            : !access.hasPermission("publish") ? NO_ROLE_PERMISSION
            : !access.canAct("publish", accessible) ? NOT_OWNED_OR_SHARED
            : undefined;
          const deleteBlocked = hasOwner && !isOwner ? "Chỉ chủ sở hữu mới có thể xóa guardrail này."
            : !access.hasPermission("delete") ? NO_ROLE_PERMISSION
            : !access.canAct("delete", accessible) ? NOT_OWNED_OR_SHARED
            : undefined;

          return (
          <TRow key={g.id} cols="1fr 200px 1fr 72px 64px" onClick={() => setViewItem(g)}>
            <div className="min-w-0">
              <div className="text-sm font-medium">{g.name}</div>
              <OwnershipTagList tags={tagsOf(g)} className="mt-1.5" />
              <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{g.desc}</div>
              <div className="text-xs mt-2">
                {isCreatorRedundant(tagsOf(g))
                  ? null
                  : hasOwner
                    ? <CreatorLabel displayName={isOwner ? "Bạn" : (g.ownerName ?? "—")} fullName={g.ownerName} />
                    : null}
              </div>
            </div>
            <div><ActionPill>{actionLabelVi(g.action)}</ActionPill></div>
            <div className="flex items-center">
              {g.mandatory || g.allAgents ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#22c55e"/><path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Tất cả Agent
                </span>
              ) : g.attachedByAgentIds.length > 0 ? (
                <span className="text-xs font-medium text-foreground">{g.attachedByAgentIds.length} Agent</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center" onClick={e => e.stopPropagation()}>
              <Switch
                checked={g.enabled}
                onCheckedChange={() => canPause && toggleEnabled(g.id)}
                disabled={!canPause}
                title={!canPause ? "Bạn không có quyền tạm dừng guardrail này." : undefined}
              />
            </div>
            <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
              <RowMenu
                onOpen={() => setViewItem(g)}
                onEdit={() => setEditItem(g)}
                onShare={hasOwner ? () => setShareItem(g) : undefined}
                onDelete={() => setDeleteTarget(g)}
                editBlocked={editBlocked}
                shareBlocked={shareBlocked}
                deleteBlocked={deleteBlocked}
              />
            </div>
          </TRow>
          );
        })}
      </Table>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface overflow-hidden">{children}</div>;
}

function THead({ cols, cells, lastRight }: { cols: string; cells: string[]; lastRight?: boolean }) {
  return (
    <div className="grid px-5 bg-surface-muted border-b border-border" style={{gridTemplateColumns: cols}}>
      {cells.map((c, i) => (
        <div key={c} className={`py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ${lastRight && i === cells.length - 1 ? "text-right" : ""}`}>{c}</div>
      ))}
    </div>
  );
}

function TRow({ cols, children, onClick }: { cols: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }) : undefined}
      className={`grid px-5 py-3.5 border-b border-border last:border-0 items-center gap-3 ${onClick ? "cursor-pointer hover:bg-surface-muted/50 transition-base" : ""}`}
      style={{gridTemplateColumns: cols}}
    >
      {children}
    </div>
  );
}

function EmptyRow() {
  return <div className="px-5 py-6 text-sm text-muted-foreground text-center">No guardrails found.</div>;
}

function ActionPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-[180px] px-2.5 py-1 rounded-full border border-border bg-surface-muted text-xs text-muted-foreground truncate">
      {children}
    </span>
  );
}

/** Row "..." menu — enforces the same permission matrix as Knowledge's RowMenu: "Mở" is always
 * available, and "Chỉnh sửa"/"Chia sẻ"/"Xóa" are always rendered but individually
 * disabled+tooltipped by whichever gate (ownership, sharing access level, role permission, or
 * role Scope) actually blocks it — never hidden outright, so an owner sees the full action set,
 * an edit-shared viewer sees Mở/Chỉnh sửa enabled, and a view-only viewer sees only Mở enabled. */
function RowMenu({
  onOpen, onEdit, onShare, onDelete,
  editBlocked, shareBlocked, deleteBlocked,
}: {
  onOpen: () => void; onEdit: () => void; onShare?: () => void; onDelete: () => void;
  editBlocked?: string; shareBlocked?: string; deleteBlocked?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-xl border border-border shadow-lg py-1 animate-fade-up">
          <button
            onClick={() => { setOpen(false); onOpen(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-base"
          >
            <HugeiconsIcon icon={EyeIcon} size={13} className="text-muted-foreground" /> Mở
          </button>
          <button
            disabled={!!editBlocked}
            title={editBlocked}
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={13} className="text-muted-foreground" /> Chỉnh sửa
          </button>
          {onShare && (
            <button
              disabled={!!shareBlocked}
              title={shareBlocked}
              onClick={() => { setOpen(false); onShare(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <HugeiconsIcon icon={Share08Icon} size={13} className="text-muted-foreground" /> Chia sẻ
            </button>
          )}
          <button
            disabled={!!deleteBlocked}
            title={deleteBlocked}
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <HugeiconsIcon icon={Delete01Icon} size={13} /> Xóa
          </button>
        </div>
      )}
    </div>
  );
}
