// sessionStorage-backed CONSOLE-level skill store — the one true skill data model and
// persistence layer for /tools (mirrors guardrailConsoleStore.ts / knowledgeBaseStore.ts).
import { loadMap, saveMap } from "@/lib/sessionPersist";
import type { Sharing } from "./skillSharing";

export interface Skill {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  description: string;
  /** Markdown "Source" / instructions body. */
  body: string;
  ownerId: string;
  ownerName: string;
  sharing: Sharing;
  /** Agent ids currently linked to this Console skill — same convention as Guardrail's
   * attachedByAgentIds, used to warn before deleting a skill still in use by an Agent. */
  attachedByAgentIds: string[];
  createdAt: number;
  updatedAt: number;
}

const STORE_KEY = "skill_console_store_v1";
const SEEDED_KEY = "skill_console_store_seeded_v1";
const store = loadMap<string, Skill>(STORE_KEY);
const persist = () => saveMap(STORE_KEY, store);

function seed() {
  if (sessionStorage.getItem(SEEDED_KEY)) return;
  sessionStorage.setItem(SEEDED_KEY, "1");
  const now = Date.now();
  const DAY = 86_400_000;
  const put = (s: Skill) => store.set(s.id, s);

  put({
    id: "account-briefing", icon: "🗂️", iconBg: "hsl(231 90% 93%)", name: "account-briefing",
    description: `Use when the user has an upcoming meeting and needs preparation, says "brief me on," "who am I meeting with," "prep me for my call with," "what do I need to know about this account," or wants talking points, agenda suggestions, or contact on meeting attendees. Also use before any external meeting where account context would help.`,
    ownerId: "m-fsoft-ceo", ownerName: "Tran Nam", sharing: { mode: "private", people: [] }, attachedByAgentIds: [],
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
    createdAt: now - 30 * DAY, updatedAt: now - 2 * 3_600_000,
  });

  put({
    id: "competitive-intel", icon: "🏆", iconBg: "hsl(152 55% 92%)", name: "competitive-intel",
    description: `Use when the user asks "what is [competitor] doing," requests market analysis, or needs a competitive landscape summary for a specific company or product.`,
    ownerId: "m-fsoft-coo", ownerName: "Linh Phan",
    sharing: { mode: "specific", people: [{ userId: "m-fsoft-ceo", name: "Tran Nam", email: "tran.nam@fpt.com", access: "edit" }] },
    attachedByAgentIds: [],
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
    createdAt: now - 21 * DAY, updatedAt: now - 6 * 3_600_000,
  });

  put({
    id: "email-drafter", icon: "📧", iconBg: "hsl(358 75% 94%)", name: "email-drafter",
    description: `Drafts professional emails based on context. Say "draft an email to..." with any details and it will compose a context-aware draft and save it for review.`,
    ownerId: "m-fsoft-vn-1", ownerName: "Duy Nguyen", sharing: { mode: "private", people: [] }, attachedByAgentIds: [],
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
    createdAt: now - 45 * DAY, updatedAt: now - 45 * DAY,
  });

  put({
    id: "weekly-digest", icon: "📊", iconBg: "hsl(38 92% 93%)", name: "weekly-digest",
    description: `Runs every Monday. Pulls activity across calendar, Slack, and email and emails the team a summary of last week's performance and highlights.`,
    ownerId: "m-fsoft-ceo", ownerName: "Tran Nam", sharing: { mode: "all", people: [] }, attachedByAgentIds: [],
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
    createdAt: now - 12 * DAY, updatedAt: now - 3 * 3_600_000,
  });

  put({
    id: "vendor-pricing-lookup", icon: "💰", iconBg: "hsl(38 92% 93%)", name: "vendor-pricing-lookup",
    description: `Use when the user asks for current vendor pricing tiers or wants a quick comparison of publicly listed retail prices before a quote.`,
    ownerId: "m-plat-1", ownerName: "Mai Hoang",
    sharing: { mode: "specific", people: [{ userId: "m-fsoft-ceo", name: "Tran Nam", email: "tran.nam@fpt.com", access: "view" }] },
    attachedByAgentIds: [],
    body: `# Vendor Pricing Lookup

You look up publicly listed retail prices for a named vendor or product tier and summarize them for the user — never quote internal cost prices.

## Tools You Use

- \`exa_web_search\` — Vendor pricing pages
- \`read_url_content\` — Deep-read the pricing page

## Workflow

## Step 1: Identify the Vendor and Tier

Clarify which vendor, product, and tier the user is asking about.

## Step 2: Look Up Public Pricing

Search the vendor's official pricing page and read it directly.

## Step 3: Summarize

Present the publicly listed price, billing period, and any notable limits — flag if pricing wasn't publicly listed.`,
    createdAt: now - 5 * DAY, updatedAt: now - 5 * DAY,
  });

  persist();
}

export const skillStore = {
  list(): Skill[] {
    seed();
    return [...store.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Skill | undefined {
    seed();
    return store.get(id);
  },
  isDuplicateName(name: string, excludeId?: string): boolean {
    const n = name.trim().toLowerCase();
    return this.list().some(s => s.id !== excludeId && s.name.trim().toLowerCase() === n);
  },
  create(data: {
    name: string; description: string; body: string; icon?: string; iconBg?: string;
    ownerId: string; ownerName: string; sharing: Sharing;
  }): Skill {
    const id = `skill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const s: Skill = {
      id, name: data.name.trim(), description: data.description.trim(), body: data.body,
      icon: data.icon ?? "🧩", iconBg: data.iconBg ?? "hsl(231 90% 93%)",
      ownerId: data.ownerId, ownerName: data.ownerName, sharing: data.sharing,
      attachedByAgentIds: [],
      createdAt: now, updatedAt: now,
    };
    store.set(id, s);
    persist();
    return s;
  },
  update(id: string, patch: Partial<Pick<Skill, "name" | "description" | "body">>) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, ...patch, updatedAt: Date.now() });
    persist();
  },
  updateSharing(id: string, sharing: Sharing) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, sharing, updatedAt: Date.now() });
    persist();
  },
  /** Copies a skill for the current user — always private, regardless of the original's
   * sharing, so duplicating someone else's shared skill never accidentally exposes it further. */
  duplicate(id: string, ownerId: string, ownerName: string): Skill | undefined {
    const cur = store.get(id);
    if (!cur) return undefined;
    return this.create({
      name: `${cur.name} (copy)`, description: cur.description, body: cur.body,
      icon: cur.icon, iconBg: cur.iconBg, ownerId, ownerName, sharing: { mode: "private", people: [] },
    });
  },
  remove(id: string) {
    store.delete(id);
    persist();
  },
  addAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur || cur.attachedByAgentIds.includes(agentId)) return;
    store.set(id, { ...cur, attachedByAgentIds: [...cur.attachedByAgentIds, agentId] });
    persist();
  },
  removeAttachingAgent(id: string, agentId: string) {
    const cur = store.get(id);
    if (!cur) return;
    store.set(id, { ...cur, attachedByAgentIds: cur.attachedByAgentIds.filter(a => a !== agentId) });
    persist();
  },
};
