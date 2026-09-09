<!-- CLAUDE CAPTAIN CHECKPOINT 2026-09-09T06:10Z -->
# Captain checkpoint — 198/346; the count went DOWN by one, on purpose

Only the changed facts. Every earlier block below stays true of the moment it
describes.

**Census: 198/346 terminal, −1 since 05:20Z.** 178 COMPLETE_PACKET_PROVEN, 13
GUIDANCE_READY, 2 HANDOFF_READY, 5 OUT_OF_SCOPE. The single family that moved is
`de_mandatory_expungement-set`, GUIDANCE_READY → VERIFY_PENDING, and it moved
because factory check F24 surfaced that the dispatch has assigned it to VF01
since `83a08a8ad` while VF01's claim on it was released on 2026-09-07. Nobody has
ever read it. It was being counted as terminal on the strength of a verification
that never happened, and its `implementationStrategy` is
`participant_agency_application` — it owes an application, and a guide cannot
replace one. Reissuing the grant reclassified it honestly. VF01 is reading it
now and will say which state it actually belongs in.

## Landed this execution

| What | Evidence |
|---|---|
| PF14 return: 2 families built, all nine counters zero | `c231dd215` — `ia-12347-set`, `rcap-or-official-pdf-fill`; `mo-art-xiv-marijuana-set` stopped BLOCKED_SOURCE |
| Illinois five: 3 built from the recovery pool, all nine counters zero; 2 reproduced their committed bytes exactly | `28ed47694`, `b35b732e4` |
| The single-URL source acquisition path, which failed before every fetch | `b9b558573` — it passed neither `RCAP_ACQUISITION_RUN_ID` nor `RCAP_ARTIFACT_NAME`, both of which the acquire script requires inside Actions |
| Both New Mexico 4-222 candidates excluded by measurement | `df140b121`, `97d5b4ba9` |
| A source with no declared form number now resolves by its confirmed digest | `ab38d8d48` — 15 families were UNRESOLVABLE; 8 now bind |
| 73 stale generated records regenerated; Generator convergence green again | `de9126f7e` |
| The Delaware family handed back to the lane the dispatch names | `ee60956ef` — F24 green, 35/37 factory checks pass |

## The finding worth carrying forward

**Every one of the 380 nationwide recovery pool entries declares `formNumber:
null`**, because the pool was recovered as human-named files
(`LegalEase Missouri/Conf Case Filing Info Sheet(FI-05).pdf`) rather than under
the `STATE__FORM__NUMBER__slug` convention that 603 of the other 604 index
entries follow. `familySources`' form-number tier resolved a source by asking
which index entry carries that exact `formNumber` string, so **no pool-held
document could be resolved there at all** — the custody mounted specifically to
unblock these families was invisible to the gate that admits them.

PF14 hit it on one Missouri family and stopped the row BLOCKED_SOURCE with
FI-05's bytes mounted and byte-exact. Fifteen families were affected; two of
them are already COMPLETE_PACKET_PROVEN and would have failed their own row gate.

The repair does not trust MASTER_QUEUE's pin on its own — PF14 was right that a
hash in a generated queue is not a committed source identity. It uses the pin to
ask the committed index a better question: which entry holds these bytes. Two
Kansas families stay UNRESOLVABLE because no pin of theirs matches a committed
entry, and those two refusals are the proof the repair did not become a bypass.

## Rolling shortlist

| Item | Kind | Exact unmet requirement | Owner | State |
|---|---|---|---|---|
| Illinois five | independent verification | the delivered bytes have never been read; Section 12 unanswered while Section 13 is populated | VF13 | running |
| `de_mandatory_expungement-set` | independent verification | never verified by anyone; owes an application, not a guide | VF01 | running |
| Alabama six | build | shared host repaired by FIX09, never rebuilt; all six now bind | unassigned | ready to dispatch |
| Remaining buildable families | build | 30 measured `EVERY_BOUND_SOURCE_IS_A_HELD_PDF`, several now dispatchable that were not | unassigned | ready to dispatch |
| 14 `SOURCE_IDENTITY_UNRESOLVED` families | source acquisition | every source `label_does_not_identify_a_document`; all carry `commissionAcquisition: true` | unassigned | acquisition owed |
| `nm_conviction-set`, `nm_identity_theft-set`, `nm_release_without_conviction-set` | source | both published 4-222 candidates excluded by measurement | **Roger** | decision owed |
| F32, F34 | factory checks | three verification grants held by a reader whose run I will not cancel to make a check green | Captain | held, not weakened |

## PRODUCTION

Untouched. `commercialRoutesOpened: 0`, `productionTouched: false`. No live
migration, no secret, no host, no deploy.

## USER-ONLY — decisions and access only Roger holds

1. **New Mexico 4-222.** Both published candidates are now excluded by
   measurement: the self-representation site serves the held Sixth-District copy
   byte-for-byte (`809c66a7…`, run 34315889273), and the NMRA publisher returns a
   soft-404 at the pattern its ten sibling Rule 4 forms use (run 34316000746). No
   statewide copy with a blank district line has been located and it may not
   exist. If New Mexico publishes this form only per district, the three families
   need a decision that is not an acquisition — a per-district source set, or the
   caption treated as a participant-completed field.
2. **`/dev/null` in this container** is a regular file, not a character device. I
   broke it with a stray `ln -sfn` and the permission classifier blocks `mknod`,
   so I cannot restore it. Shell redirects work; reads from it do not behave like
   a null device. A fresh container clears it.
3. Push access to `legalease-source-artifacts`, so the verified 228 MB archive
   can be published as a release asset.
4. Phase 50 `CREATE OR REPLACE TRIGGER` authorization.
5. The seven `missingRequiredEnvironment` staging values.
6. A persistent production worker host.
7. The component-authority decision (207 families would gain a component).
8. A BMC issuer confirmation for `ma-bmc-multi-set`.
9. The New Jersey intake gap — three facts no question collects.
10. The 70 pool manifest files still absent, and the 11 SRC05 files still owed.

<!-- CLAUDE CAPTAIN CHECKPOINT 2026-09-09T05:20Z -->
# Captain checkpoint — 199/346; the recovery pool landed and the blocked backlog moved

Only the changed facts. Every earlier block below stays true of the moment it
describes.

**Heads.** Captain local and remote = `1d4b3f384`.

**Census: 199/346 terminal.** 178 COMPLETE_PACKET_PROVEN, 14 GUIDANCE_READY, 2
HANDOFF_READY, 5 OUT_OF_SCOPE. Nonterminal: 73 SOURCE_READY, 36
FAIL_REPAIR_REQUIRED, 18 PRODUCT_PATH_PENDING, 13 LEGAL_BLOCKED, 6
SOURCE_BLOCKED, 1 WRONG_DELIVERY_TYPE.

Closed since the last checkpoint: `vt_exp_decriminalized-set` and
`nj_arrest_no_conviction-set` (`51c934b1a`), `ms-nonconv-set` (`83a08a8ad`),
`ut_pet_limitations-set` (`ed077003c`), `ri_deferred_sentence-set`
(`ddc7ab28d`).

**THE NATIONWIDE RECOVERY POOL IS MOUNTED, AND IT MOVED THE WHOLE BACKLOG.**
The kit arrived as eight desktop chunks, each verified against its own
`chunk_sha256`, joined to the exact original (228,260,257 bytes, `db8a02db…`)
and confirmed three ways — the join's combined digest, the UNCHANGED toolkit
script taking its already-exists path and exiting 0, and a separate sha256sum
plus `zipfile.testzip()` across 879 members. The kit's own reconstructor refuses
the complete corpus (`RECOVERY_REFUSED: 513/583, missing 70, wrong-size 0`) and
is right to; `stage-nationwide-recovery-pool.mjs` staged the partial pool: 513
verified, 0 rejected, 51 jurisdictions. The receipt it wrote differs from the
2026-09-02 one only in timestamps and kit root — a kit transported by an
entirely different route staged to the same files at the same digests.

