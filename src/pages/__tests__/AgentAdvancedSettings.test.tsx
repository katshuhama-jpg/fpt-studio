import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AgentBuilder from "../AgentBuilder";
import { RolesProvider } from "../organization/rolesStore";
import { OrgProvider } from "../organization/orgStore";
import { ConflictsProvider } from "../organization/conflictsStore";
import { TooltipProvider } from "@/components/ui/tooltip";

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture ??= () => false;
});
const mount = (url: string) => render(
  <TooltipProvider><RolesProvider><OrgProvider><ConflictsProvider>
    <MemoryRouter initialEntries={[url]}><Routes><Route path="/agents/:id" element={<AgentBuilder />} /></Routes></MemoryRouter>
  </ConflictsProvider></OrgProvider></RolesProvider></TooltipProvider>,
);

describe("Build › Cài đặt nâng cao", () => {
  it("is a left-nav section with one tab per former Advanced settings item", () => {
    mount("/agents/cskh?tab=build&section=advanced");
    expect(screen.getAllByText("Cài đặt nâng cao").length).toBeGreaterThan(0);
    expect(screen.queryByRole("tab", { name: /Nhân sự số con/ })).toBeNull();
    for (const t of ["Starter Prompts", "Danh thiếp Nhân sự số", "Khả năng của Nhân sự số"]) {
      expect(screen.getByRole("tab", { name: new RegExp(t) })).toBeTruthy();
    }
    expect(screen.getByRole("tab", { name: /Starter Prompts/ }).getAttribute("aria-selected")).toBe("true");
  });
  it("opens a tab from ?atab= and the rail no longer has Advanced settings", () => {
    mount("/agents/cskh?tab=build&section=advanced&atab=capabilities");
    expect(screen.getByRole("tab", { name: /Khả năng của Nhân sự số/ }).getAttribute("aria-selected")).toBe("true");
  });
  it("the Instructions config rail no longer has the Advanced settings group", () => {
    mount("/agents/cskh?tab=build&section=instructions");
    expect(screen.getAllByText("Model").length).toBeGreaterThan(0);
    expect(screen.queryByText("Advanced settings")).toBeNull();
    expect(screen.getAllByText("Subagents").length).toBeGreaterThan(0);
  });
});
