import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, Lock, BookOpen, MessageSquare, Calendar,
  Workflow, MoreHorizontal, RotateCcw,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TaskFormDialog from "./TaskFormDialog";
import { taskStore, type TaskRecord } from "./taskStore";
import { toast } from "sonner";

const ICONS: Record<string, any> = {
  "sys-knowledge-retrieval": BookOpen,
  "sys-generate-knowledge-response": MessageSquare,
  "lock-card": Lock,
  "schedule": Calendar,
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

export default function TasksGrid({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TaskRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<TaskRecord | null>(null);

  const tasks = useMemo(() => {
    void tick;
    const all = taskStore.list(agentId);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(t => t.name.toLowerCase().includes(q) || t.purpose.toLowerCase().includes(q));
  }, [agentId, query, tick]);

  const isEmpty = tasks.length === 0 && !query;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each task is a self-contained workflow. Click a card to open the editor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tasks…"
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
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No tasks match "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {tasks.map(t => {
            const Icon = ICONS[t.id] ?? Workflow;
            const isSystem = t.kind === "system";
            return (
              <div
                key={t.id}
                className="group relative rounded-xl bg-surface border border-border hover:border-primary/40 hover:shadow-soft transition-base overflow-hidden"
              >
                <Link
                  to={`/agents/${agentId}/tasks/${t.id}`}
                  className="block p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isSystem ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-medium text-sm truncate">{t.name}</h3>
                        {isSystem && <span className="chip text-[9px] chip-accent">System</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Updated {relativeTime(t.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.4em]">
                    {t.purpose}
                  </p>
                </Link>

                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-base">
                  {isSystem ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={e => e.stopPropagation()}
                          className="w-7 h-7 rounded-md bg-surface-muted hover:bg-surface-sunken flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                          title="More"
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setResetTarget(t)}>
                          <RotateCcw size={12} className="mr-2" /> Reset to default
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <>
                      <button
                        onClick={e => { e.preventDefault(); setEditTarget(t); }}
                        className="w-7 h-7 rounded-md bg-surface-muted hover:bg-surface-sunken flex items-center justify-center text-muted-foreground hover:text-foreground transition-base"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={e => { e.preventDefault(); setDeleteTarget(t); }}
                        className="w-7 h-7 rounded-md bg-surface-muted hover:bg-destructive-soft flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        agentId={agentId}
        onSubmitted={(rec) => {
          refresh();
          navigate(`/agents/${agentId}/tasks/${rec.id}`);
        }}
      />

      <TaskFormDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        mode="edit"
        agentId={agentId}
        task={editTarget ?? undefined}
        onSubmitted={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
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
                  taskStore.remove(agentId, deleteTarget.id);
                  toast.success("Task deleted");
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
              "{resetTarget?.name}" will revert to its original system configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resetTarget) {
                  taskStore.resetSystem(agentId, resetTarget.id);
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
        <Workflow size={22} />
      </div>
      <h3 className="font-display text-lg font-semibold mb-1.5">No tasks yet</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Tasks are workflow recipes your agent can run. Create your first task to define what your agent should do.
      </p>
      <button onClick={onCreate} className="btn-primary h-9 mx-auto">
        <Plus size={13} /> Create your first task
      </button>
    </div>
  );
}
