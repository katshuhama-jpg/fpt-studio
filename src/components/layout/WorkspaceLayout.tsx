import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home, Sparkles, Bot, BookOpen, Settings, LayoutTemplate,
  Wrench, ChevronsLeft, ChevronsRight, Search, Bell, Plus,
  ChevronRight, FileText, KeyRound, LogOut, User, ChevronDown,
} from "lucide-react";
import { useState } from "react";

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
  { to: "/docs", label: "Help Center", icon: FileText },
];

export default function WorkspaceLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ build: true, workspace: true });
  const [userMenu, setUserMenu] = useState(false);
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
        <div className="h-14 flex items-center gap-2.5 px-3.5 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-soft shrink-0">
            <span className="font-display font-bold text-sm text-primary-foreground">F</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-[13px] text-foreground truncate leading-tight">
                FPT AI Agents
              </div>
              <div className="text-[10px] text-muted-foreground truncate leading-tight">
                Smart Cloud Workspace
              </div>
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
