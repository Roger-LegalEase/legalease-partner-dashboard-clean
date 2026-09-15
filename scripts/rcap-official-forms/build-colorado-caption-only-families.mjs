#!/usr/bin/env node
/**
 * The four Colorado proposed orders and notices the petitioner files with only
 * the caption completed — JDF 419, JDF 435, JDF 613 and JDF 614.
 *
 *   node scripts/rcap-official-forms/build-colorado-caption-only-families.mjs [--check]
 *
 * WHY THESE FOUR ARE PARTICIPANT-FILED DOCUMENTS AND NOT REFERENCE MATERIAL.
 *
 * The Colorado Judicial Department's own filing guides name them as documents
 * the petitioner files, and say how much of each the petitioner completes:
 *
 *   JDF 416 (R: July 1, 2025), "③ File the Request — File these forms into
 *   your criminal case or start a new case in the District Court":
 *     "JDF 417  Request"
 *     "JDF 418  Order (just do §§ A-C)"
 *     "JDF 419  Notice (Just do §§ A-C)"
 *     "JDF 435  Order (just do §§ A-C)"
 *
 *   JDF 611 (R: August 7, 2024), "③ File the Request — File these forms into
 *   your criminal case":
 *     "JDF 612  Motion"
 *     "JDF 613  Order (just do §§ A-C)"
 *     "JDF 614  Notice (Just do §§ A-C)"
 *     "JDF 615  Order (just do §§ A-C)"
 *
 * "§§ A-C" are the caption sections — A. Court, B. Parties to the Case and
 * C. Case Details on the 2024 forms; the unlettered caption band on the 2019
 * forms — and they are the ONLY thing the petitioner writes. Everything after
 * the caption is the court's: the finding, the hearing date, the reason for a
 * denial, the judicial officer's signature and date. So each family here binds
 * the caption facts the platform holds (county, the petitioner's own name, an
 * existing case number) and refuses every other field by role, and the court
 * address — which the platform does not hold — is left for the participant.
 *
 * Every quotation above is asserted against the digest-bound bytes of the
 * guide that carries it, read in content-stream order, before anything is
 * written. A quotation that stops matching stops the build.
 *
 * SOURCE BYTES. The four binaries are held in the nationwide_recovery_pool_2026_09_02
 * custody, which data/rcap-all50/local-source-corpus-index.json declares at
 * root private/source-imports/Nationwide_Recovery_Pool_2026-09-02 with paths
 * relative to that root. Entries from that partial custody deliberately carry
 * formNumber null, so nothing binds them by a name that merely looks right:
 * this build binds each one by its exact SHA-256 and by an identity read off
 * the document's own printed face, both recorded in source-record.json.
 *
 * REVISION CURRENCY IS AN OPEN REVIEW ITEM, STATED RATHER THAN HIDDEN. The held
 * JDF 419 and JDF 435 are R 8/19 flat PDFs whose caption band is unlettered,
 * while the JDF 416 that names them is R: July 1, 2025 and says "§§ A-C"; the
 * held JDF 613 and JDF 614 are R: August 7, 2024, the same revision as the
 * JDF 611 that names them. The issuing court's hosts were unreachable from
 * this environment on 2026-09-15 (the egress proxy answered 403 to CONNECT for
 * www.coloradojudicial.gov and www.courts.state.co.us), so the current
 * revisions could not be fetched. Each family records this as
 * freshnessStatus and in its findings; none of them claims currency.
 *
 * NOTHING HERE OPENS A ROUTE. These families are build evidence for the shared
 * packet factory. Legal review, visual review, source-currency review and every
 * commercial gate stay exactly where they were.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { finalizeFlatOverlay, finalizeOfficialForm } from "./rcap-official-form-finalize.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "../..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const CHECK = process.argv.includes("--check");
const BUILD_SCRIPT = "scripts/rcap-official-forms/build-colorado-caption-only-families.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT_ROOT = "data/rcap-all50/overlays/production/colorado";
const DRAFT_ROOT = "docs/record-clearing/field-map-drafts";
const CUSTODY_ID = "nationwide_recovery_pool_2026_09_02";
const FACTORY_VERSION = "d0-remediated-v1";
const RECORDED_ON = "2026-09-15";
const ISSUER_UNREACHABLE =
  "The issuing court's hosts were unreachable from the build environment on 2026-09-15: the egress proxy answered "
  + "403 to CONNECT for www.coloradojudicial.gov:443 and www.courts.state.co.us:443, so the current revision could "
  + "not be fetched and compared. The held revision is used and named; currency is an open source-freshness review item.";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const collapse = (s) => String(s).replace(/\s+/g, " ").trim();

/* ---- the guides, bound by digest ------------------------------------------- */
const GUIDES = {
  "JDF-416": {
    indexPath: "LegalEase Colorado/JDF416.pdf",
    identicalIndexPath: "LegalEase Colorado/reference-only/JDF-416__guide-to-sealing-arrest-records-no-charges-filed__rev-2025-07-01.pdf",
    sha256: "26b07edc2300b2fd9dc8a5114fa3738fb4b377a7aa1ea089cecf6861b96235af",
    title: "JDF 416 Guide to Sealing Arrest Records (No Charges Filed)",
    printedRevision: "R: July 1, 2025",
    quotations: [
      "File the Request",
      "File these forms into your criminal case or start a new case in the District Court:",
      "JDF 417 Request",
      "JDF 418 Order (just do §§ A-C)",
      "JDF 419 Notice (Just do §§ A-C)",
      "JDF 435 Order (just do §§ A-C)",
      "If you cannot afford the fee, also file:",
      "JDF 205 Motion to Waive Fees",
      "JDF 206 Order (Just do §§ A-C)"
    ]
  },
  "JDF-611": {
    indexPath: "LegalEase Colorado/reference-only/JDF-611__guide-to-sealing-conviction-records-single-case__rev-2024-08-07.pdf",
    sha256: "b628ee77cfdbb1e02208a74b04f6a03083e2843505f4bb4a7c3e0f2b3503843e",
    title: "JDF 611 Guide to Sealing Conviction Records (district or county court case)",
    printedRevision: "R: August 7, 2024",
    quotations: [
      "File the Request",
      "File these forms into your criminal case:",
      "JDF 612 Motion",
      "JDF 613 Order (just do §§ A-C)",
      "JDF 614 Notice (Just do §§ A-C)",
      "JDF 615 Order (just do §§ A-C)",
      "If you cannot afford the fees, also file:",
      "JDF 205 Motion to Waive Fees",
      "JDF 206 Order (Just do §§ A-C)"
    ]
  }
};

/* ---- the caption policy shared by all four --------------------------------- */
const WRITE = (fact) => ({ policy: "write", fact, class: "participant" });
const ELECTION = (why) => ({ policy: "election", why, class: "election_control" });
const SUPPLY = (what) => ({ policy: "supply", what, class: "withheld_by_review" });
const COURT = (why) => ({ policy: "protect", why, class: "court_or_agency" });

const CAPTION_ACROFORM = {
  Group_CourtType: { section: "A. Court", label: "District Court or County Court (selection)", ...ELECTION("the participant ticks the court type of the existing criminal case; the platform does not decide it") },
  County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
  "Court Address": { section: "A. Court", label: "Court Address", ...SUPPLY("the mailing address of the court handling the case, which the platform does not hold; the Judicial Department publishes each courthouse address") },
  "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
  "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
  Division: { section: "C. Case Details", label: "Division", ...COURT("court-use caption field; the court assigns the division") },
  Courtroom: { section: "C. Case Details", label: "Courtroom", ...COURT("court-use caption field; the court assigns the courtroom") }
};

