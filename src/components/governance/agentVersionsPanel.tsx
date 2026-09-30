// "Phiên bản" — Build tab section (left sidebar, under Triggers) where the Builder sees every
// version of this Agent by status in one place: what is live now, what is waiting for review,
// what was rejected (and why), withdrawn, revoked, and the older versions that were live before.
// Actions follow the status: withdraw a pending request, fix & resend a rejected one, and roll
// back to an older version. A rollback is immediate — no new review — because it only ever
// restores a version exactly as it was approved/live before (same Workspace scope, same
// external channels, taken from agentPublishStore's release log). Anything that isn't in that
// log was never live, so it can't be "restored" and has to go through Publish like any change.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AgentDeploymentSection } from "./agentDeployment";
import { AgentContentSection, ExternalAgentContentSection } from "./resourceContent";
import { ExternalLink, Undo2, RotateCcw, Send, Pencil, ChevronRight, Clock, CheckCircle2, Circle, XCircle, Info } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { agentPublishStore, type ReleaseEntry, type PublishAudience } from "../configure/agentPublishStore";
import { governanceStore, requestKind, channelLabel, requestDiff, isExternalAgentId, type GovRequest } from "./governanceStore";
import { externalAgentStore } from "../external-agents/externalAgentStore";
import { auditLogStore } from "./auditLogStore";
import { formatDateTime } from "./governanceUi";
import { getAgent } from "../configure/agentStore";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";

export type VersionStatus = "draft" | "live" | "pending" | "rejected" | "withdrawn" | "revoked" | "previous";

export const VERSION_STATUS_LABEL: Record<VersionStatus, string> = {
  draft: "Nháp",
  live: "Đang live",
  pending: "Chờ duyệt",
  rejected: "Bị từ chối",
  withdrawn: "Đã rút",
  revoked: "Đã thu hồi",
  previous: "Bản cũ",
};

const STATUS_STYLE: Record<VersionStatus, { pill: string; dot: string }> = {
  draft: { pill: "bg-surface-muted border-border text-muted-foreground", dot: "bg-muted-foreground" },
  live: { pill: "bg-success/10 border-success/20 text-success", dot: "bg-success" },
  pending: { pill: "bg-warning/10 border-warning/25 text-warning", dot: "bg-warning" },
  rejected: { pill: "bg-destructive/10 border-destructive/20 text-destructive", dot: "bg-destructive" },
  withdrawn: { pill: "bg-surface-muted border-border text-muted-foreground", dot: "bg-muted-foreground" },
  revoked: { pill: "bg-surface-muted border-border text-muted-foreground", dot: "bg-muted-foreground" },
  previous: { pill: "bg-sky-50 border-sky-200 text-sky-800", dot: "bg-sky-500" },
};

const AUDIENCE_SHORT: Record<PublishAudience, string> = {
  me: "Chỉ mình tôi",
  quick_share: "Chia sẻ nhanh",
  group: "Nhóm cộng tác",
  org: "Công ty / phòng ban",
  community: "Cộng đồng FPT AI Agent",
};

export interface VersionRow {
  version: string;
  status: VersionStatus;
  at: number;
  scope?: string;
  channels?: string[];
  request?: GovRequest;
  release?: ReleaseEntry;
  /** Who did the last thing to this version, in words ("Linh Phan gửi", "Tran Nam duyệt"). */
  byline?: string;
  reason?: string;
}

const verNum = (v: string) => v.replace(/^v/, "").split(".").map(n => Number(n) || 0);
const cmpVer = (a: string, b: string) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; };

