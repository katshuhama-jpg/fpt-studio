import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Building2, Check, ChevronLeft, Download, FileText, FolderPlus, Loader2, UploadCloud, X } from "lucide-react";
import { OrgMember, OrgUnit, findUnit } from "./orgData";
import { deriveNameFromEmail } from "./orgStore";

type ImportRow = {
  rowNumber: number;
  name: string;
  email: string;
  /** Unit path segments, relative to the anchor unit (`defaultUnitId`) — empty means "the anchor itself". */
  unitPath: string[];
  /** Display label for the preview/done tables. */
  unitLabel: string;
  /** True when no unit along `unitPath` exists yet under the anchor — it'll be created on import. */
  willCreateUnit: boolean;
  status: "valid" | "skipped";
  reason?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits plain CSV text into a grid of trimmed cells — good enough for a simple template with no embedded commas/quotes. */
function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(",").map(cell => cell.trim()));
}

/** First header index matching any of `candidates` (already-lowercased headers) — lets the
 * parser accept either the English or Vietnamese column name for the same field. */
function findHeaderIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.indexOf(c);
    if (i !== -1) return i;
  }
  return -1;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** True when every segment of `path`, walked one level at a time from `anchor`, already exists —
 * this is the file import's duplicate check: a path that already exists is reused as-is instead
 * of creating a second unit with the same name. */
function pathFullyExists(anchor: OrgUnit, path: string[]): boolean {
  let current = anchor;
  for (const seg of path) {
    const next = current.units.find(u => u.name.toLowerCase() === seg.toLowerCase());
    if (!next) return false;
    current = next;
  }
  return true;
}

