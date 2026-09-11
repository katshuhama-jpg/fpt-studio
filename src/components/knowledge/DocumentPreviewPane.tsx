import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, RefreshCw,
  MousePointer2, MessageSquare, Square, PenLine, Type, Check, X, Wrench,
} from "lucide-react";

// Each page is a few real paragraphs (not one short line) so the document reads like an actual
// multi-page policy doc, and so chunk bounding boxes below have enough room on the page to sit
// apart from — or deliberately overlap — one another.
export const MOCK_PAGES = [
  "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của Ngân hàng ABC, bao gồm tài khoản thanh toán, thẻ tín dụng, thẻ ghi nợ, vay tiêu dùng và các dịch vụ ngân hàng điện tử. Mọi khách hàng cá nhân và tổ chức đều có quyền gửi khiếu nại thông qua các kênh chính thức của ngân hàng mà không phát sinh chi phí.\n\nKhiếu nại được phân loại theo hai nhóm: khiếu nại về chất lượng dịch vụ và khiếu nại về giao dịch tài chính. Mỗi nhóm có quy trình tiếp nhận và thời hạn xử lý riêng, được quy định chi tiết tại các mục tiếp theo của chính sách này.\n\nChính sách này được ban hành nhằm đảm bảo quyền lợi hợp pháp của khách hàng, đồng thời nâng cao chất lượng phục vụ và uy tín của ngân hàng trên thị trường.",
  "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài chăm sóc khách hàng, ứng dụng ngân hàng số, email hỗ trợ hoặc trực tiếp tại quầy giao dịch. Nhân viên tiếp nhận có trách nhiệm ghi nhận đầy đủ thông tin khách hàng, nội dung khiếu nại và cấp mã số theo dõi ngay khi tiếp nhận.\n\nĐối với khiếu nại liên quan đến giao dịch nghi ngờ gian lận, nhân viên phải khóa tạm thời tính năng liên quan và chuyển ngay đến bộ phận an ninh giao dịch để xử lý khẩn cấp trong vòng 2 giờ làm việc.\n\nKhách hàng có thể tra cứu trạng thái xử lý khiếu nại bất kỳ lúc nào bằng mã số theo dõi được cấp, thông qua tổng đài hoặc ứng dụng ngân hàng số.",
  "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc kể từ ngày tiếp nhận đầy đủ hồ sơ. Đối với trường hợp phức tạp cần xác minh với bên thứ ba, thời gian xử lý có thể kéo dài nhưng không quá 30 ngày làm việc, khách hàng sẽ được thông báo bằng văn bản hoặc qua ứng dụng về lý do gia hạn.\n\nKết quả xử lý khiếu nại phải nêu rõ: nguyên nhân phát sinh, hướng xử lý cụ thể và phương án bồi hoàn (nếu có). Toàn bộ hồ sơ khiếu nại được lưu trữ tối thiểu 5 năm phục vụ công tác kiểm tra, đối soát và thanh tra khi cần thiết.",
  "Khách hàng không đồng ý với kết quả xử lý có quyền khiếu nại lần hai lên bộ phận giám sát chất lượng dịch vụ trong vòng 10 ngày kể từ ngày nhận kết quả lần đầu. Bộ phận giám sát độc lập với đơn vị xử lý ban đầu và có thẩm quyền yêu cầu xem xét lại toàn bộ hồ sơ.\n\nTrường hợp vẫn chưa đồng ý, khách hàng có quyền phản ánh tới Ngân hàng Nhà nước Việt Nam hoặc khởi kiện theo quy định của pháp luật hiện hành. Ngân hàng có trách nhiệm phối hợp cung cấp đầy đủ hồ sơ, chứng từ liên quan khi có yêu cầu từ cơ quan quản lý.",
];

/** Schematic bounding box for one chunk on one page, expressed as percentages of the page's
 * own box (0–100) rather than real OCR/layout coordinates — this prototype has no scanned
 * image to extract real coordinates from, so positions are assigned deterministically (see
 * `defaultBBoxFor` in knowledgeChunkStore.ts) and are free to overlap, same as a real document
 * would have overlapping candidate regions before a human resolves them. */
export interface ChunkBBox { page: number; x: number; y: number; w: number; h: number; }

