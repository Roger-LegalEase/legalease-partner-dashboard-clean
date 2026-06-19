import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];

function file(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  if (!fs.existsSync(file(relativePath))) {
    failures.push(`Missing ${relativePath}`);
  }
}

function read(relativePath) {
  return fs.readFileSync(file(relativePath), "utf8");
}

function assertIncludes(relativePath, needles, label = relativePath) {
  const source = read(relativePath);
  for (const needle of needles) {
    if (!source.includes(needle)) {
      failures.push(`${label} missing ${needle}`);
    }
  }
}

function assertNotIncludes(relativePath, needles, label = relativePath) {
  const source = read(relativePath);
  for (const needle of needles) {
    if (source.includes(needle)) {
      failures.push(`${label} must not include ${needle}`);
    }
  }
}

const requiredRoutes = [
  "src/app/legalease/page.tsx",
  "src/app/legalease/waitlist/page.tsx",
  "src/app/legalease/contact/page.tsx",
  "src/app/legalease/terms/page.tsx",
  "src/app/legalease/disclaimer/page.tsx"
];

for (const route of requiredRoutes) exists(route);

exists("public/legalease/brand/og-card.png");
exists("public/legalease/logos/legalease-wordmark.png");
exists("public/legalease/wilma/wilma-avatar.png");
exists("public/static/legalease/index.html");
exists("docs/LEGALEASE_UMBRELLA_SITE.md");
exists("docs/sql/phase-32-legalease-umbrella-correspondence.sql");

assertIncludes("src/app/legalease/LegalEaseFooter.tsx", ["/privacy"], "privacy link");
assertIncludes("src/lib/legalease/products.ts", [
  "Expungement.ai",
  "RCAP",
  "Record Shield",
  "StartApart",
  "ClaimCoach",
  "The Fresh Start Network"
]);

assertIncludes("src/proxy.ts", [
  'pathname !== "/expungement-ai" && pathname !== "/legalease"',
  '"/static/legalease/index.html"',
  'host === "legalease.com" || host === "legalease.law"'
], "LegalEase static landing rewrite");

assertNotIncludes("src/app/legalease/page.tsx", [
  "HandoffHtml",
  "legalease-opendoor.html"
], "LegalEase landing app-shell placeholder");

assertIncludes("public/static/legalease/index.html", [
  "<!DOCTYPE html>",
  "<style>",
  "<script>",
  'href="/legalease/contact"',
  'href="/legalease/waitlist',
  'href="/legalease/terms"',
  'href="/legalease/disclaimer"',
  'href="/expungement-ai"'
], "static LegalEase handoff");

assertNotIncludes("public/static/legalease/index.html", [
  "../assets/",
  "contact.html",
  "terms.html",
  "disclaimer.html",
  "legalease-opendoor.html",
  'href="https://expungement.ai"'
], "static LegalEase handoff links");

assertIncludes("src/app/legalease/HandoffHtml.tsx", [
  "design-handoff/legalease-suite-page/latest/legalease-handoff/handoff/pages",
  "latest/legalease-handoff/handoff/pages",
  "legalease-opendoor.html",
  "terms.html",
  "disclaimer.html",
  "/legalease/"
], "latest LegalEase handoff renderer");

assertIncludes("src/app/legalease/WilmaScriptedPreview.tsx", [
  "Scripted preview",
  "never calls a model",
  "/expungement-ai/check",
  "/legalease/contact",
  "immigration",
  "federal",
  "active case",
  "deadline"
]);
assertNotIncludes("src/app/legalease/WilmaScriptedPreview.tsx", ["openai", "fetch(", "generate"], "Wilma scripted preview");

assertIncludes("src/app/api/legalease/waitlist/route.ts", [
  "submitLegalEaseCorrespondence",
  "return NextResponse.json({ ok: false",
  "status: 503"
]);
assertIncludes("src/app/api/legalease/contact/route.ts", [
  "submitLegalEaseCorrespondence",
  "return NextResponse.json({ ok: false",
  "status: 503"
]);
assertIncludes("src/lib/legalease/correspondence.ts", [
  "LEGALEASE_FORMS_DRY_RUN",
  "dryRun: true",
  "legalease_os_support_items",
  "redactPiiLikeContent",
  "legalease_umbrella_site"
]);
assertIncludes("docs/sql/phase-32-legalease-umbrella-correspondence.sql", [
  "Do not apply automatically",
  "legalease_umbrella_site",
  "waitlist_request"
]);

assertIncludes("src/app/legalease/disclaimer/page.tsx", ["LegalEase Website Disclaimer"]);
assertIncludes("src/lib/legalease/legal-content.ts", [
  "does not provide legal advice",
  "does not create an attorney-client relationship",
  "does not guarantee any legal outcome"
]);
assertNotIncludes("src/app/legalease/page.tsx", [
  "guaranteed",
  "guarantee approval",
  "provides legal advice",
  "creates an attorney-client relationship"
], "marketing page");

const forbiddenChangedPrefixes = [
  "src/lib/partners/billing",
  "src/lib/partners/session-partner",
  "src/lib/supabase/auth",
  "src/lib/supabase/browser",
  "src/lib/supabase/config",
  "src/lib/supabase/server",
  "src/lib/stripe/server",
  "src/lib/rcap/all51",
  "src/lib/record-clearing",
  "src/app/partner",
  "src/app/partners",
  ".env",
  "vercel"
];

const status = runGitStatus();
for (const changedPath of status) {
  if (forbiddenChangedPrefixes.some((prefix) => changedPath.startsWith(prefix))) {
    failures.push(`Forbidden area changed: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("LegalEase umbrella-site verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("LegalEase umbrella-site verifier passed.");

function runGitStatus() {
  const result = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  const output = result.stdout ?? "";
  if (result.status !== 0 && !output) {
    failures.push(`Unable to inspect git status: ${result.error?.message ?? result.stderr ?? "unknown error"}`);
  }
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map((line) => line.replace(/^"|"$/g, ""));
}
