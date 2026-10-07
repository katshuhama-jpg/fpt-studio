import { useState } from "react";
import { ChevronDown, ThumbsUp, ThumbsDown, MessageSquareOff, MessagesSquare } from "lucide-react";
import { FILTER_WIDTH } from "./TimeRangeFilter";
import type { ConversationRecord } from "./historyStore";

export type FeedbackFilter = "all" | "down" | "up" | "any" | "none";

export const FEEDBACK_FILTERS: { id: FeedbackFilter; label: string; icon?: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "all", label: "All feedback" },
  { id: "down", label: "Has dislike", icon: ThumbsDown },
  { id: "up", label: "Has like", icon: ThumbsUp },
  { id: "any", label: "Has any feedback", icon: MessagesSquare },
  { id: "none", label: "No feedback", icon: MessageSquareOff },
];

/** Users rate individual agent messages (bubbles), so a conversation matches "Has dislike" as
 * soon as any one of its agent messages was disliked. */
export function matchesFeedback(c: ConversationRecord, f: FeedbackFilter): boolean {
  if (f === "all") return true;
  const rated = c.messages.filter(m => m.role === "agent" && m.feedback);
  if (f === "none") return rated.length === 0;
  if (f === "any") return rated.length > 0;
  return rated.some(m => m.feedback === f);
}

/** Same trigger/menu look as ChannelFilterDropdown so the filter row reads as one set. */
export function FeedbackFilterDropdown({ value, onChange }: { value: FeedbackFilter; onChange: (v: FeedbackFilter) => void }) {
  const [open, setOpen] = useState(false);
  const selected = FEEDBACK_FILTERS.find(o => o.id === value) ?? FEEDBACK_FILTERS[0];
  const SelIcon = selected.icon;

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Feedback filter: ${selected.label}`}
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`h-9 ${FILTER_WIDTH} flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base focus-ring`}
      >
        {SelIcon && <SelIcon size={14} className={value === "down" ? "text-destructive" : "text-muted-foreground"} />}
        <span className="flex-1 min-w-0 truncate text-left">{selected.label}</span>
        <ChevronDown size={12} className={`text-muted-foreground shrink-0 transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-[calc(100%+4px)] w-60 bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
          {FEEDBACK_FILTERS.map(o => {
            const Icon = o.icon;
            const active = value === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(o.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${
                  active ? "text-primary font-medium bg-primary-soft" : "text-foreground"
                }`}
              >
                {Icon ? <Icon size={14} className={o.id === "down" ? "text-destructive" : "text-muted-foreground"} /> : <span className="w-[14px]" />}
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
