/**
 * Mobile, keyboard and WCAG 2.2 AA evidence for the Clinic participant entry.
 *
 * Clinic participants arrive on a shared device, often a phone, sometimes with
 * a screen reader or without a pointer at all. This suite boots the real
 * application against a synthetic Supabase, then drives the entry surface in
 * Chromium across the supported mobile viewports: automated WCAG 2.2 AA rules
 * via axe-core, reflow, target size, keyboard-only operation, visible focus,
 * accessible names, error association and status announcement.
 *
 * A failure here is a defect to fix, never a rule to relax.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { announceChromiumResolution, resolveApprovedChromiumExecutable } from "../lib/approved-chromium.mjs";

const chromiumResolution = resolveApprovedChromiumExecutable({ managedExecutablePath: chromium.executablePath() });
announceChromiumResolution(chromiumResolution);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const axeSource = fs.readFileSync(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");

const appPort = 3217;
const stubPort = 55437;
const appUrl = `http://localhost:${appPort}`;
const clinicPath = "/clinic/synthetic-a11y-clinic";

// WCAG 2.2 AA and everything it builds on.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

// Supported mobile viewports, smallest first. 320 CSS pixels is the WCAG 1.4.10
// reflow baseline; the rest are the common handset widths.
const VIEWPORTS = [
  { name: "reflow baseline 320", width: 320, height: 640 },
  { name: "iPhone SE 375", width: 375, height: 667 },
  { name: "iPhone 14 390", width: 390, height: 844 },
  { name: "Pixel 7 412", width: 412, height: 915 }
];

const event = {
  id: "20000000-0000-4000-8000-0000000000a1",
  public_slug: "synthetic-a11y-clinic",
  name: "Synthetic accessibility clinic",
  starts_at: "2026-09-01T13:00:00.000Z",
  ends_at: "2026-09-01T20:00:00.000Z",
  timezone: "America/New_York",
  location_name: "Accessibility verification center",
  geography: "Statewide",
  status: "published"
};

const stub = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${stubPort}`);
  const single = request.headers.accept?.includes("vnd.pgrst.object");
  if (requestUrl.pathname.startsWith("/rest/v1/clinic_events")) {
    const row = requestUrl.searchParams.get("select") === "public_slug" ? { public_slug: event.public_slug } : event;
    response.writeHead(200, { "content-type": "application/json", "content-range": "0-0/1" });
    response.end(JSON.stringify(single ? row : [row]));
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

const evidence = [];
let browser;
try {
  await waitFor(`${appUrl}${clinicPath}`, 90_000);
  browser = await chromium.launch({ headless: true, executablePath: chromiumResolution.executablePath });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2
    });
    const page = await context.newPage();
    const response = await page.goto(`${appUrl}${clinicPath}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${viewport.name}: Clinic entry did not load`);
    await page.getByRole("heading", { name: event.name }).waitFor();

    await verifyAutomatedWcag(page, viewport);
    await verifyReflow(page, viewport);
    await verifyTargetSize(page, viewport);
    await verifyAccessibleNames(page, viewport);
    await verifyKeyboardOnlyOperation(page, viewport);
    await verifyVisibleFocus(page, viewport);
    await verifyErrorAssociationAndAnnouncement(page, viewport);

    evidence.push(viewport.name);
    await context.close();
  }
} catch (error) {
  throw new Error(`${error instanceof Error ? error.message : String(error)}\nNext output:\n${output.slice(-6000)}`);
} finally {
  await browser?.close();
  next.kill("SIGTERM");
  await close(stub);
}

console.log(`Clinic mobile and accessibility passed on ${evidence.length} viewports (${evidence.join(", ")}).`);
console.log(`Automated rules: axe-core ${axeVersion()} against ${WCAG_TAGS.join(", ")}, including colour contrast.`);
console.log("Keyboard-only operation, visible focus, accessible names, target size, reflow, error association and status announcement all verified.");

async function verifyAutomatedWcag(page, viewport) {
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async (tags) => {
    const run = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
    return run.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 3).map((node) => node.html)
    }));
  }, WCAG_TAGS);
  assert.deepEqual(results, [],
    `${viewport.name}: WCAG 2.2 AA violations\n${JSON.stringify(results, null, 2)}`);
}

async function verifyReflow(page, viewport) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll("*")]
      .filter((element) => element.getBoundingClientRect().right > doc.clientWidth + 1)
      .slice(0, 3)
      .map((element) => element.outerHTML.slice(0, 120));
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
  });
  assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1,
    `${viewport.name}: content requires horizontal scrolling (${overflow.scrollWidth} > ${overflow.clientWidth})\n${overflow.offenders.join("\n")}`);
}

/** WCAG 2.2 AA 2.5.8: pointer targets are at least 24 by 24 CSS pixels. */
async function verifyTargetSize(page, viewport) {
  const undersized = await page.evaluate(() => {
    const selector = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [tabindex]:not([tabindex='-1'])";
    return [...document.querySelectorAll(selector)]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.width < 24 || box.height < 24);
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()} ${Math.round(box.width)}x${Math.round(box.height)}: ${element.outerHTML.slice(0, 100)}`;
      });
  });
  assert.deepEqual(undersized, [], `${viewport.name}: pointer targets below 24x24 CSS pixels\n${undersized.join("\n")}`);
}

async function verifyAccessibleNames(page, viewport) {
  const unnamed = await page.evaluate(() => {
    const selector = "a[href], button, input:not([type=hidden]), select, textarea";
    return [...document.querySelectorAll(selector)]
      .filter((element) => {
        const labelledBy = element.getAttribute("aria-labelledby");
        const named = element.getAttribute("aria-label")?.trim()
          || (labelledBy && labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).join(" ").trim())
          || (element.id && document.querySelector(`label[for="${element.id}"]`)?.textContent?.trim())
          || element.closest("label")?.textContent?.trim()
          || (element.tagName === "BUTTON" || element.tagName === "A" ? element.textContent?.trim() : "");
        return !named;
      })
      .map((element) => element.outerHTML.slice(0, 120));
  });
  assert.deepEqual(unnamed, [], `${viewport.name}: interactive elements without an accessible name\n${unnamed.join("\n")}`);
}

/**
 * Every interactive element must be reachable by Tab alone, in document order,
 * without the focus ring getting stuck.
 */
async function verifyKeyboardOnlyOperation(page, viewport) {
  const expected = await page.evaluate(() => {
    const selector = "a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])";
    return [...document.querySelectorAll(selector)]
      .filter((element) => element.getBoundingClientRect().width > 0)
      .map((element) => element.id || element.getAttribute("name") || element.tagName.toLowerCase());
  });
  assert.ok(expected.length > 0, `${viewport.name}: the entry surface exposes no interactive elements`);

  await page.evaluate(() => document.body.focus());
  const reached = [];
  for (let press = 0; press < expected.length + 12 && reached.length < expected.length; press += 1) {
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      return element.id || element.getAttribute("name") || element.tagName.toLowerCase();
    });
    if (active && !reached.includes(active) && expected.includes(active)) reached.push(active);
  }
  for (const target of expected) {
    assert.ok(reached.includes(target), `${viewport.name}: "${target}" is not reachable with the keyboard alone`);
  }
  assert.deepEqual(reached, expected.filter((target) => reached.includes(target)),
    `${viewport.name}: keyboard focus order does not follow document order`);
}

async function verifyVisibleFocus(page, viewport) {
  await page.focus("#eventCode");
  const focused = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector("#eventCode"));
    return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, boxShadow: style.boxShadow, borderColor: style.borderColor };
  });
  await page.evaluate(() => document.querySelector("#eventCode").blur());
  const blurred = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector("#eventCode"));
    return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, boxShadow: style.boxShadow, borderColor: style.borderColor };
  });
  assert.notDeepEqual(focused, blurred,
    `${viewport.name}: the access-code field looks identical focused and unfocused, so keyboard users cannot see where they are`);
}

/**
 * A rejected code must be announced, and must stay associated with the field so
 * it is read again when focus returns there.
 */
async function verifyErrorAssociationAndAnnouncement(page, viewport) {
  await page.route("**/api/clinic/entry", (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ success: false, error: "That access code is not valid for this event." }) }));

  await page.fill("#eventCode", "SYNTHETIC-INVALID-CODE");
  await page.getByRole("button", { name: /continue to participant consent/iu }).click();
  // Next.js mounts its own route announcer with role="alert", so target the
  // field's error region rather than the role alone.
  const alert = page.locator("#eventCodeError[role=alert]");
  await alert.waitFor({ state: "visible" });
  assert.match(await alert.innerText(), /not valid for this event/iu,
    `${viewport.name}: the rejection was not announced`);

  const association = await page.evaluate(() => {
    const input = document.querySelector("#eventCode");
    const describedBy = input.getAttribute("aria-describedby");
    return {
      invalid: input.getAttribute("aria-invalid"),
      describedBy,
      describedText: describedBy ? document.getElementById(describedBy)?.textContent?.trim() : null,
      describedRole: describedBy ? document.getElementById(describedBy)?.getAttribute("role") : null
    };
  });
  assert.equal(association.invalid, "true", `${viewport.name}: the rejected field is not marked aria-invalid`);
  assert.ok(association.describedBy, `${viewport.name}: the rejection is not associated with the field via aria-describedby`);
  assert.match(association.describedText ?? "", /not valid for this event/iu,
    `${viewport.name}: aria-describedby points at an element that does not carry the rejection`);
  assert.equal(association.describedRole, "alert", `${viewport.name}: the rejection is not announced as an alert`);

  // The error state must not introduce a WCAG violation of its own.
  await verifyAutomatedWcag(page, { name: `${viewport.name} (rejected code)` });
  await page.unroute("**/api/clinic/entry");
}

function axeVersion() {
  return JSON.parse(fs.readFileSync(path.join(root, "node_modules/axe-core/package.json"), "utf8")).version;
}

function listen(server, port) {
  return new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve(undefined)));
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${url} did not become ready within ${timeoutMs}ms\nNext output:\n${output.slice(-4000)}`);
}
