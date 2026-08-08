// Nevada record sealing — custom-pleading implementation.
//
// Six assigned routes, each carrying four custom-pleading components: the
// participant's filing, a proposed order, a declaration and verification, and a
// stipulation for the prosecuting agency.
//
// Four facts about Nevada shape every document in this module.
//
// **It is sealing, and it is never called expungement.** The Department of
// Public Safety states directly that sealing is not expungement because it does
// not authorise the destruction of the records. Under NRS 179.285 the
// proceedings are deemed never to have occurred and civil rights are restored,
// but NRS 179.295 allows a sealed record to be reopened and NRS 179.301 allows
// named persons and agencies to inspect it. A Nevada order binds no federal,
// tribal, military or out-of-state agency. And sealing does not restore firearm
// rights — only a pardon that does not restrict the right to bear arms does.
// Every document here says so; none of them uses the word expungement for what
// Nevada does.
//
// **The prosecutor comes first, not last.** Nevada's own instructions direct
// the petitioner to prepare the petition, the declaration and the order, deliver
// them to the district attorney or the city attorney with the repository record
// and the attachments, and file with the clerk of the court only once the
// prosecutor stipulates. That is why a stipulation is a packet component here
// rather than something the court produces: the participant carries it to the
// prosecuting agency. **LegalEase does not obtain that stipulation, does not
// predict it, and does not fill a single line of it.** Where a route turns on
// the prosecutor refusing, the packet stops.
//
// **Nothing runs without the repository record.** NRS 179.245(2)(a) and NRS
// 179.255(3)(a) make a current verified criminal history from the Central
// Repository a statutory attachment. The design puts it plainly: no repository
// record, no packet. It is fingerprint-based and the participant obtains it
// themselves, so every filing states the requirement and none of them pretends
// the record is held here.
//
// **Signatures are handwritten or the filing is denied.** Las Vegas Municipal
// Court treats a typed rather than signed signature as cause for immediate
// denial, and every county reviewed requires a signed declaration and
// verification. Every participant execution block in this module therefore says
// to sign it by hand, and notarization is left to the clerk to answer because
// the design records it as county-dependent.
//
// Boundaries kept throughout:
//
//   - **Offence category is a legal classification, not a lookup.** Nevada
//     eligibility turns on category A through E felony, gross misdemeanour or
//     misdemeanour and on whether the offence is a crime of violence, and it
//     drives a one-year answer or a ten-year one. The participant supplies the
//     category from the official record; this module recites it and computes no
//     period from it.
//   - **The DUI carve-back is applied by a lawyer, not by a rule.** NRS
//     179.245(7) preserves eligibility for a DUI punished under NRS
//     484C.400(1)(b), and for one punished under (1)(c) where judgment was
//     entered under (1)(b) because of participation in the NRS 484C.392
//     programme. The design's warning is that a blanket "felony DUI is never
//     sealable" rule wrongly rejects eligible people, so a DUI answer is a
//     referral rather than a rejection.
//   - **The sex-trafficking fee waiver is surfaced wherever a fee is.** NRS
//     179.245(9) zeroes every fee in the process for a victim of sex trafficking
//     or involuntary servitude — the filing fee, the fingerprints, the criminal
//     history and the certified copies. It is not a separate route but a
//     cross-cutting entitlement, and the design requires it be surfaced wherever
//     a fee is mentioned.
//   - **The judge signs the order.** The proposed order carries a blank judicial
//     signature block and, where the design requires it, a separate blank
//     approval line for each prosecuting agency. Not one of those lines is
//     filled here.
//
// What these documents never do:
//
//   - state that the prosecutor has stipulated, will stipulate, or will not
//     object;
//   - compute a waiting period, or say that one has run;
//   - decide whether an offence is a sexual offence within the eighteen-item
//     NRS 179.245(10)(b) list, or a crime against a child under NRS 179D.0357;
//   - decide whether conduct has been decriminalised on the NRS 179.271 route.
//     That is a legal conclusion, and the section's text was not read;
//   - state what NRS 179.259, NRS 179.271 or NRS 179.273 require. The design
//     records that the text of each was not retrievable, so the filings ask for
//     relief under them and recite the participant's facts without stating
//     conditions nobody has read;
//   - state a fee amount. Fees are county-dependent and were not established;
//   - describe sealing as having any immigration effect, or as restoring
//     firearm rights.
//
// Every template is DRAFT PENDING LEGAL REVIEW until reviewing counsel adopts
// it. Every track is `technicalFixture` and `runtimeDisabled`: nothing here
// reaches a runtime surface, and wiring these tracks and templates into the
// shared registry and template pack is the integration captain's step.

import type { PleadingTemplate } from "@/lib/rcap/packets/engines/pleading-templates";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

const BANNER =
  "DRAFT PENDING LEGAL REVIEW — PREPARED BY LEGALEASE — NOT LEGAL ADVICE — DO NOT FILE UNTIL REVIEWED";

/** Where a typed stop on a Nevada route sends the participant. */
export const NV_REFERRAL =
  "Nevada Legal Services, the Legal Aid Center of Southern Nevada or Washoe Legal Services, Nevada Free Legal Answers, or the State Bar of Nevada lawyer referral service.";

/** Where a route stops because a different Nevada mechanism is the right one. */
export const NV_ROUTING_REFERRAL =
  "LegalEase's own Nevada routing: the stop names the mechanism that fits, and it is not this one.";

/** Where the pardon route stops when the automatic sealing may already have run. */
export const NV_REPOSITORY_REFERRAL =
  "The Nevada Central Repository for Nevada Records of Criminal History, which holds the record a verification would be run against.";

/**
 * The assigned routes, held as a closed list.
 *
 * Six were built in the first pass and are unchanged. The expansion adds
 * `nv_repository_removal` and `nv_seal_probation_family`, which are the two
 * incremental tracks in the assignment: every value on the original six stays
 * exactly as it was, because they are already integrated.
 */
export const NV_ASSIGNED_TRACK_IDS: readonly string[] = [
  "nv_repository_removal",
  "nv_seal_conviction",
  "nv_seal_decrim",
  "nv_seal_multi",
  "nv_seal_nonconviction",
  "nv_seal_pardon",
  "nv_seal_probation_family",
  "nv_seal_reentry"
];

// ---------------------------------------------------------------------------
// Typed stops
// ---------------------------------------------------------------------------

/**
 * Raised where an answer puts the matter outside what LegalEase may prepare
 * without individualized advice, or outside what the adopted design settled.
 */
export class NevadaEligibilityStopError extends Error {
  readonly code = "nevada_eligibility_stop" as const;

  constructor(
    readonly stopId: string,
    readonly trackId: string,
    readonly reason: string,
    readonly referral: string
  ) {
    super(`${trackId}: ${reason}`);
    this.name = "NevadaEligibilityStopError";
  }
}

/** Raised where an answer is not one of the values the route accepts. */
export class NevadaBranchError extends Error {
  readonly code = "nevada_branch_not_recognized" as const;

  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly received: string,
    readonly permitted: readonly string[]
  ) {
    super(
      `${trackId}: ${key} received "${received}", which is not one of ${permitted.join(", ")}.`
    );
    this.name = "NevadaBranchError";
  }
}

// ---------------------------------------------------------------------------
// Closed lists
// ---------------------------------------------------------------------------

/** The only two answers a yes-or-no screen accepts. No default, no coercion. */
export const NV_YES_NO: Readonly<Record<string, boolean>> = {
  yes: true,
  no: false
};

/**
 * The offence classes Nevada eligibility turns on.
 *
 * The list exists so that the participant's answer is one of the seven the
 * statute uses rather than a description a court would have to interpret. It is
 * **not** a period lookup: no period is computed anywhere in this module,
 * because the category and the crime-of-violence question together decide a
 * one-year answer or a ten-year one and both are legal classifications.
 */
export const NV_OFFENCE_CATEGORIES: Readonly<Record<string, string>> = {
  category_a_felony: "a category A felony",
  category_b_felony: "a category B felony",
  category_c_felony: "a category C felony",
  category_d_felony: "a category D felony",
  category_e_felony: "a category E felony",
  gross_misdemeanour: "a gross misdemeanour",
  misdemeanour: "a misdemeanour"
};

/** How a case that did not end in a conviction ended. NRS 179.255(1). */
export const NV_NONCONVICTION_DISPOSITIONS: Readonly<Record<string, string>> = {
  dismissed: "the charges were dismissed",
  declined: "the prosecuting agency declined to pursue the case",
  acquitted: "the petitioner was acquitted"
};

/** NRS 179.273 reaches an unconditional pardon. */
export const NV_PARDON_TYPES: Readonly<Record<string, string>> = {
  unconditional: "an unconditional pardon",
  conditional: "a pardon granted with conditions"
};

/** The three Nevada court levels a record can sit in. */
export const NV_COURT_LEVELS: Readonly<Record<string, string>> = {
  district: "district court",
  justice: "justice court",
  municipal: "municipal court"
};

// ---------------------------------------------------------------------------
// Closed lists added by the expansion: NRS 176A treatment-programme sealing and
// NRS 179A.160 repository removal
// ---------------------------------------------------------------------------

/** Which chapter 176A programme the case ran under. The three sections are structurally identical. */
export const NV_PROGRAM_SECTIONS: Readonly<Record<string, string>> = {
  substance_use: "the programme of treatment for alcohol or other substance use under NRS 176A.240, sealed under NRS 176A.245",
  mental_health: "the programme for treatment of mental illness or intellectual disabilities under NRS 176A.260, sealed under NRS 176A.265",
  veterans: "the programme for treatment of veterans and members of the military under NRS 176A.290, sealed under NRS 176A.295",
  unsure: "unsure"
};

/** How the programme case ended. Only two of the four reach the subsection 2 petition. */
export const NV_PROBATION_OUTCOMES: Readonly<Record<string, string>> = {
  discharged: "discharged from probation",
  dismissed: "the case was dismissed",
  conditionally_dismissed: "the charges were conditionally dismissed",
  set_aside: "the judgment of conviction was set aside",
  sentenced: "the programme was not completed and a sentence was imposed"
};

/** Whether the charge is one of the three subsection 2 names. */
export const NV_PROBATION_CHARGE_TYPES: Readonly<Record<string, string>> = {
  domestic_battery: "a violation of NRS 200.485, battery constituting domestic violence",
  dui: "a violation of NRS 484C.110 or NRS 484C.120, driving or being in actual physical control of a vehicle under the influence",
  other: "an offence other than one named in subsection 2",
  unsure: "unsure"
};

/** NRS 179.2445(2) turns on which discharge was given. */
export const NV_DISCHARGE_TYPES: Readonly<Record<string, string>> = {
  honourable: "an honourable discharge",
  dishonourable: "a dishonourable discharge under NRS 176A.850",
  not_applicable: "no discharge from probation",
  unsure: "unsure"
};

/** How the case ended, for the NRS 179A.160 threshold. */
export const NV_REPOSITORY_DISPOSITIONS: Readonly<Record<string, string>> = {
  acquitted: "an acquittal was entered",
  dismissed: "the charge was dismissed",
  favourable_other: "the disposition of the charge was otherwise favourable to the applicant",
  unsure: "unsure"
};

/** Where a treatment-programme stop that is really the ordinary sealing route goes. */
export const NV_ORDINARY_SEALING_REFERRAL =
  "LegalEase's own Nevada routing: the ordinary chapter 179 sealing petition, which is a different track with its own periods and its own petition.";

/** Where a repository stop that needs the court record sealed as well goes. */
export const NV_COURT_SEALING_REFERRAL =
  "LegalEase's own Nevada routing: removing a record from the Central Repository does not seal the court record, which is a separate NRS 179.255 petition on a different track.";

// ---------------------------------------------------------------------------
// Answer helpers
// ---------------------------------------------------------------------------

type Answers = Record<string, unknown>;

const str = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join("\n");
  }
  return String(value).trim();
};

const need = (trackId: string, answers: Answers, key: string): string => {
  const value = str(answers, key);
  if (!value) {
    throw new NevadaEligibilityStopError(
      "nv-answer-missing",
      trackId,
      `The route needs an answer to ${key} before anything can be prepared, and none was given.`,
      NV_REFERRAL
    );
  }
  return value;
};

const branch = <T>(
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, T>>
): T => {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new NevadaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return permitted[normalized];
};

/**
 * The same closed-list validation as `branch`, returning the answer's own key
 * rather than the prose it maps to. A branch that both decides a mechanism and
 * prints a sentence needs the key to compare against and the prose to print,
 * and comparing against the prose silently matches nothing.
 */
const branchKey = (
  trackId: string,
  key: string,
  raw: string,
  permitted: Readonly<Record<string, unknown>>
): string => {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!Object.prototype.hasOwnProperty.call(permitted, normalized)) {
    throw new NevadaBranchError(trackId, key, raw, Object.keys(permitted));
  }
  return normalized;
};

const yesNo = (trackId: string, answers: Answers, key: string): boolean =>
  branch(trackId, key, need(trackId, answers, key), NV_YES_NO);

/** Renders a free-text list answer as one line per entry, never numbered. */
const listAnswer = (answers: Answers, key: string): string => {
  const value = answers[key];
  if (Array.isArray(value)) {
    const entries = value.map((entry) => String(entry).trim()).filter(Boolean);
    return entries.length > 0 ? entries.map((entry) => `— ${entry}`).join("\n") : "None stated.";
  }
  const single = str(answers, key);
  return single ? `— ${single}` : "None stated.";
};

/**
 * The bare county name, for the caption line that already prints "COUNTY".
 *
 * The design's county question also asks which court handled the case, so the
 * answer arrives as "Clark County, district court" as readily as "Clark". The
 * first clause is taken and a trailing "County" dropped; the whole answer is
 * still recited in the allegations, and the court level is written in by hand
 * on the caption because a filing that names the wrong Nevada court is refused
 * at the counter.
 */
function bareCountyName(raw: string): string {
  const firstClause = raw.split(",")[0].trim();
  return firstClause.replace(/\s+county$/i, "").trim() || firstClause;
}

// ---------------------------------------------------------------------------
// Screens shared by every route
// ---------------------------------------------------------------------------

/**
 * Derives the facts every Nevada route carries, and applies the screens the
 * design puts on all of them.
 */
function commonFacts(trackId: string, answers: Answers, prefix: string): Record<string, string> {
  const key = (suffix: string) => `${prefix}${suffix}`;
  const fullLegalName = need(trackId, answers, key("FullLegalName"));
  const dateOfBirth = need(trackId, answers, key("DateOfBirth"));
  const county = need(trackId, answers, key("County"));
  const caseNumber = need(trackId, answers, key("CaseNumber"));
  const offenceDetails = need(trackId, answers, key("OffenceDetails"));
  const allNevadaRecords = listAnswer(answers, key("AllNevadaRecords"));
  const traffickingAnswer = str(answers, key("Trafficking"));
  const trafficking = traffickingAnswer
    ? branch(trackId, key("Trafficking"), traffickingAnswer, NV_YES_NO)
    : false;

  return {
    [key("FullLegalName")]: fullLegalName,
    [key("DateOfBirth")]: dateOfBirth,
    [key("County")]: county,
    [key("CaseNumber")]: caseNumber,
    [key("OffenceDetails")]: offenceDetails,
    [key("AllNevadaRecords")]: str(answers, key("AllNevadaRecords")) || "None stated.",
    [key("Trafficking")]: trafficking ? "yes" : "no",

    fullLegalName,
    dateOfBirth,
    county,
    countyName: bareCountyName(county),
    caseNumber,
    offenceDetails,
    allNevadaRecords,
    [NV_STIPULATION_CONDITION_KEY]: "yes",
    traffickingStatement: trafficking
      ? "The petitioner has said that the waiver above reaches them. Say so at the counter and to the prosecuting agency, and be ready to say what it is based on. A separate route under NRS 179.247 may also be open on those facts; it is not this one, and it is worth asking a lawyer whether it fits better before filing this."
      : "The petitioner has not said that the waiver above reaches them. If that changes, say so at the counter: it is not applied automatically and nobody will ask.",
    packetCaseReference: `${bareCountyName(county)} County`
  };
}

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

/**
 * Turns the participant's answers into the fact bag the templates read.
 *
 * Every key the track declares is carried through, including the screening
 * answers no template prints, because `resolvePacket` checks the declared keys
 * against this bag. No yes-or-no answer is carried into a rendered sentence as a
 * bare word: each becomes a statement, so no filing can print "no" on a line and
 * leave the reader to guess the question.
 */
