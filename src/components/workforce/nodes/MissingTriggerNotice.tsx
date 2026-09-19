import { AlertTriangle } from "lucide-react";

/** Shared warning strip for Agent/Omni/Person nodes that are wired into a route but that no
 * Trigger reaches (see `getNodesUnreachableFromTrigger` in graphOps.ts) — such a chain looks
 * identical to a working one at a glance, unlike an unconfigured Condition, so it needs an
 * explicit call-out rather than relying on the user to notice a missing arrow somewhere
 * upstream. Deliberately the same visual language (orange, AlertTriangle) as the Condition
 * node's own "Chưa cấu hình điều kiện" warning, so the two read as one family of "this won't
 * run yet" signals rather than two different kinds of error.
 *
 * Background stays neutral (`--wf-surface`, no orange wash) and the divider above it is the
 * plain card border color, not warn — the card's own outer border is already orange for this
 * state (S-color-1), so tinting the banner too just doubled the same signal and, with several
 * warning cards stacked on one canvas, read as a wall of orange. The icon + text alone carry
 * the warn color, which is enough to read as "this won't run" without the extra wash.
 *
 * Also reused by TriggerNode.tsx itself (with a different `text`) for its own two "won't fire"
 * states — not connected to an Agent yet, or connected but no real trigger picked — so every
 * "this node can't run" signal on the canvas shares one look. */
export default function MissingTriggerNotice({ text = "Không có Trigger nào dẫn tới — sẽ không chạy" }: { text?: string }) {
  return (
    <div
      className="flex items-center gap-[6px]"
      style={{
        padding: "6px 14px",
        borderTop: "1px solid var(--wf-border)",
        background: "var(--wf-surface)",
      }}
    >
      <AlertTriangle size={11} className="shrink-0" style={{ color: "var(--wf-warn)" }} />
      <span className="text-[11px] leading-tight" style={{ color: "var(--wf-warn)", fontFamily: "var(--wf-font-body)" }}>
        {text}
      </span>
    </div>
  );
}
