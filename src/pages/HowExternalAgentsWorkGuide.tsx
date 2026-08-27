import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Copy, Check, Shield, Radio, Database } from "lucide-react";

const HEALTH_SAMPLE = JSON.stringify(
  {
    status: "ok",
    protocolVersions: ["1"],
    name: "Flight Assistant",
    version: "2.3.1",
  },
  null,
  2,
);

const SIGNATURE_SAMPLE = `X-FPT-Signature: t=<epoch seconds>,v1=<hex hmac-sha256, lowercase>

v1 = hmac_sha256(signing_secret, t + "." + sha256_hex(raw_body))`;

const STREAM_SAMPLE = `data: {"type":"TEXT_MESSAGE_START","messageId":"a1","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"a1","delta":"Hi, "}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"a1","delta":"how can I help?"}

data: {"type":"TEXT_MESSAGE_END","messageId":"a1"}

data: {"type":"RUN_FINISHED","outcome":{"type":"success"}}`;

const ENDPOINTS = [
  { method: "POST", path: "/runs", required: true, returns: "text/event-stream", desc: "One request = one turn" },
  { method: "GET", path: "/health", required: true, returns: "application/json", desc: "Liveness + supported protocol versions" },
  { method: "GET", path: "/tools", required: false, returns: "application/json", desc: "Tool list and the credential each one needs" },
  { method: "POST", path: "/credentials", required: false, returns: "application/json", desc: "Receive a credential the user just entered" },
  { method: "POST", path: "/credentials/revoke", required: false, returns: "application/json", desc: "Remove a previously stored credential" },
];

const LIMITS = [
  { label: "Total run duration", value: "30 minutes" },
  { label: "Idle gap before disconnect", value: "30 seconds from the first frame — a \": ping\" resets this" },
  { label: "History received", value: "Up to the last 500 turns (a payload cap, not a conversation cap)" },
  { label: "Attachment URL validity", value: "7 days from first delivery, by default" },
  { label: "Signature timestamp drift", value: "300 seconds" },
];

const REQUIRED_CHECKLIST = [
  "GET /health responds with { \"status\": \"ok\", \"protocolVersions\": [\"1\"] }. No signature required; keep it lightweight.",
  "POST /runs checks Authorization and X-FPT-Signature, and rejects requests where the timestamp drifts more than 300 seconds.",
  "A runId that already completed returns the same result instead of running again.",
  "The response is Content-Type: text/event-stream, one JSON object per data: line.",
  "Every frame includes event_id, type, run_id, and timestamp.",
  "Replies follow TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT (repeated) → TEXT_MESSAGE_END.",
  "Every TEXT_MESSAGE_START and STEP_STARTED is closed before the final frame.",
  "The stream ends with RUN_FINISHED or RUN_ERROR, then closes — never just closes.",
  "A \": ping\" comment is sent at least every 15 seconds while idle.",
  "RUN_STARTED is never sent — the platform already emitted it when it opened the run.",
];

