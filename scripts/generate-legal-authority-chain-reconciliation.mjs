#!/usr/bin/env node
/**
 * Two registers, both reporting nine, about different nines.
 *
 * The current legal-question register says "Legal-research tracks still open: 0
 * (9 answered by the report)". The All-51 authority reconciliation says
 * LEGAL_RECONFIRMATION_REQUIRED: 9, one legal-team assignment. Read together
 * they look like a contradiction — one register saying the work is done and the
 * other saying nine items are open.
 *
 * They are not the same nine and they are not about the same question. The
 * register's nine are legal-research tracks: does the law support this route at
 * all. The reconciliation's nine are ratification currency: the legal design is
 * adopted and the output approved, and counsel's sign-off on the route is not
 * current. A route can be in either, both or neither.
 *
 * This computes both populations and their overlap so the comparison is a fact
 * rather than an inference from two matching integers, and it names any row the
 * controlling decisions have since answered.
 *
 * `--check` fails if the file on disk differs from what this would write.
 */
import fs from "node:fs";

const OUT = "data/rcap-ledger/legal-authority-chain-reconciliation.json";
const questions = JSON.parse(fs.readFileSync("data/record-clearing/all51-current-legal-questions.json", "utf8"));
const reconciliation = JSON.parse(fs.readFileSync("data/rcap-ledger/all51-legal-authority-reconciliation.json", "utf8"));
const decisions = JSON.parse(fs.readFileSync("data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json", "utf8"));

const researchTracks = questions.trueLegalResearchTracks.map((track) => track.trackId ?? track.id);
const reconfirmationRows = reconciliation.rows
  .filter((row) => row.classification === "LEGAL_RECONFIRMATION_REQUIRED")
  .map((row) => ({ pathwayKey: row.pathwayKey, trackId: row.trackId ?? null }));

// The decisions name their routes under `pathways`, and each entry is a bare
// pathway id qualified by the decision's own jurisdiction. Reading `pathwayKeys`
// — a field that does not exist here — produced an empty set and a confident
// "0 answered since", which is the shape of every wrong answer in this
// workstream: a true statement about the wrong field.
const decisionRouteKeys = new Set(
  (decisions.decisions ?? []).flatMap((decision) => (decision.pathways ?? [])
    .map((pathway) => (pathway.includes(":") ? pathway : `${decision.jurisdiction}:${pathway}`)))
);

const researchTrackSet = new Set(researchTracks);
const overlap = reconfirmationRows.filter((row) => row.trackId && researchTrackSet.has(row.trackId));
const answeredSince = reconfirmationRows.filter((row) => decisionRouteKeys.has(row.pathwayKey));

const doc = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-legal-authority-chain-reconciliation.mjs",
  createsApproval: false,
  question: "The legal-question register reports zero open legal-research tracks. The All-51 authority reconciliation reports nine LEGAL_RECONFIRMATION_REQUIRED rows and one legal-team assignment. Which is current?",
  answer: "Both. They count different populations and neither says so, which is what makes the two nines look like one claim contradicting itself.",
  populations: {
    legalResearchTracks: {
      question: "Does the law support this route at all?",
      openNow: 0,
      answeredByTheReport: researchTracks.length,
      trackIds: researchTracks,
      register: "data/record-clearing/all51-current-legal-questions.json"
    },
    ratificationCurrency: {
      question: "The legal design is adopted and the completed output approved. Is counsel's ratification of this route current?",
      open: reconfirmationRows.length,
      pathwayKeys: reconfirmationRows.map((row) => row.pathwayKey),
      register: "data/rcap-ledger/all51-legal-authority-reconciliation.json"
    }
  },
  disjoint: overlap.length === 0,
  overlap: overlap.map((row) => row.pathwayKey),
  answeredByControllingDecisionsSince: answeredSince.map((row) => row.pathwayKey),
  finding: answeredSince.length === 0
    ? "No ratification row has been answered by the 2026-08-28 controlling decisions."
    : `${answeredSince.length} ratification row(s) name a route the 2026-08-28 controlling decisions answered. The legal question is settled for them and the recorded blocker is stale. Clearing it opens nothing on its own: each still carries its own operational gates.`,
  doesNotAuthorize: [
    "clearing a blocker",
    "promoting a route",
    "any change to a legal conclusion"
  ]
};
const serialized = `${JSON.stringify(doc, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== serialized) {
    console.error(`${OUT} is stale; regenerate with node scripts/generate-legal-authority-chain-reconciliation.mjs`);
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, serialized);
}
console.log(`Legal authority chain: ${researchTracks.length} research tracks (0 open), ${reconfirmationRows.length} ratification rows, overlap ${overlap.length}, answered since ${answeredSince.length}.`);
