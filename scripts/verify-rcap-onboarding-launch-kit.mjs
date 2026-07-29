// The Partner Launch Kit and its QR code.
//
// The kit is the only artifact needing something beyond the canonical read, and
// what it needs — the address a participant scans — is exactly the thing that
// must never come from a browser. These checks defend that, the claims
// guardrails, and the versioning rules the other five generators already follow.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

import { artifactSourceFixture } from "./lib/rcap-onboarding-artifact-fixture.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const domain = await import("../src/lib/partners/onboarding/artifact-domain.ts");
const generator = await import(
  "../src/lib/partners/onboarding/artifact-generator.ts"
);
const routes = await import("../src/lib/partners/routes.ts");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const TYPE = "partner_launch_kit";
const VERSION = domain.PARTNER_LAUNCH_KIT_GENERATOR_VERSION;

function qrFixture(overrides = {}) {
  return {
    targetUrl: "http://127.0.0.1:3000/p/demo-partner",
    qrSvg: "<svg role='img'></svg>",
    qrDataUrl: "data:image/png;base64,AAAA",
    published: false,
    ...overrides
  };
}

function renderKit(overrides = {}) {
  return generator.renderPartnerLaunchKit(
    overrides.source ?? artifactSourceFixture(),
    overrides.qr ?? qrFixture()
  );
}

// --- registration ------------------------------------------------------------

check("the launch kit is the sixth generator and carries its own version", () => {
  assert.equal(VERSION, "partner_launch_kit_v1");
  assert.match(VERSION, /^[a-z0-9_]+$/);
  assert.ok(domain.isGeneratableArtifactType(TYPE));
  assert.equal(domain.ARTIFACT_GENERATOR_VERSIONS[TYPE], VERSION);
  assert.equal(
    new Set(Object.values(domain.ARTIFACT_GENERATOR_VERSIONS)).size,
    Object.keys(domain.ARTIFACT_GENERATOR_VERSIONS).length,
    "no two documents may share a generator version"
  );
});

// --- content -----------------------------------------------------------------

check("the kit renders every piece of copy the brief names", () => {
  const document = renderKit();
  const keys = document.launchKit.copy.map((block) => block.key);
  assert.deepEqual(keys, [
    "short_description",
    "long_description",
    "email",
    "sms",
    "social",
    "flyer",
    "staff_referral_script"
  ]);
  for (const block of document.launchKit.copy) {
    assert.ok(block.body.length > 40, `${block.key} is too thin`);
    assert.ok(block.label.length > 0);
  }
  assert.ok(document.launchKit.faq.length >= 5, "the FAQ must be substantive");
  assert.ok(document.launchKit.guardrails.length >= 5);
  assert.equal(document.documentTitle, "Partner Launch Kit");
  assert.equal(document.generatorVersion, VERSION);
});

check("the kit renders the partner's own data, not a template", () => {
  const text = JSON.stringify(renderKit());
  assert.ok(text.includes("Demo Justice Access Partner"));
  assert.ok(text.includes("Capital Area Legal Aid"), "the referral partner");
  assert.ok(text.includes("help@demo.test"), "the partner support address");
});

check("rendering is deterministic for identical source data", () => {
  assert.equal(
    JSON.stringify(renderKit()),
    JSON.stringify(renderKit()),
    "identical source and QR must produce byte-identical output"
  );
});

check("no raw enum or column name reaches the kit", () => {
  const text = JSON.stringify(renderKit());
  for (const forbidden of [
    "optional_code",
    "year_round",
    "partner_administrator",
    "response_data",
    "partner_onboarding_sections",
    "stable_row_id",
    "workspace_id"
  ]) {
    assert.ok(!text.includes(forbidden), `the kit leaked ${forbidden}`);
  }
});

// --- claims guardrails -------------------------------------------------------

check("the guardrails forbid promising eligibility, outcome, or timing", () => {
  const guardrails = generator.LAUNCH_KIT_GUARDRAILS.join(" ").toLowerCase();
  assert.ok(guardrails.includes("never promise eligibility"));
  assert.ok(guardrails.includes("never promise a timeline"));
  assert.ok(guardrails.includes("legal advice"));
  const document = renderKit();
  const section = document.sections.find(
    (entry) => entry.key === "launch_guardrails"
  );
  assert.ok(section, "the guardrails must be in the document itself");
  assert.match(JSON.stringify(section), /not partner-editable/);
});

/**
 * The copy is the thing that actually goes out, so the guardrails are asserted
 * against the copy rather than only against the rules page.
 */
check("no copy block promises eligibility or an outcome", () => {
  const document = renderKit();
  const forbidden = [
    /will be (cleared|expunged|sealed)/i,
    /guarantee/i,
    /you qualify/i,
    /you are eligible/i,
    /erase your record/i,
    /clears your record/i
  ];
  // Sentence by sentence, because "no one can promise that a record will be
  // cleared" is the disclaimer, not the promise. A negated sentence is exactly
  // what this copy is supposed to contain.
  const NEGATION = /\b(no one|nobody|cannot|can.t|never|not|no)\b/i;
  for (const block of document.launchKit.copy) {
    const sentences = block.body.split(/(?<=[.!?])\s+|\n+/);
    for (const sentence of sentences) {
      for (const pattern of forbidden) {
        if (!pattern.test(sentence)) continue;
        assert.ok(
          NEGATION.test(sentence),
          `${block.key} promises something it must not: "${sentence.trim()}"`
        );
      }
    }
  }
  // And it says who decides, in the copy a participant actually reads.
  const email = document.launchKit.copy.find((block) => block.key === "email");
  assert.match(email.body, /the court decides/i);
  assert.match(email.body, /not a law firm/i);
});

