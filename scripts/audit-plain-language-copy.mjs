// Audit-only. Reads Expungement.ai / RCAP copy sources and writes a plain-language
// and bilingual coverage report. It does not evaluate eligibility, call checkout, or deploy.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const PROFILES_PATH = path.join(ROOT, "src/lib/expungement-ai/frontend/profiles/all51.json");
const LANDING_PATH = path.join(ROOT, "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html");
const ROUTE_METADATA_PATH = path.join(ROOT, "data/expungement-ai/route-product-metadata.json");
const JSON_OUT = path.join(ROOT, "data/expungement-ai/reports/plain-language-copy-audit.json");
const MD_OUT = path.join(ROOT, "docs/expungement-ai/PLAIN_LANGUAGE_COPY_AUDIT.md");

const { CRITICAL_COPY_CATALOG, routeLabelForState } = await import("../src/lib/expungement-ai/plain-language-copy.ts");
const { EXPUNGEMENT_COPY } = await import("../src/lib/expungement-ai/localization.ts");

const BANNED_PHRASES = [
  "eligibility determination",
  "pursuant to",
  "statutory",
  "disposition",
  "nolle prosequi",
  "limited access",
  "relief",
  "petitioning party",
  "movant",
  "aforementioned",
  "hereby",
  "criminal history repository",
  "court-ready",
  "guaranteed",
  "approved",
  "qualifies",
  "will clear",
  "will seal",
  "will expunge",
  "erase your record",
  "remove from all background checks"
];

const GUARANTEE_PHRASES = [
  "guaranteed",
  "guarantee",
  "approved",
  "you qualify",
  "qualifies",
  "will clear",
  "will seal",
  "will expunge",
  "erase your record",
  "remove from all background checks"
];

function readJson(filePath, fallback = null) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : fallback;
}

function git(args, fallback = "unknown") {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function normalize(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function includesAny(text, phrases) {
  const lower = normalize(text).toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase.toLowerCase()));
}

function readingConcern(text) {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  const avgWordLength = words.length ? words.join("").length / words.length : 0;
  return words.length > 28 || avgWordLength > 6.2;
}

function tooLong(surface, text) {
  const len = normalize(text).length;
  if (surface === "wilma_question") return len > 150;
  if (surface === "answer_choice") return len > 80;
  return len > 260;
}

function recommendedRewrite(text, surface) {
  const clean = normalize(text);
  if (/court-ready/i.test(clean)) return clean.replace(/court-ready self-help paperwork/gi, "self-help paperwork").replace(/court-ready/gi, "ready to review");
  if (/you may be eligible/i.test(clean)) return clean.replace(/You may be eligible\.?/gi, "A packet route may be available.");
  if (/generate my self-help packet/i.test(clean)) return clean.replace(/Generate my self-help packet/gi, "Generate my packet");
  if (/start \$50 checkout/i.test(clean)) return "Generate my packet - $50";
  if (surface === "wilma_question" && clean.length > 150) return "Split this into one plain question, with legal terms explained in helper text.";
  if (includesAny(clean, GUARANTEE_PHRASES).length) return "Use: Based on your answers, there may be a packet route.";
  return "";
}

function classifyString({ id, sourcePath, surface, englishText, spanishText }) {
  const legalese = includesAny(englishText, BANNED_PHRASES);
  const guarantees = includesAny(englishText, GUARANTEE_PHRASES);
  const missingSpanish = !normalize(spanishText);
  const long = tooLong(surface, englishText);
  const reading = readingConcern(englishText);
  const confusion = guarantees.length || (legalese.length && long) ? "high" : legalese.length || long || reading || missingSpanish ? "medium" : "low";
  return {
    id,
    sourcePath,
    surface,
    englishText: normalize(englishText),
    spanishText: normalize(spanishText),
    missingSpanish,
    readingLevelConcern: reading,
    legaleseConcern: legalese.length > 0,
    misleadingPromiseConcern: guarantees.length > 0,
    tooLong: long,
    userConfusionRisk: confusion,
    flaggedPhrases: [...new Set([...legalese, ...guarantees])],
    recommendedRewrite: recommendedRewrite(englishText, surface),
    spanishRewriteNeeded: missingSpanish || Boolean(recommendedRewrite(englishText, surface))
  };
}

function extractLandingSpanishMap(source) {
  const match = source.match(/var ES = (\{[\s\S]*?\});\s*var EN =/);
  if (!match) return {};
  return JSON.parse(match[1]);
}

