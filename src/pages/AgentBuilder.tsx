import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";

import { HugeiconsIcon } from "@hugeicons/react"
import { Activity01Icon, Add01Icon, AiBrain01Icon, Alert01Icon, Analytics01Icon, ArrowRight01Icon, BookOpen01Icon, Cancel01Icon, BoltIcon, CheckListIcon, CheckmarkCircle01Icon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, Clock01Icon, CogIcon, ConnectIcon, CpuIcon, Database01Icon, Delete01Icon, Download01Icon, Edit01Icon, EyeIcon, FileEditIcon, FileQuestionMarkIcon, FlaskConicalIcon, FloppyDiskIcon, FlowCircleIcon, Globe02Icon, HistoryIcon, LayerAddIcon, MessageAdd01Icon, Chat01Icon, MonitorDotIcon, MoreHorizontalIcon, NoteIcon, PencilEdit01Icon, PlayCircleIcon, Plug01Icon, PuzzleIcon, Robot01Icon, Rocket01Icon, Search01Icon, SentIcon, Shield01Icon, SlidersHorizontalIcon, SmartPhone01Icon, SparklesIcon, StarIcon, TimeScheduleIcon, Touchpad01Icon, Upload01Icon, UserCheck01Icon, UserCircleIcon, UserMultipleIcon, TextBoldIcon, TextItalicIcon, TextStrikethroughIcon, Heading01Icon, Heading02Icon, LeftToRightListBulletIcon, LeftToRightListNumberIcon, CodeIcon, Copy01Icon, SourceCodeIcon, GridViewIcon, Share08Icon, ApiIcon, TelegramIcon, WhatsappIcon, MessengerIcon, Building02Icon, UserIcon, QrCode01Icon, ExternalLinkIcon, InformationCircleIcon, MinusSignIcon, CircleArrowReload01Icon, Wrench01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import AgentToolsTab from "@/components/tool-builder/AgentToolsTab";
import TasksGrid from "@/components/tasks/TasksGrid";
import BusinessProcessesGrid from "@/components/business-processes/BusinessProcessesGrid";
import TriggersTab from "@/components/configure/TriggersTab";
import TriggerFormDialog from "@/components/configure/TriggerFormDialog";
import TriggerBlockedByConnectorNotice from "@/components/configure/TriggerBlockedByConnectorNotice";
import DeleteTriggerDialog from "@/components/configure/DeleteTriggerDialog";
import GuardrailsTab from "@/components/configure/GuardrailsTab";
import HistoryTab from "@/components/history/HistoryTab";
import HistoryChatPanel from "@/components/history/HistoryChatPanel";
import TriggerRunsTab from "@/components/configure/TriggerRunsTab";
import ChatOptimizationTab from "@/components/configure/ChatOptimizationTab";
import { businessProcessStore } from "@/components/business-processes/businessProcessStore";
import { taskStore } from "@/components/tasks/taskStore";
import { knowledgeStore } from "@/components/knowledge/knowledgeStore";
import { triggerStore, triggerNeedsSetup, TRIGGER_LIMIT, EXTERNAL_APP_META, type TriggerRecord } from "@/components/configure/triggerStore";
import { agentConnectorStore, type ConnectorScope } from "@/components/configure/agentConnectorStore";
import { hasTriggers, perUserConnector } from "@/components/configure/agentAutomationGuard";
import {
  agentPublishStore,
  CONNECTOR_BLOCKED_BY_TRIGGER_REASON,
} from "@/components/configure/agentPublishStore";
import { getAgentKind, type AgentKind } from "@/components/configure/agentKindStore";
import { getAgent } from "@/components/configure/agentStore";
import { CHANNEL_CATALOG, getChannelName, type ChannelCatalogEntry } from "@/components/configure/channelCatalog";
import { connectedAccountStore } from "@/components/configure/connectedAccountStore";
import ConnectionsTab, { CATALOG as CONNECTOR_CATALOG } from "@/components/configure/ConnectionsTab";
import AppLogo from "@/components/configure/AppLogo";
import { TYPE_META, summarizeConfig } from "@/components/configure/TriggersTab";
import { guardrailStore } from "@/components/configure/guardrailStore";
import { chatOptimizationStore } from "@/components/configure/chatOptimizationStore";
import { updateUser } from "@/lib/onboarding";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import BusinessProcessTree from "@/components/general/BusinessProcessTree";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Tab = "build" | "test" | "channels" | "insights";

// Every section is always visible for every agent — kind is derived from trigger count,
// not a fixed mode, so hiding a section would force a jarring layout change the moment a
// trigger is added or removed. Build screens prevent invalid states by disabling the
// specific control, not by hiding the section it lives in.
const developNav = [
  { id: "instructions", label: "Instructions", icon: FileEditIcon },
  { id: "model",        label: "Model",         icon: CpuIcon,          hidden: true },
  { id: "skills",       label: "Skills",         icon: PuzzleIcon,      hidden: true },
  { id: "guardrails",   label: "Guardrails",     icon: Shield01Icon,    hidden: true },
  { id: "knowledge",    label: "Knowledge",      icon: NoteIcon },
  { id: "connectors",   label: "Connections",    icon: ConnectIcon },
  { id: "triggers",     label: "Triggers",       icon: TimeScheduleIcon },
  { id: "history",      label: "History",        icon: HistoryIcon },
  { id: "sub-agents",   label: "Sub-Agents",     icon: UserMultipleIcon, comingSoon: true, hidden: true },
];

const monitorNav = [
  { label: "Reports", items: [
    { id: "perf", label: "Performance", icon: Activity01Icon },
    { id: "convs", label: "Conversations", icon: Chat01Icon },
    { id: "users", label: "Users", icon: UserGroupIcon },
  ]},
  { label: "Quality", items: [
    { id: "csat", label: "Satisfaction", icon: StarIcon },
    { id: "review", label: "Conversation review", icon: CheckListIcon },
  ]},
  { label: "History", items: [
    { id: "chat-hist", label: "Chat history", icon: HistoryIcon },
    { id: "trig-hist", label: "Trigger history", icon: BoltIcon },
  ]},
];

export default function AgentBuilder() {
  const { id = "cskh" } = useParams();
  const agent = getAgent(id);
  const [params, setParams] = useSearchParams();
  const VALID_TABS: Tab[] = ["build", "test", "deploy", "insights"];
  const rawTab = params.get("tab");
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "build";
  const section = params.get("section") || "instructions";
  const navigate = useNavigate();
  const buildModeParam = params.get("buildMode");
  const [buildMode, setBuildMode] = useState<"manual" | "ai">(buildModeParam === "ai" ? "ai" : "manual");
  const welcome = params.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(welcome);
  const [showPublish, setShowPublish] = useState(false);
  const [previewView, setPreviewView] = useState<"config" | "chat">("config");
  const [publishTick, setPublishTick] = useState(0);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [triggerTick, setTriggerTick] = useState(0);
  const [connectionTick, setConnectionTick] = useState(0);
  const kind = (() => { void publishTick; void triggerTick; return getAgentKind(id); })();
  const publishState = (() => { void publishTick; return agentPublishStore.get(id); })();
  const published = publishState.placement !== null;

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

  const nav = developNav.filter((it: any) => !it.hidden);
  const currentSectionLabel =
    developNav.find((i: any) => i.id === section)?.label ?? section;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate("/agents")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
          <HugeiconsIcon icon={ChevronLeftIcon} size={16} />
        </button>
        <Link to="/agents" className="text-xs text-muted-foreground hover:text-foreground transition-base shrink-0">Agents</Link>
        <span className="text-xs text-muted-foreground/50 shrink-0">/</span>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-surface-muted border border-border flex items-center justify-center text-base shrink-0">{agent.emoji}</div>
          <span className="font-semibold text-sm truncate">{agent.name}</span>
          {kind === "automation" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
              <HugeiconsIcon icon={BoltIcon} size={10} /> Automation
            </span>
          )}
        </div>

        {/* Center tabs */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1">
            {([
              { id: "build",    label: "Build",    Icon: PencilEdit01Icon },
              { id: "test",     label: "Test",     Icon: FlaskConicalIcon },
              { id: "channels", label: "Channels", Icon: GridViewIcon },
              { id: "insights", label: "Insights", Icon: Analytics01Icon },
            ] as const).map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id as Tab)}
                style={{ paddingLeft: "10px", paddingRight: "10px", height: "32px", gap: "10px" }}
                className={`rounded-lg text-sm font-medium flex items-center transition-base ${
                  tab === id ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                }`}>
                <HugeiconsIcon icon={Icon} size={18} className="shrink-0" /> <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {published ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 ${
              kind === "automation"
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-success/10 border-success/20 text-success"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${kind === "automation" ? "bg-indigo-500" : "bg-success"}`} />
              {kind === "automation"
                ? "Automation"
                : publishState.placement === "workspace"
                  ? "Live on Workspace"
                  : publishState.channels.length === 1
                    ? `Live on ${getChannelName(publishState.channels[0])}`
                    : publishState.channels.length > 1
                      ? `Live on ${publishState.channels.length} channels`
                      : "Live"} · {publishState.version}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted border border-border text-muted-foreground text-xs font-medium shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Draft
            </div>
          )}
          <button onClick={() => setShowPublish(true)} className="btn-primary h-9">
            <HugeiconsIcon icon={Rocket01Icon} size={13} /> Publish
          </button>
          <div className="relative">
            <button
              onClick={() => setShowAgentMenu(o => !o)}
              className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
            </button>
            {showAgentMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAgentMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-white shadow-elev py-1">
                  <button
                    disabled={!published}
                    onClick={() => {
                      agentPublishStore.unpublish(id);
                      setPublishTick(t => t + 1);
                      setShowAgentMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-surface-muted disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
                  >
                    Unpublish agent
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPublish && (
        <PublishModal
          agentId={id}
          agentName={agent.name}
          onClose={() => setShowPublish(false)}
          onPublished={() => setPublishTick(t => t + 1)}
          onManageChannels={() => { setShowPublish(false); setTab("channels"); }}
          onManageTriggers={() => { setShowPublish(false); setParams({ tab: "build", section: "triggers" }); }}
        />
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
            width: (buildMode === "manual" && tab === "build") ? "240px" : "0px",
            opacity: (buildMode === "manual" && tab === "build") ? 1 : 0,
            transition: "width 320ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease",
            minWidth: 0,
          }}
        >
          {/* Nav items — fixed height, always renders in full; the panel below scrolls instead */}
          <nav className="shrink-0 px-2 pt-2 pb-1 flex flex-col" style={{ gap: "4px" }}>
            {nav.map((it: any) => (
              <button
                key={it.id}
                onClick={() => !it.comingSoon && setSection(it.id)}
                disabled={it.comingSoon}
                style={{ height: "36px", fontSize: "14px" }}
                className={`w-full flex items-center rounded-lg px-2.5 transition-base shrink-0 ${
                  section === it.id && !it.comingSoon
                    ? "bg-primary-soft text-primary font-medium"
                    : it.comingSoon
                    ? "text-muted-foreground cursor-default opacity-60"
                    : "text-foreground hover:bg-surface-muted"
                }`}
              >
                <HugeiconsIcon icon={it.icon} size={18} className="shrink-0" />
                <span className="flex-1 text-left truncate ml-2.5">
                  {it.id === "history" ? "Run history" : it.label}
                </span>
                {it.comingSoon && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-muted-foreground shrink-0 whitespace-nowrap">Coming soon</span>
                )}
              </button>
            ))}
          </nav>

          {/* Ready to publish + Collapse — flexible region, scrolls/shrinks instead of clipping the nav above */}
          <div className="px-3 py-3 border-t border-border flex-1 min-h-0 overflow-y-auto space-y-2">
            <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
              {(() => {
                const agentTriggers = triggerStore.list(id ?? "new");
                const checklist = [
                  { label: "Đã viết Instructions",     done: true,  section: "instructions" },
                  { label: "Đã chọn Model",             done: true,  section: "model" },
                  { label: "Đã cấu hình Guardrails",    done: false, section: "guardrails" },
                  { label: "Đã cấu hình Kết nối",       done: agentConnectorStore.list(id ?? "new").length > 0, section: "connectors" },
                  ...(agentTriggers.length > 0
                    ? [{ label: "Đã cấu hình Trigger", done: !agentTriggers.some(triggerNeedsSetup), section: "triggers" }]
                    : []),
                  { label: "Đã thử agent",              done: true,  section: null },
                ];
                const doneCount = checklist.filter(i => i.done).length;
                return (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground">Sẵn sàng publish</span>
                      <span className="text-xs text-muted-foreground">{doneCount}/{checklist.length}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                    </div>
                    <div className="space-y-1">
                      {checklist.map(item => (
                        <div key={item.label} className="flex items-center gap-1.5 text-xs">
                          {item.done
                            ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} className="text-primary shrink-0" />
                            : <span className="w-3 h-3 rounded-full border-2 border-muted-foreground shrink-0 inline-block" />}
                          {item.done && item.section ? (
                            <button
                              onClick={() => setSection(item.section!)}
                              className="text-primary hover:underline text-left"
                            >{item.label}</button>
                          ) : (
                            <span className={item.done ? "text-primary" : "text-muted-foreground"}>{item.label}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
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
            sections={nav.flatMap((g: any) => g.items ?? [g])}
            currentSection={section}
            onSectionChange={setSection}
            seedPrompt={params.get("agentPrompt") || ""}
          />
        </div>

        {/* Content + Preview */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">

            <div className="flex-1 overflow-y-auto bg-background">
              {tab === "build" && section === "instructions" && <GeneralTab key={id ?? "new"} agentId={id ?? "new"} onRefineWithAI={() => setBuildMode("ai")} onChatToTest={() => { setBuildMode("manual"); setPreviewView("chat"); }} />}
              {tab === "build" && section === "knowledge" && <KnowledgeTab />}
              {tab === "build" && section === "history" && (
                kind === "automation"
                  ? <div className="p-8"><TriggerRunsTab agentId={id ?? "new"} /></div>
                  : <HistoryTab agentId={id ?? "new"} />
              )}
              {tab === "build" && section === "skills" && <PlaceholderTab title="Skills" />}
              {tab === "build" && section === "guardrails" && <GuardrailsTab agentId={id ?? "new"} />}
              {tab === "build" && section === "triggers" && (
                <TriggersTab agentId={id ?? "new"} onChange={() => setTriggerTick(t => t + 1)} />
              )}
              {tab === "build" && section === "connectors" && (
                <ConnectionsTab agentId={id ?? "new"} onViewTriggers={() => setSection("triggers")} onChange={() => setConnectionTick(t => t + 1)} />
              )}
              {tab === "build" && section === "model" && <PlaceholderTab title="Model" />}
              {tab === "build" && !["instructions","knowledge","history","skills","guardrails","triggers","connectors","model"].includes(section) && <PlaceholderTab title={section} />}
              {tab === "test" && <PlaceholderTab title="Test" />}
              {tab === "channels" && <DeployTab agentId={id} onViewTriggers={() => setParams({ tab: "build", section: "triggers" })} />}
              {tab === "insights" && <PerformanceTab />}
            </div>
          </div>

          {tab === "build" && section === "instructions" && <PreviewPanel agentId={id ?? "new"} view={previewView} onViewChange={setPreviewView} onConnectionsChange={() => setConnectionTick(t => t + 1)} />}
          {tab === "build" && section === "history" && kind === "conversational" && <HistoryChatPanel agentId={id ?? "new"} />}
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
      base.push({ kind: "text", role: "ai", text: "I've analyzed the request. Here's a proposed starting system prompt:" });
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
      streamAi(`The agent needs access to ${svc} to send and read email on your behalf. Please confirm the connection below.`);
      await new Promise(r => setTimeout(r, 800));
      push({
        kind: "connector",
        service: svc,
        logo: svc === "Gmail" ? "📧" : "📨",
        perms: [
          "Read email and metadata",
          "Send email on your behalf",
          "Manage labels",
        ],
      });
      return;
    }

    await runTool(`analyze_request("${msg.slice(0, 22)}…")`);
    push({
      kind: "clarify",
      question: `"${msg.slice(0, 32)}${msg.length > 32 ? "…" : ""}" — how should the agent handle this?`,
      options: [
        { icon: "bolt", title: "Fully autonomous", desc: "Agent decides on its own, no need to ask further" },
        { icon: "eye", title: "Propose, you approve", desc: "Agent drafts a proposal, you approve before it's applied" },
        { icon: "hand-stop", title: "Only when asked", desc: "Agent waits for a specific instruction from the user" },
      ],
    });
  };

  const handleAnswer = async (idx: number, answer: string, msgIdx: number) => {
    setMessages(m => m.map((x, i) => i === msgIdx && x.kind === "clarify" ? { ...x, answered: answer } : x));
    await new Promise(r => setTimeout(r, 400));
    const replies = [
      "Got it — fully autonomous mode. Updating instructions:",
      "Understood — the agent will draft proposals before applying them:",
      "OK — the agent will wait for instructions, no autonomy:",
    ];
    streamAi(idx === -1 ? `Got it — "${answer.slice(0, 55)}". I'll configure this based on your request:` : replies[idx]);
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
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary"><HugeiconsIcon icon={Chat01Icon} size={11} /> Need more information</div>
              <p className="text-xs text-foreground leading-relaxed">{msg.question}</p>
              {msg.answered ? (
                <div className="flex items-center gap-1.5 text-xs text-primary"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> Selected: <strong>{msg.answered}</strong></div>
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
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"><HugeiconsIcon icon={Add01Icon} size={11} /> Write your own answer</div>
                    <textarea
                      rows={2}
                      placeholder="Enter your specific request…"
                      value={customAnswers[i] ?? ""}
                      onChange={e => setCustomAnswers(a => ({ ...a, [i]: e.target.value }))}
                      className="w-full resize-none bg-surface-muted text-xs placeholder:text-muted-foreground outline-none px-2 py-1.5 rounded-md border border-border focus:border-primary transition-base"
                    />
                    <button
                      disabled={!customAnswers[i]?.trim()}
                      onClick={() => { const v = customAnswers[i]?.trim(); if (v) handleAnswer(-1, v, i); }}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-base"
                    >
                      <HugeiconsIcon icon={SentIcon} size={10} /> Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
          if (msg.kind === "connector") return (
            <div key={i} className="rounded-xl border border-warning/40 bg-warning-soft/30 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warning mb-2"><HugeiconsIcon icon={Plug01Icon} size={11} /> Account connection requested</div>
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
                <div><div className="text-xs font-medium">{msg.service}</div><div className="text-xs text-muted-foreground">The agent needs access to perform tasks on your behalf.</div></div>
              </div>
              <div className="text-xs font-medium mb-1.5">Permissions requested:</div>
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
                    Connect {msg.service}
                  </button>
                  <button onClick={() => setMessages(m => m.map((x, j) => j === i && x.kind === "connector" ? { ...x, connected: false, perms: [] } : x))} className="h-7 px-2.5 rounded-md border border-border text-xs text-muted-foreground">Skip</button>
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


function GeneralTab({ agentId, onRefineWithAI, onChatToTest }: {
  agentId: string; onRefineWithAI?: () => void; onChatToTest?: () => void;
}) {
  const [params] = useSearchParams();
  const agent = getAgent(agentId);
  const initialName = params.get("agentName") || agent.name;
  const initialPrompt = params.get("agentPrompt") || "";
  const [avatar, setAvatar] = useState(agent.emoji);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "markdown" | "ai" | "chat">("preview");
  const [instructions, setInstructions] = useState("");
  const emojiOptions = ["🏦","🤖","💼","🧠","🎯","🛡️","⚡","🌐","📊","🔧","💡","🚀"];

  const defaultInstructions = initialPrompt || agent.instructions;

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
                  <HugeiconsIcon icon={Upload01Icon} size={10} /> Upload01Icon image
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
              defaultValue={agent.desc}
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
              { id: "preview",  label: "Preview",  icon: EyeIcon },
              { id: "markdown", label: "Markdown", icon: FileEditIcon },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-base ${
                  viewMode === id
                    ? "bg-white shadow-soft text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HugeiconsIcon icon={Icon} size={13} className={viewMode === id ? "text-primary" : "text-muted-foreground"} /> {label}
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
            <HugeiconsIcon icon={Icon} size={16} />
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
  const { can } = useMyPermissions();
  const canCreateKnowledge = can("knowledge.create");
  const sources = [
    { name: "Brochure 2024.pdf", type: "PDF", size: "2.4 MB", chunks: 184, version: "v2", icon: FileEditIcon, color: "text-destructive" },
    { name: "Customer FAQ", type: "FAQ", size: "47 entries", chunks: 47, version: "v5", icon: Chat01Icon, color: "text-primary" },
    { name: "abcbank.com/products", type: "Web", size: "32 pages", chunks: 312, version: "v1", icon: Globe02Icon, color: "text-info" },
    { name: "Internal Policy v3", type: "Sharepoint", size: "1.1 MB", chunks: 96, version: "v3", icon: Database01Icon, color: "text-accent" },
  ];
  return (
    <div className="p-8 w-full space-y-6 animate-fade-up">
      <Section icon={BookOpen01Icon} title="Agent knowledge" desc="Sources this agent can retrieve from at run time.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {[
            { icon: Upload01Icon, label: "Upload" },
            { icon: Globe02Icon, label: "Website" },
            { icon: Database01Icon, label: "SharePoint" },
            { icon: FileQuestionMarkIcon, label: "FAQ" },
          ].map(s => (
            <button
              key={s.label}
              disabled={!canCreateKnowledge}
              title={!canCreateKnowledge ? "You don't have permission to create knowledge sources." : undefined}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary-soft/30 text-xs font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-transparent"
            >
              <HugeiconsIcon icon={s.icon} size={16} className="text-primary" />
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
                <HugeiconsIcon icon={s.icon} size={15} className={s.color} />
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

function ChannelIcon({ ch, size = 16 }: { ch: ChannelCatalogEntry; size?: number }) {
  if (ch.icon) return <HugeiconsIcon icon={ch.icon} size={size} className={ch.color} />;
  if (ch.logoUrl) return <img src={ch.logoUrl} alt={ch.name} className="object-contain" style={{ width: size, height: size }} />;
  if (ch.id === "zalo") return <span className="text-[11px] font-bold" style={{ color: "#0068FF" }}>Zalo</span>;
  return <span className="text-[10px] font-bold text-muted-foreground">{ch.name[0]}</span>;
}

function PublishAgentModal({ onClose, onPublish }: {
  onClose: () => void;
  onPublish: (audience: string) => void;
}) {
  const [audience, setAudience] = useState<"workspace" | "org" | "me">("workspace");

  const options = [
    {
      id: "workspace" as const, icon: UserGroupIcon, label: "Everyone in the Workspace",
      desc: "Anyone in the Workspace can use this Agent once published.",
    },
    {
      id: "org" as const, icon: Building02Icon, label: "Company / Department", badge: "Coming soon", disabled: true,
      desc: "Choose specific employees in your org to use this agent.",
    },
    {
      id: "me" as const, icon: UserIcon, label: "Only me",
      desc: "Only you can use it — the agent goes straight to My Agents in the Workspace.",
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg border border-border flex flex-col animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-1">
          <div>
            <h2 className="text-xl font-bold">Publish agent</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Choose who can use this Agent</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-2">
          {/* Workspace row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "#FEF3E2", color: "#C2703D" }}>
              TN
            </div>
            <span className="text-base font-medium">Trang Nguyen Huyen Workspace</span>
          </div>

          {/* Section label */}
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
            <HugeiconsIcon icon={UserGroupIcon} size={15} />
            Audience
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2.5 mb-2">
            {options.map(opt => {
              const active = audience === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && setAudience(opt.id)}
                  className={`text-left rounded-xl border px-4 py-3.5 transition-base ${
                    opt.disabled
                      ? "border-border bg-surface-muted/60 opacity-70 cursor-not-allowed"
                      : active
                      ? "border-primary bg-primary-soft/40 ring-1 ring-primary"
                      : "border-border bg-surface-muted/60 hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {!opt.disabled && (
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? "border-primary" : "border-border"}`}>
                        {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                    )}
                    <HugeiconsIcon icon={opt.icon} size={16} className="text-foreground shrink-0" />
                    <span className="text-sm font-semibold">{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">{opt.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed ml-6">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => { onPublish(audience); onClose(); }}
            className="btn-primary"
          >
            <HugeiconsIcon icon={Rocket01Icon} size={14} /> Publish
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PublishSuccessModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg border border-border flex flex-col items-center text-center px-8 py-8 animate-fade-up">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-xl font-bold text-success">Published successfully</h2>
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} className="text-success" />
        </div>
        <p className="text-sm text-muted-foreground mb-6">Your agent has been published to Agent Workspace.</p>

        <div className="w-full text-left mb-6">
          <p className="text-sm font-semibold mb-2">Share the public link on Agent Workspace</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-11 px-3.5 rounded-xl border border-border bg-surface-muted flex items-center text-sm text-muted-foreground truncate">
              {url}
            </div>
            <button title="QR code" className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground transition-base shrink-0">
              <HugeiconsIcon icon={QrCode01Icon} size={18} />
            </button>
            <button onClick={handleCopy} title="Copy" className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground transition-base shrink-0">
              <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : Copy01Icon} size={18} className={copied ? "text-success" : ""} />
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" title="Open" className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground transition-base shrink-0">
              <HugeiconsIcon icon={ExternalLinkIcon} size={18} />
            </a>
          </div>
        </div>

        <button
          onClick={onClose}
          className="h-11 px-8 rounded-xl bg-success text-white text-sm font-semibold hover:opacity-90 transition-base"
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
}

const AGENT_VERSIONS = [
  { id: "v1.0.2", date: "Aug 17, 2026" },
  { id: "v1.0.1", date: "Aug 17, 2026" },
  { id: "v1.0.0", date: "Aug 17, 2026" },
];

function VersionSelectModal({ currentVersion, onClose, onRelease }: {
  currentVersion: string;
  onClose: () => void;
  onRelease: (version: string) => void;
}) {
  const [selected, setSelected] = useState(currentVersion);
  const isSame = selected === currentVersion;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg border border-border flex flex-col px-6 py-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-bold">Choose release version</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 -mt-1 -mr-1">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          The version you choose will apply to all live channels.
        </p>

        {/* Version list */}
        <div className="flex flex-col gap-2.5 mb-4">
          {AGENT_VERSIONS.map(v => {
            const active = selected === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v.id)}
                className={`text-left rounded-xl border px-4 py-3.5 transition-base ${
                  active ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border bg-surface-muted/60 hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-semibold font-mono">{v.id}</span>
                  {v.id === currentVersion && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white border border-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" /> Live
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Released on {v.date}</p>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          {isSame ? `Re-release ${selected} to all channels.` : `Switch all channels to ${selected}.`}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => { onRelease(selected); onClose(); }}
            className="btn-primary"
          >
            {isSame ? "Re-release" : "Release"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const AUDIENCE_INFO: Record<string, { name: string; sub: string }> = {
  workspace: { name: "Trang Nguyen Huyen Workspace", sub: "Everyone in Workspace" },
  org:       { name: "Trang Nguyen Huyen Workspace", sub: "Company / Department" },
  me:        { name: "Trang Nguyen Huyen", sub: "Only me" },
};

/* ============ Web widget configuration (right sheet) ============ */
const CUSTOMIZE_SUBTABS = [
  { id: "theme",   label: "Theme" },
  { id: "general", label: "General" },
  { id: "starter", label: "Starter" },
  { id: "welcome", label: "Welcome" },
  { id: "chat",    label: "Chat" },
] as const;

function CounterTextarea({ label, value, onChange, maxLength, placeholder }: { label: string; value: string; onChange: (v: string) => void; maxLength: number; placeholder?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5">{label}</p>
      <div className="relative">
        <textarea
          value={value}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="ds-textarea w-full resize-none pb-6"
        />
        <span className="absolute right-3 bottom-2 text-xs text-muted-foreground">{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}

function CounterField({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (v: string) => void; maxLength: number }) {
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5">{label}</p>
      <div className="relative">
        <input
          value={value}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
          className="ds-input w-full pr-14"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full p-0.5 transition-base shrink-0 ${checked ? "bg-[#22C55E]" : "bg-border-strong"}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow-soft transition-base ${checked ? "translate-x-4" : ""}`} />
      </button>
      <span className="text-sm">{label}</span>
    </label>
  );
}

function UploadBox({ hint }: { hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
        <HugeiconsIcon icon={Upload01Icon} size={18} className="text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <label className="w-9 h-9 rounded-lg border border-border shrink-0 cursor-pointer overflow-hidden" style={{ background: value }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} className="opacity-0 w-full h-full cursor-pointer" />
        </label>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="ds-input w-32 font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}

function WebWidgetConfigModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"config" | "customize">("config");
  const [domains, setDomains] = useState<string[]>([""]);
  const [customizeTab, setCustomizeTab] = useState<typeof CUSTOMIZE_SUBTABS[number]["id"]>("theme");
  const [previewState, setPreviewState] = useState<"minimized" | "welcome" | "chat">("welcome");
  const [copied, setCopied] = useState<"url" | "code" | null>(null);

  const [theme, setTheme] = useState({
    background: "#FFFFFF",
    brand: "#0052CC",
    brandText: "#FFFFFF",
    customerBubble: "#0052CC",
    customerText: "#FFFFFF",
    botBubble: "#F4F4F5",
    botText: "#262626",
    header: "#0052CC",
  });
  const [general, setGeneral] = useState({ companyName: "" });
  const [starterGreeting, setStarterGreeting] = useState("Hi! How can I help you?");
  const [welcome, setWelcome] = useState({ enabled: true, guestMode: false, title: "Chat with Us", description: "How can I help you?", buttonLabel: "Start chat", placeholderInput: "Enter your name" });
  const [chat, setChat] = useState({ headerTitle: "Test", showLogoHeader: true, placeholderMessage: "Enter your message", aiDisclaimer: "" });

  const url = "https://agents.fpt.ai/live-chat/chat?tenant_id=01JED250RPXCYQE6MAVTNSQCAM";

  const embedCode = `<script>
  window.tovaAsyncInit = function() {
    tova.init({
      tenant_id: "01JED250RPXCYQE6MAVTNSQCAM",
      bot_code: "01JMVB17JRYN1VPBS7N1DWD5HD",
      ui_config: {
        position: "right",
        hide_greeting: false
      },
      extra: {}
    });
  };
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://cdn.fpt.ai/tova/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  })(document, "script", "tova-jssdk");
</script>`;

  const copy = (which: "url" | "code", text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const addDomain = () => setDomains(prev => [...prev, ""]);
  const removeDomain = (i: number) => setDomains(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const updateDomain = (i: number, v: string) => setDomains(prev => prev.map((d, idx) => idx === i ? v : d));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 h-full bg-white shadow-2xl flex flex-col shrink-0"
        style={{ width: "900px", maxWidth: "95vw", animation: "slideInRight 0.22s ease" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Web client configuration</h2>
            <p className="text-sm text-muted-foreground mt-0.5">You can easily configure live-chat integration into your business website.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Top-level tabs */}
        <div className="px-6 pt-4 pb-1 shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-muted w-fit">
            <button
              onClick={() => setTab("config")}
              className={`h-9 px-5 rounded-md text-sm font-semibold transition-base ${tab === "config" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Config
            </button>
            <button
              onClick={() => setTab("customize")}
              className={`h-9 px-5 rounded-md text-sm font-semibold transition-base ${tab === "customize" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Customize widget
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === "config" ? (
            <div className="px-6 py-5">
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Configure live chat integration for your business website by setting up allowed domains. You can then use the URL to interact directly with the Agent or embed the integration script into your website.
              </p>

              {/* Whitelist domains */}
              <div className="mb-6">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm font-semibold">Whitelist domains</p>
                  <HugeiconsIcon icon={InformationCircleIcon} size={14} className="text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground italic mb-3">Whitelist domains below. Only domains added here be able to display the chat widget.</p>
                <div className="flex flex-col gap-2">
                  {domains.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={d}
                        onChange={e => updateDomain(i, e.target.value)}
                        placeholder="https://sampleurl.com"
                        className="ds-input flex-1"
                      />
                      <button
                        onClick={() => removeDomain(i)}
                        className="w-9 h-9 rounded-lg bg-surface-muted hover:bg-border/40 flex items-center justify-center text-muted-foreground transition-base shrink-0"
                      >
                        <HugeiconsIcon icon={MinusSignIcon} size={15} />
                      </button>
                      <button
                        onClick={addDomain}
                        className="w-9 h-9 rounded-lg bg-primary hover:opacity-90 flex items-center justify-center text-primary-foreground transition-base shrink-0"
                      >
                        <HugeiconsIcon icon={Add01Icon} size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* URL */}
              <div className="mb-6">
                <p className="text-sm font-semibold mb-1">URL</p>
                <p className="text-xs text-muted-foreground italic mb-3">Share this URL with the users to interact with your Agent.</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-11 px-3.5 rounded-xl border border-border bg-surface-muted flex items-center text-sm text-muted-foreground truncate font-mono">
                    {url}
                  </div>
                  <button title="QR code" className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground transition-base shrink-0">
                    <HugeiconsIcon icon={QrCode01Icon} size={18} />
                  </button>
                  <button onClick={() => copy("url", url)} title="Copy" className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground transition-base shrink-0">
                    <HugeiconsIcon icon={copied === "url" ? CheckmarkCircle01Icon : Copy01Icon} size={18} className={copied === "url" ? "text-success" : ""} />
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" title="Open" className="w-11 h-11 rounded-xl border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-foreground transition-base shrink-0">
                    <HugeiconsIcon icon={ExternalLinkIcon} size={18} />
                  </a>
                </div>
              </div>

              {/* Embed code */}
              <div>
                <p className="text-sm font-semibold mb-1">Embed code</p>
                <p className="text-xs text-muted-foreground italic mb-3">Copy this code and paste it before the closing &lt;/body&gt; tag on every page of your website.</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-end px-3 py-2 bg-surface-muted border-b border-border">
                    <button onClick={() => copy("code", embedCode)} className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-base">
                      <HugeiconsIcon icon={copied === "code" ? CheckmarkCircle01Icon : Copy01Icon} size={13} className={copied === "code" ? "text-success" : ""} />
                      {copied === "code" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto px-4 py-3 text-xs font-mono leading-relaxed bg-white max-h-72 overflow-y-auto">
                    <code>
                      {embedCode.split("\n").map((line, i) => (
                        <div key={i} className="flex">
                          <span className="text-muted-foreground/50 select-none w-6 text-right pr-3 shrink-0">{i + 1}</span>
                          <span className="text-foreground whitespace-pre">{line}</span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Settings */}
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="flex items-center gap-6 px-6 shrink-0" style={{ height: "49px" }}>
                  {CUSTOMIZE_SUBTABS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setCustomizeTab(t.id); setPreviewState(t.id === "chat" ? "chat" : t.id === "starter" ? "minimized" : "welcome"); }}
                      className={`px-0 py-3.5 text-sm font-medium border-b-2 transition-base ${customizeTab === t.id ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="px-6 py-5">
                {customizeTab === "theme" && (
                  <div>
                    <ColorField label="Background color" value={theme.background} onChange={v => setTheme(t => ({ ...t, background: v }))} />
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 mt-5">
                      <ColorField label="Brand color" value={theme.brand} onChange={v => setTheme(t => ({ ...t, brand: v }))} />
                      <ColorField label="Brand Text" value={theme.brandText} onChange={v => setTheme(t => ({ ...t, brandText: v }))} />
                      <ColorField label="Customer bubble" value={theme.customerBubble} onChange={v => setTheme(t => ({ ...t, customerBubble: v }))} />
                      <ColorField label="Customer text" value={theme.customerText} onChange={v => setTheme(t => ({ ...t, customerText: v }))} />
                      <ColorField label="Bot bubble" value={theme.botBubble} onChange={v => setTheme(t => ({ ...t, botBubble: v }))} />
                      <ColorField label="Bot Text" value={theme.botText} onChange={v => setTheme(t => ({ ...t, botText: v }))} />
                    </div>
                    <div className="mt-5 max-w-[200px]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm font-semibold">Header</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted border border-border text-muted-foreground">Solid</span>
                      </div>
                      <ColorField label="" value={theme.header} onChange={v => setTheme(t => ({ ...t, header: v }))} />
                    </div>
                    <button
                      onClick={() => setTheme({ background: "#FFFFFF", brand: "#0052CC", brandText: "#FFFFFF", customerBubble: "#0052CC", customerText: "#FFFFFF", botBubble: "#F4F4F5", botText: "#262626", header: "#0052CC" })}
                      className="text-xs font-medium text-primary hover:underline mt-6"
                    >
                      Reset default
                    </button>
                  </div>
                )}

                {customizeTab === "general" && (
                  <div className="flex flex-col gap-6 max-w-md">
                    <CounterField label="Company name" value={general.companyName} onChange={v => setGeneral(g => ({ ...g, companyName: v }))} maxLength={30} />
                    <div>
                      <p className="text-sm font-semibold mb-1.5">Chatbot icon</p>
                      <UploadBox hint="Images in 1:1 ratio with minimum size 256 \u00d7 256. Supports PNG/JPG/GIF formats" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1.5">Brand logo</p>
                      <UploadBox hint="Images in 1:1 ratio with minimum size 256 \u00d7 256. Supports PNG/JPG/GIF formats" />
                    </div>
                    <button
                      onClick={() => setGeneral({ companyName: "" })}
                      className="text-xs font-medium text-primary hover:underline w-fit"
                    >
                      Reset default
                    </button>
                  </div>
                )}

                {customizeTab === "starter" && (
                  <div className="flex flex-col gap-6 max-w-md">
                    <CounterField label="Greeting" value={starterGreeting} onChange={setStarterGreeting} maxLength={30} />
                    <button
                      onClick={() => setStarterGreeting("Hi! How can I help you?")}
                      className="text-xs font-medium text-primary hover:underline w-fit"
                    >
                      Reset default
                    </button>
                  </div>
                )}

                {customizeTab === "welcome" && (
                  <div className="flex flex-col gap-6 max-w-md">
                    <div className="flex items-center gap-8">
                      <SwitchField label="Welcome screen" checked={welcome.enabled} onChange={v => setWelcome(w => ({ ...w, enabled: v }))} />
                      <SwitchField label="Guest mode" checked={welcome.guestMode} onChange={v => setWelcome(w => ({ ...w, guestMode: v }))} />
                    </div>
                    <CounterField label="Title" value={welcome.title} onChange={v => setWelcome(w => ({ ...w, title: v }))} maxLength={30} />
                    <CounterField label="Description" value={welcome.description} onChange={v => setWelcome(w => ({ ...w, description: v }))} maxLength={90} />
                    <CounterField label="Button text" value={welcome.buttonLabel} onChange={v => setWelcome(w => ({ ...w, buttonLabel: v }))} maxLength={30} />
                    <CounterField label="Placeholder input" value={welcome.placeholderInput} onChange={v => setWelcome(w => ({ ...w, placeholderInput: v }))} maxLength={30} />
                    <button
                      onClick={() => setWelcome({ enabled: true, guestMode: false, title: "Chat with Us", description: "How can I help you?", buttonLabel: "Start chat", placeholderInput: "Enter your name" })}
                      className="text-xs font-medium text-primary hover:underline w-fit"
                    >
                      Reset default
                    </button>
                  </div>
                )}

                {customizeTab === "chat" && (
                  <div className="flex flex-col gap-6 max-w-md">
                    <SwitchField label="Show logo header" checked={chat.showLogoHeader} onChange={v => setChat(c => ({ ...c, showLogoHeader: v }))} />
                    <CounterField label="Placeholder message" value={chat.placeholderMessage} onChange={v => setChat(c => ({ ...c, placeholderMessage: v }))} maxLength={30} />
                    <CounterTextarea
                      label="AI Disclaimer"
                      value={chat.aiDisclaimer}
                      onChange={v => setChat(c => ({ ...c, aiDisclaimer: v }))}
                      maxLength={120}
                      placeholder="Eg. AI may provide inaccurate info. Double-check its responses."
                    />
                    <button
                      onClick={() => setChat(c => ({ ...c, showLogoHeader: true, placeholderMessage: "Enter your message", aiDisclaimer: "" }))}
                      className="text-xs font-medium text-primary hover:underline w-fit"
                    >
                      Reset default
                    </button>
                  </div>
                )}
                </div>
              </div>

              {/* Live preview */}
              <div className="w-[352px] shrink-0 p-4 flex flex-col">
              <div className="flex-1 rounded-2xl border border-border shadow-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-center gap-5 shrink-0" style={{ height: "49px" }}>
                  {(["minimized", "welcome", "chat"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setPreviewState(s)}
                      className={`px-0 py-3.5 text-sm font-medium capitalize border-b-2 transition-base ${previewState === s ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex items-end justify-end p-4">
                    {previewState === "minimized" && (
                      <div className="flex items-center gap-2.5">
                        {starterGreeting && (
                          <div
                            className="flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full shadow-md"
                            style={{ background: theme.brand }}
                          >
                            <span className="text-sm font-medium whitespace-nowrap" style={{ color: theme.brandText }}>{starterGreeting}</span>
                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                              <HugeiconsIcon icon={ArrowRight01Icon} size={13} style={{ color: theme.brandText }} />
                            </span>
                          </div>
                        )}
                        <button
                          className="w-11 h-11 rounded-full flex items-center justify-center shadow-md shrink-0"
                          style={{ background: theme.brand }}
                        >
                          <HugeiconsIcon icon={Chat01Icon} size={18} className="text-white" />
                        </button>
                      </div>
                    )}
                    {previewState !== "minimized" && (
                      <div className="w-full rounded-xl border border-border bg-white shadow-md overflow-hidden flex flex-col" style={{ height: "380px" }}>
                        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: theme.header }}>
                          <div className="flex items-center gap-2">
                            {chat.showLogoHeader && (
                              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                <HugeiconsIcon icon={Chat01Icon} size={13} style={{ color: theme.brandText }} />
                              </div>
                            )}
                            <span className="text-sm font-semibold" style={{ color: theme.brandText }}>{chat.headerTitle}</span>
                          </div>
                          <div className="flex items-center gap-2" style={{ color: theme.brandText }}>
                            <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="rotate-[-45deg]" />
                            <span className="text-lg leading-none">–</span>
                          </div>
                        </div>
                        {previewState === "welcome" ? (
                          welcome.enabled ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-6" style={{ background: theme.background }}>
                              <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
                                <HugeiconsIcon icon={Chat01Icon} size={26} className="text-primary" />
                              </div>
                              <p className="text-base font-bold mb-1" style={{ color: theme.botText }}>{welcome.title}</p>
                              <p className="text-sm mb-5" style={{ color: theme.botText, opacity: 0.7 }}>{welcome.description}</p>
                              {!welcome.guestMode && (
                                <input
                                  readOnly
                                  placeholder={welcome.placeholderInput}
                                  className="w-full h-10 rounded-lg border border-border px-3 text-sm mb-2.5 placeholder:text-muted-foreground"
                                />
                              )}
                              <button className="w-full h-10 rounded-lg text-sm font-semibold" style={{ background: theme.customerBubble, color: theme.customerText }}>
                                {welcome.buttonLabel}
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-1.5" style={{ background: theme.background }}>
                              <HugeiconsIcon icon={InformationCircleIcon} size={18} className="text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Welcome screen is disabled</p>
                            </div>
                          )
                        ) : (
                          <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto" style={{ background: theme.background }}>
                            <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground opacity-70">Today</p>

                            <div className="self-end max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-xs" style={{ background: theme.customerBubble, color: theme.customerText }}>
                              What kind of messages do you support?
                            </div>

                            {/* 1. Text + attachments */}
                            <div className="self-start max-w-[85%] flex flex-col gap-1.5">
                              <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs" style={{ background: theme.botBubble, color: theme.botText }}>
                                This is a plain text message.
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-white text-[10px] font-semibold" style={{ color: "#D33B3B" }}>
                                  <span className="w-3.5 h-3.5 rounded bg-[#D33B3B] text-white flex items-center justify-center text-[6px] font-bold">PDF</span>
                                  Reference doc
                                </span>
                                <span className="px-2 py-1 rounded-lg border border-border bg-white text-[10px] font-semibold" style={{ color: theme.brand }}>1</span>
                                <span className="px-2 py-1 rounded-lg border border-border bg-white text-[10px] font-semibold" style={{ color: theme.brand }}>2</span>
                                <span className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-white text-[10px] font-semibold" style={{ color: theme.brand }}>
                                  <HugeiconsIcon icon={ExternalLinkIcon} size={10} /> Go to link
                                </span>
                              </div>
                            </div>

                            {/* 2. Button list */}
                            <div className="self-start max-w-[85%] flex flex-col gap-1.5 w-full">
                              <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs" style={{ background: theme.botBubble, color: theme.botText }}>
                                This is a button-list message.
                              </div>
                              <div className="flex flex-col gap-1.5 w-full">
                                <button className="w-full h-8 rounded-lg border text-xs font-semibold bg-white" style={{ borderColor: theme.brand, color: theme.brand }}>FPT AI</button>
                                <button className="w-full h-8 rounded-lg border text-xs font-semibold bg-white" style={{ borderColor: theme.brand, color: theme.brand }}>FPT Cloud</button>
                              </div>
                            </div>

                            {/* 3. Quick replies */}
                            <div className="self-start max-w-[85%] flex flex-col gap-1.5">
                              <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs" style={{ background: theme.botBubble, color: theme.botText }}>
                                Here are 3 quick replies.
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {["How can I help you?", "Thank you!", "Got it"].map(t => (
                                  <button key={t} className="px-2.5 py-1.5 rounded-full border text-[10px] font-semibold bg-white" style={{ borderColor: theme.brand, color: theme.brand }}>{t}</button>
                                ))}
                              </div>
                            </div>

                            {/* 4. Carousel */}
                            <div className="self-start flex flex-col gap-1.5" style={{ maxWidth: "100%" }}>
                              <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs w-fit" style={{ background: theme.botBubble, color: theme.botText }}>
                                This is a carousel message.
                              </div>
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {[{ title: "Visa Credit Card", sub: "Up to 5% cashback", color: theme.brand }, { title: "24/7 Support", sub: "Talk to an agent", color: "#F5A623" }].map((c, i) => (
                                  <div key={i} className="shrink-0 rounded-lg border border-border bg-white overflow-hidden" style={{ width: "132px" }}>
                                    <div className="h-14 flex items-center justify-center text-[9px] font-bold text-white text-center px-2 leading-tight" style={{ background: c.color }}>{c.title}</div>
                                    <div className="p-2 flex flex-col gap-1">
                                      <p className="text-[10px] font-semibold leading-tight">{c.title}</p>
                                      <p className="text-[9px] text-muted-foreground leading-tight">{c.sub}</p>
                                      <button className="mt-1 h-6 rounded text-[9px] font-semibold" style={{ background: theme.customerBubble, color: theme.customerText }}>View details</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-auto pt-2 border-t border-border">
                              <div className="h-8 rounded-full bg-surface-muted flex items-center px-3 text-xs text-muted-foreground">
                                {chat.placeholderMessage}
                              </div>
                              {chat.aiDisclaimer && (
                                <p className="text-[10px] text-muted-foreground text-center mt-1.5 leading-snug">{chat.aiDisclaimer}</p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="text-center py-2 text-[11px] text-muted-foreground shrink-0 border-t border-border/60">
                          Powered by FPT.AI
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline">
            <HugeiconsIcon icon={CircleArrowReload01Icon} size={15} /> Remove configuration
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={onClose} className="btn-primary">Save configuration</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>,
    document.body
  );
}

function DeployTab({ agentId, onViewTriggers }: { agentId: string; onViewTriggers?: () => void }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [showPublish, setShowPublish] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showVersionSelect, setShowVersionSelect] = useState(false);
  const [showWebWidgetConfig, setShowWebWidgetConfig] = useState(false);
  const [recipients, setRecipients] = useState<{ id: number; name: string; sub: string }[]>([]);
  const agentTriggers = triggerStore.list(agentId);
  const isAutomation = agentTriggers.length > 0;
  void tick;
  const publishState = agentPublishStore.get(agentId);
  const published = publishState.placement !== null;
  const servingVersion = publishState.version;
  // Automation counts as one live destination alongside external channels — otherwise the
  // header pill reads "Automation · v1.0.2" while this summary bar contradicts it with 0.
  const liveDestinationCount = publishState.channels.length + (published && isAutomation ? 1 : 0);

  const toggleChannel = (id: string) => {
    if (!published) return;
    const set = new Set(publishState.channels);
    set.has(id) ? set.delete(id) : set.add(id);
    agentPublishStore.setChannels(agentId, [...set]);
    refresh();
  };

  return (
    <div className="max-w-[1040px] mx-auto px-8 py-8">
      {showWebWidgetConfig && (
        <WebWidgetConfigModal onClose={() => setShowWebWidgetConfig(false)} />
      )}
      {showPublish && (
        <PublishAgentModal
          onClose={() => setShowPublish(false)}
          onPublish={audience => {
            const info = AUDIENCE_INFO[audience] ?? AUDIENCE_INFO.me;
            setRecipients(prev => [...prev, { id: Date.now(), name: info.name, sub: info.sub }]);
            agentPublishStore.publish(agentId, "workspace", publishState.channels, servingVersion);
            refresh();
            setShowSuccess(true);
          }}
        />
      )}
      {showSuccess && (
        <PublishSuccessModal
          url="https://agents-staging.fpt.ai/marketplace"
          onClose={() => setShowSuccess(false)}
        />
      )}
      {showVersionSelect && (
        <VersionSelectModal
          currentVersion={servingVersion}
          onClose={() => setShowVersionSelect(false)}
          onRelease={v => { agentPublishStore.publish(agentId, publishState.placement, publishState.channels, v); refresh(); }}
        />
      )}
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={GridViewIcon} size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Deploy channels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Where this agent is live, and which version it's running.</p>
        </div>
      </div>

      {/* Version / channel summary bar */}
      <div className="rounded-xl border border-border bg-surface flex items-center justify-between px-5 py-4 mb-8">
        <div className="flex items-center gap-10">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Serving version</p>
            <p className="text-base font-semibold font-mono">{servingVersion}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Live channels</p>
            <p className="text-base font-semibold">{liveDestinationCount}</p>
          </div>
        </div>
        <button onClick={() => setShowVersionSelect(true)} className="btn-primary">
          <HugeiconsIcon icon={Rocket01Icon} size={14} /> Choose release version
        </button>
      </div>

      {/* Agent Workspace (conversational) / Automation (has triggers) — mutually exclusive,
          mirroring the Publish modal's "Publish to" destination sub-section exactly. */}
      {isAutomation ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">Automation</h2>
            <span className="text-xs text-muted-foreground">Running on {agentTriggers.length} trigger{agentTriggers.length === 1 ? "" : "s"}</span>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600">
                <HugeiconsIcon icon={BoltIcon} size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground mb-1">Automation</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This agent runs on its own from the {agentTriggers.length} trigger{agentTriggers.length === 1 ? "" : "s"} set
                  up in Console, for the whole organization. Nobody installs it to Workspace and nobody chats with it directly.
                </p>
                {onViewTriggers && (
                  <button type="button" onClick={onViewTriggers} className="text-xs font-semibold text-primary hover:underline mt-2">
                    View triggers
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">Agent Workspace</h2>
            {recipients.length > 0 ? (
              <>
                <span className="text-xs text-muted-foreground">{recipients.length} recipient{recipients.length > 1 ? "s" : ""}</span>
                <a href="#" className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5 ml-auto">
                  Open in workspace <HugeiconsIcon icon={ChevronRightIcon} size={12} />
                </a>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Not open to anyone yet</span>
            )}
          </div>

          {recipients.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mb-4">
                <HugeiconsIcon icon={Share08Icon} size={20} className="text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1.5">No one has this agent yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5 leading-relaxed">
                Publish to open this agent to a small group first, then expand.
              </p>
              <button onClick={() => setShowPublish(true)} className="btn-primary">Publish</button>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              {recipients.map((r, i) => (
                <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={UserIcon} size={16} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                  </div>
                  <button
                    onClick={() => setRecipients(prev => prev.filter(x => x.id !== r.id))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-base shrink-0"
                    title="Remove"
                  >
                    <HugeiconsIcon icon={Delete01Icon} size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* External channels — one shared list with the Publish modal, in CHANNEL_CATALOG's order. */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-sm font-semibold">External channels</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CHANNEL_CATALOG.map(c => {
            const live = published && publishState.channels.includes(c.id);
            const disabled = !published || c.available === false;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (!published || c.available === false) return;
                  if (c.id === "web") setShowWebWidgetConfig(true);
                  else toggleChannel(c.id);
                }}
                disabled={disabled}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-base ${
                  !disabled
                    ? "border-border bg-surface hover:border-primary/30 hover:shadow-soft cursor-pointer"
                    : "border-border bg-surface-muted/40 opacity-70 cursor-not-allowed"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                  <ChannelIcon ch={c} size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className={`text-xs truncate ${live ? "text-success" : "text-muted-foreground"}`}>
                    {c.available === false ? "Coming soon" : !published ? "Publish the agent to enable this channel" : live ? `Live · ${servingVersion}` : "Not connected"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
        <HugeiconsIcon icon={Icon} size={15} className="text-muted-foreground shrink-0" />
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
        <HugeiconsIcon icon={Icon} size={15} className="text-muted-foreground shrink-0" />
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
function EmptyStateBox({ icon, description, addLabel, onAdd, disabled, disabledReason }: {
  icon: any; description: string; addLabel?: string; onAdd?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean; disabledReason?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 py-6 px-4 text-center">
      <HugeiconsIcon icon={icon} size={22} className="text-muted-foreground/50" />
      <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">{description}</p>
      {addLabel && (
        <button
          onClick={disabled ? undefined : onAdd}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          className={`flex items-center gap-1 text-xs font-semibold transition-base ${
            disabled ? "text-primary opacity-[0.45] cursor-not-allowed no-underline" : "text-primary hover:underline"
          }`}
        >
          <HugeiconsIcon icon={Add01Icon} size={12} /> {addLabel}
        </button>
      )}
      {disabled && disabledReason && (
        <p className="text-[11px] text-muted-foreground max-w-[240px] leading-relaxed">{disabledReason}</p>
      )}
    </div>
  );
}

function NewConfigPanel({ agentId, model, onModelChange, onConnectionsChange }: { agentId: string; model: string; onModelChange: (id: string) => void; onConnectionsChange?: () => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ connectors: true, skills: true, guardrails: true, triggers: true, "sub-agents": true });
  const guardrailsAddRef = useRef<((pos:{top:number;left:number}) => void) | null>(null);
  const skillsAddRef = useRef<((pos:{top:number;left:number}) => void) | null>(null);
  const subAgentsAddRef = useRef<(() => void) | null>(null);
  const connectorsAddRef = useRef<((pos:{top:number;left:number}) => void) | null>(null);
  const triggersAddRef = useRef<(() => void) | null>(null);

  const sections = [
    {
      id: "connectors", icon: ConnectIcon, label: "Kết nối",
      onAdd: (pos: {top:number;left:number}) => connectorsAddRef.current?.(pos),
      content: (
        <ConnectorsInner agentId={agentId} onRegisterAdd={(fn) => { connectorsAddRef.current = fn; }} onChange={onConnectionsChange} />
      ),
    },
    {
      id: "skills", icon: PuzzleIcon, label: "Skills",
      onAdd: (pos: {top:number;left:number}) => skillsAddRef.current?.(pos),
      content: (
        <SkillsInner onRegisterAdd={(fn) => { skillsAddRef.current = fn; }} />
      ),
    },
    { id: "knowledge",  icon: NoteIcon,         label: "Knowledge", comingSoon: true },
    {
      id: "triggers", icon: TimeScheduleIcon, label: "Triggers",
      onAdd: () => triggersAddRef.current?.(),
      disabled: perUserConnector(agentId) !== null,
      content: (
        <TriggersInner agentId={agentId} onRegisterAdd={(fn) => { triggersAddRef.current = fn; }} onConnectionsChange={onConnectionsChange} />
      ),
    },
    {
      id: "guardrails", icon: Shield01Icon, label: "Guardrails",
      onAdd: (pos: {top:number;left:number}) => guardrailsAddRef.current?.(pos),
      content: (
        <GuardrailsInner onRegisterAdd={(fn) => { guardrailsAddRef.current = fn; }} />
      ),
    },
    {
      id: "sub-agents", icon: UserMultipleIcon, label: "Sub-Agents",
      onAdd: () => subAgentsAddRef.current?.(),
      content: (
        <SubAgentsInner onRegisterAdd={(fn) => { subAgentsAddRef.current = fn; }} />
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Model row */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div className="rounded-lg bg-primary-soft flex items-center justify-center shrink-0" style={{width:"28px",height:"28px"}}>
          <HugeiconsIcon icon={CpuIcon} size={16} className="text-primary" />
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
                className="group rounded-lg bg-primary-soft flex items-center justify-center shrink-0 text-primary transition-base relative"
                style={{ width: "28px", height: "28px", opacity: s.comingSoon ? 0.5 : 1 }}
              >
                <HugeiconsIcon icon={s.icon} size={16} className="group-hover:opacity-0 transition-opacity" />
                <HugeiconsIcon icon={ChevronUpIcon} size={14} className="absolute opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <span className="text-sm font-medium flex-1 text-left">{s.label}</span>
              {s.comingSoon
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted border border-border text-muted-foreground">Coming soon</span>
                : <button
                  aria-disabled={!!s.disabled}
                  className={`transition-base ${s.disabled ? "text-muted-foreground opacity-[0.45] cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={(e) => {
                    if (s.disabled) return;
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

function PreviewPanel({ agentId, view, onViewChange, onConnectionsChange }: { agentId: string; view: "config" | "chat"; onViewChange: (v: "config" | "chat") => void; onConnectionsChange?: () => void }) {
  const setView = onViewChange;
  const [selectedModel, setSelectedModel] = useState("deepseek-v4-flash");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([
    { role: "agent", text: "Hello! I'm Banking ABC Customer Care. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setTimeout(() => {
      setMessages(m => [...m, { role: "agent", text: `Thanks for reaching out! I'm processing your request about "${userMsg}". Please give me a moment.` }]);
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
        <div className="flex-1 overflow-y-auto pb-[96px]">
          <NewConfigPanel agentId={agentId} model={selectedModel} onModelChange={setSelectedModel} onConnectionsChange={onConnectionsChange} />
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
              onClick={() => setMessages([{ role: "agent", text: "Hello! I'm Banking ABC Customer Care. How can I help you today?" }])}
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
            {["Lock my credit card", "Loan interest rates", "Open an account"].map(q => (
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
                placeholder="Type a message to test…"
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
          <HugeiconsIcon icon={Icon} size={16} />
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

interface PublishChange { id: string; label: string; marker: "~" | "+" | "-"; before: number; after: number; }

const PUBLISH_CHANGE_CANDIDATES: { id: string; label: string }[] = [
  { id: "instructions", label: "Instructions" },
  { id: "model",        label: "Model" },
  { id: "skills",       label: "Skills" },
  { id: "guardrails",   label: "Guardrails" },
];

function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Deterministic mock "what changed since last publish" list — this prototype has no real
 * version-diff data, so derive a small, stable set from the agentId (same pattern as
 * mockInstallCount) instead of randomizing on every render. Occasionally empty on purpose so
 * the "hide the section when nothing changed" path is reachable. */
function mockPublishChanges(agentId: string): PublishChange[] {
  const h = hashString(agentId);
  const count = h % 4; // 0..3
  const out: PublishChange[] = [];
  for (let i = 0; i < PUBLISH_CHANGE_CANDIDATES.length && out.length < count; i++) {
    const c = PUBLISH_CHANGE_CANDIDATES[(h >>> (i * 3)) % PUBLISH_CHANGE_CANDIDATES.length];
    if (out.some(o => o.id === c.id)) continue;
    const seed = hashString(agentId + c.id);
    const marker: PublishChange["marker"] = seed % 5 === 0 ? "+" : seed % 7 === 0 ? "-" : "~";
    const base = 30 + (seed % 90);
    const delta = marker === "~" ? (seed % 13) - 6 : marker === "+" ? 5 + (seed % 20) : -(5 + (seed % 15));
    const before = marker === "+" ? 0 : base;
    const after = marker === "-" ? 0 : Math.max(0, base + delta);
    out.push({ id: c.id, label: c.label, marker, before, after });
  }
  return out;
}

function LiveDotChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" /> {label}
    </span>
  );
}

function AudienceRadioRow({ icon, title, description, selected, liveNow, disabled, onClick, children }: {
  icon: any; title: string; description: string;
  selected: boolean; liveNow?: boolean; disabled?: boolean; onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={`w-full flex items-start gap-3 text-left rounded-xl border px-4 py-3.5 transition-base ${
          disabled
            ? "opacity-[0.45] cursor-not-allowed border-border bg-surface"
            : selected ? "border-primary bg-primary-soft/50 ring-1 ring-primary cursor-pointer" : "border-border bg-surface hover:border-primary/40 hover:bg-surface-muted cursor-pointer"
        }`}
      >
        <span
          className={`mt-[3px] w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-base ${
            selected ? "border-primary" : "border-border"
          }`}
        >
          {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </span>
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-base ${
            selected ? "bg-white text-primary" : "bg-surface-muted text-muted-foreground"
          }`}
        >
          <HugeiconsIcon icon={icon} size={16} />
        </span>
        <span className="flex-1 min-w-0 pt-px">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {liveNow && <LiveDotChip label="Live now" />}
          </span>
          <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</span>
        </span>
      </button>
      {children}
    </div>
  );
}

function PublishChannelRow({ ch, checked, onToggle }: { ch: ChannelCatalogEntry; checked: boolean; onToggle: () => void }) {
  const disabled = ch.available === false;
  return (
    <label className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 rounded-lg border transition-base ${
      disabled ? "border-border bg-surface-muted/40 cursor-not-allowed" : "border-border bg-surface hover:bg-surface-muted cursor-pointer"
    }`}>
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={onToggle}
        className="w-4 h-4 rounded accent-primary shrink-0 disabled:cursor-not-allowed"
      />
      <span className="w-5 h-5 flex items-center justify-center shrink-0"><ChannelIcon ch={ch} size={16} /></span>
      {/* No truncate/flex-1 here — the name must never clip. If the "Coming soon" badge doesn't
          fit on this line, flex-wrap drops it to a second line instead. */}
      <span className={`text-sm font-medium whitespace-nowrap ${disabled ? "text-muted-foreground" : "text-foreground"}`}>{ch.name}</span>
      {disabled && (
        <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-surface-muted text-muted-foreground shrink-0 whitespace-nowrap ml-auto">Coming soon</span>
      )}
    </label>
  );
}

function PublishModal({ agentId, agentName, onClose, onPublished, onManageChannels, onManageTriggers }: {
  agentId: string; agentName: string; onClose: () => void; onPublished?: () => void;
  onManageChannels?: () => void; onManageTriggers?: () => void;
}) {
  const agentTriggers = triggerStore.list(agentId);
  const triggerCount = agentTriggers.length;
  const hasTrigger = triggerCount > 0;
  const needsSetupCount = agentTriggers.filter(triggerNeedsSetup).length;
  const activeTriggerCount = agentTriggers.filter(t => t.enabled && !triggerNeedsSetup(t)).length;
  const agentConnectors = agentConnectorStore.list(agentId);
  const hasPersonalConnector = agentConnectorStore.hasPersonalConnector(agentId);
  const current = agentPublishStore.get(agentId);
  const BASE = current.version.replace(/^v/, "").split(".").map(Number);

  const [versionType, setVersionType] = useState<"patch" | "minor" | "major">("patch");
  const newVersion = (() => {
    const [maj, min, pat] = BASE;
    if (versionType === "major") return [maj + 1, 0, 0];
    if (versionType === "minor") return [maj, min + 1, 0];
    return [maj, min, pat + 1];
  })();
  const versionName = `v${newVersion.join(".")}`;

  const changes = mockPublishChanges(agentId);
  const [changesOpen, setChangesOpen] = useState(true);
  const totalChangeRows = changes.length + (agentConnectors.length > 0 ? 1 : 0) + (triggerCount > 0 ? 1 : 0);

  const [note, setNote] = useState("");
  const [noteTouched, setNoteTouched] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const [destination, setDestination] = useState<"workspace" | "automation" | null>(hasTrigger ? "automation" : "workspace");

  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(current.channels));

  const toggleChannel = (id: string) => setSelectedChannels(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const draftNoteFromChanges = () => {
    if (changes.length === 0) return;
    setNote(changes.map(c => `- ${c.label}: ${c.before} → ${c.after} dòng`).join("\n"));
    setNoteTouched(true);
  };

  const NOTE_MAX = 500;
  const noteEmpty = note.trim().length === 0;
  const showNoteError = (noteTouched || attemptedSubmit) && noteEmpty;
  const selectedCount = (destination ? 1 : 0) + selectedChannels.size;
  const hasPublishTarget = selectedCount > 0;
  const canPublish = !noteEmpty && hasPublishTarget;
  const footerHelper = noteEmpty
    ? "Hãy mô tả ngắn gọn phiên bản này thay đổi gì."
    : !hasPublishTarget
      ? "Chưa chọn kênh triển khai"
      : null;

  const doPublish = () => {
    if (!canPublish) {
      setAttemptedSubmit(true);
      if (noteEmpty) {
        noteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        noteRef.current?.focus();
      }
      return;
    }
    agentPublishStore.publish(agentId, destination, [...selectedChannels], versionName);
    toast.success(`Đã publish ${versionName}.`);
    onPublished?.();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white rounded-2xl border border-border shadow-lg animate-fade-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">Lưu phiên bản</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Tạo {versionName} — chọn nơi triển khai.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Section 1 — Nội dung sẽ được lưu */}
          {totalChangeRows > 0 && (
            <div>
              <button type="button" onClick={() => setChangesOpen(o => !o)} className="w-full flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  NỘI DUNG SẼ ĐƯỢC LƯU
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-surface-muted text-muted-foreground">{totalChangeRows}</span>
                </span>
                <HugeiconsIcon icon={changesOpen ? ChevronUpIcon : ChevronDownIcon} size={16} className="text-muted-foreground" />
              </button>
              {changesOpen && (
                <div className="space-y-1.5">
                  {changes.map(c => {
                    const delta = c.after - c.before;
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-surface-muted/60">
                        <span className={`w-4 text-center text-sm font-semibold shrink-0 ${
                          c.marker === "+" ? "text-success" : c.marker === "-" ? "text-destructive" : "text-muted-foreground"
                        }`}>{c.marker}</span>
                        <span className="text-sm font-medium shrink-0">{c.label}</span>
                        <span className="flex-1 text-xs text-muted-foreground text-right">{c.before} → {c.after} dòng</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                          delta > 0 ? "bg-success/10 text-success" : delta < 0 ? "bg-destructive/10 text-destructive" : "bg-surface-muted text-muted-foreground"
                        }`}>{delta > 0 ? `+${delta}` : delta}</span>
                      </div>
                    );
                  })}
                  {agentConnectors.length > 0 && (
                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-surface-muted/60">
                      <span className="w-4 text-center text-sm font-semibold shrink-0 text-muted-foreground">~</span>
                      <span className="text-sm font-medium shrink-0">Connectors</span>
                      <span className="flex-1 text-xs text-muted-foreground text-right">
                        {agentConnectors.length} connector · {hasPersonalConnector ? "Riêng cá nhân" : "Dùng chung"}
                      </span>
                    </div>
                  )}
                  {triggerCount > 0 && (
                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-surface-muted/60">
                      <span className="w-4 text-center text-sm font-semibold shrink-0 text-muted-foreground">~</span>
                      <span className="text-sm font-medium shrink-0">Triggers</span>
                      <span className="flex-1 text-xs text-muted-foreground text-right">
                        {triggerCount} trigger · {activeTriggerCount} đang hoạt động
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 2 — Loại phiên bản */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Loại phiên bản</p>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Phiên bản mới</p>
                <p className="text-xl font-bold tracking-tight text-foreground font-display">
                  v<span className={versionType === "major" ? "text-primary underline underline-offset-4 decoration-2" : ""}>{newVersion[0]}</span>
                  .
                  <span className={versionType === "minor" ? "text-primary underline underline-offset-4 decoration-2" : ""}>{newVersion[1]}</span>
                  .
                  <span className={versionType === "patch" ? "text-primary underline underline-offset-4 decoration-2" : ""}>{newVersion[2]}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              {([
                { key: "patch", label: "Patch" },
                { key: "minor", label: "Minor" },
                { key: "major", label: "Major" },
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
              {versionType === "patch" && "Sửa lỗi nhỏ, vá lỗ hổng, giữ nguyên tính năng cũ."}
              {versionType === "minor" && "Thêm tính năng mới, vẫn tương thích với bản cũ."}
              {versionType === "major" && "Thay đổi lớn, có thể không tương thích với bản cũ."}
            </p>
          </div>

          {/* Section 3 — Ghi chú phiên bản */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Ghi chú phiên bản <span className="text-destructive">*</span></label>
              <button type="button" onClick={draftNoteFromChanges} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <HugeiconsIcon icon={SparklesIcon} size={12} /> Soạn từ thay đổi
              </button>
            </div>
            <textarea
              ref={noteRef}
              rows={3}
              maxLength={NOTE_MAX}
              placeholder="Phiên bản này có gì mới? Người dùng agent sẽ đọc nội dung này."
              className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm outline-none focus:ring-2 transition-base resize-none ${
                showNoteError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "border-border focus:border-primary focus:ring-primary/20"
              }`}
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={() => setNoteTouched(true)}
            />
            <div className="flex items-center justify-between mt-1">
              {showNoteError ? <span className="text-xs text-destructive">Hãy mô tả ngắn gọn phiên bản này thay đổi gì.</span> : <span />}
              <span className="text-xs text-muted-foreground shrink-0">{note.length}/{NOTE_MAX}</span>
            </div>
          </div>

          {/* Publish tới kênh */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold">Publish tới kênh</p>
                <p className="text-xs text-muted-foreground mt-0.5">Triển khai phiên bản này tới các kênh cụ thể</p>
              </div>
              {selectedCount > 0
                ? <LiveDotChip label={`Đã chọn ${selectedCount} kênh`} />
                : <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Chưa chọn kênh triển khai</span>}
            </div>

            <div className="mt-3.5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">WORKSPACE NỘI BỘ</p>
                <div className="space-y-2">
                  <AudienceRadioRow
                    icon={UserGroupIcon}
                    title="Workspace"
                    description="Người dùng Install agent rồi chat thủ công"
                    selected={destination === "workspace"}
                    disabled={hasTrigger}
                    liveNow={current.placement === "workspace"}
                    onClick={() => setDestination(d => d === "workspace" ? null : "workspace")}
                  />
                  <AudienceRadioRow
                    icon={BoltIcon}
                    title="Automation"
                    description="Agent tự chạy theo Trigger, người dùng không cần Install"
                    selected={destination === "automation"}
                    disabled={!hasTrigger}
                    liveNow={current.placement === "automation"}
                    onClick={() => setDestination(d => d === "automation" ? null : "automation")}
                  >
                    {hasTrigger && needsSetupCount > 0 && (
                      <p className="text-xs text-warning mt-2 ml-1">
                        {needsSetupCount} trigger chưa hoàn tất và sẽ không chạy sau khi publish.{" "}
                        {onManageTriggers && (
                          <button type="button" onClick={onManageTriggers} className="font-semibold hover:underline">
                            Hoàn tất setup
                          </button>
                        )}
                      </p>
                    )}
                  </AudienceRadioRow>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {hasTrigger
                    ? "Agent có Trigger sẽ chạy tự động, người dùng không cần cài đặt agent. Hãy chọn kênh Automation hoặc các kênh external."
                    : "Agent chưa có Trigger nên chưa chạy tự động được. Thêm Trigger để publish vào Automation."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">KÊNH EXTERNAL</p>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNEL_CATALOG.map(ch => (
                    <PublishChannelRow key={ch.id} ch={ch} checked={selectedChannels.has(ch.id)} onToggle={() => toggleChannel(ch.id)} />
                  ))}
                </div>
                <div className="text-right mt-2">
                  <button type="button" onClick={onManageChannels} className="text-xs font-semibold text-primary hover:underline">
                    Quản lý ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">{footerHelper}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Huỷ</button>
            <button
              className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-2 transition-base"
              onClick={doPublish}
            >
              <HugeiconsIcon icon={Rocket01Icon} size={14} /> Publish {versionName}
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

/* ============ Skills Inner ============ */
const WS_SKILLS = [
  { id: 1, name: "/canvas-design",      author: "Anthropic", installs: "1.8M", desc: "Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when t…" },
  { id: 2, name: "/web-artifacts-builder", author: "Anthropic", installs: "1.1M", desc: "Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web…" },
  { id: 3, name: "/mcp-builder",        author: "Anthropic", installs: "944.1K", desc: "Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with…" },
  { id: 4, name: "/theme-factory",      author: "Anthropic", installs: "905K",   desc: "Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc.…" },
  { id: 5, name: "/learn",              author: "Anthropic", installs: "858K",   desc: "Use this skill when the user wants intellectual understanding — learning how or why something works,…" },
  { id: 6, name: "/brand-guidelines",   author: "Anthropic", installs: "816.1K", desc: "Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having…" },
  { id: 7, name: "/doc-coauthoring",    author: "Anthropic", installs: "794.7K", desc: "Guide users through a structured workflow for co-authoring documentation. Use when user wants to write…" },
  { id: 8, name: "/internal-comms",     author: "Anthropic", installs: "615K",   desc: "A set of resources to help me write all kinds of internal communications, using the formats that my company lik…" },
];

function ConnectWorkspaceSkillModal({ onClose, onAdd, added }: {
  onClose: () => void;
  onAdd: (skill: typeof WS_SKILLS[number]) => void;
  added: Set<number>;
}) {
  const [search, setSearch] = useState("");
  const filtered = WS_SKILLS.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[80vh] animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-2 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Connect workspace skill</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Skills shared across all agents in this workspace.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pb-4 pt-3 shrink-0">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-primary/50 bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-base"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No skills in this workspace yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(s => {
                const isAdded = added.has(s.id);
                return (
                  <div key={s.id} className="relative flex flex-col p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-base">
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-sm font-semibold text-foreground leading-tight">{s.name}</span>
                      <button
                        onClick={() => { if (!isAdded) onAdd(s); }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ml-2 transition-base ${
                          isAdded
                            ? "bg-primary-soft text-primary cursor-default"
                            : "hover:bg-surface-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title={isAdded ? "Added" : "Add"}
                      >
                        {isAdded
                          ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} />
                          : <HugeiconsIcon icon={Add01Icon} size={15} />
                        }
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                      {s.author} • <HugeiconsIcon icon={Download01Icon} size={10} className="inline mb-0.5" />{s.installs}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ConnectorsInner({ agentId, onRegisterAdd, onChange }: { agentId: string; onRegisterAdd?: (fn: (pos:{top:number;left:number}) => void) => void; onChange?: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{top:number;left:number}>({top:0,left:0});
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<ConnectorScope>("shared");
  const [tick, setTick] = useState(0);
  void tick;
  const connected = agentConnectorStore.list(agentId).map(c => ({ id: c.connectorId, mode: c.scope }));

  useEffect(() => {
    onRegisterAdd?.((pos: {top:number;left:number}) => { setMenuPos(pos); setShowMenu(true); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showMenu) return;
    const h = () => setShowMenu(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  // hasTriggers() counts ANY trigger — schedule, webhook, or external app, regardless of
  // status — so this doesn't distinguish trigger types, matching the business rule that an
  // agent can never mix a per-user connection with unattended trigger runs.
  const hasTrigger = hasTriggers(agentId);
  const menuItems = [
    { icon: Building02Icon, label: "Dùng chung", sub: "Một tài khoản cho cả workspace", mode: "shared" as const, disabled: false },
    { icon: UserIcon, label: "Riêng cá nhân", sub: "Mỗi người dùng tự kết nối tài khoản của mình", mode: "personal" as const, disabled: hasTrigger },
  ];

  const connectedIds = connected.map(c => c.id);
  const toggleConnector = (id: string) => {
    if (agentConnectorStore.list(agentId).some(c => c.connectorId === id)) {
      agentConnectorStore.remove(agentId, id);
    } else {
      const ok = agentConnectorStore.add(agentId, id, pickerMode);
      if (!ok) {
        toast.error(CONNECTOR_BLOCKED_BY_TRIGGER_REASON());
        return;
      }
    }
    setTick(t => t + 1);
    onChange?.();
  };

  return (
    <>
      {connected.length === 0 ? (
        <EmptyStateBox
          icon={ConnectIcon}
          description="Các tài khoản và hệ thống bên ngoài mà agent này có thể sử dụng."
          addLabel="Thêm Connector"
          onAdd={e => {
            const r = e.currentTarget.getBoundingClientRect();
            setMenuPos({ top: r.bottom + 4, left: r.right });
            setShowMenu(true);
          }}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {connected.map(c => {
            // Fall back to the raw id instead of silently dropping the row — a connector
            // whose metadata can't be found would otherwise vanish from the list while still
            // sitting in the store, which reads to the Builder as "my connector disappeared".
            const meta = SUB_AGENT_CONNECTORS.find(x => x.id === c.id);
            return (
              <div key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base">
                <span className="w-6 h-6 rounded bg-surface-muted border border-border flex items-center justify-center text-[9px] font-bold shrink-0">{meta?.logo ?? "?"}</span>
                <span className="text-xs font-medium flex-1 truncate">{meta?.name ?? c.id}</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                  style={c.mode === "shared" ? { background: "#EEF2FF", color: "#4338CA", border: "0.5px solid #C7D2FE" } : { background: "#ECFDF5", color: "#047857", border: "0.5px solid #A7F3D0" }}
                >
                  {c.mode === "shared" ? "Dùng chung" : "Riêng cá nhân"}
                </span>
                <button
                  onClick={() => { agentConnectorStore.remove(agentId, c.id); setTick(t => t + 1); onChange?.(); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-muted transition-base shrink-0">
                  <HugeiconsIcon icon={Delete01Icon} size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {hasTrigger && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50">
          <HugeiconsIcon icon={InformationCircleIcon} size={14} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            Agent này có Trigger nên chạy bằng tài khoản Dùng chung. Trigger được setup ở Workspace.
          </p>
        </div>
      )}

      {/* Dùng chung / Riêng cá nhân dropdown */}
      {showMenu && createPortal(
        <div
          className="fixed z-[9999]"
          style={{ top: menuPos.top, right: window.innerWidth - menuPos.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl border border-border shadow-elev p-1.5 w-72 animate-fade-up">
            {menuItems.map((item, i) => (
              <div key={i}>
                {i > 0 && <div className="h-px bg-border mx-2.5 my-1" />}
                <button
                  type="button"
                  aria-disabled={item.disabled}
                  className={`w-full flex items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-base ${
                    item.disabled ? "opacity-[0.45] cursor-not-allowed" : "hover:bg-surface-muted cursor-pointer"
                  }`}
                  onClick={() => {
                    if (item.disabled) return;
                    setShowMenu(false); setPickerMode(item.mode); setShowPicker(true);
                  }}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.disabled ? "bg-surface-muted text-muted-foreground" : "bg-primary-soft text-primary"
                  }`}>
                    <HugeiconsIcon icon={item.icon} size={16} />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground mt-0.5">{item.sub}</span>
                  </span>
                </button>
              </div>
            ))}
            {menuItems.some(m => m.disabled) && (
              <div className="mt-1 flex items-start gap-2 px-3 py-2.5 rounded-xl border border-warning/25 bg-[hsl(var(--warning-soft))]">
                <HugeiconsIcon icon={Alert01Icon} size={13} className="shrink-0 mt-0.5 text-warning" />
                <p className="text-[11px] text-warning leading-relaxed">
                  Agent đang có Trigger nên chỉ dùng được kết nối Dùng chung.
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {showPicker && (
        <ConnectorPickerModal
          connectors={SUB_AGENT_CONNECTORS}
          added={connectedIds}
          onToggle={toggleConnector}
          onClose={() => setShowPicker(false)}
          mode={pickerMode}
          onChangeMode={() => { setShowPicker(false); setShowMenu(true); }}
        />
      )}
    </>
  );
}

function SkillsInner({ onRegisterAdd }: { onRegisterAdd?: (fn: (pos:{top:number;left:number}) => void) => void } = {}) {
  const [showMenu, setShowMenu]     = useState(false);
  const [showWsModal, setShowWsModal] = useState(false);
  const [menuPos, setMenuPos]       = useState<{top:number;left:number}>({top:0,left:0});
  const [skills, setSkills]         = useState<{id:number;name:string;type:"workspace"|"agent"}[]>([]);
  const [wsAdded, setWsAdded]       = useState<Set<number>>(new Set());

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

  const menuItems = [
    { icon: LayerAddIcon, label: "Connect workspace skill" },
    { icon: Add01Icon,    label: "Create new skill" },
    { icon: Upload01Icon, label: "Upload a skill" },
  ];

  const handleAddWs = (s: typeof WS_SKILLS[number]) => {
    setWsAdded(prev => new Set([...prev, s.id]));
    setSkills(prev => [...prev, { id: s.id, name: s.name, type: "workspace" }]);
  };

  return (
    <>
      {skills.length === 0 ? (
        <EmptyStateBox
          icon={PuzzleIcon}
          description="Reusable abilities you've taught it."
          addLabel="Add Skill"
          onAdd={e => {
            const r = e.currentTarget.getBoundingClientRect();
            setMenuPos({ top: r.bottom + 4, left: r.right });
            setShowMenu(true);
          }}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {skills.map(s => (
            <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base">
              <HugeiconsIcon icon={PuzzleIcon} size={13} className="text-muted-foreground shrink-0" />
              <span className="text-[13px] font-medium flex-1 truncate">{s.name}</span>
              {s.type === "workspace" && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{background:"#EFF6FF",color:"#1D4ED8",border:"0.5px solid #BFDBFE"}}>Workspace</span>
              )}
              <button
                onClick={() => {
                  setSkills(prev => prev.filter(x => x.id !== s.id));
                  if (s.type === "workspace") setWsAdded(prev => { const n = new Set(prev); n.delete(s.id); return n; });
                }}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-muted transition-base shrink-0">
                <HugeiconsIcon icon={Delete01Icon} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown menu */}
      {showMenu && createPortal(
        <div
          className="fixed z-[9999]"
          style={{ top: menuPos.top, right: window.innerWidth - menuPos.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl border border-border shadow-elev py-1 min-w-[200px] animate-fade-up">
            {menuItems.map((item, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-surface-muted transition-base text-left"
                onClick={() => {
                  setShowMenu(false);
                  if (item.label === "Connect workspace skill") { setShowWsModal(true); }
                  else if (item.label === "Create new skill") {
                    setSkills(prev => [...prev, { id: Date.now(), name: "New skill", type: "agent" }]);
                  }
                }}
              >
                <HugeiconsIcon icon={item.icon} size={15} className="text-muted-foreground shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Connect workspace skill modal */}
      {showWsModal && (
        <ConnectWorkspaceSkillModal
          onClose={() => setShowWsModal(false)}
          onAdd={handleAddWs}
          added={wsAdded}
        />
      )}
    </>
  );
}

/* ============ Sub-Agents ============ */
const CONNECTOR_CATEGORIES = ["Tất cả tích hợp", "Giao tiếp", "Năng suất", "Nhà phát triển", "Dữ liệu", "Nghiên cứu", "Khác"];

const SUB_AGENT_CONNECTORS = [
  { id: "drive",    name: "Google Drive", logo: "D",  category: "Năng suất",       connected: true  },
  { id: "sheets",   name: "Sheets",       logo: "Sh", category: "Năng suất",       connected: false },
  { id: "gmail",    name: "Gmail",        logo: "G",  category: "Giao tiếp",       connected: true  },
  { id: "slack",    name: "Slack",        logo: "S",  category: "Giao tiếp",       connected: true  },
  { id: "notion",   name: "Notion",       logo: "N",  category: "Năng suất",       connected: false },
  { id: "hubspot",  name: "HubSpot",      logo: "H",  category: "Dữ liệu",         connected: false },
  { id: "github",   name: "GitHub",       logo: "Gh", category: "Nhà phát triển",  connected: false },
  { id: "exa",      name: "Exa",          logo: "Ex", category: "Nghiên cứu",      connected: false },
];

interface SubAgent {
  id: number;
  name: string;
  description: string;
  model: string;
  instructions: string;
  skillIds: number[];
  connectorIds: string[];
}

function InstructionsEditorModal({ value, onClose, onDone }: {
  value: string;
  onClose: () => void;
  onDone: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const [viewMode, setViewMode] = useState<"preview" | "source">("source");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (before: string, after: string = before) => {
    const el = editorRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const next = text.slice(0, s) + before + text.slice(s, e) + after + text.slice(e);
    setText(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length); });
  };

  const prependLine = (prefix: string) => {
    const el = editorRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = text.lastIndexOf("\n", s - 1) + 1;
    const next = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    setText(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length); });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-border flex flex-col animate-fade-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold">Instructions</h2>
          <button
            onClick={() => { onDone(text); onClose(); }}
            className="h-8 px-3 rounded-lg text-sm font-medium hover:bg-surface-muted transition-base"
          >
            Done
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-2 border-y border-border bg-surface-muted/60 shrink-0">
          <button onClick={() => wrapSelection("**")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Bold"><HugeiconsIcon icon={TextBoldIcon} size={14} /></button>
          <button onClick={() => wrapSelection("*")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Italic"><HugeiconsIcon icon={TextItalicIcon} size={14} /></button>
          <button onClick={() => wrapSelection("~~")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Strikethrough"><HugeiconsIcon icon={TextStrikethroughIcon} size={14} /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={() => prependLine("# ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Heading 1"><HugeiconsIcon icon={Heading01Icon} size={14} /></button>
          <button onClick={() => prependLine("## ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Heading 2"><HugeiconsIcon icon={Heading02Icon} size={14} /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={() => prependLine("- ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Bullet list"><HugeiconsIcon icon={LeftToRightListBulletIcon} size={14} /></button>
          <button onClick={() => prependLine("1. ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Numbered list"><HugeiconsIcon icon={LeftToRightListNumberIcon} size={14} /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={() => wrapSelection("`")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Inline code"><HugeiconsIcon icon={CodeIcon} size={14} /></button>
          <button onClick={() => wrapSelection("```\n", "\n```")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Code block"><HugeiconsIcon icon={SourceCodeIcon} size={14} /></button>

          <div className="flex-1" />

          <button onClick={() => navigator.clipboard?.writeText(text)} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Copy"><HugeiconsIcon icon={Copy01Icon} size={14} /></button>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface border border-border ml-1.5">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${viewMode === "preview" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <HugeiconsIcon icon={EyeIcon} size={12} /> Preview
            </button>
            <button
              onClick={() => setViewMode("source")}
              className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${viewMode === "source" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <HugeiconsIcon icon={SourceCodeIcon} size={12} /> Source
            </button>
          </div>
        </div>

        {/* Content — fixed height, scrolls when overflowing */}
        <div className="overflow-y-auto px-5 py-4" style={{ height: "360px" }}>
          {viewMode === "preview" ? (
            <div className="text-sm">{renderMarkdown(text || "*Nothing to preview yet.*")}</div>
          ) : (
            <textarea
              ref={editorRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"# Sub-agent instructions\n\nDescribe what this sub-agent does, its tone, and its limits…"}
              className="w-full h-full resize-none bg-transparent outline-none text-sm font-mono leading-relaxed text-foreground"
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function AddCustomMcpModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [auth, setAuth] = useState<"none" | "static">("none");

  const authOptions = [
    { id: "none" as const,   label: "Không xác thực",        disabled: false },
    { id: "static" as const, label: "Static Headers",        disabled: false },
    { id: "oauth-auto",      label: "OAuth 2.1 (Tự động)",   disabled: true },
    { id: "oauth-manual",    label: "OAuth 2.1 (Thủ công)",  disabled: true },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[88vh] animate-fade-up">
        <div className="flex items-start justify-between px-6 pt-6 pb-2 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Thêm MCP tuỳ chỉnh</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Kết nối một MCP server để cấp công cụ cho agent.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-surface-muted/60">
            <HugeiconsIcon icon={UserGroupIcon} size={16} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">Kết nối dùng chung: agent luôn dùng tài khoản của workspace cho server này.</p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-1.5">Tên</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-mcp-server"
              className="ds-input w-full"
            />
          </div>

          <div>
            <p className="text-sm font-semibold mb-1.5">URL</p>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.example.com/mcp"
              className="ds-input w-full"
            />
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Xác thực</p>
            <div className="flex flex-col gap-2.5">
              {authOptions.map(opt => (
                <label key={opt.id} className={`flex items-center gap-2.5 ${opt.disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <input
                    type="radio"
                    name="mcp-auth"
                    disabled={opt.disabled}
                    checked={auth === opt.id}
                    onChange={() => !opt.disabled && setAuth(opt.id as "none" | "static")}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className={`text-sm ${opt.disabled ? "text-muted-foreground" : "text-foreground"}`}>
                    {opt.label}
                    {opt.disabled && <span className="text-muted-foreground"> · Sắp có</span>}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">Dùng static headers (ví dụ API key) để xác thực. OAuth 2.1 sắp ra mắt.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="btn-secondary">Huỷ</button>
          <button
            disabled={!name.trim() || !url.trim()}
            onClick={onClose}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Lưu server
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ConnectorPickerModal({ connectors, added, onToggle, onClose, mode, onChangeMode }: {
  connectors: { id: string; name: string; logo: string; category: string; connected: boolean }[];
  added: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  /** Scope the row was opened under (Dùng chung / Riêng cá nhân) — omitted for callers that
   * don't have the concept of connector scope (e.g. the Sub-Agents picker). */
  mode?: ConnectorScope;
  onChangeMode?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả tích hợp");
  const [catOpen, setCatOpen] = useState(false);
  const [showCustomMcp, setShowCustomMcp] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const allSelected = connectors.length > 0 && connectors.every(c => added.includes(c.id));
  const toggleAll = () => {
    if (allSelected) { connectors.forEach(c => { if (added.includes(c.id)) onToggle(c.id); }); }
    else { connectors.forEach(c => { if (!added.includes(c.id)) onToggle(c.id); }); }
  };
  const filtered = connectors.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
    (activeCategory === "Tất cả tích hợp" || c.category === activeCategory)
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[85vh] animate-fade-up">
        <div className="flex items-start justify-between px-6 pt-6 pb-2 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Thêm kết nối</h2>
              {mode && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                  style={mode === "shared" ? { background: "#EEF2FF", color: "#4338CA", border: "0.5px solid #C7D2FE" } : { background: "#ECFDF5", color: "#047857", border: "0.5px solid #A7F3D0" }}
                >
                  {mode === "shared" ? "Dùng chung" : "Riêng cá nhân"}
                </span>
              )}
              {onChangeMode && (
                <button type="button" onClick={onChangeMode} className="text-xs font-semibold text-primary hover:underline shrink-0">
                  Đổi
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Những gì agent này có thể làm.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 mt-0.5">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="px-6 pb-4 pt-3 shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm connector..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-primary/50 bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-base"
            />
          </div>

          <div ref={catRef} className="relative shrink-0" style={{ width: "168px" }}>
            <button
              type="button"
              onClick={() => setCatOpen(o => !o)}
              className="w-full h-9 pl-3 pr-2.5 rounded-lg border border-border bg-white text-sm font-medium flex items-center gap-1.5 hover:bg-surface-muted transition-base"
            >
              <span className="flex-1 min-w-0 truncate text-left">{activeCategory}</span>
              <HugeiconsIcon icon={ChevronDownIcon} size={13} className={`text-muted-foreground shrink-0 transition-transform ${catOpen ? "rotate-180" : ""}`} />
            </button>
            {catOpen && (
              <div className="absolute z-50 top-full right-0 mt-1 w-[180px] bg-white border border-border rounded-xl shadow-lg overflow-hidden py-1">
                {CONNECTOR_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setActiveCategory(cat); setCatOpen(false); }}
                    className={`w-full flex items-center justify-between text-left text-sm px-3.5 py-2 transition-base ${
                      activeCategory === cat ? "text-primary font-medium bg-primary-soft/40" : "text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {cat}
                    {activeCategory === cat && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-2 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">{filtered.length} connector</span>
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0"
          >
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>

        {/* Connector grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {filtered.map(c => {
              const active = added.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggle(c.id)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-base ${
                    active ? "border-primary/30 bg-primary-soft" : "border-border hover:bg-surface-muted"
                  }`}
                >
                  <span className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center text-xs font-bold shrink-0">{c.logo}</span>
                  <span className="flex-1 min-w-0 text-sm font-semibold truncate">{c.name}</span>
                  {active && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#DCFCE7", color: "#15803D" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} /> Đã thêm
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={() => setShowCustomMcp(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-surface-muted transition-base"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} /> Thêm MCP tuỳ chỉnh
          </button>
          <button onClick={onClose} className="btn-primary">Xong</button>
        </div>
      </div>

      {showCustomMcp && (
        <AddCustomMcpModal onClose={() => setShowCustomMcp(false)} />
      )}
    </div>,
    document.body
  );
}

function CreateSubAgentModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (agent: Omit<SubAgent, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [instructions, setInstructions] = useState("");
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [editorViewMode, setEditorViewMode] = useState<"preview" | "source">("source");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [connectorIds, setConnectorIds] = useState<string[]>([]);
  const [showConnectorPicker, setShowConnectorPicker] = useState(false);

  const toggleConnector = (id: string) => setConnectorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const canSave = name.trim().length > 0;

  const wrapSelection = (before: string, after: string = before) => {
    const el = editorRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const next = instructions.slice(0, s) + before + instructions.slice(s, e) + after + instructions.slice(e);
    setInstructions(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length); });
  };

  const prependLine = (prefix: string) => {
    const el = editorRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = instructions.lastIndexOf("\n", s - 1) + 1;
    const next = instructions.slice(0, lineStart) + prefix + instructions.slice(lineStart);
    setInstructions(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length); });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-lg border border-border flex flex-col max-h-[88vh] animate-fade-up overflow-hidden">
        {editingInstructions ? (
          <>
            {/* Instructions editor — shown inline in the same dialog */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border">
              <h2 className="text-lg font-semibold">Instructions</h2>
              <button
                onClick={() => setEditingInstructions(false)}
                className="h-8 px-3 rounded-lg text-sm font-medium hover:bg-surface-muted transition-base"
              >
                Done
              </button>
            </div>

            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-surface-muted/60 shrink-0">
              <button onClick={() => wrapSelection("**")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Bold"><HugeiconsIcon icon={TextBoldIcon} size={14} /></button>
              <button onClick={() => wrapSelection("*")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Italic"><HugeiconsIcon icon={TextItalicIcon} size={14} /></button>
              <button onClick={() => wrapSelection("~~")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Strikethrough"><HugeiconsIcon icon={TextStrikethroughIcon} size={14} /></button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => prependLine("# ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Heading 1"><HugeiconsIcon icon={Heading01Icon} size={14} /></button>
              <button onClick={() => prependLine("## ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Heading 2"><HugeiconsIcon icon={Heading02Icon} size={14} /></button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => prependLine("- ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Bullet list"><HugeiconsIcon icon={LeftToRightListBulletIcon} size={14} /></button>
              <button onClick={() => prependLine("1. ")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Numbered list"><HugeiconsIcon icon={LeftToRightListNumberIcon} size={14} /></button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => wrapSelection("`")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Inline code"><HugeiconsIcon icon={CodeIcon} size={14} /></button>
              <button onClick={() => wrapSelection("```\n", "\n```")} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Code block"><HugeiconsIcon icon={SourceCodeIcon} size={14} /></button>

              <div className="flex-1" />

              <button onClick={() => navigator.clipboard?.writeText(instructions)} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-base" title="Copy"><HugeiconsIcon icon={Copy01Icon} size={14} /></button>
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface border border-border ml-1.5">
                <button
                  onClick={() => setEditorViewMode("preview")}
                  className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${editorViewMode === "preview" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <HugeiconsIcon icon={EyeIcon} size={12} /> Preview
                </button>
                <button
                  onClick={() => setEditorViewMode("source")}
                  className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${editorViewMode === "source" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <HugeiconsIcon icon={SourceCodeIcon} size={12} /> Source
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: "360px" }}>
              {editorViewMode === "preview" ? (
                <div className="text-sm">{renderMarkdown(instructions || "*Nothing to preview yet.*")}</div>
              ) : (
                <textarea
                  ref={editorRef}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder={"# Sub-agent instructions\n\nDescribe what this sub-agent does, its tone, and its limits…"}
                  className="w-full h-full resize-none bg-transparent outline-none text-sm font-mono leading-relaxed text-foreground"
                  style={{ minHeight: "340px" }}
                  spellCheck={false}
                  autoFocus
                />
              )}
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">Create sub-agent</h2>
                <p className="text-sm text-muted-foreground mt-0.5">A specialized agent this agent can delegate tasks to.</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0 mt-0.5">
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. candidate-email-sender"
                  className="ds-input w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Use when sending recruiting emails…"
                  className="ds-input w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Model</label>
                <ModelDropdown value={model} onChange={setModel} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">Instructions (agent.md)</label>
                  <button
                    type="button"
                    onClick={() => setEditingInstructions(true)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <HugeiconsIcon icon={Edit01Icon} size={12} /> Edit
                  </button>
                </div>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  onClick={() => setEditingInstructions(true)}
                  readOnly
                  placeholder={"# Sub-agent instructions\n\nDescribe what this sub-agent does, its tone, and its limits…"}
                  className="ds-textarea w-full resize-none font-mono text-xs leading-relaxed cursor-pointer bg-surface-muted/40"
                  style={{ height: "128px" }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">Connectors</label>
                  <button
                    type="button"
                    onClick={() => setShowConnectorPicker(true)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={12} /> Add connector
                  </button>
                </div>
                {connectorIds.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowConnectorPicker(true)}
                    className="w-full rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 py-5 text-center hover:bg-surface-muted transition-base"
                  >
                    <HugeiconsIcon icon={ConnectIcon} size={18} className="text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">The outside accounts and systems this sub-agent may use.</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {SUB_AGENT_CONNECTORS.filter(c => connectorIds.includes(c.id)).map(c => (
                      <div
                        key={c.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-muted/60"
                      >
                        <span className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center text-[10px] font-bold shrink-0">{c.logo}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs">
                          <span className="font-semibold text-foreground truncate">{c.name}</span>
                          {!c.connected && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="font-medium" style={{ color: "#C2410C" }}>Not connected</span>
                            </>
                          )}
                        </div>
                        <HugeiconsIcon icon={ChevronDownIcon} size={14} className="text-muted-foreground shrink-0" />
                        <button
                          type="button"
                          onClick={() => toggleConnector(c.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-base shrink-0"
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showConnectorPicker && (
              <ConnectorPickerModal
                connectors={SUB_AGENT_CONNECTORS}
                added={connectorIds}
                onToggle={toggleConnector}
                onClose={() => setShowConnectorPicker(false)}
              />
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              <button onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-surface-muted transition-base">Cancel</button>
              <button
                disabled={!canSave}
                onClick={() => {
                  if (!canSave) return;
                  onSave({ name: name.trim(), description: description.trim(), model, instructions, skillIds: [], connectorIds });
                  onClose();
                }}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-base"
              >
                Create sub-agent
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function SubAgentsInner({ onRegisterAdd }: { onRegisterAdd?: (fn: () => void) => void } = {}) {
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    onRegisterAdd?.(() => setShowCreate(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {subAgents.length === 0 ? (
        <EmptyStateBox
          icon={UserMultipleIcon}
          description="Specialized agents this agent can delegate to."
          addLabel="Add Sub-Agent"
          onAdd={() => setShowCreate(true)}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {subAgents.map(a => (
            <div key={a.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted transition-base">
              <div className="w-6 h-6 rounded-lg bg-surface-muted border border-border flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={UserMultipleIcon} size={12} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{a.name}</p>
                {a.description && <p className="text-[11px] text-muted-foreground truncate">{a.description}</p>}
              </div>
              <button
                onClick={() => setSubAgents(prev => prev.filter(x => x.id !== a.id))}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-muted transition-base shrink-0"
              >
                <HugeiconsIcon icon={Delete01Icon} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSubAgentModal
          onClose={() => setShowCreate(false)}
          onSave={data => setSubAgents(prev => [...prev, { ...data, id: Date.now() }])}
        />
      )}
    </>
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
  const Chip = ({ label, desc, action, onRemove, editable, onEdit, type }: {
    label: string; desc?: string; action?: string;
    onRemove: () => void; editable?: boolean; onEdit?: () => void;
    type?: "workspace" | "agent";
  }) => (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface cursor-pointer hover:bg-surface-muted transition-base"
      onClick={() => { setDetailItem({ name: label, desc: desc ?? "", action: action ?? "" }); setDetailEditable(!!editable); }}
    >
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
        {totalActive === 0 ? (
          <EmptyStateBox
            icon={Shield01Icon}
            description="Boundaries that keep your agent acting safely."
            addLabel="Add Guardrails"
            onAdd={e => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenuPos({ top: r.bottom + 4, left: r.right });
              setShowMenu(true);
            }}
          />
        ) : (
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">Boundaries that keep your agent acting safely.</p>
        )}

        {(wsAddedList.length > 0 || agentGuardrails.length > 0) && (
          <div className="space-y-1 mb-3">
            {wsAddedList.map(g => (
              <Chip key={g.id} label={g.name} desc={g.desc} action={g.action}
                type="workspace"
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

function TriggersInner({ agentId, onRegisterAdd, onConnectionsChange }: { agentId: string; onRegisterAdd?: (fn: () => void) => void; onConnectionsChange?: () => void }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TriggerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TriggerRecord | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const personalConnectorBlocked = perUserConnector(agentId) !== null;

  // Reads perUserConnector(agentId) fresh on every call rather than closing over the
  // render-time `personalConnectorBlocked` above — this function is captured once by the
  // registration effect below and invoked much later from the accordion header's "+"
  // button, so a stale boolean here would silently let a since-added personal connector
  // through. The header "+" is itself disabled+inert whenever this is true, so reaching
  // here with a blocked agent shouldn't happen — this is just a defensive no-op backstop.
  const openCreate = () => {
    if (perUserConnector(agentId) !== null) return;
    setCreateOpen(true);
  };

  useEffect(() => {
    onRegisterAdd?.(openCreate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  void tick;
  const triggers = triggerStore.list(agentId);
  const limitReached = triggers.length >= TRIGGER_LIMIT;

  const duplicateTrigger = (t: TriggerRecord) => {
    if (limitReached) return;
    if (perUserConnector(agentId) !== null) return;
    let name = `${t.name} (copy)`;
    let n = 2;
    while (triggerStore.isDuplicateName(agentId, name)) {
      name = `${t.name} (copy ${n})`;
      n++;
    }
    const rec = triggerStore.create(agentId, { name, type: t.type, enabled: t.enabled, description: t.description, config: t.config });
    if (!rec) return;
    toast.success(`Đã tạo trigger "${name}".`);
    refresh();
  };

  const renameTrigger = (t: TriggerRecord, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === t.name) { setRenamingId(null); return; }
    if (triggerStore.isDuplicateName(agentId, trimmed, t.id)) {
      toast.error("Agent này đã có trigger dùng tên này. Hãy chọn tên khác.");
      return;
    }
    triggerStore.update(agentId, t.id, { name: trimmed });
    setRenamingId(null);
    refresh();
  };

  return (
    <>
      {triggers.length === 0 ? (
        <EmptyStateBox
          icon={TimeScheduleIcon}
          description="Agent tự động chạy theo lịch, webhook hoặc sự kiện từ ứng dụng."
          addLabel="Thêm Trigger"
          onAdd={openCreate}
          disabled={personalConnectorBlocked}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {triggers.map(t => {
            const meta = TYPE_META[t.type];
            const Icon = meta.icon;
            const isRenaming = renamingId === t.id;
            const summary = summarizeConfig(t);
            const needsSetup = triggerNeedsSetup(t);
            return (
              <div
                key={t.id}
                role={isRenaming ? undefined : "button"}
                tabIndex={isRenaming ? undefined : 0}
                onClick={isRenaming ? undefined : () => setEditTarget(t)}
                onKeyDown={isRenaming ? undefined : (e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditTarget(t); } })}
                className={`rounded-xl px-3 py-2.5 transition-base ${
                  t.enabled && !needsSetup
                    ? "border border-transparent hover:bg-surface-muted"
                    : "border border-amber-300 bg-amber-50/50 hover:bg-amber-50"
                } ${isRenaming ? "" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-2">
                  {t.type === "external" && t.config.external
                    ? <AppLogo app={t.config.external.app} size={20} />
                    : <Icon size={16} className="text-muted-foreground shrink-0" />
                  }
                  {isRenaming ? (
                    <input
                      autoFocus
                      defaultValue={t.name}
                      onClick={e => e.stopPropagation()}
                      onBlur={e => renameTrigger(t, e.target.value)}
                      onKeyDown={e => {
                        e.stopPropagation();
                        if (e.key === "Enter") { e.preventDefault(); renameTrigger(t, (e.target as HTMLInputElement).value); }
                        if (e.key === "Escape") { e.preventDefault(); setRenamingId(null); }
                      }}
                      className="flex-1 min-w-0 text-[13px] font-semibold bg-surface border border-primary rounded px-1.5 py-0.5 outline-none"
                    />
                  ) : (
                    <span className="text-[13px] font-semibold flex-1 truncate min-w-0">{t.name}</span>
                  )}
                  {needsSetup ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap bg-amber-100 text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Cần cấu hình
                    </span>
                  ) : !t.enabled && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap bg-amber-100 text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Tạm dừng
                    </span>
                  )}
                  <TriggerRowMenu
                    enabled={t.enabled}
                    needsSetup={needsSetup}
                    duplicateBlocked={limitReached}
                    enableBlocked={personalConnectorBlocked}
                    onToggle={() => { triggerStore.toggle(agentId, t.id); refresh(); }}
                    onEdit={() => setEditTarget(t)}
                    onRename={() => setRenamingId(t.id)}
                    onDuplicate={() => duplicateTrigger(t)}
                    onDelete={() => setDeleteTarget(t)}
                  />
                </div>
                {summary && (
                  <p className="text-xs text-muted-foreground mt-1 pl-7 truncate">{summary}</p>
                )}
                {needsSetup ? (
                  <div className="flex items-center gap-1.5 mt-1.5 pl-7 text-xs text-amber-700">
                    <HugeiconsIcon icon={InformationCircleIcon} size={12} className="shrink-0" />
                    <span>Hoàn tất cấu hình trigger trước khi bật.</span>
                  </div>
                ) : !t.enabled && (
                  <div className="flex items-center gap-1.5 mt-1.5 pl-7 text-xs text-amber-700">
                    <HugeiconsIcon icon={InformationCircleIcon} size={12} className="shrink-0" />
                    <span>Trigger này đang tạm dừng.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {personalConnectorBlocked && (
        <div className="mt-2">
          <TriggerBlockedByConnectorNotice agentId={agentId} onSwitched={() => { refresh(); onConnectionsChange?.(); }} />
        </div>
      )}

      <TriggerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        agentId={agentId}
        onSubmitted={refresh}
      />
      <TriggerFormDialog
        open={!!editTarget}
        onOpenChange={v => !v && setEditTarget(null)}
        mode="edit"
        agentId={agentId}
        trigger={editTarget ?? undefined}
        onSubmitted={refresh}
      />
      <DeleteTriggerDialog
        agentId={agentId}
        target={deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        onDeleted={refresh}
      />
    </>
  );
}

const TRIGGER_ROW_MENU_WIDTH = 144; // w-36
const TRIGGER_ROW_MENU_HEIGHT_ESTIMATE = 176; // ~5 rows worst case, for the flip-up decision

function TriggerRowMenu({ enabled, needsSetup, duplicateBlocked, enableBlocked, onToggle, onEdit, onRename, onDuplicate, onDelete }: {
  enabled: boolean; needsSetup: boolean; duplicateBlocked?: boolean; enableBlocked?: boolean;
  onToggle: () => void; onEdit: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      // Flip upward when there isn't room below for the menu, so it's never clipped by the
      // panel's own overflow — clamp horizontally so it never spills past the viewport edge.
      const openUpward = window.innerHeight - r.bottom < TRIGGER_ROW_MENU_HEIGHT_ESTIMATE && r.top > TRIGGER_ROW_MENU_HEIGHT_ESTIMATE;
      const left = Math.min(Math.max(r.right - TRIGGER_ROW_MENU_WIDTH, 8), window.innerWidth - TRIGGER_ROW_MENU_WIDTH - 8);
      setPos(openUpward ? { bottom: window.innerHeight - r.top + 4, left } : { top: r.bottom + 4, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base"
        aria-label="Trigger actions"
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={13} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-white shadow-elev py-1"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          {!enabled && needsSetup ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="block w-full text-left px-3 py-1.5 text-xs text-muted-foreground/60 cursor-not-allowed outline-none">
                  Bật trigger
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8} align="center">Hoàn tất cấu hình trigger trước khi bật.</TooltipContent>
            </Tooltip>
          ) : !enabled && enableBlocked ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="block w-full text-left px-3 py-1.5 text-xs text-muted-foreground/60 cursor-not-allowed outline-none">
                  Bật trigger
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8} align="center">Agent đang dùng kết nối riêng — xử lý việc này trước khi bật trigger.</TooltipContent>
            </Tooltip>
          ) : (
            <button type="button" onClick={() => { onToggle(); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base">
              {enabled ? "Tạm dừng trigger" : "Bật trigger"}
            </button>
          )}
          <button type="button" onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base">
            Chỉnh sửa trigger
          </button>
          <button type="button" onClick={() => { onRename(); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base">
            Đổi tên
          </button>
          <button type="button" onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
            Xoá trigger
          </button>
          <button
            type="button"
            disabled={duplicateBlocked}
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base disabled:text-muted-foreground/50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Nhân bản
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
