#!/usr/bin/env node
/**
 * FABLE-B12 composed-treatment builder — Mississippi § 99-15-59 uncharged or
 * unprosecuted misdemeanor, twelve-month branch.
 *
 *   node "scripts/build-census-v1-composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one route:
 *
 *   obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * The committed route contract (src/lib/legal-authority/routes/mississippi.json,
 * decision LD-MS-01, rule MS-DEFINITIVE-THIRTEEN-ROUTE-MAP-2026-07-01) makes
 * this the NO-CHARGE branch of Miss. Code Ann. § 99-15-59: an
 * elapsed-eligibility clock of twelve months anchored on the arrest date —
 * "twelve months after the arrest or citation date where no formal charge or
 * prosecution has followed" — with recorded exclusions "Misdemeanor only",
 * "No charge or prosecution during the twelve months" and "Nothing pending",
 * outcomeMode participant_packet, and packet components "Petition under
 * § 99-15-59", "Arrest record" and "Proposed order". The compiled MS profile
 * carries the statute's recorded substance: a person arrested, cited, or
 * held for a misdemeanor and not formally charged or prosecuted within 12
 * months of arrest may apply to the court with jurisdiction for expungement.
 * No official statewide form is named by any committed record for this
 * branch, and the MS legal-design memo carries no track for it — the route
 * contract is its controlling record. Custom pleading is therefore the
 * correct deliverable: a composed petition and proposed order, with the
 * arrest record as a participant attachment.
 *
 * The dismissed-charge branch of § 99-15-59 is a DIFFERENT route
 * (uncharged-misdemeanor-immediate-dismissal-branch) with its own family;
 * the contract records that "the twelve-month clock applies to the no-charge
 * branch only", and this packet states that boundary.
 *
 * The legacy Mississippi generator grants nothing here: preservation of its
 * assets is not authority (ADR-0004), this family opens no commercial route,
 * and this build touches no runtime.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_WORKLIST_ID = "composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59";

const SPEC = {
  familyId: FAMILY_WORKLIST_ID,
  worklistGroupId: FAMILY_WORKLIST_ID,
  buildScript: "scripts/build-census-v1-composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59--custom-pleading",
  jurisdiction: "MS",
  legalName: "Petition for Expungement of an Uncharged or Unprosecuted Misdemeanor After Twelve Months, Miss. Code Ann. § 99-15-59",
  routeName: "expunging a Mississippi misdemeanor arrest or citation that was never formally charged or prosecuted within twelve months, under Miss. Code Ann. § 99-15-59",
  statutes: ["Miss. Code Ann. § 99-15-59"],
  routes: [
    { routeKey: "obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59" }
  ],

  records: [
    {
      recordId: "route-contract:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59",
      path: "src/lib/legal-authority/routes/mississippi.json",
      role: "the committed route contract (LD-MS-01, definitive thirteen-route map): the twelve-month no-charge branch, its exclusions, its timing anchor, and the packet components this build composes",
      mustContain: [
        "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59",
        "twelve months after the arrest or citation date where no formal charge or prosecution has followed",
        "Uncharged or unprosecuted misdemeanor — no-charge branch",
        "Misdemeanor only",
        "No charge or prosecution during the twelve months",
        "Nothing pending",
        "Petition under § 99-15-59",
        "Arrest record",
        "Proposed order",
        "The twelve-month clock applies to the no-charge branch only."
      ]
    },
    {
      recordId: "compiled-profile:MS-mississippi",
      path: "src/lib/rcap-engine/compiled/profiles/MS-mississippi.json",
      role: "the compiled Mississippi profile carrying the statute's recorded substance for this branch",
      mustContain: [
        "Under 99-15-59, a person arrested, cited, or held for a misdemeanor and not formally charged or prosecuted within 12 months of arrest, or whose charge was dismissed, may apply to the court with jurisdiction for expungement."
      ]
    }
  ],

  components: [
    "primary_filing",
    "proposed_order",
    "filing_instructions"
  ],
  componentTitles: {
    primary_filing: "Petition for Expungement Under Miss. Code Ann. Sec. 99-15-59",
    proposed_order: "Proposed Order of Expungement Under Miss. Code Ann. Sec. 99-15-59",
    filing_instructions: "Filing Instructions"
  },
  componentConditions: {
    proposed_order:
      "Travels with the petition only; nothing on it is decided, signed or dated by the participant."
  },
  componentDescriptions: {
    primary_filing: "the composed petition to the court with jurisdiction over the matter, on the twelve-month no-charge ground",
    proposed_order: "the proposed order the court may sign; every decision and signature line is the court's and is left blank",
    filing_instructions: "the branch boundary, the arrest-record attachment, and when to stop and get help"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Magnolia Street, Jackson, MS 39201",
      "participant.phone": "601-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Tallahatchie Crossing Road, Apartment 14B, Gulfport, Mississippi 39501-2214",
      "participant.phone": "(228) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the committed route contract (src/lib/legal-authority/routes/mississippi.json, "
    + "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59, decision LD-MS-01) and the compiled "
    + "Mississippi profile (src/lib/rcap-engine/compiled/profiles/MS-mississippi.json), both bound by SHA-256 and "
    + "anchor-verified at build time",

  formIdentityNote:
    "No committed record names an official statewide form for the § 99-15-59 twelve-month no-charge branch, and "
    + "the route contract's own packet components are a composed petition, the participant's arrest record, and a "
    + "proposed order. Both filing pages are therefore composed by this build from the committed records. The "
    + "dismissed-charge branch of the same statute is a different route with its own family, and the contract "
    + "records that the twelve-month clock applies to the no-charge branch only. The retired legacy Mississippi "
    + "generator grants nothing here: its assets are preserved history, not authority, and this family opens no "
    + "commercial route.",

  routeSelectionNote:
    "One route, one instrument set: the petition states the twelve-month no-charge ground of § 99-15-59 in its "
    + "own title and body, and no election control exists on any composed page. The no-charge-versus-dismissal "
    + "fork within § 99-15-59 is a route boundary between two families, not a choice inside this packet: a "
    + "participant whose charge was dismissed is told to stop, because that is the immediate-dismissal branch's "
    + "instrument.",

  instructionsIntro: [
    "The recorded Mississippi rule this packet is built on: a person arrested, cited, or held for a MISDEMEANOR, and not formally charged or prosecuted within twelve months of the arrest, may apply to the court with jurisdiction for expungement under Miss. Code Ann. § 99-15-59. The recorded conditions are exact: misdemeanor only; no charge or prosecution during the twelve months; nothing pending.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every arrest fact belongs to the record itself, so every one of them is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  instrumentChoice: null,
  documentsToObtain: [
    ["Your arrest record for the matter - the route contract makes it a named component of this packet, filed with the petition", "the arresting or citing agency, or the court with jurisdiction over the matter"],
    ["Anything showing the arrest or citation date exactly", "the arrest record itself, or the agency that made the arrest or issued the citation"]
  ],
  steps: [
    "**Confirm the branch.** This packet is only for a misdemeanor arrest or citation that was NEVER formally charged or prosecuted, where twelve months have passed since the arrest or citation date, and nothing is pending. If the charge was filed and then dismissed, stop: that is the dismissal branch of § 99-15-59, and its instrument is not in this packet.",
    "**Count the twelve months from the arrest or citation date.** The recorded clock runs from that date, and it must have fully passed with no formal charge and no prosecution.",
    "**Get your arrest record** and fill in every dotted blank from it. Do not guess a date, an offense wording or an agency name.",
    "**Sign and date the petition yourself.** The platform never signs for you and never dates a signature.",
    "**File the petition, the arrest record and the unsigned proposed order with the court with jurisdiction over the matter.** The office of that court can confirm it is the right court, how it accepts filings, and whether a filing fee applies - no committed record this packet is built from states one.",
    "**Keep the proposed order unsigned.** Every decision on it is the court's."
  ],
  deliberatelyBlank: [
    "**Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every line of the proposed order that decides anything**, including the court's signature and date. The order is the court's to make.",
    "**The case number, both in the petition's caption and in the proposed order's caption.** If the court assigns one, it does so at filing - and the proposed order is filed together with the petition, before any number exists, so neither caption can carry one when you file. Leave both blank; the clerk adds the number."
  ],
  notTold: [
    "**Whether a filing fee applies, and how the petition must be delivered.** Neither is established by the committed records this packet is built from. The office of the court with jurisdiction over the matter is the authority that can answer both — ask before you file.",
    "**Whether related counts change anything.** The route contract asks about related counts as a required fact; if there are any, get help rather than guessing."
  ],
  stopConditions: [
    "the matter was a felony, or anything other than a misdemeanor — the recorded exclusion is misdemeanor only;",
    "a formal charge was filed, or any prosecution activity happened, during the twelve months — the recorded clock applies to the no-charge branch only;",
    "the charge was filed and then dismissed — that is the dismissal branch, whose instrument is not in this packet;",
    "anything is pending against you arising from the matter — the recorded exclusion is nothing pending;",
    "there are related counts and you are unsure how they are treated;",
    "any immigration question is involved."
  ],
  whatThisIsNot:
    "This is a prepared set of composed pleadings. It is not an official Mississippi form — no committed record "
    + "names one for this branch — and it is not legal advice, it is not filed for you, and it does not decide "
    + "whether the court will grant expungement. It is also not the instrument for a dismissed charge, a "
    + "conviction, a nonadjudication, or any other Mississippi route: each of those is its own family.",

  receiptDoesNotEstablish: [
    "that any particular matter is a misdemeanor, uncharged, unprosecuted, or free of pending proceedings",
    "that the retired legacy Mississippi generator conveys any authority to this family — it does not"
  ],

  buildFindings: [
    {
      finding:
        "The MASTER_QUEUE row binds no document source, and that is the recorded design: no committed record names "
        + "an official statewide form for the § 99-15-59 twelve-month no-charge branch, and the route contract's "
        + "own packet components are a composed petition, the participant's arrest record, and a proposed order.",
      consequence:
        "Both filing pages are composed from the committed records, each bound by SHA-256 and anchor-verified "
        + "before composing. The arrest record is a named participant attachment, disclosed in the instructions. "
        + "No form was substituted and none was invented."
    },
    {
      finding:
        "The route contract walls this branch off from the dismissal branch of the same statute: 'The "
        + "twelve-month clock applies to the no-charge branch only.'",
      consequence:
        "The petition states the no-charge ground as route-determined text, and a participant whose charge was "
        + "dismissed is told to stop, because that branch has its own family and instrument."
    },
    {
      finding:
        "No committed record states the filing fee, the delivery method, or which specific court has jurisdiction "
        + "for any particular arrest — the contract records venue as a required fact of the participant's matter.",
      consequence:
        "The court identity is a required-before-filing blank with the court's own office named as the checkable "
        + "authority, and fee and delivery are delegated to that office. Nothing was guessed."
    },
    {
      finding:
        "The retired legacy Mississippi generator covered Mississippi expungement routes, and its assets are "
        + "preserved under ADR-0004.",
      consequence:
        "Nothing from the legacy generator was used as authority, no commercial route is opened, and this build "
        + "touches no runtime. Commercial authority, if it ever comes, comes from a Grade-A fulfillment record "
        + "and from nothing else."
    }
  ],
  counselQuestions: [
    "The composed petition asserts the § 99-15-59 twelve-month no-charge ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for this branch.",
    "The petition is addressed to 'the court with jurisdiction over the matter' with the court identity as a participant blank, because no committed record resolves venue further for an uncharged arrest. Confirm that presentation or supply a venue rule.",
    "No committed record states a filing fee for this branch; the packet delegates the question to the court's office. Confirm the delegation or supply the fee content.",
    "The proposed order expunges the record of arrest on the recorded ground with every decision line blank. Confirm its wording."
  ],
  reviewersAttention: [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family serves ONLY the twelve-month no-charge branch; the immediate-dismissal branch of § 99-15-59 is a separate family with its own instrument."
  ],

  /* ---- composed bodies ------------------------------------------------------- */
  composedBody(componentId, facts) {
    const name = facts["participant.full_legal_name"];
    const dob = facts["participant.date_of_birth"];
    const address = facts["participant.street_address"];
    const phone = facts["participant.phone"];
    const email = facts["participant.email"];
    const L = [];
    L.push(this.componentTitles[componentId].toUpperCase(), "");
    if (componentId === "primary_filing") {
      L.push("IN THE ............................................................ COURT");
      L.push("OF ............................................................, MISSISSIPPI");
      L.push("(THE COURT WITH JURISDICTION OVER THE MATTER, AND ITS COUNTY OR CITY - that court's own office can confirm both)", "");
      L.push(`IN RE: ${name},`);
      L.push("PETITIONER.", "");
      L.push("Case number, if the court assigns one at filing:");
      L.push(DOTS(), "");
      L.push("PETITION FOR EXPUNGEMENT UNDER MISS. CODE ANN. Sec. 99-15-59");
      L.push("(MISDEMEANOR ARREST OR CITATION - NO FORMAL CHARGE OR PROSECUTION WITHIN TWELVE MONTHS)", "");
      L.push(`1. The petitioner, ${name}, was arrested, issued a citation, or held for a misdemeanor in this jurisdiction, and states that no formal charge was filed and no prosecution followed within twelve months of the arrest or citation date, and that nothing arising from the matter is pending. The petitioner therefore applies to this court, as the court with jurisdiction over the matter, for expungement of the record under Miss. Code Ann. Sec. 99-15-59.`, "");
      L.push("2. The petitioner further states:", "");
      L.push(`Petitioner's date of birth: ${dob}`, "");
      L.push("Misdemeanor offense for which the petitioner was arrested, cited, or held, worded exactly as the arrest record words it:");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("Date of the arrest or citation, exactly as the arrest record states it:");
      L.push(DOTS(), "");
      L.push("Name of the agency that made the arrest or issued the citation:");
      L.push(DOTS(), "");
      L.push("Arrest, citation, or booking number, if one appears on the arrest record:");
      L.push(DOTS(), "");
      L.push("3. Twelve months have passed since the date stated above. No formal charge was filed and no prosecution followed during that period, and nothing arising from the matter is pending.", "");
      L.push("4. Filed with this petition are the petitioner's arrest record for the matter and a proposed order.", "");
      L.push("5. The petitioner asks the court to expunge the record of the arrest or citation described above.", "");
      L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
      L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push(`TELEPHONE: ${phone}`);
      L.push(`EMAIL: ${email}`);
    } else if (componentId === "proposed_order") {
      L.push("IN THE ............................................................ COURT");
      L.push("OF ............................................................, MISSISSIPPI", "");
      L.push(`IN RE: ${name},`);
      L.push("PETITIONER.", "");
      L.push("Case number, if one was assigned:");
      L.push(DOTS(), "");
      L.push("PROPOSED ORDER", "");
      L.push("This matter came before the Court on the petition of the petitioner for expungement under Miss. Code Ann. Sec. 99-15-59 of a misdemeanor arrest or citation not formally charged or prosecuted within twelve months. The Court, having considered the petition and the arrest record filed with it,", "");
      L.push("ORDERS that " + DOTS(56), "");
      L.push("(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)", "");
      L.push("DATED " + DOTS(30), "");
      L.push(DOTS(50));
      L.push("(The court signs here if, and only if, it grants the petition.)");
    } else {
      L.push(`This packet is prepared for ${this.routeName}.`, "");
      L.push(`Prepared for: ${name}`, "");
      L.push("THE ONE BRANCH THIS PACKET IS FOR", "");
      L.push("A misdemeanor arrest or citation that was NEVER formally charged or prosecuted, where twelve months have passed since the arrest or citation date and nothing is pending. The recorded rule: the twelve-month clock applies to the no-charge branch only. If your charge was filed and then dismissed, stop - that is the dismissal branch of Sec. 99-15-59, and its instrument is not in this packet.", "");
      L.push("WHAT YOU DO, IN ORDER", "");
      L.push("STEP ONE. Confirm the branch: misdemeanor only; no formal charge and no prosecution during the twelve months; nothing pending.");
      L.push("STEP TWO. Get your arrest record for the matter from the arresting or citing agency, or from the court with jurisdiction. It is a named component of this packet and is filed with the petition.");
      L.push("STEP THREE. Fill in every dotted blank from the arrest record. Do not guess a date, an offense wording or an agency name.");
      L.push("STEP FOUR. Sign and date the petition yourself.");
      L.push("STEP FIVE. File the petition, the arrest record and the unsigned proposed order with the court with jurisdiction over the matter. Ask that court's office whether a filing fee applies and how it accepts filings - no committed record this packet is built from states either.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
      L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
      L.push("- the matter was anything other than a misdemeanor;");
      L.push("- a formal charge was filed, or any prosecution activity happened, during the twelve months;");
      L.push("- the charge was filed and then dismissed - that is the dismissal branch, a different instrument;");
      L.push("- anything arising from the matter is pending;");
      L.push("- there are related counts and you are unsure how they are treated;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("This is a prepared set of composed pleadings. It is not an official Mississippi form - no committed record names one for this branch - and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.");
    }
    L.push("", `Route: ${this.routes[0].routeKey}`);
    return L.join("\n");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "primary_filing") {
      writes.push(
        h.write("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name"),
        h.write("date_of_birth", "Petitioner's date of birth, printed in the petition's statement of facts", "participant.date_of_birth"),
        h.write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
        h.write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
        h.write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
      );
      refusals.push(
        h.rbf("jurisdiction_court", "Court named in the caption - the court with jurisdiction over the matter, and its county or city",
          "the name of the court with jurisdiction over the matter, and its county or city - that court's own office can confirm both",
          "which court has jurisdiction over an uncharged arrest is a fact of the participant's matter, and no committed record resolves it further"),
        h.rbf("offense_description", "Misdemeanor offense for which the petitioner was arrested, cited, or held, worded exactly as the arrest record words it",
          "the misdemeanor offense, worded exactly as the arrest record words it",
          "no offense fact is held for a record the platform has not seen"),
        h.rbf("arrest_date", "Date of the arrest or citation, exactly as the arrest record states it",
          "the arrest or citation date, copied exactly - the recorded twelve-month clock runs from it",
          "the eligibility clock runs from a date on the participant's own arrest record"),
        h.rbf("arresting_agency", "Name of the agency that made the arrest or issued the citation",
          "the name of the agency that made the arrest or issued the citation, from the arrest record",
          "an agency name is a case fact the participant can obtain, not a field the court owns"),
        h.rbf("arrest_number", "Arrest, citation, or booking number, if one appears on the arrest record",
          "the arrest, citation, or booking number, copied from the arrest record if one appears there",
          "no record identifier is held for a record the platform has not seen"),
        h.clerkBlank("case_number", "Case number of this petition, if the court assigns one at filing",
          "if a number is assigned, the court assigns it at filing"),
        h.protectedBlank("petitioner_signature", "Signature of the petitioner on the petition",
          "the petitioner signs the petition personally"),
        h.protectedBlank("signature_date", "Date beside the petitioner's signature on the petition",
          "a date written before the petition is signed would be false")
      );
    } else if (componentId === "proposed_order") {
      writes.push(h.write("petitioner_name", "Petitioner named in the caption of the proposed order", "participant.full_legal_name"));
      refusals.push(
        h.rbf("order_court_name", "Court named in the caption of the proposed order, and its county or city",
          "the same court name and county or city you wrote in the petition's caption",
          "the proposed order travels with the petition and carries the same caption the participant establishes"),
        // The same fact as primary_filing.case_number, and therefore the same
        // classification. A verifier established that this blank was recorded
        // as a participant obligation on the order while the petition recorded
        // it as court-owned, so one file told the participant both that the
        // number was theirs to supply and that the court assigns it. It is
        // court-owned: the proposed order is filed together with the petition,
        // before any number exists, so a number the court assigns AT filing
        // cannot be supplied BEFORE it. The blank on the delivered order does
        // not move; only its classification and its disclosure change.
        h.clerkBlank("order_case_number", "Case number in the caption of the proposed order, if the court assigns one at filing",
          "if a number is assigned, the court assigns it at filing - the proposed order is filed with the petition, before any number exists"),
        h.clerkBlank("order_decision", "The decision line of the proposed order, decided by the court",
          "every decision on the proposed order is the court's"),
        h.clerkBlank("order_signature", "Signature line of the proposed order, for the court",
          "the court signs the order if, and only if, it grants the petition"),
        h.clerkBlank("order_date", "Date line of the proposed order, for the court",
          "the court dates the order when it decides")
      );
    } else {
      writes.push(h.write("petitioner_name", "Person named on this page", "participant.full_legal_name"));
    }
    return { writes, refusals };
  }
};

