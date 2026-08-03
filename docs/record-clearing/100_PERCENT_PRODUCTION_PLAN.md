# Record clearing — production plan to 100 percent

**Status** Plan of record for execution sequencing. Not a legal-design document.
**Authored** 3 August 2026
**Base commit** `8df94fb`
**Branch** `plan/record-clearing-100-percent`
**Authority** Master Library Edition 1.2, `7edd0a0e8308b58e12f59494a326342cc83dd362bb58f787e43d6fb475ef43bd`
**Machine-readable form** `planning/record-clearing-100-percent/production-plan.json` and `planning/record-clearing-100-percent/jobs/*.json`

**72 jobs · 8 waves · 11 lanes.** This plan implements nothing. It changes no
legal-design memo, alters no Master Library authority, regenerates no shared
registry and promotes no route.

---

## 1. What the repository actually says today

Every number below was recomputed from the repository at the base commit rather
than accepted from the brief.

| | Stated | Repository | |
|---|---|---|---|
| Jurisdictions | 51 | 51 | ✓ |
| Normalized jurisdictions | 26 | 26 | ✓ |
| Normalized tracks | 250 | 250 | ✓ |
| Master Library | Edition 1.2 | Edition 1.2 | ✓ |
| Mississippi Tranche 1 | implemented | 5 tracks, `awaiting_counsel_review` | ✓ |
| `packet_ready` | 0 | 0 | ✓ |
| Enabled jurisdictions | 0 | 0 | ✓ |
| Authority-cleared / blocked | 82 / 168 | **87 / 163** | corrected |

**The correction.** `track-source-audit.json` at `8df94fb` records
`tracksCleared: 87, tracksBlocked: 163`. 82/168 was the pre-Tranche-1 figure;
Tranche 1 closed the guidance-specification gate on five Mississippi tracks and
moved it 82 → 87, which `PACKET_IMPLEMENTATION_TRANCHE_1.md` records verbatim.
The plan is built on 87/163.

The 250 tracks: **121** `official_pdf_fill`, **58** `process_guidance`, **46**
`custom_pleading`, **25** composed. The 25 outstanding jurisdictions are
KY, NC, ND, NE, NH, NJ, NM, NV, NY, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VA,
VT, WA, WI, WV, WY — all 25 already have a controlling retained legal review, so
none is blocked on review authority.

### Two promotion machines, not one

The repository contains two promotion machines that share vocabulary and nothing
else, and confusing them is the easiest way to misread progress.

| | Screening promotion | Packet delivery |
|---|---|---|
| Gate | `canApproveForLive` | `computeRuntimeStatus` |
| State | **51 of 51 live** | **0 of 51 `packet_ready`** |

"51 states live" means screening routes. It does not mean any jurisdiction can
deliver a packet. Every `ReliefTrack` in the repository is `runtimeDisabled` and
`technicalFixture`.

---

## 2. The ceiling, and why it is the critical path

**All 443 retained Edition 1.2 assets carry `generation_allowed = no`.**
Verified directly against `MASTER_ASSET_MANIFEST.jsonl`: 443 of 443 rows, zero
exceptions, across all six asset classes.

No official-form component in any of the 250 tracks can become
resolver-selectable under Edition 1.2, however much of the backlog is cleared.
Eight components across five tracks prove it today — Georgia
`ga-nonconv-pre2013` and four Missouri routes are fully matched, correctly
roled, correctly hashed, and blocked by the flag alone.

**This gates 144 of 250 tracks** — 88.3 percent of the blocked population and
57.6 percent of the whole corpus. Clearing it means publishing a successor
edition that flips the flag **per asset**, with all four release gates recorded,
and then performing a per-track auditable promotion in this repository. The
immutable-edition rule forecloses editing Edition 1.2.

### The blocker partition

Every one of the 163 blocked tracks, assigned to its hardest remaining
dependency:

| Category | Tracks | What it takes |
|---|---:|---|
| Resolvable in-repo | **41** | SHA pinning, guidance-spec authoring, remapping to an already-retained asset |
| External acquisition or licensing | **96** | 109 distinct documents from their issuers |
| New Master Library edition | **14** | Reclassify an asset's class, role or identity |
| Legal-design blocker only | **12** | A legal answer, not a source |

