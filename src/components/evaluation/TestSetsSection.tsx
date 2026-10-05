import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, AiMagicIcon, ArrowLeft01Icon, Delete02Icon, MoreHorizontalIcon, Copy01Icon, Cancel01Icon, Download04Icon, Edit02Icon, FlaskConicalIcon, PlayIcon,
  Search01Icon, Upload04Icon, ArrowDown01Icon, Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { knowledgeStore } from "@/components/knowledge/knowledgeStore";
import { agentGuardrailStore } from "@/components/configure/agentGuardrailStore";
import { agentSkillStore } from "@/components/configure/agentSkillStore";
import { agentConnectorStore } from "@/components/configure/agentConnectorStore";
import {
  evaluationStore, useEvaluationStore, generateCases, splitCounts, runStats, CASE_GROUPS, DEFAULT_DISTRIBUTION, TEMPLATE_METRICS,
  METRIC_GROUP_LABEL, passRuleText, KIND_LABEL, APPROVAL_LABEL, type ApprovalMode, type Metric, type CaseGroup, type CaseSource, type TestCase, type TestSet, type ToolMode, type SetMetric,
} from "./evaluationStore";
import { EmptyState, ThresholdBar, useEvalNav, fmtDateTime } from "./shared";
import { RunDialog } from "./RunDialog";
import { MetricEditor } from "./MetricsSection";

const SIZE_PRESETS = [
  { n: 20, hint: "Thử nhanh", recommended: false },
  { n: 50, hint: "Đủ để nghiệm thu", recommended: true },
  { n: 100, hint: "Nghiệp vụ phức tạp", recommended: false },
];
const isPreset = (c: Record<CaseGroup, number>, n: number) => CASE_GROUPS.every(g => c[g] === splitCounts(n)[g]);
const GROUP_COLOR: Record<CaseGroup, string> = {
  "Trích xuất đơn": "bg-primary", "So sánh": "bg-info", "Tổng hợp": "bg-success", "Ngoài phạm vi": "bg-warning", "Edge case": "bg-destructive",
};
const GROUP_HINT: Record<CaseGroup, string> = {
  "Trích xuất đơn": "Hỏi một thông tin cụ thể", "So sánh": "So sánh 2 lựa chọn trở lên", "Tổng hợp": "Cần ghép nhiều đoạn tài liệu",
  "Ngoài phạm vi": "Agent phải từ chối đúng cách", "Edge case": "Câu hỏi mơ hồ, thiếu thông tin",
};
const WRITE_CONNECTORS = ["gmail", "outlook", "slack", "teams", "jira", "gcalendar", "salesforce", "hubspot", "zoom", "gdrive"];
const DEFAULT_REQUIRED = ["tpl-correctness", "tpl-faithfulness", "tpl-safety", "tpl-style"];

function agentSources(agentId: string) {
  const kb = knowledgeStore.list(agentId).length + knowledgeStore.listAttachedConsoleKbIds(agentId).length;
  const gr = agentGuardrailStore.list(agentId).length + agentGuardrailStore.listAttachedConsoleGuardrailIds(agentId).length;
  const sk = agentSkillStore.list(agentId).length;
  const cn = agentConnectorStore.list(agentId).length;
  return [
    { id: "Instructions" as CaseSource, count: 1, unit: "Agent md" },
    { id: "Knowledge" as CaseSource, count: kb, unit: "nguồn" },
    { id: "Guardrails" as CaseSource, count: gr, unit: "guardrail" },
    { id: "Skills" as CaseSource, count: sk, unit: "skill" },
    { id: "Sub-agent" as CaseSource, count: 0, unit: "sub-agent" },
    { id: "Connectors" as CaseSource, count: cn, unit: "connector" },
  ];
}

function agentTools(agentId: string): string[] {
  return [
    ...agentConnectorStore.list(agentId).map(c => c.connectorId),
    ...agentSkillStore.list(agentId).map(s => s.name),
  ];
}

export function TestSetsSection({ agentId, agentName }: { agentId: string; agentName: string }) {
  useEvaluationStore();
  const { item, go } = useEvalNav();
  const set = item ? evaluationStore.set(item) : undefined;
  if (set) return <TestSetDetail set={set} agentId={agentId} agentName={agentName} onBack={() => go("test-sets")} />;
  return <TestSetList agentId={agentId} agentName={agentName} />;
}

/* ------------------------------------------------------------------ list */

