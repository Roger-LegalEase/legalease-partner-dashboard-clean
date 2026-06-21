# Screening Friction Fix — Build Plan + Codex Prompts

Four PRs, sequenced lowest-risk first. None touches the engine, `paymentAllowed`, eligibility
rules, Stripe, or Wilma's guardrails. Each is independently shippable and independently
reversible. Ship and verify each before starting the next.

| # | PR | Risk | Touches |
|---|---|---|---|
| 1 | De-dup cleanup | Lowest | Profile question lists (remove duplicate questions) |
| 2 | Plain-language rewrite | Low | Question labels + helper text only (values unchanged) |
| 3 | Save-and-resume | Medium | New product-layer session store + resume flow |
| 4 | Drop-point analytics + follow-up | Low | Logging + a re-engagement job |

Shared guardrails for every PR below (paste into each):

```
ABSOLUTE RULES:
- Do not change evaluator behavior or any file under src/lib/rcap-engine/ except where a PR
  explicitly edits compiled profile question presentation, and even then never a question's
  engine value, stage, required flag, contextOnly flag, or order.
- Do not change paymentAllowed logic, Stripe, checkout, webhooks, pricing, env vars, or domains.
- Do not change Wilma persona, system prompt, or guardrails.
- Do not change the result-code set or packet generation logic.
- Do not run migrations against production. New tables go through the normal migration review.
- Do not deploy.
- If a change appears to require touching evaluator logic or payment, STOP and report why.
Run before commit:
  git status --short
  npm run typecheck
  npm run lint
  npm test
  NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-placeholder npm run build
```

---

## PR 1 — De-dup cleanup

### What
In 13 states the profile asks for one fact twice: a duplicate logistics field
(`county_or_filing_location`, `case_identifier`) sits alongside a twin that the engine already
reads (`county`, `case_number`). Remove the duplicate, keep the engine-referenced twin. Where
both are unreferenced (OR, WV `county`), keep one, remove the other.

### Affected states / fields (from the rule-grounded audit)
- `county_or_filing_location` duplicate: CA, FL, GA, IA, ID, IN, KS, KY, MD, NE, OR, WV
- `case_identifier` duplicate: IN, LA, WV

### Critical safety
Removing a question is only safe if the engine does **not** read that exact field id. The audit
shows these specific duplicate ids are unreferenced, but the PR must **prove it per state** by
checking the field id against every rule structure before removing. If a "duplicate" id turns
out to be referenced anywhere, leave it and report.

### Codex prompt

```
Remove duplicate consumer questions from Expungement.ai compiled profiles where the same
underlying fact is collected twice and the duplicate field id is not referenced by any engine
rule. Do not change runtime behavior beyond removing the redundant question from the visible
flow.

Repo: /workspaces/legalease-partner-dashboard-clean
Branch: fix/expungement-dedup-duplicate-questions

[paste shared ABSOLUTE RULES]

Inputs to inspect:
- src/lib/rcap-engine/compiled/profiles/*.json
- src/lib/rcap-engine/evaluator.ts
- src/lib/rcap-engine/public-profile-projection.ts
- src/components/expungement-ai/screening/screens.ts

Task:
For each profile, consider only these candidate duplicate field ids:
  county_or_filing_location (twin: county)
  case_identifier (twin: case_number)

For each candidate present in a profile:
1. Confirm the twin field is also present in that profile's consumer questions.
2. Mechanically confirm the candidate field id does NOT appear in any of:
   orderedDecisionRules, exclusionRules, waitingPeriodRules (in any when.fieldsReferenced,
   requiredFields, or equivalent condition array), nor in packetPlan requiredInputIds, nor
   hardcoded in evaluator.ts / public-profile-projection.ts / answer-normalization.ts.
3. If and only if both are true, remove the candidate question from that profile's questions
   list (and any screens.ts reference), keeping the twin.
4. If the candidate is referenced anywhere, DO NOT remove it. Record it in the report as
   "kept — referenced."

Do not change the twin. Do not change any value, stage, required, contextOnly, or order of
remaining questions. Do not touch profiles where neither candidate is a true duplicate.

Add a test asserting that for every modified profile, the set of field ids the engine can
reference is unchanged (i.e., no removed id was engine-referenced), and that evaluating a
representative answer set yields the same resultCode and paymentAllowed before and after.

Report:
- per state: candidate found, twin confirmed, referenced yes/no, removed yes/no
- total questions removed
- confirmation no engine-referenced field was removed
- confirmation no value/stage/required/order changed
- typecheck/lint/test/build results
- PR URL, no deploy
```

