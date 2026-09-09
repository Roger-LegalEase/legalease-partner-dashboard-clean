# 73 families are SOURCE_READY. 32 of them can be built in this container.

**Measured 2026-09-09** at `91977e016`, after the SRC05 custody correction and
after installing the D source packs. Every number here comes from running
`scripts/verify-packet-build-environment.mjs --family <id>` over all 73
`SOURCE_READY` families and joining the result to the committed corpus index.

## The two questions SOURCE_READY answers at once

`generate.mjs` states the intent plainly: *"SOURCE_READY means a builder can
open the bytes, not that the census can name them."* But `sourceReadiness`
accepts a binding whose held path is `google-drive:<fileId>` or
`github-actions-artifact:<id>` — deliberately, and the code says so: *"Prefer a
local governed path, then an owner-only Drive receipt, then a time-limited
hosted artifact. All three retain the exact hash."*

That is a good answer to **"is an authorized acquisition of this exact digest on
record?"** It is not an answer to **"can a builder open the bytes?"**, and the
row gate asks the second. So the state means both things at once, and the
difference is 41 families.

This is not a defect to patch under three running build lanes, and the row gate
already refuses every family whose bytes are not here — nothing can be built on
absent bytes. What was missing was the count. Here it is.

## Where the 73 stand

| | families | what it means |
|---|---:|---|
| **buildable here now** | **32** | every source resolves to held bytes at its exact digest |
| every source in a custody not mounted here | 15 | the bytes exist and are proven; this container has no tree for them |
| sources split across a mounted and an unmounted custody | 13 | part resolves here, part does not |
| bound to the SRC05 phantom custody | 8 | no custody anywhere holds these bytes — see `SRC05_PHANTOM_CUSTODY.md` |
| bound only by an acquisition receipt | 7 | the digest is recorded from a Drive or Actions object and appears in no corpus-index entry |

The 32 that bind, by jurisdiction: LA 4, MT 4, AR 3, NH 3, NC 2, NE 2, TX 2, and
one each in CO, DE, FL, IA, IL, IN, ME, ND, OR, UT, WA, WV.

## What changed today, and what it bought

The D source packs (release `rcap-d-source-packs-2026-08-12` on this
repository, three archives verified against their pinned SHA-256 before
extraction, 343 files) were not installed in this container. They are now, at
`private/source-imports/rcap-d-source-packs-2026-08-12`, and
`corpus_matches_committed_index` now compares that custody instead of skipping
it.

It moved two families — `tx_nd_automatic_misdemeanor_deferred-set` and
`tx_nd_dwi_conviction-set` — from refused to binding, and regressed none. The
modest yield has a cause worth recording: most D-pack documents are already
reachable here by content hash from the Master Library, so mounting the pack
adds a path rather than a byte.

## The one input that is missing, and what it is worth

**The Nationwide Corpus Recovery Kit, SHA-256
`db8a02db11f3951dfffe34fa443d444d53ab4e09bce25767960905396a54f6f1`.**

`scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs` stages it into the
`nationwide_recovery_pool_2026_09_02` custody — 513 of the operational corpus's
583 files, each re-hashed from the staged bytes against
`data/rcap-all50/nationwide-restore-manifest.json` and deleted rather than
staged if it does not match. The kit is not on disk here, and it is not
published: checked today, `Roger-LegalEase/legalease-source-artifacts` release
`source-corpus-2026-08-28` carries the Master Library, its checksum, an Oregon
pack and a recovery report, and nothing else. FIX94 recorded the same blocker
against five Illinois families and stopped BLOCKED_SOURCE for it.

Installing it would make **15 families buildable outright** — every source they
name sits in that pool — and unblock the mounted-plus-unmounted half of **13
more**:

> ca-diversion-seal-set · census-pending-family:ME:juvenile-sealing ·
> de_discretionary_superior_court-set · de_pardon_expungement-set ·
> hi_712_1200_deferred_expungement-set · hi_nonconviction_expungement-set ·
> ky_protective_order_record_expungement-set · ma-expunge-k-set ·
> ma-seal-admin-set · ma-seal-court-set · ma-seal-decrim-set · me-seal-gen-set ·
> nd-regular-pardon-set · rcap-hi-custom-pleading · wv_conv_nonviolent_felony-set

Either form works: the kit archive at that digest, or the same bytes published
as an asset in the source-artifacts release. The staging script verifies the
contents against the committed manifest either way, so a wrong or partial tree
is refused rather than trusted.

## The seven bound only by a receipt

`fl-expunction-set`, `fl-juvenile-diversion-set`, `fl-sealing-set`,
`ia-12346-set`, `ia-901c3-set`, `ia-dci77-set`,
`nd-prohibit-remote-public-access-set`.

Each names a digest recorded by a committed acquisition return whose held path
is a Google Drive fileId, with no entry at that digest in the governed corpus
index. The acquisition is real and the hash is exact; what is absent is a byte
in a custody. Fetching them into a governed custody is the same class of work as
the fourteen in `SRC05_PHANTOM_CUSTODY.md`, and the fileIds are in each
family's acquisition return.

---

## Update, 2026-09-09: the recovery kit landed and the queue nearly doubled

The Nationwide Corpus Recovery Kit arrived as eight desktop-uploaded chunks,
every one verified against its own `chunk_sha256`, joined to the exact original
(228,260,257 bytes, `db8a02db…`), and staged through
`scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs`: 513 files verified, 0
rejected, 51 jurisdictions. The kit's own reconstructor refuses the complete
operational corpus — `RECOVERY_REFUSED: recoverable 513/583, missing 70,
wrong-size 0` — and is right to; what mounted is the PARTIAL pool.

| | before | after |
|---|---:|---:|
| row gate binds | 32 | **43** |
| every bound source is a held PDF | 25 | **42** |
| not measurable here | 43 | **26** |

No family regressed on either measure.

Newly binding: al-trafficking-set, hi_712_1200_deferred_expungement-set,
hi_nonconviction_expungement-set, md_10105_early-set, md_pardon_expungement-set,
mn_petition_15218-set, mn_petition_609a02_subd3-set,
mn_petition_juvenile_as_adult-set, rcap-hi-custom-pleading, ut_pet_cannabis-set,
wv_acc_treatment_job_readiness-set.

The build queue now stands at 42, led by LA 4, MA 4, and HI, MN, NH and WV at 3
each — the Massachusetts four and the Minnesota three had been unreachable in
this container since the sprint began.

`corpus_matches_committed_index` now compares every declared custody except the
SRC05 phantom, which has no bytes anywhere by definition. The eleven files that
custody still owes are unaffected by this recovery; they were never in this
pool.

### What is still owed

Seventy manifest files are absent from the pool, so the operational corpus stays
incomplete and `private/Nationwide Record Clearing` stays empty and reserved.
The exact missing path-and-hash list is what the kit's reconstructor writes to
its report, and that list — not this pool — is the remaining acquisition task.
