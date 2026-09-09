#!/usr/bin/env node
// FIX05 control for hi_nonconviction_expungement-set.
//
// It fails on the pre-repair bytes and passes on the repaired bytes. It reads
// the controlling record (the track registry) and the delivered family
// directory, and asserts that every line the three failed obligations are about
// is actually on the delivered paper:
//
//   SELF_HELP_STOP        every selfHelpStopConditions string, verbatim
//   REQUIRED_BEFORE_FILING every packetSet.requiredBeforeFiling string, verbatim
//   FEE_AND_WAIVER        the apply_fee_waiver line and its condition, verbatim
//
// It never edits anything and it sets no verdict.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../..");
const REGISTRY_REL = "data/record-clearing/legal-design-track-registry.json";
const FAMILY_REL = "data/rcap-all50/overlays/census-v1/hi/hi-nonconviction-expungement-set--official-pdf-fill";
const TRACK_ID = "hi_nonconviction_expungement";

const registryPath = path.join(ROOT, REGISTRY_REL);
const registryBytes = fs.readFileSync(registryPath);
const registry = JSON.parse(registryBytes.toString("utf8"));
const track = (registry.tracks ?? []).find((t) => t.trackId === TRACK_ID);
if (!track) {
  console.error(`CONTROL_INCONCLUSIVE ${REGISTRY_REL} no longer declares track ${TRACK_ID}`);
  process.exit(2);
}

const familyDir = path.join(ROOT, FAMILY_REL);
const guideFiles = fs
  .readdirSync(familyDir)
  .filter((f) => f.endsWith(".md"))
  .sort();
const corpus = guideFiles.map((f) => fs.readFileSync(path.join(familyDir, f), "utf8")).join("\n");

const stopConditions = track.selfHelpStopConditions ?? [];
const requiredBeforeFiling = track.packetSet?.requiredBeforeFiling ?? [];
const feeWaiver = (track.packetSet?.participantActionRequired ?? []).find((a) => a.kind === "apply_fee_waiver");

const failures = [];
const checks = [];

const expect = (obligation, what, text) => {
  const present = typeof text === "string" && text.trim().length > 0 && corpus.includes(text);
  checks.push({ obligation, what, present });
  if (!present) failures.push(`${obligation}: ${what} is not carried verbatim in the delivered guides — ${JSON.stringify(text)}`);
};

if (stopConditions.length === 0) failures.push("SELF_HELP_STOP: the record declares an EMPTY selfHelpStopConditions; a control cannot pass on an empty owed delivery");
stopConditions.forEach((c, i) => expect("SELF_HELP_STOP", `selfHelpStopConditions[${i}]`, c));

if (requiredBeforeFiling.length === 0) failures.push("REQUIRED_BEFORE_FILING: the record declares an EMPTY packetSet.requiredBeforeFiling");
requiredBeforeFiling.forEach((c, i) => expect("REQUIRED_BEFORE_FILING", `packetSet.requiredBeforeFiling[${i}]`, c));

if (!feeWaiver) failures.push("FEE_AND_WAIVER: the record no longer carries an apply_fee_waiver item");
if (feeWaiver) {
  expect("FEE_AND_WAIVER", "participantActionRequired[apply_fee_waiver].description", feeWaiver.description);
  expect("FEE_AND_WAIVER", "participantActionRequired[apply_fee_waiver].conditionDescription", feeWaiver.conditionDescription);
  const waiverWordPresent = /waiver/i.test(corpus);
  checks.push({ obligation: "FEE_AND_WAIVER", what: "the word 'waiver' appears somewhere in the guides", present: waiverWordPresent });
  if (!waiverWordPresent) failures.push("FEE_AND_WAIVER: the word 'waiver' appears nowhere in the delivered guides");
}

const report = {
  control: "fix05-hi-guide-carries-record",
  familyId: "hi_nonconviction_expungement-set",
  obligations: ["SELF_HELP_STOP", "FEE_AND_WAIVER", "REQUIRED_BEFORE_FILING"],
  recordBoundByDigest: `${REGISTRY_REL}@${crypto.createHash("sha256").update(registryBytes).digest("hex")}`,
  guidesRead: guideFiles.map((f) => ({
    path: `${FAMILY_REL}/${f}`,
    sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(familyDir, f))).digest("hex")
  })),
  checksRun: checks.length,
  checksPresent: checks.filter((c) => c.present).length,
  checksAbsent: checks.filter((c) => !c.present).length,
  failures
};
console.log(JSON.stringify(report, null, 2));
console.log(failures.length === 0 ? "CONTROL_PASS" : "CONTROL_FAIL");
process.exit(failures.length === 0 ? 0 : 1);
