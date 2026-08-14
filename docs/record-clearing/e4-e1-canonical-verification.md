# E1 — Canonical Consumption Verification of the E4 Resolution Wave

Verified at base `a29c22c5` (`claude/rcap-final-sprint-integration`; E4
correction checkpoint `8af8d4b2` in ancestry; re-verified here after the base
advanced from `f79fb0d9` by commits that touch no crosswalk-relevant file). This record is the E1 wave's
deliverable: every conclusion below was re-derived against live bytes, not
read off the prior reports.

## Consumption is proven, not asserted

The captain adjudication (`data/rcap-ledger/crosswalk-resolution-adjudication.json`,
38 canonical relationships derived from the four E4-R lane files) is a
load-bearing input to `generate-rcap-track-pathway-crosswalk.mjs`. All 27
mutation classes in `verify-rcap-e4-adjudication-mutations.mjs` turn the
canonical check red, and they cover every class this wave requires: input
deletion, false closure (two forms), direction-aware counterpart inversion
(both directions), non-canonical relation, licence stripping and stubbing,
terminal-to-launch promotion, `crosswalkTerminalOnly` removal,
`tracksTerminal`/`finalDisposition` escalation, blocked rows losing owner,
next action, or precision of missing evidence, pin/blob/pointer drift,
dead in-tree citations, stronger-relationship override, pairing conflicts,
and terminal-vocabulary renaming.

`terminalized` exists only as transport in the lane files; the canonical value
everywhere downstream is `crosswalk_terminal_classified`, carried with
`crosswalkTerminalOnly: true` and `launchLedgerEffect: "none"`, and a
crosswalk terminal classification cannot reach `tracksTerminal` (mutation-
tested).

## Substantive confirmations (independent)

- **NH DWI/DUI** — `compiled_variant_of_registry_track` of
  `nh_conviction_standard`: RSA 265-A:21 lengthens the RSA 651:5 waiting
  period for one offence class and files the same petition; the state pack's
  own conviction-waiting-period table carries the DWI 10-year rule as an
  entry. Confirmed as a waiting-period variant, not a separate mechanism.
- **TX pair** — dismissal/quash is direct on `tx_exp_dismissed` (label
  reproduces the registry legalName, both disjuncts, same order); the Class C
  deferred pathway is a variant of the same track because art. 55A.051(3) is
  the express exception inside that track's own authority, not an independent
  article. The Class C eligibility question is carried as a counsel-review
  requirement with `relationshipExactness: EXACT` and no launch effect —
  relationship identity and review status kept separate, as required.
- **MD collisions** — `md_10105_early` and `md_10105_favorable` both
  `exact_current_pathway` on the § 10-105 pathway (direction-aware, two
  tracks to one pathway); `second-chance-act-shielding` mapped on the unique
  CC-DC-CR-148 form binding; `juvenile-expungement` crosswalk-terminal;
  `md_pardon_expungement` deliberately held `still_blocked` — see below.
- **WV** — all three § 61-11-26 conviction-class tracks
  `exact_current_pathway` on the single WV pathway via subsection
  containment, with the shared class-fidelity counsel-review requirement and
  no launch effect.
- **KY** — both § 431.073 predicates (vacatur; full pardon) named in the
  committed pathway text; both tracks exact on `felony-conviction-431073`;
  the certification track crosswalk-terminal.
- **Off-branch pins** — the corrected rule holds: `path@commit` citations
  resolve by commit + blob + pointer, not ancestry; nine off-branch pins
  verified by the lane verifier (E4-R1..R4 all pass) and drift is caught by
  three distinct mutations.
- **R4 conclusions** — consumed through the same derivation; every resolved
  row carries a re-checkable licence; the lane verifier passes for E4-R4.

## The generated unresolved set (derived, not narrated)

The generator emits — not hardcodes — the current unresolved set:

- `PA:path-k-human-trafficking-vacatur-expungement` (pathway, official-source blocked)
- `SC:human-trafficking-survivor-expungement` (pathway, official-source blocked)
- `MD:md_pardon_expungement` (track, profile-implementation blocked)

The MD row is held open by the captain's `still_blocked` adjudication even
though candidate exhaustion would otherwise close it to
`missing_from_compiled_runtime`; the generator does this deliberately so the
§ 10-105(a)(8) build obligation stays in the unresolved count instead of
disappearing into a closed disposition. All three carry precise
`missingEvidence`, `owner` and `nextAction`, mutation-tested against
vagueness. The expected "two unresolved official-source subjects" from the
latest reports is confirmed as exactly the two pathway rows; the third
unresolved ID is not source-blocked.

## Official sources: checked, still absent

Two source lanes were checked. `claude/rcap-official-sources-pa-sc`
(`66e0fa4b`, not in this base) materializes source-store manifests for PA (28 sources) and SC — but neither
manifest contains 18 Pa.C.S. § 3019 or S.C. Code § 16-3-2020 (zero hits for
either token). `claude/rcap-final-official-source-materialization`
(`c635185d`, adjudicated by the E2 wave at `580a37ed`) is a reduction record:
every logged retrieval attempt returned EGRESS_BLOCKED and both subjects
carry null bytes and hashes. The two blocking sections therefore remain
unretrieved everywhere, and both subjects stay `still_blocked`. No guess was
made.

## Regenerate-once result

All five artifacts verify current on this base with zero diffs from
regeneration: canonical crosswalk (`73094ea1`), crosswalk report, denominator
reconciliation, the crosswalk-owned Milestone 1 item 2 source (the
crosswalk's `unresolvedIds` + milestone block), and the mapping-resolution
job graph (248 jobs, 255 obligations, `--check` clean).

## Full battery

Lane verifier ×4 green; adjudication-input `--check` green; canonical
generator `--check` and verifier green; 27/27 mutations red; denominator
reconciliation no-diff; `npm test` **exits 0 under a real `npm ci`**; all
three nationwide scope guards pass.

Milestone 1 item 2 remains blocked on the three enumerated IDs.
