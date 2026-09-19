#!/usr/bin/env node
/**
 * Census v1 — the money and credit invariants, driven rather than argued.
 *
 *   node scripts/verify-rcap-census-v1-money-credit-gate.mjs
 *   node scripts/verify-rcap-census-v1-money-credit-gate.mjs --mutations
 *
 * THE QUESTIONS
 *
 * For every route the compiled corpus can name, `resolvePacketRoute` currently
 * answers `sellable: false` and `creditConsumable: false`. This file asks
 * whether that is true of the RUNTIME, by making the calls a real request makes:
 *
 *   1. can the route display a consumer price?
 *   2. can it create a new Stripe Checkout Session?
 *   3. can it reserve sponsored entitlement?
 *   4. can it create a credit-consuming render job?
 *   5. can it attach or deliver a new commercial artifact?
 *   6. can it create a render job that reaches packet-credit accounting?
 *
 * METHOD
 *
 * Exact compiled pathway IDs, never display labels. A label is not an identity:
 * two routes sharing one would make a real defect invisible and a phantom one
 * appear, so the census asserts the identity space it drives is injective and
 * then drives ids.
 *
 * Every participant-facing probe is run with a MAXIMALLY PERMISSIVE participant
 * context — authenticated owner, VERIFIED_PACKET_READY snapshot bound to this
 * exact route and packet family, server-verified entitlement with an idempotency
 * key, private storage with a digest. That is deliberate. It removes the
 * participant from the answer, so whatever refuses is the ROUTE, which is the
 * only thing `sellable` and `creditConsumable` are statements about. A probe
 * that refused because its fixture was thin would prove nothing.
 *
 * WHAT IT FOUND
 *
 * Nothing could take money or spend a credit. But the price surface was not the
 * reason: `createConsumerPaymentPlaceholder` decided from
 * `packetRouteCanRender` (a fact about a STATE, true for all five `legacy_retired`
 * generators and every shadow-only `factory_v2` route) and from
 * data/rcap-ledger/packet-fulfillment-records.json, which is not a Grade-A
 * fulfillment record. It never asked the Grade-A authority. One forged row in
 * that ledger — the `--mutations` case below writes exactly one — restored a live
 * $50 direct-consumer price on MS:eligible-felony-conviction-expungement-99-19-71 and
 * AL:human-trafficking-victim-expungement. The price was being held off those
 * routes by an empty ledger rather than by a decision, and ADR-0004 is a
 * decision. The fix reads `launch_graph_commercial_status` through its existing
 * single governed call site; the forged row is now refused.
 *
 * The forged row stays in the suite. A gate proved once by an absence is not a
 * gate, and this one now has to refuse an input built to defeat it.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const MUTATIONS = process.argv.includes("--mutations");
const CHILD = process.argv.includes("--child");

const LEDGER = "data/rcap-ledger/packet-fulfillment-records.json";
const PAYMENT_ADAPTER = "src/lib/expungement-ai/payment-adapter.ts";
const ROUTE_RESOLVER = "src/lib/rcap/documents/packet-route-resolver.ts";
const AUTHORITY = "src/lib/rcap/fulfillment/grade-a-authority.ts";
const JOB_CONTRACT = "src/lib/rcap/render/job-contract.ts";
const MUTATION_TARGETS = [LEDGER, PAYMENT_ADAPTER, ROUTE_RESOLVER, AUTHORITY, JOB_CONTRACT];

// The two routes the forged row targets: one ADR-0004 retired legacy generator
// and one shadow-only factory route. Both resolve sellable:false today, and both
// are renderable, which is what made the old price surface say yes.
//
// Both are EXACT compiled pathway ids, and the probe asserts they still exist in
// the corpus. A forged row aimed at an id no profile carries would still have
// produced a price — `legacy_retired` is decided on jurisdiction membership, so
// any MS string resolves renderable — and the harness would have reported a
// caught mutation for a route the product does not have.
const FORGED_LEGACY_ROUTE = "MS:eligible-felony-conviction-expungement-99-19-71";
const FORGED_FACTORY_ROUTE = "AL:human-trafficking-victim-expungement";

/* -------------------------------------------------------------------------- */
/* child: the probe                                                            */
/* -------------------------------------------------------------------------- */

