// Maryland relief tracks — implementation Tranche 2.
//
// One participant petition route, `official_pdf_fill` on two current Maryland
// Judiciary forms: CC-DC-CR-148, the Second Chance Act shielding petition, and
// MDJ-008, the restricted-information notice the petition's own printed text
// requires be filed with it.
//
// It is one route rather than four because Master Library Edition 1.2 retains
// every member of the CC-DC-CR-072 petition family as a `source_gated` asset,
// and a source-gated asset is never resolver-selectable. Five of Maryland's six
// official-form routes depend on one. The reasoning, and what would unblock
// them, is recorded in `data/record-clearing/implementation-tranches/tranche-2.json`.
//
// The track is `technicalFixture: true` and `runtimeDisabled: true` on purpose.
// That is not a placeholder — it is the state the track is actually in.
// Reviewing counsel has not adopted the output, Edition 1.2 sets
// `generation_allowed = no` on both forms, and the shielding filing fee is an
// open release blocker. The flag is also what lets the packet be generated
// through the real fulfilment path for review, under an explicit
// `allowTechnicalFixtures` opt-in, instead of being assembled outside the
// renderer to look complete.
//
// Authority pins:
//   data/record-clearing/implementation-tranches/tranche-2-authority-pins.json
// Field ownership:
//   data/record-clearing/implementation-tranches/tranche-2-field-ownership.json

import {
  MARYLAND_SHIELDABLE_OFFENCES,
  offenceCaseContinuationKey,
  offenceCaseKey,
  offenceCheckboxKey
} from "@/lib/rcap/packets/tranche-2-maryland-facts";
import type { AcroFieldMapping } from "@/lib/rcap/packets/registry-types";
import type { PacketSet, ReliefTrack } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

/** No component here is visually or legally approved. This is what keeps them out of packet_ready. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

export const MD_SHIELDING_TRACK_ID = "md_second_chance_shielding";
export const MD_SHIELDING_PETITION_COMPONENT_ID = "md_second_chance_shielding-primary-filing-1";
export const MD_SHIELDING_NOTICE_COMPONENT_ID = "md_second_chance_shielding-attachment-2";
export const MD_SHIELDING_GUIDE_COMPONENT_ID = "md_second_chance_shielding-instructions-3";

// ---------------------------------------------------------------------------
// Official sources
// ---------------------------------------------------------------------------

/**
 * Both sources are pinned by the SHA-256 Edition 1.2 records for the retained
 * asset, and the renderer verifies the bytes before it draws anything. A form
 * revised at the publisher fails here rather than producing a petition built on
 * a document nobody checked.
 */
const CC_DC_CR_148_SOURCE =
  "private/Nationwide Record Clearing/LegalEase Maryland/forms/CC-DC-CR-148__petition-for-shielding-under-maryland-second-chance-act__rev-2026-07.pdf";
const CC_DC_CR_148_SHA = "abcafbc298d56937ad41ba44675147942b1ab540325898917efafed3f5b43e3f";

const MDJ_008_SOURCE =
  "private/Nationwide Record Clearing/LegalEase Maryland/forms/MDJ-008__notice-regarding-restricted-information-pursuant-to-rule-20-201.1__rev-2026-07.pdf";
const MDJ_008_SHA = "42510792803b979974b3967dfd0f871271e7518cf64e226d5a80e22b67a6e369";

// ---------------------------------------------------------------------------
// Packet set
// ---------------------------------------------------------------------------

const MD_SHIELDING_PACKET_SET: PacketSet = {
  packetSetId: "md_second_chance_shielding-set",
  version: VERSION,
  components: [
    {
      componentId: MD_SHIELDING_PETITION_COMPONENT_ID,
      role: "primary_filing",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourcePath: CC_DC_CR_148_SOURCE,
      sourceSha256: CC_DC_CR_148_SHA,
      geographicScope: "statewide",
      requirement: "required",
      order: 1,
      approval: PENDING_APPROVAL,
      version: VERSION
      // Not flattened. The clerk and MDEC accept the Judiciary's own fillable
      // form, and leaving the fields live is what lets the participant correct a
      // value before signing rather than starting again.
    },
    {
      componentId: MD_SHIELDING_NOTICE_COMPONENT_ID,
      role: "attachment",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourcePath: MDJ_008_SOURCE,
      sourceSha256: MDJ_008_SHA,
      geographicScope: "statewide",
      // Required, not conditional: CC-DC-CR-148 prints "You must file a Notice
      // Regarding Restricted Information Pursuant to Rule 20-201.1 (form
      // MDJ-008) with this submission" on its own face.
      requirement: "required",
      order: 2,
      approval: PENDING_APPROVAL,
      version: VERSION
    },
    {
      componentId: MD_SHIELDING_GUIDE_COMPONENT_ID,
      role: "instructions",
      outputStrategy: "process_guidance",
      rendererStrategy: "process_guidance",
      templateId: "md-second-chance-shielding-participant-guide",
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: 3,
      approval: PENDING_APPROVAL,
      version: VERSION
    }
  ]
};

