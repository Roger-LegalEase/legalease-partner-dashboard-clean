# Expungement.ai — Screening Friction Fix: Save-and-Resume + Plain Language

Two linked workstreams that fix the friction users actually reported in the Mississippi pilot:
people stalled because they didn't have their information handy and wanted to come back, and
because some questions read like legal documents, not plain English. Neither touches the
engine, `paymentAllowed`, or the eligibility rules. Both are product-layer and content-layer
work.

The mantra is the spec: **we make it plain.** A question the user can't understand is friction
even if it's short. Wilma is there to help, but the question must stand on its own first.

---

## Part A — Save-and-Resume

### Why
Pilot users started, hit a question they didn't have the answer for (case number, charge,
dates), and asked to save and return rather than guess or quit. This is a *readiness* problem,
not a length problem. Save-and-resume solves the real drop reason and is lower-risk than moving
questions around the payment gate.

### Core rule (non-negotiable)
A resumed session re-runs through the **same evaluator** from the persisted answers. Resume
restores *input*, never a cached *result*. There is no shortcut path. The engine evaluates a
resumed session exactly as it would a fresh one. This keeps every eligibility and payment
guarantee intact.

### Data model (product layer, not engine)
A saved session persists:

```
session_id            uuid
created_at / updated_at
jurisdiction          state code
answers               map<questionId, value>   // raw answers only, never a result
current_question_id   where they left off
furthest_stage        how far they reached
resume_token          opaque, single-purpose, expiring
contact (optional)    email/phone the user gave to receive a resume link
status                in_progress | resumed | completed | abandoned
last_drop_question    the question they were on at last save  // analytics
```

Never persist a `resultCode`, `paymentAllowed`, or `packetPlan` on the saved session. Those are
derived fresh on resume by the engine. Persisting a result is the one way this feature could
corrupt the payment guarantee, so it is forbidden.

### Flow
1. User answers what they know.
2. At any point they tap **Save and come back** (and on any question they can't answer, the
   skip/unknown control offers it too).
3. If they give contact info, they get a resume link. If not, the session still persists for the
   browser/session and shows a "your progress is saved" state.
4. On resume, the app loads `answers`, drops them at `current_question_id`, and continues. When
   they finish, the engine evaluates the complete answer set normally.

### Save-event logging (this is the compounding dataset)
Every save logs: `last_drop_question`, `furthest_stage`, `jurisdiction`, timestamp, and whether
contact was given. After a few hundred saves this yields a **ranked list of which fields real
people don't have handy** — more valuable than any rule audit, because it's labeled by behavior.
Expected top offenders: `case_identifier`, `charge`, `disposition_date`.

