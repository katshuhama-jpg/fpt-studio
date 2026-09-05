import { useState, useMemo } from "react";
import { Search, CheckCircle2, ChevronRight } from "lucide-react";
import { useGroupAccess, isOwnedOrShared } from "@/pages/organization/scopeAccess";

/* ─── Types ─────────────────────────────────────────── */
type Tab = "all" | "connected" | "available";

interface Connector {
  id: string;
  name: string;
  desc: string;
  logo: string;
  connected: boolean;
  soon: boolean;
  requestedBy?: string[];
  category: string;
  /** Only meaningful once `connected` — who set up this workspace connection, and who else it
   * was explicitly shared with. An unconnected catalog entry isn't anyone's resource yet, so
   * it's never restricted by Scope; only established connections are. */
  ownerId?: string;
  sharedWith?: string[];
}

/* ─── Logo URLs ──────────────────────────────────────── */
const LOGO: Record<string, string> = {
  outlook:    "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg",
  sharepoint: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282018%E2%80%93present%29.svg",
  gmail:      "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
  slack:      "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
  notion:     "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
  github:     "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
  figma:      "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg",
  linear:     "https://asset.brandfetch.io/idFdo8ulhr/idg1AZBV8h.png",
  supabase:   "https://upload.wikimedia.org/wikipedia/commons/b/b8/Supabase_Logo.svg",
  vercel:     "https://upload.wikimedia.org/wikipedia/commons/5/5e/Vercel_logo_black.svg",
  openai:     "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
  discord:    "https://upload.wikimedia.org/wikipedia/commons/9/98/Discord_logo.svg",
  zoom:       "https://upload.wikimedia.org/wikipedia/commons/1/11/Zoom_Logo_2022.svg",
  telegram:   "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg",
  teams:      "https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg",
  twilio:     "https://upload.wikimedia.org/wikipedia/commons/7/7e/Twilio-logo-red.svg",
  sheets:     "https://upload.wikimedia.org/wikipedia/commons/a/ae/Google_Sheets_2020_Logo.svg",
  stripe:     "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
  salesforce: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
  clickup:    "https://upload.wikimedia.org/wikipedia/commons/3/37/ClickUp_Logo.png",
  trello:     "https://upload.wikimedia.org/wikipedia/commons/1/13/Trello-logo.svg",
  dropbox:    "https://upload.wikimedia.org/wikipedia/commons/7/74/Dropbox_logo_2017.svg",
  gdrive:     "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg",
  gitlab:     "https://upload.wikimedia.org/wikipedia/commons/e/e1/GitLab_logo.svg",
  gcalendar:  "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
};

/* ─── Seed data ──────────────────────────────────────── */
const CONNECTORS: Connector[] = [
  { id:"outlook",    name:"Microsoft Outlook",   desc:"Search emails and calendar events, and send on your behalf.",                     logo:LOGO.outlook,    connected:true,  soon:false, requestedBy:["You Need A Hug","meo meo"], category:"requested", ownerId: "m-fsoft-coo" },
  { id:"sharepoint", name:"Microsoft SharePoint",desc:"Read files, document libraries, and sites across your SharePoint.",              logo:LOGO.sharepoint, connected:true,  soon:false, requestedBy:["meo meo"],                 category:"requested", ownerId: "m-fsoft-ceo" },
  { id:"gmail",      name:"Gmail",               desc:"Search, create, and manage your emails and calendar events.",                    logo:LOGO.gmail,      connected:false, soon:true,  category:"popular" },
  { id:"slack",      name:"Slack",               desc:"Read channels, send messages, and search conversations.",                        logo:LOGO.slack,      connected:false, soon:true,  category:"popular" },
  { id:"notion",     name:"Notion",              desc:"Read, create, and update pages and databases across your workspace.",            logo:LOGO.notion,     connected:false, soon:true,  category:"popular" },
  { id:"github",     name:"GitHub",              desc:"Read repositories, issues, and pull requests; search code and commits.",         logo:LOGO.github,     connected:false, soon:true,  category:"popular" },
  { id:"figma",      name:"Figma",               desc:"Manage files, projects, and teams; read designs from your workspace.",          logo:LOGO.figma,      connected:false, soon:true,  category:"popular" },
  { id:"linear",     name:"Linear",              desc:"Create and update issues, track projects, and search your team's roadmap.",      logo:LOGO.linear,     connected:false, soon:true,  category:"new" },
  { id:"supabase",   name:"Supabase",            desc:"Build and manage your app's database, auth, and storage.",                      logo:LOGO.supabase,   connected:false, soon:true,  category:"new" },
  { id:"vercel",     name:"Vercel",              desc:"Manage teams, projects, and deployments; search documentation.",                 logo:LOGO.vercel,     connected:false, soon:true,  category:"new" },
  { id:"openai",     name:"OpenAI",              desc:"Access models, files, and assistants across your OpenAI organization.",         logo:LOGO.openai,     connected:false, soon:true,  category:"new" },
  { id:"discord",    name:"Discord",             desc:"Read channels, send messages, and manage members across your servers.",         logo:LOGO.discord,    connected:false, soon:true,  category:"communication" },
  { id:"zoom",       name:"Zoom",                desc:"Manage meetings and recordings, and retrieve transcripts.",                     logo:LOGO.zoom,       connected:false, soon:true,  category:"communication" },
  { id:"telegram",   name:"Telegram",            desc:"Send messages and files, and read updates through your bot.",                   logo:LOGO.telegram,   connected:false, soon:true,  category:"communication" },
  { id:"teams",      name:"Microsoft Teams",     desc:"Read channels and chats, send messages, and schedule meetings.",               logo:LOGO.teams,      connected:false, soon:true,  category:"communication" },
  { id:"twilio",     name:"Twilio",              desc:"Send SMS and messaging, and retrieve delivery status and logs.",                logo:LOGO.twilio,     connected:false, soon:true,  category:"communication" },
  { id:"sheets",     name:"Google Sheets",       desc:"Read and write rows, ranges, and formulas across your spreadsheets.",          logo:LOGO.sheets,     connected:false, soon:true,  category:"data" },
  { id:"stripe",     name:"Stripe",              desc:"Retrieve customers, payments, and subscriptions; read financial reports.",      logo:LOGO.stripe,     connected:false, soon:true,  category:"data" },
  { id:"salesforce", name:"Salesforce",          desc:"Query and update leads, opportunities, and accounts across your CRM.",         logo:LOGO.salesforce, connected:false, soon:true,  category:"data" },
  { id:"clickup",    name:"ClickUp",             desc:"Manage tasks, docs, and goals; automate workflows across spaces.",             logo:LOGO.clickup,    connected:false, soon:true,  category:"productivity" },
  { id:"trello",     name:"Trello",              desc:"Manage boards, lists, and cards; move work and add comments.",                 logo:LOGO.trello,     connected:false, soon:true,  category:"productivity" },
  { id:"dropbox",    name:"Dropbox",             desc:"Search, upload, and retrieve files and folders from your account.",            logo:LOGO.dropbox,    connected:false, soon:true,  category:"productivity" },
  { id:"gdrive",     name:"Google Drive",        desc:"Search and retrieve files and folders from your Drive.",                       logo:LOGO.gdrive,     connected:false, soon:true,  category:"productivity" },
  { id:"gitlab",     name:"GitLab",              desc:"Read projects, issues, and merge requests; manage pipeline and code.",         logo:LOGO.gitlab,     connected:false, soon:true,  category:"productivity" },
  { id:"gcalendar",  name:"Google Calendar",     desc:"Search, upload, and retrieve calendar events and meetings.",                   logo:LOGO.gcalendar,  connected:false, soon:true,  category:"productivity" },
];

