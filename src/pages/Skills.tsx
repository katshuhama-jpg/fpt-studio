import { useState, useRef, useCallback } from "react";
import { Puzzle, BookOpen, Plus, Search, LayoutGrid, List, ChevronDown, X, ChevronRight, Copy, Trash2, Eye, Code2, Bold, Italic, Strikethrough, Heading1, Heading2, List as ListIcon, ListOrdered } from "lucide-react";

interface Skill {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  description: string;
  owner: string;
  body: string;
}

const SKILLS: Skill[] = [
  {
    id: "account-briefing",
    icon: "🗂️",
    iconBg: "hsl(231 90% 93%)",
    name: "account-briefing",
    description: `Use when the user has an upcoming meeting and needs preparation, says "brief me on," "who am I meeting with," "prep me for my call with," "what do I need to know about this account," or wants talking points, agenda suggestions, or contact on meeting attendees. Also use before any external meeting where account context would help.`,
    owner: "You",
    body: `# Account Briefing

You are a sales intelligence analyst. Before important meetings, you prepare a comprehensive account brief that combines internal context (calendar, email) with external research (web, LinkedIn). Your goal is a 1-page brief the user can scan in 5 minutes before walking into the meeting.

## Tools You Use

**Calendar** (pick based on what's connected):

- \`google_calendar_list_events_for_date\` or \`outlook_calendar_list_events_for_date\`
- \`google_calendar_get_event\` or \`outlook_calendar_get_event\`

**Email** (pick based on what's connected):

- \`gmail_read_emails\` or \`outlook_read_emails\`

**Research:**

- \`exa_web_search\` — Company and industry research
- \`exa_linkedin_search\` — Attendee background
- \`read_url_content\` — Deep-read specific pages

**Delivery:**

- \`slack_send_channel_message\` or \`slack_write_private_message\` — Deliver the brief

## Workflow

## Step 1: Identify the Meeting

Use \`google_calendar_list_events_for_date\` (or Outlook equivalent) for today or tomorrow.

Filter to external meetings:

- Look for attendees with email domains different from the user's company
- If multiple external meetings exist, ask the user which to brief (or brief all)

## Step 2: Resolve Attendees

For each external attendee:

- Extract their name and email domain
- Use \`exa_linkedin_search\` to find: title, company, tenure, recent activity
- Determine who is the decision-maker, who is technical, who is new to the relationship

## Step 3: Research the Account (Last 90 Days)

Run parallel searches:

- \`exa_web_search\` : "[company] news funding product launch partnership"
- \`exa_web_search\` : "[company] [industry] challenges strategy"
- \`read_url_content\` on the top 3 results

## Step 4: Review Email History

Use \`gmail_read_emails\` (or \`outlook_read_emails\`) with a query for the attendee's domain.

## Step 5: Produce the Brief

\`\`\`
## Meeting: [title] — [date] [time]

## Attendees
- [Name] — [Title] at [Company]
  Key context: [relevant LinkedIn insight]

## Account Snapshot
- Company: [1-paragraph overview]
- Recent News:
  - [date]: [event]

## Email History Summary
- Last contact: [date]
- Key threads: [topics]
- Open items: [commitments or asks still pending]

## Talking Points
1. [Anchored to recent news or open item]
2. [Anchored to attendee's role or interest]
3. [Anchored to your product's value for their situation]

## Risks & Watch-outs
- [Competitor presence, budget freeze, champion leaving, etc.]
\`\`\`

## Step 6: Deliver

If Slack is connected, send the brief via \`slack_write_private_message\` to the meeting owner.

## Graceful Degradation

This skill works best with Calendar + Email + Slack all connected, but adapts:

- **No calendar:** Ask the user for meeting details (who, when, which company)
- **No email:** Skip the email history section, focus on web research
- **No Slack:** Present the brief directly in the conversation`,
  },
  {
    id: "competitive-intel",
    icon: "🏆",
    iconBg: "hsl(152 55% 92%)",
    name: "competitive-intel",
    description: `Use when the user asks "what is [competitor] doing," requests market analysis, or needs a competitive landscape summary for a specific company or product.`,
    owner: "You",
    body: `# Competitive Intel

You are a market research analyst. Gather, synthesize, and deliver a competitive snapshot for any company or product the user names.

## Tools You Use

- \`exa_web_search\` — Company and industry research
- \`exa_linkedin_search\` — Leadership and hiring signals
- \`read_url_content\` — Deep-read product and pricing pages

## Workflow

## Step 1: Identify Competitors

Clarify which company or product to research. If multiple, prioritize by user intent.

## Step 2: Pull Recent Activity

- News from last 90 days
- Job postings for strategic signals
- Product or pricing page changes

## Step 3: Synthesize and Deliver

Summarize positioning, recent moves, and watch-outs in a structured brief.`,
  },
  {
    id: "email-drafter",
    icon: "📧",
    iconBg: "hsl(358 75% 94%)",
    name: "email-drafter",
    description: `Drafts professional emails based on context. Say "draft an email to..." with any details and it will compose a context-aware draft and save it for review.`,
    owner: "You",
    body: `# Email Drafter

You draft professional, context-aware emails. Read prior thread history, match the user's tone, and save as a draft for review.

## Tools You Use

- \`gmail_read_emails\` or \`outlook_read_emails\`
- \`gmail_create_draft\` or \`outlook_create_draft\`

## Workflow

## Step 1: Understand Intent

Identify recipient, purpose, and any constraints (tone, length, deadline).

## Step 2: Read Thread Context

Fetch last 3 messages in the thread if available.

## Step 3: Draft and Save

Write the email and save as a draft — never send without user confirmation.`,
  },
  {
    id: "weekly-digest",
    icon: "📊",
    iconBg: "hsl(38 92% 93%)",
    name: "weekly-digest",
    description: `Runs every Monday. Pulls activity across calendar, Slack, and email and emails the team a summary of last week's performance and highlights.`,
    owner: "You",
    body: `# Weekly Digest

Runs automatically each Monday. Aggregates activity across calendar, Slack, and email into a concise summary for the team.

## Tools You Use

- \`google_calendar_list_events\`
- \`slack_read_channel\`
- \`gmail_read_emails\`

## Workflow

## Step 1: Collect Data

Pull events, messages, and emails from the previous 7 days.

## Step 2: Identify Key Outcomes

Summarize decisions made, blockers raised, and next steps committed to.

## Step 3: Deliver

Format digest and send via Slack or email to the configured channel.`,
  },
];

