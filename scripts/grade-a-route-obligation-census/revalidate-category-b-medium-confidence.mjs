#!/usr/bin/env node
// The 55 medium-confidence exclusions, checked against their own evidence.
//
//   node scripts/grade-a-route-obligation-census/revalidate-category-b-medium-confidence.mjs
//   node scripts/grade-a-route-obligation-census/revalidate-category-b-medium-confidence.mjs --check
//
// A Category B exclusion says the platform owes a participant nothing on this
// route. Getting that wrong is the most expensive error in the census, because
// nothing downstream ever revisits it: the obligation simply leaves the
// denominator.
//
// 55 of the 157 were classified with medium confidence. This does not re-decide
// them -- whether relief really is automatic under a statute is counsel's -- but
// it does check each against the evidence the census itself recorded, and
// surfaces the ones whose own record argues against the exclusion. Those go to
// counsel with the contradiction attached, which is a far better question than
// "please confirm this exclusion".
//
// What each check looks for:
//
//   AUTOMATIC          a route that is automatic should have no participant
//                      instrument to file and no petition destination. A
//                      "no filing" instrument is consistent; anything a
//                      participant fills in is not.
//   AGENCY_CONTROLLED  the actor should be an agency, not a court.
//   COURT_INITIATED    the actor should be a court, and the participant should
//                      not be the one who starts it.
//   any                a route the compiled runtime does not represent at all
//                      cannot have been observed behaving automatically, so the
//                      exclusion rests on the statute alone and is flagged.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const CANDIDATE = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const OUT = "data/rcap-grade-a/route-obligation-census-v1/category-b-medium-confidence-revalidation.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const candidate = readJson(CANDIDATE);

const NO_FILING = /no filing|process guidance|guidance only|nothing to file/i;

const rows = candidate.routes
  .filter((r) => r.possibleCategory === "B_LEGITIMATE_EXCLUSION" && r.classificationConfidence !== "high")
  .map((route) => {
    const contradictions = [];
    const instrument = String(route.participantFacingInstrument ?? "");
    const actor = route.processActor;
    const destinationKind = route.destination?.kind ?? null;

    if (route.participantCanInitiate === true) {
      contradictions.push("the census records that a participant can initiate this route, which is not an exclusion at all");
    }
    if (route.possibleCategoryBReason === "AUTOMATIC") {
      if (instrument && !NO_FILING.test(instrument)) {
        contradictions.push(`relief is called automatic but the route carries a participant-facing instrument: ${JSON.stringify(instrument)}`);
      }
      if (destinationKind && destinationKind !== "automatic") {
        contradictions.push(`relief is called automatic but the destination is ${JSON.stringify(destinationKind)}`);
      }
    }
    if (route.possibleCategoryBReason === "AGENCY_CONTROLLED" && actor !== "agency") {
      contradictions.push(`the exclusion is agency-controlled but the process actor is ${JSON.stringify(actor)}`);
    }
    if (route.possibleCategoryBReason === "COURT_INITIATED" && actor !== "court") {
      contradictions.push(`the exclusion is court-initiated but the process actor is ${JSON.stringify(actor)}`);
    }

    const observations = [];
    if (route.currentServiceDisposition === "missing_from_compiled_runtime") {
      observations.push("the compiled runtime does not represent this route, so nothing has been observed behaving automatically; the exclusion rests on the statute alone");
    }

    return {
      routeKey: route.routeKey,
      jurisdiction: route.jurisdiction,
      publicLabel: route.publicLabel,
      reason: route.possibleCategoryBReason,
      processActor: actor,
      participantCanInitiate: route.participantCanInitiate === true,
      participantFacingInstrument: route.participantFacingInstrument ?? null,
      destinationKind,
      currentServiceDisposition: route.currentServiceDisposition ?? null,
      contradictions,
      observations,
      // Consistent with its own evidence, and still not confirmed: the statute
      // is the thing that decides, and this has not read one.
      evidenceConsistent: contradictions.length === 0,
      outcome: contradictions.length > 0
        ? "SEND_TO_COUNSEL_WITH_CONTRADICTION"
        : observations.length > 0
          ? "SEND_TO_COUNSEL_STATUTE_ONLY"
          : "EVIDENCE_CONSISTENT_CONFIRM_WITH_COUNSEL"
    };
  });
rows.sort((a, b) => `${a.jurisdiction}|${a.routeKey}`.localeCompare(`${b.jurisdiction}|${b.routeKey}`));

const outcomes = rows.reduce((acc, r) => { acc[r.outcome] = (acc[r.outcome] ?? 0) + 1; return acc; }, {});
const doc = {
  schemaVersion: "rcap-census-v1-category-b-revalidation/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/revalidate-category-b-medium-confidence.mjs",
  scope: "The 55 Category B exclusions the census classified with medium confidence.",
  whatThisIsNot:
    "This does not re-decide any exclusion. Whether relief really is automatic under a statute is counsel's answer, and this has read no statute. It checks each exclusion against the evidence the census itself recorded, so a question to counsel can carry a contradiction rather than ask for a blanket confirmation.",
  total: rows.length,
  outcomes,
  withContradictions: rows.filter((r) => r.contradictions.length > 0).length,
  evidenceConsistent: rows.filter((r) => r.evidenceConsistent).length,
  notRepresentedInCompiledRuntime: rows.filter((r) => r.observations.length > 0).length,
  noneConfirmedHere: true,
  rows
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) { console.error(`${OUT} is stale.`); process.exit(1); }
  console.log(`category-B revalidation current: ${rows.length} exclusion(s).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
console.log(`  ${rows.length} medium-confidence exclusion(s)`);
for (const [k, v] of Object.entries(outcomes).sort()) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log(`\n  ${doc.withContradictions} contradict their own recorded evidence.`);
console.log("  None is confirmed here; every one still needs counsel.");
