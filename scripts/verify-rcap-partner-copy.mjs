#!/usr/bin/env node
// Partner-facing copy gate for the RCAP onboarding experience.
//
// Everything a partner administrator, partner staff member, invited administrator or
// prospective partner can read has to sound like it was written for a program leader.
// This verifier reads the surfaces they actually see - rendered JSX, the presentation
// contracts those surfaces read from, branded email HTML and plain text, and the
// accessibility text a screen reader announces - and fails when internal engineering
// vocabulary reaches any of them.
//
// It is deliberately value-oriented rather than file-oriented. A record whose KEY is
// `not_started` is the storage vocabulary and is fine; a record whose VALUE is
// "not_started" is machine language rendered at a partner, and is not.
//
//   node scripts/verify-rcap-partner-copy.mjs
//   node scripts/verify-rcap-partner-copy.mjs --json

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonMode = process.argv.includes("--json");

/* ------------------------------------------------------------------ surfaces */

// Directories whose rendered output a partner can reach. Internal operator surfaces
// (`/internal/**`) are excluded on purpose: engineering vocabulary is correct there.
const SURFACE_DIRS = [
  "src/app/partner",
  "src/app/partners",
  "src/app/p",
  "src/components/partners"
];

// Contract modules that produce partner-rendered copy. These are pure copy surfaces, so
// every multi-word literal in them is treated as rendered text (see rule 5). That is what
// catches wording split across a multi-line ternary, which the line-oriented rules miss.
const SURFACE_FILES = [
  "src/lib/partners/onboarding/partner-labels.ts",
  "src/lib/partners/onboarding/implementation-presentation.ts",
  "src/lib/partners/onboarding/review-presentation.ts",
  "src/lib/partners/onboarding/brand-page-presentation.ts",
  "src/lib/partners/onboarding/partner-copy.ts",
  "src/lib/partners/onboarding/support-contact.ts",
  "src/lib/partners/onboarding/derivations.ts",
  "src/lib/partners/onboarding/launch-readiness.ts",
  // The 42 guided tasks. Their titles and descriptions are read straight onto the
  // onboarding home, the section editor and the review page.
  "src/lib/partners/onboarding/guided-substeps.ts",
  "src/lib/partners/onboarding/validation.ts",
  "src/lib/partners/first-admin-provisioning-presentation.ts",
  "src/lib/partners/first-admin-invitation-email.ts",
  "src/lib/partners/first-admin-domain.ts",
  "src/lib/partners/partner-launch-materials.ts"
];
const SURFACE_FILE_SET = new Set(SURFACE_FILES);

/* ------------------------------------------------------------- banned things */

// Section 3: internal terms that must never render to a partner.
const INTERNAL_TERMS = [
  "tenant", "tenant id", "partner record", "database", "schema", "rls",
  "service role", "service_role", "rpc", "endpoint", "payload", "request id",
  "expected workspace version", "mutation", "idempotency key", "state machine",
  "enum", "provisioning function", "provisioning status", "source sha", "digest",
  "uuid", "json", "artifact projection", "generated artifact", "snapshot record",
  "migration", "staging", "runtime", "feature flag", "webhook", "provider event",
  "resend", "supabase", "postgres", "vercel", "stack trace", "raw error code"
];

// Terms needing a word boundary and a context allowance, so ordinary English survives.
const INTERNAL_TERMS_BOUNDED = [
  { term: "row", allow: [] },
  { term: "api", allow: [] },
  { term: "transaction", allow: [] },
  { term: "environment", allow: [] },
  { term: "hash", allow: [] },
  // "Policy" is banned in its database sense. A program's own out-of-area policy is
  // ordinary business English and is what a program director would call it.
  { term: "policy", allow: ["privacy policy", "cookie policy", "policies and procedures", "out-of-area policy", "refund policy"] }
];

// Section 1: voice words that flatten the copy or overstate it.
const BANNED_VOICE = [
  "just", "simply", "easy", "effortless", "seamless", "robust", "leverage",
  "unlock", "empower", "action item", "remediation", "resolve", "blocker"
];

// Section 10: exact phrases the requirement names.
const BANNED_PHRASES = [
  "required items",
  "partner blockers",
  "approvals missing",
  "validation failures",
  "unresolved fields",
  "incomplete records",
  "failed validation",
  "blocked by dependency",
  "pending mutation",
  "not provisioned",
  // Found by reading the captured Implementation Center rather than by the rules above:
  // section 6 names these exact phrasings as the ones that must not reach a partner.
  "commercial clearance",
  "commercial step required",
  "complete the requested commercial or procurement step",
  "cleared for setup"
];

