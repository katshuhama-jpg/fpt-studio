import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Search, Filter, MoreVertical, MessageSquare, Activity,
  Paperclip, AtSign, Sparkles, Send, X
} from "lucide-react";
import { useState } from "react";

/* ─── Data ─────────────────────────────────────────────────────────────── */

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

const categories = ["All", "Customer support", "Sales", "HR & Internal", "Operations", "Finance"] as const;

const templates = [
  { id: 1, emoji: "💬", bg: "bg-blue-50",  name: "Customer care bot",    cat: "Customer support", desc: "Multilingual 24/7 support with escalation and live-agent handoff" },
  { id: 2, emoji: "📦", bg: "bg-green-50", name: "Product FAQ assistant", cat: "Customer support", desc: "Answers from manuals, docs, and warranty info" },
  { id: 3, emoji: "🎯", bg: "bg-amber-50", name: "Sales lead qualifier",  cat: "Sales",            desc: "BANT scoring, objection handling, and CRM handoff" },
  { id: 4, emoji: "🤝", bg: "bg-pink-50",  name: "HR onboarding bot",     cat: "HR & Internal",    desc: "New-joiner flows, policy lookup, meeting scheduling" },
  { id: 5, emoji: "🔧", bg: "bg-blue-50",  name: "IT helpdesk",           cat: "Operations",       desc: "Password reset, VPN setup, and L1 ticket triage" },
  { id: 6, emoji: "💰", bg: "bg-green-50", name: "Finance Q&A",           cat: "Finance",          desc: "Invoice queries, payment status, and budget lookups" },
  { id: 7, emoji: "📋", bg: "bg-amber-50", name: "Operations assistant",  cat: "Operations",       desc: "Process guides, SOP lookup, and task routing" },
  { id: 8, emoji: "📣", bg: "bg-pink-50",  name: "Marketing assistant",   cat: "Sales",            desc: "Campaign Q&A, content suggestions, and lead capture" },
];

/* ─── Template Modal ────────────────────────────────────────────────────── */

function TemplateModal({ onClose, onUse }: { onClose: () => void; onUse: (name: string) => void }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("All");

  const filtered = templates.filter(t => {
    const matchCat = cat === "All" || t.cat === cat;
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[80vh] animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display text-lg font-semibold">Choose a template</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border overflow-x-auto shrink-0">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 h-7 rounded-full text-xs font-medium whitespace-nowrap transition-base ${
                cat === c
                  ? "bg-primary-soft text-primary border border-primary/30"
                  : "bg-surface-muted text-muted-foreground hover:bg-surface-sunken"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No templates found.</p>
          )}
          {filtered.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-soft/20 transition-base group"
            >
              <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center text-xl shrink-0`}>
                {t.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.desc}</p>
              </div>
              <button
                onClick={() => { onUse(t.name); onClose(); }}
                className="shrink-0 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium opacity-0 group-hover:opacity-100 transition-base"
              >
                Use
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function AgentsList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("All agents");
  const [showTemplates, setShowTemplates] = useState(false);
  const [prompt, setPrompt] = useState("");

  const tabCounts: Record<typeof tabs[number], number> = {
    "All agents": agents.length,
    "Published": agents.filter(a => a.status === "Published").length,
    "Draft": agents.filter(a => a.status === "Draft").length,
    "Shared with me": 0,
  };

  const visibleAgents =
    activeTab === "All agents"
      ? agents
      : activeTab === "Shared with me"
        ? []
        : agents.filter(a => a.status === activeTab);

  const handleBuild = () => {
    if (!prompt.trim()) return;
    const params = new URLSearchParams();
    params.set("tab", "develop");
    params.set("section", "general");
    params.set("agentPrompt", prompt);
    navigate(`/agents/new?${params.toString()}`);
  };

  const handleUseTemplate = (name: string) => {
    setPrompt(`Build a ${name} for my workspace.`);
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up">
      {showTemplates && (
        <TemplateModal onClose={() => setShowTemplates(false)} onUse={handleUseTemplate} />
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Manage every agent in this workspace — build, test, deploy and monitor.
        </p>
      </div>

      {/* ── Hero title + chat box ─────────────────────────────────────── */}
      <div className="flex flex-col items-center mb-8">
        <h2 className="font-display text-4xl font-semibold tracking-tight text-center mb-2">
          Start to build your agent today
        </h2>
        <p className="text-base text-muted-foreground text-center mb-6">
          Describe what you need and we'll build it for you
        </p>
        <div className="w-full max-w-[672px] rounded-2xl border-2 border-primary/40 bg-white p-4 shadow-sm focus-within:border-primary transition-colors">
        <textarea
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed min-h-[56px]"
          placeholder="e.g. A 24/7 banking customer-care agent that can lock cards, look up loan rates and book consultations…"
          rows={2}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild();
          }}
        />
        <div className="flex items-center justify-between mt-3">
          {/* Left tools */}
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
              title="Attach file"
            >
              <Paperclip size={16} />
            </button>
            <button
              className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
              title="Mention knowledge"
            >
              <AtSign size={16} />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-base"
            >
              Use a template
            </button>
            <button
              onClick={handleBuild}
              disabled={!prompt.trim()}
              className="h-9 px-4 rounded-full bg-primary/80 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium flex items-center gap-2 transition-base"
            >
              <Sparkles size={14} />
              Build agent
              <Send size={13} />
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* ── Tabs + search toolbar ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 border-b border-border pb-3">
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
                activeTab === t
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {t}
              {tabCounts[t] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === t
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-sunken text-muted-foreground"
                }`}>
                  {tabCounts[t]}
                </span>
              )}
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

      {/* ── Agents grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleAgents.map(a => (
          <Link
            key={a.id}
            to={`/agents/${a.id}`}
            className="group rounded-xl border border-border bg-surface hover:border-primary/30 hover:shadow-elev transition-base"
          >
<div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.bg}`}>
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate mb-0.5">{a.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      a.status === "Published"
                        ? "bg-primary-soft text-primary"
                        : "bg-surface-muted text-muted-foreground"
                    }`}>
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

        {visibleAgents.length === 0 && activeTab !== "All agents" && (
          <div className="col-span-3 py-16 text-center text-muted-foreground text-sm">
            No agents in this tab yet.
          </div>
        )}
      </div>
    </div>
  );
}
