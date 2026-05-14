import { useState } from "react";
import {
  FileText, MessageSquareText, MousePointerClick, Image as ImageIcon, Sparkles,
  Plus, Trash2, GripVertical, Copy,
} from "lucide-react";
import {
  chatOptimizationStore,
  type ChatOptimizationSettings,
  type ReferenceFormat,
  type FollowupSource,
  type CardBindingField,
} from "./chatOptimizationStore";
import { toast } from "sonner";

type SubTab = "ref" | "opener" | "buttons" | "rich" | "followup";

const TABS: { id: SubTab; label: string; icon: any; desc: string }[] = [
  { id: "ref",      label: "References",       icon: FileText,            desc: "Show citations with each answer." },
  { id: "opener",   label: "Conversation opener", icon: MessageSquareText, desc: "Greeting and starter questions." },
  { id: "buttons",  label: "Quick-reply",      icon: MousePointerClick,   desc: "Pre-defined response buttons." },
  { id: "rich",     label: "Rich response",    icon: ImageIcon,           desc: "Images, cards, and multi-media." },
  { id: "followup", label: "Follow-up",        icon: Sparkles,            desc: "Suggested next questions." },
];

export default function ChatOptimizationTab({ agentId }: { agentId: string }) {
  const [tab, setTab] = useState<SubTab>("ref");
  const [settings, setSettings] = useState<ChatOptimizationSettings>(() => chatOptimizationStore.get(agentId));

  const update = (patch: Partial<ChatOptimizationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    chatOptimizationStore.set(agentId, next);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-up">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold">Chat optimization</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tune how the agent presents responses — citations, openers, buttons, rich media, and follow-ups.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 text-sm font-medium whitespace-nowrap transition-base ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 items-start">
        <div className="rounded-xl bg-surface border border-border p-6">
          {tab === "ref" && <ReferencesPanel settings={settings} update={update} />}
          {tab === "opener" && <OpenerPanel settings={settings} update={update} />}
          {tab === "buttons" && <ButtonsPanel settings={settings} update={update} />}
          {tab === "rich" && <RichPanel settings={settings} update={update} />}
          {tab === "followup" && <FollowupPanel settings={settings} update={update} />}
        </div>

        <PreviewPanel settings={settings} tab={tab} />
      </div>
    </div>
  );
}

