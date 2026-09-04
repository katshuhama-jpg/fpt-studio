import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ChevronDown, Plus, MoreVertical, Folder, Globe, Clock, Settings2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { knowledgeUrlStore, type KnowledgeUrl, type UrlSource } from "./knowledgeUrlStore";
import { knowledgeSettingsStore, shortCadence } from "./knowledgeSettingsStore";
import { KnowledgeStatusPill, type KnowledgeProcessingStatus } from "./knowledgeStatus";
import ChunkViewerModal from "./ChunkViewerModal";
import AddUrlModal from "./AddUrlModal";
import UrlScheduleOverrideModal from "./UrlScheduleOverrideModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import SyncSettingsDrawer from "./SyncSettingsDrawer";

const STATUS_OPTIONS: { value: KnowledgeProcessingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Đang chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "done", label: "Hoàn thành" },
  { value: "failed", label: "Xử lý thất bại" },
  { value: "cancelled", label: "Đã hủy" },
];
const SOURCE_LABEL: Record<UrlSource, string> = { specified: "URL chỉ định", crawled_child: "Trang con", sitemap: "Sitemap" };
const SOURCE_OPTIONS: { value: UrlSource | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "specified", label: "URL chỉ định" },
  { value: "crawled_child", label: "Trang con" },
  { value: "sitemap", label: "Sitemap" },
];

