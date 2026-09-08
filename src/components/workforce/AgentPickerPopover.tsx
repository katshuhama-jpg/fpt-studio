import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AGENTS } from "@/components/configure/agentStore";
import { useReturnFocus } from "./useReturnFocus";

export default function AgentPickerPopover({
  open, title = "Chọn Agent", excludeAgentId, onClose, onSelect,
}: {
  open: boolean;
  title?: string;
  excludeAgentId?: string;
  onClose: () => void;
  onSelect: (agentId: string) => void;
}) {
  const [search, setSearch] = useState("");
  useReturnFocus(open);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const filtered = AGENTS.filter(a => !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-fade-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm Agent..."
              className="h-9 w-full pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy Agent phù hợp.</p>
          ) : (
            filtered.map(a => {
              const disabled = a.id === excludeAgentId;
              const row = (
                <button
                  key={a.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onSelect(a.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-base ${
                    disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-muted"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${a.bg}`}>{a.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
                  </div>
                  <span className={`chip shrink-0 ${a.status === "Published" ? "chip-success" : "chip-muted"}`}>{a.status}</span>
                </button>
              );
              return disabled ? (
                <Tooltip key={a.id} delayDuration={200}>
                  <TooltipTrigger asChild><span>{row}</span></TooltipTrigger>
                  <TooltipContent>Không thể chọn chính Agent đang là nguồn của route này.</TooltipContent>
                </Tooltip>
              ) : row;
            })
          )}
        </div>
        <div className="px-5 py-3 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">
            Không tìm thấy Agent bạn cần? Tạo Agent mới trong mục{" "}
            <a href="/agents" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
              Agents
            </a>{" "}
            trước, sau đó quay lại đây.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
