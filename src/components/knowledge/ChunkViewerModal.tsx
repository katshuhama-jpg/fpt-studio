import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X, Check, Pencil, Trash2, Info, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { knowledgeChunkStore, previewPageCount, type ChunkSourceType, type KnowledgeChunk, type ChunkContentType, type ChunkBBox } from "./knowledgeChunkStore";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore, type UrlSource } from "./knowledgeUrlStore";
import { knowledgeStore } from "./knowledgeStore";
import { KnowledgeStatusPill, type KnowledgeFaqStatus } from "./knowledgeStatus";
import FileTypeIcon from "./FileTypeIcon";
import DocumentPreviewPane from "./DocumentPreviewPane";
import HtmlTableEditor from "./HtmlTableEditor";
import { formatVersion } from "./formatVersion";

const MOCK_CHUNK_SEED = [
  { title: "Phạm vi áp dụng", content: "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của ngân hàng ABC." },
  { title: "Thời gian tiếp nhận", content: "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài, ứng dụng hoặc tại quầy giao dịch." },
  { title: "Thời gian xử lý", content: "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc." },
];

/** Text -> HTML: wraps each paragraph (blank-line separated) in <p>, escaping entities and
 * turning single line breaks into <br> — never drops any of the original text. */
function textToHtml(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const blocks = paragraphs.length > 0 ? paragraphs : [t];
  return blocks.map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

/** HTML -> Text: keeps the readable text of the HTML, inserting a newline at block boundaries
 * (paragraphs, table rows, list items...) so content doesn't run together on one line. */
function htmlToText(html: string): string {
  const h = html.trim();
  if (!h) return "";
  try {
    const doc = new DOMParser().parseFromString(h, "text/html");
    doc.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
    doc.querySelectorAll("p, div, tr, li, h1, h2, h3, h4, h5, h6").forEach(el => el.append("\n"));
    const text = (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
    return text || h;
  } catch {
    return h; // never blank the field just because parsing failed
  }
}

const RICH_HTML_TAGS = ["table", "ul", "ol", "li", "strong", "b", "em", "i", "a", "img", "h1", "h2", "h3", "h4", "h5", "h6", "code", "pre", "blockquote"];

/** HTML -> Text loses real structure (tables, lists, links, emphasis...) when it's flattened
 * to plain text — Text -> HTML never loses anything, since it only adds markup. */
function isLossyHtmlToText(html: string): boolean {
  if (!html.trim()) return false;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return RICH_HTML_TAGS.some(tag => doc.querySelector(tag) !== null);
  } catch {
    return false;
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const URL_SOURCE_LABEL: Record<UrlSource, string> = { specified: "URL chỉ định", crawled_child: "Trang con", sitemap: "Sitemap" };

function relativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

/** kbId doubles as agentId when sourceType is "agent-item" — the chunk store never filters by
 * it, it's purely denormalized, so this stays a single positional parameter across all three
 * source types instead of a separate agentId prop threaded through the whole component. */
function markParentDone(kbId: string, sourceType: ChunkSourceType, sourceId: string, chunkCount: number) {
  if (sourceType === "document") knowledgeDocumentStore.updateStatus(sourceId, "done", { chunkCount });
  else if (sourceType === "url") knowledgeUrlStore.updateStatus(sourceId, "done", { chunkCount, lastSyncAt: Date.now(), lastSyncOk: true });
  else knowledgeStore.updateStatus(kbId, sourceId, "done", { chunkCount });
}

export default function ChunkViewerModal({
  kbId, sourceType, sourceId, sourceName, sourceStatus, sourceChunkCount, sourceCreatedAt, urlMeta, onClose, viewOnly, inline = false, sourceUpdatedAt, trail,
}: {
  /** Production layout: rendered inside the page's content area (the sidebar / Digital Worker
   * header stay visible), read-only - original on the left, chunks on the right. Without it the
   * older full-screen chunk editor overlay is used. */
  inline?: boolean;
  /** Inline only: where this document sits, e.g. "Tri thức của Nhân sự số / Tên kho" - keeps the
   * user oriented so the document never reads as a separate screen. */
  trail?: { label: string; onClick: () => void }[];
  /** "Cập nhật: …" in the inline header (falls back to the creation time). */
  sourceUpdatedAt?: number;
  kbId: string; sourceType: ChunkSourceType; sourceId: string; sourceName: string;
  sourceStatus: KnowledgeFaqStatus;
  /** Only needed for sourceType "agent-item" — knowledgeChunkStore can't look this up itself
   * without creating a circular import with knowledgeStore.ts, so the caller supplies it. */
  sourceChunkCount?: number;
  sourceCreatedAt: number;
  /** Only passed for sourceType "url" — the crawled-URL-specific metadata that doesn't apply
   * to documents or FAQ items, shown as a secondary header row. */
  urlMeta?: { url: string; source: UrlSource; version: number; lastSyncAt: number | null };
  onClose: () => void; viewOnly: boolean;
}) {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftType, setDraftType] = useState<ChunkContentType>("text");
  const [htmlMode, setHtmlMode] = useState<"preview" | "raw">("preview");
  const [pendingTypeSwitch, setPendingTypeSwitch] = useState<ChunkContentType | null>(null);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeChunk | null>(null);
  const [reprocessConfirm, setReprocessConfirm] = useState(false);
  const [keptBanner, setKeptBanner] = useState<number | null>(null);
  const [revealUpdateFor, setRevealUpdateFor] = useState<Set<string>>(new Set());
  const [splitPct, setSplitPct] = useState(55);
  const containerRef = useRef<HTMLDivElement>(null);
  const chunkRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragging = useRef(false);

  const chunks = knowledgeChunkStore.list(kbId, sourceType, sourceId, { status: sourceStatus, chunkCount: sourceChunkCount });
  void tick;
  const refresh = () => setTick(t => t + 1);

  const q = query.trim().toLowerCase();
  const filteredChunks = useMemo(
    () => (q ? chunks.filter(c => c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q)) : chunks),
    [chunks, q],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(70, Math.max(40, pct)));
    };
    const onUp = () => { dragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  const selectChunk = (c: KnowledgeChunk, scrollList = false) => {
    setSelectedChunkId(c.id);
    setPage(c.bbox.page);
    if (scrollList) requestAnimationFrame(() => chunkRefs.current[c.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
  const matchIds = useMemo(() => (q ? new Set(filteredChunks.map(c => c.id)) : undefined), [q, filteredChunks]);
  const gotoPage = (p: number) => { setPage(p); setSelectedChunkId(null); };

  const onResizeChunk = (id: string, bbox: ChunkBBox) => {
    knowledgeChunkStore.updateBBox(id, bbox);
    refresh();
  };
  const onCreateChunkFromBox = (bbox: ChunkBBox) => {
    const chunk = knowledgeChunkStore.add(kbId, sourceType, sourceId, { title: "Đoạn mới", content: "", bbox });
    refresh();
    startEdit({ ...chunk });
  };

  const startEdit = (c: KnowledgeChunk) => {
    setEditingId(c.id);
    setDraftTitle(c.title);
    setDraftContent(c.content);
    setDraftType(c.contentType);
    setHtmlMode("preview");
    setSaveAttempted(false);
  };
  const isDirty = (c: KnowledgeChunk) => draftTitle !== c.title || draftContent !== c.content || draftType !== c.contentType;

  /** Empty is empty regardless of markup — an HTML chunk made of only empty tags (e.g. "<p></p>")
   * has no real text either, so both content types are checked through their plain-text reading. */
  const isContentBlank = (type: ChunkContentType, content: string) =>
    (type === "html" ? htmlToText(content) : content).trim() === "";

  /** Converts draftContent to match the target type — never leaves it blank. Text -> HTML
   * wraps the text in <p> markup (shown right away in "Dạng thô"); HTML -> Text keeps the
   * HTML's readable text. */
  const applyTypeSwitch = (t: ChunkContentType) => {
    if (t === draftType) return;
    setDraftContent(prev => (t === "html" ? textToHtml(prev) : htmlToText(prev)));
    setDraftType(t);
    if (t === "html") setHtmlMode("raw");
  };

  const requestTypeSwitch = (t: ChunkContentType) => {
    if (t === draftType) return;
    if (t === "text" && isLossyHtmlToText(draftContent)) { setPendingTypeSwitch(t); return; }
    applyTypeSwitch(t);
  };

  const cancelEdit = (c: KnowledgeChunk) => {
    if (isDirty(c)) { setCancelConfirm(true); return; }
    setEditingId(null);
  };
  const confirmCancel = () => { setEditingId(null); setCancelConfirm(false); };

  const saveEdit = (c: KnowledgeChunk) => {
    if (draftTitle.trim() === "" || isContentBlank(draftType, draftContent)) { setSaveAttempted(true); return; }
    knowledgeChunkStore.update(c.id, { title: draftTitle, content: draftContent, contentType: draftType });
    setEditingId(null);
    refresh();
    setTimeout(() => { knowledgeChunkStore.updateStatus(c.id, "done"); refresh(); }, 900);
  };

  const populate = () => {
    knowledgeChunkStore.populate(kbId, sourceType, sourceId, MOCK_CHUNK_SEED);
    markParentDone(kbId, sourceType, sourceId, MOCK_CHUNK_SEED.length);
    refresh();
  };

  const doReprocess = () => {
    const { keptCount } = knowledgeChunkStore.reprocessAll(sourceType, sourceId);
    refresh();
    setTimeout(() => {
      for (const c of knowledgeChunkStore.list(kbId, sourceType, sourceId)) {
        if (c.status === "processing") knowledgeChunkStore.updateStatus(c.id, "done");
      }
      refresh();
    }, 1200);
    if (keptCount > 0) setKeptBanner(keptCount);
    setReprocessConfirm(false);
  };

  const addChunkFromSelection = (text: string, bbox: ChunkBBox) => {
    const firstLine = text.split("\n")[0].slice(0, 60);
    const chunk = knowledgeChunkStore.add(kbId, sourceType, sourceId, { title: firstLine, content: text, bbox });
    refresh();
    setTimeout(() => { knowledgeChunkStore.updateStatus(chunk.id, "done"); refresh(); }, 900);
    startEdit({ ...chunk });
  };

  const isLoading = sourceStatus === "processing" && chunks.length === 0;

  if (inline) {
    const hitPages = q && filteredChunks.length > 0 && !filteredChunks.some(c => c.bbox.page === page)
      ? [...new Set(filteredChunks.map(c => c.bbox.page))].sort((x, y) => x - y)
      : [];
    return (
      <div className="flex flex-col h-full min-h-0 animate-fade-up">
        {trail && trail.length > 0 && (
          <nav aria-label="Đường dẫn" className="flex items-center gap-1.5 mb-2 text-sm min-w-0">
            {trail.map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                <button onClick={t.onClick} className="text-muted-foreground hover:text-foreground truncate transition-base rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t.label}</button>
                <span className="text-muted-foreground/60" aria-hidden>/</span>
              </span>
            ))}
            <span className="font-medium truncate" aria-current="page">{sourceName}</span>
          </nav>
        )}
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onClose} aria-label="Quay lại danh sách tài liệu" className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft size={16} />
            </button>
            <FileTypeIcon kind={sourceType === "url" ? "url" : undefined} name={sourceType !== "url" ? sourceName : undefined} size={17} />
            <h2 className="text-base font-semibold truncate" title={sourceName}>{sourceName}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">Ngày tạo: {formatDate(sourceCreatedAt)}</span>
            <KnowledgeStatusPill status={sourceStatus} />
            <button onClick={onClose} aria-label="Đóng tài liệu" className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X size={16} />
            </button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 min-h-[420px] flex rounded-lg border border-border bg-card overflow-hidden">
          <div className="relative min-w-0 overflow-hidden" style={{ width: `${splitPct}%` }}>
            {hitPages.length > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-lg border border-border bg-card shadow-sm px-3 py-2 text-xs whitespace-nowrap" role="status">
                <span className="text-muted-foreground">Trang này không có đoạn khớp. Có kết quả ở</span>
                {hitPages.slice(0, 5).map(pg => (
                  <button key={pg} onClick={() => gotoPage(pg)} className="h-7 px-2 rounded-md border border-border hover:bg-surface-muted font-medium tabular-nums transition-base">
                    Trang {pg + 1}
                  </button>
                ))}
              </div>
            )}
            <DocumentPreviewPane
              page={page}
              pageCount={Math.max(previewPageCount(chunks.length), ...chunks.map(c => c.bbox.page + 1))}
              onPageChange={gotoPage}
              chunksOnPage={chunks.filter(c => c.bbox.page === page)}
              matchIds={matchIds}
              selectedChunkId={selectedChunkId}
              onSelectChunk={id => {
                if (!id) { setSelectedChunkId(null); return; }
                const c = chunks.find(x => x.id === id);
                if (c) selectChunk(c, true);
              }}
              onReprocess={() => undefined}
              onProcess={() => undefined}
              canReprocess={false}
              viewOnly
            />
          </div>

          <div
            onMouseDown={() => { dragging.current = true; }}
            role="separator"
            aria-orientation="vertical"
            aria-label="Kéo để đổi độ rộng hai cột"
            className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-base"
          />

          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                Đoạn <span className="chip chip-muted tabular-nums">{chunks.length}</span>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Đoạn là gì?" className="text-muted-foreground hover:text-foreground transition-base">
                      <Info size={13} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-64 text-xs leading-relaxed">
                    Hệ thống tự động chia tài liệu thành các đoạn nhỏ để Nhân sự số tra cứu chính xác hơn khi trả lời.
                  </TooltipContent>
                </Tooltip>
              </h3>
              <div className="flex items-center gap-2 min-w-0">
                {q && <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap" role="status">{filteredChunks.length} kết quả</span>}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") setQuery(""); }}
                    placeholder="Tìm trong đoạn..."
                    aria-label="Tìm trong đoạn"
                    className="h-8 w-48 pl-7 pr-8 rounded-lg bg-surface-muted border border-border text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} aria-label="Xóa nội dung tìm kiếm" className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border p-4 space-y-2 animate-pulse">
                      <div className="h-3 w-16 bg-surface-muted rounded" />
                      <div className="h-3 w-full bg-surface-muted rounded" />
                      <div className="h-3 w-5/6 bg-surface-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : chunks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">Chưa có đoạn nào.</p>
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">Không có đoạn phù hợp với tìm kiếm.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChunks.map(c => {
                    const sel = selectedChunkId === c.id;
                    return (
                      <div
                        key={c.id}
                        ref={el => { chunkRefs.current[c.id] = el; }}
                        onClick={() => selectChunk(c)}
                        className={`rounded-lg border bg-card cursor-pointer transition-base ${sel ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}
                      >
                        <div className={`flex items-center gap-2 h-10 px-3 border-b rounded-t-lg ${sel ? "bg-primary-soft/60 border-primary/20" : "bg-surface-muted/50 border-border"}`}>
                          <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-semibold tabular-nums ${sel ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                            Đoạn {c.index}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">Trang {c.bbox.page + 1}</span>
                          {c.manuallyEdited && <span className="chip chip-warning !text-xs !px-1.5 !py-0">Đã chỉnh sửa thủ công</span>}
                          {c.status !== "done" && <KnowledgeStatusPill status={c.status} />}
                        </div>
                        <div className="p-4 space-y-1.5">
                          <p className="text-sm font-semibold text-foreground">{c.title}</p>
                          {/* Keep paragraph breaks only; lines inside a paragraph re-wrap to the card width. */}
                          <p className="text-sm text-foreground/80 leading-6 whitespace-pre-wrap">{c.content.replace(/([^\n])\n(?!\n)/g, "$1 ")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rendered through a portal to document.body: this is a full-screen (fixed inset-0) overlay,
  // and some callers (e.g. the Agent Builder's Knowledge tab) mount it under an ancestor with a
  // CSS transform/animation, which would otherwise turn that ancestor into the containing block
  // for `position: fixed` and trap the overlay inside that panel instead of the whole viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onClose} aria-label="Quay lại" className="h-9 w-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <ArrowLeft size={16} />
          </button>
          <FileTypeIcon kind={sourceType === "url" ? "url" : undefined} name={sourceType !== "url" ? sourceName : undefined} size={17} />
          <span className="text-sm font-semibold truncate">{sourceName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Ngày tạo: {formatDate(sourceCreatedAt)}</span>
          <KnowledgeStatusPill status={sourceStatus} />
          <button onClick={onClose} aria-label="Đóng" className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <X size={16} />
          </button>
        </div>
      </div>

      {urlMeta && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface-muted/40 text-xs text-muted-foreground shrink-0 flex-wrap">
          <span className="font-mono truncate max-w-[420px]" title={urlMeta.url}>{urlMeta.url}</span>
          <span className="chip chip-muted">{URL_SOURCE_LABEL[urlMeta.source]}</span>
          <span className="chip chip-muted">{formatVersion(urlMeta.version)}</span>
          <span>{urlMeta.lastSyncAt ? `Đồng bộ lần cuối: ${relativeTime(urlMeta.lastSyncAt)}` : "Chưa đồng bộ"}</span>
        </div>
      )}

      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        <div className="relative border-r border-border overflow-hidden" style={{ width: `${splitPct}%` }}>
          {q && filteredChunks.length > 0 && !filteredChunks.some(c => c.bbox.page === page) && (() => {
            const pages = [...new Set(filteredChunks.map(c => c.bbox.page))].sort((a, b) => a - b);
            return (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-lg border border-border bg-white shadow-elev px-3 py-2 text-xs whitespace-nowrap" role="status">
                <span className="text-muted-foreground">Trang này không có đoạn khớp. Có kết quả ở</span>
                {pages.slice(0, 5).map(p => (
                  <button key={p} onClick={() => gotoPage(p)} className="h-7 px-2 rounded-md border border-border hover:bg-surface-muted font-medium tabular-nums transition-base">
                    Trang {p + 1}
                  </button>
                ))}
              </div>
            );
          })()}
          <DocumentPreviewPane
            page={page}
            pageCount={Math.max(previewPageCount(chunks.length), ...chunks.map(c => c.bbox.page + 1))}
            onPageChange={gotoPage}
            chunksOnPage={chunks.filter(c => c.bbox.page === page)}
            matchIds={matchIds}
            selectedChunkId={selectedChunkId}
            onSelectChunk={id => {
              if (!id) { setSelectedChunkId(null); return; }
              const c = chunks.find(x => x.id === id);
              if (c) selectChunk(c, true);
            }}
            onResizeChunk={!viewOnly ? onResizeChunk : undefined}
            onCreateChunkFromBox={!viewOnly ? onCreateChunkFromBox : undefined}
            onSelectText={!viewOnly ? addChunkFromSelection : undefined}
            onReprocess={() => setReprocessConfirm(true)}
            onProcess={populate}
            canReprocess={chunks.length > 0}
            viewOnly={viewOnly}
          />
        </div>

        <div
          onMouseDown={() => { dragging.current = true; }}
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-base"
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              Đoạn <span className="chip chip-muted">{chunks.length}</span>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Đoạn là gì?" className="text-muted-foreground hover:text-foreground transition-base">
                    <Info size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-64 text-xs leading-relaxed">
                  Hệ thống tự động chia tài liệu thành các đoạn nhỏ để Nhân sự số tra cứu chính xác hơn khi trả lời.{!viewOnly && " Bạn có thể sửa nội dung đoạn nếu thấy hệ thống chia chưa đúng."}
                </TooltipContent>
              </Tooltip>
            </h2>
            <div className="flex items-center gap-2">
              {q && (
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap" role="status">
                  {filteredChunks.length} kết quả
                </span>
              )}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Escape") setQuery(""); }}
                  placeholder="Tìm trong đoạn..."
                  aria-label="Tìm trong đoạn"
                  className="h-8 w-52 pl-7 pr-8 rounded-lg bg-surface-muted border border-border text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Xóa nội dung tìm kiếm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {keptBanner !== null && (
            <div className="flex items-start gap-2 px-4 py-2.5 bg-primary-soft/50 border-b border-border text-xs text-primary shrink-0">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>Đã giữ nguyên {keptBanner} đoạn bạn chỉnh sửa thủ công. Bấm vào chip để xem.</span>
              <button onClick={() => setKeptBanner(null)} className="ml-auto text-primary/70 hover:text-primary"><X size={12} /></button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-2 animate-pulse">
                    <div className="h-3 w-16 bg-surface-muted rounded" />
                    <div className="h-3.5 w-2/3 bg-surface-muted rounded" />
                    <div className="h-3 w-full bg-surface-muted rounded" />
                    <div className="h-3 w-5/6 bg-surface-muted rounded" />
                  </div>
                ))}
              </div>
            ) : chunks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Chưa có đoạn nào.
                </p>
              </div>
            ) : filteredChunks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">Không có đoạn phù hợp với tìm kiếm.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChunks.map(c => (
                  <div
                    key={c.id}
                    ref={el => { chunkRefs.current[c.id] = el; }}
                    onClick={() => editingId !== c.id && selectChunk(c)}
                    className={`relative rounded-xl border bg-white transition-base ${
                      editingId === c.id ? "border-primary/40 ring-1 ring-primary/20" : selectedChunkId === c.id ? "border-primary ring-1 ring-primary/30 shadow-soft cursor-pointer" : "border-border hover:border-primary/40 cursor-pointer"
                    }`}
                  >
                    <div className={`flex items-center gap-2 h-10 pl-3 pr-1.5 border-b rounded-t-xl ${selectedChunkId === c.id ? "bg-primary-soft/60 border-primary/20" : "bg-surface-muted/50 border-border"}`}>
                      <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-semibold tabular-nums ${selectedChunkId === c.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        Đoạn {c.index}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">Trang {c.bbox.page + 1}</span>
                      {c.manuallyEdited && (
                        <button
                          onClick={e => { e.stopPropagation(); setRevealUpdateFor(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; }); }}
                          className="chip chip-warning !text-xs !px-1.5 !py-0"
                        >
                          Đã chỉnh sửa thủ công
                        </button>
                      )}
                      {c.status !== "done" && <KnowledgeStatusPill status={c.status} />}
                      {!viewOnly && editingId !== c.id && (
                        <div className="flex items-center ml-auto">
                          <button onClick={e => { e.stopPropagation(); startEdit(c); }} aria-label="Sửa đoạn" title="Sửa" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Pencil size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget(c); }} aria-label="Xóa đoạn" title="Xóa" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(var(--destructive-soft))] hover:text-destructive transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div className="p-4">

                    {editingId === c.id ? (
                      <div className="space-y-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-0.5">
                            {(["text", "html"] as ChunkContentType[]).map(t => (
                              <button key={t} onClick={() => requestTypeSwitch(t)} className={`px-2.5 h-6 rounded-md text-xs font-medium transition-base ${draftType === t ? "bg-white shadow-soft text-foreground" : "text-muted-foreground"}`}>
                                {t === "text" ? "Văn bản" : "HTML"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">Tiêu đề <span className="text-destructive">*</span></label>
                          <input
                            value={draftTitle}
                            onChange={e => setDraftTitle(e.target.value)}
                            className={`w-full h-9 px-2.5 rounded-lg border bg-white text-sm font-medium outline-none transition-base ${
                              saveAttempted && draftTitle.trim() === "" ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                            }`}
                          />
                          {saveAttempted && draftTitle.trim() === "" && <p className="text-xs text-destructive mt-1">Vui lòng nhập tiêu đề.</p>}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">Nội dung <span className="text-destructive">*</span></label>
                          {draftType === "text" ? (
                            <textarea
                              value={draftContent}
                              onChange={e => setDraftContent(e.target.value)}
                              rows={5}
                              className={`w-full px-2.5 py-2 rounded-lg border bg-white text-sm outline-none transition-base resize-none ${
                                saveAttempted && isContentBlank(draftType, draftContent) ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                              }`}
                            />
                          ) : (
                            <div>
                              <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-0.5 mb-2 w-fit">
                                {(["preview", "raw"] as const).map(m => (
                                  <button key={m} onClick={() => setHtmlMode(m)} className={`px-2.5 h-6 rounded-md text-xs font-medium transition-base ${htmlMode === m ? "bg-white shadow-soft text-foreground" : "text-muted-foreground"}`}>
                                    {m === "preview" ? "Xem trước" : "Dạng thô"}
                                  </button>
                                ))}
                              </div>
                              {htmlMode === "preview" ? (
                                <HtmlTableEditor html={draftContent} onChange={setDraftContent} />
                              ) : (
                                <textarea value={draftContent} onChange={e => setDraftContent(e.target.value)} rows={6} className="w-full px-2.5 py-2 rounded-lg border border-border bg-white text-xs font-mono outline-none focus:border-primary transition-base resize-none" />
                              )}
                            </div>
                          )}
                          {saveAttempted && isContentBlank(draftType, draftContent) && <p className="text-xs text-destructive mt-1">Vui lòng nhập nội dung.</p>}
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => cancelEdit(c)} aria-label="Hủy" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base"><X size={15} /></button>
                          <button onClick={() => saveEdit(c)} aria-label="Lưu" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-success hover:bg-success/10 transition-base"><Check size={15} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-foreground">{c.title}</p>
                        <p className="text-sm text-foreground/80 leading-6 whitespace-pre-wrap">{c.content}</p>
                        {c.manuallyEdited && revealUpdateFor.has(c.id) && !viewOnly && (
                          <button
                            onClick={e => { e.stopPropagation(); knowledgeChunkStore.acceptLatest(c.id, c.content); refresh(); }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Cập nhật theo nội dung mới
                          </button>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>Nội dung bạn vừa sửa sẽ không được lưu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-surface text-foreground border border-border hover:bg-surface-muted">Hủy thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reprocessConfirm} onOpenChange={setReprocessConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xử lý lại toàn bộ tài liệu?</AlertDialogTitle>
            <AlertDialogDescription>Hệ thống sẽ chia lại các đoạn từ tài liệu gốc. Các đoạn bạn đã chỉnh sửa thủ công sẽ được giữ nguyên và đánh dấu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={doReprocess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xử lý lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingTypeSwitch !== null} onOpenChange={v => { if (!v) setPendingTypeSwitch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển định dạng nội dung?</AlertDialogTitle>
            <AlertDialogDescription>Một số định dạng có thể không giữ nguyên khi chuyển. Bạn có muốn tiếp tục?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-transparent text-foreground border border-border hover:bg-surface-muted"
              onClick={() => { if (pendingTypeSwitch) applyTypeSwitch(pendingTypeSwitch); setPendingTypeSwitch(null); }}
            >
              Chuyển
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đoạn này?</AlertDialogTitle>
            <AlertDialogDescription>Nội dung của đoạn sẽ bị xóa vĩnh viễn khỏi kho tri thức và Nhân sự số sẽ không còn tra cứu được.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) knowledgeChunkStore.remove(deleteTarget.id); setDeleteTarget(null); refresh(); }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body,
  );
}
