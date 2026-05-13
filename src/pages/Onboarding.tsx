import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Wand2,
  Building2, ShoppingBag, GraduationCap, HeartPulse, Cpu, Truck, MoreHorizontal,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  ONBOARDING_STEPS, OnboardingStep, getOnboarding, updateOnboarding,
  updateUser, getUser,
} from "@/lib/onboarding";

const stepIndex = (s: string) =>
  Math.max(0, ONBOARDING_STEPS.indexOf(s as OnboardingStep));

export default function Onboarding() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stepParam = (params.get("step") || "industry") as OnboardingStep;

  // Auth guard
  useEffect(() => {
    if (!getUser()) navigate("/login", { replace: true });
  }, [navigate]);

  const idx = stepIndex(stepParam);
  const total = ONBOARDING_STEPS.length;
  const goto = (s: OnboardingStep) => setParams({ step: s });
  const next = () => {
    const n = ONBOARDING_STEPS[Math.min(idx + 1, total - 1)];
    goto(n);
  };
  const back = () => {
    if (idx === 0) return;
    goto(ONBOARDING_STEPS[idx - 1]);
  };

  const skipAvailable = ["industry", "role", "company"].includes(stepParam);

  const finishToDashboard = () => {
    updateUser({ firstTime: false });
    updateOnboarding({ completed: true });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-5 flex items-center justify-between max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-2 text-sm font-display font-semibold">
          <span className="h-7 w-7 rounded-lg bg-gradient-brand flex items-center justify-center text-primary-foreground">
            <Sparkles size={14} />
          </span>
          AI Agents
        </div>
        {skipAvailable && (
          <button onClick={next} className="btn-ghost">
            Skip
          </button>
        )}
      </header>

      {/* Progress */}
      <div className="max-w-3xl w-full mx-auto px-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Step {idx + 1} of {total}</span>
          <span>{Math.round(((idx + 1) / total) * 100)}%</span>
        </div>
        <Progress value={((idx + 1) / total) * 100} className="h-1.5" />
      </div>

      {/* Card */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-2xl surface-card-elevated p-8 sm:p-10 animate-fade-up" key={stepParam}>
          {stepParam === "industry" && <IndustryStep onNext={next} />}
          {stepParam === "role" && <RoleStep onNext={next} />}
          {stepParam === "company" && <CompanyStep onNext={next} />}
          {stepParam === "workspace" && <PersonalizingStep onDone={next} />}
          {stepParam === "prompt" && (
            <PromptStep
              onGenerate={(p) => {
                updateOnboarding({ prompt: p });
                navigate(
                  `/inventor?from=onboarding&prompt=${encodeURIComponent(p)}`,
                );
              }}
              onLater={finishToDashboard}
              onTemplates={() => {
                updateUser({ firstTime: false });
                updateOnboarding({ completed: true });
                navigate("/templates");
              }}
            />
          )}
        </div>
      </main>

      {/* Footer nav */}
      {stepParam !== "workspace" && (
        <footer className="px-6 pb-8 max-w-2xl w-full mx-auto flex items-center">
          <button
            onClick={back}
            disabled={idx === 0}
            className="btn-ghost disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </footer>
      )}
    </div>
  );
}

/* ───────────────── Step: Industry ───────────────── */

const INDUSTRIES = [
  { id: "banking", label: "Banking & Finance", icon: Building2 },
  { id: "retail", label: "Retail & E-commerce", icon: ShoppingBag },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "healthcare", label: "Healthcare", icon: HeartPulse },
  { id: "tech", label: "Technology", icon: Cpu },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

