# Lane C3 — controlled pleadings, terminalization window 2026-08-12-w1

Branch `claude/rcap-terminalize-c3-pleadings`. Verifier:
`scripts/verify-rcap-terminalize-c3.mjs` (run with no arguments to check all 11
lane-C jobs; `--jurisdiction <slug>` to scope; `--write` to regenerate rendered
artifacts).

**Status: all 11 lane-C jobs / 22 tracks verified PASSED.**

## What landed

| Job | Tracks | Drafted | Blocked |
|---|---|---|---|
| T-C-NV-production-packet | 4 | 1 | 3 |
| T-C-ND-production-packet | 3 | 3 | 0 |
| T-C-SC-production-packet | 3 | 0 | 3 |
| T-C-ID-production-packet | 2 | 0 | 2 |
| T-C-KS-production-packet | 2 | 2 | 0 |
| T-C-WA-production-packet | 2 | 1 | 1 |
| T-C-NE-production-packet | 1 | 1 | 0 |
| T-C-OH-production-packet | 1 | 1 | 0 |
| T-C-OK-production-packet | 1 | 1 | 0 |
| T-C-VA-production-packet | 1 | 0 | 1 |
| T-C-WI-production-packet | 1 | 0 | 1 |
| **Total** | **22** | **10** | **12** |

ND, OH and OK landed in earlier waves. This wave terminalized NV, SC, ID, KS, WA,
NE, VA and WI — 16 tracks, 6 drafted and 10 blocked.

## The headline: more than half the wave is blocked, and that is the finding

Ten of the sixteen tracks in this wave could not be drafted. None of them were
blocked for convenience. They fall into four kinds, and the distinction matters
for who picks them up next.

### 1. An official form already occupies the route (6 tracks)

Lane C3 must never draft a replica of a mandatory official form. Where one exists,
the work belongs to lane D/E overlay.

- **SC — all three tracks** (`sc_aep`, `sc_tep`,
  `sc_conditional_discharge_44_53_450`). The committed South Carolina evidence
  states that South Carolina expungements start with either the Solicitor's Office
  or the summary court and **use the official SCCA 223-series forms**. Drafting an
  application or order replicates SCCA 223A1 or SCCA 223B1. The blank PDFs are in
  the source inventory; what is missing is a verified field map, and the committed
  catalog records the `south-carolina-scca223a1` field-map draft as
  `visual_review_required` and **hard-blocked**.
- **WA — `wa_crop_certificate_of_restoration`.** A complete statewide AOC form set
  has existed since 2016 under the RCW 9.97.020(11) duty (CRO 01.0100, 01.0200,
  01.0300, 01.0600, 01.0700). Two dependencies compound: whether those forms are
  mandatory, pattern or optional is unresolved (the word "sample" in (11)(b)
  points toward pattern, but the governing court rule was not read), **and** the
  five binaries have not been acquired, pinned or measured — no source-materialization
  receipt exists. So even the "conforming pleading" answer has nothing to conform to.
- **VA — `va_exp_identity_used_by_another`.** CC-1473 was retrieved and hashed at
  the Supreme Court of Virginia library on 2026-08-06 and is captioned to
  § 19.2-392.2(A) **alone**; the controlling review assigned it to this (B) route
  and the form's own caption does not support that. Every attempt to retrieve
  another circuit-court expungement form the same day returned **HTTP 404** — which
  proves the library was not fully readable, not that no (B) form exists.

### 2. The governing mechanism was never read at source (4 tracks)

- **NV — `nv_seal_decrim`** (NRS 179.271) and **`nv_seal_pardon`** (NRS 179.273).
  Only the chapter-index headings are committed. For decrim, the review does not
  even settle whether the instrument is a written request or a full petition, so
  the filing vehicle itself is unsettled. For pardon, sealing is automatic in the
  first instance, so offering a petition as the default output would push a
  participant into a filing they may not need.
