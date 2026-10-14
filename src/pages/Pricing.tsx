import { Fragment, useState } from "react";
import { Check, Minus, HelpCircle, ChevronDown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAllTenants, getCurrentTenantId, TENANTS } from "@/lib/spaceStore";

/**
 * Bảng giá FPT AI Agents EOS (phương án A: thẻ gói + bảng so sánh).
 * Nguồn số liệu: EOS_gia_von_chot_v2.xlsx, sheet "Goi_ban_external" - chỉ phần gửi khách.
 * Phase này chỉ hiển thị các gói. Đăng ký / đổi gói làm ở phase sau.
 */

type PlanId = "Free" | "Team" | "Business" | "Enterprise";
type Cell = boolean | string; // true = có, false = không có, string = giá trị cụ thể

interface Plan {
  id: PlanId;
  rank: number;
  range: string;
  audience: string;
  monthly: number | null;
  perUser: number | null;
  /** "Mọi thứ trong <gói trước>, thêm:" - null với gói thấp nhất */
  includesFrom: PlanId | null;
  features: string[];
}

const PLANS: Plan[] = [
  { id: "Free", rank: 0, range: "1 người", audience: "Cho cá nhân dùng thử", monthly: 0, perUser: null, includesFrom: null,
    features: ["Hỏi đáp, soạn thảo, tóm tắt, dịch thuật", "Model AI phổ biến: OpenAI, Gemini, DeepSeek", "Tạo tối đa 2 trợ lý AI", "300 credit mỗi tháng", "Dữ liệu lưu tại Việt Nam"] },
  { id: "Team", rank: 1, range: "25 người", audience: "Cho nhóm nhỏ bắt đầu làm việc cùng AI", monthly: 9_225_000, perUser: 369_000, includesFrom: "Free",
    features: ["Model AI của FPT hiểu tiếng Việt, đọc ảnh, giọng nói", "Đọc Word, Excel, PDF, bản scan, ảnh chụp", "Tự ghi chép và tóm tắt cuộc họp", "Kết nối hệ thống nội bộ qua API, MCP hoặc app tích hợp sẵn", "Đưa trợ lý lên website và mobile app của công ty", "55.000 credit mỗi tháng cho cả Space", "3 GB lưu trữ mỗi người"] },
  { id: "Business", rank: 2, range: "100 người", audience: "Cho phòng ban vận hành bằng trợ lý AI", monthly: 34_900_000, perUser: 349_000, includesFrom: "Team",
    features: ["Hỏi đáp trên kho tài liệu nội bộ, có dẫn nguồn", "Đưa trợ lý lên các kênh khách hàng đang dùng: Zalo, Facebook, Microsoft Teams, Line, Viber,...", "Hạn mức theo người, phòng ban", "Nhật ký phục vụ kiểm toán nội bộ", "220.000 credit mỗi tháng cho cả Space", "Cam kết hoạt động 99,95%"] },
  { id: "Enterprise", rank: 3, range: "Từ 1.000 người", audience: "Cho toàn doanh nghiệp, theo quy mô", monthly: null, perUser: null, includesFrom: "Business",
    features: ["Trợ lý chạy trọn quy trình, chuyển người duyệt", "Trợ lý nhớ ngữ cảnh qua nhiều ngày", "Quản trị tổ chức nhiều cấp: Phân quyền theo phòng ban, duyệt trước khi phát hành trợ lý", "Phê duyệt theo mức độ rủi ro", "Model AI riêng có sẵn", "Cam kết 99,99%, quản lý tài khoản riêng"] },
];

/** Đầu thẻ đậm dần theo cấp gói: Free xám nhạt, Team xanh nhạt, Business xanh thương hiệu, Enterprise nền tối */
const TIER: Record<PlanId, { band: string; muted: string; pill: string; inset: string }> = {
  Free:       { band: "bg-surface-muted text-foreground",          muted: "text-muted-foreground",        pill: "bg-surface text-muted-foreground",       inset: "bg-surface" },
  Team:       { band: "bg-primary-soft text-foreground",           muted: "text-muted-foreground",        pill: "bg-surface text-primary",                inset: "bg-surface" },
  Business:   { band: "bg-primary text-primary-foreground",        muted: "text-primary-foreground/75",   pill: "bg-white/15 text-primary-foreground",    inset: "bg-white/10" },
  Enterprise: { band: "bg-foreground text-background",             muted: "text-background/70",           pill: "bg-white/10 text-background",            inset: "bg-white/10" },
};