/** Every version of an Agent with its current status, newest version first. */
export function agentVersionRows(agentId: string): VersionRow[] {
  const pub = agentPublishStore.get(agentId);
  const live = pub.placement !== null ? pub.version : undefined;
  const releases = agentPublishStore.releases(agentId);
  const requests = governanceStore.listForResource("agent", agentId).filter(r => requestKind(r) === "publish" && r.version);
  const rows = new Map<string, VersionRow>();

  // Requests first (oldest → newest so the latest request for a version wins).
  for (const r of [...requests].sort((a, b) => a.submittedAt - b.submittedAt)) {
    const v = r.version!;
    const status: VersionStatus =
      r.status === "pending" ? "pending"
      : r.status === "rejected" ? "rejected"
      : r.status === "withdrawn" ? "withdrawn"
      : r.status === "revoked" ? "revoked"
      : v === live ? "live" : "previous";
    const decided = r.history.filter(h => h.action !== "submitted").slice(-1)[0];
    rows.set(v, {
      version: v, status, at: r.updatedAt, request: r,
      scope: r.scopeSummary ?? (r.audience === "community" ? "Cộng đồng FPT AI Agent" : undefined),
      channels: r.channels,
      byline: decided ? `${decided.actorName} ${decided.action === "approved" ? "duyệt" : decided.action === "rejected" ? "từ chối" : decided.action === "revoked" ? "thu hồi" : "rút"}` : `${r.requesterName} gửi`,
      reason: r.status === "rejected" ? r.reviewNote : r.status === "revoked" ? r.revokeReason : r.status === "withdrawn" ? r.history.find(h => h.action === "withdrawn")?.note : undefined,
    });
  }
  // Versions that went live directly (Chỉ mình tôi / Chia sẻ nhanh / small group) or were
  // restored by rollback, plus seeded history.
  for (const rel of releases) {
    const existing = rows.get(rel.version);
    const status: VersionStatus = rel.version === live ? "live" : "previous";
    if (existing && existing.status !== "previous" && existing.status !== "live") {
      // e.g. a later request for the same version was withdrawn — the version itself was live once.
      if (existing.status === "revoked") continue;
    }
    rows.set(rel.version, {
      ...(existing ?? {}),
      version: rel.version, status: existing?.status === "revoked" ? "revoked" : status,
      at: Math.max(existing?.at ?? 0, rel.at), release: rel,
      scope: rel.scopeSummary ?? (rel.audience ? AUDIENCE_SHORT[rel.audience] : existing?.scope),
      channels: rel.channels,
      byline: rel.via === "rollback" ? `${rel.byName ?? "Builder"} khôi phục` : existing?.byline ?? (rel.via === "direct" ? `${rel.byName ?? "Builder"} publish trực tiếp` : undefined),
    } as VersionRow);
  }
  // The live version is always marked live, even if nothing above recorded it.
  if (live && !rows.has(live)) rows.set(live, { version: live, status: "live", at: Date.now(), scope: pub.scopeSummary, channels: pub.channels });
  if (live && rows.get(live)!.status !== "live" && rows.get(live)!.status !== "pending") rows.get(live)!.status = "live";
  return [...rows.values()].sort((a, b) => cmpVer(a.version, b.version));
}

const FILTERS: (VersionStatus | "all")[] = ["all", "live", "pending", "rejected", "withdrawn", "revoked", "previous"];

