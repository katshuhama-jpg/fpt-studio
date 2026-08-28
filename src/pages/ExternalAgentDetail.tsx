import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, MoreHorizontal, Copy, Check, RefreshCw, AlertTriangle, Globe, PlugZap,
  FileEdit, History as HistoryIcon, Activity as ActivityIcon, FlaskConical, BookOpen, Eye, EyeOff,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import {
  externalAgentStore, channelLabel, runValidation, type ExternalAgent, type ValidationResult,
} from "@/components/external-agents/externalAgentStore";
import { StatusBadge, relativeTime } from "@/components/external-agents/statusMeta";
import ConnectExternalAgentModal from "@/components/external-agents/ConnectExternalAgentModal";
import {
  DeleteExternalAgentDialog, PauseExternalAgentDialog, ReplaceTokenConfirmDialog,
} from "@/components/external-agents/ExternalAgentDialogs";
import ExternalAgentHistoryTab from "@/components/external-agents/ExternalAgentHistoryTab";
import ExternalAgentActivityTab from "@/components/external-agents/ExternalAgentActivityTab";
import ExternalAgentTestTab from "@/components/external-agents/ExternalAgentTestTab";
import PublishExternalAgentModal from "@/components/external-agents/PublishExternalAgentModal";
import { toast } from "sonner";

type Section = "instruction" | "test" | "history" | "activity";

const NAV: { id: Section; label: string; icon: any }[] = [
  { id: "instruction", label: "Instruction", icon: FileEdit },
  { id: "test", label: "Test", icon: FlaskConical },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "activity", label: "Activity", icon: ActivityIcon },
];

const ENDPOINTS: { method: string; path: string; purpose: string }[] = [
  { method: "GET", path: "/health", purpose: "Status, protocol version, and the per-user-connection flag." },
  { method: "POST", path: "/runs", purpose: "Calls the agent to run." },
  { method: "GET", path: "/tools", purpose: "Lists the tools this agent declares." },
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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] items-start gap-1 sm:gap-2 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-sm text-foreground min-w-0">{children}</div>
    </div>
  );
}

const PERUSER_COPY: Record<string, { chip: string; label: string; message: string }> = {
  none: { chip: "", label: "Not required", message: "" },
  valid: { chip: "chip-success", label: "Valid", message: "Each user will be asked to connect their own account the first time they use this agent." },
  non_compliant: { chip: "chip-warning", label: "Declared but non-compliant", message: "This agent declares a per-user connector, but it doesn't match the expected contract. You can still use it — fix this when you get a chance." },
};

