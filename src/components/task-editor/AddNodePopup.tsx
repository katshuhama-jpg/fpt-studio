import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Link2, Wrench, Workflow } from "lucide-react";
import { blockCatalog, groupOrder, type BlockSpec } from "./blockCatalog";
import { specByKind } from "@/components/tool-builder/NodeLibrary";
import { toolStore, type ToolDefinition } from "@/components/tool-builder/types";
import { taskStore, type TaskRecord } from "@/components/tasks/taskStore";

interface Props {
  open: boolean;
  onClose: () => void;
  agentId: string;
  currentTaskId: string;
  onPickBlock: (spec: BlockSpec) => void;
  onPickTool: (tool: ToolDefinition) => void;
  onPickTask: (task: TaskRecord) => void;
}

export default function AddNodePopup({ open, onClose, agentId, currentTaskId, onPickBlock, onPickTool, onPickTask }: Props) {
  const [tab, setTab] = useState<"blocks" | "tools" | "tasks">("blocks");
  const [toolTab, setToolTab] = useState<"custom" | "mcp">("custom");
  const [q, setQ] = useState("");

  const blocksByGroup = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = blockCatalog.filter(b =>
      !ql || b.label.toLowerCase().includes(ql) || b.description.toLowerCase().includes(ql)
    );
    return groupOrder.map(g => ({ group: g, items: filtered.filter(b => b.group === g) }))
      .filter(g => g.items.length > 0);
  }, [q]);

  const tools = useMemo(() => toolStore.list(agentId), [agentId, open]);
  const customTools = tools.filter(t => t.source === "ide" || t.source === "api" || t.source === "builtin");
  const mcpTools = tools.filter(t => t.source === "mcp");

  const tasks = useMemo(
    () => taskStore.list(agentId).filter(t => t.id !== currentTaskId),
    [agentId, currentTaskId, open]
  );

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 h-9 text-sm font-medium rounded-md transition-base ${
        tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted"
      }`}
    >{label}</button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="font-display">Add a node</DialogTitle>
        </DialogHeader>

        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1 bg-surface-muted rounded-lg p-1">
              {tabBtn("blocks", "Blocks")}
              {tabBtn("tools", "Tools")}
              {tabBtn("tasks", "Tasks")}
            </div>
            <div className="ml-auto relative flex-1 max-w-[260px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 max-h-[60vh] overflow-y-auto">
          {tab === "blocks" && (
            <div className="space-y-5">
              {blocksByGroup.map(({ group, items }) => (
                <div key={group}>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map(b => {
                      const s = specByKind(b.kind);
                      const Icon = s.icon;
                      return (
                        <button
                          key={b.kind}
                          onClick={() => { onPickBlock(b); onClose(); }}
                          className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-surface hover:border-primary/40 hover:shadow-soft text-left transition-base"
                        >
                          <div className={`w-8 h-8 rounded-md ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold leading-tight truncate">{b.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{b.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "tools" && (
            <div>
              <div className="flex gap-1 bg-surface-muted rounded-lg p-1 mb-3 w-fit">
                <button onClick={() => setToolTab("custom")} className={`px-3 h-8 text-xs font-medium rounded-md ${toolTab === "custom" ? "bg-surface shadow-soft" : "text-muted-foreground"}`}>Custom</button>
                <button onClick={() => setToolTab("mcp")} className={`px-3 h-8 text-xs font-medium rounded-md ${toolTab === "mcp" ? "bg-surface shadow-soft" : "text-muted-foreground"}`}>MCP</button>
              </div>

              {toolTab === "custom" && (
                customTools.length === 0 ? (
                  <EmptyState icon={<Wrench size={20} />} label="No custom tools yet" cta="Create new tool" onCta={() => window.location.assign(`/agents/${agentId}?tab=develop&section=tool`)} />
                ) : (
                  <ul className="space-y-1.5">
                    {customTools.map(t => (
                      <li key={t.id}>
                        <button
                          onClick={() => { onPickTool(t); onClose(); }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-surface hover:border-primary/40 text-left transition-base"
                        >
                          <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center text-base">{t.pluginAvatar ?? "🔧"}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold leading-tight truncate">{t.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{t.description}</div>
                          </div>
                          <span className={`chip text-[10px] ${t.enabled ? "chip-accent" : ""}`}>{t.enabled ? "Active" : "Inactive"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {toolTab === "mcp" && (
                mcpTools.length === 0 ? (
                  <EmptyState icon={<Link2 size={20} />} label="No MCP servers connected" cta="Connect MCP" onCta={() => window.location.assign(`/agents/${agentId}?tab=develop&section=tool`)} />
                ) : (
                  <ul className="space-y-1.5">
                    {mcpTools.map(t => (
                      <li key={t.id}>
                        <button
                          onClick={() => { onPickTool(t); onClose(); }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-surface hover:border-primary/40 text-left transition-base"
                        >
                          <div className="w-8 h-8 rounded-md bg-info/10 text-info flex items-center justify-center"><Link2 size={14} /></div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold leading-tight truncate">{t.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{t.remoteToolName ?? "remote tool"}</div>
                          </div>
                          <span className="chip chip-accent text-[10px]">connected</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          )}

          {tab === "tasks" && (
            tasks.length === 0 ? (
              <EmptyState icon={<Workflow size={20} />} label="No other tasks available" />
            ) : (
              <ul className="space-y-1.5">
                {tasks.map(t => (
                  <li key={t.id}>
                    <button
                      onClick={() => { onPickTask(t); onClose(); }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border bg-surface hover:border-primary/40 text-left transition-base"
                    >
                      <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center"><Workflow size={14} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold leading-tight truncate">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{t.purpose}</div>
                      </div>
                      <span className="chip text-[10px]">{t.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon, label, cta, onCta }: { icon: React.ReactNode; label: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-surface-muted text-muted-foreground flex items-center justify-center mx-auto mb-2">{icon}</div>
      <p className="text-sm font-medium">{label}</p>
      {cta && (
        <button onClick={onCta} className="mt-3 btn-primary h-8 text-xs">
          <Plus size={12} /> {cta}
        </button>
      )}
    </div>
  );
}
