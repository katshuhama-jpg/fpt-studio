import {
  ChevronLeft, Play, Rocket, Save, Code2, FileJson, LayoutGrid,
  KeyRound, Plus, Trash2, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  toolStore, type ToolDefinition, type ToolParam, type ToolCredential,
} from "@/components/tool-builder/types";

type TabId = "code" | "metadata" | "card";

const DEFAULT_CODE = `# All logic must live inside handler(kwargs).
# It receives the validated input parameters and must return a JSON-serializable dict.

def handler(kwargs):
    # Example: human handoff
    return {
        "transfer_to_agent": True,
        "answer": "Đang kết nối bạn với nhân viên hỗ trợ, vui lòng giữ máy.",
    }
`;

const DEFAULT_PARAMS: ToolParam[] = [
  { name: "reason", type: "string", required: false, description: "Reason the agent wants to hand off." },
];

const DEFAULT_CARD = `{
  "type": "info",
  "title": "Đang chuyển cuộc gọi",
  "body": "{{ output.answer }}"
}`;

export default function ToolBuilder() {
  const { id: agentId = "cskh", toolId } = useParams();
  const navigate = useNavigate();
  const isNew = !toolId || toolId === "new";

  const existing = !isNew ? toolStore.get(agentId, toolId!) : undefined;

  const [name, setName] = useState(existing?.name || "transfer_to_agent");
  const [description, setDescription] = useState(
    existing?.description || "Hand off the conversation to a human representative.",
  );
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [code, setCode] = useState(existing?.code || DEFAULT_CODE);
  const [params, setParams] = useState<ToolParam[]>(existing?.params || DEFAULT_PARAMS);
  const [credentials, setCredentials] = useState<ToolCredential[]>(existing?.credentials || []);
  const [cardBinding, setCardBinding] = useState(existing?.cardBinding || DEFAULT_CARD);
  const [tab, setTab] = useState<TabId>("code");

  const [input, setInput] = useState('{\n  "reason": "user requested human"\n}');
  const [output, setOutput] = useState<{ ok: boolean; data: any; ms: number } | null>(null);
  const [running, setRunning] = useState(false);

  const handleSave = (publish = false) => {
    const id = isNew
      ? `${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${Date.now().toString(36)}`
      : toolId!;
    const def: ToolDefinition = {
      id, name, description,
      nodes: existing?.nodes || [],
      edges: existing?.edges || [],
      updatedAt: Date.now(),
      status: publish ? "published" : "draft",
      enabled, code, params, credentials, cardBinding,
    };
    toolStore.save(agentId, def);
    navigate(`/agents/${agentId}?tab=build&section=tool`);
  };

  const runTest = async () => {
    setRunning(true);
    setOutput(null);
    const start = performance.now();
    await new Promise(r => setTimeout(r, 480));
    try {
      const parsed = JSON.parse(input);
      // Simulated handler — naive interpreter that just looks for a `return { ... }` literal
      const match = code.match(/return\s+(\{[\s\S]*?\})\s*\n?\s*$/m);
      let data: any = { ok: true, echoed: parsed };
      if (match) {
        // very small safe-ish eval for demo: replace python True/False/None
        const py = match[1]
          .replace(/\bTrue\b/g, "true")
          .replace(/\bFalse\b/g, "false")
          .replace(/\bNone\b/g, "null")
          .replace(/'([^']*)'/g, '"$1"');
        try { data = JSON.parse(py); } catch { /* keep echo */ }
      }
      setOutput({ ok: true, data, ms: Math.round(performance.now() - start) });
    } catch (e: any) {
      setOutput({ ok: false, data: { error: e.message }, ms: Math.round(performance.now() - start) });
    }
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Topbar */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={() => navigate(`/agents/${agentId}?tab=build&section=tool`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-base"
        >
          <ChevronLeft size={15} /> Back to agent
        </button>
        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-md bg-accent-soft text-accent flex items-center justify-center text-xs font-bold">
            ⚙
          </div>
          <input
            className="bg-transparent outline-none text-sm font-semibold min-w-0 flex-1 px-2 py-1 rounded hover:bg-surface-muted focus:bg-surface-muted transition-base font-mono"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <span className="chip">Tool · code</span>

          {/* Status toggle */}
          <button
            onClick={() => setEnabled(v => !v)}
            className={`ml-2 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-base ${
              enabled
                ? "border-success/30 bg-success/10 text-success"
                : "border-border bg-surface-muted text-muted-foreground"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-success" : "bg-muted-foreground/50"}`} />
            {enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium flex items-center gap-1.5 transition-base"
          >
            <Save size={13} /> Save
          </button>
          <button onClick={() => handleSave(true)} className="btn-primary h-9">
            <Rocket size={13} /> Publish
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Description strip */}
          <div className="px-5 pt-4 pb-3 border-b border-border bg-surface/60 shrink-0">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Description (used by the agent for tool selection)
            </label>
            <input
              className="ds-input"
              placeholder="Describe when the agent should call this tool…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="h-10 border-b border-border bg-surface flex items-center px-3 gap-1 shrink-0">
            <TabButton active={tab === "code"} onClick={() => setTab("code")} icon={Code2} label="Code" />
            <TabButton active={tab === "metadata"} onClick={() => setTab("metadata")} icon={FileJson} label="Metadata" />
            <TabButton active={tab === "card"} onClick={() => setTab("card")} icon={LayoutGrid} label="Card data binding" />
            <div className="ml-auto text-[11px] text-muted-foreground pr-2 font-mono">
              python · handler(kwargs)
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {tab === "code" && (
              <CodeEditor code={code} onChange={setCode} />
            )}
            {tab === "metadata" && (
              <MetadataEditor params={params} onChange={setParams} />
            )}
            {tab === "card" && (
              <CardBindingEditor value={cardBinding} onChange={setCardBinding} />
            )}
          </div>

          {/* Credentials panel */}
          <CredentialsPanel credentials={credentials} onChange={setCredentials} />
        </div>

        {/* Right: Test sandbox */}
        <aside className="w-[400px] border-l border-border bg-surface flex flex-col shrink-0">
          <div className="h-10 px-4 border-b border-border flex items-center gap-2 shrink-0">
            <Play size={13} className="text-primary" />
            <div className="text-sm font-semibold flex-1">Test sandbox</div>
            <button
              onClick={runTest}
              disabled={running}
              className="btn-primary h-8 px-3 text-xs disabled:opacity-50"
            >
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {running ? "Running…" : "Run"}
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Input value (JSON)
              </div>
              <textarea
                className="ds-textarea font-mono text-[11px] min-h-[140px] resize-none"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-2">
                Output value
                {output && (
                  <span className={`inline-flex items-center gap-1 normal-case tracking-normal ${output.ok ? "text-success" : "text-destructive"}`}>
                    {output.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                    {output.ms}ms
                  </span>
                )}
              </div>
              {output ? (
                <pre className="text-[11px] font-mono bg-surface-muted/40 border border-border rounded-lg p-3 whitespace-pre-wrap break-words">
                  {JSON.stringify(output.data, null, 2)}
                </pre>
              ) : (
                <div className="text-center text-xs text-muted-foreground mt-8 px-4">
                  Click <b>Run</b> to execute <code className="font-mono text-[10px] bg-surface-muted px-1 py-0.5 rounded">handler(kwargs)</code> with the input above. The result will appear here.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-base ${
        active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-surface-muted"
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

/* ---------- Code editor ---------- */
function CodeEditor({ code, onChange }: { code: string; onChange: (v: string) => void }) {
  const lines = code.split("\n");
  return (
    <div className="flex-1 flex font-mono text-[12px] bg-[hsl(var(--surface))] overflow-hidden">
      <div className="py-3 px-2 text-right text-muted-foreground/60 select-none border-r border-border bg-surface-muted/40 shrink-0 leading-[1.6]">
        {lines.map((_, i) => (
          <div key={i} className="text-[10px]">{i + 1}</div>
        ))}
      </div>
      <textarea
        spellCheck={false}
        value={code}
        onChange={e => onChange(e.target.value)}
        className="flex-1 p-3 bg-transparent outline-none resize-none leading-[1.6] text-foreground"
      />
    </div>
  );
}

/* ---------- Metadata editor ---------- */
function MetadataEditor({
  params, onChange,
}: { params: ToolParam[]; onChange: (v: ToolParam[]) => void }) {
  const update = (i: number, patch: Partial<ToolParam>) =>
    onChange(params.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  const add = () =>
    onChange([...params, { name: "", type: "string", required: false, description: "" }]);
  const remove = (i: number) => onChange(params.filter((_, idx) => idx !== i));

  const schema = useMemo(() => {
    const props: Record<string, any> = {};
    const required: string[] = [];
    params.forEach(p => {
      if (!p.name) return;
      props[p.name] = { type: p.type, description: p.description };
      if (p.required) required.push(p.name);
    });
    return { type: "object", properties: props, required };
  }, [params]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Input schema</div>
            <div className="text-[11px] text-muted-foreground">Parameters the agent will extract from the user before calling this tool.</div>
          </div>
          <button onClick={add} className="h-8 px-2.5 rounded-md border border-border bg-surface hover:bg-surface-muted text-xs flex items-center gap-1 transition-base">
            <Plus size={12} /> Add parameter
          </button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_2fr_36px] gap-2 px-3 py-2 bg-surface-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <div>Name</div><div>Type</div><div>Required</div><div>Description</div><div></div>
          </div>
          {params.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No parameters yet.</div>
          )}
          {params.map((p, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_0.8fr_0.6fr_2fr_36px] gap-2 px-3 py-2 border-b border-border last:border-0 items-center">
              <input className="ds-input h-8 text-xs font-mono" placeholder="param_name" value={p.name} onChange={e => update(i, { name: e.target.value })} />
              <select className="ds-input h-8 text-xs" value={p.type} onChange={e => update(i, { type: e.target.value as any })}>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
              </select>
              <label className="flex items-center justify-center">
                <input type="checkbox" checked={p.required} onChange={e => update(i, { required: e.target.checked })} className="accent-primary" />
              </label>
              <input className="ds-input h-8 text-xs" placeholder="What is this parameter for?" value={p.description} onChange={e => update(i, { description: e.target.value })} />
              <button onClick={() => remove(i)} className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-base">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-1">Generated JSON Schema</div>
        <pre className="text-[11px] font-mono bg-surface-muted/40 border border-border rounded-lg p-3 overflow-x-auto">
          {JSON.stringify(schema, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/* ---------- Card binding ---------- */
function CardBindingEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-3">
      <div>
        <div className="text-sm font-semibold">Card data binding</div>
        <div className="text-[11px] text-muted-foreground">
          Map this tool's output into a UI card rendered in the chat. Use <code className="font-mono">{"{{ output.field }}"}</code> placeholders.
        </div>
      </div>
      <textarea
        className="ds-textarea font-mono text-[11px] min-h-[280px]"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <div className="text-[11px] text-muted-foreground">
        Supported card types: <code className="font-mono">info</code>, <code className="font-mono">list</code>, <code className="font-mono">action</code>, <code className="font-mono">image</code>.
      </div>
    </div>
  );
}

/* ---------- Credentials panel ---------- */
function CredentialsPanel({
  credentials, onChange,
}: { credentials: ToolCredential[]; onChange: (v: ToolCredential[]) => void }) {
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const update = (i: number, patch: Partial<ToolCredential>) =>
    onChange(credentials.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const add = () => onChange([...credentials, { key: "", value: "", masked: true }]);
  const remove = (i: number) => onChange(credentials.filter((_, idx) => idx !== i));

  return (
    <div className="border-t border-border bg-surface shrink-0 max-h-[200px] flex flex-col">
      <div className="h-9 px-4 flex items-center gap-2 border-b border-border shrink-0">
        <KeyRound size={13} className="text-muted-foreground" />
        <div className="text-[12px] font-semibold">Credential variables</div>
        <span className="text-[10px] text-muted-foreground">
          Available in code as <code className="font-mono">env["KEY"]</code>
        </span>
        <button onClick={add} className="ml-auto h-7 px-2 rounded-md border border-border bg-surface hover:bg-surface-muted text-[11px] flex items-center gap-1 transition-base">
          <Plus size={11} /> Add variable
        </button>
      </div>
      <div className="overflow-y-auto">
        {credentials.length === 0 && (
          <div className="px-4 py-3 text-[11px] text-muted-foreground">
            No credentials yet. Add API keys or environment variables here to keep them out of the code.
          </div>
        )}
        {credentials.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_36px_36px] gap-2 px-3 py-1.5 border-b border-border last:border-0 items-center">
            <input className="ds-input h-8 text-xs font-mono" placeholder="API_KEY" value={c.key} onChange={e => update(i, { key: e.target.value })} />
            <input
              className="ds-input h-8 text-xs font-mono"
              type={reveal[i] ? "text" : "password"}
              placeholder="value"
              value={c.value}
              onChange={e => update(i, { value: e.target.value })}
            />
            <button onClick={() => setReveal(r => ({ ...r, [i]: !r[i] }))} className="h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base">
              {reveal[i] ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={() => remove(i)} className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-base">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
