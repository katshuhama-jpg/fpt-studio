import { useMemo, type ReactNode } from "react";
import { Check, Building2, Network, Users, UserCheck, Bot, type LucideIcon } from "lucide-react";
import { useOrg } from "@/pages/organization/orgStore";
import { collectUnitsWithDepth, collectUnits } from "@/pages/organization/orgData";
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

/** Title + description block shared by both permission sections. */
export function PermissionHeading({ title, description, hideTitle = false }: { title: string; description: string; hideTitle?: boolean }) {
  return (
    <div className="mb-3">
      {!hideTitle && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
      <p className={`text-xs text-muted-foreground leading-relaxed ${hideTitle ? "" : "mt-0.5"}`}>{description}</p>
    </div>
  );
}

/** "Chọn phòng ban" picker for QuerySharing's department mode — a simple checklist over the org
 * tree's units (flattened, indented by depth), since this prototype has no separate
 * department/team entity distinct from OrgUnit.
 *
 * Checking a parent unit also checks every unit nested under it (and unchecking it clears them
 * too) — picking "Vietnam Delivery" should cover "Platform Engineering", "AI/ML", etc. without
 * making the person hunt down and tick each child individually. A child can still be
 * checked/unchecked on its own afterwards; a row's own checkmark reflects whether it AND every
 * unit under it are selected — unticking just one descendant turns its ancestors' checkmarks into
 * a dash rather than leaving them looking fully (and misleadingly) checked. */
function DepartmentPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { tree } = useOrg();
  const units = useMemo(() => collectUnitsWithDepth(tree), [tree]);
  const unitsById = useMemo(() => new Map(units.map(({ unit }) => [unit.id, unit])), [units]);
  const selected = useMemo(() => new Set(value), [value]);
  const coverage = (id: string) => {
    const unit = unitsById.get(id);
    return unit ? [id, ...collectUnits(unit).map(u => u.id)] : [id];
  };

  const toggle = (id: string) => {
    const affected = coverage(id);
    const isFullyChecked = affected.every(v => selected.has(v));
    if (isFullyChecked) {
      onChange(value.filter(v => !affected.includes(v)));
    } else {
      // Unchecked or only partially checked — clicking always completes the selection
      // (fills in every missing descendant) rather than clearing it, so a dash never
      // toggles the "wrong" direction from what its checkmark-in-waiting implies.
      onChange(Array.from(new Set([...value, ...affected])));
    }
  };

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-white divide-y divide-border">
      {units.map(({ unit, depth }) => {
        const coverageIds = coverage(unit.id);
        const checked = coverageIds.every(id => selected.has(id));
        const partiallyChecked = !checked && coverageIds.some(id => selected.has(id));
        return (
          <button
            key={unit.id}
            type="button"
            onClick={() => toggle(unit.id)}
            style={{ paddingLeft: `${12 + (depth - 1) * 16}px` }}
            className="w-full flex items-center gap-2.5 pr-3 py-2 text-left hover:bg-surface-muted transition-base"
          >
            <div className={`w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center ${checked || partiallyChecked ? "bg-primary border-primary" : "border-border"}`}>
              {checked && <Check size={11} className="text-primary-foreground" />}
              {partiallyChecked && <div className="w-2 h-0.5 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm truncate">{unit.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Copy for the two permission dimensions ─────────────────────────────────────────────
 * Quyền truy cập: which members can use this knowledge when building Agents (what each one can
 * view/edit/delete still follows their own permissions).
 * Quyền truy xuất: which end users can receive information from this knowledge through an Agent.
 * Every caller (Space creation, Space share popups, Agent share popup, header chips, detail
 * popups) reads these constants so the wording never drifts. */
export const ACCESS_COPY = {
  title: "Quyền truy cập",
  description: "Ai được dùng kho tri thức này khi xây dựng Agent. Mỗi người xem, sửa hay xóa được tùy theo quyền của họ. Không ảnh hưởng tới việc Agent trả lời cho ai.",
  agentDescription: "Ai được dùng tri thức này khi xây dựng Agent. Khi chia sẻ, mỗi mục trở thành một kho tri thức trong Space, Agent này vẫn dùng như cũ.",
  toast: "Đã cập nhật quyền truy cập.",
};
export const RETRIEVAL_COPY = {
  title: "Quyền truy xuất",
  description: "Ai được nhận thông tin từ kho tri thức này khi hỏi Agent. Không ảnh hưởng tới việc ai được dùng kho để xây dựng Agent.",
  toast: "Đã cập nhật quyền truy xuất.",
};

export const ACCESS_OPTIONS: { value: SharingMode; label: string; helper: string; icon: LucideIcon }[] = [
  { value: "all", label: "Cả Space", helper: "Mọi thành viên trong Space đều dùng được kho này cho Agent của họ.", icon: Users },
  { value: "specific", label: "Người cụ thể", helper: "Chỉ những người bạn chọn mới dùng được kho này.", icon: UserCheck },
];
/** Extra first option inside an Agent, for knowledge that Agent owns. Stored as mode "private". */
export const AGENT_ONLY_ACCESS_OPTION: { value: SharingMode; label: string; helper: string; icon: LucideIcon } = {
  value: "private", label: "Chỉ Agent này", helper: "Không chia sẻ. Chỉ Agent đang mở dùng được.", icon: Bot,
};

export const QUERY_SCOPE_OPTIONS: { value: QueryScopeMode; label: string; helper: string; icon: LucideIcon }[] = [
  { value: "all_org", label: "Cả tổ chức", helper: "Agent trả lời bằng nội dung này cho mọi người trong tổ chức.", icon: Building2 },
  { value: "department", label: "Phòng ban", helper: "Agent chỉ trả lời cho người thuộc phòng ban bạn chọn.", icon: Network },
];

/** Older data may still carry "private"/"specific" retrieval modes — both read as "Cả tổ chức"
 * now that only the two org-level options exist. */
export function normalizeQuerySharing(v: QuerySharing | undefined): QuerySharing {
  if (!v || (v.mode !== "all_org" && v.mode !== "department")) return { mode: "all_org", departmentIds: [], people: [] };
  return v;
}

/** Short label for chips/detail rows, e.g. "Cả tổ chức" or "2 phòng ban". */
export function retrievalLabel(v: QuerySharing | undefined): string {
  const q = normalizeQuerySharing(v);
  return q.mode === "department" ? `${q.departmentIds.length} phòng ban` : "Cả tổ chức";
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
  return b.departmentIds.some(id => !after.departmentIds.includes(id));
}

/** True once a `QuerySharing` value is complete enough to submit — "department" needs at least
 * one unit picked. */
export function isQueryScopeValid(v: QuerySharing): boolean {
  return v.mode !== "department" || v.departmentIds.length > 0;
}

/** "Quyền truy cập" block — title, description, option cards and the member picker. */
export function AccessScopeSection({ mode, people, onModeChange, onPeopleChange, submitAttempted, ownerRow, agentOnly = false, hideTitle = false }: {
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
}) {
  const options = agentOnly ? [AGENT_ONLY_ACCESS_OPTION, ...ACCESS_OPTIONS] : ACCESS_OPTIONS;
  return (
    <div role="radiogroup" aria-label={ACCESS_COPY.title}>
      <PermissionHeading title={ACCESS_COPY.title} description={agentOnly ? ACCESS_COPY.agentDescription : ACCESS_COPY.description} hideTitle={hideTitle} />
      <div className="space-y-2">
        {options.map(opt => (
          <RadioCard key={opt.value} selected={mode === opt.value} onSelect={() => onModeChange(opt.value)} label={opt.label} helper={opt.helper} icon={opt.icon}>
            {opt.value === "specific" && (
              <>
                <MemberPicker value={people} onChange={onPeopleChange} ownerRow={ownerRow} />
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
  value, onChange, submitAttempted, hideTitle = false,
}: {
  value: QuerySharing;
  onChange: (next: QuerySharing) => void;
  submitAttempted: boolean;
  ownerRow?: { name: string; email: string };
  hideTitle?: boolean;
}) {
  const v = normalizeQuerySharing(value);
  const setMode = (mode: QueryScopeMode) => onChange({ ...v, mode });
  const setDepartmentIds = (departmentIds: string[]) => onChange({ ...v, departmentIds });

  return (
    <div role="radiogroup" aria-label={RETRIEVAL_COPY.title}>
      <PermissionHeading title={RETRIEVAL_COPY.title} description={RETRIEVAL_COPY.description} hideTitle={hideTitle} />
      <div className="space-y-2">
        {QUERY_SCOPE_OPTIONS.map(opt => (
          <RadioCard key={opt.value} selected={v.mode === opt.value} onSelect={() => setMode(opt.value)} label={opt.label} helper={opt.helper} icon={opt.icon}>
            {opt.value === "department" && (
              <>
                <DepartmentPicker value={v.departmentIds} onChange={setDepartmentIds} />
                {submitAttempted && v.departmentIds.length === 0 && <p className="text-xs text-destructive mt-1.5">Chọn ít nhất một phòng ban.</p>}
              </>
            )}
          </RadioCard>
        ))}
      </div>
    </div>
  );
}
