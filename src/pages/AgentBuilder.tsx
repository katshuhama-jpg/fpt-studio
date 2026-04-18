import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Play, Save, Rocket, MoreHorizontal, BookOpen, Wrench, ListChecks,
  Zap, Settings2, Cog, Bell, Lock, MessageSquareText, FileQuestion, Sparkles,
  Search, Upload, Globe, Database, Plus, Layers, CheckCircle2, Circle, Send,
  ArrowRight, Shield, ChevronDown, FileText, Trash2, MessageSquare, Activity,
  Star, Users as UsersIcon, History, Download,
} from "lucide-react";
import { useState } from "react";

type Tab = "develop" | "monitor";

const developNav = [
  {
    label: "Build",
    items: [
      { id: "general", label: "General", icon: Cog, status: "done" },
      { id: "knowledge", label: "Knowledge", icon: BookOpen, status: "done" },
      { id: "tool", label: "Tools", icon: Wrench, status: "warn" },
      { id: "task", label: "Tasks", icon: ListChecks, status: "empty" },
      { id: "trigger", label: "Triggers", icon: Zap, status: "empty" },
    ],
  },
  {
    label: "Test",
    items: [
      { id: "tests", label: "Test cases", icon: ListChecks },
      { id: "auto", label: "Auto-test", icon: Sparkles },
    ],
  },
  {
    label: "Advanced",
    items: [
      { id: "reminders", label: "Reminders", icon: Bell },
      { id: "auth", label: "Credentials", icon: Lock },
      { id: "convo", label: "Conversation", icon: MessageSquareText },
      { id: "topics", label: "Topics", icon: Layers },
      { id: "opening", label: "Opening questions", icon: FileQuestion },
      { id: "suggest", label: "Auto-suggestion", icon: Sparkles },
      { id: "ref", label: "Show references", icon: BookOpen },
    ],
  },
];

const monitorNav = [
  { label: "Reports", items: [
    { id: "perf", label: "Performance", icon: Activity },
    { id: "convs", label: "Conversations", icon: MessageSquare },
    { id: "users", label: "Users", icon: UsersIcon },
  ]},
  { label: "Quality", items: [
    { id: "csat", label: "Satisfaction", icon: Star },
    { id: "review", label: "Conversation review", icon: ListChecks },
  ]},
  { label: "History", items: [
    { id: "chat-hist", label: "Chat history", icon: History },
    { id: "trig-hist", label: "Trigger history", icon: Zap },
  ]},
];

