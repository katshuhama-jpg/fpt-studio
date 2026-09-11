import { CURRENT_USER, type Sharing, type SharingMode, type SharedPerson } from "./knowledgeBaseStore";
import MemberPicker from "./MemberPicker";

const ACCESS_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được kho này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

/** Query-scope options — a distinct concept from ACCESS_OPTIONS above: that field controls who
 * can see/manage a document/folder in Console, while this one controls which chat end-users an
 * Agent is allowed to draw on its content for when answering, independent of who the Agent
 * itself is published to. Reuses the same 3-value SharingMode shape (private/all/specific) since
 * the option set happens to match, but the two fields are otherwise independent. */
const QUERY_SCOPE_OPTIONS: { value: SharingMode; label: string }[] = [
  { value: "private", label: "Chỉ trả lời cho tôi" },
  { value: "all", label: "Trả lời cho mọi người" },
  { value: "specific", label: "Chỉ trả lời cho người cụ thể" },
];

function RadioCards({ options, mode, onModeChange, people, onPeopleChange, invalidMessage, showErrors, ownerRow }: {
  options: { value: SharingMode; label: string; helper?: string }[];
  mode: SharingMode; onModeChange: (m: SharingMode) => void;
  people: SharedPerson[]; onPeopleChange: (p: SharedPerson[]) => void;
  invalidMessage: string;
  showErrors: boolean;
  ownerRow: { name: string; email: string };
}) {
  return (
    <div className="space-y-2">
      {options.map(opt => {
        const selected = mode === opt.value;
        return (
          <div key={opt.value}>
            <div
              onClick={() => onModeChange(opt.value)}
              className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-base ${
                selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary" : "border-border"}`}>
                {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{opt.label}</div>
                {opt.helper && <div className="text-xs text-muted-foreground mt-0.5">{opt.helper}</div>}
              </div>
            </div>
            {selected && opt.value === "specific" && (
              <div className="mt-2 pl-3.5">
                <MemberPicker value={people} onChange={onPeopleChange} ownerRow={ownerRow} />
                {showErrors && people.length === 0 && <p className="text-xs text-destructive mt-1.5">{invalidMessage}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The two Knowledge permission fields — "Quyền quản lý tài liệu" (Console-management access)
 * and "Phạm vi trả lời của Agent (Query scope)" (chat-time answer scope) — as one controlled
 * unit, shared verbatim across the Upload modal, ShareKnowledgeBaseModal, and the folder
 * create/edit modal so the labels/helper text/options can never drift between them.
 * `showQueryScope=false` renders only the first field (used for a whole Console KB share, which
 * has no query-scope concept of its own). */
export default function PermissionFields({
  sharing, onSharingChange, querySharing, onQuerySharingChange, showQueryScope = true, showErrors = true,
  ownerRow = { name: CURRENT_USER.name, email: CURRENT_USER.email },
}: {
  sharing: Sharing; onSharingChange: (s: Sharing) => void;
  querySharing?: Sharing; onQuerySharingChange?: (s: Sharing) => void;
  showQueryScope?: boolean;
  /** Whether an empty "Người dùng cụ thể"/"Chỉ trả lời cho người cụ thể" picker's validation
   * message shows immediately (the default — matches the Upload modal, a one-shot form) or only
   * after the caller's own submit attempt (pass `false` until then, matching
   * ShareKnowledgeBaseModal's nicer "don't yell before they've tried to save" UX). */
  showErrors?: boolean;
  /** Row shown above the picked-people list — defaults to the signed-in user, but a Share modal
   * editing someone else's item should pass that item's real owner instead. */
  ownerRow?: { name: string; email: string };
}) {
  return (
    <>
      <div>
        <label className="text-sm font-medium mb-1 block">Quyền quản lý tài liệu</label>
        <p className="text-xs text-muted-foreground mb-2">Kiểm soát ai được xem, chỉnh sửa và xóa tài liệu này trong Console.</p>
        <RadioCards
          options={ACCESS_OPTIONS}
          mode={sharing.mode}
          onModeChange={mode => onSharingChange({ mode, people: mode === "specific" ? sharing.people : [] })}
          people={sharing.people}
          onPeopleChange={people => onSharingChange({ mode: sharing.mode, people })}
          invalidMessage="Thêm ít nhất một người để chia sẻ."
          showErrors={showErrors}
          ownerRow={ownerRow}
        />
      </div>

      {showQueryScope && querySharing && onQuerySharingChange && (
        <div>
          <label className="text-sm font-medium mb-1 block">Phạm vi trả lời của Agent (Query scope)</label>
          <p className="text-xs text-muted-foreground mb-2">
            Kiểm soát Agent được dùng nội dung tài liệu này để trả lời ai khi trò chuyện — không phụ thuộc vào việc Agent được publish cho ai.
          </p>
          <RadioCards
            options={QUERY_SCOPE_OPTIONS}
            mode={querySharing.mode}
            onModeChange={mode => onQuerySharingChange({ mode, people: mode === "specific" ? querySharing.people : [] })}
            people={querySharing.people}
            onPeopleChange={people => onQuerySharingChange({ mode: querySharing.mode, people })}
            invalidMessage="Thêm ít nhất một người để giới hạn phạm vi trả lời."
            showErrors={showErrors}
            ownerRow={ownerRow}
          />
        </div>
      )}
    </>
  );
}

export const DEFAULT_SHARING: Sharing = { mode: "private", people: [] };
export function isPermissionInvalid(sharing: Sharing, querySharing?: Sharing): boolean {
  return (sharing.mode === "specific" && sharing.people.length === 0) ||
    (!!querySharing && querySharing.mode === "specific" && querySharing.people.length === 0);
}
