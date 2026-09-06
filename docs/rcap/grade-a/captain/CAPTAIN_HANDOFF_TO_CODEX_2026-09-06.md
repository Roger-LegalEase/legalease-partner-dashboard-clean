# Captain handoff — Claude to Codex, 2026-09-06 (about 04:00Z)

Owner-directed transfer. Codex is the sole operational Captain from the commit that
contains this note. The canonical branch stays `claude/legalease-sprint-captain-utucnw`.
Everything below is operational state, written from records at the moment of handoff.

## 1. Integration baseline

- Last Captain integration/regeneration commit before this note: `445123d99402baaa0f79c1636e9217b98727ff28`
  ("Regenerate after raster runs 34009628602 and 34009770149 and the FIX86 row correction").
  The Captain worktree (`/home/user/captain-worktree`) was clean and remote-matched at that commit.
- This note is the only change in its own commit. The outgoing Captain writes nothing central after it:
  no regeneration, no claim grant/transfer/release, no ingest, no integration of late returns.
- Regeneration chain used throughout: completeness `--write` → extract-verifier-returns → generate →
  source-conveyor → raster-queue → generate → product-wiring → source-attach → fulfillment-authority
  (twice, then `--check`) → launch-graph (then `--check`) → disposition → census → verify-claim-ledger.
  The outgoing Captain's copy is `/tmp/claude-0/.../scratchpad/chain.sh` in the container (not in Git);
  every step is a repository script named above.
- Pre-integration return-row check the outgoing Captain used after the FIX87/FIX89 refusals:
  a scratchpad script asserting `status: COMPLETED`, `repairedByThisLane: true`, per-row `lane`,
  `obligationsRepaired` array, `obligationsThisRowDoesNotDischarge` never naming a repaired obligation,
  and `countersAfter` with exactly the nine counter keys and integer zeros. The rule it mirrors is
  `scripts/grade-a-packet-factory-24h/generate.mjs` (`repairCompletionsByFamily`,
  `repairCompletionAfterVerdict`) and `post-repair-reread.mjs` (`repairRowDischargesFailure`).
  Four returns this cycle (FIX86, FIX87, FIX89, FIX85) needed shape corrections before the generator
  consumed them; each correction is disclosed in the row's `captainCorrection` field.

## 2. Measured counts at the baseline (MASTER_QUEUE.json at 445123d99)

| state | count |
|---|---:|
| COMPLETE_PACKET_PROVEN | 147 |
| FAIL_REPAIR_REQUIRED | 43 |
| VERIFY_PENDING | 15 |
| LEGAL_BLOCKED | 16 |
| SOURCE_READY | 82 |
| SOURCE_BLOCKED | 6 |
| PRODUCT_PATH_PENDING | 20 |
| GUIDANCE_READY | 9 |
| HANDOFF_READY | 2 |
| OUT_OF_SCOPE | 5 |
| WRONG_DELIVERY_TYPE | 1 |

Newly proven in the last cycle: Vermont 18-to-21, felony, misdemeanor, pardon sealing (VF05);
Colorado multiple-conviction sealing (VF02). Claim ledger: `CLAIM_LEDGER_OK 922 claims`.

## 3. Worker and return inventory (current lanes only)

Six Claude lanes were dispatched from this session. Five were stopped by the owner during the transfer;
one (VF05) was still running when this note was written. None can write Captain or central state;
each writes only its own worktree and pushes only its own branch.

