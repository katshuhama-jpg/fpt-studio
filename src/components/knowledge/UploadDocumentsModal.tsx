import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UploadCloud, X, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeStore } from "./knowledgeStore";
import type { Sharing } from "./knowledgeBaseStore";
import PermissionFields, { DEFAULT_SHARING, isPermissionInvalid } from "./PermissionFields";
import FileTypeIcon from "./FileTypeIcon";
import { formatFileSize } from "./formatFileSize";
import { ALLOWED_EXT, MAX_FILES, MAX_SIZE, FORMAT_HELPER_TEXT, FORMAT_NOTES } from "./knowledgeFormats";

const ACCEPT_ATTR = ALLOWED_EXT.map(ext => `.${ext}`).join(",");
const MAX_FILES_MSG = "Chỉ có thể tải tối đa 10 tệp mỗi lần. Vui lòng bỏ bớt tệp hoặc chia thành nhiều lần tải.";
const MAX_SIZE_MSG = "Tệp vượt quá 30MB. Vui lòng nén hoặc chia nhỏ tệp trước khi tải lên.";

interface StagedFile {
  key: string;
  file: File;
  /** Final name the document will be saved as — differs from file.name only when the user
   * chose "Tạo tài liệu mới" on a name conflict, which auto-renames to stay unique. */
  displayName: string;
  error: string | null;
  progress: number;
  /** Set when the user chose "Ghi đè" on a name conflict — the id of the existing document/item
   * this upload will overwrite in place (bumping its version) instead of creating a new row. */
  overwriteId?: string;
}

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function splitName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? { base: name.slice(0, dot), ext: name.slice(dot) } : { base: name, ext: "" };
}

/** Pass either kbId (Console Documents tab, S7) or agentId (Agent Knowledge "Tải tài liệu"
 * tile, S14) — never both. Agent-scoped uploads skip folders/versioning, which don't apply
 * to per-Agent knowledge. `initialFolderId` pre-selects the destination folder when the modal
 * is opened from inside a folder. */
