import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, UploadCloud, ChevronDown, ChevronRight, Check, X, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { knowledgeFaqStore, type ImportRowInput } from "./knowledgeFaqStore";
import { normalizeForCompare } from "./textSimilarity";
import { TruncatedText, CategoryChips } from "./FaqCellDisplays";

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_ROWS = 1000;
const QUESTION_MAX = 500;
const ANSWER_MAX = 5000;
const MAX_CATEGORIES = 10;
const CATEGORY_MAX = 30;

type RowResult = "valid" | "error" | "duplicate";
interface ParsedRow {
  rowNumber: number;
  question: string;
  answer: string;
  categories: string[];
  result: RowResult;
  reason?: string;
  duplicateOfId?: string;
  duplicateQuestion?: string;
}

const SAMPLE_ANSWER = "Chọn \"Quên mật khẩu\" ở màn hình đăng nhập, xác thực bằng OTP gửi về số điện thoại đã đăng ký, sau đó đặt lại mật khẩu mới theo hướng dẫn.";

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["No.", "Question", "Answer", "Category"],
    [1, "Tôi quên mật khẩu thì làm thế nào?", SAMPLE_ANSWER, "Tài khoản; Bảo mật"],
  ]);
  ws["!cols"] = [{ wch: 6 }, { wch: 40 }, { wch: 60 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "FAQ");
  XLSX.writeFile(wb, "mau-nhap-faq.xlsx");
}

function downloadErrorRows(rows: ParsedRow[]) {
  const errorRows = rows.filter(r => r.result === "error");
  const ws = XLSX.utils.aoa_to_sheet([
    ["No.", "Question", "Answer", "Category", "Lý do"],
    ...errorRows.map(r => [r.rowNumber, r.question, r.answer, r.categories.join("; "), r.reason ?? ""]),
  ]);
  ws["!cols"] = [{ wch: 6 }, { wch: 40 }, { wch: 60 }, { wch: 24 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dòng lỗi");
  XLSX.writeFile(wb, "dong-loi-nhap-faq.xlsx");
}

function cellText(row: unknown[], index: number): string {
  if (index < 0) return "";
  const v = row[index];
  return v === undefined || v === null ? "" : String(v).trim();
}

async function parseAndValidate(file: File, kbId: string): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false });
  if (raw.length === 0) return [];

  const header = raw[0].map(h => String(h).trim().toLowerCase());
  const colNo = header.findIndex(h => h === "no." || h === "no");
  const colQuestion = header.findIndex(h => h === "question");
  const colAnswer = header.findIndex(h => h === "answer");
  const colCategory = header.findIndex(h => h === "category");
  void colNo;

  const seenQuestions = new Map<string, number>();
  const results: ParsedRow[] = [];

  raw.slice(1, 1 + MAX_ROWS).forEach((r, i) => {
    const rowNumber = i + 1;
    const question = cellText(r, colQuestion);
    const answer = cellText(r, colAnswer);
    const categoryRaw = cellText(r, colCategory);
    const categories = categoryRaw ? categoryRaw.split(";").map(c => c.trim()).filter(Boolean) : [];

    let result: RowResult = "valid";
    let reason: string | undefined;
    let duplicateOfId: string | undefined;
    let duplicateQuestion: string | undefined;

    if (!question) { result = "error"; reason = "Thiếu Question"; }
    else if (!answer) { result = "error"; reason = "Thiếu Answer"; }
    else if (question.length > QUESTION_MAX) { result = "error"; reason = "Câu hỏi vượt quá 500 ký tự"; }
    else if (answer.length > ANSWER_MAX) { result = "error"; reason = "Câu trả lời vượt quá 5.000 ký tự"; }
    else if (categories.length > MAX_CATEGORIES) { result = "error"; reason = "Quá 10 danh mục"; }
    else if (categories.some(c => c.length > CATEGORY_MAX)) { result = "error"; reason = "Danh mục vượt quá 30 ký tự"; }
    else {
      const norm = normalizeForCompare(question);
      const dupRow = seenQuestions.get(norm);
      if (dupRow !== undefined) {
        result = "error"; reason = `Trùng với dòng số ${dupRow} trong tệp`;
      } else {
        seenQuestions.set(norm, rowNumber);
        const existing = knowledgeFaqStore.findMatches(kbId, question).exact;
        if (existing) { result = "duplicate"; duplicateOfId = existing.id; duplicateQuestion = existing.question; }
      }
    }

    results.push({ rowNumber, question, answer, categories, result, reason, duplicateOfId, duplicateQuestion });
  });

  return results;
}

