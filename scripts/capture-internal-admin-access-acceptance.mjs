/**
 * Staging-only, read-only browser acceptance for the internal authorization shell.
 * Refuses production and loopback. It never creates invitations, partners,
 * publications, activations, uploads, or commercial-gate changes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = requiredUrl("INTERNAL_ACCESS_STAGING_URL");
const outputDir = createOutputDirectory(process.env.INTERNAL_ACCESS_CAPTURE_DIR);
const accounts = {
  admin: credentials("INTERNAL_ACCESS_STAGING_ADMIN"),
  denied: credentials("INTERNAL_ACCESS_STAGING_DENIED"),
  partnerAdmin: credentials("INTERNAL_ACCESS_STAGING_PARTNER_ADMIN")
};
const internalPath = "/internal/partners/provisioning";
const apiPath = "/api/internal/partners/provisioning";
const evidence = [];

const browser = await chromium.launch({ headless: true });
try {
  await verifyAdminDesktop();
  await verifyAdminMobile();
  await verifyDeniedAccount();
  await verifyPartnerAdmin();
  fs.writeFileSync(
    path.join(outputDir, "acceptance.json"),
    `${JSON.stringify({ baseOrigin: new URL(baseUrl).origin, capturedAt: new Date().toISOString(), evidence }, null, 2)}\n`
  );
  console.log(`Staging internal-admin browser acceptance passed (${evidence.length} checks).`);
} finally {
  await browser.close();
}

async function verifyAdminDesktop() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await signIn(page, accounts.admin);
  await assertAdminShell(page, accounts.admin.email);
  const api = await context.request.get(`${baseUrl}${apiPath}`);
  assert.equal(api.status(), 405, "authorized GET reaches the method boundary only after authorization");
  await captureLocator(page, "desktop-admin-identity.png", "header", "desktop internal identity shell");

  await page.getByRole("button", { name: "Sign out of LegalEase Internal" }).click();
  await page.waitForURL(/\/sign-in\?signedOut=1$/u);
  const internalAfter = await context.request.get(`${baseUrl}${internalPath}`, { maxRedirects: 0 });
  assert.ok([303, 307, 308].includes(internalAfter.status()), `post-sign-out internal page must redirect, got ${internalAfter.status()}`);
  const apiAfter = await context.request.get(`${baseUrl}${apiPath}`);
  assert.equal(apiAfter.status(), 401);
  await page.goBack();
  await page.waitForLoadState("domcontentloaded");
  assert.equal(await page.getByRole("heading", { name: "Partner Provisioning" }).count(), 0, "Back must not reveal the protected page");
  evidence.push("desktop admin identity and role", "local sign-out", "post-sign-out page/API denial", "Back-cache denial");
  await context.close();
}

async function verifyAdminMobile() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await signIn(page, accounts.admin);
  await assertAdminShell(page, accounts.admin.email);
  const button = page.getByRole("button", { name: "Sign out of LegalEase Internal" });
  await button.focus();
  assert.equal(await button.evaluate((element) => document.activeElement === element), true);
  await captureLocator(page, "mobile-admin-identity.png", "header", "mobile internal identity shell");
  evidence.push("mobile visible and keyboard-focusable sign-out");
  await context.close();
}

async function verifyDeniedAccount() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await signIn(page, accounts.denied);
  await page.getByRole("heading", { name: "Internal admin access denied" }).waitFor();
  const body = await page.locator("body").innerText();
  assert.ok(body.includes(`Signed in as: ${accounts.denied.email.toLowerCase()}`));
  assert.ok(body.includes("Sign out"));
  assert.ok(body.includes("Sign in with another account"));
  assert.ok(!body.includes("Provisioning records"));
  const api = await context.request.get(`${baseUrl}${apiPath}`);
  assert.equal(api.status(), 403);
  await captureLocator(page, "denied-account.png", "main", "denied identity and recovery controls");
  await page.getByRole("button", { name: "Sign in with another account" }).click();
  await page.waitForURL(/\/sign-in\?switchAccount=1$/u);
  const afterSwitch = await context.request.get(`${baseUrl}${apiPath}`);
  assert.equal(afterSwitch.status(), 401, "switch-account must clear the denied account session");
  evidence.push("external account denied without internal data", "denied API 403", "switch-account local sign-out");
  await context.close();
}

async function verifyPartnerAdmin() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await signIn(page, accounts.partnerAdmin);
  await page.getByRole("heading", { name: "Internal admin access denied" }).waitFor();
  assert.ok(!(await page.locator("body").innerText()).includes("Provisioning records"));
  const api = await context.request.get(`${baseUrl}${apiPath}`);
  assert.equal(api.status(), 403);
  evidence.push("partner administrator denied page and API");
  await context.close();
}

async function signIn(page, account) {
  await page.goto(`${baseUrl}/sign-in?next=${encodeURIComponent(internalPath)}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${baseUrl}${internalPath}`);
}

async function assertAdminShell(page, email) {
  await page.getByRole("heading", { name: "Partner Provisioning" }).waitFor();
  const shell = page.getByRole("region", { name: "Signed-in internal account" });
  await shell.getByText(email.toLowerCase(), { exact: true }).waitFor();
  await shell.getByText("internal_admin", { exact: true }).waitFor();
  await shell.getByRole("button", { name: "Sign out of LegalEase Internal" }).waitFor();
}

async function captureLocator(page, filename, selector, label) {
  await page.locator(selector).first().screenshot({ path: path.join(outputDir, filename) });
  evidence.push(label);
}

function requiredUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  const forbidden = new Set([
    "127.0.0.1",
    "localhost",
    "::1",
    "legaleasepartner.com",
    "www.legaleasepartner.com",
    "expungement.ai",
    "www.expungement.ai",
    "legalease.com",
    "www.legalease.com"
  ]);
  if (parsed.protocol !== "https:" || forbidden.has(host)) {
    throw new Error(`${name} must be an HTTPS non-production staging origin.`);
  }
  return parsed.origin;
}

function credentials(prefix) {
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are required.`);
  return { email, password };
}

function createOutputDirectory(requestedPath) {
  if (!requestedPath) {
    return fs.mkdtempSync("/tmp/internal-access-staging-review-");
  }

  const resolved = path.resolve(requestedPath);
  if (fs.existsSync(resolved)) {
    throw new Error("INTERNAL_ACCESS_CAPTURE_DIR must not already exist; acceptance evidence is never overwritten.");
  }
  fs.mkdirSync(resolved, { recursive: false, mode: 0o700 });
  return resolved;
}
