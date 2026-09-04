import { useState } from "react";
import { X, Check, Pencil, Trash2, Info } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { knowledgeChunkStore, type ChunkSourceType, type KnowledgeChunk, type ChunkContentType } from "./knowledgeChunkStore";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeStore } from "./knowledgeStore";
import { KnowledgeStatusPill } from "./knowledgeStatus";
import DocumentPreviewPane from "./DocumentPreviewPane";
import HtmlTableEditor from "./HtmlTableEditor";

const MOCK_CHUNK_SEED = [
  { title: "Phạm vi áp dụng", content: "Chính sách này áp dụng cho toàn bộ khiếu nại liên quan đến sản phẩm, dịch vụ của ngân hàng ABC." },
  { title: "Thời gian tiếp nhận", content: "Khiếu nại được tiếp nhận trong vòng 24 giờ qua tổng đài, ứng dụng hoặc tại quầy giao dịch." },
  { title: "Thời gian xử lý", content: "Ngân hàng cam kết phản hồi kết quả xử lý khiếu nại trong tối đa 15 ngày làm việc." },
];

/** kbId doubles as agentId when sourceType is "agent-item" — the chunk store never filters by
 * it, it's purely denormalized, so this stays a single positional parameter across all three
 * source types instead of a separate agentId prop threaded through the whole component. */
function markParentDone(kbId: string, sourceType: ChunkSourceType, sourceId: string, chunkCount: number) {
  if (sourceType === "document") knowledgeDocumentStore.updateStatus(sourceId, "done", { chunkCount });
  else if (sourceType === "url") knowledgeUrlStore.updateStatus(sourceId, "done", { chunkCount, lastSyncAt: Date.now(), lastSyncOk: true });
  else knowledgeStore.updateStatus(kbId, sourceId, "done", { chunkCount });
}

export default function ChunkViewerModal({
  kbId, sourceType, sourceId, sourceName, onClose, viewOnly,
}: {
  kbId: string; sourceType: ChunkSourceType; sourceId: string; sourceName: string; onClose: () => void; viewOnly: boolean;
}) {
  const [tick, setTick] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftType, setDraftType] = useState<ChunkContentType>("text");
  const [htmlMode, setHtmlMode] = useState<"preview" | "raw">("preview");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeChunk | null>(null);
  const [reprocessConfirm, setReprocessConfirm] = useState(false);
  const [keptBanner, setKeptBanner] = useState<number | null>(null);
  const [revealUpdateFor, setRevealUpdateFor] = useState<Set<string>>(new Set());

  const chunks = knowledgeChunkStore.list(kbId, sourceType, sourceId);
  void tick;
  const refresh = () => setTick(t => t + 1);

  const startEdit = (c: KnowledgeChunk) => {
    setEditingId(c.id);
    setDraftTitle(c.title);
    setDraftContent(c.content);
    setDraftType(c.contentType);
    setHtmlMode("preview");
  };
  const isDirty = (c: KnowledgeChunk) => draftTitle !== c.title || draftContent !== c.content || draftType !== c.contentType;

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

  const editingChunk = chunks.find(c => c.id === editingId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-semibold truncate">{sourceName}</span>
        <button onClick={onClose} aria-label="Đóng" className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-border overflow-hidden">
          <DocumentPreviewPane
            title={sourceName}
            highlight={editingChunk?.content}
            onSelectText={!viewOnly ? addChunkFromSelection : undefined}
          />
        </div>

        <div className="w-1/2 flex flex-col overflow-hidden">
          {!viewOnly && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold">Chunk ({chunks.length})</h2>
              <div className="flex items-center gap-2">
                <button onClick={populate} className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base">Xử lý kết quả</button>
                {chunks.length > 0 && (
                  <button onClick={() => setReprocessConfirm(true)} className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base">Xử lý lại</button>
                )}
              </div>
            </div>
          )}

          {keptBanner !== null && (
            <div className="flex items-start gap-2 px-4 py-2.5 bg-primary-soft/50 border-b border-border text-xs text-primary shrink-0">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>Đã giữ nguyên {keptBanner} chunk bạn chỉnh sửa thủ công. Bấm vào chip để xem.</span>
              <button onClick={() => setKeptBanner(null)} className="ml-auto text-primary/70 hover:text-primary"><X size={12} /></button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chunks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">Chưa có chunk nào. Bấm "Xử lý kết quả" để hệ thống phân tích tài liệu.</p>
              </div>
            ) : (
              chunks.map(c => (
                <div key={c.id} className="group rounded-xl border border-border p-3.5">
                  {editingId === c.id ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">#{c.index}</span>
                        <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-0.5">
                          {(["text", "html"] as ChunkContentType[]).map(t => (
                            <button key={t} onClick={() => setDraftType(t)} className={`px-2.5 h-6 rounded-md text-[11px] font-medium transition-base ${draftType === t ? "bg-white shadow-soft text-foreground" : "text-muted-foreground"}`}>
                              {t === "text" ? "Text" : "HTML"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Tiêu đề" className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm font-medium outline-none focus:border-primary transition-base" />
                      {draftType === "text" ? (
                        <textarea value={draftContent} onChange={e => setDraftContent(e.target.value)} rows={5} className="w-full px-2.5 py-2 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base resize-none" />
                      ) : (
                        <div>
                          <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-0.5 mb-2 w-fit">
                            {(["preview", "raw"] as const).map(m => (
                              <button key={m} onClick={() => setHtmlMode(m)} className={`px-2.5 h-6 rounded-md text-[11px] font-medium transition-base ${htmlMode === m ? "bg-white shadow-soft text-foreground" : "text-muted-foreground"}`}>
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => cancelEdit(c)} aria-label="Hủy" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base"><X size={15} /></button>
                        <button onClick={() => saveEdit(c)} aria-label="Lưu" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-success hover:bg-success/10 transition-base"><Check size={15} /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground shrink-0">#{c.index}</span>
                          <KnowledgeStatusPill status={c.status} />
                          {c.manuallyEdited && (
                            <button onClick={() => setRevealUpdateFor(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} className="chip chip-warning shrink-0">
                              Đã chỉnh sửa thủ công
                            </button>
                          )}
                        </div>
                        {!viewOnly && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-base shrink-0">
                            <button onClick={() => startEdit(c)} aria-label="Sửa" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget(c)} aria-label="Xóa" className="h-8 w-8 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-[hsl(var(--destructive-soft))] hover:text-destructive transition-base"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">{c.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{c.content}</p>
                      {c.manuallyEdited && revealUpdateFor.has(c.id) && !viewOnly && (
                        <button
                          onClick={() => { knowledgeChunkStore.acceptLatest(c.id, c.content); refresh(); }}
                          className="text-xs font-semibold text-primary hover:underline mt-1.5"
                        >
                          Cập nhật theo nội dung mới
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))
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
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Hủy thay đổi</AlertDialogAction>
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
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={doReprocess}>Xử lý lại</AlertDialogAction>
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
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
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