export function deriveNevadaFacts(
  trackId: string,
  answers: Answers
): Record<string, string> {
  if (!NV_ASSIGNED_TRACK_IDS.includes(trackId)) {
    throw new NevadaBranchError(trackId, "trackId", trackId, NV_ASSIGNED_TRACK_IDS);
  }

  switch (trackId) {
    case "nv_seal_probation_family": {
      const court = need(trackId, answers, "prbCourt");
      const programSection = branchKey(
        trackId,
        "prbProgramSection",
        need(trackId, answers, "prbProgramSection"),
        NV_PROGRAM_SECTIONS
      );
      const outcome = branchKey(
        trackId,
        "prbOutcome",
        need(trackId, answers, "prbOutcome"),
        NV_PROBATION_OUTCOMES
      );
      const chargeType = branchKey(
        trackId,
        "prbChargeType",
        need(trackId, answers, "prbChargeType"),
        NV_PROBATION_CHARGE_TYPES
      );
      const dischargeType = branchKey(
        trackId,
        "prbDischargeType",
        need(trackId, answers, "prbDischargeType"),
        NV_DISCHARGE_TYPES
      );

      if (yesNo(trackId, answers, "prbExcludedCharge")) {
        throw new NevadaEligibilityStopError(
          "nv-176a-subsection-3-exclusion",
          trackId,
          "The charge was one of abuse, neglect or endangerment of a child under NRS 200.508, or abuse, neglect, exploitation, isolation or abandonment of an older or vulnerable person under NRS 200.5099. Subsection 3 of each of NRS 176A.245, NRS 176A.265 and NRS 176A.295 provides that the court may not order sealing under the section in that case. It is a bar on the face of the section and neither branch survives it.",
          NV_REFERRAL
        );
      }
      if (programSection === "unsure") {
        throw new NevadaEligibilityStopError(
          "nv-176a-programme-not-identified",
          trackId,
          "Which chapter 176A programme the case ran under has not been identified. The three sections are structurally identical but each attaches to its own programme, and the petition has to name the one the case ran under. The court file and the programme paperwork carry it.",
          NV_ROUTING_REFERRAL
        );
      }
      if (outcome === "sentenced") {
        throw new NevadaEligibilityStopError(
          "nv-176a-programme-not-completed",
          trackId,
          "The programme was not completed and a sentence was imposed rather than a discharge given or the case dismissed. Sealing under these sections follows a discharge or a dismissal under the corresponding programme section, so neither branch opens on those facts.",
          NV_ORDINARY_SEALING_REFERRAL
        );
      }
      if (dischargeType === "dishonourable") {
        throw new NevadaEligibilityStopError(
          "nv-176a-dishonourable-discharge",
          trackId,
          "The discharge from probation was dishonourable under NRS 176A.850. NRS 179.2445(2) provides that the rebuttable presumption in favour of sealing does not apply to such a defendant, which changes what any later petition should expect, and the design makes it a stop rather than something to draft around.",
          NV_REFERRAL
        );
      }
      if (dischargeType === "unsure") {
        throw new NevadaEligibilityStopError(
          "nv-176a-discharge-type-not-established",
          trackId,
          "Whether the discharge from probation was honourable or dishonourable has not been established. NRS 179.2445(2) turns on it, so it is not a detail to answer from memory: the order of discharge says which it was.",
          NV_ROUTING_REFERRAL
        );
      }
      if (chargeType === "unsure") {
        throw new NevadaEligibilityStopError(
          "nv-176a-charge-type-not-established",
          trackId,
          "Whether the charge was a violation of NRS 200.485, NRS 484C.110 or NRS 484C.120 has not been established. That single answer decides which of the section's two mechanisms applies — the automatic one on which nothing is filed, or the subsection 2 petition — and it comes from the charging document rather than from memory.",
          NV_ROUTING_REFERRAL
        );
      }

      // The subsection 2 branch is the only one on which a defendant files.
      const subsectionTwo =
        (chargeType === "domestic_battery" || chargeType === "dui") &&
        (outcome === "conditionally_dismissed" || outcome === "set_aside");
      const dispositionDate = str(answers, "prbDispositionDate");
      if (subsectionTwo && !dispositionDate) {
        throw new NevadaEligibilityStopError(
          "nv-176a-disposition-date-not-established",
          trackId,
          "This is a subsection 2 case and the date of the conditional dismissal or the setting aside of the judgment has not been given. Subsection 2 runs its seven years from that date, so it is the date the whole timing question turns on, and the court record carries it.",
          NV_ROUTING_REFERRAL
        );
      }

      const sectionCitation =
        programSection === "substance_use"
          ? "NRS 176A.245"
          : programSection === "mental_health"
            ? "NRS 176A.265"
            : "NRS 176A.295";

      return {
        prbCourt: court,
        prbProgramSection: programSection,
        prbOutcome: outcome,
        prbChargeType: chargeType,
        prbDispositionDate: dispositionDate || "not applicable on this branch",
        prbDischargeType: dischargeType,
        prbExcludedCharge: "no",

        countyName: bareCountyName(court),
        prbCourtName: court,
        prbCourtLine: court.toUpperCase(),
        prbSectionCitation: sectionCitation,
        prbProgramStatement: `The petitioner states that this case was handled through ${NV_PROGRAM_SECTIONS[programSection]}.`,
        prbOffenceStatement: `The petitioner states the charge as ${NV_PROBATION_CHARGE_TYPES[chargeType]}.`,
        prbDispositionStatement: subsectionTwo
          ? `The petitioner states that ${NV_PROBATION_OUTCOMES[outcome]} on ${dispositionDate}.`
          : `The petitioner states that ${NV_PROBATION_OUTCOMES[outcome]}.`,
        prbFulfilmentStatement:
          "The petitioner states that the terms and conditions imposed by the Court and by the Division of Parole and Probation were fulfilled. Whether they were is the Court's finding, and this is the petitioner's own statement of it.",
        prbDischargeStatement: `The petitioner states the discharge from probation as ${NV_DISCHARGE_TYPES[dischargeType]}.`,
        prbBranchStatement: subsectionTwo
          ? "On the answers given this is a subsection 2 case: the charge is one of the three the subsection names and the disposition was a conditional dismissal or a set-aside, so a petition by the defendant is the mechanism."
          : "On the answers given this is a subsection 1 case: the court orders the sealing itself and the defendant files nothing. No petition is generated, and none is needed.",
        prbReferralLine: NV_REFERRAL,
        [NV_SUBSECTION_TWO_CONDITION_KEY]: subsectionTwo ? "yes" : "",
        packetCaseReference: `${bareCountyName(court)} County`
      };
    }

    case "nv_repository_removal": {
      const arrestIdentity = need(trackId, answers, "rpoArrestIdentity");
      const dispositionFinalDate = need(trackId, answers, "rpoDispositionFinalDate");
      const disposition = branchKey(
        trackId,
        "rpoDisposition",
        need(trackId, answers, "rpoDisposition"),
        NV_REPOSITORY_DISPOSITIONS
      );
      if (disposition === "unsure") {
        throw new NevadaEligibilityStopError(
          "nv-179a160-disposition-not-established",
          trackId,
          "How the case ended has not been established. NRS 179A.160(1) opens only on an acquittal or a disposition of the charge favourable to the person, and whether a given outcome is favourable is the threshold question the section turns on. The court record settles what the outcome was.",
          NV_REPOSITORY_REFERRAL
        );
      }
      if (yesNo(trackId, answers, "rpoDeferredOrPlea")) {
        throw new NevadaEligibilityStopError(
          "nv-179a160-deferred-or-plea",
          trackId,
          "The case was resolved through a deferred prosecution, a plea bargain or a similar arrangement. NRS 179A.160(2)(c) excludes that outright, and the design records it as the condition that most often defeats this route in practice. The application would be refused on its face.",
          NV_COURT_SEALING_REFERRAL
        );
      }
      if (yesNo(trackId, answers, "rpoPriorFelonyOrGrossMisdemeanor")) {
        throw new NevadaEligibilityStopError(
          "nv-179a160-prior-conviction",
          trackId,
          "There is a prior conviction for a felony or a gross misdemeanour. NRS 179A.160(2)(d) reaches a conviction in ANY jurisdiction in the United States, not merely in Nevada, so the exclusion bites wherever the conviction is from.",
          NV_REFERRAL
        );
      }
      if (yesNo(trackId, answers, "rpoSubsequentArrest")) {
        throw new NevadaEligibilityStopError(
          "nv-179a160-subsequent-arrest",
          trackId,
          "There has been an arrest for or a charge of another crime, other than a minor traffic violation, since the arrest, citation or warrant sought to be removed. NRS 179A.160(2)(e) excludes that.",
          NV_REFERRAL
        );
      }
      if (!yesNo(trackId, answers, "rpoRepositoryShows")) {
        throw new NevadaEligibilityStopError(
          "nv-179a160-record-not-shown",
          trackId,
          "The arrest does not still show on the applicant's Nevada criminal history from the repository. There is nothing to ask the Central Repository to remove, and an application about a record the repository does not hold asks an office to act on something it cannot find.",
          NV_REPOSITORY_REFERRAL
        );
      }

      const formerNames = str(answers, "rpoFormerNames");
      return {
        rpoDisposition: disposition,
        rpoDispositionFinalDate: dispositionFinalDate,
        rpoArrestIdentity: arrestIdentity,
        rpoRepositoryShows: "yes",
        rpoDeferredOrPlea: "no",
        rpoPriorFelonyOrGrossMisdemeanor: "no",
        rpoSubsequentArrest: "no",
        rpoFormerNames: formerNames,

        rpoAgencyShortName: "named in the application",
        rpoFormerNamesStatement: formerNames
          ? `The applicant states that they have also used the following names: ${formerNames}`
          : "The applicant states that they have used no other name.",
        rpoArrestStatement: `The applicant states the arrest, citation or warrant as: ${arrestIdentity}`,
        rpoDispositionStatement: `The applicant states that ${NV_REPOSITORY_DISPOSITIONS[disposition]}, and that the disposition became final on ${dispositionFinalDate}.`,
        rpoRepositoryStatement:
          "The applicant states that the record still appears on the applicant's Nevada criminal history obtained from the Central Repository.",
        rpoReferralLine: NV_REFERRAL,
        packetCaseReference: "Nevada repository removal"
      };
    }

    case "nv_seal_conviction": {
      const facts = commonFacts(trackId, answers, "cvs");

      const pendingCharges = yesNo(trackId, answers, "cvsPendingCharges");
      if (pendingCharges) {
        throw new NevadaEligibilityStopError(
          "nv-pending-charge",
          trackId,
          "A charge is pending against you now. NRS 179.245(5) requires the court to find that during the prescribed period you were not charged with an offence for which charges are pending and were not convicted of any offence other than a minor moving or standing traffic violation. A petition filed while a charge is pending asks the court to make a finding it cannot make.",
          NV_REFERRAL
        );
      }

      const dishonourable = yesNo(trackId, answers, "cvsDishonourableDischarge");
      if (dishonourable) {
        throw new NevadaEligibilityStopError(
          "nv-dishonourable-discharge-removes-the-presumption",
          trackId,
          "You were dishonourably discharged from probation. NRS 179.2445 withholds the rebuttable presumption in favour of sealing from a defendant dishonourably discharged from probation under NRS 176A.850. That changes what the packet could honestly tell you to expect, and it is the point at which a prepared petition stops being the right thing to hand you.",
          NV_REFERRAL
        );
      }

      const duiDetails = str(answers, "cvsDuiDetails");
      if (duiDetails) {
        throw new NevadaEligibilityStopError(
          "nv-dui-carve-back-needs-counsel",
          trackId,
          "This was a DUI. NRS 179.245(7) preserves eligibility for a DUI punished under NRS 484C.400(1)(b), and for one punished under (1)(c) where judgment was entered under (1)(b) because of participation in the statewide sobriety and drug monitoring programme under NRS 484C.392. Which subsection you were punished under decides whether you are eligible at all, and it is read from the judgment rather than from memory. This is a referral and not a refusal: a blanket rule that a felony DUI can never be sealed would wrongly turn away people the statute admits.",
          NV_REFERRAL
        );
      }

      const category = branch(
        trackId,
        "cvsOffenceCategory",
        need(trackId, answers, "cvsOffenceCategory"),
        NV_OFFENCE_CATEGORIES
      );
      const releaseDate = need(trackId, answers, "cvsReleaseDate");
      const suspendedSentence = str(answers, "cvsSuspendedSentence");
      const outstandingFees = yesNo(trackId, answers, "cvsOutstandingFees");
      const priorDenial = need(trackId, answers, "cvsPriorDenial");

      return {
        ...facts,
        cvsPendingCharges: "no",
        cvsDishonourableDischarge: "no",
        cvsDuiDetails: "",
        cvsOffenceCategory: category,
        cvsReleaseDate: releaseDate,
        cvsSuspendedSentence: suspendedSentence,
        cvsOutstandingFees: outstandingFees ? "yes" : "no",
        cvsPriorDenial: priorDenial,
        routeStatement:
          "This petition is brought under NRS 179.245 to seal the records of a conviction.",
        categoryStatement: `The petitioner states that the offence was ${category}, taken from the official record rather than from memory. This petition does not state which paragraph of NRS 179.245(1) applies, does not state whether the offence is a crime of violence, and computes no period. Those are legal classifications and they decide a one-year answer or a ten-year one.`,
        releaseStatement: `The petitioner states when they were released from custody and when they were discharged from parole or probation, as: ${releaseDate}`,
        suspendedSentenceStatement: suspendedSentence
          ? `The petitioner states that a suspended sentence was imposed, and when it ended, as: ${suspendedSentence}`
          : "The petitioner has not stated that a suspended sentence was imposed.",
        pendingChargeStatement:
          "The petitioner states that no charge is pending against them anywhere, and that they have not been convicted of any offence other than a minor moving or standing traffic violation during the period.",
        dishonourableStatement:
          "The petitioner states that they were not dishonourably discharged from probation.",
        outstandingFeesStatement: outstandingFees
          ? "The petitioner states that fines, jail fees, probation fees or house-arrest costs remain owing on this case. NRS 179.245 keys on release and discharge rather than on payment, so an unpaid balance is not a statutory bar. It is widely reported to stall a petition in practice, and the petitioner has been told to settle it or to be ready to explain it."
          : "The petitioner states that nothing remains owing on this case in fines, jail fees, probation fees or house-arrest costs.",
        priorDenialStatement: `The petitioner states whether a Nevada court has been asked to seal any record before, and when any denial was, as: ${priorDenial}`
      };
    }

    case "nv_seal_nonconviction": {
      const facts = commonFacts(trackId, answers, "ncv");
      const disposition = branch(
        trackId,
        "ncvDisposition",
        need(trackId, answers, "ncvDisposition"),
        NV_NONCONVICTION_DISPOSITIONS
      );
      const arrestDate = need(trackId, answers, "ncvArrestDate");

      const deferredJudgment = yesNo(trackId, answers, "ncvDeferredJudgment");
      if (deferredJudgment) {
        throw new NevadaEligibilityStopError(
          "nv-deferred-judgment-routes-to-176-211",
          trackId,
          "The case was dismissed because you completed a programme or a deferred judgment agreement. A participant describes that as a dismissal and it is not the dismissal NRS 179.255 is about: a deferred judgment dismissal runs under NRS 176.211 instead. Bringing it under NRS 179.255 asks the court for relief on the wrong section.",
          NV_ROUTING_REFERRAL
        );
      }

      const furtherAction = yesNo(trackId, answers, "ncvFurtherAction");
      if (furtherAction) {
        throw new NevadaEligibilityStopError(
          "nv-further-action-may-be-brought",
          trackId,
          "You have been told the case might be refiled. The court has to find there is no evidence that further action will be brought against you, and it cannot make that finding on this record. Wait, or ask a lawyer where the limitations period stands.",
          NV_REFERRAL
        );
      }

      return {
        ...facts,
        ncvDisposition: disposition,
        ncvArrestDate: arrestDate,
        ncvDeferredJudgment: "no",
        ncvFurtherAction: "no",
        routeStatement:
          "This petition is brought under NRS 179.255 to seal the records of a case that did not end in a conviction.",
        dispositionStatement: `The petitioner states that ${disposition}.`,
        arrestDateStatement: `The petitioner states the date of arrest as: ${arrestDate}`,
        timingStatement:
          disposition === NV_NONCONVICTION_DISPOSITIONS.dismissed
            ? "NRS 179.255(1)(a) permits a petition at any time after the dismissal. There is no waiting period on this ground, and none is asserted here. What the court must still find is that there is no evidence that further action will be brought, and that finding is the court's to make on the record in front of it."
            : disposition === NV_NONCONVICTION_DISPOSITIONS.acquitted
              ? "NRS 179.255(1)(c) permits a petition at any time after the acquittal. On an acquittal, and on a finding that there is no evidence that further action will be brought, NRS 179.255 provides that the court shall order the records sealed."
              : "NRS 179.255(1)(b) permits a petition at any time after the applicable statute of limitations has run, at any time eight years after the arrest, or pursuant to a stipulation between the parties. Which of those applies here is not stated in this petition; the date of arrest is set out above so that the court and the prosecuting agency can work from it.",
        declinationWarning:
          disposition === NV_NONCONVICTION_DISPOSITIONS.declined
            ? "That subsection reaches this petition directly, because this is the declination route. Sealing on this ground is not the end of the matter and the petitioner should know it before filing."
            : "That subsection reaches the declination route, and this petition is not brought on it. It is set out because a participant's account of how a case ended is not always the account the record carries."
      };
    }

    case "nv_seal_multi": {
      const facts = commonFacts(trackId, answers, "sea");
      const rawLevels = answers.mltCourtLevels;
      const levelValues = Array.isArray(rawLevels)
        ? rawLevels.map((entry) => String(entry))
        : need(trackId, answers, "mltCourtLevels").split(/[,;]+/);
      const levels = levelValues
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => branch(trackId, "mltCourtLevels", entry, NV_COURT_LEVELS));
      if (levels.length === 0) {
        throw new NevadaEligibilityStopError(
          "nv-no-court-level-given",
          trackId,
          "A consolidated petition has to say which Nevada courts the records sit in, and none was named.",
          NV_REFERRAL
        );
      }
      const unique = [...new Set(levels)];
      const hasMunicipal = unique.includes(NV_COURT_LEVELS.municipal);
      if (hasMunicipal && unique.length > 1) {
        throw new NevadaEligibilityStopError(
          "nv-municipal-and-non-municipal-in-one-packet",
          trackId,
          "This packet would mix municipal court records with justice or district court records. The stipulation has to come from the right prosecuting agency for each — the city attorney for the municipal matters and the district attorney for the rest — and the Clark County District Attorney will not stipulate to a petition that includes municipal court matters at all. Two prosecuting agencies means this is not one prepared packet.",
          NV_REFERRAL
        );
      }

      const township = str(answers, "mltTownship");
      if (unique.includes(NV_COURT_LEVELS.justice) && !township) {
        throw new NevadaEligibilityStopError(
          "nv-justice-court-township-not-given",
          trackId,
          "One of these records is in a justice court, and a justice court matter has to be captioned to the specific township. No township was given, and LegalEase will not guess one.",
          NV_REFERRAL
        );
      }

      return {
        ...facts,
        mltCourtLevels: unique.join(", "),
        mltTownship: township,
        routeStatement:
          "This petition is brought under NRS 179.2595, which permits a person seeking to seal more than one record to petition the district court for the county. The district court is the highest court in the county and may seal all the records within it.",
        courtLevelStatement: `The petitioner states that the records to be sealed sit in the following Nevada courts: ${unique.join(", ")}.`,
        townshipStatement: township
          ? `For the justice court matters, the petitioner gives the township as: ${township}`
          : "No justice court matter is included in this petition, so no township is named.",
        consolidationStatement:
          "Consolidation changes the venue and not the eligibility. Each record set out in this petition still has to satisfy the section it falls under — NRS 179.245 for a conviction, NRS 179.255 for a case that did not end in one — and this petition does not assert that any of them does."
      };
    }

    case "nv_seal_pardon": {
      const facts = commonFacts(trackId, answers, "sea");
      const pardonType = branch(
        trackId,
        "pdnPardonType",
        need(trackId, answers, "pdnPardonType"),
        NV_PARDON_TYPES
      );
      if (pardonType === NV_PARDON_TYPES.conditional) {
        throw new NevadaEligibilityStopError(
          "nv-conditional-pardon-outside-179-273",
          trackId,
          "Your pardon came with conditions. NRS 179.273 is titled for the sealing of records after an unconditional pardon, and a conditional pardon is outside it. Whether any other Nevada route reaches your record is a question for a lawyer, not for a prepared petition.",
          NV_REFERRAL
        );
      }

      const stillShowing = yesNo(trackId, answers, "pdnStillShowing");
      if (!stillShowing) {
        throw new NevadaEligibilityStopError(
          "nv-pardon-sealing-not-yet-verified",
          trackId,
          "You have not checked whether the record still shows on your Nevada criminal history. NRS 179.273 provides for automatic sealing after an unconditional pardon, so the record may already be sealed and there may be nothing to file. Check first. Preparing a petition for something that has already happened wastes your time and the court's.",
          NV_REPOSITORY_REFERRAL
        );
      }

      const pardonDate = need(trackId, answers, "pdnPardonDate");
      const firearms = str(answers, "pdnFirearms");

      return {
        ...facts,
        pdnPardonType: pardonType,
        pdnPardonDate: pardonDate,
        pdnStillShowing: "yes",
        pdnFirearms: firearms,
        routeStatement:
          "This petition is brought under NRS 179.273, which the Nevada Legislature's chapter index titles \"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\".",
        pardonStatement: `The petitioner states that they hold ${pardonType}, granted on: ${pardonDate}`,
        verificationStatement:
          "The petitioner states that they have checked their Nevada criminal history and that this record still shows. This petition is brought because the automatic sealing the section provides for appears not to have happened, and not in place of it.",
        firearmsStatement: firearms
          ? `The petitioner states what their pardon says about the right to bear arms, as: ${firearms} A pardon that does not restrict that right is the only route that restores firearm rights in Nevada. Sealing never does, and nothing in this petition asks for or produces that effect.`
          : "Nothing in this petition asks for or produces any effect on firearm rights. Sealing does not restore them in Nevada; only a pardon that does not restrict the right to bear arms does.",
      };
    }

    case "nv_seal_decrim": {
      const facts = commonFacts(trackId, answers, "sea");
      const conduct = need(trackId, answers, "dcrConduct");
      const offenceDate = need(trackId, answers, "dcrOffenceDate");

      return {
        ...facts,
        dcrConduct: conduct,
        dcrOffenceDate: offenceDate,
        routeStatement:
          "This written request is made under NRS 179.271, titled \"Sealing of records after decriminalization of offense\". It is drawn as a written request rather than as a petition.",
        conductStatement: `The petitioner states what they were accused of doing, and what they believe about whether that conduct is still a crime in Nevada, as: ${conduct}`,
        offenceDateStatement: `The petitioner states when the conduct is said to have happened and when the record was entered, as: ${offenceDate}`,
      };
    }

    case "nv_seal_reentry": {
      const facts = commonFacts(trackId, answers, "sea");
      const programme = need(trackId, answers, "rntProgram");
      const proof = yesNo(trackId, answers, "rntCompletionProof");
      if (!proof) {
        throw new NevadaEligibilityStopError(
          "nv-reentry-completion-not-evidenced",
          trackId,
          "You do not have the document showing that you completed the reentry programme. Completion is what NRS 179.259 turns on, and the court will want it evidenced. Get the completion document from the programme first; a petition that asserts completion without it puts the whole filing on your word alone.",
          NV_REFERRAL
        );
      }

      return {
        ...facts,
        rntProgram: programme,
        rntCompletionProof: "yes",
        routeStatement:
          "This petition is brought under NRS 179.259, \"Sealing records after completion of program for reentry\".",
        programmeStatement: `The petitioner states which reentry programme they completed, and when they finished it, as: ${programme}`,
        proofStatement:
          "The petitioner holds the document showing completion and will attach it.",
      };
    }

    default:
      throw new NevadaBranchError(trackId, "trackId", trackId, NV_ASSIGNED_TRACK_IDS);
  }
}

