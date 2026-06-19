import { spawnSync } from "node:child_process";

const sourceEngineAllowedFiles = new Set([
  "src/app/api/expungement-ai/evaluate/route.ts",
  "src/app/api/expungement-ai/profiles/[state]/route.ts",
  "src/app/api/rcap/documents/[packetId]/generate/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/app/api/rcap/documents/[packetId]/route.ts",
  "src/app/api/rcap/documents/[packetId]/save/route.ts",
  "src/app/api/rcap/documents/dc/create/route.ts",
  "src/app/api/rcap/documents/illinois/create/route.ts",
  "src/app/api/rcap/documents/mississippi/create/route.ts",
  "src/app/api/rcap/documents/pennsylvania/create/route.ts",
  "src/app/api/rcap/documents/texas-harris/create/route.ts",
  "src/app/documents/[partnerSlug]/[packetId]/page.tsx",
  "src/app/documents/[partnerSlug]/form/DcMotionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/PennsylvaniaPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/TexasHarrisPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/page.tsx",
  "src/app/expungement-ai/check/page.tsx",
  "src/app/expungement-ai/results/page.tsx"
]);

const legacyGeneratorPrefixes = [
  "src/lib/rcap/documents/mississippi/",
  "src/lib/rcap/documents/illinois/",
  "src/lib/rcap/documents/dc/",
  "src/lib/rcap/documents/pennsylvania/",
  "src/lib/rcap/documents/texas-harris/"
];

const productionForbiddenPrefixes = [
  "src/app/auth/",
  "src/app/internal/billing/",
  "src/lib/auth/",
  "src/lib/partners/billing",
  "src/lib/partners/session-partner",
  "src/lib/partners/partner-dashboard-rls",
  "src/lib/partners/partner-repository",
  "src/lib/partners/partner-service",
  "src/lib/stripe",
  "src/lib/billing",
  "supabase/",
  "vercel",
  ".env",
  ".github/workflows/deploy",
  "src/app/expungement/",
  "src/components/expungement/"
];

export function assertSourceEngineChangeScope({ rootDir, failures, extraForbiddenPrefixes = [] }) {
  const changedEntries = changedEntriesAgainstMain(rootDir, failures);
  const forbiddenPrefixes = [...productionForbiddenPrefixes, ...extraForbiddenPrefixes];
  const forbidden = [];

  for (const entry of changedEntries) {
    if (sourceEngineAllowedFiles.has(entry.path)) continue;

    const legacyPrefix = legacyGeneratorPrefixes.find((prefix) => entry.path.startsWith(prefix));
    if (legacyPrefix) {
      if (entry.status !== "D") forbidden.push(`${entry.path} (${entry.status}; legacy generators may only be removed)`);
      continue;
    }

    if (forbiddenPrefixes.some((prefix) => entry.path.startsWith(prefix))) forbidden.push(entry.path);
  }

  if (forbidden.length > 0) failures.push(`Restricted files changed: ${forbidden.join(", ")}`);
}

function changedEntriesAgainstMain(rootDir, failures) {
  const baseRef = resolveMainBaseRef(rootDir);
  if (!baseRef) {
    failures.push("Could not resolve origin/main or main for restricted-file comparison.");
    return [];
  }

  const mergeBase = gitOneLine(rootDir, ["merge-base", "HEAD", baseRef]);
  if (!mergeBase) {
    failures.push(`Could not compute merge base between HEAD and ${baseRef}.`);
    return [];
  }

  return git(rootDir, ["diff", "--name-status", mergeBase, "HEAD"]).map((line) => {
    const [status, firstPath, secondPath] = line.split("\t");
    return { status: status?.[0] ?? "", path: secondPath || firstPath || "" };
  }).filter((entry) => entry.path);
}

function resolveMainBaseRef(rootDir) {
  for (const candidate of [
    ["refs/remotes/origin/main", "origin/main"],
    ["refs/heads/main", "main"]
  ]) {
    if (gitOneLine(rootDir, ["rev-parse", "--verify", `${candidate[0]}^{commit}`])) return candidate[1];
  }
  return null;
}

function git(rootDir, args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 && result.error && !result.stdout) throw result.error;
  return (result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function gitOneLine(rootDir, args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0 || (result.error && !result.stdout)) return null;
  return result.stdout.trim() || null;
}
