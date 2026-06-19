# Claude Code Brief — Build the Expungement.ai Consumer Frontend

## STOP: workspace and branch isolation

You are working in a dedicated frontend Codespace and branch:

- Repository: `Roger-LegalEase/legalease-partner-dashboard-clean`
- Required branch: `feat/expungement-ai-all51-frontend`
- Backend branch owned by Codex: `feat/rcap-all51-source-engine`

Before reading or editing code, run:

```bash
git branch --show-current
git status --short
```

If the branch is not exactly `feat/expungement-ai-all51-frontend`, stop without editing.
If `git status --short` is not empty at the start, stop and report the files.

Never work in the backend Codespace, backend branch, or the same git worktree as Codex.
Do not merge, deploy, apply migrations, modify secrets, or run live checkout.

Your first response must be a read-only implementation plan. Do not edit files until the human
says `Proceed with Milestone 1`.


You are building the consumer-facing frontend for Expungement.ai, a record-clearing product
that helps people check whether they may be able to clear a criminal record and, where a path
exists, generate a self-help filing packet. You are working in parallel with another agent
(Codex) that is building the backend engine. You build the frontend. You do not build the
engine, the rules, or eligibility logic.

Read this whole brief before writing code. The constraints in sections 1 and 2 are not style
preferences; they are the product. Softening them breaks the product and creates legal risk.

---

## 0. First, inspect the repo. Do not assume its layout.

Before anything else, look at what already exists:

- Read the root config (package.json, framework config, tsconfig) to learn the stack, the
  framework (likely Next.js), the package manager, the lint/format rules, and the directory
  conventions already in use.
- Find where the backend engine code lives and where a frontend app should live relative to it.
  The engine is mid-build by another agent. Do not edit engine code. Do not move it.
- Conform to the conventions you find. Put components, routes, and styles where this repo
  already puts them. Match its import style, naming, and formatting. Do not impose a structure
  from this brief; discover the repo's structure and fit it.
- This repository already has a Next.js consumer frontend. Do not scaffold a second app,
  introduce a second router, or replace the repository structure.
- Inspect existing Expungement.ai and Briefcase routes before proposing changes. Preserve current
  production behavior until the replacement flow is complete and verified on this branch.

You can see the repo; the person who wrote this brief could not. Trust the repo over any path
guess in this document.

---

## 1. The frozen contract (the one thing you must not redesign)

The frontend and the engine meet at exactly one boundary. Treat it as immutable. If it needs
to change, change it in the shared contract file and flag it; never let the frontend silently
diverge from it.

Two endpoints:
- `GET /api/expungement-ai/profiles/{state}` returns the jurisdiction profile (terminology,
  flow stages, question graph). The frontend renders this. It does not author it.
- `POST /api/expungement-ai/evaluate` takes `{ profileVersion, matterId, normalizedAnswers }`
  and returns the `ScreeningEvaluation` below. The frontend renders this. It does not compute it.

The evaluation result shape (render against this exactly):

```ts
type ScreeningEvaluation = {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
  pathwayId?: string;
  resultCode:
    | "packet_ready" | "packet_ready_with_caution" | "needs_more_info" | "not_yet"
    | "guidance_only" | "not_covered_yet" | "likely_not_eligible" | "needs_review" | "hard_stop";
  userLabel: string;
  reasons: Array<{ code: string; text: string; sourceRef?: string }>;
  missingQuestionIds: string[];
  cautions: string[];
  nextSteps: string[];
  paymentAllowed: boolean;
  packetPlan?: {
    pathwayId: string;
    mode: "official_form_overlay_or_source_form_set"
        | "state_specific_custom_packet_from_source_rules"
        | "automatic_relief_verification_and_guidance";
    formMappingStatus: "source_candidate_identified" | "custom_or_manual_mapping_required" | "not_required";
    sourceFormIds: string[];
    requiredInputIds: string[];
    sourceRuleRefs: string[];
  };
};
```

