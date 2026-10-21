import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

/**
 * The participant never reads our implementation.
 *
 * Every concept on this list is real and necessary inside the system. None of
 * it is the participant's business. Someone deciding whether to spend $50 on
 * court paperwork needs four answers — what is happening, what do I need to
 * do, why are you asking, what happens next — and an internal noun answers
 * none of them. "Render job queued" tells a participant nothing; "We're
 * preparing your packet" tells them everything they need.
 *
 * This is a release gate, not a linter. It runs in the test chain, and a
 * failure blocks the release.
 *
 * What it can and cannot prove: it proves that no banned internal vocabulary
 * reaches a participant surface. It cannot prove the copy is good. Short
 * sentences, clear hierarchy, one consistent voice across screening,
 * Briefcase, review, payment and filing — those are judged by reading the
 * real hosted journey, which `verify-expungement-commercial-browser.mjs`
 * captures surface by surface for exactly that reading. Passing here is
 * necessary and not sufficient, and the two checks are deliberately separate
 * so neither is mistaken for the other.
 */

const ROOT = process.cwd();
const errors = [];
let visibleStrings = 0;

export const prohibitedPatterns = [
  [/\b(?:authoritative (?:result|pathway|route)|canonical source|runtime|route (?:kind|id)|pathway id|profile (?:id|version)|source (?:id|sha)|sha-?256|input hash|renderer(?: kind)?|render job|durable job|delivery-eligible|artifact validated|validation state|queued? job|staging scoped|feature flag|schema (?:key|version)|question id|field id|source key|stored key|exact-match mapping|person binding|matter binding|server-authoritative|payment authority|paymentallowed|payment writer|entitlement source|packet credit|consumption unit|briefcase item|result code|typed stop|compiled pathway|participant treatment|event replay|provider event|session id|internal implementation|acceptance environment|test identity)\b/i, "internal implementation phrase"],
  [/\b(?:packet_ready(?:_with_caution)?|guidance_only|needs_more_info|not_yet|hard_stop|screening_saved|guidance_saved|ready_to_generate|payment_confirmed|artifact_validated)\b/i, "untranslated status"],
  [/\b[a-z]+(?:_[a-z0-9]+)+\b/, "snake_case value"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i, "raw UUID"],
  [/\b[0-9a-f]{40,64}\b/i, "raw digest"],
  [/(?:Supabase|Stripe)(?:Error| error| request failed| API)/i, "raw provider error"],
  [/\{\s*"[A-Za-z0-9_]+"\s*:/, "raw JSON"],
  [/\bpathway\b/i, "internal route wording"],

  // The commercial lifecycle's own vocabulary. Each of these names a real
  // internal step, and each has a customer sentence that says the same thing:
  // "render preflight" is "we're making sure we can prepare your packet",
  // READY_TO_PURCHASE is "your packet is ready to generate", and an
  // invalidated verification snapshot is "your information changed, so we
  // need to check your eligibility again".
  [/\b(?:authoritative snapshot|verification (?:hash|snapshot|state|record)|final verification|render(?:ing)? preflight|preflight|renderable|ready[_ ]to[_ ]purchase|packet family|form[- ]set hash|render input|input digest|commercial admission|admission gate|money gate|route key|track id|specification (?:id|version)|fact id|required facts?|unresolved facts?|fact resolution|collection resolver|disposition class|gate fact)\b/i, "internal lifecycle vocabulary"],
  [/\b(?:entitlement|entitlements|sponsorship authority|sponsored entitlement|packet credits?|credit consumption|consumption|payment writer|payment state|webhook|reconciliation|idempotenc(?:y|e)|provider session|checkout session)\b/i, "internal commercial vocabulary"],

  // A camelCase or SCREAMING_CASE identifier that escaped into a sentence.
  // snake_case is caught above; these are the other two shapes an internal
  // name arrives in.
  [/\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/, "camelCase identifier"],
  [/\b[A-Z][A-Z0-9]{2,}(?:_[A-Z0-9]+)+\b/, "SCREAMING_CASE status"],

  // No consumer sentence needs this many words. Long enough and it is not a
  // sentence a person reads, it is a paragraph they skip.
  [/[^.!?\n]{320,}/, "sentence too long to read"],

  [/—/, "em dash"]
];

export function participantLanguageDefects(text) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return [];
  return prohibitedPatterns.filter(([pattern]) => pattern.test(value)).map(([, label]) => label);
}

