/**
 * Public state-profile projection — structural leak verifier (all 50 states + DC).
 *
 *   npm run expungement:verify-public-profile-projection
 *
 * GET /api/expungement-ai/profiles/[state] is served ANONYMOUSLY, with no auth and no rate limit.
 * It previously passed `copyGuardrails` through verbatim from the compiled engine profile, and in
 * several profiles that field holds raw internal source-corpus material (source document filenames,
 * internal drafting/training instructions, research prose). This verifier is the standing guard.
 *
 * THE PRIMARY CONTROL IS STRUCTURAL, NOT LEXICAL.
 * The payload for every jurisdiction is walked to full depth and EVERY key path is compared against
 * an approved schema. An unapproved key fails the run even when its value is completely innocuous.
 * That is deliberate: a value-based blocklist only catches the leaks we already know about, and the
 * original bug was a field nobody thought to look at. A future `internalNotes`, `sourceCorpus`, or
 * `reviewInstructions` fails here on the key alone.
 *
 * The marker scan at the end is defense in depth ONLY. It exists to catch a leak that somehow
 * arrives inside an already-approved field (e.g. internal prose pasted into a question prompt).
 */

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");

// ---------------------------------------------------------------------------------------------
// The approved public schema. Every key served anonymously is named here, and nowhere else.
//
// Node kinds:
//   obj(fields)  - object with a fixed, approved key set
//   arr(item)    - array; each element validated against `item`
//   map(value)   - object with DYNAMIC keys (option ids); each value validated against `value`
//   leaf         - value is not walked further (strings, numbers, booleans, string[])
// ---------------------------------------------------------------------------------------------
const leaf = { kind: "leaf" };
const obj = (fields, required = []) => ({ kind: "obj", fields, required });
const arr = (item) => ({ kind: "arr", item });
const map = (value) => ({ kind: "map", value });

const TRANSLATION_BLOCK = obj({
  es: obj({ prompt: leaf, helperText: leaf, label: leaf })
});

const QUESTION = obj(
  {
    id: leaf,
    stage: leaf,
    prompt: leaf,
    helperText: leaf,
    type: leaf,
    required: leaf,
    contextOnly: leaf,
    doesNotSelectPathway: leaf,
    lifecyclePhase: leaf,
    options: leaf,
    optionDisplay: map(
      obj({
        label: leaf,
        helperText: leaf,
        translations: TRANSLATION_BLOCK
      })
    ),
    translations: TRANSLATION_BLOCK
  },
  ["id", "stage", "prompt", "type", "required"]
);

const PUBLIC_PROFILE_SCHEMA = obj(
  {
    schemaVersion: leaf,
    profileVersion: leaf,
    jurisdiction: obj({ code: leaf, name: leaf, slug: leaf }, ["code", "name", "slug"]),
    terminology: obj(
      {
        primaryConsumerTerm: leaf,
        allowedStateTerms: leaf,
        avoidUniversalExpungementLabel: leaf
      },
      ["primaryConsumerTerm", "allowedStateTerms"]
    ),
    flowStages: arr(
      obj({ order: leaf, id: leaf, questionIds: leaf, screenType: leaf }, ["order", "id", "questionIds", "screenType"])
    ),
    questions: arr(QUESTION),
    postPaymentPacketCompletion: obj({
      requiredPacketCompletionFields: arr(QUESTION),
      officialFormFields: arr(QUESTION),
      customPleadingFields: arr(QUESTION),
      externalDocumentChecklist: arr(QUESTION),
      filingReadinessFields: arr(QUESTION),
      serviceOrMailingFields: arr(QUESTION),
      narrativeFields: arr(QUESTION),
      optionalFields: arr(QUESTION)
    }),
    // Not currently emitted by any jurisdiction (no designer fixture defines it), but approved in
    // the public contract as { value, label } only — the engine option also carries
    // `candidatePathways`, which is internal routing data and must never be served.
    caseOutcomeOptions: arr(obj({ value: leaf, label: leaf }, ["value", "label"]))
  },
  ["schemaVersion", "profileVersion", "jurisdiction", "terminology", "flowStages", "questions"]
);

/**
 * Internal keys that must never appear at ANY depth. This is a redundant second net — the schema
 * walk above already rejects any unapproved key — but it names the specific fields we know are
 * dangerous, so a regression produces an obvious, self-explaining failure.
 */
const FORBIDDEN_KEYS = [
  "copyGuardrails",
  "source",
  "sourceCorpus",
  "sourceCorpusSha256",
  "sourceCorpusChars",
  "sourceSections",
  "sourcePolicy",
  "sourceRef",
  "sourceEvidenceRefs",
  "references",
  "allFolderFiles",
  "qa",
  "reviewStatus",
  "reviewInstructions",
  "reviewerNotes",
  "internalNotes",
  "developerNotes",
  "pathways",
  "orderedDecisionRules",
  "waitingPeriodRules",
  "exclusionRules",
  "ruleClauses",
  "lawrenceRatification",
  "packetGenerator",
  "generatorSelectionContract",
  "formInventory",
  "formCandidates",
  "feeRules",
  "resultPresentationContract",
  "frontendContract",
  "frontendBranch",
  "frontendAction",
  "candidatePathways",
  "sha256",
  "prompt_template",
  "modelInstructions",
  "confidence",
  "riskNotes"
];

