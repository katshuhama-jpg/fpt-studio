import { X, Trash2, Code2, Plus } from "lucide-react";
import { builtinCatalog } from "@/components/tool-builder/types";
import { useReturnFocusOnUnmount } from "./useReturnFocus";
import FlowControlSection from "./FlowControlSection";
import type { CodeNodeData, FlowControl, OutputField, WorkforceParamPack } from "./types";

const TYPES: { v: OutputField["type"]; l: string }[] = [
  { v: "number", l: "Số" }, { v: "text", l: "Văn bản" }, { v: "boolean", l: "Đúng/Sai" }, { v: "table", l: "Bảng" },
];

export default function CodeConfigDrawer({ data, onChange, onClose, onDelete, outCount, inCount, paramPack }: {
  data: CodeNodeData;
  onChange: (patch: Partial<CodeNodeData>) => void;
  onClose: () => void;
  onDelete: () => void;
  outCount: number;
  inCount: number;
  paramPack?: WorkforceParamPack;
}) {
  useReturnFocusOnUnmount();
  const setOut = (i: number, patch: Partial<OutputField>) => onChange({ outputs: data.outputs.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  const field = "w-full h-9 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary";

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[460px] border-l border-border bg-surface shadow-2xl z-20 flex flex-col animate-fade-up">
      <div className="px-4 h-12 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--wf-code-bg)", color: "var(--wf-code)" }}><Code2 size={14} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">{data.name || "Bước Code"}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Code · tất định</div>
        </div>
        <button onClick={onDelete} aria-label="Xóa node" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"><Trash2 size={14} /></button>
        <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 min-w-[44px] min-h-[44px] -m-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed">Dùng cho rule và phép tính phải chạy đúng tuyệt đối: cùng đầu vào luôn ra cùng kết quả, không qua LLM. Đọc đầu ra của các bước trước qua <code className="font-mono">inputs</code>, tham số của khách qua <code className="font-mono">params</code>.</p>
        <label className="block">
          <span className="block text-xs font-semibold mb-1.5">Tên bước</span>
          <input value={data.name} onChange={e => onChange({ name: e.target.value })} className={field} />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold mb-1.5">Ngôn ngữ</span>
          <select value={data.lang} onChange={e => onChange({ lang: e.target.value as CodeNodeData["lang"] })} className={field}>
            <option>Python</option><option>JavaScript</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold mb-1.5">Code</span>
          <textarea value={data.code} onChange={e => onChange({ code: e.target.value })} rows={12} spellCheck={false}
            className="w-full px-3 py-2 rounded-lg border border-border bg-[#0f172a] text-[#e2e8f0] text-[12px] leading-[1.55] outline-none focus:border-primary font-mono" />
        </label>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Đầu ra có cấu trúc</div>
          <div className="flex flex-col gap-2">
            {data.outputs.map((o, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input value={o.key} onChange={e => setOut(i, { key: e.target.value.replace(/\s+/g, "_") })} placeholder="ten_truong" aria-label={`Tên đầu ra ${i + 1}`} className="w-[130px] h-8 px-2 rounded-md border border-border text-xs font-mono outline-none focus:border-primary" />
                <input value={o.label} onChange={e => setOut(i, { label: e.target.value })} placeholder="Mô tả" aria-label={`Mô tả đầu ra ${i + 1}`} className="flex-1 min-w-0 h-8 px-2 rounded-md border border-border text-xs outline-none focus:border-primary" />
                <select value={o.type} onChange={e => setOut(i, { type: e.target.value as OutputField["type"] })} aria-label={`Kiểu đầu ra ${i + 1}`} className="h-8 px-1.5 rounded-md border border-border text-xs">
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
                <button onClick={() => onChange({ outputs: data.outputs.filter((_, j) => j !== i) })} aria-label={`Xoá đầu ra ${i + 1}`} className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive"><X size={13} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => onChange({ outputs: [...data.outputs, { key: "", label: "", type: "number" }] })} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"><Plus size={12} /> Thêm đầu ra</button>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tool code được gọi</div>
          <div className="flex flex-wrap gap-1.5">
            {builtinCatalog.slice(0, 40).filter(t => data.toolIds.includes(t.setId) || ["Insurance", "Data", "AI"].includes(t.category)).map(t => {
              const on = data.toolIds.includes(t.setId);
              return (
                <button key={t.setId} onClick={() => onChange({ toolIds: on ? data.toolIds.filter(x => x !== t.setId) : [...data.toolIds, t.setId] })}
                  className={`h-7 px-2.5 rounded-full border text-[11.5px] transition-base ${on ? "border-primary bg-primary-soft text-primary font-semibold" : "border-border text-muted-foreground"}`}>
                  {t.pluginAvatar} {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {paramPack && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tham số dùng được ({paramPack.name})</div>
            <div className="flex flex-wrap gap-1.5">
              {paramPack.params.map(p => <code key={p.key} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-muted" title={p.note}>params.{p.key} = {p.value}</code>)}
            </div>
          </div>
        )}

        <FlowControlSection value={data as FlowControl} outCount={outCount} inCount={inCount} onChange={onChange} />
      </div>
    </aside>
  );
}
