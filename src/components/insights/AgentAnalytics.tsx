import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon, ArrowRight01Icon, Analytics01Icon, Rocket01Icon, Plug01Icon } from "@hugeicons/core-free-icons";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { evaluationStore } from "@/components/evaluation/evaluationStore";
import { EmptyState } from "@/components/evaluation/shared";

/* =====================================================================================
 * Agent details → Insights: số liệu tổng hợp cho chủ Nhân sự số.
 * Theo wiki "Insights - Nghiệp vụ" v1.3 (TOVA-6380): 4 mục Tổng quan / Sử dụng / Chất lượng / Chi phí,
 * chỉ Agent hội thoại, chưa so sánh kỳ trước, mặc định 7 ngày qua, cập nhật 2 giờ một lần (BR-11),
 * phân biệt 0 và "--" (BR-04), token tính cả kênh Chạy thử (BR-07). Các bảng cũ vẫn giữ:
 * Chủ đề, Hiệu năng ("Cập nhật sau"), CSAT, trích dẫn, tỷ lệ phản hồi, Guardrail, Token theo model ("Phase 2").
 * Sub-tab: Tổng quan / Sử dụng / Chất lượng / Người dùng hỏi gì / Hoạt động / Chi phí.
 * - Tổng quan (Tyler 28/10): Người dùng đang hoạt động, Phiên, Tỷ lệ Like, Tỷ lệ Dislike, Token.
 * - Sử dụng: người dùng (tổng, mới, cũ), phiên, mới/cũ theo ngày, lỗi, token, kênh, giờ cao điểm.
 * Dữ liệu mẫu, sinh cố định theo agentId (cùng một Nhân sự số luôn ra cùng số liệu).
 * - Chỉ tính hội thoại thật: bỏ kênh Chạy thử (builder và người dùng cuối đều tính).
 * - Khoảng thời gian: Hôm nay (theo giờ) / 7 ngày / 30 ngày (mặc định) / Tùy chọn
 *   (tối đa 30 ngày, chỉ chọn trong 90 ngày gần nhất). So với kỳ liền trước cùng độ dài.
 * - Số liệu cập nhật mỗi giờ; số của hôm nay là số tạm.
 * - Tên số liệu theo chuẩn ngành (GA4 tiếng Việt, Copilot Studio, Dify): Số người dùng đang hoạt động, Phiên,
 *   Tỷ lệ giải quyết, Tỷ lệ bỏ dở… Nhân sự số chạy bằng trigger hoặc Quy trình: "phiên" đổi thành "lượt chạy".
 * - Người chỉ có quyền Xem không thấy nút Tạo test case.
 * ===================================================================================== */

export type AnalyticsSection = "performance" | "usage" | "feedback" | "topics" | "operations" | "cost";
export type AnalyticsAgentKind = "conversational" | "automation" | "process";

const LOOKBACK = 90;   // chỉ chọn được trong 90 ngày gần nhất
const MAX_CUSTOM = 30; // Tùy chọn dài tối đa 30 ngày
const COMPARE = false; // So sánh kỳ trước: phiên bản sau
const UPDATE_EVERY_H = 2; // BR-11
/** Ngày Publish đầu tiên (số ngày trước hôm nay) — trước đó số liệu kênh thật để trống (BR-04). */
const FIRST_PUBLISH_DAYS_AGO = 49;

/** Demo: mỗi Nhân sự số hội thoại thể hiện một trạng thái của Insights (4.3). ?demo= trên URL vẫn ghi đè.
 * Agent Draft tự ra "Chưa có số liệu"; Agent Quy trình / trigger tự ra "Đang phát triển". */
export const INSIGHTS_DEMO: Record<string, { state?: "no-sessions" | "empty-range" | "unpublish" | "error"; firstPublishDaysAgo?: number }> = {
  "finance-check": { state: "no-sessions" },
  "legal-review": { state: "empty-range" },
  "three-way-match-agent": { state: "unpublish" },
  "ops": { state: "error" },
  "policy-assistant": { firstPublishDaysAgo: 3 },
};

/* ---------- ngữ cảnh: tên đơn vị đếm ---------- */
const NounCtx = createContext("phiên");
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
  /** Token của kênh Chạy thử (BR-07: tính vào Token sử dụng, không tính vào token mỗi phiên). */
  testTokens: number; testTokensIn: number;
  /** Ngày Agent chưa có mặt (trước Publish đầu tiên / đang Unpublish): số liệu kênh thật là "--". */
  blank?: boolean;
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
    testTokens: Math.round(tokens * 0.04), testTokensIn: Math.round(tokens * 0.03),
  };
}

