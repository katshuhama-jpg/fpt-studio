export function Card({ title, desc, children, action, danger }: any) {
  return (
    <section className={`rounded-xl bg-surface border ${danger ? "border-destructive/30" : "border-border"} p-6`}>
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className={`font-display text-base font-semibold ${danger ? "text-destructive" : ""}`}>{title}</h2>
          {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Row({ label, children }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-3 mb-4 last:mb-0 items-center">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div>{children}</div>
    </div>
  );
}
