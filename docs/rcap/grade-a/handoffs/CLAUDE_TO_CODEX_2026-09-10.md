# Claude Captain -> Codex Captain handoff, 2026-09-10

**PROVISIONAL CHECKPOINT — written first, improved after.** If this document ends
here, everything below is still true and executable.

## Identity

| | |
|---|---|
| Repository | `Roger-LegalEase/legalease-partner-dashboard-clean` |
| Captain branch | `claude/legalease-sprint-captain-utucnw` (confirmed actual, not switched) |
| Captain worktree | `/home/user/captain-worktree` |
| Pre-handoff source SHA | `7981ca59c73929bf203b82a864c27964b0e89363` |
| Pushed to origin | yes, `origin/claude/legalease-sprint-captain-utucnw` == `7981ca59c` |
| Captain working tree | **clean, 0 dirty paths** at freeze |

The primary cwd `/home/user/legalease-partner-dashboard-clean` is a **stale lane
checkout** on `claude/build-b-custom-pleading-cohort`. It is NOT the Captain
worktree and must never receive Captain commits.

## Terminal count at this SHA

**219 of 346**, measured by the integration chain at `7981ca59c`. Not stale.

| state | count |
|---|---|
| COMPLETE_PACKET_PROVEN | 202 |
| FAIL_REPAIR_REQUIRED | 47 |
| SOURCE_READY | 33 |
| LEGAL_BLOCKED | 19 |
| PRODUCT_PATH_PENDING | 18 |
| SOURCE_BLOCKED | 6 |
| BUILT_RASTER_PENDING | 3 |
| WRONG_DELIVERY_TYPE | 1 |

terminal = COMPLETE_PACKET_PROVEN + GUIDANCE_READY + OUT_OF_SCOPE + HANDOFF_READY.

**One caveat on the count, recorded before freeze:** `nj_clean_slate-set` is
GUIDANCE_READY, i.e. counted terminal, under an open and serious finding (see
CRITICAL below). Read 219 as 218 plus one family whose terminal status is
disputed. No verdict was hand-edited in either direction.

## STILL RUNNING — do not touch these worktrees

Three Claude subagent lanes were dispatched before the freeze and are
**ACTIVE/UNKNOWN**. They are in-process subagents of the stopping Claude session;
I cannot confirm their stop. Each owns its worktree and branch exclusively.

| lane | worktree | branch | base SHA | families (grants LIVE) |
|---|---|---|---|---|
| **FIX175** | `/home/user/fixa-worktree` | `lane-fix175-20260910` | `e3966692693a8b252524daf8eb4f49d40743593d` | `nj_clean_slate-set`, `nj_ordinance-set`, `nj_indictable_conviction-set` |
| **FIX176** | `/home/user/fixb-worktree` | `lane-fix176-20260910` | `e3966692693a8b252524daf8eb4f49d40743593d` | `mn_petition_15218-set`, `mn_petition_juvenile_as_adult-set` |
| **VF66** | `/home/user/vfa-worktree` | `lane-vf66-20260910` | `b6fd4797fb404d331f365ae87b5ccf99b317dbbf` | `ia-12347-set`, `il-seal-edu-set` |

None of their branches is pushed. Their work exists only on local branches in
those worktrees. **Do not delete, reset, or check out those worktrees.** If they
committed before stopping, their commits are recoverable with
`git -C <worktree> log --oneline <base>..HEAD`.

FIX175 and FIX176 share the base `e3966692693a8b252524daf8eb4f49d40743593d`,
which is an ancestor of `7981ca59c`.

## Returned and FULLY INTEGRATED into `7981ca59c` (no action needed)

VF59, VF60, VF61, VF62, VF63, VF64, VF65, FIX163, FIX164, FIX165, FIX166,
FIX167, FIX168, FIX169, FIX170, FIX171, FIX172, FIX173, PF20. All cherry-picked,
all grants released, all committed and pushed.

## Grants MINTED BUT NEVER DISPATCHED — free to take

**VF67** holds live independent-verification grants on the three Kansas families
PF20 just built. **No agent was ever spawned for VF67.** These are unowned work
ready for a successor:

- `ks-21-6614-conviction-set`
- `ks-21-6614-diversion-set`
- `ks-21-6614-prostitution-coercion-set`

