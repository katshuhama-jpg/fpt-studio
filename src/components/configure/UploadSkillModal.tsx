import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UploadCloud, X, AlertTriangle } from "lucide-react";
import FileTypeIcon from "@/components/knowledge/FileTypeIcon";
import { formatFileSize } from "@/components/knowledge/formatFileSize";
import { type SharingMode, type SharedPerson } from "./skillSharing";
import SkillMemberPicker from "./SkillMemberPicker";
import type { SkillFormData } from "./CreateSkillModal";

const ALLOWED_EXT = ["md", "zip", "skill"];
const ACCEPT_ATTR = ALLOWED_EXT.map(e => `.${e}`).join(",");
const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng trong Space", helper: "Mọi thành viên trong Space đều xem và dùng được skill này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

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
 * .md/.zip/.skill drop zone, the same file-requirements note, and the same "Chia sẻ tới"
 * sharing step CreateSkillModal ends with (Console lets you set sharing on an uploaded skill
 * exactly like a hand-written one — there's no separate "private until shared later" path).
 * Console parses the archive's SKILL.md server-side; this prototype mocks that by reading YAML
 * frontmatter client-side for .md and deriving a name from the filename for .zip/.skill —
 * either way it hands back the same SkillFormData the manual form produces, so all three
 * call sites (Console Skills, Agent Skills tab, Instructions "Kết nối" widget) can reuse
 * whatever onSubmit they already wired up for CreateSkillModal. */
export default function UploadSkillModal({ onClose, onSubmit, currentUser, isDuplicateName }: {
  onClose: () => void;
  onSubmit: (data: SkillFormData) => void;
  currentUser: { id: string; name: string; email: string };
  isDuplicateName?: (name: string) => boolean;
}) {
  const [staged, setStaged] = useState<Staged | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sharingMode, setSharingMode] = useState<SharingMode>("private");
  const [people, setPeople] = useState<SharedPerson[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
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

  const peopleError = sharingMode === "specific" && people.length === 0;
  const canSubmit = !!staged && !staged.error && !submitting && (sharingMode !== "specific" || people.length > 0);

  const submit = async () => {
    setSubmitAttempted(true);
    if (!staged || staged.error) return;
    if (sharingMode === "specific" && people.length === 0) return;
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

    onSubmit({
      name: parsed.name, description: parsed.description, body,
      sharing: { mode: sharingMode, people: sharingMode === "specific" ? people : [] },
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] max-h-[88vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
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

        <div>
          <label className="text-sm font-medium mb-2 block">Chia sẻ tới</label>
          <div className="space-y-2">
            {SHARING_OPTIONS.map(opt => {
              const selected = sharingMode === opt.value;
              return (
                <div key={opt.value}>
                  <div
                    onClick={() => setSharingMode(opt.value)}
                    className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary" : "border-border"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{opt.label}</div>
                      {opt.helper && <div className="text-xs text-muted-foreground mt-0.5">{opt.helper}</div>}
                    </div>
                  </div>
                  {selected && opt.value === "specific" && (
                    <div className="mt-2 pl-3.5">
                      <SkillMemberPicker value={people} onChange={setPeople} ownerRow={{ name: currentUser.name, email: currentUser.email }} />
                      {peopleError && submitAttempted && (
                        <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