/* ============= REFERENCES ============= */
function ReferencesPanel({ settings, update }: { settings: ChatOptimizationSettings; update: (p: Partial<ChatOptimizationSettings>) => void }) {
  const r = settings.references;
  const set = (patch: Partial<typeof r>) => update({ references: { ...r, ...patch } });
  return (
    <Section
      icon={FileText}
      title="Agent response referencing"
      desc="When enabled, the agent appends source citations next to each answer."
    >
      <RowToggle
        label="Show references"
        description="Append a citation list after every answer."
        on={r.enabled}
        onChange={() => set({ enabled: !r.enabled })}
      />

      <Field label="Display format">
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "inline" as ReferenceFormat, label: "Inline", desc: "[1] [2] in text" },
            { v: "footer" as ReferenceFormat, label: "Footer list", desc: "Numbered list below" },
            { v: "card" as ReferenceFormat, label: "Source card", desc: "Visual cards" },
          ]).map(o => (
            <button
              key={o.v}
              disabled={!r.enabled}
              onClick={() => set({ format: o.v })}
              className={`p-3 rounded-lg border text-left transition-base disabled:opacity-50 ${
                r.format === o.v ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <div className={`text-xs font-medium ${r.format === o.v ? "text-primary" : ""}`}>{o.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{o.desc}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label={`Max references per response (${r.maxReferences})`}>
        <input
          type="range"
          min={1}
          max={10}
          value={r.maxReferences}
          disabled={!r.enabled}
          onChange={e => set({ maxReferences: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </Field>

      <RowToggle
        label="Allow per-task override"
        description="Each task can override the global format in its Answer/End node."
        on={r.perTaskOverride}
        onChange={() => set({ perTaskOverride: !r.perTaskOverride })}
      />
    </Section>
  );
}

/* ============= OPENER ============= */
function OpenerPanel({ settings, update }: { settings: ChatOptimizationSettings; update: (p: Partial<ChatOptimizationSettings>) => void }) {
  const o = settings.opener;
  const set = (patch: Partial<typeof o>) => update({ opener: { ...o, ...patch } });
  return (
    <Section icon={MessageSquareText} title="Conversation opener" desc="The first message the user sees + suggested questions.">
      <Field label="Greeting message">
        <textarea
          value={o.greeting}
          rows={3}
          onChange={e => set({ greeting: e.target.value })}
          placeholder="Hi! How can I help you today?"
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none resize-none focus:border-primary transition-base"
        />
      </Field>

      <Field label="Avatar URL (optional)">
        <input
          value={o.avatarUrl}
          onChange={e => set({ avatarUrl: e.target.value })}
          placeholder="https://…/avatar.png"
          className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
        />
      </Field>

      <Field label="Suggested opening questions">
        <div className="space-y-2">
          {o.questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted">
              <span className="text-[10px] font-mono text-muted-foreground w-6">#{i + 1}</span>
              <input
                value={q}
                onChange={e => {
                  const next = [...o.questions];
                  next[i] = e.target.value;
                  set({ questions: next });
                }}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                onClick={() => set({ questions: o.questions.filter((_, idx) => idx !== i) })}
                className="text-muted-foreground hover:text-destructive transition-base"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => set({ questions: [...o.questions, "New question"] })}
            className="btn-ghost"
          >
            <Plus size={11} /> Add question
          </button>
        </div>
      </Field>
    </Section>
  );
}

/* ============= QUICK-REPLY BUTTONS ============= */
function ButtonsPanel({ settings, update }: { settings: ChatOptimizationSettings; update: (p: Partial<ChatOptimizationSettings>) => void }) {
  const b = settings.quickReplies;
  const set = (patch: Partial<typeof b>) => update({ quickReplies: { ...b, ...patch } });
  return (
    <Section
      icon={MousePointerClick}
      title="Quick-reply buttons"
      desc="Tappable shortcuts shown after the agent's reply."
    >
      <RowToggle
        label="Enable quick-reply buttons"
        description="Render buttons under selected agent messages."
        on={b.enabled}
        onChange={() => set({ enabled: !b.enabled })}
      />

      <Field label="Button presets">
        <div className="space-y-2">
          {b.buttons.map(btn => (
            <div key={btn.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-surface">
              <GripVertical size={14} className="text-muted-foreground shrink-0" />
              <input
                value={btn.label}
                disabled={!b.enabled}
                onChange={e => set({ buttons: b.buttons.map(x => x.id === btn.id ? { ...x, label: e.target.value } : x) })}
                placeholder="Button label"
                className="w-40 h-8 px-2 rounded border border-border bg-surface-muted text-xs outline-none focus:border-primary transition-base"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <input
                value={btn.payload}
                disabled={!b.enabled}
                onChange={e => set({ buttons: b.buttons.map(x => x.id === btn.id ? { ...x, payload: e.target.value } : x) })}
                placeholder="Payload sent (text or /command)"
                className="flex-1 h-8 px-2 rounded border border-border bg-surface-muted text-xs font-mono outline-none focus:border-primary transition-base"
              />
              <button
                onClick={() => set({ buttons: b.buttons.filter(x => x.id !== btn.id) })}
                className="text-muted-foreground hover:text-destructive transition-base p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            disabled={!b.enabled}
            onClick={() => set({ buttons: [...b.buttons, { id: `qr-${Date.now()}`, label: "New button", payload: "" }] })}
            className="btn-ghost disabled:opacity-50"
          >
            <Plus size={11} /> Add button
          </button>
        </div>
      </Field>
    </Section>
  );
}

/* ============= RICH RESPONSE ============= */
function RichPanel({ settings, update }: { settings: ChatOptimizationSettings; update: (p: Partial<ChatOptimizationSettings>) => void }) {
  const r = settings.rich;
  const set = (patch: Partial<typeof r>) => update({ rich: { ...r, ...patch } });
  return (
    <Section icon={ImageIcon} title="Rich response" desc="Render multi-media: images, cards, and data-bound templates.">
      <RowToggle
        label="Enable rich response"
        description="Allow the agent to send images, cards, and rich layouts."
        on={r.enabled}
        onChange={() => set({ enabled: !r.enabled })}
      />
      <RowToggle
        label="Image from document"
        description="The agent may extract images from PDFs/docs in Knowledge to include in answers."
        on={r.imageFromDocument}
        onChange={() => set({ imageFromDocument: !r.imageFromDocument })}
      />

      <Field label="Card data binding">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr,1.4fr,90px,32px] gap-2 px-3 py-2 bg-surface-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Field</div><div>Source / Value</div><div>Type</div><div></div>
          </div>
          {r.cardBindings.map(c => (
            <CardBindingRow
              key={c.id}
              row={c}
              disabled={!r.enabled}
              onChange={(next) => set({ cardBindings: r.cardBindings.map(x => x.id === c.id ? next : x) })}
              onRemove={() => set({ cardBindings: r.cardBindings.filter(x => x.id !== c.id) })}
            />
          ))}
          <div className="px-3 py-2 border-t border-border">
            <button
              disabled={!r.enabled}
              onClick={() => set({
                cardBindings: [...r.cardBindings, { id: `b-${Date.now()}`, field: "field", source: "", type: "text" }],
              })}
              className="btn-ghost disabled:opacity-50"
            >
              <Plus size={11} /> Add binding
            </button>
          </div>
        </div>
      </Field>
    </Section>
  );
}

function CardBindingRow({
  row, disabled, onChange, onRemove,
}: {
  row: CardBindingField;
  disabled: boolean;
  onChange: (next: CardBindingField) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr,1.4fr,90px,32px] gap-2 px-3 py-2 border-t border-border items-center">
      <input
        value={row.field}
        disabled={disabled}
        onChange={e => onChange({ ...row, field: e.target.value })}
        className="h-8 px-2 rounded border border-border bg-surface text-xs outline-none focus:border-primary transition-base"
      />
      <input
        value={row.source}
        disabled={disabled}
        placeholder="$.path or static value"
        onChange={e => onChange({ ...row, source: e.target.value })}
        className="h-8 px-2 rounded border border-border bg-surface text-xs font-mono outline-none focus:border-primary transition-base"
      />
      <select
        value={row.type}
        disabled={disabled}
        onChange={e => onChange({ ...row, type: e.target.value as CardBindingField["type"] })}
        className="h-8 px-2 rounded border border-border bg-surface text-xs outline-none focus:border-primary transition-base"
      >
        <option value="text">Text</option>
        <option value="image">Image</option>
        <option value="button">Button</option>
        <option value="url">URL</option>
      </select>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-base p-1 flex justify-center"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

/* ============= FOLLOW-UP ============= */
function FollowupPanel({ settings, update }: { settings: ChatOptimizationSettings; update: (p: Partial<ChatOptimizationSettings>) => void }) {
  const f = settings.followup;
  const set = (patch: Partial<typeof f>) => update({ followup: { ...f, ...patch } });
  return (
    <Section
      icon={Sparkles}
      title="Follow-up question suggestion"
      desc="After each agent reply, surface 1-5 suggested next questions."
    >
      <RowToggle
        label="Enable follow-up suggestions"
        description="Show suggested questions under every agent reply."
        on={f.enabled}
        onChange={() => set({ enabled: !f.enabled })}
      />

      <Field label={`Number of suggestions (${f.count})`}>
        <input
          type="range"
          min={1}
          max={5}
          value={f.count}
          disabled={!f.enabled}
          onChange={e => set({ count: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </Field>

      <Field label="Source">
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: "llm" as FollowupSource, label: "LLM-generated", desc: "Generated dynamically per turn" },
            { v: "manual" as FollowupSource, label: "Manual list", desc: "Use a fixed pool below" },
          ]).map(o => (
            <button
              key={o.v}
              disabled={!f.enabled}
              onClick={() => set({ source: o.v })}
              className={`p-3 rounded-lg border text-left transition-base disabled:opacity-50 ${
                f.source === o.v ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <div className={`text-xs font-medium ${f.source === o.v ? "text-primary" : ""}`}>{o.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{o.desc}</div>
            </button>
          ))}
        </div>
      </Field>

      {f.source === "manual" && (
        <Field label="Manual question pool">
          <div className="space-y-2">
            {f.manualList.map((q, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-muted">
                <span className="text-[10px] font-mono text-muted-foreground w-6">#{i + 1}</span>
                <input
                  value={q}
                  onChange={e => {
                    const next = [...f.manualList];
                    next[i] = e.target.value;
                    set({ manualList: next });
                  }}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  onClick={() => set({ manualList: f.manualList.filter((_, idx) => idx !== i) })}
                  className="text-muted-foreground hover:text-destructive transition-base"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button onClick={() => set({ manualList: [...f.manualList, "New question"] })} className="btn-ghost">
              <Plus size={11} /> Add question
            </button>
          </div>
        </Field>
      )}
    </Section>
  );
}

/* ============= PREVIEW ============= */
function PreviewPanel({ settings, tab }: { settings: ChatOptimizationSettings; tab: SubTab }) {
  return (
    <aside className="rounded-xl border border-border bg-surface-muted/40 p-4 sticky top-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</div>
        <span className="flex items-center gap-1 text-[10px] text-success font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" /> LIVE
        </span>
      </div>

      <div className="rounded-2xl bg-surface border border-border-strong shadow-elev overflow-hidden">
        <div className="h-9 bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-semibold">
          Banking ABC
        </div>
        <div className="p-3 space-y-2 bg-gradient-soft min-h-[280px] max-h-[420px] overflow-y-auto">
          {tab === "opener" ? (
            <>
              <Bubble side="agent">{settings.opener.greeting || "Hi! How can I help?"}</Bubble>
              <div className="flex flex-wrap gap-1 pt-1">
                {settings.opener.questions.slice(0, 4).map((q, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">
                    {q}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <Bubble side="user">How do I lock my card?</Bubble>
              <Bubble side="agent">
                Sure — verify your phone number first, then I'll lock the card for you.
                {settings.references.enabled && settings.references.format === "inline" && (
                  <sup className="text-primary ml-0.5">[1][2]</sup>
                )}
              </Bubble>

              {tab === "rich" && settings.rich.enabled && (
                <div className="rounded-lg border border-border bg-surface overflow-hidden ml-6">
                  <div className="h-16 bg-gradient-brand" />
                  <div className="p-2">
                    <div className="text-[11px] font-semibold">Premium Visa Card</div>
                    <div className="text-[10px] text-muted-foreground">Secure your card in 1 tap</div>
                    <button className="mt-1.5 text-[10px] px-2 py-1 rounded bg-primary text-primary-foreground">Apply now</button>
                  </div>
                </div>
              )}

              {tab === "buttons" && settings.quickReplies.enabled && (
                <div className="flex flex-wrap gap-1 ml-6">
                  {settings.quickReplies.buttons.slice(0, 4).map(btn => (
                    <span key={btn.id} className="text-[10px] px-2 py-1 rounded-full bg-primary-soft text-primary border border-primary/30">
                      {btn.label || "—"}
                    </span>
                  ))}
                </div>
              )}

              {tab === "ref" && settings.references.enabled && settings.references.format === "footer" && (
                <div className="ml-6 mt-1 text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2">
                  <div>[1] Card lock procedure — Customer FAQ</div>
                  <div>[2] Internal Policy v3 — sec. 4.2</div>
                </div>
              )}

              {tab === "ref" && settings.references.enabled && settings.references.format === "card" && (
                <div className="ml-6 grid grid-cols-2 gap-1.5">
                  {[1, 2].map(i => (
                    <div key={i} className="rounded-md border border-border bg-surface p-1.5">
                      <div className="text-[9px] text-muted-foreground">Source {i}</div>
                      <div className="text-[10px] font-medium truncate">Customer FAQ</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "followup" && settings.followup.enabled && (
                <div className="ml-6 space-y-1 mt-1">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">You might also ask</div>
                  {(settings.followup.source === "manual" ? settings.followup.manualList : ["Want to know more?", "Should I escalate?", "Schedule a callback?"])
                    .slice(0, settings.followup.count)
                    .map((q, i) => (
                      <button key={i} className="block w-full text-left text-[10px] px-2 py-1 rounded-md bg-surface border border-border hover:border-primary/40 transition-base">
                        → {q}
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ============= atoms ============= */
function Section({ icon: Icon, title, desc, children }: any) {
  return (
    <section>
      <header className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

function RowToggle({ label, description, on, onChange }: { label: string; description?: string; on: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <button
        onClick={onChange}
        className={`w-9 h-5 rounded-full p-0.5 transition-base shrink-0 ${on ? "bg-primary" : "bg-border-strong"}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white shadow-soft transition-base ${on ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

function Bubble({ side, children }: { side: "user" | "agent"; children: React.ReactNode }) {
  return (
    <div className={`flex ${side === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-2xl px-2.5 py-1.5 text-[11px] max-w-[85%] ${
          side === "user"
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-surface border border-border rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
