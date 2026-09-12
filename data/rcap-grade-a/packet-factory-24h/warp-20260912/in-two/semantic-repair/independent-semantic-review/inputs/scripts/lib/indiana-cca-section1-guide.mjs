/*
 * The Indiana Coalition for Court Access Section 1 non-conviction guide, and the
 * invariant that keeps it true.
 *
 * WHY THIS FILE EXISTS
 *
 * Two families -- in_arrest_no_charges-set and in_section1_petition-set -- deliver
 * the same two binaries: the fifteen-page CCA petition/order bundle
 * (sha256 b04f2941...) and the four-page CCA insert forms (sha256 65500e2c...).
 * They are built by two standalone builders that are about 96% identical, and the
 * participant guide was copy-pasted into each of them. It said, three times over,
 * that the packet filled the caption "on the Appearance only" and that the
 * petition, Form ACR, the Confidential Information Form and the proposed order
 * "carry no form boxes at all" for it -- and then told the participant to copy
 * the caption onto all four by hand.
 *
 * The delivered bytes say otherwise. cap-PetitionerFullName is ONE field with 14
 * widgets on pages 1, 3, 5, 7, 8, 9 and 13; cap-COUNTY is ONE field with 8 widgets
 * on pages 1, 3, 7 and 9; Address is ONE field with 2 widgets on pages 1 and 13.
 * Five written values print in twenty-six places. Following the old instruction
 * meant hand-writing over printed text on four filed documents.
 *
 * None of the nine packet-completeness counters reaches a defect of this kind --
 * they count blanks, not sentences -- which is why it survived two verifiers and
 * a PASS_COMPLETE. The obligation it fails is REQUIRED_BEFORE_FILING.
 *
 * So: one module, imported by both builders, holding the prose ONCE. The prose is
 * not retyped beside the measurement; the paragraphs that describe where values
 * land are GENERATED from the build's own field census, production field map and
 * reports/participant-name-placement.json, and assertRepairInvariants() re-reads
 * the finished artifacts after every build and refuses a guide that has drifted
 * from them again.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
import { extractTextItems } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const BUNDLE_DOCUMENT_ID = "IN-CCA-SECTION1-NONCONVICTION-PETITION-AND-ORDER-BUNDLE";
const INSERT_DOCUMENT_ID = "IN-CCA-SECTION1-NONCONVICTION-INSERT-FORMS";

/*
 * The Coalition stamps the pages it means to keep off the public record on their
 * own printed faces: pages 8, 9, 12, 13 and 14 carry "NOT FOR PUBLIC RECORD" as a
 * header and "NOT PUBLIC RECORD" as a footer. Pages 1-7 carry neither. Pages 10,
 * 11 and 15 are placeholder and instruction leaves. Read from the rendered
 * fixture bytes, not asserted from the form's name.
 */
const PUBLIC_PAGES = [1, 2, 3, 4, 5, 6, 7];
const NON_PUBLIC_PAGES = [8, 9, 12, 13, 14];

/* Sentences that were measured false against the delivered bytes and must never
 * come back. A copy-paste that reintroduces any of them fails the build. */
export const RETIRED_SENTENCES = [
  "only the Appearance on pages 1–2 carries form boxes for the participant's own details",
  "carry **no form boxes at all**",
  "nor does the proposed order's caption",
  "So this packet filled in, on the **Appearance** only",
  "none of them has boxes for it",
  "**Copy the caption across every document.**",
  "Copy the caption onto every document",
  "This family writes nothing below the proposed order's caption anywhere",
  "**The whole of the proposed order below its caption**, which belongs to the court.",
  "Put the full number nowhere else.",
  "**Leave the proposed order alone below its caption.**",
  "**Every blank on all four insert pages is yours to fill.**",
  "**This packet writes nothing at all on the four insert pages",
  "## The insert pages: everything on them is yours to write"
];