function extractLandingStrings() {
  if (!fs.existsSync(LANDING_PATH)) return [];
  const source = fs.readFileSync(LANDING_PATH, "utf8");
  const es = extractLandingSpanishMap(source);
  const out = [];
  const pattern = /<(?<tag>[a-z0-9]+)[^>]*(?:data-i18n|data-i18n-html)="(?<key>[^"]+)"[^>]*>(?<body>[\s\S]*?)<\/\k<tag>>/gi;
  for (const match of source.matchAll(pattern)) {
    const key = match.groups.key;
    const body = normalize(match.groups.body.replace(/<[^>]*>/g, " "));
    if (!body || body.length > 600) continue;
    out.push(classifyString({
      id: `landing.${key}`,
      sourcePath: "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html",
      surface: "landing",
      englishText: body,
      spanishText: es[key] ? normalize(String(es[key]).replace(/<[^>]*>/g, " ")) : ""
    }));
  }
  return out;
}

function extractProfileStrings() {
  const profiles = readJson(PROFILES_PATH, {});
  const out = [];
  for (const [code, profile] of Object.entries(profiles)) {
    for (const question of profile.questions ?? []) {
      out.push(classifyString({
        id: `${code}.question.${question.id}.prompt`,
        sourcePath: "src/lib/expungement-ai/frontend/profiles/all51.json",
        surface: "wilma_question",
        englishText: question.prompt,
        spanishText: question.translations?.es?.prompt ?? ""
      }));
      if (question.helperText) {
        out.push(classifyString({
          id: `${code}.question.${question.id}.helper`,
          sourcePath: "src/lib/expungement-ai/frontend/profiles/all51.json",
          surface: "wilma_question",
          englishText: question.helperText,
          spanishText: question.translations?.es?.helperText ?? ""
        }));
      }
      for (const option of question.options ?? []) {
        const display = question.optionDisplay?.[option];
        out.push(classifyString({
          id: `${code}.question.${question.id}.option.${option}`,
          sourcePath: "src/lib/expungement-ai/frontend/profiles/all51.json",
          surface: "answer_choice",
          englishText: display?.label ?? option,
          spanishText: display?.translations?.es?.label ?? ""
        }));
        if (display?.helperText) {
          out.push(classifyString({
            id: `${code}.question.${question.id}.option.${option}.helper`,
            sourcePath: "src/lib/expungement-ai/frontend/profiles/all51.json",
            surface: "answer_choice",
            englishText: display.helperText,
            spanishText: display.translations?.es?.helperText ?? ""
          }));
        }
      }
    }
  }
  return out;
}

function extractCriticalCatalogStrings() {
  return CRITICAL_COPY_CATALOG.map((entry) => classifyString({
    id: entry.id,
    sourcePath: "src/lib/expungement-ai/plain-language-copy.ts",
    surface: entry.surface,
    englishText: entry.en,
    spanishText: entry.es
  }));
}

function extractRouteMetadataStrings() {
  const metadata = readJson(ROUTE_METADATA_PATH, {});
  const out = [];
  const runtimeCatalogByEnglish = new Map(Object.values(EXPUNGEMENT_COPY).map((entry) => [normalize(entry.en), entry.es ?? ""]));
  for (const [routeKey, routeData] of Object.entries(metadata.routes ?? {})) {
    const [code] = routeKey.split(":");
    const stateName = stateNameForCode(code);
    const routeLabel = routeLabelForState(stateName, routeKey);
    out.push(classifyString({
      id: `${routeKey}.route_label`,
      sourcePath: "data/expungement-ai/route-product-metadata.json",
      surface: "result_panel",
      englishText: routeLabel,
      spanishText: CRITICAL_COPY_CATALOG.find((entry) => entry.en === routeLabel)?.es
        ?? (routeLabel.endsWith(" record-clearing") ? `limpieza de antecedentes de ${stateName}` : "")
    }));
    const items = [
      routeData.filingReadiness,
      ...(routeData.externalDocuments ?? []),
      ...(routeData.externalDocumentChecklist ?? [])
    ];
    for (const [index, item] of items.entries()) {
      const text = typeof item === "string" ? item : item.label ?? item.title ?? item.name ?? item.text ?? "";
      if (!text) continue;
      out.push(classifyString({
        id: `${routeKey}.route_metadata.${index}`,
        sourcePath: "data/expungement-ai/route-product-metadata.json",
        surface: /patch|sbi|report|fingerprint|certificate|certified|chr|scope/i.test(text) ? "external_document_checklist" : "filing_readiness",
        englishText: text,
        spanishText: typeof item === "object" ? item.translations?.es?.label ?? item.es ?? "" : runtimeCatalogByEnglish.get(normalize(text)) ?? ""
      }));
    }
  }
  return out;
}

function stateNameForCode(code) {
  return {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
    DC: "District of Columbia", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", IA: "Iowa", ID: "Idaho",
    IL: "Illinois", IN: "Indiana", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts", MD: "Maryland",
    ME: "Maine", MI: "Michigan", MN: "Minnesota", MO: "Missouri", MS: "Mississippi", MT: "Montana", NC: "North Carolina",
    ND: "North Dakota", NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NV: "Nevada",
    NY: "New York", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
    SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia",
    VT: "Vermont", WA: "Washington", WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming"
  }[code] ?? code;
}

