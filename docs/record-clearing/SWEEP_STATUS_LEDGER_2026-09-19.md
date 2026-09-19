# Sweep status ledger — live

> **Verification complete: 258/276 pass, 18/276 fail, with every failure mapped
> to an explicit known hold. Repository tree clean. No compared release input
> changed. `rebuildRequired: false`. Release intentionally undeclared pending
> nine named authority, CI, schema and architectural holds.**
>
> The verification phase is closed. The next phase is closing the nine holds,
> not hunting for unknown breakage.

The current state of the canonical sweep. This **supersedes the naming** in
`POST_C2_DISCOVERY_INVENTORY_2026-09-19.md`, which is frozen as the record the
remediation lanes were planned from and is deliberately not edited.

Where a step's name here differs from the inventory's, this one is the proven
finding and the inventory's is the first impression.

## Denominator

**The "154-step" figure below the line is superseded and must not be reused.**
The measured surface is 276 steps over 259 distinct scripts; the full evidence is
`SWEEP_CLOSEOUT_2026-09-19.md`.

| | |
|---|---|
| Steps swept | **276**, all accounted for |
| Distinct scripts | **259**, all accounted for |
| Pass | **258** |
| Fail | **18** |
| Unexplained failures | **0** |
| New defects exposed by the full sweep | **0** |
| Regressions introduced by this session | **0** |
| Tree after the sweep | clean; mutation residue disproven per file |

Worker equivalence gate, recomputed only after the last mutation process exited
and the tree was verified clean: `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`.

Step 76 (`test-clinic-mobile-accessibility`) is **not** in the 18: it was
environmental — a `next-server` alive since 11:43 holding the project-wide dev
lock — and passes cleanly once that process is cleared.

### Superseded interim figures

