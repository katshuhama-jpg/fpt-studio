import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Play, Save, Rocket, MoreHorizontal, BookOpen, Wrench, ListChecks,
  Zap, Cog, MessageSquareText, FileQuestion, Sparkles,
  Search, Upload, Globe, Database, Plus, Layers, CheckCircle2, Send,
  ArrowRight, Shield, ChevronDown, FileText, Trash2, MessageSquare, Activity,
  Star, Users as UsersIcon, History, Download, X, SlidersHorizontal, Smartphone, Monitor,
} from "lucide-react";
import { useEffect, useState } from "react";
import AgentToolsTab from "@/components/tool-builder/AgentToolsTab";
import TasksGrid from "@/components/tasks/TasksGrid";
import BusinessProcessesGrid from "@/components/business-processes/BusinessProcessesGrid";
import TriggersTab from "@/components/configure/TriggersTab";
import GuardrailsTab from "@/components/configure/GuardrailsTab";
import ChatOptimizationTab from "@/components/configure/ChatOptimizationTab";
import { businessProcessStore } from "@/components/business-processes/businessProcessStore";
import { taskStore } from "@/components/tasks/taskStore";
import { knowledgeStore } from "@/components/knowledge/knowledgeStore";
import { triggerStore } from "@/components/configure/triggerStore";
import { guardrailStore } from "@/components/configure/guardrailStore";
import { chatOptimizationStore } from "@/components/configure/chatOptimizationStore";
import { updateUser } from "@/lib/onboarding";

type Tab = "develop" | "monitor";

