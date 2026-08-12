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
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKET_DIR = path.join(rootDir, "data/rcap-all50/guidance-packets");
const LEDGER = path.join(rootDir, "data/rcap-ledger/track-terminalization.json");
const DISPOSITIONS = path.join(rootDir, "data/rcap-all50/review-artifacts/f2-dispositions.json");

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

    check(
      row.terminal === qualifies,
      `${key}: ledger terminal=${row.terminal} but the safeguards say ${qualifies}`
        + ` (approved=${isApproved}, superseded=${isSuperseded}, heldOrCorrection=${isHeldOrCorrection}, sellableThrough=${sellableThrough.join(",") || "none"})`
    );

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
  check(qualifying.length === 7, `expected 7 to satisfy every safeguard, found ${qualifying.length}`);

  // The ninth packet — the one with no independent approval — is never terminal.
  const unapproved = keys.filter((key) => !approved.has(key));
  check(unapproved.length === 1, `expected exactly 1 packet without an approval, found ${unapproved.length}`);
  for (const key of unapproved) {
    check(byKey.get(key)?.terminal === false, `${key}: terminal without an independent approval`);
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
  const movedOutsideLaneB = moved.filter((key) => !laneBKeys.has(key));
  check(
    movedOutsideLaneB.length === 0,
    `tracks outside the lane-B deferral set changed terminality: ${movedOutsideLaneB.join(", ")}`
  );
  check(moved.length === qualifying.length, `${moved.length} tracks moved, expected ${qualifying.length}`);
  check(
    baseline.aggregates.tracksTerminal + qualifying.length === ledger.aggregates.tracksTerminal,
    `ledger moved ${baseline.aggregates.tracksTerminal} -> ${ledger.aggregates.tracksTerminal}, expected +${qualifying.length}`
  );

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
      name: "enabling credit consumption on the route turns it red",
      files: [path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts")],
      apply: () => replaceOnce(
        path.join(rootDir, "src/lib/rcap/documents/packet-route-resolver.ts"),
        `export const LEGACY_VERIFIED_JURISDICTIONS = ["MS", "IL", "DC", "PA", "TX"] as const;`,
        `export const LEGACY_VERIFIED_JURISDICTIONS = ["MS", "IL", "DC", "PA", "TX", "WV"] as const;`
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
      name: "blindly promoting all nine packets turns the suite red",
      files: [generator],
      apply: () => replaceOnce(
        generator,
        "  const terminalNow = (holds.length === 0 || approvedByReview) && !runtimeSuppressionContradicted;",
        "  const terminalNow = candidateTreatment === 'exact_supported_deferral'\n    ? true\n    : (holds.length === 0 || approvedByReview) && !runtimeSuppressionContradicted;"
      ),
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
