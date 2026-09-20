# RCAP External Action Register

Every item that depends on someone outside the build. Nothing on this list waits
indefinitely: at `dueAt` the owner either resolves it, converts it into polished
participant instructions, approves a structured escalation or referral, or the
pre-registered `fallbackTerminalDisposition` is taken and logged in the ledger.

`dueAt` values below are **proposed** and become firm when the named owner
confirms them. Owners named as "Roger or Faith" are placeholders until one of
them assigns the item. Register date: 2026-08-10.

| # | Item | Owner | Proposed dueAt | Required evidence | Tracks affected | Fallback terminal disposition |
|---|------|-------|----------------|-------------------|-----------------|-------------------------------|
| 1 | Massachusetts commercial-use authorization for the official forms | Roger or Faith | 2026-08-24 | Written authorization from the issuing body, or a documented refusal/no-response record | MA packet tracks (all MA tracks in the ledger) | Tier 1/2 paths built on the official form's own bytes if authorization is silent; exact supported deferral if authorization is refused |
| 2 | The two exact Kansas originals | Roger or Faith | 2026-08-24 | The two source binaries with retrieval URL, retrieval date and SHA-256 | KS packet tracks | Exact supported deferral with the reason "source original not obtained" |
| 3 | Remaining Delaware human-browser retrieval | Roger or Faith | 2026-08-17 | Retrieved binaries with retrieval URL, date and SHA-256 | DE packet tracks | Guidance route with complete participant treatment; packet deferred |
| 4 | Minnesota currentness comparison | Roger or Faith | 2026-08-24 | Side-by-side of held revision against the currently published revision, with both SHAs | MN packet tracks | Hold at the verified older revision only if it is still the published one; otherwise exact supported deferral |
| 5 | One-time Adobe Reader reference prints for the dynamic XFA forms | Roger or Faith, after the XFA inventory names the forms | Inventory completion + 7 days | Human-created static snapshots, each admitted as a derived source hash-pinned to the official SHA | The dynamic XFA identities that fail tiers 0–2 | XFA tier 4 isolated dynamic renderer; tier 6 terminalisation if that also fails |
| 6 | We Must Vote minimum operating profile | Roger or Faith | Before any We Must Vote route goes public | Support contact and hours, escalation route, reporting recipients, launch approver, claims guardrails — all in writing | All We Must Vote sponsored routes | Sponsored routes stay disabled; they do not go public without the profile |
| 7 | The Elevation Project sponsored allocation | Roger or Faith | 2026-08-24 | Written allocation with unit definition, thresholds and reserve, matching the We Must Vote contract shape | All Elevation Project sponsored routes | No sponsored capacity is provisioned and no credit is consumable until the allocation is recorded |

## Items opened by the ground-truth audit

| # | Item | Owner | Proposed dueAt | Required evidence | Why it is external |
|---|------|-------|----------------|-------------------|--------------------|
| 8 | Access to `private/Nationwide Record Clearing/` for build sessions | Roger | 2026-08-13 | The inventory reachable from the session that needs it, or an explicit decision that ingestion happens only on the local machine | The folder is gitignored and absent from cloud sessions, so no cloud session can ingest source material |
| 9 | Production truth for deploy state, Vercel plan, Supabase object presence and the We Must Vote row | Roger | 2026-08-13 | Read-only evidence, exported by Roger — never production credentials on a build machine | Credential isolation forbids production secrets on build machines, so production facts cannot be self-served |
| 10 | Confirmation of the 497-track definition | Roger | 2026-08-13 | The definition or registry that yields 497 | The compiled profiles yield 324 tracks; the extra 173 are not represented in the repository |

## Per-court acceptability questions

Not registered here. Per the legal posture they are resolved by the
pre-registered fallback — a path built on the official form's own bytes where
one exists, otherwise exact supported deferral — and logged in the ledger with
its reason. They never block a lane.

## Status at the integration branch tip

This register was written on the captain branch on 2026-08-10 and is restored
here because `docs/RCAP_AUTHORIZATION_QUEUE.md` cites item 9 and the register
was otherwise absent from this branch. The obligation tables above are
unchanged — they are owned by their named owners, not by the build. This
section only records what the branch tip can now demonstrate about them, so a
reader does not act on a stale premise.

**Item 10 — its stated premise is now outdated; the item itself is narrower but
still open.** The register says "the extra 173 are not represented in the
repository." At this tip all 497 registry tracks are enumerated and each
carries a disposition in `data/rcap-ledger/track-pathway-crosswalk.json`,
generated against a hash-pinned registry source
(`data/record-clearing/legal-design-track-registry.json`, commit
`3b6f4c10`, SHA-256 `9d37ca7c…`) and the 51 compiled profiles under
`src/lib/rcap-engine/compiled/profiles`. The crosswalk publishes 497 registry
tracks against 324 compiled pathways: 243 exact, 19 represented by variants, 8
unresolved-ambiguous, 226 with no compiled runtime counterpart, and 262 tracks
carrying runtime coverage overall. So the 324↔497 relationship is represented
and inspectable rather than unexplained.

