// Generates the canonical completion ledger from live repository state.
//
// The ledger is derived, never hand-maintained: every track comes from a
// compiled jurisdiction profile, and its experience level comes from the same
// resolvePacketRoute the serving path uses. If the resolver changes, the ledger
// changes with it, so the board cannot drift away from what participants
// actually get.
//
// Experience levels:
//   1  certified packet route (generates, stores, downloads, reopens)
//   2  built guidance / composed / exclusion / deferral route with its complete
//      designed participant treatment
//   3  truthful interim result, honest next steps, clean referral path
//
// A track is only recorded at level 2 when there is machine-checkable evidence
// of its participant treatment. Per-track guidance evidence does not exist in
// the repository yet, so guidance routes are recorded at level 3 with
// guidanceEvidence null rather than assumed complete.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import fs from "node:fs";
import path from "node:path";

const LEDGER_VERSION = 1;
const OUTPUT = "data/rcap-all50/completion-ledger.json";
const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";

const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");

const generatedAt = process.env.LEDGER_GENERATED_AT ?? new Date().toISOString();
const tracks = [];

for (const file of fs.readdirSync(PROFILE_DIR).filter((name) => name.endsWith(".json")).sort()) {
  const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, file), "utf8"));
  const code = String(profile.jurisdiction?.code ?? file.slice(0, 2)).toUpperCase();

  for (const pathway of profile.pathways ?? []) {
    const route = resolvePacketRoute({ state: code, pathway: pathway.id });
    const experienceLevel = route.routeKind === "legacy_verified" || route.routeKind === "factory_v2"
      ? 1
      : route.routeKind === "typed_stop"
        ? 2
        : 3;

    tracks.push({
      trackId: `${code}:${pathway.id}`,
      jurisdiction: code,
      jurisdictionName: profile.jurisdiction?.name ?? code,
      pathwayId: pathway.id,
      pathwayLabel: pathway.label ?? pathway.id,
      routeType: pathway.routeType ?? null,
      profileVersion: profile.profileVersion ?? null,
      routeKind: route.routeKind,
      rendererKind: route.rendererKind,
      canRender: packetRouteCanRender(route),
      sellable: route.sellable,
      creditConsumable: route.creditConsumable,
      experienceLevel,
      // Terminal means the track has reached one of the Milestone 2 endings.
      // A level 3 track is by definition not terminal.
      terminal: experienceLevel !== 3,
      guidanceEvidence: null,
      packetProof: null,
      resolverReason: route.reason
    });
  }
}

const byLevel = { 1: 0, 2: 0, 3: 0 };
const byRouteKind = {};
const byJurisdiction = {};
for (const track of tracks) {
  byLevel[track.experienceLevel] += 1;
  byRouteKind[track.routeKind] = (byRouteKind[track.routeKind] ?? 0) + 1;
  const bucket = (byJurisdiction[track.jurisdiction] ??= { tracks: 0, level1: 0, level2: 0, level3: 0 });
  bucket.tracks += 1;
  bucket[`level${track.experienceLevel}`] += 1;
}

const ledger = {
  ledgerVersion: LEDGER_VERSION,
  generatedAt,
  source: {
    profileDirectory: PROFILE_DIR,
    resolver: "src/lib/rcap/documents/packet-route-resolver.ts",
    derivation: "one track per compiled profile pathway, classified by resolvePacketRoute"
  },
  totals: {
    jurisdictions: Object.keys(byJurisdiction).length,
    tracks: tracks.length,
    tracksTerminal: tracks.filter((track) => track.terminal).length,
    level1: byLevel[1],
    level2: byLevel[2],
    level3TracksRemaining: byLevel[3],
    sellableTracks: tracks.filter((track) => track.sellable).length,
    creditConsumableTracks: tracks.filter((track) => track.creditConsumable).length,
    byRouteKind
  },
  // The executive directive records 497 tracks. The compiled profiles in this
  // repository yield the count below. The difference is recorded here rather
  // than reconciled silently; closing it is a captain-level task.
  declaredTrackCount: 497,
  declaredTrackCountReconciled: tracks.length === 497,
  byJurisdiction,
  tracks
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(ledger, null, 2)}\n`);

console.log(`completion ledger v${LEDGER_VERSION} written to ${OUTPUT}`);
console.log(`  jurisdictions ${ledger.totals.jurisdictions}`);
console.log(`  tracks ${ledger.totals.tracks} (declared ${ledger.declaredTrackCount}, reconciled ${ledger.declaredTrackCountReconciled})`);
console.log(`  terminal ${ledger.totals.tracksTerminal} / ${ledger.totals.tracks}`);
console.log(`  level1 ${ledger.totals.level1}  level2 ${ledger.totals.level2}  level3 remaining ${ledger.totals.level3TracksRemaining}`);
console.log(`  sellable ${ledger.totals.sellableTracks}  creditConsumable ${ledger.totals.creditConsumableTracks}`);
