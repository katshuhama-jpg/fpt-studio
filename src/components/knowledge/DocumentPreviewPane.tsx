import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, RefreshCw, Check, X, Trash2,
  Hand, MessageSquare, Square, PenTool, Type,
} from "lucide-react";
import { MOCK_PAGES } from "./mockDocumentPages";
import type { KnowledgeChunk, ChunkBox } from "./knowledgeChunkStore";
import type { AnnotationKind, DocumentAnnotation } from "./documentAnnotationStore";

export { MOCK_PAGES };

type ToolId = "pan" | "comment" | "draw" | "freehand" | "text";

const TOOLS: { id: ToolId; label: string; Icon: typeof Hand }[] = [
  { id: "pan", label: "Di chuyển (mặc định)", Icon: Hand },
  { id: "comment", label: "Bình luận", Icon: MessageSquare },
  { id: "draw", label: "Vẽ vùng chọn (tạo chunk mới)", Icon: Square },
  { id: "freehand", label: "Vẽ tự do", Icon: PenTool },
  { id: "text", label: "Chèn văn bản", Icon: Type },
];

type HandleId = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Edge resize handles on a selected chunk box — fully invisible (only an ew-/ns-resize cursor
 * on hover, matching the reference design), each a full-length 44px-thick strip centered on its
 * edge so the whole edge is grabbable, not just a single point. */
const EDGE_HANDLES: { id: "n" | "s" | "e" | "w"; axis: "x" | "y"; pos: string; cursor: string; label: string }[] = [
  { id: "w", axis: "x", pos: "0%", cursor: "ew-resize", label: "trái" },
  { id: "e", axis: "x", pos: "100%", cursor: "ew-resize", label: "phải" },
  { id: "n", axis: "y", pos: "0%", cursor: "ns-resize", label: "trên" },
  { id: "s", axis: "y", pos: "100%", cursor: "ns-resize", label: "dưới" },
];

/** Corner resize handles — same invisible 44x44px hit area, resize both dimensions at once, and
 * take priority over the edge strips they overlap (rendered after them in the DOM). */
const CORNER_HANDLES: { id: "nw" | "ne" | "sw" | "se"; left: string; top: string; cursor: string; label: string }[] = [
  { id: "nw", left: "0%", top: "0%", cursor: "nwse-resize", label: "trên-trái" },
  { id: "ne", left: "100%", top: "0%", cursor: "nesw-resize", label: "trên-phải" },
  { id: "sw", left: "0%", top: "100%", cursor: "nesw-resize", label: "dưới-trái" },
  { id: "se", left: "100%", top: "100%", cursor: "nwse-resize", label: "dưới-phải" },
];

const MIN_DIM = 0.03;

/** Resizes the box from any of its 4 edges or 4 corners — fully bidirectional on both axes:
 * dragging past the start grows that side, dragging back past the original position shrinks it,
 * clamped to the page bounds and a minimum width/height. A corner id (e.g. "se") touches both
 * its horizontal and vertical component via the two `includes` checks below. */
function resizeBox(start: ChunkBox, handle: HandleId, cur: { x: number; y: number }, startPointer: { x: number; y: number }): ChunkBox {
  const dx = cur.x - startPointer.x;
  const dy = cur.y - startPointer.y;
  let { x, y, width, height } = start;
  if (handle.includes("w")) {
    const nx = Math.max(0, Math.min(x + width - MIN_DIM, x + dx));
    width = x + width - nx;
    x = nx;
  }
  if (handle.includes("e")) {
    width = Math.max(MIN_DIM, Math.min(1 - x, width + dx));
  }
  if (handle.includes("n")) {
    const ny = Math.max(0, Math.min(y + height - MIN_DIM, y + dy));
    height = y + height - ny;
    y = ny;
  }
  if (handle.includes("s")) {
    height = Math.max(MIN_DIM, Math.min(1 - y, height + dy));
  }
  return { page: start.page, x, y, width, height };
}