What stays external is the narrower question the crosswalk cannot self-serve:
that registry edition is pinned but **not confirmed authoritative** —
`registrySource.authorityEdition` is `null`. Roger confirming which registry
edition is authoritative is the remaining part of item 10; the arithmetic is
no longer the open part. `milestone1Item2Closed` is `false`, with 31 registry
gap blockers and 30 unresolved pathways still recorded, and the 38 Milestone 1
item 2 blockers are dispatched in
`data/rcap-ledger/crosswalk-resolution-dispatch.json`.

**Item 8 holds exactly as written, confirmed from this session.**
`private/Nationwide Record Clearing/` is absent from this cloud session, so no
cloud session has ingested source material from it. Nothing on this branch
claims otherwise.

**Item 9 holds as written.** No production fact on this branch is self-served;
the staging readiness record
(`scripts/verify-rcap-staging-authorization-readiness.mjs`) reports 3 of 13
fields populated and refuses to report readiness while any field is unresolved
or any blocker is open. It additionally carries the open critical blocker
`RCAP-SEC-001`, which is tracked there and not in this register because it is
a defect in this branch's own code, not an external dependency.

Items 1–7 are untouched by this branch and remain as their owners left them.

## Item 12 — RESOLVED 2026-09-20 — the Mississippi paid-consumer successor pin was stale, and the route was refused

**Resolved.** Roger approved the successor packet set at commit `32d0bf2f9` on
2026-09-20 and the decision is recorded at
`data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json`,
which supersedes the 2026-09-14 decision without editing it. The approval
records `packetContentsChanged: true` and names the three approved artifacts by
digest. `loadMsPaidConsumerSuccessor()` returns an approval again. Item 13
records what regenerating the registry then revealed. The original entry is
preserved below unchanged.

## Item 12 — the Mississippi paid-consumer successor pin is stale, and the route is refused

| # | Item | Owner | Proposed dueAt | Required evidence | Why it is external |
|---|------|-------|----------------|-------------------|--------------------|
| 12 | Re-pin the MS non-conviction paid-consumer successor decision to the current specification bytes | Roger | Before the MS DTC journey is run | A successor decision naming the current `MS-nonconviction-expungement-99-19-71-4.v1.json` digest, decided against those bytes | The decision is an owner approval of an exact document set. A stale approval naming bytes that legitimately moved is re-decided by its owner, never edited by the build |

**The route is refused right now, on this candidate.** Measured, not inferred:

```
loadMsPaidConsumerSuccessor()            -> null
isPersonalizedDeliveryRoute(MS:non-…)    -> false
packetFulfillmentAuthority("MS", …)      -> allowed: false
  reason: exact track, family, provider or specification binding mismatch.
```

`2026-09-14-ms-nonconv-paid-consumer-successor.json` pins three evidence files by
digest. Two still match. The specification does not:

| Evidence | Pinned | Live |
|---|---|---|
| `MS-nonconviction-…-99-19-71-4.v1.json` | `3a1bed79e3760feb…` | `155417ffbfa9bb83…` |
| `ms-nonconviction-clinic-demo.artifacts.json` | `f9eb16e52304b772…` | matches |
| `…participant-delivery.raster-review.json` | `74f8aab9cdfb2518…` | matches |

**When it moved.** The pinned bytes were the file's state at `9035ebbdb`
*fix(ms): require canonical filing-ready states*. The §4.2 document-contract
work moved it and five later commits moved it again:

```
9035ebbdb 3a1bed79e3760feb  <- the owner's pinned bytes
361225c94 c5f848253d8e7206  GA-4.2 the full document contract, populated and enforced
ab85fe519 f094c572c51db7dd  GA-4.2 populate the contract from the canonical packet-set manifests
f0bdb4a8c 10f0a09a80df71b0  GA-5-MS court papers stay court papers
21ede8e15 076913a175b70db0  GA-5-NV Nevada is already split where it matters
305aa68ff d26de11f2dfad1b2  GA-5-CAPTIONS caption treatment is a component contract
c4296e0d0 155417ffbfa9bb83  GA-5-CAPTIONS bind every caption treatment to authority
```

Those commits are correct product work. The approval is what went stale, and
per the controls doctrine a stale approval naming bytes that legitimately moved
is re-recorded through the mechanism that exists for it — never by editing the
old approval. So the build does not touch that file.

