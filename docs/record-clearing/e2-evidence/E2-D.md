# E2-D — Alaska AS 12.55.085 set-aside: does the registry reach it?

**Lane** E2-D · **Job** `E2-D-AK-as-12-55-085` · **Base commit** `c7225bcf8f2fb2ab0deb5c333d2278937b257694`
**Evidence file** `data/rcap-ledger/e2-evidence/E2-D.json`
**Disposition** `registry_scoped_out_named_authority` — terminal, high confidence.

---

## The question

The compiled runtime carries an Alaska pathway
`set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085`
in `src/lib/rcap-engine/compiled/profiles/AK-alaska.json`. The 497-track registry lists eight Alaska
tracks and the crosswalk maps none of them to it. The pathway carries its statute in its own
identifier, so "no citation available" is not an available answer. Either a registry track covers an
AS 12.55.085 suspended-imposition-of-sentence set-aside, or the registry routes that statute outside
its tracks for a stated reason, or the registry has a gap.

**Answer: the registry routes it outside its tracks, deliberately, under a named blocker.** The
registry's own upstream legal-design intake declares a track for AS 12.55.085 and withholds it —
`ak-set-aside`, status `legal_research_required`, "deferred, unregistered and unreachable" — under
Alaska legal-design blocker **AK-4**. Nothing about this is inference from absence: the registry
considered the statute by name and recorded why it did not import it.

---

## What AS 12.55.085 relief is

Stated here because the ruling-out below turns on it. From the compiled profile
(`src/lib/rcap-engine/compiled/profiles/AK-alaska.json`):

> 'Defendant received a Suspended Imposition of Sentence and has successfully completed probation.
> Defendant moves the Court to SET ASIDE the conviction under AS 12.55.085(e) and to issue a
> certificate.' (NOTE: this does NOT seal or expunge; the record remains and may appear on background
> checks.)

and:

> Set-aside is not erasure. Even when granted, the conviction remains on the record, can be a
> sentencing prior (AS 12.55.155(c)(8)), and may support licensing denials.

So the relief is: a sentencing-court order setting the conviction aside plus a certificate. It is not
sealing, not expungement, not non-publication, and not clemency. A conviction that has been set aside
is still a conviction for the purposes that matter to the other Alaska mechanisms. That is what makes
the coverage question genuinely open rather than obvious — and it is also what closes it.

---

## The eight registry tracks, ruled in or out

Ruled out on operative authority and relief type. Shared words are not used as evidence in either
direction. Citation spines are the ordered numeric tuples produced by the crosswalk generator's own
extraction rule (`scripts/generate-rcap-track-pathway-crosswalk.mjs`); the compiled pathway's spine is
**12.55.85**.

| Track | Operative authority | Spine(s) | Covers AS 12.55.085? |
|---|---|---|---|
| `ak-courtview` | AS 22.35.030; Admin. R. 40(a) | 22.35.30 | No — consumes a set-aside order, does not grant one |
| `ak-juvenile` | AS 47.12.300; AS 47.12.030 | 47.12.300, 47.12.30 | No — Title 47 juvenile jurisdiction |
| `ak-mistaken-identity` | AS 12.62.180; 13 AAC 68.205 | 12.62.180, 68.205 | No — opposite predicate |
| `ak-nonconviction-confidential` | AS 12.62.160(b)(8); 13 AAC 68.310 | 12.62.160, 68.310 | No — non-conviction records only |
| `ak-pardon` | Alaska Const. art. III, § 21; AS 33.20.070–.080 | 33.20.70, 33.20.80 | No — executive, not judicial |
| `ak-sej` | AS 12.55.078 | 12.55.78 | No — different section, different mechanism |
| `ak-tf800` | TF-800 (5/25); Admin. R. 37.6 | 37.6 | No — sealing, not set-aside |
| `ak-tf805` | TF-805 (5/25) | *(none)* | No — name-only index removal; carries no statute |

Two of these deserve more than a table row.

### `ak-sej` — the near miss the slug invites