// ---------------------------------------------------------------------------
// Shared template language
// ---------------------------------------------------------------------------

type Section = {
  heading?: string;
  numbered: boolean;
  paragraphs: readonly string[];
};

const CAPTION_LEFT: readonly string[] = [
  "THE STATE OF NEVADA,",
  "",
  "Plaintiff,",
  "",
  "vs.",
  "",
  "THE PETITIONER NAMED BELOW,",
  "",
  "Defendant."
];

const CAPTION_RIGHT = (documentLine: string): readonly string[] => [
  "Case No. {{caseNumber}}",
  "",
  documentLine
];

/**
 * The court line on the routes where the participant's court level is bundled
 * into the county answer.
 *
 * A Nevada sealing petition goes to the court that heard the case, and that may
 * be a district, a justice or a municipal court. The design asks for the county
 * and the court level in one question, and a justice court petition must further
 * be captioned to the specific township. Rather than guess a court out of a
 * free-text answer, the caption carries the county and leaves the court to be
 * written in, with the instruction repeated in the filing's own directions.
 */
const COURT_LINE_TO_COMPLETE =
  "IN THE ____________________ COURT, {{countyName}} COUNTY, STATE OF NEVADA";

const REPOSITORY_SECTION: Section = {
  heading: "THE CRIMINAL HISTORY RECORD THIS FILING DEPENDS ON",
  numbered: false,
  paragraphs: [
    "A current verified criminal history from the Nevada Central Repository is a statutory attachment to this filing. NRS 179.245(2)(a) and NRS 179.255(3)(a) both require it.",
    "It is fingerprint-based and the petitioner obtains it themselves. LegalEase does not hold it, has not seen it and has not checked anything against it. Nothing in this filing is a statement about what the repository record says.",
    "Attach it before this goes anywhere. Without it there is no filing to make."
  ]
};

const PROSECUTOR_FIRST_SECTION: Section = {
  heading: "THE PROSECUTING AGENCY COMES FIRST",
  numbered: false,
  paragraphs: [
    "Nevada's own instructions put the prosecutor in the middle of this process rather than at the end. The petitioner prepares the filing, the declaration and the proposed order, delivers them to the district attorney or the city attorney together with the repository record and the attachments, and files with the clerk of the court only once the prosecuting agency stipulates.",
    "A stipulation is included in this packet for that purpose. It is blank. LegalEase has not asked the prosecuting agency for anything, holds nothing from it, and states nothing about what it will do. Where the agency stipulates, or does not object within thirty days, NRS 179.2445 permits the court to seal without a hearing. Where it refuses, this stops being a paperwork matter.",
    "Local practice is material and is not uniform. Ask the office that will receive this what it wants and in what order."
  ]
};

const EFFECT_SECTION: Section = {
  heading: "WHAT SEALING DOES, AND WHAT IT DOES NOT DO",
  numbered: false,
  paragraphs: [
    "Nevada calls this record sealing and does not call it expungement. The Department of Public Safety states directly that sealing is not expungement, because it does not authorise the destruction of the records.",
    "Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored. But NRS 179.295 allows a sealed record to be reopened, and NRS 179.301 allows certain persons and agencies to inspect one. A sealed record is not a destroyed record.",
    "A Nevada order binds no federal, tribal, military or out-of-state agency and does not reach records they hold.",
    "Sealing does not restore the right to bear arms. In Nevada only a pardon that does not restrict that right does. Nothing in this filing asks for that and nothing in it produces it.",
    "Nothing in this filing is a statement about immigration, and Nevada sealing is not represented here as having any immigration effect."
  ]
};

const COSTS_SECTION: Section = {
  heading: "COSTS",
  numbered: false,
  paragraphs: [
    "No monetary amount is stated anywhere in this filing, and that is deliberate: the fees are county-dependent and were not established when this packet was prepared.",
    "There is more than one of them. A court may charge a filing fee, the repository criminal history and the fingerprinting carry their own costs, and certified copies are charged for. Ask the clerk of the court that will receive this what it charges, and ask about a waiver if you cannot pay.",
    "NRS 179.245(9) waives every one of those fees for a victim of sex trafficking or involuntary servitude. It is not a separate route; it runs across the whole process, the fingerprinting and the criminal history and the certified copies included.",
    "{{traffickingStatement}}",
    "LegalEase does not collect, forward or handle any payment in this process."
  ]
};

/** The self-help boundaries the design records, printed on the face of the filing. */
function stopSection(extra: readonly string[]): Section {
  return {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the petitioner says. It does not give legal advice, does not check any record, and does not appear in court. Some parts of this matter are outside what a prepared packet can do, and they are named here rather than left to be discovered at the counter.",
      ...extra,
      "Whether an offence is a sexual offence within the eighteen-item list in NRS 179.245(10)(b), or a crime against a child under NRS 179D.0357. Both are legal classifications and this packet draws neither.",
      "The offence category, and whether the offence is a crime of violence. Those two together decide a one-year answer or a ten-year one, and this packet computes no period from either.",
      "Any refusal by the prosecuting agency to stipulate, which turns this into a contested hearing.",
      "Records in more than one Nevada county, which need their own petition in each county.",
      "Federal, tribal, military and out-of-state records, which a Nevada order does not reach.",
      "Firearm rights, which sealing does not restore.",
      "Any immigration consequence. Nothing in this packet is advice about immigration.",
      `Where any of these applies, speak to a lawyer before filing. ${NV_REFERRAL}`
    ]
  };
}

const PETITION_SIGNATURE_BLOCK: readonly string[] = [
  "Printed name: ______________________________",
  "Address: ___________________________________",
  "Telephone: _________________________________",
  "Email: _____________________________________",
  "Date: ______________________________________",
  "",
  "Sign this by hand, in ink. A typed signature is treated by the Las Vegas Municipal Court as cause for immediate denial, and every county reviewed wants a signed document. Notarization is county-dependent and was not established for your county: ask the clerk, and if the clerk wants it, sign in front of a notary rather than beforehand."
];

const VERIFICATION =
  "I am the petitioner. I have read this document and the statements in it are mine and are true to the best of my knowledge. I understand that no one at LegalEase has seen my records, decided whether I am eligible, obtained anything from the prosecuting agency, or given me legal advice, and that whether these records may be sealed is for the court to decide.";

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

type FilingSpec = {
  templateId: string;
  captionRightLine: string;
  /** Left blank on the routes where the participant writes the court in. */
  courtLine?: string;
  title: string;
  authorityLine: string;
  filingNoun: string;
  routeAllegations: readonly string[];
  extraSections: readonly Section[];
  extraStops: readonly string[];
  prayer: readonly string[];
};

function filingTemplate(spec: FilingSpec): PleadingTemplate {
  const courtLine = spec.courtLine ?? COURT_LINE_TO_COMPLETE;
  const completeTheCaption: Section = {
    heading: "COMPLETING THE CAPTION",
    numbered: false,
    paragraphs: spec.courtLine
      ? [
          "The caption on this filing names the district court for the county, which is the court NRS 179.2595 sends a consolidated petition to. Check it against what the clerk expects before you file."
        ]
      : [
          "The caption above has a blank where the court belongs. Write in the court that heard your case — district, justice or municipal — because a Nevada sealing petition goes to the court in which the case was heard and a filing that names the wrong one is refused at the counter.",
          "If it was a justice court, caption it to the specific township. Nevada practice requires it, and LegalEase does not hold your township.",
          "The petitioner's own answer about the county and the court is recited in the allegations above, so you have it in front of you when you fill this in."
        ]
  };

  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine,
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT(spec.captionRightLine)
    },
    title: spec.title,
    preamble: `Prepared by LegalEase from the answers the petitioner gave. LegalEase has not seen the petitioner's records, has not decided whether the petitioner is eligible, has obtained nothing from the prosecuting agency, does not file anything and does not appear. Every statement of fact in this ${spec.filingNoun} is the petitioner's own.`,
    sections: [
      {
        heading: "ALLEGATIONS",
        numbered: true,
        paragraphs: [
          "The petitioner gives their full legal name, and any other name they have used, as: {{fullLegalName}}",
          "The petitioner's date of birth is {{dateOfBirth}}.",
          "The petitioner gives the Nevada county and the court that handled the case as: {{county}}",
          spec.authorityLine,
          "The case number is {{caseNumber}}.",
          "The petitioner gives the offence as it was named, the NRS section cited and the date it happened, as: {{offenceDetails}}",
          "{{routeStatement}}",
          ...spec.routeAllegations
        ]
      },
      ...spec.extraSections,
      {
        heading: "EVERY OTHER NEVADA RECORD THE PETITIONER HAS STATED",
        numbered: false,
        paragraphs: [
          "Nevada practice is to seal a county's records as one package, so the petitioner's own account of every other Nevada arrest, charge or conviction is set out here. It is the petitioner's statement and no one has checked it against any record.",
          "{{allNevadaRecords}}"
        ]
      },
      REPOSITORY_SECTION,
      PROSECUTOR_FIRST_SECTION,
      EFFECT_SECTION,
      COSTS_SECTION,
      completeTheCaption,
      stopSection(spec.extraStops)
    ],
    prayer: [
      ...spec.prayer,
      "The petitioner makes no claim about what the court will decide, and none about what the prosecuting agency will do. This document asks; it does not predict."
    ],
    verification: VERIFICATION,
    signatureLabel: "Petitioner, self-represented",
    signatureBlock: PETITION_SIGNATURE_BLOCK
  };
}

