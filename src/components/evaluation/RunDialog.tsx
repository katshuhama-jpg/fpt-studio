import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, Alert02Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
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

const stamp = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };

/** Chạy bộ test (Relevance "Run" modal): tên lượt chạy, version, chạy cả bộ hoặc các test đã chọn,
 * "Tùy chọn thêm" để chấm thêm chỉ số chỉ cho lượt này. */
export function RunDialog({ agentId, open, onOpenChange, presetSetId, presetCaseIds, onStarted }: {
  agentId: string; open: boolean; onOpenChange: (o: boolean) => void; presetSetId?: string; presetCaseIds?: string[]; onStarted: (runId: string) => void;
}) {
  const sets = evaluationStore.sets(agentId);
  const [setId, setSetId] = useState(presetSetId ?? sets[0]?.id ?? "");
  const [version, setVersion] = useState("draft");
  const [name, setName] = useState("");
  const [more, setMore] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);
  const VERSION_OPTIONS = versionOptions(agentId);
  useEffect(() => {
    if (!open) return;
    const sid = presetSetId ?? sets[0]?.id ?? "";
    setSetId(sid); setVersion("draft"); setMore(false); setExtra([]);
    setName(`${evaluationStore.set(sid)?.name ?? "Lượt chạy"} - ${stamp()}`);
  }, [open, presetSetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = evaluationStore.set(setId);
  const cases = set ? evaluationStore.cases(set.id).filter(c => !presetCaseIds || presetCaseIds.includes(c.id)) : [];
  const extraOptions = set ? evaluationStore.agentMetrics(agentId).filter(m => !set.metrics.some(sm => sm.metricId === m.id)) : [];
  const required = set?.metrics.filter(m => m.required).length ?? 0;
  const liveWrite = set ? Object.entries(set.toolModes).filter(([, mode]) => mode === "live") : [];
  const draftCount = set ? evaluationStore.unreviewed(set.id).length : 0;
  const missingRef = set ? set.metrics.some(sm => evaluationStore.metric(sm.metricId)?.needs.includes("reference")) && cases.some(c => !c.reference) : false;
  const totalCalls = cases.reduce((a, c) => a + (c.runsPerCase ?? set?.runsPerCase ?? 1), 0);

  const start = () => {
    if (!set) return;
    const run = evaluationStore.startRun(set.id, VERSION_OPTIONS.find(v => v.id === version)!.label, CURRENT_USER, { name: name.trim() || undefined, caseIds: presetCaseIds, extraMetricIds: extra });
    onOpenChange(false);
    onStarted(run.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{presetCaseIds ? `Chạy ${presetCaseIds.length} test đã chọn` : "Chạy bộ test"}</DialogTitle>
          <DialogDescription>Agent trả lời từng test case, sau đó hệ thống chấm theo các chỉ số gắn với bộ test.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Tên lượt chạy</span>
            <input className="ds-input mt-1.5" value={name} onChange={e => setName(e.target.value)} />
          </label>
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
          <div className="rounded-lg border border-border">
            <button type="button" onClick={() => setMore(v => !v)} aria-expanded={more} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium cursor-pointer hover:bg-surface-muted rounded-lg transition-base">
              <span>Tùy chọn thêm <span className="text-xs text-muted-foreground font-normal">- Chấm thêm chỉ số cho riêng lượt này{extra.length ? ` (${extra.length})` : ""}</span></span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} className={`transition-transform ${more ? "rotate-180" : ""}`} />
            </button>
            {more && (
              <div className="px-3 pb-3 pt-1 border-t border-border space-y-1.5">
                {extraOptions.length === 0 ? <p className="text-xs text-muted-foreground pt-2">Bộ test đã dùng mọi chỉ số của Agent.</p> : extraOptions.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer pt-1.5">
                    <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={extra.includes(m.id)} onChange={e => setExtra(e.target.checked ? [...extra, m.id] : extra.filter(x => x !== m.id))} />
                    {m.name} <span className="text-xs text-muted-foreground">· {m.vnName}</span>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground pt-1">Chỉ số thêm ở đây chỉ để theo dõi, không tính vào Pass rate và không lưu vào bộ test.</p>
              </div>
            )}
          </div>
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
