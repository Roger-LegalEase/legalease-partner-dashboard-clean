#!/usr/bin/env node
// The captain-owned runtime proof for composed-route component deferrals.
//
// The imported lane verifier checks the 31 committed treatment records. This
// one checks what the application actually does with them: that a composed
// route missing an official form we do not supply cannot be sold, cannot
// consume a credit, cannot be rendered, and hands the participant a Briefcase
// item that says what is missing and how to come back — in English and in
// Spanish.
//
// The ten affected routes live in six jurisdictions, two of which (IL, TX) are
// LEGACY_VERIFIED and therefore sellable by jurisdiction. That is the sharp
// edge this file exists to hold: exact track identity must outrank the
// jurisdiction classification, or an incomplete Illinois route inherits
// Illinois's renderer.
//
//   node scripts/verify-rcap-component-deferral-runtime.mjs
//   node scripts/verify-rcap-component-deferral-runtime.mjs --mutations
//
// --mutations re-runs this file as a subprocess under seven deliberate
// breakages and requires every one of them to come back red.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY || "2026-08-12";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("verify-rcap-component-deferral-runtime.mjs", ["src/lib/rcap/documents/packet-route-resolver.ts", "src/lib/expungement-ai/save-result-policy.ts", "src/lib/rcap-engine/expungement-ai-adapter.ts", "src/lib/rcap-engine/rcap-adapter.ts"]);

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSED_DIR = path.join(rootDir, "data/rcap-all50/composed-routes");

if (process.argv.includes("--mutations")) {
  await runMutations();
} else {
  await runChecks();
}

