import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Globe, Search, MoreVertical, Plus, AlertTriangle, BookOpen, TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import {
  externalAgentStore, channelLabel, pendingApprovalLevel, type ExternalAgent, type ExternalAgentStatus,
} from "@/components/external-agents/externalAgentStore";
import { StatusBadge, relativeTime } from "@/components/external-agents/statusMeta";
import ConnectExternalAgentModal from "@/components/external-agents/ConnectExternalAgentModal";
import PublishExternalAgentModal from "@/components/external-agents/PublishExternalAgentModal";
import {
  DeleteExternalAgentDialog, PauseExternalAgentDialog,
} from "@/components/external-agents/ExternalAgentDialogs";
import { toast } from "sonner";

const TABS: { key: ExternalAgentStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending approval" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
  { key: "paused", label: "Paused" },
];

const ROW_MENU_WIDTH = 176; // w-44
const ROW_MENU_HEIGHT_ESTIMATE = 220; // worst case, 5 rows — for the flip-up decision

function RowMenu({ agent, isAdmin, onOpen, onEdit, onPublish, onPauseResume, onDelete }: {
  agent: ExternalAgent; isAdmin: boolean;
  onOpen: () => void; onEdit: () => void; onPublish: () => void; onPauseResume: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      // The row lives inside the table's own overflow-x-auto wrapper, so an absolutely
      // positioned dropdown would get clipped — render in a portal instead, positioned from
      // the button's own screen rect, with the same flip-up + horizontal clamp used by the
      // Triggers row menu so it's never cut off near the viewport edges either.
      const openUpward = window.innerHeight - r.bottom < ROW_MENU_HEIGHT_ESTIMATE && r.top > ROW_MENU_HEIGHT_ESTIMATE;
      const left = Math.min(Math.max(r.right - ROW_MENU_WIDTH, 8), window.innerWidth - ROW_MENU_WIDTH - 8);
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

  // Only ever render the actions that are actually valid for this status — never a
  // disabled/greyed-out item — matching the per-status action table exactly. Approving and
  // rejecting a connection happens in a separate admin console that isn't part of this
  // Builder product, so those actions never appear here.
  const items: { label: string; onClick: () => void; danger?: boolean }[] = [
    { label: "Open", onClick: onOpen },
  ];
  switch (agent.status) {
    case "draft":
      items.push({ label: "Edit connection", onClick: onEdit });
      if (agent.lastValidation?.passed) items.push({ label: "Publish", onClick: onPublish });
      break;
    case "pending_approval":
      break;
    case "rejected":
      items.push({ label: "Edit connection", onClick: onEdit });
      break;
    case "published":
      items.push({ label: "Edit connection", onClick: onEdit });
      items.push({ label: "Publish", onClick: onPublish });
      if (isAdmin) items.push({ label: "Pause", onClick: onPauseResume });
      break;
    case "paused":
      items.push({ label: "Edit connection", onClick: onEdit });
      if (isAdmin) items.push({ label: "Resume", onClick: onPauseResume });
      break;
  }
  items.push({ label: "Delete", onClick: onDelete, danger: true });

  return (
    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label="External agent actions"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base"
      >
        <MoreVertical size={15} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-44 rounded-lg border border-border bg-white shadow-elev py-1"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-base ${
                item.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function ExternalAgentsList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const forceEmpty = params.get("empty") === "1";
  const { role } = useMyPermissions();
  const isAdmin = role?.id === "admin";

  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [tick, setTick] = useState(0);
  const [agentsRaw, setAgentsRaw] = useState<ExternalAgent[]>([]);
  const agents = forceEmpty ? [] : agentsRaw;
  const [tab, setTab] = useState<ExternalAgentStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [editTarget, setEditTarget] = useState<ExternalAgent | null>(null);
  const [pauseTarget, setPauseTarget] = useState<ExternalAgent | null>(null);
  const [publishTarget, setPublishTarget] = useState<ExternalAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExternalAgent | null>(null);

  useEffect(() => {
    setLoadState("loading");
    const t = setTimeout(() => {
      try {
        setAgentsRaw(externalAgentStore.list());
        setLoadState("ready");
      } catch {
        setLoadState("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [tick]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = () => setTick(t => t + 1);

  const counts: Record<ExternalAgentStatus | "all", number> = {
    all: agents.length,
    draft: agents.filter(a => a.status === "draft").length,
    pending_approval: agents.filter(a => a.status === "pending_approval").length,
    rejected: agents.filter(a => a.status === "rejected").length,
    published: agents.filter(a => a.status === "published").length,
    paused: agents.filter(a => a.status === "paused").length,
  };

  const tabFiltered = tab === "all" ? agents : agents.filter(a => a.status === tab);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? tabFiltered.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    : tabFiltered;

  const hasAnyAgents = agents.length > 0;

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">External Agents</h1>
          <p className="text-sm text-muted-foreground">Connect and manage agents hosted outside the FPT AI Platform.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/external-agents/guides/integration"
            className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base flex items-center gap-1.5"
          >
            <BookOpen size={14} /> Integration guide
          </Link>
          {hasAnyAgents && (
            <button onClick={() => setShowConnect(true)} className="btn-primary h-9">
              <Plus size={14} /> Connect External Agent
            </button>
          )}
        </div>
      </div>

      {loadState === "loading" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="h-9 bg-surface-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-t border-border">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      {loadState === "error" && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <AlertTriangle size={22} className="mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            We couldn't load your external agents. Please try again.
          </p>
          <button onClick={refresh} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base">
            Retry
          </button>
        </div>
      )}

      {loadState === "ready" && !hasAnyAgents && (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-muted text-muted-foreground flex items-center justify-center mb-3">
            <Globe size={20} />
          </div>
          <h3 className="font-display text-base font-semibold mb-1">No external agents yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Connect an agent hosted outside the FPT AI Platform to use it in this workspace.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setShowConnect(true)} className="btn-primary h-9">
              <Plus size={14} /> Connect External Agent
            </button>
            <Link to="/external-agents/guides/integration" className="text-sm font-medium text-primary hover:underline">
              How external agents work
            </Link>
          </div>
        </div>
      )}

      {loadState === "ready" && hasAnyAgents && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-border pb-3">
            <div className="flex items-center gap-1 flex-wrap">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
                    tab === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary/10 text-primary" : "bg-surface-sunken text-muted-foreground"}`}>
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search external agents..."
                className="h-9 w-64 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {q ? "No external agents match your search." : "No external agents in this status."}
              </p>
              {q && (
                <button
                  onClick={() => { setSearchInput(""); setSearch(""); }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agent</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Base URL</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Health</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Updated</th>
                    <th className="px-4 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const statusContext =
                      a.status === "pending_approval"
                        ? (pendingApprovalLevel(a.baseUrl) === "fpt" ? "Waiting for FPT admin" : "Waiting for Org admin")
                      : a.status === "rejected" && a.rejection ? a.rejection.reason
                      : null;
                    const unreachablePublished = a.status === "published" && a.lastHealthCheckOk === false;
                    return (
                    <tr
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/external-agents/${a.id}`)}
                      onKeyDown={e => { if (e.key === "Enter") navigate(`/external-agents/${a.id}`); }}
                      className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="font-medium text-foreground truncate">{a.name}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{a.description || "—"}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <StatusBadge status={a.status} />
                        {statusContext && (
                          <div
                            className="text-xs text-muted-foreground truncate mt-1"
                            title={a.status === "rejected" ? statusContext : undefined}
                          >
                            {statusContext}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[160px]">
                        {a.channels.length > 0 ? a.channels.map(channelLabel).join(" · ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono truncate max-w-[220px]" title={a.baseUrl}>{a.baseUrl}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {a.lastHealthCheckAt == null ? (
                          <span className="text-muted-foreground">Never checked</span>
                        ) : unreachablePublished ? (
                          <span
                            className="inline-flex items-center gap-1 text-destructive font-medium"
                            title="This agent is published but not responding. Users may see errors."
                          >
                            <TriangleAlert size={12} /> Unreachable · {relativeTime(a.lastHealthCheckAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {a.lastHealthCheckOk ? "Healthy" : "Unreachable"} · {relativeTime(a.lastHealthCheckAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{relativeTime(a.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <RowMenu
                          agent={a}
                          isAdmin={isAdmin}
                          onOpen={() => navigate(`/external-agents/${a.id}`)}
                          onEdit={() => setEditTarget(a)}
                          onPublish={() => setPublishTarget(a)}
                          onPauseResume={() => {
                            if (a.status === "published") setPauseTarget(a);
                            else { externalAgentStore.resume(a.id); toast.success(`"${a.name}" is published again.`); refresh(); }
                          }}
                          onDelete={() => setDeleteTarget(a)}
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConnectExternalAgentModal
        open={showConnect || !!editTarget}
        existing={editTarget ?? undefined}
        onClose={() => { setShowConnect(false); setEditTarget(null); }}
        onSaved={(agent, isNew) => {
          setShowConnect(false);
          setEditTarget(null);
          if (isNew) {
            toast.success(`"${agent.name}" saved as draft. Submit it for approval when you're ready.`);
            navigate(`/external-agents/${agent.id}`);
          } else {
            refresh();
          }
        }}
      />

      {pauseTarget && (
        <PauseExternalAgentDialog
          name={pauseTarget.name}
          open={!!pauseTarget}
          onOpenChange={v => !v && setPauseTarget(null)}
          onConfirm={() => {
            externalAgentStore.pause(pauseTarget.id);
            toast.info(`"${pauseTarget.name}" is paused. Resume it any time.`);
            setPauseTarget(null);
            refresh();
          }}
        />
      )}

      {publishTarget && (
        <PublishExternalAgentModal
          open={!!publishTarget}
          agentId={publishTarget.id}
          agentName={publishTarget.name}
          currentChannels={publishTarget.channels}
          alreadyApproved={publishTarget.approved}
          onClose={() => setPublishTarget(null)}
          onPublished={refresh}
        />
      )}

      {deleteTarget && (
        <DeleteExternalAgentDialog
          name={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={v => !v && setDeleteTarget(null)}
          onConfirm={() => {
            externalAgentStore.remove(deleteTarget.id);
            toast.success(`"${deleteTarget.name}" has been deleted.`);
            setDeleteTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
