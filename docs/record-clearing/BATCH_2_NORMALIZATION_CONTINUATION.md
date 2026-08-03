# Batch 2 normalization — continuation state

Last updated: 3 August 2026 (Batch 1 amended-normalization reconciliation)
Branch: `feat/record-clearing-batch-2-legal-design`
Base: `e3f034b9c499fc6b6ec906dd82ef8e6599f8951f` (PR #87 platform base)
Last clean checkpoint: `2d787e7` — Batch 2 source-package import

## Done

- **B1** worktree `/workspaces/legalease-partner-dashboard-clean-batch-2`,
  branch cut from the exact base and pushed. Private corpus synced, untracked
  (`git ls-files private/` → 0).
- **B2** inputs verified: bundle 7/7 OK, source package 46/46 OK.
- **B3** source-package import complete. 39 files, 0 conflicts. Registries
  regenerated from the single canonical inventory. See
  `BATCH_2_SOURCE_IMPORT_RECORD.md` and `batch-2-source-gap-report.json`.

## Source-slot reconciliation baseline — done

`docs/record-clearing/batch-2-source-slot-reconciliation.json`

**136 source slots counted from the corpus, reconciling exactly with the
memorandum. Zero duplicates, zero dropped, zero extra.**

| | |
|---|---|
| Source slots | **136** |
| Split additions (IL +1, GA +2, KS +1) | **+4** |
| Projected normalized nodes | **140** |
| Non-relief nodes (IA, ME, MA, MD, MI) | **5** |
| Projected substantive relief mechanisms | **135** |

Per jurisdiction: GA 13, IL 16, IN 10, IA 7, KS 7, LA 10, MD 11, MI 11, MN 12,
MT 6, ME 6, MA 8, MS 9, MO 10.

Counting method: PART 1 relief-track headings. Indiana groups tracks 1–3 and
4–7 under combined headings and is expanded to individual slots. Lower-case
`Track N` headings in the custom-pleading and process-guidance specification
parts are cross-references, not slot definitions, and are excluded — counting
them inflates the total to 142.

140/135 is **derived** from the counsel-approved splits and reclassifications,
not hard-coded. The authoritative counts must still be generated from the
normalized corpus once memos exist.

**Use this file to check every memo on arrival**, so a dropped, extra or
duplicate source ID is caught at the first jurisdiction rather than after all
fourteen.

## Illinois — done

`data/record-clearing/legal-design-intake/IL.memo.json`

16 source slots → **17 normalized nodes**, all `relief_track`, all
runtime-disabled at `legal_review_pending`. 0 deferred. Strategies after the
packet-only re-review: `official_pdf_fill` 10, `process_guidance` 4,
`custom_pleading` 2, `composed` 1 (`il-prb-cert`, sequential, 2 units,
0 unresolved). 0 build blockers.

`il-immediate-seal` was reclassified from `process_guidance` to
`custom_pleading` with `localFormOverride: true` — a § 5.2(g) petition and
proposed order exist, and the courtroom constraint is a delivery restriction,
not an absent packet. `il-prb-cert` stage 1 stays guidance on the narrow ground
that no Prisoner Review Board application form has been sourced. See the
guidance re-review table in `BATCH_2_ADOPTION_CHANGELOG.md`.

Source Track P split into `il-prostitution-j-auto` and
`il-prostitution-j-vacate` under the counsel-approved crosswalk correction — see
the erratum in `BATCH_2_ADOPTION_CHANGELOG.md`. Cannabis Tracks N and O were
already separate and are unchanged; the statewide cannabis suite is mapped to
`il-cannabis-vacate` only.

### Batch 2 delta needs three arguments

The delta defaults to Batch 1. For a Batch 2 jurisdiction:

```bash
npm run rcap:legal-design-batch-delta -- \
  --batch=IL \
  --expected=/workspaces/legalease-legal-review-import/batch-2/expected/expected-track-ids.json
```

The `--expected=` override was added this pass, mirroring the script's existing
`--intake=`, `--out=` and `--approvals=` overrides. It defaults to the Batch 1
path, so a Batch 1 run is unchanged.

### ⚠️ Approving a composed unit rewrites the whole approvals file

`--approve-composed-units` **replaces** `legal-design-composed-unit-approvals.json`
with the composed tracks of the batch in that run. Running it with `--batch=IL`
alone would have silently deleted Batch 1's ten approvals. Always pass every
batch whose approvals must survive:

```bash
npm run rcap:legal-design-batch-delta -- \
  --batch=AL,AK,AZ,AR,CA,CO,CT,DC,DE,FL,HI,ID,IL \
  --expected=/workspaces/legalease-legal-review-import/batch-2/expected/expected-track-ids.json \
  --approve-composed-units
```

Then diff the file and confirm the pre-existing entries are byte-identical
before committing.

## Iowa — done

`data/record-clearing/legal-design-intake/IA.memo.json`

7 source slots → **7 normalized nodes**: 6 `relief_track` + 1
`supporting_action`. 0 deferred. Strategies: `official_pdf_fill` 5,
`composed` 1, `process_guidance` 1. 1 build blocker, 11 release blockers
across 7 tracks.

`ia-dci77` is the `supporting_action` the adopted memorandum directs: a
criminal-history check retrieves and verifies records and alters none, so it is
not a paid packet mechanism. Under the packet-only re-review it is nonetheless
*expected* to be packet-capable, because DCI-77 is a participant-completed
request carrying the participant's own release authorization signature. It is
held as guidance only because **no copy of DCI-77 has been sourced** — the same
fail-closed shape as the Illinois PRB gap.

`ia-9079`, deferred judgments, is modelled as a **composed alternative** rather
than one guidance route: the post-July-2013 branch is genuinely nothing-to-file,
while the pre-2013 branch does contemplate a participant application but has no
form, no rule and thin statutory mechanics, so that unit is unavailable and
carries the single Iowa build blocker.

Iowa's August 2024 Rule 2.86 Form 4 is mapped; the January 2021 revision stays
`historical_obsolete` and never runtime-selectable.

## Indiana — done

`data/record-clearing/legal-design-intake/IN.memo.json`

10 source slots → **10 normalized nodes**, all `relief_track`, 0 deferred.
Strategies: `official_pdf_fill` 6, `custom_pleading` 2, `process_guidance` 1,
`composed` 1. 1 build blocker, 17 release blockers across 10 tracks.

Combined headings in the review (Tracks 1–3 and 4–7) were expanded to
individual slots; lower-case cross-references in the pleading and guidance
specification sections were not counted.

`in_collateral_action` takes `custom_pleading` from the adopted memorandum,
which is controlling: the official-form label is not carried forward until the
actual statewide form is verified. `in_supplemental_order` is `custom_pleading`
because § 35-38-9-9(l) describes a petition on its face. `in_auto_expungement`
is the only standalone guidance route — § 35-38-9-1(b) expressly requires no
petition. `in_infraction_nondisclosure` is composed sequential: check whether
the court already acted, then a verified petition held unavailable pending the
form and MC case-type questions.

**Source gate:** the Coalition for Court Access **Section 5 conviction insert is
absent from the corpus**. Sections 2, 3 and 4 inserts are present. That is the
single Indiana build blocker and the conviction packet for
`in_conviction_serious_felony` cannot be completed without it.

## Group 1 source-completion correction — 2 August 2026

Ten official artifacts retrieved from the issuing agencies and imported with full
provenance. Corpus 557 → **567** expected artifacts; `form_candidate` 58 → 63,
`reference_only` 29 → 34.

| Jurisdiction | Change | Blocker effect |
|---|---|---|
| IL `il-prb-cert` | composed `sequential` → **`mixed`**, 2 → 5 units. Sealing and military certificate branches `official_pdf_fill` and available | build 0 → 0; only the non-military § 5.2(e-6) branch held |
| IA `ia-dci77` | `process_guidance` → **`official_pdf_fill`**, still `supporting_action` | missing-form blocker removed |
| IN `in_conviction_serious_felony` | `official_pdf_fill` → **`custom_pleading`**, `localFormOverride: true` | **build 1 → 0** |

**Group 1 build blockers: 2 → 1.** The only remaining one is the Iowa
pre-July-2013 `ia-9079` deferred-judgment application unit.

Two findings worth carrying forward:

- **There is no Indiana Section 5 insert to acquire.** The Coalition publishes
  inserts for Sections 2, 3 and 4 only. The corpus was already complete; the
  route needed a statutory custom pleading, not a form hunt.
- **Do not use the IPDC copy of I.C. 35-38-9.** It is labelled "Indiana Code
  2016" with amendment history ending at P.L.142-2015. Use the Office of Judicial
  Administration publication, updated 7/1/2026, now in the corpus.
- `iga.in.gov` is a JavaScript SPA and returns a 691-byte shell to every path;
  it cannot be scraped for statutory text.

## Group 1 complete — totals

| | IL | IA | IN | total |
|---|---|---|---|---|
| Source slots | 16 | 7 | 10 | **33** |
| Normalized nodes | 17 | 7 | 10 | **34** |
| `relief_track` | 17 | 6 | 10 | **33** |
| `supporting_action` | 0 | 1 | 0 | **1** |
| Deferred | 0 | 0 | 0 | **0** |
| Build blockers | 0 | 1 | 1 | **2** |

## Maryland — done

`data/record-clearing/legal-design-intake/MD.memo.json`

11 source slots → **11 nodes**: 10 `relief_track` + 1 `completed_or_verification`
(the DPSCS cannabis sweep, per the adopted memorandum). 0 deferred. Strategies:
`official_pdf_fill` 6, `process_guidance` 5. **0 build blockers**, 7 release
blockers across 6 tracks. Source-complete — the Batch 2 import already supplied
all five forms the review flagged as missing.

Three corrections to the source review, all recorded in the memo provenance:

- **`md_second_chance_shielding` is packet-capable.** The review recommended
  guidance-only; the adopted memorandum controls and directs
  `official_pdf_fill` on CC-DC-CR-148 with MDJ-008, treating the
  once-per-lifetime/one-court/one-county rules as scope and routing fields. The
  review's multi-court hard block is retained as the scope restriction.
- **`md_10103_legacy_police` is not composed.** The memorandum directs a staged
  official-form route, but § 10-103 requires the request within 8 years of an
  incident that must predate 1 October 2007, so the entry window closed no later
  than October 2015 and neither stage is reachable. A composed route requires at
  least one available unit, so it is `process_guidance` on a closed-window scope
  restriction. The memorandum's actual correction is preserved: DC-CR-071 is the
  **Maryland District Court** form, not a D.C. limitation.
- **`md_10104_pre_service` resolved from primary authority.** The review left it
  open ("full text not pulled"). § 10-104 empowers the **District Court** to
  order expungement on the State's nolle prosequi before service unless the State
  objects, and bars costs against the defendant. No participant filing exists, so
  `process_guidance` now rests on a precise ground.

## Massachusetts — done

`data/record-clearing/legal-design-intake/MA.memo.json`

8 source slots → **8 nodes**: 7 `relief_track` + 1 `local_variant` (the Boston
Municipal Court consolidated procedure, per the adopted memorandum). 0 deferred.
Strategies: `official_pdf_fill` 5, `process_guidance` 1, `composed` 1,
`custom_pleading` 1. **0 build blockers**, 4 release blockers across 4 tracks.

Two corrections to the source review, recorded with provenance:

- **Three of the four "staged or hybrid" tracks are not composed.** Tracks 4, 6
  and 8 stage a *product workflow*, not legally distinct units: the review's
  stage 2 is the participant's own narrative, which the product model permits
  through structured prompts, and stage 3 is filing and hearing attendance, a
  `post_generation_handoff`. Tracks 4 and 6 are single `official_pdf_fill`
  routes; Track 8 is a single `custom_pleading`. **Only Track 5 is genuinely
  composed** — the Commissioner of Probation certifies eligibility under
  §§ 100I/100J before the matter reaches a judge, so agency and court stages have
  different destinations.
- **Track 8 has no published BMC form.** The review left it unresolved; the
  adopted memorandum authorises the fallback directly, so it is `custom_pleading`
  with `localFormOverride: true` against the Standing Order's required contents,
  scope-restricted to three or more records across two or more BMC divisions.
  Recorded as a release blocker, not a build blocker.

`ma-autoseal` is the only retained guidance route, on a precise ground: § 100C ¶1
seals by operation of law and the sole participant-facing form, OCPS004, exists
only to **decline** the relief.

## Michigan — done

`data/record-clearing/legal-design-intake/MI.memo.json`

11 source slots → **11 nodes**: 10 `relief_track` + 1 `routing_node` (completed
deferrals, per the adopted memorandum). 0 deferred. Strategies:
`official_pdf_fill` 4, `process_guidance` 7. **0 build blockers**, 10 release
blockers across 6 tracks. No composed tracks.

Two corrections to the source review, recorded with provenance:

- **`mi_setaside_trafficking` is packet-capable.** The review classified it
  `process_guidance` with attorney handoff; the adopted memorandum controls and
  directs `official_pdf_fill` on MC 227b. LegalEase completes neutral
  identifiers, conviction data and contact information and formats the
  participant's own factual statement; attorney review is a *packet instruction*
  that expressly creates no upload, staff-review, proof-of-review or generation
  gate.
- **Four "missing" forms are already in the corpus.** The review's section 2.8
  lists MC 227a, MC 227b, MC 228 and MC 262 as missing and marks their currency
  a **build blocker** (open question 8). The Batch 2 import supplied all four —
  MC 227a and MC 227b at rev 07/2024, MC 228 at rev 03/2023, MC 262 at rev
  06/2019. This unblocks the marihuana route, which the review calls "the single
  best relief in Michigan" while noting "we do not have the form." Only RI-008
  remains unavailable, and that is inherent: it is taken in person.

Seven guidance routes retained, each on a precise ground rather than a
conclusory one — the three automatic set-aside routes and the two
biometric-destruction routes have no participant-facing submission at all; the
pre-2015 CSC-4 route is an express product-scope decision, not a legal gap; and
the deferral node is a `routing_node` whose court record is already nonpublic.

**No participant-facing MSP record-correction form exists.** The challenge
process runs by telephone or email to Michigan State Police and corrections must
be routed to the reporting agency, so no correction packet or supporting-action
node is asserted.

## Minnesota — done

`data/record-clearing/legal-design-intake/MN.memo.json`

12 source slots → **12 nodes**, all `relief_track`. 0 deferred. Strategies:
`official_pdf_fill` 3, `process_guidance` 7, `custom_pleading` 1, `composed` 1
(4 units, mixed). **0 build blockers**, 7 release blockers across 4 tracks.
Guidance re-review queue: 0 of the 7 guidance routes require re-review.

**Track 6 `mn_299c11_arrest_demand` is reclassified from guidance to
`custom_pleading`.** § 299C.11 relief runs on written demands the participant
submits, and the Judicial Branch publishes six sample letters. The packet
generates the participant-signed demands for the custodians that may hold the
arrest data — BCA, police department, county sheriff, city attorney, county
attorney and county department of corrections. Agency addresses are
manual-completion items; signature, disposition documentation, mailing and the
certified-mail recommendation are participant actions; refusal or nonresponse is
a post-generation handoff. Correspondence rather than a court filing is not a
reason to withhold a packet.

**Track 7 `mn_prosecutor_agreed` is one statewide mechanism with county
implementation**, modelled `composed` / `mixed` with four units and
`localFormOverride: true`, scoped `county` over Hennepin, Ramsey and Washington.
The request stage is a `custom_pleading` parent with two nested children — a
portal-or-contact-only county route as `process_guidance` and a supported
written request to the county or city attorney as `custom_pleading` — and the
court-sealing stage is `process_guidance` because the participant files no
petition once the prosecutor agrees. No per-county relief nodes were created,
and nothing represents that LegalEase obtains agreement, negotiates, or advises
whether approaching the prosecutor is strategically preferable.

**Track 11 `mn_petition_609a02_subd3` follows the adopted memorandum**:
`official_pdf_fill` on EXP102 + EXP104 + EXP105 as a statewide packet. A custom
pleading would create service and order-content risk without adding value. The
eight statutory disposition clauses and their waiting periods live inside the
one track, and the crime-victim nexus is a branch — **no separate
trafficking-survivor node**. Handoff is preserved for objections, contested
hearings, disputed dispositions, registration, violence or firearm issues,
crime-victim nexus theories, immigration, specially protected agencies and
requests for individualized advocacy.

**Track 12 `mn_inherent_authority` separates packet framework from delivery
scope.** The intake schema has no field for a packet that is identified but not
delivered: it carries no packet-capability or delivery-scope property, and any
component declared `official_pdf_fill` is normalized into a track-source
relationship and an official-form generation target, which would assert that
LegalEase fills EXP107. Delivery is therefore recorded as `process_guidance`
with rationale `individualized_advocacy`, and the packet framework — EXP102 as
the petition vehicle whose item 9 final checkbox routes to inherent authority,
EXP104 as proof of service, EXP107 as the published proposed order — is recorded
in the component notes and the scope restrictions. **The record does not say no
packet exists.** The exact fields that prevent a completed self-help packet are
named: EXP107 ¶¶ 2 and 3 require case-specific conclusions of law, and ¶¶ 6, 8
and 9 are open-ended legal-argument fields including the clear-and-convincing
balancing.

Tracks 9 and 10 are preserved as `official_pdf_fill` on EXP102 + EXP104 +
EXP106, with Track 10 kept distinct from juvenile delinquency relief: it is an
adult conviction following certification for adult prosecution. Hearing date,
time, Zoom credentials, courthouse information, agency addresses and
proof-of-service dates are manual-completion items across all petition routes,
not packet gaps — the packet is generated before the court supplies them.

Seven guidance routes are retained on a precise no-filing ground rather than
"agency controlled": Clean Slate, automatic cannabis, the Cannabis Expungement
Board route, both mistaken-identity routes and pardon-triggered expungement have
no application, petition, motion or demand and no participant filing
destination; Track 12 is a scope decision, stated as such.

**EXP103 is not generated.** It is a prosecutor- and court-side victim-notice
form, not a participant packet component, and its absence from the corpus is
correct.

Corrections and source resolutions recorded this pass:

- **Laws 2026, ch. 70, § 5 resolved on the merits.** Retrieved from the Revisor
  on 2 August 2026: section 5 adds § 609A.015, subd. 5(f), under which the BCA
  unseals a record and notifies the judicial branch if it later determines the
  record did not qualify, deciding **only** from a record in its criminal history
  system; following paragraphs are renumbered (g)–(j). It does **not** alter BCA
  identification duties, the court-sealing window or victim notice. Chapter 70
  states an effective date only for section 4 (1 January 2027), so section 5
  falls to the default in Minn. Stat. § 645.02. This changes a participant-facing
  warning, not packet identity, so it stays a **release blocker** on Track 1 and
  is now stated as a packet instruction.
- **EXP107 currency is unresolved and stays a release blocker.** The corpus copy
  is Rev 01/15. `mncourts.gov` returns HTTP 403 to automated retrieval, so the
  revision cannot be re-confirmed from the publisher here. Minnesota is not held
  for it: Track 12 is outside direct self-help delivery either way.

## Georgia — done

`data/record-clearing/legal-design-intake/GA.memo.json`

13 source slots → **15 normalized nodes**, all `relief_track`. 0 deferred.
Strategies: `custom_pleading` 10, `process_guidance` 3, `official_pdf_fill` 1,
`composed` 1 (2 units, sequential). **0 build blockers**, 21 release blockers
across 13 tracks. Guidance re-review queue: 0 Georgia candidates, 3 preserved.

Track L splits into `ga-fo-sentencing-post2026`, `ga-fo-active-pre2026` and
`ga-fo-discharged-pre2026`; `ga-rfo` stays separate. Every source slot is counted
once, and the one slot mapping to three approved nodes is counted once in source
reconciliation.

**HB 162 was read from the signed Act, closing the review's two Track L gates.**
Retrieved from the Governor's official signed-legislation library and confirmed
by the Office of Legislative Counsel's 2026 summary — Act 403, effective
1 July 2026, in force. Three findings the review could not have made:

- § 42-8-62.1(b)(1) is now **mandatory**: the defendant's "may seek to" and the
  court's discretion were struck, and the written-findings paragraph (b)(2) is
  struck and reads *Reserved*.
- The **preponderance findings in § 42-8-62.1(d) were struck**, and new
  § 42-8-62.2(d) requires no findings at all. Both petition routes are mandatory
  within 90 days of filing, so neither needs a privacy-harm or
  interests-of-justice narrative. § 42-8-62.1(f) changed "may" to **shall**, so
  the companion order to law enforcement, jails and detention centres is
  mandatory.
- The **discharged-person petition moved** out of § 42-8-62.1(c) into new
  § 42-8-62.2(c). § 42-8-62.1(c) as rewritten reaches anyone *sentenced* before
  1 July 2026 whose sentence was not revoked, which textually overlaps the
  discharged population; the adopted allocation is preserved and the overlap is
  recorded as a nonblocking note on both tracks, not as a departure.

**Three guidance routes reclassified on re-review**, each on a precise ground:
`ga-jail-k2` to `custom_pleading` because § 35-3-37(k)(2) authorises a
participant-signed written request to a named recipient and correspondence is
not a reason to withhold a packet; `ga-fugitive-j5` to `custom_pleading` because
§ 35-3-37(j)(5) supplies venue, notice recipients, contents, standard and relief,
and low volume and interstate facts are scope restrictions; `ga-vacated-j2` to
`custom_pleading` because the conviction is already vacated, so the petition is
not post-conviction litigation and its elements are objective. **Track A is the
one composed route** — the automatic § 35-3-37(h) unit has nothing to file, and
the request letter to the prosecuting attorney that the review itself lists as a
LegalEase deliverable is a second, distinct submission with `localFormOverride`.

**Three guidance routes retained**, none on a conclusory ground: `ga-time-expired`
is performed by the centre without any request; `ga-fo-sentencing-post2026` is a
court act at sentencing whose defendant-request language was struck, and GJP
publishes only a template order at plea for judges and attorneys; `ga-rfo`
requires the prosecuting attorney's advance written consent, which is negotiation
with an opposing party.

**`ga-rfo` records the packet framework rather than its absence** — venue,
statutory grounds, requested relief, hearing rule, the § 42-8-66(h) no-fee rule
and order distribution to the petitioner, prosecuting attorney, GCIC and DDS are
all on the track. Delivery stays disabled because the adopted memorandum makes a
distinct post-consent packet stage conditional on counsel's later approval; that
is the track's one release blocker. `packetIdentity` is derived from the presence
of a strategy, so the schema cannot store capability apart from delivery scope.

**Track B is not a staged hybrid.** The review's stages two and three are the
arresting agency's Section Two and the prosecutor's Section Three on the same GBI
form — third-party blocks, left blank. It is a single `official_pdf_fill` route.

Source currency: the corpus copy of the GBI *Request to Restrict Arrest Record*
is **byte-identical** to the copy GBI publishes today, and § 35-3-37 was not
amended in 2026. No statewide judiciary form exists for any Georgia court
petition, so every petition route carries `localFormOverride`. **One new official
artifact** — GBI/GCIC *Georgia Law Regarding Time Expired Restrictions*, imported
`reference_only`, which supplies the Track C consumer warning from the issuing
agency's own document. Corpus 567 → **568**.

## Kansas — done

`data/record-clearing/legal-design-intake/KS.memo.json`

7 source slots → **8 normalized nodes**, all `relief_track`. 0 deferred.
Strategies: `official_pdf_fill` 5, `custom_pleading` 2, `composed` 1 (2 units,
sequential). **0 build blockers**, 20 release blockers across 8 tracks. No Kansas
track is `process_guidance`, so the guidance re-review queue is unchanged.

Source Track A splits into `ks-21-6614-conviction` and `ks-21-6614-diversion`.
Every source slot is counted once, and the one slot mapping to two approved nodes
is counted once in source reconciliation.

**The review returned Kansas as "additional research required" and all five of
its build blockers are closed.** K.S.A. 22-2410 was read in full from 2025 HB
2393 § 5, and K.S.A. 12-4516 and 12-4516a from the Revisor's 2026 Kansas
Statutes. The Judicial Council does publish an arrest-record form set and does
not publish a municipal set. **The "missing" granting order was already in the
corpus** — `Order for Expungement of Conviction or Diversion`, Rev. KSJC 08/2022,
source-gated, supplied by the Batch 2 import.

**K.S.A. 21-6614 is reconciled from 2026 Senate Bill 430 § 2**, which reproduces
the whole section across the 2025 amendments. It confirms the review throughout
and adds two current facts: the non-judicial personnel charge authority runs
1 July 2026 to 30 June 2030, and the disclosure carve-outs are now twelve
contexts in (i)(2) and eighteen requestor categories in (l).

**The Track A split is substantive, not arithmetic.** The conviction node runs
from satisfying the sentence or discharge from supervision, is directed to the
convicting court by (a)(1), and carries the 3, 5, 7 and 10 year lanes. The
diversion node runs from fulfilment of the diversion terms, is directed to the
district court by (a)(2), and cannot reach the 10-year or 7-year DUI lanes
because (d)(2) speaks only of a sentence or supervision. Neither is split
further — waiting-period and offence tiers are calculation branches.

**Track A is one packet, not a staged hybrid.** Obtaining a hearing date is not a
separate legal mechanism. Hearing date, time, courthouse, division, room, copy
count and clerk-supplied case information are manual-completion items, and the
Notice of Hearing's certificate of service is left blank and labelled for the
clerk, whose signature line it carries.

**Track D is `official_pdf_fill`, overriding the memorandum's default**, because
the Judicial Council publishes a statewide *Petition for Expungement of Arrest
Record* (KSJC 02/2013) whose four grounds track K.S.A. 22-2410(c) exactly, plus a
KBI order cover sheet. Two findings: the (a)(2) mandatory category is a
prosecutor filing, not a participant one; and the (b)(3)(B) fee exemption reaches
identity-theft victims **and** anyone whose charges were dismissed for want of
probable cause, who was found not guilty, or whose charges were dismissed — most
arrest-only petitioners pay nothing.

**Track G is reclassified from guidance to a composed packet.** K.S.A.
22-4908(d)(3) directs the Judicial Council to develop the petition form and it
has, at revision 06/2022. Nine of its ten items are participant facts; only item
10 is a rehabilitation narrative, which is prompted and formatted. The route is
composed and sequential because relief and expungement are distinct filings with
different statutes, venues, notice sets, standards and fees; unit 2 references
`ks-21-6614-conviction` rather than duplicating it.

**Tracks E and F stay `custom_pleading` with `localFormOverride`.** Wichita
proceeds under Charter Ordinance No. 224 and publishes a Motion and Order;
Topeka publishes its own four forms under K.S.A. 12-4516. Track E is not split:
one municipal mechanism, one destination, one six-item petition, three findings
rather than four because an ordinance conviction carries no firearms finding.

Corrections: the review attributed K.S.A. 12-4516a's prohibited-ordinance ground
to K.S.A. 22-2410, and omitted 12-4516a(c)(5). No general poverty-based fee
waiver exists — 2026 HB 2724 and HB 2655 both died — though some district courts
publish a poverty affidavit as local practice.

`kjc.ks.gov` returns HTTP 403 to automated retrieval, so byte-level confirmation
against the publisher could not be made; the corpus 08/2022 petition is textually
identical to a Kansas clerk's current copy. That, and the Judicial Council's
non-commercial use terms, are release blockers on every official-form track.
**Four new official artifacts**, all source-gated, all unmodified originals with
the Council's revision footers: the arrest petition and its KBI order cover
sheet, and the registration-relief petition and its KBI order cover sheet.
Corpus 568 → **572**.

## Master Library Edition 1 adopted — 3 August 2026

**State normalization is paused after Kansas. Louisiana is not begun.** This pass
adopted a source authority; it did not normalize a jurisdiction, and it changed
no legal-design conclusion.

`docs/record-clearing/MASTER_LIBRARY_AUTHORITY.md` is the controlling document.

**Expungement.ai + RCAP Master Forms and Legal-Review Library, Edition 1.0**,
cutoff 2 August 2026, is now the canonical nationwide source authority. This
repository is a derived implementation of it. The edition is retained as an
immutable ZIP outside the repository at
`/workspaces/legalease-attorney-review-packages/Expungement_AI_RCAP_Master_Library_Edition_1.zip`,
SHA-256 `c0937fa7…bffbc53f8`, adopted in place and pinned rather than copied in —
this repository ignores `*.zip` and keeps source corpora out of version control.
All 498 checksums verify; every retained file is covered and manifested; manifest,
state coverage, legal-review coverage, gap, exclusion and duplicate ledgers all
reconcile with the edition summary.

**Edition 1 holds** 378 retained assets — 174 packet forms, 50 instruction assets,
36 supporting-process assets, 79 source-gated assets, 39 legal reviews — with
`generation_allowed = no` on every one of them.

### Reconciliation findings

- **196 of 572** repository source assets match a retained asset exactly by
  SHA-256: 98 packet forms, 68 source-gated, 23 instructions, 7 supporting
  process. 22 are exact duplicates, 25 are excluded or retired sources still
  present in the corpus (present, but not mapped as a current source anywhere),
  82 are HTML/ASPX captures the edition does not treat as workflow documents,
  19 are inventory rows whose binary the repository does not hold, and **228 are
  unmanifested repository assets**.
- **180** of those unmanifested assets carry a binary and are recorded in
  `pending-edition-amendments.json`. **88** of them are depended on by a
  normalized official-form component. None is discarded; none is authoritative;
  all are `library_authority_pending` and runtime disabled.
- **182 retained library assets** have no counterpart in the repository
  inventory, including all **39 legal reviews** and 76 packet forms.
- **0 hash mismatches and 0 revision mismatches** — and that is an evidence
  limit, not a clean bill. The repository artifact registry carries no document
  ID and an official title for only a small minority of unmatched assets, so no
  same-identity/different-bytes pair is currently decidable. Closing that is a
  mapping-blocker item.

### Track-source audit — all 21 normalized jurisdictions

209 tracks, 503 components. **47 tracks authority-cleared, 162 blocked.**

- **314 official-PDF components**: 95 mapped to a retained packet-form candidate,
  4 mapped only to a source-gated asset, 4 role mismatches, **211 unmanifested**.
  Only **31** carry a pinned SHA-256, so most mapped components do not yet meet
  the edition's matching-hash requirement.
- **103 custom-pleading** and **86 process-guidance** components correctly require
  no packet binary and are not failed for lacking one.
- **17 composed tracks / 39 units** audited unit by unit.
- **110 tracks — every Batch 1 track — lack a retained legal review.** Edition 1's
  twelve missing reviews are exactly the twelve Batch 1 jurisdictions: AL, AK, AZ,
  AR, CA, CO, CT, DC, DE, FL, HI, ID. Edition 1 records each as a release blocker.
- Minnesota is the sharpest single finding: the adopted memorandum expressly makes
  Track 11 an `official_pdf_fill` packet on EXP102/104/105, and Edition 1 retains
  only EXP101 in ES/HMN/SO plus FEE102/FEE103. The English EXP forms are not in
  the edition. Georgia and Kansas hold a legal review and no packet forms at all.

### Blockers — separate metrics, not one number

| Scope | Count |
|---|---|
| Master Library source gap | **38** (44 ledger rows, 6 reclassified as jurisdiction input) |
| Legal-design blocker | **88** |
| Source/currentness blocker | **281** |
| Mapping blocker | **314** |
| Technical blocker | **209** |
| Visual/legal-output blocker | **418** |
| Jurisdiction-input requirement | **6** |
| **Joined unique** | **1354** |

The previously reported **130 Batch 2 release blockers** are intact and unchanged:
they are the Batch 2 subset of the 281 source/currentness rows (IL 34, IA 9, IN 18,
MD 7, MA 4, MI 10, MN 7, GA 21, KS 20), with the remaining 151 belonging to
Batch 1. **130 and Edition 1's 44 gap rows are different metrics** — one counts
open counsel questions in normalized tracks, the other counts sources the edition
could not retain — and neither is a restatement of the other.

### Enforcement

- Loader `scripts/lib/master-library.mjs`; reconciler
  `npm run rcap:reconcile-master-library`; verifier
  `npm run rcap:verify-master-library-authority` (passing).
- Gate `src/lib/rcap/legal-design/master-library-authority.ts`, applied in the
  legal-design registry build. **Fails closed**: no audit entry means blocked.
- The gate removed **20 readiness ceilings** — 17 tracks that could otherwise have
  reached `packet_ready` and 3 guidance ceilings. `packetReadyCount` is now
  **derived** rather than hard-coded, and is **0**.
- **No route was promoted.** Enabled jurisdictions 0, launch gate red.

### Next action

Publish and adopt **Edition 1.1** from the pending-amendment ledger, then resume
**Kansas-successor normalization (Louisiana)** against that adopted authority.
Do not remap sources ad hoc in this repository in the meantime.

## Master Library Edition 1.1 published and adopted — 3 August 2026

**No state was normalized in this pass.** Kansas was already normalized (`4aa3450`);
**Louisiana remains unstarted** and stays paused until the Batch 1 amended-normalization
reconciliation runs. No live Batch 1 memo was rewritten.

`docs/record-clearing/MASTER_LIBRARY_AUTHORITY.md` is the controlling document.

**Edition 1.1** — `/workspaces/legalease-attorney-review-packages/Expungement_AI_RCAP_Master_Library_Edition_1_1.zip`,
SHA-256 `c66ea58a…20d28a99`, 144,123,507 bytes, 539 files, cutoff 3 August 2026.
Parent Edition 1.0 (`c0937fa7…bffbc53f8`) is untouched and still verifies against
its original hash. 538/538 checksums verify.

- **394 canonical assets**: 378 inherited unchanged + 12 amended Batch 1 legal
  reviews + 4 Kansas source-gated forms.
- **Legal-review coverage 39/51 → 51/51.** The twelve reviews Edition 1.0 lacked
  were exactly the twelve Batch 1 jurisdictions.
- **Source-gap ledger 44 → 32 rows**; the 12 closed rows are the missing reviews,
  closed only after each canonical asset was retained and checksummed.
- Batch 1 governance — packet-only amendment, decision matrix, README-IMPORT,
  expected counts/IDs, pre-amendment crosswalk — retained under
  `00_GOVERNANCE/BATCH_1_AUTHORITY/`. 79 `__MACOSX`/AppleDouble entries excluded;
  13 audit duplicates logged rather than published.
- The original-review archive (`b1f7eccb…656c8e74f`) is **provenance only**. All
  twelve originals were confirmed preserved verbatim beneath their addendum.

### The 117-ID Batch 1 crosswalk

117 expected source IDs; **110 live Batch 1 tracks, measured not assumed**.

| Disposition | Count |
|---|---|
| `exact_current_track` | 110 |
| `missing_from_current_normalization` | 7 |
| `unresolved_crosswalk` | **0** |

Zero current tracks lack an expected source ID. The seven — `ak-set-aside`,
`ak-cannabis-seal`, `ak-correct-record`, `al-olr`, `al-uncharged-arrest`,
`ca-1203-4b`, `co_mistaken_identity_expungement` — are exactly the seven tracks
deferred under `legal_research_required` at intake, and each traces to a row the
amended decision matrix keeps as a true blocker (AK-4, AK-7, AK-9, AL-9, AL-11,
CA-12, CO-11). All seven are queued in
`batch-1-amended-normalization-queue.json` (`not_started`). Four jurisdictions
need follow-up: **AK, AL, CA, CO**.

### A retained review is not readiness

Adopting the twelve reviews moved two Batch 1 tracks to `packet_ready` mid-build,
purely because a review now existed. That is wrong, and the gate that fixes it is
now explicit: every track in the twelve jurisdictions fails closed with
`legal_design_reconciliation_required` until the bounded amended-normalization
pass runs. `packet_ready` is back to **0**.

### Blockers — Edition 1.0 → 1.1

| Scope | 1.0 | 1.1 |
|---|---|---|
| Missing legal reviews | 12 | **0** |
| Legal-design reconciliation | 0 | **19** (12 jurisdiction + 7 ID) |
| Master Library source gap | 38 | 26 |
| Source/currentness | 281 | 281 |
| Mapping | 314 | 314 |
| Technical | 209 | 209 |
| Visual/legal-output | 418 | 418 |
| Jurisdiction input | 6 | 6 |
| **Joined unique** | 1354 | **1361** |

Official-PDF components: `authority_unmanifested_source` 211 → **207**,
`authority_mapped_source_gated` 4 → **8** (the four Kansas forms). Manifested is
not release-ready — those four gained an identity, not a release.

### Pending amendments

All 180 Edition 1.0 candidates carry a final disposition: 4 `adopt_source_gated`
(retained in 1.1), 37 `adopt_reference_only`, 103 `hold_legal_identity`, 28
`hold_provenance`, 8 `hold_currentness`. 176 remain open, none adopted without
established identity.

### Next action

Execute the bounded **Batch 1 amended-normalization reconciliation** for all 117
source IDs, then resume **Louisiana** against Edition 1.1.

## Batch 1 amended-normalization reconciliation — done, 3 August 2026

**No jurisdiction was normalized in this pass and no live memo was edited.**
Louisiana remains unstarted. Kansas was already normalized (`4aa3450`).

The bounded pass read the 117-track authority crosswalk against the live registry
jurisdiction by jurisdiction and found the normalization already agreed with the
controlling amended authority.

```text
Source IDs expected:                          117
Source IDs accounted:                         117
Imported live tracks:                         110
Deferred true blockers:                         7
Unaccounted:                                    0
Unexpected live tracks:                         0
Unresolved crosswalks:                          0
Jurisdictions reconciled:                 12 of 12
Jurisdiction-level amended-authority gates:     0
Track-level true blockers remaining:            7
```

### What was verified, not assumed

- All 117 source IDs appear exactly once across the twelve memos — 110 imported,
  7 deferred — with per-jurisdiction counts matching the authority exactly
  (AK 11, AL 11, AR 12, AZ 9, CA 13, CO 11, CT 14, DC 8, DE 6, FL 9, HI 9, ID 4).
- All 117 tracks cite their controlling amended review file and carry
  `classificationBasis: explicit_state_addendum`.
- Every route the decision matrix leaves as process guidance is process guidance
  today (CA-8/9, CO-1/3, DC-1/2, DE-1, FL-4, HI-9, AK-5, AR-9, DE-6, AK-10,
  CT-11/12), and every confirmed reclassification is reflected (AL-8, AL-10,
  AK-2/3/6, AZ-9, AR-7/8/10/11/12, CO-5, DC-3, DE-2, FL-5/6/7/8/9). **Zero
  conflicts.**
- The regenerated Batch 1 delta is byte-identical to the committed one.

### The seven deferred IDs

`ak-set-aside` (AK-4), `ak-cannabis-seal` (AK-7), `ak-correct-record` (AK-9),
`al-olr` (AL-9), `al-uncharged-arrest` (AL-11), `ca-1203-4b` (CA-12),
`co_mistaken_identity_expungement` (CO-11).

All seven were already representable and represented in the existing intake
schema: `legal_research_required`, `outputStrategy: null`, zero components, exact
`affectedElement` values, and provenance naming the addendum's true-blocker
section. No schema change and no new representation was needed. They remain
absent from the live registry and the paid-mechanism count, and are accounted in
source accounting, the crosswalk, the delta and the blocker ledger.

Their queue rows moved `not_started` → **`reconciled_deferred_blocker`**: source
ID accounted, live track intentionally absent, blocker still open, route runtime
disabled. Not `resolved` — accounting for a blocker is not answering it.

### One gate added

Lifting the twelve jurisdiction gates exposed that the platform readiness ceiling
reads release blockers but **not** legal-design blockers, so `ct-decriminalized`
(CT-9) and `dc_yra_set_aside` (DC-8) — both in the amended matrix's true-blocker
table — would have reached a `packet_ready` ceiling. The memos were correct;
both already carried those blockers with addendum provenance. The authority gate
now blocks on an open legal-design blocker, because a review that keeps a true
blocker open has not authorised the track. `packet_ready` is **0**.

### Authority marker

`batch1AmendedNormalizationApplied` is recorded **per jurisdiction** in
`authority.json` — all twelve `true`. The verifier fails if a gate is cleared for
a jurisdiction whose reconciliation is incomplete, and rejects a global boolean.

### Blockers after this pass

| Scope | Before | After |
|---|---|---|
| Legal-design reconciliation | 19 | **7** (12 jurisdiction gates closed) |
| Legal-design blocker | 88 | 88 |
| Source gap | 26 | 26 |
| Source/currentness | 281 | 281 |
| Mapping | 314 | 314 |
| Technical | 209 | 209 |
| Visual/legal-output | 418 | 418 |
| Jurisdiction input | 6 | 6 |
| **Joined unique** | 1361 | **1349** |

Authority-cleared tracks 47 → **73**; blocked 162 → 136. `packet_ready` 0,
enabled jurisdictions 0, launch gate red.

### Next action

Resume **Louisiana** normalization against Edition 1.1.

## Louisiana — done

`data/record-clearing/legal-design-intake/LA.memo.json`

10 source slots → **10 normalized nodes**, all `relief_track`. 0 deferred, 0
splits. Strategies: `official_pdf_fill` 7, `process_guidance` 3. No composed
track and no custom pleading — Art. 986 makes the form set statutory, so a
custom pleading would be contrary to the Code. **0 build blockers**, 20 release
blockers across 10 tracks. All three guidance tracks carry a preserved
rationale, so the guidance re-review queue gains **0 candidates** and stays at 5
for Batch 2.

**The review returned Tracks G, H and I as "additional research required" and
all three of its build blockers are closed.** Every article was read from
`legis.la.gov` current text rather than from the 2023-era source notes.

### The missing-form finding is inverted

The review's headline build blocker was that **six statutory forms were missing
from the archive**. All six are **retained by Edition 1.1** — Arts. 990, 993,
995, 998 and 999.1 as source-gated assets and Art. 984 as an instruction asset.
This is the Kansas lesson repeating: check the corpus before recording a
missing-form blocker.

What is actually unmanifested is the opposite set. **Arts. 987, 988, 989, 991,
992 and 994 — the Art. 986 mandatory forms every motion track depends on — are
retained by no Edition 1.1 asset.** The repository holds them only as seven
generic `Louisiana Laws - Louisiana State Legislature.html` browser-print
captures, which the edition classifies `not_a_workflow_asset`. They therefore
cannot reach the pending-amendment ledger through the corpus scan, and appear
only as `authority_unmanifested_source` component results and 28 mapping rows in
the blocker ledger. **This is a general authority-rule issue, not a Louisiana
quirk** — see `MASTER_LIBRARY_AUTHORITY.md`.

Louisiana acquired **no new source binaries**. Nothing needed acquiring: the six
"missing" forms were already retained, and the current-law questions were
answered by reading the Legislature's live text. `pending-edition-amendments`
totals stay at **176**; Louisiana's single row is unchanged and now carries 22
proposed track mappings.

### Tracks G, H and I

**Track G (`la-999-expedited-expungement`) is `process_guidance`, resolved on the
initiating act rather than on the absence of a motion.** Art. 972(1)
affirmatively defines expedited expungement as an order a judge may sign
*without the individual filing a motion to expunge with the clerk of court*;
Art. 986's mandatory-form list does not include Art. 999.1; and no article, form
instruction or LSP material names who prepares or presents the order. There is
no participant filing to generate, which is a substantive statutory conclusion.
Arts. 999 and 999.1 are **new — Acts 2024, No. 270, effective 1 August 2024** —
and the route is free, Art. 983(G) having been amended by the same Act.

**Art. 999(A)'s drafting defect is real and survives in current law.** It says
"all of the following" and then lists a declination to prosecute *and* an
instituted prosecution finally disposed of — mutually exclusive on their face.
The Acts 2024 No. 270 digest repeats "all of the following", and the Art. 999.1
order recites them under "wherein all of the following applies". Applied **as
written** (the narrower, fail-closed reading); the contradiction is preserved as
a release blocker, not cured by construction.

**Track H (`la-985-2-automated-expungement`) is not established as effective or
operational, and is retained as a disabled guidance/verification treatment.**
The Legislature's own current publication of Art. 985.2 still carries the note
*"Article 985.2 eff. upon appropriation of monies by the Legislature. See Acts
2023, No. 454."* Section 4 of that Act conditions effectiveness on 2023 Regular
Session appropriations for **three** named bodies — the office of state police,
the Louisiana Supreme Court and the Louisiana Clerks' Remote Access Authority —
and Art. 985.2(G) further conditions it on FY 2025-2026 executive-budget
funding. **LSP BCII publishes nothing about it**: its current expungements page
describes only the ordinary court-motion process and does not mention automated
expungement or Art. 985.2 anywhere. No request form, portal, timeline or
implementation notice exists. Not called automatic relief — Art. 985.2(B)
requires the defendant to submit a request.

**Track I (`la-985-3-immediate-expungement`) is `process_guidance`, read from the
full text rather than inferred from the title.** Art. 985.3 was enacted by **Acts
2024, No. 560** (2024 H.B. 416), whose digest calls it a *court-ordered* automatic
expungement. (A) the court **may order** immediate expungement of the record of
the violation that necessitated the probation or programme, for a person
**otherwise eligible**, on successful completion; (B) **only the Art. 992 form**
shall be used — the judge's order; (C) service under Art. 982 with the bill of
information, sentencing minutes and arrest/plea documents. It prescribes no
motion, and Art. 986 assigns it no motion form. Whether a defendant may move for
it, and whether it displaces the five- and ten-year waits (Art. 985.1(D)
disapplies them in terms; Art. 985.3 is silent), are release blockers.

### Art. 977(D) survives; only the fee sunset fell

**The 90-day marijuana route is intact.** The sunset in Art. 983(M)(5) nullified
**Paragraph M**, the fee provision, which terminated 1 August 2026 — two days
ago. Art. 977(D) contains no sunset, is present in the current Code with source
notes through Acts 2023, No. 342, and Art. 986 still lists Art. 998 among the
mandatory forms. So Track C keeps `official_pdf_fill` on Art. 998, the current
fee is the ordinary **Art. 983(A) $550 cap**, and the $300 rule is recorded as
historical. **The "file by July 31" warning is dead and must not be repeated.**

### Title XXXIV currentness

The review's source notes ran through 2023. **Title XXXIV was amended three
times in the 2024 Regular Session**: Acts 270 (Arts. 972 and 983(G); adding 999
and 999.1), Acts 560 (adding 985.3) and Acts 580 (Art. 978). **No 2025 or 2026
session amendment was located.** Art. 978(B) was read in full from current text —
four exclusion heads, five controlled-substance exceptions, and the pre-15-August-2001
carnal-knowledge exception with the R.S. 15:542(F) waiver order sufficing to meet
the mover's burden. Arts. 976 (2020), 985, 985.1 and 987 (2014) are unchanged.

Two corrections to the review: Art. 988's official heading is **"Motion for fee
exemption"**, not "Certification of Fee Waiver"; and Art. 990 cites **Art. 980**,
the contradictory-hearing article, not Art. 990 itself. Art. 980(C) also allows
the court one extension of up to thirty days beyond the sixty-day objection
window, which the review did not carry.

### No splits, and why

Every slot is one mechanism. Tracks A, B, D and F share the Art. 989/991/992 set
without merging — different eligibility articles, exclusions and clean-period
tests. Within a slot the statutory pathways are **branches, not mechanisms**:
Track B's Art. 894(B) and five-year routes, and Track D's Art. 893(E), ten-year,
first-offender-pardon and Art. 978(E) lanes, each run one form, one court, one
filing, one legal effect. **Art. 988 is a conditional supporting unit, not a
separate relief mechanism**, so no track is composed. Track J stays separate and
is referenced, never duplicated, by Tracks B and D.

The felony and misdemeanour clean periods are kept distinct: **five years /
felony convictions only** for misdemeanours, **ten years / any criminal offence**
for felonies.

### One ordering dependency, worth remembering

`rcap:reconcile-master-library` reads `deferredTracks` from whatever
`legal-design-batch-delta-report.json` currently holds. Run a jurisdiction-only
delta last and the reconciler cannot see Batch 1's seven deferred IDs, silently
reverting the amended-normalization queue to `not_started` and flipping
`allDifferencesExpresslyDispositioned` to false. **Always re-run the Batch 1
delta immediately before the reconciler.** Doing so restored all three Batch 1
authority records byte-identical.

## Maine and Montana — done (`5da9634`, `8fec9fc`)

Committed in the preceding pass, one commit per state. Both re-verified by a
bounded acceptance preflight at the start of the Mississippi pass: every gate
green, worktree clean afterwards, **no corrective commit required**.

**Maine** — 6 slots → 6 nodes. `relief_track` 4, `routing_node` 1,
`supporting_action` 1. `official_pdf_fill` 3, `composed` 1 (2 units,
alternative), `custom_pleading` 1, `process_guidance` 1. 0 build blockers, 24
release blockers.

The review's largest Maine build blocker is closed: **CR-307 exists**, retained
by Edition 1.1 at Rev. 06/26. Two corrections to the retained review: **PL 2025
c. 513 took effect 29 July 2026, not 11 January 2026** — the January date is
enactment without the Governor's signature — and **CR-308 exists** (Order on
Motion to Seal, Rev. 06/26) where the review recorded no proposed order for any
ch. 310-A route. CR-218 and CR-308 are unmanifested against Edition 1.1 and
authority-gated. ME-DEFERRED is a `routing_node` per the adopted memorandum;
ME-SCREENING moved from guidance to `custom_pleading` as a `supporting_action`;
ME-NONCONV is composed (confidentiality by operation of law + the § 709
correction request). Deferred-disposition confidentiality under 16 M.R.S.
§ 703(2) is **NOT ESTABLISHED** and fails closed.