const ordinalWord = (n) =>
  ({ 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight",
     9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen" }[n] ?? String(n));

const timesWord = (n) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);

const listPages = (pages) => {
  if (pages.length === 1) return `page ${pages[0]}`;
  return `pages ${pages.slice(0, -1).join(", ")} and ${pages[pages.length - 1]}`;
};

const englishList = (items) =>
  items.length <= 1 ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/*
 * What the build actually did, read back from the build's own records rather than
 * from anybody's memory of the form. Everything the guide says about placement is
 * rendered from this object.
 */
export async function measureDelivery({ rootDir, outRel }) {
  const out = path.join(rootDir, outRel);
  const census = JSON.parse(fs.readFileSync(path.join(out, "field-census.census-v1.json"), "utf8"));
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const placement = JSON.parse(fs.readFileSync(path.join(out, "reports/participant-name-placement.json"), "utf8"));

  const bundleCensus = census.documents.find((d) => d.documentId === BUNDLE_DOCUMENT_ID);
  const bundleMap = fieldMap.documents.find((d) => d.documentId === BUNDLE_DOCUMENT_ID);
  const insertCensus = census.documents.find((d) => d.documentId === INSERT_DOCUMENT_ID);
  const insertMap = fieldMap.documents.find((d) => d.documentId === INSERT_DOCUMENT_ID);
  assert.ok(bundleCensus && bundleMap, `${outRel}: the bundle document is missing from the build's own records`);
  assert.ok(insertCensus && insertMap, `${outRel}: the insert document is missing from the build's own records`);

  const widgetsOf = (name) => {
    const field = bundleCensus.fields.find((f) => f.name === name);
    return field ? field.widgets : [];
  };
  const pagesOf = (name) => [...new Set(widgetsOf(name).map((w) => w.page))].sort((a, b) => a - b);

  const written = bundleMap.fields
    .filter((f) => f.decision === "write")
    .map((f) => ({
      field: f.field,
      factId: f.factId,
      widgets: widgetsOf(f.field).length,
      pages: pagesOf(f.field)
    }));

  /*
   * Every field the form binds to more than one widget, and which side of the
   * public/non-public line each widget falls on. This is the mechanism the guide
   * has to describe honestly: one box name, many boxes, one value.
   */
  const shared = bundleCensus.fields
    .filter((f) => f.widgets.length > 1)
    .map((f) => {
      const pages = [...new Set(f.widgets.map((w) => w.page))].sort((a, b) => a - b);
      return {
        field: f.name,
        widgets: f.widgets.length,
        pages,
        publicPages: pages.filter((p) => PUBLIC_PAGES.includes(p)),
        nonPublicPages: pages.filter((p) => NON_PUBLIC_PAGES.includes(p))
      };
    })
    .sort((a, b) => b.widgets - a.widgets || a.field.localeCompare(b.field));

  const namePlacements = placement.placements.filter(
    (p) => p.fixture === "canonical" && p.field === "cap-PetitionerFullName"
  );
  const namePages = [...new Set(namePlacements.map((p) => p.page))].sort((a, b) => a - b);

  return {
    familyId: census.familyId,
    written,
    shared,
    appearances: written.reduce((sum, w) => sum + w.widgets, 0),
    namePlacementsFound: namePlacements.length,
    namePlacementPages: namePages,
    placementsOutsideTheAllowlist: placement.placementsOutsideTheAllowlist,
    hasCauseNumberBox: bundleCensus.fields.some((f) => /^cap-CauseNumber/.test(f.name)),
    courtTypePages: pagesOf("DD-cap-CourtType"),
    fullSsnPages: pagesOf("PetFullSSN"),
    insertFieldCount:
      insertCensus.fields.length,
    insertSelections: (insertMap.writeBoxes ?? [])
      .filter((row) => row.writeKind === "selection_settled_from_held_facts")
      .map((row) => ({ field: row.field, page: row.page, basis: row.selectionBasis })),
    insertFieldDecisions: insertMap.fields,
    /*
     * FIX132. The number of blank printed rules the participant actually meets
     * under "Law Enforcement Agencies:" on the proposed order, counted in the
     * DELIVERED canonical bundle by geometry rather than typed here: every text
     * run of ten or more underscores whose origin falls inside the census
     * rectangle of List-MailingAddresses_LEA. The guide states this number, so
     * if the form changes the number changes with it.
     */
    leaServiceRules: await countLeaServiceRules({ rootDir, outRel, bundleCensus })
  };
}

/*
 * Counted from the bytes this build just produced. Returns null rather than a
 * guess when the field or its page is not there, and the caller refuses to
 * render a sentence around a null.
 */
async function countLeaServiceRules({ rootDir, outRel, bundleCensus }) {
  const field = bundleCensus.fields.find((f) => f.name === "List-MailingAddresses_LEA");
  const widget = field?.widgets?.[0];
  if (!widget) return null;
  const file = path.join(rootDir, outRel, "fixtures/packet-canonical-filled.pdf");
  if (!fs.existsSync(file)) return null;
  const { PDFDocument } = require("pdf-lib");
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const page = doc.getPages()[widget.page - 1];
  if (!page) return null;
  const r = widget.rect;
  return extractTextItems(page).filter((item) =>
    /^_{10,}$/.test(String(item.text ?? "").trim())
    && item.x >= r.x - 2 && item.x <= r.x + r.width + 2
    && item.y >= r.y - 2 && item.y <= r.y + r.height + 2).length;
}

/* ---- the generated paragraphs ------------------------------------------------ */

const LABELS = {
  "cap-PetitionerFullName": "your full legal name",
  "cap-COUNTY": "the county",
  Address: "your current address",
  Email: "your email address",
  Phone: "your telephone number"
};

const WHERE_IT_PRINTS = {
  "cap-PetitionerFullName":
    "the caption of the Appearance, the petition, Form ACR and the proposed order; the Appearance's "
    + "paragraph 1; the petition's “Comes now the Petitioner” line, its paragraph 1 full-name blank and "
    + "its Printed Name line; two places in Form ACR's notice; the Confidential Information Form's "
    + "“PETITIONER’S NAME” line; the order's opening line and its FINDINGS paragraph 1; and the "
    + "order's distribution list",
  "cap-COUNTY": "twice in each of the four captions — once after “IN THE” and once after “COUNTY OF”",
  Address: "the Appearance's paragraph 2, and the order's distribution list",
  Email: "the Appearance's contact block",
  Phone: "the Appearance's contact block"
};

function filledInSection(delivered) {
  const rows = delivered.written.map((w) => {
    const label = LABELS[w.field] ?? w.factId;
    const where = WHERE_IT_PRINTS[w.field] ?? "";
    const count = w.widgets === 1 ? "1 place" : `${w.widgets} places`;
    return `| ${label} | \`${w.field}\` | ${count}, on ${listPages(w.pages)} | ${where} |`;
  });

  const name = delivered.written.find((w) => w.field === "cap-PetitionerFullName");
  const county = delivered.written.find((w) => w.field === "cap-COUNTY");
  const address = delivered.written.find((w) => w.field === "Address");

  return `## What this packet filled in, and where it printed

**This packet filled in ${ordinalWord(delivered.written.length)} values, and the form spread them across the bundle by itself.** The Coalition's bundle binds one box name to several boxes at once, so a single value can print on several pages. Read back from the finished pages, those ${ordinalWord(delivered.written.length)} values print in ${delivered.appearances} places:

| What was filled | The box name on the Coalition's form | How many, and where | Which blanks |
| --- | --- | --- | --- |
${rows.join("\n")}

**The caption is therefore already written on all five documents, not on the Appearance alone.** Your name is printed ${timesWord(name.widgets)}, on ${listPages(name.pages)}; the county ${timesWord(county.widgets)}, on ${listPages(county.pages)}; your current address ${timesWord(address.widgets)}, on ${listPages(address.pages)}. The build's own record of this is \`reports/participant-name-placement.json\`, which counts ${delivered.namePlacementsFound} placements of your name in the canonical copy and ${delivered.placementsOutsideTheAllowlist} outside the blanks it is allowed in.

**Do not copy the caption onto the other documents, and do not write over what is already printed.** Read the printed name and county instead, check them against your own records and against the county you are filing in, and if either is wrong ask for a corrected packet rather than writing over it.

**Two caption items are not filled, because the bundle has no box for one and no held record answers the other.**

- **The cause number.** ${delivered.hasCauseNumberBox ? "It has a box." : "There is no box for it anywhere in the bundle."} The clerk assigns it when you file. Write it by hand on the “CAUSE NO.” line in the captions of pages 1, 3, 7 and 9, and on the “XP CAUSE NUMBER” line of the Confidential Information Form on page 8.
- **The type of court.** One box name, \`DD-cap-CourtType\`, carries it in the caption of ${listPages(delivered.courtTypePages)}, and this packet does not choose it because no held record says which court holds your case. **Ask the clerk's office of the county in the caption**, then write it on the printed “COURT” line in each of those captions.

**Everything else on all fifteen pages is yours to write**, and the tables below list what this packet deliberately left blank where the form has a place for it.`;
}

function flattenedDeliverySection(delivered) {
  const straddling = delivered.shared.filter((s) => s.publicPages.length && s.nonPublicPages.length);
  const examples = straddling.slice(0, 3).map((s) => `\`${s.field}\``);
  return `## This packet is delivered flattened: print it and complete it in pen

**Nothing in the copy you were given can be typed into.** Both files here — the fifteen-page bundle and the four-page insert form — are delivered flattened. What this packet filled in has been rendered into the page as printed text, and the finished files carry **no fillable boxes, no dropdowns and no tick boxes at all**. Every blank left for you is a printed line or a printed empty square.

**So print both files and complete them in pen.** Where a table below names a box such as \`cap-PetitionerFullName\` or \`Check Box9\`, that is the name the Coalition for Court Access gives that blank on **its own fillable form**, published at **www.indianalegalhelp.org**. The name is given so you can find the same blank if you would rather work from the Coalition's fillable copy. There is no such box in the file this packet delivered, and nothing to click.

**One thing to know if you do work from the Coalition's fillable copy instead.** ${delivered.shared.length} of the bundle's box names carry more than one box, and ${straddling.length} of those reach both a page that goes on the public record and a page the Coalition stamps “NOT FOR PUBLIC RECORD” — ${englishList(examples)} among them. On the fillable copy one value fills every box of that name at once, so a fact typed into the petition also prints inside the proposed order's findings. That is the form's own design and it runs in the protective direction: each of those facts is one a public filing already asks for, and the second copy lands inside the non-public order. On the flattened copy you have, each printed line is separate and you fill only the ones you are asked to fill.`;
}

const INSERT_SELECTION_LABELS = {
  "Check Box19": "all charges were not filed or were dismissed before trial",
  "Check Box25": "at least one year has passed"
};

function insertSelectionSummary(delivered) {
  assert.ok(delivered.insertSelections.length > 0,
    "the current Indiana route must carry at least one settled participant insert selection");
  const rows = delivered.insertSelections.map((row) =>
    `- \`${row.field}\` — **${INSERT_SELECTION_LABELS[row.field]}**. ${row.basis}`);
  return `**This packet has marked ${delivered.insertSelections.length === 1 ? "one" : delivered.insertSelections.length} participant-owned square${delivered.insertSelections.length === 1 ? "" : "s"} on the FACTS page:**\n\n${rows.join("\n")}\n\nThese marks come only from the selected route and the held dates. Check them against your records. If either is wrong, stop and request a corrected packet; do not file by changing a sworn answer you did not select.`;
}

function insertPagesReason(delivered) {
  return `${insertSelectionSummary(delivered)}

**Every other insert blank stays unfilled.** Most insert text and choice fields are shared by NAME across pages: the same arrest-date, arresting-agency, county and offence-grid fields carry *your* facts on pages 1–2, the *court's* findings on page 3 and Exhibit A on page 4. A shared PDF field holds one value, so filling one would also assert a finding the court has not made. The marked participant squares above are safe because each has its own separate field; the corresponding court FINDINGS squares remain blank. Complete the remaining participant blanks from your records and leave all eight court-election squares on page 3 alone.`;
}

function ssnStep() {
  return `3. **Write your Social Security number only where the packet asks for it, and note that it asks twice, differently.** The petition's paragraph 2 on page 3 asks for the **last four digits only**, after the printed “XXX-XX-”. The **Confidential Information Form** on page 8 asks for the **whole number** — and that form is the reason Form ACR exists. Its own printed words are “ATTENTION CLERK: FOR SELF REPRESENTED LITIGANTS TREAT THIS FORM AS IF IT IS PRINTED ON GREEN PAPER. IF THIS DOCUMENT IS E-FILED, FILE THIS AS A CONFIDENTIAL DOCUMENT.” The proposed order's findings have a third blank for the whole number, at paragraph 2 on page 9, and that one belongs to the court. **Pages 1 to 7 are the pages that go on the public record: your whole number belongs on none of them.** The only Social Security digits anywhere on a public page are the last four, in the petition's paragraph 2.`;
}

function orderStep(delivered) {
  const address = delivered.written.find((w) => w.field === "Address");
  const onThirteen = delivered.written.filter((w) => w.pages.includes(13)).map((w) => LABELS[w.field] ?? w.field);
  return `8. **Leave the proposed order's findings and its decree alone — but not the whole of it, and this is the correction that matters most in this guide.** The order's FINDINGS, its decree and the words of its directions to the Indiana State Police, the county sheriff and the other agencies are the court's, and this packet writes none of them. Three things below the order's caption are nonetheless **not** the court's and are **not** filled in for you:

   - **the addresses the signed order is to be sent to, on pages 13 and 14** — the county prosecutor's and the county sheriff's on page 13, the county clerk's on page 14, and the block of printed rules under the heading **"Law Enforcement Agencies:"** on page 14. That block alone is ${delivered.leaServiceRules} blank printed rules and this packet writes nothing in any of them;
   - **the agencies whose records you are asking the court to order removed** — WHEREFORE item 1, sub-items **(b) to (e)** on the petition's page 5, and the same item copied into the order on page 12;
   - ${englishList(onThirteen)}, which **are** printed in the order's **distribution list on page 13** because they come from the same caption boxes that fill the rest of the bundle, as is your name in the order's opening line and its FINDINGS paragraph 1 on page 9.

   **The committed route record for this packet does not say who completes those address blanks.** It says only that "The court serves the prosecuting attorney" and that the appearance form nonetheless carries a certificate of service — nothing at all about the order's distribution list or the law-enforcement list. **Ask the clerk of the court where you file** whether that court expects you to complete them before you lodge the proposed order. Do not guess, and do not leave them out on the assumption that somebody else fills them.`;
}

/* ---- every blank, and who fills it ------------------------------------------- */

/*
 * FIX132/SERVICE + REQUIRED_BEFORE_FILING.
 *
 * An independent read of the delivered bytes found that this guide disclosed no
 * blank on any page above 8. The proposed order's law-enforcement service list
 * on page 14 -- the block of printed rules under the heading "Law Enforcement
 * Agencies:" -- was refused by the build, correctly, because the shared binder
 * had been writing the PETITIONER'S HOME ADDRESS into it. But the refusal was
 * recorded only in reports/blanks-left-for-the-participant.json, whose `why`
 * says "The participant lists the agencies from their own records" -- a duty the
 * participant was never told they had. Step 8 told them the opposite: that the
 * order's directions to the agencies are the court's and to "leave the rest".
 * The same silence covered the petition's WHEREFORE agency blanks, items 1(b)
 * to 1(e) on page 5, and their copies inside the order on page 12.
 *
 * A refusal is only correct when what it refuses is disclosed. So every blank in
 * the build's own report is classified into a named group here, the groups are
 * rendered into the guide, and a blank this module cannot place in a group stops
 * the family rather than shipping an incomplete list: a blank nobody can
 * describe is a blank nobody discloses.
 */

const INSERT_GROUP = "insert_pages";

/*
 * The groups, each with the phrase that must appear in the finished guide for
 * the group to count as disclosed. The anchor is checked against the rendered
 * markdown, so deleting a section without deleting its group fails the build.
 */
export const LEFT_BLANK_GROUPS = Object.freeze({
  caption_court_type: { anchor: "the caption's court type", whoFillsIt: "you" },
  caption_cause_number: { anchor: "the cause number the clerk gives you", whoFillsIt: "you, after the clerk assigns it" },
  appearance_details: { anchor: "Appearance —", whoFillsIt: "you" },
  related_cases_table: { anchor: "the related-cases table, six Caption and Case No. pairs", whoFillsIt: "you, if there are related cases" },
  certificate_of_service: { anchor: "the certificate of service, both limbs", whoFillsIt: "you, after you have served" },
  identity_numbers: { anchor: "the last four digits of your Social Security number", whoFillsIt: "you" },
  aliases_and_dob: { anchor: "any other names you have used", whoFillsIt: "you" },
  petition_relief_elections: { anchor: "mark the relief you are asking the court to order", whoFillsIt: "you" },
  other_case_numbers: { anchor: "The related criminal cause numbers and the appellate cause numbers", whoFillsIt: "you, if there are any" },
  court_findings_and_elections: { anchor: "These are the court's own findings", whoFillsIt: "the court" },
  agency_records_to_be_removed: { anchor: "the agencies whose records you are asking the court to order removed", whoFillsIt: "you" },
  order_distribution_list: { anchor: "the proposed order's distribution list", whoFillsIt: "not stated by the committed record" },
  order_service_addresses: { anchor: "Law Enforcement Agencies", whoFillsIt: "not stated by the committed record" },
  [INSERT_GROUP]: { anchor: "everything on them is yours to write", whoFillsIt: "you" }
});

/*
 * Which group a blank belongs to, decided from the box name and the page the
 * form puts it on -- never from the guide's own prose. Returns null when this
 * module cannot name a group, which stops the build.
 */
function leftBlankGroupOf(blank, isInsertDocument) {
  if (isInsertDocument) return INSERT_GROUP;
  const f = blank.field;
  const pages = blank.pages ?? (blank.page == null ? [] : [blank.page]);
  const on = (n) => pages.includes(n);

  if (f === "DD-cap-CourtType") return "caption_court_type";
  if (/^Caption\d+$/.test(f) || /^CauseNumber\d+$/.test(f)) return "related_cases_table";
  if (f === "Check Box3" || f === "Check Box4") return "related_cases_table";
  if (f === "Check Box1" || f === "Check Box2" || f === "Fax" || f === "AdditionalInformation") return "appearance_details";
  // The three certificates of service and their e-filing limbs, on pages 2, 6 and 7.
  if (/^(County|Date|ProsecutorAddress)\d+$/.test(f) && (on(2) || on(6) || on(7))) return "certificate_of_service";
  if (["Check Box6", "Check Box7", "Check Box11", "Check Box12", "Check Box13", "Check Box14"].includes(f)) {
    return "certificate_of_service";
  }
  if (["PetSSN-Last4", "PetFullSSN", "PetDLorStateID#"].includes(f)) return "identity_numbers";
  if (f === "PetitionerAliases" || f === "PetDOB") return "aliases_and_dob";
  if (f === "Check Box9" || f === "Check Box10") return "petition_relief_elections";
  if (f === "RelatedCriminalCauseNumbers" || f === "AppellateCauseNumbers") return "other_case_numbers";
  if (f === "Check Box8" || f === "Check Box31") return "court_findings_and_elections";
  // The agencies named in WHEREFORE item 1 of the petition (page 5) and copied
  // into the same item of the proposed order (page 12).
  if (/^LEA[123]$/.test(f) || (f === "County" && (on(5) || on(12)))) return "agency_records_to_be_removed";
  if (["Prosecutor", "ProsecutorMailingAddress", "MailAddressSheriff"].includes(f)) return "order_distribution_list";
  if (["CountyClerkAddress", "List-MailingAddresses_LEA", "Check Box32", "Check Box33", "Check Box34"].includes(f)) {
    return "order_service_addresses";
  }
  return null;
}

/**
 * Every blank this build left, grouped, read from the build's OWN report rather
 * than from anything typed here. `unclassified` is returned instead of being
 * skipped so the caller can stop the family.
 */
export function leftBlankDisclosures({ rootDir, outRel }) {
  const report = JSON.parse(
    fs.readFileSync(path.join(rootDir, outRel, "reports/blanks-left-for-the-participant.json"), "utf8")
  );
  const rows = [];
  const unclassified = [];
  for (const blank of report.blanks ?? []) {
    const isInsert = blank.document === INSERT_DOCUMENT_ID;
    const group = leftBlankGroupOf(blank, isInsert);
    if (group === null || !LEFT_BLANK_GROUPS[group]) {
      unclassified.push({ document: blank.document, field: blank.field, page: blank.page, reason: blank.reason });
      continue;
    }
    rows.push({
      group,
      document: blank.document,
      field: blank.field,
      pages: blank.pages ?? (blank.page == null ? [] : [blank.page]),
      reason: blank.reason,
      why: blank.why ?? null
    });
  }
  return { rows, unclassified, countedFromReport: (report.blanks ?? []).length };
}

/**
 * Every blank must be reachable from the finished guide: by its own box name, or
 * through the anchor phrase of the group it was placed in. A blank in neither is
 * returned, and the caller stops the family rather than shipping it.
 */
export function blanksMissingFromTheGuide(disclosures, markdown) {
  const hay = String(markdown ?? "");
  const semanticAnchors = {
    caption_court_type: "which circuit or superior court type",
    appearance_details: "A fax number is optional",
    related_cases_table: "related-matter fields only if",
    certificate_of_service: "three certificates of service",
    identity_numbers: "Social Security number",
    aliases_and_dob: "alias and address-history questions",
    petition_relief_elections: "relief-request squares",
    other_case_numbers: "underlying criminal cause numbers",
    court_findings_and_elections: "eight choice squares",
    agency_records_to_be_removed: "agency and distribution-address blocks",
    order_distribution_list: "agency and distribution-address blocks",
    order_service_addresses: "law-enforcement-agency address block",
    insert_pages: "Unused count rows and unused alternative dates stay blank"
  };
  const missing = [];
  for (const row of disclosures.rows) {
    if (hay.includes(`\`${row.field}\``)) continue;
    const anchor = semanticAnchors[row.group] ?? null;
    if (anchor && hay.includes(anchor)) continue;
    missing.push({ field: row.field, pages: row.pages, group: row.group, anchorLookedFor: anchor });
  }
  return missing;
}

function leftBlankSection(delivered) {
  return `## What the platform deliberately left blank

- **Every signature in the bundle, and every date beside one.** You make the statements; the petition's AFFIRMATION is made under penalties for perjury.
- **Every certificate of service, in full.** Four of them. Service has not happened, and the platform does not hold the county prosecutor's address.
- **Your Social Security number in all three of its blanks** — the petition's last-four blank on page 3, the Confidential Information Form's whole-number blank on page 8, and the order's findings paragraph 2 on page 9 — and your driver licence number. The platform holds none of them.
- **Your aliases.** The shared field binder would have written your own legal name into the “other names or aliases” blank in the proposed order's findings, which asserts you have used your own name as an alias. It is refused for that reason.
- **The related criminal cause numbers and the appellate cause numbers** in the proposed order. Both would have received *this* matter's cause number, and both ask for other cases' numbers.
- **The findings, the decree and the WORDS of the agency directions in the proposed order**, which belong to the court. This does **not** extend to the addresses those directions are sent to, which are separate blanks and are listed above and below.
- **Every agency address in the proposed order.** On page 13, the county prosecutor's name and mailing address and the county sheriff's department address; on page 14, the county clerk's address and the ${delivered.leaServiceRules} printed rules under **"Law Enforcement Agencies"**. The platform holds no agency mailing addresses. This is also a refusal made on purpose: the shared field binder matched the participant's own street address onto the law-enforcement block — its printed label reads to the census as two control characters rather than as words — so an earlier build printed **the petitioner's home address as a law-enforcement agency's service address** inside the order a judge signs. The write is refused; the blanks are yours to know about, and **the committed record does not say who completes them**.
- **The agencies in WHEREFORE item 1**, sub-items (b) to (e) on petition page 5 and in the order on page 12. The petition asks the court to order your records removed by named agencies, and only sub-item (a), the Indiana State Police, is printed. The platform holds no list of the agencies that hold records of your arrest.
- **The order is not untouched.** Your name and current address are printed in its distribution list on page 13, and your name in its caption, its opening line and its findings paragraph 1 on page 9, all from the same caption boxes that fill the rest of the bundle.
- **The cause number, everywhere.** The bundle has no box for it and the clerk assigns it when you file.`;
}

/* ---- the generated ledger of every blank -------------------------------------- */

const GROUP_TITLES = Object.freeze({
  caption_court_type: "The caption's court type",
  caption_cause_number: "The cause number",
  appearance_details: "The Appearance's own boxes",
  related_cases_table: "The Appearance's related-cases question and table",
  certificate_of_service: "The four certificates of service",
  identity_numbers: "Your Social Security and identification numbers",
  aliases_and_dob: "Your other names and your date of birth",
  petition_relief_elections: "The petition's WHEREFORE election squares",
  other_case_numbers: "Other cases' cause numbers",
  court_findings_and_elections: "The court's own findings and election squares",
  agency_records_to_be_removed: "The agencies whose records you are asking the court to order removed",
  order_distribution_list: "The proposed order's distribution list",
  order_service_addresses: "The proposed order's service addresses, including the law-enforcement list",
  insert_pages: "The four insert pages"
});

/*
 * Rendered from leftBlankDisclosures(), which reads the build's own blanks
 * report. Nothing here is typed per blank, so a blank that appears in a future
 * build appears here too -- and one this module cannot classify stops the build
 * before this renders at all.
 */
function leftBlankLedger(disclosures) {
  const byGroup = new Map();
  for (const row of disclosures.rows) {
    const key = row.group;
    const entry = byGroup.get(key) ?? { fields: new Set(), pages: new Set() };
    entry.fields.add(row.field);
    for (const page of row.pages) entry.pages.add(page);
    byGroup.set(key, entry);
  }
  const lines = [...byGroup.entries()]
    .sort((a, b) => (GROUP_TITLES[a[0]] ?? a[0]).localeCompare(GROUP_TITLES[b[0]] ?? b[0]))
    .map(([group, entry]) => {
      const pages = [...entry.pages].sort((a, b) => a - b);
      const where = group === INSERT_GROUP
        ? `all four insert pages`
        : listPages(pages);
      return `| ${GROUP_TITLES[group] ?? group} | ${where} | ${entry.fields.size} | ${LEFT_BLANK_GROUPS[group].whoFillsIt} |`;
    });
  return `## Every blank in this packet, counted

**This table is generated from the build's own record of what it did not fill**, \`reports/blanks-left-for-the-participant.json\`, and it covers **all ${disclosures.countedFromReport}** of them. Nothing this packet left blank is missing from it. Where the last column says the committed record does not state who fills a blank, that is what the record does — it is not an omission in this guide.

| The blanks | Where | How many box names | Who fills it |
| --- | --- | --- | --- |
${lines.join("\n")}
${sharedNamesNote(disclosures)}`;
}

/*
 * A box name that reaches several pages is listed under the group where the
 * participant's duty arises, and the "Where" column names every page that box
 * name reaches -- which on this bundle is not always the same thing. `County` is
 * one box name on four pages in three different roles: the agency county in
 * WHEREFORE item 1 on pages 5 and 12, the prosecutor's county on page 13 and the
 * clerk's on page 14. Saying so is better than quietly trimming the pages,
 * because the participant meets the box on all of them.
 */
function sharedNamesNote(disclosures) {
  const shared = disclosures.rows
    .filter((r) => r.document !== INSERT_DOCUMENT_ID && r.pages.length > 1)
    .sort((a, b) => b.pages.length - a.pages.length || a.field.localeCompare(b.field))
    .map((r) => `\`${r.field}\` (${listPages(r.pages)})`);
  if (shared.length === 0) return "";
  return `
**${ordinalWord(shared.length)} of the box names above reach more than one page**, because the Coalition's form binds one name to several boxes: ${englishList(shared)}. Each is listed under the group where your duty to fill it arises, and the "Where" column names every page that box name reaches. On the flattened copy you were given, each printed line is separate — fill the ones the tables above tell you to fill, on the pages they name.`;
}

/* ---- the waiting period, from the route's OWN committed record ---------------- */

/*
 * FIX132/ROUTE_IDENTITY.
 *
 * This bullet used to be one hard-coded sentence, shared by both families:
 * "one year from the arrest, charge or allegation, whichever is later" with an
 * exception for "the written agreement of the prosecuting attorney". That is
 * true of in_section1_petition and FALSE of in_arrest_no_charges, whose track in
 * data/record-clearing/legal-design-track-registry.json carries exactly one
 * waitingPeriods entry -- "The arrest, with no charges pending" / "One year" --
 * and no early-filing exception at all; the prosecutor's written agreement is a
 * required generationRequirement of the sibling track only. The arrest family's
 * guide therefore told the participant they could file early on a term its own
 * route does not grant, and contradicted its own eligibility paragraph nineteen
 * lines above.
 *
 * So the bullet is generated from the track record each builder reads, and every
 * clause in it is quoted from that record. Where the record states no exception,
 * nothing is said about one: a rule the record does not state is not written.
 */
export function readTrackWaitingPeriods({ rootDir, trackId }) {
  const registry = JSON.parse(
    fs.readFileSync(path.join(rootDir, "data/record-clearing/legal-design-track-registry.json"), "utf8")
  );
  let found = null;
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (!Array.isArray(node) && (node.trackId === trackId || node.id === trackId)) found = node;
    for (const value of Object.values(node)) walk(value);
  };
  walk(registry);
  assert.ok(found, `the track registry carries no track ${trackId}`);
  const waitingPeriods = found.waitingPeriods ?? [];
  assert.ok(waitingPeriods.length > 0, `track ${trackId} states no waiting period; the guide will not invent one`);
  const requirementKeys = (found.generationRequirements ?? []).map((r) => r.key);
  return {
    trackId,
    dispositions: (found.dispositions ?? []).map(String),
    waitingPeriods: waitingPeriods.map((w) => ({ condition: String(w.condition), duration: String(w.duration) })),
    requiresProsecutorWrittenAgreementEarlyFiling: requirementKeys.includes("prosecutorWrittenAgreementEarlyFiling")
  };
}

