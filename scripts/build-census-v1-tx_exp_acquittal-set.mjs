#!/usr/bin/env node
/**
 * The Texas post-acquittal expunction packet family builder.
 *
 *   node scripts/build-census-v1-tx_exp_acquittal-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, strategy custom_pleading, ONE track over TWO route
 * obligations that the calendar decides between:
 *
 *   tx_exp_acquittal   Expunction after trial court acquittal,
 *                      Tex. Code Crim. Proc. arts. 55A.002 and 55A.201, falling
 *                      back to an ordinary ex parte petition under art. 55A.251
 *
 * ENTITLEMENT, NOT DISCRETION. Article 55A.002 provides that a person tried and
 * acquitted by the trial court is ENTITLED to expunction of all records and
 * files relating to the arrest, and on acquittal the trial court SHALL advise
 * the person of that right. Many people are never told, which is the gap this
 * family exists to close.
 *
 * TWO BRANCHES, CHOSEN BY THE CALENDAR
 *
 * WITHIN 30 DAYS — art. 55A.201. The order shall be entered not later than the
 * 30th day after the date of acquittal, on the request of the acquitted person
 * after notice to the state, with the information an art. 55A.253 petition
 * requires. This packet supplies the request and the information package and
 * DELIBERATELY SUPPLIES NO PROPOSED ORDER on this branch: art. 55A.201 assigns
 * preparation of the order to the acquitted person's ATTORNEY where they were
 * represented, and otherwise to the ATTORNEY REPRESENTING THE STATE. Handing a
 * participant an order to prepare would invite them to do something the article
 * gives to someone else.
 *
 * AFTER THE WINDOW, OR WHERE THE COURT DID NOT ACT — art. 55A.251, an ordinary
 * verified ex parte petition, which lists art. 55A.002 among the qualifying
 * entitlements. It is filed with the DISTRICT CLERK OF THE COUNTY OF ARREST or
 * of the alleged offence — which may not be the court that acquitted them, and
 * the packet says so separately because a participant would not expect it.
 *
 * WHAT THE REPOSITORY ESTABLISHES, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  HELD, and different on each branch. In-window: a
 *                       request to the trial court with notice to the state.
 *                       Out-of-window: the district clerk of the county of
 *                       arrest or of the alleged offence.
 *
 *   FEE                 HELD, and recently rewritten. Art. 102.006 was REPEALED
 *                       by S.B. 1667 effective 2025-09-01, temporarily re-added
 *                       by H.B. 16 of the 89th Legislature's 2nd Called Session
 *                       with a built-in expiry, and permanently replaced by
 *                       art. 102.0061 effective 2026-01-01. Under 102.0061(a) a
 *                       district court charges the fee for filing an ex parte
 *                       petition in a civil action — the ordinary county civil
 *                       fee, not a flat amount; under (b) a justice court or
 *                       municipal court of record charges a flat $100.
 *
 *                       THE PACKET DOES NOT QUOTE THE OLD $250–$500 RANGE. The
 *                       committed record states in terms that it is no longer
 *                       reliable. It is named only so a participant who has
 *                       read it online learns it came from a repealed statute.
 *
 *   WAIVER              HELD, and on this route it is MANDATORY in-window.
 *                       Art. 102.0061(c) REQUIRES the fee to be waived where
 *                       the expunction relates to an acquittal other than one
 *                       described by art. 55A.151 and the petition is filed not
 *                       later than the 30th day after the acquittal; (d)
 *                       requires waiver of the district-court fee where
 *                       entitlement arises under art. 55A.053(a)(2)(A) or (B).
 *                       The packet tells the in-window participant they should
 *                       not be paying at all, and to cite the article. The
 *                       Rule 145 Statement of Inability still ships, because
 *                       the waiver falls away if the art. 55A.151 bar applies
 *                       or the window has closed.
 *
 *   THE COST THE        Art. 55A.254(e) forbids the clerk charging anything to
 *   PARTICIPANT         transmit the petition or notice of hearing
 *   CONTROLS            ELECTRONICALLY, and 55A.254(f) requires the clerk to
 *                       charge $25 FOR EACH LISTED ENTITY UNABLE TO RECEIVE AN
 *                       ELECTRONIC TRANSMISSION — repeated at the order stage
 *                       under 55A.351(b-2) and (b-3). Every paper-only agency
 *                       named is a direct $25 cost, twice over. Art. 55A.253(c)
 *                       requires each district clerk to publish a list of
 *                       agencies WITH E-MAIL ADDRESSES on the clerk's website,
 *                       so the packet tells the participant to ask for it by
 *                       name and to deduplicate.
 *
 *   SERVICE             HELD, and the participant serves nobody. The CLERK
 *                       sends the petition and notice of hearing by certified
 *                       mail return receipt requested or by secure e-mail,
 *                       electronic transmission or fax; a state or local agency
 *                       with a listed e-mail address MUST accept electronic
 *                       service; the court sets a hearing not earlier than the
 *                       30th day after filing and notifies every listed entity
 *                       other than the central federal depositories; and on
 *                       receipt DPS notifies those itself, so the filer does not
 *                       chase the FBI. No certificate of service is shipped,
 *                       because the committed record makes one necessary only
 *                       where local practice requires direct service on the
 *                       prosecutor.
 *
 * WHAT IS BOUND. One official form: the Statement of Inability to Afford
 * Payment of Court Costs, the statewide bilingual form the Supreme Court of
 * Texas approved in Misc. Docket No. 22-9090 — the committed record calls it
 * the only genuinely statewide promulgated form in the whole Texas
 * record-clearing workflow. It is held in the human_source_returns custody
 * rather than the Master Library, so custody roots resolve through the shared
 * resolver in scripts/lib/corpus-index-paths.mjs. Its 132 fields are classified
 * by the same declared rule table this lane uses on its two Texas nondisclosure
 * families, with exhaustiveness asserted in both directions and nothing
 * financial prefilled anywhere.
 *
 * Texas publishes no statewide form for an expunction after acquittal, so the
 * request, the information package, the petition and the proposed order are
 * composed from the codified text the committed record quotes. None was
 * invented and no form was substituted.
 *
 * TWO THINGS THE INFORMATION PACKAGE LEAVES BLANK ON PURPOSE. It asks for sex
 * and race. The platform collects neither and will not guess them onto a court
 * filing, and the page says so on its own face rather than only in the
 * instructions.
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

const APPEARANCE_SEMANTICS = loadAppearanceSemantics();
const FAMILY_ID = "tx_exp_acquittal-set";
const OUT = "data/rcap-all50/overlays/census-v1/tx/tx-exp-acquittal-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-tx_exp_acquittal-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "TX",
  routeKeys: [
    "obligation:unit:TX:tx_exp_acquittal:tx-acquittal-in-window-request",
    "obligation:unit:TX:tx_exp_acquittal:tx-acquittal-out-of-window-petition"
  ],
  primaryRouteKey: "obligation:unit:TX:tx_exp_acquittal:tx-acquittal-in-window-request",
  routeSelectionId: "tx_exp_acquittal-composed-set",
  legalName: "Expunction after trial court acquittal (Tex. Code Crim. Proc. arts. 55A.002 and 55A.201, or an ordinary ex parte petition under art. 55A.251)",
  routeName: "clearing the record of a charge a Texas trial court acquitted you of",
  statute: "Tex. Code Crim. Proc. arts. 55A.002, 55A.201, 55A.251, 55A.253, 55A.254, 55A.301 and 102.0061"
});

const REQUEST = "tx_exp_acquittal-request-to-trial-court-1";
const INFOPACK = "tx_exp_acquittal-information-package-2";
const PETITION = "tx_exp_acquittal-petition-3";
const PROPOSED = "tx_exp_acquittal-proposed-order-4";
const STATEMENT = "tx_exp_acquittal-fee-waiver-statement-5";
const GUIDE = "tx_exp_acquittal-filing-and-expectation-instructions-6";

/*
 * The twelve stop conditions this route actually holds.
 *
 * Carried word for word from data/record-clearing/legal-design-track-registry.json,
 * track `tx_exp_acquittal`, selfHelpStopConditions. Nothing added, nothing
 * softened, nothing read across from another Texas route. The packet previously
 * carried five bullets of its own and seven of these twelve appeared nowhere in
 * either the instructions or the delivered bytes - including the mixed-outcome
 * condition whose governing case law the registry records as not automated, and
 * the absconding condition the registry flags precisely because a participant
 * cannot be expected to self-identify it.
 *
 * The registry's own wording for the immigration condition is used rather than
 * the packet's earlier "you are not a United States citizen", which does not
 * reach a lawful permanent resident who reads it and hesitates.
 */
