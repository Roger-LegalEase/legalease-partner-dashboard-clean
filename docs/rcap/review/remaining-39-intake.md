# Remaining-39 intake — what is actually still live

**Codex input:** `codex/rcap-remaining-tracks-wave` @ `c570205f8b94ddadb744643a7b4a4940c913ffe3`
**Reported base:** `c1f0741a` (verified: an ancestor of the branch)
**Canonical tip at intake:** `22f037f0`
**Machine-readable:** `data/rcap-all50/review-artifacts/remaining-39-intake.json`,
`remaining-39-rows.json`, `remaining-39-review-manifest.json`

Codex completed 39 bounded deliverables. A completed deliverable is not a
resolved track, so every row was recomputed against current canonical bytes
before any of it turned into work for anyone.

## 1. The arithmetic reconciles exactly

| | Count |
|---|---|
| Nonterminal in the current ledger | 122 |
| Escalated C composed routes, excluded | 16 |
| D tracks in the corrected D review manifest, excluded | 67 |
| Remainder | **39** |
| Codex rows matched by exact track id | **39** |
| Codex rows no longer in the nonterminal set | 0 |
| Remainder tracks Codex did not cover | 0 |

One thing worth naming, because it looks like a discrepancy and is not:
eighteen of the 39 carry `requiredTreatment: production_packet` but are absent
from the D corrected-review manifest. They are the lane-E hard-form and
source-blocked tracks — the CA CR-180 family, ID, NV, SC, VA, WA, WI, DC.
Excluding D by its manifest rather than by treatment family is what makes
16 + 67 + 39 come to 122.

The ledger has not moved since the Codex base, so no row could have been
resolved by ledger movement in the interval. Nothing was closed on that basis.

## 2. Thirteen lane-B corrections — all still live, none stale

Each Codex candidate packet was compared field-by-field against the current
canonical guidance packet. All thirteen still differ substantively: added
`timing` where canonical carries `null`, tightened `stopReason`, corrected
`nextSteps`, `gather`, `handoff`, `authority`. None is a formatting difference
and none was already applied, so none closes as stale.

The AK row is the clearest example of why the comparison mattered rather than
being a formality: the wave-2 correction Codex was asked about *is* in the
committed bytes and Codex said so. The defect it reports is a different one —
the "all charges dismissed" ground is stated without the Criminal Rule 11
carve-out that both committed sources attach to it. A participant whose
dismissal was part of a Rule 11 plea in another case is currently told the case
comes off CourtView automatically when the committed rule says it does not.

## 3. Five CA CR-180 corrections — both defects still live

Nothing already closed by the rendered-assertion verifier was reopened. Neither
finding is in that verifier at all:

* `scripts/rcap-hard-form-xfa-shadow-fill.mjs:137-138` still collects
  `report.overflowed` without failing on it, and still rewrites an over-length
  value to `… — see Attachment A`. The family's own profile
  (`cr-180-petition-for-dismissal/profile.json:263`) says an over-length value
  must fail the render *because* the referenced Attachment A does not exist.
  The engine and its declared contract contradict each other, and the engine
  wins today.
* The 15-day prosecutor-notice period appears only inside
  `CA-california.json` `sourceStatements` — internal source text, not
  participant copy — and no verifier requires the petition family to ship or
  declare a service component. CR-106 stays `held_on_source_or_design`.

## 4. Eight stale-ledger rows — verified, and the reason is exact

These eight are not "probably done". Each has a committed lane-B packet whose
`treatment` is `exact_supported_deferral` with `paymentAllowed: false` and
`sellable: false`, and an unsuperseded F2 `technical_approved` closure.

The ledger is stale for a specific, findable reason:
`scripts/generate-rcap-track-terminalization.mjs` recognises
`exact_supported_deferral` candidates only from
`data/rcap-all50/hard-forms/*/*/profile.json`, and recognises lane-B packets
only when `treatment === "complete_guidance"`. A lane-B packet whose treatment
is `exact_supported_deferral` is therefore invisible to both loaders:
`candidateTreatment` stays null, `approvedByReview` stays false, and an
existing F2 approval has nothing to promote.

The fix is one loader extension, and it provably cannot over-promote: there are
nine such packets, eight carry an F2 approval and would promote, and the ninth —
`TX:tx_exp_acquittal` — does not and would become a candidate pending review.

**It was not executed here.** This is an intake window, and the standing rule is
that the canonical ledger is regenerated exactly once, in a meaningful
integration window, when independently approved treatments are being promoted.
These eight are ready for exactly that, and the effect would be 375 → 383.

## 5. Runtime — zero captain changes apply today

Codex produced 31 runtime specifications. Deduplicated against the current
canonical runtime: 30 target tracks that have no compiled pathway, and one
(`OK:ok_clean_slate`) is already represented and drops out. Twenty-nine of the
thirty are gated behind a non-runtime blocker that must close first.

Every remaining specification asks for a **compiled pathway** — profile
authoring — not a change to a shared payment, credit, Briefcase or route-state
system. So there is no captain-owned shared-runtime change to apply, and no
second system is created because none is needed.

## 6. Source, currentness and counsel — holds preserved unchanged

Nine source/currentness rows and one counsel row (`DC:dc_yra_set_aside`) keep
their recorded holds exactly. Codex saved 23 hash-pinned official source files
and separated source text from inference, which is genuinely useful research —
and research is not adoption. Secondary authority is not substituted for an
operative legal claim, and each track's already-recorded supported fallback
disposition stands until the real source lands.

## 7. Review routing

Sixteen independent-review jobs covering all 15 substantive candidate
treatments plus the CR-180 correction specification, in
`remaining-39-review-manifest.json`. No implementation author approves their own
work; a reviewer who authored a candidate is disqualified from its job.

## 8. What did not happen

No track was promoted. The completion ledger was not regenerated and still
reads 375/497. No canonical B, C, D or E implementation path, no `src` runtime,
no migration, no staging, worker or deployment file was touched — the import was
60 files, all inside the two Codex-owned trees, and zero outside them.
