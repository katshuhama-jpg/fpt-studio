import { Loader2 } from "lucide-react";

/** Processing pipeline shared by every document/URL/FAQ item across Knowledge screens:
 * pending -> processing -> done | failed; cancelled applies to removed/aborted items. */
export type KnowledgeProcessingStatus = "pending" | "processing" | "done" | "failed" | "cancelled";

/** FAQ rows carry one extra status beyond the shared 5 — "invalid" — for content that was
 * rejected as unusable (too short, malformed) rather than merely failing to process. Retrying
 * a "failed" row may succeed; retrying an "invalid" one never will until the content is edited.
 * Documents and URLs never use this value — their status stays KnowledgeProcessingStatus. */
export type KnowledgeFaqStatus = KnowledgeProcessingStatus | "invalid";

const GREY_BADGE = "chip-muted";

export const KNOWLEDGE_STATUS_META: Record<KnowledgeFaqStatus, { label: string; badgeClass: string; dotClass?: string }> = {
  pending: { label: "Đang chờ xử lý", badgeClass: GREY_BADGE, dotClass: "bg-muted-foreground" },
  processing: { label: "Đang xử lý", badgeClass: "chip-info", dotClass: undefined },
  done: { label: "Hoàn thành", badgeClass: "chip-success", dotClass: "bg-success" },
  failed: { label: "Xử lý thất bại", badgeClass: "chip-danger", dotClass: "bg-destructive" },
  invalid: { label: "Không hợp lệ", badgeClass: "chip-warning", dotClass: "bg-warning" },
  cancelled: { label: "Đã hủy", badgeClass: "chip-outline", dotClass: "bg-muted-foreground" },
};

/** Colored pill for the processing-status enum — same shape as external-agents/statusMeta.tsx's
 * StatusBadge (span + dot, 10px uppercase tracking-wide, rounded not rounded-full, bordered),
 * with a spinner swapped in for the dot on "processing" instead of a static dot. Accepts the
 * wider FAQ enum so Documents/Website (which only ever hold the 5-value subset) and FAQ (which
 * can also hold "invalid") share the exact same component. */
export function KnowledgeStatusPill({ status }: { status: KnowledgeFaqStatus }) {
  const meta = KNOWLEDGE_STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap ${meta.badgeClass}`}>
      {status === "processing" ? (
        <Loader2 size={10} className="shrink-0 animate-spin" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotClass}`} />
      )}
      {meta.label}
    </span>
  );
}