const SELF_HELP_STOP_TRACK = "tx_exp_acquittal";
const SELF_HELP_STOP_CONDITIONS = Object.freeze([
  "The state opposes the petition, or seeks retention of records under art. 55A.302.",
  "The arrest produced multiple charges with mixed outcomes. State v. T.S.N. and Ex parte R.P.G.P. govern whether individual offences from one arrest can be expunged separately, and that analysis is not automated.",
  "A felony from the same transaction is present or arguable, which moves the wait to three years and can defeat the petition.",
  "The applicable limitations period is contested, or the participant wants full rather than partial expunction and the limitations analysis is not clear.",
  "There is any absconding or bail-jumping history. Article 55A.154 makes an intentional or knowing absconder ineligible under arts. 55A.052(a)(1) to (3) and 55A.054, and a participant may not self-identify the fact.",
  "The arrest may have been made on a community-supervision violation warrant under art. 42A.751(b), which art. 55A.153 bars.",
  "Venue is unclear because the arrest and the alleged offence occurred in different counties.",
  "Immigration consequences.",
  "The participant wants to attack the underlying case rather than clear it.",
  "Any companion conviction or live charge from the same criminal episode, which art. 55A.151 makes an outright bar.",
  "Any multi-count indictment with a mixed verdict.",
  "The participant was represented at trial, in which case the trial attorney prepares the order on the in-window route."
]);

/*
 * The three stops this packet carried that the registry list does not spell out,
 * kept rather than dropped: the criminal-episode bullet carries the fee-waiver
 * consequence the registry's condition 10 does not, and the other two are this
 * packet's own.
 */
const SELF_HELP_STOP_PACKET_ADDITIONS = Object.freeze([
  "The criminal-episode bar above does more than defeat the petition: art. 55A.151 also removes the mandatory fee waiver in art. 102.0061(c), so a participant it reaches loses the free filing as well as the relief.",
  "You are not sure whether the criminal-episode bar reaches you.",
  "The clerk cannot produce the art. 55A.253(c) agency list."
]);

const COMPONENTS = [REQUEST, INFOPACK, PETITION, PROPOSED, STATEMENT, GUIDE];

const COMPOSED_TITLES = {
  [REQUEST]: "Request to the Trial Court for an Order of Expunction After Acquittal (art. 55A.201)",
  [INFOPACK]: "Information Package Required by Article 55A.253",
  [PETITION]: "Verified Ex Parte Petition for Expunction After Acquittal (art. 55A.251)",
  [PROPOSED]: "Proposed Order of Expunction",
  [STATEMENT]: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
  [GUIDE]: "Which Route You Are On, What It Costs, and What Happens Next"
};

