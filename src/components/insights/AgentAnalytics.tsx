import { useMemo } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

/* =====================================================================================
 * Agent details → Insights: số liệu tổng hợp cho chủ Nhân sự số.
 * Sub-tab: Tổng quan / Sử dụng / Chất lượng / Người dùng hỏi gì / Hoạt động / Chi phí.
 * Dữ liệu mẫu, sinh cố định theo agentId (cùng một Nhân sự số luôn ra cùng số liệu).
 * "Hội thoại" = mọi hội thoại trừ kênh Chạy thử (builder và người dùng cuối đều tính).
 * Kỳ mặc định: 28 ngày gần nhất, so với 28 ngày trước đó.
 * ===================================================================================== */

export type AnalyticsSection = "performance" | "usage" | "feedback" | "topics" | "operations" | "cost";

/* ---------- seeded sample data ---------- */
function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Day = {
  date: Date; day: string; sessions: number; users: number; newUsers: number; messages: number;
  resolved: number; abandoned: number; likes: number; dislikes: number; botBubbles: number;
  runs: number; errors: number; fallbacks: number; cited: number; tokens: number; p50: number; p95: number;
  csatN: number; csatSum: number;
};

const VERSIONS = [
  { version: "v1.2.0", offset: 14 },
  { version: "v1.3.0", offset: 35 },
  { version: "v1.4.0", offset: 46 },
];

const CHANNELS = [
  { channel: "Workspace", share: 0.46 }, { channel: "Web widget", share: 0.27 }, { channel: "Zalo", share: 0.17 },
  { channel: "API", share: 0.07 }, { channel: "Teams", share: 0.03 },
];

const TOPICS = [
  { topic: "Phí bảo hiểm và cách đóng phí", share: 0.21, answer: 93, like: 84, change: 12 },
  { topic: "Quy trình yêu cầu bồi thường", share: 0.18, answer: 88, like: 79, change: 25 },
  { topic: "Quyền lợi sản phẩm An Phúc Trọn Đời", share: 0.14, answer: 90, like: 83, change: 4 },
  { topic: "Tra cứu tình trạng hợp đồng", share: 0.12, answer: 82, like: 74, change: -6 },
  { topic: "Thay đổi thông tin hợp đồng", share: 0.09, answer: 71, like: 68, change: 9 },
  { topic: "Huỷ hợp đồng và giá trị hoàn lại", share: 0.07, answer: 58, like: 61, change: 38 },
  { topic: "Bảo hiểm sức khoẻ bổ trợ", share: 0.06, answer: 79, like: 80, change: -3 },
  { topic: "Đại lý và kênh mua", share: 0.05, answer: 86, like: 82, change: 2 },
  { topic: "Thuế thu nhập với quyền lợi bảo hiểm", share: 0.04, answer: 41, like: 52, change: 160 },
  { topic: "Khác", share: 0.04, answer: 69, like: 70, change: 0 },
];

