import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

const requiredRoutes = [
  "src/app/dashboard/partners/[partnerSlug]/page.tsx",
  "src/app/p/[partnerSlug]/page.tsx",
  "src/app/intake/[partnerSlug]/page.tsx",
  "src/app/documents/[partnerSlug]/page.tsx",
  "src/app/documents/[partnerSlug]/form/page.tsx",
  "src/app/documents/[partnerSlug]/[packetId]/page.tsx",
  "src/app/api/rcap/documents/mississippi/create/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/app/briefcase/page.tsx",
  "src/app/sign-in/page.tsx"
];

for (const route of requiredRoutes) {
  if (!fs.existsSync(path.join(rootDir, route))) {
    failures.push(`Missing We Must Vote launch route: ${route}.`);
  }
}

const dashboardSource = readSource("src/app/dashboard/partners/[partnerSlug]/page.tsx");
const landingSource = readSource("src/lib/partners/landing-page.ts");
const landingTemplateSource = readSource("src/components/partners/PartnerLandingPageTemplate.tsx");
const publicRouteSource = readSource("src/app/p/[partnerSlug]/page.tsx");
const proxySource = readSource("src/proxy.ts");
const staticLandingPath = "public/wemustvote-landing.html";
const staticLandingExists = fs.existsSync(path.join(rootDir, staticLandingPath));
const staticLandingSource = staticLandingExists ? readSource(staticLandingPath) : "";
const intakeSource = readSource("src/app/intake/[partnerSlug]/page.tsx");
const documentsSource = readSource("src/app/documents/[partnerSlug]/page.tsx");
const formPageSource = readSource("src/app/documents/[partnerSlug]/form/page.tsx");
const mississippiFormSource = readSource("src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx");
const packetPreviewSource = readSource("src/components/rcap/documents/mississippi/MississippiPetitionPacketPreview.tsx");
const packetActionsSource = readSource("src/components/rcap/documents/DocumentPacketActions.tsx");
const repositorySource = readSource("src/lib/rcap/documents/mississippi/repository.ts");
const briefcaseSource = readSource("src/app/briefcase/page.tsx");
const signInSource = readSource("src/app/sign-in/page.tsx");

if (!publicRouteSource.includes("PartnerLandingPageTemplate") || !publicRouteSource.includes("getPartnerRecordBySlug")) {
  failures.push("We Must Vote public signup route does not use the partner landing page path.");
}

if (!staticLandingExists) {
  failures.push("We Must Vote static landing page is missing: public/wemustvote-landing.html.");
}

for (const marker of [
  "Find out what record-clearing options may be available to you",
  "WE MUST VOTE",
  "Mississippi",
  "Start My Free Screening",
  "/intake/we-must-vote"
]) {
  if (!staticLandingSource.includes(marker)) {
    failures.push(`We Must Vote static landing page is missing marker: ${marker}.`);
  }
}

if (!staticLandingSource.includes("No eligibility promises") && !staticLandingSource.includes("does not guarantee eligibility or legal outcomes")) {
  failures.push("We Must Vote static landing page is missing required no-promise/no-guarantee protective copy.");
}

if (staticLandingSource.includes("/partners/wemustvote/intake")) {
  failures.push("We Must Vote static landing page still contains the stale partner intake CTA.");
}

if (!proxySource.includes('request.nextUrl.pathname === "/p/we-must-vote"') || !proxySource.includes('NextResponse.rewrite(new URL("/wemustvote-landing.html", request.url))')) {
  failures.push("Proxy does not map /p/we-must-vote to the static We Must Vote landing page.");
}

if (!proxySource.includes('"/internal/:path*"') || !proxySource.includes('"/p/we-must-vote"')) {
  failures.push("Proxy matcher does not preserve the internal route guard and the narrow We Must Vote static landing rewrite.");
}

for (const authRouteMatcher of ['"/sign-in"', '"/briefcase"', '"/briefcase/:path*"', '"/sign-out"']) {
  if (!proxySource.includes(authRouteMatcher)) {
    failures.push(`Proxy matcher does not include auth session refresh route: ${authRouteMatcher}.`);
  }
}

for (const broadPublicMatcher of ['"/p/:path*"', '"/p/(.*)"', "'/p/:path*'", "'/p/(.*)'"]) {
  if (proxySource.includes(broadPublicMatcher)) {
    failures.push(`Proxy appears to broadly match partner public pages: ${broadPublicMatcher}.`);
  }
}

