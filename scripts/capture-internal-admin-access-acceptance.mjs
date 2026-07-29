// Real acceptance capture for internal admin browser access.
//
// The reason the bug survived is that every earlier local run had the gate
// switched off: outside production with no token configured the proxy passes
// everything through. This run does the opposite. It builds the application and
// serves it with `next start`, so NODE_ENV is production, and it sets
// INTERNAL_ADMIN_ACCESS_TOKEN, so the development passthrough cannot fire at
// all. Every step is driven through the real sign-in form in a real browser
// against a loopback-only Supabase stack; Supabase seeding and the server
// lifecycle are the only harness.
//
// One accommodation, stated rather than hidden. A production build turns on the
// sign-in captcha requirement — isAuthCaptchaRequired() is true whenever NODE_ENV
// is production — and no Turnstile key exists locally, so the real sign-in form
// cannot be completed at all. The run therefore sets the documented escape hatch
// NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED=false in the local environment only. That
// switch governs bot protection on sign-in and has nothing to do with the
// /internal gate under test, which stays fully active throughout and is asserted
// active before the first step runs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const root = process.cwd();
const baseUrl = "http://127.0.0.1:3000";
const outputDir =
  process.env.INTERNAL_ACCESS_CAPTURE_DIR ?? "/tmp/internal-access-visual-review";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const internalToken = process.env.INTERNAL_ADMIN_ACCESS_TOKEN;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Set the local Supabase URL, anon key, and secret key inline.");
}
if (!internalToken) {
  throw new Error(
    "INTERNAL_ADMIN_ACCESS_TOKEN must be set: the whole point is to run with the gate active."
  );
}
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(supabaseUrl).hostname)) {
  throw new Error("Acceptance capture only runs against loopback Supabase.");
}
if (process.env.NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED !== "false") {
  throw new Error(
    "Set NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED=false locally: a production build requires a captcha the local stack cannot serve, so the real sign-in form is otherwise unusable."
  );
}

const runId = `${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`.replace(
  /[^a-z0-9]/g,
  ""
);
const partnerSlug = `access-partner-${runId}`;
const adminEmail = `access-internal-${runId}@example.test`;
const adminPassword = `Local-Internal-${runId}!7`;
const partnerEmail = `access-partner-${runId}@example.test`;
const partnerPassword = `Local-Partner-${runId}!9`;

const INTERNAL_PATH = "/internal/partners/provisioning";
const REFUSAL = "Internal admin access token required.";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const captures = [];
const stepResults = [];

let browser;
let server;

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    await seed();
    await build();
    browser = await chromium.launch({ headless: true });
    server = await startServer();
    await assertGateIsActive();

    await step1();
    await step2();
    await step3();
    await step4();
    await step5();
    await step6();

    writeScreenshotIndex();
    console.log(`\nCaptured ${captures.length} real screens in ${outputDir}\n`);
    for (const result of stepResults) {
      console.log(
        `Step ${result.step}: ${result.status}${result.file ? ` — ${result.file}` : " — no screenshot (request-level)"}`
      );
    }
  } finally {
    if (browser) await browser.close();
    if (server) await stopServer(server);
  }
}

/**
 * Proves the gate is genuinely on before any step runs. If this passes when it
 * should not, every step below is meaningless — which is exactly what happened
 * on the earlier runs.
 */
async function assertGateIsActive() {
  const response = await fetch(`${baseUrl}${INTERNAL_PATH}`, { redirect: "manual" });
  assert.equal(
    response.status,
    401,
    `the gate must be active before the run starts, got ${response.status}`
  );
  assert.equal((await response.text()).trim(), REFUSAL);
}

// --- the six steps -----------------------------------------------------------

async function step1() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await signIn(page, adminEmail, adminPassword, "/internal/partners/onboarding");

  // Typed into the address bar: a plain navigation, no header, no token, no
  // extension. This is the thing that was impossible before.
  const response = await page.goto(`${baseUrl}${INTERNAL_PATH}`, { timeout: 120_000 });
  assert.equal(response.status(), 200, `the page must load, got ${response.status()}`);
  await page.getByRole("heading", { name: "Partner Provisioning" }).waitFor();
  const body = await page.locator("body").innerText();
  assert.ok(!body.includes(REFUSAL), "the proxy must not have refused this");
  assert.ok(
    !body.includes("Internal admin access denied"),
    "the application must not have denied this"
  );

  await record(page, 1, "01-step1-internal-admin-session-loads.png", "An internal administrator signs in and opens /internal/partners/provisioning from the address bar");
  await context.close();
}