export default function AgentBuilder() {
  const { id = "cskh" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "develop";
  const section = params.get("section") || (tab === "develop" ? "general" : "perf");
  const navigate = useNavigate();

  const setTab = (t: Tab) => setParams({ tab: t, section: t === "develop" ? "general" : "perf" });
  const setSection = (s: string) => setParams({ tab, section: s });

  const nav = tab === "develop" ? developNav : monitorNav;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate("/agents")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base">
          <ChevronLeft size={15} /> Agents
        </button>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center text-base shrink-0">🏦</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Banking ABC — Customer Care</div>
            <div className="text-[10px] text-muted-foreground">Last saved 2 min ago</div>
          </div>
          <span className="ml-2 chip !bg-primary-soft !text-primary !border-primary/10">Published</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 bg-surface-muted rounded-lg p-1">
          {(["develop", "monitor"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 h-8 rounded-md text-sm font-medium capitalize transition-base ${
                tab === t ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base">
            <Play size={13} /> Run
          </button>
          <button className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base">
            <Save size={13} /> Save
          </button>
          <button className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 shadow-soft transition-base">
            <Rocket size={13} /> Publish
          </button>
          <button className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <aside className="w-[220px] border-r border-border bg-surface overflow-y-auto shrink-0">
          <div className="p-3 space-y-5">
            {nav.map(group => (
              <div key={group.label}>
                <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((it: any) => (
                    <button
                      key={it.id}
                      onClick={() => setSection(it.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-base ${
                        section === it.id
                          ? "bg-primary-soft text-primary font-medium"
                          : "text-foreground hover:bg-surface-muted"
                      }`}
                    >
                      <it.icon size={14} className="shrink-0" />
                      <span className="flex-1 text-left truncate">{it.label}</span>
                      {it.status === "done" && <CheckCircle2 size={11} className="text-success" />}
                      {it.status === "warn" && <Circle size={9} className="fill-warning text-warning" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Content + Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-gradient-soft">
            {tab === "develop" && section === "general" && <GeneralTab />}
            {tab === "develop" && section === "knowledge" && <KnowledgeTab />}
            {tab === "develop" && !["general", "knowledge"].includes(section) && <PlaceholderTab title={section} />}
            {tab === "monitor" && section === "perf" && <PerformanceTab />}
            {tab === "monitor" && section !== "perf" && <PlaceholderTab title={section} />}
          </div>

          {tab === "develop" && <PreviewPanel />}
        </div>
      </div>
    </div>
  );
}

/* ============ GENERAL ============ */
function GeneralTab() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-up">
      <SectionCard icon={Cog} title="Persona & Guideline" desc="Define the agent's identity, tone and operating instructions.">
        <Field label="Agent name">
          <input className="ds-input" defaultValue="Banking ABC — Customer Care" />
        </Field>
        <Field label="System prompt">
          <textarea
            className="ds-input min-h-[120px]"
            defaultValue="You are a customer-care specialist at ABC Bank. Help customers 24/7 with products, services and banking requests in a professional, friendly tone. Always verify identity before performing sensitive actions."
          />
        </Field>
        <Field label="Model">
          <button className="ds-input flex items-center gap-2 cursor-pointer">
            <span className="w-6 h-6 rounded bg-accent-soft flex items-center justify-center text-xs">✨</span>
            <span className="flex-1 text-left">Gemini 1.5 Pro</span>
            <span className="chip !bg-primary-soft !text-primary !border-primary/10">FPT Marketplace</span>
            <ChevronDown size={14} />
          </button>
        </Field>
      </SectionCard>

      <SectionCard
        icon={Layers}
        title="Business processes"
        desc="Orchestrate scenarios. Each process bundles knowledge, tools and task flows."
        action={<button className="btn-ghost"><Plus size={12} /> Add process</button>}
      >
        <div className="space-y-2">
          <ProcessItem
            num={1}
            name="Product information lookup"
            type="QnA"
            typeColor="bg-primary-soft text-primary"
            chips={[{ icon: FileText, label: "Brochure 2024" }, { icon: FileText, label: "Customer FAQ" }]}
            chipsLabel="Knowledge attached"
          />
          <ProcessItem
            num={2}
            name="Lock credit card"
            type="Workflow"
            typeColor="bg-accent-soft text-accent"
            highlighted
            steps={["Collect phone", "Verify customer", "Call lock API", "Confirm"]}
            chips={[{ icon: Wrench, label: "verify_customer" }, { icon: Wrench, label: "lock_card_api" }]}
            chipsLabel="Tools attached"
          />
          <ProcessItem num={3} name="Schedule consultation" type="Workflow" typeColor="bg-accent-soft text-accent" collapsed />
          <button className="w-full border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary-soft/20 rounded-lg py-2.5 text-sm text-muted-foreground hover:text-primary transition-base flex items-center justify-center gap-1.5">
            <Plus size={13} /> Add new process
          </button>
        </div>
      </SectionCard>

      <SectionCard
        icon={Shield}
        title="Guardrails"
        desc="Hard rules the agent must never break."
        action={<button className="btn-ghost"><Plus size={12} /> Add rule</button>}
      >
        <div className="space-y-2">
          {guardrails.map(g => (
            <div key={g.text} className="flex items-center gap-3 px-3.5 py-3 border border-border rounded-lg bg-surface">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  g.kind === "Block" ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"
                }`}
              >
                {g.kind}
              </span>
              <span className="text-sm flex-1">{g.text}</span>
              <Toggle on={g.on} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ============ KNOWLEDGE ============ */
function KnowledgeTab() {
  const sources = [
    { name: "Brochure 2024.pdf", type: "PDF", size: "2.4 MB", chunks: 184, icon: FileText, color: "text-destructive" },
    { name: "Customer FAQ", type: "FAQ", size: "47 entries", chunks: 47, icon: MessageSquareText, color: "text-primary" },
    { name: "abcbank.com/products", type: "Web", size: "32 pages", chunks: 312, icon: Globe, color: "text-info" },
    { name: "Internal Policy v3", type: "Sharepoint", size: "1.1 MB", chunks: 96, icon: Database, color: "text-accent" },
  ];
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5 animate-fade-up">
      <SectionCard icon={BookOpen} title="Agent knowledge" desc="Sources this agent can retrieve from at run time.">
        {/* Add source row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {[
            { icon: Upload, label: "Upload" },
            { icon: Globe, label: "Website" },
            { icon: Database, label: "SharePoint" },
            { icon: FileQuestion, label: "FAQ" },
          ].map(s => (
            <button
              key={s.label}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary-soft/30 text-xs font-medium transition-base"
            >
              <s.icon size={16} className="text-primary" />
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="relative w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search sources…" className="ds-input pl-8 h-9" />
          </div>
          <div className="text-xs text-muted-foreground">
            <b className="font-display text-foreground">639</b> chunks · ~98% indexed
          </div>
        </div>

        {/* Sources list */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr,80px,100px,80px,40px] gap-3 px-4 py-2.5 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Source</div><div>Type</div><div>Size</div><div>Chunks</div><div></div>
          </div>
          {sources.map(s => (
            <div key={s.name} className="grid grid-cols-[1fr,80px,100px,80px,40px] gap-3 px-4 py-3 border-t border-border items-center hover:bg-surface-muted/50 transition-base group">
              <div className="flex items-center gap-2.5 min-w-0">
                <s.icon size={15} className={s.color} />
                <span className="text-sm font-medium truncate">{s.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">{s.type}</div>
              <div className="text-xs text-muted-foreground">{s.size}</div>
              <div className="text-xs font-mono">{s.chunks}</div>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-base">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ============ MONITOR / PERFORMANCE ============ */
function PerformanceTab() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Performance</h2>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {["7d", "30d", "Custom"].map((t, i) => (
            <button key={t} className={`px-3 h-7 rounded text-xs font-medium transition-base ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
          <button className="ml-1 h-7 px-2 rounded hover:bg-surface-muted text-muted-foreground transition-base"><Download size={13} /></button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="surface-card p-4">
            <div className="text-[11px] text-muted-foreground mb-1">{m.label}</div>
            <div className="font-display text-2xl font-semibold tracking-tight">{m.value}</div>
            <div className={`text-[11px] mt-1 flex items-center gap-1 ${m.trend === "up" ? "text-success" : "text-destructive"}`}>
              {m.trend === "up" ? "↑" : "↓"} {m.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold">Conversations by day</h3>
          <span className="text-[11px] text-muted-foreground">Last 7 days</span>
        </div>
        <div className="flex items-end gap-2 h-40 mb-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer">
              <div
                className={`rounded-t-md transition-base group-hover:opacity-100 ${i === 5 ? "bg-accent" : "bg-primary"} ${i !== 5 ? "opacity-70" : ""}`}
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
            <div key={d} className="flex-1 text-center text-[10px] text-muted-foreground">{d}</div>
          ))}
        </div>
      </div>

      {/* Two-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="font-display text-sm font-semibold mb-3">Top processes</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-semibold py-2">Process</th>
                <th className="text-right font-semibold py-2">Runs</th>
                <th className="text-left font-semibold py-2 pl-4">Success</th>
              </tr>
            </thead>
            <tbody>
              {processes.map(p => (
                <tr key={p.name} className="border-b border-border last:border-0">
                  <td className="py-2.5">{p.name}</td>
                  <td className="py-2.5 text-right font-mono text-xs">{p.runs.toLocaleString()}</td>
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-surface-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${p.rate}%` }} />
                      </div>
                      <span className="text-xs font-mono">{p.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="surface-card p-5">
          <h3 className="font-display text-sm font-semibold mb-3">User sentiment</h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {sentiments.map(s => (
              <span key={s.label} className={`chip ${s.bg}`}>
                {s.emoji} {s.label} <b className="ml-1 font-display">{s.pct}%</b>
              </span>
            ))}
          </div>
          <h3 className="font-display text-sm font-semibold mb-3 mt-2">Channels</h3>
          {channels.map(c => (
            <div key={c.name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className={`w-2 h-2 rounded-full ${c.color}`} />
              <span className="text-sm font-medium flex-1">{c.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{c.count.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground w-10 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent history */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold">Recent conversations</h3>
          <Link to="?tab=monitor&section=chat-hist" className="text-xs text-primary font-medium hover:text-accent transition-base flex items-center gap-1">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <div className="space-y-1.5">
          {history.map(h => (
            <div key={h.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-surface-muted/50 transition-base cursor-pointer">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${h.chBg}`}>{h.channel}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">User #{h.user} — {h.topic}</div>
                <div className="text-[10px] text-muted-foreground">{h.time} · {h.msgs} messages</div>
              </div>
              <span className={`text-[11px] font-medium ${h.ok ? "text-success" : "text-destructive"}`}>
                {h.ok ? "✓ Resolved" : "→ Escalated"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ PLACEHOLDER ============ */
function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
        <Settings2 size={26} className="text-primary" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2 capitalize">{title.replace(/-/g, " ")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This section is part of the v1 mockup. The layout and tokens are wired — content can be designed next.
      </p>
    </div>
  );
}

/* ============ PREVIEW PANEL ============ */
function PreviewPanel() {
  return (
    <aside className="w-[320px] border-l border-border bg-surface flex flex-col shrink-0">
      <div className="px-4 h-12 border-b border-border flex items-center justify-between shrink-0">
        <div className="text-sm font-semibold">Live preview</div>
        <div className="flex items-center gap-1.5 text-[10px] text-success font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" /> LIVE
        </div>
      </div>
      <div className="px-4 py-2.5 bg-surface-muted border-b border-border shrink-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active process</div>
        <div className="text-xs font-semibold mt-0.5">Lock credit card</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-soft">
        <Bubble side="user">Hi, I lost my card and want to lock it urgently.</Bubble>
        <Bubble side="agent">
          I'm sorry to hear that. To proceed, could you share the phone number registered with your account?
        </Bubble>
        <Bubble side="user">0905 123 456</Bubble>
        <Thinking>Calling tool: <code>verify_customer</code> · matched 1 record</Thinking>
        <Bubble side="agent">
          Verified ✓ — Mr. Nam, I'll lock card ending in <b>•••• 4421</b> now. Confirm?
        </Bubble>
      </div>
      <div className="border-t border-border p-3 shrink-0">
        <div className="text-[10px] text-muted-foreground mb-1.5 px-1">Quick tests</div>
        <div className="flex flex-wrap gap-1 mb-3">
          {["Lock my card", "Loan rates?", "Book consultation"].map(q => (
            <button key={q} className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-surface-muted text-muted-foreground transition-base">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 focus-within:border-primary transition-base">
          <input className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground py-1.5" placeholder="Type to test…" />
          <button className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center"><Send size={12} /></button>
        </div>
      </div>
    </aside>
  );
}

/* ============ atoms ============ */
function SectionCard({ icon: Icon, title, desc, children, action }: any) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}
function Field({ label, children }: any) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function Toggle({ on }: { on: boolean }) {
  const [v, setV] = useState(on);
  return (
    <button
      onClick={() => setV(!v)}
      className={`w-9 h-5 rounded-full p-0.5 transition-base shrink-0 ${v ? "bg-primary" : "bg-border-strong"}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-soft transition-base ${v ? "translate-x-4" : ""}`} />
    </button>
  );
}
function ProcessItem({ num, name, type, typeColor, chips, chipsLabel, steps, highlighted, collapsed }: any) {
  return (
    <div className={`border rounded-lg overflow-hidden bg-surface ${highlighted ? "border-primary/40 ring-2 ring-primary/10" : "border-border"}`}>
      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 ${highlighted ? "bg-primary-soft/40" : ""}`}>
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold font-display flex items-center justify-center shrink-0">{num}</div>
        <span className="text-sm font-medium flex-1">{name}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${typeColor}`}>{type}</span>
        <ChevronDown size={14} className={`text-muted-foreground transition-base ${collapsed ? "" : "rotate-180"}`} />
      </div>
      {!collapsed && (
        <div className="px-3.5 py-3 border-t border-border space-y-3">
          {steps && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Flow</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {steps.map((s: string, i: number) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-1 rounded bg-surface-muted font-medium">{s}</span>
                    {i < steps.length - 1 && <ArrowRight size={10} className="text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {chips && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">{chipsLabel}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {chips.map((c: any) => (
                  <span key={c.label} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-accent-soft text-accent font-medium">
                    <c.icon size={10} /> {c.label}
                  </span>
                ))}
                <button className="text-[10px] text-primary font-medium hover:text-accent transition-base">+ Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function Bubble({ side, children }: { side: "user" | "agent"; children: any }) {
  return (
    <div className={`flex ${side === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] text-xs leading-relaxed rounded-2xl px-3 py-2 ${
          side === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-surface border border-border rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
function Thinking({ children }: { children: any }) {
  return (
    <div className="text-[10px] italic text-muted-foreground bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 font-mono">
      {children}
    </div>
  );
}

/* ============ data ============ */
const guardrails = [
  { kind: "Block", text: "Do not discuss competitors or rival banks.", on: true },
  { kind: "Block", text: "Never provide legal or investment advice.", on: true },
  { kind: "Limit", text: "Stay within the scope of ABC Bank products and services.", on: true },
];
const metrics = [
  { label: "Total conversations", value: "2,841", delta: "12% vs last week", trend: "up" },
  { label: "Resolution rate", value: "84%", delta: "3% vs last week", trend: "up" },
  { label: "Avg. response time", value: "1.4s", delta: "0.2s improved", trend: "up" },
  { label: "Human handoff", value: "8.2%", delta: "1.1% vs last week", trend: "down" },
];
const bars = [50, 62, 45, 75, 68, 95, 80];
const processes = [
  { name: "Product information", runs: 1420, rate: 92 },
  { name: "Lock credit card", runs: 638, rate: 78 },
  { name: "Schedule consultation", runs: 412, rate: 85 },
  { name: "Chitchat", runs: 271, rate: 96 },
];
const sentiments = [
  { emoji: "😊", label: "Happy", pct: 52, bg: "!bg-primary-soft !text-primary !border-primary/20" },
  { emoji: "😐", label: "Neutral", pct: 31, bg: "" },
  { emoji: "😟", label: "Worried", pct: 9, bg: "!bg-warning/15 !text-warning !border-warning/30" },
  { emoji: "😠", label: "Angry", pct: 5, bg: "!bg-destructive/10 !text-destructive !border-destructive/20" },
  { emoji: "😞", label: "Disappointed", pct: 3, bg: "" },
];
const channels = [
  { name: "Website", count: 1240, pct: 43, color: "bg-primary" },
  { name: "Zalo", count: 980, pct: 34, color: "bg-accent" },
  { name: "Facebook", count: 621, pct: 23, color: "bg-info" },
];
const history = [
  { id: 1, channel: "Web", chBg: "bg-primary-soft text-primary", user: "A2841", topic: "Lock credit card", time: "14:32 today", msgs: 4, ok: true },
  { id: 2, channel: "Zalo", chBg: "bg-accent-soft text-accent", user: "A2840", topic: "Loan interest rates", time: "14:18 today", msgs: 6, ok: true },
  { id: 3, channel: "FB", chBg: "bg-info/15 text-info", user: "A2839", topic: "Mortgage consultation", time: "13:55 today", msgs: 8, ok: false },
];
