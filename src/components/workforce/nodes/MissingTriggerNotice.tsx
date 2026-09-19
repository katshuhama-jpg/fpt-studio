import { AlertTriangle } from "lucide-react";

/** Shared warning strip for Agent/Omni/Person nodes that are wired into a route but that no
 * Trigger reaches (see `getNodesUnreachableFromTrigger` in graphOps.ts) — such a chain looks
 * identical to a working one at a glance, unlike an unconfigured Condition, so it needs an
 * explicit call-out rather than relying on the user to notice a missing arrow somewhere
 * upstream. Deliberately the same visual language (orange, AlertTriangle) as the Condition
 * node's own "Chưa cấu hình điều kiện" warning, so the two read as one family of "this won't
 * run yet" signals rather than two different kinds of error. */
export default function MissingTriggerNotice() {
  return (
    <div
      className="flex items-center gap-[6px]"
      style={{
        padding: "6px 14px",
        borderTop: "1px solid var(--wf-warn)",
        background: "color-mix(in srgb, var(--wf-warn) 10%, var(--wf-surface))",
      }}
    >
      <AlertTriangle size={11} className="shrink-0" style={{ color: "var(--wf-warn)" }} />
      <span className="text-[11px] leading-tight" style={{ color: "var(--wf-warn)", fontFamily: "var(--wf-font-body)" }}>
        Không có Trigger nào dẫn tới — sẽ không chạy
      </span>
    </div>
  );
}
