import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, RotateCcw, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { businessProcessStore, type BusinessProcess } from "./businessProcessStore";
import BusinessProcessFormDialog from "./BusinessProcessFormDialog";

export default function BusinessProcessesGrid({ agentId }: { agentId: string }) {
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; bp?: BusinessProcess } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BusinessProcess | null>(null);

  const items = useMemo(() => {
    const list = businessProcessStore.list(agentId);
    const q = query.trim().toLowerCase();
    return q ? list.filter(b => b.name.toLowerCase().includes(q)) : list;
  }, [agentId, query, dialog, confirmDelete]);

  const fmt = (ts: number) => {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return (
    <div className="p-6 max-w-[1280px] mx-auto animate-fade-up">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Business processes</h2>
          <p className="text-sm text-muted-foreground">
            Each process bundles a goal, instruction, tasks and tools the Agent uses for one scenario.
          </p>
        </div>
        <button onClick={() => setDialog({ mode: "create" })} className="btn-primary h-9">
          <Plus size={13} /> Create
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search business process"
          className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground bg-surface/40">
          No business process matched your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map(bp => (
            <BpCard
              key={bp.id}
              bp={bp}
              fmt={fmt}
              onEdit={() => setDialog({ mode: "edit", bp })}
              onDelete={() => setConfirmDelete(bp)}
              onToggle={(v) => { businessProcessStore.toggle(agentId, bp.id, v); refresh(); }}
              onResetDefault={() => { businessProcessStore.resetDefault(agentId); toast.success("Default process reset."); refresh(); }}
            />
          ))}
        </div>
      )}

      {dialog && (
        <BusinessProcessFormDialog
          open
          onOpenChange={(v) => { if (!v) setDialog(null); refresh(); }}
          mode={dialog.mode}
          agentId={agentId}
          bp={dialog.bp}
          onSubmitted={refresh}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete business process?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{confirmDelete?.name}</b>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  businessProcessStore.remove(agentId, confirmDelete.id);
                  toast.success("Business process deleted.");
                }
                setConfirmDelete(null);
                refresh();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BpCard({
  bp, fmt, onEdit, onDelete, onToggle, onResetDefault,
}: {
  bp: BusinessProcess;
  fmt: (ts: number) => string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
  onResetDefault: () => void;
}) {
  return (
    <div className="group rounded-xl border border-border bg-surface p-4 hover:border-primary/40 hover:shadow-soft transition-base flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <button onClick={onEdit} className="text-[14px] font-semibold truncate hover:text-primary transition-base">
              {bp.name}
            </button>
            {bp.isDefault && <span className="chip chip-muted text-[9.5px]">Default</span>}
          </div>
          <div className="text-[10.5px] text-muted-foreground">
            Indexing samples status:{" "}
            <span className={bp.indexingStatus === "completed" ? "text-success font-medium" : "text-warning font-medium"}>
              {bp.indexingStatus === "completed" ? "Completed" : "Not indexed"}
            </span>
          </div>
        </div>
        <Toggle checked={bp.enabled} onChange={onToggle} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground transition-base opacity-0 group-hover:opacity-100">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit}><Pencil size={12} /> Edit</DropdownMenuItem>
            {bp.isDefault ? (
              <DropdownMenuItem onClick={onResetDefault}><RotateCcw size={12} /> Reset default</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 size={12} /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-[12px] text-foreground/80 line-clamp-3 leading-relaxed">{bp.description}</p>

      <div className="mt-auto pt-2 border-t border-border/60 text-[10.5px] text-muted-foreground flex items-center justify-between">
        <span>Last update: {fmt(bp.updatedAt)}</span>
        <span className="flex items-center gap-1">
          {bp.taskIds.length > 0 && <span className="chip chip-muted text-[9.5px]">{bp.taskIds.length} task</span>}
          {bp.toolIds.length > 0 && <span className="chip chip-muted text-[9.5px]">{bp.toolIds.length} tool</span>}
        </span>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-base shrink-0 ${
        checked ? "bg-success" : "bg-surface-muted border border-border"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-base ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
