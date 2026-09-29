import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";

/**
 * "…" row-action menu shared by resource rows/cards in Agent Builder (skills, guardrails,
 * knowledge). One look everywhere:
 * - 36px rows inset in a padded panel (rounded highlight instead of edge-to-edge bars),
 *   16px muted icons, labels in Vietnamese.
 * - Destructive actions sit in their own group under a divider, red text/icon, and only get
 *   the red tint on hover/focus — never at rest.
 * - Disabled actions stay visible (so people learn they exist) with the reason on hover.
 * - Keyboard: opens with focus on the first action, ↑/↓/Home/End move, Enter/Space runs,
 *   Esc/Tab closes and returns focus to the "…" button. Flips upward near the viewport
 *   bottom; closes on outside click, scroll or resize. Motion is skipped under
 *   prefers-reduced-motion.
 */
export type ActionMenuItem = {
  label: string;
  icon?: unknown;
  onSelect: () => void;
  /** When set, the item is shown disabled and this text explains why (tooltip). */
  disabledReason?: string;
  destructive?: boolean;
};

const ROW = 36;

export default function ActionMenu({ items, triggerLabel = "Thao tác", width = 208, triggerClassName }: {
  items: ActionMenuItem[];
  triggerLabel?: string;
  width?: number;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const regular = items.filter(i => !i.destructive);
  const destructive = items.filter(i => i.destructive);
  const ordered = [...regular, ...destructive];

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const estHeight = ordered.length * ROW + (destructive.length && regular.length ? 9 : 0) + 10;
    const openUp = window.innerHeight - r.bottom < estHeight + 8 && r.top > estHeight + 8;
    const left = Math.min(Math.max(r.right - width, 8), window.innerWidth - width - 8);
    setPos(openUp ? { bottom: window.innerHeight - r.top + 4, left } : { top: r.bottom + 4, left });
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])');
    first?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const idx = nodes.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); nodes[(idx + 1) % nodes.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); nodes[(idx - 1 + nodes.length) % nodes.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); nodes[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); nodes[nodes.length - 1]?.focus(); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") { close(false); }
  };

  const renderItem = (item: ActionMenuItem) => {
    const disabled = !!item.disabledReason;
    const tone = disabled
      ? "text-muted-foreground/55 cursor-not-allowed"
      : item.destructive
        ? "text-destructive hover:bg-[hsl(var(--destructive-soft))] focus-visible:bg-[hsl(var(--destructive-soft))] cursor-pointer"
        : "text-foreground hover:bg-surface-muted focus-visible:bg-surface-muted cursor-pointer";
    const iconTone = disabled ? "text-muted-foreground/40" : item.destructive ? "text-destructive" : "text-muted-foreground";
    return (
      <button
        key={item.label}
        type="button"
        role="menuitem"
        aria-disabled={disabled || undefined}
        title={item.disabledReason}
        tabIndex={-1}
        onClick={() => { if (disabled) return; close(false); item.onSelect(); }}
        className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-md text-sm text-left outline-none transition-colors duration-150 ${tone}`}
      >
        {item.icon ? <HugeiconsIcon icon={item.icon as never} size={16} className={`shrink-0 ${iconTone}`} aria-hidden /> : null}
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  if (items.length === 0) return null;

  return (
    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { if (open) { setOpen(false); return; } place(); setOpen(true); }}
        onKeyDown={e => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); place(); setOpen(true); } }}
        className={triggerClassName ?? `w-8 h-8 -m-1.5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${open ? "bg-surface-muted text-foreground" : ""}`}
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onMenuKey}
          onMouseDown={e => e.stopPropagation()}
          className="action-menu fixed z-[9999] rounded-xl border border-border bg-white p-1 shadow-elev"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width }}
        >
          {regular.map(renderItem)}
          {regular.length > 0 && destructive.length > 0 && <div role="separator" className="my-1 -mx-1 h-px bg-border" />}
          {destructive.map(renderItem)}
          <style>{`@media (prefers-reduced-motion: no-preference){.action-menu{animation:actionMenuIn 120ms ease-out}}@keyframes actionMenuIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>,
        document.body,
      )}
    </div>
  );
}
