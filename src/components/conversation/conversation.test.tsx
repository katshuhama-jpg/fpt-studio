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
    expect(validateTimeout({ enabled: true, hours: 0, minutes: 4, message: "" })).toEqual({ duration: "Thời gian chờ tối thiểu là 5 phút.", message: "Vui lòng nhập tin nhắn kết thúc." });
    expect(validateTimeout({ enabled: false, hours: 0, minutes: 0, message: "" })).toEqual({});
    expect(hhmm(90)).toBe("01:30");
    // cskh reminders: 5', 5', 30', 2h (enabled) → timeout 30' blocks 30' and 2h.
    expect(reminderSteps("cskh", 30).filter(s => s.blocked).map(s => s.minutes)).toEqual([30, 120]);
  });

  it("(b) off with old values keeps them; (e) turning on shows the conflict and the save dialog", () => {
    wrap("cskh");
    expect(screen.getByText(/Giá trị đã lưu: 00:25/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Bật kết thúc hội thoại tự động"));
    expect((screen.getByLabelText(/Tin nhắn kết thúc/) as HTMLTextAreaElement).value).toMatch(/Cuộc trò chuyện đã kết thúc/);
    expect(screen.getByText(/Có 2 bước nhắc nhở có thời gian ≥ thời gian chờ \(00:25\)/)).toBeTruthy();
    expect(screen.getByText(/Kết thúc hội thoại \(00:25\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Lưu/ }));
    const dlg = screen.getByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Vẫn lưu" }));
    expect(conversationTimeoutStore.get("cskh").enabled).toBe(true);
  });

  it("(a)/(d) default 30 phút on first enable; empty message blocks save", () => {
    wrap("faq");
    expect(screen.queryByText(/Giá trị đã lưu/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Bật kết thúc hội thoại tự động"));
    expect(screen.getByText(/Kết thúc hội thoại \(00:30\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Lưu/ }));
    expect(screen.getByText("Vui lòng nhập tin nhắn kết thúc.")).toBeTruthy();
    expect(conversationTimeoutStore.get("faq").enabled).toBe(false);
  });
});
