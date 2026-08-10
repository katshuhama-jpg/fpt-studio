import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearUser, getUser } from "@/lib/onboarding";
import {
  Home, MessageSquare, Bot, BookOpen, Settings, Plug,
  Puzzle, ChevronsLeft, ChevronsRight, Search, Bell, Plus,
  ChevronRight, LifeBuoy, KeyRound, LogOut, User, ChevronDown,
  Check, Building2, PlusCircle, Sparkles, Shield, FileText, Rocket,
  Lock, ArrowLeft, Network, Users,
} from "lucide-react";

const APP_VERSION = "0.58.5";
import { useState } from "react";
import fptAiLogo from "@/assets/fpt-ai-logo.png";

type Tenant = { id: string; name: string; plan: string; initial: string };
const TENANTS: Tenant[] = [
  { id: "fpt-smart-cloud", name: "FPT Smart Cloud", plan: "Enterprise", initial: "FS" },
  { id: "fpt-telecom",     name: "FPT Telecom",     plan: "Business",   initial: "FT" },
  { id: "fpt-software",    name: "FPT Software",    plan: "Enterprise", initial: "FW" },
  { id: "sandbox",         name: "Personal Sandbox",plan: "Free",       initial: "PS" },
];

type Item = { to: string; label: string; icon: any; badge?: string; external?: boolean };
type Group = { id: string; label: string; items: Item[] };

const topItems: Item[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "https://agents-dev.fpt.ai/", label: "Chat", icon: MessageSquare, external: true },
];

const groups: Group[] = [
  {
    id: "build",
    label: "Build",
    items: [
      { to: "/agents", label: "Agents", icon: Bot },
      { to: "/knowledge", label: "Knowledge", icon: BookOpen },
      { to: "/tools", label: "Skills", icon: Puzzle },
      { to: "/guardrails", label: "Guardrails", icon: Shield },
      { to: "/connectors", label: "Connectors", icon: Plug },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { to: "/organization", label: "Settings", icon: Settings },
    ],
  },
];

const utilityItems: Item[] = [
  { to: "/help", label: "Help Center", icon: LifeBuoy },
];

const orgItems: Item[] = [
  { to: "/organization/structure", label: "Structure", icon: Network },
  { to: "/organization/members", label: "Members", icon: Users },
  { to: "/organization/roles", label: "Roles", icon: Shield },
  { to: "/organization/permissions", label: "Permissions", icon: Lock },
  { to: "/organization", label: "Organization Info", icon: Building2 },
];