// ---------------------------------------------------------------------------
// CC-DC-CR-148 field map
// ---------------------------------------------------------------------------

const PETITION = MD_SHIELDING_PETITION_COMPONENT_ID;

/**
 * Every mapping below names a field verified present in the source document.
 *
 * What is absent is as deliberate as what is here. The nine attorney fields, the
 * petitioner's signature rule and both signature dates carry no mapping, so the
 * renderer cannot write to them: LegalEase does not enter an appearance for a
 * self-represented participant, does not generate a signature, and does not date
 * a document the participant has not yet signed. See
 * `tranche-2-field-ownership.json` for the classification of every field on the
 * form, mapped or not.
 */
export const MARYLAND_CC_DC_CR_148_MAPPINGS: readonly AcroFieldMapping[] = [
  // Caption — the court the participant elects.
  { componentId: PETITION, fieldKey: "md148CircuitCourt", pdfFieldName: "Circuit Court", kind: "checkbox" },
  { componentId: PETITION, fieldKey: "md148DistrictCourt", pdfFieldName: "District Court", kind: "checkbox" },
  { componentId: PETITION, fieldKey: "md148CityCounty", pdfFieldName: "City/County", kind: "dropdown" },
  {
    componentId: PETITION,
    fieldKey: "md148CourtAddress",
    pdfFieldName: "Court Address",
    kind: "text",
    maxWidthPoints: 234,
    overflow: "fail"
  },
  {
    componentId: PETITION,
    fieldKey: "md148CourtTelephone",
    pdfFieldName: "Court Telephone Number",
    kind: "text",
    maxWidthPoints: 100,
    overflow: "fail"
  },
  {
    componentId: PETITION,
    fieldKey: "md148CaptionCaseNumber",
    pdfFieldName: "Case Number",
    kind: "text",
    maxWidthPoints: 107,
    overflow: "fail"
  },
  {
    componentId: PETITION,
    fieldKey: "md148CaptionPetitionerName",
    pdfFieldName: "Petitioner's Name",
    kind: "text",
    maxWidthPoints: 218,
    overflow: "fail"
  },

  // Body — "I, <name>, <date of birth>, petition under Md. Rule 16-941 …".
  {
    componentId: PETITION,
    fieldKey: "md148PetitionerName",
    pdfFieldName: "Name",
    kind: "text",
    maxWidthPoints: 220,
    overflow: "fail"
  },
  {
    componentId: PETITION,
    fieldKey: "md148DateOfBirth",
    pdfFieldName: "Date of Birth",
    kind: "text",
    maxWidthPoints: 125,
    overflow: "fail"
  },

  // Twelve offence branches, generated from the offence table so a checkbox and
  // its case-number blank can never drift apart.
  ...MARYLAND_SHIELDABLE_OFFENCES.flatMap((offence) => {
    const mappings: AcroFieldMapping[] = [
      {
        componentId: PETITION,
        fieldKey: offenceCheckboxKey(offence.key),
        pdfFieldName: offence.checkboxField,
        kind: "checkbox"
      },
      {
        componentId: PETITION,
        fieldKey: offenceCaseKey(offence.key),
        pdfFieldName: offence.caseField,
        kind: "text",
        // Blank unless this offence is one the participant selected.
        expectedBlank: true,
        // The packer has already split the list against these same widths; this
        // is the backstop that stops a mis-split reaching a filed petition.
        maxWidthPoints: offence.caseFieldWidth,
        overflow: "fail"
      }
    ];
    if (offence.continuationField) {
      mappings.push({
        componentId: PETITION,
        fieldKey: offenceCaseContinuationKey(offence.key),
        pdfFieldName: offence.continuationField,
        kind: "text",
        // The form's own second line, used only when the first one is full.
        expectedBlank: true,
        maxWidthPoints: offence.continuationFieldWidth,
        overflow: "fail"
      });
    }
    return mappings;
  }),

  // Petitioner block. The signature rule and its date are absent by design.
  {
    componentId: PETITION,
    fieldKey: "md148PetitionerPrintedName",
    pdfFieldName: "Petitioner Printed Name",
    kind: "text",
    maxWidthPoints: 221,
    overflow: "fail"
  },
  {
    componentId: PETITION,
    fieldKey: "md148PetitionerStreetAddress",
    pdfFieldName: "Petitioner Street Address",
    kind: "text",
    maxWidthPoints: 221,
    overflow: "fail"
  },
  {
    componentId: PETITION,
    fieldKey: "md148PetitionerCityStateZip",
    pdfFieldName: "Petitioner City, State, Zip",
    kind: "text",
    maxWidthPoints: 153,
    overflow: "fail"
  },
  // The three contact lines are optional and narrow. A truncated telephone
  // number or a half-printed email address is worse than a blank: the court
  // would use it.
  {
    componentId: PETITION,
    fieldKey: "md148PetitionerTelephone",
    pdfFieldName: "Petitioner Telephone Number",
    kind: "text",
    expectedBlank: true,
    maxWidthPoints: 68,
    overflow: "omit"
  },
  {
    componentId: PETITION,
    fieldKey: "md148PetitionerCellPhone",
    pdfFieldName: "Petitioner Cell Phone Number",
    kind: "text",
    expectedBlank: true,
    maxWidthPoints: 68,
    overflow: "omit"
  },
  {
    componentId: PETITION,
    fieldKey: "md148PetitionerEmail",
    pdfFieldName: "Petitioner E-mail",
    kind: "text",
    expectedBlank: true,
    maxWidthPoints: 153,
    overflow: "omit"
  }
];

