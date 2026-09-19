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
//   3. a config that cannot state its court, its venue, or a custodian its
//      proposed order directs REFUSES to render, naming why. It does not
//      inherit another jurisdiction's, and it does not print a bracketed
//      placeholder a participant could file;
//   4. no non-PA document carries the word "Pennsylvania";
//   5. the 18 reported documents are all present in the sweep — the regression
//      cannot silently lose its subjects.
//
// Assertion 3 replaces an earlier one requiring a null custodian to render
// "[RECORD CUSTODIAN TO BE CONFIRMED]". That assertion was guarded by
// `!pres.usesCounty`, which excluded every config the Pennsylvania default was
// corrupting, so it never fired on them. A proposed order naming a custodian it
// cannot identify is not releasable, so the contract is refusal, not a blank.
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

/**
 * The caption tokens a config may declare, and the matter field each is filled
 * from. Mirrors CAPTION_VALUE_TOKENS / CAPTION_LINE_TOKENS in the renderer.
 */
const VALUE_TOKEN_FIELD = {
  "{county}": "countyName",
  "{court}": "court",
  "{courtLevel}": "courtLevel",
  "{judicialDistrictOrGaLocation}": "judicialDistrictOrGaLocation",
  "{caseNumber}": "caseNumber"
};
const LINE_TOKEN_FIELD = { "{caseNumberLine}": "caseNumber", "{docketLine}": "docketNumber" };

function tokenTexts(cfg) {
  const pres = cfg.presentation ?? {};
  return [cfg.courtCaption, pres.courtName, pres.venueDescriptor, pres.recordCustodianLead, pres.divisionLine]
    .filter((text) => typeof text === "string" && text.length > 0);
}

function declaredTokens(cfg) {
  return [...new Set(tokenTexts(cfg).flatMap((text) => text.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) ?? []))];
}

/**
 * The canonical fixtures are blank-matter fixtures: several carry `court: ""`
 * and `countyName: ""` because no source fixes those and only the participant
 * can. Under the token contract such a matter now refuses, which is correct and
 * which would have silently emptied this sweep. So the render assertions run on
 * a matter that HAS answered — the acceptance values below — and the refusal
 * itself is asserted separately, per token, by blanking one field at a time.
 */
function answeredCaseData(caseData, cfg) {
  const answered = { ...caseData };
  for (const token of declaredTokens(cfg)) {
    const field = VALUE_TOKEN_FIELD[token] ?? LINE_TOKEN_FIELD[token];
    if (!field) continue;
    if (!String(answered[field] ?? "").trim()) {
      answered[field] = field === "countyName" ? "EXAMPLE"
        : field === "caseNumber" ? "CR-2020-000123"
          : field === "docketNumber" ? "CR-2020-000123"
            : field === "courtLevel" ? "DISTRICT"
              : "ACCEPTANCE COURT";
    }
  }
  return answered;
}