async function runChecks() {
  const {
    componentDeferralForTrack,
    componentDeferralBundle,
    hasComponentDeferral
  } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");
  const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
  // The adapter, not the raw evaluator: the clamp lives beside the evaluator
  // because evaluator.ts is byte-pinned by the reviewed screening parity
  // approval, and the adapters are every server-side path into the engine.
  const { evaluateExpungementAiMatter } = await import("../src/lib/rcap-engine/expungement-ai-adapter.ts");
  const { evaluateRcapMatter } = await import("../src/lib/rcap-engine/rcap-adapter.ts");
  const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
  const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
  const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
  const { buildSaveInput, resolveSavePaymentAllowed } = await import("../src/lib/expungement-ai/save-result-policy.ts");
  const { forbiddenRouteIdentityFields, selectComposedRoute } = await import("../src/lib/rcap-engine/composed-route-selector.ts");

  const failures = [];
  let checks = 0;
  const check = (condition, message) => {
    checks += 1;
    if (!condition) failures.push(message);
  };

  const routes = readAffectedRoutes();
  check(routes.length === 10, `expected 10 dependency-bearing composed routes, found ${routes.length}`);
  const totalComponents = routes.reduce((sum, route) => sum + route.componentIds.length, 0);
  check(totalComponents === 31, `expected 31 official-form dependency components, found ${totalComponents}`);

  let resolvedComponents = 0;
  let briefcaseComponents = 0;

  for (const route of routes) {
    const { trackId, jurisdiction, componentIds } = route;

    // ---- 1. every component treatment resolves, exactly once ----------------
    check(hasComponentDeferral(trackId), `${trackId}: the registry does not recognise the track`);
    const deferral = componentDeferralForTrack(trackId);
    check(Boolean(deferral), `${trackId}: no component-deferral record`);
    if (!deferral) continue;
    check(
      deferral.classification === "component_deferral",
      `${trackId}: classification is ${deferral.classification}${deferral.invalidReason ? ` (${deferral.invalidReason})` : ""}`
    );
    check(
      arraysEqual(deferral.componentIds, componentIds),
      `${trackId}: registry component ids ${deferral.componentIds.join(",")} do not match route.json ${componentIds.join(",")}`
    );
    check(deferral.components.length === componentIds.length, `${trackId}: ${deferral.components.length} treatments for ${componentIds.length} components`);

    // ---- 2/3/4. bilingual copy, supporting evidence, no bare assertions -----
    for (const locale of ["en", "es"]) {
      const bundle = componentDeferralBundle(trackId, locale);
      check(Boolean(bundle), `${trackId}: no ${locale} bundle`);
      if (!bundle) continue;
      check(bundle.locale === locale, `${trackId}: bundle locale is ${bundle.locale}, expected ${locale}`);
      check(nonEmpty(bundle.summary), `${trackId}: empty ${locale} summary`);
      check(bundle.nextSteps.every(nonEmpty), `${trackId}: an empty ${locale} next step`);
      check(bundle.componentIds.length === componentIds.length, `${trackId}: ${locale} bundle covers ${bundle.componentIds.length}/${componentIds.length} components`);

      for (const component of bundle.components) {
        for (const [field, value] of Object.entries({
          absentComponent: component.absentComponent,
          specificReason: component.specificReason,
          packetAbsenceDisclosure: component.packetAbsenceDisclosure,
          destination: component.destination,
          destinationName: component.destinationName,
          nextAction: component.nextAction,
          briefcaseReturn: component.briefcaseReturn
        })) {
          check(nonEmpty(value), `${trackId}/${component.componentId}: empty ${locale} ${field}`);
        }
        check(component.gather.length > 0 && component.gather.every(nonEmpty), `${trackId}/${component.componentId}: no ${locale} gathering instructions`);
        check(component.doNot.length > 0 && component.doNot.every(nonEmpty), `${trackId}/${component.componentId}: no ${locale} what-not-to-file guidance`);
        check(component.briefcasePreserved.length > 0, `${trackId}/${component.componentId}: no ${locale} preserved-work statement`);
        check(component.briefcaseOutstanding.length > 0, `${trackId}/${component.componentId}: no ${locale} outstanding-action statement`);
        check(component.evidenceIds.length > 0, `${trackId}/${component.componentId}: no evidence carrier ids`);
        if (locale === "en") {
          resolvedComponents += 1;
          briefcaseComponents += 1;
        }
      }
    }

    const en = componentDeferralBundle(trackId, "en");
    const es = componentDeferralBundle(trackId, "es");
    if (en && es) {
      check(en.summary !== es.summary, `${trackId}: the Spanish summary is byte-identical to the English one`);
      for (let i = 0; i < en.components.length; i += 1) {
        const componentId = en.components[i].componentId;
        check(en.components[i].absentComponent !== es.components[i].absentComponent, `${trackId}/${componentId}: untranslated absentComponent`);
        check(en.components[i].nextAction !== es.components[i].nextAction, `${trackId}/${componentId}: untranslated nextAction`);
      }
    }

    // Every participant-facing claim in the committed treatment names an
    // evidence carrier, and every carrier resolves on disk. A statement about
    // someone's legal route without a source behind it is exactly the kind of
    // thing this repository is not allowed to ship.
    for (const componentId of componentIds) {
      const treatmentPath = path.join(COMPOSED_DIR, route.stateSlug, route.dirName, "components", componentId, "deferral-treatment.json");
      check(fs.existsSync(treatmentPath), `${trackId}/${componentId}: no committed treatment file`);
      if (!fs.existsSync(treatmentPath)) continue;
      const treatment = JSON.parse(fs.readFileSync(treatmentPath, "utf8"));
      const evidence = Array.isArray(treatment.evidence) ? treatment.evidence : [];
      check(evidence.length > 0, `${trackId}/${componentId}: no evidence array`);
      for (const carrier of evidence) {
        check(Boolean(carrier?.path) && fs.existsSync(path.join(rootDir, carrier.path)), `${trackId}/${componentId}: evidence carrier ${carrier?.path} does not resolve`);
      }
      const authority = Array.isArray(treatment.authority) ? treatment.authority : [];
      check(authority.length > 0, `${trackId}/${componentId}: no supporting authority`);
      for (const entry of authority) {
        check(nonEmpty(entry?.sourceRef) || nonEmpty(entry?.citation), `${trackId}/${componentId}: an authority entry names neither a citation nor a sourceRef`);
      }
      const pt = treatment.participantTreatment ?? {};
      // `briefcase` groups three separately-sourced statements, so evidence is
      // asserted on its children rather than on the container.
      const claims = [];
      for (const [field, node] of Object.entries(pt)) {
        if (!node || typeof node !== "object") continue;
        if (Array.isArray(node.evidenceRefs)) {
          claims.push([field, node]);
          continue;
        }
        for (const [child, childNode] of Object.entries(node)) {
          if (childNode && typeof childNode === "object") claims.push([`${field}.${child}`, childNode]);
        }
      }
      for (const [field, node] of claims) {
        const refs = node.evidenceRefs;
        check(Array.isArray(refs) && refs.length > 0, `${trackId}/${componentId}: participant copy '${field}' carries no evidenceRefs`);
        for (const ref of refs ?? []) {
          check(evidence.some((carrier) => carrier?.id === ref), `${trackId}/${componentId}: '${field}' cites unknown evidence id ${ref}`);
        }
      }
    }

    // ---- 5/6/7. payment, checkout and credit stay closed --------------------
    check(deferral.paymentAllowed === false, `${trackId}: registry reports paymentAllowed=${deferral.paymentAllowed}`);
    check(deferral.checkoutSuppressed === true, `${trackId}: registry reports checkoutSuppressed=${deferral.checkoutSuppressed}`);
    check(deferral.packetCreditConsumption === "none", `${trackId}: packet credit consumption is ${deferral.packetCreditConsumption}`);
    check(deferral.partnerCreditConsumed === false, `${trackId}: partner credit consumed is ${deferral.partnerCreditConsumed}`);

    // ---- route classification, including over the legacy-verified states ----
    const profile = getProfileByJurisdiction(jurisdiction);
    const pathwayIds = profile ? profile.pathways.map((pathway) => pathway.id) : [""];
    for (const pathwayId of pathwayIds.length > 0 ? pathwayIds : [""]) {
      const resolution = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId, trackId });
      check(resolution.routeKind === "component_deferral", `${trackId} @ ${jurisdiction}:${pathwayId}: routeKind is ${resolution.routeKind}`);
      check(resolution.sellable === false, `${trackId} @ ${jurisdiction}:${pathwayId}: sellable`);
      check(resolution.creditConsumable === false, `${trackId} @ ${jurisdiction}:${pathwayId}: credit consumable`);
      check(resolution.rendererKind === "none", `${trackId} @ ${jurisdiction}:${pathwayId}: rendererKind is ${resolution.rendererKind}`);
      check(packetRouteCanRender(resolution) === false, `${trackId} @ ${jurisdiction}:${pathwayId}: packetRouteCanRender is true`);
      check(
        arraysEqual(resolution.deferralComponentIds ?? [], componentIds),
        `${trackId} @ ${jurisdiction}:${pathwayId}: deferralComponentIds do not match route.json`
      );

      // No render job may be built for a deferred route.
      const built = buildRenderJobSpec({
        packetId: "00000000-0000-4000-8000-000000000000",
        state: jurisdiction,
        pathway: pathwayId,
        profileId: jurisdiction,
        profileVersion: "1.3.0",
        trackId,
        packetFields: {}
      });
      check(built.spec === null, `${trackId} @ ${jurisdiction}:${pathwayId}: a render job spec was built`);
    }

    // ---- the engine clamp --------------------------------------------------
    if (profile) {
      const request = {
        jurisdiction,
        profileVersion: profile.profileVersion,
        matterId: `component-deferral-${trackId}`,
        answers: {},
        selectedTrackId: trackId
      };

      // Both server adapters, because both are live entry points into the
      // engine and a clamp on only one of them is a hole.
      const consumer = evaluateExpungementAiMatter(request);
      const partner = evaluateRcapMatter({ ...request, caseId: `case-${trackId}` }).evaluation;
      for (const [label, evaluation] of [["consumer", consumer], ["partner", partner]]) {
        check(evaluation.resultCode === "guidance_only", `${trackId} (${label}): engine returned ${evaluation.resultCode}`);
        check(evaluation.paymentAllowed === false, `${trackId} (${label}): engine returned paymentAllowed=true`);
        check(evaluation.packetPlan === undefined, `${trackId} (${label}): engine returned a packet plan`);
        check(evaluation.treatmentClassification === "component_deferral", `${trackId} (${label}): engine did not classify the treatment`);
        check(evaluation.selectedTrackId === trackId, `${trackId} (${label}): engine echoed selectedTrackId=${evaluation.selectedTrackId}`);
        check(arraysEqual(evaluation.deferralComponentIds ?? [], componentIds), `${trackId} (${label}): engine component ids do not match`);
        check(evaluation.nextSteps.length > componentIds.length, `${trackId} (${label}): engine next steps do not cover every component`);
      }

      // The pinned evaluator itself is deliberately unchanged: it knows nothing
      // about deferrals, and the clamp is what supplies the behaviour.
      const raw = evaluateScreening(request);
      check(raw.treatmentClassification === undefined, `${trackId}: the pinned evaluator was modified to classify deferrals`);
    }

    // ---- the Briefcase save clamp, sponsored and direct-to-consumer alike ---
    for (const isPartnerSession of [true, false]) {
      const saveInput = buildSaveInput(
        {
          userId: "verifier",
          jurisdiction,
          // A caller insisting the route is packet-ready and payable.
          resultCode: "packet_ready",
          packetType: "custom_pleading",
          paymentAllowed: true,
          summary: "client supplied",
          nextSteps: ["client supplied"],
          selectedTrackId: trackId,
          treatmentClassification: "component_deferral",
          deferralComponentIds: componentIds
        },
        { isPartnerSession }
      );
      const label = isPartnerSession ? "partner" : "direct";
      check(saveInput.paymentAllowed === false, `${trackId} (${label}): save input allows payment`);
      check(saveInput.status === "guidance_saved", `${trackId} (${label}): save status is ${saveInput.status}`);
      check(saveInput.resultCode === "guidance_only", `${trackId} (${label}): save result code is ${saveInput.resultCode}`);
      check(saveInput.packetType === "guidance_packet", `${trackId} (${label}): save packet type is ${saveInput.packetType}`);
      check(saveInput.paymentStatus === "not_applicable", `${trackId} (${label}): save payment status is ${saveInput.paymentStatus}`);
      check(saveInput.packetStatus === "not_started", `${trackId} (${label}): save packet status is ${saveInput.packetStatus}`);
      check(saveInput.amountCents === undefined, `${trackId} (${label}): save input carries an amount`);
      check(saveInput.artifactRefs?.treatmentClassification === "component_deferral", `${trackId} (${label}): artifactRefs lost the classification`);
      check(arraysEqual(saveInput.artifactRefs?.deferralComponentIds ?? [], componentIds), `${trackId} (${label}): artifactRefs lost the component ids`);
    }
    check(resolveSavePaymentAllowed(false, true, "component_deferral") === false, `${trackId}: resolveSavePaymentAllowed honours a mutated true`);
  }

  check(resolvedComponents === 31, `expected 31 resolved component treatments, resolved ${resolvedComponents}`);
  check(briefcaseComponents === 31, `expected Briefcase handoff data for 31 components, found ${briefcaseComponents}`);

  // ---- route identity is server-owned at both HTTP boundaries --------------
  for (const field of ["selectedTrackId", "treatmentClassification", "deferralComponentIds"]) {
    check(
      forbiddenRouteIdentityFields({ jurisdiction: "IL", [field]: "il-prb-cert" }).includes(field),
      `a client body asserting ${field} is not rejected`
    );
  }
  check(forbiddenRouteIdentityFields({ jurisdiction: "IL", answers: {} }).length === 0, "an ordinary client body is wrongly rejected");
  check(selectComposedRoute({ jurisdiction: "IL", pathwayId: "" }).status === "no_composed_route", "the selector invents an identity without a pathway");

  // ---- an unaffected route is untouched ------------------------------------
  const control = resolvePacketRoute({ state: "MS", pathway: "expungement-petition", trackId: null });
  check(control.routeKind === "legacy_verified", `the control route regressed to ${control.routeKind}`);
  check(control.sellable === true, "the control route lost its sellability");

  if (failures.length > 0) {
    console.error(`FAIL verify-rcap-component-deferral-runtime (${failures.length}/${checks} checks failed)`);
    for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
    if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
    process.exit(1);
  }
  console.log(`OK verify-rcap-component-deferral-runtime — ${checks} checks, 10 routes, 31 components, EN+ES`);
}

