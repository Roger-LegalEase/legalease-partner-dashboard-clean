# Lane C dependency correction — frozen assignment for Codex

**Review base:** `a20987d1e55fc759960b05d4991b8263a63656c1`
**Canonical tip used:** `766421f4` (contains `11419867` in ancestry)
**Machine-readable assignment:** `data/rcap-all50/review-artifacts/c-dependency-correction-assignment.json`
**Six-route resolution:** `data/rcap-all50/review-artifacts/c-dependency-free-resolution.json`

The lane C author was right not to self-approve these routes. This document
freezes what has to change, derived from repository bytes rather than from the
escalation summary.

## 1. Scope reconciliation

The reported split is confirmed against `route.json` `units[]`:

| Fact | Reported | Repository-derived |
|---|---|---|
| Escalated composed routes | 16 | **16** |
| Routes containing an `official_form_dependency` | 10 | **10** |
| Dependency components | 31 | **31** |
| Routes with no official-form dependency | 6 | **6** |

One correction to the earlier captain phrasing: the 31 components belong to
**10 of the 16** routes, not to all 16. The count itself was right; the
attribution was loose, and this record replaces it.

Dependency-bearing routes and their component counts: `ar-act346` (3),
`ar-drug-court` (3), `ar-pardon-seal` (3), `ar-veterans-court` (3),
`ca-diversion-seal` (2), `ct-missed-erasure` (2), `il-prb-cert` (6),
`mt_mmrta_serving` (5), `tx_nd_veterans_reemployment` (3),
`vt_exp_deferred_sentence` (1).

Every one of the 31 is `drafted: false` with `dependency.json` as its only
file. None is supplied.

## 2. The six dependency-free routes — none is eligible yet

"No official-form dependency" turned out not to mean "implemented". Opening
each route's units individually:

| Route | Legal units | Finding | Eligible |
|---|---|---|---|
| `ct-nolle-auto` | 3 | 2 `pleading_document` units undrafted, blocker only | No |
| `ct-under18-misdemeanor` | 2 | 1 `pleading_document` unit undrafted, blocker only | No |
| `in_infraction_nondisclosure` | 2 | 1 `pleading_document` unit undrafted, blocker only | No |
| `ia-9079` | 2 | 1 `pleading_document` unit undrafted, blocker only | No |
| `ky_criminal_record_segregation` | 3 | fully implemented; 1 component still declares a stale `renderer-null-presentation` defect | No |
| `wv_dui_deferral_expungement` | 7 | fully implemented; 5 components still declare the stale defect | No |

Two distinct blockers, and neither is an official-form dependency:

* **Four routes carry undrafted `pleading_document` units.** These are
  legal-design blockers — Connecticut's § 54-142a(c)(2) motion has "no settled
  filing vehicle"; Iowa's pre-2013 branch needs counsel to identify what
  document is even filed. The component is recorded, not built. This is the
  same disappearance risk the blocked-component rule addresses, arriving under
  a different `requiredOutput`, which is why "lacks an
  `official_form_dependency`" was never a safe promotion test.
* **Two routes are genuinely complete but still declare a defect that no
  longer exists.** `runtimeDefects: ["renderer-null-presentation"]` was lane
  C's bug report against the renderer. Terminal A landed the fix, the artifacts
  were re-rendered, and `verify-rcap-no-null-presentation` is green across 41
  live renders. The declaration is stale and must be cleared and re-verified —
  a mechanical correction, but an open one, so the routes are not clean today.

`ky_criminal_record_segregation` and `wv_dui_deferral_expungement` are one
small edit away from eligibility.

## 3. What each of the 31 components is missing

Each component was opened individually; nothing here is a regex tally applied
across a group. The failure vocabulary is defined in the JSON.

| Failure | Components |
|---|---|
| `briefcase_handoff` | 31 |
| `credit_suppression` | 31 |
| `payment_suppression` | 15 |
| `gathering_instructions` | 14 |
| `packet_absence_disclosure` | 13 |
| `destination` | 8 |
| `what_not_to_file_or_assume` | 5 |

Two failures are universal and structural rather than per-state: no component
tells the participant what the Briefcase saves and how to return to it, and no
component states that no packet credit is consumed. Those are the same edit
repeated 31 times, and they should be written once as a shared participant
pattern and applied.

The rest vary by route and must be read per component in the JSON. The worst
cases are `il-prb-cert` (6 components, none naming an official destination or
form id) and `ca-diversion-seal` (2 components missing destination, absence
disclosure and gathering).

## 4. Shared-runtime ownership

These behaviours are controlled by captain-owned runtime and are reserved to
Terminal A:

| Behaviour | Authority | Owner |
|---|---|---|
| `paymentAllowed` | `src/lib/rcap-engine/evaluator.ts`; `src/lib/expungement-ai/eligibility-adapter.ts` | Terminal A |
| Checkout visibility | `src/app/api/expungement-ai/checkout/route.ts`; `src/lib/expungement-ai/payment-adapter.ts` | Terminal A |
| Packet-credit consumption | `src/lib/rcap/documents/packet-route-resolver.ts`; `supabase/phase-49`, `phase-50` | Terminal A |
| Briefcase guidance and handoff | `src/lib/expungement-ai/briefcase.ts`; `src/lib/rcap/documents/guidance-packet-registry.ts` | Terminal A |
| Composed-route runtime classification | `src/lib/rcap/documents/packet-route-resolver.ts`; `src/lib/rcap-engine/evaluator.ts` | Terminal A |

Codex writes component-level participant treatments, bilingual copy, fixtures,
route-specific data, and **exact runtime patch specifications**. Codex does not
create a second payment, credit, Briefcase, or route-state system: where a
correction needs runtime behaviour to change, it is specified and Terminal A
applies it.

## 5. Acceptance

The correction is accepted when the three lane-C verifiers, the
null-presentation regression and the ledger `--check` are green, and the full
chain passes captain-side. Nothing promotes on this document — promotion still
requires an accepted F2 closure and a ledger regeneration.
