import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format, differenceInCalendarDays } from "date-fns";
import { Download, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CHANNEL_META, type ConversationRecord } from "./historyStore";
import { buildTrace } from "./traceStore";
import { auditLogStore } from "@/components/governance/auditLogStore";
import { currentPersona } from "@/lib/demoPersona";

/**
 * Export for Agent → Insights → History and External Agent → History. Always exports exactly
 * the conversations in the current filtered view (search, channel, time, feedback) - the dialog
 * restates those filters so nobody sends a customer "last 7 days on Zalo" when they meant
 * something else.
 *
 * Rules (confirmed with Tyler 15/10/2026):
 * - Space Admin only (Role holding "Export conversation data", always Space-wide). Callers hide
 *   the button for everyone else.
 * - At most 90 days per export: the time filter must be a range of 90 days or less ("Mọi thời
 *   gian" is blocked). Nothing is cut silently - the Admin narrows the filter.
 * - "Ẩn tên và email" is on by default.
 * - Users can leave a comment on a like as well as a dislike.
 *
 * Three levels, one per job the export is for:
 * - conversation → reports for the customer,
 * - message      → audit / archive,
 * - rated        → finding answers to fix. Users rate individual agent bubbles, so each rated
 *                  bubble is its own row, with the turn and bubble position.
 * Every export is written to the Governance audit log.
 */

export type ExportLevel = "conversation" | "message" | "rated";
type ExportFormat = "xlsx" | "csv";
/** For "Chỉ tin nhắn được đánh giá": every rated bubble, or just the disliked ones. */
export type RatedScope = "all" | "down";
/** External Agents report no latency, tokens, errors or tool calls - those columns are left out. */
export type ExportSource = "agent" | "external";

export const MAX_EXPORT_DAYS = 90;

const isRated = (m: ConversationRecord["messages"][number], scope: RatedScope) =>
  m.role === "agent" && !!m.feedback && (scope === "all" || m.feedback === "down");

const LEVELS: { id: ExportLevel; title: string; desc: Record<ExportSource, string>; slug: string }[] = [
  {
    id: "conversation",
    title: "Mỗi cuộc trò chuyện một dòng",
    desc: {
      agent: "Thời gian, kênh, người dùng, số lượt, độ trễ, tokens, số like và dislike. Phù hợp để báo cáo.",
      external: "Thời gian, kênh, người dùng, số lượt, số like và dislike. Phù hợp để báo cáo.",
    },
    slug: "hoi-thoai",
  },
  {
    id: "message",
    title: "Mỗi tin nhắn một dòng",
    desc: {
      agent: "Toàn bộ tin nhắn của người dùng và Agent, kèm Tool đã gọi, like/dislike và comment. Phù hợp để lưu trữ và audit.",
      external: "Toàn bộ tin nhắn của người dùng và Agent, kèm like/dislike và comment. Phù hợp để lưu trữ và audit.",
    },
    slug: "tin-nhan",
  },
  {
    id: "rated",
    title: "Chỉ tin nhắn được đánh giá",
    desc: {
      agent: "Mỗi câu trả lời được like hoặc dislike, kèm câu hỏi ngay trước đó và comment của người dùng. Phù hợp để tìm câu trả lời cần sửa.",
      external: "Mỗi câu trả lời được like hoặc dislike, kèm câu hỏi ngay trước đó và comment của người dùng. Phù hợp để tìm câu trả lời cần sửa.",
    },
    slug: "phan-hoi",
  },
];

const fmt = (ms: number) => format(new Date(ms), "dd/MM/yyyy HH:mm");
const ratingVi = (f?: "up" | "down") => (f === "up" ? "Like" : f === "down" ? "Dislike" : "");

function turnLookup(c: ConversationRecord) {
  const trace = buildTrace(c);
  const byMsg = new Map<string, { turn: number; bubble: number; question: string }>();
  for (const t of trace.turns) {
    t.agentMessages.forEach((m, i) => byMsg.set(m.id, { turn: t.index, bubble: i + 1, question: t.customer?.content ?? "" }));
    if (t.customer) byMsg.set(t.customer.id, { turn: t.index, bubble: 0, question: t.customer.content });
  }
  return { trace, byMsg };
}

