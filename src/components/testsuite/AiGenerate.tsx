import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  SparklesIcon, Add01Icon, SentIcon, Undo02Icon, Tick02Icon, Cancel01Icon, PencilEdit01Icon, BubbleChatIcon, FileAttachmentIcon, ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aiGenerate, aiRefine, takePendingPrompt, toMarkdown, testStore, uid, KIND_LABEL, type CaseKind, type DraftCase, type QnaCase, type ScenarioCase, type Suite, type TestCase } from "./testSuiteStore";
import { QnaEditor } from "./CaseEditors";
import { Crumbs, Icon, KindToggle, SEG_LIST, SEG_TRIGGER, useTestNav } from "./parts";

interface Msg { id: string; role: "system" | "user" | "ai" | "loading"; text: string; file?: string; snapshot?: DraftCase[]; undone?: boolean }
export type Count = "auto" | "5" | "10" | "20";

function UpdatedTag() {
  return <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"><Icon icon={SparklesIcon} size={12} />Vừa cập nhật</span>;
}

function CardShell({ d, index, fresh, selected, onSelect, onAccept, children, onEdit, editing }: {
  d: DraftCase; index: number; fresh: boolean; selected: boolean; onSelect: (v: boolean) => void; onAccept: (v: boolean | null) => void;
  children: React.ReactNode; onEdit?: () => void; editing?: boolean;
}) {
  const rejected = d.accepted === false;
  return (
    <div className={`rounded-lg border bg-card p-4 transition-colors ${fresh ? "border-primary ring-2 ring-primary/30 motion-safe:animate-[pulse_1.2s_ease-in-out_2]" : ""} ${rejected ? "opacity-55" : ""}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <Checkbox checked={selected} onCheckedChange={v => onSelect(!!v)} aria-label={`Chọn testcase ${index + 1}`} />
        <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
        {fresh && <UpdatedTag />}
        {rejected && <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Đã loại</span>}
        {d.accepted === true && <span className="rounded-sm bg-[hsl(var(--success-soft))] px-1.5 py-0.5 text-[11px] font-medium text-success">Đã duyệt</span>}
        <div className="ml-auto flex items-center gap-0.5">
          {onEdit && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={editing ? "Xong" : "Sửa"} aria-pressed={editing} onClick={onEdit}><Icon icon={editing ? Tick02Icon : PencilEdit01Icon} size={14} /></Button>}
          <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${d.accepted === true ? "bg-[hsl(var(--success-soft))] text-success" : ""}`} aria-label="Giữ testcase" aria-pressed={d.accepted === true} onClick={() => onAccept(d.accepted === true ? null : true)}><Icon icon={Tick02Icon} size={14} /></Button>
          <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${rejected ? "bg-[hsl(var(--destructive-soft))] text-destructive" : ""}`} aria-label="Loại testcase" aria-pressed={rejected} onClick={() => onAccept(rejected ? null : false)}><Icon icon={Cancel01Icon} size={14} /></Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function QnaView({ c }: { c: QnaCase }) {
  return (
    <dl className="space-y-2 text-sm">
      <div><dt className="text-xs font-medium text-muted-foreground">Câu hỏi</dt><dd>{c.question}</dd></div>
      <div><dt className="text-xs font-medium text-muted-foreground">Câu trả lời mong đợi</dt><dd>{c.expected}</dd></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Topic: <span className="text-foreground">{c.topic || "—"}</span></span>
        {c.reference && <span className="inline-flex min-w-0 max-w-[260px] items-center gap-1" title={c.reference}><Icon icon={FileAttachmentIcon} size={12} /><span className="truncate">{c.reference}</span></span>}
      </div>
    </dl>
  );
}

function ScenarioView({ c, onChange }: { c: ScenarioCase; onChange: (c: ScenarioCase) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{c.name || "Kịch bản"} <span className="font-normal text-muted-foreground">· {c.turns.length} lượt · {c.topic || "—"}</span></p>
      <ol className="space-y-1.5">
        {c.turns.map((t, i) => (
          <li key={t.id} className="rounded-md bg-muted/40 p-2">
            <button type="button" className="flex w-full items-center gap-2 text-left text-xs rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
              <span className="font-semibold text-muted-foreground">Lượt {i + 1}</span>
              <Icon icon={ArrowDown01Icon} size={12} className={`ml-auto text-muted-foreground transition-transform ${open === t.id ? "rotate-180" : ""}`} />
            </button>
            {open === t.id ? (
              <div className="mt-2 space-y-2">
                <Textarea rows={2} value={t.question} aria-label={`Câu hỏi lượt ${i + 1}`} onChange={e => onChange({ ...c, turns: c.turns.map(x => (x.id === t.id ? { ...x, question: e.target.value } : x)) })} />
                <Textarea rows={2} value={t.expected} aria-label={`Câu trả lời mong đợi lượt ${i + 1}`} onChange={e => onChange({ ...c, turns: c.turns.map(x => (x.id === t.id ? { ...x, expected: e.target.value } : x)) })} />
              </div>
            ) : (
              <div className="mt-1.5 space-y-1 text-xs">
                <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-2.5 py-1.5 text-primary-foreground">{t.question}</p>
                <p className="w-fit max-w-[85%] rounded-lg rounded-bl-sm border bg-background px-2.5 py-1.5">{t.expected}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Màn 3A — Tạo bằng AI (chat left, preview right). */
export default function AiGenerate({ suite, initialKind }: { suite: Suite; initialKind: CaseKind }) {
  const { go } = useTestNav();
  const [kind, setKind] = useState<CaseKind>(initialKind);
  const [draft, setDraft] = useState<DraftCase[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: "sys", role: "system", text: "Đưa tài liệu (SRS/BRD) hoặc mô tả yêu cầu, AI sẽ đề xuất testcase ở khung bên phải." }]);
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<string | null>(null);
  const [countSel, setCountSel] = useState<Count>("auto");
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refining, setRefining] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<CaseKind | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [chat, setChat] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [msgs.length]);
  // Prompt typed on the "Tạo bộ testcase" landing is sent straight away.
  useEffect(() => {
    const p = takePendingPrompt(suite.id);
    if (p) { setCountSel(p.count); send({ text: p.text, file: p.file, count: p.count }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toSuite = () => go("test-sets", { item: suite.id });
  const included = draft.filter(d => d.accepted !== false);
  const turns = included.reduce((n, d) => n + (d.case.kind === "scenario" ? d.case.turns.length : 0), 0);
  const rejected = draft.length - included.length;
  const targets = refining ? (selected.size ? draft.filter(d => selected.has(d.case.id)) : included) : [];

  const send = async (override?: { text: string; file: string | null; count: Count }) => {
    const text = (override?.text ?? input).trim();
    const file = override ? override.file : attached;
    const count = override?.count ?? countSel;
    if ((!text && !file) || busy) return;
    const snapshot = draft;
    const userMsg: Msg = { id: uid("m"), role: "user", text: text || "(Đính kèm tài liệu)", file: file ?? undefined };
    const loading: Msg = { id: uid("m"), role: "loading", text: refining ? "Đang chỉnh sửa testcase..." : file ? "Đang phân tích tài liệu..." : "Đang tạo testcase..." };
    setMsgs(m => [...m, userMsg, loading]);
    setInput(""); setBusy(true);
    const stamp = Date.now();
    try {
      if (refining) {
        const ids = new Set(targets.map(t => t.case.id));
        const updated = await aiRefine(targets.map(t => t.case), text);
        const byId = new Map(updated.map(c => [c.id, c]));
        setDraft(d => d.map(x => (ids.has(x.case.id) ? { ...x, case: byId.get(x.case.id)!, updatedAt: stamp } : x)));
        setMsgs(m => [...m.filter(x => x.id !== loading.id), { id: uid("m"), role: "ai", text: `Đã cập nhật ${updated.length} testcase theo yêu cầu.`, snapshot }]);
        setRefining(false);
      } else {
        const n = count === "auto" ? (Number(text.match(/\b(\d{1,2})\b/)?.[1]) || "auto") : Number(count);
        const cases = await aiGenerate(kind, n, draft.length, file ?? undefined);
        setDraft(d => [...d, ...cases.map(c => ({ case: c, accepted: null, updatedAt: stamp }))]);
        setMsgs(m => [...m.filter(x => x.id !== loading.id), { id: uid("m"), role: "ai", text: `Đã thêm ${cases.length} testcase ${KIND_LABEL[kind]}${file ? ` từ "${file}"` : ""}. Xem và duyệt ở khung bên phải.`, snapshot }]);
      }
      setLastAction(stamp);
      setAttached(null);
    } catch {
      setMsgs(m => [...m.filter(x => x.id !== loading.id), { id: uid("m"), role: "ai", text: "Chưa tạo được testcase. Vui lòng thử lại." }]);
    } finally { setBusy(false); }
  };
  const undo = (msg: Msg) => {
    if (!msg.snapshot) return;
    setDraft(msg.snapshot);
    setLastAction(0);
    setMsgs(m => m.map(x => (x.id === msg.id ? { ...x, undone: true } : x)));
    toast.success("Đã hoàn tác.");
  };
  const patch = (id: string, p: Partial<DraftCase>) => setDraft(d => d.map(x => (x.case.id === id ? { ...x, ...p } : x)));
  const setCase = (c: TestCase) => patch(c.id, { case: c });
  const changeKind = (k: CaseKind) => { if (draft.length) setPendingKind(k); else setKind(k); };
  const save = () => {
    if (!included.length) return;
    testStore.addCases(suite.id, included.map(d => d.case));
    toast.success(`Đã lưu ${included.length} testcase vào "${suite.name}".`);
    toSuite();
  };
  const back = () => (draft.length ? setLeaving(true) : toSuite());

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
        <Crumbs onBack={back} items={[{ label: "Test Suites", onClick: () => go("test-sets") }, { label: suite.name, onClick: back }, { label: "Tạo bằng AI" }]} />
        <KindToggle value={kind} onChange={changeKind} disabled={busy} />
        <Button type="button" className="ml-auto" disabled={!included.length} onClick={save}>Lưu vào Test Suite</Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Chat */}
        <section aria-label="Tạo testcase với AI" className="flex min-h-[420px] flex-col border-b lg:border-b-0 lg:border-r">
          <h2 className="px-4 pt-4 text-sm font-semibold">Tạo testcase với AI</h2>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {msgs.map(m => {
              if (m.role === "system") return <p key={m.id} className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">{m.text}</p>;
              if (m.role === "user") return (
                <div key={m.id} className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {m.file && <span className="mb-1 flex items-center gap-1 text-xs opacity-90"><Icon icon={FileAttachmentIcon} size={12} />{m.file}</span>}
                  {m.text}
                </div>
              );
              if (m.role === "loading") return (
                <div key={m.id} className="flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground" role="status">
                  <span className="flex gap-0.5" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />)}</span>
                  {m.text}
                </div>
              );
              return (
                <div key={m.id} className="w-fit max-w-[90%] rounded-lg rounded-bl-sm border px-3 py-2 text-sm">
                  <p className={m.undone ? "text-muted-foreground line-through" : ""}>{m.text}</p>
                  {m.snapshot && (m.undone
                    ? <p className="mt-1 text-xs text-muted-foreground">Đã hoàn tác</p>
                    : <button type="button" onClick={() => undo(m)} className="mt-1 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Icon icon={Undo02Icon} size={12} />Hoàn tác</button>)}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="sticky bottom-0 border-t bg-background p-3">
            {refining && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs text-primary">
                <span className="inline-flex items-center gap-1"><Icon icon={SparklesIcon} size={12} />Refine {targets.length} testcase {selected.size ? "đã chọn" : "trong bản nháp"}</span>
                <button type="button" className="font-medium hover:underline" onClick={() => setRefining(false)}>Huỷ</button>
              </div>
            )}
            {attached && (
              <div className="mb-2 flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                <Icon icon={FileAttachmentIcon} size={12} />{attached}
                <button type="button" aria-label="Bỏ tệp đính kèm" onClick={() => setAttached(null)} className="text-muted-foreground hover:text-foreground"><Icon icon={Cancel01Icon} size={12} /></button>
              </div>
            )}
            <div className="overflow-hidden rounded-lg border bg-background transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
              <Textarea ref={inputRef} rows={2} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={refining ? "Muốn chỉnh testcase thế nào? VD: thêm số hotline vào câu trả lời" : "Mô tả testcase bạn muốn tạo, hoặc đính kèm tài liệu..."}
                aria-label="Nội dung gửi AI" className="resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Đính kèm file" onClick={() => fileRef.current?.click()}><Icon icon={Add01Icon} /></Button>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.md,.xlsx" aria-label="Chọn tài liệu" onChange={e => { const f = e.target.files?.[0]; if (f) setAttached(f.name); e.target.value = ""; }} />
                {!refining && (
                  <Select value={countSel} onValueChange={v => setCountSel(v as Count)}>
                    <SelectTrigger className="h-8 w-auto gap-1 text-xs" aria-label="Số lượng testcase"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Số lượng: Tự động</SelectItem>
                      <SelectItem value="5">Số lượng: 5</SelectItem>
                      <SelectItem value="10">Số lượng: 10</SelectItem>
                      <SelectItem value="20">Số lượng: 20</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Button type="button" size="icon" className="ml-auto h-8 w-8" aria-label="Gửi" disabled={busy || (!input.trim() && !attached) || (refining && !targets.length)} onClick={() => send()}><Icon icon={SentIcon} /></Button>
              </div>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section aria-label="Preview testcase" className="flex min-h-0 flex-col">
          <Tabs defaultValue="list" className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
              <TabsList className={SEG_LIST}>
                <TabsTrigger value="list" className={SEG_TRIGGER}>Danh sách</TabsTrigger>
                <TabsTrigger value="md" className={SEG_TRIGGER}>Markdown</TabsTrigger>
              </TabsList>
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!draft.length || busy} onClick={() => { setRefining(true); inputRef.current?.focus(); }}><Icon icon={SparklesIcon} /> Refine with AI</Button>
                <Button type="button" variant="outline" size="sm" disabled={!draft.length} onClick={() => setChat(true)}><Icon icon={BubbleChatIcon} /> Chat to test</Button>
              </div>
            </div>
            <TabsContent value="list" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {draft.length === 0 ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                  <Icon icon={SparklesIcon} size={24} className="mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Chưa có testcase {KIND_LABEL[kind]}</p>
                  <p className="mt-0.5 max-w-xs text-sm text-muted-foreground">Mô tả yêu cầu hoặc đính kèm tài liệu ở khung chat để AI đề xuất.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.map((d, i) => (
                    <CardShell key={d.case.id} d={d} index={i} fresh={!!lastAction && d.updatedAt === lastAction}
                      selected={selected.has(d.case.id)} onSelect={v => setSelected(s => { const n = new Set(s); if (v) n.add(d.case.id); else n.delete(d.case.id); return n; })}
                      onAccept={v => patch(d.case.id, { accepted: v })}
                      onEdit={d.case.kind === "qna" ? () => setEditing(editing === d.case.id ? null : d.case.id) : undefined} editing={editing === d.case.id}>
                      {d.case.kind === "qna"
                        ? (editing === d.case.id ? <QnaEditor c={d.case} onChange={setCase} /> : <QnaView c={d.case} />)
                        : <ScenarioView c={d.case} onChange={setCase} />}
                    </CardShell>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="md" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-xs leading-relaxed">{draft.length ? toMarkdown(included.map(d => d.case)) : "Chưa có testcase."}</pre>
            </TabsContent>
          </Tabs>
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-background px-6 py-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {kind === "qna" ? `${included.length} testcase` : `${included.length} kịch bản · ${turns} lượt`}{rejected ? ` · ${rejected} đã loại` : ""}
            </p>
            <Button type="button" disabled={!included.length} onClick={save}>Lưu vào Test Suite</Button>
          </div>
        </section>
      </div>

      <AlertDialog open={!!pendingKind} onOpenChange={o => { if (!o) setPendingKind(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi loại testcase?</AlertDialogTitle>
            <AlertDialogDescription>Đổi loại sẽ xoá {draft.length} testcase đang có ở bản nháp này. Tiếp tục?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setKind(pendingKind!); setDraft([]); setSelected(new Set()); setRefining(false); setPendingKind(null); }}>Đổi loại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ bản nháp?</AlertDialogTitle>
            <AlertDialogDescription>{draft.length} testcase chưa lưu vào Test Suite sẽ mất.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={toSuite}>Bỏ bản nháp</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {chat && <ChatToTest cases={included.map(d => d.case)} onClose={() => setChat(false)} />}
    </div>
  );
}

/** Quick manual check against the Agent with a draft question. */
function ChatToTest({ cases, onClose }: { cases: TestCase[]; onClose: () => void }) {
  const first = cases[0];
  const firstQ = first ? (first.kind === "qna" ? first.question : first.turns[0]?.question ?? "") : "";
  const [msgs, setMsgs] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [input, setInput] = useState(firstQ);
  const send = () => {
    const q = input.trim();
    if (!q) return;
    const hit = cases.flatMap(c => (c.kind === "qna" ? [{ q: c.question, a: c.expected }] : c.turns.map(t => ({ q: t.question, a: t.expected })))).find(x => x.q === q);
    setMsgs(m => [...m, { role: "user", text: q }, { role: "agent", text: hit ? `Dạ, ${hit.a.charAt(0).toLowerCase()}${hit.a.slice(1)}` : "Dạ, tôi đã ghi nhận câu hỏi. Anh/chị vui lòng cho biết thêm chi tiết để tôi hỗ trợ chính xác hơn." }]);
    setInput("");
  };
  return (
    <Sheet open onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b px-5 pb-3 pt-5 text-left">
          <SheetTitle>Chat to test</SheetTitle>
          <SheetDescription>Hỏi thử Agent bằng câu hỏi trong bản nháp. Không lưu vào Test Suite.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {msgs.length === 0 && <p className="text-sm text-muted-foreground">Gửi câu hỏi để xem Agent trả lời.</p>}
          {msgs.map((m, i) => (
            <p key={i} className={`w-fit max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-auto rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border"}`}>{m.text}</p>
          ))}
        </div>
        <form className="flex gap-2 border-t p-3" onSubmit={e => { e.preventDefault(); send(); }}>
          <Textarea rows={1} value={input} onChange={e => setInput(e.target.value)} aria-label="Câu hỏi" className="min-h-9 resize-none"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <Button type="submit" size="icon" aria-label="Gửi" disabled={!input.trim()}><Icon icon={SentIcon} /></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