function renderBody(md: string) {
  const lines = md.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      result.push(<h1 key={i} className="text-xl font-bold mb-3 mt-1 leading-snug">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      result.push(<h2 key={i} className="text-sm font-bold mt-4 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      result.push(<pre key={i} className="bg-surface-muted border border-border rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto my-2 leading-relaxed text-foreground">{codeLines.join("\n")}</pre>);
    } else if (line.startsWith("- ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(<li key={i}>{inlineRender(lines[i].slice(2))}</li>);
        i++;
      }
      result.push(<ul key={"ul"+i} className="list-disc pl-4 my-1 space-y-0.5 text-sm text-foreground leading-relaxed">{items}</ul>);
      continue;
    } else if (line.trim() === "") {
      // skip blank
    } else {
      result.push(<p key={i} className="text-sm leading-relaxed mb-1 text-foreground">{inlineRender(line)}</p>);
    }
    i++;
  }
  return result;
}

function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="bg-surface-muted border border-border rounded px-1 py-px text-xs font-mono text-primary">{p.slice(1,-1)}</code>;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2,-2)}</strong>;
    return p;
  });
}

export default function Skills() {
  const [view, setView] = useState<"grid"|"list">("grid");
  const [filter, setFilter] = useState("All Skills");
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<"preview"|"source">("preview");
  const [editedBody, setEditedBody] = useState<string>("");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  function openSkill(s: Skill) {
    setSelected(prev => prev?.id === s.id ? null : s);
    setEditedBody(s.body);
    setIsDirty(false);
    setViewMode("preview");
  }

  function handleBodyChange(val: string) {
    setEditedBody(val);
    setIsDirty(val !== selected?.body);
  }

  function handleSave() {
    setIsDirty(false);
  }

  function wrapSelection(before: string, after: string = before) {
    const ta = editorRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const val = ta.value;
    const newVal = val.slice(0, s) + before + val.slice(s, e) + after + val.slice(e);
    handleBodyChange(newVal);
    setTimeout(() => { ta.selectionStart = s + before.length; ta.selectionEnd = e + before.length; ta.focus(); }, 0);
  }

  function prependLine(prefix: string) {
    const ta = editorRef.current;
    if (!ta) return;
    const { selectionStart } = ta;
    const val = ta.value;
    const lineStart = val.lastIndexOf("\n", selectionStart - 1) + 1;
    const newVal = val.slice(0, lineStart) + prefix + val.slice(lineStart);
    handleBodyChange(newVal);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = selectionStart + prefix.length; ta.focus(); }, 0);
  }

  const filters = ["All Skills", "My Skills", "From Library"];

  const visible = SKILLS.filter(s =>
    search === "" || s.name.includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
  );



  return (
    <div className="flex h-full overflow-hidden">
      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-surface shrink-0">
          <div>
            <h1 className="text-xl font-semibold font-display flex items-center gap-2">
              <Puzzle size={20} className="text-primary" />
              Skills
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Skills shared across all agents in this workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Browse Library</button>
            <button className="btn-primary flex items-center gap-1.5"><Plus size={14} /> Create Skill <ChevronDown size={13} className="opacity-70" /></button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-8 py-3 border-b border-border bg-background shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full pl-9 pr-3 rounded-lg bg-surface border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setFilterOpen(v => !v)}
              onBlur={() => setTimeout(() => setFilterOpen(false), 150)}
              className="h-8 flex items-center gap-2 px-3 rounded-lg border border-border bg-surface text-sm hover:bg-surface-muted transition-base"
            >
              <span className="text-muted-foreground text-xs">≡</span>
              {filter}
              <ChevronDown size={12} className={`text-muted-foreground transition-base ${filterOpen ? "rotate-180" : ""}`} />
            </button>
            {filterOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] w-44 bg-surface rounded-xl ring-1 ring-border shadow-xl z-50 p-1">
                {filters.map(f => (
                  <button key={f} onClick={() => { setFilter(f); setFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-base hover:bg-surface-muted ${filter === f ? "text-primary font-medium" : "text-foreground"}`}>
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-1 rounded-lg bg-surface border border-border">
            <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-base ${view === "grid" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Grid view"><LayoutGrid size={14} /></button>
            <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-base ${view === "list" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="List view"><List size={14} /></button>
          </div>
        </div>

        {/* Cards */}
        {visible.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-5 border border-primary/15">
              <Puzzle size={26} />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">No skills yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">Skills teach your agents how to handle specific tasks. Create your own, or browse pre-built templates from the skill library.</p>
            <div className="flex items-center gap-3">
              <button className="btn-secondary flex items-center gap-1.5"><BookOpen size={14} /> Browse Library</button>
              <button className="btn-primary flex items-center gap-1.5"><Plus size={14} /> Create Skill</button>
            </div>
          </div>
        ) : view === "grid" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {visible.map(s => (
                <div key={s.id}
                  onClick={() => openSkill(s)}
                  className={`rounded-xl border p-4 cursor-pointer transition-base ${selected?.id === s.id ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted"}`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base mb-3" style={{ background: s.iconBg }}>{s.icon}</div>
                  <div className="text-xs font-semibold mb-1.5 truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.description}</div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-primary-soft flex items-center justify-center text-primary font-semibold" style={{ fontSize: 9 }}>Y</div>
                    {s.owner}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {visible.map(s => (
              <div key={s.id}
                onClick={() => openSkill(s)}
                className={`flex items-center gap-3 px-8 py-3 border-b border-border cursor-pointer transition-base ${selected?.id === s.id ? "bg-primary-soft" : "hover:bg-surface-muted"}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: s.iconBg }}>{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <div className={`border-l border-border bg-surface flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${selected ? "w-[476px]" : "w-0"}`}>
        {selected && (
          <>
            {/* Sheet topbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-muted shrink-0">
              <ChevronRight size={13} className="text-muted-foreground rotate-180" />
              <div className="flex-1" />
              <button className="icon-btn" title="Copy"><Copy size={14} /></button>
              <button className="icon-btn text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={14} /></button>
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className={`h-7 px-3 rounded-lg text-xs font-medium transition-base ${isDirty ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-primary/30 text-primary-foreground/50 cursor-not-allowed"}`}
              >
                Save Changes
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => setSelected(null)} className="icon-btn flex items-center gap-1 text-xs"><X size={12} /> Done</button>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-surface-muted shrink-0">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface border border-border">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${viewMode === "preview" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Eye size={12} /> Preview
                </button>
                <button
                  onClick={() => setViewMode("source")}
                  className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-xs font-medium transition-base ${viewMode === "source" ? "bg-surface-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Code2 size={12} /> Source
                </button>
              </div>
            </div>

            {/* Formatting toolbar — only in source mode */}
            {viewMode === "source" && (
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border shrink-0">
                <button onClick={() => wrapSelection("**")} className="icon-btn" title="Bold"><Bold size={13} /></button>
                <button onClick={() => wrapSelection("*")} className="icon-btn italic" title="Italic"><Italic size={13} /></button>
                <button onClick={() => wrapSelection("~~")} className="icon-btn" title="Strikethrough"><Strikethrough size={13} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => prependLine("# ")} className="icon-btn" title="Heading 1"><Heading1 size={13} /></button>
                <button onClick={() => prependLine("## ")} className="icon-btn" title="Heading 2"><Heading2 size={13} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => prependLine("- ")} className="icon-btn" title="Bullet list"><ListIcon size={13} /></button>
                <button onClick={() => prependLine("1. ")} className="icon-btn" title="Numbered list"><ListOrdered size={13} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => wrapSelection("`")} className="icon-btn" title="Inline code"><Code2 size={13} /></button>
                <button onClick={() => wrapSelection("```\n", "\n```")} className="icon-btn" title="Code block" style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", padding: "0 4px" }}>&lt;/&gt;</button>
              </div>
            )}

            {/* Name */}
            <div className="px-5 py-3 border-b border-border shrink-0">
              <div className="section-eyebrow mb-1">Name</div>
              <div className="text-sm font-medium">{selected.name}</div>
            </div>

            {/* Description */}
            <div className="px-5 py-3 border-b border-border shrink-0">
              <div className="section-eyebrow mb-1">Description</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{selected.description}</div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {viewMode === "preview" ? (
                <div className="px-5 py-4">{renderBody(editedBody || selected.body)}</div>
              ) : (
                <textarea
                  ref={editorRef}
                  value={editedBody}
                  onChange={e => handleBodyChange(e.target.value)}
                  className="w-full h-full resize-none bg-transparent border-none outline-none px-5 py-4 text-sm font-mono leading-relaxed text-foreground"
                  spellCheck={false}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
