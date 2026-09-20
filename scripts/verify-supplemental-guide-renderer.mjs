#!/usr/bin/env node
/**
 * The §7 guide renderer control.
 *
 * It renders real PDFs and reads the text back out of them, rather than
 * asserting about the code that drew them. A renderer test that only checks
 * the call succeeded proves the function returned; it does not prove a
 * participant can read what came out, which is the only thing that matters
 * here.
 *
 * What it holds:
 *
 *   - the KEEP FOR YOUR RECORDS banner is on EVERY guide page, including
 *     continuation pages, and on NO pleading page anywhere in the product;
 *   - a court-only packet carries no guide at all, and says so;
 *   - a Spanish render REFUSES an untranslated entry instead of falling back;
 *   - long content paginates instead of being clipped at the margin;
 *   - stop conditions come from the specification, and the guide file carries
 *     none of its own.
 */
import { register } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const guideRenderer = await import("../src/lib/rcap/supplemental/guide-renderer.ts");
const { renderSupplementalGuidePdf, guideBelongsInPacket, guideStopConditions, guideDocuments,
  assemblePacketWithGuide } = guideRenderer;
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf, packetFilingDocuments } = await import("../src/lib/rcap/grade-a/renderer.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const guideDir = path.join(rootDir, "data/record-clearing/supplemental-guides");
const guides = fs.readdirSync(guideDir).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(guideDir, f), "utf8")));
check(guides.length > 0, `there are route guides to render (${guides.length})`);

const BANNER = "KEEP FOR YOUR RECORDS";

/** The drawn text, page by page, read back out of the rendered PDF. */
function pagesOf(pdf) {
  const file = path.join(os.tmpdir(), `guide-${process.pid}-${Math.floor(pdf.length)}.pdf`);
  fs.writeFileSync(file, pdf);
  try {
    const text = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
    return text.split("\f").filter((page) => page.trim().length > 0);
  } finally { fs.rmSync(file, { force: true }); }
}


/**
 * Words whose drawn box crosses the right margin, read out of the PDF itself.
 * A half-point tolerance absorbs the rasteriser's rounding.
 */
function wordsPastMargin(pdf) {
  const file = path.join(os.tmpdir(), `bbox-${process.pid}-${pdf.length}.pdf`);
  fs.writeFileSync(file, pdf);
  try {
    const xml = execFileSync("pdftotext", ["-bbox", file, "-"], { encoding: "utf8" });
    const pageWidth = Number(/<page width="([\d.]+)"/.exec(xml)?.[1] ?? 612);
    // A point and a half of tolerance: pdf-lib lays text out by advance width
    // and poppler reports glyph boxes including side bearings, so the two
    // disagree slightly on where a run ends. More than that is the renderer's.
    const limit = pageWidth - 46 + 1.5;
    const past = [];
    for (const match of xml.matchAll(/<word [^>]*xMax="([\d.]+)"[^>]*>([^<]*)<\/word>/g)) {
      const xMax = Number(match[1]);
      if (xMax > limit) past.push({ word: match[2], xMax });
    }
    return past;
  } finally { fs.rmSync(file, { force: true }); }
}


/**
 * The text a composed document is identified by in the rendered PDF.
 *
 * A pleading prints its caption's documentTitle, which is the adopted page's
 * own heading and is often not the component's catalogue `title` -- Wyoming's
 * proposed order is titled "Proposed Order for Expungement" in the
 * specification and prints "ORDER FOR EXPUNGEMENT", because that is what the
 * adopted page says. Matching on the catalogue title reported it missing from
 * a packet it was in.
 */
function drawnHeading(entry) {
  for (const block of entry.blocks ?? []) {
    if (block.kind !== "pleading_caption") continue;
    if (typeof block.title === "string" && block.title.trim()) return block.title.trim();
  }
  return entry.title;
}

