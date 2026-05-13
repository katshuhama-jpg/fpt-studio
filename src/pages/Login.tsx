import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Bot, Wrench, BookOpen, ShieldCheck } from "lucide-react";
import { setUser, getUser } from "@/lib/onboarding";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid work email.");
      return;
    }
    const existing = getUser();
    const firstTime = !existing || existing.email !== trimmed ? true : existing.firstTime;
    setUser({ email: trimmed, firstTime, welcomeSeen: existing?.welcomeSeen });
    navigate(firstTime ? "/onboarding?step=industry" : "/");
  };

  const handleSSO = () => {
    const trimmed = email.trim() || "demo@fpt.com";
    const existing = getUser();
    const firstTime = !existing || existing.email !== trimmed ? true : existing.firstTime;
    setUser({ email: trimmed, firstTime, welcomeSeen: existing?.welcomeSeen });
    navigate(firstTime ? "/onboarding?step=industry" : "/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-hero overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 chip chip-primary mb-8">
            <Sparkles size={11} /> Setup takes less than 2 minutes
          </div>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-balance leading-[1.05] mb-4">
            Build AI agents <br /> for your team.
          </h1>
          <p className="text-base text-muted-foreground max-w-md">
            Automate workflows, connect your tools, and create reusable AI assistants — all in one workspace.
          </p>

          <div className="mt-12 grid gap-3 max-w-sm">
            {[
              { icon: Bot, label: "Drag-and-drop agent builder" },
              { icon: BookOpen, label: "Plug in your knowledge base" },
              { icon: Wrench, label: "Connect 50+ business tools" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-foreground/80">
                <span className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center text-primary">
                  <Icon size={15} />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck size={13} /> Enterprise-grade security · SSO ready
        </div>

        {/* decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[300px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12 animate-fade-up">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">
              Build AI agents for your team
            </h1>
            <p className="text-sm text-muted-foreground">
              Automate workflows and ship reusable AI assistants.
            </p>
          </div>

          <div className="surface-card-elevated p-8">
            <h2 className="font-display text-2xl font-semibold mb-1">Get started</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Use your work email to spin up your workspace.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your work email"
                  className="ds-input"
                  autoFocus
                />
                {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
              </label>

              <button type="submit" className="btn-primary w-full justify-center h-10">
                Get started <ArrowRight size={14} />
              </button>
            </form>

            <div className="divider-label my-5">OR</div>

            <button onClick={handleSSO} className="btn-secondary w-full justify-center h-10">
              Continue with FPT ID
            </button>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Next: Tell us about your team → Create your first AI agent
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-4">
            By continuing you agree to our Terms & Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
