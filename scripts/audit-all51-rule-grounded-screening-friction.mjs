#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const defaultProfilesPath = path.join(root, "src/lib/rcap-engine/compiled/profiles");
const referenceScriptPath = path.join(root, "scripts/rcap_screening_audit.py");

const ELIGIBILITY_STAGES = new Set([
  "scope", "pathway_routing", "state_specific_eligibility", "special_pathways",
  "timing_and_completion", "timing", "exclusion_screen", "exclusions",
  "legal_eligibility", "automatic_relief"
]);
const LOGISTICS_STAGES = new Set([
  "case_details", "record_readiness", "filing_details",
  "packet_preparation", "form_details", "document_collection"
]);
const NEVER_MOVE = new Set(["ownership_scope", "jurisdiction_scope"]);
const READINESS_FIELDS = new Set(["record_documents", "criminal_history"]);
const TWIN = {
  county_or_filing_location: "county",
  case_identifier: "case_number"
};
const RULE_KEYS = ["orderedDecisionRules", "exclusionRules", "waitingPeriodRules"];
const BLOCKING_OUTCOMES = new Set([
  "hard_stop", "guidance_only", "not_yet", "likely_not_eligible",
  "needs_review", "needs_more_info", "not_covered_yet"
]);
const RESULT_CODE_RE = /(packet_ready_with_caution|packet_ready|needs_more_info|not_yet|guidance_only|not_covered_yet|likely_not_eligible|needs_review|hard_stop)/g;

const TRACKS = ["ELIGIBILITY", "DEDUP_DUPLICATE", "PACKET_DATA", "READINESS_GAUGE"];
const SOURCE_QUESTION_PREFIX = "source_question_";
const CODE_SCAN_SEEDS = [
  "src/lib/rcap-engine/evaluator.ts",
  "src/lib/rcap-engine/public-profile-projection.ts",
  "src/lib/rcap-engine/answer-normalization.ts",
  "src/lib/rcap-engine/packet-planner.ts",
  "src/lib/expungement-ai/packet-generation.ts"
];
const NON_BLOCKING_SCAN_FILES = [
  "src/components/expungement-ai/screening/screens.ts",
  "src/components/expungement-ai/screening/ScreeningFlow.tsx"
];
const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const RUNTIME_SCAN_ROOTS = [
  "src/lib/rcap-engine",
  "src/lib/expungement-ai"
];
const PACKET_RELATED_FILE_RE = /(packet|field[-_]?map|pdf|acroform|overlay|render|renderer|document|artifact|template)/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadProfiles(profilesPath) {
  const files = fs.readdirSync(profilesPath)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => path.join(profilesPath, file));
  const profiles = [];
  for (const filePath of files) {
    try {
      const profile = readJson(filePath);
      if (profile.jurisdiction && profile.questions) profiles.push([filePath, profile]);
    } catch {
      // Match the reference script: unreadable or non-profile JSON is ignored.
    }
  }
  return profiles;
}

function codeOf(profile) {
  return profile.jurisdiction?.code ?? "??";
}

function consumerQuestions(profile) {
  return (profile.questions ?? []).filter((question) => !String(question.id ?? "").startsWith(SOURCE_QUESTION_PREFIX));
}

function referencedFields(profile) {
  const ref = new Map();
  for (const ruleKey of RULE_KEYS) {
    for (const rule of profile[ruleKey] ?? []) {
      const condition = rule?.when && typeof rule.when === "object" && !Array.isArray(rule.when) ? rule.when : {};
      const fields = new Set();
      for (const key of ["fieldsReferenced", "requiredFields"]) {
        for (const source of [rule?.[key], condition[key]]) {
          if (Array.isArray(source)) {
            for (const value of source) {
              if (typeof value === "string") fields.add(value);
            }
          }
        }
      }
      if (fields.size === 0) continue;
      const codes = new Set(JSON.stringify(rule).match(RESULT_CODE_RE) ?? []);
      if (ruleKey === "exclusionRules") codes.add("likely_not_eligible");
      if (ruleKey === "waitingPeriodRules") codes.add("not_yet");
      for (const field of fields) {
        if (!ref.has(field)) ref.set(field, new Set());
        for (const code of codes) ref.get(field).add(code);
      }
    }
  }
  return ref;
}

