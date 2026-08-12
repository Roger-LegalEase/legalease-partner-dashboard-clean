// Lane C3 (controlled pleadings) terminalization verifier + render harness.
//
// Scope: the 11 lane-C jobs frozen for terminalization window 2026-08-12-w1
// (NV, ND, SC, ID, KS, WA, NE, OH, OK, VA, WI — 22 tracks). For each assigned
// track this script:
//   1. loads data/rcap-all50/pleadings/<state>/<track_id>/pleading-config.json,
//   2. renders every fixture through the real custom-pleading renderer
//      (src/lib/record-clearing/renderers/custom-pleading-renderer.ts, imported
//      via scripts/lib/ts-esm-loader.mjs),
//   3. writes (--write) or re-derives and byte-compares (default) the rendered
//      canonical artifacts (canonical.txt, canonical.pdf via pdf-lib,
//      render-report.json),
//   4. runs runPleadingQa, the placeholder scan, and the protected-field scan,
//   5. cross-checks anti-invention rules against the committed state packs and
//      the pinned legal-design track registry (3b6f4c10) when reachable,
//   6. checks manifests, handoffs, participant instructions, and that the
//      working tree contains no writes outside the lane's owned paths.
//
// Usage:
//   node scripts/verify-rcap-terminalize-c3.mjs                  # verify all
//   node scripts/verify-rcap-terminalize-c3.mjs --jurisdiction north-dakota
//   node scripts/verify-rcap-terminalize-c3.mjs --write          # regenerate rendered/*
//   node scripts/verify-rcap-terminalize-c3.mjs --write --jurisdiction ohio

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// On-the-fly TypeScript require hook (same pattern as verify-nd-pleading-state.mjs);
// unlike the ESM loader it also resolves directory imports to index.ts.
Module._extensions[".ts"] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  module._compile(output, filename);
};
const args = process.argv.slice(2);
const WRITE_MODE = args.includes("--write");
const jurisdictionFilter = (() => {
  const i = args.indexOf("--jurisdiction");
  return i >= 0 ? args[i + 1] : null;
})();

const failures = [];
const notes = [];

// ---------------------------------------------------------------------------
// Frozen lane manifest: jobs and tracks (must match the lane-C ledger entries).
// ---------------------------------------------------------------------------

const LEDGER_PATH = "data/rcap-ledger/track-terminalization.json";
const REGISTRY_PIN = {
  commit: "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5",
  file: "data/record-clearing/legal-design-track-registry.json",
  sha256: "9d37ca7c654d71e6583950ed7cf3c32387f7f275b8f35cd46729a157ceea4ae9"
};

const ASSIGNMENTS = [
  { jobId: "T-C-NV-production-packet", jurisdiction: "NV", slug: "nevada", trackIds: ["nv_repository_removal", "nv_seal_decrim", "nv_seal_multi", "nv_seal_pardon"] },
  { jobId: "T-C-ND-production-packet", jurisdiction: "ND", slug: "north-dakota", trackIds: ["nd-seal-felony-conviction", "nd-seal-misdemeanor-conviction", "nd-seal-pardoned-conviction"] },
  { jobId: "T-C-SC-production-packet", jurisdiction: "SC", slug: "south-carolina", trackIds: ["sc_aep", "sc_conditional_discharge_44_53_450", "sc_tep"] },
  { jobId: "T-C-ID-production-packet", jurisdiction: "ID", slug: "idaho", trackIds: ["id_felony_reduction", "id_set_aside_dismissal"] },
  { jobId: "T-C-KS-production-packet", jurisdiction: "KS", slug: "kansas", trackIds: ["ks-12-4516-municipal", "ks-12-4516a-municipal-arrest"] },
  { jobId: "T-C-WA-production-packet", jurisdiction: "WA", slug: "washington", trackIds: ["wa_crop_certificate_of_restoration", "wa_vac_post_probation_9_95_240"] },
  { jobId: "T-C-NE-production-packet", jurisdiction: "NE", slug: "nebraska", trackIds: ["ne-seal-enforcement"] },
  { jobId: "T-C-OH-production-packet", jurisdiction: "OH", slug: "ohio", trackIds: ["oh_2953_32_sealing"] },
  { jobId: "T-C-OK-production-packet", jurisdiction: "OK", slug: "oklahoma", trackIds: ["ok_identity_theft"] },
  { jobId: "T-C-VA-production-packet", jurisdiction: "VA", slug: "virginia", trackIds: ["va_exp_identity_used_by_another"] },
  { jobId: "T-C-WI-production-packet", jurisdiction: "WI", slug: "wisconsin", trackIds: ["wi_exp_certificate_of_discharge_followup"] }
];

