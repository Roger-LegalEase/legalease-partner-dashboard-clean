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
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");
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

for (const guide of guides) {
  const where = guide.routeKey;
  const specification = packetSpecificationFor(where);
  const stops = guideStopConditions(specification);

  const documents = guideDocuments(specification);
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
  let refused = null;
  try {
    await renderSupplementalGuidePdf(guide, { variant: "full", locale: "es", stops, documents, matter });
  } catch (error) { refused = error; }
  check(
    anySpanish ? refused === null : refused !== null && /no Spanish text/.test(refused.message),
    anySpanish
      ? `${where}: the route carries Spanish throughout, so the Spanish guide renders`
      : `${where}: a Spanish render refuses the untranslated entry instead of falling back to English`
  );

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
 * ASSEMBLY, which is the behaviour a participant actually receives.
 *
 * A court-only packet must SUCCEED with zero guide pages. The standalone guide
 * renderer refusing a court-only request is correct -- there is no such
 * document -- but that refusal must never become a court-only packet failure.
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
  const courtFacing = await renderGradeAPacketPdf(packet);
  const courtPages = pagesOf(courtFacing).length;
  check(courtPages > 0, `court-facing material renders on its own (${courtPages} pages)`);

  const options = {
    stops: guideStopConditions(specification),
    documents: guideDocuments(specification),
    matter: { preparedFor: facts.participant_full_legal_name, packetId: "PKT-ASSEMBLY-1" }
  };

  const courtOnly = await assemblePacketWithGuide(courtFacing, guide, { ...options, variant: "court_only" });
  const courtOnlyPages = pagesOf(courtOnly);
  check(
    courtOnlyPages.length === courtPages,
    `a court-only packet assembles successfully with ZERO guide pages (${courtOnlyPages.length} = ${courtPages})`
  );
  check(
    courtOnlyPages.every((page) => !page.includes(BANNER)),
    "and carries the DO NOT FILE banner on none of them"
  );

  const full = await assemblePacketWithGuide(courtFacing, guide, { ...options, variant: "full" });
  const fullPages = pagesOf(full);
  check(
    fullPages.length > courtPages,
    `a full packet carries the guide as well as the court material (${fullPages.length} > ${courtPages})`
  );
  check(
    fullPages.slice(0, fullPages.length - courtPages).every((page) => page.includes(BANNER))
    && fullPages.slice(fullPages.length - courtPages).every((page) => !page.includes(BANNER)),
    "the guide pages lead, the court pages follow, and only the guide pages carry the banner"
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
const documentRenderer = fs.readFileSync(path.join(rootDir, "src/lib/rcap/grade-a/renderer.ts"), "utf8");
check(
  !documentRenderer.includes(BANNER) && !/DO NOT FILE/.test(documentRenderer),
  "the Grade-A document renderer never draws the DO NOT FILE banner -- it belongs to guide pages only"
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
