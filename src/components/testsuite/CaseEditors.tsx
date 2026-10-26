import { useState } from "react";
import { Add01Icon, Delete02Icon, DragDropVerticalIcon, ArrowUp01Icon, ArrowDown01Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { newTurn, type QnaCase, type ScenarioCase, type Turn } from "./testSuiteStore";
import { Icon } from "./parts";

const label = "text-xs font-medium text-muted-foreground";

function Extra({ c, onChange, idp }: { c: { topic: string; reference: string }; onChange: (p: { topic?: string; reference?: string }) => void; idp: string }) {
  const [open, setOpen] = useState(!!(c.topic || c.reference));
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Icon icon={ArrowDown01Icon} size={14} className={`transition-transform ${open ? "" : "-rotate-90"}`} /> Topic & tham chiếu {!open && (c.topic || c.reference) ? `· ${[c.topic, c.reference].filter(Boolean).join(" · ")}` : ""}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 grid gap-2 sm:grid-cols-2">
        <div><label htmlFor={`${idp}-topic`} className={label}>Topic</label><Input id={`${idp}-topic`} value={c.topic} onChange={e => onChange({ topic: e.target.value })} placeholder="VD: Phí dịch vụ" className="mt-1 h-8" /></div>
        <div><label htmlFor={`${idp}-ref`} className={label}>Tên văn bản tham chiếu</label><Input id={`${idp}-ref`} value={c.reference} onChange={e => onChange({ reference: e.target.value })} placeholder="VD: Biểu phí 2026.pdf" className="mt-1 h-8" /></div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function QnaEditor({ c, onChange, errors, idp = c.id }: { c: QnaCase; onChange: (c: QnaCase) => void; errors?: { question?: string; expected?: string }; idp?: string }) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idp}-q`} className={label}>Câu hỏi <span className="text-destructive">*</span></label>
        <Textarea id={`${idp}-q`} rows={2} value={c.question} onChange={e => onChange({ ...c, question: e.target.value })} placeholder="Người dùng hỏi gì?" className="mt-1" aria-invalid={!!errors?.question} />
        {errors?.question && <p className="mt-1 text-xs text-destructive" role="alert">{errors.question}</p>}
      </div>
      <div>
        <label htmlFor={`${idp}-a`} className={label}>Câu trả lời mong đợi <span className="text-destructive">*</span></label>
        <Textarea id={`${idp}-a`} rows={2} value={c.expected} onChange={e => onChange({ ...c, expected: e.target.value })} placeholder="Agent cần trả lời thế nào?" className="mt-1" aria-invalid={!!errors?.expected} />
        {errors?.expected && <p className="mt-1 text-xs text-destructive" role="alert">{errors.expected}</p>}
      </div>
      <Extra c={c} idp={idp} onChange={p => onChange({ ...c, ...p })} />
    </div>
  );
}

/** Turns list: drag handle (⠿) plus ▲▼ for touch/keyboard, trash per turn, warning under 2 turns. */
export function ScenarioEditor({ c, onChange, showErrors, idp = c.id }: { c: ScenarioCase; onChange: (c: ScenarioCase) => void; showErrors?: boolean; idp?: string }) {
  const [drag, setDrag] = useState<number | null>(null);
  const setTurns = (turns: Turn[]) => onChange({ ...c, turns });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= c.turns.length || from === to) return;
    const t = [...c.turns]; const [x] = t.splice(from, 1); t.splice(to, 0, x); setTurns(t);
  };
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idp}-name`} className={label}>Tên kịch bản</label>
        <Input id={`${idp}-name`} value={c.name} onChange={e => onChange({ ...c, name: e.target.value })} placeholder="VD: Đổi hạn mức thẻ" className="mt-1 h-8" />
      </div>
      <ol className="space-y-2">
        {c.turns.map((t, i) => (
          <li key={t.id} draggable onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }} onDragEnd={() => setDrag(null)}
            className={`flex gap-2 rounded-md border bg-background p-2.5 ${drag === i ? "opacity-50" : ""}`}>
            <div className="flex flex-col items-center gap-0.5 pt-0.5">
              <span className="cursor-grab text-muted-foreground" title="Kéo để sắp xếp" aria-hidden="true"><Icon icon={DragDropVerticalIcon} /></span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Đưa lượt ${i + 1} lên`}><Icon icon={ArrowUp01Icon} size={14} /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === c.turns.length - 1} onClick={() => move(i, i + 1)} aria-label={`Đưa lượt ${i + 1} xuống`}><Icon icon={ArrowDown01Icon} size={14} /></Button>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-semibold">Lượt {i + 1}</p>
              <Textarea rows={2} value={t.question} onChange={e => setTurns(c.turns.map(x => (x.id === t.id ? { ...x, question: e.target.value } : x)))} placeholder="Câu hỏi của người dùng" aria-label={`Câu hỏi lượt ${i + 1}`} aria-invalid={showErrors && !t.question.trim()} />
              <Textarea rows={2} value={t.expected} onChange={e => setTurns(c.turns.map(x => (x.id === t.id ? { ...x, expected: e.target.value } : x)))} placeholder="Câu trả lời mong đợi" aria-label={`Câu trả lời mong đợi lượt ${i + 1}`} aria-invalid={showErrors && !t.expected.trim()} />
              {showErrors && (!t.question.trim() || !t.expected.trim()) && <p className="text-xs text-destructive" role="alert">Vui lòng nhập câu hỏi và câu trả lời mong đợi cho lượt {i + 1}.</p>}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setTurns(c.turns.filter(x => x.id !== t.id))} aria-label={`Xoá lượt ${i + 1}`}><Icon icon={Delete02Icon} /></Button>
          </li>
        ))}
      </ol>
      {c.turns.length < 2 && (
        <p className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs"><Icon icon={Alert02Icon} size={14} className="text-warning" /> Kịch bản cần ít nhất 2 lượt hỏi-đáp.</p>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => setTurns([...c.turns, newTurn()])}><Icon icon={Add01Icon} /> Thêm lượt</Button>
      <Extra c={c} idp={idp} onChange={p => onChange({ ...c, ...p })} />
    </div>
  );
}

export const qnaErrors = (c: QnaCase) => ({
  question: c.question.trim() ? undefined : "Vui lòng nhập Câu hỏi.",
  expected: c.expected.trim() ? undefined : "Vui lòng nhập Câu trả lời mong đợi.",
});
export const scenarioValid = (c: ScenarioCase) => c.turns.length >= 2 && c.turns.every(t => t.question.trim() && t.expected.trim());
