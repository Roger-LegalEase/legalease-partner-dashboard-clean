# #60 — Oregon fulfillment supersession

## Base SHA

`1ad2c1c994ab0d5540285b691b51587981f3f2e3`, fetched and verified before mutation. This reconciles the useful work from rejected candidate `62128e18ef558a59fe6231068cef8b6b6a9b8f7f` directly onto the final Captain. That rejected candidate is not an ancestor or integration dependency. Captain’s final `verify-or-retired-route-commercial-posture.mjs` is byte-identical and was not edited (Git blob `640d2ea169428154a391c0bbf94651a80ae31286` at both base and candidate).

## Root cause / generator source chain

The registered Oregon packet specification already declares a structured retirement, but the fulfillment generator ignored it. Its existing supersession path handled a replacement authority record identity, not a retired specification with no authorized successor record. The old record consequently remained current and projected ten missing-proof tasks.

Existing specification → `packetSpecificationFor()` → `generate-rcap-grade-a-fulfillment-authority.mjs` → controlling fulfillment registry → shipped registry loader and `evaluateFulfillmentAuthority()` → fulfillment projection. Current records also feed the observation and static worker-authority outputs. Runtime commercial admission reads the controlling registry, not the display projection.

## Authoritative supersession input

`data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json` supplies `supersededBy.status: historical_only`, effective date `2026-08-29`, successor specification `OR-disposition-configurations.v1.json`, and the three replacement configuration IDs. No legal input, retirement list, ratification, factory registration, or successor design was authored or changed.

## Generated record / projection before and after

Exact route: `OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`.

| Property | Captain | #60 |
|---|---|---|
| Record version | 17 | 18 |
| Current record | Present | Absent |
| Projection | INCOMPLETE | SUPERSEDED |
| Active missingProof | 10 | 0 |
| Superseded by / effective date | null / null | Dedicated terminal-retirement identifier / 2026-08-29 |
| Commercial status | not_commercially_eligible | not_commercially_eligible |
| Historical service disposition | paid_packet_intended | Unchanged |
| Historical output review | pending | Unchanged |
| 2026-08-19 authority | Preserved | Preserved |

The registry retains all 14 records; current records become 13. The projection retains all 14 route identities. Incomplete becomes 7; superseded becomes 1; complete and commercially eligible remain 6. Only the retired route's current observation and static worker-authority entry are removed.

## History / supersession proof

All 17 predecessor history entries and historical evidence remain unchanged. Version 18 appends `changeKind: superseded`, recorded on 2026-09-22, with the authoritative effective date separately in `supersededAt`. It links to predecessor hash `6b6ac7d96f605fc944392a4e12140511ba44b86b0c98d0d38f4d76a5a10ce151`. Native history validation passes. The loader exposes history but no current record; the shipped evaluator returns SUPERSEDED with no active proof work when projecting that history.

`supersededBy` now names `terminal-retirement:sha256:a0557fc51ebf134674eab60b0aee860ea31869c362c4f93b175571413722ddce`, not a specification path or invented successor record. Its explicit `terminalRetirement` object binds that identifier to terminal legal retirement, the effective date, originating specification identity/version/route and authority field, replacement specification, three replacement configurations, reason, and `successorGradeAAuthority: none`. The loader rejects missing or mismatched terminal bindings. Native authority remains SUPERSEDED; its explanation now explicitly says there is no successor authority.

**Shared verifier review required before Captain integration:** `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` no longer restricts display projections exclusively to `loaded.current`. The reconciled change is narrower than 62128e18: only explicit terminal retirement can be projected when no current record exists, and that row must be SUPERSEDED. Ordinary history cannot supply a projected current authority, and a current record always takes precedence. The generator uses the same selection and the shipped evaluator. No loader rule admits terminal history as current. Claude should review this shared semantic diff explicitly. Captain’s final #60 acceptance verifier itself remains unchanged.

## Successor proof / commercial preservation

All three successor configurations retain no Grade-A record, no inherited ratification, commerciallyEligible 0, completePacketProven 0, no factory admission, and no render job. The original and successors are refused at checkout, payment, sponsorship, generation, packet credit, and delivery surfaces.

The targeted test compares 344 compiled routes plus three successors at all ten native admission points: 3,470 decisions retain their admitted/refused result. Non-target authority records, observations, projected rows, and worker entries are identical. All 51 compiled profiles, Oregon legal inputs, ratification registry, and #59 factory registry are unchanged. Context-free participant admissions are refusal comparisons, not a claim of successful live checkout; the #52 suite separately tests readiness and sponsorship gates. Nationwide complete/commercial eligibility remains 6.

