import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreVertical, AlertTriangle, Users2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AGENTS } from "@/components/configure/agentStore";
import { workforceStore } from "@/components/workforce/workforceStore";
import type { Workforce, WorkforceStatus } from "@/components/workforce/types";
import CreateWorkforceModal from "@/components/workforce/CreateWorkforceModal";
import { DeleteWorkforceDialog } from "@/components/workforce/WorkforceDeleteDialogs";

const TABS: { key: WorkforceStatus | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
];

function relativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function sourceAgentIds(wf: Workforce): string[] {
  const ids = wf.nodes
    .filter(n => n.data.kind === "agent" && wf.edges.some(e => e.source === n.id))
    .map(n => (n.data as any).agentId as string);
  return Array.from(new Set(ids));
}

function routeCount(wf: Workforce): number {
  return wf.nodes.filter(n => n.data.kind === "condition").length;
}

function RenameWorkforceDialog({ workforce, onClose, onRenamed }: {
  workforce: Workforce; onClose: () => void; onRenamed: (name: string) => void;
}) {
  const [name, setName] = useState(workforce.name);
  const submit = () => onRenamed(name.trim() || "Untitled workforce");
  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Đổi tên Workforce</DialogTitle></DialogHeader>
        <div className="py-1">
          <label className="text-sm font-medium mb-1.5 block">Tên Workforce</label>
          <input
            autoFocus
            value={name}
            maxLength={100}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
          />
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} className="btn-primary h-9">Lưu</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardMenu({ onOpen, onRename, onDelete }: { onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Thao tác"
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-white shadow-elev py-1">
          <button onClick={() => { setOpen(false); onOpen(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base">Mở</button>
          <button onClick={() => { setOpen(false); onRename(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base">Đổi tên</button>
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">Xóa</button>
        </div>
      )}
    </div>
  );
}

function WorkforceCard({ wf, onOpen, onRename, onDelete }: { wf: Workforce; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  const agentIds = sourceAgentIds(wf);
  const routes = routeCount(wf);
  const shown = agentIds.slice(0, 4);
  const extra = agentIds.length - shown.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === "Enter") onOpen(); }}
      className="group rounded-xl border border-border bg-surface hover:border-primary/30 hover:shadow-elev transition-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{wf.name}</h3>
          <CardMenu onOpen={onOpen} onRename={onRename} onDelete={onDelete} />
        </div>

        <span className={`chip mb-3 ${wf.status === "published" ? "chip-success" : "chip-muted"}`}>
          {wf.status === "published" ? "Published" : "Draft"}
        </span>

        <p className="text-xs text-muted-foreground mb-3">
          {agentIds.length} Agent nguồn · {routes} route
        </p>

        {shown.length > 0 && (
          <div className="flex items-center mb-3">
            {shown.map((id, i) => {
              const agent = AGENTS.find(a => a.id === id);
              return (
                <div
                  key={id}
                  title={agent?.name}
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-surface shrink-0 ${agent?.bg ?? "bg-surface-muted"}`}
                >
                  {agent?.emoji ?? "🤖"}
                </div>
              );
            })}
            {extra > 0 && (
              <div style={{ marginLeft: -8 }} className="w-7 h-7 rounded-full bg-surface-muted border-2 border-surface flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                +{extra}
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-border text-xs text-muted-foreground">
          Cập nhật {relativeTime(wf.updatedAt)} · {wf.updatedBy}
        </div>
      </div>
    </div>
  );
}

export default function WorkforceList() {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [all, setAll] = useState<Workforce[]>([]);
  const [tab, setTab] = useState<WorkforceStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Workforce | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workforce | null>(null);

  useEffect(() => {
    setLoadState("loading");
    const t = setTimeout(() => {
      try {
        setAll(workforceStore.list());
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

  const refresh = () => setTick(t => t + 1);

  const counts: Record<WorkforceStatus | "all", number> = useMemo(() => ({
    all: all.length,
    published: all.filter(w => w.status === "published").length,
    draft: all.filter(w => w.status === "draft").length,
  }), [all]);

  const tabFiltered = tab === "all" ? all : all.filter(w => w.status === tab);
  const q = search.trim().toLowerCase();
  const filtered = q ? tabFiltered.filter(w => w.name.toLowerCase().includes(q)) : tabFiltered;

  const hasAny = all.length > 0;
  const clearFilters = () => { setTab("all"); setSearchInput(""); setSearch(""); };

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Workforce</h1>
          <p className="text-sm text-muted-foreground">
            Sắp xếp cách các Agent chuyển giao hội thoại cho nhau, cho Omni Supports, hoặc cho người trong Org.
          </p>
        </div>
        {hasAny && (
          <button onClick={() => setShowCreate(true)} className="btn-primary h-9 whitespace-nowrap shrink-0">
            <Plus size={14} /> Tạo Workforce mới
          </button>
        )}
      </div>

      {loadState === "loading" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <div className="pt-3 border-t border-border"><Skeleton className="h-3 w-2/3" /></div>
            </div>
          ))}
        </div>
      )}

      {loadState === "error" && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <AlertTriangle size={22} className="mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Chưa tải được danh sách Workforce.</p>
          <button onClick={refresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Thử lại</button>
        </div>
      )}

      {loadState === "ready" && !hasAny && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted text-muted-foreground flex items-center justify-center mb-3">
            <Users2 size={20} />
          </div>
          <h3 className="font-display text-base font-semibold mb-1">Chưa có Workforce nào</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Tạo Workforce để cấu hình luồng chuyển giao hội thoại giữa các Agent, Omni Supports và người trong Org.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary h-9 mx-auto">
            <Plus size={14} /> Tạo Workforce mới
          </button>
        </div>
      )}

      {loadState === "ready" && hasAny && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-border pb-3">
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
            <div className="relative shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm Workforce..."
                className="h-9 w-64 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
              <h3 className="font-display text-base font-semibold mb-1">Không tìm thấy Workforce phù hợp</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
              <button onClick={clearFilters} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(wf => (
                <WorkforceCard
                  key={wf.id}
                  wf={wf}
                  onOpen={() => navigate(`/workforce/${wf.id}`)}
                  onRename={() => setRenameTarget(wf)}
                  onDelete={() => setDeleteTarget(wf)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateWorkforceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={name => {
          const wf = workforceStore.create(name);
          setShowCreate(false);
          toast.success(`Đã tạo Workforce "${wf.name}".`);
          navigate(`/workforce/${wf.id}`);
        }}
      />

      {renameTarget && (
        <RenameWorkforceDialog
          workforce={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRenamed={name => {
            workforceStore.rename(renameTarget.id, name);
            toast.success(`Đã đổi tên thành "${name}".`);
            setRenameTarget(null);
            refresh();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteWorkforceDialog
          open={!!deleteTarget}
          name={deleteTarget.name}
          onOpenChange={v => !v && setDeleteTarget(null)}
          onConfirm={() => {
            workforceStore.remove(deleteTarget.id);
            toast.success(`Đã xóa "${deleteTarget.name}".`);
            setDeleteTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
