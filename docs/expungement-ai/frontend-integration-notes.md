# Expungement.ai Consumer Frontend — Integration & QA Notes

Branch: `feat/expungement-ai-all51-frontend`

This document covers (1) the live backend integration now wired, (2) the responsive /
accessibility QA done on this branch, and (3) known frontend/backend contract notes. It is
documentation only.

> **STATUS: live wiring active.** The new profile-driven flow now calls the real source-engine
> endpoints (`GET /profiles/{state}`, `POST /evaluate`). `USE_LIVE_PROFILE_ENDPOINT` and
> `USE_LIVE_EVALUATE_ENDPOINT` are both `true`. The mock fixtures are retained behind the flags
> as an offline fallback only.
>
> **Open blocker (backend):** a completed public screening currently always returns
> `needs_more_info` from the live `/evaluate`. See "Open blocker" below. The frontend is wired
> correctly; this is an engine-side contract gap.

## Endpoint format (verified live)

- `GET /api/expungement-ai/profiles/{state}` — `{state}` is the **uppercase 2-letter code**
  (`IL`, `DC`). Returns the `PublicJurisdictionProfile`. Verified: `IL` → 200, `DC` → 200,
  unknown (`ZZ`) → 404 `unsupported_jurisdiction`. The response carries extra fields
  (`schemaVersion`, `flowStages[].questionIds`, `questions[].doesNotSelectPathway`,
  `copyGuardrails`, `caseOutcomeOptions`, `terminology.avoidUniversalExpungementLabel`); the
  frontend schema uses `.passthrough()`, so these are preserved and ignored safely.
- `POST /api/expungement-ai/evaluate` — body `{ jurisdiction, profileVersion, matterId, answers }`
  where `answers` is `Record<string, string | string[] | number | boolean | null>`. Returns the
  `ScreeningEvaluation` (identical to the frontend mirror; compile-time reconciled against
  `src/lib/rcap-engine/contracts.ts`). Verified: real public answer IDs → 200 (no
  `400 invalid_question_ids`).

## Open blocker — engine requires `source_question_*` the public flow cannot supply

Answering **every** public question for IL still returns `needs_more_info` with 16
`missingQuestionIds`, all `source_question_*` rows. Root cause is in the engine, not the
frontend:

- `src/lib/rcap-engine/evaluator.ts` runs `requiredMissingQuestionIds(profile, answers)` first,
  which treats **all** required, non-`contextOnly` engine questions as required — including the
  16 `source_question_*` rows.
- The public profile (and the design spec) deliberately exclude `source_question_*` from the
  consumer flow ("render as evaluation input, not consumer screens"), so the flow never sends
  those keys, and the gate can never clear.

The frontend cannot fix this without violating the safety rules (it must not render
`source_question_*` as screens or fabricate answers). Suggested backend fix: have
`requiredMissingQuestionIds` (or the public-evaluate path) ignore `source_question_*` rows, or
derive them from the public answers, so a completed public flow can reach a terminal result.
Until then, live screening terminates at `needs_more_info`.

---

## 1. What was wired (mock → live)

The whole flow talks to the engine through exactly two adapter functions; the live wiring is
confined to those two files.

### 1a. Profiles — `GET /api/expungement-ai/profiles/{state}`

File: `src/lib/expungement-ai/frontend/profile-loader.ts`

- `USE_LIVE_PROFILE_ENDPOINT = true`. `fetchLiveProfile(key)` calls the endpoint client-side
  (relative URL, runs in the browser) and the response is validated by `parseJurisdictionProfile`
  before render.
- `{state}` is the uppercase 2-letter code; `normalizeStateKey()` uppercases input and the picker
  links use the code. Slug/code conversion stays isolated here if the engine ever changes format.
- The bundled `all51.json` is **retained** as the static jurisdiction index for the picker
  (`listAvailableJurisdictions` / `listAvailableStateKeys`) and for missing/unknown
  classification. (Optional later optimization: replace it with a tiny code+name index to drop
  the ~276 KB from the client bundle; out of scope for this integration.)

### 1b. Evaluate — `POST /api/expungement-ai/evaluate`

File: `src/lib/expungement-ai/frontend/evaluate.ts`

- `USE_LIVE_EVALUATE_ENDPOINT = true`. `postLiveEvaluation(request)` POSTs the engine request
  `{ jurisdiction, profileVersion, matterId, answers }` and the response is validated by
  `parseScreeningEvaluation` before render.
- UI answers are converted to the wire shape by `toScreeningAnswers` (in
  `components/expungement-ai/screening/answers.ts`): unanswered/empty entries are omitted, and the
  "or unknown" toggle becomes a non-empty `"I am not sure"` token (recognized by the engine and
  not treated as a missing required answer).
- The mock path (`runMockEvaluation` / `buildNeedsReviewEvaluation`) is retained behind the flag
  as an offline fallback. The client never decides outcomes; it renders the validated
  `ScreeningEvaluation`.

### 1c. Contract mirror

`src/lib/expungement-ai/frontend/contracts.ts` is still a thin frontend mirror, but it is now
**reconciled at compile time** against the canonical `src/lib/rcap-engine/contracts.ts`: the
`EvaluationMatchesEngine` / `RequestMatchesEngine` type checks fail the build if the mirror drifts
from the engine. It can be collapsed into a direct re-export of the engine types in a later
cleanup; kept as a mirror for now so the frontend keeps its own runtime constants/schemas.

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

- No Stripe behavior change and no live Stripe checkout session (the result's packet action still
  routes to the existing `/expungement-ai/pay`).
- No migrations, no deploy, no Supabase secrets / env / Vercel / production config changes; no
  `package.json` / lockfile changes.
- Legacy generators and generic fallback routing were **not** restored.
- No persistence for screening answers (answers stay in memory only).
- The `needs_more_info` dead-end (see "Open blocker") is an engine-side fix; it was **not** worked
  around on the frontend.
- The no-env Supabase prerender error on `/auth/set-password` is a known environmental blocker
  during a no-env `next build`; it is unrelated to this frontend work and is not fixed here.