What it bought, measured before and after: the row gate binds 43 SOURCE_READY
families where it bound 32; **42 have every bound source held as a real PDF
where 25 did**; and of the 42 FAIL/SOURCE_BLOCKED families, **36 now bind**,
including the Alabama six, the Illinois nine and the New Mexico three, none of
which could bind in this container before.

**The stager refused once first, and was right to.** `private/source-imports`
was a symlink in the Captain worktree, so `git check-ignore` could not walk
under it and the guard will not write a source body where it cannot prove git
ignores the path. Restructuring into a real directory of per-custody symlinks
satisfied it honestly. The same symlink/ignore interaction has now bitten three
lanes; every lane prompt says to build `private/` as a real directory.

**Two counters that could not fail are still fixed** (route election `d89411ea2`,
receipt/coverage reconciliation `508723c5b`), and two more silent failures were
found and fixed this shift:

- **`generate-product-wiring.mjs` was exiting on the first thrown assertion**, so
  no family's wiring regenerated and 128 records sat frozen. It reports refusals
  and continues now (`ee6a9fc79`); six families still refuse, five of them
  expecting boundary.pdf in a receipt the gate never renders.
- **The URL promotion generator was scraping a host policy that had moved.**
  Three regexes over another script's characters, all returning empty, so
  `hostAllowed` answered false for every host on earth — `www.txcourts.gov`
  included — and it refused 210 of 242 URLs while reporting itself green. It
  imports `scripts/lib/official-host-policy.mjs` now (`4cbf14d4f`): 0 → 202
  corroborated candidates. The empty `REFUSED_HOSTS` was the sharper half; that
  gate was safe only by accident.

**The corpus index claimed the Master Library held fourteen binaries it never
had** — Drive fetches by an ephemeral Codex worker,
`sourceBodiesStagedOrCommitted: false` — and because that custody IS mounted,
the sampled integrity check resolved them, found them absent, and **refused
every packet build in this container**. Reattributed at `e53228f02` with six
tests. Three of the fourteen turn out to be in the repository under
`reference/`; eleven are owed.

**ROLLING SHORTLIST.** Seven lanes are executing. One writer per shared file;
the Captain is the only integrator.

| family / group | unmet requirement | input available | owner | next action |
|---|---|---|---|---|
| Illinois five (il-exp-nonconv, il-cannabis-vacate, il-exp-qualprob, il-seal-2yr, il-seal-3yr) | five repaired builders that have never been executed | pool mounted; all five bind | FIX04/03/07/08/01 | running: first execution, two runs each, nine counters, raster |
| PF03/PF23 six | build | five buildable, ia-12346 stops on a Drive-receipt-only source | PF03, PF23 | running |
| New Hampshire three + PF12 | build | all three bind and are held PDFs | PF11, PF12 | running |
| PF14 four, PF20 two | build | mo-art-xiv stops on FI-05 | PF14, PF20 | running |
| RI District two | FEE_AND_WAIVER: do the records now say what the page says | eight surviving copies scoped at `d4984cbc5` | VF04, VF05 | running reread |
| ca-17b, co_petition_seal_arrest, WV vacatur | repaired bytes nobody has read | bytes moved after the failing verdict | VF05, VF01, VF03 | running reread |
| Alabama six | shared host repaired by FIX09, never rebuilt | now bind through the pool | FIX09 lineage | dispatch when a worktree frees |
| 28 buildable, undispatched | build | every bound source is a held PDF | unassigned | dispatch as capacity frees |

**PRODUCTION.** Image published AND accepted; `releaseTruth.imageAccepted` true.
Nothing deployed, no RLS migration, no production worker updated. Blocked on
Roger alone: phase 50 `CREATE OR REPLACE TRIGGER` authorization, the seven
unpopulated staging values, a persistent worker host.

**USER-ONLY, held for Roger's return.** Push access to
`legalease-source-artifacts` (the token reads it, `push: false`, so the verified
228 MB archive cannot be published as a release asset); the component-authority
decision (manifest vs census, 207 families would gain a component); a BMC issuer
confirmation for `ma-bmc-multi-set`; the New Jersey intake gap (three facts no
question on any track collects); and the 70 manifest files still absent from the
pool.

<!-- CLAUDE CAPTAIN CHECKPOINT 2026-09-09T01:25Z -->
# Captain checkpoint — 196/346; two counters that could not fail, both now can

Only the changed facts. The 01:00Z block below is the previous checkpoint and
stays true of the moment it describes.

**Heads.** Captain local and remote = `0cc3c9b5c`.

**Census: 196/346 terminal.** 175 COMPLETE_PACKET_PROVEN, 14 GUIDANCE_READY, 2
HANDOFF_READY, 5 OUT_OF_SCOPE. Nonterminal: 73 SOURCE_READY, 34
FAIL_REPAIR_REQUIRED, 18 PRODUCT_PATH_PENDING, 13 LEGAL_BLOCKED, 6
SOURCE_BLOCKED, 5 VERIFY_PENDING, 1 WRONG_DELIVERY_TYPE.

**Rhode Island four: repaired, rastered, awaiting a reader.** FIX120 closed
RI-B-01/02/03/04/05; run 34297296663 rendered all four green with the canary in
the same run; they are VERIFY_PENDING under VF02-VF05. Two remain
BLOCKED_SOURCE on RI-B-07 (the District filing charge) and the felony family
carries RI-B-06 open (the Superior-55 "single misdemeanor" oath). **Both are
disclosed, not answered, and the reader's job includes ruling on whether the
disclosure is truthful.** ri.gov is 403 through the proxy, so every statutory
reading in that repair is labelled relayed-from-review, not fetched.

