import { createContext, useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon, ArrowRight01Icon, Analytics01Icon, Rocket01Icon, Plug01Icon } from "@hugeicons/core-free-icons";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { evaluationStore } from "@/components/evaluation/evaluationStore";
import { EmptyState } from "@/components/evaluation/shared";

/* =====================================================================================
 * Agent details → Insights: số liệu tổng hợp cho chủ Nhân sự số.
 * Sub-tab: Tổng quan / Sử dụng / Chất lượng / Người dùng hỏi gì / Hoạt động / Chi phí.
 * Dữ liệu mẫu, sinh cố định theo agentId (cùng một Nhân sự số luôn ra cùng số liệu).
 * - Chỉ tính hội thoại thật: bỏ kênh Chạy thử (builder và người dùng cuối đều tính).
 * - Khoảng thời gian: Hôm nay (theo giờ) / 7 ngày / 30 ngày (mặc định) / Tùy chọn
 *   (tối đa 30 ngày, chỉ chọn trong 90 ngày gần nhất). So với kỳ liền trước cùng độ dài.
 * - Số liệu cập nhật mỗi giờ; số của hôm nay là số tạm.
 * - Nhân sự số chạy bằng trigger hoặc Quy trình: "hội thoại" đổi thành "lượt chạy".
 * ===================================================================================== */

export type AnalyticsSection = "performance" | "usage" | "feedback" | "topics" | "operations" | "cost";
export type AnalyticsAgentKind = "conversational" | "automation" | "process";

const LOOKBACK = 90;   // chỉ chọn được trong 90 ngày gần nhất
const MAX_CUSTOM = 30; // Tùy chọn dài tối đa 30 ngày

/* ---------- ngữ cảnh: tên đơn vị đếm ---------- */
const NounCtx = createContext("hội thoại");
const useNoun = () => useContext(NounCtx);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- seeded sample data ---------- */
function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Day = {
  date: Date; day: string; hour?: number; sessions: number; users: number; newUsers: number; messages: number;
  resolved: number; abandoned: number; likes: number; dislikes: number; botBubbles: number;
  runs: number; errors: number; fallbacks: number; cited: number; tokens: number; tokensIn: number; p50: number; p95: number;
  csatN: number; csatSum: number;
};

/** Ngày Publish các version, tính theo số ngày trước hôm nay. */
const VERSIONS = [
  { version: "v1.2.0", daysAgo: 49 },
  { version: "v1.3.0", daysAgo: 28 },
  { version: "v1.4.0", daysAgo: 14 },
];

const CHANNELS = [
  { channel: "Workspace", share: 0.46 }, { channel: "Web widget", share: 0.27 }, { channel: "Zalo", share: 0.17 },
  { channel: "API", share: 0.07 }, { channel: "Teams", share: 0.03 },
];

/** change = null: chủ đề mới, kỳ trước chưa có. */
const TOPICS: { topic: string; share: number; answer: number; like: number; change: number | null }[] = [
  { topic: "Phí bảo hiểm và cách đóng phí", share: 0.21, answer: 93, like: 84, change: 12 },
  { topic: "Quy trình yêu cầu bồi thường", share: 0.18, answer: 88, like: 79, change: 25 },
  { topic: "Quyền lợi sản phẩm An Phúc Trọn Đời", share: 0.14, answer: 90, like: 83, change: 4 },
  { topic: "Tra cứu tình trạng hợp đồng", share: 0.12, answer: 82, like: 74, change: -6 },
  { topic: "Thay đổi thông tin hợp đồng", share: 0.09, answer: 71, like: 68, change: 9 },
  { topic: "Huỷ hợp đồng và giá trị hoàn lại", share: 0.07, answer: 58, like: 61, change: 38 },
  { topic: "Bảo hiểm sức khoẻ bổ trợ", share: 0.06, answer: 79, like: 80, change: -3 },
  { topic: "Đại lý và kênh mua", share: 0.05, answer: 86, like: 82, change: 2 },
  { topic: "Thuế thu nhập với quyền lợi bảo hiểm", share: 0.04, answer: 41, like: 52, change: null },
  { topic: "Khác", share: 0.04, answer: 69, like: 70, change: 0 },
];

const UNANSWERED = [
  { q: "Giá trị hoàn lại nếu huỷ hợp đồng năm thứ 3 là bao nhiêu?", topic: "Huỷ hợp đồng và giá trị hoàn lại", times: 34, reason: "Chưa có trong Knowledge", last: "Hôm nay" },
  { q: "Quyền lợi bảo hiểm có phải đóng thuế TNCN không?", topic: "Thuế thu nhập với quyền lợi bảo hiểm", times: 29, reason: "Chưa có trong Knowledge", last: "Hôm nay" },
  { q: "Đổi người thụ hưởng cần giấy tờ gì?", topic: "Thay đổi thông tin hợp đồng", times: 21, reason: "Trả lời sai", last: "Hôm qua" },
  { q: "Bồi thường nằm viện nội trú ở nước ngoài được không?", topic: "Quy trình yêu cầu bồi thường", times: 17, reason: "Chưa có trong Knowledge", last: "2 ngày trước" },
  { q: "Tra cứu hợp đồng theo số CCCD", topic: "Tra cứu tình trạng hợp đồng", times: 14, reason: "Tra cứu bị lỗi", last: "Hôm nay" },
  { q: "Đóng phí trễ hạn 60 ngày có mất hiệu lực không?", topic: "Phí bảo hiểm và cách đóng phí", times: 11, reason: "Trả lời sai", last: "4 ngày trước" },
];

const KNOWLEDGE = [
  { source: "Quy tắc sản phẩm An Phúc Trọn Đời.pdf", uses: 812, err: 0.4 },
  { source: "Quy tắc bồi thường 2026.docx", uses: 640, err: 0.9 },
  { source: "Biểu phí 2026.xlsx", uses: 522, err: 0.2 },
  { source: "FAQ chăm sóc khách hàng (web)", uses: 388, err: 2.8 },
  { source: "Hướng dẫn thay đổi hợp đồng.pdf", uses: 201, err: 0.5 },
  { source: "Chính sách thuế liên quan (2024).pdf", uses: 0, err: 0 },
];

const TOOLS = [
  { tool: "Tra cứu hợp đồng (Core Insurance API)", calls: 948, ok: 93.1, error: "Hết thời gian chờ (504)", p95: 3.4 },
  { tool: "Tính phí dự kiến", calls: 512, ok: 99.2, error: "Thiếu tuổi khách hàng", p95: 0.9 },
  { tool: "Tạo yêu cầu bồi thường", calls: 187, ok: 96.8, error: "Phiên đăng nhập hết hạn", p95: 2.1 },
  { tool: "Gửi email (Outlook)", calls: 143, ok: 99.3, error: "-", p95: 1.2 },
  { tool: "Tìm đại lý gần nhất", calls: 88, ok: 100, error: "-", p95: 0.7 },
];