**What the refusal does, which is worse than refusing.** `renderClaimPacket`
asks `isPersonalizedDeliveryRoute` first. With the successor unavailable the
answer is false, and an MS claim falls through to
`renderRcapPacketPdf(packet, "full")` — the legacy generator path, which
AGENTS.md records as not an approved commercial fulfillment path. The routing
decision changed silently; nothing reports it.

**Fold the §7 acceptance into the same re-pin.** The supplemental guide
supersedes `ms-filing-and-next-steps`, which is a packet-contents change, and
the current decision records `packetContentsChanged: false`. Since the pin is
already stale and the route already refused, making the specification change now
costs nothing that is not already owed, and it turns two owner decisions into
one.

## Item 11 — the worker publication gate refuses the release candidate

| # | Item | Owner | Proposed dueAt | Required evidence | Why it is external |
|---|------|-------|----------------|-------------------|--------------------|
| 11 | Advance `origin/claude/legalease-sprint-captain-utucnw` to the release candidate so a worker image can be published from it | Roger | Before the next hosted acceptance run | The branch pointing at the candidate SHA, and a successful `Publish RCAP render worker` run naming it | Publication is gated on the canonical integration history, and this session is authorized to push only `origin/captain-release` |

**The exact operation and target.** `Publish RCAP render worker`
(`.github/workflows/publish-rcap-render-worker.yml`), dispatched at
`claude/legalease-sprint-captain-utucnw` with
`integration_sha=94f70f10a60d16f40bc1a66e1d93320b5f4f0e01`, to obtain the
immutable worker digest that belongs to the current candidate.

**The actual error.** Run
[35510464490](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/35510464490),
step *Verify the SHA resolves and belongs to the canonical integration
history*, failed in 63 seconds:

> `94f70f10a60d16f40bc1a66e1d93320b5f4f0e01 is contained in neither
> origin/main nor origin/claude/legalease-sprint-captain-utucnw. Refusing to
> publish an image from outside the canonical integration history.`

Nothing was built, tagged or pushed; every step from *Check out the exact
supplied SHA* onward was skipped. This is the gate working, not a defect, and
it is not weakened here: the workflow's `RELEASE_INTEGRATION_BRANCH` stays one
literal branch name, and `captain-release` is deliberately not added to it.

**Why an older image cannot stand in.** The acceptance pins at this tip are
`AUTHORIZED_WORKER_SOURCE_SHA 6cc9330f1a98e0e0ba1c1fa4c2c21ed03970c3c9` and
`AUTHORIZED_WORKER_DIGEST sha256:04e37e6c…`. Measured over the canonical
worker-input set — `package.json`, `package-lock.json`, `tsconfig.json`,
`scripts/rcap-render-worker.mjs`, `scripts/lib`, `src`,
`deploy/rcap-render-worker/Dockerfile`:

| From | To | Worker-input drift |
|------|----|--------------------|
| `6cc9330f1` (pinned freeze) | `94f70f10a` (candidate) | 46 files, +5228 −221 |
| `5b69e9681` (integration tip) | `94f70f10a` (candidate) | 28 files, +4509 −197 |

So the pinned digest does not describe this candidate, and neither does any
image publishable from the integration tip. Running acceptance against either
would be testing a new application against an older worker and calling the
result acceptance.

**The smallest action that unblocks it.** Fast-forward the release-integration
branch to the candidate. `origin/claude/legalease-sprint-captain-utucnw` is
`94f70f10a`'s ancestor — 0 commits behind, 107 ahead — so this rewrites no
history and discards nothing:

```
git push origin 94f70f10a60d16f40bc1a66e1d93320b5f4f0e01:refs/heads/claude/legalease-sprint-captain-utucnw
```

Then re-dispatch the publication with `integration_sha` left empty, which is
the workflow's own safe path. The re-pin of `AUTHORIZED_WORKER_SOURCE_SHA` and
`AUTHORIZED_WORKER_DIGEST` to the resulting digest is ordinary build work and
does not need Roger; it is the same move recorded at `a1eed1c6e`.

