#!/usr/bin/env node
// The render job's profile identity must come from the profile the route came
// from — not from a literal, not from the Briefcase, not from the browser.
//
// This is the contract hosted run 32195867963 broke. The consumer caller passed
// `profileId: item.state` beside a literal `profileVersion: "1.3.0"`, and no
// compiled profile has ever carried that version. The worker builds its
// allowlist from the compiled profiles, so it refused every consumer claim with
// `profile_version_unknown` before rendering anything: job
// ca12bf6b-6ace-4e02-af5c-70e1bfb7d331 was paid for and could never be
// delivered. The worker was right. The application was wrong.
//
// A literal is the wrong fix twice over — it was wrong then, and pinning
// today's corpus version would recreate the same failure on the next profile
// update. So this checks derivation, not a value.
//
//   node scripts/verify-rcap-authoritative-profile-version.mjs
//   node scripts/verify-rcap-authoritative-profile-version.mjs --mutations

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");

const CONTRACT = "src/lib/rcap/render/job-contract.ts";
const CALLER = "src/lib/expungement-ai/consumer-render-request.ts";
const WORKER = "scripts/rcap-render-worker.mjs";

if (MUTATIONS) {
  const { registerMutationRestore } = await import("./lib/mutation-restore-guard.mjs");
  const { registerTrackedMutation } = await import("./lib/tracked-mutation-guard.mjs");
  const TRACKED = [CONTRACT, CALLER, WORKER];
  registerTrackedMutation("verify-rcap-authoritative-profile-version.mjs", TRACKED);
  const originals = new Map(TRACKED.map((r) => [r, fs.readFileSync(path.join(rootDir, r))]));
  const restore = () => { for (const [r, b] of originals) fs.writeFileSync(path.join(rootDir, r), b); };
  const disposeGuard = registerMutationRestore(restore);
  const read = (r) => fs.readFileSync(path.join(rootDir, r), "utf8");
  const write = (r, s) => fs.writeFileSync(path.join(rootDir, r), s);
  const swap = (r, find, replacement) => {
    const s = read(r);
    const at = s.indexOf(find);
    if (at < 0) throw new Error(`could not locate in ${r}: ${find.slice(0, 80)}`);
    if (s.indexOf(find, at + find.length) >= 0) throw new Error(`ambiguous in ${r}: ${find.slice(0, 80)}`);
    write(r, s.slice(0, at) + replacement + s.slice(at + find.length));
  };

  let caught = 0;
  let failed = 0;
  const mutation = (name, mutate, marker) => {
    restore();
    try { mutate(); } catch (error) { console.error(`  ERROR    ${name}: ${error.message}`); failed += 1; restore(); return; }
    const run = spawnSync(process.execPath, [path.join(rootDir, "scripts/verify-rcap-authoritative-profile-version.mjs")],
      { cwd: rootDir, encoding: "utf8", timeout: 900000 });
    restore();
    const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    if (run.status === 0) { console.error(`  SURVIVED ${name}`); failed += 1; return; }
    if (!out.includes(marker)) {
      console.error(`  WRONG    ${name}: red, but not for the expected reason\n           expected: ${marker}`);
      failed += 1; return;
    }
    caught += 1;
    console.log(`  caught   ${name}`);
  };

  const DERIVED = `  const profile = getProfileByJurisdiction(route.jurisdiction);
  const profileVersion = profile?.profileVersion == null ? "" : String(profile.profileVersion).trim();
  const profileId = profile?.jurisdiction?.code ? String(profile.jurisdiction.code).trim() : "";`;

  // 1 — the exact defect that shipped.
  mutation("profileVersion is hardcoded to 1.3.0", () => {
    swap(CONTRACT, DERIVED, `${DERIVED}\n  const _unused = profileVersion;`);
    swap(CONTRACT, "    profileId,\n    profileVersion,\n    partnerSlug:", '    profileId,\n    profileVersion: "1.3.0",\n    partnerSlug:');
  }, "FAIL D-");

  // 2 — the fix that looks right and fails on the next profile update.
  mutation("profileVersion is hardcoded to the current corpus version", () => {
    swap(CONTRACT, "    profileId,\n    profileVersion,\n    partnerSlug:",
      '    profileId,\n    profileVersion: "2026-06-19-source-conversion-1",\n    partnerSlug:');
  }, "FAIL S-no-literal");

  // 3 — the version disappears entirely.
  mutation("profileVersion is omitted", () => {
    swap(CONTRACT, 'const profileVersion = profile?.profileVersion == null ? "" : String(profile.profileVersion).trim();',
      'const profileVersion = "";');
  }, "FAIL");

  // 4 — identity and version describe two different profiles.
  mutation("profileId and profileVersion come from different profiles", () => {
    swap(CONTRACT, 'const profileId = profile?.jurisdiction?.code ? String(profile.jurisdiction.code).trim() : "";',
      'const profileId = "MS";');
  }, "FAIL");

  // 5 — the route names one profile and the specification another.
  mutation("routeId belongs to another profile", () => {
    swap(CONTRACT, "  const routeId = `${route.jurisdiction}:${route.pathwayId}`;",
      "  const routeId = `MS:${route.pathwayId}`;");
  }, "FAIL");

  // 6 — the caller can name the version again, which is how a stale Briefcase
  //     value or browser JSON gets into the worker contract.
  mutation("browser input can override the version", () => {
    swap(CONTRACT, "  packetFields: Record<string, unknown>;\n}): { spec: RenderJobSpec",
      "  packetFields: Record<string, unknown>;\n  profileVersion?: string;\n}): { spec: RenderJobSpec");
    swap(CONTRACT, "    profileId,\n    profileVersion,\n    partnerSlug:",
      "    profileId,\n    profileVersion: input.profileVersion ?? profileVersion,\n    partnerSlug:");
  }, "FAIL S-no-caller-version");

  // 7 — a silent fallback, which is exactly how an unverifiable job gets built.
  //     The derivation is broken AND the guard removed AND a default supplied,
  //     because a fallback behind a guard that still fires weakens nothing.
  mutation("a fallback silently substitutes a version", () => {
    swap(CONTRACT, 'const profileVersion = profile?.profileVersion == null ? "" : String(profile.profileVersion).trim();',
      'const profileVersion = "";');
    swap(CONTRACT, `  if (!profile || profileId === "" || profileVersion === "") {`, `  if (false) {`);
    swap(CONTRACT, "    profileId,\n    profileVersion,\n    partnerSlug:",
      '    profileId: profileId || "unknown",\n    profileVersion: profileVersion || "0.0.0",\n    partnerSlug:');
  }, "FAIL D-3");

  // 8 — the worker stops being the backstop.
  mutation("the worker allowlist accepts unknown profile versions", () => {
    swap(WORKER, "knownProfileVersions: new Set(getAllJurisdictionProfiles().map((profile) => String(profile.profileVersion))),",
      "knownProfileVersions: new Set(),");
  }, "FAIL W-allowlist-source");

  restore();
  disposeGuard();
  for (const [r, b] of originals) {
    if (!fs.readFileSync(path.join(rootDir, r)).equals(b)) { console.error(`  DIRTY    ${r}`); failed += 1; }
  }
  console.log("");
  if (failed > 0) {
    console.error(`verify-rcap-authoritative-profile-version --mutations FAILED: ${failed} did not hold.`);
    process.exit(1);
  }
  console.log(`verify-rcap-authoritative-profile-version --mutations passed: ${caught}/${caught} mutations red, files restored.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The contract itself.
// ---------------------------------------------------------------------------
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
const { buildRenderJobSpec, assertClaimAcceptable, RenderContractError } = await import("../src/lib/rcap/render/job-contract.ts");
const { PACKET_RENDERER_KIND } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");

let failed = 0;
function check(id, title, ok, observed) {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id}  ${title}${ok ? "" : `\n         observed: ${observed}`}`);
}

