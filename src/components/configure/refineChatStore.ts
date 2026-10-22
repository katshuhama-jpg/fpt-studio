// "Refine với AI" chat history, kept per Agent and per person (22/10).
//
// Before: the chat lived in the panel's React state, so it survived closing/reopening the panel
// but was gone after a reload, after leaving the Agent, or on another device. Now each person
// has one continuous thread per Agent (no "new chat" button - by decision), restored wherever
// they open that Agent again. Another person editing the same Agent never sees it.
//
// The prototype has no backend, so localStorage stands in for "saved on the server": it
// survives reloads and closing the browser. The AI reply runs here, outside the panel, so
// closing the panel or leaving the page mid-answer doesn't stop it - the reply still lands in
// the history. A full page reload does kill the timers; on load any reply caught half-way is
// completed from the text it was going to show (see normalize()).
import { useEffect, useState } from "react";
import { currentPersona } from "@/lib/demoPersona";

export type RefineMsgRole = "user" | "ai";
export interface RefineClarifyOption { icon: string; title: string; desc: string }
export type RefineMsgBody =
  | { kind: "text"; role: RefineMsgRole; text: string; streaming?: boolean; full?: string }
  | { kind: "tool"; name: string; done: boolean }
  /** A proposed change. `baseHash` fingerprints the Instructions it was written against, so a
   * proposal left pending goes stale once the Instructions change. */
  | { kind: "diff"; before?: string; after: string; applied?: boolean; dismissed?: boolean; baseHash?: string }
  | { kind: "clarify"; question: string; options: RefineClarifyOption[]; answered?: string }
  | { kind: "connector"; service: string; logo: string; perms: string[]; connected?: boolean; skipped?: boolean };
export type RefineMsg = RefineMsgBody & { id: string; at: number };

export type RefineApprovalMode = "manual" | "auto";

const CHAT_KEY = "refine_chat_v1";
const MODE_KEY = "refine_approval_mode_v1";

type ChatMap = Record<string, RefineMsg[]>;

function load(): ChatMap {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || "{}") as ChatMap; } catch { return {}; }
}
let chats: ChatMap = load();
function save() {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(chats)); } catch { /* quota / private mode */ }
}

const listeners = new Map<string, Set<() => void>>();
function emit(key: string) { listeners.get(key)?.forEach(fn => fn()); }

/** A reply or tool step that a reload interrupted is shown as finished, never stuck spinning. */
function normalize(list: RefineMsg[]): RefineMsg[] {
  return list.map(m =>
    m.kind === "text" && m.streaming ? { ...m, text: m.full ?? m.text, streaming: false }
    : m.kind === "tool" && !m.done ? { ...m, done: true }
    : m);
}
chats = Object.fromEntries(Object.entries(chats).map(([k, v]) => [k, normalize(v)]));

let seq = 0;
export const newMsgId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Short stable fingerprint of a text (djb2) - enough to tell "Instructions changed". */
export function textHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const refineChatStore = {
  /** One thread per Agent per person. A brand-new, not-yet-saved Agent ("new") is keyed by the
   * prompt it was created from, so the chat started while creating it carries on in Build and
   * two different new Agents don't share a thread. */
  key(agentId: string, seedPrompt?: string): string {
    const who = currentPersona().id;
    const agent = agentId === "new" ? `new:${seedPrompt ? textHash(seedPrompt) : "blank"}` : agentId;
    return `${agent}::${who}`;
  },
  has(key: string): boolean { return (chats[key]?.length ?? 0) > 0; },
  get(key: string): RefineMsg[] { return chats[key] ?? []; },
  set(key: string, list: RefineMsg[]) { chats = { ...chats, [key]: list }; save(); emit(key); },
  update(key: string, fn: (list: RefineMsg[]) => RefineMsg[]) { this.set(key, fn(this.get(key))); },
  subscribe(key: string, fn: () => void) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => { listeners.get(key)?.delete(fn); };
  },

  /** Chế độ duyệt - saved per person for later sessions (same as production). Default Tự động. */
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
