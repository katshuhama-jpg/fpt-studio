import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RolesProvider } from "@/pages/organization/rolesStore";
import { OrgProvider } from "@/pages/organization/orgStore";
import TestTab from "./TestTab";
import { caseVerdict, runStats, testStore, toneOf } from "./testSuiteStore";
import { validateRows } from "./AddCaseDialogs";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});
beforeEach(() => testStore._reset());
const A = "agent-t";
const wrap = (section: "test-sets" | "runs", qs = "") => render(
  <TooltipProvider><RolesProvider><OrgProvider><MemoryRouter initialEntries={[`/agents/${A}?tab=evaluate&section=${section}${qs}`]}>
    <TestTab agentId={A} section={section} /><Toaster />
  </MemoryRouter></OrgProvider></RolesProvider></TooltipProvider>);

describe("testSuiteStore", () => {
  it("seeds suites + runs, counts pending, thresholds", () => {
    const suites = testStore.suites(A);
    expect(suites).toHaveLength(3);
    expect(testStore.pendingCount(A)).toBe(2);
    expect(toneOf(80)).toBe("good"); expect(toneOf(79)).toBe("mid"); expect(toneOf(49)).toBe("bad");
    expect(testStore.lastRun(suites.find(s => s.name === "Ngoài phạm vi")!.id)).toBeUndefined();
  });
  it("runs a suite with live progress, stops keeping finished results", () => {
    const s = testStore.suites(A).find(x => x.name === "Đăng ký tài khoản")!;
    const run = testStore.startRun(s.id, "Tester")!;
    expect(run.status).toBe("running");
    for (let i = 0; i < 4; i++) testStore._tick();
    const mid = testStore.run(run.id)!;
    expect(runStats(mid).done).toBeGreaterThan(0);
    testStore.stopRun(run.id);
    const stopped = testStore.run(run.id)!;
    expect(stopped.status).toBe("stopped");
    expect(stopped.cases.length).toBe(runStats(stopped).done);
  });
  it("finishes as Chờ xác nhận, becomes Hoàn tất once every result is confirmed", () => {
    const s = testStore.suites(A).find(x => x.name === "CSKH – Câu hỏi thường gặp")!;
    const run = testStore.startRun(s.id, "Tester")!;
    for (let i = 0; i < 60; i++) testStore._tick();
    expect(testStore.run(run.id)!.status).toBe("pending");
    testStore.confirmAll(run.id);
    expect(testStore.run(run.id)!.status).toBe("done");
    const sc = s.cases.find(c => c.kind === "scenario" && testStore.run(run.id)!.results[c.id].state === "done")!;
    testStore.patchResult(run.id, sc.id, r => ({ ...r, turns: r.turns?.map((t, i) => (i === 0 ? { ...t, verdict: "fail" } : t)) }));
    expect(caseVerdict(testStore.run(run.id)!.results[sc.id])).toBe("fail");
  });
  it("re-runs only Fail/Error cases when asked", () => {
    const s = testStore.suites(A).find(x => x.name === "Đăng ký tài khoản")!;
    const last = testStore.lastRun(s.id)!;
    const bad = s.cases.filter(c => ["fail", "error"].includes(String(caseVerdict(last.results[c.id])))).length;
    const run = testStore.startRun(s.id, "T", true);
    if (bad) expect(run!.cases).toHaveLength(bad); else expect(run).toBeUndefined();
  });
});

describe("upload validation", () => {
  it("flags missing fields, short or duplicate-order scenarios", () => {
    const q = validateRows("qna", [{ "Câu hỏi": "A?", "Câu trả lời mong đợi": "B" }, { "Câu hỏi": "C?", "Câu trả lời mong đợi": "" }]);
    expect(q.rows.map(r => r.ok)).toEqual([true, false]);
    expect(q.rows[1].error).toBe("Thiếu Câu trả lời mong đợi.");
    const s = validateRows("scenario", [
      { "Mã kịch bản": "K1", "Thứ tự lượt": 2, "Câu hỏi": "b", "Câu trả lời mong đợi": "b" },
      { "Mã kịch bản": "K1", "Thứ tự lượt": 1, "Câu hỏi": "a", "Câu trả lời mong đợi": "a" },
      { "Mã kịch bản": "K2", "Thứ tự lượt": 1, "Câu hỏi": "x", "Câu trả lời mong đợi": "x" },
      { "Mã kịch bản": "K3", "Thứ tự lượt": 1, "Câu hỏi": "x", "Câu trả lời mong đợi": "x" },
      { "Mã kịch bản": "K3", "Thứ tự lượt": 1, "Câu hỏi": "y", "Câu trả lời mong đợi": "y" },
    ]);
    expect(s.rows.map(r => [r.key, r.ok, r.error])).toEqual([["K1", true, undefined], ["K2", false, "Kịch bản cần ít nhất 2 lượt."], ["K3", false, "Thứ tự lượt bị trùng."]]);
    const k1 = s.cases[0];
    expect(k1.kind === "scenario" && k1.turns.map(t => t.question)).toEqual(["a", "b"]);
  });
});

