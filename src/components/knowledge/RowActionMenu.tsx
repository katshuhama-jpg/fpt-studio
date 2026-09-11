import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface RowActionMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}

const MENU_WIDTH = 224; // w-56
// Worst-case rendered height per item/container-chrome — used only to decide whether the menu
// should flip upward; the actual box still sizes to its real content.
const ITEM_HEIGHT_ESTIMATE = 40;
const CHROME_HEIGHT_ESTIMATE = 24;
const DANGER_SEPARATOR_ESTIMATE = 8;

/**
 * Shared "..." row-action dropdown for Knowledge tables (Documents, Website, FAQ, ...). Every one
 * of these tables lives inside its own `overflow-x-auto` scroll wrapper, so a plain
 * `position: absolute` dropdown gets clipped by (or forces scroll inside) that wrapper once it's
 * tall enough — instead this portals to `document.body` and is positioned from the trigger
 * button's own screen rect (`position: fixed`, z-[9999]), flipping upward when there isn't room
 * below. Closes on outside click, Escape, or any scroll (the table's own scroll included, via a
 * capturing listener) so it never lingers detached from its trigger.
 */
export default function RowActionMenu({ items, ariaLabel = "Thao tác" }: { items: RowActionMenuItem[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasDanger = items.some(i => i.danger);
  const heightEstimate = items.length * ITEM_HEIGHT_ESTIMATE + CHROME_HEIGHT_ESTIMATE + (hasDanger ? DANGER_SEPARATOR_ESTIMATE : 0);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const openUpward = window.innerHeight - r.bottom < heightEstimate && r.top > heightEstimate;
      const left = Math.min(Math.max(r.right - MENU_WIDTH, 8), window.innerWidth - MENU_WIDTH - 8);
      setPos(openUpward ? { bottom: window.innerHeight - r.top + 4, left } : { top: r.bottom + 4, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    // capture:true so this also fires for scroll on the table's own nested overflow wrapper,
    // which (unlike window resize) doesn't bubble to window/document by default.
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label={ariaLabel}
        className="w-9 h-9 min-w-[44px] min-h-[44px] -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical size={15} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-56 rounded-lg border border-border bg-white shadow-elev py-1"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          onMouseDown={e => e.stopPropagation()}
        >
          {items.map((item, i) => {
            const isFirstDanger = item.danger && !items[i - 1]?.danger;
            const button = (
              <button
                disabled={item.disabled}
                onClick={() => { if (item.disabled) return; setOpen(false); item.onClick(); }}
                className={`w-full text-left px-3 py-2 text-sm transition-base ${
                  item.disabled ? "text-muted-foreground/50 cursor-not-allowed" :
                  item.danger ? "text-destructive hover:bg-[hsl(var(--destructive-soft))]" : "hover:bg-surface-muted"
                }`}
              >
                {item.label}
              </button>
            );
            return (
              <div key={item.label} className={isFirstDanger ? "mt-1 pt-1 border-t border-border" : undefined}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild><span>{button}</span></TooltipTrigger>
                  {item.disabled && item.disabledTooltip && <TooltipContent side="left" className="max-w-[240px]">{item.disabledTooltip}</TooltipContent>}
                </Tooltip>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