## CRITICAL — open finding on a family counted terminal

`nj_clean_slate-set` (state GUIDANCE_READY, vf04 `PASS_COMPLETE_INDEPENDENT`)
draws `"mark": "two_diagonal_strokes_inset"` in the item (d) conviction election
at page 19, rect `[34.971, 591.363, 18x18]`, on **both** fixtures — while all
twelve `guilty`-prefixed cells of that paragraph are null. A sworn conviction
election is ticked over an empty paragraph on a petition verified under penalty
of perjury.

Raised by VF62 out of scope; **confirmed independently by Captain** from the
committed records without a render. Full record:
`data/rcap-grade-a/packet-factory-24h/NJ_CLEAN_SLATE_SWORN_ELECTION.json`.

FIX175 was dispatched to repair it and is ACTIVE/UNKNOWN.

## Next five executable actions, in priority order

1. **Recover the three running lanes.** For each of `fixa`, `fixb`, `vfa`:
   `git -C /home/user/<w>-worktree status --porcelain` and
   `git -C /home/user/<w>-worktree log --oneline <base>..HEAD`.
   Preserve anything found. Done when each lane's commits and dirty state are
   recorded or pushed to its own `lane-*` branch.
2. **Resolve `nj_clean_slate-set`.** If FIX175 produced commits, integrate them;
   if not, re-dispatch the repair from
   `NJ_CLEAN_SLATE_SWORN_ELECTION.json`. Done when the mark is gone or the
   family is out of terminal. Never fill the cells to justify the tick.
3. **Verify the three Kansas families** under the existing VF67 grants.
   Inputs: `data/rcap-grade-a/packet-factory-24h/pf20/rows-pf20-20260910.json`.
   Done when a VF67 row lands with fifteen obligations per family.
4. **Fire a raster batch** for the three `BUILT_RASTER_PENDING` families.
   See RASTER below. Done when receipts are ingested and the chain converts them.
5. **Re-run the integration chain** and reconcile the count:
   `MASTER_LIBRARY_SOURCE_DIR=/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1 npm run rcap:integrate-packet-factory`
   Done when it exits 0 and the transition list is empty or explained.

## Integration command and its required order

```
MASTER_LIBRARY_SOURCE_DIR=/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1 \
  npm run rcap:integrate-packet-factory
```

Runs `scripts/grade-a-packet-factory-24h/integrate.mjs`, whose `CHAIN` order is
load-bearing and must not be reordered. It now opens with **four tripwires**:

1. `scripts/rcap-packet-completeness/verify-identity-refresh-survives-rebuild.mjs`
2. `scripts/rcap-packet-completeness/verify-gate-coverage-matches-its-verdicts.mjs`
3. `scripts/rcap-packet-completeness/verify-governance-state-survives-rebuild.mjs`
4. `scripts/rcap-packet-completeness/verify-builder-self-tests-run.mjs`

then: extract-verifier-returns -> completeness audit -> product wiring ->
generate (first pass) -> raster queue -> generate (second pass). The second
`generate` is required: without it an admitted family stays BUILT_RASTER_PENDING.

## Controlling process documents

| what | path |
|---|---|
| Build discipline | `AGENTS.md` (and `CLAUDE.md`, which includes it) |
| Product contract | `docs/PRODUCT_CONTRACT.md` |
| Sprint plan of record | `docs/RCAP_ALL50_ASAP_MASTER_PLAN.md`, `docs/RCAP_ALL50_AGENT_RUNBOOK.md` |
| Enterprise plan | `docs/LegalEase-Master-Build-Plan-v4.md` |
| Claim ledger | `data/rcap-grade-a/packet-factory-24h/claim-ledger.json` |
| Master queue | `data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json` |
| Raster queue | `data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json` |
| Completeness matrix | `data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json` |
| Raster importer | `scripts/grade-a-packet-factory-24h/ingest-raster-receipt.mjs` |
| Claim gate | `scripts/grade-a-packet-factory-24h/claim.mjs` |

## Verdict vocabulary — the trap that costs a whole row

Obligation results are **exactly four**: `PASS`, `FAIL`, `NOT_MEASURABLE_HERE`,
`BLOCKED_LEGAL_INPUT`. `PASS_WITH_OBSERVATION` and bare `BLOCKED` are refused at
extraction and **lose the whole row**.

