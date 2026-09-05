import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, X, Check, Pencil, Trash2, Info, Search } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { knowledgeChunkStore, type ChunkSourceType, type KnowledgeChunk, type ChunkContentType } from "./knowledgeChunkStore";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeStore } from "./knowledgeStore";
import { KnowledgeStatusPill, type KnowledgeFaqStatus } from "./knowledgeStatus";
import FileTypeIcon from "./FileTypeIcon";
import DocumentPreviewPane, { MOCK_PAGES } from "./DocumentPreviewPane";
import HtmlTableEditor from "./HtmlTableEditor";

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

/** Deterministic page assignment for a chunk (this prototype has no real per-chunk page
 * coordinates) — used to drive the two-way link between a chunk card and its preview page. */
function pageForChunk(index: number): number {
  return (index - 1) % MOCK_PAGES.length;
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
  kbId, sourceType, sourceId, sourceName, sourceStatus, sourceChunkCount, sourceCreatedAt, onClose, viewOnly,
}: {
  kbId: string; sourceType: ChunkSourceType; sourceId: string; sourceName: string;
  sourceStatus: KnowledgeFaqStatus;
  /** Only needed for sourceType "agent-item" — knowledgeChunkStore can't look this up itself
   * without creating a circular import with knowledgeStore.ts, so the caller supplies it. */
  sourceChunkCount?: number;
  sourceCreatedAt: number; onClose: () => void; viewOnly: boolean;
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

  const selectChunk = (c: KnowledgeChunk) => {
    setSelectedChunkId(c.id);
    setPage(pageForChunk(c.index));
  };
  const selectPage = (p: number) => {
    setPage(p);
    const onPage = filteredChunks.find(c => pageForChunk(c.index) === p);
    if (onPage) {
      setSelectedChunkId(onPage.id);
      chunkRefs.current[onPage.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };
  const gotoPage = (p: number) => { setPage(p); setSelectedChunkId(null); };

  const startEdit = (c: KnowledgeChunk) => {
    setEditingId(c.id);
    setDraftTitle(c.title);
    setDraftContent(c.content);
    setDraftType(c.contentType);
    setHtmlMode("preview");
  };
  const isDirty = (c: KnowledgeChunk) => draftTitle !== c.title || draftContent !== c.content || draftType !== c.contentType;

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

  const addChunkFromSelection = (text: string) => {
    const firstLine = text.split("\n")[0].slice(0, 60);
    const chunk = knowledgeChunkStore.add(kbId, sourceType, sourceId, { title: firstLine, content: text });
    refresh();
    setTimeout(() => { knowledgeChunkStore.updateStatus(chunk.id, "done"); refresh(); }, 900);
    startEdit({ ...chunk });
  };

  const isLoading = sourceStatus === "processing" && chunks.length === 0;

  return (
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

      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        <div className="border-r border-border overflow-hidden" style={{ width: `${splitPct}%` }}>
          <DocumentPreviewPane
            page={page}
            onPageChange={gotoPage}
            selected={selectedChunkId !== null}
            onRegionClick={() => selectPage(page)}
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
              Chunk <span className="chip chip-muted">{chunks.length}</span>
            </h2>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm trong chunk..."
                className="h-8 w-52 pl-7 pr-3 rounded-lg bg-surface-muted border border-border text-xs placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {keptBanner !== null && (
            <div className="flex items-start gap-2 px-4 py-2.5 bg-primary-soft/50 border-b border-border text-xs text-primary shrink-0">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>Đã giữ nguyên {keptBanner} chunk bạn chỉnh sửa thủ công. Bấm vào chip để xem.</span>
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
                  {viewOnly ? "Chưa có chunk nào." : "Chưa có chunk nào. Bấm \"Xử lý kết quả\" để hệ thống phân tích tài liệu."}
                </p>
              </div>
            ) : filteredChunks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">Không có chunk phù hợp với tìm kiếm.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChunks.map(c => (
                  <div
                    key={c.id}
                    ref={el => { chunkRefs.current[c.id] = el; }}
                    onClick={() => editingId !== c.id && selectChunk(c)}
                    className={`relative rounded-xl border bg-white pt-4 px-4 pb-4 transition-base ${
                      editingId === c.id ? "border-primary/40" : selectedChunkId === c.id ? "border-primary ring-1 ring-primary/30 cursor-pointer" : "border-border hover:border-primary/30 cursor-pointer"
                    }`}
                  >
                    <div className="absolute -top-3 left-3 flex items-center gap-1 bg-white border border-border rounded-md pl-2 pr-1 py-1 shadow-soft">
                      <span className="text-xs font-semibold whitespace-nowrap">Chunk {c.index}</span>
                      {c.manuallyEdited && (
                        <button
                          onClick={e => { e.stopPropagation(); setRevealUpdateFor(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; }); }}
                          className="chip chip-warning !text-xs !px-1.5 !py-0 ml-1"
                        >
                          Đã chỉnh sửa thủ công
                        </button>
                      )}
                      {!viewOnly && editingId !== c.id && (
                        <div className="flex items-center ml-0.5">
                          <button onClick={e => { e.stopPropagation(); startEdit(c); }} aria-label="Sửa" className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"><Pencil size={11} /></button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget(c); }} aria-label="Xóa" className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-[hsl(var(--destructive-soft))] hover:text-destructive transition-base"><Trash2 size={11} /></button>
                        </div>
                      )}
                    </div>
                    {c.status !== "done" && (
                      <div className="absolute -top-3 right-3"><KnowledgeStatusPill status={c.status} /></div>
                    )}

                    {editingId === c.id ? (
                      <div className="space-y-2.5 mt-1" onClick={e => e.stopPropagation()}>
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
                          <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm font-medium outline-none focus:border-primary transition-base" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">Nội dung <span className="text-destructive">*</span></label>
                          {draftType === "text" ? (
                            <textarea value={draftContent} onChange={e => setDraftContent(e.target.value)} rows={5} className="w-full px-2.5 py-2 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base resize-none" />
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
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => cancelEdit(c)} aria-label="Hủy" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base"><X size={15} /></button>
                          <button onClick={() => saveEdit(c)} aria-label="Lưu" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-success hover:bg-success/10 transition-base"><Check size={15} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5 mt-1">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center gap-1">Tiêu đề <span className="text-destructive">*</span></label>
                          <p className="text-sm font-medium">{c.title}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center gap-1">Nội dung <span className="text-destructive">*</span></label>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        </div>
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
            <AlertDialogTitle>Xử lý lại toàn bộ chunk?</AlertDialogTitle>
            <AlertDialogDescription>Hệ thống sẽ tạo lại chunk từ tài liệu gốc. Các chunk bạn đã chỉnh sửa thủ công sẽ được giữ nguyên và đánh dấu.</AlertDialogDescription>
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
            <AlertDialogTitle>Xóa chunk này?</AlertDialogTitle>
            <AlertDialogDescription>Nội dung của chunk sẽ bị xóa vĩnh viễn khỏi kho tri thức và Agent sẽ không còn tra cứu được.</AlertDialogDescription>
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
    </div>
  );
}