| lane | task / writable scope | branch (base) | state at handoff | pushed | next action for Codex |
|---|---|---|---|---|---|
| FIX88 | New Jersey four (REPEATING_ROWS on all, KNOWN_PREFILLS on arrest) on the shared East host `scripts/build-census-v1-nj_arrest_no_conviction-set.mjs` + the four nj_* family dirs + `fix88/rows.json` | `fix88-nj-repeating-rows` (7b7dcd601) | stopped by owner; worktree `/home/user/fix88-worktree` clean, no commits, no work | nothing to push | grants live on FIX88 (four families); redispatch or release; prompt at scratchpad `fix88-prompt.txt` and reproduced in §9 |
| FIX90 | NC 146 dismissal (REQUIRED_BEFORE_FILING) + NH pre-2019 (KNOWN_PREFILLS, REQUIRED_BEFORE_FILING, SERVICE); two single-family builders | `fix90-nc-nh-instructions` (11e568add) | stopped by owner mid-task; NC line deletion committed (e03e19151); NH edits checkpointed as WIP | `50524359e` on origin (WIP, not accepted) | finish NH: MaxLen refusal recording, `boundaryWrites` removal, service heading; rebuild twice; `fix90/rows.json`; two untracked builder byproducts under `raster/boundary/page-05/` left uncommitted in the worktree |
| FIX91 | NE custodial set-aside (KNOWN_PREFILLS: caption defendant on CC 6:11/6:11.2/DC 1:15, CC 6:11 street/email); single builder | `fix91-ne-custodial-prefills` (28dd7702c) | stopped by owner mid-task; 14 modified files checkpointed as WIP incl. moved fixtures | `529841ff1` on origin (WIP, not accepted) | verify the writes at 300 dpi, determinism, `fix91/rows.json`; moved bytes need a new central raster |
| VF03 | independent read of nm_conviction-set, nm_identity_theft-set, nm_release_without_conviction-set on the FIX79 bytes (raster run 34009091546) | `vf03-nm-three-read` (3bc07ed49) | stopped by owner; worktree clean, no rows written | nothing to push | grants live on VF03; redispatch the read (assignment in §9) |
| VF04 | independent read of the four Utah petition families on the FIX83 bytes (run 34001777533) | `vf04-ut-four-read` (2b45ef40b) | stopped by owner; worktree clean, no rows written | nothing to push | grants live on VF04; redispatch (assignment in §9) |
| VF05 | independent read of the four Virginia sealing families on the FIX87 bytes (run 34009473933) | `vf05-va-four-reread` (ddc3b07d0) | running at handoff; asked to checkpoint WIP and push `vf05-va-four-reread` | none yet | if it completes, its rows land on that branch; grants live on VF05 |

Worktrees at `/home/user/<lane>-worktree` symlink `private/` and `node_modules` from the primary checkout;
they are not needed by Codex once the branches are pushed. A stray Agent-tool worktree
`/home/user/legalease-partner-dashboard-clean/.claude/worktrees/agent-adb15f0db73407f92` (branch
`worktree-agent-adb15f0db73407f92`, at 370cac292) predates this cycle and was left untouched.

Returns integrated this cycle (all on the Captain branch, lane branches retained on origin):
FIX79, FIX83, FIX84, FIX85, FIX86, FIX87, FIX89, DEL-A, DEL-B, DEL-C, DEL-D, VF01, VF02, VF03, VF04, VF05.

### Live grants not attached to a running worker (claim ledger at the baseline)

- FIX88: nj_arrest_no_conviction-set, nj_disorderly_persons-set, nj_indictable_conviction-set, nj_ordinance-set
- FIX90: nc_146_dismissal_petition-set, nh_petition_nonconviction_pre2019-set
- FIX91: ne-setaside-custodial-set
- VF03: nm_conviction-set, nm_identity_theft-set, nm_release_without_conviction-set
- VF04: ut_pet_dismissed_with_prejudice-set, ut_pet_dismissed_without_prejudice-set, ut_pet_limitations-set, ut_pet_no_charges-set
- VF05: va_seal_ancillary_matter_only-set, va_seal_enumerated_seven_year-set, va_seal_petition_felony-set, va_seal_petition_misdemeanor-set (worker running at handoff)
- Older wave-2 generator grants on FIX01–FIX08 and FIX39 remain live and unworked (Arkansas, Arizona, California, Colorado motion-conviction and petition-arrest, Florida, Illinois eight, Indiana, West Virginia custom pleading, Rhode Island, South Dakota, Vermont decriminalized, Connecticut provisional pardon).

