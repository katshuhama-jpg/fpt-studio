import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";

import { HugeiconsIcon } from "@hugeicons/react"
import { Activity01Icon, Add01Icon, Alert01Icon, Analytics01Icon, ArrowRight01Icon, BookOpen01Icon, Cancel01Icon, BoltIcon, CheckListIcon, CheckmarkCircle01Icon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, Clock01Icon, CogIcon, CpuIcon, Database01Icon, Delete01Icon, Download01Icon, Edit01Icon, EyeIcon, FileEditIcon, FileQuestionMarkIcon, FlaskConicalIcon, FloppyDiskIcon, FlowCircleIcon, Globe02Icon, HistoryIcon, LayerAddIcon, MessageAdd01Icon, Chat01Icon, MonitorDotIcon, MoreHorizontalIcon, PencilEdit01Icon, PlayCircleIcon, Plug01Icon, PuzzleIcon, Robot01Icon, Rocket01Icon, Search01Icon, SentIcon, Shield01Icon, SlidersHorizontalIcon, SmartPhone01Icon, SparklesIcon, StarIcon, Touchpad01Icon, Upload01Icon, UserCheck01Icon, Wrench01Icon , Delete01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
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
import BusinessProcessTree from "@/components/general/BusinessProcessTree";

type Tab = "build" | "test" | "deploy" | "insights";

const developNav = [
  { id: "instructions", label: "Instructions", icon: FileText,  status: "done" },
  { id: "model",        label: "Model",         icon: Cpu,       status: "done" },
  { id: "tools",        label: "Tools",          icon: Wrench,    status: "done" },
  { id: "skills",       label: "Skills",         icon: Puzzle,    status: "empty" },
  { id: "guardrails",   label: "Guardrails",     icon: Shield,    status: "warn" },
  { id: "knowledge",    label: "Knowledge",      icon: BookOpen,  comingSoon: true },
  { id: "triggers",     label: "Triggers",       icon: Zap,       comingSoon: true },
  { id: "sub-agents",   label: "Sub-Agents",     icon: Bot,       comingSoon: true },
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
  const tab = (params.get("tab") as Tab) || "build";
  const section = params.get("section") || "instructions";
  const navigate = useNavigate();
  const buildModeParam = params.get("buildMode");
  const [buildMode, setBuildMode] = useState<"manual" | "ai">(buildModeParam === "ai" ? "ai" : "manual");
  const welcome = params.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(welcome);
  const [showPublish, setShowPublish] = useState(false);
  const [previewView, setPreviewView] = useState<"config" | "chat">("config");
  useEffect(() => { setShowWelcome(welcome); }, [welcome]);
  const dismissWelcome = () => {
    setShowWelcome(false);
    updateUser({ welcomeSeen: true });
    const p = new URLSearchParams(params);
    p.delete("welcome");
    setParams(p, { replace: true });
  };

  const setTab = (t: Tab) => setParams({ tab: t, section: "instructions" });
  const setSection = (s: string) => setParams({ tab, section: s });

  const nav = developNav;
  const currentSectionLabel =
    developNav.find((i: any) => i.id === section)?.label ?? section;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate("/agents")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
          <HugeiconsIcon icon={ChevronLeftIcon} size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-surface-muted border border-border flex items-center justify-center text-base shrink-0">🤖</div>
          <span className="font-semibold text-sm">làm báo cáo cho sale</span>
        </div>

        {/* Center tabs */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-0 bg-surface-muted rounded-lg p-1">
            {([
              { id: "build",    label: "Build",    Icon: PenLine },
              { id: "test",     label: "Test",     Icon: FlaskConical },
              { id: "deploy",   label: "Deploy",   Icon: Rocket },
              { id: "insights", label: "Insights", Icon: BarChart2 },
            ] as const).map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id as Tab)}
                className={`px-4 h-8 rounded-md text-sm font-medium flex items-center gap-1.5 transition-base ${
                  tab === id ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                }`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-success text-xs font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live · v1.0.1
          </div>
          <button onClick={() => setShowPublish(true)} className="btn-primary h-9">
            <HugeiconsIcon icon={Rocket01Icon} size={13} /> Publish
          </button>
          <button className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
          </button>
        </div>
      </div>

      {showPublish && (
        <PublishModal onClose={() => setShowPublish(false)} onChatTest={() => { setShowPublish(false); setPreviewView("chat"); }} />
      )}

      {/* Welcome banner (first-time onboarding success) */}
      {showWelcome && (
        <div className="border-b border-primary/20 bg-primary-soft px-4 py-3 flex items-center gap-3 animate-fade-up shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center text-primary-foreground shrink-0">
            <HugeiconsIcon icon={SparklesIcon} size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">🎉 Your first agent is ready</div>
            <div className="text-xs text-muted-foreground truncate">
              Try chatting on the right, or tweak knowledge & tools below.
            </div>
          </div>
          <button onClick={dismissWelcome} className="btn-secondary h-8 px-3 text-xs">Got it</button>
          <button onClick={dismissWelcome} className="btn-primary h-8 px-3 text-xs">
            <HugeiconsIcon icon={PlayCircleIcon} size={12} /> Test now
          </button>
          <button onClick={dismissWelcome} className="h-8 w-8 rounded-lg hover:bg-surface flex items-center justify-center text-muted-foreground" aria-label="Dismiss">
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left sidebar */}
        <aside
          className="border-r border-border overflow-hidden shrink-0 flex flex-col h-full"
          style={{
            background:"#ffffff",
            width: buildMode === "manual" ? "240px" : "0px",
            opacity: buildMode === "manual" ? 1 : 0,
            transition: "width 320ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease",
            minWidth: 0,
          }}
        >
          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {developNav.map((it: any) => (
              <button
                key={it.id}
                onClick={() => !it.comingSoon && setSection(it.id)}
                disabled={it.comingSoon}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-base ${
                  section === it.id && !it.comingSoon
                    ? "bg-primary-soft text-primary font-medium"
                    : it.comingSoon
                    ? "text-muted-foreground cursor-default opacity-70"
                    : "text-foreground hover:bg-surface-muted"
                }`}
              >
                <it.icon size={14} className="shrink-0" />
                <span className="flex-1 text-left truncate">{it.label}</span>
                {it.comingSoon && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-muted-foreground shrink-0 whitespace-nowrap">Coming soon</span>
                )}
              </button>
            ))}
          </nav>

          {/* Ready to publish + Collapse */}
          <div className="px-3 py-3 border-t border-border shrink-0 space-y-2">
            <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground">Ready to publish</span>
                <span className="text-xs text-muted-foreground">4/5</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
                <div className="h-full w-[80%] rounded-full bg-primary" />
              </div>
              <div className="space-y-1">
                {[
                  { label: "Instructions written", done: true },
                  { label: "Model chosen",          done: true },
                  { label: "Tools attached",        done: true },
                  { label: "Guardrails configured", done: false },
                  { label: "Tried the agent",       done: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs">
                    {item.done
                      ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} className="text-success shrink-0" />
                      : <span className="w-3 h-3 rounded-full border-2 border-muted-foreground shrink-0 inline-block" />}
                    <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setBuildMode("ai")}
              className="w-full h-8 rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-muted text-xs font-medium flex items-center justify-center gap-1.5 transition-base"
            >
              <HugeiconsIcon icon={ChevronLeftIcon} size={12} /> Collapse sidebar
            </button>
          </div>
        </aside>

        {/* AI chat sidebar — slides in from left */}
        <div
          style={{
            width: buildMode === "ai" ? "476px" : "0px",
            opacity: buildMode === "ai" ? 1 : 0,
            overflow: "hidden",
            flexShrink: 0,
            transition: "width 320ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease",
            minWidth: 0,
            height: "100%",
          }}
        >
          <AiBuildSidebar
            onClose={() => setBuildMode("manual")}
            contextLabel={currentSectionLabel}
            sections={nav.flatMap(g => g.items)}
            currentSection={section}
            onSectionChange={setSection}
            seedPrompt={params.get("agentPrompt") || ""}
          />
        </div>

        {/* Content + Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">

            <div className="flex-1 overflow-y-auto bg-background">
              {tab === "build" && section === "instructions" && <GeneralTab onRefineWithAI={() => setBuildMode("ai")} onChatToTest={() => { setBuildMode("manual"); setPreviewView("chat"); }} />}
              {tab === "build" && section === "knowledge" && <KnowledgeTab />}
              {tab === "build" && section === "tools" && <AgentToolsTab agentId={id ?? "new"} />}
              {tab === "build" && section === "skills" && <PlaceholderTab title="Skills" />}
              {tab === "build" && section === "guardrails" && <GuardrailsTab agentId={id ?? "new"} />}
              {tab === "build" && section === "model" && <PlaceholderTab title="Model" />}
              {tab === "build" && !["instructions","knowledge","tools","skills","guardrails","model"].includes(section) && <PlaceholderTab title={section} />}
              {tab === "test" && <PlaceholderTab title="Test" />}
              {tab === "deploy" && <PlaceholderTab title="Deploy" />}
              {tab === "insights" && <PerformanceTab />}
            </div>
          </div>

          {tab === "build" && <PreviewPanel view={previewView} onViewChange={setPreviewView} />}
        </div>
      </div>
    </div>
  );
}

/* ============ AI BUILD SIDEBAR (left chat panel) ============ */

/* --- message types --- */
type MsgRole = "user" | "ai";
type AiMsg =
  | { kind: "text"; role: MsgRole; text: string; streaming?: boolean }
  | { kind: "tool"; name: string; done: boolean }
  | { kind: "diff"; before: string; after: string; applied?: boolean }
  | { kind: "clarify"; question: string; options: ClarifyOption[]; answered?: string }
  | { kind: "connector"; service: string; logo: string; perms: string[]; connected?: boolean };

interface ClarifyOption { icon: string; title: string; desc: string; }

function AiBuildSidebar({
  onClose, contextLabel, sections, currentSection, onSectionChange, seedPrompt,
}: {
  onClose: () => void;
  contextLabel: string;
  sections: any[];
  currentSection: string;
  onSectionChange: (s: string) => void;
  seedPrompt?: string;
}) {
  const initMessages = (): AiMsg[] => {
    const base: AiMsg[] = [
      { kind: "text", role: "ai", text: `Hi Nam — I'm focused on @${contextLabel}. Tell me what to change and I'll propose edits you can review.` },
    ];
    if (seedPrompt) {
      base.push({ kind: "text", role: "user", text: seedPrompt });
      base.push({ kind: "tool", name: `analyze_request("${seedPrompt.slice(0, 30)}…")`, done: true });
      base.push({ kind: "text", role: "ai", text: "Tôi đã phân tích yêu cầu. Đây là đề xuất system prompt ban đầu:" });
      base.push({ kind: "diff", before: "Help customers 24/7 in a friendly tone.", after: seedPrompt.slice(0, 100) + (seedPrompt.length > 100 ? "…" : "") });
    }
    return base;
  };

  const [messages, setMessages] = useState<AiMsg[]>(initMessages);
  const [input, setInput] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const push = (msg: AiMsg) => setMessages(m => [...m, msg]);

  const streamAi = (text: string) => {
    push({ kind: "text", role: "ai", text: "", streaming: true });
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i > text.length) { clearInterval(iv); setMessages(m => m.map((x, idx) => idx === m.length - 1 && x.kind === "text" && x.streaming ? { ...x, text, streaming: false } : x)); return; }
      setMessages(m => m.map((x, idx) => idx === m.length - 1 && x.kind === "text" && x.streaming ? { ...x, text: text.slice(0, i) } : x));
    }, 14);
  };

  const runTool = async (name: string): Promise<void> => {
    push({ kind: "tool", name, done: false });
    await new Promise(r => setTimeout(r, 900));
    setMessages(m => m.map(x => x.kind === "tool" && x.name === name && !x.done ? { ...x, done: true } : x));
    await new Promise(r => setTimeout(r, 200));
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");
    push({ kind: "text", role: "user", text: msg });
    await new Promise(r => setTimeout(r, 400));

    // Connector auth demo flow
    const lower = msg.toLowerCase();
    if (lower.includes("gmail") || lower.includes("email") || lower.includes("outlook")) {
      const svc = lower.includes("outlook") ? "Outlook" : "Gmail";
      await runTool(`check_connector_auth("${svc}")`);
      streamAi(`Agent cần quyền truy cập ${svc} để gửi/đọc email thay bạn. Vui lòng xác nhận kết nối bên dưới.`);
      await new Promise(r => setTimeout(r, 800));
      push({
        kind: "connector",
        service: svc,
        logo: svc === "Gmail" ? "📧" : "📨",
        perms: [
          "Đọc email và metadata",
          "Gửi email thay bạn",
          "Quản lý nhãn (labels)",
        ],
      });
      return;
    }

    await runTool(`analyze_request("${msg.slice(0, 22)}…")`);
    push({
      kind: "clarify",
      question: `"${msg.slice(0, 32)}${msg.length > 32 ? "…" : ""}" — agent xử lý theo cách nào?`,
      options: [
        { icon: "bolt", title: "Tự động hoàn toàn", desc: "Agent tự quyết định, không cần hỏi thêm" },
        { icon: "eye", title: "Đề xuất, bạn duyệt", desc: "Agent soạn đề xuất, bạn approve trước khi apply" },
        { icon: "hand-stop", title: "Chỉ khi được yêu cầu", desc: "Agent chờ lệnh cụ thể từ người dùng" },
      ],
    });
  };

  const handleAnswer = async (idx: number, answer: string, msgIdx: number) => {
    setMessages(m => m.map((x, i) => i === msgIdx && x.kind === "clarify" ? { ...x, answered: answer } : x));
    await new Promise(r => setTimeout(r, 400));
    const replies = [
      "Rõ — chế độ tự động. Tôi cập nhật instructions:",
      "Hiểu — agent soạn đề xuất trước khi apply:",
      "OK — agent chờ lệnh, không tự động:",
    ];
    streamAi(idx === -1 ? `Hiểu rồi — "${answer.slice(0, 55)}". Tôi cấu hình theo yêu cầu này:` : replies[idx]);
    await new Promise(r => setTimeout(r, 600));
    push({ kind: "diff", before: "Current agent behavior.", after: idx === -1 ? answer.slice(0, 80) : ["Act autonomously without confirmation.", "Always draft a proposal for user review before applying.", "Only act when explicitly instructed."][idx] });
  };

  const handleConnectorConnect = (service: string) =>
    setMessages(m => m.map(x => x.kind === "connector" && x.service === service ? { ...x, connected: true } : x));

  const handleDiffApply = (msgIdx: number) =>
    setMessages(m => m.map((x, i) => i === msgIdx && x.kind === "diff" ? { ...x, applied: true } : x));

  const quickActions = ["Connect Gmail", "Tighten the system prompt", "Add a guardrail against legal advice", "Make tone more formal"];

  return (
    <aside className="w-[476px] border-r border-border flex flex-col shrink-0 h-full" style={{background:"#ffffff", minWidth:"476px"}}>
      {/* Header */}
      <div className="h-12 px-3 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-gradient-brand flex items-center justify-center">
          <HugeiconsIcon icon={SparklesIcon} size={13} className="text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">Refine with AI</div>
          <div className="text-xs text-muted-foreground leading-tight">Chat to edit your agent</div>
        </div>
        <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
          <HugeiconsIcon icon={Cancel01Icon} size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((msg, i) => {
          if (msg.kind === "text" && msg.role === "user") return (
            <div key={i} className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-xs max-w-[90%] leading-relaxed">{msg.text}</div>
            </div>
          );
          if (msg.kind === "text" && msg.role === "ai") return (
            <div key={i} className="bg-surface-muted/60 border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 text-sm leading-relaxed w-full">
              {msg.text}{msg.streaming && <span className="inline-block w-0.5 h-3 bg-muted-foreground ml-0.5 animate-pulse align-middle" />}
            </div>
          );
          if (msg.kind === "tool") return (
            <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs w-fit border ${msg.done ? "border-success/30 bg-success/10 text-success" : "border-primary/30 bg-primary-soft text-primary"}`}>
              {msg.done ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> : <HugeiconsIcon icon={SparklesIcon} size={11} className="animate-pulse" />}
              {msg.name}
            </div>
          );
          if (msg.kind === "diff") return (
            <div key={i} className="rounded-xl border border-primary/30 bg-primary-soft/40 p-2.5">
              {msg.applied ? (
                <div className="flex items-center gap-1.5 text-xs text-success"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> Applied to system prompt</div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-2"><HugeiconsIcon icon={SparklesIcon} size={11} className="text-primary" /><span className="text-xs font-semibold text-primary">Proposed change · System prompt</span></div>
                  <div className="font-mono text-xs space-y-1">
                    <div className="bg-destructive/10 text-destructive px-2 py-1 rounded line-through">− {msg.before}</div>
                    <div className="bg-success/10 text-success px-2 py-1 rounded">+ {msg.after}</div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => handleDiffApply(i)} className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Apply</button>
                    <button onClick={() => setMessages(m => m.filter((_, j) => j !== i))} className="h-7 px-2.5 rounded-md hover:bg-surface-muted text-xs text-muted-foreground">Discard</button>
                  </div>
                </>
              )}
            </div>
          );
          if (msg.kind === "clarify") return (
            <div key={i} className="rounded-xl border border-primary/20 bg-primary-soft/20 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary"><HugeiconsIcon icon={Chat01Icon} size={11} /> Cần thêm thông tin</div>
              <p className="text-xs text-foreground leading-relaxed">{msg.question}</p>
              {msg.answered ? (
                <div className="flex items-center gap-1.5 text-xs text-primary"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> Đã chọn: <strong>{msg.answered}</strong></div>
              ) : (
                <div className="space-y-1.5">
                  {msg.options.map((opt, oi) => (
                    <button key={oi} onClick={() => handleAnswer(oi, opt.title, i)}
                      className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg border border-border bg-surface hover:border-primary/40 hover:bg-primary-soft/30 transition-base text-left">
                      <div className="w-6 h-6 rounded-md bg-surface-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                        {oi === 0 ? <HugeiconsIcon icon={BoltIcon} size={11} className="text-primary" /> : oi === 1 ? <HugeiconsIcon icon={BookOpen01Icon} size={11} className="text-primary" /> : <HugeiconsIcon icon={Shield01Icon} size={11} className="text-primary" />}
                      </div>
                      <div><div className="text-xs font-medium">{opt.title}</div><div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div></div>
                    </button>
                  ))}
                  {/* Custom input — always visible */}
                  <div className="border border-border rounded-lg bg-surface p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"><HugeiconsIcon icon={Add01Icon} size={11} /> Tự điền câu trả lời</div>
                    <textarea
                      rows={2}
                      placeholder="Nhập yêu cầu cụ thể của bạn…"
                      value={customAnswers[i] ?? ""}
                      onChange={e => setCustomAnswers(a => ({ ...a, [i]: e.target.value }))}
                      className="w-full resize-none bg-surface-muted text-xs placeholder:text-muted-foreground outline-none px-2 py-1.5 rounded-md border border-border focus:border-primary transition-base"
                    />
                    <button
                      disabled={!customAnswers[i]?.trim()}
                      onClick={() => { const v = customAnswers[i]?.trim(); if (v) handleAnswer(-1, v, i); }}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-base"
                    >
                      <HugeiconsIcon icon={SentIcon} size={10} /> Gửi
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
          if (msg.kind === "connector") return (
            <div key={i} className="rounded-xl border border-warning/40 bg-warning-soft/30 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warning mb-2"><HugeiconsIcon icon={Plug01Icon} size={11} /> Yêu cầu kết nối tài khoản</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 shadow-sm">
                  {msg.service === "Gmail" ? (
                    <svg viewBox="0 0 48 48" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#EA4335" d="M6 40h6V23.8L4 18v18c0 2.2 1.8 4 4 4z"/>
                      <path fill="#34A853" d="M36 40h6c2.2 0 4-1.8 4-4V18l-8 5.8z"/>
                      <path fill="#FBBC05" d="M36 8H12L24 17.3 36 8z"/>
                      <path fill="#4285F4" d="M12 23.8V8L4 13.3 4 18l8 5.8z"/>
                      <path fill="#C5221F" d="M44 13.3L36 8v15.8l8-5.8z"/>
                      <path fill="#EA4335" d="M12 8v15.8l12 8.7 12-8.7V8L24 17.3z"/>
                    </svg>
                  ) : msg.service === "Outlook" ? (
                    <svg viewBox="0 0 48 48" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#1565C0" d="M28 4h12c2.2 0 4 1.8 4 4v32c0 2.2-1.8 4-4 4H28V4z"/>
                      <path fill="#1E88E5" d="M28 4v44H8c-2.2 0-4-1.8-4-4V8c0-2.2 1.8-4 4-4h20z"/>
                      <path fill="#fff" d="M18 14c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 14c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/>
                      <path fill="#fff" opacity=".7" d="M32 18h8v2h-8zm0 4h8v2h-8zm0 4h8v2h-8z"/>
                    </svg>
                  ) : (
                    <span className="text-lg">{msg.logo}</span>
                  )}
                </div>
                <div><div className="text-xs font-medium">{msg.service}</div><div className="text-xs text-muted-foreground">Agent cần quyền truy cập để thực hiện tác vụ thay bạn.</div></div>
              </div>
              <div className="text-xs font-medium mb-1.5">Quyền được yêu cầu:</div>
              {msg.perms.map((p, pi) => <div key={pi} className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} className="text-success" />{p}</div>)}
              {msg.connected ? (
                <div className="flex items-center gap-1.5 text-xs text-success mt-2"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> {msg.service} connected</div>
              ) : (
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => handleConnectorConnect(msg.service)} className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
                    <svg viewBox="0 0 48 48" width="12" height="12" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
                      <path fill="#fff" d="M6 40h6V23.8L4 18v18c0 2.2 1.8 4 4 4z"/>
                      <path fill="#fff" d="M36 40h6c2.2 0 4-1.8 4-4V18l-8 5.8z"/>
                      <path fill="#fff" opacity=".8" d="M12 23.8V8L4 13.3 4 18l8 5.8z"/>
                      <path fill="#fff" opacity=".8" d="M44 13.3L36 8v15.8l8-5.8z"/>
                      <path fill="#fff" d="M12 8v15.8l12 8.7 12-8.7V8L24 17.3z"/>
                    </svg>
                    Kết nối {msg.service}
                  </button>
                  <button onClick={() => setMessages(m => m.map((x, j) => j === i && x.kind === "connector" ? { ...x, connected: false, perms: [] } : x))} className="h-7 px-2.5 rounded-md border border-border text-xs text-muted-foreground">Bỏ qua</button>
                </div>
              )}
            </div>
          );
          return null;
        })}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {quickActions.map(s => (
            <button key={s} onClick={() => handleSend(s)} className="text-xs px-2 py-1 rounded-full bg-surface border border-border hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-base">
              {s}
            </button>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2.5 shrink-0 bg-surface">
        <div className="rounded-xl border border-border bg-surface focus-within:border-primary transition-base p-1.5">
          <div className="flex items-end gap-1.5">
            <textarea rows={2} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Update ${contextLabel.toLowerCase()}…`}
              className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground outline-none px-1 py-0.5 max-h-32" />
            <button onClick={() => handleSend()} className="h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary-glow flex items-center justify-center transition-base shrink-0">
              <HugeiconsIcon icon={SentIcon} size={12} />
            </button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 px-1">Enter to send · Shift+Enter for new line</div>
      </div>
    </aside>
  );
}

/* ============ GENERAL ============ */
const MODELS = [
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", desc: "Fast, cost-efficient model for most agent workloads.", badge: "Recommended", icon: "⚡" },
  { id: "glm-5-1",           name: "GLM 5.1",           desc: "Most capable model for hard reasoning.",             badge: "Powerful",     icon: "🧠" },
  { id: "deepseek-v4",       name: "DeepSeek V4",        desc: "Balanced performance and cost.",                    badge: "",             icon: "✨" },
  { id: "qwen-turbo",        name: "Qwen Turbo",         desc: "Ultra-fast responses, great for simple tasks.",    badge: "Fast",         icon: "🚀" },
];

function ModelDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = MODELS.find(m => m.id === value) ?? MODELS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="ds-input w-full flex items-center gap-2 cursor-pointer text-left"
      >
        <span className="w-6 h-6 rounded bg-accent-soft flex items-center justify-center text-xs shrink-0">{selected.icon}</span>
        <span className="flex-1 text-sm font-medium">{selected.name}</span>
        {selected.badge && <span className="chip chip-primary text-xs">{selected.badge}</span>}
        <HugeiconsIcon icon={ChevronDownIcon} size={14} className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 pt-2.5 pb-1 border-b border-border">
            <span className="section-eyebrow">Choose a model</span>
          </div>
          {MODELS.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false); }}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-base hover:bg-surface-muted ${m.id === value ? "bg-primary-soft/40" : ""} ${idx < MODELS.length - 1 ? "border-b border-border/50" : ""}`}
            >
              <span className="text-base mt-0.5 shrink-0">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{m.name}</span>
                  {m.badge && <span className="chip chip-primary text-xs">{m.badge}</span>}
                  {m.id === value && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-primary ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Simple markdown → JSX renderer */
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { nodes.push(<div key={i} className="h-3" />); i++; continue; }
    if (line.startsWith("# "))  { nodes.push(<h1 key={i} className="text-xl font-bold mb-2 mt-4 first:mt-0">{inlineFormat(line.slice(2))}</h1>); i++; continue; }
    if (line.startsWith("## ")) { nodes.push(<h2 key={i} className="text-base font-semibold mb-1.5 mt-3">{inlineFormat(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith("### ")){ nodes.push(<h3 key={i} className="text-sm font-semibold mb-1 mt-2">{inlineFormat(line.slice(4))}</h3>); i++; continue; }
    // unordered list block
    if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} className="ml-4 list-disc">{inlineFormat(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="mb-2 space-y-0.5 text-sm">{items}</ul>);
      continue;
    }
    // ordered list block
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} className="ml-4 list-decimal">{inlineFormat(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="mb-2 space-y-0.5 text-sm">{items}</ol>);
      continue;
    }
    nodes.push(<p key={i} className="text-sm leading-relaxed mb-1">{inlineFormat(line)}</p>);
    i++;
  }
  return nodes;
}
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
}

function GeneralTab({ onRefineWithAI, onChatToTest }: { onRefineWithAI?: () => void; onChatToTest?: () => void }) {
  const [params] = useSearchParams();
  const initialName = params.get("agentName") || "Banking ABC — Customer Care";
  const initialPrompt = params.get("agentPrompt") || "";
  const [avatar, setAvatar] = useState("🏦");
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "markdown" | "ai" | "chat">("preview");
  const [instructions, setInstructions] = useState("");
  const emojiOptions = ["🏦","🤖","💼","🧠","🎯","🛡️","⚡","🌐","📊","🔧","💡","🚀"];

  const defaultInstructions = initialPrompt || `# Banking ABC — Customer Care Agent

You are a customer-care specialist at ABC Bank. Help customers 24/7 with products, services and banking requests.

## Tone & Style
- Professional, warm, and empathetic
- Use clear, plain language — avoid jargon
- Keep responses concise but complete

## Capabilities
- **Account inquiries**: balance, transactions, statements
- **Card services**: block/unblock, limits, PIN reset
- **Loan products**: eligibility, rates, application status

## Limits
- Only answer questions within the scope of ABC Bank products and services
- Never provide personalized financial or legal advice
- If unsure, escalate to a human agent`;

  return (
    <div className="w-full animate-fade-up">
      {/* ── Sticky header ── */}
      <div className="px-8 pt-8 pb-5">
        <div className="flex items-center gap-3">
          {/* Avatar with edit hint */}
          <div className="relative shrink-0">
            <button
              onClick={() => setEditingAvatar(o => !o)}
              className="w-12 h-12 rounded-xl bg-primary-soft border border-border hover:border-primary/40 flex items-center justify-center text-2xl transition-base"
            >
              {avatar}
            </button>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-surface border border-border flex items-center justify-center pointer-events-none">
              <HugeiconsIcon icon={PencilEdit01Icon} size={9} className="text-muted-foreground" />
            </span>
            {editingAvatar && (
              <div className="absolute top-full left-0 mt-2 z-20 bg-surface border border-border rounded-xl shadow-lg p-2.5 grid grid-cols-6 gap-1 w-[180px]">
                {emojiOptions.map(e => (
                  <button
                    key={e}
                    onClick={() => { setAvatar(e); setEditingAvatar(false); }}
                    className={`w-8 h-8 rounded-lg text-xl flex items-center justify-center hover:bg-primary-soft transition-base ${avatar === e ? "bg-primary-soft ring-1 ring-primary" : ""}`}
                  >
                    {e}
                  </button>
                ))}
                <label className="col-span-6 mt-1 flex items-center justify-center gap-1.5 text-xs text-primary cursor-pointer hover:underline">
                  <HugeiconsIcon icon={Upload01Icon} size={10} /> Upload image
                  <input type="file" className="hidden" accept="image/*" />
                </label>
              </div>
            )}
          </div>

          {/* Editable name + description (1 line each, ellipsis) */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <input
              className="w-full text-base font-semibold bg-transparent border border-transparent rounded-md px-2 py-0.5 -mx-2 outline-none hover:border-border hover:bg-surface focus:border-ring focus:bg-surface transition-base"
              defaultValue={initialName}
              placeholder="Agent name…"
            />
            <input
              className="w-full text-sm text-muted-foreground bg-transparent border border-transparent rounded-md px-2 py-0.5 -mx-2 outline-none hover:border-border hover:bg-surface focus:border-ring focus:bg-surface transition-base truncate"
              defaultValue="Handles customer queries 24/7 for ABC Bank — products, services, and support."
              placeholder="Short description…"
              style={{ textOverflow: "ellipsis" }}
            />
          </div>

          {/* 3-dot menu */}
          <button className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base shrink-0">
            <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
          </button>
        </div>

        {/* View action buttons */}
        <div className="flex items-center gap-2 mt-4">
          {/* Toggle: Preview / Markdown */}
          <div className="flex items-center bg-surface-muted rounded-lg p-0.5 border border-border">
            {([
              { id: "preview",  label: "Preview",  icon: Eye },
              { id: "markdown", label: "Markdown", icon: FileText },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-base ${
                  viewMode === id
                    ? "bg-white shadow-soft text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={13} className={viewMode === id ? "text-primary" : "text-muted-foreground"} /> {label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button onClick={() => onRefineWithAI?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm text-foreground transition-base">
            <HugeiconsIcon icon={SparklesIcon} size={13} className="text-primary" /> Refine with AI
          </button>
          <button onClick={() => onChatToTest?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm text-foreground transition-base">
            <HugeiconsIcon icon={Chat01Icon} size={13} className="text-muted-foreground" /> Chat to Test
          </button>
        </div>
      </div>

      {/* ── Instructions ── */}
      <div className="px-8 pb-8">
        {viewMode === "markdown" && (
          <div className="flex items-center justify-between mb-3">
            <span className="section-eyebrow">Instructions</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <HugeiconsIcon icon={FileEditIcon} size={11} /> Markdown supported
            </span>
          </div>
        )}
        {viewMode === "preview" && (
          <div className="prose prose-sm max-w-none text-foreground">
            {renderMarkdown(instructions || defaultInstructions)}
          </div>
        )}
        {viewMode === "markdown" && (
          <textarea
            ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
            onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; setInstructions(e.currentTarget.value); }}
            className="w-full resize-none bg-transparent border border-transparent rounded-xl px-3 py-3 -mx-3 text-sm leading-relaxed outline-none hover:border-border hover:bg-surface focus:border-ring focus:bg-surface transition-base font-sans overflow-hidden"
            defaultValue={defaultInstructions}
            placeholder="Write your agent instructions here…"
          />
        )}
        {(viewMode === "ai" || viewMode === "chat") && (
          <div className="prose prose-sm max-w-none text-foreground opacity-50 select-none pointer-events-none">
            {renderMarkdown(instructions || defaultInstructions)}
          </div>
        )}
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
                <span className="chip text-xs">{count}</span>
              )}
            </div>
            {desc && <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>}
          </div>
          <HugeiconsIcon icon={ChevronDownIcon}
            size={16}
            className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          onClick={onManage}
          className="text-xs font-medium text-primary hover:bg-primary-soft px-2.5 h-8 rounded-md flex items-center gap-1 transition-base shrink-0"
        >
          Manage <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
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
      {chip && <span className="chip chip-primary text-xs">{chip}</span>}
      {meta && <span className="text-xs text-muted-foreground capitalize">{meta}</span>}
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
    <div className="p-8 w-full space-y-6 animate-fade-up">
      <Section icon={BookOpen01Icon} title="Agent knowledge" desc="Sources this agent can retrieve from at run time.">
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
            <HugeiconsIcon icon={Search01Icon} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search sources…" className="ds-input pl-8 h-9" />
          </div>
          <div className="text-xs text-muted-foreground">
            <b className="font-display text-foreground">639</b> chunks · ~98% indexed
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-border">
          <div className="grid grid-cols-[1fr,80px,90px,70px,70px,40px] gap-3 px-4 py-2.5 bg-surface-muted section-eyebrow">
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
              <div><span className="chip text-xs">{s.version}</span></div>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-base">
                <HugeiconsIcon icon={Delete01Icon} size={13} />
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
    <div className="p-8 w-full animate-fade-up">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Each task is a self-contained skill. Click to open the full editor.</p>
        </div>
        <button className="btn-primary h-9"><HugeiconsIcon icon={Add01Icon} size={13} /> New task</button>
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr,110px,80px,80px,110px,40px] gap-3 px-5 py-3 bg-surface-muted section-eyebrow">
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
            <div><span className={`chip ${t.type === "Workflow" ? "chip-accent" : "chip-primary"} text-xs`}>{t.type}</span></div>
            <div className="text-xs font-mono">{t.steps}</div>
            <div className="text-xs"><span className="chip text-xs">{t.version}</span></div>
            <div className="text-xs text-muted-foreground">{t.updated}</div>
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-base" />
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
    <div className="p-8 w-full animate-fade-up">
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
                  <span className="text-xs font-mono text-muted-foreground w-6">#{i + 1}</span>
                  <input defaultValue={q} className="flex-1 bg-transparent text-sm outline-none" />
                  <button className="text-muted-foreground hover:text-destructive transition-base"><HugeiconsIcon icon={Delete01Icon} size={12} /></button>
                </div>
              ))}
              <button className="btn-ghost"><HugeiconsIcon icon={Add01Icon} size={11} /> Add question</button>
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
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Performance</h2>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {["7d", "30d", "Custom"].map((t, i) => (
            <button key={t} className={`px-3 h-7 rounded text-xs font-medium transition-base ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
          <button className="ml-1 h-7 px-2 rounded hover:bg-surface-muted text-muted-foreground transition-base"><HugeiconsIcon icon={Download01Icon} size={13} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="surface-card p-4">
            <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
            <div className="font-display text-2xl font-semibold tracking-tight">{m.value}</div>
            <div className={`text-xs mt-1 ${m.trend === "up" ? "text-success" : "text-destructive"}`}>
              {m.trend === "up" ? "↑" : "↓"} {m.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold">Conversations by day</h3>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
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
            <div key={d} className="flex-1 text-center text-xs text-muted-foreground">{d}</div>
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
        <HugeiconsIcon icon={SlidersHorizontalIcon} size={26} className="text-primary" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2 capitalize">{title.replace(/-/g, " ")}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This section is part of the v2 mockup. Layout and tokens are wired — content can be designed next.
      </p>
    </div>
  );
}

/* ============ PREVIEW PANEL — clearly distinct (device frame) ============ */
/* ============ RIGHT CONFIG PANEL ============ */
function ConfigSection({ icon: Icon, title, badge, children }: {
  icon: any; title: string; badge?: React.ReactNode; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-muted transition-base">
        <Icon size={15} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {badge}
        {open ? <HugeiconsIcon icon={ChevronUpIcon} size={13} className="text-muted-foreground" /> : <HugeiconsIcon icon={ChevronDownIcon} size={13} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

const GMAIL_PERMS = [
  "Read Emails", "Send Email", "Draft Email", "Mark as Read",
  "Archive Email", "Apply Label", "Create Label", "Get Thread", "List Labels",
];

function ConnectorItem({ logo, name, connected, color }: { logo: string; name: string; connected?: boolean; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const [perms, setPerms] = useState<Record<string, "auto"|"ask">>({});
  const toggle = (p: string) => setPerms(prev => ({ ...prev, [p]: prev[p] === "ask" ? "auto" : "ask" }));

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 py-1.5 group">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>{logo}</div>
        <span className="text-sm flex-1">{name}</span>
        {connected && (
          <span className="flex items-center gap-1 text-xs text-success font-medium mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Connected
          </span>
        )}
        <button
          onClick={() => setExpanded(o => !o)}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
          title="View permissions"
        >
          <HugeiconsIcon icon={ChevronDownIcon} size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-base">
          <HugeiconsIcon icon={Delete01Icon} size={12} />
        </button>
      </div>
      {expanded && (
        <div className="ml-8 mt-1 mb-2 rounded-lg border border-border bg-surface-muted/40 overflow-hidden">
          {GMAIL_PERMS.map(p => (
            <div key={p} className="flex items-center px-3 py-2 border-b border-border/50 last:border-b-0">
              <span className="text-sm flex-1 text-foreground">{p}</span>
              <div className="flex items-center gap-1 bg-surface rounded-full border border-border p-0.5">
                <button
                  onClick={() => toggle(p)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-base ${(perms[p] ?? "auto") === "auto" ? "bg-success/15 text-success" : "text-muted-foreground hover:bg-surface-muted"}`}
                >
                  <HugeiconsIcon icon={BoltIcon} size={10} /> Auto
                </button>
                <button
                  onClick={() => toggle(p)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-base ${(perms[p] ?? "auto") === "ask" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:bg-surface-muted"}`}
                >
                  <HugeiconsIcon icon={Touchpad01Icon} size={10} /> Ask
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RightConfigPanel({ embedded, model, onModelChange }: { embedded?: boolean; model?: string; onModelChange?: (id: string) => void }) {
  const inner = (
    <div className="flex flex-col gap-2 p-3">
      {/* Model */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <HugeiconsIcon icon={CogIcon} size={15} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium flex-1">Model</span>
        </div>
        <div className="px-3 pb-3">
          <ModelDropdown value={model ?? "deepseek-v4-flash"} onChange={onModelChange ?? (() => {})} />
        </div>
      </div>
      {/* Knowledge */}
      <ConfigSection icon={BookOpen01Icon} title="Knowledge" badge={<span className="text-xs text-warning font-medium mr-1">Not set</span>}>
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Documents and sources your agent can look things up in.</p>
        <button className="flex items-center gap-1 text-xs text-primary hover:underline"><HugeiconsIcon icon={Add01Icon} size={12} /> Add</button>
      </ConfigSection>
      {/* Skills */}
      <ConfigSection icon={PuzzleIcon} title="Skills" badge={<span className="text-xs text-warning font-medium mr-1">Not set</span>}>
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Reusable abilities you've taught it.</p>
        <button className="flex items-center gap-1 text-xs text-primary hover:underline"><HugeiconsIcon icon={Add01Icon} size={12} /> Add</button>
      </ConfigSection>
      {/* Shared Connectors */}
      <ConfigSection icon={UserCheck01Icon} title="Shared Connectors">
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Agent always uses the same account, no matter who's asking.</p>
        <ConnectorItem logo="G" name="Google Docs" connected color="bg-primary-soft text-primary" />
        <button className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"><HugeiconsIcon icon={Add01Icon} size={12} /> Add connection</button>
      </ConfigSection>
      {/* Per-user Connectors */}
      <ConfigSection icon={UserGroupIcon} title="Per-user Connectors">
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Each person connects and uses their own account.</p>
        <ConnectorItem logo="G" name="Gmail" color="bg-destructive/10 text-destructive" />
        <button className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"><HugeiconsIcon icon={Add01Icon} size={12} /> Add connection</button>
      </ConfigSection>
      {/* Guardrails */}
      <GuardrailsConfigSection />
      {/* Schedules */}
      <ConfigSection icon={Clock01Icon} title="Schedules" badge={<span className="text-xs text-warning font-medium mr-1">Not set</span>}>
        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Run this agent automatically — like a daily summary.</p>
        <button className="flex items-center gap-1 text-xs text-primary hover:underline"><HugeiconsIcon icon={Add01Icon} size={12} /> Add</button>
      </ConfigSection>
      {/* Sub-Agents */}
      <ConfigSection icon={Robot01Icon} title="Sub-Agents" badge={<span className="text-xs text-muted-foreground mr-1">1 subagent</span>}>
        <div className="flex items-center gap-2 py-1 mb-1">
          <div className="w-6 h-6 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0"><HugeiconsIcon icon={Robot01Icon} size={12} className="text-muted-foreground" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">candidate-email-sender</p>
            <p className="text-xs text-muted-foreground truncate">Use when sending recruiting emails…</p>
          </div>
          <button className="text-muted-foreground hover:text-destructive transition-base"><HugeiconsIcon icon={Delete01Icon} size={12} /></button>
        </div>
        <button className="flex items-center gap-1 text-xs text-primary hover:underline"><HugeiconsIcon icon={Add01Icon} size={12} /> Add</button>
      </ConfigSection>
    </div>
  );
  if (embedded) return inner;
  return (
    <aside className="w-[476px] border-l border-border bg-surface flex flex-col shrink-0 overflow-y-auto">
      {inner}
    </aside>
  );
}

function RightCard({ icon: Icon, title, notSet, desc, addLabel }: {
  icon: any; title: string; notSet?: boolean; desc?: string; addLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-muted transition-base"
      >
        <Icon size={15} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {notSet && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-warning-soft text-warning font-semibold">Not set</span>
        )}
        {open ? <HugeiconsIcon icon={ChevronUpIcon} size={13} className="text-muted-foreground" /> : <HugeiconsIcon icon={ChevronDownIcon} size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border px-3 pb-2">
          {desc && <p className="text-xs text-muted-foreground mt-2 mb-1 leading-relaxed">{desc}</p>}
          {addLabel && (
            <button className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
              <HugeiconsIcon icon={Add01Icon} size={12} /> {addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SharedConnectorsCard() {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-muted transition-base">
        <HugeiconsIcon icon={UserCheck01Icon} size={15} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">Shared Connectors</span>
        {open ? <HugeiconsIcon icon={ChevronUpIcon} size={13} className="text-muted-foreground" /> : <HugeiconsIcon icon={ChevronDownIcon} size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border px-3 pb-2">
          <p className="text-xs text-muted-foreground mt-2 mb-2 leading-relaxed">Agent always uses the same account, no matter who's asking.</p>
          <div className="flex items-center gap-2 py-1.5">
            <div className="w-5 h-5 rounded bg-primary-soft flex items-center justify-center text-xs font-bold text-primary shrink-0">G</div>
            <span className="text-xs flex-1">Google Docs</span>
            <span className="flex items-center gap-1 text-xs text-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success" /> Connected
            </span>
            <button className="text-muted-foreground hover:text-destructive transition-base"><HugeiconsIcon icon={Delete01Icon} size={12} /></button>
          </div>
          <button className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
            <HugeiconsIcon icon={Add01Icon} size={12} /> Add connection
          </button>
        </div>
      )}
    </div>
  );
}

function PerUserConnectorsCard() {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-muted transition-base">
        <HugeiconsIcon icon={UserGroupIcon} size={15} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">Per-user Connectors</span>
        {open ? <HugeiconsIcon icon={ChevronUpIcon} size={13} className="text-muted-foreground" /> : <HugeiconsIcon icon={ChevronDownIcon} size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border px-3 pb-2">
          <p className="text-xs text-muted-foreground mt-2 mb-2 leading-relaxed">Each person connects and uses their own account.</p>
          <div className="flex items-center gap-2 py-1.5">
            <div className="w-5 h-5 rounded bg-destructive/10 flex items-center justify-center text-xs font-bold text-destructive shrink-0">G</div>
            <span className="text-xs flex-1">Gmail</span>
            <button className="text-muted-foreground hover:text-destructive transition-base"><HugeiconsIcon icon={Delete01Icon} size={12} /></button>
          </div>
          <button className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
            <HugeiconsIcon icon={Add01Icon} size={12} /> Add connection
          </button>
        </div>
      )}
    </div>
  );
}

function SchedulesCard() {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-muted transition-base">
        <HugeiconsIcon icon={Clock01Icon} size={15} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">Schedules</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-warning-soft text-warning font-semibold">Not set</span>
        {open ? <HugeiconsIcon icon={ChevronUpIcon} size={13} className="text-muted-foreground" /> : <HugeiconsIcon icon={ChevronDownIcon} size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border px-3 pb-2">
          <p className="text-xs text-muted-foreground mt-2 mb-1 leading-relaxed">No schedules yet. Add one to run this agent automatically — like a daily summary.</p>
          <button className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
            <HugeiconsIcon icon={Add01Icon} size={12} /> Add
          </button>
        </div>
      )}
    </div>
  );
}

function SubAgentsCard() {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-muted transition-base">
        <HugeiconsIcon icon={Robot01Icon} size={15} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">Sub-Agents</span>
        <span className="text-xs text-muted-foreground">1 subagent</span>
        {open ? <HugeiconsIcon icon={ChevronUpIcon} size={13} className="text-muted-foreground" /> : <HugeiconsIcon icon={ChevronDownIcon} size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border px-3 pb-2">
          <div className="flex items-center gap-2 py-1.5">
            <div className="w-6 h-6 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={Robot01Icon} size={12} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">candidate-email-sender</p>
              <p className="text-xs text-muted-foreground truncate">Use when sending recruiting emails to …</p>
            </div>
            <button className="text-muted-foreground hover:text-destructive transition-base"><HugeiconsIcon icon={Delete01Icon} size={12} /></button>
          </div>
          <button className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
            <HugeiconsIcon icon={Add01Icon} size={12} /> Add
          </button>
        </div>
      )}
    </div>
  );
}


function GuardrailsConfigSection() {
  return (
    <ConfigSection
      icon={Shield01Icon}
      title="Guardrails"
    >
      <GuardrailsInner />
    </ConfigSection>
  );
}


/* ============ NEW CONFIGURATION PANEL (right side) ============ */
function NewConfigPanel({ model, onModelChange }: { model: string; onModelChange: (id: string) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ connectors: true, skills: true, guardrails: true });
  const guardrailsAddRef = useRef<((pos:{top:number;left:number}) => void) | null>(null);

  const sections = [
    {
      id: "connectors", icon: Plug, label: "Connectors",
      content: (
        <div className="py-1">
          <p className="text-xs text-muted-foreground mb-2">The outside accounts and systems this agent may use.</p>
        </div>
      ),
    },
    {
      id: "skills", icon: Puzzle, label: "Skills", content: (
        <div className="flex flex-col items-center py-3 gap-1.5 text-center">
          <HugeiconsIcon icon={PuzzleIcon} size={20} className="text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Reusable abilities you've taught it.</p>
        </div>
      ),
    },
    {
      id: "guardrails", icon: Shield, label: "Guardrails",
      onAdd: (pos: {top:number;left:number}) => guardrailsAddRef.current?.(pos),
      content: (
        <GuardrailsInner onRegisterAdd={(fn) => { guardrailsAddRef.current = fn; }} />
      ),
    },
    { id: "knowledge",  icon: BookOpen, label: "Knowledge",  comingSoon: true },
    { id: "triggers",   icon: Zap,      label: "Triggers",   comingSoon: true },
    { id: "sub-agents", icon: Bot,      label: "Sub-Agents", comingSoon: true },
  ];

  return (
    <div className="flex flex-col">
      {/* Model row */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={CpuIcon} size={15} className="text-primary" />
        </div>
        <span className="text-sm font-medium flex-1">Model</span>
        <ModelDropdown value={model} onChange={onModelChange} />
      </div>

      {/* Accordion sections */}
      {sections.map((s: any) => {
        const isOpen = !s.comingSoon && open[s.id];
        const toggle = () => { if (!s.comingSoon) setOpen(o => ({ ...o, [s.id]: !o[s.id] })); };
        return (
          <div key={s.id} className="border-b border-border">
            <div className="w-full flex items-center gap-2.5 px-4 py-3">
              {/* Icon — colored bg, hover shows chevron hint, click toggles */}
              <button
                onClick={toggle}
                disabled={!!s.comingSoon}
                className="group w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0 text-primary transition-base relative"
              >
                <s.icon size={15} className="group-hover:opacity-0 transition-opacity" />
                <HugeiconsIcon icon={ChevronUpIcon} size={14} className="absolute opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <span className="text-sm font-medium flex-1 text-left">{s.label}</span>
              {s.comingSoon
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted border border-border text-muted-foreground">Coming soon</span>
                : <button
                  className="text-muted-foreground hover:text-foreground transition-base"
                  onClick={(e) => {
                    setOpen(o => ({ ...o, [s.id]: true }));
                    if (s.onAdd) {
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      s.onAdd({ top: r.bottom + 4, left: r.right });
                    }
                  }}
                ><HugeiconsIcon icon={Add01Icon} size={15} /></button>}
            </div>
            {isOpen && (
              <div className="px-4 pb-3">
                {s.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PreviewPanel({ view, onViewChange }: { view: "config" | "chat"; onViewChange: (v: "config" | "chat") => void }) {
  const setView = onViewChange;
  const [selectedModel, setSelectedModel] = useState("deepseek-v4-flash");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([
    { role: "agent", text: "Xin chào! Tôi là Banking ABC Customer Care. Tôi có thể giúp gì cho bạn?" },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setTimeout(() => {
      setMessages(m => [...m, { role: "agent", text: `Cảm ơn bạn đã liên hệ! Tôi đang xử lý yêu cầu của bạn về "${userMsg}". Vui lòng chờ trong giây lát.` }]);
    }, 800);
  };

  return (
    <aside className="w-[476px] border-l border-border bg-background flex flex-col shrink-0">
      {/* Toggle header */}
      <div className="h-11 px-3 border-b border-border flex items-center gap-1 shrink-0">
        <button
          onClick={() => setView("config")}
          className={`flex-1 h-7 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-base ${
            view === "config" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <HugeiconsIcon icon={SlidersHorizontalIcon} size={12} /> Configuration
        </button>
        <button
          onClick={() => setView("chat")}
          className={`flex-1 h-7 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-base ${
            view === "chat" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <HugeiconsIcon icon={PlayCircleIcon} size={12} /> Test run
        </button>
      </div>

      {view === "config" ? (
        <div className="flex-1 overflow-y-auto">
          <NewConfigPanel model={selectedModel} onModelChange={setSelectedModel} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Agent header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center text-lg shrink-0">🏦</div>
            <div>
              <div className="text-sm font-semibold leading-tight">Banking ABC — Customer Care</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Test mode</span>
              </div>
            </div>
            <button
              onClick={() => setMessages([{ role: "agent", text: "Xin chào! Tôi là Banking ABC Customer Care. Tôi có thể giúp gì cho bạn?" }])}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-base"
            >
              <HugeiconsIcon icon={HistoryIcon} size={11} /> Reset
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "agent" && (
                  <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-sm mr-2 shrink-0 mt-0.5">🏦</div>
                )}
                <div
                  className={`max-w-[82%] text-xs leading-relaxed rounded-2xl px-3 py-2 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-surface-muted border border-border rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick replies */}
          <div className="px-3 pb-2 flex gap-1.5 flex-wrap shrink-0">
            {["Khóa thẻ tín dụng", "Lãi suất vay", "Mở tài khoản"].map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-surface hover:bg-primary-soft hover:text-primary hover:border-primary/30 transition-base"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex items-center gap-2 bg-surface-muted rounded-xl border border-border px-3 py-2 focus-within:border-primary focus-within:ring-glow transition-base">
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Nhập tin nhắn để test…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
              />
              <button
                onClick={send}
                className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-glow transition-base shrink-0"
              >
                <HugeiconsIcon icon={SentIcon} size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
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
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
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
      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold font-display flex items-center justify-center shrink-0">{num}</div>
      <span className="text-sm font-medium flex-1">{name}</span>
      <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${typeColor}`}>{type}</span>
      <HugeiconsIcon icon={ChevronDownIcon} size={14} className="text-muted-foreground" />
    </div>
  );
}
function Bubble({ side, children }: { side: "user" | "agent"; children: any }) {
  return (
    <div className={`flex ${side === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] text-xs leading-relaxed rounded-2xl px-2.5 py-1.5 ${
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

/* ============ PublishModal ============ */
const EXTERNAL_CHANNELS = [
  { id: "web",       name: "Web widget", category: "Web",       emoji: "🌐", connected: true  },
  { id: "zalo",      name: "Zalo",       category: "Messaging", emoji: "💬", connected: true  },
  { id: "messenger", name: "Messenger",  category: "Messaging", emoji: "💙", connected: false },
  { id: "whatsapp",  name: "WhatsApp",   category: "Messaging", emoji: "🟢", connected: false },
  { id: "telegram",  name: "Telegram",   category: "Messaging", emoji: "✈️", connected: false },
  { id: "api",       name: "API",        category: "API",       emoji: "⚡", connected: true  },
];
const INTERNAL_CHANNELS = [
  { id: "workspace", name: "Internal workspace", category: "Workspace", emoji: "🏢", connected: true },
];

function PublishModal({ onClose, onChatTest }: { onClose: () => void; onChatTest: () => void }) {
  const [reason, setReason] = useState("");
  const [deployEnabled, setDeployEnabled] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(["web", "zalo", "api", "workspace"]));
  const [versionType, setVersionType] = useState<"patch"|"minor"|"major">("patch");
  const BASE = [1, 0, 1]; // current: v1.0.1
  const newVersion = (() => {
    const [maj, min, pat] = BASE;
    if (versionType === "major") return [maj+1, 0, 0];
    if (versionType === "minor") return [maj, min+1, 0];
    return [maj, min, pat+1];
  })();
  const versionName = `v${newVersion.join(".")}`;

  const toggle = (id: string) => setSelected(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const ChannelChip = ({ ch }: { ch: typeof EXTERNAL_CHANNELS[0] }) => {
    const on = selected.has(ch.id);
    return (
      <button
        onClick={() => toggle(ch.id)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-base text-left ${
          on ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-foreground hover:bg-surface-muted"
        }`}
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-base ${on ? "border-primary bg-primary" : "border-border"}`}>
          {on && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span className="text-base leading-none">{ch.emoji}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{ch.name}</p>
          <p className="text-[10px] text-muted-foreground">{ch.category}</p>
        </div>
        {ch.connected && <span className="w-1.5 h-1.5 rounded-full bg-success ml-auto shrink-0" title="Connected" />}
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white rounded-2xl border border-border shadow-lg animate-fade-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">Save version</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Creates {versionName} — choose where to deploy.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50">
            <HugeiconsIcon icon={Alert01Icon} size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Try it before publishing — Model, Skills, Guardrails changed.{" "}
              <button onClick={onChatTest} className="font-semibold underline underline-offset-2 hover:text-amber-900 transition-base">
                Chat once
              </button>{" "}
              to check the agent answers well.
            </p>
          </div>

          {/* What will be saved */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">What will be saved</p>
            <div className="rounded-xl border border-border overflow-hidden">
              {[
                { icon: Cpu,    label: "Model",      value: "DeepSeek V4 Flash", sub: "deepseek-v4-flash" },
                { icon: Puzzle, label: "Skills",     value: "meo",               sub: "v1.0.0" },
                { icon: Shield, label: "Guardrails", value: "2 rules",           sub: null },
              ].map((row, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}>
                  <row.icon size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium w-20 shrink-0">{row.label}</span>
                  <span className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate">{row.value}</span>
                    {row.sub && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-muted-foreground shrink-0">{row.sub}</span>}
                  </span>
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-success shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Version type */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Version type</p>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">New version</p>
                <p className="text-xl font-bold tracking-tight text-foreground font-display">
                  v<span className={versionType === "major" ? "text-primary" : ""}>{newVersion[0]}</span>
                  .
                  <span className={versionType === "minor" ? "text-primary" : ""}>{newVersion[1]}</span>
                  .
                  <span className={versionType === "patch" ? "text-primary" : ""}>{newVersion[2]}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              {([
                { key: "patch", label: "Patch", desc: "Small fixes and patches; existing features stay the same." },
                { key: "minor", label: "Minor", desc: "New features added in a backward-compatible manner." },
                { key: "major", label: "Major", desc: "Breaking changes or major new functionality." },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setVersionType(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-base ${
                    versionType === opt.key
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {versionType === opt.key && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />}
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {versionType === "patch" && "Small fixes and patches; existing features stay the same."}
              {versionType === "minor" && "New features added in a backward-compatible manner."}
              {versionType === "major" && "Breaking changes or major new functionality."}
            </p>
          </div>

          {/* Version note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Version note <span className="text-destructive">*</span></label>
              <span className="text-xs text-muted-foreground">{reason.length}/500</span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Describe what changed in this version…"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          {/* Publish to channels — accordion, no checkbox */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setDeployEnabled(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-base"
            >
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Publish to channels</p>
                <p className="text-xs text-muted-foreground">Deploy this version to specific channels</p>
              </div>
              {deployEnabled
                ? <HugeiconsIcon icon={ChevronUpIcon} size={14} className="text-muted-foreground shrink-0" />
                : <HugeiconsIcon icon={ChevronDownIcon} size={14} className="text-muted-foreground shrink-0" />}
            </button>

            {deployEnabled && (
              <div className="border-t border-border px-4 py-4 space-y-4 bg-surface-muted/30">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">External channels</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXTERNAL_CHANNELS.map(ch => <ChannelChip key={ch.id} ch={ch} />)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Internal workspace</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INTERNAL_CHANNELS.map(ch => <ChannelChip key={ch.id} ch={ch} />)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">{deployEnabled ? `${selected.size} channel${selected.size !== 1 ? "s" : ""} selected` : "No channel deployment"}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Cancel</button>
            <button
              disabled={!reason.trim() || selected.size === 0}
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={onClose}
            >
              <HugeiconsIcon icon={Rocket01Icon} size={13} /> Publish
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const WS_GUARDRAILS = [
  { id: 1, name: "PII protection",             desc: "Never expose personal identifiers in any response.",                    action: "Autogenerate response",                 enabled: true  },
  { id: 2, name: "Prohibited content filter",  desc: "Block violent, adult, or discriminatory content across all channels.", action: "Autogenerate response",                 enabled: true  },
  { id: 3, name: "Compliance disclaimer",      desc: "Append regulatory disclaimer to all financial and legal responses.",   action: "Custom response", enabled: true  },
  { id: 4, name: "Commercial response policy", desc: "Prevent AI from making pricing commitments or answering topics.",      action: "Autogenerate response",                 enabled: true  },
  { id: 7, name: "Competitor mention block",   desc: "Avoid naming or comparing direct competitors in any response.",        action: "Autogenerate response",                 enabled: true  },
];

/* ============ Guardrails config section (right panel) ============ */

interface Guardrail { id: number; name: string; desc: string; action: string; topic: string; description: string; samples: string; }

const EMPTY_GUARDRAIL = (): Omit<Guardrail,"id"> => ({ name:"", desc:"", action:"", topic:"", description:"", samples:"" });

/* ── Guardrail detail / edit modal ───────────────────────────────────── */
function GuardrailDetailModal({ item, editable, onClose, onSave }: {
  item: { name: string; desc: string; action: string };
  editable: boolean;
  onClose: () => void;
  onSave: (g: { name: string; desc: string; action: string }) => void;
}) {
  const initResponse = item.action.includes("fixed") ? "fixed" : item.action ? "auto" : null;
  const [topic, setTopic]     = useState(item.name);
  const [desc, setDesc]       = useState(item.desc);
  const [samples, setSamples] = useState("");
  const [responseType, setResponseType] = useState<string | null>(initResponse);
  const canSave = editable && topic.trim().length > 0 && desc.trim().length > 0 && responseType !== null;

  const opts = [
    { key: "auto",  label: "Autogenerate response",                 sub: "Agent automatically rewrites responses based on your instructions." },
    { key: "fixed", label: "Custom response", sub: "Agent replies using the exact text you provide." },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-background rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{animation:"fadeScaleIn 0.18s ease"}}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">{editable ? "Edit guardrail" : item.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{editable ? "Update the rule and response behaviour." : "Workspace guardrail — read only"}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0"><HugeiconsIcon icon={Cancel01Icon} size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
          <div>
            <p className="text-sm font-semibold mb-3">Define the rule</p>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Topic {editable && <span className="text-destructive">*</span>}</label>
                {editable && <span className="text-xs text-muted-foreground">{topic.length}/100</span>}
              </div>
              <input value={topic} onChange={e => editable && setTopic(e.target.value.slice(0,100))} readOnly={!editable}
                className={`w-full h-10 px-3 rounded-xl border border-border text-sm outline-none transition-base ${editable ? "bg-surface focus:border-ring" : "bg-surface-muted text-muted-foreground cursor-default"}`} />
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Description {editable && <span className="text-destructive">*</span>}</label>
                {editable && <span className="text-xs text-muted-foreground">{desc.length}/800</span>}
              </div>
              <textarea value={desc} onChange={e => editable && setDesc(e.target.value.slice(0,800))} readOnly={!editable} rows={4}
                className={`w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none transition-base resize-none leading-relaxed ${editable ? "bg-surface focus:border-ring" : "bg-surface-muted text-muted-foreground cursor-default"}`} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Samples</label>
                {editable && <span className="text-xs text-muted-foreground">{samples.length}/2000</span>}
              </div>
              {editable && <p className="text-xs text-primary mb-1.5 italic">Tip: Each sample must be separated by a line break.</p>}
              <textarea value={samples} onChange={e => editable && setSamples(e.target.value.slice(0,2000))} readOnly={!editable} rows={3}
                className={`w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none transition-base resize-none leading-relaxed ${editable ? "bg-surface focus:border-ring" : "bg-surface-muted text-muted-foreground cursor-default"}`} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-0.5">Response</p>
            <p className="text-xs text-muted-foreground mb-3">Choose what the agent does when this rule triggers.</p>
            <div className="space-y-2">
              {opts.map(opt => {
                const sel = responseType === opt.key;
                return (
                  <div key={opt.key} onClick={() => editable && setResponseType(opt.key)}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-base ${sel ? "border-primary bg-primary-soft" : "border-border bg-surface"} ${editable ? "cursor-pointer hover:bg-surface-muted" : "cursor-default"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-base ${sel ? "border-primary" : "border-border"}`}>
                      {sel && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">{editable ? "Cancel" : "Close"}</button>
          {editable && (
            <button onClick={() => { if (canSave) onSave({ name: topic, desc, action: responseType === "auto" ? "Autogenerate response" : "Custom response" }); }}
              disabled={!canSave}
              className={`h-9 px-4 rounded-xl text-sm font-medium transition-base ${canSave ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"}`}>
              Save changes
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function GuardrailCreateModal({ onClose, onSave }: { onClose: () => void; onSave: (g: Omit<Guardrail,"id">) => void }) {
  const [topic, setTopic] = useState("");
  const [desc, setDesc] = useState("");
  const [samples, setSamples] = useState("");
  const [responseType, setResponseType] = useState<string | null>(null);
  const [fixedText, setFixedText] = useState("");
  const canSave = topic.trim().length > 0 && desc.trim().length > 0 && responseType !== null && (responseType !== "fixed" || fixedText.trim().length > 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-background rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{animation:"fadeScaleIn 0.18s ease"}}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Create Guardrail</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Define the rule and choose how the agent responds.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0"><HugeiconsIcon icon={Cancel01Icon} size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
          {/* Define the rule */}
          <div>
            <p className="text-sm font-semibold mb-3">Define the rule</p>

            {/* Topic */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Topic <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{topic.length}/100</span>
              </div>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value.slice(0,100))}
                className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base"
                placeholder=""
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{desc.length}/800</span>
              </div>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value.slice(0,800))}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base resize-none leading-relaxed"
              />
            </div>

            {/* Samples */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Samples</label>
                <span className="text-xs text-muted-foreground">{samples.length}/2000</span>
              </div>
              <p className="text-xs text-primary mb-1.5 italic">Tip: Each sample must be separated by a line break.</p>
              <textarea
                value={samples}
                onChange={e => setSamples(e.target.value.slice(0,2000))}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Response */}
          <div>
            <p className="text-sm font-semibold mb-0.5">Response</p>
            <p className="text-xs text-muted-foreground mb-3">Choose what the agent does when this rule triggers.</p>
            <div className="space-y-2">
              {[
                { key: "auto", label: "Autogenerate response", sub: "Agent automatically rewrites responses based on your instructions." },
                { key: "fixed", label: "Custom response", sub: "Agent replies using the exact text you provide." },
              ].map(opt => {
                const sel = responseType === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => setResponseType(opt.key)}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-base ${sel ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-muted"}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-base ${sel ? "border-primary" : "border-border"}`}>
                      {sel && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
                      {sel && opt.key === "fixed" && (
                        <div className="mt-3" onClick={e => e.stopPropagation()}>
                          <label className="block text-xs font-semibold mb-1.5">Fixed paragraph <span className="text-destructive">*</span></label>
                          <div className="relative">
                            <textarea
                              rows={4}
                              maxLength={300}
                              placeholder="Write the exact reply the agent should send."
                              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-sm outline-none focus:border-ring transition-base resize-none"
                              value={fixedText}
                              onChange={e => setFixedText(e.target.value)}
                            />
                            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{fixedText.length}/300</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">Cancel</button>
          <button
            onClick={() => { if (canSave) { onSave({ name: topic, desc, action: responseType === "auto" ? "Autogenerate response" : "Custom response", topic, description: desc, samples }); onClose(); } }}
            disabled={!canSave}
            className={`h-9 px-4 rounded-xl text-sm font-medium transition-base ${canSave ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"}`}
          >
            Create guardrail
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  );
}

function GuardrailEditSheet({ guardrail, onClose, onSave }: { guardrail: Guardrail; onClose: () => void; onSave: (g: Guardrail) => void }) {
  const [topic, setTopic] = useState(guardrail.topic || guardrail.name);
  const [desc, setDesc] = useState(guardrail.description || guardrail.desc);
  const [samples, setSamples] = useState(guardrail.samples || "");
  const [responseType, setResponseType] = useState(guardrail.action.includes("fixed") ? "fixed" : "auto");

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-background flex flex-col shadow-2xl h-full" style={{animation:"slideInRight 0.22s ease"}}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Edit Guardrail</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Update the rule and response behaviour.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground ml-4 shrink-0"><HugeiconsIcon icon={Cancel01Icon} size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <p className="text-sm font-semibold mb-3">Define the rule</p>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Topic <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{topic.length}/100</span>
              </div>
              <input value={topic} onChange={e => setTopic(e.target.value.slice(0,100))} className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base" />
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
                <span className="text-xs text-muted-foreground">{desc.length}/800</span>
              </div>
              <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0,800))} rows={4} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base resize-none leading-relaxed" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Samples</label>
                <span className="text-xs text-muted-foreground">{samples.length}/2000</span>
              </div>
              <p className="text-xs text-primary mb-1.5 italic">Tip: Each sample must be separated by a line break.</p>
              <textarea value={samples} onChange={e => setSamples(e.target.value.slice(0,2000))} rows={4} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:border-ring transition-base resize-none leading-relaxed" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-0.5">Response</p>
            <p className="text-xs text-muted-foreground mb-3">Choose what the agent does when this rule triggers.</p>
            <div className="space-y-2">
              {[
                { key: "auto", label: "Autogenerate response", sub: "Agent automatically rewrites responses based on your instructions." },
                { key: "fixed", label: "Custom response", sub: "Agent replies using the exact text you provide." },
              ].map(opt => {
                const sel = responseType === opt.key;
                return (
                  <div key={opt.key} onClick={() => setResponseType(opt.key)}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-base ${sel ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-muted"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-base ${sel ? "border-primary" : "border-border"}`}>
                      {sel && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">Cancel</button>
          <button onClick={() => { onSave({ ...guardrail, name: topic, desc, action: responseType === "auto" ? "Autogenerate response" : "Custom response", topic, description: desc, samples }); onClose(); }} className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-base">Save changes</button>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>,
    document.body
  );
}

function GuardrailsInner({ onRegisterAdd }: { onRegisterAdd?: (fn: (pos:{top:number;left:number}) => void) => void } = {}) {
  const [showMenu, setShowMenu]               = useState(false);
  const [openCreate, setOpenCreate]           = useState(false);
  const [openWsSheet, setOpenWsSheet]         = useState(false);
  const [wsAdded, setWsAdded]                 = useState<Set<number>>(new Set([1, 2]));
  const [agentGuardrails, setAgentGuardrails] = useState<Guardrail[]>([]);
  const [editTarget, setEditTarget]           = useState<Guardrail | null>(null);
  const [menuPos, setMenuPos]                 = useState<{top:number;left:number}>({top:0,left:0});
  const addBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    onRegisterAdd?.((pos: {top:number;left:number}) => {
      setMenuPos(pos);
      setShowMenu(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => { setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const wsAddedList = WS_GUARDRAILS.filter(g => wsAdded.has(g.id));
  const wsAvailable = WS_GUARDRAILS.filter(g => !wsAdded.has(g.id));
  const totalActive = wsAddedList.length + agentGuardrails.length;

  // Detail popup state
  const [detailItem, setDetailItem] = useState<{name:string;desc:string;action:string} | null>(null);
  const [detailEditable, setDetailEditable] = useState(false);

  // Chip: clickable to open detail
  const Chip = ({ label, desc, action, onRemove, editable, onEdit, type, enabled = true }: {
    label: string; desc?: string; action?: string;
    onRemove: () => void; editable?: boolean; onEdit?: () => void;
    type?: "workspace" | "agent"; enabled?: boolean;
  }) => (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface cursor-pointer hover:bg-surface-muted transition-base"
      onClick={() => { setDetailItem({ name: label, desc: desc ?? "", action: action ?? "" }); setDetailEditable(!!editable); }}
    >
      {enabled
        ? <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="shrink-0"><circle cx="7" cy="7" r="7" fill="#22c55e"/><path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
      }
      <span className="text-[13px] font-medium flex-1 truncate min-w-0">{label}</span>
      {type === "workspace" && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{background:"#EFF6FF",color:"#1D4ED8",border:"0.5px solid #BFDBFE"}}>Workspace</span>
      )}
      {type === "agent" && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{background:"#ECFDF5",color:"#065F46",border:"0.5px solid #A7F3D0"}}>Agent</span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-muted transition-base shrink-0"
        title="Remove"
      >
        <HugeiconsIcon icon={Delete01Icon} size={12} />
      </button>
    </div>
  );

  return (
    <>
      <div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">Boundaries that keep your agent acting safely.</p>

        {(wsAddedList.length > 0 || agentGuardrails.length > 0) && (
          <div className="space-y-1 mb-3">
            {wsAddedList.map(g => (
              <Chip key={g.id} label={g.name} desc={g.desc} action={g.action}
                type="workspace" enabled={g.enabled !== false}
                onRemove={() => setWsAdded(prev => { const s = new Set(prev); s.delete(g.id); return s; })}
                editable={false}
              />
            ))}
            {agentGuardrails.map(g => (
              <Chip key={g.id} label={g.name} desc={g.desc} action={g.action}
                type="agent"
                onRemove={() => setAgentGuardrails(prev => prev.filter(x => x.id !== g.id))}
                editable={true}
                onEdit={() => setEditTarget(g)}
              />
            ))}
          </div>
        )}


        {showMenu && createPortal(
          <div
            className="fixed z-[9999] w-44 bg-white rounded-xl border border-border shadow-lg py-1"
            style={{ top: menuPos.top, right: window.innerWidth - menuPos.left }}
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowMenu(false); setOpenCreate(true); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-muted transition-base"
            >
              Create new
            </button>
            <button
              onClick={() => { setShowMenu(false); setOpenWsSheet(true); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-muted transition-base"
            >
              Add from workspace
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Add from workspace popup */}
      {openWsSheet && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenWsSheet(false)} />
          <div className="relative w-full max-w-[640px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh]" style={{animation:"fadeScaleIn 0.18s ease"}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-base">Add from workspace</h2>
              <button onClick={() => setOpenWsSheet(false)} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground"><HugeiconsIcon icon={Cancel01Icon} size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {wsAvailable.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground text-center">All guardrails have been added.</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-muted border-b border-border">
                      <th className="text-left px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[40%]">Guardrail</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Response action</th>
                      <th className="px-4 py-2.5 w-14" />
                    </tr>
                  </thead>
                  <tbody>
                    {wsAvailable.map(g => (
                      <tr key={g.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base">
                        <td className="px-5 py-3 align-top">
                          <p className="text-sm font-medium leading-snug">{g.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{g.desc}</p>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="text-xs text-foreground">{g.action}</span>
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          <button
                            onClick={() => setWsAdded(prev => new Set([...prev, g.id]))}
                            className="text-xs text-primary hover:underline font-medium"
                          >Add</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end">
              <button onClick={() => setOpenWsSheet(false)} className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-surface-muted transition-base">Close</button>
            </div>
          </div>
          <style>{`@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>,
        document.body
      )}

      {/* Create agent guardrail popup */}
      {openCreate && <GuardrailCreateModal
        onClose={() => setOpenCreate(false)}
        onSave={data => { setAgentGuardrails(prev => [...prev, { ...data, id: Date.now() }]); setOpenCreate(false); }}
      />}

      {/* Edit agent guardrail */}
      {editTarget && <GuardrailEditSheet
        guardrail={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={updated => { setAgentGuardrails(prev => prev.map(g => g.id === updated.id ? updated : g)); setEditTarget(null); }}
      />}

      {/* Guardrail detail/edit popup */}
      {detailItem && createPortal(
        <GuardrailDetailModal
          item={detailItem}
          editable={detailEditable}
          onClose={() => setDetailItem(null)}
          onSave={updated => {
            setAgentGuardrails(prev => prev.map(g =>
              g.name === detailItem.name
                ? { ...g, name: updated.name, desc: updated.desc, action: updated.action, topic: updated.name, description: updated.desc }
                : g
            ));
            setDetailItem(null);
          }}
        />,
        document.body
      )}
    </>
  );
}
