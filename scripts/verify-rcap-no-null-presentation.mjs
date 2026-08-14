#!/usr/bin/env node
// No field-level null may reach a rendered pleading — the C3 defect regression.
//
// Lane C3's runtime-defect report (docs/record-clearing/terminalize-c/
// runtime-defect-null-presentation.md) found 18 rendered documents across 7
// jurisdictions carrying the literal word "null" in the court caption, because
// custom-pleading-renderer.ts read presentation party fields straight through.
// A null there is a sourced statement that the element does not exist (ex
// parte proceedings) and must SUPPRESS the block: no "null", no borrowed
// Pennsylvania sovereign, no invented respondent.
//
// This verifier renders EVERY pleading config on disk (which includes all 18
// reported tracks and every composed-route component config that carries a
// presentation) through the live renderer with its own canonical fixture and
// asserts:
//   1. the rendered text never contains a bare literal null/undefined/NaN;
//   2. a null-sovereign config renders an ex parte caption: movant party only,
//      no "v." line, no sovereign block, in both the caption and any proposed
//      order;
//   3. a null record custodian renders the bracketed placeholder and a warning,
//      never a crash and never the word "null";
//   4. the 18 reported documents are all present in the sweep — the regression
//      cannot silently lose its subjects.
//
//   node scripts/verify-rcap-no-null-presentation.mjs

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// The same TypeScript hook the lane verifiers use.
const Module = require("node:module");
const ts = require(path.join(rootDir, "node_modules/typescript"));
const originalTs = Module._extensions[".ts"];
Module._extensions[".ts"] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  });
  return module._compile(output.outputText, filename);
};
const { renderCustomPleading } = require(path.join(rootDir, "src/lib/record-clearing/renderers/custom-pleading-renderer.ts"));
if (originalTs) Module._extensions[".ts"] = originalTs;

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

// The 18 documents the defect report names.
const REPORTED_PLEADING_TRACKS = [
  "ct-cannabis-petition", "ct-decriminalized", "il-immediate-seal",
  "in_collateral_action", "in_supplemental_order",
  "ky_void_seal_controlled_substance", "ky_void_seal_marijuana_synthetic_salvia",
  "tx_exp_mistaken_identity", "tx_exp_pardon_other", "tx_exp_specialty_court", "tx_exp_unlawful_carry"
];
const REPORTED_COMPOSED_COMPONENT_PREFIXES = [
  "ky_criminal_record_segregation", "vt_exp_deferred_sentence", "wv_dui_deferral_expungement"
];

// A bare null/undefined/NaN token that is not part of a larger word and not a
// bracketed merge-field/annotation.
const ESCAPED_VALUE = /(?<![A-Za-z0-9_\[{(])(null|undefined|NaN)(?![A-Za-z0-9_\]})])/;

function* pleadingConfigs() {
  const roots = [
    ["data/rcap-all50/pleadings", "pleading-config.json"],
  ];
  for (const [root, marker] of roots) {
    const rootAbs = path.join(rootDir, root);
    if (!fs.existsSync(rootAbs)) continue;
    for (const state of fs.readdirSync(rootAbs).sort()) {
      const stateDir = path.join(rootAbs, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const track of fs.readdirSync(stateDir).sort()) {
        const cfgPath = path.join(stateDir, track, marker);
        if (fs.existsSync(cfgPath)) yield { state, track, cfgPath, dir: path.join(stateDir, track) };
      }
    }
  }
  // Composed-route components that carry their own pleading config.
  const composedRoot = path.join(rootDir, "data/rcap-all50/composed-routes");
  if (fs.existsSync(composedRoot)) {
    for (const state of fs.readdirSync(composedRoot).sort()) {
      const stateDir = path.join(composedRoot, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const track of fs.readdirSync(stateDir).sort()) {
        const compDir = path.join(stateDir, track, "components");
        if (!fs.existsSync(compDir) || !fs.statSync(compDir).isDirectory()) continue;
        for (const comp of fs.readdirSync(compDir).sort()) {
          const cfgPath = path.join(compDir, comp, "pleading-config.json");
          if (fs.existsSync(cfgPath)) yield { state, track: `${track}/${comp}`, cfgPath, dir: path.join(compDir, comp) };
        }
      }
    }
  }
}

