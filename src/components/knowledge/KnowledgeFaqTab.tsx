import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Plus, MoreVertical } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { knowledgeFaqStore, type KnowledgeFaq } from "./knowledgeFaqStore";
import { KnowledgeStatusPill, type KnowledgeProcessingStatus } from "./knowledgeStatus";
import AddEditFaqModal from "./AddEditFaqModal";

const STATUS_OPTIONS: { value: KnowledgeProcessingStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Đang chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "done", label: "Hoàn thành" },
  { value: "failed", label: "Xử lý thất bại" },
  { value: "cancelled", label: "Đã hủy" },
];

function CategoryChips({ categories }: { categories: string[] }) {
  if (categories.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const shown = categories.slice(0, 3);
  const rest = categories.slice(3);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(c => <span key={c} className="chip chip-muted text-[11px] px-1.5 py-0.5">{c}</span>)}
      {rest.length > 0 && (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild><span tabIndex={0} className="chip chip-muted text-[11px] px-1.5 py-0.5 outline-none cursor-default">+{rest.length}</span></TooltipTrigger>
          <TooltipContent>{rest.join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function TruncatedText({ text, className }: { text: string; className: string }) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild><p className={`${className} line-clamp-2 cursor-default`}>{text}</p></TooltipTrigger>
      <TooltipContent className="max-w-[320px]">{text}</TooltipContent>
    </Tooltip>
  );
}

export default function KnowledgeFaqTab({ kbId, viewOnly }: { kbId: string; viewOnly: boolean }) {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<KnowledgeProcessingStatus | "all">("all");
  const [statusOpen, setStatusOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeFaq | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<KnowledgeFaq[] | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCreateMenu) return;
    const h = (e: MouseEvent) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showCreateMenu]);

  const all = knowledgeFaqStore.list(kbId);
  const allCategories = knowledgeFaqStore.listCategories(kbId);
  void tick;
  const refresh = () => setTick(t => t + 1);
  const q = query.trim().toLowerCase();
  const filtered = all.filter(f =>
    (!q || f.question.toLowerCase().includes(q)) &&
    (statusFilter === "all" || f.status === statusFilter) &&
    (categoryFilter.size === 0 || f.categories.some(c => categoryFilter.has(c))),
  );
  const toggleRow = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCategory = (c: string) => setCategoryFilter(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm câu hỏi..." className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="relative">
            <button onClick={() => setCategoryOpen(v => !v)} onBlur={() => setTimeout(() => setCategoryOpen(false), 150)} className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base">
              Danh mục {categoryFilter.size > 0 && `(${categoryFilter.size})`}
              <ChevronDown size={12} className={`text-muted-foreground transition-base ${categoryOpen ? "rotate-180" : ""}`} />
            </button>
            {categoryOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] w-56 max-h-64 overflow-y-auto bg-white rounded-lg ring-1 ring-border shadow-elev z-20 p-1">
                {allCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">Chưa có danh mục nào.</p>
                ) : allCategories.map(c => (
                  <label key={c} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-surface-muted cursor-pointer">
                    <input type="checkbox" checked={categoryFilter.has(c)} onMouseDown={e => e.stopPropagation()} onChange={() => toggleCategory(c)} className="w-3.5 h-3.5 accent-primary" />
                    {c}
                  </label>
                ))}
              </div>
            )}
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
        </div>
        {!viewOnly && (
          <div className="relative" ref={createMenuRef}>
            <button onClick={() => setShowCreateMenu(v => !v)} className="btn-primary h-9"><Plus size={14} /> Tạo <ChevronDown size={12} className={`transition-base ${showCreateMenu ? "rotate-180" : ""}`} /></button>
            {showCreateMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-white shadow-elev py-1">
                <button onClick={() => { setShowCreateMenu(false); setShowAdd(true); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base">Tạo FAQ</button>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-muted-foreground/50 cursor-not-allowed outline-none">
                      Nhập từ tệp
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-surface-muted border border-border">Sắp ra mắt</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left">Tính năng này sẽ sớm ra mắt.</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>

      {selected.size > 0 && !viewOnly && (
        <div className="flex items-center gap-3 mb-3 px-3 h-10 rounded-lg bg-primary-soft border border-primary/15">
          <span className="text-sm font-medium text-primary">Đã chọn {selected.size} mục</span>
          <button onClick={() => setDeleteTargets(all.filter(f => selected.has(f.id)))} className="text-xs font-semibold text-destructive hover:underline">Xóa</button>
          <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline ml-auto">Bỏ chọn</button>
        </div>
      )}

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <h3 className="font-display text-base font-semibold mb-1">Chưa có câu hỏi thường gặp</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">Thêm cặp câu hỏi – câu trả lời để Agent phản hồi nhanh và nhất quán.</p>
          {!viewOnly && <button onClick={() => setShowAdd(true)} className="btn-primary h-9 mx-auto">Tạo FAQ</button>}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Không có câu hỏi phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto scroll-shadow-x">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="w-10 px-4 py-2.5" />
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Câu hỏi</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Câu trả lời</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Danh mục</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cập nhật lần cuối</th>
                <th className="text-left px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cập nhật bởi</th>
                <th className="px-4 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleRow(f.id)} className="w-4 h-4 accent-primary" aria-label="Chọn" /></td>
                  <td className="px-2 py-3 max-w-[220px]">
                    <button onClick={() => setEditTarget(f)} className="text-left block w-full min-w-0" disabled={viewOnly}>
                      <TruncatedText text={f.question} className="text-sm font-medium" />
                    </button>
                  </td>
                  <td className="px-2 py-3 max-w-[260px]">
                    <TruncatedText text={f.answer} className="text-xs text-muted-foreground" />
                  </td>
                  <td className="px-2 py-3 max-w-[160px]"><CategoryChips categories={f.categories} /></td>
                  <td className="px-2 py-3"><KnowledgeStatusPill status={f.status} /></td>
                  <td className="px-2 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(f.updatedAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-2 py-3 text-xs text-muted-foreground truncate">{f.updatedBy}</td>
                  <td className="px-4 py-3 text-right">
                    {!viewOnly && <RowMenu onEdit={() => setEditTarget(f)} onDelete={() => setDeleteTargets([f])} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddEditFaqModal open={showAdd} kbId={kbId} onClose={() => { setShowAdd(false); refresh(); }} />
      {editTarget && <AddEditFaqModal open={!!editTarget} kbId={kbId} editingFaq={editTarget} onClose={() => { setEditTarget(null); refresh(); }} />}

      <AlertDialog open={!!deleteTargets} onOpenChange={v => !v && setDeleteTargets(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTargets && deleteTargets.length === 1 ? "Xóa FAQ này?" : `Xóa ${deleteTargets?.length} FAQ?`}</AlertDialogTitle>
            <AlertDialogDescription>Câu hỏi và câu trả lời sẽ bị xóa vĩnh viễn khỏi kho tri thức. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargets) { knowledgeFaqStore.removeMany(deleteTargets.map(f => f.id)); toast.success("Đã xóa câu hỏi đã chọn."); }
                setDeleteTargets(null); setSelected(new Set()); refresh();
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

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)} aria-label="Thao tác" className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-border bg-white shadow-elev py-1">
          <button onClick={() => { setOpen(false); onEdit(); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base">Sửa</button>
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">Xóa</button>
        </div>
      )}
    </div>
  );
}
