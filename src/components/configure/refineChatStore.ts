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
// Production pattern (30/10): the assistant explains, calls tools, and for a change in Thủ công
// mode asks for approval (Từ chối with an optional reason, Phê duyệt). In Tự động mode the tool
// just runs.
//
// What the person sees (27/11, Refine with AI chỉ hiện thông tin cần thiết): every tool call is
// shown as a short step in plain words ("Đọc Instructions hiện tại"), never the tool name, its
// arguments, file paths or raw logs. Every change - waiting for approval or already applied - is
// shown as "what changes" (lines added / removed) plus "why". Tool names and args stay in the
// data only so the change can be applied.
//
// Several Builders on one Agent (Tyler 30/10):
// - One Refine với AI run per Agent at a time. While A's assistant works - or A's approval card
//   waits - B sees "A đang Refine với AI từ 9:00", can draft a request but sends it once A is done
//   (B sends it himself). Nobody can take over.
// - An approval card left waiting gives the turn back after 10 minutes without A doing anything;
//   the card stays and is checked again when A decides.
// - Hand edits stay open to others. Just before the assistant changes the Instructions it checks
//   the exact text it wants to replace is still there: if yes it applies on top of the latest
//   text (and says someone changed another part); if not it stops - "Agent đã bị thay đổi thông
//   tin" - and applies nothing.
// - Khôi phục a version stops any Refine run on the Agent and any waiting card, same message.
// - Publish doesn't count as a change and doesn't stop anything.
import { useEffect, useState } from "react";
import { currentPersona, DEMO_PERSONAS } from "@/lib/demoPersona";
import { instructionDraftStore } from "./instructionDraftStore";
import { agentSkillStore } from "./agentSkillStore";
import { chatOptimizationStore } from "./chatOptimizationStore";

export type RefineMsgRole = "user" | "ai";
export type RefineToolArgs = Record<string, string>;
export type RefineMsgBody =
  | { kind: "text"; role: RefineMsgRole; text: string; streaming?: boolean; full?: string; files?: string[] }
  /** A step the assistant took. `label` is what the person reads; name/args are internal. A step
   * that changes something also carries `change` (what, in plain words) and `why`. */
  | { kind: "tool"; name: string; args?: RefineToolArgs; done: boolean; outcome?: "approved" | "rejected" | "stopped" | "failed"; reason?: string; label?: string; change?: string; why?: string; note?: string }
  /** Thủ công: the assistant asks before running a tool that changes something. Stays usable
   * until the person decides (also after closing the panel or coming back another day). */
  /** Kế hoạch - what the assistant is going to do for this request, ticked off as it goes
   * (production shows the same "Kế hoạch 0/6 việc" checklist). */
  | { kind: "plan"; items: RefinePlanItem[] }
  | { kind: "approval"; tool: string; args: RefineToolArgs; status: "pending" | "approved" | "rejected" | "stopped"; reason?: string; running?: boolean; label?: string; change?: string; why?: string };
export type RefinePlanStatus = "todo" | "doing" | "waiting" | "done" | "skipped";
export interface RefinePlanItem { text: string; status: RefinePlanStatus }
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
    : m.kind === "plan" && m.items.some(i => i.status === "doing" || i.status === "todo")
      ? { ...m, items: m.items.map(i => (i.status === "doing" || i.status === "todo" ? { ...i, status: "skipped" as const } : i)) }
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

