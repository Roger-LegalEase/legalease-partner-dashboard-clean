import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.CLINIC_AUDIT_BASE_URL ?? "http://127.0.0.1:3100";
const outputDirectory = path.resolve(
  "docs/rcap-clinic-mode-audit/evidence/screenshots"
);
const indexPath = path.resolve(
  "data/rcap-clinic-mode-audit/browser-evidence.json"
);

const cases = [
  {
    id: "BROWSER-001",
    name: "internal-clinic-route-absent-desktop",
    route: "/internal/clinic",
    role: "unauthenticated",
    viewport: { width: 1440, height: 1000 },
    findingIds: ["CLINIC-P1-001"]
  },
  {
    id: "BROWSER-002",
    name: "partner-clinic-route-absent-desktop",
    route: "/partner/clinic",
    role: "unauthenticated",
    viewport: { width: 1440, height: 1000 },
    findingIds: ["CLINIC-P1-001"]
  },
  {
    id: "BROWSER-003",
    name: "participant-clinic-route-absent-mobile",
    route: "/clinic/audit-event",
    role: "unauthenticated",
    viewport: { width: 390, height: 844 },
    findingIds: ["CLINIC-P1-001", "CLINIC-P0-001"]
  },
  {
    id: "BROWSER-004",
    name: "access-codes-authentication-gate-desktop",
    route: "/partner/access-codes",
    role: "unauthenticated",
    viewport: { width: 1440, height: 1000 },
    findingIds: ["CLINIC-P1-006"]
  },
  {
    id: "BROWSER-005",
    name: "synthetic-partner-page-unavailable-mobile",
    route: "/p/clinic-audit-synthetic",
    role: "unauthenticated",
    viewport: { width: 390, height: 844 },
    findingIds: ["CLINIC-P1-007"]
  },
  {
    id: "BROWSER-006",
    name: "follow-up-route-absent-desktop",
    route: "/partner/follow-up",
    role: "unauthenticated",
    viewport: { width: 1440, height: 1000 },
    findingIds: ["CLINIC-P1-004"]
  },
  {
    id: "BROWSER-007",
    name: "clinic-reporting-route-absent-desktop",
    route: "/partner/clinic/reports",
    role: "unauthenticated",
    viewport: { width: 1440, height: 1000 },
    findingIds: ["CLINIC-P1-005"]
  },
  {
    id: "BROWSER-008",
    name: "shared-device-reset-route-absent-mobile",
    route: "/clinic/reset",
    role: "unauthenticated",
    viewport: { width: 390, height: 844 },
    findingIds: ["CLINIC-P0-001"]
  },
  {
    id: "BROWSER-009",
    name: "partner-sign-in-required-desktop",
    route: "/sign-in?next=/partner/access-codes",
    role: "unauthenticated",
    viewport: { width: 1440, height: 1000 },
    findingIds: ["CLINIC-P1-006", "CLINIC-P1-011"]
  }
];

const requestedCoverage = [
  { surface: "internal event setup", evidenceId: "BROWSER-001", result: "ABSENT_ROUTE_404" },
  { surface: "partner event view", evidenceId: "BROWSER-002", result: "ABSENT_ROUTE_404" },
  { surface: "QR/code", evidenceId: "BROWSER-004", result: "ADJACENT_ROUTE_ENVIRONMENT_500; NO EVENT_QR_ROUTE" },
  { surface: "participant entry", evidenceId: "BROWSER-003", result: "ABSENT_ROUTE_404" },
  { surface: "assisted intake", evidenceId: "BROWSER-003", result: "ABSENT_ROUTE_404" },
  { surface: "shared-device reset", evidenceId: "BROWSER-008", result: "ABSENT_ROUTE_404" },
  { surface: "follow-up queue", evidenceId: "BROWSER-006", result: "ABSENT_ROUTE_404" },
  { surface: "reporting", evidenceId: "BROWSER-007", result: "ABSENT_ROUTE_404" },
  { surface: "access required", evidenceId: "BROWSER-009", result: "LOCAL_ENVIRONMENT_404_BECAUSE_SUPABASE_PUBLIC_CONFIG_IS_MISSING" },
  { surface: "capacity/code failure", evidenceId: null, result: "NOT_CAPTURED_NO_AUTHORIZED_STAGING_FIXTURE" }
];

await mkdir(outputDirectory, { recursive: true });
await mkdir(path.dirname(indexPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const evidence = [];
try {
  for (const item of cases) {
    const context = await browser.newContext({ viewport: item.viewport });
    const page = await context.newPage();
    const response = await page.goto(new URL(item.route, baseUrl).toString(), {
      waitUntil: "networkidle",
      timeout: 30_000
    });
    const fileName = `${item.name}.png`;
    const filePath = path.join(outputDirectory, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    const bytes = await readFile(filePath);
    evidence.push({
      ...item,
      requestedUrl: new URL(item.route, baseUrl).toString(),
      finalUrl: page.url(),
      httpStatus: response?.status() ?? null,
      title: await page.title(),
      screenshot: path.relative(process.cwd(), filePath),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      containsSyntheticParticipants: false,
      containsSecrets: false
    });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  indexPath,
  `${JSON.stringify(
    {
      testedBaseUrl: baseUrl,
      environment: "local production-shaped Next.js process without Supabase credentials",
      testedSha: process.env.CLINIC_AUDIT_SHA ?? null,
      capturedAt: new Date().toISOString(),
      note:
        "These screenshots prove route absence and unauthenticated gating only. No staging fixture authority was available, and no Clinic Mode surface exists to capture.",
      requestedCoverage,
      evidence
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Captured ${evidence.length} non-sensitive browser evidence images.`);
