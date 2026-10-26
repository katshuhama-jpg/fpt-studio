import { useState } from "react";
import { toast } from "sonner";
import { Add01Icon, PencilEdit01Icon, Clock01Icon, PlayIcon, Delete02Icon, TestTube01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { caseSummary, countKinds, testStore, useTestStore, type Suite } from "./testSuiteStore";
import { RunConfirmDialog, SuiteFormDialog } from "./dialogs";
import CaseDetailSheet from "./CaseDetailSheet";
import { ChooseMethodDialog } from "./AddCaseDialogs";
import { Crumbs, EmptyBox, Icon, KindChip, VerdictBadge, useTestNav } from "./parts";

/** Màn 2 — one Test Suite. */
export default function SuiteDetail({ agentId, suite, readOnly }: { agentId: string; suite: Suite; readOnly?: boolean }) {
  useTestStore();
  const { go } = useTestNav();
  const [renaming, setRenaming] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const active = testStore.activeRun(suite.id);
  const k = countKinds(suite.cases);
  const back = () => go("test-sets");

  return (
    <div data-viewonly-allow className="mx-auto max-w-[960px] px-8 py-6">
      <Crumbs onBack={back} items={[{ label: "Test Suites", onClick: back }, { label: suite.name }]} />
      <div className="mt-4 mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-xl font-semibold">{suite.name}</h1>
            {!readOnly && <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Đổi tên" onClick={() => setRenaming(true)}><Icon icon={PencilEdit01Icon} /></Button>}
          </div>
          <p className="text-sm text-muted-foreground">{suite.description || "Chưa có mô tả"} · <span className="tabular-nums">Q&A: {k.qna} · Kịch bản: {k.scenario}</span></p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={() => go("runs", { suite: suite.id })}><Icon icon={Clock01Icon} /> Xem lịch sử</Button>
          {(active
            ? <Button type="button" onClick={() => go("runs", { item: active.id })}><span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> Đang chạy · Xem tiến trình</Button>
            : <Button type="button" disabled={!suite.cases.length} onClick={() => setRunOpen(true)}><Icon icon={PlayIcon} /> Chạy test</Button>)}
        </div>
      </div>

      {active && (
        <p className="mb-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm">
          <Icon icon={InformationCircleIcon} className="mt-0.5 shrink-0 text-warning" />
          Test Suite đang chạy — testcase thêm mới lúc này sẽ áp dụng từ lần chạy tiếp theo.
        </p>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Testcase <span className="font-normal text-muted-foreground tabular-nums">({suite.cases.length})</span></h2>
        {!readOnly && suite.cases.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => setChoosing(true)}><Icon icon={Add01Icon} /> Thêm testcase</Button>}
      </div>

      {suite.cases.length === 0 ? (
        <EmptyBox icon={TestTube01Icon} title="Test Suite chưa có testcase">
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Thêm testcase bằng AI, nhập tay hoặc upload file có sẵn.</p>
          {!readOnly && <Button type="button" className="mt-4" onClick={() => setChoosing(true)}><Icon icon={Add01Icon} /> Thêm testcase</Button>}
        </EmptyBox>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-24 px-4 py-2.5 text-left font-medium">Loại</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Nội dung</th>
                <th scope="col" className="w-36 px-4 py-2.5 text-left font-medium">Topic</th>
                <th scope="col" className="w-36 px-4 py-2.5 text-left font-medium">Lần chạy gần nhất</th>
                {!readOnly && <th scope="col" className="w-12 px-2 py-2.5"><span className="sr-only">Thao tác</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {suite.cases.map(c => (
                <tr key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={e => { if (!(e.target as HTMLElement).closest("button")) setOpenCase(c.id); }}>
                  <td className="px-4 py-3"><KindChip kind={c.kind} /></td>
                  <td className="max-w-0 px-4 py-3"><button type="button" onClick={() => setOpenCase(c.id)} className="block max-w-full truncate text-left hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" title={caseSummary(c)}>{caseSummary(c)}</button></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.topic || "—"}</td>
                  <td className="px-4 py-3"><VerdictBadge v={testStore.lastVerdict(suite.id, c.id)} /></td>
                  {!readOnly && (
                    <td className="px-2 py-3 text-right">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Xoá testcase"
                        onClick={() => { testStore.removeCase(suite.id, c.id); toast.success("Đã xoá testcase."); }}><Icon icon={Delete02Icon} /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renaming && <SuiteFormDialog agentId={agentId} suite={suite} open onOpenChange={setRenaming} />}
      {choosing && (
        <ChooseMethodDialog onClose={() => setChoosing(false)} onPick={(m, kind) => {
          setChoosing(false);
          go("test-sets", { item: suite.id, view: m, kind: m === "upload" ? undefined : kind });
        }} />
      )}
      {openCase && <CaseDetailSheet suite={suite} caseId={openCase} readOnly={readOnly} onClose={() => setOpenCase(null)} />}
      {runOpen && <RunConfirmDialog suite={suite} onClose={() => setRunOpen(false)} onStarted={id => go("runs", { item: id })} />}
    </div>
  );
}
