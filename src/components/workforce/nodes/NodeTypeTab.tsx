import type { ReactNode } from "react";

/** In-flow header strip at the top of a node card announcing its type at a glance (Agent / Omni
 * Supports / Người trong tổ chức) — a tinted bar with a bottom rule, not a floating tag; purely a
 * label, not interactive. Colors come from the "Slate Enterprise" tokens defined under
 * `.wf-slate` in index.css, one pair per node kind. */
export default function NodeTypeTab({ icon, label, kind }: {
  icon: ReactNode;
  label: string;
  kind: "agent" | "omni" | "person";
}) {
  return (
    <div
      className="flex items-center gap-1.5 py-[7px] px-[14px] text-[11px] font-bold uppercase tracking-[0.06em] [font-family:var(--wf-font-display)]"
      style={{ background: `var(--wf-${kind}-bg)`, color: `var(--wf-${kind})` }}
    >
      {icon}
      {label}
    </div>
  );
}
