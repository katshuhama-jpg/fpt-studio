import { useMemo, type ReactNode } from "react";
import { Check } from "lucide-react";
import { useOrg } from "@/pages/organization/orgStore";
import { collectUnitsWithDepth } from "@/pages/organization/orgData";
import MemberPicker from "./MemberPicker";
import { type QuerySharing, type QueryScopeMode, type SharedPerson } from "./knowledgeBaseStore";

/** Shared radio-card row used by both permission dimensions (build access and query scope) —
 * pulled out so the Agent-item Share modal and the Console KB creation modals render the exact
 * same control instead of three hand-rolled copies drifting apart. */
export function RadioCard({ selected, onSelect, label, helper, children }: {
  selected: boolean; onSelect: () => void; label: string; helper?: string; children?: ReactNode;
}) {
  return (
    <div>
      <div
        onClick={onSelect}
        className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
          selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
        }`}
      >
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary" : "border-border"}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          {helper && <div className="text-xs text-muted-foreground mt-0.5">{helper}</div>}
        </div>
      </div>
      {selected && children && <div className="mt-2 pl-3.5">{children}</div>}
    </div>
  );
}

/** "Chọn phòng ban" picker for QuerySharing's department mode — a simple checklist over the org
 * tree's units (flattened, indented by depth), since this prototype has no separate
 * department/team entity distinct from OrgUnit. */
function DepartmentPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { tree } = useOrg();
  const units = useMemo(() => collectUnitsWithDepth(tree), [tree]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-white divide-y divide-border">
      {units.map(({ unit, depth }) => {
        const checked = value.includes(unit.id);
        return (
          <button
            key={unit.id}
            type="button"
            onClick={() => toggle(unit.id)}
            style={{ paddingLeft: `${12 + (depth - 1) * 16}px` }}
            className="w-full flex items-center gap-2.5 pr-3 py-2 text-left hover:bg-surface-muted transition-base"
          >
            <div className={`w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-border"}`}>
              {checked && <Check size={11} className="text-primary-foreground" />}
            </div>
            <span className="text-sm truncate">{unit.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export const QUERY_SCOPE_OPTIONS: { value: QueryScopeMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi", helper: "Chỉ khi bạn tự chat thử." },
  { value: "all_org", label: "Cả tổ chức", helper: "Trả lời mọi người trong tổ chức." },
  { value: "department", label: "Theo phòng ban", helper: "Chỉ người trong phòng ban đã chọn." },
  { value: "specific", label: "Người cụ thể", helper: "Chỉ đúng người bạn chọn." },
];

/** True once a `QuerySharing` value is complete enough to submit — "department" needs at least
 * one unit picked, "specific" needs at least one person. */
export function isQueryScopeValid(v: QuerySharing): boolean {
  return (v.mode !== "specific" || v.people.length > 0) && (v.mode !== "department" || v.departmentIds.length > 0);
}

/** The full "Phạm vi trả lời" field — label, subtitle, the 4 radio options, and each option's
 * inline picker + validation message. Controlled via a single `QuerySharing` value so callers
 * (the Agent-item Share modal, and the Console Knowledge creation modals) don't each carry their
 * own copy of this dimension's state shape. */
export default function QueryScopeSection({
  value, onChange, submitAttempted, ownerRow,
}: {
  value: QuerySharing;
  onChange: (next: QuerySharing) => void;
  submitAttempted: boolean;
  ownerRow: { name: string; email: string };
}) {
  const setMode = (mode: QueryScopeMode) => onChange({ ...value, mode });
  const setDepartmentIds = (departmentIds: string[]) => onChange({ ...value, departmentIds });
  const setPeople = (people: SharedPerson[]) => onChange({ ...value, people });

  return (
    <div>
      <label className="text-sm font-medium block">Phạm vi trả lời</label>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">Agent đã publish dùng nội dung này để trả lời ai.</p>
      <div className="space-y-2">
        {QUERY_SCOPE_OPTIONS.map(opt => (
          <RadioCard key={opt.value} selected={value.mode === opt.value} onSelect={() => setMode(opt.value)} label={opt.label} helper={opt.helper}>
            {opt.value === "department" && (
              <>
                <DepartmentPicker value={value.departmentIds} onChange={setDepartmentIds} />
                {submitAttempted && value.departmentIds.length === 0 && <p className="text-xs text-destructive mt-1.5">Chọn ít nhất một phòng ban.</p>}
              </>
            )}
            {opt.value === "specific" && (
              <>
                <MemberPicker value={value.people} onChange={setPeople} ownerRow={ownerRow} />
                {submitAttempted && value.people.length === 0 && <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người.</p>}
              </>
            )}
          </RadioCard>
        ))}
      </div>
    </div>
  );
}
