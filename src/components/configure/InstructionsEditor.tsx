import { useEffect, useLayoutEffect, useRef, useState } from "react";
import SlashMenu, { type SlashAnchor, type SlashMenuHandle } from "./SlashMenu";
import { parseToken, resolveRef, splitByRefs, type Category, type MenuItem } from "./instructionRefs";
import { chipElement, refreshChipElement } from "./refChip";

/* ───────────── text <-> DOM ───────────── */

/** Instructions text <- editor DOM. Chips become their `{{ref:…}}` token, <br> becomes a newline. */
function serializeNode(parent: Node, isRoot: boolean): string {
  let out = "";
  const kids = Array.from(parent.childNodes);
  kids.forEach((n, i) => {
    if (n.nodeType === Node.TEXT_NODE) { out += n.textContent ?? ""; return; }
    if (!(n instanceof HTMLElement)) return;
    if (n.dataset.refToken) { out += n.dataset.refToken; return; }
    if (n.tagName === "BR") {
      const prev = i > 0 ? kids[i - 1] : null;
      const prevIsBr = prev instanceof HTMLElement && prev.tagName === "BR";
      // The browser keeps one extra trailing <br> so a final blank line stays visible — not content.
      if (isRoot && i === kids.length - 1 && (prevIsBr || kids.length === 1)) return;
      out += "\n";
      return;
    }
    if (n.tagName === "DIV" || n.tagName === "P") {
      if (out && !out.endsWith("\n")) out += "\n";
      out += serializeNode(n, false);
      return;
    }
    out += serializeNode(n, false);
  });
  return out;
}

function appendText(parent: Node, text: string) {
  text.split("\n").forEach((line, i) => {
    if (i > 0) parent.appendChild(document.createElement("br"));
    if (line) parent.appendChild(document.createTextNode(line));
  });
}

function fragmentFor(text: string, agentId: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const seg of splitByRefs(text)) {
    if (seg.type === "text") appendText(frag, seg.text);
    else frag.appendChild(chipElement(resolveRef(agentId, seg.ref)));
  }
  return frag;
}

function fill(root: HTMLElement, text: string, agentId: string) {
  root.textContent = "";
  root.appendChild(fragmentFor(text, agentId));
  if (text.endsWith("\n")) root.appendChild(document.createElement("br"));
}

/* ───────────── "/" detection ───────────── */