### Reads dealt by the generator but not yet assigned to a worker (released, on roster lanes)

co_motion_seal_nonconviction-set (VF01), pa_490_nonconviction-set (VF02), pa_790_nonconviction-set (VF03),
va_exp_nonconviction-set (VF04). All four carry live RASTER_PASS receipts (§4). Consolidate onto one
free roster lane with `claim.mjs --transfer` before dispatching.

## 4. Raster workflow runs (all `rcap-packet-raster-acceptance-batch.yml` on `main` at a3d4587b0)

None in flight at handoff. Every run below is ingested into RASTER_QUEUE.json.

| run | families | submitted commit | result |
|---|---|---|---|
| 34000217746 (104) | co_multiple_conviction_seal-set | 8f942b3b9e5d3a0e32d99253bc8306e0e99131d3 | pass, ingested |
| 34000499162 (105) | ne-setaside-custodial-set | short SHA 274a00cf4 (dispatch error) | failed at checkout; re-dispatched |
| 34000834003 (106) | ne-setaside-custodial-set | 274a00cf4101e43ce9385491ab65913a1e157344 | pass, ingested |
| 34001350791 (107) | pa_790_nonconviction-set (FIX84 bytes) | a5b59681d56dded8ac74bf3c01e283d72a214fea | pass, ingested (superseded by FIX85 bytes) |
| 34001777533 (108) | ut_pet four | adaf13062edce5e9e9ba0a1e9a01fec71aaab253 | pass, ingested |
| 34009091546 (109) | nm three | dbd6faff2b119d10f5ec14ba8cad71f9dc2e57d5 | pass, ingested |
| 34009473933 (110) | va_seal four | 94b4800bd1f25b7110b357429686b57b43cac80a | pass, ingested |
| 34009628602 (111) | va_exp_nonconviction-set | 0bdf57b490f08dc79b7eb6ba5d682e792710aed1 | pass, ingested |
| 34009770149 (112) | pa_490, pa_790 (FIX85 bytes) | 7b7dcd6016d5cbd36530954838db7dfd2fc66476 | pass, ingested |

The dispatch requires the full 40-character `commit_sha`; run 105 is the record of what a short SHA does.

## 5. Source mounts and access limitations

- This container: Master Library at `MASTER_LIBRARY_SOURCE_DIR=/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1`
  (501 files, 329 PDFs); `private/` in the primary checkout, git-ignored; `verify-packet-build-environment.mjs`
  reports `corpus_matches_committed_index` 1 absent (an Alabama entry) on every family.
- Codex Cloud "LegalEase Packet Factory": the setup script restores the governed corpus release
  `source-corpus-2026-08-28` (51 / 499 / 329) into `private/` from `LEGALEASE_SOURCE_ARTIFACTS_TOKEN`;
  no Chromium (Playwright CDN answers 403) and no poppler is installed by setup; no Git network commands;
  branch `work` named by Codex. Contract: `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md`.
  Earlier Codex verification lanes measured from the field map and bytes, not from pixels.
- Iowa cohort check (this container, same governed corpus): `ia-12347-set` binds 2/2 sources;
  `ia-12346-set`, `ia-901c2-set`, `ia-901c3-set` name no resolved document source (their `google-drive:` ids
  are not in the corpus) and are not dispatchable.

## 6. Known test failures at the baseline (not caused by this handoff; preserved, not fixed)

- `scripts/verify-rcap-first-route-cohort-productization.mjs` exits 1: Illinois canonical is d4cb7659… where the
  approved pin is 7daaa389… (FIX02 moved the bytes after the 2026-09-02 adoption). DEL-C disposition (b):
  pins stay where the approval is; doc `docs/rcap/grade-a/captain/IL_PIN_DISPOSITION_2026-09-06.md`.
