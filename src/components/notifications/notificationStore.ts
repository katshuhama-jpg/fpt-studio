import { loadMap, saveMap } from "@/lib/sessionPersist";

/**
 * In-app notifications (bell in the sidebar footer → popover → /notifications page), mirroring
 * production console-agents.fpt.ai. Scope in this prototype: the Agent publish-approval flow.
 *
 * Who is notified:
 *  - A request is sent → everyone whose Role holds `requests.review-agents` (token REVIEWERS).
 *  - An Admin decides (approve / reject / revoke), incl. channel requests, or the system pulls a
 *    Nhóm cộng tác publish back for re-review → the Agent's owner + everyone it is shared with
 *    (+ the requester, if someone else).
 *  - Never the person who performed the action.
 * No email/Teams: notifications live in the app only.
 */

export const REVIEWERS = "role:requests.review-agents";

export type NotificationKind =
  | "request_submitted"
  | "request_approved"
  | "request_rejected"
  | "request_revoked"
  | "channel_approved"
  | "channel_rejected"
  | "channel_revoked"
  | "regovern_required"
  /** A Space Admin turned sharing off on / deleted someone's Space resource (to the owner). */
  | "resource_unshared"
  | "resource_deleted"
  /** …or took it off the Space back into the Agent it came from ("Gỡ khỏi Space"). */
  | "resource_removed"
  /** Someone gave you access to an Agent in the Console ("… đã cấp quyền <Mức> cho bạn …"). */
  | "agent_shared"
  /** Your own level on an Agent was raised on the Cấp quyền main screen. */
  | "agent_access_changed"
  /** A Space Admin / Unit Admin took a live Nhân sự số down, with a reason (to owner + collaborators). */
  | "agent_admin_unpublished";

export interface AppNotification {
  id: string;
  at: number;
  kind: NotificationKind;
  /** Member ids and/or the REVIEWERS token. */
  recipients: string[];
  actorId: string;
  actorName: string;
  /** Plain text (aria / fallback). */
  title: string;
  /** Same sentence split so names render bold: [text, bold?][]. */
  segments?: [string, boolean?][];
  /** Extra line under the sentence - e.g. the Admin's reason. */
  note?: string;
  href: string;
  resourceId?: string;
  resourceIcon?: string;
  requestId?: string;
  readBy: string[];
}

const KEY = "app_notifications_v2";
const EVT = "app-notifications-changed";
let store = loadMap<string, AppNotification>(KEY);
let seq = store.size + 1;
const persist = () => {
  saveMap(KEY, store);
  try { window.dispatchEvent(new Event(EVT)); } catch { /* ssr */ }
};

/** `canReviewRequest` narrows the REVIEWERS token to requests in this viewer's review scope —
 * Space Admin: every Agent request; Unit Admin: only those to their unit or below. */
export interface Viewer { userId: string; canReviewAgents: boolean; canReviewRequest?: (requestId: string) => boolean }

const visibleTo = (n: AppNotification, v: Viewer) =>
  n.actorId !== v.userId &&
  (n.recipients.includes(v.userId) || (n.recipients.includes(REVIEWERS) &&
    (n.requestId && v.canReviewRequest ? v.canReviewRequest(n.requestId) : v.canReviewAgents)));

export const notificationStore = {
  EVT,
  push(n: Omit<AppNotification, "id" | "readBy" | "at"> & { at?: number; readBy?: string[] }) {
    const recipients = [...new Set(n.recipients)].filter(r => r !== n.actorId);
    if (!recipients.length) return;
    const id = `ntf-${Date.now().toString(36)}-${seq++}`;
    store.set(id, { ...n, recipients, id, at: n.at ?? Date.now(), readBy: n.readBy ?? [] });
    persist();
  },
  list(v: Viewer): AppNotification[] {
    return [...store.values()].filter(n => visibleTo(n, v)).sort((a, b) => b.at - a.at);
  },
  unread(v: Viewer): AppNotification[] {
    return this.list(v).filter(n => !n.readBy.includes(v.userId));
  },
  isRead(n: AppNotification, userId: string) {
    return n.readBy.includes(userId);
  },
  markRead(id: string, userId: string) {
    const n = store.get(id);
    if (!n || n.readBy.includes(userId)) return;
    n.readBy.push(userId);
    persist();
  },
  markAllRead(v: Viewer) {
    this.list(v).forEach(n => { if (!n.readBy.includes(v.userId)) n.readBy.push(v.userId); });
    persist();
  },
  /** Seeds replace everything (called from the governance seed so both stay in sync). */
  reset(items: AppNotification[]) {
    store = new Map(items.map(i => [i.id, i]));
    persist();
  },
};

export function relativeTimeVi(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "Vừa xong";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(at).toLocaleDateString("vi-VN");
}
