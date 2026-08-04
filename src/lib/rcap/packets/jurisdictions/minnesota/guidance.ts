// Minnesota process guidance — automatic relief, mistaken identity, and the
// inherent-authority petition.
//
// Seven assigned routes, all `process_guidance`, and six of the seven describe
// relief that happens with no participant filing at all: the Bureau of Criminal
// Apprehension identifies records and the court seals them, the BCA expunges
// non-felony cannabis records, the Cannabis Expungement Board reviews felony
// cannabis records on its own initiative, expungement follows a pardon
// extraordinary, and a mistaken-identity determination clears both the court
// record and the identification data. Nobody applies for any of it.
//
// The commercial instruction the adopted design repeats on every one of these
// tracks is the reason this family exists, and it is the opposite of an upsell:
//
//   Run the automatic routes before offering any paid petition. A participant
//   whose record is already covered by Clean Slate, automatic cannabis
//   expungement or a Cannabis Expungement Board action should not pay for a
//   petition.
//
// So every artifact here tells a participant how to check whether the work is
// already done for free before anyone sells them anything.
//
// Two limits are stated on every automatic artifact, because leaving them out
// is how a participant ends up surprised:
//
//   - automatic relief does not reach specially protected agencies, and does
//     not reach out-of-state records;
//   - automatic relief is not final the way a court order is. The design
//     records that Laws 2026, chapter 70, section 5 adds § 609A.015, subd.
//     5(f), under which the BCA unseals a record and notifies the judicial
//     branch if it later determines the record did not qualify. The design also
//     records that the operative date of that section must be confirmed before
//     participant-facing instructions state it, so no artifact here states an
//     operative date. The warning is given; the date is not asserted.
//
// Where an eligible record was not processed, the design is explicit that no
// participant-facing correction submission has been identified and that one
// must not be invented. These artifacts route to the petition tracks instead,
// and say so.
//
// The seventh route, `mn_inherent_authority`, is different in kind and the
// guidance says so plainly: it is a petition, it carries a filing fee and a
// county law library fee that no statute waives on this route, and under
// Ambaye and Schultz the relief reaches judicial branch records only — police,
// sheriff, prosecutor and BCA records stay public. The design records that
// LegalEase does not currently deliver that packet, so the artifact explains
// the route and does not pretend to be it.
//
// What these templates never do: turn guidance into a court filing, give legal
// advice, promise that automatic relief has happened or will happen by a date,
// invent a correction route, state an unconfirmed operative date, or claim that
// the inherent-authority route reaches anything beyond court records.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Minnesota
// is not an enabled jurisdiction and this job does not enable one. The
// § 299C.11 written-demand route is a separate Minnesota job and is untouched.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — THIS IS NOT A COURT FILING";

const PENDING_APPROVAL = { visual: "not_reviewed", legal: "not_submitted" } as const;

/** How a Minnesota participant checks their own record. Named once. */
const MN_RECORD_CHECK =
  "your own Minnesota criminal history from the Bureau of Criminal Apprehension, and your case history on Minnesota Court Records Online";

/** The commercial instruction the design repeats on every automatic track. */
const CHECK_BEFORE_YOU_PAY =
  "Check the free automatic routes before you pay anyone for a petition. If Clean Slate, automatic cannabis expungement or a Cannabis Expungement Board action already covers your record, a paid petition buys you nothing.";

/** What automatic relief does not reach, on every automatic artifact. */
const AUTOMATIC_LIMITS =
  "Automatic relief does not reach everything. It does not reach records held by specially protected agencies, and it does not reach out-of-state records. Those stay where they are.";

/**
 * The unsealing warning, deliberately stated without an operative date.
 *
 * The design records the amendment and, in the same breath, records that its
 * operative date must be confirmed before participant-facing instructions state
 * it. So the risk is disclosed and the date is not.
 */
const NOT_FINAL_LIKE_AN_ORDER =
  "Automatic relief is not final in the way a court order is. Minnesota has enacted a change under which the Bureau of Criminal Apprehension can unseal a record and notify the courts if it later decides the record did not qualify, deciding only from what is in its own criminal history system. When that change takes effect has not been confirmed, so treat it as a live risk rather than a date.";

const NO_CORRECTION_ROUTE =
  "If an eligible record was not processed, there is no correction form to send. No participant-facing way to make the automatic route happen has been identified, and LegalEase will not invent one. Where you qualify, a petition route is the alternative.";

/**
 * Kept to four bullets deliberately.
 *
 * Every citation the design records is here; the statutes are grouped rather
 * than listed one per line, because the sources list is the last block the
 * renderer writes and a sixth bullet pushed two of these artifacts onto a
 * blank trailing page. Grouping loses no citation.
 */