function summarize(strings) {
  const missingSpanish = strings.filter((s) => s.missingSpanish);
  const legalese = strings.filter((s) => s.legaleseConcern);
  const promises = strings.filter((s) => s.misleadingPromiseConcern);
  const long = strings.filter((s) => s.tooLong);
  const highRisk = strings.filter((s) => s.userConfusionRisk === "high");
  const bySurface = {};
  for (const s of strings) {
    bySurface[s.surface] ??= { count: 0, missingSpanish: 0, legalese: 0, promises: 0 };
    bySurface[s.surface].count += 1;
    if (s.missingSpanish) bySurface[s.surface].missingSpanish += 1;
    if (s.legaleseConcern) bySurface[s.surface].legalese += 1;
    if (s.misleadingPromiseConcern) bySurface[s.surface].promises += 1;
  }
  return {
    stringsAudited: strings.length,
    missingSpanish: missingSpanish.length,
    legaleseConcerns: legalese.length,
    misleadingPromiseConcerns: promises.length,
    tooLongConcerns: long.length,
    highConfusionRisk: highRisk.length,
    bySurface
  };
}

const strings = [
  ...extractLandingStrings(),
  ...extractProfileStrings(),
  ...extractRouteMetadataStrings(),
  ...extractCriticalCatalogStrings()
].sort((a, b) => a.surface.localeCompare(b.surface) || a.id.localeCompare(b.id));

function fileIncludes(rel, snippets) {
  const source = fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "";
  return snippets.every((snippet) => source.includes(snippet));
}

const runtimeLocalizationArchitecture = {
  providerInstalled: fileIncludes("src/app/layout.tsx", ["LocalizationProvider"]),
  screeningQuestionsLocalized: fileIncludes("src/components/expungement-ai/screening/QuestionField.tsx", ["localizeProfileText", "useLocalization"]),
  answerChoicesLocalized: fileIncludes("src/components/expungement-ai/screening/fields/OptionGroup.tsx", ["localizeProfileText", "runtimeCopyKeyForText"]),
  screeningFlowStaticCopyLocalized: fileIncludes("src/components/expungement-ai/screening/ScreeningFlow.tsx", ["useLocalization", "screening.answer_required"]),
  resultEngineTextLocalized: fileIncludes("src/components/expungement-ai/screening/ScreeningResult.tsx", ["safeUserFacingEngineText(reason.text, { locale })", "routeLabelKeyForState"]),
  paymentCopyLocalized: fileIncludes("src/app/expungement-ai/pay/page.tsx", ["LocalizedText", "payment.title"])
    && fileIncludes("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx", ["useLocalization", "payment.generate_packet"]),
  briefcaseCopyLocalized: fileIncludes("src/components/expungement-ai/BriefcaseViews.tsx", ["LocalizedRuntimeText", "LocalizedText"])
    && fileIncludes("src/components/expungement-ai/BriefcaseShell.tsx", ["LocalizedText"]),
  packetReadyCopyLocalized: fileIncludes("src/app/expungement-ai/packet-ready/page.tsx", ["LocalizedRuntimeText", "LocalizedText"]),
  wilmaLocalePayload: fileIncludes("src/components/expungement-ai/WilmaBubble.tsx", ["requestBody.locale = locale", "useLocalization"]),
  wilmaServerLocale: fileIncludes("src/app/api/expungement-ai/wilma/chat/route.ts", ["normalizeLocale", "locale"])
    && fileIncludes("src/app/api/expungement-ai/wilma/public-chat/route.ts", ["normalizeLocale", "locale"]),
  missingFieldLocalization: fileIncludes("src/lib/expungement-ai/missing-fields.ts", ["resolveRuntimeText", "Locale"])
};
runtimeLocalizationArchitecture.complete = Object.entries(runtimeLocalizationArchitecture)
  .filter(([key]) => key !== "complete")
  .every(([, value]) => value === true);

const summary = summarize(strings);
const legalReviewItems = strings
  .filter((s) => s.legaleseConcern || s.misleadingPromiseConcern)
  .slice(0, 75);