const FORM_FIELDS = {
  "JDF-613": {
    ...CAPTION_ACROFORM,
    "1.1": { section: "1. Decision", label: "By the Court — the motion, on its face, is insufficient", ...COURT("a future court finding on the denial order") },
    "1.2": { section: "1. Decision", label: "By the Court — the Defendant is not entitled to relief under C.R.S. §§ 24-72-706 to 710", ...COURT("a future court finding on the denial order") },
    "1.3": { section: "1. Decision", label: "By the Court — the Court denies the motion because", ...COURT("the court states its own reason if it denies the motion") },
    "Sig-by": { section: "2. So Ordered", label: "By the Court — signature", ...COURT("the judicial officer signs the order") },
    Group_Sig: { section: "2. So Ordered", label: "By the Court — Judge or Magistrate (selection)", ...COURT("the signing judicial officer identifies their role") },
    Sig_date: { section: "2. So Ordered", label: "By the Court — date signed", ...COURT("the court dates its own order") }
  },
  "JDF-614": {
    ...CAPTION_ACROFORM,
    "1.1": { section: "1. Hearing Scheduled", label: "By the Court — hearing date", ...COURT("the court decides whether to set a hearing and supplies its date") },
    "1.2": { section: "1. Hearing Scheduled", label: "By the Court — hearing time", ...COURT("the court decides whether to set a hearing and supplies its time") },
    "1.3": { section: "1. Hearing Scheduled", label: "By the Court — the Defendant is required to attend the hearing", ...COURT("the court decides whether attendance is required") },
    "2.1": { section: "2. Decision", label: "By the Court — the District Attorney objects to the Motion", ...COURT("the court records whether the district attorney objects") },
    "2.2": { section: "2. Decision", label: "By the Court — victim objects and requests a hearing", ...COURT("the court records the victim-rights finding") },
    "2.3": { section: "2. Decision", label: "By the Court — a hearing is required by the applicable statute", ...COURT("the court records the statutory hearing finding") },
    "2.4": { section: "2. Decision", label: "By the Court — objection deadline in days before the hearing", ...COURT("the court sets this deadline") },
    Sig_date: { section: "3. So Ordered", label: "By the Court — date signed", ...COURT("the court dates its own order") },
    "Sig-by": { section: "3. So Ordered", label: "By the Court — signature", ...COURT("the judicial officer signs the order") }
  }
};

/*
 * The 2019 flat forms print an unlettered caption band. The anchors are
 * MEASURED from each form's own content stream at build time (label position,
 * blank extent, baseline) and only the right-hand boundary of a blank that runs
 * to the court-use box is estimated, which the measurement record says.
 */
const FLAT_CAPTION = {
  countyBlank: { label: "County, Colorado", section: "Caption — court", factId: "matter.county", class: "participant" },
  courtAddress: { label: "Court Address:", section: "Caption — court", class: "withheld_by_review",
    why: "the mailing address of the court, which the platform does not hold; refused by the binder because a caption-only document accepts caption facts only" },
  petitioner: { label: "Petition of: Defendant (Primary subject of the criminal justice record)", section: "Caption — parties",
    factId: "participant.full_legal_name", class: "participant",
    printedLabels: ["Petition of:", "Defendant (Primary subject of the criminal justice record)"] },
  caseNumber: { label: "Case Number:", section: "Caption — court use box", factId: "matter.case_number", class: "participant",
    note: "Written only when the participant supplies an existing case number; a petition that starts a new case leaves it for the clerk." },
  division: { label: "Division", section: "Caption — court use box", class: "court_or_agency", why: "court-use caption field; the court assigns the division" },
  courtroom: { label: "Courtroom", section: "Caption — court use box", class: "court_or_agency", why: "court-use caption field; the court assigns the courtroom" }
};

const ROUTES = {
  arrest: {
    routeId: "CO:petition-based-non-conviction-sealing-jdf-417-24-72-704",
    routeKey: "obligation:track-pathway:CO:co_petition_seal_arrest:petition-based-non-conviction-sealing-jdf-417-24-72-704",
    trackId: "co_petition_seal_arrest", packetSetId: "co_petition_seal_arrest-set", statute: "C.R.S. § 24-72-704", guide: "JDF-416",
    filedWith: ["JDF-417", "JDF-418"]
  },
  conviction: {
    routeId: "CO:petition-based-conviction-sealing-jdf-612-24-72-706",
    routeKey: "obligation:track-pathway:CO:co_motion_seal_conviction:petition-based-conviction-sealing-jdf-612-24-72-706",
    trackId: "co_motion_seal_conviction", packetSetId: "co_motion_seal_conviction-set", statute: "C.R.S. § 24-72-706", guide: "JDF-611",
    filedWith: ["JDF-612", "JDF-615"]
  }
};