export interface PageChunkBox {
  id: string;
  index: number;
  title: string;
  bbox: ChunkBBox;
  manuallyEdited: boolean;
}

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: { key: Handle; cursor: string; style: (b: ChunkBBox) => { left: string; top: string } }[] = [
  { key: "nw", cursor: "nwse-resize", style: b => ({ left: `${b.x}%`, top: `${b.y}%` }) },
  { key: "n", cursor: "ns-resize", style: b => ({ left: `${b.x + b.w / 2}%`, top: `${b.y}%` }) },
  { key: "ne", cursor: "nesw-resize", style: b => ({ left: `${b.x + b.w}%`, top: `${b.y}%` }) },
  { key: "e", cursor: "ew-resize", style: b => ({ left: `${b.x + b.w}%`, top: `${b.y + b.h / 2}%` }) },
  { key: "se", cursor: "nwse-resize", style: b => ({ left: `${b.x + b.w}%`, top: `${b.y + b.h}%` }) },
  { key: "s", cursor: "ns-resize", style: b => ({ left: `${b.x + b.w / 2}%`, top: `${b.y + b.h}%` }) },
  { key: "sw", cursor: "nesw-resize", style: b => ({ left: `${b.x}%`, top: `${b.y + b.h}%` }) },
  { key: "w", cursor: "ew-resize", style: b => ({ left: `${b.x}%`, top: `${b.y + b.h / 2}%` }) },
];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Read-only original-document preview inside ChunkViewerModal's left pane: page navigation,
 * zoom, and chunk bounding-box overlays drawn directly on the page (per the Knowledge chunk
 * editor spec) — click a box to select its chunk (two-way link with the chunk list), drag its
 * 8 handles to resize horizontally/vertically (never auto-saved — a confirm/cancel pair appears
 * until the change is committed), and right-click the page for a small annotation toolbar whose
 * "Vẽ vùng chọn" tool draws a brand-new box (and, from it, a brand-new chunk). Multiple boxes on
 * the same page render simultaneously and are allowed to overlap. No real PDF rendering in this
 * prototype; renders representative page text at natural (non-shrunk) scale, sized to fill the
 * pane's height rather than floating as a small fixed-size card. */
