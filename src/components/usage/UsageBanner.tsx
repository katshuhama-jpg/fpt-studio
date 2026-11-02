import { useNavigate } from "react-router-dom";
import { AlertTriangle, Ban, Clock, X, HardDrive } from "lucide-react";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { fmtDate, fmtNum, usageStore, useUsage, type UsageSnapshot } from "@/lib/usageStore";

const HIDE_MS = 24 * 3_600_000;

type Tone = "warning" | "danger";
interface BannerModel { key: string; tone: Tone; title: string; body?: string; action?: { label: string; to: string }; dismissable: boolean; icon: typeof AlertTriangle }

/** Chọn 1 banner credit theo mức độ ưu tiên: hết credit > 95% > dự kiến hết <= 7 ngày > 80% (BR-05, BR-06). */
function creditBanner(u: UsageSnapshot, isAdmin: boolean): BannerModel | null {
  const pending = u.pendingCredit;
  const buy = { label: pending ? "Xem yêu cầu" : "Mua thêm credit", to: pending ? "/plans?tab=usage" : "/plans?tab=usage&buy=credit" };
  const pendingNote = pending ? " Đã gửi yêu cầu mua thêm, Sales sẽ liên hệ với bạn." : "";
  const isFree = !u.quota.canBuy;

  if (u.level === "exhausted") {
    if (!isAdmin) return { key: "exhausted", tone: "danger", icon: Ban, dismissable: false, title: "Space đã hết credit.", body: "Nhân sự số đang tạm dừng. Liên hệ Admin của Space để mua thêm." };
    if (isFree) return { key: "exhausted", tone: "danger", icon: Ban, dismissable: false, title: "Gói Free đã hết credit tháng này.", body: "Nâng cấp gói để tiếp tục dùng Nhân sự số.", action: { label: "Xem các gói", to: "/plans?tab=plans" } };
    return { key: "exhausted", tone: "danger", icon: Ban, dismissable: false, title: "Space đã hết credit. Nhân sự số đang tạm dừng trên mọi kênh.", body: `Khách hàng đang nhận câu trả lời khi hết credit.${pendingNote}`, action: buy };
  }
  if (u.level === "warn95") {
    if (!isAdmin) return { key: "warn95", tone: "warning", icon: AlertTriangle, dismissable: true, title: "Space sắp hết credit tháng này.", body: "Liên hệ Admin của Space nếu bạn cần dùng nhiều." };
    return { key: "warn95", tone: "warning", icon: AlertTriangle, dismissable: true, title: "Space đã dùng 95% credit tháng này.", body: `Còn ${fmtNum(u.available)} credit. Khi hết, Nhân sự số sẽ dừng ngay.${pendingNote}`, action: isFree ? { label: "Xem các gói", to: "/plans?tab=plans" } : buy };
  }
  if (!isAdmin) return null; // Member chỉ thấy banner 95% và hết credit
  if (u.level === "forecast" && u.forecastDate) {
    return { key: "forecast", tone: "warning", icon: Clock, dismissable: true, title: `Space dự kiến hết credit vào ${fmtDate(u.forecastDate)}.`, body: isFree ? "Nâng cấp gói để có thêm credit." : `Gửi yêu cầu mua thêm sớm để Nhân sự số không bị dừng.${pendingNote}`, action: isFree ? { label: "Xem các gói", to: "/plans?tab=plans" } : buy };
  }
  if (u.level === "warn80") {
    return { key: "warn80", tone: "warning", icon: AlertTriangle, dismissable: true, title: "Space đã dùng 80% credit tháng này.", body: `Còn ${fmtNum(u.available)} credit, làm mới vào ${fmtDate(u.period.renew)}.`, action: { label: "Xem hạn mức", to: "/plans?tab=usage" } };
  }
  return null;
}

function storageBanner(u: UsageSnapshot, isAdmin: boolean): BannerModel | null {
  if (!u.storage.near) return null;
  if (u.storage.full) return {
    key: "storage-full", tone: "danger", icon: HardDrive, dismissable: false,
    title: "Dung lượng knowledge đã đầy.",
    body: isAdmin ? "Chưa tải thêm tài liệu được. Nhân sự số vẫn trả lời từ tài liệu đã có." : "Chưa tải thêm tài liệu được. Xóa bớt tài liệu cũ hoặc liên hệ Admin để nâng dung lượng.",
    action: isAdmin ? { label: u.pendingStorage ? "Xem yêu cầu" : "Nâng dung lượng", to: u.pendingStorage ? "/plans?tab=usage" : "/plans?tab=usage&buy=storage" } : undefined,
  };
  return { key: "storage-80", tone: "warning", icon: HardDrive, dismissable: true, title: `Dung lượng knowledge đã dùng ${Math.round(u.storage.pct * 100)}%.`, body: "Xóa bớt tài liệu cũ hoặc nâng dung lượng trước khi đầy.", action: isAdmin ? { label: "Xem hạn mức", to: "/plans?tab=usage" } : undefined };
}

const TONE: Record<Tone, string> = {
  warning: "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning-strong))] border-warning/30",
  danger: "bg-[hsl(var(--destructive-soft))] text-[hsl(var(--destructive-strong))] border-destructive/30",
};

function Banner({ b, onNavigate, className = "" }: { b: BannerModel; onNavigate: (to: string) => void; className?: string }) {
  const Icon = b.icon;
  return (
    <div role={b.tone === "danger" ? "alert" : "status"} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${TONE[b.tone]} ${className}`}>
      <Icon size={16} className="shrink-0" aria-hidden />
      <p className="flex-1 min-w-0"><span className="font-semibold">{b.title}</span>{b.body && <span> {b.body}</span>}</p>
      {b.action && (
        <button type="button" onClick={() => onNavigate(b.action!.to)} className="btn-primary h-8 px-3 text-xs shrink-0 focus-ring">{b.action.label}</button>
      )}
      {b.dismissable && (
        <button type="button" onClick={() => usageStore.dismiss(b.key)} aria-label="Ẩn thông báo này trong 24 giờ" title="Ẩn trong 24 giờ"
          className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center hover:bg-black/5 focus-ring">
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * Banner hạn mức: credit (mọi trang Console) + dung lượng (chỉ trang Knowledge, hoặc khi `showStorage`).
 * `inline` dùng trong trang Hạn mức sử dụng - không ẩn được, không có nút dẫn về chính trang đó.
 */
export function UsageBanners({ showStorage = false, inline = false, className = "" }: { showStorage?: boolean; inline?: boolean; className?: string }) {
  const u = useUsage();
  const { can } = useMyPermissions();
  const isAdmin = can("requests.review-agents");
  const navigate = useNavigate();
  const now = Date.now();
  const list = [creditBanner(u, isAdmin), showStorage ? storageBanner(u, isAdmin) : null]
    .filter((b): b is BannerModel => !!b)
    .filter(b => inline || !b.dismissable || !(u.dismissed[b.key] && now - u.dismissed[b.key] < HIDE_MS))
    .map(b => inline ? { ...b, dismissable: false, action: undefined } : b); // trong trang Hạn mức, nút hành động đã có ở thẻ gói
  if (!list.length) return null;
  return (
    <div className={`space-y-2 ${className}`}>
      {list.map(b => <Banner key={b.key} b={b} onNavigate={to => navigate(to)} />)}
    </div>
  );
}
