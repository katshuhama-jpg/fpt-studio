import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { handoffStore, eosAccount } from "./handoffStore";
import HandoffSection from "./HandoffSection";
import CapabilitiesEditor from "./CapabilitiesEditor";
import { agentCapabilityStore } from "./agentCapabilityStore";
import { RolesProvider } from "@/pages/organization/rolesStore";
import { OrgProvider } from "@/pages/organization/orgStore";
import { TooltipProvider } from "@/components/ui/tooltip";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
});
const A = "cskh";
beforeEach(() => {
  handoffStore.setCapability(A, false);
  handoffStore.retry(A);
  for (const c of handoffStore.activeChannels(A)) handoffStore.setChannel(A, c, false);
});
const wrap = (ui: React.ReactNode) => render(<TooltipProvider><RolesProvider><OrgProvider><MemoryRouter>{ui}<Toaster /></MemoryRouter></OrgProvider></RolesProvider></TooltipProvider>);

describe("handoffStore", () => {
  it("links EOS automatically from the signed-in user's account", () => {
    expect(eosAccount()).toMatchObject({ org: "cskh-fpt.eos.vn" });
    expect(eosAccount("m-fsoft-coo")).toBeNull();
    expect(handoffStore.connection(A)).toMatchObject({ provider: "eos", org: "cskh-fpt.eos.vn", status: "connected" });
    handoffStore.setChannel(A, "zalo", true);
    expect(handoffStore.inboxName(A, "zalo")).toBe("Zalo – Banking ABC");
  });
  it("warns at Publish only when the capability is off but channels still hand off; 401 pauses handoff", () => {
    handoffStore.setChannel(A, "web", true);
    expect(handoffStore.publishWarning(A)).toEqual(["Web widget"]);
    handoffStore.setCapability(A, true);
    expect(handoffStore.publishWarning(A)).toEqual([]);
    expect(handoffStore.isWorking(A)).toBe(true);
    handoffStore.simulateError(A);
    expect(handoffStore.connection(A)?.status).toBe("error");
    expect(handoffStore.isWorking(A)).toBe(false);
    handoffStore.retry(A);
    expect(handoffStore.isWorking(A)).toBe(true);
  });
});

describe("Kênh ngoài › Chuyển cho nhân viên (user with an EOS account)", () => {
  it("is linked without a connect step; shows 'Chưa bật kênh nào' until a channel is on", () => {
    handoffStore.setCapability(A, true);
    wrap(<HandoffSection agentId={A} />);
    expect(screen.queryByRole("button", { name: /^Kết nối$/ })).toBeNull();
    expect(screen.getByText("Đã liên kết")).toBeTruthy();
    expect(screen.getByText(/Theo tài khoản EOS của bạn · cskh-fpt\.eos\.vn/)).toBeTruthy();
    expect(screen.getByText(/Chưa bật kênh nào/)).toBeTruthy();
    expect(screen.queryByRole("switch", { name: /Agent Workspace/ })).toBeNull();
    expect(screen.getByText("Kênh nội bộ, không hỗ trợ chuyển cho nhân viên.")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /Zalo/ }));
    expect(screen.queryByText(/Chưa bật kênh nào/)).toBeNull();
    expect(screen.getByText(/Hộp thư đích: Zalo – Banking ABC/)).toBeTruthy();
    expect(screen.getByText(/Báo cáo chuyển cho nhân viên/)).toBeTruthy();
  });

  it("channel switches are locked while the capability is off", () => {
    wrap(<HandoffSection agentId={A} />);
    expect(screen.getByText(/đang tắt ở Dựng agent/)).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Zalo/ }).hasAttribute("disabled")).toBe(true);
  });

  it("401 shows the error state with Thử lại", () => {
    handoffStore.setCapability(A, true);
    handoffStore.simulateError(A);
    wrap(<HandoffSection agentId={A} />);
    expect(screen.getByText(/Mất kết nối EOS Contact Center/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(screen.getByText("Đã liên kết")).toBeTruthy();
  });
});

describe("Kênh ngoài › Chuyển cho nhân viên (user without an EOS account)", () => {
  it("shows a 'Chưa bật kênh nào' note and no channel switches", async () => {
    localStorage.setItem("demo_persona", "linh");
    vi.resetModules();
    const { default: Section } = await import("./HandoffSection");
    const { RolesProvider: R } = await import("@/pages/organization/rolesStore");
    const { OrgProvider: O } = await import("@/pages/organization/orgStore");
    render(<TooltipProvider><R><O><MemoryRouter><Section agentId={A} /></MemoryRouter></O></R></TooltipProvider>);
    expect(screen.getByText("Chưa bật kênh nào")).toBeTruthy();
    expect(screen.getByText(/Tài khoản của bạn chưa có EOS Contact Center/)).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
    localStorage.removeItem("demo_persona");
  });
});

describe("Cài đặt nâng cao › Khả năng của Nhân sự số", () => {
  it("lists every capability; Save appears only after a change; restore defaults is a draft too", () => {
    handoffStore.setChannel(A, "web", true);
    handoffStore.setChannel(A, "zalo", true);
    agentCapabilityStore.restoreDefaults(A);
    wrap(<CapabilitiesEditor agentId={A} />);
    expect(screen.getAllByRole("switch")).toHaveLength(agentCapabilityStore.list().length + 1);
    expect(screen.getByText("Mới")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Lưu thay đổi/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Khôi phục mặc định/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Còn 2 kênh đang bật chuyển cho nhân viên/)).toBeTruthy();

    fireEvent.click(screen.getByRole("switch", { name: "Chuyển cho nhân viên" }));
    fireEvent.click(screen.getByRole("switch", { name: "Tìm kiếm web" }));
    expect(handoffStore.capabilityOn(A)).toBe(false); // not saved yet
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));
    expect(handoffStore.capabilityOn(A)).toBe(true);
    expect(agentCapabilityStore.isOn(A, "web-search")).toBe(false);
    expect(screen.queryByRole("button", { name: /Lưu thay đổi/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Khôi phục mặc định/ }));
    expect(screen.getByRole("button", { name: /Lưu thay đổi/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));
    expect(agentCapabilityStore.isOn(A, "web-search")).toBe(true);
    expect(handoffStore.capabilityOn(A)).toBe(false);
  });
});
