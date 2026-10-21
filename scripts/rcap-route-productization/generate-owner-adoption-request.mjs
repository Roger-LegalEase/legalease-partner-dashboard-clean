/**
 * The one act that unblocks the largest group of proven families.
 *
 * Forty-odd families are packet-proven, route-scoped and waiting on exactly the
 * same thing: the decision owner adopting them at the completed-output level,
 * naming the exact shipping-artifact digests -- the act OWN-ADOPT-2026-09-02-
 * BATCH-53 already performed once for fifty-three families. Fifty-three sit
 * inside some owner approval today and six have a CURRENT one, because the
 * packets moved after they were adopted and an approval that names a digest
 * stops applying when the digest changes.
 *
 * This generator does not adopt anything. It assembles the request: every
 * family whose only first unmet chain link is a current legal approval, each
 * bound to the canonical and boundary SHA-256 measured from the tree at this
 * commit, so the owner reviews one document instead of performing forty
 * lookups. If a fixture is missing or unreadable the family is listed as not
 * ready to ask about rather than asked about with a hole in it.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const CENSUS = "data/rcap-grade-a/route-productization/PROVEN_FAMILY_PRODUCTIZATION_CENSUS.json";
const QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const OUT = "data/rcap-grade-a/legal-decisions/OWNER_ADOPTION_REQUEST_PENDING.json";

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const census = read(CENSUS);
const queue = read(QUEUE);
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();

const queueByFamily = new Map((queue.families ?? queue.rows).map((f) => [f.familyId, f]));

/* The families whose FIRST unmet link is a current legal approval, and whose
 * single next action is the owner adopting them. A family that needs a legal
 * section bound to a decision, or a re-review, is a different ask and is
 * separated out rather than folded in. */
const candidates = (census.provenFamilies ?? []).filter((f) => f.chainFirstUnmetLink === "currentLegalApproval");
const adoptionAsk = candidates.filter((f) => /must adopt family/.test(String(f.singleNextAction ?? "")));
const otherAsk = candidates.filter((f) => !/must adopt family/.test(String(f.singleNextAction ?? "")));

const digestOf = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  const bytes = fs.readFileSync(abs);
  return { file: rel, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), byteLength: bytes.length };
};

/* Three fixture layouts are in use and only one of them is fixtures/canonical.pdf
 * with fixtures/boundary.pdf beside it. A route-variant family keeps one
 * subdirectory per variant, each holding a PDF per component; a multi-form
 * family keeps flat siblings named <form>-canonical-filled.pdf and
 * <form>-boundary-filled.pdf. Assuming the first layout reported fourteen
 * families as having no shipping artifact at all, several of which ship six --
 * an adoption request that told the owner that would have been worse than no
 * request. So the fixtures directory is WALKED, and every PDF under it is a
 * shipping artifact, classified canonical or boundary by where it sits. */
const walkPdfs = (relDir) => {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir)) return [];
  const found = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else if (e.name.toLowerCase().endsWith(".pdf")) found.push(child);
    }
  };
  walk(relDir);
  return found.sort();
};

/* canonical or boundary is decided by the path, and a path that says neither is
 * reported as unclassified rather than guessed into one of them. */
const fixtureRoleOf = (rel) => {
  const p = rel.toLowerCase();
  const boundary = /boundary/.test(p);
  const canonical = /canonical/.test(p);
  if (boundary && !canonical) return "boundary";
  if (canonical && !boundary) return "canonical";
  return null;
};

