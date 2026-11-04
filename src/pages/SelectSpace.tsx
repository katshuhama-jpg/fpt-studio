import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight01Icon, Building03Icon, UserIcon, Search01Icon, InformationCircleIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import fptAiLogo from "@/assets/fpt-ai-logo.png";
import { getUser, updateUser } from "@/lib/onboarding";
import { getMySpaces, isOrgConfigured, membershipOf, setCurrentTenantId, spaceKind, type Tenant } from "@/lib/spaceStore";
import { Icon, SpaceAvatar } from "@/components/layout/SpacePicker";

const SEARCH_FROM = 6;

function Row({ t, picked, onPick, meta }: { t: Tenant; picked: boolean; onPick: () => void; meta: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={picked} onClick={onPick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 ${picked ? "bg-primary/5" : "hover:bg-muted/50"}`}>
      <SpaceAvatar t={t} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{t.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
      </span>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${picked ? "border-primary bg-primary text-primary-foreground" : "border-input"}`} aria-hidden="true">
        {picked && <Icon icon={Tick02Icon} size={12} />}
      </span>
    </button>
  );
}

/** Màn chọn Space — chỉ hiện ở lần đăng nhập đầu tiên. Space cá nhân + các Shared space
 * (đã được quản trị viên thêm vào) nhóm theo Organization. */
export default function SelectSpace() {
  const navigate = useNavigate();
  const loc = useLocation();
  const user = getUser();
  const spaces = getMySpaces();
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const enter = (id: string | null = picked) => {
    if (!id) return;
    setCurrentTenantId(id);
    updateUser({ spaceChosen: true });
    const from = (loc.state as { from?: string } | null)?.from;
    navigate(user?.firstTime ? "/onboarding?step=industry" : from && from !== "/select-space" ? from : "/", { replace: true });
  };
  // Chỉ có 1 Space thì không cần chọn.
  useEffect(() => { if (spaces.length === 1) enter(spaces[0].id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const term = q.trim().toLowerCase();
  const match = (t: Tenant) => !term || t.name.toLowerCase().includes(term) || (membershipOf(t.id)?.orgName.toLowerCase().includes(term) ?? false);
  const personal = spaces.filter(t => spaceKind(t) === "individual" && match(t));
  const shared = spaces.filter(t => spaceKind(t) === "organization");
  const orgs = [...new Map(shared.map(t => [membershipOf(t.id)?.orgId ?? t.id, membershipOf(t.id)?.orgName ?? t.name])).entries()]
    .map(([id, name]) => ({ id, name, spaces: shared.filter(t => (membershipOf(t.id)?.orgId ?? t.id) === id && match(t)) }))
    .filter(o => o.spaces.length);
  const sharedCount = shared.length;
  const pickedSpace = spaces.find(t => t.id === picked);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex justify-center px-6 pt-8">
        <img src={fptAiLogo} alt="FPT.AI" className="h-8 w-auto select-none" draggable={false} />
      </header>
      <main className="mx-auto w-full max-w-[600px] flex-1 px-6 py-10">
        <h1 className="text-center text-2xl font-semibold tracking-tight">Chọn Space để bắt đầu</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground tabular-nums">
          {user?.email && <><span className="font-medium text-foreground">{user.email}</span> · </>}{orgs.length || new Set(shared.map(t => membershipOf(t.id)?.orgId)).size} tổ chức · {spaces.length} Space
        </p>

        {sharedCount > 0 && (
          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <Icon icon={InformationCircleIcon} className="mt-0.5 shrink-0 text-primary" />
            <p>
              Bạn có quyền truy cập <span className="font-medium">{sharedCount} Shared space</span> bên dưới. Chọn một Space để bắt đầu sử dụng tài nguyên chung.
            </p>
          </div>
        )}

        {spaces.length >= SEARCH_FROM && (
          <div className="relative mt-5">
            <Icon icon={Search01Icon} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm Space hoặc tổ chức" aria-label="Tìm Space hoặc tổ chức" className="pl-8" />
          </div>
        )}

        <div role="radiogroup" aria-label="Chọn Space" className="mt-6 space-y-6">
          {personal.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon icon={UserIcon} size={14} />Cá nhân</h2>
              <div className="divide-y overflow-hidden rounded-lg border bg-card">
                {personal.map(t => <Row key={t.id} t={t} picked={picked === t.id} onPick={() => setPicked(t.id)} meta={<>Individual · Gói {t.plan} · Chỉ mình bạn</>} />)}
              </div>
            </section>
          )}

          {orgs.map(o => (
            <section key={o.id}>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon icon={Building03Icon} size={14} /><span className="text-foreground">{o.name}</span> · {o.spaces.length} Space
              </h2>
              <div className="divide-y overflow-hidden rounded-lg border bg-card">
                {o.spaces.map(t => {
                  const m = membershipOf(t.id);
                  return (
                    <Row key={t.id} t={t} picked={picked === t.id} onPick={() => setPicked(t.id)}
                      meta={<>
                        Shared · Vai trò {m?.role ?? "Viewer"}{m ? ` · Được thêm bởi ${m.addedBy}` : ""}
                        {!isOrgConfigured(t.id) && <span className="text-warning"> · Chưa thiết lập tổ chức</span>}
                      </>} />
                  );
                })}
              </div>
            </section>
          ))}

          {personal.length === 0 && orgs.length === 0 && (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {term ? `Không tìm thấy Space nào khớp "${q.trim()}".` : "Bạn chưa được thêm vào Space nào. Liên hệ quản trị viên tổ chức để được mời."}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 mt-8 flex flex-col items-center gap-2 bg-background pb-4 pt-2">
          <Button type="button" className="min-w-[220px]" disabled={!picked} onClick={() => enter()}>
            {pickedSpace ? <>Vào {pickedSpace.name}</> : "Chọn một Space"} <Icon icon={ArrowRight01Icon} />
          </Button>
          <p className="text-xs text-muted-foreground">Màn này chỉ hiện ở lần đăng nhập đầu tiên.</p>
        </div>
      </main>
    </div>
  );
}
