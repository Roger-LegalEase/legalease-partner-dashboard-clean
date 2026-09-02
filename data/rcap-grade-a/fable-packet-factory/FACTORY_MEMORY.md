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

## A lane that creates its branch by checking out shares Captain's working tree

Three lanes launched in one stretch created their branches with `git checkout -b`
in `/home/user/legalease-partner-dashboard-clean` itself — the main worktree.
The harness gives a lane its own worktree only when it asks; these did not, so
all three, and Captain, were committing to the same checkout at the same time.
Captain's own integration commit landed on a lane's branch, discovered only
because `generate.mjs --check` reported two dispatch pins and the branch name in
`git worktree list` was not the Captain branch.

Recovered with `git branch -f` (the lane branch was a clean descendant of the
Captain tip, so nothing was lost), then a checkout back onto the Captain branch.

Three rules follow, and none of them is optional:

1. **Every lane brief must say where the lane works**, in an exact command:
   `git worktree add .claude/worktrees/<lane> -b fable/<lane> <captain-sha>`.
   "Create your branch from that SHA" is not enough — it does not say WHERE.
2. **Every lane brief must forbid `git checkout`, `switch`, `branch -f`,
   `reset`, `stash`, `merge` and `rebase` in the main worktree by name.** A
   lane's `git checkout .` there would destroy in-flight integration work.
3. **Check `git rev-parse --abbrev-ref HEAD` before committing** when lanes are
   running. Captain's branch is the only branch Captain may commit to, and a
   lane can move it out from under a commit that is already staged.

A brief that tells a worker WHAT to do and not WHERE to do it has only done half
the job.

## A released grant with no artifact is usually a handoff, not an abandonment

Twice in one session a lane reported the same alarming thing: families whose
grants read `released: true` with no overlay directory, no rows.json row and no
evidence anybody built them. FABLE-PD found five agency treatments released
inside 0.3 seconds; FABLE-CA2 found three California families with released FIX
grants it could not re-assert.

Both were real observations and both had the same benign cause: the families are
out with an EXTERNAL worker. `data/rcap-grade-a/external-worker-control/EXTERNAL_ASSIGNMENTS.json`
holds them — CODEX-CS-A has the five agency treatments for packet-build,
CODEX-CS-B has the three California families for rapid-repair — and the internal
grant was released precisely SO the external worker could hold it.

Captain made the mistake too, and worse: I reissued grants on all three
California families before checking, double-booking them against CODEX-CS-B, and
the E2 gate is what caught it.

**Before treating a released grant as abandoned work, read the external worker
index.** A grant released with no artifact means one of three things and the
index distinguishes them: the subject is out with an external worker (leave it
alone), the lane finished and the artifact is elsewhere (find it), or the work
really was dropped (reissue). Only the third is a reissue, and it is the least
likely of the three.

## The dispatch and the ledger can disagree, and only the ledger stops a worker

The dispatch names a lane for a family; the ledger decides whether that lane may
assert it. Nothing reconciled them, so twenty-six families were dispatched to
lanes whose assert would answer ALREADY_RELEASED. A lane reads its brief, tries
to claim, is refused, and correctly stops — which looks like a lane failure and
is a dispatch failure.

generate.mjs now reissues in exactly that case, under six conditions, and the
conditions matter more than the mechanism: the dispatch must name THIS lane, the
reissued claim must sit on THAT lane, every prior claim must be released, the
family's state must owe the operation, no external worker may hold it, and it
must not have been released after its last reissue. Three of those six were
added only after a gate caught the version without them.

## A ledger merge is a three-way merge, not a union

Two branches both appending to `claim-ledger.json` looks like a union, and for
a while it was resolved as one. It is not, for two reasons that each cost
something real.

Captain **deletes** claims: `generate.mjs` withdraws a live grant when the
dispatch stops carrying its lane. So a claim present in a branch and absent
from Captain's side is usually a deliberate withdrawal, and a union
resurrected four of them as live.

