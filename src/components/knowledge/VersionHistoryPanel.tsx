import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeUrlStore } from "./knowledgeUrlStore";
import { knowledgeStore } from "./knowledgeStore";
import { knowledgeChunkStore, type ChunkSourceType } from "./knowledgeChunkStore";

/** Common shape for a KnowledgeDocument, a KnowledgeUrl, or an Agent-owned KnowledgeItem — the
 * version-history drawer opens from any of their "v3" badges, so it doesn't need the full
 * source-specific type. For "agent-item", `kbId` doubles as the agentId. */
export interface VersionedSource {
  id: string;
  kbId: string;
  name: string;
  sourceType: "document" | "url" | "agent-item";
  version: number;
  updatedAt: number;
  updatedBy: string;
}

const DAY = 86_400_000;
type Cause = "auto_sync" | "manual_reprocess" | "new_upload" | "chunk_edit";
const CAUSE_LABEL: Record<Cause, string> = {
  auto_sync: "Đồng bộ tự động",
  manual_reprocess: "Xử lý lại thủ công",
  new_upload: "Tải lên bản mới",
  chunk_edit: "Chỉnh sửa chunk",
};

interface VersionEntry {
  version: number;
  isCurrent: boolean;
  cause: Cause;
  at: number;
  actor: string;
  added: number;
  removed: number;
  changed: number;
}

/** No historical chunk-content store exists in this prototype (only the latest content is
 * kept), so the timeline metadata (cause/actor/diff counts) is synthesized deterministically
 * from the document's own version number — consistent with how the rest of this app's demo
 * data is seeded. "Xem nội dung" shows the document's real, current chunk list (the only
 * content this prototype actually has) rather than fabricating historical text. */
function buildTimeline(doc: VersionedSource): VersionEntry[] {
  const causes: Cause[] = ["auto_sync", "manual_reprocess", "new_upload", "chunk_edit"];
  return Array.from({ length: doc.version }, (_, i) => {
    const version = doc.version - i;
    const isCurrent = version === doc.version;
    return {
      version,
      isCurrent,
      cause: isCurrent ? "manual_reprocess" : causes[version % causes.length],
      at: isCurrent ? doc.updatedAt : doc.updatedAt - (i + 1) * DAY,
      actor: isCurrent ? doc.updatedBy : (version % 2 === 0 ? "Hệ thống" : doc.updatedBy),
      added: 2 + (version % 10),
      removed: version % 4,
      changed: 1 + (version % 6),
    };
  });
}

export default function VersionHistoryPanel({ source: doc, onClose, viewOnly }: { source: VersionedSource; onClose: () => void; viewOnly?: boolean }) {
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const timeline = buildTimeline(doc);
  const viewing = timeline.find(v => v.version === viewingVersion) ?? null;
  const chunks = knowledgeChunkStore.list(doc.kbId, doc.sourceType as ChunkSourceType, doc.id);

  if (viewing) {
    return (
      <Sheet open onOpenChange={v => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Nội dung phiên bản v{viewing.version}</SheetTitle>
          </SheetHeader>
          <button onClick={() => setViewingVersion(null)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline mb-3 w-fit">
            <ChevronLeft size={12} /> Quay lại lịch sử
          </button>

          {!viewing.isCurrent && (
            <button onClick={() => setCompareMode(v => !v)} className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-3 w-fit">
              {compareMode ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} className="text-muted-foreground" />}
              So sánh với bản hiện tại
            </button>
          )}

          <div className="flex-1 overflow-y-auto space-y-2">
            {chunks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tài liệu chưa có chunk nào.</p>
            ) : chunks.map((c, i) => {
              // Deterministic mock highlight (no real historical diff exists) — a stand-in for
              // which chunks changed between v{viewing.version} and the current version.
              const mark = compareMode && !viewing.isCurrent ? (i % 5 === 0 ? "added" : i % 7 === 0 ? "changed" : null) : null;
              return (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 ${mark === "added" ? "border-success/30 bg-success/5" : mark === "changed" ? "border-warning/30 bg-warning/5" : "border-border"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">#{c.index}</span>
                    {mark === "added" && <span className="text-xs font-semibold uppercase tracking-wider text-success">Mới</span>}
                    {mark === "changed" && <span className="text-xs font-semibold uppercase tracking-wider text-warning">Thay đổi</span>}
                  </div>
                  <p className="text-sm font-medium mb-0.5">{c.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.content}</p>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open onOpenChange={v => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Lịch sử phiên bản</SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mt-1 mb-4 truncate">{doc.name}</p>

          {timeline.length <= 1 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có phiên bản cũ. Lịch sử sẽ xuất hiện sau lần đồng bộ hoặc chỉnh sửa tiếp theo.</p>
          ) : (
            <div className="relative space-y-4 pl-4 border-l-2 border-border">
              {timeline.map(v => (
                <div key={v.version} className="relative">
                  <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${v.isCurrent ? "bg-primary" : "bg-border"}`} />
                  <div className={`rounded-lg border px-3.5 py-3 ${v.isCurrent ? "border-primary/30 bg-primary-soft/30" : "border-border"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="chip chip-muted">v{v.version}</span>
                      {v.isCurrent && <span className="text-xs font-semibold uppercase tracking-wider text-primary">Hiện tại</span>}
                    </div>
                    <p className="text-sm font-medium">{CAUSE_LABEL[v.cause]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(v.at).toLocaleString("vi-VN")} · {v.actor}</p>
                    <p className="text-xs text-muted-foreground mt-1">+{v.added} chunk · −{v.removed} chunk · {v.changed} chunk thay đổi</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => setViewingVersion(v.version)} className="text-xs font-semibold text-primary hover:underline">Xem nội dung</button>
                      {!v.isCurrent && !viewOnly && (
                        <button onClick={() => setRestoreVersion(v.version)} className="text-xs font-semibold text-primary hover:underline">Khôi phục</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={restoreVersion !== null} onOpenChange={v => !v && setRestoreVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục về phiên bản v{restoreVersion}?</AlertDialogTitle>
            <AlertDialogDescription>Nội dung hiện tại sẽ được lưu thành một phiên bản mới trước khi khôi phục, nên bạn luôn quay lại được.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-surface text-foreground border border-border hover:bg-surface-muted"
              onClick={() => {
                if (doc.sourceType === "document") knowledgeDocumentStore.restoreVersion(doc.id);
                else if (doc.sourceType === "url") knowledgeUrlStore.restoreVersion(doc.id);
                else knowledgeStore.restoreVersion(doc.kbId, doc.id);
                toast.success(`Đã khôi phục về phiên bản v${restoreVersion}.`);
                setRestoreVersion(null);
                onClose();
              }}
            >
              Khôi phục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
