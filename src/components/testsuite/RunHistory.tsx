import { useState } from "react";
import { Clock01Icon, GitCompareIcon, ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { caseSummary, caseVerdict, fmtTime, runStats, testStore, useTestStore, type Run, type TestCase } from "./testSuiteStore";
import { Crumbs, EmptyBox, Icon, KindChip, ProgressRing, VerdictBadge, useTestNav } from "./parts";
import { RunStatusBadge } from "./RunView";

/** Màn 6 — Lịch sử chạy (agent-wide, filterable by suite). */
export default function RunHistory({ agentId }: { agentId: string }) {
  useTestStore();
  const { go, get } = useTestNav();
  const suiteId = get("suite") ?? "all";
  const suites = testStore.suites(agentId);
  const runs = testStore.runs(agentId, suiteId === "all" ? undefined : suiteId);
  const [picked, setPicked] = useState<string[]>([]);
  const pickedSuite = picked[0] ? testStore.run(picked[0])?.suiteId : undefined;
  const pending = runs.filter(r => r.status === "pending").length;
  const toggle = (id: string, on: boolean) => setPicked(p => (on ? [...p, id].slice(-2) : p.filter(x => x !== id)));

  return (
    <div data-viewonly-allow className="mx-auto max-w-[960px] px-8 py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lịch sử chạy</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{pending ? `${pending} lần chạy đang chờ xác nhận. ` : ""}Chọn 2 lần chạy cùng Test Suite để so sánh.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={suiteId} onValueChange={v => { setPicked([]); go("runs", { suite: v === "all" ? undefined : v }); }}>
            <SelectTrigger className="h-9 w-56" aria-label="Lọc theo Test Suite"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả Test Suite</SelectItem>
              {suites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" disabled={picked.length !== 2} onClick={() => go("runs", { compare: picked.join(",") })}><Icon icon={GitCompareIcon} /> So sánh{picked.length ? ` (${picked.length}/2)` : ""}</Button>
        </div>
      </div>

      {runs.length === 0 ? (
        <EmptyBox icon={Clock01Icon} title="Chưa có lần chạy nào">
          <p className="mt-1 text-sm text-muted-foreground">Chạy test từ một Test Suite để xem kết quả ở đây.</p>
        </EmptyBox>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 px-4 py-2.5"><span className="sr-only">Chọn để so sánh</span></th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Lần chạy</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Thời điểm</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Người chạy</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Kết quả</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runs.map(r => {
                const s = runStats(r);
                const on = picked.includes(r.id);
                const blocked = !on && (picked.length >= 2 || (!!pickedSuite && pickedSuite !== r.suiteId) || r.status === "running");
                return (
                  <tr key={r.id} data-viewonly-allow className={`cursor-pointer hover:bg-muted/30 ${on ? "bg-primary/5" : ""}`} onClick={e => { if (!(e.target as HTMLElement).closest("button,[role=checkbox]")) go("runs", { item: r.id }); }}>
                    <td className="px-4 py-3">
                      <Checkbox checked={on} disabled={blocked} onCheckedChange={v => toggle(r.id, !!v)} aria-label={`Chọn lần chạy #${r.number} để so sánh`}
                        title={blocked && pickedSuite && pickedSuite !== r.suiteId ? "Chỉ so sánh 2 lần chạy cùng Test Suite." : undefined} />
                    </td>
                    <td className="px-4 py-3"><span className="font-medium">#{r.number}</span> <span className="text-muted-foreground">· {testStore.suite(r.suiteId)?.name}</span></td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtTime(r.startedAt)}</td>
                    <td className="px-4 py-3">{r.by}</td>
                    <td className="px-4 py-3">
                      {r.status === "running" ? <span className="text-xs text-muted-foreground tabular-nums">{s.done}/{s.total} đã chạy</span> : (
                        <span className="flex items-center gap-2"><ProgressRing pct={s.pct} size={24} /><span className="text-xs tabular-nums">Pass {s.pass}/{s.total} · {s.pct}%</span></span>
                      )}
                    </td>
                    <td className="px-4 py-3"><RunStatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Side-by-side comparison of two runs of the same suite (older left). */
export function RunCompare({ a, b }: { a: Run; b: Run }) {
  useTestStore();
  const { go } = useTestNav();
  const [oldR, newR] = a.startedAt <= b.startedAt ? [a, b] : [b, a];
  const map = new Map<string, TestCase>();
  for (const c of [...oldR.cases, ...newR.cases]) map.set(c.id, c);
  const rows = [...map.values()].map(c => {
    const o = caseVerdict(oldR.results[c.id]), n = caseVerdict(newR.results[c.id]);
    const change = o && n && o !== n ? (n === "pass" ? "up" : o === "pass" ? "down" : "other") : null;
    return { c, o, n, change };
  });
  const up = rows.filter(r => r.change === "up").length, down = rows.filter(r => r.change === "down").length;
  const so = runStats(oldR), sn = runStats(newR);
  return (
    <div data-viewonly-allow className="mx-auto max-w-[960px] px-8 py-6">
      <Crumbs onBack={() => go("runs")} items={[{ label: "Lịch sử chạy", onClick: () => go("runs") }, { label: `So sánh #${oldR.number} và #${newR.number}` }]} />
      <div className="mb-4 mt-4">
        <h1 className="text-xl font-semibold">So sánh 2 lần chạy</h1>
        <p className="text-sm text-muted-foreground">{testStore.suite(newR.suiteId)?.name} · <span className="text-success">{up} cải thiện</span> · <span className="text-destructive">{down} giảm</span></p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">Testcase</th>
              <th scope="col" className="w-48 px-4 py-2.5 text-left font-medium">Run cũ · #{oldR.number}<span className="block font-normal tabular-nums">{fmtTime(oldR.startedAt)} · {so.pct}%</span></th>
              <th scope="col" className="w-48 px-4 py-2.5 text-left font-medium">Run mới · #{newR.number}<span className="block font-normal tabular-nums">{fmtTime(newR.startedAt)} · {sn.pct}%</span></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ c, o, n, change }) => (
              <tr key={c.id} className={change === "up" ? "bg-[hsl(var(--success-soft))]" : change === "down" ? "bg-[hsl(var(--destructive-soft))]" : ""}>
                <td className="max-w-0 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <KindChip kind={c.kind} />
                    <span className="truncate" title={caseSummary(c)}>{caseSummary(c)}</span>
                    {change === "up" && <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-success"><Icon icon={ArrowUp01Icon} size={12} />Cải thiện</span>}
                    {change === "down" && <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-destructive"><Icon icon={ArrowDown01Icon} size={12} />Giảm</span>}
                    {change === "other" && <span className="shrink-0 text-xs text-muted-foreground">Thay đổi</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">{o ? <VerdictBadge v={o} /> : <span className="text-xs text-muted-foreground">Không chạy</span>}</td>
                <td className="px-4 py-2.5">{n ? <VerdictBadge v={n} /> : <span className="text-xs text-muted-foreground">Không chạy</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
