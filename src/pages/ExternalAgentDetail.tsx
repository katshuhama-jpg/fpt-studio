import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, MoreHorizontal, Copy, Check, RefreshCw, AlertTriangle, Globe,
  FileEdit, BookOpen, Eye, EyeOff, PanelLeftOpen, PanelLeftClose, Pencil,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon, FlaskConicalIcon, GridViewIcon, Analytics01Icon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import {
  externalAgentStore, runValidation, type ExternalAgent, type ValidationResult,
} from "@/components/external-agents/externalAgentStore";
import { StatusBadge, relativeTime } from "@/components/external-agents/statusMeta";
import ConnectExternalAgentModal from "@/components/external-agents/ConnectExternalAgentModal";
import {
  DeleteExternalAgentDialog, PauseExternalAgentDialog, ReplaceTokenConfirmDialog, RejectExternalAgentDialog,
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
  { method: "GET", path: "/health", purpose: "Status and protocol version.", required: true },
  { method: "POST", path: "/runs", purpose: "Calls the agent to run.", required: true },
  { method: "GET", path: "/tools", purpose: "Lists the tools this agent declares.", required: true },
  { method: "POST", path: "/credentials", purpose: "Registers a per-user credential (optional, off this phase).", required: false },
  { method: "POST", path: "/credentials/revoke", purpose: "Revokes a per-user credential (optional, off this phase).", required: false },
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
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
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
        {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
      </button>
      <pre className="text-[11px] font-mono p-3 pr-16 overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
}

function maskSecret(secret: string): string {
  return "•".repeat(Math.min(secret.length, 32));
}

function InfoRow({ label, children, onEdit }: { label: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] items-start gap-1 sm:gap-2 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="text-sm text-foreground min-w-0 flex-1">{children}</div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${label}`}
            className="shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
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
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>;
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
  const [showPause, setShowPause] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [justUnpublished, setJustUnpublished] = useState(false);
  const [showSigningSecret, setShowSigningSecret] = useState(false);
  const [signingSecretCopied, setSigningSecretCopied] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [replacingToken, setReplacingToken] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [showNewToken, setShowNewToken] = useState(false);
  const [replaceChecking, setReplaceChecking] = useState(false);
  const [replaceResult, setReplaceResult] = useState<ValidationResult | null>(null);

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
        <AlertTriangle size={22} className="text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mb-4">We couldn't load your external agents. Please try again.</p>
        <button onClick={hardRefresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Retry</button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-center px-6">
        <Globe size={22} className="text-muted-foreground/60 mb-3" />
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

  const submitReplaceToken = () => {
    if (!newToken.trim()) return;
    setReplaceChecking(true);
    setTimeout(() => {
      const v = runValidation(agent.baseUrl, newToken.trim());
      externalAgentStore.update(agent.id, { tokenReplaced: true, validation: v });
      setReplaceResult(v);
      setReplaceChecking(false);
      setReplacingToken(false);
      setNewToken("");
      refresh();
    }, 600);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar — same 3-part layout as the internal Agent's: left (back/breadcrumb/name),
          center (Build/Test/Channels/Insights), right (status + actions). Still wraps onto a
          second line on narrow viewports instead of clipping. */}
      <div className="min-h-14 border-b border-border bg-surface flex flex-wrap items-center gap-3 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate("/external-agents")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <ChevronLeft size={16} />
          </button>
          <Link to="/external-agents" className="text-xs text-muted-foreground hover:text-foreground transition-base shrink-0 hidden sm:inline">External Agents</Link>
          <span className="text-xs text-muted-foreground/50 shrink-0 hidden sm:inline">/</span>
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
          <StatusBadge status={agent.status} />
          {agent.status === "published" && (
            <span className="px-1.5 py-0.5 rounded bg-surface-muted text-xs text-muted-foreground whitespace-nowrap">Workspace</span>
          )}

          {agent.status === "draft" && (
            <div className="flex items-center gap-2 flex-wrap">
              {!validationPassed && (
                <span className="text-xs text-muted-foreground max-w-[200px] text-right leading-tight">
                  Validate your connection first.
                </span>
              )}
              <button
                disabled={!validationPassed}
                onClick={() => {
                  externalAgentStore.submitForApproval(agent.id);
                  toast.success(`"${agent.name}" was submitted for approval.`);
                  refresh();
                }}
                className="btn-primary h-9 whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
              >
                Submit for approval
              </button>
            </div>
          )}

          {agent.status === "pending_approval" && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowReject(true)}
                className="h-9 px-4 rounded-lg border border-destructive/30 text-destructive hover:bg-[hsl(var(--destructive-soft))] text-sm font-medium transition-base whitespace-nowrap"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  externalAgentStore.approve(agent.id);
                  toast.success(`"${agent.name}" was approved and is now published.`);
                  refresh();
                }}
                className="btn-primary h-9 whitespace-nowrap"
              >
                Approve
              </button>
            </div>
          )}

          {agent.status === "rejected" && (
            <button
              onClick={() => {
                externalAgentStore.submitForApproval(agent.id);
                toast.success(`"${agent.name}" was submitted for approval.`);
                refresh();
              }}
              className="btn-primary h-9 whitespace-nowrap"
            >
              Submit again
            </button>
          )}

          {agent.status === "published" && isAdmin && (
            <button onClick={() => setShowPause(true)} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base whitespace-nowrap">Pause</button>
          )}

          {agent.status === "paused" && isAdmin && (
            <button
              onClick={() => {
                externalAgentStore.resume(agent.id);
                toast.success(`"${agent.name}" is published again.`);
                refresh();
              }}
              className="btn-primary h-9 whitespace-nowrap"
            >
              Resume
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(o => !o)}
              aria-label="External agent actions"
              className="h-9 w-9 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-white shadow-elev py-1">
                  <button onClick={() => { setShowEdit(true); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-muted transition-base">
                    Edit connection
                  </button>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <span>
                        <button
                          disabled={agent.status === "published"}
                          onClick={() => { setShowDelete(true); setShowMenu(false); }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-base ${
                            agent.status === "published" ? "text-muted-foreground/50 cursor-not-allowed" : "text-destructive hover:bg-[hsl(var(--destructive-soft))]"
                          }`}
                        >
                          Delete
                        </button>
                      </span>
                    </TooltipTrigger>
                    {agent.status === "published" && <TooltipContent side="left">Pause this agent before deleting.</TooltipContent>}
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
                background: "#ffffff",
                width: sidebarCollapsed ? "0px" : "240px",
                opacity: sidebarCollapsed ? 0 : 1,
                transition: "width 320ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease",
                minWidth: 0,
              }}
            >
              <nav className="shrink-0 px-2 pt-2 pb-1 flex flex-col" style={{ gap: "4px" }}>
                <button
                  style={{ height: "36px", fontSize: "14px" }}
                  className="w-full flex items-center rounded-lg px-2.5 transition-base shrink-0 bg-primary-soft text-primary font-medium"
                >
                  <FileEdit size={18} className="shrink-0" />
                  <span className="flex-1 text-left truncate ml-2.5">Instructions</span>
                </button>
              </nav>

              <div className="flex-1" />

              {/* Setup checklist — pinned directly above Collapse sidebar, not part of the
                  scrolling nav above. Plain ✓/○ list, no progress bar or %: it's a reference
                  for the person configuring the agent, not a gate on Submit/Publish. */}
              <div className="shrink-0 px-3 pb-3 space-y-2">
                <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                  <span className="text-xs font-semibold text-foreground block mb-1.5">Setup checklist</span>
                  <div className="space-y-1">
                    {setupChecklist.map(item => (
                      <div key={item.label} className="flex items-center gap-1.5 text-xs">
                        {item.done
                          ? <Check size={11} className="text-primary shrink-0" />
                          : <span className="w-3 h-3 rounded-full border-2 border-muted-foreground shrink-0 inline-block" />}
                        <span className={item.done ? "text-primary" : "text-muted-foreground"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="w-full h-8 rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-muted text-xs font-medium flex items-center justify-center gap-1.5 transition-base"
                >
                  <PanelLeftClose size={13} /> Collapse sidebar
                </button>
              </div>
            </aside>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="space-y-4">
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Open sidebar"
                  className="w-8 h-8 rounded-lg border border-border bg-surface flex items-center justify-center text-muted-foreground hover:bg-surface-muted transition-base"
                >
                  <PanelLeftOpen size={15} />
                </button>
              )}
              <Link
                to="/external-agents/guides/integration"
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-surface-muted transition-base"
              >
                <BookOpen size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium flex-1">New to external agents? Read the integration guide</span>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </Link>

              {justUnpublished && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-[hsl(var(--warning-soft))] px-3.5 py-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-warning leading-relaxed">
                      This agent was unpublished because its connection was edited. Submit it for approval again to make it live.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        externalAgentStore.submitForApproval(agent.id);
                        toast.success(`"${agent.name}" was submitted for approval.`);
                        setJustUnpublished(false);
                        refresh();
                      }}
                      className="mt-1.5 text-xs font-semibold text-warning hover:underline"
                    >
                      Submit for approval
                    </button>
                  </div>
                </div>
              )}

              {agent.status === "rejected" && agent.rejection && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
                  <p className="text-xs text-destructive leading-relaxed min-w-0 flex-1">
                    Rejected: {agent.rejection.reason}
                  </p>
                </div>
              )}

              {agent.lastHealthCheckOk === false && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-[hsl(var(--destructive-soft))] px-3.5 py-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-destructive leading-relaxed">
                      This agent has been unreachable since{" "}
                      {agent.lastHealthyAt ? new Date(agent.lastHealthyAt).toLocaleDateString() : "it was first connected"}.
                      Conversations on its published channels may be failing.
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
                      className="mt-1.5 text-xs font-semibold text-destructive hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {checkingHealth && <RefreshCw size={11} className="animate-spin" />}
                      Run check now
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-2">Connection</h3>
                <InfoRow label="Name" onEdit={() => setShowEdit(true)}>{agent.name}</InfoRow>
                <InfoRow label="Description" onEdit={() => setShowEdit(true)}>{agent.description || "—"}</InfoRow>
                <InfoRow label="Status">
                  <div className="space-y-1">
                    <StatusBadge status={agent.status} />
                    {latestStatusChange && (
                      <p className="text-xs text-muted-foreground">
                        Changed by {latestStatusChange.actor} · {relativeTime(latestStatusChange.at)}
                      </p>
                    )}
                  </div>
                </InfoRow>
                <InfoRow label="Last health check">
                  <div className="flex items-center gap-2 flex-wrap">
                    {agent.lastHealthCheckAt == null ? (
                      <span className="text-muted-foreground">Never checked</span>
                    ) : (
                      <>
                        <span className="text-muted-foreground">{relativeTime(agent.lastHealthCheckAt)}</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${agent.lastHealthCheckOk ? "chip-success" : "chip-danger"}`}>
                          {agent.lastHealthCheckOk ? "Healthy" : "Unreachable"}
                        </span>
                      </>
                    )}
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
                      className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {checkingHealth && <RefreshCw size={11} className="animate-spin" />}
                      Run check now
                    </button>
                  </div>
                </InfoRow>
                <InfoRow label="Base URL" onEdit={() => setShowEdit(true)}><span className="font-mono text-xs break-all">{agent.baseUrl}</span></InfoRow>
                <InfoRow label="Authentication" onEdit={() => setShowEdit(true)}>{agent.authMethod === "bearer" ? "Bearer Token" : "None"}</InfoRow>
                {agent.authMethod === "bearer" && (
                  <InfoRow label="Bearer Token">
                    {replacingToken ? (
                      <div className="space-y-2">
                        <div className="relative max-w-sm">
                          <input
                            type={showNewToken ? "text" : "password"}
                            value={newToken}
                            onChange={e => setNewToken(e.target.value)}
                            placeholder="Paste the new bearer token"
                            className="w-full h-9 pl-3 pr-16 rounded-lg border border-border bg-surface text-sm font-mono outline-none focus:border-primary transition-base"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewToken(v => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-base"
                          >
                            {showNewToken ? <EyeOff size={12} /> : <Eye size={12} />} {showNewToken ? "Hide" : "Show"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!newToken.trim() || replaceChecking}
                            onClick={submitReplaceToken}
                            className="btn-primary h-8 px-3 text-xs disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                          >
                            {replaceChecking && <RefreshCw size={11} className="animate-spin" />} Save token
                          </button>
                          <button
                            type="button"
                            onClick={() => { setReplacingToken(false); setNewToken(""); }}
                            className="h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">••••••••</span>
                          <button type="button" onClick={() => setShowReplaceConfirm(true)} className="text-xs font-semibold text-primary hover:underline">
                            Replace token
                          </button>
                        </div>
                        {replaceResult && (
                          <p className={`text-xs flex items-center gap-1 ${replaceResult.passed ? "text-success" : "text-destructive"}`}>
                            {replaceResult.passed ? <Check size={11} /> : <AlertTriangle size={11} />}
                            {replaceResult.passed ? "New token validated successfully." : "The new token failed validation — this agent may stop responding."}
                          </p>
                        )}
                      </div>
                    )}
                  </InfoRow>
                )}
                <InfoRow label="Signing secret">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs truncate">{showSigningSecret ? agent.signingSecret : maskSecret(agent.signingSecret)}</span>
                    <button
                      type="button"
                      onClick={() => setShowSigningSecret(v => !v)}
                      className="text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      {showSigningSecret ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(agent.signingSecret).catch(() => {});
                        setSigningSecretCopied(true);
                        setTimeout(() => setSigningSecretCopied(false), 1200);
                      }}
                      className="text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      {signingSecretCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </InfoRow>
                <InfoRow label="Allowed hosts for authorizeUrl" onEdit={() => setShowEdit(true)}>
                  {agent.allowedAuthorizeHosts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.allowedAuthorizeHosts.map(host => (
                        <span key={host} className="inline-flex items-center h-6 px-2 rounded-md bg-surface-muted border border-border text-xs font-mono">
                          {host}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </InfoRow>
              </div>

              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-1">Endpoints</h3>
                <p className="text-xs text-muted-foreground mb-3">These are the addresses the platform calls on your agent.</p>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-muted">
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Endpoint</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">URL</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Purpose</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Status</th>
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
                                <span className={`font-mono text-xs ${!e.required ? "text-muted-foreground" : ""}`}>{e.method} {e.path}</span>
                                {e.required ? (
                                  <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border chip-success">Required</span>
                                ) : (
                                  <span className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-surface-muted text-muted-foreground border-border">Optional</span>
                                )}
                              </div>
                            </td>
                            <td className={`px-3 py-2 font-mono text-xs break-all ${!e.required ? "text-muted-foreground/70" : "text-muted-foreground"}`}>{full}</td>
                            <td className={`px-3 py-2 text-xs ${!e.required ? "text-muted-foreground" : "text-foreground"}`}>{e.purpose}</td>
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
          </>
        )}

        {tab === "test" && <ExternalAgentTestTab agent={agent} />}
        {tab === "channels" && <ExternalAgentChannelsTab agent={agent} />}
        {tab === "insights" && <ExternalAgentInsightsTab agentId={agent.id} />}
      </div>

      <ConnectExternalAgentModal
        open={showEdit}
        existing={agent}
        onClose={() => setShowEdit(false)}
        onSaved={(_, __, unpublished) => {
          setShowEdit(false);
          if (unpublished) setJustUnpublished(true);
          refresh();
        }}
      />

      <PauseExternalAgentDialog
        name={agent.name}
        open={showPause}
        onOpenChange={setShowPause}
        onConfirm={() => {
          externalAgentStore.pause(agent.id);
          toast.info(`"${agent.name}" is paused. Resume it any time.`);
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
          toast.info(`"${agent.name}" was rejected.`);
          setShowReject(false);
          refresh();
        }}
      />

      <ReplaceTokenConfirmDialog
        open={showReplaceConfirm}
        onOpenChange={setShowReplaceConfirm}
        onConfirm={() => { setShowReplaceConfirm(false); setReplaceResult(null); setReplacingToken(true); }}
      />

      <DeleteExternalAgentDialog
        name={agent.name}
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={() => {
          externalAgentStore.remove(agent.id);
          toast.success(`"${agent.name}" has been deleted.`);
          navigate("/external-agents");
        }}
      />
    </div>
  );
}