export default function WorkspaceLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ build: true, workspace: true });
  const [userMenu, setUserMenu] = useState(false);
  const userEmail = getUser()?.email || "tran.nam@fpt.com";
  const loc = useLocation();
  const navigate = useNavigate();
  const inAgentBuilder = loc.pathname.startsWith("/agents/");
  const inOrganization = loc.pathname.startsWith("/organization");
  const handleSignOut = () => {
    clearUser();
    setUserMenu(false);
    navigate("/login", { replace: true });
  };

  // Builder owns its own chrome — no main shell at all.
  if (inAgentBuilder) {
    return (
      <div className="h-screen w-full overflow-hidden bg-background">
        <Outlet />
      </div>
    );
  }

  const BREADCRUMB_LABELS: Record<string, string> = { tools: "Skills" };
  const ORG_BREADCRUMB_LABELS: Record<string, string> = { "": "Organization Info", structure: "Structure", members: "Members", permissions: "Permissions", roles: "Roles" };
  let breadcrumbLabel: string;
  if (inOrganization) {
    const sub = loc.pathname.replace(/^\/organization\/?/, "");
    breadcrumbLabel = ORG_BREADCRUMB_LABELS[sub] ?? sub;
  } else {
    const rawSegment = loc.pathname === "/" ? "Home" : loc.pathname.slice(1).split("/")[0].replace(/-/g, " ");
    breadcrumbLabel = BREADCRUMB_LABELS[rawSegment.replace(/ /g, "-")] ?? rawSegment;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* ============ Sidebar ============ */}
      <aside
        className={`flex flex-col text-foreground border-r border-border transition-base ${
          collapsed ? "w-[64px]" : "w-[244px]"
        }`} style={{background:"#f8fafc"}}>
        {/* Brand + Tenant — unified, borderless */}
        <div className="px-3 pt-3.5 pb-2 shrink-0">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-soft">
                <span className="font-display font-bold text-sm text-primary-foreground">F</span>
              </div>
            </div>
          ) : (
            <NavLink to="/" className="flex items-center gap-2 mb-3 min-w-0 group">
              <img src={fptAiLogo} alt="FPT.AI" className="h-7 w-auto shrink-0 select-none" draggable={false} />
              <span className="text-[11px] font-medium text-muted-foreground truncate tracking-wide">
                Agents Workspace
              </span>
            </NavLink>
          )}

          {/* App switcher — Build Agent vs Organization management */}
          <AppSwitcher collapsed={collapsed} inOrganization={inOrganization} />
        </div>

        {/* Nav */}
        {inOrganization ? (
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            <div className="space-y-0.5 mb-3">
              <NavRow item={{ to: "/", label: "Back to workspace", icon: ArrowLeft }} collapsed={collapsed} />
            </div>
            <div className="space-y-0.5">
              {orgItems.map(it => (
                <NavRow key={it.to} item={it} collapsed={collapsed} />
              ))}
            </div>
          </nav>
        ) : (
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            <div className="space-y-0.5 mb-3">
              {topItems.map(it => (
                <NavRow key={it.to} item={it} collapsed={collapsed} />
              ))}
            </div>

            {groups.map(g => (
              <NavGroup
                key={g.id}
                group={g}
                collapsed={collapsed}
                open={open[g.id] ?? true}
                onToggle={() => setOpen(o => ({ ...o, [g.id]: !(o[g.id] ?? true) }))}
              />
            ))}
          </nav>
        )}

        {/* Utility (Docs) */}
        {!inOrganization && (
          <div className="px-2 pb-2 space-y-0.5">
            {utilityItems.map(it => (
              <NavRow key={it.to} item={it} collapsed={collapsed} />
            ))}
          </div>
        )}

        {/* User */}
        <div className="p-2.5 shrink-0 relative">
          {userMenu && !collapsed && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-surface rounded-xl overflow-hidden ring-1 ring-border shadow-xl">
              {/* Identity */}
              <div className="px-3 py-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  TN
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-sm font-semibold text-foreground truncate">Tran Nam</div>
                  <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                </div>
              </div>
              <div className="border-t border-border" />

              {/* Menu items */}
              <NavLink
                to="/organization"
                onClick={() => setUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base"
              >
                <Building2 size={14} className="text-muted-foreground" /> Manage organization
              </NavLink>
              <NavLink
                to="/api-keys"
                onClick={() => setUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base"
              >
                <KeyRound size={14} className="text-muted-foreground" /> API Key
              </NavLink>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base">
                <User size={14} className="text-muted-foreground" /> My account
              </button>
              <a
                href="https://docs.agents.fpt.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base"
              >
                <FileText size={14} className="text-muted-foreground" /> Documentation
              </a>
              <NavLink
                to="/help"
                onClick={() => setUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base"
              >
                <LifeBuoy size={14} className="text-muted-foreground" /> Support
              </NavLink>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base">
                <Rocket size={14} className="text-muted-foreground" />
                <span className="flex-1 text-left">About</span>
                <span className="text-xs text-muted-foreground">{APP_VERSION}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              </button>
              <div className="border-t border-border" />
              <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted text-destructive transition-base">
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
          <button
            onClick={() => setUserMenu(v => !v)}
            className="w-full flex items-center gap-2.5 px-1.5 py-1 rounded-md hover:bg-surface-muted transition-base"
          >
            <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              TN
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-semibold text-foreground truncate">Tran Nam</div>
                  <div className="text-[10px] text-muted-foreground truncate">Workspace Admin</div>
                </div>
                <ChevronDown size={13} className={`text-muted-foreground transition-base ${userMenu ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface border border-border shadow-sm hover:bg-surface-muted text-muted-foreground flex items-center justify-center transition-base"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft size={12} />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface border border-border shadow-sm hover:bg-surface-muted text-muted-foreground flex items-center justify-center transition-base"
              aria-label="Expand sidebar"
            >
              <ChevronsRight size={12} />
            </button>
          )}
        </div>
      </aside>

      {/* ============ Main ============ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-surface flex items-center px-6 gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <TenantSwitcher />
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground capitalize">{breadcrumbLabel}</span>
          </div>

        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ============ App switcher (Build Agent ⇄ Organization management) ============ */
type AppOption = { key: "workspace" | "organization"; label: string; desc: string; icon: any; to: string };

const APP_OPTIONS: AppOption[] = [
  { key: "workspace", label: "Agent Studio", desc: "Build and manage agents, knowledge, skills & connectors", icon: Bot, to: "/" },
  { key: "organization", label: "Organization management", desc: "Manage structure, members, roles & permissions", icon: Building2, to: "/organization" },
];

function AppSwitcher({ collapsed, inOrganization }: { collapsed: boolean; inOrganization: boolean }) {
  const [open, setOpen] = useState(false);
  const active = inOrganization ? APP_OPTIONS[1] : APP_OPTIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title={collapsed ? active.label : undefined}
        className={`w-full flex items-center gap-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent ring-1 ring-transparent hover:ring-sidebar-border transition-base ${
          collapsed ? "justify-center p-1.5" : "px-2 py-1.5"
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <active.icon size={14} />
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-semibold text-foreground truncate leading-tight">{active.label}</div>
              <div className="text-[10px] text-muted-foreground truncate leading-tight">Switch app</div>
            </div>
            <ChevronDown size={12} className={`text-muted-foreground transition-base ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div className={`absolute z-50 bg-surface rounded-xl overflow-hidden ring-1 ring-border shadow-xl w-[300px] ${
          collapsed ? "left-full ml-2 top-0" : "left-0 top-full mt-1.5"
        }`}>
          <div className="p-1.5 space-y-0.5">
            {APP_OPTIONS.map(opt => {
              const isActive = opt.key === active.key;
              return (
                <NavLink
                  key={opt.key}
                  to={opt.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-base ${
                    isActive ? "bg-primary-soft ring-1 ring-primary/20" : "hover:bg-surface-muted"
                  }`}
                >
                  <span className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground"
                  }`}>
                    <opt.icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                    <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{opt.desc}</span>
                  </span>
                  {isActive && <Check size={14} className="text-primary shrink-0 mt-1" />}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Tenant switcher (relocated to header) ============ */
function TenantSwitcher() {
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState(TENANTS[0].id);
  const tenant = TENANTS.find(t => t.id === tenantId) ?? TENANTS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="chip chip-primary hover:opacity-90 transition-base cursor-pointer pr-2 gap-1.5"
      >
        <span className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold">
          {tenant.initial}
        </span>
        {tenant.name}
        <ChevronDown size={11} className={`transition-base ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-[calc(100%+6px)] w-64 bg-surface rounded-xl overflow-hidden ring-1 ring-border shadow-xl">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 size={11} /> Switch tenant
          </div>
          <div className="px-1.5 pb-1.5 space-y-0.5">
            {TENANTS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTenantId(t.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-muted transition-base text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {t.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t.plan}</div>
                </div>
                {t.id === tenantId && <Check size={13} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
          <div className="px-1.5 pb-1.5 pt-1 mt-0.5 bg-surface-muted/40">
            <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium hover:bg-surface text-primary transition-base">
              <PlusCircle size={13} /> Create new tenant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Group (expandable) ============ */
function NavGroup({
  group, collapsed, open, onToggle,
}: { group: Group; collapsed: boolean; open: boolean; onToggle: () => void }) {
  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {group.items.map(it => (
          <NavRow key={it.to} item={it} collapsed />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 section-eyebrow hover:text-foreground transition-base"
      >
        <ChevronRight
          size={11}
          className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <span>{group.label}</span>
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {group.items.map(it => (
            <NavRow key={it.to} item={it} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Single nav row ============ */
function NavRow({ item, collapsed }: { item: Item; collapsed: boolean }) {
  const baseCls = `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-base ${collapsed ? "justify-center" : ""}`;
  const inner = (
    <>
      <item.icon size={14} className="shrink-0" />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-muted border border-border text-muted-foreground">
          {item.badge}
        </span>
      )}
    </>
  );
  if (item.external) {
    return (
      <a href={item.to} target="_blank" rel="noopener noreferrer" title={collapsed ? item.label : undefined}
        className={`${baseCls} text-foreground hover:bg-surface-muted`}>
        {inner}
      </a>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.to === "/" || item.to === "/organization"}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `${baseCls} ${isActive ? "bg-primary-soft text-primary font-medium" : "text-foreground hover:bg-surface-muted"}`
      }
    >
      {inner}
    </NavLink>
  );
}

/* ============ Header "+ New" dropdown ============ */
type NewItem = {
  to: string;
  label: string;
  desc: string;
  icon: any;
  hidden?: boolean;
};

function HeaderNewMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  const hide = {
    agent: /^\/(agents(\/new)?|inventor)$/.test(pathname),
    tool: pathname === "/tools" || /^\/agents\/[^/]+\/tools/.test(pathname),
    knowledge: pathname === "/knowledge",
    task: /^\/agents\/[^/]+\/tasks/.test(pathname),
    connector: pathname === "/connectors",
  };

  const primary: NewItem[] = [
    { to: "/agents/new", label: "New Agent", desc: "Build a custom AI agent from scratch", icon: Bot, hidden: hide.agent },
    { to: "/tools", label: "New Skill", desc: "Define a custom skill or integration", icon: Puzzle, hidden: hide.tool },
    { to: "/knowledge?new=1", label: "New Knowledge", desc: "Upload docs or connect a data source", icon: BookOpen, hidden: hide.knowledge },
  ];
  const secondary: NewItem[] = [
    { to: "/connectors", label: "Browse connectors", desc: "Start from a prebuilt blueprint", icon: Sparkles, hidden: hide.connector },
  ];

  const visiblePrimary = primary.filter(i => !i.hidden);
  const visibleSecondary = secondary.filter(i => !i.hidden);

  if (visiblePrimary.length === 0 && visibleSecondary.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="btn-primary h-9"
      >
        <Plus size={14} /> New
        <ChevronDown size={13} className={`transition-base ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-72 bg-surface rounded-xl overflow-hidden ring-1 ring-border shadow-xl z-50">
          {visiblePrimary.length > 0 && (
            <div className="p-1.5">
              {visiblePrimary.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-muted transition-base"
                >
                  <span className="mt-0.5 h-7 w-7 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                    <item.icon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground leading-tight">{item.desc}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          )}
          {visiblePrimary.length > 0 && visibleSecondary.length > 0 && (
            <div className="h-px bg-border" />
          )}
          {visibleSecondary.length > 0 && (
            <div className="p-1.5">
              {visibleSecondary.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-muted transition-base"
                >
                  <span className="mt-0.5 h-7 w-7 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                    <item.icon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground leading-tight">{item.desc}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
