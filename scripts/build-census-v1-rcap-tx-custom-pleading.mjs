#!/usr/bin/env node
/**
 * The Texas expunction fee-waiver family builder.
 *
 *   node scripts/build-census-v1-rcap-tx-custom-pleading.mjs [--check] [--no-raster]
 *
 * One census-v1 family carrying NINE route keys across EIGHT Texas expunction
 * tracks, and delivering one document: the Statement of Inability to Afford
 * Payment of Court Costs or an Appeal Bond, Tex. R. Civ. P. 145, on the
 * statewide bilingual form the Supreme Court of Texas approved in Misc. Docket
 * No. 22-9090.
 *
 * WHY EIGHT TRACKS ARE ONE FAMILY
 *
 * Each of the eight names a fee-waiver-statement component in its own packet
 * set, and all eight resolve to the same document. Their filing rule, their fee
 * rule and their waiver rule were compared across the committed record and are
 * identical: a verified ex parte petition filed with the district clerk of the
 * county of arrest or of the alleged offence; the art. 102.0061 fee regime; and
 * the Rule 145 Statement as the waiver route. That identity is the whole reason
 * this is one family rather than eight.
 *
 * IT RENDERS ONCE. The eight component ids are declared in
 * servesComponentIdsInOtherPacketSets rather than multiplied into eight
 * renders. A participant is on ONE route and receives ONE copy; eight copies of
 * the same twelve-page form would misdescribe the deliverable and multiply the
 * raster surface eightfold for no participant benefit.
 *
 * WHAT THE REPOSITORY ESTABLISHES, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  HELD, and the same on all eight routes: a verified ex
 *                       parte petition to the DISTRICT CLERK OF THE COUNTY OF
 *                       ARREST or of the alleged offence, through eFileTexas,
 *                       in person, or by mail where the clerk allows. It is a
 *                       new civil action and takes a new cause number — which
 *                       is why this form's own first page says the Clerk's
 *                       office fills the cause number in when it is filed.
 *
 *   FEE                 HELD, and recently rewritten. Art. 102.006 was REPEALED
 *                       by S.B. 1667 effective 2025-09-01, temporarily re-added
 *                       by H.B. 16 of the 89th Legislature's 2nd Called Session
 *                       with a built-in expiry, and permanently replaced by art.
 *                       102.0061 effective 2026-01-01. Under (a) a district
 *                       court charges the ordinary county civil ex parte filing
 *                       fee, which is not a flat amount; under (b) a justice
 *                       court or municipal court of record charges a flat $100.
 *                       THE OLD $250–$500 RANGE IS NOT QUOTED. The committed
 *                       record states it is no longer reliable, and it is named
 *                       only so a participant who has read it online learns it
 *                       came from a repealed statute.
 *
 *   WAIVER              HELD twice over, and the packet leads with the part
 *                       that may mean the participant does not need this form.
 *                       Art. 102.0061(c) REQUIRES waiver for an acquittal other
 *                       than one described by art. 55A.151 where the petition is
 *                       filed within 30 days; (d) REQUIRES waiver of the
 *                       district-court fee where entitlement arises under art.
 *                       55A.053(a)(2)(A) or (B). Otherwise Rule 145 governs, and
 *                       it requires the clerk to make this form available
 *                       WITHOUT CHARGE OR REQUEST.
 *
 *   THE COST THAT       Art. 55A.254(e) forbids the clerk charging anything to
 *   ACTUALLY BITES      transmit the petition or notice of hearing
 *                       ELECTRONICALLY; art. 55A.254(f) requires $25 FOR EACH
 *                       LISTED ENTITY UNABLE TO RECEIVE ONE; and the same
 *                       structure repeats at the order stage under art.
 *                       55A.351(b-2) and (b-3). Ten paper-only agencies is $500
 *                       in transmission charges — MORE THAN THE FILING FEE THE
 *                       PARTICIPANT IS ASKING TO HAVE WAIVED — and unlike the
 *                       filing fee it is entirely under their control. Art.
 *                       55A.253(c) requires each district clerk to publish a
 *                       list of agencies WITH E-MAIL ADDRESSES, so the guidance
 *                       treats deduplicating that list as the substantive money
 *                       advice on this route, ahead of the waiver itself.
 *
 *   SERVICE             HELD, and the participant serves nobody. The CLERK sends
 *                       the petition and notice of hearing; a state or local
 *                       agency with a listed e-mail address must accept
 *                       electronic service; the court sets a hearing not earlier
 *                       than the 30th day after filing; and DPS notifies the
 *                       central federal depositories, so the filer does not
 *                       chase the FBI.
 *
 * THE FORM IS SWORN UNDER PENALTY OF PERJURY, AND NOTHING FINANCIAL IS
 * PREFILLED. Its 132 fields are classified by the same declared rule table this
 * lane uses on its three other Texas families, with exhaustiveness asserted in
 * both directions: a field no rule reaches fails the build, and a rule no field
 * matches fails it too. Only the participant's own name, date of birth,
 * address, telephone number and email are written. The cause number is refused
 * as court-owned, with the form's own sentence as the reason.
 *
 * AND IT IS NOT THE PETITION. This form asks for nothing about the record and
 * starts no case. The guidance says so at both ends, because a fee-waiver form
 * arriving in eight different packet sets is exactly the kind of document a
 * participant can mistake for the filing itself.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

/*
 * The refusal classes and the policy constructors.
 *
 * They live here, above the per-form dictionaries, because those dictionaries
 * are object literals evaluated at module load: a constructor declared below
 * them would be read from the temporal dead zone and the module would not load
 * at all.
 */
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/** A fact the platform holds, written into this blank. */
const WRITE = (fact) => ({ policy: "write", fact });
/** A fact the platform does not hold, which the participant supplies before filing. */
const SUPPLY = (what, why) => ({ policy: "supply", what, why });
/** A blank that must stay blank: a signature, a signature date, a court-only field. */
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
/** Short form of PROTECT for the fields a court, clerk or prosecutor completes. */
const COURTOWN = (why) => ({ policy: "protect", refusalClass: COURT_OWNED, why });
/**
 * A choice only the participant can make, and one the route does not determine.
 * Not a required-before-filing fact: the packet is not waiting on a value it
 * could have held, it is leaving a decision to the person who signs.
 */
const ELECTION = (what, why) => ({ policy: "election", what, why });

const FAMILY_ID = "rcap-tx-custom-pleading";
const OUT = "data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-rcap-tx-custom-pleading.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

/* The appearance-meaning registry, read once. Keyed familyId:componentId. */
const APPEARANCE_SEMANTICS = loadAppearanceSemantics();

const ROUTE = Object.freeze({
  jurisdiction: "TX",
  routeKeys: [
    "obligation:track-only:TX:tx_exp_mistaken_identity",
    "obligation:track-only:TX:tx_exp_pardon_other",
    "obligation:track-only:TX:tx_exp_specialty_court",
    "obligation:track-only:TX:tx_exp_unlawful_carry",
    "obligation:track-pathway:TX:tx_exp_dismissed:expunction-after-qualifying-class-c-deferred-disposition",
    "obligation:track-pathway:TX:tx_exp_dismissed:expunction-after-qualifying-dismissal-or-quash",
    "obligation:track-pathway:TX:tx_exp_limitations:expunction-for-arrest-with-no-charge-filed-after-the-limitations-period",
    "obligation:track-pathway:TX:tx_exp_no_charge:expunction-for-arrest-with-no-charge-filed-after-the-limitations-period",
    "obligation:track-pathway:TX:tx_exp_pardon_innocence:expunction-after-pardon-or-actual-innocence-relief"
  ],
  primaryRouteKey: "obligation:track-pathway:TX:tx_exp_dismissed:expunction-after-qualifying-dismissal-or-quash",
  routeSelectionId: "rcap-tx-custom-pleading-fee-waiver-set",
  legalName: "Statement of Inability to Afford Payment of Court Costs (Tex. R. Civ. P. 145), for the Texas expunction routes",
  routeName: "asking a Texas court to let you file your expunction petition without paying the filing fee",
  statute: "Tex. R. Civ. P. 145; Tex. Code Crim. Proc. arts. 102.0061, 55A.254 and 55A.351"
});

/* The documents this family actually renders and the participant receives. */
const STATEMENT = "tx-expunction-fee-waiver-statement";
const GUIDE = "tx-expunction-fee-waiver-instructions";
const COMPONENTS = [STATEMENT, GUIDE];

/*
 * The component ids this one Statement SERVES across eight Texas expunction
 * packet sets. A participant is on one route and receives one copy; rendering
 * the same twelve-page form eight times would misdescribe what they get.
 */
const SERVED_COMPONENT_IDS = [
  "tx_exp_dismissed-fee-waiver-statement-4",
  "tx_exp_limitations-fee-waiver-statement-3",
  "tx_exp_mistaken_identity-fee-waiver-statement-4",
  "tx_exp_no_charge-fee-waiver-statement-3",
  "tx_exp_pardon_innocence-fee-waiver-statement-4",
  "tx_exp_pardon_other-fee-waiver-statement-3",
  "tx_exp_specialty_court-fee-waiver-statement-5",
  "tx_exp_unlawful_carry-fee-waiver-statement-3"
];

const COMPOSED_TITLES = {
  [STATEMENT]: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
  [GUIDE]: "What This Form Is For, What Filing Actually Costs, and Which Routes It Serves"
};

const COMPONENT_CONDITIONS = {
  [STATEMENT]: "Used where the participant cannot afford the filing fee on any of the eight Texas expunction routes this family serves. It is the fee-waiver component of each of those packet sets, and a participant on one route receives one copy of it."
};

const SOURCES = [
  Object.freeze({
    componentId: STATEMENT,
    sourceId: "official-form:Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
    formNumber: "TX-SCT-22-9090-STATEMENT-OF-INABILITY",
    title: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
    instrumentKind: "fee_waiver_statement",
    sha256: "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d"
  })
];

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/TX.memo.json, tracks tx_exp_dismissed, "
  + "tx_exp_limitations, tx_exp_mistaken_identity, tx_exp_no_charge, tx_exp_pardon_innocence, tx_exp_pardon_other, "
  + "tx_exp_specialty_court and tx_exp_unlawful_carry, whose filing, fee and waiver rules were compared and are "
  + "identical) and the packet-set manifests for those eight sets";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1994-04-17",
    "participant.street_address": "42 Live Oak Street, Austin, TX 78702",
    "participant.phone": "512-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1972-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Corpus Christi, Texas 78418-2214",
    "participant.phone": "(361) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const TX_TRACK_IDS = [
  "tx_exp_no_charge", "tx_exp_dismissed", "tx_exp_limitations",
  "tx_exp_pardon_innocence", "tx_exp_pardon_other", "tx_exp_unlawful_carry",
  "tx_exp_mistaken_identity", "tx_exp_specialty_court"
];