type OrderSpec = {
  templateId: string;
  courtLine?: string;
  title: string;
  recital: string;
  orderedParagraphs: readonly string[];
  /** One blank approval line per prosecuting agency the design requires. */
  prosecutingAgencyLines: readonly string[];
};

/**
 * A proposed order.
 *
 * Written in the court's voice because that is what a proposed order is, and
 * marked on its face as not yet made. It carries no participant signature rule
 * — a petitioner does not sign an order — and every outside-party line on it,
 * the judge's and each prosecuting agency's, is blank and stays blank.
 */
function orderTemplate(spec: OrderSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: spec.courtLine ?? COURT_LINE_TO_COMPLETE,
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT("PROPOSED ORDER")
    },
    title: spec.title,
    preamble:
      "PROPOSED — NOT YET MADE. This document is prepared by the petitioner for the court's consideration. It is not an order of the court, it has no effect, and nothing written in it is a finding of the court unless and until a judge signs it.",
    sections: [
      {
        heading: "THE MATTER",
        numbered: false,
        paragraphs: [
          spec.recital,
          "The petitioner is {{fullLegalName}}, date of birth {{dateOfBirth}}.",
          "The case number is {{caseNumber}}. The petitioner gives the county and the court as: {{county}}"
        ]
      },
      {
        heading: "AGENCIES TO WHICH THIS ORDER WOULD APPLY",
        numbered: false,
        paragraphs: [
          "An order sealing a Nevada record has to name the agencies it reaches, because each of them acts on it separately and because NRS 179.275 requires the order to go to the Central Repository.",
          "— The Nevada Central Repository for Nevada Records of Criminal History. NRS 179.275.",
          "— The prosecuting agency named below.",
          "— The clerk of this court.",
          "— The law enforcement agency that made the arrest.",
          "Every other agency holding a record of this matter must be added on the blank lines. The petitioner is the only person who knows which ones exist — a detention centre, a city marshal, a probation office or a licensing body may each hold something — and the repository record will show more of them.",
          "— ______________________________________________",
          "— ______________________________________________",
          "— ______________________________________________"
        ]
      },
      {
        heading: "PROPOSED ORDER",
        numbered: true,
        paragraphs: [...spec.orderedParagraphs]
      },
      {
        heading: "APPROVAL OF THE PROSECUTING AGENCY",
        numbered: false,
        paragraphs: [
          "These lines are for the prosecuting agency. They are blank because LegalEase has obtained nothing from that agency and states nothing about what it will do. The petitioner does not complete them either.",
          ...spec.prosecutingAgencyLines
        ]
      },
      {
        heading: "WHAT THIS ORDER WOULD NOT DO",
        numbered: false,
        paragraphs: [
          "It would not destroy anything. Nevada seals records; the Department of Public Safety states that sealing is not expungement precisely because it does not authorise destruction.",
          "It would not put the record beyond reach for good. NRS 179.295 allows a sealed record to be reopened and NRS 179.301 allows named persons and agencies to inspect one.",
          "It would not bind a federal, tribal, military or out-of-state agency, or reach a record one of them holds.",
          "It would not restore the right to bear arms."
        ]
      },
      {
        heading: "BEFORE YOU LODGE THIS",
        numbered: false,
        paragraphs: [
          "Add every other agency you know of, and every one the repository record shows, to the blank lines above.",
          "Leave the judge's signature, the date and the prosecuting agency's lines blank. Do not sign this document and do not date it.",
          "It goes to the prosecuting agency with the filing and the declaration first, and to the clerk only after that agency has stipulated."
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [
      "_________________________________________",
      "District Judge / Justice of the Peace / Municipal Judge",
      "",
      "Date signed: ______________________________",
      "",
      "This block is the court's. Leave every line of it blank."
    ]
  };
}

type DeclarationSpec = {
  templateId: string;
  courtLine?: string;
  title: string;
  subject: string;
  attachments: readonly string[];
};

/**
 * The declaration and verification.
 *
 * The design records it as required in every county reviewed, and records that
 * the Las Vegas Municipal Court denies a filing carrying a typed signature. It
 * is the participant's own sworn account and contains nothing LegalEase asserts.
 */
function declarationTemplate(spec: DeclarationSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: spec.courtLine ?? COURT_LINE_TO_COMPLETE,
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT("DECLARATION AND VERIFICATION")
    },
    title: spec.title,
    preamble:
      "Prepared by LegalEase from the answers the petitioner gave, for the petitioner to read, correct and sign by hand. Every statement in it is the petitioner's own.",
    sections: [
      {
        heading: "DECLARATION",
        numbered: true,
        paragraphs: [
          "I am {{fullLegalName}}. My date of birth is {{dateOfBirth}}.",
          `I am the petitioner in this matter, and I make this declaration in support of ${spec.subject}.`,
          "The county and the court that handled my case are: {{county}}",
          "The case number is {{caseNumber}}.",
          "The offence as it was named, the NRS section cited and the date it happened are: {{offenceDetails}}",
          "Every other Nevada arrest, charge or conviction I have, in any county and any court, is listed in the schedule below. That list is mine, and I have not had it checked against any record.",
          "I have read the filing this declaration accompanies. Its statements of fact are mine and they are true to the best of my knowledge.",
          "I understand that no one at LegalEase has seen my records, decided whether I am eligible, obtained anything from the prosecuting agency, or given me legal advice."
        ]
      },
      {
        heading: "SCHEDULE OF EVERY OTHER NEVADA RECORD",
        numbered: false,
        paragraphs: [
          "{{allNevadaRecords}}",
          "A record in another county needs its own petition there and is not covered by this one."
        ]
      },
      {
        heading: "ATTACHMENTS",
        numbered: false,
        paragraphs: [
          "The following go with this declaration. It is not complete without them.",
          "— A current verified criminal history from the Nevada Central Repository. It is fingerprint-based and I obtain it myself. NRS 179.245(2)(a) and NRS 179.255(3)(a).",
          ...spec.attachments,
          "— ______________________________________________",
          "— ______________________________________________"
        ]
      },
      {
        heading: "HOW TO SIGN THIS",
        numbered: false,
        paragraphs: [
          "Sign it by hand, in ink. A typed signature is treated by the Las Vegas Municipal Court as cause for immediate denial, and every county reviewed wants a signed declaration.",
          "Whether it must also be notarized is county-dependent and was not established for your county. Ask the clerk. If the clerk wants a notarized signature, sign in front of the notary and not beforehand.",
          "Sign this separately from the filing it accompanies. They are two documents and each carries its own signature and date."
        ]
      }
    ],
    prayer: [],
    verification:
      "I declare under penalty of perjury under the law of the State of Nevada that the foregoing is true and correct.",
    signatureLabel: "Petitioner, self-represented",
    signatureBlock: [
      "Printed name: ______________________________",
      "Date: ______________________________________",
      "",
      "Signed at ____________________, Nevada.",
      "",
      "If the clerk requires notarization, the notarial certificate is added by the notary. Nothing here is a notarial act and no notarial block is printed, because none was established as required for your county."
    ]
  };
}

type StipulationSpec = {
  templateId: string;
  courtLine?: string;
  title: string;
  subject: string;
  agencyBlocks: readonly string[];
};

/**
 * The stipulation the participant carries to the prosecuting agency.
 *
 * This is the component with the most obvious way to go wrong, and the rule is
 * simple: **LegalEase does not obtain prosecutor consent and does not write a
 * word of it.** The document exists so the participant has something to hand
 * over. Every line the agency would complete is blank, the participant is told
 * not to complete them either, and the document says on its face that no
 * agreement has been sought or given.
 */
function stipulationTemplate(spec: StipulationSpec): PleadingTemplate {
  return {
    templateId: spec.templateId,
    version: VERSION,
    technicalFixture: true,
    fixtureBanner: BANNER,
    caption: {
      courtLine: spec.courtLine ?? COURT_LINE_TO_COMPLETE,
      partyBlockLeft: CAPTION_LEFT,
      partyBlockRight: CAPTION_RIGHT("STIPULATION")
    },
    title: spec.title,
    preamble:
      "UNEXECUTED — NO AGREEMENT HAS BEEN SOUGHT OR GIVEN. This document is prepared for the prosecuting agency to consider and, if that agency chooses, to sign. LegalEase has not contacted the prosecuting agency, holds nothing from it, and makes no statement about what it will do. Until an authorised representative of that agency signs below, nothing in this document is anyone's agreement.",
    sections: [
      {
        heading: "WHAT THIS DOCUMENT IS FOR",
        numbered: false,
        paragraphs: [
          `The petitioner delivers this to the district attorney or the city attorney, together with ${spec.subject}, the declaration and verification, the proposed order and the criminal history record from the Nevada Central Repository.`,
          "Nevada's own instructions direct the petitioner to file with the clerk of the court only after the prosecuting agency stipulates. Where that agency stipulates, or does not object within thirty days, NRS 179.2445 permits the court to seal without a hearing.",
          "Where the agency will not stipulate, the matter becomes a contested one and it is not one a prepared packet can carry. Speak to a lawyer at that point.",
          "The petitioner does not complete any part of this document. It is the agency's to sign or to decline."
        ]
      },
      {
        heading: "THE MATTER",
        numbered: false,
        paragraphs: [
          "Petitioner: {{fullLegalName}}, date of birth {{dateOfBirth}}.",
          "Case number: {{caseNumber}}.",
          "County and court, as the petitioner gives them: {{county}}",
          "Offence, section and date, as the petitioner gives them: {{offenceDetails}}",
          "Do not sign this, do not date it, and do not tick anything on it."
        ]
      },
      {
        heading: "STIPULATION, IF THE AGENCY SO CHOOSES",
        numbered: false,
        paragraphs: [
          "The undersigned, for the prosecuting agency identified below, states the agency's position on the petition in this matter.",
          "___  The agency stipulates to the sealing of the records described in the petition.",
          "___  The agency does not stipulate.",
          "___  The agency takes no position.",
          "Nothing above is marked. It is marked, if at all, by the agency."
        ]
      },
      {
        heading: "SIGNATURE OF THE PROSECUTING AGENCY",
        numbered: false,
        paragraphs: [
          "These lines belong to the prosecuting agency. They are blank, and the petitioner leaves them blank.",
          ...spec.agencyBlocks
        ]
      }
    ],
    prayer: [],
    signatureLabel: null,
    signatureBlock: [
      "This document carries no signature of the petitioner. It is not the petitioner's statement and the petitioner does not sign it.",
      "",
      "If the prosecuting agency signs it, take the signed original to the clerk with the petition, the declaration and the proposed order."
    ]
  };
}

/** One blank execution block for a prosecuting agency. */
function agencyBlock(label: string): readonly string[] {
  return [
    "_________________________________________",
    label,
    "",
    "Printed name: ______________________________",
    "Bar number: ________________________________",
    "Date: ______________________________________"
  ];
}

// ---------------------------------------------------------------------------
// NRS 179.245 — conviction
// ---------------------------------------------------------------------------

const CONVICTION_FILING = filingTemplate({
  templateId: "nv_seal_conviction-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS OF A CONVICTION UNDER NRS 179.245",
  authorityLine: "NRS 179.245(1) puts venue in the court in which the person was convicted.",
  filingNoun: "petition",
  routeAllegations: [
    "{{categoryStatement}}",
    "{{releaseStatement}}",
    "{{suspendedSentenceStatement}}",
    "{{pendingChargeStatement}}",
    "{{dishonourableStatement}}",
    "{{outstandingFeesStatement}}",
    "{{priorDenialStatement}}"
  ],
  extraSections: [
    {
      heading: "WHAT THIS PETITION DOES NOT DECIDE",
      numbered: false,
      paragraphs: [
        "NRS 179.245(1) sets different periods for different classes of offence, and the trigger differs by paragraph: paragraphs (a) to (d) run from release from actual custody or discharge from parole or probation, whichever is later, while paragraphs (e) to (g) run from release from actual custody or the end of a suspended sentence, whichever is later.",
        "This petition states the petitioner's category and dates and stops there. It does not say which paragraph applies, does not compute a period, and does not say that any period has run. Whether the offence is a crime of violence, which changes the answer, is a legal classification and is not drawn here either.",
        "NRS 179.2445 creates a rebuttable presumption in favour of sealing where an applicant satisfies the statutory requirements, except for a defendant dishonourably discharged from probation under NRS 176A.850. This petition describes that presumption; it does not assert that the petitioner satisfies the requirements it depends on.",
        "Nor does it decide whether NRS 179.245(6) reaches this offence. That subsection excludes a crime against a child, a sexual offence within its own eighteen-item list, and several named driving and vessel offences, and matching an offence to that list is a legal classification.",
        "What this petition does is set out the petitioner's own account and the dates it turns on, so that the prosecuting agency and the court can apply the section to them."
      ]
    }
  ],
  extraStops: [
    "Any denial of an earlier Nevada sealing petition. NRS 179.265 bars a rehearing for a period after a denial, and this packet does not work out where that period stands."
  ],
  prayer: [
    "WHEREFORE the petitioner asks the court to order the records relating to the conviction described above sealed under NRS 179.245, and to direct that the order be transmitted to the Nevada Central Repository under NRS 179.275 and served on every agency named in it."
  ]
});

const CONVICTION_ORDER = orderTemplate({
  templateId: "nv_seal_conviction-order",
  title: "ORDER SEALING RECORDS UNDER NRS 179.245 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the court on the petitioner's petition to seal the records of a conviction under NRS 179.245, with the criminal history record from the Nevada Central Repository attached.",
  orderedParagraphs: [
    "IT IS ORDERED that all records relating to the conviction described in the petition are sealed under NRS 179.245.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that a copy of this order be transmitted to the Nevada Central Repository for Nevada Records of Criminal History under NRS 179.275.",
    "IT IS FURTHER ORDERED that the clerk of this court seal the court file in this matter."
  ],
  prosecutingAgencyLines: agencyBlock("For the prosecuting agency")
});

const CONVICTION_DECLARATION = declarationTemplate({
  templateId: "nv_seal_conviction-declaration",
  title: "DECLARATION AND VERIFICATION IN SUPPORT OF A PETITION TO SEAL RECORDS (NRS 179.245)",
  subject: "the petition to seal the records of my conviction under NRS 179.245",
  attachments: [
    "— A copy of the judgment of conviction, and of the discharge from parole or probation or the record of release from custody, which are what the dates in my petition come from.",
    "— The proposed order, unsigned."
  ]
});

const CONVICTION_STIPULATION = stipulationTemplate({
  templateId: "nv_seal_conviction-stipulation",
  title: "STIPULATION OF THE PROSECUTING AGENCY (NRS 179.245) — UNEXECUTED",
  subject: "the petition to seal the records of the conviction",
  agencyBlocks: agencyBlock("For the district attorney or the city attorney")
});

// ---------------------------------------------------------------------------
// NRS 179.255 — no conviction
// ---------------------------------------------------------------------------

