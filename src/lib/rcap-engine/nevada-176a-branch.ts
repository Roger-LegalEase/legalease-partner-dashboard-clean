/**
 * The Nevada NRS 176A.245 / .265 / .295 branch trigger.
 *
 * These three sections are structurally identical and carry TWO mechanisms, not
 * one. Which mechanism applies is not a property of the route — it is a property
 * of the participant's own case, and it decides whether anything is generated at
 * all:
 *
 *   Subsection 1 — automatic. After a discharge from probation or a dismissal
 *   under the corresponding chapter 176A programme, the justice, municipal or
 *   district court "shall order those records sealed without a hearing unless
 *   the Division petitions the court, for good cause shown, not to seal the
 *   records and requests a hearing thereon". The participant files nothing.
 *   There is no petition, no proposed order, no declaration, no filing fee and
 *   nothing to sell.
 *
 *   Subsection 2 — participant petition. Where the defendant "was charged with a
 *   violation of NRS 200.485, NRS 484C.110 or NRS 484C.120" AND "the charges
 *   were conditionally dismissed or the judgment of conviction set aside",
 *   sealing follows only "upon the filing of a petition by the defendant" and
 *   "not sooner than 7 years after" that disposition.
 *
 * Source: data/record-clearing/legal-design-intake/NV.memo.json, track
 * `nv_seal_probation_family` — controllingAuthority.summary, exclusions[1],
 * waitingPeriods, rules.filing, and the `branch_screen` component, which records
 * this as "the single question that decides whether anything is generated at
 * all". The route shape finding is
 * data/record-clearing/legal-decisions/2026-09-19-case-mode-resolutions-nv-ct-ks.json.
 *
 * ONE trigger, FOUR consumers. The evaluator routes on it, the route-safety fact
 * list publishes it so the collection policy keeps it in front of the
 * participant before Checkout, the packet specification carries it into the
 * matter, and the Grade-A composer evaluates the specification's
 * `subsection_2_petition_branch` condition with it. A second derivation anywhere
 * would be a second legal engine, and the two would disagree the first time
 * either changed.
 *
 * The route is NOT split. Both branches sit on the same three sections, the same
 * programme family and the same court; only the mechanism differs, and the
 * specification already models that with branch-conditional components. Oregon
 * splits because its branches differ on legal basis, vehicle, service recipient
 * and timing; Nevada's do not.
 */

export const NEVADA_176A_ROUTE_KEY = "NV:probation-or-specialty-court-dismissal-set-aside-sealing";

/**
 * Was the charge one of the three the sections name? The question asks for a
 * fact about the charge, never for a document: nothing here requires the
 * participant to hold, upload or produce a court record.
 */
export const NEVADA_176A_CHARGE_FACT_ID = "nv_176a_charge_class";

/** How the case ended, in the sections' own vocabulary. */
export const NEVADA_176A_DISPOSITION_FACT_ID = "nv_176a_disposition_class";

export const NEVADA_176A_BRANCH_FACT_IDS: readonly string[] = [
  NEVADA_176A_CHARGE_FACT_ID,
  NEVADA_176A_DISPOSITION_FACT_ID
];

/** The condition string the packet specification gates its petition set on. */
export const NEVADA_176A_PETITION_BRANCH_CONDITION = "subsection_2_petition_branch";

export const NEVADA_176A_CHARGE_NAMED = "Yes — battery constituting domestic violence, or driving under the influence";
export const NEVADA_176A_CHARGE_OTHER = "No — it was a different charge";
export const NEVADA_176A_CHARGE_UNSURE = "I am not sure";

export const NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL = "The charges were conditionally dismissed";
export const NEVADA_176A_DISPOSITION_SET_ASIDE = "The judgment of conviction was set aside";
export const NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE = "I was discharged from probation";
export const NEVADA_176A_DISPOSITION_ORDINARY_DISMISSAL = "The case was dismissed outright";
export const NEVADA_176A_DISPOSITION_UNSURE = "I am not sure";

/**
 * The two questions, as the profile publishes them.
 *
 * Option-only and answerable from memory: a participant who ran a treatment
 * programme knows what they were charged with and how it ended. Neither asks
 * for a date, a document, a docket number or a statutory classification.
 */
