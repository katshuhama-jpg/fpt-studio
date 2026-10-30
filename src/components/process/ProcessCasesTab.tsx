import { useMemo, useState } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";

/**
 * Hồ sơ của Nhân sự số Quy trình (Insights > History).
 * Mỗi lần chạy là một hồ sơ: mở bằng slash command ở Workspace, chạy qua các node,
 * đóng ở End (Completed / Rejected / Cancelled / Failed). Builder xem trạng thái, đang chờ ai,
 * nhật ký từng bước, và chạy lại từ bước lỗi khi hồ sơ dừng vì lỗi kỹ thuật.
 */
type CaseStatus = "running" | "waiting" | "completed" | "rejected" | "cancelled" | "failed";
interface CaseStep { at: string; node: string; type: string; result: string; ok?: boolean }
interface ProcessCase {
  code: string; initiator: string; status: CaseStatus; step: string; waitingFor?: string;
  started: string; updated: string; version: string; steps: CaseStep[]; error?: string;
}

const STATUS: Record<CaseStatus, { label: string; cls: string }> = {
  running: { label: "Đang chạy", cls: "bg-primary-soft text-primary" },
  waiting: { label: "Đang chờ người", cls: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-700" },
  cancelled: { label: "Cancelled", cls: "bg-surface-muted text-muted-foreground" },
  failed: { label: "Failed", cls: "bg-rose-50 text-rose-700" },
};
const FILTERS: { id: "all" | CaseStatus; label: string }[] = [
  { id: "all", label: "Tất cả" }, { id: "waiting", label: "Đang chờ người" }, { id: "running", label: "Đang chạy" },
  { id: "completed", label: "Completed" }, { id: "rejected", label: "Rejected" }, { id: "cancelled", label: "Cancelled" }, { id: "failed", label: "Failed" },
];

const START = (code: string, who: string, at: string): CaseStep => ({ at, node: "create_purchase_request", type: "Start", result: `${who} gõ /Đề nghị mua sắm, bấm Nộp - hồ sơ ${code} được tạo`, ok: true });
const PR_CASES: ProcessCase[] = [
  { code: "PR-0142", initiator: "Phạm Minh Khoa", status: "waiting", step: "Duyệt cấp 2", waitingFor: "Trần Thị Mai, Lê Quốc Hùng (All)", started: "28/10 09:12", updated: "29/10 15:40", version: "v1.2.0",
    steps: [START("PR-0142", "Phạm Minh Khoa", "28/10 09:12"),
      { at: "28/10 09:12", node: "check_budget", type: "Connector", result: "Ngân sách còn 120.000.000 đ", ok: true },
      { at: "28/10 09:13", node: "collect_quotes", type: "Agent", result: "Trợ lý So sánh báo giá (v3.1.0) nộp 3 báo giá, đề xuất Công ty Phong Vũ", ok: true },
      { at: "28/10 09:13", node: "approver_rule", type: "DMN Table", result: "Khớp dòng 1: needs_level2 = true", ok: true },
      { at: "29/10 10:02", node: "manager_approval", type: "Human Review", result: "Nguyễn Văn Bình chọn Approve", ok: true },
      { at: "29/10 10:02", node: "level2_approval", type: "Human Review", result: "Đang chờ Trần Thị Mai, Lê Quốc Hùng - hạn 31/10 10:02" }] },
  { code: "PR-0141", initiator: "Đỗ Thu Hà", status: "completed", step: "Hoàn tất", started: "21/10 14:05", updated: "27/10 16:20", version: "v1.1.0",
    steps: [START("PR-0141", "Đỗ Thu Hà", "21/10 14:05"),
      { at: "21/10 14:06", node: "collect_quotes", type: "Agent", result: "Trợ lý So sánh báo giá (v3.0.2) nộp 3 báo giá", ok: true },
      { at: "22/10 08:30", node: "manager_approval", type: "Human Review", result: "Nguyễn Văn Bình chọn Approve", ok: true },
      { at: "22/10 09:00", node: "send_po", type: "Connector", result: "Vũ Thanh Tâm xác nhận, PO-2026-0377 đã gửi NCC", ok: true },
      { at: "27/10 16:10", node: "three_way_match", type: "Code", result: "Khớp PO, phiếu nhập kho, hoá đơn", ok: true },
      { at: "27/10 16:20", node: "completed", type: "End", result: "Completed - Initiator nhận thông báo", ok: true }] },
  { code: "PR-0140", initiator: "Phạm Minh Khoa", status: "failed", step: "Lưu PO lên SharePoint", started: "20/10 10:40", updated: "20/10 11:02", version: "v1.1.0",
    error: "SharePoint không phản hồi sau 3 lần thử. Hồ sơ dừng ở bước này.",
    steps: [START("PR-0140", "Phạm Minh Khoa", "20/10 10:40"),
      { at: "20/10 11:01", node: "render_po", type: "Code", result: "Tạo PO-2026-0372.docx", ok: true },
      { at: "20/10 11:02", node: "save_po", type: "Connector", result: "Lỗi kết nối SharePoint sau 3 lần thử", ok: false }] },
  { code: "PR-0139", initiator: "Ngô Bảo Ngọc", status: "rejected", step: "Từ chối", started: "18/10 08:15", updated: "18/10 17:30", version: "v1.1.0",
    steps: [START("PR-0139", "Ngô Bảo Ngọc", "18/10 08:15"),
      { at: "18/10 17:30", node: "manager_approval", type: "Human Review", result: "Nguyễn Văn Bình chọn Reject: chưa cần mua trong quý này", ok: true },
      { at: "18/10 17:30", node: "rejected", type: "End", result: "Rejected - Initiator nhận thông báo", ok: true }] },
  { code: "PR-0138", initiator: "Hoàng Anh Tuấn", status: "cancelled", step: "Đã huỷ", started: "15/10 13:20", updated: "16/10 09:05", version: "v1.0.0",
    steps: [START("PR-0138", "Hoàng Anh Tuấn", "15/10 13:20"),
      { at: "16/10 09:05", node: "send_po", type: "Connector", result: "Vũ Thanh Tâm chọn Cancel, không gửi PO", ok: true },
      { at: "16/10 09:05", node: "cancelled", type: "End", result: "Cancelled - Ban Mua sắm huỷ gửi PO", ok: true }] },
];

export default function ProcessCasesTab({ agentId, readOnly }: { agentId: string; readOnly?: boolean }) {
  const [filter, setFilter] = useState<"all" | CaseStatus>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ProcessCase | null>(null);
  const [cases, setCases] = useState<ProcessCase[]>(() => (agentId === "qt-procure" ? PR_CASES : []));
  const rows = useMemo(() => cases.filter(c => (filter === "all" || c.status === filter)
    && (!q.trim() || (c.code + " " + c.initiator).toLowerCase().includes(q.trim().toLowerCase()))), [cases, filter, q]);
  const count = (id: "all" | CaseStatus) => id === "all" ? cases.length : cases.filter(c => c.status === id).length;

  const rerun = (c: ProcessCase) => {
    const step: CaseStep = { at: "Vừa xong", node: c.steps[c.steps.length - 1].node, type: c.steps[c.steps.length - 1].type, result: "Chạy lại từ bước lỗi: thành công", ok: true };
    const next: ProcessCase = { ...c, status: "running", error: undefined, updated: "Vừa xong", steps: [...c.steps, step] };
    setCases(list => list.map(x => (x.code === c.code ? next : x)));
    setOpen(next);
    toast.success(`Hồ sơ ${c.code} chạy lại từ bước "${c.step}".`);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold">Hồ sơ</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Mỗi lần chạy Quy trình là một hồ sơ. Người dùng mở hồ sơ bằng lệnh / ở Workspace.</p>
      </div>
      <div className="flex items-center gap-1 flex-wrap mb-3">
        {FILTERS.map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={`h-8 px-3 rounded-lg text-sm font-medium transition-base ${filter === f.id ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"}`}>
            {f.label} <span className="text-xs opacity-70">{count(f.id)}</span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input value={q} onChange={e => setQ(e.target.value.slice(0, 100))} placeholder="Tìm mã hồ sơ, người khởi tạo" aria-label="Tìm hồ sơ"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base" />
          {q && <button type="button" aria-label="Xoá tìm kiếm" onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={14} /></button>}
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <div className="text-sm font-semibold">Chưa có hồ sơ nào</div>
          <p className="text-sm text-muted-foreground mt-1">Publish Quy trình, rồi người dùng trong phạm vi publish gõ / ở Workspace để mở hồ sơ đầu tiên.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">Không có hồ sơ nào khớp với bộ lọc</div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs text-muted-foreground">
              <tr>{["Mã hồ sơ", "Initiator", "Trạng thái", "Bước hiện tại", "Bắt đầu", "Cập nhật", "Phiên bản"].map(h => <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.code} onClick={() => setOpen(c)} className="border-t border-border hover:bg-surface-muted/60 cursor-pointer">
                  <td className="px-3 py-2.5 font-medium">{c.code}</td>
                  <td className="px-3 py-2.5">{c.initiator}</td>
                  <td className="px-3 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span></td>
                  <td className="px-3 py-2.5">{c.step}{c.waitingFor && <div className="text-xs text-muted-foreground">Chờ {c.waitingFor}</div>}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{c.started}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{c.updated}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!open} onOpenChange={v => !v && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
          {open && <>
            <SheetHeader>
              <SheetTitle>Hồ sơ {open.code}</SheetTitle>
              <SheetDescription>{open.initiator} khởi tạo lúc {open.started} · chạy trên {open.version}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${STATUS[open.status].cls}`}>{STATUS[open.status].label}</span>
              <span className="text-sm text-muted-foreground">{open.step}{open.waitingFor ? ` - chờ ${open.waitingFor}` : ""}</span>
            </div>
            {open.error && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {open.error}
                {!readOnly && <button type="button" onClick={() => rerun(open)} className="btn-primary mt-2 h-8 text-xs"><RotateCcw size={13} /> Chạy lại từ bước lỗi</button>}
              </div>
            )}
            <div className="mt-5 text-xs font-semibold text-muted-foreground tracking-wide">NHẬT KÝ HỒ SƠ</div>
            <ol className="mt-2 space-y-3">
              {open.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${s.ok === false ? "bg-rose-500" : s.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <div className="min-w-0">
                    <div className="text-sm"><span className="font-medium">{s.type}</span> <code className="text-xs text-muted-foreground">{s.node}</code></div>
                    <div className="text-sm text-muted-foreground">{s.result}</div>
                    <div className="text-xs text-muted-foreground/80 mt-0.5">{s.at}</div>
                  </div>
                </li>
              ))}
            </ol>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
