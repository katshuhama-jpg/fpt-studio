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
  it("lists Individual and Organization Spaces and enters the picked one", () => {
    setUser({ email: "an@fpt.com", firstTime: false });
    render(<MemoryRouter initialEntries={["/select-space"]}><Routes>
      <Route path="/select-space" element={<SelectSpace />} />
      <Route path="/" element={<p>HOME</p>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText("Individual space")).toBeTruthy();
    expect(screen.getByText("Organization space")).toBeTruthy();
    const enter = screen.getByRole("button", { name: /Vào Space/ }) as HTMLButtonElement;
    expect(enter.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Bộ Tài Chính/ }));
    fireEvent.click(enter);
    expect(getCurrentTenantId()).toBe("bo-tai-chinh");
    expect(getUser()?.spaceChosen).toBe(true);
    expect(screen.getByText("HOME")).toBeTruthy();
  });
});
