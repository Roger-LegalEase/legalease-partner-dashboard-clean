# Batch 2 Adoption Changelog

**Adopted:** July 31, 2026  
**Status:** Final legal-design normalization authority; not packet readiness.

## Final changes from the counsel-review draft

1. Counsel adopted the packet-only amendment and the twelve issue resolutions.
2. Georgia Track L was corrected and split into three precise IDs based on whether First Offender treatment was imposed and whether the pre-July 2026 case is active or discharged.
3. `GA-RFO` remains a separate § 42-8-66 mechanism requiring advance prosecutor consent to filing. It does not map to any L-family ID.
4. Michigan Track 4 remains packet-capable, but attorney/advocate review is a participant-facing instruction, not a LegalEase upload, staff-review, proof, approval, or generation gate.
5. Indiana Track 8 now cites I.C. 35-38-9-0.5 and 35-38-9-9.5 directly.
6. The proposed 140 normalized nodes / 135 substantive relief mechanisms remains arithmetically unchanged because Track M was already a separate source slot.
7. The memo now contains an explicit precedence rule and an implementation directive.

## Erratum — Illinois source-crosswalk correction, 2 August 2026

Counsel-approved during Illinois normalization.

The adopted memorandum's Illinois issue 4 correctly concluded that **one Illinois
source slot combines an automatic mechanism and a participant motion, that it
must split into two normalized mechanisms, and that the split adds one
normalized node.** The structural analysis stands.

The memorandum **incorrectly described the affected slot as cannabis.** In the
controlling Illinois review the cannabis mechanisms are already two separate
source slots and neither needed splitting:

| Source slot | Short name | Authority | Strategy | Treatment |
|---|---|---|---|---|
| TRACK N | `IL-CANNABIS-AUTO` | 20 ILCS 2630/5.2(i)(1) | `process_guidance` | unchanged |
| TRACK O | `IL-CANNABIS-VACATE` | 20 ILCS 2630/5.2(i)(3) | `official_pdf_fill`, statewide cannabis suite | unchanged |
| TRACK P | `IL-PROSTITUTION-J` | 20 ILCS 2630/5.2(j) | — | **split** |

Source Track P is Class 4 felony prostitution, and it is the slot that genuinely
combines the two mechanisms. It normalizes to:

- **`il-prostitution-j-auto`** — automatic sealing under § 5.2(j)(1)–(2),
  `relief_track`, `process_guidance`. Preserves the January 1, 2028 completion
  deadline, ISP Access and Review verification under § 5.2(j)(6), and no
  participant filing packet. It never asserts that an individual record has
  already been sealed without verification.
- **`il-prostitution-j-vacate`** — participant motion under § 5.2(j)(3),
  `relief_track`, `custom_pleading` with `localFormOverride: true`. Preserves
  sentence completion, the circuit court / Chief Judge / designated-judge venue,
  the State's Attorney's 60-day objection period, the statutory discretionary
  factors, participant-authored adverse-consequences facts, trafficking-survivor
  screening before ordinary prostitution-route questioning, trauma-informed
  intake with no graphic questioning, attorney review by default, and objection
  or contested hearing as a post-generation handoff.

**Form rule.** The Illinois statewide cannabis suite is mapped to
`il-cannabis-vacate` only. No prostitution-specific statewide form suite has been
identified, so the participant prostitution motion remains `custom_pleading`
with a verified local-form override. It is the one Illinois custom-pleading
route, which the controlling review states directly.

**Arithmetic.** Illinois reconciles at **16 source slots → 17 normalized nodes**.
Track P is counted once in source-slot reconciliation and twice only in the
normalized-node crosswalk, so the adopted +1 structural effect is preserved and
the projected Batch 2 total remains approximately 140 — still to be generated
from the completed corpus rather than hard-coded.

No route becomes packet-ready or runtime-enabled by this correction.

## Illinois guidance re-review under the packet-only model, 2 August 2026

All five standalone Illinois `process_guidance` tracks, plus stage 1 of the
composed PRB route, were re-reviewed against the controlling product rule: a
route is **not** guidance merely because an agency decides, a third party signs
or certifies, the court has discretion, the participant must author a
rehabilitation or hardship narrative, supporting documents must be attached,
notarization is required, or a hearing may occur. `process_guidance` applies only
where there is genuinely no participant-facing filing for LegalEase to generate,
or the filing vehicle is legally unresolved.