**Montana** — 6 slots → 6 nodes, all `relief_track`. `composed` 4 (8 units, all
sequential), `official_pdf_fill` 1, `process_guidance` 1. 0 build blockers, 37
release blockers.

The composed structure is statutory, not workflow convenience: §§ 46-18-1110(2)(b)
and 46-18-204(2) and the OCA MMRTA instructions all put the DOJ CRISS submission
on the *participant*. ER-100/200 and DS-100/200 are never generated — the
non-commercial-use stamp is real and travels in the page footer even on
courts.mt.gov. Track 3 follows the adopted memorandum and stays packet-capable.
**Two Edition 1.1 source-identity findings**, mappings retained and
authority-gated: the CRISS form is classed `supporting_process`, which the gate
treats as unable to back an `official_pdf_fill` component (5 role mismatches);
and the OCA Proposed Order and Certificate of Service **share one document ID**,
`MT-OCA-MMRTA`, with different hashes (4 hash conflicts). Both are proposed
Edition 1.2 corrections.

## Mississippi — done

`data/record-clearing/legal-design-intake/MS.memo.json`

9 source slots → **9 normalized nodes**, all `relief_track`. 0 deferred, 0
splits, no speculative tenth node. Strategies: `custom_pleading` 8, `composed` 1
(2 units, alternative). **0 build blockers**, 43 release blockers across 9
tracks. The guidance re-review queue is unchanged — Mississippi has no
track-level `process_guidance` node.