async function step2() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}${INTERNAL_PATH}`, { timeout: 120_000 });
  assert.equal(response.status(), 401, `signed out must be refused, got ${response.status()}`);
  const body = await page.locator("body").innerText();
  assert.ok(body.includes(REFUSAL), "the refusal must come from the gate");
  assert.ok(
    !body.includes("Partner Provisioning"),
    "no internal content may render for a signed-out visitor"
  );
  await record(page, 2, "02-step2-signed-out-refused.png", "Signed out entirely, the same URL is refused by the gate");
  await context.close();
}

async function step3() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await signIn(page, partnerEmail, partnerPassword, "/partner/dashboard");

  const response = await page.goto(`${baseUrl}${INTERNAL_PATH}`, { timeout: 120_000 });
  assert.equal(
    response.status(),
    401,
    `a partner administrator must be refused, got ${response.status()}`
  );
  const body = await page.locator("body").innerText();
  assert.ok(body.includes(REFUSAL));
  assert.ok(
    !body.includes("Partner Provisioning"),
    "no internal content may render for a partner administrator"
  );

  // The same account must also be refused the two pages this fix newly gated.
  for (const guarded of ["/internal/partners/data", "/internal/partners/supabase-check"]) {
    const guardedResponse = await context.request.get(`${baseUrl}${guarded}`);
    assert.equal(
      guardedResponse.status(),
      401,
      `${guarded} must refuse a partner administrator`
    );
  }

  await record(page, 3, "03-step3-partner-admin-refused.png", "Signed in as a partner administrator who is not an internal admin, the same URL is refused");
  await context.close();
}

async function step4() {
  // A script, not a browser: correct token, no cookies at all.
  const response = await fetch(`${baseUrl}${INTERNAL_PATH}`, {
    headers: { Authorization: `Bearer ${internalToken}` },
    redirect: "manual"
  });
  assert.notEqual(
    response.status,
    401,
    "the bearer token path must keep working for tooling"
  );
  const body = await response.text();
  assert.ok(!body.includes(REFUSAL), "the gate must not have refused a correct token");
  // The token gets past the proxy; the application then applies its own check,
  // which is the design. What matters here is that the proxy admitted it.
  stepResults.push({ step: 4, status: "passed", file: null });
  console.log(`  step 4: correct bearer token admitted by the gate (${response.status})`);
}

async function step5() {
  for (const wrong of [
    "not-the-token",
    "x".repeat(internalToken.length),
    `${internalToken}x`,
    internalToken.slice(0, -1)
  ]) {
    const response = await fetch(`${baseUrl}${INTERNAL_PATH}`, {
      headers: { Authorization: `Bearer ${wrong}` },
      redirect: "manual"
    });
    assert.equal(
      response.status,
      401,
      `a wrong bearer token must be refused, got ${response.status}`
    );
    assert.equal((await response.text()).trim(), REFUSAL);
  }
  stepResults.push({ step: 5, status: "passed", file: null });
  console.log("  step 5: wrong bearer tokens refused, including same-length and off-by-one");
}

async function step6() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await signIn(page, adminEmail, adminPassword, "/internal/partners/onboarding");

  // Reached by session, then proven to have satisfied the application's own
  // internal-admin check by rendering real data rather than an error state.
  await page.goto(`${baseUrl}/internal/partners/onboarding`, { timeout: 120_000 });
  await page.getByRole("heading", { name: "Partner onboarding" }).waitFor({
    timeout: 60_000
  });
  const onboardingBody = await page.locator("body").innerText();
  assert.ok(
    onboardingBody.includes(partnerSlug),
    `the page must render this partner's real data, not an error state`
  );
  assert.ok(!onboardingBody.includes("Internal admin access denied"));
  assert.ok(!onboardingBody.includes(REFUSAL));

  // And the page this fix newly gated admits the same administrator.
  const dataResponse = await page.goto(`${baseUrl}/internal/partners/data`, {
    timeout: 120_000
  });
  assert.equal(dataResponse.status(), 200, "the newly gated page must admit a real admin");
  const dataBody = await page.locator("body").innerText();
  assert.ok(
    dataBody.includes("Internal administrator access required"),
    "the badge must state the requirement it now enforces"
  );
  assert.ok(
    !dataBody.includes("Auth will be added before production"),
    "the stale promise must be gone"
  );
  assert.ok(!dataBody.includes("Internal admin access denied"));

  await record(page, 6, "06-step6-session-passes-application-check.png", "Reached by session, the newly gated internal page renders real data, so the application's own internal-admin check passed too");
  await context.close();
}

// --- helpers -----------------------------------------------------------------