/* ============================================================================
 * SHARED COMPOSED-TREATMENT BUILD CORE (identical across the FABLE-B12
 * composed-treatment builders; adapted from the working pattern in
 * scripts/build-census-v1-va_exp_identity_used_by_another-set.mjs).
 *
 * Everything above this line is the family's own: its committed-record
 * bindings, its composed bodies, its field maps, its instructions content.
 * Everything below is family-independent plumbing: deterministic rendering,
 * byte proof, the builder's own count of the nine completeness counters, and
 * the census-v1 output records.
 * ========================================================================== */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
export const DOTS = (n = 84) => ".".repeat(n);

/* ---- committed-record binding ------------------------------------------------ *
 * This family binds no Master Library binary: its sourceStatus is
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT and its authority is a set of COMMITTED
 * repository records — the route contract, the controlling legal decision and
 * the legal-design record named in SPEC.records. Each is bound by exact
 * SHA-256 at build time, and each anchor string is a statement this build
 * RELIES ON, re-read from the committed bytes before anything is composed.
 * The build refuses if a record is missing or an anchor is no longer there.
 */
function resolveRecords() {
  const resolved = [];
  const failures = [];
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const missing = (rec.mustContain ?? []).filter((a) => !text.includes(a));
    if (missing.length > 0) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`, missingAnchors: missing });
      continue;
    }
    resolved.push({
      recordId: rec.recordId, path: rec.path, role: rec.role,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length
    });
  }
  return { resolved, failures };
}

/* ---- deterministic composed-page rendering ---------------------------------- */
export function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- field-map helpers, in the maps-with-canonical-and-boundary shape -------- */
function mapHelpers(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    clerkBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why) => ({
      ...base(id, label),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

function composedMap(componentId) {
  const h = mapHelpers(componentId);
  const { writes, refusals } = SPEC.mapFor(componentId, h);
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: SPEC.componentRoutes?.[componentId] ?? SPEC.routes[0].routeKey,
      ...(SPEC.componentConditions[componentId] ? { conditional: true, conditionDescription: SPEC.componentConditions[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom: SPEC.composedFromNote,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. Wrapped lines are joined on spaces
 * before matching, because the renderer wraps at word boundaries.
 */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ----------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: false,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.components.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${SPEC.routeName}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  if (SPEC.instrumentChoice) {
    out.push(`## ${SPEC.instrumentChoice.heading}`, "");
    for (const p of SPEC.instrumentChoice.intro) out.push(p, "");
    out.push("| Instrument | When it is yours |", "| --- | --- |");
    for (const [instr, when] of SPEC.instrumentChoice.rows) out.push(`| ${instr} | ${when} |`);
    out.push("");
    for (const p of SPEC.instrumentChoice.footnotes ?? []) out.push(p, "");
  }

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c}\` | ${SPEC.componentDescriptions[c]} |`);
  out.push("");

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    out.push("## Documents you must obtain before filing", "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${SPEC.componentTitles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  if ((SPEC.notTold ?? []).length > 0) {
    out.push("## What this packet does not tell you", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help instead of filing", "");
  for (const s of SPEC.stopConditions) out.push(`- ${s}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeKey).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------------ */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveRecords();
  if (failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed record this family composes from is missing or no longer carries an anchor statement, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = SPEC.components.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      components: SPEC.components,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = SPEC.components.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of SPEC.components) {
      const body = SPEC.composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, SPEC.componentTitles[componentId]);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: SPEC.components
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings",
      fixture: fixtureName, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.worklistGroupId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod: "committed repository records bound by exact SHA-256 at build time, with every relied-on statement re-read from the committed bytes as an anchor before composing",
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    /* Bound as committedRecords, not documents: these are the AUTHORITY this
     * family composes from, not documents of the packet, and no rendered
     * artifact should be expected to carry them. */
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role,
      anchorStatementsVerified: r.anchorsVerified
    })),
    composedComponentsAuthoredByThisBuild: SPEC.components,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family composes for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey), renderStrategy: "composed_pleading",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole: "none — this family composes from committed records; no official binary is bound and none is included",
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote: SPEC.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    boundReferenceSource: null,
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note: "Every written fact value was read back from the extracted text of its component's own pages in the saved packet bytes, not from this builder's intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId, blocking: [],
    findings: SPEC.buildFindings
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "custom_pleading",
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    components: SPEC.components,
    documents: SPEC.components,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
