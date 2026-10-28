import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useSpaceActor } from "@/components/governance/spaceDelete";
import { caseVerdict, testStore, type Suite } from "./testSuiteStore";

/** Create (suite undefined) or rename a Test Suite. */
export function SuiteFormDialog({ agentId, suite, open, onOpenChange, onDone }: {
  agentId: string; suite?: Suite; open: boolean; onOpenChange: (o: boolean) => void; onDone?: (s: Suite) => void;
}) {
  const [name, setName] = useState(suite?.name ?? "");
  const [desc, setDesc] = useState(suite?.description ?? "");
  const [submitted, setSubmitted] = useState(false);
  const err = !name.trim() ? "Vui lòng nhập tên Test Suite." : testStore.nameTaken(agentId, name, suite?.id) ? "Tên Test Suite đã tồn tại." : "";
  const submit = () => {
    setSubmitted(true);
    if (err) return;
    if (suite) {
      testStore.renameSuite(suite.id, name, desc.trim());
      toast.success("Đã đổi tên Test Suite.");
      onDone?.(testStore.suite(suite.id)!);
    } else {
      const s = testStore.createSuite(agentId, name, desc);
      toast.success(`Đã tạo "${s.name}".`);
      onDone?.(s);
    }
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{suite ? "Đổi tên Test Suite" : "Tạo Test Suite"}</DialogTitle>
          <DialogDescription>{suite ? "Cập nhật tên và mô tả của bộ testcase." : "Nhóm các testcase cùng nghiệp vụ để chạy và theo dõi kết quả."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); submit(); }}>
          <div>
            <label htmlFor="suite-name" className="text-sm font-medium">Tên <span className="text-destructive">*</span></label>
            <Input id="suite-name" autoFocus value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="VD: CSKH – Câu hỏi thường gặp" className="mt-1.5" aria-invalid={submitted && !!err} />
            {submitted && err && <p className="mt-1.5 text-xs text-destructive" role="alert">{err}</p>}
          </div>
          <div>
            <label htmlFor="suite-desc" className="text-sm font-medium">Mô tả</label>
            <Textarea id="suite-desc" value={desc} maxLength={300} rows={3} onChange={e => setDesc(e.target.value)} placeholder="Bộ testcase này kiểm tra điều gì?" className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
            <Button type="submit">{suite ? "Lưu" : "Tạo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Two-step delete: warning, then type the exact name. */
export function DeleteSuiteDialog({ suite, onClose, onDeleted }: { suite: Suite; onClose: () => void; onDeleted?: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const runs = testStore.runs(suite.agentId, suite.id).length;
  return (
    <AlertDialog open onOpenChange={o => { if (!o) onClose(); }}>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá Test Suite "{suite.name}"?</AlertDialogTitle>
              <AlertDialogDescription>Thao tác này sẽ xoá vĩnh viễn {suite.cases.length} testcase và toàn bộ lịch sử chạy ({runs} lần chạy). Không thể hoàn tác.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <Button type="button" variant="destructive" onClick={() => setStep(2)}>Tiếp tục</Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xoá</AlertDialogTitle>
              <AlertDialogDescription>Nhập chính xác tên Test Suite <span className="font-medium text-foreground">{suite.name}</span> để xoá.</AlertDialogDescription>
            </AlertDialogHeader>
            <Input autoFocus value={typed} onChange={e => setTyped(e.target.value)} aria-label="Nhập tên Test Suite để xác nhận" placeholder={suite.name} />
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <Button type="button" variant="destructive" disabled={typed !== suite.name}
                onClick={() => { testStore.deleteSuite(suite.id); toast.success(`Đã xoá "${suite.name}".`); onDeleted?.(); onClose(); }}>Xoá</Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Màn 4 — "Chạy toàn bộ N testcase lên Agent?" (+ only Fail/Error re-run after the first run). */
export function RunConfirmDialog({ suite, onClose, onStarted }: { suite: Suite; onClose: () => void; onStarted: (runId: string) => void }) {
  const actor = useSpaceActor();
  const last = testStore.lastRun(suite.id);
  const failed = last ? suite.cases.filter(c => { const v = caseVerdict(last.results[c.id]); return v === "fail" || v === "error"; }).length : 0;
  const [onlyFailed, setOnlyFailed] = useState(false);
  const n = onlyFailed ? failed : suite.cases.length;
  const start = () => {
    const run = testStore.startRun(suite.id, actor.name, onlyFailed);
    if (!run) { toast.error("Không có testcase để chạy."); return; }
    toast.success(`Đã bắt đầu lần chạy #${run.number}.`);
    onStarted(run.id);
    onClose();
  };
  return (
    <AlertDialog open onOpenChange={o => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chạy {onlyFailed ? `${n} testcase Fail/Error` : `toàn bộ ${n} testcase`} lên Agent?</AlertDialogTitle>
          <AlertDialogDescription>Test Suite "{suite.name}". Kết quả cần Tester xác nhận sau khi chạy xong.</AlertDialogDescription>
        </AlertDialogHeader>
        {last && (
          <label className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm ${failed ? "cursor-pointer" : "opacity-60"}`}>
            <Checkbox checked={onlyFailed} disabled={!failed} onCheckedChange={v => setOnlyFailed(!!v)} className="mt-0.5" />
            <span>
              <span className="block font-medium">Chỉ chạy lại testcase Fail/Error lần trước</span>
              <span className="block text-xs text-muted-foreground">{failed ? `${failed} testcase ở lần chạy #${last.number}.` : `Lần chạy #${last.number} không có testcase Fail/Error.`}</span>
            </span>
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <Button type="button" disabled={!n} onClick={start}>Chạy ngay</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
