# Maryland Pardon Pathway — implementation evidence (MD:md_pardon_expungement)

Lane record for closing the E4-R3 `still_blocked` adjudication on registry
track `MD:md_pardon_expungement` by authoring the compiled runtime pathway
it was missing. Base: `a29c22c` (clean tip of the canonical integration
branch at lane start; no wiring-window SHA was published in-repo, recorded
here explicitly).

## Authority verification (E1 citation checked, not assumed)

The E1-reported authority — Md. Crim. Proc. § 10-105(a)(8) — is confirmed
by committed evidence, and is incomplete alone: the registry carries both
authorities.

| Committed evidence | What it proves |
|---|---|
| `data/rcap-ledger/registry-crosswalk-projection.json` → `md_pardon_expungement` | Authority `§ 10-105(a)(8)` **and** `§ 10-105(c)(4)`; single disposition `pardoned_conviction`; mechanism: one criminal act, not a crime of violence under Crim. Law § 14-101(a), Governor's full and unconditional pardon, petition barred later than 10 years after the pardon was signed; `outputStrategy: official_pdf_fill`; forms `CC-DC-CR-072B` (+ `CC-DC-089` fee waiver); status `legal_design_approved_with_limitations`; stop condition: 10-year deadline close or passed |
| MD profile source corpus `overview:9-28` | "Full and unconditional governor pardon 10-105 route Only if one criminal act and not crime of violence; timing constraints apply" |
| `src/lib/rcap/state-packs/maryland/official-forms.ts` + profile `formInventory` | `CC-DC-CR-072B` committed with blank PDF (`ccdccr072B.pdf`, sha256 `3a61136e…`) |
| E4 record in `data/rcap-ledger/crosswalk-resolution-adjudication.json` | Missing piece is "a top-level pathway in `src/lib/rcap-engine/compiled/profiles/MD-maryland.json`"; next action "Author an MD pardon-expungement pathway under § 10-105(a)(8)/(c)(4), then repoint rule-11 candidatePathwayIds at it" |

## Treatment decision

A **packet pathway** (court-filed petition, official-PDF-fill posture), not
a typed stop or composed unit: the registry gives `official_pdf_fill`, a
concrete official form, and an approved-with-limitations legal design. The
limitation (10-year deadline) is encoded as a fail-closed review posture,
not a stop for the whole track.

## What was added

1. **Pathway** `pardoned-conviction-expungement-under-crim-proc-10-105-a-8`
   in `MD-maryland.json` (8th pathway): authority-pinned rule clauses,
   `caseOutcomes: ["pardon"]`, court-filing posture,
   `packet_ready_with_caution` suggestion, Lawrence hard gate recorded,
   **empty `waitingRules`** — § 10-105(c)(4) is a filing *deadline*; the
   engine parses `waitingRules` durations as *minimum waits*, so encoding
   the deadline there would invert the statute (bar the eligible early
   years, admit the barred late ones). Deadline lives in rule clauses,
   exclusions and the timing carve-out below.
2. **Routing repoints** (both previously routed pardon participants away
   from any pardon route): `rule-11-full-and-unconditional-governor-pardon-…`
   `candidatePathwayIds` → the new pathway (was four unrelated pathways);
   `caseOutcomeOptions` value `pardon` → the new pathway (was the dangling
   id `cannabis-specific-maryland-routing`, which matches no pathway).
3. **Packet generator binding** with `CC-DC-CR-072B` pinned to the
   committed inventory sha256.
4. **Evaluator: MD-scoped pardon selection branch** in `selectPathway` —
   "pardoned conviction" token-matches `/conviction/`, so without it the
   participant landed on the first "non-conviction"-labeled pathway (the
   exact mis-route the E4 documented, at a second site). Scoped to MD.
5. **Evaluator: route timing carve-out** in `specialRouteTiming` (the
   sanctioned per-route correction point, with existing precedent): the
   route has no minimum wait; no committed question captures the pardon
   date, so timing fails closed to `needs_review` citing § 10-105(c)(4)
   instead of inheriting a token-matched, fabricated wait. Payment remains
   closed (route not in the ratified allowlists, which were not touched).

Nothing was invented: no waiting period, fee, venue, consent, hearing, or
participant fact beyond the registry mechanism. The pardon-date question
needed to *verify* the deadline does not exist in committed evidence, which
is exactly why the route fails closed pending counsel review.

