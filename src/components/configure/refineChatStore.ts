// "Refine với AI" chat history, kept per Agent and per person (22/10), panel aligned with
// production console-agents.fpt.ai (30/10).
//
// Each person has one continuous thread per Agent (no "new chat", no reset), restored wherever
// they open that Agent again; nobody else sees it. The prototype has no backend, so localStorage
// stands in for "saved on the server".
//
// The AI run lives here, outside the panel: closing the panel or leaving the page mid-answer
// doesn't stop it, and the reply still lands in the history. While a run is going the Instructions
// are locked and the chat box is locked (the send button becomes Dừng).
//
// Production pattern (30/10): the assistant explains, calls tools ("Gọi công cụ read_file"), and
// for a change in Thủ công mode shows an approval card "Trợ lý muốn chạy một công cụ" (edit_file
// with old_string / new_string / file_path, Sửa tham số, Từ chối with an optional reason,
// Phê duyệt). In Tự động mode the tool just runs.
import { useEffect, useState } from "react";
import { currentPersona } from "@/lib/demoPersona";
import { instructionDraftStore } from "./instructionDraftStore";

export type RefineMsgRole = "user" | "ai";
export type RefineToolArgs = Record<string, string>;
export type RefineMsgBody =
  | { kind: "text"; role: RefineMsgRole; text: string; streaming?: boolean; full?: string; files?: string[] }
  /** A tool call row ("Gọi công cụ read_file"), expandable to its arguments. */
  | { kind: "tool"; name: string; args?: RefineToolArgs; done: boolean; outcome?: "approved" | "rejected"; reason?: string }
  /** Thủ công: the assistant asks before running a tool that changes something. Stays usable
   * until the person decides (also after closing the panel or coming back another day). */
  | { kind: "approval"; tool: string; args: RefineToolArgs; status: "pending" | "approved" | "rejected"; reason?: string; running?: boolean };
export type RefineMsg = RefineMsgBody & { id: string; at: number };

export type RefineApprovalMode = "manual" | "auto";

const CHAT_KEY = "refine_chat_v2";
const MODE_KEY = "refine_approval_mode_v1";
export const INSTRUCTIONS_FILE = "/work/memories/AGENTS.md";

type ChatMap = Record<string, RefineMsg[]>;

function load(): ChatMap {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || "{}") as ChatMap; } catch { return {}; }
}
let chats: ChatMap = load();
function save() {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(chats)); } catch { /* quota / private mode */ }
}

const listeners = new Map<string, Set<() => void>>();
const anyListeners = new Set<() => void>();
function emit(key: string) { listeners.get(key)?.forEach(fn => fn()); anyListeners.forEach(fn => fn()); }

/** A reply or tool step a reload interrupted is shown finished, never stuck spinning. */
function normalize(list: RefineMsg[]): RefineMsg[] {
  return list.map(m =>
    m.kind === "text" && m.streaming ? { ...m, text: m.full ?? m.text, streaming: false }
    : m.kind === "tool" && !m.done ? { ...m, done: true }
    : m.kind === "approval" && m.running ? { ...m, running: false }
    : m);
}
chats = Object.fromEntries(Object.entries(chats).map(([k, v]) => [k, normalize(v)]));

let seq = 0;
export const newMsgId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function textHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ── runs ────────────────────────────────────────────────────────────────────────────────────────
const running = new Map<string, { timers: number[]; streamId?: string }>();
const agentOfKey = (key: string) => key.split("::")[0];