**The caveat that shapes the whole plan:** closing all 221 in-repo components
produces **zero shippable tracks**. It moves 138 more components into the
fully-matched-but-generation-blocked state — a seventeenfold increase in that
population. The in-repo work is cheap, safe, parallelizable preparation that
only yields product value when paired with the edition promotion.

### The single highest-leverage correction costs nothing

Nine Illinois components name "Ill. S. Ct. R. 298 Application for Waiver of
Court Fees" and are recorded as needing acquisition. The document is already
retained as `IL:FW-CIV-APPLICATION:APPLICATION:EN`, byte-identical to the
published copy. Nine tracks, zero external cost. Job `AUTH-02`.

### The one thing money cannot buy

Kansas. All 30 Kansas acquisition rows are `commercial_use_hold`: the Judicial
Council publishes its forms for non-commercial use only. Six tracks. The blocker
ledger warns explicitly that the gate must not be evaded by relabelling the
route as a custom pleading. Job `EXC-01` decides licence, withdraw, or terminal.

---

## 3. What can start today

**92 tracks — 37 percent of the corpus — need no edition, no acquisition and no
platform change.** They use only what Tranche 1 already built.

| Job | Tracks | Reuse |
|---|---:|---:|
| `IMP-CP-02` guidance-spec unblock (MS, KS, ME) | 7 | **100** |
| `IMP-CP-01` Georgia superior-court pleading family | 10 | 95 |
| `IMP-CP-04` single-petition pleading states (7 jurisdictions) | 11 | 95 |
| `IMP-CP-03` DC superior-court motion family | 6 | 90 |
| `IMP-GU-01`…`IMP-GU-05` guidance routes | 58 | 85 |

`IMP-CP-02` is the highest-reuse job in the plan: seven tracks blocked by
exactly one reason, and that reason is a document LegalEase writes itself.

---

## 4. Waves

| Wave | Name | Jobs | Lanes |
|---:|---|---:|---:|
| 0 | Foundations | 5 | 3 |
| 1 | Unblocked implementation, authority campaign, normalization opens | 15 | 4 |
| 2 | Platform foundations and the source-clean official families | 13 | 4 |
| 3 | Post-acquisition official, overlay, composed, conversion | 16 | 5 |
| 4 | The 25 newly normalized jurisdictions | 7 | 5 |
| 5 | Template-family review and counsel adoption | 10 | 2 |
| 6 | Staging promotion | 2 | 1 |
| 7 | Production promotion | 4 | 1 |

**Wave 0** builds the five things that do not exist: a Batch 3 expected-track-ID
set (without which no normalization pod can be reconciled), template-family
hashing, a per-track promotion contract, packet persistence, and a staging
contract.

**Wave 1** runs four lanes at once: 92 tracks of unblocked implementation, the
in-repo authority pass, the tier-1 acquisition campaign and Edition 1.3, and the
first two normalization pods.

**Wave 2** lands the four platform capabilities, then Maryland — the first real
AcroForm field-map family — and the four families that inherit it directly.

---

## 5. Grouping

### Normalization: five balanced pods

Balanced on counted source slots, then form richness, then statutory family,
then local-input burden.

| Pod | Jurisdictions | Slots | Forms |
|---|---|---:|---:|
| `NORM-01` form-rich | KY, ND, NE, SD, NM, WI | 47 | 36 |
| `NORM-02` northeast automatic-plus-petition | NY, NJ, RI, NH, VT | 51 | 18 |
| `NORM-03` mid-Atlantic | PA, VA, WV, OH, TN | 51 | 17 |
| `NORM-04` west | UT, WA, NV, OR | 46 | 21 |
| `NORM-05` Texas and south | TX, SC, NC, OK, WY | 51 | 27 |

246 slots total; at the 0.988 slots-to-tracks ratio measured across Batches 1
and 2, that is **about 243 new tracks**, band 231–253, for a projected
nationwide **493**.

**The hazard that dictates the shape.** The intake rebuilds seven whole-corpus
files from whatever memos are in the directory at run time, and the reconciler
rebuilds nine more. A pod holding only its own memos would silently delete every
other jurisdiction's tracks from all seven. So **pods commit memos only**, and
exactly one job — `NORM-06` — runs the intake and the reconciler with all 51
memos present, in the order intake → reconcile → intake.

### Implementation: grouped by reusable architecture