for (const guide of guides) {
  const where = guide.routeKey;
  const specification = packetSpecificationFor(where);
  const stops = guideStopConditions(specification);

  // The checklist lists what THIS MATTER ships, so the table is built from a
  // composed packet rather than from the specification's catalogue.
  const sampleFacts = { participant_full_legal_name: "Marisol Okonkwo-Baptiste",
    date_of_birth: "1984-11-02", mailing_address: "9 Larkspur Row, Cheyenne, WY 82001",
    phone_number: "307-555-0188", email_address: "m.okonkwo@example.test" };
  for (const required of specification.requiredFacts ?? []) {
    if (!sampleFacts[required.factId]) {
      sampleFacts[required.factId] = /date/i.test(required.factId) ? "2019-03-14" : `${required.factId.replace(/_/g, " ")} value`;
    }
  }
  const samplePacket = composeGradeAPacket(specification, {
    routeKey: where, verificationHash: "guide-table-0001", facts: sampleFacts
  }, {});
  const documents = guideDocuments(samplePacket);
  const matter = {
    preparedFor: "Marisol Okonkwo-Baptiste",
    preparedOn: "March 14, 2026",
    jurisdiction: guide.jurisdiction,
    courtOrAgency: "District Court, Laramie County",
    caseOrMatter: "CR-2019-0442",
    remedy: "Expungement of records of conviction",
    packetId: "PKT-TEST-0001"
  };
  const pdf = await renderSupplementalGuidePdf(guide, { variant: "full", locale: "en", stops, documents, matter });
  check(pdf.length > 2000, `${where}: the guide renders (${pdf.length} bytes)`);

  const pages = pagesOf(pdf);
  check(pages.length > 0, `${where}: the rendered guide has readable pages (${pages.length})`);

  // The banner is the thing that stops a participant filing their own
  // instructions, so a continuation page without it is the whole defect.
  const unbannered = pages.filter((page) => !page.includes(BANNER));
  check(
    unbannered.length === 0,
    `${where}: every guide page carries the KEEP FOR YOUR RECORDS banner${
      unbannered.length ? ` (${unbannered.length} of ${pages.length} do not)` : ""}`
  );

  const drawn = pages.join("\n");

  // The approved design's structure, not just its four headings.
  for (const element of [
    ["the cover title", "Your record-clearing packet"],
    ["the WHAT IS INSIDE contents list", "WHAT IS INSIDE"],
    ["the IMPORTANT callout", "IMPORTANT"],
    ["the Next steps page", "Next steps"],
    ["the filing strip", "WHERE TO FILE"],
    ["the Filing checklist page", "Filing checklist"],
    ["the document-check table", "DOCUMENT CHECK"],
    ["the Fees & costs page", "Fees & costs"],
    ["the fee breakdown table", "FEE BREAKDOWN"],
    ["the fee-waiver panel", "FEE WAIVER"],
    ["the page footer", "Expungement.ai by LegalEase"]
  ]) {
    check(drawn.includes(element[1]), `${where}: ${element[0]} is drawn`);
  }

  // The matter panel is populated from the matter, not from guide prose.
  check(drawn.includes(matter.preparedFor), `${where}: the cover names the participant from the matter`);
  check(drawn.includes(matter.packetId), `${where}: the footer carries the packet id`);

  // Every court-facing component the specification names reaches the table.
  const missing = documents.filter((d) => !drawn.includes(d.title.slice(0, 28)));
  check(
    documents.length > 0 && missing.length === 0,
    `${where}: every court-facing component appears in the document table (${documents.length})${
      missing.length ? `; missing ${missing[0].documentId}` : ""}`
  );

  // Page numbering runs to the real total.
  check(
    new RegExp(`GUIDE ${pages.length} OF ${pages.length}`).test(drawn)
    && drawn.includes(`GUIDE 1 OF ${pages.length}`),
    `${where}: pages are numbered 1..${pages.length} of the real total`
  );

  // Nothing unestablished is invented, and nothing unestablished is left blank.
  if (!guide.fees?.lastVerified) {
    check(drawn.includes("Not established for this route"),
      `${where}: an unestablished field says so rather than being blank or invented`);
  }

  // Stops are drawn from the specification, and the guide stores none.
  const blocking = stops.filter((stop) => stop.stopAndGetHelp);
  if (blocking.length > 0) {
    const firstWords = blocking[0].situation.split(/\s+/).slice(0, 5).join(" ");
    check(
      drawn.includes("stop and get help") || drawn.includes(firstWords.slice(0, 30)),
      `${where}: the stop conditions are drawn, derived from the specification (${blocking.length})`
    );
  }

  /*
   * Nothing is drawn past the right margin -- measured from the PDF's own glyph
   * positions, not from character counts.
   *
   * A first version of this counted characters in `pdftotext -layout` output and
   * called anything over 130 an overflow. That is not a width measurement: the
   * right-aligned header and the three-column footer are padded with spaces to
   * well past 130 characters while sitting comfortably inside the margin, and a
   * proportional font makes the count meaningless anyway. It reported a defect
   * that was not there, which is the sort of check that later gets ignored.
   */
  const past = wordsPastMargin(pdf);
  check(
    past.length === 0,
    `${where}: no glyph is drawn past the right margin${
      past.length ? ` (${past.length}, e.g. "${past[0].word}" at x=${past[0].xMax.toFixed(1)})` : ""}`
  );

  // Spanish refuses rather than falling back, until the route carries Spanish.
  const anySpanish = [...(guide.overview ?? []), ...(guide.nextSteps ?? []),
    ...(guide.filingChecklist ?? []), ...(guide.feesAndCosts ?? [])].every((entry) => entry.textEs?.trim());
  const stopsEs = guide.stopConditionsEs ?? {};
  let refused = null;
  let spanishPdf = null;
  try {
    spanishPdf = await renderSupplementalGuidePdf(guide, { variant: "full", locale: "es", stops, documents, matter, stopsEs });
  } catch (error) { refused = error; }
  check(
    anySpanish ? refused === null : refused !== null && /no Spanish text/.test(refused.message),
    anySpanish
      ? `${where}: the route carries Spanish throughout, so the Spanish guide renders`
      : `${where}: a Spanish render refuses the untranslated entry instead of falling back to English`
  );

  if (spanishPdf) {
    const spanish = pagesOf(spanishPdf).join("\n");
    // Every English sentence is gone, not merely joined by Spanish ones.
    const englishLeft = [...(guide.overview ?? []), ...(guide.nextSteps ?? []),
      ...(guide.filingChecklist ?? []), ...(guide.feesAndCosts ?? [])]
      .filter((entry) => entry.text.length > 40 && spanish.includes(entry.text.slice(0, 40)));
    check(
      englishLeft.length === 0,
      `${where}: no English entry survives into the Spanish guide${
        englishLeft.length ? `: "${englishLeft[0].text.slice(0, 50)}"` : ""}`
    );
    for (const element of [
      ["the Spanish cover title", "Su paquete para limpiar antecedentes"],
      ["the Spanish banner", "CONSERVE ESTE DOCUMENTO"],
      ["the Spanish filing strip", "DÓNDE PRESENTAR"],
      ["the Spanish document table", "REVISIÓN DE DOCUMENTOS"],
      ["the Spanish fee breakdown", "DESGLOSE DE TARIFAS"],
      ["the Spanish fee-waiver panel", "EXENCIÓN DE TARIFAS"],
      ["the Spanish stop conditions", "CUÁNDO DETENERSE"],
      ["the Spanish page counter", "GUÍA 1 DE"]
    ]) {
      check(spanish.includes(element[1]), `${where}: ${element[0]} is drawn`);
    }
    // Accented characters survive the WinAnsi sanitiser rather than vanishing.
    check(/[áéíóúñ¿]/.test(spanish), `${where}: Spanish accents survive into the drawn page`);
    // A stop translated in the guide must still match a stop the specification
    // carries; a stale key would silently print English in a Spanish guide.
    const situations = new Set(stops.map((stop) => stop.situation));
    const orphaned = Object.keys(stopsEs).filter((key) => !situations.has(key));
    check(
      orphaned.length === 0,
      `${where}: every translated stop condition still matches one the specification carries${
        orphaned.length ? ` (${orphaned.length} orphaned)` : ""}`
    );
    const untranslated = stops.filter((stop) => stop.stopAndGetHelp && !stopsEs[stop.situation]);
    check(
      untranslated.length === 0,
      `${where}: every blocking stop condition is translated (${stops.filter((s) => s.stopAndGetHelp).length})`
    );
  }

  // A court-only packet carries no guide, and says so.
  let courtOnly = null;
  try {
    await renderSupplementalGuidePdf(guide, { variant: "court_only", locale: "en", stops, documents, matter });
  } catch (error) { courtOnly = error; }
  check(
    courtOnly !== null && /carries no participant guide/.test(courtOnly.message),
    `${where}: a court-only packet refuses the guide rather than returning an empty PDF`
  );
}

