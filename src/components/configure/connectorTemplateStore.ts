// sessionStorage-backed store for pre-built "Connector Template" entries under Custom Connectors —
// internal FPT systems (FCI CRM, FCI Member, FCI Tickets) that used to sit in the Marketplace
// Connectors catalog. Unlike Marketplace (true 3rd-party commercial tools) or user-added Custom MCP
// connectors, a template is defined by FPT ahead of time (fixed field list, fixed permission list)
// but the actual connection — one or more named credential sets ("accounts") — is set up per
// workspace, mirroring the real product's FCI CRM/FCI Member connect + manage flows.
import { loadMap, saveMap } from "@/lib/sessionPersist";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";

export type ConnectorTemplateId = "fci-crm" | "fci-member" | "fci-tickets";

export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "password";
}

export interface TemplatePermission {
  name: string;
  desc: string;
  mode: "ask" | "auto";
}

export interface ConnectorTemplateDef {
  id: ConnectorTemplateId;
  name: string;
  desc: string;
  helperNote: string;
  fields: TemplateField[];
  permissions: TemplatePermission[];
}

export interface TemplateAccount {
  id: string;
  templateId: ConnectorTemplateId;
  /** Named credential set, e.g. "Team A token" — lets one template have several saved credential
   * sets/accounts, matching the real product's FCI CRM "Credential name" field. */
  credentialName: string;
  connectedByName: string;
  connectedAt: number;
  status: "active";
}

export const CONNECTOR_TEMPLATES: ConnectorTemplateDef[] = [
  {
    id: "fci-crm",
    name: "FCI CRM",
    desc: "Truy vấn và cập nhật khách hàng, cơ hội bán hàng trên FCI CRM.",
    helperNote: "Nhập các header credential dùng chung cho workspace. FCI CRM dùng header S-Token.",
    fields: [
      { key: "email", label: "CRM Email", type: "text" },
      { key: "secret", label: "Secret Access Key", type: "password" },
    ],
    permissions: [
      { name: "Tạo bản ghi CRM", desc: "Tạo mới khách hàng hoặc cơ hội bán hàng trong FCI CRM.", mode: "ask" },
      { name: "Xem trạng thái CRM", desc: "Tra cứu thông tin khách hàng/cơ hội hiện có.", mode: "auto" },
    ],
  },
  {
    id: "fci-member",
    name: "FCI Member",
    desc: "Quản lý hồ sơ thành viên và nhân sự trên FCI Member.",
    helperNote: "Nhập các header credential dùng chung cho workspace. FCI Member dùng header S-Token.",
    fields: [
      { key: "email", label: "Email quản trị", type: "text" },
      { key: "secret", label: "Secret Access Key", type: "password" },
    ],
    permissions: [
      { name: "Tạo thành viên FCI", desc: "Tạo mới hồ sơ thành viên.", mode: "ask" },
      { name: "Xem trạng thái thành viên", desc: "Tra cứu trạng thái hồ sơ thành viên hiện có.", mode: "auto" },
    ],
  },
  {
    id: "fci-tickets",
    name: "FCI Tickets",
    desc: "Tạo và theo dõi ticket hỗ trợ trên hệ thống FCI Tickets.",
    helperNote: "Nhập các header credential dùng chung cho workspace. FCI Tickets dùng header S-Token.",
    fields: [
      { key: "email", label: "Email", type: "text" },
      { key: "secret", label: "Secret Access Key", type: "password" },
    ],
    permissions: [
      { name: "Tạo ticket", desc: "Tạo mới yêu cầu hỗ trợ.", mode: "ask" },
      { name: "Xem trạng thái ticket", desc: "Tra cứu trạng thái ticket hiện có.", mode: "auto" },
    ],
  },
];

const STORE_KEY = "connector_template_accounts_v1";
const SEEDED_KEY = "connector_template_accounts_seeded_v1";
const store = loadMap<string, TemplateAccount>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seed() {
  if (sessionStorage.getItem(SEEDED_KEY)) return;
  sessionStorage.setItem(SEEDED_KEY, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  // FCI Member already connected with 1 account, so both the "Kết nối" (empty) and "Quản lý"
  // (connected, multi-account) states are demoable without extra setup. FCI CRM/Tickets start
  // unconnected.
  store.set("tacct-1", {
    id: "tacct-1", templateId: "fci-member", credentialName: "Mặc định",
    connectedByName: CURRENT_USER.name, connectedAt: now - 12 * DAY, status: "active",
  });
  persist();
}

export const connectorTemplateStore = {
  listAccounts(templateId: ConnectorTemplateId): TemplateAccount[] {
    seed();
    return [...store.values()].filter(a => a.templateId === templateId).sort((a, b) => b.connectedAt - a.connectedAt);
  },
  isConnected(templateId: ConnectorTemplateId): boolean {
    return this.listAccounts(templateId).length > 0;
  },
  isDuplicateCredentialName(templateId: ConnectorTemplateId, name: string): boolean {
    const n = name.trim().toLowerCase();
    return this.listAccounts(templateId).some(a => a.credentialName.trim().toLowerCase() === n);
  },
  addAccount(templateId: ConnectorTemplateId, credentialName: string): TemplateAccount {
    const id = `tacct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const acct: TemplateAccount = {
      id, templateId, credentialName: credentialName.trim(),
      connectedByName: CURRENT_USER.name, connectedAt: Date.now(), status: "active",
    };
    store.set(id, acct);
    persist();
    return acct;
  },
  removeAccount(id: string) {
    store.delete(id);
    persist();
  },
  disconnectAll(templateId: ConnectorTemplateId) {
    for (const a of this.listAccounts(templateId)) store.delete(a.id);
    persist();
  },
};