// ---------------------------------------------------------------------------------------------
// 1. Every jurisdiction resolves, and the payload matches the approved schema exactly.
// ---------------------------------------------------------------------------------------------
const profiles = getAllJurisdictionProfiles();
assert(profiles.length === 51, `Expected 51 compiled jurisdictions (50 states + DC), got ${profiles.length}.`);

const seenCodes = new Set();
let checkedKeyPaths = 0;

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  seenCodes.add(code);

  const publicProfile = projectPublicProfile(profile);
  assert(Boolean(publicProfile), `${code}: projectPublicProfile returned nothing.`);
  if (!publicProfile) continue;

  // Validate the SERIALIZED payload — that is exactly what an anonymous caller receives, and
  // JSON.stringify drops `undefined`, so this cannot be fooled by a key that is present-but-undefined.
  const wire = JSON.parse(JSON.stringify(publicProfile));

  checkedKeyPaths += validateAgainstSchema(wire, PUBLIC_PROFILE_SCHEMA, code, "$");
  assertNoForbiddenKeys(wire, code, "$");

  // The public payload must not be (or contain) the full internal profile.
  assert(
    !("pathways" in wire) && !("qa" in wire) && !("source" in wire),
    `${code}: public payload contains top-level internal sections.`
  );
  assert(
    JSON.stringify(wire) !== JSON.stringify(profile),
    `${code}: the public projection is identical to the full internal profile.`
  );
  assert(
    Object.keys(wire).length < Object.keys(profile).length,
    `${code}: the public payload has as many top-level keys as the internal profile (${Object.keys(wire).length} vs ${Object.keys(profile).length}) — it is probably not projecting.`
  );
}

assert(seenCodes.has("DC"), "Washington, D.C. must be covered.");
const EXPECTED_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY"
];
for (const code of EXPECTED_CODES) {
  assert(seenCodes.has(code), `Missing jurisdiction ${code}.`);
}

