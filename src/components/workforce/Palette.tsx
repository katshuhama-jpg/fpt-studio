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
 * A slim single-row toolbar (icon inline with label, not stacked) rather than a bank of big
 * app-icon-style tiles — sized like a real dock, not an empty state's call-to-action. */
export default function Palette({ onItemClick }: { onItemClick: (type: PaletteItemType) => void }) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center divide-x divide-border/70 bg-white rounded-xl border border-border shadow-elev p-1">
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
          className="flex items-center gap-1.5 h-9 min-h-[44px] min-w-[44px] -m-[3.5px] px-3 rounded-lg cursor-grab active:cursor-grabbing hover:bg-surface-muted transition-base select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <item.icon size={15} className="text-primary shrink-0" />
          <span className="text-[12px] font-medium text-foreground leading-none whitespace-nowrap">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
