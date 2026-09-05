import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Plus, MoreVertical, Info, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight, Download, Settings2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { knowledgeFaqStore, type KnowledgeFaq } from "./knowledgeFaqStore";
import { knowledgeBaseStore } from "./knowledgeBaseStore";
import { KnowledgeStatusPill, KNOWLEDGE_STATUS_META, type KnowledgeFaqStatus } from "./knowledgeStatus";
import { normalizeForCompare } from "./textSimilarity";
import { TruncatedText, CategoryChips } from "./FaqCellDisplays";
import AddEditFaqModal from "./AddEditFaqModal";
import ImportFaqModal from "./ImportFaqModal";
import ExportFaqModal from "./ExportFaqModal";
import AssignCategoriesModal from "./AssignCategoriesModal";
import ManageCategoriesModal from "./ManageCategoriesModal";

const STATUS_VALUES: KnowledgeFaqStatus[] = ["pending", "processing", "done", "failed", "invalid", "cancelled"];
const PAGE_SIZE_KEY = "knowledge_faq_page_size_v1";
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEBOUNCE_MS = 300;

function loadPageSize(): number {
  const raw = Number(localStorage.getItem(PAGE_SIZE_KEY));
  return PAGE_SIZE_OPTIONS.includes(raw) ? raw : 20;
}

/** Multi-select filter dropdown shared by the Danh mục and Trạng thái filters — checkbox list,
 * "Tất cả" when nothing is picked, "N đã chọn" once something is. */
