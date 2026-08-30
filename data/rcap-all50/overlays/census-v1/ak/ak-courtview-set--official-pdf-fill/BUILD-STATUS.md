# ak-courtview-set — census-v1 build status

**Outcome: BLOCKED AT STEP 1. No packet artifact was produced, and none should be reported.**

| | |
|---|---|
| Family | `ak-courtview-set` |
| Wave | `census-v1-wave-AK-01` |
| Jurisdiction | AK |
| Strategy | `official_pdf_fill` |
| Form | TF-810 — Request to Exclude Case from Online Public Index (CourtView) under Admin. R. 40(a) / AS 22.35.030 |
| Pinned SHA-256 | `c5e55ce0c0bb2a008ad9cde5e62c4900f413c8fb64a913e94c81554c64b69582` |
| Pinned length | 85,386 bytes (1 page, 23 AcroForm fields) |

## Why the build stopped

Step 1 requires locating the official source bytes and verifying their SHA-256
against `data/rcap-all50/local-source-corpus-index.json`. **The bytes are not in
this container.**

The corpus index resolves TF-810 to
`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/AK/02_PACKET_FORMS/…`.
`private/` is git-ignored (`.gitignore:53`), so a fresh clone never carries it.
Confirmed: the corpus root does not exist, `OFFICIAL_FORMS_SOURCE_DIR` is unset,
no file of 85,386 bytes exists anywhere on the filesystem, and **none** of the
329 indexed corpus binaries are present. The repo's own
`operational-corpus-precondition` returns `evaluable: false` /
`operational_corpus_absent`.

The instruction is that unverified bytes are not to be built on. Absent bytes are
a stronger stop than mismatched ones, so the build stopped rather than
substituting something.

**`SOURCE_ALREADY_HELD` is not contradicted by this.** The custody
classification is a statement about the verified private corpus — which is real,
and was hash-verified 499/499 at import. It is a statement about custody, not
about reachability from this container. Held is not the same as mounted.

Nothing was acquired. Egress to court hosts is refused by policy and the
instruction forbids acquisition; `public.courts.alaska.gov` was never contacted.

## What was deliberately not done

- **No field map.** A `field-census.json` and `production-field-map.json` for
  this same form already exist under
  `data/rcap-all50/overlays/production/alaska/tf-810-form-en/`, measured in an
  earlier session against this same pinned hash. Copying them forward was
  rejected: step 3 requires boxes **measured off the document**, and inherited
  numbers report a measurement this lane did not take. That overlay is also not
  a verified base — it still carries `f_independent_visual_review_required` and
  `implemented_pending_independent_review`.
- **No fixtures, no artifact hashes.** The factory fills the source binary. With
  no binary there is no artifact, and an artifact hash reported without one would
  be fabricated.
- **No raster, no visual review.** Reviewing a document that was never produced
  is not a review.
- **No verifier weakened, skipped, or quarantined** to make this lane green.
- **No second factory written.** The existing one under
  `scripts/rcap-official-forms/` remains the only one.

This is the failure mode named in `scripts/measure-rcap-oregon-option-geometry.mjs`
— a lane reporting a geometric conclusion it had not actually measured — caught one
step earlier, at the source rather than at the detector.

## What was completed

**`LOCAL_VARIATION_REQUIRED` → `local-variation-record.json`.** Local filing,
fee, venue and delivery variation is a question about route procedure, not about
the geometry of the form's blanks, so it was answerable from committed authority
present in this clone and was finished rather than left undone. 19 items
recorded, each tagged by evidence tier and cited to a specific node in
`src/lib/rcap-engine/compiled/profiles/AK-alaska.json` (read-only) or the frozen
census. Ten are settled from committed authority; seven are marked
`requires_source_bytes` and were **not guessed**; the rest are referred to
counsel.