The **family-level verdict field uses a different vocabulary**:
`PASS_COMPLETE_INDEPENDENT` (requires all fifteen PASS; refused if any is
`NOT_MEASURABLE_HERE`) or `FAIL_REPAIR_REQUIRED`. A bare `PASS` there leaves the
family stuck at VERIFY_PENDING.

Nine counters. **A counter that could not be measured is `null`, never `0`.**

## claim.mjs syntax

- `--assert LANE subjectId` — exactly three positional tokens
- `--can-assert LANE id,id,id` — ONE comma-separated argument
- `--transfer FROM TO id --reason "..."` — **a released grant reverts to its
  originally-recorded lane**, so FROM must name the recorded lane, not the last
  holder. The refusal message names the correct FROM.
- `--grant LANE id --reason "..."` — required for a family no lane has held
- `--release LANE id`, `--status LANE`, `--ownership`
- Lane name maps to kind by prefix: `/^(VF|WARV|P2V|VS)/` independent-verification,
  `/^(FIX|WAR0[34])/` repair, `/^PF/` packet-build, `/^SRC/` source-reconciliation.
  An unmapped name dies exit 4 UNKNOWN_LANE.
- Surplus positional arguments are refused with exit 20.

## Known verifier traps — a clean exit is not a passing packet

- `verify-packet-completeness.mjs` has **no FEE_AND_WAIVER, SERVICE,
  FILING_DESTINATION or ROUTE_IDENTITY limb at all**, and passed two families
  throughout the period they were failing seven obligations.
- It reads `visualDefects` from a key's *presence* and cannot distinguish a typed
  zero from a real geometry pass.
- Its `documents`-vs-`artifacts` path fires a zero-source-composition exemption
  on families that bind four document bytes (Nebraska).
- `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0` on a flat PDF with no
  AcroForm fields means "nothing was examined" (Florida).
- Exit 0 while printing FAIL has been observed. Read the printed verdict.

## Rendering rule

Render the pinned source **with** annotations. `pdftoppm -r <dpi> -gray` writing
**PGM P5 directly** — `-gray -png` emits an RGB PNG that a naive grayscale reader
misreads silently. Publish grey threshold, resolution and scope with every pixel
count, and **prove the detector fires on a positive control before trusting any
zero**. Added-ink is blind inside already-inked pixels: a `0` inside a printed
rule band is masked, not absent.

## Environment

- `MASTER_LIBRARY_SOURCE_DIR=/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1`
- Node v22.22.2. `node_modules` in each worktree is a **symlink** to
  `/home/user/legalease-partner-dashboard-clean/node_modules`.
- **Disk is the binding constraint: ~2.6 GB free with 9 worktrees.** Lanes must
  delete renders as soon as they are measured.
- Outbound HTTPS is proxied. `flsenate.gov`, `fdle.state.fl.us` and
  `ujs.sd.gov` return `CONNECT tunnel failed, response 403`. Egress to issuer
  sites is generally blocked; treat "could not fetch" as expected.

### THE SEARCH TRAP THAT HID 971 PDFs

`private/` is the sprint source inventory. **Four of its directories are
symlinks**, so a plain `find private ...` returns **0 files** while `find -L
private ...` returns **1366** (971 PDFs). A lane that searches with plain `find`
concludes honestly and wrongly that a source is not in custody.

This cost four families: 21 pinned digests recomputed **exactly** against files
reachable only through the symlinks. Record:
`data/rcap-grade-a/packet-factory-24h/SOURCES_HIDDEN_BEHIND_A_SYMLINK.json`.

Symlinked: `private/source-imports/Nationwide_Recovery_Pool_2026-09-02`,
`private/source-imports/rcap-d-source-packs-2026-08-12`,
`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`,
`private/human-source-returns`.

**Never commit the private corpus, credentials, `.env` files or participant data
to the repository.** Credential names only, never values.

## Raster gate

Workflow `.github/workflows/rcap-packet-raster-acceptance-batch.yml`, dispatched
with inputs `commit_sha` (**must be the FULL 40-char SHA — an abbreviated SHA
fails checkout ~30s in**), `family_batch` (comma-separated, empty = every
RASTER_PENDING row), `requested_scale`.

