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
