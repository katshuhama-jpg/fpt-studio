import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, CheckCircle2, HelpCircle, GitCompare, ArrowRight, Plus, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ToolNode, ToolEdge } from "@/components/tool-builder/types";
import {
  parseIntent, needsClarification, buildProposal, applyProposal,
  type Proposal, type ClarifyQ,
} from "./assistantEngine";

interface Props {
  open: boolean;
  onClose: () => void;
  nodes: ToolNode[];
  edges: ToolEdge[];
  setGraph: (next: { nodes: ToolNode[]; edges: ToolEdge[] }) => void;
}

type Msg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "ai"; kind: "text"; text: string }
  | { id: string; role: "ai"; kind: "thinking" }
  | { id: string; role: "ai"; kind: "clarify"; questions: ClarifyQ[]; answers: Record<string, string>; submitted: boolean; originalPrompt: string }
  | { id: string; role: "ai"; kind: "proposal"; proposal: Proposal; applied: boolean };

let uid = 0;
const nid = () => `m-${++uid}-${Date.now()}`;

export default function AssistantPanel({ open, onClose, nodes, edges, setGraph }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: nid(), role: "ai", kind: "text", text: "Hi! I can add nodes, fix issues, or trace a run. Try “add a Knowledge Retrieval before LLM” or “why is the answer empty?”." },
  ]);
  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const push = (m: Msg) => setMsgs(prev => [...prev, m]);
  const replace = (id: string, m: Msg) => setMsgs(prev => prev.map(x => x.id === id ? m : x));
  const remove = (id: string) => setMsgs(prev => prev.filter(x => x.id !== id));

  const startThinking = () => {
    const t: Msg = { id: nid(), role: "ai", kind: "thinking" };
    push(t);
    return t.id;
  };

  const submit = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    push({ id: nid(), role: "user", text });
    setInput("");
    setShowMentions(false);

    const thinkId = startThinking();
    setTimeout(() => {
      const clarify = needsClarification(text, { nodes, edges });
      if (clarify && clarify.length > 0) {
        replace(thinkId, {
          id: thinkId, role: "ai", kind: "clarify",
          questions: clarify, answers: {}, submitted: false, originalPrompt: text,
        });
        return;
      }
      const proposal = buildProposal(text, { nodes, edges });
      replace(thinkId, { id: thinkId, role: "ai", kind: "proposal", proposal, applied: false });
    }, 500);
  };

  const resumeAfterClarify = (msgId: string, prompt: string, answers: Record<string, string>) => {
    const merged = `${prompt}\n\nContext:\n${Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
    const thinkId = startThinking();
    setTimeout(() => {
      const proposal = buildProposal(merged, { nodes, edges }, parseIntent(prompt));
      replace(thinkId, { id: thinkId, role: "ai", kind: "proposal", proposal, applied: false });
    }, 400);
  };

  const apply = (msgId: string, proposal: Proposal) => {
    const next = applyProposal({ nodes, edges }, proposal);
    setGraph(next);
    setMsgs(prev => prev.map(x => x.id === msgId && x.kind === "proposal" ? { ...x, applied: true } : x));
    toast.success("Changes applied to canvas");
  };

  const onInputChange = (v: string) => {
    setInput(v);
    const last = v.slice(-1);
    if (last === "/" || last === "@") setShowMentions(true);
    else if (!v.match(/[/@]\w*$/)) setShowMentions(false);
  };

  const insertMention = (label: string) => {
    setInput(v => v.replace(/[/@]\w*$/, `@${label} `));
    setShowMentions(false);
  };

  if (!open) return null;

  return (
    <aside className="w-[420px] border-l border-border bg-surface flex flex-col shrink-0 h-full">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center"><Sparkles size={13} /></div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">Assistant</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Prompt → task</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.map(m => <MsgView key={m.id} m={m}
          onAnswer={(qid, val) => setMsgs(prev => prev.map(x =>
            x.id === m.id && x.kind === "clarify" ? { ...x, answers: { ...x.answers, [qid]: val } } : x))}
          onContinue={() => {
            if (m.kind !== "clarify") return;
            setMsgs(prev => prev.map(x => x.id === m.id && x.kind === "clarify" ? { ...x, submitted: true } : x));
            resumeAfterClarify(m.id, m.originalPrompt, m.answers);
          }}
          onApply={() => m.kind === "proposal" && apply(m.id, m.proposal)}
          onDiscard={() => remove(m.id)}
        />)}
      </div>

      <div className="border-t border-border p-3 relative">
        {showMentions && (
          <div className="absolute bottom-full mb-1 left-3 right-3 max-h-40 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg p-1 z-10">
            {nodes.map(n => (
              <button key={n.id} onClick={() => insertMention(n.data.label || n.id)}
                className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-surface-muted">
                <span className="font-mono">@{n.data.label || n.id}</span>
                <span className="text-muted-foreground ml-2">{n.data.kind}</span>
              </button>
            ))}
            {nodes.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No nodes to mention</div>}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder='Ask in natural language — type "/" or "@" to mention a node'
            className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary resize-none"
          />
          <button onClick={() => submit()} disabled={!input.trim()}
            className="btn-primary h-9 px-3 disabled:opacity-50"><Send size={13} /></button>
        </div>
      </div>
    </aside>
  );
}

function MsgView({ m, onAnswer, onContinue, onApply, onDiscard }: {
  m: Msg;
  onAnswer: (qid: string, val: string) => void;
  onContinue: () => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm whitespace-pre-wrap">{m.text}</div>
      </div>
    );
  }
  if (m.kind === "text") {
    return <div className="max-w-[90%] px-3 py-2 rounded-2xl rounded-bl-sm bg-surface-muted text-sm">{m.text}</div>;
  }
  if (m.kind === "thinking") {
    return (
      <div className="max-w-[60%] px-3 py-2 rounded-2xl rounded-bl-sm bg-surface-muted text-sm text-muted-foreground inline-flex items-center gap-1">
        <span className="animate-pulse">●</span><span className="animate-pulse delay-150">●</span><span className="animate-pulse delay-300">●</span>
      </div>
    );
  }
  if (m.kind === "clarify") {
    const allAnswered = m.questions.every(q => m.answers[q.id]);
    return (
      <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <HelpCircle size={13} className="text-primary" /> A few quick questions
        </div>
        {m.questions.map(q => (
          <div key={q.id}>
            <div className="text-xs font-medium mb-1.5">{q.question}</div>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map(o => (
                <button key={o} disabled={m.submitted}
                  onClick={() => onAnswer(q.id, o)}
                  className={`px-2.5 h-7 rounded-full text-[11px] border transition-base ${
                    m.answers[q.id] === o ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border hover:border-primary/40"
                  } disabled:opacity-60`}>
                  {o}
                </button>
              ))}
            </div>
            <input
              disabled={m.submitted}
              placeholder="Other…"
              value={q.options.includes(m.answers[q.id]) ? "" : (m.answers[q.id] || "")}
              onChange={e => onAnswer(q.id, e.target.value)}
              className="mt-1.5 w-full h-7 px-2 rounded-md border border-border bg-surface text-xs outline-none focus:border-primary disabled:opacity-60"
            />
          </div>
        ))}
        {!m.submitted ? (
          <button disabled={!allAnswered} onClick={onContinue}
            className="w-full h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
            Continue
          </button>
        ) : (
          <div className="text-[11px] text-muted-foreground italic flex items-center gap-1"><CheckCircle2 size={11} className="text-accent" /> Answers submitted</div>
        )}
      </div>
    );
  }
  // proposal
  const p = m.proposal;
  const Icon = p.intent === "trace" ? GitCompare : Sparkles;
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-1.5 bg-primary-soft/50 border-b border-border">
        <Icon size={13} className="text-primary" />
        <span className="text-xs font-semibold">{p.summary}</span>
      </div>
      <div className="p-3 space-y-1.5">
        {p.ops.map((op, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
              op.type === "add" ? "bg-accent-soft text-accent" :
              op.type === "edit" ? "bg-warning-soft text-warning" :
              "bg-destructive-soft text-destructive"
            }`}>
              {op.type === "add" ? <Plus size={10} /> : op.type === "edit" ? <PencilLine size={10} /> : <Trash2 size={10} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{op.label}</div>
              {op.detail && <div className="text-muted-foreground text-[11px]">{op.detail}</div>}
            </div>
          </div>
        ))}
        {p.trace && p.trace.length > 0 && (
          <ol className="space-y-1.5">
            {p.trace.map((t, i) => (
              <li key={t.nodeId} className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  <span className="font-medium">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{t.ms}ms{t.branch ? ` · ${t.branch}` : ""}</span>
                </div>
                <div className="ml-5 mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="font-mono">in:</span> <code className="truncate">{JSON.stringify(t.input)}</code>
                </div>
                <div className="ml-5 text-[11px] text-muted-foreground flex items-center gap-1">
                  <ArrowRight size={9} /><span className="font-mono">out:</span> <code className="truncate">{JSON.stringify(t.output)}</code>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      {p.ops.length > 0 && (
        <div className="px-3 py-2 border-t border-border bg-surface-muted flex items-center justify-end gap-2">
          {m.applied ? (
            <span className="text-[11px] text-accent flex items-center gap-1"><CheckCircle2 size={11} /> Applied</span>
          ) : (
            <>
              <button onClick={onDiscard} className="h-7 px-3 rounded-md border border-border text-xs hover:bg-surface">Discard</button>
              <button onClick={onApply} className="btn-primary h-7 px-3 text-xs">Apply</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