### HB 1546 — resolved from enrolled text, and the review's alarm was a false alarm

The review's headline finding was that a **3-year felony waiting period had been
live in the product for four weeks** on an unverified basis, and that the
surrounding evidence pointed the other way. The enrolled text settles it.

**2026 HB 1546 = Chapter 430, Laws of 2026**, approved by the Governor
30 March 2026, effective 1 July 2026. Its long title begins: *"AN ACT TO AMEND
SECTION 99-19-71 … TO REVISE EXPUNCTION OF CRIMINAL RECORD BY REDUCING THE
WAITING PERIOD FOR ELIGIBILITY; TO PROHIBIT THE EXPUNGEMENT OF THE FELONY CRIMES
OF PROMOTING OR PROCURING PROSTITUTION …"*. The amendment markup is
unambiguous — `<s>five (5)</s> <u>three (3)</u> years` — five struck, three
inserted. New exclusions `<u>(xi) Felony procuring prostitution</u>` and
`<u>(xii) Promoting prostitution</u>`, both § 97-29-51, are underlined as
insertions. **SECTION 4 is the only temporal provision and carries NO
applicability clause.**

So HB 1546 amends **§ 99-19-71, § 97-3-54.1 and § 97-3-54.6 together** — not
§ 97-3-54.6 alone as the review suspected. **The live 3-year rule in
`src/lib/rcap-engine/compiled/profiles/MS-mississippi.json` is CORRECT and no
product-rule correction was required.** No re-screening obligation arises. The
one observation worth carrying: the profile cites LegiScan for the rule; the
enrolled text is now in the memo's `officialSources` and should replace that
citation whenever the profile is next regenerated.

