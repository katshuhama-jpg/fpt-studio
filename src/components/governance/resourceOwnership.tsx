import type { KeyboardEvent, ReactNode } from "react";
import { EyeOff, Info, ShieldCheck, User, Users } from "lucide-react";

/**
 * Ownership tags + the shared "Phương án A" resource card used by every Space resource library
 * (Skills, Kho tri thức, Custom Connectors) and the Guardrails table.
 *
 * Tags describe a resource from the viewer's point of view, and a card can carry more than one:
 *   - "Của tôi"      — the viewer created it.
 *   - "Được chia sẻ" — it is shared (to the whole Space or to specific people). On the viewer's
 *                      own resource that means they shared it out; on someone else's it's why the
 *                      viewer can see it. So "Của tôi" + "Được chia sẻ" together is normal.
 *   - "Hệ thống"     — shipped by the platform (built-in skills, mandatory guardrails, internal
 *                      connector templates); never owned by a person, never combined.
 * The Space library is the company's shared place: it lists only what is shared (to the whole
 * Space or to specific people) plus the platform's own items. Something kept for one Agent
 * ("Chỉ Agent này") lives in that Agent, not here. Tabs filter by sharing, not by creator:
 *   - "Tôi chia sẻ"     — the viewer created it and shared it.
 *   - "Chia sẻ với tôi" — someone else shared it with the whole Space or with the viewer.
 * "Của tôi" keeps meaning "the viewer created it" (card chips, inside an Agent).
 */

/** "withMe" is filter-only (shared by someone else to the Space or to the viewer) - no chip. */
export type OwnershipTag = "mine" | "shared" | "system" | "withMe";
export type OwnershipTab = "all" | "mine" | "shared" | "system";

type SharingLike = { mode: string; people?: unknown[] } | undefined;

export function isShared(sharing: SharingLike): boolean {
  if (!sharing) return false;
  if (sharing.mode === "all") return true;
  return sharing.mode === "specific" && (sharing.people?.length ?? 0) > 0;
}

export function ownershipTags({ system, ownerId, sharing, userId }: {
  system?: boolean; ownerId?: string; sharing?: SharingLike; userId: string;
}): OwnershipTag[] {
  if (system) return ["system"];
  const tags: OwnershipTag[] = [];
  const mine = !!ownerId && ownerId === userId;
  if (mine) tags.push("mine");
  if (isShared(sharing)) {
    tags.push("shared");
    const people = (sharing?.people ?? []) as { userId?: string }[];
    if (!mine && (sharing?.mode === "all" || people.some(p => p?.userId === userId))) tags.push("withMe");
  }
  return tags;
}

/** A card/row's ownership tag already answers "who created this" for these two cases
 * ("Của tôi" = you did, "Hệ thống" = the platform did) — showing "Người tạo: ..." underneath
 * just repeats it. Only when a resource is someone else's shared item (tags = ["shared"]) does
 * a creator line carry real information (their name). */
export function isCreatorRedundant(tags: OwnershipTag[]): boolean {
  return tags.includes("mine") || tags.includes("system");
}

export const OWNERSHIP_TABS: { key: OwnershipTab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "mine", label: "Tôi chia sẻ" },
  { key: "shared", label: "Chia sẻ với tôi" },
  { key: "system", label: "Hệ thống" },
];

/** In the Space library at all: shared, or shipped by the platform. */
function inSpace(tags: OwnershipTag[]): boolean {
  return tags.includes("shared") || tags.includes("system");
}

export function matchesTab(tags: OwnershipTag[], tab: OwnershipTab): boolean {
  // The owner's own resource with "Chia sẻ lên Space" turned off: only its owner sees it, under
  // "Tất cả" (chip "Của tôi" without "Đã chia sẻ"), so it can be shared again.
  if (tags.length === 1 && tags[0] === "mine") return tab === "all";
  if (!inSpace(tags)) return false;
  if (tab === "all") return true;
  if (tab === "mine") return tags.includes("mine") && tags.includes("shared");
  if (tab === "shared") return !tags.includes("mine") && tags.includes("shared");
  return tags.includes("system");
}