---

## PR 2 — Plain-language rewrite

### What
Rewrite the 24 distinct consumer question labels and the `case_outcome` option labels into plain
English. **Engine values stay byte-for-byte identical.** Add an optional `help` line per question
or option that preserves legal terms for paperwork-matching. No option merged or removed.

### The one rule
Change `label`. Never change `value`. The PR must include a test proving the set of emitted
values per question is identical before and after.

### Source of rewrites
Use the rewrite table in `SCREENING-FRICTION-SPEC.md` (Part B). Prompts are generic with `{State}`
interpolated as today. `case_outcome` option rewrites are in that doc.

### Codex prompt

```
Rewrite Expungement.ai screening question labels and option labels into plain English. Do not
change any engine value, stage, required flag, contextOnly flag, question order, or the option
value set. This is a content/presentation change only.

Repo: /workspaces/legalease-partner-dashboard-clean
Branch: fix/expungement-plain-language

[paste shared ABSOLUTE RULES]

Inputs:
- docs/expungement-ai/SCREENING-FRICTION-SPEC.md   (the rewrite table — source of truth for copy)
- src/lib/rcap-engine/compiled/profiles/*.json
- src/components/expungement-ai/screening/screens.ts
- src/components/expungement-ai/screening/ScreeningFlow.tsx

Task:
1. For each of the 24 distinct consumer questions, replace the user-facing prompt text with the
   plain rewrite from the spec's table. Preserve {State} interpolation exactly as today.
2. For case_outcome, replace each option's user-facing label with the plain label from the
   spec, and add a help/subtext line carrying the legal terms. DO NOT change any option value.
   DO NOT add, remove, merge, or reorder options.
3. Add an optional help/subtext field to the question/option schema ONLY IF one does not exist,
   as a presentation-only field. If adding it requires a schema change, keep it additive and
   non-breaking; do not alter how values are read.
4. Make record_documents and criminal_history the warmest copy, and ensure their screens expose
   the "Save and come back" affordance (coordinate with PR 3; if PR 3 not yet merged, leave a
   clearly-marked TODO hook, do not implement the save backend here).

Hard constraints:
- The set of option `value`s for every question must be identical before and after. Add a test
  that fails if any value string changes, is added, or is removed.
- No change to required, contextOnly, stage, order, or the engine's reading of any answer.

Report:
- number of prompts rewritten
- number of option labels rewritten
- confirmation option value sets unchanged (test output)
- confirmation no stage/required/order/contextOnly changed
- screenshots or rendered text samples of case_outcome and state_exclusion_categories
- typecheck/lint/test/build results
- PR URL, no deploy
```

---

## PR 3 — Save-and-resume

### What
Persist a user's answers so they can leave and return to where they stopped. A resumed session
**re-runs through the same evaluator** from the persisted answers — resume restores input, never
a cached result. Never persist resultCode, paymentAllowed, or packetPlan.

### Data model
Product-layer session store (new table), schema in `SCREENING-FRICTION-SPEC.md` Part A. Key
fields: session_id, jurisdiction, answers map, current_question_id, furthest_stage,
resume_token (expiring), optional contact, status, last_drop_question.

### Codex prompt

