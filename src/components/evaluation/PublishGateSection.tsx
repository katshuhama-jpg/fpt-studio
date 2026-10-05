import { HugeiconsIcon } from "@hugeicons/react";
import { Rocket01Icon, Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { evaluationStore, useEvaluationStore, runStats } from "./evaluationStore";
import { EmptyState, ThresholdBar, useEvalNav } from "./shared";

export function PublishGateSection({ agentId }: { agentId: string }) {
  useEvaluationStore();
  const { go } = useEvalNav();
  const sets = evaluationStore.sets(agentId);
  const blockers = evaluationStore.publishBlockers(agentId);
  const enabled = sets.filter(s => evaluationStore.gate(s.id).enabled);

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <div>
        <h2 className="font-display text-xl font-semibold">Publish</h2>
        <p className="text-sm text-muted-foreground mt-1">Chọn bộ test phải đạt trước khi gửi publish. Hệ thống lấy lượt chạy mới nhất của mỗi bộ test để so với Min. pass.</p>
      </div>

      {sets.length === 0 ? (
        <EmptyState icon={Rocket01Icon} title="Chưa có bộ test để kiểm tra trước khi publish" desc="Tạo bộ test cho các nghiệp vụ quan trọng, sau đó bật ở đây để Agent chỉ được publish khi đạt yêu cầu.">
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
                  <div className="text-foreground/80 mt-0.5">{blockers.map(b => b.rate === undefined ? `${b.set.name}: Chưa chạy` : `${b.set.name}: ${b.rate}% (cần ${b.gate.minPass}%)`).join(" · ")}. Sửa Agent rồi chạy lại các bộ test này.</div>
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
                        <div className="relative w-24">
                          <input type="number" min={0} max={100} className="ds-input !h-8 pr-7" value={g.minPass} disabled={!g.enabled}
                            onChange={e => evaluationStore.saveGate({ ...g, minPass: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} aria-label={`Min. pass của ${s.name}`} />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch checked={g.blocks} disabled={!g.enabled} onCheckedChange={v => evaluationStore.saveGate({ ...g, blocks: v })} aria-label={`Chặn publish khi ${s.name} không đạt`} />
                          <span className="text-xs">{g.blocks ? "Chặn" : "Chỉ cảnh báo"}</span>
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
    </div>
  );
}
