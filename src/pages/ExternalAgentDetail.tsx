import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PencilEdit01Icon, FlaskConicalIcon, GridViewIcon, Analytics01Icon,
  ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon, Copy01Icon, Tick02Icon, Loading01Icon,
  Alert01Icon, Globe02Icon, FileEditIcon, BookOpen01Icon,
  PanelLeftOpenIcon, PanelLeftCloseIcon, HistoryIcon, Rocket01Icon, Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import {
  externalAgentStore, type ExternalAgent,
} from "@/components/external-agents/externalAgentStore";
import { StatusBadge, relativeTime } from "@/components/external-agents/statusMeta";
import ConnectExternalAgentModal from "@/components/external-agents/ConnectExternalAgentModal";
import { PublishModal } from "@/pages/AgentBuilder";
import { AgentStatusCluster } from "@/components/governance/agentStatusCluster";
import { AgentVersionsPanel } from "@/components/governance/agentVersionsPanel";
import { governanceStore } from "@/components/governance/governanceStore";
import { formatDateTime } from "@/components/governance/governanceUi";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import {
  DeleteExternalAgentDialog, PauseExternalAgentDialog, RejectExternalAgentDialog,
} from "@/components/external-agents/ExternalAgentDialogs";
import ExternalAgentChannelsTab from "@/components/external-agents/ExternalAgentChannelsTab";
import ExternalAgentInsightsTab from "@/components/external-agents/ExternalAgentInsightsTab";
import ExternalAgentTestTab from "@/components/external-agents/ExternalAgentTestTab";
import { toast } from "sonner";

type Tab = "build" | "test" | "channels" | "insights";
const VALID_TABS: Tab[] = ["build", "test", "channels", "insights"];

const TOP_TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: "build", label: "Build", Icon: PencilEdit01Icon },
  { id: "test", label: "Test", Icon: FlaskConicalIcon },
  { id: "channels", label: "Channels", Icon: GridViewIcon },
  { id: "insights", label: "Insights", Icon: Analytics01Icon },
];

const ENDPOINTS: { method: string; path: string; purpose: string; required: boolean }[] = [
  { method: "GET", path: "/health", purpose: "Trạng thái và phiên bản protocol.", required: true },
  { method: "POST", path: "/runs", purpose: "Gọi Agent chạy.", required: true },
  { method: "GET", path: "/tools", purpose: "Liệt kê các tool Agent khai báo.", required: false },
  { method: "POST", path: "/credentials", purpose: "Đăng ký credential theo người dùng (tùy chọn, chưa bật ở phase này).", required: false },
  { method: "POST", path: "/credentials/revoke", purpose: "Thu hồi credential theo người dùng (tùy chọn, chưa bật ở phase này).", required: false },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      aria-label="Copy"
      className="text-muted-foreground hover:text-foreground transition-base shrink-0"
    >
      {copied ? <HugeiconsIcon icon={Tick02Icon} size={13} className="text-success" /> : <HugeiconsIcon icon={Copy01Icon} size={13} />}
    </button>
  );
}

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-surface-muted">
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        className="absolute top-2 right-2 flex items-center gap-1 h-7 px-2 rounded-md bg-white border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground transition-base"
      >
        {copied ? <HugeiconsIcon icon={Tick02Icon} size={11} className="text-success" /> : <HugeiconsIcon icon={Copy01Icon} size={11} />} {copied ? "Copied" : "Copy"}
      </button>
      <pre className="text-[11px] font-mono p-3 pr-16 overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] items-start gap-1 sm:gap-2 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground pt-0.5">{label}</span>
      <div className="text-sm text-foreground min-w-0">{children}</div>
    </div>
  );
}

/** GET/POST endpoints only ever surface Active or Error — there's nothing "not yet configured"
 * about a required call the platform itself makes. The two optional per-user-credential
 * endpoints are off this phase (see ENDPOINTS purpose text below), so they always read Empty
 * until that capability ships instead of ever claiming to be Active or Error. */
