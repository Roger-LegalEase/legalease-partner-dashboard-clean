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
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hostAllowed } from "../lib/official-host-policy.mjs";

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
const PROMPTS_DIR = "docs/rcap/grade-a/packet-factory-24h";
const PLANNER = "scripts/rcap-plan-source-acquisition-batch.mjs";
const HOST_POLICY = "scripts/lib/official-host-policy.mjs";
const ACQUIRE = "scripts/rcap-acquire-official-source.mjs";
const SUMMARY = "scripts/rcap-summarize-source-acquisition-batch.mjs";
const READY_WORKFLOW = ".github/workflows/rcap-source-conveyor-ready.yml";

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
  const verifyLanes = every.filter((x) => x.lane === "independent-verification");

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
  // An exact host is an official host too -- it is allowed one hostname at a
  // time rather than by suffix, and C16 is what holds that narrow.
  const exactAllowed = new Set(manifest.allowedExactHosts ?? []);
  const badHost = manifest.entries.filter((e) => {
    try {
      const u = new URL(e.officialUrl);
      if (u.protocol !== "https:") return true;
      if (manifest.refusedHosts.includes(u.hostname)) return true;
      // Asked of the policy itself, not of the manifest's own description of
      // it. The suffix list is one place now -- scripts/lib/official-host-policy.mjs
      // -- so the conveyor, the planner and the fetcher cannot disagree.
      return !hostAllowed(u.hostname);
    } catch { return true; }
  }).map((e) => e.sourceId);
  const plannerText = fs.readFileSync(path.join(ROOT, PLANNER), "utf8");
  // One authority: the planner imports the policy module rather than restating
  // it or scraping it out of the fetcher's source text.
  const oneAllowlistAuthority = /from "\.\/lib\/official-host-policy\.mjs"/.test(plannerText);
  const plannerRestatesNoList = !/const ALLOWED = \[\s*"/.test(plannerText)
    && !/ALLOWED_HOST_SUFFIXES = \[\(/.test(plannerText);
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

  // C16. An exact-host allowance is one hostname, never its suffix.
  const policyText = fs.readFileSync(path.join(ROOT, HOST_POLICY), "utf8");
  const exactProblems = [];
  const exactBlock = /const ALLOWED_EXACT_HOSTS = new Map\(\[([\s\S]*?)\n\]\);/.exec(policyText);
  if (!exactBlock) exactProblems.push("the host policy declares no exact-host list");
  const declaredExact = exactBlock ? [...exactBlock[1].matchAll(/\["([^"]+)", \{/g)].map((m) => m[1]) : [];
  for (const h of declaredExact) {
    if (h.startsWith("*") || h.startsWith(".")) exactProblems.push(`${h} is a wildcard or a suffix, not an exact hostname`);
    const entry = new RegExp(`\\["${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}", \\{([\\s\\S]*?)\\}\\]`).exec(exactBlock[1]);
    const body = entry?.[1] ?? "";
    if (!/jurisdictions:\s*new Set/.test(body)) exactProblems.push(`${h} does not name the jurisdictions it may serve`);
    if (!/requiresExpectedSha256:\s*true/.test(body)) exactProblems.push(`${h} does not require an expected SHA-256`);
    if (!/provenance:/.test(body)) exactProblems.push(`${h} does not state its official provenance`);
  }
  // The suffix list must not have quietly absorbed the exception.
  const suffixBlock = /const ALLOWED_HOST_SUFFIXES = \[([\s\S]*?)\];/.exec(policyText);
  const suffixes = suffixBlock ? [...suffixBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
  for (const suf of suffixes) {
    if (/blob\.core\.windows\.net|amazonaws|azureedge|cloudfront|googleapis/i.test(suf)) {
      exactProblems.push(`${suf} is a shared hosting suffix in the SUFFIX list, which allows every tenant of that service`);
    }
    // `.us` is open registration -- any US person or entity can register one --
    // and it sat here under a comment reading "Only first-party government
    // publishers." The delegated state-government namespace is state.<code>.us,
    // which is a rule about the third level, not the TLD.
    if (/^\.?(us|com|net|org|info|co)$/i.test(suf.replace(/^\./, ""))) {
      exactProblems.push(`${suf} is an open-registration TLD in the SUFFIX list; anyone can register a host under it`);
    }
  }
  // And no manifest entry may ride an exact host without the hash that identifies it.
  const exactSet = new Set(declaredExact);
  for (const e of manifest.entries) {
    let host = null;
    try { host = new URL(e.officialUrl).hostname.toLowerCase(); } catch { /* C5 reports this */ }
    if (host && exactSet.has(host) && !/^[0-9a-f]{64}$/.test(String(e.expectedSha256 ?? ""))) {
      exactProblems.push(`${e.sourceId} is on exact host ${host} with no expected SHA-256`);
    }
  }
  check("C16", "an exact-host allowance is one hostname with provenance, a jurisdiction and a required hash — never a suffix",
    exactProblems.length === 0 && declaredExact.length > 0,
    `${declaredExact.length} exact host(s): ${declaredExact.join(", ")}; ${exactProblems.length} problem(s): ${exactProblems.slice(0, 2).join(" | ")}`);

  // C17. A forecast may not be reported as an achievement.
  const countProblems = [];
  const t = master.totals ?? {};
  if (typeof t.actualPromotedAndReleased !== "number") countProblems.push("no actualPromotedAndReleased count");
  if (typeof t.currentlyPromotionReady !== "number") countProblems.push("no currentlyPromotionReady count");
  if (typeof t.prospectiveReleasesAcrossSourceLanes !== "number") countProblems.push("no prospective count");
  const reallyReady = master.families.filter((f) => f.state === "SOURCE_READY" && !f.activeOwner).length;
  if (t.actualPromotedAndReleased !== reallyReady) countProblems.push(`actualPromotedAndReleased says ${t.actualPromotedAndReleased} and ${reallyReady} families are actually source-ready`);
  if (typeof t.prospectiveReleasesAcrossSourceLanes === "number" && t.prospectiveReleasesAcrossSourceLanes === t.actualPromotedAndReleased && reallyReady > 0) {
    countProblems.push("the forecast and the achieved figure are the same number, which is how one gets read as the other");
  }
  for (const x of sourceLanes) {
    if (x.assignmentId.startsWith("WAR")) continue;
    if (x.countIsProspective !== true) countProblems.push(`${x.assignmentId} does not mark its release count prospective`);
    if (!/not a count of promoted sources/i.test(String(x.countMeaning ?? ""))) countProblems.push(`${x.assignmentId} does not say what its count is not`);
  }
  check("C17", "a prospective release count cannot be read as families already promoted",
    countProblems.length === 0,
    `actual ${t.actualPromotedAndReleased}, promotion-ready ${t.currentlyPromotionReady}, forecast ${t.prospectiveReleasesAcrossSourceLanes}; ${countProblems.length} problem(s): ${countProblems.slice(0, 2).join(" | ")}`);

  // C18. The batch must report a result even when it fails.
  const summaryText = fs.existsSync(path.join(ROOT, SUMMARY)) ? fs.readFileSync(path.join(ROOT, SUMMARY), "utf8") : "";
  const summaryProblems = [];
  if (!summaryText) summaryProblems.push("no summary script");
  if (!/SOURCE_ACQUISITION_BATCH_RESULT\.json/.test(summaryText)) summaryProblems.push("the summary writes no batch result file");
  for (const verdict of ["COMPLETE", "PARTIAL", "REFUSED"]) {
    if (!new RegExp(`"${verdict}"`).test(summaryText)) summaryProblems.push(`the summary never produces ${verdict}`);
  }
  if (!/needs:\s*\[plan, acquire\]/.test(wf)) summaryProblems.push("the summary job does not wait for the acquisitions");
  if (!/if:\s*always\(\)/.test(wf)) summaryProblems.push("the summary job does not run on failure, so a wholly failed batch would report nothing");
  if (!/rcap-summarize-source-acquisition-batch\.mjs/.test(wf)) summaryProblems.push("the workflow does not invoke the summary");
  check("C18", "the batch reports COMPLETE, PARTIAL or REFUSED, and reports it even when every job fails",
    summaryProblems.length === 0,
    `${summaryProblems.length} problem(s): ${summaryProblems.slice(0, 2).join(" | ")}`);

  // C19. Elastic capacity that is triggered must exist, not merely be recorded.
  const elasticProblems = [];
  for (const e of ci.elasticCapacity?.thresholds ?? []) {
    const present = e.creates.filter((id) => active.assignments.some((x) => x.assignmentId === id));
    if (e.triggered && present.length !== e.creates.length) {
      elasticProblems.push(`${e.when} is triggered at ${e.measured} and only ${present.length}/${e.creates.length} lane(s) exist`);
    }
    /*
     * Capacity is not withdrawn out from under work in flight.
     *
     * An elastic lane that exists while its trigger is off is only a defect if
     * it is EMPTY. VF09-VF12 each held a family and FIX05-FIX08 each held two
     * when the queue dipped below the threshold; deleting them would have
     * orphaned twelve families to make a counter tidy. What must not survive is
     * capacity nobody needs and nothing occupies.
     */
    const idleElastic = present.filter((id) => {
      const lane = active.assignments.find((x) => x.assignmentId === id);
      return ((lane?.items ?? []).length === 0);
    });
    if (!e.triggered && idleElastic.length > 0) {
      elasticProblems.push(`${e.when} is not triggered and ${idleElastic.length} elastic lane(s) exist holding no work: ${idleElastic.join(", ")}`);
    }
  }
  for (const v of verifyLanes) {
    if (!active.assignments.includes(v)) continue;
    if (v.launchNow === true && !/^[0-9a-f]{7,40}$/.test(String(v.verifiesCommit ?? ""))) elasticProblems.push(`${v.assignmentId} is launchable and names no packet commit`);
    if (!(v.ownedPaths ?? []).length || !(v.prohibitedPaths ?? []).length) elasticProblems.push(`${v.assignmentId} does not state both owned and prohibited paths`);
    if (!fs.existsSync(path.join(ROOT, PROMPTS_DIR, `${v.assignmentId}.md`))) elasticProblems.push(`${v.assignmentId} has no prompt`);
  }
  /*
   * C21. Every queue state a generator names is a state the queue declares.
   *
   * "FAIL_REPAIR_REQUIRED > 20" read countIn("REPAIR_REQUIRED"). No family has
   * ever been in a state by that name, so the threshold counted zero on every
   * run and could not fire however deep the repair queue got. It was switched
   * off and it looked exactly like a quiet day -- twenty-six families were in
   * FAIL_REPAIR_REQUIRED when this was found.
   *
   * A misspelled key is silent by construction: it returns zero, or undefined,
   * and reports nothing. The only defence is to refuse a name the vocabulary
   * does not declare, which is why the generator exits rather than counting,
   * and why this asks the same question of the committed source.
   */
  const declaredStates = new Set(master.stateVocabulary ?? []);
  const stateNameProblems = [];
  if (declaredStates.size === 0) stateNameProblems.push("the master queue declares no state vocabulary at all");
  for (const f of ["generate-source-conveyor.mjs", "generate.mjs"]) {
    const t = fs.readFileSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h", f), "utf8");
    for (const m of t.matchAll(/countIn\("([A-Z_]+)"\)|state === "([A-Z_]+)"/g)) {
      const name = m[1] ?? m[2];
      if (!declaredStates.has(name)) stateNameProblems.push(`${f} queries state ${name}, which the queue does not declare`);
    }
  }
  // The generator must refuse rather than count, or the next misspelling is
  // silent again.
  if (!/is not a declared queue state/.test(fs.readFileSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate-source-conveyor.mjs"), "utf8"))) {
    stateNameProblems.push("the conveyor generator does not refuse an undeclared state name");
  }
  check("C21", "every queue state a generator counts is one the queue declares",
    stateNameProblems.length === 0,
    `${declaredStates.size} declared state(s); ${stateNameProblems.length} problem(s): ${stateNameProblems.slice(0, 3).join(" | ")}`);

  /*
   * C22. The corrected model reaches the worker.
   *
   * The source relationship registry was generated and read by nobody: zero
   * prompts named it or any of its states. A DISC worker handed a bundle
   * component would still have gone hunting for a standalone form that does not
   * exist separately, and one handed a CURRENTNESS_UNVERIFIED record -- bytes we
   * already hold -- would have gone looking for a missing source. A corrected
   * model that never reaches the lane is a corrected document.
   */
  const wiringProblems = [];
  if (!fs.existsSync(path.join(ROOT, DIR, "SOURCE_RELATIONSHIP_REGISTRY.json"))) wiringProblems.push("the source relationship registry is absent");
  const sourcePrompts = fs.readdirSync(path.join(ROOT, PROMPTS_DIR)).filter((f) => /^(DISC|SRC|ACQ|PROMO)\d+\.md$/.test(f));
  if (sourcePrompts.length < 16) wiringProblems.push(`only ${sourcePrompts.length} source prompt(s); the conveyor dispatches sixteen`);
  const MUST_NAME = ["SOURCE_RELATIONSHIP_REGISTRY.json", "BUNDLE_COMPONENT", "EMBEDDED_SECTION", "CURRENTNESS_UNVERIFIED", "STATUTORY_CUSTOM_PLEADING", "LICENSE_PERMISSION_REVIEW"];
  for (const f of sourcePrompts) {
    const t = fs.readFileSync(path.join(ROOT, PROMPTS_DIR, f), "utf8");
    const absent = MUST_NAME.filter((n) => !t.includes(n));
    if (absent.length) { wiringProblems.push(`${f} never names ${absent.slice(0, 3).join(", ")}`); break; }
    // Naming the states is not enough if the prompt never says which of them
    // are not an acquisition. That distinction is the entire content.
    if (!/NOT a fetch/i.test(t)) { wiringProblems.push(`${f} lists the states without saying which are not an acquisition`); break; }
  }
  check("C22", "every source prompt carries the relationship registry and says which states are not a fetch",
    wiringProblems.length === 0,
    `${sourcePrompts.length} source prompt(s); ${wiringProblems.length} problem(s): ${wiringProblems.slice(0, 2).join(" | ")}`);

  /*
   * C23. The source accounting closes by identity, not by count.
   *
   * The conveyor reports familiesReleased as a sum of per-lane integers. It
   * says 232 while 256 families are SOURCE_BLOCKED, and the 24-family
   * difference looked like work falling out of the dispatch until I checked it
   * by identity: every one is recorded as familiesAdvancedButNotReleasedHere,
   * because its obligations are split across lanes and the release belongs to
   * the lane holding the last of them. The design is intact and the count is
   * conservative on purpose.
   *
   * What was NOT true is that anything verified this. A sum of counts cannot be
   * reconciled against a queue, so a family genuinely dropping out would have
   * looked exactly like a family legitimately split. This closes it by set
   * arithmetic: released, plus advanced-but-not-released-here, must account for
   * every source-blocked family, with nothing counted twice.
   */
  const releasedIds = new Set();
  const advancedIds = new Set();
  let perLaneCountSum = 0;
  const sourceLanesForClosure = (active.assignments ?? []).filter((x) => x.itemKind === "sourceObligation");
  for (const l of sourceLanesForClosure) {
    for (const f of l.familiesUnblocked ?? []) releasedIds.add(f);
    for (const x of l.familiesAdvancedButNotReleasedHere ?? []) advancedIds.add(typeof x === "string" ? x : x.familyId);
    perLaneCountSum += l.familiesUnblockedCount ?? 0;
  }
  const sourceBlocked = new Set(master.families.filter((f) => f.state === "SOURCE_BLOCKED").map((f) => f.familyId));
  const preservedSeparate = new Set(conveyor.reconciliationScope?.laterSourceBlockersKeptSeparate ?? []);
  const unaccounted = [...sourceBlocked].filter((f) => !releasedIds.has(f) && !advancedIds.has(f) && !preservedSeparate.has(f));
  const doubleClaimed = [...releasedIds].filter((f) => advancedIds.has(f));
  const closureProblems = [];
  if (perLaneCountSum !== releasedIds.size) closureProblems.push(`the per-lane counts sum to ${perLaneCountSum} and name ${releasedIds.size} distinct families, so a family is counted twice`);
  if (unaccounted.length) closureProblems.push(`${unaccounted.length} source-blocked famil(ies) are neither released nor recorded as split: ${unaccounted.slice(0, 3).join(", ")}`);
  if (doubleClaimed.length) closureProblems.push(`${doubleClaimed.length} famil(ies) are both released and deferred: ${doubleClaimed.slice(0, 3).join(", ")}`);
  /*
   * The count used to be pinned at five, which was true on the day it was
   * written and became false the moment any of those five was resolved. All
   * five have since moved on, so pinning the number asserted that work must not
   * finish. What the carve-out actually has to satisfy is that everything in it
   * is still blocked -- a resolved family is not being kept separate from
   * anything -- and the size is then free to fall to zero, which is what a
   * finished carve-out looks like.
   */
  const separateButNotBlocked = [...preservedSeparate].filter((f) => !sourceBlocked.has(f));
  if (separateButNotBlocked.length) {
    closureProblems.push(`${separateButNotBlocked.length} later blocker(s) are declared separate but are not currently SOURCE_BLOCKED: ${separateButNotBlocked.slice(0, 3).join(", ")}`);
  }
  const separatelyDoubleCounted = [...preservedSeparate].filter((f) => releasedIds.has(f) || advancedIds.has(f));
  if (separatelyDoubleCounted.length) closureProblems.push(`${separatelyDoubleCounted.length} later blocker(s) are both separate and counted in this reconciliation`);
  if (sourceBlocked.size === 0) closureProblems.push("no source-blocked family, so this accounting has no subject");
  check("C23", "every source-blocked family is released, split across lanes, or a later blocker still kept separate",
    closureProblems.length === 0,
    `${sourceBlocked.size} blocked = ${releasedIds.size} released + ${advancedIds.size} split + ${preservedSeparate.size} later/separate; ${closureProblems.length} problem(s): ${closureProblems.slice(0, 2).join(" | ")}`);

  check("C19", "capacity the queue triggers is materialized, with launch gates and paths",
    elasticProblems.length === 0,
    `${(ci.elasticCapacity?.thresholds ?? []).filter((e) => e.triggered).length} trigger(s) firing, ${verifyLanes.length} verifier(s); ${elasticProblems.length} problem(s): ${elasticProblems.slice(0, 2).join(" | ")}`);

  // C20. Generated prompts and commit-bound gate are executable, not prose.
  const promptTexts = conveyor.lanes.map((l) => fs.readFileSync(path.join(ROOT, l.promptFile), "utf8"));
  const promptProblems = [];
  if (promptTexts.some((t) => /\bundefined\b/.test(t))) promptProblems.push("a source prompt contains undefined");
  if (promptTexts.some((t) => /--family\s+\S+::/.test(t))) promptProblems.push("a source prompt passes a synthetic obligation to --family");
  if (promptTexts.some((t) => /<FAMILY_ID>|<placeholder>|\bTODO\b/.test(t))) promptProblems.push("a source prompt contains a placeholder");
  if (promptTexts.some((t) => /no-egress[\s\S]{0,500}(?:agent|worker)[\s\S]{0,500}(?:it dispatched|dispatch the workflow)/i.test(t))) promptProblems.push("an ACQ worker claims it dispatched from the no-egress phase");
  for (const a of sourceLanes.filter((x) => /^(DISC|SRC|ACQ|PROMO)\d{2}$/.test(x.assignmentId))) {
    if ((a.itemDetails ?? []).length !== (a.items ?? []).length) promptProblems.push(`${a.assignmentId} has no explicit detail row for every item`);
    if (a.operation === "official-acquisition-dispatch" && (a.itemDetails ?? []).some((x) => !/^https:\/\//.test(x.officialUrl ?? ""))) promptProblems.push(`${a.assignmentId} has a URL-less ACQ row`);
    if (a.operation === "promotion-and-release" && (a.itemDetails ?? []).some((x) => !x.artifactName || !x.receiptPath)) promptProblems.push(`${a.assignmentId} has a receipt-less PROMO row`);
  }
  const unresolvedFamilies = new Set(sourceLanes.flatMap((a) => (a.itemDetails ?? []).flatMap((x) => x.familyIds ?? [])));
  const releasedUnresolved = master.families.filter((f) => f.state === "SOURCE_READY" && unresolvedFamilies.has(f.familyId));
  if (releasedUnresolved.length) promptProblems.push(`${releasedUnresolved.length} released family/families retain unresolved sources`);
  const readyText = fs.existsSync(path.join(ROOT, READY_WORKFLOW)) ? fs.readFileSync(path.join(ROOT, READY_WORKFLOW), "utf8") : "";
  for (const required of ["generate.mjs --check", "generate-source-conveyor.mjs --check", "generate-washington-repair.mjs --check", "verify.mjs --mutations", "verify-source-conveyor.mjs --mutations", "rcap-plan-source-acquisition-batch.mjs", "git diff --check", "git status --porcelain"]) if (!readyText.includes(required)) promptProblems.push(`readiness workflow omits ${required}`);
  if (!/name:\s*RCAP Source Conveyor/.test(readyText) || !/^\s{2}READY_TO_RUN:/m.test(readyText)) promptProblems.push("commit-bound check name is absent");
  check("C20", "source prompts and READY_TO_RUN gate are executable and fail closed", promptProblems.length === 0,
    `${promptProblems.length} problem(s): ${promptProblems.slice(0, 3).join(" | ")}`);

  // The shape the instruction asked for, so a rename cannot pass silently.
  check("C14", "sixteen source lanes: six DISC, four SRC, three ACQ, three PROMO",
    conveyor.totals.sourceLanes === 16 && conveyor.totals.disc === 6 && conveyor.totals.src === 4
    && conveyor.totals.acq === 3 && conveyor.totals.promo === 3
    && conveyor.lanes.every((l) => fs.existsSync(path.join(ROOT, l.promptFile))),
    `${conveyor.totals.sourceLanes} lanes: ${conveyor.totals.disc} DISC, ${conveyor.totals.src} SRC, ${conveyor.totals.acq} ACQ, ${conveyor.totals.promo} PROMO`);

  // And the base thirty-two factory lanes are still there; elastic or
  // live-grant-retained lanes may exist above this required subset.
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
  check("C15", "the base thirty-two factory lanes are preserved",
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
    planner: path.join(ROOT, PLANNER), acquire: path.join(ROOT, ACQUIRE),
    summary: path.join(ROOT, SUMMARY), policy: path.join(ROOT, HOST_POLICY), conveyorGen: path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate-source-conveyor.mjs")
    , prompt: path.join(ROOT, PROMPTS_DIR, "DISC01.md"), ready: path.join(ROOT, READY_WORKFLOW)
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
    { on: "planner", id: "C5", name: "a planner that restates its own allowlist instead of importing it is caught", mutateText: (t) => t.replace(
      'import { hostAllowed, ALLOWED_EXACT_HOSTS, REFUSED_HOSTS } from "./lib/official-host-policy.mjs";',
      'const ALLOWED = [\n  ".gov",\n  ".us"\n];\nconst hostAllowed = (h) => ALLOWED.some((s) => h.endsWith(s));\nconst ALLOWED_EXACT_HOSTS = new Map();\nconst REFUSED_HOSTS = new Set();') },
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
    /* C21's subject: a threshold reading a state name nothing writes counts
     * zero and reports a quiet day. "REPAIR_REQUIRED" did exactly that while
     * twenty-six families sat in FAIL_REPAIR_REQUIRED. */
    { on: "active", id: "C23", name: "a source-blocked family released by no lane and recorded nowhere is caught", mutate: (j) => { const l = j.assignments.find((x) => x.itemKind === "sourceObligation" && (x.familiesUnblocked ?? []).length); l.familiesUnblocked = l.familiesUnblocked.slice(1); l.familiesUnblockedCount = l.familiesUnblocked.length; return j; } },
    { on: "active", id: "C23", name: "a family both released and deferred is caught", mutate: (j) => { const l = j.assignments.find((x) => x.itemKind === "sourceObligation" && (x.familiesUnblocked ?? []).length); l.familiesAdvancedButNotReleasedHere = [...(l.familiesAdvancedButNotReleasedHere ?? []), { familyId: l.familiesUnblocked[0] }]; return j; } },
    { on: "prompt", id: "C22", name: "a source prompt stripped of the relationship registry is caught", mutateText: (t) => t.replace(/## Read the source relationship registry first[\s\S]*?(?=\n## )/, "") },
    { on: "prompt", id: "C22", name: "a source prompt listing the states without saying which are not a fetch is caught", mutateText: (t) => t.replace(/\*\*These states are NOT a fetch[^\n]*\*\*/, "**These states exist.**") },
    { on: "conveyorGen", id: "C21", name: "a threshold reading an undeclared queue state is caught", mutateText: (t) => t.replace('countIn("FAIL_REPAIR_REQUIRED")', 'countIn("REPAIR_REQUIRED")') },
    { on: "policy", id: "C16", name: "an open-registration TLD on the suffix list is caught", mutateText: (t) => t.replace('const ALLOWED_HOST_SUFFIXES = [\n  ".gov",', 'const ALLOWED_HOST_SUFFIXES = [\n  ".us",\n  ".gov",') },
    { on: "policy", id: "C16", name: "widening the exact host to its shared suffix is caught", mutateText: (t) => t.replace('  ".uscourts.gov"', '  ".uscourts.gov",\n  ".blob.core.windows.net"') },
    { on: "policy", id: "C16", name: "an exact host that stops requiring a hash is caught", mutateText: (t) => t.replace("requiresExpectedSha256: true", "requiresExpectedSha256: false") },
    { on: "policy", id: "C16", name: "an exact host with no stated jurisdiction is caught", mutateText: (t) => t.replace(/jurisdictions: new Set\(\["IL"\]\),\n/, "") },
    { on: "manifest", id: "C16", name: "an exact-host entry with no expected hash is caught", mutate: (j) => { const e = j.entries.find((x) => (j.allowedExactHosts ?? []).includes(x.host)); if (!e) throw new Error("no manifest entry rides an exact host; this mutation has no subject"); e.expectedSha256 = null; return j; } },
    { on: "master", id: "C17", name: "reporting the forecast as the achieved figure is caught", mutate: (j) => { j.totals.actualPromotedAndReleased = j.totals.prospectiveReleasesAcrossSourceLanes; return j; } },
    { on: "master", id: "C17", name: "dropping the achieved count is caught", mutate: (j) => { delete j.totals.actualPromotedAndReleased; return j; } },
    { on: "active", id: "C17", name: "a source lane that stops marking its count prospective is caught", mutate: (j) => { const x = j.assignments.find((y) => y.itemKind === "sourceObligation"); x.countIsProspective = false; return j; } },
    { on: "summary", id: "C18", name: "a summary that cannot report PARTIAL is caught", mutateText: (t) => t.replace(/"PARTIAL"/g, '"OK"') },
    { on: "workflow", id: "C18", name: "a summary job that skips when the batch fails is caught", mutateText: (t) => t.replace("    if: always()", "    if: success()") },
    /* The subject must be a threshold whose lanes are genuinely absent. Flipping
 * the first untriggered one stopped proving anything once VF09-VF12 were
 * materialized and stayed materialized: the mutation said "triggered" and all
 * four lanes were right there. It picks the threshold nothing has built. */
    { on: "ci", id: "C19", name: "a triggered threshold whose lanes do not exist is caught", mutate: (j) => { const ids = new Set(read(ACTIVE).assignments.map((x) => x.assignmentId)); const e = j.elasticCapacity.thresholds.find((x) => x.creates.some((c) => !ids.has(c))); if (!e) throw new Error("every elastic lane already exists, so this mutation has no subject"); e.triggered = true; return j; } },
    { on: "active", id: "C19", name: "a materialized verifier without a prompt is caught", mutate: (j) => { j.assignments.find((x) => x.lane === "independent-verification").assignmentId = "VF99"; return j; } },
    { on: "prompt", id: "C20", name: "undefined in a source prompt is caught", mutateText: (t) => `${t}\nundefined\n` },
    { on: "prompt", id: "C20", name: "synthetic --family in a source prompt is caught", mutateText: (t) => `${t}\n--family family::official-form:X\n` },
    { on: "active", id: "C20", name: "a URL-less ACQ item is caught", mutate: (j) => { const a=j.assignments.find(x=>x.assignmentId==="ACQ01"); a.items=["synthetic::url-less"]; a.itemDetails=[{itemId:"synthetic::url-less",familyIds:["synthetic"]}]; return j; } },
    { on: "active", id: "C20", name: "a receipt-less PROMO item is caught", mutate: (j) => { const a=j.assignments.find(x=>x.assignmentId==="PROMO01"); a.items=["synthetic::promo"]; a.itemDetails=[{itemId:"synthetic::promo",familyIds:["synthetic"]}]; return j; } },
    { on: "ready", id: "C20", name: "omitting a required readiness verifier is caught", mutateText: (t) => t.replace("verify-source-conveyor.mjs --mutations", "verify-source-conveyor.mjs --disabled") },
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
execFileSync(process.execPath, ["scripts/grade-a-packet-factory-24h/verify-claim-ledger.mjs"], { cwd: ROOT, stdio: "inherit" });
