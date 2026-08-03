# Packet implementation — Tranche 1, Mississippi

**Implemented:** 3 August 2026
**Jurisdiction:** Mississippi
**Tracks:** 5
**Authority:** Master Library Edition 1.2, `7edd0a0e8308b58e12f59494a326342cc83dd362bb58f787e43d6fb475ef43bd`
**Base commit:** `3e0f8d6`
**Human legal-review status:** `awaiting_counsel_review`
**Runtime:** `packet_ready` 0 · enabled jurisdictions 0 · launch gate red

## Why Mississippi

Mississippi supports the live RCAP and We Must Vote Mississippi partner pathway,
so it is first by commercial priority. It is also the cleanest first
implementation on the merits: all nine normalized Mississippi tracks are
`custom_pleading` with `localFormOverride`, so no route depends on an official
form binary, none carries a commercial-use restriction, and none needs a source
acquisition to produce a participant packet. Mississippi publishes no statewide
expungement form — the accepted normalization establishes that and the Edition
1.2 controlling addendum confirms it — so a statewide neutral pleading drafted to
the statute is the controlling output rather than a fallback.

The priority order stopped at the first eligible jurisdiction. DC, Georgia,
Maryland and California were not reached.

## The five tracks

| Track | Business label | Mechanism | Branch variants |
|---|---|---|---|
| `ms-fel` | felony-conviction relief | Miss. Code Ann. § 99-19-71(2), as amended by 2026 HB 1546 | — |
| `ms-misd-1st` | first-offender misdemeanor relief | § 99-19-71(1) | — |
| `ms-misd-addl` | additional justice/municipal misdemeanor relief | §§ 9-11-15(3), 21-23-7(6) | justice_court, municipal_court |
| `ms-nonconv` | non-conviction relief | § 99-19-71(4) | dismissed, nolle_prosequi, acquitted, no_charge_filed |
| `ms-nonadj` | nonadjudication relief | § 99-15-26(5) | — |

Branch variants generate different petitions from **one** track. No duplicate
track ID and no duplicate mechanism was created.

Excluded from the tranche: `ms-diversion` (composed/alternative, outside the
business set), `ms-dui`, `ms-drug-cd` and `ms-mip` (outside the business set).
None was excluded on an authority defect; the last three remain correctly blocked
on their own undrafted guidance specifications.

## Source mappings closed

The five tracks were authority-blocked for one reason only: their `attachment`
and `instructions` components are `process_guidance` components **inside a
custom-pleading track**, and the specification generator emitted guidance specs
only for guidance tracks and for the guidance units of composed routes. That
shape produced no specification, so every such component reported "no governing
specification" and blocked its whole track.

The gate is closed by **drafting** those specifications, not by emitting empty
ones. `tranche-1-component-guidance.json` carries the authored specifications and
the intake emits them; a track whose checklist and instructions nobody has
written stays blocked, which is why the other four Mississippi tracks did not
move. Authority-cleared tracks nationwide: **82 → 87**, and the five are exactly
the tranche.

Authority pins are in `tranche-1-authority-pins.json`: the Mississippi legal
review and the Edition 1.2 controlling addendum by SHA-256, the enrolled 2026 HB
1546 by SHA-256, the statutory authority and venue authority per route, and the
four Fourth Circuit Court District local models pinned **reference-only**.

**No official-form mapping was created.** A custom pleading needs no official
binary, and inventing one would assert a source identity that does not exist.

## Source gates still open

- The filing fee is unresolved by design. § 99-19-72 levies $150 on each petition
  to expunge an offence under § 99-19-71, collected by the circuit clerk, which
  neither plainly reaches a subsection (4) non-conviction petition nor maps onto
  a justice or municipal court filing. **No fee amount is printed on any packet.**
- Whether any district requires a notarized verification is unresolved. The
  petitions carry a simple truth statement.
- Whether a district expects prosecutor notice on the non-conviction route as
  local practice is unresolved. The packet says so; it asserts no requirement.

## Implementation artifacts

