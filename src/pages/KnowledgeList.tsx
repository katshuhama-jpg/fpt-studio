import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, ChevronDown, Search, MoreVertical, AlertTriangle, BookOpen, FolderKanban,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  knowledgeBaseStore, CURRENT_USER, isViewOnly, type KnowledgeBase,
} from "@/components/knowledge/knowledgeBaseStore";
import KnowledgeTypeIcon from "@/components/knowledge/KnowledgeTypeIcon";
import CreateKnowledgeBaseModal from "@/components/knowledge/CreateKnowledgeBaseModal";
import ConnectExternalKnowledgeBaseModal from "@/components/knowledge/ConnectExternalKnowledgeBaseModal";
import ShareKnowledgeBaseModal from "@/components/knowledge/ShareKnowledgeBaseModal";
import DeleteKnowledgeBaseDialog from "@/components/knowledge/DeleteKnowledgeBaseDialog";

type MainTab = "all" | "mine" | "shared";
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

function OwnershipChips({ kb }: { kb: KnowledgeBase }) {
  if (kb.ownerId === CURRENT_USER.id) {
    return (
      <>
        <span className="chip chip-muted">Của tôi</span>
        {kb.sharing.mode === "all" && <span className="chip chip-info">Dùng chung</span>}
        {kb.sharing.mode === "specific" && kb.sharing.people.length > 0 && (
          <span className="chip chip-info">Chia sẻ với {kb.sharing.people.length} người</span>
        )}
      </>
    );
  }
  const me = kb.sharing.people.find(p => p.userId === CURRENT_USER.id);
  return (
    <>
      <span className="chip chip-muted">Được chia sẻ · {kb.ownerName}</span>
      {me && <span className="chip chip-info">{me.access === "edit" ? "Có thể chỉnh sửa" : "Có thể xem"}</span>}
    </>
  );
}

function RowMenu({ kb, viewOnly, onOpen, onEdit, onShare, onDelete }: {
  kb: KnowledgeBase; viewOnly: boolean;
  onOpen: () => void; onEdit: () => void; onShare: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items: { label: string; onClick: () => void; disabled?: boolean }[] = [
    { label: "Mở", onClick: onOpen },
    { label: "Chỉnh sửa", onClick: onEdit, disabled: viewOnly },
    { label: "Chia sẻ", onClick: onShare, disabled: viewOnly },
    { label: "Xóa", onClick: onDelete, disabled: viewOnly },
  ];

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
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-white shadow-elev py-1">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              title={item.disabled ? "Bạn chỉ có quyền xem kho tri thức này." : undefined}
              onClick={() => { setOpen(false); item.onClick(); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-base ${
                item.disabled ? "text-muted-foreground/50 cursor-not-allowed" :
                item.label === "Xóa" ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KbCard({ kb, onOpen, onEdit, onShare, onDelete }: {
  kb: KnowledgeBase; onOpen: () => void; onEdit: () => void; onShare: () => void; onDelete: () => void;
}) {
  const viewOnly = isViewOnly(kb);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === "Enter") onOpen(); }}
      className="group rounded-xl border border-border bg-surface hover:border-primary/30 hover:shadow-elev transition-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-5 flex flex-col"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <KnowledgeTypeIcon type={kb.type} />
          <Link
            to={`/knowledge/${kb.id}`}
            onClick={e => e.stopPropagation()}
            className="font-semibold text-sm leading-snug line-clamp-2 min-w-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {kb.name}
          </Link>
        </div>
        <RowMenu kb={kb} viewOnly={viewOnly} onOpen={onOpen} onEdit={onEdit} onShare={onShare} onDelete={onDelete} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3 min-h-[32px]">
        {kb.description || <span className="italic">Chưa có mô tả</span>}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <OwnershipChips kb={kb} />
      </div>
      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground gap-2 flex-wrap">
        <span>{kb.stats.docs} tài liệu · {kb.stats.urls} URL · {kb.stats.chunks} chunk</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1.5">{relativeTime(kb.updatedAt)}</div>
    </div>
  );
}

export default function KnowledgeList() {
  const navigate = useNavigate();
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
  const [showCreate, setShowCreate] = useState(params.get("new") === "1");
  const [showConnect, setShowConnect] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeBase | null>(null);
  const [shareTarget, setShareTarget] = useState<KnowledgeBase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadState("loading");
    const t = setTimeout(() => {
      try {
        setKbs(knowledgeBaseStore.list());
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

  const counts = useMemo(() => ({
    all: kbs.length,
    mine: kbs.filter(kb => kb.ownerId === CURRENT_USER.id).length,
    shared: kbs.filter(kb => kb.ownerId !== CURRENT_USER.id).length,
  }), [kbs]);

  const tabFiltered = tab === "mine" ? kbs.filter(kb => kb.ownerId === CURRENT_USER.id)
    : tab === "shared" ? kbs.filter(kb => kb.ownerId !== CURRENT_USER.id)
    : kbs;
  const typeFiltered = typeFilter === "all" ? tabFiltered : tabFiltered.filter(kb => kb.type === typeFilter);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? typeFiltered.filter(kb => kb.name.toLowerCase().includes(q) || kb.description.toLowerCase().includes(q))
    : typeFiltered;

  const hasAnyKb = kbs.length > 0;
  const hasActiveFilters = tab !== "all" || typeFilter !== "all" || search.trim().length > 0;
  const clearFilters = () => { setTab("all"); setTypeFilter("all"); setSearchInput(""); setSearch(""); };

  const TABS: { key: MainTab; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "mine", label: "Của tôi" },
    { key: "shared", label: "Được chia sẻ" },
  ];
  const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "internal", label: "Nội bộ" },
    { key: "external_api", label: "Kết nối ngoài (API)" },
  ];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Kho tri thức</h1>
          <p className="text-sm text-muted-foreground">Nguồn tri thức dùng chung cho các Agent trong workspace.</p>
        </div>
        <div className="relative shrink-0" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(v => !v)}
            className="btn-primary h-9 whitespace-nowrap"
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
            Tạo kho tri thức đầu tiên để Agent của bạn có thể tra cứu tài liệu, website và FAQ.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary h-9 mx-auto">Tạo kho tri thức</button>
        </div>
      )}

      {loadState === "ready" && hasAnyKb && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-base font-semibold mb-1">Không tìm thấy kho tri thức phù hợp</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {loadState === "ready" && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(kb => (
            <KbCard
              key={kb.id}
              kb={kb}
              onOpen={() => navigate(`/knowledge/${kb.id}`)}
              onEdit={() => setEditTarget(kb)}
              onShare={() => setShareTarget(kb)}
              onDelete={() => setDeleteTarget(kb)}
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
          onSave={sharing => knowledgeBaseStore.updateSharing(shareTarget.id, sharing)}
          onClose={() => { setShareTarget(null); refresh(); }}
        />
      )}
      {deleteTarget && (
        <DeleteKnowledgeBaseDialog open={!!deleteTarget} kb={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={refresh} />
      )}
    </div>
  );
}
