import { X, Play, Copy, CopyPlus, Trash2, Plus, Variable } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ToolNode } from "@/components/tool-builder/types";
import { specByKind } from "@/components/tool-builder/NodeLibrary";
import { blockByKind, type BlockSpec } from "./blockCatalog";
import ErrorHandlingSection from "./ErrorHandlingSection";

interface Props {
  node: ToolNode | null;
  onChange: (id: string, patch: Partial<ToolNode["data"]>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClose: () => void;
}

export default function NodeDetailPanel({ node, onChange, onDelete, onDuplicate, onClose }: Props) {
  if (!node) return null;
  const spec = specByKind(node.data.kind);
  const block = blockByKind(node.data.kind);
  const cfg = node.data.config || {};
  const set = (patch: Record<string, any>) => onChange(node.id, { config: { ...cfg, ...patch } });
  const setLabel = (label: string) => onChange(node.id, { label });
  const Icon = spec.icon;

  return (
    <aside className="w-[420px] border-l border-border bg-surface flex flex-col shrink-0 h-full">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className={`w-7 h-7 rounded-md ${spec.bg} ${spec.color} flex items-center justify-center`}>
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={node.data.label}
            onChange={e => setLabel(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-semibold leading-tight"
          />
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{spec.category}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X size={14} /></button>
      </div>

      <div className="px-4 py-2 border-b border-border flex items-center gap-1">
        <ActionBtn icon={<Play size={11} />} label="Run" onClick={() => toast.info(`Mock run for "${node.data.label}"`)} />
        <ActionBtn icon={<Copy size={11} />} label="Copy" onClick={() => { navigator.clipboard.writeText(JSON.stringify(node, null, 2)); toast.success("Copied"); }} />
        <ActionBtn icon={<CopyPlus size={11} />} label="Duplicate" onClick={() => onDuplicate(node.id)} />
        <ActionBtn icon={<Trash2 size={11} />} label="Delete" danger onClick={() => onDelete(node.id)} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-xs text-muted-foreground mb-3">{spec.description}</p>
        <KindForm kind={node.data.kind} cfg={cfg} set={set} />
        {block && <ErrorHandlingSection spec={block} cfg={cfg} set={set} />}
      </div>
    </aside>
  );
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 h-7 rounded-md text-[11px] font-medium transition-base ${
        danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      }`}
    >{icon}{label}</button>
  );
}

/* ------------------------ Per-kind form ------------------------ */

function KindForm({ kind, cfg, set }: { kind: ToolNode["data"]["kind"]; cfg: any; set: (p: any) => void }) {
  switch (kind) {
    case "trigger":          return <StartForm cfg={cfg} set={set} />;
    case "output":           return <EndForm cfg={cfg} set={set} />;
    case "classifier":       return <ClassifierForm cfg={cfg} set={set} />;
    case "rewriter":         return <RewriterForm cfg={cfg} set={set} />;
    case "query_processor":  return <QueryProcessorForm cfg={cfg} set={set} />;
    case "knowledge":        return <KnowledgeForm cfg={cfg} set={set} />;
    case "hkg_retrieval":    return <HkgForm cfg={cfg} set={set} />;
    case "llm":              return <LLMForm cfg={cfg} set={set} />;
    case "if":               return <IfForm cfg={cfg} set={set} />;
    case "iteration":        return <IterationForm cfg={cfg} set={set} />;
    case "code":             return <CodeForm cfg={cfg} set={set} />;
    case "var_agg":          return <VarAggForm cfg={cfg} set={set} />;
    case "ref_filter":       return <RefFilterForm cfg={cfg} set={set} />;
    case "template":         return <TemplateForm cfg={cfg} set={set} />;
    case "param_extractor":  return <ParamExtractorForm cfg={cfg} set={set} />;
    case "http":             return <HttpForm cfg={cfg} set={set} />;
    case "agent":            return <AgentForm cfg={cfg} set={set} />;
    case "file_parser":      return <FileParserForm cfg={cfg} set={set} />;
    case "loop_node":        return <LoopForm cfg={cfg} set={set} />;
    case "var_assigner":     return <VarAssignerForm cfg={cfg} set={set} />;
    case "knowledge_lookup": return <KnowledgeLookupForm cfg={cfg} set={set} />;
    case "tool_call":        return <ToolCallForm cfg={cfg} set={set} />;
    case "task_call":        return <TaskCallForm cfg={cfg} set={set} />;
    default:                 return <p className="text-xs text-muted-foreground italic">No configuration for this node.</p>;
  }
}

/* ------------------------ Reusable controls ------------------------ */

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-xs font-medium mb-1">{children}{required && <span className="text-destructive ml-0.5">*</span>}</label>;
}

function TextInput({ value, onChange, placeholder, type = "text" }: any) {
  return <input type={type} value={value ?? ""} onChange={e => onChange(type === "number" ? Number(e.target.value) : e.target.value)} placeholder={placeholder}
    className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary" />;
}

function TextArea({ value, onChange, placeholder, rows = 3 }: any) {
  return <textarea rows={rows} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary resize-none" />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select value={value ?? ""} onChange={e => onChange(e.target.value)}
    className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary">
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      {label && <span>{label}</span>}
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-base ${checked ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-surface transition-base ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function Range({ value, onChange, min, max, step = 1 }: any) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-primary" />
      <input type="number" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-16 h-7 px-2 rounded-md border border-border bg-surface text-xs text-right outline-none focus:border-primary" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1 mb-3">{children}</div>;
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="mt-1.5 flex items-center gap-1 text-[11px] text-primary hover:underline">
      <Plus size={11} /> {label}
    </button>
  );
}

/* ---- LLM parameters block (shared) ---- */
function LLMParams({ cfg, set }: any) {
  return (
    <Section title="Parameters">
      <Row><Label>Model</Label><Select value={cfg.model} onChange={v => set({ model: v })} options={["Llama-3.3-70B-Instruct", "DeepSeek-R1", "GPT-4o-mini"]} /></Row>
      <Row><Label>Temperature ({cfg.temperature ?? 0.7})</Label><Range min={0} max={2} step={0.1} value={cfg.temperature ?? 0.7} onChange={(v: number) => set({ temperature: v })} /></Row>
      <Row><Label>Top P ({cfg.topP ?? 1})</Label><Range min={0} max={1} step={0.05} value={cfg.topP ?? 1} onChange={(v: number) => set({ topP: v })} /></Row>
      <Row><Label>Max tokens</Label><TextInput type="number" value={cfg.maxTokens ?? 512} onChange={(v: number) => set({ maxTokens: v })} /></Row>
    </Section>
  );
}

/* ------------------------ Forms ------------------------ */

const SYSTEM_VARS = ["user_message", "rewrite_message", "extra", "knowledge", "sender_id", "sender_name", "turn_chat_config", "chat_history", "persona", "files"];

function StartForm({ cfg, set }: any) {
  const vars: any[] = cfg.variables || [];
  const [name, setName] = useState("");
  const [type, setType] = useState("String");
  const [required, setRequired] = useState(false);
  const dupErr = name && (vars.some(v => v.name === name) || SYSTEM_VARS.includes(name));

  return (
    <>
      <Section title="System variables">
        <div className="grid grid-cols-2 gap-1.5">
          {SYSTEM_VARS.map(v => (
            <div key={v} className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-surface-muted text-[11px] font-mono text-muted-foreground" title={`Built-in ${v}`}>
              <Variable size={10} /> {v}
            </div>
          ))}
        </div>
      </Section>
      <Section title="Custom variables">
        {vars.length === 0 && <p className="text-[11px] text-muted-foreground italic">None yet.</p>}
        <ul className="space-y-1">
          {vars.map((v, i) => (
            <li key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-surface-muted">
              <span className="font-mono">{v.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{v.type}{v.required ? " *" : ""}</span>
                <button onClick={() => set({ variables: vars.filter((_, j) => j !== i) })} className="text-destructive"><Trash2 size={11} /></button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 p-3 rounded-lg border border-dashed border-border space-y-2">
          <Label required>Variable name</Label>
          <TextInput value={name} onChange={setName} placeholder="my_var" />
          {dupErr && <p className="text-[11px] text-destructive">Variable name already exists in the system</p>}
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label><Select value={type} onChange={setType} options={["String", "Number", "Boolean"]} /></div>
            <div className="flex items-end"><Toggle label="Required" checked={required} onChange={setRequired} /></div>
          </div>
          <button
            disabled={!name || !!dupErr}
            onClick={() => { set({ variables: [...vars, { name, type, required }] }); setName(""); setRequired(false); }}
            className="w-full h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          ><Plus size={11} className="inline mr-1" /> Add variable</button>
        </div>
      </Section>
    </>
  );
}

function EndForm({ cfg, set }: any) {
  const outs: any[] = cfg.outputs || [];
  return (
    <Section title="Output variables">
      {outs.map((o, i) => (
        <Row key={i}>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
            <TextInput value={o.name} onChange={(v: string) => set({ outputs: outs.map((x, j) => j === i ? { ...x, name: v } : x) })} placeholder="name" />
            <TextInput value={o.from} onChange={(v: string) => set({ outputs: outs.map((x, j) => j === i ? { ...x, from: v } : x) })} placeholder="from variable" />
            <button onClick={() => set({ outputs: outs.filter((_, j) => j !== i) })} className="text-destructive"><Trash2 size={12} /></button>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><input type="checkbox" checked={!!o.saveInMemory} onChange={e => set({ outputs: outs.map((x, j) => j === i ? { ...x, saveInMemory: e.target.checked } : x) })} /> save in memory</label>
        </Row>
      ))}
      <AddBtn onClick={() => set({ outputs: [...outs, { name: "", from: "" }] })} label="Add output" />
      <p className="mt-3 text-[11px] text-muted-foreground">System outputs available: <span className="font-mono">final_answer, answer, knowledge</span></p>
    </Section>
  );
}

function ClassifierForm({ cfg, set }: any) {
  const classes: any[] = cfg.classes || [];
  return (
    <>
      <Row><Label required>Input variable</Label><TextInput value={cfg.input} onChange={(v: string) => set({ input: v })} placeholder="@user_message" /></Row>
      <LLMParams cfg={cfg} set={set} />
      <Section title="Classes">
        {classes.map((c, i) => (
          <div key={i} className="p-2 mb-2 rounded-md border border-border space-y-1.5">
            <TextInput value={c.name} onChange={(v: string) => set({ classes: classes.map((x, j) => j === i ? { ...x, name: v } : x) })} placeholder="Class name" />
            <TextArea rows={2} value={c.description} onChange={(v: string) => set({ classes: classes.map((x, j) => j === i ? { ...x, description: v } : x) })} placeholder="Description" />
            <button onClick={() => set({ classes: classes.filter((_, j) => j !== i) })} className="text-[11px] text-destructive">Remove</button>
          </div>
        ))}
        <AddBtn onClick={() => set({ classes: [...classes, { name: `Class ${classes.length + 1}`, description: "" }] })} label="Add class" />
      </Section>
      <Row><Label>Instruction</Label><TextArea rows={4} value={cfg.instruction} onChange={(v: string) => set({ instruction: v })} placeholder="Use / or (x) to insert variables" /></Row>
      <Row><Toggle label="Memory" checked={!!cfg.memory} onChange={v => set({ memory: v })} /></Row>
      {cfg.memory && <Row><Label>Window size</Label><Range min={1} max={100} value={cfg.windowSize ?? 50} onChange={(v: number) => set({ windowSize: v })} /></Row>}
      <Row><Label>Output variable</Label><TextInput value={cfg.output} onChange={(v: string) => set({ output: v })} /></Row>
    </>
  );
}

function RewriterForm({ cfg, set }: any) {
  return (
    <>
      <LLMParams cfg={cfg} set={set} />
      <Row><Label required>Question variable</Label><TextInput value={cfg.question} onChange={(v: string) => set({ question: v })} placeholder="@user_message" /></Row>
      <Row><Label>Conversation history</Label><TextInput value={cfg.history} onChange={(v: string) => set({ history: v })} /></Row>
      <Row><Label>Instruction</Label><TextArea rows={3} value={cfg.instruction} onChange={(v: string) => set({ instruction: v })} /></Row>
      <Row><Toggle label="Memory" checked={!!cfg.memory} onChange={v => set({ memory: v })} /></Row>
      {cfg.memory && <Row><Label>Window size</Label><Range min={1} max={100} value={cfg.windowSize ?? 6} onChange={(v: number) => set({ windowSize: v })} /></Row>}
      <Row><Label>Output</Label><TextInput value={cfg.output} onChange={(v: string) => set({ output: v })} /></Row>
    </>
  );
}

function QueryProcessorForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label required>Query variable</Label><TextInput value={cfg.query} onChange={(v: string) => set({ query: v })} /></Row>
      <Section title="Synonym dictionary">
        <button className="h-8 px-3 rounded-md border border-border text-xs hover:bg-surface-muted">Open dictionary settings…</button>
      </Section>
      <Row><Label>Output</Label><TextInput value={cfg.output} onChange={(v: string) => set({ output: v })} /></Row>
    </>
  );
}

function KnowledgeForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Query variable</Label><TextInput value={cfg.query} onChange={(v: string) => set({ query: v })} /></Row>
      <Section title="Weights (sum = 1)">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Semantic</Label><Range min={0} max={1} step={0.05} value={cfg.semantic ?? 0.6} onChange={(v: number) => set({ semantic: v, keyword: +(1 - v).toFixed(2) })} /></div>
          <div><Label>Keyword</Label><Range min={0} max={1} step={0.05} value={cfg.keyword ?? 0.4} onChange={(v: number) => set({ keyword: v, semantic: +(1 - v).toFixed(2) })} /></div>
        </div>
      </Section>
      <Row><Label>Top K</Label><Range min={1} max={50} value={cfg.topK ?? 20} onChange={(v: number) => set({ topK: v })} /></Row>
      <Row><Toggle label="Score threshold" checked={!!cfg.scoreThresholdActive} onChange={v => set({ scoreThresholdActive: v })} /></Row>
      {cfg.scoreThresholdActive && <Row><Range min={0} max={1} step={0.01} value={cfg.scoreThreshold ?? 0} onChange={(v: number) => set({ scoreThreshold: v })} /></Row>}
      <Row><Toggle label="Rerank" checked={cfg.rerank !== false} onChange={v => set({ rerank: v })} /></Row>
      {cfg.rerank !== false && (
        <>
          <Row><Label>Rerank Top-K</Label><Range min={1} max={20} value={cfg.rerankTopK ?? 5} onChange={(v: number) => set({ rerankTopK: v })} /></Row>
          <Row><Label>Rerank threshold</Label><Range min={0} max={1} step={0.01} value={cfg.rerankThreshold ?? 0.01} onChange={(v: number) => set({ rerankThreshold: v })} /></Row>
        </>
      )}
      <Row><Toggle label="Parent-Child merging" checked={cfg.parentChild !== false} onChange={v => set({ parentChild: v })} /></Row>
      <Row><Label>Source</Label><Select value={cfg.source ?? "Agent Knowledge"} onChange={v => set({ source: v })} options={["Agent Knowledge", "My Storage"]} /></Row>
      <Row><Label>File filter</Label><Select value={cfg.fileFilter ?? "Disable"} onChange={v => set({ fileFilter: v })} options={["Disable", "Manual"]} /></Row>
      <Row><Label>Metadata filter</Label><Select value={cfg.metadataFilter ?? "Disable"} onChange={v => set({ metadataFilter: v })} options={["Disable", "Manual"]} /></Row>
    </>
  );
}

function HkgForm({ cfg, set }: any) {
  return (
    <>
      <KnowledgeForm cfg={cfg} set={set} />
      <Row><Label>Collection type</Label><Select value={cfg.collectionType ?? "Chunk"} onChange={v => set({ collectionType: v })} options={["Entity", "Chunk", "Document", "Community"]} /></Row>
    </>
  );
}

function LLMForm({ cfg, set }: any) {
  const mode = cfg.mode || "chat";
  const msgs: any[] = cfg.messages || [];
  return (
    <>
      <LLMParams cfg={cfg} set={set} />
      <Row><Label required>Context</Label><TextInput value={cfg.context} onChange={(v: string) => set({ context: v })} placeholder="@knowledge" /></Row>
      <Row><Label>Mode</Label><Select value={mode} onChange={v => set({ mode: v })} options={["chat", "completion"]} /></Row>
      {mode === "completion" ? (
        <Row><Label>Prompt</Label><TextArea rows={5} value={cfg.prompt} onChange={(v: string) => set({ prompt: v })} /></Row>
      ) : (
        <Section title="Messages">
          <Row><Label>System</Label><TextArea rows={3} value={cfg.systemPrompt} onChange={(v: string) => set({ systemPrompt: v })} /></Row>
          {msgs.map((m, i) => (
            <div key={i} className="p-2 mb-1.5 rounded-md border border-border space-y-1.5">
              <Select value={m.role} onChange={v => set({ messages: msgs.map((x, j) => j === i ? { ...x, role: v } : x) })} options={["user", "system", "assistant"]} />
              <TextArea rows={2} value={m.content} onChange={(v: string) => set({ messages: msgs.map((x, j) => j === i ? { ...x, content: v } : x) })} />
              <button onClick={() => set({ messages: msgs.filter((_, j) => j !== i) })} className="text-[11px] text-destructive">Remove</button>
            </div>
          ))}
          {msgs.length < 10 && <AddBtn onClick={() => set({ messages: [...msgs, { role: msgs.at(-1)?.role === "user" ? "system" : "user", content: "" }] })} label="Add message" />}
        </Section>
      )}
      <Row><Toggle label="JSON output" checked={!!cfg.jsonOutput} onChange={v => set({ jsonOutput: v })} /></Row>
      <Row><Toggle label="Memory" checked={!!cfg.memory} onChange={v => set({ memory: v })} /></Row>
      {cfg.memory && <Row><Label>Window size</Label><Range min={1} max={100} value={cfg.windowSize ?? 50} onChange={(v: number) => set({ windowSize: v })} /></Row>}
    </>
  );
}

const STR_OPS = ["Contains", "Not contains", "Start with", "End with", "Is", "Is not", "Is empty", "Is not empty"];
const NUM_OPS = ["=", "≠", ">", "<", "≥", "≤", "is empty", "is not empty"];

function IfForm({ cfg, set }: any) {
  const branches: any[] = cfg.branches || [];
  return (
    <>
      {branches.map((b, bi) => (
        <Section key={b.id} title={b.label}>
          {(b.conditions || []).map((c: any, ci: number) => (
            <div key={ci} className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 mb-1.5 items-center">
              <TextInput value={c.left} onChange={(v: string) => updateCond(set, branches, bi, ci, { left: v })} placeholder="@var" />
              <select value={c.op} onChange={e => updateCond(set, branches, bi, ci, { op: e.target.value })} className="h-9 px-2 rounded-lg border border-border bg-surface text-xs">
                {[...STR_OPS, ...NUM_OPS].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <TextInput value={c.right} onChange={(v: string) => updateCond(set, branches, bi, ci, { right: v })} placeholder="value or @var" />
              <button onClick={() => set({ branches: branches.map((x, j) => j === bi ? { ...x, conditions: x.conditions.filter((_: any, k: number) => k !== ci) } : x) })} className="text-destructive"><Trash2 size={11} /></button>
            </div>
          ))}
          {b.id !== "else" && (
            <AddBtn onClick={() => set({ branches: branches.map((x, j) => j === bi ? { ...x, conditions: [...(x.conditions || []), { left: "", op: "Is", right: "" }] } : x) })} label="Add condition" />
          )}
        </Section>
      ))}
      <AddBtn onClick={() => set({ branches: [...branches.slice(0, -1), { id: `elif-${branches.length}`, label: "ELIF", conditions: [] }, branches.at(-1)] })} label="Add ELIF branch" />
    </>
  );
}
function updateCond(set: any, branches: any[], bi: number, ci: number, patch: any) {
  set({ branches: branches.map((b, j) => j === bi ? { ...b, conditions: b.conditions.map((c: any, k: number) => k === ci ? { ...c, ...patch } : c) } : b) });
}

function IterationForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label required>Input</Label><TextInput value={cfg.input} onChange={(v: string) => set({ input: v })} placeholder="@list_variable" /></Row>
      <Row><Label required>Output</Label><TextInput value={cfg.output} onChange={(v: string) => set({ output: v })} /></Row>
      <p className="text-[11px] text-muted-foreground">Iteration body: add nodes inside this group on the canvas.</p>
    </>
  );
}

function CodeForm({ cfg, set }: any) {
  const inputs: any[] = cfg.inputs || [];
  return (
    <>
      <Section title="Input variables">
        {inputs.map((v, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 mb-1.5 items-center">
            <TextInput value={v.name} onChange={(x: string) => set({ inputs: inputs.map((y, j) => j === i ? { ...y, name: x } : y) })} placeholder="arg1" />
            <TextInput value={v.from} onChange={(x: string) => set({ inputs: inputs.map((y, j) => j === i ? { ...y, from: x } : y) })} placeholder="@var" />
            <button onClick={() => set({ inputs: inputs.filter((_, j) => j !== i) })} className="text-destructive"><Trash2 size={11} /></button>
          </div>
        ))}
        <AddBtn onClick={() => set({ inputs: [...inputs, { name: `arg${inputs.length + 1}`, from: "" }] })} label="Add variable" />
      </Section>
      <Row><Label>Python 3</Label>
        <textarea rows={8} value={cfg.code ?? ""} onChange={e => set({ code: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface font-mono text-xs outline-none focus:border-primary resize-none" />
      </Row>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Output name</Label><TextInput value={cfg.outputName ?? "result"} onChange={(v: string) => set({ outputName: v })} /></div>
        <div><Label>Data type</Label><Select value={cfg.dataType ?? "String"} onChange={v => set({ dataType: v })} options={["String", "Number", "Array[Number]", "Array[String]", "Array[Object]", "Object"]} /></div>
      </div>
    </>
  );
}

function VarAggForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Group name</Label><TextInput value={cfg.groupName} onChange={(v: string) => set({ groupName: v })} /></Row>
      <Row><Toggle label="Aggregation group" checked={!!cfg.aggregationGroup} onChange={v => set({ aggregationGroup: v })} /></Row>
      <p className="text-[11px] text-muted-foreground">Wire branches into this node to merge variables.</p>
    </>
  );
}

function RefFilterForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label required>Input variable</Label><TextInput value={cfg.input} onChange={(v: string) => set({ input: v })} /></Row>
      <Row><Label>Reference context</Label><TextInput value={cfg.referenceContext} onChange={(v: string) => set({ referenceContext: v })} /></Row>
      <Row><Toggle label="Filter threshold" checked={!!cfg.thresholdActive} onChange={v => set({ thresholdActive: v })} /></Row>
      {cfg.thresholdActive && <Row><Range min={0} max={1} step={0.01} value={cfg.threshold ?? 0} onChange={(v: number) => set({ threshold: v })} /></Row>}
      <Row><Label>Output</Label><TextInput value={cfg.output} onChange={(v: string) => set({ output: v })} /></Row>
    </>
  );
}

function TemplateForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Code</Label><TextArea rows={6} value={cfg.code} onChange={(v: string) => set({ code: v })} placeholder="Hello {{ name }}" /></Row>
      <Row><Label>Output</Label><TextInput value={cfg.output} onChange={(v: string) => set({ output: v })} /></Row>
    </>
  );
}

function ParamExtractorForm({ cfg, set }: any) {
  const params: any[] = cfg.parameters || [];
  return (
    <>
      <LLMParams cfg={cfg} set={set} />
      <Row><Label required>Input variable</Label><TextInput value={cfg.input} onChange={(v: string) => set({ input: v })} /></Row>
      <Section title="Extract parameters">
        {params.map((p, i) => (
          <div key={i} className="p-2 mb-1.5 rounded-md border border-border space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <TextInput value={p.name} onChange={(x: string) => set({ parameters: params.map((y, j) => j === i ? { ...y, name: x } : y) })} placeholder="name" />
              <Select value={p.type} onChange={v => set({ parameters: params.map((y, j) => j === i ? { ...y, type: v } : y) })} options={["String", "Number", "Array[String]", "Array[Number]"]} />
            </div>
            <TextArea rows={2} value={p.description} onChange={(x: string) => set({ parameters: params.map((y, j) => j === i ? { ...y, description: x } : y) })} placeholder="description" />
            <div className="flex justify-between items-center">
              <Toggle label="Required" checked={p.required} onChange={v => set({ parameters: params.map((y, j) => j === i ? { ...y, required: v } : y) })} />
              <button onClick={() => set({ parameters: params.filter((_, j) => j !== i) })} className="text-[11px] text-destructive">Remove</button>
            </div>
          </div>
        ))}
        <AddBtn onClick={() => set({ parameters: [...params, { name: `param${params.length + 1}`, type: "String", description: "", required: false }] })} label="Add parameter" />
      </Section>
      <Row><Label>Instruction</Label><TextArea rows={3} value={cfg.instruction} onChange={(v: string) => set({ instruction: v })} /></Row>
    </>
  );
}

function HttpForm({ cfg, set }: any) {
  return (
    <>
      <Section title="Authorization">
        <Select value={cfg.authType ?? "None"} onChange={v => set({ authType: v })} options={["None", "API key"]} />
        {cfg.authType === "API key" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Select value={cfg.authScheme ?? "Bearer"} onChange={v => set({ authScheme: v })} options={["Basic", "Bearer", "Custom"]} />
            <TextInput value={cfg.apiKey} onChange={(v: string) => set({ apiKey: v })} placeholder="API key" />
          </div>
        )}
      </Section>
      <div className="grid grid-cols-[100px_1fr] gap-1.5 mt-3">
        <Select value={cfg.method ?? "GET"} onChange={v => set({ method: v })} options={["GET", "POST", "HEAD", "PATCH", "PUT", "DELETE"]} />
        <TextInput value={cfg.url} onChange={(v: string) => set({ url: v })} placeholder="https://api.example.com/path" />
      </div>
      <Row><Label>Body</Label><Select value={cfg.bodyType ?? "none"} onChange={v => set({ bodyType: v })} options={["none", "form-data", "x-www-form-urlencoded", "raw", "json"]} /></Row>
      {cfg.bodyType !== "none" && cfg.bodyType && (
        <Row><TextArea rows={5} value={cfg.body} onChange={(v: string) => set({ body: v })} /></Row>
      )}
      <Section title="Timeouts (ms)">
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Connect</Label><TextInput type="number" value={cfg.timeoutConnect ?? 5000} onChange={(v: number) => set({ timeoutConnect: v })} /></div>
          <div><Label>Read</Label><TextInput type="number" value={cfg.timeoutRead ?? 30000} onChange={(v: number) => set({ timeoutRead: v })} /></div>
          <div><Label>Write</Label><TextInput type="number" value={cfg.timeoutWrite ?? 30000} onChange={(v: number) => set({ timeoutWrite: v })} /></div>
        </div>
      </Section>
    </>
  );
}

function AgentForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Strategy</Label><Select value={cfg.strategy ?? "Function Calling"} onChange={v => set({ strategy: v })} options={["Function Calling", "ReAct"]} /></Row>
      <Row><Label>Model</Label><Select value={cfg.model ?? "Llama-3.3-70B-Instruct"} onChange={v => set({ model: v })} options={["Llama-3.3-70B-Instruct", "DeepSeek-R1", "GPT-4o-mini"]} /></Row>
      <Section title="Tools">
        {(cfg.tools || []).map((t: string, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-surface-muted mb-1">
            <span className="font-mono">{t}</span>
            <button onClick={() => set({ tools: cfg.tools.filter((_: any, j: number) => j !== i) })} className="text-destructive"><Trash2 size={11} /></button>
          </div>
        ))}
        <AddBtn onClick={() => { const name = prompt("Tool name?"); if (name) set({ tools: [...(cfg.tools || []), name] }); }} label="Add tool" />
      </Section>
      <Row><Label>Instruction (Jinja)</Label><TextArea rows={4} value={cfg.instruction} onChange={(v: string) => set({ instruction: v })} /></Row>
      <Row><Label>Query</Label><TextInput value={cfg.query} onChange={(v: string) => set({ query: v })} /></Row>
      <Row><Label>Max iterations</Label><Range min={1} max={20} value={cfg.maxIterations ?? 5} onChange={(v: number) => set({ maxIterations: v })} /></Row>
      <Row><Toggle label="Memory" checked={!!cfg.memory} onChange={v => set({ memory: v })} /></Row>
    </>
  );
}

function FileParserForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label required>Input variable</Label><TextInput value={cfg.input ?? "sys.files"} onChange={(v: string) => set({ input: v })} /></Row>
      <Row><Label>Instruction</Label><TextArea rows={3} value={cfg.instruction} onChange={(v: string) => set({ instruction: v })} /></Row>
      <Row><Label>Output</Label><TextInput value={cfg.output} onChange={(v: string) => set({ output: v })} /></Row>
    </>
  );
}

function LoopForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Termination condition</Label><TextInput value={cfg.terminationCondition} onChange={(v: string) => set({ terminationCondition: v })} placeholder="e.g. counter > 10" /></Row>
      <Row><Label>Maximum loop count</Label><Range min={1} max={100} value={cfg.maxLoopCount ?? 10} onChange={(v: number) => set({ maxLoopCount: v })} /></Row>
      <p className="text-[11px] text-muted-foreground">Place an Exit Loop node inside to break early.</p>
    </>
  );
}

const VAR_MODES: Record<string, string[]> = {
  String: ["Overwrite", "Clear", "Set"],
  Number: ["Overwrite", "Clear", "Set", "+ Arithmetic"],
  Object: ["Overwrite", "Clear", "Set"],
  Array: ["Overwrite", "Clear", "Append", "Extend", "Remove First", "Remove Last"],
};

function VarAssignerForm({ cfg, set }: any) {
  const items: any[] = cfg.assignments || [];
  return (
    <Section title="Assignments">
      {items.map((a, i) => (
        <div key={i} className="p-2 mb-1.5 rounded-md border border-border space-y-1.5">
          <TextInput value={a.target} onChange={(v: string) => set({ assignments: items.map((x, j) => j === i ? { ...x, target: v } : x) })} placeholder="@target_var" />
          <div className="grid grid-cols-2 gap-1.5">
            <Select value={a.targetType ?? "String"} onChange={v => set({ assignments: items.map((x, j) => j === i ? { ...x, targetType: v, mode: "Overwrite" } : x) })} options={Object.keys(VAR_MODES)} />
            <Select value={a.mode ?? "Overwrite"} onChange={v => set({ assignments: items.map((x, j) => j === i ? { ...x, mode: v } : x) })} options={VAR_MODES[a.targetType ?? "String"]} />
          </div>
          <TextInput value={a.value} onChange={(v: string) => set({ assignments: items.map((x, j) => j === i ? { ...x, value: v } : x) })} placeholder="value or @var" />
          <button onClick={() => set({ assignments: items.filter((_, j) => j !== i) })} className="text-[11px] text-destructive">Remove</button>
        </div>
      ))}
      <AddBtn onClick={() => set({ assignments: [...items, { target: "", targetType: "String", mode: "Overwrite", value: "" }] })} label="Add assignment" />
    </Section>
  );
}

function KnowledgeLookupForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Source</Label><Select value={cfg.source ?? "Agent Knowledge"} onChange={v => set({ source: v })} options={["Agent Knowledge", "My Storage"]} /></Row>
      <Row><Label>File filter</Label><Select value={cfg.fileFilter ?? "Disable"} onChange={v => set({ fileFilter: v })} options={["Disable", "Manual"]} /></Row>
      <Row><Label>Metadata filter</Label><Select value={cfg.metadataFilter ?? "Disable"} onChange={v => set({ metadataFilter: v })} options={["Disable", "Manual"]} /></Row>
      <Row><Label>Aggregation method</Label><Select value={cfg.aggregation ?? "Unique by file name"} onChange={v => set({ aggregation: v })} options={["Unique by file name", "All"]} /></Row>
      <Row><Label>Limit</Label><Range min={1} max={100} value={cfg.limit ?? 10} onChange={(v: number) => set({ limit: v })} /></Row>
    </>
  );
}

function ToolCallForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Tool</Label><TextInput value={cfg.toolName} onChange={(v: string) => set({ toolName: v })} placeholder="e.g. verify_customer" /></Row>
      <Row><Label>Inputs (JSON)</Label><TextArea rows={5} value={typeof cfg.inputs === "string" ? cfg.inputs : JSON.stringify(cfg.inputs ?? {}, null, 2)} onChange={(v: string) => set({ inputs: v })} /></Row>
    </>
  );
}

function TaskCallForm({ cfg, set }: any) {
  return (
    <>
      <Row><Label>Task</Label><TextInput value={cfg.taskName} onChange={(v: string) => set({ taskName: v })} placeholder="e.g. Lock credit card" /></Row>
      <Row><Label>Inputs (JSON)</Label><TextArea rows={5} value={typeof cfg.inputs === "string" ? cfg.inputs : JSON.stringify(cfg.inputs ?? {}, null, 2)} onChange={(v: string) => set({ inputs: v })} /></Row>
    </>
  );
}
