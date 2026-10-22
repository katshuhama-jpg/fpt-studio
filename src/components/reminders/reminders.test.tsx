import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import InactiveReminderTab from "./InactiveReminderTab";
import { emptyReminder, emptyStep, fmtMinutes, needsUpdate, reminderStore, textFallbackChannels, validateReminder } from "./reminderStore";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});
const wrap = (ui: React.ReactNode) => render(<TooltipProvider><MemoryRouter>{ui}<Toaster /></MemoryRouter></TooltipProvider>);

describe("reminderStore", () => {
  it("formats durations and flags reminders with a removed skill", () => {
    expect(fmtMinutes(210)).toBe("3 giờ 30 phút");
    expect(fmtMinutes(45)).toBe("45 phút");
    const list = reminderStore.list("cskh");
    expect(list).toHaveLength(3);
    expect(list.filter(r => needsUpdate("cskh", r)).map(r => r.name)).toEqual(["Nhắc tra cứu khoản vay"]);
    expect(reminderStore.list("empty-agent")).toEqual([]);
  });
  it("validates required fields, duplicates, ranges and 23h total", () => {
    const r = emptyReminder();
    let e = validateReminder("x", r, []);
    expect(e.fields.get("name")).toBe("Vui lòng nhập Reminder name.");
    const s = r.steps[0];
    expect(e.fields.get(`step.${s.id}.duration`)).toBe("Vui lòng nhập Duration.");
    expect(e.fields.get(`step.${s.id}.trigger`)).toBe("Vui lòng nhập Trigger hoặc dùng Tạo tự động.");
    const a = { ...emptyStep(), amount: 20 as number, unit: "hour" as const, instruction: "Nhắc", trigger: "Khách im lặng" };
    const b = { ...a, id: "b", amount: 5 };
    e = validateReminder("x", { ...r, name: "Dup", steps: [a, b] }, [{ ...r, id: "o", name: "dup" }]);
    expect(e.fields.get("name")).toBe("Tên reminder đã tồn tại.");
    expect(e.total).toBe("Tổng thời gian không được vượt quá 23 giờ.");
    expect(textFallbackChannels(["web", "zalo"])).toEqual(["Zalo"].map(x => expect.stringContaining(x)));
  });
});

describe("InactiveReminderTab", () => {
  it("shows the list, the needs-update badge and the delete confirm", () => {
    wrap(<InactiveReminderTab agentId="cskh" />);
    expect(screen.queryByText("Bật Inactive reminder")).toBeNull();
    expect(screen.queryByText("Quiet hours")).toBeNull();
    expect(screen.getByRole("button", { name: /Thêm reminder/ })).toBeTruthy();
    expect(screen.getByText("Cần cập nhật")).toBeTruthy();
    expect(screen.getByText("Tất cả kênh")).toBeTruthy();
  });
  it("empty state + sheet validation on save", () => {
    wrap(<InactiveReminderTab agentId="fresh-agent" />);
    expect(screen.getByText(/Chưa có reminder nào/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Thêm reminder/ }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByText("Thêm reminder")).toBeTruthy();
    expect(within(dlg).getByText("1/3")).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: /^Lưu$/ }));
    expect(within(dlg).getByText("Vui lòng nhập Reminder name.")).toBeTruthy();
    expect(within(dlg).getByText("Vui lòng nhập Duration.")).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: /Thêm lần nhắc/ }));
    fireEvent.click(within(dlg).getByRole("button", { name: /Thêm lần nhắc/ }));
    expect(within(dlg).queryByRole("button", { name: /Thêm lần nhắc/ })).toBeNull();
    expect(within(dlg).getByText("Reminder 3")).toBeTruthy();
  });
  it("read-only hides add/save", () => {
    wrap(<InactiveReminderTab agentId="cskh" readOnly />);
    expect(screen.queryByRole("button", { name: /Thêm reminder/ })).toBeNull();
  });
});