if (CHILD) {
  register("./lib/ts-esm-loader.mjs", import.meta.url);

  const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
  // Counsel's ratification decisions, read from the same file the job contract
  // reads. The census does not keep its own copy of the answer; it checks that
  // every refusal the contract makes is one this record already explains.
  const RATIFICATION_STATUS_OF = new Map(
    JSON.parse(fs.readFileSync("data/record-clearing/legal-decisions/route-ratification-registry.json", "utf8"))
      .routes.map((entry) => [entry.routeKey, entry.status])
  );
  const ca = await import("../src/lib/rcap/render/commercial-admission.ts");
  const { admitCommercial } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
  const pay = await import("../src/lib/expungement-ai/payment-adapter.ts");
  const jobContract = await import("../src/lib/rcap/render/job-contract.ts");
  const slots = await import("../src/lib/expungement-ai/rcap-slot-lifecycle.ts");

  const failures = [];
  let checks = 0;
  /**
   * Named invariants, so the mutation harness can attribute a result.
   *
   * The parent used to decide every case from the child's EXIT STATUS. With
   * four unresolved findings the census is red before any mutation, so a
   * nonzero exit proved nothing: a no-op mutation, an unrelated crash and a
   * genuinely removed guard were indistinguishable, and the forged-ledger case
   * could report "reopened a commercial surface" when the forged rows changed
   * nothing. Each invariant now reports its own satisfied/violated state and the
   * exact routes, and the parent asserts the transition it is testing for.
   */
  const signals = {};
  const check = (ok, message, id = null) => {
    checks += 1;
    if (id) signals[id] = { satisfied: Boolean(ok), detail: ok ? "" : String(message) };
    if (!ok) failures.push(message);
  };
  const signalRoutes = {};
  const withRoutes = (id, list) => { signalRoutes[id] = list.map((v) => (typeof v === "string" ? v : v?.routeId ?? String(v))); };

  // ---- the census denominator, recounted here from the compiled corpus ------
  const profileDir = "src/lib/rcap-engine/compiled/profiles";
  const profiles = fs.readdirSync(profileDir).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(profileDir, f), "utf8")));

  const routes = [];
  for (const profile of profiles) {
    const jurisdiction = String(profile.jurisdiction.code).toUpperCase();
    for (const pathway of profile.pathways) {
      routes.push({
        jurisdiction,
        pathwayId: pathway.id,
        label: pathway.label,
        routeId: `${jurisdiction}:${pathway.id}`,
        profileVersion: profile.profileVersion
      });
    }
  }

  // Identity, not display. Asserted rather than assumed: the whole census is
  // keyed on routeId, so a duplicate would silently merge two routes and a
  // label collision would tempt the next probe to key on the wrong thing.
  check(new Set(routes.map((r) => r.routeId)).size === routes.length,
    "compiled pathway ids are not unique; the census key is not an identity");
  const labelIndex = new Map();
  for (const r of routes) {
    const key = `${r.jurisdiction}|${r.label}`;
    labelIndex.set(key, (labelIndex.get(key) ?? []).concat(r.pathwayId));
  }
  const labelCollisions = [...labelIndex.entries()].filter(([, ids]) => ids.length > 1);
  check(labelCollisions.length === 0,
    `display labels collide inside a jurisdiction, so a label-keyed probe would be lying: ${labelCollisions.slice(0, 3).map(([k, v]) => `${k} => ${v.join(" / ")}`).join("; ")}`);

  // Every registry route must be nameable in the compiled corpus, or the census
  // has a blind spot rather than a denominator.
  const compiled = new Set(routes.map((r) => r.routeId));
  const factoryRegistry = JSON.parse(fs.readFileSync("data/record-clearing/factory-v2-route-registry.json", "utf8"));
  const factoryKeys = (factoryRegistry.routes ?? []).map((r) => r.pathwayKey ?? `${r.jurisdiction}:${r.pathwayId}`);
  check(factoryKeys.every((k) => compiled.has(k)),
    `the factory_v2 registry names routes the compiled corpus does not: ${factoryKeys.filter((k) => !compiled.has(k)).join(", ")}`);
  for (const forged of [FORGED_LEGACY_ROUTE, FORGED_FACTORY_ROUTE]) {
    check(compiled.has(forged),
      `the mutation harness aims its forged ledger row at ${forged}, which is not a compiled pathway id`);
  }
  const gradeARegistry = JSON.parse(fs.readFileSync("data/rcap-grade-a/fulfillment-authority-registry.json", "utf8"));
  const gradeAKeys = gradeARegistry.records.map((r) => r.routeId);
  check(gradeAKeys.every((k) => compiled.has(k)),
    `the Grade-A registry names routes the compiled corpus does not: ${gradeAKeys.filter((k) => !compiled.has(k)).join(", ")}`);

  const HASH = "f".repeat(64);
  const snapshotFor = (r) => ({
    jurisdiction: r.jurisdiction,
    pathwayId: r.pathwayId,
    selectedTrackId: null,
    treatmentClassification: null,
    deferralComponentIds: [],
    packetType: "custom_pleading",
    resultCode: "packet_ready",
    paymentAllowed: true,
    profileVersion: r.profileVersion ?? "1.0.0",
    profileAuthorityFingerprint: "census-legal-rule-version",
    profileSourceFingerprint: HASH,
    packetFamilyIdentifiers: { mode: "census-form-set" },
    verifiedAt: "2026-08-30T00:00:00.000Z"
  });

  /**
   * The strongest context the authority accepts: owner, bound verification,
   * server-verified unspent entitlement, private storage with a digest. What
   * refuses under this is the route.
   */
  function permissive(r, { entitlement = false, storage = false, repeatDownload = false } = {}) {
    const identity = ca.commercialRouteIdentity({ jurisdiction: r.jurisdiction, pathwayId: r.pathwayId });
    const matterId = `census-matter-${r.routeId}`;
    const context = ca.fulfillmentRequestContext({
      participantUserId: "census-participant",
      matterId,
      matterOwnerUserId: "census-participant",
      finalVerification: ca.finalVerificationSnapshotFrom({
        snapshot: snapshotFor(r),
        verificationHash: HASH,
        matterId,
        ownerUserId: "census-participant",
        packetFamilyId: identity.packetFamilyId
      }),
      entitlement: entitlement
        ? ca.entitlementContext({ kind: "consumer_payment", idempotencyKey: "census-key", alreadyConsumed: false, serverVerified: true })
        : null,
      storage: storage
        ? ca.artifactStorageContext({ privateStorage: true, artifactSha256: HASH, repeatDownload })
        : null
    });
    return { identity, context };
  }

  const priced = [];
  const checkedOut = [];
  const sponsored = [];
  const creditSpent = [];
  const attached = [];
  const delivered = [];
  const jobSpecBuilt = [];
  const jobSpecThrew = [];
  const jobSpecRefused = [];
  const jobSpecUnexplained = [];
  const jobSpecWidened = [];
  const sellableTrue = [];
  const creditTrue = [];
  const jobSpecKinds = new Map();

  for (const r of routes) {
    const route = resolvePacketRoute({ state: r.jurisdiction, pathway: r.pathwayId, trackId: null });
    if (route.sellable !== false) sellableTrue.push(r.routeId);
    if (route.creditConsumable !== false) creditTrue.push(r.routeId);

    // ---- 1. a consumer price -----------------------------------------------
    const placeholder = pay.createConsumerPaymentPlaceholder({
      state: r.jurisdiction,
      pathwayLabel: r.label,
      resultCode: "packet_ready",
      paymentAllowed: true,
      selectedTrackId: null,
      treatmentClassification: null
    }, r.pathwayId);
    if (placeholder.enabled || placeholder.amountCents !== undefined) priced.push(r.routeId);

    // ---- 2. a new Stripe Checkout Session ----------------------------------
    // The two statements a real POST /api/expungement-ai/checkout passes before
    // `stripe.checkout.sessions.create`: the checkout guard, then the admission.
    let checkoutGuardThrew = null;
    try { pay.assertCheckoutAllowed(snapshotFor(r)); } catch (error) { checkoutGuardThrew = error; }
    const co = permissive(r);
    const checkoutDecision = admitCommercial("consumer_checkout", co.identity, co.context);
    if (checkoutGuardThrew === null && checkoutDecision.admitted) checkedOut.push(r.routeId);

    // ---- 3. sponsored entitlement ------------------------------------------
    const sp = permissive(r, { entitlement: true });
    const cap = await slots.resolvePartnerPacketCapDecision("census-session", { identity: sp.identity, context: sp.context });
    if (!cap.admissionDenialCode) sponsored.push(r.routeId);

    // ---- 4 & 6. a render job, and the credit it could reach -----------------
    let built = null;
    let jobThrew = null;
    try {
      built = jobContract.buildRenderJobSpec({
        packetId: "00000000-0000-4000-8000-000000000001",
        state: r.jurisdiction,
        pathway: r.pathwayId,
        trackId: null,
        briefcaseItemId: "census-item",
        packetFields: { fullName: "Census Probe", caseNumber: "CENSUS-1" }
      });
    } catch (error) {
      // NOT `catch { built = null }`. That collapsed a deliberate refusal and an
      // unexpected failure into one outcome, so a RenderContractError -- say
      // `profile_version_unknown`, which is a configuration fault -- was counted
      // as the boundary holding. A throw is a failure and is reported as one.
      jobThrew = error;
      built = null;
    }
    if (jobThrew) {
      // `RenderContractError` carries `errorCode`, not `code`. Reading `code`
      // first fell through to the class name and threw away the one field that
      // says WHICH fault it was -- `profile_version_unknown` and
      // `renderer_kind_unknown` are different problems.
      jobSpecThrew.push(`${r.routeId} (${jobThrew?.errorCode ?? jobThrew?.code ?? jobThrew?.name ?? "error"}: ${String(jobThrew?.message ?? jobThrew).slice(0, 80)})`);
    }
    if (built?.spec) {
      jobSpecBuilt.push(r.routeId);
      jobSpecKinds.set(route.routeKind, (jobSpecKinds.get(route.routeKind) ?? 0) + 1);
      check(built.spec.routeId === r.routeId,
        `${r.routeId}: the job spec carries routeId ${built.spec.routeId}; a job must name the exact route it was built for`);
      // A spec is a widening if the route's own authority refuses it. These are
      // the two decisions the contract makes before it builds, checked here
      // against the records rather than against a remembered count.
      if (route.routeKind === "legacy_retired") {
        jobSpecWidened.push(`${r.routeId} (legacy_retired built a spec; ADR-0004 refuses new render jobs)`);
      }
      const builtStatus = RATIFICATION_STATUS_OF.get(r.routeId);
      if (builtStatus !== undefined && builtStatus !== "ratified_deployable") {
        jobSpecWidened.push(`${r.routeId} (ratification ${builtStatus} built a spec)`);
      }
    } else if (!jobThrew && route.rendererKind !== "none") {
      // Only the census denominator -- the routes that CAN render -- is
      // accounted here. A route with rendererKind "none" never reaches the
      // build and is not evidence about the shadow boundary.
      //
      // Every refusal must be one the contract's own branches explain, in the
      // contract's own order. An unexplained null is red: it cannot be told from
      // a fault, which is what "no reason returned" costs.
      const kind = route.routeKind;
      const status = RATIFICATION_STATUS_OF.get(r.routeId);
      if (kind === "component_deferral" || kind === "exact_supported_deferral" || !packetRouteCanRender(route)) {
        jobSpecRefused.push({ routeId: r.routeId, branch: `deferral_or_not_renderable:${kind}` });
      } else if (kind === "legacy_retired") {
        jobSpecRefused.push({ routeId: r.routeId, branch: "legacy_retired" });
      } else if (status !== undefined && status !== "ratified_deployable") {
        jobSpecRefused.push({ routeId: r.routeId, branch: `ratification:${status}` });
      } else {
        jobSpecUnexplained.push(`${r.routeId} (routeKind ${kind}, ratification ${JSON.stringify(status ?? null)})`);
      }
    }
    const credit = await slots.finalizeSponsoredPacketGeneration({
      sessionId: "census-session",
      briefcaseItemId: "census-item",
      expectedVerificationHash: HASH,
      artifactRefs: {
        provider: "census-probe",
        fileName: "census.pdf",
        contentType: "application/pdf",
        generatedAt: "2026-08-30T00:00:00.000Z"
      },
      fulfillmentRoute: { jurisdiction: r.jurisdiction, pathwayId: r.pathwayId },
      admission: { identity: sp.identity, context: sp.context }
    });
    // Refused BY THE ADMISSION, not by a missing Supabase client or a stale
    // hash further down. `CommercialAdmissionDeniedError` messages open with the
    // admission point that refused, so the check names the gate rather than
    // accepting any failure as proof the gate worked.
    const refusedByAdmission = credit.ok === false
      && credit.countedAs === "not_counted"
      && String(credit.error ?? "").startsWith("packet_credit_admission refused (");
    if (!refusedByAdmission) {
      creditSpent.push(`${r.routeId} (${credit.reason ?? credit.error ?? "no reason given"})`);
    }

    // ---- 5. attaching or delivering a new commercial artifact ---------------
    const st = permissive(r, { storage: true });
    if (admitCommercial("artifact_commercial_attachment", st.identity, st.context).admitted) attached.push(r.routeId);
    if (admitCommercial("briefcase_ready", st.identity, st.context).admitted) delivered.push(`${r.routeId} (briefcase_ready)`);
    let downloadThrew = null;
    try {
      ca.governPacketDownloadAdmission({
        jurisdiction: r.jurisdiction,
        pathwayId: r.pathwayId,
        participantUserId: "census-participant",
        matterId: `census-matter-${r.routeId}`,
        matterOwnerUserId: "census-participant",
        verificationSnapshot: snapshotFor(r),
        verificationHash: HASH,
        artifactSha256: HASH,
        repeatDownload: false
      });
    } catch (error) { downloadThrew = error; }
    if (downloadThrew === null) delivered.push(`${r.routeId} (private_download)`);
  }

  const summarise = (label, list) =>
    `${label}: ${list.length}${list.length ? ` — ${list.slice(0, 5).join(", ")}${list.length > 5 ? ` … +${list.length - 5}` : ""}` : ""}`;

  check(sellableTrue.length === 0, summarise("routes resolving sellable:true", sellableTrue), "resolver_sellable_false");
  withRoutes("resolver_sellable_false", sellableTrue);
  check(creditTrue.length === 0, summarise("routes resolving creditConsumable:true", creditTrue), "resolver_credit_false");
  withRoutes("resolver_credit_false", creditTrue);
  check(priced.length === 0, summarise("sellable:false routes that display a consumer price", priced), "no_consumer_price");
  withRoutes("no_consumer_price", priced);
  check(checkedOut.length === 0, summarise("sellable:false routes that reach Stripe Checkout Session creation", checkedOut), "no_checkout_session");
  withRoutes("no_checkout_session", checkedOut);
  check(sponsored.length === 0, summarise("sellable:false routes that reserve sponsored entitlement", sponsored), "no_sponsored_entitlement");
  withRoutes("no_sponsored_entitlement", sponsored);
  check(creditSpent.length === 0, summarise("creditConsumable:false routes that reach packet-credit accounting", creditSpent), "no_packet_credit");
  withRoutes("no_packet_credit", creditSpent);
  check(attached.length === 0, summarise("sellable:false routes that attach a new commercial artifact", attached), "no_artifact_attachment");
  withRoutes("no_artifact_attachment", attached);
  check(delivered.length === 0, summarise("sellable:false routes that deliver a new commercial artifact", delivered), "no_artifact_delivery");
  withRoutes("no_artifact_delivery", delivered);

  /**
   * The shadow-render boundary, stated so a widening is visible.
   *
   * HISTORICAL, and no longer true. This paragraph used to read: "gates on
   * renderability, not on `creditConsumable`, so it DOES build a spec for every
   * `legacy_retired` and `factory_v2` route … pinning the exact set is what
   * makes a future widening fail here." Both halves have since been disproved by
   * the accounting below — `legacy_retired` builds nothing, and 64 `factory_v2`
   * routes are refused by counsel's ratification registry — and the pin fired on
   * a NARROWING rather than a widening. Kept as the record of what the invariant
   * used to assert.
   *
   * CURRENT: a spec is still not a job, and the two gates that turn one into the
   * other (`provider_dispatch` before enqueue, `packet_credit_admission` before
   * the credit RPC) are asserted above. `buildRenderJobSpec` now refuses three
   * ways before it builds — deferral or unrenderable, `legacy_retired` under
   * ADR-0004, and any route counsel's registry lists as other than
   * `ratified_deployable` — so what is asserted below is that every renderable
   * route is accounted by one of those branches, that nothing faults, and that
   * no route its own authority refuses produced a spec.
   */
  const renderable = routes.filter((r) => resolvePacketRoute({ state: r.jurisdiction, pathway: r.pathwayId, trackId: null }).rendererKind !== "none");

  /*
   * These two checks used to pin the exact historical set: every renderable
   * route builds a spec, and the kinds are exactly factory_v2 + legacy_retired.
   * Both went red when the boundary moved in the SAFE direction -- ADR-0004
   * retirement reached the job contract, so `legacy_retired` stopped building
   * specs, and counsel's ratification registry refuses every listed route that
   * is not `ratified_deployable`. A count pinned to "before" reports a
   * narrowing as a defect and cannot tell one from a widening.
   *
   * Replaced by an accounting that survives both directions. Every renderable
   * route must land in exactly one place: a spec, or a refusal one of the
   * contract's OWN branches explains, read from the same authority records the
   * contract reads. The counts are printed, never asserted; what is asserted is
   * that nothing is unexplained, nothing threw, and no route the authority
   * refuses produced a spec.
   */
  check(jobSpecThrew.length === 0,
    summarise("renderable routes where buildRenderJobSpec threw; an exception is a fault, not a refusal", jobSpecThrew), "render_no_fault");
  withRoutes("render_no_fault", jobSpecThrew);
  check(jobSpecUnexplained.length === 0,
    summarise("renderable routes refused with no branch that explains it; an unexplained null cannot be told from a fault", jobSpecUnexplained), "render_all_explained");
  withRoutes("render_all_explained", jobSpecUnexplained);
  check(jobSpecWidened.length === 0,
    summarise("routes that built a render job spec against their own authority", jobSpecWidened), "render_no_widening");
  withRoutes("render_no_widening", jobSpecWidened);
  check(jobSpecBuilt.length + jobSpecRefused.length + jobSpecThrew.length + jobSpecUnexplained.length === renderable.length,
    `${jobSpecBuilt.length} built + ${jobSpecRefused.length} refused + ${jobSpecThrew.length} threw + ${jobSpecUnexplained.length} unexplained does not account for ${renderable.length} renderable routes`, "render_accounted");

  const byBranch = {};
  for (const row of jobSpecRefused) byBranch[row.branch] = (byBranch[row.branch] ?? 0) + 1;
  const kinds = [...jobSpecKinds.keys()].sort();

  console.log(`census v1: ${routes.length} compiled routes over ${profiles.length} jurisdictions, ${checks} assertion(s).`);
  console.log(`  sellable:false ${routes.length}/${routes.length} · creditConsumable:false ${routes.length}/${routes.length}`);
  console.log(`  price ${priced.length} · checkout ${checkedOut.length} · sponsored ${sponsored.length} · credit ${creditSpent.length} · attach ${attached.length} · deliver ${delivered.length}`);
  console.log(`  shadow render specs: ${jobSpecBuilt.length} (${[...jobSpecKinds].map(([k, v]) => `${k} ${v}`).join(", ")})`);
  console.log(`  renderable ${renderable.length} = ${jobSpecBuilt.length} spec + ${jobSpecRefused.length} refused + ${jobSpecThrew.length} threw + ${jobSpecUnexplained.length} unexplained`);
  for (const [branch, n] of Object.entries(byBranch).sort()) console.log(`    refused by ${branch}: ${n}`);

  // The machine-readable result the mutation parent attributes from. Printed
  // unconditionally, before any exit, so a red census still reports which
  // invariants are red and which routes made them so.
  console.log(`CENSUS_SIGNALS ${JSON.stringify({
    signals,
    routes: signalRoutes,
    counts: {
      routes: routes.length,
      renderable: renderable.length,
      jobSpecBuilt: jobSpecBuilt.length,
      jobSpecRefused: jobSpecRefused.length,
      jobSpecThrew: jobSpecThrew.length,
      jobSpecUnexplained: jobSpecUnexplained.length,
      priced: priced.length,
      checkedOut: checkedOut.length
    }
  })}`);

  if (failures.length > 0) {
    console.error(`\nverify-rcap-census-v1-money-credit-gate FAILED — ${failures.length} problem(s):\n`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }
  console.log("No route may price, sell, sponsor, spend a credit on, attach or deliver a packet. Every refusal comes from the Grade-A authority.");
  process.exit(0);
}

