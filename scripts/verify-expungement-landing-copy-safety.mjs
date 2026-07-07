import fs from "node:fs";
import path from "node:path";
import {
  buildExpungementLandingHtml,
  extractLandingDictionaries
} from "../src/app/expungement-ai/landing-handoff-utils.ts";

// Guards the DTC landing hero + feature-strip CTA copy against outcome-promise /
// avoid-list language. It checks BOTH the effective runtime dictionaries
// (English + Spanish, after the workflow/safety overrides that actually render)
// and the server-rendered static HTML (first paint / no-JS / crawler view).

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const LANDING_HTML = "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html";

// Keys that make up the hero + feature strip + primary CTAs.
const GUARDED_KEYS = [
  "hero_eyebrow",
  "hero_h1",
  "hero_sub",
  "hero_disclaimer",
  "hero_cta1",
  "hero_cta2",
  "hero_micro",
  "nav_cta",
  "m_cta",
  "elig_cta",
  "strip_h0",
  "strip_p0",
  "strip_h1",
  "strip_p1",
  "strip_h2",
  "strip_p2",
  "strip_h3",
  "strip_p3"
];

// English + Spanish avoid-list stems (case-insensitive). Outcome-promise words
// and their Spanish equivalents. "final decision" style disclaimers are fine.
const AVOID = [
  ["qualif", "qualify/qualifies/qualified"],
  ["eligib", "eligible/eligibility"],
  ["elegib", "elegible/elegibilidad"],
  ["calific", "califica/calificar"],
  ["approved", "approved"],
  ["aprobad", "aprobado/aprobada"],
  ["guarante", "guarantee/guaranteed"],
  ["garantiz", "garantizado/garantizada"]
];

function scan(label, dict) {
  for (const key of GUARDED_KEYS) {
    const value = dict[key];
    if (typeof value !== "string" || value.length === 0) continue;
    const lower = value.toLowerCase();
    for (const [stem, human] of AVOID) {
      if (lower.includes(stem)) {
        failures.push(`${label} key "${key}" contains avoid-list term (${human}): ${value}`);
      }
    }
  }
}

const source = read(LANDING_HTML);
const { en, es } = extractLandingDictionaries(source);

scan("EN dictionary", en);
scan("ES dictionary", es);

// Positive assertions: the safer language is actually present.
if (!(en.strip_h0 ?? "").toLowerCase().includes("record-clearing")) {
  failures.push('EN strip_h0 should use "record-clearing check" language.');
}
if (!(en.hero_sub ?? "").toLowerCase().includes("may be available")) {
  failures.push('EN hero_sub should say a record-clearing path "may be available".');
}

// Server-rendered static HTML (first paint / no-JS / crawler): validate the
// guarded hero/strip/CTA elements specifically, so the static default text that
// paints before hydration is also clean. (Scoped to the guarded keys; broader
// page copy such as pricing/eyebrow labels is out of this gap's scope.)
const rendered = buildExpungementLandingHtml(source);
for (const key of GUARDED_KEYS) {
  const match = rendered.match(
    new RegExp(`data-i18n(?:-html)?="${key}"[^>]*>([\\s\\S]*?)<`, "i")
  );
  if (!match) continue;
  const text = match[1].toLowerCase();
  for (const [stem, human] of AVOID) {
    if (text.includes(stem)) {
      failures.push(`Server-rendered hero/strip element "${key}" contains avoid-list term (${human}): ${match[1].trim()}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Expungement.ai landing copy-safety verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai landing copy-safety verifier passed.");
console.log("Hero and feature-strip CTA copy (EN + ES, runtime dictionaries + server-rendered HTML) is free of outcome-promise / avoid-list language.");