export const refineChatStore = {
  /** One thread per Agent per person. A not-yet-saved Agent ("new") is keyed by the prompt it
   * was created from, so the creation chat carries on in Build. */
  key(agentId: string, seedPrompt?: string): string {
    const who = currentPersona().id;
    const agent = agentId === "new" ? `new:${seedPrompt ? textHash(seedPrompt) : "blank"}` : agentId;
    return `${agent}::${who}`;
  },
  has(key: string): boolean { return (chats[key]?.length ?? 0) > 0; },
  get(key: string): RefineMsg[] { return chats[key] ?? []; },
  set(key: string, list: RefineMsg[]) { chats = { ...chats, [key]: list }; save(); emit(key); },
  update(key: string, fn: (list: RefineMsg[]) => RefineMsg[]) { this.set(key, fn(this.get(key))); },
  hasForAgent(agentId: string): boolean { return this.has(this.key(agentId)); },
  /** Deleting an Agent deletes every person's thread on it. */
  removeAgent(agentId: string) {
    const prefix = `${agentId}::`;
    const keys = Object.keys(chats).filter(k => k.startsWith(prefix));
    if (!keys.length) return;
    chats = Object.fromEntries(Object.entries(chats).filter(([k]) => !k.startsWith(prefix)));
    save();
    keys.forEach(emit);
  },
  subscribe(key: string, fn: () => void) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => { listeners.get(key)?.delete(fn); };
  },
  subscribeAny(fn: () => void) { anyListeners.add(fn); return () => { anyListeners.delete(fn); }; },

  isRunning(key: string) { return running.has(key); },
  /** Any run on this Agent (by anyone in this browser) - locks the Instructions. */
  isAgentRunning(agentId: string) {
    return [...running.keys()].some(k => (agentId === "new" ? agentOfKey(k).startsWith("new:") : agentOfKey(k) === agentId));
  },
  hasPendingApproval(key: string) { return this.get(key).some(m => m.kind === "approval" && m.status === "pending"); },

  /** Chế độ duyệt - saved per person for later sessions. Default Tự động. */
  getMode(): RefineApprovalMode {
    try {
      const raw = JSON.parse(localStorage.getItem(MODE_KEY) || "{}") as Record<string, RefineApprovalMode>;
      return raw[currentPersona().id] ?? "auto";
    } catch { return "auto"; }
  },
  setMode(mode: RefineApprovalMode) {
    try {
      const raw = JSON.parse(localStorage.getItem(MODE_KEY) || "{}") as Record<string, RefineApprovalMode>;
      raw[currentPersona().id] = mode;
      localStorage.setItem(MODE_KEY, JSON.stringify(raw));
    } catch { /* ignore */ }
  },
};

// ── simulated assistant (prototype) ─────────────────────────────────────────────────────────────
const push = (key: string, body: RefineMsgBody, id = newMsgId()) => {
  refineChatStore.update(key, l => [...l, { id, at: Date.now(), ...body } as RefineMsg]);
  return id;
};
const patch = (key: string, id: string, p: Partial<RefineMsgBody>) =>
  refineChatStore.update(key, l => l.map(m => (m.id === id ? ({ ...m, ...p } as RefineMsg) : m)));

function begin(key: string) { running.set(key, { timers: [] }); emit(key); }
function end(key: string) { running.delete(key); emit(key); }
function later(key: string, ms: number, fn: () => void) {
  const r = running.get(key);
  if (!r) return;
  r.timers.push(window.setTimeout(() => { if (running.has(key)) fn(); }, ms));
}
function say(key: string, text: string, then?: () => void, delay = 0) {
  later(key, delay, () => {
    const id = push(key, { kind: "text", role: "ai", text: "", streaming: true, full: text });
    const r = running.get(key);
    if (r) r.streamId = id;
    let i = 0;
    const step = () => {
      if (!running.has(key)) return;
      i += 3;
      if (i >= text.length) { patch(key, id, { text, streaming: false }); if (r) r.streamId = undefined; then?.(); return; }
      patch(key, id, { text: text.slice(0, i) });
      later(key, 16, step);
    };
    later(key, 16, step);
  });
}
function tool(key: string, name: string, args: RefineToolArgs | undefined, then: () => void, effect?: () => void) {
  later(key, 250, () => {
    const id = push(key, { kind: "tool", name, args, done: false });
    later(key, 900, () => { effect?.(); patch(key, id, { done: true }); then(); });
  });
}

