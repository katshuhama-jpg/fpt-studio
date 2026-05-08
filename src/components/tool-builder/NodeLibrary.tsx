import { Zap, Globe, GitBranch, Repeat, Variable, BookOpen, Sparkles, FileSearch, Tag, ArrowRightCircle, type LucideIcon } from "lucide-react";
import type { NodeCategory, NodeKind } from "./types";

export interface NodeSpec {
  kind: NodeKind;
  label: string;
  description: string;
  category: NodeCategory;
  icon: LucideIcon;
  color: string; // semantic-token text class
  bg: string;    // semantic-token bg class
}

export const nodeSpecs: NodeSpec[] = [
  { kind: "trigger", label: "Agent call", description: "Run when the agent invokes this tool", category: "trigger", icon: Zap, color: "text-primary", bg: "bg-primary-soft" },
  { kind: "http", label: "HTTP request", description: "Call an external REST API", category: "data", icon: Globe, color: "text-info", bg: "bg-info/10" },
  { kind: "knowledge", label: "Knowledge lookup", description: "Search workspace knowledge", category: "data", icon: BookOpen, color: "text-info", bg: "bg-info/10" },
  { kind: "if", label: "If / Else", description: "Branch on a condition", category: "logic", icon: GitBranch, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "loop", label: "Loop", description: "Iterate over a list", category: "logic", icon: Repeat, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "setvar", label: "Set variable", description: "Store a value for later steps", category: "logic", icon: Variable, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "llm", label: "LLM prompt", description: "Generate text with an LLM", category: "ai", icon: Sparkles, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "extract", label: "Extract data", description: "Pull structured fields from text", category: "ai", icon: FileSearch, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "classify", label: "Classify", description: "Categorize input", category: "ai", icon: Tag, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "output", label: "Return", description: "Send result back to the agent", category: "output", icon: ArrowRightCircle, color: "text-success", bg: "bg-success/10" },
];

export const specByKind = (k: NodeKind) => nodeSpecs.find(s => s.kind === k)!;

export default function NodeLibrary() {
  const groups: { label: string; cat: NodeCategory }[] = [
    { label: "Trigger", cat: "trigger" },
    { label: "Data", cat: "data" },
    { label: "Logic", cat: "logic" },
    { label: "AI", cat: "ai" },
    { label: "Output", cat: "output" },
  ];

  const onDragStart = (e: React.DragEvent, kind: NodeKind) => {
    e.dataTransfer.setData("application/x-tool-node", kind);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-[240px] border-r border-border bg-surface overflow-y-auto shrink-0">
      <div className="p-3 space-y-5">
        {groups.map(g => (
          <div key={g.cat}>
            <div className="px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="space-y-1.5">
              {nodeSpecs.filter(s => s.category === g.cat).map(s => (
                <div
                  key={s.kind}
                  draggable
                  onDragStart={(e) => onDragStart(e, s.kind)}
                  className="group flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-surface hover:border-primary/40 hover:shadow-soft transition-base cursor-grab active:cursor-grabbing"
                >
                  <div className={`w-7 h-7 rounded-md ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                    <s.icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium leading-tight truncate">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight truncate">{s.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