export default function ExternalAgentDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { role } = useMyPermissions();
  const isAdmin = role?.id === "admin";

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [agent, setAgent] = useState<ExternalAgent | undefined>(undefined);
  const [section, setSection] = useState<Section>("instruction");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const [replacingToken, setReplacingToken] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [showNewToken, setShowNewToken] = useState(false);
  const [replaceChecking, setReplaceChecking] = useState(false);
  const [replaceResult, setReplaceResult] = useState<ValidationResult | null>(null);

  // Sync the inner nav to the narrow breakpoint on resize, in both directions — at ~480px it
  // was leaving so little room for content that InfoRow values wrapped one character per line,
  // and only forcing collapse (never un-collapsing) would leave it stuck after resizing back up.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handleChange = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

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

  const readyChecklist = [
    { label: "Connection validated", done: validationPassed },
    { label: "Description added", done: agent.description.trim().length > 0 },
    { label: "Per-user connection reviewed", done: agent.lastValidation != null },
    { label: "Sent for approval", done: agent.approved || agent.status !== "draft" },
  ];
  const readyDoneCount = readyChecklist.filter(i => i.done).length;
  const showReadyCard = agent.status !== "published" && agent.status !== "paused";

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

  const perUser = agent.lastValidation ? PERUSER_COPY[agent.lastValidation.perUserConnector] : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar — wraps onto its own second line on narrow viewports instead of clipping the
          agent name or the action buttons; min-h instead of a fixed h-14 lets it grow when it does. */}
      <div className="min-h-14 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate("/external-agents")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <ChevronLeft size={16} />
          </button>
          <Link to="/external-agents" className="text-xs text-muted-foreground hover:text-foreground transition-base shrink-0 hidden sm:inline">External Agents</Link>
          <span className="text-xs text-muted-foreground/50 shrink-0 hidden sm:inline">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-surface-muted border border-border flex items-center justify-center shrink-0">
              <PlugZap size={14} className="text-muted-foreground" />
            </div>
            <span className="font-semibold text-sm truncate">{agent.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={agent.status} />
          {agent.status === "published" && agent.channels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {agent.channels.map(id => (
                <span key={id} className="px-1.5 py-0.5 rounded bg-surface-muted text-xs text-muted-foreground whitespace-nowrap">
                  {channelLabel(id)}
                </span>
              ))}
            </div>
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
                onClick={() => setShowPublish(true)}
                className="btn-primary h-9 whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
              >
                Publish
              </button>
            </div>
          )}

          {agent.status === "pending_approval" && (
            <button
              disabled
              title="Waiting for approval."
              className="h-9 px-4 rounded-lg bg-primary/40 text-primary-foreground text-sm font-medium cursor-not-allowed opacity-60 whitespace-nowrap"
            >
              Publish
            </button>
          )}

          {agent.status === "rejected" && (
            <button onClick={() => setShowEdit(true)} className="btn-primary h-9 whitespace-nowrap">Edit connection</button>
          )}

          {agent.status === "published" && (
            <>
              <button onClick={() => setShowPublish(true)} className="btn-primary h-9 whitespace-nowrap">Manage channels</button>
              {isAdmin && (
                <button onClick={() => setShowPause(true)} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base whitespace-nowrap">Pause</button>
              )}
            </>
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
                  <button onClick={() => { setShowDelete(true); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-[hsl(var(--destructive-soft))] transition-base">
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Inner left sidebar — same shell/pattern as /agents/[id] */}
        <aside
          className="border-r border-border overflow-hidden shrink-0 flex flex-col h-full bg-white"
          style={{
            width: sidebarCollapsed ? "0px" : "240px",
            opacity: sidebarCollapsed ? 0 : 1,
            transition: "width 320ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease",
            minWidth: 0,
          }}
        >
          <nav className="shrink-0 px-2 pt-2 pb-1 flex flex-col" style={{ gap: "4px" }}>
            {NAV.map(it => {
              const Icon = it.icon;
              return (
                <button
                  key={it.id}
                  onClick={() => setSection(it.id)}
                  style={{ height: "36px", fontSize: "14px" }}
                  className={`w-full flex items-center rounded-lg px-2.5 transition-base shrink-0 ${
                    section === it.id ? "bg-primary-soft text-primary font-medium" : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1 text-left truncate ml-2.5">{it.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-3 py-3 border-t border-border flex-1 min-h-0 overflow-y-auto space-y-2">
            {showReadyCard && (
              <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">Ready to submit</span>
                  <span className="text-xs text-muted-foreground">{readyDoneCount}/{readyChecklist.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(readyDoneCount / readyChecklist.length) * 100}%` }} />
                </div>
                <div className="space-y-1">
                  {readyChecklist.map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs">
                      {item.done
                        ? <Check size={11} className="text-primary shrink-0" />
                        : <span className="w-3 h-3 rounded-full border-2 border-muted-foreground shrink-0 inline-block" />}
                      <span className={item.done ? "text-primary" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(true)}
              className="w-full h-8 rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-muted text-xs font-medium flex items-center justify-center gap-1.5 transition-base"
            >
              <ChevronLeft size={12} /> Collapse sidebar
            </button>
          </div>
        </aside>

        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Expand sidebar"
            className="w-6 border-r border-border bg-white shrink-0 flex items-start justify-center pt-3 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base"
          >
            <ChevronRight size={13} />
          </button>
        )}

        {/* Content */}
        {section === "instruction" ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="space-y-4">
              <Link
                to="/external-agents/guides/integration"
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-surface-muted transition-base"
              >
                <BookOpen size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium flex-1">New to external agents? Read the integration guide</span>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </Link>

              {agent.status === "rejected" && agent.rejection && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-[hsl(var(--warning-soft))] px-3.5 py-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-warning leading-relaxed">
                      Rejected on {new Date(agent.rejection.at).toLocaleDateString()} by {agent.rejection.by} — "{agent.rejection.reason}"
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEdit(true)}
                      className="mt-1.5 text-xs font-semibold text-warning hover:underline"
                    >
                      Edit connection
                    </button>
                  </div>
                </div>
              )}

              {agent.status === "draft" && agent.lastRejection && !agent.rejectionBannerDismissed && (
                <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted px-3.5 py-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Previously rejected on {new Date(agent.lastRejection.at).toLocaleDateString()} by {agent.lastRejection.by} — "{agent.lastRejection.reason}"
                    </p>
                    <button
                      type="button"
                      onClick={() => { externalAgentStore.dismissRejectionBanner(agent.id); refresh(); }}
                      className="mt-1.5 text-xs font-semibold text-foreground hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
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
                <InfoRow label="Description">{agent.description || "—"}</InfoRow>
                <InfoRow label="Base URL"><span className="font-mono text-xs break-all">{agent.baseUrl}</span></InfoRow>
                <InfoRow label="Authentication">{agent.authMethod === "bearer" ? "Bearer Token" : "None"}</InfoRow>
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
                <InfoRow label="Per-user connection">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {perUser?.chip ? (
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${perUser.chip}`}>{perUser.label}</span>
                      ) : (
                        <span>{perUser?.label ?? "Not required"}</span>
                      )}
                      {agent.lastValidation && agent.lastValidation.perUserConnector !== "none" && (
                        <Link to="/external-agents/guides/integration#per-user-connector" className="text-xs font-semibold text-primary hover:underline">
                          See how to set this up
                        </Link>
                      )}
                    </div>
                    {perUser?.message && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{perUser.message}</p>
                    )}
                  </div>
                </InfoRow>
                <InfoRow label="Guardrails">
                  {agent.guardrail ? (
                    <span>{agent.guardrail}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Not configured</span>
                      <Link to="/guardrails" className="text-xs font-semibold text-primary hover:underline">Configure</Link>
                    </div>
                  )}
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
                        <th className="px-3 py-2 w-9" />
                      </tr>
                    </thead>
                    <tbody>
                      {ENDPOINTS.map(e => {
                        const full = `${agent.baseUrl}${e.path}`;
                        return (
                          <tr key={e.path} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{e.method} {e.path}</td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground break-all">{full}</td>
                            <td className="px-3 py-2 text-xs text-foreground">{e.purpose}</td>
                            <td className="px-3 py-2 text-right"><CopyButton value={full} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-1">Authentication</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {agent.authMethod === "bearer" ? (
                    <>
                      Every call the platform makes to your agent includes an <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code> header,
                      so your agent can verify the request really came from the platform. The token is stored encrypted and is never shown again after saving.
                    </>
                  ) : (
                    <>No bearer token is used for this agent. Every request is still signed with the HMAC signing secret — your agent must verify the X-FPT-Signature header.</>
                  )}
                </p>
                <CopyBlock code={agent.authMethod === "bearer"
                  ? `POST ${agent.baseUrl}/runs HTTP/1.1\nAuthorization: Bearer <token>\nX-FPT-Signature: t=<epoch seconds>,v1=<hex hmac-sha256>\nContent-Type: application/json`
                  : `POST ${agent.baseUrl}/runs HTTP/1.1\nX-FPT-Signature: t=<epoch seconds>,v1=<hex hmac-sha256>\nContent-Type: application/json`}
                />
              </div>

              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-1">Expected response</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  This is what the platform expects your agent's <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">/health</code> endpoint to return.
                </p>
                <CopyBlock
                  code={JSON.stringify(
                    { status: "ok", protocolVersions: ["1"], name: agent.name, version: "2.3.1" },
                    null,
                    2,
                  )}
                />
              </div>
            </div>
          </div>
        ) : section === "test" ? (
          <ExternalAgentTestTab agent={agent} />
        ) : section === "history" ? (
          <ExternalAgentHistoryTab agentId={agent.id} />
        ) : (
          <ExternalAgentActivityTab agentId={agent.id} />
        )}
      </div>

      <ConnectExternalAgentModal
        open={showEdit}
        existing={agent}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); refresh(); }}
      />

      <PublishExternalAgentModal
        open={showPublish}
        agentId={agent.id}
        agentName={agent.name}
        currentChannels={agent.channels}
        alreadyApproved={agent.approved}
        onClose={() => setShowPublish(false)}
        onPublished={refresh}
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