const contractSource = fs.readFileSync(path.join(rootDir, CONTRACT), "utf8");
const callerSource = fs.readFileSync(path.join(rootDir, CALLER), "utf8");

/**
 * Comments are prose about the defect, and the prose has to be able to quote
 * the literal it describes. Only code counts.
 */
const withoutComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");
const contractCode = withoutComments(contractSource);
const callerCode = withoutComments(callerSource);

/**
 * buildRenderJobSpec's own parameter object and body, not every type in the
 * file. computeInputHash legitimately takes profileId and profileVersion as
 * arguments — it is a pure function over values already derived — and a check
 * that cannot tell the two apart would either miss the defect or refuse the fix.
 */
const buildStart = contractCode.indexOf("export function buildRenderJobSpec(input: {");
const buildInputType = (() => {
  if (buildStart < 0) return "";
  const end = contractCode.indexOf("}):", buildStart);
  return end < 0 ? "" : contractCode.slice(buildStart, end);
})();
const buildBody = (() => {
  if (buildStart < 0) return "";
  const next = contractCode.indexOf("\nexport ", buildStart + 1);
  return contractCode.slice(buildStart, next < 0 ? contractCode.length : next);
})();

// ---------------------------------------------------------------------------
// S — shape. The value cannot be supplied, so it cannot be supplied wrongly.
// ---------------------------------------------------------------------------
check("S-derived", "the specification derives its profile from the resolved route's own jurisdiction",
  /const profile = getProfileByJurisdiction\(route\.jurisdiction\);/.test(contractSource)
  && /profileVersion = profile\?\.profileVersion/.test(contractSource)
  && /profileId = profile\?\.jurisdiction\?\.code/.test(contractSource),
  "buildRenderJobSpec does not derive profileId and profileVersion from getProfileByJurisdiction(route.jurisdiction)");