export default function DocumentPreviewPane({
  page, onPageChange, chunksOnPage, selectedChunkId, onSelectChunk, onResizeChunk, onCreateChunkFromBox,
  onSelectText, onReprocess, onProcess, canReprocess, viewOnly,
}: {
  page: number; onPageChange: (page: number) => void;
  chunksOnPage: PageChunkBox[];
  selectedChunkId: string | null;
  onSelectChunk: (id: string) => void;
  onResizeChunk?: (id: string, bbox: ChunkBBox) => void;
  onCreateChunkFromBox?: (bbox: ChunkBBox) => void;
  onSelectText?: (text: string) => void;
  onReprocess: () => void; onProcess: () => void; canReprocess: boolean; viewOnly: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [selectionBtn, setSelectionBtn] = useState<{ x: number; y: number; text: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [marquee, setMarquee] = useState<ChunkBBox | null>(null);
  const [pendingResize, setPendingResize] = useState<{ id: string; bbox: ChunkBBox } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageBoxRef = useRef<HTMLDivElement>(null);
  const totalPages = MOCK_PAGES.length;
  const text = MOCK_PAGES[page];

  // Any interaction that changes page/selection invalidates an uncommitted resize.
  useEffect(() => { setPendingResize(null); }, [page]);
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => { setContextMenu(null); };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); };
  }, [contextMenu]);

  const handleMouseUp = () => {
    if (!onSelectText || drawMode) return;
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim();
    if (!sel || !selectedText || sel.rangeCount === 0) { setSelectionBtn(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = wrapRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setSelectionBtn({ x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top, text: selectedText });
  };

  const pctFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = pageBoxRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  };

  const startResize = (e: React.MouseEvent, chunk: PageChunkBox, handle: Handle) => {
    if (viewOnly || !onResizeChunk) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = pageBoxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const start = { x: e.clientX, y: e.clientY };
    const startBBox = pendingResize?.id === chunk.id ? pendingResize.bbox : chunk.bbox;
    onSelectChunk(chunk.id);

    const onMove = (ev: MouseEvent) => {
      const dxPct = ((ev.clientX - start.x) / rect.width) * 100;
      const dyPct = ((ev.clientY - start.y) / rect.height) * 100;
      let { x, y, w, h } = startBBox;
      if (handle.includes("e")) w = clamp(startBBox.w + dxPct, 5, 100 - startBBox.x);
      if (handle.includes("s")) h = clamp(startBBox.h + dyPct, 5, 100 - startBBox.y);
      if (handle.includes("w")) {
        const newX = clamp(startBBox.x + dxPct, 0, startBBox.x + startBBox.w - 5);
        w = startBBox.w + (startBBox.x - newX); x = newX;
      }
      if (handle.includes("n")) {
        const newY = clamp(startBBox.y + dyPct, 0, startBBox.y + startBBox.h - 5);
        h = startBBox.h + (startBBox.y - newY); y = newY;
      }
      setPendingResize({ id: chunk.id, bbox: { page: startBBox.page, x, y, w, h } });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startMarquee = (e: React.MouseEvent) => {
    if (!drawMode) return;
    e.preventDefault();
    const start = pctFromEvent(e);
    setMarquee({ page, x: start.x, y: start.y, w: 0, h: 0 });

    const onMove = (ev: MouseEvent) => {
      const cur = pctFromEvent(ev);
      setMarquee({
        page,
        x: Math.min(start.x, cur.x), y: Math.min(start.y, cur.y),
        w: Math.abs(cur.x - start.x), h: Math.abs(cur.y - start.y),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDrawMode(false);
      setMarquee(current => {
        if (current && current.w > 2 && current.h > 2) onCreateChunkFromBox?.(current);
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const inertTool = (label: string) => { toast.info(`${label}: chưa hỗ trợ trong bản demo này.`); setContextMenu(null); };

  return (
    <div ref={wrapRef} className="relative flex flex-col h-full bg-surface-muted/40">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-white rounded-xl shadow-elev border border-border px-1.5 py-1.5 max-w-[calc(100%-2rem)] overflow-x-auto">
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
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect();
                setDrawMode(false);
                setContextMenu({ x: r.left, y: r.bottom + 6 });
              }}
              title="Công cụ chú thích: di chuyển, bình luận, vẽ vùng chọn, vẽ tự do, chèn văn bản"
              aria-label="Công cụ chú thích"
              className="h-8 px-3 shrink-0 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base flex items-center gap-1.5 whitespace-nowrap"
            >
              <Wrench size={12} className="shrink-0" /> <span className="whitespace-nowrap">Công cụ</span>
            </button>
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

      <div className="relative flex-1 min-h-0 overflow-auto pt-20 pb-8 px-6 flex justify-center" onMouseUp={handleMouseUp}>
        <div
          ref={pageBoxRef}
          onClick={() => { if (!drawMode) onSelectChunk(""); }}
          onMouseDown={startMarquee}
          onContextMenu={e => {
            if (viewOnly) return;
            e.preventDefault();
            setDrawMode(false);
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
          className="relative bg-white shadow-elev rounded-sm h-full max-h-full aspect-[3/4] shrink-0 select-text"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center", cursor: drawMode ? "crosshair" : "default" }}
        >
          <div className="p-8 text-sm leading-relaxed text-foreground/90 whitespace-pre-line h-full overflow-hidden">
            {text}
          </div>

          {chunksOnPage.map(c => {
            const isSelected = c.id === selectedChunkId;
            const box = pendingResize?.id === c.id ? pendingResize.bbox : c.bbox;
            return (
              <div key={c.id}>
                <div
                  onClick={e => { e.stopPropagation(); onSelectChunk(c.id); }}
                  className={`absolute rounded-[3px] transition-base cursor-pointer ${
                    isSelected
                      ? "border-2 border-primary bg-primary/10 z-10"
                      : "border border-dashed border-primary/40 bg-primary/[0.03] hover:border-primary/70 hover:bg-primary/[0.06]"
                  }`}
                  style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                >
                  {/* Kept fully inside the box's own top-left corner (never floating above it) so a
                      densely-packed page never has a label bleed into a neighboring row's text —
                      the box's own background already gives it enough contrast to read clearly. */}
                  <span
                    className={`absolute top-0.5 left-1 max-w-[calc(100%-8px)] truncate text-[9px] leading-none font-semibold px-1 py-0.5 rounded whitespace-nowrap ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-white/95 border border-border text-muted-foreground"
                    }`}
                  >
                    Chunk {c.index}{c.manuallyEdited ? " •" : ""}
                  </span>
                </div>
                {isSelected && !viewOnly && onResizeChunk && HANDLES.map(h => (
                  <div
                    key={h.key}
                    onMouseDown={e => startResize(e, c, h.key)}
                    className="absolute z-20 w-[26px] h-[26px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ ...h.style(box), cursor: h.cursor }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow-soft" />
                  </div>
                ))}
              </div>
            );
          })}

          {marquee && marquee.w > 0 && (
            <div
              className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-20"
              style={{ left: `${marquee.x}%`, top: `${marquee.y}%`, width: `${marquee.w}%`, height: `${marquee.h}%` }}
            />
          )}

          {pendingResize && pendingResize.id === selectedChunkId && (
            <div
              className="absolute z-30 flex items-center gap-1 bg-white border border-border rounded-lg shadow-elev p-1"
              style={{ left: `${Math.min(96, pendingResize.bbox.x + pendingResize.bbox.w)}%`, top: `${Math.max(0, pendingResize.bbox.y - 8)}%` }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { onResizeChunk?.(pendingResize.id, pendingResize.bbox); setPendingResize(null); }}
                aria-label="Lưu kích thước"
                title="Lưu kích thước"
                className="w-7 h-7 rounded-md flex items-center justify-center text-success hover:bg-success/10 transition-base"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setPendingResize(null)}
                aria-label="Hủy"
                title="Hủy"
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base"
              >
                <X size={14} />
              </button>
            </div>
          )}
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

        {contextMenu && (
          <div
            className="fixed z-40 flex items-center gap-0.5 bg-white rounded-xl shadow-elev border border-border p-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setDrawMode(false); setContextMenu(null); }} aria-label="Pan" title="Di chuyển (Pan)" className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <MousePointer2 size={15} />
            </button>
            <button onClick={() => inertTool("Bình luận")} aria-label="Bình luận" title="Bình luận" className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <MessageSquare size={15} />
            </button>
            <button onClick={() => { setDrawMode(true); setContextMenu(null); }} aria-label="Vẽ vùng chọn" title="Vẽ vùng chọn (tạo chunk mới)" className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Square size={15} />
            </button>
            <button onClick={() => inertTool("Vẽ tự do")} aria-label="Vẽ tự do" title="Vẽ tự do" className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <PenLine size={15} />
            </button>
            <button onClick={() => inertTool("Chèn văn bản")} aria-label="Chèn văn bản" title="Chèn văn bản" className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Type size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
