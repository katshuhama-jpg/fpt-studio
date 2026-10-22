import { Plus, X, SlidersHorizontal } from "lucide-react";
import type { WorkforceParamPack } from "./types";

/** "Tham số" tab - the per-customer / per-product configuration pack Code steps and Quy trình
 * read as params.<key>. Swapping the pack (another insurer, another product version) reuses
 * the same Workforce without touching its steps. */
export default function ParamsTab({ pack, onChange }: { pack?: WorkforceParamPack; onChange: (p: WorkforceParamPack) => void }) {
  const p: WorkforceParamPack = pack ?? { name: "Bộ tham số mặc định", version: "v1", params: [] };
  const set = (i: number, patch: Partial<WorkforceParamPack["params"][number]>) => onChange({ ...p, params: p.params.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const cell = "h-9 px-2.5 rounded-md border border-border bg-white text-[13px] outline-none focus:border-primary";
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--wf-bg)" }}>
      <div className="max-w-[920px] mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal size={18} style={{ color: "var(--wf-accent)" }} />
          <h2 className="text-[18px] font-extrabold m-0 [font-family:var(--wf-font-display)]">Tham số theo khách hàng và sản phẩm</h2>
        </div>
        <p className="text-[13px] mb-5" style={{ color: "var(--wf-muted)" }}>Các bước Code và Nhân sự số Quy trình đọc giá trị ở đây qua <code className="font-mono">params.ten_tham_so</code>. Dùng lại Workforce cho khách khác chỉ cần đổi bộ tham số.</p>
        <div className="flex gap-3 mb-4">
          <label className="flex-1">
            <span className="block text-xs font-semibold mb-1">Tên bộ tham số</span>
            <input value={p.name} onChange={e => onChange({ ...p, name: e.target.value })} className={`${cell} w-full`} />
          </label>
          <label className="w-[180px]">
            <span className="block text-xs font-semibold mb-1">Phiên bản</span>
            <input value={p.version} onChange={e => onChange({ ...p, version: e.target.value })} className={`${cell} w-full`} />
          </label>
        </div>
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="grid grid-cols-[220px_200px_1fr_44px] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>Tham số</span><span>Giá trị</span><span>Ghi chú</span><span />
          </div>
          {p.params.map((x, i) => (
            <div key={i} className="grid grid-cols-[220px_200px_1fr_44px] gap-2 px-3 py-2 border-b border-border last:border-b-0 items-center">
              <input value={x.key} onChange={e => set(i, { key: e.target.value.replace(/\s+/g, "_") })} aria-label={`Tên tham số ${i + 1}`} className={`${cell} font-mono`} />
              <input value={x.value} onChange={e => set(i, { value: e.target.value })} aria-label={`Giá trị ${i + 1}`} className={cell} />
              <input value={x.note} onChange={e => set(i, { note: e.target.value })} aria-label={`Ghi chú ${i + 1}`} className={cell} />
              <button onClick={() => onChange({ ...p, params: p.params.filter((_, j) => j !== i) })} aria-label={`Xoá tham số ${i + 1}`} className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive"><X size={14} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ ...p, params: [...p.params, { key: "", value: "", note: "" }] })} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--wf-accent)" }}><Plus size={14} /> Thêm tham số</button>
      </div>
    </div>
  );
}
