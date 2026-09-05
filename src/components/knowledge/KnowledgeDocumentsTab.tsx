import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, ChevronDown, Plus, MoreVertical, X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { knowledgeDocumentStore, type KnowledgeDocument } from "./knowledgeDocumentStore";
import { KnowledgeStatusPill, type KnowledgeProcessingStatus } from "./knowledgeStatus";
import { formatFileSize } from "./formatFileSize";
import FileTypeIcon from "./FileTypeIcon";
import UploadDocumentsModal from "./UploadDocumentsModal";
import ChunkViewerModal from "./ChunkViewerModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import DocumentLayoutViewer from "./DocumentLayoutViewer";
import CreateFolderModal from "./CreateFolderModal";
import MoveToFolderModal from "./MoveToFolderModal";

const STATUS_OPTIONS: { value: KnowledgeProcessingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Đang chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "done", label: "Hoàn thành" },
  { value: "failed", label: "Xử lý thất bại" },
  { value: "cancelled", label: "Đã hủy" },
];

const SUPPORTED_FORMATS_LINE = "Hỗ trợ TXT, MD, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV · Tối đa 10 tệp mỗi lần · 30MB mỗi tệp";

export default function KnowledgeDocumentsTab({ kbId, viewOnly }: { kbId: string; viewOnly: boolean }) {
  const [params, setParams] = useSearchParams();
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<KnowledgeProcessingStatus | "all">("all");
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [renaming, setRenaming] = useState<KnowledgeDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [reprocessTarget, setReprocessTarget] = useState<KnowledgeDocument | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<KnowledgeDocument[] | null>(null);
  const [layoutTarget, setLayoutTarget] = useState<KnowledgeDocument | null>(null);
  const [versionTarget, setVersionTarget] = useState<KnowledgeDocument | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [moveTargets, setMoveTargets] = useState<KnowledgeDocument[] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const openId = params.get("docId");
  const openDoc = openId ? knowledgeDocumentStore.get(kbId, openId) : undefined;
  const canOpen = (s: KnowledgeProcessingStatus) => s === "done" || s === "processing";

  useEffect(() => {
    if (!showCreateMenu) return;
    const h = (e: MouseEvent) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCreateMenu]);

  const all = knowledgeDocumentStore.list(kbId);
  void tick;
  const q = query.trim().toLowerCase();
  const openFolder = folderFilter ? all.find(d => d.id === folderFilter) : undefined;
  const filtered = all.filter(d =>
    (!q || d.name.toLowerCase().includes(q)) &&
    (statusFilter === "all" || d.status === statusFilter) &&
    (folderFilter === null || d.folderId === folderFilter),
  );

  const refresh = () => setTick(t => t + 1);
  const openDocument = (id: string) => setParams({ docId: id });
  const closeViewer = () => { const next = new URLSearchParams(params); next.delete("docId"); setParams(next, { replace: true }); };

  const toggleRow = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-4 sm:p-8 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm tài liệu..."
              className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setStatusOpen(v => !v)}
              onBlur={() => setTimeout(() => setStatusOpen(false), 150)}
              className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-sm transition-base ${
                statusFilter !== "all" ? "border-primary/30 bg-primary-soft text-primary font-medium" : "border-border bg-surface hover:bg-surface-muted"
              }`}
            >
              Trạng thái: {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
              <ChevronDown size={12} className={`transition-base ${statusFilter !== "all" ? "text-primary" : "text-muted-foreground"} ${statusOpen ? "rotate-180" : ""}`} />
            </button>
            {statusOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-52 max-w-xs bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                {STATUS_OPTIONS.map(o => (
                  <button key={o.value} onMouseDown={() => setStatusFilter(o.value)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-base hover:bg-surface-muted ${statusFilter === o.value ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")} className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline transition-base">
              Xóa bộ lọc
            </button>
          )}
        </div>

        {!viewOnly && (
          <div className="relative" ref={createMenuRef}>
            <button onClick={() => setShowCreateMenu(v => !v)} className="btn-primary h-9">
              <Plus size={14} /> Tạo <ChevronDown size={12} className={`transition-base ${showCreateMenu ? "rotate-180" : ""}`} />
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
                <button
                  onClick={() => { setShowCreateMenu(false); setShowCreateFolder(true); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base"
                >
                  Thư mục mới
                </button>
                <button onClick={() => { setShowCreateMenu(false); setShowUpload(true); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
                  Tải tài liệu lên
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {openFolder && (
        <div className="flex items-center gap-1.5 text-sm mb-3">
          <button onClick={() => setFolderFilter(null)} className="text-primary font-medium hover:underline">Tất cả tài liệu</button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate">{openFolder.name}</span>
        </div>
      )}

      {!viewOnly && <p className="text-xs text-muted-foreground mb-3 lg:whitespace-nowrap">{SUPPORTED_FORMATS_LINE}</p>}

      {selected.size > 0 && !viewOnly && (
        <div className="flex items-center gap-3 mb-3 px-3 h-10 rounded-lg bg-primary-soft border border-primary/15">
          <span className="text-sm font-medium text-primary">Đã chọn {selected.size} mục</span>
          <button onClick={() => setMoveTargets(all.filter(d => selected.has(d.id)))} className="text-xs font-semibold text-primary hover:underline">
            Di chuyển
          </button>
          <button onClick={() => setDeleteTargets(all.filter(d => selected.has(d.id)))} className="text-xs font-semibold text-destructive hover:underline">
            Xóa
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline ml-auto">
            Bỏ chọn
          </button>
        </div>
      )}

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-base font-semibold mb-1">Chưa có tài liệu nào</h3>
          {viewOnly ? (
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Chủ sở hữu chưa thêm tài liệu vào kho tri thức này.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">Tải tài liệu lên để Agent có thể tra cứu nội dung.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">{SUPPORTED_FORMATS_LINE}</p>
              <button onClick={() => setShowUpload(true)} className="btn-primary h-9 mx-auto">Tải tài liệu lên</button>
            </>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Không có tài liệu phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto scroll-shadow-x">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                {!viewOnly && <th className="w-10 px-4 py-2.5"><span className="sr-only">Chọn</span></th>}
                <th className="text-left px-2 py-2.5 kb-table-header">Tên</th>
                <th className="text-left px-2 py-2.5 kb-table-header">Trạng thái</th>
                <th className="text-left px-2 py-2.5 kb-table-header">Kích thước</th>
                <th className="text-left px-2 py-2.5 kb-table-header">Phiên bản</th>
                <th className="text-left px-2 py-2.5 kb-table-header">Cập nhật</th>
                <th className="text-left px-2 py-2.5 kb-table-header">Cập nhật bởi</th>
                {!viewOnly && <th className="px-4 py-2.5 w-12" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const openable = d.isFolder || canOpen(d.status);
                return (
                <tr key={d.id} className={`border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base ${highlightId === d.id ? "bg-primary-soft/40" : ""}`}>
                  {!viewOnly && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleRow(d.id)} className="w-4 h-4 accent-primary" aria-label={`Chọn ${d.name}`} />
                    </td>
                  )}
                  <td className="px-2 py-3 max-w-[380px]">
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => d.isFolder ? setFolderFilter(d.id) : openable && openDocument(d.id)}
                          className="flex items-center gap-2 w-full min-w-0 text-left disabled:cursor-default"
                          disabled={!d.isFolder && !openable}
                        >
                          <FileTypeIcon kind={d.isFolder ? "folder" : undefined} name={d.isFolder ? undefined : d.name} />
                          <span className={`text-sm font-medium truncate block min-w-0 ${!d.isFolder && !openable ? "text-muted-foreground" : ""}`}>{d.name}</span>
                        </button>
                      </TooltipTrigger>
                      {!d.isFolder && !openable && <TooltipContent>Tài liệu chưa xử lý xong nên chưa xem được nội dung.</TooltipContent>}
                    </Tooltip>
                  </td>
                  <td className="px-2 py-3">
                    {!d.isFolder && (
                      <span title={d.status === "failed" ? d.statusReason : undefined}>
                        <KnowledgeStatusPill status={d.status} />
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">{d.isFolder ? "—" : formatFileSize(d.sizeBytes)}</td>
                  <td className="px-2 py-3">
                    {!d.isFolder && (
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setVersionTarget(d)}
                            aria-label="Xem lịch sử phiên bản"
                            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2.5 rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-base"
                          >
                            <span className="chip chip-muted pointer-events-none">v{d.version}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Xem lịch sử phiên bản</TooltipContent>
                      </Tooltip>
                    )}
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(d.updatedAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-2 py-3 text-xs text-muted-foreground truncate">{d.updatedBy}</td>
                  {!viewOnly && (
                    <td className="px-4 py-3 text-right">
                      {d.isFolder ? (
                        <FolderRowMenu
                          onOpen={() => setFolderFilter(d.id)}
                          onRename={() => { setRenaming(d); setRenameValue(d.name); }}
                          onMove={() => setMoveTargets([d])}
                          onDelete={() => setDeleteTargets([d])}
                        />
                      ) : (
                        <RowMenu
                          canOpen={openable}
                          onOpen={() => openDocument(d.id)}
                          onLayout={() => setLayoutTarget(d)}
                          onReprocess={() => setReprocessTarget(d)}
                          onRename={() => { setRenaming(d); setRenameValue(d.name); }}
                          onMove={() => setMoveTargets([d])}
                          onDelete={() => setDeleteTargets([d])}
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

      <UploadDocumentsModal open={showUpload} kbId={kbId} onClose={() => { setShowUpload(false); refresh(); }} />

      {openDoc && <ChunkViewerModal kbId={kbId} sourceType="document" sourceId={openDoc.id} sourceName={openDoc.name} sourceStatus={openDoc.status} sourceCreatedAt={openDoc.createdAt} onClose={closeViewer} viewOnly={viewOnly} />}
      {layoutTarget && <DocumentLayoutViewer document={layoutTarget} onClose={() => setLayoutTarget(null)} />}
      {versionTarget && (
        <VersionHistoryPanel
          source={{ id: versionTarget.id, kbId: versionTarget.kbId, name: versionTarget.name, sourceType: "document", version: versionTarget.version, updatedAt: versionTarget.updatedAt, updatedBy: versionTarget.updatedBy }}
          onClose={() => setVersionTarget(null)}
          viewOnly={viewOnly}
        />
      )}

      {renaming && (
        <RenameDialog
          label={renaming.isFolder ? "Tên thư mục" : "Tên tài liệu"}
          maxLength={renaming.isFolder ? 50 : RENAME_MAX}
          value={renameValue}
          onChange={setRenameValue}
          onCancel={() => setRenaming(null)}
          isDuplicate={renaming.isFolder ? name => knowledgeDocumentStore.isDuplicateFolderName(kbId, name, renaming.folderId, renaming.id) : undefined}
          onConfirm={() => { knowledgeDocumentStore.rename(renaming.id, renameValue); setRenaming(null); refresh(); }}
        />
      )}

      <CreateFolderModal
        open={showCreateFolder}
        existingNames={knowledgeDocumentStore.listFolders(kbId).map(f => f.name)}
        onClose={() => setShowCreateFolder(false)}
        onCreate={name => {
          const folder = knowledgeDocumentStore.createFolder(kbId, name);
          toast.success(`Đã tạo thư mục "${name}".`);
          setHighlightId(folder.id);
          setTimeout(() => setHighlightId(null), 2000);
          refresh();
        }}
      />

      {moveTargets && (
        <MoveToFolderModal
          open={!!moveTargets}
          count={moveTargets.length}
          folders={knowledgeDocumentStore.listFolders(kbId)}
          disabledIds={new Set(moveTargets.filter(m => m.isFolder).flatMap(m => [m.id, ...knowledgeDocumentStore.getDescendantFolderIds(kbId, m.id)]))}
          onClose={() => setMoveTargets(null)}
          onConfirm={folderId => {
            knowledgeDocumentStore.moveMany(moveTargets.map(m => m.id), folderId);
            setSelected(new Set());
            refresh();
          }}
        />
      )}

      <AlertDialog open={!!reprocessTarget} onOpenChange={v => !v && setReprocessTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xử lý lại toàn bộ chunk?</AlertDialogTitle>
            <AlertDialogDescription>Hệ thống sẽ tạo lại chunk từ tài liệu gốc. Các chunk bạn đã chỉnh sửa thủ công sẽ được giữ nguyên và đánh dấu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (reprocessTarget) knowledgeDocumentStore.reprocess(reprocessTarget.id);
                setReprocessTarget(null);
                refresh();
              }}
            >
              Xử lý lại
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTargets} onOpenChange={v => !v && setDeleteTargets(null)}>
        <AlertDialogContent>
          {(() => {
            if (!deleteTargets) return null;
            const folderTargets = deleteTargets.filter(d => d.isFolder);
            const cascadeDocCount = folderTargets.reduce((sum, f) => sum + knowledgeDocumentStore.countDocumentsInFolder(kbId, f.id), 0);
            const isSingleFolder = deleteTargets.length === 1 && folderTargets.length === 1;
            const title = isSingleFolder ? "Xóa thư mục này?" : deleteTargets.length === 1 ? `Xóa "${deleteTargets[0].name}"?` : `Xóa ${deleteTargets.length} mục?`;
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isSingleFolder ? (
                      <>
                        Thư mục "{folderTargets[0].name}" và toàn bộ tài liệu bên trong sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                        <br /><br />
                        Thư mục đang chứa {cascadeDocCount} tài liệu.
                      </>
                    ) : (
                      <>
                        Nội dung và toàn bộ chunk liên quan sẽ bị xóa vĩnh viễn khỏi kho tri thức.
                        {folderTargets.length > 0 && <><br /><br />Các thư mục đã chọn đang chứa {cascadeDocCount} tài liệu.</>}
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      for (const f of folderTargets) knowledgeDocumentStore.removeFolderCascade(kbId, f.id);
                      const fileIds = deleteTargets.filter(d => !d.isFolder).map(d => d.id);
                      if (fileIds.length > 0) knowledgeDocumentStore.removeMany(fileIds);
                      toast.success(deleteTargets.length === 1 ? `Đã xóa "${deleteTargets[0].name}".` : `Đã xóa ${deleteTargets.length} mục.`);
                      setDeleteTargets(null);
                      setSelected(new Set());
                      refresh();
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

function RowMenu({ canOpen, onOpen, onLayout, onReprocess, onRename, onMove, onDelete }: {
  canOpen: boolean; onOpen: () => void; onLayout: () => void; onReprocess: () => void; onRename: () => void; onMove: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; disabledTooltip?: string }[] = [
    { label: "Mở", onClick: onOpen, disabled: !canOpen, disabledTooltip: "Tài liệu chưa xử lý xong nên chưa xem được nội dung." },
    { label: "Xem bố cục tài liệu", onClick: onLayout },
    { label: "Xử lý lại", onClick: onReprocess },
    { label: "Đổi tên", onClick: onRename },
    { label: "Di chuyển", onClick: onMove },
    { label: "Xóa", onClick: onDelete, danger: true },
  ];

  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} aria-label="Thao tác" className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
          {items.map((item, i) => {
            const isFirstDanger = item.danger && !items[i - 1]?.danger;
            const button = (
              <button
                disabled={item.disabled}
                onClick={() => { if (item.disabled) return; setOpen(false); item.onClick(); }}
                className={`w-full text-left px-3 py-2 text-sm transition-base ${
                  item.disabled ? "text-muted-foreground/50 cursor-not-allowed" :
                  item.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"
                }`}
              >
                {item.label}
              </button>
            );
            return (
              <div key={item.label} className={isFirstDanger ? "mt-1 pt-1 border-t border-border" : undefined}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild><span>{button}</span></TooltipTrigger>
                  {item.disabled && item.disabledTooltip && <TooltipContent side="left">{item.disabledTooltip}</TooltipContent>}
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FolderRowMenu({ onOpen, onRename, onMove, onDelete }: {
  onOpen: () => void; onRename: () => void; onMove: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items: { label: string; onClick: () => void; danger?: boolean }[] = [
    { label: "Mở", onClick: onOpen },
    { label: "Đổi tên", onClick: onRename },
    { label: "Di chuyển", onClick: onMove },
    { label: "Xóa", onClick: onDelete, danger: true },
  ];

  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} aria-label="Thao tác thư mục" className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
          {items.map((item, i) => (
            <div key={item.label} className={item.danger && !items[i - 1]?.danger ? "mt-1 pt-1 border-t border-border" : undefined}>
              <button
                onClick={() => { setOpen(false); item.onClick(); }}
                className={`w-full text-left px-3 py-2 text-sm transition-base ${item.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"}`}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const RENAME_MAX = 100;

function RenameDialog({ label = "Tên tài liệu", maxLength = RENAME_MAX, value, onChange, onCancel, onConfirm, isDuplicate }: {
  label?: string; maxLength?: number; value: string; onChange: (v: string) => void; onCancel: () => void; onConfirm: () => void;
  isDuplicate?: (name: string) => boolean;
}) {
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim();
  const error = touched
    ? !trimmed ? `Vui lòng nhập ${label.toLowerCase()}.`
      : isDuplicate?.(trimmed) ? `${label} đã tồn tại. Vui lòng chọn tên khác.`
      : null
    : null;
  const submit = () => { setTouched(true); if (!trimmed || isDuplicate?.(trimmed)) return; onConfirm(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Đổi tên</h3>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground"><X size={14} /></button>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">{label} <span className="text-destructive">*</span></label>
          <span className="text-xs text-muted-foreground">{value.length}/{maxLength}</span>
        </div>
        <input
          autoFocus
          value={value}
          maxLength={maxLength}
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