- **ID — both tracks** (I.C. § 19-2604). The registry calls it, in its own words,
  "a true output-strategy blocker, not a record-review requirement". The open
  questions cover the statutory elements, caption, venue, required attachments,
  service and proposed-order practice — that is the entire instrument. Idaho is
  also the thinnest state pack in the partition, committing only `index.ts` and
  `all50-build-metadata.ts`.

### 3. Wrong instrument class — it is not a court pleading at all (2 tracks)

These are the two substantive contradictions between the ledger's
`custom_pleading` classification and the committed evidence. **Both are recorded,
not resolved by drafting, and both are recommended for reclassification.**

- **NV — `nv_repository_removal`** (NRS 179A.160). The registry venue field says it
  outright: *"Not a filing route."* It is a written application to two agencies —
  the Central Repository and the record-holding agency. No court, no order.
- **WI — `wi_exp_certificate_of_discharge_followup`** (Wis. Stat. § 973.015(1m)(b)).
  The registry says *"Not a court filing."* It is a letter to the supervising or
  detaining authority. Notably, the source is **not** deficient here — it states
  that no form and no prescribed contents exist and that the correspondence is to
  be drafted. The only obstacle is that lane C3 owns a court-pleading renderer and
  nothing else. **This one is ready to build the moment it reaches the
  participant-correspondence lane.**

The renderer emits a court caption, jurisdiction and venue allegations, a prayer
addressed to a court, and a proposed order with a judge's signature block. For an
agency application or a follow-up letter, all of that is fabricated — a more
serious invention than any single wrong fact, because it misrepresents the nature
of the remedy and can make a participant believe they have commenced a proceeding
they have not.

## What was drafted this wave (6 tracks)

- **NV `nv_seal_multi`** (NRS 179.2595) — consolidated county sealing. Nevada
  publishes no mandatory statewide form set. Prosecutor-first workflow: stipulation
  is obtained **before** filing, so there is no certificate of service. The
  affidavit/declaration in support and the prosecutor stipulation are recorded as a
  dependency rather than drafted — the stipulation records the prosecuting agency's
  position, which we never assert.
- **KS `ks-12-4516-municipal`** and **`ks-12-4516a-municipal-arrest`** — Kansas has
  hundreds of municipal courts and no unified forms regime, so a court-specific
  custom pleading is exactly right. Both statutes were read at source.
- **WA `wa_vac_post_probation_9_95_240`** (RCW 9.95.240) — the registry's own
  `correct_form` blocker answers itself: no pattern form exists, the section
  prescribes none, and the pleading is drafted on the RCW 9.94A.640 model.
  Pre-Sentencing Reform Act route only (offences before 1 July 1984).
- **NE `ne-seal-enforcement`** (§ 29-3528) — civil enforcement action against a
  non-complying agency; § 29-3528 authorises the general action on its own terms.

### Recurring drafting decisions worth knowing about

**Participant-named values are never guessed.** Three tracks leave an identity as a
confirm-with-the-court bracket rather than defaulting it:

- Kansas: the **city**. Kansas municipal courts are *city* courts, and the
  renderer's only geographic input is `caseData.countyName`. Wiring a county name
  into a city-court caption would name a court that does not exist, so the field is
  left unwired. **Any runtime wiring for Kansas must supply the city explicitly** —
  this is the one live wiring hazard in the wave.
- Nebraska: the **respondent agency**, and the **venue election** between the
  district where records are located and Lancaster County.

**A silence is recorded, never filled.** Every null carries a `sourceSilences`
entry naming the field, stating the silence, and surfacing it verbatim as a
counsel flag — enforced by the verifier. The commonest silences across the wave
were filing fees, verification statutes, and service rules. Two service silences
are worth separating from "absent by design": Washington RCW 9.95.240 and Nebraska
§ 29-3528 both had **no service rule surveyed**, which is different from a statute
that affirmatively assigns notice to the court (Kansas, Oklahoma). Both packets say
so plainly to the participant instead of inventing a step.

## Verifier changes (both lane C1 findings applied)