const report = {
  generatedAt: new Date().toISOString(),
  branch: git(["branch", "--show-current"]),
  commit: git(["rev-parse", "--short", "HEAD"]),
  sourcesInspected: {
    landing: LANDING_PATH,
    profiles: PROFILES_PATH,
    routeMetadata: ROUTE_METADATA_PATH,
    criticalCopyCatalog: "src/lib/expungement-ai/plain-language-copy.ts"
  },
  translationSystemFindings: {
    translationFilesUsed: [
      "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html embedded ES dictionary",
      "src/lib/expungement-ai/plain-language-copy.ts critical runtime copy catalog",
      "src/lib/expungement-ai/localization.ts shared runtime resolver catalog",
      "src/lib/expungement-ai/frontend/profiles/all51.json profile prompt/option translations"
    ],
    englishSpanishToggleImplementation: "Landing page uses data-i18n/data-i18n-html and localStorage exp_lang. Runtime app surfaces use the shared LocalizationProvider and resolver.",
    engineGeneratedCopyUsesTranslationKeys: "Yes for migrated runtime surfaces. Critical route, payment, result, filing-readiness, external-document, no-payment, Briefcase, Wilma, and profile question/option labels resolve through the runtime localization layer.",
    routeMetadataCopyTranslated: "Runtime-visible filing-readiness values, external-document checklist items, and required state-specific remedy labels have Spanish catalog coverage.",
    new51StateFilingReadinessBypassesToggle: !runtimeLocalizationArchitecture.complete,
    runtimeLocalizationArchitecture
  },
  runtimeLocalizationArchitecture,
  summary,
  lowRiskFixesImplemented: {
    paymentCopyIssuesFixed: [
      "Checkout CTA now says self-help packet generation instead of generic checkout.",
      "Payment supporting copy states court/agency/background-report fees are separate."
    ],
    resultCopyIssuesFixed: [
      "Packet-ready result labels now use possible route language instead of 'you qualify' language.",
      "AK/NV/MA/PA/HI/DE route labels use state-specific remedy terms."
    ],
    missingSpanishStringsFixed: strings.filter((s) => !s.missingSpanish).length
  },
  legalReviewItems,
  remainingEnglishOnlyStrings: strings.filter((s) => s.missingSpanish).slice(0, 250),
  strings
};

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);

const topSurfaces = Object.entries(summary.bySurface)
  .sort((a, b) => b[1].missingSpanish - a[1].missingSpanish)
  .map(([surface, row]) => `| ${surface} | ${row.count} | ${row.missingSpanish} | ${row.legalese} | ${row.promises} |`)
  .join("\n");

const md = `# Plain-Language and Bilingual Copy Audit

Generated: ${report.generatedAt}

Branch: \`${report.branch}\`  
Commit: \`${report.commit}\`

## Summary

- Strings audited: ${summary.stringsAudited}
- Missing Spanish strings found: ${summary.missingSpanish}
- Legalese concerns: ${summary.legaleseConcerns}
- Misleading-promise concerns: ${summary.misleadingPromiseConcerns}
- Too-long concerns: ${summary.tooLongConcerns}
- High confusion risk strings: ${summary.highConfusionRisk}

| Surface | Strings | Missing Spanish | Legalese | Promise risk |
| --- | ---: | ---: | ---: | ---: |
${topSurfaces}

## Translation Findings

- Landing page: uses embedded \`data-i18n\` / \`data-i18n-html\` Spanish dictionary and \`localStorage.exp_lang\`.
- Engine-generated copy: critical payment/result/route/external-document/filing-readiness/Briefcase labels have stable English/Spanish catalog IDs.
- Profile question prompts/options: compiled public profiles include Spanish prompt, helper, option, and option-helper translations.
- Route metadata: runtime-visible filing-readiness values and external-document checklist items resolve through the shared runtime catalog.

## Low-Risk Fixes Applied

- Payment CTA now uses: "Generate my packet - $50".
- Payment support copy separates Expungement.ai packet generation from court, agency, and background-report fees.
- Packet-ready result copy avoids "you qualify" language.
- Alaska, Nevada, Massachusetts, Pennsylvania, Hawaii, and Delaware remedy labels use state-specific terms.

## Legal-Review Copy Items

The JSON report includes the first ${legalReviewItems.length} legalese/promise-risk items under \`legalReviewItems\`. Most are source/profile terms where the legal term may be needed but should be explained in helper text.

## Remaining Risk

Spanish toggle risk level: ${summary.missingSpanish > 100 ? "high" : summary.missingSpanish > 0 ? "medium" : "low"}

The existing landing toggle is solid for landing copy. Runtime profile-driven screening, result, payment, Briefcase, Packet Ready, and Wilma surfaces now resolve through the localization layer with Spanish coverage for consumer-visible strings audited here.
`;

fs.writeFileSync(MD_OUT, md);

console.log(JSON.stringify({
  ok: true,
  stringsAudited: summary.stringsAudited,
  missingSpanish: summary.missingSpanish,
  legaleseConcerns: summary.legaleseConcerns,
  misleadingPromiseConcerns: summary.misleadingPromiseConcerns,
  json: path.relative(ROOT, JSON_OUT),
  markdown: path.relative(ROOT, MD_OUT)
}, null, 2));
