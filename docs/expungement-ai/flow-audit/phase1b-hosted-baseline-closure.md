# Phase 1B — hosted baseline closure and reachability reconciliation

**Canonical branch:** `claude/expai-flow-audit-p1`
**Required HEAD:** `8e7580ca509fb078144e64549e00ef6908b3a623` — resolved and matched
**Product base:** `dd93579871962260b12918e54c44cf9bf1e81529` — ancestor of the branch
**Product behaviour changed:** none.

## 1. What this phase corrected

Half right, and wrong about which half matters.

**Phase 1 claimed:** 19 jurisdictions reach no packet-ready outcome because lifecyclePhaseForQuestion and phaseForWilmaFact classify the facts the evaluator needs as postpay, so the flow never asks them.

**What falsified it:** Supplying all six shared postpay facts to the closest rendered-only answer set changed no jurisdiction's terminal (experiment E2). Additionally pinning all five timing-and-completion gate fields plus the timing bucket to their clearing answers still reached packet-ready in none of the 19 (experiment E3). The lifecycle classification is real and is a defect in its own right, but it is not what closes those 19 jurisdictions.

**What is actually blocking them:** The evaluator cannot select a waiting rule for the route the participant reaches. In 13 of the 19, naming a waiting_rule_id the jurisdiction's OWN compiled profile already contains turns the terminal into packet_ready_with_caution, in most cases with paymentAllowed true (experiment E4). The legal route, the state's data and the payment clamp are all fine. What fails is bestWaitingRuleForPathway's automatic selection, on a route whose rules are sitting right there.

**A note on method, because the same trap is easy to fall into.** One earlier version of this audit's own search ranked not_yet above needs_review, which gave the optimizer an incentive to answer 'no, I have not completed what the court ordered' in order to reach a better-ranked terminal. That flaw produced a false picture and is why the gate fields are pinned rather than optimized. Recorded because the same trap will catch the next person who measures this.

### The four experiments

| # | Answer set | Question it answers |
| --- | --- | --- |
| E1 | Rendered screens only | What can a participant do today? |
| E2 | E1 + the six shared facts the projection files postpay | Is the lifecycle classification what closes the state? |
| E3 | E2 + every timing and completion gate field pinned to its clearing answer | Is it any unasked fact at all? |
| E4 | E3 + a `waiting_rule_id` the state's own profile already contains | Is the route broken, or only the path to it? |

E2 moved nothing. E3 moved nothing. E4 reached `packet_ready_with_caution` in 13 of the 19, 12 of them with payment allowed.

## 2. Hosted workflow preflight

The hosted workflow declares `on: workflow_call` only and is reached through `rcap-f1-ephemeral-staging.yml`'s `mode` input.

| # | Condition | Verdict |
| --- | --- | --- |
| 1 | It deploys the Expungement.ai consumer surface required by this audit | proved |
| 2 | It deploys the exact requested branch SHA | DISPROVED, with a material qualification |
| 3 | It uses a non-production Supabase project | proved, and proved by execution rather than by reading |
| 4 | It can seed synthetic consumer, legacy, sponsored and admin fixtures | proved by inspection, not exercised |
| 5 | It uses Stripe test mode only | proved |
| 6 | It does not require production participant or partner data | proved |
| 7 | It does not print or commit secrets | proved |

**On condition 2, which is the one that fails.** The first preflight step refuses any application_sha that is not AUTHORIZED_APPLICATION_SHA = f7ed0ad3a8f37a0c1446b62760b1a36fb163c926. The audit branch head (8e7580ca) and the audited product base (dd93579) are both refused. The qualification: f7ed0ad3 and dd93579 differ on 33 files under src/, and every one of them is a partner-onboarding surface. Every Expungement.ai flow-authority file this audit measures is byte-identical between the two commits, including public-profile-projection.ts, evaluator.ts, compiled/all51.json, screens.ts, packet-information.ts and the Briefcase matter page. Hosted evidence gathered at f7ed0ad3 would therefore be valid for the flow surfaces under audit, and invalid for nothing this audit claims.

### Secret to step map

| Secret | Required | Consuming steps |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | yes | 8 steps, beginning with "Prove the credentials and the acceptance project (scripts/rcap-hosted-acceptance-preflight.mjs)" |
| `VERCEL_TOKEN` | yes | 8 steps, beginning with "Prove the credentials and the acceptance project" |
| `VERCEL_ORG_ID` | yes | the same eight steps as VERCEL_TOKEN; it scopes every Vercel API call to the owning team |
| `VERCEL_PROJECT_ID` | yes | the same eight steps as VERCEL_TOKEN, minus the Preview resolution boundary's team probe; it names the project the Preview belongs to |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | declared optional | 5 steps, beginning with "Resolve the Preview this run will use" |

