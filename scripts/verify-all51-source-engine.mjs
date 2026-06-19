import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const failures = [];
const compiledRoot = path.join(root, "src/lib/rcap-engine/compiled");
const profilesRoot = path.join(compiledRoot, "profiles");
const resultCodes = new Set([
  "packet_ready",
  "packet_ready_with_caution",
  "needs_more_info",
  "not_yet",
  "guidance_only",
  "not_covered_yet",
  "likely_not_eligible",
  "needs_review",
  "hard_stop"
]);

const profileFiles = fs.existsSync(profilesRoot)
  ? fs.readdirSync(profilesRoot).filter((file) => file.endsWith(".json")).sort()
  : [];
const profiles = profileFiles.map((file) => readJson(path.join(profilesRoot, file)));
const packetSummary = readJson(path.join(compiledRoot, "packet-build-summary.json"));
const finalValidation = readJson(path.join(compiledRoot, "all51-final-validation.json"));
const designerAll51 = readJson(path.join(compiledRoot, "all51.json"));
const designerIllinois = readJson(path.join(compiledRoot, "IL.json"));

assert(profileFiles.length === 51, `Expected 51 compiled profiles, found ${profileFiles.length}.`);
assert(packetSummary.jurisdictions === 51, "Packet summary must report 51 jurisdictions.");
assert(finalValidation.passed === true, "Source packet final validation must be passed.");
assert(finalValidation.metrics?.profiles === 51, "Final validation must cover 51 profiles.");

const codes = new Set();
const slugs = new Set();
const versions = new Set();
let pathways = 0;
let orderedRules = 0;
let waitingRules = 0;
let exclusionRules = 0;
let sourceFiles = 0;
let executableRows = 0;
let reviewGatedRows = 0;
const packetModes = new Map();

for (const profile of profiles) {
  const code = profile.jurisdiction?.code;
  const slug = profile.jurisdiction?.slug;
  const versionKey = `${code}:${profile.profileVersion}`;
  assert(typeof code === "string" && code.length === 2, `Invalid jurisdiction code: ${code}`);
  assert(!codes.has(code), `Duplicate jurisdiction code: ${code}`);
  assert(!slugs.has(slug), `Duplicate jurisdiction slug: ${slug}`);
  assert(!versions.has(versionKey), `Duplicate profile version key: ${versionKey}`);
  codes.add(code);
  slugs.add(slug);
  versions.add(versionKey);

  for (const key of ["schemaVersion", "profileVersion", "jurisdiction", "source", "terminology", "flowStages", "questions", "pathways", "orderedDecisionRules", "packetGenerator", "copyGuardrails", "qa"]) {
    assert(profile[key] !== undefined, `${code} profile missing ${key}.`);
  }

  const questionIds = new Set();
  for (const question of profile.questions ?? []) {
    assert(!questionIds.has(question.id), `${code} duplicate public question id: ${question.id}`);
    questionIds.add(question.id);
  }

  const publicProjection = projectPublic(profile);
  const projectionText = JSON.stringify(publicProjection);
  for (const forbidden of ["orderedDecisionRules", "exclusionRules", "waitingPeriodRules", "packetGenerator", "sourceSections", "sourceCorpusSha256"]) {
    assert(!projectionText.includes(forbidden), `${code} public projection leaks ${forbidden}.`);
  }

  const designer = designerAll51[code];
  assert(Boolean(designer), `${code} missing from designer all51 fixture.`);
  if (designer) {
    assert(JSON.stringify(publicProjection.questions.map((q) => q.id)) === JSON.stringify(designer.questions.map((q) => q.id)), `${code} question ordering differs from designer all51 fixture.`);
    assert(JSON.stringify(publicProjection.flowStages.map((s) => s.id)) === JSON.stringify(designer.flowStages.map((s) => s.id)), `${code} flow-stage ordering differs from designer all51 fixture.`);
  }

  pathways += profile.pathways?.length ?? 0;
  orderedRules += profile.orderedDecisionRules?.length ?? 0;
  waitingRules += profile.waitingPeriodRules?.length ?? 0;
  exclusionRules += profile.exclusionRules?.length ?? 0;
  sourceFiles += (profile.source?.allFolderFiles?.length ?? 0);

  assert(profile.packetGenerator?.legacyGeneratorAllowed === false, `${code} must disallow legacy generator routing.`);
  assert(profile.packetGenerator?.genericLegalFallbackAllowed === false, `${code} must disallow generic legal fallback.`);
  assert((profile.packetGenerator?.pathways ?? []).length === (profile.pathways ?? []).length, `${code} must have one packet plan per pathway.`);

  for (const rule of profile.orderedDecisionRules ?? []) {
    if (rule.when?.fieldsReferenced?.length > 0 && resultCodes.has(rule.then?.suggestedResultCode)) executableRows += 1;
    else reviewGatedRows += 1;
  }

  for (const plan of profile.packetGenerator?.pathways ?? []) {
    packetModes.set(plan.mode, (packetModes.get(plan.mode) ?? 0) + 1);
    assert((profile.pathways ?? []).some((pathway) => pathway.id === plan.pathwayId), `${code} packet plan references unknown pathway ${plan.pathwayId}.`);
    assert(["official_form_overlay_or_source_form_set", "state_specific_custom_packet_from_source_rules", "automatic_relief_verification_and_guidance"].includes(plan.mode), `${code} invalid packet mode ${plan.mode}.`);
  }
}