const GUARDRAIL = [
  { rule: "Thông tin cá nhân (CCCD, số thẻ)", count: 46 },
  { rule: "Ngoài phạm vi tư vấn tài chính", count: 19 },
  { rule: "Ngôn từ không phù hợp", count: 7 },
  { rule: "Cố tình điều khiển Nhân sự số (prompt injection)", count: 3 },
];

const MODELS = [
  { model: "GPT-4.1", share: 58 }, { model: "Llama-3.3-70B (FPT Cloud)", share: 31 }, { model: "GPT-4.1-mini", share: 11 },
];

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const dowOf = (d: Date) => DOW[(d.getDay() + 6) % 7];
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

/** Phân bổ hội thoại trong ngày theo giờ (cao điểm 10h và 15h). */
function hourWeights(weekend: boolean) {
  return Array.from({ length: 24 }, (_, h) =>
    (weekend ? 0.45 : 1) * (Math.exp(-(((h - 10) / 2.2) ** 2)) + 0.8 * Math.exp(-(((h - 15) / 2.5) ** 2)) + 0.25 * Math.exp(-(((h - 21) / 1.8) ** 2)) + 0.03));
}

function bucket(r: () => number, sessions: number, q: number, date: Date, label: string, hour?: number): Day {
  const resolved = Math.round(sessions * (0.58 + 0.05 * q + (r() - 0.5) * 0.06));
  const abandoned = Math.round(sessions * (0.12 - 0.015 * q + (r() - 0.5) * 0.03));
  const users = Math.round(sessions * (0.72 + r() * 0.08));
  const messages = Math.round(sessions * (3.6 + r()));
  const fb = Math.round(messages * (0.1 + r() * 0.05));
  const likes = Math.round(fb * (0.72 + 0.04 * q + (r() - 0.5) * 0.06));
  const csatN = Math.round(sessions * 0.07);
  const tokens = Math.round(sessions * (5200 + r() * 1000 + (q >= 3 ? 900 : 0)));
  return {
    date, day: label, hour, sessions, users, newUsers: Math.round(users * (0.3 + r() * 0.15)), messages, resolved, abandoned,
    likes, dislikes: fb - likes, botBubbles: messages, runs: messages,
    errors: Math.max(0, Math.round(messages * ((q < 2 ? 0.035 : q === 2 ? 0.012 : 0.02) + (r() - 0.5) * 0.01))),
    fallbacks: Math.round(sessions * (0.12 - 0.02 * q) * (0.8 + r() * 0.4)),
    cited: Math.round(messages * (0.55 + 0.06 * q)),
    tokens, tokensIn: Math.round(tokens * (0.76 + r() * 0.04)),
    p50: 2.1 + r() * 0.5 + (q >= 3 ? 0.4 : 0), p95: 5.2 + r() + (q >= 3 ? 1.1 : 0),
    csatN, csatSum: Math.round(csatN * (3.9 + 0.1 * q + (r() - 0.5) * 0.3)),
  };
}

const NUM_KEYS = ["sessions", "users", "newUsers", "messages", "resolved", "abandoned", "likes", "dislikes", "botBubbles", "runs", "errors", "fallbacks", "cited", "tokens", "tokensIn", "csatN", "csatSum"] as const;
function merge(rows: Day[], date: Date, label: string): Day {
  const out = { date, day: label, p50: 0, p95: 0 } as Day;
  NUM_KEYS.forEach(k => { (out as any)[k] = rows.reduce((a, d) => a + d[k], 0); });
  const n = Math.max(1, rows.filter(d => d.sessions > 0).length);
  out.p50 = rows.reduce((a, d) => a + (d.sessions > 0 ? d.p50 : 0), 0) / n;
  out.p95 = rows.reduce((a, d) => a + (d.sessions > 0 ? d.p95 : 0), 0) / n;
  return out;
}

/** 90 ngày theo ngày (ô cuối = hôm nay, số tạm) + hôm nay và hôm qua theo giờ, tới giờ hiện tại. */
function buildData(agentId: string) {
  const r = rng(agentId || "agent");
  const today = startOfToday();
  const hourNow = new Date().getHours();
  const qAt = (i: number) => VERSIONS.filter(v => i >= LOOKBACK - 1 - v.daysAgo).length;
  const days: Day[] = [];
  for (let i = 0; i < LOOKBACK; i++) {
    const date = new Date(today); date.setDate(today.getDate() - (LOOKBACK - 1 - i));
    const wk = date.getDay() === 0 || date.getDay() === 6;
    const sessions = Math.max(5, Math.round((60 + i * 0.6) * (wk ? 0.45 : 1) + (r() - 0.5) * 12));
    days.push(bucket(r, sessions, qAt(i), date, ddmm(date)));
  }
  const hourly = (i: number, upto: number) => {
    const d = days[i]; const w = hourWeights(d.date.getDay() === 0 || d.date.getDay() === 6); const W = w.reduce((a, x) => a + x, 0);
    return Array.from({ length: upto + 1 }, (_, h) => bucket(r, Math.round((d.sessions * w[h]) / W), qAt(i), d.date, `${h}h`, h));
  };
  const todayH = hourly(LOOKBACK - 1, hourNow);
  const yestH = hourly(LOOKBACK - 2, hourNow);
  days[LOOKBACK - 1] = merge(todayH, today, ddmm(today));
  const markers = VERSIONS.map(v => ({ label: v.version, day: days[LOOKBACK - 1 - v.daysAgo].day }));
  const base30 = days.slice(-30).reduce((a, d) => a + d.sessions, 0);
  return { days, todayH, yestH, markers, base30 };
}

/* ---------- khoảng thời gian (lưu trên URL để giữ khi đổi mục) ---------- */
export type RangeKind = "today" | "7" | "30" | "custom";
const toIso = (d: Date) => format(d, "yyyy-MM-dd");
const dayIndex = (iso: string | null) => {
  if (!iso) return NaN;
  const d = new Date(`${iso}T00:00:00`);
  return LOOKBACK - 1 - Math.round((startOfToday().getTime() - d.getTime()) / 86400000);
};