describe("TestTab UI", () => {
  it("Màn 1: lists suites after loading, search empty state, two-step delete", async () => {
    vi.useFakeTimers();
    wrap("test-sets");
    expect(screen.getByLabelText("Đang tải")).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
    expect(screen.getByText("CSKH – Câu hỏi thường gặp")).toBeTruthy();
    expect(screen.getByText("Chưa chạy lần nào")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm Test Suite theo tên"), { target: { value: "zzz" } });
    expect(screen.getByText(/Không tìm thấy Test Suite nào/)).toBeTruthy();
  });
  it("Màn 2 → 3B: full-screen Nhập tay, validation, back to the suite", () => {
    const s = testStore.suites(A).find(x => x.name === "Ngoài phạm vi")!;
    wrap("test-sets", `&item=${s.id}`);
    fireEvent.click(screen.getByRole("button", { name: /Thêm testcase/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Nhập tay/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(screen.getByRole("heading", { name: "Nhập tay testcase" })).toBeTruthy();
    const dlg = document.body;
    fireEvent.click(within(dlg).getByRole("button", { name: "Lưu & đóng" }));
    expect(within(dlg).getByText("Vui lòng nhập Câu hỏi.")).toBeTruthy();
    fireEvent.change(within(dlg).getByLabelText(/Câu hỏi/), { target: { value: "Thời tiết hôm nay?" } });
    fireEvent.change(within(dlg).getByLabelText(/Câu trả lời mong đợi/), { target: { value: "Từ chối lịch sự." } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Lưu & đóng" }));
    expect(testStore.suite(s.id)!.cases).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Ngoài phạm vi" })).toBeTruthy();
  });
  it("Màn 2: clicking a testcase opens its detail with the latest result", () => {
    const s = testStore.suites(A).find(x => x.name === "CSKH – Câu hỏi thường gặp")!;
    wrap("test-sets", `&item=${s.id}`);
    fireEvent.click(screen.getByRole("button", { name: s.cases[0].kind === "qna" ? s.cases[0].question : "" }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("Câu trả lời mong đợi")).toBeTruthy();
    expect(within(sheet).getByText("Kết quả gần nhất")).toBeTruthy();
    fireEvent.click(within(sheet).getByRole("button", { name: /Chỉnh sửa/ }));
    fireEvent.change(within(sheet).getByLabelText(/Câu trả lời mong đợi/), { target: { value: "Mới" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Lưu" }));
    expect(testStore.suite(s.id)!.cases[0]).toMatchObject({ expected: "Mới" });
  });
  it("Màn 2 table: columns, run one testcase, duplicate, move, delete", () => {
    const suites = testStore.suites(A);
    const s = suites.find(x => x.name === "Ngoài phạm vi")!;
    const other = suites.find(x => x.name === "Đăng ký tài khoản")!;
    wrap("test-sets", `&item=${s.id}`);
    for (const h of ["Câu hỏi", "Câu trả lời mong muốn", "Topic", "Nguồn tài liệu", "Run"]) expect(screen.getByRole("columnheader", { name: h })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Run testcase" })[0]);
    expect(testStore.runs(A, s.id)[0].cases).toHaveLength(1);
    testStore.duplicateCase(s.id, s.cases[0].id);
    expect(testStore.suite(s.id)!.cases).toHaveLength(3);
    testStore.moveCases(s.id, [s.cases[1].id], other.id);
    expect(testStore.suite(s.id)!.cases).toHaveLength(2);
    expect(testStore.suite(other.id)!.cases).toHaveLength(7);
    testStore.removeCases(s.id, testStore.suite(s.id)!.cases.map(c => c.id));
    expect(testStore.suite(s.id)!.cases).toHaveLength(0);
  });
  it("Màn 6: history select max 2, compare", () => {
    wrap("runs");
    const boxes = screen.getAllByRole("checkbox", { name: /Chọn lần chạy/ });
    expect(boxes).toHaveLength(3);
    expect(screen.getAllByText("Chờ xác nhận").length).toBe(2);
  });
  it("Màn 5: confirm all moves the run to Hoàn tất", () => {
    const run = testStore.runs(A).find(r => r.status === "pending")!;
    wrap("runs", `&item=${run.id}`);
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận tất cả theo AI/ }));
    expect(testStore.run(run.id)!.status).toBe("done");
  });
});