| Track | Participant filing exists | Packet capability | Delivery restriction | Reason guidance retained | Fallback / later stage | Unresolved |
|---|---|---|---|---|---|---|
| `il-auto-seal-2029` | no | none | n/a | ISP and clerks execute § 5.2(k) sealing; nothing to file | `il-seal-2yr`, `il-seal-3yr`, `il-exp-nonconv` | whether ISP already auto-seals via Access and Review |
| `il-auto-seal-2028` | no | none | n/a | Clerks execute § 5.2(l) sealing; nothing to file | `il-seal-2yr` | — |
| `il-cannabis-auto` | no | none | n/a | Agency executes § 5.2(i)(1) expungement; nothing to file | `il-cannabis-vacate` | — |
| `il-prostitution-j-auto` | no | none | n/a | ISP, police and clerks execute § 5.2(j)(1)–(2) sealing; nothing to file | `il-prostitution-j-vacate` | — |
| `il-immediate-seal` | **yes** | **`custom_pleading`** *(was `process_guidance`)* | attorney-mediated, same-hearing filing only | **not retained** | ordinary sealing via `il-seal-nonconv` | no statewide or verified local form covers § 5.2(g) |
| `il-prb-cert` stage 1 | **yes** | **`official_pdf_fill`** *(superseded 2 Aug 2026 — see the source-completion correction below)* | none for the sealing and military branches | **not retained**; only the non-military § 5.2(e-6) branch stays held | stage 2 `official_pdf_fill` on the adult suite | whether any official non-military § 5.2(e-6) certificate application exists |

### `il-immediate-seal` — reclassified to packet-capable

Section 5.2(g) requires a verified petition and proposed order filed during the
disposition hearing, so a participant-facing filing exists. The prior
classification conflated LegalEase's inability to appear in court with an absence
of a packet. The generated artifact is an **attorney-handoff packet**: draft
verified petition, draft proposed order, and a statutory timing and courtroom
checklist built from participant-supplied case and arrest facts, delivered to
retained counsel, appointed counsel or the public defender **before** the
hearing. The participant is never told they may self-file it after leaving court.

`custom_pleading` with `localFormOverride: true` is confirmed by source rather
than assumed: the statewide adult suite governs *"A, B, C, D, E, F, G, H, J, and
stage 2 of K"* and expressly not Track I, so no verified official form covers the
same-day mechanism.

### `il-prb-cert` stage 1 — rationale corrected, classification held

The original reasoning — that the Board's discretion and the participant's
rehabilitation showing make the stage unsuitable for automation — is **rejected**
by the packet-only model. Under that model stage 1 is expected to be
packet-capable.

> **Superseded 2 August 2026.** The PRB forms were subsequently retrieved from
> the Board's official site and imported, so stage 1 is now `official_pdf_fill`.
> See the Group 1 source-completion correction below. The reasoning recorded here
> — that discretion and a rehabilitation narrative do not make a stage
> guidance-only — stands.

It was at the time **held as guidance on a narrower, factual ground**: no official
Prisoner Review Board application form had been sourced. The Illinois private
corpus holds only the adult, cannabis and juvenile suites. Mapping a form that has
not been verified would fabricate a source mapping, so the stage fails closed and
the exact gap is recorded as a release blocker. A § 5.2(e-5) Certificate of
Sealing application and a § 5.2(e-6) Certificate of Eligibility for Expungement
are legally distinct and neither may stand in for the other.

Node count is unchanged at 17. No route becomes packet-ready or runtime-enabled.

## Group 1 source-completion correction, 2 August 2026

Ten artifacts were retrieved from the issuing agencies' own official sites and
imported into the private corpus with SHA-256, page count, field count,
structural class, source URL and retrieval date. No screenshot, printout, HTML
conversion or recreated file was used.

### Illinois — Prisoner Review Board, `il-prb-cert`

The earlier hold rested only on the PRB forms being absent from the corpus. That
gap is closed. Imported from `prb.illinois.gov`:

| Artifact | Pages | Fields | Class | Revision |
|---|---|---|---|---|
| Certificate of Sealing Application | 5 | 55 | clean AcroForm | 09/18/2024 |
| Certificate of Sealing Eligibility Acknowledgement | 2 | 13 | clean AcroForm | undated |
| Guidelines for Certificate of Sealing | 4 | 0 | flat | 09/18/2024 |
| Sealable convictions list | 7 | 0 | flat | undated |
| Certificate of Expungement for Military Application | 5 | 55 | clean AcroForm | v9.18.24 |
| Military Eligibility Acknowledgement | 2 | 11 | clean AcroForm | undated |
| Guidelines for Certificate of Expungement for Military | 4 | 0 | flat | v9.18.24 |

