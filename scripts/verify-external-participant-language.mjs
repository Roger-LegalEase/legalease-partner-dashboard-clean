import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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
  [/—/, "em dash"]
];

export function participantLanguageDefects(text) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return [];
  return prohibitedPatterns.filter(([pattern]) => pattern.test(value)).map(([, label]) => label);
}

const externalRoots = ["src/app", "src/components"];
for (const root of externalRoots) {
  walk(path.join(ROOT, root), (file) => {
    if (!/\.tsx?$/.test(file) || file.includes(`${path.sep}internal${path.sep}`) || file.includes(`${path.sep}api${path.sep}`)
      || file.includes(`${path.sep}components${path.sep}content${path.sep}admin${path.sep}`)) return;
    const rel = path.relative(ROOT, file);
    const source = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isJsxText(node)) check(node.text, rel, node.getStart(ast));
      if (ts.isJsxAttribute(node) && ["aria-label", "aria-description", "title", "alt", "placeholder"].includes(node.name.text)) {
        if (node.initializer && ts.isStringLiteral(node.initializer)) check(node.initializer.text, rel, node.initializer.getStart(ast));
      }
      if (ts.isJsxExpression(node) && node.expression && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) {
        check(node.expression.text, rel, node.expression.getStart(ast));
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

const mutations = [
  "packet_ready_with_caution", "paymentAllowed", "saved question ID", "render job",
  "Reference 123e4567-e89b-42d3-a456-426614174000", "Supabase error: row missing", "Stripe error: request failed"
];
for (const mutation of mutations) {
  if (!participantLanguageDefects(mutation).length) errors.push(`Mutation was not detected: ${mutation}`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, visibleStringsInventoried: visibleStrings, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, visibleStringsInventoried: visibleStrings, mutationsDetected: mutations.length }, null, 2));

function check(text, rel, position) {
  const value = String(text).replace(/\s+/g, " ").trim();
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