/* -------------------------------------------------------------------------- */
/* parent                                                                      */
/* -------------------------------------------------------------------------- */

const self = fileURLToPath(import.meta.url);
function runProbe(extraArgs = []) {
  return spawnSync(process.execPath, [self, "--child", ...extraArgs], { cwd: rootDir, encoding: "utf8" });
}

if (!MUTATIONS) {
  const run = runProbe();
  process.stdout.write(run.stdout ?? "");
  if (run.status !== 0) {
    process.stderr.write(run.stderr ?? "");
    process.exit(run.status ?? 1);
  }
  process.exit(0);
}

/* ---- mutations ----------------------------------------------------------- */

registerTrackedMutation("verify-rcap-census-v1-money-credit-gate.mjs", MUTATION_TARGETS);

const originals = new Map(MUTATION_TARGETS.map((file) => [file, fs.readFileSync(path.join(rootDir, file))]));
const restore = () => { for (const [file, bytes] of originals) fs.writeFileSync(path.join(rootDir, file), bytes); };

/**
 * A packet-fulfillment ledger row that satisfies every field
 * `packetFulfillmentShortfall` checks, with both postures open and a reviewed
 * artifact status. It is not a Grade-A record and passes through no admission
 * point — which is the entire point of writing it.
 */
function forgedRow(routeKey) {
  const separator = routeKey.indexOf(":");
  return {
    routeKey,
    jurisdiction: routeKey.slice(0, separator),
    pathwayId: routeKey.slice(separator + 1),
    packetFamily: "census-forged-family",
    packetFamilyLabel: "Census forged family",
    packetSpecificationId: "census-forged-spec",
    packetSpecificationVersion: "1.0.0",
    packetSpecificationPath: "docs/census-forged.json",
    packetSpecificationSha256: "a".repeat(64),
    packetComponents: [
      "primary filing or application",
      "proposed order where required",
      "attachments or schedules",
      "filing destination",
      "fee or waiver instructions",
      "service or notice",
      "post-filing steps"
    ],
    sourceIdentities: [{ sourceId: "census-forged-source", kind: "official_form", verification: "present_in_repository" }],
    artifactProvider: "rcap_grade_a_composer_v1",
    artifactProviderVersion: "1.0.0",
    renderer: "packet_document_v1",
    rendererVersion: "1.0.0",
    contentType: "application/pdf",
    requiredFacts: ["full_name"],
    finalVerificationRequirements: ["matter_id"],
    verificationBinding: "census-forged-binding",
    privateDelivery: true,
    repeatDownload: true,
    artifactApprovalStatus: "counsel_reviewed",
    consumerPosture: "open",
    sponsoredPosture: "open",
    holdReason: "",
    provenBy: "census-v1 mutation harness",
    provenOn: "2026-08-30"
  };
}

