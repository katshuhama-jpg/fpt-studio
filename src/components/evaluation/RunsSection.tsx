import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, PlayIcon, Download04Icon, Loading03Icon, Alert02Icon, AiMagicIcon, Edit02Icon, Route01Icon } from "@hugeicons/core-free-icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  evaluationStore, useEvaluationStore, runStats, metricStats, cellStatus, caseStatus, METRIC_GROUP_LABEL, passRuleText,
  CASE_GROUPS, OK_ANSWER, type Run, type Metric, type MetricGroup,
} from "./evaluationStore";
import { EmptyState, ResultCell, StatusText, ThresholdBar, Delta, RequiredBadge, useEvalNav, fmtDateTime, fmtDuration, fmtNumber, TONE } from "./shared";
import { RunDialog } from "./RunDialog";

export function RunsSection({ agentId, onRefineWithAI }: { agentId: string; onRefineWithAI: () => void }) {
  useEvaluationStore();
  const { item } = useEvalNav();
  const run = item ? evaluationStore.run(item) : undefined;
  if (run) return <RunDetail run={run} agentId={agentId} onRefineWithAI={onRefineWithAI} />;
  return <RunList agentId={agentId} />;
}

/* ------------------------------------------------------------------ list */

function RunList({ agentId }: { agentId: string }) {
  const { go } = useEvalNav();
  const runs = evaluationStore.runs(agentId);
  const sets = evaluationStore.sets(agentId);
  const [setFilter, setSetFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const shown = runs.filter(r => setFilter === "all" || r.setId === setFilter);

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Lượt chạy</h2>
          <p className="text-sm text-muted-foreground mt-1">Mỗi lượt chạy cho Agent trả lời toàn bộ bộ test rồi chấm theo các chỉ số. So sánh 2 lượt để biết lần sửa gần nhất có làm Agent tốt hơn không.</p>
        </div>
        {sets.length > 0 && <button className="btn-primary shrink-0" onClick={() => setOpen(true)}><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy bộ test</button>}
      </div>

      {runs.length === 0 ? (
        <EmptyState icon={PlayIcon} title="Chưa có lượt chạy nào" desc={sets.length ? "Chạy một bộ test để xem Agent đạt bao nhiêu phần trăm và sai ở đâu." : "Tạo bộ test trước, sau đó chạy để xem kết quả chấm."}>
          {sets.length ? <button className="btn-primary" onClick={() => setOpen(true)}><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy bộ test</button>
            : <button className="btn-primary" onClick={() => go("test-sets")}>Đi tới Bộ test</button>}
        </EmptyState>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Bộ test</span>
            <select className="ds-input !h-8 !w-56" value={setFilter} onChange={e => setSetFilter(e.target.value)} aria-label="Lọc theo bộ test">
              <option value="all">Tất cả bộ test</option>
              {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">#</th>
                <th className="text-left font-medium px-4 py-2.5">Bộ test</th>
                <th className="text-left font-medium px-4 py-2.5">Version</th>
                <th className="text-left font-medium px-4 py-2.5 w-[260px]">Pass rate</th>
                <th className="text-left font-medium px-4 py-2.5">Chỉ số</th>
                <th className="text-left font-medium px-4 py-2.5">Chạy lúc</th>
                <th className="text-left font-medium px-4 py-2.5">Người chạy</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(r => {
                const gate = evaluationStore.gate(r.setId);
                const st = r.status === "done" ? runStats(r) : undefined;
                const below = st && gate.enabled && st.rate < gate.minPass;
                return (
                  <tr key={r.id} onClick={() => go("runs", r.id)} className="border-t border-border hover:bg-surface-muted/50 cursor-pointer transition-base">
                    <td className="px-4 py-3 text-muted-foreground">#{r.number}</td>
                    <td className="px-4 py-3 font-medium">{r.setName}</td>
                    <td className="px-4 py-3">{r.version}</td>
                    <td className="px-4 py-3">
                      {r.status === "running" ? (
                        <div role="status" aria-live="polite">
                          <div className="flex items-center gap-1.5 text-xs text-primary mb-1"><HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" /> Đang chạy {r.progress}%</div>
                          <ThresholdBar value={r.progress} tone="primary" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <b className={`w-10 ${below ? "text-destructive" : "text-success"}`}>{st!.rate}%</b>
                          <ThresholdBar value={st!.rate} threshold={gate.enabled ? gate.minPass : undefined} tone={below ? "fail" : "pass"} width="w-28" />
                          {gate.enabled && <span className={`chip !py-0.5 !text-[11px] ${below ? "chip-danger" : "chip-success"}`}>{below ? "Không đạt" : "Đạt"}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.metrics.length}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <RunDialog agentId={agentId} open={open} onOpenChange={setOpen} onStarted={id => go("runs", id)} />
    </div>
  );
}

/* ------------------------------------------------------------------ detail (Phương án C) */

const GROUP_ORDER: MetricGroup[] = ["quality", "safety", "behavior"];
const LABEL_TONE = (label: string, pass: boolean) => (pass ? "bg-success" : ["Sai lệch", "Bịa thông tin", "Critical", "High", "Lộ dữ liệu cá nhân", "Sai hoàn toàn"].includes(label) ? "bg-destructive" : "bg-warning");

function RunDetail({ run, agentId, onRefineWithAI }: { run: Run; agentId: string; onRefineWithAI: () => void }) {
  const { go, params } = useEvalNav();
  const [runAgain, setRunAgain] = useState(false);
  const metricList = run.metrics.map(sm => ({ sm, m: evaluationStore.metric(sm.metricId) })).filter((x): x is { sm: typeof x.sm; m: Metric } => !!x.m);
  const [metricId, setMetricId] = useState(() => {
    const failing = metricList.filter(x => x.sm.required).sort((a, b) => metricStats(run, a.m.id).rate - metricStats(run, b.m.id).rate)[0];
    return failing?.m.id ?? metricList[0]?.m.id;
  });
  const [compare, setCompare] = useState(params.get("compare") === "1");
  const [label, setLabel] = useState<string | null>(null);
  const [openCase, setOpenCase] = useState<{ caseId: string; metricId: string } | null>(null);
  useEffect(() => { setLabel(null); }, [metricId]);

  const prev = evaluationStore.previousRun(run);
  const gate = evaluationStore.gate(run.setId);

  if (run.status === "running") {
    return (
      <div className="p-8 w-full space-y-5 animate-fade-up">
        <button onClick={() => go("runs")} className="btn-ghost -ml-2"><HugeiconsIcon icon={ArrowLeft01Icon} size={14} /> Lượt chạy</button>
        <div className="surface-card p-10 flex flex-col items-center text-center" role="status" aria-live="polite">
          <HugeiconsIcon icon={Loading03Icon} size={30} className="text-primary animate-spin mb-4" />
          <h2 className="font-display text-lg font-semibold">Đang chạy #{run.number} - {run.setName} · {run.version}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{run.caseIds.length} test × {run.runsPerCase} lần · {run.metrics.length} chỉ số. Bạn có thể rời trang, lượt chạy vẫn tiếp tục.</p>
          <div className="w-full max-w-md"><ThresholdBar value={run.progress} tone="primary" /></div>
          <div className="text-sm font-medium mt-2">{run.progress}%</div>
        </div>
      </div>
    );
  }

  const st = runStats(run);
  const prevSt = prev ? runStats(prev) : undefined;
  const passed = !gate.enabled || st.rate >= gate.minPass;
  const current = metricList.find(x => x.m.id === metricId) ?? metricList[0];
  const cases = evaluationStore.cases(run.setId);
  const caseById = (id: string) => cases.find(c => c.id === id);

  const regress = prev ? run.caseIds.filter(id => prev.results[id] && caseStatus(prev, id) === "pass" && caseStatus(run, id) !== "pass") : [];
  const improve = prev ? run.caseIds.filter(id => prev.results[id] && caseStatus(prev, id) !== "pass" && caseStatus(run, id) === "pass") : [];

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <button onClick={() => go("runs")} className="btn-ghost -ml-2"><HugeiconsIcon icon={ArrowLeft01Icon} size={14} /> Lượt chạy</button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Lượt chạy #{run.number}</div>
          <h2 className="font-display text-xl font-semibold">{run.setName} - {run.version}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
            <span>{st.total} test × {run.runsPerCase} lần</span>
            <span>{run.metrics.length} chỉ số ({run.metrics.filter(m => m.required).length} bắt buộc, {run.metrics.filter(m => !m.required).length} theo dõi)</span>
            <span>Chạy bởi {run.by} · {fmtDateTime(run.createdAt)}</span>
            <span>Thời gian: {fmtDuration(run.durationSec)}</span>
            <span>Chi phí: {fmtNumber(run.tokens)} token</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary" onClick={() => toast.success(`Đã xuất kết quả lượt chạy #${run.number} ra .xlsx`)}><HugeiconsIcon icon={Download04Icon} size={14} /> Xuất .xlsx</button>
          <button className="btn-primary" onClick={() => setRunAgain(true)}><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy lại</button>
        </div>
      </div>

      {/* Verdict */}
      <div className="surface-card p-5 flex flex-wrap items-center gap-x-8 gap-y-4">
        <div>
          <div className="text-xs text-muted-foreground">Pass rate</div>
          <div className="font-display text-3xl font-semibold tracking-tight">{st.rate}%</div>
        </div>
        <div className="min-w-[240px]">
          {gate.enabled ? (
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold ${passed ? TONE.pass : TONE.fail}`}>
              {passed ? "Đạt" : "Không đạt"}{!passed && gate.blocks ? " - Chặn publish" : ""}
            </span>
          ) : <span className="chip chip-muted">Bộ test chưa dùng để duyệt publish</span>}
          <div className="mt-2.5"><ThresholdBar value={st.rate} threshold={gate.enabled ? gate.minPass : undefined} tone={passed ? "pass" : "fail"} /></div>
          <div className="text-xs text-muted-foreground mt-1.5">{st.pass}/{st.total} test pass mọi chỉ số bắt buộc{gate.enabled ? ` · Min. pass ${gate.minPass}%` : ""}</div>
        </div>
        <div className="w-px self-stretch bg-border hidden md:block" />
        <div><div className="text-xs text-muted-foreground">Lỗi nghiêm trọng</div><div className={`text-sm font-semibold ${st.critical ? "text-destructive" : ""}`}>{st.critical ? `${st.critical} Safety Critical` : "Không có"}</div></div>
        <div><div className="text-xs text-muted-foreground">Không ổn định</div><div className={`text-sm font-semibold ${st.unstable ? "text-warning" : ""}`}>{st.unstable} test</div></div>
        <div><div className="text-xs text-muted-foreground">{prev ? `So với #${prev.number} (${prev.version})` : "Lượt trước"}</div><div><Delta cur={st.rate} prev={prevSt?.rate} /></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
        {/* Metric rail */}
        <div className="surface-card overflow-hidden lg:sticky lg:top-4">
          <div className="px-4 py-3 border-b border-border font-display text-sm font-semibold">Chỉ số</div>
          <div role="listbox" aria-label="Chọn chỉ số">
            {GROUP_ORDER.map(g => {
              const items = metricList.filter(x => x.m.group === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{METRIC_GROUP_LABEL[g]}</div>
                  {items.map(({ sm, m }) => {
                    const ms = metricStats(run, m.id);
                    const pms = prev ? metricStats(prev, m.id) : undefined;
                    const ok = ms.rate >= (gate.enabled ? gate.minPass : 90);
                    const color = ok ? "text-success" : sm.required ? "text-destructive" : "text-warning";
                    const on = m.id === current?.m.id;
                    return (
                      <button key={m.id} role="option" aria-selected={on} onClick={() => setMetricId(m.id)}
                        className={`w-full text-left px-4 py-2.5 border-l-2 transition-base cursor-pointer ${on ? "border-primary bg-primary-soft" : "border-transparent hover:bg-surface-muted"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate">{m.name}</span>
                          <RequiredBadge required={sm.required} />
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{m.vnName} · {passRuleText(m)}</div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className={`font-display text-lg font-semibold ${color}`}>{ms.rate}%</span>
                          {compare ? <Delta cur={ms.rate} prev={pms?.applicable ? pms.rate : undefined} /> : <span className="text-xs text-muted-foreground">{ms.pass}/{ms.applicable} test</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <label className="flex items-center gap-2.5 px-4 py-3 border-t border-border text-sm cursor-pointer">
            <Switch checked={compare} onCheckedChange={setCompare} disabled={!prev} aria-label="So sánh với lượt trước" />
            <span className={prev ? "" : "text-muted-foreground"}>{prev ? `So sánh với #${prev.number} (${prev.version})` : "Chưa có lượt trước để so sánh"}</span>
          </label>
        </div>

        <div className="space-y-4 min-w-0">
          {compare && prev && (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[hsl(var(--destructive)/0.25)] bg-[hsl(var(--destructive-soft))] p-4">
                <div className="font-semibold text-destructive text-sm">{regress.length} test tụt từ Pass xuống Fail</div>
                <div className="text-xs text-muted-foreground mb-2">Xem lại trước khi publish {run.version}</div>
                {regress.length === 0 ? <div className="text-sm text-muted-foreground">Không có test nào bị tụt.</div> : regress.map(id => (
                  <button key={id} onClick={() => setOpenCase({ caseId: id, metricId: firstFailing(run, id) ?? current!.m.id })} className="w-full text-left flex items-center justify-between gap-2 py-1 text-sm hover:underline cursor-pointer">
                    <span className="truncate">{caseById(id)?.question}</span><StatusText status={caseStatus(run, id)} />
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success-soft))] p-4">
                <div className="font-semibold text-success text-sm">{improve.length} test được cải thiện</div>
                <div className="text-xs text-muted-foreground mb-2">Từ Fail hoặc Không ổn định lên Pass</div>
                {improve.length === 0 ? <div className="text-sm text-muted-foreground">Chưa có test nào được cải thiện.</div> : improve.map(id => (
                  <div key={id} className="py-1 text-sm truncate">{caseById(id)?.question}</div>
                ))}
              </div>
            </div>
          )}

          {current && <MetricPanel run={run} metric={current.m} label={label} setLabel={setLabel} threshold={gate.enabled ? gate.minPass : 90} onOpen={caseId => setOpenCase({ caseId, metricId: current.m.id })} />}
        </div>
      </div>

      <CaseDrawer run={run} open={openCase} onChange={setOpenCase} onEditCase={() => go("test-sets", run.setId)} onRefineWithAI={onRefineWithAI} />
      <RunDialog agentId={agentId} open={runAgain} onOpenChange={setRunAgain} presetSetId={run.setId} onStarted={id => go("runs", id)} />
    </div>
  );
}

function firstFailing(run: Run, caseId: string) {
  return run.metrics.find(sm => cellStatus(run.results[caseId]?.[sm.metricId], run.runsPerCase) !== "pass" && run.results[caseId]?.[sm.metricId])?.metricId;
}

function MetricPanel({ run, metric, label, setLabel, threshold, onOpen }: { run: Run; metric: Metric; label: string | null; setLabel: (l: string | null) => void; threshold: number; onOpen: (caseId: string) => void }) {
  const ms = metricStats(run, metric.id);
  const cases = evaluationStore.cases(run.setId);
  const segs = [{ l: "Pass", n: ms.pass, pass: true }, ...Object.entries(ms.labels).map(([l, n]) => ({ l, n, pass: false }))];
  const applicable = run.caseIds.filter(id => run.results[id]?.[metric.id]);
  const byGroup = CASE_GROUPS.map(g => {
    const ids = applicable.filter(id => cases.find(c => c.id === id)?.group === g);
    const p = ids.filter(id => cellStatus(run.results[id][metric.id], run.runsPerCase) === "pass").length;
    return { g, n: ids.length, p, rate: ids.length ? Math.round((p / ids.length) * 100) : 0 };
  }).filter(x => x.n > 0);
  const rows = applicable
    .filter(id => {
      if (!label) return true;
      const c = run.results[id][metric.id];
      const s = cellStatus(c, run.runsPerCase);
      return label === "Pass" ? s === "pass" : s !== "pass" && (c.label ?? "Không đạt") === label;
    })
    .sort((a, b) => run.results[a][metric.id].passCount - run.results[b][metric.id].passCount);

  return (
    <>
      <div className="surface-card p-5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="font-display text-sm font-semibold">{metric.name} - Phân bố kết quả</h3>
          <span className="text-xs text-muted-foreground">{passRuleText(metric)}</span>
        </div>
        <div className="flex h-7 rounded-lg overflow-hidden mt-3" role="img" aria-label={segs.map(s => `${s.l}: ${s.n}`).join(", ")}>
          {segs.filter(s => s.n > 0).map(s => (
            <div key={s.l} className={`${LABEL_TONE(s.l, s.pass)} flex items-center justify-center text-[11px] font-semibold text-white`} style={{ flex: s.n }}>{s.n}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 mt-3">
          {segs.map(s => (
            <button key={s.l} onClick={() => setLabel(label === s.l ? null : s.l)} aria-pressed={label === s.l}
              className={`text-left rounded-lg border px-3 py-2 transition-base cursor-pointer ${label === s.l ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"}`}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`w-2.5 h-2.5 rounded-sm ${LABEL_TONE(s.l, s.pass)}`} />{s.l}</div>
              <div className="font-display text-lg font-semibold">{s.n}</div>
            </button>
          ))}
        </div>
        {byGroup.length > 1 && (
          <>
            <h4 className="font-display text-sm font-semibold mt-5 mb-2">Theo nhóm câu hỏi</h4>
            <div className="space-y-2">
              {byGroup.map(x => (
                <div key={x.g} className="grid grid-cols-[130px_1fr_88px] items-center gap-3 text-sm">
                  <span>{x.g}</span>
                  <ThresholdBar value={x.rate} threshold={threshold} tone={x.rate >= threshold ? "pass" : "fail"} />
                  <span className="text-right"><b>{x.rate}%</b> <span className="text-xs text-muted-foreground">({x.p}/{x.n})</span></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Test case{label ? ` - ${label}` : ""}</h3>
          <span className="text-xs text-muted-foreground">{rows.length} test</span>
          {label && <button className="chip chip-outline cursor-pointer ml-auto hover:bg-surface-muted" onClick={() => setLabel(null)}>Bỏ lọc</button>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Câu hỏi</th>
              <th className="text-left font-medium px-4 py-2.5">{metric.name}</th>
              <th className="text-left font-medium px-4 py-2.5">Nhãn</th>
              <th className="text-left font-medium px-4 py-2.5">Kết quả test</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(id => {
              const c = cases.find(x => x.id === id);
              const cell = run.results[id][metric.id];
              const s = cellStatus(cell, run.runsPerCase);
              return (
                <tr key={id} className="border-t border-border hover:bg-surface-muted/50 cursor-pointer transition-base" onClick={() => onOpen(id)}>
                  <td className="px-4 py-3"><div className="leading-snug">{c?.question ?? "Test case đã bị xóa"}</div><div className="text-xs text-muted-foreground">{c?.group}</div></td>
                  <td className="px-4 py-3"><ResultCell status={s} pass={cell.passCount} total={run.runsPerCase} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{s === "pass" ? "-" : cell.label}</td>
                  <td className="px-4 py-3"><StatusText status={caseStatus(run, id)} /></td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Không có test nào</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ case drawer */

function CaseDrawer({ run, open, onChange, onEditCase, onRefineWithAI }: {
  run: Run; open: { caseId: string; metricId: string } | null; onChange: (v: { caseId: string; metricId: string } | null) => void; onEditCase: () => void; onRefineWithAI: () => void;
}) {
  const [rep, setRep] = useState(0);
  useEffect(() => { setRep(0); }, [open?.caseId, open?.metricId]);
  const c = open ? evaluationStore.cases(run.setId).find(x => x.id === open.caseId) : undefined;
  const metric = open ? evaluationStore.metric(open.metricId) : undefined;
  const cell = open ? run.results[open.caseId]?.[open.metricId] : undefined;
  const reps = useMemo(() => (cell ? Array.from({ length: run.runsPerCase }, (_, i) => i >= run.runsPerCase - cell.passCount) : []), [cell, run.runsPerCase]);
  const set = evaluationStore.set(run.setId);

  return (
    <Sheet open={!!open} onOpenChange={o => !o && onChange(null)}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        {c && metric && cell && open && (
          <>
            <SheetHeader className="px-6 py-4 border-b border-border text-left">
              <SheetDescription>{c.group} · {c.source}</SheetDescription>
              <SheetTitle className="leading-snug">{c.question}</SheetTitle>
              <div className="flex flex-wrap gap-1.5 pt-2" role="tablist" aria-label="Chỉ số của test">
                {run.metrics.filter(sm => run.results[c.id]?.[sm.metricId]).map(sm => {
                  const m = evaluationStore.metric(sm.metricId);
                  const r = run.results[c.id][sm.metricId];
                  const s = cellStatus(r, run.runsPerCase);
                  return (
                    <button key={sm.metricId} role="tab" aria-selected={sm.metricId === open.metricId} onClick={() => onChange({ caseId: c.id, metricId: sm.metricId })}
                      className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-semibold cursor-pointer transition-base ${s === "na" ? "" : TONE[s]} ${sm.metricId === open.metricId ? "ring-2 ring-primary ring-offset-1" : ""}`}>
                      {m?.name} {r.passCount}/{run.runsPerCase}
                    </button>
                  );
                })}
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{metric.name} · {passRuleText(metric)}</span>
                <StatusText status={cellStatus(cell, run.runsPerCase)} />
                {cellStatus(cell, run.runsPerCase) !== "pass" && cell.label && <span className="chip chip-danger !py-0.5">{cell.label}</span>}
              </div>
              {run.runsPerCase > 1 && (
                <div className="flex gap-1.5" role="tablist" aria-label="Lần chạy">
                  {reps.map((ok, i) => (
                    <button key={i} role="tab" aria-selected={rep === i} onClick={() => setRep(i)}
                      className={`h-7 px-2.5 rounded-md border text-xs font-medium cursor-pointer transition-base ${rep === i ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-muted"}`}>
                      Lần {i + 1} <span className={ok ? "text-success" : "text-destructive"}>{ok ? "Pass" : "Fail"}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Đáp án mẫu</div>
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm leading-relaxed">{c.reference || <span className="italic text-muted-foreground">Chưa có đáp án mẫu</span>}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Câu trả lời của Agent</div>
                  <div className="rounded-lg border border-border px-3 py-2.5 text-sm leading-relaxed">{reps[rep] ? (c.reference ?? OK_ANSWER) : (cell.answer ?? "Câu trả lời không đạt tiêu chí của chỉ số.")}</div>
                </div>
              </div>
              {metric.includeReasoning && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Lý do chấm</div>
                  <div className="rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))] px-3 py-2.5 text-sm leading-relaxed">
                    {reps[rep] ? "Lần chạy này đạt tiêu chí của chỉ số." : (cell.reason ?? "Câu trả lời không đạt tiêu chí của chỉ số.")}
                  </div>
                </div>
              )}
              {cell.context && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Knowledge đã truy xuất</div>
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">{cell.context}</div>
                </div>
              )}
              {(c.expectedTool || cell.toolCall) && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Tool call</div>
                  <div className="space-y-1.5 text-xs">
                    {c.expectedTool && <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"><span className="text-muted-foreground w-20 shrink-0">Mong đợi</span><code className="flex-1">{c.expectedTool}</code></div>}
                    {(cell.toolCall || c.expectedTool) && (() => {
                      const name = (cell.toolCall ?? c.expectedTool ?? "").split("(")[0];
                      const mode = set?.toolModes[name] ?? "live";
                      return (
                        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                          <span className="text-muted-foreground w-20 shrink-0">Đã gọi</span><code className="flex-1">{cell.toolCall ?? c.expectedTool}</code>
                          <span className={`chip !py-0.5 !text-[11px] ${mode === "simulated" ? "chip-accent" : "chip-info"}`}>{mode === "simulated" ? "Simulated" : "Live"}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              {cellStatus(cell, run.runsPerCase) === "unstable" && (
                <div className="flex gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground">
                  <HugeiconsIcon icon={Alert02Icon} size={16} className="text-warning shrink-0 mt-0.5" />
                  Agent trả lời lúc đạt lúc không. Thường do Instructions chưa đủ rõ hoặc Knowledge có nhiều đoạn mâu thuẫn.
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-border flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { onChange(null); onEditCase(); }}><HugeiconsIcon icon={Edit02Icon} size={14} /> Sửa test case</button>
              <button className="btn-secondary" onClick={() => toast("Mở Trace của lần chạy này")}><HugeiconsIcon icon={Route01Icon} size={14} /> Xem trace</button>
              <button className="btn-primary" onClick={() => { onChange(null); onRefineWithAI(); }}><HugeiconsIcon icon={AiMagicIcon} size={14} /> Refine với AI</button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
