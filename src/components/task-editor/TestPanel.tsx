import { useMemo, useState } from "react";
import { X, Play, ArrowRight, CheckCircle2 } from "lucide-react";
import type { ToolNode, ToolEdge } from "@/components/tool-builder/types";
import { specByKind } from "@/components/tool-builder/NodeLibrary";

interface Props {
  open: boolean;
  onClose: () => void;
  nodes: ToolNode[];
  edges: ToolEdge[];
}

function topo(nodes: ToolNode[], edges: ToolEdge[]) {
  const indeg = new Map(nodes.map(n => [n.id, 0]));
  edges.forEach(e => indeg.set(e.target, (indeg.get(e.target) || 0) + 1));
  const q = nodes.filter(n => (indeg.get(n.id) || 0) === 0).map(n => n.id);
  const out: ToolNode[] = [];
  while (q.length) {
    const id = q.shift()!;
    const n = nodes.find(x => x.id === id);
    if (n) out.push(n);
    edges.filter(e => e.source === id).forEach(e => {
      const d = (indeg.get(e.target) || 0) - 1;
      indeg.set(e.target, d);
      if (d === 0) q.push(e.target);
    });
  }
  return out;
}

export default function TestPanel({ open, onClose, nodes, edges }: Props) {
  const startNode = useMemo(() => nodes.find(n => n.data.kind === "trigger"), [nodes]);
  const variables: any[] = startNode?.data.config?.variables || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [trace, setTrace] = useState<{ id: string; label: string; in: any; out: any; ms: number }[] | null>(null);
  const [running, setRunning] = useState(false);

  if (!open) return null;

  const run = () => {
    setRunning(true);
    setTrace(null);
    setTimeout(() => {
      const order = topo(nodes, edges);
      const result = order.map((n, i) => ({
        id: n.id,
        label: n.data.label || specByKind(n.data.kind).label,
        in: i === 0 ? values : { from: order[i - 1]?.data.label },
        out: mockOut(n.data.kind),
        ms: 80 + Math.floor(Math.random() * 320),
      }));
      setTrace(result);
      setRunning(false);
    }, 700);
  };

  return (
    <aside className="w-[420px] border-l border-border bg-surface flex flex-col shrink-0 h-full">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center"><Play size={13} /></div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">Test run</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Mock execution</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Input variables</div>
        {variables.length === 0 ? (
          <p className="text-xs text-muted-foreground italic mb-3">No input variables defined in the Start node. Run will use system defaults.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {variables.map((v, i) => (
              <div key={i}>
                <label className="block text-xs font-medium mb-1">{v.name}{v.required && <span className="text-destructive ml-0.5">*</span>} <span className="text-muted-foreground">({v.type})</span></label>
                <input
                  value={values[v.name] || ""}
                  onChange={e => setValues({ ...values, [v.name]: e.target.value })}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        )}
        <button onClick={run} disabled={running} className="btn-primary h-9 w-full">
          <Play size={13} /> {running ? "Running…" : "Start run"}
        </button>

        {trace && (
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <CheckCircle2 size={11} className="text-accent" /> Trace ({trace.length} steps)
            </div>
            <ol className="space-y-2">
              {trace.map((t, i) => (
                <li key={t.id} className="rounded-lg border border-border p-2.5 bg-surface">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-4 h-4 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <span className="font-semibold">{t.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{t.ms}ms</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    <div><span className="font-mono">in:</span> <code className="text-foreground/80">{JSON.stringify(t.in)}</code></div>
                    <div className="flex items-center gap-1"><ArrowRight size={9} /><span className="font-mono">out:</span> <code className="text-foreground/80">{JSON.stringify(t.out)}</code></div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </aside>
  );
}

function mockOut(kind: string): any {
  switch (kind) {
    case "knowledge": return { documents: [{ title: "FAQ.pdf", score: 0.87 }] };
    case "llm": return { text: "Sample answer." };
    case "if": return { branch: "IF" };
    case "http": return { status_code: 200, body: { ok: true } };
    case "output": return { final_answer: "Done." };
    default: return { ok: true };
  }
}