const FAMILIES = [
  {
    formNumber: "JDF-419", family: "jdf-419-form-notice-en", documentRole: "NOTICE",
    officialTitle: "Order and Notice of Hearing (Sealing of Arrest and Criminal Records When No Charges Filed)",
    revision: "REV-2019-08", printedRevision: "R 8/19",
    indexPath: "LegalEase Colorado/JDF 419 Order and Notice of Hearing.pdf",
    identicalIndexPath: "LegalEase Colorado/reference-only/JDF-419__order-and-notice-of-hearing-sealing-arrest-records-no-charges-filed__rev-2019-08.pdf",
    sha256: "64012a2a3ef643f5b9a587e5181c3332f788764324003709913688d2f9bd86a2", byteLength: 50720,
    structure: "flat", route: ROUTES.arrest, guideLine: "JDF 419 Notice (Just do §§ A-C)",
    componentId: "co_petition_seal_arrest-jdf-419-3", emitFieldMapDraft: true,
    whatItIs: "The court's order setting a hearing on the petition and the notice of that hearing. The petitioner tenders it with the caption completed; the court supplies the finding, the hearing location, date and time, the judge's signature and the certificate of service.",
    freshnessStatus: "revision_confirmation_required",
    currencyFinding: "The held binary is R 8/19 with an unlettered caption band and a printed CERTIFICATE OF SERVICE block; the JDF 416 that names it is R: July 1, 2025 and tells the filer to complete \"§§ A-C\", which this revision does not letter. A later revision of JDF 419 is therefore likely and was not obtainable."
  },
  {
    formNumber: "JDF-435", family: "jdf-435-form-order-en", documentRole: "ORDER",
    officialTitle: "Order Denying Petition to Seal Arrest and Criminal Records When No Charges Filed",
    revision: "REV-2019-08", printedRevision: "R8/19",
    indexPath: "LegalEase Colorado/JDF 435 order denying petition to seal.pdf",
    identicalIndexPath: "LegalEase Colorado/reference-only/JDF-435__order-denying-petition-to-seal-arrest-records-no-charges-filed__rev-2019-08.pdf",
    sha256: "59026b6ad9809e21fd9cb071adb5725329ac7a65f4a7c3055b11ac57b9f2dd15", byteLength: 50394,
    structure: "flat", route: ROUTES.arrest, guideLine: "JDF 435 Order (just do §§ A-C)",
    componentId: "co_petition_seal_arrest-jdf-435-4", emitFieldMapDraft: true,
    whatItIs: "The order DENYING the petition, tendered alongside the JDF 418 order granting it so the court can sign whichever outcome it reaches. It is not a second grant order, and a participant must not be told otherwise. The petitioner completes the caption only; the finding, the reasons, the signature, the date and the certificate of service are the court's.",
    freshnessStatus: "revision_confirmation_required",
    currencyFinding: "The held binary is R8/19 with an unlettered caption band and a printed CERTIFICATE OF SERVICE block; the JDF 416 that names it is R: July 1, 2025 and tells the filer to complete \"§§ A-C\", which this revision does not letter. A later revision of JDF 435 is therefore likely and was not obtainable."
  },
  {
    formNumber: "JDF-613", family: "jdf-613-form-order-en", documentRole: "ORDER",
    officialTitle: "Order Denying Request to Seal Conviction Records",
    revision: "REV-2024-08-07", printedRevision: "R: August 7, 2024",
    indexPath: "LegalEase Colorado/reference-only/JDF-613__order-denying-request-to-seal-conviction-records__rev-2024-08-07.pdf",
    identicalIndexPath: null,
    sha256: "0745d99f233c7df13286c581c912d9f87b15187270e3d1773455c1ed51848677", byteLength: 545525,
    structure: "acroform", route: ROUTES.conviction, guideLine: "JDF 613 Order (just do §§ A-C)",
    componentId: "co_motion_seal_conviction-second-order-4", emitFieldMapDraft: true,
    whatItIs: "The order DENYING the request to seal, tendered alongside the JDF 615 order granting it so the court can sign whichever outcome it reaches. Page 1 is headed \"JDF 613 Order Denying Request to Seal Conviction Records\"; its section 1 Decision is the court's finding and its section 2 So Ordered is the court's signature. The movant completes sections A-C only.",
    freshnessStatus: "candidate_current_source",
    currencyFinding: "The held binary is R: August 7, 2024, the same revision as the JDF 611 guide that names it. Whether the Judicial Department has since revised it could not be checked."
  },
  {
    formNumber: "JDF-614", family: "jdf-614-form-notice-en", documentRole: "NOTICE",
    officialTitle: "Order and Notice of Hearing (re sealing conviction records)",
    revision: "REV-2024-08-07", printedRevision: "R: August 7, 2024",
    indexPath: "LegalEase Colorado/JDF614.pdf",
    identicalIndexPath: "LegalEase Colorado/reference-only/JDF-614__order-and-notice-of-hearing-sealing-conviction-records__rev-2024-08-07.pdf",
    sha256: "08f0a13f9aa7f5036f6f28748648fdee56aed9ee1f511f6f10e183e0bfa5e08b", byteLength: 555787,
    structure: "acroform", route: ROUTES.conviction, guideLine: "JDF 614 Notice (Just do §§ A-C)",
    componentId: "co_motion_seal_conviction-notice-3",
    whatItIs: "The court's order setting a hearing on the motion and the notice of that hearing, used when the court finds a hearing necessary. The movant tenders it with sections A-C completed; the hearing date and time, the finding that a hearing is necessary, the objection deadline and the signature are the court's.",
    freshnessStatus: "candidate_current_source",
    currencyFinding: "The held binary is R: August 7, 2024, the same revision as the JDF 611 guide that names it. Whether the Judicial Department has since revised it could not be checked."
  }
];

const PRODUCTION_HOLDS = [
  "edition_1_runtime_disabled",
  "f_independent_visual_review_required",
  "source_currency_review_required_issuer_unreachable",
  "state_legal_review_missing_from_supplied_corpus",
  "state_manifest_generation_allowed_no",
  "state_open_item_release_blocker"
];

/* ---- fixtures: the same synthetic person the other Colorado families use --- */
const FIXTURE_NOTE = "Synthetic participant facts. The telephone block is the 555-01xx range reserved for fiction and the mail domain is the reserved example.com, so no fixture resolves to a real person.";
const CANONICAL_FACTS = {
  "participant.full_legal_name": "Marion T. Ellsworth",
  "participant.first_name": "Marion",
  "participant.middle_name": "Tobias",
  "participant.last_name": "Ellsworth",
  "participant.date_of_birth": "1988-04-17",
  "participant.street_address": "418 Sycamore Ridge Road",
  "participant.city": "Denver",
  "participant.state": "CO",
  "participant.zip": "80202",
  "participant.city_state_zip": "Denver, CO 80202",
  "participant.phone": "555-0142",
  "participant.email": "marion.ellsworth@example.com",
  "deterministic.filing_date": "2026-08-12",
  "matter.county": "Denver",
  "matter.court": "Second Judicial District",
  "matter.case_number": "2023CR004182",
  "matter.charge": "Criminal trespass, second degree",
  "matter.arrest_date": "2023-03-09",
  "matter.offense_date": "2023-03-08"
};
const BOUNDARY_FACTS = {
  ...CANONICAL_FACTS,
  "participant.full_legal_name": "Maximiliana Aurelia Featherstonehaugh-Wintersgill de la Concepcion",
  "participant.first_name": "Maximiliana Aurelia",
  "participant.last_name": "Featherstonehaugh-Wintersgill de la Concepcion",
  "participant.street_address": "14827 North Meadowbrook Commons Professional Plaza, Building C, Suite 2200",
  "participant.city_state_zip": "Denver Metropolitan Statistical Area, CO 80202-4417",
  "participant.email": "maximiliana.featherstonehaugh.wintersgill@example.com",
  "matter.case_number": "2023CR004182-CONSOLIDATED-WITH-2023CR004183-AND-2023CR004184"
};
const FIXTURES = {
  canonical: { facts: CANONICAL_FACTS, note: FIXTURE_NOTE },
  boundary: { facts: BOUNDARY_FACTS, note: `${FIXTURE_NOTE} Values are deliberately longer than the caption blanks were drawn to hold, so the fitter's shrink and refusal branches are exercised against real geometry.` },
  negative: { facts: {}, note: "No participant facts at all. The caption-only policy must produce zero writes, and every court-owned field must stay blank." }
};

/* ---- source binding ---------------------------------------------------------- */
const index = readJson(CORPUS_INDEX);
const custody = (index.custodies ?? []).find((c) => c.id === CUSTODY_ID);
assert.ok(custody, `${CORPUS_INDEX} declares no custody ${CUSTODY_ID}`);
assert.equal(custody.pathsRelativeTo, "custodyRoot", `${CUSTODY_ID} paths are not custody-root-relative`);
const custodyRoot = path.join(ROOT, custody.root);
assert.ok(fs.existsSync(custodyRoot), `the ${CUSTODY_ID} custody is not mounted at ${custody.root}`);

function bindHeldBytes({ indexPath, sha256: expected, byteLength }) {
  const entry = (index.entries ?? []).find((e) => e.custody === CUSTODY_ID && e.path === indexPath);
  assert.ok(entry, `the committed corpus index carries no ${CUSTODY_ID} entry at ${indexPath}`);
  assert.equal(entry.sha256, expected, `${indexPath}: the committed index digest is not the one this build quotes`);
  const abs = path.join(custodyRoot, indexPath);
  assert.ok(fs.existsSync(abs), `${indexPath} is indexed and is not on disk under ${custody.root}`);
  const bytes = fs.readFileSync(abs);
  const digest = sha256(bytes);
  assert.equal(digest, expected, `${indexPath}: SHA-256 drift — the committed index says ${expected}, the mounted bytes are ${digest}`);
  if (byteLength !== undefined) assert.equal(bytes.length, byteLength, `${indexPath}: byte length drift`);
  return { entry, bytes, abs };
}

