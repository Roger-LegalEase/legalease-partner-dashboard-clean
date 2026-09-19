# 61 — CA 1203.4a: what the authoritative treatment actually is

Regenerating the sellable-pathway closure added a blocking blocker:

> `guidance_substitution` (blocking): `ca-1203-4a` is served to the participant
> as an `exact_supported_deferral` whose own stated reason is our unfinished
> work; it is a temporary blocker on a paid pathway, not a completed product
> treatment.

The blocker is correct and stays. This establishes what the route's terminal
treatment is today, so the blocker stops reading as an open engineering task
when it is not one.

## Classification

**`LEGAL_DECISION_REQUIRED`.**

The source exists. The packet exists, is complete, renders, rasters and has been
independently verified. What is missing is an owner legal decision that has
already been assembled, formally requested, and not returned.

It is not `IMPLEMENTATION_MISSING`: there is no engineering artifact outstanding.
It is not `SOURCE_MISSING`: CR-180 is in the corpus and source fidelity is
established. It is not `STALE_BLOCKER`: payment is genuinely closed and no
approval has been granted. It is not `INTENTIONALLY_DEFERRED`: the deferral is
not a settled terminal decision, it is a pending review.

## The route chain

| # | Question | Answer |
|---|---|---|
| 1 | Legal remedy | Penal Code § 1203.4a — dismissal and set-aside of a misdemeanour or infraction where probation was **not** granted |
| 2 | Route / family | `CA:dismissal-and-set-aside-without-probation-under-penal-code-1203-4a`, track `ca-1203-4a`, family `ca-1203-4a-set` |
| 3 | Legal-treatment status | `exact_supported_deferral`; no counsel ratification; no row in `route-product-metadata.json` |
| 4 | Authoritative form exists | Yes — Judicial Council **CR-180** (box 3), order **CR-181**, service **CR-106**, attached declaration **MC-031** |
| 5 | Source in corpus | Yes — CR-180 appears in `local-source-corpus-index.json`; `sourceFidelityEstablished: true` |
| 6 | Intended packet kind | **Official form fill** — `ca-1203-4a-set--official-pdf-fill`, `implementationStrategy: official_pdf_fill` |
| 7 | Renderer / implementation | **Complete.** `rendererKind: packet_document_v1`, `rendered: true`, 2 972 bytes of valid PDF; `packetSpecComplete: true`; acceptance receipt `RASTER_PASS` (run 33815768438) bound to canonical `c7dc7526…`, covering the whole family; `lastIndependentVerification: PASS_COMPLETE_INDEPENDENT` (lane vf04) |
| 8 | Grade-A fulfillment | **None.** No CA record exists in `fulfillment-authority-registry.json` (14 records: DC, IL, MS×3, ND×5, OR×3, WY) |
| 9 | Commercial posture | `paymentEligible: false`, `sponsorshipEligible: false`, `sellable: false`, `creditConsumable: false`, `commercialRoutesOpened: 0` |
| 10 | What causes the deferral | See below |
| 11 | Ever approved for packet delivery | **No.** `approval-request.json` is `status: REQUESTED`, `grantedBy: null`, `generationAllowed: false`, `runtimeSelectable: false` |
| 12 | Any artifact claiming packet-ready | **No.** The wiring states plainly: *"Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else. This binding is not that record, and nothing in this repository has produced one."* |

## The exact smallest outstanding item

The repository names it itself, in
`data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/approval-request.json`:

```
sourceFidelityEstablished          true
packetCompletenessEstablished      true
outputLegalApprovalEstablished     false   <-- outstanding
independentVisualReviewEstablished false   <-- outstanding
status                             REQUESTED
grantedBy                          null
```

with three named reviewer questions: the exact CR-180 statutory-control
alternatives per evidence variant; that every configured
petition/order/proof/service/attachment component is present and unchanged
companions remain exact official bytes; and that no service, signature/date,
declaration, court-owned, prosecutor, clerk, agency or unverified
factual-alternative field was completed.

The ask is already assembled for the owner.
`data/rcap-grade-a/legal-decisions/OWNER_ADOPTION_REQUEST_PENDING.json` lists
`ca-1203-4a-set` among **142 proven families** at `factoryState:
COMPLETE_PACKET_PROVEN`, with 58 blocked at current legal approval and 48 that
adoption would unblock. It is not in `notReadyToAskAbout`, which is empty. The
record is explicit that it `createsApproval: false` and `isAnApproval: false`.

**Granting it would still not make this route sellable.** The request states
that adoption *would not* open any route, grant runtime, technical, visual,
payment, sponsorship or production authority, or substitute for a
fulfillment-authority record. It satisfies one link so the chain can advance.

## Why the treatment says what it says

The track treatment in `data/rcap-all50/terminalization-treatments/ca.json`:

> The participant files the petition and the section 1203.4a mechanism is in
> scope, but the probation branch is a hard eligibility fork and the committed
> evidence has not cleared the checks LegalEase requires before filling in a
> court petition, so the product is the exact route, the branch that decides it
> and the reimbursement rule.

Both halves are true and they are different facts. § 1203.4a applies only where
probation was **not** granted — filing under § 1203.4 instead is a documented
reason petitions are rejected — so the branch is a genuine legal fork. And the
committed evidence has not cleared the output-level checks, which is exactly the
`REQUESTED`-and-not-granted state above.

So the participant is currently served the route, the branch that decides it and
the reimbursement rule, rather than a filled CR-180. That is the correct
fail-closed treatment while the review is outstanding.

## One imprecision worth fixing later, not here

`statedCausation` in `scripts/generate-rcap-sellable-pathway-closure.mjs`
derives the cause by substring-matching the treatment prose against a list that
includes `"checks legalease requires"`, and labels any hit
`unfinished_implementation`. For this route that reads as engineering work
outstanding, when the authoritative record says the outstanding item is a
requested output-level legal and independent visual review — a different owner
and a different action.

The blast radius is exactly **one track**: `ca-1203-4a` is the only track in the
whole closure classified `unfinished_implementation`, on the single phrase
`"checks legalease requires"`.

Deriving the cause from `approval-request.json` — a declared record — instead of
from prose would be the root fix, in the same shape as every other literal this
sweep has replaced. It is not done here: Step 61 is diagnosis and recording, and
changing how causation is derived is a vocabulary decision, not a repair.

## What must not be done

- Do not regenerate the blocker away. It is a true statement about a paid
  pathway with no completed product treatment.
- Do not grant the output legal approval or the independent visual review to
  clear it. Those are the two gates AGENTS.md names as blocking
  `approved_for_live` and `live`.
- Do not build anything to make Step 61 green. Nothing is missing to build.
- Do not read `factoryState: COMPLETE_PACKET_PROVEN` as commercial authority.
  The family says so itself.

## Gate

Diagnosis and recording only. No packet, source, fulfillment or worker input
was touched: `comparedInputs: 30`, `changedPaths: []`, `rebuildRequired: false`.
