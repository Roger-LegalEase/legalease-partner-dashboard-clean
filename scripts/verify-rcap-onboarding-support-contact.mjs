// Proves the partner support destination is real, configurable, and reachable.
//
// The defect this locks out: the onboarding home told partners to use "the support channel
// already provided to your organization" and gave no address, link, or route, and the
// failure states offered nothing at all. A dead label must not come back.

import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

const support = loadTsModule(
  path.join(rootDir, "src/lib/partners/onboarding/support-contact.ts")
);

check("the documented fallback is the agreed partner address", () => {
  const contact = support.getPartnerSupportContact({});
  assert.equal(contact.email, "partners@legalease.com");
  assert.equal(contact.configured, false, "the fallback must report itself as unconfigured");
});

check("a configured override wins and reports itself as configured", () => {
  const contact = support.getPartnerSupportContact({
    RCAP_PARTNER_SUPPORT_EMAIL: "rcap-desk@legalease.com"
  });
  assert.equal(contact.email, "rcap-desk@legalease.com");
  assert.equal(contact.configured, true);
  assert.equal(contact.mailtoHref, "mailto:rcap-desk@legalease.com");
});

check("a blank or malformed override falls back instead of emitting a broken link", () => {
  // A typo in an env var must not produce mailto:not-an-email on a partner-facing screen.
  for (const bad of ["", "   ", "not-an-email", "missing@domain", "@nolocal.com", "a b@c.com"]) {
    const contact = support.getPartnerSupportContact({ RCAP_PARTNER_SUPPORT_EMAIL: bad });
    assert.equal(
      contact.email,
      "partners@legalease.com",
      `override ${JSON.stringify(bad)} should not have been accepted`
    );
    assert.equal(contact.configured, false);
  }
});

check("the contact always yields a usable mailto and an accessible name", () => {
  const contact = support.getPartnerSupportContact({});
  assert.match(contact.mailtoHref, /^mailto:[^\s@]+@[^\s@]+$/);
  assert.ok(contact.label.includes("@"), "the visible label must be the address itself");
  assert.match(contact.accessibleName, /partner support/i);
  assert.ok(contact.accessibleName.includes(contact.email));
});

check("the mailto carries the organization and step so the partner need not explain", () => {
  const href = support.partnerSupportMailto(
    { organizationName: "We Must Vote Mississippi", subject: "Upload failed" },
    {}
  );
  assert.match(href, /^mailto:partners@legalease\.com\?subject=/);
  const subject = decodeURIComponent(href.split("subject=")[1]);
  assert.match(subject, /RCAP setup/);
  assert.match(subject, /We Must Vote Mississippi/);
  assert.match(subject, /Upload failed/);
});

check("with no context the mailto is still a plain working address", () => {
  assert.equal(support.partnerSupportMailto({}, {}), "mailto:partners@legalease.com");
});

check("an organization name with special characters stays a valid mailto", () => {
  const href = support.partnerSupportMailto(
    { organizationName: "Smith & Jones, P.C. #2" },
    {}
  );
  assert.doesNotMatch(
    href.split("subject=")[1],
    /[ &#]/,
    "subject must be percent-encoded so & and # do not truncate it"
  );
});

check("no partner surface reads the support env var directly", () => {
  // Environment access belongs in the one helper. Scattered process.env reads are how the
  // address drifts between screens.
  const surfaces = [
    "src/app/partner/onboarding/page.tsx",
    "src/app/partner/onboarding/Phase1OnboardingHome.tsx",
    "src/app/partner/onboarding/review/page.tsx",
    "src/app/partner/onboarding/review/OnboardingReviewClient.tsx",
    "src/app/partner/onboarding/PartnerSupportLink.tsx"
  ];
  for (const surface of surfaces) {
    const source = fs.readFileSync(path.join(rootDir, surface), "utf8");
    assert.doesNotMatch(
      source,
      /RCAP_PARTNER_SUPPORT_EMAIL/,
      `${surface} reads the support env var directly instead of using the helper`
    );
  }
});

check("the dead-end support copy is gone from the onboarding home", () => {
  const home = fs.readFileSync(
    path.join(rootDir, "src/app/partner/onboarding/Phase1OnboardingHome.tsx"),
    "utf8"
  );
  assert.doesNotMatch(
    home,
    /support channel already provided to your organization/,
    "the onboarding home still names a channel without giving a destination"
  );
  assert.match(home, /PartnerSupportLink/, "the home must render the real support link");
});

check("the support link renders a real anchor with an accessible name", () => {
  const component = fs.readFileSync(
    path.join(rootDir, "src/app/partner/onboarding/PartnerSupportLink.tsx"),
    "utf8"
  );
  assert.match(component, /href=\{href \?\? contact\.mailtoHref\}/);
  assert.match(component, /aria-label=\{contact\.accessibleName\}/);
});

check(".env.example documents the override and warns about monitoring", () => {
  const env = fs.readFileSync(path.join(rootDir, ".env.example"), "utf8");
  assert.match(env, /^RCAP_PARTNER_SUPPORT_EMAIL=/m);
  assert.match(env, /partners@legalease\.com/);
  assert.match(env, /monitored/i, "the template must warn that an unmonitored mailbox is worse than none");
});

console.log(`RCAP onboarding support contact: ${checks.length}/${checks.length} checks passed.`);
for (const name of checks) console.log(`  - ${name}`);

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;
  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const mod = new Module(resolved);
  const compiledFilename = `${resolved}.cjs`;
  mod.filename = compiledFilename;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, compiledFilename);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) return path.join(rootDir, "src", `${request.slice(2)}.ts`);
  if (request.startsWith(".")) {
    const candidate = path.resolve(basedir, request);
    for (const extension of [".ts", ".tsx", ".js"]) {
      if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
    }
  }
  return null;
}
