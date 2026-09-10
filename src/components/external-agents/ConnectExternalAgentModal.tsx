import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon, Cancel01Icon, EyeIcon, EyeOffIcon, Loading01Icon, Alert01Icon,
  PencilEdit01Icon, Delete01Icon, Add01Icon,
} from "@hugeicons/core-free-icons";
import {
  externalAgentStore, runValidation, type AuthMethod, type ExternalAgent, type ValidationResult,
  type HistoryDeliveryMode,
} from "./externalAgentStore";

const NAME_MIN = 3;
const NAME_MAX = 60;
const DESC_MAX = 200;
const TOKEN_MIN = 10;
const EXISTING_TOKEN_SENTINEL = "__existing_token__";

// Same 12-emoji set + fixed bg-primary-soft swatch as the avatar picker on the External Agent
// detail page's Connection card (ExternalAgentDetail.tsx) and the internal Agent Builder's
// GeneralTab — keep all three in sync if this list ever changes.
const AVATAR_EMOJI_OPTIONS = ["🏦", "🤖", "💼", "🧠", "🎯", "🛡️", "⚡", "🌐", "📊", "🔧", "💡", "🚀"];
const AVATAR_BG = "bg-primary-soft";

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
  const authLabel = authMethod === "none" ? "Request signature verified" : authMethod === "headers" ? "Headers accepted" : "Authentication verified";
  const authPassMessage = authMethod === "none"
    ? "The request signature (HMAC) was verified."
    : authMethod === "headers"
    ? "The custom headers were accepted."
    : "The bearer token was accepted.";
  const authFailMessage = authMethod === "none"
    ? "The request signature wasn't verified. Make sure your agent checks X-FPT-Signature."
    : authMethod === "headers"
    ? "The custom headers weren't accepted. Check the header names and values and try again."
    : "The bearer token wasn't accepted. Check the token and try again.";
  rows.push({
    key: "auth",
    label: authLabel,
    pass: v.authVerified,
    message: v.authVerified ? authPassMessage : authFailMessage,
  });
  if (!v.authVerified) return rows;
  rows.push({ key: "protocol", label: "Protocol version supported", pass: true, message: "Compatible with this platform's agent protocol." });
  rows.push({ key: "runs", label: "/runs endpoint available", pass: true, message: "The agent can accept run requests." });
  return rows;
}