function MultiSelectFilter({ label, options, selected, onToggle, onClear }: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-sm transition-base ${selected.size > 0 ? "border-primary/30 bg-primary-soft text-primary font-medium" : "border-border bg-surface hover:bg-surface-muted"}`}
      >
        {label}: {selected.size > 0 ? `${selected.size} đã chọn` : "Tất cả"}
        <ChevronDown size={12} className={`transition-base ${selected.size > 0 ? "text-primary" : "text-muted-foreground"} ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-64 max-h-72 overflow-y-auto bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">Không có tùy chọn nào.</p>
          ) : (
            <>
              {options.map(o => (
                <label key={o.value} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-surface-muted cursor-pointer">
                  <input type="checkbox" checked={selected.has(o.value)} onMouseDown={e => e.stopPropagation()} onChange={() => onToggle(o.value)} className="w-3.5 h-3.5 accent-primary shrink-0" />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs text-muted-foreground shrink-0">{o.count}</span>}
                </label>
              ))}
              {selected.size > 0 && (
                <button onMouseDown={e => { e.preventDefault(); onClear(); }} className="w-full text-left px-3 py-1.5 mt-1 border-t border-border text-xs font-semibold text-primary hover:underline">
                  Bỏ chọn tất cả
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeFaqTab({ kbId, viewOnly }: { kbId: string; viewOnly: boolean }) {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<KnowledgeFaqStatus>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(loadPageSize);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showBulkReprocessConfirm, setShowBulkReprocessConfirm] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeFaq | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<KnowledgeFaq[] | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const skipClearRef = useRef(true);

  useEffect(() => {
    if (!showCreateMenu) return;
    const h = (e: MouseEvent) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCreateMenu]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Selection survives paging within the same filter, but resets (with a toast) whenever the
  // search or a filter actually changes — and always resets back to page 1.
  const filterKey = `${debouncedQuery}|${[...statusFilter].sort().join(",")}|${[...categoryFilter].sort().join(",")}`;
  useEffect(() => {
    if (skipClearRef.current) { skipClearRef.current = false; return; }
    setPage(1);
    setSelected(prev => {
      if (prev.size > 0) toast.info("Đã bỏ chọn vì bộ lọc thay đổi.");
      return new Set();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const all = knowledgeFaqStore.list(kbId);
  const categoryOptions = knowledgeFaqStore.listCategoriesWithCounts(kbId);
  void tick;
  const refresh = () => setTick(t => t + 1);

  const nq = normalizeForCompare(debouncedQuery);
  const filtered = all.filter(f =>
    (!nq || normalizeForCompare(f.question).includes(nq)) &&
    (statusFilter.size === 0 || statusFilter.has(f.status)) &&
    (categoryFilter.size === 0 || f.categories.some(c => categoryFilter.has(c))),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const pageEnd = Math.min(clampedPage * pageSize, filtered.length);
  const pageItems = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const hasActiveFilter = debouncedQuery.trim().length > 0 || statusFilter.size > 0 || categoryFilter.size > 0;
  const clearFilters = () => { setQuery(""); setDebouncedQuery(""); setStatusFilter(new Set()); setCategoryFilter(new Set()); };

  const toggleRow = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleStatus = (v: string) => setStatusFilter(prev => { const n = new Set(prev); n.has(v as KnowledgeFaqStatus) ? n.delete(v as KnowledgeFaqStatus) : n.add(v as KnowledgeFaqStatus); return n; });
  const toggleCategory = (c: string) => setCategoryFilter(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const allOnPageSelected = pageItems.length > 0 && pageItems.every(f => selected.has(f.id));
  const someOnPageSelected = pageItems.some(f => selected.has(f.id));
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someOnPageSelected && !allOnPageSelected; }, [someOnPageSelected, allOnPageSelected]);
  const toggleSelectPage = () => {
    setSelected(prev => {
      const n = new Set(prev);
      if (allOnPageSelected) pageItems.forEach(f => n.delete(f.id));
      else pageItems.forEach(f => n.add(f.id));
      return n;
    });
  };

  const selectedRows = all.filter(f => selected.has(f.id));
  const selectedFailedIds = selectedRows.filter(f => f.status === "failed").map(f => f.id);

  const runBulkReprocess = () => {
    if (selectedFailedIds.length === 0) return;
    selectedFailedIds.forEach(id => knowledgeFaqStore.reprocess(id));
    toast.success(`Đang xử lý lại ${selectedFailedIds.length} câu hỏi.`);
    setTimeout(() => { selectedFailedIds.forEach(id => knowledgeFaqStore.updateStatus(id, "processing")); refresh(); }, 300);
    setTimeout(() => { selectedFailedIds.forEach(id => knowledgeFaqStore.updateStatus(id, "done", { chunkCount: 1 })); refresh(); }, 1500);
    refresh();
  };

  const bulkReprocessClick = () => {
    if (selectedFailedIds.length === 0) return;
    if (selectedFailedIds.length !== selectedRows.length) { setShowBulkReprocessConfirm(true); return; }
    runBulkReprocess();
  };

  const reprocessOne = (f: KnowledgeFaq) => {
    if (!knowledgeFaqStore.reprocess(f.id)) return;
    toast.success("Đang xử lý lại câu hỏi.");
    setTimeout(() => { knowledgeFaqStore.updateStatus(f.id, "processing"); refresh(); }, 300);
    setTimeout(() => { knowledgeFaqStore.updateStatus(f.id, "done", { chunkCount: 1 }); refresh(); }, 1500);
    refresh();
  };

  const filterDescriptionParts: string[] = [];
  if (debouncedQuery.trim()) filterDescriptionParts.push(`Từ khóa: "${debouncedQuery.trim()}"`);
  if (categoryFilter.size > 0) filterDescriptionParts.push(`Danh mục: ${[...categoryFilter].join(", ")}`);
  if (statusFilter.size > 0) filterDescriptionParts.push(`Trạng thái: ${[...statusFilter].map(s => KNOWLEDGE_STATUS_META[s].label).join(", ")}`);
  const filterDescription = filterDescriptionParts.join(" · ");
  const kbName = knowledgeBaseStore.get(kbId)?.name ?? "Kho tri thức";

  const changePageSize = (n: number) => {
    setPageSize(n);
    localStorage.setItem(PAGE_SIZE_KEY, String(n));
    setPage(1);
  };

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-4 sm:p-8 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm câu hỏi..." className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
          <MultiSelectFilter
            label="Danh mục"
            options={categoryOptions.map(o => ({ value: o.name, label: o.name, count: o.count }))}
            selected={categoryFilter}
            onToggle={toggleCategory}
            onClear={() => setCategoryFilter(new Set())}
          />
          <MultiSelectFilter
            label="Trạng thái"
            options={STATUS_VALUES.map(v => ({ value: v, label: KNOWLEDGE_STATUS_META[v].label }))}
            selected={statusFilter}
            onToggle={toggleStatus}
            onClear={() => setStatusFilter(new Set())}
          />
          {hasActiveFilter && (
            <button onClick={clearFilters} className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline transition-base">
              Xóa bộ lọc
            </button>
          )}
          {!viewOnly && (
            <button onClick={() => setShowManageCategories(true)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-base">
              <Settings2 size={12} /> Quản lý danh mục
            </button>
          )}
        </div>
        {!viewOnly && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowExport(true)} className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">
              <Download size={14} /> Xuất tệp
            </button>
            <div className="relative" ref={createMenuRef}>
              <button onClick={() => setShowCreateMenu(v => !v)} className="btn-primary h-9"><Plus size={14} /> Tạo <ChevronDown size={12} className={`transition-base ${showCreateMenu ? "rotate-180" : ""}`} /></button>
              {showCreateMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
                  <button onClick={() => { setShowCreateMenu(false); setShowAdd(true); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">Tạo FAQ</button>
                  <button onClick={() => { setShowCreateMenu(false); setShowImport(true); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">Nhập từ tệp</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selected.size > 0 && !viewOnly && (
        <div className="flex items-center gap-3 mb-3 px-3 h-10 rounded-lg bg-primary-soft border border-primary/15">
          <span className="text-sm font-medium text-primary">Đã chọn {selected.size} câu hỏi</span>
          <button onClick={() => setShowAssign(true)} className="text-xs font-semibold text-primary hover:underline">Gán danh mục</button>
          {selectedFailedIds.length > 0 ? (
            <button onClick={bulkReprocessClick} className="text-xs font-semibold text-primary hover:underline">Xử lý lại</button>
          ) : (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="text-xs font-semibold text-muted-foreground/50 cursor-not-allowed outline-none">Xử lý lại</span>
              </TooltipTrigger>
              <TooltipContent>Không có câu hỏi nào ở trạng thái Xử lý thất bại.</TooltipContent>
            </Tooltip>
          )}
          <button onClick={() => setDeleteTargets(selectedRows)} className="text-xs font-semibold text-destructive hover:underline">Xóa</button>
          <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline ml-auto">Bỏ chọn</button>
        </div>
      )}

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-base font-semibold mb-1">Chưa có câu hỏi thường gặp</h3>
          {viewOnly ? (
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Chủ sở hữu chưa thêm câu hỏi nào vào kho tri thức này.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Thêm cặp câu hỏi – câu trả lời để Agent phản hồi nhanh và nhất quán.</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setShowAdd(true)} className="btn-primary h-9">Tạo FAQ</button>
                <button onClick={() => setShowImport(true)} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Nhập từ tệp</button>
              </div>
            </>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <h3 className="font-display text-sm font-semibold mb-1">Không tìm thấy câu hỏi phù hợp</h3>
          <p className="text-sm text-muted-foreground mb-3">Thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
          <button onClick={clearFilters} className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base">Xóa bộ lọc</button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-x-auto scroll-shadow-x">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  {!viewOnly && (
                    <th className="w-10 px-4 py-2.5">
                      <input ref={headerCheckboxRef} type="checkbox" checked={allOnPageSelected} onChange={toggleSelectPage} className="w-4 h-4 accent-primary" aria-label="Chọn tất cả trên trang này" />
                    </th>
                  )}
                  <th className="text-left px-2 py-2.5 kb-table-header">Câu hỏi</th>
                  <th className="text-left px-2 py-2.5 kb-table-header">Câu trả lời</th>
                  <th className="text-left px-2 py-2.5 kb-table-header">Danh mục</th>
                  <th className="text-left px-2 py-2.5 kb-table-header">Trạng thái</th>
                  <th className="text-left px-2 py-2.5 kb-table-header min-w-[160px]">Cập nhật lần cuối</th>
                  <th className="text-left px-2 py-2.5 kb-table-header min-w-[120px]">Cập nhật bởi</th>
                  {!viewOnly && <th className="px-4 py-2.5 w-12" />}
                </tr>
              </thead>
              <tbody>
                {pageItems.map(f => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base">
                    {!viewOnly && (
                      <td className="px-4 py-3"><input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleRow(f.id)} className="w-4 h-4 accent-primary" aria-label={`Chọn ${f.question}`} /></td>
                    )}
                    <td className="px-2 py-3 max-w-[220px]">
                      <button onClick={() => setEditTarget(f)} className="text-left block w-full min-w-0" disabled={viewOnly}>
                        <TruncatedText text={f.question} className="text-sm font-medium" />
                      </button>
                    </td>
                    <td className="px-2 py-3 max-w-[260px]">
                      <TruncatedText text={f.answer} className="text-xs text-muted-foreground" />
                    </td>
                    <td className="px-2 py-3 max-w-[160px]"><CategoryChips categories={f.categories} /></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1.5">
                        <KnowledgeStatusPill status={f.status} />
                        {(f.status === "failed" || f.status === "invalid") && f.statusReason && (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild><span tabIndex={0} className="text-muted-foreground outline-none"><Info size={12} /></span></TooltipTrigger>
                            <TooltipContent className="max-w-[260px]">{f.statusReason}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(f.updatedAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-2 py-3 text-xs text-muted-foreground truncate">{f.updatedBy}</td>
                    {!viewOnly && (
                      <td className="px-4 py-3 text-right">
                        <RowMenu
                          status={f.status}
                          onEdit={() => setEditTarget(f)}
                          onReprocess={() => reprocessOne(f)}
                          onDelete={() => setDeleteTargets([f])}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Hiển thị {pageStart} – {pageEnd} trên {filtered.length} câu hỏi</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Số dòng/trang</span>
                <select
                  value={pageSize}
                  onChange={e => changePageSize(Number(e.target.value))}
                  className="h-8 px-2 rounded-lg border border-border bg-white text-xs outline-none focus:border-primary transition-base"
                >
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={clampedPage === 1} aria-label="Trang đầu" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-base"><ChevronsLeft size={14} /></button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={clampedPage === 1} aria-label="Trang trước" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-base"><ChevronLeft size={14} /></button>
                <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">Trang {clampedPage}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={clampedPage === totalPages} aria-label="Trang sau" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-base"><ChevronRight size={14} /></button>
                <button onClick={() => setPage(totalPages)} disabled={clampedPage === totalPages} aria-label="Trang cuối" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-30 disabled:pointer-events-none transition-base"><ChevronsRight size={14} /></button>
              </div>
            </div>
          </div>
        </>
      )}

      <AddEditFaqModal open={showAdd} kbId={kbId} onClose={() => { setShowAdd(false); refresh(); }} />
      {editTarget && <AddEditFaqModal open={!!editTarget} kbId={kbId} editingFaq={editTarget} onClose={() => { setEditTarget(null); refresh(); }} />}
      {showImport && (
        <ImportFaqModal
          open={showImport}
          kbId={kbId}
          onClose={() => setShowImport(false)}
          onRefresh={refresh}
          onViewInvalid={() => { setStatusFilter(new Set(["invalid"])); setCategoryFilter(new Set()); setQuery(""); setDebouncedQuery(""); }}
        />
      )}
      {showExport && (
        <ExportFaqModal
          open={showExport}
          kbName={kbName}
          all={all}
          filtered={filtered}
          selectedRows={selectedRows}
          hasActiveFilter={hasActiveFilter}
          filterDescription={filterDescription}
          onClose={() => setShowExport(false)}
        />
      )}
      {showAssign && (
        <AssignCategoriesModal
          open={showAssign}
          targets={selectedRows}
          options={categoryOptions}
          onClose={() => setShowAssign(false)}
          onDone={() => { setShowAssign(false); refresh(); }}
        />
      )}
      {showManageCategories && (
        <ManageCategoriesModal
          open={showManageCategories}
          kbId={kbId}
          onClose={() => setShowManageCategories(false)}
          onChanged={refresh}
        />
      )}

      <AlertDialog open={showBulkReprocessConfirm} onOpenChange={setShowBulkReprocessConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xử lý lại {selectedFailedIds.length} câu hỏi?</AlertDialogTitle>
            <AlertDialogDescription>
              Trong {selectedRows.length} câu hỏi đang chọn, chỉ {selectedFailedIds.length} câu ở trạng thái Xử lý thất bại sẽ được xử lý lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-surface text-foreground border border-border hover:bg-surface-muted"
              onClick={() => { setShowBulkReprocessConfirm(false); runBulkReprocess(); }}
            >
              Xử lý lại
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTargets} onOpenChange={v => !v && setDeleteTargets(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTargets && deleteTargets.length === 1 ? "Xóa câu hỏi này?" : `Xóa ${deleteTargets?.length} câu hỏi?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargets && deleteTargets.length === 1
                ? "Câu hỏi và câu trả lời sẽ bị xóa vĩnh viễn khỏi kho tri thức. Hành động này không thể hoàn tác."
                : `${deleteTargets?.length} câu hỏi cùng câu trả lời sẽ bị xóa vĩnh viễn khỏi kho tri thức. Hành động này không thể hoàn tác.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTargets && deleteTargets.length === 1 && (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted-foreground italic line-clamp-3">"{deleteTargets[0].question}"</p>
          )}
          {deleteTargets?.some(f => f.status === "pending" || f.status === "processing") && (
            <p className="text-xs text-warning">Câu hỏi đang được xử lý. Xóa sẽ dừng quá trình này.</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargets) {
                  knowledgeFaqStore.removeMany(deleteTargets.map(f => f.id));
                  toast.success(deleteTargets.length === 1 ? "Đã xóa câu hỏi." : `Đã xóa ${deleteTargets.length} câu hỏi.`);
                }
                setDeleteTargets(null); setSelected(new Set()); refresh();
              }}
            >
              {deleteTargets && deleteTargets.length === 1 ? "Xóa" : `Xóa ${deleteTargets?.length} câu hỏi`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}

function RowMenu({ status, onEdit, onReprocess, onDelete }: {
  status: KnowledgeFaqStatus; onEdit: () => void; onReprocess: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const reprocessDisabled = status !== "failed";
  const reprocessTooltip = status === "invalid"
    ? "Nội dung chưa hợp lệ. Hãy sửa câu hỏi hoặc câu trả lời trước khi xử lý lại."
    : status === "pending" || status === "processing"
      ? "Câu hỏi đang được xử lý."
      : undefined;

  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} aria-label="Thao tác" className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-52 max-w-xs rounded-lg border border-border bg-white shadow-elev py-1">
          <button onClick={() => { setOpen(false); onEdit(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">Sửa</button>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span>
                <button
                  disabled={reprocessDisabled}
                  onClick={() => { if (reprocessDisabled) return; setOpen(false); onReprocess(); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-base ${reprocessDisabled ? "text-muted-foreground/50 cursor-not-allowed" : "hover:bg-surface-muted"}`}
                >
                  Xử lý lại
                </button>
              </span>
            </TooltipTrigger>
            {reprocessTooltip && <TooltipContent side="left" className="max-w-[240px]">{reprocessTooltip}</TooltipContent>}
          </Tooltip>
          <div className="mt-1 pt-1 border-t border-border">
            <button onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">Xóa</button>
          </div>
        </div>
      )}
    </div>
  );
}
