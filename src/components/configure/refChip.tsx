import { SparklesIcon, Wrench01Icon, Folder01Icon, File01Icon, Alert01Icon, SquareLock01Icon } from "@hugeicons/core-free-icons";
import { resolveRef, type ParsedRef, type ResolvedRef, type RefGlyph } from "./instructionRefs";

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

export interface ChipParts {
  className: string;
  title: string;
  innerHTML: string;
  error: boolean;
}

/** Everything needed to draw one chip, shared by the editor (DOM) and the read-only views (React)
 * so a reference looks identical in the editor, the preview and the publish dialog. */
export function chipParts(r: ResolvedRef): ChipParts {
  const error = r.status !== "ok";
  const icon = r.status === "missing" ? Alert01Icon : r.status === "restricted" ? SquareLock01Icon : GLYPH_ICON[r.glyph];
  const iconColor = r.status === "missing" ? "text-destructive" : "text-muted-foreground";
  const className = [
    "inline-flex items-center gap-1 align-baseline rounded-[6px] border px-1.5 py-px mx-px",
    "text-[0.92em] leading-snug whitespace-nowrap select-none max-w-full",
    "data-[selected=true]:ring-2 data-[selected=true]:ring-primary",
    error ? "border-destructive bg-destructive/5 text-muted-foreground" : "border-transparent bg-muted text-foreground",
  ].join(" ");
  const title = r.status === "missing"
    ? "Tài nguyên này không còn gắn với Agent."
    : r.status === "restricted"
      ? "Bạn không có quyền xem tài nguyên này."
      : [r.typeLabel, r.label, r.detail, r.state].filter(Boolean).join("\n");
  const innerHTML = `<span class="${iconColor}" style="display:inline-flex">${iconSvg(icon as unknown as IconData)}</span><span class="truncate">${esc(r.label)}</span>`;
  return { className, title, innerHTML, error };
}

/** Builds the non-editable chip element the editor puts inside the Instructions text. */
export function chipElement(r: ResolvedRef): HTMLSpanElement {
  const p = chipParts(r);
  const el = document.createElement("span");
  el.className = p.className;
  el.title = p.title;
  el.innerHTML = p.innerHTML;
  el.contentEditable = "false";
  el.dataset.refToken = r.token;
  if (p.error) el.dataset.refError = "true";
  return el;
}

/** Re-resolves an existing chip in place — picks up renames, tool changes and removals. */
export function refreshChipElement(el: HTMLElement, agentId: string, ref: ParsedRef) {
  const r = resolveRef(agentId, ref);
  const p = chipParts(r);
  el.className = p.className;
  el.title = p.title;
  el.innerHTML = p.innerHTML;
  if (p.error) el.dataset.refError = "true"; else delete el.dataset.refError;
}

/** Read-only chip for the rendered preview and the publish dialog. */
export function RefChip({ agentId, reference }: { agentId: string; reference: ParsedRef }) {
  const r = resolveRef(agentId, reference);
  const p = chipParts(r);
  return (
    <span
      className={p.className}
      title={p.title}
      data-ref-token={r.token}
      data-ref-error={p.error ? "true" : undefined}
      dangerouslySetInnerHTML={{ __html: p.innerHTML }}
    />
  );
}