const UNANSWERED = [
  { q: "Giá trị hoàn lại nếu huỷ hợp đồng năm thứ 3 là bao nhiêu?", topic: "Huỷ hợp đồng và giá trị hoàn lại", times: 34, reason: "Chưa có trong Knowledge", last: "19/10" },
  { q: "Quyền lợi bảo hiểm có phải đóng thuế TNCN không?", topic: "Thuế thu nhập với quyền lợi bảo hiểm", times: 29, reason: "Chưa có trong Knowledge", last: "19/10" },
  { q: "Đổi người thụ hưởng cần giấy tờ gì?", topic: "Thay đổi thông tin hợp đồng", times: 21, reason: "Trả lời sai", last: "18/10" },
  { q: "Bồi thường nằm viện nội trú ở nước ngoài được không?", topic: "Quy trình yêu cầu bồi thường", times: 17, reason: "Chưa có trong Knowledge", last: "17/10" },
  { q: "Tra cứu hợp đồng theo số CCCD", topic: "Tra cứu tình trạng hợp đồng", times: 14, reason: "Tra cứu bị lỗi", last: "19/10" },
  { q: "Đóng phí trễ hạn 60 ngày có mất hiệu lực không?", topic: "Phí bảo hiểm và cách đóng phí", times: 11, reason: "Trả lời sai", last: "16/10" },
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

function buildData(agentId: string) {
  const r = rng(agentId || "agent");
  const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - 1);
  const days: Day[] = [];
  for (let i = 0; i < 56; i++) {
    const date = new Date(end); date.setDate(end.getDate() - (55 - i));
    const q = VERSIONS.filter(v => i >= v.offset).length;
    const wk = date.getDay() === 0 || date.getDay() === 6;
    const sessions = Math.max(5, Math.round((70 + i * 0.9) * (wk ? 0.45 : 1) + (r() - 0.5) * 12));
    const resolved = Math.round(sessions * (0.58 + 0.05 * q + (r() - 0.5) * 0.06));
    const abandoned = Math.round(sessions * (0.12 - 0.015 * q + (r() - 0.5) * 0.03));
    const users = Math.round(sessions * (0.72 + r() * 0.08));
    const messages = Math.round(sessions * (3.6 + r()));
    const fb = Math.round(messages * (0.1 + r() * 0.05));
    const likes = Math.round(fb * (0.72 + 0.04 * q + (r() - 0.5) * 0.06));
    const runs = messages;
    const csatN = Math.round(sessions * 0.07);
    days.push({
      date, day: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      sessions, users, newUsers: Math.round(users * (0.3 + r() * 0.15)), messages, resolved, abandoned,
      likes, dislikes: fb - likes, botBubbles: messages, runs,
      errors: Math.round(runs * ((q < 2 ? 0.035 : q === 2 ? 0.012 : 0.02) + (r() - 0.5) * 0.01)),
      fallbacks: Math.round(sessions * (0.12 - 0.02 * q) * (0.8 + r() * 0.4)),
      cited: Math.round(messages * (0.55 + 0.06 * q)),
      tokens: Math.round(sessions * (5200 + r() * 1000 + (q >= 3 ? 900 : 0))),
      p50: 2.1 + r() * 0.5 + (q >= 3 ? 0.4 : 0), p95: 5.2 + r() + (q >= 3 ? 1.1 : 0),
      csatN, csatSum: Math.round(csatN * (3.9 + 0.1 * q + (r() - 0.5) * 0.3)),
    });
  }
  const last = days.slice(-28), prev = days.slice(0, 28);
  const total = last.reduce((a, d) => a + d.sessions, 0);
  const heat = DOW.flatMap((dow, di) => Array.from({ length: 24 }, (_, h) => {
    const w = (di >= 5 ? 0.45 : 1) * (Math.exp(-(((h - 10) / 2.2) ** 2)) + 0.8 * Math.exp(-(((h - 15) / 2.5) ** 2)) + 0.25 * Math.exp(-(((h - 21) / 1.8) ** 2)) + 0.03);
    return { dow, hour: h, sessions: Math.round((w * total) / 60 * (0.85 + r() * 0.3)) };
  }));
  const markers = VERSIONS.map(v => ({ label: v.version, day: days[v.offset].day }));
  return { days, last, prev, total, heat, markers };
}

