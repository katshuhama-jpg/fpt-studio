import { useState, useMemo, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Cancel01Icon, Delete01Icon, MoreVerticalIcon, PencilEdit01Icon, Search01Icon, Share08Icon, EyeIcon } from "@hugeicons/core-free-icons";
import { createPortal } from "react-dom";
import { useMyPermissions } from "@/pages/organization/useMyPermissions";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { type Sharing, type SharingMode, type SharedPerson, isAccessibleTo, isViewOnly } from "@/components/configure/guardrailSharing";
import GuardrailMemberPicker from "@/components/configure/GuardrailMemberPicker";
import GuardrailShareModal from "@/components/configure/GuardrailShareModal";

/* ─── Types ──────────────────────────────────────────────────────────── */
type ActionKind = "Autogenerate response" | "Custom response" | "Require approval" | "Block" | "Redact and warn" | "Politely decline";

interface AgentChip { name: string; color: string }
interface Guardrail {
  id: number;
  name: string;
  desc: string;
  action: ActionKind;
  mandatory: boolean;
  agents: AgentChip[];
  allAgents?: boolean;
  enabled: boolean;
  /** Org-member id + display name of whoever created this guardrail, and the console-level
   * sharing settings they chose ("Quyền truy cập") — unset for the built-in mandatory/compliance
   * rules, which aren't "owned" by anyone the same way a Knowledge base shared to "all" isn't
   * really "someone's own." Read by the ownership tabs, tags, and row-menu permission matrix
   * below, matching the pattern already shipped on /knowledge exactly. */
  ownerId?: string;
  ownerName?: string;
  sharing?: Sharing;
}

/** True if `userId` can see this guardrail — always true for mandatory/all-agents compliance
 * rules, otherwise only if they created it, it's shared with every Console user, or it was
 * explicitly shared with them. */
function isGuardrailAccessible(g: Guardrail, userId: string): boolean {
  if (g.mandatory || g.allAgents) return true;
  if (!g.ownerId || !g.sharing) return false;
  return isAccessibleTo(g.sharing, g.ownerId, userId);
}

/* ─── Seed data ──────────────────────────────────────────────────────── */
const SEED: Guardrail[] = [
  { id: 1, name: "PII protection",            desc: "Never expose personal identifiers — CCID, passport, phone — in any response.",          action: "Autogenerate response",                   mandatory: true,  agents: [], enabled: true },
  { id: 2, name: "Prohibited content filter", desc: "Block violent, adult, or discriminatory content across all channels.",                    action: "Autogenerate response",                   mandatory: true,  agents: [], enabled: true },
  { id: 3, name: "Compliance disclaimer",     desc: "Append regulatory disclaimer to all financial and legal responses.",                      action: "Custom response",   mandatory: true,  agents: [], enabled: true },
  { id: 4, name: "Commercial response policy",desc: "Prevent AI from making pricing commitments or answering restricted topics.",              action: "Autogenerate response",               mandatory: false, agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "IT Helpdesk", color: "#059669" }, { name: "Product FAQ", color: "#d97706" }, { name: "Sales Qualifier", color: "#db2777" }], enabled: true,
    ownerId: "m-fsoft-ceo", ownerName: "Tran Nam", sharing: { mode: "private", people: [] } },
  { id: 5, name: "Legal and medical advice",  desc: "Do not provide legal or medical advice — refer to a specialist.",                         action: "Custom response", mandatory: false, agents: [], allAgents: true, enabled: true },
  { id: 6, name: "Escalate risky replies",    desc: "Human approval for any commitments about future roadmap.",                                action: "Require approval",                    mandatory: false, agents: [{ name: "Sales Qualifier", color: "#d97706" }], enabled: false,
    ownerId: "m-fsoft-coo", ownerName: "Linh Phan", sharing: { mode: "private", people: [] } },
  { id: 7, name: "Competitor mention block",  desc: "Avoid naming or comparing direct competitors in any response.",                           action: "Autogenerate response",               mandatory: false, agents: [{ name: "Banking ABC", color: "#4338ca" }, { name: "HR Onboarding", color: "#7c3aed" }, { name: "IT Helpdesk", color: "#059669" }], enabled: true,
    ownerId: "m-fsoft-vn-1", ownerName: "Duy Nguyen",
    sharing: { mode: "specific", people: [{ userId: "m-fsoft-ceo", name: "Tran Nam", email: "tran.nam@fpt.com", access: "edit" }] } },
  { id: 8, name: "Data retention notice",     desc: "Remind customers of the data retention period whenever personal data is collected.",      action: "Custom response",                     mandatory: false, agents: [], enabled: true,
    ownerId: "m-fsoft-ceo", ownerName: "Tran Nam", sharing: { mode: "all", people: [] } },
  { id: 9, name: "Vendor pricing disclosure", desc: "Never quote vendor cost prices — only publicly listed retail prices.",                    action: "Custom response",                     mandatory: false, agents: [], enabled: true,
    ownerId: "m-plat-1", ownerName: "Mai Hoang",
    sharing: { mode: "specific", people: [{ userId: "m-fsoft-ceo", name: "Tran Nam", email: "tran.nam@fpt.com", access: "view" }] } },
];

