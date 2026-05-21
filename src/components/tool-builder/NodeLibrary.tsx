import {
  Zap, Globe, GitBranch, Repeat, Variable, BookOpen, Sparkles, FileSearch, Tag,
  ArrowRightCircle, Network, Wand2, Filter, Code2, Layers, FileText, Bot,
  FileInput, RotateCw, Edit3, Database, Wrench, Workflow,
  type LucideIcon,
} from "lucide-react";
import type { NodeCategory, NodeKind } from "./types";

export interface NodeSpec {
  kind: NodeKind;
  label: string;
  description: string;
  category: NodeCategory;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const nodeSpecs: NodeSpec[] = [
  { kind: "trigger", label: "Start", description: "Define the workflow's input variables.", category: "trigger", icon: Zap, color: "text-primary", bg: "bg-primary-soft" },
  { kind: "output", label: "End", description: "Define the workflow's output variables.", category: "output", icon: ArrowRightCircle, color: "text-success", bg: "bg-success/10" },

  { kind: "classifier", label: "Question Classifier", description: "Classify the question into branches with an LLM.", category: "ai", icon: Tag, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "rewriter", label: "Question Rewriter", description: "Rewrite the user's question from history.", category: "ai", icon: Wand2, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "query_processor", label: "Query Processor", description: "Pre-process the query (synonym mapping).", category: "ai", icon: FileSearch, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "llm", label: "LLM", description: "Use an LLM to process info, classify, or answer.", category: "ai", icon: Sparkles, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "param_extractor", label: "Parameter Extractor", description: "Extract variables from text with an LLM.", category: "ai", icon: FileSearch, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "agent", label: "Agent", description: "LLM-driven agent that auto-picks tools.", category: "ai", icon: Bot, color: "text-accent", bg: "bg-accent-soft" },

  { kind: "knowledge", label: "Knowledge Retrieval", description: "Retrieve relevant info from the knowledge base.", category: "knowledge", icon: BookOpen, color: "text-info", bg: "bg-info/10" },
  { kind: "hkg_retrieval", label: "H-KG Retrieval", description: "Retrieve from a hierarchical knowledge graph.", category: "knowledge", icon: Network, color: "text-info", bg: "bg-info/10" },
  { kind: "ref_filter", label: "Reference Filter", description: "Filter references to reduce noise.", category: "knowledge", icon: Filter, color: "text-info", bg: "bg-info/10" },
  { kind: "knowledge_lookup", label: "Knowledge Lookup", description: "Fetch files by id or list by name.", category: "knowledge", icon: Database, color: "text-info", bg: "bg-info/10" },
  { kind: "file_parser", label: "File Parser", description: "Extract content from uploaded files.", category: "knowledge", icon: FileInput, color: "text-info", bg: "bg-info/10" },

  { kind: "if", label: "If / Else", description: "Branch on a condition.", category: "logic", icon: GitBranch, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "iteration", label: "Iteration", description: "Group nodes into a loop (independent).", category: "logic", icon: Layers, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "loop_node", label: "Loop", description: "Repeat tasks with state across iterations.", category: "logic", icon: RotateCw, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "code", label: "Code", description: "Run custom Python logic.", category: "logic", icon: Code2, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "var_agg", label: "Variable Aggregator", description: "Merge branches with shared variables.", category: "logic", icon: Variable, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "var_assigner", label: "Variable Assigner", description: "Assign values to writable variables.", category: "logic", icon: Edit3, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "template", label: "Template", description: "Compose content with text and variables.", category: "logic", icon: FileText, color: "text-warning", bg: "bg-warning-soft" },

  { kind: "http", label: "HTTP Request", description: "Send an HTTP request to an external API.", category: "data", icon: Globe, color: "text-info", bg: "bg-info/10" },
  { kind: "tool_call", label: "Tool", description: "Call a Custom or MCP tool.", category: "tools", icon: Wrench, color: "text-primary", bg: "bg-primary-soft" },
  { kind: "task_call", label: "Task", description: "Call another saved Task as a sub-workflow.", category: "tools", icon: Workflow, color: "text-primary", bg: "bg-primary-soft" },

  // Legacy aliases (kept for old saved graphs)
  { kind: "loop", label: "Loop (legacy)", description: "Iterate over a list.", category: "logic", icon: Repeat, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "setvar", label: "Set variable", description: "Store a value.", category: "logic", icon: Variable, color: "text-warning", bg: "bg-warning-soft" },
  { kind: "extract", label: "Extract data", description: "Pull structured fields from text.", category: "ai", icon: FileSearch, color: "text-accent", bg: "bg-accent-soft" },
  { kind: "classify", label: "Classify", description: "Categorize input.", category: "ai", icon: Tag, color: "text-accent", bg: "bg-accent-soft" },
];

export const specByKind = (k: NodeKind) => nodeSpecs.find(s => s.kind === k) ?? nodeSpecs[0];

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