const MN_SOURCES: readonly string[] = [
  "Minn. Stat. ch. 609A (expungement), ch. 638 (pardons) and § 299C.11 (identification data).",
  "Laws 2023, ch. 52 and ch. 63; Laws 2026, ch. 70, § 5.",
  "State v. Ambaye, 616 N.W.2d 256 (Minn. 2000); State v. C.A., 304 N.W.2d 353 (Minn. 1981); In re R.L.F., 256 N.W.2d 803 (Minn. 1977).",
  "Minnesota Bureau of Criminal Apprehension criminal history request; Minnesota Court Records Online."
];

const MN_CANNOT_PERFORM: readonly string[] = [
  "LegalEase cannot expunge or seal anything, and cannot make the Bureau of Criminal Apprehension, the Cannabis Expungement Board or a court act.",
  "LegalEase cannot tell you whether you qualify. This page explains what the law does; it is not legal advice.",
  "LegalEase does not obtain, inspect or authenticate your criminal history. You request your own copy.",
  "LegalEase cannot tell you when your record will be reached. No date on this page is a promise about your case."
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/** Raised where an answer takes the participant outside self-help. */
export class MinnesotaGuidanceStopError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MinnesotaGuidanceStopError";
  }
}

/** Raised where an honest answer belongs to a different Minnesota route. */
export class MinnesotaRouteMismatchError extends Error {
  constructor(
    readonly trackId: string,
    readonly stopId: string,
    readonly reason: string,
    readonly routeTo: string
  ) {
    super(reason);
    this.name = "MinnesotaRouteMismatchError";
  }
}

/** Raised when a participant answer is outside the approved closed list. */
export class MinnesotaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "MinnesotaBranchError";
  }
}

export const MN_YES_NO: Readonly<Record<string, boolean>> = { yes: true, no: false };

/** Cannabis relief splits by offence level, and the split decides the route. */
export const MN_CANNABIS_LEVELS: Readonly<Record<string, string>> = {
  felony: "mn_ceb_felony_cannabis",
  non_felony: "mn_auto_cannabis_nonfelony"
};

/** Whether the record is the participant's own, or someone else's under their name. */
export const MN_IDENTITY_ANSWERS: Readonly<Record<string, string>> = {
  someone_else_used_my_identity: "someone_else_used_my_identity",
  name_mix_up: "name_mix_up",
  the_record_is_mine: "the_record_is_mine"
};

function branch<T>(
  trackId: string,
  key: string,
  table: Readonly<Record<string, T>>,
  raw: unknown
): { value: string; resolved: T } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(table, value)) {
    throw new MinnesotaBranchError(trackId, key, value);
  }
  return { value, resolved: table[value] };
}

const ADVICE_STOP =
  "Whether a particular record qualifies is an individualized legal judgment. This guidance explains the mechanism; it does not decide eligibility.";

/**
 * Validates participant answers and routes to the correct Minnesota mechanism.
 *
 * Fails closed on an answer outside a closed list. Raises a typed stop where
 * the participant needs advice or a route LegalEase cannot generate, and a
 * typed route mismatch — carrying its destination — where an honest answer puts
 * them on a different Minnesota route.
 */
export function deriveMinnesotaGuidanceFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = { ...facts };

  // Asked on every route: someone who wants an eligibility opinion is not
  // helped by a guidance sheet.
  const wantsAdvice = branch(trackId, "wantsEligibilityAdvice", MN_YES_NO, facts.wantsEligibilityAdvice);
  if (wantsAdvice.resolved) {
    throw new MinnesotaGuidanceStopError(
      trackId,
      "individualized_eligibility_advice_requested",
      ADVICE_STOP,
      "a lawyer, or a Minnesota expungement clinic"
    );
  }

  if (trackId === "mn_auto_cannabis_nonfelony" || trackId === "mn_ceb_felony_cannabis") {
    const level = branch(trackId, "cannabisOffenceLevel", MN_CANNABIS_LEVELS, facts.cannabisOffenceLevel);
    if (level.resolved !== trackId) {
      throw new MinnesotaRouteMismatchError(
        trackId,
        "cannabis_offence_level_belongs_to_another_route",
        "Minnesota splits cannabis relief by offence level: non-felony records are expunged automatically by the Bureau of Criminal Apprehension, and felony records are reviewed by the Cannabis Expungement Board.",
        level.resolved
      );
    }
  }

  if (trackId === "mn_mistaken_identity_court" || trackId === "mn_mistaken_identity_iddata") {
    const identity = branch(trackId, "whoseRecordIsIt", MN_IDENTITY_ANSWERS, facts.whoseRecordIsIt);
    if (identity.value === "the_record_is_mine") {
      throw new MinnesotaRouteMismatchError(
        trackId,
        "record_is_the_participants_own",
        "The mistaken-identity mechanism reaches a record created under someone else's conduct. A record that is genuinely the participant's own is not cleared by it.",
        trackId === "mn_mistaken_identity_iddata"
          ? "the Minn. Stat. § 299C.11 written-demand route, where its conditions are met"
          : "the automatic routes, or a petition route"
      );
    }
  }

  if (trackId === "mn_inherent_authority") {
    // The official instructions say the ordinary statutory petition should be
    // exhausted first, and that inherent-authority relief is rare.
    const qualifies = branch(trackId, "qualifiesUnder609A", MN_YES_NO, facts.qualifiesUnder609A);
    if (qualifies.resolved) {
      throw new MinnesotaRouteMismatchError(
        trackId,
        "qualifies_under_the_ordinary_statutory_petition",
        "Where the ordinary chapter 609A petition is available it should be used first. Inherent-authority relief is described by the official instructions as possible but rare, and it reaches court records only.",
        "the ordinary chapter 609A expungement petition"
      );
    }
    // Relief reaches judicial branch records only. A participant who has not
    // understood that is being sold the wrong thing.
    const understands = branch(
      trackId,
      "understandsCourtRecordsOnly",
      MN_YES_NO,
      facts.understandsCourtRecordsOnly
    );
    if (!understands.resolved) {
      throw new MinnesotaGuidanceStopError(
        trackId,
        "court_records_only_not_understood",
        "This route reaches judicial branch records only. Police, sheriff, prosecutor and Bureau of Criminal Apprehension records stay public, and a participant who has not taken that on board should not be steered into it.",
        "a lawyer, or a Minnesota expungement clinic"
      );
    }
    branch(trackId, "registrationRequired", MN_YES_NO, facts.registrationRequired);
  }

  branch(trackId, "recordStillAppears", MN_YES_NO, facts.recordStillAppears);
  return derived;
}

// ---------------------------------------------------------------------------
// Guidance templates
// ---------------------------------------------------------------------------

function automaticGuidance(input: {
  templateId: string;
  mechanismName: string;
  processType: GuidanceTemplate["processType"];
  whyNotAFiling: string;
  destination: { name: string; detail: string };
  prerequisites: readonly string[];
  gather: readonly string[];
  sequence: readonly string[];
  extraEscalations?: readonly string[];
  extraCanPrepare?: readonly string[];
}): GuidanceTemplate {
  return {
    templateId: input.templateId,
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: input.mechanismName,
    whyNotAFiling: input.whyNotAFiling,
    processType: input.processType,
    prerequisites: input.prerequisites,
    documentsToObtain: [`A copy of ${MN_RECORD_CHECK}.`],
    participantDataToGather: input.gather,
    officialDestination: input.destination,
    actionSequence: [CHECK_BEFORE_YOU_PAY, ...input.sequence, AUTOMATIC_LIMITS, NO_CORRECTION_ROUTE],
    submissionMethod: "There is nothing to submit. No application, petition, motion or demand exists for this route.",
    fees: "None. There is no fee, because there is nothing to file.",
    feeWaiver: "Not applicable. There is no fee to waive.",
    noticeOrService: [
      "There is nobody for you to notify and nothing to serve.",
      "You are not told when a record clears automatically. Looking yourself up is how you find out."
    ],
    expectedNextStage:
      "The record no longer appears when you look yourself up. Until then, treat the automatic route as pending rather than done.",
    legalEaseCanPrepare: [
      "This explanation of what the automatic route does and what it does not reach.",
      "A plain list of what to check, and where to get it.",
      ...(input.extraCanPrepare ?? [])
    ],
    legalEaseCannotPerform: MN_CANNOT_PERFORM,
    escalationTriggers: [
      "The automatic relief did not happen and you need a route LegalEase cannot generate.",
      "You want advice about whether a particular record qualifies.",
      ...(input.extraEscalations ?? [])
    ],
    officialSourceReferences: MN_SOURCES
  };
}