const SHARING_OPTIONS: { value: SharingMode; label: string; helper?: string }[] = [
  { value: "private", label: "Chỉ mình tôi" },
  { value: "all", label: "Tất cả người dùng Console", helper: "Mọi thành viên Console đều xem và dùng được guardrail này." },
  { value: "specific", label: "Người dùng cụ thể" },
];

/* ─── Response types ─────────────────────────────────────────────────── */
type ResponseKind = "auto" | "fixed" | null;

/* ─── Create / edit / view side sheet ───────────────────────────────── */
function CreateModal({ onClose, onCreate, initialData, currentUser, readOnly }: {
  onClose: () => void;
  onCreate: (g: Omit<Guardrail, "id" | "agents">) => void;
  initialData?: Guardrail;
  currentUser: { id: string; name: string; email: string };
  /** Opened via the row menu's "Mở" action for a view-only shared guardrail — every field is
   * inert and there's no primary button, just "Đóng". */
  readOnly?: boolean;
}) {
  const isEdit = !!initialData;
  const actionToResponse = (a?: ActionKind): ResponseKind => {
    if (a === "Autogenerate response") return "auto";
    if (a === "Custom response") return "fixed";
    return null;
  };
  const [topic, setTopic]       = useState(initialData?.name ?? "");
  const [desc, setDesc]         = useState(initialData?.desc ?? "");
  const [samples, setSamples]   = useState("");
  const [response, setResponse] = useState<ResponseKind>(actionToResponse(initialData?.action));
  const [fixedText, setFixedText] = useState("");
  const [allAgents, setAllAgents] = useState(initialData?.allAgents ?? false);
  const [sharingMode, setSharingMode] = useState<SharingMode>(initialData?.sharing?.mode ?? "private");
  const [people, setPeople] = useState<SharedPerson[]>(initialData?.sharing?.people ?? []);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const actionFromResponse = (): ActionKind => {
    if (response === "auto")  return "Autogenerate response";
    if (response === "fixed") return "Custom response";
    return "Autogenerate response";
  };

  const peopleError = sharingMode === "specific" && people.length === 0;
  const canSubmit = !!topic.trim() && !peopleError;

  const submit = () => {
    setSubmitAttempted(true);
    if (readOnly || !canSubmit) return;
    onCreate({
      name: topic.trim(), desc: desc.trim(), action: actionFromResponse(), mandatory: false, allAgents,
      enabled: initialData?.enabled ?? true,
      ownerId: initialData?.ownerId ?? currentUser.id,
      ownerName: initialData?.ownerName ?? currentUser.name,
      sharing: { mode: sharingMode, people: sharingMode === "specific" ? people : [] },
    });
    onClose();
  };

  const responseOptions: { key: ResponseKind; title: string; desc: string }[] = [
    { key: "auto",  title: "Autogenerate response",                 desc: "Agent automatically rewrites responses based on your instructions." },
    { key: "fixed", title: "Custom response", desc: "Agent replies using the exact text you provide." },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{position:"fixed",top:0,left:0,right:0,bottom:0}}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* popup */}
      <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{animation:"fadeScaleIn 0.18s ease"}}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold">{readOnly ? initialData?.name : isEdit ? "Edit Guardrail" : "Create Guardrail"}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{readOnly ? "Bạn chỉ có quyền xem guardrail này." : "Define the rule and choose how the agent responds."}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base mt-0.5"><HugeiconsIcon icon={Cancel01Icon} size={15} /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Define the rule ── */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Define the rule</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Topic <span className="text-destructive">*</span></label>
                  <span className="text-xs text-muted-foreground">{topic.length}/100</span>
                </div>
                <input
                  autoFocus={!readOnly}
                  disabled={readOnly}
                  maxLength={100}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base disabled:bg-surface-muted disabled:text-muted-foreground"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
                  <span className="text-xs text-muted-foreground">{desc.length}/800</span>
                </div>
                <textarea
                  disabled={readOnly}
                  maxLength={800}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none disabled:bg-surface-muted disabled:text-muted-foreground"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Samples</label>
                  <span className="text-xs text-muted-foreground">{samples.length}/2000</span>
                </div>
                <p className="text-xs text-primary mb-1.5 italic">Tip: Each sample must be separated by a line break.</p>
                <textarea
                  disabled={readOnly}
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none disabled:bg-surface-muted disabled:text-muted-foreground"
                  value={samples}
                  onChange={e => setSamples(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Response ── */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Response</h3>
            <p className="text-xs text-muted-foreground mb-4">Choose what the agent does when this rule triggers.</p>
            <div className="space-y-3">
              {responseOptions.map(opt => {
                const selected = response === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => !readOnly && setResponse(opt.key)}
                    className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-base ${readOnly ? "cursor-default" : "cursor-pointer"} ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-surface-muted"
                    }`}
                  >
                    {/* Radio */}
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-base ${
                      selected ? "border-primary" : "border-border"
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{opt.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                      {selected && opt.key === "fixed" && (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold mb-1.5">Fixed paragraph <span className="text-destructive">*</span></label>
                          <div className="relative">
                            <textarea
                              disabled={readOnly}
                              rows={4}
                              maxLength={300}
                              placeholder="Write the exact reply the agent should send."
                              className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none disabled:bg-surface-muted disabled:text-muted-foreground"
                              value={fixedText}
                              onChange={e => { e.stopPropagation(); setFixedText(e.target.value); }}
                              onClick={e => e.stopPropagation()}
                            />
                            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{fixedText.length}/300</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Apply for all agents */}
            <label className={`mt-3 flex items-center gap-2.5 select-none ${readOnly ? "" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={allAgents}
                onChange={e => setAllAgents(e.target.checked)}
                className="w-4 h-4 accent-primary shrink-0"
              />
              <div>
                <span className="text-sm font-medium">Apply for all agents</span>
                <p className="text-xs text-muted-foreground">This guardrail will be assigned to every agent in the workspace.</p>
              </div>
            </label>
          </div>

          {/* ── Quyền truy cập ── */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quyền truy cập</label>
            <div className="space-y-2">
              {SHARING_OPTIONS.map(opt => {
                const selected = sharingMode === opt.value;
                return (
                  <div key={opt.value}>
                    <div
                      onClick={() => !readOnly && setSharingMode(opt.value)}
                      className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border transition-base ${readOnly ? "cursor-default" : "cursor-pointer"} ${
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
                        {readOnly ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 px-1 py-1.5 text-sm">
                              <span className="font-medium">{initialData?.ownerName ?? currentUser.name}</span>
                              <span className="text-xs text-muted-foreground">Chủ sở hữu</span>
                            </div>
                            {people.map(p => (
                              <div key={p.userId} className="flex items-center justify-between gap-2.5 px-1 py-1.5 text-sm">
                                <span className="font-medium truncate">{p.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{p.access === "edit" ? "Có thể chỉnh sửa" : "Có thể xem"}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <GuardrailMemberPicker
                              value={people}
                              onChange={setPeople}
                              ownerRow={{ name: initialData?.ownerName ?? currentUser.name, email: initialData?.ownerId === currentUser.id || !initialData ? currentUser.email : "" }}
                            />
                            {peopleError && submitAttempted && (
                              <p className="text-xs text-destructive mt-1.5">Thêm ít nhất một người để chia sẻ.</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-white">
          {readOnly ? (
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base ml-auto">Đóng</button>
          ) : (
            <>
              <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Cancel</button>
              <button onClick={submit} disabled={!topic.trim()} className="h-9 px-6 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base disabled:opacity-40 disabled:cursor-not-allowed">
                {isEdit ? "Save changes" : "Create guardrail"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeScaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>,
    document.body
  );
}

/* ─── Ownership tag ──────────────────────────────────────────────────── */
function GuardrailOwnershipTags({ g, userId }: { g: Guardrail; userId: string }) {
  if (!g.ownerId || !g.sharing) return null;
  if (g.ownerId === userId) {
    return (
      <>
        <span className="chip chip-muted">Của tôi</span>
        {g.sharing.mode === "all" && <span className="chip chip-info">Dùng chung</span>}
        {g.sharing.mode === "specific" && g.sharing.people.length > 0 && (
          <span className="chip chip-info">Chia sẻ với {g.sharing.people.length} người</span>
        )}
      </>
    );
  }
  const me = g.sharing.people.find(p => p.userId === userId);
  return (
    <>
      <span className="chip chip-muted">Được chia sẻ · {g.ownerName ?? "—"}</span>
      {me && <span className="chip chip-info">{me.access === "edit" ? "Có thể chỉnh sửa" : "Có thể xem"}</span>}
    </>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */
type MainTab = "all" | "mine" | "shared";

export default function WorkspaceGuardrails() {
  const { can } = useMyPermissions();
  const access = useGroupAccess("guardrails");
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const currentUser = useMemo(() => {
    const me = members.find(m => m.id === access.userId);
    return { id: access.userId, name: me?.name ?? "Tran Nam", email: me?.email ?? "tran.nam@fpt.com" };
  }, [members, access.userId]);
  const canCreateGuardrail = can("guardrails.create");
  const [items, setItems] = useState<Guardrail[]>(SEED);
  const [query, setQuery]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Guardrail | null>(null);
  const [viewItem, setViewItem] = useState<Guardrail | null>(null);
  const [shareItem, setShareItem] = useState<Guardrail | null>(null);
  const [tab, setTab] = useState<MainTab>("all");
  let nextId = Math.max(...items.map(i => i.id)) + 1;

  // A role whose Guardrails View Scope is "Own & Shared" (or with no View permission at all)
  // only ever sees mandatory/all-agents compliance rules plus guardrails it created or that
  // were shared with it — not just on a filter tab, but in every count and list below.
  const visibleGuardrails = access.canSeeAll ? items : items.filter(g => isGuardrailAccessible(g, access.userId));

  const isMine = (g: Guardrail) => !!g.ownerId && g.ownerId === access.userId;
  const isSharedWithMe = (g: Guardrail) => !isMine(g) && !!g.ownerId && !!g.sharing && isAccessibleTo(g.sharing, g.ownerId, access.userId);

  const counts = useMemo(() => ({
    all: visibleGuardrails.length,
    mine: visibleGuardrails.filter(isMine).length,
    shared: visibleGuardrails.filter(isSharedWithMe).length,
  }), [visibleGuardrails, access.userId]);

  const tabFiltered = tab === "mine" ? visibleGuardrails.filter(isMine)
    : tab === "shared" ? visibleGuardrails.filter(isSharedWithMe)
    : visibleGuardrails;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tabFiltered.filter(g => !q || g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q));
  }, [tabFiltered, query]);

  const TABS: { key: MainTab; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "mine", label: "Của tôi" },
    { key: "shared", label: "Được chia sẻ" },
  ];

  const handleCreate = (g: Omit<Guardrail, "id" | "agents">) => {
    setItems(prev => [...prev, { ...g, id: nextId++, agents: [], enabled: true }]);
  };
  const handleEdit = (id: number, g: Omit<Guardrail, "id" | "agents">) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...g } : item));
  };
  const handleDelete = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  const toggleEnabled = (id: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };
  const handleShare = (id: number, sharing: Sharing) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, sharing } : item));
  };

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-fade-up">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} currentUser={currentUser} />}
      {editItem && <CreateModal onClose={() => setEditItem(null)} onCreate={g => { handleEdit(editItem.id, g); setEditItem(null); }} initialData={editItem} currentUser={currentUser} />}
      {viewItem && <CreateModal onClose={() => setViewItem(null)} onCreate={() => {}} initialData={viewItem} currentUser={currentUser} readOnly />}
      {shareItem && (
        <GuardrailShareModal
          open
          name={shareItem.name}
          ownerName={shareItem.ownerName ?? currentUser.name}
          sharing={shareItem.sharing ?? { mode: "private", people: [] }}
          onSave={sharing => handleShare(shareItem.id, sharing)}
          onClose={() => setShareItem(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Guardrails</h1>
        <p className="text-sm text-muted-foreground truncate">Shared safety policies you can apply to any agent — content restrictions, data protection, approval flows, and custom rules.</p>
      </div>

      {/* Ownership tabs */}
      <div className="flex items-center gap-1 flex-wrap mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 ${
              tab === t.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-primary/10 text-primary" : "bg-surface-sunken text-muted-foreground"}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div />
        <div className="flex items-center gap-2">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search guardrails"
              className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <button
            onClick={() => canCreateGuardrail && setShowCreate(true)}
            disabled={!canCreateGuardrail}
            title={!canCreateGuardrail ? "You don't have permission to create guardrails." : undefined}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium flex items-center gap-1.5 transition-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} /> Create guardrail
          </button>
        </div>
      </div>

      {/* Table — all guardrails */}
      <Table>
        <THead cols="1fr 200px 1fr 72px 64px" cells={["Guardrail", "Response action", "Assigned agents", "Status", "Actions"]} lastRight />
        {filtered.length === 0 ? <EmptyRow /> : filtered.map(g => {
          const hasOwner = !g.mandatory && !!g.ownerId && !!g.sharing;
          const isOwner = hasOwner && g.ownerId === access.userId;
          const accessible = isGuardrailAccessible(g, access.userId);
          const viewOnly = hasOwner && !isOwner && isViewOnly(g.sharing!, g.ownerId!, access.userId);
          const canPause = access.canAct("pause", accessible);

          const NO_ROLE_PERMISSION = "Bạn không có quyền thực hiện thao tác này.";
          const NOT_OWNED_OR_SHARED = "Bạn chỉ có thể thao tác trên guardrail bạn tạo hoặc được chia sẻ.";
          const VIEW_ONLY = "Bạn chỉ có quyền xem guardrail này.";

          const editBlocked = viewOnly ? VIEW_ONLY
            : !access.hasPermission("manage") ? NO_ROLE_PERMISSION
            : !access.canAct("manage", accessible) ? NOT_OWNED_OR_SHARED
            : undefined;
          const shareBlocked = !hasOwner ? undefined
            : !isOwner ? "Chỉ chủ sở hữu mới có thể chia sẻ guardrail này."
            : !access.hasPermission("publish") ? NO_ROLE_PERMISSION
            : !access.canAct("publish", accessible) ? NOT_OWNED_OR_SHARED
            : undefined;
          const deleteBlocked = hasOwner && !isOwner ? "Chỉ chủ sở hữu mới có thể xóa guardrail này."
            : !access.hasPermission("delete") ? NO_ROLE_PERMISSION
            : !access.canAct("delete", accessible) ? NOT_OWNED_OR_SHARED
            : undefined;

          return (
          <TRow key={g.id} cols="1fr 200px 1fr 72px 64px">
            <div>
              <div className="text-sm font-medium">{g.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{g.desc}</div>
              {hasOwner && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <GuardrailOwnershipTags g={g} userId={access.userId} />
                </div>
              )}
            </div>
            <div><ActionPill>{g.action}</ActionPill></div>
            <div className="flex items-center">
              {(g.mandatory || g.allAgents) && (
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#22c55e"/><path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </div>
            <div className="flex items-center">
              <button
                onClick={() => canPause && toggleEnabled(g.id)}
                disabled={!canPause}
                title={!canPause ? "Bạn không có quyền tạm dừng guardrail này." : undefined}
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  g.enabled ? "bg-primary border-primary" : "bg-transparent border-border"
                }`}
              >
                {g.enabled && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center justify-end">
              <RowMenu
                viewOnly={viewOnly}
                onOpen={() => setViewItem(g)}
                onEdit={() => setEditItem(g)}
                onShare={hasOwner ? () => setShareItem(g) : undefined}
                onDelete={() => handleDelete(g.id)}
                editBlocked={editBlocked}
                shareBlocked={shareBlocked}
                deleteBlocked={deleteBlocked}
              />
            </div>
          </TRow>
          );
        })}
      </Table>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface overflow-hidden">{children}</div>;
}

function THead({ cols, cells, lastRight }: { cols: string; cells: string[]; lastRight?: boolean }) {
  return (
    <div className="grid px-5 bg-surface-muted border-b border-border" style={{gridTemplateColumns: cols}}>
      {cells.map((c, i) => (
        <div key={c} className={`py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ${lastRight && i === cells.length - 1 ? "text-right" : ""}`}>{c}</div>
      ))}
    </div>
  );
}

function TRow({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div className="grid px-5 py-3.5 border-b border-border last:border-0 items-center gap-3" style={{gridTemplateColumns: cols}}>
      {children}
    </div>
  );
}

function EmptyRow() {
  return <div className="px-5 py-6 text-sm text-muted-foreground text-center">No guardrails found.</div>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface-muted text-xs text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
      {children}
    </span>
  );
}

function ActionPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-[180px] px-2.5 py-1 rounded-full border border-border bg-surface-muted text-xs text-muted-foreground truncate">
      {children}
    </span>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-primary border-primary" : "bg-surface-muted border-border"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
  );
}

/** Row "..." menu — enforces the same permission matrix as Knowledge's RowMenu: an item the
 * viewer only has view access to (via sharing, not role Scope) shows just a read-only "Mở";
 * everyone else sees all four actions, individually disabled+tooltipped by whichever gate
 * (ownership, role permission, or role Scope) actually blocks it. */
function RowMenu({ viewOnly, onOpen, onEdit, onShare, onDelete, editBlocked, shareBlocked, deleteBlocked }: {
  viewOnly?: boolean;
  onOpen: () => void; onEdit: () => void; onShare?: () => void; onDelete: () => void;
  editBlocked?: string; shareBlocked?: string; deleteBlocked?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-xl border border-border shadow-lg py-1 animate-fade-up">
          {viewOnly ? (
            <button
              onClick={() => { setOpen(false); onOpen(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-base"
            >
              <HugeiconsIcon icon={EyeIcon} size={13} className="text-muted-foreground" /> Mở
            </button>
          ) : (
            <>
              <button
                disabled={!!editBlocked}
                title={editBlocked}
                onClick={() => { setOpen(false); onEdit(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <HugeiconsIcon icon={PencilEdit01Icon} size={13} className="text-muted-foreground" /> Edit
              </button>
              {onShare && (
                <button
                  disabled={!!shareBlocked}
                  title={shareBlocked}
                  onClick={() => { setOpen(false); onShare(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <HugeiconsIcon icon={Share08Icon} size={13} className="text-muted-foreground" /> Share
                </button>
              )}
              <button
                disabled={!!deleteBlocked}
                title={deleteBlocked}
                onClick={() => { setOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <HugeiconsIcon icon={Delete01Icon} size={13} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-7 h-7 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base"
    >
      {children}
    </button>
  );
}