const PAGE_BASE_WIDTH = 420;
const PAGE_BASE_HEIGHT = 560;
const PAGE_ASPECT = PAGE_BASE_WIDTH / PAGE_BASE_HEIGHT;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

type DragState =
  | { kind: "resize"; chunkId: string; handle: HandleId; startBox: ChunkBox; startPointer: { x: number; y: number } }
  | { kind: "draw"; startPointer: { x: number; y: number } }
  | { kind: "freehand"; points: { x: number; y: number }[] };

type AnnotationDraft = { kind: Exclude<AnnotationKind, "freehand">; x: number; y: number; text: string };

/** Original-document preview inside ChunkViewerModal's left pane. No real PDF/image rendering
 * in this prototype — renders representative page text — but every chunk gets a real bounding
 * box overlaid on its page, kept in sync with the chunk list (select/edit a chunk here flips to
 * and highlights its page), resizable by dragging its edges/corners, and a right-click toolbar
 * for comment/draw/freehand/text annotations on top of the page. */
export default function DocumentPreviewPane({
  page, onPageChange, chunks, selectedChunkId, onSelectChunk, onApplyResize, onReprocessResize, onReprocessChunk, onConfirmChunk,
  onDrawNewChunk, annotations, onAddAnnotation, onUpdateAnnotationText, onRemoveAnnotation,
  selected, onRegionClick, onSelectText, onReprocess, onProcess, canReprocess, viewOnly,
}: {
  page: number; onPageChange: (page: number) => void;
  chunks: KnowledgeChunk[]; selectedChunkId: string | null; onSelectChunk: (c: KnowledgeChunk) => void;
  /** Dragging a chunk's left/right edge only ever previews the new box locally — neither of
   * these is called until the user explicitly applies or reprocesses the pending resize. */
  onApplyResize: (id: string, box: ChunkBox) => void;
  onReprocessResize: (id: string, box: ChunkBox) => void;
  onReprocessChunk: (id: string) => void; onConfirmChunk: (id: string) => void;
  onDrawNewChunk: (box: ChunkBox) => void;
  annotations: DocumentAnnotation[];
  onAddAnnotation: (a: { page: number; kind: AnnotationKind; x: number; y: number; text?: string; path?: { x: number; y: number }[] }) => void;
  onUpdateAnnotationText: (id: string, text: string) => void; onRemoveAnnotation: (id: string) => void;
  selected: boolean; onRegionClick: () => void;
  onSelectText?: (text: string, box: ChunkBox) => void;
  onReprocess: () => void; onProcess: () => void; canReprocess: boolean; viewOnly: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [selectionBtn, setSelectionBtn] = useState<{ x: number; y: number; text: string; box: ChunkBox } | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId>("pan");
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const [liveResize, setLiveResize] = useState<{ chunkId: string; box: ChunkBox } | null>(null);
  const [drawLive, setDrawLive] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [freehandLive, setFreehandLive] = useState<{ x: number; y: number }[] | null>(null);
  const [newAnnotationDraft, setNewAnnotationDraft] = useState<AnnotationDraft | null>(null);
  const [openAnnotationId, setOpenAnnotationId] = useState<string | null>(null);
  // The box actually drawn for each chunk — measured from where its real content sits in the
  // rendered page text (see the layout effect below), never from box.x/y/width/height directly.
  // A chunk absent from this map genuinely has no matching text on the current page and renders
  // no box at all, instead of an empty placeholder.
  const [measuredBoxes, setMeasuredBoxes] = useState<Record<string, ChunkBox>>({});
  // The pane's own available drawing area (its size minus the fixed padding/toolbar clearance
  // below), used to fit the page to it — see the layout effect below.
  const [availSize, setAvailSize] = useState({ width: PAGE_BASE_WIDTH, height: PAGE_BASE_HEIGHT });
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // A mousedown+mousemove+mouseup sequence still fires a trailing native "click" on whatever's
  // under the pointer at mouseup — without this, that stray click re-runs handlePageClick's
  // pan-mode "select whichever chunk is on this page" logic right after a resize/draw/freehand
  // drag, clobbering the selection the drag itself just made.
  const suppressNextClickRef = useRef(false);
  const totalPages = MOCK_PAGES.length;
  const text = MOCK_PAGES[page];
  const boxesOnPage = chunks.filter(c => c.box.page === page);

  const clientToFraction = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  // Fits the page to the pane's available space (contain-fit: fills whichever of width/height is
  // the tighter constraint, preserving the page's own aspect ratio) instead of floating as a
  // small fixed-size rectangle inside a much larger container. Re-measures on any resize of the
  // pane itself — window resize, or dragging ChunkViewerModal's own left/right pane splitter.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const PAD_X = 48; // px-6 on both sides of the scroll container below
    const PAD_TOP = 80; // pt-20, clears the floating page-nav/zoom toolbar
    const PAD_BOTTOM = 32; // pb-8
    const update = () => {
      setAvailSize({
        width: Math.max(120, el.clientWidth - PAD_X),
        height: Math.max(160, el.clientHeight - PAD_TOP - PAD_BOTTOM),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitWidth = (() => {
    const w = availSize.width;
    const h = w / PAGE_ASPECT;
    return h > availSize.height ? availSize.height * PAGE_ASPECT : w;
  })();
  const fitHeight = fitWidth / PAGE_ASPECT;
  // How much bigger/smaller the fitted page is than its nominal 420x560 baseline — text and
  // padding scale with it so a page that now fills a much larger pane doesn't end up as a big
  // blank sheet with the same small fixed-size text floating in a corner.
  const fitScale = fitWidth / PAGE_BASE_WIDTH;

  // Scroll the preview back to the top of the page whenever the selected chunk flips it to a
  // different page — the "navigate to the page containing that chunk" half of the list-to-canvas
  // sync. Respects prefers-reduced-motion for the scroll transition.
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [page]);

  // Measures each on-page chunk's REAL box from where its content actually sits in the rendered
  // page text, instead of trusting box.x/y/width/height (which — especially once several chunks
  // share a page — has no guaranteed relationship to where the text they were extracted from
  // ends up on screen). A chunk whose content can't be found verbatim on this page, or whose
  // measured region collapses to zero size, is left out of the map entirely — see the render
  // loop below, which renders nothing for a chunk that isn't in `measuredBoxes` rather than an
  // empty placeholder. Re-measures on page/zoom/content changes and on any layout-affecting
  // resize of the page element itself (e.g. dragging the pane's own splitter).
  useLayoutEffect(() => {
    const pageEl = pageRef.current;
    const pEl = paragraphRef.current;
    if (!pageEl || !pEl) { setMeasuredBoxes({}); return; }

    const measure = () => {
      const textNode = pEl.firstChild;
      const pageRect = pageEl.getBoundingClientRect();
      if (!textNode || pageRect.width === 0 || pageRect.height === 0) { setMeasuredBoxes({}); return; }
      const next: Record<string, ChunkBox> = {};
      for (const c of boxesOnPage) {
        const idx = text.indexOf(c.content);
        if (idx === -1 || c.content.trim().length === 0) {
          if (import.meta.env.DEV) {
            console.warn(`[DocumentPreviewPane] Chunk ${c.index} (${c.id}) content not found on page ${page + 1} of the rendered document — its box is suppressed instead of shown empty.`);
          }
          continue;
        }
        const range = document.createRange();
        try {
          range.setStart(textNode, idx);
          range.setEnd(textNode, idx + c.content.length);
        } catch {
          continue;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          if (import.meta.env.DEV) {
            console.warn(`[DocumentPreviewPane] Chunk ${c.index} (${c.id}) measured a zero-size box on page ${page + 1} — suppressed instead of shown empty.`);
          }
          continue;
        }
        next[c.id] = {
          page,
          x: (rect.left - pageRect.left) / pageRect.width,
          y: (rect.top - pageRect.top) / pageRect.height,
          width: rect.width / pageRect.width,
          height: rect.height / pageRect.height,
        };
      }
      setMeasuredBoxes(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pageEl);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, zoom, text, boxesOnPage.map(c => `${c.id}:${c.content}`).join("|")]);

  useEffect(() => {
    if (!menuAt) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuAt(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuAt]);

  // Moving focus away from the chunk with a pending resize discards it — an unconfirmed
  // boundary change is never carried along silently once the user picks something else.
  useEffect(() => {
    if (liveResize && liveResize.chunkId !== selectedChunkId) setLiveResize(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChunkId]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cur = clientToFraction(e.clientX, e.clientY);
      if (drag.kind === "resize") {
        setLiveResize({ chunkId: drag.chunkId, box: resizeBox(drag.startBox, drag.handle, cur, drag.startPointer) });
      } else if (drag.kind === "draw") {
        setDrawLive({
          x: Math.min(drag.startPointer.x, cur.x), y: Math.min(drag.startPointer.y, cur.y),
          width: Math.abs(cur.x - drag.startPointer.x), height: Math.abs(cur.y - drag.startPointer.y),
        });
      } else if (drag.kind === "freehand") {
        drag.points.push(cur);
        setFreehandLive([...drag.points]);
      }
    };
    const onUp = (e: MouseEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      suppressNextClickRef.current = true;
      const cur = clientToFraction(e.clientX, e.clientY);
      if (drag.kind === "resize") {
        // Leave the resized box as a pending preview — resolved via the floating label's
        // "Xử lý lại" / "Xử lý kết quả" once the user decides, never auto-persisted here.
        setLiveResize({ chunkId: drag.chunkId, box: resizeBox(drag.startBox, drag.handle, cur, drag.startPointer) });
      } else if (drag.kind === "draw") {
        const x = Math.min(drag.startPointer.x, cur.x);
        const y = Math.min(drag.startPointer.y, cur.y);
        const width = Math.abs(cur.x - drag.startPointer.x);
        const height = Math.abs(cur.y - drag.startPointer.y);
        if (width > 0.02 && height > 0.02) onDrawNewChunk({ page, x, y, width, height });
        setDrawLive(null);
        setActiveTool("pan");
      } else if (drag.kind === "freehand") {
        if (drag.points.length > 1) onAddAnnotation({ page, kind: "freehand", x: drag.points[0].x, y: drag.points[0].y, path: drag.points });
        setFreehandLive(null);
        setActiveTool("pan");
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleMouseUp = () => {
    if (activeTool !== "pan" || !onSelectText) { if (!dragRef.current) setSelectionBtn(null); return; }
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim();
    if (!sel || !selectedText || sel.rangeCount === 0) { setSelectionBtn(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const pageRect = pageRef.current?.getBoundingClientRect();
    if (!containerRect || !pageRect) return;
    setSelectionBtn({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      text: selectedText,
      box: {
        page,
        x: Math.max(0, (rect.left - pageRect.left) / pageRect.width),
        y: Math.max(0, (rect.top - pageRect.top) / pageRect.height),
        width: Math.min(1, rect.width / pageRect.width),
        height: Math.min(1, rect.height / pageRect.height),
      },
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (viewOnly) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuAt({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePageMouseDown = (e: React.MouseEvent) => {
    if (viewOnly) return;
    if (activeTool !== "draw" && activeTool !== "freehand") return;
    e.stopPropagation();
    const frac = clientToFraction(e.clientX, e.clientY);
    if (activeTool === "draw") {
      dragRef.current = { kind: "draw", startPointer: frac };
      setDrawLive({ x: frac.x, y: frac.y, width: 0, height: 0 });
    } else {
      dragRef.current = { kind: "freehand", points: [frac] };
      setFreehandLive([frac]);
    }
  };

  const handlePageClick = (e: React.MouseEvent) => {
    if (dragRef.current) return;
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
    if (activeTool === "pan") { onRegionClick(); return; }
    if (activeTool === "comment" || activeTool === "text") {
      const frac = clientToFraction(e.clientX, e.clientY);
      setNewAnnotationDraft({ kind: activeTool, x: frac.x, y: frac.y, text: "" });
    }
  };

  const cursorClass = activeTool === "draw" || activeTool === "freehand" ? "cursor-crosshair" : activeTool === "comment" || activeTool === "text" ? "cursor-copy" : "cursor-pointer";
  const pageAnnotations = annotations.filter(a => a.page === page);
  const closePopovers = () => { setOpenAnnotationId(null); setNewAnnotationDraft(null); };

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

      {activeTool !== "pan" && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-2.5 h-8 text-xs font-medium shadow-elev">
          {TOOLS.find(t => t.id === activeTool)?.label}
          <button onClick={() => setActiveTool("pan")} aria-label="Thoát công cụ" className="w-5 h-5 min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center rounded hover:bg-white/20"><X size={11} /></button>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto pt-20 pb-8 px-6 flex items-start justify-center"
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <div
          ref={pageRef}
          onClick={handlePageClick}
          onMouseDown={handlePageMouseDown}
          role="button"
          tabIndex={0}
          className={`relative bg-white shadow-elev rounded-sm text-sm leading-relaxed text-foreground/90 select-text transition-base ${cursorClass} ${selected ? "ring-2 ring-primary/60" : ""}`}
          style={{ width: fitWidth * zoom, minHeight: fitHeight * zoom, fontSize: 13 * fitScale * zoom, padding: 32 * fitScale }}
        >
          <p ref={paragraphRef} className="relative z-0 pointer-events-none">{text}</p>

          {boxesOnPage.map(c => {
            const isSelected = c.id === selectedChunkId;
            const pending = liveResize && liveResize.chunkId === c.id ? liveResize.box : null;
            const measured = measuredBoxes[c.id];
            // No real box was found for this chunk on this page (its content isn't a substring
            // of the rendered text, or it measured to nothing) — never render an empty
            // placeholder; the layout effect above already logged why in dev.
            if (!pending && !measured) return null;
            const box = pending ?? measured;
            return (
              <div
                key={c.id}
                onClick={e => {
                  if (activeTool !== "pan") return;
                  e.stopPropagation();
                  if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
                  onSelectChunk(c);
                }}
                style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, zIndex: isSelected ? 30 : 10 }}
                className={`absolute rounded-sm motion-safe:transition-colors motion-safe:duration-200 ${
                  pending ? "border-2 border-dashed border-warning bg-warning/10"
                    : isSelected ? "border-2 border-primary bg-primary/10"
                    : "border-2 border-border/60 bg-foreground/[0.03] hover:border-primary/40"
                } ${activeTool === "pan" ? "cursor-pointer" : "pointer-events-none"}`}
              >
                {isSelected && (
                  <div className="absolute -top-8 left-0 flex items-center gap-1 bg-white border border-primary/30 rounded-lg pl-2 pr-1 py-1 shadow-elev whitespace-nowrap z-40">
                    <span className="text-xs font-semibold text-primary">Chunk {c.index}</span>
                    {!viewOnly && (
                      pending ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); setLiveResize(null); }} aria-label="Hủy thay đổi kích thước" title="Hủy" className="w-6 h-6 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"><X size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); onReprocessResize(c.id, pending); setLiveResize(null); }} aria-label="Xử lý lại với vùng đã đổi kích thước" title="Xử lý lại" className="w-6 h-6 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"><RefreshCw size={11} /></button>
                          <button onClick={e => { e.stopPropagation(); onApplyResize(c.id, pending); setLiveResize(null); }} aria-label="Xử lý kết quả với vùng đã đổi kích thước" title="Xử lý kết quả" className="w-6 h-6 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-success hover:bg-success/10 transition-base"><Check size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={e => { e.stopPropagation(); onReprocessChunk(c.id); }} aria-label="Xử lý lại chunk này" title="Xử lý lại chunk này" className="w-6 h-6 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"><RefreshCw size={11} /></button>
                          <button onClick={e => { e.stopPropagation(); onConfirmChunk(c.id); }} aria-label="Xác nhận chunk này" title="Xác nhận chunk này" className="w-6 h-6 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-success hover:bg-success/10 transition-base"><Check size={12} /></button>
                        </>
                      )
                    )}
                  </div>
                )}
                {isSelected && !viewOnly && EDGE_HANDLES.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    aria-label={`Đổi kích thước chunk ${c.index} (cạnh ${h.label})`}
                    onMouseDown={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      dragRef.current = { kind: "resize", chunkId: c.id, handle: h.id, startBox: box, startPointer: clientToFraction(e.clientX, e.clientY) };
                    }}
                    style={
                      h.axis === "x"
                        ? { left: h.pos, top: "50%", height: "max(100%, 44px)", cursor: h.cursor }
                        : { top: h.pos, left: "50%", width: "max(100%, 44px)", cursor: h.cursor }
                    }
                    className={`absolute -translate-x-1/2 -translate-y-1/2 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${h.axis === "x" ? "w-11" : "h-11"}`}
                  />
                ))}
                {isSelected && !viewOnly && CORNER_HANDLES.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    aria-label={`Đổi kích thước chunk ${c.index} (góc ${h.label})`}
                    onMouseDown={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      dragRef.current = { kind: "resize", chunkId: c.id, handle: h.id, startBox: box, startPointer: clientToFraction(e.clientX, e.clientY) };
                    }}
                    style={{ left: h.left, top: h.top, cursor: h.cursor }}
                    className="absolute w-11 h-11 -translate-x-1/2 -translate-y-1/2 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ))}
              </div>
            );
          })}

          {drawLive && (
            <div
              style={{ left: `${drawLive.x * 100}%`, top: `${drawLive.y * 100}%`, width: `${drawLive.width * 100}%`, height: `${drawLive.height * 100}%` }}
              className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-30"
            />
          )}
          {freehandLive && freehandLive.length > 1 && (
            <svg className="absolute inset-0 pointer-events-none z-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={freehandLive.map(p => `${p.x * 100},${p.y * 100}`).join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}

          {pageAnnotations.filter(a => a.kind === "freehand").map(a => (
            <svg key={a.id} className="absolute inset-0 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={(a.path ?? []).map(p => `${p.x * 100},${p.y * 100}`).join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
            </svg>
          ))}
          {pageAnnotations.filter(a => a.kind === "comment").map(a => (
            <button
              key={a.id}
              type="button"
              aria-label={`Bình luận: ${a.text?.slice(0, 40) || "(trống)"}`}
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
              onClick={e => { e.stopPropagation(); setOpenAnnotationId(id => (id === a.id ? null : a.id)); }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center rounded-full bg-warning text-white shadow-elev z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageSquare size={13} />
            </button>
          ))}
          {pageAnnotations.filter(a => a.kind === "text").map(a => (
            <button
              key={a.id}
              type="button"
              aria-label={`Văn bản: ${a.text?.slice(0, 40) || "(trống)"}`}
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
              onClick={e => { e.stopPropagation(); setOpenAnnotationId(id => (id === a.id ? null : a.id)); }}
              className="absolute -translate-x-1/2 -translate-y-1/2 max-w-[160px] truncate px-2 py-1 min-h-[44px] flex items-center rounded-md bg-white border border-border shadow-sm text-xs z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {a.text || "(trống)"}
            </button>
          ))}
        </div>

        {selectionBtn && onSelectText && (
          <button
            style={{ left: selectionBtn.x, top: Math.max(0, selectionBtn.y - 36) }}
            className="absolute -translate-x-1/2 flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-elev z-10"
            onClick={e => { e.stopPropagation(); onSelectText(selectionBtn.text, selectionBtn.box); setSelectionBtn(null); window.getSelection()?.removeAllRanges(); }}
          >
            <Plus size={12} /> Thêm chunk
          </button>
        )}

        {(openAnnotationId || newAnnotationDraft) && (
          <div className="fixed inset-0 z-40" onMouseDown={closePopovers} />
        )}
        {openAnnotationId && (() => {
          const a = annotations.find(x => x.id === openAnnotationId);
          const rect = pageRef.current?.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (!a || !rect || !containerRect) return null;
          const left = rect.left - containerRect.left + a.x * rect.width;
          const top = rect.top - containerRect.top + a.y * rect.height;
          return (
            <div style={{ left, top: top + 24 }} className="absolute z-50 -translate-x-1/2 w-56 bg-white rounded-lg border border-border shadow-elev p-2" onMouseDown={e => e.stopPropagation()}>
              <textarea
                autoFocus
                defaultValue={a.text}
                onBlur={e => onUpdateAnnotationText(a.id, e.target.value)}
                rows={2}
                className="w-full text-xs p-1.5 rounded border border-border outline-none focus:border-primary resize-none"
              />
              <div className="flex justify-end mt-1">
                <button onClick={() => { onRemoveAnnotation(a.id); setOpenAnnotationId(null); }} aria-label="Xóa chú thích" className="w-7 h-7 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-muted-foreground hover:bg-[hsl(var(--destructive-soft))] hover:text-destructive transition-base"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })()}
        {newAnnotationDraft && (() => {
          const rect = pageRef.current?.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (!rect || !containerRect) return null;
          const left = rect.left - containerRect.left + newAnnotationDraft.x * rect.width;
          const top = rect.top - containerRect.top + newAnnotationDraft.y * rect.height;
          return (
            <div style={{ left, top: top + 8 }} className="absolute z-50 -translate-x-1/2 w-56 bg-white rounded-lg border border-primary/40 shadow-elev p-2" onMouseDown={e => e.stopPropagation()}>
              <textarea
                autoFocus
                value={newAnnotationDraft.text}
                onChange={e => setNewAnnotationDraft(d => d && { ...d, text: e.target.value })}
                placeholder={newAnnotationDraft.kind === "comment" ? "Nhập bình luận..." : "Nhập văn bản..."}
                rows={2}
                className="w-full text-xs p-1.5 rounded border border-border outline-none focus:border-primary resize-none"
              />
              <div className="flex justify-end gap-1 mt-1">
                <button onClick={() => { setNewAnnotationDraft(null); setActiveTool("pan"); }} aria-label="Hủy chú thích" className="w-7 h-7 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted transition-base"><X size={13} /></button>
                <button
                  onClick={() => {
                    if (newAnnotationDraft.text.trim()) onAddAnnotation({ page, kind: newAnnotationDraft.kind, x: newAnnotationDraft.x, y: newAnnotationDraft.y, text: newAnnotationDraft.text.trim() });
                    setNewAnnotationDraft(null);
                    setActiveTool("pan");
                  }}
                  aria-label="Lưu chú thích"
                  className="w-7 h-7 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded text-success hover:bg-success/10 transition-base"
                ><Check size={13} /></button>
              </div>
            </div>
          );
        })()}

        {menuAt && !viewOnly && (
          <>
            <div className="fixed inset-0 z-40" onMouseDown={() => setMenuAt(null)} />
            <div
              role="toolbar"
              aria-label="Công cụ chú thích tài liệu"
              style={{ left: menuAt.x, top: menuAt.y }}
              className="absolute z-50 flex items-center gap-0.5 bg-white rounded-xl shadow-elev border border-border p-1"
            >
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  aria-label={t.label}
                  title={t.label}
                  aria-pressed={activeTool === t.id}
                  onClick={() => { setActiveTool(t.id); setMenuAt(null); }}
                  className={`w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 flex items-center justify-center rounded-lg cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    activeTool === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <t.Icon size={15} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
