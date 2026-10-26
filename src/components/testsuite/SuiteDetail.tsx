import { useState } from "react";
import { Add01Icon, PencilEdit01Icon, Clock01Icon, PlayIcon, TestTube01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { countKinds, testStore, useTestStore, type Suite } from "./testSuiteStore";
import { RunConfirmDialog, SuiteFormDialog } from "./dialogs";
import CaseDetailSheet from "./CaseDetailSheet";
import CasesTable from "./CasesTable";
import { CreateHero } from "./CreateLanding";
import { Crumbs, EmptyBox, Icon, useTestNav } from "./parts";

/** Màn 2 — one Test Suite. */
export default function SuiteDetail({ agentId, suite, readOnly }: { agentId: string; suite: Suite; readOnly?: boolean }) {
  useTestStore();
  const { go } = useTestNav();
  const [renaming, setRenaming] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const active = testStore.activeRun(suite.id);
  const k = countKinds(suite.cases);
  const back = () => go("test-sets");

  return (
    <div data-viewonly-allow className="mx-auto max-w-[1200px] px-8 py-6">
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
        {!readOnly && suite.cases.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => go("test-sets", { item: suite.id, view: "new" })}><Icon icon={Add01Icon} /> Thêm testcase</Button>}
      </div>

      {suite.cases.length === 0 ? (
        readOnly
          ? <EmptyBox icon={TestTube01Icon} title="Test Suite chưa có testcase" />
          : <div className="rounded-lg border border-dashed"><CreateHero agentId={agentId} suite={suite} title="Thêm testcase đầu tiên" /></div>
      ) : (
        <CasesTable suite={suite} readOnly={readOnly} onOpen={setOpenCase} />
      )}

      {renaming && <SuiteFormDialog agentId={agentId} suite={suite} open onOpenChange={setRenaming} />}
      {openCase && <CaseDetailSheet suite={suite} caseId={openCase} readOnly={readOnly} onClose={() => setOpenCase(null)} />}
      {runOpen && <RunConfirmDialog suite={suite} onClose={() => setRunOpen(false)} onStarted={id => go("runs", { item: id })} />}
    </div>
  );
}