/* ------------------------------------------------------------------------- */

function readAffectedRoutes() {
  const routes = [];
  for (const stateSlug of fs.readdirSync(COMPOSED_DIR).sort()) {
    const stateDir = path.join(COMPOSED_DIR, stateSlug);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const dirName of fs.readdirSync(stateDir).sort()) {
      const routePath = path.join(stateDir, dirName, "route.json");
      if (!fs.existsSync(routePath)) continue;
      const route = JSON.parse(fs.readFileSync(routePath, "utf8"));
      const componentIds = (route.units ?? [])
        .filter((unit) => unit.requiredOutput === "official_form_dependency")
        .map((unit) => unit.componentId);
      if (componentIds.length === 0) continue;
      routes.push({
        trackId: route.trackId ?? dirName,
        jurisdiction: String(route.jurisdiction?.code ?? "").toUpperCase(),
        componentIds,
        stateSlug,
        dirName
      });
    }
  }
  return routes;
}

function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index]);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/* ---- mutation harness ---------------------------------------------------- */

async function runMutations() {
  // Illinois is the deliberate sample: it is LEGACY_VERIFIED, so if any guard
  // here is not load-bearing, the mutation falls through to a sellable route.
  const componentsRoot = path.join(COMPOSED_DIR, "illinois/il-prb-cert/components");
  const componentDir = path.join(componentsRoot, fs.readdirSync(componentsRoot).sort()[0]);
  const treatmentPath = path.join(componentDir, "deferral-treatment.json");

  const mutations = [
    {
      name: "deleting one component treatment turns the route red",
      files: [treatmentPath],
      apply: () => fs.rmSync(treatmentPath)
    },
    {
      name: "enabling payment on a component turns the verifier red",
      files: [treatmentPath],
      apply: () => editJson(treatmentPath, (json) => {
        json.participantTreatment.payment.paymentAllowed = true;
        json.runtimeContract.paymentAllowed = true;
      })
    },
    {
      name: "un-suppressing checkout on a component turns the verifier red",
      files: [treatmentPath],
      apply: () => editJson(treatmentPath, (json) => {
        json.participantTreatment.payment.checkoutSuppressed = false;
        json.runtimeContract.checkoutSuppressed = false;
      })
    },
    {
      name: "enabling credit consumption turns the verifier red",
      files: [treatmentPath],
      apply: () => editJson(treatmentPath, (json) => {
        json.participantTreatment.credit.packetCreditConsumption = "one_packet_credit";
        json.runtimeContract.packetCreditConsumption = "one_packet_credit";
      })
    },
    {
      name: "deleting the Briefcase handoff turns the verifier red",
      files: [treatmentPath],
      apply: () => editJson(treatmentPath, (json) => {
        delete json.participantTreatment.briefcase;
      })
    },
    {
      name: "deleting the evidence carrier turns the verifier red",
      files: [treatmentPath],
      apply: () => editJson(treatmentPath, (json) => {
        json.evidence = json.evidence.map((carrier) => ({ ...carrier, path: `${carrier.path}.missing` }));
      })
    },
    {
      name: "making the deferred route sellable in the resolver turns the verifier red",
      files: [path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts"),
        `      routeKind: "component_deferral",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,`,
        `      routeKind: "component_deferral",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: true,`
      )
    },
    {
      name: "removing the engine clamp from the consumer adapter turns the verifier red",
      files: [path.join(rootDir, "src/lib/rcap-engine/expungement-ai-adapter.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap-engine/expungement-ai-adapter.ts"),
        "return applyComponentDeferralClamp(input, evaluateScreening(input));",
        "return evaluateScreening(input);"
      )
    },
    {
      name: "removing the engine clamp from the partner adapter turns the verifier red",
      files: [path.join(rootDir, "src/lib/rcap-engine/rcap-adapter.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap-engine/rcap-adapter.ts"),
        "const evaluation = applyComponentDeferralClamp(input, evaluateScreening(input));",
        "const evaluation = evaluateScreening(input);"
      )
    },
    {
      name: "letting the save policy honour a client payment flag turns the verifier red",
      files: [path.join(rootDir, "src/lib/expungement-ai/save-result-policy.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/expungement-ai/save-result-policy.ts"),
        `  if (treatmentClassification === "component_deferral") return false;`,
        `  if (treatmentClassification === "component_deferral" && false) return false;`
      )
    }
  ];

  let passed = 0;
  const failures = [];
  for (const mutation of mutations) {
    const backups = mutation.files.map((file) => ({ file, content: fs.readFileSync(file, "utf8") }));
    try {
      mutation.apply();
      const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: rootDir, encoding: "utf8" });
      if (run.status === 0) failures.push(`NOT DETECTED: ${mutation.name}`);
      else passed += 1;
    } finally {
      for (const backup of backups) fs.writeFileSync(backup.file, backup.content);
    }
  }

  if (failures.length > 0) {
    console.error(`FAIL component-deferral runtime mutations (${failures.length}/${mutations.length} undetected)`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`OK component-deferral runtime mutations — ${passed}/${mutations.length} deliberate breakages detected`);
}

function editJson(file, mutate) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  mutate(json);
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

function replaceOnce(file, from, to) {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes(from)) throw new Error(`mutation anchor not found in ${file}`);
  fs.writeFileSync(file, content.replace(from, to));
}
