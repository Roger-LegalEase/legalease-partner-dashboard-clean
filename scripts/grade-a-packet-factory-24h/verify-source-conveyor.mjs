#!/usr/bin/env node
/**
 * Does the source conveyor refuse what it says it refuses?
 *
 *   node scripts/grade-a-packet-factory-24h/verify-source-conveyor.mjs
 *   node scripts/grade-a-packet-factory-24h/verify-source-conveyor.mjs --mutations
 *
 * Thirteen refusals, each with at least one mutation that breaks the condition
 * on purpose and requires the check to fail. A conveyor this large runs for a
 * day unattended, so a check nobody can falsify would be believed for the whole
 * day. Every mutated file is restored byte-for-byte and the restoration is
 * asserted, not assumed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const MUTATIONS = process.argv.includes("--mutations");

const DIR = "data/rcap-grade-a/packet-factory-24h";
const CONVEYOR = `${DIR}/SOURCE_CONVEYOR_ASSIGNMENTS.json`;
const MANIFEST = `${DIR}/SOURCE_ACQUISITION_MANIFEST.json`;
const CI_STATE = `${DIR}/CONTINUOUS_INTEGRATION_STATE.json`;
const MASTER = `${DIR}/MASTER_QUEUE.json`;
const ACTIVE = `${DIR}/ACTIVE_ASSIGNMENTS.json`;
const WASHINGTON = `${DIR}/WASHINGTON_REPAIR.json`;
const WORKFLOW = ".github/workflows/rcap-official-source-acquisition-batch.yml";
const PLANNER = "scripts/rcap-plan-source-acquisition-batch.mjs";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const results = [];
const check = (id, title, ok, observed = "") => { results.push({ id, title, ok, observed }); };

function run() {
  results.length = 0;
  const conveyor = read(CONVEYOR);
  const manifest = read(MANIFEST);
  const ci = read(CI_STATE);
  const master = read(MASTER);
  const active = read(ACTIVE);
  const wash = fs.existsSync(path.join(ROOT, WASHINGTON)) ? read(WASHINGTON) : { assignments: [] };
  const every = [...active.assignments, ...wash.assignments];
  const familyById = new Map(master.families.map((f) => [f.familyId, f]));
  const sourceLanes = every.filter((x) => x.itemKind === "sourceObligation");

  // C1. A source identity is not settled until it names an exact official URL.
  //     DISC may hold unsettled ones; the manifest may not.
  const identityWithoutUrl = manifest.entries.filter((e) => !e.officialUrl || !/^https:\/\//.test(String(e.officialUrl))).map((e) => e.sourceId);
  const discSaysSo = conveyor.lanes.filter((l) => l.assignmentId.startsWith("DISC"))
    .every((l) => l.refusals.some((r) => /without an exact official URL/i.test(r)));
  check("C1", "no source identity is treated as settled without an exact official URL",
    identityWithoutUrl.length === 0 && discSaysSo && manifest.counts.obligationsNeedingDiscoveryFirst >= 0,
    `${identityWithoutUrl.length} manifest entr(ies) with no HTTPS URL; every DISC lane states the refusal: ${discSaysSo}; ${manifest.counts.obligationsNeedingDiscoveryFirst} obligation(s) declared as discovery-first`);

  // C2. A URL is not an acquisition. Bytes are.
  const acquiredWithoutBytes = master.families.flatMap((f) => (f.sourceReadiness?.boundSources ?? [])
    .filter((b) => !b.path || !b.sha256).map((b) => `${f.familyId}::${b.sourceId ?? "?"}`));
  const acqRefusesComposedUrls = conveyor.lanes.filter((l) => l.assignmentId.startsWith("ACQ"))
    .every((l) => l.refusals.some((r) => /supplied by DISC/i.test(r)));
  check("C2", "no exact URL is treated as acquired without bytes",
    acquiredWithoutBytes.length === 0 && acqRefusesComposedUrls,
    `${acquiredWithoutBytes.length} bound source(s) with no held byte; every ACQ lane refuses a self-composed URL: ${acqRefusesComposedUrls}`);

  // C3. Bytes are not promoted without a SHA-256.
  const promotedWithoutSha = master.families.filter((f) => f.sourceStatus === "SOURCE_BOUND_BY_HELD_BYTES")
    .flatMap((f) => (f.sourceReadiness?.boundSources ?? []).filter((b) => !/^[0-9a-f]{64}$/.test(String(b.sha256 ?? ""))).map(() => f.familyId));
  const promoStatesTheRule = conveyor.lanes.filter((l) => l.assignmentId.startsWith("PROMO"))
    .every((l) => l.refusals.some((r) => /SHA-256/.test(r)) && l.mustRecord.some((m) => /SHA-256/.test(m)));
  check("C3", "no bytes are promoted without a SHA-256",
    promotedWithoutSha.length === 0 && promoStatesTheRule,
    `${promotedWithoutSha.length} promoted without a hash; every PROMO lane records and refuses on SHA-256: ${promoStatesTheRule}`);

  // C4. A SHA mismatch is a refusal, not a warning.
  const mismatched = master.families.flatMap((f) => (f.sourceReadiness?.boundSources ?? [])
    .filter((b) => b.sha256 && !/^[0-9a-f]{64}$/.test(String(b.sha256))).map((b) => `${f.familyId}::${b.sha256}`));
  const badManifestSha = manifest.entries.filter((e) => e.expectedSha256 != null && !/^[0-9a-f]{64}$/.test(String(e.expectedSha256))).map((e) => e.sourceId);
  const mismatchIsARefusal = conveyor.lanes.filter((l) => l.assignmentId.startsWith("PROMO"))
    .every((l) => l.refusals.some((r) => /mismatch is a refusal, never a warning/i.test(r)));
  check("C4", "a SHA mismatch is a refusal, never a warning",
    mismatched.length === 0 && badManifestSha.length === 0 && mismatchIsARefusal,
    `${mismatched.length} malformed bound hash(es), ${badManifestSha.length} malformed manifest hash(es); stated as a refusal: ${mismatchIsARefusal}`);

  // C5. An unofficial mirror is refused, and the allowlist has one authority.
  const badHost = manifest.entries.filter((e) => {
    try { const u = new URL(e.officialUrl); return u.protocol !== "https:" || !manifest.allowedHostSuffixes.some((s) => u.hostname === s.replace(/^\./, "") || u.hostname.endsWith(s)) || manifest.refusedHosts.includes(u.hostname); }
    catch { return true; }
  }).map((e) => e.sourceId);
  const plannerText = fs.readFileSync(path.join(ROOT, PLANNER), "utf8");
  const oneAllowlistAuthority = /ALLOWED_HOST_SUFFIXES = \\\[\(\[\\s\\S\]\*\?\)\\\]/.test(plannerText.replace(/\\/g, "\\\\")) || /rcap-acquire-official-source\.mjs/.test(plannerText);
  const plannerRestatesNoList = !/const ALLOWED = \[\s*"/.test(plannerText);
  check("C5", "an unofficial mirror is refused, and one allowlist governs planner and fetcher",
    badHost.length === 0 && oneAllowlistAuthority && plannerRestatesNoList && manifest.refused.length >= 0,
    `${badHost.length} manifest entr(ies) on a non-official host; planner reads the allowlist from the fetcher: ${oneAllowlistAuthority && plannerRestatesNoList}; ${manifest.refused.length} URL(s) refused at generation`);

  // C6. One obligation, one lane. One URL, one job. One source id, once.
  const obligationOwner = new Map();
  const duplicateObligations = [];
  for (const x of sourceLanes) {
    for (const it of x.items ?? []) {
      if (obligationOwner.has(it)) duplicateObligations.push(`${it} in ${obligationOwner.get(it)} and ${x.assignmentId}`);
      else obligationOwner.set(it, x.assignmentId);
    }
  }
  const urlCounts = new Map();
  const idCounts = new Map();
  for (const e of manifest.entries) {
    urlCounts.set(e.officialUrl, (urlCounts.get(e.officialUrl) ?? 0) + 1);
    idCounts.set(e.sourceId, (idCounts.get(e.sourceId) ?? 0) + 1);
  }
  const dupUrls = [...urlCounts].filter(([, n]) => n > 1).map(([u]) => u);
  const dupIds = [...idCounts].filter(([, n]) => n > 1).map(([i]) => i);
  check("C6", "no duplicate source assignment, URL or source id",
    duplicateObligations.length === 0 && dupUrls.length === 0 && dupIds.length === 0,
    `${duplicateObligations.length} duplicate obligation(s), ${dupUrls.length} duplicate URL(s), ${dupIds.length} duplicate source id(s)`);

  // C7. One family, one current owner.
  const ownerOf = new Map();
  const duplicateOwners = [];
  for (const x of every) {
    if (x.itemKind !== "packetFamily" && x.itemKind !== "streamingClaim") continue;
    for (const f of x.items ?? []) {
      const key = `${x.lane === "independent-verification" ? "verify" : "build"}::${f}`;
      if (ownerOf.has(key)) duplicateOwners.push(`${f} owned by ${ownerOf.get(key)} and ${x.assignmentId}`);
      else ownerOf.set(key, x.assignmentId);
    }
  }
  check("C7", "no family has two current owners of the same kind",
    duplicateOwners.length === 0 && /one current owner/i.test(String(ci.claimAndCollision.oneOwnerPerFamily)),
    `${duplicateOwners.length} duplicate owner(s): ${duplicateOwners.slice(0, 2).join(" | ")}`);

  // C8. One shared host, one writer.
  const hostWriters = new Map();
  for (const x of every) {
    for (const owned of x.ownedPaths ?? []) {
      const m = /(scripts\/build-census-v1-[^*\s]+\.mjs)/.exec(owned);
      if (!m) continue;
      const fam = familyById.get(path.basename(m[1]).replace(/^build-census-v1-|\.mjs$/g, ""));
      const shared = fam ? (fam.importedBy ?? []).length > 0 || fam.exclusiveScript === false : true;
      if (!shared) continue;
      hostWriters.set(m[1], [...new Set([...(hostWriters.get(m[1]) ?? []), x.assignmentId])]);
    }
  }
  const collisions = [...hostWriters.entries()].filter(([, ids]) => ids.length > 1).map(([h, ids]) => `${path.basename(h)}: ${ids.join(", ")}`);
  check("C8", "no shared build host has two writers",
    collisions.length === 0 && /one writer/i.test(String(ci.claimAndCollision.oneWriterPerSharedHost)),
    `${hostWriters.size} shared host(s) claimed, ${collisions.length} collision(s): ${collisions.slice(0, 2).join(" | ")}`);

  // C9. No executable family is left unassigned while an eligible lane exists.
  const heldByBuilders = new Set(every.filter((x) => ["packet-build", "rapid-repair", "packet-repair"].includes(x.lane))
    .flatMap((x) => (x.itemKind === "packetFamily" ? x.items : [])));
  const idle = master.families.filter((f) => f.state === "SOURCE_READY" && !f.activeOwner && !heldByBuilders.has(f.familyId)).map((f) => f.familyId);
  const idleRepairable = master.families.filter((f) => f.state === "REPAIR_REQUIRED" && !f.activeOwner && !heldByBuilders.has(f.familyId)).map((f) => f.familyId);
  check("C9", "no executable family is left unassigned",
    idle.length === 0 && idleRepairable.length === 0 && /No executable work may remain/i.test(String(ci.elasticCapacity.rule)),
    `${idle.length} source-ready idle [${idle.slice(0, 3).join(", ")}], ${idleRepairable.length} repairable idle`);

  // C10. A completed lane releases ownership on integration.
  const stillOwned = (master.activeOwnership?.lanes ?? []).filter((l) => l.status === "INTEGRATED" || l.status === "COMPLETED");
  check("C10", "no worker holds ownership after its return is integrated",
    stillOwned.length === 0 && /releases ownership immediately/i.test(String(ci.claimAndCollision.ownershipReleasedOnIntegration)),
    `${stillOwned.length} integrated lane(s) still holding ownership; the rule is stated: ${/releases ownership immediately/i.test(String(ci.claimAndCollision.ownershipReleasedOnIntegration))}`);

  // C11. A verifier is never its own builder or repairer.
  const builderOf = new Map();
  for (const x of every.filter((y) => ["packet-build", "rapid-repair", "packet-repair"].includes(y.lane))) {
    for (const f of (x.itemKind === "packetFamily" ? x.items : [])) builderOf.set(f, x.assignmentId);
  }
  const notIndependent = [];
  for (const v of every.filter((x) => x.lane === "independent-verification")) {
    if (!(v.mayNotBeRunBy ?? []).length) notIndependent.push(`${v.assignmentId} names nobody it may not be run by`);
    for (const f of v.items ?? []) {
      const b = builderOf.get(f);
      if (!b) continue;
      const excluded = (v.mayNotBeRunBy ?? []).join(" ");
      if (!excluded.includes(b) && !/any PF or FIX lane|built or last repaired/i.test(excluded)) notIndependent.push(`${v.assignmentId} verifies ${f} built by ${b}`);
    }
    for (const owned of v.ownedPaths ?? []) {
      if (/overlays\/census-v1|build-census-v1/.test(owned)) notIndependent.push(`${v.assignmentId} can write into what it verifies: ${owned}`);
    }
  }
  check("C11", "no verifier is assigned to its own builder or repairer",
    notIndependent.length === 0 && /neither built nor repaired/i.test(String(ci.claimAndCollision.verifierClaimRule)),
    `${notIndependent.length} problem(s): ${notIndependent.slice(0, 2).join(" | ")}`);

  // C12. Nothing here touches Production, and the batch workflow commits nothing.
  const wf = fs.readFileSync(path.join(ROOT, WORKFLOW), "utf8");
  const wfProblems = [];
  if (!/workflow_dispatch/.test(wf)) wfProblems.push("not workflow_dispatch");
  if (!/max-parallel:\s*20/.test(wf)) wfProblems.push("max-parallel is not 20");
  if (!/permissions:\s*\n\s*contents:\s*read/.test(wf)) wfProblems.push("permissions are not read-only");
  if (/git (commit|push)|peter-evans\/create-pull-request|EndBug\/add-and-commit/.test(wf)) wfProblems.push("the workflow commits");
  if (/vercel|supabase|deploy|environment:/i.test(wf.replace(/^#.*$/gm, ""))) wfProblems.push("the workflow deploys or names an environment");
  if (!/rcap-acquire-official-source\.mjs/.test(wf)) wfProblems.push("it does not invoke the existing acquisition machinery");
  if (!/upload-artifact/.test(wf)) wfProblems.push("it does not upload artifacts");
  if (!/continue-on-error:\s*true/.test(wf) || !/fail-fast:\s*false/.test(wf)) wfProblems.push("one failing form would stop the batch");
  check("C12", "the batch workflow dispatches, fans out, uploads, and commits and deploys nothing",
    wfProblems.length === 0 && conveyor.productionTouched === false && ci.productionTouched === false && manifest.bodiesCommitted === 0,
    `${wfProblems.length} workflow problem(s): ${wfProblems.join("; ")}`);

  // C13. Nothing here opens a commercial route.
  const opened = [conveyor.commercialRoutesOpened, ci.commercialRoutesOpened].filter((n) => n !== 0);
  const grantsNothingStated = typeof conveyor.grantsNothing === "string" && /opens no commercial route/i.test(conveyor.grantsNothing);
  check("C13", "no commercial route is opened",
    opened.length === 0 && grantsNothingStated,
    `${opened.length} document(s) reporting an opened route; the conveyor states it grants nothing: ${grantsNothingStated}`);

  // The shape the instruction asked for, so a rename cannot pass silently.
  check("C14", "sixteen source lanes: six DISC, four SRC, three ACQ, three PROMO",
    conveyor.totals.sourceLanes === 16 && conveyor.totals.disc === 6 && conveyor.totals.src === 4
    && conveyor.totals.acq === 3 && conveyor.totals.promo === 3
    && conveyor.lanes.every((l) => fs.existsSync(path.join(ROOT, l.promptFile))),
    `${conveyor.totals.sourceLanes} lanes: ${conveyor.totals.disc} DISC, ${conveyor.totals.src} SRC, ${conveyor.totals.acq} ACQ, ${conveyor.totals.promo} PROMO`);

  // And the thirty-two packet lanes are still there.
  const pf = active.assignments.filter((x) => x.lane === "packet-build").map((x) => x.assignmentId);
  const fix = active.assignments.filter((x) => x.lane === "rapid-repair").map((x) => x.assignmentId);
  const vf = active.assignments.filter((x) => x.lane === "independent-verification").map((x) => x.assignmentId);
  const expected = [
    ...Array.from({ length: 16 }, (_, i) => `PF${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 4 }, (_, i) => `FIX${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 8 }, (_, i) => `VF${String(i + 1).padStart(2, "0")}`),
    "SRC01", "SRC02", "SRC03", "SRC04"
  ];
  const have = new Set([...pf, ...fix, ...vf, ...conveyor.lanes.map((l) => l.assignmentId)]);
  const missing = expected.filter((id) => !have.has(id));
  check("C15", "the thirty-two current factory lanes are preserved",
    missing.length === 0,
    `${expected.length} expected, ${missing.length} missing: ${missing.slice(0, 5).join(", ")}`);

  return { results: [...results], failed: results.filter((r) => !r.ok) };
}

const first = run();
for (const r of first.results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(4)} ${r.title}${r.ok ? "" : `\n         observed: ${r.observed}`}`);
console.log(`\n${first.results.length - first.failed.length}/${first.results.length} conveyor checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const targets = {
    conveyor: path.join(ROOT, CONVEYOR), manifest: path.join(ROOT, MANIFEST),
    ci: path.join(ROOT, CI_STATE), master: path.join(ROOT, MASTER),
    active: path.join(ROOT, ACTIVE), workflow: path.join(ROOT, WORKFLOW),
    planner: path.join(ROOT, PLANNER)
  };
  const originals = Object.fromEntries(Object.entries(targets).map(([k, p]) => [k, fs.readFileSync(p)]));
  const firstEntry = (j) => j.entries[0];
  const lane = (j, prefix) => j.lanes.find((l) => l.assignmentId.startsWith(prefix));

  const cases = [
    { on: "manifest", id: "C1", name: "a manifest entry with no official URL is caught", mutate: (j) => { firstEntry(j).officialUrl = ""; return j; } },
    { on: "conveyor", id: "C1", name: "a DISC lane that drops the exact-URL refusal is caught", mutate: (j) => { lane(j, "DISC").refusals = ["settle what you can"]; return j; } },
    { on: "master", id: "C2", name: "a bound source with no held byte is caught", mutate: (j) => { const f = j.families.find((x) => (x.sourceReadiness?.boundSources ?? []).length); f.sourceReadiness.boundSources[0].path = ""; return j; } },
    { on: "conveyor", id: "C2", name: "an ACQ lane that accepts a self-composed URL is caught", mutate: (j) => { lane(j, "ACQ").refusals = ["fetch what you are given"]; return j; } },
    { on: "master", id: "C3", name: "bytes promoted with no SHA-256 are caught", mutate: (j) => { const f = j.families.find((x) => x.sourceStatus === "SOURCE_BOUND_BY_HELD_BYTES"); f.sourceReadiness.boundSources[0].sha256 = ""; return j; } },
    { on: "conveyor", id: "C3", name: "a PROMO lane that stops recording SHA-256 is caught", mutate: (j) => { lane(j, "PROMO").mustRecord = ["custody record"]; return j; } },
    { on: "manifest", id: "C4", name: "a malformed expected hash is caught", mutate: (j) => { firstEntry(j).expectedSha256 = "not-a-hash"; return j; } },
    { on: "conveyor", id: "C4", name: "a mismatch downgraded to a warning is caught", mutate: (j) => { const l = lane(j, "PROMO"); l.refusals = l.refusals.map((r) => r.replace(/mismatch is a refusal, never a warning/i, "mismatch is logged as a warning")); return j; } },
    { on: "manifest", id: "C5", name: "an unofficial mirror in the manifest is caught", mutate: (j) => { firstEntry(j).officialUrl = "https://www.uslegalforms.com/expungement.pdf"; return j; } },
    { on: "planner", id: "C5", name: "a planner that restates its own allowlist is caught", mutateText: (t) => t.replace(
      'const ALLOWED = [...allowBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);',
      'const ALLOWED = [\n  ".gov",\n  ".us"\n];') },
    { on: "active", id: "C6", name: "one obligation dispatched to two lanes is caught", mutate: (j) => { const s = j.assignments.filter((x) => x.itemKind === "sourceObligation" && x.items.length); s[1].items.push(s[0].items[0]); return j; } },
    { on: "manifest", id: "C6", name: "a duplicate URL in the manifest is caught", mutate: (j) => { j.entries.push({ ...j.entries[0], sourceId: `${j.entries[0].sourceId}-again` }); return j; } },
    { on: "manifest", id: "C6", name: "a duplicate source id in the manifest is caught", mutate: (j) => { j.entries.push({ ...j.entries[0], officialUrl: `${j.entries[0].officialUrl}?v=2` }); return j; } },
    { on: "active", id: "C7", name: "one family owned by two builders is caught", mutate: (j) => { const b = j.assignments.filter((x) => x.lane === "packet-build" && x.items.length); b[1].items.push(b[0].items[0]); return j; } },
    /* The host must be one the master queue actually calls shared, or the
     * mutation writes a second writer onto an exclusive script and proves
     * nothing about the collision rule. */
    { on: "active", id: "C8", name: "a shared host claimed by two lanes is caught", mutate: (j) => {
      const fams = new Map(read(MASTER).families.map((f) => [f.familyId, f]));
      const isShared = (p) => { const f = fams.get(path.basename(p).replace(/^build-census-v1-|\.mjs$/g, "")); return f && ((f.importedBy ?? []).length > 0 || f.exclusiveScript === false); };
      const b = j.assignments.filter((x) => x.lane === "packet-build");
      /* No builder currently claims a shared host -- that is the dispatch
       * being correct, not the mutation being unnecessary. So the condition
       * is constructed rather than found: a real shared host from the master
       * queue, handed to two builders. A negative test whose subject cannot
       * exist proves nothing. */
      const shared = [...fams.values()].find((f) => (f.importedBy ?? []).length > 0 && f.buildScript);
      if (!shared) throw new Error("the master queue names no shared build host at all");
      b[0].ownedPaths.push(shared.buildScript);
      b[1].ownedPaths.push(shared.buildScript);
      return j; } },
    { on: "active", id: "C9", name: "an executable family dropped from every builder is caught", mutate: (j) => { const b = j.assignments.find((x) => x.lane === "packet-build" && x.items.length); b.items.pop(); return j; } },
    { on: "ci", id: "C9", name: "dropping the no-idle-work rule is caught", mutate: (j) => { j.elasticCapacity.rule = "lanes fill up over time"; return j; } },
    { on: "master", id: "C10", name: "a worker still holding ownership after integration is caught", mutate: (j) => { j.activeOwnership.lanes.push({ lane: "PF01", status: "INTEGRATED" }); return j; } },
    { on: "active", id: "C11", name: "a verifier that may write into what it verifies is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").ownedPaths.push("data/rcap-all50/overlays/census-v1/**"); return j; } },
    { on: "active", id: "C11", name: "a verifier that excludes nobody is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").mayNotBeRunBy = []; return j; } },
    { on: "workflow", id: "C12", name: "a batch workflow that commits is caught", mutateText: (t) => `${t}\n      - name: Commit the sources\n        run: git commit -am "sources"\n` },
    { on: "workflow", id: "C12", name: "a batch workflow that stops on the first failing form is caught", mutateText: (t) => t.replace("fail-fast: false", "fail-fast: true") },
    { on: "workflow", id: "C12", name: "raising the workflow permissions is caught", mutateText: (t) => t.replace("permissions:\n  contents: read", "permissions:\n  contents: write") },
    { on: "ci", id: "C13", name: "a document reporting an opened commercial route is caught", mutate: (j) => { j.commercialRoutesOpened = 1; return j; } },
    { on: "conveyor", id: "C14", name: "a fifth SRC lane is caught", mutate: (j) => { j.totals.src = 5; return j; } },
    { on: "active", id: "C15", name: "a retired PF lane is caught", mutate: (j) => { j.assignments = j.assignments.filter((x) => x.assignmentId !== "PF16"); return j; } },
    /* Positive control. A refusal that fires on an untouched dispatch would
     * make every mutation above meaningless, so one case changes something
     * real and irrelevant and requires the checks to still pass. */
    { on: "conveyor", id: "CONTROL", name: "an irrelevant edit still passes (the checks are not simply always failing)", control: true, mutate: (j) => { j.question = "What actually stands between a few buildable families and all of them?"; return j; } }
  ];

  let allCaught = true;
  for (const c of cases) {
    const target = targets[c.on];
    if (c.mutateText) fs.writeFileSync(target, c.mutateText(originals[c.on].toString("utf8")));
    else fs.writeFileSync(target, `${JSON.stringify(c.mutate(JSON.parse(originals[c.on].toString("utf8"))), null, 2)}\n`);
    let after;
    try { after = run(); } catch { after = { failed: [{ id: c.id }] }; }
    fs.writeFileSync(target, originals[c.on]);
    if (c.control) {
      const ok = after.failed.length === 0;
      if (!ok) allCaught = false;
      console.log(`  ${ok ? "passed  " : "REFUSED "} [control] ${c.name}`);
      continue;
    }
    const caught = after.failed.some((r) => r.id === c.id);
    if (!caught) allCaught = false;
    console.log(`  ${caught ? "detected" : "MISSED  "} [${c.id}] ${c.name}`);
  }

  const restored = Object.entries(targets).every(([k, p]) => fs.readFileSync(p).equals(originals[k]));
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!allCaught || !restored) { console.error("\nFAIL conveyor mutations"); process.exit(1); }
  console.log(`\nOK conveyor mutations — ${cases.length} case(s), every mutation caught.`);
}

if (first.failed.length) { console.error(`\n${first.failed.length} conveyor check(s) FAILED.`); process.exit(1); }
