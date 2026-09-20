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
const { renderSupplementalGuidePdf, guideBelongsInPacket, guideStopConditions } = guideRenderer;
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

for (const guide of guides) {
  const where = guide.routeKey;
  const specification = packetSpecificationFor(where);
  const stops = guideStopConditions(specification);

  const pdf = await renderSupplementalGuidePdf(guide, { variant: "full", locale: "en", stops });
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

  // Every section that has entries reaches the page.
  const drawn = pages.join("\n");
  for (const section of ["Overview", "Next Steps", "Filing Checklist", "Fees & Costs"]) {
    const id = { "Overview": "overview", "Next Steps": "nextSteps", "Filing Checklist": "filingChecklist", "Fees & Costs": "feesAndCosts" }[section];
    if ((guide[id] ?? []).length === 0) continue;
    check(drawn.includes(section), `${where}: the ${section} section is drawn`);
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

  // Nothing is drawn past the right margin. pdftotext -layout preserves
  // position, so a clipped line shows up as a line longer than the page.
  const overlong = pages.flatMap((page) => page.split("\n")).filter((line) => line.length > 130);
  check(overlong.length === 0, `${where}: no line runs past the measured content width`);

  // Spanish refuses rather than falling back, until the route carries Spanish.
  const anySpanish = [...(guide.overview ?? []), ...(guide.nextSteps ?? []),
    ...(guide.filingChecklist ?? []), ...(guide.feesAndCosts ?? [])].every((entry) => entry.textEs?.trim());
  let refused = null;
  try {
    await renderSupplementalGuidePdf(guide, { variant: "full", locale: "es", stops });
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
    await renderSupplementalGuidePdf(guide, { variant: "court_only", locale: "en", stops });
  } catch (error) { courtOnly = error; }
  check(
    courtOnly !== null && /carries no participant guide/.test(courtOnly.message),
    `${where}: a court-only packet refuses the guide rather than returning an empty PDF`
  );
}

check(guideBelongsInPacket("full") === true && guideBelongsInPacket("court_only") === false,
  "the full packet carries the guide and the court-only packet does not");

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
