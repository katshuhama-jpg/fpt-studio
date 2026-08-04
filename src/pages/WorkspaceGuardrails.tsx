import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, MoreVertical, X, Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

/* ─── Types ──────────────────────────────────────────────────────────── */
type ActionKind = "Agent auto response" | "Agent response with fixed paragraph" | "Require approval" | "Block" | "Redact and warn" | "Politely decline";

interface AgentChip { name: string; color: string }
interface Guardrail {
  id: number;
  name: string;
  desc: string;
  action: ActionKind;
  mandatory: boolean;
  agents: AgentChip[];
  allAgents?: boolean;
  enabled: boolean;
}

/* ─── Seed data ──────────────────────────────────────────────────────── */
const SEED: Guardrail[] = [
  { id: 1, name: "PII protection",            desc: "Never expose personal identifiers — CCID, passport, phone — in any response.",          action: "Agent auto response",                   mandatory: true,  agents: [], enabled: true },
  { id: 2, name: "Prohibited content filter", desc: "Block violent, adult, or discriminatory content across all channels.",                    action: "Agent auto response",                   mandatory: true,  agents: [], enabled: true },
  { id: 3, name: "Compliance disclaimer",     desc: "Append regulatory disclaimer to all financial and legal responses.",                      action: "Agent response with fixed paragraph",   mandatory: true,  agents: [], enabled: true },
  { id: 4, name: "Commercial response policy",desc: "Prevent AI from making pricing commitments or answering restricted topics.",              action: "Agent auto response",               mandatory: false, agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "IT Helpdesk", color: "#059669" }, { name: "Product FAQ", color: "#d97706" }, { name: "Sales Qualifier", color: "#db2777" }], enabled: true },
  { id: 5, name: "Legal and medical advice",  desc: "Do not provide legal or medical advice — refer to a specialist.",                         action: "Agent response with fixed paragraph", mandatory: false, agents: [], allAgents: true, enabled: true },
  { id: 6, name: "Escalate risky replies",    desc: "Human approval for any commitments about future roadmap.",                                action: "Require approval",                    mandatory: false, agents: [{ name: "Sales Qualifier", color: "#d97706" }], enabled: false },
  { id: 7, name: "Competitor mention block",  desc: "Avoid naming or comparing direct competitors in any response.",                           action: "Agent auto response",               mandatory: false, agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "HR Onboarding", color: "#7c3aed" }, { name: "IT Helpdesk", color: "#059669" }], enabled: true },
];

/* ─── Response types ─────────────────────────────────────────────────── */
type ResponseKind = "auto" | "fixed" | null;

