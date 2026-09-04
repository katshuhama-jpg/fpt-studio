import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, RefreshCw } from "lucide-react";

export const MOCK_PAGES = [
  "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của ngân hàng ABC. Mọi khách hàng đều có quyền gửi khiếu nại qua các kênh chính thức của ngân hàng.",
  "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài, ứng dụng hoặc tại quầy giao dịch. Nhân viên tiếp nhận có trách nhiệm ghi nhận đầy đủ thông tin và mã số theo dõi.",
  "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc. Trường hợp phức tạp có thể kéo dài nhưng không quá 30 ngày, khách hàng sẽ được thông báo.",
  "Khách hàng không đồng ý với kết quả xử lý có quyền khiếu nại lần hai lên bộ phận giám sát chất lượng, hoặc phản ánh tới Ngân hàng Nhà nước theo quy định hiện hành.",
];

/** Read-only original-document preview inside ChunkViewerModal's left pane — page navigation,
 * zoom, and (per FIX 3) a single floating toolbar plus the currently-displayed page, driven by
 * the parent so clicking a chunk card can flip to and highlight its page (two-way link with the
 * chunk list). No real PDF rendering in this prototype; renders representative page text. */
export default function DocumentPreviewPane({
  page, onPageChange, selected, onRegionClick, onSelectText, onReprocess, onProcess, canReprocess, viewOnly,
}: {
  page: number; onPageChange: (page: number) => void; selected: boolean; onRegionClick: () => void;
  onSelectText?: (text: string) => void; onReprocess: () => void; onProcess: () => void; canReprocess: boolean; viewOnly: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [selectionBtn, setSelectionBtn] = useState<{ x: number; y: number; text: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = MOCK_PAGES.length;
  const text = MOCK_PAGES[page];

  const handleMouseUp = () => {
    if (!onSelectText) return;
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim();
    if (!sel || !selectedText || sel.rangeCount === 0) { setSelectionBtn(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setSelectionBtn({ x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top, text: selectedText });
  };

  return (
    <div className="relative flex flex-col h-full bg-surface-muted/40">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 bg-white rounded-xl shadow-elev border border-border px-1.5 py-1.5 max-w-[calc(100%-2rem)] overflow-x-auto">
        <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} aria-label="Trang trước" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-40 transition-base">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium px-1 tabular-nums min-w-[36px] text-center shrink-0 whitespace-nowrap">{page + 1}/{totalPages}</span>
        <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} aria-label="Trang sau" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-40 transition-base">
          <ChevronRight size={14} />
        </button>
        <div className="w-px h-5 bg-border mx-1 shrink-0" />
        <button onClick={() => setZoom(z => Math.max(0.6, z - 0.1))} aria-label="Thu nhỏ" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted transition-base">
          <ZoomOut size={14} />
        </button>
        <span className="text-xs font-medium px-1 tabular-nums min-w-[36px] text-center shrink-0 whitespace-nowrap">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} aria-label="Phóng to" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted transition-base">
          <ZoomIn size={14} />
        </button>
        {!viewOnly && (
          <>
            <div className="w-px h-5 bg-border mx-1 shrink-0" />
            <button
              onClick={onReprocess}
              disabled={!canReprocess}
              title="Xử lý lại"
              className="h-8 px-3 shrink-0 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
            >
              <RefreshCw size={12} className="shrink-0" /> <span className="whitespace-nowrap">Xử lý lại</span>
            </button>
            <button onClick={onProcess} title="Xử lý kết quả" className="h-8 px-3 shrink-0 rounded-lg btn-primary text-xs whitespace-nowrap">Xử lý kết quả</button>
          </>
        )}
      </div>

      <div ref={containerRef} className="relative flex-1 overflow-auto pt-20 pb-8 px-6 flex items-start justify-center" onMouseUp={handleMouseUp}>
        <div
          onClick={onRegionClick}
          role="button"
          tabIndex={0}
          className={`bg-white shadow-elev rounded-sm p-8 text-sm leading-relaxed text-foreground/90 select-text cursor-pointer transition-base ${selected ? "ring-2 ring-primary/60" : ""}`}
          style={{ width: 420 * zoom, minHeight: 560 * zoom, fontSize: 13 * zoom }}
        >
          <p>{text}</p>
        </div>
        {selectionBtn && onSelectText && (
          <button
            style={{ left: selectionBtn.x, top: Math.max(0, selectionBtn.y - 36) }}
            className="absolute -translate-x-1/2 flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-elev z-10"
            onClick={e => { e.stopPropagation(); onSelectText(selectionBtn.text); setSelectionBtn(null); window.getSelection()?.removeAllRanges(); }}
          >
            <Plus size={12} /> Thêm chunk
          </button>
        )}
      </div>
    </div>
  );
}
