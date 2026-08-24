# Expungement.ai Phase 4 — Product Corrections

**Base:** `fd2c73d9006b3761a000d9b9e42244be24467e1a` (Phase 4 verification head)
**Branch:** `claude/expai-flow-corrections-p4`
**Safety branch:** `claude/expai-p4-verification-safety-fd2c73d9`

One consolidated product pass implementing the deterministic corrections from packets
CP-01 through CP-10. Nothing here decides a legal-owner question, invents a waiting
period, activates a held route, changes `operationallySellable`, deploys, migrates,
publishes a worker or calls Stripe.

---

## 1. Fail-closed checkout authority

`src/lib/rcap-engine/checkout-authority.ts` is now the single server-side answer to
"may this route take money". It is evaluated inside the authoritative evaluation, it
only ever subtracts from what the evaluator already concluded, and it reads no
client-supplied flag. It refuses when:

- the case is still open or a case is pending, and the route does not expressly permit
  it — no route does, and one may only be added with a source quote;
- the operative waiting period has not elapsed, or its anchor is missing, or it
  resolved ambiguously;
- **the timing answer was never consumed by the selected rule** — the timing gate now
  records what its conclusion was computed from (`anchor_date`, `timing_bucket`,
  `authored_no_waiting_period`, `route_override_anchor_date`, or an override that
  asked nothing), and a route that reported "satisfied" without consuming a
  participant timing fact cannot sell on the strength of it;
- the route resolves through the provisional prose fallback;
- its binding is not duration-provenance validated;
- it is `HELD_FOR_CORRECTION` or `LEGAL_OWNER_DECISION_REQUIRED`;
- it has no row in the audited authority at all — a new compiled pathway must be
  audited before it can sell.

| | before | after |
|---|---|---|
| routes allowing payment at the shortest timing bucket | **14** | **0** |
| routes allowing payment while the case is still open | **5** | **0** |
| fallback-dependent routes reaching payment | 268 eligible | **0** |
| payment-eligible routes | — | 38 of 325 |

The probe flows record it directly: 26 `_probe_inside_waiting_period` and
`_probe_state_exclusion_selected` rows left `dtc_paid` / `partner_sponsored_no_charge`
and reappeared as `dtc_no_payment`. A participant inside the waiting period, or one who
selected a state exclusion category, can no longer pay.

## 2. Waiting-rule authority

All 43 committed bindings audited (`build-waiting-rule-authority.mjs`):

| classification | count |
|---|---|
| VALIDATED_EXPLICIT_BINDING | 17 |
| VALIDATED_INLINE_RULE | 6 |
| CORRECTION_REQUIRED | 11 |
| LEGAL_OWNER_DECISION_REQUIRED | 9 |

A duration is valid only when it is the operative wait. A ref whose number is an age
threshold, a lookback, an offence-severity qualifier, a probation or sentence term, a
disqualifying window, or one branch of a multi-class rule is **withdrawn with its exact
reason, never rewritten** — rewriting it would be authoring a waiting period from a
defective source. When nothing operative survives, the binding becomes
`legal_review_required`, which the evaluator already treats as a configuration failure
and which the checkout authority refuses.

A second test was needed beyond duration shape: **route relevance**. A duration can be
perfectly well-formed and still belong to a different remedy. `routeRelevance` compares
the statute citations in the bound rule's text against the route's own and against every
other pathway the profile publishes.

> **MO marijuana — the reproduced P0, closed.** `MO:marijuana-expungement-under-missouri-constitution-article-xiv`
> was bound to `wait-01`, whose own quote is *"First intoxication-related traffic/boating
> offense 610.130 … after 10 years"*. 610.130 is the citation of a **different** Missouri
> pathway. The ref is withdrawn as `RULE_GOVERNS_A_DIFFERENT_ROUTE` and the route is held
> for legal review. No wait was invented to replace it.

**Proposals: 14 applied, 73 held.** A proposal is applied only when the rule id exists in
the same jurisdiction, the quote is traceable to the named rule, the duration is
operative and agrees with the profile, the selecting fact is a published question, and
the shard left no question open for counsel. 57 bindings now; 268 routes remain on the
fallback, which decides guidance and referral behaviour and can no longer reach checkout.

## 3. Route-aware ambiguity

`ambiguityReason` now judges an uncertain answer against the route it belongs to.
`src/lib/rcap-engine/route-fact-relevance.ts` computes relevance from the selected
pathway's own clauses, the decision rules that name it, the exclusion rules, **its own**
packet-generator entry, the waiting rules, and its escalation gate. With no pathway
selected every pathway is still viable and the union applies — the previous behaviour.

Pathway selection now runs *before* the ambiguity check so there is a route to reason
about. Selection reads only answers, so no route choice changes.

| | before | after |
|---|---|---|
| route-scoped questions that close an unrelated payable route | **5 of 16** | **0 of 16** |

All four `ca_prop64_*` questions now leave `CA:tool-1-dismissal-set-aside` untouched —
terminal and payment both unchanged by an uncertain Proposition 64 answer. The same
shape is closed for WI, NY and IN. `hi_court_order_confirmed` still gates
`HI:nonconviction-arrest-expungement`, which is correct: that route's own safety gate
reads it. No legally relevant question was removed.