export const NEVADA_176A_BRANCH_QUESTIONS = [
  {
    id: NEVADA_176A_CHARGE_FACT_ID,
    stage: "special_pathways",
    prompt: "Was the charge battery constituting domestic violence, or driving — or being in actual physical control of a vehicle — under the influence?",
    helperText: "Nevada treats these charges differently from every other charge on this route. Answer from what you were charged with, not from any paperwork.",
    type: "single_choice",
    required: true,
    lifecyclePhase: "prepay_route_splitter",
    contextOnly: false,
    doesNotSelectPathway: false,
    options: [NEVADA_176A_CHARGE_NAMED, NEVADA_176A_CHARGE_OTHER, NEVADA_176A_CHARGE_UNSURE]
  },
  {
    id: NEVADA_176A_DISPOSITION_FACT_ID,
    stage: "special_pathways",
    prompt: "How did the case end after the programme?",
    helperText: "Nevada's two sealing mechanisms turn on this. Answer from what happened, not from any paperwork.",
    type: "single_choice",
    required: true,
    lifecyclePhase: "prepay_route_splitter",
    contextOnly: false,
    doesNotSelectPathway: false,
    options: [
      NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE,
      NEVADA_176A_DISPOSITION_ORDINARY_DISMISSAL,
      NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL,
      NEVADA_176A_DISPOSITION_SET_ASIDE,
      NEVADA_176A_DISPOSITION_UNSURE
    ]
  }
] as const;

export type Nevada176ABranch =
  /** Subsection 1: the court seals on its own and the participant files nothing. */
  | "subsection_1_automatic"
  /** Subsection 2: the participant petitions, not sooner than seven years after. */
  | "subsection_2_petition"
  /** Neither established. Fail closed — do not guess which mechanism applies. */
  | "unresolved";

function answerOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "value" in value) return answerOf((value as { value: unknown }).value);
  return "";
}

/**
 * The branch, from the participant's own answers.
 *
 * Both conjuncts are required for subsection 2, exactly as the sections state
 * them. A named charge that ended in an honourable probation discharge or an
 * ordinary dismissal stays on the automatic branch; so does every charge the
 * sections do not name, whatever its disposition.
 *
 * "I am not sure", a blank, or an answer this function does not recognise
 * resolves to `unresolved`. Nothing downstream may treat that as either branch:
 * guessing subsection 1 hides a real petition, and guessing subsection 2 sells a
 * packet to someone whose relief is automatic and free.
 */
export function nevada176ABranch(facts: Readonly<Record<string, unknown>>): Nevada176ABranch {
  const charge = answerOf(facts[NEVADA_176A_CHARGE_FACT_ID]);
  const disposition = answerOf(facts[NEVADA_176A_DISPOSITION_FACT_ID]);
  if (!charge || !disposition) return "unresolved";
  if (charge === NEVADA_176A_CHARGE_UNSURE || disposition === NEVADA_176A_DISPOSITION_UNSURE) return "unresolved";

  const chargeIsNamed = charge === NEVADA_176A_CHARGE_NAMED;
  const chargeIsOther = charge === NEVADA_176A_CHARGE_OTHER;
  if (!chargeIsNamed && !chargeIsOther) return "unresolved";

  const dispositionOpensPetition = disposition === NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL
    || disposition === NEVADA_176A_DISPOSITION_SET_ASIDE;
  const dispositionStaysAutomatic = disposition === NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE
    || disposition === NEVADA_176A_DISPOSITION_ORDINARY_DISMISSAL;
  if (!dispositionOpensPetition && !dispositionStaysAutomatic) return "unresolved";

  return chargeIsNamed && dispositionOpensPetition ? "subsection_2_petition" : "subsection_1_automatic";
}

/**
 * What a participant on the automatic branch is told instead of a packet.
 *
 * Not a refusal and not an error: the relief they came for happens, and this
 * says who does it, what it costs them (nothing) and where to go if the record
 * still shows the case.
 */
export const NEVADA_176A_SUBSECTION_1_GUIDANCE =
  "Nevada seals this kind of case automatically. Under NRS 176A.245, 176A.265 or 176A.295, "
  + "once you were discharged from probation or the case was dismissed after the treatment programme, "
  + "the justice, municipal or district court that handled your case must order the records sealed "
  + "without a hearing, unless the Division of Parole and Probation asks the court not to. "
  + "You do not file a petition, you do not need a packet, and there is nothing to pay. "
  + "If the record still shows the case, contact the court that supervised the programme — it holds the "
  + "sealing order and is the only body that can act — or Nevada Legal Services.";

/**
 * What a participant whose branch is not established is told.
 *
 * Named separately from the guidance above because it is a different answer: we
 * do not yet know which mechanism applies, and saying "this is automatic" would
 * be a guess in the direction that silently withholds a real petition.
 */
export const NEVADA_176A_UNRESOLVED_BRANCH_TEXT =
  "Nevada has two different mechanisms for this kind of case, and which one applies depends on what "
  + "you were charged with and how the case ended. Answer those two questions and we can tell you "
  + "whether the court seals the record on its own or whether you file a petition.";