// Section 5/6: LegalEase-owned work must never be addressed to the partner.
const OWNERSHIP_MISASSIGNMENT = ["your organization"];

/* ------------------------------------------------------ positive requirements */

// Section 10: copy that must be present somewhere in the contract layer.
const REQUIRED_COPY = [
  "Your starting setup is ready to review",
  "Review prepared setup",
  "Prepared by LegalEase",
  "Needs your input",
  "Optional",
  "Your setup is partly prepared",
  "Your setup is ready for final review",
  "Ready to confirm this section?",
  "Confirm this section",
  "Program terms are being finalized",
  "One agreement step needs your attention",
  "Program terms confirmed",
  "Changes saved",
  "We could not save your changes",
  "This section was updated in another session",
  "Please sign in again to continue",
  "We could not send the invitation",
  "Sign in with the invited email address"
];

/* ----------------------------------------------------------------- extraction */

function walk(dir, out = []) {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs)) {
    const rel = path.join(dir, entry);
    const st = statSync(path.join(root, rel));
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(rel, out);
    } else if (/\.(tsx?|mjs)$/.test(entry)) {
      out.push(rel);
    }
  }
  return out;
}

function line_of(text, index) {
  return text.slice(0, index).split("\n").length;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/.*$/gm, "");
}

// Property names whose string values are read by a partner.
const COPY_PROPS =
  "label|title|description|heading|body|summary|detail|message|blocker|nextAction|" +
  "actionLabel|placeholder|alt|caption|helpText|supporting|explanation|owner|status|" +
  "primaryAction|subtitle|text|copy|hint|error|notice|banner|cta|dateFallback|whyItMatters";

const ATTR_PROPS = "aria-label|aria-description|aria-roledescription|title|alt|placeholder";

// Property names carrying internal identifiers rather than copy. Their values are read by
// LegalEase tooling and by tests, never rendered at a partner, and they are snake_case on
// purpose.
const NON_COPY_PROPS = /\b(?:reference|event|key|id|slug|testId|href|path|route|code|name|stable_row_id|dataKey|fieldPath)\s*:\s*$/;