function usePeriod() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("range");
  let kind: RangeKind = raw === "today" || raw === "7" || raw === "custom" ? raw : "30";
  let start = LOOKBACK - 30, end = LOOKBACK - 1;
  if (kind === "today") start = LOOKBACK - 1;
  if (kind === "7") start = LOOKBACK - 7;
  if (kind === "custom") {
    const f = dayIndex(params.get("from")), t = dayIndex(params.get("to"));
    if (f >= 0 && t <= LOOKBACK - 1 && f <= t && t - f + 1 <= MAX_CUSTOM) { start = f; end = t; } else kind = "30";
  }
  const len = end - start + 1;
  const label = kind === "today" ? "Hôm nay" : kind === "custom" ? "" : `${len} ngày`;
  const set = (k: RangeKind, from?: Date, to?: Date) => setParams(p => {
    const n = new URLSearchParams(p);
    n.set("range", k);
    if (k === "custom" && from && to) { n.set("from", toIso(from)); n.set("to", toIso(to)); } else { n.delete("from"); n.delete("to"); }
    return n;
  });
  return { kind, start, end, len, label, set };
}

/* ---------- helpers ---------- */
const sum = (rows: Day[], k: keyof Day) => rows.reduce((a, d) => a + (d[k] as number), 0);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const vn = (n: number, digits = 0) => n.toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const compact = (n: number) => (n >= 1e6 ? `${vn(n / 1e6, 1)} tr` : n >= 1e4 ? `${vn(n / 1e3, 1)} N` : vn(n));
const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const TT = { borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 };
const LEGEND = { fontSize: 12, color: "hsl(var(--muted-foreground))", paddingTop: 8 };
const tickEvery = (n: number) => Math.max(0, Math.ceil(n / 8) - 1);

function metricsFor(rows: Day[]) {
  const s = sum(rows, "sessions");
  const fb = sum(rows, "likes") + sum(rows, "dislikes");
  return {
    sessions: s, users: sum(rows, "users"), messages: sum(rows, "messages"), tokens: sum(rows, "tokens"), tokensIn: sum(rows, "tokensIn"),
    feedbacks: fb,
    resolvedPct: pct(sum(rows, "resolved"), s),
    abandonedPct: pct(sum(rows, "abandoned"), s),
    likePct: pct(sum(rows, "likes"), fb),
    dislikePct: pct(sum(rows, "dislikes"), fb),
    errorPct: pct(sum(rows, "errors"), sum(rows, "runs")),
    csat: Math.round((sum(rows, "csatSum") / Math.max(1, sum(rows, "csatN"))) * 100) / 100,
    citedPct: pct(sum(rows, "cited"), sum(rows, "botBubbles")),
    coveragePct: pct(fb, sum(rows, "botBubbles")),
    tokPerSession: Math.round(sum(rows, "tokens") / Math.max(1, s)),
  };
}
type Metrics = ReturnType<typeof metricsFor>;

function useAnalytics(agentId: string) {
  const data = useMemo(() => buildData(agentId), [agentId]);
  const period = usePeriod();
  return useMemo(() => {
    const today = period.kind === "today";
    const rows = today ? data.todayH : data.days.slice(period.start, period.end + 1);
    const prevStart = period.start - period.len;
    const prev = today ? data.yestH : prevStart >= 0 ? data.days.slice(prevStart, period.start) : null;
    const cur = metricsFor(rows);
    const old = prev ? metricsFor(prev) : null;
    const markers = data.markers.filter(m => rows.some(d => d.day === m.day));
    // Bảng cố định (chủ đề, Tool, Knowledge…) được viết cho 30 ngày → co giãn theo số hội thoại của kỳ.
    const factor = cur.sessions / Math.max(1, data.base30);
    const heat = DOW.flatMap(dow => Array.from({ length: 24 }, (_, hour) => ({ dow, hour, sessions: 0 })));
    rows.forEach(d => {
      const di = DOW.indexOf(dowOf(d.date));
      if (d.hour !== undefined) { heat[di * 24 + d.hour].sessions += d.sessions; return; }
      const w = hourWeights(di >= 5); const W = w.reduce((a, x) => a + x, 0);
      w.forEach((x, h) => { heat[di * 24 + h].sessions += Math.round((d.sessions * x) / W); });
    });
    const allTime = sum(data.days, "sessions");
    return { rows, prev, cur, old, markers, factor, heat, today, step: today ? "giờ" : "ngày", period, allTime };
  }, [data, period.kind, period.start, period.end]); // eslint-disable-line react-hooks/exhaustive-deps
}
type A = ReturnType<typeof useAnalytics>;

/** Nhãn kỳ đang xem, dùng trong chú thích của bảng: "30 ngày", "Hôm nay", "12/10 - 20/10". */
function periodText(a: A) {
  if (a.period.kind !== "custom") return a.period.label;
  return `${a.rows[0].day} - ${a.rows[a.rows.length - 1].day}`;
}
function compareText(a: A) {
  if (a.today) return "So với hôm qua, cùng khung giờ";
  if (!a.prev) return "Không có kỳ trước để so";
  return `So với ${a.period.len} ngày liền trước`;
}

/* ---------- chọn khoảng thời gian ---------- */
const PRESETS: { id: Exclude<RangeKind, "custom">; name: string }[] = [
  { id: "today", name: "Hôm nay" }, { id: "7", name: "7 ngày qua" }, { id: "30", name: "30 ngày qua" },
];