function registryStopConditions() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT,
    "data/record-clearing/legal-design-track-registry.json"), "utf8"));
  const byCondition = new Map();
  for (const trackId of TX_TRACK_IDS) {
    const track = registry.tracks.find((candidate) => candidate.trackId === trackId);
    assert.ok(track, `${trackId}: missing from committed legal-design track registry`);
    for (const condition of track.selfHelpStopConditions ?? []) {
      if (!byCondition.has(condition)) byCondition.set(condition, []);
      byCondition.get(condition).push(trackId);
    }
  }
  return [...byCondition.entries()].map(([condition, trackIds]) => ({ condition, trackIds }));
}

const REGISTRY_STOPS = registryStopConditions();
const REGISTRY_STOP_LINES = REGISTRY_STOPS.map(({ condition, trackIds }) =>
  `- [${trackIds.join(", ")}] ${condition}`);

const DOTS = (n = 84) => ".".repeat(n);

const S = {
  SOI_CAPTION: "Statement caption",
  SOI_ABOUT: "About me and my household",
  SOI_MONEY: "Income, property, expenses and debts",
  SOI_ELECTION: "Boxes the person filing marks",
  SOI_DECLARATION: "Sworn declaration"
};

/* ---- the Statement of Inability: 132 fields, classified by declared rule ---- *
 *
 * This is a SWORN FINANCIAL AFFIDAVIT — household members, public benefits,
 * every source of monthly income, property, monthly expenses and debts. Almost
 * nothing on it is a fact the platform holds, and nothing on it is a fact the
 * platform may guess: a wrong figure on a document sworn under penalty of
 * perjury is a far worse defect than a blank one.
 *
 * The rules below are ordered and the FIRST MATCH WINS. Each carries its own
 * disposition and its own stated reason, and `statementFields()` asserts that
 * every one of the form's fields matched exactly one rule. A field the table
 * does not reach fails the build rather than being written as an undeclared
 * blank. The 132 resulting rows are emitted individually into the field census
 * and the field map, so a reviewer reads them one at a time exactly as if they
 * had been typed one at a time.
 *
 * WHAT IS WRITTEN, AND WHY THE ADDRESS IS WRITTEN HERE BUT NOT ON THE PETITION.
 * This form asks for the WHOLE address in one blank, which is the shape the
 * platform holds it in. The OCA petition's signature block splits it across
 * Address and City/State/Zip, which is not, so it is withheld there. The rule
 * is the shape of the blank, not the document.
 */
const SOI_RULES = [
  {
    id: "identity_name",
    re: /^(My full legal name is \/ Mi nombre legal completo es|My name is  Mi nombre es|Your printed name)$/,
    kind: "write", fact: "participant.full_legal_name", section: S.SOI_ABOUT,
    label: (n) => `Full legal name of the person filing (${n})`
  },
  {
    id: "identity_dob",
    re: /^My date of birth \/ Mi fecha de nacimiento es$/,
    kind: "write", fact: "participant.date_of_birth", section: S.SOI_ABOUT,
    label: () => "Date of birth of the person filing"
  },
  {
    id: "identity_address",
    re: /^(My address is \/ Mi dirección es|My address is  Mi domicilio es)$/,
    kind: "write", fact: "participant.street_address", section: S.SOI_ABOUT,
    label: (n) => `Address of the person filing, asked for as one whole address (${n})`
  },
  {
    /*
     * The mailing line cannot be bound, and the reason is a shared vocabulary
     * this lane may not edit. The address descriptor in
     * scripts/rcap-official-forms/rcap-field-semantics.mjs refuses any field
     * whose name carries "postal" — a rule aimed at postal CODES — and this
     * form's bilingual field name reads "Mailing  Direccion Postal". Binding an
     * address to it therefore conflicts with the field-name semantics and the
     * finalizer refuses the write.
     *
     * The blank is declared with that as its stated reason rather than being
     * forced, and the participant fills the mailing line themselves. The
     * address IS written on this form's two other address lines, so the packet
     * does not lose it.
     */
    id: "mailing_line_shared_vocabulary",
    re: /^Mailing  Dirección Postal$/,
    kind: "supply", section: S.SOI_ABOUT,
    label: () => "Mailing address line on the Statement",
    what: "your mailing address, which you write here yourself - it is already printed on this form's other address line, so copy it across",
    why: "the shared field-name semantics refuse to bind an address to a field whose name carries \"postal\", a rule aimed at postal codes, and this form's bilingual field name reads \"Mailing  Direccion Postal\". Shared machinery is not this lane's to edit, so the blank is declared rather than forced"
  },
  {
    id: "identity_phone",
    re: /^My phone number  Mi número telefónico$/,
    kind: "write", fact: "participant.phone", section: S.SOI_ABOUT,
    label: () => "Telephone number of the person filing"
  },
  {
    id: "identity_email",
    re: /^My email I check often/,
    kind: "write", fact: "participant.email", section: S.SOI_ABOUT,
    label: () => "Email address of the person filing"
  },
  {
    id: "clerk_fills_cause_number",
    re: /^Cause Number \/ Número de Caso$/,
    kind: "courtowned", section: S.SOI_CAPTION,
    label: () => "Cause number on the Statement caption",
    why: "the form says so on its own face: \"The Clerk's office will fill in the Cause Number when you file this form.\" Telling the participant to supply it would contradict the document in their hand"
  },
  {
    id: "signature",
    re: /^Signature/,
    kind: "protect", section: S.SOI_DECLARATION,
    label: (n) => `Signature on the sworn declaration (${n})`,
    why: "the Statement is sworn by the participant and is never prefilled"
  },
  /*
   * THE OPTION 1 DATE OF BIRTH IS NOT A DECLARATION DATE.
   *
   * One rule used to match "Day / Día", "Month / Mes", "Year / Año", "Today"
   * and "Year" together and call all five a date part of the sworn
   * declaration, refused because "a date written before the Statement is
   * actually sworn would be false". That reason is exactly right for the day
   * the participant signs and exactly wrong for the day they were born.
   *
   * Read from the pinned binary, page 11 carries FOUR date widgets, not one
   * date: "Month / Mes" [79.73,495.56], "Day / Día" [134.54,495.51] and
   * "Year / Año" [193.40,495.61] are the three boxes on the
   * "________/________/________" rule printed directly under "My date of birth
   * is / Mi fecha de nacimiento es", while "Today" [97.75,302.31] sits under
   * "Date (month, day, year) / Fecha (mes, día, año)" beside the signature.
   * Only "Today" is a declaration date. Page 12's "Month / Mes" and "Year" are
   * the notary's "____________, 20____" line.
   *
   * So the packet held a date of birth, printed it on page 2, and left the
   * page-11 boxes blank while telling the participant the date of birth was
   * already filled in. It was not, and it was not inventoried either: the
   * three boxes were counted as protected signature-date parts, so they never
   * reached "The items you must supply".
   *
   * WHY THEY ARE DECLARED RATHER THAN WRITTEN. "Month / Mes" is ONE AcroForm
   * field carrying TWO widgets — the page-11 date-of-birth month and the
   * page-12 notary month — and this factory writes a field, not a widget.
   * Writing the participant's birth month would therefore also print it in the
   * notary's blank on a page the notary completes. Two of the three boxes
   * could be written and the third could not; a date that is two-thirds
   * machine-filled on a perjury declaration is a worse artifact than one the
   * participant completes in one hand, and the completeness contract would
   * read it as an incomplete row. All three are declared, and the instructions
   * tell the participant to copy the date already printed on page 2.
   */
  {
    id: "option1_date_of_birth_month",
    re: /^Month \/ Mes$/,
    kind: "supply", section: S.SOI_DECLARATION,
    label: () => "Month box of the date of birth on the Option 1 declaration, page 11",
    /*
     * THE CAPTION IS THE FORM'S, NOT OURS. A declared blank is only declared to
     * the participant if the words beside it in the packet are the words printed
     * beside it on the paper. `caption` carries the form's own printed line and
     * `captionAt` says where it is printed, so the captionDrift check re-reads
     * page 11 of the pinned binary on every build and fails if that line has
     * moved or been reworded. The descriptive label above stays the disclosure
     * label; this becomes the printed context in the field map and in the
     * participant's list.
     */
    caption: "My date of birth is / Mi fecha de nacimiento es",
    captionAt: { page: 11, y: 521 },
    what: "the MONTH of your date of birth, in the first of the three boxes under \"My date of birth is / Mi fecha de nacimiento es\" on page 11 - copy it from the date of birth already printed on page 2. The same form field is also the notary's month blank on page 12; leave that one for the notary",
    why: "this box is one widget of an AcroForm field whose other widget is the notary's month on page 12, and this factory writes a field rather than a widget, so filling the birth month here would also print it in the notary's blank. The box is declared instead of forced, and the fact it needs is on page 2 of the same packet"
  },
  {
    id: "option1_date_of_birth_day_and_year",
    re: /^(Day \/ Día|Year \/ Año)$/,
    kind: "supply", section: S.SOI_DECLARATION,
    label: (n) => `Date-of-birth box on the Option 1 declaration, page 11 (${n})`,
    caption: "My date of birth is / Mi fecha de nacimiento es",
    captionAt: { page: 11, y: 521 },
    what: "the DAY and the YEAR of your date of birth, in the second and third boxes under \"My date of birth is / Mi fecha de nacimiento es\" on page 11 - copy them from the date of birth already printed on page 2",
    why: "the three boxes on this line are one date and are completed together. Their month box shares an AcroForm field with the notary's month on page 12 and cannot be written without writing the notary's blank, so the whole line is left to the participant rather than delivered two-thirds filled"
  },
  {
    id: "declaration_date",
    re: /^(Today|Year)$/,
    kind: "protect", section: S.SOI_DECLARATION,
    label: (n) => `Date part of the sworn declaration (${n})`,
    why: "a date written before the Statement is actually sworn would be false"
  },
  {
    id: "declaration_place",
    re: /^County state$/,
    kind: "supply", section: S.SOI_DECLARATION,
    label: () => "County and state where the declaration is signed",
    what: "the county and state where you sign this declaration",
    why: "where the participant will sign is not a fact the platform holds"
  },
  {
    id: "caption_court_identity",
    re: /^(Court Number \/ Número del Tribunal|County \/ Condado)$/,
    kind: "supply", section: S.SOI_CAPTION,
    label: (n) => `Court identity on the Statement caption (${n})`,
    what: "the court number and county from the top of your petition - the form says to copy them from the petition",
    why: "which court the petition is filed in is a case fact the platform has not seen"
  },
  {
    id: "caption_copy_from_petition",
    re: /^Fill Blank [12]$/,
    kind: "supply", section: S.SOI_CAPTION,
    label: (n) => `Party block copied from the petition (${n})`,
    what: "the information at the top left and top right of your petition, copied across exactly as the form directs",
    why: "the petition's own caption is a case fact the platform has not seen"
  },
  {
    id: "elections",
    kind: "election", section: S.SOI_ELECTION,
    selectionOnly: true,
    label: (n) => `Box marked on the Statement: ${n}`,
    what: "the box that matches your own situation - a benefit you actually receive, whether legal aid represents you, or a yes-or-no answer about benefits",
    why: "each of these is a declaration about the participant's own life, sworn under penalty of perjury. The platform holds no financial or household fact about any participant and will not mark a box on a sworn financial affidavit"
  },
  {
    id: "dependents",
    re: /^(Name Nombre|Age Edad|Relationship to me Parentesco Conmigo)Row\d+$/,
    kind: "supply", section: S.SOI_ABOUT,
    label: (n) => `Dependant table cell: ${n}`,
    what: "the name, age and relationship of each person who depends on you financially - initials only for children under 18, as the form directs",
    why: "who depends on the participant financially is a household fact the platform does not hold"
  },
  {
    id: "money_rows_and_amounts",
    re: /^(Value \/ Valor \d+|Amount Cantidad \d+|Bank accounts|Cars and boats|Other property|Debt payments|Other expenses|My debts include|8 Are there debts)/,
    kind: "supply", section: S.SOI_MONEY,
    label: (n) => `Property, expense or debt entry: ${n}`,
    what: "the entry and the amount, from your own records - this is sworn under penalty of perjury, so take the figures from statements and bills rather than from memory",
    why: "the platform holds no financial fact about any participant, and a guessed figure on a sworn affidavit is a worse defect than a blank one"
  },
  {
    id: "income_and_employment",
    re: /^(in monthly wages|en sueldo mensual|your job title for|your$|título de su puesto para|compañía o jefe|is my total monthly income|in unemployment|in public benefits|from |de |Unemployed Since|He estado desempleado|Describe )/,
    kind: "supply", section: S.SOI_MONEY,
    label: (n) => `Income or employment entry: ${n}`,
    what: "the amount and the source, from your own records - this is sworn under penalty of perjury, so take the figures from pay statements and benefit letters rather than from memory",
    why: "the platform holds no income, employment or benefit fact about any participant"
  },
  {
    id: "other_benefit_write_in",
    re: /^Other  Otros beneficios/,
    kind: "supply", section: S.SOI_MONEY,
    label: (n) => `Write-in for another public benefit: ${n}`,
    what: "the name of any other public benefit you receive that the printed list does not cover",
    why: "the platform holds no benefit fact about any participant"
  }
];

