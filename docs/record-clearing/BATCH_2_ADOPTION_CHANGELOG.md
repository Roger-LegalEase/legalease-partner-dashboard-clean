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

## Runtime effect

None. Every route remains disabled until source, completed-output legal review, technical proof, and visual approval pass.