The enrolled text also closed two further review questions: **"one (1)
conviction" and "one (1) felony expunction" are defined** to include all
convictions arising from a common nucleus of operative facts as determined in
the court's discretion; and the 10-day DA notice now sits at **§ 99-19-71(2)(b)**.
And § 99-19-71(3) resolved the Track 2 blocker: the Criminal Information Center
keeps a nonpublic record *"solely for the purpose of determining whether, in
subsequent proceedings, the person is a first offender"*, and the perjury
protection is expressly disapplied for that determination — **a prior expunged
conviction does defeat first-offender status.**

### Track 7 changed node type on the retrieved text

The mission required re-review, and the answer moved **twice**. On the review
alone it looked like a `completed_or_verification` guidance node. The retrieved
text of **§ 99-15-123(3)** shows expungement after pretrial intervention is
*"Upon petition therefor"* — a genuine participant request for relief — while
**§ 9-23-23** states its result with **no petition, application, fee, hearing,
notice or waiting period anywhere in the section**, which is unique in the
Mississippi scheme. Final treatment: **`relief_track`, `composed`,
`alternative`, 2 units** — a `custom_pleading` § 99-15-123(3) petition branch,
and a `process_guidance` verification branch for intervention court. The
programme itself is still not counted as paid relief.

### Everything is custom_pleading, and why

