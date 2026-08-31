#!/usr/bin/env node
/**
 * Official URLs this repository already holds, ranked by what they would unblock.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-url-promotion-candidates.mjs [--check]
 *
 * The acquisition manifest was built from two receipt files. A sweep of the
 * committed records found 193 corroborated official URLs, and 173 of them had
 * never been queued — including the Texas statement of inability, which gates
 * ten families and appears in twenty-six committed files.
 *
 * WHY THESE ARE CANDIDATES AND NOT MANIFEST ENTRIES
 *
 * The URLs sit in prose: "The Statement of Inability to Afford Payment of Court
 * Costs or an Appeal Bond, if you need it, at https://...". A regex can pair a
 * title with an address there, and it can also pair the wrong ones two
 * sentences later. A mis-paired entry does not fail loudly — it fetches a real
 * PDF from a real court and files a receipt binding those bytes to a form
 * number they do not belong to, which is worse than not fetching at all.
 *
 * So this ranks and evidences them, and a DISC lane confirms the pairing before
 * anything enters the manifest. What is mechanical here is the ranking, the
 * corroboration count and the host check. What is not mechanical is whether
 * this URL is that form, and nothing here pretends otherwise.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const OUT = "data/rcap-grade-a/packet-factory-24h/SOURCE_URL_PROMOTION_CANDIDATES.json";
const MASTER = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const MANIFEST = "data/rcap-grade-a/packet-factory-24h/SOURCE_ACQUISITION_MANIFEST.json";
const ACQUIRE = "scripts/rcap-acquire-official-source.mjs";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const master = read(MASTER);
const manifest = read(MANIFEST);
const alreadyQueued = new Set(manifest.entries.map((e) => e.officialUrl));

/* The host policy, read from its one authority. */
const acquireText = fs.readFileSync(path.join(ROOT, ACQUIRE), "utf8");
const suffixes = [...(/const ALLOWED_HOST_SUFFIXES = \[([\s\S]*?)\];/.exec(acquireText)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const exact = new Set([...(/const ALLOWED_EXACT_HOSTS = new Map\(\[([\s\S]*?)\n\]\);/.exec(acquireText)?.[1] ?? "").matchAll(/\["([^"]+)", \{/g)].map((m) => m[1]));
const refused = new Set([...(/const REFUSED_HOSTS = new Set\(\[([\s\S]*?)\]\);/.exec(acquireText)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]));
const hostAllowed = (h) => exact.has(h) || suffixes.some((s) => h === s.replace(/^\./, "") || h.endsWith(s));

const EVIDENCE_ROOTS = ["data/rcap-all50", "data/rcap-grade-a", "data/record-clearing"];
const CANDIDATE_MARKER = /route-obligation-census-candidate|-candidate\.json$|\/candidate/i;
/*
 * This generator's own outputs are not evidence about the world.
 *
 * The sweep reads data/rcap-grade-a, and this file is written into it. On the
 * first run 167 URLs were corroborated; on the second, 179 — twelve addresses
 * crossed the two-file threshold because THIS FILE now mentioned them, and the
 * count then sat stable at 179 looking every bit as settled as a real one.
 *
 * A record that cites itself is not corroboration, it is an echo, and an echo
 * that converges is the most convincing kind. Every artifact derived from this
 * sweep is excluded from it by name.
 */
const SELF_WRITTEN = [
  "SOURCE_URL_PROMOTION_CANDIDATES.json",
  "SOURCE_IDENTITY_FINDINGS.json",
  "SOURCE_ACQUISITION_MANIFEST.json",
  "SOURCE_CONVEYOR_ASSIGNMENTS.json",
  "STALE_LANE_RETURNS.json"
];
const isSelfWritten = (rel) => SELF_WRITTEN.some((n) => rel.endsWith(`/${n}`));
const URL_RE = /https:\/\/[^\s"'\\)]+\.pdf/gi;
const CORROBORATION_THRESHOLD = 2;

const seen = new Map();
const walk = (dir) => {
  let entries = [];
  try { entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { walk(rel); continue; }
    if (!e.name.endsWith(".json")) continue;
    if (isSelfWritten(rel)) continue;
    let body = null;
    try { body = fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { continue; }
    const isCandidate = CANDIDATE_MARKER.test(rel);
    for (const m of body.matchAll(URL_RE)) {
      const url = m[0].replace(/[.,;]+$/, "");
      if (!seen.has(url)) seen.set(url, { url, files: new Set(), candidateFiles: new Set() });
      (isCandidate ? seen.get(url).candidateFiles : seen.get(url).files).add(rel);
    }
  }
};
for (const r of EVIDENCE_ROOTS) walk(r);

/* Blocked families by jurisdiction — what a URL in that state could reach. */
const blockedByJurisdiction = new Map();
for (const f of master.families) {
  if (f.state !== "SOURCE_BLOCKED") continue;
  const j = f.jurisdiction;
  if (!blockedByJurisdiction.has(j)) blockedByJurisdiction.set(j, []);
  blockedByJurisdiction.get(j).push(f.familyId);
}

/* The jurisdiction a URL most likely serves, from its host and path. Stated as
 * an inference, never as a fact: a .gov host names a state, a path does not
 * name a form. */
const JURISDICTION_HOST = [
  [/txcourts\.gov/i, "TX"], [/utcourts\.gov/i, "UT"], [/vacourts\.gov/i, "VA"],
  [/nccourts\.gov/i, "NC"], [/kycourts\.gov/i, "KY"], [/courts\.wa\.gov/i, "WA"],
  [/wicourts\.gov|wisdoj\.gov/i, "WI"], [/nebraskajudicial\.gov/i, "NE"],
  [/courts\.alaska\.gov|akcourts/i, "AK"], [/vermontjudiciary\.org|vtcourts/i, "VT"],
  [/illinoiscourts|ilcourts|prb\.illinois\.gov/i, "IL"], [/iowacourts\.gov|dps\.iowa\.gov/i, "IA"],
  [/courts\.michigan\.gov/i, "MI"], [/mass\.gov/i, "MA"], [/in\.gov/i, "IN"],
  [/fdle\.state\.fl\.us|flcourts/i, "FL"], [/kjc\.ks\.gov|kscourts/i, "KS"],
  [/judicial\.alabama\.gov|alacourt/i, "AL"], [/courts\.mo\.gov/i, "MO"],
  [/legis\.la\.gov|lasc\.org/i, "LA"], [/courts\.oregon\.gov|ojd/i, "OR"],
  [/pacourts\.us/i, "PA"], [/coloradojudicial|courts\.state\.co\.us/i, "CO"],
  [/jud\.ct\.gov/i, "CT"], [/courts\.maryland\.gov|mdcourts/i, "MD"],
  [/courts\.wv\.gov|wvcourts/i, "WV"], [/ujs\.sd\.gov/i, "SD"], [/utcourts/i, "UT"]
];
const jurisdictionOf = (url) => {
  let host = null;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  for (const [re, j] of JURISDICTION_HOST) if (re.test(host)) return j;
  return null;
};

const candidates = [];
const refusedRows = [];
for (const x of seen.values()) {
  const corroboration = x.files.size;
  let host = null;
  try { host = new URL(x.url).hostname.toLowerCase(); } catch { refusedRows.push({ url: x.url, why: "not a parsable URL" }); continue; }
  if (alreadyQueued.has(x.url)) continue;
  if (refused.has(host)) { refusedRows.push({ url: x.url, why: `${host} is a commercial form site` }); continue; }
  if (!hostAllowed(host)) { refusedRows.push({ url: x.url, why: `${host} is not an allowlisted official host` }); continue; }
  if (corroboration < CORROBORATION_THRESHOLD) {
    refusedRows.push({
      url: x.url, why: `corroborated in ${corroboration} non-candidate file(s); ${CORROBORATION_THRESHOLD} required`,
      candidateOnlyFiles: [...x.candidateFiles].slice(0, 3)
    });
    continue;
  }
  const jurisdiction = jurisdictionOf(x.url);
  const reachable = jurisdiction ? (blockedByJurisdiction.get(jurisdiction) ?? []) : [];
  candidates.push({
    url: x.url, host, corroboration,
    corroboratingFiles: [...x.files].sort().slice(0, 6),
    jurisdictionInferredFromHost: jurisdiction,
    jurisdictionIsInferred: "from the host name only. The host names a state; it does not name a form.",
    blockedFamiliesInThatJurisdiction: reachable.length,
    exampleBlockedFamilies: reachable.slice(0, 4),
    filenameFromPath: decodeURIComponent(x.url.split("/").pop() ?? ""),
    whatDiscMustConfirm: [
      "that this URL is the document the blocked families actually need, not merely a document from the same court",
      "the exact official title and form number, from the document or its publisher",
      "which specific familyIds it releases"
    ],
    mayEnterTheManifest: false
  });
}
candidates.sort((a, b) => b.blockedFamiliesInThatJurisdiction - a.blockedFamiliesInThatJurisdiction || b.corroboration - a.corroboration);

const doc = {
  schemaVersion: "rcap-source-url-promotion-candidates/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-url-promotion-candidates.mjs",
  question: "The manifest holds 20 URLs. How many does this repository actually have?",
  answer: `${candidates.length} corroborated official URLs on allowlisted government hosts that are not queued, against a manifest of ${manifest.entries.length}.`,
  whyTheseAreNotManifestEntries: "The URLs sit in prose beside their titles. A regex can pair them correctly and can also pair them wrongly two sentences later, and a mis-paired entry does not fail loudly — it fetches a real PDF from a real court and files a receipt binding those bytes to a form number they do not belong to. Ranking, corroboration and the host check are mechanical. Whether this URL is that form is not, and a DISC lane confirms it before anything is queued.",
  corroborationRule: `At least ${CORROBORATION_THRESHOLD} distinct NON-CANDIDATE committed files must carry the URL. A URL in one file is a guess with a filename, and candidate records do not count toward corroboration at all.`,
  hostPolicyAuthority: ACQUIRE,
  counts: {
    distinctUrlsSeen: seen.size,
    alreadyInManifest: manifest.entries.length,
    promotionCandidates: candidates.length,
    refused: refusedRows.length,
    reachingBlockedFamilies: candidates.filter((c) => c.blockedFamiliesInThatJurisdiction > 0).length
  },
  candidates,
  refused: refusedRows.slice(0, 60),
  whatThisDoesNotEstablish: [
    "that any URL here is the document a blocked family needs",
    "that any of these has been fetched, hashed or promoted",
    "that a jurisdiction inferred from a host is the jurisdiction of the form"
  ],
  commercialRoutesOpened: 0,
  productionTouched: false
};

const problems = [];
if (candidates.some((c) => c.mayEnterTheManifest !== false)) problems.push("a candidate is marked as admissible without DISC confirmation");
if (candidates.some((c) => c.corroboration < CORROBORATION_THRESHOLD)) problems.push("a candidate below the corroboration threshold survived");
if (candidates.some((c) => !hostAllowed(c.host))) problems.push("a candidate on a non-allowlisted host survived");
{
  const echoes = candidates.filter((c) => c.corroboratingFiles.some((f) => isSelfWritten(f)));
  if (echoes.length) {
    problems.push(`${echoes.length} candidate(s) corroborated by this generator's own output; the sweep is citing itself: ${echoes.slice(0, 2).map((c) => c.corroboratingFiles.filter(isSelfWritten).join(",")).join(" | ")}`);
  }
}
if (problems.length) {
  console.error(`URL promotion candidates: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`url promotion candidates current: ${candidates.length} candidate(s), ${refusedRows.length} refused.`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
console.log("");
console.log(`  ${seen.size} distinct URL(s) in committed evidence · ${manifest.entries.length} in the manifest · ${candidates.length} corroborated and unqueued · ${refusedRows.length} refused`);
for (const c of candidates.slice(0, 8)) {
  console.log(`    ${String(c.jurisdictionInferredFromHost ?? "??").padEnd(3)} ${String(c.blockedFamiliesInThatJurisdiction).padStart(2)} blocked · x${String(c.corroboration).padStart(2)} · ${c.filenameFromPath.slice(0, 62)}`);
}
