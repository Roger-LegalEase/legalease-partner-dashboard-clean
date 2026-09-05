/**
 * Form 4-960.1 NMRA — Notice of hearing.
 *
 * The statewide notice of hearing, bound as a component of all three New
 * Mexico district-court expungement families at the identical digest
 * 3cbc2e6eb35e29bdc10c42fee90221a7f9d470fa077fc0b9620bf1fb7e3f4f5c. Three
 * pages, no AcroForm, thirty-six measured blanks.
 *
 * WHAT THE PARTICIPANT FILLS AND WHAT THE COURT FILLS
 *
 * The New Mexico Judiciary's instruction packets direct the petitioner to leave
 * the hearing date, time and place blank because the court supplies them, and
 * the form's own signature block is "HONORABLE ____ / By ____ / TCAA" -- a
 * trial court administrative assistant issuing the notice for the judge. So the
 * caption and the PARTIES ENTITLED TO NOTICE block are the petitioner's, and
 * items 1 to 5 and the signature block are the court's.
 *
 * THE FOUR SERVICE BLOCKS ON PAGE 2, AND WHY THEY DIFFER BY ROUTE
 *
 * Page 2 carries four repeated blocks -- Name, Agency (if applicable), Address,
 * Telephone Number, Email Address -- twenty blanks in all, for the people
 * served with the notice. The form's own USE NOTES on page 3 say who they are:
 *
 *   "the parties entitled to notice include the petitioner and any party that
 *   filed and served objections to the petition for expungement pursuant to
 *   Rule 1-077.1(G)(1) NMRA no later than sixty-three (63) days from the date
 *   of service."
 *
 * A party can only object under Rule 1-077.1(G)(1) if it was SERVED, and the
 * sixty-three days run "from the date of service". On the identity-theft track
 * there is no service at all: Rule 1-077.1(E) NMRA entitles no responding party
 * to notice, and the track's own record states that service "is required only
 * for the release-without-conviction and conviction tracks". So on that track
 * no party can ever appear in those blocks, and the twenty blanks are on a
 * branch of the form the route does not reach.
 *
 * On the conviction and release-without-conviction tracks the petition IS
 * served, an objection CAN be filed, and the blocks are therefore the
 * petitioner's to complete for whoever objected -- required before filing, not
 * inapplicable. `serviceBlocksOf` takes the route's posture as a parameter for
 * exactly this reason: the difference is one fact about the route, and copying
 * the identity-theft reasoning onto a track that serves someone would excuse
 * twenty blanks that the filing needs.
 */
import { WRITE, SUPPLY, PROTECT, INAPPLICABLE, COURT_OWNED, SIGNATURE } from "./nm-packet-host.mjs";

export const FORM_4_960_1 = Object.freeze({
  sourceId: "official-form:4-960.1",
  documentId: "NM-4-960.1",
  formNumber: "4-960.1",
  title: "Notice of hearing",
  sha256: "3cbc2e6eb35e29bdc10c42fee90221a7f9d470fa077fc0b9620bf1fb7e3f4f5c",
  strategy: "measured_flat_overlay",
  pages: 3
});

const CAPTION = "Caption";
const HEARING = "Hearing details set by the court";
const ISSUED = "Issued by the court";
const PETITIONER_BLOCK = "Parties entitled to notice: the petitioner";

/** The court's own hearing details, and the court's own signature block. */
const COURT_PARTS = {
  "p1-y50119-x17741": {
    section: HEARING, label: "Name of the judge before whom the hearing is set",
    ...PROTECT(COURT_OWNED, "the court sets the hearing and names the judge; the New Mexico Judiciary's instructions direct the petitioner to leave the hearing details blank")
  },
  "p1-y47347-x25205": {
    section: HEARING, label: "1. Date of Hearing",
    ...PROTECT(COURT_OWNED, "the court sets the hearing date after the petition is filed; the New Mexico Judiciary's instructions direct the petitioner to leave it blank")
  },
  "p1-y44563-x25205": {
    section: HEARING, label: "2. Time of Hearing",
    ...PROTECT(COURT_OWNED, "the court sets the hearing time; the New Mexico Judiciary's instructions direct the petitioner to leave it blank")
  },
  "p1-y41779-x25205": {
    section: HEARING, label: "3. Length of Hearing",
    ...PROTECT(COURT_OWNED, "the court sets how long the hearing will be; the New Mexico Judiciary's instructions direct the petitioner to leave it blank")
  },
  "p1-y39007-x25205": {
    section: HEARING, label: "4. Place of Hearing",
    ...PROTECT(COURT_OWNED, "the court sets where the hearing will be held; the New Mexico Judiciary's instructions direct the petitioner to leave it blank")
  },
  "p1-y36221-x25205": {
    section: HEARING, label: "4. Place of Hearing, second line",
    ...PROTECT(COURT_OWNED, "the second line of the court's own place-of-hearing entry")
  },
  "p1-y33437-x25205": {
    section: HEARING, label: "5. Matter(s) to be heard",
    ...PROTECT(COURT_OWNED, "the court states what will be heard when it sets the hearing")
  },
  "p1-y30665-x34207": {
    section: ISSUED, label: "HONORABLE, the judge issuing the notice",
    ...PROTECT(COURT_OWNED, "the notice of hearing is issued by the court over the judge's name")
  },
  "p1-y29285-x34207": {
    section: ISSUED, label: "By, signed for the judge by the trial court administrative assistant",
    ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. The trial court administrative assistant signs the notice for the judge")
  }
};

