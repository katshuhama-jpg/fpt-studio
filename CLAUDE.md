# CLAUDE.md — FPT AI Agents Console (prototype "Agent Hub")

Front-end prototype of the FPT AI Agents / EOS Console. Owner: Meo Meo (BA/UX). Every change here is a **UI/UX change** that ends up live on Lovable.

## How changes ship
- Repo `trangchit166/fptaiagents`, branch **`main`**. Lovable project "Agent Hub" syncs from `main` → live at https://fptaiagents.lovable.app.
- Commit straight to `main` unless told otherwise. If the session can only push a feature branch, open a PR to `main` and say so in the summary.
- After pushing, remind the user to click **Update preview → Publish → Publish changes** in Lovable.
- Commit messages: short, English, conventional (`feat: …`, `fix: …`, `style: …`, `chore: …`).
- Ask before risky actions: deleting files/branches, force push, changing CI/CD or build config, adding dependencies.

## Before every commit
```bash
npx tsc --noEmit -p tsconfig.app.json   # only fix errors in files you touched; some pre-existing errors exist
npx vitest run                          # when touching code that has tests
npx vite build
```
Do not commit `package-lock.json` / `bun.lock` changes unless you intentionally changed dependencies.

## Stack
React 18 + TypeScript + Vite + Tailwind + shadcn/ui (`src/components/ui`). Routes in `src/App.tsx`, app shell in `src/components/layout/WorkspaceLayout.tsx`. No backend: state lives in in-memory/session stores (`src/lib/sessionPersist.ts` → `loadMap`/`saveMap`).
Static prototypes live in `public/prototypes/*.html` (e.g. `/organization` embeds `eos-portal-phan-quyen.html` via `src/pages/OrgPortalPrototype.tsx`).

## FPTAI design system (mandatory)
shadcn/ui preset `b37sR6ujw` — Vega style, Neutral base, brand primary **#203BDC** (same in light & dark), Indigo chart ramp, font **Inter**, icons **HugeIcons Stroke Rounded, strokeWidth 1.5**. If the `fptai-design-system` skill is available, read it first.

Tokens are defined in `src/index.css` — do not edit them unless asked.

Rules:
- **Color only through semantic tokens**: `bg-background text-foreground`, `bg-primary text-primary-foreground`, `bg-muted text-muted-foreground`, `bg-card text-card-foreground`, `border-border`, `ring-ring`, `text-destructive`. Never raw hex, `rgb(`, or palette classes (`blue-`, `gray-`, `slate-`, `zinc-`).
- Every surface pairs with its own foreground. Primary is for the single most important action, the active nav item and small emphasis marks — not backgrounds.
- **Radius**: `rounded-lg` cards/panels/dialogs, `rounded-md` buttons/inputs/badges, `rounded-sm` small chips, `rounded-full` only avatars/pills/round icon buttons. No `rounded-[Npx]`.
- **Type (Inter)**: page title `text-2xl font-semibold tracking-tight`; section `text-lg font-semibold`; body `text-sm`; meta `text-sm text-muted-foreground`; labels `text-sm font-medium`; numbers `tabular-nums`.
- **Icons**: `@hugeicons/react` + `@hugeicons/core-free-icons`, `strokeWidth={1.5}`, `currentColor`; 16px inline, 20px icon buttons, 24px empty states. New code must not add `lucide-react` / Tabler / Heroicons. Existing Lucide usage is legacy — replace only in code you are already editing.
- **Spacing**: Tailwind 4px scale (`p-6` cards, `gap-6` sections, `gap-2` fields / icon+label). No arbitrary px.
- **Buttons**: one `default` per view; `secondary` companion; `outline` toolbar/filter; `ghost` icon-only; `destructive` only for destructive confirmation.
- **Cards** `bg-card border rounded-lg`, no shadow; `shadow-sm` only for floating layers (popover, dropdown, dialog, toast).
- **Inputs** `h-9 rounded-md border bg-transparent focus-visible:ring-[3px] focus-visible:ring-ring/50`; errors `text-destructive` + `aria-invalid:border-destructive`.
- **Tabs (Vega segmented)**: list `h-9 w-fit rounded-lg bg-muted p-[3px]`, active trigger `data-[state=active]:bg-background`.
- **Tables**: `text-sm`, `border-b` rows, `text-muted-foreground font-medium` headers, numeric columns right-aligned `tabular-nums`.
- **Shell/sidebar** uses the `--sidebar-*` tokens.
- **Empty state**: centered, 24px HugeIcons glyph in `text-muted-foreground`, a `font-medium` line, a `text-sm text-muted-foreground` line, one action button.
- **Charts**: `--chart-1 … --chart-5` in order; single series uses `--chart-2`/`--chart-3`.
- Every state must exist: empty, loading, error, success (toast via `sonner`), confirm dialog for destructive actions; keyboard focus visible; works in dark mode.

## Language
UI copy is **Vietnamese**; keep technical terms in English (Agent, Workspace, Space, publish…). Summaries to the user: Vietnamese, short — list files changed, commit message and commit link.
