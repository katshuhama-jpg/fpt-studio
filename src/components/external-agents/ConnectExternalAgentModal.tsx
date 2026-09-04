import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Eye, EyeOff, Loader2, AlertTriangle, Copy } from "lucide-react";
import {
  externalAgentStore, runValidation, type AuthMethod, type ExternalAgent, type ValidationResult,
} from "./externalAgentStore";
import { RotateSigningSecretDialog } from "./ExternalAgentDialogs";

const NAME_MIN = 3;
const NAME_MAX = 60;
const DESC_MAX = 200;
const TOKEN_MIN = 10;
const EXISTING_TOKEN_SENTINEL = "__existing_token__";

type Step = "connection" | "validate";

interface CheckRow {
  key: string;
  label: string;
  pass: boolean;
  warn?: boolean;
  message: string;
}

function buildCheckRows(v: ValidationResult, authMethod: AuthMethod): CheckRow[] {
  const rows: CheckRow[] = [];
  rows.push({
    key: "endpoint", label: "Endpoint reachable", pass: v.endpointReachable,
    message: v.endpointReachable ? "The agent responded to a health check." : "We couldn't reach the URL. Check the address and that the agent is running.",
  });
  if (!v.endpointReachable) return rows;
  rows.push({
    key: "auth",
    label: authMethod === "none" ? "Request signature verified" : "Authentication verified",
    pass: v.authVerified,
    message: v.authVerified
      ? (authMethod === "none" ? "The request signature (HMAC) was verified." : "The bearer token was accepted.")
      : (authMethod === "none" ? "The request signature wasn't verified. Make sure your agent checks X-FPT-Signature." : "The bearer token wasn't accepted. Check the token and try again."),
  });
  if (!v.authVerified) return rows;
  rows.push({ key: "protocol", label: "Protocol version supported", pass: true, message: "Compatible with this platform's agent protocol." });
  rows.push({ key: "runs", label: "/runs endpoint available", pass: true, message: "The agent can accept run requests." });
  return rows;
}

function validateBaseUrl(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return "Base URL is required.";
  let url: URL;
  try { url = new URL(v); } catch { return "Enter a valid HTTPS URL, for example https://agent.example.com"; }
  if (url.protocol !== "https:") return "The base URL must start with https://.";
  if (url.username || url.password) return "The base URL must not contain a username or password.";
  const host = url.hostname;
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isBareIpv6 = host.includes(":");
  if (isIpv4 || isBareIpv6) return "The base URL must use a domain name, not a bare IP address.";
  if (v.endsWith("/")) return "Enter a valid HTTPS URL, for example https://agent.example.com";
  if (url.search) return "Enter a valid HTTPS URL, for example https://agent.example.com";
  return undefined;
}

function maskSecret(secret: string): string {
  return "•".repeat(Math.min(secret.length, 32));
}