const NONCONVICTION_FILING = filingTemplate({
  templateId: "nv_seal_nonconviction-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS OF A CASE THAT DID NOT END IN A CONVICTION UNDER NRS 179.255",
  authorityLine:
    "NRS 179.255 puts venue in the court in which the charges were dismissed, the court having jurisdiction in which prosecution was declined, or the court in which the acquittal was entered.",
  filingNoun: "petition",
  routeAllegations: [
    "{{dispositionStatement}}",
    "{{arrestDateStatement}}",
    "NRS 179.255(3)(b) requires this petition to state the disposition of the proceedings, and the disposition is stated above in the words the petitioner gave.",
    "The petitioner states that the case was not dismissed on completion of a programme or a deferred judgment agreement, and that no one has told them the case might be refiled."
  ],
  extraSections: [
    {
      heading: "TIMING, AND WHAT THIS PETITION DOES NOT DECIDE",
      numbered: false,
      paragraphs: [
        "{{timingStatement}}",
        "The exclusions in NRS 179.245(6) govern the sealing of convictions and do not govern this section. An arrest for an offence that could never be sealed as a conviction is still within NRS 179.255 where the case was dismissed or ended in an acquittal, and this petition does not import that list.",
        "NRS 179.255(9) provides that where prosecution was declined and the records were sealed, the prosecuting agency may still file charges before the limitations period expires, and that the court must then order the records inspected without any petition.",
        "{{declinationWarning}}",
        "Whichever of the three it was, the disposition stated in this petition is the petitioner's account of it and the court record is what governs."
      ]
    }
  ],
  extraStops: [
    "Where prosecution was declined, any question about the statute of limitations, or about when the eight years from arrest run out. This packet does not work either of those out.",
    "Any uncertainty about whether the case was dismissed outright or on a deferred judgment. Those are different sections and a participant describes both as a dismissal."
  ],
  prayer: [
    "WHEREFORE the petitioner asks the court to find that there is no evidence that further action will be brought against the petitioner in this matter, to order the records relating to it sealed under NRS 179.255, and to direct that the order be transmitted to the Nevada Central Repository under NRS 179.275 and served on every agency named in it."
  ]
});

const NONCONVICTION_ORDER = orderTemplate({
  templateId: "nv_seal_nonconviction-order",
  title: "ORDER SEALING RECORDS UNDER NRS 179.255 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the court on the petitioner's petition to seal the records of a case that did not end in a conviction, brought under NRS 179.255, with the criminal history record from the Nevada Central Repository attached.",
  orderedParagraphs: [
    "IT IS ORDERED that all records relating to the arrest, the charge and the disposition described in the petition are sealed under NRS 179.255.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that a copy of this order be transmitted to the Nevada Central Repository for Nevada Records of Criminal History under NRS 179.275, and that notice be given as NRS 179.255(4) provides.",
    "IT IS FURTHER ORDERED that the clerk of this court seal the court file in this matter."
  ],
  prosecutingAgencyLines: agencyBlock("For the prosecuting agency")
});

const NONCONVICTION_DECLARATION = declarationTemplate({
  templateId: "nv_seal_nonconviction-declaration",
  title:
    "DECLARATION AND VERIFICATION IN SUPPORT OF A PETITION TO SEAL RECORDS (NRS 179.255)",
  subject: "the petition to seal the records of a case that did not end in a conviction",
  attachments: [
    "— The court record showing how the case ended — the order of dismissal, the record of the declination, or the judgment of acquittal.",
    "— The proposed order, unsigned."
  ]
});

const NONCONVICTION_STIPULATION = stipulationTemplate({
  templateId: "nv_seal_nonconviction-stipulation",
  title: "STIPULATION OF THE PROSECUTING AGENCY (NRS 179.255) — UNEXECUTED",
  subject: "the petition to seal the records of a case that did not end in a conviction",
  agencyBlocks: agencyBlock("For the district attorney or the city attorney")
});

// ---------------------------------------------------------------------------
// NRS 179.2595 — more than one record, consolidated in district court
// ---------------------------------------------------------------------------

const DISTRICT_COURT_LINE =
  "IN THE DISTRICT COURT OF {{countyName}} COUNTY, STATE OF NEVADA";

const MULTI_FILING = filingTemplate({
  templateId: "nv_seal_multi-petition",
  captionRightLine: "CONSOLIDATED PETITION TO SEAL RECORDS",
  courtLine: DISTRICT_COURT_LINE,
  title: "CONSOLIDATED PETITION TO SEAL MORE THAN ONE RECORD UNDER NRS 179.2595",
  authorityLine:
    "NRS 179.2595 puts a consolidated petition in the district court for the county, which may seal all the records within it.",
  filingNoun: "petition",
  routeAllegations: [
    "{{courtLevelStatement}}",
    "{{townshipStatement}}",
    "Each record is described in the declaration that accompanies this petition."
  ],
  extraSections: [
    {
      heading: "CONSOLIDATION CHANGES THE VENUE, NOT THE ELIGIBILITY",
      numbered: false,
      paragraphs: [
        "{{consolidationStatement}}",
        "The records to be sealed are the ones set out in the schedule in this petition and in the declaration that accompanies it. Each is described there in the petitioner's own words."
      ]
    }
  ],
  extraStops: [
    "Any packet that mixes municipal court matters with justice or district court matters. The stipulation has to come from the right prosecuting agency for each, and the Clark County District Attorney will not stipulate to a petition that includes municipal court matters at all.",
    "Whether a particular district court will accept a consolidated petition covering municipal court records. The practice is documented in detail only for Clark County."
  ],
  prayer: [
    "WHEREFORE the petitioner asks the district court to order the records described in this petition and in the declaration sealed, each under the section that governs it, and to direct that the order be transmitted to the Nevada Central Repository under NRS 179.275 and served on every agency named in it."
  ]
});

const MULTI_ORDER = orderTemplate({
  templateId: "nv_seal_multi-order",
  courtLine: DISTRICT_COURT_LINE,
  title: "ORDER SEALING RECORDS UNDER NRS 179.2595 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the district court on the petitioner's consolidated petition under NRS 179.2595 to seal more than one record within this county, with the criminal history record from the Nevada Central Repository attached.",
  orderedParagraphs: [
    "IT IS ORDERED that the records described in the petition and in the declaration are sealed, each under the section that governs it.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of these matters that it holds.",
    "IT IS FURTHER ORDERED that a copy of this order be transmitted to the Nevada Central Repository for Nevada Records of Criminal History under NRS 179.275.",
    "IT IS FURTHER ORDERED that the clerk of this court, and the clerk of every other court in this county holding a record described in the petition, seal the court file in that matter."
  ],
  // The design records that a packet reaching more than one prosecuting agency
  // needs a separate signature line for each. Both are blank.
  prosecutingAgencyLines: [
    ...agencyBlock("For the district attorney"),
    "",
    ...agencyBlock("For the city attorney, where a municipal court record is included")
  ]
});

const MULTI_DECLARATION = declarationTemplate({
  templateId: "nv_seal_multi-declaration",
  courtLine: DISTRICT_COURT_LINE,
  title: "DECLARATION AND VERIFICATION IN SUPPORT OF A CONSOLIDATED PETITION (NRS 179.2595)",
  subject: "the consolidated petition to seal more than one of my Nevada records",
  attachments: [
    "— The court record for each matter listed in the schedule, showing how it ended.",
    "— The proposed order, unsigned."
  ]
});

const MULTI_STIPULATION = stipulationTemplate({
  templateId: "nv_seal_multi-stipulation",
  courtLine: DISTRICT_COURT_LINE,
  title: "STIPULATION OF THE PROSECUTING AGENCY (NRS 179.2595) — UNEXECUTED",
  subject: "the consolidated petition",
  agencyBlocks: [
    ...agencyBlock("For the district attorney"),
    "",
    ...agencyBlock("For the city attorney, where a municipal court record is included")
  ]
});

// ---------------------------------------------------------------------------
// NRS 179.273 — after an unconditional pardon
// ---------------------------------------------------------------------------

const PARDON_FILING = filingTemplate({
  templateId: "nv_seal_pardon-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS AFTER AN UNCONDITIONAL PARDON UNDER NRS 179.273",
  authorityLine: "The petition on this route goes to the court in which the conviction was entered.",
  filingNoun: "petition",
  routeAllegations: ["{{pardonStatement}}", "{{verificationStatement}}", "{{firearmsStatement}}"],
  extraSections: [
    {
      heading: "WHY A PETITION AT ALL",
      numbered: false,
      paragraphs: [
        "The Nevada Legislature's chapter index titles NRS 179.273 \"Sealing of records after unconditional pardon: Automatic sealing; petition; no fee\". The title is what this petition proceeds on: sealing after such a pardon happens of itself, and a petition without a fee is available where it has not.",
        "The section's text was not retrievable when this packet was prepared. This petition therefore does not state how the automatic sealing is triggered, how it is carried out, or what the section requires of a petition. It states that the petitioner holds an unconditional pardon, that the record still shows, and asks the court to apply the section.",
        "The section's own title records that the petition carries no fee. This petition states no amount for anything, and the petitioner should say at the counter that NRS 179.273 provides for a petition without a fee."
      ]
    }
  ],
  extraStops: [
    "Applying for a pardon in the first place. That is a matter for the Board of Pardons Commissioners under NRS chapter 213 and this packet does not prepare an application to it.",
    "Any question about whether a pardon is unconditional. What the pardon says decides the route, and reading it is not something a prepared packet does."
  ],
  prayer: [
    "WHEREFORE the petitioner asks the court to order the records relating to the pardoned conviction sealed under NRS 179.273, and to direct that the order be transmitted to the Nevada Central Repository under NRS 179.275 and served on every agency named in it."
  ]
});

const PARDON_ORDER = orderTemplate({
  templateId: "nv_seal_pardon-order",
  title: "ORDER SEALING RECORDS UNDER NRS 179.273 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the court on the petitioner's petition under NRS 179.273 to seal the records of a conviction for which an unconditional pardon has been granted, with the criminal history record from the Nevada Central Repository attached.",
  orderedParagraphs: [
    "IT IS ORDERED that all records relating to the pardoned conviction described in the petition are sealed under NRS 179.273.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that a copy of this order be transmitted to the Nevada Central Repository for Nevada Records of Criminal History under NRS 179.275.",
    "IT IS FURTHER ORDERED that the clerk of this court seal the court file in this matter."
  ],
  prosecutingAgencyLines: agencyBlock("For the prosecuting agency")
});

const PARDON_DECLARATION = declarationTemplate({
  templateId: "nv_seal_pardon-declaration",
  title: "DECLARATION AND VERIFICATION IN SUPPORT OF A PETITION TO SEAL RECORDS (NRS 179.273)",
  subject: "the petition to seal the records of my pardoned conviction under NRS 179.273",
  attachments: [
    "— The pardon itself, as granted.",
    "— The proposed order, unsigned."
  ]
});

const PARDON_STIPULATION = stipulationTemplate({
  templateId: "nv_seal_pardon-stipulation",
  title: "STIPULATION OF THE PROSECUTING AGENCY (NRS 179.273) — UNEXECUTED",
  subject: "the petition to seal the records of the pardoned conviction",
  agencyBlocks: agencyBlock("For the district attorney or the city attorney")
});

// ---------------------------------------------------------------------------
// NRS 179.271 — after decriminalization
// ---------------------------------------------------------------------------

const DECRIM_FILING = filingTemplate({
  templateId: "nv_seal_decrim-request",
  captionRightLine: "WRITTEN REQUEST TO SEAL RECORDS",
  title: "WRITTEN REQUEST TO SEAL RECORDS AFTER DECRIMINALIZATION UNDER NRS 179.271",
  authorityLine: "The request on this route goes to the court in which the record was entered.",
  filingNoun: "request",
  routeAllegations: ["{{conductStatement}}", "{{offenceDateStatement}}"],
  extraSections: [
    {
      heading: "WHETHER THE CONDUCT HAS BEEN DECRIMINALIZED IS NOT DECIDED HERE",
      numbered: false,
      paragraphs: [
        "Whether that conduct has in fact been decriminalised is a legal conclusion and this request does not draw it. The text of NRS 179.271 was not retrievable when this packet was prepared, so this request states neither what the section requires nor that its requirements are met. It sets out the petitioner's account and asks the court to apply the section.",
        "Partial decriminalization is the trap on this route. Where some variants of conduct remain criminal and others do not, which side of the line a particular record falls on is exactly the question this request does not answer."
      ]
    }
  ],
  extraStops: [
    "Whether the conduct underlying this record has actually been decriminalized. That is a legal conclusion and this packet does not draw it.",
    "Any partially decriminalized conduct, where some variants of it remain a crime in Nevada."
  ],
  prayer: [
    "WHEREFORE the petitioner asks the court to seal the records described above under NRS 179.271, and to direct that the order be transmitted to the Nevada Central Repository under NRS 179.275 and served on every agency named in it."
  ]
});

const DECRIM_ORDER = orderTemplate({
  templateId: "nv_seal_decrim-order",
  title: "ORDER SEALING RECORDS UNDER NRS 179.271 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the court on the petitioner's written request under NRS 179.271 to seal the records of conduct said to be no longer a crime in Nevada, with the criminal history record from the Nevada Central Repository attached.",
  orderedParagraphs: [
    "IT IS ORDERED that the records described in the request are sealed under NRS 179.271.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that a copy of this order be transmitted to the Nevada Central Repository for Nevada Records of Criminal History under NRS 179.275.",
    "IT IS FURTHER ORDERED that the clerk of this court seal the court file in this matter."
  ],
  prosecutingAgencyLines: agencyBlock("For the prosecuting agency")
});

const DECRIM_DECLARATION = declarationTemplate({
  templateId: "nv_seal_decrim-declaration",
  title: "DECLARATION AND VERIFICATION IN SUPPORT OF A WRITTEN REQUEST (NRS 179.271)",
  subject: "the written request to seal my records under NRS 179.271",
  attachments: [
    "— The court record showing what I was accused of and how the matter ended.",
    "— The proposed order, unsigned."
  ]
});

const DECRIM_STIPULATION = stipulationTemplate({
  templateId: "nv_seal_decrim-stipulation",
  title: "STIPULATION OF THE PROSECUTING AGENCY (NRS 179.271) — UNEXECUTED",
  subject: "the written request to seal the records",
  agencyBlocks: agencyBlock("For the district attorney or the city attorney")
});

// ---------------------------------------------------------------------------
// NRS 179.259 — after a program for reentry
// ---------------------------------------------------------------------------

const REENTRY_FILING = filingTemplate({
  templateId: "nv_seal_reentry-petition",
  captionRightLine: "PETITION TO SEAL RECORDS",
  title: "PETITION TO SEAL RECORDS AFTER COMPLETION OF A PROGRAM FOR REENTRY UNDER NRS 179.259",
  authorityLine: "The petition on this route goes to the court in which the conviction was entered.",
  filingNoun: "petition",
  routeAllegations: ["{{programmeStatement}}", "{{proofStatement}}"],
  extraSections: [
    {
      heading: "WHAT THIS PETITION DOES NOT STATE",
      numbered: false,
      paragraphs: [
        "The text of NRS 179.259 was not retrievable when this packet was prepared. This petition therefore does not state which programmes the section reaches, what completion means for its purposes, or whether any period applies. It sets out the petitioner's account and asks the court to apply the section.",
        "In particular, this petition does not say how NRS 179.259 interacts with the categories and the exclusions in NRS 179.245. Whether it stands apart from them or alongside them is a question the section's own text would answer, and it was not read."
      ]
    }
  ],
  extraStops: [
    "Whether a particular programme is a programme for reentry within NRS 179.259.",
    "Whether a programme was completed successfully, where the programme's own record does not say so plainly."
  ],
  prayer: [
    "WHEREFORE the petitioner asks the court to order the records described above sealed under NRS 179.259, and to direct that the order be transmitted to the Nevada Central Repository under NRS 179.275 and served on every agency named in it."
  ]
});

const REENTRY_ORDER = orderTemplate({
  templateId: "nv_seal_reentry-order",
  title: "ORDER SEALING RECORDS UNDER NRS 179.259 (PROPOSED — NOT YET MADE)",
  recital:
    "This matter comes before the court on the petitioner's petition under NRS 179.259 to seal records following completion of a program for reentry, with the criminal history record from the Nevada Central Repository attached.",
  orderedParagraphs: [
    "IT IS ORDERED that the records described in the petition are sealed under NRS 179.259.",
    "IT IS FURTHER ORDERED that each agency named above seal the records of this matter that it holds.",
    "IT IS FURTHER ORDERED that a copy of this order be transmitted to the Nevada Central Repository for Nevada Records of Criminal History under NRS 179.275.",
    "IT IS FURTHER ORDERED that the clerk of this court seal the court file in this matter."
  ],
  prosecutingAgencyLines: agencyBlock("For the prosecuting agency")
});