/**
 * The caption and the petitioner's own notice block.
 *
 * The petitioner's telephone number and e-mail address are not facts this
 * platform holds for these tracks: the intake for each of them collects the
 * participant's name, date of birth, mailing location and case facts, and asks
 * for no telephone number and no e-mail. So they are declared required before
 * filing and named in the instructions, rather than filled from something the
 * platform does not have.
 */
const PARTICIPANT_PARTS = {
  "p1-y63970-x14328": { section: CAPTION, label: "COUNTY OF", ...WRITE("matter.county") },
  "p1-y62590-x7202": { section: CAPTION, label: "Judicial district of the district court", ...WRITE("matter.court") },
  "p1-y58450-x9722": { section: CAPTION, label: "In re, the petitioner's name", ...WRITE("participant.full_legal_name") },
  "p1-y19586-x7202": { section: PETITIONER_BLOCK, label: "Petitioner Name", ...WRITE("participant.full_legal_name") },
  "p1-y16826-x7202": {
    section: PETITIONER_BLOCK, label: "Petitioner Address",
    ...SUPPLY(
      "your full mailing address on this one line -- street, city, state and ZIP. The court mails the notice of hearing "
      + "to it. The platform holds every part of it, and the shared fact registry has no one-line mailing-address fact: "
      + "the only address descriptor is the street line, and a street with no city on the line the court mails to is worse "
      + "than a line you complete yourself. The gap is recorded in build-findings.json"
    )
  },
  "p1-y14066-x7202": {
    section: PETITIONER_BLOCK, label: "Petitioner Telephone Number",
    ...SUPPLY("the telephone number the court should use to reach you about the hearing")
  },
  "p1-y11306-x7202": {
    section: PETITIONER_BLOCK, label: "Petitioner Email Address",
    ...SUPPLY("the e-mail address the court should use to reach you about the hearing, if you have one")
  }
};

/** The page-2 service blocks, in the order the form prints them. */
const SERVICE_BLOCK_KEYS = [
  { block: 1, name: "p2-y70908-x7202", agency: "p2-y68146-x7202", address: "p2-y65386-x7202", phone: "p2-y62626-x7202", email: "p2-y59866-x7202" },
  { block: 2, name: "p2-y55726-x7202", agency: "p2-y52963-x7202", address: "p2-y50203-x7202", phone: "p2-y47443-x7202", email: "p2-y44683-x7202" },
  { block: 3, name: "p2-y40543-x7202", agency: "p2-y37783-x7202", address: "p2-y35021-x7202", phone: "p2-y32261-x7202", email: "p2-y29501-x7202" },
  { block: 4, name: "p2-y25361-x7202", agency: "p2-y22601-x7202", address: "p2-y19838-x7202", phone: "p2-y17078-x7202", email: "p2-y14318-x7202" }
];

const FIELD_TITLES = {
  name: "Name",
  agency: "Agency (if applicable)",
  address: "Address",
  phone: "Telephone Number",
  email: "Email Address"
};

/**
 * The twenty page-2 blanks, disposed according to whether this route serves
 * anybody.
 *
 * `service` is either the string "none" -- meaning Rule 1-077.1(E) NMRA
 * entitles no responding party to notice on this track, so nothing can be
 * served, nothing can object, and nobody can ever be entitled to notice under
 * the form's own USE NOTES -- or a description of who this route serves, in
 * which case the blocks are the petitioner's to complete for any party that
 * filed and served an objection.
 */
export function serviceBlocksOf({ service, trackName }) {
  const servesNobody = service === "none";
  const out = {};
  for (const block of SERVICE_BLOCK_KEYS) {
    for (const part of ["name", "agency", "address", "phone", "email"]) {
      const section = `Parties entitled to notice: block ${block.block} of 4`;
      const label = `${FIELD_TITLES[part]}, party entitled to notice, block ${block.block} of 4`;
      out[block[part]] = servesNobody
        ? {
          section,
          label,
          ...INAPPLICABLE(
            "Rule 1-077.1(E) NMRA entitles no responding party to notice of a "
            + `${trackName} petition, so nothing is served. The form's own USE NOTES on page 3 limit these blocks to `
            + "\"the petitioner and any party that filed and served objections to the petition for expungement pursuant "
            + "to Rule 1-077.1(G)(1) NMRA no later than sixty-three (63) days from the date of service\", and a party "
            + "that was never served can neither be served with an objection nor start a period that runs from the date "
            + "of service. The petitioner is the only party entitled to notice on this track, and the petitioner's own "
            + "block is on page 1.",
            `no party other than the petitioner can be entitled to notice on the ${trackName} track, so this block of the `
            + "form is not reached. The packet says so to the participant rather than leaving four blocks of blanks "
            + "unexplained."
          )
        }
        : {
          section,
          label,
          ...SUPPLY(
            `the ${FIELD_TITLES[part].toLowerCase()} of a party that filed and served an objection to your petition. `
            + `On the ${trackName} track the petition is served (${service}), so a party that objects under Rule `
            + "1-077.1(G)(1) NMRA is entitled to notice of the hearing and goes in one of these four blocks. Leave a "
            + "block empty if nobody objected."
          )
        };
    }
  }
  return out;
}

/** The whole dictionary for one route. */
export function dictionary4960_1({ service, trackName }) {
  return { ...PARTICIPANT_PARTS, ...COURT_PARTS, ...serviceBlocksOf({ service, trackName }) };
}