/* ---------- helpers ---------- */
const sum = (rows: Day[], k: keyof Day) => rows.reduce((a, d) => a + (d[k] as number), 0);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const vn = (n: number, digits = 0) => n.toLocaleString("vi-VN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const compact = (n: number) => (n >= 1e6 ? `${vn(n / 1e6, 1)} tr` : n >= 1e4 ? `${vn(n / 1e3, 1)} N` : vn(n));
const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const TT = { borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 };

function metricsFor(rows: Day[]) {
  const s = sum(rows, "sessions");
  return {
    sessions: s, users: sum(rows, "users"), messages: sum(rows, "messages"), tokens: sum(rows, "tokens"),
    resolvedPct: pct(sum(rows, "resolved"), s),
    likePct: pct(sum(rows, "likes"), sum(rows, "likes") + sum(rows, "dislikes")),
    dislikePct: pct(sum(rows, "dislikes"), sum(rows, "likes") + sum(rows, "dislikes")),
    errorPct: pct(sum(rows, "errors"), sum(rows, "runs")),
    csat: Math.round((sum(rows, "csatSum") / Math.max(1, sum(rows, "csatN"))) * 100) / 100,
    citedPct: pct(sum(rows, "cited"), sum(rows, "botBubbles")),
    coveragePct: pct(sum(rows, "likes") + sum(rows, "dislikes"), sum(rows, "botBubbles")),
    tokPerSession: Math.round(sum(rows, "tokens") / Math.max(1, s)),
  };
}

function useAnalytics(agentId: string) {
  return useMemo(() => {
    const d = buildData(agentId);
    return { ...d, cur: metricsFor(d.last), old: metricsFor(d.prev) };
  }, [agentId]);
}

function Header({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
      <span className="text-xs text-muted-foreground bg-surface border border-border rounded-lg px-3 h-8 inline-flex items-center">
        28 ngày gần nhất · so với 28 ngày trước đó
      </span>
    </div>
  );
}

/** good = 1 khi tăng là tốt, -1 khi giảm là tốt. unit "pp" hiển thị chênh lệch điểm %. */
function Kpi({ label, value, cur, prev, good, unit, info, sub }: {
  label: string; value: string; cur: number; prev: number; good: 1 | -1; unit?: "pp"; info: string; sub?: string;
}) {
  const diff = cur - prev;
  const rel = prev ? (diff / prev) * 100 : 0;
  const better = diff * good >= 0;
  const text = unit === "pp" ? `${diff >= 0 ? "+" : ""}${vn(diff, 1)} điểm %` : `${rel >= 0 ? "+" : ""}${vn(rel, 1)}%`;
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span title={info} aria-label={info} className="cursor-help"><HugeiconsIcon icon={InformationCircleIcon} size={13} /></span>
      </div>
      <div className="font-display text-2xl font-semibold tracking-tight">{value}</div>
      <div className={`text-xs mt-1 ${better ? "text-success" : "text-destructive"}`}>{diff >= 0 ? "↑" : "↓"} {text} so với kỳ trước</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
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

function HBars({ rows, max = 100, tone = "primary" }: { rows: { label: string; value: number; text: string; highlight?: boolean }[]; max?: number; tone?: "primary" | "destructive" }) {
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.label} className="grid grid-cols-[minmax(7rem,12rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={r.label}>{r.label}</span>
          <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
            <div className={`h-full rounded-full ${r.highlight ? (tone === "destructive" ? "bg-destructive" : "bg-primary") : "bg-primary/40"}`} style={{ width: `${Math.max(1, (r.value / max) * 100)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums text-right whitespace-nowrap">{r.text}</span>
        </div>
      ))}
    </div>
  );
}

function VersionLines({ markers }: { markers: { label: string; day: string }[] }) {
  return <>{markers.map(m => (
    <ReferenceLine key={m.label} x={m.day} stroke="hsl(var(--primary))" strokeOpacity={0.6} strokeDasharray="3 3"
      label={{ value: m.label, position: "insideTopLeft", fontSize: 11, fill: "hsl(var(--primary))" }} />
  ))}</>;
}

/* ============ TỔNG QUAN ============ */
export function AnalyticsOverview({ agentId }: { agentId: string }) {
  const a = useAnalytics(agentId);
  const { cur, old } = a;
  const chart = a.last.map(d => ({ day: d.day, "Tự xử lý": d.resolved, "Chưa tự xử lý": d.sessions - d.resolved }));
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, h, sessions: a.heat.filter(x => x.hour === h).reduce((s, x) => s + x.sessions, 0) }));
  const markers = a.markers.filter(m => chart.some(c => c.day === m.day));
  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <Header title="Tổng quan" desc={`Trong 28 ngày qua, Nhân sự số đã nhận ${vn(cur.sessions)} hội thoại. ${vn(cur.resolvedPct, 1)}% được xử lý trọn vẹn mà không cần người.`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Hội thoại" value={vn(cur.sessions)} cur={cur.sessions} prev={old.sessions} good={1} info="Số hội thoại, không tính kênh Chạy thử." />
        <Kpi label="Người dùng" value={vn(cur.users)} cur={cur.users} prev={old.users} good={1} info="Số người khác nhau đã chat với Nhân sự số." />
        <Kpi label="Tin nhắn nhận được" value={vn(cur.messages)} cur={cur.messages} prev={old.messages} good={1} info="Số tin nhắn người dùng gửi." />
        <Kpi label="Tự xử lý" value={`${vn(cur.resolvedPct, 1)}%`} cur={cur.resolvedPct} prev={old.resolvedPct} good={1} unit="pp" info="Hội thoại Nhân sự số trả lời được và không bị Dislike." />
        <Kpi label="Tỷ lệ Like" value={`${vn(cur.likePct, 1)}%`} cur={cur.likePct} prev={old.likePct} good={1} unit="pp" info="Số Like chia cho tổng số Like và Dislike." />
        <Kpi label="Tỷ lệ lỗi" value={`${vn(cur.errorPct, 1)}%`} cur={cur.errorPct} prev={old.errorPct} good={-1} unit="pp" info="Số lượt trả lời bị lỗi chia cho tổng số lượt trả lời." />
        <Kpi label="Token" value={compact(cur.tokens)} cur={cur.tokens} prev={old.tokens} good={-1} info="Tổng token đầu vào và đầu ra." />
        <Kpi label="Token mỗi hội thoại" value={vn(cur.tokPerSession)} cur={cur.tokPerSession} prev={old.tokPerSession} good={-1} info="Tổng token chia cho số hội thoại." />
      </div>

      <Card title="Hội thoại mỗi ngày" note="Vạch đứt là ngày triển khai phiên bản mới">
        <div className="h-60" role="img" aria-label="Hội thoại mỗi ngày trong 28 ngày, chia theo tự xử lý và chưa tự xử lý">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} cursor={{ fill: "hsl(var(--surface-muted))" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <VersionLines markers={markers} />
              <Bar dataKey="Tự xử lý" stackId="a" fill="hsl(var(--primary))" isAnimationActive={false} />
              <Bar dataKey="Chưa tự xử lý" stackId="a" fill="hsl(var(--border-strong))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Hội thoại theo kênh" note="28 ngày">
          <HBars rows={CHANNELS.map((c, i) => ({ label: c.channel, value: c.share * 100, text: `${vn(c.share * 100)}% · ${vn(Math.round(a.total * c.share))}`, highlight: i === 0 }))} />
        </Card>
        <Card title="Hội thoại theo giờ trong ngày" note="Cột nhạt là ngoài giờ hành chính">
          <div className="h-44" role="img" aria-label="Số hội thoại theo giờ trong ngày">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval={5} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [vn(v), "Hội thoại"]} cursor={{ fill: "hsl(var(--surface-muted))" }} />
                <Bar dataKey="sessions" radius={[3, 3, 0, 0]} isAnimationActive={false}
                  shape={(p: any) => <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={3}
                    fill={p.payload.h < 8 || p.payload.h >= 17 ? "hsl(var(--primary) / 0.35)" : "hsl(var(--primary))"} />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============ SỬ DỤNG ============ */
export function AnalyticsUsage({ agentId }: { agentId: string }) {
  const a = useAnalytics(agentId);
  const users = a.last.map(d => ({ day: d.day, "Lần đầu": d.newUsers, "Quay lại": d.users - d.newUsers }));
  const rates = a.last.map(d => ({ day: d.day, "Tự xử lý": pct(d.resolved, d.sessions), "Bỏ dở": pct(d.abandoned, d.sessions) }));
  const markers = a.markers.filter(m => rates.some(c => c.day === m.day));
  const maxHeat = Math.max(...a.heat.map(h => h.sessions));
  const off = a.heat.filter(h => h.hour < 8 || h.hour >= 17 || h.dow === "T7" || h.dow === "CN").reduce((s, h) => s + h.sessions, 0);
  const offPct = pct(off, a.heat.reduce((s, h) => s + h.sessions, 0));
  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <Header title="Sử dụng" desc="Ai đang dùng Nhân sự số, qua kênh nào, vào lúc nào và kết quả hội thoại ra sao." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Người dùng theo ngày" note="Người dùng lần đầu và người quay lại">
          <div className="h-56" role="img" aria-label="Người dùng lần đầu và quay lại theo ngày">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={users} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TT} cursor={{ fill: "hsl(var(--surface-muted))" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Lần đầu" stackId="u" fill="hsl(var(--accent))" isAnimationActive={false} />
                <Bar dataKey="Quay lại" stackId="u" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Kết quả hội thoại (%)" note="Tự xử lý: Nhân sự số trả lời được và không bị Dislike">
          <div className="h-56" role="img" aria-label="Tỷ lệ tự xử lý và bỏ dở theo ngày">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rates} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <VersionLines markers={markers} />
                <Line type="linear" dataKey="Tự xử lý" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="linear" dataKey="Bỏ dở" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Theo kênh" note="28 ngày">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2">Kênh</th><th className="text-right font-medium">Hội thoại</th><th className="text-right font-medium">Người dùng</th><th className="text-right font-medium">Tin nhắn mỗi người</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {CHANNELS.map(c => {
                const s = Math.round(a.total * c.share); const u = Math.round(s * 0.76);
                return <tr key={c.channel}><td className="py-2">{c.channel}</td><td className="text-right tabular-nums">{vn(s)}</td><td className="text-right tabular-nums">{vn(u)}</td><td className="text-right tabular-nums">{vn((s * 4.1) / Math.max(1, u), 1)}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
        <Card title="Giờ cao điểm" note={`Hội thoại theo giờ và thứ · ${vn(offPct, 1)}% rơi vào ngoài giờ hành chính`}>
          <div className="overflow-x-auto">
            <div className="grid gap-[2px] min-w-[420px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }} role="img" aria-label="Bản đồ nhiệt hội thoại theo giờ và thứ">
              {DOW.map(dow => (
                <div key={dow} className="contents">
                  <span className="text-[11px] text-muted-foreground leading-[18px]">{dow}</span>
                  {a.heat.filter(h => h.dow === dow).map(h => (
                    <span key={h.hour} title={`${dow} · ${h.hour}h: ${vn(h.sessions)} hội thoại`} className="h-[18px] rounded-[3px]"
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
    </div>
  );
}

/* ============ CHẤT LƯỢNG ============ */
export function AnalyticsFeedback({ agentId }: { agentId: string }) {
  const a = useAnalytics(agentId);
  const { cur, old } = a;
  const series = a.last.map(d => ({ day: d.day, Like: pct(d.likes, d.likes + d.dislikes), Dislike: pct(d.dislikes, d.likes + d.dislikes) }));
  const markers = a.markers.filter(m => series.some(c => c.day === m.day));
  const maxG = Math.max(...GUARDRAIL.map(g => g.count));
  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <Header title="Chất lượng" desc="Người dùng đánh giá câu trả lời của Nhân sự số thế nào." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Tỷ lệ Like" value={`${vn(cur.likePct, 1)}%`} cur={cur.likePct} prev={old.likePct} good={1} unit="pp" info="Số Like chia cho tổng số Like và Dislike." />
        <Kpi label="Tỷ lệ Dislike" value={`${vn(cur.dislikePct, 1)}%`} cur={cur.dislikePct} prev={old.dislikePct} good={-1} unit="pp" info="Số Dislike chia cho tổng số Like và Dislike." />
        <Kpi label="CSAT" value={`${vn(cur.csat, 2)}/5`} cur={cur.csat} prev={old.csat} good={1} info="Điểm đánh giá trung bình người dùng chấm, từ 1 đến 5 sao." />
        <Kpi label="Có dẫn nguồn" value={`${vn(cur.citedPct, 1)}%`} cur={cur.citedPct} prev={old.citedPct} good={1} unit="pp" info="Câu trả lời có ghi rõ lấy từ tài liệu nào." />
        <Kpi label="Có phản hồi" value={`${vn(cur.coveragePct, 1)}%`} cur={cur.coveragePct} prev={old.coveragePct} good={1} unit="pp" info="Câu trả lời được người dùng bấm Like hoặc Dislike." />
      </div>
      <Card title="Tỷ lệ Like / Dislike theo ngày" note="% trên tổng số câu trả lời được bấm Like hoặc Dislike">
        <div className="h-56" role="img" aria-label="Tỷ lệ Like và Dislike theo ngày">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <VersionLines markers={markers} />
              <Line type="linear" dataKey="Like" stroke="hsl(var(--success))" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="linear" dataKey="Dislike" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Câu bị Guardrail chặn" note="Theo loại quy tắc · 28 ngày">
        <HBars max={maxG} rows={GUARDRAIL.map((g, i) => ({ label: g.rule, value: g.count, text: vn(g.count), highlight: i === 0 }))} />
      </Card>
    </div>
  );
}

/* ============ NGƯỜI DÙNG HỎI GÌ ============ */
export function AnalyticsTopics({ agentId }: { agentId: string }) {
  const a = useAnalytics(agentId);
  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <Header title="Người dùng hỏi gì" desc="AI gom các câu hỏi giống nhau thành chủ đề, và chỉ ra câu Nhân sự số chưa trả lời được." />
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border"><h3 className="font-display text-sm font-semibold">Chủ đề</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Chủ đề</th><th className="text-right font-medium px-3">Hội thoại</th><th className="text-right font-medium px-3">Thay đổi</th><th className="text-right font-medium px-3">Trả lời được</th><th className="text-right font-medium px-5">Like</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {TOPICS.map(t => (
                <tr key={t.topic} className="hover:bg-surface-muted transition-base">
                  <td className="px-5 py-2.5">{t.topic}</td>
                  <td className="text-right tabular-nums px-3">{vn(Math.round(a.total * t.share))}</td>
                  <td className={`text-right tabular-nums px-3 ${t.change >= 50 ? "text-destructive font-medium" : "text-muted-foreground"}`}>{t.change >= 0 ? "+" : ""}{t.change}%</td>
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
          <p className="text-xs text-muted-foreground mt-0.5">Nhân sự số không trả lời được hoặc bị Dislike. Câu bị hỏi nhiều nhất nằm trên cùng</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Câu hỏi</th><th className="text-left font-medium px-3">Chủ đề</th><th className="text-right font-medium px-3">Số lần</th><th className="text-left font-medium px-3">Lý do</th><th className="text-left font-medium px-3">Lần gần nhất</th><th className="px-5" />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {UNANSWERED.map(u => (
                <tr key={u.q}>
                  <td className="px-5 py-2.5 max-w-[320px]">{u.q}</td>
                  <td className="px-3 text-muted-foreground">{u.topic}</td>
                  <td className="text-right tabular-nums px-3">{u.times}</td>
                  <td className="px-3"><span className={`chip ${u.reason === "Trả lời sai" ? "chip-destructive" : "chip-warning"}`}>{u.reason}</span></td>
                  <td className="px-3 text-muted-foreground">{u.last}</td>
                  <td className="px-5 text-right">
                    <button className="btn-secondary h-8 text-xs whitespace-nowrap" onClick={() => toast.success("Đã thêm vào bộ test", { description: u.q })}>Tạo test case</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============ HOẠT ĐỘNG ============ */
export function AnalyticsOperations({ agentId }: { agentId: string }) {
  const a = useAnalytics(agentId);
  const lat = a.last.map(d => ({ day: d.day, "Lúc chậm": Math.round(d.p95 * 10) / 10, "Thông thường": Math.round(d.p50 * 10) / 10 }));
  const err = a.last.map(d => ({ day: d.day, "Không trả lời được": pct(d.fallbacks, d.sessions), "Lỗi": pct(d.errors, d.runs) }));
  const markers = a.markers.filter(m => lat.some(c => c.day === m.day));
  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <Header title="Hoạt động" desc="Nhân sự số phản hồi nhanh hay chậm, gặp lỗi ở đâu, Tool và Knowledge nào đang được dùng." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Thời gian phản hồi" note="Tính bằng giây. Thông thường là mức giữa, lúc chậm là 5% câu chậm nhất">
          <div className="h-52" role="img" aria-label="Thời gian phản hồi theo ngày">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lat} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="s" />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)} giây`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <VersionLines markers={markers} />
                <Line type="linear" dataKey="Lúc chậm" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="linear" dataKey="Thông thường" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Lỗi và câu không trả lời được" note="% trên tổng số lượt trả lời">
          <div className="h-52" role="img" aria-label="Tỷ lệ lỗi và câu không trả lời được theo ngày">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={err} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${vn(v, 1)}%`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <VersionLines markers={markers} />
                <Line type="linear" dataKey="Không trả lời được" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="linear" dataKey="Lỗi" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Tool và Connector</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Nhân sự số gọi tới hệ thống khác thành công hay thất bại · 28 ngày</p>
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
                  <td className="text-right tabular-nums px-3">{vn(t.calls)}</td>
                  <td className={`text-right tabular-nums px-3 ${t.ok < 95 ? "text-destructive font-medium" : ""}`}>{vn(t.ok, 1)}%</td>
                  <td className="px-3 text-muted-foreground">{t.error}</td>
                  <td className="text-right tabular-nums px-5">{vn(t.p95, 1)} giây</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Knowledge</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tài liệu nào được dùng nhiều, tài liệu nào không ai dùng · 28 ngày</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-5 py-2">Tài liệu</th><th className="text-right font-medium px-3">Số lần dùng</th><th className="text-right font-medium px-5">Lỗi khi đọc</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {KNOWLEDGE.map(k => (
                <tr key={k.source}>
                  <td className="px-5 py-2.5">{k.source}{k.uses === 0 && <span className="chip chip-warning ml-2">Không ai dùng</span>}</td>
                  <td className="text-right tabular-nums px-3">{vn(k.uses)}</td>
                  <td className={`text-right tabular-nums px-5 ${k.err >= 2 ? "text-destructive font-medium" : ""}`}>{vn(k.err, 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============ CHI PHÍ ============ */
export function AnalyticsCost({ agentId }: { agentId: string }) {
  const a = useAnalytics(agentId);
  const { cur, old } = a;
  const series = a.last.map(d => ({ day: d.day, Token: d.tokens }));
  const markers = a.markers.filter(m => series.some(c => c.day === m.day));
  return (
    <div className="p-8 w-full space-y-5 animate-fade-up">
      <Header title="Chi phí" desc="Nhân sự số tiêu bao nhiêu token và dùng model nào." />
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <Kpi label="Token 28 ngày" value={compact(cur.tokens)} cur={cur.tokens} prev={old.tokens} good={-1} info="Tổng token đầu vào và đầu ra." />
        <Kpi label="Token mỗi hội thoại" value={vn(cur.tokPerSession)} cur={cur.tokPerSession} prev={old.tokPerSession} good={-1} info="Tổng token chia cho số hội thoại." />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        <Card title="Token theo ngày" note="Token đầu vào và đầu ra">
          <div className="h-56" role="img" aria-label="Token theo ngày">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [vn(v), "Token"]} cursor={{ fill: "hsl(var(--surface-muted))" }} />
                <VersionLines markers={markers} />
                <Bar dataKey="Token" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Token theo model" note="28 ngày">
          <HBars rows={MODELS.map((m, i) => ({ label: m.model, value: m.share, text: `${m.share}%`, highlight: i === 0 }))} />
        </Card>
      </div>
    </div>
  );
}

/** Router used by AgentBuilder → Insights. */
export function AgentAnalytics({ agentId, section }: { agentId: string; section: AnalyticsSection }) {
  switch (section) {
    case "usage": return <AnalyticsUsage agentId={agentId} />;
    case "feedback": return <AnalyticsFeedback agentId={agentId} />;
    case "topics": return <AnalyticsTopics agentId={agentId} />;
    case "operations": return <AnalyticsOperations agentId={agentId} />;
    case "cost": return <AnalyticsCost agentId={agentId} />;
    default: return <AnalyticsOverview agentId={agentId} />;
  }
}

export default AgentAnalytics;
