import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { processStore } from "./processStore";

/**
 * Evaluate của Nhân sự số Quy trình. Khác Nhân sự số Năng suất (bộ câu hỏi - câu trả lời):
 * mỗi test case là một bộ dữ liệu vào ở Start + quyết định giả lập của người ở các bước
 * Human Review, và kỳ vọng hồ sơ kết thúc ở End nào, có đi qua bước nào. Chạy để biết
 * sửa luồng có làm hỏng các trường hợp đã chạy đúng hay không.
 */
type EndStatus = "Completed" | "Rejected" | "Cancelled" | "Failed";
type RunState = "pass" | "fail" | "none" | "running";
interface TestCase {
  id: string; name: string; inputs: string; decisions: string; expectEnd: EndStatus; expectStep: string;
  last: RunState; lastNote?: string; lastAt?: string; mockFail?: string;
}

const SEED: Record<string, TestCase[]> = {
  "qt-procure": [
    { id: "tc1", name: "Đơn dưới 50 triệu, duyệt một cấp", inputs: "total = 30000000 · priority = Thường", decisions: "Trưởng phòng duyệt: Approve · Xác nhận gửi PO: Confirm · Chờ phiếu nhập kho, Chờ hoá đơn NCC: Confirm", expectEnd: "Completed", expectStep: "Không qua Duyệt cấp 2", last: "pass", lastAt: "Hôm qua" },
    { id: "tc2", name: "Đơn trên 50 triệu cần duyệt cấp 2", inputs: "total = 85000000 · priority = Thường", decisions: "Trưởng phòng duyệt: Approve · Duyệt cấp 2: Approve · Xác nhận gửi PO: Confirm", expectEnd: "Completed", expectStep: "Qua Duyệt cấp 2", last: "pass", lastAt: "Hôm qua" },
    { id: "tc3", name: "Trưởng phòng từ chối", inputs: "total = 30000000 · priority = Khẩn", decisions: "Trưởng phòng duyệt: Reject", expectEnd: "Rejected", expectStep: "", last: "pass", lastAt: "Hôm qua" },
    { id: "tc4", name: "Ban Mua sắm không xác nhận gửi PO", inputs: "total = 30000000 · priority = Thường", decisions: "Trưởng phòng duyệt: Approve · Xác nhận gửi PO: Cancel", expectEnd: "Cancelled", expectStep: "", last: "pass", lastAt: "Hôm qua" },
    { id: "tc5", name: "Đơn đúng 50 triệu cần duyệt cấp 2", inputs: "total = 50000000 · priority = Thường", decisions: "Trưởng phòng duyệt: Approve · Duyệt cấp 2: Approve", expectEnd: "Completed", expectStep: "Qua Duyệt cấp 2", last: "fail", lastAt: "Hôm qua", lastNote: "Không qua Duyệt cấp 2: bảng Tuyến duyệt đang dùng total > 50000000 nên đơn đúng 50 triệu chỉ duyệt một cấp.", mockFail: "Không qua Duyệt cấp 2: bảng Tuyến duyệt đang dùng total > 50000000 nên đơn đúng 50 triệu chỉ duyệt một cấp." },
  ],
  "claim-rules-process": [
    { id: "tm1", name: "Hồ sơ hợp lệ, không có WARN", inputs: "so_hop_dong = MBL-0091234 · claim_type = IP", decisions: "", expectEnd: "Completed", expectStep: "Không qua Thẩm định viên xem lại", last: "pass", lastAt: "2 ngày trước" },
    { id: "tm2", name: "Không tìm thấy hợp đồng", inputs: "so_hop_dong = MBL-0000000", decisions: "", expectEnd: "Failed", expectStep: "", last: "none" },
  ],
};
const KEY = (id: string) => `process_tests_v1:${id}`;
const load = (id: string): TestCase[] => { try { const r = sessionStorage.getItem(KEY(id)); return r ? JSON.parse(r) : (SEED[id] ?? []); } catch { return SEED[id] ?? []; } };
const RUN: Record<RunState, { label: string; cls: string }> = {
  pass: { label: "Đạt", cls: "bg-emerald-50 text-emerald-700" },
  fail: { label: "Không đạt", cls: "bg-rose-50 text-rose-700" },
  none: { label: "Chưa chạy", cls: "bg-surface-muted text-muted-foreground" },
  running: { label: "Đang chạy...", cls: "bg-primary-soft text-primary" },
};

