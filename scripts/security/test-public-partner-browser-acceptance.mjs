#!/usr/bin/env node
/**
 * Loopback-only browser evidence for the partner publication boundary.
 *
 * The run temporarily moves the seeded demo tenant through private and public
 * publication combinations, then restores its exact starting state. It never
 * contacts a hosted Supabase project or a deployed application.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { announceChromiumResolution, resolveApprovedChromiumExecutable } from "../lib/approved-chromium.mjs";

const chromiumResolution = resolveApprovedChromiumExecutable({ managedExecutablePath: chromium.executablePath() });
announceChromiumResolution(chromiumResolution);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1"]);
if (!supabaseUrl || !LOOPBACK.has(new URL(supabaseUrl).hostname)) {
  throw new Error("Publication browser acceptance requires loopback Supabase.");
}
if (!anonKey || !serviceRoleKey) {
  throw new Error("Local anon and service-role keys are required.");
}

const root = process.cwd();
const port = 3221;
const baseUrl = `http://127.0.0.1:${port}`;
const slug = "demo-partner";
const privateMarker = "Demo Justice Access Partner";
const outputDir = process.env.PUBLICATION_BROWSER_EVIDENCE_DIR ?? "/tmp/rcap-publication-browser";
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const checks = [];
let browser;
let server;
let activationBefore;
let publicationBefore;
let publicationExisted = false;

function pass(name) {
  checks.push(name);
  console.log(`  ok  ${name}`);
}

try {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  ({ activationBefore, publicationBefore } = await loadStartingState());
  await makePrivateReadyFixture();

  server = await startServer();
  browser = await chromium.launch({ headless: true, executablePath: chromiumResolution.executablePath });

  await verifyPrivateCombinations();
  await verifyLivePublication();
  await verifyAttributionAuthContinuation();
  await verifyResponsiveAndAccessibleLivePage();
  await verifyDiscoveryParity();
} finally {
  await browser?.close();
  if (server) await stopServer(server);
  if (activationBefore) await restoreStartingState();
}

const restored = await fetchState();
assert.deepEqual(restored.activation, activationBefore, "partner activation did not roll back exactly");
assert.deepEqual(restored.publication, publicationBefore, "partner publication did not roll back exactly");
pass("the local fixture rolled back to its exact starting state");

fs.writeFileSync(
  path.join(outputDir, "evidence.json"),
  JSON.stringify({ sourceSha: process.env.RCAP_SOURCE_SHA ?? null, checks }, null, 2)
);
console.log(`Publication browser acceptance passed ${checks.length}/${checks.length} cases.`);

async function loadStartingState() {
  const state = await fetchState();
  assert.ok(state.activation, `missing seeded ${slug} activation row`);
  publicationExisted = Boolean(state.publication);
  return { activationBefore: state.activation, publicationBefore: state.publication };
}

async function fetchState() {
  const [activation, publication] = await Promise.all([
    admin
      .from("partner_records")
      .select("payment_status, qualification_status, provisioning_status")
      .eq("partner_slug", slug)
      .single(),
    admin
      .from("partner_onboarding")
      .select("status, landing_page_ready, internal_approved_at, launched_at")
      .eq("partner_slug", slug)
      .maybeSingle()
  ]);
  if (activation.error) throw activation.error;
  if (publication.error) throw publication.error;
  return { activation: activation.data, publication: publication.data };
}

async function makePrivateReadyFixture() {
  if (!publicationExisted) {
    const { error } = await admin.from("partner_onboarding").insert({
      partner_slug: slug,
      status: "setup_in_progress"
    });
    if (error) throw error;
  }
  await updateActivation({
    payment_status: "demo_paid",
    qualification_status: "qualified",
    provisioning_status: "provisioned"
  });
  await updatePublication({
    status: "setup_in_progress",
    landing_page_ready: false,
    internal_approved_at: null,
    launched_at: null
  });
}

async function verifyPrivateCombinations() {
  const now = new Date().toISOString();
  const cases = [
    ["unpublished", { status: "setup_in_progress", landing_page_ready: false, internal_approved_at: null, launched_at: null }, "provisioned"],
    ["inactive", { status: "live", landing_page_ready: true, internal_approved_at: now, launched_at: now }, "paused"],
    ["not-ready", { status: "live", landing_page_ready: false, internal_approved_at: now, launched_at: now }, "provisioned"],
    ["unapproved", { status: "live", landing_page_ready: true, internal_approved_at: null, launched_at: now }, "provisioned"]
  ];
  for (const [name, publication, provisioningStatus] of cases) {
    await updateActivation({ provisioning_status: provisioningStatus });
    await updatePublication(publication);
    const response = await fetch(`${baseUrl}/p/${slug}`);
    const body = await response.text();
    assert.equal(response.status, 404, `${name} partner returned ${response.status}`);
    assert.ok(!body.includes(privateMarker), `${name} denial leaked the partner name`);
    assert.match(body, /noindex/i, `${name} denial is missing noindex metadata`);
    pass(`${name} partner returns a non-disclosing 404`);
  }
  const guessed = await fetch(`${baseUrl}/p/guessed-tenant-that-does-not-exist`);
  assert.equal(guessed.status, 404);
  assert.ok(!(await guessed.text()).includes(privateMarker));
  pass("a guessed slug returns the same non-disclosing 404 boundary");
}

async function verifyLivePublication() {
  const now = new Date().toISOString();
  await updateActivation({ provisioning_status: "provisioned" });
  await updatePublication({
    status: "live",
    landing_page_ready: true,
    internal_approved_at: now,
    launched_at: now
  });
  const response = await fetch(`${baseUrl}/p/${slug}`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.ok(body.includes(privateMarker));
  pass("an explicitly approved, launched, active fixture returns 200");
}

async function verifyAttributionAuthContinuation() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const query = new URLSearchParams({
    county: "Hinds County",
    utm_source: "newsletter",
    utm_medium: "email",
    utm_campaign: "fresh-start-2026",
    source: "partner-site",
    ref: "fall-clinic"
  });
  const response = await page.goto(`${baseUrl}/intake/${slug}?${query}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });
  assert.equal(response?.status(), 200);
  const startLink = page.getByRole("link", { name: "Start your record-clearing screening" });
  await startLink.waitFor({ timeout: 90_000 });
  const createHref = await startLink.getAttribute("href");
  assert.ok(createHref);
  const authUrl = new URL(createHref, baseUrl);
  const nextPath = authUrl.searchParams.get("next");
  assert.equal(authUrl.searchParams.get("mode"), "create");
  assert.ok(nextPath);
  const continuation = new URL(nextPath, baseUrl);
  for (const [key, value] of query) assert.equal(continuation.searchParams.get(key), value, `${key} was lost before authentication`);
  await page.goto(authUrl.toString(), { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator('[data-auth-mode="create"]').waitFor({ timeout: 90_000 });
  assert.equal(await page.getByRole("heading", { name: "Create your account" }).count(), 1);
  await context.close();
  pass("county, UTM and source/ref survive the real authentication continuation without becoming authority fields");
}

async function verifyResponsiveAndAccessibleLivePage() {
  const viewports = [
    ["390px", 390, 844, 1],
    ["768px", 768, 1024, 1],
    ["1440px", 1440, 1000, 1],
    ["200% zoom equivalent", 360, 900, 2]
  ];
  for (const [name, width, height, scale] of viewports) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: scale
    });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/p/${slug}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200);
    assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
    const visibleCopy = await page.locator("body").innerText();
    assert.ok(!visibleCopy.includes("$50"), `${name} exposes consumer price copy`);
    assert.ok(!/stripe/i.test(visibleCopy), `${name} exposes consumer payment-provider copy`);
    const audit = await page.evaluate(() => {
      const doc = document.documentElement;
      const controls = [...document.querySelectorAll("a[href],button,input,select,textarea")]
        .filter((element) => element.getBoundingClientRect().width > 0);
      return {
        overflow: doc.scrollWidth - doc.clientWidth,
        unnamed: controls.filter((element) => {
          const label = element.getAttribute("aria-label") || element.textContent?.trim();
          return !label;
        }).length
      };
    });
    assert.ok(audit.overflow <= 1, `${name} has ${audit.overflow}px horizontal overflow`);
    assert.equal(audit.unnamed, 0, `${name} has unnamed controls`);
    await page.screenshot({ path: path.join(outputDir, `public-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`), fullPage: true });
    await context.close();
    pass(`${name} public page has one H1, named controls, and no horizontal overflow`);
  }

  const reduced = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    reducedMotion: "reduce"
  });
  const page = await reduced.newPage();
  await page.goto(`${baseUrl}/p/${slug}`);
  assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
  await page.keyboard.press("Tab");
  assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), "BODY");
  await reduced.close();
  pass("reduced motion and keyboard focus are honored");
}

async function verifyDiscoveryParity() {
  const sitemap = await (await fetch(`${baseUrl}/partner-sitemap.xml`)).text();
  assert.ok(sitemap.includes(`/p/${slug}`));
  assert.ok(!sitemap.includes("fulton-county"));
  const robots = await (await fetch(`${baseUrl}/robots.txt`)).text();
  assert.ok(robots.includes("partner-sitemap.xml"));
  assert.match(robots, /Disallow: \/partner\//);
  pass("robots and sitemap use the authoritative publication boundary");
}

async function updateActivation(values) {
  const { error } = await admin.from("partner_records").update(values).eq("partner_slug", slug);
  if (error) throw error;
}

async function updatePublication(values) {
  const { error } = await admin.from("partner_onboarding").update(values).eq("partner_slug", slug);
  if (error) throw error;
}

async function restoreStartingState() {
  await updateActivation(activationBefore);
  if (publicationExisted) {
    await updatePublication(publicationBefore);
  } else {
    const { error } = await admin.from("partner_onboarding").delete().eq("partner_slug", slug);
    if (error) throw error;
  }
}

async function startServer() {
  const child = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    detached: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: baseUrl,
      NEXT_PUBLIC_PARTNER_APP_URL: baseUrl,
      ENABLE_SUPABASE_PARTNER_DATA: "true",
      RCAP_PARTNER_ONBOARDING_ENABLED: "true",
      NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next exited before readiness:\n${output.slice(-3000)}`);
    try {
      const response = await fetch(`${baseUrl}/robots.txt`);
      if (response.ok) return child;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next did not become ready:\n${output.slice(-3000)}`);
}

async function stopServer(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 8_000))
  ]);
}
