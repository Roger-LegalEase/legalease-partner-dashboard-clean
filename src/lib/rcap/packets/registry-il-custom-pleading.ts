// Illinois custom-pleading relief tracks — implementation Tranche 4.
//
// Two assigned routes, both authority-cleared under Edition 1.2, both
// `custom_pleading` with a local-form override: no statewide form covers
// either mechanism. The Illinois statewide adult expungement and sealing suite
// governs other Illinois tracks and expressly not these two, and the statewide
// cannabis suite belongs only to the cannabis conviction motion. Neither is
// mapped here.
//
// This module registers relief tracks only. The approved language lives in
// `src/lib/rcap/packets/jurisdictions/illinois/custom-pleading.ts`, together
// with the closed lists and the typed stops.
//
// Not imported by `src/lib/rcap/packets/registry.ts`. Illinois has live routes
// of its own — the legacy Illinois generator, the official-form suite, the PRB
// routes, the automatic routes and the cannabis forms — and none of them is
// touched by this module. These two tracks are `runtimeDisabled` and
// `technicalFixture` and reach no runtime surface; wiring them into the
// aggregate registry is the integration captain's step.
//
// Authority pins live in
// `data/record-clearing/implementation-tranches/tranche-4-authority-pins.json`.

import { ILLINOIS_PLEADING_TEMPLATES } from "@/lib/rcap/packets/jurisdictions/illinois/custom-pleading";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