check(guideBelongsInPacket("full") === true && guideBelongsInPacket("court_only") === false,
  "the full packet carries the guide and the court-only packet does not");

/*
 * ASSEMBLY, proven by WHICH DOCUMENTS SHIPPED.
 *
 * The previous version of this named the output of renderGradeAPacketPdf
 * "courtFacing" and checked the assembled pages for the absence of the guide's
 * banner. Neither held. That renderer draws EVERY composed document and appends
 * an "About this packet" provenance page, so the variable was a full packet
 * under a court-only name -- and legacy participant guidance does not acquire a
 * DO NOT FILE banner merely by being non-filing material, so its absence proved
 * nothing about what was in there.
 *
 * The selection is the §4.2 contract's `courtFacing`, derived from each
 * component's instrumentClass. Never presentation, never a filename, never a
 * banner.
 */
{
  const guide = guides.find((candidate) => candidate.routeKey.startsWith("WY:"));
  const specification = packetSpecificationFor(guide.routeKey);
  const facts = {
    participant_full_legal_name: "Marisol Okonkwo-Baptiste",
    date_of_birth: "1984-11-02",
    mailing_address: "9 Larkspur Row, Cheyenne, WY 82001",
    phone_number: "307-555-0188",
    email_address: "m.okonkwo@example.test"
  };
  for (const required of specification.requiredFacts ?? []) {
    if (!facts[required.factId]) {
      facts[required.factId] = /date/i.test(required.factId) ? "2019-03-14" : `${required.factId.replace(/_/g, " ")} value`;
    }
  }
  const packet = composeGradeAPacket(specification, {
    routeKey: guide.routeKey, verificationHash: "assembly-proof-0001", facts
  }, {});

  const filing = packetFilingDocuments(packet);
  const participantOnly = packet.documents.filter((d) => !d.courtFacing);
  check(filing.length > 0, `the route composes court-facing documents (${filing.length} of ${packet.documents.length})`);
  check(
    participantOnly.length > 0,
    `and participant-facing ones that must stay out of a court-only download (${participantOnly.map((d) => d.documentId).join(", ")})`
  );

  const options = {
    stops: guideStopConditions(specification),
    documents: guideDocuments(packet),
    matter: { preparedFor: facts.participant_full_legal_name, packetId: "PKT-ASSEMBLY-1" }
  };

  // 1. Court-only: the filing documents, and nothing addressed to the participant.
  //
  // The assembler renders the packet half itself now, so a caller cannot pair a
  // guide with a packet render that did not know the guide was coming.
  const courtOnly = await assemblePacketWithGuide(packet, guide, { ...options, variant: "court_only" });
  const courtText = pagesOf(courtOnly).join("\n");

  const missingFiling = filing.filter((d) => !courtText.includes(drawnHeading(d).slice(0, 28)));
  check(
    missingFiling.length === 0,
    `court-only carries every filing document${missingFiling.length ? `; missing ${missingFiling[0].documentId}` : ` (${filing.map((d) => d.documentId).join(", ")})`}`
  );
  const strayGuidance = participantOnly.filter((d) => courtText.includes(drawnHeading(d).slice(0, 28)));
  check(
    strayGuidance.length === 0,
    `court-only carries NO participant guidance${strayGuidance.length ? `; found ${strayGuidance[0].documentId}` : ""}`
  );
  check(!courtText.includes("About this packet"), "court-only carries no internal provenance appendix");
  check(!courtText.includes(BANNER), "court-only carries no supplemental pages");

  // 2. Full: the guide, the same filing documents, and no duplicated guidance.
  const full = await assemblePacketWithGuide(packet, guide, { ...options, variant: "full" });
  const fullPages = pagesOf(full);
  const fullText = fullPages.join("\n");
  const missingInFull = filing.filter((d) => !fullText.includes(drawnHeading(d).slice(0, 28)));
  check(missingInFull.length === 0, "a full packet carries the same filing documents");
  check(fullText.includes("Your record-clearing packet"), "and carries the guide");
  /*
   * The banner belongs to the leading guide pages and to none of the court
   * pages. It cannot be tested by looking for filing-document titles on
   * bannered pages: the guide's own DOCUMENT CHECK table lists every filing
   * document by name, on a page that correctly carries the banner. Position is
   * the honest test -- the guide leads, the court material follows unchanged.
   */
  const courtPageCount = pagesOf(
    await renderGradeAPacketPdf(packet, { variant: "full", guideAssembled: true })).length;
  const guidePageCount = fullPages.length - courtPageCount;
  check(
    guidePageCount > 0
    && fullPages.slice(0, guidePageCount).every((page) => page.includes(BANNER))
    && fullPages.slice(guidePageCount).every((page) => !page.includes(BANNER)),
    `the banner is on all ${guidePageCount} leading guide pages and on none of the ${courtPageCount} court pages`
  );

  /*
   * THE SUPERSEDED PAGE RETIRES, AND ONLY WHEN ITS REPLACEMENT IS HERE.
   *
   * A component marked `supersededBy: "supplemental_guide"` is retained in the
   * specification on purpose: it is the only instructions the participant has
   * until the guide actually ships for that route. But retention in source is
   * not a licence to hand someone two sets of filing instructions for the same
   * filing, free to drift apart -- which is what "marked superseded" meant for
   * as long as the marking had no effect on anything.
   *
   * So both directions are checked on the same packet: assembled WITH the
   * guide, the page is gone; rendered WITHOUT one, it is still there.
   */
  const legacy = participantOnly.filter((d) => d.supersededByGuide);
  check(legacy.length > 0, `the route has pages the guide supersedes (${legacy.length})`);
  for (const page of legacy) {
    const heading = drawnHeading(page).slice(0, 28);
    check(
      !fullText.includes(heading),
      `${page.documentId} retires from a packet assembled with its replacement`
    );
  }
  const withoutGuide = pagesOf(await renderGradeAPacketPdf(packet, { variant: "full" })).join("\n");
  const missingWithoutGuide = legacy.filter((page) => !withoutGuide.includes(drawnHeading(page).slice(0, 28)));
  check(
    missingWithoutGuide.length === 0,
    `and is still shipped where no guide is assembled${
      missingWithoutGuide.length ? `; ${missingWithoutGuide[0].documentId} vanished` : ""}`
  );

  // 3. A conditional document and its checklist entry agree with the branch.
  //
  //    Driven by the route's REAL condition, not by forcing the requirement.
  //    South Dakota's escalation motion is selected by the participant's answer
  //    about where they are in the recorded sequence, so both branches here are
  //    ones a participant can actually be on.
  {
    const SD = await import("../src/lib/rcap-engine/south-dakota-23a-27-17-escalation.ts");
    const sd = packetSpecificationFor(SD.SD_SIS_ROUTE_KEY);
    const base = { participant_full_legal_name: "Tobias Fenwick Ashgrove" };
    for (const required of sd.requiredFacts ?? []) {
      if (!base[required.factId]) base[required.factId] = `${required.factId.replace(/_/g, " ")} value`;
    }
    const compose = (stage) => composeGradeAPacket(sd, {
      routeKey: sd.routeKey, verificationHash: `branch-${stage}`,
      facts: { ...base, [SD.SD_SIS_STAGE_FACT_ID]: stage }
    }, {});

    const notSelected = compose(SD.SD_SIS_STAGE_REQUEST_NOT_MADE);
    const selected = compose(SD.SD_SIS_STAGE_RECORD_NOT_CORRECTED);
    const idsIn = (p) => guideDocuments(p).map((d) => d.documentId);

    check(
      !idsIn(notSelected).includes("enforcement_motion")
      && !packetFilingDocuments(notSelected).some((d) => d.documentId === "enforcement_motion"),
      "before the escalation stage, neither the packet nor the checklist lists the motion"
    );
    check(
      idsIn(selected).includes("enforcement_motion")
      && packetFilingDocuments(selected).some((d) => d.documentId === "enforcement_motion"),
      "at the escalation stage, both the packet and the checklist list it"
    );
    check(
      idsIn(notSelected).length + 1 === idsIn(selected).length,
      "the checklist tracks the selected set exactly, not the specification's catalogue"
    );
  }

  // 4. Missing guide data cannot pass as a complete full packet.
  let incomplete = null;
  try {
    await assemblePacketWithGuide(packet, null, { ...options, variant: "full", routeKey: guide.routeKey });
  } catch (error) { incomplete = error; }
  check(
    incomplete !== null && /incomplete data, not a court-only packet/.test(incomplete.message),
    "a full packet with missing guide data is reported incomplete, not silently returned as court material"
  );
}

