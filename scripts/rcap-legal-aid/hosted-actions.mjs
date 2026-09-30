// Browser-only harness controls. Responses are observed, never fabricated.
const statements = new Set(["financial_attestation", "citizenship_attestation", "noncitizen_review_acknowledgment", "information_sharing_consent"]);
const outcomes = new Set(["submitted", "already_submitted", "validation_failed", "ssn_required", "signature_required", "answers_required", "withdrawn", "not_found", "forbidden", "conflict"]);
const signSelector = "button:has-text('Sign this statement')";
const busySelector = "button:has-text('Signing…')";

function actionResponse(intakeId, origin, action) {
  if (!/^[0-9a-f-]{36}$/i.test(intakeId)) throw new Error("Invalid synthetic intake id");
  return response => {
    const request = response.request();
    const url = new URL(response.url());
    if (request.method() !== "POST" || url.origin !== new URL(origin).origin || url.pathname !== `/api/legal-aid/intakes/${intakeId}/actions`) return false;
    try { return request.postDataJSON()?.action === action; } catch { return false; }
  };
}

export async function signAll(page, intakeId, origin) {
  const seen = new Set();
  // These cards and their order persist through the server reload; a locator
  // rooted at the clicked button would disappear before the reload finishes.
  const cards = page.locator("div:has(> blockquote)");
  for (let index = 0; index < await cards.count(); index++) {
    const card = cards.nth(index);
    const button = card.locator(signSelector);
    if (await button.count() === 0) continue;
    const pending = page.waitForResponse(actionResponse(intakeId, origin, "sign"));
    await button.click();
    const response = await pending;
    if (response.status() !== 200) throw new Error(`Legal Aid sign refused: HTTP ${response.status()}`);
    if (await response.finished()) throw new Error("Legal Aid sign response did not finish");
    const key = response.request().postDataJSON().statementKey;
    if (!statements.has(key) || seen.has(key) || (await response.json()).success !== true) throw new Error("Legal Aid sign response did not confirm a distinct applicable statement");
    seen.add(key);
    await card.locator(busySelector).waitFor({ state: "hidden" });
    // Only the server-reloaded current signature renders this signed state.
    await card.locator("p").filter({ hasText: /^Signed by / }).waitFor({ state: "visible" });
  }
  await requireSigningComplete(page);
}

async function requireSigningComplete(page) {
  if (await page.locator(signSelector).count() || await page.locator(busySelector).count()) throw new Error("Legal Aid signatures are still incomplete or pending");
}

export function sanitizedSubmitResult(status, body) {
  // Names only: no error messages, answer objects, protected values or hashes.
  const names = values => [...new Set(values.filter(v => typeof v === "string" && /^[a-z][a-z_]*(?:\.[a-z_]+)*$/.test(v)))].sort();
  return { status, success: body?.success === true,
    outcome: outcomes.has(body?.outcome) ? body.outcome : "unrecognized_outcome",
    ...(statements.has(body?.statementKey) ? { statementKey: body.statementKey } : {}),
    missingFields: names(Array.isArray(body?.missing) ? body.missing : []),
    errorFields: names(body?.errors && typeof body.errors === "object" && !Array.isArray(body.errors) ? Object.keys(body.errors) : []) };
}

export async function submitApplication(page, intakeId, origin, observe) {
  await requireSigningComplete(page);
  const pending = page.waitForResponse(actionResponse(intakeId, origin, "submit"));
  await page.click("button:has-text('Submit my application')");
  const response = await pending;
  if (await response.finished()) throw new Error("Legal Aid submit response did not finish");
  const result = sanitizedSubmitResult(response.status(), await response.json().catch(() => ({})));
  observe(result);
  if (result.status !== 200 || !result.success || !["submitted", "already_submitted"].includes(result.outcome)) throw new Error(`Legal Aid submit refused: ${JSON.stringify(result)}`);
  await page.waitForSelector("text=Your application has been received");
  return result;
}
