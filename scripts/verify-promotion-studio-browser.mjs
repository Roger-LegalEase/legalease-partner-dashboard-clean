/** Browser-level Promotion Studio verification against the real client component. */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = process.env.PROMOTION_STUDIO_BROWSER_PORT ?? "3191";
const BASE = `http://localhost:${PORT}`;
// Webpack avoids a known Turbopack persistence panic when several repository verifiers start
// short-lived dev servers against the same checkout in succession.
const server = spawn("npx", ["next", "dev", "--webpack", "--port", PORT], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "development",
    CONTENT_PROMOTION_BROWSER_VERIFIER: "true",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "promotion-verifier-anon"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let log = "";
server.stdout.on("data", (chunk) => (log += chunk.toString()));
server.stderr.on("data", (chunk) => (log += chunk.toString()));

const failures = [];
const checks = [];
try {
  await waitForServer(`${BASE}/verification/promotion-studio`, 120_000);
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1536, height: 1000 } });
  await desktop.setExtraHTTPHeaders({ "x-legalease-local-verifier": "promotion-studio-v2" });
  await installMocks(desktop);
  await desktop.goto(`${BASE}/verification/promotion-studio`, { waitUntil: "domcontentloaded" });

  assert(await desktop.getByText("Promotion Studio", { exact: true }).isVisible(), "Studio header must render.");
  assert(await desktop.getByText("All channels", { exact: true }).isVisible(), "Channel rail must render.");
  assert(await desktop.getByText("Live preview", { exact: true }).isVisible(), "Live preview must render.");
  checks.push("commercial desktop shell renders channels, editor, and preview");

  await desktop.waitForTimeout(750);
  await desktop.getByRole("button", { name: "Generate campaign", exact: true }).first().click();
  await desktop.waitForTimeout(1_000);
  const generatedBody = (await desktop.textContent("body")) ?? "";
  assert(
    generatedBody.includes("Campaign suggestions are ready for review."),
    `Generate campaign must report review state (visible message: ${generatedBody.match(/AI campaign drafting[^.]*\.|Campaign drafting[^.]*\.|server returned[^.]*\./)?.[0] ?? "none"}).`
  );
  if (!generatedBody.includes("Campaign suggestions are ready for review.")) {
    throw new Error(`Generation review state missing. Body tail:\n${generatedBody.slice(-2500)}`);
  }
  assert(await desktop.getByText("Proposed change", { exact: true }).isVisible(), "Generation must enter review state.");
  await desktop.getByRole("button", { name: "Apply", exact: true }).first().click();
  const editor = desktop.locator("textarea").filter({ has: undefined }).nth(2);
  assert((await editor.inputValue()).includes("saved article"), "Per-field Apply must populate the real editor.");
  await desktop.getByRole("tab", { name: "A/B alternate", exact: true }).click();
  assert(await desktop.getByText("Proposed change", { exact: true }).isVisible(), "Alternate suggestion must be reviewable.");
  await desktop.getByRole("button", { name: "Reject", exact: true }).first().click();
  assert(!(await desktop.getByText("Proposed change", { exact: true }).isVisible()), "Per-field Reject must dismiss the suggestion.");
  await desktop.getByRole("tab", { name: "Primary", exact: true }).click();
  checks.push("mocked generate-all and per-field apply work without auto-saving");

  await editor.fill("A manually edited campaign caption.");
  assert(await desktop.getByText("Manually edited", { exact: true }).isVisible(), "Manual edit indicator must appear.");
  checks.push("manual edits are identified");

  await desktop.getByText("X", { exact: true }).first().click();
  const xEditor = desktop.locator("textarea").filter({ has: undefined }).nth(2);
  await xEditor.fill("x".repeat(281));
  assert(await desktop.getByText("281 / 280", { exact: true }).first().isVisible(), "X limit warning must render.");
  checks.push("strict character warning is visible");

  await desktop.getByRole("button", { name: "Generate branded assets", exact: true }).click();
  await desktop.getByText("Landscape · 1200×630", { exact: false }).waitFor();
  assert(await desktop.getByText("Square · 1080×1080", { exact: false }).isVisible(), "Square asset must render.");
  assert(await desktop.getByText("Portrait · 1080×1350", { exact: false }).isVisible(), "Portrait asset must render.");
  checks.push("all three deterministic asset previews render");

  const download = desktop.waitForEvent("download");
  await desktop.getByRole("button", { name: "Export package", exact: true }).click();
  await download;
  assert(await desktop.getByText("Not connected", { exact: true }).isVisible(), "Disconnected state must remain honest.");
  assert(await desktop.getByRole("button", { name: "Send to Command Center", exact: true }).last().isDisabled(), "Disconnected send must be disabled.");
  checks.push("export remains available while Command Center send stays disabled");

  await desktop.keyboard.press("Tab");
  const focusVisible = await desktop.evaluate(() => document.activeElement !== document.body);
  assert(focusVisible, "Keyboard navigation must move focus to a control.");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.setExtraHTTPHeaders({ "x-legalease-local-verifier": "promotion-studio-v2" });
  await installMocks(mobile);
  await mobile.goto(`${BASE}/verification/promotion-studio`, { waitUntil: "domcontentloaded" });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  assert(!overflow, "The 390px Promotion Studio must have no horizontal page overflow.");
  assert(await mobile.getByText("All channels", { exact: true }).isVisible(), "Mobile channel selector must remain reachable.");
  assert(await mobile.getByRole("button", { name: "Save draft", exact: true }).last().isVisible(), "Mobile sticky action bar must remain reachable.");
  checks.push("mobile selector, collapsible preview, and sticky actions fit without overflow");

  const disabled = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await disabled.setExtraHTTPHeaders({ "x-legalease-local-verifier": "promotion-studio-v2" });
  await installMocks(disabled);
  await disabled.goto(`${BASE}/verification/promotion-studio?ai=off`, { waitUntil: "domcontentloaded" });
  await disabled.waitForTimeout(500);
  await disabled.getByRole("button", { name: "Generate campaign", exact: true }).first().click();
  assert(
    await disabled.getByText("AI campaign drafting is not configured. You can continue drafting manually, generate branded assets, and export the promotion package.", { exact: true }).first().isVisible(),
    "AI-disabled generation must report the exact manual-fallback message."
  );
  assert(!(await disabled.getByText("Proposed change", { exact: true }).isVisible()), "AI-disabled state must not fabricate suggestions.");
  const disabledEditor = disabled.locator("textarea").filter({ has: undefined }).nth(2);
  await disabledEditor.fill("Manual drafting remains available.");
  assert((await disabledEditor.inputValue()).startsWith("Manual drafting"), "Manual drafting must work with AI disabled.");
  assert(await disabled.getByRole("button", { name: "Export package", exact: true }).isEnabled(), "Export must remain enabled with AI off.");
  assert(await disabled.getByRole("button", { name: "Generate branded assets", exact: true }).isEnabled(), "Asset generation must remain enabled with AI off.");
  checks.push("AI-disabled mode is honest and preserves manual drafting, assets, and export");

  await browser.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  server.kill("SIGTERM");
}