export default function ImportFaqModal({ open, kbId, onClose, onRefresh, onViewInvalid }: {
  open: boolean; kbId: string; onClose: () => void; onRefresh: () => void; onViewInvalid: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showStructure, setShowStructure] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);
  const checkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [resultFilter, setResultFilter] = useState<RowResult | "all">("all");
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "overwrite">("skip");

  const resetAll = () => {
    setStep(1); setFile(null); setFileError(null); setShowStructure(false);
    setChecking(false); setCheckedCount(0); setRows(null); setResultFilter("all"); setDuplicateMode("skip");
    if (checkTimer.current) clearInterval(checkTimer.current);
  };

  const validateFile = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith(".xlsx")) return "Chỉ nhận tệp .xlsx. Vui lòng chọn lại.";
    if (f.size > MAX_FILE_SIZE) return "Tệp vượt quá 1MB. Vui lòng tách nhỏ tệp.";
    return null;
  };

  const pickFile = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length > 1) { setFileError("Chỉ chọn được 1 tệp mỗi lần."); return; }
    const f = list[0];
    if (!f) return;
    const err = validateFile(f);
    setFile(f);
    setFileError(err);
  };

  const startCheck = async () => {
    if (!file || fileError) return;
    setChecking(true);
    setCheckedCount(0);
    setStep(2);
    const parsed = await parseAndValidate(file, kbId);
    const total = Math.max(1, parsed.length);
    let n = 0;
    checkTimer.current = setInterval(() => {
      n += Math.max(1, Math.round(total / 20));
      setCheckedCount(Math.min(n, total));
      if (n >= total) {
        if (checkTimer.current) clearInterval(checkTimer.current);
        setChecking(false);
        setRows(parsed);
      }
    }, 60);
  };

  const stopCheck = () => {
    if (checkTimer.current) clearInterval(checkTimer.current);
    setChecking(false);
    setStep(1);
  };

  const validCount = rows?.filter(r => r.result === "valid").length ?? 0;
  const errorCount = rows?.filter(r => r.result === "error").length ?? 0;
  const duplicateCount = rows?.filter(r => r.result === "duplicate").length ?? 0;
  const importCount = validCount + (duplicateMode === "overwrite" ? duplicateCount : 0);
  const visibleRows = rows?.filter(r => resultFilter === "all" || r.result === resultFilter) ?? [];

  const confirmImport = () => {
    if (!rows || importCount === 0) return;
    const toImport: ImportRowInput[] = rows
      .filter(r => r.result === "valid" || (r.result === "duplicate" && duplicateMode === "overwrite"))
      .map(r => ({ question: r.question, answer: r.answer, categories: r.categories, duplicateOfId: r.duplicateOfId }));

    onClose();
    toast.success(`Đang xử lý ${toImport.length} câu hỏi.`);
    const ids = knowledgeFaqStore.importRows(kbId, toImport, duplicateMode);
    onRefresh();

    setTimeout(() => { ids.forEach(id => knowledgeFaqStore.updateStatus(id, "processing")); onRefresh(); }, 400);
    setTimeout(() => {
      const invalidIds: string[] = [];
      ids.forEach(id => {
        const faq = knowledgeFaqStore.get(kbId, id);
        if (faq && faq.answer.trim().length < 20) {
          knowledgeFaqStore.updateStatus(id, "invalid", { statusReason: "Câu trả lời quá ngắn để lập chỉ mục." });
          invalidIds.push(id);
        } else {
          knowledgeFaqStore.updateStatus(id, "done", { chunkCount: 1 });
        }
      });
      onRefresh();
      if (invalidIds.length > 0) {
        toast.success(`Đã nhập ${ids.length} câu hỏi, ${invalidIds.length} câu hỏi không hợp lệ.`, {
          action: { label: "Xem", onClick: () => onViewInvalid() },
        });
      } else {
        toast.success(`Đã nhập xong ${ids.length} câu hỏi.`);
      }
    }, 1700);

    resetAll();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { resetAll(); onClose(); } }}>
      <DialogContent className="sm:max-w-[680px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập câu hỏi từ tệp</DialogTitle>
          <DialogDescription>Tải lên tệp Excel để thêm nhiều câu hỏi cùng lúc.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-1">
          <button
            type="button"
            onClick={step === 2 && !checking ? () => setStep(1) : undefined}
            disabled={step !== 2 || checking}
            className={`flex items-center gap-1.5 text-xs font-medium ${step === 2 ? "text-success hover:underline cursor-pointer" : "text-primary cursor-default"}`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${step === 2 ? "bg-success text-white" : "bg-primary text-primary-foreground"}`}>
              {step === 2 ? <Check size={10} /> : "1"}
            </span>
            Tải tệp
          </button>
          <div className="flex-1 h-px bg-border" />
          <span className={`flex items-center gap-1.5 text-xs font-medium ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${step === 2 ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground"}`}>2</span>
            Kiểm tra &amp; xác nhận
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <Download size={14} /> Tải tệp mẫu
                </button>
                <p className="text-xs text-muted-foreground mt-1">Tệp cần đúng cấu trúc của tệp mẫu.</p>
              </div>
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files); }}
              role="button"
              tabIndex={0}
              className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-base ${dragOver ? "border-primary bg-primary-soft/40" : "border-border hover:border-primary/40 hover:bg-surface-muted/50"}`}
            >
              <UploadCloud size={22} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Kéo thả tệp vào đây hoặc bấm để chọn</p>
              <p className="text-xs text-muted-foreground mt-2">Chỉ nhận tệp .xlsx · Tối đa 1 tệp · Dung lượng tối đa 1MB · Tối đa 1.000 dòng</p>
              <input
                ref={inputRef} type="file" accept=".xlsx" className="hidden"
                onChange={e => { if (e.target.files) pickFile(e.target.files); e.target.value = ""; }}
              />
            </div>

            {file && (
              <div className="rounded-lg border border-border px-3 py-2.5 flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                  {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
                </div>
                <button onClick={() => { setFile(null); setFileError(null); }} aria-label="Bỏ tệp" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="rounded-lg border border-border">
              <button type="button" onClick={() => setShowStructure(v => !v)} className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium">
                Xem cấu trúc tệp mẫu
                {showStructure ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              </button>
              {showStructure && (
                <div className="px-3.5 pb-3.5 space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-muted">
                          <th className="text-left px-2.5 py-1.5 font-semibold">No.</th>
                          <th className="text-left px-2.5 py-1.5 font-semibold">Question</th>
                          <th className="text-left px-2.5 py-1.5 font-semibold">Answer</th>
                          <th className="text-left px-2.5 py-1.5 font-semibold">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="px-2.5 py-1.5 align-top">1</td>
                          <td className="px-2.5 py-1.5 align-top max-w-[160px]">Tôi quên mật khẩu thì làm thế nào?</td>
                          <td className="px-2.5 py-1.5 align-top max-w-[220px]">{SAMPLE_ANSWER}</td>
                          <td className="px-2.5 py-1.5 align-top">Tài khoản; Bảo mật</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground leading-relaxed list-disc pl-4">
                    <li>Question và Answer bắt buộc có giá trị ở mọi dòng.</li>
                    <li>No. và Category có thể để trống.</li>
                    <li>Nhiều danh mục ngăn cách bằng dấu chấm phẩy (;).</li>
                    <li>Hệ thống chỉ đọc sheet đầu tiên của tệp.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            {checking ? (
              <div className="rounded-xl border border-border p-6 text-center space-y-3">
                <Loader2 size={20} className="mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang kiểm tra tệp... đã đọc {checkedCount}/{rows?.length ?? checkedCount} dòng</p>
                <button onClick={stopCheck} className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base">Dừng</button>
              </div>
            ) : rows && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResultFilter(f => (f === "valid" ? "all" : "valid"))}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-base ${resultFilter === "valid" ? "border-success bg-success/10" : "border-border hover:bg-surface-muted"}`}
                  >
                    <div className="text-lg font-semibold text-success">{validCount}</div>
                    <div className="text-xs text-muted-foreground">dòng hợp lệ</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultFilter(f => (f === "error" ? "all" : "error"))}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-base ${resultFilter === "error" ? "border-destructive bg-[hsl(var(--destructive-soft))]" : "border-border hover:bg-surface-muted"}`}
                  >
                    <div className="text-lg font-semibold text-destructive">{errorCount}</div>
                    <div className="text-xs text-muted-foreground">dòng lỗi</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultFilter(f => (f === "duplicate" ? "all" : "duplicate"))}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-base ${resultFilter === "duplicate" ? "border-warning bg-[hsl(var(--warning-soft))]" : "border-border hover:bg-surface-muted"}`}
                  >
                    <div className="text-lg font-semibold text-warning">{duplicateCount}</div>
                    <div className="text-xs text-muted-foreground">dòng trùng</div>
                  </button>
                </div>

                {errorCount > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Dòng lỗi sẽ không được nhập. Bạn có thể sửa tệp rồi tải lại.</p>
                    <button onClick={() => downloadErrorRows(rows)} className="text-xs font-semibold text-primary hover:underline shrink-0">Tải danh sách dòng lỗi</button>
                  </div>
                )}

                {duplicateCount > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Câu hỏi trùng với kho tri thức</label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                        <input type="radio" name="dup-mode" checked={duplicateMode === "skip"} onChange={() => setDuplicateMode("skip")} className="mt-0.5 accent-primary" />
                        <div>
                          <div className="text-sm font-medium">Bỏ qua dòng trùng</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Giữ nguyên câu hỏi đã có trong kho, không nhập dòng trùng.</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border border-border cursor-pointer">
                        <input type="radio" name="dup-mode" checked={duplicateMode === "overwrite"} onChange={() => setDuplicateMode("overwrite")} className="mt-0.5 accent-primary" />
                        <div>
                          <div className="text-sm font-medium">Ghi đè câu hỏi đã có</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Thay câu trả lời và danh mục của câu hỏi đã có bằng nội dung trong tệp.</div>
                        </div>
                      </label>
                    </div>
                    {duplicateMode === "overwrite" && (
                      <p className="flex items-center gap-1.5 text-xs text-warning mt-2">
                        <AlertTriangle size={12} className="shrink-0" /> {duplicateCount} câu hỏi trong kho sẽ bị thay đổi. Hành động này không thể hoàn tác.
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-border overflow-x-auto scroll-shadow-x max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface-muted">
                      <tr>
                        <th className="text-left px-2.5 py-2 kb-table-header">STT dòng</th>
                        <th className="text-left px-2.5 py-2 kb-table-header">Câu hỏi</th>
                        <th className="text-left px-2.5 py-2 kb-table-header">Câu trả lời</th>
                        <th className="text-left px-2.5 py-2 kb-table-header">Danh mục</th>
                        <th className="text-left px-2.5 py-2 kb-table-header">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map(r => (
                        <tr key={r.rowNumber} className="border-t border-border">
                          <td className="px-2.5 py-2 text-muted-foreground">{r.rowNumber}</td>
                          <td className="px-2.5 py-2 max-w-[160px]"><TruncatedText text={r.question || "—"} className="text-xs" /></td>
                          <td className="px-2.5 py-2 max-w-[200px]"><TruncatedText text={r.answer || "—"} className="text-xs text-muted-foreground" /></td>
                          <td className="px-2.5 py-2 max-w-[140px]"><CategoryChips categories={r.categories} /></td>
                          <td className="px-2.5 py-2">
                            {r.result === "valid" && (
                              <span className="flex items-center gap-1 text-success font-medium"><CheckCircle2 size={12} /> Hợp lệ</span>
                            )}
                            {r.result === "error" && (
                              <span className="flex items-center gap-1 text-destructive font-medium"><XCircle size={12} /> {r.reason}</span>
                            )}
                            {r.result === "duplicate" && (
                              <span className="flex items-center gap-1 text-warning font-medium"><AlertTriangle size={12} /> Đã có trong kho tri thức</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 2 && !checking ? (
            <>
              <button onClick={() => setStep(1)} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Quay lại</button>
              <button onClick={confirmImport} disabled={importCount === 0} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Nhập {importCount} câu hỏi</button>
            </>
          ) : step === 1 ? (
            <>
              <button onClick={() => { resetAll(); onClose(); }} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Hủy bỏ</button>
              <button onClick={startCheck} disabled={!file || !!fileError} className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none">Kiểm tra tệp</button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
