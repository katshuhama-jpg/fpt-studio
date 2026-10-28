import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { newQna, newScenario, testStore, type CaseKind, type QnaCase, type ScenarioCase, type Suite } from "./testSuiteStore";
import { QnaEditor, ScenarioEditor, qnaErrors, scenarioValid } from "./CaseEditors";
import { KindToggle } from "./parts";

/** "+ Thêm testcase" — add one testcase by hand, right inside the suite. */
export default function AddCaseSheet({ suite, onClose }: { suite: Suite; onClose: () => void }) {
  const [kind, setKind] = useState<CaseKind>("qna");
  const [qna, setQna] = useState<QnaCase>(newQna());
  const [scenario, setScenario] = useState<ScenarioCase>(newScenario());
  const [submitted, setSubmitted] = useState(false);

  const save = (again: boolean) => {
    setSubmitted(true);
    if (kind === "qna") {
      const e = qnaErrors(qna);
      if (e.question || e.expected) return;
      testStore.addCases(suite.id, [{ ...qna, question: qna.question.trim(), expected: qna.expected.trim() }]);
    } else {
      if (!scenarioValid(scenario)) return;
      testStore.addCases(suite.id, [{ ...scenario, name: scenario.name.trim() || "Kịch bản không tên" }]);
    }
    toast.success("Đã thêm testcase.");
    if (again) { setQna(newQna()); setScenario(newScenario()); setSubmitted(false); } else onClose();
  };

  return (
    <Sheet open onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[600px]">
        <SheetHeader className="space-y-3 border-b px-6 pb-4 pt-5 text-left">
          <div>
            <SheetTitle>Thêm testcase</SheetTitle>
            <SheetDescription>Vào Test Suite "{suite.name}".</SheetDescription>
          </div>
          <KindToggle value={kind} onChange={k => { setKind(k); setSubmitted(false); }} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {kind === "qna"
            ? <QnaEditor c={qna} onChange={setQna} errors={submitted ? qnaErrors(qna) : undefined} idp="add-qna" />
            : <ScenarioEditor c={scenario} onChange={setScenario} showErrors={submitted} idp="add-sc" />}
        </div>
        <div className="flex items-center gap-2 border-t px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
          <Button type="button" variant="outline" className="ml-auto" onClick={() => save(true)}>Lưu & thêm tiếp</Button>
          <Button type="button" onClick={() => save(false)}>Lưu</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