```
Implement save-and-resume for the Expungement.ai screening flow as a product-layer feature. A
resumed session must re-run through the existing evaluator from persisted answers. Never cache
or persist a result, paymentAllowed, or packetPlan. Do not change the engine.

Repo: /workspaces/legalease-partner-dashboard-clean
Branch: feat/expungement-save-and-resume

[paste shared ABSOLUTE RULES]
(Exception to "no migrations": you MAY create a new migration FILE for the sessions table, but
do not run it against production; leave it for normal migration review.)

Inputs:
- src/components/expungement-ai/screening/ScreeningFlow.tsx
- src/lib/rcap-engine/evaluator.ts                 (read-only: understand the evaluate entrypoint)
- src/lib/expungement-ai/payment-adapter.ts        (read-only)
- docs/expungement-ai/SCREENING-FRICTION-SPEC.md   (data model + flow, Part A)

Task:
1. Create a screening_sessions table (migration file only) with:
   session_id (uuid pk), created_at, updated_at, jurisdiction, answers (jsonb),
   current_question_id, furthest_stage, resume_token (unique, expiring), contact (nullable),
   status (in_progress|resumed|completed|abandoned), last_drop_question.
   Explicitly NO column for resultCode, paymentAllowed, or packetPlan.
2. Persist/update the session as the user answers. On "Save and come back," generate a
   single-purpose expiring resume_token; if contact provided, store it for follow-up.
3. Implement resume: given a resume_token, load answers, restore current_question_id, continue
   the flow. On completion, call the SAME evaluate path a fresh session uses. Do not branch
   evaluator behavior for resumed sessions.
4. Add the "Save and come back" control to every question's skip/unknown affordance and
   prominently on record_documents and criminal_history.
5. Security: resume_token must be opaque, unguessable, single-purpose, and expiring. Do not
   expose session contents without a valid token. No PII in logs.

Hard constraints:
- Never write resultCode/paymentAllowed/packetPlan to the session.
- Resumed evaluation is byte-identical to fresh evaluation for the same answers — add a test
  that builds an answer set, evaluates fresh, saves+resumes+evaluates, and asserts identical
  resultCode, paymentAllowed, and packetPlan.
- No change to evaluator, payment, or Wilma.

Report:
- migration file path (not run)
- session lifecycle implemented
- resume-equals-fresh test result
- token security notes
- typecheck/lint/test/build results
- PR URL, no deploy
```

---

## PR 4 — Drop-point analytics + follow-up

### What
Log every save with its drop-point field, build the "what people don't have handy" ranking, and
send contextual resume follow-ups. Measure return rate by field; split resumed vs went-dark.

### Codex prompt

```
Add drop-point analytics and contextual resume follow-up to Expungement.ai save-and-resume. Do
not change the engine, payment, or Wilma. Analytics and a re-engagement job only.

Repo: /workspaces/legalease-partner-dashboard-clean
Branch: feat/expungement-drop-point-followup
Depends on: feat/expungement-save-and-resume (PR 3) merged.

[paste shared ABSOLUTE RULES]

Inputs:
- the screening_sessions table from PR 3
- existing analytics/event infrastructure (inspect and conform to it)
- existing transactional email/SMS infrastructure (inspect; do not add a new vendor)

Task:
1. On each save, emit an analytics event: { last_drop_question, furthest_stage, jurisdiction,
   contact_given:boolean, timestamp }. No PII in the event payload beyond a hashed session ref.
2. Build a read-only query/report: count of saves by last_drop_question, by state, ranked —
   "fields people most often don't have handy."
3. Add a report split: saved_and_resumed vs saved_and_went_dark, and which last_drop_question
   predicts going dark.
4. Contextual follow-up: for sessions with contact + status in_progress past a threshold, send
   ONE helpful, field-specific message ("the last thing we need is your case number — here's
   where to find it — [resume link]"). Make message copy per drop-field, plain language,
   matching the "we make it plain" voice. Respect opt-out and rate limits. No nagging cadence;
   one or at most two messages.
5. Track follow-up -> return conversion by drop-field.

Hard constraints:
- No PII in analytics logs.
- Follow-up uses existing comms infra, honors opt-out, is rate-limited.
- No engine/payment/Wilma changes.

Report:
- events emitted
- the drop-field ranking (sample output)
- resumed-vs-went-dark split (sample output)
- follow-up logic + opt-out handling
- typecheck/lint/test/build results
- PR URL, no deploy
```

---

## Sequencing notes
- PR 1 and PR 2 are independent and could ship in either order; PR 1 first is marginally cleaner
  (fewer questions to rewrite).
- PR 3 should land before PR 4 (PR 4 depends on the sessions table).
- PR 2's "Save and come back" copy on readiness questions assumes PR 3's backend; if PR 2 ships
  first, leave the affordance as a marked hook and wire it in PR 3.
- After all four: the de-dup and plain-language wins are immediate; the save/analytics flywheel
  starts compounding the "what people don't have handy" dataset, which is also your early
  RecordShield demand evidence.