async function pageLines(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  return {
    doc, pages,
    pageGeometry: pages.map((p, i) => ({ page: i + 1, width: +p.getWidth().toFixed(2), height: +p.getHeight().toFixed(2), orientation: p.getWidth() <= p.getHeight() ? "portrait" : "landscape" })),
    text: pages.map((p, i) => {
      const items = extractTextItems(p);
      return { page: i + 1, items, lines: groupIntoLines(items), streamText: items.map((it) => it.text).join("") };
    })
  };
}

async function resolveGuide(id) {
  const guide = GUIDES[id];
  const { bytes } = bindHeldBytes({ indexPath: guide.indexPath, sha256: guide.sha256 });
  const { text } = await pageLines(bytes);
  const stream = collapse(text.map((t) => t.streamText).join(" "));
  const missing = guide.quotations.filter((q) => !stream.includes(collapse(q)));
  assert.deepEqual(missing, [], `${id} (${guide.sha256.slice(0, 12)}) does not carry, in content-stream order, the quotation(s): ${JSON.stringify(missing)}`);
  return { id, ...guide, quotationsVerifiedAgainstStreamOrder: true };
}

/* ---- census -------------------------------------------------------------------- */
async function acroformCensus(family, doc, pages) {
  const spec = FORM_FIELDS[family.formNumber];
  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec[name];
    const ctor = field.constructor.name;
    const type = ctor === "PDFTextField" ? "text" : ctor === "PDFCheckBox" ? "checkbox" : ctor === "PDFRadioGroup" ? "radio"
      : ctor === "PDFDropdown" ? "dropdown" : ctor.replace(/^PDF/, "").toLowerCase();
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      return { page: pi + 1, rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) } };
    });
    const row = {
      name, type, widgets,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false
    };
    if (typeof field.getOptions === "function") row.options = field.getOptions();
    if (!entry) { unmapped.push(name); rows.push(row); continue; }
    rows.push({ ...row, section: entry.section, effectiveLabel: entry.label, policy: entry.policy, class: entry.class, fact: entry.fact ?? null, why: entry.why ?? entry.what ?? null });
  }
  assert.deepEqual(unmapped, [], `${family.formNumber}: ${unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(unmapped)}`);
  const stale = Object.keys(spec).filter((k) => !rows.some((r) => r.name === k));
  assert.deepEqual(stale, [], `${family.formNumber}: the dictionary names ${stale.length} field(s) this form does not have: ${JSON.stringify(stale)}`);
  return rows;
}

/*
 * Flat caption anchors, measured from the page. `find` locates a printed line by
 * the text it starts with; the blank a value goes into is measured from the
 * underscore run the form draws, or placed against the label with a right
 * boundary estimated at the court-use box, and the record says which.
 */
function measureFlatCaption(family, text, pageGeometry) {
  const page = text[0];
  const find = (prefix) => {
    const line = page.lines.find((l) => collapse(l.text).startsWith(prefix));
    assert.ok(line, `${family.formNumber}: no printed line starts with ${JSON.stringify(prefix)}`);
    return line;
  };
  const charsOf = (line) => (line.chars ?? []).map((c) => ({ c: c.c, x: c.x, w: c.w }));
  const extent = (line, pred) => {
    const cs = charsOf(line).filter(pred);
    assert.ok(cs.length > 0, `${family.formNumber}: no measurable characters on ${JSON.stringify(line.text)}`);
    return { x0: Math.min(...cs.map((c) => c.x)), x1: Math.max(...cs.map((c) => c.x + c.w)) };
  };
  const COURT_USE_BOX_LEFT = 396; // the vertical rule of the COURT USE ONLY box, estimated; recorded below
  const RIGHT_MARGIN = 566;
  const r2 = (n) => +Number(n).toFixed(2);

  const venue = find("District Court");
  const blank = extent(venue, (c) => c.c === "_");
  const countyLabel = extent(venue, (c) => c.c !== "_" && c.c !== " ");
  const courtAddress = find("Court Address:");
  const courtAddressLabel = extent(courtAddress, (c) => c.c !== " ");
  const petitionOf = find("Petition of:");
  const defendant = find("Defendant");
  const caseNumber = find("Case Number:");
  const caseNumberLabel = extent(caseNumber, (c) => c.c !== " ");
  const division = find("Division");
  const size = venue.size ?? 9.96;

  const anchors = [
    {
      key: "countyBlank", page: 1, kind: "blank_between_labels", label: FLAT_CAPTION.countyBlank.label,
      printedLine: collapse(venue.text), factId: FLAT_CAPTION.countyBlank.factId, captionOnly: true,
      labelX: r2(countyLabel.x0), baselineY: r2(venue.y), fontSize: r2(size),
      writeBox: { x: r2(blank.x0 + 1.5), y: r2(venue.y + 1.2), width: r2(blank.x1 - blank.x0 - 3), height: r2(size + 1) },
      printedSuffixAfterBlank: "County",
      measurement: { labelPositionMeasured: true, blankExtentMeasuredFromUnderscoreRun: true, rightBoundaryMeasured: true }
    },
    {
      key: "courtAddress", page: 1, kind: "trailing_label", label: FLAT_CAPTION.courtAddress.label,
      printedLine: collapse(courtAddress.text), factId: null, captionOnly: true,
      labelX: r2(courtAddressLabel.x0), baselineY: r2(courtAddress.y), fontSize: r2(size),
      writeBox: { x: r2(courtAddressLabel.x1 + 4), y: r2(courtAddress.y), width: r2(COURT_USE_BOX_LEFT - courtAddressLabel.x1 - 8), height: r2(size + 1) },
      measurement: { labelPositionMeasured: true, rightBoundaryMeasured: false, rightBoundaryEstimatedAtCourtUseBox: COURT_USE_BOX_LEFT }
    },
    {
      key: "petitioner", page: 1, kind: "blank_between_labels", label: FLAT_CAPTION.petitioner.label,
      printedLabels: FLAT_CAPTION.petitioner.printedLabels,
      printedLine: `${collapse(petitionOf.text)} … ${collapse(defendant.text)}`, factId: FLAT_CAPTION.petitioner.factId, captionOnly: true,
      labelX: r2(petitionOf.x), baselineY: r2((petitionOf.y + defendant.y) / 2), fontSize: r2(size + 0.5),
      writeBox: { x: r2(petitionOf.x), y: r2((petitionOf.y + defendant.y) / 2), width: r2(COURT_USE_BOX_LEFT - petitionOf.x - 8), height: r2(size + 2) },
      measurement: { labelPositionMeasured: true, blankPlacedMidwayBetweenTheTwoPrintedLabels: true, rightBoundaryMeasured: false, rightBoundaryEstimatedAtCourtUseBox: COURT_USE_BOX_LEFT }
    },
    {
      key: "caseNumber", page: 1, kind: "trailing_label", label: FLAT_CAPTION.caseNumber.label,
      printedLine: collapse(caseNumber.text), factId: FLAT_CAPTION.caseNumber.factId, captionOnly: true,
      labelX: r2(caseNumberLabel.x0), baselineY: r2(caseNumber.y), fontSize: r2(size),
      writeBox: { x: r2(caseNumberLabel.x1 + 3), y: r2(caseNumber.y), width: r2(RIGHT_MARGIN - caseNumberLabel.x1 - 3), height: r2(size + 1) },
      measurement: { labelPositionMeasured: true, rightBoundaryMeasured: false, rightBoundaryEstimatedAtPageMargin: RIGHT_MARGIN }
    }
  ];
  const protectedRegions = [
    { key: "division", label: FLAT_CAPTION.division.label, printedLine: collapse(division.text), baselineY: r2(division.y), class: "court_or_agency", why: FLAT_CAPTION.division.why },
    { key: "courtroom", label: FLAT_CAPTION.courtroom.label, printedLine: collapse(division.text), baselineY: r2(division.y), class: "court_or_agency", why: FLAT_CAPTION.courtroom.why },
    { key: "bodyAndSignature", label: "Everything printed below the caption band", printedLine: null, baselineY: null, class: "court_or_agency",
      why: "the finding, the hearing or denial particulars, the judge's signature and date, and the clerk's certificate of service are the court's; nothing is drawn there" }
  ];
  for (const a of anchors) {
    const g = pageGeometry[0];
    assert.ok(a.writeBox.x >= 0 && a.writeBox.y >= 0 && a.writeBox.x + a.writeBox.width <= g.width && a.writeBox.y + a.writeBox.height <= g.height,
      `${family.formNumber}: anchor ${a.key} falls outside the page`);
  }
  return { anchors, protectedRegions, readableLines: page.lines.length };
}

