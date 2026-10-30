import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import InactiveReminderTab from "./InactiveReminderTab";
import {
  apiNotSubscribed, emptyReminder, emptyStep, findOverlaps, fmtMinutes, hasPublishedChannels, lostAllChannels,
  needsUpdate, noLiveChannel, publishedChannelIds, reminderStore, validateReminder, windowWarnings,
} from "./reminderStore";

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
    expect(list).toHaveLength(4);
    expect(list.filter(r => needsUpdate("cskh", r)).map(r => r.name)).toEqual(["Nhắc tra cứu khoản vay"]);
    expect(reminderStore.list("empty-agent")).toEqual([]);
  });

  it("only offers channels the agent is published to", () => {
    expect(publishedChannelIds("cskh")).toEqual(["web", "zalo"]);
    expect(hasPublishedChannels("cskh")).toBe(true);
    // "sales-quote" is published but to no channel at all.
    expect(hasPublishedChannels("sales-quote")).toBe(false);
  });

  it("switches off a reminder whose channels are all gone", () => {
    const lost = reminderStore.list("cskh").find(r => r.name === "Nhắc chọn sản phẩm")!;
    expect(lostAllChannels("cskh", lost)).toBe(true);
    expect(noLiveChannel("cskh", lost)).toBe(true);
    const live = reminderStore.list("cskh").find(r => r.name === "Chốt đơn")!;
    expect(lostAllChannels("cskh", live)).toBe(false);
    expect(noLiveChannel("cskh", live)).toBe(false);
  });

  it("pauses — never switches off — an all-channels reminder on an agent with no published channel", () => {
    const all = emptyReminder(); // channels: "all"
    // "sales-quote" is published but to no channel at all.
    expect(noLiveChannel("sales-quote", all)).toBe(true);
    expect(lostAllChannels("sales-quote", all)).toBe(false);
    // With a live channel it is neither paused nor lost.
    expect(noLiveChannel("cskh", all)).toBe(false);
  });

  it("validates required fields, duplicates and the 23h59 total — Trigger stays optional", () => {
    const r = emptyReminder();
    let e = validateReminder("x", r, []);
    expect(e.fields.get("name")).toBe("Vui lòng nhập Reminder name.");
    const s = r.steps[0];
    // A new step starts at 5 phút, so Duration is already valid.
    expect(e.fields.get(`step.${s.id}.duration`)).toBeUndefined();
    // Trigger is optional — no error even though it is empty.
    expect(e.fields.get(`step.${s.id}.trigger`)).toBeUndefined();
    expect(e.fields.get(`step.${s.id}.instruction`)).toBe("Vui lòng nhập Instruction.");

    const zero = validateReminder("x", { ...r, steps: [{ ...s, hours: 0, minutes: 0 }] }, []);
    expect(zero.fields.get(`step.${s.id}.duration`)).toBe("Vui lòng nhập Duration.");

    const a = { ...emptyStep(), hours: 20, minutes: 0, instruction: "Nhắc khách", trigger: "" };
    const b = { ...a, id: "b", hours: 4 };
    e = validateReminder("x", { ...r, name: "Dup", steps: [a, b] }, [{ ...r, id: "o", name: "dup" }]);
    expect(e.fields.get("name")).toBe("Tên reminder đã tồn tại trong Agent.");
    expect(e.total).toBe("Tổng thời gian chờ của các lần nhắc không được vượt quá 23 giờ 59 phút.");
    // 23h59 exactly is still allowed.
    expect(validateReminder("x", { ...r, name: "Z", steps: [{ ...a, hours: 23, minutes: 59 }] }, []).total).toBeUndefined();
  });

  it("finds overlapping steps across enabled reminders on a shared channel", () => {
    const list = reminderStore.list("cskh");
    const phone = list.find(r => r.name === "Nhắc xin số điện thoại")!;
    const hits = findOverlaps("cskh", phone, list);
    // Both start at 5 phút and share the "web" channel → an exact step-1 collision.
    expect(hits.some(h => h.otherName === "Chốt đơn" && h.exact && h.otherStep === 1)).toBe(true);
    // The disabled reminder never collides.
    expect(hits.some(h => h.otherName === "Nhắc chọn sản phẩm")).toBe(false);
  });

  it("warns on interaction windows and the unsubscribed API channel", () => {
    const base = reminderStore.list("cskh")[0];
    const long = { ...base, channels: ["zalo"] as string[], steps: [{ ...base.steps[0], hours: 23, minutes: 59 }] };
    // 23h59 is still inside Zalo's ~48h window.
    expect(windowWarnings("cskh", long)).toEqual([]);
    expect(apiNotSubscribed("cskh", { ...base, channels: ["web"] })).toBe(false);
  });
});

