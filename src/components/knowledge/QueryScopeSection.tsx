import { useMemo, useState, type ReactNode } from "react";
import { Check, Network, Users, UserCheck, Bot, Hammer, MessageCircle, ChevronDown, UsersRound, type LucideIcon } from "lucide-react";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import OrgSharePicker, { toggleUnitIn, toggleMemberIn } from "@/components/governance/OrgSharePicker";
import MemberPicker from "./MemberPicker";
import { type QuerySharing, type QueryScopeMode, type SharedPerson, type SharingMode } from "./knowledgeBaseStore";

/** Shared option card for both permission blocks — same look as the Publish popup's audience
 * options (radio + icon tile + bold title + one-line description), so every permission choice in
 * Knowledge reads the same. `icon` is optional for older callers. */
export function RadioCard({ selected, onSelect, label, helper, icon: Icon, children }: {
  selected: boolean; onSelect: () => void; label: string; helper?: string; icon?: LucideIcon; children?: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={`w-full flex items-start gap-3 text-left rounded-xl border px-4 py-3 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selected ? "border-primary bg-primary-soft/50 ring-1 ring-primary" : "border-border bg-white hover:border-primary/40 hover:bg-surface-muted"
        }`}
      >
        <span className={`mt-[3px] w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-border"}`}>
          {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </span>
        {Icon && (
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-white text-primary" : "bg-surface-muted text-muted-foreground"}`}>
            <Icon size={16} />
          </span>
        )}
        <span className="flex-1 min-w-0 pt-px">
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          {helper && <span className="block text-xs text-muted-foreground leading-relaxed mt-0.5">{helper}</span>}
        </span>
      </button>
      {selected && children && <div className="mt-2 pl-4">{children}</div>}
    </div>
  );
}

/** Who a permission block is about. The two blocks look alike, so each one names its audience
 * with its own icon - people building Agents vs people chatting with an Agent. */
export type PermissionAudience = "builders" | "askers";
const AUDIENCE_META: Record<PermissionAudience, { label: string; icon: LucideIcon }> = {
  builders: { label: "Người xây Agent", icon: Hammer },
  askers: { label: "Người trò chuyện với Agent", icon: MessageCircle },
};
export function AudienceTag({ audience }: { audience: PermissionAudience }) {
  const { label, icon: Icon } = AUDIENCE_META[audience];
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground/70 whitespace-nowrap">
      <Icon size={11} aria-hidden /> Áp dụng cho: {label}
    </span>
  );
}