Codex owns the canonical backend contract file while the two branches are being built in
parallel. Do not create or edit a file in a backend-owned path. For the frontend branch, create a
clearly named temporary mirror under a frontend-owned directory, for example:

`src/lib/expungement-ai/frontend/contracts.ts`

Add a header comment stating that it is a temporary mirror of
`00_SHARED_FRONTEND_CONTRACT.md`. During integration, it will be replaced with an import from
the canonical shared contract after the backend branch lands.

The engine is the source of truth for legal outcomes and returned values. The shared transport
contract is the source of truth for response shape. If the live endpoint violates the contract,
fail safely and report the mismatch; do not silently guess, coerce, or redesign the contract.

Until the engine is live, build against mocks isolated behind exactly two adapter functions:

- `loadJurisdictionProfile(state)`
- `evaluateScreening(request)`

The mock evaluator must not contain legal rules or infer a result from answers. In the normal
mock flow, return a fixed safe fixture such as `needs_review`. Put examples of all nine result
codes in a separate development-only result gallery for visual testing. Never expose a
production query parameter, branch selector, or hidden input that can force `paymentAllowed`.

Swapping to the real endpoints must be limited to the adapter layer and use the full paths:

- `GET /api/expungement-ai/profiles/{state}`
- `POST /api/expungement-ai/evaluate`

Validate profile and evaluation responses at runtime before rendering. The repo already includes
Zod; do not add another validation dependency.

---

## 2. Non-negotiable safety constraints (UPL and user-wellbeing)

This is a justice product used by anxious people. These rules override "make it work":

1. **The frontend never decides eligibility.** It renders the engine's `resultCode`. It never
   infers, computes, or shortcuts a result, even when answers "obviously" point one way.
2. **No payment unless the engine says so.** Show the checkout / "generate packet" path only
   when `paymentAllowed === true` (which is only ever `packet_ready` or
   `packet_ready_with_caution`). Every other result saves and stops. Enforce this in the UI and
   assume the server enforces it too; do not rely on the client alone.
3. **Keep the framing honest.** "You may be able to…", "may qualify", "self-help packet",
   "court approval is not guaranteed", "not a law firm", "review before filing". Never "you
   qualify", "guaranteed", "we will clear your record", "we file for you".
4. **The context/pathway question is optional and non-routing.** Any profile question with
   `contextOnly: true` renders as optional, is labeled so it clearly does not decide the result,
   never blocks Continue, and never selects the pathway.
5. **Wilma is a guide, not a lawyer.** She explains and redirects; she never gives a verdict,
   advice, or an outcome prediction. Her logic/backend already exist (see the six Wilma docs).
   The frontend renders her surface, her kill-switch fallback, and a report-response control.
   Do not implement her guardrails client-side; render her service's responses.
6. **Render `source_question_*` rows as evaluation input, not as consumer screens.** Consumer
   screens come from the profile's `flowStages` order. The raw source-question rows are the
   engine's surface; do not turn them into question screens.
7. If no result fits, the engine returns `needs_review`. The frontend never manufactures a
   generic packet or a fallback verdict.
8. **Do not leak sensitive answers.** Never place case details, dates of birth, charges, case
   numbers, or contact information in URLs, analytics events, console logs, browser localStorage,
   or test snapshots. Until real persistence exists, keep mock answers in memory and do not claim
   they were permanently saved.
9. **Treat API/profile data as untrusted input.** Validate it, handle missing/unknown fields with a
   calm error state, and never turn malformed data into a packet-ready or payment-allowed state.
10. **No live commerce in this branch.** Payment UI may be rendered from fixtures, but no Stripe
    session may be created and no real checkout button may be active.

Put these at the top of your own working notes. If a task seems to require breaking one, stop
and flag it rather than working around it.

---

## 3. Frontend/backend file ownership

Claude may edit only frontend-owned areas unless the human explicitly approves a specific file:

- `src/app/expungement-ai/**`
- `src/app/briefcase/**`
- `src/components/expungement-ai/**`
- `src/lib/expungement-ai/frontend/**`
- frontend-only tests or verification scripts
- Expungement.ai assets under `public/`

