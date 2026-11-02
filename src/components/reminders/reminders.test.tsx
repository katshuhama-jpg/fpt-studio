import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import InactiveReminderTab from "./InactiveReminderTab";
import {
  emptyReminder, emptyStep, findOverlaps, fmtMinutes, fmtShort, hasPublishedChannels, lostAllChannels,
  needsUpdate, noLiveChannel, publishedChannelIds, reminderStore, stepMinutes, validateReminder,
} from "./reminderStore";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});
const wrap = (ui: React.ReactNode) => render(<TooltipProvider><MemoryRouter>{ui}<Toaster /></MemoryRouter></TooltipProvider>);

describe("reminderStore", () => {
  it("formats durations, lists newest first, removed skills don't block saving", () => {
    expect(fmtMinutes(210)).toBe("3 giờ 30 phút");
    expect(fmtMinutes(45)).toBe("45 phút");
    expect(fmtShort(75)).toBe("1h15'");
    expect(fmtShort(5)).toBe("5'");
    const list = reminderStore.list("cskh");
    expect(list).toHaveLength(4);
    expect(list.map(r => r.createdAt)).toEqual([...list.map(r => r.createdAt)].sort((a, b) => b - a));
    const stale = list.find(r => needsUpdate("cskh", r))!;
    expect(validateReminder("cskh", stale, list).fields.size).toBe(0);
    expect(reminderStore.list("empty-agent")).toEqual([]);
  });

  it("only offers channels the agent is published to", () => {
    expect(publishedChannelIds("cskh")).toEqual(["web", "zalo"]);
    expect(hasPublishedChannels("cskh")).toBe(true);
    // "sales-quote" is published but to no channel at all.
    expect(hasPublishedChannels("sales-quote")).toBe(false);
  });

  it("switches off a reminder whose channels are all gone", () => {
    const lost = { ...reminderStore.list("cskh").find(r => r.name === "Nhắc chọn sản phẩm")!, channels: ["messenger"] };
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

  it("validates name, increasing durations from the waiting message — Trigger stays optional", () => {
    const r = emptyReminder();
    let e = validateReminder("x", r, []);
    expect(e.fields.get("name")).toBe("Vui lòng nhập Reminder name.");
    const s = r.steps[0];
    expect(stepMinutes(s)).toBe(5);
    expect(e.fields.get(`step.${s.id}.duration`)).toBeUndefined();
    expect(e.fields.get(`step.${s.id}.trigger`)).toBeUndefined();
    expect(e.fields.get(`step.${s.id}.instruction`)).toBe("Vui lòng nhập Instruction.");
    expect(validateReminder("x", { ...r, name: "Nhắc 😀" }, []).fields.get("name")).toBe("Tên reminder chỉ gồm chữ, số và khoảng trắng, tối đa 100 ký tự");
    expect(validateReminder("x", { ...r, name: "Nhắc xin số điện thoại 2" }, []).fields.get("name")).toBeUndefined();

    const zero = validateReminder("x", { ...r, steps: [{ ...s, hours: 0, minutes: 0 }] }, []);
    expect(zero.fields.get(`step.${s.id}.duration`)).toBe("Vui lòng nhập Duration.");

    // Next step defaults to previous + 5 phút.
    const next = emptyStep({ ...s, hours: 0, minutes: 10 });
    expect(stepMinutes(next)).toBe(15);
    expect(stepMinutes(emptyStep({ ...s, hours: 23, minutes: 58 }))).toBe(23 * 60 + 59);

    const a = { ...emptyStep(), hours: 0, minutes: 10, instruction: "Nhắc khách" };
    const b = { ...a, id: "b", minutes: 5 };
    e = validateReminder("x", { ...r, name: "Dup", steps: [a, b] }, [{ ...r, id: "o", name: " dup " }]);
    expect(e.fields.get("name")).toBe("Tên reminder đã tồn tại trong Agent.");
    expect(e.fields.get("step.b.duration")).toBe("Duration lần sau phải lớn hơn lần trước");
  });

  it("finds overlapping steps across enabled reminders on a shared channel", () => {
    const list = reminderStore.list("cskh");
    const phone = list.find(r => r.name === "Nhắc xin số điện thoại")!;
    const hits = findOverlaps("cskh", phone, list);
    // Both send 5 phút after the waiting message → an exact collision.
    expect(hits.some(h => h.otherName === "Chốt đơn" && h.exact && h.otherStep === 1)).toBe(true);
    // The disabled reminder never collides.
    expect(hits.some(h => h.otherName === "Nhắc chọn sản phẩm")).toBe(false);
  });

});

describe("InactiveReminderTab", () => {
  it("list per wiki: created-at, no channel column, no needs-update badge, no Nhân bản", () => {
    wrap(<InactiveReminderTab agentId="cskh" />);
    expect(screen.queryByLabelText("Bật Inactive reminder")).toBeNull();
    expect(screen.getByText(/tính vào usage/)).toBeTruthy();
    expect(screen.getByText(/áp dụng cho tất cả kênh đã publish/)).toBeTruthy();
    expect(screen.getByText("Thời điểm tạo")).toBeTruthy();
    expect(screen.queryByText("Kênh áp dụng")).toBeNull();
    expect(screen.queryByText("Cần cập nhật")).toBeNull();
    expect(screen.queryByText("Nhân bản")).toBeNull();
    expect(screen.getByRole("button", { name: /Thêm reminder/ })).toBeTruthy();
  });

  it("empty state + sheet validation on save", () => {
    wrap(<InactiveReminderTab agentId="faq" />);
    expect(screen.getByText("Chưa có reminder nào")).toBeTruthy();
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
    expect(within(dlg).queryByText(/Tổng thời gian/)).toBeNull();
    expect(within(dlg).queryByText("Kênh áp dụng")).toBeNull();
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

  it("caps the list at 10 reminders", () => {
    for (let i = 0; i < 10; i++) reminderStore.save("faq", { ...emptyReminder(), name: `R ${i}`, steps: [{ ...emptyStep(), instruction: "x" }] });
    wrap(<InactiveReminderTab agentId="faq" />);
    expect(screen.getByRole("button", { name: /Thêm reminder/ }).hasAttribute("disabled")).toBe(true);
    for (const r of reminderStore.list("faq")) reminderStore.remove("faq", r.id);
  });

  it("read-only hides add/save", () => {
    wrap(<InactiveReminderTab agentId="cskh" readOnly />);
    expect(screen.queryByRole("button", { name: /Thêm reminder/ })).toBeNull();
  });
});
