import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Shield, ShieldAlert } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import GuardrailFormDialog from "./GuardrailFormDialog";
import { guardrailStore, type GuardrailRecord, type GuardrailKind } from "./guardrailStore";
import { toast } from "sonner";

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const SCOPE_LABEL: Record<string, string> = { input: "Input", output: "Output", both: "Both" };

export default function GuardrailsTab({ agentId }: { agentId: string }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | GuardrailKind>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GuardrailRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuardrailRecord | null>(null);

  const items = useMemo(() => {
    void tick;
    const all = guardrailStore.list(agentId);
    const q = query.trim().toLowerCase();
    return all
      .filter(g => filter === "all" || g.kind === filter)
      .filter(g => !q || g.name.toLowerCase().includes(q) || g.rule.toLowerCase().includes(q));
  }, [agentId, query, filter, tick]);

  const isEmpty = items.length === 0 && !query && filter === "all";

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Guardrails</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hard rules the agent must never break — applied to user input, agent output, or both.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-muted rounded-lg p-0.5">
            {(["all", "block", "warn"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-8 px-3 rounded-md text-xs font-medium capitalize transition-base ${
                  filter === f ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search rules…"
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
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No guardrails match the current filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map(g => {
            const Icon = g.kind === "block" ? ShieldAlert : Shield;
            return (
              <div
                key={g.id}
                className="group relative rounded-xl bg-surface border border-border hover:border-primary/40 hover:shadow-soft transition-base overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        g.kind === "block" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-medium text-sm truncate">{g.name}</h3>
                        <span
                          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            g.kind === "block" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                          }`}
                        >
                          {g.kind}
                        </span>
                        <span className="chip text-[9px]">{SCOPE_LABEL[g.scope]}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Updated {relativeTime(g.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.4em]">{g.rule}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-[11px] text-muted-foreground">
                      {g.enabled ? <span className="text-success font-medium">● Enforced</span> : <span>○ Disabled</span>}
                    </span>
                    <Toggle on={g.enabled} onChange={() => { guardrailStore.toggle(agentId, g.id); refresh(); }} />
                  </div>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                  <button
                    onClick={() => setEditTarget(g)}
                    className="w-7 h-7 rounded-md bg-surface-muted hover:bg-surface-sunken flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(g)}
                    className="w-7 h-7 rounded-md bg-surface-muted hover:bg-destructive-soft flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GuardrailFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        agentId={agentId}
        onSubmitted={refresh}
      />
      <GuardrailFormDialog
        open={!!editTarget}
        onOpenChange={v => !v && setEditTarget(null)}
        mode="edit"
        agentId={agentId}
        guardrail={editTarget ?? undefined}
        onSubmitted={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete guardrail?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be removed and the agent will no longer enforce this rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  guardrailStore.remove(agentId, deleteTarget.id);
                  toast.success("Guardrail deleted");
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
        <Shield size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1.5">No guardrails yet</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Guardrails are hard rules your agent must never violate — like avoiding legal advice or verifying identity.
      </p>
      <button onClick={onCreate} className="btn-primary h-9 mx-auto">
        <Plus size={13} /> Create your first guardrail
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