AS 12.55.078 is **suspended entry of judgment**; AS 12.55.085 is **suspended imposition of sentence**.
Adjacent sections, one shared word, two different mechanisms. SEJ withholds entry of judgment and ends
in dismissal *without a conviction* — which is exactly why `ak-courtview` lists "all charges were
dismissed after a suspended entry of judgment under AS 12.55.078" among its **dismissal**-family
grounds. An SIS produces a conviction, which the court may later set aside. Spines 12.55.78 and
12.55.85 do not match, and would not be permitted to match on similarity alone.

Independently, `ak-sej` could not absorb this relief even if the statutes coincided, because the
registry scopes it out of participant filing entirely:

> Suspended entry of judgment is selected and administered inside the active criminal case; the review
> did not identify a later participant filing that LegalEase can initiate.

### `ak-courtview` — the one that mentions the SIS, and why it still does not cover it

The `ak-courtview` track record does reference a suspended imposition of sentence. It carries a
conditional supporting document:

> **Proof of the suspended imposition of sentence and any set-aside order** — obtained from *the
> sentencing court*, conditional, "On the SIS ground only." How to obtain: "Ask the sentencing court
> for proof of the SIS and any set-aside order, and attach them."

That is the registry treating an **already-issued** set-aside order as an input to a CourtView
exclusion request under AS 22.35.030 / Admin. R. 40(a). The relief `ak-courtview` produces is
non-publication of the case on the public online index; the relief the compiled pathway produces is
the set-aside order itself. A track that asks the participant to attach the order does not grant it —
the relationship runs downstream from AS 12.55.085(e), not to it.

*Limitation, stated:* the registry's own packet instructions for this track say "Build all ten grounds,
not three," so the grounds enumerated in the track record are admittedly partial, and I could not fetch
Administrative Rule 40(a) to identify which enumerated ground the record calls "the SIS ground."
Whichever it is, the direction of the relationship is fixed by the field itself.

---

## Why the omission is deliberate, and under what stop condition

The Alaska legal-design intake memo — the registry's upstream source — declares **eleven** AK tracks.
One of them is the missing one
(`data/record-clearing/legal-design-intake/AK.memo.json` @ `3b6f4c10`):

- **trackId** `ak-set-aside`
- **legalName** "Set-Aside After a Suspended Imposition of Sentence, AS 12.55.085"
- **controllingAuthority** "AS 12.55.085, with the set-aside at (e) and the exclusions at (f)"
- **destination** the sentencing court, in the existing criminal case — "No Alaska Court System form
  for a post-discharge request was located."
- **legalDesignDecision.status** `legal_research_required`

with the rationale ending:

> Counsel's decision is preserved unchanged; the track is deferred rather than imported. … A concrete
> strategy may not stand in for what counsel has not decided. **The track is deferred, unregistered and
> unreachable.**

The stop condition has a name — **AK-4** — and a provenance chain, classified
`explicit_state_addendum`, sourced to `LegalEase-Alaska-Legal-Review.md` under "Alaska operational
amendments / True blockers retained":

> **AK-4:** whether a person discharged long ago without a set-aside may file later, and the legally
> correct vehicle for doing so, remain unresolved. **This determines whether any packet exists.**

The memo is explicit that AK-4 goes to *route existence*, not form identity. Counsel's tentative
"custom_pleading for a short motion in the existing criminal case" was recorded and then deliberately
**not** adopted, because it was not a settled conclusion.

Three further artifacts at the same revision carry the deferral independently:

| Artifact | Record |
|---|---|
| `legal-design-batch-delta-report.json` | `deferredTracks[2]` — `runtimeRegistration: "none"`, `runtimeReachable: false`, `outputStrategy: null` |
| `legal-design-implementation-queue.json` | `deferredTracks[0]` — `{AK, ak-set-aside}` |
| `legal-design-batch-1-completion.json` | `sourceIdReconciliation.deferredTracks[0]` — `unresolvedElements: ["governing_mechanism"]` |

And the arithmetic is exact. Of the memo's eleven AK tracks, precisely three carry
`legal_research_required` — `ak-set-aside`, `ak-cannabis-seal`, `ak-correct-record` — and precisely
those three are absent from the registry's eight. The other eight are all
`legal_design_approved_with_limitations`. The 11 → 8 delta *is* the deferral rule operating. This is
the registry's general import discipline, not an Alaska oversight.