/** No component here is visually or legally approved. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

type ComponentSpec = {
  /** The component id from the adopted legal design. Not derived — pinned. */
  componentId: string;
  role: PacketSet["components"][number]["role"];
  templateId: string;
  order: number;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!ILLINOIS_PLEADING_TEMPLATES[spec.templateId]) {
      // A component pointing at a template that does not exist would fail at
      // render time, one participant at a time. Failing at module load is the
      // cheaper place to find out.
      throw new Error(`${spec.componentId}: no Illinois template ${spec.templateId} is registered.`);
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: spec.role,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      // A custom pleading has no official source binary, and inventing one
      // would assert a source identity that does not exist.
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/** Asked on both routes. */
const COMMON_INPUTS: readonly RequiredInput[] = [
  { key: "petitionerName", label: "Full legal name", required: true },
  { key: "dateOfBirth", label: "Date of birth", required: true },
  { key: "mailingAddress", label: "Mailing address", required: true },
  {
    key: "courtName",
    label: "Court name exactly as it appears on your case papers",
    required: true
  },
  { key: "countyName", label: "County", required: true },
  { key: "caseNumber", label: "Case number", required: true },
  { key: "contactPhone", label: "Telephone number", required: false },
  { key: "contactEmail", label: "Email address", required: false }
];

function illinoisTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  packetSet: PacketSet;
  extraInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  const statuses = {
    research: "research_draft_complete",
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "not_submitted"
  } as const;

  return {
    jurisdiction: "IL",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "circuit_court",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: [...COMMON_INPUTS, ...input.extraInputs],
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    assembledPacketName: input.assembledPacketName,
    assembledPacketTitle: input.assembledPacketTitle,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

export const ILLINOIS_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  illinoisTrack({
    trackId: "il-immediate-seal",
    publicName: "Asking for immediate sealing on the day your case is dismissed or you are acquitted",
    mechanism: "immediate_sealing_at_disposition",
    authority: "20 ILCS 2630/5.2(g)",
    recordTypes: ["arrest", "charge_not_initiated_by_arrest"],
    dispositions: ["acquitted", "dismissed_with_prejudice"],
    packetSet: packetSet("il-immediate-seal", [
      {
        componentId: "il-immediate-seal-primary-filing-1",
        role: "primary_filing",
        templateId: "il-immediate-seal-petition",
        order: 1
      },
      {
        componentId: "il-immediate-seal-proposed-order-2",
        role: "proposed_order",
        templateId: "il-immediate-seal-proposed-order",
        order: 2
      },
      {
        componentId: "il-immediate-seal-instructions-3",
        role: "instructions",
        templateId: "il-immediate-seal-instructions",
        order: 3
      }
    ]),
    extraInputs: [
      { key: "offenseDescription", label: "The charge", required: true },
      { key: "arrestOrChargeDate", label: "Date of the arrest or charge", required: true },
      {
        key: "hasUpcomingDisposition",
        label: "Do you have a court date coming up where your case may be dismissed or you may be found not guilty?",
        required: true
      },
      { key: "isRepresented", label: "Do you have a lawyer or public defender on the case?", required: true },
      {
        key: "offenseDateOnOrAfter2018",
        label: "Did the arrest or charge happen on or after 1 January 2018?",
        required: true
      },
      { key: "isMinorTrafficOffense", label: "Is the charge a minor traffic offence?", required: true },
      { key: "dispositionType", label: "How is the case expected to end?", required: true },
      {
        key: "dismissalWithPrejudice",
        label: "If the case is dismissed, will it be dismissed with prejudice?",
        required: false
      }
    ],
    assembledPacketName: "Immediate-Sealing-At-Disposition",
    assembledPacketTitle: "Petition for Immediate Sealing",
    customerDeliverableDescription:
      "A petition for immediate sealing, a proposed order, and a filing instruction sheet, prepared for the participant's lawyer or public defender to file with the circuit clerk during the hearing at which the case is disposed.",
    notes:
      "Attorney-mediated end to end. 20 ILCS 2630/5.2(g)(5)(A) frames the petition as filed by the defendant's attorney on the defendant's behalf, and LegalEase can neither appear nor file during a hearing. The packet never tells the participant they may self-file it after leaving court; the instruction sheet says the opposite in terms. An unrepresented participant, a case with no upcoming disposition hearing, a pre-2018 offence, a minor traffic offence and a dismissal without prejudice each fail closed. Missing the window costs nothing permanent: ordinary sealing under § 5.2(c)(3)(A) remains available at any time, and the instruction sheet says so."
  }),

  illinoisTrack({
    trackId: "il-prostitution-j-vacate",
    publicName: "Vacating and expunging a Class 4 felony prostitution conviction",
    mechanism: "class_4_felony_prostitution_vacatur_and_expungement",
    authority: "20 ILCS 2630/5.2(j)(3)",
    recordTypes: ["conviction"],
    dispositions: ["class_4_felony_prostitution_conviction"],
    packetSet: packetSet("il-prostitution-j-vacate", [
      {
        componentId: "il-prostitution-j-vacate-primary-filing-1",
        role: "primary_filing",
        templateId: "il-prostitution-j-vacate-motion",
        order: 1
      },
      {
        componentId: "il-prostitution-j-vacate-proposed-order-2",
        role: "proposed_order",
        templateId: "il-prostitution-j-vacate-proposed-order",
        order: 2
      }
    ]),
    extraInputs: [
      { key: "convictionDate", label: "Date of conviction", required: true },
      {
        key: "class4RecordAnswer",
        label: "Does your record say the conviction was a Class 4 felony prostitution offence?",
        required: true
      },
      {
        key: "sentenceComplete",
        label: "Have you completed the sentence and any conditions imposed by the conviction?",
        required: true
      },
      {
        key: "sentenceCompletionDate",
        label: "Date the sentence and every condition were completed",
        required: true
      },
      {
        key: "traffickingInformationRequested",
        label: "Would you like information about relief designed for people whose involvement resulted from trafficking?",
        required: true
      },
      {
        key: "adverseConsequences",
        label: "In your own words, what specific problems has this conviction caused you?",
        required: true
      }
    ],
    assembledPacketName: "Prostitution-Conviction-Vacatur",
    assembledPacketTitle: "Motion to Vacate and Expunge a Conviction for Class 4 Felony Prostitution",
    customerDeliverableDescription:
      "A motion to vacate and expunge a Class 4 felony prostitution conviction and a proposed order, signed by the movant, for filing with the circuit court that entered the conviction.",
    notes:
      "The movant signs their own motion with a pro se designation where unrepresented, and attorney review is recommended by default because the motion is a conviction vacatur on discretionary factors that touches survivor circumstances. Trafficking screening runs before any other questioning on this route: a participant who asks about trafficking-related relief is routed to 20 ILCS 2630/5.2(h), which the design records as the stronger route, and this motion is not prepared. The motion cites only § 5.2(j)(3), the mechanics at (d)(9)(A) and the effect at (j)(8); § 5.2(a)(3)(C)(i) is pinned as track authority and deliberately not cited. It carries no verification, because the subsection requires none."
  })
];
