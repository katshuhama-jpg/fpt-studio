# Login + Onboarding Flow (Mock UI)

Presentation-only login screen + 6-step onboarding leading directly into `AgentBuilder` with a success banner. State lives in `localStorage` (no backend).

## Routes (in `src/App.tsx`, outside `WorkspaceLayout`)

- `/login` — Login screen
- `/onboarding` — Wraps steps, controlled by `?step=industry|role|company|workspace|prompt|generate`
- Guard: no `lov_user` in `localStorage` → redirect `/` to `/login`. After login: first-time → `/onboarding`, returning → `/`.

## Screen — Login (`src/pages/Login.tsx`)

Two-column, brand gradient left, card right.

- **Left**: chip `Setup takes less than 2 minutes`, H1 "Build AI agents for your team", subcopy, light illustration.
- **Right card**:
  - Email input — placeholder "Enter your work email"
  - CTA **Get started** → store `lov_user = { email, firstTime: true }` → `/onboarding?step=industry`
  - Divider "OR"
  - **Continue with FPT ID** (mock, same behavior)
  - Helper: "Next: Tell us about your team → Create your first AI agent"

## Onboarding shell (`src/pages/Onboarding.tsx`)

Centered card (max-w 640). Header: back arrow, progress bar + `Step X of 6`, and a context-aware skip control on the right.

State stored under `lov_onboarding` in `localStorage`.

### Step 1 — Industry  *(Skip allowed)*
Chip grid: Banking, Retail, Education, Healthcare, Tech, Logistics, Other.

### Step 2 — Role  *(Skip allowed)*
Radio cards: Product, Engineering, Operations, Customer Support, Marketing, Founder/Exec, Other.

### Step 3 — Company size  *(Skip allowed)*
Row: 1–10, 11–50, 51–200, 201–1000, 1000+.

### Step 4 — Personalizing workspace  *(no skip)*
Auto-advance loader (~2.5 s), rotating lines using selected industry/role.

### Step 5 — Prompt to Agent
- Composer reused from `Home.tsx` hero with suggestion chips.
- Primary CTA **Generate agent** → step 6.
- Secondary link (left of CTA): **I'll do this later** → marks onboarding done, navigates to `/` (dashboard shows template suggestions / sample agents — out of scope to build, just route there).
- Tertiary link: **Explore templates instead** → `/templates`.

### Step 6 — Agent generation  *(no skip)*
Inline generation loader matching `AgentScaffold` "generating" stage (animated steps list). On finish:
- Mark `lov_user.firstTime = false`.
- Navigate to `/agents/:id?welcome=1`.

## Success integrated into Builder (no standalone success screen)

In `src/pages/AgentBuilder.tsx`, when URL has `welcome=1`:

- Show a dismissible **success banner** at the top of the page:
  - "🎉 Your first agent is ready. Try chatting on the right, or tweak knowledge & tools below."
  - Buttons: **Test now** (focuses test panel), **Got it** (dismiss).
- Lightweight coach-marks (tooltip popovers, dismiss-on-click) anchored to: Test panel, Knowledge tab, Publish button. Auto-hide after first interaction. Stored via `lov_user.welcomeSeen`.

## Design notes

- Reuse existing tokens: `bg-surface`, `border-border`, `chip`, `chip-primary`, `shadow-elev`, `font-display`, gradients in `index.css`.
- Progress via existing `@/components/ui/progress`.
- Animations: existing `animate-fade-up`. No new deps.
- Copy in English to match current voice.

## Files to add / change

- New: `src/pages/Login.tsx`
- New: `src/pages/Onboarding.tsx` (+ small `src/components/onboarding/` for step bodies)
- New: `src/lib/onboarding.ts` — typed localStorage helpers
- Edit: `src/App.tsx` — add `/login`, `/onboarding`, redirect guard component
- Edit: `src/pages/AgentBuilder.tsx` — read `?welcome=1`, render success banner + coach-marks
- Edit: `src/components/layout/WorkspaceLayout.tsx` — add **Sign out** in user menu (clears `lov_user`, returns to `/login`) for demoing the flow

## Out of scope

- Real auth, real FPT ID SSO, email verification beyond format check
- Persisting onboarding answers to a backend
- Building a templates/dashboard empty-state — we just route there