check("every copy block keeps the self-help boundary", () => {
  const document = renderKit();
  const combined = document.launchKit.copy
    .map((block) => block.body)
    .join("\n")
    .toLowerCase();
  assert.ok(combined.includes("not a law firm") || combined.includes("not legal advice"));
  assert.ok(
    !combined.includes("we will file"),
    "the kit must not offer to file on a participant's behalf"
  );
});

// --- the QR target -----------------------------------------------------------

check("the QR target is derived server-side from the partner slug", () => {
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  const fn = service.match(
    /export async function buildLaunchKitQr[\s\S]*?\n}\n/
  )?.[0];
  assert.ok(fn, "the QR must be built in one named server function");
  assert.ok(
    fn.includes("absoluteAppUrl(partnerPublicPage(partnerSlug))"),
    "the target must come from the reviewed route helper"
  );
  // The slug comes from the authorized context, never from the request body.
  assert.ok(
    service.includes("await buildLaunchKitQr(context.partnerSlug)"),
    "the QR must be built from the authorized partner slug"
  );
  assert.equal(routes.partnerPublicPage("demo-partner"), "/p/demo-partner");
});

check("no browser-supplied URL can reach the launch kit", () => {
  const generatorSource = read(
    "src/lib/partners/onboarding/artifact-generator.ts"
  );
  const fn = generatorSource.match(
    /export function renderPartnerLaunchKit[\s\S]*?\n}\n/
  )?.[0];
  assert.ok(fn);
  // The renderer takes the QR it is given and derives no address of its own.
  assert.ok(!fn.includes("new URL("));
  assert.ok(!fn.includes("getPublicBaseUrl"));
  assert.ok(!fn.includes("absoluteAppUrl"));

  const route = read(
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/route.ts"
  );
  for (const forbidden of ["targetUrl", "qrUrl", "landingUrl", "payload.url"]) {
    assert.ok(
      !route.includes(forbidden),
      `the generate route must not accept ${forbidden}`
    );
  }

  // And the renderer refuses to run without a server-derived code at all.
  assert.throws(
    () => generator.renderPartnerLaunchKit(artifactSourceFixture(), undefined),
    "rendering without a QR must fail rather than invent an address"
  );
});

check("the kit says the address is not reachable until it is published", () => {
  const document = renderKit();
  const text = JSON.stringify(document);
  assert.match(text, /not published yet/i);
  assert.equal(document.launchKit.qr.published, false);

  const published = renderKit({ qr: qrFixture({ published: true }) });
  assert.ok(
    !/not published yet/i.test(JSON.stringify(published)),
    "a published page must not still warn that it is unpublished"
  );
});

check("the QR is the only address in the kit, and it is that partner's", () => {
  const document = renderKit();
  const urls = (JSON.stringify(document).match(/https?:\/\/[^"\\ )]+/g) ?? []).map(
    // Trim sentence punctuation the address happens to end a sentence with.
    (url) => url.replace(/[.,;:]+$/, "")
  );
  const unique = [...new Set(urls)];
  assert.deepEqual(
    unique,
    ["http://127.0.0.1:3000/p/demo-partner"],
    `the kit must carry one address, that partner's own: ${unique.join(", ")}`
  );
});

// --- versioning and invalidation --------------------------------------------

check("the kit follows the established staleness rules", () => {
  const before = domain.projectArtifactSource(TYPE, artifactSourceFixture());
  const same = domain.detectArtifactDrift({
    storedSnapshot: before.values,
    storedGeneratorVersion: VERSION,
    current: before,
    currentGeneratorVersion: VERSION
  });
  assert.equal(same.stale, false);

  const bumped = domain.detectArtifactDrift({
    storedSnapshot: before.values,
    storedGeneratorVersion: "partner_launch_kit_v0",
    current: before,
    currentGeneratorVersion: VERSION
  });
  assert.equal(bumped.stale, true);
  assert.deepEqual(bumped.changedKeys, ["generator_version"]);
  assert.equal(bumped.invalidatesPartnerApproval, true);
});

check("a partner-owned change invalidates both approvals of the kit", () => {
  const before = domain.projectArtifactSource(TYPE, artifactSourceFixture());
  const input = artifactSourceFixture();
  input.data.brand_public_page.approved_organization_description =
    "A different description of this organization.";
  const after = domain.projectArtifactSource(TYPE, input);
  const drift = domain.detectArtifactDrift({
    storedSnapshot: before.values,
    storedGeneratorVersion: VERSION,
    current: after,
    currentGeneratorVersion: VERSION
  });
  assert.equal(drift.stale, true);
  assert.equal(drift.invalidatesLegalEaseApproval, true);
  assert.equal(drift.invalidatesPartnerApproval, true);
});

check("a missing description renders a named gap, not invented copy", () => {
  const source = artifactSourceFixture();
  delete source.data.brand_public_page.approved_organization_description;
  const document = renderKit({ source });
  const gaps = document.sections
    .flatMap((section) => section.blocks)
    .filter((block) => block.kind === "gap");
  assert.equal(gaps.length, 1);
  assert.match(gaps[0].whereToSet, /Program setup/);
  assert.equal(document.gapCount, 1);
  for (const placeholder of ["Lorem", "TBD", "TODO", "your organization here"]) {
    assert.ok(!JSON.stringify(document).includes(placeholder));
  }
});

console.log(`\nRCAP onboarding launch kit: ${passed}/${passed} checks passed.`);
