# Fable Packet Factory — reusable lessons

One line per lesson, only what prevents a repeated mistake. Everything here was
paid for once already.

## Claims and ledger
- A family holds ONE claim per operation, ever. A finished family cannot be
  re-granted; use `claim.mjs --transfer <FROM> <TO> <id> --reason` to move a
  RELEASED grant to a new lane. `--assert` is read-only; `--release` is one-shot.
- Repair claims: `operation` is `rapid-repair`, `laneKind` is `repair`. Never
  derive one from the other.
- Lane names resolve by prefix (PF/FIX/VF/DISC/SRC/ACQ/PROMO). Any other prefix
  is refused before the ledger is consulted.
- Never hand-edit claim-ledger.json: it carries a digest over the claim rows.
- generate.mjs refuses a regeneration that loses claim identities, released
  flags, releases, reissues or transfers. If it refuses, fix the generator.

## Building
- Corpus IS mounted in this container: export
  `MASTER_LIBRARY_SOURCE_DIR=$REPO/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`
  or build hosts refuse outright.
- Every PDF created via PDFDocument.create() must go through
  `stampDeterministic()` from scripts/rcap-official-forms/rcap-deterministic-pdf-date.mjs,
  or two identical builds differ (257/583 bytes on an empty doc) and the raster
  receipt dies on rebuild.
- Never add files to scripts/lib/ — the render-worker Dockerfile copies it
  wholesale and the image fingerprint breaks (how PR #169 broke main).
- The raster module lives at scripts/raster/pdf-page-raster.mjs. Local rasters
  are RASTER_LOCAL_PENDING_CENTRAL, never a gate result.
- ca-1203-4-set + wv_nc_diversion_deferred-set (SCA-C903) sources are AES-256
  encrypted; pdf-lib cannot open them. STOP those, don't fight them.
- Wisconsin flat forms: values sit on ruled cell borders; lift the baseline or
  descenders cross into the cell below (PF-C fixed this twice).
- A failed build run may clear the family output directory before erroring —
  restore from HEAD after any aborted build (east-host hazard).

## Source relationship repair
- The operational tree private/Nationwide Record Clearing is NOT mounted in
  fable containers; verify held bytes through byte-identical Master Library
  copies (match the recorded held SHA-256 against a hash of every ML file —
  the corpus index alone misses .docx and 05_SOURCE_GATED). 35 of the wave's
  67 priority-1 rows have no bytes anywhere in the container: say so, never
  guess (S2 return lists them).
- All 53 priority-2 SRR rows are lane re-routing repairs with empty
  affectedFamilies; their cure lives in conveyor/queue dispatch, not the
  registry — registry lanes should skip them.
- DE "FORM-281" held bytes print Form 281E (the charge-sheet continuation);
  MT-OCA-MMRTA is a set identifier over two instruments; NM 4-960's name
  matches are 4-960.1/4-960.2. Read the face before binding, every time.

## Verifying
- PASS_COMPLETE_INDEPENDENT requires ALL 15 obligations scored; L9 refuses a
  subset. The nine counters are not the fifteen obligations.
- Verdicts live in lane rows.json; the ledger only records ownership. A released
  claim does NOT mean the family passed.
- Camel-case obligation maps carry outcome under `result`; older rows use
  `failedProofObligations`. Read both.
- `unchanged-official.pdf` components are correctly absent from the tree —
  verify their recorded hashes against the corpus index, not the filesystem.
- Filing-guidance house standard: delegation to a named checkable authority
  passes; a catch-all naming "fees" does not.

## Rastering
- The central workflow needs a full 40-hex commit_sha and dispatches from main;
  the queue's carry-forward keeps receipts only while pinned hashes AND the
  document set are unchanged; superseded receipts are preserved on the row.
- 12 families in 3 groups pin byte-identical PDFs (UT×4, WA×6, WA×2). One render
  is not N verdicts; PF-B holds the route-election classification.

## Answered advisories
- VF-SRC-A's VF18-VF25 hazard: reading 1 was correct (intentional
  cross-verification; ledger.transfers holds the reasons). The re-opened flags
  were deliberate. Fable verifier subagents are new identities, so the
  self-verification hazard does not arise.

