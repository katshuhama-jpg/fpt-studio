import { useState } from "react";
import { toast } from "sonner";
import { PencilEdit01Icon, Delete02Icon, FileAttachmentIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { KIND_LABEL, caseVerdict, fmtTime, testStore, turnVerdict, useTestStore, type Suite, type TestCase } from "./testSuiteStore";
import { QnaEditor, ScenarioEditor, qnaErrors, scenarioValid } from "./CaseEditors";
import { Icon, KindChip, VerdictBadge, useTestNav } from "./parts";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><dt className="mb-1 text-xs font-medium text-muted-foreground">{label}</dt><dd className="text-sm">{children}</dd></div>
);

/** Testcase detail (click a row in Màn 2): read, edit, delete, and the latest result. */
export default function CaseDetailSheet({ suite, caseId, readOnly, onClose }: { suite: Suite; caseId: string; readOnly?: boolean; onClose: () => void }) {
  useTestStore();
  const { go } = useTestNav();
  const c = suite.cases.find(x => x.id === caseId) ?? testStore.suite(suite.id)?.cases.find(x => x.id === caseId);
  const [draft, setDraft] = useState<TestCase | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!c) return null;
  const index = suite.cases.findIndex(x => x.id === caseId) + 1;
  const last = testStore.lastResult(suite.id, c.id);
  const lastTurns = last?.result.turns;

  const save = () => {
    if (!draft) return;
    setSubmitted(true);
    if (draft.kind === "qna") { const e = qnaErrors(draft); if (e.question || e.expected) return; }
    else if (!scenarioValid(draft)) return;
    testStore.updateCase(suite.id, draft);
    toast.success("Đã lưu testcase.");
    setDraft(null); setSubmitted(false);
  };

  return (
    <>
      <Sheet open onOpenChange={o => { if (!o) onClose(); }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[600px]">
          <SheetHeader className="space-y-1.5 border-b px-6 pb-4 pt-5 text-left">
            <div className="flex items-center gap-2 pr-8"><KindChip kind={c.kind} /><span className="text-xs text-muted-foreground">Testcase #{index}</span></div>
            <SheetTitle className="pr-8 text-base leading-snug">{c.kind === "qna" ? c.question : c.name || "Kịch bản"}</SheetTitle>
            <SheetDescription>{suite.name}{c.kind === "scenario" ? ` · ${c.turns.length} lượt` : ""}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {draft ? (
              draft.kind === "qna"
                ? <QnaEditor c={draft} onChange={setDraft} errors={submitted ? qnaErrors(draft) : undefined} />
                : <ScenarioEditor c={draft} onChange={setDraft} showErrors={submitted} />
            ) : (
              <section>
                <h3 className="mb-3 text-sm font-semibold">Nội dung</h3>
                {c.kind === "qna" ? (
                  <dl className="space-y-4">
                    <Field label="Câu hỏi">{c.question}</Field>
                    <Field label="Câu trả lời mong đợi">{c.expected}</Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Topic">{c.topic || "—"}</Field>
                      <Field label="Tên văn bản tham chiếu">{c.reference ? <span className="inline-flex items-center gap-1"><Icon icon={FileAttachmentIcon} size={14} />{c.reference}</span> : "—"}</Field>
                    </div>
                  </dl>
                ) : (
                  <>
                    <dl className="mb-4 grid grid-cols-2 gap-4">
                      <Field label="Topic">{c.topic || "—"}</Field>
                      <Field label="Tên văn bản tham chiếu">{c.reference || "—"}</Field>
                    </dl>
                    <ol className="space-y-2.5">
                      {c.turns.map((t, i) => (
                        <li key={t.id} className="rounded-md border p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Lượt {i + 1}</span>
                            {lastTurns?.[i] && <VerdictBadge v={turnVerdict(lastTurns[i])} />}
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-1.5 text-primary-foreground">{t.question}</p>
                            <p className="w-fit max-w-[85%] rounded-lg rounded-bl-sm border px-3 py-1.5"><span className="block text-[11px] text-muted-foreground">Mong đợi</span>{t.expected}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </section>
            )}

            {!draft && (
              <section>
                <h3 className="mb-3 text-sm font-semibold">Kết quả gần nhất</h3>
                {!last ? <p className="text-sm text-muted-foreground">Testcase chưa được chạy lần nào.</p> : (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <VerdictBadge v={caseVerdict(last.result)} />
                      <span className="text-muted-foreground">Lần chạy #{last.run.number} · {fmtTime(last.run.startedAt)}</span>
                      {last.result.state === "done" && <span className="text-xs text-muted-foreground">{last.result.confirmed ? "· Đã xác nhận" : "· Chờ xác nhận"}</span>}
                    </div>
                    {c.kind === "qna" && last.result.actual && <Field label="Câu trả lời thực tế">{last.result.actual}</Field>}
                    {last.result.note && <Field label="Ghi chú">{last.result.note}</Field>}
                    <Button type="button" variant="link" className="h-auto p-0" onClick={() => go("runs", { item: last.run.id })}>Xem lần chạy #{last.run.number} <Icon icon={ArrowRight01Icon} size={14} /></Button>
                  </div>
                )}
              </section>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2 border-t px-6 py-3">
              {draft ? (
                <>
                  <span className="text-xs text-muted-foreground">Thay đổi áp dụng từ lần chạy tiếp theo.</span>
                  <Button type="button" variant="outline" className="ml-auto" onClick={() => { setDraft(null); setSubmitted(false); }}>Huỷ</Button>
                  <Button type="button" onClick={save}>Lưu</Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(true)}><Icon icon={Delete02Icon} /> Xoá</Button>
                  <Button type="button" variant="outline" className="ml-auto" onClick={() => setDraft(structuredClone(c))}><Icon icon={PencilEdit01Icon} /> Chỉnh sửa</Button>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá testcase này?</AlertDialogTitle>
            <AlertDialogDescription>Testcase {KIND_LABEL[c.kind]} sẽ bị xoá khỏi "{suite.name}". Kết quả ở các lần chạy trước vẫn được giữ.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { testStore.removeCase(suite.id, c.id); toast.success("Đã xoá testcase."); onClose(); }}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
