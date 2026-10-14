import { Fragment, useEffect, useState } from "react";
import { Check, Minus, Tag, Phone, Mail, Info, Loader2, HelpCircle, ChevronDown, Headset } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAllTenants, getCurrentTenantId, TENANTS } from "@/lib/spaceStore";

/**
 * Bảng giá FPT AI Agents EOS (phương án A: thẻ gói + bảng so sánh).
 * Nguồn số liệu: EOS_gia_von_chot_v2.xlsx, sheet "Goi_ban_external" - chỉ phần gửi khách.
 * Phase này: xem gói + để lại thông tin nhận tư vấn. Nút đăng ký / đổi gói để sẵn, mở ở phase sau.
 */

type PlanId = "Free" | "Team" | "Business" | "Enterprise";
type Cell = boolean | string; // true = có, false = không có, string = giá trị cụ thể
type Billing = "monthly" | "yearly";

interface Plan {
  id: PlanId;
  rank: number;
  audience: string;
  monthly: number | null;
  yearly: number | null;
  perUser: number | null;
  highlights: string[];
}

const PLANS: Plan[] = [
  { id: "Free", rank: 0, audience: "Cho cá nhân dùng thử", monthly: 0, yearly: 0, perUser: null,
    highlights: ["1 người dùng", "300 credit mỗi tháng", "Tạo tối đa 2 trợ lý AI", "Dữ liệu lưu tại Việt Nam"] },
  { id: "Team", rank: 1, audience: "Cho nhóm nhỏ bắt đầu làm việc cùng AI", monthly: 9_225_000, yearly: 110_700_000, perUser: 369_000,
    highlights: ["25 người dùng", "55.000 credit mỗi tháng", "Kết nối ERP, CRM, MCP", "Đưa trợ lý lên website công ty"] },
  { id: "Business", rank: 2, audience: "Cho phòng ban vận hành bằng trợ lý AI", monthly: 34_900_000, yearly: 418_800_000, perUser: 349_000,
    highlights: ["100 người dùng", "220.000 credit mỗi tháng", "Hỏi đáp trên kho tài liệu nội bộ", "Đưa trợ lý lên Zalo, Facebook, Teams"] },
  { id: "Enterprise", rank: 3, audience: "Cho toàn doanh nghiệp, theo quy mô", monthly: null, yearly: null, perUser: null,
    highlights: ["Từ 1.000 người dùng", "Hạn mức theo nhu cầu", "Trợ lý chạy trọn quy trình", "Quản lý tài khoản riêng"] },
];