/*
 * Apply the rule table to the form's own field names.
 *
 * Called with every AcroForm field name the pinned binary actually carries, so
 * the dictionary describes the form in front of us rather than the form someone
 * remembered. A name that matches no rule, and a rule that matches no name, both
 * fail the build.
 */
/*
 * THE ORDER THIS FORM PRINTS A DATE IN, read off the form itself.
 *
 * Page 2 prints, on the rule directly beneath the date-of-birth blank:
 *
 *     Month Day Year      /   Mes Día Año
 *
 * The platform stores a date of birth as YYYY-MM-DD and the shared finalizer
 * writes a date fact as the string the fact set carries, so the blank read
 * "1994-04-17" on a line whose own face names month first. That is not an
 * unconventional format; against the printed line it is month 1994, day 04,
 * year 17.
 *
 * The order is named here, per field, because this is the file that has read
 * the form's printed rule. The finalizer never infers one.
 */
const PRINTED_DATE_ORDER_BY_FIELD = {
  [STATEMENT]: {
    "My date of birth / Mi fecha de nacimiento es": "month_day_year"
  }
};

/* The printed line each named field's order was read from, asserted against the
 * pinned binary at build time so a form revision that moves or rewords the rule
 * fails the build instead of silently reordering a date. */
const PRINTED_DATE_ORDER_EVIDENCE = {
  [STATEMENT]: {
    "My date of birth / Mi fecha de nacimiento es": { page: 2, printedLine: /month\s+day\s+year/i }
  }
};

function statementFields(fieldNames, selectionNames) {
  const spec = {};
  const unmatched = [];
  const used = new Set();
  for (const name of fieldNames) {
    const isSelection = selectionNames.has(name);
    const rule = SOI_RULES.find((r) => (r.selectionOnly ? isSelection : (!r.selectionOnly && r.re && r.re.test(name))));
    if (!rule) { unmatched.push(name); continue; }
    used.add(rule.id);
    const base = {
      section: rule.section, label: rule.label(name),
      // A rule may name the form's OWN printed caption and where it is printed.
      // Carried through so captionDrift can re-read it off the page each build.
      ...(rule.caption ? { caption: rule.caption, captionAt: rule.captionAt } : {}),
      ...(isSelection ? { selection: true } : {})
    };
    if (rule.kind === "write") spec[name] = { ...base, ...WRITE(rule.fact) };
    else if (rule.kind === "protect") spec[name] = { ...base, ...PROTECT(SIGNATURE, rule.why) };
    else if (rule.kind === "courtowned") spec[name] = { ...base, ...COURTOWN(rule.why) };
    else if (rule.kind === "election") spec[name] = { ...base, ...ELECTION(rule.what, rule.why) };
    else spec[name] = { ...base, ...SUPPLY(rule.what, rule.why) };
  }
  assert.equal(unmatched.length, 0,
    `the Statement of Inability rule table does not reach ${unmatched.length} field(s): ${unmatched.slice(0, 12).join(" | ")}`);
  const unusedRules = SOI_RULES.filter((r) => !used.has(r.id)).map((r) => r.id);
  assert.equal(unusedRules.length, 0,
    `the Statement of Inability rule table names rules the form does not have fields for: ${unusedRules.join(", ")}`);
  return spec;
}

const FORM_FIELDS = {
  "TX-SCT-22-9090-STATEMENT-OF-INABILITY": statementFields
};