type EndpointStatus = "Active" | "Error" | "Empty";
function endpointStatus(agent: ExternalAgent, path: string): EndpointStatus {
  if (path === "/health") return agent.lastHealthCheckOk === false ? "Error" : "Active";
  if (path === "/runs") return agent.lastValidation && !agent.lastValidation.runsAvailable ? "Error" : "Active";
  if (path === "/tools") return agent.lastValidation && !agent.lastValidation.passed ? "Error" : "Active";
  return "Empty";
}
function EndpointStatusBadge({ status }: { status: EndpointStatus }) {
  const cls = status === "Active" ? "chip-success" : status === "Error" ? "chip-danger" : "chip-muted";
  const label = status === "Active" ? "Hoạt động" : status === "Error" ? "Lỗi" : "Chưa có";
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

export default function ExternalAgentDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { role } = useMyPermissions();
  const isAdmin = role?.id === "admin";

  const rawTab = params.get("tab");
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "build";
  const setTab = (t: Tab) => setParams({ tab: t });

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [agent, setAgent] = useState<ExternalAgent | undefined>(undefined);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [justUnpublished, setJustUnpublished] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setLoadState("loading");
    const t = setTimeout(() => {
      try {
        setAgent(externalAgentStore.get(id));
        setLoadState("ready");
      } catch {
        setLoadState("error");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [id, tick]);

  // Re-reads the agent in place — used after every mutation so the page updates immediately
  // instead of flashing back through the full loading skeleton. hardRefresh is reserved for the
  // error-state Retry button, which genuinely needs to re-run the fetch attempt.
  const refresh = () => setAgent(externalAgentStore.get(id));
  const hardRefresh = () => setTick(t => t + 1);
  // Governance state (same model as internal Agents): live version/scope, pending/rejected request.
  const [govTick, setGovTick] = useState(0);
  const govChanged = () => { setGovTick(t => t + 1); refresh(); };
  const section = params.get("section") === "versions" ? "versions" : "instructions";
  const publishState = (() => { void govTick; return agentPublishStore.get(id); })();
  const pendingReq = (() => { void govTick; return governanceStore.getOpenRequestForResource("agent", id); })();
  const latestReq = (() => { void govTick; return governanceStore.latestForResource("agent", id); })();
  const rejectedReq = !pendingReq && latestReq?.status === "rejected" ? latestReq : undefined;
  const [rejectTick, setRejectTick] = useState(0);
  const showRejectCallout = (() => { void rejectTick; return !!rejectedReq && !governanceStore.isRejectionDismissed(rejectedReq.id); })();

  // Lets other pages (e.g. the list view, after creating/editing an agent) hand off into
  // opening the Publish modal here via a one-shot ?openPublish=1 query param.
  useEffect(() => {
    if (params.get("openPublish") === "1") {
      setShowPublishModal(true);
      setParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("openPublish");
        return next;
      }, { replace: true });
    }
  }, [params, setParams]);

  if (loadState === "loading") {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-8 w-full space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <HugeiconsIcon icon={Alert01Icon} size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">We couldn't load your external agents. Please try again.</p>
        <button onClick={hardRefresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Retry</button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <HugeiconsIcon icon={Globe02Icon} size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">This external agent doesn't exist or was deleted.</p>
        <Link to="/external-agents" className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base flex items-center">
          Back to External Agents
        </Link>
      </div>
    );
  }

  const activityEntries = externalAgentStore.activity(agent.id);
  const latestStatusChange = activityEntries[0];
  const validationPassed = !!agent.lastValidation?.passed;

  // Sidebar "Setup checklist" — purely informational (doesn't gate Submit/Publish, no %/progress
  // bar). Model/Tools/Skills have no dedicated settings on an External Agent (the external
  // service owns its own model and declares its own tools/skills), so those three always read
  // done; "Tried the agent" mirrors the same always-done convention used on the internal Agent
  // Builder's checklist since there's no real "has this been tested" flag to check.
  const setupChecklist = [
    { label: "Instructions written", done: agent.description.trim().length > 0 },
    { label: "Model chosen", done: true },
    { label: "Tools attached", done: endpointStatus(agent, "/tools") === "Active" },
    { label: "Skills attached", done: true },
    { label: "Guardrails configured", done: !!agent.guardrail },
    { label: "Tried the agent", done: true },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar — same 3-part layout as the internal Agent's: left (back/breadcrumb/name),
          center (Build/Test/Channels/Insights), right (status + actions). Still wraps onto a
          second line on narrow viewports instead of clipping. */}
      <div className="min-h-14 border-b border-border bg-surface flex flex-wrap items-center gap-3 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate("/external-agents")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <HugeiconsIcon icon={ChevronLeftIcon} size={16} />
          </button>
          <Link to="/external-agents" className="text-sm text-muted-foreground hover:text-foreground transition-base shrink-0 hidden sm:inline">External Agents</Link>
          <span className="text-sm text-muted-foreground/50 shrink-0 hidden sm:inline">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0 ${agent.bg}`}>
              {agent.emoji}
            </div>
            <span className="font-semibold text-sm truncate">{agent.name}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center min-w-[240px]">
          <div className="flex items-center gap-1">
            {TOP_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{ paddingLeft: "10px", paddingRight: "10px", height: "32px", gap: "10px" }}
                className={`rounded-lg text-sm font-medium flex items-center transition-base ${
                  tab === id ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                }`}
              >
                <HugeiconsIcon icon={Icon} size={18} className="shrink-0" /> <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {agent.status === "paused" && <StatusBadge status={agent.status} />}
          <AgentStatusCluster
            publishState={publishState}
            isAutomation={false}
            pending={pendingReq}
            rejected={rejectedReq}
            rejectBannerVisible={showRejectCallout}
            onChanged={govChanged}
            onOpenVersions={() => setParams({ tab: "build", section: "versions" })}
            onOpenVersion={v => setParams({ tab: "build", section: "versions", v })}
            onPublish={() => validationPassed && setShowPublishModal(true)}
            onShowRejectBanner={() => { if (rejectedReq) { governanceStore.restoreRejection(rejectedReq.id); setRejectTick(t => t + 1); } }}
          />
          <button
            disabled={!validationPassed || agent.status === "paused"}
            title={!validationPassed ? "Kiểm tra kết nối trước khi publish." : agent.status === "paused" ? "Resume Agent trước khi publish." : undefined}
            onClick={() => setShowPublishModal(true)}
            className="btn-primary h-9 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={Rocket01Icon} size={13} /> Publish
          </button>

          {agent.status === "published" && isAdmin && (
            <button onClick={() => setShowPause(true)} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base whitespace-nowrap">Tạm dừng</button>
          )}

          {agent.status === "paused" && isAdmin && (
            <button
              onClick={() => {
                externalAgentStore.resume(agent.id);
                toast.success(`Đã tiếp tục "${agent.name}". Agent đang phục vụ người dùng trở lại.`);
                refresh();
              }}
              className="btn-primary h-9 whitespace-nowrap"
            >
              Tiếp tục
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(o => !o)}
              aria-label="External agent actions"
              className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-white shadow-elev py-1">
                  <button onClick={() => { setShowEdit(true); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-muted transition-base">
                    Edit connection
                  </button>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <span>
                        <button
                          disabled={agent.status === "published"}
                          onClick={() => { setShowDelete(true); setShowMenu(false); }}
                          className={`w-full text-left px-3 py-1.5 text-sm transition-base ${
                            agent.status === "published" ? "text-muted-foreground/50 cursor-not-allowed" : "text-destructive hover:bg-[hsl(var(--destructive-soft))]"
                          }`}
                        >
                          Delete
                        </button>
                      </span>
                    </TooltipTrigger>
                    {agent.status === "published" && <TooltipContent side="left">Tạm dừng Agent trước khi xóa.</TooltipContent>}
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {tab === "build" && (
          <>
            {/* Left sidebar — same visual pattern as the internal Agent's Build sidebar, but a
                single "Instructions" item since External Agent has no Knowledge/Connections/
                Triggers concept. Leaves room to add more items later without restructuring. */}
            <aside
              className="border-r border-border overflow-hidden shrink-0 flex flex-col h-full"
              style={{
                background: "hsl(var(--card))",
                width: sidebarCollapsed ? "0px" : "240px",
                opacity: sidebarCollapsed ? 0 : 1,
                transition: "width 320ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease",
                minWidth: 0,
              }}
            >
              <nav className="shrink-0 px-2 pt-2 pb-1 flex flex-col" style={{ gap: "4px" }}>
                {([
                  { id: "instructions", label: "Instructions", icon: FileEditIcon },
                  { id: "versions", label: "Phiên bản", icon: HistoryIcon },
                ] as const).map(it => (
                  <button
                    key={it.id}
                    onClick={() => setParams({ tab: "build", ...(it.id === "versions" ? { section: "versions" } : {}) })}
                    style={{ height: "36px", fontSize: "14px" }}
                    className={`w-full flex items-center rounded-lg px-2.5 transition-base shrink-0 ${section === it.id ? "bg-primary-soft text-primary font-medium" : "text-foreground hover:bg-surface-muted"}`}
                  >
                    <HugeiconsIcon icon={it.icon} size={18} className="shrink-0" />
                    <span className="flex-1 text-left truncate ml-2.5">{it.label}</span>
                  </button>
                ))}
              </nav>

              <div className="flex-1" />

              {/* Setup checklist — pinned directly above Collapse sidebar, not part of the
                  scrolling nav above. Plain ✓/○ list, no progress bar or %: it's a reference
                  for the person configuring the agent, not a gate on Submit/Publish. */}
              <div className="shrink-0 px-3 pb-3 space-y-2">
                <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                  <span className="text-sm font-semibold text-foreground block mb-1.5">Setup checklist</span>
                  <div className="space-y-1">
                    {setupChecklist.map(item => (
                      <div key={item.label} className="flex items-center gap-1.5 text-sm">
                        {item.done
                          ? <HugeiconsIcon icon={Tick02Icon} size={11} className="text-primary shrink-0" />
                          : <span className="w-3 h-3 rounded-full border-2 border-muted-foreground shrink-0 inline-block" />}
                        <span className={item.done ? "text-primary" : "text-muted-foreground"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="w-full h-8 rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-muted text-sm font-medium flex items-center justify-center gap-1.5 transition-base"
                >
                  <HugeiconsIcon icon={PanelLeftCloseIcon} size={13} /> Collapse sidebar
                </button>
              </div>
            </aside>
          {section === "versions" ? (
            <div className="flex-1 overflow-y-auto">
              <AgentVersionsPanel key={govTick} agentId={agent.id} agentName={agent.name} onPublish={() => setShowPublishModal(true)} onChanged={govChanged} />
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="space-y-4">
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Open sidebar"
                  className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base"
                >
                  <HugeiconsIcon icon={PanelLeftOpenIcon} size={15} />
                </button>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  aria-label="Edit agent avatar"
                  className="relative shrink-0"
                >
                  <span className={`w-12 h-12 rounded-xl ${agent.bg} border border-border flex items-center justify-center text-2xl transition-base`}>
                    {agent.emoji}
                  </span>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-surface border border-border flex items-center justify-center pointer-events-none">
                    <HugeiconsIcon icon={PencilEdit01Icon} size={9} className="text-muted-foreground" />
                  </span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">{agent.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{agent.description || "No description"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  aria-label="Edit connection"
                  className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base shrink-0"
                >
                  <HugeiconsIcon icon={PencilEdit01Icon} size={14} />
                </button>
              </div>


              <Link
                to="/external-agents/guides/integration"
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-surface-muted transition-base"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium flex-1">New to external agents? Read the integration guide</span>
                <HugeiconsIcon icon={ChevronRightIcon} size={14} className="text-muted-foreground shrink-0" />
              </Link>

              {justUnpublished && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-[hsl(var(--warning-soft))] px-3.5 py-3">
                  <HugeiconsIcon icon={Alert01Icon} size={14} className="shrink-0 mt-0.5 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-warning leading-relaxed">
                      This agent was unpublished because its connection was edited. Submit it for approval again to make it live.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPublishModal(true)}
                      className="mt-1.5 text-sm font-semibold text-warning hover:underline"
                    >
                      Submit for approval
                    </button>
                  </div>
                </div>
              )}

              {rejectedReq && showRejectCallout && (
                <div role="status" className="rounded-xl border border-destructive/20 bg-white shadow-soft flex items-start gap-3 pl-3 pr-2 py-2.5 border-l-[3px] border-l-destructive">
                  <span className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Alert01Icon} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Bản <span className="font-mono">{rejectedReq.version}</span> chưa được duyệt
                      <span className="font-normal text-muted-foreground"> · {rejectedReq.reviewerName ?? "Admin"} góp ý lúc {formatDateTime(rejectedReq.updatedAt)}</span>
                    </p>
                    {rejectedReq.reviewNote && <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed line-clamp-2">“{rejectedReq.reviewNote}”</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <button onClick={() => rejectedReq.version && setParams({ tab: "build", section: "versions", v: rejectedReq.version })} className="h-8 px-3 rounded-lg text-xs font-medium hover:bg-surface-muted">Xem chi tiết</button>
                    <button onClick={() => setShowPublishModal(true)} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium">Sửa &amp; gửi lại</button>
                    <button onClick={() => { governanceStore.dismissRejection(rejectedReq.id); setRejectTick(t => t + 1); }} aria-label="Ẩn thông báo" title="Ẩn thông báo" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-surface-muted flex items-center justify-center">
                      <HugeiconsIcon icon={Cancel01Icon} size={15} />
                    </button>
                  </div>
                </div>
              )}

              {agent.lastHealthCheckOk === false && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
                  <HugeiconsIcon icon={Alert01Icon} size={14} className="shrink-0 mt-0.5 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-destructive leading-relaxed">
                      Không kết nối được tới Agent từ{" "}
                      {agent.lastHealthyAt ? new Date(agent.lastHealthyAt).toLocaleDateString("vi-VN") : "lần kết nối đầu tiên"}.
                      Hội thoại trên các kênh đã publish có thể đang lỗi.
                    </p>
                    <button
                      type="button"
                      disabled={checkingHealth}
                      onClick={() => {
                        setCheckingHealth(true);
                        setTimeout(() => {
                          externalAgentStore.runHealthCheck(agent.id);
                          setCheckingHealth(false);
                          refresh();
                        }, 700);
                      }}
                      className="mt-1.5 text-sm font-semibold text-destructive hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {checkingHealth && <HugeiconsIcon icon={Loading01Icon} size={11} className="animate-spin" />}
                      Kiểm tra ngay
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border p-4">
                <h3 className="text-lg font-semibold mb-2">Kết nối</h3>
                <InfoRow label="Trạng thái">
                  <div className="space-y-1">
                    <StatusBadge status={agent.status} />
                    {latestStatusChange && (
                      <p className="text-sm text-muted-foreground">
                        Cập nhật bởi {latestStatusChange.actor} · {relativeTime(latestStatusChange.at)}
                      </p>
                    )}
                  </div>
                </InfoRow>
                <InfoRow label="Base URL">
                  <span className="text-sm break-all">{agent.baseUrl}</span>
                </InfoRow>
                <InfoRow label="Xác thực">
                  {agent.authMethod === "bearer" ? "Bearer Token" : agent.authMethod === "headers" ? "Headers (tùy chọn)" : "Không"}
                </InfoRow>
                {agent.authMethod === "bearer" && (
                  <InfoRow label="Bearer Token">
                    <span className="font-mono text-sm">••••••••</span>
                  </InfoRow>
                )}
                <InfoRow label="Host được phép cho authorizeUrl">
                  {agent.allowedAuthorizeHosts.length > 0 ? (
                    <div className="flex flex-col items-start gap-1.5">
                      {agent.allowedAuthorizeHosts.map(host => (
                        <span key={host} className="inline-flex items-center h-6 px-2 rounded-md bg-surface-muted border border-border text-sm">
                          {host}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </InfoRow>
              </div>


              <div className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-lg font-semibold">Endpoints</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {agent.lastHealthCheckAt != null && (
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        Kiểm tra {relativeTime(agent.lastHealthCheckAt)}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={checkingHealth}
                      onClick={() => {
                        setCheckingHealth(true);
                        setTimeout(() => {
                          const ok = externalAgentStore.runHealthCheck(agent.id);
                          setCheckingHealth(false);
                          refresh();
                          if (ok) toast.success("Kết nối ổn - Các endpoint bắt buộc đều phản hồi.");
                          else toast.error("Không kết nối được - Agent không phản hồi. Xem trạng thái endpoint bên dưới.");
                        }, 700);
                      }}
                      className="h-7 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {checkingHealth && <HugeiconsIcon icon={Loading01Icon} size={11} className="animate-spin" />}
                      Kiểm tra lại
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">Các địa chỉ nền tảng gọi tới Agent của bạn.</p>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-muted">
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Endpoint</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mục đích</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Trạng thái</th>
                        <th className="px-3 py-2 w-9" />
                      </tr>
                    </thead>
                    <tbody>
                      {ENDPOINTS.map(e => {
                        const full = `${agent.baseUrl}${e.path}`;
                        return (
                          <tr key={e.path} className={`border-t border-border ${!e.required ? "bg-surface-muted/50" : ""}`}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm ${!e.required ? "text-muted-foreground" : ""}`}>{e.method} {e.path}</span>
                                {e.required ? (
                                  <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border chip-success">Bắt buộc</span>
                                ) : (
                                  <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-surface-muted text-muted-foreground border-border">Tùy chọn</span>
                                )}
                              </div>
                            </td>
                            <td className={`px-3 py-2 text-sm ${!e.required ? "text-muted-foreground" : "text-foreground"}`}>{e.purpose}</td>
                            <td className="px-3 py-2 whitespace-nowrap"><EndpointStatusBadge status={endpointStatus(agent, e.path)} /></td>
                            <td className="px-3 py-2 text-right"><CopyButton value={full} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          )}
          </>
        )}

        {tab === "test" && <ExternalAgentTestTab agent={agent} />}
        {tab === "channels" && <ExternalAgentChannelsTab agent={agent} onRefresh={govChanged} onViewVersions={() => setParams({ tab: "build", section: "versions" })} />}
        {tab === "insights" && <ExternalAgentInsightsTab agentId={agent.id} />}
      </div>

      <ConnectExternalAgentModal
        open={showEdit}
        existing={agent}
        onClose={() => setShowEdit(false)}
        onSaved={(_, __, unpublished, openPublish) => {
          setShowEdit(false);
          if (unpublished) setJustUnpublished(true);
          refresh();
          if (openPublish) setShowPublishModal(true);
        }}
      />

      {showPublishModal && (
        <PublishModal
          agentId={agent.id}
          agentName={agent.name}
          external={agent}
          onClose={() => setShowPublishModal(false)}
          onPublished={() => { setJustUnpublished(false); govChanged(); }}
          onManageChannels={() => { setShowPublishModal(false); setTab("channels"); }}
        />
      )}

      <PauseExternalAgentDialog
        name={agent.name}
        open={showPause}
        onOpenChange={setShowPause}
        onConfirm={() => {
          externalAgentStore.pause(agent.id);
          toast.info(`Đã tạm dừng "${agent.name}". Bấm Tiếp tục bất cứ lúc nào.`);
          setShowPause(false);
          refresh();
        }}
      />

      <RejectExternalAgentDialog
        name={agent.name}
        open={showReject}
        onOpenChange={setShowReject}
        onConfirm={reason => {
          externalAgentStore.reject(agent.id, reason);
          toast.info(`Đã từ chối "${agent.name}".`);
          setShowReject(false);
          refresh();
        }}
      />

      <DeleteExternalAgentDialog
        name={agent.name}
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => {
          externalAgentStore.remove(agent.id);
          toast.success(`Đã xóa "${agent.name}".`);
          navigate("/external-agents");
        }}
      />
    </div>
  );
}