Declared optional by the workflow but effectively required for any crawl from outside GitHub Actions: without it a Preview protected by Vercel Authentication answers every unauthenticated probe with Vercel's own wall, and a crawler cannot tell the application's gate from Vercel's.

### Values required beyond the five secrets

| Name | Kind | Value or note |
| --- | --- | --- |
| `application_sha` | pinned input | `f7ed0ad3a8f37a0c1446b62760b1a36fb163c926` |
| `worker_source_sha` | pinned input | `5ac0d8d6910aec3dc6259b2d4da6931abc5af7e8` |
| `worker_digest` | pinned input | `sha256:4e5b58e4492289446bcbdd100bb39dcd13dd4512916679fa2a252e4532ab9530` |
| `tools_sha` | derived input | `6d9e8792b8c68671220cac5f294562e3b3ba1b25` |
| `supabase_project_ref` | pinned input | `hyflxnlhpmiqxvvcoiia` |
| `GITHUB_TOKEN packages:read` | workflow permission | Needed to pull the pinned worker image from ghcr.io for any matrix or gate phase. |
| `staging migration authorization` | governance | The decisive one. See stagingAuthorizationBlocker below. |

**The five secrets are not sufficient.** Four more pinned inputs are required, one of which — `tools_sha` — is documented nowhere and had to be derived by scanning `main`'s history for a commit that is simultaneously an ancestor of `main`, byte-identical to `application_sha` on the application paths, and byte-identical to `worker_source_sha` on the worker image inputs.

## 3. What actually ran

| Phase | Run | Conclusion | Read-only | Artifact |
| --- | --- | --- | --- | --- |
| `hosted_preflight` | [32655814905](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/32655814905) | success | yes | `rcap-hosted-preflight-32655814905` (1227 bytes) |
| `hosted_vercel_audit` | [32656224687](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/32656224687) | failure | yes | `rcap-hosted-vercel_audit-32656224687` (548 bytes) |

The preflight **passed**. That is real hosted evidence and it settles two things that were open at the end of Phase 1: all four required credentials are present and usable, and the acceptance Supabase project is demonstrably not production — proved by identity, by emptiness, and by hashed disjointness from the production Supabase URL.

The `vercel_audit` run found no reusable Preview, so there is no existing deployment URL or deployment SHA to record.

## 4. Why the ten journeys were not exercised

Every phase that can exercise a journey — accept, payment, full — depends on the acceptance project carrying migrations 49 through 54. data/rcap-staging-action.json records status 'prepared_queued_not_authorized' and states in its own note that 'this record authorizes nothing. Staging execution requires Roger to name the environment values below AND to grant staging scope on every authorization in the sequence.' Phases 50 through 54 each carry scopedAuthorization.staging = 'queued — requires Roger to name both migration files and the staging environment'. AGENTS.md independently gates live Supabase migrations on Roger's approval.

**Consequence:** The hosted preflight is proven and the credentials work. The ten journeys this phase asks for — paid consumer, sponsored consumer, legacy matter, valid/expired/exhausted sponsored session, checkout creation, cancellation, retry, and save/refresh/resume — all sit behind that one authorization.

**What was not done:** No migration was applied. No Preview was deployed. No synthetic identity was created. No Stripe session was created.

**What would unblock it:** Roger naming the acceptance environment and granting staging scope on migrations 50 through 54, after which hosted_migrate then hosted_full would provision, seed and exercise the journeys in one run.

## 5. Denominator reconciliation

