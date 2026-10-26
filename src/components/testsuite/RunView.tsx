import { useState } from "react";
import { toast } from "sonner";
import { StopIcon, RefreshIcon, InformationCircleIcon, Tick02Icon, Loading03Icon, Alert02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RUN_STATUS_LABEL, SCENARIO_RULE, caseSummary, caseVerdict, fmtTime, runStats, testStore, turnVerdict, useTestStore,
  type CaseResult, type QnaCase, type Run, type RunStatus, type ScenarioCase, type TestCase, type Verdict,
} from "./testSuiteStore";
import { Crumbs, Icon, KindChip, ProgressRing, VerdictBadge, useTestNav } from "./parts";

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const cls: Record<RunStatus, string> = {
    running: "border-primary/40 text-primary",
    stopped: "border-border text-muted-foreground",
    pending: "border-warning/50 bg-warning/10 text-warning",
    done: "border-success/40 bg-[hsl(var(--success-soft))] text-success",
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${cls[status]}`}>
    {status === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}{RUN_STATUS_LABEL[status]}
  </span>;
}

/* ───────────── Màn 4 — progress ───────────── */

function RowState({ c, r }: { c: TestCase; r: CaseResult }) {
  if (r.state === "queued") return <span className="text-xs text-muted-foreground">Chờ chạy</span>;
  if (r.state === "running") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
      <Icon icon={Loading03Icon} size={14} className="animate-spin" />Đang chạy{c.kind === "scenario" ? ` · lượt ${Math.min(r.turnsDone + 1, c.turns.length)}/${c.turns.length}` : ""}
    </span>
  );
  if (r.state === "error") return <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><Icon icon={Alert02Icon} size={14} />Lỗi</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Icon icon={CheckmarkCircle02Icon} size={14} />Hoàn tất</span>;
}

function Progressing({ run }: { run: Run }) {
  const [confirmStop, setConfirmStop] = useState(false);
  const s = runStats(run);
  const turnTotal = run.cases.reduce((n, c) => n + (c.kind === "scenario" ? c.turns.length : 0), 0);
  const turnDone = run.cases.reduce((n, c) => n + (c.kind === "scenario" ? Math.min(run.results[c.id]?.turnsDone ?? 0, c.turns.length) : 0), 0);
  return (
    <>
      <div className="mb-4 rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium tabular-nums" aria-live="polite">Đã chạy {s.done}/{s.total} testcase{turnTotal ? ` · Kịch bản: ${turnDone}/${turnTotal} lượt` : ""}</p>
          <Button type="button" variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmStop(true)}><Icon icon={StopIcon} /> Dừng</Button>
        </div>
        <Progress value={s.total ? (s.done / s.total) * 100 : 0} aria-label="Tiến trình chạy test" />
      </div>
      <ul className="divide-y rounded-lg border">
        {run.cases.map(c => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <KindChip kind={c.kind} />
            <span className="min-w-0 flex-1 truncate text-sm">{caseSummary(c)}</span>
            <RowState c={c} r={run.results[c.id]} />
          </li>
        ))}
      </ul>
      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dừng chạy test?</AlertDialogTitle>
            <AlertDialogDescription>Kết quả các testcase đã chạy xong vẫn được giữ lại.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { testStore.stopRun(run.id); toast.success("Đã dừng lần chạy."); }}>Dừng lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ───────────── Màn 5 — review ───────────── */

function ReviewActions({ run, c, r, readOnly }: { run: Run; c: TestCase; r: CaseResult; readOnly?: boolean }) {
  const v = caseVerdict(r) as Verdict;
  const set = (fn: (r: CaseResult) => CaseResult) => testStore.patchResult(run.id, c.id, fn);
  if (readOnly) return r.confirmed ? <span className="text-xs text-muted-foreground">Đã xác nhận</span> : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {r.confirmed
        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Icon icon={Tick02Icon} size={14} />Đã xác nhận {v === "pass" ? "Pass" : "Fail"}{r.verdict ? " (đã điều chỉnh)" : ""}</span>
        : <Button type="button" size="sm" onClick={() => set(x => ({ ...x, confirmed: true }))}>Xác nhận</Button>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm">Điều chỉnh</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => set(x => ({ ...x, verdict: "pass", confirmed: true }))}>Đánh dấu Pass</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => set(x => ({ ...x, verdict: "fail", confirmed: true }))}>Đánh dấu Fail</DropdownMenuItem>
          {(r.verdict || r.turns?.some(t => t.verdict)) && <DropdownMenuItem onSelect={() => set(x => ({ ...x, verdict: undefined, confirmed: false, turns: x.turns?.map(t => ({ ...t, verdict: undefined })) }))}>Theo AI</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Note({ run, c, r, readOnly }: { run: Run; c: TestCase; r: CaseResult; readOnly?: boolean }) {
  const [v, setV] = useState(r.note);
  if (readOnly) return r.note ? <p className="text-xs text-muted-foreground">Ghi chú: {r.note}</p> : null;
  return <Textarea rows={1} value={v} onChange={e => setV(e.target.value)} onBlur={() => v !== r.note && testStore.patchResult(run.id, c.id, x => ({ ...x, note: v }))}
    placeholder="Ghi chú cho testcase này" aria-label="Ghi chú" className="min-h-9 text-sm" />;
}

function QnaResult({ run, c, r, readOnly }: { run: Run; c: QnaCase; r: CaseResult; readOnly?: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{c.question}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-muted/40 p-3"><p className="mb-1 text-xs font-medium text-muted-foreground">Câu trả lời mong đợi</p><p className="text-sm">{c.expected}</p></div>
        <div className="rounded-md border p-3"><p className="mb-1 text-xs font-medium text-muted-foreground">Câu trả lời thực tế</p><p className="text-sm">{r.actual}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">AI Suggested Verdict: <VerdictBadge v={r.ai} /></div>
      <ReviewActions run={run} c={c} r={r} readOnly={readOnly} />
      <Note run={run} c={c} r={r} readOnly={readOnly} />
    </div>
  );
}

function ScenarioResult({ run, c, r, readOnly }: { run: Run; c: ScenarioCase; r: CaseResult; readOnly?: boolean }) {
  const turns = r.turns ?? [];
  const passTurns = turns.filter(t => turnVerdict(t) === "pass").length;
  const pct = turns.length ? Math.round((passTurns / turns.length) * 100) : 0;
  const setTurn = (i: number, v: Verdict | undefined) =>
    testStore.patchResult(run.id, c.id, x => ({ ...x, verdict: undefined, confirmed: v ? x.confirmed : false, turns: x.turns?.map((t, j) => (j === i ? { ...t, verdict: v } : t)) }));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{c.name || "Kịch bản"}</span>
        <span className="text-muted-foreground tabular-nums">· {passTurns}/{turns.length} lượt Pass · {pct}%</span>
        <Tooltip>
          <TooltipTrigger asChild><button type="button" aria-label="Cách tính kết quả kịch bản" className="text-muted-foreground hover:text-foreground"><Icon icon={InformationCircleIcon} size={14} /></button></TooltipTrigger>
          <TooltipContent className="max-w-xs">Công thức đang áp dụng: {SCENARIO_RULE} (Đề xuất mặc định, chờ Backend xác nhận.)</TooltipContent>
        </Tooltip>
      </div>
      <ol className="space-y-3">
        {c.turns.map((t, i) => {
          const tr = turns[i];
          return (
            <li key={t.id} className="rounded-md border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Lượt {i + 1}</span>
                {tr && <VerdictBadge v={turnVerdict(tr)} />}
                {tr?.verdict && <span className="text-[11px] text-muted-foreground">(AI: {tr.ai === "pass" ? "Pass" : "Fail"})</span>}
                {!readOnly && tr && (
                  <div className="ml-auto flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-pressed={turnVerdict(tr) === "pass"} onClick={() => setTurn(i, tr.ai === "pass" ? undefined : "pass")}>Pass</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-pressed={turnVerdict(tr) === "fail"} onClick={() => setTurn(i, tr.ai === "fail" ? undefined : "fail")}>Fail</Button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-primary-foreground">{t.question}</p>
                <p className="w-fit max-w-[85%] rounded-lg rounded-bl-sm border px-3 py-1.5">{tr?.actual}</p>
                <p className="text-xs text-muted-foreground">Mong đợi: {t.expected}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <ReviewActions run={run} c={c} r={r} readOnly={readOnly} />
      <Note run={run} c={c} r={r} readOnly={readOnly} />
    </div>
  );
}

type Filter = "all" | "pass" | "fail" | "error" | "unconfirmed";

function Results({ run, readOnly }: { run: Run; readOnly?: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const s = runStats(run);
  const unconfirmed = run.cases.filter(c => run.results[c.id]?.state === "done" && !run.results[c.id].confirmed).length;
  const shown = run.cases.filter(c => {
    const r = run.results[c.id], v = caseVerdict(r);
    return filter === "all" || (filter === "unconfirmed" ? r?.state === "done" && !r.confirmed : v === filter);
  });
  const stat = (label: string, n: number | string, cls = "") => <div className="px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`text-lg font-semibold tabular-nums ${cls}`}>{n}</p></div>;
  const FILTERS: [Filter, string, number][] = [["all", "Tất cả", s.total], ["unconfirmed", "Chưa xác nhận", unconfirmed], ["pass", "Pass", s.pass], ["fail", "Fail", s.fail], ["error", "Lỗi hệ thống", s.error]];
  return (
    <>
      <div className="mb-4 flex items-center gap-4 rounded-lg border">
        <div className="flex items-center gap-3 border-r px-4 py-3"><ProgressRing pct={s.pct} size={44} /><div><p className="text-xs text-muted-foreground">Tỷ lệ Pass</p><p className="text-lg font-semibold tabular-nums">{s.pct}%</p></div></div>
        <div className="grid flex-1 grid-cols-2 sm:grid-cols-4">
          {stat("Tổng testcase", s.total)}{stat("Pass", s.pass, "text-success")}{stat("Fail", s.fail, "text-destructive")}{stat("Lỗi hệ thống", s.error, "text-muted-foreground")}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Lọc kết quả" className="flex flex-wrap gap-1.5">
          {FILTERS.map(([id, label, n]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${filter === id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>{label} {n}</button>
          ))}
        </div>
        {!readOnly && unconfirmed > 0 && <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => { testStore.confirmAll(run.id); toast.success("Đã xác nhận theo đề xuất của AI."); }}>Xác nhận tất cả theo AI ({unconfirmed})</Button>}
      </div>
      <div className="space-y-3">
        {shown.length === 0 && <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Không có testcase nào ở bộ lọc này.</p>}
        {shown.map(c => {
          const r = run.results[c.id];
          const v = caseVerdict(r);
          return (
            <article key={c.id} className={`rounded-lg border bg-card p-4 ${r?.state === "done" && !r.confirmed ? "border-l-4 border-l-warning" : ""}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <KindChip kind={c.kind} />
                <VerdictBadge v={v} prefix={c.kind === "scenario" && v !== "error" ? "Tổng hợp: " : undefined} />
                {c.topic && <span className="text-xs text-muted-foreground">{c.topic}</span>}
                {r?.state === "error" && !readOnly && (
                  <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => { testStore.rerunCase(run.id, c.id); toast.success("Đã chạy lại testcase."); }}><Icon icon={RefreshIcon} /> Chạy lại testcase này</Button>
                )}
              </div>
              {r?.state === "error"
                ? <p className="text-sm"><span className="font-medium">{caseSummary(c)}</span><span className="block text-xs text-muted-foreground mt-1">Agent không phản hồi (timeout). Lỗi này không tính là Fail.</span></p>
                : c.kind === "qna" ? <QnaResult run={run} c={c} r={r} readOnly={readOnly} /> : <ScenarioResult run={run} c={c} r={r} readOnly={readOnly} />}
            </article>
          );
        })}
      </div>
    </>
  );
}

