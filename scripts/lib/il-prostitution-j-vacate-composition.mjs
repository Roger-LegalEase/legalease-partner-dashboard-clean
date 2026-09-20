/**
 * The approved composed text of the Illinois Class 4 felony prostitution
 * vacate-and-expunge family (census-v1 family il-prostitution-j-vacate-set),
 * held in ONE place and read by both consumers of it.
 *
 *   composedBodyLines()          the family builder's own fixture text, line by
 *                                line, exactly as the committed canonical and
 *                                boundary fixtures were built from it.
 *
 *   composedCourtDocumentBlocks() the same sentences as Grade-A court-document
 *                                blocks, so the shared Grade-A renderer can draw
 *                                a participant's own copy of the same documents.
 *
 * WHY BOTH READ THE SAME CONSTANTS
 *
 * The family's approved content is the sentences below and nothing else. Before
 * this module existed the sentences lived inside the fixture builder, so a
 * participant renderer could only have been built by copying them, and a copy
 * is a second document that no review covers and that drifts silently. Every
 * sentence a participant reads therefore comes from the same constant the
 * fixture bytes were built from, and the family's committed fixture digests are
 * the test that says so: if a sentence, a blank or a separator moved, the
 * rebuilt fixtures no longer match their recorded hashes.
 *
 * WHAT IS NOT HERE
 *
 * No new legal sentence, no new assertion, and no fact the platform does not
 * hold. The county of conviction, the case number, the conviction date, the
 * conviction as the record words it, the sentence-completion date and the
 * participant's own adverse-consequences statement stay labelled dotted blanks
 * in both outputs, because the production field map records them as
 * REQUIRED_BEFORE_FILING refusals: they live on a court record the platform has
 * not seen. Filling one of them from screening answers would be a new write
 * against an approved refusal, and that is a packet-content decision this
 * module does not make.
 *
 * Composing a document is not approving one. Nothing here opens a route, and
 * the Illinois registry stays where the committed authority puts it.
 */

const DOTS = (n = 84) => ".".repeat(n);

export const IL_PROSTITUTION_J_VACATE_FAMILY_ID = "il-prostitution-j-vacate-set";

export const IL_PROSTITUTION_J_VACATE_COMPONENTS = Object.freeze(["primary_filing", "proposed_order"]);

export const IL_PROSTITUTION_J_VACATE_TITLES = Object.freeze({
  primary_filing:
    "Motion to Vacate and Expunge Conviction for Class 4 Felony Prostitution Under 20 ILCS 2630/5.2(j)(3)",
  proposed_order: "Proposed Order (Tendered for the Court's Consideration)"
});

/* ---- the approved sentences ---------------------------------------------- */

const CAPTION_COURT_LINE = `IN THE CIRCUIT COURT OF ${DOTS(42)} COUNTY, ILLINOIS`;

const CAPTION_COURT_NOTE =
  "(THE COUNTY OF THE CONVICTION - the motion is filed with the circuit court with jurisdiction over the "
  + "underlying conviction, the Chief Judge of that judicial circuit, or a judge designated by the Chief Judge)";

const CAPTION_PLAINTIFF = "PEOPLE OF THE STATE OF ILLINOIS";

const CAPTION_DEFENDANT_ROLE = "DEFENDANT-MOVANT";

const CAPTION_CASE_NUMBER_BLANK = DOTS(44);
const CAPTION_CASE_NUMBER_LABEL = "Case No.";
const CAPTION_CASE_NUMBER_NOTE = "(the EXISTING criminal case number)";

/* The caption slot the shared pleading renderer repeats in every continuation
 * header, so the blank there is short enough to sit beside the document title
 * instead of running into it. The approved explanation of what belongs on it
 * travels with the caption, in the note printed under it. */
const CAPTION_CASE_NUMBER_SLOT = DOTS(20);

const MOTION_HEADING = "MOTION TO VACATE AND EXPUNGE CONVICTION FOR CLASS 4 FELONY PROSTITUTION";

const MOTION_PARAGRAPHS = [
  {
    number: "1.",
    body: (participant) =>
      `The movant, ${participant.fullLegalName}, moves under 20 ILCS 2630/5.2(j)(3) to vacate and expunge a `
      + "prior Class 4 felony prostitution conviction entered in this case, and states the following from the "
      + "court record (nothing on these lines is written for you):",
    blanks: [
      { label: "Date of conviction:", lines: 1 },
      {
        label:
          "The conviction as the court record words it (copy it exactly; file this motion only if the record "
          + "shows a Class 4 felony prostitution conviction, and stop if it does not):",
        lines: 2
      },
      { label: "Date the sentence and every condition imposed by the conviction was completed:", lines: 1 }
    ]
  },
  {
    number: "2.",
    body: () =>
      "The movant has completed any sentence and every condition imposed by the conviction, as 20 ILCS "
      + "2630/5.2(j)(3) requires before the motion may be brought.",
    blanks: []
  },
  {
    number: "3.",
    body: () =>
      "Your own statement of the specific problems this conviction has caused you, in your own words (these "
      + "lines are yours alone; this packet composes none of this showing and asserts nothing about the "
      + "circumstances of the offense):",
    blanks: [{ label: null, lines: 4 }]
  },
  {
    number: "4.",
    body: () =>
      "The movant therefore asks the court to vacate the conviction and to order expungement of the associated "
      + "records in the manner provided by 20 ILCS 2630/5.2(d)(9)(A), with the effect provided by 20 ILCS "
      + "2630/5.2(j)(8). The State's Attorney may object within 60 days after notice.",
    blanks: []
  }
];