And "a released copy supersedes an unreleased one" is only true when the
release is the *newer* fact. A branch cut before a repair was reopened carries
the old released copy; taking it marked a repair finished on a family that was
sitting at FAIL_REPAIR_REQUIRED waiting for exactly that repair.

Use the merge base. Per claim, whichever side differs from the base is the side
that changed it; both sides changing it differently is a real conflict and must
refuse rather than resolve. Presence merges the same way. Keep the append-only
order — `claimsDigest` is taken over the claims *in order* — and recompute the
digest, since it is a function of the claims.

## A refusal that discards good work is not strictness

`extract-verifier-returns.mjs` refused to write anything when any row was
unreadable. Every bad row was already skipped by a `continue`, so the only
thing the global refusal added was throwing away the *good* rows. Seven rows
carrying the token "UNMEASURED" froze the entire extraction; the committed
file stood still for over an hour while the generator went on reading it, so
the queue looked settled and was stale, and a lane's four passes and two
genuine legal-safety failures could not reach it.

Scope a refusal to the thing that is actually broken, and carry the refusals
*in* the document — durable and countable — rather than in a console line
nobody re-reads.

## An older repair cannot answer a newer verdict

A family with an independent FAIL, a released repair grant and clean counters
was being sent to VERIFY_PENDING on the assumption that the repair had done
what the verdict demanded. Nothing checked the order. A verdict read at a base
that *already contained* that repair was cleared by it anyway, and a packet
that told a non-citizen participant nothing about immigration consequences sat
as merely unverified. The lane's own summary: the gap survived a fail, a repair
and a pass.

The ledger cannot order releases against verdicts, but git can: ask whether the
family's own artefacts moved between the base the verdict was read at and this
head. Unmoved means the verdict describes *this* head and no earlier repair
answers it. Unorderable falls to FAIL, because a defect nobody can show was
fixed is a defect.

And be careful what counts as moving. The first version of that test looked at
the whole family directory, and on its first run a refresh of the generated
`product-wiring.json` released two failures. A regenerated digest cannot answer
a finding about what a sentence says. Exclude what this factory's own
generators write; include the build script, which lives outside the directory
and is where several repairs actually land.

## A hard-coded list of lane returns will silently lose work

The conveyor reads hand-established addresses from lane returns precisely
because the manifest is regenerated and work written into it disappears. The
roster of *which* returns to read was itself hard-coded, so a lane committed
fourteen families of address work and the conveyor saw none of it — no gate
refused it, nobody had added the filename. Read the whole directory in sorted
order and let the admission rule decide; refuse two returns claiming one
address rather than letting file order pick a winner.

## A label can name a different document in each family

The tier-3 identity map is global, and for almost every `official-form:` label
that is right — the Indiana CCA forms and the Texas statement of inability
really are one statewide document everywhere they are named. `servesFamilies`
records which families a reading lane looked at, not an exclusive licence, so
scoping every finding to it falsely unbinds fourteen of those.

But Arkansas publishes a separate order to seal for felonies and for
misdemeanours under one census label, and Iowa's "Certification of Service by
Mailing or Delivery" is not published at all — it is printed inside each
family's own application form. Globally, the first shape hands one family the
other's document whenever only one half is held; the second poisons the label
so neither binds. Hence `labelIsFamilySpecific`, opt-in per artifact: admitted
only for the families it names, and its label withheld from the global map
entirely, because the content of the flag is that the label does not identify
one document.

## Verify a new gate by making it fire

A check that passes on a clean tree has proved nothing. F24 was extended to
catch a dispatch naming a subject another lane holds live — a hole that cost
two verification lanes half their runs in exit-8 refusals. It was confirmed by
injecting exactly that condition into a scratch copy of the ledger, watching
F24 go red, and restoring. Green-before and green-after is not evidence.

## Look for the repository's tool before writing your own

