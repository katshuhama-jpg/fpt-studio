import { Trash2 } from "lucide-react";
import type { ToolNode } from "./types";
import { specByKind } from "./NodeLibrary";

interface InspectorProps {
  node: ToolNode | null;
  onChange: (id: string, patch: Partial<ToolNode["data"]>) => void;
  onDelete: (id: string) => void;
}

export default function Inspector({ node, onChange, onDelete }: InspectorProps) {
  if (!node) {
    return (
      <aside className="w-[320px] border-l border-border bg-surface shrink-0 p-6 text-center text-sm text-muted-foreground">
        <div className="mt-10">
          <div className="font-semibold text-foreground mb-1">No node selected</div>
          <div>Click a node on the canvas to edit it, or drag from the library on the left to add a new one.</div>
        </div>
      </aside>
    );
  }

  const spec = specByKind(node.data.kind);
  const cfg = node.data.config || {};
  const setCfg = (patch: Record<string, any>) =>
    onChange(node.id, { config: { ...cfg, ...patch } });

  return (
    <aside className="w-[320px] border-l border-border bg-surface flex flex-col shrink-0">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className={`w-7 h-7 rounded-md ${spec.bg} ${spec.color} flex items-center justify-center`}>
          <spec.icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">{spec.label}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{spec.category}</div>
        </div>
        <button
          onClick={() => onDelete(node.id)}
          className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-base"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Field label="Step name">
          <input
            className="ds-input"
            value={node.data.label}
            onChange={e => onChange(node.id, { label: e.target.value })}
          />
        </Field>

        {node.data.kind === "trigger" && (
          <Field label="Input schema (JSON)">
            <textarea
              className="ds-textarea min-h-[120px] font-mono text-[11px]"
              placeholder={'{ "phone": "string" }'}
              value={cfg.schema || ""}
              onChange={e => setCfg({ schema: e.target.value })}
            />
          </Field>
        )}

        {node.data.kind === "http" && (
          <>
            <Field label="Method">
              <select className="ds-input" value={cfg.method || "GET"} onChange={e => setCfg({ method: e.target.value })}>
                <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
              </select>
            </Field>
            <Field label="URL">
              <input className="ds-input font-mono text-[12px]" placeholder="https://api.example.com/v1/customers" value={cfg.url || ""} onChange={e => setCfg({ url: e.target.value })} />
            </Field>
            <Field label="Headers (JSON)">
              <textarea className="ds-textarea min-h-[80px] font-mono text-[11px]" placeholder='{ "Authorization": "Bearer ..." }' value={cfg.headers || ""} onChange={e => setCfg({ headers: e.target.value })} />
            </Field>
            <Field label="Body (JSON)">
              <textarea className="ds-textarea min-h-[80px] font-mono text-[11px]" value={cfg.body || ""} onChange={e => setCfg({ body: e.target.value })} />
            </Field>
          </>
        )}

        {node.data.kind === "if" && (
          <>
            <Field label="Condition (JS expression)">
              <input className="ds-input font-mono text-[12px]" placeholder="input.amount > 1000" value={cfg.condition || ""} onChange={e => setCfg({ condition: e.target.value })} />
            </Field>
            <p className="text-[11px] text-muted-foreground">Connect the node's right handle for the truthy branch and add a second outgoing edge for else.</p>
          </>
        )}

        {node.data.kind === "loop" && (
          <Field label="Iterate over (path)">
            <input className="ds-input font-mono text-[12px]" placeholder="input.items" value={cfg.list || ""} onChange={e => setCfg({ list: e.target.value })} />
          </Field>
        )}

        {node.data.kind === "setvar" && (
          <>
            <Field label="Variable name">
              <input className="ds-input" value={cfg.name || ""} onChange={e => setCfg({ name: e.target.value })} />
            </Field>
            <Field label="Value (expression)">
              <input className="ds-input font-mono text-[12px]" value={cfg.value || ""} onChange={e => setCfg({ value: e.target.value })} />
            </Field>
          </>
        )}

        {node.data.kind === "knowledge" && (
          <>
            <Field label="Source">
              <select className="ds-input" value={cfg.source || ""} onChange={e => setCfg({ source: e.target.value })}>
                <option value="">All knowledge</option>
                <option>Brochure 2024.pdf</option>
                <option>Customer FAQ</option>
                <option>Internal Policy v3</option>
              </select>
            </Field>
            <Field label="Query">
              <input className="ds-input" placeholder="{{ input.question }}" value={cfg.query || ""} onChange={e => setCfg({ query: e.target.value })} />
            </Field>
            <Field label="Top K">
              <input className="ds-input" type="number" min={1} max={20} value={cfg.topK || 4} onChange={e => setCfg({ topK: Number(e.target.value) })} />
            </Field>
          </>
        )}

        {(node.data.kind === "llm" || node.data.kind === "extract" || node.data.kind === "classify") && (
          <>
            <Field label="Model">
              <select className="ds-input" value={cfg.model || "Gemini 1.5 Pro"} onChange={e => setCfg({ model: e.target.value })}>
                <option>Gemini 1.5 Pro</option>
                <option>GPT-4o mini</option>
                <option>Claude 3.5 Sonnet</option>
              </select>
            </Field>
            <Field label="Prompt">
              <textarea className="ds-textarea min-h-[120px]" placeholder="Write a system + user prompt…" value={cfg.prompt || ""} onChange={e => setCfg({ prompt: e.target.value })} />
            </Field>
            {node.data.kind === "extract" && (
              <Field label="Output schema (JSON)">
                <textarea className="ds-textarea min-h-[80px] font-mono text-[11px]" placeholder='{ "name": "string", "amount": "number" }' value={cfg.schema || ""} onChange={e => setCfg({ schema: e.target.value })} />
              </Field>
            )}
            {node.data.kind === "classify" && (
              <Field label="Categories (comma-sep)">
                <input className="ds-input" placeholder="billing, support, sales" value={cfg.categories || ""} onChange={e => setCfg({ categories: e.target.value })} />
              </Field>
            )}
          </>
        )}

        {node.data.kind === "output" && (
          <Field label="Return value (expression)">
            <textarea className="ds-textarea min-h-[100px] font-mono text-[11px]" placeholder="{ status: 'ok', data: prev.output }" value={cfg.value || ""} onChange={e => setCfg({ value: e.target.value })} />
          </Field>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
