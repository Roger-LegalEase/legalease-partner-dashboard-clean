# Grade-A launch status

_Rendered from `GRADE_A_LAUNCH_CONTROL.json` by the same generator, in the same run. It has no facts of its own; if it disagrees with the record, the record is right and this file is stale._

**GO/HOLD: HOLD.** No family is COMPLETE_PACKET_PROVEN, no route is commercially open, and the launch gate is closed on every one of the 352 families. GO is a statement about proven packets, and there are none yet. Holding is the correct state, not a failure.

## Lineage

| | |
| --- | --- |
| Captain branch | `claude/legalease-sprint-captain-utucnw` |
| Captain SHA | `49dfa403a4185542c494d7ef53ae015931402e43` |
| Census fingerprint | `sha256:3fe4e0fd1828e2ddeef1f5b013c45112cf918c18143c9ac4ab46b9db682b8455` |
| Production connected | NO |

## Denominator

| | Current | After the Category B integration |
| --- | ---: | ---: |
| Terminal obligations | 703 | 729 |
| Category A | 451 | 486 |
| Category B stages | 166 | 154 |
| Packet families | 352 | 352 + 20 participant-filing families |
| Runtime routes | 337 | 337 |
| Jurisdictions | 51 | 51 |

The right-hand column is a projection, not a fact. The census moves only when the branches exist and only through its own generator.

## The 55 revalidated Category B routes

| | |
| --- | ---: |
| Rows returned | 55 |
| SPLIT_B_STAGE_AND_A_BRANCH | 49 |
| CONFIRM_B | 3 |
| CONVERT_ALL_TO_A | 3 |
| Still needing a legal decision | 0 |
| A branches already in the canonical universe | 17 |
| A branches newly required | 35 |
| Alias or crosswalk repairs | 6 |
| B stages retained | 52 |
| Participant packet families required | 23 |
| of those, already in the census | 3 |
| New packet families required | 20 |

49 splits is not 49 new obligations, and it is not 49 new families. Each participant branch was matched against the Category A routes in its own jurisdiction on the form numbers its instrument names before anything was counted as new.

## First wave

12 lanes returned and 0 is still running (**null**). Every verdict below is checked against git, not against a worker's summary.

| | |
| --- | ---: |
| Scope and required outputs verified | 11 |
| Scope clean, a required output missing | 1 |
| Refused | 0 |
| Writes outside a lane's owned paths | 0 |
| Prohibited-path violations | 0 |

### Branch identities

| | |
| --- | ---: |
| Classified routes | 55 |
| Completed | 41 |
| Stopped | 14 |
| New branch identities integrated | 28 |
| Crosswalks integrated | 10 |
| Confirmed-B guidance identities integrated | 3 |
| Packet families created | 0 |

An integrated branch identity is an identity. It opens no commercial route, proves no packet, consumes no packet credit and creates no packet family. Every fail-closed commercial gate stands unchanged.

### Packet factory

| | |
| --- | ---: |
| Families assigned | 47 |
| Built | 43 |
| Stopped with a named blocker | 4 |
| Source receipts exact | 9 |
| Source references bound | 27 |
| Private-corpus binaries excluded at integration | 59 |
| Built families missing a wiring record | 23 |
| Independently verified | 0 |
| Output approvals granted | 0 |
| Commercial routes opened | 0 |

Built means artifacts were rendered and byte-checked by the lane that built them. It is not independent verification, not visual review, not an output-level legal approval, and not COMPLETE_PACKET_PROVEN.

### Packet completeness

That every write was correct: bound to exact source bytes, inside a measured box, off every protected field. It never asked what was owed, so a family could pass having written 6 of 187 fields.

| | |
| --- | ---: |
| Families audited | 43 |
| PASS_COMPLETE | 19 |
| FAIL_MISSING_REQUIRED_FACTS | 22 |
| FAIL_COMPONENT_SET | 2 |

| Counter | Fleet total |
| --- | ---: |
| knownRequiredFieldsMissing | 1198 |
| requiredFactsNotCollected | 9 |
| unclassifiedBlanks | 779 |
| incompleteRows | 11 |
| requiredOptionsMissing | 121 |
| requiredComponentsMissing | 31 |
| invisibleWrites | 0 |
| protectedWrites | 0 |
| visualDefects | 0 |

**4 PASS classifications revoked** to `PASS_REVOKED_PENDING_COMPLETENESS_RECHECK`: `nj_disorderly_persons-set`, `ca-17b-reduction-set`, `ca-1203-43-set`, `az_marijuana_expungement_superior_court-set`. Lawrence review packages prepared: 0.

