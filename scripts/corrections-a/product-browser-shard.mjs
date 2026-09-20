import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.CORRECTIONS_A_PRODUCT_BASE_URL;
const nodeModules = process.env.CODEX_NODE_MODULES;
if (!baseUrl) throw new Error("CORRECTIONS_A_PRODUCT_BASE_URL must name the integrated LegalEase app.");
if (!nodeModules) throw new Error("CODEX_NODE_MODULES is required for the bundled Playwright runtime.");
const { chromium } = await import(pathToFileURL(path.join(nodeModules, "playwright/index.mjs")).href);

const runtime = JSON.parse(fs.readFileSync(
  path.join(ROOT, "data/expungement-ai/corrections-a/runtime-fixtures.json"),
  "utf8"
));
const closure = JSON.parse(fs.readFileSync(
  path.join(ROOT, "data/expungement-ai/corrections-a/closure.json"),
  "utf8"
));
const closureByRoute = new Map(closure.routes.map((row) => [row.routeKey, row]));
const outputDirectory = path.join(ROOT, "data/expungement-ai/corrections-a/browser");
fs.mkdirSync(outputDirectory, { recursive: true });

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {})
});
const evidence = { apiRoutes: [], viewports: [] };
try {
  const api = await browser.newContext();
  for (const row of runtime.routes) {
    const response = await api.request.post(`${baseUrl.replace(/\/$/, "")}/api/expungement-ai/evaluate`, {
      data: {
        jurisdiction: row.jurisdiction,
        profileVersion: row.profileVersion,
        matterId: `corrections-a-product-${row.pathwayId}`,
        answers: row.answers
      }
    });
    assert.equal(response.status(), 200, `${row.routeKey}: product evaluate API status`);
    const evaluation = await response.json();
    const expected = closureByRoute.get(row.routeKey);
    assert.ok(expected, `${row.routeKey}: closure row missing`);
    assert.equal(evaluation.pathwayId, row.pathwayId, `${row.routeKey}: product API pathway`);
    assert.equal(evaluation.paymentAllowed, expected.checkoutExpected, `${row.routeKey}: product API payment`);
    evidence.apiRoutes.push({
      routeKey: row.routeKey,
      pathwayId: evaluation.pathwayId,
      resultCode: evaluation.resultCode,
      paymentAllowed: evaluation.paymentAllowed
    });
  }
  await api.close();

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const response = await page.goto(
      `${baseUrl.replace(/\/$/, "")}/expungement-ai/screening/ms`,
      { waitUntil: "networkidle" }
    );
    assert.ok(response?.ok(), `${viewport.name}: Mississippi screening page did not load`);
    await page.locator("main").waitFor({ state: "visible" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${viewport.name}: product page horizontal overflow is ${overflow}px`);
    assert.deepEqual(consoleErrors, [], `${viewport.name}: product browser console errors`);
    const screenshot = path.join(outputDirectory, `product-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    evidence.viewports.push({
      viewport,
      path: "/expungement-ai/screening/ms",
      horizontalOverflowPixels: overflow,
      consoleErrors,
      screenshot: path.relative(ROOT, screenshot)
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const paidRoutes = evidence.apiRoutes.filter((row) => row.paymentAllowed).map((row) => row.routeKey);
assert.deepEqual(paidRoutes, closure.routes.filter((row) => row.checkoutExpected).map((row) => row.routeKey));
const report = {
  schemaVersion: "expai-corrections-a-product-browser-shard/v1",
  baseUrl,
  actualEvaluatorApiRoutes: evidence.apiRoutes.length,
  paidRoutes,
  results: evidence
};
fs.writeFileSync(
  path.join(outputDirectory, "product-result.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
console.log("corrections-a-product-browser-shard: GREEN");
console.log(JSON.stringify(report, null, 2));