const ready = [];
const notReadyToAsk = [];
for (const f of adoptionAsk) {
  const q = queueByFamily.get(f.familyId);
  const dir = q?.directory ?? q?.familyDirectory ?? null;
  if (!dir) {
    notReadyToAsk.push({ familyId: f.familyId, why: "the queue row names no family directory, so no shipping artifact can be bound" });
    continue;
  }
  const pdfs = walkPdfs(`${dir}/fixtures`);
  if (pdfs.length === 0) {
    notReadyToAsk.push({ familyId: f.familyId, directory: dir, why: "no PDF under the family fixtures directory at this commit; an adoption cannot name a digest that does not exist" });
    continue;
  }
  const artifacts = pdfs.map((rel) => ({ fixture: fixtureRoleOf(rel), ...digestOf(rel) }));
  const unclassified = artifacts.filter((a) => a.fixture === null);
  if (unclassified.length) {
    notReadyToAsk.push({
      familyId: f.familyId, directory: dir,
      why: `${unclassified.length} of ${artifacts.length} shipping PDFs name neither canonical nor boundary in their path, so which bytes the adoption would cover cannot be stated without guessing`,
      unclassified: unclassified.map((a) => a.file)
    });
    continue;
  }
  const canonicalCount = artifacts.filter((a) => a.fixture === "canonical").length;
  const boundaryCount = artifacts.length - canonicalCount;
  if (canonicalCount === 0 || boundaryCount === 0) {
    notReadyToAsk.push({
      familyId: f.familyId, directory: dir,
      why: `the fixtures directory holds ${canonicalCount} canonical and ${boundaryCount} boundary PDFs; an adoption names both faces of what ships`
    });
    continue;
  }
  ready.push({
    familyId: f.familyId,
    jurisdiction: f.jurisdiction ?? null,
    implementationStrategy: f.implementationStrategy ?? null,
    factoryState: f.factoryState ?? null,
    directory: dir,
    routes: (f.routes ?? []).map((r) => (typeof r === "string" ? r : r.routeId ?? r.routeKey ?? r.runtimeRoute ?? null)).filter(Boolean),
    shippingArtifacts: artifacts,
    shippingArtifactCount: artifacts.length,
    fixtureLayout: artifacts.length === 2 ? "one canonical and one boundary" : `${canonicalCount} canonical and ${boundaryCount} boundary; this family ships more than one document set and the adoption covers every one of them`,
    whatRemainsAfterAdoption: f.remainingStepsToAFulfillmentRecord ?? null,
    stepsOnlyTheOwnerCanTake: f.remainingStepsOnlyRogerCanTake ?? null
  });
}
ready.sort((a, b) => a.familyId.localeCompare(b.familyId));

const doc = {
  schemaVersion: "rcap-grade-a-owner-adoption-request/v1",
  recordId: "OWN-ADOPT-REQUEST-PENDING",
  createsApproval: false,
  isAnApproval: false,
  whatThisIs: "A request assembled for the decision owner. It adopts nothing, approves nothing, opens no route and grants no runtime, payment, sponsorship or production authority. Reading it changes no state; only the owner's own returned decision does.",
  producedBy: "scripts/rcap-route-productization/generate-owner-adoption-request.mjs",
  producedAtCommit: commit,
  precedent: {
    recordId: "OWN-ADOPT-2026-09-02-BATCH-53",
    decidedOn: "2026-09-02",
    familiesAdopted: 53,
    whyItIsThePrecedent: "It is the same act in the same shape: adoption at the completed-output level with the exact shipping-artifact digests recorded per family. This request asks for one more of those, not for something new."
  },
  theAsk: "Adopt the families listed below at the completed-output level, at the exact canonical and boundary digests named for each. One decision covers all of them.",
  whyItIsOneDecisionAndNotMany: "Every family here is blocked at the same first unmet chain link and every one names the same single next action. Split into separate asks it is the same work for the owner performed dozens of times over.",
  whyTheseAreNotAlreadyCovered: "Fifty-three families sit inside an owner approval and six have a current one. An adoption names exact digests, so when a packet is rebuilt or repaired the adoption stops describing what would ship. These families have moved since they were last adopted, or were never adopted.",
  counts: {
    provenFamilies: census.counters?.provenFamilies ?? null,
    blockedAtCurrentLegalApproval: candidates.length,
    adoptionWouldUnblock: ready.length,
    notReadyToAskAbout: notReadyToAsk.length,
    aDifferentOwnerAsk: otherAsk.length
  },
  families: ready,
  notReadyToAskAbout: notReadyToAsk,
  aDifferentOwnerAskNotBundledHere: otherAsk.map((f) => ({
    familyId: f.familyId,
    singleNextAction: f.singleNextAction ?? null,
    whyItIsSeparate: "This family needs something other than adoption at the completed-output level, so folding it into a batch adoption would ask the owner to grant one thing while a different thing is what is missing."
  })),
  whatAdoptionWouldAndWouldNotDo: {
    would: "Satisfy the current-legal-approval link for each family named, at the exact digests named, so the productization chain can advance to its next link.",
    wouldNot: [
      "open any route",
      "grant runtime, technical, visual, payment, sponsorship or production authority",
      "substitute for a hosted consumer canary or a hosted sponsored canary",
      "substitute for a fulfillment-authority record",
      "survive a change to the named digests -- a rebuilt packet needs a fresh adoption"
    ]
  },
  howToVerifyThisRequestBeforeSigning: "Every digest below was measured from the working tree at the commit named above, not copied from a receipt. Recompute any of them with sha256sum on the named file at that commit."
};

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${OUT}`);
console.log(`  blocked at currentLegalApproval : ${candidates.length}`);
console.log(`  adoption would unblock          : ${ready.length}`);
console.log(`  not ready to ask about          : ${notReadyToAsk.length}`);
console.log(`  a different owner ask           : ${otherAsk.length}`);
for (const n of notReadyToAsk) console.log(`    ! ${n.familyId}: ${n.why}`);
