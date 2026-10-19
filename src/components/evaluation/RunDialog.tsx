import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, Alert02Icon, Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { evaluationStore, TEMPLATE_METRICS, METRIC_GROUP_LABEL, passRuleText, type SetMetric } from "./evaluationStore";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import { CURRENT_USER } from "./shared";

/** Draft = what the Builder is editing now; Live = the version end users currently get. */
function versionOptions(agentId: string) {
  const ps = agentPublishStore.get(agentId);
  const live = ps.placement !== null ? ps.version : null;
  return [
    { id: "draft", label: live ? `Bản nháp (sau ${live})` : "Bản nháp", hint: "Đang chỉnh sửa, chưa publish", disabled: false },
    { id: "live", label: live ? `Live ${live}` : "Live", hint: live ? "Bản người dùng đang dùng" : "Nhân sự số chưa publish", disabled: !live },
  ];
}

const stamp = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };

/** Above this many Bắt buộc metrics a run gets slow and costly (each one is a separate grading call). */
const MANY_REQUIRED = 5;

/** Chạy bộ test (Relevance "Run" modal): tên lượt chạy, bộ test, version và CHỈ SỐ CHẤM.
 * Bộ test và test case không gắn chỉ số - chỉ số chọn ở đây, mỗi lượt chạy một bộ chỉ số;
 * lần sau mở lại sẽ chọn sẵn các chỉ số của lượt trước. */
