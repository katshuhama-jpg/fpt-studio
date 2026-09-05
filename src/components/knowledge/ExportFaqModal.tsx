import { useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { KnowledgeFaq } from "./knowledgeFaqStore";
import { KNOWLEDGE_STATUS_META } from "./knowledgeStatus";

type Scope = "all" | "filtered" | "selected";

function slugify(name: string): string {
  const stripped = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  const slug = stripped.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "KhoTriThuc";
}

function formatDateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** F4 — the missing half of import. Exports either all FAQs, the current filtered/search result,
 * or the current selection. With the metadata checkbox OFF, the file has exactly the import
 * template's 4 columns so export -> edit -> import round-trips without reshaping the file. */
export default function ExportFaqModal({ open, kbName, all, filtered, selectedRows, hasActiveFilter, filterDescription, onClose }: {
  open: boolean;
  kbName: string;
  all: KnowledgeFaq[];
  filtered: KnowledgeFaq[];
  selectedRows: KnowledgeFaq[];
  hasActiveFilter: boolean;
  filterDescription: string;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<Scope>("all");
  const [withMeta, setWithMeta] = useState(false);

  const scoped = scope === "filtered" ? filtered : scope === "selected" ? selectedRows : all;
  const count = scoped.length;

  const close = () => { setScope("all"); setWithMeta(false); onClose(); };

  const exportFile = () => {
    if (count === 0) return;
    const header = ["No.", "Question", "Answer", "Category"];
    if (withMeta) header.push("Trạng thái", "Cập nhật lần cuối");
    const rows = scoped.map((f, i) => {
      const row: (string | number)[] = [i + 1, f.question, f.answer, f.categories.join("; ")];
      if (withMeta) row.push(KNOWLEDGE_STATUS_META[f.status].label, new Date(f.updatedAt).toLocaleDateString("vi-VN"));
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = withMeta
      ? [{ wch: 6 }, { wch: 40 }, { wch: 60 }, { wch: 24 }, { wch: 16 }, { wch: 14 }]
      : [{ wch: 6 }, { wch: 40 }, { wch: 60 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FAQ");
    XLSX.writeFile(wb, `FAQ_${slugify(kbName)}_${formatDateStamp()}.xlsx`);
    toast.success(`Đã xuất ${count} câu hỏi.`);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && close()}>
      <DialogContent className="sm:max-w-[460px]" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Xuất câu hỏi thường gặp</DialogTitle>
        </DialogHeader>
        <div className="py-1 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Phạm vi xuất</label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                <input type="radio" name="export-scope" checked={scope === "all"} onChange={() => setScope("all")} className="mt-0.5 accent-primary" />
                <div className="text-sm font-medium">Tất cả câu hỏi ({all.length})</div>
              </label>
              {hasActiveFilter && (
                <label className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                  <input type="radio" name="export-scope" checked={scope === "filtered"} onChange={() => setScope("filtered")} className="mt-0.5 accent-primary" />
                  <div>
                    <div className="text-sm font-medium">Theo bộ lọc hiện tại ({filtered.length})</div>
                    {filterDescription && <div className="text-xs text-muted-foreground mt-0.5">{filterDescription}</div>}
                  </div>
                </label>
              )}
              {selectedRows.length > 0 && (
                <label className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                  <input type="radio" name="export-scope" checked={scope === "selected"} onChange={() => setScope("selected")} className="mt-0.5 accent-primary" />
                  <div className="text-sm font-medium">Câu hỏi đang chọn ({selectedRows.length})</div>
                </label>
              )}
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={withMeta} onChange={e => setWithMeta(e.target.checked)} className="mt-0.5 w-3.5 h-3.5 accent-primary" />
            <div>
              <div className="text-sm font-medium">Kèm cột Trạng thái và Cập nhật lần cuối</div>
              <div className="text-xs text-muted-foreground mt-0.5">Bật nếu bạn muốn xem trạng thái xử lý. Tắt để tệp dùng lại được cho việc nhập.</div>
            </div>
          </label>
        </div>
        <DialogFooter>
          <button onClick={close} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
          {count === 0 ? (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="btn-primary h-9 opacity-40 cursor-not-allowed outline-none">Xuất tệp</span>
              </TooltipTrigger>
              <TooltipContent>Không có câu hỏi nào để xuất.</TooltipContent>
            </Tooltip>
          ) : (
            <button onClick={exportFile} className="btn-primary h-9">Xuất tệp</button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