function writeForgedLedger() {
  const doc = JSON.parse(originals.get(LEDGER).toString("utf8"));
  doc.records = [...doc.records, forgedRow(FORGED_LEGACY_ROUTE), forgedRow(FORGED_FACTORY_ROUTE)];
  fs.writeFileSync(path.join(rootDir, LEDGER), JSON.stringify(doc, null, 2));
}

/** Replace one exact fragment, failing loudly if the source has moved. */
function editSource(file, find, replace) {
  const full = path.join(rootDir, file);
  const source = originals.get(file).toString("utf8");
  if (source.split(find).length !== 2) {
    throw new Error(`mutation target moved: ${file} no longer contains exactly one copy of the fragment being replaced`);
  }
  fs.writeFileSync(full, source.replace(find, replace));
}

// The replacements are assembled from fragments rather than written out, so no
// ready-made bypass for any of these gates exists as a literal in this file.
const TRUE_ = ["tr", "ue"].join("");
const FALSE_ = ["fal", "se"].join("");

const cases = [
  {
    name: "the price surface stops asking the Grade-A authority",
    detail: "a forged non-Grade-A ledger row then restores a $50 price on a legacy_retired route",
    breaks: ["no_consumer_price"],
    forgeLedger: true,
    mutate: () => editSource(PAYMENT_ADAPTER, "fulfillmentProven && routeSellable", ["fulfillment", "Proven"].join(""))
  },
  {
    name: "the resolver calls a retired legacy generator sellable again",
    detail: "the census denominator must notice a route that stops declaring sellable:false",
    breaks: ["resolver_sellable_false"],
    forgeLedger: false,
    mutate: () => editSource(
      ROUTE_RESOLVER,
      "      // Grade-A fulfillment record keyed to an exact route and packet family.\n      sellable: false,",
      `      // Grade-A fulfillment record keyed to an exact route and packet family.\n      sellable: ${TRUE_},`
    )
  },
  {
    name: "the authority honours an unproven route",
    detail: "every money probe must be the authority's answer, not a coincidence upstream of it",
    breaks: ["no_sponsored_entitlement"],
    forgeLedger: false,
    mutate: () => editSource(
      AUTHORITY,
      "  if (!authority.authorized) {\n    return refuse(authority,",
      `  if (!authority.authorized && ${FALSE_}) {\n    return refuse(authority,`
    )
  },
  {
    name: "the render contract stops fencing unrenderable routes",
    detail: "an unrenderable route reaching the build must not pass silently",
    breaks: ["render_accounted"],
    forgeLedger: false,
    mutate: () => editSource(
      JOB_CONTRACT,
      '"exact_supported_deferral" || !packetRouteCanRender(route)',
      '"exact_supported_deferral"'
    )
  },
  /* ---- the render-accounting regressions, automated ----------------------
   * M1-M4 were proved by hand when the accounting replaced the pinned counts.
   * A proof that lives only in a commit message is not a control, so each is a
   * case here, and each names the invariant it must break.
   */
  {
    name: "a retired legacy route may open a new render job",
    detail: "ADR-0004 refuses new render jobs for retired generators; removing the branch must be caught",
    breaks: ["render_no_widening"],
    forgeLedger: false,
    mutate: () => editSource(
      JOB_CONTRACT,
      '  if (route.routeKind === "legacy_retired") {\n    return { spec: null, route };\n  }',
      `  if (${FALSE_}) {\n    return { spec: null, route };\n  }`
    )
  },
  {
    name: "a route counsel has not ratified may open a render job",
    detail: "the ratification registry refuses every listed route that is not ratified_deployable",
    breaks: ["render_no_widening"],
    forgeLedger: false,
    mutate: () => editSource(
      JOB_CONTRACT,
      '  if (ratification !== undefined && ratification !== "ratified_deployable") {\n    return { spec: null, route };\n  }',
      `  if (${FALSE_}) {\n    return { spec: null, route };\n  }`
    )
  },
  {
    name: "a render-contract fault is counted as a refusal",
    detail: "an exception is a fault; the old catch{} swallowed it into the refused pile",
    breaks: ["render_no_fault"],
    forgeLedger: false,
    mutate: () => editSource(
      JOB_CONTRACT,
      "  const ratification = RATIFICATION_STATUS_OF.get(",
      '  if (route.jurisdiction === "WY") { throw new RenderContractError("profile_version_unknown", "census mutation: injected fault"); }\n  const ratification = RATIFICATION_STATUS_OF.get('
    )
  },
  {
    name: "a route is refused with no branch that explains it",
    detail: "an unexplained null cannot be told from a fault and must not pass as a refusal",
    breaks: ["render_all_explained"],
    forgeLedger: false,
    mutate: () => editSource(
      JOB_CONTRACT,
      "  const rendererKind = route.rendererKind as RendererKind;",
      '  if (route.jurisdiction === "WY") { return { spec: null, route }; }\n  const rendererKind = route.rendererKind as RendererKind;'
    )
  },
  /* ---- the harness testing itself ---------------------------------------
   * Everything above claims "caught". These two claim the opposite, and they
   * are what makes the rest trustworthy: under the old exit-status rule BOTH
   * would have been reported as detections, because the census is already red.
   */
  {
    name: "SELF-TEST a no-op mutation must not be credited as a detection",
    detail: "a comment-only edit changes no behaviour; the census stays exactly as red as the control",
    breaks: ["render_no_widening"],
    expect: "undetected",
    forgeLedger: false,
    mutate: () => editSource(
      JOB_CONTRACT,
      "  const rendererKind = route.rendererKind as RendererKind;",
      "  // census self-test: a no-op edit\n  const rendererKind = route.rendererKind as RendererKind;"
    )
  },
  {
    name: "SELF-TEST an unrelated crash must be an execution failure, not a detection",
    detail: "a child that cannot run has tested no commercial boundary at all",
    breaks: ["render_no_widening"],
    expect: "harness_failure",
    forgeLedger: false,
    mutate: () => editSource(
      JOB_CONTRACT,
      "export function buildRenderJobSpec(input: {",
      "const CENSUS_SELFTEST_CRASH: unknown = (undefined as unknown as { x: { y: number } }).x.y;\nexport function buildRenderJobSpec(input: {"
    )
  }
];