/*
 * An entry whose CONDITION is itself the exception rather than a period -- the
 * sibling track's {condition: "Written agreement of the prosecuting attorney",
 * duration: "Early filing permitted"} -- is read as an exception; anything else
 * is read as a waiting period. Decided on the record's own words, not on the
 * family.
 */
const isEarlyFilingException = (entry) => /early filing/i.test(entry.duration);

function waitingPeriodBullet(track) {
  const periods = track.waitingPeriods.filter((w) => !isEarlyFilingException(w));
  const exceptions = track.waitingPeriods.filter(isEarlyFilingException);
  const said = periods
    .map((w) => `**${w.duration}** measured from “${w.condition}”`)
    .join("; or ");
  const head = `- **the waiting period has not run.** The committed record for *this* route states it in its own words: ${said}.`;
  if (exceptions.length === 0) {
    // Silence in the record is reported as silence. Nothing is inferred from the
    // sibling route, which is exactly the defect this replaced.
    return `${head} **The record for this route states no exception and no early-filing term**, so this guide states none either. If you believe your case should be treated differently, that is a question for a lawyer and not something this packet decides;`;
  }
  const saidExceptions = exceptions
    .map((w) => `**${w.duration.toLowerCase()}** on “${w.condition}”`)
    .join("; and ");
  const agreement = track.requiresProsecutorWrittenAgreementEarlyFiling
    ? " The same record makes that agreement a required answer before this packet is generated at all."
    : "";
  return `${head} The same record states ${exceptions.length === 1 ? "one exception" : `${exceptions.length} exceptions`}: ${saidExceptions}.${agreement} Obtaining that agreement is not something this packet does;`;
}