| Reported | Actual |
|---|---|
| 154 steps | 276 steps / 259 scripts |
| 137 pass / 17 fail | 258 pass / 18 fail |
| "7 failures at step 136" | interim only; never a release count |

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
| **61A** | CA 1203.4a packet implementation complete; legal/owner adoption pending; fail-closed | **Substantive authority hold.** `LEGAL_DECISION_REQUIRED`. Packet complete, proven and raster-passed; output legal approval is `REQUESTED` and ungranted, and no CA record exists in the fulfillment registry. Surfaces directly as sweep step 20. Record: `ROUTE_TREATMENT_AUDIT_61_CA_1203_4A_2026-09-19.md` |
| **61B** | Stale downstream propagation of the `guidance_substitution` blocker — sweep steps 151, 192, 195 | **One problem, not three.** `sellable-pathway-closure.json` is current, carries the CA 1203.4a `guidance_substitution` blocker and hashes to `cf55c9a3…`; the coverage reconciliation, the factory-v2 registry and the launch graph still pin the pre-blocker `402b5a79…`, so **three downstream records under-report a blocking condition**. Measured by regenerate-diff-restore: every diff is the same blocker propagating. **Deliberately not repinned.** `factory-v2-route-registry.json` is one of the 30 worker-image inputs, so carrying it forward flips `rebuildRequired`. Their red state is presently useful — it stops a stale downstream representation being mistaken for terminal release state. Record: `SWEEP_CLOSEOUT_2026-09-19.md` §4 |
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
| 41 | **`CORRECT_FAIL_CLOSED` — dispositioned.** **Six**, not four: MA, NE, NJ, NV, OR, SD, identical at the accepted baseline (the frozen inventory's "four" was a truncated-log transcription, corrected here). The generator does not own these decisions — it refuses to publish six commercial reclassifications nobody adjudicated. **Defect fixed:** the refusal ran only under `--check`, while `npm run rcap:closure-contradictions` wrote unvalidated; the substantive checks now guard both paths. The six adjudications are held elsewhere, as their own owner-adjudication queue (below) — the generator is terminal, those decisions are not. Record: `CLOSURE_CONTRADICTION_AUDIT_41_2026-09-19.md` |
| 101 | **CLEARED — `GENERATED_SURFACE_STALE_HASH`.** **Four**, not three: LA, MD, MA, MT (the header said (4); my inventory transcribed the visible lines). All four surfaces first produced by one pre-baseline commit `78e79be41`. The compiled profiles are a generated projection of the approved legal route contracts and `apply-legal-authority-to-profiles --check` reports them current, so authority lives upstream and is satisfied. LA/MD/MT purely additive service branches (`packetFamily: null`); MA is the 2026-09-02 terminalization, closing direction. Re-pinned with per-state reasons; mutation-tested. **Not Lane C** — the verifier never reads `f2-dispositions.json`; my inventory was wrong about that |

### Owner-adjudication queue (split out of 41 — the generator is terminal, these are not)

| Pathway | Needs |
|---|---|
| `MA:marijuana-only-expungement` | individual commercial classification, preserved service disposition, implementation effect, child packet routes |
| `NE:law-enforcement-error-expungement` | as above |
| `NJ:clean-slate-petition-under-n-j-s-a-2c-52-5-3` | as above |
| `NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247` | as above |
| `OR:marijuana-specific-set-aside-redesignation` | as above |
| `SD:juvenile-trafficking-expungement` | as above |

### Governance, not release-blocking

| Item | State |
|---|---|
| routeKind disagreement queue | 32/32 `TECHNICAL_ONLY_SAFE`. `factory_v2` is a renderer capability and authorizes nothing; commercial authority comes only from a Grade-A record. Keep open; it does not compete with 132 or 61 |

### Lane C — **empty**

Both candidate inputs left it: `packet-fulfillment-records.json` (131 — ND's
absence is an authoritative withdrawal, not unfinished work) and
`terminalization-treatments/` (17/18 — the treatments were already written and
authorized; the verifier was scoped to one window). **No worker-image input
moves in this release**, and the gate stays `rebuildRequired: false`.

### Lane C — original candidates, both now withdrawn

| Step | Worker-image input |
|---|---|
| ~~17 / 18~~ | **CLEARED — stale window assumption, no publication needed.** **Seven** SC tracks, not four. The treatments already exist and are owner-authorized: window `2026-09-14-sc-owner-guidance-conversion`, `complete_guidance`, `candidateOnly: true`, `promotionEffect`/`ledgerEffect` `none`, `pending_independent_review`, each citing S.C. Code and `OWN-DT-2026-09-02-SC-223A1` / `SC-SINGLE-INCIDENT-FEE-TREATMENT`. The verifier measured them against the **2026-08-13 emergency-497** briefs, which never covered them. Briefing rule now scoped to its own window; out-of-window treatments must carry their own authority. 17: 121 treatments / 11,951 checks. 18: 19/19 mutations. **`terminalization-treatments/` does not move** |
| ~~101~~ | ~~`f2-dispositions.json`~~ — **removed**: the Lane F verifier never reads it. 101 cleared outside Lane C |
| ~~131~~ | ~~`packet-fulfillment-records.json`~~ — **removed from Lane C**. ND's record was deliberately withdrawn; re-adding it needs four external proofs, two of them the human gates AGENTS.md names as blocking live. This file does not move in this release |

### Awaiting terminal disposition

| Step | Finding | Why it is still open |
|---|---|---|
| 1 / 122 | **ONE ROOT, EXTERNAL HOLD — `SUPERSEDED_PIN_AWAITING_REREVIEW`.** Confirmed they share it: a recorded pin against compiled-profile bytes that later moved, with the re-review that pin's own disposition requires **not begun**. **Step 1** (`verify-rcap-terminalize-c3`) refuses on 21 records across NV, ND, SC, ID, KS, WA, NE, OH, OK, VA, WI. **Step 122** is `verify-rcap-answer-dependent-patches`: Q-J-02/Q-J-03 (KY `277a4df1f6a1` live vs matrix `4f27411ff966`) and Q-J-04 (WV `bf9709154f74` live vs matrix `0d5885d3ee56`), 10 problems over 8 held records. The supersession matrix reports 113 awaiting re-review, **32 dispositioned pairs — 20 full, 12 targeted, 0 reviewed** | Counsel/owner re-review, outstanding. **Both live profiles are byte-identical to the accepted baseline `8682bd007`** (KY last moved by `78e79be41`, WV by `9ad720a34`, both pre-baseline), so the bytes are approved and the *pins* are stale. Unlike 101 this must **not** be re-pinned: these are owner answers, and repinning would transfer an owner's answer to bytes the owner never saw. C1/C2/C3 consume only `approved_current_bytes` |
| 32 | **`STALE_CONTROL_UNRECORDED_SUPERSESSION` — held red.** **Eighteen** memos, not four (the frozen inventory's "PA, RI, VA, VT" was a truncated-log transcription): CO DE HI KY LA MA MS NC ND NE NH OK PA RI VA VT WA WY. Every byte traces to one of **ten** named commits, each citing a research or decision record present in the tree, all `createsApproval: false`. The edits **sharpen**: +681 leaves, release blockers **270 → 267**, 12 superseded questions preserved **verbatim**, and RI-B-07 *reopened* two blockers it had cleared. But `IMPORT_MANIFEST.md` forbids in-place edits and names an upstream re-import path that was not used, and step 33's generator publishes a hard-coded `sourceCommit: "3b6f4c10"` beside 51 hashes that **all match the current bytes and none the import**. Already red at the accepted baseline. Record: `MEMO_IMPORT_FIDELITY_AUDIT_32_2026-09-19.md` | Ownership decision: re-import upstream and re-pin, or replace byte-identity with a lineage proof. No honest green exists until one is built |
| 123 | **CLEARED — two answers.** **Oregon: `CORRECT_FAIL_CLOSED`.** Three routes at `recordVersion: 15`, all `INCOMPLETE` / `not_commercially_eligible`, `stalenessReasons: []`. Each missing `final_verification` (unbound) and `output_legal_approval` (pending) — the two human gates AGENTS.md names as blocking live; one also a fixture, one also six `packet_completeness` fields. Everything below those gates is green. **The failing check: `STALE_VERIFIER_ASSUMPTION`, repaired.** Its two Oregon conjuncts passed; what failed was a *nationwide* `commerciallyEligible === 0` written 2026-08-29, before any route held a Grade-A record. The six that now do are DC, IL, three MS, WY — **none in Oregon** — and they are `verify-rcap-grade-a-fulfillment-authority`'s question, which is green with `--mutations`. Already red at the accepted baseline. Rescoped to Oregon and mutation-tested 6 ways; the old check **missed** M1/M2 (another Oregon route going sellable) in the world it was written for. Record: `OREGON_TERMINAL_DISPOSITION_123_2026-09-19.md` |
| 131 | **CLEARED — `STALE_GENERATOR_ASSUMPTION`.** ND's terminal disposition already existed: commit `0dd092d29` (2026-09-18) **withdrew** its fulfillment record under a stated rule, append-only, preserving the prior record and hash. The generator predated that and read a deliberate withdrawal as missing evidence. It now consults `fulfillment-authority-withdrawals.json`: an explained absence is the rule working; an unexplained one still refuses (mutation-tested). **ND stays commercially refused** on four unproven gates: final-verification binding, official-source binding, legal/output approval, page-by-page visual approval |

## 132 terminal condition

132 goes green only when all four hold:

1. approved canonical bytes on disk — **true now** (`c2938658…`);
2. a fresh, non-rejected acceptance receipt bound to those exact bytes — **blocked**, needs the raster acceptance workflow;
3. `consumerSpecificationBinding` honouring the specification's explicit `routeKeys`, with no Mississippi special case and no literal pathway added;
4. commercial regression tests proving no sibling route is accidentally admitted.

## Completion standard — met for verification, not for release

The standard was: every step either green, or explicitly terminalized as a
sanctioned fail-closed release hold, with the release then intentionally not
declared complete.

**That standard is now met.** 258/276 green; the other 18 each mapped to a named
hold against that hold's own record; 0 unexplained and 0 new. The release is
intentionally undeclared, which is the sanctioned state rather than an
outstanding defect.

## The finish queue

Nine holds. None is a debugging question; each needs a decision, an external
proof, or a migration.

| Hold | Needs | Sweep steps |
|---|---|---|
| 5 | owner adjudication of the consolidated guard architecture (patch 11) | 127 |
| 12 | canonical cross-lane track→family bridge; remove the foreign VA lane-D record **only afterward** | 134 |
| 1 / 122 | owner re-review of answers against successor compiled-profile bytes | 121, 122, 123, 244 |
| 22 residual | repair two CI-wired red verifiers, or an owner decision to unwire | 144 |
| 32 | memo succession/lineage governance — the controls falsely mix import identity with successor hashes | 154 |
| 33 | per-question resolution ownership/schema decision | 155 |
| 36B | per-question out-of-report-scope reason/source model | 158, 164, 165 |
| 41 owner queue | six pathway adjudications; the generator itself is terminal | 163 |
| 61A / 61B | CA § 1203.4a authority decision, then downstream propagation | 20 / 151, 192, 195 |
| 132 | A complete; **B** real CI raster evidence blocked; **C** prohibited until B; **D** regression proof after C | 254 |

### The 61 sequence, in order

61B must not be repinned before 61A is decided. Mechanically refreshing those
three to make the sweep greener would replace a useful red with a stale
downstream representation that could be mistaken for terminal release state.

1. obtain the actual step 61 owner/legal decision;
2. establish the truthful resulting closure state;
3. regenerate 151 / 192 / 195 from that state;
4. allow `factory-v2-route-registry.json` — a worker-image input — to move;
5. recompute `changedPaths` / `rebuildRequired`;
6. rebuild and run the relevant acceptance controls.

## No longer mysteries

Conclusively dispositioned, each on its own proof rather than on the final
sweep: 17/18, 22, 22A, 26→27, 36A, 41 generator behaviour, 58, 101, 106, 123,
131, 142, 144, the routeKind commercial concern, the audit-harness restoration
contract, and the consumer payment-evidence guard.

## Outside the release determination

Repository hygiene, not product authority; recorded so it is not lost:

- a **tracked** Python bytecode cache,
  `scripts/rcap-packet-recovery/__pycache__/admit-completed-fixture-raster.cpython-311.pyc`,
  is rewritten by every run of the raster admission test, so every Python test
  run dirties the tree. Restored from HEAD; derived output should not be tracked.
- the SC window-precedence guard added during 17/18 stays recorded on its own
  evidence even though 17/18 are green: renaming the later window to sort first
  makes all three SC treatments fail by name, so filename sort order is no longer
  load-bearing for authority.