Mississippi has **no statewide expungement form** — confirmed against the
Judiciary and AOC sites, which publish none. The four archived PDFs are **Fourth
Circuit Court District models** for Leflore, Sunflower and Washington counties:
hardcoded three-county fields, the Greenville DA address, 2020 dates, a
certificate of service captioned for the wrong document, a mandatory grand-jury
allegation, and a § 99-15-26/§ 99-19-71 dual citation that conflates two
different tracks. They are drafting references only. Every petition track is
`custom_pleading` with `localFormOverride: true`, and court, county and
prosecuting authority are participant data.

### Sections retrieved this pass

`billstatus.ls.state.ms.us` served the enrolled bills directly (its TLS
intermediate is broken, so `curl -k` with redirect-following is needed). Justia,
FindLaw and Casetext all return 403 from this environment, and LexisNexis — the
official publisher the Secretary of State links to — is JS-gated. Enrolled acts
supplied §§ 99-19-71 and 97-3-54.6 (HB 1546), 21-23-7(6) (HB 354, 2021),
63-11-30(13) (SB 2095, 2022), 67-3-70(6) (HB 917, 2020) and 99-15-26/9-23-23
(HB 1352, 2019).

Three results worth recording. **§ 63-11-30's expungement provision is
subsection (13), not (14)** as commonly cited — (14) is Nonadjudication.
**§ 67-3-70(6)'s one-year period is now primary-authority supported** and is
retained on that basis, not on the secondary clearinghouse source the review
relied on. And **§ 9-11-15(3) and § 21-23-7(6) are word-for-word identical** on
every operative element, which confirms the single-node-with-venue-branches
treatment rather than a split.

