import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home, Sparkles, Bot, BookOpen, Settings, LayoutTemplate,
  Wrench, ChevronsLeft, ChevronsRight, Search, Bell, Plus,
  ChevronRight, LifeBuoy, KeyRound, LogOut, User, ChevronDown,
  Check, Building2, PlusCircle,
} from "lucide-react";
import { useState } from "react";
import fptAiLogo from "@/assets/fpt-ai-logo.png";

type Tenant = { id: string; name: string; plan: string; initial: string };
const TENANTS: Tenant[] = [
  { id: "fpt-smart-cloud", name: "FPT Smart Cloud", plan: "Enterprise", initial: "FS" },
  { id: "fpt-telecom",     name: "FPT Telecom",     plan: "Business",   initial: "FT" },
  { id: "fpt-software",    name: "FPT Software",    plan: "Enterprise", initial: "FW" },
  { id: "sandbox",         name: "Personal Sandbox",plan: "Free",       initial: "PS" },
];

type Item = { to: string; label: string; icon: any; badge?: string };
type Group = { id: string; label: string; items: Item[] };

const topItems: Item[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/my-agents", label: "My Agents", icon: Sparkles },
];

const groups: Group[] = [
  {
    id: "build",
    label: "Build",
    items: [
      { to: "/agents", label: "Agents", icon: Bot },
      { to: "/knowledge", label: "Knowledge", icon: BookOpen },
      { to: "/tools", label: "Tools", icon: Wrench },
      { to: "/templates", label: "Templates", icon: LayoutTemplate },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const utilityItems: Item[] = [
  { to: "/help", label: "Help Center", icon: LifeBuoy },
];

export default function WorkspaceLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ build: true, workspace: true });
  const [userMenu, setUserMenu] = useState(false);
  const [tenantMenu, setTenantMenu] = useState(false);
  const [tenantId, setTenantId] = useState(TENANTS[0].id);
  const tenant = TENANTS.find(t => t.id === tenantId) ?? TENANTS[0];
  const loc = useLocation();
  const inAgentBuilder = loc.pathname.startsWith("/agents/");

  // Builder owns its own chrome — no main shell at all.
  if (inAgentBuilder) {
    return (
      <div className="h-screen w-full overflow-hidden bg-background">
        <Outlet />
      </div>
    );
  }

  const breadcrumbLabel =
    loc.pathname === "/"
      ? "Home"
      : loc.pathname.slice(1).split("/")[0].replace(/-/g, " ");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* ============ Sidebar ============ */}
      <aside
        className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-base ${
          collapsed ? "w-[64px]" : "w-[244px]"
        }`}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-3.5 border-b border-sidebar-border shrink-0">
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-soft mx-auto">
              <span className="font-display font-bold text-sm text-primary-foreground">F</span>
            </div>
          ) : (
            <NavLink to="/" className="flex items-center gap-2 min-w-0">
              <img src={fptAiLogo} alt="FPT.AI" className="h-6 w-auto shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground border-l border-sidebar-border pl-2 truncate">
                Agents Workspace
              </span>
            </NavLink>
          )}
        </div>

        {/* Tenant Switcher */}
        <div className="relative px-2 py-2 border-b border-sidebar-border">
          <button
            onClick={() => setTenantMenu(v => !v)}
            title={collapsed ? tenant.name : undefined}
            className={`w-full flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent transition-base ${
              collapsed ? "justify-center p-1.5" : "px-2 py-1.5"
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
              {tenant.initial}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-semibold text-foreground truncate leading-tight">{tenant.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate leading-tight">{tenant.plan}</div>
                </div>
                <ChevronDown size={12} className={`text-muted-foreground transition-base ${tenantMenu ? "rotate-180" : ""}`} />
              </>
            )}
          </button>

          {tenantMenu && (
            <div className={`absolute z-50 surface-card-elevated bg-surface rounded-lg overflow-hidden border border-border shadow-lg ${
              collapsed ? "left-full ml-2 top-2 w-60" : "left-2 right-2 top-full mt-1"
            }`}>
              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-1.5">
                <Building2 size={11} /> Switch tenant
              </div>
              {TENANTS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTenantId(t.id); setTenantMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-muted transition-base text-left"
                >
                  <div className="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {t.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{t.plan}</div>
                  </div>
                  {t.id === tenantId && <Check size={13} className="text-primary shrink-0" />}
                </button>
              ))}
              <div className="border-t border-border" />
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-surface-muted transition-base text-primary">
                <PlusCircle size={13} /> Create new tenant
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
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

        {/* Utility (Docs) */}
        <div className="px-2 pb-2 space-y-0.5">
          {utilityItems.map(it => (
            <NavRow key={it.to} item={it} collapsed={collapsed} />
          ))}
        </div>

        {/* User */}
        <div className="border-t border-sidebar-border p-2.5 shrink-0 relative">
          {userMenu && !collapsed && (
            <div className="absolute bottom-full left-2 right-2 mb-2 surface-card-elevated bg-surface rounded-lg overflow-hidden">
              <NavLink
                to="/api-keys"
                onClick={() => setUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base"
              >
                <KeyRound size={14} className="text-muted-foreground" /> API Keys
              </NavLink>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted transition-base">
                <User size={14} className="text-muted-foreground" /> Profile
              </button>
              <div className="border-t border-border" />
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-muted text-destructive transition-base">
                <LogOut size={14} /> Sign out
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
            <span className="chip chip-primary">FPT Smart Cloud</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground capitalize">{breadcrumbLabel}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search agents, tools, docs…"
                className="h-9 w-72 pl-9 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:bg-surface focus:border-ring"
              />
            </div>
            <button className="h-9 w-9 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center transition-base">
              <Bell size={15} />
            </button>
            <NavLink to="/agents/new" className="btn-primary h-9">
              <Plus size={14} /> New Agent
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
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
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-base"
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
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-base ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
          )}
          <item.icon size={16} className="shrink-0" />
          {!collapsed && <span className="truncate flex-1">{item.label}</span>}
          {!collapsed && item.badge && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
