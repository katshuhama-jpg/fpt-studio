import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Filter, MoreVertical, MessageSquare, Activity, Layers, X, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

const agents = [
  { id: "cskh", name: "Banking ABC — Customer Care", emoji: "🏦", bg: "bg-primary-soft", status: "Published",
    desc: "24/7 multilingual customer support with card-lock and product Q&A.", model: "Gemini 1.5 Pro",
    convs: 2841, success: 84, channels: ["Web", "Zalo"], updated: "2h ago", accent: "bg-primary" },
  { id: "hr", name: "HR Onboarding Bot", emoji: "🤝", bg: "bg-accent-soft", status: "Draft",
    desc: "New-joiner onboarding, policy lookup and meeting scheduling.", model: "GPT-4o mini",
    convs: 412, success: 91, channels: ["Slack"], updated: "1d ago", accent: "bg-accent" },
  { id: "faq", name: "Product FAQ Assistant", emoji: "📦", bg: "bg-surface-muted", status: "Published",
    desc: "Product manuals, troubleshooting and warranty information.", model: "FPT.AI LLM",
    convs: 1240, success: 88, channels: ["Web", "FB"], updated: "3d ago", accent: "bg-primary-glow" },
  { id: "sales", name: "Sales Lead Qualifier", emoji: "🎯", bg: "bg-primary-soft", status: "Draft",
    desc: "Lead scoring, BANT qualification and CRM hand-off.", model: "Claude 3.5",
    convs: 0, success: 0, channels: [], updated: "Just now", accent: "bg-gradient-brand" },
  { id: "ops", name: "IT Helpdesk", emoji: "🛠️", bg: "bg-accent-soft", status: "Published",
    desc: "Password reset, VPN setup and ticket triage for L1 support.", model: "Gemini 1.5 Flash",
    convs: 967, success: 79, channels: ["Teams"], updated: "1w ago", accent: "bg-accent" },
];

const tabs = ["All agents", "Published", "Draft", "Shared with me"] as const;

function NewAgentModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [model, setModel] = useState("DeepSeek V4");

  const handleCreate = () => {
    if (!name.trim()) return;
    const params = new URLSearchParams();
    params.set("tab", "develop");
    params.set("section", "general");
    if (name) params.set("agentName", name);
    if (prompt) params.set("agentPrompt", prompt);
    navigate(`/agents/new?${params.toString()}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-surface rounded-2xl shadow-lg border border-border animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="font-display text-xl font-semibold">New agent</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 space-y-5">
          {/* Agent name */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Agent name <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              className="ds-input w-full"
              placeholder="e.g. Support Triage"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
          </div>

          {/* Starting prompt */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Starting prompt</label>
            <textarea
              className="ds-textarea w-full min-h-[120px]"
              placeholder="Describe what your agent should do..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>

          {/* Advanced */}
          <div>
            <button
              onClick={() => setAdvanced(o => !o)}
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-base"
            >
              Advanced
              <ChevronDown size={14} className={`transition-transform ${advanced ? "rotate-180" : ""}`} />
            </button>
            {advanced && (
              <div className="mt-3 space-y-3 pl-1">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Model</label>
                  <button className="ds-input w-full flex items-center gap-2 cursor-pointer text-left">
                    <span className="w-5 h-5 rounded bg-accent-soft flex items-center justify-center text-xs shrink-0">✨</span>
                    <span className="flex-1 text-sm">{model}</span>
                    <span className="chip chip-primary text-xs">FPT Marketplace</span>
                    <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border mt-4">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentsList() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up">
      {showModal && <NewAgentModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage every agent in this workspace — build, test, deploy and monitor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-10 px-3.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base">
            <Layers size={14} /> Templates
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 shadow-soft transition-base"
          >
            <Plus size={15} /> New Agent
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
        <div className="flex items-center gap-1">
          {tabs.map((t, i) => (
            <button
              key={t}
              className={`px-3 h-8 rounded-lg text-sm font-medium transition-base ${
                i === 0 ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {t} {i === 0 && <span className="ml-1 text-xs opacity-70">5</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search agents…"
              className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <button className="h-9 w-9 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center transition-base">
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Create card */}
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary-soft/30 transition-base flex flex-col items-center justify-center min-h-[220px] p-6 group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-base">
            <Plus size={22} />
          </div>
          <div className="font-display font-semibold text-base mb-1">Create new agent</div>
          <div className="text-xs text-muted-foreground text-center max-w-[200px]">
            Start from scratch or use a marketplace template.
          </div>
        </button>

        {agents.map(a => (
          <Link
            key={a.id}
            to={`/agents/${a.id}`}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface hover:border-primary/30 hover:shadow-elev transition-base"
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${a.accent}`} aria-hidden />
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.bg}`}>
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm truncate">{a.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        a.status === "Published"
                          ? "bg-primary-soft text-primary"
                          : "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {a.status}
                    </span>
                    <span className="text-muted-foreground">· {a.model}</span>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-base text-muted-foreground hover:text-foreground p-1">
                  <MoreVertical size={14} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2 min-h-[32px]">{a.desc}</p>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-muted-foreground" />
                  <span className="text-xs">
                    <b className="font-display">{a.convs.toLocaleString()}</b>
                    <span className="text-muted-foreground ml-1">convs</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-muted-foreground" />
                  <span className="text-xs">
                    <b className="font-display">{a.success}%</b>
                    <span className="text-muted-foreground ml-1">resolved</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <span>Updated {a.updated}</span>
                {a.channels.length > 0 && (
                  <>
                    <span>·</span>
                    {a.channels.map(c => (
                      <span key={c} className="px-1.5 py-0.5 rounded bg-surface-muted">{c}</span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
