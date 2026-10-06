import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { listRevokedResources, REVOKED_COPY, type RevocableType, type RevokedResource } from "./revokedResources";

/** Revoked resources of an Agent, kept fresh while the Builder detaches them in any panel
 * (the panels refresh themselves locally, so this re-reads the stores on a short interval). */
export function useRevokedResources(agentId: string | undefined): RevokedResource[] {
  const read = () => (agentId ? listRevokedResources(agentId) : []);
  const [items, setItems] = useState<RevokedResource[]>(read);
  useEffect(() => {
    setItems(read());
    const t = window.setInterval(() => {
      setItems(prev => {
        const next = read();
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
      });
    }, 800);
    return () => window.clearInterval(t);
  }, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

/** Red "Đã bị thu hồi" chip; hover explains who revoked it and what to do. Icon + text, so the
 * state never relies on color alone. */
export function RevokedChip({ ownerName, type }: { ownerName: string; type: RevocableType }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-destructive/10 text-destructive text-[11px] font-semibold whitespace-nowrap cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
        >
          <AlertTriangle size={11} aria-hidden /> {REVOKED_COPY.chip}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{REVOKED_COPY.tooltip(ownerName, type)}</TooltipContent>
    </Tooltip>
  );
}

/** Small red count, next to a nav item or section title. */
export function RevokedDot({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[11px] font-semibold leading-none"
      aria-label={label ?? `${count} thành phần đã bị thu hồi`}
      title={label ?? `${count} thành phần đã bị thu hồi`}
    >
      {count}
    </span>
  );
}

/** Red notice at the top of the Configuration panel / Agent details tabs. */
export function RevokedBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <AlertTriangle size={14} className="shrink-0 mt-px" aria-hidden />
      <span>{REVOKED_COPY.banner(count)}</span>
    </div>
  );
}

/** Row styling for a revoked resource inside lists. */
export const REVOKED_ROW_CLASS = "border-destructive/50 bg-destructive/5";
