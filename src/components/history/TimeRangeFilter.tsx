import { useState } from "react";
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/** Shared by every run-history screen (conversational Agent, External Agent) so "Custom range"
 * behaves identically everywhere instead of drifting into screen-specific reimplementations. */
export const FILTER_WIDTH = "w-[225px]";

export type TimeFilter = "all" | "today" | "7d" | "30d" | "custom";
export const TIME_PRESETS: { id: TimeFilter; name: string }[] = [
  { id: "all", name: "All time" },
  { id: "today", name: "Today" },
  { id: "7d", name: "Last 7 days" },
  { id: "30d", name: "Last 30 days" },
];

/** Time filter — presets, plus a Custom option that opens a two-month range calendar. */
export function TimeRangeFilter({
  value, customRange, onPreset, onApplyCustom,
}: {
  value: TimeFilter;
  customRange: DateRange | undefined;
  onPreset: (id: TimeFilter) => void;
  onApplyCustom: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(customRange);

  const label =
    value === "custom" && customRange?.from && customRange?.to
      ? `${format(customRange.from, "dd/MM/yyyy")} → ${format(customRange.to, "dd/MM/yyyy")}`
      : TIME_PRESETS.find(o => o.id === value)?.name ?? "All time";

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (v) setDraftRange(customRange); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`h-9 ${FILTER_WIDTH} flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base`}
        >
          <CalendarIcon size={13} className="text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0 truncate text-left">{label}</span>
          <ChevronDown size={12} className={`text-muted-foreground shrink-0 transition-base ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex">
          <div className="flex flex-col p-1.5 border-r border-border w-40 shrink-0">
            {TIME_PRESETS.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onPreset(o.id); setOpen(false); }}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${
                  value === o.id ? "bg-primary-soft text-primary font-medium" : "text-foreground"
                }`}
              >
                {o.name}
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            <div className={`text-left px-3 py-2 rounded-lg text-sm ${value === "custom" ? "bg-primary-soft text-primary font-medium" : "text-muted-foreground"}`}>
              Custom range
            </div>
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={draftRange}
              onSelect={setDraftRange}
              defaultMonth={draftRange?.from}
            />
            <div className="flex items-center justify-between gap-3 px-1 pb-1">
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {draftRange?.from ? format(draftRange.from, "dd/MM/yyyy") : "Start date"}
                {" → "}
                {draftRange?.to ? format(draftRange.to, "dd/MM/yyyy") : "End date"}
              </div>
              <button
                type="button"
                disabled={!draftRange?.from || !draftRange?.to}
                onClick={() => { if (draftRange?.from && draftRange?.to) { onApplyCustom(draftRange); setOpen(false); } }}
                className="btn-primary h-8 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