Receipt transport: the artifact blob store 403s at the egress proxy. Use
`mcp__github__get_job_logs` with `return_content: true, tail_lines: 2000`, parse
`RCAP_RECEIPT_VERDICT` with `scratchpad/extract-receipt.py`, then
`node scripts/grade-a-packet-factory-24h/ingest-raster-receipt.mjs --payload <file> --job-id <id> --job-conclusion success`.

**No raster job was dispatched at freeze.** The last was run `34513580220`
(il-seal-2yr-set, al-trafficking-set), both RASTER_PASS, both ingested and
integrated. Nothing remote is pending that can write central state.

## Owner decisions and holds — preserve, do not resolve

- **Connecticut three** (`ct-destruction-request`, `ct-provisional-pardon`,
  `ct-absolute-pardon`): VF65 upheld all three PRODUCT_PATH_PENDING verdicts and
  closed none. There is no delta to close against. This is an owner decision:
  amend `currentOutputStrategy` so the census stops contradicting
  `CT.memo.json`, or build the agency-application workflow the census names as
  missing. Evidence: `vf65/rows-vf65-20260910.json`,
  `PRODUCT_PATH_PENDING_DIAGNOSIS.json`.
- **Ten OWNER_DIRECTED_MAPPING_PENDING families** need route-to-vehicle
  decisions and are recorded as **not dispatchable**. A lane that guesses one is
  fabricating a route mapping.
- **`ks-21-6614-specialty-court-set`**: MASTER_QUEUE says `custom_pleading`, the
  controlling registry says `official_pdf_fill` with eight components. Owner
  decision.
- **Raster coverage question**: 20 families declare 94 PDFs no row ever queues.
  `RASTER_COVERAGE_IS_CANONICAL_ONLY.json` carries the corrected measurement and
  the withdrawn earlier reading.
- **KSJC republication hold** is unresolved and untouched.
- **Legacy generators** (MS, IL, DC, PA, TX-Harris) are NOT approved commercial
  fulfillment paths. Preserve assets and history, not authority. See
  `data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json`
  and ADR-0004.

## External returns — NOT complete passes

**VFCG1 (ChatGPT independent-review batch): the ZIP/rows have NOT been received
or consumed by this Captain.** Per the owner, they contain **two substantiated
failures and three incomplete reviews — NOT five complete independent passes.**
Do not record them as passes.

**NE/WV governance proposal: R2 remains REJECTED / NOT_CLEARED_FOR_INTEGRATION.**
Record: `data/rcap-grade-a/packet-factory-24h/NE_WV_GOVERNANCE_R2_INDEPENDENT_REVIEW.json`.
Keep it unapproved unless a genuinely later revision receives explicit
clearance. R2's rejection and the remaining author-side work stand.

**External ChatGPT/Codex workers are NOT stopped or released** by this Claude
Captain freezing. Their ownership persists.

## Machinery defects found this session and their records

| record | what |
|---|---|
| `SOURCES_HIDDEN_BEHIND_A_SYMLINK.json` | 21 pinned digests recovered; 4 families unblocked on custody |
| `DORMANT_BUILDER_GUARDS.json` | 619 assertions behind `--self-test` nothing ran; 382 moved into the build path |
| `RASTER_VERDICT_RETENTION.json` | 221 wiring receipts rest on runs whose verdict this repo does not retain; NOT fabrication |
| `BUILDER_NEWER_THAN_ITS_ARTIFACTS.json` | 145 families whose builder changed after their fixtures; exposure, not measured drift |
| `PRODUCT_PATH_PENDING_DIAGNOSIS.json` | all 21 diagnosed; 10 dispatchable, 10 owner-only |
| `NJ_CLEAN_SLATE_SWORN_ELECTION.json` | the sworn election on a terminal family |
| `RASTER_COVERAGE_IS_CANONICAL_ONLY.json` | corrected coverage measurement, prior reading withdrawn |

## Standing prohibitions

Never `git add .` / `-A` / `--all`. Never force-push. Never push to main. Never
`git reset --hard`, `git clean`, or worktree deletion. Roger approval required
before: production deploy, live Supabase migrations, RLS/auth/session changes,
Stripe live-mode behavior, production env vars or secrets, deleting major
systems, breaking live legacy generators, any destructive or irreversible
change.

