import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon, AiMagicIcon, ArrowLeft01Icon, Delete02Icon, MoreHorizontalIcon, Copy01Icon, Download04Icon, Edit02Icon, FlaskConicalIcon, PlayIcon,
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
  evaluationStore, useEvaluationStore, generateCases, generateMultiturnCases, caseType,
  TEST_TYPES, TEST_TYPE_LABEL, type TestType, type Turn, splitCounts, runStats, CASE_GROUPS, DEFAULT_DISTRIBUTION,
  APPROVAL_LABEL, type ApprovalMode, type CaseGroup, type CaseSource, type TestCase, type TestSet, type ToolMode,
} from "./evaluationStore";
import { EmptyState, ThresholdBar, useEvalNav, fmtDateTime } from "./shared";
import { RunDialog } from "./RunDialog";

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
  "Ngoài phạm vi": "Nhân sự số phải từ chối đúng cách", "Edge case": "Câu hỏi mơ hồ, thiếu thông tin",
};
const WRITE_CONNECTORS = ["gmail", "outlook", "slack", "teams", "jira", "gcalendar", "salesforce", "hubspot", "zoom", "gdrive"];

function agentSources(agentId: string) {
  const kb = knowledgeStore.list(agentId).length + knowledgeStore.listAttachedConsoleKbIds(agentId).length;
  const gr = agentGuardrailStore.list(agentId).length + agentGuardrailStore.listAttachedConsoleGuardrailIds(agentId).length;
  const sk = agentSkillStore.list(agentId).length;
  const cn = agentConnectorStore.list(agentId).length;
  return [
    { id: "Instructions" as CaseSource, count: 1, unit: "Hướng dẫn Nhân sự số" },
    { id: "Knowledge" as CaseSource, count: kb, unit: "nguồn" },
    { id: "Guardrails" as CaseSource, count: gr, unit: "guardrail" },
    { id: "Skills" as CaseSource, count: sk, unit: "skill" },
    { id: "Nhân sự số con" as CaseSource, count: 0, unit: "Nhân sự số con" },
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
          <div><div className="font-medium">Tạo bằng AI</div><div className="text-xs text-muted-foreground">Sinh test case từ cấu hình của Nhân sự số</div></div>
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
          <p className="text-sm text-muted-foreground mt-1">Mỗi bộ test là một nghiệp vụ. Chạy lại sau mỗi lần sửa Nhân sự số để biết Nhân sự số tốt lên hay kém đi.</p>
        </div>
        {sets.length > 0 && createMenu}
      </div>

      {sets.length === 0 ? (
        <EmptyState icon={FlaskConicalIcon} title="Chưa có bộ test nào"
          desc={`Tạo bộ test đầu tiên để kiểm tra ${agentName} trả lời đúng, đủ và an toàn trước khi publish. AI có thể sinh test case từ Instructions, Knowledge, Guardrails, Skills và Connectors của Nhân sự số.`}>
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
                return (
                  <tr key={s.id} data-viewonly-allow className="border-t border-border hover:bg-surface-muted/50 cursor-pointer transition-base" onClick={() => go("test-sets", s.id)}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]">{s.description || "Chưa có mô tả"}</div>
                    </td>
                    <td className="px-4 py-3">{evaluationStore.cases(s.id).length}</td>
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
                        <button data-viewonly-allow className="btn-secondary !h-8 !px-3 text-xs" onClick={() => setRunSet(s.id)} disabled={evaluationStore.cases(s.id).length === 0}>
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

function defaultToolModes(agentId: string): Record<string, ToolMode> {
  const out: Record<string, ToolMode> = {};
  agentTools(agentId).forEach(t => { out[t] = WRITE_CONNECTORS.includes(t) ? "simulated" : "live"; });
  return out;
}

const TYPE_CHIP: Record<TestType, string> = { qna: "chip-muted", multiturn: "chip-info" };
export function TypeChip({ type }: { type: TestType }) {
  return <span className={`chip ${TYPE_CHIP[type]} !py-0 !text-[10px] align-middle`}>{TEST_TYPE_LABEL[type].short}</span>;
}

/* ------------------------------------------------------------------ generate with AI */

function GenerateSetDialog({ agentId, agentName, open, onOpenChange, onCreated }: { agentId: string; agentName: string; open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const sources = useMemo(() => (open ? agentSources(agentId) : []), [open, agentId]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [picked, setPicked] = useState<CaseSource[]>([]);
  const [counts, setCounts] = useState<Record<CaseGroup, number>>(() => splitCounts(50));
  const [lang, setLang] = useState("Tiếng Việt");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [types, setTypes] = useState<TestType[]>(["qna"]);
  const [mtCount, setMtCount] = useState(5);
  const qnaTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const total = (types.includes("qna") ? qnaTotal : 0) + (types.includes("multiturn") ? mtCount : 0);
  const toggleType = (t: TestType) => setTypes(v => (v.includes(t) ? v.filter(x => x !== t) : [...v, t]));

  const reset = () => { setName(""); setDesc(""); setPicked(sources.filter(s => s.count > 0).map(s => s.id)); setCounts(splitCounts(50)); setBusy(false); setTouched(false); setAdvanced(false); setTypes(["qna"]); setMtCount(5); };
  // Pre-tick every source the Agent actually has configured.
  useEffect(() => { if (open) reset(); }, [open, sources]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    setTouched(true);
    if (!name.trim() || picked.length === 0 || total === 0 || types.length === 0) return;
    setBusy(true);
    setTimeout(() => {
      const set = evaluationStore.createSet(agentId, { name: name.trim(), description: desc.trim(), metrics: [], runsPerCase: 1, toolModes: defaultToolModes(agentId) });
      evaluationStore.addCases(set.id, [
        ...(types.includes("qna") ? generateCases({ agentName, total: qnaTotal, sources: picked, distribution: DEFAULT_DISTRIBUTION, counts, topic: name }) : []),
        ...(types.includes("multiturn") ? generateMultiturnCases({ topic: name, count: mtCount }) : []),
      ]);
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
              <legend className="text-sm font-medium mb-1.5">Loại test</legend>
              <div className="space-y-2">
                {TEST_TYPES.map(tp => {
                  const on = types.includes(tp);
                  return (
                    <div key={tp} className={`rounded-lg border px-3 py-2.5 transition-base ${on ? "border-primary bg-primary-soft" : "border-border"}`}>
                      <div className="flex items-center gap-3">
                        <label className={`flex items-start gap-2 flex-1 min-w-0 cursor-pointer`}>
                          <input type="checkbox" className="mt-0.5 accent-[hsl(var(--primary))]" checked={on} onChange={() => toggleType(tp)} />
                          <span>
                            <span className="text-sm font-medium block">{TEST_TYPE_LABEL[tp].label}</span>
                            <span className="text-xs text-muted-foreground">{TEST_TYPE_LABEL[tp].desc}</span>
                          </span>
                        </label>
                        {on && tp === "qna" && <span className="text-sm font-semibold shrink-0">{qnaTotal} test</span>}
                        {on && tp === "multiturn" && <Stepper value={mtCount} min={1} max={50} onChange={setMtCount} label="số test nhiều lượt" />}
                      </div>
                    </div>
                  );
                })}
              </div>
              {touched && types.length === 0 && <span className="text-xs text-destructive mt-1 block">Chọn ít nhất 1 loại test</span>}
            </fieldset>
            {types.includes("qna") && <fieldset>
              <legend className="text-sm font-medium mb-1.5">Số câu hỏi đáp</legend>
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
                      <button type="button" className="font-semibold text-primary hover:underline cursor-pointer" onClick={() => setCounts(splitCounts(total || 50))}>Về mặc định</button>
                    </div>
                  </div>
                )}
              </div>
              {touched && total === 0 && <span className="text-xs text-destructive mt-1 block">Chọn ít nhất 1 test case</span>}
            </fieldset>}
            <label className="block">
              <span className="text-sm font-medium">Ngôn ngữ</span>
              <select className="ds-input mt-1.5 w-full block" value={lang} onChange={e => setLang(e.target.value)}>
                <option>Tiếng Việt</option><option>English</option><option>Tiếng Việt + English</option>
              </select>
            </label>
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
    const set = evaluationStore.createSet(agentId, { name: name.trim(), description: desc.trim(), metrics: [], runsPerCase: 1, toolModes: defaultToolModes(agentId) });
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
  const [typeFilter, setTypeFilter] = useState<TestType | "all">("all");
  const [genMore, setGenMore] = useState(false);
  const [onlyDraft, setOnlyDraft] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [runIds, setRunIds] = useState<string[] | undefined>(undefined);
  const [bulkDelete, setBulkDelete] = useState(false);
  const cases = evaluationStore.cases(set.id);
  const unreviewed = evaluationStore.unreviewed(set.id);
  const shown = cases.filter(c => (group === "all" || c.group === group) && (typeFilter === "all" || caseType(c) === typeFilter)
    && (!q || `${c.name ?? ""} ${c.question}`.toLowerCase().includes(q.toLowerCase())) && (!onlyDraft || c.reviewed === false));
  const typesInSet = TEST_TYPES.filter(tp => cases.some(c => caseType(c) === tp));
  const run = evaluationStore.latestRun(set.id);

  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <button data-viewonly-allow onClick={onBack} className="btn-ghost -ml-2"><HugeiconsIcon icon={ArrowLeft01Icon} size={14} /> Bộ test</button>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{set.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{set.description || "Chưa có mô tả"} · {cases.length} test case · Chạy {set.runsPerCase} lần mỗi test</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {run && <button data-viewonly-allow className="btn-secondary" onClick={() => go("runs", run.id)}>Xem lượt chạy #{run.number}</button>}
          <button data-viewonly-allow className="btn-primary" onClick={() => { setRunIds(undefined); setRunOpen(true); }} disabled={cases.length === 0}><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy tất cả</button>
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
          <button data-viewonly-allow key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
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
            {typesInSet.length > 1 && (
              <select className="ds-input !h-8 !w-auto !py-0 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value as TestType | "all")} aria-label="Lọc theo loại test">
                <option value="all">Mọi loại test ({cases.length})</option>
                {typesInSet.map(tp => <option key={tp} value={tp}>{TEST_TYPE_LABEL[tp].label} ({cases.filter(c => caseType(c) === tp).length})</option>)}
              </select>
            )}
            <div className="flex gap-1 flex-wrap">
              {(["all", ...CASE_GROUPS] as const).map(g => (
                <button data-viewonly-allow key={g} onClick={() => setGroup(g)} className={`chip cursor-pointer ${group === g ? "chip-primary" : "chip-outline hover:bg-surface-muted"}`}>
                  {g === "all" ? "Tất cả" : g} <span className="opacity-70">{g === "all" ? cases.length : cases.filter(c => c.group === g).length}</span>
                </button>
              ))}
              {unreviewed.length > 0 && (
                <button data-viewonly-allow onClick={() => setOnlyDraft(v => !v)} aria-pressed={onlyDraft} className={`chip cursor-pointer ${onlyDraft ? "chip-warning" : "chip-outline hover:bg-surface-muted"}`}>
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
              <button data-viewonly-allow className="btn-ghost !h-7 text-xs" onClick={() => setSelected([])}>Bỏ chọn</button>
              <div className="ml-auto flex gap-2">
                <button className="btn-secondary !h-8 text-destructive" onClick={() => setBulkDelete(true)}><HugeiconsIcon icon={Delete02Icon} size={14} /> Xóa</button>
                <button data-viewonly-allow className="btn-primary !h-8" onClick={() => { setRunIds(selected); setRunOpen(true); }}><HugeiconsIcon icon={PlayIcon} size={14} /> Chạy {selected.length} test đã chọn</button>
              </div>
            </div>
          )}
          {cases.length === 0 ? (
            <div className="p-10 text-center">
              <div className="font-medium">Bộ test chưa có test case</div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Thêm câu hỏi người dùng hay hỏi và đáp án mẫu để chấm Nhân sự số.</p>
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
                  <th className="text-left font-medium px-4 py-2.5 whitespace-nowrap">Số lần chạy</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map(c => (
                  <tr key={c.id} onClick={() => setEditing(c)} className={`border-t border-border hover:bg-surface-muted/50 transition-base cursor-pointer ${selected.includes(c.id) ? "bg-primary-soft/40" : ""}`}>
                    <td data-viewonly-allow className="pl-4 pr-1 py-3 align-top" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Chọn test ${c.name || c.question}`} className="accent-[hsl(var(--primary))] cursor-pointer mt-1" checked={selected.includes(c.id)}
                        onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(x => x !== c.id))} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      {(c.name || caseType(c) !== "qna") && <div className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center gap-1.5">{caseType(c) !== "qna" && <TypeChip type={caseType(c)} />}{c.name}</div>}
                      <div className="leading-snug">{c.question}{c.reviewed === false && <span className="chip chip-warning !py-0 !text-[10px] ml-1.5 align-middle">Chưa duyệt</span>}</div>
                      {c.expectedTool && <code className="text-[11px] text-muted-foreground">Tool mong đợi: {c.expectedTool}</code>}
                      {!!c.turns?.length && <div className="text-[11px] text-muted-foreground">+ {c.turns.length} lượt tiếp theo: "{c.turns[0].user}"{c.turns.length > 1 ? "…" : ""}</div>}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground"><div className="line-clamp-2">{c.reference || <span className="italic">Chưa có</span>}</div></td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">{c.group}</td>
                    <td className="px-4 py-3 align-top"><span className="chip chip-muted !py-0.5">{c.source}</span></td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                      {c.runsPerCase ?? set.runsPerCase} lần{c.runsPerCase !== undefined && <span className="chip chip-primary !py-0 !text-[10px] ml-1.5">Riêng</span>}
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
  const [type, setType] = useState<TestType>("qna");
  const [busy, setBusy] = useState(false);
  const go = () => {
    setBusy(true);
    setTimeout(() => {
      const sources = agentSources(agentId).filter(s => s.count > 0).map(s => s.id);
      evaluationStore.addCases(set.id, type === "qna"
        ? generateCases({ agentName, total: n, sources, distribution: DEFAULT_DISTRIBUTION, topic: set.name })
        : generateMultiturnCases({ topic: set.name, count: n }));
      setBusy(false); onOpenChange(false); toast.success(`Đã thêm ${n} test case`);
    }, 1200);
  };
  return (
    <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Sinh thêm test case bằng AI</DialogTitle><DialogDescription>AI tránh sinh trùng câu hỏi đã có trong bộ test.</DialogDescription></DialogHeader>
        <label className="block"><span className="text-sm font-medium">Loại test</span>
          <select className="ds-input mt-1.5 w-full" value={type} onChange={e => setType(e.target.value as TestType)}>
            {TEST_TYPES.map(tp => <option key={tp} value={tp}>{TEST_TYPE_LABEL[tp].label}</option>)}
          </select>
          <span className="text-xs text-muted-foreground mt-1 block">{TEST_TYPE_LABEL[type].desc}</span></label>
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
  { label: "Ngoài phạm vi", group: "Ngoài phạm vi", name: "Hỏi ngoài phạm vi", scenario: "Khách hàng hỏi chuyện không liên quan đến nghiệp vụ Nhân sự số hỗ trợ.", q: "Hôm nay thời tiết thế nào?", ref: "Từ chối lịch sự và đưa người dùng về đúng phạm vi hỗ trợ." },
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
  const [runs, setRuns] = useState(set.runsPerCase);
  const [approval, setApproval] = useState<ApprovalMode>("auto");
  const [toolModes, setToolModes] = useState<Record<string, ToolMode>>({});
  const [type, setType] = useState<TestType>("qna");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setPreset(null); setName(init?.name ?? ""); setScenario(init?.scenario ?? ""); setQuestion(init?.question ?? ""); setReference(init?.reference ?? "");
    setTool(init?.expectedTool ?? ""); setGroup(init?.group ?? "Trích xuất đơn");
    setRuns(init?.runsPerCase ?? set.runsPerCase); setApproval(init?.approval ?? "auto"); setToolModes(init?.toolModes ?? {}); setTouched(false);
    setType(init ? caseType(init) : "qna"); setTurns(init?.turns ?? []);
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const tools = Array.from(new Set([...Object.keys(set.toolModes), ...agentTools(agentId)]));
  const simulatedCount = tools.filter(t => (toolModes[t] ?? set.toolModes[t] ?? "live") === "simulated").length;

  const applyPreset = (p: typeof PRESETS[number]) => {
    setPreset(p.label); setName(p.name); setScenario(p.scenario); setGroup(p.group);
    if (p.q) setQuestion(p.q);
    if (p.ref) setReference(p.ref);
  };

  const cleanTurns = turns.filter(t => t.user.trim()).map(t => ({ user: t.user.trim(), expect: t.expect?.trim() || undefined }));
  const turnsMissing = type === "multiturn" && cleanTurns.length === 0;

  const save = () => {
    setTouched(true);
    if (!question.trim() || turnsMissing) return;
    const overridesTools = Object.keys(toolModes).length ? toolModes : undefined;
    const data = {
      name: name.trim() || undefined, scenario: scenario.trim() || undefined, question: question.trim(), reference: reference.trim() || undefined,
      expectedTool: type === "qna" ? tool.trim() || undefined : undefined, group, reviewed: true, metrics: undefined,
      runsPerCase: runs !== set.runsPerCase ? runs : undefined, approval: approval !== "auto" ? approval : undefined, toolModes: overridesTools,
      type: type === "qna" ? undefined : type,
      turns: type === "multiturn" && cleanTurns.length ? cleanTurns : undefined,
    };
    if (init) evaluationStore.updateCase(init.id, data);
    else evaluationStore.addCases(set.id, [{ ...data, source: "Thủ công" }]);
    toast.success(init ? "Đã lưu test" : "Đã thêm test");
    onClose();
  };


  return (
    <>
      <Sheet open={!!editing} onOpenChange={o => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" onOpenAutoFocus={e => e.preventDefault()}>
          <SheetHeader className="px-6 py-4 border-b border-border text-left">
            <SheetTitle>{isNew ? "Thêm test" : "Sửa test"}</SheetTitle>
            <SheetDescription>Bộ test {set.name}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <fieldset>
              <legend className="text-sm font-medium mb-1.5">Loại test</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Loại test">
                {TEST_TYPES.map(tp => (
                  <button key={tp} type="button" role="radio" aria-checked={type === tp} onClick={() => setType(tp)}
                    className={`rounded-lg border px-3 py-2 text-left transition-base cursor-pointer ${type === tp ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted"}`}>
                    <div className="text-sm font-semibold">{TEST_TYPE_LABEL[tp].short}</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">{tp === "qna" ? "1 câu hỏi, 1 câu trả lời" : "Hỏi tiếp, đổi ý, sửa thông tin"}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            {isNew && type === "qna" && <div>
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
              <p className="text-xs text-muted-foreground mt-0.5">Câu này được gửi nguyên văn cho Nhân sự số để bắt đầu hội thoại.</p>
              <textarea className="ds-textarea mt-1.5" rows={2} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Viết đúng như người dùng sẽ hỏi" aria-invalid={touched && !question.trim()} />
              {touched && !question.trim() && <span className="text-xs text-destructive mt-1 block">Nhập câu hỏi mở đầu</span>}
            </label>

            {type === "multiturn" && (
              <TurnsEditor turns={turns} onChange={setTurns} title="Các lượt tiếp theo" required error={touched && turnsMissing}
                hint="Người dùng nói lần lượt từng câu dưới đây. Ghi điều Nhân sự số phải làm ở mỗi lượt để chấm Knowledge Retention." />
            )}

            <label className="block">
              <span className="text-sm font-medium">{type === "multiturn" ? "Đáp án mẫu cho câu mở đầu" : "Đáp án mẫu"} {type === "qna" && <span className="text-xs text-muted-foreground font-normal">- Dùng khi chấm Correctness</span>}</span>
              <textarea className="ds-textarea mt-1.5" rows={3} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ghi đủ các ý bắt buộc Nhân sự số phải trả lời" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {type === "qna" && <label className="block">
                <span className="text-sm font-medium">Tool mong đợi <span className="text-xs text-muted-foreground font-normal">- Dùng khi chấm Tool Call</span></span>
                <input className="ds-input mt-1.5 font-mono text-xs" value={tool} onChange={e => setTool(e.target.value)} placeholder="book_technician(date, address)" />
              </label>}
              <label className="block">
                <span className="text-sm font-medium">Nhóm câu hỏi</span>
                <select className="ds-input mt-1.5" value={group} onChange={e => setGroup(e.target.value as CaseGroup)}>{CASE_GROUPS.map(g => <option key={g}>{g}</option>)}</select>
              </label>
            </div>

            <section>
              <h3 className="text-sm font-medium">Khi test gặp bước duyệt</h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Cách xử lý khi Nhân sự số cần người duyệt (Human-in-the-loop) hoặc chuyển cho nhân viên trong lúc test.</p>
              <select className="ds-input" value={approval} onChange={e => setApproval(e.target.value as ApprovalMode)} aria-label="Khi test gặp bước duyệt">
                {(Object.keys(APPROVAL_LABEL) as ApprovalMode[]).map(a => <option key={a} value={a}>{APPROVAL_LABEL[a].label} - {APPROVAL_LABEL[a].desc}</option>)}
              </select>
            </section>

            <section>
              <h3 className="text-sm font-medium">Tool simulation <span className="text-xs text-muted-foreground font-normal">({simulatedCount} simulated)</span></h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Mặc định lấy theo cài đặt bộ test. Đổi ở đây nếu test này cần khác.</p>
              {tools.length === 0 ? <p className="text-sm text-muted-foreground">Nhân sự số chưa dùng Skill hay Connector nào.</p> : (
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

    </>
  );
}

function TurnsEditor({ turns, onChange, title, hint, required, error }: { turns: Turn[]; onChange: (t: Turn[]) => void; title: string; hint: string; required?: boolean; error?: boolean }) {
  const set = (i: number, patch: Partial<Turn>) => onChange(turns.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <section>
      <h3 className="text-sm font-medium">{title} {required && <span className="text-destructive">*</span>}</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2">{hint}</p>
      <div className="space-y-2">
        {turns.map((t, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Lượt {i + 2}</span>
              <button type="button" className="btn-ghost !px-1.5 !h-7 ml-auto" aria-label={`Xóa lượt ${i + 2}`} onClick={() => onChange(turns.filter((_, j) => j !== i))}><HugeiconsIcon icon={Delete02Icon} size={13} /></button>
            </div>
            <textarea className="ds-textarea" rows={2} value={t.user} onChange={e => set(i, { user: e.target.value })} placeholder="Người dùng nói, ví dụ: Thế còn thẻ ghi nợ thì sao?" aria-label={`Lượt ${i + 2} - Người dùng nói`} />
            <input className="ds-input !h-8 text-sm" value={t.expect ?? ""} onChange={e => set(i, { expect: e.target.value })} placeholder="Nhân sự số cần: ví dụ hiểu là hỏi phí đóng thẻ ghi nợ" aria-label={`Lượt ${i + 2} - Nhân sự số cần`} />
          </div>
        ))}
        <button type="button" className="btn-secondary !h-8 text-xs" onClick={() => onChange([...turns, { user: "", expect: "" }])}><HugeiconsIcon icon={Add01Icon} size={12} /> Thêm lượt</button>
      </div>
      {error && <span className="text-xs text-destructive mt-1 block">Thêm ít nhất 1 lượt tiếp theo</span>}
    </section>
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

/* ------------------------------------------------------------------ settings */

function SetSettings({ set, agentId }: { set: TestSet; agentId: string }) {
  const tools = Array.from(new Set([...Object.keys(set.toolModes), ...agentTools(agentId)]));
  const update = (patch: Partial<TestSet>) => evaluationStore.updateSet(set.id, patch);

  return (
    <div className="space-y-5">
      <section className="surface-card p-5">
        <h3 className="font-display text-sm font-semibold">Số lần chạy mỗi test</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Chạy nhiều lần cùng một câu hỏi để biết Nhân sự số trả lời có ổn định không. Test chỉ Pass khi đạt ở mọi lần chạy.</p>
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
        {tools.length === 0 ? <div className="text-sm text-muted-foreground">Nhân sự số chưa dùng Skill hay Connector nào.</div> : (
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

