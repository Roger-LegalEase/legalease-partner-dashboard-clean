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
