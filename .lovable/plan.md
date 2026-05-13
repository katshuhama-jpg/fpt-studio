# Onboarding → Inventor (no auto-generate)

Reroute the onboarding flow so the prompt step hands the user off to the **Inventor** (chat-to-build screen). Users keep refining via chat there, then click **Open agent** when ready — no forced one-shot generation.

## New flow

```text
Login → Industry → Role → Company size → Personalizing → Prompt
                                                           │
                                                           ▼
                                                       Inventor
                                              (chat-to-build, live config)
                                                           │
                                                  [Open agent] ▼
                                              Builder + welcome banner
```

5 onboarding steps total. Step 6 (Generating loader) is removed.

## Changes

### `src/lib/onboarding.ts`
- Remove `"generate"` from `ONBOARDING_STEPS` → 5 steps.

### `src/pages/Onboarding.tsx`
- Delete `GenerateStep` component and its route case.
- Progress label → `Step X of 5`.
- **PromptStep** CTA changes:
  - Primary: **Continue to Inventor** → save `prompt` + `lov_user.firstTime` stays `true`, navigate to `/inventor?prompt=<encoded>&from=onboarding`.
  - Secondary "I'll do this later" → mark `firstTime=false`, go to `/`.
  - Tertiary "Explore templates instead" → `/templates`.

### `src/pages/Inventor.tsx`
- Read `?from=onboarding` and `?prompt=`:
  - Prefill the chat composer with the prompt and auto-send the first message (so the live config starts populating immediately).
  - Show a small chip in the header: **First agent setup**.
  - Add a one-time tooltip/coach-mark on the **Open agent** button: *"Happy with it? Open your agent to test and tweak."*
- **Open agent** handler when `from=onboarding`:
  - Set `lov_user.firstTime = false`.
  - Navigate to `/agents/:id?welcome=1` (existing welcome banner in `AgentBuilder` already handles the rest).

### `src/App.tsx`
- `RequireAuth`: allow `firstTime` users to access `/inventor` (currently they get bounced back to `/onboarding`). Keep the bounce for all other routes.

## Out of scope
- No backend, no real generation logic — Inventor's existing mock auto-save on chat is reused.
- No redesign of Inventor itself.
- AgentBuilder welcome banner + coach-marks already exist; unchanged.