Never fabricate participant facts, signatures, notarization, consent, returned
records, prosecutor acts, clerk assignments, judicial findings, professional
adoption or review approval. **Identifiers must come from tools** — never
invent, pad, extrapolate or reconstruct a commit SHA, artifact digest, lane
grant or run ID.

---

# FREEZE ADDENDUM — live worker state at stop

Written after the provisional checkpoint above, from measurements taken at
freeze. Everything above still stands.

## Worker stop status

All three live lanes were sent the stop instruction. **None had confirmed a stop
when this Captain stopped**, so all three are recorded **ACTIVE/UNKNOWN**. They
are in-process subagents of the stopping Claude session. No process was killed;
only supported message-based stops were used. Their grants were deliberately NOT
released — releasing them to make the handoff look clean would misrepresent
ownership.

| lane | worktree | branch | HEAD at freeze | dirty | commits since base |
|---|---|---|---|---|---|
| FIX175 | `/home/user/fixa-worktree` | `lane-fix175-20260910` | `e3966692693a8b252524daf8eb4f49d40743593d` | 0 | **none** |
| FIX176 | `/home/user/fixb-worktree` | `lane-fix176-20260910` | `e3966692693a8b252524daf8eb4f49d40743593d` | 0 | **none** |
| VF66 | `/home/user/vfa-worktree` | `lane-vf66-20260910` | `b6fd4797fb404d331f365ae87b5ccf99b317dbbf` | 1 untracked | **none** |

FIX175 and FIX176 had produced nothing on disk. Their bases are ancestors of the
published Captain SHA, so nothing is at risk from them.

## VF66 — a written but uncommitted return, preserved

`/home/user/vfa-worktree/data/rcap-grade-a/packet-factory-24h/vf66/rows-vf66-20260910.json`
existed untracked at freeze: 100,700 bytes, sha256
`f55bb0c79f33b815ce409f8af804fb5c3e57dd0c3c7b9ce3afc91fbe81eaee0a`.

Byte-identical copy preserved at
`/home/user/frozen-lane-preservation/vf66/rows-vf66-20260910.json` (`cmp` clean).

It **reads** complete — two rows, `ia-12347-set` `PASS_COMPLETE_INDEPENDENT` and
`il-seal-edu-set` `FAIL_REPAIR_REQUIRED`, with the lane's usual sections
including `grantsReleased`. **Do NOT treat that as a verified return.** The lane
never committed it and never reported, so nobody has confirmed it is final. A
successor must have VF66 confirm it, or have a fresh independent lane re-derive
it, before any family moves on its strength. Its grants on `ia-12347-set` and
`il-seal-edu-set` remain LIVE.

`/home/user/frozen-lane-preservation/` is **outside every worktree and outside
the repository**. It is local-only and NOT retrievable remotely. If this
container is reclaimed it is lost — see ROGER_MUST_TRANSFER.

## Lane branches are local-only

Every `lane-*` branch in this repository exists **only in this container**; none
is pushed. That is safe for the lanes already integrated — their content is in
the Captain branch's history by cherry-pick, which is published — but it means
the three frozen lanes' branches have no remote copy. They currently carry no
unique commits, so nothing unique is unpushed.

The other worktrees' single dirty file is in each case only
`data/rcap-grade-a/packet-factory-24h/claim-ledger.json`, holding a lane's own
`--release` edit that Captain already integrated and published. Nothing there
needs preserving.

## Central writers

**Central integration is FROZEN.** No integration chain run, no raster dispatch,
no queue or ledger write is in flight. The last raster run, `34513580220`, is
complete and fully ingested; nothing remote can write central state.

The one exception is the three ACTIVE/UNKNOWN lanes. Each is scoped to its own
worktree and its own family paths, and none of them pushes or runs the
integration chain — those are Captain acts they were instructed not to take. If
one writes, it writes only inside its own worktree.

## Not done, and deliberately not done during the freeze

- No integration chain was run after `7981ca59c` — the owner's instruction not to
  rebuild for a tidy count was followed. The 219 figure is the last real
  measurement, not an estimate.
- No packets rebuilt, no returns merged, no national audit.
- VF67's three Kansas grants were minted before the freeze instruction arrived
  and no agent was ever spawned for them. They are live, unowned and ready.

---

# FREEZE CORRECTION 1 — VF66 confirmed stopped, work pushed

