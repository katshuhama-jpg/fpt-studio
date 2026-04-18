import { Link } from "react-router-dom";
import {
  Users, Bot, Wrench, BookOpen, Sparkles, ArrowRight, ArrowUpRight,
  MessageSquare, Briefcase, ShoppingCart, FileQuestion, BookMarked, Rocket,
} from "lucide-react";

export default function Home() {
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up">
      {/* Hero greeting */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Good afternoon, Nam</h1>
          <span className="text-2xl">☕</span>
        </div>
        <p className="text-muted-foreground text-balance">
          Build, orchestrate and monitor a workforce of enterprise AI agents — all in one workspace.
        </p>
      </div>

      {/* Create section — bold hero strip */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Start something new
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <CreateCard
            icon={Users}
            title="Workforce"
            sub="Multi-agent system"
            tone="primary"
            featured
            to="/agents"
          />
          <CreateCard icon={Bot} title="New Agent" sub="Chat or task bot" tone="accent" to="/agents" />
          <CreateCard icon={Wrench} title="Tool" sub="API · Custom code" tone="neutral" to="/tools" />
          <CreateCard icon={BookOpen} title="Knowledge" sub="Docs · Web · FAQ" tone="neutral" to="/knowledge" />
        </div>
      </section>

      {/* Recent + Recommended */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-10">
        {/* Recent */}
        <div className="lg:col-span-2 surface-card p-5">
          <SectionHeader title="Recent agents" linkTo="/agents" linkLabel="All agents" />
          <div className="space-y-1 -mx-2">
            {recent.map(a => (
              <Link
                key={a.name}
                to="/agents/cskh"
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-muted transition-base group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${a.bg}`}>
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.meta}</div>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    a.status === "Published"
                      ? "bg-primary-soft text-primary"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {a.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recommended */}
        <div className="lg:col-span-3 surface-card p-5">
          <SectionHeader title="Recommended agents" linkTo="/marketplace" linkLabel="Marketplace" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommended.map(r => (
              <Link
                key={r.name}
                to="/marketplace"
                className="group rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-soft transition-base bg-surface relative overflow-hidden"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${r.accent}`}
                  aria-hidden
                />
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.bg}`}>
                    <r.icon size={16} className={r.iconColor} />
                  </div>
                  <span className="text-sm font-semibold">{r.name}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{r.desc}</p>
                <div className="flex items-center gap-1.5">
                  {r.tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-muted text-muted-foreground font-medium">
                      {t}
                    </span>
                  ))}
                  <ArrowUpRight size={12} className="ml-auto text-muted-foreground group-hover:text-primary transition-base" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Models + News */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 surface-card p-5">
          <SectionHeader title="Basic models — chat directly" linkTo="/my-agents" linkLabel="Open chat" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {models.map(m => (
              <Link
                key={m.name}
                to="/my-agents"
                className="group rounded-xl border border-border p-3.5 hover:border-primary/40 hover:bg-primary-soft/30 transition-base bg-surface"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${m.bg} text-base`}>
                  {m.emoji}
                </div>
                <div className="text-sm font-semibold mb-0.5">{m.name}</div>
                <div className="text-[10px] text-muted-foreground mb-2">{m.provider}</div>
                <div className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                  Chat now <ArrowRight size={11} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 relative overflow-hidden rounded-xl bg-gradient-hero p-5 text-primary-foreground">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-accent/20 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} />
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">New on FPT AI Agents</span>
            </div>
            <h3 className="font-display text-lg font-semibold mb-4 text-balance">
              Ship enterprise-grade agents <span className="text-accent">10× faster</span>.
            </h3>
            <div className="space-y-2">
              {news.map(n => (
                <Link
                  key={n.title}
                  to="/docs"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-base group"
                >
                  <n.icon size={14} className="text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    <div className="text-[10px] opacity-60">{n.sub}</div>
                  </div>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-base" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <Link to={linkTo} className="text-xs font-medium text-primary hover:text-accent flex items-center gap-1 transition-base">
        {linkLabel} <ArrowRight size={12} />
      </Link>
    </div>
  );
}

function CreateCard({
  icon: Icon, title, sub, tone, featured, to,
}: { icon: any; title: string; sub: string; tone: "primary" | "accent" | "neutral"; featured?: boolean; to: string }) {
  const styles = featured
    ? "bg-gradient-hero text-primary-foreground border-transparent shadow-elev hover:shadow-pop"
    : "bg-surface border-border hover:border-primary/30 hover:shadow-soft text-foreground";

  const iconBg = featured
    ? "bg-accent text-accent-foreground"
    : tone === "accent"
    ? "bg-accent-soft text-accent"
    : "bg-primary-soft text-primary";

  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-xl p-5 border transition-base ${styles}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${iconBg} transition-base`}>
        <Icon size={18} />
      </div>
      <div className="font-display font-semibold text-base mb-0.5">{title}</div>
      <div className={`text-xs ${featured ? "opacity-70" : "text-muted-foreground"}`}>{sub}</div>
      <ArrowRight
        size={14}
        className={`absolute right-4 bottom-4 transition-base translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 ${
          featured ? "text-accent" : "text-primary"
        }`}
      />
    </Link>
  );
}

const recent = [
  { name: "Banking ABC — Customer Care", meta: "Edited 2 hours ago", emoji: "🏦", bg: "bg-primary-soft", status: "Published" },
  { name: "HR Onboarding Bot", meta: "Edited yesterday", emoji: "🤝", bg: "bg-accent-soft", status: "Draft" },
  { name: "Product FAQ Assistant", meta: "Edited 3 days ago", emoji: "📦", bg: "bg-surface-muted", status: "Published" },
  { name: "Sales Lead Qualifier", meta: "Edited last week", emoji: "🎯", bg: "bg-primary-soft", status: "Draft" },
];

const recommended = [
  {
    name: "Customer Support",
    desc: "24/7 multilingual support with seamless escalation to human agents.",
    icon: MessageSquare,
    iconColor: "text-primary",
    bg: "bg-primary-soft",
    accent: "bg-primary",
    tags: ["CX", "Banking"],
  },
  {
    name: "HR Assistant",
    desc: "Onboarding, policy lookup, leave requests and meeting scheduling.",
    icon: Briefcase,
    iconColor: "text-accent",
    bg: "bg-accent-soft",
    accent: "bg-accent",
    tags: ["HR", "Internal"],
  },
  {
    name: "Sales Assistant",
    desc: "Product recommendations, lead capture and conversational checkout.",
    icon: ShoppingCart,
    iconColor: "text-primary",
    bg: "bg-primary-soft",
    accent: "bg-gradient-coral",
    tags: ["Sales", "E-comm"],
  },
];

const models = [
  { name: "FPT.AI LLM", provider: "FPT Marketplace", emoji: "🇻🇳", bg: "bg-primary-soft" },
  { name: "Gemini 1.5 Pro", provider: "Google", emoji: "✨", bg: "bg-accent-soft" },
  { name: "Claude 3.5", provider: "Anthropic", emoji: "🧠", bg: "bg-surface-muted" },
  { name: "GPT-4o mini", provider: "OpenAI", emoji: "⚡", bg: "bg-primary-soft" },
];

const news = [
  { title: "What is FPT AI Agents?", sub: "Platform overview", icon: BookMarked },
  { title: "Quick Start in 5 minutes", sub: "Build your first agent", icon: Rocket },
  { title: "Release notes — v6.3", sub: "April 2026", icon: FileQuestion },
];