const MOTION_SIGNATURE_LINE = `DATE ${DOTS(30)}   SIGNATURE OF MOVANT ${DOTS(42)}`;
const MOTION_SIGNATURE_DATE_BLANK = `DATE ${DOTS(30)}`;
const MOTION_SIGNATURE_LABEL = "SIGNATURE OF MOVANT";
const MOTION_SIGNATURE_NOTE =
  "(The movant signs and dates this motion personally. No verification language appears on this motion because "
  + "20 ILCS 2630/5.2(j)(3) requires none, and none may be added.)";
const MOTION_SELF_REPRESENTED = "(self-represented)";

const ORDER_HEADING = "PROPOSED ORDER";

const ORDER_OPENING = (participant) =>
  `THIS CAUSE coming before the court on the motion of ${participant.fullLegalName} to vacate and expunge a `
  + "conviction for Class 4 felony prostitution under 20 ILCS 2630/5.2(j)(3), and the court being fully advised, "
  + "the following order is TENDERED FOR THE COURT'S CONSIDERATION. (Every decision below belongs to the court; "
  + "nothing here asserts a finding, and this order takes effect only if and when a judge signs it.)";

const ORDER_DIRECTION =
  "IT IS ORDERED that the conviction identified below is vacated, and that expungement of the associated records "
  + "proceed in the manner provided by 20 ILCS 2630/5.2(d)(9)(A).";

const ORDER_CONVICTION_BLANK_LABEL =
  "The conviction as the court record words it (copied exactly from the record, by the movant, before tendering):";

const ORDER_ENTERED_LINE = `ENTERED this ${DOTS(6)} day of ${DOTS(18)}, 20${DOTS(6)}`;
const ORDER_JUDGE_RULE = DOTS(51);
const ORDER_JUDGE_ROLE = "JUDGE";
const ORDER_JUDGE_NOTE = "(The date of entry and the judge's signature are the Court's. They are left blank.)";

/* ---- participant facts ---------------------------------------------------- */

/**
 * The only facts either output writes. Everything else on both pages is a
 * labelled blank the participant fills from the court record.
 *
 * @typedef {{ fullLegalName: string, mailingAddress: string, phone: string, email: string }} IlVacateParticipant
 */

/** The census fixture fact keys, mapped onto the participant shape. */
export function participantFromCensusFacts(facts) {
  return {
    fullLegalName: facts["participant.full_legal_name"],
    mailingAddress: facts["participant.street_address"],
    phone: facts["participant.phone"],
    email: facts["participant.email"]
  };
}

function requireParticipant(participant, componentId) {
  if (!IL_PROSTITUTION_J_VACATE_COMPONENTS.includes(componentId)) {
    throw new Error(`il-prostitution-j-vacate-set: unknown component ${componentId}`);
  }
  const missing = ["fullLegalName", "mailingAddress", "phone", "email"]
    .filter((key) => typeof participant?.[key] !== "string" || participant[key].trim() === "");
  if (missing.length > 0) {
    throw new Error(
      `il-prostitution-j-vacate-set: ${missing.join(", ")} missing. The packet is not composed with gaps.`
    );
  }
}

/* ---- the family builder's fixture text ------------------------------------ */

/**
 * The composed page text, line by line, for one component. The family builder
 * renders these lines into the committed fixtures; their digests are the proof
 * that this text is unchanged.
 */