function PeriodPicker({ a }: { a: A }) {
  const [open, setOpen] = useState(false);
  const cur: DateRange | undefined = a.period.kind === "custom" ? { from: a.rows[0].date, to: a.rows[a.rows.length - 1].date } : undefined;
  const [draft, setDraft] = useState<DateRange | undefined>(cur);
  const today = startOfToday();
  const minDay = new Date(today); minDay.setDate(today.getDate() - (LOOKBACK - 1));
  const len = draft?.from && draft?.to ? Math.round((draft.to.getTime() - draft.from.getTime()) / 86400000) + 1 : 0;
  const tooLong = len > MAX_CUSTOM;
  const label = a.period.kind === "custom" && cur?.from && cur?.to
    ? `${format(cur.from, "dd/MM/yyyy")} - ${format(cur.to, "dd/MM/yyyy")}`
    : PRESETS.find(p => p.id === a.period.kind)?.name ?? "30 ngày qua";
  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (v) setDraft(cur); }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Khoảng thời gian: ${label}`}
          className="h-9 min-w-[200px] flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base">
          <CalendarIcon size={13} className="text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0 truncate text-left">{label}</span>
          <ChevronDown size={12} className={`text-muted-foreground shrink-0 transition-base ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex">
          <div className="flex flex-col p-1.5 border-r border-border w-40 shrink-0">
            {PRESETS.map(o => (
              <button key={o.id} type="button" onClick={() => { a.period.set(o.id); setOpen(false); }}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${a.period.kind === o.id ? "bg-primary-soft text-primary font-medium" : "text-foreground"}`}>
                {o.name}
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            <div className={`text-left px-3 py-2 rounded-lg text-sm ${a.period.kind === "custom" ? "bg-primary-soft text-primary font-medium" : "text-muted-foreground"}`}>Tùy chọn khoảng ngày</div>
          </div>
          <div className="p-3">
            <Calendar mode="range" numberOfMonths={2} selected={draft} onSelect={setDraft}
              defaultMonth={draft?.from ?? new Date(today.getFullYear(), today.getMonth() - 1, 1)}
              disabled={{ before: minDay, after: today }} fromDate={minDay} toDate={today} />
            <div className="flex items-center justify-between gap-3 px-1 pb-1">
              <div className="text-xs whitespace-nowrap">
                {tooLong
                  ? <span className="text-destructive">Chọn tối đa {MAX_CUSTOM} ngày (đang chọn {len} ngày)</span>
                  : <span className="text-muted-foreground">Chọn tối đa {MAX_CUSTOM} ngày trong {LOOKBACK} ngày gần nhất</span>}
              </div>
              <button type="button" disabled={!draft?.from || !draft?.to || tooLong}
                onClick={() => { if (draft?.from && draft?.to) { a.period.set("custom", draft.from, draft.to); setOpen(false); } }}
                className="btn-primary h-8 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Giải thích số liệu: bấm, chạm hoặc Enter đều mở được (không chỉ rê chuột). */
function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Giải thích: ${label}`} onClick={e => e.stopPropagation()}
          className="inline-flex items-center justify-center w-6 h-6 -m-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <HugeiconsIcon icon={InformationCircleIcon} size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 p-3 text-xs leading-relaxed">{text}</PopoverContent>
    </Popover>
  );
}

function Header({ a, title, desc }: { a: A; title: string; desc: string }) {
  const noun = useNoun();
  const now = new Date();
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
        <PeriodPicker a={a} />
      </div>
      <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
        <span>Cập nhật lúc {String(now.getHours()).padStart(2, "0")}:00, mỗi giờ một lần</span>
        <span aria-hidden="true">·</span><span>Số của hôm nay là số tạm</span>
        <span aria-hidden="true">·</span><span>{compareText(a)}</span>
        <span aria-hidden="true">·</span><span>Không tính {noun} ở kênh Chạy thử</span>
      </p>
    </div>
  );
}

/** Pill showing change vs previous period; colour + arrow + text so it never relies on colour alone. */
function DeltaPill({ diff, prev, good, unit }: { diff: number; prev: number; good: 1 | -1; unit?: "pp" }) {
  const rel = prev ? (diff / prev) * 100 : 0;
  const better = diff * good >= 0;
  const text = unit === "pp" ? `${diff >= 0 ? "+" : ""}${vn(diff, 1)} điểm` : `${rel >= 0 ? "+" : ""}${vn(rel, 1)}%`;
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-semibold whitespace-nowrap ${better ? "bg-[hsl(var(--success-soft))] text-[hsl(var(--success-strong))]" : "bg-[hsl(var(--destructive-soft))] text-[hsl(var(--destructive-strong))]"}`}>
      {diff >= 0 ? "↑" : "↓"} {text}
    </span>
  );
}

/** Delta theo kỳ trước; không có kỳ trước (vd Tùy chọn sát mốc 90 ngày) thì ghi rõ. */
function Delta({ a, k, good, unit }: { a: A; k: keyof Metrics; good: 1 | -1; unit?: "pp" }) {
  if (!a.old) return <span className="text-xs text-muted-foreground whitespace-nowrap">Chưa có kỳ trước</span>;
  return <DeltaPill diff={a.cur[k] - a.old[k]} prev={a.old[k]} good={good} unit={unit} />;
}

function Spark({ values, color = "hsl(var(--primary))", height = 44 }: { values: number[]; color?: string; height?: number }) {
  const v = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const w = 200, h = height, mx = Math.max(...v), mn = Math.min(...v);
  const pts = v.map((x, i) => [i * (w / (v.length - 1)), h - 4 - ((x - mn) / ((mx - mn) || 1)) * (h - 8)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d}L${w},${h}L0,${h}Z`} fill={color} opacity={0.1} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MiniBars({ values, height = 44 }: { values: number[]; height?: number }) {
  const w = 200, h = height, mx = Math.max(1, ...values), bw = w / Math.max(1, values.length);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {values.map((v, i) => (
        <rect key={i} x={i * bw + 0.8} y={h - (v / mx) * h} width={Math.max(0.5, bw - 1.6)} height={(v / mx) * h} rx={1.5}
          fill="hsl(var(--primary))" opacity={i === values.length - 1 ? 1 : 0.35} />
      ))}
    </svg>
  );
}

