import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, Alert02Icon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { evaluationStore } from "./evaluationStore";
import { agentPublishStore } from "@/components/configure/agentPublishStore";
import { CURRENT_USER } from "./shared";

/** Draft = what the Builder is editing now; Live = the version end users currently get. */
function versionOptions(agentId: string) {
  const ps = agentPublishStore.get(agentId);
  const live = ps.placement !== null ? ps.version : null;
  return [
    { id: "draft", label: live ? `Bản nháp (sau ${live})` : "Bản nháp", hint: "Đang chỉnh sửa, chưa publish", disabled: false },
    { id: "live", label: live ? `Live ${live}` : "Live", hint: live ? "Bản người dùng đang dùng" : "Agent chưa publish", disabled: !live },
  ];
}

/** Chạy bộ test: chọn bộ test (nếu chưa chọn sẵn) + version. */
export function RunDialog({ agentId, open, onOpenChange, presetSetId, onStarted }: {
  agentId: string; open: boolean; onOpenChange: (o: boolean) => void; presetSetId?: string; onStarted: (runId: string) => void;
}) {
  const sets = evaluationStore.sets(agentId);
  const [setId, setSetId] = useState(presetSetId ?? sets[0]?.id ?? "");
  const [version, setVersion] = useState("draft");
  const VERSION_OPTIONS = versionOptions(agentId);
  useEffect(() => { if (open) { setSetId(presetSetId ?? sets[0]?.id ?? ""); setVersion("draft"); } }, [open, presetSetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = evaluationStore.set(setId);
  const cases = set ? evaluationStore.cases(set.id) : [];
  const required = set?.metrics.filter(m => m.required).length ?? 0;
  const liveWrite = set ? Object.entries(set.toolModes).filter(([, mode]) => mode === "live") : [];
  const draftCount = set ? evaluationStore.unreviewed(set.id).length : 0;
  const missingRef = set ? set.metrics.some(sm => evaluationStore.metric(sm.metricId)?.needs.includes("reference")) && cases.some(c => !c.reference) : false;
  const totalCalls = cases.length * (set?.runsPerCase ?? 1);

  const start = () => {
    if (!set) return;
    const run = evaluationStore.startRun(set.id, VERSION_OPTIONS.find(v => v.id === version)!.label, CURRENT_USER);
    onOpenChange(false);
    onStarted(run.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Chạy bộ test</DialogTitle>
          <DialogDescription>Agent trả lời từng test case, sau đó hệ thống chấm theo các chỉ số gắn với bộ test.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Bộ test</span>
            <select className="ds-input mt-1.5" value={setId} onChange={e => setSetId(e.target.value)} disabled={!!presetSetId}>
              {sets.map(s => <option key={s.id} value={s.id}>{s.name} ({evaluationStore.cases(s.id).length} test)</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-medium mb-1.5">Version</legend>
            <div className="grid grid-cols-2 gap-2">
              {VERSION_OPTIONS.map(v => (
                <button key={v.id} type="button" onClick={() => setVersion(v.id)} aria-pressed={version === v.id} disabled={v.disabled}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-base ${v.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${version === v.id ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"}`}>
                  <div className="text-sm font-semibold">{v.label}</div>
                  <div className="text-xs text-muted-foreground">{v.hint}</div>
                </button>
              ))}
            </div>
          </fieldset>
          {set && (
            <div className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
              {cases.length} test × {set.runsPerCase} lần = <b className="text-foreground">{totalCalls} lượt trả lời</b> · {set.metrics.length} chỉ số ({required} bắt buộc)
            </div>
          )}
          {liveWrite.length > 0 && (
            <div className="flex gap-2 rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))] px-3 py-2.5 text-sm">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="text-warning shrink-0 mt-0.5" />
              <span>Tool sau sẽ được gọi thật: <b>{liveWrite.map(([k]) => k).join(", ")}</b>. Chuyển sang Simulated trong Cài đặt bộ test nếu không muốn tạo dữ liệu thật.</span>
            </div>
          )}
          {draftCount > 0 && (
            <div className="flex gap-2 rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))] px-3 py-2.5 text-sm">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="text-warning shrink-0 mt-0.5" />
              <span>{draftCount} test case do AI sinh chưa được duyệt. Vẫn chạy được, nhưng đáp án mẫu chưa kiểm tra có thể làm kết quả chấm sai.</span>
            </div>
          )}
          {missingRef && (
            <div className="flex gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-muted-foreground">
              <HugeiconsIcon icon={Alert02Icon} size={16} className="shrink-0 mt-0.5" />
              <span>Một số test chưa có đáp án mẫu - Các chỉ số cần đáp án mẫu sẽ bỏ qua những test này.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <button className="btn-secondary" onClick={() => onOpenChange(false)}>Hủy</button>
          <button className="btn-primary" onClick={start} disabled={!set || cases.length === 0}>
            <HugeiconsIcon icon={PlayIcon} size={14} /> Bắt đầu chạy
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