### Residual

| | |
| --- | ---: |
| Branch identities still open | 14 |
| Already-answered engineering rows | 37 |
| Mapping rows | 29 |
| Stage/branch pair bindings | 13 |
| Source identities | 19 |
| Official URLs | 30 |
| Acquisitions | 49 |
| Promotions | 33 |

### What the wave taught

- **SYS-A** — Workers were told to branch from the control baseline and to read the assignment manifest as a required input, but the manifest and the prompt directory exist only in the dispatch commit that follows it.
  _Fix:_ Every prompt and the manifest now state two commits: branch from the control baseline, and read and verify the assignment from the dispatch commit.
- **SYS-B** — At least one worker host could not install dependencies: 32 MiB free after worktree creation, so no test that needs node_modules could run.
  _Fix:_ The worker execution contract states a minimum free-disk precondition and requires a lane to report DEPENDENCIES_UNINSTALLABLE rather than reporting a test as run.
- **SYS-C** — Acquisition stopped on all 49 obligations because the assignment's group stop rule said egress was refused, not because a probe found it refused. C10's own HEAD probe reached 5 of the 7 official hosts it tested.
  _Fix:_ Egress is recorded per exact source. A next-wave worker is given the refused hosts and told not to retry them, and the reachable hosts without a blanket stop.
- **SYS-D** — Seven branch-identity lanes returned seven different schemas for the same two required filenames: different array keys, different status vocabularies, different field names for the same fact.
  _Fix:_ A canonical integration status is generated from the seven returns through explicit per-lane adapters, and the next dispatch states the output schema each lane must emit.

The execution contract carries 6 clauses and binds from wave 2. C11_PACKET_FACTORY_ACCELERATOR is still running against this manifest. Regenerating it would change a live worker's row list, owned paths and verification target mid-flight, which is worse than the defect being fixed.

## Legal work

Four questions were genuinely for counsel; **4 are answered and 0 remain open**. The other 82 rows of the 86 are Captain work.

- #4 AL — Alabama de novo circuit-court review after final agency denial — ANSWERED 2026-08-30: A — LegalEase must fulfil a bounded, participant-filed circuit-court appeal.
- #47 NE — Where to go if you want your Nebraska conviction overturned — ANSWERED 2026-08-30: B — legitimate exclusion, UNSUITABLE_FOR_SELF_HELP. A pro se verified motion legally exists; merits drafting is excluded as a product-suitability decision.
- #54 NY — Possible pre-November 1, 1991 legacy motion — ANSWERED 2026-08-30: A — fulfil, but only after splitting the legacy cohort at September 1, 1980. One generic pre-1991 § 160.55(3) motion would be legally inaccurate.
- #76 UT — Not eligible yet? Reducing the conviction level may open a route — ANSWERED 2026-08-30: A — fulfil the defendant-filed § 76-3-402 branches; separately gate the consent-dependent and joint-motion branches.

### What the four answers require

| | |
| --- | ---: |
| Category A | 3 |
| Category B (legitimate exclusion) | 1 |
| Mandatory route splits | 1 |
| Subroutes required | 2 |
| Branches gated behind prosecutorial consent | 4 |
| Branches participant-filed with no consent gate | 5 |
| Obligations added | 1 |

New York cannot be built as one generic pre-November 1991 motion: the screening must ask the exact conviction date, and that date selects the motion theory. Utah's consent-dependent and joint-motion branches refuse without signed prosecutorial consent. Nebraska generates no merits pleading at all.

These determinations create implementation obligations only. No commercial route opens and no packet is proven.

| Queue | Rows |
| --- | ---: |
| Already answered — implementation | 37 |
| Captain route mapping | 33 |
| Source identity | 8 |
| Duplicate or superseded | 4 |

## Source work

| Disposition | Obligations |
| --- | ---: |
| LEGAL_DESIGN_DECISION_REQUIRED | 19 |
| NO_OFFICIAL_FORM_COMPOSE_OUTPUT | 31 |
| NO_PARTICIPANT_DOCUMENT | 3 |
| ALREADY_HELD_VERIFIED_CORPUS | 81 |
| UNRESOLVED_IDENTITY | 19 |
| RESOLVE_OFFICIAL_URL | 11 |
| PROMOTE_FROM_NATIONWIDE_INVENTORY | 33 |
| NOT_A_SEPARATE_DOCUMENT | 18 |
| ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE | 59 |

