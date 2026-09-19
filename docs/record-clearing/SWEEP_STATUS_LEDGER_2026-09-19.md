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
| 144 | Green. Drifted-receipt subject derived, not named | |

## The 17 open, by disposition

### Release holds

| Step | Finding | State |
|---|---|---|
| **132** | MS municipal approved-route specification-binding mismatch | `SHARED_SPEC_EXPLICITLY_AUTHORIZED`. The specification declares both routes in `routeKeys`, cites §§ 9-11-15(3) **and** 21-23-7(6) as parallel provisions, and forbids a sibling route; `consumerSpecificationBinding` compares the singular `pathwayId` instead. **Ordering constraint: the family's live RASTER_PASS is bound to the owner-REJECTED canonical `3c7588be…` and was never withdrawn — withdraw and re-raster against the approved `c2938658…` BEFORE honouring `routeKeys`, or the fix opens checkout on rejected acceptance evidence.** Record: `MUNICIPAL_ROUTE_BINDING_AUDIT_132_2026-09-19.md` |
| **61** | CA 1203.4a packet implementation complete; legal/owner adoption pending; fail-closed | `LEGAL_DECISION_REQUIRED`. Packet complete, proven and raster-passed; output legal approval is `REQUESTED` and ungranted, and no CA record exists in the fulfillment registry. Record: `ROUTE_TREATMENT_AUDIT_61_CA_1203_4A_2026-09-19.md` |
| **5** | Approved-state record reconciliation required; patch 11 additionally requires owner adjudication of an intentional architecture change | Nine `SEMANTICALLY_EQUIVALENT_BUT_UNRECORDED` or `STRONGER_CONTROL_UNRECORDED`; **patch 11 `checkout/route.ts` is `AUTHORITY_CONFLICT`** — the approved control named two independent guards and one remains. No digest is eligible for rollover. Record: `AUTHORITY_RECONSTRUCTION_5A_5B_2026-09-19.md` |
| **5B** | CA `ca-diversion-seal-primary-filing-2` dependency carrier | `APPROVED_SUCCESSOR_PROVEN` — produced by owner determination `DET-DT-CA-CRM307-001`, strictly narrowing. The stale digest lives in the frozen correction assignment, a different artifact; re-freezing it needs its own authority |

### Structural / content Lane B

| Step | Finding |
|---|---|
| 12 | VA `va_exp_absolute_pardon` missing a D-track field — the map's scope and its array disagree because one entry is not D-track shaped |
| 22 | Verifier register: 2 scripts wired into required CI while last observed `orphan_broken` |
| 33 | 3 questions carry a provenance with no owner mapping |
| 36 | Question ledger arithmetic; Q-058 legally open but not recorded as outside the national report's scope |
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

## Completion standard

17 known failures is not completion. This sweep is complete when every step is
either green, or explicitly terminalized as a sanctioned fail-closed release
hold — in which case the release itself is intentionally not declared complete.