/* ---- render ---------------------------------------------------------------------- */
async function renderAcroform(family, bytes, rows, documentTextLines, fixtureName) {
  const facts = FIXTURES[fixtureName].facts;
  const unwritableFields = rows.filter((r) => r.policy !== "write").map((r) => ({ field: r.name, class: r.class, reason: r.policy === "election" ? "participant_election" : r.policy === "supply" ? "participant_supplies_before_filing" : "court_completes_after_the_caption" }));
  const out = await finalizeOfficialForm({
    sourceBytes: bytes, expectedSha256: family.sha256,
    census: rows.map((r) => ({ name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section, widgets: r.widgets, multiline: r.multiline === true, maxLength: r.maxLength ?? null })),
    facts, explicitMappings: {}, unwritableFields, captionOnly: true, documentAcceptsFill: true,
    documentTextLines, title: family.officialTitle
  });
  return { bytes: out.bytes, report: out.report, unwritableFields };
}

async function renderFlat(family, bytes, anchors, documentTextLines, fixtureName) {
  const facts = FIXTURES[fixtureName].facts;
  const out = await finalizeFlatOverlay({
    sourceBytes: bytes, expectedSha256: family.sha256,
    anchors: anchors.map((a) => ({ label: a.label, page: a.page, writeBox: a.writeBox, fontSize: a.fontSize, captionOnly: true,
      ...(a.factId ? { factId: a.factId } : {}), ...(a.printedSuffixAfterBlank ? { printedSuffixAfterBlank: a.printedSuffixAfterBlank } : {}) })),
    facts, explicitMappings: {}, documentTextLines, title: family.officialTitle
  });
  return { bytes: out.bytes, report: out.report };
}

