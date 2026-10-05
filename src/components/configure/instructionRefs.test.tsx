import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createRef } from "react";
import { AGENTS } from "./agentStore";
import {
  parseToken, splitByRefs, resolveRef, findBrokenRefs, listLevel, searchCategory, categoryCount, matchRank, matchRange, parentNav,
} from "./instructionRefs";
import SlashMenu, { type SlashMenuHandle } from "./SlashMenu";

Element.prototype.scrollIntoView = vi.fn();
const A = "slash-demo";
const demo = AGENTS.find(a => a.id === A)!;
const r = (token: string) => resolveRef(A, parseToken(token)!);

describe("references in Instructions", () => {
  it("parses tokens out of the demo agent's text", () => {
    const refs = splitByRefs(demo.instructions).filter(s => s.type === "ref");
    expect(refs.length).toBeGreaterThanOrEqual(10);
  });

  it("resolves every state the spec lists", () => {
    expect(r("{{ref:skill:account-briefing}}")).toMatchObject({ status: "ok", label: "account-briefing" });
    expect(r("{{ref:skill:debt-lookup}}")).toMatchObject({ status: "restricted", label: "Tài nguyên bị hạn chế" });
    expect(r("{{ref:skill:email-drafter}}")).toMatchObject({ status: "ok", state: "Đang tắt" });
    expect(r("{{ref:tool:gmail::Send email}}")).toMatchObject({ status: "ok", label: "Gmail › Send email" });
    expect(r("{{ref:tool:sheets::Append row}}")).toMatchObject({ status: "ok", state: "Chưa kết nối" });
    expect(r("{{ref:file:kb-1::doc-1-3}}")).toMatchObject({ status: "ok", state: "Đang xử lý" });
    expect(r("{{ref:folder:kb-1::doc-1-f1}}")).toMatchObject({ status: "ok", label: "Biểu phí & lãi suất" });
    expect(r("{{ref:skill:legacy-crm-sync|old name}}")).toMatchObject({ status: "missing", label: "old name" });
    expect(r("{{ref:tool:notion::Create page}}").status).toBe("missing");
  });

  it("collects the broken references for the publish warning", () => {
    expect(findBrokenRefs(A, demo.instructions).map(b => b.ref.label)).toEqual(["legacy-crm-sync", "Notion › Create page", "Tài nguyên bị hạn chế"]);
    expect(findBrokenRefs(A, "no refs here")).toEqual([]);
  });
});

describe("menu catalogue", () => {
  it("lists the three categories with content for the demo agent", () => {
    expect(categoryCount(A, "skills")).toBe(4);
    expect(categoryCount(A, "knowledge")).toBeGreaterThanOrEqual(3);
    expect(categoryCount(A, "tools")).toBeGreaterThan(5);
    expect(categoryCount("cskh-empty-check", "skills")).toBe(0);
  });

  it("drills Knowledge: kb -> folder -> file, and back", () => {
    const kb1 = listLevel(A, { cat: "knowledge" }).find(i => i.label.length && i.child?.kbId === "kb-1")!;
    const root = listLevel(A, kb1.child!);
    const folder = root.find(i => i.glyph === "folder")!;
    expect(folder.child?.folderId).toBeTruthy();
    expect(listLevel(A, folder.child!).map(i => i.label)).toContain("Biểu lãi suất tiết kiệm 2026.pdf");
    expect(parentNav(folder.child!)).toEqual({ cat: "knowledge", kbId: "kb-1" });
    expect(parentNav({ cat: "knowledge", kbId: "kb-1" })).toEqual({ cat: "knowledge" });
    expect(parentNav({ cat: "knowledge" })).toBeNull();
  });

  it("drills a Connector into its tools", () => {
    const gmail = listLevel(A, { cat: "tools" }).find(i => i.label === "Gmail")!;
    expect(gmail.child).toEqual({ cat: "tools", connectorId: "gmail" });
    expect(listLevel(A, gmail.child!).map(i => i.label)).toContain("Send email");
  });

  it("searches across levels, ignoring case and diacritics, ranked by match quality", () => {
    expect(searchCategory(A, "knowledge", "bieu lai suat").map(i => i.label)).toContain("Biểu lãi suất tiết kiệm 2026.pdf");
    expect(searchCategory(A, "tools", "send")[0].sub).toBe("Gmail");
    expect(searchCategory(A, "skills", "zzzz")).toEqual([]);
    const item = (label: string, sub?: string) => ({ key: label, token: "", label, sub, glyph: "tool" as const });
    expect(matchRank(item("Send email"), "send")).toBe(0);
    expect(matchRank(item("Resend email"), "send")).toBe(2);
    expect(matchRank(item("Quick send"), "send")).toBe(1);
    expect(matchRank(item("x", "Gmail"), "gma")).toBe(3);
    expect(matchRange("Báo cáo tuần", "bao cao")).toEqual([0, 7]);
  });
});

describe("<SlashMenu>", () => {
  const anchor = { left: 20, top: 20, bottom: 40 };
  const setup = (query = "") => {
    const ref = createRef<SlashMenuHandle>();
    const onPick = vi.fn();
    const onAdd = vi.fn();
    const utils = render(<SlashMenu ref={ref} agentId={A} query={query} anchor={anchor} onPick={onPick} onClose={() => {}} onAdd={onAdd} />);
    return { ref, onPick, onAdd, ...utils };
  };
  const key = (ref: React.RefObject<SlashMenuHandle>, k: string) => act(() => { ref.current!.onKeyDown({ key: k } as KeyboardEvent); });

  it("shows a skeleton, then the 3 fixed categories and the footer hints", async () => {
    setup();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByText("Skills")).toBeTruthy();
    expect(screen.getByText("Knowledge")).toBeTruthy();
    expect(screen.getByText("Tools")).toBeTruthy();
    expect(screen.getByPlaceholderText === undefined).toBe(false);
    expect(screen.getByText("Tìm kiếm…")).toBeTruthy();
    expect(screen.getByText(/↑↓ di chuyển · ↵ chèn · → mở · ← quay lại · Esc đóng/)).toBeTruthy();
  });

  it("→ opens a category, ← goes back, Enter inserts", async () => {
    const { ref, onPick } = setup();
    await screen.findByText("Skills");
    key(ref, "ArrowRight");
    expect(await screen.findByText("Tìm trong Skills…")).toBeTruthy();
    expect(screen.getByText("account-briefing")).toBeTruthy();
    key(ref, "Enter");
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].token).toContain("{{ref:skill:");
    key(ref, "ArrowLeft");
    expect(await screen.findByText("Tìm kiếm…")).toBeTruthy();
  });

  it("groups search results with 'Xem tất cả' when a group has more than 5", async () => {
    setup("e");
    expect((await screen.findAllByText(/Xem tất cả \(\d+\)/)).length).toBeGreaterThan(0);
  });

  it("says when nothing matches", async () => {
    setup("zzzzzz");
    expect(await screen.findByText("Không tìm thấy “zzzzzz”.")).toBeTruthy();
  });
});
