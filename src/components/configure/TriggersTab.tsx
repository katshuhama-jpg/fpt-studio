import { useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, Zap, Clock, Webhook, MessageSquare, Mail,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TriggerFormDialog from "./TriggerFormDialog";
import { triggerStore, type TriggerRecord, type TriggerType } from "./triggerStore";
import { toast } from "sonner";

const TYPE_META: Record<TriggerType, { label: string; icon: any; chip: string }> = {
  manual:   { label: "Manual",   icon: Zap,             chip: "chip-primary" },
  schedule: { label: "Schedule", icon: Clock,           chip: "chip-accent" },
  webhook:  { label: "Webhook",  icon: Webhook,         chip: "chip" },
  event:    { label: "Event",    icon: MessageSquare,   chip: "chip" },
  email:    { label: "Email",    icon: Mail,            chip: "chip" },
};

function relativeTime(ts: number | null) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function TriggersTab({ agentId }: { agentId: string }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TriggerRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TriggerRecord | null>(null);

  const triggers = useMemo(() => {
    void tick;
    const all = triggerStore.list(agentId);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(t =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [agentId, query, tick]);

  const isEmpty = triggers.length === 0 && !query;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Triggers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define when this agent runs — manually, on a schedule, or via webhooks and events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search triggers…"
              className="h-9 w-56 pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
            />
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary h-9">
            <Plus size={13} /> Create
          </button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : triggers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No triggers match "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {triggers.map(t => {
            const meta = TYPE_META[t.type];
            const Icon = meta.icon;
            return (
              <div
                key={t.id}
                className="group relative rounded-xl bg-surface border border-border hover:border-primary/40 hover:shadow-soft transition-base overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-medium text-sm truncate">{t.name}</h3>
                        {t.isDefault && <span className="chip text-[9px] chip-accent">Default</span>}
                        <span className={`chip text-[9px] ${meta.chip}`}>{meta.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Last fired {relativeTime(t.lastFiredAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.4em]">
                    {t.description}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">
                      {t.enabled ? <span className="text-success font-medium">● Active</span> : <span>○ Disabled</span>}
                    </span>
                    <Toggle on={t.enabled} onChange={() => { triggerStore.toggle(agentId, t.id); refresh(); }} />
                  </div>
                </div>

                {!t.isDefault && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                    <button
                      onClick={() => setEditTarget(t)}
                      className="w-7 h-7 rounded-md bg-surface-muted hover:bg-surface-sunken flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="w-7 h-7 rounded-md bg-surface-muted hover:bg-destructive-soft flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TriggerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        agentId={agentId}
        onSubmitted={refresh}
      />
      <TriggerFormDialog
        open={!!editTarget}
        onOpenChange={v => !v && setEditTarget(null)}
        mode="edit"
        agentId={agentId}
        trigger={editTarget ?? undefined}
        onSubmitted={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete trigger?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  triggerStore.remove(agentId, deleteTarget.id);
                  toast.success("Trigger deleted");
                  setDeleteTarget(null);
                  refresh();
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-gradient-soft p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
        <Zap size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1.5">No triggers yet</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Triggers tell your agent when to run — on a schedule, from a webhook, or in response to a keyword.
      </p>
      <button onClick={onCreate} className="btn-primary h-9 mx-auto">
        <Plus size={13} /> Create your first trigger
      </button>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-9 h-5 rounded-full p-0.5 transition-base shrink-0 ${on ? "bg-primary" : "bg-border-strong"}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-soft transition-base ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}