const seenTracks = new Set();
let tokenRefusalsProven = 0;
let rendered = 0;
let refused = 0;
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
      caseData: answeredCaseData(fixture.caseData, cfg),
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
  // A config that cannot state its court, venue or a directed custodian refuses.
  // Refusal is the correct outcome, so it is asserted as such and is not counted
  // as a render: a component that produced nothing must never look like one that
  // produced a document.
  const pres0 = cfg.presentation;
  const custodianDirected = (pres0?.proposedOrderCustodianDirection ?? "required") === "required";
  const unknownToken = declaredTokens(cfg)
    .find((token) => !(token in VALUE_TOKEN_FIELD) && !(token in LINE_TOKEN_FIELD));
  const mustRefuse = Boolean(unknownToken)
    || !pres0
    || !String(pres0.courtName ?? "").trim()
    || !String(pres0.venueDescriptor ?? "").trim()
    || (cfg.includeProposedOrder && custodianDirected && !String(pres0.recordCustodianLead ?? "").trim())
    || (cfg.includeProposedOrder && !custodianDirected && !(pres0.proposedOrderClauses?.length > 0));
  if (!result.rendered) {
    refused += 1;
    check(mustRefuse, `${doc.state}/${doc.track}: refused to render but states a complete presentation`);
    check((result.errors ?? []).length > 0, `${doc.state}/${doc.track}: refused without naming why`);
    check((result.fullText ?? "") === "", `${doc.state}/${doc.track}: refused but still produced document text`);
    continue;
  }
  check(!mustRefuse, `${doc.state}/${doc.track}: rendered a document although its presentation is incomplete`);
  rendered += 1;
  const text = result.fullText ?? "";

  // The defect this file exists for, stated directly: no jurisdiction may
  // inherit another's court, venue or record custodian. `usesCounty` used to
  // select hard-coded Pennsylvania sentences, so every non-PA config with a
  // county caption carried them.
  //
  // The marker is the word "Pennsylvania" itself, which reaches a non-PA
  // document only by inheritance. It is deliberately not "Court of Common
  // Pleas": Connecticut's own sourced venue text names that court, because
  // Connecticut abolished it in 1978 and its venue statute still reaches
  // convictions entered there. A court name another state genuinely cites is
  // not contamination.
  if (String(cfg.jurisdictionCode).toUpperCase() !== "PA") {
    const pa = text.match(/Pennsylvania/i);
    check(!pa, `${doc.state}/${doc.track}: rendered document carries Pennsylvania language near `
      + JSON.stringify(text.slice(Math.max(0, (pa?.index ?? 0) - 60), (pa?.index ?? 0) + 60)));
  }
  check(!text.includes("[RECORD CUSTODIAN TO BE CONFIRMED]"),
    `${doc.state}/${doc.track}: a proposed order carries a placeholder custodian; an unresolved custodian must refuse instead`);
  const hit = text.match(ESCAPED_VALUE);
  check(!hit, `${doc.state}/${doc.track}: rendered document contains the escaped literal ${JSON.stringify(hit?.[0])} near ${JSON.stringify(text.slice(Math.max(0, (hit?.index ?? 0) - 40), (hit?.index ?? 0) + 40))}`);

  // No rendered document may still carry a caption token. This is the defect
  // itself: eleven documents printed {county}, {court}, {courtLevel},
  // {caseNumber} and {judicialDistrictOrGaLocation} into captions and
  // jurisdiction sentences, because the renderer substituted {county} into
  // three presentation fields and nothing into config.courtCaption at all.
  const leftover = text.match(/\{[A-Za-z][A-Za-z0-9_]*\}/);
  check(!leftover, `${doc.state}/${doc.track}: rendered document still prints the token ${leftover?.[0]}`
    + ` near ${JSON.stringify(text.slice(Math.max(0, (leftover?.index ?? 0) - 50), (leftover?.index ?? 0) + 50))}`);

  // And the other half of the contract: a matter that has NOT answered a fact
  // its caption names refuses, rather than printing a blank a participant could
  // file. Proven one field at a time, on this config's own declared tokens.
  for (const token of declaredTokens(cfg)) {
    const field = VALUE_TOKEN_FIELD[token];
    if (!field) continue;
    const blanked = { ...answeredCaseData(fixture.caseData, cfg), [field]: "" };
    let refusedOnToken;
    try {
      refusedOnToken = renderCustomPleading({
        config: cfg,
        partyData: fixture.partyData,
        caseData: blanked,
        chargeData: fixture.chargeData,
        eligibilityData: fixture.eligibilityData,
        attachments: fixture.attachments ?? [],
        productName: fixture.productName ?? "LegalEase RCAP",
        shadowMode: true
      });
    } catch (error) {
      check(false, `${doc.state}/${doc.track}: blanking ${field} threw instead of refusing (${error.message})`);
      continue;
    }
    tokenRefusalsProven += 1;
    check(refusedOnToken.rendered === false,
      `${doc.state}/${doc.track}: rendered a document although the matter does not supply ${field} for ${token}`);
    check((refusedOnToken.errors ?? []).some((message) => message.includes(token)),
      `${doc.state}/${doc.track}: refused for a missing ${field} without naming ${token}`);
    check((refusedOnToken.fullText ?? "") === "",
      `${doc.state}/${doc.track}: refused for a missing ${field} but still produced document text`);
  }

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
}

for (const track of REPORTED_PLEADING_TRACKS) {
  check(seenTracks.has(track), `reported track ${track} is missing from the sweep; the regression lost a subject`);
}
for (const prefix of REPORTED_COMPOSED_COMPONENT_PREFIXES) {
  check([...seenTracks].some((t) => t.startsWith(prefix) || t.includes(prefix)),
    `reported composed-route family ${prefix} is missing from the sweep`);
}
// The universe is every config with a canonical fixture, and it must not shrink.
// Rendering and refusing are both outcomes of it, so the floor sits on the sum:
// a config that quietly stopped being swept would otherwise look like a refusal.
check(rendered + refused >= 41,
  `only ${rendered + refused} configs were exercised; the sweep universe regressed`);
check(rendered >= 28, `only ${rendered} configs rendered; valid components must still render`);
// Thirteen configs cannot state a court, a venue, or a custodian their proposed
// order directs, and now refuse instead of inheriting Pennsylvania's or printing
// a blank. A drop here means the fail-closed path was removed, not satisfied.
check(refused >= 13, `only ${refused} configs refused; the incomplete-presentation refusal path went untested`);
check(nullSovereignRendered >= 1, "no null-sovereign config rendered; the ex parte suppression path went untested");
// The eleven documents the token defect covered declare 25 value tokens between
// them. Each one's fail-closed path is exercised above; a drop here means a
// caption stopped depending on a matter fact it names.
check(tokenRefusalsProven >= 20,
  `only ${tokenRefusalsProven} caption tokens had their missing-fact refusal proven; the fail-closed path went untested`);

if (failures.length > 0) {
  console.error(`verify-rcap-no-null-presentation FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`verify-rcap-no-null-presentation passed: ${checks} checks, ${rendered} live renders (${nullSovereignRendered} ex parte), no escaped null/undefined/NaN in any rendered pleading.`);
console.log(`  caption tokens resolved from matter facts, each proven to refuse when unanswered: ${tokenRefusalsProven}`);
