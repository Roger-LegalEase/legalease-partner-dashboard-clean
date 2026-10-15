import type { EngineProfile } from "@/lib/rcap-engine/contracts";

export const NJ_MARIJUANA_STATUS_ROUTE = "marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1";
// LD-NJ-01 authorizes status/correction guidance before any petition, not a
// financial exemption for the three statutory mechanisms. Keep the shared
// requiredFacts/exclusions and the unprojected stale ratification unchanged.
// The named automated-Clean-Slate family is not this route's approval.
const EXPECTED = {
  "id": "marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1",
  "sourceRef": "pathways:74-129; section:74-129; corpus-unit:31",
  "ruleClauses": [
    "No waiting period (immediate after payment/completion/release) for simple possession, failure to make lawful disposition, being under the influence, paraphernalia, and distribution/PWID of less than one ounce of marijuana or less than five grams of hashish (2C:35-5b(12)), including school-zone/public-housing variants.",
    "Three-year wait for distribution of one ounce to five pounds of marijuana, or five grams to one pound of",
    "Four main pathways, considered by disposition and the shape of the record.",
    "Regular expungement (2C:52-2 indictable / 2C:52-3 disorderly)",
    "The standard relief, keyed to how many and what kind of convictions:",
    "One indictable (felony) conviction PLUS up to three disorderly persons / petty disorderly persons offenses, with no other disqualifying convictions — expunge all of them.",
    "Up to four disorderly persons offenses (and no felony) — expunge all of them.",
    "Single judgment “crime spree” (2C:52-2): multiple crimes (or a mix of crimes and DP offenses) listed in a SINGLE judgment of conviction may be treated favorably and expunged together, if there is no other subsequent conviction.",
    "Third- and fourth-degree drug-distribution convictions (sale, distribution, possession with intent) may be expungeable in the court's discretion on a showing of compelling circumstances (2C:52-2c).",
    "Clean Slate petition (2C:52-5.3)",
    "A person “not otherwise eligible” under any other section may petition the Superior Court to expunge the",
    "ENTIRE record — any number of crimes and disorderly persons offenses — ten years after the most recent",
    "conviction, payment of any fine, or completion of probation/parole/incarceration, whichever is latest. It is",
    "unavailable if the person has any conviction that is non-expungeable under 2C:52-2 b. or c., and it is available",
    "even if the person would otherwise be barred by the prior-expungement rule (2C:52-14(e)). No applications",
    "may be filed under this section after the automated clean-slate process is established.",
    "Marijuana / hashish relief (2C:52-5.1, 5.2, 6.1)",
    "Three-year wait for distribution of one ounce to five pounds of marijuana, or five grams to one pound of hashish (2C:35-5(11)) — now treated as a disorderly persons offense; no automatic non-disclosure order issues.",
    "Automatic sealing “by operation of law” (2C:52-5.2 / 6.1) for specified marijuana/hashish offenses — possession of six ounces or less, or manufacture/distribution/PWID of one ounce or less of marijuana or five grams or less of hashish.",
    "Paraphernalia under 2C:36-2 is “not a conviction” for these purposes.",
    "Arrests, dismissals, and other relief",
    "Arrests not resulting in conviction (2C:52-6): expungeable at any time; the court may order an IMMEDIATE expungement if the case is dismissed or the person is acquitted/found not guilty on all counts (expedited).",
    "Juvenile adjudications (2C:52-4.1): generally 3 years after final discharge with no further arrests/charges.",
    "New Jersey Expungement — Agent Training Reference · LegalEase / Wilma",
    "Recovery Court (former Drug Court) (2C:35-14(m)): the court orders expungement on graduation; a person need only apply if they graduated before April 18, 2016.",
    "Ordinance offenses (2C:52-4): 2-year wait.",
    "Count first: one felony + up to three DP, or up to four DP, drives REGULAR expungement; anything",
    "beyond that points to CLEAN SLATE (10 years, whole record). Non-convictions go to the immediate /"
  ],
  "automatic": true,
  "filingRequired": false,
  "routeType": "automatic",
  "waitingRules": [
    "handled through the special automatic and summary statutory mechanisms; no participant elapsed wait applies"
  ],
  "legalAuthority": {
    "decisionId": "LD-NJ-01",
    "ruleId": "NJ-2C52-NONCONVICTION-REGULAR-CLEANSLATE-MARIJUANA-MAP",
    "mechanism": "Marijuana and hashish expungement",
    "statute": "N.J.S.A. 2C:52-5.1, 2C:52-5.2 and 2C:52-6.1",
    "stage": "automatic",
    "outcomeMode": "automatic_relief",
    "paymentAuthority": "closed",
    "timing": {
      "kind": "event_trigger",
      "anchorText": "handled through the special automatic and summary statutory mechanisms; no participant elapsed wait applies"
    },
    "requiredFacts": [
      "Disposition?",
      "Diversion?",
      "All conviction counts?",
      "Exact statutes?",
      "Sentence/probation/parole/release dates?",
      "Financial assessments?",
      "Early-path basis?",
      "Clean-slate exclusions?",
      "Marijuana status?"
    ],
    "screeningFactIds": [
      "case_outcome",
      "offense_level"
    ],
    "exclusions": [
      "Exact New Jersey route",
      "Conviction count and type",
      "Completion/payment dates",
      "Statutory exclusions",
      "Automatic marijuana status"
    ],
    "packetFamily": null,
    "notes": "Provide status and correction guidance before any petition is generated; checkout stays closed on the automatic mechanism."
  },
  "lawrenceRatification": null
} as const;

export function newJerseyMarijuanaStatusFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "NJ" || pathwayId !== NJ_MARIJUANA_STATUS_ROUTE
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "de497e48a96cd33958cf00f9896c843a5edad96ab164135c22965fe0ca76f302") return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true
    || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  return Boolean(route && Object.entries(EXPECTED).every(([key, value]) =>
    JSON.stringify((route as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value)));
}

/** Generic payment completeness is not a prerequisite to status guidance.
 * No debt, completion, offense classification, sealing or petition inference. */
export function newJerseyMarijuanaStatusFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined,
  _answers: Readonly<Record<string, unknown>>, id: string): boolean {
  return id !== "financial_obligations" || !newJerseyMarijuanaStatusFinancialContract(profile, pathwayId);
}