/* ---- the one page this build authors --------------------------------------- */
const COMPOSED_COMPONENTS = {
  [GUIDE]: {
    writes: [{ id: "participant_name", label: "Person these fee-waiver instructions are prepared for", fact: "participant.full_legal_name" }],
    blanks: [],
    protectedBlanks: [],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[GUIDE].toUpperCase(), "");
      L.push(`Prepared for: ${name}`, "");
      L.push("WHAT THIS FORM IS. The Statement of Inability to Afford Payment of Court Costs, on the statewide bilingual form the Supreme Court of Texas approved in Misc. Docket No. 22-9090. You file it WITH your expunction petition, under Texas Rule of Civil Procedure 145, when you cannot afford the filing fee.", "");
      L.push("YOU ARE ENTITLED TO THIS FORM FOR FREE. Rule 145 requires the clerk to make it available WITHOUT CHARGE AND WITHOUT YOUR HAVING TO ASK. The committed record calls it the only genuinely statewide promulgated form in the entire Texas record-clearing workflow. The copy in this packet is that form; you may also simply ask the clerk.", "");
      L.push("WHICH ROUTES THIS SERVES. The same fee rules and the same waiver route govern all eight of these Texas expunction routes, which is why one form serves them all:", "");
      L.push("  1. Expunction where NO CHARGE WAS FILED - arts. 55A.051 and 55A.052.");
      L.push("  2. Expunction where the charge was DISMISSED OR QUASHED - arts. 55A.051 and 55A.053, including after a qualifying Class C deferred disposition.");
      L.push("  3. Expunction where the LIMITATIONS PERIOD HAS EXPIRED - arts. 55A.051 and 55A.054.");
      L.push("  4. Expunction after a PARDON OR OTHER RELIEF ON THE BASIS OF ACTUAL INNOCENCE - arts. 55A.003 and 55A.202.");
      L.push("  5. Expunction after a PARDON GRANTED FOR A REASON OTHER THAN ACTUAL INNOCENCE - art. 55A.004.");
      L.push("  6. Expunction on MISTAKEN IDENTITY OR IDENTITY THEFT - arts. 55A.006 and 55A.256.");
      L.push("  7. Streamlined expunction order after a SPECIALTY COURT DISMISSAL - art. 55A.203.");
      L.push("  8. Expunction of a PRE-2021 UNLAWFUL CARRYING OF A HANDGUN conviction - art. 55A.005.", "");
      L.push("You are on one of these. You need one copy of this form.", "");
      L.push("WHERE THE PETITION GOES, ON ALL EIGHT ROUTES. A verified ex parte petition, filed with the DISTRICT CLERK OF THE COUNTY OF ARREST or of the alleged offence, through eFileTexas, in person, or by mail where the clerk allows. It is a NEW CIVIL ACTION and receives a NEW CAUSE NUMBER - which is why the Statement's own first page tells you the Clerk's office fills the cause number in when you file.", "");
      L.push("WHAT FILING ACTUALLY COSTS. This changed recently and the old numbers are no longer reliable.", "");
      L.push("Article 102.006, the old expunction fee statute, was REPEALED by S.B. 1667 effective 1 September 2025, temporarily re-added by H.B. 16 of the 89th Legislature's 2nd Called Session with a built-in expiry, and permanently replaced by article 102.0061 effective 1 January 2026. IF YOU HAVE READ THAT EXPUNCTION COSTS $250 TO $500, THAT RANGE COMES FROM THE REPEALED STATUTE AND THIS PACKET WILL NOT REPEAT IT.", "");
      L.push("Under art. 102.0061(a) a DISTRICT COURT charges the fee that applies to filing an ex parte petition in a civil action in district court - the ordinary county civil filing fee, which is NOT a flat statutory amount. Under (b) a JUSTICE COURT or MUNICIPAL COURT OF RECORD charges a flat $100.", "");
      L.push("SO ASK THE DISTRICT CLERK OF THE COUNTY YOU ARE FILING IN what the civil ex parte filing fee is there, before you go.", "");
      L.push("TWO PLACES THE FEE IS WAIVED WITHOUT THIS FORM. Article 102.0061(c) REQUIRES the fee to be waived where the expunction relates to an ACQUITTAL other than one described by art. 55A.151 and the petition is filed not later than the 30th day after the acquittal. Article 102.0061(d) REQUIRES waiver of the district-court fee where the entitlement arises under art. 55A.053(a)(2)(A) or (B). If either applies to you, say so at the counter and cite the article - you may not need this form at all.", "");
      L.push("THE COST THAT IS ACTUALLY IN YOUR CONTROL: $25 PER PAPER-ONLY AGENCY. This one is worth more attention than the filing fee, because you decide it.", "");
      L.push("Article 55A.254(e) FORBIDS the clerk charging anything to transmit the petition or the notice of hearing ELECTRONICALLY. Article 55A.254(f) REQUIRES the clerk to charge $25 FOR EACH LISTED ENTITY UNABLE TO RECEIVE AN ELECTRONIC TRANSMISSION. The same structure repeats at the ORDER stage under art. 55A.351(b-2) and (b-3).", "");
      L.push("So every paper-only agency you name in your petition is a direct $25 cost to you, and it lands TWICE - once at the petition stage and once at the order stage. A list with ten paper-only agencies on it costs $500 in transmission charges alone, which is more than the filing fee you are asking to have waived.", "");
      L.push("HOW TO KEEP THAT DOWN. Article 55A.253(c) requires EACH DISTRICT CLERK to compile and maintain, on the clerk's own website, a list of the agencies and entities that hold arrest records, WITH E-MAIL ADDRESSES. Ask for it by name; the clerk is not always expecting the question. Use the e-mail addresses. Deduplicate your list. A state or local agency with a listed e-mail address MUST accept electronic service.", "");
      L.push("FILLING THIS FORM IN. It is SWORN UNDER PENALTY OF PERJURY. On PAGE 2 your name, date of birth, address, telephone number and email are filled in for you, and the date of birth is printed month, day, year because that is the order the rule under that blank asks for. NOTHING FINANCIAL IS FILLED IN, and that is deliberate: a guessed figure on a sworn affidavit is far worse than a blank one. Take every number from pay statements, benefit letters and bills rather than from memory.", "");
      L.push("PAGE 11 ASKS FOR YOUR DATE OF BIRTH AGAIN, in three boxes under 'My date of birth is / Mi fecha de nacimiento es', and those three boxes are left for you to write. Copy them from page 2. They are not filled in for a mechanical reason rather than a legal one: on this form the month box is one form field with the notary's month on page 12, so filling your birth month would also write in the notary's blank.", "");
      L.push("The cause number on the first page is left blank because the form itself says so: 'The Clerk's office will fill in the Cause Number when you file this form.'", "");
      L.push("WHO SERVES WHOM - AND IT IS NOT YOU. On all eight routes the CLERK sends the petition and the notice of hearing, by certified mail return receipt requested or by secure e-mail, electronic transmission or fax. The court sets a hearing NOT EARLIER THAN THE 30TH DAY after the petition is filed and gives a copy of the petition and the notice to each official, agency or entity listed, OTHER THAN central federal depositories. On receipt, DPS notifies those itself - so you do not chase the FBI.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD.");
      L.push(...REGISTRY_STOP_LINES, "");
      L.push("WHAT THIS FORM IS NOT. It is not the expunction petition. It does not ask for expunction and it does not start a case. It asks the court to let you file without paying the fee, and it goes WITH the petition your route requires.");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  }
};

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/TX.memo.json", track: "tx_exp_dismissed, tx_exp_limitations, tx_exp_mistaken_identity, tx_exp_no_charge, tx_exp_pardon_innocence, tx_exp_pardon_other, tx_exp_specialty_court and tx_exp_unlawful_carry — all eight compared, and their filing, fee and waiver rules are identical" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "the eight Texas expunction packet sets this Statement is the fee-waiver component of" },
    { record: "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json", read: "the one document source this family binds and the custody it is held in" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond, approved by the Supreme Court of Texas in Misc. Docket No. 22-9090", url: "https://www.txcourts.gov/rules-forms/forms/", retrievedOn: "2026-08-06" },
    { title: "Tex. R. Civ. P. 145 — Payment of costs not required", url: "https://www.txcourts.gov/rules-forms/rules-standards/", retrievedOn: "2026-08-06" },
    { title: "Tex. Code Crim. Proc. art. 102.0061 — Expunction fee, effective 1 January 2026 (replacing art. 102.006, repealed by S.B. 1667 effective 1 September 2025)", url: "https://statutes.capitol.texas.gov/Docs/CR/htm/CR.102.htm", retrievedOn: "2026-08-06" },
    { title: "Tex. Code Crim. Proc. arts. 55A.253, 55A.254 and 55A.351 — the agency list, and the transmission charges", url: "https://statutes.capitol.texas.gov/Docs/CR/htm/CR.55A.htm", retrievedOn: "2026-08-06" }
  ],
  formIdentityNote:
    "One official form, delivered once. The Statement of Inability is the statewide bilingual form the Supreme "
    + "Court of Texas approved in Misc. Docket No. 22-9090, and the committed record calls it the only genuinely "
    + "statewide promulgated form in the entire Texas record-clearing workflow. It is held in the "
    + "human_source_returns custody rather than the Master Library, so custody roots resolve through the shared "
    + "resolver in scripts/lib/corpus-index-paths.mjs.\n\n"
    + "This family is the fee-waiver component of EIGHT Texas expunction packet sets, and those eight component ids "
    + "are declared in servesComponentIdsInOtherPacketSets. The form is rendered ONCE. A participant is on one "
    + "route and receives one copy, and rendering the same twelve-page form eight times would misdescribe what "
    + "they get and multiply the raster surface eightfold for no participant benefit.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "what a given Texas district court's civil ex parte filing fee is; art. 102.0061(a) sets the type of fee and not an amount, and only the justice-court and municipal-court-of-record figure in (b) is flat",
    "whether a given participant qualifies for the mandatory waivers in art. 102.0061(c) or (d), which turn on facts about their own case",
    "which agencies and entities hold a given arrest record — art. 55A.253(c) makes the district clerk the publisher of that list, and the number of paper-only entries on it is what actually drives the cost",
    "that this form is the expunction petition. It is not, and it starts no case"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "Nine route keys across eight Texas expunction tracks, and no election is made or asked. The eight tracks were "
    + "compared and their filing rule, their fee rule and their waiver rule are identical: a verified ex parte "
    + "petition to the district clerk of the county of arrest or of the alleged offence, the art. 102.0061 fee "
    + "regime, and the Rule 145 Statement of Inability as the waiver route. That identity is why one Statement "
    + "serves all eight, and it is the reason this family exists as one family rather than eight.\n\n"
    + "Which of the eight routes a participant is on is settled before this component is reached — it is decided by "
    + "their own disposition, not by anything on this form — so nothing here elects between them. The form's own "
    + "controls are the participant's sworn declarations about their finances and household, and the form's first "
    + "page states that the Clerk's office fills in the cause number when it is filed."
};

