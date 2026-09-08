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
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center bg-white rounded-2xl border border-border shadow-elev p-2" style={{ gap: 30 }}>
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
          className="flex flex-col items-center gap-2 rounded-xl cursor-grab active:cursor-grabbing hover:bg-surface-muted transition-base select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ paddingTop: 18, paddingBottom: 18, paddingLeft: 26, paddingRight: 26 }}
        >
          <item.icon size={26} className="text-primary" />
          <span className="text-[15px] font-semibold text-foreground text-center leading-tight whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
