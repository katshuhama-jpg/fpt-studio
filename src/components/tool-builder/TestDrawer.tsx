import { CheckCircle2, Clock, Loader2, Play, X } from "lucide-react";
import { useState } from "react";
import type { ToolNode, ToolEdge } from "./types";
import { specByKind } from "./NodeLibrary";

interface TestDrawerProps {
  open: boolean;
  onClose: () => void;
  nodes: ToolNode[];
  edges: ToolEdge[];
}

interface Step {
  id: string;
  label: string;
  kind: ToolNode["data"]["kind"];
  duration: number;
  output: string;
}

function topoSort(nodes: ToolNode[], edges: ToolEdge[]): ToolNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const incoming = new Map<string, number>();
  nodes.forEach(n => incoming.set(n.id, 0));
  edges.forEach(e => incoming.set(e.target, (incoming.get(e.target) || 0) + 1));
  const queue = nodes.filter(n => (incoming.get(n.id) || 0) === 0).map(n => n.id);
  const result: ToolNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const n = byId.get(id);
    if (n) result.push(n);
    edges.filter(e => e.source === id).forEach(e => {
      const next = (incoming.get(e.target) || 0) - 1;
      incoming.set(e.target, next);
      if (next === 0) queue.push(e.target);
    });
  }
  return result.length ? result : nodes;
}

export default function TestDrawer({ open, onClose, nodes, edges }: TestDrawerProps) {
  const [input, setInput] = useState('{\n  "phone": "0901234567"\n}');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const run = async () => {
    setRunning(true);
    setSteps([]);
    const order = topoSort(nodes, edges);
    for (const n of order) {
      await new Promise(r => setTimeout(r, 350));
      setSteps(prev => [...prev, {
        id: n.id,
        label: n.data.label,
        kind: n.data.kind,
        duration: Math.round(80 + Math.random() * 320),
        output: mockOutput(n),
      }]);
    }
    setRunning(false);
  };

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 h-[320px] bg-surface border-t border-border shadow-elev z-20 flex flex-col animate-fade-up">
      <div className="h-11 px-4 border-b border-border flex items-center gap-2 shrink-0">
        <Play size={13} className="text-primary" />
        <div className="text-sm font-semibold flex-1">Test run</div>
        <button
          onClick={run}
          disabled={running || nodes.length === 0}
          className="btn-primary h-8 px-3 text-xs disabled:opacity-50"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {running ? "Running…" : "Run"}
        </button>
        <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-[320px] border-r border-border p-3 flex flex-col">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Input</div>
          <textarea
            className="ds-textarea flex-1 font-mono text-[11px] resize-none"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {steps.length === 0 && !running && (
            <div className="text-center text-sm text-muted-foreground mt-10">
              Click <b>Run</b> to execute the workflow with the input on the left. Steps will appear here in order.
            </div>
          )}
          {steps.map((s, i) => {
            const spec = specByKind(s.kind);
            return (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-muted/40">
                <div className={`w-7 h-7 rounded-md ${spec.bg} ${spec.color} flex items-center justify-center shrink-0`}>
                  <spec.icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold">{i + 1}. {s.label}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={9} />{s.duration}ms</span>
                    <CheckCircle2 size={11} className="text-success" />
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-muted-foreground bg-surface border border-border rounded px-2 py-1 line-clamp-2">
                    {s.output}
                  </div>
                </div>
              </div>
            );
          })}
          {running && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-2"><Loader2 size={11} className="animate-spin" /> running…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function mockOutput(n: ToolNode): string {
  switch (n.data.kind) {
    case "trigger": return "input received";
    case "http": return `${n.data.config?.method || "GET"} ${n.data.config?.url || "(url)"} → 200 OK`;
    case "if": return `condition (${n.data.config?.condition || "—"}) → true`;
    case "knowledge": return `retrieved ${n.data.config?.topK || 4} chunks`;
    case "llm": return "model returned 142 tokens";
    case "extract": return "{ name: 'Nguyen V.', amount: 1500000 }";
    case "classify": return n.data.config?.categories?.split(",")[0]?.trim() || "label_a";
    case "output": return "returned to agent ✓";
    default: return "ok";
  }
}