VF66 answered the stop instruction after the addendum above was written. It is
now **CONFIRMED STOPPED**, not ACTIVE/UNKNOWN, and the addendum's VF66 rows are
superseded by this section.

| | |
|---|---|
| worktree | `/home/user/vfa-worktree` |
| branch | `lane-vf66-20260910` — **pushed to origin** |
| commit | `3e16d8a0ccc574fd9743403f9031263eadc127d5` |
| working tree | clean, 0 dirty |
| grants | **still LIVE** on `ia-12347-set` and `il-seal-edu-set`, grant set `dca6d65629fe6534` |

Its row is committed at
`data/rcap-grade-a/packet-factory-24h/vf66/rows-vf66-20260910.json` on that
branch. The preserved copy at `/home/user/frozen-lane-preservation/vf66/` is now
redundant — the branch is on the remote and no longer container-only.

**Nothing was in flight.** VF66 reports both families fully measured before the
stop arrived, all rasters deleted, and no file in the worktree ever mutated —
its five builder mutation runs used isolated scratch roots under `/tmp` built
from symlinks to read-only records, with `git status` empty before, between and
after each.

## Its result — 30 of 30 obligations, NOT YET INTEGRATED

- **`ia-12347-set` — `PASS_COMPLETE_INDEPENDENT`, 15/15.** Not proven: the raster
  is still owed, because FIX164 withdrew the family's own RASTER_PASS.
- **`il-seal-edu-set` — `FAIL_REPAIR_REQUIRED`: 14 PASS + 1 `BLOCKED_LEGAL_INPUT`
  on COMPONENT_SET.** No obligation is FAIL; all five FIX166 repairs hold.

The block is a record conflict, correctly not decided by a lane: the shared
packet-set manifest declares four components, the registry track declares **six**,
and `il-seal-edu-proposed-denying-order-5` (EXP-AD Order Denying) is marked
`required`, does not ship, and its source sits in the same custody folder the
Case List comes from. **Which record governs is an owner decision.**

It settled the 168,281-vs-163,545 arbitration: VF58's figure covers the nine
write-carrying pages, FIX166's covers all thirteen, and the four write-free pages
carry exactly 4,736 px — identical on both fixtures. FIX166 was right; the two
totals were on different scopes.

**A defect it found that FIX173's sweep did not close:** `il-seal-edu-set`'s
**nine guidance guards still run only under `--self-test`**. A one-line mutation
dropping the record's ten required-before-filing lines leaves the build exiting 0
while writing a guide that scores 3 of 10. Its Iowa guard is on the build path
and fires, but a narrower break passes it while the participant-facing prose is
gutted, because the needle survives in a generated refusal echo. The dormant-guard
work is not finished.

## What a successor must do with it

The return is **not integrated**. Integrating it is a Captain act and was not
taken. To consume it:

1. `git -C /home/user/captain-worktree cherry-pick 3e16d8a0ccc574fd9743403f9031263eadc127d5`
   (or fetch `origin/lane-vf66-20260910`).
2. Release or reassign both grants — VF66 deliberately did not, and said so.
3. Re-run the integration chain. `ia-12347-set` should reach
   `BUILT_RASTER_PENDING`, not terminal, until a fresh whole-family raster lands.

---

# FREEZE CORRECTION 2 — all lanes stopped; two Captain findings corrected

FIX175 and FIX176 both answered the stop. **All three lanes are now CONFIRMED
STOPPED. No worker is ACTIVE/UNKNOWN.** Both committed WIP, both left grants
live, neither applied any repair, and both branches are **pushed**.

| lane | branch (pushed) | commit | tree | state |
|---|---|---|---|---|
| FIX175 | `lane-fix175-20260910` | `664deb17a9ed93c64912a489bb8cb27bcc4c0a85` | clean | diagnosed, **no repair applied**, 0 guards written |
| FIX176 | `lane-fix176-20260910` | `c60fae635477889ad5d1f5d58c1826e0e4e64086` | clean | diagnosed, **no repair applied**, 0 guards written |
| VF66 | `lane-vf66-20260910` | `3e16d8a0ccc574fd9743403f9031263eadc127d5` | clean | complete return, unintegrated |

