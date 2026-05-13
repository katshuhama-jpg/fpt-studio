import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, ChevronDown, Wrench, Globe, Code2, Server, Upload, Download,
  CheckCircle2, ExternalLink, Trash2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  toolStore, builtinCatalog, getBuiltin, type BuiltinToolSet, type ToolDefinition,
} from "@/components/tool-builder/types";

const SOURCE_LABEL: Record<string, string> = {
  builtin: "Built-in",
  api: "Custom API",
  ide: "IDE",
  mcp: "MCP",
};
const SOURCE_TONE: Record<string, string> = {
  builtin: "bg-primary-soft text-primary",
  api: "bg-info/10 text-info",
  ide: "bg-accent-soft text-accent",
  mcp: "bg-warning-soft text-warning",
};

export default function AgentToolsTab({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [installTarget, setInstallTarget] = useState<BuiltinToolSet | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<BuiltinToolSet | null>(null);
  const [version, setVersion] = useState(0); // re-render after store mutations

  const tools = useMemo(() => toolStore.list(agentId), [agentId, version]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(builtinCatalog.map(s => s.category)))],
    []
  );

  const matches = (text: string) =>
    text.toLowerCase().includes(search.trim().toLowerCase());

  const myToolsFiltered = tools.filter(t =>
    (!search || matches(t.name) || matches(t.description)) &&
    (category === "All" || (t.source === "builtin" && getBuiltin(t.setId!)?.category === category))
  );

  const storeFiltered = builtinCatalog.filter(s =>
    !toolStore.isSetInstalled(agentId, s.setId) &&
    (!search || matches(s.name) || matches(s.description)) &&
    (category === "All" || s.category === category)
  );

  const refresh = () => setVersion(v => v + 1);

  const handleInstalled = () => {
    refresh();
    toast.success("Tool installed successfully");
  };

  const handleUninstall = (t: ToolDefinition) => {
    if (t.usedInBp) {
      toast.error("This tool is used in a workflow", { description: "Detach it before uninstalling." });
      return;
    }
    toolStore.remove(agentId, t.id);
    refresh();
    toast("Tool removed");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Wrench size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm">Tools</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Browse the Tool Store, install built-in plugins or build your own — your agent can call any tool here.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="btn-primary h-9">
              <Plus size={13} /> Add tool <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onClick={() => document.getElementById("tool-store-anchor")?.scrollIntoView({ behavior: "smooth" })}>
              <Globe size={14} className="mr-2" /> Browse Tool Store
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/agents/${agentId}/tools/new?type=api`)}>
              <Globe size={14} className="mr-2" /> New Custom API tool
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/agents/${agentId}/tools/new?type=ide`)}>
              <Code2 size={14} className="mr-2" /> New IDE (Python) tool
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast("Import — available in next phase")}>
              <Upload size={14} className="mr-2" /> Import JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast("MCP — available in next phase")}>
              <Server size={14} className="mr-2" /> Connect MCP server
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools by name or description"
            className="ds-input pl-9 h-9 w-full"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`chip whitespace-nowrap ${category === c ? "chip-primary" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* My Tools */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="font-display font-semibold text-sm">My Tools</h4>
          <span className="text-[11px] text-muted-foreground">{myToolsFiltered.length} installed</span>
        </div>

        {myToolsFiltered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-3">
              <Wrench size={20} />
            </div>
            {search || category !== "All" ? (
              <>
                <div className="font-display font-semibold text-sm mb-1">No tools found</div>
                <p className="text-xs text-muted-foreground mb-4">Try another keyword or clear filters.</p>
                <button onClick={() => { setSearch(""); setCategory("All"); }} className="btn-secondary h-9 mx-auto">
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <div className="font-display font-semibold text-sm mb-1">You haven't installed any tools yet.</div>
                <p className="text-xs text-muted-foreground mb-4">Browse Tool Store to add your first tool.</p>
                <button
                  onClick={() => document.getElementById("tool-store-anchor")?.scrollIntoView({ behavior: "smooth" })}
                  className="btn-primary h-9 mx-auto"
                >
                  Explore Tool Store
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {myToolsFiltered.map(t => {
              const localId = t.id.replace(`${agentId}:`, "");
              const set = t.source === "builtin" && t.setId ? getBuiltin(t.setId) : undefined;
              return (
                <div
                  key={t.id}
                  className="group p-4 rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-soft transition-base flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-md bg-accent-soft text-accent flex items-center justify-center text-base shrink-0">
                      {t.pluginAvatar || (t.source === "api" ? "🌐" : t.source === "mcp" ? "🔌" : "⚙️")}
                    </div>
                    <span className="font-mono text-[13px] font-semibold flex-1 truncate">{t.name}</span>
                    <span className={`chip ${SOURCE_TONE[t.source || "ide"]}`}>{SOURCE_LABEL[t.source || "ide"]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2lh] mb-3">
                    {t.description || "No description."}
                  </p>
                  <div className="flex items-center gap-2 mt-auto">
                    {set && (
                      <span className="text-[10px] text-muted-foreground">{set.toolCount} tools</span>
                    )}
                    {t.usedInBp && (
                      <span className="chip chip-primary text-[10px]">Used</span>
                    )}
                    <div className="flex-1" />
                    {t.source === "builtin" ? (
                      <>
                        <button
                          onClick={() => set && setDetailsTarget(set)}
                          className="btn-ghost h-7 text-[11px]"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleUninstall(t)}
                          className="btn-ghost h-7 text-[11px] hover:!text-destructive"
                          title="Uninstall"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate(`/agents/${agentId}/tools/${localId}`)}
                        className="btn-ghost h-7 text-[11px]"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tool Store */}
      <section id="tool-store-anchor" className="pt-2">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h4 className="font-display font-semibold text-sm">Tool Store</h4>
            <p className="text-[11px] text-muted-foreground">Vetted plugins maintained by the platform — install with one click.</p>
          </div>
          <span className="text-[11px] text-muted-foreground">{storeFiltered.length} available</span>
        </div>

        {storeFiltered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            {search || category !== "All" ? "No tools found. Try another keyword or clear filters." : "All tool sets are installed."}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {storeFiltered.map(s => (
              <button
                key={s.setId}
                onClick={() => setDetailsTarget(s)}
                className="text-left p-4 rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-soft transition-base flex flex-col"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center text-lg">
                    {s.pluginAvatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.category} · {s.toolCount} tools</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2lh] mb-3">{s.description}</p>
                <div className="mt-auto">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setInstallTarget(s); }}
                    className="btn-primary h-8 w-full justify-center"
                  >
                    <Plus size={12} /> Install
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <InstallDialog
        agentId={agentId}
        target={installTarget}
        onClose={() => setInstallTarget(null)}
        onInstalled={handleInstalled}
      />
      <DetailsDialog
        target={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        installed={detailsTarget ? toolStore.isSetInstalled(agentId, detailsTarget.setId) : false}
        onInstall={(s) => { setDetailsTarget(null); setInstallTarget(s); }}
      />
    </div>
  );
}

/* ============== Install Dialog ============== */

function InstallDialog({
  agentId, target, onClose, onInstalled,
}: {
  agentId: string;
  target: BuiltinToolSet | null;
  onClose: () => void;
  onInstalled: () => void;
}) {
  const [authName, setAuthName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setAuthName(""); setApiKey(""); setBaseUrl(""); setErrors({}); setBusy(false);
  };

  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!target) return;
    if (!target.requiresAuth) {
      setBusy(true);
      await new Promise(r => setTimeout(r, 350));
      toolStore.installBuiltin(agentId, target);
      onInstalled();
      close();
      return;
    }
    const e: Record<string, string> = {};
    if (target.authFields?.authName && !authName.trim()) e.authName = "This field is required";
    if (target.authFields?.apiKey && !apiKey.trim()) e.apiKey = "This field is required";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    await new Promise(r => setTimeout(r, 600));
    // Fake validation: api key shorter than 6 chars => invalid
    if (apiKey.length < 6) {
      setBusy(false);
      setErrors({ apiKey: "Connection failed. Please verify your API key." });
      return;
    }
    toolStore.installBuiltin(agentId, target, [
      ...(authName ? [{ key: "authName", value: authName }] : []),
      ...(apiKey ? [{ key: "apiKey", value: apiKey, masked: true }] : []),
      ...(baseUrl ? [{ key: "baseUrl", value: baseUrl }] : []),
    ]);
    onInstalled();
    close();
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        {target && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-xl">
                  {target.pluginAvatar}
                </div>
                <div className="min-w-0">
                  <DialogTitle>Install {target.name}</DialogTitle>
                  <DialogDescription>{target.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {target.requiresAuth ? (
              <div className="space-y-3 mt-2">
                {target.authFields?.authName && (
                  <Field label="Authorization name" error={errors.authName}>
                    <input className="ds-input" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="e.g. Production CRM" />
                  </Field>
                )}
                {target.authFields?.apiKey && (
                  <Field label="API Key" error={errors.apiKey}>
                    <input type="password" className="ds-input font-mono" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk_••••••••••••" />
                  </Field>
                )}
                {target.authFields?.baseUrl && (
                  <Field label="Base URL (optional)">
                    <input className="ds-input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.example.com" />
                  </Field>
                )}
                <p className="text-[11px] text-muted-foreground">Credentials are encrypted at rest and only used to call this tool set.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No configuration required. Click Install to add this tool set to My Tools.</p>
            )}

            <DialogFooter>
              <button onClick={close} className="btn-secondary h-9">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn-primary h-9">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {busy ? "Installing…" : "Install"}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============== Details Dialog ============== */

function DetailsDialog({
  target, onClose, installed, onInstall,
}: {
  target: BuiltinToolSet | null;
  onClose: () => void;
  installed: boolean;
  onInstall: (s: BuiltinToolSet) => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {target && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center text-2xl shrink-0">
                  {target.pluginAvatar}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="flex items-center gap-2">
                    {target.name}
                    <span className="chip">{target.category}</span>
                  </DialogTitle>
                  <DialogDescription>{target.description}</DialogDescription>
                  {target.docsUrl && (
                    <a href={target.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary mt-1 hover:underline">
                      Provider docs <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="mt-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Tools in this set ({target.tools.length})
              </div>
              <Accordion type="multiple" className="w-full">
                {target.tools.map(t => (
                  <AccordionItem key={t.name} value={t.name}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[12px] font-semibold">{t.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate">— {t.description}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-3">
                        <SchemaBox title="Input schema" schema={t.inputSchema} />
                        <SchemaBox title="Output schema" schema={t.outputSchema} />
                      </div>
                      {target.requiresAuth && (
                        <div className="mt-3 text-[11px] text-muted-foreground">
                          Required credentials: <span className="font-mono">apiKey</span>
                          {target.authFields?.baseUrl ? <>, <span className="font-mono">baseUrl</span></> : null}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <DialogFooter>
              <button onClick={onClose} className="btn-secondary h-9">Close</button>
              <button
                disabled={installed}
                onClick={() => onInstall(target)}
                className="btn-primary h-9 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {installed ? (<><CheckCircle2 size={13} /> Installed</>) : (<><Plus size={13} /> Install</>)}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SchemaBox({ title, schema }: { title: string; schema: Record<string, string> }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <pre className="font-mono text-[11px] leading-snug whitespace-pre-wrap break-all">
{JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
    </div>
  );
}
