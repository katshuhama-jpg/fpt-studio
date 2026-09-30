// Super Admin: create Orgs and connect/disconnect them to Spaces — §10,
// BRAINSTORM_Governance_OrgTenantPublishScope.md (30/09/2026). Space and Org are independent
// entities with no inherent relationship; this screen is the only place that relationship is
// created. A Space's Publish modal only offers "Công ty / phòng ban" for the Org connected
// here (see AgentBuilder.tsx's PublishModal, `canPublishToOrg`).
//
// No Super Admin UI existed anywhere in the product before this — "Super Admin" was only a
// concept referenced in code comments describing an out-of-scope provisioning flow. This is a
// brand-new screen, not an extension of an existing admin console.
import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader } from "@/pages/organization/shared";
import {
  type Org,
  getAllOrgs,
  createOrg,
  connectSpaceToOrg,
  disconnectSpace,
  listConnectableSpaces,
  subscribeOrgConnectionChange,
} from "@/lib/orgConnectionStore";

export default function SuperAdminOrgs() {
  const [orgs, setOrgs] = useState<Org[]>(() => getAllOrgs());
  const [spaces, setSpaces] = useState(() => listConnectableSpaces());
  const [newOrgName, setNewOrgName] = useState("");
  // Which Org is selected in each Space row's picker, before "Kết nối" is clicked — keyed by
  // tenantId so each row keeps its own pending choice independently.
  const [pendingChoice, setPendingChoice] = useState<Record<string, string>>({});

  const refresh = () => {
    setOrgs(getAllOrgs());
    setSpaces(listConnectableSpaces());
  };

  useEffect(() => subscribeOrgConnectionChange(refresh), []);

  const handleCreateOrg = () => {
    const trimmed = newOrgName.trim();
    if (!trimmed) return;
    const org = createOrg(trimmed);
    setNewOrgName("");
    toast.success(`Đã tạo Org "${org.name}"`);
  };

  const handleConnect = (tenantId: string, spaceName: string) => {
    const orgId = pendingChoice[tenantId];
    if (!orgId) {
      toast.error("Chọn một Org trước khi kết nối.");
      return;
    }
    const result = connectSpaceToOrg(tenantId, orgId);
    if (!result.ok) {
      toast.error(result.reason === "personal_space" ? "Personal Space không bao giờ connect được Org." : "Không tìm thấy Org này.");
      return;
    }
    const orgName = orgs.find(o => o.id === orgId)?.name ?? orgId;
    toast.success(`Đã kết nối "${spaceName}" với Org "${orgName}"`);
  };

  const handleDisconnect = (tenantId: string, spaceName: string) => {
    disconnectSpace(tenantId);
    toast.success(`Đã ngắt kết nối "${spaceName}" khỏi Org`);
  };

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto animate-fade-up space-y-6">
      <PageHeader
        title="Super Admin: Kết nối Org"
        desc='Org và Space là 2 thực thể độc lập — chỉ khi được connect ở đây, Builder trên Space mới thấy "Công ty / phòng ban" khi Publish.'
      />

      <Card
        title="Organizations"
        desc="Tạo Org mới — độc lập với mọi Space, chưa gắn với ai cho tới khi được connect ở bảng bên dưới."
        action={
          <div className="flex items-center gap-2">
            <input
              value={newOrgName}
              onChange={e => setNewOrgName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreateOrg(); }}
              placeholder="Tên Org mới"
              className="h-9 rounded-lg border border-border px-3 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleCreateOrg}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-base shrink-0"
            >
              <Plus size={14} /> Tạo Org
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          {orgs.map(org => (
            <div key={org.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
              <span className="w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center text-primary shrink-0">
                <ShieldCheck size={14} />
              </span>
              <span className="text-sm font-medium flex-1 min-w-0 truncate">{org.name}</span>
              <span className="text-xs text-muted-foreground">{spacesConnectedLabel(org.id, spaces)}</span>
            </div>
          ))}
          {orgs.length === 0 && <p className="text-xs text-muted-foreground">Chưa có Org nào — tạo Org đầu tiên ở trên.</p>}
        </div>
      </Card>

      <Card
        title="Spaces"
        desc='Personal Space không hiện ở đây — vĩnh viễn không connect được Org nào (khớp giới hạn 5 thành viên của Personal Space).'
      >
        <div className="space-y-2">
          {spaces.map(sp => {
            const connectedOrg = orgs.find(o => o.id === sp.connectedOrgId);
            return (
              <div key={sp.tenantId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 flex-wrap">
                <span className="text-sm font-medium min-w-[160px]">{sp.name}</span>
                {connectedOrg ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary-soft text-primary font-medium">
                    Đã kết nối: {connectedOrg.name}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-muted text-muted-foreground">Chưa kết nối</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={pendingChoice[sp.tenantId] ?? sp.connectedOrgId ?? ""}
                    onChange={e => setPendingChoice(prev => ({ ...prev, [sp.tenantId]: e.target.value }))}
                    className="h-8 rounded-lg border border-border px-2 text-xs bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="" disabled>Chọn Org…</option>
                    {orgs.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleConnect(sp.tenantId, sp.name)}
                    className="h-8 px-2.5 rounded-lg border border-border text-xs font-medium flex items-center gap-1 hover:bg-surface-muted transition-base"
                  >
                    <Link2 size={12} /> Kết nối
                  </button>
                  {connectedOrg && (
                    <button
                      onClick={() => handleDisconnect(sp.tenantId, sp.name)}
                      className="h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-destructive flex items-center gap-1 hover:bg-destructive/10 transition-base"
                    >
                      <Unlink size={12} /> Ngắt kết nối
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function spacesConnectedLabel(orgId: string, spaces: { tenantId: string; name: string; connectedOrgId: string | null }[]): string {
  const count = spaces.filter(s => s.connectedOrgId === orgId).length;
  if (count === 0) return "Chưa Space nào connect";
  if (count === 1) return "1 Space đã connect";
  return `${count} Space đã connect`;
}
