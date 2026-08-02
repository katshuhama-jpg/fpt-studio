import { useState } from "react";
import { Puzzle, BookOpen, Plus, Search, LayoutGrid, List, ChevronDown } from "lucide-react";

export default function Skills() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("All Skills");
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = ["All Skills", "My Skills", "From Library"];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-surface shrink-0">
        <div>
          <h1 className="text-xl font-semibold font-display flex items-center gap-2">
            <Puzzle size={20} className="text-primary" />
            Skills
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Skills shared across all agents in this workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5">
            <BookOpen size={14} />
            Browse Library
          </button>
          <button className="btn-primary flex items-center gap-1.5">
            <Plus size={14} />
            Create Skill
            <ChevronDown size={13} className="opacity-70" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-border bg-background shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search…"
            className="h-9 w-full pl-9 pr-3 rounded-lg bg-surface border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(v => !v)}
            onBlur={() => setTimeout(() => setFilterOpen(false), 150)}
            className="h-9 flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
          >
            <span className="text-muted-foreground">≡</span>
            {filter}
            <ChevronDown size={13} className={`text-muted-foreground transition-base ${filterOpen ? "rotate-180" : ""}`} />
          </button>
          {filterOpen && (
            <div className="absolute left-0 top-[calc(100%+4px)] w-44 bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setFilterOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${filter === f ? "text-primary font-medium" : "text-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-surface border border-border">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-base ${view === "grid" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-md transition-base ${view === "list" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="List view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-5 border border-primary/15">
          <Puzzle size={26} />
        </div>
        <h2 className="font-display text-xl font-semibold mb-2">No skills yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Skills teach your agents how to handle specific tasks. Create your own, or browse pre-built templates from the skill library.
        </p>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-1.5">
            <BookOpen size={14} />
            Browse Library
          </button>
          <button className="btn-primary flex items-center gap-1.5">
            <Plus size={14} />
            Create Skill
          </button>
        </div>
      </div>
    </div>
  );
}