**New Jersey three: the row was the defect, not the election.** FIX121
established, four ways, that item (d) is one sworn sentence with nine blanks of
which the platform holds three — and that three of the six missing are collected
by NO QUESTION on any track: the final sentence imposed, the incarceration term
(the pinned binary's dropdown offers no "none"), and the DATE fines were paid,
which intake asks whether but never when. So the election is correctly withheld;
the lane printed no mark and reported requiredOptionsMissing 1 rather than curing
it. Two are BLOCKED_LEGAL_INPUT, one PARTIAL with COMPONENT_SET repaired. **The
executable next step is new intake questions, not a packet change.**

**MISSISSIPPI IS ON ITS FOURTH READER AND THE CHAIN IS CONVERGING, NOT
LOOPING.** VF04 found stale records; VF12 found one receipt block overclaiming;
VF13 found the SAME receipt uncorrected in the queue's own copy, while the
corrected block cited that queue row as drift-proof. Each repair is smaller than
the last. The Captain's "no other family carries this shape" after VF12 was
WRONG, and wrong because the scan walked family directories and never opened the
queue: 141 live rows and 22 historical ones carried it. **Lesson: when a record
is duplicated, enumerate every copy before claiming the shape is unique.**

**Second counter that could not fail, now fixed** (the first was the route
election, at `d89411ea2`). A carried rasterReceipt is now reconciled against the
row's own measured coverage on every generation, live and historical, at
`508723c5b`. TWO FIELDS ANSWER TWO DIFFERENT QUESTIONS and merging them costs a
family: `documentsNotCovered` means a CANONICAL document the gate was asked for
and did not render — evaluateAcceptance fails a row outright on a non-empty list
— while `whatThisGateDidNotRender` means a declared fixture it never renders by
design, normally boundary.pdf. The first version merged them and demoted
de_mandatory_expungement-set out of GUIDANCE_READY for having an ordinary
boundary fixture; separated at `1e95f1f06`, caught by diffing the census against
the previous commit. `coversTheWholeFamily` was re-derived rather than deleted
because generate-rcap-grade-a-fulfillment-authority.mjs requires it true. The
ingest tool is fixed at source: it read `coverage.edge.notRenderedByThisGate`
while coverageOf spreads `edge` flat, so that path was always undefined.

**PRODUCTION: a new image is owed and the reason is mechanical.** Three
worker-packaged inputs have changed since the accepted source `c065d248` — the
packet-set manifests, and the fulfillment authority registry and observation
snapshot that generator itself writes. So `rebuildRequired` is true, the record
correctly dropped ms-nonconv-set's provider.imageDigest, and the accepted digest
must not be restamped. Publish run 34298919203 is building from `1e95f1f06`.
**Dispatch the publish with `ref: claude/legalease-sprint-captain-utucnw`, NOT
`main`:** the copy of the workflow on main sets RELEASE_INTEGRATION_BRANCH to
`claude/rcap-48h-launch-integration` and refuses a Captain-branch SHA outright
(run 34298649365). Note the self-reference: the authority registry is both a
worker-packaged input and this generator's own output, so every regeneration
makes a rebuild required. That is worth solving and is not solved here.

**F1 staging is now 15 of 16 by construction.** `route_scoped_refuses_outsiders`
required the in-scope identity to reach 402, but requireCurrentPacketVerification
sits between admission and payment and the stack has never seeded a verification
— so 402 was unreachable from the day the case was written and it was failing for
a reason unrelated to scoping. It now asserts admission itself
(`scripts/f1-scope-admission.mjs`, eight regression tests); a scope that refuses
still fails. Seeding a real verification so the strict 402 returns would prove
more and is not done. **Phase 50 is the one case still needing Roger:** it uses
plain `CREATE TRIGGER` over five triggers an earlier migration already creates,
and it is a hash-gated authorized migration bound to an authorizationId.

**Lane minting, two rules learned the hard way.** `--grant` is refused for a
released grant; use `--transfer` or `--reissue`, which keep the release reason.
And an independent-verification claim must go to THE LANE THE DISPATCH ALREADY
NAMES — the Rhode Island four went back to VF02-VF05 individually rather than
onto one new lane id, because a claim on an undispatched lane is unassertable and
makes `generate` refuse.

<!-- CLAUDE CAPTAIN CHECKPOINT 2026-09-09T01:00Z -->
# Captain checkpoint — 196/346 published; the completeness counter can now see a missing route election

Only the changed facts are here. The 00:15Z block below is the previous
checkpoint and remains true of the moment it describes; everything under it is
the earlier record.

**Heads.** Captain local and remote `claude/legalease-sprint-captain-utucnw` =
`ea720b40f`.

**Census: 196/346 terminal, +2 since the last checkpoint.** 175
COMPLETE_PACKET_PROVEN, 14 GUIDANCE_READY, 2 HANDOFF_READY, 5 OUT_OF_SCOPE.
Nonterminal: 73 SOURCE_READY, 38 FAIL_REPAIR_REQUIRED, 18 PRODUCT_PATH_PENDING,
13 LEGAL_BLOCKED, 6 SOURCE_BLOCKED, 1 VERIFY_PENDING, 1 WRONG_DELIVERY_TYPE.
BUILT_RASTER_PENDING is empty.

**Published: `vt_exp_decriminalized-set` and `nj_arrest_no_conviction-set`,** at
`51c934b1a`. The `generate` refusal described in the previous checkpoint cleared
by itself the moment VF11's return was integrated, exactly as predicted; no
manifest was hand-edited.

**The blocker the previous checkpoint did not know about, now fixed.**
`requiredOptionsMissing` could not fail a packet for a missing route election,
and never could. `readFieldRows` sends every documents-and-decisions row whose
decision is not literally `refuse` into `writes`, and that counter is raised only
from the blank classifier — so a row declaring `measured_route_selection` counted
as an election already made. All six families that declare one measured zero,
including three New Jersey families a reader had failed by hand for delivering no
election at all. Fixed at `d89411ea2` with six regression tests
(`scripts/rcap-packet-completeness/verify-route-election-is-made.test.mjs`).

The rule is at the ROUTE level, not the fixture level, and the first attempt got
that wrong: a fixture whose row is broken withholds its mark on purpose and
records the withholding, which is FIX105 working as designed, and failing it per
fixture wrongly flagged `nj_arrest_no_conviction-set`. What fails is a route that
withholds on every fixture it can build. Measured across all 252 auditable
families: 249 PASS_COMPLETE becomes 246, and the three that move are exactly the
three the reader failed by hand. **Still open and measured but unaddressed:**
`candidate_write`, 305 rows across 15 families, lands in `writes` by the same
rule; whether each was actually written is a question for the finalizer's output,
not the map.

**Whole-file pin drift bit again, on a different record.** This census was the
first to run since FIX96 edited `legal-design-packet-set-manifests.json`, and
five receipts pinning that file by whole-file SHA-256 lapsed —
`ar-nonconviction-seal-set`, the three North Carolina families and
`ak-mistaken-identity-set`. FIX96 changed exactly one packet set,
`co_motion_seal_conviction-set`, which none of the five anchors. Each anchored
entry was recovered from the blob carrying its previous pin and compared
object-for-object against disk before any pin moved. The tool is
`scratchpad/refresh-manifest-pins.mjs`; it refuses a receipt whose own entry
moved. **Expect this class again on any whole-file-pinned record: check the
anchors, never refresh on trust.**

**Active writers, three.** FIX120 (Rhode Island four, one shared host
`build-census-v1-ri_decriminalized-set.mjs`, base `f78191545`); FIX121 (New
Jersey three, base `ea720b40f`); VF13 (Mississippi re-read, base `ea720b40f`).
FIX95, FIX96, FIX101, FIX105, PF16, VF10, VF11 and VF12 have returned and are
integrated.

**Mississippi is on its third reader and that is correct, not a loop.** VF04
failed ARTIFACTS on stale records; the Captain repaired them at `3980df4d0`; VF12
carried thirteen of fourteen on proven byte identity and failed ARTIFACTS again
on one thing — the acceptance receipt claimed to cover the whole family while
naming only `canonical.pdf` and binding the boundary digest. Corrected at
`8bb1b82f0` from the RASTER_QUEUE row's own words. Every other family was scanned
for that overclaim shape; there are none. VF13 reads it now. **The rule this
chain demonstrates: a reader may not read the repair of its own finding, so each
Captain repair costs a new reader — keep the repairs small enough that it
converges.**

**Lane minting: `--grant` is refused for a released grant.** Use `--transfer
<FROM> <TO> <subject> --reason`, which keeps the release reason in the ledger
instead of erasing it. FIX120, FIX121 and VF13 were all minted that way.

**Production, unchanged since the last checkpoint and still the two same asks.**
The worker image published from `c065d248` is accepted (run 34289593168) and
fulfillment authority reads `published_input_equivalent`. F1 ephemeral staging
passes 14 of 16. The two failures both still need Roger: phase 50 uses plain
`CREATE TRIGGER` over five triggers an earlier migration already creates, and it
is an authorized hash-gated migration bound to an authorizationId, so the
`CREATE OR REPLACE TRIGGER` fix cannot be applied without his word; and
`route_scoped_refuses_outsiders` admits no one because an in-scope authenticated
identity is stopped at the payment gate rather than the delivery gate.

<!-- CLAUDE CAPTAIN CHECKPOINT 2026-09-09T00:15Z -->
# Captain checkpoint — 194/346 published; release track advanced, count not yet moved

Only the changed facts are here. Everything below this block is the earlier
record and remains true of the moment it describes.

**Heads.** Captain local and remote `claude/legalease-sprint-captain-utucnw` =
`c209a30b9`. PR #224 was merged into Captain at
`c065d2485b97be9a9c53313551226b0b6c3c9cfb`; do not attempt that merge again.

**Census: 194/346 terminal, 152 remaining, unchanged since takeover.** 173
COMPLETE_PACKET_PROVEN, 14 GUIDANCE_READY, 2 HANDOFF_READY, 5 OUT_OF_SCOPE.
Nonterminal: 73 SOURCE_READY, 35 FAIL_REPAIR_REQUIRED (was 41), 18
PRODUCT_PATH_PENDING, 13 LEGAL_BLOCKED, 6 SOURCE_BLOCKED, 5
BUILT_RASTER_PENDING, 1 VERIFY_PENDING, 1 WRONG_DELIVERY_TYPE.

**One derivation is deliberately withheld and it is the reason the count has not
moved.** `generate` refuses and writes nothing while the dispatch manifest
assigns a family to one verification lane and the live claim belongs to another.
It currently names VF07/nj_indictable_conviction-set and VF08/nj_ordinance-set
against VF11. This is correct and self-resolving: integrating VF11's return
consumes those families and the dispatch regenerates. Vermont's independent PASS
is already committed and waits in that same derivation. Do NOT hand-edit
ACTIVE_ASSIGNMENTS to clear it. Lesson for the next transfer: reissue an
independent-verification claim to the lane the dispatch already names, rather
than to a new lane id.

**Closures owed, by gate.** vt_exp_decriminalized-set has its PASS
(VF10, `f8d62fbbb`) and needs only the derivation. The four New Jersey families
are BUILT_RASTER_PENDING with RASTER_PASS receipts ingested from central run
34292115043 and are under independent read by VF11 now.
pa_pardon_expungement-set is BUILT_RASTER_PENDING only because its three
repaired obligations are not yet consumed; its receipt already binds the bytes
on disk (`fc67ec72e845`, run 33844904078) and no new raster is owed.

**Active writers.** Two: FIX95 (New Mexico three, `/home/user/fix95-worktree`,
58 dirty files, no commits, running about an hour) and VF11 (New Jersey four
reads, `/home/user/vf11-worktree`, base `df524f2fd`). FIX96, FIX101, FIX105,
PF16 and VF10 have returned and are integrated; the vf10 worktree was removed
after confirming it clean and pushed.

**Kentucky scoped correction: INSTALLED** at `2940142d0`. Three copies of the
stop "Any case where the underlying offence falls outside KRS 431.073(1)(a) and
(1)(d), so that the pardon is the only route." removed — two registry entries
and the originating memo stop. 503 tracks, 502 unrelated byte-identical, which
matches the supplied executedchecks.json exactly. The package's patch file never
reached this container; the change was applied from current preimages against
the described scope and that provenance is recorded on the track under
scopedCorrections. Do not reapply it and do not look for the zip again.

**Production, separately.** Image PUBLISHED and ACCEPTED. Source
`c065d2485b97be9a9c53313551226b0b6c3c9cfb`, digest
`sha256:a2fe1ac9e3e3f5f07e1be60d1494d023f17b452298da6a4859daa8af9bf6d802`,
publication run 34265052706, acceptance run 34289593168 SUCCESS. Fulfillment
authority now reads `published_input_equivalent`; the readiness audit is 14/14
with 0 blocked. The old `b680a4e4`/`bf4589d3` image is superseded in the chain
with its failure recorded — do not restamp it. Deployment: NOT deployed, NOT
verified.

**The one thing blocking the end-to-end rehearsal, and it needs Roger.** F1
ephemeral now passes the baseline, matches all seven migration hashes and
applies phase 49, then fails: `supabase/phase-50-rcap-packet-delivery-hardening.sql`
line 421 errors with `trigger "guard_packet_render_job_transition" for relation
"packet_render_jobs" already exists`. Cause established, not guessed:
`supabase/migrations/20260818205000_rcap_upgrade_05_triggers.sql`, the
forward-only Production schema upgrade, already creates all five `guard_packet_*`
triggers, and phase 50 uses plain `CREATE TRIGGER`. Phase 49 survives only
because every statement in it is `IF NOT EXISTS`. The fix is one line per
trigger, `CREATE OR REPLACE TRIGGER` (PostgreSQL 17 supports it), then
regenerating the staging action so the recorded hashes match. It is NOT done:
phase 50 is an authorized, hash-gated migration bound to an authorizationId, so
it is not rewritten without Roger's word. Asked once; awaiting.

**Two F1 harness defects found and fixed** (neither weakened a check): the
pre-49 ordering sentinel asserted the absence of `packet_render_jobs`, which the
baseline migrations create, so it could never pass — it now asserts
`rcap_partner_packet_allocation` and `rcap_packet_credit_consumptions`, created
by phase 49 and by nothing in supabase/migrations; and the sandbox partner seed
supplied one of the four columns `partner_records` requires. Latest run 34293728568
at `4b3b86e9f`, in progress at this checkpoint.

**Also fixed:** the scratchpad registry-pin refresher mis-parsed field-scoped
anchors (`track-registry:<track>:<field>`) and refused receipts whose bound
content had not moved. It now compares the named field, which is stricter than
comparing the whole track. Sixteen Virginia receipts anchoring a different
recordId shape are still refused rather than guessed at.

**Committed diagnostics.** `data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json`
measures, per bound source, whether SOURCE_READY families can actually be built:
6 have every bound source held as a PDF, 16 carry a held-but-unusable source
(four Montana families on .docx, twelve on locator strings), 51 are
NOT_MEASURABLE_HERE because their custody is not mounted in this container. It
changes no state and adds no gate. Two earlier passes of that sweep were wrong
and are not what is committed.

**Exact next command.** When VF11 returns: cherry-pick its rows, release its four
grants, then run the seven generators in order (extract-verifier-returns,
generate-product-wiring, generate, generate-raster-queue, generate-source-conveyor,
generate-washington-repair, generate-source-relationship-registry) with
MASTER_LIBRARY_SOURCE_DIR exported, and read the census. That derivation is what
publishes Vermont and any New Jersey passes.

<!-- END CLAUDE CAPTAIN CHECKPOINT 2026-09-09T00:15Z -->

<!-- CLAUDE CAPTAIN HANDOFF 2026-09-08 -->
# Captain handoff to Claude — writes released after this checkpoint publication

The user transferred Captain ownership to Claude in this same Codespace. Stop
Astra scheduling and shared writes. No new batch, merge, dispatch or production
operation was started for this handoff. The atomic194 publication finished safely.
All local mutation tests completed and restored their files; no local build/test
process is active. Both available workers are idle/frozen with no file claims.

Exact recovery heads captured immediately before this handoff-only commit:
- Local `chatgpt/launch-recovery-20260906`: `040de46a6d228c951eeff6dd26c0c3bb19693a5a`.
- Verified remote recovery: `040de46a6d228c951eeff6dd26c0c3bb19693a5a`.
- Remote Captain/base of PR224: `ee4021b473018a469fea7a9a5325b41d1abff041`.
- Local-only commits: none. Tracked/index changes before this document: none.
- This document is the only staged handoff change. Its publication commit is the
  document-only successor to040de46a; obtain its exact SHA with
  `git log -1 --format=%H -- docs/rcap/grade-a/chat-parallel-2026-09-07/chat1-integration/ADMISSION_AND_DELIVERY.md`.
  Post-push local/remote verification is retained in
  `inputs/session10-machine-change-preservation/claude-handoff-publication.json`.

Verified published census: **194/346 terminal;152 remaining**. The exact members
are in committed MASTER_QUEUE.json and
`session10/resume-va-admission-validation/membership-proof.json`. Counts are
173 COMPLETE_PACKET_PROVEN,14 GUIDANCE_READY,2 HANDOFF_READY,5 OUT_OF_SCOPE.
This continuation added exactly Nevada, Maryland cannabis, Maryland conviction
and Virginia absolute pardon to the resumed190. Every prior terminal member and
treatment is preserved. PR224's actual Captain baseline is176; its net gain is18
(13 complete packets,5 guidance treatments), with no removed/reclassified prior
terminal member. Do not recount earlier KY/MD favorable/GA/MI/MO/Iowa/WA/CT work.

Completed publications and receipt custody:
- Cannabis192: `5f7e0c149bd791df23d45ba71b628588b978d729`;
  central34257872586/job102169318466,18PDF/133pages;18 receipt refusal controls.
- Conviction193: `ddec497deac0f2db8023810b7f053ff378489311`;
  central34257213865/job102167248554,25PDF/170pages;18 receipt refusal controls.
- Virginia194: `040de46a6d228c951eeff6dd26c0c3bb19693a5a`;
  existing central33574304514/job100075268196 reused for1PDF/5pages under the
  unchanged canonical-delivery contract. Original independent2PDF/10page review
  remains separately attributed; no boundary central pass is invented.
Both Maryland runs and wrappers completed successfully; never redispatch them.
All ten committed checks passed on final derived candidate
`bfa17e10cae0af701613e36b8d2d4d0fd0102aac`. The local91-mutation result at75ccb047
and subsequent hosted runs are reused evidence, not a newly rerun local suite.

Nonconflicting remote jobs at the handoff observation:
- Source Conveyor34262980366/job102185285978: IN_PROGRESS.
- Onboarding34262980308/job102185286634: IN_PROGRESS.
- Factory audit34262980280/job102185305228: IN_PROGRESS. Let its mutations finish
  and restore their runner files; do not cancel it for the handoff.
- Nevada34262980772/job102185287516: SUCCESS.
- Recovery wrapper34262972040: verify_repairs102185259099 and
  central_raster102186122871 both SUCCESS. This receipt-only publication should
  request no new family; inspect its existing log if needed, never force YAML.
- Old-image acceptance34262980303/job102185286441: FAILURE.
These runs name exact source040de46a; later document-only checkpoint events do not
make them evidence of new implementation. Job metadata and capture time are in
`inputs/session10-machine-change-preservation/claude-handoff-local-state.json`.
No remote job was killed. These isolated CI runners do not claim shared local files.

Exact next executable command for Claude:

```sh
gh run view 34262980366 --json status,conclusion,jobs --jq '{status,conclusion,jobs:[.jobs[]|{name,status,conclusion}]}'
```

Then consume the actual onboarding/factory outcomes above, update the prepared
PR validation text, and follow the already reviewed existing integration/image
publication procedure below. PR224 remains OPEN and DRAFT; no metadata mutation,
merge, new image publication or deployment was performed. Preserve normal merge
ancestry into the existing Captain branch; do not squash away reviewed sources.

Prepared but unpublished, persistent worker output:
- `session10/resume-worker-publication-readiness/pr224-release-194-body.md`,
  SHA256f4ff3c3221b9fb4204c351e87ba7af6f6c99601ad535c5bfeae6c6885c4c22d0;
  corresponding `pr224-release-194-title.txt`,
  SHA256c4b44370507b7af010fd167bd1389a47c7e5636f20caaebbef45e64d7919bec3.
- In that same directory: `pr224-base-to-published-194-membership.json`,
  `pr224-published-194-release-review.json`,
  `pr224-published-194-release-review-manifest.json` (SHA256
  57d0e52db94d195803a8a0724507b792f68986cbb6e31f75641d5051b57d36e5).
  These five files are untracked and frozen. Historical23d/193 drafts/manifests
  and actual old-image failure logs are also retained untracked; do not overwrite.
- `session10/resume-va-admission-validation/publication-result.json` and the
  untracked commit/push logs under the completed family evidence directories.
- Unpublished bounded ND hold and exact MN transport-recheck evidence remain in
  the existing independent-review directories; they create no terminal gains.
No candidate implementation or required review input is stranded in a local-only
commit. The194 candidate, review inputs, receipts and census are already remote.

Untracked/ignored work is preserved, not disposable. Snapshot recorded426
untracked files, including older worker outputs. Exact non-input paths are in
`inputs/session10-machine-change-preservation/claude-handoff-local-state.json`
(SHA25629156db5f23ba13c1da0211a44ddb34f406e8028e977ac8e6f034d928b3515d1).
Only this handoff document is committed for the transfer; none of that other work
is staged. Persistent ZIPs include the verified Maryland artifacts in their
resume-md-*-central directories and Nevada's retained artifact. Unique earlier
/tmp work remains protected under ignored inputs/session10-machine-change-preservation/.
All new worker output in this continuation was written persistently in the repo;
no new indispensable sole copy was created in /tmp. The reusable scratch worktree
is clean atbfa17e10 and contains no unique uncommitted work. Other worktrees are
untouched and remain listed by git worktree list.

Workers/file claims:
- `/root/release_path_review` (Avicenna): final194 draft/proofs frozen; idle;
  no active process or claimed shared file; all writes stopped.
- `/root/session10_admission_review` (Aristotle): VA successor integrated; idle;
  ND/MN/Ohio findings retained; no active shared-file writer.
- Astra root: releases the recovery integrator, handoff and generated-state claims
  to Claude after this document-only push/verification. No replacement workers.
Existing editor/Codex processes were preserved. PID577127 is the VS Code extension
host (about3.2GiB RSS at observation), not a packet build; no process was killed.

Resources at18:28UTC: /workspaces remains32GiB total,29GiB used,1.7GiB free (95%);
/tmp has33GiB free. RAM7.8GiB total,1.2GiB available, no swap. The reported128GB
upgrade is still not reflected in this running filesystem. No heavy new task,
reinstall, second dependency tree, cleanup or machine operation was started.

Production remains undeployed/unverified. Source lint's16 errors are repaired,
and the current122-file runtime manifest passes. The retained worker image source
b680a4e4.../digestbf4589d... still fails startup (missing runtime data; exit1 rather
than required2). Existing private image publication requires the exact source to
be contained in Captain/main and its Captain-ref registered workflow. Local
Actions-write capability previously returned403 and has NOT been retried this
continuation; do not invent a workflow backdoor or clear old image evidence.
After a real new image publication, import its immutable artifact before updating
fingerprint/staging/image acceptance. Production activation still needs a coherent
current app/image/smoke tuple. A persistent production worker host/service remains
unnamed; the question is pending with the user. No new generic deployment permission
is needed for the authorized mission; live migration/secret scopes remain separate.

CAPTAIN WRITES RELEASED TO CLAUDE after the handoff publication verification.
<!-- END CLAUDE CAPTAIN HANDOFF 2026-09-08 -->

<!-- SESSION10 LIVE PUBLICATION STAMP -->
# Session10 — 194/346 terminal; closing batch complete, release integration next

Validated committed candidate: `bfa17e10cae0af701613e36b8d2d4d0fd0102aac`.
Virginia review input: `10af26757da754dac4c8800abc024759deec2971`.
Recovery remote immediately before this publication: `ddec497deac0f2db8023810b7f053ff378489311`.
This checkpoint publishes194 terminal/152 remaining:173 COMPLETE_PACKET_PROVEN,
14 GUIDANCE_READY,2 HANDOFF_READY,5 OUT_OF_SCOPE. Gain from resumed190 is exactly
Nevada, Maryland cannabis, Maryland conviction and Virginia absolute pardon.
The latest delta is193→194, Virginia only; all193 prior members/treatments and
345 other states are preserved. All197 document inventories and raster receipts
are unchanged by this last review closure. Proof: session10/resume-va-admission-validation/.
All ten committed/convergence/targeted/current-runtime-manifest checks passed on
bfa17e10. Exact commands, elapsed times and logs are retained in committed-state/.
No packet, source or shared implementation byte changed for this VA closure.

Maryland cannabis192 was published/remote-verified at
5f7e0c149bd791df23d45ba71b628588b978d729. Central34257872586/job102169318466
passed exact packet23d057d432ea201e0c994cd5c495d35d2b463a91. Artifact10069785590,
42,652,275bytes,SHA2561e8aab7e32410ca019ca865afec04da3501244f5f56729cf8bfbe3114d9a1535,
proves18PDF/133pages. Thirteen prepared outputs/98pages and five diagnostics/35pages
remain separate; raw-PASS missing-contact is unprepared/unselectable.

Maryland conviction193 was published/remote-verified at
ddec497deac0f2db8023810b7f053ff378489311. Central34257213865/job102167248554
passed exact packet872e9abd754f87d1d67f669335d30d75db7bdb27. Artifact10069822940,
72,397,925bytes,SHA25646b43e2206629ffeab2dcd93274ad82e101fc4ddbcc1851107dbb9b68da93061,
proves25PDF/170pages. Twenty-three prepared outputs/155pages and two diagnostics/15pages
remain separate. Each family independently passed18 receipt refusal controls,
its own membership-preservation review and all ten committed-state checks.
Both ZIPs were downloaded directly once to their persistent central evidence dirs.
Central render times were1496seconds cannabis and1923seconds conviction. No earlier
successful family was rerendered. Their original semantic/visual attribution remains.

Virginia's new independent review is copied unchanged to the existing review root:
review/session10-va-absolute-pardon-static-independent-successor.json,
SHA2568172bb0eb98c62f9aae2fcc1f598e4986e15cb82e311f73e4529aee2b4900822.
It closes only the current static declaration/product-path disposition. The original
VF01 record,15 obligations and twoPDF/10page independent inspection are preserved.
A new read-only family audit measures7/17 fields written and nine zero counters.
Under the existing participant-canonical coverage contract, retained central
33574304514/job100075268196 covers onePDF/fivepages; boundary is hash-bound, not
centrally rendered. Do not call this a new ten-page central pass. Existing19-input
contract and family bridge match; runtime/projection findings remain separately open.
Only binding.lastIndependentVerification changed in the declared wiring.
No legal approval, runtime, sale, credit, sponsorship or production authority is created.

Nevada remains the separately published191 admission (2b432317...), reusing its exact
88-page central receipt and independent review. All190 checkpoint members stay intact.
Do not redispatch any completed central run. Normal recovery publication wrappers
should validate and select no newly pending family for these receipt-only changes.

Next exact command after verifying this checkpoint remote:

```sh
gh pr checks 224
```

Finalize the existing PR224 title/body against actual published194 and Captain base
176, preserving all prior176 terminal treatments. Wait for actual current source
checks, then integrate into claude/legalease-sprint-captain-utucnw with a normal
ancestry-preserving merge. Do not squash/rebase away reviewed source commits.
Use the existing registered publish-rcap-render-worker.yml workflow selected on
that exact Captain ref, with integration_sha set to the full integrated candidate
source SHA and empty tag replacement authorization. Current local Actions-write
capability is unproven after the earlier403; do not invent a dispatch backdoor.
Import the real new image artifact before fingerprint/staging/image acceptance.
Do not remove the old publication record or copy a stale accepted-image flag.

Production remains undeployed/unverified. All16 lint errors are repaired; actual
source onboarding/factory/conveyor/Nevada checks passed at prior exact checkpoints.
Current final publication checks must be read on their actual SHA. Old worker
b680a4e4/digestbf4589d fails current image acceptance34257569401: missing runtime
route-ratification-registry.json.ts, exit1 rather than required2. Source runtime
manifest now verifies122 files. Existing release instructions and latest failure
logs are under session10/resume-worker-publication-readiness/. Existing production
application activation must use refreshed current image/staged-smoke evidence;
it does not deploy a persistent worker. The worker host/service remains unnamed
and has been asked asynchronously. User's deployment task authorization is present;
separate live migration/secret-change scopes remain unchanged.

MN's original helper remains unavailable as a separately retrievable exact member;
ND/Ohio holds remain preserved. Do not replace missing source or relabel their status.
Root remains sole recovery integrator and generated-state writer. Current scratch
/tmp/rcap-session10-committed-candidate is clean atbfa17e10; reuse it. No heavy local
job remains. The current publication checks are remote; do not start replacement jobs.

Actual environment still reports32GiB workspace/approximately1.6GiB free,33GiB free
on /tmp and7.8GiB RAM despite the reported128GB upgrade. No machine/repository/
dependency/cleanup action was performed. Unique temporary work is protected under
ignored inputs/session10-machine-change-preservation/; current artifact ZIPs are
persistent. Captain session01a0812d-8cd6-7662-9365-b44f68b1923b remains under
/home/codespace/.codex/sessions/ and is not committed. Preserve all other dirty and
untracked worker output; commit only explicit reviewed paths.
<!-- END SESSION10 LIVE PUBLICATION STAMP -->

<!-- SESSION10 RESUME CHECKPOINT -->
# Session10 continuation — published190/346

The 190-family proof and Nevada CI evidence were published and remote-verified at
`be2c98668c5ee8326c74a7ec00d2ccef5e2116a3`. The subsequent CT provisional receipt
input commit is `8572b955a88713adbe2da674bbc95e85b9bd3adb`; its source changes are
limited to the existing two-fixture importer's filename handling and the actual
completed receipt. Thirteen generation/convergence checks passed in the existing
scratch checkout. The derived checkpoint changes no family state: 190/346 remains.
Exact derived candidate `b48e5292272acd13bafad7cc9c6296b475f7b420` also passed all
eight committed-state checks, with a clean scratch checkout and no regeneration.
The following publication checkpoint adds only these retained check results and
this handoff; candidate inputs remain byte-identical to that tested commit.
Resolve the final publication SHA with `git rev-parse HEAD` and
`git ls-remote origin refs/heads/chatgpt/launch-recovery-20260906`.

Census190 publication, local and remote verified at that step:
`6555324611a4a148ec1a46d6367521728378f077`, branch
`chatgpt/launch-recovery-20260906`, PR224 (draft, base Captain integration branch).
Terminal190/346 =169 COMPLETE_PACKET_PROVEN +14 GUIDANCE_READY +2 HANDOFF_READY
+5 OUT_OF_SCOPE. This is +11 over recovered remote
`9f35db281d8de2664498a7f1d849976c31b925f1` (179), with every original terminal
member and treatment preserved. Exact comparison:session10/resume-terminal-membership-190.json.
Runtime activation and production deployment were not performed.

The requested six-family batch is CLOSED. Packet candidate
`774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90`; authorized recovery wrapper34232672469
and central34232991361 both succeeded. All six actual family jobs passed:
KY13PDF/90pages, MD15/60, GA15/108, MIapplication8/36, MIOWI6/24, MO13/108.
All six are COMPLETE_PACKET_PROVEN. Original evidence, API metadata, ZIP digests,
verdicts and page identities remain in session10/resume-central-34232991361/.
The six batch raised frozen180 to186, published at3733121f95ee176ef90de4819980c59227de8cfe.
The earlier Washington court-initiated juvenile guidance made179→180 and was
published with the coherent candidate; it never discharges the participant-motion
obligation. GA's exact15-document contract is retained:12 conditional examples,
3 diagnostics; diagnostics cannot select as filing-positive. No two-document
receipt is represented as108-page coverage. All75 required PDF pins across the
six families and Iowa were rehashed again before190 publication.

Additional individually published closures:
- CT absolute-pardon static preparation guidance187 at3545b78c8f143fed28dce66ea8e73c98399517a3.
- CT destruction static guidance188 at636bc29cd0d288f1fbff0c87b4e2a25090db4cb2.
- CT provisional static guidance189 ata6cadb0bf023a77ca8216f151b14c3a4dfac5adf.
- Iowa190 at6555324611a4a148ec1a46d6367521728378f077, COMPLETE_PACKET_PROVEN.

Iowa's immutable packet commit iscbfc18b1b79c98eac87412fad0aefa882ae660d1.
Recovery wrapper34240163544 passed all preflight checks and dispatched existing
central34240482971, which completed SUCCESS. Canary and plan passed; the sole
family job102110643799 succeeded. Artifact10062804200 SHA256
0d476fd60dc649eba2e2d1159c9a623865beef8514ad456c79edc832603840e1 covers all5PDF/26pages.
Consumer18 corruption controls passed and all other active/historical receipt rows
were preserved. Actual receipt and refreshed scoped declared wiring were committed
at4d854e6c639e9f083a79b1bc3854f05aa573ea67 before deriving190. Keep the two Iowa
diagnostics distinct from its three supported unexecuted drafts. Original65 payload
files,39 source/provenance inputs and original LIMITED_FINDING attribution remain.
Exact inventory:session10/resume-ia-required-document-inventory.json; full central
proof/logs/timings:session10/resume-ia-central/. Measured family browser setup816s;
actual render293s. No local dependency installation or candidate re-download.
Both central canaries exercised5 negative controls; optional installed headless-shell
render was not exercised. Do not claim6 exercised controls.

CT absolute has a new independent inspection of all4 current central page images.
Destruction closes exactly the old source-identity finding and explicitly reuses
its unchanged original visual review; its historical raster remains canonical-only.
Provisional has a new independent4-page current review and exact PDF/image linkage;
the older different-PDF central receipt was not reused. The three-row successor
preserves each earlier row exactly and has SHAb902fe2779f9c04e105afeb4845940c730275e38d74050aeaba26f6d9aa54f84.
All CT outcomes are static guidance, with no Board application, runtime or commercial
fulfillment grant. Original independent failures/attribution remain recorded.

The CT adapter binds a stable exact review-publication commit and independently
checks current committed bytes. F29 consumes only an exact fresh-custody static
closure with all current holds intact; a bare GUIDANCE_READY label is refused even
with a repair dispatch. Full88 factory mutations passed at426016ecd880b02556adc2aa295ea7d021da086a,
with every mutated scratch file restored; the final stricter verifier condition
passed27 independent installed-loop cases and46 adapter controls. Final verifier
SHA795d7af581e7224abd9ea5399f06874da2216cbb6004a7d3d1e6e8e525b8ffa2.
The original broad suite and final targeted controls have separate attribution.

All required committed-input generators/checks passed for each final admission.
The correct generator isgenerate-source-relationship-registry.mjs; its verifier
isverify-source-relationship-model.mjs. The earlier wrong command was a task error,
not the established CLI-exit cause. Each recorded second master derivation followed
an actual changed raster-queue reference; no unchanged generator loop. Declared
whole-output anchors, plural supersession controls and their independent review
remain. Final190 exact committed checks:session10/resume-ia-admission-validation/exact-final-candidate/.

Direct local workflow dispatch returned403 and accepted nothing. The existing
recovery wrapper now triggers on real queue changes and selects new immutable
inputs. It retains required preflight, serialized publication and prior-attempt
reconciliation; no new workflow system or criteria waiver. Successor wrappers
34240617659,34242632513 and34243199880 passed; unchanged inputs produce no new central
request. Final190 wrapper34243823722 completed SUCCESS; its actual log confirms no new
central request. A later final history read also found completed CT provisional
central `34243539560`, dispatched by wrapper `34243199880` at immutable
`a6cadb0bf023a77ca8216f151b14c3a4dfac5adf`. Its canary, plan and family job
`102120994648` all passed. Artifact `10063270695` SHA256
`3ab57219e873e44eb3c15256c745a6e941bbfc65c4788216eeafb2c1a23b794a` proves both
current PDFs and all four pages. It is distinct from the old canonical-only,
different-PDF CT receipt and from Iowa. That receipt is now consumed, with no
terminal gain and no semantic reapproval. All 194 unrelated queue rows and prior
receipts were preserved. The existing importer now matches the renderer's exact
safe filename rule while retaining the full logical family identity. Its 18
existing controls and 20 independent corruption refusals passed; six ZIP boundary
cases and unchanged safe-name behavior were independently checked. Evidence:
`session10/resume-ct-provisional-central/` and
`session10/resume-independent-admission-review/ct-provisional-central-final/`.
All three central runs are complete. Source/evidence integration
head65d48617dc60b2a745ba22d62fe05992323e8c26 now includes the reviewed receipt-only
NV correction. Its eight committed-state/factory/source checks all passed, without
regenerating unchanged outputs. The terminal census remains190. Actual Nevada
run `34245319137`, job `102125692217`, completed SUCCESS for recovery head
`b984e32e6b1fa073e4070fb18373f5d2ae434266`. The PR job checked its merge commit
`e7fa10d3945984481c6d44597ed00a1062e189e6`, recorded separately from the source head.
Artifact `10063779077` was downloaded directly to disk and its API digest matched
SHA256 `30ec461008075adf67a69cf68b32da6419ddcada64631fe3bf9433a505f8fac1`.
Both rebuilds, 30 regressions, completeness, 68 unchanged pixel pages, 20 repaired
page bounds and exact reviewed PDF pins passed. No semantic approval was granted.
Full immutable proof and step timings: `session10/resume-nv-receipt-validation/central-34245319137/`.
Both central admission runs and the Nevada validation are complete. The next
read-only check for remaining PR gates is:

```sh
gh pr checks 224
```

Remaining publication/runtime checks are separately truthful. PR224's preexisting
Nevada special-route completion and worker-image acceptance checks failed on older
9f35db/3733121 heads; the Nevada failure is now fixed and its actual CI is passing.
NV remains VERIFY_PENDING,
not a newly claimed terminal. The independent author prepared a bounded NV source-receipt refresh; root
independently rechecked all six complete bound tracks against both historical
sources, global metadata and exact original attribution. Only the stale whole-file
pin and its successor evidence changed; every other receipt field is identical.
Two complete scratch rebuilds match13/13 family files each. Controls30 NV +13
identity-preservation +7 scoped pass. No builder/shared helper or PDF changed. Full failure
logs/scope evidence:session10/resume-independent-admission-review/unrelated-pr-checks/.
Worker acceptance still consumes old imagebf4589d3432f396f08196b2a619e445b75f1b4e2d2a0c404fbb06c4017e61864,
sourceb680a4e4dd92e7422bc7030aa2189026929782a1, whose Dockerfile omitted required data.
Startup exits1 before expected unconfigured exit2. Current Dockerfile includes data,
but no new accepted image publication is claimed. Existing image publication and
release safeguards remain; do not manufacture a digest or bypass acceptance.
The onboarding workflow also has 16 fatal lint findings that were already present
at recovered head `9f35db`: 15 in the two Session08 delivery-review CJS scripts,
and one in `ConsumerSignInForm.tsx:42`. Independent comparison confirms that all
three files and the lint/workflow inputs are unchanged through `b984e32e`.
Their failures do not invalidate the exact successful central family jobs.
Successor onboarding run `34245319113`, job `102125692630`, also failed on exactly
those 16 findings. Typecheck, onboarding, launch-readiness and the production build
were skipped after lint; none is represented as a newly passing gate. The next
executable release repair is the three-file lint correction, preserving the two
review scripts' VM behavior and the sign-in retry behavior. Audit and original
logs: `session10/resume-independent-admission-review/unrelated-pr-checks/onboarding/`.

Minnesota's next shared monthly/annual income repair awaits exact missing native
scripts/rcap-packet-recovery/chat9/mn15218.mjs, SHA256
1e01a0cee8b4f6aa90e7ca69eb5ec82b1ed1d831f27860009d0ddc81a5a966f0.
It is absent from retained local paths/archives and PR235c1f8003220f93fb00c26d869dfe035c332ec8dd5;
recorded Git blob returns404. The referenced64,767,472-byte Drive tar.xz supports
no single-member/range access through the available connector. Do not re-download
that installed candidate. Exact findings and original transfer bytes are retained
in session10/resume-independent-ia-review/mn-unique-source-transport-audit/.
Unknown spouse income must remain unknown when that native source is available.

Only root writes shared admission/generator files. Reuse existing worker
/root/session10_admission_review, completed; reuse this worker for a concrete next item.
Retained scratch:/tmp/rcap-session10-committed-candidate, atb48e5292272acd13bafad7cc9c6296b475f7b420,
clean, dependencies reused by symlink. Keep original untracked worker output.
At the final evidence checkpoint, no candidate inputs or generated state are dirty;
only this handoff and explicitly listed receipt/log additions are owned by root.
There are no active central admission or Nevada jobs. Remaining routine PR checks
can be inspected with the command above; no new central dispatch is requested.
Original recovered full SHAs/process/path inventory remain inresume-recovery-state.json;
no interrupted commit was reset. Last disk1.7GB/workspaces,34GB/tmp. Unique code and
receipts remain persistent; only reproducible scratch uses/tmp. No main push,
production route/auth/RLS/payment/configuration change or deployment occurred.

Urgent disk checkpoint: the sequential audit found 1.7 GiB free both before and
after inspection, and only 23% inode use. Nothing was deleted: the apparently
temporary 230 MiB is tracked, manifest-referenced review material. Preserve the
13 GiB workspace footprint (including all worktrees), roughly 12 GiB of system
and home material, and 1.9 GiB of retained image storage. No sufficiently large
disposable cache was verified. A larger-storage machine has been requested to
restore at least 5 GiB free before heavy batches. The existing small publication
fits: its generated files total 7.8 MB and were already validated before the
pause. Downloads, packet builds, raster expansion, dependency installation and
large tests remain suspended. No Codespace restart, deletion, rebuild, worktree
cleanup, Git repacking or backup was performed. Disk finding:
`session10/resume-disk-recovery/recovery-result.json`.

The record below is historical.
<!-- END SESSION10 RESUME CHECKPOINT -->

# Chat 1: consume the reviews and correct declared delivery

This continuation reuses the existing recovery branch and existing #224. No
packet PDF, field map, instruction, builder, live route, auth/payment behavior,
production resource, main or Captain branch is changed.

## Implemented

The verifier extractor now reads the existing parallel review directories.
A complete chat pass requires the actual separate-review identity, fifteen
individually measured PASS obligations, the reviewer's nine measured zero
counters, and both current whole-PDF identities. Source-only audit schemas do
not issue passes. Bounded Rhode Island failures bind both current PDFs before
using the document's single declared packet snapshot; they do not manufacture
unmeasured obligations. Illinois's source audit is attached to the exact
original negative review, not substituted for it. An explicitly withdrawn
Alabama disposition is superseded by its final record; both originals remain.

Delaware's independent review remains Chat B's, not this integrator's. The new
admission check rehashes both guide PDFs, their map/write/blank/instruction and
receipt inputs, all nine composition sources and the already-admitted six-page
central receipt. The author's old whole-registry pin remains intact: comparison
to the exact pinned historical bytes shows all 73 previous entries unchanged,
with only the unrelated NC source-adoption entry and its evidence path appended.
Any edit of old source content, a same-family addition or other unexplained
change refuses. The only resulting terminal category is GUIDANCE_READY, never
an SBI application or court filing, and never runtime/payment/sponsor authority.

NC's declaration uses the existing component selector. It binds eight complete
selectable fixtures covering four actual fee/indigency/supplement selections,
plus the admitted ten-PDF/sixty-page receipt. The two all-components diagnostics
are excluded from filing selection. Unknown/conflicting selections refuse.
This does not repair the remaining authored clerk-certification instruction,
install runtime fulfillment, or attest eligibility or financial facts.

Florida's declared artifact binding is refreshed from current complete outputs
and its admitted raster. The completed phone repair is preserved. The newer
source, fee, instruction, name and placement failures remain active; no new
source edition or full-packet review is asserted here.

## Evidence and publication

`local-focused-test-results.json` records the actual isolated-runtime checks.
The full local census was deliberately not accepted: missing historical Git
objects affected unrelated verdict ordering. The existing Chat 1 workflow
therefore consumes this exact patch in a full-history GitHub checkout, imports
the pinned Chat B review commit, regenerates shared state, and executes all ten
existing normal/mutation suites as well as the focused controls. It refuses to
publish if the previous COMPLETE_PACKET_PROVEN set changes, if any unrelated
family changes state, or if any packet/source/runtime path changes.

`hosted-validation/results.json`, when published, is the controlling executed
result. A local diagnostic, submitted patch, workflow dispatch or code commit
alone is not a hosted pass or terminal increase. The temporary publisher is
replaced by read-only validation in the published tree.

## Worker handoffs retained

Alabama's final failure record is confirmed at review head
d219b7cda0b5e7a315e7a735fe3d09cebf69075c, blob
437d2c324390b30c5cbf47f1f5c43fa362cba749. Its unverified route-identity claims
are withdrawn; wrong SSN-last-four binding and boundary clipping remain.
Illinois's ATJ602.8 fee-order finding supplements its earlier ATJ2906.6 denial-
order finding. Chat 3 owns those actual repairs. Colorado remains with Chat 10
for review and Chat 3 for implementation. Missouri #236 is a separately built
candidate with PDF publication/report-format/source/review/admission work still
open; its author tests are not counted as this integration's tests.
