import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus } from "lucide-react";

const MOCK_PAGES = [
  "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của ngân hàng ABC. Mọi khách hàng đều có quyền gửi khiếu nại qua các kênh chính thức của ngân hàng.",
  "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài, ứng dụng hoặc tại quầy giao dịch. Nhân viên tiếp nhận có trách nhiệm ghi nhận đầy đủ thông tin và mã số theo dõi.",
  "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc. Trường hợp phức tạp có thể kéo dài nhưng không quá 30 ngày, khách hàng sẽ được thông báo.",
];

/** Read-only original-document preview — page navigation, zoom, page counter — shared between
 * ChunkViewerModal's left pane and the standalone DocumentLayoutViewer ("Xem bố cục tài liệu").
 * No real PDF rendering in this prototype; renders representative page text instead. */
export default function DocumentPreviewPane({ title, highlight, onSelectText }: { title: string; highlight?: string; onSelectText?: (text: string) => void }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectionBtn, setSelectionBtn] = useState<{ x: number; y: number; text: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = MOCK_PAGES.length;
  const text = MOCK_PAGES[page];

  const handleMouseUp = () => {
    if (!onSelectText) return;
    const sel = window.getSelection();
    const selected = sel?.toString().trim();
    if (!sel || !selected || sel.rangeCount === 0) { setSelectionBtn(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setSelectionBtn({ x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top, text: selected });
  };

  const renderText = () => {
    if (!highlight || !text.toLowerCase().includes(highlight.slice(0, 20).toLowerCase())) {
      return <p>{text}</p>;
    }
    return <p><mark className="bg-warning/30 rounded px-0.5">{text}</mark></p>;
  };

  return (
    <div className="flex flex-col h-full bg-surface-muted/40">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-surface shrink-0">
        <span className="text-xs font-medium truncate">{title}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setZoom(z => Math.max(0.6, z - 0.2))} aria-label="Thu nhỏ" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted transition-base">
            <ZoomOut size={14} />
          </button>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} aria-label="Phóng to" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted transition-base">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="relative flex-1 overflow-auto p-6 flex items-start justify-center" onMouseUp={handleMouseUp}>
        <div
          className="bg-white shadow-soft rounded-sm p-8 text-sm leading-relaxed text-foreground/90 select-text"
          style={{ width: 420 * zoom, minHeight: 560 * zoom, fontSize: 13 * zoom }}
        >
          {renderText()}
        </div>
        {selectionBtn && onSelectText && (
          <button
            style={{ left: selectionBtn.x, top: Math.max(0, selectionBtn.y - 36) }}
            className="absolute -translate-x-1/2 flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-elev z-10"
            onClick={() => { onSelectText(selectionBtn.text); setSelectionBtn(null); window.getSelection()?.removeAllRanges(); }}
          >
            <Plus size={12} /> Thêm chunk
          </button>
        )}
      </div>
      <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-border bg-surface shrink-0">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Trang trước" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-40 transition-base">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-muted-foreground">Trang {page + 1}/{totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} aria-label="Trang sau" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted disabled:opacity-40 transition-base">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