The composed track becomes `mixed`: a sequential certificate stage then a court
stage, with three alternative certificate branches nested under the certificate
stage. Sealing and military branches are `official_pdf_fill` and available. The
**non-military § 5.2(e-6) certificate branch alone remains held** — the Board
publishes a Certificate of Sealing and a military-specific Certificate of
Expungement, and no general non-military expungement-certificate application was
located. Node count unchanged at 17.

Verified filing facts now carried in the packet: notarised perjury declaration;
75-day pre-docket deadline; delivery to the Board at 1001 North Walnut Street,
Springfield; copies with proof of delivery to the sentencing or chief judge and
the current State's Attorney of the county of conviction; supporting
documentation; and the four-year bar after a denial.

### Iowa — `ia-dci77`

Imported the Iowa DPS **combined DCI-76 billing form and DCI-77 request form**
(fillable), 3 pages, 45 fields, clean AcroForm. The form itself states that
DCI-77 is the only approved release authorization form for this purpose.

`ia-dci77` moves from `process_guidance` to **`official_pdf_fill`** and stays a
`supporting_action`. Fee is **$15 per last name**, one request form and fee per
name; cash, cheque, money order and MasterCard, Visa or Discover accepted, or a
pre-paid DCI account; submission by mail, fax, email or in person, never phone.
The release authorization is participant-signed, payment is required before
submission, result fields are agency-completed, and the 30-day currency window is
timing guidance for the downstream § 901C.3 filing rather than a generation
blocker.

### Indiana — § 35-38-9-5 conviction expungement

**No Section 5 insert exists to acquire.** The Coalition for Court Access
publishes conviction inserts for Sections 2, 3 and 4 only; the corpus already
held all three. This was never a corpus gap.

The route is nonetheless packet-capable. The current Office of Judicial
Administration publication *Detailed Information on Criminal Case Expungement*,
updated 7/1/2026, supplies the complete § 35-38-9-8(b) petition contents, the
current Section 5 eligibility and exclusion structure, the waiting period, venue,
the civil filing fee with indigency waiver under § 35-38-9-8(d), service under
the Trial Rules, the 30-day prosecutor response and waiver-by-silence rule under
§ 35-38-9-8(g), victim notification, and the order effect. The route becomes
**`custom_pleading` with `localFormOverride: true`** and its build blocker is
removed.

Written prosecutor consent is `required_before_filing`, a product-scope
restriction and an attorney-handoff point where negotiation is needed. LegalEase
does not obtain it and does not represent that it does.

Two currency findings are recorded as release blockers rather than legal-design
blockers: the CCA base conviction petition and order bundle in the corpus is the
03/2020 revision and predates later amendments, and counsel must approve the
specimen Section 5 petition and order. The Indiana Public Defender Council copy
of the chapter was rejected as stale — it is labelled "Indiana Code 2016" with
amendment history ending at P.L.142-2015.

The current OJA publication also resolves the Indiana exclusions question: the
Section 5 exclusion list is now carried from primary authority, including that a
person convicted of official misconduct may seek Section 5 relief **unless** they
are an elected official or an elected or appointed judicial officer.

### Result

Group 1 build blockers fall from **2 to 1**. The only remaining Group 1
legal-design build blocker is the Iowa pre-July-2013 `ia-9079` deferred-judgment
application unit, which has no form, no rule and thin statutory mechanics and was
not independently resolved in this pass.

## Minnesota under the packet-only model, 2 August 2026

### `mn_299c11_arrest_demand` — reclassified to packet-capable

The review treats § 299C.11 arrest-data relief as a process. It is not. The
statute runs on **written demands the participant submits** to the custodians,
and the Judicial Branch publishes six sample letters for exactly that purpose.
Reclassified `process_guidance` → **`custom_pleading`**, generating the
participant-signed demands for the BCA, police department, county sheriff, city
attorney, county attorney and county department of corrections.

Correspondence rather than a court pleading is not a reason to withhold a
packet. Agency addresses are manual-completion items, signature and mailing are
participant actions, the certified-mail recommendation and retained receipts are
instructions, and agency refusal or nonresponse is a post-generation handoff.