/** Màn 4 + 5 — a Test Run: live progress while running, then results & review. */
export default function RunView({ run, readOnly }: { run: Run; readOnly?: boolean }) {
  useTestStore();
  const { go } = useTestNav();
  const live = testStore.run(run.id) ?? run;
  const suite = testStore.suite(live.suiteId);
  const suiteName = suite?.name ?? "Test Suite đã xoá";
  return (
    <div data-viewonly-allow className="mx-auto max-w-[960px] px-8 py-6">
      <Crumbs onBack={() => go("runs", { suite: live.suiteId })} items={[
        { label: "Test Suites", onClick: () => go("test-sets") },
        { label: suiteName, onClick: suite ? () => go("test-sets", { item: suite.id }) : undefined },
        { label: `Kết quả ${fmtTime(live.startedAt)}` },
      ]} />
      <div className="mb-5 mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Lần chạy #{live.number}</h1>
        <RunStatusBadge status={live.status} />
        <span className="text-sm text-muted-foreground">{live.by} · {fmtTime(live.startedAt)}</span>
      </div>
      {live.status === "stopped" && <p className="mb-4 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">Lần chạy đã bị dừng. Chỉ hiển thị {live.cases.length} testcase đã chạy xong.</p>}
      {live.status === "running" ? <Progressing run={live} /> : <Results run={live} readOnly={readOnly} />}
    </div>
  );
}