---

## What this is not

**Not a categorical scope-out of set-aside relief.** Fifty-three registry tracks across AZ, CA, DC, ID,
LA, MI, ND, NE, NH, NV, OR, WA and WI turn on set-aside, vacatur or deferred-imposition relief. The
closest analogue is Arizona, whose own registry mechanism text reads:

> Set aside the judgment of guilt. **It is not sealing and not expungement.** … The record stays public
> with a set-aside annotation.

That is the same legal character as AS 12.55.085, and the registry carries it. So the exclusion here is
specific to AK-4's unresolved question about the post-discharge vehicle, and it dissolves the moment
AK-4 is answered.

**Not an unnoticed gap.** The registry named the statute and declined to register it, on the record.

**Not proof of absence for want of looking.** AS 12.55.085 appears nowhere in the pinned 497-track
registry — verified by reading the eight AK authority arrays out of
`data/rcap-ledger/registry-crosswalk-projection.json`, by full-text scan of the pinned registry blob
(sha256 `9d37ca7c…`, matching the hash the projection pins) and its companion source-relationships file
(sha256 `8376337488…`), and mechanically by replaying the crosswalk generator's spine function: no AK
track yields 12.55.85.

---

## Recorded for E3 — not acted on in this lane

1. **The crosswalk's stated reason for this row is wrong, though its disposition is right.** The row
   currently reads `unresolved_no_candidate` with `unresolvedReason: "no statutory citation, official
   form or scope restriction links this pathway to any registry track in its jurisdiction"` and
   `missingEvidence: ["a statutory citation in the compiled pathway id or label", …]`. Read against
   `scripts/generate-rcap-track-pathway-crosswalk.mjs`, that string is the boilerplate emitted whenever
   the candidate set is empty — it is not a finding that the pathway lacks a citation. The pathway
   carries one and the generator extracts it (the generator's own comment cites this very slug as its
   worked example). The accurate reason is: **AS 12.55.085 resolves to a deferred, unregistered
   legal-design track, not to any of the eight registered ones.**

2. **The compiled pathway should be preserved.** It is the only place in the runtime where an Alaskan
   with an SIS is told what a set-aside is and — correctly, and against the grain of what such a user
   would hope — that it is not expungement. Deleting it to balance the Alaska denominator would remove
   accurate law from the product.

3. **If AK-4 is ever answered**, the track the registry would then carry is already drafted in the
   memo: jurisdiction AK; mechanism authority AS 12.55.085, set-aside at (e), exclusions at (f); relief
   type a court-granted set-aside of the conviction plus issuance of a certificate, which neither seals
   nor destroys the record; destination the sentencing court in the existing criminal case; output
   strategy a custom pleading, since no Alaska Court System form for a post-discharge request was
   located. No slug is proposed here and no mapping is asserted.

---

## Sources and limits

All evidence is repository-internal and reproducible. Files marked `@3b6f4c10` are read from the
registry revision pinned by `data/rcap-ledger/registry-crosswalk-projection.json`
(`git show 3b6f4c103d2f97249b45acc0ea3fb889ff8787e5:<path>`); the two pinned files' sha256 values were
verified against the hashes recorded in the projection before use.

**Web access: unavailable for this question.** Every official Alaska source was refused by the network
egress proxy — `www.akleg.gov` (AS 12.55.085), `courts.alaska.gov` and `public.courts.alaska.gov`
(TF-800 / TF-805 / TF-810, Admin. Rules 37.6 and 40), `dps.alaska.gov` — each returning
`EGRESS_BLOCKED`. Web search returned listings but no official page body was retrieved, so no web
source is cited as evidence. Consequently I could not read the current text of AS 12.55.085(e) and (f)
or Administrative Rule 40(a). That limits exactly two things, neither of which moves the disposition:
I cannot independently answer AK-4 — which is the blocker's whole point, and is counsel's call rather
than this lane's — and I cannot identify which Rule 40(a) ground the `ak-courtview` record calls "the
SIS ground." The finding that no registry track carries AS 12.55.085, and that the registry deferred it
by a named and separately corroborated decision, rests wholly on repository artifacts.

**Confidence: high.**
