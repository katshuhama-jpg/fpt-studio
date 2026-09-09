/** "Slate Enterprise" visual theme constants for the few pieces reactflow renders as raw
 * SVG/JS values (the canvas dot grid, connector line, endpoint dots, arrowhead) rather than
 * through className/CSS, so they can't read the `--wf-*` custom properties defined in
 * index.css under `.wf-slate`. Kept in one place and imported everywhere instead of repeating
 * the hex literals in Canvas.tsx / DeletableEdge.tsx / graphOps.ts. Every HTML-rendered part of
 * the canvas (node cards, top bar, palette, etc.) uses the CSS custom properties directly. */
export const WF_DOT_COLOR = "#E4E7EC";
export const WF_CONNECTOR_COLOR = "#8891A6";
export const WF_DOTMARK_COLOR = "#4650D6";
