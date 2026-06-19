# Expungement.ai Consumer Frontend — Integration & QA Notes

Branch: `feat/expungement-ai-all51-frontend`

This document covers (1) how to swap the frontend from the mock adapters to Codex's live
endpoints, (2) the responsive / accessibility QA done on this branch, and (3) known
frontend/backend contract notes. It is documentation only.

> The new profile-driven flow runs entirely on the **mock adapter boundary** on this branch.
> The live endpoint flags are **disabled**. Do not flip them or merge the backend branch from
> here; integration is a separate, approved step.

---

## 1. Backend swap (mock → live)

The whole flow talks to the engine through exactly two adapter functions. Swapping to live is
isolated to those two files; nothing else changes.

### 1a. Profiles — `GET /api/expungement-ai/profiles/{state}`

File: `src/lib/expungement-ai/frontend/profile-loader.ts`

1. Set `USE_LIVE_PROFILE_ENDPOINT = true`.
2. `fetchLiveProfile(key)` already calls `GET /api/expungement-ai/profiles/{state}` and the
   response is validated by `parseJurisdictionProfile` before render.
3. Confirm the `{state}` path-parameter format the engine expects. The mock is keyed by the
   uppercase code (`IL`, `DC`) and `normalizeStateKey()` uppercases input. If the live route
   expects a slug (`illinois`), change the conversion **only** inside `normalizeStateKey` /
   `fetchLiveProfile` (kept isolated here on purpose). The picker links use the code.
4. Remove the static `import all51 from "./profiles/all51.json"` (and the bundled file) once live
   so the ~276 KB mock data leaves the client bundle. `listAvailableJurisdictions()` /
   `listAvailableStateKeys()` currently read that file for the picker; repoint them at the live
   source (or a small static index) at the same time.

### 1b. Evaluate — `POST /api/expungement-ai/evaluate`

File: `src/lib/expungement-ai/frontend/evaluate.ts`

1. Set `USE_LIVE_EVALUATE_ENDPOINT = true`.
2. `postLiveEvaluation(request)` already POSTs `{ profileVersion, matterId, normalizedAnswers }`
   and the response is validated by `parseScreeningEvaluation` before render.
3. Delete the mock path (`runMockEvaluation` / `buildNeedsReviewEvaluation`) once live. The
   client never decides outcomes; it renders the validated `ScreeningEvaluation`.

### 1c. Contract mirror

`src/lib/expungement-ai/frontend/contracts.ts` is a **temporary mirror** of the shared
contract. When the backend branch lands on `main`, replace it with an import from the canonical
shared contract and delete the mirror. If the live response differs in any field, the engine
wins: update the frontend's field reads, never coerce the engine to the mirror.

### 1d. Payment

The result screen shows the packet/checkout action only when `isPaymentAllowed(evaluation)` is
true (`paymentAllowed === true` and a packet-ready code). The action currently routes to the
existing `/expungement-ai/pay` page; no Stripe session is created from the new flow. Wiring real
checkout is a later, separately-approved step. The server must enforce the same payment clamp.

---

## 2. Responsive & accessibility QA

Manual QA was done by reviewing the rendered Tailwind layout at 320 px (mobile) and at desktop
widths, plus `next build`. There is no headless browser in this environment, so this is a
code-level review, not screenshots.

Preview paths (run `npm run dev`, then visit):

- State picker: `/expungement-ai/screening`
- Profile-driven flow (any state): `/expungement-ai/screening/IL`, `/expungement-ai/screening/DC`
- Result screens (all nine, dev only): `/expungement-ai/dev/result-gallery`
- Briefcase care states (dev only): `/expungement-ai/dev/matter-gallery`
- Briefcase home: `/briefcase`
- Wilma: the floating bubble on every screen above (kill-switch fallback shows when
  `NEXT_PUBLIC_WILMA_ENABLED=false`)

### Mobile (320 px)

- Flow, result, picker, and Briefcase cards use `max-w-*` + `px-4` and stack action buttons
  (`flex-col sm:flex-row-reverse`), so nothing overflows at 320 px.
- The picker is a single column on mobile (`grid-cols-1 sm:grid-cols-2`).
- The Wilma panel uses `w-[min(92vw,360px)]`, so it fits a 320 px viewport.
- Tap targets: option rows, inputs, the unknown toggle, and primary/secondary buttons are
  `min-h-[44px]`–`min-h-[48px]`.

### Desktop

- Content is centered with `max-w-2xl` (flow/result) and `max-w-3xl` (picker); the Briefcase uses
  its existing 240 px sidebar grid.

### Accessibility

- **Headings:** each screen has one `<h1>` (the question prompt, the result `userLabel`, the
  picker/error titles). Result sub-sections use `<h2>`.
- **Labels:** choice groups use `role="radiogroup"`/`group` named by the prompt via
  `aria-labelledby`; text/number/date inputs use `aria-labelledby` to the prompt; the unknown
  toggle has its own `<label>`.
- **Errors:** validation text has `role="alert"` and is linked to the field via
  `aria-describedby`; the contextOnly note is linked the same way.
- **Keyboard focus:** inputs, option rows, picker links, and the primary/secondary buttons have
  visible `focus-visible` rings; no global outline reset exists, so other controls keep the
  browser default focus ring. Focus moves to the active region on each screen/phase change.
- **Reduced motion:** the progress rail, loading skeleton, and the evaluating spinner all use
  `motion-reduce:` to drop animation.
- **Progress:** the rail is a `role="progressbar"` with `aria-valuenow/max` and a step label.

---

## 3. Frontend/backend contract notes

- **Two contracts exist in the repo.** The legacy static `check`/`results` flow uses
  `ExpungementAiEligibilityResult` (in `src/lib/expungement-ai/types.ts`). The new
  profile-driven flow uses `ScreeningEvaluation` (in the frontend contract mirror), per the lead
  instructions. The nine result codes are identical; the surrounding shapes differ. Consolidation
  is deferred (coexist-then-consolidate, per the approved decision).
- **`jurisdiction` shapes differ by design.** The profile's `jurisdiction` is an object
  `{ code, name, slug }`; the evaluation's `jurisdiction` is a string. Both are modeled distinctly.
- **Question types.** The live profiles use eight question types (`single_choice`, `multi_select`,
  `date_or_unknown`, `number_or_range`, `text`, `text_or_unknown`, `yes_no_unsure`,
  `yes_no_prefer_not_to_say`); all are rendered by one `QuestionField`. An unknown future type
  degrades to a calm, non-blocking fallback.
- **Font.** The design package specifies Sora; the repo's Tailwind `font-sans` is **Inter** and
  the whole existing app already uses it. The new flow conforms to the repo (Inter). Changing the
  global typeface is out of scope for this branch (Tailwind config is not a frontend-owned area).

---

## 4. What is NOT done here (by instruction)

- No backend integration, no merge of `feat/rcap-all51-source-engine`, no live endpoint flags.
- No live Stripe checkout session.
- No persistence for screening answers (answers stay in memory only).
- The no-env Supabase prerender error on `/auth/set-password` is a known environmental blocker
  during a no-env `next build`; it is unrelated to this frontend work and is not fixed here.