The fee question stays open by design: § 99-19-72 levies $150 on *"each petition
to expunge an offense under Section 99-19-71"* **collected by the circuit
clerk** — which neither plainly reaches a subsection (4) non-conviction petition
nor maps onto a justice or municipal court filing. **No fee amount is published
on any Mississippi track**; the participant confirms with the clerk.

Mississippi acquired **no new source binaries**, so the pending-edition ledger is
unchanged at 176. Edition 1.1 retains only the Mississippi legal review — zero
forms — which is a state-specific gap rather than a general authority-rule
issue, so `MASTER_LIBRARY_AUTHORITY.md` is untouched.

## Not started

**B9 legal-design normalization of the one remaining jurisdiction.**

`MO` — **13 of 14 normalized** (IL, IA, IN, MD, MA, MI, MN, GA, KS, LA, ME, MT,
MS). Groups 1, 2 and 3 are complete. **Missouri is the sole remaining unstarted
Batch 2 jurisdiction.**

Committed bounded groups (operational only; does not change legal precedence):

| # | Group | Slots | Status |
|---|---|---|---|
| 1 | **Illinois, Iowa and Indiana all done** | 16 + 7 + 10 = 33 | **complete** |
| 2 | **Maryland, Massachusetts, Michigan and Minnesota all done** | 11 + 8 + 11 + 12 = 42 | **complete** |
| 3 | **Georgia, Kansas, Louisiana and Maine all done** | 13 + 7 + 10 + 6 = 36 | **complete** |
| 4 | Mississippi and Montana done; Missouri outstanding | 9 + 10 + 6 = 25 | Missouri outstanding |