### Drop-point follow-up
Because you know *where* each person stopped, follow-ups can be specific and useful, not nags:
"You're almost there — the last thing we need is your case number. Here's where to find it.
[Resume]." Measure **return rate by drop field**. Fields where follow-ups don't recover people
indicate an *external* obstacle (they genuinely can't get the record) — flag those; they are the
future RecordShield case, not a copy problem.

### Analytics split that matters
Separate **saved-and-resumed** from **saved-and-went-dark**. If a specific field predicts going
dark, that's not churn — it's people who can't obtain their own information. Size that; it's the
hard problem worth knowing about.

### What NOT to build
Do not build the post-payment-details pilot. The rule audit showed it buys ~2 fields per state
at real payment-gate risk, and the field data shows the problem is readiness, not length.
Save-and-resume captures the same friction reduction with no payment exposure.

---

## Part B — Plain-Language Rewrite

### Scope is small and finite
There are only **24 distinct consumer questions** across all 51 states. Fix these 24 prompts
(and the jargon-heavy option labels) and the whole product speaks plainly. This is a content
pass, reviewable in one sitting.

### The one hard rule
**Change the words the user reads. Never change the value the engine receives.**

Every option has a plain `label` (what the user sees) and a `value` (what the engine evaluates).
Rewrite the **label**, leave the **value** byte-for-byte identical. Do **not** collapse
legally-distinct options into one because they sound similar — "dismissed" and "acquitted" feel
alike to a user but route differently in the rules. The plain label leads; legal terms move to a
helper line so the person holding court paperwork can still match the exact word.

Pattern:
```
label:  "The case was dropped or thrown out"
help:   "includes dismissed, nolle prosequi, no-billed, or not prosecuted"
value:  (unchanged — whatever the engine already expects)
```

### Priority order
1. **`case_outcome`** — all 51 states, asked early, most jargon-dense, load-bearing for
   eligibility. Fix this first. Apply the label/value discipline most carefully here.
2. **`state_exclusion_categories`** — worst-written prompt in the set; leaks internal system
   language ("the source identifies as excluded or review-required"). Pure win to fix.
3. The readiness questions (`record_documents`, `criminal_history`) — make these the plainest,
   warmest questions in the flow; they're the save-and-resume entry points.

### Rewrite table (all 24 questions)

Prompts below are generic; `{State}` is interpolated per profile as today.

| id | Current prompt | Plain rewrite |
|---|---|---|
| `ownership_scope` | Are you asking about your own record? | *(already plain — keep)* |
| `jurisdiction_scope` | Is this a state or local matter from {State}, rather than a federal matter? | Did this case happen in {State} (not a federal case)? |
| `case_outcome` | How did the {State} case or record end? | How did the case end? *(see option rewrites below)* |
| `possible_pathway_context` | Do any of these {State} descriptions sound close to your situation? | Do any of these sound like your situation? *(optional — helps us guide you)* |
| `offense_level` | What level or type was the charge? | What kind of charge was it? |
| `court` | Which court or agency handled the case? | Which court or agency handled the case? *(keep — plain enough)* |
| `charge` | What charge, statute, or record description appears on the record? | What does the record say you were charged with? *(help: the charge name or code, however it's written)* |
| `record_documents` | Do you have court paperwork or a criminal-history record showing the exact charge and outcome? | Do you have your court paperwork handy? *(No worries if not — you can save and come back.)* |
| `county_or_filing_location` | Where in {State} was the case handled? | Where in {State} did the case happen? |
| `case_identifier` | What case, docket, cause, or arrest number appears on the record? | What's the case number? *(help: also called a docket, cause, or arrest number — it's on your court paperwork)* |
| `sentence_completion_date` | Have you completed every part of the sentence, supervision, probation, parole, classes, or community service? | Have you finished everything the court ordered? *(help: jail/probation/parole, classes, community service, anything still owed)* |
| `disposition_date` | When was the case disposed of, dismissed, completed, or discharged? | When did the case end or finish? |
| `financial_obligations` | Are all fines, restitution, court costs, and other required financial obligations resolved? | Have you paid off everything the court charged? *(help: fines, court costs, restitution)* |
| `age_at_offense` | How old were you when the offense or case began? | How old were you when this happened? |
| `pardon_status` | Have you received a pardon, certificate of rehabilitation, or similar executive relief for this conviction? | Have you gotten a pardon or similar official relief for this? |
| `pending_cases` | Do you currently have any pending criminal charge, open case, probation, parole, or other supervision? | Do you have any open cases right now? *(help: a charge in progress, or current probation/parole)* |
| `state_exclusion_categories` | Does the record involve any {State} category that the source identifies as excluded or review-required? | Did the case involve any of these? *(Some types follow special rules.)* |
| `criminal_history` | Do you have the {State} criminal-history report, court docket, or certified disposition needed to verify the record? | Do you have your background check or court records handy? *(No worries if not — you can save and come back.)* |
| `trafficking_status` | Was this offense connected to your status as a human-trafficking or sex-trafficking survivor? | Did this happen because you were a victim of human trafficking? |
| `prior_relief` | Have you previously received record-clearing relief in {State} or elsewhere? | Have you had a record cleared before, anywhere? |
| `county` | What {State} county, parish, borough, district, or local filing area handled the case? | Which county (or local area) handled the case? |
| `identity_error` | Was the arrest or record caused by mistaken identity, identity theft, or law-enforcement error? | Was this arrest a mistake — wrong person, identity theft, or an error? |
| `arrest_date` | When did the arrest or citation occur? | When did the arrest happen? |
| `case_number` | What is the case, cause, docket, or arrest number? | What's the case number? *(help: also called a docket, cause, or arrest number)* |

### `case_outcome` option rewrites (the priority)
Labels rewritten; **values unchanged**. Helper text preserves the legal terms.

| Plain label | Helper line (preserves legal terms) |
|---|---|
| Arrested, but never charged | arrest or citation with no charge filed |
| The case was dropped or thrown out | dismissed, no-billed, nolle prosequi, or not prosecuted |
| Found not guilty | acquitted or found not guilty |
| Completed a program instead of a conviction | diversion, deferred disposition, supervision, or similar |
| Convicted of a misdemeanor | a less serious conviction |
| Convicted of a felony | a more serious conviction |
| Another kind of conviction | other conviction or adjudication |
| It happened when I was a minor | juvenile adjudication or offense as a minor |
| Pardoned | pardoned conviction |
| I'm not sure | *(keep — and this is fine; Wilma and the tool can help)* |

### How this relates to Wilma
The questions must be plain enough to stand alone — Wilma is not a reason to leave jargon in.
The helper line carries the term-matching for people with paperwork. Wilma carries the deeper
"what does that even mean?" explanation. None of the three — question, helper, Wilma — ever
delivers a legal verdict. That stays with the engine.

### Guardrails for the rewrite PR
- Engine values: unchanged, verified by a test that the set of emitted `value`s per question is
  identical before and after.
- No option merged or removed; only labels and helper text change.
- No change to `required`, `contextOnly`, stage, or order.
- Readiness questions (`record_documents`, `criminal_history`) gain the "save and come back"
  affordance, tying Part B to Part A.

---

## Build sequence
1. **De-dup cleanup** (separate, already specced): delete duplicate `county_or_filing_location`
   / `case_identifier` where a twin exists. Free, no payment risk.
2. **Plain-language rewrite** (Part B): 24 prompts + `case_outcome` options, label/value
   discipline, engine values verified unchanged.
3. **Save-and-resume** (Part A): persisted sessions, resume link, save-event logging, re-run
   through evaluator on resume.
4. **Drop-point follow-up + analytics**: nudge by field, split resumed vs went-dark, build the
   "what people don't have handy" ranking.

All four are product/content layer. None touches the engine, payment, or eligibility logic.