> **CORRECTION, 2026-09-20 — the sentence above is wrong, and it published the
> wrong commit.** `integration_sha` left empty is *not* the path to the release
> candidate. The resolve step reads
> `REF="${resolve_from_ref:-$CANONICAL_INTEGRATION_BRANCH}"`, and
> `CANONICAL_INTEGRATION_BRANCH` is **`main`** — not
> `RELEASE_INTEGRATION_BRANCH`, which is the branch the fast-forward above
> advances. So an empty dispatch builds `origin/main`.
>
> Acting on this paragraph, run
> [35537699575](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/35537699575)
> published an image of `a3d4587b0fbbbfa887c78372afbfdb8824906333` — the tip of
> `origin/main`, **5,928 commits behind** the approved candidate
> `995b5a17c611f580440f834bc3478b85e54d3321`. Every gate passed, correctly: a
> commit on `main` is trivially contained in `main`, so the containment check
> had nothing to object to. The defect is in which ref gets resolved, not in
> what verifies it.
>
> Nothing was overwritten (the tag guard found no existing tag for that SHA),
> nothing was deployed, and no authority record was bound to the resulting
> digest. The image is a real and accurate image *of `main`*; it simply is not
> the candidate.
>
> **The dispatch that actually builds the candidate** sets the ref explicitly —
> `resolve_from_ref: claude/legalease-sprint-captain-utucnw` with
> `integration_sha` empty, or `integration_sha` set to the full candidate SHA.
> The register said "empty is the safe path" because empty avoids a *typed*
> SHA; that is true and beside the point, since the risk it removes is
> transcription and the risk it adds is building an entirely different branch.

> **SECOND DEFECT, found by the corrected dispatch — the candidate could not be
> built at all.** Run
> [35538205516](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/35538205516),
> dispatched with the exact SHA, passed every gate — resolve, containment,
> exact checkout, tag guard — and then failed in the build:
>
> ```
> ERROR: failed to compute cache key: failed to calculate checksum of ref ...
> "/data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf": not found
> ```
>
> The worker's build context is an allowlist: `Dockerfile.dockerignore` excludes
> `*` and re-includes exactly the runtime closure. Commit `b26a2bf45` added
> three COPY instructions — the Mississippi successor decision, its review
> evidence and its three approved PDFs — and did not extend the allowlist. Six
> paths the Dockerfile copies were not in the context, so the image could not be
> built.
>
> It is pre-existing and predates the owner decision: `b26a2bf45` landed after
> the last successful publication (`58e76b81e`, 2026-09-19) and after the last
> edit to the allowlist (`d842d893d`). No publication reached the build step in
> between — the one attempt failed earlier, at the integration-history gate — so
> a Dockerfile that could not build sat on the release branch undetected until
> the approved candidate was published from it.
>
> **Repaired, and made un-repeatable.** The allowlist re-includes all six paths;
> the Dockerfile also copies the v3 successor decision, which the loader now
> reads and which was missing from both the Dockerfile and the runtime manifest;
> and `scripts/test-worker-image-copy-context-agreement.mjs` proves the three
> lists agree — every COPY source survives the allowlist, every COPY source
> exists, and every file the runtime manifest names is copied. Before the fix it
> reported exactly the five paths buildx did.
>
> **And one more, found while fixing it.** `Dockerfile.dockerignore` decides
> what the image contains, and was not in `CANONICAL_WORKER_INPUTS`. Narrowing
> the allowlist would have dropped a runtime file from the image while the input
> plan reported "no rebuild required" and reused the old digest. It is a
> canonical input now.

## Item 13A — RESOLVED 2026-09-20 — five routes the registry could no longer prove from a stale pin

| # | Item | Owner | Proposed dueAt | Required evidence | Why it is external |
|---|------|-------|----------------|-------------------|--------------------|
| 13 | Decide how the five routes whose specification bytes moved on 2026-09-20 regain admitted authority | Roger | Before any of those five routes is offered again | For each route, a recorded admission of the moved specification — a carry-forward the successor accepts, or a fresh owner artifact approval decided against the current bytes | Each is an owner approval of an exact document set. The build may regenerate a registry from evidence; it may not admit bytes no approval names |

**What happened, measured.** Item 12 is resolved: the 2026-09-20 owner decision
supersedes the stale pin and `loadMsPaidConsumerSuccessor()` returns an approval
again. That unblocked `scripts/generate-rcap-grade-a-fulfillment-authority.mjs`,
which had been refusing outright — and the first regeneration in a day revealed
that the committed registry had been claiming authority for specifications it
had never seen.

The registry was last regenerated at `c5c0f3d50` (2026-09-19). Five
specification files moved on 2026-09-20, in four reviewed commits, all after it:

| Route | Registry pinned | File now | Moved in |
|-------|-----------------|----------|----------|
| `DC:dc_actual_innocence_expungement_16_803` | `a66e9b44315d` | `bd1bc2afac28` | `b45949177` Repair the District of Columbia derivation defect (3 of 8) |
| `IL:felony-prostitution-relief` | `50dfb8afa1ca` | `aeb7ace411d0` | `c4296e0d0` GA-5-CAPTIONS bind every caption treatment to authority |
| `MS:additional-justice-court-misdemeanor-relief-9-11-15-3` | `e870e694b917` | `737bcbb2edcc` | `94f70f10a` Mississippi document purity |
| `MS:additional-municipal-court-misdemeanor-relief-21-23-7-6` | `e870e694b917` | `737bcbb2edcc` | `94f70f10a` Mississippi document purity |
| `WY:felony-conviction-expungement-w-s-7-13-1502` | `97572a2e564a` | `c057a748a753` | `94f70f10a` Mississippi document purity |

