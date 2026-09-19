/** Connector dots — live-measured off Relevance AI's own Workforce canvas, not approximated from a
 * screenshot: their idle handle is a 10px filled circle with a 2px WHITE ring (we'd earlier removed
 * that ring thinking it read as a thick border at real size — it doesn't; Relevance ships one).
 * Hovering grows it dramatically (~2.6x, to ~26px) — that big jump, not a small 125% nudge, is what
 * makes "where do I grab this to connect" obvious; the "khó bấm để ra mũi tên" (hard to find/click
 * the arrow) feedback was specifically about our old 6px dot barely changing size on hover. The
 * white directional-arrow glyph Relevance shows inside its own enlarged handle is added as a
 * background-image in index.css (`.wf-slate .react-flow__handle:hover`) — kept out of this
 * Tailwind class because a data-URI SVG survives much more reliably as a plain CSS rule than as a
 * Tailwind arbitrary-value string. The 44x44 invisible hit area (`::before`) is unchanged — the
 * clickable/draggable region was never actually the problem, only its visibility was. */
export const HANDLE_CLASS =
  "!w-2.5 !h-2.5 !bg-[var(--wf-dotmark,var(--primary))] !border-2 !border-white !rounded-full !cursor-crosshair !shadow-none transition-transform duration-150 hover:!scale-[2.6] focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-ring before:content-[''] before:absolute before:-inset-[17px] before:rounded-full";
