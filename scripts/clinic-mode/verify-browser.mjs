import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appPort = 3211;
const stubPort = 55432;
const appUrl = `http://localhost:${appPort}`;
const clinicPath = "/clinic/synthetic-clinic";
const participantUserId = "30000000-0000-4000-8000-000000000099";
const assistedSessionId = "40000000-0000-4000-8000-000000000099";
const screeningSessionId = "50000000-0000-4000-8000-000000000099";
const clinicSessionToken = "synthetic-clinic-session-token";
const clinicSessionTokenHash = createHash("sha256").update(clinicSessionToken).digest("hex");
const resetReasons = [];
const authSession = {
  access_token: "synthetic-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "synthetic-refresh-token",
  user: { id: participantUserId, email: "clinic.participant@example.test", aud: "authenticated", role: "authenticated" }
};
const event = {
  id: "20000000-0000-4000-8000-000000000099",
  public_slug: "synthetic-clinic",
  name: "Synthetic security clinic",
  starts_at: "2026-09-01T13:00:00.000Z",
  ends_at: "2026-09-01T20:00:00.000Z",
  timezone: "America/New_York",
  location_name: "Local verification center",
  geography: "Three-state checkpoint",
  status: "published"
};

const stub = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${stubPort}`);
  const single = request.headers.accept?.includes("vnd.pgrst.object");
  if (requestUrl.pathname === "/auth/v1/user") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(authSession.user));
    return;
  }
  if (requestUrl.pathname === "/auth/v1/logout") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (requestUrl.pathname === "/rest/v1/clinic_assisted_sessions") {
    const trustedLookup = requestUrl.searchParams.get("handoff_token_hash") === `eq.${clinicSessionTokenHash}`
      && requestUrl.searchParams.get("participant_user_id") === `eq.${participantUserId}`;
    const row = {
      id: assistedSessionId,
      event_id: event.id,
      participant_user_id: participantUserId,
      screening_session_id: screeningSessionId,
      status: "active",
      expires_at: "2099-09-01T20:00:00.000Z"
    };
    response.writeHead(200, { "content-type": "application/json", "content-range": "0-0/1" });
    response.end(JSON.stringify(trustedLookup ? (single ? row : [row]) : (single ? null : [])));
    return;
  }
  if (request.url?.startsWith("/rest/v1/clinic_events")) {
    const row = requestUrl.searchParams.get("select") === "public_slug" ? { public_slug: event.public_slug } : event;
    const slugFilter = requestUrl.searchParams.get("public_slug");
    const trustedEvent = !slugFilter || slugFilter === `eq.${event.public_slug}`;
    response.writeHead(200, { "content-type": "application/json", "content-range": "0-0/1" });
    response.end(JSON.stringify(trustedEvent ? (single ? row : [row]) : (single ? null : [])));
    return;
  }
  if (requestUrl.pathname === "/rest/v1/screening_sessions") {
    const row = { jurisdiction: "MS" };
    response.writeHead(200, { "content-type": "application/json", "content-range": "0-0/1" });
    response.end(JSON.stringify(single ? row : [row]));
    return;
  }
  if (requestUrl.pathname === "/rest/v1/rpc/clinic_end_assisted_session") {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try { resetReasons.push(JSON.parse(body).p_reason); } catch {}
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify("ended"));
    });
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ message: "synthetic endpoint not configured" }));
});
await listen(stub, stubPort);

let output = "";
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-p", String(appPort)], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${stubPort}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
next.stdout.on("data", (chunk) => { output += chunk; });
next.stderr.on("data", (chunk) => { output += chunk; });

let browser;
try {
  await waitFor(`${appUrl}${clinicPath}`, 40_000);
  browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const response = await page.goto(`${appUrl}${clinicPath}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${viewport.name} Clinic entry did not load`);
    await page.getByRole("heading", { name: "Synthetic security clinic" }).waitFor();
    await page.getByText("Dedicated Clinic Mode").waitFor();
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.ok(dimensions.scrollWidth <= dimensions.clientWidth, `${viewport.name} Clinic entry overflowed horizontally`);
    const codeInput = page.getByLabel("Event access code");
    await codeInput.waitFor();
    if (viewport.name === "mobile") assert.ok((await codeInput.boundingBox())?.height >= 40, "mobile access-code target is too small");
    await context.close();
  }

  const routeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const routePage = await routeContext.newPage();
  await routePage.goto(`${appUrl}${clinicPath}/assist`, { waitUntil: "domcontentloaded" });
  assert.ok(routePage.url().includes("/expungement-ai/sign-in"), "unauthenticated assistance route did not fail closed to participant sign-in");
  const syntheticEventId = event.id;
  const routeChecks = [
    await routeContext.request.get(`${appUrl}/api/clinic/events/${syntheticEventId}/queue`),
    await routeContext.request.get(`${appUrl}/api/clinic/events/${syntheticEventId}/follow-ups`),
    await routeContext.request.get(`${appUrl}/api/clinic/events/${syntheticEventId}/reporting`),
    await routeContext.request.post(`${appUrl}/api/clinic/packet-accounting`, { data: { renderJobId: "60000000-0000-4000-8000-000000000099" } })
  ];
  for (const response of routeChecks) assert.ok([401, 403, 500, 503].includes(response.status()), `protected critical route failed open with ${response.status()}`);
  const invalidEntry = await routeContext.request.post(`${appUrl}/api/clinic/entry`, { data: { eventSlug: event.public_slug, code: "INVALID-CODE" } });
  assert.equal(invalidEntry.status(), 403, "event-code route failed open for an invalid code");
  await routeContext.close();

  const authCookie = {
    name: "sb-127-auth-token",
    value: `base64-${Buffer.from(JSON.stringify(authSession)).toString("base64url")}`,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Strict"
  };
  const ordinaryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ordinaryContext.addCookies([authCookie]);
  const ordinaryPage = await ordinaryContext.newPage();
  const ordinaryBriefcase = await ordinaryPage.goto(`${appUrl}/briefcase/reminders`, { waitUntil: "networkidle" });
  assert.equal(ordinaryBriefcase?.status(), 200, "ordinary authenticated Briefcase route did not load");
  assert.equal(await ordinaryPage.getByText("Shared-device privacy is active", { exact: true }).count(), 0, "ordinary DTC Briefcase incorrectly mounted the Clinic boundary");
  await ordinaryContext.close();

  const forgedClinicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await forgedClinicContext.addCookies([
    authCookie,
    { name: "clinic_session", value: clinicSessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" },
    { name: "clinic_event", value: "forged-event", domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }
  ]);
  const forgedClinicPage = await forgedClinicContext.newPage();
  const forgedBriefcase = await forgedClinicPage.goto(`${appUrl}/briefcase/reminders`, { waitUntil: "networkidle" });
  assert.equal(forgedBriefcase?.status(), 200, "valid Clinic session with forged event hint did not load");
  await forgedClinicPage.getByText("Shared-device privacy is active", { exact: true }).waitFor();
  await assertProtectedReset(forgedClinicPage, "forged clinic_event hint");
  await forgedClinicContext.close();

  const missingHintContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await missingHintContext.addCookies([
    authCookie,
    { name: "clinic_session", value: clinicSessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }
  ]);
  const missingHintPage = await missingHintContext.newPage();
  const missingHintBriefcase = await missingHintPage.goto(`${appUrl}/briefcase/reminders`, { waitUntil: "networkidle" });
  assert.equal(missingHintBriefcase?.status(), 200, "valid Clinic session without event hint did not load");
  await missingHintPage.getByText("Shared-device privacy is active", { exact: true }).waitFor();
  await assertProtectedReset(missingHintPage, "missing clinic_event hint");
  await missingHintContext.close();

  const forgedSessionContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await forgedSessionContext.addCookies([
    authCookie,
    { name: "clinic_session", value: "forged-clinic-session", domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" },
    { name: "clinic_event", value: event.public_slug, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }
  ]);
  const forgedSessionPage = await forgedSessionContext.newPage();
  const forgedSessionBriefcase = await forgedSessionPage.goto(`${appUrl}/briefcase/reminders`, { waitUntil: "networkidle" });
  assert.equal(forgedSessionBriefcase?.status(), 200, "forged Clinic session negative route did not load");
  assert.equal(await forgedSessionPage.getByText("Shared-device privacy is active", { exact: true }).count(), 0, "a forged clinic_session mounted the Clinic boundary");
  await forgedSessionContext.close();

  const clinicBriefcaseContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await clinicBriefcaseContext.addCookies([
    authCookie,
    { name: "clinic_session", value: clinicSessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" },
    { name: "clinic_event", value: event.public_slug, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }
  ]);
  const clinicBriefcasePage = await clinicBriefcaseContext.newPage();
  const protectedBriefcasePaths = [
    "/briefcase/reminders",
    "/briefcase/60000000-0000-4000-8000-000000000099",
    "/briefcase/60000000-0000-4000-8000-000000000099/packet-information",
    "/briefcase/60000000-0000-4000-8000-000000000099/review"
  ];
  for (const protectedPath of protectedBriefcasePaths) {
    const protectedBriefcase = await clinicBriefcasePage.goto(`${appUrl}${protectedPath}`, { waitUntil: "networkidle" });
    assert.equal(protectedBriefcase?.status(), 200, `Clinic participant route ${protectedPath} did not load`);
    await clinicBriefcasePage.getByText("Shared-device privacy is active", { exact: true }).waitFor();
  }
  const boundaryReset = clinicBriefcasePage.getByRole("button", { name: "End clinic session / Reset device", exact: true });
  await boundaryReset.waitFor();
  await clinicBriefcasePage.evaluate(async () => {
    localStorage.setItem("clinic-participant", "participant-private-value");
    sessionStorage.setItem("clinic-packet-draft", "packet-private-value");
    await caches.open("clinic-briefcase-packet").then((cache) => cache.put("/private-packet", new Response("private")));
    history.replaceState({ participant: "participant-private-value" }, "", location.href);
  });
  await clinicBriefcasePage.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")]
      .find((candidate) => candidate.textContent?.includes("End clinic session / Reset device"));
    return Boolean(button && Object.keys(button).some((key) =>
      key.startsWith("__reactProps$")
        && typeof button[key]?.onClick === "function"
    ));
  });
  const boundaryResetResponse = clinicBriefcasePage.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/clinic/session/reset"
  );
  await boundaryReset.click();
  assert.equal((await boundaryResetResponse).status(), 200, "Briefcase boundary reset endpoint failed after hydration");
  await clinicBriefcasePage.waitForURL(`${appUrl}${clinicPath}`);
  await clinicBriefcasePage.goBack({ waitUntil: "domcontentloaded" }).catch(() => null);
  await clinicBriefcasePage.waitForURL((url) =>
    url.pathname === clinicPath || url.pathname === "/expungement-ai/sign-in"
  );
  const deniedBackPath = new URL(clinicBriefcasePage.url()).pathname;
  await clinicBriefcasePage.close();
  const boundaryProofPage = await clinicBriefcaseContext.newPage();
  await boundaryProofPage.goto(`${appUrl}${clinicPath}`, { waitUntil: "networkidle" });
  const boundaryResetProof = await boundaryProofPage.evaluate(async () => ({
    pathname: location.pathname,
    participantValue: localStorage.getItem("clinic-participant"),
    packetDraftValue: sessionStorage.getItem("clinic-packet-draft"),
    cacheNames: await window.caches.keys(),
    historyState: history.state
  }));
  assert.notEqual(deniedBackPath, "/briefcase/60000000-0000-4000-8000-000000000099/review", "Briefcase Back restored the prior Clinic participant review");
  assert.equal(boundaryResetProof.participantValue, null, "Briefcase boundary reset retained the participant localStorage value");
  assert.equal(boundaryResetProof.packetDraftValue, null, "Briefcase boundary reset retained the packet-draft sessionStorage value");
  assert.ok(!boundaryResetProof.cacheNames.includes("clinic-briefcase-packet"), "Briefcase boundary reset retained the participant packet cache");
  assert.ok(!boundaryResetProof.historyState?.participant, "Briefcase boundary reset retained participant history state");
  assert.equal((await clinicBriefcaseContext.cookies()).filter((cookie) => cookie.name.startsWith("clinic_") || cookie.name.startsWith("sb-")).length, 0, "Briefcase boundary reset retained Clinic or auth cookies");
  assert.ok(resetReasons.includes("staff_reset"), "Briefcase boundary reset did not end the assisted session with the staff-reset reason");
  await clinicBriefcaseContext.close();

  const inactivityContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await inactivityContext.addCookies([
    authCookie,
    { name: "clinic_session", value: clinicSessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" },
    { name: "clinic_event", value: event.public_slug, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }
  ]);
  await inactivityContext.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler, timeout, ...args) => nativeSetTimeout(
      handler,
      timeout === 15 * 60 * 1000 ? 2_000 : timeout,
      ...args
    ));
  });
  const inactivityPage = await inactivityContext.newPage();
  await inactivityPage.goto(`${appUrl}/briefcase/reminders`, { waitUntil: "domcontentloaded" });
  await inactivityPage.getByText("Shared-device privacy is active", { exact: true }).waitFor();
  await inactivityPage.waitForURL(`${appUrl}${clinicPath}`);
  assert.ok(resetReasons.includes("inactivity"), "Briefcase inactivity did not end the assisted session with the inactivity reason");
  assert.equal((await inactivityContext.cookies()).filter((cookie) => cookie.name.startsWith("clinic_") || cookie.name.startsWith("sb-")).length, 0, "Briefcase inactivity retained Clinic or auth cookies");
  await inactivityContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${appUrl}${clinicPath}`, { waitUntil: "networkidle" });
  await context.addCookies(["clinic_session", "clinic_device", "clinic_event", "clinic_entry", "sb-synthetic-auth-token"].map((name) => ({ name, value: `synthetic-${name}`, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" })));
  await page.evaluate(async () => {
    localStorage.setItem("identity", "participant-one");
    localStorage.setItem("briefcase", "matter-one");
    sessionStorage.setItem("form-values", "sensitive");
    sessionStorage.setItem("upload-preview", "blob:prior");
    await caches.open("clinic-prior-packet").then((cache) => cache.put("/prior-packet", new Response("private")));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("clinic-prior-participant", 1);
      request.onsuccess = () => { request.result.close(); resolve(true); };
      request.onerror = () => reject(request.error);
    });
    history.pushState({ participant: "participant-one", matter: "matter-one" }, "", "/clinic/sensitive-prior");
  });
  const source = fs.readFileSync(path.join(root, "src/lib/clinic-mode/device-reset.mjs"), "utf8")
    .replace("export async function resetClinicDeviceState", "async function resetClinicDeviceState")
    .concat("\nwindow.__resetClinicDeviceState = resetClinicDeviceState;");
  await page.addScriptTag({ content: source });
  const resetResponse = await context.request.post(`${appUrl}/api/clinic/session/reset`, { data: { reason: "staff_reset" } });
  assert.equal(resetResponse.status(), 200, "server reset endpoint failed closed");
  assert.equal(resetResponse.headers()["cache-control"], "no-store, private, max-age=0, must-revalidate", "server reset response was cacheable");
  assert.equal(resetResponse.headers()["clear-site-data"], '"cache", "cookies", "storage"', "server reset omitted cookie clearing from Clear-Site-Data");
  const remainingParticipantCookies = (await context.cookies()).filter((cookie) => cookie.name.startsWith("clinic_") || cookie.name.startsWith("sb-"));
  assert.equal(remainingParticipantCookies.length, 0, "server reset retained an HttpOnly Clinic or Supabase auth cookie");
  await page.evaluate((cleanPath) => { void window.__resetClinicDeviceState(window, cleanPath); }, clinicPath);
  await page.waitForURL(`${appUrl}${clinicPath}`);
  await page.close();
  const resetProofPage = await context.newPage();
  await resetProofPage.goto(`${appUrl}${clinicPath}`, { waitUntil: "networkidle" });
  const resetProof = await resetProofPage.evaluate(async () => ({
    url: location.pathname,
    localIdentity: localStorage.getItem("identity"),
    localBriefcase: localStorage.getItem("briefcase"),
    sessionForm: sessionStorage.getItem("form-values"),
    sessionUpload: sessionStorage.getItem("upload-preview"),
    databaseNames: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).map((database) => database.name) : [],
    cacheNames: await window.caches.keys(),
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    historyState: history.state
  }));
  assert.notEqual(resetProof.url, "/clinic/sensitive-prior", "browser reset restored the prior participant route");
  assert.equal(resetProof.localIdentity, null, "browser reset retained participant identity in localStorage");
  assert.equal(resetProof.localBriefcase, null, "browser reset retained the participant matter in localStorage");
  assert.equal(resetProof.sessionForm, null, "browser reset retained form values in sessionStorage");
  assert.equal(resetProof.sessionUpload, null, "browser reset retained an upload preview in sessionStorage");
  assert.ok(!resetProof.databaseNames.includes("clinic-prior-participant"), "browser reset retained the participant IndexedDB database");
  assert.ok(!resetProof.cacheNames.includes("clinic-prior-packet"), "browser reset retained the participant packet cache");
  assert.equal(resetProof.registrations, 0, "browser reset retained a service worker");
  assert.ok(!resetProof.historyState?.participant, "browser Back restored participant history state");
  await context.close();
} catch (error) {
  throw new Error(`${error instanceof Error ? error.message : String(error)}\nNext output:\n${output.slice(-8000)}`);
} finally {
  await browser?.close();
  next.kill("SIGTERM");
  await close(stub);
}

console.log("Clinic Mode critical routes: desktop and mobile browser checks passed.");
console.log("Browser Back/reset: prior identity, matter, form, upload, packet cache, and IndexedDB state denied.");

function listen(server, port) { return new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); }); }
function close(server) { return new Promise((resolve) => server.close(() => resolve())); }
async function assertProtectedReset(page, label) {
  const resetButton = page.getByRole("button", { name: "End clinic session / Reset device", exact: true });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")]
      .find((candidate) => candidate.textContent?.includes("End clinic session / Reset device"));
    return Boolean(button && Object.keys(button).some((key) =>
      key.startsWith("__reactProps$")
        && typeof button[key]?.onClick === "function"
    ));
  });
  const resetResponse = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/clinic/session/reset"
  );
  await resetButton.click();
  assert.equal((await resetResponse).status(), 200, `${label} reset did not complete server-side`);
  await page.waitForURL(`${appUrl}${clinicPath}`);
}
async function waitFor(url, timeout) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Clinic app did not become ready at ${url}`);
}