// ---------------------------------------------------------------------------------------------
// 2. Regression guard: the exact leak that prompted this fix.
// ---------------------------------------------------------------------------------------------
for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  const wire = JSON.stringify(projectPublicProfile(profile));

  assert(
    !wire.includes("copyGuardrails"),
    `${code}: copyGuardrails is present in the public payload (this is the original leak).`
  );

  // The engine profile's own copyGuardrails content must not appear anywhere in the payload, even
  // smuggled into an approved field. Compare on a substantial slice so we are matching real prose
  // rather than an incidental short word.
  for (const guardrail of profile.copyGuardrails ?? []) {
    if (typeof guardrail !== "string" || guardrail.length < 60) continue;
    const fingerprint = guardrail.slice(0, 60);
    assert(
      !wire.includes(fingerprint),
      `${code}: internal copyGuardrails prose appears in the public payload.`
    );
  }

  // Source document filenames and hashes from the internal corpus must not appear.
  for (const reference of profile.source?.references ?? []) {
    if (typeof reference?.fileName === "string" && reference.fileName.length > 8) {
      assert(
        !wire.includes(reference.fileName),
        `${code}: internal source filename leaked into the public payload.`
      );
    }
    if (typeof reference?.sha256 === "string" && reference.sha256.length > 16) {
      assert(!wire.includes(reference.sha256), `${code}: internal source hash leaked into the public payload.`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// 3. Defense-in-depth marker scan (supplementary — the schema walk above is the real control).
//
// Scoped to avoid false positives against legitimate user-facing copy: a question may legitimately
// say "instructions from the court", and "prompt" is an approved KEY. So markers are matched only
// against payload VALUES, and filename markers only where the value actually looks like a filename.
// ---------------------------------------------------------------------------------------------
const PHRASE_MARKERS = [
  "copyguardrails",
  "train wilma",
  "core logic",
  "source corpus",
  "source file",
  "source filename",
  "internal only",
  "internal-only",
  "developer note",
  "do not ship",
  "agent training",
  "training reference",
  "wilma route",
  "model instruction",
  "system prompt"
];

const FILENAME_PATTERN = /[\w-]+\.(pdf|rtf|docx?|json|ts|tsx|md|csv|xlsx?)\b/i;
const SHA256_PATTERN = /\b[a-f0-9]{64}\b/i;
const FILE_PATH_PATTERN = /(?:^|\s)(?:\/[\w.-]+){2,}|[A-Za-z]:\\/;

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  const wire = JSON.parse(JSON.stringify(projectPublicProfile(profile)));

  for (const { path: valuePath, value } of stringValues(wire, "$")) {
    const lower = value.toLowerCase();

    for (const marker of PHRASE_MARKERS) {
      assert(
        !lower.includes(marker),
        `${code}: internal marker "${marker}" found in public value at ${valuePath}.`
      );
    }

    assert(!FILENAME_PATTERN.test(value), `${code}: a value at ${valuePath} looks like an internal filename.`);
    assert(!SHA256_PATTERN.test(value), `${code}: a value at ${valuePath} looks like a sha256 hash.`);
    assert(!FILE_PATH_PATTERN.test(value), `${code}: a value at ${valuePath} looks like a filesystem path.`);
  }
}

// ---------------------------------------------------------------------------------------------
// 4. The projection is allowlist-by-construction (source shape, not just current output).
// ---------------------------------------------------------------------------------------------
const fs = await import("node:fs");
const projectionSource = fs.readFileSync(
  path.join(rootDir, "src/lib/rcap-engine/public-profile-projection.ts"),
  "utf8"
);
const projectionCode = projectionSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

assert(
  projectionCode.includes("function toPublicJurisdictionProfile"),
  "The projection must funnel through an explicit allowlist mapper."
);
assert(
  !/copyGuardrails/.test(projectionCode),
  "The projection code must not reference copyGuardrails at all."
);
// The classic anti-patterns this fix exists to prevent.
assert(
  !/\.\.\.\s*profile\s*[,}]/.test(projectionCode.split("function toPublicJurisdictionProfile")[1] ?? ""),
  "The allowlist mapper must not spread the source profile."
);
assert(
  !/\bdelete\s+\w+\.(copyGuardrails|qa|source)\b/.test(projectionCode),
  "The projection must not clone-then-delete internal keys; it must build a fresh public object."
);

const routeSource = fs.readFileSync(
  path.join(rootDir, "src/app/api/expungement-ai/profiles/[state]/route.ts"),
  "utf8"
);
assert(
  routeSource.includes("projectPublicProfile(profile)"),
  "The public route must serialize projectPublicProfile(profile) and nothing else."
);
assert(
  !/NextResponse\.json\(\s*profile\b/.test(routeSource),
  "The public route must never serialize the raw engine profile."
);

// ---------------------------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------------------------
if (failures.length) {
  console.error("Public state-profile projection verification failed:");
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`- ...and ${failures.length - 40} more.`);
  process.exit(1);
}

console.log("Public state-profile projection verification passed.");
console.log(`Structural allowlist: ${checkedKeyPaths} key paths across all 51 jurisdictions (50 states + DC) validated`);
console.log("  against the approved public schema. An unapproved key fails on the key alone, regardless of its value.");
console.log("Leak regression: copyGuardrails is absent, and no copyGuardrails prose, source filename, or source hash");
console.log("  from any compiled profile appears anywhere in the serialized payload.");
console.log("Defense in depth: no value looks like a filename, a sha256, a filesystem path, or internal drafting prose.");
console.log("Construction: the projection funnels through an explicit allowlist mapper — no spread, no clone-then-delete.");

// ---------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------

/** Walk a payload against the approved schema. Returns the number of key paths checked. */
function validateAgainstSchema(value, schema, code, at) {
  let count = 0;

  if (schema.kind === "leaf") {
    return count;
  }

  if (schema.kind === "arr") {
    if (!Array.isArray(value)) {
      failures.push(`${code}: expected an array at ${at}, got ${typeof value}.`);
      return count;
    }
    value.forEach((item, index) => {
      count += validateAgainstSchema(item, schema.item, code, `${at}[${index}]`);
    });
    return count;
  }

  if (schema.kind === "map") {
    if (!isPlainObject(value)) {
      failures.push(`${code}: expected an object map at ${at}.`);
      return count;
    }
    for (const [key, child] of Object.entries(value)) {
      count += 1;
      count += validateAgainstSchema(child, schema.value, code, `${at}.${key}`);
    }
    return count;
  }

  // obj
  if (!isPlainObject(value)) {
    failures.push(`${code}: expected an object at ${at}, got ${Array.isArray(value) ? "array" : typeof value}.`);
    return count;
  }

  for (const key of schema.required ?? []) {
    if (!(key in value)) {
      failures.push(`${code}: required public field ${at}.${key} is missing.`);
    }
  }

  for (const [key, child] of Object.entries(value)) {
    count += 1;
    const childSchema = schema.fields[key];
    if (!childSchema) {
      // THE PRIMARY CONTROL.
      failures.push(
        `${code}: UNAPPROVED FIELD "${key}" at ${at}.${key} is being served publicly. ` +
          `Add it to the allowlist in public-profile-projection.ts and to this verifier's schema, or remove it.`
      );
      continue;
    }
    count += validateAgainstSchema(child, childSchema, code, `${at}.${key}`);
  }

  return count;
}

function assertNoForbiddenKeys(value, code, at) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, code, `${at}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      failures.push(`${code}: forbidden internal key "${key}" present at ${at}.${key}.`);
    }
    assertNoForbiddenKeys(child, code, `${at}.${key}`);
  }
}

/** Every string value in the payload, with its path — for the marker scan. */
function* stringValues(value, at) {
  if (typeof value === "string") {
    yield { path: at, value };
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      yield* stringValues(item, `${at}[${index}]`);
    }
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      yield* stringValues(child, `${at}.${key}`);
    }
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
