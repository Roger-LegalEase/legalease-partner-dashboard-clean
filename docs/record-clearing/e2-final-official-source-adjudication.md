# E2 — Final Official-Source Adjudication (PA path-k, SC survivor expungement)

Base: E1's exact commit `b1279ed3` (no captain descendant contains it; the
canonical branch advanced with unrelated payment-audit work only). Terminal C
input: `claude/rcap-final-official-source-materialization` @ `c635185d`,
imported as its three uniquely owned files; branch not merged wholesale.

## What Terminal C actually delivered

A reduction record, not sources. Every retrieval attempt it logs —
`legis.state.pa.us`, `palegis.us`, `scstatehouse.gov` — returned
`EGRESS_BLOCKED`, matching this terminal's own probes across two sessions.
Both subjects therefore carry `sourcePath: null`, `sha256: null`,
`verbatimOperativeSpan: null`, `supportsProposedRelationship: null`, and one
exact externally owned retrieval blocker each, with the original retrieval
packets hash-preserved. C's verifier passes at import and its discipline was
mutation-tested here: a materialization claim without bytes, a blocked
subject stripped of exact missing evidence, and a non-official host smuggled
into the source URL each turn it red.

## Adjudication

**Pennsylvania — `compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement`.**
No official text exists in any committed source, so the issuing body,
currentness, and operative section cannot be verified, and the expected
§ 3019 theory can be neither confirmed nor rejected — C's own repository
verification shows the PA profile carries 'trafficking' 86× and 'vacatur'
69× but '3019' zero times. Disposition: `still_blocked` stands unchanged.
Owner: external retrieval (outbound access). Next action: fetch 18 Pa.C.S.
ch. 30's vacatur/expungement provision from the Pennsylvania General
Assembly and commit the bytes as served.

**South Carolina — `compiled_pathway:SC:human-trafficking-survivor-expungement`.**
No official text of § 16-3-2020 exists in any committed source, so whether
that section grants an expungement/vacatur mechanism or is substantive
survivor-relief law without a record remedy cannot be distinguished.
Disposition: `still_blocked` stands unchanged. Owner: external retrieval.
Next action: fetch S.C. Code § 16-3-2020 from the South Carolina Legislature
and commit the bytes as served; a proven definitional/penal-only finding
closes the subject as terminal just as a proven remedy text closes it as a
mapping or gap.

No adjudication input changed: the brief conditions any update on the source
evidence supporting a classification, and none exists. The 497 denominator is
untouched; no registry track was created.

## Canonical regeneration

Regenerate-once produced zero diffs: adjudication input current (38
relationships), crosswalk current at `73094ea1`, denominator reconciliation
and E3 job graph current. Generated unresolved set (derived): the two
official-source pathways above plus the deliberately-held
`MD:md_pardon_expungement` build-lane track. Milestone 1 item 2 remains
blocked; false closure and all 26 other E4 mutation classes verified red on
this base.

## Battery

C's source verifier + 3 mutations; E4 lane verifiers ×4; adjudication
`--check`; canonical generator `--check` + verifier; 27/27 E4 mutations;
denominator no-diff; scope guards ×3; `npm test` under a real `npm ci` —
one red segment only: the captain-owned disposition register lacks an entry
for the imported `verify-rcap-final-official-sources.mjs` (register outside
this lane's write set; same wiring class as prior waves' imports).
