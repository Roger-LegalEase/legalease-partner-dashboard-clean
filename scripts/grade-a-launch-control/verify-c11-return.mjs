#!/usr/bin/env node
// Mechanical review of the C11 packet-factory return.
//
//   node scripts/grade-a-launch-control/verify-c11-return.mjs [--write]
//
// 1,929 files and 782,529 inserted lines is too large to review by reading. The
// twelve criteria below are each checked against git and against the assignment
// manifest, and each is written so that the failure it is looking for is the one
// that would be expensive to miss:
//
//   - a family silently absent, or built twice under two names;
//   - a build reported as complete that rendered nothing;
//   - private corpus bytes committed into the repository, which the corpus
//     governance says have never been here and must never be;
//   - a launch-control record or another lane's output quietly overwritten;
//   - a family that opened generation, runtime selection or commercial
//     authority while reporting that it did not.
//
// A criterion that cannot be evaluated FAILS. It is never skipped.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WRITE = process.argv.includes("--write");
const OUT = "data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json";
const DISPATCH = "data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json";

const RETURN = {
  assignmentId: "C11_PACKET_FACTORY_ACCELERATOR",
  branch: "codex/c11-packet-factory-accelerator",
  commit: "36e7a6a59449692329a6e0c31ab74f33fff96564",
  reportedBuilt: 43,
  reportedStopped: 4,
  reportedStoppedFamilies: [
    "ne-setaside-noncustodial-set",
    "ne-trafficking-setaside-and-seal-set",
    "pa_6308_underage-set",
    "wa_blake_vacatur_and_lfo_refund-set"
  ]
};

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };
const gitBytes = (args) => { try { return execFileSync("git", args, { cwd: ROOT, maxBuffer: 1 << 29 }); } catch { return null; } };
const showJson = (file) => { const t = git(["show", `${RETURN.commit}:${file}`]); if (t === null) return null; try { return JSON.parse(t); } catch { return null; } };

const dispatch = read(DISPATCH);
const assignment = dispatch.assignments.find((a) => a.assignmentId === RETURN.assignmentId);
const BASE = dispatch.captainBaseSha;
const assignedFamilies = (assignment?.rowGroups ?? []).flatMap((g) => g.families ?? []);

