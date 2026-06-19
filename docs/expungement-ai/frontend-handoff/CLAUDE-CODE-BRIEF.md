# Claude Code Brief — Build the Expungement.ai Consumer Frontend

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
- If the repo has nothing frontend yet, scaffold the smallest idiomatic app for the stack and
  say so in your first summary.

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

Make this a single shared TypeScript type in the repo (e.g. a `contracts/` or `types/` file the
engine side can also import or mirror). Both sides build to this file. The authoritative source
text for it is `00_SHARED_FRONTEND_CONTRACT.md` in the rule-level packet and the README in the
design files (section 4). If the engine's real response differs from this once it's live, the
engine wins and you update the frontend's field reads, never the reverse by guessing.

Until the engine is live, build against a **mock** that returns this shape. Isolate the mock
behind one function/module (e.g. `evaluateScreening()`), so swapping in the real
`POST /evaluate` is a one-file change. Do the same for profile loading.

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

Put these at the top of your own working notes. If a task seems to require breaking one, stop
and flag it rather than working around it.

---

## 3. The design files (your source of truth for look, flow, and copy)

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

## 4. Brand tokens

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

## 5. Build order

1. **Set up the shared contract type** (section 1) and the mock profile loader + mock
   `evaluateScreening()`. Everything else builds on these.
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

Wire to the real `/profiles` and `/evaluate` endpoints only when the engine exposes them; until
then the mock stands in, and the swap is the isolated change from step 1.

---

## 6. How to work

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
