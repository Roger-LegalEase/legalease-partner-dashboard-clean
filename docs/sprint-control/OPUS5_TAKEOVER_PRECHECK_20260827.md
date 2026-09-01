# OPUS TAKEOVER PRECHECK — 2026-08-27

Produced by `repository-precheck-builder / precheck-plan` against the
`Roger-LegalEase/legalease-partner-dashboard-clean` repository before any
implementation. No implementation work was started. Production was not touched.

---

## Phase 0 — Repository authority

| Item | Value |
|---|---|
| Repository root | `/home/user/legalease-partner-dashboard-clean` |
| Current branch | `claude/new-session-7rsiqq` |
| Current HEAD | `07675789a80e732d2b835c1e8ba2092b39201b79` |
| Default branch | `main` — also at `07675789a80e732d2b835c1e8ba2092b39201b79` |
| Remote | `https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean` |
| Fetch refspec | `+refs/heads/*:refs/remotes/origin/*` |
| Dirty state | Clean. No staged, unstaged, or untracked files. |
| Stashes | None |
| Submodules / LFS | None |
| Sparse checkout | Not sparse |
| Object health | `git fsck --connectivity-only`: dangling commits only, no corruption, no missing objects |
| Disk | 29 GB available |
| `node_modules` | **Absent** — no verifier, generator, or test can run until `npm ci` |

### Environment correction that changes the handoff's premises

The clone was **shallow (`--depth 50`)** at session start. Every ancestry
question answered before unshallowing was wrong; `git merge-base main
checkpoint` returned empty and both `--is-ancestor` probes returned NO, which
would have read as unrelated histories. The repository was unshallowed
(`git fetch --unshallow`, exit 0, `is-shallow-repository=false`) and all
lineage below is measured on full history.

`origin/main` also **moved during the unshallow**, from
`dd93579871962260b12918e54c44cf9bf1e81529` to `07675789…`. Main now carries
PR #132. The designated branch is currently identical to main.

### This container is not the handoff's machine

The handoff package (`00_START_HERE/MACHINE_PATHS.md`) describes a macOS
workstation. This is an ephemeral Linux container with a fresh clone. Verified
absent:

- `/Users` — no such directory. No `legalease-colorado-expert` worktree, no
  `legalease-finetune-*` lane worktrees, no `legalease-finetune-sprint-control`.
- `/Volumes` — no such directory. The external drive holding the official
  Colorado forms is not reachable.
- `/private/tmp/legalease-finetune-git-20260826` — absent.
- `20260827-national-finetune-paused.patch` (SHA-256 `6c5f6d10…`, 4,190,658 bytes) — absent.
- `private/Nationwide Record Clearing/` — absent from the repository tree.
- `RCAP_SOURCE_BUNDLE_MANIFEST.json`, `STATE_MANIFEST.csv` — absent from the entire filesystem.

Only one worktree exists, plus one read-only inspection worktree this precheck
created at `/home/user/insp-checkpoint` (detached at `2f0ef040`).

**Nothing was recovered, because there was nothing local to recover.** No
`reset`, `clean`, `checkout -f`, branch recreation, or `.git` repair was run.
Phase 1 of the handoff's execution priority ("Recover and freeze local truth")
cannot be executed from this container and remains owed on the Mac.

---

## Phase 1 — Controlling refs, verified against the remote

All three verified by `git ls-remote origin` and then fetched:

```text
refs/heads/checkpoint/20260827-national-finetune-paused  2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3  MATCHES handoff
refs/heads/wip/20260827-national-cas-paused              6e84a4c49cab1d0db1c0d9d5726ca7455a31d1fd  MATCHES handoff
refs/heads/demo/20260827-colorado-expert                 2f0ef0403f16e57544ad0bc86b2d1b1cd08861b3  MATCHES handoff
```

`demo/20260827-colorado-expert` is byte-identical to the national checkpoint.
The handoff's statement that the Colorado branch never received the Colorado
candidate is confirmed.

### The Colorado candidate does not exist as a Git object

`63afd35e46e00f40a9b88314243802d2ebae655f`:

- absent from every remote ref (`git ls-remote origin | grep 63afd35e` → no match);
- `git cat-file -t` on full, unshallowed history → `could not get object info`.

It is a local recovery lead only, exactly as the handoff's truth table states.
It must not be treated as a commit.

### Measured lineage

