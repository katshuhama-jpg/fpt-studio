import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SparklesIcon, SentIcon, Undo02Icon, Add01Icon, Copy01Icon, Delete02Icon, FileAttachmentIcon, Cancel01Icon, Attachment01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aiGenerate, aiRefine, testStore, uid, type TestCase, type Suite } from "./testSuiteStore";
import { Crumbs, Icon, useTestNav } from "./parts";
import CaseDetailSheet from "./CaseDetailSheet";

interface Row { c: TestCase; updatedAt?: number }
interface Msg { id: string; role: "system" | "user" | "ai" | "loading"; text: string; snapshot?: Row[]; undone?: boolean }

const question = (c: TestCase) => (c.kind === "qna" ? c.question : c.turns[0]?.question ?? "");
const expected = (c: TestCase) => (c.kind === "qna" ? c.expected : c.turns[0]?.expected ?? "");
const copyOf = (c: TestCase): TestCase => (c.kind === "qna"
  ? { ...c, id: uid("tc"), createdAt: Date.now() }
  : { ...c, id: uid("tc"), createdAt: Date.now(), name: `${c.name || "Kịch bản"} (bản sao)`, turns: c.turns.map(t => ({ ...t, id: uid("turn") })) });

/** Refine with AI on a whole Test Suite: chat left, editable table right; nothing is saved until "Lưu thay đổi". */
export default function RefinePage({ suite }: { suite: Suite }) {
  const { go } = useTestNav();
  const [rows, setRows] = useState<Row[]>(() => suite.cases.map(c => ({ c })));
  const [msgs, setMsgs] = useState<Msg[]>([{ id: "sys", role: "system", text: `Yêu cầu AI chỉnh sửa Test Suite "${suite.name}": viết lại câu trả lời, thêm testcase mới, bổ sung topic… Chọn dòng ở bảng để AI chỉ sửa các testcase đó.` }]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [msgs.length]);

  const original = JSON.stringify(suite.cases);
  const dirty = JSON.stringify(rows.map(r => r.c)) !== original;
  const toSuite = () => go("test-sets", { item: suite.id });
  const back = () => (dirty ? setLeaving(true) : toSuite());
  const sel = selected.filter(id => rows.some(r => r.c.id === id));

  const send = async () => {
    const text = input.trim();
    if ((!text && !file) || busy) return;
    const snapshot = rows;
    const loading: Msg = { id: uid("m"), role: "loading", text: file ? "Đang phân tích tài liệu..." : "Đang xử lý..." };
    setMsgs(m => [...m, { id: uid("m"), role: "user", text: text || "(Đính kèm tài liệu)" }, loading]);
    setInput(""); setBusy(true);
    const stamp = Date.now();
    const wantsNew = !!file || /\b(thêm|tạo|bổ sung)\b/i.test(text);
    try {
      if (wantsNew && !sel.length) {
        const kind = /kịch bản|nhiều lượt/i.test(text) ? "scenario" : "qna";
        const n = Number(text.match(/\b(\d{1,2})\b/)?.[1]) || 3;
        const cases = await aiGenerate(kind, n, rows.length, file ?? undefined, 1100);
        setRows(r => [...r, ...cases.map(c => ({ c, updatedAt: stamp }))]);
        setMsgs(m => [...m.filter(x => x.id !== loading.id), { id: uid("m"), role: "ai", text: `Đã thêm ${cases.length} testcase mới vào cuối bảng.`, snapshot }]);
      } else {
        const ids = new Set(sel.length ? sel : rows.map(r => r.c.id));
        const updated = await aiRefine(rows.filter(r => ids.has(r.c.id)).map(r => r.c), text);
        const byId = new Map(updated.map(c => [c.id, c]));
        setRows(r => r.map(x => (ids.has(x.c.id) ? { c: byId.get(x.c.id)!, updatedAt: stamp } : x)));
        setMsgs(m => [...m.filter(x => x.id !== loading.id), { id: uid("m"), role: "ai", text: `Đã cập nhật ${updated.length} testcase${sel.length ? " đã chọn" : ""}.`, snapshot }]);
      }
      setLastAction(stamp);
      setFile(null);
    } catch {
      setMsgs(m => [...m.filter(x => x.id !== loading.id), { id: uid("m"), role: "ai", text: "Chưa xử lý được. Vui lòng thử lại." }]);
    } finally { setBusy(false); }
  };
  const undo = (msg: Msg) => {
    if (!msg.snapshot) return;
    setRows(msg.snapshot); setLastAction(0);
    setMsgs(m => m.map(x => (x.id === msg.id ? { ...x, undone: true } : x)));
  };
  const duplicate = (ids: string[]) => setRows(r => r.flatMap(x => (ids.includes(x.c.id) ? [x, { c: copyOf(x.c), updatedAt: Date.now() }] : [x])));
  const remove = (ids: string[]) => { setRows(r => r.filter(x => !ids.includes(x.c.id))); setSelected(s => s.filter(id => !ids.includes(id))); };
  const save = () => {
    testStore.setCases(suite.id, rows.map(r => r.c));
    toast.success("Đã lưu thay đổi.");
    toSuite();
  };
  const viewingCase = rows.find(r => r.c.id === viewing)?.c;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
        <Crumbs onBack={back} items={[{ label: "Test Suites", onClick: () => go("test-sets") }, { label: suite.name, onClick: back }, { label: "Refine with AI" }]} />
        <Button type="button" className="ml-auto" disabled={!dirty} onClick={save}>Lưu thay đổi</Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Refine with AI" className="flex min-h-[420px] flex-col border-b lg:border-b-0 lg:border-r">
          <h2 className="flex items-center gap-1.5 px-4 pt-4 text-sm font-semibold"><Icon icon={SparklesIcon} className="text-primary" />Refine with AI</h2>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {msgs.map(m => {
              if (m.role === "system") return <p key={m.id} className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">{m.text}</p>;
              if (m.role === "user") return <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{m.text}</p>;
              if (m.role === "loading") return (
                <div key={m.id} role="status" className="flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                  <span className="flex gap-0.5" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />)}</span>{m.text}
                </div>
              );
              return (
                <div key={m.id} className="w-fit max-w-[90%] rounded-lg rounded-bl-sm border px-3 py-2 text-sm">
                  <p className={m.undone ? "text-muted-foreground line-through" : ""}>{m.text}</p>
                  {m.snapshot && (m.undone ? <p className="mt-1 text-xs text-muted-foreground">Đã hoàn tác</p>
                    : <button type="button" onClick={() => undo(m)} className="mt-1 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground"><Icon icon={Undo02Icon} size={12} />Hoàn tác</button>)}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="border-t p-3">
            {sel.length > 0 && <p className="mb-2 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs text-primary">AI chỉ sửa {sel.length} testcase đã chọn.</p>}
            {file && (
              <div className="mb-2 flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                <Icon icon={FileAttachmentIcon} size={12} />{file}
                <button type="button" aria-label="Bỏ tệp đính kèm" onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground"><Icon icon={Cancel01Icon} size={12} /></button>
              </div>
            )}
            <div className="overflow-hidden rounded-lg border bg-background transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
              <Textarea rows={2} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="VD: viết lại câu trả lời tự nhiên hơn, thêm 3 testcase về thanh toán..." aria-label="Yêu cầu chỉnh sửa"
                className="resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
              <div className="flex items-center px-2 pb-2">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Đính kèm file" onClick={() => fileRef.current?.click()}><Icon icon={Attachment01Icon} /></Button>
                <input ref={fileRef} type="file" className="hidden" aria-label="Chọn tài liệu" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f.name); e.target.value = ""; }} />
                <Button type="button" size="icon" className="ml-auto h-8 w-8" aria-label="Gửi" disabled={busy || (!input.trim() && !file)} onClick={send}><Icon icon={SentIcon} /></Button>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Testcase trong Test Suite" className="flex min-h-0 flex-col">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 border-b px-6 py-2.5">
            {sel.length ? (
              <>
                <span className="text-sm font-medium tabular-nums">Đã chọn {sel.length}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => duplicate(sel)}><Icon icon={Copy01Icon} /> Duplicate</Button>
                <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(sel)}><Icon icon={Delete02Icon} /> Xoá</Button>
                <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected([])}>Bỏ chọn</Button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground tabular-nums">{rows.length} testcase{dirty ? " · Có thay đổi chưa lưu" : ""}</span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2.5"><Checkbox checked={sel.length === rows.length && rows.length > 0 ? true : sel.length ? "indeterminate" : false} onCheckedChange={v => setSelected(v ? rows.map(r => r.c.id) : [])} aria-label="Chọn tất cả" /></th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Câu hỏi</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Câu trả lời mong đợi</th>
                  <th scope="col" className="w-28 px-3 py-2.5 text-left font-medium">Topic</th>
                  <th scope="col" className="w-36 px-3 py-2.5 text-left font-medium">Nguồn tài liệu</th>
                  <th scope="col" className="w-20 px-2 py-2.5"><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(({ c, updatedAt }) => {
                  const fresh = !!lastAction && updatedAt === lastAction;
                  const on = sel.includes(c.id);
                  return (
                    <tr key={c.id} className={`align-top ${fresh ? "bg-primary/5" : on ? "bg-muted/40" : ""}`}>
                      <td className="px-3 py-3"><Checkbox checked={on} onCheckedChange={v => setSelected(s => (v ? [...s, c.id] : s.filter(x => x !== c.id)))} aria-label={`Chọn: ${question(c)}`} /></td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => setViewing(c.id)} className="line-clamp-2 text-left font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{question(c)}</button>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.kind === "scenario" && <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium">Kịch bản · {c.turns.length} lượt</span>}
                          {fresh && <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"><Icon icon={SparklesIcon} size={12} />Vừa cập nhật</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground"><p className="line-clamp-3">{expected(c)}</p></td>
                      <td className="px-3 py-3">{c.topic || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3"><span className="block max-w-[140px] truncate" title={c.reference}>{c.reference || <span className="text-muted-foreground">—</span>}</span></td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-0.5">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Duplicate" title="Duplicate" onClick={() => duplicate([c.id])}><Icon icon={Copy01Icon} size={14} /></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Xoá" title="Xoá" onClick={() => remove([c.id])}><Icon icon={Delete02Icon} size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p className="px-6 py-10 text-center text-sm text-muted-foreground">Bảng đang trống. Nhờ AI thêm testcase ở khung bên trái.</p>}
          </div>
          <div className="flex items-center gap-2 border-t px-6 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setInput("Thêm 3 testcase về "); }}><Icon icon={Add01Icon} /> Gợi ý: thêm testcase</Button>
            <Button type="button" variant="outline" className="ml-auto" onClick={back}>Huỷ</Button>
            <Button type="button" disabled={!dirty} onClick={save}>Lưu thay đổi</Button>
          </div>
        </section>
      </div>

      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi chưa lưu?</AlertDialogTitle>
            <AlertDialogDescription>Các chỉnh sửa trong phiên Refine with AI sẽ không được áp dụng vào Test Suite.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={toSuite}>Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewingCase && <CaseDetailSheet suite={{ ...suite, cases: rows.map(r => r.c) }} caseId={viewingCase.id} readOnly onClose={() => setViewing(null)} />}
    </div>
  );
}