## 4. County and court pipeline

The shared half all six shards were blocked on:

- `build-county-court-catalog.mjs` normalises the four dataset shapes the shards wrote —
  `controlled-filing-dataset`, `county-court-directory`, `county-court-instructions`,
  `record-clearing-filing-locations` — into one catalog. **42 jurisdictions, 1231
  counties, 140 courts**, every one harvested from a committed module. Nothing invents a
  county or a court.
- `county-court-catalog.ts` serves it; `public-profile-projection.ts` attaches it to the
  question that collects the fact, so a state-pack dataset finally reaches a participant.
- `ControlledLocationField.tsx` renders it: a searchable county list, a **county-filtered**
  court list with court type and location shown, an explicit "I'm not sure", and a manual
  entry.
- The answer keeps `value` (the controlled label — the only half ever treated as verified)
  separate from `manualValue`. A hand-typed court never becomes the verified fact: it
  travels in its own field and goes over the wire as not-yet-confirmed.
  `manualEntry.treatedAsVerified` is `false` by type.

**Parity:** the attachment is additive. No question id, type, stage, options array,
required flag or contextOnly flag changes, so `verify-expungement-plain-language-values`
passes and no approved delta is consumed. A jurisdiction with no dataset renders exactly
as before. **MS, ND, NH, PA, RI and UT publish no county or court question at all** and
are recorded as a source gap.

## 5. Remaining global issues

| issue | outcome |
|---|---|
| EXPAI-FA-006 / 007 county & court free text | **closed** — section 4 |
| EXPAI-FA-018 waiting-rule selector | **closed for the payment path** — 57 bindings, and no fallback route can reach checkout. The 268-route counsel queue remains, by design |
| EXPAI-FA-023 contextOnly vs. selectPathway | **closed** — `possible_pathway_context` is the one optional question that steers the route. Rather than change which remedy anyone gets, the promise was made accurate: the copy now says the answer is used to pick which route to check, and the evaluator names the exception instead of contradicting the flag silently |
| EXPAI-FA-015 route-scoped facts asked of everyone | **harm closed** — they no longer block an unrelated route. Not *asking* them until the route is known needs a `contextOnly`/`required` change, which is a parity-gated field: recorded as needing an approved delta, not taken unilaterally |
| EXPAI-FA-022 foreign state-prefixed questions | **held** — removing them changes the served question set and is parity-gated. Phase 4 measured them inert across all 51 jurisdictions, so the residual is payload hygiene, not a legal risk |

No `ENVIRONMENT_BLOCKED` issue is claimed closed from static evidence. The one
legal-owner global issue (EXPAI-FA-024) remains held.

## 6. Final flow dispositions — 356 real participant flows

| disposition | count |
|---|---|
| READY_FOR_HOSTED_ACCEPTANCE | 32 |
| HELD_FOR_CORRECTION | 120 |
| HELD_FOR_LEGAL_DECISION | 196 |
| HELD_FOR_ENVIRONMENT | 8 |

Purchasable real flows: **62 → 7**. All 7 rely on a VALIDATED binding and are
`HELD_FOR_ENVIRONMENT`. **No route is marked ACTIVE** — activation is Phase 5.

**Reviewed correction allowlist:** 61 intentional changes — 58 payment withdrawn, 3
payment opened (MT, ND, PA, all on validated bindings, all previously closed by the
route-blind ambiguity check).

## 7. Maryland — a conflict raised, not decided

Maryland's pardon route carries a dated, hash-pinned counsel approval from 2026-08-11
with its own behavioural proof. A Phase 3 shard later marked it `HELD_FOR_CORRECTION`
over its *waiting-rule binding* — a different question from the one counsel answered.

Withdrawing payment would have changed approved behaviour on the strength of a hold
about something else, so the approval is recorded as that route's payment authority in
`route-payment-authority.json`, by name, with its proof. **The shard's hold is kept
verbatim** in `denialsWaivedByCounselApproval` rather than erased. Every other gate
condition still applies: the wait still runs against the participant's own pardon date,
and the ten-year deadline bar still refuses a stale pardon. The conflict is raised for
the legal owner.

The evaluator hash was re-pinned only after `verify-rcap-md-pardon-pathway.mjs` passed
again, with the superseding reason stating exactly what changed and what did not.

## 8. Verification

`verify-corrections.mjs`: **12/12 passing** — 356 flows accounted for; zero premature
payment; zero open-case payment; zero fallback-dependent payment; every payable route on
a validated binding; zero eligibility, packet-family, form-set, unsupported-status or
sponsorship changes across all 356 real flows; county/court manual values separate and
unverified; holds non-purchasable; nothing active.

- `tsc --noEmit` — clean
- `eslint` — 0 errors, 77 warnings, **identical to the pre-change baseline**
- `verify-expungement-plain-language-values` — passes
- `verify-rcap-md-pardon-pathway` — passes
- `verify-flow-audit` — 29/33, the **same four** pre-existing failures (FA-16, FA-17,
  FA-21, FA-23) Phase 4 classified. No new red.
- `git diff --check` — clean

The committed flow manifest is left at its frozen Phase 3 bytes; continuity was measured
by regenerating it out of tree and comparing.

Not done in this session, per scope: worker fingerprints, deployment, migration and
hosted acceptance.