`scripts/grade-a-packet-factory-24h/resolve-claim-ledger-merge.mjs` is the
ledger merge resolver, and its header says it was moved out of a scratchpad
into the repository precisely because it kept being lost. It was then not used
for four integrations, because a scratchpad resolver was written from scratch
instead — and that one, rederived under time pressure, had to learn the same
lessons in the same order: that a union resurrects grants Captain withdrew,
and that a stale release closes a repair that was deliberately re-opened. Both
rules were already written down, with the incidents that produced them.

It still missed the fourth rule. `ledger.releases` and `ledger.reissues` are
logs beside the claims, and taking `ours` wholesale for every top-level key
kept the released flags while dropping thirty release and eighteen reissue
entries the merged lanes had written. The claims said released and the log did
not say when or by whom. The committed resolver merges both logs by key and
re-sorts them; the entries were recovered afterwards by applying that same
rule late.

Before writing a tool for an integration step, grep `scripts/` for one. The
scratchpad is for probes and measurements, not for the mechanisms an
integration depends on — anything the next Captain will need belongs in the
repository, which is the whole reason that file is there.

## A claim that refuses is telling you who owns the family

FABLE-FIX05 found both its grants at exit 9 ALREADY_RELEASED, with no other
lane holding them, and its environment then refused `claim.mjs --reissue`. It
stopped and measured rather than hand-editing the ledger, which was right.

Captain then reissued one of them from here — and external check E2 refused it,
because `ca-1203-4a-set` is held live by external worker CODEX-CS-B. That is
the third time E2 has caught this same Captain error, and it also explains what
the lane ran into: the grant had been released *because the subject is
externally dispatched*, not because the work was done.

So a refused claim is information about ownership, not an obstacle to route
around. Before reissuing anything, read
`data/rcap-grade-a/external-worker-control/EXTERNAL_ASSIGNMENTS.json`: a
subject there belongs to that worker, and the finding you want to act on
belongs in their hands, not in a new lane's.

## A nested field tree hides fields from a scan of /Fields

`detachFromAcroForm` walked only the AcroForm's own `/Fields` array. ISO
32000-1 8.6.1 lets field trees nest, and California's CR-409 puts one entry
there with its four footer pushbuttons five `/Kids` levels below it. Everything
downstream looked correct — the pushbuttons were classified for suppression and
the detachment was called — and nothing was removed, so `getFields()` still
walked them, `updateFieldAppearances()` regenerated the appearance from
`/MK /CA`, and `flatten()` stamped it through the widget's own `/P`.

Two general lessons. A scan over a tree structure has to recurse, and a form
library's top-level array is a tree root rather than a list. And when a fix
finally *does* reach something, look at what it reached: removing all five
pushbuttons broke a sentence, because the fifth carried the form number
"MC-031" inside text the court printed. Chrome and content can wear the same
widget type; only the artifact tells you which.

## A rebuild drops the wiring binding block, and the chain puts it back

A build script does not emit `product-wiring.json`'s `binding` block —
`generate-product-wiring.mjs` installs it. So a rebuild silently drops it, and
a lane that commits mid-chain ships a record without it.

Measured rather than assumed: deleting a binding block and running the wiring
generator restores it, acceptance receipt and all, because the receipt is
rebuilt from the raster queue. So this self-heals through the standard chain
and only bites a lane that commits without running step 8. Restore from HEAD
if you must commit early, and do not treat the loss as permanent.

## Do not generalise a corpus gap from one state

FABLE-DISC05 measured Arkansas against the Nationwide inventory and found 22 of
26 files already held, concluding a mount would be cheaper than a fetch. That
is true of Arkansas and false of the country: nationally only 212 of 583 are
duplicates, 237 unheld files are form-shaped, and up to 99 of the 111
SOURCE_BLOCKED families sit in a jurisdiction where that tree holds forms this
repository does not. Arkansas is the best-covered state in the inventory.

Both records carry hashes, so the national answer was one arithmetic pass over
two committed files. When a lane hands you a sample and a conclusion, the
sample is usually sound and the conclusion is usually scoped to it — run the
same comparison over the whole denominator before you plan around it.