/* ---- the files each family carries -------------------------------------------- */
function familyFiles(family, ctx) {
  const { entry, guide, pageGeometry, rows, anchors, protectedRegions, renders, determinism, readableLines } = ctx;
  const dir = `${OUT_ROOT}/${family.family}`;
  const files = new Map();
  const json = (rel, value) => files.set(`${dir}/${rel}`, `${JSON.stringify(value, null, 2)}\n`);
  const isAcro = family.structure === "acroform";
  const writable = isAcro ? rows.filter((r) => r.policy === "write") : anchors.filter((a) => a.factId);
  const classCounts = {};
  const entries = isAcro
    ? rows.map((r) => ({ name: r.name, type: r.type, class: r.class, effectiveLabel: r.effectiveLabel, regionHeading: r.section }))
    : [...anchors.map((a) => ({ name: a.key, type: "measured_anchor", class: FLAT_CAPTION[a.key].class, effectiveLabel: a.label, regionHeading: FLAT_CAPTION[a.key].section })),
      ...protectedRegions.map((p) => ({ name: p.key, type: "printed_region", class: p.class, effectiveLabel: p.label, regionHeading: null }))];
  for (const e of entries) classCounts[e.class] = (classCounts[e.class] ?? 0) + 1;

  const ownershipDetermination =
    `${guide.title} (${guide.printedRevision}) lists this document among the forms the petitioner files and says how much of it to complete: `
    + `${JSON.stringify(family.guideLine)}. The caption is the petitioner's and everything after it is the court's, so only caption facts bind and every other field is refused by role.`;

  json("source-record.json", {
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    lane: "CO-CAPTION-ONLY-2026-09-15",
    factoryVersion: FACTORY_VERSION,
    jurisdiction: "CO",
    jurisdictionName: "Colorado",
    documentId: family.formNumber,
    documentRole: family.documentRole,
    assetClass: "packet_form",
    officialTitle: family.officialTitle,
    revision: family.revision,
    printedRevision: family.printedRevision,
    language: "EN",
    workflowKey: `CO:${family.formNumber}:${family.documentRole}:EN`,
    canonicalBundlePath: null,
    custody: CUSTODY_ID,
    custodyType: entry.custodyType ?? null,
    corpusIndexPath: family.indexPath,
    corpusIndexIdenticalPath: family.identicalIndexPath,
    sourceFilename: path.basename(family.indexPath),
    sha256: family.sha256,
    sha256Observed: family.sha256,
    sha256VerifiedAgainstBundleManifest: null,
    sha256VerifiedAgainstCorpusIndex: true,
    byteLength: family.byteLength,
    indexDeclaredBytes: entry.byteLength ?? null,
    byteLengthMatches: entry.byteLength === family.byteLength,
    sourceUrl: null,
    sourceStatus: "held_in_partial_custody_bound_by_exact_digest",
    freshnessStatus: family.freshnessStatus,
    currencyFinding: family.currencyFinding,
    issuerReachability: ISSUER_UNREACHABLE,
    identityBasis: {
      guide: guide.id, guideSha256: guide.sha256, guidePrintedRevision: guide.printedRevision, guideLine: family.guideLine,
      printedFace: `${family.formNumber.replace("-", " ")} — ${family.officialTitle} — ${family.printedRevision}`,
      corpusIndexIdentity: { formNumber: entry.formNumber ?? null, assetClass: entry.assetClass ?? null,
        why: "partial-custody entries deliberately carry no form number; this record binds by exact SHA-256 and by the printed face, and the corpus index carries the same determination as a sibling identityDetermination record" }
    },
    libraryFolder: null,
    binaryPresent: true,
    lifecycleClassification: family.freshnessStatus === "candidate_current_source" ? "binary_present_currency_unverified" : "binary_present_revision_confirmation_required",
    structuralClassObserved: isAcro ? "acroform" : "flat_pdf",
    structuralClassDeclared: entry.structuralClassObserved ?? null,
    structuralClassAgrees: (entry.structuralClassObserved ?? null) === (isAcro ? "acroform" : "flat_pdf"),
    declaredFieldCount: entry.acroFieldCount ?? 0,
    observedAcroFieldCount: isAcro ? rows.length : 0,
    fieldCountAgrees: (entry.acroFieldCount ?? 0) === (isAcro ? rows.length : 0),
    pageGeometry,
    declaredPages: entry.pageCount ?? null,
    observedPages: pageGeometry.length,
    pageCountAgrees: entry.pageCount === pageGeometry.length,
    binaryTraversable: true,
    binaryLoadError: null,
    textLayerExtractable: readableLines > 0,
    renderStrategy: isAcro ? "acroform_fill" : "flat_overlay",
    participantFillable: true,
    generationAllowed: false,
    packetCandidate: true,
    runtimeStatus: "runtime_disabled",
    productionHolds: PRODUCTION_HOLDS,
    documentOwnership: "court_issued_caption_only",
    componentRole: "court_order_or_notice_the_petitioner_files_with_caption_sections_a_to_c_completed",
    ownershipDetermination,
    whatThisDocumentIs: family.whatItIs,
    route: { routeId: family.route.routeId, routeKey: family.route.routeKey, trackId: family.route.trackId, packetSetId: family.route.packetSetId, componentId: family.componentId, statute: family.route.statute, filedWith: family.route.filedWith },
    nonFilingNoticeOnFace: null,
    coBrandingRule: "No LegalEase or partner branding may be added to the official form.",
    implementationStatus: "implementation_complete_pending_independent_review",
    censusBasis: "first_hand_inspection_of_digest_bound_binary",
    builtBy: BUILD_SCRIPT,
    recordedOn: RECORDED_ON,
    requiredFollowUp: "Independent visual review of the caption placement; source-currency review against the issuer's current revision once its hosts are reachable; counsel review of the route. None of these is a build blocker and none is granted here."
  });

  json("field-census.json", {
    schemaVersion: "rcap-field-census/v3-first-hand",
    censusBasis: "first_hand_inspection_of_digest_bound_binary",
    sha256: family.sha256,
    structuralClass: isAcro ? "acroform" : "flat_pdf",
    fieldCount: isAcro ? rows.length : 0,
    textLikeFieldCount: isAcro ? rows.filter((r) => r.type === "text").length : 0,
    pageGeometry,
    fields: isAcro ? rows.map((r) => ({ name: r.name, type: r.type, widgets: r.widgets, maxLength: r.maxLength, multiline: r.multiline, ...(r.options ? { options: r.options } : {}) })) : [],
    ...(isAcro ? {} : {
      captionAnchors: {
        basis: "text drawn by this exact sha256, read from the page content stream; blanks measured from the underscore runs the form draws, or placed against the printed label with an estimated right boundary, as each measurement record states",
        readableLines,
        anchorCount: anchors.length,
        anchors,
        protectedRegions
      }
    })
  });

  json("field-classification.json", {
    schemaVersion: "rcap-field-classification/v4-nine-class",
    factoryVersion: FACTORY_VERSION,
    documentOwnership: "court_issued_caption_only",
    ownershipBasis: ownershipDetermination,
    classCounts,
    entries
  });

  json("field-classification-policy.json", {
    schemaVersion: "rcap-field-classification-policy/v2-d0",
    factoryVersion: FACTORY_VERSION,
    basis: "scripts/rcap-official-forms/rcap-field-semantics.mjs — typed fail-closed binder, unmodified",
    everyFieldStartsProtected: true,
    writableRequires: [
      "no protect rule matches the field name or its measured label",
      "the PDF control type is text or dropdown, or the anchor is a measured caption blank",
      "the name or printed label matches exactly one allowlisted fact descriptor",
      "the fact is one of the caption facts a court-issued document accepts",
      "the resolved value matches the descriptor's declared type"
    ],
    documentAcceptsFill: true,
    captionOnly: true,
    ownership: "court_issued_caption_only",
    ownershipDetermination,
    explicitMappings: {},
    reviewedWithholdings: [
      { field: isAcro ? "Court Address" : "courtAddress", rationale: CAPTION_ACROFORM["Court Address"].what },
      ...(isAcro ? [{ field: "Group_CourtType", rationale: CAPTION_ACROFORM.Group_CourtType.why }] : [])
    ],
    courtOwnedAfterTheCaption: isAcro
      ? rows.filter((r) => r.class === "court_or_agency").map((r) => ({ field: r.name, section: r.section, why: r.why }))
      : protectedRegions.map((p) => ({ field: p.key, why: p.why })),
    protectionsWeakened: false,
    note: "The shared binder was not edited and no protection was weakened. captionOnly refuses every non-caption fact by construction, and every field after the caption is refused by role before the binder is asked."
  });

  const mapCommon = {
    factoryVersion: FACTORY_VERSION,
    family: family.family,
    jurisdiction: "CO",
    documentOwnership: "court_issued_caption_only",
    componentRole: "court_order_or_notice_the_petitioner_files_with_caption_sections_a_to_c_completed",
    sha256: family.sha256,
    pageGeometry,
    captionOnly: true,
    bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs), unmodified; every field starts protected",
    explicitMappings: {}
  };
  const canonical = renders.canonical.report;
  if (isAcro) {
    json("production-field-map.json", {
      schemaVersion: "rcap-acroform-map/v6-d0",
      ...mapCommon,
      bindings: rows.filter((r) => r.policy === "write").map((r) => ({ field: r.name, class: r.class, factId: r.fact, kind: "text", effectiveLabel: r.effectiveLabel, section: r.section })),
      bindingRefusals: canonical.refused.map((r) => ({ field: r.field, reason: r.reason, category: r.category ?? null })),
      unwritableFields: renders.canonical.unwritableFields,
      canonicalWrites: canonical.written
    });
  } else {
    json("production-field-map.json", {
      schemaVersion: "rcap-flat_overlay-map/v5",
      ...mapCommon,
      bindings: anchors.filter((a) => a.factId).map((a) => ({ anchor: a.key, label: a.label, class: FLAT_CAPTION[a.key].class, factId: a.factId, kind: "text" })),
      bindingRefusals: canonical.refused.map((r) => ({ anchor: r.anchor, reason: r.reason, category: r.category ?? null })),
      unwritableRegions: protectedRegions,
      anchorCapture: { basis: "text drawn by this exact sha256, read from the page content stream", readableLines, anchorCount: anchors.length, anchors },
      canonicalWrites: canonical.written
    });
  }

  for (const [name, fixture] of Object.entries(FIXTURES)) {
    json(`fixtures/${name}.json`, name === "negative"
      ? {
          schemaVersion: "rcap-negative-fixture/v3", level: "participant_fact",
          assertion: "With no participant facts, nothing is written, and with every fact, nothing outside the caption is written.",
          reason: ownershipDetermination, documentOwnership: "court_issued_caption_only", productionHolds: PRODUCTION_HOLDS,
          facts: {}, writesObserved: renders.negative.report.written.length,
          unwritableFields: isAcro ? renders.canonical.unwritableFields.map((u) => ({ field: u.field, class: u.class })) : protectedRegions.map((p) => ({ field: p.key, class: p.class }))
        }
      : { schemaVersion: "rcap-fixture/v3", level: "participant_fact", fixture: name, note: fixture.note, facts: fixture.facts });
    if (name !== "negative") files.set(`${dir}/fixtures/${name}-filled.pdf`, renders[name].bytes);
  }

  const artifacts = {};
  for (const name of ["canonical", "boundary"]) {
    artifacts[`fixtures/${name}-filled.pdf`] = { sha256: sha256(renders[name].bytes), bytes: renders[name].bytes.length };
  }
  json("reports/rendered-artifacts.json", {
    schemaVersion: "rcap-rendered-artifacts/v2-provenance",
    sourceSha256: family.sha256,
    renderer: BUILD_SCRIPT,
    rendererEngine: isAcro ? "scripts/rcap-official-forms/rcap-official-form-finalize.mjs#finalizeOfficialForm" : "scripts/rcap-official-forms/rcap-official-form-finalize.mjs#finalizeFlatOverlay",
    reproducible: determinism.reproducible,
    reproducibilityBasis: determinism.reproducible
      ? "Each fixture was rendered twice in one process from the same digest-bound source and both renders hashed identically; --check re-renders and compares byte for byte."
      : `A second render of the same inputs did not reproduce the first: ${determinism.differing.join(", ")}.`,
    artifacts,
    negativeFixture: { writes: renders.negative.report.written.length, artifactRetained: false, why: "a render that writes nothing is proved by its report, not by retaining a copy of the court's blank form" }
  });
  json("reports/populated-fields.json", Object.fromEntries(["canonical", "boundary", "negative"].map((name) => [name, {
    written: renders[name].report.written,
    refused: renders[name].report.refused,
    unfittable: renders[name].report.unfittable,
    ...(renders[name].report.normalized ? { normalized: renders[name].report.normalized } : {})
  }])));
  json("reports/determinism.json", determinism);
  json("reports/protected-fields.json", {
    documentOwnership: "court_issued_caption_only",
    wholeDocumentUnwritable: false,
    basis: "typed fail-closed binder; every field after the caption refused by role before the binder is asked",
    unwritableFields: isAcro
      ? renders.canonical.unwritableFields
      : protectedRegions.map((p) => ({ field: p.key, class: p.class, reason: "court_completes_after_the_caption" })),
    protectedByTheBinder: canonical.refused.filter((r) => r.reason !== "classified_unwritable_by_role")
  });
  const courtAddressRefusal = canonical.refused.find((r) => (r.field ?? r.anchor) === (isAcro ? "Court Address" : FLAT_CAPTION.courtAddress.label)) ?? null;
  json("reports/reviewed-withholdings.json", {
    schemaVersion: "rcap-reviewed-withholdings/v1",
    basis: "the court's address is not a fact the platform holds, so it is never written: on the AcroForm families it is refused by role before the binder is asked, and on the flat families the binder itself refuses the printed label. The measured refusal reason is recorded beside the rationale.",
    count: 1,
    withheld: [{
      field: isAcro ? "Court Address" : "courtAddress",
      rationale: CAPTION_ACROFORM["Court Address"].what,
      measuredRefusal: courtAddressRefusal ? { reason: courtAddressRefusal.reason, category: courtAddressRefusal.category ?? null } : null
    }],
    exemptions: []
  });
  json("reports/findings.json", {
    schemaVersion: "rcap-family-findings/v1",
    family: family.family,
    findings: [
      { severity: "source_currency", finding: "issuer_unreachable_current_revision_not_compared", detail: `${family.currencyFinding} ${ISSUER_UNREACHABLE}` },
      { severity: "classification", finding: "reclassified_from_reference_only_to_participant_filed", detail: `${guide.title} (${guide.printedRevision}) names this document under "File the Request" as ${JSON.stringify(family.guideLine)}; the earlier source-artifact classification "reference_only / ineligible_never_a_participant_filing_artifact" contradicted the guide and is superseded on ${RECORDED_ON}.` },
      ...(isAcro && entry.acroFieldCount !== rows.length ? [{ severity: "fidelity", finding: "index_field_count_differs_from_binary", detail: `index declares ${entry.acroFieldCount}, first-hand census reads ${rows.length}` }] : []),
      ...(renders.boundary.report.unfittable.length > 0 ? [{ severity: "fit", finding: "boundary_value_refused_by_geometry", detail: renders.boundary.report.unfittable.map((u) => `${u.field ?? u.anchor}: ${u.reason}`).join("; ") }] : [])
    ]
  });

  files.set(`${dir}/handoff.md`, handoffMarkdown(family, ctx, artifacts, classCounts));
  // JDF 614 already has a draft from the 2026-06 candidate extraction, which is
  // kept as it was; drafts are emitted only for the three forms that had none.
  if (family.emitFieldMapDraft) {
    files.set(`${DRAFT_ROOT}/colorado-${family.formNumber.toLowerCase().replace("-", "")}.field-map-review.json`, `${JSON.stringify(fieldMapDraft(family, ctx), null, 2)}\n`);
  }
  return files;
}