| Artifact | Path |
|---|---|
| Tranche selection record | `data/record-clearing/implementation-tranches/tranche-1.json` |
| Authority pins | `.../tranche-1-authority-pins.json` |
| Component guidance specifications | `.../tranche-1-component-guidance.json` |
| Synthetic fixtures | `.../tranche-1-fixtures.json` |
| Field-ownership map | `.../tranche-1-field-ownership.json` |
| Visual-review record | `.../tranche-1-visual-review.json` |
| Review manifest | `.../tranche-1-review-manifest.json` |
| Pleading templates | `src/lib/rcap/packets/engines/pleading-templates-mississippi.ts` |
| Guidance templates | `src/lib/rcap/packets/engines/guidance-templates-mississippi.ts` |
| Relief tracks and packet sets | `src/lib/rcap/packets/registry-mississippi.ts` |
| Branch derivation | `src/lib/rcap/packets/tranche-1-mississippi-facts.ts` |
| Generation harness | `scripts/rcap-generate-tranche-1-packets.mjs` |
| Review-bundle builder | `scripts/rcap-build-tranche-1-review-bundle.mjs` |
| Verification | `scripts/verify-rcap-tranche-1-packets.mjs` |

No parallel rendering architecture was created. The existing
`CustomPleadingRenderer` and `ProcessGuidanceRenderer` are reused through the
existing resolver, packet-set model, store and lifecycle.

## Generated sample packets

Nine positive fixtures — one per track, plus every branch variant — generated
through the real fulfilment path from synthetic records, and five boundary
fixtures that must stop.

| Sample | Track | Branch | Pages |
|---|---|---|---|
| `ms-fel-positive-1` | ms-fel | — | 12 |
| `ms-misd-1st-positive-1` | ms-misd-1st | — | 9 |
| `ms-misd-addl-positive-justice` | ms-misd-addl | justice_court | 9 |
| `ms-misd-addl-positive-municipal` | ms-misd-addl | municipal_court | 9 |
| `ms-nonconv-positive-dismissed` | ms-nonconv | dismissed | 10 |
| `ms-nonconv-positive-nolle` | ms-nonconv | nolle_prosequi | 10 |
| `ms-nonconv-positive-acquitted` | ms-nonconv | acquitted | 10 |
| `ms-nonconv-positive-no-charge` | ms-nonconv | no_charge_filed | 10 |
| `ms-nonadj-positive-1` | ms-nonadj | — | 9 |

Every identity is invented, every town is invented and every cause number carries
a `SYN-` prefix.

## Review results

**Technical: passed.** Correct track and branch, correct components in the pinned
order, participant values present and no value the participant did not supply, no
third-party field completed, no prohibited legal conclusion, valid reopenable
PDFs, deterministic output from identical input, and all five boundary fixtures
stop.

**Visual: passed, no unresolved defects.** All 88 pages rendered to images; every
distinct component type and both branch families inspected directly. Six defects
were found and repaired: a two-column caption collision, a stray participant
signature rule on proposed orders, a blank rule printed for an absent optional
statute, an inconsistent fixture banner, a duplicated certificate heading, and
non-deterministic PDF metadata that would have made every recorded packet hash
unverifiable. The first three were material.

**Counsel: `awaiting_counsel_review`.** The engineering review is not a legal
approval. Ten specific questions for reviewing counsel are in the bundle.

## Review bundle

`tmp/packet-output-review/tranche-1/` — untracked, 192 files.
`tmp/packet-output-review/legalease-tranche-1-mississippi-attorney-review.zip` —
untracked; its SHA-256, the sample packet hashes and the page counts are recorded
in the tracked review manifest.

## What this tranche did not do

No legal-design conclusion was changed. No normalized track object was edited. No
Master Library edition was created. No track was promoted, no jurisdiction
enabled. `packet_ready` remains 0 and the launch gate remains red.

## Next

Deliver the bundle to counsel and apply the corrections they return.

The three inherited PR #87 packet API routes are resolved. They were never route
defects: both promotion verifiers ran one restricted-change guard that diffed
against `origin/main`, and because PR #87 is unmerged, every branch cut from its
platform base inherited three `src/app/api/` paths as permanent violations. The
guard now acknowledges an inherited path once, pinned to the content hash it was
reviewed at, and still fails on any other restricted change or on any further
edit to an acknowledged file. `rcap:verify-state-promotion` and
`rcap:verify-state-promotion-routes` pass and are now inside `npm test`.