export default function ProcessEvalTab({ agentId, readOnly }: { agentId: string; readOnly?: boolean }) {
  const [cases, setCases] = useState<TestCase[]>(() => load(agentId));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", inputs: "", decisions: "", expectEnd: "Completed" as EndStatus, expectStep: "" });
  useEffect(() => { try { sessionStorage.setItem(KEY(agentId), JSON.stringify(cases)); } catch { /* ignore */ } }, [agentId, cases]);

  const g = processStore.getGraph(agentId);
  const startInputs: string[] = (g?.nodes.find((n: any) => n.type === "start")?.cfg?.inputs ?? []).map((f: any) => f.name).filter(Boolean);
  const humans: string[] = (g?.nodes ?? []).filter((n: any) => n.type === "human").map((n: any) => n.title);

  const run = (ids: string[]) => {
    setCases(cs => cs.map(c => (ids.includes(c.id) ? { ...c, last: "running" } : c)));
    setTimeout(() => {
      setCases(cs => cs.map(c => (ids.includes(c.id) ? { ...c, last: c.mockFail ? "fail" : "pass", lastNote: c.mockFail, lastAt: "Vừa xong" } : c)));
      const failed = cases.filter(c => ids.includes(c.id) && c.mockFail).length;
      toast[failed ? "error" : "success"](failed ? `${ids.length - failed}/${ids.length} test case đạt. Xem lý do ở dòng không đạt.` : `${ids.length}/${ids.length} test case đạt.`);
    }, 1200);
  };
  const create = () => {
    if (!form.name.trim()) return;
    const tc: TestCase = { id: "tc-" + Date.now(), ...form, name: form.name.trim(), last: "none" };
    setCases(cs => [...cs, tc]); setOpen(false); setForm({ name: "", inputs: "", decisions: "", expectEnd: "Completed", expectStep: "" });
    toast.success(`Đã thêm test case "${tc.name}".`);
  };
  const pass = cases.filter(c => c.last === "pass").length, ran = cases.filter(c => c.last === "pass" || c.last === "fail").length;

  return (
    <div className="max-w-[1080px] mx-auto px-8 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Test case</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Mỗi test case là một bộ dữ liệu vào và quyết định giả lập của người ở các bước duyệt. Chạy để kiểm tra hồ sơ kết thúc đúng chỗ và đi qua đúng bước, nhất là sau khi sửa luồng.</p>
        </div>
        {!readOnly && cases.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <button type="button" className="btn-secondary" onClick={() => run(cases.map(c => c.id))}>Chạy tất cả</button>
            <button type="button" className="btn-primary" onClick={() => setOpen(true)}>Tạo test case</button>
          </div>
        )}
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <div className="text-base font-semibold">Chưa có test case nào</div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">Thêm vài trường hợp hay gặp (đơn nhỏ, đơn lớn, bị từ chối) để mỗi lần sửa luồng chỉ cần bấm Chạy tất cả là biết còn chạy đúng không.</p>
          {!readOnly && <button type="button" className="btn-primary mt-5" onClick={() => setOpen(true)}>Tạo test case</button>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Test case</div><div className="mt-2 text-xl font-semibold font-display">{cases.length}</div></div>
            <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Đạt ở lần chạy gần nhất</div><div className="mt-2 text-xl font-semibold font-display">{ran ? `${pass}/${ran}` : "-"}</div></div>
            <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Chưa chạy</div><div className="mt-2 text-xl font-semibold font-display">{cases.filter(c => c.last === "none").length}</div></div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
                <tr><th className="text-left font-medium px-4 py-2.5">Test case</th><th className="text-left font-medium px-4 py-2.5">Kỳ vọng</th><th className="text-left font-medium px-4 py-2.5 w-[34%]">Lần chạy gần nhất</th><th className="w-20" /></tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      {c.inputs && <div className="text-xs text-muted-foreground mt-1">Dữ liệu vào: {c.inputs}</div>}
                      {c.decisions && <div className="text-xs text-muted-foreground mt-0.5">Người xử lý: {c.decisions}</div>}
                    </td>
                    <td className="px-4 py-3"><div>Kết thúc <b className="font-semibold">{c.expectEnd}</b></div>{c.expectStep && <div className="text-xs text-muted-foreground mt-0.5">{c.expectStep}</div>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${RUN[c.last].cls}`}>{RUN[c.last].label}</span>
                      {c.lastAt && c.last !== "running" && <span className="text-xs text-muted-foreground ml-2">{c.lastAt}</span>}
                      {c.last === "fail" && c.lastNote && <div className="text-xs text-rose-700 mt-1">{c.lastNote}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">{!readOnly && <button type="button" className="text-sm font-medium text-primary hover:underline disabled:opacity-40" disabled={c.last === "running"} onClick={() => run([c.id])}>Chạy</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Tạo test case</DialogTitle>
            <DialogDescription>Nhập dữ liệu vào như người dùng điền form, chọn người xử lý sẽ quyết định gì, rồi chọn hồ sơ phải kết thúc ở đâu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">Tên test case <span className="text-destructive">*</span>
              <input className="mt-1 w-full h-9 px-3 rounded-lg border border-border text-sm font-normal" maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Đơn trên 50 triệu cần duyệt cấp 2" />
            </label>
            <label className="block text-sm font-medium">Dữ liệu vào
              <input className="mt-1 w-full h-9 px-3 rounded-lg border border-border text-sm font-normal" value={form.inputs} onChange={e => setForm({ ...form, inputs: e.target.value })} placeholder={startInputs.length ? startInputs.map(n => `${n} = ...`).join(" · ") : "VD: total = 85000000 · priority = Thường"} />
            </label>
            <label className="block text-sm font-medium">Người xử lý quyết định gì
              <input className="mt-1 w-full h-9 px-3 rounded-lg border border-border text-sm font-normal" value={form.decisions} onChange={e => setForm({ ...form, decisions: e.target.value })} placeholder={humans.length ? `${humans[0]}: Approve` : "VD: Trưởng phòng duyệt: Approve"} />
              <span className="block text-xs text-muted-foreground mt-1 font-normal">Bước duyệt không ghi ở đây thì chọn kết quả đầu tiên (Approve, Confirm).</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Kết thúc mong đợi
                <select className="mt-1 w-full h-9 px-2 rounded-lg border border-border text-sm font-normal bg-surface" value={form.expectEnd} onChange={e => setForm({ ...form, expectEnd: e.target.value as EndStatus })}>
                  {(["Completed", "Rejected", "Cancelled", "Failed"] as EndStatus[]).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Phải qua bước (không bắt buộc)
                <input className="mt-1 w-full h-9 px-3 rounded-lg border border-border text-sm font-normal" value={form.expectStep} onChange={e => setForm({ ...form, expectStep: e.target.value })} placeholder="VD: Qua Duyệt cấp 2" />
              </label>
            </div>
          </div>
          <DialogFooter>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Huỷ</button>
            <button type="button" className="btn-primary disabled:opacity-40" disabled={!form.name.trim()} onClick={create}>Thêm test case</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