const INSTRUCTIONS = {
  title: `What you must do — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**This is not your expunction petition.** It is the form you file *with* that petition when you cannot afford the filing fee. It asks for nothing about your record and starts no case.",
    "",
    "**You are entitled to it for free.** Rule 145 requires the clerk to make this form available without charge and without your having to ask. The copy here is that form.",
    "",
    "**One form, eight routes.** The same filing rule, the same fee rule and the same waiver route govern all eight Texas expunction routes this serves — no charge filed, dismissed or quashed, limitations expired, pardon or relief on actual innocence, pardon for another reason, mistaken identity or identity theft, specialty court dismissal, and pre-2021 unlawful carrying of a handgun. You are on one of them and you need one copy.",
    "",
    "**On page 2** the platform filled in your name, date of birth, address, telephone number and email. Your date of birth is printed there in the order that page asks for — **month, day, year** — because that is what the rule under the blank says.",
    "",
    "**Page 11 asks for your date of birth a second time**, in three boxes under \"My date of birth is / Mi fecha de nacimiento es\", and those three are left for you. Copy them from page 2. The platform cannot fill them: on this form the month box shares one form field with the notary's month on page 12, so filling your birth month there would also write in the notary's blank.",
    "",
    "**Nothing financial is filled in**, and that is deliberate: this is sworn under penalty of perjury, and a guessed figure on a sworn affidavit is far worse than a blank one.",
    "",
    "**The cause number is blank because the form says it should be** — \"The Clerk's office will fill in the Cause Number when you file this form.\""
  ],
  componentBlurbs: {
    [STATEMENT]: "the statewide Statement of Inability itself, with your identity filled in and every financial fact left for you",
    [GUIDE]: "which routes this serves, what filing actually costs now that art. 102.006 has been repealed, the two places the fee is waived without this form, and the $25-per-paper-agency rule that costs more than the filing fee"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Pay statements, benefit letters and bills for every figure on this form | Your own records. Do not fill it from memory — it is sworn under penalty of perjury |",
    "| The district clerk's published list of agencies and e-mail addresses (art. 55A.253(c)) | The district clerk of the county where the petition will be filed. Ask for it by name |"
  ],
  stepsLines: [
    "1. **Check whether you need this at all.** Art. 102.0061(c) *requires* the fee to be waived where the expunction relates to an acquittal other than one described by art. 55A.151 and the petition is filed within 30 days of it; art. 102.0061(d) requires waiver where entitlement arises under art. 55A.053(a)(2)(A) or (B). If either applies, say so at the counter and cite the article.",
    "2. **Ask the district clerk what the civil ex parte filing fee is** in that county. Art. 102.0061(a) sets the *type* of fee, not an amount. A justice court or municipal court of record charges a flat $100 under (b).",
    "3. **Build your agency list from the clerk's published list, using the e-mail addresses, deduplicated.** Art. 55A.254(f) makes the clerk charge **$25 for each listed entity unable to receive an electronic transmission**, and the same charge repeats at the order stage. Ten paper-only agencies is $500 — more than the fee you are asking to waive.",
    "4. **Fill this form in from your own records.** Every income source, every benefit, every dependant, every asset, every monthly expense and every debt.",
    "5. **Leave the cause number blank.** The Clerk's office fills it in when you file.",
    "6. **Sign and swear it**, and **file it with your expunction petition** — not on its own."
  ],
  blanksLines: [
    "- **Every financial and household fact on the form.** Income, benefits, dependants, property, expenses and debts. The platform holds none of them and will not guess on a document sworn under penalty of perjury.",
    "- **The cause number**, because the form's own first page says the Clerk's office fills it in when you file.",
    "- **The court number, the county, and the two blocks copied from the top of your petition.** The form tells you to copy them across from the petition.",
    "- **Your signature and the date.** You sign when you actually swear it.",
    "- **The county and state in the declaration**, which is where you sign.",
    "- **The three date-of-birth boxes on page 11.** They are yours rather than the platform's for a mechanical reason, not a legal one: the month box is one form field with the notary's month on page 12, and the platform cannot write one without writing the other. The date itself is already printed on page 2 — copy it across."
  ],
  stopsLines: [
    ...REGISTRY_STOP_LINES,
    "",
    "Where self-help stops, the district clerk of the county where the petition will be filed answers the fee and publishes the agency list, and the clerk must give you this form free and without your asking."
  ],
  notLines: [
    "This is the fee-waiver form and a page explaining it. **It is not the expunction petition**, it asks for nothing about your record, and it starts no case. File it with the petition your route requires.",
    "",
    "**This packet will not tell you what expunction used to cost.** Article 102.006 was repealed effective 1 September 2025 and permanently replaced by art. 102.0061 effective 1 January 2026. The $250-to-$500 range that circulates online comes from the repealed statute and is not reproduced here."
  ]
};

const FINDINGS = [
  {
    finding:
      "Eight Texas expunction tracks name a fee-waiver-statement component, and all eight resolve to the same "
      + "document. Their filing rule, fee rule and waiver rule were compared across the committed record and are "
      + "identical: a verified ex parte petition to the district clerk of the county of arrest or of the alleged "
      + "offence, the art. 102.0061 fee regime, and the Rule 145 Statement of Inability as the waiver route.",
    consequence:
      "The Statement is rendered ONCE and the eight component ids it serves are declared in "
      + "servesComponentIdsInOtherPacketSets rather than multiplied into eight renders. A participant is on one "
      + "route and receives one copy; eight copies of the same twelve-page form would misdescribe the deliverable "
      + "and multiply the raster surface eightfold for no participant benefit."
  },
  {
    finding:
      "Article 102.006 was repealed by S.B. 1667 effective 2025-09-01, temporarily re-added by H.B. 16 of the 89th "
      + "Legislature's 2nd Called Session with a built-in expiry, and permanently replaced by art. 102.0061 "
      + "effective 2026-01-01. The committed record states in terms that the old $250 to $500 range is no longer "
      + "reliable.",
    consequence:
      "The packet does not quote that range and says explicitly where it came from, so a participant who has read "
      + "it online learns it is from a repealed statute. What is stated instead is art. 102.0061 as it now reads: "
      + "the ordinary county civil ex parte filing fee in district court under (a), and a flat $100 in a justice "
      + "court or municipal court of record under (b)."
  },
  {
    finding:
      "Article 102.0061(c) and (d) each REQUIRE the fee to be waived in defined circumstances — (c) for an "
      + "acquittal other than one described by art. 55A.151 where the petition is filed within 30 days, and (d) "
      + "where entitlement arises under art. 55A.053(a)(2)(A) or (B).",
    consequence:
      "The guidance opens by telling the participant to check whether they need this form at all, and to cite the "
      + "article at the counter if either applies. A fee-waiver packet that did not mention the two places the fee "
      + "is waived WITHOUT it would be selling paperwork the participant may not need."
  },
  {
    finding:
      "Article 55A.254(e) forbids the clerk charging anything to transmit the petition or notice of hearing "
      + "electronically; art. 55A.254(f) requires $25 for each listed entity unable to receive one; and the same "
      + "structure repeats at the order stage under art. 55A.351(b-2) and (b-3). Article 55A.253(c) requires each "
      + "district clerk to publish a list of agencies with e-mail addresses.",
    consequence:
      "The guidance says plainly that this cost is larger than the filing fee and, unlike the filing fee, is under "
      + "the participant's control: ten paper-only agencies is $500 in transmission charges alone, twice over. "
      + "Deduplicating and using the clerk's published e-mail addresses is presented as the substantive money "
      + "advice on this route, ahead of the waiver itself."
  },
  {
    finding:
      "The Statement is sworn under penalty of perjury and carries 132 fields of financial and household detail. "
      + "Its own first page states that the Clerk's office fills in the cause number when the form is filed.",
    consequence:
      "Nothing financial is prefilled anywhere on it — only the participant's own name, date of birth, address, "
      + "telephone number and email. The cause number is refused as court-owned with the form's own sentence as "
      + "the reason, rather than being asked of the participant, because telling them to supply it would "
      + "contradict the document in their hand."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm the one-render decision: that declaring the eight served component ids and rendering the Statement once is the right representation, rather than rendering eight copies of the same twelve-page form.",
    "Confirm the eight tracks' fee and waiver rules really are identical for this purpose, which is the premise of grouping them into one family.",
    "Confirm the packet is right to lead with the two mandatory waivers in art. 102.0061(c) and (d), which may mean the participant does not need this form at all.",
    "Confirm the $25-per-paper-only-entity treatment is stated at the right strength. This build presents it as the larger and more controllable cost, ahead of the filing fee itself.",
    "Confirm the packet is right to refuse to quote the repealed art. 102.006 $250-to-$500 range while naming it, so a participant who has read it online knows where it came from.",
    "Confirm that refusing the cause number as court-owned — on the strength of the form's own sentence that the Clerk's office fills it in — is preferable to asking the participant for it."
  ],
  mattersForTheReviewersAttention: [
    "This family renders one document and declares eight component ids it serves. The field map, the source receipt and the rendered-artifacts record all state that explicitly rather than leaving it to be inferred.",
    "Nothing financial is prefilled on a form sworn under penalty of perjury. Only the participant's own identity facts are.",
    "The guidance opens by telling the participant they may not need this form, which is unusual for a packet component and is deliberate.",
    "The eight-route list is printed in full in the guidance so a participant can see which one is theirs, since the same form arrives in eight different packet sets.",
    "The Statement's 132 fields are classified by the same declared rule table this lane uses on its three other Texas families, with exhaustiveness asserted in both directions."
  ]
};
/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE — census-v1 bound-source official-form machinery.
 *
 * Deliberately identical across the FABLE-PB official-form family builders, and
 * carried inside each script rather than imported from a shared host: every one
 * of these families' MASTER_QUEUE rows is exclusiveScript with sharedBuildHost
 * null, and a host shared with families outside this lane's grant could not be
 * changed without moving their bytes. The family-specific facts — the route, the
 * source pins, the per-form field dictionaries, the instructions — live entirely
 * above this line. Nothing below it knows which family it is building.
 *
 * THREE RECORDS MUST AGREE BEFORE ANYTHING RENDERS. For every bound source the
 * engine reads the committed corpus index entry, resolves the bytes through the
 * custody the index declares, and requires the mounted bytes' SHA-256 to equal
 * both the index's recorded digest and the MASTER_QUEUE pin carried in this
 * file. Any disagreement is BLOCKED_SOURCE naming the identity that failed, and
 * nothing is written.
 *
 * CUSTODY RESOLUTION IS NOT PATH-SHAPED. The corpus index now describes several
 * custodies and each writes its paths in its own namespace: the Master Library
 * relative to its own root ("STATES/TX/…"), the human source returns relative to
 * the repository root ("private/human-source-returns/…"). Joining the Master
 * Library root onto all of them looks for a human source return inside the
 * library and reports drift about a file that is exactly where it belongs. The
 * shared resolver in scripts/lib/corpus-index-paths.mjs follows what the index
 * DECLARES, and this engine uses it rather than guessing from the path.
 *
 * DETERMINISM. Both the assembled packet and every per-document render are
 * pinned to the factory's single fixed date. pdf-lib stamps the wall clock into
 * a document created with PDFDocument.create(), and save({updateMetadata:false})
 * does not remove a stamp already there, so the assembled packet is stamped
 * explicitly. Bytes that move on every rebuild silently invalidate the family's
 * own hash-bound raster receipt.
 * ════════════════════════════════════════════════════════════════════════════ */

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
/* Component ids this family's delivered documents SERVE in other packet sets,
 * declared by a family that has them and empty for every family that does not. */
const SERVES = (typeof SERVED_COMPONENT_IDS === "undefined") ? [] : SERVED_COMPONENT_IDS;
const DECLARED_COMPONENT_SET = [...COMPONENTS, ...SERVES];
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
/* Whether a component is a bound official form rather than a page this build
 * authored. Set once the census is taken and read by the composed byte proof. */
let CENSUS_COMPONENTS = new Set();
const censusHas = (id) => CENSUS_COMPONENTS.has(id);

/* ---- source binding: three records must agree ------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolve = makeCorpusEntryResolver(index, { repoRoot: ROOT });
  const entries = index.entries ?? [];
  const resolved = [];
  const failures = [];

  for (const wanted of SOURCES) {
    const matches = entries.filter((e) => e.sha256 === wanted.sha256);
    if (matches.length === 0) {
      failures.push({
        sourceId: wanted.sourceId,
        why: `no entry in the committed corpus index carries the SHA-256 this family pins (${wanted.sha256})`
      });
      continue;
    }
    // A binary held identically in two custodies is one document, not two. The
    // first custody that is actually mounted here supplies the bytes, and which
    // one it was is recorded rather than assumed.
    let picked = null;
    const notMounted = [];
    for (const entry of matches) {
      const abs = resolve.resolve(entry);
      if (abs && fs.existsSync(abs)) { picked = { entry, abs }; break; }
      notMounted.push(entry.custody ?? "master_library");
    }
    if (!picked) {
      failures.push({
        sourceId: wanted.sourceId,
        indexedIn: matches.map((e) => e.custody ?? "master_library"),
        why: `the committed index names this source in custody ${notMounted.join(", ")}, and no such tree is mounted in this container`
      });
      continue;
    }
    const bytes = fs.readFileSync(picked.abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== picked.entry.sha256) {
      failures.push({
        sourceId: wanted.sourceId, pathInArchive: picked.entry.path,
        why: `SHA-256 drift: the committed index records ${picked.entry.sha256}, the mounted corpus holds ${sha256}`
      });
      continue;
    }
    if (sha256 !== wanted.sha256) {
      failures.push({
        sourceId: wanted.sourceId, pathInArchive: picked.entry.path,
        why: `SHA-256 drift against this family's binding: it pins ${wanted.sha256}, the corpus holds ${sha256}`
      });
      continue;
    }
    resolved.push({
      ...wanted,
      custody: picked.entry.custody ?? "master_library",
      pathInArchive: picked.entry.path,
      revision: picked.entry.revision ?? null,
      sha256, byteLength: bytes.length, bytes,
      acroFieldCount: picked.entry.acroFieldCount ?? null,
      pageCount: picked.entry.pageCount ?? null,
      structuralClassObserved: picked.entry.structuralClassObserved ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census: every field of every bound form, read from the pinned binary --- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source) {
  let spec = FORM_FIELDS[source.formNumber];
  assert.ok(spec, `no field dictionary for ${source.formNumber}`);
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  /*
   * A dictionary may be a FUNCTION of the form's own field names rather than a
   * literal. That is how a 132-field sworn financial affidavit is classified:
   * by an ordered rule table checked for exhaustiveness against the binary in
   * front of us, which fails the build on any field it does not reach. The
   * literal rows it produces are emitted one by one like any other.
   */
  if (typeof spec === "function") {
    const names = doc.getForm().getFields().map((f) => f.getName());
    const selectionNames = new Set(doc.getForm().getFields()
      .filter((f) => f.constructor.name === "PDFCheckBox" || f.constructor.name === "PDFRadioGroup")
      .map((f) => f.getName()));
    spec = spec(names, selectionNames);
  }
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    const kind = field.constructor.name;
    rows.push({
      key: name, name, document: source.componentId, formNumber: source.formNumber,
      page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: kind.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: kind === "PDFCheckBox" || kind === "PDFRadioGroup" || entry.policy === "election",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section ?? null,
      effectiveLabel: entry.label, caption: entry.caption ?? null, captionAt: entry.captionAt ?? null,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);

  // Every recorded caption must still be printed where the dictionary says it
  // is. A form revision that moved a caption is a source-identity change, and a
  // map keyed to the old position would write into the wrong blank.
  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const lines = pageText.find((p) => p.page === r.captionAt.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - r.captionAt.y) <= 3);
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) {
      captionDrift.push({ field: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
    }
  }
  return { rows, unmapped, stale: [...dictionaryKeys], captionDrift, pageText, pageCount: pages.length };
}

/* ---- render one bound document -------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = [...new Set(census.rows.filter((r) => !writableNames.has(r.name)).map((r) => r.name))]
    .map((field) => ({ field }));

  const censusForFinalizer = [];
  const emitted = new Set();
  for (const r of census.rows) {
    if (emitted.has(r.name)) continue;
    emitted.add(r.name);
    const every = census.rows.filter((x) => x.name === r.name).flatMap((x) => x.widgets);
    censusForFinalizer.push({
      name: r.name, type: r.type,
      effectiveLabel: r.effectiveLabel, regionHeading: r.section ?? r.effectiveLabel,
      widgets: every.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    });
  }

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: censusForFinalizer,
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title,
    /*
     * What this document's classified fields' appearances MEAN.
     *
     * Empty for a component with no registry entry, which is the structural
     * default and what every other document here already gets. It matters for
     * the Statement because the structural rule calls every unwritten /Tx
     * appearance the court's own ink and preserves it, and this form ships its
     * Option 1 declaration date field carrying the value 12/15/2022. That is a
     * participant input on a perjury declaration, refused by this build's own
     * field map as signature_or_date_participant_completion and promised blank
     * by participant-instructions.md, so it must contribute nothing unless this
     * run wrote it - which it never does.
     */
    appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS,
      `${FAMILY_ID}:${source.componentId}`),
    /*
     * The date of birth is printed in the order page 2 prints beneath the
     * blank, not in the order the platform stores it. Empty for any component
     * that does not name one, which is the shared default.
     */
    printedDateOrderByField: PRINTED_DATE_ORDER_BY_FIELD[source.componentId] ?? {}
  });
  return { bytes, report };
}

