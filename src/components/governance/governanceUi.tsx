// Small shared presentational pieces for the Governance module (Requests list, Request detail,
// Audit Log) — kept separate from governanceStore.ts because that file is logic-only (imported
// by AgentBuilder.tsx too, which doesn't need JSX pulled in).
import { HugeiconsIcon } from "@hugeicons/react";
import { Robot01Icon, BookOpen01Icon, PuzzleIcon, Shield01Icon, Plug01Icon } from "@hugeicons/core-free-icons";
import type { GovResourceType, GovRequestStatus, GovChangeState, ResourceShareStatus } from "./governanceStore";
import { RESOURCE_TYPE_LABEL, STATUS_LABEL, governanceStore } from "./governanceStore";
import { getAgent } from "../configure/agentStore";
import { agentPublishStore } from "../configure/agentPublishStore";

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
  rejected: "bg-destructive/10 border-destructive/20 text-destructive",
  revoked: "bg-surface-muted border-border text-muted-foreground",
  withdrawn: "bg-surface-muted border-border text-muted-foreground",
};

const STATUS_DOT: Record<GovRequestStatus, string> = {
  pending: "bg-warning", approved: "bg-success", rejected: "bg-destructive", revoked: "bg-muted-foreground", withdrawn: "bg-muted-foreground",
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
  withdrawn: "border-l-transparent",
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

/** Per-type tint so Knowledge / Skill / Guardrails / Connector are told apart at a glance, not
 * only by reading the label. Hues deliberately avoid the status colours (amber = Chờ duyệt,
 * green = Đã duyệt, red = Từ chối) so a type tag is never mistaken for a status. The label stays,
 * so colour is never the only cue. */
export const RESOURCE_TYPE_TINT: Record<GovResourceType, { pill: string; icon: string }> = {
  agent: { pill: "bg-surface-muted border-border text-foreground", icon: "text-muted-foreground" },
  knowledge: { pill: "bg-sky-50 border-sky-200 text-sky-800", icon: "text-sky-600" },
  skill: { pill: "bg-violet-50 border-violet-200 text-violet-800", icon: "text-violet-600" },
  guardrail: { pill: "bg-pink-50 border-pink-200 text-pink-800", icon: "text-pink-600" },
  connector: { pill: "bg-teal-50 border-teal-200 text-teal-800", icon: "text-teal-600" },
};

export function ResourceTypePill({ type }: { type: GovResourceType }) {
  const t = RESOURCE_TYPE_TINT[type];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 whitespace-nowrap ${t.pill}`}>
      <ResourceTypeIcon type={type} size={12} className={t.icon} />
      {RESOURCE_TYPE_LABEL[type]}
    </span>
  );
}

/** Change-state chip next to a request's title. Same pill shape/size as the other meta chips
 * (type, version) and deliberately neutral: the StatusBadge is the ONE colored chip in that row,
 * exactly as on the Requests list, so the detail header reads the same as the row that was
 * clicked. Labels no longer repeat "cần duyệt" — the status chip right beside it already says
 * "Chờ duyệt", so this chip only answers "what kind of change is this?". */
const CHANGE_STATE_LABEL: Record<GovChangeState, string> = {
  new: "Bản mới",
  modified: "Có chỉnh sửa",
  unchanged_approved: "Không thay đổi",
};

export function ChangeStateBadge({ state }: { state: GovChangeState }) {
  return (
    <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-surface-muted border border-border rounded-full px-2.5 py-1 whitespace-nowrap">
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
  return `${dd}/${mm}/${d.getFullYear()} - ${hh}:${mi}`;
}

/** A request's avatar — the Agent's own avatar (its emoji on its own background colour, exactly
 * as on the Agents list and the Agent's detail page) for an Agent request, the type icon for a
 * Resource request. Used by both the Requests list row and the Request Detail header so the
 * reviewer recognises the same Agent everywhere. */
export function RequestAvatar({ type, resourceId, fallbackIcon, size = "md" }: {
  type: GovResourceType; resourceId: string; fallbackIcon?: string; size?: "md" | "lg";
}) {
  const box = size === "lg" ? "w-11 h-11 rounded-xl text-xl" : "w-9 h-9 rounded-lg text-base";
  if (type === "agent") {
    const a = getAgent(resourceId);
    return (
      <span className={`${box} ${a.bg} flex items-center justify-center shrink-0`} aria-hidden="true">
        {a.emoji || fallbackIcon}
      </span>
    );
  }
  return (
    <span className={`${box} bg-surface-muted border border-border flex items-center justify-center shrink-0`} aria-hidden="true">
      <ResourceTypeIcon type={type} size={size === "lg" ? 18 : 16} className={RESOURCE_TYPE_TINT[type].icon} />
    </span>
  );
}

/** Governance state of an Agent for the Builder side (Agents list card, filters): "pending" while
 * a request waits, "rejected" while the latest request was rejected and nothing newer was sent. */
export function agentGovState(agentId: string): { state: "pending" | "rejected"; version?: string } | null {
  const latest = governanceStore.latestForResource("agent", agentId);
  if (!latest) return null;
  if (latest.status === "pending") return { state: "pending", version: latest.version };
  if (latest.status === "rejected") return { state: "rejected", version: latest.version };
  return null;
}

export function AgentGovBadge({ agentId }: { agentId: string }) {
  const g = agentGovState(agentId);
  if (!g) return null;
  const pending = g.state === "pending";
  return (
    <span className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${
      pending ? "bg-warning/10 border-warning/25 text-warning" : "bg-destructive/10 border-destructive/20 text-destructive"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${pending ? "bg-warning" : "bg-destructive"}`} />
      {pending ? "Chờ duyệt" : "Bị từ chối"}{g.version ? ` ${g.version}` : ""}
    </span>
  );
}

/** App Store Connect–style version lines for an Agent card: one line for what users are on
 * (Live vY, or Bản nháp) and — only when there is one — one line for the latest publish request
 * (vX · Chờ duyệt / Bị từ chối). Two facts, two lines, same order everywhere, so "live on 1.0.0,
 * 1.0.1 waiting for review" reads at a glance without implying the live version is in review. */
export function AgentVersionLines({ agentId }: { agentId: string }) {
  const pub = agentPublishStore.get(agentId);
  const live = pub.placement !== null;
  const g = agentGovState(agentId);
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${live ? "bg-success" : "bg-muted-foreground/60"}`} aria-hidden />
        {live
          ? <><span className="font-medium text-success">Live</span><span className="font-mono text-[11px] text-foreground/80">{pub.version}</span></>
          : <span className="text-muted-foreground">Bản nháp · chưa publish</span>}
      </span>
      {g && (
        <span className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.state === "pending" ? "bg-warning" : "bg-destructive"}`} aria-hidden />
          <span className="font-mono text-[11px] text-foreground/80">{g.version}</span>
          <span className={`font-medium ${g.state === "pending" ? "text-warning" : "text-destructive"}`}>{g.state === "pending" ? "Chờ duyệt" : "Bị từ chối"}</span>
        </span>
      )}
    </div>
  );
}
