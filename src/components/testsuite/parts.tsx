import { useSearchParams } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon, Cancel01Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { KIND_LABEL, toneOf, type CaseKind, type Verdict } from "./testSuiteStore";

type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
export const Icon = ({ icon, size = 16, className = "" }: { icon: IconData; size?: number; className?: string }) =>
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;

export const SEG_LIST = "h-9 w-fit rounded-lg bg-muted p-[3px] text-muted-foreground";
export const SEG_TRIGGER = "h-full flex-none gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-0";

/** URL state inside Evaluate › Test Suites / Lịch sử chạy. */
export type TestSection = "test-sets" | "runs";
export function useTestNav() {
  const [params, setParams] = useSearchParams();
  const go = (section: TestSection, extra: Record<string, string | undefined> = {}) => {
    const next: Record<string, string> = { tab: "evaluate", section };
    for (const [k, v] of Object.entries(extra)) if (v) next[k] = v;
    setParams(next);
  };
  return { params, go, get: (k: string) => params.get(k) };
}

/** Q&A / Kịch bản segmented toggle. */
export function KindToggle({ value, onChange, disabled }: { value: CaseKind; onChange: (k: CaseKind) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Loại testcase" className={`inline-flex ${SEG_LIST}`}>
      {(["qna", "scenario"] as CaseKind[]).map(k => (
        <button key={k} type="button" role="radio" aria-checked={value === k} disabled={disabled} onClick={() => value !== k && onChange(k)}
          data-state={value === k ? "active" : "inactive"} className={`inline-flex items-center ${SEG_TRIGGER} disabled:opacity-50`}>
          {KIND_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

export function KindChip({ kind }: { kind: CaseKind }) {
  return <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${kind === "qna" ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>{KIND_LABEL[kind]}</span>;
}

/** Pass/Fail/Lỗi hệ thống — icon + text, never colour alone. */
export function VerdictBadge({ v, prefix }: { v: Verdict | "error" | undefined; prefix?: string }) {
  if (!v) return <span className="text-xs text-muted-foreground">—</span>;
  if (v === "error") return <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap"><Icon icon={Alert02Icon} size={12} />Lỗi hệ thống</span>;
  const pass = v === "pass";
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${pass ? "bg-[hsl(var(--success-soft))] text-success" : "bg-[hsl(var(--destructive-soft))] text-destructive"}`}>
      <Icon icon={pass ? Tick02Icon : Cancel01Icon} size={12} />{prefix}{pass ? "Pass" : "Fail"}
    </span>
  );
}

const RING: Record<ReturnType<typeof toneOf>, string> = { good: "text-success", mid: "text-warning", bad: "text-destructive" };
/** Progress ring coloured by the fixed thresholds (≥80 / 50–79 / <50). */
export function ProgressRing({ pct, size = 36 }: { pct: number; size?: number }) {
  const r = (size - 5) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`shrink-0 -rotate-90 ${RING[toneOf(pct)]}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

/** "Test Suites › Suite › Page" + ← Quay lại. */
export function Crumbs({ items, onBack }: { items: { label: string; onClick?: () => void }[]; onBack?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {onBack && <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8" onClick={onBack}><Icon icon={ArrowLeft01Icon} /> Quay lại</Button>}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1.5 text-muted-foreground">
        {items.map((it, i) => (
          <span key={i} className="inline-flex min-w-0 items-center gap-1.5">
            {i > 0 && <Icon icon={ArrowRight01Icon} size={14} />}
            {it.onClick
              ? <button type="button" onClick={it.onClick} className="truncate max-w-[240px] hover:text-foreground hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{it.label}</button>
              : <span className="truncate max-w-[320px] text-foreground font-medium" aria-current="page">{it.label}</span>}
          </span>
        ))}
      </nav>
    </div>
  );
}

export function EmptyBox({ icon, title, children }: { icon: IconData; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon icon={icon} size={20} /></div>
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}
