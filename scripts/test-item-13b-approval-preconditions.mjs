#!/usr/bin/env node
/**
 * The five things that had to be true before the worker could be published.
 *
 * On 2026-09-20 the owner approved the composed bytes for six routes and
 * authorized one worker publication, and named five conditions to confirm
 * before it. They are recorded here as a control rather than as a paragraph in
 * a report, because a condition confirmed once in a terminal is a memory and a
 * condition confirmed by a script is a fact that stays checkable.
 *
 * Four of them are about what the approval MUST have changed. The fourth is
 * about what it must NOT have: that the move record explaining why the
 * Mississippi bytes drifted cannot stand in for the decision. That one is the
 * reason this file exists after the gate rather than only before it -- the
 * others become uninteresting once they pass, and that one gets more important
 * the longer the move record sits on disk being readable.
 *
 * The fifth is the one that could quietly rot: "every remaining hold is
 * genuinely provider/publication". It is written as a whitelist of the two
 * reasons that are allowed to remain, so a new hold arriving from anywhere
 * fails it instead of being absorbed.
 *
 *   node scripts/test-item-13b-approval-preconditions.mjs
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { loadMsPaidConsumerSuccessor } = await import("../src/lib/rcap/fulfillment/paid-consumer-successor.ts");
const { msNonconvictionArtifactMove, MS_NONCONVICTION_ARTIFACT_MOVE_PATH } =
  await import("./lib/ms-nonconviction-artifact-move.mjs");

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const projection = json("data/rcap-grade-a/fulfillment-authority-projection.json");
const registry = json("data/rcap-grade-a/fulfillment-authority-registry.json");
const ITEM13B = ["DC:dc_actual_innocence_expungement_16_803", "IL:felony-prostitution-relief",
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
  "WY:felony-conviction-expungement-w-s-7-13-1502"];
const MSNC = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const route = (id) => projection.routes.find((r) => r.routeId === id);
const record = (id) => registry.records.find((r) => r.routeId === id && !r.supersededBy);

let bad = 0;
const say = (ok, label, detail) => { console.log(`${ok ? "CONFIRMED" : "FAILED   "}  ${label}${detail ? `\n             ${detail}` : ""}`); if (!ok) bad++; };

// 1
const GAP = /filing-format artifact is an adopted artifact/;
const stillHeld = ITEM13B.filter((id) => (route(id).missingProof ?? []).some((g) => GAP.test(g)));
say(stillHeld.length === 0,
  "1. the five Item 13B routes no longer carry the current-commercial-artifact missing-proof",
  ITEM13B.map((id) => `${id.split(":")[0]} ${route(id).state} missingProof=${JSON.stringify(route(id).missingProof)}`).join("\n             "));

// 2
const msGaps = route(MSNC).missingProof ?? [];
say(!msGaps.some((g) => g.startsWith("owner_decision:")) && !record(MSNC).ownerDecisionPendingOnComposedArtifact,
  "2. the MS non-conviction owner_decision mismatch is gone",
  `missingProof=${JSON.stringify(msGaps)}; binding=${record(MSNC).evidenceBindings?.paidConsumerSuccessor?.decisionId}`);

// 3
const V2 = "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json";
const V1 = "data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json";
const { execFileSync } = await import("node:child_process");
// The commit the approval is bound to. Custody is measured against THAT tree,
// not against whatever HEAD happens to be, or the check weakens every commit.
const headSha = (p) => crypto.createHash("sha256")
  .update(execFileSync("git", ["show", `ed7356a733b5f47976e012c9ba386f0a021057ca:${p}`], { maxBuffer: 1 << 28 })).digest("hex");
say(sha(V2) === headSha(V2) && sha(V1) === headSha(V1),
  "3. the old MS approvals still exist, byte-for-byte unchanged since ed7356a73",
  `v2 ${sha(V2).slice(0, 16)} (head ${headSha(V2).slice(0, 16)}); v1 ${sha(V1).slice(0, 16)} (head ${headSha(V1).slice(0, 16)})`);

// 4
const V3 = "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json";
const moveAgainstCurrent = msNonconvictionArtifactMove(process.cwd(), json(V3));
const moveAgainstOld = msNonconvictionArtifactMove(process.cwd(), json(V2));
say(moveAgainstCurrent === null && Boolean(moveAgainstOld) && json(MS_NONCONVICTION_ARTIFACT_MOVE_PATH).createsApproval === false,
  "4. no explained-move path can substitute for the new owner decision",
  `the move record cannot account for v3 (refused), only for the superseded v2; and it still declares createsApproval=false`);

// 5
const remaining = new Map();
for (const id of [...ITEM13B, MSNC]) {
  const r = route(id);
  for (const g of r.missingProof ?? []) remaining.set(`${id} missing ${g.split(":")[0]}`, g);
  for (const s of r.stalenessReasons ?? []) remaining.set(`${id} stale ${s.split(":")[0]}`, s);
}
const kinds = new Set([...remaining.keys()].map((k) => k.split(" ").slice(1).join(" ")));
const onlyPublication = [...kinds].every((k) => k === "missing provider" || k === "stale observation");
say(onlyPublication,
  "5. every remaining hold is provider/publication",
  [...remaining.entries()].map(([k, v]) => `${k}: ${v.slice(0, 90)}`).join("\n             "));

console.log(`\n${bad === 0 ? "ALL FIVE CONFIRMED" : `${bad} NOT CONFIRMED`}`);
process.exit(bad === 0 ? 0 : 1);
