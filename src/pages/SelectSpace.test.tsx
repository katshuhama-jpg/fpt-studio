import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SelectSpace from "./SelectSpace";
import { getUser, setUser } from "@/lib/onboarding";
import { SIDEBAR_SPACE_LIMIT, getCurrentTenantId, getMySpaces, getSpacesByRecent, setCurrentTenantId, spaceKind } from "@/lib/spaceStore";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("spaces", () => {
  it("5 Spaces: 1 Individual + 4 Organization; recent first", () => {
    const all = getMySpaces();
    expect(all).toHaveLength(5);
    expect(all.filter(t => spaceKind(t) === "individual").map(t => t.name)).toEqual(["Personal Sandbox"]);
    setCurrentTenantId("bo-tai-chinh");
    setCurrentTenantId("fpt-telecom");
    expect(getSpacesByRecent().slice(0, SIDEBAR_SPACE_LIMIT).map(t => t.id)).toEqual(["fpt-telecom", "bo-tai-chinh", "fpt-smart-cloud"]);
  });
});

describe("SelectSpace", () => {
  it("lists the personal Space and Shared spaces grouped by Organization, enters the picked one", () => {
    setUser({ email: "an@fpt.com", firstTime: false });
    render(<MemoryRouter initialEntries={["/select-space"]}><Routes>
      <Route path="/select-space" element={<SelectSpace />} />
      <Route path="/" element={<p>HOME</p>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText("Cá nhân")).toBeTruthy();
    expect(screen.getByText("FPT Corporation")).toBeTruthy();
    expect(screen.getByText(/đã được quản trị viên tổ chức thêm vào/)).toBeTruthy();
    expect(screen.queryByText(/gần nhất/)).toBeNull();
    expect((screen.getByRole("button", { name: /Chọn một Space/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Bộ Tài Chính.*Vai trò Viewer/ }));
    fireEvent.click(screen.getByRole("button", { name: /Vào Bộ Tài Chính/ }));
    expect(getCurrentTenantId()).toBe("bo-tai-chinh");
    expect(getUser()?.spaceChosen).toBe(true);
    expect(screen.getByText("HOME")).toBeTruthy();
  });
});

import SpaceSidebar from "@/components/layout/SpaceSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPinnedSpaceIds, togglePinSpace } from "@/lib/spaceStore";

describe("SpaceSidebar (Đang dùng + Đã ghim + Xem thêm)", () => {
  it("shows the active Space, up to 2 pins, and the rest behind Xem thêm", () => {
    globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
    const spaces = getMySpaces();
    const ui = () => <TooltipProvider><SpaceSidebar collapsed={false} tenantId="fpt-smart-cloud" tenants={spaces} onChange={() => {}} /></TooltipProvider>;
    const { rerender } = render(ui());
    expect(screen.getByText("Đang dùng")).toBeTruthy();
    expect(screen.getByText(/Ghim tối đa 2 Space/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Xem thêm 4 Space/ })).toBeTruthy();
    expect(togglePinSpace("sandbox")).toBe(true);
    expect(togglePinSpace("fpt-telecom")).toBe(true);
    expect(togglePinSpace("bo-tai-chinh")).toBe(false);
    expect(getPinnedSpaceIds()).toEqual(["sandbox", "fpt-telecom"]);
    rerender(ui());
    expect(screen.getByText("Personal Sandbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Xem thêm 2 Space/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Xem thêm 2 Space/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ghim Bộ Tài Chính" }).hasAttribute("disabled")).toBe(true);
  });
});
