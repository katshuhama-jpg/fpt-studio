import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SparklesIcon, Wrench01Icon, Folder01Icon, File01Icon, Alert01Icon, SquareLock01Icon } from "@hugeicons/core-free-icons";
import { resolveRef, type ParsedRef, type ResolvedRef, type RefGlyph } from "./instructionRefs";
import { REVOKED_COPY } from "@/components/governance/revokedResources";

type IconData = readonly (readonly [string, Record<string, string | number>])[];

const GLYPH_ICON: Record<RefGlyph, IconData> = {
  skill: SparklesIcon as unknown as IconData,
  tool: Wrench01Icon as unknown as IconData,
  folder: Folder01Icon as unknown as IconData,
  file: File01Icon as unknown as IconData,
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const kebab = (k: string) => k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

/** HugeIcons data -> inline SVG string. The editor builds chips as plain DOM (a contenteditable
 * can't host React-managed children safely), so icons are serialised instead of rendered. */
export function iconSvg(icon: IconData, size = 12): string {
  const inner = icon.map(([tag, attrs]) => {
    const a = Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${kebab(k)}="${esc(String(v))}"`).join(" ");
    return `<${tag} ${a}/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" aria-hidden="true" style="flex-shrink:0">${inner}</svg>`;
}

/** What the hover/focus tooltip shows: loại · tên đầy đủ · mô tả/đường dẫn · trạng thái. */
export interface ChipTip {
  type: string;
  name: string;
  detail?: string;
  status: string;
  tone: "ok" | "removed" | "restricted";
}

export interface ChipParts {
  className: string;
  tip: ChipTip;
  innerHTML: string;
  error: boolean;
}

/** Everything needed to draw one chip, shared by the editor (DOM) and the read-only views (React)
 * so a reference looks identical in the editor, the preview and the publish dialog. */
export function chipParts(r: ResolvedRef): ChipParts {
  const error = r.status !== "ok";
  const revoked = r.status === "revoked";
  const icon = r.status === "missing" || revoked ? Alert01Icon : r.status === "restricted" ? SquareLock01Icon : GLYPH_ICON[r.glyph];
  const iconColor = r.status === "missing" || revoked ? "text-destructive" : "text-muted-foreground";
  const className = [
    "inline-flex items-center gap-1 align-baseline rounded-[6px] border px-1.5 py-px mx-px",
    "text-[0.92em] leading-snug whitespace-nowrap select-none max-w-full",
    "data-[selected=true]:ring-2 data-[selected=true]:ring-primary",
    revoked ? "border-destructive bg-destructive/10 text-destructive font-medium"
      : error ? "border-destructive bg-destructive/5 text-muted-foreground" : "border-transparent bg-muted text-foreground",
  ].join(" ");
  const tip: ChipTip = revoked
    ? { type: r.typeLabel, name: r.label, detail: r.deletedBy ? REVOKED_COPY.tooltipDeleted(r.deletedBy, r.revokedType ?? "skill") : REVOKED_COPY.tooltip(r.revokedBy ?? "Chủ sở hữu", r.revokedType ?? "skill"), status: r.deletedBy ? REVOKED_COPY.chipDeleted : REVOKED_COPY.chip, tone: "removed" }
    : r.status === "missing"
    ? { type: r.typeLabel, name: r.label, detail: "Tài nguyên này không còn gắn với Agent.", status: "Đã bị gỡ", tone: "removed" }
    : r.status === "restricted"
      ? { type: r.typeLabel, name: r.label, detail: "Bạn không có quyền xem tài nguyên này.", status: "Không có quyền truy cập", tone: "restricted" }
      : { type: r.typeLabel, name: r.label, detail: r.detail, status: r.state ? `Hợp lệ · ${r.state}` : "Hợp lệ", tone: "ok" };
  const innerHTML = `<span class="${iconColor}" style="display:inline-flex">${iconSvg(icon as unknown as IconData)}</span><span class="truncate">${esc(r.label)}</span>`;
  return { className, tip, innerHTML, error };
}

/** Focusable (so the tooltip also works from the keyboard) and labelled for screen readers. The
 * tooltip itself is drawn by <RefChipTooltip/>, which reads `data-ref-tip`. */
function applyTip(el: HTMLElement, tip: ChipTip) {
  el.dataset.refTip = JSON.stringify(tip);
  el.tabIndex = 0;
  el.setAttribute("aria-label", `${tip.type}: ${tip.name}. ${tip.status}`);
}

/** Builds the non-editable chip element the editor puts inside the Instructions text. */
export function chipElement(r: ResolvedRef): HTMLSpanElement {
  const p = chipParts(r);
  const el = document.createElement("span");
  el.className = p.className;
  el.innerHTML = p.innerHTML;
  el.contentEditable = "false";
  applyTip(el, p.tip);
  el.dataset.refToken = r.token;
  if (p.error) el.dataset.refError = "true";
  return el;
}

/** Re-resolves an existing chip in place — picks up renames, tool changes and removals. */
export function refreshChipElement(el: HTMLElement, agentId: string, ref: ParsedRef) {
  const r = resolveRef(agentId, ref);
  const p = chipParts(r);
  el.className = p.className;
  el.innerHTML = p.innerHTML;
  applyTip(el, p.tip);
  if (p.error) el.dataset.refError = "true"; else delete el.dataset.refError;
}

/** Read-only chip for the rendered preview and the publish dialog. */
export function RefChip({ agentId, reference }: { agentId: string; reference: ParsedRef }) {
  const r = resolveRef(agentId, reference);
  const p = chipParts(r);
  return (
    <span
      className={p.className}
      tabIndex={0}
      aria-label={`${p.tip.type}: ${p.tip.name}. ${p.tip.status}`}
      data-ref-tip={JSON.stringify(p.tip)}
      data-ref-token={r.token}
      data-ref-error={p.error ? "true" : undefined}
      dangerouslySetInnerHTML={{ __html: p.innerHTML }}
    />
  );
}

const TONE_DOT: Record<ChipTip["tone"], string> = { ok: "bg-success", removed: "bg-destructive", restricted: "bg-amber-500" };

/** One tooltip for every chip on the page (editor, preview, publish dialog): shown on hover and on
 * keyboard focus, hidden on leave/blur/Esc/scroll. Event-delegated because the editor's chips are
 * plain DOM that React doesn't render. */
export function RefChipTooltip() {
  const [tip, setTip] = useState<{ data: ChipTip; rect: DOMRect } | null>(null);

  useEffect(() => {
    const show = (target: EventTarget | null): boolean => {
      const chip = (target as Element | null)?.closest?.("[data-ref-tip]") as HTMLElement | null;
      if (!chip) return false;
      try { setTip({ data: JSON.parse(chip.dataset.refTip ?? ""), rect: chip.getBoundingClientRect() }); } catch { return false; }
      return true;
    };
    const hide = () => setTip(null);
    const onOver = (e: MouseEvent) => { if (!show(e.target)) hide(); };
    const onFocusIn = (e: FocusEvent) => { show(e.target); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  if (!tip) return null;
  const W = 280;
  const left = Math.max(8, Math.min(tip.rect.left, window.innerWidth - W - 8));
  const below = window.innerHeight - tip.rect.bottom > 140 || tip.rect.top < 140;
  const style = below ? { left, top: tip.rect.bottom + 6 } : { left, bottom: window.innerHeight - tip.rect.top + 6 };
  return createPortal(
    <div role="tooltip" style={{ width: W, ...style }} className="fixed z-[10100] rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs pointer-events-none">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{tip.data.type}</div>
      <div className="text-sm font-medium break-words">{tip.data.name}</div>
      {tip.data.detail && <div className="text-muted-foreground mt-0.5 break-words">{tip.data.detail}</div>}
      <div className="flex items-center gap-1.5 mt-1.5 font-medium">
        <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[tip.data.tone]}`} />
        {tip.data.status}
      </div>
    </div>,
    document.body,
  );
}