if (failures.length) {
  console.error("Promotion Studio browser verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(log.slice(-4000));
  process.exit(1);
}

console.log("Promotion Studio browser verification passed.");
checks.forEach((check) => console.log(`PASS: ${check}`));

async function installMocks(page) {
  await page.route("**/api/internal/content/promotion/*/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        generatedAt: "2026-07-18T13:00:00.000Z",
        sourceVersion: 4,
        suggestions: generatedCampaign(),
        issues: []
      })
    });
  });
  await page.route("**/api/internal/content/promotion/*/assets", async (route) => {
    const sizes = [
      ["og", 1200, 630],
      ["square", 1080, 1080],
      ["portrait", 1080, 1350]
    ];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        assets: sizes.map(([size_key, width, height], index) => ({
          social_asset_id: `33333333-3333-4333-8333-33333333333${index}`,
          template: "state_resource",
          size_key,
          width,
          height,
          image_url: "/favicon.ico",
          headline: "A practical guide to record clearing"
        }))
      })
    });
  });
  await page.route("**/api/internal/content/social/*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, drafts: [] }) })
  );
  await page.route("**/api/internal/content/promotion/*/export", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, channels: [] }) })
  );
}

function generatedCampaign() {
  const channel = (name) => ({
    primaryCaption: `${name}: A source-grounded summary from the saved article.`,
    alternateCaption: `${name}: Explore the article's practical next steps.`,
    founderVoiceCaption: `${name}: Why this educational resource matters.`,
    partnerCaption: `${name}: Share this record-clearing resource with your community.`,
    hashtags: ["#RecordClearing", "#AccessToJustice"],
    mentionCandidates: ["LegalEase Editorial"]
  });
  return {
    brief: {
      classification: "State resource",
      objective: "Education",
      primaryAudience: "People exploring record-clearing information",
      secondaryAudience: "Community partners",
      keyMessage: "The saved article explains practical record-clearing next steps.",
      supportingPoints: ["Plain-language overview", "Source-grounded guidance", "Clear next step"],
      tone: "Educational",
      cta: "Learn about the process"
    },
    channels: {
      linkedin: channel("LinkedIn"),
      x: channel("X"),
      facebook: channel("Facebook"),
      instagram: channel("Instagram"),
      threads: channel("Threads"),
      email: channel("Email"),
      partner_kit: channel("Partner")
    },
    assetPlan: [{ template: "state_resource", headline: "A practical guide", subheadline: null, recommendedSizes: ["og", "square", "portrait"] }]
  };
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        headers: { "x-legalease-local-verifier": "promotion-studio-v2" }
      });
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Dev server did not become ready.\n${log.slice(-2000)}`);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