Headline findings: per-case venue (the trial court and judicial district of the
underlying case); an administrative request, expressly not an adversarial
petition; typically $0; **no participant-side service on any party**; no filing
deadline — the 60-day period is an eligibility precondition, not a deadline; and
relief that is automatic at 60 days, with TF-810 only a backstop to be filed if
the case is still showing.

## Blanks left for the participant, and why

The source gate closed before any field could be written, so **every** blank on
TF-810 is unwritten. These are the ones that must stay unwritten even after it
reopens:

| Blank | Why it stays blank |
|---|---|
| Requestor signature | Participant signature. The requestor signs their own request; the census records signature and date as later-completion fields. |
| Signature date | A signature date attests when a person actually signed. |
| Court response block — "Case removed" / "Case not removed" | Court-only. The clerk completes it and dates it to the requestor. |
| Date sent to requestor | Court-only. |
| Any certificate of mailing, if the form carries one | Must not be prefilled before actual mailing. Not yet known whether such a block exists — that needs the bytes. |

## Discrepancy referred upward, not fixed here

The frozen census records this route's participant attachment as *"proof of the
SIS and any set-aside order"*. An SIS and its set-aside belong to the
AS 12.55.085(e) mechanism — a motion in the underlying criminal case — not to
this AS 22.35.030 / Admin. R. 40 CourtView exclusion. The compiled profile names
the attachment for **this** route as proof of the acquittal or dismissal plus
proof that 60 days have elapsed. The frozen census must not be modified by this
lane, so it is recorded in `local-variation-record.json` for whoever holds it.

## Reopening the gate

1. Mount the corpus at
   `private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`, or set
   `OFFICIAL_FORMS_SOURCE_DIR`.
2. Run `node scripts/census-v1-ak-courtview-set-source-gate.mjs` — exit 0 only
   when the bytes at the pinned path hash to the pinned SHA-256 at 85,386 bytes.
3. Install dependencies. `node_modules` is absent here;
   `scripts/rcap-all50-overlay-factory-lib.mjs` cannot import `pdf-lib`.
4. Measure with `scripts/lib/pdf-stroked-boxes.mjs` — the corrected detector. The
   older `re`-operator scan tracked no CTM and derived a mark into the margin.

## Approval posture

Output-level legal approval is **REQUESTED, NOT GRANTED**. No commercial route
was opened, no fulfillment record created, and no packet marked proven or
approved.

---

## Second attempt — 2026-08-30 — still blocked, but the blocker is now named exactly

This lane was re-dispatched with the corrected brief
(`docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md`), which
supplies the one thing the first wave lacked: `scripts/rcap-corpus/bootstrap-private-corpus.sh`.
That script was found and run. **It did not recover the corpus, and the build
stopped again at step 1.**

What was done this time, in order:

1. Full (un-shallow) fetch; `origin/claude/census-v1-build-ak-courtview-set`
   resolves at `a9ed042c`, and `origin/claude/legalease-sprint-captain-utucnw`
   was merged in to pick up the brief, the preflight and the corrected
   field-semantics binder.
2. `npm ci` — dependencies installed. `pdf-lib` now imports; that half of the
   first attempt's blocker is gone.
3. `bash scripts/rcap-corpus/bootstrap-private-corpus.sh` — **failed.** It
   resolves the Master Library archive from a release asset on the private repo
   `Roger-LegalEase/legalease-source-artifacts@source-corpus-2026-08-28`, and the
   credential available in this container is refused with **HTTP 403** on that
   asset. The script's own diagnosis is correct and is reproduced verbatim: *"the
   token may lack access to Roger-LegalEase/legalease-source-artifacts"*. The
   script behaved properly — it refused rather than extracting a partial or
   unverified tree.