### `mn_inherent_authority` — packet framework recorded, delivery held

The schema was examined for a way to carry an attorney-handoff packet capability
— neutral participant and case fields completable, legal-analysis fields left
blank — and it has none. There is no packet-capability or delivery-scope
property, and a component declared `official_pdf_fill` is normalized into a
track-source relationship and an official-form generation target, which would
assert that LegalEase fills EXP107.

Delivery is therefore held at `process_guidance` with rationale
`individualized_advocacy`, and the packet framework is recorded in the component
notes and scope restrictions rather than dropped: **EXP102** is the petition
vehicle and its item 9 final checkbox routes to inherent authority, **EXP104** is
proof of service, **EXP107** is the published proposed order. The record does not
say that no packet exists.

What prevents a completed self-help packet is named precisely, not asserted
generally: EXP107 ¶¶ 2 and 3 require case-specific conclusions of law, and
¶¶ 6, 8 and 9 are open-ended legal-argument fields including the
clear-and-convincing balancing. Under *Schultz* the relief reaches judicial
branch records only, so police, sheriff, prosecutor and BCA records stay public —
which the official instructions state expressly.

### Laws 2026, ch. 70, § 5 — resolved on the merits

Retrieved from the Revisor on 2 August 2026. Section 5 adds § 609A.015,
subd. 5(f): the BCA unseals a record and notifies the judicial branch if it later
determines the record did not qualify for automatic relief, deciding **only**
from a record in its criminal history system; following paragraphs are
renumbered (g)–(j). It does **not** alter BCA identification duties, the
court-sealing window or victim notice. Chapter 70 gives an effective date only
for section 4 (1 January 2027), so section 5 falls to the default in Minn. Stat.
§ 645.02.

Effect: a participant-facing warning that Clean Slate relief is not final in the
way a court order is. Packet identity is unaffected — Track 1 has no packet — so
this stays a **release blocker**, now stated as a packet instruction rather than
an open question about the amendment's content.

### EXP103 is not a participant component

EXP103 is completed by the prosecutor or the court as a victim-notice form. It is
not generated, and its absence from the corpus is correct rather than a gap.

## Georgia under the packet-only model, 2 August 2026

13 source slots → **15 normalized nodes**, all `relief_track`, 0 deferred.
Track L splits into three mechanisms under the adopted memorandum; Track M stays
separate. Strategies: `custom_pleading` 10, `process_guidance` 3,
`official_pdf_fill` 1, `composed` 1. **0 build blockers**, 21 release blockers
across 13 tracks. Guidance re-review queue: 0 Georgia candidates, 3 preserved.

### HB 162 read from the signed Act — two open questions closed

The review rested Track L on the Legislative Counsel summary, the bill caption
and Georgia Justice Project implementation materials, and made reading the
enrolled text a gate on shipping. The signed Act was retrieved from the
Governor's official signed-legislation library and read in full, and the Office
of Legislative Counsel's 2026 summary confirms **Act 403; HB 162 … Effective
July 1, 2026**, amending §§ 35-3-34, 35-3-35 and 42-8-62.1 and enacting
§ 42-8-62.2. That closes open questions 1 and 2 and produces three corrections
the review could not have made:

- **§ 42-8-62.1(b)(1) is now mandatory and has no findings requirement.** The
  defendant's "may seek to" and the court's "may, in its discretion" were struck;
  the court **shall** limit public access at sentencing. The written-findings
  paragraph (b)(2) is struck and now reads *Reserved*.
- **The preponderance findings in § 42-8-62.1(d) were struck.** On a properly
  filed petition the court **shall** order restriction and sealing within 90
  days, with no balancing. The same is true of new § 42-8-62.2(d), which requires
  no findings at all. Neither First Offender petition route needs a
  privacy-harm or interests-of-justice narrative, so there is no advocacy for
  LegalEase to invent or withhold on either.
- **The discharged-person petition moved.** Act 403 struck the exonerated-and-
  discharged language out of § 42-8-62.1(c) and rewrote it to reach anyone
  *sentenced* under the article before 1 July 2026 whose sentence was not revoked
  and adjudicated guilty; the discharged-person petition is now new
  § 42-8-62.2(c). § 42-8-62.1(f) also changed "may" to **shall**, so the
  companion order to law enforcement agencies, jails and detention centres is
  mandatory.