export const MINNESOTA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "mn-auto-clean-slate-guidance": automaticGuidance({
    templateId: "mn-auto-clean-slate-guidance",
    mechanismName: "Records that clear automatically under Clean Slate",
    processType: "automatic",
    whyNotAFiling:
      "The Bureau of Criminal Apprehension identifies eligible records and the court seals them. There is no application, petition, motion or demand, and no filing destination, so nothing is filed and no petition is generated.",
    destination: {
      name: "The Bureau of Criminal Apprehension, and the courts",
      detail: "The Bureau identifies eligible records and the court seals them. Nothing is submitted by you."
    },
    prerequisites: [
      "The record is a Minnesota record.",
      "The case falls within the statutory automatic-eligibility criteria, which the Bureau applies without any action by you."
    ],
    gather: [
      "How the case ended, and the date it ended.",
      "The offence level: petty misdemeanour, misdemeanour, gross misdemeanour or felony.",
      "Whether the case still appears on Minnesota Court Records Online.",
      "Whether you are considering paying for a petition."
    ],
    sequence: [
      `Get a copy of ${MN_RECORD_CHECK}.`,
      "Look the case up. A record sealed under Clean Slate is no longer shown to the public.",
      "If it is gone, you are done. There is nothing to file and nothing to pay.",
      NOT_FINAL_LIKE_AN_ORDER
    ],
    extraEscalations: [
      "You are about to pay for a petition on a record that may already be covered by Clean Slate."
    ],
    extraCanPrepare: ["The warning that a sealed record can later be unsealed by the Bureau."]
  }),

  "mn-auto-cannabis-nonfelony-guidance": automaticGuidance({
    templateId: "mn-auto-cannabis-nonfelony-guidance",
    mechanismName: "Non-felony cannabis records that clear automatically",
    processType: "automatic",
    whyNotAFiling:
      "The Bureau of Criminal Apprehension identifies qualifying non-felony cannabis records and expunges them. There is no participant application, petition or demand, so nothing is filed.",
    destination: {
      name: "The Bureau of Criminal Apprehension",
      detail:
        "The Bureau identifies and expunges qualifying non-felony cannabis records. Nothing is submitted by you."
    },
    prerequisites: [
      "The record is a Minnesota record.",
      "The cannabis offence is a non-felony. A felony cannabis record goes to the Cannabis Expungement Board instead."
    ],
    gather: [
      "Whether the cannabis offence was a felony or a lower-level offence.",
      "When the case was decided.",
      "Whether the case still appears on Minnesota Court Records Online."
    ],
    sequence: [
      `Get a copy of ${MN_RECORD_CHECK}.`,
      "Look the case up. A record expunged on this route is no longer shown to the public.",
      "If it is gone, you are done.",
      "A non-cannabis offence charged in the same case is not covered by this route, and neither is a felony cannabis offence."
    ],
    extraEscalations: [
      "The case also carries a non-cannabis offence, which this route does not reach."
    ]
  }),

  "mn-ceb-felony-cannabis-guidance": automaticGuidance({
    templateId: "mn-ceb-felony-cannabis-guidance",
    mechanismName: "Cannabis Expungement Board review of a felony cannabis record",
    processType: "agency",
    whyNotAFiling:
      "The Cannabis Expungement Board reviews felony cannabis records on its own initiative and orders expungement or resentencing. There is no application or petition to the Board, so nothing is filed.",
    destination: {
      name: "The Cannabis Expungement Board",
      detail: "The Board reviews and orders on its own initiative. Nothing is submitted by you."
    },
    prerequisites: [
      "The record is a Minnesota record.",
      "The cannabis offence is a felony. A non-felony cannabis record is expunged automatically without Board review."
    ],
    gather: [
      "Whether the cannabis offence was a felony.",
      "When you were convicted.",
      "Whether the case still appears on Minnesota Court Records Online."
    ],
    sequence: [
      `Get a copy of ${MN_RECORD_CHECK}.`,
      "Look the case up. There is nothing to apply for: the Board reaches records on its own initiative.",
      "The Board may order expungement, or it may order resentencing instead. Both are the Board's decision."
    ]
  }),

  "mn-pardon-auto-expungement-guidance": automaticGuidance({
    templateId: "mn-pardon-auto-expungement-guidance",
    mechanismName: "Records that clear automatically after a pardon extraordinary",
    processType: "automatic",
    whyNotAFiling:
      "Where a pardon extraordinary is granted, expungement follows automatically. You do not file an expungement petition. Applying for the pardon itself is a separate clemency process before the pardon body, and this page is not that application.",
    destination: {
      name: "Following the pardon body's grant",
      detail: "Expungement follows the pardon automatically. There is no expungement filing by you."
    },
    prerequisites: [
      "The record is a Minnesota record.",
      "A pardon extraordinary has been granted. If one has not, this route has not started, and the clemency application is a different process."
    ],
    gather: [
      "Whether a pardon extraordinary has been granted, and on what date.",
      "Whether the conviction still appears on Minnesota Court Records Online."
    ],
    sequence: [
      `Get a copy of ${MN_RECORD_CHECK}.`,
      "Look the conviction up. Expungement follows the pardon; you do not petition for it separately.",
      "If you have not been granted a pardon extraordinary, this route has not begun. The clemency application is a separate process before the pardon body and is not prepared here."
    ]
  }),

  "mn-mistaken-identity-court-guidance": automaticGuidance({
    templateId: "mn-mistaken-identity-court-guidance",
    mechanismName: "Clearing a court record created when someone used your identity",
    processType: "court_adjacent",
    whyNotAFiling:
      "Where a record was created through mistaken identity, the court expunges it on that determination. There is no participant petition, so nothing is filed.",
    destination: {
      name: "The court holding the record",
      detail: "The court expunges on the mistaken-identity determination. There is no petition from you."
    },
    prerequisites: [
      "The record is a Minnesota court record.",
      "The record was created because someone else used your identity, or through a mix-up with a similar name. A record that is genuinely yours is not cleared by this mechanism."
    ],
    gather: [
      "Whether someone else used your identity, or it was a name mix-up.",
      "Which court and case number the record appears under.",
      "Whether the case still appears on Minnesota Court Records Online."
    ],
    sequence: [
      `Get a copy of ${MN_RECORD_CHECK}.`,
      "Identify the court and case number the record sits under.",
      "The court expunges on the mistaken-identity determination. There is nothing for you to petition for.",
      "Fingerprints and photographs taken under your name are a separate matter, dealt with by the identification-data route."
    ]
  }),

  "mn-mistaken-identity-iddata-guidance": automaticGuidance({
    templateId: "mn-mistaken-identity-iddata-guidance",
    mechanismName: "Destroying fingerprints and photographs taken under someone else's identity",
    processType: "agency",
    whyNotAFiling:
      "Identification data created through mistaken identity is destroyed on that determination. There is no participant petition for it, so nothing is filed.",
    destination: {
      name: "The agency holding the identification data, and the Bureau of Criminal Apprehension",
      detail: "Destruction follows the mistaken-identity determination. There is no petition from you."
    },
    prerequisites: [
      "The identification data is held in Minnesota.",
      "The fingerprints or photographs were taken from someone else who used your identity. Data that is genuinely yours is not destroyed by this mechanism."
    ],
    gather: [
      "Whether the fingerprints or photographs were taken from someone else using your identity.",
      "Which agency took them.",
      "Whether the arrest still appears on your criminal history."
    ],
    sequence: [
      `Get a copy of ${MN_RECORD_CHECK}.`,
      "Identify the agency that took the fingerprints or photographs.",
      "Destruction follows the mistaken-identity determination. There is nothing for you to petition for.",
      "This is not the Minn. Stat. § 299C.11 written-demand route. That route is for identification data that is genuinely yours, where the statutory conditions are met, and it produces a demand you sign. If the data is yours, ask about that route instead."
    ]
  }),

  // The one route in this family that is a petition. It is explained, not sold.
  "mn-inherent-authority-guidance": {
    templateId: "mn-inherent-authority-guidance",
    version: VERSION,
    technicalFixture: true,
    banner: BANNER,
    mechanismName: "Asking a court to seal its own records under its inherent authority",
    whyNotAFiling:
      "This page is not the petition and is not filed. It explains a route that LegalEase does not currently deliver as a packet, so that you can decide whether to pursue it with a lawyer or a clinic. The petition itself uses the ordinary court forms and the ordinary chapter 609A procedure.",
    processType: "court_adjacent",
    prerequisites: [
      "The case is a Minnesota case.",
      "The ordinary chapter 609A statutory petition does not fit. The official instructions say expungement of a conviction that does not meet the chapter 609A criteria is possible, but rare.",
      "You understand that relief on this route reaches judicial branch records only."
    ],
    documentsToObtain: [
      `A copy of ${MN_RECORD_CHECK}.`,
      "The court file number for the case, from Minnesota Court Records Online or the district court administrator."
    ],
    participantDataToGather: [
      "The county the case was in, and the court file number.",
      "Whether the case qualifies under the ordinary statutory petition grounds.",
      "Whether you are required to register as a predatory offender.",
      "Whether you understand that police, sheriff, prosecutor and Bureau of Criminal Apprehension records stay public on this route."
    ],
    officialDestination: {
      name: "The district court administrator in the county of the case",
      detail:
        "The ordinary court forms and the chapter 609A procedure are the vehicle, and the prosecuting authority and the agencies receive notice as on the statutory routes. LegalEase does not currently deliver this packet."
    },
    actionSequence: [
      CHECK_BEFORE_YOU_PAY,
      "Everyone who reaches this route is handed off. This page exists to explain the route and send you to someone who can run it; it is not a step towards a document LegalEase will prepare.",
      "Understand the limit first. Under the Minnesota cases governing this authority, relief reaches judicial branch records only. Police, sheriff, prosecutor and Bureau of Criminal Apprehension records stay public, and the official instructions say so expressly.",
      "Try the ordinary chapter 609A petition first. The official instructions describe inherent-authority relief for a conviction outside the chapter 609A criteria as possible but rare.",
      "Take it to a lawyer or an expungement clinic. LegalEase does not prepare the petition on this route, and does not prepare the supporting memorandum it needs.",
      `Get a copy of ${MN_RECORD_CHECK} and the court file number before you do, because both will be asked for.`
    ],
    submissionMethod:
      "Filed with the district court administrator in the county of the case, using the ordinary court forms. LegalEase does not prepare or submit it.",
    fees: "A district court filing fee applies, plus a county law library fee. No statute waives them on this route.",
    feeWaiver:
      "There is no statutory fee waiver on this route. A fee-waiver request may still be made to the court on the ordinary form.",
    noticeOrService: [
      "The prosecuting authority and the agencies receive notice, the same as on the statutory routes."
    ],
    expectedNextStage:
      "A lawyer or a clinic advises you on whether the route is worth pursuing on your facts.",
    legalEaseCanPrepare: [
      "This explanation of what the route is, what it reaches, and what it costs.",
      "The limit that matters most: court records only."
    ],
    legalEaseCannotPerform: [
      ...MN_CANNOT_PERFORM,
      "LegalEase does not prepare or file the inherent-authority petition, and does not prepare the supporting memorandum. The petition turns on conclusions of law and on a clear-and-convincing balancing argument, which is advocacy rather than document preparation.",
      "Every participant who reaches this route is handed off to legal aid or private counsel. That is the whole of what this route offers."
    ],
    escalationTriggers: [
      "You want to pursue this route. It needs a lawyer or a clinic.",
      "You want advice about whether a particular record qualifies.",
      "You are required to register as a predatory offender, which affects what relief is available.",
      "You need police, sheriff, prosecutor or Bureau of Criminal Apprehension records cleared, which this route does not reach."
    ],
    officialSourceReferences: MN_SOURCES
  }
};