/** Hình vẽ nét cho từng gói: 1 người, bàn làm việc nhóm, tòa nhà phòng ban, khu văn phòng */
function PlanIllustration({ id }: { id: PlanId }) {
  const common = { width: 44, height: 44, viewBox: "0 0 52 52", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, "aria-hidden": true };
  if (id === "Free") return (<svg {...common}><circle cx="26" cy="17" r="7" /><path d="M12 44c1.5-8 7-12 14-12s12.5 4 14 12" /></svg>);
  if (id === "Team") return (<svg {...common}><circle cx="15" cy="14" r="5" /><circle cx="37" cy="14" r="5" /><circle cx="26" cy="11" r="5" /><path d="M6 30h40v5H6zM10 35v11M42 35v11" /><path d="M8 30c1-5 4-8 7-8M44 30c-1-5-4-8-7-8M18 30c1-6 4-9 8-9s7 3 8 9" /></svg>);
  if (id === "Business") return (<svg {...common}><path d="M10 46V12l18-6v40M28 18l14 5v23M6 46h40" /><path d="M15 16h3M15 22h3M15 28h3M15 34h3M21 16h3M21 22h3M21 28h3M21 34h3M33 27h4M33 33h4M33 39h4" /></svg>);
  return (<svg {...common}><path d="M4 46h44M8 46V22h12v24M20 46V8h14v38M34 46V18h10v28" /><path d="M24 14h6M24 20h6M24 26h6M24 32h6M12 28h4M12 34h4M38 24h3M38 30h3M38 36h3M24 40h6v6h-6z" /></svg>);
}