§ 42-8-62.1(c) as amended is textually broad enough to include a discharged
person, which overlaps § 42-8-62.2(c). The adopted memorandum allocates the
discharged population to § 42-8-62.2 and the active or not-yet-discharged
population to § 42-8-62.1(c), and GJP publishes two model petitions on exactly
that split. The overlap is recorded on both tracks as a nonblocking research
note, not as a reason to depart from the adopted structure.

### Guidance re-review — three reclassified, three retained

| Track | Was | Now | Ground |
|---|---|---|---|
| K `ga-jail-k2` | `process_guidance` "with a prepared request letter" | **`custom_pleading`** | § 35-3-37(k)(2) authorises a written request by the participant to a named recipient with definite contents and relief. Correspondence rather than a court filing is not a reason to withhold a packet. |
| J `ga-fugitive-j5` | `process_guidance` for v1 | **`custom_pleading`** | § 35-3-37(j)(5) supplies venue (superior court of the county of arrest), notice recipients, contents, standard and relief. Low volume and interstate facts are scope restrictions. |
| I `ga-vacated-j2` | `process_guidance` with mandatory handoff | **`custom_pleading`** | The conviction has already been vacated, so the petition is not post-conviction litigation and attacks nothing. Its elements are objective and participant-knowable. A discretionary standard is a scope and handoff matter under the packet-only amendment. |
| A `ga-nonconv-post2013` | `process_guidance` | **`composed` / sequential** | The automatic unit is genuinely guidance, but the review itself lists a request letter to the prosecuting attorney among the things LegalEase can prepare. That is a distinct participant submission to a distinct actor, so it is modelled as a second unit. |
| C `ga-time-expired` | `process_guidance` | **retained** | § 35-3-37(h)(1)(A)(ii) is performed by the centre without any request. No participant submission and no recipient exists. |
| L-1 `ga-fo-sentencing-post2026` | `process_guidance` | **retained** | § 42-8-62.1(b) as amended is a court act at sentencing. The defendant's request language was struck; GJP publishes only a template order at plea for judges and attorneys. |
| M `ga-rfo` | `process_guidance` | **retained** | § 42-8-66(a) permits filing only with the prosecuting attorney's advance consent. Obtaining it is negotiation with an opposing party. |

### Track M records the packet, not its absence

The post-consent § 42-8-66 petition is legally identifiable and its framework is
recorded on the track: venue in the convicting court, the two statutory
eligibility grounds, the requested order retroactively granting first offender
treatment with exoneration and discharge, the hearing rule, the § 42-8-66(h)
no-fee rule, and distribution of the order to the petitioner, the prosecuting
attorney, GCIC and the Department of Driver Services. **The record does not say
no packet exists.** Delivery stays disabled because the adopted memorandum makes
a distinct post-consent packet stage conditional on counsel's later approval,
which has not been given; that question is the track's single release blocker.
The schema cannot store packet capability apart from delivery scope —
`packetIdentity` is derived from the presence of a strategy — so the only
structural alternative would be a composed route with an unavailable
post-consent unit, which is the change counsel reserved to themselves.

### Two further corrections to the source review

- **Track B is not a staged hybrid.** The review's stages two and three are the
  arresting agency completing Section Two and the prosecuting attorney
  completing Section Three of the same GBI form. Those are third-party blocks,
  which the packet-only amendment leaves blank; filing, waiting and an agency
  decision are workflow stages, not legally distinct participant submissions. It
  is a single `official_pdf_fill` route.
- **Track A's request letter is packet-capable.** GBI and georgia.gov both direct
  the participant to contact the prosecuting attorney where restriction was not
  entered, and county offices may publish their own intake form, so
  `localFormOverride` is set on that unit.

### Source currency

The corpus copy of the GBI *Request to Restrict Arrest Record* is **byte-identical**
to the copy GBI publishes today (sha256 `5fe841de…`), so the one mandatory
Georgia form is current. § 35-3-37 was **not** amended in 2026: the Office of
Legislative Counsel's index lists only §§ 35-3-34, 35-3-34.2 and 35-3-35 in
Chapter 3, confirming the review's finding. No statewide judiciary form exists
for any Georgia court petition in this area, so every petition route carries
`localFormOverride`.