// ---------------------------------------------------------------------------
// Relief tracks
// ---------------------------------------------------------------------------

function packetSet(trackId: string, componentId: string, templateId: string): PacketSet {
  if (!MINNESOTA_GUIDANCE_TEMPLATES[templateId]) {
    throw new Error(`${componentId}: no Minnesota guidance template ${templateId} is registered.`);
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: [
      {
        componentId,
        role: "process_guidance",
        outputStrategy: "process_guidance",
        rendererStrategy: "process_guidance",
        templateId,
        sourcePath: null,
        sourceSha256: null,
        geographicScope: "statewide",
        requirement: "required",
        order: 1,
        approval: PENDING_APPROVAL,
        version: VERSION
      }
    ]
  };
}

const SHARED_INPUTS: readonly RequiredInput[] = [
  {
    key: "wantsEligibilityAdvice",
    label: "Do you want advice about whether your particular record qualifies?",
    required: true
  },
  {
    key: "recordStillAppears",
    label: "Does the case still appear when you look it up?",
    required: true
  }
];

function minnesotaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  componentId: string;
  templateId: string;
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
    jurisdiction: "MN",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: "not_applicable",
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "process_guidance",
    packetSet: packetSet(input.trackId, input.componentId, input.templateId),
    requiredInputs: [...SHARED_INPUTS, ...input.extraInputs],
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "process_guidance"
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