const REENTRY_DECLARATION = declarationTemplate({
  templateId: "nv_seal_reentry-declaration",
  title: "DECLARATION AND VERIFICATION IN SUPPORT OF A PETITION TO SEAL RECORDS (NRS 179.259)",
  subject: "the petition to seal my records after completing a program for reentry",
  attachments: [
    "— The document from the programme showing that I completed it.",
    "— The proposed order, unsigned."
  ]
});

const REENTRY_STIPULATION = stipulationTemplate({
  templateId: "nv_seal_reentry-stipulation",
  title: "STIPULATION OF THE PROSECUTING AGENCY (NRS 179.259) — UNEXECUTED",
  subject: "the petition to seal the records after completion of a program for reentry",
  agencyBlocks: agencyBlock("For the district attorney or the city attorney")
});

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Expansion templates: NRS 176A treatment-programme sealing (subsection 2) and
// NRS 179A.160 repository removal
// ---------------------------------------------------------------------------

/** Every filing on the programme route says which branch it is on before anything else. */
const PROBATION_BRANCH_SECTION = {
  heading: "WHICH BRANCH OF THE SECTION THIS PETITION IS ON",
  numbered: false,
  paragraphs: [
    "NRS 176A.245, NRS 176A.265 and NRS 176A.295 each carry two mechanisms. Under subsection 1 the court orders the sealing itself, after the discharge or the dismissal, without a hearing, unless the Division of Parole and Probation petitions for good cause not to seal. Nothing is filed by the defendant on that branch and no petition is needed.",
    "This petition is on subsection 2, which is the only branch on which a defendant files. It opens where the charge was a violation of NRS 200.485, NRS 484C.110 or NRS 484C.120, the charges were conditionally dismissed or the judgment of conviction was set aside, and not sooner than seven years after that disposition.",
    "{{prbBranchStatement}}"
  ]
};

/** What each section takes out, on the face of the filing. */
const PROBATION_EXCLUSION_SECTION = {
  heading: "WHAT SUBSECTION 3 TAKES OUT",
  numbered: false,
  paragraphs: [
    "Subsection 3 of each of NRS 176A.245, NRS 176A.265 and NRS 176A.295 provides that the court may not order sealing under the section where the defendant was charged with a violation of NRS 200.508, abuse, neglect or endangerment of a child, or NRS 200.5099, abuse, neglect, exploitation, isolation or abandonment of an older or vulnerable person.",
    "The petitioner states that the charge in this matter was neither. That is the petitioner's own statement from the record, not a determination by anybody."
  ]
};

const PROBATION_FILING: PleadingTemplate = {
  templateId: "nv_seal_probation_family-petition",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{prbCourtLine}}, STATE OF NEVADA",
    partyBlockLeft: ["THE STATE OF NEVADA,", "", "vs.", "", "______________________,", "", "Defendant."],
    partyBlockRight: ["Case No. ______________", "", "Dept. No. ______________", "", "PETITION TO SEAL RECORDS"]
  },
  title:
    "PETITION TO SEAL RECORDS AFTER A CONDITIONAL DISMISSAL OR SET-ASIDE — NRS 176A.245, NRS 176A.265 OR NRS 176A.295, SUBSECTION 2",
  preamble:
    "The petitioner, appearing without a lawyer, petitions this Court under subsection 2 of the section named below to seal the records of this case, and states as follows. LegalEase prepared this petition from the petitioner's own answers, has seen no court record and no Division file, has decided nothing, represents nobody and has filed nothing.",
  sections: [
    {
      heading: "COMPLETE THESE LINES BEFORE FILING",
      numbered: false,
      paragraphs: [
        "The design for this route asks nothing about who you are, so this packet holds no name, no date of birth and no case number. Write them in by hand, on every document here, before you file.",
        "Petitioner's full legal name: __________________________________________",
        "Date of birth: ________________________________________________________",
        "Case number, from the court record: ___________________________________",
        "The agencies and officers to be named in the order: ___________________",
        "______________________________________________________________________"
      ]
    },
    PROBATION_BRANCH_SECTION,
    {
      heading: "I.  THE PETITIONER, THE COURT AND THE PROGRAMME",
      numbered: true,
      paragraphs: [
        "The petitioner is the person named in the caption above, whose name, date of birth and case number are written in by hand.",
        "This petition concerns that case in the {{prbCourtName}}, Nevada.",
        "{{prbProgramStatement}}",
        "{{prbOffenceStatement}}"
      ]
    },
    {
      heading: "II.  THE DISPOSITION AND THE SEVEN YEARS",
      numbered: true,
      paragraphs: [
        "{{prbDispositionStatement}}",
        "Subsection 2 permits this petition not sooner than seven years after that disposition. The petitioner states the date above and does not state that the seven years have run; the computation is for the Court.",
        "{{prbFulfilmentStatement}}"
      ]
    },
    PROBATION_EXCLUSION_SECTION,
    {
      heading: "III.  WHAT THIS PETITION DOES NOT SAY",
      numbered: false,
      paragraphs: [
        "It does not say that the petitioner is entitled to the sealing. The findings are the Court's and this petition asks the Court to make them.",
        "It does not say that the Division of Parole and Probation agrees, or that it will not petition for good cause not to seal. LegalEase has obtained nothing from the Division and states nothing about what it will do.",
        "It does not say that any period has run, and it computes none.",
        "Nevada seals records: sealing is not expungement, because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind a federal, tribal, military or out-of-state agency and does not reach records they hold, and sealing does not restore the right to bear arms.",
        "Nobody at LegalEase has read the court file, the programme record or the Division's file in this matter."
      ]
    },
    {
      heading: "WHERE THIS PACKET STOPS",
      numbered: false,
      paragraphs: [
        "LegalEase prepares documents from what the petitioner says. It gives no legal advice, reads no record, decides no eligibility question and files nothing.",
        "Any charge of abuse, neglect or endangerment of a child under NRS 200.508, or abuse, neglect, exploitation, isolation or abandonment of an older or vulnerable person under NRS 200.5099, which subsection 3 bars.",
        "The Division petitioning the court for good cause not to seal, or requesting a hearing.",
        "Any dispute about whether the terms and conditions imposed by the court and the Division were fulfilled.",
        "A programme that was not completed, where a sentence was imposed rather than a discharge or a dismissal.",
        "Any dishonourable discharge from probation under NRS 176A.850, which NRS 179.2445(2) makes relevant to what a later ordinary petition can expect.",
        "Records in more than one county or in more than one court, federal, tribal, military and out-of-state records, and any question about firearm rights or immigration, none of which this packet addresses.",
        "Where any of these applies, speak to a lawyer before filing. {{prbReferralLine}}"
      ]
    }
  ],
  prayer: [
    "WHEREFORE, the petitioner asks the Court to order sealed all documents, papers and exhibits in the petitioner's record, minute book entries and entries on dockets, and other documents relating to this case in the custody of such other agencies and officers as are named in the Court's order.",
    "Nothing in this petition reports a decision by anyone. It asks."
  ],
  verification: VERIFICATION,
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: PETITION_SIGNATURE_BLOCK
};

const PROBATION_ORDER: PleadingTemplate = {
  templateId: "nv_seal_probation_family-order",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{prbCourtLine}}, STATE OF NEVADA",
    partyBlockLeft: ["THE STATE OF NEVADA,", "", "vs.", "", "______________________,", "", "Defendant."],
    partyBlockRight: ["Case No. ______________", "", "Dept. No. ______________", "", "ORDER SEALING RECORDS"]
  },
  title: "PROPOSED ORDER SEALING RECORDS — NRS 176A.245, NRS 176A.265 OR NRS 176A.295, SUBSECTION 2",
  preamble:
    "This is a proposed order, tendered for the Court's consideration with the petition it accompanies. Every finding, date and signature below is left blank for the Court. It has been granted by nobody and signed by nobody.",
  sections: [
    {
      numbered: false,
      paragraphs: [
        "THIS MATTER came before the Court on the petition of the defendant named in the caption, under subsection 2 of {{prbSectionCitation}}, to seal the records of this case.",
        "The Court, having considered the petition, FINDS:",
        "(  ) that the charges were conditionally dismissed or the judgment of conviction set aside as the petition states;",
        "(  ) that seven years have elapsed since that disposition; and",
        "(  ) that the petitioner fulfilled the terms and conditions imposed by the Court and by the Division of Parole and Probation.",
        "",
        "IT IS HEREBY ORDERED that all documents, papers and exhibits in the petitioner's record, minute book entries and entries on dockets, and other documents relating to this case in the custody of the agencies and officers named below, be sealed.",
        "The agencies and officers named in this order are:",
        "______________________________________________________________________",
        "______________________________________________________________________",
        "______________________________________________________________________",
        "Subsection 1 and subsection 2 both reach records in the custody of such other agencies and officers AS ARE NAMED IN THE COURT'S ORDER, so an agency left off this list keeps its record. The list is completed by the petitioner from the record and settled by the Court.",
        "IT IS FURTHER ORDERED that a copy of this order be sent to each agency and officer named in it, each of which shall notify the Court in writing of its compliance, as subsection 4 of the section requires."
      ]
    }
  ],
  prayer: [],
  signatureLabel: null,
  signatureBlock: [
    "",
    "_____________________________________",
    "DISTRICT / JUSTICE / MUNICIPAL COURT JUDGE",
    "",
    "Dated: ______________________",
    "",
    "The findings, the date and the signature above are the Court's. They are printed blank, and LegalEase has made no finding and signed nothing."
  ]
};

const PROBATION_DECLARATION: PleadingTemplate = {
  templateId: "nv_seal_probation_family-declaration",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "IN THE {{prbCourtLine}}, STATE OF NEVADA",
    partyBlockLeft: ["THE STATE OF NEVADA,", "", "vs.", "", "______________________,", "", "Defendant."],
    partyBlockRight: ["Case No. ______________", "", "Dept. No. ______________", "", "DECLARATION"]
  },
  title: "DECLARATION OF THE PETITIONER IN SUPPORT OF THE PETITION TO SEAL",
  preamble:
    "The sections reached by this petition prescribe no sworn verification. This declaration is the ordinary support for facts that do not appear of record: NRS 53.045 permits a declaration under penalty of perjury in place of an oath, and that is what the block at the end of this document is. It is UNSIGNED as generated.",
  sections: [
    {
      heading: "COMPLETE THESE LINES BEFORE FILING",
      numbered: false,
      paragraphs: [
        "The design for this route asks nothing about who you are, so this packet holds no name, no date of birth and no case number. Write them in by hand, on every document here, before you file.",
        "Petitioner's full legal name: __________________________________________",
        "Date of birth: ________________________________________________________",
        "Case number, from the court record: ___________________________________",
        "The agencies and officers to be named in the order: ___________________",
        "______________________________________________________________________"
      ]
    },
    {
      heading: "THE PETITIONER DECLARES",
      numbered: true,
      paragraphs: [
        "The petitioner is the defendant named in the caption above, whose name, date of birth and case number are written in by hand.",
        "{{prbProgramStatement}}",
        "{{prbDispositionStatement}}",
        "{{prbFulfilmentStatement}}",
        "{{prbDischargeStatement}}",
        "The petitioner makes no statement about whether the Division of Parole and Probation will petition the Court for good cause not to seal, and none about what the Court will find."
      ]
    },
    {
      heading: "HOW TO COMPLETE THIS DECLARATION",
      numbered: false,
      paragraphs: [
        "Read every statement above against the court record and the programme paperwork, and correct anything that does not match before signing.",
        "Sign and date it by hand. The block at the end is a declaration under penalty of perjury under NRS 53.045, which is signed rather than sworn: nothing here is sworn before a notary, because the sections prescribe no oath. If the clerk of the court asks for a notarized verification instead, ask what form that court wants."
      ]
    }
  ],
  prayer: [],
  // Subsection 2 of each section prescribes no verification, so this is the
  // unsworn declaration NRS 53.045 allows in place of one, and not an oath
  // taken before anybody.
  verification:
    "I declare under penalty of perjury under the law of the State of Nevada that the foregoing is true and correct. I am the petitioner, the statements above are mine, and I understand that no one at LegalEase has seen my court record or the Division's file, decided whether these records may be sealed, or spoken to any agency about this case.",
  signatureLabel: "Petitioner, self-represented",
  signatureBlock: PETITION_SIGNATURE_BLOCK
};

/** Both repository documents are the same application, addressed twice. */
const REPOSITORY_SECTIONS = [
  {
    heading: "WHAT THIS APPLICATION IS",
    numbered: false,
    paragraphs: [
      "NRS 179A.160(1) provides that where a person has been arrested or issued a citation, or has been the subject of a warrant for alleged criminal conduct, and is acquitted or the disposition of the charge is favourable to the person, that person may apply IN WRITING to the Central Repository and to the agency which maintains the record to have it removed from the files which are available and generally searched for the purpose of responding to inquiries concerning the criminal history of a person.",
      "This is that written application. It is not a court filing, no order issues on it, there is no hearing, no waiting period and no fee prescribed by the section.",
      "NRS 179A.160(2) provides that the Central Repository and the agency SHALL remove the record unless one of five stated conditions applies. Those five are addressed below so that the office can act on the face of this application.",
      "Removal is not sealing, and sealing is not expungement: neither authorises destruction of the record. This removes the record from the files that are available and generally searched, and it does not seal the court record, which is a separate court petition."
    ]
  },
  {
    heading: "I.  THE APPLICANT AND THE RECORD",
    numbered: true,
    paragraphs: [
      "The applicant is the person who signs below, whose full legal name and date of birth are written in by hand at the head of this application.",
      "{{rpoFormerNamesStatement}}",
      "{{rpoArrestStatement}}",
      "{{rpoDispositionStatement}}",
      "{{rpoRepositoryStatement}}"
    ]
  },
  {
    heading: "II.  THE FIVE CONDITIONS IN SUBSECTION 2",
    numbered: true,
    paragraphs: [
      "NRS 179A.160(2) requires removal unless the applicant is a fugitive; the case is under active prosecution according to a current certificate of a prosecuting attorney; the disposition was a deferred prosecution, plea bargain or other similar disposition; the applicant has a prior conviction for a felony or gross misdemeanour in any jurisdiction in the United States; or the applicant has been arrested for or charged with another crime, other than a minor traffic violation, since the arrest, citation or warrant sought to be removed.",
      "The applicant states that they are not a fugitive.",
      "The applicant states that the case is not under active prosecution.",
      "The applicant states that the disposition was not a deferred prosecution, a plea bargain or any similar disposition.",
      "The applicant states that they have no prior conviction for a felony or a gross misdemeanour in any jurisdiction in the United States.",
      "The applicant states that they have not been arrested for or charged with another crime, other than a minor traffic violation, since the arrest, citation or warrant described above.",
      "Each of those is the applicant's own statement from their own records. None of them is a determination by anybody, and this application asks the office to check its own files."
    ]
  },
  {
    heading: "III.  WHAT THIS APPLICATION DOES NOT SAY",
    numbered: false,
    paragraphs: [
      "It does not say that the office holds the record, or that it has failed in any duty.",
      "It does not say that the disposition was favourable as a matter of law. That is the threshold question the section turns on and the office decides it.",
      "It does not ask for the court record to be sealed. NRS 179A.160(3) preserves a court's separate authority, and a court sealing is a different application on a different track.",
      "It says nothing about firearm rights, which removal does not restore, and nothing about immigration.",
      "Nobody at LegalEase has read the applicant's criminal history or any agency file in this matter."
    ]
  },
  {
    heading: "WHERE THIS PACKET STOPS",
    numbered: false,
    paragraphs: [
      "LegalEase prepares documents from what the applicant says. It gives no legal advice, reads no record, decides no eligibility question and sends nothing.",
      "A deferred prosecution, plea bargain or similar disposition, which subsection 2(c) excludes and which is the condition that most often defeats this route.",
      "Any prior felony or gross-misdemeanour conviction anywhere in the United States, and any arrest or charge since the one sought to be removed other than a minor traffic violation.",
      "An active prosecution, or a fugitive status.",
      "Any argument about whether the disposition was favourable to the applicant.",
      "A refusal by the Central Repository or the agency, which the section provides no appeal from.",
      "Records held by more than one agency, and federal, tribal, military and out-of-state records, which a Nevada application does not reach.",
      "Where any of these applies, speak to a lawyer before sending anything. {{rpoReferralLine}}"
    ]
  }
];