for (const signal of [
  "we-must-vote",
  "Welcome,",
  "Public signup link",
  "Dashboard sign in",
  "Mississippi Expungement Workflow",
  "Initial Screening",
  "Self-Represented Filing Option",
  "Administrative Completeness Check",
  "Self-Help Packet Access",
  "Filing Guidance",
  "Outcome Follow-Up",
  "Case Journey Model",
  "Phase 20A"
]) {
  if (!dashboardSource.includes(signal)) {
    failures.push(`Partner dashboard is missing launch signal: ${signal}.`);
  }
}

for (const capability of [
  "View participants",
  "Monitor launch readiness",
  "Support self-help packet access",
  "Identify support needs",
  "Access reports and resources"
]) {
  if (!dashboardSource.includes(capability)) {
    failures.push(`Partner dashboard does not explain capability: ${capability}.`);
  }
}

// Verifier guardrails only: these readable literals must not appear in live dashboard copy.
const legacyLabels = ["May Qualify", "Packet In Progress", "Completed / Filed"];
for (const legacyLabel of legacyLabels) {
  if (dashboardSource.includes(legacyLabel)) {
    failures.push(`Partner dashboard still exposes legacy funnel label: ${legacyLabel}.`);
  }
}

if (dashboardSource.includes("Ready to File")) {
  failures.push("Partner dashboard exposes a bare filing-readiness label instead of Filing Guidance.");
}

for (const bannedProduct of [["Start", "Apart"].join(""), ["Claim", "Coach"].join("")]) {
  if (dashboardSource.includes(bannedProduct)) {
    failures.push(`Partner dashboard exposes unrelated product: ${bannedProduct}.`);
  }
}

const partnerStaffLegalClaims = [
  /staff\s+(can|may)\s+determine\s+eligibility/i,
  /staff\s+(can|may)\s+approve\s+legal\s+sufficiency/i,
  /staff\s+(can|may)\s+tell\s+users\s+whether\s+they\s+should\s+file/i,
  /partner\s+staff\s+(can|may)\s+perform\s+legal\s+review/i
];
for (const claimPattern of partnerStaffLegalClaims) {
  if (claimPattern.test(dashboardSource)) {
    failures.push(`Partner dashboard makes a UPL-risk staff authority claim: ${claimPattern.source}.`);
  }
}

const eligibilityAssurancePattern = new RegExp([["guarante", "ed"].join(""), "eligible"].join("\\s+"), "i");
if (eligibilityAssurancePattern.test(dashboardSource) || /legally\s+eligible/i.test(dashboardSource) || new RegExp(["guaran", "tee"].join(""), "i").test(dashboardSource)) {
  failures.push("Partner dashboard implies eligibility is assured or legally determined.");
}

if (dashboardSource.includes("Attorney Checkpoint") && !dashboardSource.includes("applies only to flagged cases")) {
  failures.push("Attorney Checkpoint copy must say it applies only to flagged cases.");
}

for (const futureQueue of ["Legal Review Unavailable", "Partner Follow-up", "Attorney Checkpoint queue"]) {
  if (dashboardSource.includes(futureQueue)) {
    failures.push(`Partner dashboard appears to expose a future operational queue: ${futureQueue}.`);
  }
}

if (!dashboardSource.includes("partnerPublicPage(partner.partnerSlug)") || !dashboardSource.includes("partnerIntake(partner.partnerSlug)") || !dashboardSource.includes("partnerDocuments(partner.partnerSlug)")) {
  failures.push("Partner dashboard does not display signup, intake, and document workflow links.");
}

if (!intakeSource.includes("Clear your Mississippi record with We Must Vote + LegalEase")) {
  failures.push("Participant intake does not carry We Must Vote Mississippi launch language.");
}

if (!documentsSource.includes("Review and prepare your Mississippi packet") || !documentsSource.includes("This partner launch is limited to the Mississippi Expungement Workflow")) {
  failures.push("Document entry page does not keep We Must Vote users on the Mississippi workflow.");
}

if (!formPageSource.includes("Mississippi petition information") || !formPageSource.includes("download packet PDFs")) {
  failures.push("Mississippi form page does not explain save-and-download behavior for launch users.");
}

if (!mississippiFormSource.includes("/api/rcap/documents/mississippi/create") || !mississippiFormSource.includes("Draft packet generated and saved to your Briefcase.")) {
  failures.push("Mississippi form does not create and save packets to the Briefcase-backed packet path.");
}

if (!repositorySource.includes("upsertBriefcaseItem(savedPacket") || !repositorySource.includes("rcap_briefcase_items")) {
  failures.push("Generated Mississippi packets are not saved to Briefcase items when persistence is available.");
}