export const MINNESOTA_GUIDANCE_TRACKS: readonly ReliefTrack[] = [
  minnesotaTrack({
    trackId: "mn_auto_clean_slate",
    publicName: "Records that clear automatically",
    mechanism: "automatic_clean_slate_sealing",
    authority: "Minn. Stat. ch. 609A; Laws 2023, ch. 52; Laws 2026, ch. 70, § 5",
    recordTypes: ["court_record", "bca_record"],
    dispositions: ["clean_slate_eligible_record"],
    componentId: "mn_auto_clean_slate-process-guidance-1",
    templateId: "mn-auto-clean-slate-guidance",
    extraInputs: [
      { key: "disposition", label: "How did the case end?", required: true },
      { key: "dispositionDate", label: "On what date did it end?", required: true },
      {
        key: "offenceLevel",
        label: "Was the offence a petty misdemeanour, misdemeanour, gross misdemeanour or felony?",
        required: true
      },
      {
        key: "consideringPaidPetition",
        label: "Are you considering filing a petition to expunge this record?",
        required: true
      }
    ],
    assembledPacketName: "Clean-Slate-Verification",
    assembledPacketTitle: "Records that clear automatically under Clean Slate",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Bureau of Criminal Apprehension identifies eligible records and the court seals them with nothing to file and no fee, how to check, that a sealed record can later be unsealed, and why to check before paying for a petition.",
    notes:
      "The unsealing warning is given without an operative date, because the design records that the date of the enacting section must be confirmed before participant-facing instructions state it. Where an eligible record was not processed there is no correction submission and none is invented."
  }),

  minnesotaTrack({
    trackId: "mn_auto_cannabis_nonfelony",
    publicName: "Cannabis records that clear automatically",
    mechanism: "automatic_expungement_non_felony_cannabis",
    authority: "Minn. Stat. ch. 609A; Laws 2023, ch. 63",
    recordTypes: ["court_record", "bca_record"],
    dispositions: ["non_felony_cannabis_offence"],
    componentId: "mn_auto_cannabis_nonfelony-process-guidance-1",
    templateId: "mn-auto-cannabis-nonfelony-guidance",
    extraInputs: [
      {
        key: "cannabisOffenceLevel",
        label: "Was the cannabis offence a felony, or a lower-level offence?",
        required: true
      },
      { key: "convictionDate", label: "When was the case decided?", required: true }
    ],
    assembledPacketName: "Cannabis-Automatic-Expungement-Verification",
    assembledPacketTitle: "Non-felony cannabis records that clear automatically",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Bureau of Criminal Apprehension expunges qualifying non-felony cannabis records without any application, how to check, and what the route does not reach.",
    notes:
      "A felony cannabis answer produces a typed route mismatch to the Cannabis Expungement Board route rather than a dead end. A non-cannabis offence in the same case is outside this route and the sheet says so."
  }),

  minnesotaTrack({
    trackId: "mn_ceb_felony_cannabis",
    publicName: "Cannabis Expungement Board review of a felony cannabis record",
    mechanism: "cannabis_expungement_board_review",
    authority: "Minn. Stat. ch. 609A; Laws 2023, ch. 63",
    recordTypes: ["court_record", "bca_record"],
    dispositions: ["felony_cannabis_offence"],
    componentId: "mn_ceb_felony_cannabis-process-guidance-1",
    templateId: "mn-ceb-felony-cannabis-guidance",
    extraInputs: [
      { key: "cannabisOffenceLevel", label: "Was the cannabis offence a felony?", required: true },
      { key: "convictionDate", label: "When were you convicted?", required: true }
    ],
    assembledPacketName: "Cannabis-Board-Review-Verification",
    assembledPacketTitle: "Cannabis Expungement Board review of a felony cannabis record",
    customerDeliverableDescription:
      "A guidance sheet explaining that the Cannabis Expungement Board reviews felony cannabis records on its own initiative and may order expungement or resentencing, with nothing to apply for.",
    notes:
      "There is no application to the Board. A non-felony answer routes to the automatic cannabis expungement route."
  }),

  minnesotaTrack({
    trackId: "mn_pardon_auto_expungement",
    publicName: "Records that clear automatically after a pardon",
    mechanism: "automatic_expungement_following_pardon_extraordinary",
    authority: "Minn. Stat. ch. 638; Minn. Stat. ch. 609A",
    recordTypes: ["court_record", "bca_record"],
    dispositions: ["pardon_extraordinary_granted"],
    componentId: "mn_pardon_auto_expungement-process-guidance-1",
    templateId: "mn-pardon-auto-expungement-guidance",
    extraInputs: [
      { key: "pardonGranted", label: "Have you been granted a pardon extraordinary?", required: true },
      { key: "pardonDate", label: "On what date was it granted?", required: false }
    ],
    assembledPacketName: "Post-Pardon-Expungement-Verification",
    assembledPacketTitle: "Records that clear automatically after a pardon extraordinary",
    customerDeliverableDescription:
      "A guidance sheet explaining that expungement follows a granted pardon extraordinary automatically, with no separate expungement petition, and that the clemency application itself is a different process.",
    notes:
      "The sheet is careful not to be mistaken for the clemency application, which is a separate process before the pardon body and is not prepared here."
  }),

  minnesotaTrack({
    trackId: "mn_mistaken_identity_court",
    publicName: "Clearing a record created when someone used your identity",
    mechanism: "mistaken_identity_court_record_expungement",
    authority: "Minn. Stat. ch. 609A",
    recordTypes: ["court_record"],
    dispositions: ["record_created_through_mistaken_identity"],
    componentId: "mn_mistaken_identity_court-process-guidance-1",
    templateId: "mn-mistaken-identity-court-guidance",
    extraInputs: [
      {
        key: "whoseRecordIsIt",
        label: "Was this record created because someone else used your identity, because of a name mix-up, or is the record actually yours?",
        required: true
      },
      { key: "courtAndCase", label: "Which court and case number does the record appear under?", required: true }
    ],
    assembledPacketName: "Mistaken-Identity-Court-Record",
    assembledPacketTitle: "Clearing a court record created when someone used your identity",
    customerDeliverableDescription:
      "A guidance sheet explaining that the court expunges a mistaken-identity record on that determination, with no petition from the participant, and pointing to the separate identification-data route.",
    notes:
      "A participant who answers that the record is genuinely their own gets a typed route mismatch rather than a sheet that does not apply to them."
  }),

  minnesotaTrack({
    trackId: "mn_mistaken_identity_iddata",
    publicName: "Destroying fingerprints and photographs taken under someone else's identity",
    mechanism: "mistaken_identity_identification_data_destruction",
    authority: "Minn. Stat. § 299C.11",
    recordTypes: ["identification_data"],
    dispositions: ["identification_data_created_through_mistaken_identity"],
    componentId: "mn_mistaken_identity_iddata-process-guidance-1",
    templateId: "mn-mistaken-identity-iddata-guidance",
    extraInputs: [
      {
        key: "whoseRecordIsIt",
        label: "Were the fingerprints or photographs taken from someone else who used your identity, was it a name mix-up, or are they actually yours?",
        required: true
      },
      { key: "arrestingAgency", label: "Which agency took them?", required: true }
    ],
    assembledPacketName: "Mistaken-Identity-Identification-Data",
    assembledPacketTitle: "Destroying fingerprints and photographs taken under someone else's identity",
    customerDeliverableDescription:
      "A guidance sheet explaining that identification data created through mistaken identity is destroyed on that determination with no petition, and distinguishing the separate § 299C.11 written-demand route.",
    notes:
      "The design requires this route to be distinguished from the § 299C.11 written-demand route, which is a different Minnesota track and does produce a participant-signed demand. Answering that the data is genuinely the participant's own routes them there."
  }),

  minnesotaTrack({
    trackId: "mn_inherent_authority",
    publicName: "Petition to seal court records only",
    mechanism: "inherent_authority_judicial_record_sealing",
    authority:
      "State v. Ambaye, 616 N.W.2d 256 (Minn. 2000); State v. C.A., 304 N.W.2d 353 (Minn. 1981); In re R.L.F., 256 N.W.2d 803 (Minn. 1977)",
    recordTypes: ["court_record"],
    dispositions: ["outside_chapter_609a_criteria"],
    componentId: "mn_inherent_authority-process-guidance-1",
    templateId: "mn-inherent-authority-guidance",
    extraInputs: [
      { key: "county", label: "In which Minnesota county was the case?", required: true },
      { key: "caseNumber", label: "What is the court file number?", required: true },
      {
        key: "qualifiesUnder609A",
        label: "Does your case qualify under the ordinary statutory petition grounds?",
        required: true
      },
      {
        key: "registrationRequired",
        label: "Are you required to register as a predatory offender?",
        required: true
      },
      {
        key: "understandsCourtRecordsOnly",
        label: "Do you understand that this route reaches court records only, and that police, sheriff, prosecutor and Bureau of Criminal Apprehension records stay public?",
        required: true
      }
    ],
    assembledPacketName: "Inherent-Authority-Route-Explainer",
    assembledPacketTitle: "Asking a court to seal its own records under its inherent authority",
    customerDeliverableDescription:
      "A guidance sheet explaining what the inherent-authority route is, that it reaches judicial branch records only, that a filing fee and a county law library fee apply with no statutory waiver, and that LegalEase does not currently prepare the petition.",
    notes:
      "The one route in this family that is a petition, and the one LegalEase does not deliver. The sheet explains it rather than pretending to be it. A participant who qualifies under the ordinary chapter 609A petition is routed there first, and one who has not understood the court-records-only limit is stopped rather than steered in."
  })
];