const CATEGORIES = [
  { key:"popular",      label:"Popular",            icon:"🔥" },
  { key:"new",          label:"New",                icon:"✨" },
  { key:"communication",label:"Communication",      icon:"💬" },
  { key:"data",         label:"Data & analytics",   icon:"📊" },
  { key:"productivity", label:"Productivity",       icon:"⚡" },
];

/* ─── Main page ──────────────────────────────────────── */
export default function WorkspaceConnectors() {
  const access = useGroupAccess("connectors");
  const [tab, setTab]     = useState<Tab>("all");
  const [query, setQuery] = useState("");

  // Only an established connection is really "someone's resource" — browsing the catalog of
  // not-yet-connected services is never restricted. A role whose Connectors View Scope is
  // "Own & Shared" (or with no View permission at all) only sees connections it set up or that
  // were shared with it.
  const isConnectorVisible = (c: Connector) =>
    !c.connected || access.canSeeAll || isOwnedOrShared(c, access.userId);

  const requested = CONNECTORS.filter(c => c.category === "requested" && isConnectorVisible(c));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return CONNECTORS.filter(c => {
      if (c.category === "requested") return false;
      if (!isConnectorVisible(c)) return false;
      if (tab === "connected" && !c.connected) return false;
      if (tab === "available" && c.connected) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.desc.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, access.canSeeAll, access.userId]);

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Connectors</h1>
        <p className="text-sm text-muted-foreground">Connect services so agents can access and act on your data.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-border pb-3">
        <div className="flex items-center gap-1">
          {(["all","connected","available"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 h-8 rounded-lg text-sm font-medium transition-base capitalize ${
                tab === t ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >{t === "all" ? "All" : t === "connected" ? "Connected" : "Available"}</button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search connectors…"
            className="h-9 w-56 pl-8 pr-3 rounded-lg bg-surface-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
        </div>
      </div>

      {/* Requested connections */}
      {tab !== "connected" && requested.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Agents are requesting connections
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requested.map(c => <ConnectorCard key={c.id} connector={c} />)}
          </div>
          <div className="mt-6 mb-2 border-t border-border" />
        </div>
      )}

      {/* Category sections */}
      {CATEGORIES.map(cat => {
        const items = filtered.filter(c => c.category === cat.key);
        if (!items.length) return null;
        return (
          <div key={cat.key} className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>{cat.icon}</span>{cat.label}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(c => <ConnectorCard key={c.id} connector={c} />)}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && !requested.length && (
        <div className="py-20 text-center text-muted-foreground text-sm">No connectors found.</div>
      )}
    </div>
  );
}

/* ─── Connector card ─────────────────────────────────── */
function ConnectorCard({ connector: c }: { connector: Connector }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border bg-surface transition-base cursor-pointer hover:border-primary/40 hover:bg-primary-soft/10 ${
      c.connected ? "border-primary/30" : "border-border"
    }`}>
      <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
        <img src={c.logo} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium">{c.name}</span>
          {c.connected && <CheckCircle2 size={13} className="text-success shrink-0" />}
          {c.soon && !c.connected && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border bg-surface-muted text-muted-foreground shrink-0">Coming soon</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
        {c.requestedBy && (
          <p className="text-[11px] text-muted-foreground mt-1">Requested by: {c.requestedBy.join(", ")}</p>
        )}
      </div>
      <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
    </div>
  );
}
