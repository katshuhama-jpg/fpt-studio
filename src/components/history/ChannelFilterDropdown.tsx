import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CHANNEL_META, type ConversationChannel } from "./historyStore";
import ChannelLogo from "./ChannelLogo";
import { FILTER_WIDTH } from "./TimeRangeFilter";

/** Shared by every run-history screen (conversational Agent, External Agent) so the channel
 * list is sourced from one place and can never drift into two different sets. */
export function ChannelFilterDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = (Object.keys(CHANNEL_META) as ConversationChannel[]).map(id => ({ id, ...CHANNEL_META[id] }));
  const selected = options.find(o => o.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`h-9 ${FILTER_WIDTH} flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base`}
      >
        {selected && <ChannelLogo channel={selected.id} size={18} />}
        <span className="flex-1 min-w-0 truncate text-left">{selected ? selected.label : "All channels"}</span>
        <ChevronDown size={12} className={`text-muted-foreground shrink-0 transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] w-60 max-h-80 overflow-y-auto bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
          <button
            type="button"
            onClick={() => { onChange("all"); setOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${value === "all" ? "text-primary font-medium bg-primary-soft" : "text-foreground"}`}
          >
            All channels
          </button>
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${
                value === o.id ? "text-primary font-medium bg-primary-soft" : "text-foreground"
              }`}
            >
              <ChannelLogo channel={o.id} size={22} />
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
