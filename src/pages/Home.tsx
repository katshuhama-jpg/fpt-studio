import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, ArrowRight, ArrowUpRight, Bot, BookOpen, Wrench, Layers,
  MessageSquare, Briefcase, ShoppingCart, FileQuestion, BookMarked, Rocket,
  Headphones, Megaphone, GraduationCap, BarChart3, Send, Paperclip, AtSign,
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [hasRecent] = useState(true); // toggle false to preview empty state
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  const handleBuild = () => {
    if (!prompt.trim()) return;
    const params = new URLSearchParams();
    params.set("tab", "develop");
    params.set("section", "general");
    params.set("agentPrompt", prompt.trim());
    params.set("buildMode", "ai");
    navigate(`/agents/new?${params.toString()}`);
  };

  return (
    <div className="px-8 py-10 max-w-[1200px] mx-auto animate-fade-up">
      {/* ============ Hero: prompt-to-build ============ */}
      <section className="mb-12">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 chip chip-primary mb-4">
            <Sparkles size={11} /> Build with natural language
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3 text-balance">
            Good afternoon, Nam — what should we build today?
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto text-balance">
            Describe your agent in one sentence. We'll scaffold knowledge, tools and the system prompt for you.
          </p>
        </div>

        {/* Composer */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-border bg-surface shadow-elev focus-within:border-primary focus-within:ring-glow transition-base p-2">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. A 24/7 banking customer-care agent that can lock cards, look up loan rates and book consultations…"
              className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground outline-none px-3 py-2.5 max-h-40"
            />
            <div className="flex items-center gap-1.5 px-2 pb-1">
              <button className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base" title="Attach a brief">
                <Paperclip size={14} />
              </button>
              <button className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base" title="Mention a tool or knowledge">
                <AtSign size={14} />
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 h-8 rounded-md hover:bg-surface-muted transition-base">
                  Use a template
                </button>
                <button
                  onClick={handleBuild}
                  disabled={!prompt.trim()}
                  className="h-8 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 shadow-soft transition-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles size={13} /> Build agent <Send size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {suggestions.map(s => (
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
      </section>

      {/* ============ Templates row ============ */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Start from a template</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Production-ready blueprints curated by FPT.</p>
          </div>
          <Link to="/templates" className="text-xs font-medium text-primary hover:text-primary-glow flex items-center gap-1 transition-base">
            All templates <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {templates.map(t => (
            <Link
              key={t.name}
              to="/templates"
              className="group rounded-xl border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-base text-center"
            >
              <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2.5 ${t.bg}`}>
                <t.icon size={16} className={t.color} />
              </div>
              <div className="text-xs font-semibold mb-0.5 truncate">{t.name}</div>
              <div className="text-xs text-muted-foreground truncate">{t.tag}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ Recent + News ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent — col-span 2 */}
        <div className="lg:col-span-2">
          <SectionHeader title="Recent agents" linkTo="/agents" linkLabel="All agents" />
          {hasRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recent.map(a => (
                <Link
                  key={a.name}
                  to="/agents/cskh"
                  className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface border border-border hover:border-primary/30 hover:shadow-soft transition-base"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 ${a.bg}`}>
                    {a.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.meta}</div>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      a.status === "Published" ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {a.status}
                  </span>
                  <ArrowUpRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-base shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyRecent />
          )}
        </div>

        {/* News */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-hero p-5 border border-border">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} className="text-primary" />
              <span className="text-xs uppercase tracking-wider font-semibold text-primary">What's new</span>
            </div>
            <h3 className="font-display text-base font-semibold mb-3 text-balance">
              Ship enterprise agents 10× faster.
            </h3>
            <div className="space-y-1.5">
              {news.map(n => (
                <Link
                  key={n.title}
                  to="/docs"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface transition-base group"
                >
                  <n.icon size={13} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.sub}</div>
                  </div>
                  <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-base text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyRecent() {
  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-3">
        <Bot size={20} />
      </div>
      <div className="font-display font-semibold text-sm mb-1">No agents yet</div>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
        Use the prompt above or pick a template to ship your first agent in minutes.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Link to="/templates" className="btn-secondary h-8 text-xs">
          <Layers size={12} /> Browse templates
        </Link>
        <Link to="/agents/new" className="btn-primary h-8 text-xs">
          <Sparkles size={12} /> Start blank
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <Link to={linkTo} className="text-xs font-medium text-primary hover:text-primary-glow flex items-center gap-1 transition-base">
        {linkLabel} <ArrowRight size={12} />
      </Link>
    </div>
  );
}

const suggestions = [
  "Customer-support agent for an e-commerce shop",
  "HR onboarding assistant",
  "Internal knowledge bot from our SharePoint",
  "Sales lead qualifier with CRM hand-off",
];

const templates = [
  { name: "Customer Care", tag: "CX · Banking", icon: Headphones, color: "text-primary", bg: "bg-primary-soft" },
  { name: "HR Assistant", tag: "Internal", icon: Briefcase, color: "text-accent", bg: "bg-accent-soft" },
  { name: "Sales Helper", tag: "E-commerce", icon: ShoppingCart, color: "text-primary", bg: "bg-primary-soft" },
  { name: "Product FAQ", tag: "Support", icon: MessageSquare, color: "text-info", bg: "bg-info/15" },
  { name: "Marketing", tag: "Content", icon: Megaphone, color: "text-accent", bg: "bg-accent-soft" },
  { name: "Coach", tag: "L&D", icon: GraduationCap, color: "text-primary", bg: "bg-primary-soft" },
];

const recent = [
  { name: "Banking ABC — Customer Care", meta: "Edited 2 hours ago", emoji: "🏦", bg: "bg-primary-soft", status: "Published" },
  { name: "HR Onboarding Bot", meta: "Edited yesterday", emoji: "🤝", bg: "bg-accent-soft", status: "Draft" },
  { name: "Product FAQ Assistant", meta: "Edited 3 days ago", emoji: "📦", bg: "bg-surface-muted", status: "Published" },
  { name: "Sales Lead Qualifier", meta: "Edited last week", emoji: "🎯", bg: "bg-primary-soft", status: "Draft" },
];

const news = [
  { title: "Quick Start in 5 minutes", sub: "Build your first agent", icon: Rocket },
  { title: "Release notes — v6.3", sub: "April 2026", icon: FileQuestion },
  { title: "What's new in Tasks", sub: "Standalone editor", icon: BarChart3 },
  { title: "Platform overview", sub: "Read the docs", icon: BookMarked },
];
