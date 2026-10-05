import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useState } from "react";
import InstructionsEditor from "./InstructionsEditor";

const A = "slash-demo";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Range.prototype.getBoundingClientRect = () => ({ left: 10, top: 10, bottom: 30, right: 20, width: 10, height: 20, x: 10, y: 10, toJSON() {} }) as DOMRect;
});

function Harness({ initial = "", onValue }: { initial?: string; onValue?: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return <InstructionsEditor agentId={A} value={v} onChange={n => { setV(n); onValue?.(n); }} placeholder="ph" />;
}

const editor = () => screen.getByRole("textbox") as HTMLDivElement;

/** Types `text` at the end of the editor the way a browser would: edit the DOM, move the caret, fire `input`. */
function type(text: string, data = text.slice(-1)) {
  const root = editor();
  let node = root.lastChild as Text | null;
  if (!node || node.nodeType !== Node.TEXT_NODE) { node = document.createTextNode(""); root.appendChild(node); }
  node.data += text;
  const sel = window.getSelection()!;
  const r = document.createRange();
  r.setStart(node, node.data.length);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
  const ev = new InputEvent("input", { bubbles: true, inputType: "insertText", data });
  act(() => { root.dispatchEvent(ev); });
}

describe("InstructionsEditor", () => {
  it("renders stored tokens as chips, with error and processing states", () => {
    render(<Harness initial={"Dùng {{ref:skill:account-briefing|x}} và {{ref:skill:ghost|Skill cũ}}"} />);
    const chips = editor().querySelectorAll<HTMLElement>("[data-ref-token]");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toBe("account-briefing");
    expect(chips[0].contentEditable).toBe("false");
    expect(chips[1].dataset.refError).toBe("true");
    expect(chips[1].title).toBe("Tài nguyên này không còn gắn với Agent.");
  });

  it("opens on '/' at line start or after a space, but not mid-word, in a URL or in code", async () => {
    render(<Harness />);
    type("/");
    expect(await screen.findByText("Tìm kiếm…")).toBeTruthy();
    fireEvent.keyDown(editor(), { key: "Escape" });
    expect(screen.queryByText("↑↓ di chuyển", { exact: false })).toBeNull();

    for (const text of ["and/or", "xem https://x.com", "dùng `a /", "```\ncode /"]) {
      editor().textContent = "";
      type(text.slice(0, -1), "a");
      type("/");
      expect(screen.queryByText(/↑↓ di chuyển/), `should not open for ${JSON.stringify(text)}`).toBeNull();
    }
    editor().textContent = "";
    type("xin chào ", " ");
    type("/");
    expect(await screen.findByText(/↑↓ di chuyển/)).toBeTruthy();
  });

  it("filters while typing, then inserts a chip + one space and serialises to a token", async () => {
    const seen: string[] = [];
    render(<Harness onValue={v => seen.push(v)} />);
    type("Gửi ", " ");
    type("/");
    type("send", "d");
    await screen.findByText(/↑↓ di chuyển/);
    await vi.waitFor(() => expect(document.body.textContent).toContain("Send email"));
    expect(document.body.textContent).not.toContain("Archive email");
    fireEvent.keyDown(editor(), { key: "Enter" });
    const chip = editor().querySelector<HTMLElement>("[data-ref-token]")!;
    expect(chip.textContent).toBe("Gmail › Send email");
    expect(chip.nextSibling?.textContent).toBe(" ");
    expect(seen[seen.length - 1]).toBe("Gửi {{ref:tool:gmail::Send email|Gmail › Send email}} ");
    expect(screen.queryByText(/↑↓ di chuyển/)).toBeNull();
  });

  it("closes when the '/' is deleted, and keeps what was typed as plain text", async () => {
    render(<Harness />);
    type("/");
    await screen.findByText(/↑↓ di chuyển/);
    type("abc", "c");
    fireEvent.keyDown(editor(), { key: "Escape" });
    expect(editor().textContent).toBe("/abc");
    expect(editor().querySelector("[data-ref-token]")).toBeNull();
  });

  it("Backspace on a selected chip removes the whole chip", () => {
    const seen: string[] = [];
    render(<Harness initial={"a {{ref:skill:account-briefing|x}} b"} onValue={v => seen.push(v)} />);
    const chip = editor().querySelector<HTMLElement>("[data-ref-token]")!;
    fireEvent.click(chip);
    expect(chip.dataset.selected).toBe("true");
    fireEvent.keyDown(editor(), { key: "Backspace" });
    expect(editor().querySelector("[data-ref-token]")).toBeNull();
    expect(seen[seen.length - 1]).toBe("a  b");
  });

  it("pasting text that contains tokens recreates the chips", () => {
    const seen: string[] = [];
    render(<Harness onValue={v => seen.push(v)} />);
    editor().focus();
    const root = editor();
    const t = document.createTextNode("");
    root.appendChild(t);
    const r = document.createRange(); r.setStart(t, 0); r.collapse(true);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(r);
    fireEvent.paste(root, { clipboardData: { getData: () => "x {{ref:skill:account-briefing|a}}\ny" } });
    expect(root.querySelectorAll("[data-ref-token]")).toHaveLength(1);
    expect(seen[seen.length - 1]).toBe("x {{ref:skill:account-briefing|a}}\ny");
  });
});
