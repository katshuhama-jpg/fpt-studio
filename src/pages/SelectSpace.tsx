import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import fptAiLogo from "@/assets/fpt-ai-logo.png";
import { getUser, updateUser } from "@/lib/onboarding";
import { getMySpaces, setCurrentTenantId, spaceKind, type SpaceKind } from "@/lib/spaceStore";
import { Icon, KIND_META, SpaceRow } from "@/components/layout/SpacePicker";

/** First sign-in: pick the Space to enter — Individual or Organization, each listing its Spaces. */
export default function SelectSpace() {
  const navigate = useNavigate();
  const loc = useLocation();
  const spaces = getMySpaces();
  const [picked, setPicked] = useState<string | null>(null);
  const user = getUser();

  const enter = () => {
    if (!picked) return;
    setCurrentTenantId(picked);
    updateUser({ spaceChosen: true });
    const from = (loc.state as { from?: string } | null)?.from;
    navigate(user?.firstTime ? "/onboarding?step=industry" : from && from !== "/select-space" ? from : "/", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex justify-center px-6 pt-8">
        <img src={fptAiLogo} alt="FPT.AI" className="h-8 w-auto select-none" draggable={false} />
      </header>
      <main className="mx-auto flex w-full max-w-[880px] flex-1 flex-col items-center justify-center px-6 py-10">
        <h1 className="text-center text-2xl font-semibold tracking-tight">Bạn muốn vào Space nào?</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {user?.email ? <>Đăng nhập với <span className="font-medium text-foreground">{user.email}</span>. </> : null}
          Chọn Space để bắt đầu, bạn có thể chuyển Space bất kỳ lúc nào ở thanh bên trái.
        </p>

        <div role="radiogroup" aria-label="Chọn Space" className="mt-8 grid w-full gap-4 md:grid-cols-2">
          {(["individual", "organization"] as SpaceKind[]).map(kind => {
            const meta = KIND_META[kind];
            const list = spaces.filter(t => spaceKind(t) === kind);
            const hasPick = list.some(t => t.id === picked);
            return (
              <section key={kind} className={`flex flex-col rounded-lg border bg-card p-5 transition-colors ${hasPick ? "border-primary ring-1 ring-primary/30" : ""}`}>
                <div className="flex flex-col items-center text-center">
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon icon={meta.icon} size={28} /></span>
                  <h2 className="text-base font-semibold">{meta.label}</h2>
                  <p className="mt-1 max-w-[300px] text-sm text-muted-foreground">{meta.desc}</p>
                </div>
                <div className="mt-5 space-y-1.5 border-t pt-4">
                  {list.length
                    ? list.map(t => <SpaceRow key={t.id} t={t} active={picked === t.id} onClick={() => setPicked(t.id)} />)
                    : <p className="py-3 text-center text-sm text-muted-foreground">Bạn chưa tham gia Space nào loại này.</p>}
                </div>
              </section>
            );
          })}
        </div>

        <Button type="button" className="mt-8 min-w-[200px]" disabled={!picked} onClick={enter}>
          Vào Space <Icon icon={ArrowRight01Icon} />
        </Button>
      </main>
    </div>
  );
}