const OWNED_PATH_PREFIXES = [
  ...ASSIGNMENTS.map((a) => `data/rcap-all50/pleadings/${a.slug}/`),
  "scripts/verify-rcap-terminalize-c3.mjs",
  "docs/record-clearing/terminalize-c/c3-handoff.md"
];

const REQUIRED_COMPONENT_KEYS = [
  "caption",
  "court_party_identity",
  "title",
  "allegations",
  "statutory_basis",
  "requested_relief",
  "verification",
  "signatures",
  "proposed_order",
  "certificate_of_service",
  "notice_affidavit",
  "participant_cover_sheet",
  "filing_instructions"
];

const REQUIRED_CONFIG_FIELDS = [
  "jurisdictionCode",
  "trackId",
  "templateGrade",
  "templateLifecycle",
  "primaryReliefTerm",
  "documentTitleFull",
  "courtCaption",
  "primaryStatutoryAuthority",
  "verificationStatute",
  "includeProposedOrder",
  "includeCertificateOfService",
  "serviceNote",
  "counselFlags",
  "presentation"
];

const REQUIRED_PRESENTATION_FIELDS = [
  "sovereignPartyName",
  "sovereignPartyProper",
  "sovereignRole",
  "movantRole",
  "filingNoun",
  "divisionLine",
  "usesCounty",
  "courtName",
  "venueDescriptor",
  "recordCustodianLead",
  "verificationVerb",
  "verificationPenaltyLabel",
  "serviceRecipientLabel",
  "serviceRecipientAddressLabel"
];

// Internal implementation vocabulary that must not appear in participant-facing
// instruction documents.
const INTERNAL_LANGUAGE = [
  /\brenderer\b/i,
  /\bfixture\b/i,
  /\bverifier\b/i,
  /\btrackid\b/i,
  /\bpleading-config\b/i,
  /\bconfig\.json\b/i,
  /\bschema\b/i,
  /\bpipeline\b/i,
  /\bterminaliz/i,
  /\blane\s+c\b/i,
  /\bshadow\s*mode\b/i
];

const DISALLOWED_PLACEHOLDER = /\[(PLACEHOLDER|TODO|INSERT|FIXME|TBD|XXX)/i;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;

// Bracket tokens the shared renderer itself emits when a value is deliberately
// left blank (protected fields, participant-completed fields). movantRole is
// substituted per config.
function rendererBuiltinTokens(movantRole) {
  const role = movantRole.toUpperCase();
  return [
    "[COUNTY TO BE CONFIRMED]",
    "[PETITIONER NAME TO BE CONFIRMED]",
    "[TO BE CONFIRMED]",
    `[${role} ADDRESS — ADD IF REQUIRED BY LOCAL RULES]`,
    "[CHARGE DESCRIPTION TO BE CONFIRMED]",
    "[ARRESTING AGENCY TO BE CONFIRMED]",
    "[ARREST DATE TO BE CONFIRMED]",
    "[DISPOSITION TO BE CONFIRMED]",
    "[DISPOSITION DATE TO BE CONFIRMED]",
    "[CITATION REQUIRED — FLAGGED FOR COUNSEL]",
    `[${role} ADDRESS]`,
    "[NOTE: Date of birth and Social Security Number should be added by " +
      `${movantRole.toLowerCase()} if required by the applicable form or local court rules.]`,
    "[personal delivery / first-class mail / other as permitted by applicable court rules]",
    "[DOCKET NUMBER TO BE CONFIRMED]",
    "[PROPOSED]",
    "[ARRESTING AGENCY]"
  ];
}

// ---------------------------------------------------------------------------
// Load the real renderer + QA through the TS loader.
// ---------------------------------------------------------------------------

const rendererModule = require(
  path.join(rootDir, "src/lib/record-clearing/renderers/custom-pleading-renderer.ts")
);
const qaModule = require(path.join(rootDir, "src/lib/record-clearing/pleading-qa.ts"));
const { renderCustomPleading } = rendererModule;
const { runPleadingQa } = qaModule;

const { PDFDocument, StandardFonts } = require("pdf-lib");

// Pre-existing runtime configs that ND tracks must reuse (not fork).
const ndConfigModule = require(
  path.join(rootDir, "src/lib/record-clearing/north-dakota-config.ts")
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function normalizeCitation(s) {
  return s.toLowerCase().replace(/[§().,\s-]/g, "");
}

function collectStrings(value, out) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectStrings(v, out));
  }
  return out;
}