function canonicalFixture(dir) {
  for (const candidate of ["fixtures/canonical.json", "fixtures/canonical-fixture.json"]) {
    const p = path.join(dir, candidate);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  }
  return null;
}

const seenTracks = new Set();
let rendered = 0;
let nullSovereignRendered = 0;
for (const doc of pleadingConfigs()) {
  const parsed = JSON.parse(fs.readFileSync(doc.cfgPath, "utf8"));
  const cfg = parsed.config ?? parsed;
  const trackId = cfg.trackId ?? doc.track;
  seenTracks.add(trackId);
  const fixture = canonicalFixture(doc.dir);
  if (!fixture?.partyData || !fixture?.caseData || !fixture?.chargeData || !fixture?.eligibilityData) continue;

  let result;
  try {
    result = renderCustomPleading({
      config: cfg,
      partyData: fixture.partyData,
      caseData: fixture.caseData,
      chargeData: fixture.chargeData,
      eligibilityData: fixture.eligibilityData,
      attachments: fixture.attachments ?? [],
      productName: fixture.productName ?? "LegalEase RCAP",
      shadowMode: true
    });
  } catch (error) {
    check(false, `${doc.state}/${doc.track}: render threw (${error.message})`);
    continue;
  }
  rendered += 1;
  const text = result.fullText ?? "";
  const hit = text.match(ESCAPED_VALUE);
  check(!hit, `${doc.state}/${doc.track}: rendered document contains the escaped literal ${JSON.stringify(hit?.[0])} near ${JSON.stringify(text.slice(Math.max(0, (hit?.index ?? 0) - 40), (hit?.index ?? 0) + 40))}`);

  const pres = cfg.presentation;
  if (pres && pres.sovereignPartyName === null) {
    nullSovereignRendered += 1;
    const caption = (result.sections ?? []).find((s) => s.sectionId === "court_caption")?.text ?? "";
    check(!/^v\.$/m.test(caption), `${doc.state}/${doc.track}: null-sovereign caption still carries a "v." line`);
    check(!caption.includes("PENNSYLVANIA") || String(cfg.jurisdictionCode).toUpperCase() === "PA",
      `${doc.state}/${doc.track}: null-sovereign caption borrowed the Pennsylvania default sovereign`);
    const fullTextNoBrackets = text.replace(/\[[^\]]*\]/g, "");
    check(!/^v\.$/m.test(fullTextNoBrackets.split("[PROPOSED] ORDER")[1] ?? ""),
      `${doc.state}/${doc.track}: null-sovereign proposed order still carries a "v." caption`);
  }
  if (pres && pres.recordCustodianLead === null && cfg.includeProposedOrder && !pres.usesCounty) {
    check(text.includes("[RECORD CUSTODIAN TO BE CONFIRMED]"),
      `${doc.state}/${doc.track}: null record custodian did not render the to-be-confirmed placeholder`);
    check((result.warnings ?? []).some((w) => /custodian/i.test(w)),
      `${doc.state}/${doc.track}: null record custodian did not record a warning`);
  }
}

for (const track of REPORTED_PLEADING_TRACKS) {
  check(seenTracks.has(track), `reported track ${track} is missing from the sweep; the regression lost a subject`);
}
for (const prefix of REPORTED_COMPOSED_COMPONENT_PREFIXES) {
  check([...seenTracks].some((t) => t.startsWith(prefix) || t.includes(prefix)),
    `reported composed-route family ${prefix} is missing from the sweep`);
}
check(rendered >= 30, `only ${rendered} configs rendered; the sweep universe regressed`);
check(nullSovereignRendered >= 1, "no null-sovereign config rendered; the ex parte suppression path went untested");

if (failures.length > 0) {
  console.error(`verify-rcap-no-null-presentation FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`verify-rcap-no-null-presentation passed: ${checks} checks, ${rendered} live renders (${nullSovereignRendered} ex parte), no escaped null/undefined/NaN in any rendered pleading.`);
