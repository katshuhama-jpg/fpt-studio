import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { handoffStore } from "./handoffStore";
import HandoffSection from "./HandoffSection";
import AgentCapabilitiesModal from "./AgentCapabilitiesModal";
import { RolesProvider } from "@/pages/organization/rolesStore";
import { OrgProvider } from "@/pages/organization/orgStore";
import { TooltipProvider } from "@/components/ui/tooltip";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
});
const A = "cskh";
beforeEach(() => { handoffStore.disconnect(A); handoffStore.setCapability(A, false); });
const wrap = (ui: React.ReactNode) => render(<TooltipProvider><RolesProvider><OrgProvider><MemoryRouter>{ui}<Toaster /></MemoryRouter></OrgProvider></RolesProvider></TooltipProvider>);

describe("handoffStore", () => {
  it("connect fails on a bad token, succeeds otherwise; disconnect clears channels", () => {
    expect(handoffStore.connect(A, "eos", "abc.eos.vn", "x", "Tran Nam").ok).toBe(false);
    expect(handoffStore.connection(A)).toBeNull();
    expect(handoffStore.connect(A, "eos", "abc.eos.vn", "token-12345", "Tran Nam").ok).toBe(true);
    handoffStore.setChannel(A, "zalo", true);
    expect(handoffStore.inboxName(A, "zalo")).toBe("Zalo – Banking ABC");
    handoffStore.disconnect(A);
    expect(handoffStore.activeChannels(A)).toEqual([]);
  });
  it("warns at Publish only when the capability is off but channels still hand off", () => {
    handoffStore.connect(A, "eos", "abc", "token-12345", "x");
    handoffStore.setChannel(A, "web", true);
    expect(handoffStore.publishWarning(A)).toEqual(["Web widget"]);
    handoffStore.setCapability(A, true);
    expect(handoffStore.publishWarning(A)).toEqual([]);
    expect(handoffStore.isWorking(A)).toBe(true);
    handoffStore.simulateError(A);
    expect(handoffStore.isWorking(A)).toBe(false);
  });
});

describe("Kênh triển khai › Chuyển cho nhân viên", () => {
  it("connect EOS, then toggle a channel per channel; Agent Workspace has no switch", async () => {
    handoffStore.setCapability(A, true);
    wrap(<HandoffSection agentId={A} />);
    expect(screen.getByText("EOS Contact Center")).toBeTruthy();
    expect(screen.getByText("Genesys Cloud")).toBeTruthy();
    expect(screen.getByText("Chưa khả dụng")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Kết nối/ }));
    const d = screen.getByRole("dialog");
    fireEvent.change(within(d).getByLabelText("Tổ chức trên EOS"), { target: { value: "cskh-abc.eos.vn" } });
    fireEvent.change(within(d).getByLabelText("Mã truy cập"), { target: { value: "bad" } });
    await act(async () => { fireEvent.click(within(d).getByRole("button", { name: "Kết nối" })); await new Promise(r => setTimeout(r, 800)); });
    expect(within(d).getByRole("alert").textContent).toMatch(/thất bại/);
    fireEvent.change(within(d).getByLabelText("Mã truy cập"), { target: { value: "token-12345" } });
    await act(async () => { fireEvent.click(within(d).getByRole("button", { name: "Kết nối" })); await new Promise(r => setTimeout(r, 800)); });

    const m = screen.getByRole("dialog");
    expect(within(m).getByText(/Đã kết nối với/).textContent).toContain("cskh-abc.eos.vn");
    expect(within(m).getByText("Kênh nội bộ, không hỗ trợ chuyển cho nhân viên.")).toBeTruthy();
    expect(within(m).queryByRole("switch", { name: /Agent Workspace/ })).toBeNull();
    fireEvent.click(within(m).getByRole("switch", { name: /Zalo/ }));
    expect(within(m).getByText(/Hộp thư đích: Zalo – Banking ABC/)).toBeTruthy();
    expect(handoffStore.activeChannels(A)).toEqual(["zalo"]);
    expect(within(m).getByText(/Báo cáo chuyển cho nhân viên/)).toBeTruthy();
  });

  it("channel switches are locked while the capability is off", () => {
    handoffStore.connect(A, "eos", "abc", "token-12345", "x");
    wrap(<HandoffSection agentId={A} />);
    expect(screen.getByText(/đang tắt ở Dựng agent/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Quản lý" }));
    const sw = within(screen.getByRole("dialog")).getByRole("switch", { name: /Zalo/ });
    expect(sw.hasAttribute("disabled")).toBe(true);
  });

  it("401 shows the error state with Kết nối lại and pauses handoff", () => {
    handoffStore.setCapability(A, true);
    handoffStore.connect(A, "eos", "abc", "token-12345", "x");
    handoffStore.setChannel(A, "web", true);
    handoffStore.simulateError(A);
    wrap(<HandoffSection agentId={A} />);
    expect(screen.getByText(/Mất kết nối EOS Contact Center/)).toBeTruthy();
    expect(screen.getByText(/không hội thoại nào bị mất/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Kết nối lại" }).length).toBeGreaterThan(0);
  });
});

describe("Năng lực › Chuyển cho nhân viên", () => {
  it("is a new, off-by-default row that lists active channels", () => {
    handoffStore.connect(A, "eos", "abc", "token-12345", "x");
    handoffStore.setChannel(A, "web", true);
    handoffStore.setChannel(A, "zalo", true);
    wrap(<AgentCapabilitiesModal agentId={A} onClose={() => {}} onChanged={() => {}} />);
    expect(screen.getByText("Mới")).toBeTruthy();
    const sw = screen.getByRole("switch", { name: /Chuyển cho nhân viên/ });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/Còn 2 kênh đang bật chuyển cho nhân viên/)).toBeTruthy();
    fireEvent.click(sw);
    expect(screen.getByText(/Đang hoạt động trên: Web widget, Zalo \(EOS Contact Center\)/)).toBeTruthy();
    expect(handoffStore.capabilityOn(A)).toBe(true);
  });
});
