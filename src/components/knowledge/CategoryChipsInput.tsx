import { useRef, useState } from "react";
import { X } from "lucide-react";

export interface CategoryOption { name: string; count: number }

/** Category picker for a single FAQ — type + Enter to create a new category, or pick a
 * suggestion (existing categories used elsewhere in this KB, with a usage count) from a
 * dropdown that filters as you type. Reuse of an existing category is case-insensitive: typing
 * "bảo mật" when "Bảo mật" already exists reuses the original casing instead of creating a
 * second, near-duplicate category. */
export default function CategoryChipsInput({ value, onChange, options, maxCount, onMaxAttempt }: {
  value: string[];
  onChange: (next: string[]) => void;
  options: CategoryOption[];
  /** When set, further additions are silently refused once value.length reaches this — the
   * caller shows its own "max reached" message via onMaxAttempt rather than a per-chip error. */
  maxCount?: number;
  onMaxAttempt?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const atMax = maxCount !== undefined && value.length >= maxCount;

  const selectedLower = new Set(value.map(v => v.toLowerCase()));
  const q = draft.trim().toLowerCase();
  const suggestions = options
    .filter(o => !selectedLower.has(o.name.toLowerCase()) && (!q || o.name.toLowerCase().includes(q)))
    .slice(0, 8);

  const addCategory = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (atMax) { onMaxAttempt?.(); setDraft(""); return; }
    const existing = options.find(o => o.name.toLowerCase() === trimmed.toLowerCase());
    const name = existing ? existing.name : trimmed;
    if (selectedLower.has(name.toLowerCase())) { setDraft(""); return; }
    onChange([...value, name]);
    setDraft("");
  };

  const removeCategory = (name: string) => onChange(value.filter(v => v !== name));

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="rounded-lg border border-border bg-white px-2 py-1.5 flex flex-wrap gap-1.5 min-h-[42px] cursor-text focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-base"
      >
        {value.map(name => (
          <span key={name} className="inline-flex items-center gap-1 pl-2 pr-1 h-7 rounded-md text-xs bg-surface-muted text-foreground">
            {name}
            <button type="button" onClick={() => removeCategory(name)} aria-label={`Xóa ${name}`} className="hover:opacity-70">
              <X size={11} />
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory(draft); } }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={value.length === 0 ? "Nhập danh mục..." : undefined}
            className="flex-1 min-w-[120px] h-7 text-sm outline-none bg-transparent"
          />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] max-h-56 overflow-y-auto bg-white rounded-lg ring-1 ring-border shadow-elev z-30 p-1">
          {suggestions.map(o => (
            <button
              key={o.name}
              type="button"
              onMouseDown={e => { e.preventDefault(); addCategory(o.name); }}
              className="w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 rounded-md text-sm hover:bg-surface-muted transition-base"
            >
              <span className="truncate">{o.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{o.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