export default function UploadDocumentsModal({ open, kbId, agentId, initialFolderId = null, onClose }: {
  open: boolean; kbId?: string; agentId?: string; initialFolderId?: string | null; onClose: () => void;
}) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [overLimitMsg, setOverLimitMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sharing, setSharing] = useState<Sharing>(DEFAULT_SHARING);
  const [querySharing, setQuerySharing] = useState<Sharing>(DEFAULT_SHARING);
  // Tracks whether the user has touched either permission field by hand since the modal opened —
  // once they have, switching "Thư mục đích" stops silently overwriting their choice with the
  // newly-picked folder's defaults (see the folderId effect below).
  const permissionsTouched = useRef(false);
  // Name conflicts are resolved one at a time via a choice dialog before the file is staged —
  // this queue holds the ones still waiting on a choice.
  const [duplicateQueue, setDuplicateQueue] = useState<File[]>([]);

  useEffect(() => { if (open) setFolderId(initialFolderId); }, [open, initialFolderId]);
  useEffect(() => {
    if (!open) return;
    setSharing(DEFAULT_SHARING);
    setQuerySharing(DEFAULT_SHARING);
    permissionsTouched.current = false;
    setDuplicateQueue([]);
  }, [open]);
  // A document uploaded into a folder defaults to that folder's own permission settings — but
  // only until the user manually edits either field, and only while nothing has been staged yet
  // (once files are staged, silently changing already-visible permissions would be surprising).
  useEffect(() => {
    if (!open || permissionsTouched.current || agentId || staged.length > 0) return;
    const folder = folderId ? knowledgeDocumentStore.get(kbId!, folderId) : undefined;
    setSharing(folder?.sharing ?? DEFAULT_SHARING);
    setQuerySharing(folder?.querySharing ?? DEFAULT_SHARING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folderId, agentId, kbId]);

  const accessInvalid = isPermissionInvalid(sharing, querySharing);

  const folders = agentId ? [] : knowledgeDocumentStore.listFolders(kbId!);

  const validCount = staged.filter(s => !s.error).length;

  const findExisting = (name: string): { id: string } | undefined => {
    const norm = name.trim().toLowerCase();
    return agentId
      ? knowledgeStore.listForAgent(agentId).find(r => r.kind === "doc" && r.name.trim().toLowerCase() === norm)
      : knowledgeDocumentStore.list(kbId!).find(d => !d.isFolder && d.folderId === folderId && d.name.trim().toLowerCase() === norm);
  };

  const isNameTaken = (name: string): boolean => {
    const norm = name.trim().toLowerCase();
    return !!findExisting(name) || staged.some(s => s.displayName.trim().toLowerCase() === norm);
  };

  const uniqueRenamedName = (name: string): string => {
    const { base, ext } = splitName(name);
    let n = 1;
    let candidate = `${base} (${n})${ext}`;
    while (isNameTaken(candidate)) { n++; candidate = `${base} (${n})${ext}`; }
    return candidate;
  };

  const stageFile = (file: File, patch: Partial<StagedFile> = {}) => {
    setStaged(prev => [...prev, { key: `${file.name}-${file.size}-${Math.random()}`, file, displayName: file.name, error: null, progress: 0, ...patch }]);
  };

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    setOverLimitMsg(null);
    const room = MAX_FILES - staged.length - duplicateQueue.length;
    if (room <= 0) {
      setOverLimitMsg(MAX_FILES_MSG);
      return;
    }
    const toAdd = incoming.slice(0, room);
    if (incoming.length > room) setOverLimitMsg(MAX_FILES_MSG);

    const newDuplicates: File[] = [];
    for (const file of toAdd) {
      const ext = extOf(file.name);
      if (!ALLOWED_EXT.includes(ext)) {
        stageFile(file, { error: `Định dạng .${ext} chưa được hỗ trợ.` });
      } else if (file.size > MAX_SIZE) {
        stageFile(file, { error: MAX_SIZE_MSG });
      } else if (findExisting(file.name)) {
        newDuplicates.push(file);
      } else {
        stageFile(file);
      }
    }
    if (newDuplicates.length) setDuplicateQueue(prev => [...prev, ...newDuplicates]);
  };

  const activeDuplicate = duplicateQueue[0] ?? null;
  const resolveDuplicate = (choice: "overwrite" | "new") => {
    const file = activeDuplicate;
    if (!file) return;
    setDuplicateQueue(prev => prev.slice(1));
    if (choice === "overwrite") {
      const existing = findExisting(file.name);
      stageFile(file, { overwriteId: existing?.id });
    } else {
      stageFile(file, { displayName: uniqueRenamedName(file.name) });
    }
  };

  const removeFile = (key: string) => setStaged(prev => prev.filter(s => s.key !== key));
  const clearAll = () => { setStaged([]); setOverLimitMsg(null); setDuplicateQueue([]); };

  const submit = () => {
    const valid = staged.filter(s => !s.error);
    if (valid.length === 0) return;
    if (accessInvalid) return;
    setUploading(true);

    // Simulate upload progress, then insert rows and animate them through the pipeline.
    let completed = 0;
    valid.forEach((s, i) => {
      const iv = setInterval(() => {
        setStaged(prev => prev.map(p => p.key === s.key ? { ...p, progress: Math.min(100, p.progress + 20) } : p));
      }, 120);
      setTimeout(() => {
        clearInterval(iv);
        const chunkCount = Math.max(1, Math.round(s.file.size / 6000));
        if (agentId) {
          if (s.overwriteId) {
            const id = s.overwriteId;
            knowledgeDocumentStore.overwriteDocument(id, { sizeBytes: s.file.size });
            setTimeout(() => knowledgeDocumentStore.updateStatus(id, "processing"), 400);
            setTimeout(() => knowledgeDocumentStore.updateStatus(id, "done", { chunkCount }), 1600);
          } else {
            const doc = knowledgeStore.createDocument(agentId, { name: s.displayName, sizeBytes: s.file.size, sharing, querySharing });
            setTimeout(() => knowledgeDocumentStore.updateStatus(doc.id, "processing"), 400);
            setTimeout(() => knowledgeDocumentStore.updateStatus(doc.id, "done", { chunkCount }), 1600);
          }
        } else {
          const doc = s.overwriteId
            ? knowledgeDocumentStore.overwriteDocument(s.overwriteId, { sizeBytes: s.file.size })!
            : knowledgeDocumentStore.addDocument(kbId!, { name: s.displayName, sizeBytes: s.file.size, folderId, sharing, querySharing });
          setTimeout(() => knowledgeDocumentStore.updateStatus(doc.id, "processing"), 400);
          setTimeout(() => {
            // Seed one deterministic failure so the failed state is reachable in the prototype.
            const shouldFail = i === valid.length - 1 && valid.length > 1 && s.file.name.toLowerCase().includes("fail");
            if (shouldFail) knowledgeDocumentStore.updateStatus(doc.id, "failed", undefined);
            else knowledgeDocumentStore.updateStatus(doc.id, "done", { chunkCount });
          }, 1600);
        }
        completed++;
        if (completed === valid.length) {
          setTimeout(() => {
            toast.success(`Đã xử lý xong ${valid.length} tài liệu.`);
            setUploading(false);
            setStaged([]);
            onClose();
          }, 1700);
        }
      }, 700 + i * 150);
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={v => { if (!v && !uploading) { clearAll(); onClose(); } }}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tải tài liệu lên</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
            role="button"
            tabIndex={0}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-base ${dragOver ? "border-primary bg-primary-soft/40" : "border-border hover:border-primary/40 hover:bg-surface-muted/50"}`}
          >
            <UploadCloud size={22} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Kéo thả tệp vào đây hoặc bấm để chọn</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
              {ALLOWED_EXT.map(ext => (
                <span key={ext} className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
                  {ext.toUpperCase()}
                </span>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-foreground outline-none transition-base">
                    <Info size={12} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-80 p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="px-3.5 py-2.5 border-b border-border">
                    <p className="text-xs font-semibold">Cách từng định dạng được xử lý</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {ALLOWED_EXT.map(ext => (
                      <div key={ext} className="flex items-start gap-3 px-3.5 py-2 border-b border-border last:border-b-0">
                        <span className="shrink-0 mt-0.5 inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium">{ext.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">{FORMAT_NOTES[ext]}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <input
              ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>
          <p className="text-xs text-foreground">{FORMAT_HELPER_TEXT}</p>

          {!agentId && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Thư mục đích</label>
              <select
                value={folderId ?? ""}
                onChange={e => setFolderId(e.target.value || null)}
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary transition-base"
              >
                <option value="">Danh sách tài liệu chung</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          <PermissionFields
            sharing={sharing}
            onSharingChange={s => { permissionsTouched.current = true; setSharing(s); }}
            querySharing={querySharing}
            onQuerySharingChange={s => { permissionsTouched.current = true; setQuerySharing(s); }}
          />

          {overLimitMsg && (
            <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle size={12} /> {overLimitMsg}</p>
          )}

          {staged.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{staged.length} tệp đã chọn</span>
                {!uploading && <button onClick={clearAll} className="text-xs font-semibold text-primary hover:underline">Xóa tất cả</button>}
              </div>
              {staged.map(s => (
                <div key={s.key} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <FileTypeIcon name={s.displayName} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.displayName}</div>
                      <div className="text-xs text-muted-foreground">{formatFileSize(s.file.size)}</div>
                    </div>
                    {!uploading && (
                      <button onClick={() => removeFile(s.key)} aria-label={`Bỏ ${s.displayName}`} className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {s.error && <p className="text-xs text-destructive mt-1.5">{s.error}</p>}
                  {!s.error && s.overwriteId && (
                    <p className="flex items-center gap-1.5 text-xs text-warning mt-1.5">
                      <RefreshCw size={11} /> Sẽ ghi đè tài liệu hiện có và tạo phiên bản mới.
                    </p>
                  )}
                  {!s.error && !s.overwriteId && s.displayName !== s.file.name && (
                    <p className="text-xs text-muted-foreground mt-1.5">Đã đổi tên để tránh trùng với tài liệu hiện có.</p>
                  )}
                  {uploading && !s.error && (
                    <div className="h-1.5 rounded-full bg-border overflow-hidden mt-2">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.progress}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <button onClick={() => { clearAll(); onClose(); }} disabled={uploading} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base disabled:opacity-40">Hủy</button>
          <button onClick={submit} disabled={validCount === 0 || uploading || accessInvalid} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">
            Lưu & Xử lý
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!activeDuplicate} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tài liệu "{activeDuplicate?.name}" đã tồn tại</AlertDialogTitle>
          <AlertDialogDescription>
            Đã có một tài liệu cùng tên trong {agentId ? "kho tri thức" : "thư mục"} này. Chọn cách xử lý tệp bạn vừa chọn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => resolveDuplicate("new")}>Tạo tài liệu mới</AlertDialogCancel>
          <AlertDialogAction onClick={() => resolveDuplicate("overwrite")}>Ghi đè (tạo phiên bản mới)</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
