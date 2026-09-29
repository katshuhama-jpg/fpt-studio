import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, XCircle, Undo2, Send, AlertTriangle, ChevronRight, CheckCheck } from "lucide-react";
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

const KIND_META: Record<NotificationKind, { icon: typeof Bell; cls: string }> = {
  request_submitted: { icon: Send, cls: "bg-primary text-primary-foreground" },
  request_approved: { icon: CheckCircle2, cls: "bg-success text-white" },
  channel_approved: { icon: CheckCircle2, cls: "bg-success text-white" },
  request_rejected: { icon: XCircle, cls: "bg-destructive text-white" },
  channel_rejected: { icon: XCircle, cls: "bg-destructive text-white" },
  request_revoked: { icon: Undo2, cls: "bg-destructive text-white" },
  channel_revoked: { icon: Undo2, cls: "bg-destructive text-white" },
  regovern_required: { icon: AlertTriangle, cls: "bg-warning text-white" },
};

export function NotificationItem({ n, viewer, onOpen, compact }: { n: AppNotification; viewer: Viewer; onOpen?: () => void; compact?: boolean }) {
  const navigate = useNavigate();
  const read = notificationStore.isRead(n, viewer.userId);
  const meta = KIND_META[n.kind];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => { notificationStore.markRead(n.id, viewer.userId); onOpen?.(); navigate(n.href); }}
      className={`w-full text-left flex items-start gap-3 ${compact ? "px-4 py-3" : "px-5 py-4"} hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:bg-surface-muted ${read ? "" : "bg-primary-soft/40"}`}
    >
      <span className="relative shrink-0">
        <span className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-base" aria-hidden>
          {n.resourceIcon ?? "🤖"}
        </span>
        <span className={`absolute -right-1 -bottom-1 w-4 h-4 rounded-full ring-2 ring-surface flex items-center justify-center ${meta.cls}`} aria-hidden>
          <Icon size={10} strokeWidth={2.5} />
        </span>
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm leading-snug ${read ? "text-foreground" : "font-semibold text-foreground"}`}>{n.title}</span>
        {n.body && <span className={`block text-xs text-muted-foreground mt-0.5 ${compact ? "line-clamp-2" : ""}`}>{n.body}</span>}
        <span className="block text-[11px] text-muted-foreground mt-1">{relativeTimeVi(n.at)}</span>
      </span>
      {!read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" aria-label="Chưa đọc" />}
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