assert(codes.size === 51, `Expected 51 unique jurisdiction codes, found ${codes.size}.`);
assert(pathways === packetSummary.pathways, `Pathway count mismatch: ${pathways} vs ${packetSummary.pathways}.`);
assert(orderedRules === packetSummary.orderedRules, `Ordered-rule count mismatch: ${orderedRules} vs ${packetSummary.orderedRules}.`);
assert(waitingRules === packetSummary.waitingRules, `Waiting-rule count mismatch: ${waitingRules} vs ${packetSummary.waitingRules}.`);
assert(exclusionRules === packetSummary.exclusionRules, `Exclusion-rule count mismatch: ${exclusionRules} vs ${packetSummary.exclusionRules}.`);

const ilProjection = projectPublic(profiles.find((profile) => profile.jurisdiction.code === "IL"));
assert(JSON.stringify(ilProjection.questions.map((q) => q.id)) === JSON.stringify(designerIllinois.questions.map((q) => q.id)), "Illinois projection question ordering differs from IL designer fixture.");

const runtimeFiles = listFiles(path.join(root, "src"))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !file.includes("/rcap-engine/compiled/"));
const runtimeSource = runtimeFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const forbidden of [
  "@/lib/rcap/documents/mississippi",
  "@/lib/rcap/documents/illinois",
  "@/lib/rcap/documents/dc",
  "@/lib/rcap/documents/pennsylvania",
  "@/lib/rcap/documents/texas-harris",
  "legacyGeneratorFor",
  "renderLegacyGeneratorPacket",
  "renderAll51FallbackPacket",
  "legacyLivePreservedStates"
]) {
  assert(!runtimeSource.includes(forbidden), `Active runtime still references ${forbidden}.`);
}

const activeSelectorImports = runtimeFiles
  .map((file) => [file, fs.readFileSync(file, "utf8")])
  .filter(([, source]) => source.includes("@/lib/rcap/all51-launch-selector"));
assert(activeSelectorImports.length === 0, `Active runtime imports old all51 launch selector: ${activeSelectorImports.map(([file]) => path.relative(root, file)).join(", ")}.`);

const report = {
  generatedAt: new Date().toISOString(),
  jurisdictions: codes.size,
  pathways,
  orderedRules,
  executableRows,
  reviewGatedRows,
  waitingRules,
  exclusionRules,
  sourceFiles,
  packetModes: Object.fromEntries(packetModes),
  profileSetSha256: crypto.createHash("sha256").update(JSON.stringify(profiles.map((profile) => ({
    code: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    questions: profile.questions.length,
    pathways: profile.pathways.length,
    rules: profile.orderedDecisionRules.length
  })))).digest("hex")
};
fs.mkdirSync(path.join(root, "data/expungement-ai/reports"), { recursive: true });
fs.writeFileSync(path.join(root, "data/expungement-ai/reports/all51-source-engine-coverage.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error("RCAP all-51 source-engine verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-51 source-engine verification passed.");
console.log(`Jurisdictions: ${codes.size}`);
console.log(`Pathways: ${pathways}`);
console.log(`Ordered rules: ${orderedRules}`);
console.log(`Executable/review-gated rows: ${executableRows}/${reviewGatedRows}`);
console.log(`Waiting/exclusion rules: ${waitingRules}/${exclusionRules}`);
console.log(`Packet modes: ${JSON.stringify(Object.fromEntries(packetModes))}`);
console.log("Legacy generator and generic fallback active runtime references: none");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function projectPublic(profile) {
  if (!profile) return {};
  const designer = designerAll51[profile.jurisdiction.code];
  if (designer) {
    return {
      schemaVersion: profile.schemaVersion,
      profileVersion: profile.profileVersion,
      jurisdiction: designer.jurisdiction,
      terminology: {
        primaryConsumerTerm: designer.terminology.primaryConsumerTerm,
        allowedStateTerms: designer.terminology.allowedStateTerms,
        avoidUniversalExpungementLabel: profile.terminology.avoidUniversalExpungementLabel
      },
      flowStages: designer.flowStages.map((stage) => ({
        order: stage.order,
        id: stage.id,
        questionIds: stage.questionIds ?? designer.questions.filter((question) => question.stage === stage.id).map((question) => question.id),
        screenType: stage.screenType
      })),
      questions: designer.questions.map((question) => ({
        ...question,
        contextOnly: question.contextOnly === true,
        doesNotSelectPathway: question.contextOnly === true || question.doesNotSelectPathway === true
      })),
      caseOutcomeOptions: designer.caseOutcomeOptions,
      copyGuardrails: profile.copyGuardrails
    };
  }
  const questionIds = new Set(profile.questions.map((question) => question.id));
  return {
    schemaVersion: profile.schemaVersion,
    profileVersion: profile.profileVersion,
    jurisdiction: profile.jurisdiction,
    terminology: {
      primaryConsumerTerm: profile.terminology.primaryConsumerTerm,
      allowedStateTerms: profile.terminology.allowedStateTerms,
      avoidUniversalExpungementLabel: profile.terminology.avoidUniversalExpungementLabel
    },
    flowStages: profile.flowStages.map((stage) => ({
      order: stage.order,
      id: stage.id,
      questionIds: stage.questionIds?.filter((id) => questionIds.has(id)) ?? profile.questions.filter((question) => question.stage === stage.id).map((question) => question.id),
      screenType: stage.screenType
    })),
    questions: profile.questions.map((question) => ({
      id: question.id,
      stage: question.stage,
      prompt: question.prompt,
      type: question.type,
      required: question.required,
      contextOnly: question.contextOnly === true,
      doesNotSelectPathway: question.contextOnly === true || question.doesNotSelectPathway === true,
      options: question.options ?? null
    })),
    caseOutcomeOptions: profile.caseOutcomeOptions,
    copyGuardrails: profile.copyGuardrails
  };
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}