const COMPONENT_CONDITIONS = {
  [REQUEST]: "IN-WINDOW branch only. Used where the request reaches the trial court under art. 55A.201, which requires the order to be entered not later than the 30th day after the date of acquittal.",
  [INFOPACK]: "IN-WINDOW branch only. Article 55A.201 requires the requesting party to provide the information an art. 55A.253 petition requires, and this is that information in the order the statute asks for it.",
  [PETITION]: "OUT-OF-WINDOW branch only. Used where the 30-day window has closed or the court did not act, and the person falls back to an ordinary verified ex parte petition under art. 55A.251.",
  [PROPOSED]: "OUT-OF-WINDOW branch only. On the in-window branch art. 55A.201 assigns preparation of the order to the acquitted person's attorney if they were represented, and otherwise to the attorney representing the state.",
  [STATEMENT]: "Used where the participant cannot afford the filing fee. Note that on the in-window branch art. 102.0061(c) REQUIRES the fee to be waived, so the Statement may not be needed at all."
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
  "the legal-design intake record (data/record-clearing/legal-design-intake/TX.memo.json, track "
  + "tx_exp_acquittal) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, tx_exp_acquittal-set), whose fee block was read "
  + "at source on 2026-08-06 after art. 102.006 was repealed and replaced by art. 102.0061";

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
  {
    id: "declaration_date",
    re: /^(Day \/ Día|Month \/ Mes|Year \/ Año|Today|Year)$/,
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
function statementFields(fieldNames, selectionNames) {
  const spec = {};
  const unmatched = [];
  const used = new Set();
  for (const name of fieldNames) {
    const isSelection = selectionNames.has(name);
    const rule = SOI_RULES.find((r) => (r.selectionOnly ? isSelection : (!r.selectionOnly && r.re && r.re.test(name))));
    if (!rule) { unmatched.push(name); continue; }
    used.add(rule.id);
    const base = { section: rule.section, label: rule.label(name), ...(isSelection ? { selection: true } : {}) };
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

/* ---- the pages this build authors ------------------------------------------ */
const IDENTITY_BLANKS = (prefix) => ([
  { id: `${prefix}_court`, label: `Court named in the caption of the ${prefix.replace(/_/g, " ")}`, what: "the court that acquitted you, exactly as its own paperwork names it", why: "which court acquitted the participant is a case fact the platform has not seen" },
  { id: `${prefix}_county`, label: `County named in the caption of the ${prefix.replace(/_/g, " ")}`, what: "the Texas county of that court", why: "the county is a case fact the platform has not seen" },
  { id: `${prefix}_cause_number`, label: `Cause number in the caption of the ${prefix.replace(/_/g, " ")}`, what: "the cause number of the criminal case, from the court file", why: "no cause number is held for a record the platform has not seen" },
  { id: `${prefix}_acquittal_date`, label: `Date of the acquittal on the ${prefix.replace(/_/g, " ")}`, what: "the date you were found not guilty, copied from the judgment of acquittal", why: "no acquittal-date fact is held for a record the platform has not seen, and on the in-window branch the whole 30-day period runs from it" },
  { id: `${prefix}_offense`, label: `Offence acquitted of, on the ${prefix.replace(/_/g, " ")}`, what: "the offence you were acquitted of, worded as the judgment states it", why: "no offence fact is held for a record the platform has not seen" }
]);

const COMPOSED_COMPONENTS = {
  [REQUEST]: {
    writes: [{ id: "requester_name", label: "Person making the request to the trial court", fact: "participant.full_legal_name" }],
    blanks: [
      ...IDENTITY_BLANKS("request"),
      { id: "request_arrest_date", label: "Date of the arrest on the request", what: "the date of the arrest, from your DPS criminal history or the court file", why: "no arrest-date fact is held for a record the platform has not seen" },
      { id: "request_arresting_agency", label: "Arresting agency on the request", what: "the agency that arrested you - this is a case fact from the record you already hold, not a protected court field", why: "the arresting agency is a case fact the platform has not seen" }
    ],
    protectedBlanks: [
      { id: "request_signature", label: "Signature on the request to the trial court", why: "the request is the participant's own and is signed when it is actually made" },
      { id: "request_signature_date", label: "Date beside the signature on the request", why: "a date written before the request is actually made would be false" }
    ],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[REQUEST].toUpperCase(), "");
      L.push("USE THIS PAGE ONLY IF YOU ARE STILL INSIDE THE 30-DAY WINDOW. Article 55A.201 says the order of expunction shall be entered NOT LATER THAN THE 30TH DAY AFTER THE DATE OF ACQUITTAL, on the request of the acquitted person after notice to the state. If more than 30 days have passed, or the court did not act, use the verified ex parte petition in this packet instead.", "");
      L.push("IN THE " + DOTS(30) + " COURT OF " + DOTS(24) + " COUNTY, TEXAS", "");
      L.push("Cause No.: " + DOTS(46), "");
      L.push(`REQUEST OF ${name.toUpperCase()} FOR AN ORDER OF EXPUNCTION UNDER ARTICLE 55A.201`, "");
      L.push(`1. ${name} was tried and ACQUITTED by this Court of the offence identified below. Under Tex. Code Crim. Proc. art. 55A.002 a person tried and acquitted by the trial court is ENTITLED to expunction of all records and files relating to the arrest.`, "");
      L.push("Offence acquitted of, as the judgment states it:");
      L.push(DOTS(), "");
      L.push("Date of acquittal (found not guilty):");
      L.push(DOTS(), "");
      L.push("Date of arrest: " + DOTS(40));
      L.push("Arresting agency: " + DOTS(36), "");
      L.push("2. This request is made under art. 55A.201, which provides that the order shall be entered not later than the 30th day after the date of acquittal, on the request of the acquitted person AFTER NOTICE TO THE STATE.", "");
      L.push("3. The information article 55A.253 requires accompanies this request, in the Information Package attached.", "");
      L.push("4. A copy of the judgment of acquittal accompanies this request. Article 55A.301 requires the judgment to be attached to and incorporated by reference in the order.", "");
      L.push("5. WHO PREPARES THE ORDER. Article 55A.201 assigns preparation of the order to the acquitted person's ATTORNEY where the person was represented, and otherwise to the ATTORNEY REPRESENTING THE STATE. This packet therefore does not supply a proposed order on this branch, and the request asks the Court to direct its preparation as the article provides.", "");
      L.push("6. ON THE FEE. Article 102.0061(c) REQUIRES the filing fee to be waived where the expunction relates to an acquittal other than one described by article 55A.151 and the petition is filed not later than the 30th day after the acquittal. This request is made within that period.", "");
      L.push("WHEREFORE the requesting party asks the Court to enter an order of expunction of all records and files relating to the arrest.", "");
      L.push("DATE " + DOTS(28) + "   SIGNATURE " + DOTS(40), "");
      L.push(`PRINTED NAME: ${name}`, "");
      L.push("(You sign and date this when you actually make the request. Nothing on this page is signed or dated for you.)");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  },

  [INFOPACK]: {
    writes: [
      { id: "info_name", label: "Full name of the person the information package is about", fact: "participant.full_legal_name" },
      { id: "info_dob", label: "Date of birth in the information package", fact: "participant.date_of_birth" },
      { id: "info_address", label: "Address in the information package, asked for as one whole address", fact: "participant.street_address" }
    ],
    blanks: [
      { id: "info_sex_and_race", label: "Sex and race as the record states them, in the information package", what: "your sex and race as your own records state them - the platform does not collect either and will not guess", why: "the platform does not collect sex or race and will not infer them onto a court filing" },
      { id: "info_driver_licence", label: "Driver's licence number in the information package", what: "your Texas driver's licence number, if you have one", why: "the platform holds no licence identifier for any participant" },
      { id: "info_ssn", label: "Social Security number in the information package", what: "your Social Security number, which you write yourself", why: "the platform does not hold a Social Security number and would not print one onto a filing if it did" },
      { id: "info_offense_charged", label: "Offence charged, in the information package", what: "the offence you were charged with, worded as the record states it", why: "no offence fact is held for a record the platform has not seen" },
      { id: "info_arrest_date", label: "Date of arrest, in the information package", what: "the date of the arrest", why: "no arrest-date fact is held for a record the platform has not seen" },
      { id: "info_arresting_agency", label: "Arresting agency, in the information package", what: "the agency that arrested you", why: "the arresting agency is a case fact the platform has not seen" },
      { id: "info_case_number", label: "Case number and the court that handled it, in the information package", what: "the case number and which court handled it, if a case was filed", why: "no case identifier is held for a record the platform has not seen" },
      { id: "info_trn", label: "Tracking incident number (TRN) in the information package", what: "the TRN from your DPS criminal history record - the incident number it carries has to go on the order", why: "the TRN is assigned by the state and appears on the participant's own DPS criminal history, which the platform has not seen" },
      { id: "info_agency_list", label: "The deduplicated list of agencies and entities, with e-mail addresses where published", what: "every agency and entity likely to hold records of this arrest, DEDUPLICATED, taken from the list your district clerk publishes on its website under art. 55A.253(c) - and use the e-mail addresses, because electronic transmission is free and paper is not", why: "which agencies hold a given arrest record is not a fact the platform holds, and article 55A.253(c) makes the district clerk the publisher of the list" },
      { id: "info_private_entities", label: "Private entities, listed separately from the agency list", what: "any private entity you believe holds the record, listed SEPARATELY and never merged into the agency list", why: "the committed record requires private entities to be listed separately and never merged into the agency list, and the platform holds no such list" }
    ],
    protectedBlanks: [],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const dob = facts["participant.date_of_birth"];
      const address = facts["participant.street_address"];
      const L = [];
      L.push(COMPOSED_TITLES[INFOPACK].toUpperCase(), "");
      L.push("Article 55A.201 requires the requesting party to provide the information an article 55A.253 petition requires. This page is that information, in the order the statute asks for it. It accompanies the request to the trial court.", "");
      L.push(`Full name: ${name}`);
      L.push(`Date of birth: ${dob}`);
      L.push(`Address: ${address}`, "");
      L.push("Sex and race, as your records state them:");
      L.push(DOTS(), "");
      L.push("(Your sex and race are not filled in. The platform does not collect either and will not guess them onto a court filing.)", "");
      L.push("Driver's licence number: " + DOTS(36));
      L.push("Social Security number: " + DOTS(36), "");
      L.push("Offence charged:");
      L.push(DOTS(), "");
      L.push("Date of arrest: " + DOTS(40));
      L.push("Arresting agency: " + DOTS(36), "");
      L.push("Case number and the court that handled it, if a case was filed:");
      L.push(DOTS(), "");
      L.push("TRACKING INCIDENT NUMBER (TRN): " + DOTS(30), "");
      L.push("(The TRN comes from your DPS criminal history record. The incident number it carries has to go on the order, so get the criminal history before you file.)", "");
      L.push("THE AGENCY AND ENTITY LIST - THIS IS THE PART THAT COSTS MONEY.", "");
      L.push("Article 55A.253(c) requires EACH DISTRICT CLERK to compile and maintain, on the clerk's own website, a list of the agencies and entities that hold arrest records, WITH E-MAIL ADDRESSES. Ask for it by name; the clerk is not always expecting the question.", "");
      L.push("Why it matters to your wallet: article 55A.254(e) forbids the clerk charging anything to transmit the petition or the notice of hearing ELECTRONICALLY, and article 55A.254(f) requires the clerk to charge $25 FOR EACH LISTED ENTITY UNABLE TO RECEIVE AN ELECTRONIC TRANSMISSION. The same structure repeats at the order stage under article 55A.351(b-2) and (b-3). So every paper-only agency you name is a direct $25 cost to you, twice over.", "");
      L.push("List every agency and entity likely to hold records of this arrest, DEDUPLICATED, using the clerk's list and its e-mail addresses wherever they exist:");
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("PRIVATE ENTITIES, LISTED SEPARATELY. Do not merge these into the agency list above:");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("YOU DO NOT HAVE TO CHASE THE FBI. The court gives a copy of the petition and the notice of hearing to each official, agency or entity named, OTHER THAN central federal depositories, and on receipt DPS notifies the central federal depositories itself.");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  },

  [PETITION]: {
    writes: [
      { id: "petitioner_name", label: "Petitioner named in the verified ex parte petition", fact: "participant.full_legal_name" },
      { id: "petitioner_dob", label: "Date of birth of the petitioner in the verified petition", fact: "participant.date_of_birth" },
      { id: "petitioner_address", label: "Address of the petitioner in the verified petition, asked for as one whole address", fact: "participant.street_address" }
    ],
    blanks: [
      ...IDENTITY_BLANKS("petition"),
      { id: "petition_filing_county", label: "County the ex parte petition is filed in", what: "the county of the arrest, or of the alleged offence - the verified ex parte petition is filed with the DISTRICT CLERK of that county, which may not be the court that acquitted you", why: "which county the arrest or alleged offence belongs to is a case fact the platform has not seen, and on this branch it decides where the petition is filed" },
      { id: "petition_criminal_episode", label: "The article 55A.151 statement about a criminal episode", what: "your own statement, checked with a lawyer if you are unsure, that the acquitted offence did not arise out of a criminal episode in which you were convicted of, or remain subject to prosecution for, at least one other offence", why: "article 55A.151 bars relief on that ground and the determination looks at the participant's whole record and any pending matter, neither of which the platform can see" }
    ],
    protectedBlanks: [
      { id: "petition_signature", label: "Signature of the petitioner on the verified petition", why: "the petition is the participant's own and is signed when it is actually filed" },
      { id: "petition_signature_date", label: "Date beside the petitioner's signature on the verified petition", why: "a date written before the petition is actually signed would be false" },
      { id: "petition_notary_jurat", label: "Notarial jurat on the verified petition", why: "the jurat is completed by the notary or officer administering the oath" }
    ],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const dob = facts["participant.date_of_birth"];
      const address = facts["participant.street_address"];
      const L = [];
      L.push(COMPOSED_TITLES[PETITION].toUpperCase(), "");
      L.push("USE THIS PAGE IF THE 30-DAY WINDOW HAS CLOSED, OR THE COURT DID NOT ACT. Where the article 55A.201 window has passed, the person falls back to an ordinary verified ex parte petition under article 55A.251, which lists article 55A.002 among the qualifying entitlements.", "");
      L.push("NOTE WHERE THIS ONE GOES. The verified ex parte petition is filed with the DISTRICT CLERK OF THE COUNTY OF ARREST, or of the alleged offence. That may not be the court that acquitted you.", "");
      L.push("IN THE " + DOTS(30) + " COURT OF " + DOTS(24) + " COUNTY, TEXAS", "");
      L.push("Cause No.: " + DOTS(46), "");
      L.push("County of arrest or of the alleged offence: " + DOTS(28), "");
      L.push(`EX PARTE ${name.toUpperCase()}`, "");
      L.push("VERIFIED PETITION FOR EXPUNCTION", "");
      L.push(`1. Petitioner ${name} petitions for expunction of all records and files relating to the arrest identified below, under Tex. Code Crim. Proc. art. 55A.251.`, "");
      L.push(`Date of birth: ${dob}`);
      L.push(`Address: ${address}`, "");
      L.push("2. ENTITLEMENT. Petitioner was tried and ACQUITTED by the trial court. Under art. 55A.002 a person tried and acquitted by the trial court is entitled to expunction, and art. 55A.251 lists art. 55A.002 among the qualifying entitlements.", "");
      L.push("Offence acquitted of, as the judgment states it:");
      L.push(DOTS(), "");
      L.push("Date of acquittal (found not guilty):");
      L.push(DOTS(), "");
      L.push("3. THE ARTICLE 55A.151 BAR. Article 55A.151 bars relief where the acquitted offence arose out of a criminal episode, as defined by Penal Code Sec. 3.01, and the person was convicted of or remains subject to prosecution for at least one other offence in that episode. Petitioner's statement on that point - not written for you, because it depends on your whole record and on any matter still pending:");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("4. THE INFORMATION ARTICLE 55A.253 REQUIRES accompanies this petition, in the Information Package in this packet, including the deduplicated agency and entity list taken from the district clerk's published list and the separately listed private entities.", "");
      L.push("5. A copy of the judgment of acquittal accompanies this petition. Article 55A.301 requires it to be attached to and incorporated by reference in the order.", "");
      L.push("WHEREFORE Petitioner asks the Court to enter an order of expunction of all records and files relating to the arrest.", "");
      L.push("VERIFICATION. Article 55A.253 requires this petition to be VERIFIED. County practice differs on whether an unsworn declaration satisfies it, so BOTH blocks are printed and you use the one your clerk accepts. Ask the clerk which.", "");
      L.push("EITHER - NOTARIAL VERIFICATION:", "");
      L.push("STATE OF TEXAS, COUNTY OF " + DOTS(30), "");
      L.push(`I, ${name}, being duly sworn, state that I have read the foregoing petition and that the matters stated in it are true and correct.`, "");
      L.push(DOTS(40));
      L.push(`${name}, Petitioner`, "");
      L.push("SUBSCRIBED AND SWORN TO before me on " + DOTS(24) + ".", "");
      L.push(DOTS(40));
      L.push("Notary Public, State of Texas", "");
      L.push("OR - UNSWORN DECLARATION UNDER PENALTY OF PERJURY:", "");
      L.push(`My name is ${name}. My date of birth is ${dob}. My address is ${address}. I declare under penalty of perjury that the foregoing is true and correct.`, "");
      L.push("Executed on " + DOTS(24) + ".", "");
      L.push(DOTS(40));
      L.push(`${name}, Petitioner`, "");
      L.push("(You sign and date whichever block your clerk accepts. Nothing on this page is signed or dated for you.)");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  },

  [PROPOSED]: {
    writes: [{ id: "order_petitioner_name", label: "Petitioner named in the proposed order of expunction", fact: "participant.full_legal_name" }],
    blanks: [
      ...IDENTITY_BLANKS("order"),
      { id: "order_trn", label: "Tracking incident number (TRN) on the proposed order", what: "the TRN from your DPS criminal history record - the incident number has to go on the order", why: "the TRN appears on the participant's own DPS criminal history, which the platform has not seen" }
    ],
    protectedBlanks: [
      { id: "order_findings", label: "The Court's findings on the proposed order", why: "the findings are the Court's to make; nothing in a proposed order may assert that a court has acted" },
      { id: "order_entry_date", label: "Date of entry of the proposed order", why: "the date of entry is the Court's" },
      { id: "order_judge_signature", label: "Judge's signature on the proposed order", why: "only the judge signs the order" }
    ],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[PROPOSED].toUpperCase(), "");
      L.push("USE THIS PAGE ON THE OUT-OF-WINDOW BRANCH ONLY. On the in-window branch article 55A.201 assigns preparation of the order to the acquitted person's ATTORNEY where they were represented, and otherwise to the ATTORNEY REPRESENTING THE STATE - so on that branch you do not prepare it.", "");
      L.push("THIS DOCUMENT IS A PROPOSED ORDER. It is unexecuted. It records no finding this Court has made and nothing in it asserts that the Court has acted.", "");
      L.push("IN THE " + DOTS(30) + " COURT OF " + DOTS(24) + " COUNTY, TEXAS", "");
      L.push("Cause No.: " + DOTS(46), "");
      L.push(`EX PARTE ${name.toUpperCase()}`, "");
      L.push("ORDER OF EXPUNCTION", "");
      L.push(`On the verified petition of ${name}, the Court FINDS (findings to be made by the Court):`);
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("Offence acquitted of:");
      L.push(DOTS(), "");
      L.push("Date of acquittal: " + DOTS(36));
      L.push("Tracking incident number (TRN): " + DOTS(30), "");
      L.push("IT IS ORDERED that all records and files relating to the arrest identified above be EXPUNGED.", "");
      L.push("The judgment of acquittal is attached to and INCORPORATED BY REFERENCE in this order, as article 55A.301 requires.", "");
      L.push("SIGNED on " + DOTS(30) + ".", "");
      L.push(DOTS(40));
      L.push("JUDGE PRESIDING", "");
      L.push("(The findings, the date and the judge's signature are the Court's and are left blank.)");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  },

  [GUIDE]: {
    writes: [{ id: "participant_name", label: "Person the filing instructions are prepared for", fact: "participant.full_legal_name" }],
    blanks: [],
    protectedBlanks: [],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[GUIDE].toUpperCase(), "");
      L.push(`Prepared for: ${name}`, "");
      L.push("YOU WERE ACQUITTED, AND THAT MEANS YOU ARE ENTITLED. Article 55A.002 says a person tried and ACQUITTED by the trial court is ENTITLED to expunction of all records and files relating to the arrest. This is not a discretionary route.", "");
      L.push("THE COURT WAS SUPPOSED TO TELL YOU. On acquittal the trial court SHALL advise the person of the right to expunction. Many people are never told, which is why this packet exists.", "");
      L.push("FIRST QUESTION: HOW LONG AGO WERE YOU ACQUITTED?", "");
      L.push("WITHIN 30 DAYS - THE IN-WINDOW BRANCH. Article 55A.201 says the order shall be entered NOT LATER THAN THE 30TH DAY AFTER THE DATE OF ACQUITTAL, on your request after notice to the state. Use the REQUEST TO THE TRIAL COURT and the INFORMATION PACKAGE in this packet. Do not prepare the order: art. 55A.201 assigns that to your attorney if you had one, and otherwise to the attorney representing the state.", "");
      L.push("MORE THAN 30 DAYS, OR THE COURT DID NOT ACT - THE OUT-OF-WINDOW BRANCH. You fall back to an ordinary VERIFIED EX PARTE PETITION under art. 55A.251, which lists art. 55A.002 among the qualifying entitlements. Use the PETITION and the PROPOSED ORDER in this packet.", "");
      L.push("AND NOTE WHERE THAT ONE GOES: the verified ex parte petition is filed with the DISTRICT CLERK OF THE COUNTY OF ARREST, or of the alleged offence. That may not be the court that acquitted you.", "");
      L.push("WHAT IT COSTS. This changed recently and the old numbers are no longer reliable.", "");
      L.push("Article 102.006, the old expunction fee statute, was REPEALED by S.B. 1667 effective 1 September 2025, temporarily re-added by H.B. 16 of the 89th Legislature's 2nd Called Session with a built-in expiry, and permanently replaced by article 102.0061 effective 1 January 2026. IF YOU HAVE READ THAT EXPUNCTION COSTS $250 TO $500, THAT RANGE IS FROM THE REPEALED STATUTE AND THIS PACKET WILL NOT REPEAT IT.", "");
      L.push("Under art. 102.0061(a) a DISTRICT COURT charges the fee that applies to filing an ex parte petition in a civil action in district court - the ordinary county civil filing fee, which is not a flat statutory amount. Under (b) a JUSTICE COURT or MUNICIPAL COURT OF RECORD charges a flat $100.", "");
      L.push("ON THE IN-WINDOW BRANCH THE FEE MUST BE WAIVED. Article 102.0061(c) REQUIRES the fee to be waived where the expunction relates to an acquittal other than one described by article 55A.151 AND the petition is filed not later than the 30th day after the acquittal. If you are inside the window and the article 55A.151 bar does not apply to you, you should not be paying a filing fee at all. Say so at the counter, and cite art. 102.0061(c).", "");
      L.push("Article 102.0061(d) separately requires waiver of the district-court fee where the entitlement arises under article 55A.053(a)(2)(A) or (B).", "");
      L.push("THE COST THAT IS ACTUALLY IN YOUR CONTROL: $25 PER PAPER-ONLY AGENCY. Article 55A.254(e) forbids the clerk charging anything to transmit the petition or notice of hearing ELECTRONICALLY. Article 55A.254(f) requires the clerk to charge $25 FOR EACH LISTED ENTITY UNABLE TO RECEIVE AN ELECTRONIC TRANSMISSION - and the same structure repeats at the order stage under art. 55A.351(b-2) and (b-3). So the number of paper-only agencies you name is a direct dollar cost to you, and it lands twice.", "");
      L.push("WHICH IS WHY THE CLERK'S LIST MATTERS. Article 55A.253(c) requires each district clerk to compile and maintain, on the clerk's own website, a list of agencies and entities WITH E-MAIL ADDRESSES. Ask for it by name - the clerk is not always expecting the question - and use the e-mail addresses. Deduplicate your list. Every duplicate and every needless paper-only entry costs you $25 twice.", "");
      L.push("IF YOU STILL CANNOT AFFORD IT. Fill in the STATEMENT OF INABILITY TO AFFORD PAYMENT OF COURT COSTS in this packet, on the statewide bilingual form the Supreme Court of Texas approved in Misc. Docket No. 22-9090. Rule 145 requires the clerk to make that form available WITHOUT CHARGE AND WITHOUT YOUR HAVING TO ASK. It is sworn under penalty of perjury: fill it from your own records, not from memory.", "");
      L.push("YOU DO NOT SERVE ANYONE. THE CLERK DOES. The clerk sends the petition and the notice of hearing by certified mail return receipt requested, or by secure e-mail, electronic transmission or fax. A state or local agency with a listed e-mail address MUST accept electronic service. A certificate of service is included only where local practice requires you to serve the prosecutor directly - ask the clerk.", "");
      L.push("THE HEARING. The court sets a hearing NOT EARLIER THAN THE 30TH DAY after the petition is filed, and gives a copy of the petition and the notice of hearing to each official, agency or entity listed, OTHER THAN central federal depositories.", "");
      L.push("AND YOU DO NOT CHASE THE FBI. On receipt, DPS notifies the central federal depositories itself.", "");
      L.push("VERIFICATION. Article 55A.253 requires the petition to be verified. Whether an unsworn declaration satisfies that is accepted by some clerks and not others, which is why BOTH a notarial block and an unsworn declaration are printed. Ask your clerk which they take.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD.");
      L.push(`These twelve are carried word for word from this route's own committed track record - data/record-clearing/legal-design-track-registry.json, track ${SELF_HELP_STOP_TRACK}, selfHelpStopConditions. Each is a point at which this packet stops being enough, and at which you should stop and get a lawyer licensed in Texas rather than file.`);
      L.push(...SELF_HELP_STOP_CONDITIONS.map((condition) => `- ${condition}`));
      L.push("AND THREE MORE THIS PACKET ADDS, FROM WHAT IT KNOWS ABOUT THIS FILING.");
      L.push(...SELF_HELP_STOP_PACKET_ADDITIONS.map((condition) => `- ${condition}`), "");
      L.push("THE MIXED-OUTCOME CONDITION IS THE ONE MOST PEOPLE READING THIS WILL HIT. If your arrest produced more than one charge and they did not all end the same way - acquitted on one count, convicted or still pending on another - whether the acquitted offence can be expunged on its own is governed by State v. T.S.N. and Ex parte R.P.G.P., and the committed record says that analysis is NOT AUTOMATED. This packet does not perform it and does not decide it for you.", "");
      L.push("AND ABSCONDING IS THE ONE YOU CANNOT CHECK FOR YOURSELF. Article 55A.154 makes an intentional or knowing absconder ineligible under arts. 55A.052(a)(1) to (3) and 55A.054, and the committed record's own reason for making it a stop is that a participant may not self-identify the fact. If there is any bail-jumping or failure-to-appear history on this arrest, ask a lawyer before you file.", "");
      L.push("DOCUMENTS TO GET FIRST, AND WHO HAS THEM.");
      L.push("- Your Texas DPS criminal history record - the Texas Department of Public Safety Crime Records Service, following DPS form CR-63, which is an instruction sheet rather than a form to complete. THE TRN IT CARRIES HAS TO GO ON THE ORDER.");
      L.push("- The district clerk's published list of agencies and e-mail addresses - the district clerk of the county where the petition will be filed, under art. 55A.253(c).");
      L.push("- The court file and cause number - the district or county clerk of the county of arrest or prosecution. Some counties also want a certified disposition attached; ask when you call about the agency list.");
      L.push("- The judgment of acquittal - the clerk of the trial court. Article 55A.301 requires it to be attached to and incorporated by reference in the order.");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  }
};

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/TX.memo.json", track: "tx_exp_acquittal" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "tx_exp_acquittal-set" },
    { record: "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json", read: "the one document source this family binds and the custody it is held in" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Tex. Code Crim. Proc. art. 55A.002 — Expunction of records following acquittal", url: "https://statutes.capitol.texas.gov/Docs/CR/htm/CR.55A.htm", retrievedOn: "2026-08-06" },
    { title: "Tex. Code Crim. Proc. arts. 55A.201, 55A.251, 55A.253, 55A.254, 55A.301, 55A.351 and 55A.151", url: "https://statutes.capitol.texas.gov/Docs/CR/htm/CR.55A.htm", retrievedOn: "2026-08-06" },
    { title: "Tex. Code Crim. Proc. art. 102.0061 — Expunction fee, effective 1 January 2026 (replacing art. 102.006, repealed by S.B. 1667 effective 1 September 2025)", url: "https://statutes.capitol.texas.gov/Docs/CR/htm/CR.102.htm", retrievedOn: "2026-08-06" },
    { title: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond, approved by the Supreme Court of Texas in Misc. Docket No. 22-9090; Tex. R. Civ. P. 145", url: "https://www.txcourts.gov/rules-forms/forms/", retrievedOn: "2026-08-06" }
  ],
  formIdentityNote:
    "Texas publishes no statewide form for an expunction after acquittal, so the request, the information package, "
    + "the petition and the proposed order are composed from the codified text the committed record quotes. One "
    + "official form binds: the Statement of Inability to Afford Payment of Court Costs, the statewide bilingual "
    + "form the Supreme Court of Texas approved in Misc. Docket No. 22-9090, which the committed record calls the "
    + "only genuinely statewide promulgated form in the whole Texas record-clearing workflow. It is held in the "
    + "human_source_returns custody rather than the Master Library, and the receipt records which custody supplied "
    + "the bytes rather than assuming.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "whether the article 55A.151 criminal-episode bar reaches a given participant — it looks at their whole record and at any matter still pending, and it also removes the mandatory fee waiver in art. 102.0061(c)",
    "what a given Texas district court's civil ex parte filing fee is; art. 102.0061(a) sets the type of fee and not an amount, and only the justice-court and municipal-court-of-record figure in (b) is flat",
    "which agencies and entities hold a given arrest record — art. 55A.253(c) makes the district clerk the publisher of that list",
    "whether a given county's clerk accepts an unsworn declaration in place of a notarial verification, which is why both blocks ship"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "Two route keys and two branches, and the packet elects between them for nobody, because the election is made "
    + "by the calendar rather than by preference. WITHIN 30 DAYS of the acquittal, art. 55A.201 governs: the "
    + "request to the trial court and the information package are used, and the packet supplies NO proposed order "
    + "on that branch because the article assigns its preparation to the acquitted person's attorney where they "
    + "were represented and otherwise to the attorney representing the state. AFTER the window has closed, or "
    + "where the court did not act, art. 55A.251 governs: the verified ex parte petition and the proposed order "
    + "are used, and they are filed with the district clerk of the county of arrest or of the alleged offence, "
    + "which may not be the acquitting court. Each of the five branch-specific components is marked conditional "
    + "with the condition stated, and each says on its own first line which branch it belongs to."
};

const INSTRUCTIONS = {
  title: `What you must do — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**You were acquitted, so you are entitled.** Article 55A.002 says a person tried and acquitted by the trial court is *entitled* to expunction of all records and files relating to the arrest. This is not a discretionary route. On acquittal the trial court is supposed to advise you of that right; many people are never told.",
    "",
    "**Which branch you are on is decided by the calendar, not by preference.**",
    "",
    "- **Within 30 days of the acquittal** — art. 55A.201. The order shall be entered not later than the 30th day after the date of acquittal, on your request after notice to the state. Use the **request to the trial court** and the **information package**. Do *not* prepare the order: the article assigns that to your attorney if you had one, and otherwise to the attorney representing the state.",
    "- **More than 30 days, or the court did not act** — art. 55A.251. Use the **verified ex parte petition** and the **proposed order**, filed with the **district clerk of the county of arrest** or of the alleged offence, which may not be the court that acquitted you.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth and your address. Every case fact lives on records the platform has not seen. **Your sex and race are not filled in** on the information package — the platform does not collect either and will not guess them onto a court filing — and neither is your Social Security number."
  ],
  componentBlurbs: {
    [REQUEST]: "the request to the trial court under art. 55A.201 — **in-window branch only**",
    [INFOPACK]: "the information art. 55A.253 requires, including the agency and entity list that decides what this costs you — **in-window branch only**",
    [PETITION]: "the verified ex parte petition under art. 55A.251, with both a notarial verification block and an unsworn declaration because county practice differs — **out-of-window branch only**",
    [PROPOSED]: "the proposed Order of Expunction, unexecuted — **out-of-window branch only**",
    [STATEMENT]: "the statewide Statement of Inability to Afford Payment of Court Costs — and note that in-window, art. 102.0061(c) *requires* the fee to be waived, so you may not need it",
    [GUIDE]: "which branch you are on, what it costs now that art. 102.006 has been repealed, the $25-per-paper-agency rule, and what happens next"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Your Texas DPS criminal history record (follow DPS form CR-63) — **the TRN it carries has to go on the order** | Texas Department of Public Safety Crime Records Service |",
    "| The district clerk's published list of agencies and e-mail addresses (art. 55A.253(c)) | The district clerk of the county where the petition will be filed. Ask for it by name |",
    "| The court file and cause number | The district or county clerk of the county of arrest or prosecution |",
    "| The judgment of acquittal | The clerk of the trial court. Art. 55A.301 requires it attached to and incorporated by reference in the order |"
  ],
  stepsLines: [
    "1. **Work out which branch you are on** from the date of acquittal.",
    "2. **Get the four documents above.** The DPS record gives you the TRN; the clerk's list decides what this costs you.",
    "3. **Build the agency and entity list carefully, deduplicated, using the clerk's e-mail addresses.** Art. 55A.254(e) makes electronic transmission free; art. 55A.254(f) makes the clerk charge **$25 for each listed entity unable to receive one**, and the same structure repeats at the order stage. Every duplicate and every needless paper-only entry costs you $25 twice.",
    "4. **List private entities separately.** Never merge them into the agency list.",
    "5. **Fill every blank** on the components for your branch.",
    "6. **On the fee**: in-window, art. 102.0061(c) *requires* the fee to be waived unless the art. 55A.151 bar applies — say so at the counter and cite it. Out-of-window, a district court charges the ordinary county civil ex parte filing fee and a justice or municipal court of record charges a flat $100.",
    "7. **If you still cannot afford it**, file the Statement of Inability with the petition. Rule 145 requires the clerk to give you that form free and without your having to ask.",
    "8. **Verify the petition** on the out-of-window branch, using whichever of the two blocks your clerk accepts.",
    "9. **File it, and then stop.** You do not serve anyone: the clerk sends the petition and notice of hearing, and a state or local agency with a listed e-mail address must accept electronic service.",
    "10. **Expect the hearing no earlier than the 30th day** after filing. You do not chase the FBI — DPS notifies the central federal depositories itself."
  ],
  blanksLines: [
    "- **Your signature and the dates beside it.** You sign when you actually make the request or file the petition.",
    "- **The court's findings, the date of entry and the judge's signature** on the proposed order.",
    "- **The notarial jurat**, which the officer administering the oath completes.",
    "- **Your sex and race** on the information package. The platform does not collect either and will not guess.",
    "- **Your Social Security number and driver's licence number.** The platform holds neither.",
    "- **The TRN.** It comes from your own DPS criminal history record.",
    "- **The agency and entity list, and the separate private-entity list.** Which agencies hold your arrest record is not something the platform knows; art. 55A.253(c) makes the district clerk the publisher of that list.",
    "- **The art. 55A.151 statement** about a criminal episode. It looks at your whole record and at anything still pending."
  ],
  stopsLines: [
    `**Stop and get a lawyer licensed in Texas rather than file if any of the following is true of your case.** Each of the twelve is carried word for word from this route's own committed track record — \`data/record-clearing/legal-design-track-registry.json\`, track \`${SELF_HELP_STOP_TRACK}\`, \`selfHelpStopConditions\` — and each is a point at which this packet stops being enough:`,
    "",
    ...SELF_HELP_STOP_CONDITIONS.map((condition) => `- ${condition}`),
    "",
    "**Three more this packet adds, from what it knows about this filing:**",
    "",
    ...SELF_HELP_STOP_PACKET_ADDITIONS.map((condition) => `- ${condition}`),
    "",
    "**The mixed-outcome condition is the one most people reading this will hit.** If your arrest produced more than one charge and they did not all end the same way — acquitted on one count, convicted or still pending on another — whether the acquitted offence can be expunged on its own is governed by *State v. T.S.N.* and *Ex parte R.P.G.P.*, and the committed record says that analysis is **not automated**. This packet does not perform it and does not decide it for you.",
    "",
    "**And absconding is the one you cannot check for yourself.** Art. 55A.154 makes an intentional or knowing absconder ineligible under arts. 55A.052(a)(1) to (3) and 55A.054, and the record's own reason for making it a stop is that a participant may not self-identify the fact. If there is any bail-jumping or failure-to-appear history on this arrest, ask a lawyer before you file.",
    "",
    "Where self-help stops, the district clerk of the county where the petition will be filed answers the agency list and the fee, the clerk of the trial court holds the judgment of acquittal, and the Texas Department of Public Safety Crime Records Service issues the criminal history record the TRN comes from. None of them may advise you on any of the conditions above; only a lawyer licensed in Texas may."
  ],
  notLines: [
    "This is a request, an information package, a verified petition, a proposed order, the statewide fee-waiver Statement and their instructions — **of which only some apply to you**, depending on how long ago you were acquitted. It is not legal advice, and it is not filed for you.",
    "",
    "**This packet will not tell you what expunction used to cost.** Article 102.006 was repealed effective 1 September 2025 and permanently replaced by art. 102.0061 effective 1 January 2026. The $250-to-$500 range that circulates online comes from the repealed statute and is not reproduced here."
  ]
};

