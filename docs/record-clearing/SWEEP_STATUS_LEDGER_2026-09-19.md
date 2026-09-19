# Sweep status ledger — live

The current state of the 154-step canonical sweep. This **supersedes the naming**
in `POST_C2_DISCOVERY_INVENTORY_2026-09-19.md`, which is frozen as the record the
remediation lanes were planned from and is deliberately not edited.

Where a step's name here differs from the inventory's, this one is the proven
finding and the inventory's is the first impression.

| | |
|---|---|
| Steps swept | 154 |
| Pass | 137 |
| Fail | 17 |
| Failing identically at the accepted baseline `8682bd007` | 17 of 17 |
| Regressions introduced by this session | 0 |

Worker equivalence gate at every commit: `comparedInputs: 30`,
`changedPaths: []`, `rebuildRequired: false`.

## Renamed

**Step 132** was recorded in the frozen inventory as *"MS over-admission at
`consumer_checkout`"*. That is not what it is. Its proven name is:

> **132 — MS municipal approved-route specification-binding mismatch;
> fail-closed under-delivery**

`MS:additional-municipal-court-misdemeanor-relief-21-23-7-6` holds owner
approval (`OWN-ARTIFACT-REREVIEW-MS-MISD-ADDL-2026-09-14`), a v23 Grade-A
record, and inclusion in the intended commercial set — and cannot bind its
exact specification, because the shared specification names the justice-court
pathway. It is refused at every surface. The defect is under-delivery, not
over-admission. Full trace: `COMMERCIAL_ADMISSION_AUDIT_132_2026-09-19.md`.

The other half of 132, `MS:non-conviction` being admitted at consumer
checkout, is **closed**: it is authorized by a named, hash-pinned owner
decision and refused on every sponsored and credit surface.

## Closed this session

| Item | Disposition | Record |
|---|---|---|
| 22A credit boundary | Closed. All five `creditConsumable:false` routes refuse before any credit side effect; with a real `trackId` supplied, still refused at packet credit consumption | `CREDIT_BOUNDARY_AUDIT_22A_2026-09-19.md`, `COMMERCIAL_ADMISSION_AUDIT_132…` |
| Audit harness restore contract | Terminal. 512-script run, declared-output tripwire, no residue | `scripts/audit-orphaned-verifiers.mjs` |
| 26 → 27 | Green. Fixture derived from the route's collection; ownership proven over all 52 participant facts | |
| 58 | Green. Control follows the workflow's stronger Git-resolved SHA | |
| 106 | Green. One evidence-input fingerprint re-recorded; no eligibility movement | |
| 142 | Green. 72 pass, 6 skipped naming the unmounted Master Library | |
| 144 | Green. Drifted-receipt subject derived, not named. **The verifier is fixed; the rejected receipt it discovered was a separate live product-state defect, now owned by 132 and withdrawn in its stage 1.** "144 green" never meant the receipt was repaired | |

## The 17 open, by disposition

### Release holds

| Step | Finding | State |
|---|---|---|
| **132** | MS municipal approved-route specification-binding mismatch | `SHARED_SPEC_EXPLICITLY_AUTHORIZED`, held. **132A COMPLETE** — the RASTER_PASS bound to the owner-REJECTED canonical `3c7588be…` is withdrawn and kept as history; repo-wide receipt drift is now zero. **132B BLOCKED ON CI/OWNER ACTION** — fresh acceptance evidence for the approved canonical `c2938658…` requires a `workflow_dispatch` run of `rcap-packet-raster-acceptance-batch.yml` on a Chrome runner, whose `workflowRunId`/`jobId`/`artifactId` cannot be manufactured here. **132C NOT YET PERMITTED** — correcting `consumerSpecificationBinding` to honour the spec's plural `routeKeys`. **132D PENDING AFTER 132C** — commercial/sibling regression proof. After 132B runs, verify the committed receipt's canonical digest equals `c2938658…` before touching binding code; a green workflow alone is not enough. Records: `MUNICIPAL_ROUTE_BINDING_AUDIT_132_2026-09-19.md` |
| **61** | CA 1203.4a packet implementation complete; legal/owner adoption pending; fail-closed | `LEGAL_DECISION_REQUIRED`. Packet complete, proven and raster-passed; output legal approval is `REQUESTED` and ungranted, and no CA record exists in the fulfillment registry. Record: `ROUTE_TREATMENT_AUDIT_61_CA_1203_4A_2026-09-19.md` |
| **5** | Approved-state record reconciliation required; patch 11 additionally requires owner adjudication of an intentional architecture change | Nine `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` or `STRONGER_CONTROL_UNRECORDED`; **patch 11 `checkout/route.ts` is `AUTHORITY_CONFLICT`** — the approved control named two independent guards and one remains. No digest is eligible for rollover. Record: `AUTHORITY_RECONSTRUCTION_5A_5B_2026-09-19.md` |
| **5B** | CA `ca-diversion-seal-primary-filing-2` dependency carrier | `APPROVED_SUCCESSOR_PROVEN` — produced by owner determination `DET-DT-CA-CRM307-001`, strictly narrowing. The stale digest lives in the frozen correction assignment, a different artifact; re-freezing it needs its own authority |