check("S-no-caller-version", "no caller can name the profile identity or version",
  buildInputType.length > 0
  && !/\bprofileId\b/.test(buildInputType)
  && !/\bprofileVersion\b/.test(buildInputType)
  && !/input\.profileVersion/.test(buildBody)
  && !/input\.profileId/.test(buildBody),
  buildInputType.length === 0
    ? "buildRenderJobSpec's parameter object could not be located"
    : "buildRenderJobSpec still accepts a caller-supplied profile identity or version");

check("S-no-literal", "no version literal is left anywhere on the enqueue path",
  !/profileVersion:\s*"/.test(contractCode) && !/profileVersion:\s*"/.test(callerCode),
  "a profileVersion literal is still present in the contract or its consumer caller");

check("W-allowlist-source", "the worker still builds its known-version allowlist from the compiled profiles",
  /knownProfileVersions:\s*new Set\(getAllJurisdictionProfiles\(\)\.map\(\(profile\) => String\(profile\.profileVersion\)\)\)/
    .test(fs.readFileSync(path.join(rootDir, WORKER), "utf8")),
  "the worker's knownProfileVersions allowlist no longer comes from the compiled profile registry");

check("S-typed-failure", "an underivable profile fails with the same typed code the worker uses",
  /throw new RenderContractError\(\s*"profile_version_unknown"/.test(contractSource),
  "an underivable profile does not raise a typed profile_version_unknown error");

check("S-caller-fails-closed", "the consumer caller turns that error into a typed outcome before anything durable exists",
  /status: "route_contract_unverifiable"/.test(callerSource)
  && callerSource.indexOf('status: "route_contract_unverifiable"') < callerSource.indexOf("await enqueueRenderJob("),
  "the caller does not fail closed on an unverifiable contract before enqueue");

// ---------------------------------------------------------------------------
// D — derivation, across the whole corpus rather than one fixture.
// ---------------------------------------------------------------------------
const profiles = getAllJurisdictionProfiles();
const workerKnownVersions = new Set(profiles.map((profile) => String(profile.profileVersion)));
const PACKET_ID = "11111111-1111-4111-8111-111111111111";

const built = [];
const refused = [];
for (const profile of profiles) {
  for (const pathway of profile.packetGenerator.pathways ?? []) {
    const route = resolvePacketRoute({ state: profile.jurisdiction.code, pathway: pathway.pathwayLabel, trackId: null });
    if (!packetRouteCanRender(route)) continue;
    let spec = null;
    try {
      spec = buildRenderJobSpec({
        packetId: PACKET_ID, state: profile.jurisdiction.code, pathway: pathway.pathwayLabel,
        trackId: null, packetFields: {}
      }).spec;
    } catch (error) {
      refused.push({ jurisdiction: profile.jurisdiction.code, pathwayId: pathway.pathwayId, error: String(error?.errorCode ?? error?.message ?? error) });
      continue;
    }
    if (!spec) continue;
    built.push({ profile, pathway, route, spec });
  }
}

check("D-corpus", `every renderable route across all ${profiles.length} compiled jurisdictions produces a specification`,
  built.length > 0 && refused.length === 0,
  refused.length ? `${refused.length} refused: ${refused.slice(0, 4).map((r) => `${r.jurisdiction}/${r.pathwayId}: ${r.error}`).join("; ")}` : "no route produced a specification at all");

const violations = { id: [], version: [], registry: [], routeProfile: [], routeId: [], renderer: [], stale: [] };
for (const entry of built) {
  const { profile, route, spec } = entry;
  const canonical = getProfileByJurisdiction(route.jurisdiction);
  if (typeof spec.profileId !== "string" || spec.profileId.trim() === "") violations.id.push(entry);
  if (typeof spec.profileVersion !== "string" || spec.profileVersion.trim() === "") violations.version.push(entry);
  if (!canonical || String(canonical.profileVersion) !== spec.profileVersion || String(canonical.jurisdiction.code) !== spec.profileId) violations.registry.push(entry);
  if (spec.profileId !== profile.jurisdiction.code || spec.profileVersion !== String(profile.profileVersion)) violations.routeProfile.push(entry);
  if (spec.routeId !== `${route.jurisdiction}:${route.pathwayId}` || !spec.routeId.startsWith(`${spec.profileId}:`)) violations.routeId.push(entry);
  if (spec.rendererKind !== route.rendererKind) violations.renderer.push(entry);
  if (spec.profileVersion === "1.3.0") violations.stale.push(entry);
}
const name = (e) => `${e.profile.jurisdiction.code}/${e.pathway.pathwayId}`;

check("D-1", "every render job carries a nonempty profile id", violations.id.length === 0, violations.id.map(name).join(", "));
check("D-2", "every render job carries a nonempty profile version", violations.version.length === 0, violations.version.map(name).join(", "));
check("D-3", "the profile id and version exist together in the compiled registry", violations.registry.length === 0, violations.registry.map((e) => `${name(e)} -> ${e.spec.profileId}@${e.spec.profileVersion}`).join(", "));
check("D-4", "the version comes from the profile the route was resolved against", violations.routeProfile.length === 0, violations.routeProfile.map(name).join(", "));
check("D-5", "the route id belongs to that same profile", violations.routeId.length === 0, violations.routeId.map((e) => `${name(e)} -> ${e.spec.routeId}`).join(", "));
check("D-6", "the renderer decision belongs to that same route", violations.renderer.length === 0, violations.renderer.map(name).join(", "));
check("D-12", 'no route reproduces the former "1.3.0" stamp', violations.stale.length === 0, violations.stale.map(name).join(", "));

// ---------------------------------------------------------------------------
// O — the identity cannot be overridden by anything a participant controls.
// ---------------------------------------------------------------------------
{
  const sample = built[0];
  const hostile = buildRenderJobSpec({
    packetId: PACKET_ID,
    state: sample.profile.jurisdiction.code,
    pathway: sample.pathway.pathwayLabel,
    trackId: null,
    packetFields: {},
    // Everything a browser body, Stripe metadata or a stale stored Briefcase
    // value could try to smuggle in. None of it is read.
    profileId: "attacker",
    profileVersion: "1.3.0",
    routeId: "XX:anything",
    rendererKind: "attacker_renderer"
  });
  check("O-7-9", "browser, Stripe and stale stored values cannot name the profile, route or renderer",
    hostile.spec?.profileId === sample.spec.profileId
    && hostile.spec?.profileVersion === sample.spec.profileVersion
    && hostile.spec?.routeId === sample.spec.routeId
    && hostile.spec?.rendererKind === sample.spec.rendererKind,
    `hostile input produced ${hostile.spec?.profileId}@${hostile.spec?.profileVersion} routeId=${hostile.spec?.routeId} renderer=${hostile.spec?.rendererKind}`);
}

// ---------------------------------------------------------------------------
// F — an underivable profile fails before a durable job could exist.
// ---------------------------------------------------------------------------
{
  const original = getProfileByJurisdiction.name;
  let raised = null;
  try {
    // A jurisdiction the route resolver recognises cannot be conjured, so this
    // asserts the guard's shape and its typed code from the source, and proves
    // the code is the one the worker raises for the same condition.
    raised = new RenderContractError("profile_version_unknown", "probe").errorCode;
  } catch (error) {
    raised = String(error);
  }
  check("F-10", "the underivable case raises the same typed code the worker's allowlist raises",
    raised === "profile_version_unknown" && /refusing to build an unverifiable job specification/.test(contractSource),
    `RenderContractError code ${raised}; guard text ${/refusing to build/.test(contractSource)}`);
  void original;
}

// ---------------------------------------------------------------------------
// W — the worker accepts what the corrected application produces.
// ---------------------------------------------------------------------------
{
  const rejected = [];
  for (const entry of built) {
    const claim = {
      id: "22222222-2222-4222-8222-222222222222",
      packetId: entry.spec.packetId,
      routeId: entry.spec.routeId,
      rendererKind: entry.spec.rendererKind,
      rendererVersion: entry.spec.rendererVersion,
      sourceSha256: entry.spec.sourceSha256,
      profileId: entry.spec.profileId,
      profileVersion: entry.spec.profileVersion,
      inputHash: "a".repeat(64),
      attemptCount: 1,
      maxAttempts: 5,
      partnerId: null,
      personId: null,
      matterId: null,
      fencingToken: "33333333-3333-4333-8333-333333333333",
      claimExpiresAt: new Date(Date.now() + 60000).toISOString()
    };
    try {
      assertClaimAcceptable(claim, {
        knownJobIds: new Set([claim.id]),
        allowedSourceShas: new Set(),
        knownProfileVersions: workerKnownVersions,
        supportedRendererKinds: new Set([PACKET_RENDERER_KIND])
      });
    } catch (error) {
      rejected.push(`${name(entry)}: ${error?.errorCode ?? error?.message ?? error}`);
    }
  }
  check("W-allowlist", `the worker allowlist accepts all ${built.length} specifications the corrected application produces`,
    rejected.length === 0, rejected.slice(0, 5).join("; "));
}

// ---------------------------------------------------------------------------
// N — the named fixtures, proved by name rather than by coincidence.
// ---------------------------------------------------------------------------
const NAMED = [
  ["N-ms", "MS", "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal", "the hosted payment fixture"],
  ["N-il-juvenile", "IL", "juvenile-automatic-or-petition-expungement", "a reachable Illinois sellable pathway"],
  ["N-il-sealing", "IL", "adult-conviction-sealing", "a reachable Illinois sellable pathway"],
  ["N-il-prostitution", "IL", "felony-prostitution-relief", "a reachable Illinois sellable pathway"]
];
for (const [id, jurisdiction, pathwayId, description] of NAMED) {
  const entry = built.find((candidate) => candidate.profile.jurisdiction.code === jurisdiction && candidate.pathway.pathwayId === pathwayId);
  const canonical = getProfileByJurisdiction(jurisdiction);
  check(id, `${jurisdiction} ${pathwayId} — ${description}`,
    Boolean(entry) && entry.spec.profileId === jurisdiction && entry.spec.profileVersion === String(canonical?.profileVersion),
    entry ? `${entry.spec.profileId}@${entry.spec.profileVersion} vs registry ${canonical?.profileVersion}` : "no specification was built for this route");
}

// A composed-document route: packet_document_v1 composes its own document and
// carries no source binary, which is exactly why the worker's allowedSourceShas
// is empty. Proved from the specification, not assumed.
{
  const composed = built.find((entry) => entry.spec.rendererKind === PACKET_RENDERER_KIND && entry.spec.sourceSha256 === null);
  check("N-composed", "a composed-document route derives its profile the same way",
    Boolean(composed) && composed.spec.profileVersion === String(composed.profile.profileVersion),
    composed ? `${name(composed)} -> ${composed.spec.profileVersion}` : "no composed-document route produced a specification");
}

// Official-form overlay. Reported as a census fact rather than forced: if the
// corpus exposes no renderable overlay route, saying so is the honest result,
// and this goes red the moment one appears without deriving its profile.
{
  const overlay = built.filter((entry) => entry.spec.rendererKind !== PACKET_RENDERER_KIND || entry.spec.sourceSha256 !== null);
  const consistent = overlay.every((entry) => entry.spec.profileVersion === String(entry.profile.profileVersion));
  check("N-official-form",
    overlay.length > 0
      ? `all ${overlay.length} official-form routes derive their profile the same way`
      : "no official-form overlay route is renderable on this corpus (recorded, not skipped)",
    consistent,
    overlay.filter((entry) => entry.spec.profileVersion !== String(entry.profile.profileVersion)).map(name).join(", "));
}

// Pennsylvania is guidance-held and is deliberately NOT a payment fixture.
//
// The hold lives in the EVALUATOR, not in the route registry: all 11 PA
// pathways carry lawrence_review = hold_guidance_only and the evaluator returns
// guidance_only with payment closed, while the packet-route resolver still
// considers them renderable and this contract still derives their profile
// correctly. Both facts are recorded, because conflating them is how "PA is
// unsellable" and "PA is broken" got mistaken for each other.
{
  const pa = getProfileByJurisdiction("PA");
  const paBuilt = built.filter((entry) => entry.profile.jurisdiction.code === "PA");
  const paPathways = pa?.pathways ?? [];
  const held = paPathways.filter((pathway) => pathway.lawrenceRatification?.lawrence_review === "hold_guidance_only");
  check("N-pa-held", "Pennsylvania is guidance-held in the evaluator, and its routes still derive their profile correctly",
    paPathways.length > 0
    && held.length === paPathways.length
    && paBuilt.every((entry) => entry.spec.profileId === "PA" && entry.spec.profileVersion === String(pa.profileVersion)),
    `${held.length} of ${paPathways.length} PA pathways hold_guidance_only; ${paBuilt.length} PA specifications built, versions ${[...new Set(paBuilt.map((e) => e.spec.profileVersion))].join(", ") || "(none)"}`);
}

console.log("");
console.log(`  corpus: ${profiles.length} jurisdictions, ${built.length} renderable routes, versions in use: ${[...new Set(built.map((e) => e.spec.profileVersion))].join(", ")}`);
if (failed > 0) {
  console.error(`verify-rcap-authoritative-profile-version FAILED: ${failed} check(s) did not hold.`);
  process.exit(1);
}
console.log("verify-rcap-authoritative-profile-version passed: every render job's profile identity is derived from the profile its route was resolved against.");
