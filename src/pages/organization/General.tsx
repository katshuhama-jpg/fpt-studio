import { Card, Row, PageHeader } from "./shared";
import { Building2 } from "lucide-react";
import fptLogo from "@/assets/fpt-logo.jpg";
import { useOrg } from "./orgStore";
import { getCurrentTenantId } from "@/lib/spaceStore";

const SEED_TENANT_IDS = new Set(["fpt-smart-cloud", "fpt-telecom", "fpt-software", "sandbox"]);

export default function General() {
  const { tree, orgProfile } = useOrg();
  const isSeedTenant = SEED_TENANT_IDS.has(getCurrentTenantId());

  // FPT's existing seed Spaces keep their long-standing, view-only display — unchanged.
  if (isSeedTenant) {
    return (
      <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
        <PageHeader title="General" desc="How your organization appears to teammates. View only." />

        <Card>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-xl bg-white border border-border flex items-center justify-center shadow-soft shrink-0 overflow-hidden">
              <img src={fptLogo} alt="FPT logo" className="w-full h-full object-contain p-2" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">FPT Corporation</div>
              <p className="text-xs text-muted-foreground mt-0.5">Organization logo</p>
            </div>
          </div>
          <Row label="Organization name">
            <span className="text-sm text-foreground">FPT Corporation</span>
          </Row>
          <Row label="URL slug">
            <span className="text-sm text-foreground">app.fptai.com/fpt-corp</span>
          </Row>
          <Row label="Default language">
            <span className="text-sm text-foreground">Vietnamese</span>
          </Row>
        </Card>
      </div>
    );
  }

  // A newly-set-up Space shows the Organization profile just entered in the setup wizard.
  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="General" desc="How your organization appears to teammates. View only." />

      <Card>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-white border border-border flex items-center justify-center shadow-soft shrink-0 overflow-hidden">
            {orgProfile.logoDataUrl ? (
              <img src={orgProfile.logoDataUrl} alt={`${tree.name} logo`} className="w-full h-full object-contain p-2" />
            ) : (
              <Building2 size={22} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{tree.name}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Organization logo</p>
          </div>
        </div>
        <Row label="Organization name">
          <span className="text-sm text-foreground">{tree.name}</span>
        </Row>
        {orgProfile.description && (
          <Row label="Description">
            <span className="text-sm text-foreground">{orgProfile.description}</span>
          </Row>
        )}
        <Row label="Cấu trúc tổ chức">
          <span className="text-sm text-foreground">
            {orgProfile.setupMode === "azure" ? "Đồng bộ từ Microsoft Azure AD" : "Tự tạo thủ công"}
          </span>
        </Row>
      </Card>
    </div>
  );
}
