import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UploadCloud, X, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { knowledgeDocumentStore } from "./knowledgeDocumentStore";
import { knowledgeStore } from "./knowledgeStore";
import FileTypeIcon from "./FileTypeIcon";
import { formatFileSize } from "./formatFileSize";

const ALLOWED_EXT = ["txt", "md", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv"];
const ACCEPT_ATTR = ALLOWED_EXT.map(ext => `.${ext}`).join(",");
const MAX_FILES = 10;
const MAX_SIZE = 30 * 1024 * 1024;

interface StagedFile {
  key: string;
  file: File;
  error: string | null;
  warning: string | null;
  progress: number;
}

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
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

  useEffect(() => { if (open) setFolderId(initialFolderId); }, [open, initialFolderId]);

  const folders = agentId ? [] : knowledgeDocumentStore.listFolders(kbId!);

  const validCount = staged.filter(s => !s.error).length;

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    setOverLimitMsg(null);
    setStaged(prev => {
      const room = MAX_FILES - prev.length;
      if (room <= 0) {
        setOverLimitMsg("Chỉ chọn được tối đa 10 tệp mỗi lần. Bỏ bớt tệp để tiếp tục.");
        return prev;
      }
      const toAdd = incoming.slice(0, room);
      if (incoming.length > room) setOverLimitMsg("Chỉ chọn được tối đa 10 tệp mỗi lần. Bỏ bớt tệp để tiếp tục.");
      const next: StagedFile[] = toAdd.map(file => {
        const ext = extOf(file.name);
        let error: string | null = null;
        let warning: string | null = null;
        if (!ALLOWED_EXT.includes(ext)) error = `Định dạng .${ext} chưa được hỗ trợ.`;
        else if (file.size > MAX_SIZE) error = "Tệp vượt quá 30MB. Vui lòng nén hoặc tách nhỏ tệp.";
        else if (agentId
          ? knowledgeStore.list(agentId).some(i => i.name.trim().toLowerCase() === file.name.trim().toLowerCase())
          : knowledgeDocumentStore.isDuplicateName(kbId!, file.name, folderId)
        ) warning = "Tệp trùng tên đã có trong kho. Tải lên sẽ tạo phiên bản mới.";
        return { key: `${file.name}-${file.size}-${Math.random()}`, file, error, warning, progress: 0 };
      });
      return [...prev, ...next];
    });
  };

  const removeFile = (key: string) => setStaged(prev => prev.filter(s => s.key !== key));
  const clearAll = () => { setStaged([]); setOverLimitMsg(null); };

  const submit = () => {
    const valid = staged.filter(s => !s.error);
    if (valid.length === 0) return;
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
          const item = knowledgeStore.add(agentId, { name: s.file.name, kind: "doc", description: "", sizeBytes: s.file.size });
          setTimeout(() => knowledgeStore.updateStatus(agentId, item.id, "processing"), 400);
          setTimeout(() => knowledgeStore.updateStatus(agentId, item.id, "done", { chunkCount }), 1600);
        } else {
          const doc = knowledgeDocumentStore.addDocument(kbId!, { name: s.file.name, sizeBytes: s.file.size, folderId });
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
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="text-muted-foreground outline-none cursor-default">
                    <Info size={12} />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px]">Các tệp Office được tự động chuyển sang PDF trước khi xử lý để trích xuất nội dung chính xác hơn.</TooltipContent>
              </Tooltip>
            </div>
            <input
              ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden"
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-foreground">Tối đa 10 tệp mỗi lần tải.</p>
            <p className="text-xs text-foreground">Dung lượng tối đa 30MB mỗi tệp.</p>
          </div>

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
                    <FileTypeIcon name={s.file.name} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.file.name}</div>
                      <div className="text-xs text-muted-foreground">{formatFileSize(s.file.size)}</div>
                    </div>
                    {!uploading && (
                      <button onClick={() => removeFile(s.key)} aria-label={`Bỏ ${s.file.name}`} className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {s.error && <p className="text-xs text-destructive mt-1.5">{s.error}</p>}
                  {!s.error && s.warning && <p className="text-xs text-warning mt-1.5">{s.warning}</p>}
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
          <button onClick={submit} disabled={validCount === 0 || uploading} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">
            Lưu & Xử lý
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