### Batch 2 running totals after Mississippi

13 of 14 jurisdictions. 130 source slots → **130 normalized nodes**: 124
`relief_track`, 2 `supporting_action`, 2 `routing_node`, 1
`completed_or_verification`, 1 `local_variant`. 0 deferred. Strategies:
`official_pdf_fill` 56, `process_guidance` 33, `custom_pleading` 28,
`composed` 13 (31 units). **1 build blocker**
(Iowa `ia-9079`, pre-2013 deferred judgments — unchanged and untouched).
**254 release blockers**, measured as unresolved questions of impact
`release_blocker` summed over the per-jurisdiction deltas: IL 34, IA 9, IN 18,
MD 7, MA 4, MI 10, MN 7, GA 21, KS 20, LA 20, ME 24, MT 37, MS 43. Every
pre-Mississippi figure was re-run and is unchanged. Guidance re-review
candidates across Batch 2 remain 5; Georgia, Kansas, Louisiana, Maine, Montana
and Mississippi added none.

Across all 25 normalized jurisdictions: 240 tracks, **80 authority-cleared**,
160 authority-blocked. Blocker ledger 1609 unique rows. Composed approvals 23
tracks / 51 units. `packet_ready` 0, enabled jurisdictions 0, launch gate red.

### Measured size of Group 1, for the next session's planning