export function validateBaseUrl(raw: string): string | undefined {
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

const HOSTNAME_PATTERN = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*$/;

export function validateHost(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return "Enter a host.";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return "Enter a hostname only, without a scheme like https://.";
  if (v.includes("/")) return "Enter a hostname only, without a path.";
  if (!HOSTNAME_PATTERN.test(v)) return "Enter a valid hostname, for example auth.partner.com";
  return undefined;
}

const HISTORY_N_DEFAULT = 10;

export function historyDeliveryLabel(mode: HistoryDeliveryMode, lastN?: number): string {
  if (mode === "full") return "Full history every turn";
  if (mode === "none") return "No history (stateless)";
  return `Last ${lastN ?? HISTORY_N_DEFAULT} turns`;
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
  const [avatarEmoji, setAvatarEmoji] = useState(existing?.emoji ?? "🔌");
  const [avatarBg, setAvatarBg] = useState(existing?.bg ?? "bg-primary-soft");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(existing?.authMethod ?? "bearer");
  const [replacingToken, setReplacingToken] = useState(!editing);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [allowedHosts, setAllowedHosts] = useState<string[]>(existing?.allowedAuthorizeHosts ?? []);
  const [hostInput, setHostInput] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(existing?.customHeaders ?? []);
  const [visibleHeaderIdx, setVisibleHeaderIdx] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<{ name?: string; baseUrl?: string; token?: string; hosts?: string }>({});
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const [checking, setChecking] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [result, setResult] = useState<ValidationResult | null>(existing?.lastValidation ?? null);

  const nameRef = useRef<HTMLInputElement>(null);
  const baseUrlRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);
  const hostInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("connection");
    setAvatarEmoji(existing?.emoji ?? "🔌");
    setAvatarBg(existing?.bg ?? "bg-primary-soft");
    setShowAvatarPicker(false);
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
    setBaseUrl(existing?.baseUrl ?? "");
    setAuthMethod(existing?.authMethod ?? "bearer");
    setReplacingToken(!editing);
    setToken("");
    setShowToken(false);
    setAllowedHosts(existing?.allowedAuthorizeHosts ?? []);
    setHostInput("");
    setHeaders(existing?.customHeaders ?? []);
    setVisibleHeaderIdx(new Set());
    setErrors({});
    setChecking(false);
    setRevealCount(0);
    setResult(existing?.lastValidation ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  const isDirty = editing
    ? name.trim() !== existing!.name || description.trim() !== existing!.description || baseUrl.trim() !== existing!.baseUrl
      || authMethod !== existing!.authMethod || (replacingToken && token.trim() !== "")
      || allowedHosts.join(",") !== (existing!.allowedAuthorizeHosts ?? []).join(",")
      || JSON.stringify(headers) !== JSON.stringify(existing!.customHeaders ?? [])
      || avatarEmoji !== (existing!.emoji ?? "🔌") || avatarBg !== (existing!.bg ?? "bg-primary-soft")
    : name.trim() !== "" || description.trim() !== "" || baseUrl.trim() !== "" || token.trim() !== "" || allowedHosts.length > 0 || hostInput.trim() !== ""
      || headers.length > 0 || avatarEmoji !== "🔌";

  const requestClose = () => {
    if (isDirty) setConfirmCloseOpen(true);
    else onClose();
  };

  const validateField = (field: "name" | "baseUrl" | "token" | "hosts"): string | undefined => {
    if (field === "name") {
      const v = name.trim();
      if (!v) return "Agent name is required.";
      if (v.length < NAME_MIN || v.length > NAME_MAX) return `Agent name must be between ${NAME_MIN} and ${NAME_MAX} characters.`;
      if (externalAgentStore.isDuplicateName(v, existing?.id)) return "An external agent with this name already exists.";
      return undefined;
    }
    if (field === "baseUrl") return validateBaseUrl(baseUrl);
    if (field === "token") {
      if (authMethod !== "bearer") return undefined;
      if (!replacingToken) return undefined;
      const v = token.trim();
      if (!v) return "Bearer Token is required.";
      if (v.length < TOKEN_MIN) return `Bearer Token must be at least ${TOKEN_MIN} characters.`;
      return undefined;
    }
    if (field === "hosts") {
      if (allowedHosts.length === 0) return "At least one allowed host is required.";
      return undefined;
    }
    return undefined;
  };

  const validateAll = () => ({
    name: validateField("name"),
    baseUrl: validateField("baseUrl"),
    token: validateField("token"),
    hosts: validateField("hosts"),
  });

  const clearError = (field: "name" | "baseUrl" | "token" | "hosts") => {
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }));
  };

  const addHost = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (!v) return;
    const err = validateHost(v);
    if (err) { setErrors(er => ({ ...er, hosts: err })); return; }
    if (allowedHosts.some(h => h.toLowerCase() === v.toLowerCase())) {
      setErrors(er => ({ ...er, hosts: "This host is already in the list." }));
      return;
    }
    setAllowedHosts(hs => [...hs, v]);
    setHostInput("");
    clearError("hosts");
  };

  const removeHost = (host: string) => {
    setAllowedHosts(hs => hs.filter(h => h !== host));
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
    if (e.hosts) { hostInputRef.current?.focus(); hostInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    const effectiveToken = authMethod !== "bearer" ? "" : replacingToken ? token.trim() : EXISTING_TOKEN_SENTINEL;
    const v = runValidation(baseUrl.trim(), effectiveToken);
    setResult(v);
    setStep("validate");
    runChecking(v);
  };

  const retryCheck = () => {
    const effectiveToken = authMethod !== "bearer" ? "" : replacingToken ? token.trim() : EXISTING_TOKEN_SENTINEL;
    const v = runValidation(baseUrl.trim(), effectiveToken);
    setResult(v);
    runChecking(v);
  };

  const save = () => {
    if (!result?.passed) return;
    // History delivery is no longer user-configurable from this modal — always send full
    // conversation history, same default the field used to start on.
    const historyDelivery = { mode: "full" as HistoryDeliveryMode };
    const cleanHeaders = headers.filter(h => h.key.trim() !== "");
    if (editing) {
      const { unpublished } = externalAgentStore.update(existing!.id, {
        name, description, baseUrl, authMethod,
        tokenReplaced: authMethod === "bearer" && replacingToken && token.trim() !== "",
        validation: result,
        allowedAuthorizeHosts: allowedHosts,
        historyDelivery,
        emoji: avatarEmoji, bg: avatarBg,
        customHeaders: cleanHeaders,
      });
      onSaved(externalAgentStore.get(existing!.id)!, false, unpublished);
    } else {
      const agent = externalAgentStore.create({
        name, description, baseUrl, authMethod, validation: result,
        allowedAuthorizeHosts: allowedHosts,
        historyDelivery,
        emoji: avatarEmoji, bg: avatarBg,
        customHeaders: cleanHeaders,
      });
      onSaved(agent, true);
    }
  };

  const rows = result ? buildCheckRows(result, authMethod) : [];
  const visibleRows = rows.slice(0, revealCount);
  const doneChecking = !checking && revealCount >= rows.length;
  const failedRow = doneChecking ? visibleRows.find(r => !r.pass) : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) requestClose(); }}>
        <DialogContent className="sm:max-w-[560px] h-[640px] max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0 transition-base ${
                  step === "validate" ? "bg-primary-soft text-primary" : "bg-primary text-primary-foreground"
                }`}>
                  {step === "validate" ? <HugeiconsIcon icon={Tick02Icon} size={11} /> : "1"}
                </span>
                <span className={`text-xs font-medium transition-base ${step === "connection" ? "text-foreground" : "text-muted-foreground"}`}>
                  Connection
                </span>
              </div>
              <div className={`h-px w-6 shrink-0 transition-base ${step === "validate" ? "bg-primary" : "bg-border"}`} />
              <div className="flex items-center gap-1.5">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0 transition-base ${
                  step === "validate" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground"
                }`}>
                  2
                </span>
                <span className={`text-xs font-medium transition-base ${step === "validate" ? "text-foreground" : "text-muted-foreground"}`}>
                  Validate
                </span>
              </div>
            </div>
            <DialogTitle className="font-display">{editing ? "Edit connection" : "Connect External Agent"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {step === "connection" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Avatar</label>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(v => !v)}
                      aria-label="Change avatar"
                      className={`w-12 h-12 rounded-xl ${avatarBg} border border-border hover:border-primary/40 flex items-center justify-center text-2xl transition-base`}
                    >
                      {avatarEmoji}
                    </button>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-surface border border-border flex items-center justify-center pointer-events-none">
                      <HugeiconsIcon icon={PencilEdit01Icon} size={9} className="text-muted-foreground" />
                    </span>
                    {showAvatarPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowAvatarPicker(false)} />
                        <div className="absolute top-full left-0 mt-2 z-20 bg-surface border border-border rounded-xl shadow-lg p-2.5 grid grid-cols-6 gap-1 w-[180px]">
                          {AVATAR_EMOJI_OPTIONS.map(e => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => { setAvatarEmoji(e); setAvatarBg(AVATAR_BG); setShowAvatarPicker(false); }}
                              className={`w-8 h-8 rounded-lg text-xl flex items-center justify-center hover:bg-primary-soft transition-base ${avatarEmoji === e ? "bg-primary-soft ring-1 ring-primary" : ""}`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

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
                      <SelectItem value="headers">Headers (optional)</SelectItem>
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
                          {showToken ? <HugeiconsIcon icon={EyeOffIcon} size={12} /> : <HugeiconsIcon icon={EyeIcon} size={12} />} {showToken ? "Hide" : "Show"}
                        </button>
                      </div>
                    )}
                    {errors.token && <p className="mt-1 text-[11px] text-destructive">{errors.token}</p>}
                  </div>
                )}

                {authMethod === "headers" && (
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Headers (optional)</label>
                    <div className="space-y-2">
                      {headers.map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={h.key}
                            onChange={e => setHeaders(hs => hs.map((row, idx) => idx === i ? { ...row, key: e.target.value } : row))}
                            placeholder="Header name"
                            className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-base"
                          />
                          <div className="relative flex-1">
                            <input
                              type={visibleHeaderIdx.has(i) ? "text" : "password"}
                              value={h.value}
                              onChange={e => setHeaders(hs => hs.map((row, idx) => idx === i ? { ...row, value: e.target.value } : row))}
                              placeholder="Bearer ..."
                              className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-surface text-sm font-mono outline-none focus:border-primary transition-base"
                            />
                            <button
                              type="button"
                              onClick={() => setVisibleHeaderIdx(s => {
                                const next = new Set(s);
                                if (next.has(i)) next.delete(i); else next.add(i);
                                return next;
                              })}
                              aria-label={visibleHeaderIdx.has(i) ? "Hide value" : "Show value"}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-base"
                            >
                              {visibleHeaderIdx.has(i) ? <HugeiconsIcon icon={EyeOffIcon} size={13} /> : <HugeiconsIcon icon={EyeIcon} size={13} />}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setHeaders(hs => hs.filter((_, idx) => idx !== i));
                              setVisibleHeaderIdx(s => { const next = new Set(s); next.delete(i); return next; });
                            }}
                            aria-label="Remove header"
                            className="shrink-0 w-9 h-9 rounded-lg border border-border bg-surface hover:bg-surface-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-base"
                          >
                            <HugeiconsIcon icon={Delete01Icon} size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setHeaders(hs => [...hs, { key: "", value: "" }])}
                        className="w-full h-9 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-base flex items-center justify-center gap-1.5"
                      >
                        <HugeiconsIcon icon={Add01Icon} size={13} /> Add header
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      Header values are secrets — stored securely and never shared with the agent.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium mb-1.5 block" htmlFor="ext-hosts">Allowed hosts for authorizeUrl <span className="text-destructive">*</span></label>
                  {allowedHosts.length > 0 && (
                    <div className="space-y-1.5 mb-1.5">
                      {allowedHosts.map(host => (
                        <div key={host} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface">
                          <span className="text-xs font-mono truncate">{host}</span>
                          <button
                            type="button"
                            onClick={() => removeHost(host)}
                            aria-label={`Remove ${host}`}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-base"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    id="ext-hosts"
                    ref={hostInputRef}
                    value={hostInput}
                    onChange={e => { setHostInput(e.target.value); clearError("hosts"); }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addHost(hostInput); }
                      else if (e.key === "Backspace" && hostInput === "" && allowedHosts.length > 0) {
                        removeHost(allowedHosts[allowedHosts.length - 1]);
                      }
                    }}
                    onBlur={() => { if (hostInput.trim()) addHost(hostInput); else setErrors(er => ({ ...er, hosts: validateField("hosts") })); }}
                    placeholder="auth.partner.com"
                    className={`w-full h-9 px-3 rounded-lg border bg-surface text-sm font-mono outline-none transition-base ${
                      errors.hosts ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                  {errors.hosts ? (
                    <p className="mt-1 text-[11px] text-destructive">{errors.hosts}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">The platform only calls back to authorizeUrl values that match this list.</p>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {authMethod === "bearer"
                    ? "The bearer token is used to authenticate requests to your agent. It is stored encrypted and never shown again after saving."
                    : authMethod === "headers"
                    ? "Custom headers are sent with every request to your agent. Values are stored encrypted and never shown again after saving."
                    : "No bearer token is used for this agent — every request is authenticated with the signing secret above."}
                </p>
              </div>
            ) : (
              <div>
                <div className="space-y-3">
                  {rows.map((row, i) => {
                    const isDone = i < revealCount;
                    const isActive = i === revealCount && checking;

                    // Pending — chưa tới lượt check
                    if (!isDone && !isActive) {
                      return (
                        <div key={row.key} className="flex items-start gap-2.5">
                          <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-surface-muted text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-current" />
                          </span>
                          <p className="text-sm text-muted-foreground">{row.label}</p>
                        </div>
                      );
                    }

                    // Active — đang check dòng này
                    if (isActive) {
                      return (
                        <div key={row.key} className="flex items-start gap-2.5 animate-fade-in-up">
                          <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-primary-soft text-primary">
                            <HugeiconsIcon icon={Loading01Icon} size={10} className="animate-spin" />
                          </span>
                          <p className="text-sm font-medium text-foreground">{row.label}</p>
                        </div>
                      );
                    }

                    // Done — pass / warn / fail (giữ nguyên style cũ)
                    return (
                      <div key={row.key} className="flex items-start gap-2.5 animate-fade-in-up">
                        <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          !row.pass ? "bg-destructive/15 text-destructive" : row.warn ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                        }`}>
                          {!row.pass ? <HugeiconsIcon icon={Cancel01Icon} size={11} /> : row.warn ? <HugeiconsIcon icon={Alert01Icon} size={10} /> : <HugeiconsIcon icon={Tick02Icon} size={11} />}
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
                    );
                  })}
                </div>

                {doneChecking && !failedRow && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3.5 py-3 mt-4">
                    <HugeiconsIcon icon={Tick02Icon} size={15} className="text-success shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">Connection validated. This agent is ready to save.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-0 px-6 pb-6 pt-4 shrink-0">
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
    </>
  );
}
