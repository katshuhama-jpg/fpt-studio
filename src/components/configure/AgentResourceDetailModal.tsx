import { useEffect, useMemo, useState, type ReactNode } from "react";
import { agentOnlyForIn, saveSharingInAgent } from "@/components/governance/spaceDelete";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useGroupAccess } from "@/pages/organization/scopeAccess";
import { useOrg } from "@/pages/organization/orgStore";
import { collectMembers } from "@/pages/organization/orgData";
import { getAgent } from "@/components/configure/agentStore";
import { skillStore } from "@/components/configure/skillStore";
import { agentSkillStore } from "@/components/configure/agentSkillStore";
import { isAccessibleTo as isSkillAccessible, isViewOnly as isSkillViewOnly } from "@/components/configure/skillSharing";
import { renderSkillBody } from "@/components/configure/skillMarkdown";
import CreateSkillModal, { type SkillFormData } from "@/components/configure/CreateSkillModal";
import SkillShareModal from "@/components/configure/SkillShareModal";
import { guardrailConsoleStore, actionLabelVi, type Guardrail } from "@/components/configure/guardrailConsoleStore";
import { agentGuardrailStore } from "@/components/configure/agentGuardrailStore";
import { isAccessibleTo as isGuardrailAccessibleTo, isViewOnly as isGuardrailViewOnly } from "@/components/configure/guardrailSharing";
import CreateGuardrailModal from "@/components/configure/CreateGuardrailModal";
import GuardrailShareModal from "@/components/configure/GuardrailShareModal";
import { customConnectorStore } from "@/components/configure/customConnectorStore";
import { isAccessibleTo as isConnectorAccessible, isViewOnly as isConnectorViewOnly } from "@/components/configure/customConnectorSharing";
import AddCustomConnectorModal from "@/components/configure/AddCustomConnectorModal";
import CustomConnectorShareModal from "@/components/configure/CustomConnectorShareModal";
import { customApiToolStore, AUTH_TYPE_LABEL } from "@/components/configure/customApiToolStore";
import AddCustomApiToolModal from "@/components/configure/AddCustomApiToolModal";
import { knowledgeBaseStore, isAccessibleTo as isKbAccessibleTo, isViewOnly as isKbViewOnly } from "@/components/knowledge/knowledgeBaseStore";
import { knowledgeDocumentStore } from "@/components/knowledge/knowledgeDocumentStore";
import { knowledgeUrlStore } from "@/components/knowledge/knowledgeUrlStore";
import { knowledgeFaqStore } from "@/components/knowledge/knowledgeFaqStore";
import { knowledgeStore } from "@/components/knowledge/knowledgeStore";
import CreateKnowledgeBaseModal from "@/components/knowledge/CreateKnowledgeBaseModal";
import ShareKnowledgeBaseModal from "@/components/knowledge/ShareKnowledgeBaseModal";
import ShareAgentItemModal from "@/components/knowledge/ShareAgentItemModal";
import RetrievalScopeModal from "@/components/knowledge/RetrievalScopeModal";
import { ACCESS_COPY, RETRIEVAL_COPY, accessLabel, retrievalLabel } from "@/components/knowledge/QueryScopeSection";
import { scopeLabel, isDocInScope, isUrlInScope, isFaqInScope, PARTIAL_LINK_ENABLED } from "@/components/knowledge/kbLinkScope";

/**
 * "Xem chi tiết resource ngay trong Instructions" — clicking a Skill / Guardrail / Kho tri thức /
 * Custom Connector row in the Instructions sidebar opens this popup instead of a new tab, so the
 * Builder never leaves the Agent they're configuring.
 *
 * Permissions follow the same rules as the resource detail pages opened from an Agent
 * (see agentContextAccess.tsx): being able to open the Agent puts every resource it uses inside
 * the viewer's scope for this Agent, so the Role decides the rest — "Build" to edit (unless the
 * owner shared it to this person as view-only), and sharing stays with the owner.
 * Edit / share open the existing forms; closing them comes back to this popup.
 */