function buildRows(convs: ConversationRecord[], level: ExportLevel, mask: boolean, ratedScope: RatedScope, source: ExportSource): (string | number)[][] {
  const alias = new Map<string, string>();
  const who = (c: ConversationRecord) => {
    if (!mask) return { user: c.username, email: c.email ?? "" };
    if (!alias.has(c.username)) alias.set(c.username, `Người dùng ${alias.size + 1}`);
    return { user: alias.get(c.username)!, email: "" };
  };
  const internal = source === "agent";

  if (level === "conversation") {
    const header = [
      "ID cuộc trò chuyện", "Bắt đầu", "Kết thúc", "Kênh", "Người dùng", "Email", "Số lượt", "Số tin nhắn",
      ...(internal ? ["Độ trễ P50 (giây)", "Tokens"] : []), "Số like", "Số dislike", ...(internal ? ["Lỗi gần nhất"] : []),
    ];
    return [header, ...convs.map(c => {
      const t = buildTrace(c);
      const { user, email } = who(c);
      const tokens = t.totals.tokensIn + t.totals.tokensCacheRead + t.totals.tokensOut + t.totals.tokensReasoning;
      return [
        c.id, fmt(c.startedAt), fmt(c.endedAt), CHANNEL_META[c.channel].label, user, email, t.turns.length, c.messages.length,
        ...(internal ? [+(t.totals.p50LatencyMs / 1000).toFixed(2), tokens] : []),
        c.messages.filter(m => m.feedback === "up").length, c.messages.filter(m => m.feedback === "down").length,
        ...(internal ? [c.error ?? ""] : []),
      ];
    })];
  }

  if (level === "message") {
    const header = [
      "ID cuộc trò chuyện", "ID tin nhắn", "Lượt", "Vai trò", "Thời gian", "Nội dung", ...(internal ? ["Tool đã gọi"] : []),
      "Đánh giá", "Comment", "Kênh", "Người dùng", "Email",
    ];
    const rows: (string | number)[][] = [header];
    for (const c of convs) {
      const { byMsg } = turnLookup(c);
      const { user, email } = who(c);
      for (const m of c.messages) {
        rows.push([
          c.id, m.id, byMsg.get(m.id)?.turn ?? "", m.role === "agent" ? "Agent" : "Người dùng", fmt(m.at), m.content,
          ...(internal ? [(m.toolCalls ?? []).map(tc => `${tc.name} (${tc.status === "failed" ? "lỗi" : "ok"})`).join("; ")] : []),
          ratingVi(m.feedback), m.feedbackComment ?? "", CHANNEL_META[c.channel].label, user, email,
        ]);
      }
    }
    return rows;
  }

  const header = ["ID cuộc trò chuyện", "ID tin nhắn", "Lượt", "Thứ tự trong lượt", "Đánh giá", "Comment", "Câu hỏi của người dùng", "Câu trả lời của Agent", "Thời gian", "Kênh", "Người dùng", "Email"];
  const rows: (string | number)[][] = [header];
  for (const c of convs) {
    const { byMsg } = turnLookup(c);
    const { user, email } = who(c);
    for (const m of c.messages) {
      if (!isRated(m, ratedScope)) continue;
      const pos = byMsg.get(m.id);
      rows.push([
        c.id, m.id, pos?.turn ?? "", pos?.bubble ?? "", ratingVi(m.feedback), m.feedbackComment ?? "",
        pos?.question ?? "", m.content, fmt(m.at), CHANNEL_META[c.channel].label, user, email,
      ]);
    }
  }
  return rows;
}

export function countRows(convs: ConversationRecord[], level: ExportLevel, ratedScope: RatedScope = "all") {
  if (level === "conversation") return convs.length;
  if (level === "message") return convs.reduce((n, c) => n + c.messages.length, 0);
  return convs.reduce((n, c) => n + c.messages.filter(m => isRated(m, ratedScope)).length, 0);
}