async function signIn(page, email, password, nextPath) {
  await page.goto(`${baseUrl}/sign-in?next=${encodeURIComponent(nextPath)}`, {
    timeout: 180_000
  });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${baseUrl}${nextPath}`, { timeout: 60_000 }).catch(async (error) => {
    // Report what the screen said rather than a bare navigation timeout.
    const alerts = await page.getByRole("alert").allInnerTexts().catch(() => []);
    const visible = (await page.locator("body").innerText().catch(() => "")).slice(0, 400);
    throw new Error(
      `sign-in did not reach ${nextPath}; url=${page.url()} alerts=${JSON.stringify(alerts)} body=${JSON.stringify(visible)} (${error.message})`
    );
  });
}

async function seed() {
  const record = await admin
    .from("partner_records")
    .upsert(
      {
        partner_id: partnerSlug,
        partner_slug: partnerSlug,
        partner_name: "Access Check Partner",
        organization_name: "Access Check Partner",
        program_tier: "implementation",
        payment_status: "paid",
        qualification_status: "qualified",
        provisioning_status: "provisioned"
      },
      { onConflict: "partner_slug" }
    )
    .select("id")
    .single();
  assert.equal(record.error, null, record.error?.message);

  const workspace = await admin
    .from("partner_onboarding")
    .upsert(
      {
        partner_slug: partnerSlug,
        partner_record_id: record.data.id,
        status: "setup_in_progress"
      },
      { onConflict: "partner_slug" }
    );
  assert.equal(workspace.error, null, workspace.error?.message);

  const internal = await createUser(adminEmail, adminPassword);
  const internalMembership = await admin.from("partner_users").insert({
    auth_user_id: internal,
    partner_slug: null,
    role: "internal_admin",
    status: "active",
    invited_email: adminEmail
  });
  assert.equal(internalMembership.error, null, internalMembership.error?.message);

  const partner = await createUser(partnerEmail, partnerPassword);
  const partnerMembership = await admin.from("partner_users").insert({
    auth_user_id: partner,
    partner_slug: partnerSlug,
    role: "partner_admin",
    status: "active",
    invited_email: partnerEmail
  });
  assert.equal(partnerMembership.error, null, partnerMembership.error?.message);
}

async function createUser(email, password) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  assert.equal(created.error, null, created.error?.message);
  return created.data.user.id;
}

/**
 * A production build, because that is the only way NODE_ENV is production for
 * the proxy and the development passthrough is genuinely out of the picture.
 */
async function build() {
  console.log("  building the application so the gate runs in production mode...");
  await run("npm", ["run", "build"]);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let tail = "";
    const collect = (chunk) => {
      tail = `${tail}${chunk}`.slice(-4000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(" ")} failed:\n${tail}`));
    });
  });
}

async function startServer() {
  await waitForPortState(false, 30_000);
  const child = spawn("npm", ["start", "--", "--hostname", "127.0.0.1", "--port", "3000"], {
    cwd: root,
    // Next runs as a grandchild of npm; its own process group is what lets the
    // whole tree be signalled, which is what actually frees port 3000.
    detached: true,
    env: { ...process.env, NEXT_PUBLIC_APP_URL: baseUrl },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("the server exited before becoming ready");
    }
    try {
      const response = await fetch(`${baseUrl}/sign-in`);
      if (response.ok) return child;
    } catch {
      // Keep waiting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("the server did not become ready");
}

async function stopServer(child) {
  for (const signal of ["SIGTERM", "SIGKILL"]) {
    if (child.exitCode !== null) break;
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {
        // Already gone.
      }
    }
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 8_000))
    ]);
  }
  await waitForPortState(false, 30_000);
}

async function waitForPortState(shouldBeBound, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let bound = false;
    try {
      await fetch(`${baseUrl}/sign-in`, { signal: AbortSignal.timeout(2_000) });
      bound = true;
    } catch {
      bound = false;
    }
    if (bound === shouldBeBound) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`port 3000 stayed ${shouldBeBound ? "free" : "bound"}`);
}

async function record(page, step, file, title) {
  assert.ok(!page.url().includes("harness"), "no capture may come from a harness route");
  await page.screenshot({ path: path.join(outputDir, file), fullPage: true });
  captures.push({ step, file, title, url: sanitizeUrl(page.url()) });
  stepResults.push({ step, status: "passed", file });
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function writeScreenshotIndex() {
  const lines = [
    "# Internal admin browser access acceptance screenshots",
    "",
    "Captured from real application screens, driven through the real sign-in form,",
    "against a loopback-only Supabase stack. The application was built and served",
    "with `next start` and INTERNAL_ADMIN_ACCESS_TOKEN was set, so the gate was",
    "genuinely active for every step: the run refuses to begin unless an",
    "unauthenticated request to an internal path is already answered with 401.",
    "",
    "Steps 4 and 5 are request-level rather than browser-level, because a bearer",
    "token is what a script sends and a browser cannot.",
    "",
    "| Step | Screenshot | What it shows | Screen |",
    "| --- | --- | --- | --- |",
    ...captures.map((item) => `| ${item.step} | ${item.file} | ${item.title} | ${item.url} |`),
    ""
  ];
  fs.writeFileSync(path.join(outputDir, "screenshot-index.md"), lines.join("\n"));
}

await main();
