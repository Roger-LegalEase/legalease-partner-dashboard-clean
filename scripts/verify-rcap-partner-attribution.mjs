import fs from "node:fs";
import path from "node:path";
import {
  appendAttributionQuery,
  extractPartnerAttribution,
  readAttributionFromFormData
} from "../src/lib/expungement-ai/partner-attribution.ts";

// Proves partner attribution (county + UTM/source) is not dropped during partner
// intake start or the sign-in round-trip. Partner slug is persisted on the
// session; county/UTM have no DB columns yet, so they are carried through the
// user-facing redirect chain (documented DB gap below).

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

// 1. Extraction picks up county + all UTM + source/ref, ignores unrelated keys.
const extracted = extractPartnerAttribution({
  status: "program-full",
  county: "Hinds",
  utm_source: "newsletter",
  utm_medium: "email",
  utm_campaign: "fresh-start",
  utm_term: "expungement",
  utm_content: "cta-a",
  source: "partner-site",
  ref: "abc123",
  unrelated: "drop-me"
});
for (const key of ["county", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "source", "ref"]) {
  assert(extracted[key] !== undefined, `extractPartnerAttribution must preserve ${key}.`);
}
assert(extracted.status === undefined, "extractPartnerAttribution must not capture status.");
assert(extracted.unrelated === undefined, "extractPartnerAttribution must ignore non-attribution params.");

// 2. Query building preserves values and handles an existing query string.
const withQuery = appendAttributionQuery("/expungement-ai/screening/ms?session=s1", { county: "Hinds", utm_source: "news letter" });
assert(withQuery.startsWith("/expungement-ai/screening/ms?session=s1&"), "appendAttributionQuery must keep the existing session query.");
assert(withQuery.includes("county=Hinds"), "appendAttributionQuery must include county.");
assert(withQuery.includes("utm_source=news%20letter"), "appendAttributionQuery must URL-encode values.");
assert(appendAttributionQuery("/intake/we-must-vote", {}) === "/intake/we-must-vote", "No attribution should leave the path unchanged.");

// 3. FormData round-trip (authed screening start).
const fd = new FormData();
fd.set("attr_county", "Hinds");
fd.set("attr_utm_campaign", "fresh-start");
const fromForm = readAttributionFromFormData(fd);
assert(fromForm.county === "Hinds" && fromForm.utm_campaign === "fresh-start", "readAttributionFromFormData must read attr_* fields.");

// 4. Wiring in the intake route.
const intake = read("src/app/intake/[partnerSlug]/page.tsx");
assert(intake.includes("const attribution = extractPartnerAttribution(search)"), "Intake page must extract attribution from searchParams.");
assert(intake.includes("<AccountFirstActions partnerSlug={context.partnerSlug} attribution={attribution} />"), "Intake must pass attribution to AccountFirstActions.");
assert(intake.includes("appendAttributionQuery(`/intake/${encodeURIComponent(partnerSlug)}`, attribution)"), "AccountFirstActions must preserve attribution in the sign-in return path.");
assert(intake.includes('name={`attr_${key}`}'), "Authed screening form must carry attribution as hidden fields.");
assert(intake.includes("const attribution = readAttributionFromFormData(formData)"), "Screening start must read attribution from the form.");
assert(/appendAttributionQuery\(\s*`\/expungement-ai\/screening\//.test(intake), "Screening start redirect must preserve attribution.");

if (failures.length > 0) {
  console.error("RCAP partner attribution verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP partner attribution verifier passed.");
console.log("County + UTM/source attribution survives partner intake start and the sign-in round-trip; partner slug is persisted on the session.");
console.log("DB gap (documented): screening_sessions has no county/UTM columns; persisting them beyond the user-facing flow requires a schema migration.");
