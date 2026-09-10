// sessionStorage-backed store for the right-click annotation toolbar's non-chunk marks —
// comments, freehand strokes, and inserted text notes drawn directly on a document page inside
// ChunkViewerModal's left pane. Kept separate from knowledgeChunkStore since these never become
// retrievable Agent content — they're just annotations on top of the preview.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { ChunkSourceType } from "./knowledgeChunkStore";

export type AnnotationKind = "comment" | "freehand" | "text";

export interface DocumentAnnotation {
  id: string;
  kbId: string;
  sourceType: ChunkSourceType;
  sourceId: string;
  page: number;
  kind: AnnotationKind;
  /** Anchor point (comment/text) as a 0-1 fraction of the page, same convention as ChunkBox. */
  x: number;
  y: number;
  /** Comment/text note body. */
  text?: string;
  /** Freehand stroke, as a list of 0-1 page-fraction points. */
  path?: { x: number; y: number }[];
  createdAt: number;
}

const STORE_KEY = "document_annotation_store_v1";
const store = loadMap<string, DocumentAnnotation>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

export const documentAnnotationStore = {
  list(kbId: string, sourceType: ChunkSourceType, sourceId: string): DocumentAnnotation[] {
    return [...store.values()]
      .filter(a => a.kbId === kbId && a.sourceType === sourceType && a.sourceId === sourceId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },
  add(data: Omit<DocumentAnnotation, "id" | "createdAt">): DocumentAnnotation {
    const id = `anno-${data.sourceId}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4)}`;
    const rec: DocumentAnnotation = { ...data, id, createdAt: Date.now() };
    store.set(id, rec);
    persist();
    return rec;
  },
  update(id: string, patch: Partial<Pick<DocumentAnnotation, "text">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, ...patch });
    persist();
  },
  remove(id: string) {
    store.delete(id);
    persist();
  },
};