- `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` exits 1 with three failures: the Illinois binding
  above and two Mississippi rows (`ms-misd-addl-set` moved off its approved digest at FIX08; REVOKED is correct).
- `scripts/verify-rcap-image-input-fingerprint.mjs` exits 1: `data/rcap-staging-action.json` fingerprint is stale
  since 3285b660 and its generator `--check` fails.
- `scripts/verify-rcap-production-schema-upgrade.mjs` exits 1: FORWARD_CHAIN literal stale since 20260819
  (15 migrations unlisted, the DEL-B migration among them).
- `scripts/test-rcap-il-personalization.mjs` exits 1 at Codex's adapter (pleading caption) until the
  DEL-A entry point is connected (continuation v2).
- East host `--self-test` fails on `participant.state_zip` (pre-existing, disclosed by FIX84 and FIX85).
- `pa_6308_underage-set` and `nj_clean_slate-set` drift on rebuild from the East host (pre-existing, uncommitted).

Passing at the baseline: `npx tsc --noEmit`; `test-rcap-il-participant-renderer.mjs` (14 checks);
`test-rcap-il-sponsored-transaction.mjs` (69/69, local ephemeral PostgreSQL); `verify-rcap-il-consumer-authority.mjs`
and `verify-rcap-il-delivery-binding.mjs` (both REVOKED / denied, as they must be); the three finalizer tests
(`test-synthesized-off-appearances`, `test-appearance-fit-to-rect`, `test-synthesized-widget-borders`);
`test-captain-dealt-grants.mjs`; `verify-claim-ledger.mjs`; the chain's `--check` steps.

## 7. Delivery work and Codex assignments

- **CODEX-LAUNCH-01 (existing Codex delivery task).** Branch `codex/launch-01-il-delivery`, tip `198ac6191`
  (committed 2026-09-05T22:57Z); RETURN-02 integrated in full on the Captain branch. Continuation v2 recorded at
  `f0edbef22` in `data/rcap-grade-a/packet-factory-24h/codex-launch-01/ASSIGNMENT.{json,md}` (`continuation2`):
  connect `composeParticipantDeliveryPacket` at `src/lib/rcap/render/personalized-packet.ts` and the three
  sponsored operations at the refusal in `src/lib/expungement-ai/packet-generation.ts`, then rerun the chain;
  return `RETURN-03.json`. Actual status: no commit on the Codex branch since v2 was recorded; nothing here
  shows it executing. It was reported as "running" earlier by inference only.
- **DEL-A** (participant renderer entry point) at 0fcedd773; **DEL-B** (sponsored render migration
  `supabase/migrations/20260906120000_sponsored_route_render_transaction.sql`, local tests only, no hosted migration)
  at 7307b0e34; **DEL-C** at 14a02817d; **DEL-D** (image packaging) at b41d03f88/e3fa459e2.
- **CODEX-IMAGE-01**: recorded at `data/rcap-grade-a/packet-factory-24h/codex-image-01/ASSIGNMENT.{json,md}`,
  base 85e9d69e8, status PREPARED_AWAITING_LAUNCH, never launched. Correction: Codex Cloud is not shown to
  build or run containers (no docker in its contract; egress restricted). The only confirmed build-capable
  environment is this container's kind (anthropic_cloud, environment `env_0116efy1ZFoJadd3SvEf4iEu`, docker 29.3.1,
  `node:22-slim` reachable via `mirror.gcr.io`). DEL-D's local image `rcap-render-worker:del-d`
  (sha256:1e3eebe5…) exists only in this container, predates DEL-A/DEL-B, and ran preflight only; its duplicate
  verification tag was removed to reclaim disk. No image is published anywhere.
