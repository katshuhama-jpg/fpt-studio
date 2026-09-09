/** Connector dots are a single flat filled circle — 6px diameter, no border/ring/shadow of any
 * kind — matching the reference exactly (a white outline here was reading as a thick "ring"
 * once rendered at real size, not a plain dot). They keep a 44x44 invisible hit area via an
 * absolutely-positioned `::before` overlay (no border/background of its own, so it never paints
 * a bogus ring around the dot) — a competitor product we looked at made these dots too small to
 * reliably find, don't repeat that. `!border-0` explicitly overrides reactflow's own base
 * `.react-flow__handle` stylesheet, which otherwise ships a 1px white border by default. Hover
 * grows the visible dot and swaps in a crosshair cursor so Builders can tell where to drag from. */
export const HANDLE_CLASS =
  "!w-1.5 !h-1.5 !bg-[var(--wf-dotmark,var(--primary))] !border-0 !rounded-full !cursor-crosshair !shadow-none transition-transform duration-150 hover:!scale-125 focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-ring before:content-[''] before:absolute before:-inset-[19px] before:rounded-full";
