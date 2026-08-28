import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ChevronLeft, AlertTriangle } from "lucide-react";

const SECTIONS: { id: string; label: string }[] = [
  { id: "overview", label: "Overview and responsibilities" },
  { id: "checklist", label: "Before you submit" },
  { id: "endpoints", label: "Endpoints" },
  { id: "auth", label: "Authentication and signing" },
  { id: "identifiers", label: "Identifiers" },
  { id: "limits", label: "Limits" },
  { id: "runs-request", label: "POST /runs — the request" },
  { id: "runs-stream", label: "POST /runs — the response stream" },
  { id: "frames", label: "Frame reference" },
  { id: "interrupts", label: "Asking the user a question" },
  { id: "health", label: "GET /health" },
  { id: "per-user-connector", label: "Per-user connections and credentials" },
  { id: "attachments", label: "Files" },
  { id: "troubleshooting", label: "Troubleshooting" },
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

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-[hsl(var(--warning-soft))] px-3.5 py-3">
      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-warning" />
      <div className="text-xs text-warning leading-relaxed">{children}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted">
            {head.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i > 0 ? "border-t border-border" : undefined}>
              {r.map((c, j) => <td key={j} className="px-3 py-2 text-xs align-top">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[11px] bg-surface-muted px-1 py-0.5 rounded">{children}</code>;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mb-12">
      <h2 className="font-display text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ── Frame reference data — one row per frame type, rendered via a shared card ── */
type FrameField = { name: string; level: "MUST" | "SHOULD" | "MAY"; desc: string };
const LEVEL_CLASS: Record<string, string> = { MUST: "chip-danger", SHOULD: "chip-warning", MAY: "chip-info" };

const FRAMES: { name: string; note?: string; fields: FrameField[]; example: object }[] = [
  { name: "TEXT_MESSAGE_START", fields: [
    { name: "messageId", level: "MUST", desc: "Stable id for this message — must be closed by a matching END before the run finishes." },
    { name: "role", level: "MUST", desc: "Always \"assistant\"." },
  ], example: { event_id: "e1", type: "TEXT_MESSAGE_START", run_id: "r1", timestamp: 1735689600, messageId: "m1", role: "assistant" } },
  { name: "TEXT_MESSAGE_CONTENT", fields: [
    { name: "messageId", level: "MUST", desc: "Matches the open TEXT_MESSAGE_START." },
    { name: "delta", level: "MUST", desc: "Text fragment to append to the message." },
  ], example: { event_id: "e2", type: "TEXT_MESSAGE_CONTENT", run_id: "r1", timestamp: 1735689601, messageId: "m1", delta: "Hi, how can I help?" } },
  { name: "TEXT_MESSAGE_END", fields: [
    { name: "messageId", level: "MUST", desc: "Closes the message opened by TEXT_MESSAGE_START." },
  ], example: { event_id: "e3", type: "TEXT_MESSAGE_END", run_id: "r1", timestamp: 1735689602, messageId: "m1" } },
  { name: "TOOL_CALL_START", fields: [
    { name: "toolCallId", level: "MUST", desc: "Stable id for this call — closed by a matching END." },
    { name: "toolName", level: "MUST", desc: "Name of the tool being invoked." },
  ], example: { event_id: "e4", type: "TOOL_CALL_START", run_id: "r1", timestamp: 1735689603, toolCallId: "t1", toolName: "search_flights" } },
  { name: "TOOL_CALL_ARGS", note: "delta is a STRING fragment of JSON, not an object — concatenate fragments, then JSON.parse the result once the call ends.", fields: [
    { name: "toolCallId", level: "MUST", desc: "Matches the open TOOL_CALL_START." },
    { name: "delta", level: "MUST", desc: "A string fragment of the arguments JSON, not a parsed object." },
  ], example: { event_id: "e5", type: "TOOL_CALL_ARGS", run_id: "r1", timestamp: 1735689604, toolCallId: "t1", delta: "{\"from\":\"HAN\"" } },
  { name: "TOOL_CALL_END", fields: [
    { name: "toolCallId", level: "MUST", desc: "Closes the call — arguments should now be complete, valid JSON once concatenated." },
  ], example: { event_id: "e6", type: "TOOL_CALL_END", run_id: "r1", timestamp: 1735689605, toolCallId: "t1" } },
  { name: "TOOL_CALL_RESULT", fields: [
    { name: "toolCallId", level: "MUST", desc: "Which call this result belongs to." },
    { name: "content", level: "MUST", desc: "The tool's result, typically a JSON string." },
  ], example: { event_id: "e7", type: "TOOL_CALL_RESULT", run_id: "r1", timestamp: 1735689606, toolCallId: "t1", content: "{\"flights\":3}" } },
  { name: "REASONING_MESSAGE_START", fields: [
    { name: "messageId", level: "MAY", desc: "Stable id for a reasoning block, closed by a matching END." },
  ], example: { event_id: "e8", type: "REASONING_MESSAGE_START", run_id: "r1", timestamp: 1735689607, messageId: "rs1" } },
  { name: "REASONING_MESSAGE_CONTENT", fields: [
    { name: "delta", level: "MAY", desc: "Text fragment of the reasoning trace." },
  ], example: { event_id: "e9", type: "REASONING_MESSAGE_CONTENT", run_id: "r1", timestamp: 1735689608, messageId: "rs1", delta: "Checking fare rules..." } },
  { name: "REASONING_MESSAGE_END", fields: [
    { name: "messageId", level: "MAY", desc: "Closes the reasoning block." },
  ], example: { event_id: "e10", type: "REASONING_MESSAGE_END", run_id: "r1", timestamp: 1735689609, messageId: "rs1" } },
  { name: "STEP_STARTED", fields: [
    { name: "stepId", level: "SHOULD", desc: "Stable id for a named step — must be closed by a matching STEP_FINISHED before the terminal frame." },
    { name: "name", level: "SHOULD", desc: "Human-readable step label shown in the UI." },
  ], example: { event_id: "e11", type: "STEP_STARTED", run_id: "r1", timestamp: 1735689610, stepId: "s1", name: "Searching flights" } },
  { name: "STEP_FINISHED", fields: [
    { name: "stepId", level: "SHOULD", desc: "Closes the step opened by STEP_STARTED." },
  ], example: { event_id: "e12", type: "STEP_FINISHED", run_id: "r1", timestamp: 1735689611, stepId: "s1" } },
  { name: "ACTIVITY_SNAPSHOT", fields: [
    { name: "activity", level: "MAY", desc: "The full current activity object — a lightweight progress feed distinct from conversation state." },
  ], example: { event_id: "e13", type: "ACTIVITY_SNAPSHOT", run_id: "r1", timestamp: 1735689612, activity: { step: "searching", progress: 0.2 } } },
  { name: "ACTIVITY_DELTA", note: "Uses a field named \"patch\" (RFC 6902 JSON Patch) against the last ACTIVITY_SNAPSHOT — not \"delta\".", fields: [
    { name: "patch", level: "MAY", desc: "An RFC 6902 JSON Patch array to apply to the last activity snapshot." },
  ], example: { event_id: "e14", type: "ACTIVITY_DELTA", run_id: "r1", timestamp: 1735689613, patch: [{ op: "replace", path: "/progress", value: 0.6 }] } },
  { name: "STATE_SNAPSHOT", fields: [
    { name: "state", level: "MAY", desc: "The full current conversation state your agent wants the platform to know about (e.g. artifacts/files)." },
  ], example: { event_id: "e15", type: "STATE_SNAPSHOT", run_id: "r1", timestamp: 1735689614, state: { artifacts: [] } } },
  { name: "STATE_DELTA", note: "Uses a field named \"delta\" (RFC 6902 JSON Patch) against the last STATE_SNAPSHOT — not \"patch\".", fields: [
    { name: "delta", level: "MAY", desc: "An RFC 6902 JSON Patch array to apply to the last state snapshot." },
  ], example: { event_id: "e16", type: "STATE_DELTA", run_id: "r1", timestamp: 1735689615, delta: [{ op: "add", path: "/artifacts/-", value: { name: "report.pdf" } }] } },
  { name: "CUSTOM", fields: [
    { name: "name", level: "MAY", desc: "Your own frame type, e.g. \"file\" for an outbound generated file." },
    { name: "value", level: "MAY", desc: "Arbitrary payload for that custom frame." },
  ], example: { event_id: "e17", type: "CUSTOM", run_id: "r1", timestamp: 1735689616, name: "file", value: { url: "https://agent.example.com/files/report.pdf" } } },
  { name: "RUN_FINISHED", fields: [
    { name: "outcome", level: "MUST", desc: "{ type: \"success\" } or { type: \"interrupt\", interrupts: [...] }." },
  ], example: { event_id: "e18", type: "RUN_FINISHED", run_id: "r1", timestamp: 1735689617, outcome: { type: "success" } } },
  { name: "RUN_ERROR", fields: [
    { name: "message", level: "MUST", desc: "Human-readable error description." },
    { name: "code", level: "SHOULD", desc: "A short machine-readable error code." },
  ], example: { event_id: "e19", type: "RUN_ERROR", run_id: "r1", timestamp: 1735689618, message: "Upstream booking API timed out.", code: "UPSTREAM_TIMEOUT" } },
];

/* ── Interrupt kinds ── */
const INTERRUPT_KINDS: { kind: string; renders: string; field: string; example: object }[] = [
  { kind: "approval", renders: "Yes/No confirmation card", field: "message", example: { type: "approval", message: "Cancel this booking and issue a refund?" } },
  { kind: "choice", renders: "A list of selectable options", field: "options", example: { type: "choice", message: "Which seat would you like?", options: ["12A", "12B", "14C"] } },
  { kind: "input", renders: "A free-text input field", field: "message", example: { type: "input", message: "What's the passenger's full name?" } },
  { kind: "review", renders: "An editable form, one field per key in args", field: "args", example: { type: "review", message: "Confirm the booking details", args: { passenger: "Nguyen Van A", seat: "12A", extraBags: 1 } } },
  { kind: "authorization", renders: "A \"Sign in\" card linking out to authorizeUrl", field: "authorizeUrl", example: { type: "authorization", message: "Connect your calendar to continue", authorizeUrl: "https://agent.example.com/oauth/start?state=abc123" } },
];

export default function ExternalAgentIntegrationGuide() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="px-8 py-8 max-w-[1180px] mx-auto animate-fade-up">
      <Link to="/external-agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-base mb-4">
        <ChevronLeft size={12} /> External Agents
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1.5">External Agent integration guide</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          The fpt-v1 HTTP contract your agent must implement to run on the FPT AI Platform.
        </p>
      </div>

      <div className="flex gap-10 items-start">
        <aside className="hidden lg:block w-[240px] shrink-0 sticky top-8 self-start">
          <nav className="space-y-0.5">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block px-2.5 py-1.5 rounded-lg text-xs transition-base leading-snug ${
                  activeId === s.id ? "bg-primary-soft text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 max-w-[760px]">
          <Section id="overview" title="Overview and responsibilities">
            <p className="text-sm text-foreground leading-relaxed">
              The FPT Agent Platform is the <strong>client</strong>; your external agent is the <strong>server</strong>. The platform publishes
              the agent, gives it a chat surface across channels, logs every conversation, and calls <Code>POST /runs</Code> once per turn.
              Your business logic, runtime, model calls, tools, and all conversation state live on your own infrastructure — the platform keeps none of it.
            </p>
            <Table
              head={["FPT Agent Platform does", "You must do"]}
              rows={[
                ["Publishes the agent to Web, Zalo, Messenger, Slack, Teams, API, Workspace", "Implement /runs, /health, and stream valid frames back"],
                ["Renders the chat UI and displays streamed frames", "Own conversation state, keyed by threadId"],
                ["Logs conversations for History", "Verify every request's signature"],
                ["Sends attachments the user uploaded, with short-lived URLs", "Download attachments before urlExpiresAt if you need them"],
                ["Retries nothing on your behalf", "Return the cached result for a runId that already completed"],
              ]}
            />
            <Callout>
              Two things people get wrong: frames are for <strong>display</strong>, not storage — the platform does not persist your
              agent's state for you. And one turn = one request — there is no side channel to push extra messages outside a /runs call.
            </Callout>
          </Section>

          <Section id="checklist" title="Before you submit">
            <ChecklistBlock />
          </Section>

          <Section id="endpoints" title="Endpoints">
            <Table
              head={["Method", "Path", "Response", "Purpose", "Required"]}
              rows={[
                ["POST", <span className="font-mono">{"{base}/runs"}</span>, "text/event-stream", "Runs one turn of the conversation.", "Required"],
                ["GET", <span className="font-mono">{"{base}/health"}</span>, "application/json", "Liveness and supported protocol versions.", "Required"],
                ["GET", <span className="font-mono">{"{base}/tools"}</span>, "application/json", "Declares tools and any per-user credential each one needs.", "Optional"],
                ["POST", <span className="font-mono">{"{base}/credentials"}</span>, "application/json", "Receives a credential the user just entered.", "Optional"],
                ["POST", <span className="font-mono">{"{base}/credentials/revoke"}</span>, "application/json", "Deletes a previously stored credential.", "Optional"],
              ]}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Returning <Code>404</Code> or <Code>501</Code> from <Code>GET /tools</Code> tells the platform your agent has no
              per-user credential needs — it will never call the other two endpoints or ask a user to connect anything.
            </p>
          </Section>

          <Section id="auth" title="Authentication and request signing">
            <Table
              head={["Endpoint", "Authorization", "X-FPT-Signature", "Content-Type", "Accept", "If-None-Match"]}
              rows={[
                ["POST /runs", "Bearer token, or omitted if auth is none", "Required", "application/json", "text/event-stream", "—"],
                ["GET /health", "—", "Not required", "—", "application/json", "Optional"],
                ["GET /tools", "Bearer token, or omitted", "Required", "—", "application/json", "Optional"],
                ["POST /credentials", "Bearer token, or omitted", "Required", "application/json", "application/json", "—"],
                ["POST /credentials/revoke", "Bearer token, or omitted", "Required", "application/json", "application/json", "—"],
              ]}
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Signature format</p>
              <CopyBlock code={`X-FPT-Signature: t=<epoch second>,v1=<lowercase hex hmac-sha256>\n\nv1 = hmac_sha256(signing_secret, t + "." + sha256_hex(raw_body))`} />
            </div>
            <ul className="space-y-1.5 list-disc pl-4">
              <li className="text-sm text-foreground leading-relaxed">Signature verification is <strong>mandatory even when auth is "none"</strong> — it's the only thing proving a request came from the platform.</li>
              <li className="text-sm text-foreground leading-relaxed">Reject any request where <Code>t</Code> is more than <strong>300 seconds</strong> off from your clock, with <Code>401</Code>.</li>
              <li className="text-sm text-foreground leading-relaxed">Compare digests in constant time (<Code>hmac.compare_digest</Code> / <Code>crypto.timingSafeEqual</Code>) — never with <Code>==</Code>, which leaks timing information one byte at a time.</li>
              <li className="text-sm text-foreground leading-relaxed"><Code>raw_body</Code> is the exact bytes received — re-serializing the parsed JSON before hashing changes the digest and fails verification.</li>
              <li className="text-sm text-foreground leading-relaxed">An empty body hashes to <span className="font-mono text-[11px] break-all">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>.</li>
              <li className="text-sm text-foreground leading-relaxed">The signing secret is <strong>separate</strong> from the bearer token — rotating one never affects the other.</li>
            </ul>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Node.js verification</p>
                <CopyBlock code={`const crypto = require("crypto");\n\nfunction verify(header, rawBody, secret) {\n  const [tPart, vPart] = header.split(",");\n  const t = Number(tPart.split("=")[1]);\n  const sig = vPart.split("=")[1];\n  if (Math.abs(Date.now() / 1000 - t) > 300) return false;\n  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");\n  const expected = crypto.createHmac("sha256", secret)\n    .update(\`\${t}.\${bodyHash}\`).digest("hex");\n  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));\n}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Python verification</p>
                <CopyBlock code={`import hmac, hashlib, time\n\ndef verify(header, raw_body, secret):\n    parts = dict(p.split("=") for p in header.split(","))\n    t, sig = int(parts["t"]), parts["v1"]\n    if abs(time.time() - t) > 300:\n        return False\n    body_hash = hashlib.sha256(raw_body).hexdigest()\n    msg = f"{t}.{body_hash}".encode()\n    expected = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()\n    return hmac.compare_digest(sig, expected)`} />
              </div>
            </div>
          </Section>

          <Section id="identifiers" title="Identifiers">
            <Table
              head={["Identifier", "Format", "Carried by", "Stability", "Keys"]}
              rows={[
                ["agentId", "String", "Every request", "Stable for the life of the connection", "Which agent config to run"],
                ["userId", "String, may be absent", "RunRequest", "Stable per platform user", "Per-user credentials and personalization"],
                ["workspaceId", "String", "Every request", "Stable for the life of the workspace", "Tenant isolation"],
                ["threadId", "String", "RunRequest", "Stable for the life of the conversation", "Your agent's own conversation state"],
                ["runId", "String", "RunRequest", "New per turn, including resumes", "Idempotency — re-running must return the cached result"],
              ]}
            />
            <Callout>
              All ids are sent as <strong>strings</strong> and must never be parsed as numbers — 63-bit values exceed
              JavaScript's safe integer range (2^53), and <Code>JSON.parse</Code> silently rounds them, which can collapse two
              different ids into one. A missing <Code>userId</Code> means there is no real person behind the turn — never
              substitute a placeholder value for it.
            </Callout>
          </Section>

          <Section id="limits" title="Limits">
            <Table
              head={["Limit", "Value"]}
              rows={[
                ["Total run duration", "30 minutes"],
                ["Idle gap before disconnect", "30 seconds from the first frame — reset by a \": ping\" comment, which is why you should ping at least every 15s"],
                ["History received", "Up to the 500 most recent turns — a payload cap, not a conversation cap"],
                ["Attachment URL validity", "7 days from first upload"],
                ["Signature timestamp skew", "300 seconds"],
              ]}
            />
          </Section>

          <Section id="runs-request" title="POST /runs — the request">
            <Table
              head={["Field", "Required", "Description"]}
              rows={[
                ["protocolVersion", "Required", "The protocol version this request uses (currently \"1\")."],
                ["runId", "Required", "Idempotency key for this turn."],
                ["threadId", "Required", "Which conversation this turn belongs to."],
                ["agentId", "Required", "Which agent configuration to run."],
                ["workspaceId", "Required", "Tenant this request belongs to."],
                ["userId", "Optional", "The platform user behind this turn, if any."],
                ["input", "Required on a normal turn", "The user's Message for this turn."],
                ["attachments", "Optional", "Files the user sent with this turn."],
                ["history", "Required", "Prior Messages in this thread, capped at 500 turns."],
                ["resume", "Required when answering an interrupt", "A ResumeInput carrying the user's answer."],
              ]}
            />
            <Table
              head={["Type", "Fields"]}
              rows={[
                ["Message", "role (\"user\" | \"assistant\"), content (string), attachments (optional)"],
                ["ResumeInput", "interruptId (string), value (shape depends on the interrupt kind that was answered)"],
                ["Attachment", "id, name, mimeType, url, urlExpiresAt"],
              ]}
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">A normal turn</p>
              <CopyBlock code={JSON.stringify({
                protocolVersion: "1", runId: "run_9f2a", threadId: "th_1042", agentId: "agent_flight_assist",
                workspaceId: "ws_abc", userId: "user_881",
                input: { role: "user", content: "Book a round trip to Da Nang next Friday" },
                attachments: [], history: [],
              }, null, 2)} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">A turn answering an interrupt</p>
              <CopyBlock code={JSON.stringify({
                protocolVersion: "1", runId: "run_9f2b", threadId: "th_1042", agentId: "agent_flight_assist",
                workspaceId: "ws_abc", userId: "user_881",
                resume: { interruptId: "int_77", value: { approved: true } },
                history: [{ role: "assistant", content: "Cancel this booking and issue a refund?" }],
              }, null, 2)} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Code>runId</Code> is your idempotency key: if a <Code>runId</Code> has already completed, return the earlier
              result instead of running it again — the platform retries at the transport level, not at the business level.
            </p>
          </Section>

          <Section id="runs-stream" title="POST /runs — the response stream">
            <Table
              head={["Envelope field", "Description"]}
              rows={[
                ["event_id", "Unique id for this frame."],
                ["type", "The frame type, e.g. TEXT_MESSAGE_CONTENT."],
                ["run_id", "Echoes the run this frame belongs to."],
                ["timestamp", "Epoch seconds when the frame was emitted."],
                ["messageId / threadId", "Present on frames scoped to a specific message or thread."],
              ]}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Envelope fields are <strong>snake_case</strong>; type-specific fields are <strong>camelCase</strong>. Never send{" "}
              <Code>RUN_STARTED</Code> — the platform already emits it the moment it opens the connection to your agent.
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Minimal working stream</p>
              <CopyBlock code={`data: {"event_id":"e1","type":"TEXT_MESSAGE_START","run_id":"r1","timestamp":1735689600,"messageId":"m1","role":"assistant"}\n\ndata: {"event_id":"e2","type":"TEXT_MESSAGE_CONTENT","run_id":"r1","timestamp":1735689601,"messageId":"m1","delta":"Hi, how can I help?"}\n\ndata: {"event_id":"e3","type":"TEXT_MESSAGE_END","run_id":"r1","timestamp":1735689602,"messageId":"m1"}\n\ndata: {"event_id":"e4","type":"RUN_FINISHED","run_id":"r1","timestamp":1735689603,"outcome":{"type":"success"}}`} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              See the <a href="#frames" className="font-semibold text-primary hover:underline">Frame reference</a> below for MUST / SHOULD / MAY levels and required fields per frame.
            </p>
          </Section>

          <Section id="frames" title="Frame reference">
            <div className="space-y-5">
              {FRAMES.map(f => (
                <div key={f.name} className="rounded-xl border border-border p-4">
                  <p className="font-mono text-sm font-semibold text-foreground mb-1">{f.name}</p>
                  {f.note && <p className="text-xs text-warning leading-relaxed mb-2">{f.note}</p>}
                  <div className="space-y-1 mb-3">
                    {f.fields.map(fld => (
                      <div key={fld.name} className="flex items-start gap-2 text-xs">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${LEVEL_CLASS[fld.level]}`}>{fld.level}</span>
                        <span className="font-mono text-foreground shrink-0">{fld.name}</span>
                        <span className="text-muted-foreground">{fld.desc}</span>
                      </div>
                    ))}
                  </div>
                  <CopyBlock code={JSON.stringify(f.example)} />
                </div>
              ))}
            </div>
            <Callout>
              Two easy mistakes: <Code>TOOL_CALL_ARGS.delta</Code> is a <strong>string</strong> fragment of JSON, not an
              object — concatenate before parsing. And <Code>ACTIVITY_DELTA</Code> uses a field named <Code>patch</Code> while{" "}
              <Code>STATE_DELTA</Code> uses one named <Code>delta</Code> — both are RFC 6902 JSON Patch, just under different field names.
            </Callout>
          </Section>

          <Section id="interrupts" title="Asking the user a question">
            <p className="text-sm text-foreground leading-relaxed">
              A turn pauses by ending with <Code>RUN_FINISHED</Code> and <Code>outcome.type: "interrupt"</Code>. The platform
              only ever reads <Code>interrupts[0]</Code> — to ask several things at once, use a single <strong>review</strong>{" "}
              interrupt with several items rather than multiple interrupts.
            </p>
            <Table
              head={["Kind", "Renders as", "Key field"]}
              rows={INTERRUPT_KINDS.map(k => [<span className="font-mono">{k.kind}</span>, k.renders, <span className="font-mono">{k.field}</span>])}
            />
            <div className="space-y-3">
              {INTERRUPT_KINDS.map(k => (
                <div key={k.kind}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 font-mono">{k.kind}</p>
                  <CopyBlock code={JSON.stringify(k.example, null, 2)} />
                </div>
              ))}
            </div>
            <Callout>
              A login card is a phishing vector, so <Code>authorization</Code> interrupts are constrained: <Code>authorizeUrl</Code>{" "}
              is mandatory, must be <strong>https</strong>, must not embed credentials, its host must not be a bare IP, and its
              host must be on the allowlist declared at onboarding. Violating any of these fails the turn.
            </Callout>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For a <Code>review</Code> interrupt, the edit form is derived from the <strong>types</strong> of the values in{" "}
              <Code>args</Code> — a string renders a text field, a number a numeric field, a boolean a toggle — so the shape of{" "}
              <Code>args</Code> determines the shape of the form your user sees.
            </p>
          </Section>

          <Section id="health" title="GET /health">
            <Table
              head={["Field", "Description"]}
              rows={[
                ["status", "\"ok\" when the agent is ready to receive runs."],
                ["protocolVersions", "Array of protocol versions this agent supports, e.g. [\"1\"]."],
                ["name", "Optional display name."],
                ["version", "Optional agent build/version string."],
              ]}
            />
            <CopyBlock code={JSON.stringify({ status: "ok", protocolVersions: ["1"], name: "Flight Assistant", version: "2.3.1" }, null, 2)} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Not HMAC-signed, and polled every 30 seconds — keep it cheap: no model call, no database query, just a liveness check.
            </p>
          </Section>

          <Section id="per-user-connector" title="Per-user connections and credentials">
            <p className="text-sm text-foreground leading-relaxed">
              Use a per-user connector when your agent needs to act under a specific person's identity rather than a shared
              workspace credential — reading a user's own calendar, posting to Slack as them, or enforcing per-employee data
              visibility. Without one, every user shares the same workspace-wide credential.
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              End to end: <Code>GET /tools</Code> declares each tool and the credential fields it needs. The platform renders
              that form to the user, and sends what they typed once via <Code>POST /credentials</Code>, keyed by{" "}
              <Code>(userId, toolName)</Code> — <strong>workspaceId is deliberately not part of the key</strong>, since the
              same person's credential should follow them across workspaces they belong to. <Code>POST /credentials/revoke</Code>{" "}
              deletes it. <Code>POST /runs</Code> never carries credentials — your agent is the party that stores, uses, and
              deletes them.
            </p>
            <Table
              head={["Endpoint", "Request", "2xx", "4xx / 5xx"]}
              rows={[
                ["GET /tools", "No body", "200 with a tools array; 404 or 501 to opt out entirely", "5xx — platform retries later"],
                ["POST /credentials", "{ userId, toolName, fields: {...} }", "200/201 stored", "400 invalid fields, 401 signature failed"],
                ["POST /credentials/revoke", "{ userId, toolName }", "200/204 deleted", "404 nothing to revoke"],
              ]}
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Example GET /tools response</p>
              <CopyBlock code={JSON.stringify({
                tools: [{ name: "read_calendar", requiresCredential: true, credentialFields: [{ key: "accessToken", label: "Calendar access token", type: "string" }] }],
              }, null, 2)} />
            </div>
            <Callout>
              A declared-but-non-compliant per-user connector is a <strong>warning</strong>, not a failure — the connection
              check still lets you save a Draft and fix it afterwards.
            </Callout>
          </Section>

          <Section id="attachments" title="Files">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Inbound</p>
              <ul className="space-y-1.5 list-disc pl-4">
                <li className="text-sm text-foreground leading-relaxed">Download <Code>attachments[].url</Code> before <Code>urlExpiresAt</Code> — it will 403 afterward and is never reissued.</li>
                <li className="text-sm text-foreground leading-relaxed">Dedupe on <Code>id</Code>, never on <Code>url</Code> or <Code>name</Code> — those can repeat across turns.</li>
                <li className="text-sm text-foreground leading-relaxed">The URL needs no <Code>Authorization</Code> header — never log or forward it, treat it as a bearer credential in itself.</li>
                <li className="text-sm text-foreground leading-relaxed">Never trust the declared name or mime type — sanitize the name before writing to disk and sniff the content yourself.</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Outbound</p>
              <ul className="space-y-1.5 list-disc pl-4">
                <li className="text-sm text-foreground leading-relaxed">Your agent hosts its own generated files and returns a browser-reachable URL via a <Code>STATE_SNAPSHOT</Code> <Code>artifacts</Code>/<Code>files</Code> field, or a <Code>CUSTOM</Code> <span className="font-mono">"file"</span> frame.</li>
                <li className="text-sm text-foreground leading-relaxed">Write both <Code>artifacts</Code> and <Code>files</Code> for it to show up in both the conversation timeline and the Files tab.</li>
                <li className="text-sm text-foreground leading-relaxed">Only binary files belong there — text output should stream through <Code>TEXT_MESSAGE_CONTENT</Code> instead.</li>
              </ul>
            </div>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <Table
              head={["Symptom", "Likely cause", "Fix"]}
              rows={[
                ["401 on every request", "Clock skew over 300s, or the body was re-serialized before hashing", "Sync your server clock; hash the exact raw bytes received"],
                ["Run is cut off around 30s", "No \": ping\" sent while idle", "Send a \": ping\" comment at least every 15 seconds"],
                ["Reply never renders", "Stream closed without RUN_FINISHED or RUN_ERROR", "Always terminate with one of the two before closing the connection"],
                ["Duplicated or corrupted output", "RUN_STARTED was sent", "Never emit RUN_STARTED — the platform already did"],
                ["Two users' conversations bleed together", "Ids were parsed as numbers and collided", "Keep all ids as strings end to end"],
                ["Interrupt card fails to render", "An unknown kind, or an authorizeUrl that breaks the allowlist rules", "Use one of the five documented kinds; check the authorizeUrl constraints"],
                ["Attachments return 403", "The URL expired and was never reissued", "Download attachments immediately, before urlExpiresAt"],
              ]}
            />
          </Section>

          <div className="flex justify-center pt-2">
            <Link to="/external-agents" className="btn-primary h-9">
              Back to External Agents
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistBlock() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setChecked(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const REQUIRED = [
    "GET /health returns { \"status\": \"ok\", \"protocolVersions\": [\"1\"] }, unsigned, light, polled every 30s.",
    "POST /runs verifies Authorization and X-FPT-Signature and rejects a timestamp skew over 300s.",
    "A finished runId returns the cached result instead of re-running.",
    "Responds with Content-Type: text/event-stream, one JSON object per data: line.",
    "Every frame carries event_id, type, run_id, timestamp.",
    "Answers stream as TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT× → TEXT_MESSAGE_END.",
    "Every TEXT_MESSAGE_START and STEP_STARTED is closed before the terminal frame.",
    "The stream ends with RUN_FINISHED or RUN_ERROR before the connection closes.",
    "Sends \": ping\" at least every 15s while idle.",
    "Never sends RUN_STARTED.",
    "Keeps its own context and state keyed by threadId.",
  ];
  const OPTIONAL = [
    "Tool calls.",
    "Asking the user a question via an interrupt.",
    "Downloading user attachments before they expire.",
    "Per-user credentials.",
  ];

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Required</p>
        <div className="space-y-2.5">
          {REQUIRED.map((item, i) => {
            const key = `req-${i}`;
            return (
              <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={checked.has(key)} onChange={() => toggle(key)} className="mt-0.5 w-4 h-4 rounded accent-primary shrink-0" />
                <span className={`text-sm leading-relaxed transition-base ${checked.has(key) ? "text-muted-foreground line-through" : "text-foreground"}`}>{item}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Optional</p>
        <div className="space-y-2.5">
          {OPTIONAL.map((item, i) => {
            const key = `opt-${i}`;
            return (
              <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={checked.has(key)} onChange={() => toggle(key)} className="mt-0.5 w-4 h-4 rounded accent-primary shrink-0" />
                <span className={`text-sm leading-relaxed transition-base ${checked.has(key) ? "text-muted-foreground line-through" : "text-foreground"}`}>{item}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