const SECTIONS: { title: string; rows: { label: string; values: [Cell, Cell, Cell, Cell] }[] }[] = [
  {
    title: "Quy mô sử dụng",
    rows: [
      { label: "Số người dùng đã bao gồm", values: ["1", "25", "100", "Từ 1.000"] },
      { label: "Hạn mức dùng AI mỗi tháng cho cả Space (credit)", values: ["300", "55.000", "220.000", "Theo nhu cầu"] },
      { label: "Tương đương số lượt trao đổi với AI", values: ["400", "73.333", "293.333", "Theo nhu cầu"] },
      { label: "Hoặc số trang tài liệu quét", values: ["30", "5.500", "22.000", "Theo nhu cầu"] },
      { label: "Mua thêm credit khi dùng hết (₫ / credit)", values: [false, "150", "150", "Theo hợp đồng"] },
      { label: "Dung lượng lưu trữ tài liệu", values: ["1 GB", "3 GB / người", "5 GB / người", "Theo nhu cầu"] },
      { label: "Số trợ lý AI tạo được", values: ["2", "Không giới hạn", "Không giới hạn", "Không giới hạn"] },
      { label: "Thời gian lưu lịch sử sử dụng", values: ["7 ngày", "30 ngày", "90 ngày", "6 tháng"] },
    ],
  },
  {
    title: "Nhân viên làm được gì",
    rows: [
      { label: "Hỏi đáp, soạn thảo, tóm tắt, dịch thuật ngay trong công việc", values: [true, true, true, true] },
      { label: "Dùng model AI phổ biến: OpenAI, Gemini, DeepSeek", values: [true, true, true, true] },
      { label: "Dùng model AI của FPT: Hiểu tiếng Việt, đọc ảnh, nghe và đọc giọng nói", values: [false, true, true, true] },
      { label: "Đọc file Word, Excel, PowerPoint, PDF, bản scan, ảnh chụp", values: [false, true, true, true] },
      { label: "Tự ghi chép và tóm tắt cuộc họp", values: [false, true, true, true] },
      { label: "Lưu dự án và kết quả làm việc chung cho cả nhóm", values: [false, true, true, true] },
      { label: "Dùng trợ lý dựng sẵn theo vai trò, phòng ban", values: [false, true, true, true] },
      { label: "Trợ lý nhớ ngữ cảnh công việc qua nhiều ngày", values: [false, false, false, true] },
    ],
  },
  {
    title: "Phòng ban tự làm được gì",
    rows: [
      { label: "Tự tạo trợ lý cho quy trình của mình, không cần lập trình", values: ["Giới hạn", true, true, true] },
      { label: "Đóng gói thao tác hay dùng thành kỹ năng chung cho cả nhóm", values: [false, true, true, true] },
      { label: "Kết nối hệ thống nội bộ doanh nghiệp qua API, MCP hoặc app tích hợp sẵn", values: [false, true, true, true] },
      { label: "Đưa trợ lý lên website và mobile app của công ty", values: [false, true, true, true] },
      { label: "Hồ sơ và hành trình khách hàng cơ bản cho sales, CSKH", values: [false, true, true, true] },
      { label: "Hỏi đáp trên kho tài liệu nội bộ, trả lời có dẫn nguồn", values: [false, false, true, true] },
      { label: "Nạp tài liệu hàng loạt từ thư mục hoặc DB, có quản lý phiên bản", values: [false, false, true, true] },
      { label: "Đưa trợ lý lên các kênh khách hàng đang dùng: Zalo, Facebook, Microsoft Teams, Line, Viber,...", values: [false, false, true, true] },
      { label: "Chấm điểm chất lượng hội thoại, thử A/B trước khi triển khai", values: [false, false, true, true] },
      { label: "Quản lý phiên bản, theo dõi chi phí và chất lượng từng trợ lý", values: [false, false, true, true] },
      { label: "Trợ lý chạy trọn quy trình, tự phân việc, chuyển người duyệt khi cần", values: [false, false, false, true] },
      { label: "Xem lại từng bước trợ lý đã làm, phát hiện khi trợ lý trả lời lệch", values: [false, false, false, true] },
      { label: "Gợi ý việc nên làm tiếp, cảnh báo khách sắp rời, cơ hội bán thêm", values: [false, false, false, "Tùy chọn"] },
      { label: "Trợ lý tự cải thiện từ phản hồi người dùng", values: [false, false, false, "Tùy chọn"] },
    ],
  },
  {
    title: "Quản trị, an toàn và cam kết",
    rows: [
      { label: "Trang quản trị: Thêm, bớt người dùng và phân quyền", values: [false, "Cơ bản", true, true] },
      { label: "Quản trị tổ chức nhiều cấp: Phân quyền theo phòng ban, duyệt trước khi phát hành trợ lý", values: [false, false, false, true] },
      { label: "Dữ liệu lưu tại Việt Nam, hợp đồng theo luật Việt Nam", values: [true, true, true, true] },
      { label: "Đặt hạn mức theo người, phòng ban và xem ai dùng bao nhiêu", values: [false, false, true, true] },
      { label: "Tự chọn model phù hợp từng việc để tiết kiệm chi phí", values: [false, false, true, true] },
      { label: "Chặn rò rỉ dữ liệu nhạy cảm và câu lệnh độc hại", values: [false, false, true, true] },
      { label: "Quản lý công cụ, kết nối theo chính sách công ty", values: [false, false, true, true] },
      { label: "Tách riêng dữ liệu theo công ty con, đơn vị", values: [false, false, true, true] },
      { label: "Nhật ký đầy đủ phục vụ kiểm toán nội bộ", values: [false, false, true, true] },
      { label: "Dùng model AI riêng của công ty", values: [false, false, "Mua thêm", "Có sẵn"] },
      { label: "Quy trình phê duyệt theo mức độ rủi ro", values: [false, false, false, true] },
      { label: "Cam kết thời gian hệ thống hoạt động", values: [false, false, "99,95%", "99,99%"] },
      { label: "Kênh hỗ trợ", values: ["Cộng đồng", "Email", "Kênh riêng, ưu tiên", "Quản lý tài khoản riêng"] },
    ],
  },
];

