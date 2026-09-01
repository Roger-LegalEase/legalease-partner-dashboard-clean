#!/usr/bin/env node
// Recognition of lane-B exact supported deferrals — the acceptance contract.
//
// A lane-B exact_supported_deferral is the same treatment as lane E's, stored
// in a guidance packet instead of a hard-form profile. This file holds the line
// that recognition did not become a softer standard: every safeguard that makes
// a deferral terminal is checked here, and the runtime is asked whether the
// packet's central promise to the participant — that nothing is being sold on
// this route — is actually true.
//
//   node scripts/verify-rcap-lane-b-exact-deferrals.mjs
//   node scripts/verify-rcap-lane-b-exact-deferrals.mjs --mutations
//
// --mutations breaks the safeguards one at a time, including the blind
// promotion of all nine packets, and requires every breakage to come back red.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY || "2026-08-12";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
const MUTATION_TARGETS = ["data/rcap-all50/guidance-packets/wv.json", "data/rcap-all50/review-artifacts/f2-dispositions.json", "src/lib/rcap/documents/packet-route-resolver.ts", "src/lib/expungement-ai/save-result-policy.ts", "scripts/generate-rcap-track-terminalization.mjs", "data/rcap-ledger/track-terminalization.json", "docs/record-clearing/track-terminalization.md"];

// The lock is taken only by a run that will actually mutate. A plain
// verification run changes nothing, and taking the lock for it made the
// mutation harness lie: the harness spawns this same file as a child to see
// whether a deliberate breakage is caught, and while the parent held the lock
// the child died on the lock itself. Every mutation then looked "detected" for
// a reason that had nothing to do with the mutation.
if (process.argv.includes("--mutations")) registerTrackedMutation("verify-rcap-lane-b-exact-deferrals.mjs", [...MUTATION_TARGETS, "data/rcap-all50/review-artifacts/terminalization-review-dispositions.json"]);

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKET_DIR = path.join(rootDir, "data/rcap-all50/guidance-packets");
const LEDGER = path.join(rootDir, "data/rcap-ledger/track-terminalization.json");
const DISPOSITIONS = path.join(rootDir, "data/rcap-all50/review-artifacts/f2-dispositions.json");
const TERMINALIZATION_DISPOSITIONS = path.join(rootDir, "data/rcap-all50/review-artifacts/terminalization-review-dispositions.json");

// The commit this recognition correction was built on. The "nothing else moved"
// check compares against its ledger rather than against a hand-copied list.
const BASELINE_COMMIT = "e588cc1995a115c90cd246447eaef8f35ae216d5";

if (process.argv.includes("--mutations")) {
  await runMutations();
} else {
  await runChecks();
}