const PUNCT_BEFORE = /[\s(\[{"'.,;!?]/;

function caretInText(root: HTMLElement): { node: Text; offset: number } | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  if (r.startContainer.nodeType !== Node.TEXT_NODE || !root.contains(r.startContainer)) return null;
  return { node: r.startContainer as Text, offset: r.startOffset };
}

/** A "/" opens the menu only at the start of a line or after whitespace/punctuation — never in
 * the middle of a word ("and/or"), a URL ("https://"), inline code or a fenced code block. */
function slashAllowed(root: HTMLElement, node: Text, index: number): boolean {
  let prevCh: string | null;
  if (index > 0) prevCh = node.data[index - 1];
  else {
    const prev = node.previousSibling;
    if (!prev) prevCh = "";
    else if (prev.nodeType === Node.TEXT_NODE) prevCh = (prev as Text).data.slice(-1);
    else if (prev instanceof HTMLElement && prev.tagName === "BR") prevCh = "";
    else prevCh = null; // directly after a chip
  }
  if (prevCh === null) return false;
  if (prevCh !== "" && !PUNCT_BEFORE.test(prevCh)) return false;

  const r = document.createRange();
  r.setStart(root, 0);
  r.setEnd(node, index);
  const lines = serializeNode(r.cloneContents(), true).split("\n");
  if (lines.filter(l => /^\s*```/.test(l)).length % 2 === 1) return false;
  const ticks = (lines[lines.length - 1].replace(/```/g, "").match(/`/g) ?? []).length;
  return ticks % 2 === 0;
}

function anchorFor(root: HTMLElement, node: Text, index: number): SlashAnchor {
  const r = document.createRange();
  r.setStart(node, index);
  r.setEnd(node, Math.min(index + 1, node.data.length));
  let rect = r.getBoundingClientRect();
  if (!rect.width && !rect.height) rect = root.getBoundingClientRect();
  return { left: rect.left, top: rect.top, bottom: rect.bottom };
}

/* ───────────── component ───────────── */

/** Instructions editor with reference chips. A contenteditable instead of a <textarea> because a
 * chip has to be one atomic block (Backspace removes it whole, the text inside can't be edited)
 * — something a textarea can't do. The value handed to / received from the parent is plain text
 * with `{{ref:…}}` tokens (see instructionRefs.ts). */
export default function InstructionsEditor({ agentId, value, onChange, onAdd, placeholder, className = "" }: {
  agentId: string;
  value: string;
  onChange: (next: string) => void;
  /** Where "Thêm" in an empty menu category should take the Builder. */
  onAdd?: (cat: Category) => void;
  placeholder?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<SlashMenuHandle>(null);
  const lastValue = useRef<string | null>(null);
  const slash = useRef<{ node: Text; index: number } | null>(null);
  const [menu, setMenu] = useState<{ query: string; anchor: SlashAnchor } | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || lastValue.current === value) return;
    fill(root, value, agentId);
    lastValue.current = value;
  }, [value, agentId]);

  const emit = () => {
    const root = rootRef.current;
    if (!root) return;
    const s = serializeNode(root, true);
    if (s === "" && root.firstChild) root.textContent = ""; // lets the :empty placeholder come back
    lastValue.current = s;
    onChange(s);
  };

  const closeMenu = () => { slash.current = null; setMenu(null); };

  const syncMenu = (justTypedSlash: boolean) => {
    const root = rootRef.current;
    if (!root) return;
    const pos = caretInText(root);
    const st = slash.current;
    if (st) {
      if (!pos || pos.node !== st.node || pos.offset <= st.index || st.node.data[st.index] !== "/") { closeMenu(); return; }
      const q = st.node.data.slice(st.index + 1, pos.offset);
      if (/^\s/.test(q) || q.length > 60) { closeMenu(); return; }
      setMenu({ query: q, anchor: anchorFor(root, st.node, st.index) });
      return;
    }
    if (justTypedSlash && pos && pos.offset > 0 && pos.node.data[pos.offset - 1] === "/" && slashAllowed(root, pos.node, pos.offset - 1)) {
      slash.current = { node: pos.node, index: pos.offset - 1 };
      setMenu({ query: "", anchor: anchorFor(root, pos.node, pos.offset - 1) });
    }
  };

  // Keep the popover glued to the caret when the page or the editor scrolls.
  useEffect(() => {
    if (!menu) return;
    const follow = () => syncMenu(false);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => { window.removeEventListener("scroll", follow, true); window.removeEventListener("resize", follow); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!menu]);

  const clearSelected = () => {
    rootRef.current?.querySelectorAll<HTMLElement>("[data-selected]").forEach(el => delete el.dataset.selected);
  };

  const refreshChips = () => {
    rootRef.current?.querySelectorAll<HTMLElement>("[data-ref-token]").forEach(el => {
      const ref = parseToken(el.dataset.refToken ?? "");
      if (ref) refreshChipElement(el, agentId, ref);
    });
  };

  const pick = (item: MenuItem) => {
    const root = rootRef.current;
    const st = slash.current;
    const ref = parseToken(item.token);
    if (!root || !st || !ref) return;
    const pos = caretInText(root);
    const end = pos && pos.node === st.node ? pos.offset : st.index + 1 + (menu?.query.length ?? 0);
    const range = document.createRange();
    range.setStart(st.node, st.index);
    range.setEnd(st.node, end);
    range.deleteContents(); // the "/" and whatever was typed as the search text
    const chip = chipElement(resolveRef(agentId, ref));
    range.insertNode(chip);
    const space = document.createTextNode(" ");
    chip.after(space);
    const caret = document.createRange();
    caret.setStart(space, 1);
    caret.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(caret);
    closeMenu();
    root.focus();
    emit();
  };

  const insertText = (text: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = fragmentFor(text, agentId);
    const last = frag.lastChild;
    range.insertNode(frag);
    if (last) { range.setStartAfter(last); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
    emit();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (menu && menuRef.current?.onKeyDown(e)) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key === "Enter") {
      // Browsers wrap new lines in <div>s; a plain <br> keeps the content a flat run of text + chips.
      e.preventDefault();
      document.execCommand("insertLineBreak");
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      const selected = rootRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
      if (selected) { e.preventDefault(); selected.remove(); emit(); }
    }
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>("[data-ref-token]");
    clearSelected();
    if (chip && rootRef.current?.contains(chip)) chip.dataset.selected = "true";
    if (slash.current) syncMenu(false);
  };

  const onCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return;
    // Copy the tokens, not the chips' visible text, so pasting back keeps the references.
    e.clipboardData.setData("text/plain", serializeNode(sel.getRangeAt(0).cloneContents(), true));
    e.preventDefault();
  };

  return (
    <>
      <div
        ref={rootRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Instructions"
        spellCheck={false}
        data-placeholder={placeholder}
        onInput={e => {
          clearSelected();
          emit();
          const ne = e.nativeEvent as InputEvent;
          syncMenu(ne.inputType === "insertText" && ne.data === "/");
        }}
        onKeyDown={onKeyDown}
        onKeyUp={() => { if (slash.current) syncMenu(false); }}
        onClick={onClick}
        onPaste={e => { e.preventDefault(); insertText(e.clipboardData.getData("text/plain")); }}
        onCopy={onCopy}
        onCut={e => { onCopy(e); document.execCommand("delete"); }}
        onFocus={refreshChips}
        onBlur={() => { clearSelected(); closeMenu(); }}
        className={`whitespace-pre-wrap break-words outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground ${className}`}
      />
      {menu && (
        <SlashMenu
          ref={menuRef}
          agentId={agentId}
          query={menu.query}
          anchor={menu.anchor}
          onPick={pick}
          onClose={closeMenu}
          onAdd={cat => { closeMenu(); onAdd?.(cat); }}
        />
      )}
    </>
  );
}