- **CODEX-BUILD-01**: recorded at `data/rcap-grade-a/packet-factory-24h/codex-build-01/ASSIGNMENT.{json,md}`,
  status PREPARED_AWAITING_LAUNCH, never launched. Correction: not executable as recorded (three of four Iowa
  families have no bound source; only `ia-12347-set` binds). No CXB01 grant was transferred; the four families'
  stale wave-1 claims (PF06/14/22/23) are untouched. The prompt also predates the Codex Cloud contract shape
  (branch `work`, no Git network commands, cloud-mode preflight) and would need rewriting before any launch.
- **Mississippi provider digest.** The MS clinic-demo record's `provider.imageDigest` is
  `sha256(composer.ts ‖ renderer.ts)` (generator line ~924): a source-bytes fingerprint labelled as an image
  digest, unlike the generic provider which binds `worker.immutableRegistryDigest`. DEL-A's one-line
  `renderer.ts` change moved it from fdcc2cd7… to 4ee4332e… in the regenerated registry and observation
  (commit 99bbde528). This names the wrong kind of identity for a publication requirement, no tested image
  corresponds to it, and the image-input fingerprint verifier fails; nothing about image readiness may be
  inferred from the regenerated registry. Production is untouched.
- Allocation record: `data/rcap-grade-a/packet-factory-24h/CODEX_ALLOCATION_2026-09-06.json` (its
  "prepared" statuses for IMAGE-01 and BUILD-01 are superseded by the corrections above).

## 8. Owner / counsel / credential dependencies (unchanged by this handoff)

- Consolidated owner decision package: `docs/rcap/grade-a/captain/OWNER_DECISION_PACKAGE_2026-09-05.md`
  (fees: RI 12-1.3, VT 32 V.S.A. §1431(e) after Act 60, PA 790, DE SBI; MS jurat; LA Art. 987; NH fee-waiver
  service; OK/WY destination; WA RCW 9.96.060(7); HI 712-1200; KY worklist; ND wait anchor; NE trafficking vehicle;
  MA BMC; Oregon approvals; rolling counsel batch 01; Colorado egress; IL/AL mount).
- Illinois route: stays REVOKED until a new legal-decision record names d4cb7659… (owner/counsel act).
- Exact-path authorization for the DEL-B migration file and the FORWARD_CHAIN list update (owner/Captain acts).
- Hosted sponsored/consumer canaries: credentials only the owner holds; no hosted or Production migration authorized.
- Source corpus token for Codex Cloud (`LEGALEASE_SOURCE_ARTIFACTS_TOKEN`) is owner-held.
- Usage: the eight-lane cut at about 00:57Z (session limit, stated reset 01:40Z) resumed at 03:15Z when this
  session next ran; the account's seven-day limit is in "allowed_warning" with reset 2026-09-08T16:00Z.

## 9. Prepared but unlaunched Claude assignments (scratchpad copies, not in Git)

Prompts for FIX88 (New Jersey four), VF03 (New Mexico three), VF04 (Utah four) and VF05 (Virginia four) were
issued from this session and are reproduced in the lane rows above by scope; the exact texts live in the
container scratchpad (`fix88-prompt.txt`, `vf04-ut-prompt.txt`, `vf02-prompt.txt`, etc.) and in the Agent
transcripts. The obligations, digests and receipts each read needs are all in RASTER_QUEUE.json and the
fix*/rows.json returns named in §3.

## 10. Outgoing central-write triggers

- Scheduled check-in `trig_01PZAajChrEB1Ms5DHndZkz5` (04:19Z) deleted. No other Routine, cron, or wake-up
  from this session remains (`list_triggers` returned only that one before deletion).
- No background shell command is running; the last chain completed at 445123d99.
- No PR subscriptions. No open pull requests were created by this session.
- Unresolved exception: none. If VF05 pushes rows after this note, they sit on `vf05-va-four-reread` for Codex.

Production touched: NO. Live Stripe touched: NO. No route opened. No approval record edited.