// A rendered candidate: the human-readable string plus where it came from.
function extractCandidates(rel, source) {
  const clean = stripComments(source);
  const lines = clean.split("\n");
  const found = [];
  const push = (line, text) => {
    const t = text.trim();
    if (!t) return;
    // Ignore anything that is plainly not prose: paths, classNames, identifiers, urls.
    if (/^[./#@]/.test(t)) return;
    if (/^https?:\/\//.test(t)) return;
    if (/^[a-z0-9-]+(\/[a-z0-9-]+)+$/i.test(t)) return;
    if (/^[a-zA-Z0-9_$-]+$/.test(t) && !/\s/.test(t)) return;
    if (!/[a-zA-Z]/.test(t)) return;
    // What sits inside `${...}` is an expression, not copy. `row-${rowIndex + 1}` is a
    // key, and `${mode === "invite_only" ? ... }` is a comparison. Judge the prose the
    // partner actually reads, and drop the candidate if no prose survives.
    const prose = t.replace(/\$\{[^}]*\}/g, " ").trim();
    if (prose.split(/\s+/).filter(Boolean).length < 2) return;
    found.push({ line, text: t, prose });
  };

  lines.forEach((raw, i) => {
    const n = i + 1;
    if (/^\s*import\s|^\s*export\s+\*|require\(/.test(raw)) return;
    // Server-side logging, audit events and telemetry are internal by definition. Their
    // event names are snake_case on purpose and no partner ever reads them.
    if (/log(?:Security)?(?:Warn|Info|Error|Debug)\s*\(|console\.(?:log|warn|error|info|debug)\s*\(|captureException\s*\(/.test(raw)) {
      return;
    }

    // 1. accessibility + tooltip attributes
    const attrRe = new RegExp(`(?:${ATTR_PROPS})\\s*=\\s*(?:"([^"]+)"|'([^']+)'|\\{\`([^\`]+)\`\\}|\\{"([^"]+)"\\})`, "g");
    let m;
    while ((m = attrRe.exec(raw))) push(n, m[1] ?? m[2] ?? m[3] ?? m[4] ?? "");

    // 1b. copy-bearing JSX attributes  (label="Partner blockers")
    // These are not object properties and not accessibility attributes, so neither rule
    // above saw them. "Partner blockers" and "Approvals missing" both reached the review
    // page through this gap.
    const jsxAttrRe = new RegExp(`\\b(?:${COPY_PROPS})\\s*=\\s*(?:"([^"]+)"|'([^']+)'|\\{"([^"]+)"\\}|\\{\`([^\`]+)\`\\})`, "g");
    while ((m = jsxAttrRe.exec(raw))) push(n, m[1] ?? m[2] ?? m[3] ?? m[4] ?? "");

    // 2. copy-bearing object properties  (label: "...")
    const propRe = new RegExp(`\\b(?:${COPY_PROPS})\\s*:\\s*(?:"([^"]*)"|'([^']*)'|\`([^\`]*)\`)`, "g");
    while ((m = propRe.exec(raw))) push(n, m[1] ?? m[2] ?? m[3] ?? "");

    // 3. single-line JSX text nodes. Multi-line ones are handled after this loop.
    const jsxRe = />([^<>{}\n]{4,})</g;
    while ((m = jsxRe.exec(raw))) push(n, m[1]);

    // 4a. returned string literals in presentation modules
    const returnRe = /\breturn\s+(?:"([^"]{6,})"|'([^']{6,})'|`([^`]{6,})`)/g;
    while ((m = returnRe.exec(raw))) push(n, m[1] ?? m[2] ?? m[3] ?? "");

    // 4b. ternary arms. Gated on the line actually containing a `?` so that ordinary
    // object properties such as `event: "partner_team_invite denied"` are not mistaken
    // for rendered copy. Copy-bearing properties are already covered by rule 2.
    // A wrapped ternary puts `?` on one line and `:` on the next, so the arm alone looks
    // like an ordinary object property. Treat a line that *starts* with `:` as an arm when
    // the preceding line opened a ternary. "Start with blockers, changes, and decisions."
    // sat in exactly that shape and the gate walked past it.
    const prevLine = i > 0 ? lines[i - 1] : "";
    const wrappedTernaryArm = /^\s*[?:]\s*(?:"|'|`)/.test(raw) && /\?|:/.test(prevLine);
    if (/\?/.test(raw) || wrappedTernaryArm) {
      const ternaryRe = /[?:]\s*(?:"([^"]{6,})"|'([^']{6,})'|`([^`]{6,})`)/g;
      while ((m = ternaryRe.exec(raw))) push(n, m[1] ?? m[2] ?? m[3] ?? "");
    }

    // 5. contract modules are pure copy: every multi-word literal is rendered text,
    // wherever it sits in an expression. This is what sees a ternary arm that lives on
    // its own line, which every line-oriented rule above walks straight past.
    if (SURFACE_FILE_SET.has(rel)) {
      // A property name and its value routinely sit on separate lines once prettier has
      // wrapped them, so the preceding line counts as context too. Without this,
      // `reference:\n  "support_referrals_reporting..."` reads as rendered copy.
      const prev = i > 0 ? lines[i - 1].trimEnd() : "";
      const inheritsNonCopy = NON_COPY_PROPS.test(prev) && /^\s*(?:"|'|`)/.test(raw);
      const anyRe = /(?:"([^"]{8,})"|'([^']{8,})'|`([^`]{8,})`)/g;
      while ((m = anyRe.exec(raw))) {
        const t = m[1] ?? m[2] ?? m[3] ?? "";
        if (inheritsNonCopy || NON_COPY_PROPS.test(raw.slice(0, m.index))) continue;
        if (t.trim().split(/\s+/).length >= 3) push(n, t);
      }
    }
  });

  // 6. JSX text that prettier wrapped across several lines. A paragraph is one sentence to
  // the partner reading it, so it has to be judged as one string: the worst copy on the
  // checkout page sat in a three-line <p> and every line-oriented rule walked past it.
  const blockRe = />([^<>{}]{12,}?)</g;
  let bm;
  while ((bm = blockRe.exec(clean))) {
    const rawText = bm[1];
    if (!rawText.includes("\n")) continue;
    // `=>` opens an arrow function, not a JSX element, and everything after it is code.
    if (clean[bm.index - 1] === "=" || clean[bm.index - 1] === "-") continue;
    const collapsed = rawText.replace(/\s+/g, " ").trim();
    if (collapsed.split(/\s+/).length < 4) continue;
    // Prose carries HTML entities; code carries operators, calls and quotes. Decode the
    // entities, then reject anything still holding characters prose does not contain.
    const decoded = collapsed.replace(/&(?:[a-zA-Z]+|#\d+);/g, "'");
    if (/[;={}()[\]"`|]|&&|\|\|/.test(decoded)) continue;
    push(line_of(clean, bm.index), collapsed);
  }

  return found;
}

/* -------------------------------------------------------------------- checks */

const findings = [];
function fail(file, line, rule, text) {
  findings.push({ file, line, rule, text: text.slice(0, 160) });
}

function checkCandidate(file, line, prose, original = prose) {
  const text = prose;
  const lower = prose.toLowerCase();
  const report = original;

  for (const term of INTERNAL_TERMS) {
    if (lower.includes(term)) fail(file, line, `internal-term:${term}`, report);
  }
  for (const { term, allow } of INTERNAL_TERMS_BOUNDED) {
    const re = new RegExp(`\\b${term}s?\\b`, "i");
    if (re.test(lower) && !allow.some((a) => lower.includes(a))) {
      fail(file, line, `internal-term:${term}`, report);
    }
  }
  for (const w of BANNED_VOICE) {
    if (new RegExp(`\\b${w}(s|d|ing)?\\b`, "i").test(lower)) {
      fail(file, line, `voice:${w}`, report);
    }
  }
  for (const p of BANNED_PHRASES) {
    if (lower.includes(p)) fail(file, line, `phrase:${p}`, report);
  }
  // "Your organization" is ordinary prose on the public marketing pages, where it simply
  // addresses the reader. It is only a misassignment inside the authenticated workspace,
  // where it names who owns a step and can hand LegalEase's work to the partner.
  if (!file.startsWith("src/app/partners/")) {
    for (const o of OWNERSHIP_MISASSIGNMENT) {
      if (lower.includes(o)) fail(file, line, `ownership:${o}`, report);
    }
  }
  if (text.includes("—")) fail(file, line, "em-dash", report);
  if (/\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b/.test(text)) fail(file, line, "snake_case", report);
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) {
    fail(file, line, "raw-uuid", report);
  }
  if (/\b[0-9a-f]{40}\b|\b[0-9a-f]{64}\b/i.test(text)) fail(file, line, "sha-or-digest", report);
  if (/^\s*[{[].*[}\]]\s*$/.test(text) && /":/.test(text)) fail(file, line, "raw-json", report);
  if (/\bTODO\b|\bTBD\b|\bFIXME\b|lorem ipsum|placeholder copy/i.test(text)) {
    fail(file, line, "placeholder", report);
  }
}

/* ---------------------------------------------------------------------- run */

const files = [
  ...SURFACE_DIRS.flatMap((d) => walk(d)),
  ...SURFACE_FILES.filter((f) => existsSync(path.join(root, f)))
];

let candidateCount = 0;
const corpus = [];

for (const rel of files) {
  const source = readFileSync(path.join(root, rel), "utf8");
  corpus.push(source);
  for (const { line, text, prose } of extractCandidates(rel, source)) {
    candidateCount += 1;
    checkCandidate(rel, line, prose, text);
  }
}

const allCopy = corpus.join("\n");
const missingRequired = REQUIRED_COPY.filter((c) => !allCopy.includes(c));

/* ------------------------------------------------------------------- report */

const byRule = findings.reduce((acc, f) => {
  const key = f.rule.split(":")[0];
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

const passed = findings.length === 0 && missingRequired.length === 0;

if (jsonMode) {
  console.log(JSON.stringify({ passed, filesScanned: files.length, candidateCount, byRule, findings, missingRequired }, null, 2));
} else {
  console.log(`partner-facing copy gate`);
  console.log(`  files scanned      ${files.length}`);
  console.log(`  strings inspected  ${candidateCount}`);
  console.log(`  violations         ${findings.length}`);
  for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${rule.padEnd(18)} ${n}`);
  }
  console.log(`  required copy missing ${missingRequired.length}`);
  for (const c of missingRequired) console.log(`    - ${c}`);
  if (findings.length) {
    console.log(`\n  first 40 violations:`);
    for (const f of findings.slice(0, 40)) {
      console.log(`    ${f.file}:${f.line}  [${f.rule}]  ${f.text}`);
    }
  }
  console.log(passed ? "\nPASS" : "\nFAIL");
}

process.exit(passed ? 0 : 1);
