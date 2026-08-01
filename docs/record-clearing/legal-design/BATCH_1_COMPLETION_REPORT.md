# Batch 1 legal-design completion report

**Status:** complete. 117 source IDs accounted, 110 imported, 7 deferred.
**Batch:** `batch-1-amended`, 12 jurisdictions.
**Normalization schema version:** 1 (track registry, packet-set manifests,
specifications, implementation queue, legal-research queue, composed-unit
approvals).
**Runtime effect:** none. Every imported track is `runtime_disabled`, every
deferred track is unregistered, 0 `packet_ready`, launch gate red.

Importing a memo enables nothing. Legal-design approval is not output approval:
it says the mechanism, venue and components are right and says nothing about the
document a renderer would produce.

---

## A. Source-ID reconciliation

| | |
|---|---|
| expected Batch 1 source IDs | **117** |
| imported source IDs | **110** |
| deferred source IDs | **7** |
| accounted source IDs | **117** |
| outstanding source IDs | **0** |
| unaccounted source IDs | **0** |

Arithmetic: 110 + 7 = 117. No missing, extra or duplicate IDs against
`expected-track-ids.json`.

### Jurisdiction totals

| Jurisdiction | Expected | Imported | Deferred | Accounted |
|---|---:|---:|---:|---:|
| AK | 11 | 8 | 3 | 11 |
| AL | 11 | 9 | 2 | 11 |
| AR | 12 | 12 | 0 | 12 |
| AZ | 9 | 9 | 0 | 9 |
| CA | 13 | 12 | 1 | 13 |
| CO | 11 | 10 | 1 | 11 |
| CT | 14 | 14 | 0 | 14 |
| DC | 8 | 8 | 0 | 8 |
| DE | 6 | 6 | 0 | 6 |
| FL | 9 | 9 | 0 | 9 |
| HI | 9 | 9 | 0 | 9 |
| ID | 4 | 4 | 0 | 4 |
| **Total** | **117** | **110** | **7** | **117** |

### Deferred tracks

All seven are `legal_research_required`. Each omits `outputStrategy` entirely,
carries `outputStrategyStatus: unresolved` and `packetIdentity: unresolved`, and
has `runtimeRegistration: none` with `runtimeReachable: false`. None is present
in the track registry, the packet-set manifests, the specifications or any
implementation batch. Deferred is not missing: counsel has not settled the point,
and inventing a strategy to make the record importable is the exact failure this
pipeline exists to prevent.

| Track ID | Unresolved element |
|---|---|
| `AK:ak-set-aside` | `governing_mechanism` |
| `AK:ak-cannabis-seal` | `output_strategy` |
| `AK:ak-correct-record` | `governing_mechanism` |
| `AL:al-olr` | `output_strategy` |
| `AL:al-uncharged-arrest` | `governing_mechanism` |
| `CA:ca-1203-4b` | `output_strategy`, `correct_form` |
| `CO:co_mistaken_identity_expungement` | `governing_mechanism` |

---

## B. Normalized-unit reconciliation

Reported separately from the source-ID count on purpose. Composed routes add
normalized units under an existing source ID; they never add source tracks.

| | |
|---|---|
| single-output tracks | **100** |
| composed source tracks | **10** |
| composed units | **20** |
| — sequential stage units | **14** |
| — alternative branch units | **6** |
| — mixed units | **0** |
| unresolved units | **3** |
| resolved units | **17** |
| resolved-but-unavailable units | **2** |
| normalized runtime candidates | **115** |

100 single-output tracks + 110 imported = the same 110 source IDs; the 10
composed tracks are among them. Runtime candidates are the 100 single-output
tracks plus the 15 composed units that are both resolved and available.

### Source-to-normalized crosswalk

| Source track | Mode | Units | Unresolved |
|---|---|---:|---:|
| `AR:ar-misdemeanor-dwi-seal` | sequential | 2 | 0 |
| `AR:ar-pardon-seal` | sequential | 2 | 0 |
| `AR:ar-act346` | sequential | 2 | 0 |
| `AR:ar-drug-court` | sequential | 2 | 0 |
| `AR:ar-veterans-court` | sequential | 2 | 0 |
| `CA:ca-diversion-seal` | sequential | 2 | 0 |
| `CT:ct-nolle-auto` | alternative | 2 | 1 |
| `CT:ct-under18-misdemeanor` | alternative | 2 | 1 |
| `CT:ct-pardon-erasure` | alternative | 2 | 0 |
| `CT:ct-missed-erasure` | sequential | 2 | 1 |

