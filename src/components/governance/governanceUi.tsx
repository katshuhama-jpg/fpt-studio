// Small shared presentational pieces for the Governance module (Requests list, Request detail,
// Audit Log) — kept separate from governanceStore.ts because that file is logic-only (imported
// by AgentBuilder.tsx too, which doesn't need JSX pulled in).
import { Bot, BookOpen, Puzzle, Shield, Plug } from "lucide-react";
import type { GovResourceType, GovRequestStatus, GovChangeState } from "./governanceStore";
import { RESOURCE_TYPE_LABEL, STATUS_LABEL } from "./governanceStore";

export const RESOURCE_TYPE_ICON: Record<GovResourceType, any> = {
  agent: Bot, knowledge: BookOpen, skill: Puzzle, guardrail: Shield, connector: Plug,
};

export function ResourceTypeIcon({ type, size = 14, className = "" }: { type: GovResourceType; size?: number; className?: string }) {
  const Icon = RESOURCE_TYPE_ICON[type];
  return <Icon size={size} className={className} />;
}

const STATUS_STYLE: Record<GovRequestStatus, string> = {
  pending: "bg-warning/10 border-warning/25 text-warning",
  needs_changes: "bg-destructive/10 border-destructive/20 text-destructive",
  approved: "bg-success/10 border-success/20 text-success",
  rejected: "bg-surface-muted border-border text-muted-foreground",
  revoked: "bg-surface-muted border-border text-muted-foreground",
};

const STATUS_DOT: Record<GovRequestStatus, string> = {
  pending: "bg-warning", needs_changes: "bg-destructive", approved: "bg-success", rejected: "bg-muted-foreground", revoked: "bg-muted-foreground",
};

export function StatusBadge({ status, className = "" }: { status: GovRequestStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border whitespace-nowrap ${STATUS_STYLE[status]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Left-accent for a Request row on the Requests list — only "needs your action now" statuses
 * (pending / needs_changes) get a colored bar, so the queue reads as a triage list at a glance;
 * resolved statuses (approved/rejected) stay neutral rather than dimmed, since they're still
 * legitimate rows to open (audit trail), not disabled ones. */
export const STATUS_ROW_ACCENT: Record<GovRequestStatus, string> = {
  pending: "border-l-warning bg-warning/[0.025]",
  needs_changes: "border-l-destructive bg-destructive/[0.025]",
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

const CHANGE_STATE_STYLE: Record<GovChangeState, string> = {
  new: "bg-primary-soft text-primary border-primary/20",
  modified_major: "bg-warning/10 text-warning border-warning/25",
  modified_minor: "bg-surface-muted text-foreground/70 border-border",
  unchanged_approved: "bg-surface-muted text-muted-foreground border-border",
};
const CHANGE_STATE_LABEL: Record<GovChangeState, string> = {
  new: "Mới — cần duyệt",
  modified_major: "Đã sửa — cần duyệt",
  modified_minor: "Sửa nhẹ",
  unchanged_approved: "Đã duyệt trước đó",
};

export function ChangeStateBadge({ state }: { state: GovChangeState }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold rounded-full px-2 py-0.5 border whitespace-nowrap ${CHANGE_STATE_STYLE[state]}`}>
      {CHANGE_STATE_LABEL[state]}
    </span>
  );
}

/** Left-accent + tint for a bundled sub-resource row on the Request Detail page — makes items that
 * still need review pop (colored border, full-opacity) while already-approved items visually recede
 * (neutral border, dimmed via the caller's opacity-70), so a reviewer's eye lands on what changed. */
export const CHANGE_STATE_ACCENT: Record<GovChangeState, string> = {
  new: "border-border border-l-primary bg-primary-soft/30",
  modified_major: "border-border border-l-warning bg-warning/5",
  modified_minor: "border-border border-l-border bg-surface",
  unchanged_approved: "border-border border-l-border bg-surface",
};

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