/**
 * Who is reading this screen.
 *
 * The gate governs participant surfaces. A few namespaces have a different
 * audience and a different vocabulary, and each exclusion is named here with
 * its reason rather than left as an unexplained path fragment:
 *
 *   - `internal/`, `api/`, content admin — our own staff and our own wire
 *     format; nobody outside the company reads them.
 *   - `partner/` — a sponsoring organization. "Packet credits" is the unit
 *     they actually purchase and see on their invoice, the way a SaaS
 *     customer buys seats. Renaming their purchased unit to protect a
 *     participant who never sees it would make their billing harder to read,
 *     not easier.
 *   - `clinic/staff/` — legal-aid staff running an event console. The
 *     participant's own clinic screens are NOT excluded.
 *
 * This is scoping by audience, not an escape hatch: nothing a participant can
 * reach is on this list, and a new exclusion needs a reason of the same kind.
 */
const NON_PARTICIPANT_AUDIENCES = [
  `${path.sep}internal${path.sep}`,
  `${path.sep}api${path.sep}`,
  `${path.sep}components${path.sep}content${path.sep}admin${path.sep}`,
  `${path.sep}app${path.sep}partner${path.sep}`,
  `${path.sep}components${path.sep}partner${path.sep}`,
  `${path.sep}clinic${path.sep}staff${path.sep}`
];

function nonParticipantAudience(file) {
  return NON_PARTICIPANT_AUDIENCES.some((fragment) => file.includes(fragment));
}

/** Object-literal properties that hold prose a participant reads. */
const COPY_PROPERTIES = [
  "label", "heading", "title", "description", "helper", "eyebrow",
  "cta", "summary", "body", "hint", "message", "caption", "placeholder"
];

const ARIA_COPY_ATTRIBUTES = ["aria-label", "aria-description", "alt"];

const COMPARISON_OPERATORS = [
  ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken
];

/** True when this attribute carries prose rather than a machine value. */
function copyAttribute(attribute) {
  const name = attribute.name.text;
  if (ARIA_COPY_ATTRIBUTES.includes(name) || COPY_PROPERTIES.includes(name)) return true;
  if (name !== "value") return false;
  const element = attribute.parent?.parent;
  const tag = element && (element.tagName ?? element.openingElement?.tagName);
  const tagName = tag ? tag.getText() : "";
  return /^[A-Z]/.test(tagName);
}

// Importing this module must not run the scan. `rcap-journey-copy-review.mjs`
// reuses the patterns to judge text captured from a live browser, and a scan
// firing as a side effect of that import would cost a second of every run and
// print a verdict about a question nobody asked.
const runningAsEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!runningAsEntryPoint) {
  // Patterns only.
} else {

const externalRoots = ["src/app", "src/components"];
for (const root of externalRoots) {
  walk(path.join(ROOT, root), (file) => {
    if (!/\.tsx?$/.test(file) || nonParticipantAudience(file)) return;
    const rel = path.relative(ROOT, file);
    const source = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isJsxText(node)) check(node.text, rel, node.getStart(ast));
      // Prose reaches a screen through props as readily as through children:
      // <SummaryLine label="Cost" value="..." /> renders both. `value` counts
      // only on a component (capitalized), never on an intrinsic `option` or
      // `input`, where it is the submitted value rather than anything the
      // participant reads — an <option value="walk_in">Walk-in</option> shows
      // "Walk-in", and failing it for its value would be failing copy nobody
      // sees.
      if (ts.isJsxAttribute(node) && copyAttribute(node)) {
        if (node.initializer && ts.isStringLiteral(node.initializer)) check(node.initializer.text, rel, node.initializer.getStart(ast));
        // Copy is often conditional: value={paid ? "..." : "..."}. Both arms
        // are strings a participant can meet, so read every literal inside.
        if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          const literals = (inner) => {
            // A literal handed to a function is a lookup key, not prose:
            // aria-label={t("hero_facts_label")} displays whatever the
            // dictionary holds, and that dictionary is checked directly. The
            // key itself is never read by anyone.
            if (ts.isCallExpression(inner)) {
              literals(inner.expression);
              return;
            }
            // Which copy is shown is decided by code, and that code is not
            // copy: in title={outcome === "manual_review" ? "…" : "…"} the
            // two branches are read by a participant and the comparison is
            // not. Read the branches, skip the test.
            if (ts.isConditionalExpression(inner)) {
              literals(inner.whenTrue);
              literals(inner.whenFalse);
              return;
            }
            if (ts.isBinaryExpression(inner) && COMPARISON_OPERATORS.includes(inner.operatorToken.kind)) return;
            // A nested element carries its own attributes, and only its copy
            // ones are prose: <LocalizedText k="start.card_title" fallback="…" />
            // shows the fallback, never the key.
            if (ts.isJsxAttribute(inner) && !copyAttribute(inner)) return;
            if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) check(inner.text, rel, inner.getStart(ast));
            ts.forEachChild(inner, literals);
          };
          literals(node.initializer.expression);
        }
      }
      if (ts.isJsxExpression(node) && node.expression && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) {
        check(node.expression.text, rel, node.expression.getStart(ast));
      }
      // Copy also lives in object literals a component maps over — stage
      // labels, section headings, empty-state text. Reading only JSX missed
      // those, and a nav label is as visible as a paragraph. The property
      // names are an allowlist so that keys, ids and CSS classes beside them
      // are not mistaken for prose.
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && COPY_PROPERTIES.includes(node.name.text)
        && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
        check(node.initializer.text, rel, node.initializer.getStart(ast));
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  });
}