## Verification (all from this session)

- `scripts/verify-rcap-md-pardon-pathway.mjs` **passes**: schema shape,
  unique pathway id, exactly one pardon-outcome pathway, exact
  § 10-105(a)(8)/(c)(4) authority strings, routing pointers, form pinning,
  carve-out presence, and live evaluator fixtures
  (`data/expungement-ai/fixtures/maryland-pardon-evaluation-fixtures.json`).
- **Mutation red both ways**: authority drift ((a)(8)→(a)(9)) → verifier
  fails; pathway id rename → verifier exit 1; restored → exit 0.
- **Existing pathways unchanged**: the seven pre-existing MD pathways are
  byte-identical (diff is append-plus-repoint only), and the control
  fixture (plain misdemeanor conviction) evaluates byte-identically at
  base `a29c22c` and after this change.
- `verify-rcap-evaluator-all51-provability.mjs` still passes.
- `verify-md-state-pack.mjs` still passes.

## Known downstream effect (owner: canonical crosswalk lane)

`verify-rcap-track-pathway-crosswalk.mjs` now reports the expected lag:
crosswalk 324 vs live 325 pathways, new pathway "not in crosswalk". Per the
E4 record, the canonical generator re-run is the crosswalk owner's step and
resolves `md_pardon_expungement` to `exact_current_pathway`. (The verifier's
third failure — evidence pin `3b6f4c1…` not resolving to a commit in this
clone — pre-exists at base and is unrelated.) This lane did not touch
crosswalk input, generator, or output. The standalone verifier is also not
registered in `package.json` (boundary); the captain can add
`node scripts/verify-rcap-md-pardon-pathway.mjs` to the test chain.

## Relationship recommendation for E

```
subject:        registry_track:MD:md_pardon_expungement
relationshipType: exact_current_pathway
counterpart:    pardoned-conviction-expungement-under-crim-proc-10-105-a-8
license:        operative_citation_in_pathway — the track's controlling
                authority tokens (10-105, (a)(8)) appear in the pathway id,
                label and rule clauses; disposition-set identity is exact
                (track's single disposition pardoned_conviction ↔ the
                pathway's single caseOutcome "pardon", the only MD pathway
                carrying it)
confidence:     high
```

## Completion under counsel approval (2026-08-11)

Counsel approved the pathway; the fail-closed review posture is replaced by
a fully verified deadline contract:

- **Pardon-date fact**: optional `pardon_signed_date` question
  (`date_or_unknown`, convention-matching) added to the compiled MD profile
  and to the designer public profile (`compiled/all51.json` MD entry, the
  actual public question source; fixture copy re-exported with the
  repository's own `export-expungement-ai-public-fixtures.mjs`). Optional so
  non-pardon participants are never blocked; the pardon route demands it via
  `missing_anchor` → `md.md_pardon_date_needed`.
- **Deadline semantics, both directions**: the timing carve-out asks for the
  date; `mdPardonDeadlineSafetyGate` bars filing when today is more than 10
  years after the pardon was signed (`likely_not_eligible`,
  `md.md_pardon_deadline_not_eligible`, § 10-105(c)(4) cited). Within the
  deadline, timing is satisfied — no minimum wait exists in the statute and
  none is fabricated.
- **Payment ratification**: the route joined `RATIFIED_DEPLOYABLE_ROUTES`
  (counsel signoff recorded in the list comment) and the pathway's
  `lawrenceRatification` moved to `ratified_deployable` citing
  § 10-105(a)(8)/(c)(4). Verified end-to-end: the qualifying fixture reaches
  `packet_ready_with_caution` with `paymentAllowed: true` and the
  official-form packet plan; the barred and missing-date fixtures keep
  payment shut — the both-direction proof the evaluator's own ratification
  contract requires.
- **Mutation red re-proven**: removing the ratified-allowlist entry turns
  the verifier red (exit 1); restored, it passes. Deterministic evaluation
  clock via `RCAP_EVALUATOR_TODAY=2026-08-11` in fixtures and verifier.
- **Neighbors**: `verify-public-profile-projection` and
  `verify-rcap-evaluator-all51-provability` pass;
  `verify-public-profile-route`'s NextResponse crash reproduces identically
  at base (pre-existing, unrelated).
