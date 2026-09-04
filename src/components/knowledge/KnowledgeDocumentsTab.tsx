import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, ChevronDown, Plus, MoreVertical, Folder, FileText, X,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { knowledgeDocumentStore, type KnowledgeDocument } from "./knowledgeDocumentStore";
import { KnowledgeStatusPill, type KnowledgeProcessingStatus } from "./knowledgeStatus";
import UploadDocumentsModal from "./UploadDocumentsModal";
import ChunkViewerModal from "./ChunkViewerModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import DocumentLayoutViewer from "./DocumentLayoutViewer";

const STATUS_OPTIONS: { value: KnowledgeProcessingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Đang chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "done", label: "Hoàn thành" },
  { value: "failed", label: "Xử lý thất bại" },
  { value: "cancelled", label: "Đã hủy" },
];

const SUPPORTED_FORMATS_LINE = "Hỗ trợ TXT, MD, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV · Tối đa 10 tệp mỗi lần · 30MB mỗi tệp";

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const createMenuRef = useRef<HTMLDivElement>(null);

  const openId = params.get("docId");
  const openDoc = openId ? knowledgeDocumentStore.get(kbId, openId) : undefined;

  useEffect(() => {
    if (!showCreateMenu) return;
    const h = (e: MouseEvent) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCreateMenu]);

  const all = knowledgeDocumentStore.list(kbId);
  void tick;
  const q = query.trim().toLowerCase();
  const filtered = all.filter(d => (!q || d.name.toLowerCase().includes(q)) && (statusFilter === "all" || d.status === statusFilter));

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
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
            >
              {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
              <ChevronDown size={12} className={`text-muted-foreground transition-base ${statusOpen ? "rotate-180" : ""}`} />
            </button>
            {statusOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] w-48 bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                {STATUS_OPTIONS.map(o => (
                  <button key={o.value} onMouseDown={() => setStatusFilter(o.value)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-base hover:bg-surface-muted ${statusFilter === o.value ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!viewOnly && (
          <div className="relative" ref={createMenuRef}>
            <button onClick={() => setShowCreateMenu(v => !v)} className="btn-primary h-9">
              <Plus size={14} /> Tạo <ChevronDown size={12} className={`transition-base ${showCreateMenu ? "rotate-180" : ""}`} />
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-border bg-white shadow-elev py-1">
                <button
                  onClick={() => {
                    setShowCreateMenu(false);
                    const name = window.prompt("Tên thư mục mới")?.trim();
                    if (name) { knowledgeDocumentStore.createFolder(kbId, name); refresh(); }
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base"
                >
                  Thư mục mới
                </button>
                <button onClick={() => { setShowCreateMenu(false); setShowUpload(true); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base">
                  Tải tài liệu lên
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3 lg:whitespace-nowrap">{SUPPORTED_FORMATS_LINE}</p>

      {selected.size > 0 && !viewOnly && (
        <div className="flex items-center gap-3 mb-3 px-3 h-10 rounded-lg bg-primary-soft border border-primary/15">
          <span className="text-sm font-medium text-primary">Đã chọn {selected.size} mục</span>
          <button
            onClick={() => {
              const folderId = window.prompt("Di chuyển tới thư mục (để trống = danh sách chung)");
              if (folderId === null) return;
              knowledgeDocumentStore.moveMany([...selected], folderId.trim() || null);
              setSelected(new Set());
              refresh();
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
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
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">Tải tài liệu lên để Agent có thể tra cứu nội dung.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">{SUPPORTED_FORMATS_LINE}</p>
          {!viewOnly && <button onClick={() => setShowUpload(true)} className="btn-primary h-9 mx-auto">Tải tài liệu lên</button>}
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
                <th className="w-10 px-4 py-2.5"><span className="sr-only">Chọn</span></th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tên</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kích thước</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chunk</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phiên bản</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cập nhật</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cập nhật bởi</th>
                <th className="px-4 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base">
                  <td className="px-4 py-3">
                    {!d.isFolder && (
                      <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleRow(d.id)} className="w-4 h-4 accent-primary" aria-label={`Chọn ${d.name}`} />
                    )}
                  </td>
                  <td className="px-2 py-3 max-w-[220px]">
                    <button
                      onClick={() => !d.isFolder && openDocument(d.id)}
                      className="flex items-center gap-2 w-full min-w-0 text-left disabled:cursor-default"
                      disabled={d.isFolder}
                    >
                      {d.isFolder ? <Folder size={15} className="text-muted-foreground shrink-0" /> : <FileText size={15} className="text-muted-foreground shrink-0" />}
                      <span className="text-sm font-medium truncate block min-w-0">{d.name}</span>
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    {!d.isFolder && (
                      <span title={d.status === "failed" ? d.statusReason : undefined}>
                        <KnowledgeStatusPill status={d.status} />
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">{d.isFolder ? "—" : formatSize(d.sizeBytes)}</td>
                  <td className="px-2 py-3 text-xs font-mono">{d.isFolder ? "—" : d.chunkCount}</td>
                  <td className="px-2 py-3">
                    {!d.isFolder && (
                      <button onClick={() => setVersionTarget(d)} className="chip chip-muted hover:opacity-80 transition-base">v{d.version}</button>
                    )}
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(d.updatedAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-2 py-3 text-xs text-muted-foreground truncate">{d.updatedBy}</td>
                  <td className="px-4 py-3 text-right">
                    {!d.isFolder && (
                      <RowMenu
                        viewOnly={viewOnly}
                        onOpen={() => openDocument(d.id)}
                        onLayout={() => setLayoutTarget(d)}
                        onReprocess={() => setReprocessTarget(d)}
                        onRename={() => { setRenaming(d); setRenameValue(d.name); }}
                        onDelete={() => setDeleteTargets([d])}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadDocumentsModal open={showUpload} kbId={kbId} onClose={() => { setShowUpload(false); refresh(); }} />

      {openDoc && <ChunkViewerModal kbId={kbId} sourceType="document" sourceId={openDoc.id} sourceName={openDoc.name} onClose={closeViewer} viewOnly={viewOnly} />}
      {layoutTarget && <DocumentLayoutViewer document={layoutTarget} onClose={() => setLayoutTarget(null)} />}
      {versionTarget && (
        <VersionHistoryPanel
          source={{ id: versionTarget.id, kbId: versionTarget.kbId, name: versionTarget.name, sourceType: "document", version: versionTarget.version, updatedAt: versionTarget.updatedAt, updatedBy: versionTarget.updatedBy }}
          onClose={() => setVersionTarget(null)}
        />
      )}

      {renaming && (
        <RenameDialog
          value={renameValue}
          onChange={setRenameValue}
          onCancel={() => setRenaming(null)}
          onConfirm={() => { knowledgeDocumentStore.rename(renaming.id, renameValue); setRenaming(null); refresh(); }}
        />
      )}

      <AlertDialog open={!!reprocessTarget} onOpenChange={v => !v && setReprocessTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xử lý lại toàn bộ chunk?</AlertDialogTitle>
            <AlertDialogDescription>Hệ thống sẽ tạo lại chunk từ tài liệu gốc. Các chunk bạn đã chỉnh sửa thủ công sẽ được giữ nguyên và đánh dấu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (reprocessTarget) knowledgeDocumentStore.reprocess(reprocessTarget.id);
              setReprocessTarget(null);
              refresh();
            }}>
              Xử lý lại
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTargets} onOpenChange={v => !v && setDeleteTargets(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTargets && deleteTargets.length === 1 ? `Xóa "${deleteTargets[0].name}"?` : `Xóa ${deleteTargets?.length} tài liệu?`}</AlertDialogTitle>
            <AlertDialogDescription>Nội dung và toàn bộ chunk liên quan sẽ bị xóa vĩnh viễn khỏi kho tri thức.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargets) {
                  knowledgeDocumentStore.removeMany(deleteTargets.map(d => d.id));
                  toast.success(deleteTargets.length === 1 ? `Đã xóa "${deleteTargets[0].name}".` : `Đã xóa ${deleteTargets.length} tài liệu.`);
                }
                setDeleteTargets(null);
                setSelected(new Set());
                refresh();
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

function RowMenu({ viewOnly, onOpen, onLayout, onReprocess, onRename, onDelete }: {
  viewOnly: boolean; onOpen: () => void; onLayout: () => void; onReprocess: () => void; onRename: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items: { label: string; onClick: () => void; danger?: boolean }[] = [{ label: "Mở", onClick: onOpen }, { label: "Xem bố cục tài liệu", onClick: onLayout }];
  if (!viewOnly) items.push({ label: "Xử lý lại", onClick: onReprocess }, { label: "Đổi tên", onClick: onRename }, { label: "Xóa", onClick: onDelete, danger: true });

  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} aria-label="Thao tác" className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-white shadow-elev py-1">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); item.onClick(); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-base ${item.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RenameDialog({ value, onChange, onCancel, onConfirm }: { value: string; onChange: (v: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Đổi tên</h3>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground"><X size={14} /></button>
        </div>
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onConfirm(); }}
          className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base mb-4"
        />
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          <button onClick={onConfirm} disabled={!value.trim()} className="btn-primary h-9 disabled:opacity-40">Lưu</button>
        </div>
      </div>
    </div>
  );
}