```text
main (07675789)  is an ancestor of  checkpoint (2f0ef040)
checkpoint is 143 commits ahead of main            (main…checkpoint = 0 / 143)
wip        is   5 commits ahead of checkpoint      (32 files, +3004 / -127)
demo       ==  checkpoint exactly
claude/new-session-7rsiqq == main, so it is 143 commits behind the Colorado base
```

The five WIP commits are CAS work only — `verification-cas.ts`,
`payment-adapter.ts`, consumer checkout/adapter verifiers, a 1,139-line
`consumer_packet_verification_cas` migration, embedded-Postgres proof
infrastructure. **No paid-route metadata derivation is in them.**

---

## Phase 3 — The finding that changes the Colorado plan

A complete, hash-verified Colorado official-form package set already exists in
repository history and has never been merged.

```text
Commit          314107f0  "RCAP D3A: Colorado official-form packages"  (2026-08-12)
Best tip        origin/claude/rcap-d3a-corrections-v3  @ 875640b7  (2026-08-12 21:48)
                21 commits ahead of main; carries all 317 files plus later corrections
Also carried on claude/rcap-d3a-approval-evidence-v2 (9883ea36)
                claude/rcap-d3a-corrections-v2       (7dd288cf)
                claude/rcap-d3a-regenerate-co-tx-nd-nh-mo (b1cac44f)
Reachable from  main? NO     checkpoint? NO     demo? NO
```

**21 Colorado families, 317 files.** All three demo-critical families are
present and complete — `jdf-417-form-petition-en`, `jdf-477-form-motion-en`,
`jdf-612-form-motion-en` — each carrying `source-record.json`,
`field-census.json`, `field-classification.json`,
`field-classification-policy.json`, `production-field-map.json`, canonical /
boundary / negative fixtures with filled PDFs, a blank-vs-filled contact sheet
with proof, and eleven reports (determinism, protected-fields, protected-fields
scan, overflow-and-clipping, source-drift, rendered-artifacts,
reviewed-withholdings, populated-fields, mutation-tests, active-content,
non-filing-hold).

### The reported "source recovery" recovered bytes the repository already had

The committed `source-record.json` for JDF 417 on `rcap-d3a-corrections-v3`:

```json
"sha256":     "e0e1aefac85269087ca0f69252c501b14020a301d2cf6e5fbcc26aa5338f6dd4",
"byteLength": 1651354,
"sha256VerifiedAgainstBundleManifest": true,
"byteLengthMatches": true
```

That is an **exact match** to the hash and byte length the local Colorado
session reported as its source-recovery result. Those bytes were verified in
this repository on 2026-08-12. The source-recovery session re-derived an
already-committed fact.

### Revision conflict — unresolved, do not assume either side

The handoff reports JDF 477 and JDF 612 were "recovered as July 1, 2025
revisions." The committed records say:

| Family | Committed revision | Committed sha256 | Bytes |
|---|---|---|---|
| JDF-417 | REV-2025-07-01 | `e0e1aefa…` | 1,651,354 |
| JDF-477 | **REV-2024-08-07** | `b9cbad7f…` | 605,652 |
| JDF-612 | **REV-2024-08-07** | `8600b4b9…` | 682,994 |

Only JDF 417 is a 2025-07-01 revision. Settle this against actual bytes, not
against either document.

---

## Phase 6 — Why Colorado generation is actually refused

`generationAllowed` on JDF 417 is `false`, carrying seven holds:

```text
d3a_lane_output_not_self_approved
edition_1_runtime_disabled
f_independent_visual_review_required
state_legal_review_missing_from_supplied_corpus
state_manifest_generation_allowed_no
state_open_item_release_blocker
track_level_import_mapping_required
```

### The promotion authority the handoff asked us to find

`scripts/rcap-official-forms/rcap-platform-ready.mjs` — the single shared
module, with 17 consumers, that derives runtime readiness from measured
evidence and is explicitly written so the verdict is "never asserted." It
already implements the exact contract the handoff described:

- `RELEASE_STATE_HOLDS` — holds describing *when* a thing ships, not whether it
  is correct: `state_manifest_generation_allowed_no`,
  `edition_1_runtime_disabled`, `nationwide_launch_not_authorized`,
  `global_runtime_disabled`.
- `REVIEW_REQUIRED_HOLDS` — holds a completed independent review discharges,
  including `f_independent_visual_review_required`.
