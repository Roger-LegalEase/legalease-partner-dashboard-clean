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
  "**Leave the proposed order alone below its caption.**"
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
  assert.ok(bundleCensus && bundleMap, `${outRel}: the bundle document is missing from the build's own records`);

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
      (census.documents.find((d) => d.documentId === INSERT_DOCUMENT_ID)?.fields ?? []).length,
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

function insertPagesReason() {
  return `**This packet writes nothing at all on the four insert pages, and the reason is in how the form is built rather than in what the platform holds.** The insert's boxes are shared by NAME across its own four pages: the same arrest-date, arresting-agency, county and offence-grid boxes carry *your* facts on pages 1–2, the *court's* findings on page 3, and Exhibit A on page 4. A PDF form field with several boxes holds one value, so anything this packet typed as your allegation would print, in the same breath, as the court's own finding. There is no value the platform could put in those boxes that would not also be asserted as a finding the court has not made, so the packet puts none. The Coalition for Court Access publishes these pages for you to complete.`;
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
  const missing = [];
  for (const row of disclosures.rows) {
    if (hay.includes(`\`${row.field}\``)) continue;
    const anchor = LEFT_BLANK_GROUPS[row.group]?.anchor ?? null;
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
  routeLabel, routeEligibility, routeKeys, routeStatutes, selfHelpTail, delivered, track, disclosures
}) {
  assert.ok(track && Array.isArray(track.waitingPeriods) && track.waitingPeriods.length > 0,
    "the guide will not render without this route's own waiting-period record");
  assert.ok(Number.isInteger(delivered.leaServiceRules) && delivered.leaServiceRules > 0,
    "the guide states the number of law-enforcement service rules on the order and cannot state a number it did not measure");
  const LEA_RULE_COUNT = delivered.leaServiceRules;
  assert.ok(disclosures && Array.isArray(disclosures.rows) && disclosures.rows.length > 0,
    "the guide will not render without the build's own list of the blanks it left");
  assert.equal(disclosures.unclassified.length, 0,
    `the guide will not render around a blank it cannot describe: ${JSON.stringify(disclosures.unclassified)}`);
  return `# Filing instructions — ${routeLabel} (Indiana, I.C. § 35-38-9-1)

This packet is one PDF published by the Coalition for Court Access and approved for use in Indiana courts. It contains five documents:

| Pages | Form | What it is |
| --- | --- | --- |
| 1–2 | CCA-GF-0120-3016 | **Appearance by Unrepresented Person in Expungement Matter** |
| 3–6 | CCA-XP-0120-7000 | **Verified Petition** for expungement and sealing under I.C. § 35-38-9-1 |
| 7 | CCA-XP-0120-7002 | **Form ACR** — Notice of Exclusion of Confidential Information from Public Access |
| 8 | — | **Confidential Information Form** (not a public record) |
| 9–15 | CCA-XP-0120-7006 | **Findings and Order** granting the petition — the proposed order |

${routeEligibility}

## Read this first: the bundle sends you to three insert pages, and they are in this packet

**The Coalition for Court Access bundle is not a complete filing on its own, and it says so in its own words, three times.** Where the petition's factual allegations should be, page 4 prints:

> Take out this page and insert your non-conviction **Facts** pages (from the Non Conviction Insert Forms)

and inside the proposed order, pages 10 and 11 print:

> Take out this page and insert your non-conviction **Findings** pages (from the Non Conviction Insert Forms)
>
> Take out this page and insert your non-conviction **Exhibit** pages (from the Non Conviction Insert Forms)

**All three sets are in this packet.** They are the Coalition for Court Access Non Conviction Insert Forms, the second document here, four pages:

| Insert page | What it is | Which printed instruction it answers |
| --- | --- | --- |
| 1–2 | **FACTS PERTAINING TO EXPUNGEMENT MATTER** | the Facts pages, bundle page 4 |
| 3 | **FINDINGS AS TO EXPUNGEMENT MATTER** | the Findings pages, proposed order page 10 |
| 4 | **EXHIBIT A** | the Exhibit pages, proposed order page 11 — where "all information necessary to identify particular agency records that are to be expunged pursuant to this Order" goes, as I.C. § 35-38-9-1(g) requires |

**Do exactly what the bundle says: take out each placeholder page and put the matching insert page in its place.** The insert pages are printed separately here so that you can.

**Every blank on all four insert pages is yours to fill.** Nothing on them is filled in for you, and that is not an oversight — the reason is below, in the section headed "The insert pages".

${flattenedDeliverySection(delivered)}

${filledInSection(delivered)}

## Where you file it

**File in a circuit or superior court in the county where the charges or allegation were filed — or, if no charges were ever filed, in the county where the arrest happened.** That is what the committed route record for this packet says, in those words.

**The county is already written in all four captions** — ${listPages(delivered.written.find((w) => w.field === "cap-COUNTY").pages)} — from what the platform holds for your matter. Check it against where the charges were filed, or where the arrest happened, before you file.

**Which court, and which type of court, is left for you.** The caption's court-type blank is one box name repeated in all four captions and this packet does not choose it. **Ask the clerk's office of the county in the caption which court holds your case**, and write it on the printed line in each caption.

## What it costs

**There is no filing fee.** The committed route record for this packet states it twice: the filing fee is "None.", and "Section 1 petitions carry no filing fee." On waiver it records "Not applicable. There is no fee."

Because there is no fee, there is nothing to apply to have waived. **If the clerk asks you to pay something to file this petition, ask that clerk what the charge is for** before you pay it.

## Who you serve, and how

**The statute says the court serves the prosecutor. The forms carry certificates of service anyway. Do both — that is, follow the forms.**

The committed route record for this packet states the statutory position: "The court serves the prosecuting attorney", under I.C. § 35-38-9-1(f). And then it states the practical one, in the same record: "The CCA appearance form nonetheless carries a certificate of service to the county prosecutor; **follow the form**."

**The bundle carries four certificates of service** — one on the Appearance, one on the petition, one on Form ACR, and an e-filing limb on each. Each offers two ways to certify: **by first-class U.S. mail, postage prepaid, or hand delivery** to the county prosecutor at an address you write in; **or** service **via the Indiana E-filing System**.

**This packet leaves every certificate of service completely blank**, including the county and the prosecutor's address. Service has not happened when the packet is produced, LegalEase does not hold the prosecutor's address, and a certificate signed before service certifies a delivery that did not occur. **Complete them after you have actually served, and not before.**

**No held record and no printed line states a deadline for service on this route.** **Ask the clerk of the court where you file** whether that court expects you to serve the prosecutor yourself and by when, and get the county prosecutor's mailing address from that clerk's office or from the prosecutor's own office.

## What you must do before you file

1. **Put each insert page in place of the placeholder page that calls for it.** The Facts, Findings and Exhibit pages are the second document in this packet; the bundle's pages 4, 10 and 11 each tell you to take that page out and put the matching insert in its place. Do that first, and fill every blank on all four insert pages by hand — the section headed "The insert pages" below says which block is which, and why nothing on them is filled in for you.
2. **Write the cause number into every caption once the clerk gives it to you**: the “CAUSE NO.” line on pages 1, 3, 7 and 9, and the “XP CAUSE NUMBER” line on page 8. The bundle has no box for it. **The county and your name are already printed in those captions — do not write over them.**
${ssnStep()}
4. **Write your driver licence or state identification number** in the petition's paragraph 2.
5. **List any other names or aliases you have used**, in the petition's paragraph 1, beside the name already printed there.
6. **Answer the Appearance's related-cases question**, and list any related captions and case numbers.
7. **Sign what you are asked to sign**: the Appearance, the petition's AFFIRMATION — "I affirm under penalties for perjury that the foregoing representations and statements are true and accurate" — and Form ACR. Every signature line in this bundle is left blank.
${orderStep(delivered)}
9. **Serve the prosecutor and complete the certificates of service — after service, not before.**

## The items you must supply, where the form has a place for them

| Page | The blank on the form | What to write |
| --- | --- | --- |
| 1, 3, 7, 9 | the caption's court type (the Coalition's box name is \`DD-cap-CourtType\`; one name, four captions) | the court your case is in — ask the clerk of the county in the caption, then write it in all four captions |
| 1, 3, 7, 8, 9 | the caption's “CAUSE NO.” line, and page 8's “XP CAUSE NUMBER” line — no box, on any page | the cause number the clerk gives you when you file |
| 1 | Appearance — "Fax:" (\`Fax\`) | your fax number, or leave blank if you have none |
| 1 | Appearance — "I will accept service at the above email address" (\`Check Box1\`) | mark the printed square if you want to be served by email |
| 1 | Appearance — "Attorney General confidential address" (\`Check Box2\`) | mark it only if you have used that address in a related case |
| 1 | Appearance — "There are related cases: Yes / No" (\`Check Box3\`, \`Check Box4\`) | mark the one that is true |
| 1–2 | Appearance — the related-cases table, six Caption and Case No. pairs | the caption and case number of each related case, if there are any |
| 2 | Appearance — "Additional information as required by local rule" (\`AdditionalInformation\`) | whatever the local rule of your court requires. Ask the clerk |
| 2 | Appearance — the certificate of service, both limbs | the date, the county, the prosecutor's address — **after you have served** |
| 3 | Petition ¶2 — "XXX-XX-______" (\`PetSSN-Last4\`) | the last four digits of your Social Security number |
| 3 | Petition ¶2 — driver licence or state ID number (\`PetDLorStateID#\`) | your driver licence or state identification number |
| 3 | Petition ¶1 — the aliases blank (\`PetitionerAliases\`), beside your printed name | any other names you have used, or "none" |
| 5 | Petition WHEREFORE — the two election squares (\`Check Box9\`, \`Check Box10\`) | mark the relief you are asking the court to order |
| 5 | Petition — the signature line above your printed name | your signature. Your name is printed beneath it already |
| 6 | Petition — the certificate of service, both limbs | as on page 2, **after you have served** |
| 7 | Form ACR — the certificate of service, both limbs | as above, **after you have served** |
| 8 | Confidential Information Form — full Social Security Number (\`PetFullSSN\`) | your whole Social Security number. This form is filed as a confidential document, and its “PETITIONER’S NAME” line is already printed |
| 5, 12 | Petition WHEREFORE item 1 and its copy in the order — sub-items (b) to (e), "removed by the following agencies" (\`County\`, \`LEA1\`, \`LEA2\`, \`LEA3\`) | the county sheriff's department, and up to three further agencies whose records you are asking the court to order removed. Sub-item (a), the Indiana State Police, is already printed |
| 9, 12 | the proposed order — related criminal cause numbers and appellate cause numbers (\`RelatedCriminalCauseNumbers\`, \`AppellateCauseNumbers\`) | other cases' numbers, if there are any. This packet writes neither, because both would otherwise receive *this* matter's number |
| 13 | the proposed order's distribution list — the county prosecutor's name and mailing address and the county sheriff's department address (\`Prosecutor\`, \`ProsecutorMailingAddress\`, \`MailAddressSheriff\`) | the mailing addresses the signed order is to be sent to. The platform holds none of them. **The committed record does not say who completes this list — ask the clerk** |
| 14 | the proposed order — the county clerk's address and its election square (\`CountyClerkAddress\`, \`Check Box32\`, \`Check Box33\`, \`Check Box34\`) | the clerk's address, and the squares beside the transferred-probation, appellate and no-contact-order addresses, each of which the form says to mark only in the case its own printed note describes |
| 14 | the proposed order — **"Law Enforcement Agencies:"**, ${LEA_RULE_COUNT} blank printed rules (\`List-MailingAddresses_LEA\`) | the mailing address of every law-enforcement agency the signed order must be served on. **This packet writes nothing here at all.** The platform holds no agency addresses, and an earlier build wrote your own home address into this block — see the note below |

## The insert pages: everything on them is yours to write, and here is why

${insertPagesReason()}

So fill all four insert pages by hand, from your court and arrest records and not from memory.

| Insert page | The block on the form | The Coalition's box names | What to write |
| --- | --- | --- | --- |
| 1 | the arrest or summons block | \`DD-ArrestOrSummons\`, \`ArrestDate\`, \`County\`, \`NameArrestingOfficer\`, \`ArrestingAgency\`, \`LEACaseNumber\`, \`Check Box15\`, \`Check Box17\` | how the matter began, when, in which county, who arrested you, which agency, and that agency's own case number |
| 1 | the charge block | \`AssignedCaseNumber\`, \`DateChargesFiled\`, \`DD-HowChargesFiled\`, \`CauseNumber\`, \`DD-TypeChargesFiled\` | the case number, the date and manner the charges were filed, the cause number and the type of charges |
| 1 | the offence grid, counts 1 to 4 | \`DD-CountNumber\`, \`OffenseDescript-Ct1\`, \`OffenseDescript-Ct2\`, \`OffenseDescript-Ct3\`, \`OffenseDescript-Ct4\`, \`DD-LevelChoice-Ct1\`, \`DD-LevelChoice-Ct2\`, \`DD-LevelChoice-Ct3\`, \`DD-LevelChoice-Ct4\`, \`DD-ChargeLevel-Ct1\`, \`DD-ChargeLevel-Ct2\`, \`DD-ChargeLevel-Ct3\`, \`DD-ChargeLevel-Ct4\`, \`DD-Misd/Felony-Ct1\`, \`DD-Misd/Felony-Ct2\`, \`DD-Misd/Felony-Ct3\`, \`DD-Misd/Felony-Ct4\` | each count as your court record words it, with its level and whether it was a misdemeanour or a felony |
| 1 | the disposition block | \`DateChargesDismissed\`, \`DateAcquittal\`, \`AppellateCauseNumber\`, \`DateAppellateDecFinal\`, \`Check Box19\`, \`Check Box21\`, \`Check Box23\`, \`Check Box25\`, \`Check Box26\` | how and when the matter ended, and any appellate cause number and final-decision date |
| 2 | the related-matter block | \`Check Box29\`, \`DescriptRelatedMatter\`, \`ListRelatedMCCauseNumbers\` | whether there is a related matter, what it is, and its cause numbers |
| 3 | **FINDINGS — leave the eight election squares alone** | \`Check Box16\`, \`Check Box18\`, \`Check Box20\`, \`Check Box22\`, \`Check Box24\`, \`Check Box27\`, \`Check Box28\`, \`Check Box30\` | **nothing. These are the court's own findings.** The text blanks on page 3 repeat what you write on pages 1–2 |
| 4 | Exhibit A — who you are | \`cap-PetitionerFullName\`, \`PetDOB\`, \`PetFullSSN\`, \`AliasNamesDOBsSSNs\`, \`AddressesSinceArrest\` | your full name, date of birth, whole Social Security number, any other names, dates of birth or numbers you have used, and every address you have lived at since the arrest |
| 4 | Exhibit A — the records to be expunged | \`Criminal Cause Number\`, \`CountyCityArrest\`, \`Date of Dismissal\` | the criminal cause number, the county and city of the arrest, and the date of dismissal |
| 4 | Exhibit A — the offence grid and dispositions | \`OffenseDescript-Exhibit-Ct5\`, \`OffenseDescript-Exhibit-Ct6\`, \`OffenseDescript-Exhibit-Ct7\`, \`DD-LevelChoice-Ct5\`, \`DD-LevelChoice-Ct6\`, \`DD-LevelChoice-Ct7\`, \`DD-ChargeLevel-Ct5\`, \`DD-ChargeLevel-Ct6\`, \`DD-ChargeLevel-Ct7\`, \`DD-Misd/Felony-Ct5\`, \`DD-Misd/Felony-Ct6\`, \`DD-Misd/Felony-Ct7\`, \`ChargeDisposition-Ct1\`, \`ChargeDisposition-Ct2\`, \`ChargeDisposition-Ct3\`, \`ChargeDisposition-Ct4\`, \`ChargeDisposition-Ct5\`, \`ChargeDisposition-Ct6\`, \`ChargeDisposition-Ct7\` | any further counts, and the disposition of every count |

## The proposed order asks for addresses, and this packet supplies none of them

**This is the part of the packet that was previously not described to you at all, and it is the part most likely to stop a filing.**

The proposed order at pages 9 to 15 is what you are asking the judge to sign. Its findings and its decree are the court's. **Its address blocks are not findings.** They are the list of who the signed order is sent to, and they are printed as empty rules:

| Page | The block | How many blanks | What this packet wrote in them |
| --- | --- | --- | --- |
| 5, 12 | WHEREFORE item 1, "removed by the following agencies" — sub-items (b), (c), (d) and (e) | four, one of them a county name | nothing |
| 13 | "_______ County Prosecutor / Attn: ____" and "_______ County Sheriff's Dept." | three | nothing |
| 14 | "☐ ______ County Clerk" and its address | three, plus three election squares | nothing |
| 14 | **"Law Enforcement Agencies:"** | ${LEA_RULE_COUNT} printed rules | nothing |

**Why this packet writes nothing there.** LegalEase holds no mailing address for the Indiana State Police, a county sheriff, a county clerk or any other agency, and it holds no list of which agencies hold records of your arrest. It is also a refusal made deliberately after a defect: the form's own label for the law-enforcement block reads to the software as two control characters rather than as words, and the shared field binder matched **your own street address** onto it — so an earlier build printed the petitioner's home address as a law-enforcement agency's service address inside an order for a judge to sign. That write is now refused outright.

**Who completes them is not stated by any record this packet is built from.** The committed route record says only that "The court serves the prosecuting attorney" and that the appearance form nonetheless carries its own certificate of service — it says nothing about the order's distribution list, nothing about the law-enforcement list, and nothing about the WHEREFORE agencies. **This guide will not guess.** Ask the clerk of the court where you file whether that court expects you to complete these blocks before you lodge the proposed order, and get the addresses from that clerk's office or from the agencies themselves.

${leftBlankSection(delivered)}

${leftBlankLedger(disclosures)}

## Where self-help ends

This packet prepares official forms; it does not decide anything. Stop and get advice from a **lawyer licensed in Indiana**, or from the resources at **www.indianalegalhelp.org** — or put a procedural question to the **clerk of the court in the county in your caption**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **you are not sure which of the insert pages your case needs, or how to complete them.** All four are in this packet, and every blank on them is yours to fill from your own court and arrest records;
- **there will be a hearing and you are not ready for one.** The committed record for this packet records that "The court sets a hearing" on this route;
- charges are currently pending against you, or you are participating in a pretrial diversion programme. Paragraph 3 of the petition swears that neither is true;
${waitingPeriodBullet(track)}
- your case ended in a conviction. This packet is for an arrest, criminal charge or juvenile delinquency allegation that did **not** result in a conviction, and the proposed order says so on its face;
- you want appellate records sealed. The petition and the order both have a place for appellate cause numbers and this packet writes neither, because an appellate cause number is issued by a different court and the platform holds none.
${selfHelpTail}

## What this packet is not

This is a prepared copy of the Coalition for Court Access's own approved bundle together with the Non Conviction Insert Forms that the bundle directs you to add. It is not legal advice, it is not filed for you, and it does not decide whether your records can be expunged under I.C. § 35-38-9-1.

_Route${routeKeys.length > 1 ? "s" : ""}: ${routeKeys.join(" · ")} — ${routeStatutes}_
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

  assert.equal(delivered.familyId, familyId, `${outRel}: the census names a different family`);

  // 1. REQUIRED_BEFORE_FILING. The retired sentences are the exact ones the
  //    delivered bytes contradict. A copy-paste that brings any of them back --
  //    into either builder -- fails here rather than shipping.
  for (const sentence of RETIRED_SENTENCES) {
    assert.ok(
      !guide.includes(sentence),
      `${familyId}: the guide has reacquired a sentence the delivered bytes contradict: ${JSON.stringify(sentence)}`
    );
  }

  // 2. Every value the packet writes must be described with the widget count and
  //    the page list the census actually records for it. Generated, then checked.
  for (const w of delivered.written) {
    const count = w.widgets === 1 ? "1 place" : `${w.widgets} places`;
    assert.ok(
      guide.includes(`\`${w.field}\``),
      `${familyId}: the guide never names the written box ${w.field}`
    );
    assert.ok(
      guide.includes(`${count}, on ${listPages(w.pages)}`),
      `${familyId}: the guide does not state where ${w.field} prints (${count}, on ${listPages(w.pages)})`
    );
  }

  // 3. The caption is shared, and the guide must say so in the direction the
  //    bytes support: already printed, not for the participant to copy.
  const name = delivered.written.find((w) => w.field === "cap-PetitionerFullName");
  assert.ok(name, `${familyId}: cap-PetitionerFullName is no longer a written field`);
  assert.ok(name.widgets > 1, `${familyId}: cap-PetitionerFullName is no longer a shared field`);
  assert.match(guide, /already written on all five documents/,
    `${familyId}: the guide must say the caption is already printed on all five documents`);
  assert.match(guide, /Do not copy the caption onto the other documents/,
    `${familyId}: the guide must tell the participant not to write over the printed caption`);

  // 4. participant-name-placement.json is the build's own record of where the
  //    name landed. The guide cites its counts; they must be its counts.
  assert.ok(
    guide.includes(`counts ${delivered.namePlacementsFound} placements of your name`),
    `${familyId}: the guide's name-placement count does not match reports/participant-name-placement.json `
    + `(${delivered.namePlacementsFound})`
  );
  assert.deepEqual(
    delivered.namePlacementPages, name.pages,
    `${familyId}: the pages the name was measured on do not match the pages the census binds it to`
  );
  assert.equal(delivered.placementsOutsideTheAllowlist, 0,
    `${familyId}: a participant-name placement landed outside the allowlist`);

  // 5. The order is written below its caption, on page 13, and the guide may not
  //    deny it. This is the sentence vf02 caught.
  const belowTheOrdersCaption = delivered.written.filter((w) => w.pages.includes(13));
  assert.ok(belowTheOrdersCaption.length > 0,
    `${familyId}: nothing is written on page 13 any more -- re-check the page-13 paragraph in the guide`);
  assert.match(guide, /distribution list on page 13/,
    `${familyId}: the guide must name what the packet prints in the order's page-13 distribution list`);

  // 6. INS1-B. The delivered fixtures are flattened, so the guide may not send the
  //    participant to a dropdown or a tick box that the delivery does not carry.
  const fixtures = fs.readdirSync(path.join(out, "fixtures")).filter((f) => f.endsWith(".pdf"));
  assert.ok(fixtures.length > 0, `${familyId}: no fixtures to check`);
  let anyFillable = false;
  for (const file of fixtures) {
    const pdf = await PDFDocument.load(fs.readFileSync(path.join(out, "fixtures", file)), { updateMetadata: false });
    let fieldCount = 0;
    try { fieldCount = pdf.getForm().getFields().length; } catch { fieldCount = 0; }
    const annots = pdf.getPages().reduce((n, page) => n + (page.node.Annots()?.size() ?? 0), 0);
    if (fieldCount > 0 || annots > 0) anyFillable = true;
  }
  if (anyFillable) {
    assert.fail(
      `${familyId}: a fixture still carries fillable widgets. The guide describes a flattened delivery; `
      + "either the delivery changed or the guide must change with it."
    );
  }
  assert.match(guide, /delivered flattened: print it and complete it in pen/,
    `${familyId}: the fixtures are flattened and the guide must say so`);
  assert.doesNotMatch(guide, /a dropdown for the court type/,
    `${familyId}: a flattened delivery has no dropdown`);
  assert.doesNotMatch(guide, /\btick it\b|\btick the\b/,
    `${familyId}: a flattened delivery has nothing to tick`);

  // 7. The Social Security question, settled on the stamps the pages carry
  //    themselves. PetFullSSN must stay off every public page, and the guide must
  //    name both blanks that ask for the whole number rather than claiming there
  //    is only one.
  const publicSsn = delivered.fullSsnPages.filter((p) => PUBLIC_PAGES.includes(p));
  assert.deepEqual(publicSsn, [],
    `${familyId}: PetFullSSN has reached a public page (${publicSsn.join(", ")})`);
  assert.match(guide, /it asks twice, differently/,
    `${familyId}: the guide must say the whole number is asked for on page 8 and again in the order's findings`);
  assert.match(guide, /Pages 1 to 7 are the pages that go on the public record/,
    `${familyId}: the guide must say which pages are the public ones`);

  // 8. No shared field may be collected on a non-public page and printed on a
  //    public one. Every straddling field must run public -> non-public.
  for (const field of delivered.shared) {
    if (!field.publicPages.length || !field.nonPublicPages.length) continue;
    assert.ok(
      Math.min(...field.publicPages) < Math.min(...field.nonPublicPages),
      `${familyId}: ${field.field} is first asked for on a non-public page (${field.nonPublicPages[0]}) `
      + `and also prints on a public one (${field.publicPages.join(", ")})`
    );
  }

  // 9. The cause number has no box. If a future source revision adds one, the
  //    instruction to hand-write it becomes wrong and must be revisited.
  assert.equal(delivered.hasCauseNumberBox, false,
    `${familyId}: the bundle now has a caption cause-number box; the guide still tells the participant `
    + "to write it in by hand");

  return delivered;
}
