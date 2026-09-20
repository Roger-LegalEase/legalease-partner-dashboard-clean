# Exact-membership reconciliation: 199 → 195, and the source position

Measured 2026-09-09 against `MASTER_QUEUE.json` at the 199 checkpoint
(`7b8d6fc0ab0b`) and at head. **Four families left terminal, none joined.**
Terminal is `COMPLETE_PACKET_PROVEN | GUIDANCE_READY | HANDOFF_READY | OUT_OF_SCOPE`.

## The four losses, one row each

| Family | Was → Is | Changed input | Applicable failure | Affected output identity | Prior accepted decision |
|---|---|---|---|---|---|
| `ct-destruction-request` | GUIDANCE_READY → FAIL_REPAIR_REQUIRED | none in the deliverable | SOURCE_IDENTITY on a pin of `completed-output-counsel-manifest.json` at `99e80291…` | **the pre-namespacing overlay `ct-destruction-request--agency-application/`, which holds no fixtures** | a re-pin landed in the current directory on 2026-09-02 (`5deb0a43f`, "one re-pin instead of thirty-six rebuilds") |
| `ct-provisional-pardon` | GUIDANCE_READY → FAIL_REPAIR_REQUIRED | none in the deliverable | SOURCE_IDENTITY, same pin | same superseded directory | same re-pin |
| `ct-absolute-pardon` (erasure) | GUIDANCE_READY → PRODUCT_PATH_PENDING | none in the deliverable | CLIPPING_AND_OVERLAP: *"the exact current hashes have no governed raster receipt"* | canonical `26cfafce…`, boundary `e078c042…` | **a raster receipt for exactly those hashes was ingested 2026-09-09T03:21Z from job 102321966409** |
| `de_mandatory_expungement-set` | GUIDANCE_READY → FAIL_REPAIR_REQUIRED | **`ea96a068f` deleted the required-before-filing paragraph** | REQUIRED_BEFORE_FILING and SELF_HELP_STOP | current `participant-instructions.md` | FIX54 had added the exact sentence the rebuild removed |

## Connecticut: the failures do not apply to the current deliverables

Each family has **two** overlay directories. The current deliverable is
`agency-application-treatment:obligation:…:ct:<name>--official-pdf-fill/` — it
has `fixtures/` and was last touched 2026-09-09. A pre-namespacing directory
`ct-<name>--agency-application/` also exists, **holds no fixtures at all**, and
was last touched 2026-09-02. The failing digest `99e80291…` is pinned only by the
older one; the current directories pin `fbf9bfef…`, which is what the shared
ledger hashes to now.

Every pinned record in each current deliverable was recomputed from the bytes:

| Family | pinned records | not matching |
|---|---|---|
| `ct-destruction-request` | 4 | **0** |
| `ct-provisional-pardon` | 7 | **0** |
| `ct-absolute-pardon` | 5 | **0** |

The verifier that failed the first family said so itself: *"This is a stale
binding created by a shared file drifting underneath it, not a packet built on a
wrong source."* The drift traces to `cb6cbf45` ("project Virginia pardon route
mapping"), which edited the shared ledger without touching any Connecticut packet.

For the third family, `RASTER_QUEUE.json` now records `currentRasterState:
RASTER_PASS` with a receipt bound to exactly the current canonical and boundary
digests. The condition it was failed on no longer holds.

**No state is restored by hand.** All three are dispatched for a fresh
independent read against the current deliverable, and they return to terminal
only if that read passes.

## Delaware: the failure is real, current, and a regression

Reproduced before dispatch, not taken on report:

- `DE.memo.json` `tracks[1]` marks exactly one document `requiredBeforeFiling`:
  **"Certified Delaware criminal history"**.
- The current `participant-instructions.md` contains **zero** occurrences of that
  phrase. Its only "certified" string is "certified court and correctional
  records", in a table row about dates.
- `git show ea96a068f^:…/participant-instructions.md` carries the paragraph at
  line 24, beginning *"Required before you use the agency process: obtain the
  certified Delaware criminal history."* — through the SBI enrolment code
  `27S23V`, the $72 fee, the 30-day return with a $75 money order, the warning
  against substituting `27RVGT`, and the caution that the service-code sheet is
  not held by hash.
- `ea96a068f` deleted it. Nothing replaced it.

Two `selfHelpStopConditions` are also printed nowhere: a prior expungement
granted within ten years (`ten years`, `prior expungement`, `expungement was
granted` all return zero matches in both fixtures and the instructions), and the
§ 4201(c)/Beau Biden limb (`pardon`, `4201`, `Beau Biden` all absent).

**This one stays out of terminal and is dispatched for repair**, with a builder
self-test so the same deletion cannot recur silently.

## Source position, measured — a missing-file count is not a missing-family count

| | |
|---|---|
| Families with bound sources | 245 |
| **Every bound source held here** | **211** |
| Missing at least one source | 34 |
| Distinct missing digests | 46 |
| **Fully held and NOT yet terminal** | **103** — 46 SOURCE_READY, 29 FAIL_REPAIR_REQUIRED, 14 PRODUCT_PATH_PENDING, 10 LEGAL_BLOCKED, 3 SOURCE_BLOCKED, 1 WRONG_DELIVERY_TYPE |

**No single missing input blocks more than two families.** The largest are the
FDLE Certificate of Eligibility application (2) and Missouri CR370 (2).

A first pass of this measurement walked only `private/source-imports` and
reported the Texas *Statement of Inability* as missing, apparently blocking 11
families, nine of them already proven. It is held — in
`private/human-source-returns`, which that walk did not cover. The corrected
figures above walk every mounted custody. A limited search is not an absence.

## Consolidated missing-input list, overlap checked before totalling

| Set | Count | Overlap with the other |
|---|---|---|
| Recovery-pool manifest gaps (`absentFromRecoveryPool`) | 70 | — |
| SRC05 declared-but-unheld | 14 | **0 digests in common** |
| **Distinct total** | **84** | not 84 blocked families |

Of those 84 files, only **46 digests** are bound by any family at all, and they
block **34 families** between them. The rest block nothing that is queued.
Acquisition should therefore be ranked by families unlocked, and on that ranking
it is low-leverage next to the 103 families whose sources are already correctly
held.