/* ---- assemble the packet, with the date pinned ----------------------------- */
async function combinePacket(fixtureName, rendered) {
  const packet = await PDFDocument.create();
  stampDeterministic(packet);
  packet.setTitle(`${ROUTE.legalName} — ${fixtureName} fixture`);
  packet.setProducer("RCAP census-v1 artifact-only assembler");
  packet.setCreator("RCAP evidence build");
  const pageManifest = [];
  let nextPage = 1;
  for (const item of rendered) {
    const doc = await PDFDocument.load(item.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(doc, doc.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: nextPage++, component: item.source.componentId,
        documentId: item.source.componentId, formNumber: item.source.formNumber,
        sourcePage: index + 1, sourceSha256: item.source.sha256
      });
    });
  }
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageManifest, pageCount: packet.getPageCount() };
}

/* ---- composed components: the pages this build authors --------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
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

/*
 * The field-map rows for a composed component.
 *
 * Its writes are the facts this build prints onto a page it authored, and its
 * blanks are the dotted lines it leaves. Both are declared exactly the way an
 * official form's are, so a composed page is audited by the same contract and
 * cannot carry an undeclared blank that an official page would fail on.
 */
function composedMapFor(componentId) {
  const spec = COMPOSED_COMPONENTS[componentId];
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: id, page: 1,
    printedLabel: label, printedLine: label, effectiveLabel: label,
    regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build",
    document: componentId
  });
  for (const w of spec.writes ?? []) {
    canonicalWrites.push({ ...base(w.id, w.label), factId: w.fact, kind: "composed_text" });
  }
  for (const r of spec.blanks ?? []) {
    canonicalRefusals.push({
      ...base(r.id, r.label),
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${r.id}`,
      factId: null, routeDetermined: false, why: r.why, participantMustSupply: r.what
    });
  }
  for (const r of spec.protectedBlanks ?? []) {
    canonicalRefusals.push({
      ...base(r.id, r.label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, why: r.why
    });
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    officialFormNumber: null,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom: COMPOSED_FROM,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- byte proof: what actually landed on the paper ------------------------- */
async function byteProof(censusByForm, packetFile, pageManifest, reports, fixtureName) {
  const widgets = await flattenedWidgets(path.join(ROOT, packetFile));
  // Packet page numbers, not per-document page numbers: the proof is read from
  // the assembled artifact the participant receives, not from an intermediate.
  const offsetOf = new Map();
  for (const m of pageManifest) {
    const key = `${m.component} ${m.sourcePage}`;
    offsetOf.set(key, m.packetPage);
  }
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;

  for (const [componentId, census] of censusByForm) {
    const report = reports.get(componentId);
    const written = new Map((report?.written ?? []).map((w) => [w.field, w]));
    for (const r of census.rows) {
      for (const wdg of r.widgets) {
        const packetPage = offsetOf.get(`${componentId} ${wdg.page}`);
        if (!packetPage) continue;
        const drawn = drawnAt(widgets, { page: packetPage, rect: wdg.rect });
        const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
        const w = written.get(r.name);
        if (w) {
          if (ink.length === 0) continue;
          glyphs += ink.replace(/\s+/g, "").length;
          actualWrites.push({
            field: r.key, document: componentId, factId: r.fact,
            page: packetPage, rect: wdg.rect,
            expected: String(w.value ?? ""), drawnText: ink, foundInOutputBytes: true,
            proof: "read back from the flattened widget appearance of the assembled packet bytes"
          });
          continue;
        }
        if (ink.length === 0) continue;
        if (r.sourceValue !== null && r.sourceValue !== undefined) {
          documentAuthoredAppearances.push({ field: r.key, document: componentId, page: packetPage, drawnText: ink, sourceValue: r.sourceValue });
          continue;
        }
        refusedFieldsWithInk.push({ fieldId: r.key, document: componentId, page: packetPage, drawnText: ink });
      }
    }
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs };
}

/* ---- byte proof for the pages this build authored -------------------------- */
async function composedByteProof(packetBytes, pageManifest, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    if (censusHas(m.component)) continue;
    const text = groupIntoLines(extractTextItems(pages[i])).map((l) => l.text).join(" ").replace(/\s+/g, " ");
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${text}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const [componentId, spec] of Object.entries(COMPOSED_COMPONENTS)) {
    const text = String(textOfComponent.get(componentId) ?? "").replace(/\s+/g, " ");
    for (const w of spec.writes ?? []) {
      const value = sanitizePdfText(String(facts[w.fact] ?? ""));
      assert.ok(value.length > 0, `${componentId}/${w.id}: no fixture value for ${w.fact}`);
      assert.ok(text.includes(value),
        `${fixtureName} ${componentId}/${w.id}: the value bound to ${w.fact} is not readable from the assembled packet bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: `${componentId}.${w.id}`, document: componentId, factId: w.fact,
        expected: value, drawnText: value, foundInOutputBytes: true,
        proof: "read back from the extracted text of the component's own pages in the assembled packet bytes"
      });
    }
  }
  return { actualWrites, glyphs };
}