export function composedBodyLines(componentId, participant, routeKeys) {
  requireParticipant(participant, componentId);
  const lines = [];
  const push = (...values) => lines.push(...values);

  push(IL_PROSTITUTION_J_VACATE_TITLES[componentId].toUpperCase(), "");

  push(CAPTION_COURT_LINE);
  push(CAPTION_COURT_NOTE, "");
  push(CAPTION_PLAINTIFF, "");
  push("v.", "");
  push(`${participant.fullLegalName}, ${CAPTION_DEFENDANT_ROLE}`, "");
  push(`${CAPTION_CASE_NUMBER_LABEL} ${CAPTION_CASE_NUMBER_BLANK}  ${CAPTION_CASE_NUMBER_NOTE}`, "");

  if (componentId === "primary_filing") {
    push(MOTION_HEADING, "");
    for (const paragraph of MOTION_PARAGRAPHS) {
      push(`${paragraph.number} ${paragraph.body(participant)}`);
      if (paragraph.blanks.length === 0 || paragraph.blanks[0].label !== null) push("");
      for (const blank of paragraph.blanks) {
        if (blank.label) push(blank.label);
        for (let line = 1; line < blank.lines; line += 1) push(DOTS());
        push(DOTS(), "");
      }
    }
    push(MOTION_SIGNATURE_LINE, "");
    push(MOTION_SIGNATURE_NOTE, "");
    push(`PRINTED NAME: ${participant.fullLegalName}  ${MOTION_SELF_REPRESENTED}`);
    push(`MAILING ADDRESS: ${participant.mailingAddress}`);
    push(`TELEPHONE: ${participant.phone}`);
    push(`EMAIL: ${participant.email}`);
  } else {
    push(ORDER_HEADING, "");
    push(ORDER_OPENING(participant), "");
    push(ORDER_DIRECTION, "");
    push(ORDER_CONVICTION_BLANK_LABEL);
    push(DOTS());
    push(DOTS(), "");
    push(ORDER_ENTERED_LINE, "");
    push(ORDER_JUDGE_RULE);
    push(ORDER_JUDGE_ROLE);
    push("", ORDER_JUDGE_NOTE);
  }

  push("", `Route: ${routeKeys.join(" ; ")}`);
  return lines;
}

/** The same lines, joined the way the family builder feeds its own renderer. */
export function composedBody(componentId, participant, routeKeys) {
  return composedBodyLines(componentId, participant, routeKeys).join("\n");
}

/* ---- the same content as Grade-A court-document blocks -------------------- */

/**
 * The approved documents as Grade-A blocks, for the shared Grade-A pleading
 * renderer. The caption is a real pleading caption — the guard in renderer.ts
 * exists because a pleading without one is not a pleading — and the county and
 * case-number slots carry the family's approved REQUIRED_BEFORE_FILING blanks,
 * unchanged.
 *
 * @param {"primary_filing" | "proposed_order"} componentId
 * @param {IlVacateParticipant} participant
 * @returns {import("../../src/lib/rcap/grade-a/composer").GradeABlock[]}
 */
export function composedCourtDocumentBlocks(componentId, participant) {
  requireParticipant(participant, componentId);
  const caption = (title) => ({
    kind: "pleading_caption",
    court: CAPTION_COURT_LINE,
    plaintiff: CAPTION_PLAINTIFF,
    defendant: participant.fullLegalName,
    defendantRole: CAPTION_DEFENDANT_ROLE,
    caseNumber: CAPTION_CASE_NUMBER_SLOT,
    title
  });
  /* The two caption blanks, explained under the caption in the family's own
   * words: the county line and the case-number slot. */
  const captionNote = {
    kind: "pleading_paragraph",
    text: `${CAPTION_COURT_NOTE} ${CAPTION_CASE_NUMBER_LABEL} ${CAPTION_CASE_NUMBER_NOTE}`
  };

  if (componentId === "primary_filing") {
    const blocks = [caption(MOTION_HEADING), captionNote];
    for (const item of MOTION_PARAGRAPHS) {
      blocks.push({ kind: "pleading_paragraph", text: item.body(participant), number: item.number });
      for (const blank of item.blanks) {
        if (blank.label) blocks.push({ kind: "pleading_paragraph", text: blank.label });
        for (let line = 0; line < blank.lines; line += 1) {
          blocks.push({ kind: "pleading_paragraph", text: DOTS() });
        }
      }
    }
    blocks.push({
      kind: "pleading_signature",
      heading: MOTION_SIGNATURE_NOTE,
      name: participant.fullLegalName,
      role: MOTION_SIGNATURE_LABEL,
      contactLines: [
        MOTION_SELF_REPRESENTED,
        `MAILING ADDRESS: ${participant.mailingAddress}`,
        `TELEPHONE: ${participant.phone}`,
        `EMAIL: ${participant.email}`,
        MOTION_SIGNATURE_DATE_BLANK
      ]
    });
    return blocks;
  }

  const blocks = [
    caption(ORDER_HEADING),
    captionNote,
    { kind: "pleading_paragraph", text: ORDER_OPENING(participant) },
    { kind: "pleading_paragraph", text: ORDER_DIRECTION },
    { kind: "pleading_paragraph", text: ORDER_CONVICTION_BLANK_LABEL },
    { kind: "pleading_paragraph", text: DOTS() },
    { kind: "pleading_paragraph", text: DOTS() },
    {
      kind: "official_signature",
      title: ORDER_ENTERED_LINE,
      role: ORDER_JUDGE_ROLE,
      note: ORDER_JUDGE_NOTE
    }
  ];
  return blocks;
}