### Structural / content Lane B

| Step | Finding |
|---|---|
| 12 | **`MOVE_TO_EXISTING_OWNER_DATASET`.** `va_exp_absolute_pardon` shares 0/67 of the D schema, lacks 26 of 29 universal fields, and is excluded by D's own derivation rule (lane D is `official_form_standard`/`production_packet`; the track is `controlled_pleading` with null treatment). No owner decision ever placed it there — commit `97adcecd5` wrote it in as a track-to-family bridge because that is the file the paid-pathway join reads. **Removal alone is wrong**: measured, it flips VA from `owner_approval_pending` to a false "no packet family is reachable". Root: a lane-D non-canonical analysis is being used as the universal track→family map. Record: `D_TRACK_FOREIGN_RECORD_AUDIT_12_2026-09-19.md` |
| 22 | **Not a register defect.** Both scripts are genuinely red, both red at baseline, and both invoked by `rcap-all50-handoff.yml` — a red check really is in CI. Resolved by repairing `verify-rcap-problematic-pdf-remediation` (master-list arithmetic: 153 vs 128 assets) and `verify-rcap-census-v1-money-credit-gate` (the resolver-flag vs Grade-A-authority split), or by an owner decision to unwire. A false "Green" claim in the register's recorded reason was corrected by dated appendix |
| 33 | **Provenance basis cannot safely determine resolution ownership; explicit owner decision/schema treatment required.** `OWNER_DECISION_REQUIRED`, narrowly. Three rows, **two distinct questions** — the two RI rows are one finding, `RI-B-07`. Both ask for an official source a prior attempt failed to obtain (RI District Court filing fee; WY criminal-rules PDF / Rule 47/49), so the work is source acquisition in all three. But owners are assigned by provenance *class*, and nothing establishes one for `independent_review_finding` or `owner_relayed_research` — those name where a question came from, not what answers it. Nothing gates on the label. Record: `PROVENANCE_OWNER_AUDIT_33_2026-09-19.md` |
| 36A | **RESOLVED — `ACCOUNTING_OMISSION`.** The 42nd tuple is Q-058, surfaced when `c5c0f3d50` bound the KY 218A.276 pathway to its track. Recorded as a third accounted addition; `53 + 3 − 14 = 42` and the register regenerates current |
| 36B | **Q-058 is in scope and unresolved; outside the 2026-08-28 report's scope as coverage.** True on the report's own contract (Q-018/Q-057 precedent) but **not recordable today**: the overlay attaches one hard-coded Mississippi source task and reason to every out-of-scope entry, so adding a KY counsel question would publish a false MS filing-fee rationale. Fix the mechanism per-question first. Record: `LEGAL_QUESTION_LEDGER_AUDIT_36_2026-09-19.md` |
| 41 | NJ, NV, OR, SD have no individual adjudication; the eleven rows are not one move |
| 101 | Lane F profile-surface hashes moved for LA, MD, MA |

### Governance, not release-blocking

| Item | State |
|---|---|
| routeKind disagreement queue | 32/32 `TECHNICAL_ONLY_SAFE`. `factory_v2` is a renderer capability and authorizes nothing; commercial authority comes only from a Grade-A record. Keep open; it does not compete with 132 or 61 |

### Lane C — one publication, after the reviews settle

| Step | Worker-image input |
|---|---|
| 17 / 18 | `data/rcap-all50/terminalization-treatments/` — four SC tracks carry a treatment the window never briefed |
| 101 | `data/rcap-all50/review-artifacts/f2-dispositions.json` |
| 131 | `data/rcap-ledger/packet-fulfillment-records.json`, if it ever resolves |

### Awaiting terminal disposition

| Step | Finding | Why it is still open |
|---|---|---|
| 1 / 122 | Provenance review — WA, NE, OH, OK at `SUPERSEDED_PIN_AWAITING_REREVIEW`; WV Q-J-04 re-pin | 32 counsel re-review units outstanding. C1/C2/C3 consume only `approved_current_bytes` |
| 32 | PA, RI, VA, VT memos differ from `origin/feat/record-clearing-production-integration` | Source fidelity; needs an ownership decision on which side is authoritative |
| 123 | Oregon: three configurations exist, superseded route recorded, none commercially open, and then `INCOMPLETE / not_commercially_eligible / eligible 6` | Needs a terminal statement of the Oregon position |
| 131 | `ND:first-offense-possession-sealing` has no packet fulfillment record; the verifier refuses to invent one | Correct behaviour, but "correctly refusing" is not a disposition. ND needs a terminal source/ownership decision |

## 132 terminal condition

132 goes green only when all four hold:

1. approved canonical bytes on disk — **true now** (`c2938658…`);
2. a fresh, non-rejected acceptance receipt bound to those exact bytes — **blocked**, needs the raster acceptance workflow;
3. `consumerSpecificationBinding` honouring the specification's explicit `routeKeys`, with no Mississippi special case and no literal pathway added;
4. commercial regression tests proving no sibling route is accidentally admitted.

## Completion standard

17 known failures is not completion. This sweep is complete when every step is
either green, or explicitly terminalized as a sanctioned fail-closed release
hold — in which case the release itself is intentionally not declared complete.