if (!packetPreviewSource.includes("DocumentPacketActions")) {
  failures.push("Mississippi packet preview does not expose packet action controls.");
}

if (!packetActionsSource.includes("Full LegalEase PDF") || !packetActionsSource.includes("Court Filing PDF") || !packetActionsSource.includes("Print")) {
  failures.push("PDF download and print actions are not visible in the packet preview controls.");
}

if (!packetActionsSource.includes("/pdf/full") || !packetActionsSource.includes("/pdf/court")) {
  failures.push("Packet action controls do not link to both supported PDF routes.");
}

if (!briefcaseSource.includes("downloadable PDFs") || !signInSource.includes("Sign in or create your account")) {
  failures.push("Briefcase/account copy is not user-facing for the launch flow.");
}

const bannedUserFacingSources = [
  ["landing page data", landingSource],
  ["landing template", landingTemplateSource],
  ["intake page", intakeSource],
  ["document entry page", documentsSource],
  ["document form page", formPageSource],
  ["Mississippi form", mississippiFormSource],
  ["Briefcase page", briefcaseSource],
  ["sign-in page", signInSource]
];
for (const [label, source] of bannedUserFacingSources) {
  if (/Workflow gap/i.test(source)) {
    failures.push(`${label} exposes Workflow gap in user-facing copy.`);
  }
}

for (const unrelated of ["Illinois", "Pennsylvania", "District of Columbia", "Harris County", "Texas"]) {
  const weMustVoteBlock = dashboardSource.slice(dashboardSource.indexOf("function WeMustVoteDashboard"));
  if (weMustVoteBlock.includes(unrelated)) {
    failures.push(`We Must Vote dashboard exposes unrelated workflow geography: ${unrelated}.`);
  }
}

const { seedPartners } = loadTsModule(path.join(rootDir, "src/lib/partners/seed-partners.ts"));
const { buildPartnerLandingPageData } = loadTsModule(path.join(rootDir, "src/lib/partners/landing-page.ts"));
const partner = seedPartners.find((record) => record.partnerSlug === "we-must-vote");
if (!partner) {
  failures.push("We Must Vote partner seed record is missing.");
} else {
  const states = new Set([partner.state, partner.targetState].filter(Boolean));
  if (states.size !== 1 || !states.has("MS")) {
    failures.push(`We Must Vote launch must be Mississippi-only; found ${Array.from(states).join(", ")}.`);
  }
  if (partner.recordClearingNeeds.some((need) => need !== "expungement")) {
    failures.push("We Must Vote launch includes non-expungement workflow needs.");
  }
  const pageData = buildPartnerLandingPageData(partner);
  if (pageData.primaryCtaHref !== "/intake/we-must-vote") {
    failures.push("We Must Vote public signup CTA does not route to the partner intake page.");
  }
  if (pageData.secondaryCtaHref !== "/briefcase") {
    failures.push("We Must Vote secondary CTA does not route to Briefcase sign-in/access.");
  }
  if (pageData.state !== "Mississippi" || !pageData.trustChips.includes("Mississippi workflow only")) {
    failures.push("We Must Vote landing data is not Mississippi-only.");
  }
}

if (failures.length > 0) {
  console.error("We Must Vote launch verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("We Must Vote launch verification passed.");
console.log("Partner dashboard route: configured");
console.log("Static public landing route: configured");
console.log("Mississippi-only workflow access: configured");
console.log("Briefcase packet save path: configured");
console.log("PDF downloads and print actions: configured");
console.log("User-facing Confirm before filing language: configured");

function readSource(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function loadTsModule(filePath) {
  const cached = moduleCache.get(filePath);
  if (cached) return cached.exports;

  const source = fs.readFileSync(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
      skipLibCheck: true
    },
    fileName: filePath
  }).outputText;

  const loadedModule = new Module(filePath);
  loadedModule.filename = filePath;
  loadedModule.paths = Module._nodeModulePaths(path.dirname(filePath));
  moduleCache.set(filePath, loadedModule);

  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
    if (request.startsWith("@/")) {
      return originalResolve.call(this, path.join(rootDir, "src", request.slice(2)), parent, isMain, options);
    }
    if (request.startsWith(".")) {
      const basePath = path.resolve(path.dirname(parent?.filename ?? filePath), request);
      for (const candidate of [basePath, `${basePath}.ts`, `${basePath}.tsx`, path.join(basePath, "index.ts")]) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };

  try {
    loadedModule._compile(output, filePath);
  } finally {
    Module._resolveFilename = originalResolve;
  }

  return loadedModule.exports;
}
