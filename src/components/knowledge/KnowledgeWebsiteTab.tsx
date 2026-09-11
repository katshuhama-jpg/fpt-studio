import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ChevronDown, Plus, Clock, Settings2, Map as MapIcon, X } from "lucide-react";
import FileTypeIcon from "./FileTypeIcon";
import CreateFolderModal from "./CreateFolderModal";
import MoveToFolderModal from "./MoveToFolderModal";
import RowActionMenu from "./RowActionMenu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { knowledgeUrlStore, type KnowledgeUrl, type UrlSource } from "./knowledgeUrlStore";
import { knowledgeStore } from "./knowledgeStore";
import { agentHasEditRights, AgentOwnerCell, AgentEnabledToggle } from "./AgentKnowledgeCells";
import { knowledgeSettingsStore, shortCadence } from "./knowledgeSettingsStore";
import { KnowledgeStatusPill, type KnowledgeProcessingStatus } from "./knowledgeStatus";
import { formatVersion } from "./semver";
import ChunkViewerModal from "./ChunkViewerModal";
import AddUrlModal from "./AddUrlModal";
import ShareKnowledgeBaseModal from "./ShareKnowledgeBaseModal";
import UrlScheduleOverrideModal from "./UrlScheduleOverrideModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import SyncSettingsModal from "./SyncSettingsModal";
import ManageSitemapsModal from "./ManageSitemapsModal";
import { knowledgeSitemapStore } from "./knowledgeSitemapStore";

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

/** Pass either `kbId` (Console Website tab) or `agentId` (Agent Details "Tri thức của Agent" >
 * Website tab) — never both. Agent mode reuses this exact component scoped to one Agent's
 * attached URLs across every KB, with "Sở hữu"/"Kích hoạt" columns Console never shows, no folder
 * browsing or KB-wide sync/sitemap settings (all inherently single-KB concepts this cross-KB view
 * has no single answer for), and the row menu/click behavior from Round 4 Prompt F: no "Mở", not
 * clickable, just Chia sẻ / Xử lý lại / Xóa / Gỡ khỏi Agent. */