describe("InactiveReminderTab", () => {
  it("shows the usage note, created-at column and the needs-update badge — and no feature-level switch", () => {
    wrap(<InactiveReminderTab agentId="cskh" />);
    expect(screen.queryByLabelText("Bật Inactive reminder")).toBeNull();
    expect(screen.getByText(/tính vào usage/)).toBeTruthy();
    expect(screen.getByText("Thời điểm tạo")).toBeTruthy();
    expect(screen.getByText("Cần cập nhật")).toBeTruthy();
    expect(screen.getByText(/không còn kênh áp dụng/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Thêm reminder/ })).toBeTruthy();
  });

  it("empty state + sheet validation on save", () => {
    wrap(<InactiveReminderTab agentId="faq" />);
    expect(screen.getByText(/Chưa có reminder nào/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /Thêm reminder/ })[0]);
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByText("Thêm reminder")).toBeTruthy();
    expect(within(dlg).getByText("1/3")).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: /^Lưu$/ }));
    expect(within(dlg).getByText("Vui lòng nhập Reminder name.")).toBeTruthy();
    expect(within(dlg).getByText("Vui lòng nhập Instruction.")).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: /Thêm lần nhắc/ }));
    fireEvent.click(within(dlg).getByRole("button", { name: /Thêm lần nhắc/ }));
    expect(within(dlg).queryByRole("button", { name: /Thêm lần nhắc/ })).toBeNull();
    expect(within(dlg).getByText("Lần nhắc 3")).toBeTruthy();
  });

  it("blocks creating a reminder when no channel is published", () => {
    wrap(<InactiveReminderTab agentId="sales-quote" />);
    expect(screen.getByText(/Cần publish ít nhất 1 kênh/)).toBeTruthy();
  });

  it("warns once and pauses the rows when the agent has no published channel left", () => {
    // Seed an agent that has reminders but no live channel: "all" + an explicit list.
    reminderStore.save("sales-quote", { ...emptyReminder(), name: "Nhắc tất cả kênh", steps: [{ ...emptyStep(), instruction: "Nhắc khách" }] });
    reminderStore.save("sales-quote", { ...emptyReminder(), name: "Nhắc kênh web", channels: ["web"], steps: [{ ...emptyStep(), instruction: "Nhắc khách" }] });
    wrap(<InactiveReminderTab agentId="sales-quote" />);
    expect(screen.getByText(/Agent chưa publish kênh nào nên mọi reminder đang tạm dừng/)).toBeTruthy();
    // One banner, not one note per row.
    expect(screen.queryByText(/Chọn lại kênh để bật lại/)).toBeNull();
    // "Tất cả kênh" stays on but is flagged as paused; its switch can't be toggled.
    expect(screen.getByText("Tạm dừng")).toBeTruthy();
    expect(screen.getByLabelText("Trạng thái Nhắc tất cả kênh").hasAttribute("disabled")).toBe(true);
    reminderStore.remove("sales-quote", reminderStore.list("sales-quote").find(r => r.name === "Nhắc tất cả kênh")!.id);
    reminderStore.remove("sales-quote", reminderStore.list("sales-quote").find(r => r.name === "Nhắc kênh web")!.id);
  });

  it("read-only hides add/save", () => {
    wrap(<InactiveReminderTab agentId="cskh" readOnly />);
    expect(screen.queryByRole("button", { name: /Thêm reminder/ })).toBeNull();
  });
});
