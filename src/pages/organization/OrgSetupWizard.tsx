import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Pencil, Loader2, Check, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Card } from "./shared";
import { useOrg } from "./orgStore";
import { getCurrentTenantId, getAllTenants } from "@/lib/spaceStore";

const NAME_MAX = 80;
const DESC_MAX = 240;

/**
 * Shown instead of General/Structure/Members/Roles for a Space whose Organization hasn't been
 * set up yet (a freshly-created Space — see `RequireOrgConfigured` in App.tsx). A Super Admin
 * already created this Space's Tenant + Organization and assigned the current person as its Org
 * Admin — this single step just finishes the Organization's profile (logo/name/description)
 * before handing off to Structure, where units and members are always built by hand from here
 * (there's no Azure AD or other auto-sync option — see BRAINSTORM_Governance_OrgTenantPublishScope.md).
 */
export default function OrgSetupWizard() {
  const { completeOrgSetup } = useOrg();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTenant = getAllTenants().find(t => t.id === getCurrentTenantId());

  const [name, setName] = useState(currentTenant?.name ?? "");
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

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

  const finish = () => {
    if (!nameValid) { setNameTouched(true); return; }
    setSubmitting(true);
    // Nothing actually async happens here — the brief pause just keeps this from feeling like
    // the click did nothing before it hands off to Structure.
    window.setTimeout(() => {
      completeOrgSetup({ name: name.trim(), description: description.trim() || undefined, logoDataUrl });
      toast.success("Đã lưu thông tin doanh nghiệp/tổ chức. Vào Cấu trúc tổ chức để bắt đầu thêm đơn vị và thành viên.");
      navigate("/organization/structure");
    }, 500);
  };

  return (
    <div className="px-8 py-10 max-w-[760px] mx-auto animate-fade-up">
      <PageHeader
        title="Hoàn tất thông tin doanh nghiệp/tổ chức"
        desc={`Bạn đã được chỉ định làm Org Admin của "${currentTenant?.name ?? ""}". Hoàn tất thông tin bên dưới để bắt đầu xây dựng cấu trúc tổ chức.`}
      />

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

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted/60 px-3.5 py-3 mt-4">
          <Building2 size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sau khi hoàn tất, bạn sẽ vào <span className="font-medium text-foreground">Cấu trúc tổ chức</span> — nơi tự tạo chi nhánh, phòng ban và nhóm, rồi thêm thành viên thủ công hoặc bằng file CSV.
          </p>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={finish}
            disabled={submitting}
            className="btn-primary h-9 px-4 inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Đang lưu...</>
            ) : (
              <>Hoàn tất <Check size={14} /></>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