export default function KnowledgeWebsiteTab({ kbId, agentId, viewOnly }: { kbId?: string; agentId?: string; viewOnly: boolean }) {
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
  const [showManageSitemaps, setShowManageSitemaps] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<KnowledgeUrl | null>(null);
  const [versionTarget, setVersionTarget] = useState<KnowledgeUrl | null>(null);
  const [shareTargets, setShareTargets] = useState<KnowledgeUrl[] | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<KnowledgeUrl[] | null>(null);
  const [detachTarget, setDetachTarget] = useState<KnowledgeUrl | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [moveTargets, setMoveTargets] = useState<KnowledgeUrl[] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<KnowledgeUrl | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const createMenuRef = useRef<HTMLDivElement>(null);

  const openId = params.get("urlId");
  const openUrl = !agentId && openId ? knowledgeUrlStore.get(kbId!, openId) : undefined;

  useEffect(() => {
    if (!showCreateMenu) return;
    const h = (e: MouseEvent) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCreateMenu]);

  const agentRows = agentId ? knowledgeStore.listForAgent(agentId).filter(r => r.kind === "url") : [];
  const agentMeta = new Map(agentRows.map(r => [r.id, r]));
  const all: KnowledgeUrl[] = agentId
    ? agentRows.map(r => knowledgeUrlStore.get(r.kbId, r.id)).filter((u): u is KnowledgeUrl => !!u)
    : knowledgeUrlStore.list(kbId!);
  const settings = !agentId ? knowledgeSettingsStore.get(kbId!) : undefined;
  const sitemapCount = !agentId ? knowledgeSitemapStore.list(kbId!).length : 0;
  void tick;
  const refresh = () => setTick(t => t + 1);
  const q = query.trim().toLowerCase();
  const openFolder = folderFilter ? all.find(u => u.id === folderFilter) : undefined;
  const filtered = all.filter(u =>
    (!q || u.name.toLowerCase().includes(q) || (u.url ?? "").toLowerCase().includes(q)) &&
    (statusFilter === "all" || u.status === statusFilter) &&
    (sourceFilter === "all" || u.source === sourceFilter) &&
    (folderFilter === null || u.folderId === folderFilter),
  );

  const openViewer = (id: string) => { const next = new URLSearchParams(params); next.set("urlId", id); setParams(next); };
  const closeViewer = () => { const next = new URLSearchParams(params); next.delete("urlId"); setParams(next, { replace: true }); };
  const toggleRow = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));
  const someFilteredSelected = filtered.some(u => selected.has(u.id));
  const toggleSelectAll = () => setSelected(allFilteredSelected ? new Set() : new Set(filtered.map(u => u.id)));

  const syncNow = (ids: string[]) => {
    for (const id of ids) {
      knowledgeUrlStore.updateStatus(id, "processing");
      setTimeout(() => knowledgeUrlStore.updateStatus(id, "done", { lastSyncAt: Date.now(), lastSyncOk: true }), 1200);
    }
    refresh();
    toast.success(ids.length === 1 ? "Đang đồng bộ URL." : `Đang đồng bộ ${ids.length} URL.`);
  };

  const headerRowClass = agentId ? "border-b-2 border-border bg-surface-muted" : "border-b border-border bg-surface-muted";
  const headerCellClass = agentId
    ? "text-left px-2 py-2.5 text-xs font-bold uppercase tracking-[0.04em] text-foreground whitespace-nowrap"
    : "text-left px-2 py-2.5 kb-table-header";
  const nameWeightClass = agentId ? "font-semibold" : "font-medium";

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
            <button onClick={() => setStatusOpen(v => !v)} onBlur={() => setTimeout(() => setStatusOpen(false), 150)} className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-sm transition-base ${statusFilter !== "all" ? "border-primary/30 bg-primary-soft text-primary font-medium" : "border-border bg-surface hover:bg-surface-muted"}`}>
              Trạng thái: {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
              <ChevronDown size={12} className={`transition-base ${statusFilter !== "all" ? "text-primary" : "text-muted-foreground"} ${statusOpen ? "rotate-180" : ""}`} />
            </button>
            {statusOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-52 max-w-xs bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                {STATUS_OPTIONS.map(o => (
                  <button key={o.value} onMouseDown={() => setStatusFilter(o.value)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-base hover:bg-surface-muted ${statusFilter === o.value ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setSourceOpen(v => !v)} onBlur={() => setTimeout(() => setSourceOpen(false), 150)} className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-sm transition-base ${sourceFilter !== "all" ? "border-primary/30 bg-primary-soft text-primary font-medium" : "border-border bg-surface hover:bg-surface-muted"}`}>
              Nguồn: {SOURCE_OPTIONS.find(o => o.value === sourceFilter)?.label}
              <ChevronDown size={12} className={`transition-base ${sourceFilter !== "all" ? "text-primary" : "text-muted-foreground"} ${sourceOpen ? "rotate-180" : ""}`} />
            </button>
            {sourceOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-52 max-w-xs bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                {SOURCE_OPTIONS.map(o => (
                  <button key={o.value} onMouseDown={() => setSourceFilter(o.value)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-base hover:bg-surface-muted ${sourceFilter === o.value ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
          {(statusFilter !== "all" || sourceFilter !== "all") && (
            <button onClick={() => { setStatusFilter("all"); setSourceFilter("all"); }} className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline transition-base">
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!agentId && (
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
                    {settings?.scheduleEnabled && <span className="chip chip-muted ml-0.5">{shortCadence(settings.schedule)}</span>}
                  </button>
                </span>
              </TooltipTrigger>
              {all.length === 0 && <TooltipContent>Thêm URL trước khi cài đặt lịch đồng bộ.</TooltipContent>}
            </Tooltip>
          )}

          {!viewOnly && !agentId && (
            <button
              onClick={() => setShowManageSitemaps(true)}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
            >
              <MapIcon size={14} />
              Quản lý sitemap
              {sitemapCount > 0 && <span className="chip chip-muted ml-0.5">{sitemapCount}</span>}
            </button>
          )}

          {!viewOnly && (
            <div className="relative" ref={createMenuRef}>
              <button onClick={() => setShowCreateMenu(v => !v)} className="btn-primary h-9">
                <Plus size={14} /> Tạo <ChevronDown size={12} className={`transition-base ${showCreateMenu ? "rotate-180" : ""}`} />
              </button>
              {showCreateMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
                  <button onClick={() => { setShowCreateMenu(false); setShowAddUrl(true); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">URL mới</button>
                  {!agentId && (
                    <button
                      onClick={() => { setShowCreateMenu(false); setShowCreateFolder(true); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base"
                    >
                      Thư mục mới
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {openFolder && (
        <div className="flex items-center gap-1.5 text-sm mb-3">
          <button onClick={() => setFolderFilter(null)} className="text-primary font-medium hover:underline">Tất cả URL</button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate">{openFolder.name}</span>
        </div>
      )}

      {selected.size > 0 && !viewOnly && (
        <div className="flex items-center gap-3 mb-3 px-3 h-10 rounded-lg bg-primary-soft border border-primary/15">
          <span className="text-sm font-medium text-primary">Đã chọn {selected.size} mục</span>
          <button onClick={() => syncNow([...selected])} className="text-xs font-semibold text-primary hover:underline">{agentId ? "Xử lý lại" : "Đồng bộ ngay"}</button>
          {agentId && (
            <button onClick={() => setShareTargets(all.filter(u => selected.has(u.id)))} className="text-xs font-semibold text-primary hover:underline">Chia sẻ</button>
          )}
          {!agentId && (
            <button onClick={() => setMoveTargets(all.filter(u => selected.has(u.id)))} className="text-xs font-semibold text-primary hover:underline">
              Di chuyển
            </button>
          )}
          <button onClick={() => setDeleteTargets(all.filter(u => selected.has(u.id)))} className="text-xs font-semibold text-destructive hover:underline">Xóa</button>
        </div>
      )}

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-base font-semibold mb-1">Chưa có URL nào</h3>
          {viewOnly ? (
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Chủ sở hữu chưa thêm đường dẫn website vào kho tri thức này.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Thêm đường dẫn website để Agent luôn tra cứu được nội dung mới nhất.</p>
              <button onClick={() => setShowAddUrl(true)} className="btn-primary h-9 mx-auto">Thêm URL</button>
            </>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Không có URL phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto scroll-shadow-x">
          <table className="w-full text-sm">
            <thead>
              <tr className={headerRowClass}>
                {!viewOnly && (
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={el => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-primary"
                      aria-label="Chọn tất cả"
                    />
                  </th>
                )}
                <th className={headerCellClass}>Tên</th>
                <th className={headerCellClass}>Nguồn</th>
                <th className={headerCellClass}>Trạng thái</th>
                <th className={headerCellClass}>Phiên bản</th>
                <th className={`${headerCellClass} min-w-[160px]`}>Đồng bộ lần cuối</th>
                <th className={`${headerCellClass} min-w-[120px]`}>Cập nhật bởi</th>
                {agentId && <th className={`${headerCellClass} min-w-[150px]`}>Sở hữu</th>}
                {agentId && <th className={headerCellClass}>Kích hoạt</th>}
                {!viewOnly && <th className="px-4 py-2.5 w-12" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const meta = agentId ? agentMeta.get(u.id) : undefined;
                const canEdit = agentId ? agentHasEditRights(u.updatedBy, u.sharing) : true;
                return (
                <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base ${highlightId === u.id ? "bg-primary-soft/40" : ""}`}>
                  {!viewOnly && (
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleRow(u.id)} className="w-4 h-4 accent-primary" aria-label={`Chọn ${u.name}`} /></td>
                  )}
                  <td className="px-2 py-3 max-w-[340px]">
                    {agentId ? (
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <FileTypeIcon kind="url" />
                        <div className="min-w-0 block w-full">
                          <div className={`text-sm ${nameWeightClass} truncate`}>{u.title}</div>
                          {u.url && <div className="text-xs text-muted-foreground truncate font-mono">{truncateMiddle(u.url)}</div>}
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => u.isFolder ? setFolderFilter(u.id) : openViewer(u.id)} className="flex items-center gap-2 w-full min-w-0 text-left disabled:cursor-default">
                        <FileTypeIcon kind={u.isFolder ? "folder" : "url"} />
                        <div className="min-w-0 block w-full">
                          <div className={`text-sm ${nameWeightClass} truncate`}>{u.isFolder ? u.name : u.title}</div>
                          {!u.isFolder && u.url && <div className="text-xs text-muted-foreground truncate font-mono">{truncateMiddle(u.url)}</div>}
                        </div>
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-3">{!u.isFolder && u.source && <span className="chip chip-muted">{SOURCE_LABEL[u.source]}</span>}</td>
                  <td className="px-2 py-3">{!u.isFolder && <KnowledgeStatusPill status={u.status} />}</td>
                  <td className="px-2 py-3">
                    {!u.isFolder && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setVersionTarget(u)}
                            aria-label="Xem lịch sử phiên bản"
                            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2.5 rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-base"
                          >
                            <span className="chip chip-muted pointer-events-none">{formatVersion(u.version)}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Xem lịch sử phiên bản</TooltipContent>
                      </Tooltip>
                    )}
                  </td>
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
                  {agentId && <td className="px-2 py-3"><AgentOwnerCell updatedBy={u.updatedBy} /></td>}
                  {agentId && (
                    <td className="px-2 py-3">
                      <AgentEnabledToggle enabled={meta?.enabled ?? true} onChange={v => { knowledgeStore.setEnabledForAgent(agentId, "url", u.id, v); refresh(); }} />
                    </td>
                  )}
                  {!viewOnly && (
                    <td className="px-4 py-3 text-right">
                      {agentId ? (
                        <RowActionMenu
                          items={[
                            { label: "Chia sẻ", onClick: () => setShareTargets([u]) },
                            { label: "Xử lý lại", onClick: () => syncNow([u.id]) },
                            ...(canEdit ? [{ label: "Xóa", onClick: () => setDeleteTargets([u]), danger: true }] : []),
                            { label: "Gỡ khỏi Agent", onClick: () => setDetachTarget(u) },
                          ]}
                        />
                      ) : u.isFolder ? (
                        <RowActionMenu
                          ariaLabel="Thao tác thư mục"
                          items={[
                            { label: "Mở", onClick: () => setFolderFilter(u.id) },
                            { label: "Đổi tên", onClick: () => { setRenaming(u); setRenameValue(u.name); } },
                            { label: "Di chuyển", onClick: () => setMoveTargets([u]) },
                            { label: "Xóa", onClick: () => setDeleteTargets([u]), danger: true },
                          ]}
                        />
                      ) : (
                        <RowActionMenu
                          items={[
                            { label: "Mở", onClick: () => openViewer(u.id) },
                            { label: "Đồng bộ ngay", onClick: () => syncNow([u.id]) },
                            { label: "Cài đặt lịch riêng", onClick: () => setScheduleTarget(u) },
                            { label: "Di chuyển", onClick: () => setMoveTargets([u]) },
                            { label: "Xóa", onClick: () => setDeleteTargets([u]), danger: true },
                          ]}
                        />
                      )}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddUrlModal open={showAddUrl} kbId={agentId ? undefined : kbId} agentId={agentId} onClose={() => { setShowAddUrl(false); refresh(); }} />
      {showSyncSettings && kbId && <SyncSettingsModal kbId={kbId} viewOnly={viewOnly} onClose={() => setShowSyncSettings(false)} onSaved={refresh} />}
      {showManageSitemaps && kbId && <ManageSitemapsModal open={showManageSitemaps} kbId={kbId} onClose={() => { setShowManageSitemaps(false); refresh(); }} />}
      {openUrl && (
        <ChunkViewerModal
          kbId={kbId!}
          sourceType="url"
          sourceId={openUrl.id}
          sourceName={openUrl.title ?? openUrl.name}
          sourceStatus={openUrl.status}
          sourceCreatedAt={openUrl.createdAt}
          urlMeta={{ url: openUrl.url ?? "", source: openUrl.source ?? "specified", version: openUrl.version, lastSyncAt: openUrl.lastSyncAt }}
          onClose={closeViewer}
          viewOnly={viewOnly}
        />
      )}

      {!agentId && kbId && (
        <CreateFolderModal
          open={showCreateFolder}
          existingNames={knowledgeUrlStore.listFolders(kbId).map(f => f.name)}
          onClose={() => setShowCreateFolder(false)}
          onCreate={name => {
            const folder = knowledgeUrlStore.createFolder(kbId, name);
            toast.success(`Đã tạo thư mục "${name}".`);
            setHighlightId(folder.id);
            setTimeout(() => setHighlightId(null), 2000);
            refresh();
          }}
        />
      )}

      {moveTargets && kbId && (
        <MoveToFolderModal
          open={!!moveTargets}
          count={moveTargets.length}
          rootLabel="Danh sách URL chung"
          folders={knowledgeUrlStore.listFolders(kbId)}
          disabledIds={new Set(moveTargets.filter(m => m.isFolder).flatMap(m => [m.id, ...knowledgeUrlStore.getDescendantFolderIds(kbId, m.id)]))}
          onClose={() => setMoveTargets(null)}
          onConfirm={folderId => {
            knowledgeUrlStore.moveMany(moveTargets.map(m => m.id), folderId);
            setSelected(new Set());
            refresh();
          }}
        />
      )}

      {renaming && kbId && (
        <RenameFolderDialog
          value={renameValue}
          onChange={setRenameValue}
          onCancel={() => setRenaming(null)}
          isDuplicate={name => knowledgeUrlStore.isDuplicateFolderName(kbId, name, renaming.folderId, renaming.id)}
          onConfirm={() => { knowledgeUrlStore.rename(renaming.id, renameValue); setRenaming(null); refresh(); }}
        />
      )}
      {scheduleTarget && kbId && <UrlScheduleOverrideModal kbId={kbId} url={scheduleTarget} onClose={() => { setScheduleTarget(null); refresh(); }} />}
      {versionTarget && (
        <VersionHistoryPanel
          source={{ id: versionTarget.id, kbId: versionTarget.kbId, name: versionTarget.title ?? versionTarget.name, sourceType: "url", version: versionTarget.version, updatedAt: versionTarget.updatedAt, updatedBy: versionTarget.updatedBy }}
          onClose={() => setVersionTarget(null)}
          viewOnly={viewOnly}
        />
      )}

      {agentId && shareTargets && shareTargets.length > 0 && (
        <ShareKnowledgeBaseModal
          open
          title={shareTargets.length === 1 ? "Chia sẻ URL" : `Chia sẻ ${shareTargets.length} URL`}
          name={shareTargets.length === 1 ? (shareTargets[0].title ?? shareTargets[0].name) : undefined}
          ownerName={shareTargets.length === 1 ? shareTargets[0].updatedBy : "Tran Nam"}
          sharing={shareTargets.length === 1 ? (shareTargets[0].sharing ?? { mode: "private", people: [] }) : { mode: "private", people: [] }}
          querySharing={shareTargets.length === 1 ? (shareTargets[0].querySharing ?? { mode: "private", people: [] }) : { mode: "private", people: [] }}
          onSave={(sharing, querySharing) => {
            for (const t of shareTargets) {
              knowledgeUrlStore.updateSharing(t.id, sharing);
              if (querySharing) knowledgeUrlStore.updateQueryScope(t.id, querySharing);
            }
            setSelected(new Set());
          }}
          onClose={() => { setShareTargets(null); refresh(); }}
        />
      )}

      {agentId && (
        <AlertDialog open={!!detachTarget} onOpenChange={v => !v && setDetachTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Gỡ tài liệu khỏi Agent?</AlertDialogTitle>
              <AlertDialogDescription>Agent sẽ không còn tra cứu được nội dung này. URL vẫn được giữ nguyên trong kho tri thức của nó.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
              <AlertDialogAction
                className="bg-surface text-foreground border border-border hover:bg-surface-muted"
                onClick={() => {
                  if (detachTarget) knowledgeStore.detachFromAgent(agentId, "url", detachTarget.id);
                  setDetachTarget(null);
                  refresh();
                  toast.success("Đã gỡ khỏi Agent.");
                }}
              >
                Gỡ khỏi Agent
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={!!deleteTargets} onOpenChange={v => !v && setDeleteTargets(null)}>
        <AlertDialogContent>
          {(() => {
            if (!deleteTargets) return null;
            if (agentId) {
              const single = deleteTargets.length === 1;
              const others = single ? (agentMeta.get(deleteTargets[0].id)?.attachedAgentIds ?? []).filter(a => a !== agentId) : [];
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{single ? "Xóa URL này?" : `Xóa ${deleteTargets.length} mục?`}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>Nội dung sẽ bị xóa vĩnh viễn khỏi toàn bộ hệ thống, kể cả các Agent khác đang dùng chung URL này. Hành động này không thể hoàn tác.</p>
                        {others.length > 0 && (
                          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
                            <p className="text-xs text-destructive leading-relaxed">
                              {others.length} Agent khác đang dùng chung URL này và sẽ mất nguồn tra cứu.
                            </p>
                          </div>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        knowledgeUrlStore.removeMany(deleteTargets.map(d => d.id));
                        toast.success(single ? "Đã xóa mục đã chọn." : `Đã xóa ${deleteTargets.length} mục.`);
                        setDeleteTargets(null); setSelected(new Set()); refresh();
                      }}
                    >
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </>
              );
            }
            const folderTargets = deleteTargets.filter(d => d.isFolder);
            const cascadeCount = folderTargets.reduce((sum, f) => sum + knowledgeUrlStore.countUrlsInFolder(kbId!, f.id), 0);
            const isSingleFolder = deleteTargets.length === 1 && folderTargets.length === 1;
            const title = isSingleFolder ? "Xóa thư mục này?" : deleteTargets.length === 1 ? "Xóa URL này?" : `Xóa ${deleteTargets.length} mục?`;
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isSingleFolder ? (
                      <>
                        Thư mục "{folderTargets[0].name}" và toàn bộ URL bên trong sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                        <br /><br />
                        Thư mục đang chứa {cascadeCount} URL.
                      </>
                    ) : (
                      <>
                        Nội dung và toàn bộ chunk liên quan sẽ bị xóa vĩnh viễn khỏi kho tri thức.
                        {folderTargets.length > 0 && <><br /><br />Các thư mục đã chọn đang chứa {cascadeCount} URL.</>}
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      for (const f of folderTargets) knowledgeUrlStore.removeFolderCascade(kbId!, f.id);
                      const urlIds = deleteTargets.filter(d => !d.isFolder).map(d => d.id);
                      if (urlIds.length > 0) knowledgeUrlStore.removeMany(urlIds);
                      toast.success(deleteTargets.length === 1 ? "Đã xóa mục đã chọn." : `Đã xóa ${deleteTargets.length} mục.`);
                      setDeleteTargets(null); setSelected(new Set()); refresh();
                    }}
                  >
                    {isSingleFolder ? "Xác nhận và xóa" : "Xóa"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}

function RenameFolderDialog({ value, onChange, onCancel, onConfirm, isDuplicate }: {
  value: string; onChange: (v: string) => void; onCancel: () => void; onConfirm: () => void; isDuplicate: (name: string) => boolean;
}) {
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim();
  const error = touched
    ? !trimmed ? "Vui lòng nhập tên thư mục."
      : isDuplicate(trimmed) ? "Tên thư mục đã tồn tại. Vui lòng chọn tên khác."
      : null
    : null;
  const submit = () => { setTouched(true); if (!trimmed || isDuplicate(trimmed)) return; onConfirm(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Đổi tên thư mục</h3>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground"><X size={14} /></button>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">Tên thư mục <span className="text-destructive">*</span></label>
          <span className="text-xs text-muted-foreground">{value.length}/50</span>
        </div>
        <input
          autoFocus
          value={value}
          maxLength={50}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          className={`w-full h-10 px-3 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base ${error ? "border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"}`}
        />
        {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onCancel} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={submit} className="btn-primary h-9">Lưu</button>
        </div>
      </div>
    </div>
  );
}