function packetInputIds(profile) {
  const ids = new Set();
  function walk(node) {
    if (Array.isArray(node)) {
      for (const value of node) walk(value);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (["requiredInputIds", "requiredInputs", "inputs"].includes(key) && Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === "string") ids.add(String(entry));
        }
      }
      walk(value);
    }
  }
  walk(profile.packetGenerator ?? {});
  walk(profile.pathways ?? []);
  return ids;
}

function classify(profile) {
  const ref = referencedFields(profile);
  const refset = new Set(ref.keys());
  const packetIds = packetInputIds(profile);
  const questionIds = new Set(consumerQuestions(profile).map((question) => question.id));
  const rows = [];

  for (const question of consumerQuestions(profile)) {
    const field = question.id;
    const stage = question.stage ?? "";
    const row = {
      field,
      stage,
      prompt: question.prompt ?? "",
      referenced: refset.has(field),
      outcomes: [...(ref.get(field) ?? new Set())].sort(),
      packet_required: packetIds.has(field),
      readiness: READINESS_FIELDS.has(field)
    };

    if (
      NEVER_MOVE.has(field) ||
      refset.has(field) ||
      packetIds.has(field) ||
      ELIGIBILITY_STAGES.has(stage) ||
      !LOGISTICS_STAGES.has(stage)
    ) {
      row.track = "ELIGIBILITY";
    } else if (READINESS_FIELDS.has(field)) {
      row.track = "READINESS_GAUGE";
    } else {
      const twin = TWIN[field];
      if (twin && questionIds.has(twin)) {
        row.track = "DEDUP_DUPLICATE";
        row.twin = twin;
        row.twin_referenced = refset.has(twin);
      } else {
        row.track = "PACKET_DATA";
      }
    }
    rows.push(row);
  }
  return rows;
}

function classifyAll(profilesPath) {
  const profiles = loadProfiles(profilesPath);
  if (profiles.length === 0) {
    throw Object.assign(new Error(`No profiles found in ${profilesPath}`), { exitCode: 2 });
  }
  const rowsByState = {};
  for (const [, profile] of profiles) {
    rowsByState[codeOf(profile)] = classify(profile);
  }
  return rowsByState;
}

