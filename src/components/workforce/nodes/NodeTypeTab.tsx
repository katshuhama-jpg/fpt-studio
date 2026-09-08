import type { ReactNode } from "react";

/** Small pill tab floating above a node card announcing its type at a glance (Agent / Omni
 * Supports / Người trong tổ chức) — purely a label, not interactive. */
export default function NodeTypeTab({ icon, label, variant = "primary" }: {
  icon: ReactNode;
  label: string;
  variant?: "primary" | "accent";
}) {
  return (
    <div
      className={`absolute -top-3.5 left-4 z-10 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold shadow-sm ${
        variant === "accent" ? "bg-accent-soft text-accent border-accent/20" : "bg-primary-soft text-primary border-primary/20"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}