| Relation | Kind | Detail |
| --- | --- | --- |
| 622 flow IDs → 356 remedy rows + 266 non-remedy rows | partition | 356 rows describe a compiled pathway; 266 describe one of the six non-remedy probes across 51 jurisdictions plus the single unregistered-jurisdiction row. 51 x 5 probes = 255, plus 10 extra rows where a probe landed on a payment-eligible terminal and therefore emitted a partner-sponsored row as well, plus the unregistered row = 266. |
| 622 flow IDs → 90 supported + 182 unsupported + 350 referral | second partition of the same rows | Not an additional 622. Terminal classification re-cuts the same denominator: a row is supported when its terminal is neither an unsupported nor a referral outcome. |
| 41 paid/sponsored rows → 14 checkout-guard passes + 27 checkout refusals | the DTC half of the payment-eligible rows | 41 distinct (jurisdiction, pathway) pairs are payment-allowed at the evaluator. Each emits one DTC row and one partner-sponsored row. The 14 DTC rows whose route is not refused by a deferral or treatment classification are the checkout-guard passes; the other 27 are refused. 14 + 27 = 41 = the sponsored row count. |
| 622 flow IDs → 121 browser terminals | sample, not subset arithmetic | The crawl walks one canonical supported flow, one unsupported and one referral flow per jurisdiction, on desktop, plus one mobile capture per unique screen template, plus two shared surfaces. That is 111 distinct flow IDs and 123 records. Crawling all 622 would re-drive the same six to eighteen screens hundreds of times; the manifest already holds the per-flow evaluation, and the browser's job is what the evaluator cannot answer. |
| 121 browser terminals → 117 matched + 4 diverged | partition | Each comparable record's rendered result-card eyebrow is mapped back to an engine result code and compared with the manifest row that drove it. |

All 6 arithmetic assertions hold; the generator fails rather than emitting a report if any stops holding.

### The four browser/manifest divergences

**`EXPAI-CA-820d8cab8d`** — CA, desktop-1440x1000

- expected `likely_not_eligible`, actual `needs_review`
- first divergence: No rendered screen was answered differently from the fixture. The divergence is downstream of the answers: either the result card renders two engine result codes identically, or the fixture supplied a fact the flow never renders.
- classification: `crawl_answer_differs`; browser answers replayed through the evaluator give `needs_review`
- severity **P3**; owner: flow audit harness — the crawl driver, not the product

**`EXPAI-DE-72bbc41cea`** — DE, desktop-1440x1000

- expected `packet_ready`, actual `packet_ready_with_caution`
- first divergence: No rendered screen was answered differently from the fixture. The divergence is downstream of the answers: either the result card renders two engine result codes identically, or the fixture supplied a fact the flow never renders.
- classification: `evaluator_disagrees`; browser answers replayed through the evaluator give `packet_ready`
- severity **P2**; owner: shared result presentation — two engine result codes render an eyebrow differing only by a full stop, so the browser cannot distinguish them

**`EXPAI-CA-820d8cab8d`** — CA, mobile-390x844

- expected `likely_not_eligible`, actual `needs_review`
- first divergence: No rendered screen was answered differently from the fixture. The divergence is downstream of the answers: either the result card renders two engine result codes identically, or the fixture supplied a fact the flow never renders.
- classification: `crawl_answer_differs`; browser answers replayed through the evaluator give `needs_review`
- severity **P3**; owner: flow audit harness — the crawl driver, not the product

**`EXPAI-DE-72bbc41cea`** — DE, mobile-390x844

- expected `packet_ready`, actual `packet_ready_with_caution`
- first divergence: No rendered screen was answered differently from the fixture. The divergence is downstream of the answers: either the result card renders two engine result codes identically, or the fixture supplied a fact the flow never renders.
- classification: `evaluator_disagrees`; browser answers replayed through the evaluator give `packet_ready`
- severity **P2**; owner: shared result presentation — two engine result codes render an eyebrow differing only by a full stop, so the browser cannot distinguish them

## 6. Question-node reconciliation

The 1,824 served-but-not-rendered nodes cover 42 distinct question ids.

| Bucket | Raw nodes | Distinct question ids |
| --- | --- | --- |
| `dead_or_unreachable` | 267 | 6 |
| `human_legal_review_required` | 51 | 1 |
| `intentionally_conditional_and_not_selected` | 800 | 16 |
| `intentionally_post_entitlement` | 3 | 2 |
| `lifecycle_misclassified` | 484 | 15 |
| `purpose_not_found` | 219 | 5 |

Most of it is the product working: 800 nodes across 16 ids are other states' route questions, carried by the one shared Wilma fact list and correctly kept off screen outside their own state. The bucket that is a defect by construction is `lifecycle_misclassified`: 484 nodes across 15 ids where the projection files a question postpay and the evaluator reads it before it will decide a packet.

### The five named facts

#### `financial_obligations`

- rendered as a screen in **30 of 51** jurisdictions; served without being rendered in **21**
- consumed by a compiled rule in **37** profiles
- first required at: `evaluateCompiledTiming` (src/lib/rcap-engine/evaluator.ts:1567)
- current lifecycle source: named explicitly in src/lib/rcap-engine/public-profile-projection.ts
- does the UI render, prefill or confirm it before that point? renders in 30 of 51 jurisdictions; prefills — no — the packet-information model prefills only ids present in the packet plan's requiredInputIds, and only after the matter is saved, which is already past the evaluation; confirms — no — nothing in the screening flow shows the participant a value for this fact or asks them to confirm one
- affected flows: 263