function downloadSampleTemplate() {
  const csv = [
    "Name,Email,Đơn vị",
    "Mai Hoang,mai.hoang@fpt.com,Phong Kinh doanh",
    ",khanh.nguyen@fpt.com,Phong Kinh doanh/Team Sales mien Bac",
    "An Tran,an.tran@fpt.com,",
    "Le Van Cuong,le.van.cuong@fpt.com,Phong Marketing Moi",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-nhap-thanh-vien.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Small badge distinguishing a unit that already exists from one the import will create. */
function UnitStatusChip({ willCreate }: { willCreate: boolean }) {
  return willCreate ? (
    <span className="chip chip-primary text-[10px] shrink-0">
      <FolderPlus size={10} /> Đơn vị mới
    </span>
  ) : (
    <span className="chip text-[10px] shrink-0">
      <Building2 size={10} /> Đã có
    </span>
  );
}

export default function ImportMembersModal({
  existingMembers, tree, defaultUnitId, onClose, onConfirm,
}: {
  existingMembers: OrgMember[];
  /** Org tree the "Đơn vị" column is resolved against. */
  tree: OrgUnit;
  /** Anchor unit: where a blank Đơn vị cell lands, and what a non-blank Đơn vị path is relative to. */
  defaultUnitId: string;
  onClose: () => void;
  /** Every imported member gets the default "viewer" role — promote them afterward from Members/Structure. */
  onConfirm: (rows: { name: string; email: string; unitPath: string[] }[]) => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [dragActive, setDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [imported, setImported] = useState<ImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const anchorUnit = useMemo(() => findUnit(tree, defaultUnitId) ?? tree, [tree, defaultUnitId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const resetToUpload = () => {
    setStep("upload");
    setParseError(null);
    setFileInfo(null);
    setRows([]);
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    setFileInfo({ name: file.name, size: file.size });
    try {
      const text = await file.text();
      const table = parseCSV(text);
      if (table.length < 2) throw new Error("empty");
      const headers = table[0].map(h => h.toLowerCase());
      const nameIdx = findHeaderIndex(headers, ["name", "tên", "ten"]);
      const emailIdx = findHeaderIndex(headers, ["email"]);
      const unitIdx = findHeaderIndex(headers, ["unit", "đơn vị", "don vi", "donvi"]);
      if (emailIdx === -1) throw new Error("no-email-column");

      const existingEmails = new Set(existingMembers.map(m => m.email?.trim().toLowerCase()).filter(Boolean));
      const seenInFile = new Set<string>();

      const builtRows: ImportRow[] = table.slice(1).map((cells, i) => {
        const emailRaw = (cells[emailIdx] ?? "").trim();
        const nameRaw = nameIdx !== -1 ? (cells[nameIdx] ?? "").trim() : "";
        const unitRaw = unitIdx !== -1 ? (cells[unitIdx] ?? "").trim() : "";
        const name = nameRaw || (EMAIL_RE.test(emailRaw) ? deriveNameFromEmail(emailRaw) : "");
        const unitPath = unitRaw.split("/").map(s => s.trim()).filter(Boolean);
        const willCreateUnit = unitPath.length > 0 && !pathFullyExists(anchorUnit, unitPath);
        const unitLabel = unitPath.length === 0 ? anchorUnit.name : unitPath.join(" / ");

        let status: "valid" | "skipped" = "valid";
        let reason: string | undefined;
        const emailLower = emailRaw.toLowerCase();
        if (!emailRaw) { status = "skipped"; reason = "Thiếu email"; }
        else if (!EMAIL_RE.test(emailRaw)) { status = "skipped"; reason = "Sai định dạng email"; }
        else if (seenInFile.has(emailLower)) { status = "skipped"; reason = "Email bị trùng trong file"; }
        else if (existingEmails.has(emailLower)) { status = "skipped"; reason = "Đã là thành viên tổ chức"; }
        if (status === "valid") seenInFile.add(emailLower);

        return { rowNumber: i + 1, name, email: emailRaw, unitPath, unitLabel, willCreateUnit, status, reason };
      });

      setRows(builtRows);
      setStep("preview");
    } catch {
      setParseError("Không đọc được file này. Hãy đảm bảo đây là file .csv có các cột Name, Email và Đơn vị — Email là bắt buộc.");
    } finally {
      setIsParsing(false);
    }
  };

  const validRows = rows.filter(r => r.status === "valid");
  const skippedRows = rows.filter(r => r.status === "skipped");
  const unitsToCreate = useMemo(() => {
    const seen = new Set<string>();
    for (const r of validRows) if (r.willCreateUnit) seen.add(r.unitLabel);
    return [...seen];
  }, [validRows]);

  const submit = () => {
    if (validRows.length === 0) return;
    onConfirm(validRows.map(r => ({ name: r.name, email: r.email, unitPath: r.unitPath })));
    setImported(validRows);
    setStep("done");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-[92vw] sm:w-1/2 min-w-[50vw] max-w-[1100px] bg-white rounded-2xl flex flex-col shadow-2xl max-h-[85vh]" style={{ animation: "fadeScaleIn 0.18s ease" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Nhập thành viên từ Excel</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === "upload" && "Tải lên một file bảng tính để thêm nhiều thành viên — và đơn vị của họ — cùng lúc."}
              {step === "preview" && "Xem lại trước khi nhập."}
              {step === "done" && "Đã nhập xong."}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === "upload" && (
            <>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Download size={12} /> Tải file mẫu
              </button>

              <div
                role="button"
                tabIndex={0}
                aria-label="Tải lên file nhập thành viên"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                onDragOver={e => { e.preventDefault(); if (!isParsing) setDragActive(true); }}
                onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  if (isParsing) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                className={`min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
                  isParsing ? "opacity-60 pointer-events-none" : ""
                } ${dragActive ? "border-primary bg-primary-soft" : "border-border bg-surface-muted hover:bg-surface-muted/70"}`}
              >
                {isParsing ? (
                  <>
                    <Loader2 size={22} className="animate-spin text-primary" />
                    <div className="text-sm font-medium">Đang đọc {fileInfo?.name}…</div>
                  </>
                ) : (
                  <>
                    <UploadCloud size={28} className="text-muted-foreground" />
                    <div className="text-sm font-medium">Kéo thả file vào đây</div>
                    <div className="text-xs text-muted-foreground">File .csv xuất từ Excel — cần có cột Name, Email, Đơn vị</div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="btn-secondary mt-1"
                    >
                      Chọn file
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-3">
                <FolderPlus size={15} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  Tên đơn vị chưa tồn tại — ở bất kỳ đâu trong đường dẫn — sẽ được tự động tạo, lồng đúng như đã viết (ví dụ: <span className="font-mono">Sales/Team North</span> sẽ tạo "Sales" trước nếu chưa có, rồi tạo "Team North" bên trong). Đơn vị đã có sẵn thì dùng lại, không tạo trùng. Mọi người được nhập vào đều bắt đầu với vai trò Viewer; có thể nâng quyền sau tại Members hoặc Structure.
                </p>
              </div>

              {fileInfo && !isParsing && (
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-medium text-foreground truncate">{fileInfo.name}</div>
                    <div className="text-muted-foreground">{formatBytes(fileInfo.size)}</div>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3">
                  <AlertTriangle size={15} className="text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive leading-relaxed">{parseError}</div>
                </div>
              )}
            </>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={resetToUpload}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-base"
              >
                <ChevronLeft size={12} /> Chọn file khác
              </button>

              {fileInfo && (
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-medium text-foreground truncate">{fileInfo.name}</div>
                    <div className="text-muted-foreground">{formatBytes(fileInfo.size)} · tìm thấy {rows.length} dòng</div>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{validRows.length}</span> sẽ được nhập
                {skippedRows.length > 0 && <> · <span className="text-foreground font-medium">{skippedRows.length}</span> sẽ bị bỏ qua</>}
              </div>

              {unitsToCreate.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-soft px-3.5 py-3">
                  <FolderPlus size={15} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">
                    <span className="font-medium">{unitsToCreate.length}</span> đơn vị mới sẽ được tạo: {unitsToCreate.join(", ")}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr,1fr,1.4fr,150px] gap-3 px-4 py-2.5 bg-surface-muted section-eyebrow">
                  <div>Tên</div><div>Email</div><div>Đơn vị</div><div>Trạng thái</div>
                </div>
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {rows.map(r => (
                    <div key={r.rowNumber} className="grid grid-cols-[1fr,1fr,1.4fr,150px] gap-3 px-4 py-2.5 items-center text-sm">
                      <div className="truncate">{r.name || <span className="text-muted-foreground italic">—</span>}</div>
                      <div className="truncate text-muted-foreground">{r.email || <span className="italic">—</span>}</div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-xs text-muted-foreground" title={r.unitLabel}>{r.unitLabel}</span>
                        {r.status === "valid" && <UnitStatusChip willCreate={r.willCreateUnit} />}
                      </div>
                      <div>
                        {r.status === "valid" ? (
                          <span className="chip chip-success text-[11px]"><Check size={11} /> Hợp lệ</span>
                        ) : (
                          <span className="chip chip-warning text-[11px]" title={r.reason}>{r.reason}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "done" && (
            <>
              <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3.5 py-3">
                <Check size={15} className="text-success shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  Đã nhập <span className="font-medium">{imported.length}</span> thành viên
                  {unitsToCreate.length > 0 && <> · đã tạo <span className="font-medium">{unitsToCreate.length}</span> đơn vị mới</>}
                  {skippedRows.length > 0 && <> — {skippedRows.length} dòng bị bỏ qua.</>}
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr,1fr,1.4fr] gap-3 px-4 py-2.5 bg-surface-muted section-eyebrow">
                  <div>Tên</div><div>Email</div><div>Đơn vị</div>
                </div>
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {imported.map(r => (
                    <div key={r.rowNumber} className="grid grid-cols-[1fr,1fr,1.4fr] gap-3 px-4 py-2.5 items-center text-sm">
                      <div className="truncate">{r.name}</div>
                      <div className="truncate text-muted-foreground">{r.email}</div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-xs text-muted-foreground" title={r.unitLabel}>{r.unitLabel}</span>
                        <UnitStatusChip willCreate={r.willCreateUnit} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          {step === "preview" ? (
            <>
              <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
                Hủy
              </button>
              <button
                onClick={submit}
                disabled={validRows.length === 0}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Nhập {validRows.length} thành viên
              </button>
            </>
          ) : (
            <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">
              Đóng
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}
