import type { ReactNode } from "react";

/** Rounded type tag inset at the top of a node card, announcing its kind at a glance (Agent /
 * Omni Supports / Người trong tổ chức / Trigger) — a self-contained pill (not a full-width bar)
 * sitting in its own header strip, echoing the reference canvas's own floating type tag. Kept as
 * a normal in-flow element (not detached/overflowing above the card) so it never interferes with
 * the card's own connection-handle positioning. Purely a label, not interactive. Colors come
 * from the "Slate Enterprise" tokens defined under `.wf-slate` in index.css, one pair per kind. */
export default function NodeTypeTab({ icon, label, kind }: {
  icon: ReactNode;
  label: string;
  kind: "agent" | "omni" | "person" | "trigger";
}) {
  return (
    <div className="flex items-center" style={{ padding: "10px 12px 0" }}>
      <div
        className="inline-flex items-center gap-1.5 py-[5px] px-[10px] rounded-full text-[11px] font-bold uppercase tracking-[0.06em] [font-family:var(--wf-font-display)]"
        style={{ background: `var(--wf-${kind}-bg)`, color: `var(--wf-${kind})` }}
      >
        {icon}
        {label}
      </div>
    </div>
  );
}