Neither repair lane ever applied a builder mutation, so there was nothing to
restore; every build they ran was an unmodified determinism control, restored and
re-hashed. `nj_arrest_no_conviction-set`, the family nobody owns, is byte-identical
and reproduces byte-identically from an unmodified rebuild.

## CORRECTION A — my reading of the New Jersey paragraph was methodologically wrong

I reported, in commit `dc28df614` and to the owner, that "all twelve
guilty-prefixed cells of that paragraph are null". **That measurement was
invalid.** I read the `value` column of `production-field-map.json`, which is
`null` for **all 179 fields** of that document — including `DefName`, the
petitioner's own name, which is printed on every fixture. It is a map, not a
render record. The column carrying the signal is `decision`.

**VF62's "3 of 9" was right, including its denominator** (9 is the builder's own
count, from `NJ_PETITION_CONVICTION_ROW`). FIX175 settled it from the bytes:
`guiltyDt`, `guiltyOff1` and `guiltyCrt` carry ink; `guiltyStatute`,
`guiltyFinal1`, `guiltyTimeType`, `guiltyDocCmpltDt`, `guiltyProbDt` and
`guiltyFineDt` are blank under the ticked box.

**The finding narrows but does not withdraw.** The election is drawn — 730 added
px inside the court's checkbox on both fixtures, against a discriminating control
of `dismissPti` and `contOwe` on the same page reading 0 in the same run. The
paragraph is three-ninths filled under a sworn election, with the statute and the
entire sentence blank, and **none of the six blanks is disclosed to the
participant anywhere in the delivered kit.**

FIX175 also recorded a wrong first pass of its own: its initial detector read
delivered page 20 and returned 0 px for the whole page, which would have
manufactured a finding that the mark is not drawn at all. `page: 19` is
1-indexed, proved by `pdftotext -bbox` on the pinned source.

### The repair already exists in the source

FIX105 wrote `NJ_PETITION_CONVICTION_ROW` and `NJ_CONVICTION_BLANK_DECLARATIONS`
with a comment stating the row and its election are withheld on every fixture.
`nj_disorderly_persons-set`, `nj_indictable_conviction-set` and `nj_ordinance-set`
all take it. **`nj_clean_slate-set` does not, and that is the entire reason it is
the only one of the four that draws the mark.** The omission is codified in a live
assertion at `scripts/build-census-v1-nj_arrest_no_conviction-set.mjs:2906` that
sits behind `--self-test`, which nothing runs.

