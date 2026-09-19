import { Bot, Boxes, Headset, StickyNote, User, Wrench, Zap } from "lucide-react";

export type PaletteItemType = "agent" | "omni" | "trigger" | "person" | "note" | "tool" | "subprocess";

const ITEMS: { type: PaletteItemType; label: string; icon: typeof Bot; accent: string; accentBg: string }[] = [
  { type: "agent", label: "Agent", icon: Bot, accent: "var(--wf-agent)", accentBg: "var(--wf-agent-bg)" },
  { type: "omni", label: "Omni Supports", icon: Headset, accent: "var(--wf-omni)", accentBg: "var(--wf-omni-bg)" },
  { type: "trigger", label: "Trigger", icon: Zap, accent: "var(--wf-trigger)", accentBg: "var(--wf-trigger-bg)" },
  { type: "tool", label: "Tool", icon: Wrench, accent: "var(--wf-tool)", accentBg: "var(--wf-tool-bg)" },
  { type: "subprocess", label: "Sub-process", icon: Boxes, accent: "var(--wf-subprocess)", accentBg: "var(--wf-subprocess-bg)" },
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
 * Each item is a single flat tinted chip (icon + label) — no border, no resting shadow, just the
 * type's own tint color and a slightly larger radius: the plainest, cleanest read of the three
 * options tried (dropped the neutral gray border that made every chip look boxed-in regardless of
 * its color). A chip only gains a shadow + lifts a couple px on hover, so the flat rest state stays
 * calm and the affordance still shows up the moment it matters. Still one continuous dock along
 * the bottom edge (hairline top border on the dock itself) so it doesn't read as loose chips. */
export default function Palette({ onItemClick }: { onItemClick: (type: PaletteItemType) => void }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center"
      style={{ gap: 10, padding: "16px 20px", background: "var(--wf-surface)", borderTop: "1px solid var(--wf-border)" }}
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
          className="flex items-center min-h-[44px] cursor-pointer select-none transition-base hover:-translate-y-[2px] hover:shadow-[0_4px_10px_-2px_rgba(20,22,30,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{
            gap: 7,
            padding: "10px 14px",
            background: item.accentBg,
            border: "none",
            borderRadius: 11,
          }}
        >
          <item.icon size={15} style={{ color: item.accent }} />
          <span
            className="text-[13px] font-semibold whitespace-nowrap [font-family:var(--wf-font-display)]"
            style={{ color: item.accent }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