const REPOSITORY_APPLICATION_SIGNATURE: readonly string[] = [
  "Printed name: ______________________________________",
  "Date: ______________________________________________",
  "",
  "Sign and date this by hand before sending it. Send it so that receipt can be evidenced and keep a copy.",
  "Write the office's current postal address into the block above from your own look-up; none is printed here.",
  "NRS 179A.160 prescribes no verification and no notarization for this application. Do not have it notarized unless the office you are sending it to asks for that; if it does, ask that office what form it wants."
];

const REPOSITORY_APPLICATION: PleadingTemplate = {
  templateId: "nv_repository_removal-application-repository",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "WRITTEN APPLICATION UNDER NRS 179A.160(1) — THIS IS NOT A COURT FILING",
    partyBlockLeft: ["TO:", "", "The Central Repository for", "Nevada Records of", "Criminal History"],
    partyBlockRight: ["NRS 179A.160(1)", "", "Copy 1 of 2", "", "Written application"]
  },
  title: "APPLICATION TO REMOVE A RECORD OF CRIMINAL HISTORY — NRS 179A.160",
  preamble:
    "Prepared by LegalEase from the applicant's own answers, for the applicant to sign and send. This copy is addressed to the Central Repository. A second copy, addressed to the agency which maintains the record, is in this packet and must also be sent.",
  sections: [
    {
      heading: "COMPLETE THESE LINES BEFORE SENDING",
      numbered: false,
      paragraphs: [
        "Applicant's full legal name: __________________________________________",
        "Applicant's date of birth: ____________________________________________",
        "Applicant's return address: ___________________________________________",
        "______________________________________________________________________",
        "Office's current postal address: _______________________________________",
        "______________________________________________________________________",
        "Date sent: ____________________________________________________________"
      ]
    },
    ...REPOSITORY_SECTIONS
  ],
  prayer: [
    "The applicant asks that the record described above be removed from the files which are available and generally searched for the purpose of responding to inquiries concerning the criminal history of a person, as NRS 179A.160 provides.",
    "This application reports no decision by anybody. It asks."
  ],
  verification:
    "The applicant states that the facts set out above are true and correct to the best of the applicant's knowledge and belief. NRS 179A.160 prescribes no verification and no notarization for this application; if the office you send it to asks for one, ask that office what form it wants before you sign.",
  signatureLabel: "The applicant, in their own name",
  signatureBlock: REPOSITORY_APPLICATION_SIGNATURE
};

const REPOSITORY_AGENCY_COPY: PleadingTemplate = {
  templateId: "nv_repository_removal-application-agency",
  version: VERSION,
  technicalFixture: true,
  fixtureBanner: BANNER,
  caption: {
    courtLine: "WRITTEN APPLICATION UNDER NRS 179A.160(1) — THIS IS NOT A COURT FILING",
    partyBlockLeft: ["TO:", "", "The agency which", "maintains the record", "{{rpoAgencyShortName}}"],
    partyBlockRight: ["NRS 179A.160(1)", "", "Copy 2 of 2", "", "Written application"]
  },
  title: "APPLICATION TO REMOVE A RECORD OF CRIMINAL HISTORY — NRS 179A.160",
  preamble:
    "This is the same application, addressed to the agency which maintains the record. NRS 179A.160(1) directs the application to the Central Repository AND to that agency, and subsection 2 puts the removal duty on both. A copy sent to the Repository alone leaves the arresting agency's own record untouched. Send both.",
  sections: [
    {
      heading: "COMPLETE THESE LINES BEFORE SENDING",
      numbered: false,
      paragraphs: [
        "Applicant's full legal name: __________________________________________",
        "Applicant's date of birth: ____________________________________________",
        "Applicant's return address: ___________________________________________",
        "______________________________________________________________________",
        "Agency's current postal address: ______________________________________",
        "______________________________________________________________________",
        "Date sent: ____________________________________________________________"
      ]
    },
    ...REPOSITORY_SECTIONS
  ],
  prayer: [
    "The applicant asks that the record described above be removed from the files which are available and generally searched for the purpose of responding to inquiries concerning the criminal history of a person, as NRS 179A.160 provides.",
    "This application reports no decision by anybody. It asks."
  ],
  verification:
    "The applicant states that the facts set out above are true and correct to the best of the applicant's knowledge and belief. NRS 179A.160 prescribes no verification and no notarization for this application; if the office you send it to asks for one, ask that office what form it wants before you sign.",
  signatureLabel: "The applicant, in their own name",
  signatureBlock: REPOSITORY_APPLICATION_SIGNATURE
};

function buildTemplates(): Record<string, PleadingTemplate> {
  const templates: Record<string, PleadingTemplate> = {};
  const all = [
    CONVICTION_FILING,
    CONVICTION_ORDER,
    CONVICTION_DECLARATION,
    CONVICTION_STIPULATION,
    NONCONVICTION_FILING,
    NONCONVICTION_ORDER,
    NONCONVICTION_DECLARATION,
    NONCONVICTION_STIPULATION,
    MULTI_FILING,
    MULTI_ORDER,
    MULTI_DECLARATION,
    MULTI_STIPULATION,
    PARDON_FILING,
    PARDON_ORDER,
    PARDON_DECLARATION,
    PARDON_STIPULATION,
    DECRIM_FILING,
    DECRIM_ORDER,
    DECRIM_DECLARATION,
    DECRIM_STIPULATION,
    REENTRY_FILING,
    REENTRY_ORDER,
    REENTRY_DECLARATION,
    REENTRY_STIPULATION,
    PROBATION_FILING,
    PROBATION_ORDER,
    PROBATION_DECLARATION,
    REPOSITORY_APPLICATION,
    REPOSITORY_AGENCY_COPY
  ];
  for (const template of all) templates[template.templateId] = template;
  return templates;
}

export const NEVADA_PLEADING_TEMPLATES: Readonly<Record<string, PleadingTemplate>> =
  buildTemplates();

// ---------------------------------------------------------------------------
// Packet sets and tracks
// ---------------------------------------------------------------------------

const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

/**
 * Design role → engine role.
 *
 * Two of Nevada's four component roles exist in `PacketComponentRole` already.
 * The other two do not, and extending that enum would change
 * `src/lib/rcap/packets/types.ts`, which this job does not own, so they are
 * mapped onto the existing values and the mapping is stated here rather than
 * left implicit. The **componentId is pinned exactly as the design assigns
 * it** — that is what carries assignment fidelity.
 *
 *   primary_filing              → primary_filing
 *   proposed_order              → proposed_order
 *   declaration_and_verification → affidavit    (a sworn statement of the
 *                                   petitioner's own facts, executed
 *                                   separately from the filing it supports)
 *   stipulation                 → notice        (a document the participant
 *                                   delivers to an outside office — the
 *                                   district attorney or the city attorney —
 *                                   rather than one they file or execute;
 *                                   `attachment` would describe a passive
 *                                   accompaniment and this is not one)
 */
export const NV_DESIGN_ROLE_TO_ENGINE_ROLE: Readonly<
  Record<string, PacketSet["components"][number]["role"]>
> = {
  primary_filing: "primary_filing",
  proposed_order: "proposed_order",
  declaration_and_verification: "affidavit",
  stipulation: "notice",
  /**
   * The second copy of the NRS 179A.160(1) application, addressed to the agency
   * which maintains the record. It is not a `notice`, which this module uses for
   * a document an outside office executes: the applicant signs this one too, at
   * the same time as the first copy. `continuation` is the engine's role for a
   * document signed with the primary filing, which is exactly what it is.
   */
  duplicate_submission_copy: "continuation"
};

type ComponentSpec = {
  componentId: string;
  designRole: keyof typeof NV_DESIGN_ROLE_TO_ENGINE_ROLE;
  templateId: string;
  order: number;
  requirement: "required" | "conditional";
  /**
   * The fact that decides whether a conditional component renders.
   *
   * The six original routes have exactly one conditional component and one
   * condition, so the stipulation key was the only one needed. The
   * treatment-programme route's three custom-pleading components are all
   * conditional on a different thing — the subsection 2 branch — so the key is
   * now per component and defaults to the stipulation's for the routes that
   * were built before it existed.
   */
  conditionKey?: string;
};

/**
 * The fact that decides whether the stipulation renders.
 *
 * The design marks the stipulation conditional — "where the county uses the
 * stipulation route, which is the ordinary practice" — and declares no
 * participant input for county practice. So the fact is set on every route,
 * which produces the ordinary case, and every filing tells the participant to
 * ask the office that will receive the packet what it wants. Wiring a real
 * county-practice input is a change to the design, not to this job, and this is
 * the single place a captain would attach one.
 */
export const NV_STIPULATION_CONDITION_KEY = "stipulationRouteApplies";

/**
 * The fact that decides whether the treatment-programme petition renders.
 *
 * NRS 176A.245, NRS 176A.265 and NRS 176A.295 each carry two mechanisms.
 * Subsection 1 is automatic and the participant files nothing at all: the court
 * orders the sealing itself, without a hearing, unless the Division petitions
 * for good cause not to. Subsection 2 is the only branch on which a defendant
 * files, and it opens only where the charge was a violation of NRS 200.485,
 * NRS 484C.110 or NRS 484C.120, the charges were conditionally dismissed or the
 * judgment set aside, and seven years have passed. So all three custom-pleading
 * components on that route are conditional on this one fact, and a participant
 * on the automatic branch receives no filing from this lane — which is the
 * correct outcome, not a gap.
 */
export const NV_SUBSECTION_TWO_CONDITION_KEY = "subsectionTwoPetitionApplies";

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  for (const spec of specs) {
    if (!NEVADA_PLEADING_TEMPLATES[spec.templateId]) {
      throw new Error(`${spec.componentId}: no Nevada template ${spec.templateId} is registered.`);
    }
  }
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: NV_DESIGN_ROLE_TO_ENGINE_ROLE[spec.designRole],
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: spec.requirement,
      ...(spec.requirement === "conditional"
        ? { conditionKey: spec.conditionKey ?? NV_STIPULATION_CONDITION_KEY }
        : {}),
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/** The seven questions the design asks on every Nevada route. */
function commonInputs(prefix: string): readonly RequiredInput[] {
  return [
    {
      key: `${prefix}FullLegalName`,
      label: "What is your full legal name, and have you used any other names?",
      required: true
    },
    { key: `${prefix}DateOfBirth`, label: "What is your date of birth?", required: true },
    {
      key: `${prefix}County`,
      label:
        "In which Nevada county did the case happen, and which court handled it — district, justice or municipal? The court level decides the venue, and the stipulation practice differs between district attorneys and city attorneys.",
      required: true
    },
    { key: `${prefix}CaseNumber`, label: "What is the case number?", required: true },
    {
      key: `${prefix}OffenceDetails`,
      label: "What was the offence called, which NRS section was cited, and on what date did it happen?",
      required: true
    },
    {
      key: `${prefix}AllNevadaRecords`,
      label:
        "What other Nevada arrests, charges or convictions do you have, in any county and any court? Nevada practice is to seal a county's records as one package.",
      required: true
    },
    {
      key: `${prefix}Trafficking`,
      label:
        "Were you a victim of sex trafficking or involuntary servitude in connection with this record? Answer yes or no. NRS 179.245(9) waives every fee in the process for such a person, and a separate route under NRS 179.247 may fit better than sealing.",
      required: false
    }
  ];
}

function nevadaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  packetSet: PacketSet;
  requiredInputs: readonly RequiredInput[];
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
    jurisdiction: "NV",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: input.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: input.requiredInputs,
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

const NV_TAIL =
  "The packet goes to the district attorney or the city attorney first, with the Central Repository criminal history record attached, and to the court clerk only once that agency stipulates. The stipulation in the packet is unexecuted: LegalEase has obtained nothing from the prosecuting agency and states nothing about what it will do. Nevada seals records and does not expunge them, no period is computed, and no fee amount is stated.";

function nevadaComponents(trackId: string): readonly ComponentSpec[] {
  const stem = trackId === "nv_seal_decrim" ? "request" : "petition";
  return [
    {
      componentId: `${trackId}-primary-filing-2`,
      designRole: "primary_filing",
      templateId: `${trackId}-${stem}`,
      order: 2,
      requirement: "required"
    },
    {
      componentId: `${trackId}-proposed-order-3`,
      designRole: "proposed_order",
      templateId: `${trackId}-order`,
      order: 3,
      requirement: "required"
    },
    {
      componentId: `${trackId}-declaration-and-verification-4`,
      designRole: "declaration_and_verification",
      templateId: `${trackId}-declaration`,
      order: 4,
      requirement: "required"
    },
    {
      componentId: `${trackId}-stipulation-5`,
      designRole: "stipulation",
      templateId: `${trackId}-stipulation`,
      order: 5,
      requirement: "conditional"
    }
  ];
}

/**
 * The expansion's component specs.
 *
 * The order numbers are the design's, gaps included: the treatment-programme
 * route's positions 1, 2, 3, 7 and 8 are process_guidance and belong to another
 * lane, and the repository route's positions 3 to 6 likewise. Renumbering to
 * close the gaps would bind the assembled packet out of the design's order once
 * the guidance lane fills them.
 */
function probationFamilyComponents(): readonly ComponentSpec[] {
  return [
    {
      componentId: "nv_seal_probation_family-primary-filing-4",
      designRole: "primary_filing",
      templateId: "nv_seal_probation_family-petition",
      order: 4,
      requirement: "conditional",
      conditionKey: NV_SUBSECTION_TWO_CONDITION_KEY
    },
    {
      componentId: "nv_seal_probation_family-proposed-order-5",
      designRole: "proposed_order",
      templateId: "nv_seal_probation_family-order",
      order: 5,
      requirement: "conditional",
      conditionKey: NV_SUBSECTION_TWO_CONDITION_KEY
    },
    {
      componentId: "nv_seal_probation_family-declaration-and-verification-6",
      designRole: "declaration_and_verification",
      templateId: "nv_seal_probation_family-declaration",
      order: 6,
      requirement: "conditional",
      conditionKey: NV_SUBSECTION_TWO_CONDITION_KEY
    }
  ];
}

function repositoryRemovalComponents(): readonly ComponentSpec[] {
  return [
    {
      componentId: "nv_repository_removal-primary-filing-1",
      designRole: "primary_filing",
      templateId: "nv_repository_removal-application-repository",
      order: 1,
      requirement: "required"
    },
    {
      componentId: "nv_repository_removal-duplicate-submission-copy-2",
      designRole: "duplicate_submission_copy",
      templateId: "nv_repository_removal-application-agency",
      order: 2,
      requirement: "required"
    }
  ];
}