/**
 * Result attribution.
 *
 * Exit status cannot decide any of this. The census is legitimately red on
 * findings the repository has not resolved, so `status !== 0` was true before
 * any mutation ran: a no-op, an unrelated crash and a removed guard all looked
 * identical, and the forged-ledger case could announce that a commercial
 * surface had reopened when the forged rows changed nothing.
 *
 * Each case now names the invariants it must break. A case passes only when
 * those invariants are SATISFIED in the control run and VIOLATED under the
 * mutation. A child that does not emit a parseable result is a harness failure,
 * never a detection.
 */
const readSignals = (run) => {
  const line = (run.stdout ?? "").split("\n").reverse().find((l) => l.startsWith("CENSUS_SIGNALS "));
  if (!line) return null;
  try { return JSON.parse(line.slice("CENSUS_SIGNALS ".length)); } catch { return null; }
};

let failed = 0;
try {
  // The control. Every later claim is a transition away from this.
  const control = readSignals(runProbe());
  if (!control) {
    console.log("  FAIL harness — the control run produced no parseable result; no mutation case can be attributed");
    failed += 1;
  }
  const satisfiedInControl = (id) => control?.signals?.[id]?.satisfied === true;

  // First: the gate must HOLD against an input built to defeat it. Judged on
  // the targeted invariants and the targeted routes, not on the exit status.
  if (control) {
    writeForgedLedger();
    const held = readSignals(runProbe());
    restore();
    const TARGETED = ["no_consumer_price", "no_checkout_session"];
    if (!held) {
      failed += 1;
      console.log("  FAIL harness — the forged-ledger run produced no parseable result");
    } else {
      const reopened = TARGETED.filter((id) => satisfiedInControl(id) && held.signals?.[id]?.satisfied !== true);
      const targetedRoutes = TARGETED.flatMap((id) => held.routes?.[id] ?? [])
        .filter((r) => r === FORGED_LEGACY_ROUTE || r === FORGED_FACTORY_ROUTE);
      if (reopened.length === 0 && targetedRoutes.length === 0) {
        console.log("  ok   a forged packet-fulfillment ledger row does not reopen a price or checkout on the two targeted routes");
      } else {
        failed += 1;
        console.log(`  FAIL a forged packet-fulfillment ledger row reopened ${reopened.join(", ") || "a surface"} on ${targetedRoutes.join(", ") || "the targeted routes"}`);
      }
    }
  }

  // Then: each gate, removed, must break the invariant it exists to hold.
  for (const testCase of cases) {
    if (!control) break;
    if (testCase.forgeLedger) writeForgedLedger();
    testCase.mutate();
    const run = runProbe();
    const after = readSignals(run);
    restore();

    // Decide the OUTCOME first, then compare it to what this case expects. The
    // two self-tests below expect a non-detection, and they are the only reason
    // this harness can claim its "caught" verdicts mean anything.
    let outcome, note = "";
    if (!after) {
      const why = (run.stderr ?? "").trim().split("\n").slice(-1)[0] ?? `exit ${run.status}`;
      outcome = "harness_failure";
      note = `the child produced no parseable result (${why.slice(0, 90)})`;
    } else if (testCase.breaks.some((id) => !satisfiedInControl(id))) {
      // An assertion already red cannot prove detection from its unchanged red.
      outcome = "harness_failure";
      note = `${testCase.breaks.filter((id) => !satisfiedInControl(id)).join(", ")} is already violated in the control, so this case cannot claim detection`;
    } else {
      const broken = testCase.breaks.filter((id) => after.signals?.[id]?.satisfied !== true);
      if (broken.length === testCase.breaks.length) {
        outcome = "caught";
        note = broken.map((id) => `${id}: ${String(after.signals[id].detail).slice(0, 110)}`).join("\n         ");
      } else {
        outcome = "undetected";
        note = `still satisfied under the mutation: ${testCase.breaks.filter((id) => !broken.includes(id)).join(", ")}`;
      }
    }

    const expected = testCase.expect ?? "caught";
    if (outcome === expected) {
      console.log(`  ok   ${outcome === "caught" ? "caught" : `${outcome} as required`} — ${testCase.name}`);
      if (note) console.log(`         ${note}`);
    } else {
      failed += 1;
      console.log(`  FAIL ${outcome} — ${testCase.name} (expected ${expected})\n         ${testCase.detail}\n         ${note}`);
    }
  }
} finally {
  restore();
}

if (failed > 0) {
  console.error(`\nverify-rcap-census-v1-money-credit-gate --mutations FAILED — ${failed} case(s).`);
  process.exit(1);
}
console.log(`\ncensus v1 mutations: ${cases.length + 1} case(s); every gate is load-bearing and the forged ledger row is refused.`);
