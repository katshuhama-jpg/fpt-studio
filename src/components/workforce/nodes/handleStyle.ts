/** Connector dots are small solid filled dots (matching the dots rendered at each edge's own
 * endpoints, for a consistent look) with a white halo so they read clearly against both the
 * node body and the canvas background. They render small (14px) but keep a 44x44 invisible
 * hit area via an absolutely-positioned `::before` overlay (no border/background of its own,
 * so it never paints a bogus ring around the dot) — a competitor product we looked at made
 * these dots too small to reliably find, don't repeat that. Hover grows the visible dot and
 * swaps in a crosshair cursor so Builders can tell where to drag from. */
export const HANDLE_CLASS =
  "!w-3.5 !h-3.5 !bg-[var(--wf-dotmark,var(--primary))] !border-2 !border-white !rounded-full !cursor-crosshair !shadow-sm transition-transform duration-150 hover:!scale-125 focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-ring before:content-[''] before:absolute before:-inset-[15px] before:rounded-full";
