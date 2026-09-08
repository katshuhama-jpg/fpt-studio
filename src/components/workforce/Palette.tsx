import { Bot, Headset, User, StickyNote } from "lucide-react";

export type PaletteItemType = "agent" | "omni" | "person" | "note";

const ITEMS: { type: PaletteItemType; label: string; icon: typeof Bot }[] = [
  { type: "agent", label: "Agent", icon: Bot },
  { type: "omni", label: "Omni Supports", icon: Headset },
  { type: "person", label: "Người trong Org", icon: User },
  { type: "note", label: "Ghi chú", icon: StickyNote },
];

export const WORKFORCE_DRAG_MIME = "application/x-workforce-node";

export default function Palette() {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white rounded-2xl border border-border shadow-elev p-1.5">
      {ITEMS.map(item => (
        <div
          key={item.type}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData(WORKFORCE_DRAG_MIME, item.type);
            e.dataTransfer.effectAllowed = "move";
          }}
          role="button"
          tabIndex={0}
          aria-label={`Kéo ${item.label} vào canvas`}
          className="flex flex-col items-center gap-1 w-20 py-2.5 rounded-xl cursor-grab active:cursor-grabbing hover:bg-surface-muted transition-base select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <item.icon size={16} className="text-primary" />
          <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
