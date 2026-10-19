import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Rocket01Icon, Alert02Icon, Tick02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MetricsPicker } from "./RunDialog";
import { evaluationStore, useEvaluationStore, runStats, type SetMetric, type TestSet } from "./evaluationStore";
import { EmptyState, ThresholdBar, useEvalNav, CURRENT_USER } from "./shared";

export function PublishGateSection({ agentId }: { agentId: string }) {
  useEvaluationStore();
  const { go } = useEvalNav();
  const sets = evaluationStore.sets(agentId);
  const blockers = evaluationStore.publishBlockers(agentId);
  const enabled = sets.filter(s => evaluationStore.gate(s.id).enabled);
  const [editing, setEditing] = useState<TestSet | null>(null);

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <div>
        <h2 className="font-display text-xl font-semibold">Điều kiện publish</h2>
        <p className="text-sm text-muted-foreground mt-1">Chọn bộ test phải đạt trước khi gửi publish. Khi bấm Publish, các bộ test đang bật sẽ tự chạy trên bản nháp, chấm theo chỉ số chọn ở đây và so với Min. pass.</p>
      </div>

      {sets.length === 0 ? (
        <EmptyState icon={Rocket01Icon} title="Chưa có bộ test để kiểm tra trước khi publish" desc="Tạo bộ test cho các nghiệp vụ quan trọng, sau đó bật ở đây để Nhân sự số chỉ được publish khi đạt yêu cầu.">
          <button className="btn-primary" onClick={() => go("test-sets")}>Đi tới Bộ test</button>
        </EmptyState>
      ) : (
        <>
          {enabled.length > 0 && (
            blockers.length > 0 ? (
              <div className="flex gap-3 rounded-xl border border-[hsl(var(--destructive)/0.25)] bg-[hsl(var(--destructive-soft))] px-4 py-3">
                <HugeiconsIcon icon={Alert02Icon} size={18} className="text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-destructive">Bản nháp hiện chưa publish được</div>
                  <div className="text-foreground/80 mt-0.5">{blockers.map(b => b.rate === undefined ? `${b.set.name}: Chưa chạy` : `${b.set.name}: ${b.rate}% (cần ${b.gate.minPass}%)`).join(" · ")}. Sửa Nhân sự số rồi chạy lại các bộ test này.</div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success-soft))] px-4 py-3">
                <HugeiconsIcon icon={Tick02Icon} size={18} className="text-success shrink-0 mt-0.5" />
                <div className="text-sm"><span className="font-semibold text-success">Đạt mọi bộ test bắt buộc</span> - Bạn có thể gửi publish.</div>
              </div>
            )
          )}
          <div className="surface-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5 w-16">Dùng</th>
                  <th className="text-left font-medium px-4 py-2.5">Bộ test</th>
                  <th className="text-left font-medium px-4 py-2.5 w-[260px]">Lượt chạy mới nhất</th>
                  <th className="text-left font-medium px-4 py-2.5">Chỉ số chấm</th>
                  <th className="text-left font-medium px-4 py-2.5 w-32">Min. pass</th>
                  <th className="text-left font-medium px-4 py-2.5">Chặn publish</th>
                  <th className="text-left font-medium px-4 py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sets.map(s => {
                  const g = evaluationStore.gate(s.id);
                  const run = evaluationStore.latestRun(s.id);
                  const st = run ? runStats(run) : undefined;
                  const ok = st && st.rate >= g.minPass;
                  return (
                    <tr key={s.id} className={`border-t border-border ${g.enabled ? "" : "text-muted-foreground"}`}>
                      <td className="px-4 py-3"><Switch checked={g.enabled} onCheckedChange={v => evaluationStore.saveGate({ ...g, enabled: v })} aria-label={`Dùng ${s.name} để duyệt publish`} /></td>
                      <td className="px-4 py-3">
                        <button className="font-medium text-foreground hover:underline cursor-pointer" onClick={() => go("test-sets", s.id)}>{s.name}</button>
                        <div className="text-xs text-muted-foreground">{evaluationStore.cases(s.id).length} test</div>
                      </td>
                      <td className="px-4 py-3">
                        {st ? (
                          <button className="w-full text-left cursor-pointer group" onClick={() => go("runs", run!.id)}>
                            <div className="flex items-center gap-2 text-xs mb-1"><b className="text-foreground">{st.rate}%</b><span className="text-muted-foreground group-hover:underline">#{run!.number} · {run!.version}</span></div>
                            <ThresholdBar value={st.rate} threshold={g.enabled ? g.minPass : undefined} tone={!g.enabled ? "primary" : ok ? "pass" : "fail"} />
                          </button>
                        ) : <span className="text-xs">Chưa chạy</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const ms = evaluationStore.gateMetrics(s.id);
                          return (
                            <button type="button" disabled={!g.enabled} onClick={() => setEditing(s)} aria-label={`Chọn chỉ số chấm cho ${s.name}`}
                              className="text-left text-xs cursor-pointer disabled:cursor-not-allowed group">
                              <span className={g.enabled ? "text-foreground" : ""}>{ms.length} chỉ số ({ms.filter(m => m.required).length} bắt buộc)</span>
                              {g.enabled && <span className="block text-primary font-semibold group-hover:underline">Chọn chỉ số</span>}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative w-24">
                          <input type="number" min={0} max={100} className="ds-input !h-8 pr-7" value={g.minPass} disabled={!g.enabled}
                            onChange={e => evaluationStore.saveGate({ ...g, minPass: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} aria-label={`Min. pass của ${s.name}`} />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch checked={g.blocks} disabled={!g.enabled} onCheckedChange={v => evaluationStore.saveGate({ ...g, blocks: v })} aria-label={`Chặn publish khi ${s.name} không đạt`} />
                          <span className="text-xs">{g.blocks ? "Chặn" : "Vẫn cho publish"}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        {!g.enabled ? <span className="text-xs">Không dùng</span>
                          : !st ? <span className="chip chip-warning !py-0.5">Cần chạy</span>
                          : ok ? <span className="chip chip-success !py-0.5">Đạt</span>
                          : <span className="chip chip-danger !py-0.5">{g.blocks ? "Chặn publish" : "Không đạt"}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Min. pass khuyến nghị cho QnA: 90% (theo tiêu chí nghiệm thu FPT). Pass rate chỉ tính các chỉ số Bắt buộc. Admin duyệt publish cũng thấy kết quả này.</p>
        </>
      )}
      <GateMetricsDialog agentId={agentId} set={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** Inside the Publish modal (Relevance: "the selected Test sets will run automatically"). Starts a run
 * of every test set marked for publish on the Draft, shows progress, then reports whether publish
 * is allowed: sets with "Chặn publish" must reach Min. pass; the others only warn. */
export function PublishEvalCheck({ agentId, onStatus, onOpenEvaluate }: { agentId: string; onStatus: (s: "none" | "running" | "passed" | "warn" | "blocked") => void; onOpenEvaluate: () => void }) {
  useEvaluationStore();
  const [runIds, setRunIds] = useState<Record<string, string>>({});
  const sets = evaluationStore.sets(agentId).filter(s => evaluationStore.gate(s.id).enabled && evaluationStore.cases(s.id).length > 0);
  useEffect(() => {
    const ids: Record<string, string> = {};
    sets.forEach(s => { ids[s.id] = evaluationStore.startRun(s.id, "Bản nháp - kiểm tra khi publish", CURRENT_USER, { name: `Kiểm tra khi publish - ${s.name}`, metrics: evaluationStore.gateMetrics(s.id), remember: false }).id; });
    setRunIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);
  const rows = sets.map(s => {
    const g = evaluationStore.gate(s.id);
    const run = runIds[s.id] ? evaluationStore.run(runIds[s.id]) : undefined;
    const rate = run && run.status === "done" ? runStats(run).rate : undefined;
    return { s, g, run, rate, ok: rate !== undefined && rate >= g.minPass };
  });
  const running = rows.some(r => !r.run || r.run.status === "running");
  const blocked = rows.some(r => r.rate !== undefined && !r.ok && r.g.blocks);
  const warn = rows.some(r => r.rate !== undefined && !r.ok && !r.g.blocks);
  const status = sets.length === 0 ? "none" : running ? "running" : blocked ? "blocked" : warn ? "warn" : "passed";
  useEffect(() => { onStatus(status); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (sets.length === 0) return null;
  const tone = status === "blocked" ? "border-[hsl(var(--destructive)/0.25)] bg-[hsl(var(--destructive-soft))]" : status === "passed" ? "border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success-soft))]" : status === "warn" ? "border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))]" : "border-border bg-surface-muted";
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${tone}`} role="status" aria-live="polite">
      <div className="font-semibold flex items-center gap-2">
        {status === "running" && <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin text-primary" />}
        {status === "running" ? "Đang chạy bộ test trước khi publish…" : status === "blocked" ? <span className="text-destructive">Chưa đạt điều kiện publish</span> : status === "warn" ? "Có bộ test chưa đạt - Vẫn publish được" : <span className="text-success">Đạt mọi điều kiện publish</span>}
      </div>
      <div className="mt-1.5 space-y-1">
        {rows.map(r => (
          <div key={r.s.id} className="flex items-center gap-2 text-xs">
            <span className="flex-1">{r.s.name}</span>
            {r.rate === undefined
              ? <span className="text-muted-foreground">{r.run?.progress ?? 0}%</span>
              : <span className={r.ok ? "text-success font-semibold" : r.g.blocks ? "text-destructive font-semibold" : "text-warning font-semibold"}>{r.rate}% (cần {r.g.minPass}%){!r.ok && !r.g.blocks ? " - Chỉ cảnh báo" : ""}</span>}
          </div>
        ))}
      </div>
      {status !== "running" && <button type="button" onClick={onOpenEvaluate} className="text-primary font-semibold hover:underline mt-1.5 text-xs">Xem kết quả Evaluate</button>}
    </div>
  );
}

/** Chỉ số dùng khi tự chạy bộ test lúc bấm Publish - chọn riêng cho từng bộ test, không ảnh hưởng chỉ số chọn sẵn ở hộp Chạy bộ test. */
function GateMetricsDialog({ agentId, set, onClose }: { agentId: string; set: TestSet | null; onClose: () => void }) {
  const [metrics, setMetrics] = useState<SetMetric[]>([]);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (set) { setMetrics(evaluationStore.gateMetrics(set.id)); setTouched(false); } }, [set]);
  const save = () => {
    setTouched(true);
    if (!set || !metrics.some(m => m.required)) return;
    evaluationStore.saveGate({ ...evaluationStore.gate(set.id), metrics });
    onClose();
  };
  return (
    <Dialog open={!!set} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉ số chấm khi publish</DialogTitle>
          <DialogDescription>Bộ test {set?.name} sẽ tự chạy trên bản nháp mỗi lần bấm Publish và chấm theo các chỉ số dưới đây.</DialogDescription>
        </DialogHeader>
        <MetricsPicker agentId={agentId} value={metrics} onChange={setMetrics} touched={touched}
          hint="Bắt buộc: Tính vào Pass rate để so với Min. pass. Theo dõi: Chỉ hiện kết quả, không chặn publish." />
        <DialogFooter>
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={save}>Lưu</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
