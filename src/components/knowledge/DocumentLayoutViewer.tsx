import { X } from "lucide-react";
import DocumentPreviewPane from "./DocumentPreviewPane";
import type { KnowledgeDocument } from "./knowledgeDocumentStore";

/** Design gap (not spec'd in detail) — kept minimal: reuses the Chunk Viewer's left-pane
 * document preview alone, read-only, opened from the row menu's "Xem bố cục tài liệu". */
export default function DocumentLayoutViewer({ document: doc, onClose }: { document: KnowledgeDocument; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-semibold truncate">Bố cục tài liệu — {doc.name}</span>
        <button onClick={onClose} aria-label="Đóng" className="h-9 w-9 min-w-[44px] min-h-[44px] rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentPreviewPane title={doc.name} />
      </div>
    </div>
  );
}
