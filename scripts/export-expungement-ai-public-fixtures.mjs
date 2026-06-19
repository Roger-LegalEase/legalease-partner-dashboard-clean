import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const compiledRoot = path.join(root, "src/lib/rcap-engine/compiled");
const outDir = path.join(root, "data/expungement-ai/fixtures");
fs.mkdirSync(outDir, { recursive: true });

const all51 = JSON.parse(fs.readFileSync(path.join(compiledRoot, "all51.json"), "utf8"));
const il = JSON.parse(fs.readFileSync(path.join(compiledRoot, "IL.json"), "utf8"));

fs.writeFileSync(path.join(outDir, "public-profiles-all51.json"), `${JSON.stringify(all51, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "public-profile-IL.json"), `${JSON.stringify(il, null, 2)}\n`);

const resultCodes = [
  "packet_ready",
  "packet_ready_with_caution",
  "needs_more_info",
  "not_yet",
  "guidance_only",
  "not_covered_yet",
  "likely_not_eligible",
  "needs_review",
  "hard_stop"
];

const examples = Object.fromEntries(resultCodes.map((resultCode) => [resultCode, {
  jurisdiction: "IL",
  profileVersion: il.profileVersion,
  matterId: `fixture-${resultCode}`,
  pathwayId: resultCode.startsWith("packet_ready") ? "adult-non-conviction-expungement" : undefined,
  resultCode,
  userLabel: fixtureLabel(resultCode),
  reasons: [{ code: `il.fixture.${resultCode}`, text: "Frontend rendering fixture generated from the source-engine contract." }],
  missingQuestionIds: resultCode === "needs_more_info" ? ["case_outcome"] : [],
  cautions: resultCode === "packet_ready_with_caution" ? ["Review source-specific cautions before filing."] : [],
  nextSteps: ["Save this result.", "Review the source-driven next step."],
  paymentAllowed: resultCode === "packet_ready" || resultCode === "packet_ready_with_caution",
  packetPlan: resultCode.startsWith("packet_ready") ? {
    pathwayId: "adult-non-conviction-expungement",
    mode: "official_form_overlay_or_source_form_set",
    formMappingStatus: "source_candidate_identified",
    sourceFormIds: ["IL:fixture-source-form"],
    requiredInputIds: ["case_outcome"],
    sourceRuleRefs: ["fixture:source-engine-contract"]
  } : undefined
}]));

fs.writeFileSync(path.join(outDir, "illinois-evaluation-result-code-fixtures.json"), `${JSON.stringify(examples, null, 2)}\n`);
console.log(`Exported public fixtures to ${path.relative(root, outDir)}`);

function fixtureLabel(resultCode) {
  return resultCode.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}