| Jurisdiction | Review source | Slots | Projected memo |
|---|---|---|---|
| Illinois | 692 lines / 10,756 words | 16 (+1 split = 17 nodes) | ~135 KB |
| Iowa | 537 lines / 8,094 words | 7 | ~55 KB |
| Indiana | 350 lines / 6,214 words | 10 | ~80 KB |

Batch 1 memos average roughly 8 KB of validated JSON per track (Alabama: 11
tracks, 88 KB). Budget accordingly: a single jurisdiction is a substantial
authoring pass, and the schema rejects an incomplete memo outright rather than
importing it partially. **Author one jurisdiction per pass and commit it before
starting the next.**

### What authoring a memo requires

Each `<CODE>.memo.json` must carry **all eighteen** required elements per
proposed relief track. A memo missing any one is *rejected*, not partially
imported — see `data/record-clearing/legal-design-intake/README.md`. Limitations
are classified objects, not strings; unresolved questions carry an `impact` and
an `affectedElement`; guidance tracks carry `guidanceRationales`. Batch 1 memos
run 60–168 KB each.

Do not infer legal substance. Where the controlling sources do not answer a
substantive question, preserve the exact statement, create one precise counsel
question, classify its impact only where the source supports it, and keep the
affected unit disabled.

Per group: exact source-slot reconciliation → report-only intake → strict
intake → Batch 2 delta → composed-unit approvals guard → focused verifier →
clean commit and push.

## Inputs, already staged and verified

`/workspaces/legalease-legal-review-import/batch-2/`

- `LegalEase_Batch_2_Legal_Research_Resolution_Memo_ADOPTED.md` — controlling
  where it expressly changes track structure, output strategy, packet
  capability, blocker treatment, product scope, geography, or supporting-document
  treatment. Otherwise the original jurisdiction review controls.
- `LEGALEASE_BATCH_2_COMBINED_SOURCE.md` — original jurisdiction reviews.
- `LEGALEASE_BATCH_2_STATE_SUMMARY.csv`
- `extracted/review-clean/` — 14 per-jurisdiction review files.
- `extracted/missing-forms-v3/` — the imported source package.

## Carry-forward rules for the next session

- 136 source slots; ~140 normalized nodes and ~135 substantive relief mechanisms
  expected. **Generate actual counts from the corpus — these are expectations,
  not constants.**
- Georgia is done and the correction was applied exactly:
  `ga-fo-sentencing-post2026`, `ga-fo-active-pre2026`,
  `ga-fo-discharged-pre2026`; `ga-rfo` separate and unchanged. L-2 and L-3 are
  notice-based, no prosecutor consent, no opposition/hearing branch. `ga-rfo`
  under § 42-8-66 requires advance prosecuting-attorney consent. **No
  old-M-to-new-L mapping.** Track IDs are lowercased because the schema requires
  it; nothing else about the memorandum's IDs changed.
- Renderer strategies are only `custom_pleading`, `official_pdf_fill`,
  `process_guidance`. Sequential/alternative/mixed are composition modes.
- Import when mechanism and packet identity are known, even with a missing form,
  unverified revision, open fee/service rule or pending output approval — keep
  those as source/build/release gates and the route runtime-disabled.
- Defer under `legal_research_required` only for the six listed unresolved
  questions. A deferred item gets no invented strategy.
- Do not infer legal substance. Preserve exact source statements and raise one
  precise counsel question.
- Mississippi received zero source files; absent forms are **open source
  questions**, not "not required". Georgia also received none, and the answer
  there was that only one mandatory official form exists — the GBI Request to
  Restrict Arrest Record, already in the corpus and confirmed current — while
  every court petition is a statutory custom pleading with a local-form override.
  Kansas is the counter-example worth remembering: a form the review recorded as
  missing was already in the corpus under its normalized source-gated name, and
  two more official form sets existed that the review had not looked for. **Check
  the corpus and the issuing authority's current form index before recording a
  missing-form blocker.**

## Invariants that must still hold at every checkpoint

Batch 1 unchanged · every imported Batch 2 route `runtime_disabled` · every
deferred route unregistered and unreachable · zero Batch 2 tracks
`packet_ready` · zero jurisdictions enabled · launch gate red · PR #87 and #89
unmerged · #89 draft · Phase 48 unapplied · nothing deployed · no Batch 1
promotion branch · no Batch 2 PR to main before #87 merges with a merge commit.

## Platform lane status — for awareness only, do not act on it here

R7 is resolved and committed on the held Phase 48 branch, `e5a0d46`:
artifact identity is now `unique (document_packet_id, component_id)`, with
`kind` retained as coarse non-unique metadata so several `court` artifacts may
coexist in one packet. PR #89 remains a held draft and Phase 48 remains
unapplied.

Still not started on the platform lane: canonical write-path rewiring,
component-to-artifact application mapping, download-route identity, the
`packets/store` production treatment, correcting the repository that references
`rcap_packet_fulfillments` and `rcap_packet_artifacts`, and the database-backed
acceptance proof.

## Out of scope for this branch

The platform storage-unification correction belongs on the PR #87 platform-core
lane. **Do not edit platform storage code or the Phase 48 migration here.**
