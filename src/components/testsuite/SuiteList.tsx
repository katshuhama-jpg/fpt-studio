import { useEffect, useState } from "react";
import { Add01Icon, Search01Icon, MoreHorizontalIcon, PlayIcon, Clock01Icon, PencilEdit01Icon, Delete02Icon, TestTube01Icon, Alert02Icon, ArrowUp01Icon, ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { countKinds, fmtAgo, fmtTime, runStats, testStore, useTestStore, type Suite } from "./testSuiteStore";
import { DeleteSuiteDialog, RunConfirmDialog, SuiteFormDialog } from "./dialogs";
import { EmptyBox, Icon, ProgressRing, useTestNav } from "./parts";
import { CreateHero } from "./CreateLanding";
import { RunStatusBadge } from "./RunView";

type Filter = "all" | "pending" | "low" | "never";
const FILTERS: [Filter, string][] = [["all", "Tất cả"], ["pending", "Chờ xác nhận"], ["low", "Pass < 80%"], ["never", "Chưa chạy"]];

/** Everything the list needs about one suite, computed once. */
function info(s: Suite) {
  const last = testStore.lastRun(s.id);
  const prev = testStore.previousRun(s.id);
  const active = testStore.activeRun(s.id);
  const stats = last ? runStats(last) : undefined;
  const delta = stats && prev ? stats.pct - runStats(prev).pct : 0;
  // Sort: Chờ xác nhận → Đang chạy → Pass thấp → Chưa chạy → còn lại.
  const rank = last?.status === "pending" ? 0 : active ? 1 : stats && stats.pct < 80 ? 2 : !last ? 3 : 4;
  return { s, last, active, stats, delta, rank };
}
type Info = ReturnType<typeof info>;

function LastRunCell({ i }: { i: Info }) {
  if (i.active) {
    const st = runStats(i.active);
    return <span className="inline-flex items-center gap-2 text-xs font-medium text-primary tabular-nums"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Đang chạy {st.done}/{st.total}</span>;
  }
  if (!i.last || !i.stats) return <span className="text-xs text-muted-foreground">Chưa chạy lần nào</span>;
  return (
    <span className="flex items-center gap-2.5" title={fmtTime(i.last.startedAt)}>
      <ProgressRing pct={i.stats.pct} size={30} />
      <span className="text-xs leading-tight">
        <span className="flex items-center gap-1.5 font-medium tabular-nums">
          {i.stats.pct}% · {i.stats.pass}/{i.stats.total}
          {i.delta !== 0 && (
            <span className={`inline-flex items-center ${i.delta > 0 ? "text-success" : "text-destructive"}`} aria-label={`${i.delta > 0 ? "Tăng" : "Giảm"} ${Math.abs(i.delta)}% so với lần trước`}>
              <Icon icon={i.delta > 0 ? ArrowUp01Icon : ArrowDown01Icon} size={12} />{Math.abs(i.delta)}%
            </span>
          )}
        </span>
        <span className="block text-muted-foreground">{fmtAgo(i.last.startedAt)}</span>
      </span>
    </span>
  );
}

/** Màn 1 — Evaluate › Test Suites. */
export default function SuiteList({ agentId, readOnly }: { agentId: string; readOnly?: boolean }) {
  useTestStore();
  const { go, get } = useTestNav();
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [renaming, setRenaming] = useState<Suite | null>(null);
  const [deleting, setDeleting] = useState<Suite | null>(null);
  const [running, setRunning] = useState<Suite | null>(null);
  const demoError = get("demo") === "error";

  const load = () => {
    setPhase("loading");
    const t = window.setTimeout(() => setPhase(demoError ? "error" : "ready"), 350);
    return () => window.clearTimeout(t);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [agentId]);

  const suites = phase === "ready" ? testStore.suites(agentId) : [];
  const rows = suites.map(info);
  const counts: Record<Filter, number> = {
    all: rows.length,
    pending: rows.filter(r => r.last?.status === "pending").length,
    low: rows.filter(r => r.stats && r.stats.pct < 80).length,
    never: rows.filter(r => !r.last && !r.active).length,
  };
  const ran = rows.filter(r => r.stats);
  const avgPass = ran.length ? Math.round(ran.reduce((n, r) => n + r.stats!.pct, 0) / ran.length) : null;
  const pendingRuns = testStore.pendingCount(agentId);
  const totalCases = suites.reduce((n, s) => n + s.cases.length, 0);
  const shown = rows
    .filter(r => r.s.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter(r => filter === "all" || (filter === "pending" ? r.last?.status === "pending" : filter === "low" ? !!r.stats && r.stats.pct < 80 : !r.last && !r.active))
    .sort((a, b) => a.rank - b.rank || b.s.createdAt - a.s.createdAt);
  const open = (s: Suite) => go("test-sets", { item: s.id });
  const createNew = () => go("test-sets", { view: "new" });
  const empty = phase === "ready" && suites.length === 0;

  return (
    <div data-viewonly-allow className="mx-auto max-w-[1100px] px-8 py-8">
      {!(empty && !readOnly) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Test Suites</h1>
            <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{phase === "ready" ? `${suites.length} bộ testcase · ${totalCases} testcase` : "Các bộ testcase của Agent."}</p>
          </div>
          {!readOnly && <Button type="button" onClick={createNew}><Icon icon={Add01Icon} /> Tạo Test Suite</Button>}
        </div>
      )}

      {phase === "loading" && (
        <div className="space-y-2.5" aria-busy="true" aria-label="Đang tải">
          <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-[68px] rounded-lg" />)}</div>
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-2/3" /></div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {phase === "error" && (
        <EmptyBox icon={Alert02Icon} title="Không tải được danh sách Test Suite.">
          <p className="mt-1 text-sm text-muted-foreground">Kiểm tra kết nối rồi thử lại.</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => { setPhase("loading"); window.setTimeout(() => setPhase("ready"), 350); }}>Thử lại</Button>
        </EmptyBox>
      )}

      {empty && (readOnly ? <EmptyBox icon={TestTube01Icon} title="Chưa có bộ testcase nào" /> : <CreateHero agentId={agentId} />)}

      {phase === "ready" && suites.length > 0 && (
        <>
          {/* 1. Summary */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Pass rate gần nhất</p>
              <p className="flex items-center gap-2 text-xl font-semibold tabular-nums">{avgPass === null ? "—" : <><ProgressRing pct={avgPass} size={20} />{avgPass}%</>}</p>
            </div>
            <button type="button" onClick={() => go("runs", { status: "pending" })} className="rounded-lg bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <p className="text-xs text-muted-foreground">Chờ xác nhận</p>
              <p className={`text-xl font-semibold tabular-nums ${pendingRuns ? "text-warning" : ""}`}>{pendingRuns} lần chạy</p>
            </button>
            <button type="button" onClick={() => setFilter("never")} className="rounded-lg bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <p className="text-xs text-muted-foreground">Chưa chạy</p>
              <p className="text-xl font-semibold tabular-nums">{counts.never} suite</p>
            </button>
          </div>

          {/* 2. Reminder */}
          {pendingRuns > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
              <Icon icon={Alert02Icon} className="shrink-0 text-warning" />
              <span className="flex-1">{pendingRuns} lần chạy đang chờ bạn xác nhận kết quả.</span>
              <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => go("runs", { status: "pending" })}>Xem ngay <Icon icon={ArrowRight01Icon} size={14} /></Button>
            </div>
          )}

          {/* 4. Filters + search */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Lọc Test Suite" className="flex flex-wrap gap-1.5">
              {FILTERS.map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${filter === id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>{label} {counts[id]}</button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Icon icon={Search01Icon} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên" aria-label="Tìm Test Suite theo tên" className="h-8 w-56 pl-8" />
            </div>
          </div>

          {/* 3. Table */}
          {shown.length === 0 ? (
            <EmptyBox icon={Search01Icon} title={q.trim() ? `Không tìm thấy Test Suite nào khớp "${q.trim()}".` : "Không có Test Suite nào ở bộ lọc này."}>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => { setQ(""); setFilter("all"); }}>Xoá bộ lọc</Button>
            </EmptyBox>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-left font-medium">Tên</th>
                    <th scope="col" className="w-36 px-4 py-2.5 text-left font-medium">Testcase</th>
                    <th scope="col" className="w-52 px-4 py-2.5 text-left font-medium">Lần chạy gần nhất</th>
                    <th scope="col" className="w-36 px-4 py-2.5 text-left font-medium">Trạng thái</th>
                    <th scope="col" className="w-12 px-2 py-2.5"><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map(i => {
                    const k = countKinds(i.s.cases);
                    return (
                      <tr key={i.s.id} className="cursor-pointer hover:bg-muted/30" onClick={e => { if (!(e.target as HTMLElement).closest("button,[role=menuitem]")) open(i.s); }}>
                        <td className="max-w-0 px-4 py-3">
                          <button type="button" onClick={() => open(i.s)} className="block max-w-full truncate text-left font-medium hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{i.s.name}</button>
                          <p className="truncate text-xs text-muted-foreground">{i.s.description || "Chưa có mô tả"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary tabular-nums">Q&A {k.qna}</span>
                            {k.scenario > 0 && <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">Kịch bản {k.scenario}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3"><LastRunCell i={i} /></td>
                        <td className="px-4 py-3">
                          {i.active ? <RunStatusBadge status="running" />
                            : i.last ? <RunStatusBadge status={i.last.status} />
                            : <Button type="button" variant="outline" size="sm" className="h-7 border-primary/40 text-primary hover:text-primary" disabled={!i.s.cases.length} onClick={() => setRunning(i.s)}><Icon icon={PlayIcon} size={14} /> Chạy</Button>}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Thao tác cho ${i.s.name}`}><Icon icon={MoreHorizontalIcon} /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem disabled={!i.s.cases.length || !!i.active} onSelect={() => setRunning(i.s)}><Icon icon={PlayIcon} /> Chạy test</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => go("runs", { suite: i.s.id })}><Icon icon={Clock01Icon} /> Xem lịch sử</DropdownMenuItem>
                              {!readOnly && <DropdownMenuItem onSelect={() => setRenaming(i.s)}><Icon icon={PencilEdit01Icon} /> Đổi tên</DropdownMenuItem>}
                              {!readOnly && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(i.s)}><Icon icon={Delete02Icon} /> Xoá</DropdownMenuItem></>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {renaming && <SuiteFormDialog agentId={agentId} suite={renaming} open onOpenChange={o => !o && setRenaming(null)} />}
      {deleting && <DeleteSuiteDialog suite={deleting} onClose={() => setDeleting(null)} />}
      {running && <RunConfirmDialog suite={running} onClose={() => setRunning(null)} onStarted={id => go("runs", { item: id })} />}
    </div>
  );
}
