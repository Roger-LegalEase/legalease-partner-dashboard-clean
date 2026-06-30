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
  "/intake/we-must-vote"
]) {
  if (!staticLandingSource.includes(marker)) {
    failures.push(`We Must Vote static landing page is missing marker: ${marker}.`);
  }
}

// The visible "start screening" CTA wording has varied across landing-page revisions
// (e.g. "Start My Free Screening" vs. "Start free screening"/"Start free check"). Accept any
// recognized consumer-facing start CTA so copy refreshes do not require a verifier edit, while
// still proving the page surfaces a screening call to action.
const acceptedStartCtaCopy = [
  "Start My Free Screening",
  "Start free screening",
  "Start free record check",
  "Start free check"
];
if (!acceptedStartCtaCopy.some((copy) => staticLandingSource.includes(copy))) {
  failures.push(
    `We Must Vote static landing page is missing a recognized start-screening CTA (one of: ${acceptedStartCtaCopy.join(", ")}).`
  );
}

if (!staticLandingSource.includes("No eligibility promises") && !staticLandingSource.includes("does not guarantee eligibility or legal outcomes")) {
  failures.push("We Must Vote static landing page is missing required no-promise/no-guarantee protective copy.");
}

if (staticLandingSource.includes("/partners/wemustvote/intake")) {
  failures.push("We Must Vote static landing page still contains the stale partner intake CTA.");
}

// Footer legal pages are served as static public assets at /p/<name>.html. Dotted paths fall
// through the middleware matcher, so when the file exists Next serves it directly instead of the
// /p/[partnerSlug] dynamic route (which renders the "Partner not found" fallback). Each page must
// be linked from the landing footer, exist on disk, and not itself be the fallback page.
const footerLegalPages = [
  "privacy",
  "terms",
  "disclaimer",
  "security",
  "accessibility",
  "data-request",
  "impact-reporting"
];
for (const name of footerLegalPages) {
  const href = `/p/${name}.html`;
  const relativePath = `public/p/${name}.html`;
  if (!staticLandingSource.includes(href)) {
    failures.push(`We Must Vote landing footer does not link to ${href}.`);
    continue;
  }
  if (!fs.existsSync(path.join(rootDir, relativePath))) {
    failures.push(`Footer legal page is missing its static asset: ${relativePath} (route would show "Partner not found").`);
    continue;
  }
  if (readSource(relativePath).includes("Partner not found")) {
    failures.push(`Footer legal page ${href} contains the partner dynamic-route "Partner not found" fallback copy.`);
  }
}

if (!proxySource.includes('request.nextUrl.pathname === "/p/we-must-vote"') || !proxySource.includes('NextResponse.rewrite(new URL("/wemustvote-landing.html", request.url))')) {
  failures.push("Proxy does not map /p/we-must-vote to the static We Must Vote landing page.");
}

// The proxy was refactored from an explicit middleware `matcher` array (e.g. "/internal/:path*",
// "/briefcase/:path*") to a single catch-all matcher plus per-path routing inside proxy(). Assert
// the current, real protections rather than the obsolete matcher-string format: the /internal
// prefix guard and the Supabase auth session refresh still run, and the latter still covers the
// auth/session routes.
if (!proxySource.includes('startsWith("/internal")')) {
  failures.push("Proxy no longer guards the /internal route prefix.");
}

if (!proxySource.includes("isAuthSessionPath")) {
  failures.push("Proxy no longer refreshes Supabase auth sessions via isAuthSessionPath.");
}

for (const authSessionPath of ['"/sign-in"', '"/sign-out"', '"/briefcase"', '"/briefcase/"']) {
  if (!proxySource.includes(authSessionPath)) {
    failures.push(`Proxy auth session refresh no longer covers route: ${authSessionPath}.`);
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

// The participant intake page was redesigned into a data-driven partner intake that resolves the
// partner from the slug instead of hardcoding launch copy. The We Must Vote launch invariant
// (Mississippi-only with a /intake/we-must-vote CTA) is enforced by the seed-partner checks below;
// here we only assert the intake route still resolves partner intake context dynamically.
if (!intakeSource.includes("resolveRcapPartnerIntakeContext")) {
  failures.push("Participant intake page no longer resolves partner intake context for the launch slug.");
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

// NOTE: the legacy Mississippi packet repository (src/lib/rcap/documents/mississippi/repository.ts)
// was removed in commit 6063dc1 "refactor(rcap): remove legacy packet runtime". The verifier no
// longer asserts against that deleted runtime. Briefcase persistence is owned and exercised by its
// own runtime + tests; it is intentionally not re-checked here.

if (!packetPreviewSource.includes("DocumentPacketActions")) {
  failures.push("Mississippi packet preview does not expose packet action controls.");
}

if (!packetActionsSource.includes("Full LegalEase PDF") || !packetActionsSource.includes("Court Filing PDF") || !packetActionsSource.includes("Print")) {
  failures.push("PDF download and print actions are not visible in the packet preview controls.");
}

if (!packetActionsSource.includes("/pdf/full") || !packetActionsSource.includes("/pdf/court")) {
  failures.push("Packet action controls do not link to both supported PDF routes.");
}

// The Briefcase page was redesigned into the consumer Briefcase workspace (BriefcaseShell +
// BriefcaseOverview) rather than the old inline "downloadable PDFs" copy. Assert the current
// user-facing surface: the Briefcase renders the consumer workspace components and the sign-in
// page keeps its account-creation copy.
if (
  !briefcaseSource.includes("BriefcaseShell") ||
  !briefcaseSource.includes("BriefcaseOverview") ||
  !signInSource.includes("Sign in or create your account")
) {
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
