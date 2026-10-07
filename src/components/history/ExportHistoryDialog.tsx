import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CHANNEL_META, type ConversationRecord } from "./historyStore";
import { buildTrace } from "./traceStore";
import { getAgent } from "@/components/configure/agentStore";
import { auditLogStore } from "@/components/governance/auditLogStore";
import { currentPersona } from "@/lib/demoPersona";

/**
 * Export for Agent → Insights → History. Always exports exactly the conversations in the
 * current filtered view (search, channel, time, feedback) — the dialog restates those filters so
 * nobody sends a customer "last 7 days on Zalo" when they meant "everything".
 *
 * Three levels, one per job the export is for (decided 07/10/2026 — see
 * claude/BRAINSTORM_Export_History_Feedback.md):
 * - conversation → reports for the customer,
 * - message      → audit / archive,
 * - rated        → Builder finding answers to fix. Users rate individual agent bubbles, so each
 *                  liked/disliked bubble is its own row, with the turn and bubble position.
 * Every export is written to the Governance audit log.
 */

export type ExportLevel = "conversation" | "message" | "rated";
type ExportFormat = "xlsx" | "csv";

const LEVELS: { id: ExportLevel; title: string; desc: string; slug: string }[] = [
  {
    id: "conversation",
    title: "One row per conversation",
    desc: "Dates, channel, user, turns, latency, tokens, likes and dislikes. Best for reports.",
    slug: "conversations",
  },
  {
    id: "message",
    title: "One row per message",
    desc: "Every customer and agent message, with tool calls and feedback. Best for audits.",
    slug: "messages",
  },
  {
    id: "rated",
    title: "Rated messages only",
    desc: "Each agent message a user liked or disliked, with the question before it and the user's reason. Best for finding answers to fix.",
    slug: "feedback",
  },
];

const fmt = (ms: number) => format(new Date(ms), "dd/MM/yyyy HH:mm");

function turnLookup(c: ConversationRecord) {
  const trace = buildTrace(c);
  const byMsg = new Map<string, { turn: number; bubble: number; question: string }>();
  for (const t of trace.turns) {
    t.agentMessages.forEach((m, i) => byMsg.set(m.id, { turn: t.index, bubble: i + 1, question: t.customer?.content ?? "" }));
    if (t.customer) byMsg.set(t.customer.id, { turn: t.index, bubble: 0, question: t.customer.content });
  }
  return { trace, byMsg };
}

function buildRows(convs: ConversationRecord[], level: ExportLevel, mask: boolean): (string | number)[][] {
  const alias = new Map<string, string>();
  const who = (c: ConversationRecord) => {
    if (!mask) return { user: c.username, email: c.email ?? "" };
    if (!alias.has(c.username)) alias.set(c.username, `User ${alias.size + 1}`);
    return { user: alias.get(c.username)!, email: "" };
  };

  if (level === "conversation") {
    const header = ["Conversation ID", "Started", "Ended", "Channel", "User", "Email", "Turns", "Messages", "Latency P50 (s)", "Tokens", "Likes", "Dislikes", "Last error"];
    return [header, ...convs.map(c => {
      const t = buildTrace(c);
      const { user, email } = who(c);
      const tokens = t.totals.tokensIn + t.totals.tokensCacheRead + t.totals.tokensOut + t.totals.tokensReasoning;
      return [
        c.id, fmt(c.startedAt), fmt(c.endedAt), CHANNEL_META[c.channel].label, user, email,
        t.turns.length, c.messages.length, +(t.totals.p50LatencyMs / 1000).toFixed(2), tokens,
        c.messages.filter(m => m.feedback === "up").length, c.messages.filter(m => m.feedback === "down").length,
        c.error ?? "",
      ];
    })];
  }

  if (level === "message") {
    const header = ["Conversation ID", "Message ID", "Turn", "Role", "Time", "Content", "Tool calls", "Feedback", "Feedback reason", "Channel", "User", "Email"];
    const rows: (string | number)[][] = [header];
    for (const c of convs) {
      const { byMsg } = turnLookup(c);
      const { user, email } = who(c);
      for (const m of c.messages) {
        rows.push([
          c.id, m.id, byMsg.get(m.id)?.turn ?? "", m.role === "agent" ? "Agent" : "Customer", fmt(m.at), m.content,
          (m.toolCalls ?? []).map(tc => `${tc.name} (${tc.status === "failed" ? "failed" : "ok"})`).join("; "),
          m.feedback === "up" ? "Like" : m.feedback === "down" ? "Dislike" : "",
          m.feedbackComment ?? "", CHANNEL_META[c.channel].label, user, email,
        ]);
      }
    }
    return rows;
  }

  const header = ["Conversation ID", "Message ID", "Turn", "Message in turn", "Rating", "Reason", "Customer question", "Agent message", "Rated message time", "Channel", "User", "Email"];
  const rows: (string | number)[][] = [header];
  for (const c of convs) {
    const { byMsg } = turnLookup(c);
    const { user, email } = who(c);
    for (const m of c.messages) {
      if (m.role !== "agent" || !m.feedback) continue;
      const pos = byMsg.get(m.id);
      rows.push([
        c.id, m.id, pos?.turn ?? "", pos?.bubble ?? "", m.feedback === "up" ? "Like" : "Dislike", m.feedbackComment ?? "",
        pos?.question ?? "", m.content, fmt(m.at), CHANNEL_META[c.channel].label, user, email,
      ]);
    }
  }
  return rows;
}