#### `pending_cases`

- rendered as a screen in **25 of 51** jurisdictions; served without being rendered in **26**
- consumed by a compiled rule in **30** profiles
- first required at: `nyCpl16059SafetyGate` (src/lib/rcap-engine/evaluator.ts:880)
- current lifecycle source: named explicitly in src/lib/rcap-engine/public-profile-projection.ts
- does the UI render, prefill or confirm it before that point? renders in 25 of 51 jurisdictions; prefills — no — the packet-information model prefills only ids present in the packet plan's requiredInputIds, and only after the matter is saved, which is already past the evaluation; confirms — no — nothing in the screening flow shows the participant a value for this fact or asks them to confirm one
- affected flows: 327

#### `sentence_completion_date`

- rendered as a screen in **33 of 51** jurisdictions; served without being rendered in **18**
- consumed by a compiled rule in **42** profiles
- first required at: `nyCpl16058SafetyGate` (src/lib/rcap-engine/evaluator.ts:851)
- current lifecycle source: named explicitly in src/lib/rcap-engine/public-profile-projection.ts
- does the UI render, prefill or confirm it before that point? renders in 33 of 51 jurisdictions; prefills — no — the packet-information model prefills only ids present in the packet plan's requiredInputIds, and only after the matter is saved, which is already past the evaluation; confirms — no — nothing in the screening flow shows the participant a value for this fact or asks them to confirm one
- affected flows: 217

#### `special_preconditions_confirmed`

- rendered as a screen in **0 of 51** jurisdictions; served without being rendered in **51**
- consumed by a compiled rule in **0** profiles
- first required at: `evaluateCompiledTiming` (src/lib/rcap-engine/evaluator.ts:1580)
- current lifecycle source: named explicitly in src/lib/rcap-engine/public-profile-projection.ts
- does the UI render, prefill or confirm it before that point? renders never; prefills — no — the packet-information model prefills only ids present in the packet plan's requiredInputIds, and only after the matter is saved, which is already past the evaluation; confirms — no — nothing in the screening flow shows the participant a value for this fact or asks them to confirm one
- affected flows: 621

#### `new_convictions_during_waiting_period`

- rendered as a screen in **0 of 51** jurisdictions; served without being rendered in **51**
- consumed by a compiled rule in **0** profiles
- first required at: `nyCpl16059SafetyGate` (src/lib/rcap-engine/evaluator.ts:883)
- current lifecycle source: named explicitly in src/lib/rcap-engine/public-profile-projection.ts
- does the UI render, prefill or confirm it before that point? renders never; prefills — no — the packet-information model prefills only ids present in the packet plan's requiredInputIds, and only after the matter is saved, which is already past the evaluation; confirms — no — nothing in the screening flow shows the participant a value for this fact or asks them to confirm one
- affected flows: 621

**Recommended shared architecture correction (identical for all five):** Decide lifecycle from consumption, not from prose. A fact any compiled rule references, or the evaluator reads before a packet decision, is prepay by definition and must be emitted as a rendered screen in every jurisdiction whose profile declares it. Replace the regex-and-allowlist classifier with that derivation, and make the projection fail closed: a question the evaluator reads that is not classified prepay should fail the build, not reach the browser as a postpay field.

The signature is inconsistency, not absence. The signature is inconsistency rather than absence. financial_obligations renders as a screen in 30 jurisdictions and is served without being rendered in 21; pending_cases 25 and 26; sentence_completion_date 33 and 18. special_preconditions_confirmed and new_convictions_during_waiting_period render in none of the 51 and are served in all of them. The same fact, the same evaluator, a different answer per state, decided by whether a sentence happened to match a regex.

## 7. The correction contract

### Half 1 — The automatic waiting-rule selector rejects rules the profile already carries, and the manual override it honours is never rendered

Owner `PHASE_2_SHARED`, severity **P0**, 13 jurisdictions.

