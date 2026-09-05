import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Category chips for a table cell — collapses beyond 3 into a "+N" chip with a tooltip
 * listing the rest, and wraps instead of forcing the row wider than the table. Shared by the
 * FAQ table and the import-preview results table so both look identical. */
export function CategoryChips({ categories }: { categories: string[] }) {
  if (categories.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const shown = categories.slice(0, 3);
  const rest = categories.slice(3);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(c => <span key={c} className="chip chip-muted text-[11px] px-1.5 py-0.5">{c}</span>)}
      {rest.length > 0 && (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild><span tabIndex={0} className="chip chip-muted text-[11px] px-1.5 py-0.5 outline-none cursor-default">+{rest.length}</span></TooltipTrigger>
          <TooltipContent>{rest.join(", ")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/** Two-line clamp with a title tooltip carrying the full text — used for the Câu hỏi/Câu trả
 * lời cells wherever a FAQ's full text needs to stay reachable without widening the table. */
export function TruncatedText({ text, className }: { text: string; className: string }) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild><p className={`${className} line-clamp-2 cursor-default`}>{text}</p></TooltipTrigger>
      <TooltipContent className="max-w-[320px]">{text}</TooltipContent>
    </Tooltip>
  );
}