Claude must not edit:

- `src/app/api/**`
- `src/lib/rcap/**`
- `src/lib/record-clearing/**`
- `src/lib/expungement-ai/eligibility-adapter.ts`
- `src/lib/expungement-ai/payment-adapter.ts`
- `src/lib/expungement-ai/packet-generation.ts`
- `src/lib/expungement-ai/briefcase.ts`
- `supabase/**`
- `.github/workflows/**`
- `vercel.json`, `next.config.*`, `.env*`, deployment configuration, or secrets
- `package.json` or the lockfile unless the human explicitly approves a dependency change

Do not delete or rename backend-owned files. Do not resolve backend TODOs. If a frontend need
requires a backend change, document it in the integration notes and continue with the adapter/mock
boundary.

---

## 4. The design files (your source of truth for look, flow, and copy)

These were built in a prior design pass and are the spec for what you're implementing. They
live outside the repo; the person briefing you will place them in the repo or a docs folder.
Filenames:

- `README-Frontend-Handoff.md` — the index. Read first. Contract, branch→screen map, launch
  model, brand tokens, build order.
- `FRONTEND-FLOW-NOTES.md` — the profile-driven flow: suggested React structure, the
  question-type→component mapping, the two integration points. This is your architecture guide.
- `expungement-flow-all51.html` — clickable reference: a state picker then the profile-driven
  flow, loading all 51 real jurisdiction profiles. This is the behavioral spec for the
  screening flow. Match its behavior, not its inline-vanilla-JS implementation.
- `expungement-flow-IL.html` — single-state version of the same, for focused reference.
- `profiles_fe/all51.json` — the 51 trimmed consumer profiles the flow renders. In production
  these come from `GET /profiles/{state}`; use this file as the mock profile source.
- `Expungement-Flow-Prototype.html` — the broader funnel + Briefcase + Wilma states (kill-switch
  fallback and report-response are built in here). Behavioral spec for those surfaces.
- `Briefcase-Design-Spec.docx` + `Briefcase-Product-Mockup.html` — the Briefcase (the logged-in
  home). Status-forward, matters contain documents, the guidance-only matter is its own state
  (Appendix A). Spec + visual reference.
- `Expungement-Landing-Full.html` + `hero-*.webp/jpg` — the marketing landing page.
- `Wilma-*.md` (six files) — Wilma's persona, system prompt, golden examples, adversarial test
  suite, telemetry/escalation, engineering build spec. Her behavior and safety; render her
  surface to match.

Treat the HTML files as behavioral and visual references, not code to port. Rebuild them as
idiomatic components in this repo's stack.

---

## 5. Brand tokens

- Navy (primary) `#0B1320` · Orange (action, used sparingly) `#FF3B00` ·
  Teal (positive / Wilma) `#0E9C8E` (the design files also use `#00A99D` for the same role) ·
  Cream `#F7F3EC` · Paper `#FBFAF7` · Slate `#475A6E` · Muted `#5A6275`.
- Typeface: Sora throughout.
- Logo: sunrise-over-road mark (navy arch, orange sun, slate road) — see the inline SVG in the
  flow files.
- Mobile-first. Large share of users on budget Android. Tap targets ≥ 44px. Visible keyboard
  focus. Respect reduced-motion. The progress "path forward" rail is the signature element;
  keep everything else quiet.

---

## 6. Build order

1. **Set up the frontend contract mirror and adapters** (section 1), the mock profile loader,
   the non-evaluating mock `evaluateScreening()`, runtime schemas, and safe error states.
   Everything else builds on these.
2. **The profile-driven screening flow** (the core): state picker → staged questions rendered
   from the profile → evaluating → result. Question-type→component mapping is the reusability
   key (single_choice, multi_select, date_or_unknown, number_or_range, text_or_unknown,
   case-details form, plus the contextOnly banner). One set of components renders all 51 states.
