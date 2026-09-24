import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UploadCloud, X, AlertTriangle } from "lucide-react";
import FileTypeIcon from "@/components/knowledge/FileTypeIcon";
import { formatFileSize } from "@/components/knowledge/formatFileSize";
import type { SkillFormData } from "./CreateSkillModal";

const ALLOWED_EXT = ["md", "zip", "skill"];
const ACCEPT_ATTR = ALLOWED_EXT.map(e => `.${e}`).join(",");

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Lightweight YAML-frontmatter reader for an uploaded .md skill file — pulls `name` and
 * `description` out of the leading "---\n...\n---" block, mirroring the "File .md phải chứa
 * name và description ở định dạng YAML" rule shown in the file-requirements box below. Returns
 * null when the block or either field is missing, which the caller surfaces as a validation
 * error instead of creating a half-populated skill. */
function parseMdFrontmatter(text: string): { name: string; description: string } | null {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const yaml = m[1];
  const name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  const description = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!name || !description) return null;
  return { name, description };
}

interface Staged {
  file: File;
  error: string | null;
}

/** "Tải lên kỹ năng" — the upload half of the two-way "Tạo kỹ năng" choice (see
 * CreateSkillChoiceModal), field-for-field port of Console's own upload dialog: a single
 * .md/.zip/.skill drop zone plus the same file-requirements note, no other fields. Console
 * parses the archive's SKILL.md server-side; this prototype mocks that by reading YAML
 * frontmatter client-side for .md and deriving a name from the filename for .zip/.skill —
 * either way it hands back the same SkillFormData the manual form produces, so all three
 * call sites (Console Skills, Agent Skills tab, Instructions "Kết nối" widget) can reuse
 * whatever onSubmit they already wired up for CreateSkillModal. */
export default function UploadSkillModal({ onClose, onSubmit, isDuplicateName }: {
  onClose: () => void;
  onSubmit: (data: SkillFormData) => void;
  isDuplicateName?: (name: string) => boolean;
}) {
  const [staged, setStaged] = useState<Staged | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (file: File) => {
    const ext = extOf(file.name);
    if (!ALLOWED_EXT.includes(ext)) {
      setStaged({ file, error: `Định dạng .${ext} chưa được hỗ trợ. Chỉ chấp nhận .md, .zip hoặc .skill.` });
      return;
    }
    setStaged({ file, error: null });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    pick(files[0]);
  };

  const canSubmit = !!staged && !staged.error && !submitting;

  const submit = async () => {
    if (!staged || staged.error) return;
    setSubmitting(true);
    const { file } = staged;
    const ext = extOf(file.name);
    let parsed: { name: string; description: string } | null;
    let body: string;

    if (ext === "md") {
      const text = await file.text();
      body = text;
      parsed = parseMdFrontmatter(text);
      if (!parsed) {
        setStaged({ file, error: "File .md phải chứa name và description ở định dạng YAML." });
        setSubmitting(false);
        return;
      }
    } else {
      // .zip / .skill — Console reads the SKILL.md bundled inside the archive server-side;
      // the prototype mocks that by deriving a provisional name from the archive's filename.
      const derivedName = file.name.replace(/\.(zip|skill)$/i, "");
      parsed = { name: derivedName, description: `Kỹ năng được nhập từ tệp ${file.name}.` };
      body = `# ${derivedName}\n\nNội dung SKILL.md được đọc từ tệp đã tải lên (${file.name}).`;
    }

    if (isDuplicateName?.(parsed.name)) {
      setStaged({ file, error: `Tên "${parsed.name}" đã tồn tại. Vui lòng đổi tên trong file rồi tải lên lại.` });
      setSubmitting(false);
      return;
    }

    onSubmit({ name: parsed.name, description: parsed.description, body, sharing: { mode: "private", people: [] } });
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Tải lên kỹ năng</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Nhập kỹ năng từ file .md, .zip hoặc .skill.</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
        />

        {!staged ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed cursor-pointer transition-base ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-surface-muted"
            }`}
          >
            <UploadCloud size={22} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Kéo thả hoặc bấm để tải lên</span>
          </div>
        ) : (
          <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border ${staged.error ? "border-destructive/40 bg-destructive/5" : "border-border bg-surface-muted/50"}`}>
            <FileTypeIcon name={staged.file.name} size={18} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{staged.file.name}</div>
              {staged.error ? (
                <div className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                  <AlertTriangle size={11} className="shrink-0" />
                  {staged.error}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{formatFileSize(staged.file.size)}</div>
              )}
            </div>
            <button onClick={() => setStaged(null)} className="p-1 rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground shrink-0" aria-label="Xóa tệp">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="rounded-lg bg-surface-muted border border-border px-3.5 py-3">
          <p className="text-xs font-medium mb-1.5">Yêu cầu tệp</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>File .md phải chứa name và description ở định dạng YAML</li>
            <li>File .zip hoặc .skill phải chứa một file SKILL.md</li>
          </ul>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy</button>
          <button onClick={submit} disabled={!canSubmit} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">
            {submitting ? "Đang xử lý…" : "Tạo kỹ năng"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
