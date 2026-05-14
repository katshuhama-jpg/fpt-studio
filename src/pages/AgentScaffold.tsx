import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Send, Wand2, Check, RefreshCw, Pencil,
  Cog, BookOpen, Wrench, ListChecks, MessageSquareText, ArrowRight,
  Loader2, Plus, X,
} from "lucide-react";

type Stage = "prompt" | "generating" | "draft";

type Draft = {
  name: string;
  emoji: string;
  description: string;
  persona: string;
  systemPrompt: string;
  knowledge: { name: string; type: string }[];
  tools: { name: string; reason: string }[];
  tasks: { name: string; type: "QnA" | "Workflow" }[];
  openingQuestions: string[];
};

const sampleDraft = (prompt: string): Draft => ({
  name: "Customer Care Agent",
  emoji: "🏦",
  description: "A 24/7 banking customer-care agent that resolves common requests, looks up products and books human consultations.",
  persona:
    "You are Ada, a senior customer-care specialist at ABC Bank. You are calm, precise and empathetic. You always verify identity before performing sensitive operations and escalate complex cases to a human banker.",
  systemPrompt:
    "Operate 24/7. Answer in the user's language. Use tools when factual lookup is needed. Never give legal or investment advice. Refuse to discuss competitor banks. End every reply with a clear next step.",
  knowledge: [
    { name: "ABC Bank product brochure", type: "PDF" },
    { name: "Customer FAQ", type: "FAQ" },
    { name: "abcbank.com/products", type: "Web" },
  ],
  tools: [
    { name: "verify_customer", reason: "Required before any sensitive action." },
    { name: "lock_card", reason: "Frequent ask in your prompt." },
    { name: "book_consultation", reason: "For escalations to humans." },
  ],
  tasks: [
    { name: "Lookup product information", type: "QnA" },
    { name: "Lock credit card", type: "Workflow" },
    { name: "Schedule consultation", type: "Workflow" },
  ],
  openingQuestions: [
    "What products do you offer?",
    "How do I lock my card?",
    "Book a consultation with a banker",
  ],
});

const stepsList = [
  "Analysing your prompt",
  "Drafting persona & guidelines",
  "Suggesting knowledge sources",
  "Picking tools & tasks",
  "Composing opening questions",
];

export default function AgentScaffold() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initial = params.get("prompt") ?? "";
  const [prompt, setPrompt] = useState(initial);
  const [stage, setStage] = useState<Stage>(initial ? "generating" : "prompt");
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);

  // Fake "AI generation" progress
  useEffect(() => {
    if (stage !== "generating") return;
    setStepIdx(0);
    const t = setInterval(() => {
      setStepIdx(i => {
        if (i >= stepsList.length - 1) {
          clearInterval(t);
          setTimeout(() => {
            setDraft(sampleDraft(prompt));
            setStage("draft");
          }, 350);
          return i;
        }
        return i + 1;
      });
    }, 600);
    return () => clearInterval(t);
  }, [stage, prompt]);

  const generate = () => {
    if (!prompt.trim()) return;
    setStage("generating");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base"
        >
          <ArrowLeft size={15} /> Cancel
        </button>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <Sparkles size={14} className="text-primary" />
          <span className="font-semibold">Create agent from prompt</span>
          <span className="chip chip-primary">AI scaffolder</span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className={stage !== "prompt" ? "text-foreground font-medium" : ""}>1. Describe</span>
          <ArrowRight size={11} />
          <span className={stage === "generating" ? "text-foreground font-medium" : ""}>2. Generate</span>
          <ArrowRight size={11} />
          <span className={stage === "draft" ? "text-foreground font-medium" : ""}>3. Review</span>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto bg-gradient-soft">
        {stage === "prompt" && <PromptStage prompt={prompt} setPrompt={setPrompt} onGenerate={generate} />}
        {stage === "generating" && <GeneratingStage prompt={prompt} stepIdx={stepIdx} />}
        {stage === "draft" && draft && (
          <DraftStage
            draft={draft}
            setDraft={setDraft}
            onRegenerate={() => setStage("generating")}
            onOpen={() => navigate("/agents/cskh")}
            onEditPrompt={() => setStage("prompt")}
          />
        )}
      </main>
    </div>
  );
}