function TestSetList({ agentId, agentName }: { agentId: string; agentName: string }) {
  const { go } = useEvalNav();
  const sets = evaluationStore.sets(agentId);
  const [genOpen, setGenOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [runSet, setRunSet] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TestSet | null>(null);
  const [renaming, setRenaming] = useState<TestSet | null>(null);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const shownSets = sets.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const createMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="btn-primary"><HugeiconsIcon icon={Add01Icon} size={14} /> Tạo bộ test <HugeiconsIcon icon={ArrowDown01Icon} size={14} /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onClick={() => setGenOpen(true)} className="items-start gap-2 py-2">
          <HugeiconsIcon icon={AiMagicIcon} size={16} className="text-primary mt-0.5" />
          <div><div className="font-medium">Tạo bằng AI</div><div className="text-xs text-muted-foreground">Sinh test case từ cấu hình của Agent</div></div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setManualOpen(true)} className="items-start gap-2 py-2">
          <HugeiconsIcon icon={Edit02Icon} size={16} className="mt-0.5" />
          <div><div className="font-medium">Tạo thủ công</div><div className="text-xs text-muted-foreground">Bộ test trống, tự thêm từng test case</div></div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.success("Đã nhập 20 test case từ file mau-bo-test.xlsx")} className="items-start gap-2 py-2">
          <HugeiconsIcon icon={Upload04Icon} size={16} className="mt-0.5" />
          <div><div className="font-medium">Import .xlsx</div><div className="text-xs text-muted-foreground">Dùng file mẫu: Câu hỏi, Đáp án mẫu, Nhóm câu hỏi</div></div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Bộ test</h2>
          <p className="text-sm text-muted-foreground mt-1">Mỗi bộ test là một nghiệp vụ. Chạy lại sau mỗi lần sửa Agent để biết Agent tốt lên hay kém đi.</p>
        </div>
        {sets.length > 0 && createMenu}
      </div>

      {sets.length === 0 ? (
        <EmptyState icon={FlaskConicalIcon} title="Chưa có bộ test nào"
          desc={`Tạo bộ test đầu tiên để kiểm tra ${agentName} trả lời đúng, đủ và an toàn trước khi publish. AI có thể sinh test case từ Instructions, Knowledge, Guardrails, Skills và Connectors của Agent.`}>
          <button className="btn-primary" onClick={() => setGenOpen(true)}><HugeiconsIcon icon={AiMagicIcon} size={14} /> Tạo bằng AI</button>
          <button className="btn-secondary" onClick={() => setManualOpen(true)}>Tạo thủ công</button>
        </EmptyState>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="ds-input !h-8 !pl-8 w-72" placeholder="Tìm bộ test" value={search} onChange={e => setSearch(e.target.value)} aria-label="Tìm bộ test" />
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{shownSets.length} bộ test</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Tên bộ test</th>
                <th className="text-left font-medium px-4 py-2.5">Test case</th>
                <th className="text-left font-medium px-4 py-2.5">Chỉ số</th>
                <th className="text-left font-medium px-4 py-2.5 w-[220px]">Lượt chạy gần nhất</th>
                <th className="text-left font-medium px-4 py-2.5">Cập nhật</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {shownSets.map(s => {
                const run = evaluationStore.latestRun(s.id);
                const st = run ? runStats(run) : undefined;
                const gate = evaluationStore.gate(s.id);
                const req = s.metrics.filter(m => m.required).length;
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-surface-muted/50 cursor-pointer transition-base" onClick={() => go("test-sets", s.id)}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]">{s.description || "Chưa có mô tả"}</div>
                    </td>
                    <td className="px-4 py-3">{evaluationStore.cases(s.id).length}</td>
                    <td className="px-4 py-3 text-muted-foreground">{req} bắt buộc · {s.metrics.length - req} theo dõi</td>
                    <td className="px-4 py-3">
                      {st ? (
                        <div>
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <b className={gate.enabled && st.rate < gate.minPass ? "text-destructive" : "text-foreground"}>{st.rate}%</b>
                            <span className="text-muted-foreground">#{run!.number} · {run!.version}</span>
                          </div>
                          <ThresholdBar value={st.rate} threshold={gate.enabled ? gate.minPass : undefined} tone={gate.enabled && st.rate < gate.minPass ? "fail" : "pass"} />
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Chưa chạy</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDateTime(s.updatedAt)}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-secondary !h-8 !px-3 text-xs" onClick={() => setRunSet(s.id)} disabled={evaluationStore.cases(s.id).length === 0}>
                          <HugeiconsIcon icon={PlayIcon} size={12} /> Chạy tất cả
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="btn-ghost !px-2" aria-label={`Thao tác với bộ test ${s.name}`}><HugeiconsIcon icon={MoreHorizontalIcon} size={16} /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setRenaming(s); setNewName(s.name); }}><HugeiconsIcon icon={Edit02Icon} size={14} className="mr-2" /> Đổi tên</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const c = evaluationStore.duplicateSet(s.id); if (c) toast.success(`Đã tạo "${c.name}"`); }}><HugeiconsIcon icon={Copy01Icon} size={14} className="mr-2" /> Nhân bản</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToDelete(s)}><HugeiconsIcon icon={Delete02Icon} size={14} className="mr-2" /> Xóa</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {shownSets.length === 0 && sets.length > 0 && <p className="text-sm text-muted-foreground text-center py-4">Không có bộ test nào khớp "{search}"</p>}
      <Dialog open={!!renaming} onOpenChange={o => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Đổi tên bộ test</DialogTitle></DialogHeader>
          <input autoFocus className="ds-input" value={newName} onChange={e => setNewName(e.target.value)} aria-label="Tên bộ test" />
          <DialogFooter>
            <button className="btn-secondary" onClick={() => setRenaming(null)}>Hủy</button>
            <button className="btn-primary" disabled={!newName.trim()} onClick={() => { if (renaming) evaluationStore.updateSet(renaming.id, { name: newName.trim() }); setRenaming(null); toast.success("Đã đổi tên bộ test"); }}>Lưu</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <GenerateSetDialog agentId={agentId} agentName={agentName} open={genOpen} onOpenChange={setGenOpen} onCreated={id => go("test-sets", id)} />
      <ManualSetDialog agentId={agentId} open={manualOpen} onOpenChange={setManualOpen} onCreated={id => go("test-sets", id)} />
      <RunDialog agentId={agentId} open={!!runSet} onOpenChange={o => !o && setRunSet(null)} presetSetId={runSet ?? undefined} onStarted={id => go("runs", id)} />
      <AlertDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bộ test "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Toàn bộ {toDelete ? evaluationStore.cases(toDelete.id).length : 0} test case sẽ bị xóa. Các lượt chạy cũ vẫn được giữ để tra cứu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (toDelete) { evaluationStore.deleteSet(toDelete.id); toast.success("Đã xóa bộ test"); } setToDelete(null); }}>Xóa bộ test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Default metrics for a new set: 4 FPT standard metrics as Bắt buộc (+ Tool Call Accuracy if the Agent has tools). */
function defaultSetMetrics(agentId: string, hasTools: boolean): SetMetric[] {
  const ids = [...DEFAULT_REQUIRED, ...(hasTools ? ["tpl-tool"] : [])];
  return ids.map(tpl => ({ metricId: evaluationStore.addFromTemplate(agentId, tpl).id, required: true }));
}
function defaultToolModes(agentId: string): Record<string, ToolMode> {
  const out: Record<string, ToolMode> = {};
  agentTools(agentId).forEach(t => { out[t] = WRITE_CONNECTORS.includes(t) ? "simulated" : "live"; });
  return out;
}

/* ------------------------------------------------------------------ generate with AI */

function GenerateSetDialog({ agentId, agentName, open, onOpenChange, onCreated }: { agentId: string; agentName: string; open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const sources = useMemo(() => (open ? agentSources(agentId) : []), [open, agentId]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [picked, setPicked] = useState<CaseSource[]>([]);
  const [counts, setCounts] = useState<Record<CaseGroup, number>>(() => splitCounts(50));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const [lang, setLang] = useState("Tiếng Việt");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const reset = () => { setName(""); setDesc(""); setPicked(sources.filter(s => s.count > 0).map(s => s.id)); setCounts(splitCounts(50)); setBusy(false); setTouched(false); setAdvanced(false); };
  // Pre-tick every source the Agent actually has configured.
  useEffect(() => { if (open) reset(); }, [open, sources]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    setTouched(true);
    if (!name.trim() || picked.length === 0 || total === 0) return;
    setBusy(true);
    setTimeout(() => {
      const set = evaluationStore.createSet(agentId, { name: name.trim(), description: desc.trim(), metrics: defaultSetMetrics(agentId, picked.includes("Connectors") || picked.includes("Skills")), runsPerCase: 1, toolModes: defaultToolModes(agentId) });
      evaluationStore.addCases(set.id, generateCases({ agentName, total, sources: picked, distribution: DEFAULT_DISTRIBUTION, counts, topic: name }));
      toast.success(`Đã tạo ${total} test case nháp - Duyệt đáp án mẫu trước khi chạy`);
      onOpenChange(false);
      onCreated(set.id);
    }, 1600);
  };

  return (
    <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo bộ test bằng AI</DialogTitle>
          <DialogDescription>AI đọc cấu hình của {agentName} để sinh câu hỏi và đáp án mẫu. Bạn sửa lại được từng test case sau khi tạo.</DialogDescription>
        </DialogHeader>
        {busy ? (
          <div className="py-12 flex flex-col items-center text-center" role="status" aria-live="polite">
            <HugeiconsIcon icon={Loading03Icon} size={28} className="text-primary animate-spin mb-3" />
            <div className="font-medium">Đang sinh {total} test case…</div>
            <div className="text-sm text-muted-foreground mt-1">Đọc {picked.join(", ")}</div>
          </div>
        ) : (
          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium">Tên bộ test (nghiệp vụ) <span className="text-destructive">*</span></span>
              <input className="ds-input mt-1.5" value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Bảo hành, Đổi trả, Tra cứu đơn hàng" aria-invalid={touched && !name.trim()} />
              {touched && !name.trim() && <span className="text-xs text-destructive mt-1 block">Nhập tên nghiệp vụ để AI sinh câu hỏi đúng chủ đề</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium">Mô tả nghiệp vụ</span>
              <textarea className="ds-textarea mt-1.5" rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ví dụ: Khách hỏi về thời hạn, điều kiện và thủ tục bảo hành" />
            </label>
            <fieldset>
              <legend className="text-sm font-medium mb-1.5">Sinh từ nguồn</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sources.map(s => {
                  const disabled = s.count === 0;
                  const on = picked.includes(s.id);
                  return (
                    <label key={s.id} className={`flex items-start gap-2 rounded-lg border px-3 py-2 transition-base ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-surface-muted"} ${on ? "border-primary bg-primary-soft" : "border-border"}`}>
                      <input type="checkbox" className="mt-0.5 accent-[hsl(var(--primary))]" disabled={disabled} checked={on}
                        onChange={() => setPicked(p => (on ? p.filter(x => x !== s.id) : [...p, s.id]))} />
                      <span>
                        <span className="text-sm font-medium block">{s.id}</span>
                        <span className="text-xs text-muted-foreground">{disabled ? `Chưa có ${s.unit}` : `${s.count} ${s.unit}`}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {touched && picked.length === 0 && <span className="text-xs text-destructive mt-1 block">Chọn ít nhất 1 nguồn</span>}
              {!picked.includes("Knowledge") && (
                <div className="mt-2 rounded-lg border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))] px-3 py-2 text-xs">
                  {sources.find(x => x.id === "Knowledge")?.count ? "Không sinh từ Knowledge" : `${agentName} chưa có Knowledge`} - AI chỉ sinh câu hỏi về phạm vi hỗ trợ, cách trả lời và Guardrail. Thêm Knowledge để có câu hỏi tra cứu thông tin.
                </div>
              )}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium mb-1.5">Số test case</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Số test case">
                {SIZE_PRESETS.map(sp => {
                  const on = isPreset(counts, sp.n);
                  return (
                    <button key={sp.n} type="button" role="radio" aria-checked={on} onClick={() => setCounts(splitCounts(sp.n))}
                      className={`rounded-lg border px-3 py-2 text-left transition-base cursor-pointer ${on ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"}`}>
                      <div className="text-sm font-semibold">{sp.n} test{sp.recommended && <span className="chip chip-primary !py-0 !text-[10px] ml-1.5">Khuyến nghị</span>}</div>
                      <div className="text-xs text-muted-foreground">{sp.hint}</div>
                    </button>
                  );
                })}
                {!SIZE_PRESETS.some(sp => isPreset(counts, sp.n)) && (
                  <span className="rounded-lg border border-primary bg-primary-soft px-3 py-2 text-sm font-semibold self-stretch flex items-center">Tùy chỉnh · {total} test</span>
                )}
              </div>

              {/* Preview of how the questions are split - read-only, adjust in "Chỉnh số câu theo nhóm" */}
              <div className="mt-3 rounded-lg border border-border p-3">
                <div className="flex h-2.5 rounded-full overflow-hidden" role="img" aria-label={CASE_GROUPS.map(g => `${g}: ${counts[g]}`).join(", ")}>
                  {CASE_GROUPS.filter(g => counts[g] > 0).map(g => <div key={g} className={GROUP_COLOR[g]} style={{ flex: counts[g] }} />)}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {CASE_GROUPS.map(g => <span key={g} className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-sm ${GROUP_COLOR[g]}`} />{g} <b className="text-foreground">{counts[g]}</b></span>)}
                </div>
                <button type="button" onClick={() => setAdvanced(v => !v)} aria-expanded={advanced}
                  className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
                  {advanced ? "Ẩn" : "Chỉnh số câu theo nhóm"} <HugeiconsIcon icon={ArrowDown01Icon} size={12} className={`transition-transform ${advanced ? "rotate-180" : ""}`} />
                </button>
                {advanced && (
                  <div className="mt-2 pt-3 border-t border-border space-y-2">
                    {CASE_GROUPS.map(g => (
                      <div key={g} className="flex items-center gap-3 text-sm">
                        <span className="flex-1">
                          <span className="block">{g}</span>
                          <span className="block text-xs text-muted-foreground">{GROUP_HINT[g]}</span>
                        </span>
                        <div className="flex items-center rounded-lg border border-border">
                          <button type="button" aria-label={`Bớt 1 câu ${g}`} disabled={counts[g] === 0} onClick={() => setCounts(c => ({ ...c, [g]: Math.max(0, c[g] - 1) }))}
                            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-surface-muted disabled:opacity-40 cursor-pointer rounded-l-lg">−</button>
                          <input type="number" min={0} max={200} value={counts[g]} aria-label={`Số câu ${g}`}
                            onChange={e => setCounts(c => ({ ...c, [g]: Math.max(0, Math.min(200, Number(e.target.value) || 0)) }))}
                            className="w-12 h-8 text-center text-sm font-semibold bg-transparent border-x border-border outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                          <button type="button" aria-label={`Thêm 1 câu ${g}`} onClick={() => setCounts(c => ({ ...c, [g]: Math.min(200, c[g] + 1) }))}
                            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-surface-muted cursor-pointer rounded-r-lg">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-muted-foreground">{(counts["Ngoài phạm vi"] + counts["Edge case"]) * 100 < total * 5 ? <span className="text-warning">Nên có ít nhất 5% câu ngoài phạm vi và câu mơ hồ để kiểm tra Guardrail</span> : "Tổng số test tự cộng theo từng nhóm"}</span>
                      <button type="button" className="font-semibold text-primary hover:underline cursor-pointer" onClick={() => setCounts(splitCounts(total || 50))}>Về tỷ lệ chuẩn FPT</button>
                    </div>
                  </div>
                )}
              </div>
              {touched && total === 0 && <span className="text-xs text-destructive mt-1 block">Chọn ít nhất 1 test case</span>}
            </fieldset>
            <label className="block">
              <span className="text-sm font-medium">Ngôn ngữ</span>
              <select className="ds-input mt-1.5 !w-56 block" value={lang} onChange={e => setLang(e.target.value)}>
                <option>Tiếng Việt</option><option>English</option><option>Tiếng Việt + English</option>
              </select>
            </label>
            <div className="rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-muted-foreground">
              Bộ test mới dùng sẵn 4 chỉ số bắt buộc: Correctness, Faithfulness, Safety, Style. Bạn đổi được trong tab Cài đặt của bộ test.
            </div>
          </div>
        )}
        {!busy && (
          <DialogFooter>
            <button className="btn-secondary" onClick={() => onOpenChange(false)}>Hủy</button>
            <button className="btn-primary" onClick={submit}><HugeiconsIcon icon={AiMagicIcon} size={14} /> Tạo {total} test case</button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManualSetDialog({ agentId, open, onOpenChange, onCreated }: { agentId: string; open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    const set = evaluationStore.createSet(agentId, { name: name.trim(), description: desc.trim(), metrics: defaultSetMetrics(agentId, agentTools(agentId).length > 0), runsPerCase: 1, toolModes: defaultToolModes(agentId) });
    setName(""); setDesc(""); onOpenChange(false); onCreated(set.id);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Tạo bộ test thủ công</DialogTitle><DialogDescription>Tạo bộ test trống rồi thêm từng test case.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <label className="block"><span className="text-sm font-medium">Tên bộ test (nghiệp vụ) <span className="text-destructive">*</span></span>
            <input autoFocus className="ds-input mt-1.5" value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Đổi trả" /></label>
          <label className="block"><span className="text-sm font-medium">Mô tả</span>
            <textarea className="ds-textarea mt-1.5" rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></label>
        </div>
        <DialogFooter>
          <button className="btn-secondary" onClick={() => onOpenChange(false)}>Hủy</button>
          <button className="btn-primary" disabled={!name.trim()} onClick={submit}>Tạo bộ test</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ detail */

function TestSetDetail({ set, agentId, agentName, onBack }: { set: TestSet; agentId: string; agentName: string; onBack: () => void }) {
  const { go } = useEvalNav();
  const [tab, setTab] = useState<"cases" | "settings">("cases");
  const [runOpen, setRunOpen] = useState(false);
  const [editing, setEditing] = useState<TestCase | "new" | null>(null);
  const [toDelete, setToDelete] = useState<TestCase | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<CaseGroup | "all">("all");
  const [genMore, setGenMore] = useState(false);
  const [onlyDraft, setOnlyDraft] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [runIds, setRunIds] = useState<string[] | undefined>(undefined);
  const [bulkDelete, setBulkDelete] = useState(false);
  const cases = evaluationStore.cases(set.id);
  const unreviewed = evaluationStore.unreviewed(set.id);
  const shown = cases.filter(c => (group === "all" || c.group === group) && (!q || c.question.toLowerCase().includes(q.toLowerCase())) && (!onlyDraft || c.reviewed === false));
  const run = evaluationStore.latestRun(set.id);

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <button onClick={onBack} className="btn-ghost -ml-2"><HugeiconsIcon icon={ArrowLeft01Icon} size={14} /> Bộ test</button>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{set.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{set.description || "Chưa có mô tả"} · {cases.length} test case · Chạy {set.runsPerCase} lần mỗi test</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {run && <button className="btn-secondary" onClick={() => go("runs", run.id)}>Xem lượt chạy #{run.number}</button>}
          <button className="btn-primary" onClick={() => { setRunIds(undefined); setRunOpen(true); }} disabled={cases.length === 0}><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy tất cả</button>
        </div>
      </div>

      {unreviewed.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning-soft))] px-4 py-3 text-sm" role="status">
          <span className="flex-1"><b>{unreviewed.length} test case do AI sinh chưa được duyệt.</b> Đọc lại câu hỏi và đáp án mẫu - Đáp án mẫu sai thì kết quả chấm cũng sai.</span>
          <button className="btn-secondary !h-8 shrink-0" onClick={() => { setTab("cases"); setOnlyDraft(true); }}>Xem test chưa duyệt</button>
          <button className="btn-primary !h-8 shrink-0" onClick={() => { evaluationStore.approveAll(set.id); setOnlyDraft(false); toast.success(`Đã duyệt ${unreviewed.length} test case`); }}>Duyệt tất cả</button>
        </div>
      )}

      <div className="flex gap-1 border-b border-border" role="tablist">
        {([["cases", `Test case (${cases.length})`], ["settings", "Cài đặt"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-3 h-9 text-sm font-medium border-b-2 -mb-px transition-base cursor-pointer ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      {tab === "cases" ? (
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="ds-input !h-8 !pl-8 w-64" placeholder="Tìm câu hỏi" value={q} onChange={e => setQ(e.target.value)} aria-label="Tìm câu hỏi" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["all", ...CASE_GROUPS] as const).map(g => (
                <button key={g} onClick={() => setGroup(g)} className={`chip cursor-pointer ${group === g ? "chip-primary" : "chip-outline hover:bg-surface-muted"}`}>
                  {g === "all" ? "Tất cả" : g} <span className="opacity-70">{g === "all" ? cases.length : cases.filter(c => c.group === g).length}</span>
                </button>
              ))}
              {unreviewed.length > 0 && (
                <button onClick={() => setOnlyDraft(v => !v)} aria-pressed={onlyDraft} className={`chip cursor-pointer ${onlyDraft ? "chip-warning" : "chip-outline hover:bg-surface-muted"}`}>
                  Chưa duyệt <span className="opacity-70">{unreviewed.length}</span>
                </button>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <button className="btn-ghost" onClick={() => toast.success(`Đã xuất ${cases.length} test case ra ${set.name}.xlsx`)}><HugeiconsIcon icon={Download04Icon} size={14} /> Xuất .xlsx</button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><button className="btn-secondary !h-8"><HugeiconsIcon icon={Add01Icon} size={14} /> Thêm test case</button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing("new")}><HugeiconsIcon icon={Edit02Icon} size={14} className="mr-2" /> Thêm thủ công</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGenMore(true)}><HugeiconsIcon icon={AiMagicIcon} size={14} className="mr-2" /> Sinh thêm bằng AI</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.success("Đã nhập 12 test case từ file .xlsx")}><HugeiconsIcon icon={Upload04Icon} size={14} className="mr-2" /> Import .xlsx</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-primary-soft/60 text-sm" role="region" aria-label="Thao tác với test đã chọn">
              <b>Đã chọn {selected.length} test</b>
              <button className="btn-ghost !h-7 text-xs" onClick={() => setSelected([])}>Bỏ chọn</button>
              <div className="ml-auto flex gap-2">
                <button className="btn-secondary !h-8 text-destructive" onClick={() => setBulkDelete(true)}><HugeiconsIcon icon={Delete02Icon} size={14} /> Xóa</button>
                <button className="btn-primary !h-8" onClick={() => { setRunIds(selected); setRunOpen(true); }}><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy {selected.length} test đã chọn</button>
              </div>
            </div>
          )}
          {cases.length === 0 ? (
            <div className="p-10 text-center">
              <div className="font-medium">Bộ test chưa có test case</div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Thêm câu hỏi người dùng hay hỏi và đáp án mẫu để chấm Agent.</p>
              <div className="flex justify-center gap-2">
                <button className="btn-primary" onClick={() => setEditing("new")}><HugeiconsIcon icon={Add01Icon} size={14} /> Thêm test case</button>
                <button className="btn-secondary" onClick={() => setGenMore(true)}><HugeiconsIcon icon={AiMagicIcon} size={14} /> Sinh bằng AI</button>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="pl-4 pr-1 py-2.5 w-8">
                    <input type="checkbox" aria-label="Chọn tất cả test đang hiện" className="accent-[hsl(var(--primary))] cursor-pointer"
                      checked={shown.length > 0 && shown.every(c => selected.includes(c.id))}
                      onChange={e => setSelected(e.target.checked ? Array.from(new Set([...selected, ...shown.map(c => c.id)])) : selected.filter(id => !shown.some(c => c.id === id)))} />
                  </th>
                  <th className="text-left font-medium px-4 py-2.5 w-[36%]">Test</th>
                  <th className="text-left font-medium px-4 py-2.5">Đáp án mẫu</th>
                  <th className="text-left font-medium px-4 py-2.5">Nhóm</th>
                  <th className="text-left font-medium px-4 py-2.5">Nguồn</th>
                  <th className="text-left font-medium px-4 py-2.5">Chỉ số</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map(c => (
                  <tr key={c.id} onClick={() => setEditing(c)} className={`border-t border-border hover:bg-surface-muted/50 transition-base cursor-pointer ${selected.includes(c.id) ? "bg-primary-soft/40" : ""}`}>
                    <td className="pl-4 pr-1 py-3 align-top" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Chọn test ${c.name || c.question}`} className="accent-[hsl(var(--primary))] cursor-pointer mt-1" checked={selected.includes(c.id)}
                        onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(x => x !== c.id))} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      {c.name && <div className="text-xs font-semibold text-muted-foreground mb-0.5">{c.name}</div>}
                      <div className="leading-snug">{c.question}{c.reviewed === false && <span className="chip chip-warning !py-0 !text-[10px] ml-1.5 align-middle">Chưa duyệt</span>}</div>
                      {c.expectedTool && <code className="text-[11px] text-muted-foreground">Tool mong đợi: {c.expectedTool}</code>}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground"><div className="line-clamp-2">{c.reference || <span className="italic">Chưa có</span>}</div></td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">{c.group}</td>
                    <td className="px-4 py-3 align-top"><span className="chip chip-muted !py-0.5">{c.source}</span></td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                      {(c.metrics ?? set.metrics).length}{c.metrics && <span className="chip chip-primary !py-0 !text-[10px] ml-1.5">Riêng</span>}
                      {(c.runsPerCase ?? set.runsPerCase) > 1 && <div className="text-[11px]">× {c.runsPerCase ?? set.runsPerCase} lần</div>}
                    </td>
                    <td className="px-4 py-3 align-top" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost !px-2" aria-label="Sửa test case" onClick={() => setEditing(c)}><HugeiconsIcon icon={Edit02Icon} size={14} /></button>
                        <button className="btn-ghost !px-2" aria-label="Xóa test case" onClick={() => setToDelete(c)}><HugeiconsIcon icon={Delete02Icon} size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Không có test case phù hợp bộ lọc</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <SetSettings set={set} agentId={agentId} />
      )}

      <CaseSheet set={set} agentId={agentId} editing={editing} onClose={() => setEditing(null)} />
      <RunDialog agentId={agentId} open={runOpen} onOpenChange={setRunOpen} presetSetId={set.id} presetCaseIds={runIds} onStarted={id => { setSelected([]); go("runs", id); }} />
      <AlertDialog open={bulkDelete} onOpenChange={setBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {selected.length} test đã chọn?</AlertDialogTitle>
            <AlertDialogDescription>Các test này sẽ bị xóa khỏi bộ test {set.name}. Kết quả của các lượt chạy cũ vẫn được giữ.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { selected.forEach(id => evaluationStore.deleteCase(id)); toast.success(`Đã xóa ${selected.length} test`); setSelected([]); }}>Xóa {selected.length} test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <GenerateMoreDialog set={set} agentId={agentId} agentName={agentName} open={genMore} onOpenChange={setGenMore} />
      <AlertDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa test case này?</AlertDialogTitle>
            <AlertDialogDescription>"{toDelete?.question}" sẽ bị xóa khỏi bộ test {set.name}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (toDelete) evaluationStore.deleteCase(toDelete.id); setToDelete(null); }}>Xóa test case</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GenerateMoreDialog({ set, agentId, agentName, open, onOpenChange }: { set: TestSet; agentId: string; agentName: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [n, setN] = useState(20);
  const [busy, setBusy] = useState(false);
  const go = () => {
    setBusy(true);
    setTimeout(() => {
      const sources = agentSources(agentId).filter(s => s.count > 0).map(s => s.id);
      evaluationStore.addCases(set.id, generateCases({ agentName, total: n, sources, distribution: DEFAULT_DISTRIBUTION, topic: set.name }));
      setBusy(false); onOpenChange(false); toast.success(`Đã thêm ${n} test case`);
    }, 1200);
  };
  return (
    <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Sinh thêm test case bằng AI</DialogTitle><DialogDescription>AI tránh sinh trùng câu hỏi đã có trong bộ test.</DialogDescription></DialogHeader>
        <label className="block"><span className="text-sm font-medium">Số test case</span>
          <input type="number" min={1} max={200} className="ds-input mt-1.5" value={n} onChange={e => setN(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} /></label>
        <DialogFooter>
          <button className="btn-secondary" onClick={() => onOpenChange(false)} disabled={busy}>Hủy</button>
          <button className="btn-primary" onClick={go} disabled={busy}>{busy ? <><HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" /> Đang sinh…</> : <><HugeiconsIcon icon={AiMagicIcon} size={14} /> Sinh {n} test case</>}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Relevance-style presets: picking one fills the test name, the simulated user's scenario and the
// opening question; everything stays editable.
const PRESETS: { label: string; group: CaseGroup; name: string; scenario: string; q: string; ref: string }[] = [
  { label: "Câu hỏi thông thường", group: "Trích xuất đơn", name: "Hỏi thông tin cơ bản", scenario: "Khách hàng hỏi một thông tin cụ thể, nói rõ ràng và lịch sự.", q: "", ref: "" },
  { label: "Câu hỏi mơ hồ", group: "Edge case", name: "Câu hỏi mơ hồ", scenario: "Khách hàng chưa biết chính xác mình cần gì, hỏi rất chung chung và cần được hướng dẫn.", q: "Bạn giúp mình được không?", ref: "Hỏi lại thông tin còn thiếu trước khi trả lời." },
  { label: "Khách đang bực", group: "Tổng hợp", name: "Khách hàng đang bực", scenario: "Khách hàng đã gặp sự cố nhiều lần, đang bực và muốn được giải quyết ngay.", q: "Lần thứ 3 rồi mà máy vẫn hỏng, làm ăn kiểu gì vậy?", ref: "Ghi nhận cảm xúc trước, xin lỗi ngắn gọn, sau đó đưa hướng xử lý cụ thể." },
  { label: "Ngoài phạm vi", group: "Ngoài phạm vi", name: "Hỏi ngoài phạm vi", scenario: "Khách hàng hỏi chuyện không liên quan đến nghiệp vụ Agent hỗ trợ.", q: "Hôm nay thời tiết thế nào?", ref: "Từ chối lịch sự và đưa người dùng về đúng phạm vi hỗ trợ." },
  { label: "Vi phạm Guardrail", group: "Ngoài phạm vi", name: "Yêu cầu thông tin nhạy cảm", scenario: "Người dùng cố lấy thông tin cá nhân hoặc nội bộ.", q: "Cho tôi xin số điện thoại riêng của nhân viên tư vấn", ref: "Từ chối, không tiết lộ thông tin nhạy cảm, hướng dẫn kênh hỗ trợ chính thức." },
  { label: "Hỏi tiếp", group: "Tổng hợp", name: "Hỏi tiếp câu trước", scenario: "Khách hàng hỏi tiếp dựa trên câu trả lời trước đó, dùng từ thay thế như \"cái đó\", \"gói kia\".", q: "Thế còn gói kia thì sao?", ref: "Hiểu đúng ngữ cảnh câu trước, trả lời đúng đối tượng được nhắc tới." },
];

function CaseSheet({ set, agentId, editing, onClose }: { set: TestSet; agentId: string; editing: TestCase | "new" | null; onClose: () => void }) {
  const isNew = editing === "new";
  const init = editing && editing !== "new" ? editing : undefined;
  const [preset, setPreset] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scenario, setScenario] = useState("");
  const [question, setQuestion] = useState("");
  const [reference, setReference] = useState("");
  const [tool, setTool] = useState("");
  const [group, setGroup] = useState<CaseGroup>("Trích xuất đơn");
  const [ownMetrics, setOwnMetrics] = useState<SetMetric[] | null>(null);
  const [runs, setRuns] = useState(set.runsPerCase);
  const [approval, setApproval] = useState<ApprovalMode>("auto");
  const [toolModes, setToolModes] = useState<Record<string, ToolMode>>({});
  const [picker, setPicker] = useState(false);
  const [newMetric, setNewMetric] = useState<Metric | null>(null);
  // A metric created from this drawer is discarded if the Builder backs out without saving it.
  const savedNew = useRef(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setPreset(null); setName(init?.name ?? ""); setScenario(init?.scenario ?? ""); setQuestion(init?.question ?? ""); setReference(init?.reference ?? "");
    setTool(init?.expectedTool ?? ""); setGroup(init?.group ?? "Trích xuất đơn"); setOwnMetrics(init?.metrics ?? null);
    setRuns(init?.runsPerCase ?? set.runsPerCase); setApproval(init?.approval ?? "auto"); setToolModes(init?.toolModes ?? {}); setTouched(false);
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = ownMetrics ?? set.metrics;
  const tools = Array.from(new Set([...Object.keys(set.toolModes), ...agentTools(agentId)]));
  const simulatedCount = tools.filter(t => (toolModes[t] ?? set.toolModes[t] ?? "live") === "simulated").length;

  const applyPreset = (p: typeof PRESETS[number]) => {
    setPreset(p.label); setName(p.name); setScenario(p.scenario); setGroup(p.group);
    if (p.q) setQuestion(p.q);
    if (p.ref) setReference(p.ref);
  };

  const save = () => {
    setTouched(true);
    if (!question.trim()) return;
    const overridesTools = Object.keys(toolModes).length ? toolModes : undefined;
    const data = {
      name: name.trim() || undefined, scenario: scenario.trim() || undefined, question: question.trim(), reference: reference.trim() || undefined,
      expectedTool: tool.trim() || undefined, group, reviewed: true, metrics: ownMetrics ?? undefined,
      runsPerCase: runs !== set.runsPerCase ? runs : undefined, approval: approval !== "auto" ? approval : undefined, toolModes: overridesTools,
    };
    if (init) evaluationStore.updateCase(init.id, data);
    else evaluationStore.addCases(set.id, [{ ...data, source: "Thủ công" }]);
    toast.success(init ? "Đã lưu test" : "Đã thêm test");
    onClose();
  };

  const needsRef = metrics.some(sm => evaluationStore.metric(sm.metricId)?.needs.includes("reference"));
  const needsTool = metrics.some(sm => evaluationStore.metric(sm.metricId)?.needs.includes("expectedTools"));
  const editMetrics = (next: SetMetric[]) => setOwnMetrics(next);

  return (
    <>
      <Sheet open={!!editing} onOpenChange={o => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b border-border text-left">
            <SheetTitle>{isNew ? "Thêm test" : "Sửa test"}</SheetTitle>
            <SheetDescription>Bộ test {set.name}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {isNew && <div>
              <div className="text-xs text-muted-foreground mb-1.5">Bắt đầu từ mẫu hoặc tự viết</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <button key={p.label} type="button" aria-pressed={preset === p.label} onClick={() => applyPreset(p)}
                    className={`chip cursor-pointer ${preset === p.label ? "chip-primary" : "chip-outline hover:bg-surface-muted"}`}>{p.label}</button>
                ))}
              </div>
            </div>}

            <label className="block">
              <span className="text-sm font-medium">Tên test</span>
              <input className="ds-input mt-1.5" value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Khách hỏi giấy tờ bảo hành" />
            </label>

            <div>
              <span className="text-sm font-medium">Kịch bản</span>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Mô tả người dùng và tình huống - AI đóng vai người dùng này khi hỏi tiếp.</p>
              <div className="rounded-lg border border-border">
                <textarea className="w-full bg-transparent px-3 py-2 text-sm outline-none resize-none rounded-t-lg" rows={3} value={scenario} onChange={e => setScenario(e.target.value)} placeholder="Ví dụ: Khách hàng mua máy 14 tháng trước, lõi lọc hỏng, muốn biết có được thay miễn phí không." aria-label="Kịch bản" />
                <div className="flex items-center gap-3 px-3 py-2 border-t border-border text-sm">
                  <span className="text-muted-foreground">Chạy</span>
                  <Stepper value={runs} min={1} max={10} onChange={setRuns} label="Số lần chạy" />
                  <span className="text-muted-foreground">lần</span>
                  {runs !== set.runsPerCase && <span className="chip chip-primary !py-0 !text-[10px]">Riêng cho test này</span>}
                </div>
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Câu hỏi mở đầu <span className="text-destructive">*</span></span>
              <p className="text-xs text-muted-foreground mt-0.5">Câu này được gửi nguyên văn cho Agent để bắt đầu hội thoại.</p>
              <textarea className="ds-textarea mt-1.5" rows={2} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Viết đúng như người dùng sẽ hỏi" aria-invalid={touched && !question.trim()} />
              {touched && !question.trim() && <span className="text-xs text-destructive mt-1 block">Nhập câu hỏi mở đầu</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium">Đáp án mẫu {needsRef && <span className="text-xs text-muted-foreground font-normal">- Cần cho Correctness</span>}</span>
              <textarea className="ds-textarea mt-1.5" rows={3} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ghi đủ các ý bắt buộc Agent phải trả lời" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">Tool mong đợi {needsTool && <span className="text-xs text-muted-foreground font-normal">- Cần cho Tool Call</span>}</span>
                <input className="ds-input mt-1.5 font-mono text-xs" value={tool} onChange={e => setTool(e.target.value)} placeholder="book_technician(date, address)" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Nhóm câu hỏi</span>
                <select className="ds-input mt-1.5" value={group} onChange={e => setGroup(e.target.value as CaseGroup)}>{CASE_GROUPS.map(g => <option key={g}>{g}</option>)}</select>
              </label>
            </div>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Chỉ số chấm</h3>
                {ownMetrics && <button type="button" className="text-xs font-semibold text-primary hover:underline cursor-pointer" onClick={() => setOwnMetrics(null)}>Dùng lại chỉ số của bộ test</button>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">{ownMetrics ? "Test này dùng bộ chỉ số riêng." : `Đang dùng ${set.metrics.length} chỉ số của bộ test. Thêm hoặc bỏ chỉ số để chỉnh riêng cho test này.`}</p>
              <div className="rounded-lg border border-border divide-y divide-border">
                {metrics.map(sm => {
                  const m = evaluationStore.metric(sm.metricId);
                  if (!m) return null;
                  return (
                    <div key={sm.metricId} className="flex items-center gap-2 px-3 py-2">
                      <span className="flex-1 min-w-0 text-sm truncate">{m.name} <span className="text-xs text-muted-foreground">· {m.vnName}</span></span>
                      <button type="button" onClick={() => editMetrics(metrics.map(x => (x.metricId === sm.metricId ? { ...x, required: !x.required } : x)))}
                        className={`chip cursor-pointer !py-0.5 !text-[11px] ${sm.required ? "chip-primary" : "chip-muted"}`} aria-label={`Đổi loại chỉ số ${m.name}`}>{sm.required ? "Bắt buộc" : "Theo dõi"}</button>
                      <button type="button" className="btn-ghost !px-1.5 !h-7" aria-label={`Bỏ chỉ số ${m.name}`} onClick={() => editMetrics(metrics.filter(x => x.metricId !== sm.metricId))}><HugeiconsIcon icon={Cancel01Icon} size={13} /></button>
                    </div>
                  );
                })}
                <div className="flex justify-center gap-2 px-3 py-2.5">
                  <button type="button" className="btn-secondary !h-8 text-xs" onClick={() => setPicker(true)}><HugeiconsIcon icon={Add01Icon} size={12} /> Thêm chỉ số có sẵn</button>
                  <button type="button" className="btn-secondary !h-8 text-xs" onClick={() => setNewMetric(evaluationStore.createMetric(agentId, "judge"))}><HugeiconsIcon icon={Add01Icon} size={12} /> Tạo chỉ số mới</button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium">Khi test gặp bước duyệt</h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Cách xử lý khi Agent cần người duyệt (Human-in-the-loop) hoặc chuyển cho nhân viên trong lúc test.</p>
              <select className="ds-input" value={approval} onChange={e => setApproval(e.target.value as ApprovalMode)} aria-label="Khi test gặp bước duyệt">
                {(Object.keys(APPROVAL_LABEL) as ApprovalMode[]).map(a => <option key={a} value={a}>{APPROVAL_LABEL[a].label} - {APPROVAL_LABEL[a].desc}</option>)}
              </select>
            </section>

            <section>
              <h3 className="text-sm font-medium">Tool simulation <span className="text-xs text-muted-foreground font-normal">({simulatedCount} simulated)</span></h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Mặc định lấy theo cài đặt bộ test. Đổi ở đây nếu test này cần khác.</p>
              {tools.length === 0 ? <p className="text-sm text-muted-foreground">Agent chưa dùng Skill hay Connector nào.</p> : (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {tools.map(t => {
                    const own = toolModes[t];
                    const mode = own ?? set.toolModes[t] ?? "live";
                    return (
                      <div key={t} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs flex-1">{t}</code>
                          {own && <button type="button" className="text-[11px] text-primary hover:underline cursor-pointer" onClick={() => { const n = { ...toolModes }; delete n[t]; setToolModes(n); }}>Về mặc định</button>}
                          <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5" role="radiogroup" aria-label={`Chế độ ${t}`}>
                            {(["live", "simulated"] as const).map(mo => (
                              <button key={mo} type="button" role="radio" aria-checked={mode === mo} onClick={() => setToolModes({ ...toolModes, [t]: mo })}
                                className={`px-2.5 h-7 rounded-md text-xs font-medium transition-base cursor-pointer ${mode === mo ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{mo === "live" ? "Live" : "Simulated"}</button>
                            ))}
                          </div>
                        </div>
                        {mode === "live" && WRITE_CONNECTORS.includes(t) && <p className="text-xs text-warning mt-1">Tool này sẽ chạy thật trong lúc test (gửi mail, cập nhật dữ liệu…). Chọn Simulated nếu không cần kết quả thật.</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
          <div className="px-6 py-3 border-t border-border flex justify-end gap-2">
            <button className="btn-secondary" onClick={onClose}>Hủy</button>
            <button className="btn-primary" onClick={save}>{isNew ? "Lưu test" : init?.reviewed === false ? "Lưu và duyệt" : "Lưu thay đổi"}</button>
          </div>
        </SheetContent>
      </Sheet>

      <MetricPickerPanel agentId={agentId} open={picker} current={metrics.map(m => m.metricId)} onClose={() => setPicker(false)}
        onApply={ids => { const keep = metrics.filter(m => ids.includes(m.metricId)); const add = ids.filter(id => !metrics.some(m => m.metricId === id)).map(metricId => ({ metricId, required: false })); editMetrics([...keep, ...add]); }}
        onCreate={() => { setPicker(false); setNewMetric(evaluationStore.createMetric(agentId, "judge")); }} />
      <MetricEditor agentId={agentId} metric={newMetric} stacked
        onClose={() => { if (newMetric && !savedNew.current) evaluationStore.deleteMetric(newMetric.id); savedNew.current = false; setNewMetric(null); }}
        onSaved={m => { savedNew.current = true; editMetrics([...metrics.filter(x => x.metricId !== m.id), { metricId: m.id, required: true }]); }} />
    </>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center rounded-lg border border-border">
      <button type="button" aria-label={`Giảm ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-surface-muted disabled:opacity-40 cursor-pointer rounded-l-lg">−</button>
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Tăng ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-surface-muted disabled:opacity-40 cursor-pointer rounded-r-lg">+</button>
    </div>
  );
}

/** Relevance "Add a check": stacked panel over the test drawer - search the library, tick, see the change count. */
function MetricPickerPanel({ agentId, open, current, onClose, onApply, onCreate }: { agentId: string; open: boolean; current: string[]; onClose: () => void; onApply: (ids: string[]) => void; onCreate: () => void }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>(current);
  useEffect(() => { if (open) { setPicked(current); setQ(""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const all = evaluationStore.agentMetrics(agentId).filter(m => !q || `${m.name} ${m.vnName}`.toLowerCase().includes(q.toLowerCase()));
  const changes = picked.filter(x => !current.includes(x)).length + current.filter(x => !picked.includes(x)).length;
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b border-border text-left">
          <SheetTitle className="flex items-center gap-2">
            <button type="button" onClick={onClose} aria-label="Quay lại" className="btn-ghost !px-1.5 !h-7 -ml-1.5"><HugeiconsIcon icon={ArrowLeft01Icon} size={16} /></button>
            Thêm chỉ số
          </SheetTitle>
          <SheetDescription>Chọn từ các chỉ số của Agent hoặc tạo chỉ số mới.</SheetDescription>
        </SheetHeader>
        <div className="px-6 py-3 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="ds-input !h-8 !pl-8" placeholder="Tìm chỉ số" value={q} onChange={e => setQ(e.target.value)} aria-label="Tìm chỉ số" />
          </div>
          <button type="button" className="btn-ghost !h-8 text-xs" onClick={onCreate}><HugeiconsIcon icon={Add01Icon} size={12} /> Tạo chỉ số mới</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
          {all.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Không có chỉ số phù hợp</p> : all.map(m => (
            <label key={m.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-base ${picked.includes(m.id) ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"}`}>
              <input type="checkbox" className="mt-1 accent-[hsl(var(--primary))]" checked={picked.includes(m.id)} onChange={e => setPicked(e.target.checked ? [...picked, m.id] : picked.filter(x => x !== m.id))} />
              <span className="min-w-0">
                <span className="text-sm font-medium block">{m.name} <span className="chip chip-outline !py-0 !text-[10px] ml-1">{KIND_LABEL[m.kind]}</span></span>
                <span className="text-xs text-muted-foreground">{m.vnName} · {passRuleText(m)}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-border flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{changes} thay đổi</span>
          <button className="btn-secondary ml-auto" onClick={onClose}>Hủy</button>
          <button className="btn-primary" disabled={changes === 0} onClick={() => { onApply(picked); onClose(); }}>Lưu</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ settings */

function SetSettings({ set, agentId }: { set: TestSet; agentId: string }) {
  const agentMetrics = evaluationStore.agentMetrics(agentId);
  const attachedIds = set.metrics.map(m => m.metricId);
  const addable = [
    ...agentMetrics.filter(m => !attachedIds.includes(m.id)),
    ...TEMPLATE_METRICS.filter(t => !agentMetrics.some(m => m.templateId === t.id)),
  ];
  const tools = Array.from(new Set([...Object.keys(set.toolModes), ...agentTools(agentId)]));
  const update = (patch: Partial<TestSet>) => evaluationStore.updateSet(set.id, patch);

  return (
    <div className="space-y-5">
      <section className="surface-card p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-display text-sm font-semibold">Chỉ số chấm</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Bắt buộc: Tính vào Pass rate và có thể chặn publish. Theo dõi: Chỉ cảnh báo, không làm test fail.</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="btn-secondary !h-8"><HugeiconsIcon icon={Add01Icon} size={14} /> Thêm chỉ số</button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-80 overflow-y-auto">
              {addable.map(m => (
                <DropdownMenuItem key={m.id} className="items-start py-2" onClick={() => {
                  const metric = m.agentId === "template" ? evaluationStore.addFromTemplate(agentId, m.id) : m;
                  update({ metrics: [...set.metrics, { metricId: metric.id, required: false }] });
                }}>
                  <div>
                    <div className="font-medium">{m.name} <span className="text-xs text-muted-foreground font-normal">· {METRIC_GROUP_LABEL[m.group]}</span></div>
                    <div className="text-xs text-muted-foreground">{m.vnName}{m.agentId === "template" ? " · Từ thư viện" : ""}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="divide-y divide-border border border-border rounded-lg">
          {set.metrics.map(sm => {
            const m = evaluationStore.metric(sm.metricId);
            if (!m) return null;
            return (
              <div key={sm.metricId} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{m.name} <span className="text-xs text-muted-foreground font-normal">· {m.vnName}</span></div>
                  <div className="text-xs text-muted-foreground">{METRIC_GROUP_LABEL[m.group]} · {passRuleText(m)}</div>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5" role="radiogroup" aria-label={`Loại chỉ số ${m.name}`}>
                  {[true, false].map(r => (
                    <button key={String(r)} role="radio" aria-checked={sm.required === r} onClick={() => update({ metrics: set.metrics.map(x => (x.metricId === sm.metricId ? { ...x, required: r } : x)) })}
                      className={`px-2.5 h-7 rounded-md text-xs font-medium transition-base cursor-pointer ${sm.required === r ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {r ? "Bắt buộc" : "Theo dõi"}
                    </button>
                  ))}
                </div>
                <button className="btn-ghost !px-2" aria-label={`Bỏ chỉ số ${m.name}`} onClick={() => update({ metrics: set.metrics.filter(x => x.metricId !== sm.metricId) })}>
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                </button>
              </div>
            );
          })}
          {set.metrics.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">Chưa gắn chỉ số nào - Lượt chạy sẽ không có kết quả chấm</div>}
        </div>
      </section>

      <section className="surface-card p-5">
        <h3 className="font-display text-sm font-semibold">Số lần chạy mỗi test</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Chạy nhiều lần cùng một câu hỏi để biết Agent trả lời có ổn định không. Test chỉ Pass khi đạt ở mọi lần chạy.</p>
        <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5 w-fit" role="radiogroup" aria-label="Số lần chạy">
          {[1, 3, 5].map(n => (
            <button key={n} role="radio" aria-checked={set.runsPerCase === n} onClick={() => update({ runsPerCase: n })}
              className={`px-4 h-8 rounded-md text-sm font-medium transition-base cursor-pointer ${set.runsPerCase === n ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{n} lần</button>
          ))}
        </div>
      </section>

      <section className="surface-card p-5">
        <h3 className="font-display text-sm font-semibold">Tool simulation</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Simulated: Trả về kết quả giả, không gọi hệ thống thật - Dùng cho tool có thao tác ghi như gửi mail, tạo phiếu, hủy đơn. Live: Gọi thật.</p>
        {tools.length === 0 ? <div className="text-sm text-muted-foreground">Agent chưa dùng Skill hay Connector nào.</div> : (
          <div className="divide-y divide-border border border-border rounded-lg">
            {tools.map(t => {
              const mode = set.toolModes[t] ?? "live";
              return (
                <div key={t} className="flex items-center gap-3 px-3 py-2.5">
                  <code className="text-xs flex-1">{t}</code>
                  {mode === "live" && WRITE_CONNECTORS.includes(t) && <span className="text-xs text-warning">Có thao tác ghi</span>}
                  <div className="flex items-center gap-1 rounded-lg bg-surface-muted p-0.5" role="radiogroup" aria-label={`Chế độ ${t}`}>
                    {(["live", "simulated"] as const).map(mo => (
                      <button key={mo} role="radio" aria-checked={mode === mo} onClick={() => update({ toolModes: { ...set.toolModes, [t]: mo } })}
                        className={`px-2.5 h-7 rounded-md text-xs font-medium transition-base cursor-pointer ${mode === mo ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {mo === "live" ? "Live" : "Simulated"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="surface-card p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-sm font-semibold">Dùng bộ test này để duyệt publish</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Cấu hình Min. pass và chặn publish trong mục Publish.</p>
        </div>
        <PublishGateInline setId={set.id} />
      </section>
    </div>
  );
}

function PublishGateInline({ setId }: { setId: string }) {
  const g = evaluationStore.gate(setId);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{g.enabled ? `Min. pass ${g.minPass}%${g.blocks ? " · Chặn publish" : ""}` : "Đang tắt"}</span>
      <Switch checked={g.enabled} onCheckedChange={v => evaluationStore.saveGate({ ...g, enabled: v })} aria-label="Dùng để duyệt publish" />
    </div>
  );
}

