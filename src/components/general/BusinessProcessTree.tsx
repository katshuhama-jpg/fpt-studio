import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers, ChevronDown, ChevronRight, ArrowRight, Plus, Wrench, ListChecks,
  Search, Check, ExternalLink,
} from "lucide-react";
import { businessProcessStore, type BusinessProcess } from "@/components/business-processes/businessProcessStore";
import { taskStore } from "@/components/tasks/taskStore";
import { toolStore } from "@/components/tool-builder/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  agentId: string;
  onManage: () => void;
}

export default function BusinessProcessTree({ agentId, onManage }: Props) {
  const [version, setVersion] = useState(0);
  const bumpVersion = () => setVersion(v => v + 1);
  const [open, setOpen] = useState(true);

  const bps = useMemo(() => businessProcessStore.list(agentId), [agentId, version]);
  const allTools = useMemo(
    () => toolStore.list(agentId).map(t => ({ id: stripPrefix(agentId, t.id), name: t.name, meta: t.source === "builtin" ? "Built-in" : "Custom" })),
    [agentId, version],
  );
  const allTasks = useMemo(
    () => taskStore.list(agentId).map(t => ({ id: t.id, name: t.name, meta: t.kind })),
    [agentId, version],
  );

  const totalTools = bps.reduce((n, b) => n + b.toolIds.length, 0);
  const totalTasks = bps.reduce((n, b) => n + b.taskIds.length, 0);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Layers size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-sm">Business processes</h3>
              <span className="chip text-[10px]">{bps.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Each process orchestrates the tools & tasks it can call. {totalTools} tools · {totalTasks} tasks linked.
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          onClick={onManage}
          className="text-xs font-medium text-primary hover:bg-primary-soft px-2.5 h-8 rounded-md flex items-center gap-1 transition-base shrink-0"
        >
          Manage <ArrowRight size={12} />
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface-muted/30 px-3 py-3 space-y-2">
          {bps.map(bp => (
            <BpCard
              key={bp.id}
              agentId={agentId}
              bp={bp}
              allTools={allTools}
              allTasks={allTasks}
              onChange={bumpVersion}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ BP card (parent + children) ============ */
type Item = { id: string; name: string; meta?: string };

function BpCard({
  agentId, bp, allTools, allTasks, onChange,
}: {
  agentId: string;
  bp: BusinessProcess;
  allTools: Item[];
  allTasks: Item[];
  onChange: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const linkedTools = allTools.filter(t => bp.toolIds.includes(t.id));
  const linkedTasks = allTasks.filter(t => bp.taskIds.includes(t.id));

  const setToolIds = (ids: string[]) => {
    businessProcessStore.update(agentId, bp.id, { toolIds: ids });
    onChange();
  };
  const setTaskIds = (ids: string[]) => {
    businessProcessStore.update(agentId, bp.id, { taskIds: ids });
    onChange();
  };

  return (
    <div className="rounded-lg bg-surface border border-border overflow-hidden">
      {/* Parent header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-muted/40 transition-base"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        )}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${bp.enabled ? "bg-success" : "bg-muted-foreground/40"}`} />
        <span className="text-sm font-medium truncate flex-1">{bp.name}</span>
        {bp.isDefault && <span className="chip chip-primary text-[10px]">default</span>}
        <span className="text-[11px] text-muted-foreground shrink-0">
          {bp.toolIds.length} tool{bp.toolIds.length !== 1 ? "s" : ""} · {bp.taskIds.length} task{bp.taskIds.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border bg-surface-muted/20 pl-6 pr-3 py-3 space-y-3">
          {bp.description && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-2 -mt-1">
              {bp.description}
            </p>
          )}

          {/* Tools group */}
          <ChildGroup
            icon={Wrench}
            label="Tools"
            count={linkedTools.length}
            actionLabel="Attach tool"
            picker={
              <AttachPicker
                title="Attach tools"
                items={allTools}
                selectedIds={bp.toolIds}
                onChange={setToolIds}
                onCreateNew={() => navigate(`/agents/${agentId}/tools/new`)}
                createLabel="Create new tool"
                emptyLabel="No tools available"
              />
            }
          >
            {linkedTools.length === 0 ? (
              <EmptyChild label="No tools attached" />
            ) : (
              linkedTools.map(t => (
                <ChildRow
                  key={t.id}
                  name={t.name}
                  meta={t.meta}
                  onOpen={() => navigate(`/agents/${agentId}/tools/${t.id}`)}
                />
              ))
            )}
          </ChildGroup>

          {/* Tasks group */}
          <ChildGroup
            icon={ListChecks}
            label="Tasks"
            count={linkedTasks.length}
            actionLabel="Attach task"
            picker={
              <AttachPicker
                title="Attach tasks"
                items={allTasks}
                selectedIds={bp.taskIds}
                onChange={setTaskIds}
                onCreateNew={() => navigate(`/agents/${agentId}?tab=develop&section=task`)}
                createLabel="Go to tasks"
                emptyLabel="No tasks available"
              />
            }
          >
            {linkedTasks.length === 0 ? (
              <EmptyChild label="No tasks attached" />
            ) : (
              linkedTasks.map(t => (
                <ChildRow
                  key={t.id}
                  name={t.name}
                  meta={t.meta}
                  onOpen={() => navigate(`/agents/${agentId}/tasks/${t.id}`)}
                />
              ))
            )}
          </ChildGroup>
        </div>
      )}
    </div>
  );
}

/* ============ Child group + row ============ */
function ChildGroup({
  icon: Icon, label, count, actionLabel, picker, children,
}: {
  icon: any; label: string; count: number; actionLabel: string;
  picker: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-border pl-3 space-y-1">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">({count})</span>
        <div className="flex-1" />
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-[11px] font-medium text-primary hover:bg-primary-soft px-2 h-6 rounded-md flex items-center gap-1 transition-base">
              <Plus size={11} /> {actionLabel}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-0">
            {picker}
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ChildRow({ name, meta, onOpen }: { name: string; meta?: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface transition-base group text-left"
    >
      <div className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
      <span className="text-sm font-medium truncate flex-1">{name}</span>
      {meta && <span className="text-[11px] text-muted-foreground capitalize">{meta}</span>}
      <ExternalLink size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-base shrink-0" />
    </button>
  );
}

function EmptyChild({ label }: { label: string }) {
  return (
    <div className="text-[11px] text-muted-foreground italic px-2 py-1">{label}</div>
  );
}

/* ============ Attach picker ============ */
function AttachPicker({
  title, items, selectedIds, onChange, onCreateNew, createLabel, emptyLabel,
}: {
  title: string;
  items: Item[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateNew: () => void;
  createLabel: string;
  emptyLabel: string;
}) {
  const [q, setQ] = useState("");
  const filtered = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div className="text-sm">
      <div className="px-3 py-2 border-b border-border">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {title}
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full h-7 pl-7 pr-2 text-[12px] rounded-md bg-surface-muted border border-border outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="text-[11px] text-muted-foreground italic px-3 py-3 text-center">
            {emptyLabel}
          </div>
        ) : (
          filtered.map(it => {
            const checked = selectedIds.includes(it.id);
            return (
              <button
                key={it.id}
                onClick={() => toggle(it.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-muted transition-base"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {checked && <Check size={10} />}
                </div>
                <span className="text-[12.5px] font-medium truncate flex-1">{it.name}</span>
                {it.meta && <span className="text-[10px] text-muted-foreground capitalize">{it.meta}</span>}
              </button>
            );
          })
        )}
      </div>

      <button
        onClick={onCreateNew}
        className="w-full flex items-center gap-1.5 px-3 py-2 border-t border-border text-[12px] font-medium text-primary hover:bg-primary-soft transition-base"
      >
        <Plus size={12} /> {createLabel}
      </button>
    </div>
  );
}

/* ============ utils ============ */
function stripPrefix(agentId: string, id: string) {
  return id.startsWith(`${agentId}:`) ? id.slice(agentId.length + 1) : id;
}
