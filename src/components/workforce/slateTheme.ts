/** "Slate Enterprise" visual theme constants for the few pieces reactflow renders as raw
 * SVG/JS values (the canvas dot grid, connector line, endpoint dots, arrowhead) rather than
 * through className/CSS, so they can't read the `--wf-*` custom properties defined in
 * index.css under `.wf-slate`. Kept in one place and imported everywhere instead of repeating
 * the hex literals in Canvas.tsx / DeletableEdge.tsx / graphOps.ts. Every HTML-rendered part of
 * the canvas (node cards, top bar, palette, etc.) uses the CSS custom properties directly. */
// One step darker than the reference file's literal #E4E7EC — at the reference's own value the
// dots all but disappear against the #F7F8FA canvas once rendered as tiny (1-2px) reactflow SVG
// circles rather than the reference's own CSS radial-gradient, so the grid read as a flat blank
// canvas. Reuses --wf-cond-border (already in the palette) for a dot that's actually visible
// without turning the canvas busy.
export const WF_DOT_COLOR = "#D8DBE2";
export const WF_CONNECTOR_COLOR = "#8891A6";
export const WF_DOTMARK_COLOR = "#4650D6";
