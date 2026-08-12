# Lane C — controlled pleadings and composed routes — first handoff

Base: `df3d8607e8a0c723e23c346f1cd725c17a2c22b0` (canonical
`claude/rcap-final-sprint-integration`). Three partitions, three branches, no
shared path between them.

| Partition | Branch | Jobs | Tracks | Jurisdictions |
|---|---|---|---|---|
| C1 (this session) | `claude/rcap-terminalize-c-pleadings` | 16 | 27 | AR CA CT IA IL IN KY MT TX VT WV |
| C2 | `claude/rcap-terminalize-c2-pleadings` | 8 | 24 | GA TN DC HI AZ MA ME NC |
| C3 | `claude/rcap-terminalize-c3-pleadings` | 11 | 22 | NV ND SC ID KS WA NE OH OK VA WI |

Live ledger count for lane C: **35 jobs / 73 tracks**, partitioned with no job
or path in two sets. (The dispatch's "approximately 72" is the track count; the
ledger controls and reads 73 across 35 jobs.)

## Partition rule

Split by composition family and owned path, not job count: C1 takes every
`composed_route` job (11) plus the pleading jobs of the jurisdictions that also
carry a composed route (CT IL IN KY TX), so no jurisdiction directory is
touched by two partitions. C2 and C3 take pure controlled-pleading
jurisdictions, balanced by component count rather than job count — C3 carries
more jobs but smaller ones, and inherits ND and OK where runtime pleading
configs already exist and are reused rather than forked.

## Artifact convention (all three partitions)

Data and docs only. Runtime wiring stays Terminal A's after the worker freeze,
per the ledger's `runtimeWiringNote`; no lane C branch touches `src/**`.

Per controlled-pleading track — `data/rcap-all50/pleadings/<slug>/<track_id>/`:
`pleading-config.json` (PleadingTrackConfig-shaped, plus a 13-key
`componentInventory` where every component is present or absent-with-reason,
plus provenance pinning the state-pack files, the compiled profile and its
sha256, and the registry commit), `fixtures/{canonical,boundary,negative}.json`
(+ `multiline` where names run long), `rendered/{canonical.pdf,canonical.txt,
render-report.json}`, `participant-instructions.md`, `handoff.md`.

Per composed-route track — `data/rcap-all50/composed-routes/<slug>/<track_id>/`:
`route.json` enumerating every legal unit with its authority, required output,
component id, applicability, participant treatment and implementation;
`components/<componentId>/` for each; `filingSeparation` partitioning the
component set into court documents and participant-only material;
`omissionProof` tying the unit list back to the profile and registry passages.

## Verifier

`scripts/verify-rcap-terminalize-c1.mjs` (C1; C2 and C3 carry their own).
Failure classes: a missing artifact for an assigned trackId, config-shape
drift, provenance hash drift against the compiled profile, canonical fixtures
that do not pass pleading QA when re-rendered through the real
`custom-pleading-renderer`, negative fixtures that do not fail, relief-term
vocabulary leaks derived from each track's own authority, placeholder leaks,
protected-field leaks (SSN/DOB shapes, docket, judge, OTN, prosecutor) in
canonical renders, composed routes whose units and components do not resolve
1:1 in both directions, filing separation that is not an exact partition,
internal implementation language in participant documents, manifest drift
against the ledger, and any working-tree change outside C1-owned paths.

Run with `--render` to regenerate `rendered/` from the fixtures; the plain run
re-renders in memory and fails on any drift from the committed text.

## Three implementation states, deliberately distinguished

1. **Drafted controlled pleading** — the track's filing vehicle is settled and
   the sources supply its content.
2. **Official-form dependency** — a mandatory official form controls (ACIC
   petition-and-order pairs in AR, county § 851.90 sets in CA). No replica is
   drafted; `dependency.json` names the form, its issuing body, where it is
   published and the exact missing source, and assigns lane D/E.
3. **Blocked pleading** — the remedy exists but its filing vehicle is not
   settled (CT § 54-142a(c)(2) motion branch: no located form, caption, venue
   and clerk practice unapproved). Recorded with `draftingProhibitedBecause`
   rather than invented into existence.

States 2 and 3 are lane C's honest terminal outputs, not omissions.

## Non-invention

Where a source states no statute, no fee, no venue or no verification
requirement, the field is null with a note recording that the source is silent
— the California fee-waiver unit carries `citation: null` with the registry
passage explaining that FW-001 is named but no statute or filing fee is
stated. The verifier accepts a null citation only when such a note exists,
so silence is recorded rather than filled.

## Status at first handoff

- **C1**: AR (4 tracks) and CA (1 track) committed and pushed at `149fe3f3`,
  verifier-clean including re-render, QA, provenance and partition checks.
  CT IA IL IN KY MT artifacts are written and in repair against the exact
  verifier failure list (componentInventory gaps, dependency records missing an
  exact missing source, one unresolved profile path, filing-separation
  partitions). TX VT WV are still in implementation.
- **C2**: 5 commits pushed — AZ, MA, ME, NC, HI (2 tracks).
- **C3**: 3 commits pushed — ND (3 tracks), OK, OH.

### Correction recorded

The first C1 implementation pass was discarded in full. The job payload was
retyped by hand into a workflow retry instead of being read from the ledger,
which substituted fabricated track ids (`ar_seal_conviction_1460`) for the real
ones (`ar-act346`, `ar-drug-court`, `ar-pardon-seal`, `ar-veterans-court`). The
verifier caught it on first run. The 104 files produced were checked for
salvage and deleted rather than re-keyed: they described the general Act 1460
sealing pathway and PC 851.91 arrest sealing, which are not the assigned
tracks — wrong subject matter, not wrong labels. Committing them would have
reported false coverage to the terminalization ledger. The workflow now loads
the job set from disk under schema and cross-checks every id against the
ledger; no id is retyped by hand.

## For F (independent review)

Nothing here is self-approved. Each track carries `handoff.md` with its
authority, mechanism, route decision and open counsel flags; every
`counselFlags` entry names something the sources leave unsettled. The
`reviewArchetype` for every lane C job is `F-visual-and-field-fidelity`.