function IndustryStep({ onNext }: { onNext: () => void }) {
  const [value, setValue] = useState<string | undefined>(getOnboarding().industry);
  return (
    <div>
      <Header
        eyebrow="About your team"
        title="Which industry are you in?"
        subtitle="We'll tailor templates and tool suggestions for your space."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
        {INDUSTRIES.map(({ id, label, icon: Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              onClick={() => setValue(id)}
              className={`p-4 rounded-[10px] border text-left transition-base flex flex-col items-start gap-2 ${
                active
                  ? "border-primary bg-primary-soft ring-glow"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <Icon size={18} className={active ? "text-primary" : "text-muted-foreground"} />
              <span className="text-sm font-medium leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
      <NextRow
        disabled={!value}
        onNext={() => {
          updateOnboarding({ industry: value });
          onNext();
        }}
      />
    </div>
  );
}

/* ───────────────── Step: Role ───────────────── */

const ROLES = [
  "Product",
  "Engineering",
  "Operations",
  "Customer Support",
  "Marketing",
  "Founder / Exec",
  "Other",
];

function RoleStep({ onNext }: { onNext: () => void }) {
  const [value, setValue] = useState<string | undefined>(getOnboarding().role);
  return (
    <div>
      <Header
        eyebrow="About you"
        title="What's your role?"
        subtitle="Helps us recommend the right starter agents."
      />
      <div className="mt-6 grid gap-2">
        {ROLES.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              onClick={() => setValue(r)}
              className={`flex items-center justify-between px-4 py-3 rounded-[10px] border text-sm transition-base ${
                active
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <span className="font-medium">{r}</span>
              {active && <Check size={16} className="text-primary" />}
            </button>
          );
        })}
      </div>
      <NextRow
        disabled={!value}
        onNext={() => {
          updateOnboarding({ role: value });
          onNext();
        }}
      />
    </div>
  );
}

/* ───────────────── Step: Company size ───────────────── */

const SIZES = ["1–10", "11–50", "51–200", "201–1000", "1000+"];

function CompanyStep({ onNext }: { onNext: () => void }) {
  const [value, setValue] = useState<string | undefined>(getOnboarding().companySize);
  return (
    <div>
      <Header
        eyebrow="Your company"
        title="How big is your team?"
        subtitle="We'll set sensible defaults for collaboration and quotas."
      />
      <div className="mt-6 flex flex-wrap gap-2">
        {SIZES.map((s) => {
          const active = value === s;
          return (
            <button
              key={s}
              onClick={() => setValue(s)}
              className={`px-4 h-10 rounded-[10px] border text-sm font-medium transition-base ${
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <NextRow
        disabled={!value}
        onNext={() => {
          updateOnboarding({ companySize: value });
          onNext();
        }}
      />
    </div>
  );
}

/* ───────────────── Step: Personalizing ───────────────── */

function PersonalizingStep({ onDone }: { onDone: () => void }) {
  const onb = getOnboarding();
  const messages = useMemo(
    () => [
      `Tailoring templates for ${onb.industry || "your team"}…`,
      `Suggesting tools for ${onb.role || "your workflow"}…`,
      "Preparing your workspace…",
    ],
    [onb.industry, onb.role],
  );
  const [i, setI] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setI(1), 800);
    const t2 = setTimeout(() => setI(2), 1700);
    const t3 = setTimeout(() => onDone(), 2600);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="text-center py-6">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-primary-foreground mb-5">
        <Loader2 size={22} className="animate-spin" />
      </div>
      <h2 className="font-display text-2xl font-semibold mb-2">Personalizing your workspace</h2>
      <p className="text-sm text-muted-foreground mb-6">Just a moment — almost ready.</p>
      <ul className="text-sm space-y-2 text-left max-w-sm mx-auto">
        {messages.map((m, idx) => (
          <li key={m} className="flex items-center gap-2.5">
            {idx < i ? (
              <Check size={16} className="text-success" />
            ) : idx === i ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-border" />
            )}
            <span className={idx <= i ? "text-foreground" : "text-muted-foreground"}>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────── Step: Prompt ───────────────── */

const SUGGESTIONS = [
  "A 24/7 customer-care agent that handles FAQs and bookings",
  "A sales assistant that qualifies leads from web forms",
  "An internal HR helper that answers policy questions",
];

function PromptStep({
  onGenerate,
  onLater,
  onTemplates,
}: {
  onGenerate: (prompt: string) => void;
  onLater: () => void;
  onTemplates: () => void;
}) {
  const [prompt, setPrompt] = useState(getOnboarding().prompt || "");
  return (
    <div>
      <Header
        eyebrow="Your first agent"
        title="Describe what you want to build"
        subtitle="One sentence is enough. We'll scaffold the persona, knowledge and tools."
      />
      <div className="mt-6 rounded-2xl border border-border bg-surface focus-within:border-primary focus-within:ring-glow transition-base p-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="e.g. A banking customer-care agent that can lock cards, look up loan rates and book consultations…"
          className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground outline-none px-3 py-2.5"
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[11px] text-muted-foreground">You'll keep refining in Inventor</span>
          <button
            disabled={!prompt.trim()}
            onClick={() => onGenerate(prompt.trim())}
            className="btn-primary h-8 px-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Wand2 size={13} /> Continue to Inventor
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setPrompt(s)}
            className="chip hover:border-border-strong transition-base"
          >
            <Sparkles size={11} /> {s}
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between text-xs">
        <button onClick={onLater} className="btn-ghost">
          I'll do this later
        </button>
        <button onClick={onTemplates} className="text-primary font-medium hover:underline">
          Explore templates instead →
        </button>
      </div>
    </div>
  );
}


/* ───────────────── Helpers ───────────────── */

function Header({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="section-eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-display text-2xl font-semibold tracking-tight mb-1.5">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function NextRow({ disabled, onNext }: { disabled?: boolean; onNext: () => void }) {
  return (
    <div className="mt-8 flex justify-end">
      <button
        disabled={disabled}
        onClick={onNext}
        className="btn-primary disabled:opacity-50 disabled:pointer-events-none"
      >
        Continue <ArrowRight size={14} />
      </button>
    </div>
  );
}