3. **The result screens** for all nine result codes, and the packet/checkout gate keyed only to
   `paymentAllowed`.
4. **Account + Briefcase** (the logged-in home), including the guidance-only matter state.
5. **Wilma surface**: the chat affordance on every screen, the kill-switch fallback
   (`wilma_enabled` server flag → graceful "taking a quick break", tool keeps working), and the
   report-response control feeding the review queue. Wire to her service; render, don't decide.
6. **Landing page.**
7. **Care states** from the Briefcase spec: waiting, needs-attention, denied (most sensitive),
   cleared.

Wire to the real API endpoints only after Codex exposes them and the backend branch is merged
into `main`. Until then, the mock stands in, and the swap is isolated to the adapters from step 1.
Do not copy backend implementation code into the frontend branch.

---

## 7. How to work

- Conform to the repo. Small, reviewable commits. Do not touch engine code or run deploys/
  migrations.
- After each milestone, summarize what you built, what you assumed, and any place the design
  files and the repo disagreed so a human can resolve it.
- When the design files underspecify something, prefer the calmest, plainest, most honest
  option for an anxious user, and flag the choice rather than inventing flourish.
- If anything would require the frontend to decide eligibility, assert an outcome, or show
  payment the engine didn't authorize: stop and flag it. That is always a contract or safety
  question, never a thing to implement your way around.

The product in one line: the frontend renders the jurisdiction profile and the engine's result,
beautifully and honestly, for someone who is nervous and needs a clear next step. It never
decides; it explains.

---

## 8. Required milestones and commits

Work one milestone at a time. At the end of each milestone:

1. Run the relevant checks.
2. Show the human a concise summary and changed-file list.
3. Commit with the exact style below.
4. Stop and wait for the next `Proceed` instruction.

Milestone 1 — contract mirror, schemas, adapters, mock profiles, safe fixtures  
Commit: `feat(expungement-ai): add frontend profile and evaluation adapters`

Milestone 2 — all-51 profile-driven state picker and staged question renderer  
Commit: `feat(expungement-ai): build all51 profile-driven screening flow`

Milestone 3 — nine result screens, safe errors, and payment-visibility clamp  
Commit: `feat(expungement-ai): render engine result states safely`

Milestone 4 — Briefcase presentation, Wilma surfaces, and care states  
Commit: `feat(expungement-ai): complete consumer support surfaces`

Milestone 5 — accessibility, responsive QA, and frontend verification  
Commit: `test(expungement-ai): verify all51 consumer frontend`

Run at minimum before the final report:

```bash
npm run lint
npm run typecheck
npm test
npm run expungement:verify-launch-polish
npm run expungement:verify-consumer-adapter
npm run expungement:verify-wilma-safety-harness
```

Do not weaken an existing verifier merely to make it pass. If a verifier contains an obsolete
MVP assumption, explain the conflict and propose the smallest truthful update.

---

## 9. Visual and behavioral acceptance criteria

- One navigation shell only; no duplicate navigation.
- No internal branch selector, forced-result control, `Case ending`, or `Packet path` UI.
- All 51 profiles load through the same reusable renderer.
- `contextOnly` questions are visibly optional and non-blocking.
- Raw `source_question_*` rows never become consumer screens.
- Back, resume, validation, loading, API-error, malformed-profile, and reduced-motion states work.
- Mobile layouts work at 320px width and all tap targets are at least 44px.
- Payment action is absent unless the rendered response has `paymentAllowed === true`.
- A result gallery may show all result codes only in development and must be inaccessible in a
  production build.
- No consumer copy promises eligibility, clearance, filing, or court approval.

---

## 10. Final report required

At completion, report:

- branch name and commit SHAs;
- exact files changed;
- profile coverage count;
- question-component coverage;
- result-screen coverage;
- commands run and pass/fail output;
- screenshots or preview paths for mobile and desktop;
- any frontend/backend contract mismatches;
- any design decision that still needs human approval;
- confirmation that no backend, migration, deployment, secret, or live-payment file changed.