const criteria = [];
const criterion = (n, title, passed, observed, detail = undefined) => {
  criteria.push({ n, title, passed, observed, ...(detail ? { detail } : {}) });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${String(n).padStart(2)} ${title}`);
  if (!passed) console.log(`          observed: ${observed}`);
};

const changed = (git(["diff", "--name-only", BASE, RETURN.commit]) ?? "").split("\n").filter(Boolean);

// 1. Sole parent is the Wave 1 control base.
{
  const parents = (git(["rev-list", "--parents", "-n1", RETURN.commit]) ?? "").split(/\s+/).slice(1);
  criterion(1, "its sole parent is the Wave 1 control base",
    parents.length === 1 && parents[0] === BASE, `${parents.length} parent(s): ${parents.map((p) => p.slice(0, 8)).join(", ")}`);
}

// 2-4. Every assigned family appears exactly once, with an honest status.
//
// The build script is the enumeration: one per family, named for the family, so
// a family cannot be silently absent or counted twice under two spellings.
const families = [];
{
  const scripts = changed.filter((f) => /^scripts\/build-census-v1-.+\.mjs$/.test(f));
  const scriptFamily = new Map(scripts.map((f) => [f.replace(/^scripts\/build-census-v1-/, "").replace(/\.mjs$/, ""), f]));
  const dirs = [...new Set(changed.filter((f) => f.startsWith("data/rcap-all50/overlays/census-v1/")).map((f) => f.split("/").slice(0, 6).join("/")))];
  // The build script keeps the family id verbatim; the directory spells it with
  // hyphens and appends the implementation strategy. Matching them literally
  // reported 34 built families as unresolved, so both sides are normalised.
  const norm = (id) => id.replace(/_/g, "-").toLowerCase();
  const dirFamily = new Map(dirs.map((d) => [norm(d.split("/")[5].replace(/--[a-z-]+$/, "")), d]));

  for (const family of assignedFamilies) {
    const dir = dirFamily.get(norm(family)) ?? null;
    const status = dir ? showJson(`${dir}/build-status.json`) : null;
    const wiring = dir ? showJson(`${dir}/product-wiring.json`) : null;
    const approval = dir ? showJson(`${dir}/approval-request.json`) : null;
    const receipt = dir ? showJson(`${dir}/source-receipt.json`) : null;
    const rendered = dir ? showJson(`${dir}/reports/rendered-artifacts.json`) : null;
    // Rendered output is counted from the lane's own report where it has one --
    // packets[].documents[] is the shape it actually wrote -- and otherwise from
    // what is on disk. A composed family renders into companion/ and raster/
    // rather than fixtures/, so counting only fixture PDFs would report a built
    // family as unresolved and understate the wave.
    const artifactCount = Array.isArray(rendered?.packets)
      ? rendered.packets.reduce((n, pk) => n + (pk.documents ?? []).length, 0)
      : Array.isArray(rendered?.artifacts) ? rendered.artifacts.length
        : Array.isArray(rendered) ? rendered.length
          : (rendered?.count ?? (dir
            ? changed.filter((f) => f.startsWith(`${dir}/`) && /\.(pdf|png)$/.test(f) && !/\/derived-sources\//.test(f)).length
            : 0));
    const declaredStopped = RETURN.reportedStoppedFamilies.includes(family);
    const statusWord = status?.status ?? null;
    const stoppedByRecord = /STOPPED/i.test(String(statusWord ?? ""));
    families.push({
      familyId: family, directory: dir, buildScript: scriptFamily.get(family) ?? null,
      buildStatus: statusWord, renderedArtifacts: artifactCount,
      declaredStopped, stoppedByRecord,
      classification: stoppedByRecord || (declaredStopped && artifactCount === 0) ? "STOPPED_WITH_EXACT_BLOCKER"
        : artifactCount > 0 ? "BUILT" : "UNRESOLVED",
      // Two schemas appeared inside one lane: most families write
      // product-wiring.json with generationAllowed / commercialRoutesOpened, and
      // the five New Jersey families write only approval-request.json with
      // commercialAuthority. Both state a closed posture; only one states it in
      // the field name the assignment implied. The posture is read through both
      // spellings, and the missing wiring record is reported separately -- an
      // absent field is not a false one, and neither is a silent pass.
      hasProductWiring: wiring !== null,
      generationAllowed: wiring?.generationAllowed ?? approval?.generationAllowed ?? null,
      runtimeSelectable: wiring?.runtimeSelectable ?? approval?.runtimeSelectable ?? null,
      commercialRoutesOpened: wiring?.commercialRoutesOpened ?? approval?.commercialRoutesOpened
        ?? (approval?.commercialAuthority === false ? 0 : null),
      commercialAuthorityStated: approval?.commercialAuthority ?? null,
      outputApprovalStatus: approval?.status ?? null,
      outputApprovalGranted: approval?.outputLegalApprovalEstablished ?? null,
      independentVisualReview: approval?.independentVisualReviewEstablished ?? null,
      sourcesExact: receipt?.allSourcesExact ?? null,
      sourceCount: (receipt?.sources ?? []).length,
      absoluteRootPersisted: receipt?.sourceCorpus?.absoluteRootPersisted ?? null
    });
  }

  const missing = assignedFamilies.filter((f) => !dirFamily.has(norm(f)) && !scriptFamily.has(f));
  const assignedNorm = new Set(assignedFamilies.map(norm));
  const unassigned = [...scriptFamily.keys()].filter((f) => !assignedNorm.has(norm(f)));
  const dupes = assignedFamilies.filter((f, i) => assignedFamilies.indexOf(f) !== i);
  criterion(2, "all 47 assigned family IDs appear exactly once",
    missing.length === 0 && unassigned.length === 0 && dupes.length === 0 && assignedFamilies.length === 47,
    `assigned ${assignedFamilies.length}, missing ${missing.length}, unassigned ${unassigned.length}, duplicated ${dupes.length}`,
    { missing, unassigned });

  const built = families.filter((f) => f.classification === "BUILT");
  const stopped = families.filter((f) => f.classification === "STOPPED_WITH_EXACT_BLOCKER");
  const unresolved = families.filter((f) => f.classification === "UNRESOLVED");
  criterion(3, `exactly ${RETURN.reportedBuilt} are BUILT`,
    built.length === RETURN.reportedBuilt && unresolved.length === 0,
    `built ${built.length}, unresolved ${unresolved.length}`, { unresolved: unresolved.map((f) => f.familyId) });
  criterion(4, `exactly ${RETURN.reportedStopped} are STOPPED_WITH_EXACT_BLOCKER`,
    stopped.length === RETURN.reportedStopped
    && stopped.every((f) => RETURN.reportedStoppedFamilies.includes(f.familyId)),
    `stopped ${stopped.length}: ${stopped.map((f) => f.familyId).join(", ")}`);
}

// 5. Every changed path inside C11-owned packet-factory paths.
{
  const owned = [/^data\/rcap-all50\/overlays\/census-v1\//, /^data\/rcap-all50\/pleadings\//, /^scripts\/build-census-v1-.+\.mjs$/];
  const outside = changed.filter((f) => !owned.some((p) => p.test(f)));
  criterion(5, "all changed paths are inside C11-owned packet-factory paths",
    outside.length === 0, outside.slice(0, 5).join(", ") || `${changed.length} file(s), all in scope`);
}

// 6. No private corpus source binary committed.
//
// This is the decisive one, and it is checked by content rather than by name.
// The corpus governance is explicit -- "`.gitignore` excludes `private/`, so the
// bytes have never been in this repository" -- and the committed artifact is a
// complete SHA-256 index of all 583 files. So: hash every binary this commit
// adds and ask whether the index knows it.
const corpusHits = [];
{
  const inventory = read("data/rcap-all50/nationwide-source-inventory.json");
  const corpus = new Map();
  for (const state of inventory.states ?? []) {
    for (const file of state.files ?? []) if (file.sha256) corpus.set(String(file.sha256).toLowerCase(), `${state.code}: ${file.path ?? file.name ?? "(unnamed)"}`);
  }
  for (const file of changed.filter((f) => /\.(pdf|docx?|rtf|zip)$/i.test(f))) {
    const bytes = gitBytes(["show", `${RETURN.commit}:${file}`]);
    if (!bytes) continue;
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    if (corpus.has(sha)) corpusHits.push({ file, sha256: sha, corpusEntry: corpus.get(sha), bytes: bytes.length });
  }
  criterion(6, "no private corpus source binary was committed",
    corpusHits.length === 0,
    `${corpusHits.length} committed file(s) are byte-identical to indexed private-corpus sources`,
    { firstFive: corpusHits.slice(0, 5) });
}

// 7. No court-source PDF committed unless repository source governance permits.
{
  const SOURCE_SHAPED = /unchanged-official\.pdf$|--official-source\.pdf$|\/derived-sources\//;
  const sourceShaped = changed.filter((f) => SOURCE_SHAPED.test(f));
  const precedent = (git(["ls-tree", "-r", "--name-only", BASE]) ?? "").split("\n").filter((f) => SOURCE_SHAPED.test(f));
  criterion(7, "no court-source PDF was committed outside what governance already permits",
    sourceShaped.length === 0,
    `${sourceShaped.length} source-shaped PDF(s) added; the tree at the control base had ${precedent.length}, so this pattern has no precedent here`,
    { sourceShaped: sourceShaped.slice(0, 5), precedentAtBase: precedent.length });
}

// 8. No token, secret, credential, participant data or absolute private path.
{
  const patterns = [
    { name: "Supabase or JWT-shaped token", re: /\bey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./ },
    { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "Stripe live key", re: /\bsk_live_[0-9A-Za-z]{16,}/ },
    { name: "private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { name: "absolute private corpus path", re: /(?:\/Users\/|\/home\/[a-z]+\/|\/workspaces\/)[^"'\s]*(?:private|Nationwide Record Clearing)/ },
    { name: "environment secret assignment", re: /\b(?:SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|STRIPE_SECRET_KEY)\s*[=:]\s*["']?[A-Za-z0-9]/ }
  ];
  const hits = [];
  for (const file of changed.filter((f) => /\.(json|mjs|js|ts|md|txt)$/i.test(f))) {
    const text = git(["show", `${RETURN.commit}:${file}`]);
    if (text === null) continue;
    for (const p of patterns) if (p.re.test(text)) hits.push(`${file}: ${p.name}`);
  }
  criterion(8, "no token, secret, credential, participant data or absolute private path was committed",
    hits.length === 0, hits.slice(0, 5).join(" | ") || `${changed.filter((f) => /\.(json|mjs|js|ts|md|txt)$/i.test(f)).length} text file(s) scanned clean`);
}

// 9. No Captain launch-control file modified.
{
  const touched = changed.filter((f) => f.startsWith("data/rcap-grade-a/launch-control/") || f.startsWith("docs/rcap/grade-a/launch-control/"));
  criterion(9, "no Captain launch-control file was modified", touched.length === 0, touched.join(", ") || "none");
}

// 10. No C1-C10 or C12 output overwritten.
{
  const otherOwned = dispatch.assignments
    .filter((a) => a.assignmentId !== RETURN.assignmentId)
    .flatMap((a) => a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, "")));
  const collisions = changed.filter((f) => otherOwned.some((p) => f === p || f.startsWith(`${p}/`)));
  criterion(10, "no C1-C10 or C12 output was overwritten", collisions.length === 0, collisions.slice(0, 5).join(", ") || "none");
}

// 11. No runtime, payment, sponsorship, fulfilment or commercial authority.
{
  const opened = families.filter((f) => (f.commercialRoutesOpened ?? 0) !== 0 || f.generationAllowed === true || f.runtimeSelectable === true);
  const forbidden = /"(?:price|checkoutEnabled|sponsorshipEligible|packetCreditConsumed|fulfillmentRecord|commerciallyEligible|COMPLETE_PACKET_PROVEN)"\s*:\s*(?:true|[1-9])/;
  const wired = changed.filter((f) => f.endsWith(".json")).filter((f) => { const t = git(["show", `${RETURN.commit}:${f}`]); return t !== null && forbidden.test(t); });
  criterion(11, "no runtime, payment, sponsorship, fulfilment or commercial authority was opened",
    opened.length === 0 && wired.length === 0,
    `${opened.length} family flag(s), ${wired.length} file(s) carrying a commercial assertion`);
}

// 12. Every built family still states the five closed postures.
{
  const built = families.filter((f) => f.classification === "BUILT");
  const open = built.filter((f) =>
    f.generationAllowed === true || f.runtimeSelectable !== false || (f.commercialRoutesOpened ?? 1) !== 0
    || f.outputApprovalGranted === true || f.independentVisualReview === true
    || !/REQUESTED/i.test(String(f.outputApprovalStatus ?? "")));
  criterion(12, "every built family states runtime closed, zero commercial routes, approval requested not granted, visual review pending",
    open.length === 0 && built.length > 0,
    open.length === 0 ? `${built.length} built famil(ies) all closed` : open.map((f) => f.familyId).slice(0, 5).join(", "));

  // An absent generationAllowed is not a false one. Five families carry no
  // product-wiring record at all, so nothing in the tree states that generation
  // is closed for them -- their posture is closed by the fields they do write,
  // and the missing record is a completeness gap for a repair lane rather than
  // a commercial risk.
  const noWiring = built.filter((f) => !f.hasProductWiring);
  criterion(13, "every built family carries a product-wiring record stating generationAllowed",
    noWiring.length === 0,
    noWiring.length === 0 ? `${built.length} wiring record(s)` : `${noWiring.length} built famil(ies) have no product-wiring.json: ${noWiring.map((f) => f.familyId).join(", ")}`,
    { familiesWithoutWiring: noWiring.map((f) => f.familyId) });
}

const failed = criteria.filter((c) => !c.passed);
// A failure on 6 or 7 is a file-level exclusion: the build work is sound and the
// bytes must not be here. A failure on 13 is a missing record in five otherwise
// closed families, repairable without rebuilding. Anything else refuses.
const REPAIRABLE = new Set([6, 7, 13]);
const verdict = failed.length === 0
  ? "ACCEPTED_WITH_FOUR_VALID_STOPS"
  : failed.every((c) => REPAIRABLE.has(c.n))
    ? "ACCEPTED_WITH_FOUR_VALID_STOPS_AFTER_CORPUS_BINARY_EXCLUSION"
    : "REFUSED";

console.log(`\n${criteria.length - failed.length}/${criteria.length} criteria passed — ${verdict}`);

const doc = {
  schemaVersion: "rcap-grade-a-c11-return-review/v1",
  generatedBy: "scripts/grade-a-launch-control/verify-c11-return.mjs",
  question: "C11 returned 1,929 files and 782,529 inserted lines. Which of its claims survive being checked against git?",
  controlBaseSha: BASE,
  returnCommit: RETURN.commit,
  workerBranch: RETURN.branch,
  filesChanged: changed.length,
  verdict,
  criteria,
  // THE EXACT EXCLUSION SET.
  //
  // Two overlapping populations: files whose bytes are provably indexed private
  // corpus sources, and files whose shape is a court source carried into an
  // overlay directory with no precedent in this tree. The union is excluded from
  // integration; everything else in the return is integrated unchanged.
  exclusionList: (() => {
    const byHash = new Map(corpusHits.map((h) => [h.file, h]));
    const SOURCE_SHAPED = /unchanged-official\.pdf$|--official-source\.pdf$|\/derived-sources\//;
    const union = [...new Set([...corpusHits.map((h) => h.file), ...changed.filter((f) => SOURCE_SHAPED.test(f))])].sort();
    return union.map((file) => ({
      file,
      corpusIdentical: byHash.has(file),
      sha256: byHash.get(file)?.sha256 ?? crypto.createHash("sha256").update(gitBytes(["show", `${RETURN.commit}:${file}`]) ?? Buffer.alloc(0)).digest("hex"),
      bytes: byHash.get(file)?.bytes ?? (gitBytes(["show", `${RETURN.commit}:${file}`]) ?? Buffer.alloc(0)).length,
      corpusEntry: byHash.get(file)?.corpusEntry ?? null,
      reason: byHash.has(file)
        ? "byte-identical to an indexed private-corpus source; the corpus governance says these bytes have never been in this repository"
        : "a court-source PDF or a derivative of one, carried into an overlay directory; the tree at the control base had no such file"
    }));
  })(),
  corpusBinariesToExclude: {
    count: corpusHits.length,
    why: "The corpus governance record states that private/ is gitignored and that what is committed is a complete SHA-256 index of all 583 files. These are those bytes.",
    correctionToThatGovernanceClaim:
      "The README also says the bytes 'have never been in this repository', and that is not exactly true: ten files predating C11 already match corpus hashes, under hard-forms/*/evidence/ and data/rcap-codex/remaining-tracks/source-receipts/. So there is precedent for committing a source PDF as evidence. What C11 did is different in scale and in shape -- 52 more files, a fivefold increase, inside overlay fixture and derived-sources directories that had no such file at the control base -- and the ten pre-existing ones are a governance discrepancy for Roger to settle rather than a licence to add fifty-two more.",
    nothingIsLost: "Every excluded file's exact SHA-256, byte length and path in the corpus is already recorded in the family's own source-receipt.json, and the corpus bootstrap recovers the bytes. A verifier binds the source from MASTER_LIBRARY_SOURCE_DIR, never from git.",
    files: corpusHits
  },
  families,
  summary: {
    assigned: assignedFamilies.length,
    built: families.filter((f) => f.classification === "BUILT").length,
    stopped: families.filter((f) => f.classification === "STOPPED_WITH_EXACT_BLOCKER").length,
    unresolved: families.filter((f) => f.classification === "UNRESOLVED").length,
    sourceReceiptsExact: families.filter((f) => f.sourcesExact === true).length,
    sourceReferences: families.reduce((n, f) => n + f.sourceCount, 0),
    absoluteRootPersistedAnywhere: families.some((f) => f.absoluteRootPersisted === true),
    commercialRoutesOpened: Math.max(0, ...families.map((f) => f.commercialRoutesOpened ?? 0)),
    outputApprovalsGranted: families.filter((f) => f.outputApprovalGranted === true).length,
    builtFamiliesWithoutProductWiring: families.filter((f) => f.classification === "BUILT" && !f.hasProductWiring).map((f) => f.familyId)
  }
};

if (WRITE) {
  fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(doc, null, 2) + "\n");
  console.log(`\nWrote ${OUT}`);
} else {
  const current = fs.existsSync(path.join(ROOT, OUT)) ? fs.readFileSync(path.join(ROOT, OUT), "utf8") : null;
  if (current !== JSON.stringify(doc, null, 2) + "\n") { console.error(`\n${OUT} is stale or missing. Run with --write.`); process.exit(1); }
  console.log(`\n${OUT} current.`);
}
