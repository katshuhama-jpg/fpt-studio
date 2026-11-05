import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ConversationSettings from "./ConversationSettings";
import { conversationTimeoutStore, hhmm, reminderSteps, validateTimeout } from "./conversationTimeoutStore";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
});
const wrap = (agentId: string) => render(<TooltipProvider><MemoryRouter><ConversationSettings agentId={agentId} /><Toaster /></MemoryRouter></TooltipProvider>);

describe("conversation timeout", () => {
  it("validates min 5 phút and a required message; flags reminder steps ≥ timeout", () => {
    expect(validateTimeout({ enabled: true, days: 0, hours: 0, minutes: 4 })).toEqual({ duration: "Thời gian chờ tối thiểu là 5 phút." });
    expect(validateTimeout({ enabled: true, days: 1, hours: 0, minutes: 0 }).duration).toBeUndefined();
    expect(validateTimeout({ enabled: false, days: 0, hours: 0, minutes: 0 })).toEqual({});
    expect(hhmm(90)).toBe("01:30");
    expect(hhmm(1440 + 150)).toBe("1 ngày 02:30");
    // cskh reminders: 5', 5', 30', 2h (enabled) → timeout 30' blocks 30' and 2h.
    expect(reminderSteps("cskh", 30).filter(s => s.blocked).map(s => s.minutes)).toEqual([30, 120]);
  });

  it("(b) off with old values keeps them; (e) turning on shows the conflict and the save dialog", () => {
    wrap("cskh");
    expect(screen.getByText(/Giá trị đã lưu: 00:25/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Bật kết thúc hội thoại tự động"));
    expect(screen.queryByLabelText(/Tin nhắn kết thúc/)).toBeNull();
    expect(screen.getByLabelText("Ngày")).toBeTruthy();
    expect(screen.getByText(/Có 2 bước nhắc nhở có thời gian ≥ thời gian chờ \(00:25\)/)).toBeTruthy();
    expect(screen.queryByText("Xem trước dòng thời gian")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Lưu/ }));
    const dlg = screen.getByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Vẫn lưu" }));
    expect(conversationTimeoutStore.get("cskh").enabled).toBe(true);
  });

  it("(a) default 30 phút on first enable and saves without an end message; timeout block comes first", () => {
    wrap("faq");
    expect(screen.queryByText(/Giá trị đã lưu/)).toBeNull();
    const titles = screen.getAllByText(/Kết thúc hội thoại tự động|Nhắc nhở khi khách không phản hồi/).map(e => e.textContent);
    expect(titles[0]).toBe("Kết thúc hội thoại tự động");
    fireEvent.click(screen.getByLabelText("Bật kết thúc hội thoại tự động"));
    fireEvent.click(screen.getByRole("button", { name: /Lưu/ }));
    expect(conversationTimeoutStore.get("faq")).toMatchObject({ enabled: true, days: 0, hours: 0, minutes: 30 });
  });
});
