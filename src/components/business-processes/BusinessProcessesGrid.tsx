import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, RotateCcw, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { businessProcessStore, type BusinessProcess } from "./businessProcessStore";
import BusinessProcessFormDialog from "./BusinessProcessFormDialog";

const STRATEGY_LABEL: Record<BusinessProcess["strategy"], string> = {
  react: "ReAct",
  predefined: "Predefined plan",
  tool_execution: "Tool execution",
};

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

export default function BusinessProcessesGrid({ agentId }: { agentId: string }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BusinessProcess | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessProcess | null>(null);
  const [resetTarget, setResetTarget] = useState<BusinessProcess | null>(null);

  const items = useMemo(() => {
    void tick;
    const list = businessProcessStore.list(agentId);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(b => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [agentId, query, tick]);

  const isEmpty = items.length === 0 && !query;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Business processes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each process bundles a goal, instruction, tasks and tools the Agent uses for one scenario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search processes…"
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
          <p className="text-sm text-muted-foreground">No processes match "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map(bp => (
            <div
              key={bp.id}
              className="group relative rounded-xl bg-surface border border-border hover:border-primary/40 hover:shadow-soft transition-base overflow-hidden"
            >
              <button
                onClick={() => setEditTarget(bp)}
                className="block w-full text-left p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    bp.isDefault ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
                  }`}>
                    <Layers size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-medium text-sm truncate">{bp.name}</h3>
                      {bp.isDefault && <span className="chip text-[9px] chip-accent">Default</span>}
                      <span className="chip text-[9px] chip-muted">{STRATEGY_LABEL[bp.strategy]}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Updated {relativeTime(bp.updatedAt)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.4em]">
                  {bp.description || "No description."}
                </p>
              </button>

              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                <button
                  onClick={e => { e.preventDefault(); setEditTarget(bp); }}
                  className="w-7 h-7 rounded-md bg-surface-muted hover:bg-surface-sunken flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                {bp.isDefault ? (
                  <button
                    onClick={e => { e.preventDefault(); setResetTarget(bp); }}
                    className="w-7 h-7 rounded-md bg-surface-muted hover:bg-surface-sunken flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                    title="Reset to default"
                  >
                    <RotateCcw size={12} />
                  </button>
                ) : (
                  <button
                    onClick={e => { e.preventDefault(); setDeleteTarget(bp); }}
                    className="w-7 h-7 rounded-md bg-surface-muted hover:bg-destructive-soft flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BusinessProcessFormDialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) refresh(); }}
        mode="create"
        agentId={agentId}
        onSubmitted={refresh}
      />

      <BusinessProcessFormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); refresh(); }}
        mode="edit"
        agentId={agentId}
        bp={editTarget ?? undefined}
        onSubmitted={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete business process?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  businessProcessStore.remove(agentId, deleteTarget.id);
                  toast.success("Business process deleted");
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

      <AlertDialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to default?</AlertDialogTitle>
            <AlertDialogDescription>
              "{resetTarget?.name}" will revert to its original configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetTarget) {
                  businessProcessStore.resetDefault(agentId);
                  toast.success("Reset to default");
                  setResetTarget(null);
                  refresh();
                }
              }}
            >
              Reset
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
        <Layers size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1.5">No processes yet</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Business processes orchestrate tasks and tools for a specific scenario. Create your first process to define how your agent should operate.
      </p>
      <button onClick={onCreate} className="btn-primary h-9 mx-auto">
        <Plus size={13} /> Create your first process
      </button>
    </div>
  );
}