/** What the person wants added, read from their message ("...: <dòng cần thêm>"). */
function wantedLine(msg: string) {
  const after = msg.includes(":") ? msg.slice(msg.lastIndexOf(":") + 1) : msg;
  const s = after.trim().replace(/[.。]+$/, "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) + "." : "Trả lời ngắn gọn, đi thẳng vào việc.";
}
function editArgs(instr: string, line: string): RefineToolArgs {
  const lines = instr.split("\n").map(l => l.trimEnd()).filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  const bullet = last.startsWith("- ") ? "- " : "";
  return { old_string: last, new_string: `${last}\n${bullet}${line}`, file_path: INSTRUCTIONS_FILE };
}
function applyEdit(agentId: string, getInstr: () => string, args: RefineToolArgs) {
  const cur = getInstr();
  const next = args.old_string && cur.includes(args.old_string) ? cur.replace(args.old_string, args.new_string) : `${cur.trimEnd()}\n\n${args.new_string}`;
  instructionDraftStore.set(agentId, next);
}

export interface RunCtx { agentId: string; getInstructions: () => string }

export const refineAssistant = {
  send(key: string, ctx: RunCtx, text: string, files: string[] = []) {
    if (running.has(key)) return;
    // Typing instead of deciding: the pending tool call is declined in favour of the reply.
    refineChatStore.update(key, l => l.map(m => (m.kind === "approval" && m.status === "pending" ? { ...m, status: "rejected", reason: "Trả lời bằng tin nhắn" } as RefineMsg : m)));
    push(key, { kind: "text", role: "user", text, files: files.length ? files : undefined });
    begin(key);
    const line = wantedLine(text);
    say(key, "Mình sẽ đọc Instructions hiện tại trước khi sửa.", () =>
      tool(key, "read_file", { file_path: INSTRUCTIONS_FILE }, () =>
        say(key, `Thêm dòng "${line.replace(/\.$/, "")}" vào cuối Instructions.`, () => {
          const args = editArgs(ctx.getInstructions(), line);
          if (refineChatStore.getMode() === "auto") {
            tool(key, "edit_file", args, () => say(key, "Đã cập nhật Instructions trên bản nháp. Thay đổi có hiệu lực khi bạn Publish.", () => end(key)),
              () => applyEdit(ctx.agentId, ctx.getInstructions, args));
          } else {
            later(key, 200, () => { push(key, { kind: "approval", tool: "edit_file", args, status: "pending" }); end(key); });
          }
        })), 500);
  },
  decide(key: string, ctx: RunCtx, id: string, approve: boolean, reason?: string, args?: RefineToolArgs) {
    const card = refineChatStore.get(key).find(m => m.id === id);
    if (!card || card.kind !== "approval" || card.status !== "pending" || running.has(key)) return;
    const finalArgs = args ?? card.args;
    patch(key, id, { status: approve ? "approved" : "rejected", reason: reason?.trim() || undefined, args: finalArgs } as Partial<RefineMsgBody>);
    begin(key);
    if (approve) {
      // The card itself turns into the running "Gọi công cụ edit_file" row - no second row.
      patch(key, id, { running: true } as Partial<RefineMsgBody>);
      later(key, 900, () => {
        applyEdit(ctx.agentId, ctx.getInstructions, finalArgs);
        patch(key, id, { running: false } as Partial<RefineMsgBody>);
        say(key, "Đã cập nhật Instructions trên bản nháp. Thay đổi có hiệu lực khi bạn Publish.", () => end(key), 200);
      });
    } else {
      say(key, reason?.trim()
        ? `Mình chưa thay đổi gì vì bạn từ chối ("${reason.trim()}"). Bạn muốn chỉnh lại thế nào?`
        : "Mình chưa thay đổi gì. Bạn muốn chỉnh lại thế nào?", () => end(key), 400);
    }
  },
  /** Dừng: stops the run; what was already said stays, a half-written answer is kept as is. */
  stop(key: string) {
    const r = running.get(key);
    if (!r) return;
    r.timers.forEach(t => clearTimeout(t));
    if (r.streamId) patch(key, r.streamId, { streaming: false, full: undefined });
    refineChatStore.update(key, l => l.map(m => (m.kind === "tool" && !m.done ? { ...m, done: true } as RefineMsg
      : m.kind === "approval" && m.running ? { ...m, running: false } as RefineMsg : m)));
    end(key);
    push(key, { kind: "text", role: "ai", text: "Đã dừng theo yêu cầu của bạn." });
  },
};

/** The thread for `key`, re-rendering on every change (including replies that finish after the
 * panel was closed). `seed` fills an empty thread once - the opening chat of a new Agent. */
export function useRefineChat(key: string, seed?: () => RefineMsg[]): RefineMsg[] {
  const [, force] = useState(0);
  useEffect(() => refineChatStore.subscribe(key, () => force(n => n + 1)), [key]);
  if (!refineChatStore.has(key) && seed) {
    const initial = seed();
    if (initial.length) { chats = { ...chats, [key]: initial }; save(); }
  }
  return refineChatStore.get(key);
}

/** Re-render on any Refine run starting/stopping (Instructions lock, header "Đang dựng..."). */
export function useRefineRunning(agentId: string): boolean {
  const [, force] = useState(0);
  useEffect(() => refineChatStore.subscribeAny(() => force(n => n + 1)), []);
  return refineChatStore.isAgentRunning(agentId);
}
