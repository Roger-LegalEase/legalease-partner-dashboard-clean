/**
 * WHAT CR-65 PRINTS, AND THE READBACK THAT KEEPS IT HONEST.
 *
 * CR-65 Rev. 10/2024 makes the petitioner make choices that no expungement
 * route can make for them: what they are attaching (page 5), whether they have
 * previously applied for an expungement (page 6, under the perjury line), and
 * whether they appear pro se (page 6). Every Alabama family built from this
 * binary correctly ticks none of them and correctly refuses them in its field
 * map -- and, until this repair, correctly never told the participant they
 * exist, because "Blanks you must fill in" prints only refusals carrying
 * requiredBeforeFiling true and an election is not one.
 *
 * VF01 found the consequence twice over in al-felony-dwop-set: three mandatory
 * selections delivered unmade with the guide naming none of them, and -- worse
 * -- the two blanks that exist ONLY on the second branch of the page-6
 * select-one listed in a list headed "Fill every one on both the canonical and
 * the boundary-style packet before filing". A petitioner who has never filed
 * for an expungement before was being told to fill in a prior expungement they
 * do not have, on the page they swear to under penalty of perjury.
 *
 * WHY THESE STRINGS LIVE IN ONE FILE.
 *
 * Six families bind this same binary. Every one of them owes the participant
 * the same printed lines, and a copy per family is a copy per family to drift.
 * Nothing here is any packet's characterisation of Alabama law: every string is
 * a line the form itself prints, and assertCR65PrintedElections re-reads each
 * one out of the DELIVERED bytes of every fixture on every build, so a guide
 * cannot quote a line the delivered petition does not carry.
 *
 * What this module does NOT hold is the prose each family wraps around them.
 * That is family-specific -- how many fixtures, which ground was elected -- and
 * belongs to the family's own builder.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

/** Lines CR-65 prints, by the page of the FORM they appear on. */
export const CR65_PRINTED_ELECTIONS = Object.freeze({
  attachments: {
    page: 5,
    heading: "Attached to this Petition are: (Petition must include either item 1 or item 2; All Petitions must include item 3.)",
    options: [
      "[ ] (1) a certified record of arrest from the appropriate agency for the court record I seek to have",
      "[ ] (2) a certified record of disposition or a certified record of the case action summary from the",
      "[ ] (3) a certified official criminal record obtained from the Alabama Law Enforcement Agency (ALEA)."
    ]
  },
  swornSelectOne: {
    page: 6,
    oath: "I swear or affirm, under the penalty of perjury:",
    heading: "(3)(Select one of the following):",
    firstBranch: "[ ] that I have not previously applied for an expungement in this or any other jurisdiction.",
    secondBranchOpening: "[ ] that I have previously filed for an expungement. My previous expungement was filed in",
    grantedDenied: "was [ ] granted [ ] denied."
  },
  proSe: { page: 6, line: "[ ] pro se (Not represented by an attorney)" }
});

/** [formPage, printedLine] for every line a guide may quote. */
export function cr65QuotedElectionLines() {
  const { attachments: a, swornSelectOne: s, proSe: p } = CR65_PRINTED_ELECTIONS;
  return [
    [a.page, a.heading], ...a.options.map((line) => [a.page, line]),
    [s.page, s.oath], [s.page, s.heading], [s.page, s.firstBranch],
    [s.page, s.secondBranchOpening], [s.page, s.grantedDenied],
    [p.page, p.line]
  ];
}

/**
 * The two CR-65 blanks that exist ONLY on the second branch of the page-6
 * select-one. A guide that lists either of them without the condition tells a
 * first-time petitioner to invent a prior expungement.
 */
export const CR65_SECOND_BRANCH_ONLY = Object.freeze([
  "CR-65:COUNTY and it was given Court Case Number",
  "CR-65:was     granted"
]);
export const CR65_SECOND_BRANCH_CONDITION = "only if you tick the SECOND box in item (3) on CR-65 page 6";

async function printedLinesOf(file, page) {
  const document = await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false });
  const target = document.getPages()[page - 1];
  assert.ok(target, `${path.basename(file)} has no page ${page}`);
  return groupIntoLines(extractTextItems(target)).map((line) => String(line.text ?? "").replace(/\s+/g, " ").trim());
}

/**
 * Every quoted line must be present in the DELIVERED bytes of every fixture, on
 * the packet page named. `cr65PageOffset` is how many packet pages precede
 * CR-65 page 1 (0 where the petition leads the packet).
 *
 * This is a glyph readback and it knows what it is: it proves the line was
 * DRAWN, never that it is VISIBLE. An opaque box painted over it leaves this
 * assertion passing. That is what printed-source-ink-survival.mjs is for, and
 * the two are complements, not substitutes.
 */
export async function assertCR65PrintedElections(fixtureFiles, { cr65PageOffset = 0 } = {}) {
  assert.ok(fixtureFiles.length > 0, "no fixture was offered for the printed-election readback");
  for (const file of fixtureFiles) {
    const cache = new Map();
    for (const [formPage, quoted] of cr65QuotedElectionLines()) {
      const packetPage = formPage + cr65PageOffset;
      if (!cache.has(packetPage)) cache.set(packetPage, await printedLinesOf(file, packetPage));
      const want = quoted.replace(/\s+/g, " ").trim();
      assert.ok(cache.get(packetPage).includes(want),
        `${path.basename(file)} page ${packetPage} does not print the line this guide quotes: ${JSON.stringify(quoted)}`);
    }
  }
}
