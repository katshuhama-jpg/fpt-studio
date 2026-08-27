import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Copy, Check, User, MessageSquare, Database } from "lucide-react";

const HEALTH_SAMPLE = JSON.stringify(
  {
    status: "ok",
    protocol_version: "1.0",
    requires_user_connection: true,
  },
  null,
  2,
);

const HEADER_SAMPLE = `POST /runs HTTP/1.1
Host: agent.example.com
Authorization: Bearer <workspace-token>
X-Platform-User-Token: <per-user-token>
Content-Type: application/json`;

const WHEN_EXAMPLES = [
  { icon: MessageSquare, title: "Reading a user's own calendar", body: "An agent that reads Outlook events needs to see the signed-in user's own calendar, not a shared mailbox." },
  { icon: User, title: "Posting to Slack as the user", body: "An agent that posts a Slack message should send it under that person's identity, not a generic bot account." },
  { icon: Database, title: "Per-employee data visibility", body: "An agent querying an internal system where each employee is only allowed to see their own records." },
];

const HOW_STEPS = [
  "A user opens the external agent for the first time.",
  "The platform detects the agent is missing a per-user connection.",
  "The user is invited to connect their own account.",
  "The connected token is stored per user and sent along with every run.",
];

const CHECKLIST_ITEMS = [
  "My agent's /health response includes requires_user_connection: true.",
  "My agent reads the per-user token from the X-Platform-User-Token header.",
  "My agent returns a clear \"connection required\" response when the header is missing.",
  "I've tested a run both with and without a connected per-user token.",
  "I've documented this requirement for anyone who installs this agent.",
];

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-surface-muted">
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        className="absolute top-2 right-2 flex items-center gap-1 h-7 px-2 rounded-md bg-white border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground transition-base"
      >
        {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
      </button>
      <pre className="text-[11px] font-mono p-3 pr-16 overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
}

export default function PerUserConnectorGuide() {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => setChecked(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <div className="px-8 py-8 max-w-[720px] mx-auto animate-fade-up">
      <Link to="/external-agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-base mb-4">
        <ChevronLeft size={12} /> External Agents
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1.5">Per-user Connector</h1>
        <p className="text-sm text-muted-foreground">
          Let each user connect their own account before your external agent acts on their behalf.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">When you need this</h2>
        <div className="space-y-3">
          {WHEN_EXAMPLES.map((ex, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-4">
              <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <ex.icon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{ex.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{ex.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">How it works</h2>
        <div className="rounded-xl border border-border p-4">
          <ol className="space-y-3">
            {HOW_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-surface-muted text-muted-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">What your agent must implement</h2>
        <div className="rounded-xl border border-border p-4 space-y-4">
          <ul className="space-y-2 list-disc pl-4">
            <li className="text-sm text-foreground leading-relaxed">Declare <code className="font-mono text-xs bg-surface-muted px-1 py-0.5 rounded">requires_user_connection: true</code> in your <code className="font-mono text-xs bg-surface-muted px-1 py-0.5 rounded">/health</code> response.</li>
            <li className="text-sm text-foreground leading-relaxed">Read the per-user token from the platform's request header on every run.</li>
            <li className="text-sm text-foreground leading-relaxed">Return a clear "connection required" response when that header is missing.</li>
          </ul>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Example /health response</p>
            <CopyBlock code={HEALTH_SAMPLE} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Example request header</p>
            <CopyBlock code={HEADER_SAMPLE} />
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">Checklist</h2>
        <div className="rounded-xl border border-border p-4 space-y-2.5">
          {CHECKLIST_ITEMS.map((item, i) => (
            <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggle(i)}
                className="mt-0.5 w-4 h-4 rounded accent-primary shrink-0"
              />
              <span className={`text-sm leading-relaxed transition-base ${checked.has(i) ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <Link to="/external-agents" className="btn-primary h-9">
          Back to External Agents
        </Link>
      </div>
    </div>
  );
}