const FAQS = [
  { q: "Credit là gì và được tính thế nào?", a: "Credit là đơn vị đo mức dùng AI. Tham khảo: 1 lượt trao đổi với AI tốn khoảng 0,75 credit, 1 trang tài liệu quét tốn khoảng 10 credit. Hạn mức dùng chung cho cả công ty - Bạn tự quyết dùng cho chat, xử lý tài liệu hay trợ lý tự động." },
  { q: "Dùng hết credit trong tháng thì sao?", a: "Gói Team và Business có thể mua thêm với giá 150 ₫ / credit. Gói Enterprise mua thêm theo hợp đồng. Gói Free dùng lại từ đầu tháng sau." },
  { q: "Giá đã gồm VAT chưa?", a: "Chưa. Giá niêm yết bằng VND và chưa gồm VAT." },
  { q: "Làm sao để đăng ký hoặc đổi gói?", a: "Liên hệ đội kinh doanh FPT AI qua hotline 1900 638 399 hoặc email ai.agents.support@fpt.com. Đăng ký trực tuyến sẽ có trong thời gian tới." },
  { q: "Gói Enterprise được báo giá thế nào?", a: "Giá Enterprise tính theo số người dùng, hạn mức và hình thức triển khai. Đội kinh doanh sẽ gửi báo giá riêng sau khi trao đổi nhu cầu." },
];

const fmt = (n: number) => n.toLocaleString("vi-VN") + " ₫";

function CellValue({ v }: { v: Cell }) {
  if (v === true) return (<><Check size={16} className="text-primary mx-auto" aria-hidden /><span className="sr-only">Có</span></>);
  if (v === false) return (<><Minus size={16} className="text-muted-foreground/40 mx-auto" aria-hidden /><span className="sr-only">Không có</span></>);
  return <span className="text-sm text-foreground">{v}</span>;
}

