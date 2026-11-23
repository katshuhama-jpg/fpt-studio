import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, RefreshCw, Square, Check, X } from "lucide-react";

// Each page is a few real paragraphs (not one short line) so the document reads like an actual
// multi-page policy doc, and so chunk bounding boxes below have enough room on the page to sit
// apart from — or deliberately overlap — one another.
export const MOCK_PAGES = [
  "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của Ngân hàng ABC, bao gồm tài khoản thanh toán, thẻ tín dụng, thẻ ghi nợ, vay tiêu dùng và các dịch vụ ngân hàng điện tử. Mọi khách hàng cá nhân và tổ chức đều có quyền gửi khiếu nại thông qua các kênh chính thức của ngân hàng mà không phát sinh chi phí.\n\nKhiếu nại được phân loại theo hai nhóm: Khiếu nại về chất lượng dịch vụ và khiếu nại về giao dịch tài chính. Mỗi nhóm có quy trình tiếp nhận và thời hạn xử lý riêng, được quy định chi tiết tại các mục tiếp theo của chính sách này.\n\nChính sách này được ban hành nhằm đảm bảo quyền lợi hợp pháp của khách hàng, đồng thời nâng cao chất lượng phục vụ và uy tín của ngân hàng trên thị trường.",
  "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài chăm sóc khách hàng, ứng dụng ngân hàng số, email hỗ trợ hoặc trực tiếp tại quầy giao dịch. Nhân viên tiếp nhận có trách nhiệm ghi nhận đầy đủ thông tin khách hàng, nội dung khiếu nại và cấp mã số theo dõi ngay khi tiếp nhận.\n\nĐối với khiếu nại liên quan đến giao dịch nghi ngờ gian lận, nhân viên phải khóa tạm thời tính năng liên quan và chuyển ngay đến bộ phận an ninh giao dịch để xử lý khẩn cấp trong vòng 2 giờ làm việc.\n\nKhách hàng có thể tra cứu trạng thái xử lý khiếu nại bất kỳ lúc nào bằng mã số theo dõi được cấp, thông qua tổng đài hoặc ứng dụng ngân hàng số.",
  "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc kể từ ngày tiếp nhận đầy đủ hồ sơ. Đối với trường hợp phức tạp cần xác minh với bên thứ ba, thời gian xử lý có thể kéo dài nhưng không quá 30 ngày làm việc, khách hàng sẽ được thông báo bằng văn bản hoặc qua ứng dụng về lý do gia hạn.\n\nKết quả xử lý khiếu nại phải nêu rõ: Nguyên nhân phát sinh, hướng xử lý cụ thể và phương án bồi hoàn (nếu có). Toàn bộ hồ sơ khiếu nại được lưu trữ tối thiểu 5 năm phục vụ công tác kiểm tra, đối soát và thanh tra khi cần thiết.",
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
  bboxCustom?: boolean;
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

/** Original-document preview inside ChunkViewerModal's left pane: page navigation, zoom, and one
 * rectangular frame per chunk drawn on the page. Frames always snap to whole text lines: an
 * auto-generated chunk covers full lines of the text column, and a frame a person draws ("Vẽ vùng")
 * or resizes snaps its top and bottom edges to the nearest line boundary. Text stays selectable on
 * top of the frames, so selecting text and pressing "Thêm đoạn" still creates a chunk; clicking
 * anywhere inside a frame selects that chunk (two-way link with the chunk list). Resizing is never
 * auto-saved: a confirm/cancel pair appears until the change is committed. No real PDF rendering
 * in this prototype; it renders representative page text. */
export default function DocumentPreviewPane({
  page, onPageChange, chunksOnPage, matchIds, selectedChunkId, onSelectChunk, onResizeChunk, onCreateChunkFromBox,
  onSelectText, onReprocess, onProcess, canReprocess, viewOnly,
}: {
  page: number; onPageChange: (page: number) => void;
  /** Every chunk on this page (not only search matches), so frames stay put while searching. */
  chunksOnPage: PageChunkBox[];
  /** When set (an active search), chunks outside it are drawn muted. */
  matchIds?: Set<string>;
  selectedChunkId: string | null;
  onSelectChunk: (id: string) => void;
  onResizeChunk?: (id: string, bbox: ChunkBBox) => void;
  onCreateChunkFromBox?: (bbox: ChunkBBox) => void;
  onSelectText?: (text: string, bbox: ChunkBBox) => void;
  onReprocess: () => void; onProcess: () => void; canReprocess: boolean; viewOnly: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [selectionBtn, setSelectionBtn] = useState<{ x: number; y: number; text: string; bbox: ChunkBBox } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  /** Text lines of the page (top/bottom, % of page) and the text column's left/right edges. */
  const [layout, setLayout] = useState<{ lines: { t: number; b: number }[]; l: number; r: number } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [marquee, setMarquee] = useState<ChunkBBox | null>(null);
  const [pendingResize, setPendingResize] = useState<{ id: string; bbox: ChunkBBox } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageBoxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const totalPages = MOCK_PAGES.length;
  const text = MOCK_PAGES[page];

  useEffect(() => { setPendingResize(null); setDrawMode(false); }, [page]);

  // Measure where each rendered text line sits, as % of the page box (zoom scales both sides,
  // so percentages stay valid at any zoom level).
  useLayoutEffect(() => {
    const measure = () => {
      const pageRect = pageBoxRef.current?.getBoundingClientRect();
      const el = textRef.current;
      if (!pageRect || !el || pageRect.width === 0) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects()).filter(r => r.width > 1).sort((a, b) => a.top - b.top);
      const lines: { t: number; b: number }[] = [];
      for (const r of rects) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(last.t - r.top) < 4) last.b = Math.max(last.b, r.bottom);
        else lines.push({ t: r.top, b: r.bottom });
      }
      const elRect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const scale = elRect.width / el.offsetWidth || 1;
      const left = elRect.left + parseFloat(cs.paddingLeft) * scale;
      const right = elRect.right - parseFloat(cs.paddingRight) * scale;
      const toX = (v: number) => ((v - pageRect.left) / pageRect.width) * 100;
      const toY = (v: number) => ((v - pageRect.top) / pageRect.height) * 100;
      setLayout({ lines: lines.map(ln => ({ t: toY(ln.t), b: toY(ln.b) })), l: toX(left), r: toX(right) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (pageBoxRef.current) ro.observe(pageBoxRef.current);
    return () => ro.disconnect();
  }, [text, zoom]);

  /** Frame edges sit halfway between two lines, so neighbouring frames tile without gaps. */
  const lineEdges = useMemo(() => {
    if (!layout || layout.lines.length === 0) return [] as number[];
    const ls = layout.lines;
    const GAP = 0.6; // % of page height above the first / below the last line
    const edges = [Math.max(0, ls[0].t - GAP)];
    for (let i = 0; i < ls.length - 1; i++) edges.push((ls[i].b + ls[i + 1].t) / 2);
    edges.push(Math.min(100, ls[ls.length - 1].b + GAP));
    return edges;
  }, [layout]);
  const snapY = (v: number) => (lineEdges.length === 0 ? v : lineEdges.reduce((best, e) => (Math.abs(e - v) < Math.abs(best - v) ? e : best), lineEdges[0]));
  const columnX = () => {
    const PAD = 1.2; // % of page width outside the text column
    return layout ? { x: layout.l - PAD, w: layout.r - layout.l + PAD * 2 } : { x: 6, w: 88 };
  };

  // Auto chunks split the page's lines into contiguous full-width bands, in chunk order.
  const autoChunks = useMemo(
    () => chunksOnPage.filter(c => !c.bboxCustom).sort((a, b) => a.index - b.index),
    [chunksOnPage],
  );
  const autoBoxes = useMemo(() => {
    const out: Record<string, ChunkBBox> = {};
    const n = autoChunks.length, lineCount = lineEdges.length - 1;
    if (n === 0 || lineCount <= 0) return out;
    const { x, w } = columnX();
    // A cut is "lines before it". Cuts move by up to one line onto a paragraph break, so a chunk
    // ends where a paragraph ends instead of carrying one stray line across the blank gap.
    const ls = layout?.lines ?? [];
    const gaps = ls.slice(0, -1).map((ln, i) => ls[i + 1].t - ln.b);
    const typical = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
    const isParaBreak = (cut: number) => cut > 0 && cut < ls.length && gaps[cut - 1] > typical * 2 + 0.5;
    const cuts: number[] = [];
    for (let k = 1; k < n; k++) {
      const ideal = Math.floor((k * lineCount) / n);
      const prev = cuts[cuts.length - 1] ?? 0;
      let cut = [ideal, ideal + 1, ideal - 1].find(c => c > prev && c < lineCount && isParaBreak(c)) ?? ideal;
      cut = Math.min(Math.max(cut, prev + 1), lineCount);
      cuts.push(cut);
    }
    const bounds = [0, ...cuts, lineCount];
    autoChunks.forEach((c, k) => {
      const from = Math.min(bounds[k], lineCount - 1);
      const to = Math.max(from + 1, Math.min(bounds[k + 1], lineCount));
      out[c.id] = { page, x, y: lineEdges[from], w, h: lineEdges[to] - lineEdges[from] };
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoChunks, lineEdges, layout, page]);

  const boxOf = (c: PageChunkBox): ChunkBBox =>
    pendingResize?.id === c.id ? pendingResize.bbox : c.bboxCustom ? c.bbox : autoBoxes[c.id] ?? c.bbox;
  const isDimmed = (id: string) => !!matchIds && !matchIds.has(id);

  const pctFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = pageBoxRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  };

  /** The chunk under a point: the selected one first, then the smallest frame (a hand-drawn
   * frame inside an auto band wins over the band). */
  const chunkAt = (pt: { x: number; y: number }) => {
    const hits = chunksOnPage.filter(c => {
      const b = boxOf(c);
      return pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h;
    });
    if (hits.length === 0) return null;
    return hits.find(c => c.id === selectedChunkId)
      ?? [...hits].sort((a, b) => boxOf(a).w * boxOf(a).h - boxOf(b).w * boxOf(b).h)[0];
  };

  const handleMouseUp = () => {
    if (!onSelectText || drawMode) return;
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim();
    if (!sel || !selectedText || sel.rangeCount === 0) { setSelectionBtn(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const containerRect = wrapRef.current?.getBoundingClientRect();
    const pageRect = pageBoxRef.current?.getBoundingClientRect();
    if (!containerRect || !pageRect) return;
    // A chunk made from selected text covers the whole lines that text sits on.
    const top = snapY(((rect.top - pageRect.top) / pageRect.height) * 100);
    let bottom = snapY(((rect.bottom - pageRect.top) / pageRect.height) * 100);
    if (bottom <= top) bottom = lineEdges.find(e => e > top) ?? top + 3;
    const { x, w } = columnX();
    setSelectionBtn({
      x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top, text: selectedText,
      bbox: { page, x, y: top, w, h: bottom - top },
    });
  };

  const startResize = (e: React.MouseEvent, chunk: PageChunkBox, handle: Handle) => {
    if (viewOnly || !onResizeChunk) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = pageBoxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const start = { x: e.clientX, y: e.clientY };
    const startBBox = boxOf(chunk);
    onSelectChunk(chunk.id);

    const onMove = (ev: MouseEvent) => {
      const dxPct = ((ev.clientX - start.x) / rect.width) * 100;
      const dyPct = ((ev.clientY - start.y) / rect.height) * 100;
      let top = startBBox.y, bottom = startBBox.y + startBBox.h;
      let left = startBBox.x, right = startBBox.x + startBBox.w;
      if (handle.includes("n")) top = snapY(clamp(startBBox.y + dyPct, 0, bottom - 2));
      if (handle.includes("s")) bottom = snapY(clamp(bottom + dyPct, top + 2, 100));
      if (handle.includes("w")) left = clamp(startBBox.x + dxPct, 0, right - 5);
      if (handle.includes("e")) right = clamp(right + dxPct, left + 5, 100);
      if (bottom <= top) bottom = lineEdges.find(v => v > top) ?? top + 3;
      setPendingResize({ id: chunk.id, bbox: { page: startBBox.page, x: left, y: top, w: right - left, h: bottom - top } });
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
    const toBox = (cur: { x: number; y: number }): ChunkBBox => {
      const top = snapY(Math.min(start.y, cur.y));
      let bottom = snapY(Math.max(start.y, cur.y));
      if (bottom <= top) bottom = lineEdges.find(v => v > top) ?? top + 3;
      return { page, x: Math.min(start.x, cur.x), y: top, w: Math.abs(cur.x - start.x), h: bottom - top };
    };
    setMarquee(toBox(start));
    const onMove = (ev: MouseEvent) => setMarquee(toBox(pctFromEvent(ev)));
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDrawMode(false);
      setMarquee(current => {
        if (current && current.w > 3 && current.h > 1) onCreateChunkFromBox?.(current);
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const selected = chunksOnPage.find(c => c.id === selectedChunkId);

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
              onClick={() => { setDrawMode(d => !d); setSelectionBtn(null); }}
              aria-pressed={drawMode}
              title="Kéo trên trang để vẽ vùng chọn, tạo đoạn mới"
              className={`h-8 px-3 shrink-0 rounded-lg border text-xs font-medium transition-base flex items-center gap-1.5 whitespace-nowrap ${
                drawMode ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-surface-muted"
              }`}
            >
              <Square size={12} className="shrink-0" /> <span className="whitespace-nowrap">Vẽ vùng</span>
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

      {drawMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 rounded-md bg-foreground/90 text-background text-xs px-2.5 py-1 whitespace-nowrap">
          Kéo trên trang để vẽ vùng chọn - Bấm "Vẽ vùng" lần nữa để hủy
        </div>
      )}

      <div className="relative flex-1 min-h-0 overflow-auto pt-20 pb-8 px-6 flex justify-center" onMouseUp={handleMouseUp}>
        <div
          ref={pageBoxRef}
          onClick={e => {
            if (drawMode) return;
            if (window.getSelection()?.toString().trim()) return; // finishing a text selection, not a click
            const hit = chunkAt(pctFromEvent(e));
            onSelectChunk(hit ? hit.id : "");
          }}
          onMouseMove={e => { if (!drawMode) setHoverId(chunkAt(pctFromEvent(e))?.id ?? null); }}
          onMouseLeave={() => setHoverId(null)}
          onMouseDown={startMarquee}
          className="relative bg-white shadow-elev rounded-sm h-full max-h-full aspect-[3/4] shrink-0 select-text"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center", cursor: drawMode ? "crosshair" : hoverId ? "pointer" : "default" }}
        >
          {/* Frames sit under the text so strokes never cover letters and text stays selectable. */}
          {chunksOnPage.map(c => {
            const isSelected = c.id === selectedChunkId;
            const isHover = c.id === hoverId;
            const dimmed = isDimmed(c.id);
            const box = boxOf(c);
            return (
              <div
                key={c.id}
                className={`absolute rounded-sm pointer-events-none transition-colors ${
                  isSelected ? "border-2 border-primary bg-primary/10 z-10"
                  : dimmed ? "border border-border bg-transparent"
                  : isHover ? "border-2 border-primary bg-primary/10"
                  : "border-2 border-primary/60 bg-primary/5"
                }`}
                style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
              >
                <span
                  className={`absolute top-0 right-full mr-1 h-5 min-w-5 px-1 inline-flex items-center justify-center rounded-sm text-xs font-semibold leading-none tabular-nums ${
                    isSelected ? "bg-primary text-primary-foreground" : dimmed ? "bg-surface-muted text-muted-foreground" : "bg-primary/15 text-primary"
                  }`}
                >
                  {c.index}{c.manuallyEdited ? "•" : ""}
                </span>
              </div>
            );
          })}

          <div ref={textRef} className="relative p-8 pl-10 text-sm leading-7 text-foreground whitespace-pre-line h-full overflow-hidden">
            {text}
          </div>

          {selected && !viewOnly && onResizeChunk && HANDLES.map(h => (
            <div
              key={h.key}
              onMouseDown={e => startResize(e, selected, h.key)}
              onClick={e => e.stopPropagation()}
              className="absolute z-20 w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ ...h.style(boxOf(selected)), cursor: h.cursor }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow-soft" />
            </div>
          ))}

          {marquee && marquee.w > 0 && (
            <div
              className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-20 rounded-sm"
              style={{ left: `${marquee.x}%`, top: `${marquee.y}%`, width: `${marquee.w}%`, height: `${marquee.h}%` }}
            />
          )}

          {pendingResize && pendingResize.id === selectedChunkId && (
            <div
              className="absolute z-30 flex items-center gap-1 bg-white border border-border rounded-lg shadow-elev p-1"
              style={{ left: `${Math.min(92, pendingResize.bbox.x + pendingResize.bbox.w)}%`, top: `${Math.max(0, pendingResize.bbox.y - 6)}%` }}
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
            onClick={e => { e.stopPropagation(); onSelectText(selectionBtn.text, selectionBtn.bbox); setSelectionBtn(null); window.getSelection()?.removeAllRanges(); }}
          >
            <Plus size={12} /> Thêm đoạn
          </button>
        )}
      </div>
    </div>
  );
}