Not by state order. 27 implementation jobs across five archetypes, 6–15 coherent
tracks each where source and legal identity are stable.

- **Custom pleading** — GA (10), guidance-spec unblock (7), DC (6), single-petition states (11), HI (8)
- **Official AcroForm** — MD (6), CA (8), IL (9), CO (8), small statewide (11), AL (9), AZ (8), FL (8), IN (6), MO (6), AR (11), DE/MA/ID (11)
- **Flat-PDF overlay** — IA/MN/GA/IL (11)
- **Composed** — sequential (6), alternative-branch (8), LA statutory (7), MT/ME conversion (6)
- **Guidance** — 58 tracks in five jobs, grouped by `destination.kind`

Renderer split across the 327 form-like assets: **191 AcroForm**, **117
flat-PDF**, **19 needing conversion first**. One live XFA asset in the
normalized 26 (MA `TC0021`, one track).

### The jobs that must go first

1. **`AUTH-04` Edition 1.3** — the only path by which any of the 121 official tracks can ever render.
2. **`IMP-OF-01` Maryland** — the first real AcroForm field-map family. It converts `AcroFormFillStrategy` from a fixture-only path into a proved production path and authors the official-form authority-pin, field-ownership and visual-review records that eleven downstream jobs inherit. A Tranche 2 proof already exists.
3. **`IMP-CP-01` Georgia** — proves the Tranche 1 pleading stack generalises to a second caption convention.
4. **`PLAT-02` composed unit model** — 25 tracks, six already authority-cleared, blocked on a schema that does not exist.

---

## 6. Critical path

```
F-01 · F-02
   └─ AUTH-01 · AUTH-02 · AUTH-03
        └─ AUTH-04  Edition 1.3               ◄── the ceiling
             └─ PLAT-01  official source binding
                  └─ IMP-OF-01  Maryland      ◄── the reusable field-map family
                       └─ REV-02  family review
                            └─ ADOPT-02  counsel adoption   ◄── human only
                                 └─ F-04 · F-05
                                      └─ STG-01  staging
                                           └─ PROD-01 · PROD-02 · PROD-03
                                                └─ PROD-04  partition audit
```

**The longest uncompressible segment is not engineering.** 109 distinct
documents must be obtained from or re-confirmed with their issuing authorities,
and the repository records no owner, no channel and no expected date for any of
them. Three rows record why automated retrieval failed — HTTP 403, a bot
challenge, an unreachable host — and none records a working alternative.

Counsel adoption is the second uncompressible segment, and the five `ADOPT-*`
jobs are the only jobs in the plan a machine may not perform.

---

## 7. Review model

Counsel reviews a **template family** once. A later track claims coverage
mechanically, by hash.

**Counsel receives:** representative packets and every branch variant with their
rendered SHA-256; the family's template, source and mapping hashes; the
authority archive and controlling review hashes; a legal-output recommendation
per track — approve as implemented, approve subject to listed correction, or
hold; the unchanged-template hash list; and the exception list.

**Coverage holds only when** every template, source and mapping hash matches the
adopted set, branch variants are a subset, the authority hashes match, exceptions
are covered, and no release blocker is open. Any single mismatch produces a delta
review job naming exactly which hash moved.

**Three things must be built** (`F-02`), because the repository today hashes
outputs and authorities but never the templates that produce them:

- `canonicalTemplateHash(templateId)` — a stable hash of the template *object*, so an unrelated edit to a shared file does not invalidate every family in it
- `mappingSha256` on `PacketAssetBinding` — today `mappingApproved` is a naked boolean and an edited field map silently keeps its approval
- `verify-rcap-template-family-coverage.mjs` in `npm test`

The pattern already exists twice in the repository: the restricted-change guard
pins an acknowledgement to `git rev-parse HEAD:<path>`, and the Tranche 1
verifier re-hashes a pinned statute against disk and fails on mismatch.

---

## 8. What 100 percent means

A jurisdiction is not complete because it is normalized, and a track is not
complete because it is implemented. Every track lands in exactly one of four
terminal states, and the partition is provable by count.