function truncateMiddle(url: string, max = 42): string {
  if (url.length <= max) return url;
  const half = Math.floor((max - 3) / 2);
  return `${url.slice(0, half)}...${url.slice(-half)}`;
}
function relativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function KnowledgeWebsiteTab({ kbId, viewOnly }: { kbId: string; viewOnly: boolean }) {
  const [params, setParams] = useSearchParams();
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<KnowledgeProcessingStatus | "all">("all");
  const [statusOpen, setStatusOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<UrlSource | "all">("all");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<KnowledgeUrl | null>(null);
  const [versionTarget, setVersionTarget] = useState<KnowledgeUrl | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<KnowledgeUrl[] | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const openId = params.get("urlId");
  const openUrl = openId ? knowledgeUrlStore.get(kbId, openId) : undefined;

  useEffect(() => {
    if (!showCreateMenu) return;
    const h = (e: MouseEvent) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCreateMenu]);

  const all = knowledgeUrlStore.list(kbId);
  const settings = knowledgeSettingsStore.get(kbId);
  void tick;
  const refresh = () => setTick(t => t + 1);
  const q = query.trim().toLowerCase();
  const filtered = all.filter(u =>
    (!q || u.name.toLowerCase().includes(q) || (u.url ?? "").toLowerCase().includes(q)) &&
    (statusFilter === "all" || u.status === statusFilter) &&
    (sourceFilter === "all" || u.source === sourceFilter),
  );

  const openViewer = (id: string) => setParams({ urlId: id });
  const closeViewer = () => { const next = new URLSearchParams(params); next.delete("urlId"); setParams(next, { replace: true }); };
  const toggleRow = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const syncNow = (ids: string[]) => {
    for (const id of ids) {
      knowledgeUrlStore.updateStatus(id, "processing");
      setTimeout(() => knowledgeUrlStore.updateStatus(id, "done", { lastSyncAt: Date.now(), lastSyncOk: true }), 1200);
    }
    refresh();
    toast.success(ids.length === 1 ? "Đang đồng bộ URL." : `Đang đồng bộ ${ids.length} URL.`);
  };

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-4 sm:p-8 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm URL hoặc thư mục..." className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="relative">
            <button onClick={() => setStatusOpen(v => !v)} onBlur={() => setTimeout(() => setStatusOpen(false), 150)} className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base">
              {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
              <ChevronDown size={12} className={`text-muted-foreground transition-base ${statusOpen ? "rotate-180" : ""}`} />
            </button>
            {statusOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] w-48 bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                {STATUS_OPTIONS.map(o => (
                  <button key={o.value} onMouseDown={() => setStatusFilter(o.value)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-base hover:bg-surface-muted ${statusFilter === o.value ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setSourceOpen(v => !v)} onBlur={() => setTimeout(() => setSourceOpen(false), 150)} className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base">
              {SOURCE_OPTIONS.find(o => o.value === sourceFilter)?.label}
              <ChevronDown size={12} className={`text-muted-foreground transition-base ${sourceOpen ? "rotate-180" : ""}`} />
            </button>
            {sourceOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] w-48 bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                {SOURCE_OPTIONS.map(o => (
                  <button key={o.value} onMouseDown={() => setSourceFilter(o.value)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-base hover:bg-surface-muted ${sourceFilter === o.value ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="outline-none">
                <button
                  onClick={() => setShowSyncSettings(true)}
                  disabled={all.length === 0}
                  className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
                >
                  <Settings2 size={14} />
                  Cài đặt đồng bộ
                  {settings.scheduleEnabled && <span className="chip chip-muted ml-0.5">{shortCadence(settings.schedule)}</span>}
                </button>
              </span>
            </TooltipTrigger>
            {all.length === 0 && <TooltipContent>Thêm URL trước khi cài đặt lịch đồng bộ.</TooltipContent>}
          </Tooltip>

          {!viewOnly && (
            <div className="relative" ref={createMenuRef}>
              <button onClick={() => setShowCreateMenu(v => !v)} className="btn-primary h-9">
                <Plus size={14} /> Tạo <ChevronDown size={12} className={`transition-base ${showCreateMenu ? "rotate-180" : ""}`} />
              </button>
              {showCreateMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-white shadow-elev py-1">
                  <button onClick={() => { setShowCreateMenu(false); setShowAddUrl(true); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base">URL mới</button>
                  <button
                    onClick={() => {
                      setShowCreateMenu(false);
                      const name = window.prompt("Tên thư mục mới")?.trim();
                      if (name) { knowledgeUrlStore.createFolder(kbId, name); refresh(); }
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base"
                  >
                    Thư mục mới
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selected.size > 0 && !viewOnly && (
        <div className="flex items-center gap-3 mb-3 px-3 h-10 rounded-lg bg-primary-soft border border-primary/15">
          <span className="text-sm font-medium text-primary">Đã chọn {selected.size} mục</span>
          <button onClick={() => syncNow([...selected])} className="text-xs font-semibold text-primary hover:underline">Đồng bộ ngay</button>
          <button
            onClick={() => {
              const folderId = window.prompt("Di chuyển tới thư mục (để trống = danh sách chung)");
              if (folderId === null) return;
              knowledgeUrlStore.moveMany([...selected], folderId.trim() || null);
              setSelected(new Set());
              refresh();
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Di chuyển
          </button>
          <button onClick={() => setDeleteTargets(all.filter(u => selected.has(u.id)))} className="text-xs font-semibold text-destructive hover:underline">Xóa</button>
        </div>
      )}

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-base font-semibold mb-1">Chưa có URL nào</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Thêm đường dẫn website để Agent luôn tra cứu được nội dung mới nhất.</p>
          {!viewOnly && <button onClick={() => setShowAddUrl(true)} className="btn-primary h-9 mx-auto">Thêm URL</button>}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Không có URL phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto scroll-shadow-x">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="w-10 px-4 py-2.5" />
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tên</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nguồn</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chunk</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phiên bản</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Đồng bộ lần cuối</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cập nhật bởi</th>
                <th className="px-4 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base">
                  <td className="px-4 py-3">{!u.isFolder && <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleRow(u.id)} className="w-4 h-4 accent-primary" aria-label={`Chọn ${u.name}`} />}</td>
                  <td className="px-2 py-3 max-w-[220px]">
                    <button onClick={() => !u.isFolder && openViewer(u.id)} disabled={u.isFolder} className="flex items-center gap-2 w-full min-w-0 text-left disabled:cursor-default">
                      {u.isFolder ? <Folder size={15} className="text-muted-foreground shrink-0" /> : <Globe size={15} className="text-muted-foreground shrink-0" />}
                      <div className="min-w-0 block w-full">
                        <div className="text-sm font-medium truncate">{u.isFolder ? u.name : u.title}</div>
                        {!u.isFolder && u.url && <div className="text-xs text-muted-foreground truncate font-mono">{truncateMiddle(u.url)}</div>}
                      </div>
                    </button>
                  </td>
                  <td className="px-2 py-3">{!u.isFolder && u.source && <span className="chip chip-muted">{SOURCE_LABEL[u.source]}</span>}</td>
                  <td className="px-2 py-3">{!u.isFolder && <KnowledgeStatusPill status={u.status} />}</td>
                  <td className="px-2 py-3 text-xs font-mono">{u.isFolder ? "—" : u.chunkCount}</td>
                  <td className="px-2 py-3">{!u.isFolder && <button onClick={() => setVersionTarget(u)} className="chip chip-muted hover:opacity-80 transition-base">v{u.version}</button>}</td>
                  <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {u.isFolder ? "—" : u.lastSyncAt ? (
                      <span className="flex items-center gap-1.5">
                        {u.lastSyncOk === false && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="w-1.5 h-1.5 rounded-full bg-destructive inline-block outline-none" />
                            </TooltipTrigger>
                            <TooltipContent>Đồng bộ thất bại lúc {new Date(u.lastSyncAt).toLocaleString("vi-VN")}. {u.lastSyncError}</TooltipContent>
                          </Tooltip>
                        )}
                        {relativeTime(u.lastSyncAt)}
                        {u.scheduleOverride?.enabled && (
                          <span className="chip chip-muted inline-flex items-center gap-1"><Clock size={9} /> Lịch riêng</span>
                        )}
                      </span>
                    ) : "Chưa đồng bộ"}
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground truncate">{u.updatedBy}</td>
                  <td className="px-4 py-3 text-right">
                    {!u.isFolder && (
                      <RowMenu
                        viewOnly={viewOnly}
                        onOpen={() => openViewer(u.id)}
                        onSync={() => syncNow([u.id])}
                        onSchedule={() => setScheduleTarget(u)}
                        onMove={() => {
                          const folderId = window.prompt("Di chuyển tới thư mục (để trống = danh sách chung)");
                          if (folderId === null) return;
                          knowledgeUrlStore.moveMany([u.id], folderId.trim() || null);
                          refresh();
                        }}
                        onDelete={() => setDeleteTargets([u])}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddUrlModal open={showAddUrl} kbId={kbId} onClose={() => { setShowAddUrl(false); refresh(); }} />
      {showSyncSettings && <SyncSettingsDrawer kbId={kbId} viewOnly={viewOnly} onClose={() => setShowSyncSettings(false)} onSaved={refresh} />}
      {openUrl && <ChunkViewerModal kbId={kbId} sourceType="url" sourceId={openUrl.id} sourceName={openUrl.title ?? openUrl.name} onClose={closeViewer} viewOnly={viewOnly} />}
      {scheduleTarget && <UrlScheduleOverrideModal kbId={kbId} url={scheduleTarget} onClose={() => { setScheduleTarget(null); refresh(); }} />}
      {versionTarget && (
        <VersionHistoryPanel
          source={{ id: versionTarget.id, kbId: versionTarget.kbId, name: versionTarget.title ?? versionTarget.name, sourceType: "url", version: versionTarget.version, updatedAt: versionTarget.updatedAt, updatedBy: versionTarget.updatedBy }}
          onClose={() => setVersionTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteTargets} onOpenChange={v => !v && setDeleteTargets(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTargets && deleteTargets.length === 1 ? "Xóa URL này?" : `Xóa ${deleteTargets?.length} URL?`}</AlertDialogTitle>
            <AlertDialogDescription>Nội dung và toàn bộ chunk liên quan sẽ bị xóa vĩnh viễn khỏi kho tri thức.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargets) { knowledgeUrlStore.removeMany(deleteTargets.map(u => u.id)); toast.success("Đã xóa URL đã chọn."); }
                setDeleteTargets(null); setSelected(new Set()); refresh();
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}

function RowMenu({ viewOnly, onOpen, onSync, onSchedule, onMove, onDelete }: {
  viewOnly: boolean; onOpen: () => void; onSync: () => void; onSchedule: () => void; onMove: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const items: { label: string; onClick: () => void; danger?: boolean }[] = [{ label: "Mở", onClick: onOpen }];
  if (!viewOnly) items.push(
    { label: "Đồng bộ ngay", onClick: onSync },
    { label: "Cài đặt lịch riêng", onClick: onSchedule },
    { label: "Di chuyển", onClick: onMove },
    { label: "Xóa", onClick: onDelete, danger: true },
  );
  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} aria-label="Thao tác" className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-white shadow-elev py-1">
          {items.map(item => (
            <button key={item.label} onClick={() => { setOpen(false); item.onClick(); }} className={`w-full text-left px-3 py-1.5 text-xs transition-base ${item.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"}`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