// ---------------------------------------------------------------------------
// MDJ-008 field map
// ---------------------------------------------------------------------------

const NOTICE = MD_SHIELDING_NOTICE_COMPONENT_ID;

/**
 * MDJ-008 is a general-purpose notice covering twenty restricted-information
 * categories across every Maryland case type. Exactly two of its boxes are
 * checked here, and both are decided by what the packet is rather than by a
 * participant answer:
 *
 *   RESTRICTED DOCUMENT — the entire document is not subject to inspection.
 *   Sealing or Shielding Motion — Rule 16-941 & 16-914(k)(2), while pending.
 *
 * The adjacent "Sealed or Shielded" category is Rule 16-914(k)(1) and describes
 * a document already restricted by court order. There is no order yet; the
 * petition is the motion. The eighteen other categories are family, juvenile,
 * financial and administrative and have no application to a criminal shielding
 * petition, so they carry no mapping and cannot be written to.
 *
 * The Plaintiff/Petitioner rule is deliberately unmapped: the form preprints
 * STATE OF MARYLAND above it for exactly this case, and writing the State's name
 * into the blank would print it twice.
 */
export const MARYLAND_MDJ_008_MAPPINGS: readonly AcroFieldMapping[] = [
  { componentId: NOTICE, fieldKey: "mdj008CircuitCourt", pdfFieldName: "Circuit Court", kind: "checkbox" },
  { componentId: NOTICE, fieldKey: "mdj008DistrictCourt", pdfFieldName: "District Court", kind: "checkbox" },
  { componentId: NOTICE, fieldKey: "mdj008CityCounty", pdfFieldName: "City/County", kind: "dropdown" },
  {
    componentId: NOTICE,
    fieldKey: "mdj008CourtAddress",
    pdfFieldName: "Court Address",
    kind: "text",
    maxWidthPoints: 452,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008CourtTelephone",
    pdfFieldName: "Court Telephone Number",
    kind: "text",
    maxWidthPoints: 137,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008CaseNumber",
    pdfFieldName: "Case Number",
    kind: "text",
    maxWidthPoints: 137,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008DefendantName",
    pdfFieldName: "Defendant/Respondent's Name",
    kind: "text",
    maxWidthPoints: 238,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008Title",
    pdfFieldName: "Title of Confidential Submission",
    kind: "text",
    maxWidthPoints: 407,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008RestrictedDocument",
    pdfFieldName: "Restricted Document - The entire document is not subject to inspection",
    kind: "checkbox"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008SealingOrShieldingMotion",
    pdfFieldName: "Sealing or Shielding Motion",
    kind: "checkbox"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008PrintedName",
    pdfFieldName: "Printed Name",
    kind: "text",
    maxWidthPoints: 246,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008StreetAddress",
    pdfFieldName: "Street Address",
    kind: "text",
    maxWidthPoints: 246,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008CityStateZip",
    pdfFieldName: "City, State, Zip",
    kind: "text",
    maxWidthPoints: 246,
    overflow: "fail"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008Telephone",
    pdfFieldName: "Telephone Number",
    kind: "text",
    expectedBlank: true,
    maxWidthPoints: 252,
    overflow: "omit"
  },
  {
    componentId: NOTICE,
    fieldKey: "mdj008Email",
    pdfFieldName: "E-mail",
    kind: "text",
    expectedBlank: true,
    maxWidthPoints: 252,
    overflow: "omit"
  }
];