export function countByTab<T>(items: T[], tagsOf: (t: T) => OwnershipTag[]): Record<OwnershipTab, number> {
  const c: Record<OwnershipTab, number> = { all: 0, mine: 0, shared: 0, system: 0 };
  for (const it of items) {
    const tags = tagsOf(it);
    for (const tab of ["all", "mine", "shared", "system"] as OwnershipTab[]) if (matchesTab(tags, tab)) c[tab] += 1;
  }
  return c;
}

/** Empty-state copy per tab. `noun` is lower case, e.g. "skill", "kho tri thức". */
export function ownershipEmptyCopy(tab: OwnershipTab, noun: string): { title: string; body: string } | null {
  if (tab === "mine") return {
    title: `Bạn chưa chia sẻ ${noun} nào lên Space`,
    body: `${cap(noun)} bạn tạo trong Agent mặc định chỉ Agent đó dùng. Mở "Ai được dùng" của ${noun} để chia sẻ cho cả Space.`,
  };
  if (tab === "shared") return {
    title: `Chưa có ai chia sẻ ${noun} cho bạn`,
    body: `${cap(noun)} người khác chia sẻ cho cả Space hoặc cho riêng bạn sẽ hiện ở đây.`,
  };
  return null;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TAG_META: Partial<Record<OwnershipTag, { label: string; icon: typeof User; cls: string }>> = {
  mine: { label: "Của tôi", icon: User, cls: "bg-primary-soft text-primary-strong" },
  shared: { label: "Đã chia sẻ", icon: Users, cls: "bg-[hsl(var(--success-soft))] text-[hsl(var(--success-strong))]" },
  system: { label: "Hệ thống", icon: ShieldCheck, cls: "bg-surface-sunken text-foreground/75" },
};

export function OwnershipTagList({ tags, className = "" }: { tags: OwnershipTag[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Owner's own resource with "Chia sẻ lên Space" off - only they see it in the library. */}
      {tags.length === 1 && tags[0] === "mine" && (
        <span className="order-last inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-xs font-medium leading-none whitespace-nowrap bg-surface-sunken text-muted-foreground">
          <EyeOff size={12} aria-hidden /> Chưa chia sẻ
        </span>
      )}
      {tags.filter(t => TAG_META[t]).map(t => {
        const m = TAG_META[t]!;
        const Icon = m.icon;
        return (
          <span key={t} className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-xs font-medium leading-none whitespace-nowrap ${m.cls}`}>
            <Icon size={12} aria-hidden /> {m.label}
          </span>
        );
      })}
    </div>
  );
}

/** Tab bar shared by the libraries — same look as the old Tất cả/Của tôi/Được chia sẻ tabs. */
export function OwnershipTabs({ tab, onChange, counts, noun }: {
  tab: OwnershipTab; onChange: (t: OwnershipTab) => void; counts: Record<OwnershipTab, number>;
  /** Lower-case resource noun for the "Tôi chia sẻ" hint, e.g. "skill", "kho tri thức". */
  noun?: string;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
    <div className="flex items-center gap-1 flex-wrap" role="tablist">
      {OWNERSHIP_TABS.map(t => (
        <button
          key={t.key}
          role="tab"
          aria-selected={tab === t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 h-8 rounded-lg text-sm font-medium transition-base flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
    {tab === "mine" && noun && (
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
        <Info size={13} className="shrink-0 mt-0.5" aria-hidden />
        <span>{cap(noun)} bạn đã chia sẻ lên Space. {cap(noun)} chỉ dùng trong một Agent không hiện ở đây.</span>
      </p>
    )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar + "Người tạo: X". `displayName` is what's printed ("Bạn" for the viewer), `fullName`
 * feeds the initials. System resources get a shield instead of initials. */
export function CreatorLabel({ displayName, fullName, system }: { displayName: string; fullName?: string; system?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold ${system ? "bg-surface-sunken text-foreground/70" : "bg-primary-soft text-primary-strong"}`} aria-hidden>
        {system ? <ShieldCheck size={12} /> : initials(fullName ?? displayName)}
      </span>
      <span className="truncate"><span className="text-muted-foreground">Người tạo:</span> {displayName}</span>
    </span>
  );
}

/** Avatar + name for the resource-card footer — no "Người tạo:" label, since sitting next to
 * the ownership Tag on the same line already gives it enough context. Bigger and legible
 * (not bold) so it doesn't get lost next to the Tag pill. Truncates with an ellipsis instead
 * of wrapping so the footer always stays on one line. */
export function CardCreator({ displayName, fullName, system }: { displayName: string; fullName?: string; system?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0" title={displayName}>
      <span className={`w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold ${system ? "bg-surface-sunken text-foreground/70" : "bg-primary-soft text-primary-strong"}`} aria-hidden>
        {system ? <ShieldCheck size={11} /> : initials(fullName ?? displayName)}
      </span>
      <span className="truncate text-[12.5px] font-medium text-foreground">{displayName}</span>
    </span>
  );
}

/** Agent-usage count is no longer shown on resource cards (moved to the detail popup) —
 * kept as a no-op so call sites don't need to change if it comes back. */
export function AgentCount(_: { count: number; all?: boolean }) {
  return null;
}

/** "Phương án A" card: icon · name · ⋮ / description / Tag ··· avatar + tên người tạo.
 * Header is icon + name only (one line, nothing else) so it never shifts depending on what's
 * below. The footer always has the ownership Tag (every resource has at least one) plus the
 * creator — when worth showing — on the same single line, so the footer is never empty and
 * never wraps to a second line. Height is fixed so every card in the grid lines up, whatever
 * the number of tags or the length of the description/creator name. */
export function ResourceCard({ icon, name, nameNode, tags, menu, description, singleLineDescription, creator, extra, onOpen, highlighted }: {
  icon: ReactNode;
  name: string;
  /** Optional replacement for the plain name (e.g. a Link) — `name` still labels the card. */
  nameNode?: ReactNode;
  tags: OwnershipTag[];
  menu?: ReactNode;
  description?: string;
  /** Show the description on one line with an ellipsis (URLs, identifiers) instead of wrapping
   * it mid-word over two lines. */
  singleLineDescription?: boolean;
  creator: ReactNode;
  /** @deprecated Agent-usage count is no longer shown on cards — kept so call sites building
   * it (e.g. via `AgentCount`) don't need to change; the value is accepted and ignored. */
  agents?: ReactNode;
  /** Extra line under the description (status badges, URL…). */
  extra?: ReactNode;
  onOpen?: () => void;
  highlighted?: boolean;
}) {
  const interactive = !!onOpen;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Mở ${name}` : undefined}
      onClick={onOpen}
      onKeyDown={interactive ? ((e: KeyboardEvent) => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen!(); }) : undefined}
      className={`group rounded-xl border bg-surface p-4 flex flex-col h-[204px] overflow-hidden transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        highlighted ? "border-primary/30" : "border-border"
      } ${interactive ? "cursor-pointer hover:border-primary/30 hover:shadow-elev" : ""}`}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug truncate" title={name}>{nameNode ?? name}</div>
        </div>
        {menu && <div className="shrink-0 -mr-1 -mt-1" onClick={e => e.stopPropagation()}>{menu}</div>}
      </div>
      {/* Always reserves two lines, so whatever sits below (e.g. "Cập nhật …") starts at the
        * same height on every card whether the description is one line or two. */}
      <p
        title={singleLineDescription ? description : undefined}
        className={`text-xs text-muted-foreground leading-relaxed mt-3 min-h-[3.25em] ${singleLineDescription ? "truncate" : "line-clamp-2 [overflow-wrap:anywhere]"}`}
      >
        {description || <span className="italic">Chưa có mô tả</span>}
      </p>
      {extra && <div className="mt-2 overflow-hidden">{extra}</div>}
      <div className="mt-auto pt-3">
        <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-foreground">
          <OwnershipTagList tags={tags} className="shrink-0 flex-nowrap" />
          {!isCreatorRedundant(tags) && <div className="min-w-0 flex-1 flex justify-end">{creator}</div>}
        </div>
      </div>
    </div>
  );
}

/** Icon tile used on the cards; system resources get the neutral tint. */
export function ResourceIconTile({ children, system }: { children: ReactNode; system?: boolean }) {
  return (
    <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${system ? "bg-surface-sunken text-foreground/70" : "bg-primary-soft text-primary"}`} aria-hidden>
      {children}
    </span>
  );
}