Every file above is byte-identical at `HEAD` and in the working tree, so this is
neither a local edit nor a consequence of the §7 successor work. The successor
work only removed the refusal that was hiding it.

**What the regeneration did.** The projection moved from 6 commercially eligible
routes to 0:

| Route | Was | Now |
|-------|-----|-----|
| `DC:dc_actual_innocence_expungement_16_803` | COMPLETE_PACKET_PROVEN | STALE |
| `IL:felony-prostitution-relief` | COMPLETE_PACKET_PROVEN | REVOKED |
| `MS:additional-justice-court-misdemeanor-relief-9-11-15-3` | COMPLETE_PACKET_PROVEN | REVOKED |
| `MS:additional-municipal-court-misdemeanor-relief-21-23-7-6` | COMPLETE_PACKET_PROVEN | REVOKED |
| `WY:felony-conviction-expungement-w-s-7-13-1502` | COMPLETE_PACKET_PROVEN | REVOKED |
| `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` | COMPLETE_PACKET_PROVEN | INCOMPLETE |

The four revocations are the generator's own designed refusal —
`artifact successor legal specification changed`, raised when
`carriedForwardSpecificationSha256` cannot show that only approved-artifact pins
moved. Every change is toward closure; nothing was opened.

**What that did and did not establish — a correction to this entry's first
wording.** "The registry stopped being able to prove those five routes on
2026-09-20" is supported: the pins named specification bytes that no longer
existed. "Their commercial eligibility actually ceased on 2026-09-20" was NOT
supported at the time it was written, and measurement has since shown it to be
wrong. The approved participant-facing artifacts never moved. The correct
reading is narrower: a stale pin fails closed, which is right, and says nothing
by itself about whether the approved document set changed.

**Resolved by measurement, not by a new owner approval.** Each of the five was
reproduced and classified rather than assumed, and all four families landed in
the same class: the specification digest moved, and the approved
participant-facing artifact bytes did not.

| Family | Approved artifacts | Build host reads the specification | Prior spec could produce a packet | Composed assertions already in the approved artifact |
|--------|--------------------|-----------------------------------|-----------------------------------|------------------------------------------------------|
| `dc_innocence_expungement-set` | byte-identical | no | no | 57/57 |
| `il-prostitution-j-vacate-set` | byte-identical | no | no | 16/16 |
| `ms-misd-addl-set` | byte-identical | no | no | 66/67 + 1 heading |
| `wy_fel_1502-set` | byte-identical | no | no | 86/87 + 1 heading |

What those four commits actually were is stated by the composer itself, in the
branch that refuses an `approved_shipping_component` section: *"the same
derivation defect Nevada had — the specification kept the description and
dropped the substance — and the fix is per family, by transcribing the adopted
text."* The specifications had never held the words; each family's census-v1
build host did. The repair transcribed the already-adopted words back in.

Three of the four builders were re-run in full and the working tree did not
change by a single byte, which is a reproduction rather than an inference. The
District of Columbia host resolves a bound reference source from the Master
Library, which is not mounted in this environment, so DC rests on its tracked
inputs instead: the two build scripts unchanged since 2026-09-01, the overlay
outputs unchanged since 2026-09-09, and its corpus-index entries byte-identical.

So this was **Class A — evidence-backed carry-forward**, for all five routes.
No new owner approval was required and none was manufactured. The reconciliation
is recorded at
`data/rcap-grade-a/legal-decisions/SPECIFICATION_DERIVATION_RECONCILIATION_2026-09-20.json`,
proven on every run by `scripts/verify-specification-derivation-reconciliation.mjs`,
consumed under a byte pin by `scripts/lib/specification-derivation-reconciliation.mjs`,
and held to 27 refusal controls by
`scripts/test-specification-derivation-reconciliation.mjs`. No verifier had a
current digest hard-coded into it: the authority verifier now reads the admitted
digest from that reconciliation, and a specification move it does not cover
still fails against the original literal.

**What it deliberately does not do.** It carries a specification digest forward
and nothing else. It creates no approval, opens no route, and establishes no
provider or publication proof. In particular it does **not** approve the packet
these repaired specifications now compose. That is Item 13B, below, and it is
the part that nearly went wrong: this entry originally concluded that the
routes' artifacts were unchanged, which is true of the build-host artifacts and
**false of the bytes the commercial provider delivers**.