/** Nội dung bảng giá - hiển thị trong trang PlansPage */
function PlansContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const tenant = getAllTenants().find(t => t.id === getCurrentTenantId()) ?? TENANTS[0];
  const currentPlan = (PLANS.find(p => p.id === tenant.plan)?.id ?? "Free") as PlanId;

  return (
    <div className="px-8 pt-8 pb-12 w-full max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Chọn gói phù hợp với doanh nghiệp</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-[640px]">
            Gói cao hơn có đủ tính năng của gói thấp hơn. Giá theo tháng, bằng VND, chưa gồm VAT.
          </p>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>{tenant.name} đang dùng</span>
          <span className="chip chip-primary !py-0.5">Gói {currentPlan}</span>
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {PLANS.map(p => {
          const isCurrent = p.id === currentPlan;
          const amount = p.monthly;
          const t = TIER[p.id];
          return (
            <section
              key={p.id}
              aria-label={`Gói ${p.id}`}
              className={`rounded-2xl bg-surface border border-border overflow-hidden flex flex-col ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            >
              {/* Đầu thẻ theo cấp gói */}
              <div className={`${t.band} p-5 flex flex-col gap-4`}>
                <div className="flex items-start justify-between gap-2 h-11">
                  <PlanIllustration id={p.id} />
                  <span className={`${t.pill} rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap`}>
                    {isCurrent ? "Gói đang dùng" : p.range}
                  </span>
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight !text-current">{p.id}</h2>
                  <p className={`text-xs ${t.muted} mt-0.5 min-h-[2rem] leading-4`}>{p.audience}</p>
                </div>
                <div className={`${t.inset} rounded-xl px-4 py-3`}>
                  <div className="font-display text-2xl font-semibold tabular-nums whitespace-nowrap leading-8">
                    {amount === null ? "Liên hệ" : fmt(amount)}
                  </div>
                  <div className={`text-xs ${t.muted} h-4 leading-4 truncate`}>
                    {amount === null ? "Báo giá theo quy mô" : amount === 0 ? "Miễn phí" : "Mỗi tháng"}
                  </div>
                  <div className={`text-xs ${t.muted} h-4 leading-4 truncate tabular-nums`}>
                    {p.perUser != null ? `≈ ${fmt(p.perUser)} / người / tháng` : amount === 0 ? "Không giới hạn thời gian" : "\u00A0"}
                  </div>
                </div>
              </div>

              {/* Tính năng: chỉ nêu điểm khác so với gói trước */}
              <div className="p-5 flex flex-col flex-1 gap-5">
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-3">{p.includesFrom ? `Mọi thứ trong ${p.includesFrom}, thêm:` : "Gồm:"}</p>
                  <ul className="space-y-2.5">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm leading-5">
                        <Check size={15} className="text-primary mt-0.5 shrink-0" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Comparison table */}
      <section aria-labelledby="compare-title" className="rounded-xl bg-surface border border-border">
        <header className="px-5 py-4 border-b border-border">
          <h2 id="compare-title" className="font-display text-base font-semibold">So sánh chi tiết</h2>
          <p className="text-xs text-muted-foreground mt-1">Đầy đủ tính năng theo từng gói.</p>
        </header>
        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full min-w-[820px] text-sm">
            <caption className="sr-only">So sánh tính năng giữa các gói Free, Team, Business và Enterprise</caption>
            <thead className="lg:sticky lg:top-0 bg-surface z-10 shadow-[0_1px_0_hsl(var(--border))]">
              <tr>
                <th scope="col" className="text-left px-5 py-3 kb-table-header w-[40%]">Tính năng</th>
                {PLANS.map(p => (
                  <th key={p.id} scope="col" className={`px-3 py-3 text-center text-sm font-semibold ${p.id === currentPlan ? "text-primary" : "text-foreground"}`}>
                    {p.id}
                    <div className="text-xs font-normal text-muted-foreground tabular-nums mt-0.5">
                      {p.monthly === null ? "Liên hệ" : p.monthly === 0 ? "0 ₫" : `${fmt(p.monthly)} / tháng`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map(s => (
                <Fragment key={s.title}>
                  <tr className="bg-surface-muted">
                    <th scope="colgroup" colSpan={5} className="text-left px-5 py-2 section-eyebrow">{s.title}</th>
                  </tr>
                  {s.rows.map(r => (
                    <tr key={r.label} className="border-b border-border/70 last:border-b-0">
                      <th scope="row" className="text-left font-normal px-5 py-3 text-foreground">{r.label}</th>
                      {r.values.map((v, i) => (
                        <td key={i} className={`px-3 py-3 text-center ${PLANS[i].id === currentPlan ? "bg-primary-soft/40" : ""}`}>
                          <CellValue v={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <div>
          <h2 id="faq-title" className="font-display text-base font-semibold flex items-center gap-2">
            <HelpCircle size={16} className="text-primary" aria-hidden /> Câu hỏi thường gặp
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Về credit, thanh toán và cách đăng ký.</p>
        </div>
        <div className="rounded-xl bg-surface border border-border divide-y divide-border">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left text-sm font-medium hover:bg-surface-muted transition-base focus-ring rounded-xl"
                >
                  {f.q}
                  <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
                </button>
                <div id={`faq-${i}`} hidden={!open} className="px-5 pb-4 -mt-1 text-sm text-muted-foreground leading-relaxed max-w-[68ch]">
                  {f.a}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

/**
 * Trang Gói dịch vụ (/plans): trang riêng, không có sidebar của workspace - mở từ menu tài khoản.
 * Thanh trên cùng có nút quay lại trang trước.
 */
export default function PlansPage() {
  const navigate = useNavigate();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));
  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <header className="h-14 shrink-0 border-b border-border bg-surface px-6 flex items-center gap-3">
        <button type="button" onClick={goBack} className="btn-ghost focus-ring" aria-label="Quay lại trang trước">
          <ArrowLeft size={16} aria-hidden /> Quay lại
        </button>
        <span className="h-5 w-px bg-border" aria-hidden />
        <h1 className="text-sm font-semibold">Gói dịch vụ</h1>
      </header>
      <main className="flex-1 overflow-y-auto">
        <PlansContent />
      </main>
    </div>
  );
}