**One new official artifact.** GBI/GCIC *Georgia Law Regarding Time Expired
Restrictions*, 2 pages, flat PDF, sha256 `0e2f1170…`, imported as
`reference_only`. It is the issuing agency's own published statement of the
Attorney General's 20 August 2013 determination that time-expired restrictions
do not meet the federal definition of sealed records, so GCIC still provides
those records to the FBI and other states for employment and licensing. That
moves the Track C consumer warning off county prosecutor materials and onto the
agency's own document, and downgrades open question 7 to a nonblocking note.
Corpus 567 → **568**; `reference_only` 34 → 35.

## Kansas under the packet-only model, 2 August 2026

7 source slots → **8 normalized nodes**, all `relief_track`, 0 deferred. Source
Track A splits into a conviction node and a fulfilled-diversion node. Strategies:
`official_pdf_fill` 5, `custom_pleading` 2, `composed` 1. **0 build blockers**,
20 release blockers across 8 tracks. No Kansas track is `process_guidance`, so
the guidance re-review queue is unchanged.

### Both of the review's build blockers are closed

The review returned Kansas as **"additional research required"** on five open
questions, of which questions 1–5 were build blockers. All five are now closed:

- **K.S.A. 22-2410, 12-4516 and 12-4516a were read in full** from current
  official text — 22-2410 from 2025 House Bill 2393 § 5, which amends it, and
  the two municipal sections from the Revisor's 2026 Kansas Statutes.
- **The Judicial Council does publish an arrest-record form set** — question 4 —
  and it publishes no municipal form set.
- **The missing granting order was already in the corpus.** The Batch 2 source
  import supplied `Order for Expungement of Conviction or Diversion`,
  Rev. KSJC 08/2022, source-gated. The review's "do not ship a scaffolded
  granting order" build blocker is resolved by the official original, not by a
  reconstruction.

**Kansas has no build blockers.**

### K.S.A. 21-6614 reconciled from the enrolled Act

Review question 7 is closed. The Revisor's published page carried history only
through L. 2023, ch. 91. **2026 Senate Bill 430, § 2** reproduces the whole
section as reconciled across 2025 HB 2393 and 2025 HB 2323, and it confirms the
review on every operative point: the four (h) findings, the (e) exclusion list
including paragraph (19)'s reach to pre-2011 comparable offences, the (f)
registration freeze, the $176 docket fee, and the (a)(3) specialty-court fee
waiver. Two things the review could not state: the non-judicial personnel
charge authority now runs **July 1, 2026 through June 30, 2030**, and the
disclosure carve-outs have grown to **twelve** contexts in (i)(2) and
**eighteen** requestor categories in (l), the additions being the insurance
producer and public adjuster provisions from HB 2323.

### Track A split — what actually differs

| | A-1 `ks-21-6614-conviction` | A-2 `ks-21-6614-diversion` |
|---|---|---|
| Trigger | satisfying the sentence, or discharge from supervision | fulfilment of the diversion terms |
| Venue in the statute | the **convicting court**, (a)(1) | the **district court**, (a)(2) |
| DUI lanes | 5-year first violation, 10-year second or subsequent, 7-year for the 2014–15 window | 5-year first violation only; (d)(2) speaks only of a sentence or supervision, so it cannot carry a diversion |

The split is not arithmetic. The two nodes share the Judicial Council packet and
encode different triggering events, venue formulations, waiting-period branches
and questions. Neither node is split further: waiting-period tiers and offence
tiers are calculation branches, not mechanisms.

### Track A is a single packet, not a staged hybrid

The review modelled Track A as three stages because a hearing date must be
obtained from the clerk between filing and the Notice of Hearing. Under the
controlling rules that is not a separate legal mechanism. The route is one
`official_pdf_fill` packet — Criminal Cover Sheet, petition, Notice of Hearing,
order cover sheet, granting order, denying order, instructions and
hearing-preparation material — and the hearing date, time, courthouse, division,
room, copy count and clerk-supplied case information are **manual-completion
items**. The Notice of Hearing's Certificate of Service and Mailing is left
blank and labelled for the clerk: it reads in the first person but its signature
line is the clerk's, and K.S.A. 21-6614(g)(1) puts notice on the court. A
required live hearing is not a generation blocker; actual opposition or contested
testimony is a `post_generation_handoff`.

### Track D — official form found, memorandum default overridden

The adopted memorandum set `custom_pleading` for K.S.A. 22-2410 "where no
current local form exists," yielding to a court's current form when one is
published. One is published: the **Kansas Judicial Council Petition for
Expungement of Arrest Record, KSJC 02/2013**, whose four choose-one grounds track
K.S.A. 22-2410(c) exactly, with an **Order of Expungement of Arrest Record Cover
Sheet, KSJC 12/2016** for the KBI. Track D is therefore `official_pdf_fill` with
`localFormOverride`. Two findings worth carrying:

- **The (a)(2) mandatory expungement category is not a participant filing.**
  Where an arrest resulted from mistaken identity or identity theft and the
  charge is dismissed or not prosecuted, the *prosecuting attorney or the
  judicial officer who ordered the dismissal* petitions and the court shall
  order expungement. It is recorded as a scope restriction so a participant can
  ask about it; LegalEase does not represent that it files it.
- **The fee exemption is much broader than identity theft.** K.S.A.
  22-2410(b)(3)(B) imposes no surcharge or fee on an (a)(1) petitioner who was an
  identity-theft victim, *or* whose charges were dismissed for want of probable
  cause, *or* who was found not guilty, *or* whose charges have been dismissed.
  That reaches most arrest-only petitioners. The review recorded only the
  identity-theft limb.

The form's 02/2013 revision predates the 2025 amendments, which is a release
gate, not a design gap.

### Track G — reclassified from guidance to a composed packet

The review held stage 1 to `process_guidance` because relief from registration is
discretionary and contested. The packet-only amendment rejects that reasoning,
and current law is decisive the other way: **K.S.A. 22-4908(d)(3) directs the
Judicial Council to develop the petition form**, and it has — *Petition for
Relief from Offender Registration*, 06/2022, with an order cover sheet for the
KBI. Nine of the form's ten numbered items are the participant's own identity,
conviction, registration, compliance and treatment-provider facts. Only item 10
is a rehabilitation and public-safety narrative, which is prompted and formatted,
never written.

The route is `composed` / `sequential` over two units because relief and
expungement are genuinely distinct filings — different statutes, venue
formulations, notice sets, standards of proof and fees, joined only by the
permission in (i) to combine them. Unit 2 **references** `ks-21-6614-conviction`
rather than duplicating it. Delivery may stay scope-restricted with attorney
handoff; packet identity is recorded separately.

### Tracks E and F — municipal local practice confirmed

Both stay `custom_pleading` with `localFormOverride`, as the memorandum directs.
A bounded sample of large municipal courts shows why: **Wichita** proceeds under
**Charter Ordinance No. 224, §§ 12 and 13** and publishes a *Motion and Order*
rather than a petition, and **Topeka** cites K.S.A. 12-4516 and publishes its own
four forms. The statewide controlled pleading is the fallback only where the
local court publishes nothing. Track E is not split for conviction and diversion:
the statute is one municipal mechanism with one destination, one six-item
petition structure and one set of three findings — and there are three findings,
not four, because an ordinance conviction carries no firearms finding. The review
also omitted the fifth ground in K.S.A. 12-4516a(c), best interests of justice,
which is included here.

### Two smaller corrections

- **The review attributed K.S.A. 12-4516a's prohibited-ordinance ground to
  K.S.A. 22-2410.** The district-court grounds are mistaken identity, no probable
  cause, not guilty, and best interests of justice; the ordinance ground belongs
  to the municipal section.
- **No general poverty-based fee waiver exists.** Review question 8 is answered:
  2026 HB 2724, which would have authorised judges to waive the expungement
  docket fee on a poverty affidavit, **died**, as did 2026 HB 2655, which would
  have created a municipal specialty-court expungement. Some district courts
  nonetheless publish a poverty affidavit alongside the expungement forms, which
  is recorded as local practice rather than a statewide waiver.

### Source currency and new artifacts

The corpus copy of the 08/2022 petition is **textually identical** to the copy a
Kansas district court clerk publishes today. `kjc.ks.gov` returns HTTP 403 to
automated retrieval, so byte-level confirmation against the publisher could not
be made and is carried as a release blocker on every official-form track, along
with the Judicial Council's non-commercial use terms.

**Four new official artifacts**, all `source_gated` on those terms and all
unmodified originals carrying the Council's own revision footers, taken from the
Douglas County District Court clerk's publication of the same set: the arrest
petition (02/2013, 3pp), the arrest order cover sheet (12/2016, 1p), the
registration-relief petition (06/2022, 4pp) and the registration order cover
sheet (06/2022, 1p). Corpus 568 → **572**; `source_gated` 45 → 49.

## Runtime effect

None. Every route remains disabled until source, completed-output legal review, technical proof, and visual approval pass.
