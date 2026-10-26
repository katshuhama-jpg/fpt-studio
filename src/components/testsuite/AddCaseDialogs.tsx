import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { SparklesIcon, PencilEdit01Icon, FileUploadIcon, Add01Icon, Delete02Icon, Download04Icon, CheckmarkCircle02Icon, CancelCircleIcon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { newQna, newScenario, testStore, uid, type CaseKind, type QnaCase, type ScenarioCase, type TestCase } from "./testSuiteStore";
import { QnaEditor, ScenarioEditor, qnaErrors, scenarioValid } from "./CaseEditors";
import { Icon, KindToggle } from "./parts";

export type AddMethod = "ai" | "manual" | "upload";

/** Màn 3 — pick how to add testcases (Q&A/Kịch bản toggle for AI and manual). */
export function ChooseMethodDialog({ onClose, onPick }: { onClose: () => void; onPick: (m: AddMethod, kind: CaseKind) => void }) {
  const [method, setMethod] = useState<AddMethod | null>(null);
  const [kind, setKind] = useState<CaseKind>("qna");
  const cards: { id: AddMethod; icon: typeof SparklesIcon; title: string; desc: string }[] = [
    { id: "ai", icon: SparklesIcon, title: "Tạo bằng AI", desc: "Đưa tài liệu SRS/BRD hoặc mô tả, AI đề xuất testcase để bạn duyệt." },
    { id: "manual", icon: PencilEdit01Icon, title: "Nhập tay", desc: "Tự viết từng testcase Q&A hoặc kịch bản nhiều lượt." },
    { id: "upload", icon: FileUploadIcon, title: "Upload file có sẵn", desc: "Import từ file .xlsx theo mẫu, hệ thống kiểm tra từng dòng." },
  ];
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Thêm testcase</DialogTitle>
          <DialogDescription>Chọn cách tạo testcase cho Test Suite này.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Cách tạo" className="grid gap-3 sm:grid-cols-3">
          {cards.map(c => {
            const on = method === c.id;
            return (
              <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => (c.id === "upload" ? onPick("upload", kind) : setMethod(c.id))}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${on ? "border-primary ring-1 ring-primary" : ""}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-md ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}><Icon icon={c.icon} size={18} /></span>
                <span className="text-sm font-semibold">{c.title}</span>
                <span className="text-xs text-muted-foreground">{c.desc}</span>
              </button>
            );
          })}
        </div>
        {method && method !== "upload" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2.5">
            <span className="text-sm">Loại testcase</span>
            <KindToggle value={kind} onChange={setKind} />
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
          <Button type="button" disabled={!method} onClick={() => method && onPick(method, kind)}>Tiếp tục</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Màn 3B — Nhập tay. */
export function ManualDialog({ suiteId, initialKind, onClose }: { suiteId: string; initialKind: CaseKind; onClose: () => void }) {
  const [kind, setKind] = useState<CaseKind>(initialKind);
  const [qnas, setQnas] = useState<QnaCase[]>([newQna()]);
  const [scenario, setScenario] = useState<ScenarioCase>(newScenario());
  const [submitted, setSubmitted] = useState(false);
  const save = () => {
    setSubmitted(true);
    let cases: TestCase[];
    if (kind === "qna") {
      if (qnas.some(c => { const e = qnaErrors(c); return e.question || e.expected; })) return;
      cases = qnas.map(c => ({ ...c, question: c.question.trim(), expected: c.expected.trim() }));
    } else {
      if (!scenarioValid(scenario)) return;
      cases = [{ ...scenario, name: scenario.name.trim() || "Kịch bản không tên" }];
    }
    testStore.addCases(suiteId, cases);
    toast.success(`Đã thêm ${cases.length} testcase.`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-[680px]">
        <DialogHeader className="space-y-3 border-b px-6 pb-4 pt-6">
          <DialogTitle>Nhập tay testcase</DialogTitle>
          <DialogDescription className="sr-only">Viết testcase Q&A hoặc kịch bản nhiều lượt.</DialogDescription>
          <KindToggle value={kind} onChange={k => { setKind(k); setSubmitted(false); }} />
        </DialogHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {kind === "qna" ? (
            <>
              {qnas.map((c, i) => (
                <div key={c.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">Testcase {i + 1}</span>
                    {qnas.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Xoá testcase ${i + 1}`} onClick={() => setQnas(qnas.filter(x => x.id !== c.id))}><Icon icon={Delete02Icon} /></Button>}
                  </div>
                  <QnaEditor c={c} onChange={n => setQnas(qnas.map(x => (x.id === c.id ? n : x)))} errors={submitted ? qnaErrors(c) : undefined} />
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setQnas([...qnas, newQna()])}><Icon icon={Add01Icon} /> Thêm testcase khác</Button>
            </>
          ) : (
            <div className="rounded-lg border p-4"><ScenarioEditor c={scenario} onChange={setScenario} showErrors={submitted} /></div>
          )}
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
          <Button type="button" onClick={save}>Lưu & đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Màn 3C — Upload ───────────── */

const QNA_COLS = ["Câu hỏi", "Câu trả lời mong đợi", "Topic", "Tên văn bản tham chiếu"];
const SC_COLS = ["Mã kịch bản", "Thứ tự lượt", "Câu hỏi", "Câu trả lời mong đợi", "Topic", "Tên văn bản tham chiếu"];
const GUIDE = "Đặt cùng một Mã kịch bản cho các dòng thuộc cùng 1 hội thoại, đánh số thứ tự ở cột Thứ tự lượt.";

export function downloadTemplate(kind: CaseKind) {
  const wb = XLSX.utils.book_new();
  if (kind === "qna") {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([QNA_COLS, ["Phí duy trì tài khoản là bao nhiêu?", "Miễn phí nếu số dư bình quân từ 2 triệu đồng.", "Phí dịch vụ", "Biểu phí 2026.pdf"]]), "Testcase");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Hướng dẫn"], ["Mỗi dòng là 1 testcase Q&A. Bắt buộc: Câu hỏi, Câu trả lời mong đợi."]]), "Hướng dẫn");
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([SC_COLS,
      ["KB01", 1, "Tôi muốn tăng hạn mức thẻ.", "Hỏi loại thẻ và hạn mức mong muốn.", "Thẻ", ""],
      ["KB01", 2, "Thẻ Visa, lên 100 triệu.", "Nêu hồ sơ thu nhập cần bổ sung.", "Thẻ", ""]]), "Kịch bản");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Hướng dẫn"], [GUIDE], ["Mỗi kịch bản cần ít nhất 2 lượt. Bắt buộc: Mã kịch bản, Thứ tự lượt, Câu hỏi, Câu trả lời mong đợi."]]), "Hướng dẫn");
  }
  XLSX.writeFile(wb, kind === "qna" ? "mau-testcase-qna.xlsx" : "mau-testcase-kich-ban.xlsx");
}

export interface ValidationRow { key: string; label: string; ok: boolean; error?: string }
type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v).trim());

/** Validate rows from the template; returns the table rows and the cases that can be imported. */
export function validateRows(kind: CaseKind, rows: Row[]): { rows: ValidationRow[]; cases: TestCase[] } {
  const out: ValidationRow[] = [];
  const cases: TestCase[] = [];
  if (kind === "qna") {
    rows.forEach((r, i) => {
      const q = str(r["Câu hỏi"]), a = str(r["Câu trả lời mong đợi"]);
      const missing = [!q && "Câu hỏi", !a && "Câu trả lời mong đợi"].filter(Boolean);
      const label = `Dòng ${i + 2}`;
      if (missing.length) { out.push({ key: label, label, ok: false, error: `Thiếu ${missing.join(", ")}.` }); return; }
      out.push({ key: label, label, ok: true });
      cases.push({ id: uid("tc"), kind: "qna", question: q, expected: a, topic: str(r["Topic"]), reference: str(r["Tên văn bản tham chiếu"]), createdAt: Date.now() });
    });
    return { rows: out, cases };
  }
  const groups = new Map<string, { line: number; order: number; q: string; a: string; topic: string; ref: string }[]>();
  rows.forEach((r, i) => {
    const code = str(r["Mã kịch bản"]);
    const line = i + 2;
    if (!code) { out.push({ key: `Dòng ${line}`, label: `Dòng ${line}`, ok: false, error: "Thiếu Mã kịch bản." }); return; }
    const g = groups.get(code) ?? [];
    g.push({ line, order: Number(r["Thứ tự lượt"]), q: str(r["Câu hỏi"]), a: str(r["Câu trả lời mong đợi"]), topic: str(r["Topic"]), ref: str(r["Tên văn bản tham chiếu"]) });
    groups.set(code, g);
  });
  for (const [code, g] of groups) {
    const lines = g.map(x => x.line).join(", ");
    const label = `${code} (dòng ${lines})`;
    let error = "";
    if (g.length < 2) error = "Kịch bản cần ít nhất 2 lượt.";
    else if (g.some(x => !Number.isInteger(x.order) || x.order < 1)) error = "Thứ tự lượt phải là số nguyên từ 1.";
    else if (new Set(g.map(x => x.order)).size !== g.length) error = "Thứ tự lượt bị trùng.";
    else { const bad = g.find(x => !x.q || !x.a); if (bad) error = `Dòng ${bad.line} thiếu Câu hỏi hoặc Câu trả lời mong đợi.`; }
    if (error) { out.push({ key: code, label, ok: false, error }); continue; }
    out.push({ key: code, label, ok: true });
    const sorted = [...g].sort((a, b) => a.order - b.order);
    cases.push({ id: uid("tc"), kind: "scenario", name: code, topic: sorted[0].topic, reference: sorted[0].ref, createdAt: Date.now(), turns: sorted.map(x => ({ id: uid("turn"), question: x.q, expected: x.a })) });
  }
  return { rows: out, cases };
}

const SAMPLE: Record<CaseKind, Row[]> = {
  qna: [
    { "Câu hỏi": "Phí SMS Banking bao nhiêu?", "Câu trả lời mong đợi": "11.000đ/tháng.", Topic: "Phí dịch vụ" },
    { "Câu hỏi": "Có rút tiền không cần thẻ không?", "Câu trả lời mong đợi": "Có, dùng mã rút tiền tạo trên app." },
    { "Câu hỏi": "Giờ làm việc ngày lễ?", "Câu trả lời mong đợi": "" },
    { "Câu hỏi": "Đổi số điện thoại nhận OTP?", "Câu trả lời mong đợi": "Ra chi nhánh mang theo CCCD." },
  ],
  scenario: [
    { "Mã kịch bản": "KB01", "Thứ tự lượt": 1, "Câu hỏi": "Tôi muốn vay mua xe.", "Câu trả lời mong đợi": "Hỏi giá trị xe và thu nhập." },
    { "Mã kịch bản": "KB01", "Thứ tự lượt": 2, "Câu hỏi": "Xe 800 triệu, lương 30 triệu.", "Câu trả lời mong đợi": "Nêu hạn mức vay dự kiến." },
    { "Mã kịch bản": "KB02", "Thứ tự lượt": 1, "Câu hỏi": "Tôi muốn huỷ thẻ.", "Câu trả lời mong đợi": "Hỏi lý do và loại thẻ." },
    { "Mã kịch bản": "KB03", "Thứ tự lượt": 1, "Câu hỏi": "Lãi suất vay nhà?", "Câu trả lời mong đợi": "Nêu lãi suất ưu đãi." },
    { "Mã kịch bản": "KB03", "Thứ tự lượt": 1, "Câu hỏi": "Vay 20 năm được không?", "Câu trả lời mong đợi": "Tối đa 25 năm." },
  ],
};

export function UploadDialog({ suiteId, onClose }: { suiteId: string; onClose: () => void }) {
  const [kind, setKind] = useState<CaseKind>("qna");
  const [file, setFile] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof validateRows> | null>(null);
  const [drag, setDrag] = useState(false);
  const [readError, setReadError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const read = async (f: File) => {
    setReadError("");
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { setReadError("Chỉ hỗ trợ file .xlsx, .xls hoặc .csv."); return; }
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const sheet = wb.SheetNames.find(n => n !== "Hướng dẫn") ?? wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheet], { defval: "" });
      setFile(f.name);
      setResult(validateRows(kind, rows));
    } catch { setReadError("Không đọc được file. Kiểm tra lại định dạng theo file mẫu."); }
  };
  const ok = result?.rows.filter(r => r.ok).length ?? 0;
  const bad = (result?.rows.length ?? 0) - ok;
  const reset = () => { setFile(null); setResult(null); setReadError(""); };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-[680px]">
        <DialogHeader className="space-y-3 border-b px-6 pb-4 pt-6">
          <DialogTitle>Upload file có sẵn</DialogTitle>
          <DialogDescription className="sr-only">Import testcase từ file theo mẫu.</DialogDescription>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <KindToggle value={kind} onChange={k => { setKind(k); reset(); }} />
            <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate(kind)}><Icon icon={Download04Icon} /> Tải file mẫu (.xlsx)</Button>
          </div>
          {kind === "scenario" && <p className="text-xs text-muted-foreground">{GUIDE}</p>}
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {!result ? (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) read(f); }}
                className={`flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${drag ? "border-primary bg-primary/5" : ""}`}>
                <Icon icon={FileUploadIcon} size={28} className="mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Kéo-thả file vào đây</p>
                <p className="mt-0.5 text-xs text-muted-foreground">.xlsx, .xls hoặc .csv theo file mẫu</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => input.current?.click()}>Chọn file</Button>
                <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" aria-label="Chọn file testcase" onChange={e => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
              </div>
              {readError && <p className="text-sm text-destructive" role="alert">{readError}</p>}
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => { setFile(kind === "qna" ? "du-lieu-mau-qna.xlsx" : "du-lieu-mau-kich-ban.xlsx"); setResult(validateRows(kind, SAMPLE[kind])); }}>
                Chưa có file? Thử với dữ liệu mẫu
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-sm"><span className="text-muted-foreground">File:</span> <span className="font-medium">{file}</span></p>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">Hợp lệ: {ok} · Lỗi: {bad}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={reset}>Chọn file khác</Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2 text-left font-medium">{kind === "qna" ? "Dòng" : "Mã kịch bản"}</th><th scope="col" className="px-3 py-2 text-left font-medium">Trạng thái</th></tr></thead>
                  <tbody className="divide-y">
                    {result.rows.map(r => (
                      <tr key={r.key}>
                        <td className="px-3 py-2">{r.label}</td>
                        <td className="px-3 py-2">
                          {r.ok ? <span className="inline-flex items-center gap-1 text-success"><Icon icon={CheckmarkCircle02Icon} size={14} />Hợp lệ</span> : (
                            <Tooltip>
                              <TooltipTrigger asChild><button type="button" className="inline-flex items-center gap-1 text-destructive underline decoration-dotted underline-offset-2"><Icon icon={CancelCircleIcon} size={14} />Lỗi</button></TooltipTrigger>
                              <TooltipContent>{r.error}</TooltipContent>
                            </Tooltip>
                          )}
                          {!r.ok && <span className="sr-only">: {r.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bad > 0 && <p className="text-xs text-muted-foreground">Chỉ {ok} mục hợp lệ được import. Sửa file rồi upload lại để thêm các mục lỗi.</p>}
            </>
          )}
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
          <Button type="button" disabled={!result || !ok} onClick={() => { testStore.addCases(suiteId, result!.cases); toast.success(`Đã import ${result!.cases.length} testcase.`); onClose(); }}>Import vào Test Suite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