function bracketTokens(text) {
  return text.match(/\[[^\[\]\n]*\]/g) ?? [];
}

// WinAnsi-safe text for the standard (non-embedded) PDF fonts.
const CHAR_REPLACEMENTS = new Map([
  [" ", " "],
  ["‑", "-"],
  ["–", "-"],
  ["−", "-"]
]);

function sanitizeForPdf(text) {
  let out = "";
  for (const ch of text) {
    if (CHAR_REPLACEMENTS.has(ch)) out += CHAR_REPLACEMENTS.get(ch);
    else out += ch;
  }
  return out;
}

async function renderPdf(fullText, title) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer("rcap-c3-render-harness");
  doc.setCreator("LegalEase RCAP lane C3");
  const fixedDate = new Date("2026-08-12T00:00:00.000Z");
  doc.setCreationDate(fixedDate);
  doc.setModificationDate(fixedDate);

  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11;
  const lineHeight = 14;
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 72;
  const maxWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawLine = (line) => {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (line.length > 0) {
      page.drawText(line, { x: margin, y, size: fontSize, font });
    }
    y -= lineHeight;
  };

  const wrap = (line) => {
    if (line.length === 0) return [""];
    const words = line.split(" ");
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current.length === 0 ? word : `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current.length > 0) rows.push(current);
        current = word;
      }
    }
    rows.push(current);
    return rows;
  };

  for (const rawLine of sanitizeForPdf(fullText).split("\n")) {
    for (const row of wrap(rawLine)) drawLine(row);
  }

  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

function gitShow(ref) {
  const result = spawnSync("git", ["show", ref], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  return result.status === 0 ? result.stdout : null;
}

// ---------------------------------------------------------------------------
// Step 0: ledger agreement — assigned jobs/tracks must match lane C exactly.
// ---------------------------------------------------------------------------

const ledger = readJson(path.join(rootDir, LEDGER_PATH));
const ledgerJobs = new Map(ledger.jobs.map((j) => [j.jobId, j]));
for (const assignment of ASSIGNMENTS) {
  const job = ledgerJobs.get(assignment.jobId);
  if (!job) {
    failures.push(`Ledger job not found: ${assignment.jobId}`);
    continue;
  }
  if (job.lane !== "C") failures.push(`${assignment.jobId}: ledger lane is ${job.lane}, expected C.`);
  if (job.jurisdiction !== assignment.jurisdiction) {
    failures.push(`${assignment.jobId}: ledger jurisdiction ${job.jurisdiction} != ${assignment.jurisdiction}.`);
  }
  const ledgerTrackIds = [...job.trackIds].sort().join(",");
  const assignedTrackIds = [...assignment.trackIds].sort().join(",");
  if (ledgerTrackIds !== assignedTrackIds) {
    failures.push(`${assignment.jobId}: trackIds mismatch. ledger=[${ledgerTrackIds}] script=[${assignedTrackIds}]`);
  }
}

// Optional deep source check: the pinned registry blob, when reachable in this
// clone, must match its recorded sha256 and back every track's authority list.
const pinnedRegistryText = gitShow(`${REGISTRY_PIN.commit}:${REGISTRY_PIN.file}`);
let pinnedRegistryTracks = null;
if (pinnedRegistryText) {
  const pinnedSha = sha256(Buffer.from(pinnedRegistryText, "utf8"));
  if (pinnedSha !== REGISTRY_PIN.sha256) {
    failures.push(`Pinned registry sha256 mismatch: ${pinnedSha} != ${REGISTRY_PIN.sha256}`);
  } else {
    const parsed = JSON.parse(pinnedRegistryText);
    pinnedRegistryTracks = new Map(parsed.tracks.map((t) => [`${t.jurisdiction}:${t.trackId}`, t]));
  }
} else {
  notes.push("Pinned registry commit not reachable in this clone; registry-excerpt fidelity checks skipped.");
}

// ---------------------------------------------------------------------------
// Per-track verification
// ---------------------------------------------------------------------------

const summary = [];

for (const assignment of ASSIGNMENTS) {
  if (jurisdictionFilter && assignment.slug !== jurisdictionFilter) continue;
  const jurisdictionDir = path.join(rootDir, "data/rcap-all50/pleadings", assignment.slug);

  // Jurisdiction manifest
  const manifestPath = path.join(jurisdictionDir, "manifest.json");
  let manifest = null;
  if (!fs.existsSync(manifestPath)) {
    failures.push(`${assignment.slug}: manifest.json missing.`);
  } else {
    manifest = readJson(manifestPath);
    if (manifest.jobId !== assignment.jobId) {
      failures.push(`${assignment.slug}: manifest jobId ${manifest.jobId} != ${assignment.jobId}.`);
    }
    const manifestTrackIds = [...(manifest.trackIds ?? [])].sort().join(",");
    if (manifestTrackIds !== [...assignment.trackIds].sort().join(",")) {
      failures.push(`${assignment.slug}: manifest trackIds do not match the ledger assignment.`);
    }
  }

  for (const trackId of assignment.trackIds) {
    const trackDir = path.join(jurisdictionDir, trackId);
    const label = `${assignment.jurisdiction}:${trackId}`;
    if (!fs.existsSync(trackDir)) {
      failures.push(`${label}: track directory missing (${path.relative(rootDir, trackDir)}).`);
      continue;
    }

    // --- pleading-config.json ---
    const configPath = path.join(trackDir, "pleading-config.json");
    if (!fs.existsSync(configPath)) {
      failures.push(`${label}: pleading-config.json missing.`);
      continue;
    }
    const artifact = readJson(configPath);
    const config = artifact.config;

    if (artifact.ledgerTrackId !== trackId) {
      failures.push(`${label}: ledgerTrackId ${artifact.ledgerTrackId} != ${trackId}.`);
    }
    if (artifact.jobId !== assignment.jobId) {
      failures.push(`${label}: artifact jobId ${artifact.jobId} != ${assignment.jobId}.`);
    }
    for (const field of REQUIRED_CONFIG_FIELDS) {
      if (!(field in (config ?? {}))) failures.push(`${label}: config missing required field '${field}'.`);
    }
    if (!config) continue;
    for (const field of REQUIRED_PRESENTATION_FIELDS) {
      if (!(field in (config.presentation ?? {}))) {
        failures.push(`${label}: presentation missing required field '${field}'.`);
      }
    }
    if (config.trackId !== trackId) {
      failures.push(`${label}: config.trackId ${config.trackId} != ledger track id.`);
    }
    if (config.jurisdictionCode !== assignment.jurisdiction) {
      failures.push(`${label}: config.jurisdictionCode ${config.jurisdictionCode} != ${assignment.jurisdiction}.`);
    }
    if (config.templateGrade !== "legal_ops_custom_pleading") {
      failures.push(`${label}: templateGrade must be legal_ops_custom_pleading.`);
    }
    if (config.templateLifecycle !== "replacement_candidate") {
      failures.push(`${label}: templateLifecycle must be replacement_candidate.`);
    }
    if (!Array.isArray(config.primaryStatutoryAuthority) || config.primaryStatutoryAuthority.length === 0) {
      failures.push(`${label}: primaryStatutoryAuthority must be a non-empty array.`);
    }
    if (!Array.isArray(config.counselFlags) || config.counselFlags.length === 0) {
      failures.push(`${label}: counselFlags must be non-empty.`);
    }

    // --- componentInventory ---
    const inventory = artifact.componentInventory ?? {};
    let presentCount = 0;
    for (const key of REQUIRED_COMPONENT_KEYS) {
      const entry = inventory[key];
      if (!entry || !["present", "absent", "blocked"].includes(entry.status) || !entry.detail) {
        failures.push(`${label}: componentInventory['${key}'] missing or malformed (status/detail).`);
        continue;
      }
      if (entry.status === "present") presentCount += 1;
    }
    if (inventory.proposed_order?.status === "present" && !config.includeProposedOrder) {
      failures.push(`${label}: proposed_order marked present but includeProposedOrder is false.`);
    }
    if (inventory.proposed_order?.status !== "present" && config.includeProposedOrder) {
      failures.push(`${label}: includeProposedOrder true but proposed_order not marked present.`);
    }
    if (inventory.certificate_of_service?.status === "present" && !config.includeCertificateOfService) {
      failures.push(`${label}: certificate_of_service marked present but includeCertificateOfService is false.`);
    }
    if (inventory.certificate_of_service?.status !== "present" && config.includeCertificateOfService) {
      failures.push(`${label}: includeCertificateOfService true but certificate_of_service not marked present.`);
    }

    // --- provenance ---
    const prov = artifact.provenance ?? {};
    if (!Array.isArray(prov.statePackFiles) || prov.statePackFiles.length === 0) {
      failures.push(`${label}: provenance.statePackFiles missing/empty.`);
    }
    let evidenceText = "";
    for (const sp of prov.statePackFiles ?? []) {
      const p = path.join(rootDir, sp);
      if (!fs.existsSync(p)) failures.push(`${label}: state pack file not found: ${sp}`);
      else evidenceText += fs.readFileSync(p, "utf8");
    }
    if (!prov.profilePath || !fs.existsSync(path.join(rootDir, prov.profilePath))) {
      failures.push(`${label}: provenance.profilePath missing or not found.`);
    } else {
      const profileBuf = fs.readFileSync(path.join(rootDir, prov.profilePath));
      evidenceText += profileBuf.toString("utf8");
      if (prov.fingerprint !== sha256(profileBuf)) {
        failures.push(`${label}: provenance.fingerprint does not match sha256 of ${prov.profilePath}.`);
      }
    }
    if (prov.registryPin?.commit !== REGISTRY_PIN.commit || prov.registryPin?.sha256 !== REGISTRY_PIN.sha256) {
      failures.push(`${label}: provenance.registryPin must record commit ${REGISTRY_PIN.commit} and its sha256.`);
    }

    // --- registry excerpt fidelity + citation anti-invention ---
    const excerpt = artifact.registryExcerpt ?? null;
    if (!excerpt || !Array.isArray(excerpt.authority) || excerpt.authority.length === 0) {
      failures.push(`${label}: registryExcerpt.authority missing/empty.`);
    }
    if (pinnedRegistryTracks && excerpt) {
      const pinnedTrack = pinnedRegistryTracks.get(label);
      if (!pinnedTrack) {
        failures.push(`${label}: not found in pinned registry.`);
      } else {
        if (JSON.stringify(excerpt.authority) !== JSON.stringify(pinnedTrack.authority)) {
          failures.push(`${label}: registryExcerpt.authority differs from pinned registry.`);
        }
        if (excerpt.legalName !== pinnedTrack.legalName) {
          failures.push(`${label}: registryExcerpt.legalName differs from pinned registry.`);
        }
        if (pinnedTrack.outputStrategy !== "custom_pleading") {
          failures.push(`${label}: pinned registry outputStrategy is ${pinnedTrack.outputStrategy}, not custom_pleading.`);
        }
      }
    }
    const evidenceNormalized = normalizeCitation(evidenceText + JSON.stringify(excerpt ?? {}));
    for (const auth of config.primaryStatutoryAuthority ?? []) {
      if (auth.citation === null) continue;
      if (!evidenceNormalized.includes(normalizeCitation(auth.citation))) {
        failures.push(`${label}: statutory citation '${auth.citation}' not found in committed evidence (possible invention).`);
      }
    }
    if (config.verificationStatute?.citation) {
      if (!evidenceNormalized.includes(normalizeCitation(config.verificationStatute.citation))) {
        failures.push(`${label}: verification statute '${config.verificationStatute.citation}' not backed by committed evidence.`);
      }
    }
    const serviceAddr = config.presentation?.serviceRecipientAddressLabel ?? "";
    if (!serviceAddr.includes("[")) {
      // A concrete address may only be asserted when the committed evidence states it.
      if (!normalizeCitation(evidenceText).includes(normalizeCitation(serviceAddr))) {
        failures.push(`${label}: serviceRecipientAddressLabel asserts a concrete address not backed by committed evidence.`);
      }
    }

    // --- ND reuse: config must be the pre-existing runtime config, not a fork ---
    if (assignment.jurisdiction === "ND") {
      const runtime = JSON.parse(JSON.stringify(ndConfigModule.ndConvictionSealingConfig));
      const candidate = JSON.parse(JSON.stringify(config));
      const declaredEligibility = artifact.eligibilityPath?.label ?? "";
      runtime.trackId = trackId; // per-track id is the only permitted divergence
      if (JSON.stringify(runtime) !== JSON.stringify(candidate)) {
        failures.push(`${label}: ND config must equal ndConvictionSealingConfig (trackId aside); fork detected.`);
      }
      if (!artifact.runtimePreexisting || artifact.runtimePreexisting.exportName !== "ndConvictionSealingConfig") {
        failures.push(`${label}: runtimePreexisting must record reuse of ndConvictionSealingConfig.`);
      }
      if (!declaredEligibility) failures.push(`${label}: ND track must declare its eligibilityPath.`);
    }

    // --- fixtures ---
    const qaTerms = artifact.qa?.prohibitedTerms ?? [];
    if (!Array.isArray(qaTerms)) failures.push(`${label}: qa.prohibitedTerms must be an array.`);
    const fixturesDir = path.join(trackDir, "fixtures");
    const requiredFixtures = ["canonical", "boundary", "negative"];
    const fixtureResults = {};

    for (const fixtureId of [...requiredFixtures, "multiline"]) {
      const fixturePath = path.join(fixturesDir, `${fixtureId}.json`);
      if (!fs.existsSync(fixturePath)) {
        if (requiredFixtures.includes(fixtureId)) failures.push(`${label}: fixtures/${fixtureId}.json missing.`);
        continue;
      }
      const fixture = readJson(fixturePath);
      const input = { config, ...fixture.renderInput };
      let renderResult;
      try {
        renderResult = renderCustomPleading(input);
      } catch (err) {
        failures.push(`${label}/${fixtureId}: renderer threw: ${err.message}`);
        continue;
      }
      const qaResult = runPleadingQa({ config, renderResult, prohibitedTerms: qaTerms });
      fixtureResults[fixtureId] = { fixture, renderResult, qaResult };

      const expectQaPass = fixture.expectations?.qaPassed !== false;
      if (expectQaPass && !qaResult.passed) {
        failures.push(`${label}/${fixtureId}: QA failed unexpectedly: ${qaResult.failures.join("; ")}`);
      }
      if (!expectQaPass) {
        if (qaResult.passed) {
          failures.push(`${label}/${fixtureId}: negative fixture unexpectedly passed QA.`);
        }
        if (!fixture.statedFailureReason) {
          failures.push(`${label}/${fixtureId}: negative fixture must state its failure reason.`);
        }
        const snippet = fixture.expectations?.expectedFailureSnippet;
        if (snippet && !qaResult.failures.some((f) => f.includes(snippet))) {
          failures.push(`${label}/${fixtureId}: no QA failure contains expected snippet '${snippet}'.`);
        }
        continue; // negative fixtures are not scanned further
      }

      // Placeholder scan
      const allowlist = new Set(rendererBuiltinTokens(config.presentation.movantRole));
      for (const s of collectStrings(config, [])) for (const t of bracketTokens(s)) allowlist.add(t);
      const disallowed = [];
      if (DISALLOWED_PLACEHOLDER.test(renderResult.fullText)) {
        disallowed.push(renderResult.fullText.match(DISALLOWED_PLACEHOLDER)[0]);
      }
      for (const token of bracketTokens(renderResult.fullText)) {
        if (!allowlist.has(token)) disallowed.push(token);
      }
      if (disallowed.length > 0) {
        failures.push(`${label}/${fixtureId}: placeholder leak: ${[...new Set(disallowed)].join(" | ")}`);
      }

      // Protected-field scan (canonical, boundary, multiline)
      const caseData = fixture.renderInput?.caseData ?? {};
      for (const protectedField of ["docketNumber", "otn", "judgeName", "judgeAddress"]) {
        if (caseData[protectedField]) {
          failures.push(`${label}/${fixtureId}: protected field '${protectedField}' must stay blank in fixtures.`);
        }
      }
      const text = renderResult.fullText;
      if (SSN_PATTERN.test(text)) failures.push(`${label}/${fixtureId}: SSN-shaped value in rendered text.`);
      if (/\bOTN:/.test(text)) failures.push(`${label}/${fixtureId}: OTN rendered despite protected-field policy.`);
      if (/assigned judge is/i.test(text)) failures.push(`${label}/${fixtureId}: judge name rendered despite policy.`);
      if (!text.includes("DOCKET NO.: [TO BE CONFIRMED]")) {
        failures.push(`${label}/${fixtureId}: docket line must render the blank-docket placeholder.`);
      }
      if (/date of birth:\s*\S/i.test(text)) failures.push(`${label}/${fixtureId}: DOB value in rendered text.`);
      for (const probe of fixture.protectedProbes ?? []) {
        if (text.includes(probe)) failures.push(`${label}/${fixtureId}: protected probe '${probe}' leaked into rendered text.`);
      }
    }

    // --- rendered artifacts (canonical) ---
    const canonical = fixtureResults.canonical;
    if (canonical) {
      const renderedDir = path.join(trackDir, "rendered");
      const pdfPath = path.join(renderedDir, "canonical.pdf");
      const txtPath = path.join(renderedDir, "canonical.txt");
      const reportPath = path.join(renderedDir, "render-report.json");
      const fullText = `${canonical.renderResult.fullText}\n`;
      const pdfBytes = await renderPdf(canonical.renderResult.fullText, `${label} canonical pleading sample`);
      const parsed = await PDFDocument.load(pdfBytes);
      const pageCount = parsed.getPageCount();
      if (pageCount < 1) failures.push(`${label}: rendered PDF has zero pages.`);

      const allowTokens = [...new Set(bracketTokens(canonical.renderResult.fullText))];
      const report = {
        schemaVersion: "rcap-c3-render-report/v1",
        jobId: assignment.jobId,
        trackId,
        jurisdiction: assignment.jurisdiction,
        fixtureId: "canonical",
        generatedBy: "scripts/verify-rcap-terminalize-c3.mjs",
        renderWindow: "2026-08-12-w1",
        pageCount,
        byteSize: pdfBytes.length,
        sha256: sha256(pdfBytes),
        textSha256: sha256(Buffer.from(fullText, "utf8")),
        placeholderScan: {
          disallowedTokens: [],
          bracketTokensPresent: allowTokens
        },
        protectedFieldReport: {
          docketNumber: "blank (renders [TO BE CONFIRMED])",
          otn: "blank (not rendered)",
          judgeName: "blank (not rendered)",
          prosecutorPosition: "not collected; service labels only",
          ssnDob: "absent from fixtures and rendered text"
        },
        qa: { passed: canonical.qaResult.passed, warnings: canonical.qaResult.warnings }
      };

      if (WRITE_MODE) {
        fs.mkdirSync(renderedDir, { recursive: true });
        fs.writeFileSync(txtPath, fullText);
        fs.writeFileSync(pdfPath, pdfBytes);
        fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      } else {
        if (!fs.existsSync(txtPath) || !fs.existsSync(pdfPath) || !fs.existsSync(reportPath)) {
          failures.push(`${label}: rendered artifacts missing (run with --write).`);
        } else {
          if (fs.readFileSync(txtPath, "utf8") !== fullText) {
            failures.push(`${label}: rendered/canonical.txt is stale (differs from fresh render).`);
          }
          const committedReport = readJson(reportPath);
          if (committedReport.sha256 !== report.sha256) {
            failures.push(`${label}: rendered/canonical.pdf sha256 stale (report ${committedReport.sha256} vs fresh ${report.sha256}).`);
          }
          const committedPdf = fs.readFileSync(pdfPath);
          if (sha256(committedPdf) !== committedReport.sha256) {
            failures.push(`${label}: rendered/canonical.pdf does not match its render-report sha256.`);
          }
          const committedParsed = await PDFDocument.load(committedPdf).catch(() => null);
          if (!committedParsed || committedParsed.getPageCount() < 1) {
            failures.push(`${label}: committed canonical.pdf unparseable or zero pages.`);
          }
        }
      }
    }

    // --- participant instructions + handoff ---
    const instructionsPath = path.join(trackDir, "participant-instructions.md");
    if (!fs.existsSync(instructionsPath)) {
      failures.push(`${label}: participant-instructions.md missing.`);
    } else {
      const instructions = fs.readFileSync(instructionsPath, "utf8");
      if (instructions.trim().length < 400) failures.push(`${label}: participant-instructions.md too thin.`);
      for (const pattern of INTERNAL_LANGUAGE) {
        if (pattern.test(instructions)) {
          failures.push(`${label}: participant-instructions.md contains internal implementation language (${pattern}).`);
        }
      }
    }
    const handoffPath = path.join(trackDir, "handoff.md");
    if (!fs.existsSync(handoffPath)) {
      failures.push(`${label}: handoff.md missing.`);
    } else {
      const handoff = fs.readFileSync(handoffPath, "utf8");
      for (const heading of ["## Authority", "## Mechanism", "## Route decision", "## Open counsel flags"]) {
        if (!handoff.includes(heading)) failures.push(`${label}: handoff.md missing '${heading}' section.`);
      }
    }

    // --- manifest entry ---
    if (manifest) {
      const entry = (manifest.tracks ?? []).find((t) => t.trackId === trackId);
      if (!entry) {
        failures.push(`${label}: no manifest entry.`);
      } else {
        if (entry.componentCount !== presentCount) {
          failures.push(`${label}: manifest componentCount ${entry.componentCount} != inventory present count ${presentCount}.`);
        }
        if (!entry.status) failures.push(`${label}: manifest entry missing status.`);
      }
    }

    summary.push({
      label,
      presentCount,
      blocked: REQUIRED_COMPONENT_KEYS.filter((k) => inventory[k]?.status === "blocked")
    });
  }
}

// ---------------------------------------------------------------------------
// Owned-paths check: nothing in the working tree outside the lane's ownership.
// ---------------------------------------------------------------------------

const status = spawnSync("git", ["status", "--porcelain"], { cwd: rootDir, encoding: "utf8" });
for (const line of status.stdout.split("\n")) {
  if (!line.trim()) continue;
  const p = line.slice(3).trim().replace(/^"|"$/g, "");
  const inOwned = OWNED_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix) || prefix.startsWith(p));
  if (!inOwned) failures.push(`Working-tree change outside owned paths: ${line.trim()}`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

for (const n of notes) console.log(`note: ${n}`);
if (failures.length > 0) {
  console.error(`Lane C3 terminalization verification FAILED (${failures.length} failure(s)).`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`Lane C3 terminalization verification PASSED${WRITE_MODE ? " (write mode)" : ""}.`);
for (const s of summary) {
  const blocked = s.blocked.length > 0 ? ` blocked=[${s.blocked.join(",")}]` : "";
  console.log(`  ${s.label}: components present=${s.presentCount}${blocked}`);
}