**Finding 1 — QA cannot see invented content.** `runPleadingQa` checks relief
vocabulary, template grade, lifecycle, the footer and seal/logo markers. Nothing
else. It will happily pass a fabricated court finding, a fee the source records as
absent, a prosecutor's position, completed service, or a populated protected field.

Added `scanUnseeableSignals()`, covering fabricated court findings, monetary and
fee amounts, prosecutor positions, completed service, hearing outcomes,
signatures, notarization, and the protected fields (docket number, OTN, judge,
SSN-shaped values, DOB). It runs in both directions:

- Every **negative fixture** in this wave must trip a declared signal class. Crucially,
  a negative fixture may now declare `qaPassed: true` — because that is the finding.
  Each one in this wave does exactly that: it reproduces the C1 failure mode, QA
  genuinely passes it, and the scanner is what rejects it.
- The same scanner must stay **silent** on every canonical, boundary and multiline
  fixture.

This was mutation-tested: stripping the invented content out of a negative fixture
makes the verifier fail with *"negative fixture tripped no invention/protected-field
signal"*. The assertion has teeth.

**Finding 2 — a null needs a recorded silence.** `verificationStatute.citation:
null` now requires a note carried verbatim as a counsel flag, and every strict
jurisdiction must supply a non-empty `sourceSilences` array whose entries each name
a field, state the silence, and match a counsel flag exactly.

**Blocked tracks are now first-class.** `trackDisposition: "blocked_pleading"`
skips fixtures and rendering, forbids a rendered packet or participant
instructions, and requires a dependency naming `kind`, `statement`,
`exactMissingSource` and `barsDraftingBecause` — plus `form`, `issuingBody` and
`publishedWhere` for an `official_form_dependency`.

## Carried findings for other owners

**OH `oh_2953_32_sealing` has a small fidelity gap I could not fix.** Its
`verificationStatute.citation` is null and the note reads: *"The applicant signs
the application; notarization is not identified by the source and local practice
may require it. Confirm any verification requirement with the clerk of the
sentencing court."* The counsel flag carries only the first sentence, dropping
"Confirm any verification requirement with the clerk of the sentencing court."

Ohio is outside this lane's owned paths, so the verifier requires **verbatim**
carry only for this wave's eight jurisdictions and merely **substantive** carry for
ND/OH/OK. Whoever owns the Ohio path should close the gap and move Ohio into
`STRICT_NEGATIVE_SLUGS`.

**ND, OH and OK negative fixtures predate finding 1.** They trip vocabulary QA
only, which the finding says is not proof of anti-invention enforcement. They are
outside this lane's owned paths and were left untouched; the verifier keeps them on
the original contract and no regression was introduced. Upgrading them is a small,
well-defined follow-up.

## Two reclassification recommendations for the ledger

1. `NV:nv_repository_removal` — `custom_pleading` is wrong; it is an agency
   application, not a filing.
2. `WI:wi_exp_certificate_of_discharge_followup` — `custom_pleading` is wrong; it
   is participant correspondence.

Neither was changed here: the ledger is outside this lane's owned paths, and the
contradiction is recorded in each track's config, handoff and jurisdiction
manifest instead.

## Notes for whoever runs this next

- The pinned registry commit `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` is not in a
  fresh clone by default. `git fetch origin feat/record-clearing-production-integration`
  makes it reachable; without it the verifier prints a note and **silently skips
  registry-excerpt fidelity checks**. Fetch it — those checks caught a real error
  during this wave (an unsupported `RCW 10.97.030` citation in the Washington CROP
  config, removed rather than justified by widening the excerpt).
- `node_modules` is empty in a fresh container. `npm ci` restores it without
  touching `package.json` or the lockfile.
- Owned paths for this lane:
  `data/rcap-all50/pleadings/{nevada,south-carolina,idaho,kansas,washington,nebraska,virginia,wisconsin}/**`,
  `scripts/verify-rcap-terminalize-c3.mjs`, and this file. The verifier enforces
  this against `git status` on every run.