function assertReferenceParity(profilesPath, rowsByState) {
  if (!fs.existsSync(referenceScriptPath)) {
    throw Object.assign(new Error(`Missing Python reference script at ${referenceScriptPath}`), { exitCode: 2 });
  }
  const result = spawnSync("python3", [referenceScriptPath, profilesPath, "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw Object.assign(new Error(`Python reference failed:\n${result.stderr || result.stdout}`), { exitCode: result.status || 1 });
  }
  const referenceRowsByState = JSON.parse(result.stdout);
  const mismatches = [];
  const states = new Set([...Object.keys(referenceRowsByState), ...Object.keys(rowsByState)]);
  for (const state of [...states].sort()) {
    const refRows = referenceRowsByState[state] ?? [];
    const localRows = rowsByState[state] ?? [];
    const refByField = new Map(refRows.map((row) => [row.field, row]));
    const localByField = new Map(localRows.map((row) => [row.field, row]));
    const fields = new Set([...refByField.keys(), ...localByField.keys()]);
    for (const field of [...fields].sort()) {
      const ref = refByField.get(field);
      const local = localByField.get(field);
      if (!ref || !local) {
        mismatches.push(`${state}: ${field} missing from ${ref ? "mjs" : "python"}`);
        continue;
      }
      for (const key of ["track", "readiness", "referenced", "packet_required"]) {
        if (ref[key] !== local[key]) mismatches.push(`${state}: ${field} ${key} python=${ref[key]} mjs=${local[key]}`);
      }
      const refOutcomes = JSON.stringify(ref.outcomes ?? []);
      const localOutcomes = JSON.stringify(local.outcomes ?? []);
      if (refOutcomes !== localOutcomes) mismatches.push(`${state}: ${field} outcomes python=${refOutcomes} mjs=${localOutcomes}`);
    }
  }
  if (mismatches.length > 0) {
    throw Object.assign(new Error(`Profile-level parity failed against scripts/rcap_screening_audit.py:\n${mismatches.slice(0, 80).join("\n")}`), { exitCode: 1 });
  }
}

function flattenRows(rowsByState) {
  return Object.entries(rowsByState).flatMap(([state, rows]) => rows.map((row) => ({ state, ...row })));
}

function uniqueCandidateFields(rows) {
  return new Set(rows
    .filter((row) => row.track === "DEDUP_DUPLICATE" || row.track === "PACKET_DATA")
    .map((row) => row.field));
}

function walkFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      out.push(...walkFiles(entryPath));
    } else {
      out.push(entryPath);
    }
  }
  return out;
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return undefined;
  const base = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...TS_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...TS_EXTENSIONS.map((ext) => path.join(base, `index${ext}`))
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function importSpecifiers(source) {
  const specs = [];
  for (const match of source.matchAll(/\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g)) specs.push(match[1]);
  for (const match of source.matchAll(/\bexport\s+(?:type\s+)?[^'"]*?\s+from\s+["']([^"']+)["']/g)) specs.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.push(match[1]);
  return specs;
}

function runtimeScanFiles() {
  const files = new Set();
  const queue = [];
  for (const seed of CODE_SCAN_SEEDS) {
    const absolute = path.join(root, seed);
    if (fs.existsSync(absolute)) queue.push(absolute);
  }
  for (const dir of RUNTIME_SCAN_ROOTS) {
    for (const file of walkFiles(path.join(root, dir))) {
      if (TS_EXTENSIONS.includes(path.extname(file)) && PACKET_RELATED_FILE_RE.test(file)) queue.push(file);
    }
  }
  while (queue.length > 0) {
    const file = path.normalize(queue.shift());
    if (files.has(file) || !fs.existsSync(file)) continue;
    files.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const resolved = resolveImport(file, specifier);
      if (resolved) queue.push(resolved);
    }
  }
  return [...files].sort();
}

function stripCommentsPreserveLines(source) {
  let out = "";
  let i = 0;
  let state = "code";
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];
    if (state === "code") {
      if (char === "/" && next === "/") {
        state = "line";
        out += "  ";
        i += 2;
        continue;
      }
      if (char === "/" && next === "*") {
        state = "block";
        out += "  ";
        i += 2;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") {
        state = char;
      }
      out += char;
      i += 1;
      continue;
    }
    if (state === "line") {
      out += char === "\n" ? "\n" : " ";
      if (char === "\n") state = "code";
      i += 1;
      continue;
    }
    if (state === "block") {
      if (char === "*" && next === "/") {
        out += "  ";
        i += 2;
        state = "code";
      } else {
        out += char === "\n" ? "\n" : " ";
        i += 1;
      }
      continue;
    }
    out += char;
    if (char === "\\") {
      out += source[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (char === state) state = "code";
    i += 1;
  }
  return out;
}

function lineForIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}

function location(file, line, reason) {
  return {
    file: path.relative(root, file),
    line,
    reason
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMatches(source, regex) {
  const matches = [];
  for (const match of source.matchAll(regex)) matches.push(match);
  return matches;
}

function scanBlockingReferences(file, source, fields) {
  const stripped = stripCommentsPreserveLines(source);
  const hits = new Map([...fields].map((field) => [field, []]));
  for (const field of fields) {
    const escaped = escapeRegExp(field);
    const patterns = [
      { regex: new RegExp(`\\banswers\\?*\\s*\\.\\s*${escaped}\\b`, "g"), reason: "answers property access" },
      { regex: new RegExp(`\\banswers\\?*\\s*\\[\\s*["']${escaped}["']\\s*\\]`, "g"), reason: "answers bracket access" },
      { regex: new RegExp(`\\b(?:answerText|isAffirmative|isNegative|isUnknownAnswer|hasAnswer)\\s*\\(\\s*answers\\?*\\s*(?:\\.\\s*${escaped}\\b|\\[\\s*["']${escaped}["']\\s*\\])`, "g"), reason: "answer helper call" },
      { regex: new RegExp(`\\b(?:getAnswer|readAnswer|answerFor|valueFor|packetValue|fieldValue)\\s*\\([^\\n)]*["']${escaped}["']`, "g"), reason: "field-id helper call" },
      { regex: new RegExp(`\\b(?:const|let|var)\\s*\\{[^}\\n]*\\b${escaped}\\b[^}\\n]*\\}\\s*=\\s*answers\\b`, "g"), reason: "answers destructuring" }
    ];
    for (const pattern of patterns) {
      for (const match of findMatches(stripped, pattern.regex)) {
        hits.get(field).push(location(file, lineForIndex(stripped, match.index ?? 0), pattern.reason));
      }
    }
  }
  return hits;
}

function scanNonBlockingMentions(file, source, fields) {
  const stripped = stripCommentsPreserveLines(source);
  const hits = new Map([...fields].map((field) => [field, []]));
  for (const field of fields) {
    const regex = new RegExp(`["']${escapeRegExp(field)}["']`, "g");
    for (const match of findMatches(stripped, regex)) {
      hits.get(field).push(location(file, lineForIndex(stripped, match.index ?? 0), "non-blocking field-id mention"));
    }
  }
  return hits;
}

function scanIndeterminate(file, source, candidateFields) {
  const stripped = stripCommentsPreserveLines(source);
  const locations = [];
  const patterns = [
    { regex: /\banswers\s*\[\s*(?!["'`])([^\]\n]+)\]/g, reason: "computed answers key" },
    { regex: /\b(?:answerText|isAffirmative|isNegative|isUnknownAnswer|hasAnswer)\s*\(\s*answers\s*\[\s*(?!["'`])([^\]\n]+)\]/g, reason: "helper call with computed answers key" }
  ];
  for (const pattern of patterns) {
    for (const match of findMatches(stripped, pattern.regex)) {
      locations.push(location(file, lineForIndex(stripped, match.index ?? 0), `${pattern.reason}: ${match[1].trim()}`));
    }
  }
  if (locations.length === 0) return new Map([...candidateFields].map((field) => [field, []]));
  return new Map([...candidateFields].map((field) => [field, locations]));
}

function dedupeLocations(locations) {
  const seen = new Set();
  const out = [];
  for (const loc of locations) {
    const key = `${loc.file}:${loc.line}:${loc.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(loc);
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.reason.localeCompare(b.reason));
}

function applyCodeScan(rowsByState) {
  const rows = flattenRows(rowsByState);
  const allFields = new Set(rows.map((row) => row.field));
  const candidateFields = uniqueCandidateFields(rows);
  const codeReferenceByField = new Map([...allFields].map((field) => [field, []]));
  const nonBlockingByField = new Map([...candidateFields].map((field) => [field, []]));
  const indeterminateByField = new Map([...candidateFields].map((field) => [field, []]));

  for (const file of runtimeScanFiles()) {
    const source = fs.readFileSync(file, "utf8");
    const blocking = scanBlockingReferences(file, source, allFields);
    const indeterminate = scanIndeterminate(file, source, candidateFields);
    for (const field of allFields) {
      codeReferenceByField.get(field).push(...(blocking.get(field) ?? []));
    }
    for (const field of candidateFields) {
      indeterminateByField.get(field).push(...(indeterminate.get(field) ?? []));
    }
  }

  for (const relative of NON_BLOCKING_SCAN_FILES) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) continue;
    const mentions = scanNonBlockingMentions(file, fs.readFileSync(file, "utf8"), candidateFields);
    for (const field of candidateFields) {
      nonBlockingByField.get(field).push(...(mentions.get(field) ?? []));
    }
  }

  const enriched = {};
  for (const [state, stateRows] of Object.entries(rowsByState)) {
    enriched[state] = stateRows.map((row) => {
      const isCandidate = row.track === "DEDUP_DUPLICATE" || row.track === "PACKET_DATA";
      const codeLocations = dedupeLocations(codeReferenceByField.get(row.field) ?? []);
      const indeterminateLocations = isCandidate ? dedupeLocations(indeterminateByField.get(row.field) ?? []) : [];
      const nonBlockingMentions = isCandidate ? dedupeLocations(nonBlockingByField.get(row.field) ?? []) : [];
      const profileClean = !row.referenced && !row.packet_required && (row.track === "DEDUP_DUPLICATE" || row.track === "PACKET_DATA" || row.track === "READINESS_GAUGE");
      let finalStatus = row.track === "ELIGIBILITY" ? "blocked - profile eligibility" : "profile-clean";
      if (row.packet_required) finalStatus = "blocked - packet-required";
      if (row.referenced) finalStatus = "blocked - rule-referenced";
      if (profileClean && codeLocations.length > 0) finalStatus = "blocked - code read-path";
      if (profileClean && indeterminateLocations.length > 0) finalStatus = "indeterminate - manual review";
      return {
        state,
        ...row,
        code_referenced: codeLocations.length > 0,
        code_reference_locations: codeLocations,
        non_blocking_mentions: nonBlockingMentions,
        indeterminate: indeterminateLocations.length > 0,
        indeterminate_locations: indeterminateLocations,
        final_status: finalStatus
      };
    });
  }
  return enriched;
}

function totals(rowsByState) {
  const counts = Object.fromEntries(TRACKS.map((track) => [track, 0]));
  const statesWith = Object.fromEntries(TRACKS.map((track) => [track, new Set()]));
  for (const [state, rows] of Object.entries(rowsByState)) {
    for (const row of rows) {
      counts[row.track] += 1;
      statesWith[row.track].add(state);
    }
  }
  return { counts, statesWith };
}

function collectSections(rowsByState) {
  const rows = flattenRows(rowsByState);
  return {
    readinessBlocked: rows.filter((row) => row.readiness && row.track === "ELIGIBILITY"),
    codeDowngrades: rows.filter((row) => row.final_status === "blocked - code read-path"),
    indeterminate: rows.filter((row) => row.indeterminate),
    nonBlocking: rows.filter((row) => row.non_blocking_mentions?.length > 0)
  };
}

function printLocations(locations, prefix = "      ") {
  for (const loc of locations) {
    console.log(`${prefix}${loc.file}:${loc.line} (${loc.reason})`);
  }
}

function runHumanReport(rowsByState) {
  const { counts, statesWith } = totals(rowsByState);
  const { readinessBlocked, codeDowngrades, indeterminate, nonBlocking } = collectSections(rowsByState);
  console.log("==============================================================================");
  console.log("RCAP RULE-GROUNDED SCREENING-FRICTION AUDIT");
  console.log("Profile parity: matched scripts/rcap_screening_audit.py before code read-path scan");
  console.log("==============================================================================");
  console.log(`${"ST".padEnd(4)}${"DEDUP".padEnd(8)}${"PACKET".padEnd(8)}${"READY".padEnd(7)}${"ELIG".padEnd(6)}`);
  console.log("------------------------------------------------------------------------------");
  for (const state of Object.keys(rowsByState).sort()) {
    const rows = rowsByState[state];
    const count = Object.fromEntries(TRACKS.map((track) => [track, rows.filter((row) => row.track === track).length]));
    console.log(`${state.padEnd(4)}${String(count.DEDUP_DUPLICATE).padEnd(8)}${String(count.PACKET_DATA).padEnd(8)}${String(count.READINESS_GAUGE).padEnd(7)}${String(count.ELIGIBILITY).padEnd(6)}`);
  }
  console.log("------------------------------------------------------------------------------");
  console.log("TOTALS");
  console.log(`  DEDUP_DUPLICATE : ${String(counts.DEDUP_DUPLICATE).padStart(4)} across ${statesWith.DEDUP_DUPLICATE.size} states`);
  console.log(`  PACKET_DATA     : ${String(counts.PACKET_DATA).padStart(4)} across ${statesWith.PACKET_DATA.size} states`);
  console.log(`  READINESS_GAUGE : ${String(counts.READINESS_GAUGE).padStart(4)} across ${statesWith.READINESS_GAUGE.size} states`);
  console.log(`  ELIGIBILITY     : ${String(counts.ELIGIBILITY).padStart(4)} across ${statesWith.ELIGIBILITY.size} states`);
  console.log("");
  console.log("Readiness fields also eligibility-blocked:");
  if (readinessBlocked.length === 0) {
    console.log("  None.");
  } else {
    for (const row of readinessBlocked) console.log(`  ${row.state}: ${row.field} - readiness gauge, but also rule/stage blocked`);
  }
  console.log("");
  console.log("CODE-REFERENCED downgrades:");
  if (codeDowngrades.length === 0) {
    console.log("  None.");
  } else {
    for (const row of codeDowngrades) {
      console.log(`  ${row.state}: ${row.field} (${row.track})`);
      printLocations(row.code_reference_locations);
    }
  }
  console.log("");
  console.log("INDETERMINATE - MANUAL REVIEW:");
  if (indeterminate.length === 0) {
    console.log("  None.");
  } else {
    for (const row of indeterminate) {
      console.log(`  ${row.state}: ${row.field} (${row.track})`);
      printLocations(row.indeterminate_locations);
    }
  }
  console.log("");
  console.log("NON-BLOCKING MENTION:");
  if (nonBlocking.length === 0) {
    console.log("  None.");
  } else {
    for (const row of nonBlocking) {
      console.log(`  ${row.state}: ${row.field} (${row.track})`);
      printLocations(row.non_blocking_mentions);
    }
  }
  console.log("");
  console.log("REMINDER: profile-clean does not mean proven safe until the code read-path scan passes.");
}

function runCheck(rowsByState, fieldList) {
  const fields = new Set(fieldList.split(",").map((field) => field.trim()).filter(Boolean));
  if (fields.size === 0) {
    console.error("--check requires a comma-separated field list");
    return 2;
  }
  const rows = flattenRows(rowsByState).filter((row) => fields.has(row.field));
  const failures = rows.filter((row) => row.referenced || row.packet_required || row.code_referenced || row.indeterminate);
  if (failures.length > 0) {
    console.log("CHECK FAILED - fields are not safe to move/remove:");
    for (const row of failures.sort((a, b) => a.field.localeCompare(b.field) || a.state.localeCompare(b.state))) {
      const reasons = [];
      if (row.referenced) reasons.push("rule-referenced");
      if (row.packet_required) reasons.push("packet-required");
      if (row.code_referenced) reasons.push("code-referenced");
      if (row.indeterminate) reasons.push("indeterminate");
      console.log(`  ${row.state}: ${row.field} (${reasons.join(", ")})`);
      if (row.code_reference_locations.length > 0) printLocations(row.code_reference_locations, "    ");
      if (row.indeterminate_locations.length > 0) {
        console.log("    Manual review required before moving/removing this field:");
        printLocations(row.indeterminate_locations, "    ");
      }
    }
    return 1;
  }
  console.log(`CHECK PASSED - ${[...fields].sort().join(", ")} are profile-clean and code-read-path clean.`);
  return 0;
}

function parseArgs(argv) {
  const args = [...argv];
  const mode = args.includes("--json") ? "json" : args.includes("--check") ? "check" : "human";
  let checkFields = "";
  if (mode === "check") {
    const index = args.indexOf("--check");
    checkFields = args[index + 1] ?? "";
    args.splice(index, checkFields ? 2 : 1);
  }
  const profilesPath = args.find((arg) => !arg.startsWith("--")) ?? defaultProfilesPath;
  return {
    mode,
    checkFields,
    profilesPath: path.resolve(root, profilesPath)
  };
}

function main() {
  const { mode, checkFields, profilesPath } = parseArgs(process.argv.slice(2));
  const profileRows = classifyAll(profilesPath);
  assertReferenceParity(profilesPath, profileRows);
  const rowsByState = applyCodeScan(profileRows);
  if (mode === "json") {
    console.log(JSON.stringify(rowsByState, null, 2));
    return 0;
  }
  if (mode === "check") return runCheck(rowsByState, checkFields);
  runHumanReport(rowsByState);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(error?.exitCode ?? 1);
  }
}

export {
  BLOCKING_OUTCOMES,
  ELIGIBILITY_STAGES,
  LOGISTICS_STAGES,
  NEVER_MOVE,
  READINESS_FIELDS,
  RULE_KEYS,
  TWIN,
  classify,
  referencedFields,
  packetInputIds
};