- `platformReadyVerdict()`, `reviewRecordApproval()`, `overlayProfileApproval()`,
  `validateReviewRecords()`, `partitionHolds()`.
- `PROFILE_APPROVED_VERDICT` / `REVIEW_APPROVED_VERDICT` and a closed verdict
  vocabulary.

This is the authority to use. Do not build a second one, and do not hand-edit
`generationAllowed`.

### The real blocker is a component bridge, not a legal gap

`platformReadyVerdict` reads `independentReview` from `overlay-profile.json`
**only**. An AcroForm-fill family carries `production-field-map.json`, which has
no `independentReview` field. The repository already records this as its own
largest blocker, in `generate-rcap-pdf-independent-review-batch.mjs`:

> "An AcroForm-fill family has nowhere to record an independent approval. …
> Those families cannot reach platform_ready through the shared gate no matter
> how their review comes back. This is a gate gap, not a defect in any form,
> and it is the batch's largest single blocker."

`generate-rcap-pdf-inventory-closure.mjs` scopes it: **26 of 27 AcroForm-fill
families are affected.** Colorado JDF 417, 477 and 612 all declare
`"renderStrategy": "acroform_fill"`, so all three sit squarely in it.

This is an engineering/component-bridge gap. It must not be reported as a
Colorado legal gap.

### The missing legal review is in the handoff package

`state_legal_review_missing_from_supplied_corpus` says the review is missing
*from the supplied corpus*. The handoff supplies it:
`03_COLORADO_DEMO/LEGAL_REVIEW/LegalEase-Colorado-Legal-Review.md` — 440 lines,
reviewed 30 July 2026, marked **Approved**, carrying the packet-only
controlling amendment. It classifies Track 2 (JDF 416/417/418/419/435) as
`official_pdf_fill`, **Approved**. Ingesting it through the corpus contract the
gate reads is what discharges that hold. It is an input, not a code change.

---

## Phase 5 — Denominator audit

The handoff asserts 51 jurisdictions / 356 flows / 650 variants. The
repository's own reconciler, `scripts/reconcile-rcap-denominator.mjs`,
publishes a different accounting — 117 batch-1 crosswalk / 324 compiled
jurisdiction profiles / 497 nationwide registry — and documents that the two
universes do not share an identifier space, joining on substance via
`data/rcap-ledger/track-pathway-crosswalk.json`.

Neither number may be carried forward on assertion. Run the generator and let
it publish the denominator.

The national defect itself is stated precisely in the resume manifest: canonical
legal authority holds **97** `packet_checkout` route contracts, all 97 exist
among the 336 compiled pathway rows, but the legacy generator derives only **80**
paid metadata rows from evaluator-local eligibility state. That reconciliation
is **uncommitted on the Mac** and is not in the WIP branch.

---

## Phase 4 — Reuse classification

### REUSE_AS_IS
| Item | Path |
|---|---|
| Official-form promotion authority | `scripts/rcap-official-forms/rcap-platform-ready.mjs` |
| State promotion gates | `src/lib/rcap/state-promotion-rules.ts`, `state-promotion-manifest.ts` |
| Consumer runtime (47 modules) | `src/lib/expungement-ai/` — `briefcase.ts`, `packet-generation.ts`, `payment-adapter.ts`, `consumer-render-request.ts`, `missing-fields.ts`, `save-result-policy.ts`, `screening-session-persistence.ts`, `authoritative-screening-result.ts` |
| Compiled profiles / evaluator | `src/lib/rcap-engine/compiled/profiles/` |
| Render + briefcase + documents | `src/lib/rcap/render`, `src/lib/rcap/briefcase`, `src/lib/rcap/documents` |
| Verifier suite | 309 npm scripts, incl. `expungement:verify-briefcase-delivery`, `verify-post-payment-packet-generation`, `verify-paid-event-once` |

### CHERRY_PICK_EXISTING
- The 317 Colorado package files from `origin/claude/rcap-d3a-corrections-v3` (`875640b7`), path-scoped to `data/rcap-all50/overlays/production/colorado/`, onto a new exact descendant of `demo/20260827-colorado-expert`.

### PORT_EXISTING_WITH_ADAPTATION
- The 5 CAS commits on `wip/20260827-national-cas-paused` — Phase 3 only, after Colorado is stable. Non-release, aggregate never review-approved.