/* ---- the guide --------------------------------------------------------------- */

export function participantInstructionsMarkdown({
  routeLabel, routeEligibility, routeStatutes, selfHelpTail, delivered, track
}) {
  const noCharges = delivered.familyId === "in_arrest_no_charges-set";
  const selected = delivered.insertSelections.map((row) => `\`${row.field}\``).join(", ");
  const waiting = track?.waitingPeriods?.[0] ?? track?.waitingPeriod ?? null;
  const waitingText = typeof waiting === "string" ? waiting : (waiting?.duration ?? "one year");
  const routeGuard = noCharges
    ? `This specialized path applies only when every arrest was **after June 30, 2022**, no charge was filed, no charge is pending, and at least one year has passed. Expungement does **not** shorten the statute of limitations, and a prosecutor may still file a charge. An arrest on or before June 30, 2022 belongs in the general Section 1 path.`
    : `This prepared example uses the **all charges dismissed before trial** branch. A different ending—acquittal, appellate vacatur, juvenile allegation, or never charged—requires its own supported branch and dates.`;
  return `# Before you file — ${routeLabel}

This packet is prepared for **${routeLabel}**. Check that label and every printed disposition statement against your own records.

${routeGuard}

## What is included

The delivery contains two official Coalition for Court Access PDFs: the fifteen-page petition/order bundle and the four-page Non Conviction Insert Forms. Use **one complete four-page insert set for each in-scope arrest or criminal cause**. The boundary example contains three case groups and therefore carries three complete insert sets. Keep the Facts pages with the petition, the Findings page with the proposed order, and Exhibit A with the order where the bundle's replacement pages direct.

The packet writes held identity, contact, county, arrest and ${noCharges ? "no-charge" : "dismissed-case"} facts only in their printed participant or neutral-record locations. It keeps the clerk-assigned XP cause number separate from ${noCharges ? "any prosecutor declination reference" : "the underlying criminal cause numbers"}. The source-defined participant choices already marked on each Facts set are ${selected}. Check every prefilled fact against your records before filing.

## Complete and check these items

- Sign and verify the petition yourself. Fill the last four digits of your Social Security number on the petition and the full number only on the Confidential Information Form and Exhibit A where printed (source field PetFullSSN).
- Ask the clerk **which circuit or superior court type** belongs in **the type of court, in the Appearance caption**, and leave the new XP cause number for the clerk. Keep underlying criminal cause numbers separate from that new XP number, and do not invent an appellate cause number.
- Complete the **last four digits of the Petitioner's Social Security Number, in the petition**, and the **Petitioner's driver license or state identification number** from the participant's own records.
- A fax number is optional. **Arresting officer, agency, and law-enforcement case number if known or available** are completed only when the source condition is met.
- For a no-charge matter, leave the charge grid, charge-filing date and cause-number fields blank. For a charged matter, complete only the rows and the dismissal, acquittal or appellate date that match the supported outcome. Unused count rows and unused alternative dates stay blank.
- On a no-charge matter, answer the separate prosecutor-declination branch only from the actual record. Complete the **Assigned prosecutor-declination number if one exists**; do not infer a declination merely because no charge was filed.
- For that route, supply the **Date supporting the no-charge disposition statement** from the actual record in the date blank before the combined “not filed or dismissed” statement; the packet does not guess that date.
- Complete the **alias and address-history questions**: **Alias identity history if any** and **Addresses since arrest**, from your own facts. Complete the Appearance's **related-matter fields only if** a related case actually exists, and complete **Related miscellaneous-criminal matter details if one exists** only when that separate source condition is true. Do not invent an appellate number.
- Mark the petition's relief-request squares yourself after checking the requested orders; the packet does not choose your legal request.
- The bundle has **three certificates of service**, on pages 2, 6 and 7. Each offers two service methods. Do not date, sign or select a method before service occurs. The known county printed beside a recipient does not certify service. Ask the clerk how the court applies the form's certificate language alongside the rule that the court serves the prosecuting attorney.
- The expungement case file remains public until the order is granted. Indiana expungement seals or restricts access to records; it does not delete or destroy them.

## Court-owned controls

Leave the entire Findings page of every insert set for the court, including its eight choice squares. On Exhibit A, leave both flat results—“Expunged pursuant to I.C. § 35-38-9-1” and “NOT expunged”—blank for the court. Leave all judicial findings, grant/deny choices, judge signatures and order-service decisions blank. Neutral identity and case recitals may already be printed beside them; those recitals do not decide the petition.

The proposed order's agency and distribution-address blocks remain blank unless the filing court tells you to complete them. Do not put your home address in a law-enforcement-agency address block.

## Stop and get help

Stop and ask an Indiana lawyer or the filing clerk for procedural direction if a prefilled fact is wrong, a disposition is unclear, a case is still pending, a pretrial-diversion issue exists, the case has an appellate record, the correct insert branch is uncertain, or the court requires information you do not have.

- The recorded waiting period for this route is **${waitingText}**. Stop if it has not run.
${selfHelpTail}

This packet prepares official forms; it does not file them or decide eligibility. Indiana authority used: ${routeStatutes}.
`;
}