**Where the five stood after 13A.** Zero revoked, all five STALE for the
worker-publication gap alone. That looked like the correct pre-publication
state. It was not sufficient, and Item 13B is why.

## Item 13B — CLOSED 2026-09-20 — the owner approved the six routes' current commercial artifacts

| # | Item | Owner | Decided | Evidence | Why it was external |
|---|------|-------|---------|----------|---------------------|
| 13B | Decide the current composed Grade-A artifact for each of the five repaired-specification routes, **and** the replacement Mississippi non-conviction bytes the shared Fees & costs correction moved | Roger | 2026-09-20, APPROVED | `data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json` (18 artifact entries), bound to commit `ed7356a733b5f47976e012c9ba386f0a021057ca`, batch `5166d9159e7d4ff1…`, visual review `bd248b2aa8fb84e5…` | Approving the exact bytes a participant receives is an owner decision. The build may produce them and hold the route; it may not approve them |

**The decision.** One owner-decision record approves eighteen artifact entries by
digest: the fifteen Item 13B artifacts across five routes, and the three-artifact
Mississippi non-conviction successor set. It approves composed bytes and says so
— including the §7 supplemental guides and the route-derived Mississippi
statutory branches — and it authorizes the canonical integration fast-forward and
one worker publication. Production promotion and live charges remain
unauthorized, which the record states as fields rather than as prose.

The four recorded visual observations are accepted as nonblocking for these exact
artifacts and, the owner stated, are not reasons to alter the approval. They do
not require another artifact loop.

**How the approval is consumed, and how it stops applying.**
`scripts/lib/current-commercial-artifact-approval.mjs` loads it and re-derives
every binding from disk: the batch digest, the visual-review digest, each
artifact's own bytes, and the custody digests of every record it supersedes or
preserves. Nothing is taken from the decision's own say-so. So regenerate an
artifact, re-run the batch or re-inspect a page and a digest moves, the approval
stops loading, and the routes close again — which is the property that makes it
an approval of bytes rather than of a route.

**What the Mississippi supersession did and did not do.** The v3 successor
decision names the moved bytes and supersedes the 2026-09-20 v2 approval, which
is preserved exactly as signed; v2 in turn still names v1 exactly, and the loader
verifies the chain two links back rather than stopping at the immediate
predecessor. v3 also has to be right about *what* moved: the loader ties each
`movedArtifacts` entry's `from` to the superseded decision's digest and its `to`
to the digest this decision approves, and refuses a supersession in which nothing
moved.

**Confirmed before publication**, by `scripts/test-item-13b-approval-preconditions.mjs`:

1. the five Item 13B routes carry no missing proof at all — the composed-artifact
   gap is gone and nothing replaced it;
2. the Mississippi non-conviction `owner_decision` mismatch is gone, and the
   record binds `MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920-V3`;
3. the v2 and v1 approvals are byte-identical to their state at
   `ed7356a733b5f47976e012c9ba386f0a021057ca`;
4. the explained-move path cannot substitute for the decision — and cannot even
   fire against it, because a move record accounting for one decision's digests
   cannot account for another's;
5. every remaining hold on all six routes is provider or publication, checked as
   a whitelist of the two permitted reasons so a new hold fails rather than being
   absorbed.

`scripts/test-explained-artifact-move-is-not-approval.mjs` holds the boundary the
owner named, in 20 controls: withdraw the decision and the same published world
does not open the route, with the move record sitting on disk, readable, and
unable to stand in for it.

**A stale control found while running them all.**
`scripts/test-worker-publication-separation.mjs` had been passing `rebuildRequired`
as true for every input because its synthetic tree never carried the §7
supplemental guides or the brand asset, which were added to
`CANONICAL_WORKER_INPUTS` after the fixture was written. A canonical input the
candidate lacks is a difference, so the fixture's `rebuildRequired` was pinned
true and every assertion below it had stopped measuring anything. It was failing
identically at `ed7356a73`, so it is pre-existing rather than something this
change exposed; the fixture now builds itself from `CANONICAL_WORKER_INPUTS`, so
the next input added to the product cannot silently disable it again.

**The error Item 13A made.** "No participant-facing byte moved" was measured
against the census-v1 build hosts. Those hosts do not deliver. For an ordinary
paid Grade-A route the product composes at delivery —
`packetFulfillmentAuthority` → `rcap_grade_a_composer_v1` →
`buildGradeAArtifact` → the **current** specification → `composeGradeAPacket` →
`assembleParticipantPacket` — and Illinois composes the same way inside the
personalized worker, which names it explicitly. So reproducing the old builder's
PDF proves the old builder is stable; it says nothing about what the product now
delivers. The correct statement is narrower: *the adopted build-host artifacts
did not move, and the bytes the current commercial provider produces are new.*

