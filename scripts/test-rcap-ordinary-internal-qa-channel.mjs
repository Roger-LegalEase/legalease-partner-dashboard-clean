import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { matchesSponsoredChannel, currentSponsoredChannelAllowed, sponsoredChannelDecisions } =
  await import("../src/lib/rcap/fulfillment/sponsored-channel-authority.ts");
const sha = value => createHash("sha256").update(value).digest("hex");
const clinic = sponsoredChannelDecisions[0];
assert.equal(sha(JSON.stringify(clinic)), "b33784d8509264f03466a379ac52028dc943477489ca4b9a4f1de94f3d7578f5");
const grants = sponsoredChannelDecisions.filter(g => g.acquisitionMode === "partner");
assert.equal(grants.length, 1, "one adopted ordinary internal QA decision is required");
const grant = grants[0];
assert.equal(grant.partnerSlug, "legalease-ordinary-qa-20261024");
assert.deepEqual(grant.participantUserIds, ["b6dc86a3-12bb-490d-b130-48d95d426a1e"]);
assert.equal(grant.eventId, null);
assert.equal(grant.eventName, null);
assert.equal(grant.packetSpecificationSha256, "23426df251aa31bfd5215edbfe547d5f56c2349ed4c4bb5e7b407bc25405e126");
assert.deepEqual(grant.artifacts, clinic.artifacts);
const canonical = JSON.parse(fs.readFileSync("data/rcap-grade-a/fulfillment-authority-registry.json", "utf8"))
  .records.find(r => r.routeId === grant.routeId && !r.supersededBy);
assert.ok(canonical, "reuse the accepted actual packet record");
const context = { acquisitionMode: "partner", participantUserId: grant.participantUserIds[0],
  partnerSlug: grant.partnerSlug, eventName: null, eventId: null,
  registeredSpecificationSha256: grant.packetSpecificationSha256 };
const runtime = { environment: "preview", channel: "mississippi_preview", routeState: "staging_scoped",
  projectUrl: "https://hyflxnlhpmiqxvvcoiia.supabase.co", scope: context.participantUserId };
let checks = 0;
const check = (label, fn) => { fn(); checks++; console.log(`PASS ${label}`); };
const matches = (ctx = context, rt = runtime, record = canonical, track = "ms-nonconv", surface = "sponsored entitlement") =>
  matchesSponsoredChannel(grant, record, track, surface, ctx, rt);
for (const surface of ["sponsored entitlement", "packet credit consumption"])
  check(`exact ordinary ${surface}`, () => assert.equal(matches(context, runtime, canonical, grant.trackId, surface), true));
for (const [key, value] of [["partnerSlug", "mvl-demo"], ["partnerSlug", "we-must-vote"],
  ["participantUserId", clinic.participantUserIds[0]], ["participantUserId", "wrong"],
  ["eventId", clinic.eventId], ["eventName", clinic.eventName], ["acquisitionMode", "clinic"],
  ["acquisitionMode", undefined], ["registeredSpecificationSha256", "0".repeat(64)]])
  check(`refuse context ${key}=${value}`, () => assert.equal(matches({ ...context, [key]: value }), false));
for (const [key, value] of [["environment", "production"], ["environment", "unknown"],
  ["channel", "hosted_full"], ["channel", ""], ["routeState", "live"],
  ["projectUrl", "https://wrong.supabase.co"], ["scope", ""],
  ["scope", `${runtime.scope},${runtime.scope}`], ["scope", `${runtime.scope},extra`],
  ["scope", clinic.participantUserIds.join(",")]])
  check(`refuse runtime ${key}=${value}`, () => assert.equal(matches(context, { ...runtime, [key]: value }), false));
for (const record of [{ ...canonical, routeId: "wrong" }, { ...canonical, packetFamilyId: "wrong" },
  { ...canonical, packetSpecification: { ...canonical.packetSpecification, sha256: "0".repeat(64) } },
  { ...canonical, artifactValidation: { ...canonical.artifactValidation, artifactSha256: "0".repeat(64) } }])
  check("refuse changed packet binding", () => assert.equal(matches(context, runtime, record), false));
check("refuse wrong track and paid/delivery surfaces", () => {
  assert.equal(matches(context, runtime, canonical, "wrong"), false);
  for (const surface of ["checkout creation", "consumer payment authority", "participant delivery"])
    assert.equal(matches(context, runtime, canonical, grant.trackId, surface), false);
  assert.equal(matchesSponsoredChannel(grant, canonical, grant.trackId, "sponsored entitlement", undefined, runtime), false);
});
const saved = { ...process.env };
try {
  Object.assign(process.env, { VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview",
    RCAP_SPONSORED_PREVIEW_CHANNEL: runtime.channel, RCAP_CONSUMER_DELIVERY_ROUTE_STATE: runtime.routeState,
    NEXT_PUBLIC_SUPABASE_URL: runtime.projectUrl, RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: runtime.scope });
  check("actual adapter admits exact grant and actual approved artifact bytes", () => {
    for (const surface of grant.surfaces)
      assert.equal(currentSponsoredChannelAllowed(canonical, grant.trackId, surface, context), true);
    for (const artifact of grant.artifacts) assert.equal(sha(fs.readFileSync(artifact.path)), artifact.sha256);
  });
  check("adapter refuses altered immutable decision", () => {
    const before = grant.partnerSlug;
    try {
      grant.partnerSlug = "wrong";
      assert.equal(currentSponsoredChannelAllowed(canonical, grant.trackId, "sponsored entitlement", { ...context, partnerSlug: "wrong" }), false);
    } finally { grant.partnerSlug = before; }
  });
  check("adapter refuses removed artifact pin", () => {
    const before = grant.artifacts;
    try {
      grant.artifacts = before.slice(0, 1);
      assert.equal(currentSponsoredChannelAllowed(canonical, grant.trackId, "sponsored entitlement", context), false);
    } finally { grant.artifacts = before; }
  });
  check("adapter refuses missing ordinary decision", () => {
    const index = sponsoredChannelDecisions.indexOf(grant);
    try {
      sponsoredChannelDecisions.splice(index, 1);
      assert.equal(currentSponsoredChannelAllowed(canonical, grant.trackId, "sponsored entitlement", context), false);
    } finally { sponsoredChannelDecisions.splice(index, 0, grant); }
  });
  check("actual adapter refuses Production", () => {
    process.env.VERCEL_ENV = process.env.VERCEL_TARGET_ENV = "production";
    try { assert.equal(currentSponsoredChannelAllowed(canonical, grant.trackId, "sponsored entitlement", context), false); }
    finally { process.env.VERCEL_ENV = process.env.VERCEL_TARGET_ENV = "preview"; }
  });
  check("Clinic scope remains independently admitted with unchanged decision", () => {
    process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE = clinic.participantUserIds.join(",");
    const clinicContext = { participantUserId: clinic.participantUserIds[0], partnerSlug: clinic.partnerSlug,
      eventName: clinic.eventName, eventId: clinic.eventId, registeredSpecificationSha256: clinic.packetSpecificationSha256 };
    assert.equal(currentSponsoredChannelAllowed(canonical, clinic.trackId, "sponsored entitlement", clinicContext), true);
    assert.equal(currentSponsoredChannelAllowed(canonical, grant.trackId, "sponsored entitlement", context), false);
  });
} finally {
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
}
console.log(`${checks} focused channel checks passed; no program, case, allocation or render executed.`);
