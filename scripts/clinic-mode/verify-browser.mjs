import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appPort = 3211;
const stubPort = 55432;
const appUrl = `http://127.0.0.1:${appPort}`;
const clinicPath = "/clinic/synthetic-clinic";
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
  if (request.url?.startsWith("/rest/v1/clinic_events")) {
    response.writeHead(200, { "content-type": "application/json", "content-range": "0-0/1" });
    response.end(JSON.stringify(request.headers.accept?.includes("vnd.pgrst.object") ? event : [event]));
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
  for (const response of routeChecks) assert.ok([401, 403, 503].includes(response.status()), `protected critical route failed open with ${response.status()}`);
  const invalidEntry = await routeContext.request.post(`${appUrl}/api/clinic/entry`, { data: { eventSlug: event.public_slug, code: "INVALID-CODE" } });
  assert.equal(invalidEntry.status(), 403, "event-code route failed open for an invalid code");
  await routeContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${appUrl}${clinicPath}`, { waitUntil: "networkidle" });
  await context.addCookies(["clinic_session", "clinic_device", "clinic_event", "clinic_entry", "sb-synthetic-auth-token"].map((name) => ({ name, value: `synthetic-${name}`, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Strict" })));
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
  await page.goBack({ waitUntil: "networkidle" }).catch(() => null);
  const resetProof = await page.evaluate(async () => ({
    url: location.pathname,
    local: localStorage.length,
    session: sessionStorage.length,
    databases: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).length : 0,
    caches: (await window.caches.keys()).length,
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    historyState: history.state
  }));
  assert.notEqual(resetProof.url, "/clinic/sensitive-prior", "browser Back restored the prior participant route");
  assert.equal(resetProof.local, 0, "browser reset retained localStorage");
  assert.equal(resetProof.session, 0, "browser reset retained sessionStorage");
  assert.equal(resetProof.databases, 0, "browser reset retained IndexedDB");
  assert.equal(resetProof.caches, 0, "browser reset retained Cache Storage");
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
async function waitFor(url, timeout) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Clinic app did not become ready at ${url}`);
}