export function RunDialog({ agentId, open, onOpenChange, presetSetId, presetCaseIds, onStarted }: {
  agentId: string; open: boolean; onOpenChange: (o: boolean) => void; presetSetId?: string; presetCaseIds?: string[]; onStarted: (runId: string) => void;
}) {
  const sets = evaluationStore.sets(agentId);
  const [setId, setSetId] = useState(presetSetId ?? sets[0]?.id ?? "");
  const [version, setVersion] = useState("draft");
  const [name, setName] = useState("");
  const [metrics, setMetrics] = useState<SetMetric[]>([]);
  const [touched, setTouched] = useState(false);
  const VERSION_OPTIONS = versionOptions(agentId);
  useEffect(() => {
    if (!open) return;
    const sid = presetSetId ?? sets[0]?.id ?? "";
    setSetId(sid); setVersion("draft"); setTouched(false);
    setName(`${evaluationStore.set(sid)?.name ?? "Lượt chạy"} - ${stamp()}`);
  }, [open, presetSetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-tick last run's metrics for this set (FPT defaults the first time).
  useEffect(() => {
    if (open && setId) setMetrics(evaluationStore.defaultRunMetrics(setId, Object.keys(evaluationStore.set(setId)?.toolModes ?? {}).length > 0));
  }, [open, setId]);

  const set = evaluationStore.set(setId);
  const cases = set ? evaluationStore.cases(set.id).filter(c => !presetCaseIds || presetCaseIds.includes(c.id)) : [];
  const agentMetrics = evaluationStore.agentMetrics(agentId);
  const addable = [
    ...agentMetrics.filter(m => !metrics.some(sm => sm.metricId === m.id)),
    ...TEMPLATE_METRICS.filter(t => !agentMetrics.some(m => m.templateId === t.id)),
  ];
  const required = metrics.filter(m => m.required).length;
  const liveWrite = set ? Object.entries(set.toolModes).filter(([, mode]) => mode === "live") : [];
  const draftCount = set ? evaluationStore.unreviewed(set.id).length : 0;
  const missingRef = set ? metrics.some(sm => evaluationStore.metric(sm.metricId)?.needs.includes("reference")) && cases.some(c => !c.reference) : false;
  const totalCalls = cases.reduce((a, c) => a + (c.runsPerCase ?? set?.runsPerCase ?? 1), 0);

  const start = () => {
    setTouched(true);
    if (!set || required === 0) return;
    const run = evaluationStore.startRun(set.id, VERSION_OPTIONS.find(v => v.id === version)!.label, CURRENT_USER, { name: name.trim() || undefined, caseIds: presetCaseIds, metrics });
    onOpenChange(false);
    onStarted(run.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-viewonly-allow className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{presetCaseIds ? `Chạy ${presetCaseIds.length} test đã chọn` : "Chạy bộ test"}</DialogTitle>
          <DialogDescription>Nhân sự số trả lời từng test case, sau đó hệ thống chấm theo các chỉ số bạn chọn bên dưới.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Tên lượt chạy</span>
            <input className="ds-input mt-1.5" value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Bộ test</span>
            <select className="ds-input mt-1.5" value={setId} onChange={e => setSetId(e.target.value)} disabled={!!presetSetId}>
              {sets.map(s => <option key={s.id} value={s.id}>{s.name} ({evaluationStore.cases(s.id).length} test)</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-medium mb-1.5">Version</legend>
            <div className="grid grid-cols-2 gap-2">
              {VERSION_OPTIONS.map(v => (
                <button key={v.id} type="button" onClick={() => setVersion(v.id)} aria-pressed={version === v.id} disabled={v.disabled}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-base ${v.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${version === v.id ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"}`}>
                  <div className="text-sm font-semibold">{v.label}</div>
                  <div className="text-xs text-muted-foreground">{v.hint}</div>
                </button>
              ))}
            </div>
          </fieldset>
          <section>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Chỉ số chấm <span className="text-destructive">*</span></h3>
                <p className="text-xs text-muted-foreground mt-0.5">Bắt buộc: Tính vào Pass rate. Theo dõi: Chỉ xem kết quả, không làm test fail.</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><button type="button" className="btn-secondary !h-8 text-xs shrink-0"><HugeiconsIcon icon={Add01Icon} size={12} /> Thêm chỉ số</button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-72 overflow-y-auto">
                  {addable.length === 0 ? <div className="px-2 py-3 text-xs text-muted-foreground">Đã chọn mọi chỉ số có sẵn.</div> : addable.map(m => (
                    <DropdownMenuItem key={m.id} className="items-start py-2" onClick={() => {
                      const metric = m.agentId === "template" ? evaluationStore.addFromTemplate(agentId, m.id) : m;
                      setMetrics(v => [...v.filter(x => x.metricId !== metric.id), { metricId: metric.id, required: true }]);
                    }}>
                      <div>
                        <div className="font-medium">{m.name} <span className="text-xs text-muted-foreground font-normal">· {METRIC_GROUP_LABEL[m.group]}</span></div>
                        <div className="text-xs text-muted-foreground">{m.vnName}{m.agentId === "template" ? " · Từ thư viện" : ""}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-2 rounded-lg border border-border divide-y divide-border">
              {metrics.map(sm => {
                const m = evaluationStore.metric(sm.metricId);
                if (!m) return null;
                return (
                  <div key={sm.metricId} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{m.name} <span className="text-xs text-muted-foreground">· {m.vnName}</span></div>
                      <div className="text-[11px] text-muted-foreground truncate">{passRuleText(m)}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5 shrink-0" role="radiogroup" aria-label={`Loại chỉ số ${m.name}`}>
                      {[true, false].map(r => (
                        <button key={String(r)} type="button" role="radio" aria-checked={sm.required === r} onClick={() => setMetrics(v => v.map(x => (x.metricId === sm.metricId ? { ...x, required: r } : x)))}
                          className={`px-2 h-7 rounded-md text-xs font-medium transition-base cursor-pointer ${sm.required === r ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                          {r ? "Bắt buộc" : "Theo dõi"}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn-ghost !px-1.5 !h-7" aria-label={`Bỏ chỉ số ${m.name}`} onClick={() => setMetrics(v => v.filter(x => x.metricId !== sm.metricId))}><HugeiconsIcon icon={Delete02Icon} size={13} /></button>
                  </div>
                );
              })}
              {metrics.length === 0 && <div className="px-3 py-5 text-center text-sm text-muted-foreground">Chưa chọn chỉ số nào - Bấm Thêm chỉ số để chọn</div>}
            </div>
            {touched && required === 0 && <span className="text-xs text-destructive mt-1 block">Chọn ít nhất 1 chỉ số Bắt buộc để tính Pass rate</span>}
            {required > MANY_REQUIRED && <p className="text-xs text-warning mt-1">{required} chỉ số Bắt buộc - Lượt chạy sẽ lâu và tốn hơn. Chuyển bớt sang Theo dõi nếu không cần chặn.</p>}
          </section>
          {set && (
            <div className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
              {cases.length} test × {set.runsPerCase} lần = <b className="text-foreground">{totalCalls} lượt trả lời</b> · {metrics.length} chỉ số ({required} bắt buộc)
            </div>
          )}
          {liveWrite.length > 0 && (
            <div className="flex gap-2 rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))] px-3 py-2.5 text-sm">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="text-warning shrink-0 mt-0.5" />
              <span>Tool sau sẽ được gọi thật: <b>{liveWrite.map(([k]) => k).join(", ")}</b>. Chuyển sang Simulated trong Cài đặt bộ test nếu không muốn tạo dữ liệu thật.</span>
            </div>
          )}
          {draftCount > 0 && (
            <div className="flex gap-2 rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))] px-3 py-2.5 text-sm">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="text-warning shrink-0 mt-0.5" />
              <span>{draftCount} test case do AI sinh chưa được duyệt. Vẫn chạy được, nhưng đáp án mẫu chưa kiểm tra có thể làm kết quả chấm sai.</span>
            </div>
          )}
          {missingRef && (
            <div className="flex gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="shrink-0 mt-0.5" />
              <span>Một số test chưa có đáp án mẫu - Các chỉ số cần đáp án mẫu sẽ bỏ qua những test này.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <button className="btn-secondary" onClick={() => onOpenChange(false)}>Hủy</button>
          <button className="btn-primary" onClick={start} disabled={!set || cases.length === 0}>
            <HugeiconsIcon icon={PlayIcon} size={14} /> Bắt đầu chạy
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