for (const rel of ["src/lib/expungement-ai/localization.ts", "src/lib/expungement-ai/plain-language-copy.ts"]) {
  const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && ["en", "es"].includes(node.name.text)
      && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
      check(node.initializer.text, rel, node.initializer.getStart(ast));
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}

// The grouped packet-information copy. The nine section headings and their
// descriptions are participant-facing surfaces even though they live beside
// the resolver that classifies facts, and that neighbourhood is exactly why
// they are worth checking: it is the easiest place in the codebase for a
// resolver's vocabulary to leak into a heading a participant reads. Both
// languages, because a Spanish string is a participant surface too.
for (const rel of ["src/lib/expungement-ai/packet-collection.ts"]) {
  const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)
      && ["heading", "description", "label", "helper"].includes(node.name.text)
      && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
      check(node.initializer.text, rel, node.initializer.getStart(ast));
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}

const landingRel = "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html";
const landingFile = fs.readFileSync(path.join(ROOT, landingRel), "utf8");
const landingSource = landingFile.split("<script")[0];
for (const match of landingSource.matchAll(/<(?:p|h[1-6]|a|button|span)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|a|button|span)>/gi)) {
  check(match[1].replace(/<[^>]+>/g, " "), landingRel, match.index);
}
for (const match of landingSource.matchAll(/\s(?:aria-label|alt|title)="([^"]+)"/gi)) check(match[1], landingRel, match.index);
const spanishDictionary = landingFile.match(/var ES = (\{[^\n]+\});\s*var EN =/);
if (spanishDictionary) {
  for (const value of Object.values(JSON.parse(spanishDictionary[1]))) check(String(value).replace(/<[^>]+>/g, " "), landingRel, spanishDictionary.index);
}

// Each mutation is a sentence someone could plausibly ship, paired in spirit
// with the customer sentence that replaces it. If the gate stops detecting
// one of these, the gate is broken, so it fails rather than quietly weakening.
const mutations = [
  "packet_ready_with_caution", "paymentAllowed", "saved question ID", "render job",
  "Reference 123e4567-e89b-42d3-a456-426614174000", "Supabase error: row missing", "Stripe error: request failed",
  "Required facts are unresolved.",              // We need a little more information before we can prepare your packet.
  "Final verification required.",                // Review your information before continuing.
  "Verification snapshot invalidated.",          // Your information changed, so we need to check your eligibility again.
  "Route is not renderable.",                    // We can't prepare this packet yet.
  "READY_TO_PURCHASE",                           // Your packet is ready to generate.
  "Render job queued.",                          // We're preparing your packet.
  "Authoritative pathway changed.",              // We found something that may change which option applies to you.
  "Render preflight passed for this packet family.",
  "Your entitlement was consumed.",
  "resultCode returned by the server",
  "The checkout session webhook has not reconciled yet."
];
for (const mutation of mutations) {
  if (!participantLanguageDefects(mutation).length) errors.push(`Mutation was not detected: ${mutation}`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, visibleStringsInventoried: visibleStrings, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, visibleStringsInventoried: visibleStrings, mutationsDetected: mutations.length }, null, 2));

}

function check(text, rel, position) {
  // A placeholder is not text the participant reads. `{recordWord}` is
  // replaced with "record" or "records" before it reaches a screen, so
  // judging its camelCase would fail the copy for something nobody sees.
  const value = String(text).replace(/\$?\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim();
  if (!value || !/[A-Za-zÁ-ÿ]/.test(value)) return;
  visibleStrings += 1;
  for (const defect of participantLanguageDefects(value)) {
    errors.push(`${rel}:${lineAt(path.join(ROOT, rel), position)} [${defect}] ${JSON.stringify(value.slice(0, 180))}`);
  }
}

function lineAt(file, position) {
  return fs.readFileSync(file, "utf8").slice(0, position).split("\n").length;
}

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target, visit);
    else visit(target);
  }
}
