import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home, Store, Bot, Wrench, BookOpen, Settings, LayoutTemplate,
  KeyRound, FileText, ChevronsLeft, ChevronsRight, Search, Bell, Plus, Sparkles,
} from "lucide-react";
import { useState } from "react";

type Item = { to: string; label: string; icon: any; badge?: string };

const top: Item[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/marketplace", label: "Marketplace", icon: Store, badge: "New" },
  { to: "/my-agents", label: "My Agents", icon: Sparkles },
];
const build: Item[] = [
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/settings", label: "Workspace Settings", icon: Settings },
];
const more: Item[] = [
  { to: "/templates", label: "Template Store", icon: LayoutTemplate },
  { to: "/tools", label: "Tool Store", icon: Wrench },
  { to: "/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/docs", label: "Document Center", icon: FileText },
];

export default function WorkspaceLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();
  const inAgentBuilder = loc.pathname.startsWith("/agents/");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-base ${
          collapsed ? "w-[68px]" : "w-[232px]"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-coral flex items-center justify-center shadow-soft shrink-0">
            <span className="font-display font-bold text-sm text-accent-foreground">F</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-sm text-sidebar-accent-foreground truncate">FPT AI Agents</div>
              <div className="text-[10px] text-sidebar-foreground/60 truncate">Smart Cloud Workspace</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          <NavGroup items={top} collapsed={collapsed} />
          <NavGroup items={build} collapsed={collapsed} label="Build" />
          <NavGroup items={more} collapsed={collapsed} label="Workspace" />
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground shrink-0">
              TN
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-sidebar-accent-foreground truncate">Tran Nam</div>
                <div className="text-[10px] text-sidebar-foreground/60 truncate">Workspace Admin</div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="text-sidebar-foreground/70 hover:text-sidebar-accent-foreground transition-base"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!inAgentBuilder && (
          <header className="h-14 border-b border-border bg-surface flex items-center px-6 gap-4 shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="chip !bg-primary-soft !text-primary !border-primary/10">FPT Smart Cloud</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-foreground capitalize">
                {loc.pathname === "/" ? "Home" : loc.pathname.slice(1).replace(/-/g, " ")}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search agents, tools, docs…"
                  className="h-9 w-72 pl-9 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
                />
              </div>
              <button className="h-9 w-9 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center transition-base">
                <Bell size={15} />
              </button>
              <button className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-glow flex items-center gap-1.5 text-sm font-medium transition-base shadow-soft">
                <Plus size={14} /> New Agent
              </button>
            </div>
          </header>
        )}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavGroup({ items, collapsed, label }: { items: Item[]; collapsed: boolean; label?: string }) {
  return (
    <div>
      {label && !collapsed && (
        <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          {label}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map(it => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-base relative ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-accent" />}
                <it.icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate flex-1">{it.label}</span>}
                {!collapsed && it.badge && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                    {it.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