4. `node scripts/verify-packet-build-environment.mjs --family ak-courtview-set
   --branch claude/census-v1-build-ak-courtview-set` — **10/14 passed, 4 failed**,
   `PACKET_BUILD_ENVIRONMENT_NOT_READY`. The four failures are
   `master_library_mounted`, `master_library_complete`,
   `corpus_matches_committed_index` and `family_sources_bind`, and all four are
   the same absence. Every check not rooted in the corpus passed, including
   `clone_is_complete`, `assigned_branch_tip_visible`, `pdf_lib_importable` and
   `private_is_git_ignored`.
5. `node scripts/census-v1-ak-courtview-set-source-gate.mjs` — re-run as
   instructed. **Exit 1**, `SOURCE_GATE_CLOSED`, refusal `corpus_root_absent`,
   byte-identical to the committed report. `source-gate.json` is therefore
   unchanged: the gate found exactly what it found before.

### What this changes about the first attempt's record

Nothing is retracted. The custody classification `SOURCE_ALREADY_HELD` is still
not contradicted — the Captain independently re-verified TF-810 against the
mounted corpus at sha256 `c5e55…b69582`, 85,386 bytes, exact match. The bytes
exist and are correct. What the second attempt establishes is *why* they are not
reachable here, which the first attempt could only describe as an absence:

> The corpus is not merely unmounted. It is gated behind a private release this
> container's credential cannot read, and the recovery script is working as
> designed when it refuses.

Attaching `Roger-LegalEase/legalease-source-artifacts` to this session was
attempted and was declined by the environment's permission layer, so this lane
had no way to widen its own access — nor should it have.

### What was still not done, and why not

Unchanged from the first attempt, and for the same reason: **no field census, no
write-box measurement, no fixtures, no artifact hashes, no raster, no visual
review.** Steps 2, 3 and 5–8 each consume the source binary, and the binary was
never opened. In particular:

- The measurements under `data/rcap-all50/overlays/production/alaska/tf-810-form-en/`
  were **again** left uncopied. They were taken against this same pinned hash, and
  the re-dispatch explicitly preserved the first attempt's refusal to carry them
  forward. This lane cannot report agreement or disagreement with those numbers,
  because it took no numbers of its own to compare them against. Saying they
  agree would be the exact failure the refusal exists to prevent.
- No verifier was skipped, weakened or quarantined, and no second factory was
  written.

`LOCAL_VARIATION_REQUIRED` remains the one work type discharged, and it was **not
redone** — the 19 committed variation items stand as the first attempt recorded
them.

### Reopening the gate — corrected

Step 1 of the first attempt's list is replaced by a specific, actionable grant.
Steps 2 and 4 stand; step 3 is now satisfied.

1. **Grant this session's credential read access to the private release** —
   attach `Roger-LegalEase/legalease-source-artifacts` to the session, or supply a
   `GITHUB_TOKEN` / `GH_TOKEN` that can read release
   `source-corpus-2026-08-28`. Then re-run
   `bash scripts/rcap-corpus/bootstrap-private-corpus.sh`. Mounting the corpus
   directly, or pointing `OFFICIAL_FORMS_SOURCE_DIR` at an existing copy, works
   equally well.
2. `node scripts/verify-packet-build-environment.mjs --family ak-courtview-set
   --branch claude/census-v1-build-ak-courtview-set` must print
   `PACKET_BUILD_ENVIRONMENT_READY`, then
   `node scripts/census-v1-ak-courtview-set-source-gate.mjs` must exit 0 — only
   when the bytes at the pinned path hash to the pinned SHA-256 at 85,386 bytes.
3. ~~Install dependencies.~~ **Done.** `npm ci` has run; `pdf-lib` 1.17.1 imports.
4. Measure with `scripts/lib/pdf-stroked-boxes.mjs` — the corrected, CTM-tracking
   detector. The older `re`-operator scan derived a mark into the margin.

Nothing was acquired. `public.courts.alaska.gov` was not contacted, and no
mirror, cache or aggregator was used. Approval posture is unchanged: output-level
legal approval **REQUESTED, NOT GRANTED**; no commercial route opened, no
fulfilment record created, no packet marked proven or approved.
