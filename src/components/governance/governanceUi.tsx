// Small shared presentational pieces for the Governance module (Requests list, Request detail,
// Audit Log) — kept separate from governanceStore.ts because that file is logic-only (imported
// by AgentBuilder.tsx too, which doesn't need JSX pulled in).
import { HugeiconsIcon } from "@hugeicons/react";
import { Robot01Icon, BookOpen01Icon, PuzzleIcon, Shield01Icon, Plug01Icon } from "@hugeicons/core-free-icons";
import type { GovResourceType, GovRequestStatus, GovChangeState, ResourceShareStatus } from "./governanceStore";
import { RESOURCE_TYPE_LABEL, STATUS_LABEL } from "./governanceStore";

export const RESOURCE_TYPE_ICON: Record<GovResourceType, any> = {
  agent: Robot01Icon, knowledge: BookOpen01Icon, skill: PuzzleIcon, guardrail: Shield01Icon, connector: Plug01Icon,
};

/** Wraps HugeiconsIcon so call sites keep the plain `{ type, size, className }` shape they had
 * when these were Lucide components — the design system is HugeIcons (Stroke Rounded) only. */
export function ResourceTypeIcon({ type, size = 14, className = "" }: { type: GovResourceType; size?: number; className?: string }) {
  return <HugeiconsIcon icon={RESOURCE_TYPE_ICON[type]} size={size} className={className} />;
}

const STATUS_STYLE: Record<GovRequestStatus, string> = {
  pending: "bg-warning/10 border-warning/25 text-warning",
  approved: "bg-success/10 border-success/20 text-success",
  rejected: "bg-surface-muted border-border text-muted-foreground",
  revoked: "bg-surface-muted border-border text-muted-foreground",
};

const STATUS_DOT: Record<GovRequestStatus, string> = {
  pending: "bg-warning", approved: "bg-success", rejected: "bg-muted-foreground", revoked: "bg-muted-foreground",
};

export function StatusBadge({ status, className = "" }: { status: GovRequestStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border whitespace-nowrap ${STATUS_STYLE[status]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Left-accent for a Request row on the Requests list — only "needs your action now" (pending)
 * gets a colored bar, so the queue reads as a triage list at a glance; resolved statuses
 * (approved/rejected/revoked) stay neutral rather than dimmed, since they're still legitimate
 * rows to open (audit trail), not disabled ones. */
export const STATUS_ROW_ACCENT: Record<GovRequestStatus, string> = {
  pending: "border-l-warning bg-warning/[0.025]",
  approved: "border-l-transparent",
  rejected: "border-l-transparent",
  revoked: "border-l-transparent",
};

/** 1-2 letter initials from a display name, for the small avatar circle next to a requester's
 * name (matches the initials-circle pattern already used for the signed-in user in
 * WorkspaceLayout, so a Request row's "Người gửi" reads as the same product). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Icon + label chip for a resource type inside a table/list row. Text-foreground (not the
 * muted tone the rest of the row's secondary columns use) — a bare "Loại" value competes with
 * plain dark text everywhere else in the row (resource name, requester), so leaving it muted
 * reads as unusually faint rather than intentionally de-emphasized. The bg-surface-muted/border
 * pairing gives the chip its own outline, so it doesn't rely on text weight alone to register on
 * a light background. */
export function ResourceTypePill({ type }: { type: GovResourceType }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-surface-muted border border-border rounded-full px-2.5 py-1 whitespace-nowrap">
      <ResourceTypeIcon type={type} size={12} className="text-muted-foreground" />
      {RESOURCE_TYPE_LABEL[type]}
    </span>
  );
}

/** Simplified to 3 states (no heavy/light split — see governanceStore.ts's module doc comment):
 * every tracked-field change reads the same "Đã sửa — cần duyệt", whatever field it touched. */
const CHANGE_STATE_STYLE: Record<GovChangeState, string> = {
  new: "bg-primary-soft text-primary border-primary/20",
  modified: "bg-warning/10 text-warning border-warning/25",
  unchanged_approved: "bg-surface-muted text-muted-foreground border-border",
};
const CHANGE_STATE_LABEL: Record<GovChangeState, string> = {
  new: "Mới — cần duyệt",
  modified: "Đã sửa — cần duyệt",
  unchanged_approved: "Không đổi từ lần duyệt trước",
};

export function ChangeStateBadge({ state }: { state: GovChangeState }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium rounded-sm px-2 py-0.5 border whitespace-nowrap ${CHANGE_STATE_STYLE[state]}`}>
      {CHANGE_STATE_LABEL[state]}
    </span>
  );
}

/** Sharing status of a resource an Agent references (see governanceStore.resourceShareStatus) —
 * purely informational on the Agent's own request; never a decision control. */
const SHARE_STATUS_STYLE: Record<ResourceShareStatus, string> = {
  shared: "bg-success/10 text-success border-success/20",
  pending_review: "bg-warning/10 text-warning border-warning/25",
  private: "bg-surface-muted text-muted-foreground border-border",
};
const SHARE_STATUS_LABEL: Record<ResourceShareStatus, string> = {
  shared: "Đã dùng chung trong Tenant Library",
  pending_review: "Đang chờ Tenant Admin duyệt dùng chung",
  private: "Riêng tư — chỉ dùng trong Agent này",
};

export function ResourceShareStatusBadge({ status }: { status: ResourceShareStatus }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 border whitespace-nowrap ${SHARE_STATUS_STYLE[status]}`}>
      {SHARE_STATUS_LABEL[status]}
    </span>
  );
}

/** "3 giờ trước" / "2 ngày trước" style relative time — matches the "Cập nhật 2 giờ trước" copy
 * already used across Knowledge/Skills/Guardrails list rows, so Governance reads as the same
 * product rather than a bolted-on module. */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  const mo = Math.floor(day / 30);
  return `${mo} tháng trước`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi} · ${dd}/${mm}/${d.getFullYear()}`;
}