### Unresolved units

Each carries no `outputStrategy` at all and is unavailable. A resolved sibling
never lends its strategy to one of these.

| Unit ID | Why |
|---|---|
| `ct-nolle-auto-branch-motion-to-nolle` | § 54-142a(c)(2) filing vehicle and clerk practice not approved |
| `ct-under18-misdemeanor-branch-petition` | No form or accepted custom pleading for the § 54-142a(f)(2) petition |
| `ct-missed-erasure-stage-2-despp-submission` | DESPP's "form and manner" is not in the statute and was not located |

### Resolved-but-unavailable units

The vehicle is settled; a legal blocker keeps the unit from being offered.

| Unit ID | Strategy | Why unavailable |
|---|---|---|
| `ar-misdemeanor-dwi-seal-stage-2` | `official_pdf_fill` | Coleman/statutory waiting-period conflict open |
| `ca-diversion-seal-stage-2` | `official_pdf_fill` | No approved county petition/order set sourced |

---

## C. Invariants

| Invariant | Enforced by |
|---|---|
| No first-available fallback | `strategyForSelectedUnit` never scans for an applicable unit; `renderableStrategyFor` is gone |
| Explicit unit selection required | Rule 1 — no `selectedUnitId` fails closed, even where exactly one unit exists |
| Only the three approved strategies reach renderers | `OUTPUT_STRATEGIES` guard on every return path; `composed`, `unresolved` and an omitted strategy all fail it |
| No deferred track has an invented strategy | Validator forbids `outputStrategy` where `outputStrategyStatus` is `unresolved`; all 7 verified |
| No unresolved unit is available | Validator refuses `available: true` on an unresolved unit; all 3 verified unavailable |
| All imported tracks `runtime_disabled` | 110 of 110 in the implementation queue |
| Zero `packet_ready` | `packetReadyCount: 0`; no track reaches `legal_approved` |
| Launch gate red | Follows from 0 `packet_ready` |

Composed-route selection fails closed six ways: no selection, unknown unit,
unresolved unit, unavailable unit, ambiguous selection answered by more than one
unit, and any value that is not one of the three renderer strategies. A composed
route's track-level `outputStrategy` is `null` — not a gap to fill. `composed`
survives only as `outputStrategyDeclared` provenance and is never read as a
strategy.

### Composed-unit approvals

`data/record-clearing/legal-design-composed-unit-approvals.json` pins the legal
substance of all 10 composed tracks and 20 units. It is read on every batch-delta
run and written only under `--approve-composed-units`, so a memo edit cannot
re-approve itself.

Pinned per unit: stable `unitId`, concrete strategy, `outputStrategyStatus`,
`packetIdentity`, availability, unresolved status, `parentUnitId`. Pinned per
track: `compositionMode`, `outputStrategyDeclared`, counsel-authored provenance,
and the full unit set. Sequential stage order is substantive and pinned;
alternative-branch array order is not, because those branches are selected by a
predicate rather than by position.

Approval is refused where a track carries no counsel-authored provenance for a
resolved unit, so a normalizer inference cannot resolve a unit.

---

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | 0 errors (25 pre-existing warnings) |
| `npm test` | exit 0 |
| `rcap:verify-legal-design-intake` | 69 contract checks |
| `rcap:legal-design-intake` | 12 memos accepted, 0 rejected |
| `rcap:legal-design-batch-delta` | 110 of 110 decisions unchanged; 10 of 10 composed tracks match approved substance |
| `rcap:verify-packet-capability-registry` | 15 checks |
| `rcap:verify-state-promotion` | **fails** — pre-existing, nine restricted files, see `BATCH_1_RESTRICTED_FILE_REVIEW.md` |

The state-promotion failure predates this work and was neither weakened nor
bypassed. None of the nine restricted files appears in the diff from the
Arkansas checkpoint onward.

---

## Scope held

- Batch 2 normalization untouched.
- Phase 48 unapplied.
- No deployment.
- Attorney packages v1 and v2 not overwritten.
