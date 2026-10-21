# Contract audit — participant experiences, 2026-08-27

Twelve read-only agents audited the implementation against
`docs/PRODUCT_CONTRACT.md`, one per contract dimension. Every claimed gap then
went to an adversarial verifier instructed to **refute** it — search the tree
harder, search the 617 remote branches, check whether a verifier already asserts
the behaviour. Only gaps surviving that appear here.

25 agents · 4.0M tokens · 1,702 tool calls · 2h16m · **153 confirmed gaps**.

Full records: `CONTRACT_AUDIT_FINDINGS_20260827.json`.

```text
PARTIAL       79     CONTRADICTED  25     MISSING  25     UNMERGED  24
```

| Dimension | Gaps |
|---|---:|
| review-edit-and-invalidation | 22 |
| rcap-sponsorship-and-packet-credits | 18 |
| packet-information-and-save-resume | 17 |
| final-verification-recompute | 17 |
| free-screening-fact-separation | 13 |
| auth-handoff-and-matter-claim | 12 |
| payment-entitlement-render-artifact | 12 |
| partner-roles-tenant-isolation-reporting | 11 |
| preliminary-result-and-outcomes | 10 |
| clinic-mode-consent-ownership-reset | 9 |
| briefcase-free-and-matter-level | 6 |
| commercial-gate-and-checkout-binding | 6 |

## 1. The pending_id is the only thing authorizing a claim

**Security. Corrects an earlier assessment in this repository.**

`screening/pending/claim/route.ts:40-62` authorizes on possession of the
`pending_id` alone. Its checks are UUID shape, row existence, not-already-claimed
-by-another, expiry, and completeness. No cookie, nonce, IP or browser-session
binding is read. The row is created by a fully unauthenticated POST
(`pending/route.ts:17-92`) that records no session binder.

The `pending_id` then travels in query strings: `ScreeningFlow.tsx:350-353` into
`/expungement-ai/sign-in?pending=…`, `ConsumerSignInForm.tsx:242-250` into the
signUp `emailRedirectTo`, and `auth/set-password/page.tsx:456-462` deliberately
preserves it after scrubbing. `next.config.ts:3-5` sets no `Referrer-Policy`.

**The fix was designed and never built.**
`supabase/phase-38-expungement-pending-screening-results.sql:6` declares
`pending_token_hash`, and :53-54 comments that "server claims currently use
pending_id only". Across all 617 branches, no code ever writes or verifies it —
`git log --all -S'pending_token_hash'` returns only doc and schema-baseline
commits; `-S'pendingToken'` returns nothing. It is dead schema.

Any authenticated account that obtains an unclaimed `pending_id` — a shared link,
a shoulder-surfed URL, shared-device history, a copied sign-in link — can claim a
stranger's screening result, meaning their criminal-record answers, into its own
Briefcase. The original participant then receives 403 `pending_claimed` and
loses the result entirely.

This is the claim token the contract's §7 already requires: cryptographically
random, opaque, single-use, short-lived, hashed at rest, bound to the pending
result, stripped from the URL, protected against replay. The column exists. The
requirement is written. Only the implementation is absent.

**Correction to an earlier finding.** This repository previously recorded that
"the anonymity boundary is already built, and correctly." That was true of what
it examined — authentication *is* required, and a row claimed by another user
*is* refused — but it missed that possession of the identifier is the whole
authorization. The boundary between anonymous and authenticated is enforced. The
binding between a pending result and the browser that produced it is not.

## 2. The free product dead-ends in 29 of 51 jurisdictions

`questionLifecycle.completionAliasIds` drops `sentence_completion_date` and
`financial_obligations` from the rendered free set
(`screening-question-selection.ts:61-62`), while `projectPublicProfile` still
classifies them `required: true` and `requiredMissingPublicQuestionIds`
(`answer-normalization.ts:50-58`) still demands them — so `evaluator.ts:392-397`
returns `needs_more_info` / `missing_required_facts`.