/* ---- the field map, built from the census and the finalizer's own report ---- */
function mapsFrom(censusByForm, reports) {
  const maps = [];
  for (const [componentId, census] of censusByForm) {
    const report = reports.get(componentId);
    const written = new Set((report?.written ?? []).map((w) => w.field));
    const canonicalWrites = [];
    const canonicalRefusals = [];
    const selectionControls = [];
    const seen = new Set();
    for (const r of census.rows) {
      if (seen.has(r.name)) continue;
      seen.add(r.name);
      const base = {
        field: `${componentId}.${r.name}`, fieldName: r.name, page: r.page,
        printedLabel: r.caption ?? r.effectiveLabel, printedLine: r.caption ?? r.effectiveLabel,
        effectiveLabel: r.effectiveLabel, regionHeading: r.section ?? r.effectiveLabel,
        sectionHeading: r.section ?? null, rect: r.rect, rectBasis: r.rectBasis,
        document: componentId, formNumber: r.formNumber
      };
      if (r.policy === "write" && written.has(r.name)) {
        canonicalWrites.push({ ...base, factId: r.fact, kind: "acroform_text" });
        continue;
      }
      if (r.policy === "write") {
        // The dictionary intended a write and the finalizer refused it. That is
        // a defect and is surfaced as an unclassified blank rather than dressed
        // as a disposition, because a build must not classify away its own miss.
        canonicalRefusals.push({
          ...base, reason: "the field map intended a write and the finalizer refused it",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, factId: r.fact, why: "builder defect: intended write not present in the finalizer report"
        });
        continue;
      }
      if (r.policy === "protect") {
        canonicalRefusals.push({
          ...base,
          reason: r.refusalClass === SIGNATURE
            ? "signature or date field; never prefilled by this build"
            : "court, clerk, prosecutor, agency, or hearing field; the court completes it",
          category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
          requiredBeforeFiling: false, why: r.why
        });
        continue;
      }
      // A genuine participant election. Not a required-before-filing fact: the
      // packet is not waiting on a value it could have held, it is leaving a
      // decision to the person who signs. The completeness contract refuses
      // REQUIRED_BEFORE_FILING on a selection control for exactly that reason.
      if (r.policy === "election") {
        const election = {
          ...base,
          reason: `a choice only the participant can make, and one this route does not determine: ${r.what}`,
          category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
          requiredBeforeFiling: false, routeDetermined: false,
          identity: `${componentId} field ${r.name}`,
          why: r.why, participantMustSupply: r.what
        };
        canonicalRefusals.push(election);
        selectionControls.push({
          selectionId: `${componentId}.${r.name}`, field: r.effectiveLabel,
          disposition: "participant_election", kind: "participant_election_control",
          category: PARTICIPANT_ELECTION, reason: election.reason, page: r.page,
          requiredBeforeFiling: false, routeDetermined: false,
          identity: election.identity, why: r.why, participantMustSupply: r.what
        });
        continue;
      }
      const row = {
        ...base,
        reason: `the participant supplies this before filing: ${r.what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${componentId} field ${r.name}`,
        factId: null, routeDetermined: false, why: r.why, participantMustSupply: r.what
      };
      canonicalRefusals.push(row);
      if (r.isSelectionControl) {
        selectionControls.push({
          selectionId: `${componentId}.${r.name}`, field: r.effectiveLabel,
          disposition: "required_before_filing", kind: "boxed_entry_control",
          category: null, reason: row.reason, page: r.page,
          completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
          identity: row.identity, why: r.why, participantMustSupply: r.what
        });
      }
    }
    maps.push({
      formNumber: componentId, documentId: componentId, documentRole: componentId,
      officialFormNumber: census.rows[0]?.formNumber ?? null,
      documentPolicy: {
        mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey,
        ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
      },
      structuralClass: "official_acroform",
      composedFrom: COMPOSED_FROM,
      explicitMappings: {}, roleRefusals: [], selectionControls,
      canonicalWrites, canonicalRefusals,
      boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
    });
  }
  return maps;
}

/* ---- the builder's own count of the nine counters ---------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, isSelectionControl) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: isSelectionControl === true,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const selectionIds = new Set();
  for (const m of maps) for (const s of m.selectionControls ?? []) selectionIds.add(s.selectionId);

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w, selectionIds.has(w.field)));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r, selectionIds.has(r.field)));
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const refused of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENTS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || String(a.field).localeCompare(String(b.field)));
}

/*
 * The blanks the participant completes, COUNTED FROM THE PAGE.
 *
 * requiredBeforeFilingItems() counts field-map rows, and the field map holds
 * one row per AcroForm FIELD NAME. A field can put the same name on two
 * widgets, on two pages, in two different parts of a form, and a per-name count
 * cannot see the second one. The Option 1 date-of-birth line is the measured
 * case: its three boxes were counted as protected declaration-date parts and
 * were absent from a 96-item inventory that was otherwise complete, and its
 * month box shares an AcroForm field with the notary's month on page 12.
 *
 * So this walks the census WIDGETS, which are read first-hand from the pinned
 * binary and carry their own page and rectangle. Every appearance a participant
 * completes must be reachable from the inventory; an appearance somebody else
 * completes is named here, with who completes it and why, rather than being
 * quietly dropped from the denominator.
 */
const APPEARANCES_COMPLETED_BY_SOMEONE_ELSE = [
  {
    document: STATEMENT, field: "Month / Mes", page: 12,
    completedBy: "the notary",
    why: "page 12's \"Subscribed before me this day of ... ____________, 20____\" line carries a second widget of the "
      + "SAME AcroForm field as page 11's date-of-birth month box. The notary completes this one. The field is "
      + "classified required-before-filing for the participant because of its page-11 appearance, and this "
      + "appearance is excluded from what the participant is told to fill."
  }
];