function handoffMarkdown(family, ctx, artifacts, classCounts) {
  const { guide, rows, anchors, renders } = ctx;
  const isAcro = family.structure === "acroform";
  const writes = renders.canonical.report.written.map((w) => `\`${w.field ?? w.anchor}\` ← \`${w.factId}\``);
  return [
    `# CO — ${family.formNumber} — ${family.officialTitle}`,
    "",
    `Family \`${family.family}\` in \`colorado\`, built by \`${BUILD_SCRIPT}\` on ${RECORDED_ON} (factory \`${FACTORY_VERSION}\`).`,
    "",
    "## Why this is a participant-filed document",
    "",
    `${guide.title} (${guide.printedRevision}, sha256 \`${guide.sha256}\`) lists it under "File the Request" as **${family.guideLine}**. The petitioner files it with the caption completed; the court completes the rest.`,
    "",
    `${family.whatItIs}`,
    "",
    "## Source identity",
    "",
    `- Custody: \`${CUSTODY_ID}\`, index path \`${family.indexPath}\`${family.identicalIndexPath ? ` (identical bytes at \`${family.identicalIndexPath}\`)` : ""}`,
    `- sha256 \`${family.sha256}\`, ${family.byteLength} bytes, ${ctx.pageGeometry.length} page(s), ${isAcro ? `AcroForm with ${rows.length} fields` : "flat PDF with no form fields"}`,
    `- Printed revision: ${family.printedRevision}; freshness: \`${family.freshnessStatus}\``,
    `- ${family.currencyFinding}`,
    `- ${ISSUER_UNREACHABLE}`,
    "",
    "## Caption policy",
    "",
    ...Object.entries(classCounts).map(([k, v]) => `- ${k}: ${v}`),
    "",
    `Canonical writes: ${writes.length > 0 ? writes.join(", ") : "none"}. Court address withheld (not a held fact). Everything after the caption refused by role.`,
    isAcro ? "" : `Anchors: ${anchors.map((a) => `\`${a.key}\``).join(", ")}, measured from the page content stream (see field-census.json → captionAnchors).`,
    "",
    "## Rendered evidence",
    "",
    ...Object.entries(artifacts).map(([rel, meta]) => `- \`${rel}\` — sha256 \`${meta.sha256}\`, ${meta.bytes} bytes`),
    `- negative fixture: ${renders.negative.report.written.length} write(s)`,
    "",
    "## Holds carried forward",
    "",
    ...PRODUCTION_HOLDS.map((h) => `- \`${h}\``),
    "",
    "## Review status",
    "",
    "`implementation_complete_pending_independent_review`. This build does not approve its own output: nothing here is visually approved, source-current, counsel-approved, sellable or live.",
    ""
  ].join("\n");
}