**Exact next action** (FIX175's own, verbatim in intent): wire
`repeatingRowGroups: [NJ_ORDER_ARREST_ROW_1, NJ_PETITION_ARREST_ROW, NJ_PETITION_CONVICTION_ROW]`
and `declarations: NJ_CONVICTION_BLANK_DECLARATIONS` onto `nj_clean_slate-set` at
`:1803`, **together with** `declareWithdrawnElectionsInFieldMap` and
`guardFieldMapSelectionsAgainstDeliveredMarks` in the same change — because
withdrawing the mark without the map flag turns a currently-true
`measured_route_selection` record into a false one. Then rebuild, re-measure the
rect expecting 0 added px against the same three-checkbox control, and rewrite
the family note, which currently claims "Only the measured participant conviction
control is marked."

Withdrawing the election leaves the clean-slate petition not stating which
disposition item it elects on page 19. **That is a real loss and must be stated,
not engineered around.** It is the house rule all three siblings already follow,
and the alternative — filling the six cells — is the fabrication two lanes
refused this session.

### Two more things FIX175 found

- **`nj_clean_slate-set` does not reproduce from its own builder** at this base.
  Its committed petition prints `participant.phone` on the caption's third address
  line where the builder at HEAD prints `state_zip` — FIX167's recorded deferral
  at `:412-417`. **vf04's `PASS_COMPLETE_INDEPENDENT` was taken against bytes the
  builder no longer produces.**
- My grant premise was wrong: **not all four families share boundary `23a571af…`.**
  Three do. `nj_clean_slate-set`'s fixtures are unique (`b71de1df…` / `cb536e97…`).
  `nj_ordinance-set` and `nj_indictable_conviction-set` are currently byte-identical
  to each other on both fixtures. Finding 2 was **not measured** on
  `nj_indictable_conviction-set` — recorded `null`, not clear.

## CORRECTION B — the Minnesota audit finding was misattributed, and so was my dispatch

FIX176 settled item 9 box 1 from the bytes, by replaying every path-construction
operator through the `q`/`Q`/`cm` stack into page space — not from any builder
report. **The packet does tick it. The audit is wrong and the field map is the
defect.**

- 15218, `p4-cb-y660-x90.4`: an X in canonical and boundary
  (`m(93.19,661.2)→l(99.65,667.61)` and `m(93.19,667.61)→l(99.65,661.20)`).
  Pinned source EXP102 page 4, same box: **0 path operators.**
- FEE102 `p1-cb-y350-x108` on both families: ticked in both fixtures; pinned
  source 0 operators.
- **My dispatch named the wrong control on the juvenile family.** There
  `p4-cb-y660-x90.4` is correctly empty; the failing control is
  `p4-cb-y572-x90.41`, item 9 **box 2**, the juvenile certification.

The map's defect is precise: the ticked row carries `marked: true`,
`routeDetermined: true`, `approvedDisposition: "ROUTE_ELECTION_MADE"` and **no
`disposition` key**. `readFieldRows` decides write-vs-blank solely on
`String(c.disposition ?? "").toLowerCase().startsWith("select")`, so it lands on
the blank side and the contract calls a route-determined blank
`ROUTE_OPTION_NOT_SELECTED`. The **same control** is published a second time in
`writableAnchors`, where the same reader counts it as a write. **The map
contradicts itself.**

My reader fix (`ba57b99ce`) is still correct — `selectionControls` must be read —
but the two findings it surfaced are a **field-map defect**, not unmade
elections. `mn_petition_juvenile_as_adult-set`'s demotion from
COMPLETE_PACKET_PROVEN stands on the ten null reasons, not on these two.

**The case-determined exception does not apply** to FEE102 item 2: it resolves to
`REQUIRED_BEFORE_FILING`, a blank the participant must fill, and this box is not
blank. Declaring it so would publish a record the artifact contradicts and trade
one counter for a disclosure obligation on a blank that does not exist — the
trade `completeness-contract.mjs` warns about by name.

### Two more things FIX176 found

- **The juvenile family's rebuild erases governance state**: `product-wiring.json`
  loses `binding.acceptanceReceiptWithdrawn` — the withdrawal record for
  superseded RASTER_PASS `34413372916` — and upgrades FEE102's `sourceVersion`
  tier from `exact_form_number` to `exact_content_hash`, a stronger claim than
  MASTER_QUEUE holds. Restored, never committed.
- **Its committed census is stale and its builder publishes a zero for a missing
  measurement.** `field-census.census-v1.json` fails determinism: all 95 controls'
  `glyphAdvance` 12/10.98 → 0. `build-census-v1-mn_petition_juvenile_as_adult-set.mjs:517`
  reads `(chars[i].w ?? 0) + (chars[i + 1].w ?? 0)` — the sibling builder already
  refuses exactly this under the comment *"AN ADVANCE THIS BUILD CANNOT MEASURE IS
  null, NOT ZERO"*.

**Exact next action** (FIX176's): port the sibling's null-not-zero advance fix
into the juvenile builder at `:517` **before** any rebuild, because the repair
requires a rebuild and the builder as it stands would publish 95 zeros. Then emit
`disposition` on every `selectionControls` row: `"selected_route_option"` where
`marked === true`, otherwise the row's existing `completenessDisposition`. Then
write the ten juvenile reasons from the captured printed face and re-run the
verifier expecting `requiredOptionsMissing` 2 → 0 with all other counters unmoved
and both fixture digests unchanged.

Also confirmed: neither Minnesota builder contains `rmSync` or any delete-first,
so a failed build leaves prior output intact.

## Revised first action for the successor

The freeze holds and none of this was integrated. Three lane branches are on the
remote and ready to consume, in this order of value:

1. `3e16d8a0ccc574fd9743403f9031263eadc127d5` — VF66, a complete return.
2. `c60fae635477889ad5d1f5d58c1826e0e4e64086` — FIX176's WIP row: the item 9
   diagnosis, worth having before anyone re-measures it.
3. `664deb17a9ed93c64912a489bb8cb27bcc4c0a85` — FIX175's WIP row: the New Jersey
   diagnosis and the located repair.

All grants remain live and must be released or reassigned by the successor.