export type AgentResourceRef =
  | { kind: "skill"; id: string }
  | { kind: "agentSkill"; id: string }
  | { kind: "guardrail"; id: string }
  | { kind: "agentGuardrail"; id: string }
  | { kind: "knowledgeBase"; id: string }
  | { kind: "knowledgeItem"; id: string }
  | { kind: "apiTool"; id: string }
  | { kind: "connector"; id: string };

type Sub = null | "edit" | "share" | "retrieval";

function useCurrentUser(userId: string) {
  const { tree } = useOrg();
  const members = useMemo(() => collectMembers(tree), [tree]);
  const me = members.find(m => m.id === userId);
  return { id: userId, name: me?.name ?? "Tran Nam", email: me?.email ?? "tran.nam@fpt.com" };
}

function sharingLabel(sharing?: { mode: string; people: unknown[] }): string {
  if (sharing?.mode === "specific") return `${sharing.people.length} người`;
  if (sharing?.mode === "all") return "Cả Space";
  return "Chỉ Agent này";
}

function usedByLabel(ids?: string[]): string {
  const n = ids?.length ?? 0;
  if (n === 0) return "Chưa có Agent nào";
  const names = ids!.slice(0, 2).map(id => getAgent(id)?.name ?? id);
  return n <= 2 ? names.join(", ") : `${names.join(", ")} và ${n - 2} Agent khác`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Meta({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-border bg-surface-muted/60 px-4 py-3 text-sm">
      {rows.map(r => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 break-words text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Shell({ typeLabel, name, onClose, onEdit, onShare, shareLabel = ACCESS_COPY.menu, onRetrieval, note, children }: {
  typeLabel: string;
  name: string;
  onClose: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  /** Button label for onShare — Knowledge uses "Quyền truy cập". */
  shareLabel?: string;
  /** Knowledge only: opens the "Quyền truy xuất" popup. */
  onRetrieval?: () => void;
  /** Shown in the footer when the viewer can't edit, so a missing "Sửa" isn't a mystery. */
  note?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Chi tiết ${typeLabel}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ animation: "resDetailIn 0.18s ease" }}>
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Chi tiết {typeLabel}</p>
            <h2 className="font-display text-lg font-semibold break-words">{name}</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-lg hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{children}</div>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border shrink-0 bg-white">
          <p className="text-xs text-muted-foreground min-w-0">{note}</p>
          <div className="flex items-center gap-2 shrink-0">
            {onShare && (
              <button onClick={onShare} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">{shareLabel}</button>
            )}
            {onRetrieval && (
              <button onClick={onRetrieval} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">{RETRIEVAL_COPY.menu}</button>
            )}
            {onEdit ? (
              <button onClick={onEdit} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium transition-base">Sửa</button>
            ) : (
              <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-muted text-sm font-medium transition-base">Đóng</button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes resDetailIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>,
    document.body,
  );
}

const NO_EDIT_ROLE = "Bạn chỉ xem được theo quyền trong Role.";
const VIEW_ONLY_SHARE = "Tài nguyên này chưa được chia sẻ với bạn, bạn chỉ xem được.";

/* ------------------------------- Skill ------------------------------- */

function ConsoleSkillDetail({ agentId, id, onClose, onChanged }: { agentId: string; id: string; onClose: () => void; onChanged: () => void }) {
  const access = useGroupAccess("skills");
  const currentUser = useCurrentUser(access.userId);
  const [sub, setSub] = useState<Sub>(null);
  const [, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChanged(); };
  const skill = skillStore.get(id);
  if (!skill) return null;
  const isOwner = skill.ownerId === access.userId;
  // "View-only" only applies to someone the owner actually shared it with as view — not to
  // Admins or people reaching it through this Agent.
  const direct = isSkillAccessible(skill.sharing, skill.ownerId, access.userId);
  const viewOnly = !isOwner && direct && isSkillViewOnly(skill.sharing, skill.ownerId, access.userId);
  const canEdit = access.canAct("manage", true) && !viewOnly;
  const canShare = isOwner && access.canAct("publish", true);

  if (sub === "edit") return (
    <CreateSkillModal
      onClose={() => setSub(null)}
      onSubmit={(data: SkillFormData) => { skillStore.update(skill.id, data); setSub(null); refresh(); }}
      initialData={skill}
      currentUser={currentUser}
      isDuplicateName={name => skillStore.isDuplicateName(name, skill.id)}
    />
  );
  if (sub === "share") return (
    <SkillShareModal
      open name={skill.name} ownerName={skill.ownerName} sharing={skill.sharing}
      resourceOwnerId={skill.ownerId} attachedAgentIds={skill.attachedByAgentIds} agentOnlyFor={agentOnlyForIn(skill, agentId)}
      onSave={sharing => {
        // In the Agent it came from, turning sharing off takes it back into that Agent.
        saveSharingInAgent("skill", skill, agentId, sharing, s => skillStore.updateSharing(skill.id, s)); refresh(); onChanged();
        if (sharing.mode === "private" && skill.originAgentId === agentId && skill.sharing.mode !== "private") onClose();
      }}
      onClose={() => setSub(null)}
    />
  );
  return (
    <Shell
      typeLabel="skill" name={skill.name} onClose={onClose}
      onEdit={canEdit ? () => setSub("edit") : undefined}
      onShare={canShare ? () => setSub("share") : undefined}
      note={canEdit ? undefined : viewOnly ? VIEW_ONLY_SHARE : NO_EDIT_ROLE}
    >
      <Meta rows={[
        { label: "Người tạo", value: isOwner ? "Bạn" : skill.ownerName },
        ...(isOwner ? [{ label: ACCESS_COPY.menu, value: sharingLabel(skill.sharing) }] : []),
        { label: "Đang dùng trong", value: usedByLabel(skill.attachedByAgentIds) },
      ]} />
      <Field label="Mô tả"><p className="whitespace-pre-wrap">{skill.description || "Chưa có mô tả"}</p></Field>
      <Field label="Nội dung">
        <div className="rounded-xl border border-border bg-surface p-4 max-h-72 overflow-y-auto">{renderSkillBody(skill.body)}</div>
      </Field>
    </Shell>
  );
}

function AgentSkillDetail({ agentId, id, onClose, onChanged }: { agentId: string; id: string; onClose: () => void; onChanged: () => void }) {
  const access = useGroupAccess("skills");
  const currentUser = useCurrentUser(access.userId);
  const [sub, setSub] = useState<Sub>(null);
  const [, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChanged(); };
  const skill = agentSkillStore.get(agentId, id);
  if (!skill) return null;
  const isOwner = skill.ownerId === access.userId;

  if (sub === "edit") return (
    <CreateSkillModal
      onClose={() => setSub(null)}
      onSubmit={(data: SkillFormData) => { agentSkillStore.update(agentId, skill.id, data); setSub(null); refresh(); }}
      initialData={skill}
      currentUser={currentUser}
      isDuplicateName={name => agentSkillStore.list(agentId).some(s => s.id !== skill.id && s.name.trim().toLowerCase() === name.trim().toLowerCase())}
    />
  );
  if (sub === "share") return (
    <SkillShareModal
      open name={skill.name} ownerName={skill.ownerName} sharing={skill.sharing ?? { mode: "private", people: [] }}
      agentOnlyFor={agentId}
      onSave={sharing => {
        // Sharing an Agent-only skill moves it into the Space library (still linked here).
        if (sharing.mode === "private") { agentSkillStore.updateSharing(agentId, skill.id, sharing); refresh(); return; }
        agentSkillStore.promoteToConsole(agentId, skill.id, sharing); onChanged(); onClose();
      }}
      onClose={() => setSub(null)}
    />
  );
  return (
    <Shell
      typeLabel="skill" name={skill.name} onClose={onClose}
      onEdit={() => setSub("edit")}
      onShare={isOwner ? () => setSub("share") : undefined}
    >
      <Meta rows={[
        { label: "Loại", value: "Skill riêng của Agent" },
        { label: "Người tạo", value: isOwner ? "Bạn" : skill.ownerName },
        ...(isOwner ? [{ label: ACCESS_COPY.menu, value: sharingLabel(skill.sharing) }] : []),
      ]} />
      <Field label="Mô tả"><p className="whitespace-pre-wrap">{skill.description || "Chưa có mô tả"}</p></Field>
      <Field label="Nội dung">
        <div className="rounded-xl border border-border bg-surface p-4 max-h-72 overflow-y-auto">{renderSkillBody(skill.body)}</div>
      </Field>
    </Shell>
  );
}

/* ----------------------------- Guardrail ----------------------------- */

function GuardrailBody({ g, meta }: { g: Guardrail; meta: { label: string; value: ReactNode }[] }) {
  return (
    <>
      <Meta rows={meta} />
      <Field label="Mô tả"><p className="whitespace-pre-wrap">{g.desc || "-"}</p></Field>
      <Field label="Phản hồi">
        <span className="inline-flex px-2.5 py-1 rounded-full border border-border bg-surface-muted text-sm">{actionLabelVi(g.action)}</span>
      </Field>
    </>
  );
}

function ConsoleGuardrailDetail({ agentId, id, onClose, onChanged }: { agentId: string; id: string; onClose: () => void; onChanged: () => void }) {
  const access = useGroupAccess("guardrails");
  const currentUser = useCurrentUser(access.userId);
  const [sub, setSub] = useState<Sub>(null);
  const [, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChanged(); };
  const g = guardrailConsoleStore.get(id);
  if (!g) return null;
  const hasOwner = !g.mandatory && !!g.ownerId && !!g.sharing;
  const isOwner = hasOwner && g.ownerId === access.userId;
  const direct = !hasOwner || isGuardrailAccessibleTo(g.sharing!, g.ownerId!, access.userId);
  const viewOnly = hasOwner && !isOwner && direct && isGuardrailViewOnly(g.sharing!, g.ownerId!, access.userId);
  const canEdit = !g.mandatory && access.canAct("manage", true) && !viewOnly;
  const canShare = isOwner && !g.allAgents && access.canAct("publish", true);

  if (sub === "edit") return (
    <CreateGuardrailModal
      onClose={() => setSub(null)}
      onSubmit={data => { guardrailConsoleStore.update(g.id, data); setSub(null); refresh(); }}
      initialData={g}
      currentUser={currentUser}
    />
  );
  if (sub === "share") return (
    <GuardrailShareModal
      open name={g.name} ownerName={g.ownerName ?? currentUser.name} sharing={g.sharing ?? { mode: "all", people: [] }}
      resourceOwnerId={g.ownerId} attachedAgentIds={g.attachedByAgentIds} agentOnlyFor={agentOnlyForIn(g, agentId)}
      onSave={sharing => {
        saveSharingInAgent("guardrail", g, agentId, sharing, s => guardrailConsoleStore.updateSharing(g.id, s)); refresh(); onChanged();
        if (sharing.mode === "private" && g.originAgentId === agentId && g.sharing?.mode !== "private") onClose();
      }}
      onClose={() => setSub(null)}
    />
  );
  return (
    <Shell
      typeLabel="guardrail" name={g.name} onClose={onClose}
      onEdit={canEdit ? () => setSub("edit") : undefined}
      onShare={canShare ? () => setSub("share") : undefined}
      note={canEdit ? undefined : g.mandatory ? "Guardrail bắt buộc của hệ thống, không sửa được." : viewOnly ? VIEW_ONLY_SHARE : NO_EDIT_ROLE}
    >
      <GuardrailBody g={g} meta={[
        { label: "Người tạo", value: !hasOwner ? "Hệ thống" : isOwner ? "Bạn" : g.ownerName },
        ...(isOwner ? [{ label: ACCESS_COPY.menu, value: sharingLabel(g.sharing) }] : []),
        { label: "Đang dùng trong", value: g.allAgents ? "Mọi Agent trong Space" : usedByLabel(g.attachedByAgentIds) },
      ]} />
    </Shell>
  );
}

function AgentGuardrailDetail({ agentId, id, onClose, onChanged }: { agentId: string; id: string; onClose: () => void; onChanged: () => void }) {
  const access = useGroupAccess("guardrails");
  const currentUser = useCurrentUser(access.userId);
  const [sub, setSub] = useState<Sub>(null);
  const [, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChanged(); };
  const g = agentGuardrailStore.get(agentId, id);
  if (!g) return null;
  const isOwner = !!g.ownerId && g.ownerId === access.userId;

  if (sub === "edit") return (
    <CreateGuardrailModal
      onClose={() => setSub(null)}
      onSubmit={data => { agentGuardrailStore.update(agentId, g.id, { ...data, sharing: g.sharing }); setSub(null); refresh(); }}
      initialData={g}
      currentUser={currentUser}
      allowApplyAll={false}
    />
  );
  if (sub === "share") return (
    <GuardrailShareModal
      open name={g.name} ownerName={g.ownerName ?? currentUser.name} sharing={g.sharing ?? { mode: "private", people: [] }}
      agentOnlyFor={agentId}
      onSave={sharing => {
        if (sharing.mode === "private") { agentGuardrailStore.updateSharing(agentId, g.id, sharing); refresh(); return; }
        agentGuardrailStore.promoteToConsole(agentId, g.id, sharing); onChanged(); onClose();
      }}
      onClose={() => setSub(null)}
    />
  );
  return (
    <Shell
      typeLabel="guardrail" name={g.name} onClose={onClose}
      onEdit={() => setSub("edit")}
      onShare={isOwner ? () => setSub("share") : undefined}
    >
      <GuardrailBody g={g} meta={[
        { label: "Loại", value: "Guardrail riêng của Agent" },
        { label: "Người tạo", value: isOwner ? "Bạn" : g.ownerName ?? "-" },
        ...(isOwner ? [{ label: ACCESS_COPY.menu, value: sharingLabel(g.sharing) }] : []),
      ]} />
    </Shell>
  );
}

/* --------------------------- Knowledge base --------------------------- */

function ListPreview<T>({ items, render, empty }: { items: T[]; render: (t: T) => ReactNode; empty: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  const shown = items.slice(0, 5);
  return (
    <ul className="rounded-xl border border-border divide-y divide-border">
      {shown.map((t, i) => <li key={i} className="px-3 py-2 truncate">{render(t)}</li>)}
      {items.length > shown.length && <li className="px-3 py-2 text-muted-foreground">và {items.length - shown.length} mục khác</li>}
    </ul>
  );
}

function KnowledgeBaseDetail({ agentId, id, onClose, onChanged }: { agentId: string; id: string; onClose: () => void; onChanged: () => void }) {
  const access = useGroupAccess("knowledge");
  const [sub, setSub] = useState<Sub>(null);
  const [, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChanged(); };
  const kb = knowledgeBaseStore.get(id);
  if (!kb) return null;
  const isOwner = kb.ownerId === access.userId;
  // "View-only" only applies to someone the owner actually shared it with as view — not to
  // Admins or people reaching it through this Agent.
  const viewOnly = !isOwner && isKbAccessibleTo(kb, access.userId) && isKbViewOnly(kb, access.userId);
  const canEdit = access.canAct("manage", true) && !viewOnly;
  const canShare = isOwner && access.canAct("publish", true);

  if (sub === "edit") return <CreateKnowledgeBaseModal open editingKb={kb} onClose={() => setSub(null)} onCreated={refresh} />;
  if (sub === "retrieval") return (
    <RetrievalScopeModal
      name={kb.name}
      value={kb.querySharing}
      onSave={q => knowledgeBaseStore.updateQuerySharing(kb.id, q)}
      onClose={() => { setSub(null); refresh(); }}
    />
  );
  if (sub === "share") return (
    <ShareKnowledgeBaseModal
      open name={kb.name} ownerName={kb.ownerName} sharing={kb.sharing}
      resourceOwnerId={kb.ownerId} attachedAgentIds={kb.attachedByAgentIds} agentOnlyFor={kb.agentOnlyFor ?? agentOnlyForIn(kb, agentId)}
      onSave={sharing => {
        if (kb.agentOnlyFor) knowledgeBaseStore.updateSharing(kb.id, sharing);
        else saveSharingInAgent("knowledge", kb, agentId, sharing, s => knowledgeBaseStore.updateSharing(kb.id, s));
        onChanged();
      }}
      onClose={() => { setSub(null); refresh(); }}
    />
  );
  // Only what this Agent's link covers ("Toàn bộ kho" or the chosen folders, documents,
  // websites and FAQ categories).
  const linkScope = knowledgeStore.getLinkScope(agentId, kb.id);
  const docs = kb.type === "internal" ? knowledgeDocumentStore.list(kb.id).filter(d => !d.isFolder && isDocInScope(kb.id, linkScope, d.id)) : [];
  const urls = kb.type === "internal" ? knowledgeUrlStore.list(kb.id).filter(u => !u.isFolder && isUrlInScope(kb.id, linkScope, u.id)) : [];
  const faqs = kb.type === "internal" ? knowledgeFaqStore.list(kb.id).filter(f => isFaqInScope(linkScope, f.categories)) : [];
  return (
    <Shell
      typeLabel="kho tri thức" name={kb.name} onClose={onClose}
      onEdit={canEdit ? () => setSub("edit") : undefined}
      onShare={canShare ? () => setSub("share") : undefined}
      shareLabel={ACCESS_COPY.menu}
      onRetrieval={canShare ? () => setSub("retrieval") : undefined}
      note={canEdit ? undefined : viewOnly ? VIEW_ONLY_SHARE : NO_EDIT_ROLE}
    >
      <Meta rows={[
        { label: "Loại", value: kb.type === "external_api" ? "Kết nối kho tri thức ngoài" : "Kho tri thức nội bộ" },
        { label: "Người tạo", value: isOwner ? "Bạn" : kb.ownerName },
        ...(isOwner ? [{ label: ACCESS_COPY.menu, value: accessLabel(kb.sharing.mode, kb.sharing.people.length, "Chỉ Agent này") }] : []),
        { label: RETRIEVAL_COPY.menu, value: retrievalLabel(kb.querySharing) },
        ...(PARTIAL_LINK_ENABLED ? [{ label: "Phạm vi liên kết", value: scopeLabel(kb.id, linkScope).label }] : []),
        { label: "Đang dùng trong", value: usedByLabel(kb.attachedByAgentIds) },
      ]} />
      <Field label="Mô tả"><p className="whitespace-pre-wrap">{kb.description || "Chưa có mô tả"}</p></Field>
      {kb.type === "external_api" ? (
        <Field label="API endpoint"><p className="font-mono text-xs break-all">{kb.apiEndpoint || "-"}</p></Field>
      ) : (
        <>
          <Field label={`Tài liệu (${docs.length})`}><ListPreview items={docs} render={d => d.name} empty={linkScope.mode === "partial" ? "Không có tài liệu trong phạm vi liên kết." : "Chưa có tài liệu."} /></Field>
          <Field label={`Website (${urls.length})`}><ListPreview items={urls} render={u => u.title || u.url || u.name} empty={linkScope.mode === "partial" ? "Không có website trong phạm vi liên kết." : "Chưa có website."} /></Field>
          <Field label={`Câu hỏi thường gặp (${faqs.length})`}><ListPreview items={faqs} render={f => f.question} empty={linkScope.mode === "partial" ? "Không có câu hỏi trong phạm vi liên kết." : "Chưa có câu hỏi."} /></Field>
        </>
      )}
    </Shell>
  );
}

const KIND_LABEL = { doc: "Tài liệu", url: "Website", faq: "Câu hỏi thường gặp" } as const;

function KnowledgeItemDetail({ agentId, id, onClose, onOpenFull, onChanged }: { agentId: string; id: string; onClose: () => void; onOpenFull: () => void; onChanged: () => void }) {
  const [sharing, setSharing] = useState<"access" | "retrieval" | null>(null);
  const item = knowledgeStore.list(agentId).find(i => i.id === id);
  if (!item) return null;
  if (sharing) return <ShareAgentItemModal agentId={agentId} items={[item]} section={sharing} onClose={() => { setSharing(null); onChanged(); }} />;
  return (
    <Shell typeLabel={KIND_LABEL[item.kind].toLowerCase()} name={item.name} onClose={onClose} onEdit={onOpenFull} onShare={() => setSharing("access")} onRetrieval={() => setSharing("retrieval")}>
      <Meta rows={[
        { label: "Loại", value: `${KIND_LABEL[item.kind]} riêng của Agent` },
        { label: ACCESS_COPY.menu, value: "Chỉ Agent này" },
        { label: RETRIEVAL_COPY.menu, value: retrievalLabel(item.querySharing) },
        ...(item.chunkCount != null ? [{ label: "Số đoạn", value: String(item.chunkCount) }] : []),
      ]} />
      {item.title && <Field label={item.kind === "faq" ? "Câu hỏi" : "Tiêu đề"}><p className="whitespace-pre-wrap">{item.title}</p></Field>}
      <Field label={item.kind === "faq" ? "Câu trả lời" : "Mô tả"}><p className="whitespace-pre-wrap">{item.description || "-"}</p></Field>
    </Shell>
  );
}

/* ------------------------------ Connector ----------------------------- */

function ConnectorDetail({ agentId, id, onClose, onChanged }: { agentId: string; id: string; onClose: () => void; onChanged: () => void }) {
  const access = useGroupAccess("connectors");
  const [sub, setSub] = useState<Sub>(null);
  const [, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChanged(); };
  const c = customConnectorStore.get(id);
  if (!c) return null;
  const isOwner = c.ownerId === access.userId;
  const viewOnly = !isOwner && isConnectorAccessible(c.sharing, c.ownerId, access.userId) && isConnectorViewOnly(c.sharing, c.ownerId, access.userId);
  const canEdit = access.canAct("manage", true) && !viewOnly;
  const canShare = isOwner && access.canAct("publish", true);

  if (sub === "edit") return <AddCustomConnectorModal editing={c} onClose={() => setSub(null)} onUpdated={() => { setSub(null); refresh(); }} />;
  if (sub === "share") return (
    <CustomConnectorShareModal
      open name={c.name} ownerName={c.ownerName} sharing={c.sharing}
      resourceOwnerId={c.ownerId} attachedAgentIds={c.attachedByAgentIds} agentOnlyFor={agentOnlyForIn(c, agentId)}
      onSave={sharing => { saveSharingInAgent("connector", c, agentId, sharing, s => customConnectorStore.updateSharing(c.id, s)); refresh(); onChanged(); }}
      onClose={() => setSub(null)}
    />
  );
  return (
    <Shell
      typeLabel="custom connector" name={c.name} onClose={onClose}
      onEdit={canEdit ? () => setSub("edit") : undefined}
      onShare={canShare ? () => setSub("share") : undefined}
      note={canEdit ? undefined : viewOnly ? VIEW_ONLY_SHARE : NO_EDIT_ROLE}
    >
      <Meta rows={[
        { label: "Người tạo", value: isOwner ? "Bạn" : c.ownerName },
        ...(isOwner ? [{ label: ACCESS_COPY.menu, value: sharingLabel(c.sharing) }] : []),
        { label: "Đang dùng trong", value: usedByLabel(c.attachedByAgentIds) },
      ]} />
      <Field label="URL"><p className="font-mono text-xs break-all">{c.url}</p></Field>
      <Field label="Xác thực">{c.authType === "static_headers" ? `Static Headers (${c.headers.length} header)` : "Không xác thực"}</Field>
    </Shell>
  );
}

function ApiToolDetail({ agentId, id, onClose, onChanged }: { agentId: string; id: string; onClose: () => void; onChanged: () => void }) {
  const access = useGroupAccess("connectors");
  const [sub, setSub] = useState<Sub>(null);
  const [, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onChanged(); };
  const a = customApiToolStore.get(id);
  if (!a) return null;
  const isOwner = a.ownerId === access.userId;
  const viewOnly = !isOwner && isConnectorAccessible(a.sharing, a.ownerId, access.userId) && isConnectorViewOnly(a.sharing, a.ownerId, access.userId);
  const canEdit = access.canAct("manage", true) && !viewOnly;
  const canShare = isOwner && access.canAct("publish", true);

  if (sub === "edit") return <AddCustomApiToolModal editing={a} onClose={() => setSub(null)} onUpdated={() => { setSub(null); refresh(); }} />;
  if (sub === "share") return (
    <CustomConnectorShareModal
      open noun="API Tool" name={a.name} ownerName={a.ownerName} sharing={a.sharing}
      resourceOwnerId={a.ownerId} attachedAgentIds={a.attachedByAgentIds} agentOnlyFor={agentOnlyForIn(a, agentId)}
      onSave={sharing => { saveSharingInAgent("apiTool", a, agentId, sharing, s => customApiToolStore.updateSharing(a.id, s)); refresh(); onChanged(); }}
      onClose={() => setSub(null)}
    />
  );
  return (
    <Shell
      typeLabel="API Tool" name={a.name} onClose={onClose}
      onEdit={canEdit ? () => setSub("edit") : undefined}
      onShare={canShare ? () => setSub("share") : undefined}
      note={canEdit ? undefined : viewOnly ? VIEW_ONLY_SHARE : NO_EDIT_ROLE}
    >
      <Meta rows={[
        { label: "Người tạo", value: isOwner ? "Bạn" : a.ownerName },
        ...(isOwner ? [{ label: ACCESS_COPY.menu, value: sharingLabel(a.sharing) }] : []),
        { label: "Đang dùng trong", value: usedByLabel(a.attachedByAgentIds) },
      ]} />
      <Field label="Mô tả"><p className="whitespace-pre-wrap">{a.description || "Chưa có mô tả"}</p></Field>
      <Field label="Endpoint"><p className="font-mono text-xs break-all"><span className="font-semibold">{a.method}</span> {a.url}</p></Field>
      <Field label="Xác thực">{AUTH_TYPE_LABEL[a.auth.type]}</Field>
      <Field label="Tham số">{a.params.length ? a.params.map(p => `${p.name}${p.required ? " *" : ""}`).join(", ") : "Không có"}</Field>
      <Field label="Timeout">{a.timeoutSec} giây</Field>
    </Shell>
  );
}

/* ------------------------------- Entry -------------------------------- */

export default function AgentResourceDetailModal({ agentId, target, onClose, onChanged, onOpenKnowledge }: {
  agentId: string;
  target: AgentResourceRef;
  onClose: () => void;
  /** Called after an edit/share so the sidebar row (name, chip) re-renders. */
  onChanged?: () => void;
  /** Agent-own knowledge items are edited on the Agent's full "Tri thức" screen. */
  onOpenKnowledge?: () => void;
}) {
  const changed = onChanged ?? (() => {});
  switch (target.kind) {
    case "skill": return <ConsoleSkillDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} />;
    case "agentSkill": return <AgentSkillDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} />;
    case "guardrail": return <ConsoleGuardrailDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} />;
    case "agentGuardrail": return <AgentGuardrailDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} />;
    case "knowledgeBase": return <KnowledgeBaseDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} />;
    case "knowledgeItem": return <KnowledgeItemDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} onOpenFull={() => { onClose(); onOpenKnowledge?.(); }} />;
    case "apiTool": return <ApiToolDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} />;
    case "connector": return <ConnectorDetail agentId={agentId} id={target.id} onClose={onClose} onChanged={changed} />;
  }
}

/** Read-only detail for a platform ("Hệ thống") resource — built-in skills, mandatory
 * guardrails… Opened from the Space libraries; nothing to edit or share. */
export function SystemResourceDetailModal({ typeLabel, name, description, usedBy = "Mọi Agent trong Space", onClose }: {
  typeLabel: string;
  name: string;
  description?: string;
  usedBy?: string;
  onClose: () => void;
}) {
  return (
    <Shell typeLabel={typeLabel} name={name} onClose={onClose} note="Resource hệ thống do FPT AI Agents cung cấp, không sửa hay chia sẻ được.">
      <Meta rows={[
        { label: "Loại", value: "Hệ thống" },
        { label: "Người tạo", value: "FPT AI Agents" },
        { label: "Đang dùng trong", value: usedBy },
      ]} />
      <Field label="Mô tả"><p className="whitespace-pre-wrap">{description || "Chưa có mô tả"}</p></Field>
    </Shell>
  );
}
