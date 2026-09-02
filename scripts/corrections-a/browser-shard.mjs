import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const nodeModules = process.env.CODEX_NODE_MODULES;
if (!nodeModules) throw new Error("CODEX_NODE_MODULES is required for the bundled Playwright runtime.");
const { chromium } = await import(
  pathToFileURL(path.join(nodeModules, "playwright/index.mjs")).href
);

const baseUrl = process.env.CORRECTIONS_A_BROWSER_BASE_URL ?? "http://127.0.0.1:4317";
const outputDirectory = path.join(ROOT, "data/expungement-ai/corrections-a/browser");
fs.mkdirSync(outputDirectory, { recursive: true });

const expectedPaid = [
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40",
  "LA:first-offense-marijuana-expungement-after-90-days-art-998"
];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];
const evidence = [];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {})
});
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    assert.equal(await page.title(), "Corrections A closure matrix fixture");
    assert.equal(await page.locator("[data-route-key]").count(), 36, `${viewport.name}: route count`);
    assert.equal(await page.locator('[data-payment="true"]').count(), 2, `${viewport.name}: paid count`);
    assert.equal(await page.locator('[data-payment="false"]').count(), 34, `${viewport.name}: closed count`);
    assert.deepEqual(
      await page.locator('[data-payment="true"]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-route-key"))
      ),
      expectedPaid,
      `${viewport.name}: paid route identities`
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${viewport.name}: horizontal overflow is ${overflow}px`);
    assert.deepEqual(consoleErrors, [], `${viewport.name}: browser console errors`);

    const screenshot = path.join(outputDirectory, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    evidence.push({
      viewport,
      routesRendered: 36,
      paidRoutesRendered: 2,
      closedRoutesRendered: 34,
      horizontalOverflowPixels: overflow,
      consoleErrors,
      screenshot: path.relative(ROOT, screenshot)
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: "expai-corrections-a-browser-fixture/v1",
  baseUrl,
  expectedPaidRoutes: expectedPaid,
  results: evidence
};
const reportPath = path.join(outputDirectory, "result.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log("corrections-a-closure-matrix: GREEN");
console.log(JSON.stringify(report, null, 2));