export const NEVADA_CUSTOM_PLEADING_TRACKS: readonly ReliefTrack[] = [
  nevadaTrack({
    trackId: "nv_seal_probation_family",
    publicName: "Clearing a Nevada case after a court treatment programme, a conditional dismissal or a set-aside",
    mechanism: "seal_after_treatment_programme_discharge_conditional_dismissal_or_set_aside",
    authority: "NRS 176A.245, NRS 176A.265 and NRS 176A.295",
    recordTypes: ["conviction", "arrest", "charge", "court_record"],
    dispositions: ["dismissed", "convicted", "set_aside"],
    courtLevel: "the_justice_municipal_or_district_court_that_handled_the_case",
    packetSet: packetSet("nv_seal_probation_family", probationFamilyComponents()),
    requiredInputs: [
      {
        key: "prbProgramSection",
        label:
          "Was your case handled through a court treatment programme — for alcohol or other substance use, for mental illness or an intellectual disability, or for veterans and members of the military? Answer substance use, mental health, veterans, or unsure.",
        required: true
      },
      {
        key: "prbOutcome",
        label:
          "How did it end — discharged from probation, the case dismissed, conditionally dismissed, the judgment set aside, or sentenced? Only a conditional dismissal or a set-aside reaches the petition branch.",
        required: true
      },
      {
        key: "prbChargeType",
        label:
          "Was the charge battery constituting domestic violence, or driving or being in actual physical control of a vehicle under the influence? Answer domestic battery, DUI, other, or unsure. This decides which of the section's two mechanisms applies.",
        required: true
      },
      {
        key: "prbDispositionDate",
        label:
          "On what date were the charges conditionally dismissed or the judgment of conviction set aside? Asked on the petition branch only, because subsection 2 runs seven years from that date.",
        required: false
      },
      {
        key: "prbDischargeType",
        label:
          "If you were discharged from probation, was the discharge honourable or dishonourable? Answer honourable, dishonourable, not applicable, or unsure. NRS 179.2445(2) turns on it.",
        required: true
      },
      {
        key: "prbExcludedCharge",
        label:
          "Was the charge one of abuse, neglect or endangerment of a child, or abuse, neglect, exploitation, isolation or abandonment of an older or vulnerable person? Answer yes or no. Subsection 3 bars sealing in either case.",
        required: true
      },
      {
        key: "prbCourt",
        label:
          "Which court handled the case, and in which county? Was it a district, justice or municipal court?",
        required: true
      }
    ],
    assembledPacketName: "nv-treatment-programme-sealing",
    assembledPacketTitle:
      "Nevada sealing after a treatment-programme conditional dismissal or set-aside — NRS 176A.245, 176A.265 and 176A.295",
    customerDeliverableDescription:
      "A petition, a proposed order and an unsigned declaration for the subsection 2 branch of NRS 176A.245, NRS 176A.265 or NRS 176A.295 — the only branch on which a defendant files. On the subsection 1 branch the court orders the sealing itself and this lane produces nothing, which the packet says in terms. Every component is conditional on the branch, the seven-year period is recited from the participant's own date without asserting that it has run, the subsection 3 bar is stated on the face of the filing, and the order leaves the list of agencies and officers to be named blank because subsection 1 and subsection 2 both reach only records in the custody of those the order names.",
    notes:
      "The three sections are structurally identical and differ only in the programme they attach to, which is why the design groups them and why the petition names the one the case ran under. A dishonourable discharge under NRS 176A.850 stops the route: NRS 179.2445(2) removes the rebuttable presumption for such a defendant. Nevada seals and never expunges, no period is computed, and no fee amount is stated because none of the three sections prescribes one."
  }),
  nevadaTrack({
    trackId: "nv_repository_removal",
    publicName: "Getting a Nevada arrest off the state repository after a favourable outcome",
    mechanism: "remove_record_from_central_repository_after_favourable_disposition",
    authority: "NRS 179A.160",
    recordTypes: ["conviction", "arrest", "charge", "court_record"],
    dispositions: ["dismissed", "convicted", "set_aside"],
    courtLevel: "not_a_court_filing_the_central_repository_and_the_agency_receive_a_written_application",
    packetSet: packetSet("nv_repository_removal", repositoryRemovalComponents()),
    requiredInputs: [
      {
        key: "rpoDisposition",
        label:
          "How did the case end? Answer acquitted, dismissed, favourable other, or unsure. NRS 179A.160(1) opens on an acquittal or a disposition favourable to you.",
        required: true
      },
      {
        key: "rpoDispositionFinalDate",
        label: "On what date did that outcome become final?",
        required: true
      },
      {
        key: "rpoArrestIdentity",
        label:
          "Which agency arrested you, cited you or sought the warrant, on what date, and what case or event number does the record carry?",
        required: true
      },
      {
        key: "rpoRepositoryShows",
        label:
          "Does the arrest still show on your Nevada criminal history from the repository? Answer yes or no. Get your own record before answering.",
        required: true
      },
      {
        key: "rpoDeferredOrPlea",
        label:
          "Was the case resolved through a deferred prosecution, a plea bargain, or any similar arrangement, rather than being dismissed outright? Answer yes or no. NRS 179A.160(2)(c) excludes it.",
        required: true
      },
      {
        key: "rpoPriorFelonyOrGrossMisdemeanor",
        label:
          "Have you ever been convicted of a felony or a gross misdemeanour anywhere in the United States? Answer yes or no. The exclusion is nationwide, not Nevada-only.",
        required: true
      },
      {
        key: "rpoSubsequentArrest",
        label:
          "Since the arrest, citation or warrant you want removed, have you been arrested for or charged with any other crime, apart from a minor traffic violation? Answer yes or no.",
        required: true
      },
      {
        key: "rpoFormerNames",
        label: "What other names have you used, including any former legal names?",
        required: false
      }
    ],
    assembledPacketName: "nv-repository-removal-application",
    assembledPacketTitle: "Nevada Central Repository removal application — NRS 179A.160",
    customerDeliverableDescription:
      "The written application NRS 179A.160(1) requires, in two copies: one addressed to the Central Repository for Nevada Records of Criminal History and one to the agency which maintains the record, because the subsection directs the application to both and subsection 2 puts the removal duty on both. Nothing is filed in a court, no order issues, there is no waiting period and the section prescribes no fee. Each of the five subsection 2 conditions is addressed as the applicant's own statement so the office can act on the face of the application, and the packet says in terms that removal is not sealing and does not reach the court record.",
    notes:
      "A single copy sent to the Repository alone leaves the arresting agency's own record untouched, which is the failure this route exists to prevent. The deferred-prosecution and plea-bargain exclusion in subsection 2(c) is the condition that most often defeats the route in practice and stops it here; so do a nationwide prior felony or gross misdemeanour, a subsequent arrest or charge, and a record the repository does not show."
  }),
  nevadaTrack({
    trackId: "nv_seal_conviction",
    publicName: "Seal your Nevada conviction",
    mechanism: "seal_conviction",
    authority: "NRS 179.245",
    recordTypes: ["conviction", "arrest", "charge", "court_record"],
    dispositions: ["convicted"],
    courtLevel: "court_in_which_the_person_was_convicted",
    packetSet: packetSet("nv_seal_conviction", nevadaComponents("nv_seal_conviction")),
    requiredInputs: [
      ...commonInputs("cvs"),
      {
        key: "cvsPendingCharges",
        label:
          "Is any charge pending against you now, anywhere? Answer yes or no. NRS 179.245(5) requires the court to find that none was pending during the period.",
        required: true
      },
      {
        key: "cvsOffenceCategory",
        label:
          "What category was the offence — category A, B, C, D or E felony, gross misdemeanour, or misdemeanour? Take it from the official record rather than from memory; it drives a one-year answer or a ten-year one.",
        required: true
      },
      {
        key: "cvsReleaseDate",
        label:
          "When were you released from custody, and when were you discharged from parole or probation? NRS 179.245(1)(a) to (d) run from the later of the two.",
        required: true
      },
      {
        key: "cvsSuspendedSentence",
        label:
          "Were you given a suspended sentence, and if so when did it end? NRS 179.245(1)(e) to (g) run from release from actual custody or the end of a suspended sentence, whichever is later.",
        required: false
      },
      {
        key: "cvsDuiDetails",
        label:
          "If this was a DUI, which subsection were you punished under, and did you take part in the statewide sobriety and drug monitoring programme? NRS 179.245(7) preserves eligibility in cases a blanket rule would wrongly reject.",
        required: false
      },
      {
        key: "cvsOutstandingFees",
        label:
          "Do you still owe any fines, jail fees, probation fees or house arrest costs on this case? Answer yes or no. This is a practical prerequisite rather than a statutory one.",
        required: true
      },
      {
        key: "cvsDishonourableDischarge",
        label:
          "Were you dishonourably discharged from probation? Answer yes or no. NRS 179.2445 withholds the rebuttable presumption from a defendant dishonourably discharged under NRS 176A.850.",
        required: true
      },
      {
        key: "cvsPriorDenial",
        label:
          "Have you asked a Nevada court to seal any record before, and was it denied? If so, when? NRS 179.265 bars a rehearing for a period after a denial.",
        required: true
      }
    ],
    assembledPacketName: "nv-seal-conviction",
    assembledPacketTitle: "Nevada record sealing packet — conviction",
    customerDeliverableDescription: `Petition to seal the records of a conviction under NRS 179.245, with a declaration and verification, a proposed order and an unexecuted stipulation for the prosecuting agency. ${NV_TAIL}`,
    notes:
      "The offence category is recited from the official record and no period is computed from it. A DUI, a dishonourable discharge from probation and a pending charge each stop the route rather than being screened out by a rule."
  }),

  nevadaTrack({
    trackId: "nv_seal_nonconviction",
    publicName: "Seal a Nevada arrest that did not end in a conviction",
    mechanism: "seal_nonconviction",
    authority: "NRS 179.255",
    recordTypes: ["arrest", "charge", "court_record"],
    dispositions: ["dismissed", "prosecution_declined", "acquitted"],
    courtLevel: "court_in_which_the_charges_were_dismissed_declined_or_the_acquittal_entered",
    packetSet: packetSet("nv_seal_nonconviction", nevadaComponents("nv_seal_nonconviction")),
    requiredInputs: [
      ...commonInputs("ncv"),
      {
        key: "ncvDisposition",
        label:
          "How did the case end — the charges were dismissed, the prosecutor declined to pursue it, or you were acquitted? Answer dismissed, declined or acquitted. The three routes have different timing and an acquittal carries mandatory relief.",
        required: true
      },
      {
        key: "ncvArrestDate",
        label:
          "On what date were you arrested? The declination route allows a petition any time eight years after the arrest.",
        required: true
      },
      {
        key: "ncvDeferredJudgment",
        label:
          "Was the case dismissed because you completed a programme or a deferred judgment agreement? Answer yes or no. A deferred judgment dismissal runs under NRS 176.211 instead.",
        required: true
      },
      {
        key: "ncvFurtherAction",
        label:
          "Has anyone told you the case might be refiled? Answer yes or no. The court must find there is no evidence that further action will be brought.",
        required: true
      }
    ],
    assembledPacketName: "nv-seal-nonconviction",
    assembledPacketTitle: "Nevada record sealing packet — case that did not end in a conviction",
    customerDeliverableDescription: `Petition to seal the records of a case that ended in dismissal, declination or acquittal under NRS 179.255, with a declaration and verification, a proposed order and an unexecuted stipulation for the prosecuting agency. ${NV_TAIL}`,
    notes:
      "The NRS 179.245(6) conviction exclusions are kept out of this track, as the design directs. The declination warning in NRS 179.255(9) is stated on the face of the petition."
  }),

  nevadaTrack({
    trackId: "nv_seal_multi",
    publicName: "Seal several Nevada records in one filing",
    mechanism: "consolidated_seal_in_district_court",
    authority: "NRS 179.2595",
    recordTypes: ["conviction", "arrest", "charge", "court_record"],
    dispositions: ["convicted", "dismissed", "prosecution_declined", "acquitted"],
    courtLevel: "district_court_for_the_county",
    packetSet: packetSet("nv_seal_multi", nevadaComponents("nv_seal_multi")),
    requiredInputs: [
      ...commonInputs("sea"),
      {
        key: "mltCourtLevels",
        label:
          "Which of your Nevada records are in district court, which in justice court, and which in municipal court? Answer with the court levels involved: district, justice, municipal. A packet including municipal court matters must go to the city attorney as well as the district attorney.",
        required: true
      },
      {
        key: "mltTownship",
        label:
          "For any justice court case, which township? A justice court petition must be captioned to the specific township.",
        required: false
      }
    ],
    assembledPacketName: "nv-seal-consolidated",
    assembledPacketTitle: "Nevada record sealing packet — more than one record in one county",
    customerDeliverableDescription: `Consolidated petition under NRS 179.2595 to seal more than one record in a county's district court, with a declaration and verification, a proposed order carrying a separate blank approval line for each prosecuting agency, and an unexecuted stipulation. ${NV_TAIL}`,
    notes:
      "Consolidation changes the venue and not the eligibility. A packet that would mix municipal court matters with justice or district court matters stops, because two prosecuting agencies are involved."
  }),

  nevadaTrack({
    trackId: "nv_seal_pardon",
    publicName: "Seal a Nevada record after a pardon",
    mechanism: "seal_after_unconditional_pardon",
    authority: "NRS 179.273",
    recordTypes: ["conviction", "court_record"],
    dispositions: ["pardoned"],
    courtLevel: "court_in_which_the_conviction_was_entered",
    packetSet: packetSet("nv_seal_pardon", nevadaComponents("nv_seal_pardon")),
    requiredInputs: [
      ...commonInputs("sea"),
      {
        key: "pdnPardonType",
        label:
          "Was the pardon unconditional, or did it come with conditions? Answer unconditional or conditional. NRS 179.273 reaches an unconditional pardon.",
        required: true
      },
      { key: "pdnPardonDate", label: "On what date was the pardon granted?", required: true },
      {
        key: "pdnStillShowing",
        label:
          "Have you checked whether the record still shows on your Nevada criminal history? Answer yes or no. Sealing under this section is automatic, so a petition should only be prepared where verification shows it did not happen.",
        required: true
      },
      {
        key: "pdnFirearms",
        label:
          "Does your pardon restrict the right to bear arms? A pardon that does not restrict it is the only route that restores firearm rights in Nevada; sealing never does.",
        required: false
      }
    ],
    assembledPacketName: "nv-seal-after-pardon",
    assembledPacketTitle: "Nevada record sealing packet — after an unconditional pardon",
    customerDeliverableDescription: `Petition under NRS 179.273 to seal the records of a pardoned conviction where the automatic sealing the section provides for appears not to have happened, with a declaration and verification, a proposed order and an unexecuted stipulation. Applying for the pardon itself is a Board of Pardons matter and is not part of this packet. ${NV_TAIL}`,
    notes:
      "Verification comes before the filing on this route. A participant who has not checked whether the record still shows is stopped and sent to the repository, because the section provides for automatic sealing and there may be nothing to file."
  }),

  nevadaTrack({
    trackId: "nv_seal_decrim",
    publicName: "Seal a Nevada record for something that is no longer a crime",
    mechanism: "seal_after_decriminalization",
    authority: "NRS 179.271",
    recordTypes: ["conviction", "arrest", "charge", "court_record"],
    dispositions: ["convicted", "dismissed"],
    courtLevel: "court_in_which_the_record_was_entered",
    packetSet: packetSet("nv_seal_decrim", nevadaComponents("nv_seal_decrim")),
    requiredInputs: [
      ...commonInputs("sea"),
      {
        key: "dcrConduct",
        label:
          "What were you accused of doing, and do you believe that conduct is still a crime in Nevada? The section turns on whether the conduct has been decriminalised, which is a legal question this packet screens rather than decides.",
        required: true
      },
      {
        key: "dcrOffenceDate",
        label: "On what date did the offence happen, and when was the record entered?",
        required: true
      }
    ],
    assembledPacketName: "nv-seal-decriminalized-conduct",
    assembledPacketTitle: "Nevada record sealing packet — conduct that is no longer a crime",
    customerDeliverableDescription: `Written request under NRS 179.271 to seal the records of conduct said to be no longer a crime in Nevada, with a declaration and verification, a proposed order and an unexecuted stipulation. The controlling design records the instrument for this route as a written request rather than a full petition, and it is drawn as one. ${NV_TAIL}`,
    notes:
      "Whether the conduct has actually been decriminalised is a legal conclusion the request does not draw, and the section's text was not retrievable, so no condition of it is stated."
  }),

  nevadaTrack({
    trackId: "nv_seal_reentry",
    publicName: "Seal a Nevada record after finishing a reentry program",
    mechanism: "seal_after_reentry_program",
    authority: "NRS 179.259",
    recordTypes: ["conviction", "court_record"],
    dispositions: ["convicted", "reentry_program_completed"],
    courtLevel: "court_in_which_the_conviction_was_entered",
    packetSet: packetSet("nv_seal_reentry", nevadaComponents("nv_seal_reentry")),
    requiredInputs: [
      ...commonInputs("sea"),
      {
        key: "rntProgram",
        label: "Which reentry programme did you complete, and when did you finish it?",
        required: true
      },
      {
        key: "rntCompletionProof",
        label:
          "Do you have the document showing you completed it? Answer yes or no. Completion is the trigger and the court will want it evidenced.",
        required: true
      }
    ],
    assembledPacketName: "nv-seal-after-reentry-program",
    assembledPacketTitle: "Nevada record sealing packet — after a program for reentry",
    customerDeliverableDescription: `Petition under NRS 179.259 to seal records following completion of a program for reentry, with a declaration and verification, a proposed order and an unexecuted stipulation. The section's text was not retrievable, so the petition states none of its conditions. ${NV_TAIL}`,
    notes:
      "Completion is the trigger, and a participant without the completion document is stopped rather than having the assertion made for them."
  })
];
