import type { ExternalAgentStatus } from "./externalAgentStore";

const GREY_BADGE = "bg-surface-muted text-muted-foreground border-border";

export const STATUS_META: Record<ExternalAgentStatus, { label: string; badgeClass: string; dotClass: string }> = {
  draft: { label: "Draft", badgeClass: GREY_BADGE, dotClass: "bg-muted-foreground" },
  pending_approval: { label: "Pending Approval", badgeClass: "chip-warning", dotClass: "bg-warning" },
  rejected: { label: "Rejected", badgeClass: "chip-danger", dotClass: "bg-destructive" },
  published: { label: "Published", badgeClass: "chip-success", dotClass: "bg-success" },
  paused: { label: "Paused", badgeClass: GREY_BADGE, dotClass: "bg-muted-foreground" },
};

export function StatusBadge({ status }: { status: ExternalAgentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