/* ============ Stage 1: prompt ============ */
function PromptStage({
  prompt, setPrompt, onGenerate,
}: { prompt: string; setPrompt: (s: string) => void; onGenerate: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 animate-fade-up">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-brand flex items-center justify-center shadow-elev mb-4">
          <Wand2 size={22} className="text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
          Describe the agent you want
        </h1>
        <p className="text-sm text-muted-foreground">
          One paragraph is enough. We will draft a persona, suggest knowledge, tools and tasks for you.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-elev focus-within:border-primary focus-within:ring-glow transition-base p-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={6}
          placeholder="e.g. A customer-support agent for ABC Bank that helps customers 24/7 with product questions, lost-card lockdowns, loan rates, and books human consultations when issues are complex."
          className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground outline-none px-3 py-2.5"
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="text-[10px] text-muted-foreground">
            Tip: include audience, tone, top 3 things the agent must do.
          </div>
          <button
            onClick={onGenerate}
            disabled={!prompt.trim()}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1.5 shadow-soft transition-base"
          >
            <Sparkles size={13} /> Generate scaffold <Send size={11} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
          Or try one of these
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "24/7 banking customer-care agent that can lock cards and book consultations",
            "HR onboarding assistant that answers policy questions from the employee handbook",
            "E-commerce sales agent that helps shoppers find products and tracks orders",
            "Internal knowledge bot that searches our SharePoint and Confluence",
          ].map(s => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border hover:border-primary/30 hover:bg-primary-soft/40 hover:text-primary text-muted-foreground transition-base"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ Stage 2: generating ============ */
function GeneratingStage({ prompt, stepIdx }: { prompt: string; stepIdx: number }) {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 animate-fade-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-brand flex items-center justify-center shadow-elev mb-4 animate-pulse-soft">
          <Sparkles size={22} className="text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-semibold mb-1">Building your agent…</h2>
        <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 mb-4">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
          Your prompt
        </div>
        <p className="text-sm text-foreground line-clamp-3">{prompt}</p>
      </div>

      <ol className="space-y-2.5">
        {stepsList.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <li key={s} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-base ${
                  done ? "bg-success/15 text-success" : active ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted-foreground"
                }`}
              >
                {done ? <Check size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : <span className="text-[10px] font-mono">{i + 1}</span>}
              </div>
              <span className={`text-sm ${active ? "font-medium text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ============ Stage 3: review draft ============ */
function DraftStage({
  draft, setDraft, onRegenerate, onOpen, onEditPrompt,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onRegenerate: () => void;
  onOpen: () => void;
  onEditPrompt: () => void;
}) {
  const [refineOpen, setRefineOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-up">
      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-surface shadow-soft p-6 mb-6 flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary-soft flex items-center justify-center text-2xl shrink-0">
          {draft.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <input
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="font-display text-xl font-semibold bg-transparent outline-none flex-1 min-w-0 focus:bg-surface-muted rounded px-1 -mx-1"
            />
            <span className="chip chip-success"><Check size={10} /> Draft ready</span>
          </div>
          <textarea
            value={draft.description}
            onChange={e => setDraft({ ...draft, description: e.target.value })}
            rows={2}
            className="w-full text-sm text-muted-foreground bg-transparent outline-none resize-none focus:bg-surface-muted rounded px-1 -mx-1"
          />
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={onOpen} className="btn-primary h-9">
            Open in builder <ArrowRight size={13} />
          </button>
          <button onClick={() => setRefineOpen(true)} className="h-9 px-3 rounded-lg border border-primary/30 bg-primary-soft text-primary hover:bg-primary-soft/70 text-xs font-medium flex items-center gap-1.5 justify-center transition-base">
            <Sparkles size={12} /> Refine with AI
          </button>
          <button onClick={onRegenerate} className="h-8 px-3 rounded-lg hover:bg-surface-muted text-xs text-muted-foreground flex items-center gap-1.5 justify-center transition-base">
            <RefreshCw size={11} /> Regenerate
          </button>
          <button onClick={onEditPrompt} className="h-8 px-3 rounded-lg hover:bg-surface-muted text-xs text-muted-foreground flex items-center gap-1.5 justify-center transition-base">
            <Pencil size={11} /> Edit prompt
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Persona */}
        <DraftCard icon={Cog} title="Persona & guideline" badge="Generated" className="lg:col-span-2">
          <Field label="Persona">
            <textarea
              value={draft.persona}
              onChange={e => setDraft({ ...draft, persona: e.target.value })}
              rows={3}
              className="ds-textarea text-xs"
            />
          </Field>
          <Field label="System prompt">
            <textarea
              value={draft.systemPrompt}
              onChange={e => setDraft({ ...draft, systemPrompt: e.target.value })}
              rows={4}
              className="ds-textarea text-xs"
            />
          </Field>
        </DraftCard>

        {/* Opening questions */}
        <DraftCard icon={MessageSquareText} title="Opening questions" badge="Suggested">
          <div className="space-y-1.5">
            {draft.openingQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted text-xs">
                <span className="font-mono text-muted-foreground">#{i + 1}</span>
                <span className="flex-1">{q}</span>
              </div>
            ))}
          </div>
        </DraftCard>

        {/* Knowledge */}
        <DraftCard icon={BookOpen} title="Knowledge" badge={`${draft.knowledge.length} suggestions`}>
          <ul className="space-y-1.5">
            {draft.knowledge.map(k => (
              <li key={k.name} className="flex items-center gap-2 text-xs">
                <Check size={12} className="text-success" />
                <span className="flex-1 truncate">{k.name}</span>
                <span className="chip text-[10px]">{k.type}</span>
              </li>
            ))}
            <li className="text-xs text-muted-foreground italic px-1 pt-1">
              You'll connect these in the next step.
            </li>
          </ul>
        </DraftCard>

        {/* Tools */}
        <DraftCard icon={Wrench} title="Tools" badge={`${draft.tools.length} suggestions`}>
          <ul className="space-y-2">
            {draft.tools.map(t => (
              <li key={t.name} className="text-xs">
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-success" />
                  <code className="font-mono font-medium">{t.name}</code>
                </div>
                <div className="text-[11px] text-muted-foreground pl-5 mt-0.5">{t.reason}</div>
              </li>
            ))}
          </ul>
        </DraftCard>

        {/* Tasks */}
        <DraftCard icon={Workflow} title="Tasks" badge={`${draft.tasks.length} drafted`}>
          <ul className="space-y-1.5">
            {draft.tasks.map(t => (
              <li key={t.name} className="flex items-center gap-2 text-xs">
                <Check size={12} className="text-success" />
                <span className="flex-1 truncate">{t.name}</span>
                <span className={`chip text-[10px] ${t.type === "Workflow" ? "chip-accent" : "chip-primary"}`}>{t.type}</span>
              </li>
            ))}
          </ul>
        </DraftCard>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-dashed border-border bg-surface/60 px-5 py-4">
        <div>
          <div className="text-sm font-medium">Happy with the draft?</div>
          <div className="text-xs text-muted-foreground">You can keep refining inside the builder using AI or by hand.</div>
        </div>
        <button onClick={onOpen} className="btn-primary h-10 px-5">
          Open in builder <ArrowRight size={14} />
        </button>
      </div>

      {refineOpen && <RefineSheet onClose={() => setRefineOpen(false)} />}
    </div>
  );
}

function DraftCard({
  icon: Icon, title, badge, children, className = "",
}: { icon: any; title: string; badge?: string; children: any; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 ${className}`}>
      <header className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center">
          <Icon size={13} />
        </div>
        <h3 className="font-display font-semibold text-sm flex-1">{title}</h3>
        {badge && <span className="chip text-[10px]">{badge}</span>}
      </header>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/* Refine bottom-sheet on the draft (chat-to-edit while in scaffold) */
function RefineSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/20 animate-fade-up" onClick={onClose}>
      <div
        className="w-full max-w-2xl mb-6 mx-4 bg-surface border border-border rounded-2xl shadow-pop p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-primary" />
          <div className="font-semibold text-sm">Refine the draft</div>
          <button onClick={onClose} className="ml-auto h-7 w-7 rounded-md hover:bg-surface-muted text-muted-foreground flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {["Make tone more formal", "Add VIP customer flow", "Drop the consultation booking", "Rewrite opening questions in Vietnamese"].map(s => (
            <button key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-surface-muted hover:bg-primary-soft hover:text-primary transition-base">
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface focus-within:border-primary focus-within:ring-glow p-1.5">
          <textarea rows={2} placeholder="Tell AI what to change in the draft…" className="flex-1 resize-none bg-transparent text-sm outline-none px-2 py-1.5" />
          <button className="h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5">
            <Send size={12} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