| | State | Proving artifact | Today |
|---|---|---|---:|
| **A** | Production enabled | Capability matrix plus a green proof-required delivery verifier | 0 |
| **B** | Implemented guidance with final authority | Guidance re-review queue absent-or-answered, plus the specification and the adoption record | 0 |
| **C** | Deliberately excluded on a controlling legal or commercial reason | Memo `legal_rejected`, or a deferred-tracks entry, plus the blocker ledger | 7 |
| **D** | Fail-closed on exactly one external dependency, no internal work left | Blocker ledger and acquisition queue, plus a green track verifier proving technical completeness | remainder |

Guidance is **not** a lower bar. Terminal B still requires `legal_approved` and
`visual_review_passed`; it is a different outcome, not a weaker one.

**The distinction the audit exists to force.** Tranche 1's own record shows it:
`ms-diversion` was excluded to keep a tranche bounded and is terminal-C, while
`ms-dui`, `ms-drug-cd` and `ms-mip` are blocked *only by their own undrafted
guidance specifications* — internal work, not exclusion. An unwritten
specification, an undrafted field map or an unapplied migration is never
terminal-D.

`PROD-04` adds a verifier asserting the four sets sum to the track count, that
their pairwise intersections are empty, that every terminal-D track names
exactly one external dependency from the closed set, and that no terminal-D
track holds an open internal work item.

---

## 9. Status vocabulary

The pre-adoption status this repository enforces is **`awaiting_counsel_review`**.
The strings `recommended_for_counsel_adoption` and `awaiting_counsel_adoption`
do not exist anywhere in it. `verify-rcap-tranche-1-packets.mjs` asserts the
enforced value and that the serialized review manifest contains none of
`legal_output_approved`, `counsel_approved`, `packet_ready`,
`generation_allowed` or `enabled`. Every job in this plan uses that vocabulary.

A machine may set `research`, `technical`, `runtime` (derived) and
`sourceCurrent`. A machine may **never** set `legal = legal_approved`,
`visual = visual_review_passed`, or `runtimeDisabled = false`.

---

## 10. Infrastructure that does not exist

- `rcap_packet_fulfillments` and `rcap_packet_artifacts` — read and written by `SupabasePacketRepository`, **no migration anywhere in `supabase/`**
- storage bucket `rcap-document-packets-private` — referenced, not defined
- RLS on both tables — every other RCAP table has it; these two would be the exception
- eight packet environment variables absent from `.env.example`
- **no staging environment** — `PromotionStatus` has no `staged` value, there is no staging CI job, and deployment is out-of-repo and unmodelled
- **no per-track promotion contract** — promotion is per jurisdiction and per channel only; there is no `trackId` anywhere in the batch schema

`supabase/` is a restricted prefix, so every new migration additionally needs a
hash-pinned acknowledgement in `docs/rcap-promotion/inherited-restricted-changes.json`.

---

## 11. Commercial priority, and how weak the evidence is

**Stated plainly: the repository contains no measured demand data.** The only
partner signal is three seed fixtures with `example.org` addresses, one of them
named "Demo Justice Access Partner". There is no per-state consumer volume
anywhere, and the high-volume state list is quoted from an internal dashboard
whose numbers are not in the repository.

On that evidence: **MS** (only paid provisioned partner, already implemented),
**GA** (two partner records, best-cleared jurisdiction at 13 of 15),
**MD** (all five acquisition rows already acquired and merely source-gated; a
Tranche 2 proof exists), **CA** (30 of 31 official components retained),
**DC**, **IL**, then **TX** once normalized.

**A governance conflict to settle before the first enablement:**
`state-promotion-rules.ts` sets `partialStateRolloutAllowed: false` and requires
all 51 to launch together. That rule governs the legacy screening lane. Someone
must decide whether it binds the packet lane, because commercial sequencing of
packet tranches must not be read as authorising partial promotion in the legacy
lane.

---

## 12. Using this plan

Each job in `planning/record-clearing-100-percent/jobs/` carries its `jobId`,
wave, lane, model, effort, jurisdictions, exact track IDs, dependencies,
`ownedPaths`, `forbiddenPaths`, outputs, focused gates, commit subject,
completion condition, the exact blocker it resolves, a commercial-priority score
and a reuse score.

Two rules govern parallelism:

1. **No two concurrent jobs may share an `ownedPath`.** The `forbiddenPaths` on
   every job name the shared registries and the Master Library derived records
   precisely because those are rebuilt wholesale.
2. **The normalization lane serializes at exactly one point** — `NORM-06`. Pods
   before it commit memos only.