## Generator idempotence and baseline-identical failure

The **full generator is not green**. At the exact Captain and this candidate it stops on the same existing MS non-conviction proof:

- Input: `data/record-clearing/legal-design-packet-set-manifests.json`.
- Actual: `177d5d131b066827e8ae030715edb28ca6729060b60d7865cd2d67ed76f556f0`.
- Required: `9034e44d95da99cc5f2bc14db11d8a4dee049b0f229c9410b098e30c427043b4`.

Both normal generation and normal `--check` were attempted. No MS proof was repaired, suppressed, or reclassified.

The canonical scoped interface is restricted to the exact Oregon route and requires a matching environment binding. The older `--or-retirement-only` option is rejected:

```sh
export RCAP_AUTHORITY_SCOPED_CHECK_ROUTE=OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c
node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --scope "$RCAP_AUTHORITY_SCOPED_CHECK_ROUTE"
node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check --scope "$RCAP_AUTHORITY_SCOPED_CHECK_ROUTE"
```

Both pass. A repeated generation produces identical bytes. Wrong-route scope and mismatched environment bindings are rejected without changing artifacts. The bounded mode starts from committed authority, applies the same specification transition as normal generation, and uses the same shipped evaluator for projection. It asserts preservation of every non-target registry record, observation, projection row, and worker-authority entry. It explicitly asserts all three successor records remain absent. Its own in-memory second derivation checks registry, observation, native projection, and static authority idempotence. `--check` is nonmutating, including in the corruption tests. It does not certify fresh unrelated packet evidence or relax the full generator.

## Mutations / validation

`node scripts/test-specification-fulfillment-supersession.mjs` passes, including 19 caught mutations: ignored supersession, cleared pointer, cleared date, omitted event, broken history chain, deleted historical route, projection patched without authority change, factory reopened, each of three successor records created, checkout reopened, payment reopened, actual generator ignoring supersession, actual generator accepting a manually patched projection, and bounded generation changing a non-target record, borrowing the specification namespace, omitting terminal retirement, and claiming successor authority. Additional loader tests reject missing/mismatched terminal objects even after recomputing the outer history hash. Generator mutations assert the specific expected refusal, not merely a crash.

Passing standing gates:

- Untouched final #60 posture: **49/49**. The reported baseline count of 46 grows by three when the historical-chain check and two §10 supersession checks have an actual retired record to inspect; no check was added or weakened.
- #59 retired-route/build-target verifier.
- #52 commercial-readiness suite, including sponsorship refusals.
- #53 court-facing rows: 114 composed adapters preserve output; split-token and delivered-page formatting tests: 2/2.
- #63 candidate acceptance.
- Grade-A fulfillment authority: 78 checks.
- Render-job ratification preservation.
- #49 consumer-payment receipt and Briefcase presentation authority tests.
- Typecheck, production build, targeted ESLint, and diff whitespace check.

No new failing gate was observed. This work does not claim #49 hosted/PostgreSQL evidence or resolve the unrelated full-generator MS defect.

## Files / commit

Generator and shared specification-transition helper; four generated authority artifacts; targeted supersession test; native terminal-retirement type/validation/explanation; the shared Grade-A projection verifier; this handoff. The final Captain #60 verifier is not part of the diff. No production operation, legal change, receipt-history change, #63 mechanic change, or unrelated packet repair. The containing single #60 commit is the integration unit; stop after pushing it to `codex/mission-lock-engineering`.

## Generated-artifact diff

- `fulfillment-authority-registry.json`: only Oregon version 17 → 18, terminal-retirement pointer/date/object, and one appended history entry. All 13 non-target records are byte-identical under Captain’s pinned digests.
- `fulfillment-authority-projection.json`: only Oregon version/state/missingProof and derived incomplete/superseded counts move. The other 13 rows and commercial count remain identical.
- `fulfillment-observation-snapshot.json`: only Oregon’s obsolete current observation is removed.
- `worker-static-authority.json`: only Oregon’s obsolete current worker entry is removed.

No generated file was hand-patched. Historical pins remain exactly: paid_packet_intended; pending output review; approved_by_decision_owner legal status; rcap-or-official-pdf-fill family; or_acquittal-set specification with SHA cee130aae71f9282e0a88f7d8940a6d4d586482ed04a3d83d1be20fb4ac26c24 and complete=true; final verification unbound.