const NUM_KEYS = ["sessions", "users", "newUsers", "messages", "resolved", "abandoned", "likes", "dislikes", "botBubbles", "runs", "errors", "fallbacks", "cited", "tokens", "tokensIn", "csatN", "csatSum", "testTokens", "testTokensIn"] as const;
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
  const firstAgo = INSIGHTS_DEMO[agentId]?.firstPublishDaysAgo ?? FIRST_PUBLISH_DAYS_AGO;
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
  // Trước ngày Publish đầu tiên: không có số liệu kênh thật, chỉ còn token Chạy thử (BR-04, BR-07).
  const firstIdx = LOOKBACK - 1 - firstAgo;
  for (let i = 0; i < firstIdx; i++) {
    const d = days[i];
    NUM_KEYS.forEach(k => { if (k !== "testTokens" && k !== "testTokensIn") (d as Record<string, unknown>)[k] = 0; });
    d.blank = true;
  }
  const todayH = hourly(LOOKBACK - 1, hourNow);
  const yestH = hourly(LOOKBACK - 2, hourNow);
  days[LOOKBACK - 1] = merge(todayH, today, ddmm(today));
  const markers = VERSIONS.filter(v => v.daysAgo <= firstAgo).map(v => ({ label: v.version, day: days[LOOKBACK - 1 - v.daysAgo].day }));
  if (firstAgo < VERSIONS[0].daysAgo) markers.push({ label: "v1.0.0", day: days[firstIdx].day });
  const base30 = days.slice(-30).reduce((a, d) => a + d.sessions, 0);
  return { days, todayH, yestH, markers, base30, firstPublish: days[firstIdx].date };
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
  // Mặc định và link không hợp lệ: 7 ngày qua (nhánh 4.2 #5).
  let kind: RangeKind = raw === "today" || raw === "30" || raw === "custom" ? raw : "7";
  let start = LOOKBACK - 7, end = LOOKBACK - 1;
  if (kind === "today") start = LOOKBACK - 1;
  if (kind === "30") start = LOOKBACK - 30;
  if (kind === "custom") {
    const f = dayIndex(params.get("from")), t = dayIndex(params.get("to"));
    if (f >= 0 && t <= LOOKBACK - 1 && f <= t && t - f + 1 <= MAX_CUSTOM) { start = f; end = t; } else { kind = "7"; start = LOOKBACK - 7; }
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

/** Người dùng không trùng trong nhiều ngày ≈ tổng người dùng từng ngày × hệ số trùng (dữ liệu mẫu). */
function uniq(sumUsers: number, days: number) {
  const f = days <= 1 ? 1 : days <= 7 ? 1 - 0.45 * (days - 1) / 6 : Math.max(0.3, 0.55 - 0.2 * (days - 7) / 23);
  return Math.round(sumUsers * f);
}

function metricsFor(allRows: Day[]) {
  const rows = allRows.filter(d => !d.blank);
  const testTok = sum(allRows, "testTokens"), testIn = sum(allRows, "testTokensIn");
  const s = sum(rows, "sessions");
  const days = rows[0]?.hour !== undefined ? 1 : rows.length;
  const active = uniq(sum(rows, "users"), days);
  const newU = Math.round(active * (sum(rows, "newUsers") / Math.max(1, sum(rows, "users"))));
  const fb = sum(rows, "likes") + sum(rows, "dislikes");
  return {
    sessions: s, users: active, newUsers: newU, returningUsers: active - newU, dauAvg: Math.round(sum(rows, "users") / Math.max(1, days)), sessionsPerUser: Math.round((s / Math.max(1, active)) * 100) / 100, messages: sum(rows, "messages"),
    tokens: sum(rows, "tokens") + testTok, tokensIn: sum(rows, "tokensIn") + testIn, likes: sum(rows, "likes"), dislikes: sum(rows, "dislikes"),
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
    /** Có ngày Agent có mặt trong khoảng (false = cả khoảng trước Publish đầu tiên → "--"). */
    present: rows.length > 0,
  };
}
type Metrics = ReturnType<typeof metricsFor>;

function useAnalytics(agentId: string) {
  const data = useMemo(() => buildData(agentId), [agentId]);
  const period = usePeriod();
  return useMemo(() => {
    const today = period.kind === "today";
    // Mọi lựa chọn, kể cả Hôm nay, biểu đồ vẽ theo ngày (BR-01).
    const rows = data.days.slice(period.start, period.end + 1);
    const prevStart = period.start - period.len;
    const prev = today ? data.yestH : prevStart >= 0 ? data.days.slice(prevStart, period.start) : null;
    const cur = metricsFor(rows);
    const old = prev ? metricsFor(prev) : null;
    const markers = data.markers.filter(m => rows.some(d => d.day === m.day));
    // Bảng cố định (chủ đề, Tool, Knowledge…) được viết cho 30 ngày → co giãn theo số hội thoại của kỳ.
    const factor = cur.sessions / Math.max(1, data.base30);
    const heat = DOW.flatMap(dow => Array.from({ length: 24 }, (_, hour) => ({ dow, hour, sessions: 0 })));
    (today ? data.todayH : rows).forEach(d => {
      if (d.blank) return;
      const di = DOW.indexOf(dowOf(d.date));
      if (d.hour !== undefined) { heat[di * 24 + d.hour].sessions += d.sessions; return; }
      const w = hourWeights(di >= 5); const W = w.reduce((a, x) => a + x, 0);
      w.forEach((x, h) => { heat[di * 24 + h].sessions += Math.round((d.sessions * x) / W); });
    });
    const allTime = sum(data.days, "sessions");
    const firstPublish = data.firstPublish;
    const partial = rows.some(d => d.blank) && rows.some(d => !d.blank);
    return { rows, prev, cur, old, markers, factor, heat, today, step: "ngày", period, allTime, firstPublish, partial };
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
    : PRESETS.find(p => p.id === a.period.kind)?.name ?? "7 ngày qua";
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
            <div className={`text-left px-3 py-2 rounded-lg text-sm ${a.period.kind === "custom" ? "bg-primary-soft text-primary font-medium" : "text-muted-foreground"}`}>Tùy chọn</div>
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
              <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary h-8 px-3 text-xs">Hủy</button>
              <button type="button" disabled={!draft?.from || !draft?.to || tooLong}
                onClick={() => { if (draft?.from && draft?.to) { a.period.set("custom", draft.from, draft.to); setOpen(false); } }}
                className="btn-primary h-8 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                Áp dụng
              </button>
              </div>
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

/** BR-11: mốc cập nhật gần nhất theo chu kỳ 2 giờ (giờ Việt Nam). */
function updateTimes() {
  const now = new Date();
  const last = new Date(now); last.setMinutes(0, 0, 0); last.setHours(Math.floor(now.getHours() / UPDATE_EVERY_H) * UPDATE_EVERY_H);
  const next = new Date(last.getTime() + UPDATE_EVERY_H * 3600_000);
  return { last: format(last, "HH:mm dd/MM/yyyy"), next: format(next, "HH:mm dd/MM/yyyy") };
}

/** Tag đầu trang (4.2 #1, #2, #3, #8) — thẻ và biểu đồ vẫn hiện bên dưới theo BR-04. */
export type PageTag = { tone: "info" | "warning"; title: string; desc: string; actions?: React.ReactNode };

function Header({ a, title, desc, tag, badge }: { a: A; title: string; desc: string; tag?: PageTag | null; badge?: string }) {
  const t = updateTimes();
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}{badge && <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground align-middle">{badge}</span>}</h2>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
        <PeriodPicker a={a} />
      </div>
      <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
        <span>Giờ cập nhật: {t.last}</span>
        <span aria-hidden="true">·</span><span>Lần cập nhật kế tiếp: {t.next}</span>
        <span aria-hidden="true">·</span><span>Số của hôm nay là số tạm</span>
      </p>
      {tag && (
        <div role="status" className={`flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${tag.tone === "warning" ? "border-warning/40 bg-warning/10" : "border-primary/20 bg-primary/5"}`}>
          <div className="text-sm">
            <p className="font-medium">{tag.title}</p>
            <p className="text-muted-foreground">{tag.desc}</p>
          </div>
          {tag.actions && <div className="flex shrink-0 flex-wrap gap-2">{tag.actions}</div>}
        </div>
      )}
      {a.partial && (
        <p className="text-xs text-muted-foreground">Agent bắt đầu có số liệu từ {format(a.firstPublish, "dd/MM/yyyy")} (ngày Publish đầu tiên).</p>
      )}
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
  if (!COMPARE) return null;
  if (!a.old) return <span className="text-xs text-muted-foreground whitespace-nowrap">Chưa có kỳ trước</span>;
  const c = Number(a.cur[k]), o = Number(a.old[k]);
  return <DeltaPill diff={c - o} prev={o} good={good} unit={unit} />;
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

function Card({ title, note, children, className = "", badge }: { title: string; note?: string; children: React.ReactNode; className?: string; badge?: string }) {
  return (
    <div className={`surface-card p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold">{title}{badge && <span className="ml-1.5 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground align-middle">{badge}</span>}</h3>
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

/* ============ hiển thị 0 và "--" (BR-04) ============ */
type V = A & { tag?: PageTag | null; dash: boolean };
const D = "--";
/** Số liệu kênh thật: "--" khi Agent chưa có mặt trong khoảng. */
const real = (a: V, text: string) => (a.dash ? D : text);
/** Tỷ lệ / trung bình có mẫu số bằng 0 → "--". */
const ratio = (a: V, den: number, text: string) => (a.dash || !den ? D : text);
const tokIn = (d: Day) => (d.blank ? 0 : d.tokensIn) + d.testTokensIn;
const tokOut = (d: Day) => (d.blank ? 0 : d.tokens - d.tokensIn) + (d.testTokens - d.testTokensIn);

/* ============ TỔNG QUAN ============ */
/** 4 thẻ, mỗi thẻ có biểu đồ cột nhỏ theo ngày, không so sánh kỳ trước. Bấm thẻ sang mục chi tiết. */
export function AnalyticsOverview({ a }: { a: V }) {
  const { cur } = a;
  const [, setParams] = useSearchParams();
  const go = (section: AnalyticsSection) => setParams(p => { const n = new URLSearchParams(p); n.set("tab", "insights"); n.set("section", section); return n; });
  // Biểu đồ nhỏ theo ngày; ngày Agent chưa có mặt / "--" thì cột bằng 0.
  const per = (f: (d: Day) => number) => a.rows.map(d => (a.dash || d.blank ? 0 : f(d)));
  const cards: { title: string; info: string; section: AnalyticsSection; tabLabel: string; value: string; foot: string; viz: number[] }[] = [
    { title: "Số người dùng đang hoạt động", section: "usage", tabLabel: "Sử dụng",
      info: "Active users: số người dùng có ít nhất 1 phiên trong khoảng đang xem. Bằng Người dùng mới cộng Người dùng cũ.",
      value: real(a, vn(cur.users)), foot: a.dash ? "Người dùng mới -- · Người dùng cũ --" : `Người dùng mới ${vn(cur.newUsers)} · Người dùng cũ ${vn(cur.returningUsers)}`, viz: per(d => d.users) },
    { title: "Phiên", section: "usage", tabLabel: "Sử dụng",
      info: "Sessions: số cuộc trò chuyện ở kênh thật trong khoảng đang xem. Không tính kênh Chạy thử.",
      value: real(a, vn(cur.sessions)), foot: `${ratio(a, cur.users, vn(cur.sessionsPerUser, 2))} phiên mỗi người dùng`, viz: per(d => d.sessions) },
    { title: "Tổng lượt tương tác", section: "feedback", tabLabel: "Chất lượng",
      info: "Ratings: số lượt Like cộng số lượt Dislike. Người dùng đổi đánh giá thì chỉ tính lượt cuối.",
      value: real(a, vn(cur.likes + cur.dislikes)), foot: a.dash ? "-- Like : -- Dislike" : `${vn(cur.likes)} Like : ${vn(cur.dislikes)} Dislike`, viz: per(d => d.likes + d.dislikes) },
    { title: "Token sử dụng", section: "cost", tabLabel: "Chi phí",
      info: "Token usage: token đầu vào cộng token đầu ra, tính cả kênh Chạy thử.",
      value: compact(cur.tokens), foot: `${ratio(a, cur.sessions, vn(cur.tokPerSession))} token trung bình mỗi phiên`, viz: a.rows.map(d => tokIn(d) + tokOut(d)) },
  ];
  return (
    <Page>
      <Header a={a} title="Tổng quan" desc="Bấm vào thẻ để xem chi tiết." tag={a.tag} />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.title} role="button" tabIndex={0} onClick={() => go(c.section)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(c.section); } }}
            className="surface-card p-5 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">{c.title} <InfoTip text={c.info} label={c.title} /></h3>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-base whitespace-nowrap">
                {c.tabLabel} <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
              </span>
            </div>
            <div className="font-display text-3xl font-semibold tracking-tight tabular-nums mt-2">{c.value}</div>
            <div className="mt-3 h-11" title="Theo ngày trong khoảng đang xem">{c.viz.some(v => v > 0) ? <MiniBars values={c.viz} /> : <div className="h-full border-b border-dashed" aria-hidden="true" />}</div>
            <div className="text-xs text-muted-foreground mt-2 truncate tabular-nums">{c.foot}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

/** Thẻ số đơn giản (không delta). */
function Stat({ label, value, info, sub, badge }: { label: string; value: string; info: string; sub?: string; badge?: string }) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}{badge && <span className="ml-1.5 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium">{badge}</span>}</span>
        <InfoTip text={info} label={label} />
      </div>
      <div className="font-display text-2xl font-semibold tracking-tight tabular-nums mt-1.5">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 tabular-nums">{sub}</div>}
    </div>
  );
}

const DOW_NAME: Record<string, string> = { T2: "Thứ 2", T3: "Thứ 3", T4: "Thứ 4", T5: "Thứ 5", T6: "Thứ 6", T7: "Thứ 7", CN: "Chủ nhật" };
/** 5 mức đậm theo ô lớn nhất (0 = trống). */
const heatLevel = (v: number, max: number) => (v <= 0 ? 0 : Math.min(5, Math.ceil((v / max) * 5)));
const HEAT_ALPHA = [0, 0.18, 0.36, 0.55, 0.75, 1];

function TokenChart({ a }: { a: V }) {
  const series = a.rows.map(d => ({ day: d.day, "Đầu vào": tokIn(d), "Đầu ra": tokOut(d) }));
  return (
    <div className="h-56" role="img" aria-label="Token đầu vào và đầu ra theo ngày">
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
  );
}

/* ============ SỬ DỤNG ============ */
export function AnalyticsUsage({ a }: { a: V }) {
  const { cur } = a;
  const errors = a.rows.map(d => (!a.dash && !d.blank && d.runs ? { day: d.day, "Tỷ lệ lỗi": pct(d.errors, d.runs), "Số lỗi": d.errors } : { day: d.day }));
  const presentDows = [...new Set(a.rows.map(d => dowOf(d.date)))];
  const heatDows = DOW.filter(d => presentDows.includes(d));
  const cells = a.dash ? [] : a.heat.filter(h => heatDows.includes(h.dow));
  const maxHeat = Math.max(0, ...cells.map(h => h.sessions));
  const iv = tickEvery(a.rows.length);
  const total = Math.max(1, cur.users);
  const pie = [
    { name: "Người dùng mới", value: cur.newUsers, color: "hsl(var(--primary) / 0.35)" },
    { name: "Người dùng cũ", value: cur.returningUsers, color: "hsl(var(--primary))" },
  ];
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return (
    <Page>
      <Header a={a} title="Sử dụng" desc="Người dùng, phiên, lỗi, token, kênh và giờ cao điểm." tag={a.tag} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Số người dùng đang hoạt động" value={real(a, vn(cur.users))} info="Active users: người dùng có ít nhất 1 phiên trong khoảng đang xem. Mỗi người chỉ đếm 1 lần." />
        <Stat label="Người dùng mới" value={real(a, vn(cur.newUsers))} info="New users: người dùng có phiên đầu tiên với Agent rơi vào khoảng đang xem. Web widget và API: mỗi phiên là 1 người dùng mới." />
        <Stat label="Người dùng cũ" value={real(a, vn(cur.returningUsers))} info="Returning users: đã có phiên trước khoảng đang xem và có ít nhất 1 phiên trong khoảng." />
        <Stat label="Phiên" value={real(a, vn(cur.sessions))} sub={`${ratio(a, cur.users, vn(cur.sessionsPerUser, 2))} phiên mỗi người dùng`} info="Sessions: cuộc trò chuyện ở kênh thật, tính vào ngày bắt đầu. Sessions per user = Phiên ÷ Số người dùng đang hoạt động." />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Người dùng mới và cũ" note={`Tổng cả kỳ · ${periodText(a)}`}>
          {a.dash || !cur.users ? (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">{a.dash ? D : "0 người dùng"}</div>
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="relative h-56 w-56 shrink-0" role="img" aria-label={`Người dùng mới ${vn(cur.newUsers)}, người dùng cũ ${vn(cur.returningUsers)}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                      {pie.map(p => <Cell key={p.name} fill={p.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v)} (${vn(pct(v, total), 1)}%)`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-display text-2xl font-semibold tabular-nums">{vn(cur.users)}</span>
                  <span className="text-xs text-muted-foreground">người dùng đang hoạt động</span>
                </div>
              </div>
              <div className="space-y-3 min-w-[10rem] flex-1">
                {pie.map(p => (
                  <div key={p.name} className="flex items-center gap-3 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="flex-1">{p.name}</span>
                    <span className="tabular-nums font-medium">{vn(p.value)}</span>
                    <span className="tabular-nums text-muted-foreground w-14 text-right">{vn(pct(p.value, total), 1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card title="Lỗi theo ngày" note={`Tỷ lệ lỗi cả kỳ: ${ratio(a, cur.messages, `${vn(cur.errorPct, 1)}%`)}`}>
          <div className="h-56" role="img" aria-label="Tỷ lệ lỗi theo ngày">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errors} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={iv} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => n === "Số lỗi" ? [vn(v), n] : [`${vn(v, 1)}%`, n]} />
                {versionLines(a.markers)}
                <Line type="linear" dataKey="Tỷ lệ lỗi" stroke="hsl(var(--destructive))" strokeWidth={2} dot={a.rows.length < 3} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Token theo ngày" note={`Đầu vào và đầu ra, tính cả kênh Chạy thử · Token sử dụng cả kỳ: ${compact(cur.tokens)}`}>
          <TokenChart a={a} />
        </Card>
        <Card title="Theo kênh" note={periodText(a)}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2">Kênh</th><th className="text-right font-medium">Phiên</th><th className="text-right font-medium">Người dùng</th><th className="text-right font-medium">Tin nhắn mỗi người dùng</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {CHANNELS.map(c => {
                const s = Math.round(cur.sessions * c.share);
                const u = /Web widget|API/.test(c.channel) ? s : Math.round(cur.users * c.share);
                return (
                  <tr key={c.channel}>
                    <td className="py-2">{c.channel}</td>
                    <td className="text-right tabular-nums">{real(a, vn(s))}</td>
                    <td className="text-right tabular-nums">{real(a, vn(u))}</td>
                    <td className="text-right tabular-nums">{ratio(a, u, vn((s * 4.1) / Math.max(1, u), 1))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Tổng người dùng các kênh có thể lớn hơn Số người dùng đang hoạt động khi 1 người dùng nhiều kênh. Web widget và API: mỗi phiên là 1 người dùng.</p>
        </Card>
      </div>

      <Card title="Giờ cao điểm" note="Số phiên bắt đầu theo giờ và thứ trong khoảng đang xem">
        <div className="overflow-x-auto">
          <div className="grid gap-[2px] min-w-[420px]" style={{ gridTemplateColumns: "56px repeat(24, minmax(0, 1fr))" }} role="img" aria-label="Bản đồ nhiệt phiên theo giờ và thứ">
            {heatDows.map(dow => (
              <div key={dow} className="contents">
                <span className="text-[11px] text-muted-foreground leading-[18px]">{DOW_NAME[dow]}</span>
                {Array.from({ length: 24 }, (_, h) => {
                  const v = cells.find(c => c.dow === dow && c.hour === h)?.sessions ?? 0;
                  const lv = heatLevel(v, maxHeat);
                  return (
                    <span key={h} title={`${DOW_NAME[dow]}, ${hh(h)} – ${hh((h + 1) % 24)}: ${vn(v)} phiên`} className={`h-[18px] rounded-[3px] ${lv === 0 ? "bg-muted" : ""}`}
                      style={lv ? { background: `hsl(var(--primary) / ${HEAT_ALPHA[lv]})` } : undefined} />
                  );
                })}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-[10px] text-muted-foreground text-center">{h % 6 === 0 || h === 23 ? `${h}h` : ""}</span>)}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Ít</span>
          {HEAT_ALPHA.map((al, i) => <span key={i} className={`h-3 w-5 rounded-[3px] ${i === 0 ? "bg-muted" : ""}`} style={i ? { background: `hsl(var(--primary) / ${al})` } : undefined} aria-hidden="true" />)}
          <span>Nhiều</span>
          <span className="ml-2 tabular-nums">· Cao nhất: {vn(maxHeat)} phiên</span>
        </div>
      </Card>
    </Page>
  );
}

/* ============ CHẤT LƯỢNG ============ */
export function AnalyticsFeedback({ a }: { a: V }) {
  const { cur } = a;
  // Cột xếp chồng: Dislike ở dưới, Like ở trên; ngày không có lượt nào thì không có cột.
  const series = a.rows.map(d => (!a.dash && !d.blank && d.likes + d.dislikes ? { day: d.day, Dislike: d.dislikes, Like: d.likes } : { day: d.day }));
  const rates = a.rows.map(d => (!a.dash && !d.blank && d.likes + d.dislikes ? { day: d.day, Like: pct(d.likes, d.likes + d.dislikes), Dislike: pct(d.dislikes, d.likes + d.dislikes) } : { day: d.day }));
  const g = GUARDRAIL.map(x => ({ ...x, count: Math.round(x.count * a.factor) }));
  const maxG = Math.max(1, ...g.map(x => x.count));
  return (
    <Page>
      <Header a={a} title="Chất lượng" desc="Đánh giá của người dùng, trích dẫn nguồn và Guardrail." tag={a.tag} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Số lượt Like" value={real(a, vn(cur.likes))} sub={`Tỷ lệ Like ${ratio(a, cur.likes + cur.dislikes, `${vn(cur.likePct, 1)}%`)}`} info="Likes: số lượt Like trong khoảng đang xem. Người dùng đổi đánh giá thì chỉ tính lượt cuối. Tỷ lệ Like = số Like ÷ (Like + Dislike)." />
        <Stat label="Số lượt Dislike" value={real(a, vn(cur.dislikes))} sub={`Tỷ lệ Dislike ${ratio(a, cur.likes + cur.dislikes, `${vn(cur.dislikePct, 1)}%`)}`} info="Dislikes: số lượt Dislike trong khoảng đang xem. Người dùng đổi đánh giá thì chỉ tính lượt cuối. Tỷ lệ Dislike = số Dislike ÷ (Like + Dislike)." />
        <Stat label="CSAT" badge="Phase 2" value={ratio(a, cur.sessions, `${vn(cur.csat, 2)}/5`)} info="Customer satisfaction score: điểm trung bình người dùng chấm cuối phiên, thang 1 – 5." />
        <Stat label="Tỷ lệ trích dẫn nguồn" badge="Phase 2" value={ratio(a, cur.messages, `${vn(cur.citedPct, 1)}%`)} info="Citation rate: câu trả lời có trích dẫn tài liệu nguồn ÷ tổng câu trả lời × 100." />
        <Stat label="Tỷ lệ phản hồi" badge="Phase 2" value={ratio(a, cur.messages, `${vn(cur.coveragePct, 1)}%`)} info="Feedback rate: (số Like + số Dislike) ÷ tổng câu trả lời × 100. Tỷ lệ thấp thì số lượt Like/Dislike chưa đại diện cho nhiều người dùng." />
      </div>
      <Card title="Like / Dislike theo ngày" note="Chiều cao cột là tổng lượt tương tác trong ngày">
        <div className="h-64" role="img" aria-label="Số lượt Like và Dislike theo ngày">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={tickEvery(series.length)} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TT} cursor={{ fill: "hsl(var(--surface-muted))" }}
                content={({ active, payload, label }) => {
                  const p = payload?.[0]?.payload as { Like?: number; Dislike?: number } | undefined;
                  if (!active || !p || p.Like === undefined) return null;
                  const t = (p.Like ?? 0) + (p.Dislike ?? 0);
                  return <div style={TT} className="bg-popover px-3 py-2 text-xs tabular-nums">{label}: {vn(p.Like ?? 0)} Like · {vn(p.Dislike ?? 0)} Dislike ({vn(pct(p.Like ?? 0, t), 0)}% / {vn(pct(p.Dislike ?? 0, t), 0)}%)</div>;
                }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
              {versionLines(a.markers)}
              <Bar dataKey="Dislike" stackId="f" fill="hsl(var(--destructive))" maxBarSize={18} isAnimationActive={false} />
              <Bar dataKey="Like" stackId="f" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Tỷ lệ Like và tỷ lệ Dislike theo ngày">
        <div className="h-56" role="img" aria-label="Tỷ lệ Like và Dislike theo ngày">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rates} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={tickEvery(rates.length)} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
              {versionLines(a.markers)}
              <Line type="linear" dataKey="Like" stroke="hsl(var(--success))" strokeWidth={2} dot={rates.length < 3} isAnimationActive={false} />
              <Line type="linear" dataKey="Dislike" stroke="hsl(var(--destructive))" strokeWidth={2} dot={rates.length < 3} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Số lần Guardrail chặn" badge="Phase 2" note={`Theo quy tắc · ${periodText(a)}`}>
        {a.dash ? <p className="text-sm text-muted-foreground">--</p> : <HBars max={maxG} rows={g.map((x, i) => ({ label: x.rule, value: x.count, text: vn(x.count), highlight: i === 0 }))} />}
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

export function AnalyticsTopics({ a, agentId, canEdit = true }: { a: A; agentId: string; canEdit?: boolean }) {
  const noun = useNoun();
  const [caseQ, setCaseQ] = useState<string | null>(null);
  const unanswered = UNANSWERED.map(u => ({ ...u, times: Math.round(u.times * a.factor) })).filter(u => u.times > 0);
  return (
    <Page>
      <Header a={a} title="Chủ đề" badge="Cập nhật sau" desc="AI gom các câu hỏi giống nhau thành chủ đề. Kèm danh sách câu hỏi chưa trả lời được." />
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Chủ đề</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{periodText(a)} · Thay đổi so với kỳ trước, "Mới" là chủ đề kỳ trước chưa có</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Chủ đề</th><th className="text-right font-medium px-3">{cap(noun)}</th><th className="text-right font-medium px-3">Thay đổi</th><th className="text-right font-medium px-3">Tỷ lệ trả lời</th><th className="text-right font-medium px-5">Tỷ lệ Like</th>
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
          <p className="text-xs text-muted-foreground mt-0.5">Câu Nhân sự số không trả lời được hoặc bị Dislike, xếp theo số lần hỏi · {periodText(a)}</p>
        </div>
        {unanswered.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Không có câu hỏi nào chưa trả lời được trong khoảng thời gian này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-5 py-2">Câu hỏi</th><th className="text-left font-medium px-3">Chủ đề</th><th className="text-right font-medium px-3">Số lần</th><th className="text-left font-medium px-3">Lý do</th><th className="text-left font-medium px-3">Lần gần nhất</th>{canEdit && <th className="px-5" />}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {unanswered.map(u => (
                  <tr key={u.q}>
                    <td className="px-5 py-2.5 max-w-[320px]">{u.q}</td>
                    <td className="px-3 text-muted-foreground">{u.topic}</td>
                    <td className="text-right tabular-nums px-3">{u.times}</td>
                    <td className="px-3"><span className={`chip whitespace-nowrap ${u.reason === "Trả lời sai" ? "bg-[hsl(var(--destructive-soft))] text-destructive border-[hsl(var(--destructive)/0.2)]" : "chip-warning"}`}>{u.reason}</span></td>
                    <td className="px-3 text-muted-foreground whitespace-nowrap">{u.last}</td>
                    {canEdit && (
                      <td className="px-5 text-right">
                        <button className="btn-secondary h-8 text-xs whitespace-nowrap" onClick={() => setCaseQ(u.q)}>Tạo test case</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {canEdit && <AddCaseDialog agentId={agentId} question={caseQ} onClose={() => setCaseQ(null)} />}
    </Page>
  );
}

/* ============ HOẠT ĐỘNG ============ */
export function AnalyticsOperations({ a }: { a: A }) {
  const lat = a.rows.map(d => d.sessions ? { day: d.day, "P95": Math.round(d.p95 * 10) / 10, "Trung vị (P50)": Math.round(d.p50 * 10) / 10 } : { day: d.day });
  const err = a.rows.map(d => d.sessions ? { day: d.day, "Tỷ lệ không trả lời được": pct(d.fallbacks, d.sessions), "Tỷ lệ lỗi": pct(d.errors, d.runs) } : { day: d.day });
  const iv = tickEvery(a.rows.length);
  const dots = a.rows.length < 3;
  return (
    <Page>
      <Header a={a} title="Hiệu năng" badge="Cập nhật sau" desc="Thời gian phản hồi, tỷ lệ lỗi, Tool và Knowledge." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Thời gian phản hồi" note="Giây. Trung vị (P50) và P95: 95% câu trả lời nhanh hơn mức này">
          <div className="h-52" role="img" aria-label={`Thời gian phản hồi theo ${a.step}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lat} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={iv} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="s" />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)} giây`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
                {versionLines(a.markers)}
                <Line type="linear" dataKey="P95" stroke="hsl(var(--warning))" strokeWidth={2} dot={dots} isAnimationActive={false} />
                <Line type="linear" dataKey="Trung vị (P50)" stroke="hsl(var(--primary))" strokeWidth={2} dot={dots} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Tỷ lệ lỗi và tỷ lệ không trả lời được" note="% trên tổng số câu trả lời">
          <div className="h-52" role="img" aria-label={`Tỷ lệ lỗi và câu không trả lời được theo ${a.step}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={err} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={iv} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND} />
                {versionLines(a.markers)}
                <Line type="linear" dataKey="Tỷ lệ không trả lời được" stroke="hsl(var(--warning))" strokeWidth={2} dot={dots} isAnimationActive={false} />
                <Line type="linear" dataKey="Tỷ lệ lỗi" stroke="hsl(var(--destructive))" strokeWidth={2} dot={dots} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Tool và Connector</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Số lần gọi và tỷ lệ thành công · {periodText(a)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Tool</th><th className="text-right font-medium px-3">Số lần gọi</th><th className="text-right font-medium px-3">Tỷ lệ thành công</th><th className="text-left font-medium px-3">Lỗi thường gặp</th><th className="text-right font-medium px-5">P95</th>
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
          <p className="text-xs text-muted-foreground mt-0.5">Số lần truy xuất và tỷ lệ lỗi đọc tài liệu · {periodText(a)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Tài liệu</th><th className="text-right font-medium px-3">Số lần truy xuất</th><th className="text-right font-medium px-5">Tỷ lệ lỗi đọc</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {KNOWLEDGE.map(k => {
                const uses = Math.round(k.uses * a.factor);
                return (
                  <tr key={k.source}>
                    <td className="px-5 py-2.5">{k.source}{uses === 0 && <span className="chip chip-warning ml-2">Chưa được truy xuất</span>}</td>
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
export function AnalyticsCost({ a }: { a: V }) {
  const { cur } = a;
  const inPct = pct(cur.tokensIn, cur.tokens);
  return (
    <Page>
      <Header a={a} title="Chi phí" desc="Token sử dụng, tính cả kênh Chạy thử." tag={a.tag} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Token sử dụng" value={compact(cur.tokens)} info="Token usage: token đầu vào (câu hỏi, Instructions, tài liệu Agent đọc) cộng token đầu ra (câu trả lời). Tính cả kênh Chạy thử." />
        <Stat label="Token trung bình mỗi phiên" value={ratio(a, cur.sessions, vn(cur.tokPerSession))} info="Tokens per session: token của kênh thật ÷ Phiên. Không tính token Chạy thử." />
        <Stat label="% đầu vào / đầu ra" value={cur.tokens ? `${vn(inPct, 0)}% / ${vn(100 - inPct, 0)}%` : D} info="Input / output share: token đầu vào ÷ Token sử dụng × 100; đầu ra = 100% trừ đầu vào." />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        <Card title="Token theo ngày" note={`Đầu vào và đầu ra · Token sử dụng cả kỳ: ${compact(cur.tokens)}`}>
          <TokenChart a={a} />
        </Card>
        <Card title="Token theo model" badge="Phase 2" note={periodText(a)}>
          <HBars rows={MODELS.map((m, i) => ({ label: m.model, value: m.share, text: `${m.share}%`, highlight: i === 0 }))} />
        </Card>
      </div>
    </Page>
  );
}

/* ============ TRẠNG THÁI ============ */
function Developing() {
  return (
    <Page>
      <EmptyState icon={Analytics01Icon} title="Đang phát triển" desc="Tính năng này đang được phát triển và sẽ sớm ra mắt." />
    </Page>
  );
}

function LoadingSkeleton() {
  return (
    <Page>
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải số liệu">
        <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded-md bg-muted animate-pulse" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
        <div className="grid lg:grid-cols-2 gap-4">{[0, 1].map(i => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}</div>
      </div>
    </Page>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Page>
      <EmptyState icon={Analytics01Icon} title="Không tải được số liệu. Vui lòng thử lại." desc="">
        <button className="btn-secondary" onClick={onRetry}>Thử lại</button>
      </EmptyState>
    </Page>
  );
}

/** Ngày rỗng giữ token Chạy thử (BR-07). */
const blankRow = (d: Day): Day => ({ ...d, sessions: 0, users: 0, newUsers: 0, messages: 0, resolved: 0, abandoned: 0, likes: 0, dislikes: 0, botBubbles: 0, runs: 0, errors: 0, fallbacks: 0, cited: 0, tokens: 0, tokensIn: 0, csatN: 0, csatSum: 0, blank: true });
const zeroRow = (d: Day): Day => ({ ...blankRow(d), blank: d.blank });

/** Router used by AgentBuilder → Insights. Demo các trạng thái bằng ?demo=unpublished|no-sessions|empty-range|unpublish|error. */
export function AgentAnalytics({ agentId, section, kind = "conversational", published = true, onPublish, onOpenChannels, canEdit = true }: {
  agentId: string; section: AnalyticsSection; kind?: AnalyticsAgentKind; published?: boolean; canEdit?: boolean;
  onPublish?: () => void; onOpenChannels?: () => void;
}) {
  const a = useAnalytics(agentId);
  const [params] = useSearchParams();
  const demo = params.get("demo") ?? INSIGHTS_DEMO[agentId]?.state ?? null;
  const rangeKey = `${a.period.kind}-${a.period.start}-${a.period.end}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(demo === "error");
  useEffect(() => {
    const t = window.setTimeout(() => setLoadedKey(rangeKey), 400);
    return () => window.clearTimeout(t);
  }, [rangeKey]);

  if (kind !== "conversational") return <Developing />;
  if (failed) return <LoadError onRetry={() => { setFailed(false); setLoadedKey(null); window.setTimeout(() => setLoadedKey(rangeKey), 400); }} />;
  if (loadedKey !== rangeKey) return <LoadingSkeleton />;

  const notPublished = !published || demo === "unpublished";
  const noSessions = !notPublished && (a.allTime === 0 || demo === "no-sessions");
  const emptyRange = !notPublished && !noSessions && (a.cur.sessions === 0 || demo === "empty-range");
  const unpublishFrom = demo === "unpublish" ? a.rows[Math.max(0, a.rows.length - 3)].date : null;

  let rows = a.rows;
  if (notPublished) rows = rows.map(blankRow);
  else if (noSessions || emptyRange) rows = rows.map(zeroRow);
  else if (unpublishFrom) rows = rows.map(d => (d.date >= unpublishFrom ? blankRow(d) : d));
  const cur = metricsFor(rows);
  const dash = notPublished || !cur.present;

  const attach = canEdit && onOpenChannels
    ? <button className={notPublished ? "btn-secondary" : "btn-primary"} onClick={onOpenChannels}>Gắn vào kênh</button> : null;
  let tag: PageTag | null = null;
  if (notPublished) tag = { tone: "info", title: "Chưa có số liệu", desc: "Nhân sự số chưa được publish nên chưa có phiên thật. Số liệu bắt đầu có sau khi publish và gắn vào kênh. Phiên ở kênh Chạy thử không được tính.",
    actions: canEdit ? <>{onPublish && <button className="btn-primary" onClick={onPublish}><HugeiconsIcon icon={Rocket01Icon} size={14} /> Publish</button>}{attach}</> : undefined };
  else if (noSessions) tag = { tone: "info", title: "Chưa có phiên nào", desc: "Gắn Nhân sự số vào kênh để người dùng bắt đầu dùng.", actions: attach ?? undefined };
  else if (emptyRange) tag = { tone: "info", title: "Không có phiên trong khoảng thời gian này", desc: "Chọn khoảng thời gian khác.",
    actions: a.period.kind !== "7" ? <button className="btn-secondary" onClick={() => a.period.set("7")}>Xem 7 ngày qua</button> : undefined };
  else if (unpublishFrom) tag = { tone: "warning", title: `Unpublish từ ${format(unpublishFrom, "dd/MM/yyyy")}`, desc: "Số liệu lịch sử vẫn hiện; các ngày bị Unpublish hiện \"--\". Token của kênh Chạy thử vẫn được tính." };

  const v: V = { ...a, rows, cur, dash, tag, partial: a.partial && !notPublished };
  let body: React.ReactNode;
  switch (section) {
    case "usage": body = <AnalyticsUsage a={v} />; break;
    case "feedback": body = <AnalyticsFeedback a={v} />; break;
    case "cost": body = <AnalyticsCost a={v} />; break;
    case "topics": body = <AnalyticsTopics a={v} agentId={agentId} canEdit={canEdit} />; break;
    case "operations": body = <AnalyticsOperations a={v} />; break;
    default: body = <AnalyticsOverview a={v} />;
  }
  return <NounCtx.Provider value="phiên">{body}</NounCtx.Provider>;
}

export default AgentAnalytics;