## Integration
- A release travels only between claims on the SAME LANE. The ledger union
  resolver keyed on subject+operation and re-released six transferred grants
  (VF26 mid-read, FIX11 mid-repair) from a worker branch that predated the
  transfers. Cross-lane releases are refused; the old lane's completion lives
  in the transfer record.
- NJ east-host families (nj_arrest_no_conviction, nj_indictable_conviction, and
  6 of ny_160_59's rows): the failing KNOWN_PREFILLS rows are allowlist-bound to
  HELD facts — not disclosure gaps. Only a rebuild with new ink repairs them,
  and that waits on the east-host appearance-stream fix. Do not reclassify held
  facts as required-before-filing; FIX-A refused exactly that and was right.
- generate.mjs re-emits identities under its OWN lane packing and knows nothing
  about transfers: it silently moved 26 externally-held grants back to
  generator lanes, and resurrected old-grant release flags from its historical
  inputs (spot them: releasedAt equals the transfer's previouslyReleasedAt).
  Fixed: prior claims on external lanes beat regenerated rows, and a LIVE
  grant's lane is immovable under regeneration.
- The shared WEST-host CA finalizer fails its own read-back at line-wraps
  (space lost: "…Northern Reaches County" -> "NorthernReaches", builder line
  2735). Blocks every CA rebuild; not a corpus problem.

## Integration cycle — 2026-09-01 ~15:20 UTC (head cf29f4c96)

- **Verdicts must FLOW or the queue lies.** extract-verifier-returns read only
  `codex-cloud/`; every factory `vf<NN>/rows.json` verdict — including all
  seven genuine passes — was invisible, so passed families sat VERIFY_PENDING
  and repaired families sat FAIL forever. The extractor now sweeps both, keeps
  ONE current verdict per family (later lane supersedes; factory outranks
  codex-cloud), treats NOT_MEASURABLE_HERE / BLOCKED_LEGAL_INPUT as
  unmeasured-not-failed, refuses any "pass" carrying an unmeasured obligation,
  and treats BUILT_RASTER_PENDING as workflow state, not verdict.
- **A completed repair supersedes the FAIL it answered** (released repair
  claim + nine zero counters -> VERIFY_PENDING), and **the claim ledger is the
  ground truth for dispatch ownership** — SDV01's stale roster row shadowed
  sd_arrest_expungement-set for months. Stale ownership is now cleared on the
  family row itself (staleRosterOwner) so every reader agrees.
- **PENDING_EMITS must restore immediate emit at flush.** The flush-only
  version dropped every post-guard write (ledger, prompts) silently while
  printing "Wrote 52 prompts". Wrote-messages are not writes.
- **Two rendered-artifacts shapes exist**: WA-style `artifacts[]`/`document`
  and east `pdfs[]`/`documentId` (rcap-rendered-artifacts/v1). The raster
  queue reads both; refusing the second shape kept both PA families out of
  the queue as "2 PDFs could be canonical".
- **The merged east host (r4 evidence vocabulary + ehf XObject overlay) is
  better than either branch**: NJ went 5 -> 0 knownRequiredFieldsMissing. When
  two agents rewrite one shared host, git's textual merge CAN be the correct
  union — verify with `git merge-file -p` against their common base before
  assuming loss, then rebuild every family the host serves, twice.
- **Raster reachability is measured, not asserted** (`git cat-file -e
  origin/main:<workflow>`). The hardcoded "not on main" record outlived
  reality by days and turned L6 red against 13 legitimately proven families.
- External control plane truth-up: CS-A stood down complete (all six build
  subjects RELEASED on PF17), CLOUD08 complete (vf25 FAIL recorded), CLOUD04/05
  on hold with their idle VF21/VF22 grants released — a verification slot whose
  family fell into repair reads post-repair bytes or it reads garbage.

## R6 follow-ups (2026-09-01, from the UT/VT repair return)

- **Fitter off-by-one-rung** (shared module, ~48 builders): ladder never
  evaluates its declared 6.0pt minimum. Fix is landed but OPT-IN, default
  unchanged; proved over 7,380 combinations (option off = byte-identical
  everywhere). Flipping the default wants one coordinated rebuild + re-raster
  wave, not drive-by adoption.
- **Sibling defects to schedule**: ut_pet_acquittal / ut_pet_conviction /
  ut_pet_dismissed_with_prejudice carry the same agency-use-box defect
  (rebuild byte-neutral, receipts survive); vt_seal_felony /
  vt_seal_misdemeanor / vt_seal_nonconviction / vt_exp_decriminalized carry
  the VT defects (rebuild changes bytes -> re-raster). vt_seal_pardon stays
  excluded (counsel question on the limitation clock).
- **Any VT fixture predating fc1478301 carries a wall clock** and cannot be
  reproduced from its own builder — reproducibility sweep warranted.
- **VT corpusRoot() defect class**: an env-var path joined onto ROOT made
  on-disk sources report BLOCKED_SOURCE. When a lane reports BLOCKED_SOURCE
  on bytes that exist, check path resolution before believing it.
- **A merge resolver that fails leaves the wreckage staged.** The claim-ledger
  union resolver crashed on one integration; `git add -u` then staged the file
  with `<<<<<<<` markers still in it and it was committed. Nothing downstream
  reads a broken ledger silently -- `verify-claim-ledger.mjs` refuses it with a
  JSON parse error at the marker line -- but that check has to actually be run.
  Read the resolver's last line before staging, and run the ledger verifier
  after every resolution, not just at the end of the gate sweep.
- **Recover a conflicted ledger by comparing both sides, never by picking one
  blind.** Both parents are still reachable after the merge commit
  (`git show <parent>:<path>`). Compare claim counts, check that every claim on
  one side exists on the other, and check that no claim released on one side is
  unreleased on the other. When one side is a strict superset with no missing
  releases, taking it whole is provably lossless; when it is not, the releases
  have to be re-applied through `claim.mjs`.
- **A document-level base does not belong to the rows under it.** Lane
  `rows.json` files are appended to by successive teams, so reading `baseSha`
  from the document stamps a later team's commit onto older rows it never read
  -- a stale verdict wearing a current timestamp, which then outranks the fresh
  read that superseded it. Only a base a row states about itself can order it.
- **A short SHA is not a SHA. Never type the tail.** Twice in one session I
  dispatched a raster run against a forty-hex string whose first nine
  characters came from a `git log --oneline` I had just read and whose
  remaining thirty-one I produced from nothing. Both were syntactically valid,
  so the workflow's own guard -- which correctly refuses a branch name or a
  short ref -- passed them straight through, and the run failed later at
  checkout against a commit that has never existed. The guard cannot help
  here: it checks the SHAPE of the input, and a fabricated hash has the right
  shape. The only defence is procedural. Run `git rev-parse HEAD` in the same
  breath as the dispatch and copy the forty characters from that output; if
  the full hash is not on screen in the current turn, it is not known.
- **A gate that passes while its own negative control is MISSED proves
  nothing.** Lane contract L6 -- no family proven while the raster gate cannot
  be dispatched -- reports `ok` on every sweep, and
  `verify-lane-contracts.mjs --mutations` reports `MISSED` on the one case
  written to break it. The green line and the missed mutation had coexisted
  long enough that the sweep's `9/9 checks passed` was read as evidence about
  packets when it was only evidence that the checker ran. Run the mutation
  suites, not just the checks: a contract is only worth what its negative
  control catches, and the two numbers have to be read together.
- **The union resolver treats a release as monotonic, and a reissue can be
  younger than the other parent's base.** Merging FABLE-R14 -- branched before
  the Rhode Island grant was re-opened -- carried that branch's stale
  `released: true` forward and silently closed a grant a live lane was holding
  under an owner decision. The resolver reported `0 regressions`, because by
  its own rule nothing regressed: it only ever moves a claim from held to
  released. Nothing downstream complains either, since a released claim is a
  normal state and `verify-claim-ledger.mjs` still passes. The lane would
  simply have found `ALREADY_RELEASED` on its next assert, mid-repair. After
  every ledger merge, list the grants that were live BEFORE the merge and
  confirm each is still live afterwards -- the resolver cannot distinguish a
  release that happened from a release that was never undone on the other side.
- **A source-blocked family has no build grant, and that is the architecture
  working.** Two cohorts dispatched at the SOURCE_BLOCKED population came back
  with every family NOT_GRANTED, and the reflex reading is a missing Captain
  action. It is not. `claim.mjs locate()` filters by subjectId and laneKind
  before it ever compares a lane name, so the refusal is unconditional for any
  lane string; and `generate.mjs` only mints packet-build grants for families
  that are SOURCE_READY. A family cannot be built while its source is
  unresolved, so the ledger refuses to pretend otherwise. The path is resolve
  the source, let the family become SOURCE_READY, let the dispatch mint the
  build grant, then build. Sending builders at source-blocked families skips a
  step the ledger exists to enforce.
- **`customPleading` does not mean "no source needed".** Source readiness is
  `reasons.length === 0 && (customPleading || bound.length > 0)`. The
  custom-pleading limb substitutes only for the BOUND requirement; it never
  clears `reasons`. Twenty families labelled custom_pleading were dispatched on
  the belief they were held for lacking a PDF they never needed — every one
  names at least one `official-form:` source resolving to zero corpus entries,
  so all twenty are blocked on the reasons limb regardless of strategy.
  Declaring the custody class would have defeated the guard rather than used
  it. And family-level `implementationStrategy` is not reliable for cutting
  cohorts: five of those twenty carry routes whose own currentOutputStrategy is
  official_pdf_fill inside a family the scoreboard labels custom_pleading.

## A repair grant does not survive a family the queue thinks is healthy

I transferred three Utah repair grants onto FIX09 to act on a measured A4
breach, committed, and ran the chain. `generate.mjs` rewrote the ledger from
the queue and dropped all three, because it mints a repair grant only for a
family in FAIL_REPAIR_REQUIRED and those three were COMPLETE_PACKET_PROVEN and
VERIFIED_PASS. The transfer left no trace in the commit and I did not notice
until a later merge reported the same claims as "withdrawn by Captain".

The architecture was right and I was working against it. A repair grant is
downstream of a verdict, not a substitute for one. No verdict in the
repository said anything was wrong with those packets, so nothing could be
granted for repairing them, however certain the finding was.

The order is: an independent read records the FAIL -> the family drops to
FAIL_REPAIR_REQUIRED -> generate.mjs mints the grant -> a repairer works it.
Captain cannot enter that chain at step three, and cannot enter it at step one
either, because Captain measuring a defect and then recording its own verdict
is the self-verification the whole design refuses.

Two consequences worth carrying:

- The claim ledger is BOTH an input and an output of generate.mjs. Anything
  written into it by hand survives only if the queue would have written it
  too. Check a hand-made ledger change against a regenerated ledger before
  believing it landed.
- Do not brief a repair lane on a family whose state does not warrant a
  repair. FABLE-R22 was dispatched to fix three packets it could never have
  been granted, and only its claim-gate check stopped it writing.

## Two lanes repaired the same two families because I dispatched them twice

FABLE-R17 and FABLE-R20 both repaired ar-arrest-seal-set and
ar-misdemeanor-dwi-seal-set, independently, from different bases, and reached
substantially the same fix -- including the same COMPONENT_SET schema
correction. Neither did anything wrong; I put the same two families in two
assignments.

R17 landed first and an independent lane was already reading its bytes, so
R17's version was kept and R20's Arkansas work was set aside rather than
merged over a read in flight. That is the cheapest resolution and it is still
a loss: two lanes spent their time on one problem, and the discarded side had
material the kept side does not (a separate-filing-per-county rule, and the
caption-county versus venue-county data-model question).

Before dispatching a wave, diff the family lists against each other and
against every lane already running. The claim ledger prevents two lanes
WRITING the same family at once; it does not prevent me from asking two lanes
to solve the same problem in different worktrees.

## Brief a lane on the ledger, not on a dispatch snapshot

Three lanes in one wave lost most of their work to the same thing. FABLE-VB was
refused on eight of eight, FABLE-VA on six of eight, FABLE-FA on seven of ten.
Every refusal was correct and every lane stopped exactly where the claim gate
says to.

The cause is that I brief from `ACTIVE_ASSIGNMENTS.json` and the ledger keeps
moving underneath it. The dispatch is regenerated on every `generate.mjs` run,
grants are re-homed as families change state, and other lanes release and
assert continuously — so by the time a lane checks out its base and asserts,
the snapshot I copied into its brief describes a world that has moved on. The
lane then reports `GRANTED_ELSEWHERE` or `ALREADY_RELEASED` and, correctly,
reads nothing.

Two rules follow.

FIRST: brief the LANE, not the list. Say "you hold VF05, VF06 and VF07; read
ACTIVE_ASSIGNMENTS at your base and take exactly what those ids name — the file
is the authority, not this brief". Every lane that was told this handled the
drift gracefully. A brief that hard-codes family names invites a lane to trust
a list I cannot keep current.

SECOND: verify the grants are live AT THE BASE YOU HAND OVER, not at the
moment you write the brief. Read the ledger for that commit and confirm each
subject is live on the lane before dispatching, and hand over a base that
already carries the grants. I twice committed transfers AFTER writing a brief
that named an earlier base, which is how VF10 and VF12 were sent to read at a
commit that predated their own grants.

The pattern that works, and the only one that has: run the generator, read
ACTIVE_ASSIGNMENTS, commit, and hand the lane the commit it was read from.

## A generated file is not a place to store work

Twice in one session the same shape: a lane established something, wrote it into
a file a generator owns, and the next chain run erased it silently.

- ACQ's five acquisition addresses went into SOURCE_ACQUISITION_MANIFEST.json.
  `generate-source-conveyor.mjs` rebuilds that file from scratch. 165 lines out,
  8 lines in, and the file still looked well-formed afterwards -- just smaller.
- The wiring records' component digests went the other way: the generator
  refreshed only `binding` and left the digests alone, so ten families repaired
  after their wiring was written kept a pin naming superseded bytes. One record
  disagreed with itself three lines apart -- a stale component sha256 above an
  acceptanceReceipt carrying the new one.

The rule both cases teach: **whatever a generator writes, a generator must be
able to reproduce.** If a fact cannot be derived, it belongs in a committed
return the generator reads -- never typed into the generator's own output. And
a field that is a MEASUREMENT (a hash, a page count, a byte length) is never
"left alone out of respect for the proposal"; leaving a measurement alone is how
it becomes false.

## A verifier reading a stale base reports fixed defects

FABLE-VC returned a preflight refusal on Vermont -- two byte-identical corpus
entries at one form number, resolver requires exactly one -- that had already
been fixed by the one-identity-at-several-paths collapse. Its base predated the
fix. Two of its three infrastructure findings were live and one was history.

Check a returned defect against current HEAD before repairing it. The lane is
not wrong; it is reporting what it saw, which is what a lane is for.

## Two families sharing one render is not automatically a collision

vt_seal_felony-set and vt_seal_pardon-set ship byte-identical canonical.pdf and
boundary.pdf. That looks exactly like one build overwriting another. It is not:
their production field maps differ in three leaves, all of them
`documentPolicy.routeKey`, and in nothing else -- every write box, fill value
and geometry is identical because Vermont prescribes one petition, 200-00130A,
for both routes. The participant instructions do differ, and only the pardon
packet mentions a pardon.

Diff the field maps before calling identical fixtures a defect.