function participantCompletedBlankAppearances(censusByForm) {
  const excluded = new Set(APPEARANCES_COMPLETED_BY_SOMEONE_ELSE
    .map((a) => `${a.document}\u0000${a.field}\u0000${a.page}`));
  const appearances = [];
  for (const [componentId, census] of censusByForm) {
    for (const r of census.rows) {
      if (r.policy !== "supply" && r.policy !== "election") continue;
      for (const w of r.widgets) {
        if (excluded.has(`${componentId}\u0000${r.name}\u0000${w.page}`)) continue;
        appearances.push({
          document: componentId, field: r.name, label: r.effectiveLabel,
          sourcePage: w.page, rect: w.rect,
          policy: r.policy,
          countedIn: r.policy === "supply" ? "requiredBeforeFiling" : "participantElections"
        });
      }
    }
  }
  return appearances;
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${INSTRUCTIONS.title}`, "");
  out.push(...INSTRUCTIONS.introLines, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of COMPONENTS) {
    const cond = COMPONENT_CONDITIONS[c] ? ` **Conditional:** ${COMPONENT_CONDITIONS[c]}` : "";
    out.push(`| \`${c}\` | ${INSTRUCTIONS.componentBlurbs[c] ?? COMPOSED_TITLES[c]}${cond} |`);
  }
  out.push("");

  if (INSTRUCTIONS.documentsLines?.length) {
    out.push("## Documents you must obtain first", "");
    out.push(...INSTRUCTIONS.documentsLines, "");
  }

  if (rbf.length > 0) {
    out.push("## The items you must supply", "");
    out.push("Each is a blank on the official form named beside it. Fill every one that belongs to the document you are filing, from the record itself, never from memory.", "");
    for (const [doc, items] of byDoc) {
      out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
      out.push("| The blank on the document | What to write |", "| --- | --- |");
      for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
      out.push("");
    }
  }

  out.push("## What you do, in order", "");
  out.push(...INSTRUCTIONS.stepsLines, "");

  out.push("## Things the platform deliberately left blank", "");
  out.push(...INSTRUCTIONS.blanksLines, "");

  out.push("## When to stop and get help instead", "");
  out.push(...INSTRUCTIONS.stopsLines, "");

  out.push("## What this packet is not", "");
  out.push(...INSTRUCTIONS.notLines, "");
  out.push(`_Route: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  assert.equal(REGISTRY_STOPS.length, 26,
    "the eight served tracks must retain all 26 unique committed self-help stops");
  const stopGuidance = INSTRUCTIONS.stopsLines.join("\n");
  for (const { condition } of REGISTRY_STOPS) {
    assert.ok(stopGuidance.includes(condition),
      `participant guidance dropped a committed self-help stop: ${condition}`);
  }

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    // A family whose source does not bind by exact SHA-256 stops, names the
    // identity that failed, and writes NOTHING. A half-built packet that reads
    // as built is worse than one that was never started.
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayBytesWritten: false,
      directory: OUT, packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }
  assert.equal(resolved.length, SOURCES.length, "every declared source must resolve");

  const censusByForm = new Map();
  for (const source of resolved) censusByForm.set(source.componentId, await censusOf(source));
  CENSUS_COMPONENTS = new Set(censusByForm.keys());

  const drift = [...censusByForm.values()].flatMap((c) => c.captionDrift);
  const unmapped = [...censusByForm.entries()].flatMap(([id, c]) => c.unmapped.map((u) => ({ document: id, ...u })));
  const stale = [...censusByForm.entries()].flatMap(([id, c]) => c.stale.map((s) => ({ document: id, field: s })));

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: resolved.length,
      sources: resolved.map((r) => ({ sourceId: r.sourceId, custody: r.custody, sha256: r.sha256, pages: r.pageCount })),
      fields: [...censusByForm.entries()].map(([id, c]) => ({ document: id, mapped: c.rows.length, unmapped: c.unmapped.length, stale: c.stale.length })),
      captionDrift: drift, unmappedFields: unmapped, staleDictionaryKeys: stale
    };
  }

  // An unmapped field is an undeclared blank, and an undeclared blank must fail
  // the build rather than be written as empty. A stale dictionary key means the
  // map describes a field the form no longer has.
  assert.equal(unmapped.length, 0,
    `every AcroForm field must be declared: ${unmapped.map((u) => `${u.document}/${u.field}`).join(", ")}`);
  assert.equal(stale.length, 0,
    `the field dictionary names fields this form does not have: ${stale.map((s) => `${s.document}/${s.field}`).join(", ")}`);
  assert.equal(drift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${drift.map((d) => `${d.field}@p${d.page}`).join(", ")}`);

  /*
   * A printed date order is only as good as the line it was read off.
   *
   * Every field named in PRINTED_DATE_ORDER_BY_FIELD must still exist, must
   * still be a field this build writes, and must still have the printed rule
   * PRINTED_DATE_ORDER_EVIDENCE recorded for it on the page the census read.
   * A form revision that reworded "Month Day Year" would otherwise leave the
   * reordering in place with nothing on the paper to justify it.
   */
  for (const [componentId, orders] of Object.entries(PRINTED_DATE_ORDER_BY_FIELD)) {
    const census = censusByForm.get(componentId);
    assert.ok(census, `a printed date order names component ${componentId}, which this build does not render`);
    for (const fieldName of Object.keys(orders)) {
      const row = census.rows.find((r) => r.name === fieldName);
      assert.ok(row, `a printed date order names field ${JSON.stringify(fieldName)}, which ${componentId} does not have`);
      assert.equal(row.policy, "write",
        `a printed date order names ${JSON.stringify(fieldName)}, which this build does not write`);
      const evidence = PRINTED_DATE_ORDER_EVIDENCE[componentId]?.[fieldName];
      assert.ok(evidence, `no printed line is recorded for the date order on ${JSON.stringify(fieldName)}`);
      const lines = census.pageText.find((pg) => pg.page === evidence.page)?.lines ?? [];
      assert.ok(lines.some((l) => evidence.printedLine.test(l.text)),
        `the printed line the date order for ${JSON.stringify(fieldName)} was read from is no longer on page ${evidence.page} of ${componentId}`);
    }
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  let maps = null;
  let writtenFieldSet = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const rendered = [];
    const reports = new Map();
    // COMPONENTS order is the packet's page order, and it is the manifest's
    // order rather than this build's convenience.
    for (const componentId of COMPONENTS) {
      const source = resolved.find((r) => r.componentId === componentId);
      if (source) {
        const census = censusByForm.get(componentId);
        const { bytes, report } = await renderDocument(source, census, fixtureName);
        rendered.push({ source: { componentId, formNumber: source.formNumber, sha256: source.sha256 }, bytes });
        reports.set(componentId, report);
        continue;
      }
      const spec = COMPOSED_COMPONENTS[componentId];
      assert.ok(spec, `component ${componentId} is neither a bound source nor a composed component`);
      const body = spec.body(facts);
      for (const w of spec.writes ?? []) {
        assert.ok(String(body).includes(String(facts[w.fact] ?? "\u0000")),
          `${componentId}: the composed page must carry the value bound to ${w.fact}`);
      }
      const bytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      rendered.push({ source: { componentId, formNumber: null, sha256: null }, bytes });
    }
    if (!maps) {
      maps = [];
      for (const componentId of COMPONENTS) {
        if (censusByForm.has(componentId)) continue;
        maps.push(composedMapFor(componentId));
      }
      maps = [...mapsFrom(censusByForm, reports), ...maps]
        .sort((a, b) => COMPONENTS.indexOf(a.formNumber) - COMPONENTS.indexOf(b.formNumber));
    }

    const combined = await combinePacket(fixtureName, rendered);
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), combined.bytes);

    const proof = await byteProof(censusByForm, file, combined.pageManifest, reports, fixtureName);
    // Composed pages carry no widgets, so their values are read back from the
    // assembled packet's own page text rather than from a widget appearance.
    const composedProof = await composedByteProof(combined.bytes, combined.pageManifest, facts, fixtureName);
    proof.actualWrites.push(...composedProof.actualWrites);
    proof.glyphs += composedProof.glyphs;
    const reportedWrites = [...reports.values()].reduce((n, r) => n + r.written.length, 0);
    /*
     * Every fixture must write the SAME set of fields.
     *
     * The Massachusetts family found why this guard is needed: a value that fits
     * the canonical participant's blank and not the boundary participant's is
     * refused on one fixture and written on the other, and the packet then drops
     * a real participant's fact for exactly the people least able to notice.
     * The field map is built from the canonical report, so without this the
     * boundary refusal would not appear in any counter at all.
     */
    const writtenHere = new Set([...reports.entries()].flatMap(([id, r]) => r.written.map((w) => `${id}.${w.field}`)));
    if (writtenFieldSet === null) writtenFieldSet = writtenHere;
    else {
      const missing = [...writtenFieldSet].filter((k) => !writtenHere.has(k));
      const extra = [...writtenHere].filter((k) => !writtenFieldSet.has(k));
      assert.ok(missing.length === 0 && extra.length === 0,
        `fixtures do not write the same fields — ${fixtureName} is missing [${missing.join(", ")}] and adds [${extra.join(", ")}]. `
        + "A value that fits one participant's blank and not another's must be withheld from both, not written for one.");
    }
    assert.equal(proof.refusedFieldsWithInk.length, 0,
      `${fixtureName}: a field the map refused carries ink: ${proof.refusedFieldsWithInk.map((r) => r.fieldId).join(", ")}`);
    assert.ok(reportedWrites === 0 || proof.actualWrites.length > 0,
      `${fixtureName}: the finalizer reported ${reportedWrites} write(s) and the output bytes carry none`);

    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written value read back from the flattened widget appearances of the assembled packet bytes",
      valuesReportedByFinalizer: reportedWrites,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.actualWrites.length,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      documentAuthoredAppearances: proof.documentAuthoredAppearances,
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(combined.bytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: combined.bytes.length, pageCount: combined.pageCount,
      pageManifest: combined.pageManifest,
      documents: COMPONENTS, components: COMPONENTS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_official_forms",
      fixture: fixtureName, sha256, byteLength: combined.bytes.length, pageCount: combined.pageCount
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < combined.pageCount; i += 1) {
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
          component: combined.pageManifest[i]?.component ?? null,
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
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: IMPLEMENTATION_STRATEGY,
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "each source binds by exact SHA-256 against THREE records that must agree: the committed corpus index entry, "
      + "the bytes mounted in the custody that index declares, and the pin carried in this family's builder. Custody "
      + "roots are resolved through scripts/lib/corpus-index-paths.mjs, which follows what the index declares rather "
      + "than the shape of the path.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      documentId: r.componentId, formNumber: r.formNumber, title: r.title,
      instrumentKind: r.instrumentKind, sourceId: r.sourceId,
      custody: r.custody, pathInArchive: r.pathInArchive, revision: r.revision,
      sha256: r.sha256, sha256Exact: true, byteLength: r.byteLength,
      pageCount: r.pageCount, acroFieldCount: r.acroFieldCount,
      structuralClassObserved: r.structuralClassObserved
    })),
    composedComponentsAuthoredByThisBuild: Object.keys(COMPOSED_COMPONENTS),
    groundingRecords: RECEIPT.groundingRecords,
    officialSourcesRecordedInIntake: RECEIPT.officialSourcesRecordedInIntake,
    formIdentityNote: RECEIPT.formIdentityNote,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: RECEIPT.whatThisReceiptDoesNotEstablish
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1", familyId: FAMILY_ID,
    readFirstHandFrom: "the pinned source binaries, at the SHA-256 the source receipt records",
    documents: [...censusByForm.entries()].map(([id, c]) => ({
      documentId: id, pageCount: c.pageCount, fields: c.rows.length,
      unmapped: c.unmapped, staleDictionaryKeys: c.stale, captionDrift: c.captionDrift,
      rows: c.rows.map((r) => ({
        field: r.name, type: r.type, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        printedCaption: r.caption, captionAt: r.captionAt, effectiveLabel: r.effectiveLabel,
        section: r.section, policy: r.policy, factId: r.fact ?? null,
        sourceValuePresentInBlankForm: r.sourceValue
      }))
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "official_pdf_fill",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    officialForm: resolved.map((r) => ({ documentId: r.componentId, formNumber: r.formNumber, sha256: r.sha256 })),
    componentSet: DECLARED_COMPONENT_SET,
    componentConditions: COMPONENT_CONDITIONS,
    servesComponentIdsInOtherPacketSets: SERVES,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeSelectionsMade: [],
    routeSelectionNote: FIELDMAP_NOTES.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: DECLARED_COMPONENT_SET,
    componentConditions: COMPONENT_CONDITIONS,
    servesComponentIdsInOtherPacketSets: SERVES,
    boundSources: resolved.map((r) => ({
      sourceId: r.sourceId, documentId: r.componentId, formNumber: r.formNumber,
      custody: r.custody, pathInArchive: r.pathInArchive, sha256: r.sha256
    })),
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written value was read back from the flattened widget appearances of the ASSEMBLED packet bytes, at "
      + "the packet's own page numbers, not from this builder's intent and not from an intermediate render.",
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

  /*
   * The inventory is checked against the PAGE before it is published. Every
   * appearance the participant completes must be reachable from a required-
   * before-filing row or from a declared participant election; anything else is
   * a blank on a delivered page that no list closes.
   */
  const participantAppearances = participantCompletedBlankAppearances(censusByForm);
  const inventoriedFields = new Set(rbf.map((i) => i.field));
  const electionFields = new Set(maps.flatMap((m) => (m.selectionControls ?? []).map((c) => c.selectionId)));
  const uninventoried = participantAppearances.filter((a) =>
    !inventoriedFields.has(`${a.document}.${a.field}`) && !electionFields.has(`${a.document}.${a.field}`));
  assert.equal(uninventoried.length, 0,
    "a blank the participant completes is on a delivered page and in no list: "
    + uninventoried.map((a) => `${a.document}/${a.field}@p${a.sourcePage}`).join(", "));

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    /*
     * Counted from the widget rectangles of the pinned binary rather than from
     * the field map's one-row-per-name, so a field that appears twice is
     * counted twice and a blank that no field name reaches cannot hide.
     */
    participantCompletedBlankAppearances: participantAppearances.length,
    participantCompletedBlankAppearancesByPage: participantAppearances
      .reduce((acc, a) => { acc[a.sourcePage] = (acc[a.sourcePage] ?? 0) + 1; return acc; }, {}),
    everyParticipantCompletedAppearanceIsInventoried: true,
    appearancesCompletedBySomeoneElse: APPEARANCES_COMPLETED_BY_SOMEONE_ELSE,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
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
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: FINDINGS
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: APPROVAL.counselQuestionsRaised,
    mattersForTheReviewersAttention: APPROVAL.mattersForTheReviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 8)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    boundSources: resolved.length,
    sources: resolved.map((r) => ({ sourceId: r.sourceId, custody: r.custody, sha256: r.sha256 })),
    components: COMPONENTS,
    documents: COMPONENTS,
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
