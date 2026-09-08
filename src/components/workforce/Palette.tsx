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
 * Rendered as one segmented dock rather than a stack of individual draggable cards. */
export default function Palette({ onItemClick }: { onItemClick: (type: PaletteItemType) => void }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-stretch divide-x divide-border bg-white rounded-2xl border border-border shadow-elev p-1.5">
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
          className="group relative flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl cursor-grab active:cursor-grabbing hover:bg-surface-muted transition-base select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <item.icon size={21} className="text-primary" />
          <span className="text-[12.5px] font-medium text-foreground text-center leading-tight whitespace-nowrap">{item.label}</span>
          <div className="max-h-0 opacity-0 group-hover:max-h-4 group-hover:opacity-100 group-hover:mt-0.5 overflow-hidden transition-all duration-200 text-[10px] font-medium text-primary whitespace-nowrap">
            Bấm hoặc kéo
          </div>
        </button>
      ))}
    </div>
  );
}
