import { useState, useMemo } from "react";
import { Plus, Search, Eye, MoreVertical, X } from "lucide-react";
import { createPortal } from "react-dom";

/* ─── Types ──────────────────────────────────────────────────────────── */
type ActionKind = "Redact and warn" | "Block" | "Append text" | "Rewrite" | "Politely decline" | "Require approval";

interface AgentChip { name: string; color: string }
interface Guardrail {
  id: number;
  name: string;
  desc: string;
  action: ActionKind;
  mandatory: boolean;
  agents: AgentChip[];
}

/* ─── Seed data ──────────────────────────────────────────────────────── */
const SEED: Guardrail[] = [
  { id: 1, name: "PII protection",            desc: "Never expose personal identifiers — CCID, passport, phone — in any response.",          action: "Redact and warn",   mandatory: true,  agents: [] },
  { id: 2, name: "Prohibited content filter", desc: "Block violent, adult, or discriminatory content across all channels.",                    action: "Block",             mandatory: true,  agents: [] },
  { id: 3, name: "Compliance disclaimer",     desc: "Append regulatory disclaimer to all financial and legal responses.",                      action: "Append text",       mandatory: true,  agents: [] },
  { id: 4, name: "Commercial response policy",desc: "Prevent AI from making pricing commitments or answering restricted topics.",              action: "Rewrite",           mandatory: false, agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "IT Helpdesk", color: "#059669" }, { name: "Product FAQ", color: "#d97706" }, { name: "Sales Qualifier", color: "#db2777" }] },
  { id: 5, name: "Legal and medical advice",  desc: "Do not provide legal or medical advice — refer to a specialist.",                         action: "Politely decline",  mandatory: false, agents: [] },
  { id: 6, name: "Escalate risky replies",    desc: "Human approval for any commitments about future roadmap.",                                action: "Require approval",  mandatory: false, agents: [{ name: "Sales Qualifier", color: "#d97706" }] },
  { id: 7, name: "Competitor mention block",  desc: "Avoid naming or comparing direct competitors in any response.",                           action: "Rewrite",           mandatory: false, agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "HR Onboarding", color: "#7c3aed" }, { name: "IT Helpdesk", color: "#059669" }] },
];

