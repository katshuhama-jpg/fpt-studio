import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, XCircle, Ban, Inbox, RotateCcw, ChevronRight, CheckCheck, EyeOff, Trash2 } from "lucide-react";
import { getAgent } from "@/components/configure/agentStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { governanceStore } from "@/components/governance/governanceStore";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { notificationStore, relativeTimeVi, type AppNotification, type NotificationKind, type Viewer } from "./notificationStore";

/** Live list for the signed-in user; re-renders on any notification change. */
export function useNotifications() {
  const { userId, can } = useMyPermissions();
  const viewer: Viewer = useMemo(() => ({ userId, canReviewAgents: can("requests.review-agents") }), [userId, can]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    governanceStore.list(); // make sure the governance seed (which seeds notifications) has run
    setTick(t => t + 1);
    const on = () => setTick(t => t + 1);
    window.addEventListener(notificationStore.EVT, on);
    return () => window.removeEventListener(notificationStore.EVT, on);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => notificationStore.list(viewer), [viewer, tick]);
  const unread = all.filter(n => !notificationStore.isRead(n, viewer.userId));
  return { viewer, all, unread };
}

type Tone = "info" | "success" | "danger" | "warning";
const TONE: Record<Tone, { icon: string; chip: string }> = {
  info: { icon: "bg-primary-soft text-primary", chip: "bg-primary-soft text-primary" },
  success: { icon: "bg-success/10 text-success", chip: "bg-success/10 text-success" },
  danger: { icon: "bg-destructive/10 text-destructive", chip: "bg-destructive/10 text-destructive" },
  warning: { icon: "bg-warning/15 text-warning", chip: "bg-warning/15 text-warning" },
};
/** Every notification says two things up front: which way it goes (a request coming TO you vs the
 * outcome of a request about an Agent you own / are shared on) and its status — as an icon AND a
 * text chip, so color is never the only signal. */
const KIND_META: Record<NotificationKind, { icon: typeof Bell; tone: Tone; chip: string }> = {
  request_submitted: { icon: Inbox, tone: "info", chip: "Cần bạn duyệt" },
  request_approved: { icon: CheckCircle2, tone: "success", chip: "Đã duyệt" },
  channel_approved: { icon: CheckCircle2, tone: "success", chip: "Đã duyệt" },
  request_rejected: { icon: XCircle, tone: "danger", chip: "Bị từ chối" },
  channel_rejected: { icon: XCircle, tone: "danger", chip: "Bị từ chối" },
  request_revoked: { icon: Ban, tone: "danger", chip: "Đã thu hồi" },
  channel_revoked: { icon: Ban, tone: "danger", chip: "Đã tắt kênh" },
  regovern_required: { icon: RotateCcw, tone: "warning", chip: "Cần duyệt lại" },
  resource_unshared: { icon: EyeOff, tone: "warning", chip: "Đã tắt chia sẻ" },
  resource_deleted: { icon: Trash2, tone: "danger", chip: "Đã xóa khỏi Space" },
};

/** "Agent của bạn" / "Agent được chia sẻ với bạn" for outcomes; nothing extra for incoming. */
const RESOLVED: Record<string, string> = {
  approved: "Đã được duyệt", rejected: "Đã bị từ chối", withdrawn: "Người gửi đã rút", revoked: "Đã thu hồi",
};
/** An incoming request that someone already decided (or the sender withdrew) is no longer
 * actionable — say so instead of still asking "Cần bạn duyệt". */
function resolvedLabel(n: AppNotification): string | null {
  if (n.kind !== "request_submitted" || !n.requestId) return null;
  const st = governanceStore.get(n.requestId)?.status;
  return st && st !== "pending" ? RESOLVED[st] ?? null : null;
}

