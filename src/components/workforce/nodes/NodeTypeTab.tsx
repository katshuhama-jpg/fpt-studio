import type { ReactNode } from "react";

/** In-flow header strip at the top of a node card announcing its type at a glance (Agent / Omni
 * Supports / Người trong tổ chức) — a tinted bar with a bottom rule, not a floating tag; purely a
 * label, not interactive. */
export default function NodeTypeTab({ icon, label, variant = "primary" }: {
  icon: ReactNode;
  label: string;
  variant?: "primary" | "accent";
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-4 py-1.5 border-b text-[10px] font-semibold uppercase tracking-wide ${
        variant === "accent" ? "bg-accent-soft text-accent border-accent/15" : "bg-primary-soft text-primary border-primary/15"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}