async function runChecks() {
  const { resolvePacketRoute } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");

  const failures = [];
  let checks = 0;
  const check = (condition, message) => {
    checks += 1;
    if (!condition) failures.push(message);
  };

  const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
  const byKey = new Map(ledger.tracks.map((t) => [`${t.jurisdiction}:${t.trackId}`, t]));
  const dispositions = JSON.parse(fs.readFileSync(DISPOSITIONS, "utf8"));

  const approved = new Set();
  const nonApprovedOutcome = new Map();
  for (const closure of dispositions.closures ?? []) {
    for (const key of closure.trackKeys ?? []) {
      if (closure.outcome === "technical_approved") approved.add(key);
      else nonApprovedOutcome.set(key, closure.outcome);
    }
  }
  const superseded = new Set();
  for (const closure of dispositions.supersededClosures ?? []) {
    for (const key of closure.trackKeys ?? []) superseded.add(key);
  }
  const notAccepted = new Set();
  for (const record of dispositions.notAcceptedPendingOwnerDetermination ?? []) {
    for (const key of record.trackKeys ?? []) notAccepted.add(key);
  }

  // ---- derive the packets from repository bytes, never from a hardcoded list -
  const packets = [];
  for (const file of fs.readdirSync(PACKET_DIR).sort()) {
    if (!file.endsWith(".json") || file.startsWith("_")) continue;
    const parsed = JSON.parse(fs.readFileSync(path.join(PACKET_DIR, file), "utf8"));
    const jurisdiction = String(parsed.jurisdiction ?? "").toUpperCase();
    for (const packet of parsed.packets ?? []) {
      if (packet.treatment !== "exact_supported_deferral") continue;
      packets.push({ file, jurisdiction, key: `${jurisdiction}:${packet.trackId}`, packet });
    }
  }

  check(packets.length > 0, "no lane-B exact_supported_deferral packets were found at all");
  const keys = packets.map((p) => p.key);
  check(new Set(keys).size === keys.length, "a track is served by more than one lane-B deferral packet");

  const qualifying = [];
  for (const { file, jurisdiction, key, packet } of packets) {
    const row = byKey.get(key);
    check(Boolean(row), `${key}: the packet names a track that is not in the ledger`);
    if (!row) continue;

    // --- safeguards 1-3: the packet exists, is exactly this treatment, and
    // carries the complete participant treatment in both languages ----------
    check(fs.existsSync(path.join(PACKET_DIR, file)), `${key}: evidence carrier ${file} does not resolve`);
    check(packet.treatment === "exact_supported_deferral", `${key}: treatment is ${packet.treatment}`);
    check(substantive(packet.stopReason), `${key}: no supported reason in both languages`);
    check(substantive(packet.destination) && nonEmptyString(packet.destination?.name), `${key}: no exact destination`);
    check(substantive(packet.nextStep), `${key}: no exact next step`);
    check(list(packet.gather), `${key}: no participant gathering guidance in both languages`);
    check(substantive(packet.participantFiles), `${key}: does not say what the participant does and does not file`);
    check(list(packet.briefcaseSaved), `${key}: no Briefcase preservation in both languages`);
    check(Array.isArray(packet.authority) && packet.authority.length > 0, `${key}: no supporting authority`);

    // --- safeguards 4-7: payment, checkout and credit are closed ------------
    check(packet.paymentAllowed === false, `${key}: the packet allows payment`);
    check(packet.sellable === false, `${key}: the packet is sellable`);

    // The declaration is not the behaviour. Ask the authoritative resolver.
    const sellableThrough = (row.mappedCompiledPathwayIds ?? []).filter((pathwayId) => {
      const route = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId });
      return route.sellable === true || route.creditConsumable === true;
    });

    // --- safeguards 8-10: independent approval, unsuperseded, unheld --------
    const isApproved = approved.has(key);
    const isSuperseded = superseded.has(key);
    const isHeldOrCorrection = notAccepted.has(key) || nonApprovedOutcome.has(key);

    const qualifies = isApproved && !isSuperseded && !isHeldOrCorrection && sellableThrough.length === 0;
    if (qualifies) qualifying.push(key);

    // Lane-B recognition promotes a track only when every safeguard holds. A
    // track may still be terminal for a DIFFERENT reason — an independently
    // approved terminalization treatment for the same track — and when that
    // happens the runtime serves the approved treatment rather than this one,
    // because a packet under correction is not an accepted decision. What must
    // never happen is lane-B recognition promoting a track its own safeguards
    // reject, so that is what is checked.
    const promotedByLaneB = row.candidateStatus === "promoted_by_f2";
    check(
      qualifies ? row.terminal === true : !promotedByLaneB,
      qualifies
        ? `${key}: every lane-B safeguard holds but the ledger says terminal=${row.terminal}`
        : `${key}: lane-B recognition promoted a track its safeguards reject`
          + ` (approved=${isApproved}, superseded=${isSuperseded}, heldOrCorrection=${isHeldOrCorrection}, sellableThrough=${sellableThrough.join(",") || "none"})`
    );
    if (!qualifies && row.terminal === true) {
      check(
        row.candidateStatus === "promoted_by_terminalization_review",
        `${key}: terminal without a lane-B qualification and without an approved terminalization treatment (candidateStatus=${row.candidateStatus})`
      );
    }

    // Every packet is a recognised candidate whether or not it is terminal —
    // that is the difference between "delivered" and "true and approved".
    check(
      row.candidateTreatment === "exact_supported_deferral",
      `${key}: candidateTreatment is ${row.candidateTreatment}, so the treatment is not being recognised at all`
    );

    // A route the runtime still sells is recorded, with its owner, not dropped.
    const recorded = (ledger.runtimeContradictedDeferrals ?? []).find((r) => r.trackKey === key);
    if (sellableThrough.length > 0) {
      check(Boolean(recorded), `${key}: the runtime still sells this route but the ledger does not record the contradiction`);
      check(row.terminal === false, `${key}: terminal while the runtime still sells the route`);
      if (recorded) {
        check(
          arraysEqual([...recorded.sellablePathwayIds].sort(), [...sellableThrough].sort()),
          `${key}: recorded sellable pathways do not match the resolver`
        );
        check(nonEmptyString(recorded.owner), `${key}: the recorded contradiction names no owner`);
      }
    } else {
      check(!recorded, `${key}: recorded as runtime-contradicted while the resolver reports no sellable pathway`);
    }
  }

  // ---- the derived counts, stated rather than assumed ---------------------
  const approvedPackets = keys.filter((key) => approved.has(key) && !superseded.has(key));
  console.log(`  lane-B exact deferrals: ${packets.length} packets, ${approvedPackets.length} independently approved, ${qualifying.length} terminal`);
  check(packets.length === 9, `expected 9 lane-B exact_supported_deferral packets, found ${packets.length}`);
  check(approvedPackets.length === 8, `expected 8 with an unsuperseded technical_approved closure, found ${approvedPackets.length}`);
  check(qualifying.length === 8, `expected 8 to satisfy every safeguard, found ${qualifying.length}`);

  // The ninth packet — the one with no independent approval — is never terminal
  // ON THE STRENGTH OF THIS PACKET. It may be terminal because a different
  // treatment for the same track was independently approved, in which case the
  // runtime serves that approved treatment instead of this one. What is refused
  // is terminality with no approval anywhere.
  const unapproved = keys.filter((key) => !approved.has(key));
  check(unapproved.length === 1, `expected exactly 1 packet without an approval, found ${unapproved.length}`);
  for (const key of unapproved) {
    const row = byKey.get(key);
    check(
      row?.terminal === false || row?.candidateStatus === "promoted_by_terminalization_review",
      `${key}: terminal without an independent approval (candidateStatus=${row?.candidateStatus})`
    );
  }

  // ---- a complete_guidance route is untouched ----------------------------
  const guidanceRows = ledger.tracks.filter((t) => t.candidateTreatment === "complete_guidance");
  check(guidanceRows.length > 0, "no complete_guidance candidates remain, which means the loader swallowed them");
  for (const row of guidanceRows) {
    check(
      row.candidateTreatment === "complete_guidance",
      `${row.jurisdiction}:${row.trackId}: a complete_guidance route was reclassified as a deferral`
    );
  }

  // ---- nothing outside the lane-B deferral set moved ---------------------
  const baseline = JSON.parse(
    execFileSync("git", ["show", `${BASELINE_COMMIT}:data/rcap-ledger/track-terminalization.json`], {
      cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
    })
  );
  const baseTerminal = new Map(baseline.tracks.map((t) => [`${t.jurisdiction}:${t.trackId}`, t.terminal]));
  const moved = ledger.tracks
    .filter((t) => baseTerminal.get(`${t.jurisdiction}:${t.trackId}`) !== t.terminal)
    .map((t) => `${t.jurisdiction}:${t.trackId}`);
  const laneBKeys = new Set(keys);
  // The blast-radius check, restated as an invariant rather than a snapshot.
  //
  // It originally asserted an exact delta against the baseline commit: only the
  // lane-B set moved, and the ledger rose by exactly that many. That was true of
  // the recognition window it was written for. A later window then terminalized
  // every remaining track through independently approved terminal treatments, so
  // an exact-count assertion now measures how much legitimate work has happened
  // since, which is not a safety property.
  //
  // What must still hold is that nothing changed terminality without a recorded
  // reason, and that no lane-B track ever regressed. Both are checked directly.
  const terminalNowByKey = new Map(ledger.tracks.map((t) => [`${t.jurisdiction}:${t.trackId}`, t]));
  const unexplained = moved.filter((key) => {
    if (laneBKeys.has(key)) return false;
    const row = terminalNowByKey.get(key);
    const promotion = row?.candidateStatus ?? row?.promotionStatus ?? "";
    return !String(promotion).startsWith("promoted_by_");
  });
  check(
    unexplained.length === 0,
    `tracks changed terminality with no recorded promotion: ${unexplained.join(", ")}`
  );
  const regressed = [...laneBKeys].filter((key) => baseTerminal.get(key) === true && terminalNowByKey.get(key)?.terminal !== true);
  check(regressed.length === 0, `lane-B deferrals lost terminality: ${regressed.join(", ")}`);
  check(
    ledger.aggregates.tracksTerminal >= baseline.aggregates.tracksTerminal,
    `the ledger went backwards: ${baseline.aggregates.tracksTerminal} -> ${ledger.aggregates.tracksTerminal}`
  );

  // ---- the runtime honours the treatment, route by route ------------------
  //
  // Twelve executable cases, in the order they matter to a participant: the
  // route resolves to the deferral, it cannot be sold, payment is refused,
  // checkout is refused, no credit moves, and the Briefcase keeps the whole
  // treatment in both languages.
  const {
    exactDeferralForTrack,
    exactDeferralForPathway,
    exactDeferralBundle,
    exactDeferralTrackIdsForPathway,
  } = await import("../src/lib/rcap/documents/guidance-packet-registry.ts");
  const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
  const { assertCheckoutAllowed, createConsumerPaymentPlaceholder } = await import("../src/lib/expungement-ai/payment-adapter.ts");

  for (const key of keys) {
    const [jurisdiction, trackId] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
    const record = exactDeferralForTrack(trackId);

    // 1. the track resolves to the exact deferral treatment
    check(Boolean(record), `${key}: the registry does not serve this track`);
    if (!record) continue;
    check(record.classification === "exact_supported_deferral", `${key}: classification is ${record.classification} (${record.invalidReason ?? ""})`);

    for (const pathwayId of record.compiledPathwayIds) {
      const route = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId });
      // 2. the affected pathways are not sellable
      check(route.routeKind === "exact_supported_deferral", `${key} @ ${pathwayId}: routeKind is ${route.routeKind}`);
      check(route.sellable === false, `${key} @ ${pathwayId}: sellable`);
      // 3/5. payment prohibited, no packet or partner credit consumable
      check(route.creditConsumable === false, `${key} @ ${pathwayId}: credit consumable`);
      check(route.rendererKind === "none", `${key} @ ${pathwayId}: rendererKind is ${route.rendererKind}`);
      // A pathway served by one deferred track names it. A pathway shared by
      // several names none of them, because a pathway alone cannot say which
      // legal treatment the participant should read — it suppresses and stops.
      const sharing = exactDeferralTrackIdsForPathway(jurisdiction, pathwayId);
      check(sharing.includes(trackId), `${key} @ ${pathwayId}: the pathway index does not list this track`);
      if (sharing.length === 1) {
        check(route.exactDeferralTrackId === trackId, `${key} @ ${pathwayId}: route names track ${route.exactDeferralTrackId}`);
      } else {
        const shared = exactDeferralForPathway(jurisdiction, pathwayId);
        check(
          shared?.classification === "invalid_exact_supported_deferral",
          `${key} @ ${pathwayId}: ${sharing.length} tracks share this pathway but one treatment was asserted anyway`
        );
        check(route.sellable === false && route.creditConsumable === false, `${key} @ ${pathwayId}: a shared deferred pathway is still sellable`);
      }

      // no render job, so no artifact and no accounting call
      const built = buildRenderJobSpec({
        packetId: "00000000-0000-4000-8000-000000000000",
        state: jurisdiction,
        pathway: pathwayId,
        profileId: jurisdiction,
        profileVersion: "1.3.0",
        packetFields: {},
      });
      check(built.spec === null, `${key} @ ${pathwayId}: a render job spec was built for a deferred route`);

      // 4. checkout is suppressed, even for a corrupted packet-ready item
      const corrupted = {
        id: `verify-${trackId}`,
        type: "result",
        title: "verifier",
        state: jurisdiction,
        status: "packet_ready",
        resultCode: "packet_ready",
        createdAt: "2026-08-12T00:00:00.000Z",
        summary: "",
        nextSteps: [],
        paymentAllowed: true,
        packetReady: true,
        packetType: "official_pdf_overlay",
        pathwayLabel: pathwayId,
      };
      // The refusal must come from the deferral registry itself, not merely
      // from something throwing. A deferred route is also refused by the
      // delivery guard (a route with rendererKind "none" cannot take money), so
      // accepting any error here would let this lane's own safeguard be removed
      // without the suite noticing — the second door would silently cover for
      // the missing first one.
      let refusal = null;
      try {
        assertCheckoutAllowed({
          jurisdiction,
          pathwayId,
          selectedTrackId: trackId,
          treatmentClassification: "exact_supported_deferral",
          deferralComponentIds: [],
          packetType: "official_pdf_overlay",
          resultCode: "packet_ready",
          paymentAllowed: true
        });
      } catch (error) {
        refusal = error;
      }
      check(refusal !== null, `${key} @ ${pathwayId}: checkout was allowed on a mutated packet-ready item`);
      check(
        refusal?.resultCode === "exact_supported_deferral",
        `${key} @ ${pathwayId}: checkout was refused by ${refusal?.resultCode ?? refusal?.name ?? "nothing"} rather than by this lane's exact-deferral safeguard`
      );

      const placeholder = createConsumerPaymentPlaceholder({
        resultCode: "packet_ready",
        userLabel: "",
        state: jurisdiction,
        pathwayLabel: pathwayId,
        confidence: "high",
        paymentAllowed: true,
        reasons: [],
        nextSteps: [],
        emailCaptureRecommended: false,
        disclaimer: "",
      }, pathwayId);
      check(placeholder.enabled === false, `${key} @ ${pathwayId}: a payment placeholder was offered`);
      check(placeholder.amountCents === undefined, `${key} @ ${pathwayId}: a price was shown`);

      check(Boolean(exactDeferralForPathway(jurisdiction, pathwayId)), `${key} @ ${pathwayId}: the pathway index does not serve this route`);
    }

    // 5. the registry's own accounting stays at zero
    check(record.paymentAllowed === false, `${key}: registry paymentAllowed is not false`);
    check(record.checkoutSuppressed === true, `${key}: registry checkoutSuppressed is not true`);
    check(record.packetCreditConsumption === "none", `${key}: packet credit consumption is ${record.packetCreditConsumption}`);
    check(record.partnerCreditConsumed === false, `${key}: partner credit consumed is ${record.partnerCreditConsumed}`);

    // 6. the Briefcase handoff is complete in English and Spanish
    const en = exactDeferralBundle(trackId, "en");
    const es = exactDeferralBundle(trackId, "es");
    check(Boolean(en) && Boolean(es), `${key}: no bilingual Briefcase bundle`);
    if (en && es) {
      for (const [field, value] of Object.entries({
        exactReason: [en.exactReason, es.exactReason],
        destination: [en.destination, es.destination],
        nextAction: [en.nextAction, es.nextAction],
        whatNotToFileOrAssume: [en.whatNotToFileOrAssume, es.whatNotToFileOrAssume],
        handoff: [en.handoff, es.handoff],
      })) {
        check(nonEmptyString(value[0]) && nonEmptyString(value[1]), `${key}: empty ${field} in one language`);
        check(value[0] !== value[1], `${key}: ${field} is untranslated`);
      }
      check(en.gather.length > 0 && en.gather.length === es.gather.length, `${key}: gathering instructions are not at parity`);
      check(en.briefcaseSaved.length > 0 && en.briefcaseSaved.length === es.briefcaseSaved.length, `${key}: saved-handoff list is not at parity`);
      check(nonEmptyString(en.destinationName), `${key}: no exact destination name`);
      check(en.paymentAllowed === false && en.packetCreditConsumption === "none" && en.partnerCreditConsumed === false, `${key}: the bundle does not close payment and credit`);
    }
  }

  // 7. TX:tx_exp_acquittal is never promoted by lane-B RECOGNITION.
  //
  // Its lane-B packet carries correction_required, and delivery alone has never
  // been terminality — that is the rule this case was written to hold. It is
  // terminal today, but only because a separate terminalization treatment for
  // the same track was independently reviewed and approved, which is a different
  // authority reaching a different artifact. So the check is that lane-B
  // recognition did not promote it, not that nothing else ever could.
  const acquittal = byKey.get("TX:tx_exp_acquittal");
  check(Boolean(acquittal), "TX:tx_exp_acquittal is missing from the ledger");
  check(
    acquittal?.candidateStatus !== "promoted_by_f2",
    "TX:tx_exp_acquittal was promoted by an F2 closure despite carrying correction_required"
  );
  check(
    acquittal?.terminal !== true || acquittal?.candidateStatus === "promoted_by_terminalization_review",
    `TX:tx_exp_acquittal is terminal with candidateStatus ${acquittal?.candidateStatus}, which is not an accepted promotion route for it`
  );

  // 8. unrelated Texas production packet routes are untouched, and so is the
  //    legacy generator, which presents its own stored pathway value rather
  //    than a compiled id.
  const deferredTxPathways = new Set(
    keys.filter((k) => k.startsWith("TX:"))
      .flatMap((k) => exactDeferralForTrack(k.slice(3))?.compiledPathwayIds ?? [])
  );
  const txProfile = (await import("../src/lib/rcap-engine/profile-registry.ts")).getProfileByJurisdiction("TX");
  let untouchedTx = 0;
  for (const pathway of txProfile.pathways) {
    if (deferredTxPathways.has(pathway.id)) continue;
    const route = resolvePacketRoute({ state: "TX", pathway: pathway.id });
    // "Untouched" is a claim about THIS LANE, not about commerce. ADR-0004
    // retired every legacy generator's commercial authority, so the preserved
    // fact is the classification and the route identity: a lane-B deferral must
    // not reclassify a Texas route it does not name.
    check(route.routeKind === "legacy_retired", `TX ${pathway.id}: unrelated route changed to ${route.routeKind}`);
    check(route.sellable === false, `TX ${pathway.id}: a retired Texas legacy route regained commercial authority`);
    untouchedTx += 1;
  }
  check(untouchedTx > 0, "no unrelated Texas route was checked, so the preservation proof is vacuous");
  const legacyGeneratorRoute = resolvePacketRoute({ state: "TX", pathway: "more_information_needed" });
  check(
    legacyGeneratorRoute.routeKind === "legacy_retired" && legacyGeneratorRoute.sellable === false,
    "the Texas-Harris legacy generator's own stored pathway lost its route"
  );

  // The other legacy jurisdictions are untouched by this lane.
  for (const [state, pathway] of [["MS", "expungement-petition"], ["IL", "sealing_conviction"], ["PA", "pa-limited-access"], ["DC", "automatic_expungement"]]) {
    const route = resolvePacketRoute({ state, pathway });
    check(route.routeKind === "legacy_retired", `${state} lost its legacy classification`);
  }

  // No participant reaches checkout through an alternate adapter: every caller
  // of the resolver returns nothing renderable for these routes, and the
  // resolver is the only classifier.
  check((ledger.runtimeContradictedDeferrals ?? []).length === 0, "a deferral still contradicts the runtime");

  if (failures.length > 0) {
    console.error(`FAIL verify-rcap-lane-b-exact-deferrals (${failures.length}/${checks} checks failed)`);
    for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`OK verify-rcap-lane-b-exact-deferrals — ${checks} checks, ${qualifying.length} terminal, ${ledger.aggregates.tracksTerminal}/497`);
}

