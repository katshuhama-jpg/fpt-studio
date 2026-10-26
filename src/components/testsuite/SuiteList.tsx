import { useEffect, useState } from "react";
import { Add01Icon, Search01Icon, MoreHorizontalIcon, PlayIcon, Clock01Icon, PencilEdit01Icon, Delete02Icon, TestTube01Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { countKinds, fmtTime, runStats, testStore, useTestStore, type Suite } from "./testSuiteStore";
import { DeleteSuiteDialog, RunConfirmDialog, SuiteFormDialog } from "./dialogs";
import { EmptyBox, Icon, ProgressRing, useTestNav } from "./parts";

function LastRun({ suite }: { suite: Suite }) {
  const run = testStore.lastRun(suite.id);
  const active = testStore.activeRun(suite.id);
  if (active) return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Đang chạy…</span>;
  if (!run) return <span className="text-xs text-muted-foreground">Chưa chạy lần nào</span>;
  const s = runStats(run);
  return (
    <span className="flex items-center gap-2.5">
      <ProgressRing pct={s.pct} />
      <span className="text-xs leading-tight">
        <span className="block font-medium tabular-nums">Pass {s.pass}/{s.total} · {s.pct}%</span>
        <span className="block text-muted-foreground tabular-nums">{fmtTime(run.startedAt)}</span>
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
  const [createOpen, setCreateOpen] = useState(false);
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
  const filtered = suites.filter(s => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  const open = (s: Suite) => go("test-sets", { item: s.id });

  return (
    <div data-viewonly-allow className="mx-auto max-w-[960px] px-8 py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Test Suite</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Các bộ testcase của Agent. Chạy test và xác nhận kết quả trước khi publish.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon icon={Search01Icon} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên" aria-label="Tìm Test Suite theo tên" className="h-9 w-56 pl-8" />
          </div>
          {!readOnly && <Button type="button" onClick={() => setCreateOpen(true)}><Icon icon={Add01Icon} /> Tạo Test Suite</Button>}
        </div>
      </div>

      {phase === "loading" && (
        <div className="space-y-2.5" aria-busy="true" aria-label="Đang tải">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-4 w-32" /></div>
              <Skeleton className="h-9 w-9 rounded-full" />
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

      {phase === "ready" && suites.length === 0 && (
        <EmptyBox icon={TestTube01Icon} title="Chưa có bộ testcase nào">
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Tạo Test Suite rồi thêm testcase bằng AI, nhập tay hoặc upload file.</p>
          {!readOnly && <Button type="button" className="mt-4" onClick={() => setCreateOpen(true)}><Icon icon={Add01Icon} /> Tạo Test Suite</Button>}
        </EmptyBox>
      )}

      {phase === "ready" && suites.length > 0 && filtered.length === 0 && (
        <EmptyBox icon={Search01Icon} title={`Không tìm thấy Test Suite nào khớp "${q.trim()}".`}>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setQ("")}>Xoá tìm kiếm</Button>
        </EmptyBox>
      )}

      {phase === "ready" && filtered.length > 0 && (
        <ul className="space-y-2.5">
          {filtered.map(s => {
            const k = countKinds(s.cases);
            return (
              <li key={s.id} data-viewonly-allow
                className="group flex cursor-pointer items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
                onClick={e => { if (!(e.target as HTMLElement).closest("button,[role=menuitem]")) open(s); }}>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open(s)} className="max-w-full truncate text-left text-sm font-semibold hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{s.name}</button>
                  <p className="truncate text-sm text-muted-foreground">{s.description || "Chưa có mô tả"}</p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary tabular-nums">Q&A: {k.qna}</span>
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">Kịch bản: {k.scenario}</span>
                  </div>
                </div>
                <div className="hidden w-48 sm:block"><LastRun suite={s} /></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Thao tác cho ${s.name}`}><Icon icon={MoreHorizontalIcon} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem disabled={!s.cases.length || !!testStore.activeRun(s.id)} onSelect={() => setRunning(s)}><Icon icon={PlayIcon} /> Chạy test</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => go("runs", { suite: s.id })}><Icon icon={Clock01Icon} /> Xem lịch sử</DropdownMenuItem>
                    {!readOnly && <DropdownMenuItem onSelect={() => setRenaming(s)}><Icon icon={PencilEdit01Icon} /> Đổi tên</DropdownMenuItem>}
                    {!readOnly && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(s)}><Icon icon={Delete02Icon} /> Xoá</DropdownMenuItem></>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      {createOpen && <SuiteFormDialog agentId={agentId} open onOpenChange={setCreateOpen} onDone={s => open(s)} />}
      {renaming && <SuiteFormDialog agentId={agentId} suite={renaming} open onOpenChange={o => !o && setRenaming(null)} />}
      {deleting && <DeleteSuiteDialog suite={deleting} onClose={() => setDeleting(null)} />}
      {running && <RunConfirmDialog suite={running} onClose={() => setRunning(null)} onStarted={id => go("runs", { item: id })} />}
    </div>
  );
}
