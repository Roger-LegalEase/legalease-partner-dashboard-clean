/* Shared, form-derived classifications for Alabama CR-65/C-10 packets. */

export const AL_CR65_OATH_SOURCE = Object.freeze({
  form: "CR-65 Rev. 10/2024",
  page: 8,
  instructionFor: "PAGE 6",
  text: "The Petitioner must sign this document under oath and the signature must be verified by an official authorized to administer oaths or a notary public."
});

export const AL_C10_RELIEF_TITLE = "The relief request on C-10-CRIMINAL that this packet has not made";

export const AL_C10_RELIEF_OPTIONS = Object.freeze([
  {
    fieldId: "C-10-CRIMINAL:Check Box2.0",
    lines: ["I, because of financial hardship, am unable to hire an attorney and request that the court appoint one for me."],
    label: "Relief this route does not seek: a court-appointed attorney (selection)",
    reason: "The printed request asks the court to appoint an attorney; this expungement fee-waiver route does not seek that relief."
  },
  {
    fieldId: "C-10-CRIMINAL:Check Box2.1",
    lines: ["I, because of financial hardship, am unable to pay for ignition interlock device fees in this case and request that", "these fees be waived."],
    label: "Relief this route does not seek: waiver of ignition-interlock fees (selection)",
    reason: "The printed request asks to waive ignition-interlock fees; this expungement fee-waiver route does not seek that relief."
  },
  {
    fieldId: "C-10-CRIMINAL:Check Box2.2",
    lines: ["I, because of financial hardship, am unable to pay the administrative filing fee required for filing a petition for", "expungement pursuant to Ala. Code 1975, § 15-27-4, and request that this fee be waived."],
    label: "Participant election: request waiver of the expungement-petition administrative filing fee (selection)",
    reason: "This is the printed request the route concerns, but it is a sworn financial-hardship election. The packet holds no participant financial facts and leaves the election to the participant."
  }
]);

export const AL_C10_RELIEF_BY_FIELD = new Map(AL_C10_RELIEF_OPTIONS.map((row) => [row.fieldId, row]));

export function classifyAlabamaC10Municipality({ fieldId, filingRule, trackId }) {
  if (!["C-10-CRIMINAL:MUNICIPALITY OF", "C-10-CRIMINAL:Check Box1.1"].includes(fieldId)) return null;
  const selection = fieldId.endsWith("Check Box1.1");
  return {
    effectiveLabel: `Municipal-court caption branch on C-10-CRIMINAL page 1 — this route does not use it${selection ? " (selection)" : ""}`,
    reason: "C-10-CRIMINAL offers State of Alabama and municipality caption branches. This packet selects State of Alabama and files in circuit court, so the municipality branch is outside this route.",
    routeConditionThatMakesItInapplicable: `AL.memo.json track ${trackId} rules.filing: \"${filingRule}\" The packet selects State of Alabama and circuit court, so the municipal caption branch is not applicable.`,
    completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    requiredBeforeFiling: false,
    ...(selection ? { refusalClass: "participant_sworn_narrative_or_legal_election" } : {}),
    isSelectionControl: selection,
    routeDetermined: false,
    factAvailable: false,
    role: "participant"
  };
}

export function classifyAlabamaC10Relief(fieldId) {
  const option = AL_C10_RELIEF_BY_FIELD.get(fieldId);
  if (!option) return null;
  return {
    effectiveLabel: option.label,
    reason: option.reason,
    refusalClass: "participant_sworn_narrative_or_legal_election",
    printedRequestBesideThisControl: option.lines.join(" "),
    isSelectionControl: true,
    routeDetermined: false,
    disclosedToParticipant: true,
    requiredBeforeFiling: false,
    factAvailable: false,
    role: "participant"
  };
}

export function alabamaC10ReliefSection(rules) {
  const quote = (option) => option.lines.map((line) => `> ${line}`).join("\n");
  return `## ${AL_C10_RELIEF_TITLE}

C-10-CRIMINAL page 1 prints three separate relief requests. This packet leaves
all three blank because each is a sworn participant election:

${AL_C10_RELIEF_OPTIONS.map(quote).join("\n>\n")}

The third request is the one this route concerns. The held record states the
filing fee as "${rules.fees}" and identifies C-10-CRIMINAL as the fee-waiver
form. If you claim financial hardship, tick the third box yourself and complete
the affidavit's income, expense and asset items. If you do not claim financial
hardship, leave all three blank and pay the filing fee. The first two requests
seek counsel and ignition-interlock relief and do not apply to this route.`;
}

export function alabamaOathGuidance() {
  return `CR-65 Rev. 10/2024, page 8 instructions for PAGE 6 state: "${AL_CR65_OATH_SOURCE.text}" Sign page 6 under oath only in front of an official authorized to administer oaths or a notary public. Leave your signature, its date, and the verification block blank until that person administers the oath.`;
}
