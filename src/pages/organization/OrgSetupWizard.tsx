import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Cloud, Pencil, Check, Loader2, ArrowRight, ArrowLeft, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Card } from "./shared";
import { useOrg } from "./orgStore";
import { getCurrentTenantId, getAllTenants } from "@/lib/spaceStore";

const NAME_MAX = 80;
const DESC_MAX = 240;

type Mode = "azure" | "manual";

/**
 * Shown instead of General/Structure/Members/Roles for a Space whose Organization hasn't been
 * set up yet (a freshly-created Space — see `RequireOrgConfigured` in App.tsx). Two steps:
 * 1) Org profile (logo/name/description), 2) how the Company/Department/Group structure gets
 * built — connect Azure AD (simulated here — no live Azure AD integration in this prototype)
 * or build it manually on the Structure page afterwards.
 */
export default function OrgSetupWizard() {
  const { completeOrgSetup } = useOrg();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTenant = getAllTenants().find(t => t.id === getCurrentTenantId());

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(currentTenant?.name ?? "");
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [connecting, setConnecting] = useState<Mode | null>(null);

  const nameValid = name.trim().length > 0;

  const handleLogoPick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn một file hình ảnh (PNG hoặc JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  };

  const finish = (mode: Mode) => {
    setConnecting(mode);
    // Simulated connection step — there is no live Azure AD integration in this prototype.
    // A real "manual" choice needs no wait at all, but pausing briefly here too keeps the two
    // paths visually consistent rather than one instantly resolving and one not.
    window.setTimeout(() => {
      completeOrgSetup({ name: name.trim(), description: description.trim() || undefined, logoDataUrl, mode });
      toast.success(mode === "azure" ? "Đã kết nối Azure AD — cấu trúc tổ chức của bạn đã được đồng bộ." : "Đã lưu thông tin doanh nghiệp/tổ chức. Vào Cấu trúc tổ chức để bắt đầu thêm chi nhánh, phòng ban và nhóm.");
      navigate("/organization/structure");
    }, 900);
  };

  return (
    <div className="px-8 py-10 max-w-[760px] mx-auto animate-fade-up">
      <PageHeader
        title="Thiết lập thông tin doanh nghiệp/tổ chức"
        desc={`Chỉ mất 2 bước để "${currentTenant?.name ?? ""}" sẵn sàng sử dụng.`}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs font-medium">
        <StepDot active={step === 1} done={step === 2} index={1} label="Thông tin doanh nghiệp/tổ chức" />
        <div className="flex-1 h-px bg-border" />
        <StepDot active={step === 2} done={false} index={2} label="Cấu trúc tổ chức" />
      </div>

      {step === 1 && (
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-xl bg-surface-muted border border-dashed border-border flex items-center justify-center shrink-0 overflow-hidden hover:border-primary/50 transition-base cursor-pointer"
              aria-label="Chọn logo doanh nghiệp/tổ chức"
            >
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="Logo doanh nghiệp/tổ chức" className="w-full h-full object-contain" />
              ) : (
                <ImagePlus size={20} className="text-muted-foreground" />
              )}
            </button>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-primary hover:underline cursor-pointer flex items-center gap-1.5"
              >
                <Pencil size={13} /> {logoDataUrl ? "Đổi logo" : "Tải logo lên"}
              </button>
              <p className="text-xs text-muted-foreground mt-0.5">Không bắt buộc, bạn có thể thêm sau. PNG hoặc JPG.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={e => handleLogoPick(e.target.files?.[0])}
            />
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Tên doanh nghiệp/tổ chức <span className="text-destructive">*</span></label>
              <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
            </div>
            <input
              autoFocus
              value={name}
              maxLength={NAME_MAX}
              onChange={e => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Ví dụ: Ngân hàng ABC"
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
            />
            {nameTouched && !nameValid && (
              <p className="text-xs text-destructive mt-1.5">Vui lòng nhập tên để tiếp tục.</p>
            )}
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Mô tả</label>
              <span className="text-xs text-muted-foreground">{description.length}/{DESC_MAX}</span>
            </div>
            <Textarea
              value={description}
              maxLength={DESC_MAX}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về doanh nghiệp của bạn (không bắt buộc)"
              className="resize-none"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => { if (!nameValid) { setNameTouched(true); return; } setStep(2); }}
              className="btn-primary h-9 px-4 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              Tiếp tục <ArrowRight size={14} />
            </button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <p className="text-sm text-muted-foreground mb-4">
            Bạn muốn xây dựng cơ cấu tổ chức cho <strong className="text-foreground">{name.trim() || "doanh nghiệp/tổ chức của bạn"}</strong> như thế nào?
          </p>

          <div className="grid gap-3">
            <ModeCard
              icon={<Cloud size={18} />}
              title="Kết nối với Microsoft Azure AD"
              desc="Đồng bộ tự động chi nhánh, phòng ban và nhóm từ Azure AD hiện có — bạn không cần tạo lại từ đầu."
              busyLabel="Đang kết nối..."
              recommended
              busy={connecting === "azure"}
              disabled={connecting !== null}
              onClick={() => finish("azure")}
            />
            <ModeCard
              icon={<Building2 size={18} />}
              title="Tạo cấu trúc thủ công"
              desc="Bắt đầu từ một doanh nghiệp/tổ chức trống — bạn tự tạo chi nhánh, phòng ban và nhóm trong Cấu trúc tổ chức."
              busyLabel="Đang tạo cấu trúc..."
              busy={connecting === "manual"}
              disabled={connecting !== null}
              onClick={() => finish("manual")}
            />
          </div>

          <div className="flex justify-start mt-6">
            <button
              type="button"
              disabled={connecting !== null}
              onClick={() => setStep(1)}
              className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function StepDot({ active, done, index, label }: { active: boolean; done: boolean; index: number; label: string }) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          done ? "bg-primary text-primary-foreground" : active ? "bg-primary-soft text-primary ring-1 ring-primary/30" : "bg-surface-muted text-muted-foreground"
        }`}
      >
        {done ? <Check size={11} /> : index}
      </span>
      {label}
    </div>
  );
}

function ModeCard({ icon, title, desc, recommended, busy, busyLabel, disabled, onClick }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  recommended?: boolean;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left rounded-xl border border-border bg-white p-4 flex items-start gap-3.5 transition-base hover:border-primary/50 hover:bg-primary-soft/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
        {busy ? <Loader2 size={16} className="animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {recommended && <span className="chip chip-primary text-[10px]">Khuyến nghị</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{busy ? (busyLabel ?? "Đang kết nối...") : desc}</p>
      </div>
    </button>
  );
}
