#!/usr/bin/env node
// The acceptance contract for the emergency 497/497 terminalization window.
//
// Roger authorized every nonterminal track to receive the strongest complete,
// safe, repository-supported terminal treatment available now. This file holds
// the line that "strongest available" did not quietly become "whatever we had".
// Every treatment is exercised through the real runtime — the authoritative
// resolver, the screening adapters, the payment adapter, the checkout guard,
// the render-job contract and the Briefcase write path — because a treatment
// that reads well in JSON and still sells a packet is worse than no treatment
// at all.
//
//   node scripts/verify-rcap-terminalization-treatments.mjs
//   node scripts/verify-rcap-terminalization-treatments.mjs --mutations
//
// --mutations breaks each safeguard one at a time and requires every breakage
// to come back red.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY || "2026-08-13";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TREATMENT_DIR = path.join(rootDir, "data/rcap-all50/terminalization-treatments");
const BRIEFS = path.join(rootDir, "data/rcap-all50/review-artifacts/terminalization-evidence-briefs.json");
const RESOLVER = path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts");

function treatmentFiles() {
  if (!fs.existsSync(TREATMENT_DIR)) return [];
  return fs.readdirSync(TREATMENT_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort()
    .map((f) => path.join(TREATMENT_DIR, f));
}

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and the
// journal this writes is recovered by the next repository command even if this
// process is killed outright. Every treatment file is registered rather than the
// directory, because the mutation target is chosen from the registry at run time
// and the guard restores exact bytes, not trees.
//
// Taken ONLY by a run that will actually mutate. This harness spawns itself as a
// child to see whether a deliberate breakage is caught; if the parent held the
// lock during a plain run, the child would die on the lock and every mutation
// would look detected for a reason unrelated to the mutation.
if (process.argv.includes("--mutations")) {
  registerTrackedMutation("verify-rcap-terminalization-treatments.mjs", [
    ...treatmentFiles().map((file) => path.relative(rootDir, file)),
    "src/lib/rcap/documents/packet-route-resolver.ts"
  ]);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

if (process.argv.includes("--mutations")) {
  await runMutations();
} else {
  await runChecks();
}

async function runChecks() {
  const {
    allTerminalTreatments,
    terminalTreatmentForTrack,
    terminalTreatmentBundle,
    allCompleteGuidanceTracks,
    componentDeferralForTrack,
    exactDeferralForTrack,
    exactDeferralForPathway
  } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");
  const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
  const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
  const { createConsumerPaymentPlaceholder, assertCheckoutAllowed, ConsumerCheckoutNotAllowedError } =
    await import("../src/lib/expungement-ai/payment-adapter.ts");
  const { createBriefcaseItem, getBriefcaseItem } = await import("../src/lib/expungement-ai/briefcase.ts");
  const { evaluateExpungementAiMatter } = await import("../src/lib/rcap-engine/expungement-ai-adapter.ts");
  const { evaluateRcapMatter } = await import("../src/lib/rcap-engine/rcap-adapter.ts");
  const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");

  const failures = [];
  let checks = 0;
  const check = (condition, message) => {
    checks += 1;
    if (!condition) failures.push(message);
  };

  const briefs = JSON.parse(fs.readFileSync(BRIEFS, "utf8"));
  const briefByTrack = new Map(briefs.briefs.map((b) => [b.trackId, b]));
  const treatments = allTerminalTreatments();

  check(treatments.length > 0, "no terminalization treatments are registered; the window has produced nothing to verify");

  // ---- coverage: the window treats exactly the tracks it briefed ------------
  for (const brief of briefs.briefs) {
    check(
      Boolean(terminalTreatmentForTrack(brief.trackId)),
      `${brief.key}: briefed as nonterminal but carries no terminal treatment`
    );
  }
  for (const treatment of treatments) {
    check(
      briefByTrack.has(treatment.trackId),
      `${treatment.jurisdiction}:${treatment.trackId}: a treatment exists for a track this window never briefed`
    );
  }

  // ---- every treatment loaded valid ----------------------------------------
  for (const treatment of treatments) {
    check(
      treatment.classification === "terminal_treatment_candidate",
      `${treatment.jurisdiction}:${treatment.trackId}: treatment failed the registry contract — ${treatment.invalidReason ?? "unspecified"}`
    );
  }

  const valid = treatments.filter((t) => t.classification === "terminal_treatment_candidate");

  for (const treatment of valid) {
    const key = `${treatment.jurisdiction}:${treatment.trackId}`;
    const brief = briefByTrack.get(treatment.trackId);

    // ---- 1. authoritative resolution reaches an exact treatment for THIS
    // track. Some tracks already carry an ACCEPTED component deferral from the
    // C dependency work; an accepted decision outranks a pending candidate, so
    // the resolver is expected to answer with that instead. What must be true
    // either way is that the route names this track and offers nothing: which
    // of the two accepted authorities answers is not the participant's problem.
    // An ACCEPTED treatment of any kind outranks a pending candidate: the C
    // dependency component deferrals and the lane-B exact deferrals were both
    // reviewed and closed before this window opened. When one of those answers,
    // the route is already correct and carries no pending review state, because
    // there is nothing left pending about it.
    const componentDeferral = componentDeferralForTrack(treatment.trackId);
    const acceptedDeferral = componentDeferral
      || exactDeferralForTrack(treatment.trackId)
      || exactDeferralForPathway(treatment.jurisdiction, "");
    const probes = [null, ...((brief?.exactUnavailabilityEvidence?.mappedCompiledPathwayIds) ?? [])];
    for (const pathwayId of probes) {
      const route = resolvePacketRoute({
        state: treatment.jurisdiction,
        pathway: pathwayId ?? "",
        trackId: treatment.trackId
      });
      const via = pathwayId ?? "(none)";
      const namesTrack = route.exactDeferralTrackId === treatment.trackId
        || (route.guidanceTrackIds ?? []).includes(treatment.trackId)
        || (route.routeKind === "component_deferral" && Boolean(componentDeferral));
      check(namesTrack, `${key}: resolver did not reach a treatment naming this track through pathway ${via} (got ${route.routeKind})`);
      if (!acceptedDeferral) {
        check(route.treatmentReviewState === "pending_independent_review", `${key}: resolver did not carry pending_independent_review through pathway ${via}`);
      }
      // ---- 2/4/5. payment and both credit types stay closed -----------------
      check(route.sellable === false, `${key}: resolver reports the route sellable through pathway ${via}`);
      check(route.creditConsumable === false, `${key}: resolver reports the route credit-consumable through pathway ${via}`);
      // ---- 6. no render job -------------------------------------------------
      check(packetRouteCanRender(route) === false, `${key}: resolver reports a renderer through pathway ${via}`);
    }

    check(treatment.packetCreditConsumption === "none", `${key}: registry reports packetCreditConsumption=${treatment.packetCreditConsumption}`);
    check(treatment.partnerCreditConsumption === "none", `${key}: registry reports partnerCreditConsumption=${treatment.partnerCreditConsumption}`);
    check(treatment.partnerCreditConsumed === false, `${key}: registry reports partnerCreditConsumed=${treatment.partnerCreditConsumed}`);
    check(treatment.packetPromise === "none", `${key}: registry reports packetPromise=${treatment.packetPromise}`);

    // ---- 6. the render-job contract refuses to build a spec -----------------
    const built = buildRenderJobSpec({
      packetId: "00000000-0000-4000-8000-000000000000",
      state: treatment.jurisdiction,
      pathway: "",
      profileId: treatment.jurisdiction,
      profileVersion: "1.3.0",
      briefcaseItemId: `verify-${treatment.trackId}`,
      trackId: treatment.trackId,
      packetFields: {}
    });
    check(built.spec === null, `${key}: the render-job contract produced a spec for a treated route`);

    // ---- 2. payment is prohibited at the participant's first surface --------
    const placeholder = createConsumerPaymentPlaceholder({
      resultCode: "packet_ready",
      userLabel: "",
      state: treatment.jurisdiction,
      pathwayLabel: "",
      confidence: "high",
      paymentAllowed: true,
      packetType: "custom_pleading",
      reasons: [],
      nextSteps: [],
      emailCaptureRecommended: false,
      reminderRecommended: false,
      disclaimer: "",
      selectedTrackId: treatment.trackId
    });
    check(placeholder.enabled === false, `${key}: the payment placeholder is enabled for a treated route`);
    check(placeholder.amountCents === undefined, `${key}: the payment placeholder carries an amount for a treated route`);

    // ---- 3. checkout is suppressed even for a corrupted item ----------------
    let refused = false;
    try {
      assertCheckoutAllowed({
        id: `verify-${treatment.trackId}`,
        state: treatment.jurisdiction,
        pathwayLabel: "",
        selectedTrackId: treatment.trackId,
        resultCode: "packet_ready",
        paymentAllowed: true,
        artifactRefs: {}
      });
    } catch (error) {
      refused = error instanceof ConsumerCheckoutNotAllowedError;
    }
    check(refused, `${key}: checkout was not refused for a treated route claiming packet_ready with payment open`);

    // ---- 9/10/11. substantive English and Spanish, no prohibited copy -------
    const en = terminalTreatmentBundle(treatment.trackId, "en");
    const es = terminalTreatmentBundle(treatment.trackId, "es");
    check(Boolean(en && es), `${key}: no bilingual bundle could be assembled`);
    if (en && es) {
      const elements = ["routeLabel", "mechanism", "participantFiles", "controllingActor", "stopReason", "destination", "nextStep", "afterNextStep", "escalation", "briefcaseReturn"];
      for (const element of elements) {
        check(String(en[element] ?? "").trim().length >= 20, `${key}: English ${element} is missing or too short to be substantive`);
        check(String(es[element] ?? "").trim().length >= 20, `${key}: Spanish ${element} is missing or too short to be substantive`);
        check(String(en[element]).trim() !== String(es[element]).trim(), `${key}: Spanish ${element} repeats the English text`);
      }
      for (const list of ["gather", "doNot", "nextSteps", "briefcasePreserved", "briefcaseOutstanding"]) {
        check(en[list].length > 0, `${key}: English ${list} is empty`);
        check(es[list].length > 0, `${key}: Spanish ${list} is empty`);
        check(en[list].join("|") !== es[list].join("|"), `${key}: Spanish ${list} repeats the English list`);
      }
      // ---- 5 (directive). the exact destination, never a generic referral ---
      check(en.destinationName.trim().length > 0, `${key}: the treatment names no destination`);
      check(
        !/^(?:contact (?:a|an) (?:lawyer|attorney)|your local court|see your state'?s website|legal aid)$/i.test(en.destinationName.trim()),
        `${key}: the destination "${en.destinationName}" is a generic referral`
      );
      check(en.authorityCitations.length > 0, `${key}: the treatment cites no operative authority`);
    }

    // ---- both server adapters clamp before anything else sees it -----------
    // Both, because both are live entry points into the engine and a clamp on
    // only one of them is a hole. A jurisdiction with no compiled profile has
    // no engine path to clamp, so it is skipped rather than faked.
    const profile = getProfileByJurisdiction(treatment.jurisdiction);
    if (profile) {
      const request = {
        jurisdiction: treatment.jurisdiction,
        profileVersion: profile.profileVersion,
        matterId: `terminalization-${treatment.trackId}`,
        answers: {},
        selectedTrackId: treatment.trackId
      };
      const consumer = evaluateExpungementAiMatter(request);
      const partner = evaluateRcapMatter({ ...request, caseId: `case-${treatment.trackId}` }).evaluation;
      for (const [label, evaluation] of [["consumer", consumer], ["partner", partner]]) {
        check(evaluation.resultCode === "guidance_only", `${key} (${label}): engine returned ${evaluation.resultCode}`);
        check(evaluation.paymentAllowed === false, `${key} (${label}): engine returned paymentAllowed=true`);
        check(evaluation.packetPlan === undefined, `${key} (${label}): engine returned a packet plan`);
        // Same precedence: an accepted component deferral answering first is a
        // correct outcome, not a missing classification.
        const classified = evaluation.treatmentClassification === "terminal_treatment_candidate"
          || (Boolean(componentDeferral) && evaluation.treatmentClassification === "component_deferral")
          || (Boolean(acceptedDeferral) && evaluation.treatmentClassification === "exact_supported_deferral");
        check(classified, `${key} (${label}): engine classified the treatment as ${evaluation.treatmentClassification ?? "nothing"}`);
        check(evaluation.selectedTrackId === treatment.trackId, `${key} (${label}): engine echoed selectedTrackId=${evaluation.selectedTrackId}`);
      }
    }

    // ---- 7/8. the Briefcase persists it, and reopening returns the same -----
    const userId = `verify-user-${treatment.trackId}`;
    const saved = await createBriefcaseItem({
      userId,
      itemType: "result",
      jurisdiction: treatment.jurisdiction,
      pathwayLabel: "",
      resultCode: "packet_ready",
      packetType: "custom_pleading",
      paymentAllowed: true,
      status: "packet_ready",
      summary: "unclamped",
      nextSteps: ["unclamped"],
      selectedTrackId: treatment.trackId,
      artifactRefs: { locale: "es" }
    });
    check(saved.paymentAllowed === false, `${key}: the Briefcase saved a treated route with payment open`);
    check(saved.status === "guidance_saved", `${key}: the Briefcase saved status=${saved.status}`);
    check(saved.resultCode === "guidance_only", `${key}: the Briefcase saved resultCode=${saved.resultCode}`);
    check(saved.packetType === "guidance_packet", `${key}: the Briefcase saved packetType=${saved.packetType}`);
    check(saved.paymentStatus === "not_applicable", `${key}: the Briefcase saved paymentStatus=${saved.paymentStatus}`);
    check(saved.packetStatus === "not_started", `${key}: the Briefcase saved packetStatus=${saved.packetStatus}`);
    check(saved.amountCents === undefined || saved.amountCents === null, `${key}: the Briefcase saved an amount on a treated route`);
    const savedTreatment = saved.artifactRefs?.terminalTreatment;
    check(Boolean(savedTreatment), `${key}: the Briefcase saved no terminal treatment payload`);
    check(saved.artifactRefs?.treatmentReviewState === "pending_independent_review", `${key}: the Briefcase item does not record pending_independent_review`);
    if (savedTreatment) {
      // Saved in the participant's own locale, with the whole handoff intact.
      check(savedTreatment.locale === "es", `${key}: the Briefcase saved the treatment in ${savedTreatment.locale}, not the participant's locale`);
      check(String(savedTreatment.stopReason ?? "").trim().length > 0, `${key}: the saved handoff carries no reason`);
      check(String(savedTreatment.destination ?? "").trim().length > 0, `${key}: the saved handoff carries no destination`);
      check(String(savedTreatment.nextStep ?? "").trim().length > 0, `${key}: the saved handoff carries no next action`);
      check((savedTreatment.gather ?? []).length > 0, `${key}: the saved handoff says nothing to gather`);
      check((savedTreatment.doNot ?? []).length > 0, `${key}: the saved handoff says nothing to avoid signing or filing`);
      check((savedTreatment.briefcasePreserved ?? []).length > 0, `${key}: the saved handoff does not say what is preserved`);
      check((savedTreatment.briefcaseOutstanding ?? []).length > 0, `${key}: the saved handoff does not say what is outstanding`);
      check(String(savedTreatment.briefcaseReturn ?? "").trim().length > 0, `${key}: the saved handoff carries no return-and-resume instruction`);
    }

    const reopened = await getBriefcaseItem(userId, saved.id);
    check(Boolean(reopened), `${key}: the saved treatment could not be reopened`);
    if (reopened) {
      const reopenedTreatment = reopened.artifactRefs?.terminalTreatment;
      check(
        reopenedTreatment?.trackId === treatment.trackId,
        `${key}: reopening returned a different treatment (${reopenedTreatment?.trackId ?? "none"})`
      );
      check(
        JSON.stringify(reopenedTreatment) === JSON.stringify(savedTreatment),
        `${key}: reopening returned a changed treatment`
      );
      check(reopened.paymentAllowed === false, `${key}: reopening reported payment as open`);
    }
  }

  // ---- every complete-guidance track is non-sellable by exact track id -----
  // Not just the ones in this window. This is the guarantee that caught
  // IL:il-auto-seal-2028 and TX:tx_exp_discretionary: a guidance track binding
  // to no compiled pathway used to fall through to its jurisdiction's
  // legacy_verified classification, which is sellable. Those two tracks are
  // already terminal and outside the 114, so nothing else here exercises them —
  // which is exactly why dropping the binding has to fail loudly right here.
  for (const guidance of allCompleteGuidanceTracks()) {
    const route = resolvePacketRoute({ state: guidance.jurisdiction, pathway: "", trackId: guidance.trackId });
    const key = `${guidance.jurisdiction}:${guidance.trackId}`;
    check(route.sellable === false, `${key}: a complete-guidance track resolves sellable by exact track id (${route.routeKind})`);
    check(route.creditConsumable === false, `${key}: a complete-guidance track resolves credit-consumable by exact track id`);
    check(packetRouteCanRender(route) === false, `${key}: a complete-guidance track resolves to a renderer`);
  }

  // ---- 12. an unrelated production route is unchanged ----------------------
  const mississippi = resolvePacketRoute({ state: "MS", pathway: "" });
  check(mississippi.routeKind === "legacy_verified", `an unrelated Mississippi production route changed to ${mississippi.routeKind}`);
  check(mississippi.sellable === true, "an unrelated Mississippi production route stopped being sellable");
  const pennsylvania = resolvePacketRoute({ state: "PA", pathway: "" });
  check(pennsylvania.routeKind === "legacy_verified", `an unrelated Pennsylvania production route changed to ${pennsylvania.routeKind}`);
  check(pennsylvania.sellable === true, "an unrelated Pennsylvania production route stopped being sellable");

  if (failures.length > 0) {
    // The cap keeps a normal failure readable; --all prints everything, which
    // is what you want when triaging a whole batch at once.
    const limit = process.argv.includes("--all") ? failures.length : 60;
    console.error(`FAIL terminalization treatments (${failures.length} of ${checks} checks)`);
    for (const line of failures.slice(0, limit)) console.error(`  - ${line}`);
    if (failures.length > limit) console.error(`  … and ${failures.length - limit} more (re-run with --all)`);
    process.exit(1);
  }
  console.log(`OK terminalization treatments — ${valid.length} treatments, ${checks} checks`);
}

async function runMutations() {
  const { allTerminalTreatments } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");
  const registered = allTerminalTreatments().filter((t) => t.classification === "terminal_treatment_candidate");
  if (registered.length === 0) {
    console.error("FAIL terminalization mutations — no valid treatment is registered to mutate");
    process.exit(1);
  }
  const target = registered[0];
  const targetFile = path.join(TREATMENT_DIR, `${target.jurisdiction.toLowerCase()}.json`);
  if (!fs.existsSync(targetFile)) {
    console.error(`FAIL terminalization mutations — expected ${targetFile} to exist`);
    process.exit(1);
  }

  // The baseline must be GREEN before a single mutation runs. Without this the
  // whole exercise reports a false pass: if the unmutated verifier is already
  // failing, every deliberate breakage "turns it red" for a reason that has
  // nothing to do with the breakage, and a mutation that is genuinely undetected
  // is indistinguishable from one that works.
  const baseline = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: rootDir, encoding: "utf8" });
  if (baseline.status !== 0) {
    console.error("FAIL terminalization mutations — the unmutated verifier is already failing, so no mutation result would mean anything");
    console.error(baseline.stderr.split("\n").slice(0, 8).map((line) => `  ${line}`).join("\n"));
    process.exit(1);
  }

  const entryFor = (json) => {
    const entry = (json.treatments ?? []).find((t) => t.trackId === target.trackId);
    if (!entry) throw new Error(`mutation target ${target.trackId} not found`);
    return entry;
  };

  const mutations = [
    {
      name: "deleting the evidence carrier turns the suite red",
      files: [targetFile],
      apply: () => fs.rmSync(targetFile)
    },
    {
      name: "enabling payment turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).runtimeContract.paymentAllowed = true; })
    },
    {
      name: "making the route sellable turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).runtimeContract.sellable = true; })
    },
    {
      name: "un-suppressing checkout turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).runtimeContract.checkoutSuppressed = false; })
    },
    {
      name: "enabling packet-credit consumption turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).runtimeContract.packetCreditConsumption = "one_packet_credit"; })
    },
    {
      name: "enabling partner-credit consumption turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).runtimeContract.partnerCreditConsumption = "one_partner_credit"; })
    },
    {
      name: "allowing a render job turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).runtimeContract.renderJobAllowed = true; })
    },
    {
      name: "removing the Briefcase handoff turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { delete entryFor(json).briefcase; })
    },
    {
      name: "removing the return-and-resume instruction turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { delete entryFor(json).briefcase.return; })
    },
    {
      name: "copying the English text into Spanish turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { const e = entryFor(json); e.stopReason.es = e.stopReason.en; })
    },
    {
      name: "removing the Spanish treatment turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { delete entryFor(json).nextStep.es; })
    },
    {
      name: "restoring generic future-packet copy turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => {
        entryFor(json).nextStep.en = "A packet for this route is coming soon; check back later.";
      })
    },
    {
      name: "removing the exact destination turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).destination.name = ""; })
    },
    {
      name: "replacing the destination with a generic referral turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).destination.name = "Contact a lawyer"; })
    },
    {
      name: "removing the exact stop reason turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { delete entryFor(json).stopReason; })
    },
    {
      name: "removing the operative authority turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).authority = []; })
    },
    {
      name: "letting the treatment claim its own promotion turns the suite red",
      files: [targetFile],
      apply: () => editJson(targetFile, (json) => { entryFor(json).promotionEffect = "promotes_track"; })
    },
    {
      // The guarantee that makes a legacy state safe: the treatment lookup runs
      // BEFORE the legacy-verified check, so Illinois and Texas cannot sell a
      // treated route. Remove that priority and the suite must fail.
      name: "demoting the treatment lookup below the legacy-verified check turns the suite red",
      files: [RESOLVER],
      apply: () => replaceOnce(
        RESOLVER,
        "  const treatment = terminalTreatmentForTrack(input.trackId ?? null);",
        "  const treatment = LEGACY_VERIFIED.has(jurisdiction) ? null : terminalTreatmentForTrack(input.trackId ?? null);"
      )
    },
    {
      name: "dropping the track-scoped guidance binding turns the suite red",
      files: [RESOLVER],
      apply: () => replaceOnce(
        RESOLVER,
        "  const guidance = completeGuidanceForTrack(input.trackId ?? null);",
        "  const guidance = null as ReturnType<typeof completeGuidanceForTrack>;"
      )
    }
  ];

  let passed = 0;
  const undetected = [];
  for (const mutation of mutations) {
    const backups = mutation.files.map((file) => ({ file, content: fs.readFileSync(file, "utf8") }));
    try {
      mutation.apply();
      const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: rootDir, encoding: "utf8" });
      if (run.status === 0) undetected.push(`NOT DETECTED: ${mutation.name}`);
      else passed += 1;
    } finally {
      for (const backup of backups) fs.writeFileSync(backup.file, backup.content);
    }
  }

  if (undetected.length > 0) {
    console.error(`FAIL terminalization mutations (${undetected.length}/${mutations.length} undetected)`);
    for (const line of undetected) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log(`OK terminalization mutations — ${passed}/${mutations.length} deliberate breakages detected`);
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
