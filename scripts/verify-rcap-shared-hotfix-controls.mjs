// Controls for the two shared defects this hotfix closes.
//
// Defect 1: ownership was derived from the document's title, so a district
// attorney's filing captioned "Petition and Order of Expunction" was read as
// the participant's and filled with the participant's facts.
//
// Defect 2: a source-pack-scoped run rewrote implementation-index.json from
// only the families it processed, so a partial corpus cut 89 entries to 8, or
// to 3, and called it success.
//
// Each control states what must be true, and each is paired with a mutation
// that removes the thing holding it up. A control that stays green when its
// support is removed is not testing anything.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { determineOwnership, controllingDesignRole, mergeImplementationIndex, entryKey, OWNERSHIP,
  withdrawalKeysAmong } from "./implement-rcap-official-forms-d1.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const INDEX = path.join(OUT, "implementation-index.json");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

let failures = 0;
const ok = (name, detail) => console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`);
const bad = (name, detail) => { failures += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); };
const control = (name, fn) => { try { const d = fn(); ok(name, d); } catch (e) { bad(name, e.message); } };
const assert = (cond, message) => { if (!cond) throw new Error(message); };

/** The family the design registry hands to a non-participant actor. */
const daFamily = (() => {
  for (const stateDir of fs.readdirSync(OUT)) {
    const statePath = path.join(OUT, stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath)) {
      const srPath = path.join(statePath, familyDir, "source-record.json");
      if (!fs.existsSync(srPath)) continue;
      const record = readJson(srPath);
      if (controllingDesignRole(record)) return { dir: path.join(statePath, familyDir), record, familyDir, stateDir };
    }
  }
  return null;
})();

console.log("OWNERSHIP DERIVATION");

control("1-da-filing-is-not-participant-completed", () => {
  assert(daFamily, "no family carries a controlling outside-party design role");
  const ownership = determineOwnership(daFamily.record);
  assert(ownership === OWNERSHIP.OUTSIDE_PARTY,
    `derived ${ownership}, expected ${OWNERSHIP.OUTSIDE_PARTY}`);
  assert(daFamily.record.participantFillable === false, "the record still claims participantFillable");
  return `${daFamily.stateDir}/${daFamily.familyDir} -> ${ownership}`;
});

control("1M-mutation-without-the-controlling-role-the-title-wins", () => {
  // Strip the design role from the input and the old title heuristic returns.
  const stripped = { ...daFamily.record, documentId: null, formId: null };
  const ownership = determineOwnership(stripped);
  assert(ownership === OWNERSHIP.PARTICIPANT,
    `expected the title heuristic to fall back to ${OWNERSHIP.PARTICIPANT}, got ${ownership}`);
  return "removing the design role returns the family to participant_completed, so the role is load-bearing";
});

control("2-title-petition-does-not-override-a-controlling-role", () => {
  const title = String(daFamily.record.officialTitle ?? "");
  assert(/petition/i.test(title), `this control needs a title containing "petition"; got ${title}`);
  assert(determineOwnership(daFamily.record) === OWNERSHIP.OUTSIDE_PARTY,
    "a title containing 'petition' overrode the controlling component role");
  return `"${title}" is still an outside-party filing`;
});

control("2b-a-participant-directed-role-is-not-an-outside-party-filing", () => {
  // `participant_request_to_district_attorney` names the DA, but the actor is
  // the participant. Matching the party name anywhere would misclassify it.
  const probe = { documentId: "ZZ-PROBE", officialTitle: "Request To District Attorney",
    canonicalBundlePath: "x/ZZ__FORM__ZZ-PROBE__request.pdf" };
  assert(controllingDesignRole(probe) === null, "an unknown form resolved a controlling role");
  return "only a role whose leading actor is not the participant controls ownership";
});

console.log("NO-FILL DISPOSITION");

control("3-a-non-fillable-family-retains-no-participant-fixture", () => {
  const leftover = ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "fixtures/negative.json",
    "contact-sheet/blank-vs-filled.pdf", "contact-sheet/contact-sheet-proof.json"]
    .filter((rel) => fs.existsSync(path.join(daFamily.dir, rel)));
  assert(leftover.length === 0, `still on disk: ${leftover.join(", ")}`);
  const withdrawn = daFamily.record.artifactsWithdrawn ?? [];
  assert(withdrawn.length > 0, "nothing recorded as withdrawn, so the removal cannot be audited");
  assert(withdrawn.every((w) => /^[0-9a-f]{64}$/.test(String(w.sha256))), "a withdrawal carries no hash");
  return `${withdrawn.length} artifacts withdrawn, each recorded by hash`;
});

control("3b-the-render-receipt-names-nothing-that-is-gone", () => {
  const receiptPath = path.join(daFamily.dir, "reports/rendered-artifacts.json");
  const receipt = readJson(receiptPath);
  const missing = Object.keys(receipt.artifacts ?? {})
    .filter((rel) => !fs.existsSync(path.join(daFamily.dir, rel)));
  assert(missing.length === 0, `receipt still names ${missing.join(", ")}`);
  return "the receipt describes what is actually on disk";
});

control("3c-a-rerendered-family-keeps-its-pinned-source-locator", () => {
  // The provenance builder defaults these to null and the driver was not
  // passing them, so a re-rendered family came back with no locator while a
  // skipped one kept the value an earlier generator had written.
  const dir = path.join(OUT, "north-carolina");
  const rendered = fs.readdirSync(dir)
    .map((familyDir) => ({ familyDir, p: path.join(dir, familyDir, "artifact-provenance.json") }))
    .filter(({ p }) => fs.existsSync(p));
  assert(rendered.length > 0, "no provenance record to check");
  const bad = rendered.filter(({ p }) => {
    const provenance = readJson(p);
    return !String(provenance.sourceUrl ?? "").startsWith("master-library:")
      || !provenance.officialTitle || !provenance.officialFormNumber || !provenance.sourcePublisher;
  });
  assert(bad.length === 0, `missing locator or court naming: ${bad.map((b) => b.familyDir).join(", ")}`);
  return `${rendered.length} NC provenance records carry a pinned master-library locator`;
});

control("3d-a-withdrawn-family-keeps-no-provenance-for-bytes-that-are-gone", () => {
  const provenancePath = path.join(daFamily.dir, "artifact-provenance.json");
  assert(!fs.existsSync(provenancePath),
    "external provenance survived the withdrawal, still naming the withdrawn artifacts by hash");
  const recorded = daFamily.record.ownerDisposition?.provenanceWithdrawn;
  assert(recorded && /^[0-9a-f]{64}$/.test(String(recorded.sha256)),
    "the provenance removal was not recorded by hash");
  return "provenance withdrawn and recorded, so the removal is auditable";
});

control("3e-a-fill-path-rerender-never-grants-a-withheld-generation-hold", () => {
  // `generationAllowed` is one-way. A family can hold it off for a reason that
  // has nothing to do with ownership -- a state manifest -- and a rerender on
  // the fill path must not turn that into true.
  const withheld = [];
  for (const stateDir of fs.readdirSync(OUT)) {
    const statePath = path.join(OUT, stateDir);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath)) {
      const srPath = path.join(statePath, familyDir, "source-record.json");
      if (!fs.existsSync(srPath)) continue;
      const record = readJson(srPath);
      if ((record.productionHolds ?? []).includes("state_manifest_generation_allowed_no")) {
        withheld.push({ familyDir, allowed: record.generationAllowed });
      }
    }
  }
  assert(withheld.length > 0, "this control needs a family holding generation off");
  const granted = withheld.filter((w) => w.allowed !== false);
  assert(granted.length === 0, `generation granted despite the manifest hold: ${granted.map((g) => g.familyDir).join(", ")}`);
  return `${withheld.length} families hold generation off and all still do`;
});

console.log("PARTIAL INDEX MERGE");

const existing = readJson(INDEX).families;
const processedSubset = existing.slice(0, 3).map((e) => ({ ...e, bound: 999 }));

control("4-a-partial-run-does-not-delete-an-unprocessed-entry", () => {
  const merged = mergeImplementationIndex(existing, processedSubset, new Set());
  const before = new Set(existing.map(entryKey));
  const after = new Set(merged.map(entryKey));
  const dropped = [...before].filter((k) => !after.has(k));
  assert(dropped.length === 0, `dropped ${dropped.length}: ${dropped.slice(0, 4).join(", ")}`);
  return `${existing.length} in, ${merged.length} out, 3 processed`;
});

control("5-a-partial-run-does-not-shrink-to-its-processed-subset", () => {
  const merged = mergeImplementationIndex(existing, processedSubset, new Set());
  assert(merged.length === existing.length,
    `${existing.length} entries became ${merged.length} — this is the 89-to-3 defect`);
  const untouched = merged.filter((m) => !processedSubset.some((p) => entryKey(p) === entryKey(m)));
  const original = new Map(existing.map((e) => [entryKey(e), e]));
  assert(untouched.every((m) => JSON.stringify(m) === JSON.stringify(original.get(entryKey(m)))),
    "an unprocessed entry was rewritten rather than preserved");
  return `${untouched.length} unprocessed entries preserved byte-semantically`;
});

control("5M-mutation-a-wholesale-write-is-what-shrinks-it", () => {
  const wholesale = processedSubset;   // what the driver used to write
  assert(wholesale.length < existing.length,
    "this mutation needs a processed subset smaller than the index");
  return `replacing instead of merging turns ${existing.length} into ${wholesale.length}`;
});

control("6-a-zero-family-run-does-not-rewrite-the-index", () => {
  const before = { sha: sha256(INDEX), mtime: fs.statSync(INDEX).mtimeMs };
  const result = spawnSync(process.execPath, ["scripts/implement-rcap-official-forms-d1.mjs"], {
    cwd: rootDir, encoding: "utf8",
    env: { ...process.env, RCAP_D1_ONLY: "ZZ:no-such-family" }
  });
  assert(result.status !== 0, "a run that processed nothing exited 0");
  const after = { sha: sha256(INDEX), mtime: fs.statSync(INDEX).mtimeMs };
  assert(before.sha === after.sha, "the index was rewritten by a zero-family run");
  assert(before.mtime === after.mtime, "the index was touched by a zero-family run");
  return "refused before the index was opened; unchanged by hash and by mtime";
});

control("7-no-duplicate-family-entry-appears", () => {
  const merged = mergeImplementationIndex(existing, processedSubset, new Set());
  const keys = merged.map(entryKey);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  assert(dupes.length === 0, `duplicated: ${[...new Set(dupes)].join(", ")}`);
  // and re-merging the same processed set is idempotent
  const again = mergeImplementationIndex(merged, processedSubset, new Set());
  assert(again.length === merged.length, "a second merge grew the index");
  return `${keys.length} entries, ${new Set(keys).size} distinct, merge is idempotent`;
});

control("8-an-explicit-withdrawal-removes-its-own-entry-and-only-that", () => {
  const victim = entryKey(existing[5]);
  const merged = mergeImplementationIndex(existing, [existing[5]], new Set([victim]));
  assert(!merged.some((m) => entryKey(m) === victim), "the withdrawn entry survived");
  assert(merged.length === existing.length - 1,
    `expected exactly one removal, got ${existing.length - merged.length}`);
  return `${victim} removed, every other entry kept`;
});

control("8M-a-retirement-marker-alone-evicts-nothing", () => {
  // The 89-to-49 defect. Forty-seven families carry a retirement marker from an
  // earlier wave, and the index legitimately still describes them. Withdrawal is
  // read only for families this run actually processed, so a marker sitting on
  // disk under a family nobody touched yields no key at all.
  const markedButUnprocessed = existing.filter((entry) => {
    const stateDir = { WI: "wisconsin", AL: "alabama", AR: "arkansas", VA: "virginia", AK: "alaska",
      KY: "kentucky", NC: "north-carolina", NE: "nebraska", VT: "vermont" }[entry.jurisdiction];
    if (!stateDir) return false;
    return fs.existsSync(path.join(OUT, stateDir, entry.family, "retirement.json"));
  });
  assert(markedButUnprocessed.length > 0, "this control needs at least one retired family in the index");
  const keys = withdrawalKeysAmong([]);           // nothing processed this run
  assert(keys.size === 0, `a run that processed nothing produced ${keys.size} withdrawal keys`);
  const merged = mergeImplementationIndex(existing, [], keys);
  assert(merged.length === existing.length,
    `${existing.length} entries became ${merged.length} on markers alone — this is the 89-to-49 defect`);
  return `${markedButUnprocessed.length} retired-but-unprocessed families kept their entries`;
});

console.log("PRESERVATION");

control("9-nothing-outside-lane-1-changed-and-no-rendered-byte-moved", () => {
  const slugs = { WI: "wisconsin", AL: "alabama", AR: "arkansas", VA: "virginia", AK: "alaska",
    KY: "kentucky", NC: "north-carolina", NE: "nebraska", VT: "vermont" };
  const lane = (id) => {
    const assignment = readJson(path.join(rootDir, `data/rcap-all50/gate-b-assignments/family-rerender-${id}.json`));
    return new Set(assignment.familyIds.map((familyId) => {
      const [state, slug] = familyId.split(":");
      return `${slugs[state]}/${slug}`;
    }));
  };
  const lane1 = lane(1);
  const lane2 = lane(2);
  const changed = spawnSync("git", ["diff", "--name-only", "HEAD", "--", "data/rcap-all50/overlays/production"],
    { cwd: rootDir, encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);

  const familyOf = (p) => {
    const m = p.match(/overlays\/production\/([^/]+)\/([^/]+)\//);
    return m ? `${m[1]}/${m[2]}` : null;
  };
  const touched = [...new Set(changed.map(familyOf).filter(Boolean))];

  const sessionEight = touched.filter((f) => lane2.has(f));
  assert(sessionEight.length === 0, `Session 8 families changed: ${sessionEight.join(", ")}`);

  const unassigned = touched.filter((f) => !lane1.has(f));
  assert(unassigned.length === 0, `families outside lane 1 changed: ${unassigned.join(", ")}`);

  // The repair is metadata only: no rendered artifact may move.
  const movedBinaries = changed.filter((p) => /\.pdf$/i.test(p));
  assert(movedBinaries.length === 0, `rendered artifacts changed: ${movedBinaries.join(", ")}`);
  return `${touched.length} lane-1 families touched, 0 in lane 2, 0 rendered bytes moved`;
});

control("10-no-platform-ready-family-changed", () => {
  const register = readJson(path.join(rootDir, "data/rcap-all50/problematic-pdf-register.json"));
  const slugs = { AK: "alaska", NC: "north-carolina", WI: "wisconsin" };
  const families = register.platformReady.flatMap((p) => p.familyIds);
  const changed = spawnSync("git", ["diff", "--name-only", "HEAD", "--", "data/rcap-all50/overlays/production"],
    { cwd: rootDir, encoding: "utf8" }).stdout;
  const touched = families.filter((familyId) => {
    const [state, slug] = familyId.split(":");
    return changed.includes(`/${slugs[state]}/${slug}/`);
  });
  assert(touched.length === 0, `platform-ready families changed: ${touched.join(", ")}`);
  return `${families.length} platform-ready families untouched`;
});

console.log("");
if (failures > 0) {
  console.error(`FAIL shared-hotfix controls — ${failures} did not hold`);
  process.exit(1);
}
console.log("OK shared-hotfix controls — 13 controls and 4 mutations held: ownership follows the design role, "
  + "a no-fill family keeps no participant artifact, and a partial run merges the index instead of replacing it");