/** Calendar days covered by the time filter, or null for "Mọi thời gian". */
export function rangeDays(range: { from: number; to: number } | null) {
  return range ? differenceInCalendarDays(range.to, range.from) + 1 : null;
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase();

export function ExportHistoryDialog({
  open, onOpenChange, agentId, agentName, source = "agent", conversations, filterChips, range, defaultDislikesOnly = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  agentName: string;
  source?: ExportSource;
  conversations: ConversationRecord[];
  /** Human-readable active filters, e.g. ["Kênh: Zalo", "7 ngày qua"]. Empty = no filters. */
  filterChips: string[];
  /** The time filter's bounds - null for "Mọi thời gian", which is over the 90-day limit. */
  range: { from: number; to: number } | null;
  /** True when the list is filtered to "Có dislike" - "Chỉ tin nhắn được đánh giá" then starts on dislikes. */
  defaultDislikesOnly?: boolean;
}) {
  const [level, setLevel] = useState<ExportLevel>("conversation");
  const [fileFormat, setFileFormat] = useState<ExportFormat>("xlsx");
  const [mask, setMask] = useState(true);
  const [ratedScope, setRatedScope] = useState<RatedScope>(defaultDislikesOnly ? "down" : "all");
  useEffect(() => {
    if (!open) return;
    setRatedScope(defaultDislikesOnly ? "down" : "all");
    setMask(true);
  }, [open, defaultDislikesOnly]);

  const counts = useMemo(
    () => Object.fromEntries(LEVELS.map(l => [l.id, countRows(conversations, l.id, ratedScope)])) as Record<ExportLevel, number>,
    [conversations, ratedScope],
  );
  const likeCount = countRows(conversations, "rated", "all") - countRows(conversations, "rated", "down");
  const dislikeCount = countRows(conversations, "rated", "down");
  const rowCount = counts[level];
  const days = rangeDays(range);
  const overLimit = days === null || days > MAX_EXPORT_DAYS;
  const canSubmit = rowCount > 0 && !overLimit;

  const doExport = () => {
    if (!canSubmit || !range) return;
    const rows = buildRows(conversations, level, mask, ratedScope, source);
    const lvl = LEVELS.find(l => l.id === level)!;
    const slug = level === "rated" && ratedScope === "down" ? "dislike" : lvl.slug;
    const fileName = `${slugify(agentName)}_${slug}_${format(range.from, "yyyyMMdd")}-${format(range.to, "yyyyMMdd")}.${fileFormat}`;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = (rows[0] as string[]).map(h => ({ wch: /Nội dung|Câu hỏi|Câu trả lời|Comment|Lỗi/.test(h) ? 60 : Math.max(12, h.length + 4) }));
    if (fileFormat === "xlsx") {
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, slug);
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
      resourceName: source === "external" ? `${agentName} (External Agent)` : agentName,
      detail: [
        level === "rated" && ratedScope === "down" ? "Chỉ tin nhắn bị dislike" : lvl.title,
        `${rowCount} dòng`,
        `Bộ lọc: ${filterChips.join(", ")}`,
        fileFormat === "xlsx" ? "Excel" : "CSV",
        mask ? "Đã ẩn tên và email" : "Có tên và email",
      ].join(" · "),
    });

    toast.success(`Đã xuất ${rowCount} dòng vào ${fileName}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu hội thoại</DialogTitle>
          <DialogDescription>Xuất đúng {conversations.length} cuộc trò chuyện đang hiển thị theo bộ lọc.</DialogDescription>
        </DialogHeader>

        {/* What's included */}
        {filterChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filterChips.map(f => <span key={f} className="chip chip-muted !h-6 !text-xs">{f}</span>)}
          </div>
        )}
        {overLimit && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-[hsl(var(--warning-strong))]">
            <AlertTriangle size={14} className="shrink-0 mt-px" aria-hidden />
            <span>
              {days === null
                ? "Mỗi lần xuất tối đa 90 ngày - Chọn khoảng thời gian ở bộ lọc Thời gian rồi xuất lại."
                : `Khoảng đã chọn dài ${days} ngày - Mỗi lần xuất tối đa 90 ngày, hãy thu hẹp bộ lọc Thời gian.`}
            </span>
          </div>
        )}

        {/* Level */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-2">Nội dung xuất</legend>
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
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{n} dòng</span>
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">{l.desc[source]}</span>
                  {l.id === "rated" && active && (likeCount + dislikeCount > 0) && (
                    <span role="radiogroup" aria-label="Loại đánh giá" className="mt-2 inline-flex items-center gap-1 bg-surface rounded-lg p-0.5 border border-border">
                      {([
                        { id: "all", label: `Like và dislike (${likeCount + dislikeCount})` },
                        { id: "down", label: `Chỉ dislike (${dislikeCount})` },
                      ] as const).map(o => (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={ratedScope === o.id}
                          onClick={e => { e.preventDefault(); setRatedScope(o.id); }}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-medium transition-base focus-ring tabular-nums",
                            ratedScope === o.id ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>

        {/* Format + privacy */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <fieldset className="flex items-center gap-1 bg-surface-muted rounded-lg p-0.5 border border-border">
            <legend className="sr-only">Định dạng file</legend>
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
            Ẩn tên và email
          </label>
        </div>

        {!overLimit && rowCount === 0 && (
          <p className="text-xs text-muted-foreground">
            {level === "rated"
              ? ratedScope === "down" && likeCount > 0
                ? "Không có tin nhắn bị dislike. Chọn Like và dislike để xuất các tin nhắn được like."
                : "Chưa có tin nhắn nào được like hoặc dislike trong các cuộc trò chuyện này."
              : "Không có dữ liệu để xuất với bộ lọc này."}
          </p>
        )}

        <DialogFooter className="items-center sm:justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck size={13} aria-hidden /> Được ghi vào Audit log
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm transition-base focus-ring">
              Hủy
            </button>
            <button
              type="button"
              onClick={doExport}
              disabled={!canSubmit}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
            >
              <Download size={14} aria-hidden /> Xuất {rowCount} dòng
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