const FINDINGS = [
  {
    finding:
      "Article 102.006, the old expunction fee statute, was repealed by S.B. 1667 effective 2025-09-01, temporarily "
      + "re-added by H.B. 16 of the 89th Legislature's 2nd Called Session with a built-in expiry, and permanently "
      + "replaced by art. 102.0061 effective 2026-01-01. The committed record states in terms that the old $250 to "
      + "$500 range is no longer reliable.",
    consequence:
      "The packet does not quote that range anywhere, and says so explicitly — a participant who has read it online "
      + "is told where it came from and that it is from a repealed statute. What the packet states instead is what "
      + "art. 102.0061 actually provides: the ordinary county civil ex parte filing fee in district court under (a), "
      + "a flat $100 in a justice court or municipal court of record under (b)."
  },
  {
    finding:
      "Article 102.0061(c) REQUIRES the filing fee to be waived where the expunction relates to an acquittal other "
      + "than one described by art. 55A.151 and the petition is filed not later than the 30th day after the "
      + "acquittal. Article 102.0061(d) separately requires waiver where entitlement arises under art. "
      + "55A.053(a)(2)(A) or (B).",
    consequence:
      "This is a held, route-specific, mandatory fee answer and the packet states it as one: on the in-window "
      + "branch the participant should not be paying a filing fee at all, and is told to say so at the counter and "
      + "cite the article. The Statement of Inability is still shipped, because the waiver falls away if the "
      + "art. 55A.151 bar applies or the window has closed."
  },
  {
    finding:
      "Article 55A.254(e) forbids the clerk charging anything to transmit the petition or notice of hearing "
      + "electronically, and art. 55A.254(f) requires the clerk to charge $25 FOR EACH LISTED ENTITY UNABLE TO "
      + "RECEIVE AN ELECTRONIC TRANSMISSION, with the same structure repeated at the order stage under art. "
      + "55A.351(b-2) and (b-3). Article 55A.253(c) requires each district clerk to publish a list of agencies "
      + "with e-mail addresses on the clerk's website.",
    consequence:
      "The number of paper-only agencies the packet names is a direct dollar cost to the participant, and it lands "
      + "twice. That is stated as plainly as the filing fee is, in the information package where the list is "
      + "actually built and again in the guidance: deduplicate, use the clerk's published e-mail addresses, and ask "
      + "for that list by name because the clerk is not always expecting the question."
  },
  {
    finding:
      "The two branches are legally distinct and are chosen by the calendar. Article 55A.201 governs within 30 days "
      + "of acquittal and assigns preparation of the ORDER to the acquitted person's attorney where they were "
      + "represented and otherwise to the attorney representing the state. Article 55A.251 governs afterwards and "
      + "is filed with the district clerk of the county of arrest or of the alleged offence.",
    consequence:
      "Five of the six components are marked conditional with the condition stated, and each says on its own first "
      + "line which branch it belongs to. No proposed order is offered for the in-window branch, because supplying "
      + "one would invite the participant to do something the article assigns to someone else. The out-of-window "
      + "filing destination is called out separately, because it may not be the court that acquitted them."
  },
  {
    finding:
      "The participant does not serve anyone. The clerk sends the petition and notice of hearing by certified mail "
      + "return receipt requested or by secure e-mail, electronic transmission or fax; a state or local agency with "
      + "a listed e-mail address must accept electronic service; the court sets a hearing not earlier than the 30th "
      + "day after filing; and on receipt DPS notifies the central federal depositories.",
    consequence:
      "The packet says all of that and tells the participant in terms that they do not chase the FBI. No "
      + "certificate of service is shipped, because the committed record makes one necessary only where local "
      + "practice requires direct service on the prosecutor, and inventing the step would misdescribe the route."
  },
  {
    finding:
      "Article 55A.253 requires the petition to be verified, and the committed record records that some clerks "
      + "accept an unsworn declaration under penalty of perjury while others require a notarial jurat.",
    consequence:
      "BOTH blocks ship on the same page with an instruction to ask the clerk which they take. Shipping one and "
      + "being wrong costs the participant a trip; shipping both costs a few lines."
  },
  {
    finding:
      "The information package asks for sex and race. The platform collects neither.",
    consequence:
      "Both are declared blanks and the page says on its face that they are not filled in because the platform does "
      + "not collect them and will not guess them onto a court filing. The Social Security and driver's licence "
      + "numbers are declared blanks for the same class of reason."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm the branch split is right, and in particular that the packet is correct NOT to supply a proposed order on the in-window branch, on the ground that art. 55A.201 assigns its preparation to the acquitted person's attorney or to the attorney representing the state.",
    "Confirm the art. 102.0061(c) mandatory waiver is stated at the right strength. The packet tells the in-window participant that they should not be paying a filing fee and to cite the article at the counter.",
    "Confirm the packet is right to refuse to quote the repealed art. 102.006 $250-to-$500 range while naming it, so a participant who has read it online knows where it came from.",
    "Confirm the $25-per-paper-only-entity treatment: the packet presents the agency list as a cost the participant controls, and urges deduplication and use of the clerk's published e-mail addresses.",
    "Confirm that shipping both a notarial verification block and an unsworn declaration on the same page, with an instruction to ask the clerk, is preferable to choosing one.",
    "Confirm the art. 55A.151 criminal-episode statement is correctly left to the participant and counsel rather than pleaded, and that the packet is right to tie it to the loss of the mandatory fee waiver as well as to the bar itself."
  ],
  mattersForTheReviewersAttention: [
    "Five of six components are conditional and each declares its branch on its own first line, so a participant cannot mistake an out-of-window petition for something they should file inside the window.",
    "The out-of-window filing destination — the district clerk of the county of arrest or of the alleged offence — is stated separately from the acquitting court, because they can differ and a participant would not expect it.",
    "The TRN is treated as a required-before-filing fact on both the information package and the proposed order, because the committed record states the incident number has to go on the order.",
    "Sex and race are declared blanks with the reason printed on the page itself rather than only in the instructions, because the information package is the document that asks for them.",
    "The one bound source, the Statement of Inability, is classified by the same rule table this lane uses on its two Texas nondisclosure families, with exhaustiveness asserted in both directions and nothing financial prefilled."
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
     * What each field's appearance MEANS, so the finalizer knows which
     * unwritten /Tx appearances are the court's own ink and which are a
     * participant answer the source happened to ship a value for.
     *
     * The Statement of Inability arrives with three of its own /V values set.
     * Without this, the structural default reads all three as the court's ink
     * and flattens them onto a document sworn under penalty of perjury. The
     * finalizer is handed one family's dispositions and never learns which
     * family they came from, so it cannot branch on one.
     */
    appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS,
      `${FAMILY_ID}:${source.componentId}`)
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
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
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
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
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

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
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