**The hold, and why publication cannot clear it.** A record now has to say
whether its filing-format artifact is the one the current commercial provider
composes, and the answer is derived from the producer the record already
carries — only `rcap_grade_a_document_v1` counts, so no record can assert its
way past it. Where the answer is no and no approval names the composed bytes,
the route is INCOMPLETE. That check lives in the packet-completeness gaps, which
`collectMissingProof` collects **before** the authority looks for an
observation, and worker publication only clears the observation.
`scripts/test-current-commercial-artifact-hold.mjs` proves this by evaluating
every one of the five against a fully current observation — the state the
repository will be in after the next publication — and requiring them to stay
closed. All five stay closed. Mississippi non-conviction was unaffected by Item
13A's finding — its filing-format artifact **was** the composed artifact Roger
approved — but the shared Fees & costs correction has since moved those bytes, so
it now waits on an owner decision of its own for the same reason the five do. The
mechanism is the same one, and is described under the move record below.

**What the batch contains.** Produced through the real provider path, for the
same participant each family's approved artifact was reviewed for, with every
page rendered to an image, hashed, **and looked at**:

| Route | Full EN | Court-only | Full ES | Against the adopted artifact |
|-------|---------|-----------|---------|------------------------------|
| DC actual innocence | 11 pp `baaf7e489216c8fd` | 5 pp `761dd42907ca6bb6` | 11 pp `d5533512366af833` | differs |
| IL felony prostitution | 9 pp `9f9f28401f89c797` | 4 pp `6e201b2537cdf036` | 11 pp `b216432ddc58cb57` | differs |
| MS justice court 9-11-15-3 | 12 pp `c0bfa886b8156bb7` | 6 pp `8f11eaef9c6089a1` | 12 pp `b5e7b6c40a83c4a5` | differs |
| MS municipal court 21-23-7-6 | 12 pp `8bd7af6b397e213b` | 6 pp `54b90eff86f419f1` | 12 pp `4fec8705672b0193` | differs |
| WY felony expungement | 14 pp `07873ad856fe45a8` | 7 pp `9cebe2d3cd4ac086` | 14 pp `d544a6233e1b4c12` | differs |

The court-only packet carries no participant guide on any route, and is proven
page-for-page identical to the court-facing pages of its own full packet, so the
clerk receives exactly the filing documents and nothing else. Facts the platform
never supplies — a court's findings, a notary block, signature and service lines
— are proven not to reach the page: each packet is composed twice with different
values for all of them and the bytes are identical. Participant-owned facts the
reviewed fixture does not carry are listed per route as review-supplied, because
those do print.

**The two defects the first batch surfaced are repaired.** The municipal route
composed no packet because `composeGradeAPacket` gated on the single
`specification.routeKey` while the specification serves both routes through
`routeKeys`; the guard now admits a matter whose route is the primary key or is
explicitly listed, and an unlisted sibling still refuses. The shared
additional-misdemeanour guide now carries reviewed Spanish for every entry, so
both Mississippi routes render a full Spanish packet. The family is not split:
the two routes deliver the same participant packet and differ only in the review
packet identifier printed in the guide footer, because which court it is arrives
as a blank the participant fills from their own record.

**That last sentence was itself the defect, and is now repaired.** Which court it
is does not arrive as a blank: the route key already says it. The specification
was carrying `section_branch` as a field the participant completes before filing
while its own final verification said the server owns the route and a
client-supplied section never chooses it, so the petition printed "This petition
is brought under: Miss. Code Ann. Sec. ______" on a page filed with the court —
and, because nothing else distinguished them, the two routes' court-only packets
were byte-identical. The specification now carries `routeDerivedFacts` keyed by
the exact admitted `routeKey`, injected by the composer **after** the
route-identity guard so a caller-supplied value is discarded rather than trusted.
The justice route prints Miss. Code Ann. Sec. 9-11-15(3) and names the prosecutor
who appears for the State in that justice court; the municipal route prints
Miss. Code Ann. Sec. 21-23-7(6) and names the MUNICIPAL PROSECUTING ATTORNEY. The
court name, county and cause number stay blanks, because the product does not
know those. `scripts/test-ms-section-branch-is-route-derived.mjs` reads the drawn
text out of both packets and proves each branch appears in its own route and not
the other, that a participant-supplied section is refused, that an unlisted route
still refuses, and that the two court-only outputs no longer hash alike.