### COMPLETE_EXISTING_DRAFT
- `docs/record-clearing/field-map-drafts/colorado-jdf417|477|612.field-map-review.json` and the `all50/` drafts — reconcile against the committed `production-field-map.json`, keep the committed map as authority.

### TRUE_NEW_WORK
- **One** approval channel so an AcroForm-fill family can record an independent approval that `platformReadyVerdict` reads. This is the smallest bridge that unblocks 26 families, Colorado's three among them. Extend the existing gate; do not fork it.

### STALE_OR_SUPERSEDED_ARTIFACT
- "The source/form bytes are the blocker" — superseded; the bytes were hash-verified on 2026-08-12.
- 51 / 356 / 650 — unverified against the current reconciler.
- `tmp/review-inbox/all50/colorado/` and `tmp/official-pdf-shadow-batch/all50/colorado-*` samples and field-map drafts — generated drafts, not approved blank sources.

### TRUE_EXTERNAL_BLOCKER
1. **Official Colorado PDF bytes and `STATE_MANIFEST.csv`.** `build-rcap-official-forms-d1-verified-binaries.mjs` reads them from `RCAP_BUNDLE_EXTRACT` / `RCAP_BUNDLE_MANIFEST`, defaulting to `/tmp/claude-0/…/54ff2bf1-…/scratchpad/bundle/` — a different session's scratchpad, which does not exist here. The `generation_allowed` column that gates Colorado lives in that bundle, outside the repository. Needed for any regeneration; **not** needed to port the already-verified packages.
2. **The national patch**, 4,190,658 bytes, SHA-256 `6c5f6d10…`, on the Mac. It is the only copy of the 97/97 derivation.
3. **The Colorado local worktree**, on the Mac.

---

## Architecture to preserve

Shared evaluator and compiled profiles; legal authority registry; packet
planner; factory-v2; source repository and receipts; official-form finalizer;
packet assembler; sponsored entitlement and credit; Briefcase; Clinic Mode; the
five legacy generators (Mississippi, Illinois, DC, Pennsylvania, Texas-Harris);
`rcap-platform-ready.mjs` as the single promotion authority; the separation
between build status and review status.

## Exact implementation delta

1. `npm ci` — nothing can be verified until dependencies install.
2. Branch `demo/20260827-colorado-expert-recovered` from `2f0ef040`. Leave the three original remote branches untouched.
3. Path-scoped cherry-pick of `data/rcap-all50/overlays/production/colorado/` from `875640b7`; re-verify all 21 `sha256Observed` values against `sha256` on landing.
4. Ingest `LegalEase-Colorado-Legal-Review.md` through the corpus contract `reviewRecordApproval()` reads, to discharge `state_legal_review_missing_from_supplied_corpus`.
5. Add the AcroForm-fill approval channel to `rcap-platform-ready.mjs` so `production-field-map.json` can carry `independentReview`, and record approvals for JDF 417 / 477 / 612 against their exact artifact hashes.
6. Resolve the JDF 477 / 612 revision conflict against bytes.
7. Let `platformReadyVerdict` derive the verdict. Never set `generationAllowed` by hand.
8. Only then wire the demo's fifteen proof points through the existing runtime.

## Focused tests

`verify-rcap-platform-ready-approval-channel.mjs`,
`verify-rcap-pdf-independent-review-records.mjs`,
`verify-rcap-participant-fill-hold-derivation.mjs`,
`verify-rcap-official-forms-d1.mjs`,
`expungement:verify-post-payment-packet-generation`,
`expungement:verify-briefcase-delivery`, `expungement:verify-paid-event-once`.

## Full-chain gate

Generators in dependency order → semantic diff review → currentness checks →
clean tree → full chain once → freeze one exact candidate SHA → Lane J → Lane K.
None of it can start before `npm ci`.

## Rollback

`checkpoint/20260827-national-finetune-paused` (`2f0ef040`) is the clean
accepted application checkpoint. All work lands on new branches; no original
remote ref is moved, rewritten, or deleted.

## Production boundary

Production was not touched and is not authorized by this package.

---

# Addendum — findings from executing the plan (same day)

The port in the plan above was carried out. Two of its conclusions survived
contact with the running code; one did not, and the correction is material.

## Confirmed by execution

**The port landed and verifies.** 21 families, 317 files, taken path-scoped
from `875640b7`. Checked against bytes on disk rather than read from a
manifest:

```text
24/24  rendered artifacts match recorded sha256 and byte length
21/21  source records internally consistent
 4/6   contact-sheet proofs resolve to the participant artifact they name
```

The two proofs without a participant artifact are JDF 641 and JDF 2371 — the
pair `2355e40e` returned. All three demo-critical families carry complete
proofs.

**The approval-channel gap is real, and now demonstrated rather than inferred.**
For JDF 417, 477 and 612: `overlay-profile.json` does not exist,
`production-field-map.json` does, and it carries no `independentReview` key.
`platformReadyVerdict` reads the first and never the second, so there is
nowhere to record an approval it would read.

## Corrected: the delta is not one approval channel

The plan named the approval channel as the whole of `TRUE_NEW_WORK`. Running
`partitionHolds` over the ported families shows that was too narrow.

The seven holds split as:

```text
release-state   (a ship decision clears)      2/21  edition_1_runtime_disabled
                                                    state_manifest_generation_allowed_no
review-required (an independent review clears) 1/21  f_independent_visual_review_required
substantive                                    4/21  d3a_lane_output_not_self_approved
                                                    state_legal_review_missing_from_supplied_corpus
                                                    state_open_item_release_blocker
                                                    track_level_import_mapping_required
```

Three facts about those four substantive holds change the picture:

1. **No verifier, generator, or gate in this repository references any of
   them.** They appear in exactly one other file. `partitionHolds` returns
   them as substantive because they are absent from both known sets — that is
   a default, not a determination. The gate has never evaluated this
   vocabulary.

2. **Colorado is the only lane-D3A state in `overlays/production/`.** The ten
   others are lane D1 and carry a different, gate-known vocabulary
   (`edition_1_generation_allowed_no`, `jurisdiction_runtime_disabled`,
   `pinned_hash_absent_from_canonical_library`). Colorado's holds were written
   by a lane whose conventions the shared gate does not implement.

3. **The one artifact that knows them is explicitly non-canonical.**
   `data/rcap-codex/d-track-terminalization/track-family-map.json` carries
   `status: "proposed_noncanonical_analysis"` and reports, across 67 lane-D
   tracks:

   ```text
   production_packet_candidate            0
   held_on_source_or_design              60
   correction_required                    7
   unresolvedPinnedComponentRelationships 101
   tracksWithUnresolvedFormRelationships   46
   ```

   with all eight non-technical gates non-terminal for all 67 tracks, save
   `canonicalLegalDesignNonterminal`, which is 0. Its own derivation rules
   close with: *"Technical approval supports candidate readiness only; no
   candidate or technical disposition is labeled terminal."*

`track_level_import_mapping_required` is therefore not a flag awaiting a
signature. It stands for the 101 unresolved pinned component relationships,
and resolving them is bounded by the registry-pinned relationship artifact
under rules that refuse name, prefix, and title resemblance as evidence.

## Also missing: the renderer that produced these artifacts

Every Colorado `rendered-artifacts.json` names its renderer as
`scripts/rcap-official-forms/lanes/d3a-regenerate.mjs`. That path does not
exist in this repository; `scripts/rcap-official-forms/lanes/` does not exist
at all.

The artifacts are verifiable — their hashes match their bytes — but they are
not reproducible here. Anything that would require re-rendering a Colorado
family is blocked on a component that was never committed, independently of
the source bundle being absent.

## Revised delta for the three demo families

```text
1. Approval channel for AcroForm-fill families            TRUE_NEW_WORK, small
2. Ingest the supplied Colorado legal review              input, in the handoff package
3. Resolve track-level import mapping                     TRUE_NEW_WORK, large, bounded
                                                          by the pinned relationship artifact
4. Determine what state_open_item_release_blocker and
   d3a_lane_output_not_self_approved require              UNKNOWN — no discharging
                                                          mechanism exists in-repo
5. Recover or rebuild the D3A renderer                    blocked, only if re-rendering
                                                          is required
```

Items 1 and 2 remain as planned. Item 3 is substantially larger than the plan
implied. Item 4 cannot be scoped from repository evidence and is the exact
blocker to raise rather than fill with an assumption.

The two release-state holds are worth separating out: for a **nonproduction**
demo they describe when the corpus ships globally, not whether Colorado is
correct. `rcap-platform-ready.mjs` makes that distinction deliberately, and
its header explains why treating a release hold as a defect once made the
corpus "permanently unfinishable."