const SECTIONS: { title: string; rows: { label: string; values: [Cell, Cell, Cell, Cell] }[] }[] = [
  {
    title: "Quy mô sử dụng",
    rows: [
      { label: "Số người dùng đã bao gồm", values: ["1", "25", "100", "Từ 1.000"] },
      { label: "Hạn mức dùng AI mỗi tháng (credit)", values: ["300", "55.000", "220.000", "Theo nhu cầu"] },
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
      { label: "Trợ lý chạy ngay trong phần mềm nghiệp vụ đang dùng", values: [false, false, false, true] },
    ],
  },
  {
    title: "Phòng ban tự làm được gì",
    rows: [
      { label: "Tự tạo trợ lý cho quy trình của mình, không cần lập trình", values: ["Giới hạn", true, true, true] },
      { label: "Đóng gói thao tác hay dùng thành kỹ năng chung cho cả nhóm", values: [false, true, true, true] },
      { label: "Kết nối hệ thống công ty: ERP, CRM, MCP", values: [false, true, true, true] },
      { label: "Đưa trợ lý lên website công ty", values: [false, true, true, true] },
      { label: "Hồ sơ và hành trình khách hàng cơ bản cho sales, CSKH", values: [false, true, true, true] },
      { label: "Hỏi đáp trên kho tài liệu nội bộ, trả lời có dẫn nguồn", values: [false, false, true, true] },
      { label: "Nạp tài liệu hàng loạt từ thư mục hoặc DB, có quản lý phiên bản", values: [false, false, true, true] },
      { label: "Đưa trợ lý lên Zalo, Facebook, Microsoft Teams", values: [false, false, true, true] },
      { label: "Trợ lý trả lời qua tổng đài và email", values: [false, false, true, true] },
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
  { q: "Trả theo năm có khác theo tháng không?", a: "Giá theo năm bằng 12 tháng của giá theo tháng, thanh toán một lần cho cả năm." },
  { q: "Giá đã gồm VAT chưa?", a: "Chưa. Giá niêm yết bằng VND và chưa gồm VAT." },
  { q: "Làm sao để đăng ký hoặc đổi gói?", a: "Đăng ký trực tuyến sắp ra mắt. Trong lúc chờ, bạn để lại thông tin qua nút Nhận tư vấn, đội kinh doanh FPT AI sẽ liên hệ và kích hoạt gói cho doanh nghiệp." },
  { q: "Gói Enterprise được báo giá thế nào?", a: "Giá Enterprise tính theo số người dùng, hạn mức và hình thức triển khai. Đội kinh doanh sẽ gửi báo giá riêng sau khi trao đổi nhu cầu." },
];

const fmt = (n: number) => n.toLocaleString("vi-VN") + " ₫";

function CellValue({ v }: { v: Cell }) {
  if (v === true) return (<><Check size={16} className="text-primary mx-auto" aria-hidden /><span className="sr-only">Có</span></>);
  if (v === false) return (<><Minus size={16} className="text-muted-foreground/40 mx-auto" aria-hidden /><span className="sr-only">Không có</span></>);
  return <span className="text-sm text-foreground">{v}</span>;
}

function SoonButton({ label, variant }: { label: string; variant: "primary" | "secondary" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Nút disabled không nhận focus - bọc span để tooltip vẫn mở được bằng bàn phím */}
        <span tabIndex={0} className="block rounded-[8px] focus-ring">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} w-full justify-center whitespace-nowrap opacity-50 cursor-not-allowed pointer-events-none`}
          >
            {label}
            <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${variant === "primary" ? "bg-white/20" : "bg-surface-muted"}`}>Sắp có</span>
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] text-xs leading-relaxed">
        Đăng ký trực tuyến sắp ra mắt. Trong lúc chờ, hãy chọn Nhận tư vấn để được kích hoạt gói.
      </TooltipContent>
    </Tooltip>
  );
}

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [contactPlan, setContactPlan] = useState<PlanId | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const tenant = getAllTenants().find(t => t.id === getCurrentTenantId()) ?? TENANTS[0];
  const currentPlan = (PLANS.find(p => p.id === tenant.plan)?.id ?? "Free") as PlanId;
  const currentRank = PLANS.find(p => p.id === currentPlan)!.rank;

  return (
    <div className="px-8 py-8 w-full max-w-[1200px] mx-auto animate-fade-up space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Tag size={20} className="text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold">Gói dịch vụ và bảng giá</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-[640px]">
              Chọn gói theo số người dùng và mức dùng AI của doanh nghiệp. Gói cao hơn có đủ tính năng của gói thấp hơn.
            </p>
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
              <span>{tenant.name} đang dùng</span>
              <span className="chip chip-primary !py-0.5">Gói {currentPlan}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div role="group" aria-label="Chu kỳ thanh toán" className="inline-flex p-1 rounded-lg bg-surface-muted">
            {([["monthly", "Theo tháng"], ["yearly", "Theo năm"]] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={billing === k}
                onClick={() => setBilling(k)}
                className={`h-8 px-3 rounded-md text-sm transition-base focus-ring ${billing === k ? "bg-surface shadow-sm font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Giá bằng VND, chưa gồm VAT</span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {PLANS.map(p => {
          const isCurrent = p.id === currentPlan;
          const amount = billing === "monthly" ? p.monthly : p.yearly;
          return (
            <section
              key={p.id}
              aria-label={`Gói ${p.id}`}
              className={`relative rounded-xl bg-surface border p-5 flex flex-col ${isCurrent ? "border-primary ring-2 ring-primary/15" : "border-border"}`}
            >
              <div className="flex items-center justify-between gap-2 h-6">
                <h2 className="font-display text-base font-semibold">{p.id}</h2>
                {isCurrent && <span className="chip chip-primary !py-0.5">Gói đang dùng</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.audience}</p>

              <div className="mt-5 min-h-[60px]">
                {amount === null ? (
                  <>
                    <div className="font-display text-2xl font-semibold">Liên hệ</div>
                    <div className="text-xs text-muted-foreground mt-1">Báo giá theo quy mô doanh nghiệp</div>
                  </>
                ) : amount === 0 ? (
                  <>
                    <div className="font-display text-2xl font-semibold">0 ₫</div>
                    <div className="text-xs text-muted-foreground mt-1">Miễn phí, không giới hạn thời gian</div>
                  </>
                ) : (
                  <>
                    <div className="font-display text-2xl font-semibold tabular-nums">
                      {fmt(amount)}
                      <span className="text-sm font-normal text-muted-foreground"> / {billing === "monthly" ? "tháng" : "năm"}</span>
                    </div>
                    {p.perUser != null && (
                      <div className="text-xs text-muted-foreground mt-1 tabular-nums">Tương đương {fmt(p.perUser)} / người / tháng</div>
                    )}
                  </>
                )}
              </div>

              <ul className="mt-5 pt-5 border-t border-border space-y-2.5 flex-1">
                {p.highlights.map(h => (
                  <li key={h} className="flex items-start gap-2 text-sm">
                    <Check size={15} className="text-primary mt-0.5 shrink-0" aria-hidden /> {h}
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2">
                {isCurrent ? (
                  <button type="button" disabled className="btn-secondary w-full justify-center opacity-70 cursor-default">Gói đang dùng</button>
                ) : p.id === "Enterprise" ? (
                  <button type="button" onClick={() => setContactPlan(p.id)} className="btn-primary w-full justify-center focus-ring">Nhận báo giá</button>
                ) : (
                  <>
                    <SoonButton label={p.rank > currentRank ? "Nâng cấp" : "Đổi gói"} variant={p.rank > currentRank ? "primary" : "secondary"} />
                    {p.id !== "Free" ? (
                      <button type="button" onClick={() => setContactPlan(p.id)} className="btn-ghost w-full justify-center focus-ring">Nhận tư vấn</button>
                    ) : <div className="h-8" aria-hidden />}
                  </>
                )}
                {(isCurrent || (!isCurrent && p.id === "Enterprise")) && <div className="h-8" aria-hidden />}
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

      {/* Contact band */}
      <section className="rounded-xl border border-border bg-surface-muted px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Headset size={20} className="text-primary mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">Chưa chắc gói nào phù hợp?</p>
            <p className="text-sm text-muted-foreground mt-0.5">Đội kinh doanh FPT AI tư vấn miễn phí theo nhu cầu của doanh nghiệp bạn.</p>
          </div>
        </div>
        <button type="button" onClick={() => setContactPlan(currentPlan === "Enterprise" ? "Enterprise" : "Business")} className="btn-secondary focus-ring">Nhận tư vấn</button>
      </section>

      <ContactDialog
        plan={contactPlan}
        onPlanChange={setContactPlan}
        onClose={() => setContactPlan(null)}
        defaultCompany={tenant.name}
      />
    </div>
  );
}

const PHONE_RE = /^(0|\+84)\d{9,10}$/;

function ContactDialog({ plan, onPlanChange, onClose, defaultCompany }: {
  plan: PlanId | null; onPlanChange: (p: PlanId) => void; onClose: () => void; defaultCompany: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState(defaultCompany);
  const [users, setUsers] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => { if (plan) { setTouched({}); setCompany(c => c || defaultCompany); } }, [plan, defaultCompany]);

  const phoneClean = phone.replace(/[\s.]/g, "");
  const errors = {
    name: !name.trim() ? "Nhập họ tên để đội kinh doanh biết cách xưng hô." : "",
    phone: !phoneClean ? "Nhập số điện thoại để được gọi lại." : !PHONE_RE.test(phoneClean) ? "Số điện thoại chưa đúng - Ví dụ: 0912 345 678." : "",
    company: !company.trim() ? "Nhập tên doanh nghiệp." : "",
  };
  const valid = !errors.name && !errors.phone && !errors.company;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, company: true });
    if (!valid) return;
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      toast.success("Đã gửi yêu cầu tư vấn", { description: "Đội kinh doanh FPT AI sẽ gọi lại cho bạn trong 1 ngày làm việc." });
      setName(""); setPhone(""); setUsers(""); setNote("");
      onClose();
    }, 500);
  };

  const fieldCls = (err: string, key: string) =>
    `ds-input ${touched[key] && err ? "!border-destructive" : ""}`;

  return (
    <Dialog open={plan !== null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{plan === "Enterprise" ? "Nhận báo giá gói Enterprise" : "Nhận tư vấn gói dịch vụ"}</DialogTitle>
          <DialogDescription>Để lại thông tin, đội kinh doanh FPT AI sẽ gọi lại trong 1 ngày làm việc.</DialogDescription>
        </DialogHeader>

        <form id="contact-form" onSubmit={submit} noValidate className="space-y-4 py-1">
          <div>
            <label htmlFor="ct-plan" className="text-sm font-medium mb-1.5 block">Gói quan tâm</label>
            <select id="ct-plan" value={plan ?? "Business"} onChange={e => onPlanChange(e.target.value as PlanId)} className="ds-input">
              {PLANS.filter(p => p.id !== "Free").map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ct-name" className="text-sm font-medium mb-1.5 block">Họ tên <span className="text-destructive">*</span></label>
            <input id="ct-name" value={name} maxLength={80} onChange={e => setName(e.target.value)} onBlur={() => setTouched(t => ({ ...t, name: true }))}
              aria-invalid={!!(touched.name && errors.name)} aria-describedby="ct-name-err" className={fieldCls(errors.name, "name")} placeholder="Nguyễn Văn An" />
            {touched.name && errors.name && <p id="ct-name-err" className="text-xs text-destructive mt-1.5">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ct-phone" className="text-sm font-medium mb-1.5 block">Số điện thoại <span className="text-destructive">*</span></label>
              <input id="ct-phone" inputMode="tel" value={phone} maxLength={16} onChange={e => setPhone(e.target.value)} onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                aria-invalid={!!(touched.phone && errors.phone)} aria-describedby="ct-phone-err" className={fieldCls(errors.phone, "phone")} placeholder="0912 345 678" />
              {touched.phone && errors.phone && <p id="ct-phone-err" className="text-xs text-destructive mt-1.5">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="ct-users" className="text-sm font-medium mb-1.5 block">Số người dùng dự kiến</label>
              <input id="ct-users" inputMode="numeric" value={users} maxLength={6} onChange={e => setUsers(e.target.value.replace(/\D/g, ""))} className="ds-input" placeholder="100" />
            </div>
          </div>
          <div>
            <label htmlFor="ct-company" className="text-sm font-medium mb-1.5 block">Doanh nghiệp <span className="text-destructive">*</span></label>
            <input id="ct-company" value={company} maxLength={120} onChange={e => setCompany(e.target.value)} onBlur={() => setTouched(t => ({ ...t, company: true }))}
              aria-invalid={!!(touched.company && errors.company)} aria-describedby="ct-company-err" className={fieldCls(errors.company, "company")} />
            {touched.company && errors.company && <p id="ct-company-err" className="text-xs text-destructive mt-1.5">{errors.company}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="ct-note" className="text-sm font-medium">Nhu cầu</label>
              <span className="text-xs text-muted-foreground tabular-nums">{note.length}/500</span>
            </div>
            <textarea id="ct-note" value={note} maxLength={500} onChange={e => setNote(e.target.value)} rows={3} className="ds-textarea resize-none"
              placeholder="Ví dụ: Cần trợ lý trả lời khách hàng trên Zalo cho phòng CSKH 50 người" />
          </div>
        </form>

        <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground flex flex-wrap gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><Info size={12} aria-hidden /> Hoặc liên hệ trực tiếp:</span>
          <span className="inline-flex items-center gap-1.5 select-all"><Phone size={12} aria-hidden /> 1900 638 399</span>
          <span className="inline-flex items-center gap-1.5 select-all"><Mail size={12} aria-hidden /> ai.agents.support@fpt.com</span>
        </div>

        <DialogFooter>
          <button type="button" onClick={onClose} className="btn-secondary">Đóng</button>
          <button type="submit" form="contact-form" disabled={sending} className="btn-primary disabled:opacity-60">
            {sending ? <><Loader2 size={14} className="animate-spin" aria-hidden /> Đang gửi...</> : "Gửi yêu cầu"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
