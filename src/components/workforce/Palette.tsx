import { Bot, Headset, StickyNote, User, Zap } from "lucide-react";

export type PaletteItemType = "agent" | "omni" | "trigger" | "person" | "note";

const ITEMS: { type: PaletteItemType; label: string; icon: typeof Bot; accent: string; accentBg: string }[] = [
  { type: "agent", label: "Agent", icon: Bot, accent: "var(--wf-agent)", accentBg: "var(--wf-agent-bg)" },
  { type: "omni", label: "Omni Supports", icon: Headset, accent: "var(--wf-omni)", accentBg: "var(--wf-omni-bg)" },
  { type: "trigger", label: "Trigger", icon: Zap, accent: "var(--wf-trigger)", accentBg: "var(--wf-trigger-bg)" },
  { type: "person", label: "Người trong tổ chức", icon: User, accent: "var(--wf-person)", accentBg: "var(--wf-person-bg)" },
  { type: "note", label: "Ghi chú", icon: StickyNote, accent: "var(--wf-muted)", accentBg: "#EEF0F3" },
];
// Condition isn't draggable/clickable from the palette (it's auto-inserted on a connection, per
// S8/S9) — kept out of ITEMS.

export const WORKFORCE_DRAG_MIME = "application/x-workforce-node";

/** Every item supports both drag-drop (onto a specific canvas point) and a plain click/keyboard
 * activation (added at a computed default position, see `getClickAddPosition` in Canvas.tsx) —
 * two fully equivalent ways in, not click as an afterthought. Real `<button>` elements so
 * Enter/Space activation and focus styling come for free; `draggable` still layers on top.
 *
 * Each item renders as a small tinted "card" with two faint duplicate cards peeking out behind
 * it (an offset-stack effect, like a deck of draggable cards) instead of a flat toolbar row —
 * matching the reference canvas's own palette. Still one continuous dock along the bottom edge
 * (hairline top border) so it doesn't read as loose floating chips. */
export default function Palette({ onItemClick }: { onItemClick: (type: PaletteItemType) => void }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center"
      style={{ gap: 22, padding: "18px 20px 14px", background: "var(--wf-surface)", borderTop: "1px solid var(--wf-border)" }}
    >
      {ITEMS.map(item => (
        <button
          key={item.type}
          type="button"
          draggable
          onDragStart={e => {
            e.dataTransfer.setData(WORKFORCE_DRAG_MIME, item.type);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => onItemClick(item.type)}
          aria-label={`Thêm ${item.label} vào canvas`}
          className="relative flex items-center min-h-[44px] cursor-grab active:cursor-grabbing select-none group focus-visible:outline-none"
          style={{ marginTop: 6, marginBottom: 2 }}
        >
          {/* Two faint stacked "cards" behind the real one — pure decoration, aria-hidden. */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg transition-transform duration-150 group-hover:translate-x-[3px] group-hover:translate-y-[3px]"
            style={{ background: "var(--wf-surface)", border: "1px solid var(--wf-border)", transform: "translate(5px, 5px)" }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-lg transition-transform duration-150 group-hover:translate-x-[1.5px] group-hover:translate-y-[1.5px]"
            style={{ background: "var(--wf-surface)", border: "1px solid var(--wf-border)", transform: "translate(2.5px, 2.5px)" }}
          />
          <span
            className="relative flex items-center rounded-lg transition-base group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2"
            style={{
              gap: 7,
              padding: "9px 14px",
              background: item.accentBg,
              border: "1px solid var(--wf-border)",
              boxShadow: "0 1px 2px rgba(20,22,30,0.05)",
            }}
          >
            <item.icon size={15} style={{ color: item.accent }} />
            <span
              className="text-[13px] font-semibold whitespace-nowrap [font-family:var(--wf-font-display)]"
              style={{ color: item.accent }}
            >
              {item.label}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
