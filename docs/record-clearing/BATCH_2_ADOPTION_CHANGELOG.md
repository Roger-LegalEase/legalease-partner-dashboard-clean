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

## Runtime effect

None. Every route remains disabled until source, completed-output legal review, technical proof, and visual approval pass.