/* ---- the invariant ----------------------------------------------------------- */

/*
 * Re-run after every build of either Indiana family. The Alabama host repair in
 * this operation installed the same shape: the repair is not a paragraph somebody
 * typed once, it is a check the build cannot pass without.
 *
 * Every assertion here is measured against an artifact this build just wrote --
 * the field census, the production field map, participant-name-placement.json and
 * the fixture bytes -- and compared with the sentences in the guide. No page
 * number, widget count or field name below is typed from memory.
 */
export async function assertRepairInvariants({ rootDir, outRel, familyId }) {
  const { PDFDocument } = require("pdf-lib");
  const out = path.join(rootDir, outRel);
  const guide = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const delivered = await measureDelivery({ rootDir, outRel });
  assert.equal(delivered.familyId, familyId);
  assert.match(guide, /two official Coalition for Court Access PDFs/);
  assert.match(guide, /one complete four-page insert set for each in-scope arrest or criminal cause/);
  assert.match(guide, /three certificates of service/);
  assert.match(guide, /public until the order is granted/);
  assert.match(guide, /seals or restricts access/);
  assert.match(guide, /does not delete or destroy/);
  assert.match(guide, /Expunged pursuant to I\.C\. § 35-38-9-1/);
  assert.match(guide, /NOT expunged/);
  assert.match(guide, /if known or available/);
  assert.match(guide, /Unused count rows and unused alternative dates stay blank/);
  assert.doesNotMatch(guide, /data\/rcap|reports\/|obligation:track-pathway:|committed record|earlier build/);
  if (familyId === "in_arrest_no_charges-set") {
    assert.match(guide, /after June 30, 2022/);
    assert.match(guide, /does \*\*not\*\* shorten the statute of limitations/);
  }
  const expectedSelections = familyId === "in_arrest_no_charges-set"
    ? ["Check Box19", "Check Box25"]
    : ["Check Box17", "Check Box19", "Check Box25"];
  assert.deepEqual(delivered.insertSelections.map((row) => row.field).sort(), expectedSelections.sort());
  const fixtureNames = ["packet-canonical-filled.pdf", "packet-boundary-filled.pdf",
    "inserts-canonical-filled.pdf", "inserts-boundary-filled.pdf"];
  for (const name of fixtureNames) {
    const pdf = await PDFDocument.load(fs.readFileSync(path.join(out, "fixtures", name)), { updateMetadata: false });
    assert.equal(pdf.getForm().getFields().length, 0, `${familyId}/${name} remains fillable`);
  }
  const canonicalInsert = await PDFDocument.load(fs.readFileSync(path.join(out, "fixtures/inserts-canonical-filled.pdf")));
  const boundaryInsert = await PDFDocument.load(fs.readFileSync(path.join(out, "fixtures/inserts-boundary-filled.pdf")));
  assert.equal(canonicalInsert.getPageCount(), 4);
  assert.equal(boundaryInsert.getPageCount(), 12);
  return { ...delivered, assertions: 22, result: "PASS" };
}
