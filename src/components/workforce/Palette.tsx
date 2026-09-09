import { Bot, Headset, StickyNote, User } from "lucide-react";

export type PaletteItemType = "agent" | "omni" | "person" | "note";

const ITEMS: { type: PaletteItemType; label: string; icon: typeof Bot }[] = [
  { type: "agent", label: "Agent", icon: Bot },
  { type: "omni", label: "Omni Supports", icon: Headset },
  { type: "person", label: "Người trong tổ chức", icon: User },
  { type: "note", label: "Ghi chú", icon: StickyNote },
];

export const WORKFORCE_DRAG_MIME = "application/x-workforce-node";

/** Every item supports both drag-drop (onto a specific canvas point) and a plain click/keyboard
 * activation (added at a computed default position, see `getClickAddPosition` in Canvas.tsx) —
 * two fully equivalent ways in, not click as an afterthought. Real `<button>` elements so
 * Enter/Space activation and focus styling come for free; `draggable` still layers on top.
 * Docked as a full-width bottom bar (hairline top border, no shadow/rounding) mirroring the top
 * bar, rather than a floating pill — per the "Slate Enterprise" reference. */
export default function Palette({ onItemClick }: { onItemClick: (type: PaletteItemType) => void }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center"
      style={{ gap: 26, padding: "14px 20px", background: "var(--wf-surface)", borderTop: "1px solid var(--wf-border)" }}
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
          className="flex items-center min-h-[44px] -my-[7px] px-1.5 cursor-grab active:cursor-grabbing select-none transition-base hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          style={{ gap: 7 }}
        >
          <item.icon size={15} style={{ color: item.type === "agent" ? "var(--wf-agent)" : "var(--wf-muted)" }} />
          <span
            className="text-[13px] font-semibold whitespace-nowrap [font-family:var(--wf-font-display)]"
            style={{ color: "var(--wf-text)" }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