Reproduced end to end for Alabama: answering all eleven questions the selector
actually renders returns `needs_more_info`, `paymentAllowed: false`,
`missingQuestionIds: ['sentence_completion_date','financial_obligations']` — both
with `renderedInFree=false`. The result screen lists the unanswerable question
and offers a fix button wired to `onEditAnswers(missing[0])`, which cannot reach
it.

Affected: AK AL AR AZ DC FL GA ID IL KS LA ME MO MT NC NE NJ NM NY OK OR SC SD TN
TX VT WI WV WY.

A participant answers every question correctly, is told more information is
needed, is shown a fact they were never asked for, and clicking the remedy does
nothing.

## 3. Two engine gates can never fire

**Open cases.** `pending_cases` is in `UNIVERSAL_PREPAY_FACT_IDS`
(`route-fact-relevance.ts:29-45`) as a fact "every route reads before it will
open a packet", and `evaluator.ts:1776` reads `isAffirmative(answers.pending_cases)`
as a hard `not_yet` blocker. It is selected into the free stage in **25 of 51**
jurisdictions. In the other 26 the value is `undefined`, `isAffirmative` returns
false, and the blocker silently passes. Absent in AK AZ CO CT DC DE FL HI IA ID
IL KS KY MA MS ND NH OK PA RI SD TN UT VA WI WV.

**Court-ordered requirements.** `court_requirements_completed` reaches free
screening in 36 of 51. `evaluator.ts:1776` blocks only on the literal values
`"no"` and `"not_sure"`, so an absent answer passes. Five jurisdictions — **CO
IN MI ND UT** — collect no completion fact at all: North Dakota's entire free set
is ownership_scope, jurisdiction_scope, case_outcome, offense_level,
possible_pathway_context, resolved_timing_bucket.

Root cause is pipeline ordering, self-documented at
`public-profile-projection.ts:960-966`: `withBroadCourtRequirementsGate` runs at
:956 and keys off a `resolved_timing_bucket` that `withBroadTimingBucketGate`
does not create until :971.

The engine treats silence as "finished".

## 4. One commit carries 20 of the 24 unmerged findings

```text
20  wip/20260827-national-cas-paused @ bef2f5ff
 3  claude/expai-flow-*
 1  unspecified
```

`bef2f5ff` and its migration `20260827120000_consumer_packet_verification_cas.sql`
are not "the first legitimate checkout fix". They are the protected storage layer
the entire authenticated experience rests on. Unmerged, and therefore absent:

packet-information save/resume storage · the versioned verification snapshot ·
invalidation persistence · verification-hash stability across a database
round-trip · application/SQL hash canonicalization · checkout session binding ·
the payment writer · durable render enqueue · artifact status and attachment
authority · sponsored entitlement · atomic exactly-once credit consumption ·
per-matter verification state · the exact-matter destination after claim · the
pre-payment Briefcase being populated at all.

Consequence today: a participant reaching the pay button gets *"We couldn't start
payment for this case"* — the matter-level $50 charge cannot be initiated on this
branch.

**This makes porting the CAS boundary the highest-leverage merge in the
repository**, ahead of its previous position in the build plan.

## 5. Other confirmed harms

- **Duplicate matters.** An already-signed-in participant double-tapping the
  result CTA on a slow connection gets two identical matters, each with its own
  $50 gate, and no way to tell which to pay for.
- **Partial claim strands the matter.** The matter appears in the Briefcase and
  every view reads "Details unavailable", permanently, with no user-reachable
  repair.
- **Required documents are never collected, platform-wide.** The participant is
  never told which certified dispositions, RAP sheets or court records to obtain.
- **Anonymous $50 offer.** An unauthenticated visitor can be invited to pay and
  lands on a dead "we couldn't find that matter" page.
- **Green CI misread as a working handoff**, so the missing CAS migration was
  never treated as a launch blocker.

## What this does not cover

Experience C (the partner portal) and §12A (participant data rights) postdate
this audit and are unexamined by it. The Grade-A section audit is still running.