export const MARYLAND_ACROFORM_MAPPINGS: readonly AcroFieldMapping[] = [
  ...MARYLAND_CC_DC_CR_148_MAPPINGS,
  ...MARYLAND_MDJ_008_MAPPINGS
];

// ---------------------------------------------------------------------------
// The track
// ---------------------------------------------------------------------------

/**
 * Required inputs are the derived fact keys, because derivation runs first and
 * is what turns a participant answer into a value the form can hold. Absence of
 * any of them is a `missing_required_input` resolution failure, decided in the
 * one place every track's required inputs are decided.
 *
 * `sentenceSatisfiedDate` appears nowhere on either official form. It is
 * required anyway: CC-DC-CR-148 paragraph 3 is a sworn statement that three
 * years have run from it, and a packet that cannot say what date that statement
 * rests on should not be generated.
 */
const MD_SHIELDING_REQUIRED_INPUTS: readonly ReliefTrack["requiredInputs"][number][] = [
  { key: "md148PetitionerName", label: "Full legal name", required: true },
  { key: "md148DateOfBirth", label: "Date of birth", required: true },
  { key: "md148PetitionerStreetAddress", label: "Street address", required: true },
  { key: "md148PetitionerCityStateZip", label: "City, state and ZIP", required: true },
  { key: "md148CityCounty", label: "Court location, as the form lists it", required: true },
  { key: "md148CourtAddress", label: "Court address", required: true },
  { key: "md148CourtTelephone", label: "Court telephone number", required: true },
  { key: "md148CaptionCaseNumber", label: "First case listed", required: true },
  { key: "sentenceSatisfiedDate", label: "Date the sentence was satisfied", required: true },
  { key: "md148PetitionerTelephone", label: "Telephone number", required: false },
  { key: "md148PetitionerCellPhone", label: "Cell phone number", required: false },
  { key: "md148PetitionerEmail", label: "Email address", required: false }
];

function marylandTrack(): ReliefTrack {
  const statuses = {
    research: "research_draft_complete" as const,
    technical: "renderer_ready" as const,
    visual: "not_reviewed" as const,
    legal: "not_submitted" as const
  };
  return {
    jurisdiction: "MD",
    trackId: MD_SHIELDING_TRACK_ID,
    publicName: "Shielding a conviction from public view",
    mechanism:
      "Twelve enumerated convictions may be shielded from public view three years after the sentence for every conviction for which shielding is requested is satisfied, including parole, probation and mandatory supervision. One shielding petition is granted per lifetime, in one court in one county, and it must include every eligible conviction from that court.",
    authority: "Md. Code, Crim. Proc. §§ 10-301 through 10-306; Md. Rules 16-934, 16-941 and 20-201.1",
    recordTypes: ["conviction_record"],
    dispositions: MARYLAND_SHIELDABLE_OFFENCES.map((offence) => offence.key),
    courtLevel: "district_or_circuit",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "official_pdf_fill",
    packetSet: MD_SHIELDING_PACKET_SET,
    requiredInputs: MD_SHIELDING_REQUIRED_INPUTS,
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    customerDeliverableDescription:
      "One PDF containing the completed Maryland Second Chance Act shielding petition (CC-DC-CR-148), the completed restricted-information notice it requires (MDJ-008), and instructions for signing, filing and what happens next. Shielding is not expungement: it removes the conviction from public view, and it generally does not let you say the conviction never happened.",
    assembledPacketName: "Second-Chance-Shielding",
    assembledPacketTitle: "Maryland Second Chance Act shielding packet",
    notes:
      "Implementation Tranche 2. Runtime-disabled pending counsel adoption; Edition 1.2 additionally sets generation_allowed = no on both official sources.",
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "official_pdf_fill",
        // The shielding filing fee is an open release blocker: the Judiciary
        // page and CC-DC-CR-148A state $0, unverified at build time. It alone
        // withdraws readiness, which is why no packet prints an amount.
        openReleaseBlockers: 1
      })
    }
  };
}

export const MARYLAND_TRANCHE_2_TRACKS: readonly ReliefTrack[] = [marylandTrack()];
