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
| `il-prb-cert` stage 1 | expected yes | held as guidance | packet withheld pending a sourced form | **narrow**: no official PRB application has been sourced; the filing vehicle is unverified | stage 2 `official_pdf_fill` on the adult suite | whether the Board publishes distinct § 5.2(e-5) sealing and § 5.2(e-6) expungement applications |

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

It is nonetheless **held as guidance on a narrower, factual ground**: no official
Prisoner Review Board application form has been sourced. The Illinois private
corpus holds only the adult, cannabis and juvenile suites. Mapping a form that has
not been verified would fabricate a source mapping, so the stage fails closed and
the exact gap is recorded as a release blocker. A § 5.2(e-5) Certificate of
Sealing application and a § 5.2(e-6) Certificate of Eligibility for Expungement
are legally distinct and neither may stand in for the other.

Node count is unchanged at 17. No route becomes packet-ready or runtime-enabled.

## Runtime effect

None. Every route remains disabled until source, completed-output legal review, technical proof, and visual approval pass.