/* ─── Create modal ───────────────────────────────────────────────────── */
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: Omit<Guardrail, "id" | "agents">) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [action, setAction] = useState<ActionKind>("Block");
  const [mandatory, setMandatory] = useState(false);

  const actions: ActionKind[] = ["Block", "Rewrite", "Politely decline", "Redact and warn", "Require approval", "Append text"];

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), desc: desc.trim(), action, mandatory });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl border border-border shadow-lg animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-base font-semibold">Create guardrail</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"><X size={15} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Name <span className="text-destructive">*</span></label>
            <input autoFocus className="ds-input w-full" placeholder="e.g. Competitor mention block" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Description</label>
            <textarea className="ds-textarea w-full min-h-[72px]" placeholder="Describe when and how this rule applies…" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Response action</label>
            <select className="ds-input w-full" value={action} onChange={e => setAction(e.target.value as ActionKind)}>
              {actions.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-muted">
            <input type="checkbox" id="mandatory" checked={mandatory} onChange={e => setMandatory(e.target.checked)} className="w-4 h-4 accent-primary" />
            <div>
              <label htmlFor="mandatory" className="text-sm font-medium cursor-pointer">Mandatory</label>
              <p className="text-xs text-muted-foreground">Enforced on all agents — cannot be disabled per agent.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Cancel</button>
          <button onClick={submit} disabled={!name.trim()} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed">Create</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function WorkspaceGuardrails() {
  const [items, setItems] = useState<Guardrail[]>(SEED);
  const [query, setQuery]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  let nextId = Math.max(...items.map(i => i.id)) + 1;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(g => !q || g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q));
  }, [items, query]);

  const [activeTab, setActiveTab] = useState<"optional" | "enforced">("optional");

  const optional  = filtered.filter(g => !g.mandatory);
  const enforced = filtered.filter(g => g.mandatory);
  const visibleItems = activeTab === "enforced" ? enforced : optional;

  const handleCreate = (g: Omit<Guardrail, "id" | "agents">) => {
    setItems(prev => [...prev, { ...g, id: nextId++, agents: [] }]);
  };

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-fade-up">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Guardrails</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Shared safety policies you can apply to any agent — content restrictions, data protection, approval flows, and custom rules.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search guardrails"
            className="h-9 w-56 pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
          />
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowCreate(true)}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base"
          >
            <Plus size={14} /> Create guardrail
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-border pb-3">
        {([
          { key: "optional", label: "Optional",  count: optional.length  },
          { key: "enforced", label: "Enforced", count: enforced.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
              activeTab === t.key
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === t.key
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-sunken text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-xs text-muted-foreground mb-4">
        {activeTab === "enforced"
          ? "These guardrails are enforced on all agents in this workspace and cannot be disabled."
          : "These guardrails can be assigned to individual agents. Configure per-agent in each agent's settings."}
      </p>

      {/* Table */}
      {activeTab === "enforced" ? (
        <Table>
          <THead cols="1fr 130px 150px 64px" cells={["Guardrail", "Rules", "Response action", "Actions"]} lastRight />
          {visibleItems.length === 0 ? <EmptyRow /> : visibleItems.map(g => (
            <TRow key={g.id} cols="1fr 130px 150px 64px">
              <div>
                <div className="text-sm font-medium">{g.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{g.desc}</div>
              </div>
              <div><Pill>Rule</Pill></div>
              <div><ActionPill>{g.action}</ActionPill></div>
              <div className="flex items-center gap-1.5 justify-end">
                <IconBtn aria-label="View"><Eye size={13} /></IconBtn>
                <IconBtn aria-label="More"><MoreVertical size={13} /></IconBtn>
              </div>
            </TRow>
          ))}
        </Table>
      ) : (
        <Table>
          <THead cols="1fr 130px 150px 1fr 64px" cells={["Guardrail", "Rules", "Response action", "Assigned agents", "Actions"]} lastRight />
          {visibleItems.length === 0 ? <EmptyRow /> : visibleItems.map(g => (
            <TRow key={g.id} cols="1fr 130px 150px 1fr 64px">
              <div>
                <div className="text-sm font-medium">{g.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{g.desc}</div>
              </div>
              <div><Pill>Rule</Pill></div>
              <div><ActionPill>{g.action}</ActionPill></div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {g.agents.length === 0
                  ? <span className="text-xs text-muted-foreground">No agents assigned</span>
                  : <>
                      {g.agents.slice(0, 2).map(a => (
                        <span key={a.name} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-border bg-surface-muted text-xs text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: a.color}} />
                          {a.name}
                        </span>
                      ))}
                      {g.agents.length > 2 && (
                        <span className="h-6 px-2.5 rounded-full border border-border bg-surface-muted text-xs text-muted-foreground inline-flex items-center">
                          +{g.agents.length - 2}
                        </span>
                      )}
                    </>
                }
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <IconBtn aria-label="View"><Eye size={13} /></IconBtn>
                <IconBtn aria-label="More"><MoreVertical size={13} /></IconBtn>
              </div>
            </TRow>
          ))}
        </Table>
      )}
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface overflow-hidden">{children}</div>;
}

function THead({ cols, cells, lastRight }: { cols: string; cells: string[]; lastRight?: boolean }) {
  return (
    <div className="grid px-5 bg-surface-muted border-b border-border" style={{gridTemplateColumns: cols}}>
      {cells.map((c, i) => (
        <div key={c} className={`py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ${lastRight && i === cells.length - 1 ? "text-right" : ""}`}>{c}</div>
      ))}
    </div>
  );
}

function TRow({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div className="grid px-5 py-3.5 border-b border-border last:border-0 items-center gap-3" style={{gridTemplateColumns: cols}}>
      {children}
    </div>
  );
}

function EmptyRow() {
  return <div className="px-5 py-6 text-sm text-muted-foreground text-center">No guardrails found.</div>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface-muted text-xs text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
      {children}
    </span>
  );
}

function ActionPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full border border-border bg-surface-muted text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function IconBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-7 h-7 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
    >
      {children}
    </button>
  );
}