/*
 * PAGINATION, proven rather than assumed.
 *
 * A guide long enough to overflow must continue on a second page, with the
 * banner on it. Built from the real schema so the test cannot drift from it.
 */
{
  const long = {
    schemaVersion: "rcap-supplemental-guide/v1",
    routeKey: "TEST:pagination",
    jurisdiction: "TEST",
    supersedesPacketComponent: null,
    overview: Array.from({ length: 40 }, (_, index) => ({
      text: `Paragraph ${index + 1}. ` + "This sentence exists to consume vertical space on the page. ".repeat(4),
      provenance: { kind: "product_copy" }
    })),
    nextSteps: [], filingChecklist: [], feesAndCosts: [], carriedElsewhere: []
  };
  const pdf = await renderSupplementalGuidePdf(long, { variant: "full", locale: "en" });
  const pages = pagesOf(pdf);
  check(pages.length > 1, `long guide content paginates instead of being clipped (${pages.length} pages)`);
  check(
    pages.every((page) => page.includes(BANNER)),
    "and every continuation page carries the banner too"
  );
  const lastParagraphReached = pages.join("\n").includes("Paragraph 40.");
  check(lastParagraphReached, "the final paragraph survives pagination rather than being dropped");
}

/*
 * The banner belongs to guide pages and to nothing else. Telling someone not to
 * file the document they must file is worse than not telling them anything, so
 * the document renderer must not know this string at all.
 */
/*
 * The document renderer never DRAWS the banner. Comments are stripped before
 * looking: the file explains why the banner is not its business, and a scan
 * that cannot tell an explanation from an instruction reds on the explanation.
 */
const documentRenderer = fs.readFileSync(path.join(rootDir, "src/lib/rcap/grade-a/renderer.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((line) => !line.trimStart().startsWith("//")).join("\n");
check(
  !documentRenderer.includes(BANNER) && !/DO NOT FILE/.test(documentRenderer),
  "the Grade-A document renderer never draws the DO NOT FILE banner -- it belongs to guide pages only"
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