const OPTIONAL_CHECKLIST = [
  "Tool calls stream as TOOL_CALL_START / _ARGS / _END / _RESULT.",
  "Asking the user something ends the run with RUN_FINISHED and outcome.type: \"interrupt\".",
  "Files the user sends are downloaded from attachments[].url before urlExpiresAt.",
  "Per-user credentials, if needed, go through GET /tools, POST /credentials, and POST /credentials/revoke.",
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

export default function HowExternalAgentsWorkGuide() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (key: string) => setChecked(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  return (
    <div className="px-8 py-8 max-w-[720px] mx-auto animate-fade-up">
      <Link to="/external-agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-base mb-4">
        <ChevronLeft size={12} /> External Agents
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1.5">How External Agents Work</h1>
        <p className="text-sm text-muted-foreground">
          The HTTP contract your agent must implement to run on the FPT AI Platform (protocol v1).
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">The relationship</h2>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-foreground leading-relaxed mb-3">
            The platform does not run your agent — it publishes the agent, gives it a chat surface, logs the conversation,
            and calls <code className="font-mono text-xs bg-surface-muted px-1 py-0.5 rounded">POST /runs</code> once per turn.
            <strong className="font-semibold"> The platform is the client; your agent is the server.</strong>
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Your business logic, model calls, tools, and all conversation state live on your own infrastructure. The platform
            keeps none of it — it only relays each turn and displays what your agent streams back.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">Endpoints</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium px-3 py-2">Method</th>
                <th className="text-left font-medium px-3 py-2">Path</th>
                <th className="text-left font-medium px-3 py-2">Returns</th>
                <th className="text-left font-medium px-3 py-2">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((e, i) => (
                <tr key={i} className={i > 0 ? "border-t border-border" : undefined}>
                  <td className="px-3 py-2 font-mono text-xs">{e.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {e.path}
                    {!e.required && <span className="ml-1.5 text-[10px] font-sans text-muted-foreground">optional</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.returns}</td>
                  <td className="px-3 py-2 text-xs text-foreground">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
          The three optional endpoints are only needed when your agent calls APIs under a specific user's identity. Return{" "}
          <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">404</code> or{" "}
          <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">501</code> from <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">GET /tools</code>{" "}
          and the platform will never ask for a credential or call the other two.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">Authentication and signing</h2>
        <div className="rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Shield size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Every request carries a bearer token</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Sent as <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>, the same one you set when connecting the agent. It's omitted only when authentication is set to none.
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Requests to /runs, /tools, and /credentials also carry a signature</p>
            <CopyBlock code={SIGNATURE_SAMPLE} />
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
              Checking the signature is required, even when authentication is none. Reject the request with 401 if the
              timestamp is more than 300 seconds off, and compare digests with a constant-time function — never{" "}
              <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">==</code>, which leaks timing information about the correct signature one byte at a time.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">The two required endpoints</h2>
        <div className="rounded-xl border border-border p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">GET /health — no signature, polled every 30 seconds, must stay lightweight</p>
            <CopyBlock code={HEALTH_SAMPLE} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">POST /runs — a minimal streamed reply</p>
            <CopyBlock code={STREAM_SAMPLE} />
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
              Every frame is a JSON object on its own <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">data:</code> line. Tool calls, reasoning,
              file output, and interrupts (asking the user something) all stream as additional frame types on the same connection —
              the reply above is the shortest valid one.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">State, identity, and idempotency</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-border p-4">
            <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Database size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Your agent owns conversation state</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Keyed by <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">threadId</code>, stored and TTL'd by you, surviving your own deploys.
                The platform keeps none of it and has no endpoint to read it back — losing your state means starting over from the{" "}
                <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">history</code> the platform still sends.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border p-4">
            <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Radio size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">runId is your idempotency key</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                A new <code className="font-mono bg-surface-muted px-1 py-0.5 rounded">runId</code> arrives on every turn, including resumes. If one has already
                finished, return the stored result instead of running it again — the platform has no business-level retry of its own.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">Runtime limits</h2>
        <div className="rounded-xl border border-border p-4 space-y-2.5">
          {LIMITS.map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{l.label}</span>
              <span className="text-foreground text-right">{l.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">Optional add-ons</h2>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-foreground leading-relaxed">
            If your agent needs to act under a specific user's identity — reading their calendar, posting under their name — it can ask the
            user to connect an account instead of running only with workspace-wide credentials.{" "}
            <Link to="/external-agents/guides/per-user-connector" className="font-semibold text-primary hover:underline">
              See how per-user connectors work
            </Link>.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-foreground mb-3">Checklist</h2>
        <div className="rounded-xl border border-border p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Required</p>
            <div className="space-y-2.5">
              {REQUIRED_CHECKLIST.map((item, i) => {
                const key = `req-${i}`;
                return (
                  <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked.has(key)}
                      onChange={() => toggle(key)}
                      className="mt-0.5 w-4 h-4 rounded accent-primary shrink-0"
                    />
                    <span className={`text-sm leading-relaxed transition-base ${checked.has(key) ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Optional</p>
            <div className="space-y-2.5">
              {OPTIONAL_CHECKLIST.map((item, i) => {
                const key = `opt-${i}`;
                return (
                  <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked.has(key)}
                      onChange={() => toggle(key)}
                      className="mt-0.5 w-4 h-4 rounded accent-primary shrink-0"
                    />
                    <span className={`text-sm leading-relaxed transition-base ${checked.has(key) ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
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
