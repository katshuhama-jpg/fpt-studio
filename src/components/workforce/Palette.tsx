import { Bot, GripVertical, Headset, StickyNote, User } from "lucide-react";

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
 * Enter/Space activation and focus styling come for free; `draggable` still layers on top. */
export default function Palette({ onItemClick }: { onItemClick: (type: PaletteItemType) => void }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-end" style={{ gap: 30 }}>
      {ITEMS.map(item => (
        <div key={item.type} className="relative group">
          {/* Stacked-card shadow behind the item — signals "there's a card here to drag". */}
          <div className="absolute inset-0 rounded-xl bg-surface-muted border border-border translate-x-2 translate-y-2 transition-base group-hover:translate-x-2.5 group-hover:translate-y-2.5" />
          <div className="absolute inset-0 rounded-xl bg-white border border-border translate-x-1 translate-y-1 transition-base group-hover:translate-x-1.5 group-hover:translate-y-1.5" />

          <button
            type="button"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData(WORKFORCE_DRAG_MIME, item.type);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onItemClick(item.type)}
            aria-label={`Thêm ${item.label} vào canvas`}
            className="relative flex flex-col items-center gap-2 rounded-xl bg-white border border-border shadow-elev cursor-grab active:cursor-grabbing hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-pop transition-base select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ paddingTop: 18, paddingBottom: 18, paddingLeft: 26, paddingRight: 26 }}
          >
            <item.icon size={26} className="text-primary" />
            <span className="text-[15px] font-medium text-foreground text-center leading-tight whitespace-nowrap">{item.label}</span>
            <div className="max-h-0 opacity-0 group-hover:max-h-5 group-hover:opacity-100 group-hover:mt-0.5 overflow-hidden transition-all duration-200 flex items-center gap-1 text-[11px] font-medium text-primary whitespace-nowrap">
              <GripVertical size={11} /> Bấm hoặc kéo
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
