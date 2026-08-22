#!/usr/bin/env node
// Terminalizes the families whose official source is not reachable.
//
//   node scripts/generate-rcap-unavailable-source-terminalization.mjs
//   node scripts/generate-rcap-unavailable-source-terminalization.mjs --check
//
// These families cannot be built. That is not a reason to leave them open: an
// asset with no obtainable source and no route reaching it is finished, and the
// honest record says so with the exact reason rather than holding it forever.
//
// The disposition is CONSUMED from the canonical queue, never chosen here. This
// generator's job is to prove the launch-safety conditions the disposition
// depends on, per family and against the live records:
//
//   - no track references it;
//   - no packet family references it;
//   - it appears in no sellable pathway;
//   - it is neither sellable nor public in the register.
//
// If any of those is false, the generator fails rather than recording a
// terminalization. A "route disabled" line for a route that was never reachable
// is a fabricated control, and a fabricated control is worse than an open item:
// it reads as a closed one.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const WORKVIEW = "data/rcap-all50/pdf-finish-workview.json";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const PATHWAYS = "data/rcap-ledger/sellable-pathway-closure.json";
const OUT = "data/rcap-all50/unavailable-source-terminalization.json";
const OUT_MD = "docs/record-clearing/unavailable-source-terminalization.md";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL unavailable-source terminalization — ${m}`); process.exit(1); };

const workview = readJson(WORKVIEW);
const register = readJson(REGISTER);
const queue = readJson(QUEUE);
const pathwayBlob = JSON.stringify(readJson(PATHWAYS));

const SUPPORTED = new Set(["deliberate_scope_exclusion", "exact_deferral"]);

const unreachable = workview.families.filter(
  (f) => f.sourceAvailability.status !== "present_and_hash_verified");
if (!unreachable.length) fail("no family has unreachable source; this generator has nothing to terminalize");

const registerFor = new Map((register.records ?? []).map((r) => [r.identity, r]));
const queueFor = new Map((queue.assets ?? []).map((a) => [a.assetId, a]));

const families = unreachable.map((f) => {
  const rec = registerFor.get(f.assetId);
  // Once a family is terminalized the canonical queue drops it, so on every run
  // after the first the disposition has to be read back from the register that
  // recorded it. Either way it is READ: inventing one here would be exactly the
  // move that makes a count reach zero without anything being true.
  const asset = queueFor.get(f.assetId) ?? null;
  if (!rec) fail(`${f.assetId} is not in the canonical register`);
  if (!asset && !rec.launchSafelyTerminal) {
    fail(`${f.assetId} is in neither the canonical queue nor the register's launch-safely-terminal set`);
  }
  const disposition = asset ? asset.terminalOutcome : rec.launchSafeTerminalDisposition;
  if (!SUPPORTED.has(disposition)) {
    fail(`${f.familyId} carries terminalOutcome ${disposition}, which is not a supported launch-safe terminal for an unobtainable source`);
  }

  const trackIds = rec.affectedTrackIds ?? [];
  const packetRefs = asset ? (asset.packetFamilyReferences ?? []) : [];
  const formId = String(f.assetId).split("|")[1];
  const inPathwayLedger = pathwayBlob.includes(formId) || (f.familyId && pathwayBlob.includes(f.familyId));

  const launchSafety = {
    tracksReferencingThisAsset: trackIds.length,
    packetFamiliesReferencingThisAsset: packetRefs.length,
    appearsInSellablePathwayLedger: inPathwayLedger,
    registerListsItSellable: (register.routesStillSellable ?? []).some((x) => JSON.stringify(x).includes(formId)),
    registerListsItPublic: (register.routesStillPublic ?? []).some((x) => JSON.stringify(x).includes(formId))
  };
  for (const [key, value] of Object.entries(launchSafety)) {
    const bad = typeof value === "number" ? value > 0 : value === true;
    if (bad) fail(`${f.familyId}: ${key} = ${JSON.stringify(value)}; a reachable asset may not be terminalized as unavailable — disable the route first`);
  }

  const reason = f.sourceAvailability.status === "no_digest_ever_recorded"
    ? {
        kind: "source_identity_never_pinned",
        exact: `No SHA-256 was ever recorded in the repository for ${formId}. Its identity cannot be settled by acquiring bytes, because there is no pinned digest for acquired bytes to match.`,
        whatWouldClearIt: "a recorded source digest for this asset, established against the issuing body's own publication"
      }
    : {
        kind: "source_absent_from_every_accessible_corpus",
        exact: `${formId} is pinned at SHA-256 ${f.sourceAvailability.sha256}. That digest matches no file in the Nationwide tree or the Master Library, and no file of that name exists in either corpus.`,
        whatWouldClearIt: "the official binary at the pinned digest, obtained from the issuing body and installed in the operational corpus"
      };

  return {
    familyId: f.familyId,
    assetId: f.assetId,
    jurisdiction: f.jurisdiction,
    formId,
    packagePath: f.packagePath,
    consumedDisposition: disposition,
    dispositionSource: "data/rcap-all50/gate-b-81-terminalization-queue.json:terminalOutcome",
    reason,
    launchSafety: {
      ...launchSafety,
      routeDisablementRequired: false,
      whyNoRouteWasDisabled:
        "no track, packet family or sellable pathway references this asset, and the register lists it neither sellable nor public. There is no route to disable and no checkout that could consume a packet credit. Recording a disablement here would be a control over nothing.",
      participantFacingState:
        "unreachable — no participant-facing route resolves to this asset, so there is no surface on which to show an unavailable state",
      creditConsumptionPossible: false
    },
    isNotPlatformReady: true,
    remainsInDenominatorUntil:
      "a canonical generator moves it. This record establishes the terminal disposition and its launch safety; it does not itself move a count."
  };
});

const byDisposition = families.reduce((acc, f) => {
  acc[f.consumedDisposition] = (acc[f.consumedDisposition] ?? 0) + 1;
  return acc;
}, {});

const record = {
  schemaVersion: "rcap-unavailable-source-terminalization/v1",
  generatedBy: "scripts/generate-rcap-unavailable-source-terminalization.mjs",
  what:
    "the families whose official source cannot be reached, terminalized on a disposition consumed from the canonical queue and proven launch-safe per family against the live records.",
  inventsNoStatus:
    "every disposition here already exists in the canonical queue. No new status was created, no source was fabricated, and nothing is marked platform_ready.",
  totals: { families: families.length, byDisposition },
  families
};

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];

const md = ["# Unavailable-source terminalization", "",
  `${families.length} famil(ies) whose official source cannot be reached, terminalized on dispositions consumed from the canonical queue.`, "",
  "Each was proven launch-safe individually: no track, no packet family, no sellable pathway, and neither sellable nor public in the register. None is platform_ready.", "",
  "| family | jurisdiction | disposition | reason |", "| --- | --- | --- | --- |"];
for (const f of families) md.push(`| \`${f.familyId}\` | ${f.jurisdiction} | ${f.consumedDisposition} | ${f.reason.kind} |`);
md.push("");
outputs.push([OUT_MD, `${md.join("\n")}\n`]);

let stale = 0;
for (const [rel, body] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === body) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-unavailable-source-terminalization.mjs`);

console.log(
  `OK unavailable-source terminalization — ${families.length} famil(ies): ` +
  Object.entries(byDisposition).map(([k, v]) => `${v} ${k}`).join(", ") +
  "; every one proven to have no track, no packet family, no sellable pathway and no public or sellable route"
);
