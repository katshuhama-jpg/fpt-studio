import { describe, it, expect, beforeEach, vi } from "vitest";

describe("refineChatStore", () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it("keeps one thread per Agent per person, across a reload", async () => {
    localStorage.setItem("demo_persona", "nam");
    let { refineChatStore } = await import("./refineChatStore");
    const k = refineChatStore.key("hr");
    refineChatStore.set(k, [{ id: "1", at: 1, kind: "text", role: "user", text: "Giọng trang trọng hơn" }]);

    vi.resetModules(); // simulates a page reload
    ({ refineChatStore } = await import("./refineChatStore"));
    expect(refineChatStore.get(refineChatStore.key("hr"))).toHaveLength(1);

    localStorage.setItem("demo_persona", "mai");
    expect(refineChatStore.get(refineChatStore.key("hr"))).toHaveLength(0);
  });

  it("finishes a reply a reload cut off instead of leaving it half-written", async () => {
    localStorage.setItem("refine_chat_v2", JSON.stringify({
      "hr::m-fsoft-ceo": [
        { id: "a", at: 1, kind: "text", role: "ai", text: "Đã hi", streaming: true, full: "Đã hiểu." },
        { id: "b", at: 2, kind: "tool", name: "Phân tích yêu cầu", done: false },
      ],
    }));
    const { refineChatStore } = await import("./refineChatStore");
    const [a, b] = refineChatStore.get("hr::m-fsoft-ceo");
    expect(a.kind === "text" && a.text).toBe("Đã hiểu.");
    expect(b.kind === "tool" && b.done).toBe(true);
  });

  it("gives two new Agents created from different prompts separate threads", async () => {
    const { refineChatStore } = await import("./refineChatStore");
    expect(refineChatStore.key("new", "Bot HR")).not.toBe(refineChatStore.key("new", "Bot CSKH"));
  });
});

describe("Refine với AI - several people on one Agent", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.resetModules(); vi.useFakeTimers(); });

  const as = (p: string) => sessionStorage.setItem("demo_persona", p);

  it("gives the turn to one person; a waiting card holds it for 10 minutes", async () => {
    as("nam");
    const { refineChatStore, PENDING_HOLD_MS } = await import("./refineChatStore");
    localStorage.setItem("refine_lock_v1", JSON.stringify({ hr: { personaId: "m-fsoft-ceo", name: "Tran Nam", since: Date.now(), last: Date.now(), state: "pending", tab: "x" } }));
    expect(refineChatStore.otherHolder("hr")).toBeNull();
    as("mai");
    expect(refineChatStore.otherHolder("hr")?.name).toBe("Tran Nam");
    vi.advanceTimersByTime(PENDING_HOLD_MS + 1000);
    expect(refineChatStore.otherHolder("hr")).toBeNull();
  });

  it("stops a card whose text someone else changed, and applies one whose text is still there", async () => {
    as("nam");
    const { refineChatStore, refineAssistant } = await import("./refineChatStore");
    const { instructionDraftStore } = await import("./instructionDraftStore");
    instructionDraftStore.set("hr", "Dòng 1\nDòng 2");
    const ctx = { agentId: "hr", getInstructions: () => instructionDraftStore.get("hr") ?? "" };
    const key = refineChatStore.key("hr");
    const card = (id: string, old: string) => ({ id, at: Date.now(), kind: "approval" as const, tool: "edit_file", status: "pending" as const, args: { old_string: old, new_string: `${old}\nMới`, file_path: "/work/memories/AGENTS.md" } });
    refineChatStore.set(key, [card("c1", "Dòng 2")]);
    vi.advanceTimersByTime(1000);

    as("mai");
    instructionDraftStore.set("hr", "Dòng 1 (Mai sửa)\nDòng 2");
    as("nam");
    refineAssistant.decide(key, ctx, "c1", true);
    vi.advanceTimersByTime(10000);
    expect(instructionDraftStore.get("hr")).toBe("Dòng 1 (Mai sửa)\nDòng 2\nMới");
    expect(refineChatStore.get(key).some(m => m.kind === "text" && m.text.includes("ở đoạn khác"))).toBe(true);

    refineChatStore.update(key, l => [...l, card("c2", "Dòng 2\nMới")]);
    as("mai");
    instructionDraftStore.set("hr", "Dòng 1 (Mai sửa)\nDòng 2 đã đổi");
    as("nam");
    refineAssistant.decide(key, ctx, "c2", true);
    vi.advanceTimersByTime(10000);
    const c2 = refineChatStore.get(key).find(m => m.id === "c2");
    expect(c2?.kind === "approval" && c2.status).toBe("stopped");
    expect(instructionDraftStore.get("hr")).toBe("Dòng 1 (Mai sửa)\nDòng 2 đã đổi");
    expect(refineChatStore.get(key).some(m => m.kind === "text" && m.text.startsWith("Agent đã bị thay đổi thông tin: Mai Hoang"))).toBe(true);
  });

  it("Khôi phục stops a waiting card", async () => {
    as("nam");
    const { refineChatStore, refineAssistant } = await import("./refineChatStore");
    const key = refineChatStore.key("hr");
    refineChatStore.set(key, [{ id: "c", at: 1, kind: "approval", tool: "edit_file", status: "pending", args: { old_string: "a", new_string: "b", file_path: "f" } }]);
    refineAssistant.interruptAgent("hr", "Linh Phan đã khôi phục v2 lúc 09:10");
    const [c, msg] = refineChatStore.get(key);
    expect(c.kind === "approval" && c.status).toBe("stopped");
    expect(msg.kind === "text" && msg.text).toContain("Linh Phan đã khôi phục v2");
  });
});
