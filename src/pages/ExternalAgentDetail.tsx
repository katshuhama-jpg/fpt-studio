import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, MoreHorizontal, Copy, Check, RefreshCw, AlertTriangle, Globe, PlugZap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import {
  externalAgentStore, type ExternalAgent,
} from "@/components/external-agents/externalAgentStore";
import { StatusBadge, relativeTime } from "@/components/external-agents/statusMeta";
import ConnectExternalAgentModal from "@/components/external-agents/ConnectExternalAgentModal";
import {
  DeleteExternalAgentDialog, PauseExternalAgentDialog, RejectExternalAgentDialog,
} from "@/components/external-agents/ExternalAgentDialogs";
import ExternalAgentHistoryTab from "@/components/external-agents/ExternalAgentHistoryTab";
import { toast } from "sonner";

type Tab = "connection" | "history";

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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px,1fr] items-start gap-2 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-sm text-foreground min-w-0">{children}</div>
    </div>
  );
}

export default function ExternalAgentDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { role } = useMyPermissions();
  const isAdmin = role?.id === "admin";

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [agent, setAgent] = useState<ExternalAgent | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("connection");
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

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

  const refresh = () => setTick(t => t + 1);

  if (loadState === "loading") {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-8 max-w-3xl mx-auto w-full space-y-3">
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
        <button onClick={refresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">Retry</button>
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

  const submitEnabled = agent.status === "draft" && !!agent.lastValidation?.passed;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate("/external-agents")} className="h-8 w-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
          <ChevronLeft size={16} />
        </button>
        <Link to="/external-agents" className="text-xs text-muted-foreground hover:text-foreground transition-base shrink-0">External Agents</Link>
        <span className="text-xs text-muted-foreground/50 shrink-0">/</span>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-surface-muted border border-border flex items-center justify-center shrink-0">
            <PlugZap size={14} className="text-muted-foreground" />
          </div>
          <span className="font-semibold text-sm truncate">{agent.name}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <StatusBadge status={agent.status} />

          {agent.status === "draft" && (
            <div className="flex items-center gap-2">
              {!submitEnabled && (
                <span className="text-xs text-muted-foreground max-w-[220px] text-right leading-tight">
                  Validate your connection before submitting for approval.
                </span>
              )}
              <button
                disabled={!submitEnabled}
                onClick={() => {
                  externalAgentStore.submitForApproval(agent.id);
                  toast.success("Sent for approval. We'll notify you once an admin reviews it.");
                  refresh();
                }}
                className="btn-primary h-9 disabled:opacity-40 disabled:pointer-events-none"
              >
                Submit for approval
              </button>
            </div>
          )}

          {agent.status === "waiting_approved" && isAdmin && (
            <>
              <button
                onClick={() => setShowReject(true)}
                className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  externalAgentStore.approve(agent.id);
                  toast.success(`"${agent.name}" is now active and ready to use.`);
                  refresh();
                }}
                className="btn-primary h-9"
              >
                Approve
              </button>
            </>
          )}

          {agent.status === "active" && isAdmin && (
            <button onClick={() => setShowPause(true)} className="btn-primary h-9">Pause</button>
          )}

          {agent.status === "paused" && isAdmin && (
            <button
              onClick={() => {
                externalAgentStore.resume(agent.id);
                toast.success(`"${agent.name}" is active again.`);
                refresh();
              }}
              className="btn-primary h-9"
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

      {/* Tabs */}
      <div className="border-b border-border bg-surface px-4 flex items-center gap-1 shrink-0">
        {([
          { id: "connection", label: "Connection Info" },
          { id: "history", label: "History" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 h-10 text-sm font-medium border-b-2 -mb-px transition-base ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {tab === "connection" ? (
            <div className="space-y-4">
              {agent.rejection && (
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

              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-2">Connection</h3>
                <InfoRow label="Status"><StatusBadge status={agent.status} /></InfoRow>
                <InfoRow label="Description">{agent.description || "—"}</InfoRow>
                <InfoRow label="Base URL"><span className="font-mono text-xs break-all">{agent.baseUrl}</span></InfoRow>
                <InfoRow label="Authentication">Bearer Token</InfoRow>
                <InfoRow label="Bearer Token">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">••••••••</span>
                    <button type="button" onClick={() => setShowEdit(true)} className="text-xs font-semibold text-primary hover:underline">
                      Replace token
                    </button>
                  </div>
                </InfoRow>
                <InfoRow label="Per-user connection">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{agent.lastValidation?.requiresPerUserConnection ? "Required" : "Not required"}</span>
                    {agent.lastValidation?.requiresPerUserConnection && (
                      <Link to="/external-agents/guides/per-user-connector" className="text-xs font-semibold text-primary hover:underline">
                        See how to set this up
                      </Link>
                    )}
                  </div>
                </InfoRow>
                <InfoRow label="Last health check">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      {agent.lastHealthCheckAt == null
                        ? "Never checked"
                        : `${relativeTime(agent.lastHealthCheckAt)} · `}
                      {agent.lastHealthCheckAt != null && (
                        <span className={agent.lastHealthCheckOk ? "text-success font-medium" : "text-destructive font-medium"}>
                          {agent.lastHealthCheckOk ? "Healthy" : "Unreachable"}
                        </span>
                      )}
                    </span>
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
                <h3 className="text-sm font-semibold mb-2">Endpoints</h3>
                {(["/health", "/runs", "/tools"] as const).map(path => {
                  const full = `${agent.baseUrl}${path}`;
                  return (
                    <div key={path} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                      <span className="font-mono text-xs text-foreground truncate">{full}</span>
                      <CopyButton value={full} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <ExternalAgentHistoryTab agentId={agent.id} />
          )}
        </div>
      </div>

      <ConnectExternalAgentModal
        open={showEdit}
        existing={agent}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); refresh(); }}
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
          toast.info(`"${agent.name}" was sent back to draft with a note for the creator.`);
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
          toast.success(`"${agent.name}" has been deleted.`);
          navigate("/external-agents");
        }}
      />
    </div>
  );
}