/* ------------------------------------------------------------------------- */

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function substantive(node) {
  if (!node || typeof node !== "object") return false;
  const { en, es } = node;
  if (!nonEmptyString(en) || !nonEmptyString(es)) return false;
  return en.trim() !== es.trim();
}

function list(node) {
  if (!node || typeof node !== "object") return false;
  const { en, es } = node;
  if (!Array.isArray(en) || !Array.isArray(es)) return false;
  if (en.length === 0 || en.length !== es.length) return false;
  return en.every(nonEmptyString) && es.every(nonEmptyString);
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/* ---- mutations ----------------------------------------------------------- */

async function runMutations() {
  const generator = path.join(rootDir, "scripts/generate-rcap-track-terminalization.mjs");
  const dispositions = DISPOSITIONS;
  // A qualifying track, chosen because it is terminal today: breaking any one
  // of its safeguards must take it back out.
  const packetFile = path.join(PACKET_DIR, "wv.json");
  const trackId = "wv_conv_single_misdemeanor";

  const mutations = [
    {
      name: "removing the independent approval turns a qualifying track red",
      files: [dispositions],
      apply: () => editJson(dispositions, (json) => {
        for (const closure of json.closures) {
          closure.trackKeys = (closure.trackKeys ?? []).filter((k) => k !== `WV:${trackId}`);
        }
      }),
    },
    {
      name: "enabling payment on a qualifying packet turns it red",
      files: [packetFile],
      apply: () => editJson(packetFile, (json) => {
        packetFor(json, trackId).paymentAllowed = true;
      }),
    },
    {
      name: "making a qualifying packet sellable turns it red",
      files: [packetFile],
      apply: () => editJson(packetFile, (json) => {
        packetFor(json, trackId).sellable = true;
      }),
    },
    {
      // The predecessor of this case added WV to LEGACY_VERIFIED and required
      // the suite to go red. It no longer does, and that is the fix rather
      // than a hole: the exact-deferral lookup now runs BEFORE the
      // legacy-verified check, so widening that list cannot make a deferred
      // route sellable. The guarantee is proven directly instead — remove the
      // priority and the suite must fail.
      name: "demoting the deferral lookup below the legacy-verified check turns it red",
      files: [path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts"),
        `  const exactCandidate = exactDeferralForTrack(input.trackId ?? null)
    ?? exactDeferralForPathway(jurisdiction, pathwayId);`,
        `  const exactCandidate = LEGACY_VERIFIED.has(jurisdiction)
    ? null
    : exactDeferralForTrack(input.trackId ?? null) ?? exactDeferralForPathway(jurisdiction, pathwayId);`
      ),
    },
    {
      name: "deleting the evidence carrier turns it red",
      files: [packetFile],
      apply: () => fs.rmSync(packetFile),
    },
    {
      name: "stripping the participant treatment turns it red",
      files: [packetFile],
      apply: () => editJson(packetFile, (json) => {
        delete packetFor(json, trackId).briefcaseSaved;
      }),
    },
    {
      name: "copying English into Spanish turns it red",
      files: [packetFile],
      apply: () => editJson(packetFile, (json) => {
        const packet = packetFor(json, trackId);
        packet.stopReason.es = packet.stopReason.en;
      }),
    },
    {
      name: "restoring the legacy sellable behaviour on a deferred Texas pathway turns the suite red",
      files: [path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts"),
        `  const exactCandidate = exactDeferralForTrack(input.trackId ?? null)
    ?? exactDeferralForPathway(jurisdiction, pathwayId);`,
        `  const exactCandidate = jurisdiction === "TX"
    ? null
    : exactDeferralForTrack(input.trackId ?? null) ?? exactDeferralForPathway(jurisdiction, pathwayId);`
      ),
    },
    {
      name: "making a deferred route sellable in the resolver turns the suite red",
      files: [path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts"),
        `      routeKind: "exact_supported_deferral",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: false,`,
        `      routeKind: "exact_supported_deferral",
      jurisdiction,
      pathwayId,
      rendererKind: "none",
      sellable: true,`
      ),
    },
    {
      name: "letting a deferred route consume credit turns the suite red",
      files: [path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts"),
        `      rendererKind: "none",
      sellable: false,
      creditConsumable: false,
      reason: exact.classification === "exact_supported_deferral"`,
        `      rendererKind: "none",
      sellable: false,
      creditConsumable: true,
      reason: exact.classification === "exact_supported_deferral"`
      ),
    },
    {
      name: "allowing checkout on a deferred route turns the suite red",
      files: [path.join(rootDir, "src/lib/expungement-ai/payment-adapter.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/expungement-ai/payment-adapter.ts"),
        "  assertNotExactDeferral(item);\n  assertNotComponentDeferral(item);",
        "  assertNotComponentDeferral(item);"
      ),
    },
    {
      // Delivery is never terminality. Forcing terminality alone no longer
      // discriminates, because every track now holds a real approval and the
      // forced value matches the true one — so the mutation removes the ninth
      // packet's approval FIRST and then promotes on delivery. That is exactly
      // the failure the rule exists to prevent: a packet nobody approved going
      // terminal because it exists.
      name: "blindly promoting all nine packets turns the suite red",
      files: [generator, TERMINALIZATION_DISPOSITIONS],
      apply: () => {
        editJson(TERMINALIZATION_DISPOSITIONS, (json) => {
          json.closures = (json.closures ?? []).filter(
            (closure) => !(closure.trackKeys ?? []).includes("TX:tx_exp_acquittal")
          );
        });
        replaceOnce(
          generator,
          "  const terminalNow = (holds.length === 0 || approvedByReview) && !runtimeSuppressionContradicted;",
          "  const terminalNow = candidateTreatment === 'exact_supported_deferral'\n    ? true\n    : (holds.length === 0 || approvedByReview) && !runtimeSuppressionContradicted;"
        );
      },
    },
  ];

  let passed = 0;
  const undetected = [];
  const ledgerBackup = fs.readFileSync(LEDGER, "utf8");
  const docPath = path.join(rootDir, "docs/record-clearing/track-terminalization.md");
  const docBackup = fs.readFileSync(docPath, "utf8");

  for (const mutation of mutations) {
    const backups = mutation.files.map((file) => ({ file, content: fs.readFileSync(file, "utf8") }));
    try {
      mutation.apply();
      // Regenerate under the mutation, then verify. A mutation is detected
      // when either step refuses.
      const gen = spawnSync(process.execPath, [generator], { cwd: rootDir, encoding: "utf8" });
      const run = gen.status === 0
        ? spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: rootDir, encoding: "utf8" })
        : { status: 1 };
      if (run.status === 0) undetected.push(`NOT DETECTED: ${mutation.name}`);
      else passed += 1;
    } finally {
      for (const backup of backups) fs.writeFileSync(backup.file, backup.content);
      fs.writeFileSync(LEDGER, ledgerBackup);
      fs.writeFileSync(docPath, docBackup);
    }
  }

  if (undetected.length > 0) {
    console.error(`FAIL lane-B exact-deferral mutations (${undetected.length}/${mutations.length} undetected)`);
    for (const line of undetected) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log(`OK lane-B exact-deferral mutations — ${passed}/${mutations.length} deliberate breakages detected`);
}

function packetFor(json, trackId) {
  const packet = (json.packets ?? []).find((p) => p.trackId === trackId);
  if (!packet) throw new Error(`mutation target ${trackId} not found`);
  return packet;
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