59 obligations have an exact official target and cannot be fetched from any Captain-reachable environment.

## Packet families

| | |
| --- | ---: |
| Total | 352 |
| Releasable | 114 |
| Held for a missing source | 238 |
| Candidate evidence in the Captain tree | 50 |
| Finished on a branch, awaiting integration | 6 |
| Free to dispatch | 296 |
| COMPLETE_PACKET_PROVEN | 0 |

## Product path

Commercial routes opened: **0**. Commercially eligible: **0**.

These classifications create implementation obligations and nothing else. They authorize no checkout, sponsorship, packet-credit consumption, provider dispatch, artifact attachment, delivery, repeat download, commercially eligible status or COMPLETE_PACKET_PROVEN. Every fail-closed commercial gate stands unchanged.

## Tests

- **focusedControlPlane** — generated at run time by the checkpoint verifier
- **fullChain** — NOT RUN — a broad tracked-file mutation suite is not run while external workers are active
- **hostedAcceptance** — NOT RUN — no hosted environment is reachable from the Captain environment
- **productionPreflight** — NOT RUN — Production is not connected and no Production authorization exists

## Blockers

### BLK-1 — Official-source acquisition has not run, and the reason is per source rather than a blanket policy refusal

A HEAD probe from a worker host reached 5 of 7 official hosts tested; the rest refused. No document body was downloaded, so reachability is proven and acquisition is not. The 49 obligations stopped on this dispatch's blanket egress stop condition, which the worker execution contract removes.

**Owner:** Captain — reissue acquisition per reachable source; Roger — escalate the refused hosts. **Blocks:** 49 acquisition obligations and 33 promotion candidates

### BLK-2 — CLOSED — the four true counsel questions are answered

4 of 4 answered on 2026-08-30 by Lawrence Blackmon: 3 Category A, 1 legitimate exclusion. New York requires a mandatory split into 2 date-specific subroutes and Utah gates 4 of nine branches behind prosecutorial consent. What remains is implementation, carried as residual lane R6.

**Owner:** Captain — residual lane R6_COUNSEL_DETERMINATION_IMPLEMENTATION. **Blocks:** nothing; this blocker is closed

### BLK-3 — No packet family has an independent review or output approval

Six families carry candidate evidence in the tree and six more await integration; none has passed independent technical verification, independent visual review or Lawrence approval.

**Owner:** Captain then Lawrence. **Blocks:** COMPLETE_PACKET_PROVEN for every family, and therefore every commercial route

### BLK-4 — The data-rights migration cannot be applied from this environment

Authorized for the synthetic acceptance project and unspent; the preconditions are observations about a project this environment cannot reach.

**Owner:** an environment with the project ref and egress. **Blocks:** hosted data-rights acceptance

### BLK-5 — 238 families are held for a missing source

Released automatically as sources resolve; the scoreboard recomputes releasability rather than relying on anyone remembering.

**Owner:** source lane C10, continued as residual lane R4. **Blocks:** 238 of 352 families entering a build slot

### BLK-8 — 43 packet families are built, none is independently verified, and none is complete

C11 rendered and byte-checked 43 families against exact source SHA-256 values, but a builder verifying its own output proves nothing — and the completeness contract now shows the deeper problem: 19 of 43 families contain everything a filing needs. 1198 known required fields are missing across the fleet and 121 route-determined elections are left to the participant. The four families previously classified PASS are revoked.

**Owner:** R8 repairs the four, V1-V7 verify the rest, then Lawrence. **Blocks:** output-level approval, and therefore product-path proof, for every family

### BLK-6 — At least one worker host could not install the toolchain

32 MiB free after worktree creation, so no test needing node_modules could run and two focused tests were returned BLOCKED rather than passed. One return documents it here; the owner reports it as shared across the wave.

**Owner:** Roger — worker environment sizing. **Blocks:** every focused test in an affected lane, and the hosted acceptance lane entirely

### BLK-7 — The private nationwide inventory is not mounted on any worker host

33 promotion candidates were receipted against their committed hashes and none was physically promoted, because private/Nationwide Record Clearing/ was absent from the executing host.

**Owner:** Roger — mount the inventory for the source lane. **Blocks:** 33 promotion obligations

## What would change GO/HOLD

One family passing the full sequence — independent technical verification, independent visual review, an exact output-review package, Lawrence's approval of exact hashes, a Grade-A fulfilment record, product wiring and both path proofs — would open exactly that family's route and nothing else.
