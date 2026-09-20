#!/usr/bin/env node
/**
 * The Mississippi additional-misdemeanour section is decided by the route.
 *
 * One specification serves two exact routes and they differ in one legal fact:
 * which Code section the petition is brought under. Sec. 9-11-15(3) is the
 * justice court's; Sec. 21-23-7(6) is the municipal court's. The route already
 * says which, and the specification's own final-verification requirements say
 * a client-supplied section never chooses the route.
 *
 * The petition used to print "This petition is brought under Miss. Code Ann.
 * Sec. ____" as a ruled blank and leave the participant to copy the citation
 * out of the guidance, and the proposed order recited the same blank. Two
 * consequences, both bad: a participant could write the wrong section on a
 * court filing from a value we already held, and the two routes composed
 * byte-identical court packets, so nothing downstream could tell them apart.
 *
 * What this holds:
 *
 *   1. the justice-court packet names 9-11-15(3) and never 21-23-7(6);
 *   2. the municipal-court packet names 21-23-7(6) and never 9-11-15(3);
 *   3. neither packet asks the participant to choose -- the field is not a
 *      blank, the ownership is server-owned, and a client-supplied section is
 *      overwritten rather than printed;
 *   4. the two court-only packets therefore no longer hash identically;
 *   5. and a route the specification does not name is still refused.
 *
 *   node scripts/test-ms-section-branch-is-route-derived.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { composeGradeAPacket, GradeAPacketCompositionError } =
  await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");

const JUSTICE = "MS:additional-justice-court-misdemeanor-relief-9-11-15-3";
const MUNICIPAL = "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6";
const JUSTICE_SECTION = "9-11-15(3)";
const MUNICIPAL_SECTION = "21-23-7(6)";
const SPEC_PATH = "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json";

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const specification = packetSpecificationFor(JUSTICE);
if (!specification) throw new Error(`${JUSTICE} has no registered specification`);

/* Facts for everything the composer demands. The section is deliberately NOT
 * among them: if the route did not supply it the composition would refuse, and
 * that refusal is itself part of what is being proven. */
function factsFor(extra = {}) {
  const facts = {};
  const ids = new Set((specification.requiredFacts ?? []).map((entry) => entry.factId));
  for (const document of specification.documents ?? []) {
    for (const section of document.sections ?? []) {
      for (const field of section.fields ?? []) ids.add(field);
      for (const assertion of section.assertions ?? []) for (const id of assertion.facts ?? []) ids.add(id);
    }
  }
  for (const id of ids) facts[id] = `REVIEW-${id}`;
  facts.participant_full_legal_name = "Jordan Avery Reyes";
  return { ...facts, ...extra };
}

function compose(routeKey, extra = {}) {
  return composeGradeAPacket(specification, {
    routeKey,
    generationPurpose: "internal_review",
    facts: factsFor(extra),
    verifiedAt: "2026-09-03T15:00:00.000Z",
    verificationHash: "ms-section-branch-control"
  });
}

/*
 * Read back what is DRAWN, not what was composed.
 *
 * The block assertions below already prove the composer put the right value in
 * the right item. They cannot prove it reaches the page: a PDF's text is
 * compressed, so searching the bytes finds nothing either way, and a check that
 * can never fail is worse than no check. The text comes out of the rendered
 * document the way every other control in this repository reads one.
 */