const developNav = [
  {
    label: "Build",
    items: [
      { id: "general", label: "General", icon: Cog, status: "done" },
      { id: "bp", label: "Business processes", icon: Layers, status: "done" },
      { id: "knowledge", label: "Knowledge", icon: BookOpen, status: "done" },
      { id: "tool", label: "Tools", icon: Wrench, status: "warn" },
      { id: "task", label: "Tasks", icon: ListChecks, status: "empty" },
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
    label: "Configure",
    items: [
      { id: "triggers", label: "Triggers", icon: Zap, status: "empty" },
      { id: "guardrails", label: "Guardrails", icon: Shield, status: "done" },
      { id: "chat-opt", label: "Chat optimization", icon: MessageSquareText, status: "done" },
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
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const welcome = params.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(welcome);
  useEffect(() => { setShowWelcome(welcome); }, [welcome]);
  const dismissWelcome = () => {
    setShowWelcome(false);
    updateUser({ welcomeSeen: true });
    const p = new URLSearchParams(params);
    p.delete("welcome");
    setParams(p, { replace: true });
  };

  const setTab = (t: Tab) => setParams({ tab: t, section: t === "develop" ? "general" : "perf" });
  const setSection = (s: string) => setParams({ tab, section: s });

  const nav = tab === "develop" ? developNav : monitorNav;
  const currentSectionLabel =
    nav.flatMap(g => g.items).find((i: any) => i.id === section)?.label ?? section;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate("/agents")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base">
          <ChevronLeft size={15} /> Agents
        </button>
        <div className="w-px h-5 bg-border" />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
          <div className="w-7 h-7 rounded-md bg-primary-soft flex items-center justify-center text-sm shrink-0">🏦</div>
          <span className="font-semibold truncate">Banking ABC — Customer Care</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground capitalize">{tab}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground capitalize truncate">{currentSectionLabel}</span>
          <span className="ml-2 chip chip-primary">Published</span>
          <button className="chip hover:bg-surface-muted transition-base">
            <History size={10} /> v3.1
          </button>
        </nav>

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
          <button
            onClick={() => setAiChatOpen(v => !v)}
            className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-base ${
              aiChatOpen
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary-glow"
                : "border-primary/30 bg-primary-soft text-primary hover:bg-primary-soft/70"
            }`}
          >
            <Sparkles size={13} /> Refine with AI
          </button>
          <button className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base">
            <Save size={13} /> Save
          </button>
          <button className="btn-primary h-9">
            <Rocket size={13} /> Publish
          </button>
          <button className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Welcome banner (first-time onboarding success) */}
      {showWelcome && (
        <div className="border-b border-primary/20 bg-primary-soft px-4 py-3 flex items-center gap-3 animate-fade-up shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center text-primary-foreground shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">🎉 Your first agent is ready</div>
            <div className="text-xs text-muted-foreground truncate">
              Try chatting on the right, or tweak knowledge & tools below.
            </div>
          </div>
          <button onClick={dismissWelcome} className="btn-secondary h-8 px-3 text-xs">Got it</button>
          <button onClick={dismissWelcome} className="btn-primary h-8 px-3 text-xs">
            <Play size={12} /> Test now
          </button>
          <button onClick={dismissWelcome} className="h-8 w-8 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left nav (agent-only) — hidden when AI chat is open */}
        {!aiChatOpen && (
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
                        {it.status === "warn" && <span className="w-1.5 h-1.5 rounded-full bg-warning" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 pt-0">
              <button
                onClick={() => setAiChatOpen(true)}
                className="w-full h-9 rounded-lg border border-primary/30 bg-primary-soft text-primary hover:bg-primary-soft/70 text-xs font-medium flex items-center justify-center gap-1.5 transition-base"
              >
                <Sparkles size={12} /> Refine with AI
              </button>
            </div>
          </aside>
        )}

        {/* AI chat sidebar — replaces left nav when active */}
        {aiChatOpen && (
          <AiBuildSidebar
            onClose={() => setAiChatOpen(false)}
            contextLabel={currentSectionLabel}
            sections={nav.flatMap(g => g.items)}
            currentSection={section}
            onSectionChange={setSection}
          />
        )}

        {/* Content + Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-gradient-soft">
            {tab === "develop" && section === "general" && <GeneralTab />}
            {tab === "develop" && section === "bp" && <BusinessProcessesGrid agentId={id} />}
            {tab === "develop" && section === "knowledge" && <KnowledgeTab />}
            {tab === "develop" && section === "tool" && <AgentToolsTab agentId={id} />}
            {tab === "develop" && section === "task" && <TasksGrid agentId={id} />}
            {tab === "develop" && section === "triggers" && <TriggersTab agentId={id} />}
            {tab === "develop" && section === "guardrails" && <GuardrailsTab agentId={id} />}
            {tab === "develop" && section === "chat-opt" && <ChatOptimizationTab agentId={id} />}
            {tab === "develop" && !["general", "bp", "knowledge", "tool", "task", "triggers", "guardrails", "chat-opt"].includes(section) && <PlaceholderTab title={section} />}
            {tab === "monitor" && section === "perf" && <PerformanceTab />}
            {tab === "monitor" && section !== "perf" && <PlaceholderTab title={section} />}
          </div>

          {tab === "develop" && <PreviewPanel />}
        </div>
      </div>
    </div>
  );
}

/* ============ AI BUILD SIDEBAR (left chat panel) ============ */
function AiBuildSidebar({
  onClose, contextLabel, sections, currentSection, onSectionChange,
}: {
  onClose: () => void;
  contextLabel: string;
  sections: any[];
  currentSection: string;
  onSectionChange: (s: string) => void;
}) {
  const quickActions = [
    "Tighten the system prompt",
    "Add a guardrail against legal advice",
    "Draft 5 opening questions",
    "Make tone more formal",
  ];
  return (
    <aside className="w-[360px] border-r border-border bg-surface flex flex-col shrink-0 animate-fade-up">
      {/* Header */}
      <div className="h-12 px-3 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-gradient-brand flex items-center justify-center">
          <Sparkles size={13} className="text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">Refine with AI</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Chat to edit your agent</div>
        </div>
        <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
          <X size={15} />
        </button>
      </div>

      {/* Context picker */}
      <div className="px-3 py-2 border-b border-border bg-surface-muted/40 shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Editing context
        </div>
        <div className="flex flex-wrap gap-1">
          {sections.map((s: any) => (
            <button
              key={s.id}
              onClick={() => onSectionChange(s.id)}
              className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 transition-base ${
                currentSection === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface border border-border hover:bg-primary-soft hover:text-primary"
              }`}
            >
              <s.icon size={10} />@{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="bg-surface-muted/60 border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 text-[13px]">
          Hi Nam — I'm focused on <b>@{contextLabel}</b>. Tell me what to change and I'll propose a diff you can approve.
        </div>

        {/* Diff card */}
        <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} className="text-primary" />
            <span className="text-[10px] font-semibold text-primary">Proposed change · System prompt</span>
          </div>
          <div className="space-y-1 font-mono text-[10.5px]">
            <div className="bg-destructive/10 text-destructive px-2 py-1 rounded line-through">
              − Help customers 24/7 in a friendly tone.
            </div>
            <div className="bg-success/10 text-success px-2 py-1 rounded">
              + Help customers 24/7 in a professional, empathetic tone. Verify identity before any sensitive action.
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <button className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium">Apply</button>
            <button className="h-7 px-2.5 rounded-md hover:bg-surface-muted text-[11px] text-muted-foreground">Discard</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickActions.map(s => (
            <button key={s} className="text-[10.5px] px-2 py-1 rounded-full bg-surface border border-border hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-base">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 shrink-0 bg-surface">
        <div className="rounded-xl border border-border bg-surface focus-within:border-primary focus-within:ring-glow transition-base p-1.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] font-medium text-primary bg-primary-soft px-1.5 py-0.5 rounded">
              @{contextLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">context</span>
          </div>
          <div className="flex items-end gap-1.5">
            <textarea
              rows={2}
              placeholder={`Update ${contextLabel.toLowerCase()}…`}
              className="flex-1 resize-none bg-transparent text-[13px] placeholder:text-muted-foreground outline-none px-1 py-0.5 max-h-32"
            />
            <button className="h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary-glow flex items-center justify-center transition-base shrink-0">
              <Send size={12} />
            </button>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 px-1">
          Tip: pick a chip above to switch the section being edited.
        </div>
      </div>
    </aside>
  );
}

/* ============ GENERAL ============ */
function GeneralTab() {
  const { id = "cskh" } = useParams();
  const [, setParams] = useSearchParams();
  const goSection = (s: string) => setParams({ tab: "develop", section: s });

  const bp = businessProcessStore.list(id);
  const tasks = taskStore.list(id);
  const knowledge = knowledgeStore.list(id);
  const triggers = triggerStore.list(id);
  const guardrails = guardrailStore.list(id);
  const chatOpt = chatOptimizationStore.get(id);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-fade-up">
      {/* Always visible: identity */}
      <Section icon={Cog} title="Persona & guideline" desc="Define identity, tone and operating instructions.">
        <Field label="Agent name">
          <input className="ds-input" defaultValue="Banking ABC — Customer Care" />
        </Field>
        <Field label="System prompt">
          <textarea
            className="ds-textarea min-h-[120px]"
            defaultValue="You are a customer-care specialist at ABC Bank. Help customers 24/7 with products, services and banking requests in a professional, friendly tone. Always verify identity before performing sensitive actions."
          />
        </Field>
        <Field label="Model">
          <button className="ds-input flex items-center gap-2 cursor-pointer">
            <span className="w-6 h-6 rounded bg-accent-soft flex items-center justify-center text-xs">✨</span>
            <span className="flex-1 text-left">Gemini 1.5 Pro</span>
            <span className="chip chip-primary">FPT Marketplace</span>
            <ChevronDown size={14} />
          </button>
        </Field>
      </Section>

      {/* Accordion: all other config groups */}
      <div className="space-y-2">
        <ConfigAccordion
          icon={Layers}
          title="Business processes"
          count={bp.length}
          desc="Multi-step flows the agent can run."
          onManage={() => goSection("bp")}
        >
          {bp.slice(0, 5).map(b => (
            <SummaryRow
              key={b.id}
              name={b.name}
              meta={b.strategy}
              chip={b.isDefault ? "default" : undefined}
              enabled={b.enabled}
            />
          ))}
          {bp.length > 5 && <MoreLink count={bp.length - 5} onClick={() => goSection("bp")} />}
        </ConfigAccordion>

        <ConfigAccordion
          icon={Wrench}
          title="Tools"
          count={5}
          desc="External APIs and integrations the agent can call."
          onManage={() => goSection("tool")}
        >
          {[
            { name: "verify_customer", meta: "REST" },
            { name: "lock_card", meta: "REST" },
            { name: "search_products", meta: "GraphQL" },
            { name: "send_email", meta: "Built-in" },
            { name: "schedule_meeting", meta: "Calendar" },
          ].map(t => (
            <SummaryRow key={t.name} name={t.name} meta={t.meta} enabled />
          ))}
        </ConfigAccordion>

        <ConfigAccordion
          icon={Workflow}
          title="Tasks"
          count={tasks.length}
          desc="Reusable skills made of prompts and tool calls."
          onManage={() => goSection("task")}
        >
          {tasks.slice(0, 5).map(t => (
            <SummaryRow key={t.id} name={t.name} meta={t.kind} chip={t.kind === "system" ? "system" : undefined} enabled />
          ))}
          {tasks.length > 5 && <MoreLink count={tasks.length - 5} onClick={() => goSection("task")} />}
        </ConfigAccordion>

        <ConfigAccordion
          icon={BookOpen}
          title="Knowledge"
          count={knowledge.length}
          desc="Documents, FAQs and websites this agent can retrieve from."
          onManage={() => goSection("knowledge")}
        >
          {knowledge.slice(0, 5).map(k => (
            <SummaryRow key={k.id} name={k.name} meta={k.kind} enabled />
          ))}
          {knowledge.length > 5 && <MoreLink count={knowledge.length - 5} onClick={() => goSection("knowledge")} />}
        </ConfigAccordion>

        <ConfigAccordion
          icon={Zap}
          title="Triggers"
          count={triggers.length}
          desc="When and how the agent runs."
          onManage={() => goSection("triggers")}
        >
          {triggers.slice(0, 5).map(t => (
            <SummaryRow key={t.id} name={t.name} meta={t.type} enabled={t.enabled} />
          ))}
          {triggers.length > 5 && <MoreLink count={triggers.length - 5} onClick={() => goSection("triggers")} />}
        </ConfigAccordion>

        <ConfigAccordion
          icon={Shield}
          title="Guardrails"
          count={guardrails.length}
          desc="Rules the agent must respect on input and output."
          onManage={() => goSection("guardrails")}
        >
          {guardrails.slice(0, 5).map(g => (
            <SummaryRow key={g.id} name={g.name} meta={`${g.kind} · ${g.scope}`} enabled={g.enabled} />
          ))}
          {guardrails.length > 5 && <MoreLink count={guardrails.length - 5} onClick={() => goSection("guardrails")} />}
        </ConfigAccordion>

        <ConfigAccordion
          icon={MessageSquareText}
          title="Chat optimization"
          desc="References, opener, quick replies, rich response, follow-ups."
          onManage={() => goSection("chat-opt")}
        >
          <SummaryRow name="References" meta={chatOpt.references.format} enabled={chatOpt.references.enabled} />
          <SummaryRow name="Conversation opener" meta={`${chatOpt.opener.questions.length} questions`} enabled />
          <SummaryRow name="Quick-reply buttons" meta={`${chatOpt.quickReplies.buttons.length} buttons`} enabled={chatOpt.quickReplies.enabled} />
          <SummaryRow name="Rich response" meta={`${chatOpt.rich.cardBindings.length} bindings`} enabled={chatOpt.rich.enabled} />
          <SummaryRow name="Follow-up suggestions" meta={`${chatOpt.followup.count} · ${chatOpt.followup.source}`} enabled={chatOpt.followup.enabled} />
        </ConfigAccordion>
      </div>
    </div>
  );
}

/* ----- General accordion atoms ----- */
function ConfigAccordion({
  icon: Icon, title, desc, count, onManage, children,
}: {
  icon: any; title: string; desc?: string; count?: number;
  onManage: () => void; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-sm">{title}</h3>
              {typeof count === "number" && (
                <span className="chip text-[10px]">{count}</span>
              )}
            </div>
            {desc && <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>}
          </div>
          <ChevronDown
            size={16}
            className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          onClick={onManage}
          className="text-xs font-medium text-primary hover:bg-primary-soft px-2.5 h-8 rounded-md flex items-center gap-1 transition-base shrink-0"
        >
          Manage <ArrowRight size={12} />
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-surface-muted/30 px-4 py-3 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  name, meta, chip, enabled,
}: { name: string; meta?: string; chip?: string; enabled?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface transition-base">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${enabled ? "bg-success" : "bg-muted-foreground/40"}`} />
      <span className="text-sm font-medium truncate flex-1">{name}</span>
      {chip && <span className="chip chip-primary text-[10px]">{chip}</span>}
      {meta && <span className="text-[11px] text-muted-foreground capitalize">{meta}</span>}
    </div>
  );
}

function MoreLink({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-xs text-primary hover:underline px-2 py-1.5 text-left"
    >
      + {count} more…
    </button>
  );
}

/* ============ KNOWLEDGE ============ */
function KnowledgeTab() {
  const sources = [
    { name: "Brochure 2024.pdf", type: "PDF", size: "2.4 MB", chunks: 184, version: "v2", icon: FileText, color: "text-destructive" },
    { name: "Customer FAQ", type: "FAQ", size: "47 entries", chunks: 47, version: "v5", icon: MessageSquareText, color: "text-primary" },
    { name: "abcbank.com/products", type: "Web", size: "32 pages", chunks: 312, version: "v1", icon: Globe, color: "text-info" },
    { name: "Internal Policy v3", type: "Sharepoint", size: "1.1 MB", chunks: 96, version: "v3", icon: Database, color: "text-accent" },
  ];
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-fade-up">
      <Section icon={BookOpen} title="Agent knowledge" desc="Sources this agent can retrieve from at run time.">
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

        <div className="rounded-lg overflow-hidden border border-border">
          <div className="grid grid-cols-[1fr,80px,90px,70px,70px,40px] gap-3 px-4 py-2.5 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Source</div><div>Type</div><div>Size</div><div>Chunks</div><div>Version</div><div></div>
          </div>
          {sources.map(s => (
            <div key={s.name} className="grid grid-cols-[1fr,80px,90px,70px,70px,40px] gap-3 px-4 py-3 border-t border-border items-center hover:bg-surface-muted/50 transition-base group">
              <div className="flex items-center gap-2.5 min-w-0">
                <s.icon size={15} className={s.color} />
                <span className="text-sm font-medium truncate">{s.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">{s.type}</div>
              <div className="text-xs text-muted-foreground">{s.size}</div>
              <div className="text-xs font-mono">{s.chunks}</div>
              <div><span className="chip text-[10px]">{s.version}</span></div>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-base">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ============ TASKS LIST ============ */
function TasksList({ agentId }: { agentId: string }) {
  const tasks = [
    { id: "lock-card", name: "Lock credit card", type: "Workflow", steps: 5, version: "v3", updated: "2m ago", status: "active" },
    { id: "lookup", name: "Product information lookup", type: "QnA", steps: 2, version: "v1", updated: "1d ago", status: "active" },
    { id: "schedule", name: "Schedule consultation", type: "Workflow", steps: 4, version: "v2", updated: "3d ago", status: "draft" },
  ];
  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-up">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Each task is a self-contained skill. Click to open the full editor.</p>
        </div>
        <button className="btn-primary h-9"><Plus size={13} /> New task</button>
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr,110px,80px,80px,110px,40px] gap-3 px-5 py-3 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Task</div><div>Type</div><div>Steps</div><div>Version</div><div>Updated</div><div></div>
        </div>
        {tasks.map(t => (
          <Link
            key={t.id}
            to={`/agents/${agentId}/tasks/${t.id}`}
            className="grid grid-cols-[1fr,110px,80px,80px,110px,40px] gap-3 px-5 py-3.5 border-t border-border items-center hover:bg-surface-muted/50 transition-base group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2 h-2 rounded-full ${t.status === "active" ? "bg-success" : "bg-muted-foreground/40"}`} />
              <span className="text-sm font-medium truncate">{t.name}</span>
            </div>
            <div><span className={`chip ${t.type === "Workflow" ? "chip-accent" : "chip-primary"} text-[10px]`}>{t.type}</span></div>
            <div className="text-xs font-mono">{t.steps}</div>
            <div className="text-xs"><span className="chip text-[10px]">{t.version}</span></div>
            <div className="text-xs text-muted-foreground">{t.updated}</div>
            <ArrowRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-base" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ============ ADVANCED (consolidated) ============ */
function AdvancedTab() {
  const [active, setActive] = useState("opening");
  const groups = [
    { id: "opening", label: "Opening questions", desc: "Suggested first messages shown to users." },
    { id: "suggest", label: "Auto-suggestion", desc: "Follow-up prompts surfaced after each reply." },
    { id: "ref", label: "Show references", desc: "Display source citations alongside answers." },
    { id: "convo", label: "Conversation memory", desc: "How long the agent remembers context." },
    { id: "topics", label: "Topics", desc: "Restrict the agent to defined topic areas." },
    { id: "reminders", label: "Reminders", desc: "Scheduled nudges and re-engagement." },
    { id: "auth", label: "Credentials", desc: "Per-agent secrets and API tokens." },
  ];
  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-up">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold">Advanced</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Power-user settings consolidated in one place.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
        <nav className="space-y-0.5">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActive(g.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base ${
                active === g.id ? "bg-primary-soft text-primary font-medium" : "text-foreground hover:bg-surface-muted"
              }`}
            >
              {g.label}
            </button>
          ))}
        </nav>
        <div className="rounded-xl bg-surface border border-border p-6">
          <h3 className="font-display font-semibold text-base mb-1">{groups.find(g => g.id === active)?.label}</h3>
          <p className="text-xs text-muted-foreground mb-5">{groups.find(g => g.id === active)?.desc}</p>
          {active === "opening" ? (
            <div className="space-y-2">
              {["What products do you offer?", "How do I lock my card?", "Book a consultation"].map((q, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted">
                  <span className="text-[10px] font-mono text-muted-foreground w-6">#{i + 1}</span>
                  <input defaultValue={q} className="flex-1 bg-transparent text-sm outline-none" />
                  <button className="text-muted-foreground hover:text-destructive transition-base"><Trash2 size={12} /></button>
                </div>
              ))}
              <button className="btn-ghost"><Plus size={11} /> Add question</button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">Settings for this section.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ MONITOR / PERFORMANCE ============ */
function PerformanceTab() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-5 animate-fade-up">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="surface-card p-4">
            <div className="text-[11px] text-muted-foreground mb-1">{m.label}</div>
            <div className="font-display text-2xl font-semibold tracking-tight">{m.value}</div>
            <div className={`text-[11px] mt-1 ${m.trend === "up" ? "text-success" : "text-destructive"}`}>
              {m.trend === "up" ? "↑" : "↓"} {m.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold">Conversations by day</h3>
          <span className="text-[11px] text-muted-foreground">Last 7 days</span>
        </div>
        <div className="flex items-end gap-2 h-40 mb-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer">
              <div
                className={`rounded-t-md transition-base ${i === 5 ? "bg-accent" : "bg-primary"} ${i !== 5 ? "opacity-70" : ""}`}
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
    </div>
  );
}

/* TOOLS — moved to src/components/tool-builder/AgentToolsTab.tsx */

/* ============ PLACEHOLDER ============ */
function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
        <SlidersHorizontal size={26} className="text-primary" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2 capitalize">{title.replace(/-/g, " ")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This section is part of the v2 mockup. Layout and tokens are wired — content can be designed next.
      </p>
    </div>
  );
}

/* ============ PREVIEW PANEL — clearly distinct (device frame) ============ */
function PreviewPanel() {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  return (
    <aside className="w-[320px] border-l border-border bg-surface-muted/40 flex flex-col shrink-0">
      <div className="px-4 h-12 border-b border-border bg-surface flex items-center gap-2 shrink-0">
        <div className="text-sm font-semibold flex-1">Live preview</div>
        <div className="flex items-center bg-surface-muted rounded-md p-0.5">
          <button onClick={() => setDevice("mobile")} className={`h-6 w-6 rounded flex items-center justify-center transition-base ${device === "mobile" ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground"}`}>
            <Smartphone size={11} />
          </button>
          <button onClick={() => setDevice("desktop")} className={`h-6 w-6 rounded flex items-center justify-center transition-base ${device === "desktop" ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground"}`}>
            <Monitor size={11} />
          </button>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-success font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" /> LIVE
        </span>
      </div>

      {/* Phone-style chrome to make it visually distinct from the build-chat */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="flex-1 rounded-[28px] bg-surface border border-border-strong shadow-elev overflow-hidden flex flex-col mx-auto w-full max-w-[280px]">
          <div className="h-9 bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-semibold">
            Banking ABC
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-soft">
            <Bubble side="user">Hi, I lost my card and want to lock it.</Bubble>
            <Bubble side="agent">
              I'm sorry to hear that. Could you share the phone number registered with your account?
            </Bubble>
            <div className="text-[9px] italic text-muted-foreground bg-warning-soft border border-warning/30 rounded-md px-2 py-1 font-mono">
              calling <code>verify_customer</code>… ✓
            </div>
            <Bubble side="agent">
              Verified ✓ — locking card ending <b>•••• 4421</b>. Confirm?
            </Bubble>
          </div>
          <div className="border-t border-border p-2 bg-surface flex items-center gap-1">
            <input className="flex-1 bg-surface-muted rounded-full text-[11px] px-3 py-1.5 outline-none placeholder:text-muted-foreground" placeholder="Type a message…" />
            <button className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Send size={11} /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-3 justify-center">
          {["Lock my card", "Loan rates", "Book consult"].map(q => (
            <button key={q} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border hover:bg-surface-muted text-muted-foreground transition-base">
              {q}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ============ atoms ============ */
function Section({ icon: Icon, title, desc, children, action }: any) {
  return (
    <section>
      <header className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
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
function ProcessItem({ num, name, type, typeColor, highlighted }: any) {
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg transition-base ${highlighted ? "bg-primary-soft/50 ring-1 ring-primary/20" : "bg-surface-muted hover:bg-surface-muted/70"}`}>
      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold font-display flex items-center justify-center shrink-0">{num}</div>
      <span className="text-sm font-medium flex-1">{name}</span>
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${typeColor}`}>{type}</span>
      <ChevronDown size={14} className="text-muted-foreground" />
    </div>
  );
}
function Bubble({ side, children }: { side: "user" | "agent"; children: any }) {
  return (
    <div className={`flex ${side === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] text-[11px] leading-relaxed rounded-2xl px-2.5 py-1.5 ${
          side === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-surface border border-border rounded-bl-sm"
        }`}
      >
        {children}
      </div>
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
