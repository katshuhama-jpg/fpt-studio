import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Bot, Headset, User } from "lucide-react";
import type { PaletteItemType } from "./Palette";
import { useReturnFocusOnUnmount } from "./useReturnFocus";

export default function DestinationTypePopup({
  x, y, onPick, onDismiss,
}: {
  x: number;
  y: number;
  onPick: (type: Exclude<PaletteItemType, "note">) => void;
  onDismiss: () => void;
}) {
  useReturnFocusOnUnmount();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onDismiss]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onDismiss} />
      <div className="fixed z-50 w-52 rounded-lg border border-border bg-white shadow-elev py-1 animate-fade-up" style={{ left: x, top: y }}>
        <button onClick={() => onPick("agent")} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
          <Bot size={14} className="text-primary" /> Agent
        </button>
        <button onClick={() => onPick("omni")} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
          <Headset size={14} className="text-accent" /> Omni Supports
        </button>
        <button onClick={() => onPick("person")} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-surface-muted transition-base">
          <User size={14} className="text-primary" /> Người trong tổ chức
        </button>
      </div>
    </>,
    document.body,
  );
}