function Kpi({ a, label, value, k, good, unit, info, sub }: {
  a: A; label: string; value: string; k: keyof Metrics; good: 1 | -1; unit?: "pp"; info: string; sub?: string;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <InfoTip text={info} label={label} />
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
        <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        <Delta a={a} k={k} good={good} unit={unit} />
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Card({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`surface-card p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
      {children}
    </div>
  );
}

/** Nhãn dài được xuống tối đa 2 dòng thay vì cắt "…", nên luôn đọc được đủ tên. */
function HBars({ rows, max = 100, tone = "primary" }: { rows: { label: string; value: number; text: string; highlight?: boolean }[]; max?: number; tone?: "primary" | "destructive" }) {
  return (
    <div className="space-y-3">
      {rows.map(r => (
        <div key={r.label} className="grid grid-cols-[minmax(0,14rem)_1fr_4.5rem] items-center gap-3 text-sm">
          <span className="line-clamp-2 leading-snug">{r.label}</span>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(1, (r.value / Math.max(1, max)) * 100)}%`, background: r.highlight ? (tone === "destructive" ? "hsl(var(--destructive))" : "hsl(var(--primary))") : "hsl(var(--primary) / 0.4)" }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums text-right whitespace-nowrap">{r.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Publish markers. Returned as an array (not a wrapper component) because Recharts only draws
 * ReferenceLine elements that are direct children of the chart. */
function versionLines(markers: { label: string; day: string }[]) {
  return markers.map(m => (
    <ReferenceLine key={m.label} x={m.day} stroke="hsl(var(--primary))" strokeOpacity={0.55} strokeDasharray="4 4"
      label={{ value: m.label, position: "insideTopLeft", fontSize: 11, fontWeight: 600, fill: "hsl(var(--primary))" }} />
  ));
}

const Page = ({ children }: { children: React.ReactNode }) => <div className="p-8 w-full space-y-5 animate-fade-up">{children}</div>;

/* ============ TỔNG QUAN ============ */
/** Bảng điểm: mỗi thẻ trả lời một câu hỏi của chủ Nhân sự số và dẫn sang tab chi tiết tương ứng. */
export function AnalyticsOverview({ a }: { a: A }) {
  const noun = useNoun();
  const { cur, rows } = a;
  const [, setParams] = useSearchParams();
  const go = (section: AnalyticsSection) => setParams(p => { const n = new URLSearchParams(p); n.set("tab", "insights"); n.set("section", section); return n; });
  const topTopics = [...TOPICS].sort((x, y) => y.share - x.share).slice(0, 3);
  const worstTool = [...TOOLS].sort((x, y) => x.ok - y.ok)[0];
  const hot = TOPICS.filter(t => t.change === null || t.change >= 50).length;
  const cards: { q: string; section: AnalyticsSection; tabLabel: string; value: string; unit: string; delta: React.ReactNode; viz: React.ReactNode; foot: string }[] = [
    { q: "Có ai dùng không?", section: "usage", tabLabel: "Sử dụng", value: vn(cur.sessions), unit: noun,
      delta: <Delta a={a} k="sessions" good={1} />, viz: <MiniBars values={rows.map(d => d.sessions)} />,
      foot: `${vn(cur.users)} người dùng · ${CHANNELS[0].channel} chiếm ${vn(CHANNELS[0].share * 100)}%` },
    { q: "Có tự xử lý được không?", section: "usage", tabLabel: "Sử dụng", value: `${vn(cur.resolvedPct, 1)}%`, unit: "tự xử lý",
      delta: <Delta a={a} k="resolvedPct" good={1} unit="pp" />, viz: <Spark values={rows.map(d => pct(d.resolved, d.sessions))} />,
      foot: `Bỏ dở ${vn(cur.abandonedPct, 1)}% ${noun}` },
    { q: "Người dùng có hài lòng không?", section: "feedback", tabLabel: "Chất lượng", value: `${vn(cur.likePct, 1)}%`, unit: "Like",
      delta: <Delta a={a} k="likePct" good={1} unit="pp" />, viz: <Spark values={rows.map(d => pct(d.likes, d.likes + d.dislikes))} color="hsl(var(--success))" />,
      foot: `Trên ${vn(cur.feedbacks)} lượt bấm Like/Dislike · CSAT ${vn(cur.csat, 2)}/5` },
    { q: "Có hay gặp lỗi không?", section: "operations", tabLabel: "Hoạt động", value: `${vn(cur.errorPct, 1)}%`, unit: "lỗi",
      delta: <Delta a={a} k="errorPct" good={-1} unit="pp" />, viz: <Spark values={rows.map(d => pct(d.errors, d.runs))} color="hsl(var(--destructive))" />,
      foot: `Tool lỗi nhiều nhất: ${worstTool.tool}` },
    { q: "Người dùng hỏi gì?", section: "topics", tabLabel: "Người dùng hỏi gì", value: vn(TOPICS.length), unit: "chủ đề",
      delta: hot ? <span className="chip chip-warning whitespace-nowrap">{hot} chủ đề mới hoặc tăng mạnh</span> : null,
      viz: <div className="flex flex-wrap gap-1.5 pt-1">{topTopics.map(t => <span key={t.topic} className="chip">{t.topic} · {vn(t.share * 100)}%</span>)}</div>,
      foot: `${UNANSWERED.length} câu hỏi chưa trả lời được` },
    { q: "Tốn bao nhiêu?", section: "cost", tabLabel: "Chi phí", value: compact(cur.tokens), unit: "token",
      delta: <Delta a={a} k="tokens" good={-1} />, viz: <MiniBars values={rows.map(d => d.tokens)} />,
      foot: `${vn(cur.tokPerSession)} token mỗi ${noun}` },
  ];
  return (
    <Page>
      <Header a={a} title="Tổng quan" desc="Bấm vào từng thẻ để xem chi tiết." />
      <div className="grid md:grid-cols-2 gap-3">
        {cards.map(c => (
          <button key={c.q} type="button" onClick={() => go(c.section)}
            className="surface-card p-5 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-sm font-semibold">{c.q}</h3>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-base whitespace-nowrap">
                {c.tabLabel} <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3 flex-wrap">
              <span className="font-display text-3xl font-semibold tracking-tight tabular-nums">{c.value}</span>
              <span className="text-sm text-muted-foreground">{c.unit}</span>
              <span className="ml-auto">{c.delta}</span>
            </div>
            <div className="mt-3 h-11">{c.viz}</div>
            <div className="text-xs text-muted-foreground mt-2 truncate">{c.foot}</div>
          </button>
        ))}
      </div>
    </Page>
  );
}

/* ============ SỬ DỤNG ============ */
export function AnalyticsUsage({ a }: { a: A }) {
  const noun = useNoun();
  const users = a.rows.map(d => ({ day: d.day, "Lần đầu": d.newUsers, "Quay lại": d.users - d.newUsers }));
  const rates = a.rows.map(d => d.sessions ? { day: d.day, "Tự xử lý": pct(d.resolved, d.sessions), "Bỏ dở": pct(d.abandoned, d.sessions) } : { day: d.day });
  const heatDows = a.today ? [dowOf(a.rows[0].date)] : DOW;
  const cells = a.heat.filter(h => heatDows.includes(h.dow));
  const maxHeat = Math.max(1, ...cells.map(h => h.sessions));
  const off = cells.filter(h => h.hour < 8 || h.hour >= 17 || h.dow === "T7" || h.dow === "CN").reduce((s, h) => s + h.sessions, 0);
  const offPct = pct(off, cells.reduce((s, h) => s + h.sessions, 0));
  const iv = tickEvery(a.rows.length);
  return (
    <Page>
      <Header a={a} title="Sử dụng" desc={`Ai đang dùng Nhân sự số, qua kênh nào, vào lúc nào và kết quả ${noun} ra sao.`} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`Người dùng theo ${a.step}`} note="Người dùng lần đầu và người quay lại">
          <div className="h-56" role="img" aria-label={`Người dùng lần đầu và quay lại theo ${a.step}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={users} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={iv} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TT} cursor={{ fill: "hsl(var(--surface-muted))" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
                <Bar dataKey="Lần đầu" stackId="u" fill="hsl(var(--primary) / 0.35)" maxBarSize={18} isAnimationActive={false} />
                <Bar dataKey="Quay lại" stackId="u" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Kết quả ${noun} (%)`} note={`Tự xử lý: Nhân sự số trả lời được và không bị Dislike${a.today ? ". Giờ không có " + noun + " thì để trống" : ""}`}>
          <div className="h-56" role="img" aria-label={`Tỷ lệ tự xử lý và bỏ dở theo ${a.step}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rates} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={iv} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
                {versionLines(a.markers)}
                <Line type="linear" dataKey="Tự xử lý" stroke="hsl(var(--primary))" strokeWidth={2} dot={a.rows.length < 3} isAnimationActive={false} />
                <Line type="linear" dataKey="Bỏ dở" stroke="hsl(var(--warning))" strokeWidth={2} dot={a.rows.length < 3} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Theo kênh" note={periodText(a)}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2">Kênh</th><th className="text-right font-medium">{cap(noun)}</th><th className="text-right font-medium">Người dùng</th><th className="text-right font-medium">Tin nhắn mỗi người</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {CHANNELS.map(c => {
                const s = Math.round(a.cur.sessions * c.share); const u = Math.round(s * 0.76);
                return <tr key={c.channel}><td className="py-2">{c.channel}</td><td className="text-right tabular-nums">{vn(s)}</td><td className="text-right tabular-nums">{vn(u)}</td><td className="text-right tabular-nums">{u ? vn((s * 4.1) / u, 1) : "-"}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
        <Card title="Giờ cao điểm" note={`${cap(noun)} theo giờ và thứ · ${vn(offPct, 1)}% rơi vào ngoài giờ hành chính`}>
          <div className="overflow-x-auto">
            <div className="grid gap-[2px] min-w-[420px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }} role="img" aria-label={`Bản đồ nhiệt ${noun} theo giờ và thứ`}>
              {heatDows.map(dow => (
                <div key={dow} className="contents">
                  <span className="text-[11px] text-muted-foreground leading-[18px]">{dow}</span>
                  {cells.filter(h => h.dow === dow).map(h => (
                    <span key={h.hour} title={`${dow} · ${h.hour}h: ${vn(h.sessions)} ${noun}`} className="h-[18px] rounded-[3px]"
                      style={{ background: `hsl(var(--primary) / ${0.06 + (h.sessions / maxHeat) * 0.94})` }} />
                  ))}
                </div>
              ))}
              <span />
              {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-[10px] text-muted-foreground text-center">{h % 6 === 0 || h === 23 ? `${h}h` : ""}</span>)}
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}

/* ============ CHẤT LƯỢNG ============ */
export function AnalyticsFeedback({ a }: { a: A }) {
  const { cur } = a;
  const series = a.rows.map(d => d.likes + d.dislikes ? { day: d.day, Like: pct(d.likes, d.likes + d.dislikes), Dislike: pct(d.dislikes, d.likes + d.dislikes) } : { day: d.day });
  const g = GUARDRAIL.map(x => ({ ...x, count: Math.round(x.count * a.factor) }));
  const maxG = Math.max(1, ...g.map(x => x.count));
  return (
    <Page>
      <Header a={a} title="Chất lượng" desc="Người dùng đánh giá câu trả lời của Nhân sự số thế nào." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi a={a} label="Tỷ lệ Like" value={`${vn(cur.likePct, 1)}%`} k="likePct" good={1} unit="pp" sub={`Trên ${vn(cur.feedbacks)} lượt bấm`} info="Số Like chia cho tổng số Like và Dislike." />
        <Kpi a={a} label="Tỷ lệ Dislike" value={`${vn(cur.dislikePct, 1)}%`} k="dislikePct" good={-1} unit="pp" sub={`Trên ${vn(cur.feedbacks)} lượt bấm`} info="Số Dislike chia cho tổng số Like và Dislike." />
        <Kpi a={a} label="CSAT" value={`${vn(cur.csat, 2)}/5`} k="csat" good={1} info="Điểm trung bình người dùng chấm cuối cuộc trò chuyện, từ 1 đến 5 sao." />
        <Kpi a={a} label="Có dẫn nguồn" value={`${vn(cur.citedPct, 1)}%`} k="citedPct" good={1} unit="pp" info="Số câu trả lời có ghi rõ lấy từ tài liệu nào, chia cho tổng số câu trả lời." />
        <Kpi a={a} label="Tỷ lệ bấm Like/Dislike" value={`${vn(cur.coveragePct, 1)}%`} k="coveragePct" good={1} unit="pp" info="Số câu trả lời được người dùng bấm Like hoặc Dislike, chia cho tổng số câu trả lời. Tỷ lệ này thấp thì tỷ lệ Like chưa đại diện cho nhiều người." />
      </div>
      <Card title={`Tỷ lệ Like / Dislike theo ${a.step}`} note="% trên tổng số câu trả lời được bấm Like hoặc Dislike">
        <div className="h-56" role="img" aria-label={`Tỷ lệ Like và Dislike theo ${a.step}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={tickEvery(series.length)} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
              {versionLines(a.markers)}
              <Line type="linear" dataKey="Like" stroke="hsl(var(--success))" strokeWidth={2} dot={series.length < 3} isAnimationActive={false} />
              <Line type="linear" dataKey="Dislike" stroke="hsl(var(--destructive))" strokeWidth={2} dot={series.length < 3} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Câu bị Guardrail chặn" note={`Theo loại quy tắc · ${periodText(a)}`}>
        <HBars max={maxG} rows={g.map((x, i) => ({ label: x.rule, value: x.count, text: vn(x.count), highlight: i === 0 }))} />
      </Card>
    </Page>
  );
}

/* ============ NGƯỜI DÙNG HỎI GÌ ============ */
function AddCaseDialog({ agentId, question, onClose }: { agentId: string; question: string | null; onClose: () => void }) {
  const [, setParams] = useSearchParams();
  const sets = question ? evaluationStore.sets(agentId) : [];
  const [setId, setSetId] = useState("");
  const [ref, setRef] = useState("");
  const chosen = setId || sets[0]?.id || "";
  const add = () => {
    if (!question || !chosen) return;
    evaluationStore.addCases(chosen, [{ question, reference: ref.trim() || undefined, group: "Trích xuất đơn", source: "Thủ công" }]);
    toast.success(`Đã thêm vào bộ test ${evaluationStore.set(chosen)?.name ?? ""}`);
    setRef(""); setSetId(""); onClose();
  };
  return (
    <Dialog open={!!question} onOpenChange={o => { if (!o) { setRef(""); setSetId(""); onClose(); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tạo test case</DialogTitle>
          <DialogDescription>Câu hỏi này sẽ được kiểm tra lại mỗi lần chạy bộ test.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm">{question}</div>
          {sets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nhân sự số chưa có bộ test nào. Tạo bộ test ở Evaluate trước, rồi quay lại thêm câu hỏi này.</p>
          ) : (
            <>
              <label className="block"><span className="text-sm font-medium">Bộ test</span>
                <select className="ds-input mt-1.5" value={chosen} onChange={e => setSetId(e.target.value)}>{sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className="block"><span className="text-sm font-medium">Đáp án mẫu <span className="text-muted-foreground font-normal">(không bắt buộc)</span></span>
                <textarea className="ds-textarea mt-1.5" rows={3} value={ref} onChange={e => setRef(e.target.value)} placeholder="Câu trả lời đúng mà Nhân sự số cần đưa ra" /></label>
            </>
          )}
        </div>
        <DialogFooter>
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          {sets.length === 0
            ? <button className="btn-primary" onClick={() => { onClose(); setParams({ tab: "evaluate", section: "test-sets" }); }}>Mở Evaluate</button>
            : <button className="btn-primary" onClick={add}>Thêm test case</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnalyticsTopics({ a, agentId }: { a: A; agentId: string }) {
  const noun = useNoun();
  const [caseQ, setCaseQ] = useState<string | null>(null);
  const unanswered = UNANSWERED.map(u => ({ ...u, times: Math.round(u.times * a.factor) })).filter(u => u.times > 0);
  return (
    <Page>
      <Header a={a} title="Người dùng hỏi gì" desc="AI gom các câu hỏi giống nhau thành chủ đề, và chỉ ra câu Nhân sự số chưa trả lời được." />
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Chủ đề</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{periodText(a)} · Cột Thay đổi so với kỳ trước, "Mới" là chủ đề kỳ trước chưa có</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Chủ đề</th><th className="text-right font-medium px-3">{cap(noun)}</th><th className="text-right font-medium px-3">Thay đổi</th><th className="text-right font-medium px-3">Trả lời được</th><th className="text-right font-medium px-5">Like</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {TOPICS.map(t => (
                <tr key={t.topic} className="hover:bg-surface-muted transition-base">
                  <td className="px-5 py-2.5">{t.topic}</td>
                  <td className="text-right tabular-nums px-3">{vn(Math.round(a.cur.sessions * t.share))}</td>
                  <td className="text-right tabular-nums px-3">
                    {!a.old ? <span className="text-muted-foreground">-</span>
                      : t.change === null ? <span className="chip chip-warning">Mới</span>
                      : <span className={t.change >= 50 ? "text-destructive font-medium" : "text-muted-foreground"}>{t.change >= 0 ? "+" : ""}{t.change}%</span>}
                  </td>
                  <td className={`text-right tabular-nums px-3 ${t.answer < 70 ? "text-destructive font-medium" : ""}`}>{t.answer}%</td>
                  <td className="text-right tabular-nums px-5">{t.like}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Câu hỏi chưa trả lời được</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Nhân sự số không trả lời được hoặc bị Dislike. Câu bị hỏi nhiều nhất nằm trên cùng · {periodText(a)}</p>
        </div>
        {unanswered.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Không có câu hỏi nào chưa trả lời được trong khoảng thời gian này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-5 py-2">Câu hỏi</th><th className="text-left font-medium px-3">Chủ đề</th><th className="text-right font-medium px-3">Số lần</th><th className="text-left font-medium px-3">Lý do</th><th className="text-left font-medium px-3">Lần gần nhất</th><th className="px-5" />
              </tr></thead>
              <tbody className="divide-y divide-border">
                {unanswered.map(u => (
                  <tr key={u.q}>
                    <td className="px-5 py-2.5 max-w-[320px]">{u.q}</td>
                    <td className="px-3 text-muted-foreground">{u.topic}</td>
                    <td className="text-right tabular-nums px-3">{u.times}</td>
                    <td className="px-3"><span className={`chip whitespace-nowrap ${u.reason === "Trả lời sai" ? "bg-[hsl(var(--destructive-soft))] text-destructive border-[hsl(var(--destructive)/0.2)]" : "chip-warning"}`}>{u.reason}</span></td>
                    <td className="px-3 text-muted-foreground whitespace-nowrap">{u.last}</td>
                    <td className="px-5 text-right">
                      <button className="btn-secondary h-8 text-xs whitespace-nowrap" onClick={() => setCaseQ(u.q)}>Tạo test case</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AddCaseDialog agentId={agentId} question={caseQ} onClose={() => setCaseQ(null)} />
    </Page>
  );
}

/* ============ HOẠT ĐỘNG ============ */
export function AnalyticsOperations({ a }: { a: A }) {
  const lat = a.rows.map(d => d.sessions ? { day: d.day, "Lúc chậm": Math.round(d.p95 * 10) / 10, "Thông thường": Math.round(d.p50 * 10) / 10 } : { day: d.day });
  const err = a.rows.map(d => d.sessions ? { day: d.day, "Không trả lời được": pct(d.fallbacks, d.sessions), "Lỗi": pct(d.errors, d.runs) } : { day: d.day });
  const iv = tickEvery(a.rows.length);
  const dots = a.rows.length < 3;
  return (
    <Page>
      <Header a={a} title="Hoạt động" desc="Nhân sự số phản hồi nhanh hay chậm, gặp lỗi ở đâu, Tool và Knowledge nào đang được dùng." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Thời gian phản hồi" note="Tính bằng giây. Thông thường là mức giữa, lúc chậm là 5% câu chậm nhất">
          <div className="h-52" role="img" aria-label={`Thời gian phản hồi theo ${a.step}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lat} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={iv} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="s" />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)} giây`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
                {versionLines(a.markers)}
                <Line type="linear" dataKey="Lúc chậm" stroke="hsl(var(--warning))" strokeWidth={2} dot={dots} isAnimationActive={false} />
                <Line type="linear" dataKey="Thông thường" stroke="hsl(var(--primary))" strokeWidth={2} dot={dots} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Lỗi và câu không trả lời được" note="% trên tổng số lượt trả lời">
          <div className="h-52" role="img" aria-label={`Tỷ lệ lỗi và câu không trả lời được theo ${a.step}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={err} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={iv} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
                {versionLines(a.markers)}
                <Line type="linear" dataKey="Không trả lời được" stroke="hsl(var(--warning))" strokeWidth={2} dot={dots} isAnimationActive={false} />
                <Line type="linear" dataKey="Lỗi" stroke="hsl(var(--destructive))" strokeWidth={2} dot={dots} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Tool và Connector</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Nhân sự số gọi tới hệ thống khác thành công hay thất bại · {periodText(a)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Tool</th><th className="text-right font-medium px-3">Số lần gọi</th><th className="text-right font-medium px-3">Thành công</th><th className="text-left font-medium px-3">Lỗi hay gặp</th><th className="text-right font-medium px-5">Lúc chậm</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {TOOLS.map(t => (
                <tr key={t.tool}>
                  <td className="px-5 py-2.5">{t.tool}</td>
                  <td className="text-right tabular-nums px-3">{vn(Math.round(t.calls * a.factor))}</td>
                  <td className={`text-right tabular-nums px-3 ${t.ok < 95 ? "text-destructive font-medium" : ""}`}>{vn(t.ok, 1)}%</td>
                  <td className="px-3 text-muted-foreground">{t.error}</td>
                  <td className="text-right tabular-nums px-5 whitespace-nowrap">{vn(t.p95, 1)} giây</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Knowledge</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tài liệu nào được dùng nhiều, tài liệu nào không ai dùng · {periodText(a)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Tài liệu</th><th className="text-right font-medium px-3">Số lần dùng</th><th className="text-right font-medium px-5">Lỗi khi đọc</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {KNOWLEDGE.map(k => {
                const uses = Math.round(k.uses * a.factor);
                return (
                  <tr key={k.source}>
                    <td className="px-5 py-2.5">{k.source}{uses === 0 && <span className="chip chip-warning ml-2">Không ai dùng</span>}</td>
                    <td className="text-right tabular-nums px-3">{vn(uses)}</td>
                    <td className={`text-right tabular-nums px-5 ${k.err >= 2 ? "text-destructive font-medium" : ""}`}>{vn(k.err, 1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}

/* ============ CHI PHÍ ============ */
export function AnalyticsCost({ a }: { a: A }) {
  const noun = useNoun();
  const { cur } = a;
  const series = a.rows.map(d => ({ day: d.day, "Đầu vào": d.tokensIn, "Đầu ra": d.tokens - d.tokensIn }));
  return (
    <Page>
      <Header a={a} title="Chi phí" desc="Nhân sự số tiêu bao nhiêu token và dùng model nào." />
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <Kpi a={a} label="Tổng token" value={compact(cur.tokens)} k="tokens" good={-1} sub={`Đầu vào ${vn(pct(cur.tokensIn, cur.tokens), 0)}% · Đầu ra ${vn(100 - pct(cur.tokensIn, cur.tokens), 0)}%`} info="Tổng token đầu vào (câu hỏi, Instructions, tài liệu đọc được) và đầu ra (câu trả lời) trong khoảng thời gian đang xem." />
        <Kpi a={a} label={`Token mỗi ${noun}`} value={vn(cur.tokPerSession)} k="tokPerSession" good={-1} info={`Tổng token chia cho số ${noun}.`} />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        <Card title={`Token theo ${a.step}`} note="Đầu vào và đầu ra">
          <div className="h-56" role="img" aria-label={`Token đầu vào và đầu ra theo ${a.step}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={tickEvery(series.length)} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [vn(v), n]} cursor={{ fill: "hsl(var(--surface-muted))" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
                {versionLines(a.markers)}
                <Bar dataKey="Đầu vào" stackId="t" fill="hsl(var(--primary))" maxBarSize={16} isAnimationActive={false} />
                <Bar dataKey="Đầu ra" stackId="t" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Token theo model" note={periodText(a)}>
          <HBars rows={MODELS.map((m, i) => ({ label: m.model, value: m.share, text: `${m.share}%`, highlight: i === 0 }))} />
        </Card>
      </div>
    </Page>
  );
}

/* ============ MÀN TRỐNG ============ */
function Empty({ a, title, desc, published, isChat, onPublish, onOpenChannels }: {
  a?: A; title: string; desc: string; published: boolean; isChat: boolean; onPublish?: () => void; onOpenChannels?: () => void;
}) {
  return (
    <Page>
      {a && <Header a={a} title="Insights" desc="Số liệu tổng hợp của Nhân sự số." />}
      <EmptyState icon={published ? Plug01Icon : Analytics01Icon} title={title} desc={desc}>
        {!published && onPublish && <button className="btn-primary" onClick={onPublish}><HugeiconsIcon icon={Rocket01Icon} size={14} /> Publish</button>}
        {published && a && a.period.kind !== "30" && <button className="btn-secondary" onClick={() => a.period.set("30")}>Xem 30 ngày qua</button>}
        {isChat && onOpenChannels && <button className={published ? "btn-primary" : "btn-secondary"} onClick={onOpenChannels}>Gắn vào kênh</button>}
      </EmptyState>
    </Page>
  );
}

/** Router used by AgentBuilder → Insights. */
export function AgentAnalytics({ agentId, section, kind = "conversational", published = true, onPublish, onOpenChannels }: {
  agentId: string; section: AnalyticsSection; kind?: AnalyticsAgentKind; published?: boolean;
  onPublish?: () => void; onOpenChannels?: () => void;
}) {
  const a = useAnalytics(agentId);
  const isChat = kind === "conversational";
  const noun = isChat ? "hội thoại" : "lượt chạy";
  let body: React.ReactNode;
  if (!published) {
    body = <Empty title="Chưa có số liệu" published={false} isChat={isChat} onPublish={onPublish} onOpenChannels={onOpenChannels}
      desc={`Nhân sự số chưa được publish nên chưa có ${noun} thật. Số liệu bắt đầu có sau khi publish${isChat ? " và gắn vào kênh" : ""}. ${cap(noun)} ở kênh Chạy thử không được tính.`} />;
  } else if (a.allTime === 0) {
    body = <Empty title={`Chưa có ${noun} nào`} published isChat={isChat} onOpenChannels={onOpenChannels}
      desc={isChat ? "Nhân sự số đã publish nhưng chưa ai trò chuyện. Gắn Nhân sự số vào kênh để người dùng bắt đầu dùng." : "Nhân sự số đã publish nhưng chưa chạy lần nào."} />;
  } else if (a.cur.sessions === 0) {
    body = <Empty a={a} title={`Không có ${noun} trong khoảng thời gian này`} published isChat={false} desc="Chọn khoảng thời gian khác để xem số liệu." />;
  } else {
    switch (section) {
      case "usage": body = <AnalyticsUsage a={a} />; break;
      case "feedback": body = <AnalyticsFeedback a={a} />; break;
      case "topics": body = <AnalyticsTopics a={a} agentId={agentId} />; break;
      case "operations": body = <AnalyticsOperations a={a} />; break;
      case "cost": body = <AnalyticsCost a={a} />; break;
      default: body = <AnalyticsOverview a={a} />;
    }
  }
  return <NounCtx.Provider value={noun}>{body}</NounCtx.Provider>;
}

export default AgentAnalytics;
