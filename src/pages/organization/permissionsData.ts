import { Bot, BookOpen, Puzzle, Shield, Plug, Building2, ClipboardCheck } from "lucide-react";

export type Permission = { id: string; name: string; desc: string; implies?: string[] };
export type FeatureGroup = { id: string; label: string; icon: any; permissions: Permission[] };

/**
 * Creating and using Agents, Knowledge, Skills, Guardrails, and Connectors for
 * personal use is always available to every member — no permission required,
 * and anyone can already see what's live. Publishing, approving, editing, or
 * removing something from the workspace is what these permissions control.
 */
const FEATURES = [
  { id: "agents", label: "Agents", icon: Bot, thing: "agents" },
  { id: "knowledge", label: "Knowledge", icon: BookOpen, thing: "knowledge sources" },
  { id: "skills", label: "Skills & Tools", icon: Puzzle, thing: "skills" },
  { id: "guardrails", label: "Guardrails", icon: Shield, thing: "guardrails" },
  { id: "connectors", label: "Connectors", icon: Plug, thing: "connectors" },
];

function singularOf(thing: string) {
  return thing.replace(/s$/, "");
}

function article(singular: string) {
  return /^[aeiou]/i.test(singular) ? "an" : "a";
}

export const featureGroups: FeatureGroup[] = [
  ...FEATURES.map(({ id, label, icon, thing }) => {
    const singular = singularOf(thing);
    return {
      id,
      label,
      icon,
      permissions: [
        { id: `${id}.publish`, name: `Publish ${thing}`, desc: `Make a personal ${singular} available to the whole workspace, or share it with specific teammates.` },
        { id: `${id}.manage`, name: `Manage ${thing}`, desc: `Edit the configuration of a live ${singular} in the workspace.` },
        { id: `${id}.delete`, name: `Delete ${thing}`, desc: `Permanently delete a live ${singular} from the workspace.` },
      ],
    };
  }),
  {
    id: "approvals",
    label: "Phê duyệt publish",
    icon: ClipboardCheck,
    permissions: FEATURES.map(({ id, thing }) => {
      const singular = singularOf(thing);
      const isAgents = id === "agents";
      return {
        id: `${id}.approve`,
        name: `Approve ${thing}`,
        desc: isAgents
          ? "Xem xét và phê duyệt yêu cầu publish agent của thành viên khác — bao gồm mọi knowledge, skill, guardrail, hoặc connector đi kèm."
          : `Xem xét và phê duyệt yêu cầu publish ${singular} của thành viên khác, khi đứng riêng ngoài agent.`,
        implies: isAgents ? FEATURES.filter(f => f.id !== "agents").map(f => `${f.id}.approve`) : undefined,
      };
    }),
  },
  {
    id: "organization",
    label: "Tổ chức",
    icon: Building2,
    permissions: [
      { id: "organization.view", name: "Xem cấu trúc tổ chức", desc: "Xem các unit, thành viên và cấp báo cáo." },
      { id: "organization.members", name: "Quản lý thành viên & vai trò", desc: "Mời, gỡ, hoặc thay đổi vai trò của thành viên." },
      { id: "organization.settings", name: "Quản lý cài đặt tổ chức", desc: "Chỉnh sửa thông tin định danh, cấu trúc tổ chức và các hành động vùng nguy hiểm." },
    ],
  },
];

export const ALL_PERMISSION_IDS: string[] = featureGroups.flatMap(g => g.permissions.map(p => p.id));