function fieldMapDraft(family, ctx) {
  const { rows, anchors, pageGeometry } = ctx;
  const isAcro = family.structure === "acroform";
  const candidates = isAcro
    ? rows.map((r, i) => ({
        candidateId: `COL-${family.formNumber.replace("-", "")}-F${String(i + 1).padStart(3, "0")}`,
        sourceAcroFormFieldName: r.name, fieldType: r.type, page: r.widgets[0]?.page ?? 1, rect: r.widgets[0]?.rect ?? null,
        section: r.section, printedLabel: r.effectiveLabel, proposedClass: r.class, proposedFactId: r.fact ?? null,
        confidence: r.policy === "write" ? "high" : "not_applicable"
      }))
    : anchors.map((a, i) => ({
        candidateId: `COL-${family.formNumber.replace("-", "")}-A${String(i + 1).padStart(3, "0")}`,
        anchorKey: a.key, kind: a.kind, page: a.page, writeBox: a.writeBox, printedLabel: a.label, proposedClass: FLAT_CAPTION[a.key].class,
        proposedFactId: a.factId ?? null, measurement: a.measurement, confidence: a.factId ? "high" : "not_applicable"
      }));
  return {
    schemaVersion: 1,
    artifactType: "official_pdf_draft_field_map_review",
    status: "visual_review_required",
    lifecycle: "none",
    notices: [
      "This is a tracked draft field-map review artifact only.",
      "This is not visual approval.",
      "This is not replacement_candidate.",
      "This is not verified_replacement.",
      "This is not production ready.",
      "This is not live routed.",
      "This does not replace human visual review, filled-data visual review, source freshness review, or counsel confirmation.",
      "Do not wire this artifact to live routes."
    ],
    jurisdictionCode: "CO",
    jurisdictionName: "Colorado",
    formSlug: `colorado-${family.formNumber.toLowerCase().replace("-", "")}`,
    sourcePdf: family.indexPath,
    sourcePdfSha256: family.sha256,
    sourcePdfRole: "blank official source PDF, nationwide_recovery_pool_2026_09_02 custody, bound by exact SHA-256",
    mappingMode: "manual_review",
    pdfClassification: isAcro ? "acroform" : "flat_pdf",
    recommendedMappingMode: isAcro ? "acroform_fill_caption_only" : "flat_overlay_caption_only",
    generatedFrom: BUILD_SCRIPT,
    generatedOn: RECORDED_ON,
    productionFamily: `${OUT_ROOT}/${family.family}`,
    reviewInput: {
      visualPlacementSanityReview: "not_started",
      reviewerNotes: [
        `${family.guideLine} — the petitioner completes the caption only.`,
        isAcro ? `Candidate has ${rows.length} AcroForm fields; ${rows.filter((r) => r.policy === "write").length} caption fields bind.` : `Flat PDF: ${anchors.length} measured caption anchors; ${anchors.filter((a) => a.factId).length} bind.`,
        family.currencyFinding,
        "Filled-data visual review, source freshness review, and counsel confirmation are still required before production use."
      ]
    },
    counts: { candidateCount: candidates.length, pageGeometry },
    draftFieldMap: { formId: `co_colorado_${family.formNumber.toLowerCase().replace("-", "")}`, status: "visual_review_required", lifecycle: "none", mappingMode: "manual_review", fields: {}, overlays: [] },
    candidates
  };
}

/* ---- main ---------------------------------------------------------------------- */
const guides = { "JDF-416": await resolveGuide("JDF-416"), "JDF-611": await resolveGuide("JDF-611") };
const allFiles = new Map();
const summary = [];

for (const family of FAMILIES) {
  const { entry, bytes } = bindHeldBytes(family);
  if (family.identicalIndexPath) {
    const dup = (index.duplicates ?? []).find((d) => d.path === family.identicalIndexPath);
    assert.ok(dup && dup.identicalTo === family.indexPath && dup.sha256 === family.sha256,
      `${family.formNumber}: the index does not record ${family.identicalIndexPath} as identical to ${family.indexPath}`);
  }
  const guide = guides[family.route.guide];
  assert.ok(guide.quotations.includes(family.guideLine), `${family.formNumber}: the guide line ${JSON.stringify(family.guideLine)} is not among the verified quotations`);
  const { doc, pages, pageGeometry, text } = await pageLines(bytes);
  const documentTextLines = text.flatMap((t) => t.lines.map((l) => l.text));
  const readableLines = text.reduce((n, t) => n + t.lines.length, 0);
  const isAcro = family.structure === "acroform";
  const rows = isAcro ? await acroformCensus(family, doc, pages) : [];
  const flat = isAcro ? null : measureFlatCaption(family, text, pageGeometry);
  assert.equal(pages.length, entry.pageCount, `${family.formNumber}: index declares ${entry.pageCount} page(s), the binary has ${pages.length}`);

  const renders = {};
  const differing = [];
  for (const fixtureName of Object.keys(FIXTURES)) {
    const render = async () => isAcro
      ? renderAcroform(family, bytes, rows, documentTextLines, fixtureName)
      : renderFlat(family, bytes, flat.anchors, documentTextLines, fixtureName);
    const first = await render();
    const second = await render();
    if (sha256(first.bytes) !== sha256(second.bytes)) differing.push(fixtureName);
    renders[fixtureName] = first;
  }
  const determinism = { reproducible: differing.length === 0, differing, method: "each fixture rendered twice in one process from the same digest-bound source; digests compared" };
  assert.equal(renders.negative.report.written.length, 0, `${family.formNumber}: the negative fixture wrote ${renders.negative.report.written.length} field(s)`);
  const expectedWrites = isAcro ? ["County", "∆", "Case Number"] : ["County, Colorado", FLAT_CAPTION.petitioner.label, "Case Number:"];
  const canonicalWrites = renders.canonical.report.written.map((w) => w.field ?? w.anchor);
  assert.deepEqual([...canonicalWrites].sort(), [...expectedWrites].sort(), `${family.formNumber}: canonical writes ${JSON.stringify(canonicalWrites)} are not the three caption facts`);
  const escaped = renders.canonical.report.written.filter((w) => !(isAcro ? rows.find((r) => r.name === w.field)?.policy === "write" : flat.anchors.find((a) => a.label === w.anchor)?.factId));
  assert.deepEqual(escaped, [], `${family.formNumber}: a write reached a field the policy does not bind`);

  const files = familyFiles(family, { entry, guide, pageGeometry, rows, anchors: flat?.anchors ?? [], protectedRegions: flat?.protectedRegions ?? [], renders, determinism, readableLines });
  for (const [rel, content] of files) allFiles.set(rel, content);
  summary.push({ family: family.family, formNumber: family.formNumber, structure: family.structure, fields: isAcro ? rows.length : 0, anchors: flat?.anchors.length ?? 0,
    canonicalWrites: canonicalWrites.length, boundaryUnfittable: renders.boundary.report.unfittable.length, reproducible: determinism.reproducible });
}

let drifted = [];
for (const [rel, content] of allFiles) {
  const abs = path.join(ROOT, rel);
  const expected = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  if (CHECK) {
    if (!fs.existsSync(abs) || !fs.readFileSync(abs).equals(expected)) drifted.push(rel);
    continue;
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, expected);
}

for (const row of summary) console.log(`-- ${row.formNumber} ${row.family}: ${row.structure}, fields=${row.fields}, anchors=${row.anchors}, canonical writes=${row.canonicalWrites}, boundary unfittable=${row.boundaryUnfittable}, reproducible=${row.reproducible}`);
if (CHECK) {
  if (drifted.length > 0) {
    console.error(`FAIL Colorado caption-only families — ${drifted.length} file(s) drifted from what this build produces:`);
    for (const rel of drifted) console.error(`  ${rel}`);
    process.exit(1);
  }
  console.log(`OK Colorado caption-only families — ${allFiles.size} file(s) across ${FAMILIES.length} families match what this build produces`);
} else {
  console.log(`wrote ${allFiles.size} file(s) across ${FAMILIES.length} families under ${OUT_ROOT}/ and ${DRAFT_ROOT}/`);
}