/** Title + audience + description block shared by both permission sections. */
export function PermissionHeading({ title, description, hideTitle = false, audience }: { title: string; description: string; hideTitle?: boolean; audience?: PermissionAudience }) {
  return (
    <div className="mb-3">
      {!hideTitle && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
      {audience && <div className={hideTitle ? "" : "mt-1"}><AudienceTag audience={audience} /></div>}
      <p className={`text-xs text-muted-foreground leading-relaxed ${hideTitle && !audience ? "" : "mt-1"}`}>{description}</p>
    </div>
  );
}

/** "Công ty / phòng ban" picker for "Agent trả lời cho ai" - the same org tree, search and
 * checkboxes as the Publish Agent popup: pick a whole company, a department, or individual
 * people found by name or email. Units are stored in departmentIds, people in people. */
function AnswerAudiencePicker({ value, onChange }: { value: QuerySharing; onChange: (next: QuerySharing) => void }) {
  const { tree } = useOrg();
  const selection = useMemo(() => new Set([...value.departmentIds.map(id => `u:${id}`), ...value.people.map(p => `m:${p.userId}`)]), [value]);
  const members = useMemo(() => new Map(collectMembers(tree).map(m => [m.id, m])), [tree]);
  const apply = (next: Set<string>) => {
    const departmentIds: string[] = [];
    const people: SharedPerson[] = [];
    for (const key of next) {
      if (key.startsWith("u:")) departmentIds.push(key.slice(2));
      else {
        const m = members.get(key.slice(2));
        if (m) people.push({ userId: m.id, name: m.name, email: m.email ?? "", access: "view" });
      }
    }
    onChange({ ...value, departmentIds, people });
  };
  return <OrgSharePicker tree={tree} selection={selection} onToggleUnit={u => apply(toggleUnitIn(selection, u))} onToggleMember={m => apply(toggleMemberIn(selection, m))} />;
}

/* ─── Copy for the two permission dimensions ─────────────────────────────────────────────
 * The two used to be "Quyền truy cập" / "Quyền truy xuất" - one word apart, and easy to mix up
 * although they are about different people. They are now named by the question they answer:
 * "Ai được dùng" (Build Access): which Space members can use this when building Agents.
 * "Agent trả lời cho ai" (Usage Access): which people chatting with an Agent get answers from it.
 * Every caller reads these constants so the wording never drifts. */
export const ACCESS_COPY = {
  title: "Ai được dùng kho này",
  /** Short label for menus, buttons and detail rows. */
  menu: "Ai được dùng",
  chip: "Dùng",
  description: "Người trong Space được liên kết kho này vào Agent khi xây dựng.",
  agentDescription: "Người trong Space được dùng lại tri thức này khi xây Agent khác.",
  narrowTitle: "Thu hẹp người được dùng?",
  narrowAction: "Thu hẹp",
  toast: "Đã lưu thay đổi.",
};
export const RETRIEVAL_COPY = {
  title: "Agent trả lời cho ai",
  menu: "Agent trả lời cho ai",
  chip: "Trả lời",
  description: "Chọn người được Agent lấy thông tin từ kho này để trả lời. Ai dùng được Agent do bước Publish Agent quyết định.",
  narrowTitle: "Thu hẹp người được trả lời?",
  narrowBody: "Agent sẽ ngừng lấy thông tin từ kho này để trả lời người ngoài phạm vi bạn chọn.",
  narrowAction: "Thu hẹp",
  toast: "Đã lưu thay đổi.",
};

export const ACCESS_OPTIONS: { value: SharingMode; label: string; helper: string; icon: LucideIcon }[] = [
  { value: "all", label: "Cả Space", helper: "Mọi thành viên Space đều liên kết được kho này vào Agent.", icon: Users },
  { value: "specific", label: "Người cụ thể", helper: "Chỉ người bạn chọn mới liên kết được kho này vào Agent.", icon: UserCheck },
];
/** Extra first option inside an Agent, for knowledge that Agent owns. Stored as mode "private". */
export const AGENT_ONLY_ACCESS_OPTION: { value: SharingMode; label: string; helper: string; icon: LucideIcon } = {
  value: "private", label: "Chỉ Agent này", helper: "Không chia sẻ. Chỉ Agent bạn đang chỉnh sửa dùng được tri thức này.", icon: Bot,
};

export const QUERY_SCOPE_OPTIONS: { value: QueryScopeMode; label: string; helper: string; icon: LucideIcon }[] = [
  { value: "all_org", label: "Mọi người dùng Agent", helper: "Ai trò chuyện với Agent cũng nhận được câu trả lời từ kho này.", icon: UsersRound },
  { value: "department", label: "Công ty / phòng ban", helper: "Chỉ trả lời cả công ty, phòng ban hoặc từng người bạn chọn. Người khác vẫn dùng được Agent, nhưng Agent không lấy thông tin từ kho này để trả lời họ.", icon: Network },
];

/** Older data may still carry "private"/"specific" retrieval modes — both read as "Cả tổ chức"
 * now that only the two org-level options exist. */
export function normalizeQuerySharing(v: QuerySharing | undefined): QuerySharing {
  if (!v || (v.mode !== "all_org" && v.mode !== "department")) return { mode: "all_org", departmentIds: [], people: [] };
  return { ...v, departmentIds: v.departmentIds ?? [], people: v.people ?? [] };
}

/** Short label for chips/detail rows, e.g. "Mọi người dùng Agent" or "2 phòng ban". */
export function retrievalLabel(v: QuerySharing | undefined): string {
  const q = normalizeQuerySharing(v);
  if (q.mode !== "department") return "Mọi người dùng Agent";
  const parts = [q.departmentIds.length ? `${q.departmentIds.length} đơn vị` : "", q.people.length ? `${q.people.length} người` : ""].filter(Boolean);
  return parts.join(", ") || "Chưa chọn ai";
}
/** Short label for the access dimension, e.g. "Cả Space", "3 người", "Chỉ Agent này". */
export function accessLabel(mode: SharingMode, peopleCount: number, privateLabel = "Chỉ mình tôi"): string {
  if (mode === "all") return "Cả Space";
  if (mode === "specific") return `${peopleCount} người`;
  return privateLabel;
}

/** True when a retrieval change takes answers away from someone: Cả tổ chức → Phòng ban, or a
 * department removed from the list. */
export function isRetrievalNarrowing(before: QuerySharing | undefined, after: QuerySharing): boolean {
  const b = normalizeQuerySharing(before);
  if (b.mode === "all_org") return after.mode === "department";
  if (after.mode === "all_org") return false;
  return b.departmentIds.some(id => !after.departmentIds.includes(id)) || b.people.some(p => !after.people.some(n => n.userId === p.userId));
}

/** True once a `QuerySharing` value is complete enough to submit — "department" needs at least
 * one unit picked. */
export function isQueryScopeValid(v: QuerySharing): boolean {
  return v.mode !== "department" || v.departmentIds.length > 0 || v.people.length > 0;
}

/** Quyền truy cập copy for any resource, e.g. noun = "skill này" / "guardrail này" / "kết nối
 * này". Same sentences as Knowledge so every library reads the same way. */
export interface AccessCopy {
  title: string; description: string; agentDescription: string;
  allHelper: string; specificHelper: string; privateHelper: string;
}
export function resourceAccessCopy(noun: string): AccessCopy {
  return {
    title: `Ai được dùng ${noun}`,
    description: `Người trong Space được liên kết ${noun} vào Agent khi xây dựng.`,
    agentDescription: `Người trong Space được dùng lại ${noun} khi xây Agent khác.`,
    allHelper: `Mọi thành viên Space đều liên kết được ${noun} vào Agent.`,
    specificHelper: `Chỉ người bạn chọn mới liên kết được ${noun} vào Agent.`,
    privateHelper: `Không chia sẻ. Chỉ Agent bạn đang chỉnh sửa dùng được ${noun}.`,
  };
}

/** "Quyền truy cập" block — title, description, option cards and the member picker. Knowledge
 * copy by default; other resources pass `copy` (see resourceAccessCopy) and their own `picker`. */
export function AccessScopeSection({ mode, people, onModeChange, onPeopleChange, submitAttempted, ownerRow, agentOnly = false, hideTitle = false, copy, picker }: {
  mode: SharingMode;
  people: SharedPerson[];
  onModeChange: (m: SharingMode) => void;
  onPeopleChange: (p: SharedPerson[]) => void;
  submitAttempted: boolean;
  ownerRow: { name: string; email: string };
  /** Inside an Agent, for knowledge that Agent owns — adds "Chỉ Agent này". */
  agentOnly?: boolean;
  /** Set inside a popup whose own title already says "Quyền truy cập". */
  hideTitle?: boolean;
  copy?: AccessCopy;
  /** Member picker for "Người cụ thể" — defaults to Knowledge's MemberPicker. */
  picker?: ReactNode;
}) {
  const base = agentOnly ? [AGENT_ONLY_ACCESS_OPTION, ...ACCESS_OPTIONS] : ACCESS_OPTIONS;
  const options = copy
    ? base.map(o => ({ ...o, helper: o.value === "all" ? copy.allHelper : o.value === "specific" ? copy.specificHelper : copy.privateHelper }))
    : base;
  const description = copy ? (agentOnly ? copy.agentDescription : copy.description) : (agentOnly ? ACCESS_COPY.agentDescription : ACCESS_COPY.description);
  return (
    <div role="radiogroup" aria-label={copy?.title ?? ACCESS_COPY.title}>
      <PermissionHeading title={copy?.title ?? ACCESS_COPY.title} description={description} hideTitle={hideTitle} audience="builders" />
      <div className="space-y-2">
        {options.map(opt => (
          <RadioCard key={opt.value} selected={mode === opt.value} onSelect={() => onModeChange(opt.value)} label={opt.label} helper={opt.helper} icon={opt.icon}>
            {opt.value === "specific" && (
              <>
                {picker ?? <MemberPicker value={people} onChange={onPeopleChange} ownerRow={ownerRow} />}
                {submitAttempted && people.length === 0 && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người.</p>}
              </>
            )}
          </RadioCard>
        ))}
      </div>
    </div>
  );
}

/** "Quyền truy xuất" block — title, description, the 2 option cards and the department picker.
 * Controlled via a single `QuerySharing` value. */
export default function QueryScopeSection({
  value, onChange, submitAttempted, hideTitle = false, collapsible = false,
}: {
  value: QuerySharing;
  onChange: (next: QuerySharing) => void;
  submitAttempted: boolean;
  ownerRow?: { name: string; email: string };
  hideTitle?: boolean;
  /** Create popups: start as a one-line summary with "Đổi", since most people keep the
   * default - keeps the two permission blocks from sitting side by side as look-alikes. */
  collapsible?: boolean;
}) {
  const v = normalizeQuerySharing(value);
  const setMode = (mode: QueryScopeMode) => onChange({ ...v, mode });
  const [expanded, setExpanded] = useState(!collapsible);

  if (!expanded) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{RETRIEVAL_COPY.title}</h3>
            <div className="mt-1"><AudienceTag audience="askers" /></div>
            <p className="text-sm text-foreground mt-2">{retrievalLabel(v)}</p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            className="h-8 px-3 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Đổi <ChevronDown size={14} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={RETRIEVAL_COPY.title}>
      <PermissionHeading title={RETRIEVAL_COPY.title} description={RETRIEVAL_COPY.description} hideTitle={hideTitle} audience="askers" />
      <div className="space-y-2">
        {QUERY_SCOPE_OPTIONS.map(opt => (
          <RadioCard key={opt.value} selected={v.mode === opt.value} onSelect={() => setMode(opt.value)} label={opt.label} helper={opt.helper} icon={opt.icon}>
            {opt.value === "department" && (
              <>
                <AnswerAudiencePicker value={v} onChange={onChange} />
                {submitAttempted && !isQueryScopeValid(v) && <p className="text-xs text-destructive mt-1.5">Chọn ít nhất một công ty, phòng ban hoặc người.</p>}
              </>
            )}
          </RadioCard>
        ))}
      </div>
    </div>
  );
}