**Nine further defects were found by looking at the pages, and repaired.** They
are recorded one by one, with cause and fix, in
`data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_2026-09-20.json`.
The ones that would have reached a participant or a clerk: the guide cover
printed "Not established for this route" under PREPARED FOR, COURT / AGENCY,
CASE / MATTER and REMEDY because the review composed without a matter at all;
the Spanish cover named no remedy on four of the five routes, because only
Mississippi non-conviction carried `pathwayLabelEs`; the Mississippi proposed
order printed "SO ORDERED AND ADJUDGED this day of , 20:" with its date blanks
dropped; Wyoming's verified petition printed "(a) (a) That Petitioner has not
previously pled guilty ..." on each of the four allegations the petitioner
swears to personally, and printed its docket line twice on two documents; the
filing checklist printed "- - Certified judgment and sentence ..."; DC's stop
list printed three bullets introduced by nothing, and split the Seal Team's
email address across two lines.

**Two further participant-facing presentation defects were repaired.** The
Fees & costs "Last verified / Official source" cell printed "Not established for
this route - ask the clerk or filing office. | &lt;the official source&gt;", so
Wyoming showed a $300.00 filing fee beside a cell that opened by saying nothing
was established. The Last verified half now prints "Not recorded" / "No
registrado"; the Official source half is unchanged. And the guide's Next Steps
margin ordinal counted entries while a route's own text counted steps, putting a
margin "2" beside "STEP ONE". The guide contract now carries a required
`nextStepsNumbering` field — `renderer_ordinal` or `source_step_labels` — and the
renderer reads that declaration. It does **not** inspect the entry text: an
earlier attempt did, which would have made a legal packet's presentation depend
on whether a sentence happened to start with a bracket.

**The Fees & costs fix is shared-renderer work, so it moved approved bytes.** The
Mississippi non-conviction artifacts Roger approved on 2026-09-20 are guide
bearing, and their full EN and full ES bytes moved; court-only carries no guide
and is unchanged. Roger's approval is preserved **unedited** and now simply does
not describe what the product composes, so `loadMsPaidConsumerSuccessor` refuses
it and the route carries no paid consumer authority. The mismatch is accounted
for artifact by artifact in
`data/rcap-grade-a/legal-decisions/MS_NONCONVICTION_ARTIFACT_MOVE_2026-09-20.json`,
which states in terms that it creates no approval — and
`scripts/test-explained-artifact-move-is-not-approval.mjs` holds that boundary
with 15 controls: the route stays `not_commercially_eligible`, the refusal is
collected **before** any observation so publication cannot clear it, a fully
current observation does not open it, a record whose digests do not match disk is
refused, and a record claiming to approve its own bytes is refused. Explaining a
mismatch lets the build produce candidate bytes for review; it never lets
commercial authority accept them.

| MS non-conviction | Approved 2026-09-20 | Current bytes | |
|---|---|---|---|
| full EN | `518f12411df40919` | 16 pp `9bbe447c8c3eb5ac` | moved |
| full ES | `53d1577b1dc0a023` | 17 pp `28b5dfcb2d9c8d47` | moved |
| court-only | `18a452b04d6c26e0` | 8 pp `18a452b04d6c26e0` | unchanged |

**Visual review status.** Every page of every produced artifact was opened as an
image and inspected: 15 artifacts, 146 pages, plus the three Mississippi
non-conviction replacements. After the three corrections above, the changed pages
were found by comparing page rasters hash-for-hash against the set already
inspected — 47 changed page slots, 36 unique images — and every one of those 36
was opened again and looked at. The 103 unchanged pages are carried by exact
raster identity, not by assertion. No remaining defect changes what a participant
is asked to do, told, or given somewhere to write.

Four observations are recorded and **not** fixed here, each with the reason —
principally that the fixes are widow-and-orphan control and an unkerned wrap
measurement in the shared renderers. One of those observations was **corrected**:
it reported the batch's worst right-margin overrun as 1.3pt, which was the
approved Mississippi non-conviction English guide carried forward as though it
were the batch's worst. It was not. The renderer control measured only the
English render, so no Spanish page had ever been asked; the true worst is 2.32pt,
on the Mississippi Spanish guides. Nothing is clipped — the page margin is 46pt —
and the control now measures the Spanish render too, against its own pinned
allowance, and separately refuses any glyph near the paper edge in either locale.

The visual review is bound to the batch by sha256 per artifact: rebuild an
artifact and its review reads `not_inspected` rather than carrying forward. That
is not theoretical here — it is what every one of the twelve moved artifacts read
until this record was re-inspected and re-bound. Page hashes in the batch file
are identity evidence for which bytes were looked at; they are not visual
acceptance, and the file says so.

**Not repaired here, deliberately.** Approving composed bytes is an owner
decision, and the build must not manufacture one. That decision has since been
recorded; the section above is what it approved and how the approval is bound.
All six routes remain commercially closed on provider and publication, which is
the gate the authorized worker publication answers and the only one it answers.
