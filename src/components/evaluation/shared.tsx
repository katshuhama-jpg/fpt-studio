import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { useSearchParams } from "react-router-dom";
import type { CellStatus } from "./evaluationStore";

export type EvalSection = "test-sets" | "runs" | "metrics" | "publish" | "monitor";

export const EVAL_SUBTABS: { id: EvalSection; label: string; desc: string }[] = [
  { id: "test-sets", label: "Bộ test", desc: "Test case theo nghiệp vụ" },
  { id: "runs", label: "Lượt chạy", desc: "Kết quả các lần chạy test" },
  { id: "metrics", label: "Chỉ số đánh giá", desc: "Tiêu chí chấm dùng lại được" },
  { id: "publish", label: "Publish", desc: "Bộ test phải đạt để publish" },
  { id: "monitor", label: "Monitor", desc: "Chất lượng trên hội thoại thật" },
];

/** Navigation inside the Evaluation tab — keeps tab/section in the URL plus an optional item id. */
export function useEvalNav() {
  const [params, setParams] = useSearchParams();
  const item = params.get("item");
  const go = (section: EvalSection, itemId?: string | null, extra?: Record<string, string>) => {
    const next: Record<string, string> = { tab: "evaluate", section };
    if (itemId) next.item = itemId;
    Object.assign(next, extra ?? {});
    setParams(next);
  };
  return { item, params, go };
}

export const TONE = {
  pass: "bg-[hsl(var(--success-soft))] text-success",
  fail: "bg-[hsl(var(--destructive-soft))] text-destructive",
  unstable: "bg-[hsl(var(--warning-soft))] text-warning",
};

export const STATUS_TEXT: Record<Exclude<CellStatus, "na">, string> = { pass: "Pass", fail: "Fail", unstable: "Không ổn định" };

export function StatusIcon({ status, size = 12 }: { status: CellStatus; size?: number }) {
  if (status === "pass") return <HugeiconsIcon icon={Tick02Icon} size={size} strokeWidth={2.5} />;
  if (status === "fail") return <HugeiconsIcon icon={Cancel01Icon} size={size} strokeWidth={2.5} />;
  if (status === "unstable") return <HugeiconsIcon icon={Alert02Icon} size={size} strokeWidth={2} />;
  return null;
}

/** "2/3" result chip — colour + icon + text so status never relies on colour alone. */
export function ResultCell({ status, pass, total, onClick, label }: { status: CellStatus; pass?: number; total?: number; onClick?: () => void; label?: string }) {
  if (status === "na") return <span className="text-xs text-muted-foreground">-</span>;
  const cls = `inline-flex items-center justify-center gap-1 min-w-[56px] h-7 px-2 rounded-md text-xs font-semibold transition-base ${TONE[status]}`;
  const content = <><StatusIcon status={status} />{pass}/{total}</>;
  return onClick
    ? <button type="button" onClick={onClick} aria-label={label} className={`${cls} cursor-pointer hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>{content}</button>
    : <span className={cls}>{content}</span>;
}

export function StatusText({ status }: { status: CellStatus }) {
  if (status === "na") return null;
  const color = status === "pass" ? "text-success" : status === "fail" ? "text-destructive" : "text-warning";
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}><StatusIcon status={status} />{STATUS_TEXT[status]}</span>;
}

/** Horizontal bar with a threshold marker. */
export function ThresholdBar({ value, threshold, tone, width = "w-full" }: { value: number; threshold?: number; tone: "pass" | "fail" | "warn" | "primary"; width?: string }) {
  const fill = tone === "pass" ? "bg-success" : tone === "fail" ? "bg-destructive" : tone === "warn" ? "bg-warning" : "bg-primary";
  return (
    <div className={`relative h-2 rounded-full bg-surface-muted ${width}`} role="img" aria-label={`${value}%${threshold ? ` - Ngưỡng ${threshold}%` : ""}`}>
      <div className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${value}%` }} />
      {threshold !== undefined && <div className="absolute -top-1 -bottom-1 w-0.5 bg-foreground/70" style={{ left: `${threshold}%` }} />}
    </div>
  );
}

export function Delta({ cur, prev, suffix = "" }: { cur: number; prev?: number; suffix?: string }) {
  if (prev === undefined) return <span className="text-xs text-muted-foreground">-</span>;
  const d = cur - prev;
  if (d === 0) return <span className="text-xs text-muted-foreground">Không đổi{suffix}</span>;
  return <span className={`text-xs font-semibold ${d > 0 ? "text-success" : "text-destructive"}`}>{d > 0 ? "▲" : "▼"} {Math.abs(d)} điểm{suffix}</span>;
}

export function EmptyState({ icon, title, desc, children }: { icon: any; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="surface-card p-10 flex flex-col items-center text-center animate-fade-up">
      <div className="w-14 h-14 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
        <HugeiconsIcon icon={icon} size={24} className="text-primary" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-5">{desc}</p>
      <div className="flex gap-2 flex-wrap justify-center">{children}</div>
    </div>
  );
}

export function RequiredBadge({ required }: { required: boolean }) {
  return required
    ? <span className="chip chip-primary !py-0.5 !text-[11px]">Bắt buộc</span>
    : <span className="chip chip-muted !py-0.5 !text-[11px]">Theo dõi</span>;
}

export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}, ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const fmtDuration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60} giây` : `${s} giây`);
export const fmtNumber = (n: number) => n.toLocaleString("vi-VN");

export const CURRENT_USER = "Linh Phan";
