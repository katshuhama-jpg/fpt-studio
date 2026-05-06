import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ChevronLeft, Save, Play, History, Wrench, BookOpen, Plus, Trash2, ChevronDown,
  ArrowRight, Code2, GitBranch, MessageSquare, FileText, Sparkles,
} from "lucide-react";
import { useState } from "react";

export default function TaskEditor() {
  const { id = "cskh", taskId = "lock-card" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"design" | "preview" | "logs">("design");

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar with breadcrumbs */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-3 shrink-0">
        <button
          onClick={() => navigate(`/agents/${id}?tab=develop&section=task`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base"
        >
          <ChevronLeft size={15} /> Back to agent
        </button>
        <div className="w-px h-5 bg-border" />
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <Link to="/agents" className="text-muted-foreground hover:text-foreground">Agents</Link>
          <span className="text-muted-foreground">/</span>
          <Link to={`/agents/${id}`} className="text-muted-foreground hover:text-foreground truncate max-w-[180px]">
            Banking ABC
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">Tasks</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground truncate">Lock credit card</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost h-9">
            <History size={13} /> v3 · History
          </button>
          <button className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base">
            <Play size={13} /> Test run
          </button>
          <button className="btn-primary h-9">
            <Save size={13} /> Save changes
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-border bg-surface px-5 flex items-center gap-1 shrink-0">
        {(["design", "preview", "logs"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative h-10 px-4 text-sm font-medium capitalize transition-base ${
              tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* Body — wide canvas, no preview panel: Tasks deserve full width */}
      <div className="flex-1 overflow-y-auto bg-gradient-soft">
        <div className="max-w-5xl mx-auto p-8 space-y-5 animate-fade-up">
          {/* Header card */}
          <div className="surface-card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <GitBranch size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  defaultValue="Lock credit card"
                  className="w-full bg-transparent font-display text-xl font-semibold tracking-tight focus:outline-none"
                />
                <textarea
                  defaultValue="Verify customer identity, then call the lock_card_api tool to lock the user's card. Confirm with the customer."
                  className="w-full bg-transparent text-sm text-muted-foreground mt-1 resize-none focus:outline-none"
                  rows={2}
                />
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="chip chip-primary">Workflow</span>
                <span className="text-[10px] text-muted-foreground">Updated 2 min ago</span>
              </div>
            </div>

            {/* Inputs */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="When to trigger">
                <button className="ds-input flex items-center justify-between cursor-pointer text-left">
                  <span>User asks to lock or block their card</span>
                  <ChevronDown size={14} />
                </button>
              </Field>
              <Field label="Required input">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="chip chip-primary">phone_number</span>
                  <span className="chip">card_last4</span>
                  <button className="btn-ghost text-xs"><Plus size={11} /> Add</button>
                </div>
              </Field>
            </div>
          </div>

          {/* Steps — list mode (no canvas this iteration) */}
          <div className="surface-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-base font-semibold">Steps</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Linear flow. Each step can call a tool, fetch knowledge, or branch on a condition.</p>
              </div>
              <button className="btn-ghost"><Plus size={12} /> Add step</button>
            </div>

            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={s.id} className="group rounded-lg bg-surface-muted/50 hover:bg-surface-muted transition-base">
                  <div className="flex items-start gap-3 p-4">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-[11px] font-bold font-display flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <s.icon size={13} className={s.iconColor} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.kind}</span>
                      </div>
                      <div className="text-sm font-medium mb-1">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                      {s.refs && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {s.refs.map(r => (
                            <span key={r.label} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border font-medium">
                              <r.icon size={10} /> {r.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-base">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex justify-center pb-1.5">
                      <ArrowRight size={12} className="text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              ))}
              <button className="w-full border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary-soft/20 rounded-lg py-3 text-sm text-muted-foreground hover:text-primary transition-base flex items-center justify-center gap-1.5">
                <Plus size={13} /> Add step
              </button>
            </div>
          </div>

          {/* Output schema */}
          <div className="surface-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Code2 size={15} className="text-primary" />
              <h3 className="font-display text-base font-semibold">Output</h3>
            </div>
            <pre className="text-xs font-mono bg-surface-muted rounded-lg p-4 overflow-x-auto">
{`{
  "card_locked": true,
  "card_last4": "4421",
  "ticket_id": "TKT-58291",
  "user_message": "Your card ending in 4421 has been locked successfully."
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const steps = [
  {
    id: 1, kind: "Collect input", icon: MessageSquare, iconColor: "text-primary",
    title: "Ask for phone number",
    desc: "Prompt: 'Could you share the phone number registered with your account?'",
  },
  {
    id: 2, kind: "Call tool", icon: Wrench, iconColor: "text-accent",
    title: "verify_customer(phone)",
    desc: "Match customer record. On failure → escalate to agent.",
    refs: [{ icon: Wrench, label: "verify_customer" }],
  },
  {
    id: 3, kind: "Retrieve knowledge", icon: BookOpen, iconColor: "text-info",
    title: "Lookup card-lock policy",
    desc: "Pull eligibility rules from the Customer FAQ knowledge source.",
    refs: [{ icon: FileText, label: "Customer FAQ" }],
  },
  {
    id: 4, kind: "Call tool", icon: Wrench, iconColor: "text-accent",
    title: "lock_card_api(card_id)",
    desc: "Lock the card. Returns ticket_id + status.",
    refs: [{ icon: Wrench, label: "lock_card_api" }],
  },
  {
    id: 5, kind: "Reply", icon: Sparkles, iconColor: "text-success",
    title: "Confirm to user",
    desc: "Use friendly tone, include card last 4 digits and ticket reference.",
  },
];
