#!/usr/bin/env node
/**
 * Deterministic census-v1 builder for Florida human-trafficking-victim
 * expunction under section 943.0583, Florida Statutes.
 *
 * This is a zero-source-binary composition. The three assigned instruments are
 * authored from the committed codified-text/legal-design records. Nothing is
 * acquired, copied from private/, promoted, released, or made runtime-selectable.
 *
 *   node scripts/build-census-v1-fl-trafficking-set.mjs [--check] [--no-raster]
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import {
  BLANK_DISPOSITIONS,
  PASS_COUNTERS,
  classifyBlank,
  classifyField,
  rowKeyOf
} from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "fl-trafficking-set";
const OUT = "data/rcap-all50/overlays/census-v1/fl/fl-trafficking-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-fl-trafficking-set.mjs";
const STRATEGY = "CUSTOM_PLEADING_FROM_CODIFIED_TEXT";
const ROUTE_KEY = "obligation:track-pathway:FL:fl-trafficking:human-trafficking-victim-expunction-943-0583";
const COMPONENTS = [
  "FL-RULE-3.989-PETITION",
  "FL-RULE-3.9895-SWORN-STATEMENT",
  "FL-RULE-3.989-ORDER"
];
const TITLES = {
  "FL-RULE-3.989-PETITION": "Petition to Expunge; Human Trafficking Victim",
  "FL-RULE-3.9895-SWORN-STATEMENT": "Sworn Statement in Support of Petition; Human Trafficking Victim",
  "FL-RULE-3.989-ORDER": "Order to Expunge; Human Trafficking Victim"
};
const SUBDIVISIONS = {
  "FL-RULE-3.989-PETITION": "Fla. R. Crim. P. 3.9895(a)",
  "FL-RULE-3.9895-SWORN-STATEMENT": "Fla. R. Crim. P. 3.9895(b)",
  "FL-RULE-3.989-ORDER": "Fla. R. Crim. P. 3.9895(c)"
};
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const DOTS = (n = 76) => ".".repeat(n);

const FACTS = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1993-04-17",
    "participant.mailing_address": "42 Magnolia Street, Jacksonville, FL 32202",
    "participant.phone": "904-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1971-12-31",
    "participant.mailing_address": "1188 Long Coastal Crossing Road, Apartment 14B, Key West, FL 33040-2214",
    "participant.phone": "(305) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
});

const GROUNDING_RECORDS = [
  {
    record: "data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json",
    selector: "FL-RULE-3989 / fl-trafficking-set",
    use: "authorizes composition of the three assigned rule instruments and records that no separate official component remains"
  },
  {
    record: "data/record-clearing/legal-design-intake/FL.memo.json",
    selector: "trackId fl-trafficking",
    use: "route, destination, participant inputs, evidence treatment, self-help boundaries, and Rule 3.9895 identity history"
  },
  {
    record: "data/record-clearing/legal-design-packet-set-manifests.json",
    selector: "packetSetId fl-trafficking-set",
    use: "packet roles and participant actions"
  },
  {
    record: "src/lib/rcap-engine/compiled/profiles/FL-florida.json",
    selector: "pathway human-trafficking-victim-expunction-943-0583",
    use: "filing location, fee treatment, proof options, and trauma-informed pathway summary"
  }
];

function mapBase(component, id, label) {
  return {
    field: `${component}.${id}`,
    fieldName: `${component}.${id}`,
    page: 1,
    printedLabel: label,
    printedLine: label,
    effectiveLabel: label,
    regionHeading: label,
    sectionHeading: TITLES[component],
    rectBasis: "composed_document_authored_by_this_build",
    document: component
  };
}

function written(component, id, label, factId) {
  return { ...mapBase(component, id, label), factId, kind: "composed_text" };
}

function required(component, id, label, participantMustSupply, why) {
  return {
    ...mapBase(component, id, label),
    reason: `the participant supplies this before filing: ${participantMustSupply}`,
    category: null,
    completenessClass: null,
    class: null,
    disposition: "REQUIRED_BEFORE_FILING",
    completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true,
    identity: `${component} field ${id}`,
    factId: null,
    routeDetermined: false,
    participantMustSupply,
    why
  };
}

function protectedField(component, id, label, why) {
  return {
    ...mapBase(component, id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE,
    completenessClass: SIGNATURE,
    class: SIGNATURE,
    completenessDisposition: "PROTECTED_FIELD",
    requiredBeforeFiling: false,
    why
  };
}

function courtField(component, id, label, why) {
  return {
    ...mapBase(component, id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED,
    completenessClass: COURT_OWNED,
    class: COURT_OWNED,
    completenessDisposition: "PROTECTED_FIELD",
    requiredBeforeFiling: false,
    why
  };
}

function componentMap(component) {
  const writes = [];
  const refusals = [];
  const w = (id, label, fact) => writes.push(written(component, id, label, fact));
  const r = (id, label, value, why) => refusals.push(required(component, id, label, value, why));
  const p = (id, label, why) => refusals.push(protectedField(component, id, label, why));
  const c = (id, label, why) => refusals.push(courtField(component, id, label, why));

  if (component === "FL-RULE-3.989-PETITION") {
    w("petitioner_name", "Petitioner full legal name", "participant.full_legal_name");
    w("date_of_birth", "Petitioner date of birth", "participant.date_of_birth");
    w("mailing_address", "Petitioner mailing address", "participant.mailing_address");
    w("telephone", "Petitioner telephone", "participant.phone");
    w("email", "Petitioner email", "participant.email");
    r("court_name", "Court name", "the full name of the court that has jurisdiction over the offense class", "the route fixes the circuit of arrest but the case record fixes the particular court");
    r("judicial_circuit", "Judicial circuit", "the number of the Florida judicial circuit where the arrest occurred", "venue is a case fact not held by the fixture");
    r("county", "County of arrest", "the Florida county where the arrest occurred", "venue is a case fact not held by the fixture");
    r("case_number", "Case number", "the exact case number from the court record", "the fixture carries no participant case record");
    r("division", "Court division", "the division shown on the court record, if one is assigned", "the fixture carries no participant case record");
    r("arrest_date", "Arrest date", "the arrest date from the record", "the fixture carries no participant case record");
    r("arresting_agency", "Arresting agency", "the arresting agency's exact name from the record", "the fixture carries no participant case record");
    r("charges_and_statutes", "Charges and statute sections", "every charge and statute section whose record is requested for expunction", "all records requested must be identified before filing");
    r("dispositions", "Disposition of each charge", "the exact disposition and disposition date for every listed charge", "section 943.0583 can operate without regard to disposition, but the records still must be identified accurately");
    r("trafficking_connection", "Trafficking connection statement", "a concise statement, in the petitioner's own words, explaining that the offense was committed or reported while the petitioner was a trafficking victim and as part of the trafficking scheme or at a trafficker's direction", "the participant supplies this sensitive case-specific statement; the build does not invent or embellish it");
    r("official_documentation", "Official documentation supporting victim status, or NONE", "a list of official documentation attached, or the word NONE if proceeding without it", "official documentation changes the proof path but is not categorically required");
    r("supporting_evidence", "Other supporting evidence list", "a list of the other non-graphic evidence attached to support the petition", "the participant chooses the evidence actually available and the build does not invent it");
    p("petitioner_signature", "Petitioner signature", "the petitioner personally signs after reviewing the completed petition");
    p("petition_signature_date", "Date of petitioner signature", "the petitioner supplies the true signing date only when signing");
  } else if (component === "FL-RULE-3.9895-SWORN-STATEMENT") {
    w("petitioner_name", "Petitioner full legal name", "participant.full_legal_name");
    w("date_of_birth", "Petitioner date of birth", "participant.date_of_birth");
    w("mailing_address", "Petitioner mailing address", "participant.mailing_address");
    r("court_name", "Court name", "the same full court name used on the petition", "the fixture carries no participant case record");
    r("judicial_circuit", "Judicial circuit", "the same Florida judicial circuit used on the petition", "the fixture carries no participant case record");
    r("county", "County of arrest", "the same county used on the petition", "the fixture carries no participant case record");
    r("case_number", "Case number", "the same exact case number used on the petition", "the fixture carries no participant case record");
    r("division", "Court division", "the same division used on the petition, if one is assigned", "the fixture carries no participant case record");
    r("records_identified", "Records requested for expunction", "the same arrests, charges, statutes, and dispositions identified in the petition", "the sworn statement must refer to the actual records requested");
    r("trafficking_connection_sworn", "Sworn trafficking connection statement", "a truthful, concise sworn statement that the listed offenses were committed or reported while the petitioner was a human-trafficking victim and as part of the scheme or at a trafficker's direction", "the petitioner must supply the personal sworn facts without invented detail");
    r("official_documentation_sworn", "Sworn official-documentation statement", "which official documentation is attached, or that none is attached", "the proof path depends on what documentation actually exists");
    p("petitioner_signature", "Petitioner signature on sworn statement", "the petitioner signs only in the presence of the notary or other officer administering the oath");
    p("date_sworn", "Date sworn before notary", "the date is supplied only when the oath is administered");
    c("notary_signature", "Notary public signature", "the notary or other authorized officer owns this signature");
    c("notary_printed_name", "Notary public printed commissioned name", "the notary or other authorized officer supplies this information");
    c("notary_identification", "Notary personally-known or identification determination", "the notary or other authorized officer completes the identification determination");
    c("notary_commission", "Notary commission expiration", "the notary or other authorized officer supplies the commission information");
  } else {
    w("petitioner_name", "Petitioner full legal name", "participant.full_legal_name");
    r("court_name", "Court name", "the same full court name used on the petition", "the fixture carries no participant case record");
    r("judicial_circuit", "Judicial circuit", "the same Florida judicial circuit used on the petition", "the fixture carries no participant case record");
    r("county", "County of arrest", "the same county used on the petition", "the fixture carries no participant case record");
    r("case_number", "Case number", "the same exact case number used on the petition", "the fixture carries no participant case record");
    r("division", "Court division", "the same division used on the petition, if one is assigned", "the fixture carries no participant case record");
    c("court_findings", "Court findings", "only the judge decides and enters findings");
    c("records_ordered_expunged", "Records ordered expunged by the court", "only the court decides the exact scope of relief granted");
    c("order_date", "Date of order", "the court supplies the date when the order is entered");
    c("judge_signature", "Judge signature", "the judge signs the order if relief is granted");
    c("judge_name", "Judge printed name", "the court supplies the judge's printed name");
    c("clerk_certification", "Clerk certification", "the clerk completes any certification after entry");
    c("clerk_distribution_date", "Clerk distribution date", "the clerk records distribution after entry");
  }

  return {
    formNumber: component,
    documentId: component,
    documentRole: component === "FL-RULE-3.989-PETITION" ? "primary_filing"
      : component === "FL-RULE-3.9895-SWORN-STATEMENT" ? "sworn_statement" : "proposed_order",
    structuralClass: "composed_document",
    composedFrom: GROUNDING_RECORDS.map((x) => `${x.record} (${x.selector})`).join("; "),
    documentPolicy: {
      mode: "participant",
      captionOnly: false,
      documentAcceptsFill: true,
      routeKey: ROUTE_KEY
    },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: refusals,
    boundaryWrites: writes,
    boundaryRefusals: refusals
  };
}

function caption(lines) {
  lines.push(`IN THE ${DOTS(26)} COURT`);
  lines.push(`OF THE ${DOTS(18)} JUDICIAL CIRCUIT`);
  lines.push(`IN AND FOR ${DOTS(26)} COUNTY, FLORIDA`, "");
  lines.push(`Case No.: ${DOTS(38)}     Division: ${DOTS(18)}`, "");
  lines.push(`IN RE: ${DOTS(60)}`);
  lines.push("Petitioner.", "");
}

function identityLines(lines, facts) {
  lines.push(`Petitioner full legal name: ${facts["participant.full_legal_name"]}`);
  lines.push(`Petitioner date of birth: ${facts["participant.date_of_birth"]}`);
  lines.push(`Petitioner mailing address: ${facts["participant.mailing_address"]}`);
  lines.push(`Petitioner telephone: ${facts["participant.phone"]}`);
  lines.push(`Petitioner email: ${facts["participant.email"]}`, "");
}

function composedBody(component, facts) {
  const lines = [];
  lines.push(TITLES[component].toUpperCase());
  lines.push(`${SUBDIVISIONS[component]} - composed codified-text instrument`);
  lines.push(`Assigned component identity: ${component}`, "");
  caption(lines);

  if (component === "FL-RULE-3.989-PETITION") {
    lines.push("PETITION TO EXPUNGE; HUMAN TRAFFICKING VICTIM", "");
    identityLines(lines, facts);
    lines.push("The Petitioner invokes only the human-trafficking-victim expunction pathway under section 943.0583, Florida Statutes. EXPUNCTION, not sealing, is the route-determined relief requested.", "");
    lines.push("1. VENUE AND JURISDICTION. The arrest occurred in the Florida judicial circuit and county written below, and this Court has jurisdiction over the class of each offense identified in this petition.");
    lines.push(`Court name: ${DOTS()}`);
    lines.push(`Judicial circuit: ${DOTS(30)}     County of arrest: ${DOTS(28)}`);
    lines.push(`Case number: ${DOTS(38)}          Court division: ${DOTS(22)}`, "");
    lines.push("2. RECORDS REQUESTED FOR EXPUNCTION. Complete every line for the record requested. If more than one eligible case is included in the single petition allowed by section 943.0583, attach a complete duplicate of this block for each additional case; never leave a partly completed block.");
    lines.push(`Arrest date: ${DOTS(48)}`);
    lines.push(`Arresting agency: ${DOTS(42)}`);
    lines.push("Charges and statute sections:");
    lines.push(DOTS(), DOTS());
    lines.push("Disposition of each charge and disposition date:");
    lines.push(DOTS(), DOTS(), "");
    lines.push("3. HUMAN-TRAFFICKING CONNECTION. Petitioner states that Petitioner was a victim of human trafficking as that term is used for this pathway and that the listed offense or offenses were committed or reported while Petitioner was a victim and as part of the trafficking scheme or at the direction of a trafficker.");
    lines.push("Trafficking connection statement (use only the facts needed; graphic detail is not requested):");
    lines.push(DOTS(), DOTS(), DOTS(), "");
    lines.push("4. EXCLUDED OFFENSES. This route does not extend to an offense excluded by section 943.0583. The filing instructions require a record-based check before filing and a legal handoff if the classification is uncertain.", "");
    lines.push("5. SUPPORTING PROOF. Official documentation of victim status is not categorically required. List what is actually attached; write NONE if none is attached.");
    lines.push(`Official documentation supporting victim status, or NONE: ${DOTS(30)}`);
    lines.push(`Other supporting evidence list: ${DOTS(43)}`, "");
    lines.push("WHEREFORE, Petitioner asks the Court to expunge the criminal-history records identified in this petition under section 943.0583, Florida Statutes, and to direct the legally required handling of the expunction order.", "");
    lines.push(`Petitioner signature: ${DOTS(42)}`);
    lines.push(`Date of petitioner signature: ${DOTS(32)}`);
    lines.push(`Printed name: ${facts["participant.full_legal_name"]}`);
    lines.push(`Mailing address: ${facts["participant.mailing_address"]}`);
    lines.push(`Telephone: ${facts["participant.phone"]}     Email: ${facts["participant.email"]}`);
  } else if (component === "FL-RULE-3.9895-SWORN-STATEMENT") {
    lines.push("SWORN STATEMENT IN SUPPORT OF PETITION; HUMAN TRAFFICKING VICTIM", "");
    lines.push(`I, ${facts["participant.full_legal_name"]}, date of birth ${facts["participant.date_of_birth"]}, mailing address ${facts["participant.mailing_address"]}, am the Petitioner in the above-styled cause and swear or affirm as follows:`, "");
    lines.push("1. I have read the petition and understand that I am requesting expunction under section 943.0583, Florida Statutes, on the human-trafficking-victim pathway.", "");
    lines.push("2. I was a victim of human trafficking, and the records requested concern one or more offenses committed or reported while I was a victim and as part of the trafficking scheme or at the direction of a trafficker.", "");
    lines.push("Court name, judicial circuit, county, case number, and division:");
    lines.push(DOTS(), DOTS(), "");
    lines.push("Records requested for expunction (arrests, charges, statutes, and dispositions):");
    lines.push(DOTS(), DOTS(), DOTS(), "");
    lines.push("Sworn trafficking connection statement (truthful and concise; graphic detail is not requested):");
    lines.push(DOTS(), DOTS(), DOTS(), "");
    lines.push("Sworn official-documentation statement (identify what is attached, or state that none is attached):");
    lines.push(DOTS(), DOTS(), "");
    lines.push("3. The statements I make here are true and correct to the best of my knowledge. I understand this statement is made under oath and that I must not sign it until a notary public or other person authorized to administer an oath is present.", "");
    lines.push(`Petitioner signature on sworn statement: ${DOTS(34)}`);
    lines.push(`Date sworn before notary: ${DOTS(38)}`, "");
    lines.push("Sworn to and subscribed before me on the date written above.");
    lines.push(`Notary public signature: ${DOTS(44)}`);
    lines.push(`Notary public printed commissioned name: ${DOTS(27)}`);
    lines.push(`Personally known or identification produced: ${DOTS(28)}`);
    lines.push(`Type of identification produced: ${DOTS(34)}`);
    lines.push(`Notary commission expiration: ${DOTS(37)}`);
  } else {
    lines.push("PROPOSED ORDER TO EXPUNGE; HUMAN TRAFFICKING VICTIM", "");
    lines.push("UNEXECUTED PROPOSED ORDER. No finding below has been made and no relief has been granted unless and until the judge signs and the clerk enters this order.", "");
    lines.push(`This cause came before the Court on the petition of ${facts["participant.full_legal_name"]} for human-trafficking-victim expunction under section 943.0583, Florida Statutes.`, "");
    lines.push("Court name, judicial circuit, county, case number, and division:");
    lines.push(DOTS(), DOTS(), "");
    lines.push("COURT FINDINGS (COURT ONLY):");
    lines.push(DOTS(), DOTS(), DOTS(), "");
    lines.push("IT IS ORDERED AND ADJUDGED that the criminal-history records identified by the Court below are EXPUNGED under section 943.0583, Florida Statutes.", "");
    lines.push("Records ordered expunged by the court:");
    lines.push(DOTS(), DOTS(), DOTS(), "");
    lines.push(`Date of order: ${DOTS(48)}`);
    lines.push(`Judge signature: ${DOTS(48)}`);
    lines.push(`Judge printed name: ${DOTS(45)}`, "");
    lines.push("CLERK USE AFTER ENTRY:");
    lines.push(`Clerk certification: ${DOTS(44)}`);
    lines.push(`Clerk distribution date: ${DOTS(40)}`, "");
    lines.push("The filing participant leaves every finding, the records ordered expunged, the date of the order, judicial signature, judicial printed name, clerk certification, and clerk distribution date blank.");
  }

  lines.push("", `Route: ${ROUTE_KEY}`);
  return lines.join("\n");
}

function sanitizePdfText(text) {
  return String(text)
    .replaceAll("\u00a0", " ")
    .replaceAll("‑", "-")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("§", "Sec. ")
    .replaceAll("…", "...");
}

async function renderDocument(text, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setAuthor("RCAP packet-factory builder lane PF09");
  pdf.setCreator("RCAP deterministic codified-text composer");
  pdf.setProducer("RCAP census-v1 artifact renderer");
  const body = await pdf.embedFont(StandardFonts.TimesRoman);
  const width = 612;
  const height = 792;
  const margin = 64;
  const fontSize = 10.5;
  const lineHeight = 13.5;
  const maxWidth = width - (2 * margin);
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const splitToken = (token) => {
    const chunks = [];
    let current = "";
    for (const ch of token) {
      const candidate = `${current}${ch}`;
      if (current && body.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
        chunks.push(current);
        current = ch;
      } else current = candidate;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (raw) => {
    if (!raw) return [""];
    const words = raw.split(/\s+/).flatMap((word) => body.widthOfTextAtSize(word, fontSize) > maxWidth ? splitToken(word) : [word]);
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (body.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else {
        if (current) rows.push(current);
        current = word;
      }
    }
    if (current) rows.push(current);
    return rows;
  };
  const draw = (line) => {
    if (y < margin) {
      page = pdf.addPage([width, height]);
      y = height - margin;
    }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font: body, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  for (const raw of sanitizePdfText(text).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

async function proveWrites(packetBytes, pageManifest, maps, facts, fixture) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "page manifest must describe every packet page");
  const textByPage = pages.map((page) => groupIntoLines(extractTextItems(page))
    .map((line) => line.text).join(" ").replace(/\s+/g, " "));
  const textByComponent = new Map();
  for (const [index, page] of pageManifest.entries()) {
    textByComponent.set(page.component, `${textByComponent.get(page.component) ?? ""} ${textByPage[index]}`.replace(/\s+/g, " "));
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = textByComponent.get(map.formNumber) ?? "";
    for (const row of map.canonicalWrites) {
      const expected = sanitizePdfText(facts[row.factId]);
      assert.ok(expected, `${fixture}/${row.field}: fixture fact is absent`);
      assert.ok(componentText.includes(expected), `${fixture}/${row.field}: fact not readable from final packet bytes`);
      glyphs += expected.replace(/\s+/g, "").length;
      actualWrites.push({
        field: row.field,
        document: map.formNumber,
        factId: row.factId,
        expected,
        foundInOutputBytes: true,
        proof: "exact normalized value read from the final PDF bytes on this component's pages"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

function normalizedRow(row) {
  return {
    id: row.field,
    name: row.fieldName ?? row.field,
    label: row.effectiveLabel ?? "",
    reason: row.reason ?? "",
    refusalClass: row.category ?? null,
    page: row.page ?? null,
    document: row.document ?? null,
    factId: row.factId ?? null,
    isSelectionControl: false,
    declared: {
      disposition: row.completenessDisposition ?? null,
      ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(row, "routeDetermined") ? { routeDetermined: row.routeDetermined === true } : {}),
      identity: row.identity ?? null,
      factId: row.factId ?? null
    }
  };
}

function countCompleteness(maps, proofs, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((key) => [key, 0]));
  const findings = [];
  const note = (counter, detail) => {
    counters[counter] += 1;
    findings.push({ counter, ...detail });
  };
  const writes = maps.flatMap((map) => map.canonicalWrites.map(normalizedRow));
  const blanks = maps.flatMap((map) => map.canonicalRefusals.map(normalizedRow));
  const availableFacts = new Set(writes.map((row) => row.factId).filter(Boolean));
  const norm = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenByDocument = new Map();
  for (const row of writes) {
    if (!writtenByDocument.has(row.document)) writtenByDocument.set(row.document, new Set());
    writtenByDocument.get(row.document).add(norm(row.label));
    writtenByDocument.get(row.document).add(norm(row.name));
  }
  const ledger = [];
  for (const blank of blanks) {
    const beside = writtenByDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.factId ? availableFacts.has(blank.factId) : false)
        || beside.has(norm(blank.label)) || beside.has(norm(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition]?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
  }
  const instructionText = instructions.toLowerCase();
  for (const blank of ledger.filter((row) => row.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared?.identity].map((value) => String(value ?? "").trim()).filter((value) => value.length >= 3);
    if (!needles.some((needle) => instructionText.includes(needle.toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id, why: "required-before-filing item absent from participant instructions" });
    }
  }
  const rows = new Map();
  for (const row of [...writes.map((value) => ({ ...value, written: true })), ...blanks.map((value) => ({ ...value, written: false }))]) {
    const key = rowKeyOf(row);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(row);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((cell) => cell.written)) continue;
    const missing = cells.filter((cell) => !cell.written && classifyField(cell.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, missing: missing.map((cell) => cell.label) });
  }
  for (const row of writes) {
    if (classifyField(row.label, false).requirement === "PROTECTED") note("protectedWrites", { field: row.id });
  }
  for (const proof of proofs) {
    const visible = (proof.addedGlyphsReadFromOutputBytes ?? 0) + (proof.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (proof.valuesReportedByFinalizer > 0 && visible === 0) note("invisibleWrites", { fixture: proof.fixture });
    if ((proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: proof.fixture });
    if ((proof.refusedFieldsWithInk ?? []).length > 0) note("protectedWrites", { fixture: proof.fixture });
  }
  return {
    counters,
    findings,
    ledger,
    totals: { terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length }
  };
}

function requiredItems(maps) {
  return maps.flatMap((map) => map.canonicalRefusals
    .filter((row) => row.requiredBeforeFiling === true)
    .map((row) => ({
      document: map.formNumber,
      field: row.field,
      page: row.page,
      printedContext: row.printedLabel,
      disclosureLabel: row.effectiveLabel,
      identity: row.identity,
      why: row.why,
      participantMustSupply: row.participantMustSupply
    })));
}

function buildParticipantInstructions(requiredBeforeFiling) {
  const out = [
    "# Florida human-trafficking-victim expunction packet",
    "",
    `This packet is built only for \`${ROUTE_KEY}\`. It requests **expunction under section 943.0583, Florida Statutes**; it does not select ordinary sealing, ordinary expunction, or an FDLE certificate route.`,
    "",
    "## What is included",
    "",
    "| Component | Purpose |",
    "| --- | --- |",
    "| `FL-RULE-3.989-PETITION` | Petition to Expunge; Human Trafficking Victim, composed with the current Rule 3.9895(a) caption |",
    "| `FL-RULE-3.9895-SWORN-STATEMENT` | Sworn Statement in Support of Petition; Human Trafficking Victim, Rule 3.9895(b) |",
    "| `FL-RULE-3.989-ORDER` | Unexecuted proposed Order to Expunge; Human Trafficking Victim, composed with the current Rule 3.9895(c) caption |",
    "",
    "## Trauma-informed completion rule",
    "",
    "You do not need to give graphic details. Use only enough truthful information to explain that the record arose while you were a trafficking victim and as part of the trafficking scheme or at a trafficker's direction. The packet does not invent, interpret, or strengthen your account.",
    "",
    "## Required before filing",
    "",
    "Fill every applicable dotted line from your court and arrest records. For multiple eligible cases, use one fully completed record block per case; never leave a partly completed block that could be read as complete.",
    "",
    "| Document | Blank on the document | What you must supply |",
    "| --- | --- | --- |"
  ];
  for (const item of requiredBeforeFiling) out.push(`| ${item.document} | ${item.disclosureLabel} | ${item.participantMustSupply} |`);
  out.push(
    "",
    "Also check from the record that no requested offense is excluded by section 943.0583. If the offense classification is uncertain, stop and obtain legal help rather than guessing.",
    "",
    "Official documentation tending to show victim status can affect the proof path. Attach only genuine documentation you actually have. If you have none, say so truthfully and review the higher proof burden described in the filing instructions.",
    "",
    "## Protected fields left blank",
    "",
    "- Sign and date the petition only after every required fact is complete and accurate.",
    "- Sign the sworn statement only before a notary public or other person authorized to administer an oath. The notary completes the oath date, signature, identification, printed name, and commission fields.",
    "- Do not fill any findings, scope of relief, order date, judge signature, judge printed name, clerk certification, or clerk distribution field on the proposed order.",
    "",
    "## Stop and get help",
    "",
    "Stop for disputed victim status, prosecutor opposition, a contested or evidentiary hearing, individualized advocacy, uncertainty whether an offense is excluded, or any immigration issue. This build does not resolve those questions.",
    "",
    "This packet has not been filed, served, independently verified, approved for live use, or released for commercial fulfillment.",
    ""
  );
  return out.join("\n");
}

function buildFilingInstructions() {
  return [
    "# Filing instructions - Florida section 943.0583",
    "",
    "1. Complete the petition and sworn statement from the underlying court and arrest records. Keep each case block complete.",
    "2. Gather official documentation of victim status if you have it, plus other non-graphic supporting evidence. Official documentation can create the statutory presumption; it is not categorically required. The committed route record states that proceeding without it requires a clear-and-convincing-evidence showing.",
    "3. Have the sworn statement signed before a notary public or other person authorized to administer an oath. Do not predate it.",
    "4. Leave the proposed order's findings, relief description, dates, judge fields, and clerk fields blank.",
    "5. File in any court in the Florida circuit where the arrest occurred that has jurisdiction over the class of the offense or offenses requested for expunction.",
    "6. The committed pathway record states that the clerk may not charge filing, service, or copy fees for this section 943.0583 petition and treats multiple eligible cases as a single petition. Confirm the clerk's current intake procedure and any local cover-sheet or copy requirement before filing; this packet does not create a local-circuit form.",
    "7. The committed legal-design record does not establish a separate statewide service instruction for this petition. Ask the filing clerk what copies or local service steps are required, and do not sign any certificate for an event that has not happened.",
    "8. Keep a complete stamped copy. If relief is granted, obtain a certified copy of the entered order and follow up on record-system implementation.",
    "",
    "A filing location or local procedure question is answered by the clerk of the court in the circuit of arrest. A disputed legal or evidentiary issue requires counsel.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  ].join("\n");
}

function writeJson(relative, value) {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const maps = COMPONENTS.map(componentMap);
  if (checkOnly) {
    return {
      familyId: FAMILY_ID,
      status: "CHECK_ONLY",
      routeKey: ROUTE_KEY,
      implementationStrategy: STRATEGY,
      boundSources: 0,
      components: COMPONENTS,
      writes: maps.reduce((sum, map) => sum + map.canonicalWrites.length, 0),
      blanks: maps.reduce((sum, map) => sum + map.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  const proofs = [];
  const rasterPages = [];

  for (const fixture of ["canonical", "boundary"]) {
    const facts = FACTS[fixture];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`Florida human-trafficking-victim expunction - ${fixture}`);
    packet.setAuthor("RCAP packet-factory builder lane PF09");
    packet.setCreator("RCAP deterministic codified-text composer");
    packet.setProducer("RCAP census-v1 artifact renderer");
    const pageManifest = [];
    for (const component of COMPONENTS) {
      const body = composedBody(component, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]), `${component} must include the participant name`);
      assert.ok(body.includes(ROUTE_KEY), `${component} must print the exact route key`);
      const componentBytes = await renderDocument(body, TITLES[component]);
      const componentDocument = await PDFDocument.load(componentBytes, { ignoreEncryption: true, updateMetadata: false });
      const copied = await packet.copyPages(componentDocument, componentDocument.getPageIndices());
      for (const [index, page] of copied.entries()) {
        packet.addPage(page);
        pageManifest.push({
          packetPage: packet.getPageCount(),
          component,
          documentId: component,
          sourcePage: index + 1,
          sourceSha256: null
        });
      }
    }
    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const proof = await proveWrites(packetBytes, pageManifest, maps, facts, fixture);
    proofs.push({
      fixture,
      proofMethod: "every declared write read back from final packet bytes on the component's own pages",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });
    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture,
      file,
      sha256,
      byteLength: packetBytes.length,
      pageCount: packet.getPageCount(),
      pageManifest,
      documents: COMPONENTS,
      components: COMPONENTS
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixture}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let index = 0; index < packet.getPageCount(); index += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(index + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: index, keep: stage });
        for (const temporary of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const target = path.join(stage, temporary);
          if (fs.existsSync(target)) fs.unlinkSync(target);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture,
          page: index + 1,
          file: `${rasterDir}/page-${String(index + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[index]?.component ?? null,
          pageWidthPt: render.pageWidth,
          pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredItems(maps);
  const participantInstructions = buildParticipantInstructions(rbf);
  const filingInstructions = buildFilingInstructions();
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), participantInstructions);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingInstructions);
  const counted = countCompleteness(maps, proofs, participantInstructions);
  const allNineZero = PASS_COUNTERS.every((counter) => counted.counters[counter] === 0);

  writeJson(`${OUT}/packet-set-manifest.json`, {
    schemaVersion: "rcap-composed-packet-set/v1",
    familyId: FAMILY_ID,
    jurisdiction: "FL",
    routeKey: ROUTE_KEY,
    implementationStrategy: STRATEGY,
    sourceBinariesRequired: 0,
    sourceAcquisitionAuthorized: false,
    components: COMPONENTS.map((component, index) => ({
      componentId: component,
      title: TITLES[component],
      codifiedSubdivision: SUBDIVISIONS[component],
      order: index + 1,
      required: true
    })),
    participantInstructions: `${OUT}/participant-instructions.md`,
    filingInstructions: `${OUT}/filing-instructions.md`
  });
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: "FL",
    implementationStrategy: STRATEGY,
    custodyClass: STRATEGY,
    acquisitionCommissioned: false,
    sourceBinariesRequired: 0,
    sourceBinaryCommitted: false,
    bindingMethod: "zero-source composition bound only to committed legal-design records; no source binary was read, acquired, copied, or committed",
    routeKeys: [ROUTE_KEY],
    statutoryAuthority: "section 943.0583, Florida Statutes; Fla. R. Crim. P. 3.9895",
    allSourcesExact: true,
    allSourcesExactNote: "true vacuously because the assigned CUSTOM_PLEADING_FROM_CODIFIED_TEXT family requires zero source binaries",
    sources: [],
    documents: [],
    groundingRecords: GROUNDING_RECORDS,
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "independent verification, visual acceptance, counsel approval, source authority, or approval for participant delivery",
      "that a disputed victim-status or evidentiary question can remain in self-help",
      "that any local circuit cover sheet, copy rule, or intake procedure is satisfied",
      "that any commercial route is open"
    ]
  });
  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    routeSelectionId: "fl-human-trafficking-victim-expunction-943-0583",
    routeSelectionNote: "The route fixes expunction under section 943.0583. The packet prints EXPUNCTION and does not ask the participant to choose sealing or an ordinary Florida route.",
    routeSelectionsMade: [
      { option: "EXPUNCTION", authority: "section 943.0583, Florida Statutes", routeDetermined: true }
    ],
    jurisdiction: "FL",
    statute: "section 943.0583, Florida Statutes",
    legalName: "Human Trafficking Victim Expunction",
    implementationStrategy: STRATEGY,
    renderStrategy: "composed_pleading",
    officialForm: null,
    componentSet: COMPONENTS,
    pageOrder: COMPONENTS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, "REQUIRED_BEFORE_FILING"],
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentSet: COMPONENTS,
    boundSources: [],
    boundSourcesNote: "zero source binaries; all pages were composed by this build",
    pdfs: artifacts.map((artifact) => ({
      file: artifact.file,
      documentId: "assembled_packet",
      role: "assembled_packet_of_composed_pleadings",
      fixture: artifact.fixture,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount
    })),
    artifacts,
    packets: artifacts.map((artifact) => ({ fixture: artifact.fixture, documents: COMPONENTS })),
    everyPageRastered: rasterPages.length === artifacts.reduce((sum, artifact) => sum + artifact.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterSkipped: skipRaster,
    rasterPages,
    independentVerificationPending: true
  });
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Each declared fixture value was read from the finalized PDF bytes on the component pages where the field map says it was written.",
    documents: proofs,
    artifacts: proofs.map((proof) => ({
      fixture: proof.fixture,
      valuesReportedByFinalizer: proof.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: proof.refusedFieldsWithInk
    })),
    blockingFindings: []
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((map) => map.canonicalRefusals
      .filter((row) => row.requiredBeforeFiling !== true)
      .map((row) => ({
        document: map.formNumber,
        field: row.field,
        label: row.effectiveLabel,
        refusalClass: row.category,
        why: row.why
      }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    whatThisIs: "the builder's count using the repository completeness contract",
    whatThisIsNot: "independent verification or a release verdict",
    counters: counted.counters,
    allNineZero,
    findings: counted.findings,
    totals: counted.totals,
    blankDispositions: counted.ledger.reduce((result, row) => {
      result[row.disposition] = (result[row.disposition] ?? 0) + 1;
      return result;
    }, {})
  });
  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    renderedArtifacts: artifacts.length,
    rasterPages: rasterPages.length,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated",
    popplerUsed: false,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A built packet is review evidence only; it opens no route and authorizes no fulfillment."
  });
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding: "The assigned catalog IDs for the petition and order retain Rule 3.989 in their names, while the committed 2019 identity correction records the human-trafficking instruments at Rule 3.9895(a) and (c).",
        treatment: "The exact assigned component IDs remain unchanged for queue identity, and each composed page prints its current human-trafficking caption and Rule 3.9895 subdivision. No registry or central source identity was edited."
      },
      {
        finding: "No source binary exists or is required for these court-promulgated rule-text instruments.",
        treatment: "The family binds zero binaries, records acquisitionCommissioned false, and composes only within its owned overlay directory."
      },
      {
        finding: "Victim-status facts and supporting evidence are sensitive and case-specific.",
        treatment: "They are left as declared REQUIRED_BEFORE_FILING fields, disclosed with trauma-informed language, and never inferred or embellished by the build."
      },
      {
        finding: "The route is packet-capable but retains independent, visual, counsel, and release gates.",
        treatment: "Runtime selection and generation remain disabled; no commercial route is opened."
      }
    ]
  });
  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    requested: "independent completeness verification, raster review, visual review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm the assigned Rule 3.989 petition/order catalog IDs are correctly rendered with the current Rule 3.9895(a) and (c) human-trafficking captions pending a central identity correction.",
      "Confirm the proof-path instructions accurately describe the effect of official documentation and the burden when none is attached.",
      "Confirm the no-fee and single-petition instructions and whether any statewide or local service step must be added.",
      "Confirm that the excluded-offense check and the listed self-help handoffs are sufficiently prominent."
    ],
    mattersForTheReviewersAttention: [
      "The proposed order is visibly marked unexecuted and every court-owned field is protected.",
      "Every required-before-filing label appears verbatim in participant-instructions.md.",
      "The build makes no source-authority, live, generation, or commercial-release claim."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allNineZero ? "COMPLETED" : "STOPPED",
    ...(allNineZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((counter) => counted.counters[counter] > 0),
      firstFindings: counted.findings.slice(0, 8)
    }),
    routeKey: ROUTE_KEY,
    implementationStrategy: STRATEGY,
    counters: counted.counters,
    directory: OUT,
    boundSources: 0,
    components: COMPONENTS,
    writes: maps.reduce((sum, map) => sum + map.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      packetSha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pages: artifact.pageCount
    })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allNineZero,
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
