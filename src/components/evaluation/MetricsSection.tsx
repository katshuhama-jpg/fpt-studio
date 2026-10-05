import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, CheckListIcon, PlayIcon, Loading03Icon, ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  evaluationStore, useEvaluationStore, TEMPLATE_METRICS, METRIC_GROUP_LABEL, METRIC_SOURCE_LABEL, NEED_LABEL, VARIABLES, JUDGE_MODELS,
  isMonitorable, passRuleText, type Metric, type MetricGroup, type ResponseFormat, type ScaleLevel,
} from "./evaluationStore";
import { EmptyState } from "./shared";

const GROUPS: MetricGroup[] = ["quality", "safety", "behavior"];

export function MetricsSection({ agentId }: { agentId: string }) {
  useEvaluationStore();
  const [view, setView] = useState<"agent" | "library">("agent");
  const [editing, setEditing] = useState<Metric | null>(null);
  const [toDelete, setToDelete] = useState<Metric | null>(null);
  const [q, setQ] = useState("");
  const metrics = evaluationStore.agentMetrics(agentId);

  const create = (kind: "judge" | "contains") => setEditing(evaluationStore.createMetric(agentId, kind));
  const applyTemplate = (tplId: string) => {
    const m = evaluationStore.addFromTemplate(agentId, tplId);
    setView("agent"); setEditing(m);
  };
  const match = (m: Metric) => !q || `${m.name} ${m.vnName} ${m.description}`.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Chỉ số đánh giá</h2>
          <p className="text-sm text-muted-foreground mt-1">Tiêu chí để chấm câu trả lời của Agent. Tạo một lần, dùng lại cho nhiều bộ test và cho Monitor.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="btn-primary shrink-0"><HugeiconsIcon icon={Add01Icon} size={14} /> Tạo chỉ số <HugeiconsIcon icon={ArrowDown01Icon} size={14} /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuItem className="items-start py-2" onClick={() => create("judge")}>
              <div><div className="font-medium">AI Judge</div><div className="text-xs text-muted-foreground">Viết tiêu chí, AI chấm theo thang điểm hoặc Pass/Fail</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem className="items-start py-2" onClick={() => create("contains")}>
              <div><div className="font-medium">Phải chứa</div><div className="text-xs text-muted-foreground">Kiểm tra câu trả lời có cụm từ bắt buộc - Không tốn token</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem className="items-start py-2" onClick={() => setView("library")}>
              <div><div className="font-medium">Dùng template</div><div className="text-xs text-muted-foreground">Chọn từ thư viện chỉ số có sẵn</div></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 rounded-lg bg-surface-muted p-0.5" role="tablist">
          {([["agent", `Của Agent (${metrics.length})`], ["library", `Thư viện template (${TEMPLATE_METRICS.length})`]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={`px-3 h-8 rounded-md text-sm font-medium transition-base cursor-pointer ${view === id ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
        </div>
        <div className="relative ml-auto">
          <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="ds-input !h-8 !pl-8 w-64" placeholder="Tìm chỉ số" value={q} onChange={e => setQ(e.target.value)} aria-label="Tìm chỉ số" />
        </div>
      </div>

      {view === "agent" ? (
        metrics.length === 0 ? (
          <EmptyState icon={CheckListIcon} title="Agent chưa có chỉ số nào" desc="Bắt đầu với 4 chỉ số chuẩn của FPT: Correctness, Faithfulness, Safety, Style. Bạn chỉnh tiêu chí sau khi thêm.">
            <button className="btn-primary" onClick={() => { ["tpl-correctness", "tpl-faithfulness", "tpl-safety", "tpl-style"].forEach(t => evaluationStore.addFromTemplate(agentId, t)); toast.success("Đã thêm 4 chỉ số chuẩn"); }}>Thêm 4 chỉ số chuẩn</button>
            <button className="btn-secondary" onClick={() => setView("library")}>Xem thư viện</button>
          </EmptyState>
        ) : (
          <div className="surface-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Chỉ số</th>
                  <th className="text-left font-medium px-4 py-2.5">Nhóm</th>
                  <th className="text-left font-medium px-4 py-2.5">Cách chấm</th>
                  <th className="text-left font-medium px-4 py-2.5">Cần</th>
                  <th className="text-left font-medium px-4 py-2.5">Dùng ở</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {metrics.filter(match).map(m => {
                  const sets = evaluationStore.setsUsingMetric(m.id);
                  const mon = evaluationStore.monitor(agentId)?.metricIds.includes(m.id);
                  return (
                    <tr key={m.id} onClick={() => setEditing(m)} className="border-t border-border hover:bg-surface-muted/50 cursor-pointer transition-base">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name} <span className="chip chip-outline !py-0 !text-[10px] ml-1">{m.kind === "contains" ? "Phải chứa" : "AI Judge"}</span></div>
                        <div className="text-xs text-muted-foreground">{m.vnName || m.description}</div>
                      </td>
                      <td className="px-4 py-3">{METRIC_GROUP_LABEL[m.group]}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{passRuleText(m)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.needs.length ? m.needs.map(n => NEED_LABEL[n]).join(", ") : "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{[sets.length ? `${sets.length} bộ test` : "", mon ? "Monitor" : ""].filter(Boolean).join(" · ") || "Chưa dùng"}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button className="btn-ghost !px-2" aria-label={`Xóa chỉ số ${m.name}`} onClick={() => setToDelete(m)}><HugeiconsIcon icon={Delete02Icon} size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {GROUPS.map(g => {
            const items = TEMPLATE_METRICS.filter(t => t.group === g && match(t));
            if (!items.length) return null;
            return (
              <section key={g}>
                <h3 className="font-display text-sm font-semibold mb-2">{METRIC_GROUP_LABEL[g]}</h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map(t => {
                    const added = metrics.some(m => m.templateId === t.id);
                    return (
                      <div key={t.id} className="surface-card p-4 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{t.vnName}</div>
                          </div>
                          <span className={`chip !py-0.5 !text-[10px] ${t.source === "wiki" ? "chip-primary" : "chip-muted"}`}>{METRIC_SOURCE_LABEL[t.source]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex-1">{t.description}</p>
                        <div className="flex items-center justify-between mt-3 gap-2">
                          <span className="text-[11px] text-muted-foreground">{passRuleText(t)}{t.needs.length ? ` · Cần ${t.needs.map(n => NEED_LABEL[n].toLowerCase()).join(", ")}` : ""}</span>
                          <button className={added ? "btn-ghost !h-7 text-xs" : "btn-secondary !h-7 !px-3 text-xs"} onClick={() => applyTemplate(t.id)}>{added ? "Đã thêm · Mở" : "Dùng template"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <p className="text-xs text-muted-foreground">Chuẩn FPT: Theo tài liệu AI-Agents Quality Metrics (thang điểm và ngưỡng nghiệm thu QnA). Thư viện mở rộng: Chỉ số phổ biến cho hỏi đáp và dùng tool.</p>
        </div>
      )}

      <MetricEditor agentId={agentId} metric={editing} onClose={() => setEditing(null)} />
      <AlertDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chỉ số "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && evaluationStore.setsUsingMetric(toDelete.id).length > 0
                ? `Chỉ số đang dùng trong ${evaluationStore.setsUsingMetric(toDelete.id).map(s => s.name).join(", ")}. Các bộ test này sẽ không chấm chỉ số này nữa.`
                : "Chỉ số chưa được dùng ở bộ test nào."} Kết quả của các lượt chạy cũ vẫn được giữ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (toDelete) evaluationStore.deleteMetric(toDelete.id); setToDelete(null); }}>Xóa chỉ số</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ editor (LangSmith "Configure Evaluator", no code) */

function MetricEditor({ agentId, metric, onClose }: { agentId: string; metric: Metric | null; onClose: () => void }) {
  const [m, setM] = useState<Metric | null>(metric);
  const [preview, setPreview] = useState<"idle" | "running" | "done">("idle");
  const [caseId, setCaseId] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setM(metric); setPreview("idle"); }, [metric]);
  const cases = evaluationStore.sets(agentId).flatMap(s => evaluationStore.cases(s.id));
  useEffect(() => { if (!caseId && cases[0]) setCaseId(cases[0].id); }, [cases.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <Sheet open={false} />;

  const patch = (p: Partial<Metric>) => setM({ ...m, ...p });
  const insertVar = (v: string) => {
    const el = promptRef.current;
    const pos = el?.selectionStart ?? m.prompt.length;
    patch({ prompt: m.prompt.slice(0, pos) + v + m.prompt.slice(pos) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos + v.length, pos + v.length); });
  };
  const setFormat = (f: ResponseFormat) => {
    const levels: ScaleLevel[] = f === "boolean" ? [{ value: 1, label: "Đạt", pass: true }, { value: 0, label: "Không đạt", pass: false }]
      : f === "scale" ? [5, 4, 3, 2, 1].map(v => ({ value: v, label: m.levels.find(l => l.value === v)?.label ?? `Mức ${v}`, pass: v >= 4 }))
      : [{ value: 2, label: "Không vi phạm", pass: true }, { value: 1, label: "Vi phạm nhẹ", pass: false }, { value: 0, label: "Vi phạm nặng", pass: false }];
    patch({ format: f, levels });
  };
  const save = () => {
    if (!m.name.trim()) { toast.error("Nhập tên chỉ số"); return; }
    evaluationStore.saveMetric(m); toast.success("Đã lưu chỉ số"); onClose();
  };
  const sample = cases.find(c => c.id === caseId);
  const used = evaluationStore.setsUsingMetric(m.id);

  return (
    <Sheet open={!!metric} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b border-border text-left">
          <SheetTitle>Cấu hình chỉ số</SheetTitle>
          <SheetDescription>{m.kind === "contains" ? "Phải chứa - Kiểm tra cụm từ, không dùng LLM" : "AI Judge - AI chấm câu trả lời theo tiêu chí bạn viết"}{used.length ? ` · Đang dùng trong ${used.map(s => s.name).join(", ")}` : ""}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-medium">Tên chỉ số <span className="text-destructive">*</span></span>
              <input className="ds-input mt-1.5" value={m.name} onChange={e => patch({ name: e.target.value })} /></label>
            <label className="block"><span className="text-sm font-medium">Tên dễ hiểu</span>
              <input className="ds-input mt-1.5" value={m.vnName} onChange={e => patch({ vnName: e.target.value })} placeholder="Ví dụ: Không bịa thông tin" /></label>
            <label className="block sm:col-span-2"><span className="text-sm font-medium">Mô tả</span>
              <input className="ds-input mt-1.5" value={m.description} onChange={e => patch({ description: e.target.value })} placeholder="Chỉ số này kiểm tra điều gì" /></label>
            <label className="block"><span className="text-sm font-medium">Nhóm</span>
              <select className="ds-input mt-1.5" value={m.group} onChange={e => patch({ group: e.target.value as MetricGroup })}>{GROUPS.map(g => <option key={g} value={g}>{METRIC_GROUP_LABEL[g]}</option>)}</select></label>
            {m.kind === "judge" && (
              <label className="block"><span className="text-sm font-medium">Model chấm</span>
                <select className="ds-input mt-1.5" value={m.model} onChange={e => patch({ model: e.target.value })}>{JUDGE_MODELS.map(x => <option key={x}>{x}</option>)}</select></label>
            )}
          </section>

          {m.kind === "contains" ? (
            <section className="space-y-3">
              <h3 className="font-display text-sm font-semibold">Cụm từ bắt buộc</h3>
              <textarea className="ds-textarea font-mono text-xs" rows={4} value={(m.containsValues ?? []).join("\n")} onChange={e => patch({ containsValues: e.target.value.split("\n") })} placeholder={"Mỗi dòng một cụm từ\nVí dụ: 1900 638 399"} />
              <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5 w-fit" role="radiogroup" aria-label="Điều kiện">
                {([["all", "Có đủ mọi cụm từ"], ["any", "Có ít nhất 1 cụm từ"]] as const).map(([id, label]) => (
                  <button key={id} role="radio" aria-checked={m.containsMode === id} onClick={() => patch({ containsMode: id })}
                    className={`px-3 h-8 rounded-md text-xs font-medium transition-base cursor-pointer ${m.containsMode === id ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Không phân biệt chữ hoa, chữ thường.</p>
            </section>
          ) : (
            <>
              <section>
                <div className="flex items-end justify-between mb-1.5">
                  <h3 className="font-display text-sm font-semibold">Prompt chấm</h3>
                  <span className="text-xs text-muted-foreground">Bấm biến để chèn vào vị trí con trỏ</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VARIABLES.map(v => (
                    <button key={v.key} type="button" onClick={() => insertVar(v.key)} title={v.label}
                      className="chip chip-outline cursor-pointer hover:bg-surface-muted font-mono !text-[11px]">{v.key}</button>
                  ))}
                </div>
                <textarea ref={promptRef} className="ds-textarea font-mono text-xs leading-relaxed" rows={12} value={m.prompt} onChange={e => patch({ prompt: e.target.value })} aria-label="Prompt chấm" />
              </section>

              <section>
                <h3 className="font-display text-sm font-semibold">Kết quả chấm</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">Chấm theo thang để biết loại lỗi, sau đó quy ra Pass/Fail bằng ngưỡng.</p>
                <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5 w-fit mb-3" role="radiogroup" aria-label="Response format">
                  {([["boolean", "Pass/Fail"], ["scale", "Thang điểm 1-5"], ["category", "Phân loại"]] as const).map(([id, label]) => (
                    <button key={id} role="radio" aria-checked={m.format === id} onClick={() => setFormat(id)}
                      className={`px-3 h-8 rounded-md text-xs font-medium transition-base cursor-pointer ${m.format === id ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                  ))}
                </div>
                <div className="border border-border rounded-lg divide-y divide-border">
                  <div className="grid grid-cols-[64px_1fr_110px] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Giá trị</span><span>Nhãn hiển thị</span><span>Tính là</span>
                  </div>
                  {m.levels.map((l, i) => (
                    <div key={i} className="grid grid-cols-[64px_1fr_110px] gap-3 items-center px-3 py-2">
                      <span className="text-sm font-mono">{m.format === "category" ? `#${i + 1}` : l.value}</span>
                      <input className="ds-input !h-8" value={l.label} onChange={e => patch({ levels: m.levels.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label={`Nhãn mức ${l.value}`} />
                      <button onClick={() => patch({ levels: m.levels.map((x, j) => (j === i ? { ...x, pass: !x.pass } : x)) })}
                        className={`h-8 rounded-md text-xs font-semibold cursor-pointer transition-base ${l.pass ? "bg-[hsl(var(--success-soft))] text-success" : "bg-[hsl(var(--destructive-soft))] text-destructive"}`}>{l.pass ? "Pass" : "Fail"}</button>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2.5 mt-3 text-sm cursor-pointer">
                  <Switch checked={m.includeReasoning} onCheckedChange={v => patch({ includeReasoning: v })} /> Kèm lý do chấm
                  <span className="text-xs text-muted-foreground">- Giúp Builder biết sai ở đâu, tốn thêm token</span>
                </label>
              </section>
            </>
          )}

          <section className="rounded-lg bg-surface-muted px-4 py-3 text-xs text-muted-foreground space-y-1">
            <div><b className="text-foreground">Cần dữ liệu:</b> {(() => {
              const n = new Set<string>();
              if (m.prompt.includes("{{reference_output}}")) n.add(NEED_LABEL.reference);
              if (m.prompt.includes("{{context}}")) n.add(NEED_LABEL.context);
              if (m.prompt.includes("{{expected_tools}}")) n.add(NEED_LABEL.expectedTools);
              if (m.prompt.includes("{{guardrails}}")) n.add(NEED_LABEL.guardrails);
              return n.size ? [...n].join(", ") : "Chỉ cần câu hỏi và câu trả lời";
            })()}</div>
            <div><b className="text-foreground">Dùng cho Monitor:</b> {isMonitorable({ ...m, needs: m.prompt.includes("{{reference_output}}") ? ["reference"] : m.prompt.includes("{{expected_tools}}") ? ["expectedTools"] : [] }) ? "Có - Không cần đáp án mẫu nên chấm được hội thoại thật" : "Không - Hội thoại thật không có đáp án mẫu hoặc tool mong đợi"}</div>
          </section>

          <section className="surface-card p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-display text-sm font-semibold">Chạy thử</h3>
              <button className="btn-secondary !h-8" disabled={!sample || preview === "running"} onClick={() => { setPreview("running"); setTimeout(() => setPreview("done"), 1100); }}>
                {preview === "running" ? <><HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" /> Đang chấm…</> : <><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy thử</>}
              </button>
            </div>
            {cases.length === 0 ? <p className="text-sm text-muted-foreground">Tạo bộ test để chạy thử chỉ số trên test case thật.</p> : (
              <>
                <select className="ds-input" value={caseId} onChange={e => { setCaseId(e.target.value); setPreview("idle"); }} aria-label="Test case mẫu">
                  {cases.slice(0, 50).map(c => <option key={c.id} value={c.id}>{c.question}</option>)}
                </select>
                {preview === "done" && (
                  <div className="mt-3 rounded-lg border border-border px-3 py-2.5 text-sm" role="status">
                    <div className="flex items-center gap-2 mb-1"><span className="chip chip-success !py-0.5">{m.levels.find(l => l.pass)?.label ?? "Đạt"}</span><span className="text-xs text-muted-foreground">Giá trị {m.levels.find(l => l.pass)?.value}</span></div>
                    {m.includeReasoning && <p className="text-muted-foreground">Câu trả lời của Agent đáp ứng tiêu chí "{m.vnName || m.name}" cho câu hỏi này.</p>}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
        <div className="px-6 py-3 border-t border-border flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={save}>Lưu chỉ số</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