// ── one run per Agent ─────────────────────────────────────────────────────────────────────────
// Saved in localStorage so every tab (every person, in the demo) sees who holds the turn.
const LOCK_KEY = "refine_lock_v1";
const DONE_KEY = "refine_done_v1";
export const PENDING_HOLD_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 5000;
const RUN_STALE_MS = 30000;
export interface RefineLock { personaId: string; name: string; since: number; last: number; state: "running" | "pending"; tab: string }
type LockMap = Record<string, RefineLock>;
const TAB_KEY = "refine_tab_id";
const tabId = (() => {
  try {
    let t = sessionStorage.getItem(TAB_KEY);
    if (!t) { t = Math.random().toString(36).slice(2); sessionStorage.setItem(TAB_KEY, t); }
    return t;
  } catch { return "tab"; }
})();
function readJSON<T>(k: string): T { try { return JSON.parse(localStorage.getItem(k) || "{}") as T; } catch { return {} as T; } }
function writeJSON(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
const readLocks = () => readJSON<LockMap>(LOCK_KEY);
function writeLock(agentId: string, lock: RefineLock | null) {
  const m = readLocks();
  if (lock) m[agentId] = lock; else delete m[agentId];
  writeJSON(LOCK_KEY, m);
  anyListeners.forEach(fn => fn());
}
function lockAlive(l: RefineLock, now = Date.now()) {
  return l.state === "running" ? now - l.last < RUN_STALE_MS : now - l.last < PENDING_HOLD_MS;
}
// This tab reloaded mid-run: the run is gone, so its "running" turn becomes the waiting card's
// turn (if one is left) or is given back.
{
  const m = readLocks();
  let changed = false;
  for (const [agent, l] of Object.entries(m)) {
    if (l.tab === tabId && l.state === "running") {
      const key = `${agent}::${l.personaId}`;
      const waiting = (chats[key] ?? []).some(x => x.kind === "approval" && x.status === "pending");
      if (waiting) m[agent] = { ...l, state: "pending", last: Date.now() }; else delete m[agent];
      changed = true;
    }
  }
  if (changed) writeJSON(LOCK_KEY, m);
}
const nameOf = (personaId: string) => DEMO_PERSONAS.find(p => p.id === personaId)?.name ?? "Người khác";

// ── runs ────────────────────────────────────────────────────────────────────────────────────────
const running = new Map<string, { timers: number[]; streamId?: string; beat?: number }>();
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
  set(key: string, list: RefineMsg[]) {
    // Write only this thread on top of what's saved - another tab (another person) may have
    // written theirs meanwhile.
    chats = { ...load(), ...Object.fromEntries([...running.keys()].map(k => [k, chats[k]]).filter(([, v]) => v)), [key]: list };
    save(); emit(key);
  },
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

  /** Someone else holding this Agent's Refine turn right now (null if free or it's me). */
  otherHolder(agentId: string): RefineLock | null {
    const l = readLocks()[agentOfKey(this.key(agentId))];
    if (!l || l.personaId === currentPersona().id || !lockAlive(l)) return null;
    return l;
  },
  /** Anyone holding the turn (for the Khôi phục warning). */
  holder(agentId: string): RefineLock | null {
    const l = readLocks()[agentId];
    return l && lockAlive(l) ? l : null;
  },
  /** "A đã Refine xong" - the last finished turn on this Agent by someone else. */
  lastDoneByOther(agentId: string): { name: string; at: number } | null {
    const d = readJSON<Record<string, { personaId: string; name: string; at: number }>>(DONE_KEY)[agentId];
    return d && d.personaId !== currentPersona().id ? d : null;
  },

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

function begin(key: string) {
  const agent = agentOfKey(key);
  const me = currentPersona();
  const prev = readLocks()[agent];
  const since = prev && prev.personaId === me.id && lockAlive(prev) ? prev.since : Date.now();
  writeLock(agent, { personaId: me.id, name: me.name, since, last: Date.now(), state: "running", tab: tabId });
  const beat = window.setInterval(() => {
    const l = readLocks()[agent];
    if (l && l.tab === tabId && l.state === "running") writeLock(agent, { ...l, last: Date.now() });
  }, HEARTBEAT_MS);
  running.set(key, { timers: [], beat });
  emit(key);
}
function end(key: string) {
  const r = running.get(key);
  if (r?.beat) clearInterval(r.beat);
  running.delete(key);
  const agent = agentOfKey(key);
  const l = readLocks()[agent];
  if (l && l.personaId === currentPersona().id) {
    if (refineChatStore.hasPendingApproval(key)) writeLock(agent, { ...l, state: "pending", last: Date.now() });
    else {
      writeLock(agent, null);
      const done = readJSON<Record<string, unknown>>(DONE_KEY);
      done[agent] = { personaId: l.personaId, name: l.name, at: Date.now() };
      writeJSON(DONE_KEY, done);
    }
  }
  emit(key);
}
function later(key: string, ms: number, fn: () => void) {
  const r = running.get(key);
  if (!r) return;
  r.timers.push(window.setTimeout(() => {
    if (!running.has(key)) return;
    const l = readLocks()[agentOfKey(key)];
    if (!l || l.personaId !== currentPersona().id) { abandon(key); return; }
    fn();
  }, ms));
}
/** The turn was taken away (Khôi phục in another tab): stop quietly, the other tab already
 * explained it in this thread. */
function abandon(key: string) {
  const r = running.get(key);
  if (!r) return;
  r.timers.forEach(t => clearTimeout(t));
  if (r.beat) clearInterval(r.beat);
  running.delete(key);
  refineChatStore.update(key, l => l.map(m => (m.kind === "text" && m.streaming ? { ...m, streaming: false, full: undefined } as RefineMsg
    : m.kind === "tool" && !m.done ? { ...m, done: true } as RefineMsg : m)));
  closePlan(key);
  emit(key);
}
/** Ticks item `i` of the latest plan in this thread. */
function planStep(key: string, i: number, status: RefinePlanStatus) {
  refineChatStore.update(key, l => {
    let idx = -1;
    for (let k = l.length - 1; k >= 0; k--) if (l[k].kind === "plan") { idx = k; break; }
    if (idx < 0) return l;
    const m = l[idx] as Extract<RefineMsg, { kind: "plan" }>;
    const items = m.items.map((it, j) => (j === i ? { ...it, status } : it));
    return l.map((x, k) => (k === idx ? ({ ...m, items } as RefineMsg) : x));
  });
}
/** A run that stops early leaves the plan items it didn't finish as "Bỏ qua". */
function closePlan(key: string) {
  refineChatStore.update(key, l => l.map(m => (m.kind === "plan" && m.items.some(i => i.status === "doing" || i.status === "todo")
    ? ({ ...m, items: m.items.map(i => (i.status === "doing" || i.status === "todo" ? { ...i, status: "skipped" as const } : i)) } as RefineMsg) : m)));
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
function tool(key: string, name: string, label: string, args: RefineToolArgs | undefined, then: () => void, effect?: () => void) {
  later(key, 250, () => {
    const id = push(key, { kind: "tool", name, label, args, done: false });
    later(key, 900, () => { effect?.(); patch(key, id, { done: true }); then(); });
  });
}

/** A step that didn't work out: shown with a short plain note, then the run carries on. */
function failedStep(key: string, name: string, label: string, note: string, then: () => void) {
  later(key, 250, () => {
    const id = push(key, { kind: "tool", name, label, done: false });
    later(key, 900, () => { patch(key, id, { done: true, outcome: "failed", note } as Partial<RefineMsgBody>); then(); });
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
const hhmm = (t: number) => new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const CHANGED_TAIL = "Trợ lý đã dừng và chưa áp dụng thay đổi này. Bạn gửi lại yêu cầu để trợ lý làm trên bản mới nhất.";
/** Applies the edit only if the exact text it replaces is still there. Returns what to tell the
 * person: null = applied, "other" = applied but someone changed another part meanwhile,
 * otherwise the "Agent đã bị thay đổi thông tin" message. */
function applyEdit(agentId: string, getInstr: () => string, args: RefineToolArgs, since: number): { ok: boolean; note?: string } {
  const cur = getInstr();
  const me = currentPersona().id;
  const last = instructionDraftStore.lastEdit(agentId);
  const byOther = last && last.byId !== me && last.at >= since ? last : undefined;
  if (args.old_string && !cur.includes(args.old_string)) {
    const who = byOther ? `${byOther.byName} vừa sửa đúng đoạn trợ lý định sửa (lúc ${hhmm(byOther.at)})` : "Đoạn trợ lý định sửa không còn trong Instructions";
    return { ok: false, note: `Agent đã bị thay đổi thông tin: ${who}. ${CHANGED_TAIL}` };
  }
  const next = args.old_string ? cur.replace(args.old_string, args.new_string) : `${cur.trimEnd()}\n\n${args.new_string}`;
  instructionDraftStore.set(agentId, next);
  return { ok: true, note: byOther ? `Lưu ý: ${byOther.byName} đã sửa Instructions ở đoạn khác lúc ${hhmm(byOther.at)}. Thay đổi của bạn được áp dụng lên bản mới nhất.` : undefined };
}

/** Why the change is made, in the person's own words (cut short). */
function changeWhy(request: string) {
  const t = request.trim().replace(/\s+/g, " ");
  return `Bạn yêu cầu: "${t.length > 140 ? `${t.slice(0, 140).trimEnd()}...` : t}"`;
}

export interface RunCtx { agentId: string; getInstructions: () => string }

/** The assistant answers in the language the person wrote in (27/11). The prototype only tells
 * Vietnamese from English. */
const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const isVi = (text: string) => VI_CHARS.test(text) || !/\b(the|add|please|make|always|never|should|when|with|to)\b/i.test(text);

/** What the request asks to change. The prototype recognises a new Skill; everything else goes to
 * the Instructions. */
type ChangePlan = { kind: "skill" | "instructions" | "field"; vi: boolean; args: RefineToolArgs; label: string; change: string; why: string; done: string; plan: string[] };
function planChange(text: string, instr: string, agentId = ""): ChangePlan {
  const agentIdFor = (_: string) => agentId;
  const vi = isVi(text);
  const T = (v: string, e: string) => (vi ? v : e);
  const why = vi ? changeWhy(text) : `You asked: "${text.trim().replace(/\s+/g, " ").slice(0, 140)}"`;
  const auto = refineChatStore.getMode() === "auto";
  if (/câu hỏi gợi ý|suggested question|starter question/i.test(text)) {
    // A field of the Nhân sự số: shown as old value -> new value. At most 3 questions.
    const q = wantedLine(text).replace(/\.$/, "").replace(/[?？]*$/, "?");
    const old = [...chatOptimizationStore.get(agentIdFor(instr)).opener.questions];
    const next = [...(old.length >= 3 ? old.slice(0, 2) : old), q];
    return {
      kind: "field", vi, why,
      args: { field: T("Câu hỏi gợi ý", "Suggested questions"), old_value: old.join("\n"), new_value: next.join("\n") },
      label: T("Sửa câu hỏi gợi ý", "Edit the suggested questions"),
      change: old.length >= 3 ? T("Thay câu hỏi gợi ý cuối bằng câu mới (tối đa 3 câu)", "Replace the last suggested question (3 at most)") : T("Thêm 1 câu hỏi gợi ý", "Add 1 suggested question"),
      done: T("Đã cập nhật câu hỏi gợi ý trên bản nháp. Thay đổi có hiệu lực khi bạn Publish.", "Updated the suggested questions in the draft. It takes effect when you Publish."),
      plan: [T("Xem câu hỏi gợi ý hiện có", "Check the current suggested questions"), T("Soạn câu hỏi mới theo yêu cầu của bạn", "Draft the new question"), auto ? T("Cập nhật câu hỏi gợi ý", "Update the suggested questions") : T("Cập nhật sau khi bạn duyệt", "Update after you approve")],
    };
  }
  if (/\b(skill|kỹ năng|ky nang)\b/i.test(text)) {
    const raw = wantedLine(text).replace(/\.$/, "");
    const name = raw.length > 48 ? `${raw.slice(0, 48).trimEnd()}...` : raw;
    return {
      kind: "skill", vi, why,
      args: { skill_name: name, skill_description: T(`Dùng khi người dùng cần: ${raw.charAt(0).toLowerCase()}${raw.slice(1)}.`, `Use when the user needs to: ${raw.charAt(0).toLowerCase()}${raw.slice(1)}.`) },
      label: T("Tạo Skill mới", "Create a new Skill"),
      change: T("Thêm 1 Skill mới cho Nhân sự số", "Add 1 new Skill to the Digital Worker"),
      done: T("Đã thêm Skill mới trên bản nháp. Thay đổi có hiệu lực khi bạn Publish.", "Added the new Skill to the draft. It takes effect when you Publish."),
      plan: [T("Xem các Skill đang có", "Check the existing Skills"), T("Soạn Skill mới theo yêu cầu của bạn", "Draft the new Skill"), auto ? T("Thêm Skill vào Nhân sự số", "Add the Skill") : T("Thêm Skill sau khi bạn duyệt", "Add the Skill after you approve")],
    };
  }
  const line = wantedLine(text);
  return {
    kind: "instructions", vi, why, args: editArgs(instr, line),
    label: T("Sửa Instructions", "Edit the Instructions"),
    change: T("Thêm 1 dòng vào cuối Instructions", "Add 1 line at the end of the Instructions"),
    done: T("Đã cập nhật Instructions trên bản nháp. Thay đổi có hiệu lực khi bạn Publish.", "Updated the Instructions in the draft. It takes effect when you Publish."),
    plan: [T("Đọc Instructions hiện tại", "Read the current Instructions"), T("Soạn thay đổi theo yêu cầu của bạn", "Draft the change"), auto ? T("Cập nhật Instructions", "Update the Instructions") : T("Cập nhật Instructions sau khi bạn duyệt", "Update the Instructions after you approve")],
  };
}
/** Applies a change: a new Skill is added; an Instructions edit goes through applyEdit's checks. */
function applyChange(agentId: string, getInstr: () => string, args: RefineToolArgs, since: number): { ok: boolean; note?: string } {
  if (args.field !== undefined) {
    const cur = chatOptimizationStore.get(agentId);
    chatOptimizationStore.set(agentId, { ...cur, opener: { ...cur.opener, questions: (args.new_value ?? "").split("\n").filter(Boolean) } });
    return { ok: true };
  }
  if (args.skill_name) {
    const me = currentPersona();
    agentSkillStore.create(agentId, { name: args.skill_name, description: args.skill_description ?? "", body: args.skill_description ?? "", ownerId: me.id, ownerName: me.name, sharing: { mode: "private", people: [] } });
    return { ok: true };
  }
  return applyEdit(agentId, getInstr, args, since);
}
const doneText = (args: RefineToolArgs, vi: boolean) => (args.field !== undefined
  ? (vi ? "Đã cập nhật câu hỏi gợi ý trên bản nháp. Thay đổi có hiệu lực khi bạn Publish." : "Updated the suggested questions in the draft. It takes effect when you Publish.")
  : args.skill_name
  ? (vi ? "Đã thêm Skill mới trên bản nháp. Thay đổi có hiệu lực khi bạn Publish." : "Added the new Skill to the draft. It takes effect when you Publish.")
  : (vi ? "Đã cập nhật Instructions trên bản nháp. Thay đổi có hiệu lực khi bạn Publish." : "Updated the Instructions in the draft. It takes effect when you Publish."));

export const refineAssistant = {
  send(key: string, ctx: RunCtx, text: string, files: string[] = []) {
    if (running.has(key) || refineChatStore.otherHolder(ctx.agentId)) return;
    // Typing instead of deciding: the pending change is declined in favour of the reply.
    refineChatStore.update(key, l => l.map(m => (m.kind === "approval" && m.status === "pending" ? { ...m, status: "rejected", reason: "Trả lời bằng tin nhắn" } as RefineMsg
      : m.kind === "plan" ? ({ ...m, items: m.items.map(i => (i.status === "waiting" ? { ...i, status: "skipped" as const } : i)) } as RefineMsg) : m)));
    push(key, { kind: "text", role: "user", text, files: files.length ? files : undefined });
    begin(key);
    const startedAt = Date.now();
    const cp = planChange(text, ctx.getInstructions(), ctx.agentId);
    const T = (v: string, e: string) => (cp.vi ? v : e);
    const auto = refineChatStore.getMode() === "auto";
    push(key, { kind: "plan", items: cp.plan.map((t, i) => ({ text: t, status: i === 0 ? "doing" : "todo" })) });

    const propose = () => {
      const change = { label: cp.label, change: cp.change, why: cp.why };
      planStep(key, 1, "done");
      planStep(key, 2, auto ? "doing" : "waiting");
      if (!auto) { later(key, 200, () => { push(key, { kind: "approval", tool: cp.kind === "skill" ? "create_skill" : cp.kind === "field" ? "update_config" : "edit_file", args: cp.args, status: "pending", ...change }); end(key); }); return; }
      later(key, 250, () => {
        const id = push(key, { kind: "tool", name: cp.kind === "skill" ? "create_skill" : cp.kind === "field" ? "update_config" : "edit_file", args: cp.args, done: false, ...change });
        later(key, 900, () => {
          const res = applyChange(ctx.agentId, ctx.getInstructions, cp.args, startedAt);
          if (!res.ok) {
            planStep(key, 2, "skipped");
            patch(key, id, { done: true, outcome: "stopped", reason: "Agent đã bị thay đổi thông tin" } as Partial<RefineMsgBody>);
            say(key, res.note!, () => end(key), 200);
            return;
          }
          patch(key, id, { done: true });
          planStep(key, 2, "done");
          say(key, [res.note, cp.done].filter(Boolean).join("\n\n"), () => end(key));
        });
      });
    };

    if (cp.kind === "skill") {
      // A step that doesn't work out is shown in plain words and the assistant moves on (27/11).
      say(key, T("Mình sẽ xem các Skill đang có trước khi tạo Skill mới.", "I'll check the existing Skills before creating a new one."), () =>
        tool(key, "list_skills", T("Xem các Skill đang có", "Check the existing Skills"), undefined, () =>
          failedStep(key, "search_library", T("Tìm Skill phù hợp trong thư viện của Space", "Look for a matching Skill in the Space library"),
            T("Chưa tìm thấy - trợ lý tự soạn Skill mới", "Nothing found - drafting a new Skill instead"), () => {
              planStep(key, 0, "done"); planStep(key, 1, "doing");
              say(key, T(`Mình đề xuất thêm Skill "${cp.args.skill_name}".`, `I suggest adding the Skill "${cp.args.skill_name}".`), propose);
            })), 500);
      return;
    }
    if (cp.kind === "field") {
      say(key, T("Mình sẽ xem câu hỏi gợi ý hiện có trước khi sửa.", "I'll check the current suggested questions first."), () =>
        tool(key, "read_config", T("Xem câu hỏi gợi ý hiện có", "Check the current suggested questions"), undefined, () => {
          planStep(key, 0, "done"); planStep(key, 1, "doing");
          say(key, T("Mình đề xuất sửa câu hỏi gợi ý như bên dưới.", "I suggest the change below."), propose);
        }), 500);
      return;
    }
    say(key, T("Mình sẽ đọc Instructions hiện tại trước khi sửa.", "I'll read the current Instructions before editing."), () =>
      tool(key, "ls", T("Xem cấu hình hiện có", "Check the current setup"), undefined, () => tool(key, "read_file", T("Đọc Instructions hiện tại", "Read the current Instructions"), { file_path: INSTRUCTIONS_FILE }, () => {
        planStep(key, 0, "done"); planStep(key, 1, "doing");
        say(key, T("Mình đề xuất thêm 1 dòng vào cuối Instructions.", "I suggest adding 1 line at the end of the Instructions."), propose);
      })), 500);
  },
  decide(key: string, ctx: RunCtx, id: string, approve: boolean, reason?: string, args?: RefineToolArgs) {
    const card = refineChatStore.get(key).find(m => m.id === id);
    if (!card || card.kind !== "approval" || card.status !== "pending" || running.has(key) || refineChatStore.otherHolder(ctx.agentId)) return;
    const finalArgs = args ?? card.args;
    const vi = !card.why || card.why.startsWith("Bạn yêu cầu");
    patch(key, id, { status: approve ? "approved" : "rejected", reason: reason?.trim() || undefined, args: finalArgs } as Partial<RefineMsgBody>);
    begin(key);
    if (approve) {
      // The card itself shows "Đang áp dụng" - no second row.
      patch(key, id, { running: true } as Partial<RefineMsgBody>);
      planStep(key, 2, "doing");
      later(key, 900, () => {
        const res = applyChange(ctx.agentId, ctx.getInstructions, finalArgs, card.at);
        if (!res.ok) {
          patch(key, id, { running: false, status: "stopped", reason: "Agent đã bị thay đổi thông tin" } as Partial<RefineMsgBody>);
          planStep(key, 2, "skipped");
          say(key, res.note!, () => end(key), 200);
          return;
        }
        patch(key, id, { running: false } as Partial<RefineMsgBody>);
        planStep(key, 2, "done");
        say(key, [res.note, doneText(finalArgs, vi)].filter(Boolean).join("\n\n"), () => end(key), 200);
      });
    } else {
      planStep(key, 2, "skipped");
      say(key, vi
        ? (reason?.trim() ? `Mình chưa thay đổi gì vì bạn từ chối ("${reason.trim()}"). Bạn muốn chỉnh lại thế nào?` : "Mình chưa thay đổi gì. Bạn muốn chỉnh lại thế nào?")
        : (reason?.trim() ? `Nothing was changed because you declined ("${reason.trim()}"). How would you like to adjust it?` : "Nothing was changed. How would you like to adjust it?"), () => end(key), 400);
    }
  },
  /** Dừng: stops the run; what was already said stays, a half-written answer is kept as is. */
  stop(key: string) {
    const r = running.get(key);
    if (!r) return;
    r.timers.forEach(t => clearTimeout(t));
    if (r.streamId) patch(key, r.streamId, { streaming: false, full: undefined });
    refineChatStore.update(key, l => l.map(m => (m.kind === "tool" && !m.done ? { ...m, done: true, outcome: "stopped", reason: "Bạn đã dừng" } as RefineMsg
      : m.kind === "approval" && m.running ? { ...m, running: false } as RefineMsg : m)));
    closePlan(key);
    end(key);
    push(key, { kind: "text", role: "ai", text: "Đã dừng theo yêu cầu của bạn." });
  },
  /** Khôi phục một phiên bản: every Refine run and waiting card on this Agent stops - nothing of
   * it is applied - and its owner is told why. */
  interruptAgent(agentId: string, why: string) {
    const prefix = `${agentId}::`;
    for (const key of Object.keys(chats).filter(k => k.startsWith(prefix))) {
      const r = running.get(key);
      const waiting = refineChatStore.hasPendingApproval(key);
      if (!r && !waiting) continue;
      if (r) {
        r.timers.forEach(t => clearTimeout(t));
        if (r.beat) clearInterval(r.beat);
        if (r.streamId) patch(key, r.streamId, { streaming: false, full: undefined });
        running.delete(key);
      }
      refineChatStore.update(key, l => l.map(m => (m.kind === "tool" && !m.done ? { ...m, done: true, outcome: "stopped", reason: "Agent đã bị thay đổi thông tin" } as RefineMsg
        : m.kind === "approval" && (m.status === "pending" || m.running) ? { ...m, status: "stopped", running: false, reason: "Agent đã bị thay đổi thông tin" } as RefineMsg : m)));
      closePlan(key);
      refineChatStore.update(key, l => l.map(m => (m.kind === "plan" ? ({ ...m, items: m.items.map(i => (i.status === "waiting" ? { ...i, status: "skipped" as const } : i)) } as RefineMsg) : m)));
      push(key, { kind: "text", role: "ai", text: `Agent đã bị thay đổi thông tin: ${why}. ${CHANGED_TAIL}` });
    }
    // Runs in another tab notice the turn is gone and stop at their next step.
    writeLock(agentId, null);
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

/** Re-render when the Agent's Refine turn changes hands - also from other tabs, and when a
 * waiting card's 10 minutes run out. */
export function useRefineLockTick(): void {
  const [, force] = useState(0);
  useEffect(() => {
    const bump = () => force(n => n + 1);
    const off = refineChatStore.subscribeAny(bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCK_KEY || e.key === DONE_KEY || e.key === CHAT_KEY) {
        if (e.key === CHAT_KEY) chats = Object.fromEntries(Object.entries(load()).map(([k, v]) => [k, running.has(k) ? (chats[k] ?? v) : normalize(v)]));
        bump();
        listeners.forEach(set => set.forEach(fn => fn()));
      }
    };
    window.addEventListener("storage", onStorage);
    const iv = window.setInterval(bump, 15000);
    return () => { off(); window.removeEventListener("storage", onStorage); clearInterval(iv); };
  }, []);
}

/** Re-render on any Refine run starting/stopping (Instructions lock, header "Đang dựng..."). */
export function useRefineRunning(agentId: string): boolean {
  const [, force] = useState(0);
  useEffect(() => refineChatStore.subscribeAny(() => force(n => n + 1)), []);
  return refineChatStore.isAgentRunning(agentId);
}