- bestWaitingRuleForPathway builds its candidate set from the profile's waitingPeriodRules and the pathway's own waitingRules prose, gives each a duration from normalizeDuration(rule.duration) or parseDurationFromText(rule.ruleText), then applies two filters.
- Filter one drops any candidate with no parseable duration. parseDurationFromText recognises a number plus a unit, a spelled-out number plus a unit, or the exact phrases 'immediate', 'no waiting period' and 'upon event'. It does not recognise 'No ordinary waiting period', which is how the District of Columbia's actual-innocence route states that it has none.
- Filter two, waitingTextRelevant, keeps a candidate only if its prose shares a token longer than five characters with the pathway's own id, label or summary, or matches one of the case-outcome regexes. Two sentences about the same legal route, written differently, do not survive it.
- When the set empties, evaluateCompiledTiming returns needs_review with reason waiting_rule_not_executed and the text 'We need one more detail before we can prepare the right packet.' The participant is told a detail is missing. No detail is missing; the selector could not choose.

Required correction:

1. Select a waiting rule by identity, not by prose similarity. A compiled pathway should name the waiting rules that bind it, and the evaluator should read that binding instead of inferring it from shared word tokens.
2. Make 'this route has no waiting period' expressible as data rather than as a sentence a regex must recognise.
3. Make the failure honest while the binding is missing: a route whose waiting rule cannot be selected should say the waiting period could not be determined, not that the participant owes another detail.
4. Either render waiting_rule_id, or stop honouring it. Today it is a published question the flow never shows, that silently changes the legal outcome when supplied. That is the worst of both.

### Half 2 — Question lifecycle is decided by regular expressions over prompt text, not by which questions the evaluator reads

Owner `PHASE_2_SHARED`, severity **P1**.

lifecyclePhaseForQuestion matches a question's text against a list of regular expressions to decide prepay or postpay, and phaseForWilmaFact defaults every shared fact to postpay unless its jurisdiction appears in a hand-written allowlist. 15 distinct question ids are classified postpay in at least one jurisdiction while the evaluator or a compiled rule in that same jurisdiction reads them, across 484 nodes.

Required correction:

1. Derive lifecycle from consumption. A fact any compiled rule references, or the evaluator reads before a packet decision, is prepay by definition.
2. Fail closed. A question the evaluator reads that is not classified prepay should fail the build rather than reach the browser as a postpay field.
3. Retire the per-jurisdiction allowlist once the derivation exists; it is a list of exceptions to a rule that should not have exceptions.

**Neither half was implemented.** The brief is explicit: do not patch the allowlist or the regex in this phase. Nothing here was patched.

### Payment clamp

Three jurisdictions reach a packet-ready terminal from the rendered screens and are still handed paymentAllowed false. This is the exact reason the no-payment count (22) exceeds the no-packet-ready count (19). The clamp in evaluateAgainstProfile requires, on top of a packet-ready result: route.deterministic, a packet plan, routeIsRatifiedDeployable, a court-filed petition or administrative application route, and isPacketPlanFulfillmentReady. Any one of those failing closes payment silently, and the participant is shown a packet-ready result with no way to buy the packet.

Required correction: Say which clamp closed. A packet-ready result that cannot be bought should tell the participant why, and the audit should be able to read the reason without re-deriving five predicates.

## 8. Evidence

294 desktop captures and 27 mobile captures were retaken at this HEAD and retained in full outside Git at `/root/LegalEase-Audit-Artifacts/expai-flow-audit/phase1b-raw`. Every file's SHA-256 is recorded in `data/expungement-ai/flow-audit/evidence-retention.json`. The committed subset remains 47 captures.

## 9. Issue register after Phase 1B

| Severity | Count |
| --- | --- |
| P0 | 3 |
| P1 | 13 |
| P2 | 7 |
| P3 | 2 |

- **UX-GLOBAL-001** (`GLOBAL_NAVIGATION`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-013** (`GLOBAL_SHARED_COMPONENT`) — The automatic waiting-rule selector cannot choose a rule the profile already contains, closing 13 jurisdictions that are otherwise reachable and payable
- **UX-GLOBAL-019** (`GLOBAL_FACT_MODEL`) — The evaluator consumes facts before it will open a packet that the flow never asks for, so a browser cannot reproduce the repository's own recorded witnesses

## 10. Regenerating this report

```bash
node scripts/expungement-ai/flow-audit/build-reachability-reconciliation.mjs
node scripts/expungement-ai/flow-audit/build-denominator-reconciliation.mjs
node scripts/expungement-ai/flow-audit/build-question-node-reconciliation.mjs
node scripts/expungement-ai/flow-audit/build-correction-contract.mjs
node scripts/expungement-ai/flow-audit/build-phase1b-report.mjs
node scripts/expungement-ai/flow-audit/verify-flow-audit.mjs
```
