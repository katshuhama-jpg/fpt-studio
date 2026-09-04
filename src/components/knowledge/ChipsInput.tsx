import { useState } from "react";
import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface Chip { value: string; error?: string }

/** Generic chips input — type + Enter to commit, paste multiple (newline/comma separated),
 * each chip can carry a validation error (rendered red with a title tooltip). Shared by every
 * "Danh sách URL" / "Bao gồm đường dẫn" / "Loại trừ đường dẫn" / xpath field across the Add
 * URL modal's three tabs. */
export default function ChipsInput({ chips, onChange, placeholder, validate }: {
  chips: Chip[];
  onChange: (next: Chip[]) => void;
  placeholder?: string;
  validate?: (value: string, existing: string[]) => string | undefined;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw.split(/[\n,]/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...chips];
    for (const value of parts) {
      const error = validate?.(value, next.map(c => c.value));
      next.push({ value, error });
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div className="rounded-lg border border-border bg-white px-2 py-1.5 flex flex-wrap gap-1.5 min-h-[42px] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-base">
      {chips.map((c, i) => {
        const chip = (
          <span
            tabIndex={c.error ? 0 : undefined}
            className={`inline-flex items-center gap-1 pl-2 pr-1 h-7 rounded-md text-xs font-mono outline-none ${c.error ? "bg-[hsl(var(--destructive-soft))] text-destructive focus-visible:ring-2 focus-visible:ring-destructive/40" : "bg-surface-muted text-foreground"}`}
          >
            {c.value}
            <button type="button" onClick={() => onChange(chips.filter((_, ci) => ci !== i))} aria-label={`Xóa ${c.value}`} className="hover:opacity-70">
              <X size={11} />
            </button>
          </span>
        );
        if (!c.error) return <span key={i}>{chip}</span>;
        return (
          <Tooltip key={i} delayDuration={200}>
            <TooltipTrigger asChild>{chip}</TooltipTrigger>
            <TooltipContent>{c.error}</TooltipContent>
          </Tooltip>
        );
      })}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(draft); } }}
        onPaste={e => {
          const text = e.clipboardData.getData("text");
          if (text.includes("\n") || text.includes(",")) { e.preventDefault(); commit(text); }
        }}
        onBlur={() => { if (draft.trim()) commit(draft); }}
        placeholder={chips.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[120px] h-7 text-sm outline-none bg-transparent"
      />
    </div>
  );
}