export default function ConnectExternalAgentModal({ open, onClose, existing, onSaved }: {
  open: boolean;
  onClose: () => void;
  existing?: ExternalAgent;
  /** unpublished is true when saving this edit just knocked a Published agent back to Draft
   * (see externalAgentStore.update) — irrelevant for a brand-new connection. */
  onSaved: (agent: ExternalAgent, isNew: boolean, unpublished?: boolean) => void;
}) {
  const editing = !!existing;
  const [step, setStep] = useState<Step>("connection");
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(existing?.authMethod ?? "bearer");
  const [replacingToken, setReplacingToken] = useState(!editing);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [signingSecret, setSigningSecret] = useState(existing?.signingSecret ?? "");
  const [errors, setErrors] = useState<{ name?: string; baseUrl?: string; token?: string }>({});
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const [checking, setChecking] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [result, setResult] = useState<ValidationResult | null>(existing?.lastValidation ?? null);

  const nameRef = useRef<HTMLInputElement>(null);
  const baseUrlRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("connection");
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
    setBaseUrl(existing?.baseUrl ?? "");
    setAuthMethod(existing?.authMethod ?? "bearer");
    setReplacingToken(!editing);
    setToken("");
    setShowToken(false);
    setShowSecret(false);
    setSigningSecret(existing?.signingSecret ?? "");
    setErrors({});
    setChecking(false);
    setRevealCount(0);
    setResult(existing?.lastValidation ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  const isDirty = editing
    ? name.trim() !== existing!.name || description.trim() !== existing!.description || baseUrl.trim() !== existing!.baseUrl
      || authMethod !== existing!.authMethod || (replacingToken && token.trim() !== "")
    : name.trim() !== "" || description.trim() !== "" || baseUrl.trim() !== "" || token.trim() !== "";

  const requestClose = () => {
    if (isDirty) setConfirmCloseOpen(true);
    else onClose();
  };

  const validateField = (field: "name" | "baseUrl" | "token"): string | undefined => {
    if (field === "name") {
      const v = name.trim();
      if (!v) return "Agent name is required.";
      if (v.length < NAME_MIN || v.length > NAME_MAX) return `Agent name must be between ${NAME_MIN} and ${NAME_MAX} characters.`;
      if (externalAgentStore.isDuplicateName(v, existing?.id)) return "An external agent with this name already exists.";
      return undefined;
    }
    if (field === "baseUrl") return validateBaseUrl(baseUrl);
    if (field === "token") {
      if (authMethod === "none") return undefined;
      if (!replacingToken) return undefined;
      const v = token.trim();
      if (!v) return "Bearer Token is required.";
      if (v.length < TOKEN_MIN) return `Bearer Token must be at least ${TOKEN_MIN} characters.`;
      return undefined;
    }
    return undefined;
  };

  const validateAll = () => ({
    name: validateField("name"),
    baseUrl: validateField("baseUrl"),
    token: validateField("token"),
  });

  const clearError = (field: "name" | "baseUrl" | "token") => {
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }));
  };

  const runChecking = (v: ValidationResult) => {
    setChecking(true);
    setRevealCount(0);
    const rows = buildCheckRows(v, authMethod);
    rows.forEach((_, i) => {
      setTimeout(() => setRevealCount(c => Math.max(c, i + 1)), (i + 1) * 450);
    });
    setTimeout(() => setChecking(false), (rows.length + 1) * 450);
  };

  const handleValidateClick = () => {
    const e = validateAll();
    setErrors(e);
    if (e.name) { nameRef.current?.focus(); nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (e.baseUrl) { baseUrlRef.current?.focus(); baseUrlRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (e.token) { tokenRef.current?.focus(); tokenRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    const effectiveToken = authMethod === "none" ? "" : replacingToken ? token.trim() : EXISTING_TOKEN_SENTINEL;
    const v = runValidation(baseUrl.trim(), effectiveToken);
    setResult(v);
    setStep("validate");
    runChecking(v);
  };

  const retryCheck = () => {
    const effectiveToken = authMethod === "none" ? "" : replacingToken ? token.trim() : EXISTING_TOKEN_SENTINEL;
    const v = runValidation(baseUrl.trim(), effectiveToken);
    setResult(v);
    runChecking(v);
  };

  const save = () => {
    if (!result?.passed) return;
    if (editing) {
      const { unpublished } = externalAgentStore.update(existing!.id, {
        name, description, baseUrl, authMethod,
        tokenReplaced: authMethod === "bearer" && replacingToken && token.trim() !== "",
        validation: result,
      });
      onSaved(externalAgentStore.get(existing!.id)!, false, unpublished);
    } else {
      const agent = externalAgentStore.create({ name, description, baseUrl, authMethod, validation: result });
      onSaved(agent, true);
    }
  };

  const rows = result ? buildCheckRows(result, authMethod) : [];
  const visibleRows = rows.slice(0, revealCount);
  const doneChecking = !checking && revealCount >= rows.length;
  const failedRow = doneChecking ? visibleRows.find(r => !r.pass) : undefined;

  const copySecret = () => {
    navigator.clipboard?.writeText(signingSecret).catch(() => {});
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 1200);
  };

  const confirmRotate = () => {
    if (!existing) return;
    externalAgentStore.rotateSigningSecret(existing.id);
    const updated = externalAgentStore.get(existing.id);
    if (updated) setSigningSecret(updated.signingSecret);
    setShowRotateConfirm(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) requestClose(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                <span className={step === "connection" ? "text-primary font-semibold" : ""}>1 Connection</span>
                <span className="mx-1.5">→</span>
                <span className={step === "validate" ? "text-primary font-semibold" : ""}>2 Validate</span>
              </span>
            </div>
            <DialogTitle className="font-display">{editing ? "Edit connection" : "Connect External Agent"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {step === "connection" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" htmlFor="ext-name">Agent name <span className="text-destructive">*</span></label>
                    <span className="text-[10px] text-muted-foreground">{name.length}/{NAME_MAX}</span>
                  </div>
                  <input
                    id="ext-name"
                    ref={nameRef}
                    value={name}
                    maxLength={NAME_MAX}
                    onChange={e => { setName(e.target.value); clearError("name"); }}
                    onBlur={() => setErrors(er => ({ ...er, name: validateField("name") }))}
                    placeholder="e.g. Support Copilot"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm outline-none transition-base ${
                      errors.name ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" htmlFor="ext-desc">Description</label>
                    <span className="text-[10px] text-muted-foreground">{description.length}/{DESC_MAX}</span>
                  </div>
                  <Textarea
                    id="ext-desc"
                    rows={2}
                    maxLength={DESC_MAX}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What this agent does and when to use it."
                    className="text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" htmlFor="ext-url">Base URL <span className="text-destructive">*</span></label>
                  <input
                    id="ext-url"
                    ref={baseUrlRef}
                    value={baseUrl}
                    onChange={e => { setBaseUrl(e.target.value); clearError("baseUrl"); }}
                    onBlur={() => setErrors(er => ({ ...er, baseUrl: validateField("baseUrl") }))}
                    placeholder="https://agent.example.com"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                      errors.baseUrl ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.baseUrl ? (
                    <p className="mt-1 text-[11px] text-destructive">{errors.baseUrl}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">We'll call /health, /runs and /tools under this URL.</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block" htmlFor="ext-auth-method">Authentication</label>
                  <Select value={authMethod} onValueChange={v => setAuthMethod(v as AuthMethod)}>
                    <SelectTrigger id="ext-auth-method" className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  {authMethod === "none" && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      Requests are still signed with HMAC. Your agent must verify the X-FPT-Signature header.
                    </p>
                  )}
                </div>

                {authMethod === "bearer" && (
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" htmlFor="ext-token">Bearer Token <span className="text-destructive">*</span></label>
                    {editing && !replacingToken ? (
                      <div className="flex items-center gap-2">
                        <input disabled value="••••••••" className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface-muted text-sm text-muted-foreground font-mono" />
                        <button
                          type="button"
                          onClick={() => { setReplacingToken(true); setErrors(er => ({ ...er, token: undefined })); }}
                          className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-muted text-xs font-medium transition-base shrink-0"
                        >
                          Replace token
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          id="ext-token"
                          ref={tokenRef}
                          type={showToken ? "text" : "password"}
                          value={token}
                          onChange={e => { setToken(e.target.value); clearError("token"); }}
                          onBlur={() => setErrors(er => ({ ...er, token: validateField("token") }))}
                          placeholder="Paste your agent's bearer token"
                          className={`w-full h-9 pl-3 pr-16 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                            errors.token ? "border-destructive" : "border-border focus:border-primary"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-base"
                        >
                          {showToken ? <EyeOff size={12} /> : <Eye size={12} />} {showToken ? "Hide" : "Show"}
                        </button>
                      </div>
                    )}
                    {errors.token && <p className="mt-1 text-[11px] text-destructive">{errors.token}</p>}
                  </div>
                )}

                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">Request signing</span>
                    {editing && (
                      <button type="button" onClick={() => setShowRotateConfirm(true)} className="text-[11px] font-semibold text-primary hover:underline">
                        Rotate secret
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      disabled
                      value={showSecret ? signingSecret : maskSecret(signingSecret)}
                      className="flex-1 h-8 px-2.5 rounded-md border border-border bg-surface-muted text-xs font-mono text-foreground truncate"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(v => !v)}
                      className="h-8 px-2 rounded-md border border-border bg-white hover:bg-surface-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-base shrink-0 flex items-center gap-1"
                    >
                      {showSecret ? <EyeOff size={11} /> : <Eye size={11} />} {showSecret ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="h-8 px-2 rounded-md border border-border bg-white hover:bg-surface-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-base shrink-0 flex items-center gap-1"
                    >
                      {secretCopied ? <Check size={11} className="text-success" /> : <Copy size={11} />} {secretCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                    Every request the platform sends is signed with this secret. Your agent must verify the X-FPT-Signature header on /runs, /tools and /credentials.
                  </p>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {authMethod === "bearer"
                    ? "The bearer token is used to authenticate requests to your agent. It is stored encrypted and never shown again after saving."
                    : "No bearer token is used for this agent — every request is authenticated with the signing secret above."}
                </p>
              </div>
            ) : (
              <div>
                {checking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Loader2 size={14} className="animate-spin" /> Checking connection...
                  </div>
                )}
                <div className="space-y-3">
                  {visibleRows.map(row => (
                    <div key={row.key} className="flex items-start gap-2.5 animate-fade-in-up">
                      <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        !row.pass ? "bg-destructive/15 text-destructive" : row.warn ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                      }`}>
                        {!row.pass ? <X size={11} /> : row.warn ? <AlertTriangle size={10} /> : <Check size={11} />}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${!row.pass ? "text-destructive" : row.warn ? "text-warning" : "text-foreground"}`}>
                          {row.label}
                        </p>
                        <p className={`text-xs leading-relaxed mt-0.5 ${!row.pass ? "text-destructive/90" : "text-muted-foreground"}`}>
                          {row.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-0 px-6 pb-6 pt-4 border-t border-border shrink-0">
            <button
              type="button"
              onClick={step === "connection" ? requestClose : () => setStep("connection")}
              className="h-9 px-4 rounded-lg border border-border bg-surface hover:bg-surface-muted text-sm font-medium transition-base"
            >
              {step === "connection" ? "Cancel" : "Back"}
            </button>
            {step === "connection" ? (
              <button type="button" onClick={handleValidateClick} className="btn-primary h-9 px-4">
                Validate Connection
              </button>
            ) : failedRow ? (
              <button type="button" onClick={retryCheck} disabled={checking} className="btn-primary h-9 px-4 disabled:opacity-40 disabled:pointer-events-none">
                Retry check
              </button>
            ) : (
              <button type="button" onClick={save} disabled={checking || !doneChecking} className="btn-primary h-9 px-4 disabled:opacity-40 disabled:pointer-events-none">
                Save as Draft
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close without saving?</AlertDialogTitle>
            <AlertDialogDescription>Your connection details won't be kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmCloseOpen(false); onClose(); }}
            >
              Close without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RotateSigningSecretDialog
        open={showRotateConfirm}
        onOpenChange={setShowRotateConfirm}
        onConfirm={confirmRotate}
      />
    </>
  );
}