export function countRows(convs: ConversationRecord[], level: ExportLevel) {
  if (level === "conversation") return convs.length;
  if (level === "message") return convs.reduce((n, c) => n + c.messages.length, 0);
  return convs.reduce((n, c) => n + c.messages.filter(m => m.role === "agent" && m.feedback).length, 0);
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase();

export function ExportHistoryDialog({
  open, onOpenChange, agentId, conversations, filterChips, range,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  conversations: ConversationRecord[];
  /** Human-readable active filters, e.g. ["Channel: Zalo", "Last 7 days"]. Empty = no filters. */
  filterChips: string[];
  /** Date span for the file name: the time filter's bounds, else the conversations' own span. */
  range: { from: number; to: number } | null;
}) {
  const [level, setLevel] = useState<ExportLevel>("conversation");
  const [fileFormat, setFileFormat] = useState<ExportFormat>("xlsx");
  const [mask, setMask] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries(LEVELS.map(l => [l.id, countRows(conversations, l.id)])) as Record<ExportLevel, number>,
    [conversations],
  );
  const rowCount = counts[level];
  const agentName = getAgent(agentId).name;

  const doExport = () => {
    if (rowCount === 0) return;
    const rows = buildRows(conversations, level, mask);
    const span = range ?? (conversations.length
      ? { from: Math.min(...conversations.map(c => c.startedAt)), to: Math.max(...conversations.map(c => c.endedAt)) }
      : { from: Date.now(), to: Date.now() });
    const lvl = LEVELS.find(l => l.id === level)!;
    const fileName = `${slugify(agentName)}_${lvl.slug}_${format(span.from, "yyyyMMdd")}-${format(span.to, "yyyyMMdd")}.${fileFormat}`;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = (rows[0] as string[]).map(h => ({ wch: /Content|message|question|Reason|error/i.test(h) ? 60 : Math.max(12, h.length + 4) }));
    if (fileFormat === "xlsx") {
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lvl.slug);
      XLSX.writeFile(wb, fileName);
    } else {
      // BOM so Excel opens Vietnamese text correctly.
      const blob = new Blob(["﻿" + XLSX.utils.sheet_to_csv(ws)], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    const me = currentPersona();
    auditLogStore.log({
      at: Date.now(),
      actorId: me.id,
      actorName: me.name,
      action: "exported",
      resourceType: "agent",
      resourceId: agentId,
      resourceName: agentName,
      detail: `${lvl.title} · ${rowCount} rows · ${filterChips.length ? filterChips.join(" · ") : "No filters"}${mask ? " · Names and emails hidden" : ""}`,
    });

    toast.success(`Exported ${rowCount} ${rowCount === 1 ? "row" : "rows"} to ${fileName}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export conversations</DialogTitle>
          <DialogDescription>Exports exactly the {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"} in your current view.</DialogDescription>
        </DialogHeader>

        {/* What's included */}
        {filterChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {filterChips.map(f => <span key={f} className="chip chip-muted !h-6 !text-xs">{f}</span>)}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-[hsl(var(--warning-strong))]">
            <AlertTriangle size={14} className="shrink-0 mt-px" aria-hidden />
            No filters applied — this exports every conversation for this agent.
          </div>
        )}

        {/* Level */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-2">What to export</legend>
          {LEVELS.map(l => {
            const n = counts[l.id];
            const active = level === l.id;
            return (
              <label
                key={l.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-base focus-within:ring-2 focus-within:ring-primary/40",
                  active ? "border-primary bg-primary-soft/50" : "border-border hover:bg-surface-muted",
                )}
              >
                <input
                  type="radio"
                  name="export-level"
                  value={l.id}
                  checked={active}
                  onChange={() => setLevel(l.id)}
                  className="mt-1 accent-[hsl(var(--primary))]"
                />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{l.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{n} {n === 1 ? "row" : "rows"}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">{l.desc}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {/* Format + privacy */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <fieldset className="flex items-center gap-1 bg-surface-muted rounded-lg p-0.5 border border-border">
            <legend className="sr-only">File format</legend>
            {([
              { id: "xlsx", label: "Excel (.xlsx)" },
              { id: "csv", label: "CSV" },
            ] as const).map(o => (
              <label
                key={o.id}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-base focus-within:ring-2 focus-within:ring-primary/40",
                  fileFormat === o.id ? "bg-white shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input type="radio" name="export-format" value={o.id} checked={fileFormat === o.id} onChange={() => setFileFormat(o.id)} className="sr-only" />
                {o.label}
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={mask} onChange={e => setMask(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Hide names and emails
          </label>
        </div>

        {rowCount === 0 && (
          <p className="text-xs text-muted-foreground">
            {level === "rated" ? "No one has liked or disliked a message in these conversations yet." : "Nothing to export with these filters."}
          </p>
        )}

        <DialogFooter className="items-center sm:justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck size={13} aria-hidden /> Recorded in the Audit log
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm transition-base focus-ring">
              Cancel
            </button>
            <button
              type="button"
              onClick={doExport}
              disabled={rowCount === 0}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
            >
              <Download size={14} aria-hidden /> Export {rowCount} {rowCount === 1 ? "row" : "rows"}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