const drawnText = async (packet, variant) => {
  const bytes = await renderGradeAPacketPdf(packet, { variant });
  const file = path.join(os.tmpdir(), `ms-section-${process.pid}-${variant}-${bytes.length}.pdf`);
  fs.writeFileSync(file, bytes);
  try { return execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" }); }
  finally { fs.rmSync(file, { force: true }); }
};

/** Every identity-list item the packet draws, across every document. */
function identityItems(packet) {
  return packet.documents.flatMap((document) =>
    (document.blocks ?? [])
      .filter((block) => block.kind === "pleading_identity_list")
      .flatMap((block) => block.items ?? []));
}

// ---------------------------------------------------------------- ownership

const declared = specification.requiredFacts.find((entry) => entry.factId === "section_branch");
check(Boolean(declared), "the specification declares section_branch");
check(declared?.ownership === "server_route",
  `section_branch is owned by the route, not the participant (ownership: ${declared?.ownership})`);

const ownership = specification.fieldOwnership ?? {};
check(!(ownership.participantCompletesBeforeFilingFields ?? []).includes("section_branch"),
  "section_branch is not a field the participant completes before filing");
check((ownership.serverOwnedRouteFacts ?? []).includes("section_branch"),
  "section_branch is a server-owned route fact, so the collection resolver never asks it");
check(declared?.inRegistryRequiredInputs === false,
  "section_branch is not a registry required input, so no intake question is generated for it");

const derivedMap = specification.routeDerivedFacts ?? {};
check(derivedMap[JUSTICE]?.section_branch?.includes(JUSTICE_SECTION) === true,
  `the justice-court route derives ${JUSTICE_SECTION}`);
check(derivedMap[MUNICIPAL]?.section_branch?.includes(MUNICIPAL_SECTION) === true,
  `the municipal-court route derives ${MUNICIPAL_SECTION}`);

// ------------------------------------------------------------ what is drawn

const justice = compose(JUSTICE);
const municipal = compose(MUNICIPAL);

for (const [name, packet, mine, theirs] of [
  ["justice court", justice, JUSTICE_SECTION, MUNICIPAL_SECTION],
  ["municipal court", municipal, MUNICIPAL_SECTION, JUSTICE_SECTION]
]) {
  const full = await drawnText(packet, "full");
  const courtOnly = await drawnText(packet, "court_only");
  for (const [variant, drawn] of [["full", full], ["court-only", courtOnly]]) {
    check(drawn.includes(mine), `${name} ${variant}: the packet names Sec. ${mine}`);
  }
  /* The guidance page explains both branches on purpose -- a participant should
   * be able to see why theirs is the one that applies -- so the other section
   * is only forbidden on the pages that go to the court. */
  check(!courtOnly.includes(theirs),
    `${name} court-only: the other section, Sec. ${theirs}, is nowhere in what the clerk receives`);

  const item = identityItems(packet)
    .find((entry) => /brought under/i.test(entry.label ?? ""));
  check(Boolean(item), `${name}: the petition pleads the section it is brought under`);
  check(item?.blank !== true,
    `${name}: that line is a printed value, not a blank the participant fills`);
  check((item?.value ?? "").includes(mine),
    `${name}: and the value is Sec. ${mine}`);
}

// --------------------------------------------- a client cannot choose it

const overridden = compose(JUSTICE, { section_branch: `Miss. Code Ann. Sec. ${MUNICIPAL_SECTION}` });
const overriddenItem = identityItems(overridden).find((entry) => /brought under/i.test(entry.label ?? ""));
check((overriddenItem?.value ?? "").includes(JUSTICE_SECTION)
  && !(overriddenItem?.value ?? "").includes(MUNICIPAL_SECTION),
  "a matter arriving with the other section has it overwritten by the route, never printed");

// ----------------------------------------------- the two routes now differ

const justiceCourtOnly = digest(await renderGradeAPacketPdf(justice, { variant: "court_only" }));
const municipalCourtOnly = digest(await renderGradeAPacketPdf(municipal, { variant: "court_only" }));
check(justiceCourtOnly !== municipalCourtOnly,
  "the two routes' court-only packets no longer hash identically, because they no longer say the same thing");

// ------------------------------------------------- enumeration is the limit

let refused = null;
try { compose("MS:some-unlisted-route"); }
catch (error) { refused = error; }
check(refused instanceof GradeAPacketCompositionError,
  "a route this specification does not name is still refused");
check(/serves/.test(String(refused?.message ?? "")),
  "and the refusal names the routes it does serve");

// -------------------------------------------------- nothing on disk asks it

const raw = fs.readFileSync(path.join(rootDir, SPEC_PATH), "utf8");
check(!/brought under Miss\. Code Ann\. Sec\. *\\?"?\s*(\.{4,}|_{4,})/.test(raw),
  "no document in the specification still draws the section as a run of dots or underscores");

console.log(`\n${failures.length === 0 ? "PASS" : `FAIL — ${failures.length} failing check(s)`}`);
for (const failure of failures) console.error(` - ${failure}`);
process.exit(failures.length === 0 ? 0 : 1);