/* ─── Create side sheet ──────────────────────────────────────────────── */
function CreateModal({ onClose, onCreate, initialData }: {
  onClose: () => void;
  onCreate: (g: Omit<Guardrail, "id" | "agents">) => void;
  initialData?: Guardrail;
}) {
  const isEdit = !!initialData;
  const actionToResponse = (a?: ActionKind): ResponseKind => {
    if (a === "Agent auto response") return "auto";
    if (a === "Agent response with fixed paragraph") return "fixed";
    return null;
  };
  const [topic, setTopic]       = useState(initialData?.name ?? "");
  const [desc, setDesc]         = useState(initialData?.desc ?? "");
  const [samples, setSamples]   = useState("");
  const [response, setResponse] = useState<ResponseKind>(actionToResponse(initialData?.action));
  const [fixedText, setFixedText] = useState("");
  const [allAgents, setAllAgents] = useState(initialData?.allAgents ?? false);

  const actionFromResponse = (): ActionKind => {
    if (response === "auto")  return "Agent auto response";
    if (response === "fixed") return "Agent response with fixed paragraph";
    return "Agent auto response";
  };

  const submit = () => {
    if (!topic.trim()) return;
    onCreate({ name: topic.trim(), desc: desc.trim(), action: actionFromResponse(), mandatory: false, allAgents });
    onClose();
  };

  const responseOptions: { key: ResponseKind; title: string; desc: string }[] = [
    { key: "auto",  title: "Agent auto response",                 desc: "Agent automatically rewrites responses based on your instructions." },
    { key: "fixed", title: "Agent response with fixed paragraph", desc: "Agent replies using the exact text you provide." },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* side sheet */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[560px] bg-white flex flex-col shadow-2xl" style={{animation:"slideInRight 0.22s ease"}}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">Create Guardrail</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Define the rule and choose how the agent responds.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5"><X size={15} /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Define the rule ── */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Define the rule</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Topic <span className="text-destructive">*</span></label>
                  <span className="text-xs text-muted-foreground">{topic.length}/100</span>
                </div>
                <input
                  autoFocus
                  maxLength={100}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
                  <span className="text-xs text-muted-foreground">{desc.length}/800</span>
                </div>
                <textarea
                  maxLength={800}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Samples</label>
                  <span className="text-xs text-muted-foreground">{samples.length}/2000</span>
                </div>
                <p className="text-xs text-primary mb-1.5 italic">Tip: Each sample must be separated by a line break.</p>
                <textarea
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
                  value={samples}
                  onChange={e => setSamples(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Response ── */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Response</h3>
            <p className="text-xs text-muted-foreground mb-4">Choose what the agent does when this rule triggers.</p>
            <div className="space-y-3">
              {responseOptions.map(opt => {
                const selected = response === opt.key;
                return (
                  <div key={opt.key} className={`rounded-xl border-2 transition-base overflow-hidden ${
                    selected ? "border-primary bg-primary/5" : "border-border bg-white"
                  }`}>
                    {/* Card header — always visible, click to select */}
                    <div
                      className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
                      onClick={() => setResponse(selected ? null : opt.key)}
                    >
                      <div>
                        <div className="text-sm font-semibold">{opt.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                      </div>
                      {!selected && <span className="text-muted-foreground shrink-0 ml-4 text-lg leading-none">›</span>}
                    </div>

                    {/* Expanded detail — only when selected */}
                    {selected && opt.key === "auto" && (
                      <div className="px-4 pb-4">
                        <div className="rounded-lg border border-dashed border-border bg-white px-3 py-3 text-xs text-muted-foreground">
                          The agent will automatically rewrite its response — no additional input needed.
                        </div>
                      </div>
                    )}
                    {selected && opt.key === "fixed" && (
                      <div className="px-4 pb-4">
                        <label className="block text-xs font-semibold mb-1.5">Fixed paragraph <span className="text-destructive">*</span></label>
                        <div className="relative">
                          <textarea
                            rows={4}
                            maxLength={300}
                            placeholder="Write the exact reply the agent should send."
                            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
                            value={fixedText}
                            onChange={e => { e.stopPropagation(); setFixedText(e.target.value); }}
                            onClick={e => e.stopPropagation()}
                          />
                          <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{fixedText.length}/300</span>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Apply for all agents */}
            <label className="mt-3 flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allAgents}
                onChange={e => setAllAgents(e.target.checked)}
                className="w-4 h-4 accent-primary shrink-0"
              />
              <div>
                <span className="text-sm font-medium">Apply for all agents</span>
                <p className="text-xs text-muted-foreground">This guardrail will be assigned to every agent in the workspace.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-white">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Cancel</button>
          <button onClick={submit} disabled={!topic.trim()} className="h-9 px-6 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed">
            {isEdit ? "Save changes" : "Create guardrail"}
          </button>
        </div>
      </div>

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>,
    document.body
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function WorkspaceGuardrails() {
  const [items, setItems] = useState<Guardrail[]>(SEED);
  const [query, setQuery]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Guardrail | null>(null);
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
    setItems(prev => [...prev, { ...g, id: nextId++, agents: [], enabled: true }]);
  };
  const handleEdit = (id: number, g: Omit<Guardrail, "id" | "agents">) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...g } : item));
  };
  const handleDelete = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  const toggleEnabled = (id: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-fade-up">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {editItem && <CreateModal onClose={() => setEditItem(null)} onCreate={g => { handleEdit(editItem.id, g); setEditItem(null); }} initialData={editItem} />}

      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Guardrails</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Shared safety policies you can apply to any agent — content restrictions, data protection, approval flows, and custom rules.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-5 border-b border-border pb-3">
        <div />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search guardrails"
              className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base"
          >
            <Plus size={14} /> Create guardrail
          </button>
        </div>
      </div>

      {/* Table — all guardrails */}
      <Table>
        <THead cols="1fr 200px 1fr 72px 64px" cells={["Guardrail", "Response action", "Assigned agents", "Status", "Actions"]} lastRight />
        {filtered.length === 0 ? <EmptyRow /> : filtered.map(g => (
          <TRow key={g.id} cols="1fr 200px 1fr 72px 64px">
            <div>
              <div className="text-sm font-medium">{g.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{g.desc}</div>
            </div>
            <div><ActionPill>{g.action}</ActionPill></div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {g.mandatory
                ? <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium">All agents</span>
                : g.allAgents
                  ? <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium">All agents</span>
                  : g.agents.length === 0
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
            <div className="flex items-center">
              <Toggle enabled={g.enabled} onChange={() => toggleEnabled(g.id)} />
            </div>
            <div className="flex items-center justify-end">
              <RowMenu onEdit={() => setEditItem(g)} onDelete={() => handleDelete(g.id)} />
            </div>
          </TRow>
        ))}
      </Table>
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

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-primary border-primary" : "bg-surface-muted border-border"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
  );
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
      >
        <MoreVertical size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-32 bg-white rounded-xl border border-border shadow-lg py-1 animate-fade-up">
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-base"
          >
            <Pencil size={13} className="text-muted-foreground" /> Edit
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-base"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
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
