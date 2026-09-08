/** Connector dots render small (14px, real border/background) but keep a 44x44 invisible
 * hit area via an absolutely-positioned `::before` overlay (no border/background of its own,
 * so it never paints a bogus ring around the dot) — a competitor product we looked at made
 * these dots too small to reliably find, don't repeat that. Hover grows the visible dot and
 * swaps in a crosshair cursor so Builders can tell where to drag from. */
export const HANDLE_CLASS =
  "!w-3.5 !h-3.5 !bg-surface !border-2 !border-primary !rounded-full !cursor-crosshair transition-transform duration-150 hover:!scale-125 focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-ring before:content-[''] before:absolute before:-inset-[15px] before:rounded-full";