export function AgentVersionsPanel({ agentId, agentName, onPublish, onChanged }: {
  agentId: string;
  /** Display name — required for External Agents (not in the internal Agent store). */
  agentName?: string;
  onPublish: () => void;
  onChanged: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<VersionStatus | "all">("all");
  const [rollback, setRollback] = useState<VersionRow | null>(null);
  const pendingForRollback = rollback ? governanceStore.getOpenRequestForResource("agent", agentId) : undefined;
  const [withdrawRow, setWithdrawRow] = useState<VersionRow | null>(null);
  // The version whose detail sheet is open — kept in the URL (?v=v1.2.0) so the status chips in
  // the top bar and the rejection banner can deep-link straight to a version's detail.
  const [params, setParams] = useSearchParams();
  const openV = params.get("v");
  const setOpenV = (v: string | null) => { const n = new URLSearchParams(params); if (v) n.set("v", v); else n.delete("v"); setParams(n, { replace: true }); };
  void tick;
  const rows = agentVersionRows(agentId);
  const pub = agentPublishStore.get(agentId);
  const liveRow = rows.find(r => r.status === "live");
  const latestPublishReq = governanceStore.latestForResource("agent", agentId);
  const counts = FILTERS.reduce((m, f) => ({ ...m, [f]: f === "all" ? rows.length : rows.filter(r => r.status === f).length }), {} as Record<string, number>);
  const shown = filter === "all" ? rows : rows.filter(r => r.status === filter);
  const refresh = () => { setTick(t => t + 1); onChanged(); };

  const doRollback = () => {
    const rel = rollback?.release;
    if (!rollback || !rel) return;
    // Same rule as a direct publish (R3): a pending version request would roll this back again
    // once approved, so restoring withdraws it first (the dialog warned about it).
    const pendingReq = governanceStore.getOpenRequestForResource("agent", agentId);
    if (pendingReq) governanceStore.withdraw(pendingReq.id, CURRENT_USER.id, CURRENT_USER.name, `Tự rút vì ${CURRENT_USER.name} khôi phục ${rel.version}.`);
    agentPublishStore.publish(agentId, "workspace", rel.channels, rel.version, rel.audience, { scopeSummary: rel.scopeSummary, groupId: rel.groupId, groupMemberIds: rel.groupMemberIds, via: "rollback", byName: CURRENT_USER.name });
    auditLogStore.log({
      actorId: CURRENT_USER.id, actorName: CURRENT_USER.name, action: "rolled_back",
      resourceType: "agent", resourceId: agentId, resourceName: agentName ?? getAgent(agentId).name,
      note: `Khôi phục ${rel.version} (thay cho ${liveRow?.version ?? "bản đang live"})`, at: Date.now(),
    });
    if (isExternalAgentId(agentId)) externalAgentStore.applyGovernance(agentId, { status: "published", version: rel.version, channels: rel.channels }, `Khôi phục ${rel.version}`);
    toast.success(`Đã khôi phục ${rel.version}. Người dùng đang dùng lại bản này.`);
    setRollback(null);
    refresh();
  };
  const doWithdraw = () => {
    if (!withdrawRow?.request) return;
    governanceStore.withdraw(withdrawRow.request.id, CURRENT_USER.id, CURRENT_USER.name, "Người gửi đã rút yêu cầu.");
    toast.success(`Đã rút yêu cầu ${withdrawRow.version}.`);
    setWithdrawRow(null);
    refresh();
  };

  return (
    <div className="p-8 w-full space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-xl font-semibold">Phiên bản</h2>
        <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
          Mọi phiên bản của Agent theo trạng thái. Người dùng đang dùng {liveRow ? <b className="text-foreground font-mono">{liveRow.version}</b> : "— (chưa publish)"}. Bấm vào một phiên bản để xem chi tiết.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Lọc theo trạng thái">
        {FILTERS.map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`h-8 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-base ${filter === f ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
          >
            {f === "all" ? "Tất cả" : VERSION_STATUS_LABEL[f]}
            <span className="text-xs tabular-nums rounded px-1.5 bg-surface-muted text-muted-foreground">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {/* Draft — always first: the working copy that hasn't been sent anywhere yet. */}
        {filter === "all" && (
          <div className="px-4 py-3.5 flex items-center gap-4">
            <div className="w-24 shrink-0"><StatusPill status="draft" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Bản nháp</p>
              <p className="text-xs text-muted-foreground mt-0.5">Những gì bạn đang chỉnh ở Build. Chưa ai dùng bản này cho tới khi bạn Publish.</p>
            </div>
            <button onClick={onPublish} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 shrink-0">
              <Send size={13} /> Publish
            </button>
          </div>
        )}
        {shown.length === 0 && (
          <p className="px-4 py-8 text-sm text-muted-foreground text-center">Chưa có phiên bản nào ở trạng thái này.</p>
        )}
        {shown.map(r => {
          const isLatestRejected = r.status === "rejected" && latestPublishReq?.id === r.request?.id;
          const canWithdraw = r.status === "pending" && r.request?.requesterId === CURRENT_USER.id;
          const canRollback = r.status === "previous" && !!r.release;
          return (
            <div
              key={r.version}
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết ${r.version}`}
              onClick={() => setOpenV(r.version)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenV(r.version); } }}
              className="px-4 py-3.5 flex items-start gap-4 cursor-pointer hover:bg-surface-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
            >
              <div className="w-24 shrink-0 pt-0.5"><StatusPill status={r.status} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-sm font-semibold font-mono">{r.version}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(r.at)}{r.byline ? ` · ${r.byline}` : ""}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.scope ? <>Workspace: <span className="text-foreground">{r.scope}</span></> : "Workspace: —"}
                  {" · "}Kênh ngoài: <span className="text-foreground">{r.channels && r.channels.length ? r.channels.map(channelLabel).join(", ") : "Không"}</span>
                </p>
                {r.reason && (
                  <p className={`text-xs mt-1.5 leading-relaxed ${r.status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}>
                    {r.status === "rejected" ? "Lý do từ chối: " : r.status === "revoked" ? "Lý do thu hồi: " : ""}“{r.reason}”
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                {canWithdraw && (
                  <button onClick={() => setWithdrawRow(r)} className="h-8 px-3 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-xs font-medium flex items-center gap-1.5">
                    <Undo2 size={13} /> Rút yêu cầu
                  </button>
                )}
                {isLatestRejected && (
                  <button onClick={onPublish} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5">
                    <Pencil size={13} /> Sửa &amp; gửi lại
                  </button>
                )}
                {canRollback && (
                  <button onClick={() => setRollback(r)} className="h-8 px-3 rounded-lg border border-border bg-white hover:bg-surface-muted text-xs font-medium flex items-center gap-1.5">
                    <RotateCcw size={13} /> Khôi phục
                  </button>
                )}
                <button onClick={() => setOpenV(r.version)} aria-label={`Xem chi tiết ${r.version}`} className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-surface-muted flex items-center justify-center">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <VersionDetailSheet
        row={rows.find(r => r.version === openV) ?? null}
        liveVersion={liveRow?.version}
        onClose={() => setOpenV(null)}
        onPublish={() => { setOpenV(null); onPublish(); }}
        onRollback={r => setRollback(r)}
        onWithdraw={r => setWithdrawRow(r)}
        isLatestRejected={r => r.status === "rejected" && latestPublishReq?.id === r.request?.id}
      />

      <AlertDialog open={!!rollback} onOpenChange={o => !o && setRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục {rollback?.version}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Người dùng sẽ dùng lại {rollback?.version} ngay, thay cho {pub.placement !== null ? pub.version : "trạng thái hiện tại"}.
                  Bản này đã từng được duyệt nên không cần gửi duyệt lại.
                </p>
                <p>
                  Phạm vi và kênh cũng quay về như lúc {rollback?.version} đang live — Workspace: <b className="text-foreground">{rollback?.scope ?? "—"}</b>;
                  Kênh ngoài: <b className="text-foreground">{rollback?.channels?.length ? rollback.channels.map(channelLabel).join(", ") : "Không"}</b>.
                </p>
                {pendingForRollback && (
                  <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-foreground">
                    Yêu cầu <b>{pendingForRollback.version}</b> đang chờ duyệt sẽ được rút — nếu không, khi được duyệt nó sẽ thay bản bạn vừa khôi phục.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={doRollback}>Khôi phục {rollback?.version}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!withdrawRow} onOpenChange={o => !o && setWithdrawRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rút yêu cầu {withdrawRow?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              Admin sẽ không còn thấy yêu cầu này để duyệt. Agent giữ nguyên trạng thái hiện tại — bạn có thể gửi lại bất cứ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ yêu cầu</AlertDialogCancel>
            <AlertDialogAction onClick={doWithdraw} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Rút yêu cầu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusPill({ status }: { status: VersionStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border whitespace-nowrap ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{VERSION_STATUS_LABEL[status]}
    </span>
  );
}

/** Full detail of one version — the Builder's equivalent of opening a version in App Store
 * Connect: what exactly is (or was) in it, where it goes, and what happened to it. Reads the
 * request's frozen snapshot, so a rejected or pending version shows what was actually sent. */
function VersionDetailSheet({ row, liveVersion, onClose, onPublish, onRollback, onWithdraw, isLatestRejected }: {
  row: VersionRow | null;
  liveVersion?: string;
  onClose: () => void;
  onPublish: () => void;
  onRollback: (r: VersionRow) => void;
  onWithdraw: (r: VersionRow) => void;
  isLatestRejected: (r: VersionRow) => boolean;
}) {
  const req = row?.request;
  const diff = req ? requestDiff(req) : [];
  const decided = req?.history.filter(h => h.action !== "submitted").slice(-1)[0];
  return (
    <Sheet open={!!row} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {row && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border text-left space-y-2">
              <div className="flex items-center gap-2">
                <SheetTitle className="font-mono text-lg">{row.version}</SheetTitle>
                <StatusPill status={row.status} />
              </div>
              <SheetDescription className="text-xs">
                {row.status === "live" && "Người dùng đang dùng phiên bản này."}
                {row.status === "pending" && <>Đang chờ Org/Unit Admin duyệt.{liveVersion ? <> Người dùng vẫn dùng <span className="font-mono">{liveVersion}</span> cho tới khi bản này được duyệt.</> : ""}</>}
                {row.status === "rejected" && "Chưa được duyệt — sửa theo góp ý bên dưới rồi gửi lại."}
                {row.status === "withdrawn" && "Yêu cầu đã được rút, bản này chưa từng tới người dùng."}
                {row.status === "revoked" && "Đã bị thu hồi — người dùng không còn dùng bản này."}
                {row.status === "previous" && "Bản cũ, từng được người dùng sử dụng. Có thể khôi phục ngay mà không cần duyệt lại."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Timeline */}
              {req && (
                <ol className="space-y-2.5" aria-label="Lịch sử">
                  {req.history.map(h => (
                    <li key={h.id} className="flex items-start gap-2.5 text-sm">
                      <span className={`mt-0.5 ${h.action === "approved" ? "text-success" : h.action === "rejected" ? "text-destructive" : h.action === "submitted" ? "text-primary" : "text-muted-foreground"}`}>
                        {h.action === "approved" ? <CheckCircle2 size={15} /> : h.action === "rejected" ? <XCircle size={15} /> : h.action === "submitted" ? <Send size={14} /> : <Circle size={14} />}
                      </span>
                      <div className="min-w-0">
                        <p><span className="font-medium">{h.actorName}</span> {h.action === "submitted" ? "đã gửi yêu cầu duyệt" : h.action === "approved" ? "đã duyệt" : h.action === "rejected" ? "đã từ chối" : h.action === "revoked" ? "đã thu hồi" : "đã rút yêu cầu"}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(h.at)}</p>
                        {h.note && <p className={`text-sm mt-1.5 rounded-lg px-3 py-2 leading-relaxed ${h.action === "rejected" ? "bg-destructive/5 border border-destructive/20" : "bg-surface-muted"}`}>“{h.note}”</p>}
                      </div>
                    </li>
                  ))}
                  {row.status === "pending" && (
                    <li className="flex items-start gap-2.5 text-sm text-warning"><Clock size={15} className="mt-0.5" /> Đang chờ Admin duyệt</li>
                  )}
                </ol>
              )}
              {!req && row.release && (
                <p className="text-sm text-muted-foreground flex items-start gap-2"><Info size={15} className="mt-0.5 shrink-0" />
                  {row.release.via === "rollback" ? `Được khôi phục lúc ${formatDateTime(row.release.at)}.` : `Publish trực tiếp lúc ${formatDateTime(row.release.at)} — phạm vi này không cần duyệt.`}
                </p>
              )}

              {req?.note && (
                <div>
                  <p className="text-sm font-semibold mb-1.5">Ghi chú phát hành</p>
                  <p className="text-sm text-muted-foreground rounded-lg border border-border px-3.5 py-3 leading-relaxed">{req.note}</p>
                </div>
              )}

              {diff.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-1.5">Thay đổi so với bản đã duyệt trước</p>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {diff.map(d => (
                      <div key={d.key} className="px-3.5 py-2.5 text-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{d.label}</p>
                        {d.before && <p className="text-muted-foreground line-through line-clamp-2">{d.before}</p>}
                        <p className="line-clamp-3">{d.after}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {req ? (
                <>
                  <AgentDeploymentSection req={req} />
                  {req.externalSnap ? <ExternalAgentContentSection req={req} /> : <AgentContentSection req={req} />}
                </>
              ) : (
                <div className="rounded-lg border border-border px-3.5 py-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Workspace:</span> {row.scope ?? "—"}</p>
                  <p><span className="text-muted-foreground">Kênh ngoài:</span> {row.channels?.length ? row.channels.map(channelLabel).join(", ") : "Không"}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-surface-muted/40 flex items-center justify-between gap-2">
              {req ? (
                <Link to={`/governance/requests/${req.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  Mở trang yêu cầu <ExternalLink size={11} />
                </Link>
              ) : <span />}
              <div className="flex items-center gap-2">
                {row.status === "pending" && req?.requesterId === CURRENT_USER.id && (
                  <button onClick={() => onWithdraw(row)} className="h-9 px-3.5 rounded-lg border border-destructive/30 text-destructive bg-white hover:bg-destructive/5 text-sm font-medium flex items-center gap-1.5"><Undo2 size={14} /> Rút yêu cầu</button>
                )}
                {isLatestRejected(row) && (
                  <button onClick={onPublish} className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium flex items-center gap-1.5"><Pencil size={14} /> Sửa &amp; gửi lại</button>
                )}
                {row.status === "previous" && row.release && (
                  <button onClick={() => onRollback(row)} className="h-9 px-3.5 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5"><RotateCcw size={14} /> Khôi phục</button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