function contextLabel(n: AppNotification, userId: string): string | null {
  if (n.kind === "request_submitted") return resolvedLabel(n);
  if (n.kind === "resource_unshared" || n.kind === "resource_deleted") return "Tài nguyên của bạn";
  if (!n.resourceId) return null;
  if (n.resourceId.startsWith("ext-")) return "Agent của bạn";
  const a = getAgent(n.resourceId) as { ownerId?: string; sharedWith?: string[] } | undefined;
  if (a?.ownerId === userId) return "Agent của bạn";
  if (a?.sharedWith?.includes(userId)) return "Agent được chia sẻ với bạn";
  return "Yêu cầu bạn đã gửi";
}

export function NotificationItem({ n, viewer, onOpen, compact }: { n: AppNotification; viewer: Viewer; onOpen?: () => void; compact?: boolean }) {
  const navigate = useNavigate();
  const read = notificationStore.isRead(n, viewer.userId);
  const meta = KIND_META[n.kind];
  const tone = TONE[meta.tone];
  const Icon = meta.icon;
  const ctx = contextLabel(n, viewer.userId);
  const resolved = !!resolvedLabel(n);
  return (
    <button
      type="button"
      aria-label={`${meta.chip}${resolved ? ` (${ctx})` : ""}. ${n.title}. ${relativeTimeVi(n.at)}${read ? "" : ". Chưa đọc"}`}
      onClick={() => { notificationStore.markRead(n.id, viewer.userId); onOpen?.(); navigate(n.href); }}
      className={`group w-full text-left flex items-start gap-3 cursor-pointer ${compact ? "px-4 py-3" : "px-5 py-3.5"} transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40`}
    >
      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${resolved ? "bg-surface-muted text-muted-foreground" : tone.icon}`} aria-hidden>
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={`px-1.5 py-px rounded font-medium ${resolved ? "bg-surface-muted text-muted-foreground" : tone.chip}`}>{meta.chip}</span>
          {ctx && <span className="truncate">{ctx}</span>}
          <span aria-hidden>·</span>
          <span className="shrink-0">{relativeTimeVi(n.at)}</span>
        </span>
        <span className={`block mt-1 text-sm leading-snug line-clamp-2 ${read ? "text-muted-foreground" : "text-foreground"}`}>
          {(n.segments ?? [[n.title]]).map(([t, b], i) => b ? <strong key={i} className={`font-semibold ${read ? "text-foreground/80" : "text-foreground"}`}>{t}</strong> : <span key={i}>{t}</span>)}
        </span>
      </span>
      <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${read ? "bg-transparent" : "bg-primary"}`} aria-hidden />
    </button>
  );
}

/** Sidebar-footer bell → popover with unread notifications (production pattern). */
export function NotificationBell({ collapsed }: { collapsed?: boolean }) {
  const { viewer, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const shown = unread.slice(0, 5);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread.length ? `Thông báo, ${unread.length} chưa đọc` : "Thông báo"}
          className={`relative h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-base shrink-0 ${open ? "bg-surface-muted text-foreground" : ""}`}
        >
          <Bell size={16} />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold leading-4 text-center tabular-nums">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side={collapsed ? "right" : "right"} align="end" sideOffset={12} className="w-[380px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Thông báo</p>
          {unread.length > 0 && (
            <button onClick={() => notificationStore.markAllRead(viewer)} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              <CheckCheck size={13} /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
        {shown.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Bell size={20} className="mx-auto text-muted-foreground" />
            <p className="text-sm text-foreground mt-2">Không có thông báo mới.</p>
            <p className="text-xs text-muted-foreground mt-1">Thông báo đã đọc nằm ở trang thông báo.</p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {shown.map(n => <NotificationItem key={n.id} n={n} viewer={viewer} onOpen={() => setOpen(false)} compact />)}
          </div>
        )}
        <div className="p-2 border-t border-border">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="w-full h-9 rounded-md bg-primary-soft text-primary text-sm font-medium flex items-center justify-center gap-1 hover:bg-primary-soft/70 transition-base"
          >
            Xem tất cả thông báo{unread.length > shown.length ? ` (${unread.length})` : ""} <ChevronRight size={14} />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
