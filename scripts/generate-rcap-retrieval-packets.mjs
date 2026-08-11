// Retrieval packets for the seven official-source obligations.
//
// Every coding terminal in this sprint has been egress-blocked to legislative
// hosts — probes to PA, SC, UT, WI and ME legislature domains all return 000
// while api.github.com returns 200, so the block is a host allowlist rather
// than an outage. Repository-only research has already been run against these
// seven and returned nothing: that is *why* they are materialization
// obligations. Running it again would produce the same nothing more expensively.
//
// So instead of dispatching research, this writes a packet per obligation for
// whoever does have access — a web-capable lane or a person. Each packet states
// what is wanted, where it plausibly lives, what counts as the operative text,
// where the retrieved bytes are filed, and the acceptance test that closes the
// obligation. The intent is that the retriever needs no context from this repo
// beyond the packet.
//
// Two kinds, and the difference matters. A CONFIRMED-CITATION packet names the
// statute and asks for its text. A PROVISIONAL packet does not know the citation
// yet and asks for identification first — the five pardon-family gaps are
// provisional precisely because no citation has been pinned, and a packet that
// asserted one would be inventing the answer it was sent to find.
//
// Usage:
//   node scripts/generate-rcap-retrieval-packets.mjs
//   node scripts/generate-rcap-retrieval-packets.mjs --check

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const graphPath = path.join(rootDir, "data/rcap-ledger/e3-job-graph.json");
const outDir = path.join(rootDir, "docs/record-clearing/retrieval-packets");
const manifestPath = path.join(rootDir, "data/rcap-ledger/retrieval-packets.json");
const check = process.argv.includes("--check");

const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));

const PACKETS = {
  "compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement": {
    kind: "confirmed_citation",
    citation: "18 Pa.C.S. § 3019 (expected — within 18 Pa.C.S. ch. 30)",
    want:
      "The operative text of Pennsylvania's human-trafficking victim vacatur/expungement remedy: who may petition, for which offences, on what showing, and what relief the court orders.",
    where: [
      "https://www.legis.state.pa.us — Pennsylvania Consolidated Statutes, Title 18, Chapter 30",
      "https://www.palegis.us statute browser",
      "A commercial database copy is acceptable ONLY if it reproduces the statutory text verbatim with its citation"
    ],
    operativeTest:
      "The text must state the vacatur/expungement remedy itself. A definitions or penalties section of chapter 30 is not the operative provision and does not close this.",
    whyItMatters:
      "This is the sole unreconciled surplus in the entire crosswalk: Pennsylvania is the one jurisdiction of seven whose compiled surplus is not fully explained, and this pathway is the reason.",
    closes: "the PA surplus reconciliation AND one of the 30 Milestone 1 item 2 pathway blockers"
  },
  "compiled_pathway:SC:human-trafficking-survivor-expungement": {
    kind: "confirmed_citation",
    citation: "S.C. Code § 16-3-2020",
    want:
      "The operative text of South Carolina's trafficking-survivor relief provision, including any expungement or vacatur remedy it grants and the conditions on it.",
    where: [
      "https://www.scstatehouse.gov — S.C. Code of Laws, Title 16, Chapter 3",
      "South Carolina Legislative Council code browser"
    ],
    operativeTest:
      "The section must be shown to grant (or withhold) record relief. If § 16-3-2020 turns out to be definitional or penal only, record that finding — a proven absence closes this obligation as terminal just as well as a proven text.",
    whyItMatters:
      "No committed source in the repository contains this section, so the conclusion currently rests on an unverifiable citation.",
    closes: "one of the 30 Milestone 1 item 2 pathway blockers"
  }
};

const PROVISIONAL = {
  "compiled_pathway:ME:pardon-route": {
    jurisdiction: "Maine",
    subject: "the executive pardon route as a record-relief pathway",
    startingPoints: [
      "https://legislature.maine.gov — Maine Revised Statutes, Title 15 (Court Procedure — Criminal)",
      "Maine Constitution, Article V, Part First (executive clemency power)",
      "Maine Governor's Board on Executive Clemency published procedure"
    ]
  },
  "compiled_pathway:SC:pardon-guidance-for-otherwise-ineligible-convictions": {
    jurisdiction: "South Carolina",
    subject: "pardon guidance for convictions otherwise ineligible for expungement",
    startingPoints: [
      "https://www.scstatehouse.gov — S.C. Code Title 24, Chapter 21 (Probation, Parole and Pardon)",
      "S.C. Department of Probation, Parole and Pardon Services published pardon criteria"
    ]
  },
  "compiled_pathway:UT:path-k-pardon-based-expungement": {
    jurisdiction: "Utah",
    subject: "pardon-based expungement",
    startingPoints: [
      "https://le.utah.gov — Utah Code Title 77, Chapter 40a (Expungement of Criminal Records)",
      "Utah Board of Pardons and Parole published procedure"
    ]
  },
  "compiled_pathway:UT:path-m-juvenile-expungement": {
    jurisdiction: "Utah",
    subject: "juvenile record expungement",
    startingPoints: [
      "https://le.utah.gov — Utah Code Title 80 (Utah Juvenile Code), expungement provisions",
      "Utah Code Title 77, Chapter 40a, for any cross-reference to juvenile records"
    ]
  },
  "compiled_pathway:WI:executive-pardon-guidance": {
    jurisdiction: "Wisconsin",
    subject: "the executive pardon route as a record-relief pathway",
    startingPoints: [
      "https://docs.legis.wisconsin.gov — Wisconsin Statutes ch. 304 (Pardons) and ch. 973",
      "Wisconsin Constitution art. V, § 6 (pardon power)",
      "Wisconsin Governor's Pardon Advisory Board published procedure"
    ]
  }
};

const jobsById = new Map(graph.jobs.map((j) => [j.id, j]));
const targets = graph.jobs
  .filter((j) => j.obligations.some((o) => o.obligation === "materialize_official_source"))
  .map((j) => j.id)
  .sort();

const problems = [];
for (const id of targets) {
  if (!PACKETS[id] && !PROVISIONAL[id]) problems.push(`no retrieval packet defined for materialization obligation ${id}`);
}
for (const id of [...Object.keys(PACKETS), ...Object.keys(PROVISIONAL)]) {
  if (!targets.includes(id)) problems.push(`packet ${id} does not correspond to a live materialization obligation`);
}
if (problems.length > 0) {
  console.error("generate-rcap-retrieval-packets FAILED");
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}

const FILING = (id) =>
  `private/Nationwide Record Clearing/${id.split(":")[1]}/official-sources/ — commit the retrieved bytes verbatim (PDF or HTML as served), then record the citation in data/rcap-ledger/crosswalk-adjudications.json.`;

const files = new Map();

for (const id of targets) {
  const job = jobsById.get(id);
  const slug = id.replace(/[:/]/g, "_");
  const confirmed = PACKETS[id];
  const provisional = PROVISIONAL[id];
  const L = [];

  L.push(`# Retrieval packet — ${id}`);
  L.push("");
  L.push(`- **Jurisdiction:** ${job.jurisdiction}`);
  L.push(`- **Packet type:** ${confirmed ? "confirmed citation — fetch known text" : "provisional — identify the citation first"}`);
  L.push(`- **Blocks:** ${job.obligations.some((o) => o.milestone1Item2) ? "a Milestone 1 item 2 blocker" : "a registry-gap blocker's provisional status"}`);
  L.push("");
  L.push("## Why this is a packet and not a research task");
  L.push("");
  L.push(
    "Repository-only research has already been run against this obligation and found nothing — that is why it is a materialization obligation rather than a closed conclusion. Every coding terminal in this sprint is egress-blocked to legislative hosts (probes return 000 while api.github.com returns 200). Re-running repository research would return the same nothing. This needs someone with outbound access or a law library."
  );
  L.push("");

  if (confirmed) {
    L.push("## What is wanted");
    L.push("");
    L.push(`**Citation:** ${confirmed.citation}`);
    L.push("");
    L.push(confirmed.want);
    L.push("");
    L.push("## Where to look");
    L.push("");
    for (const w of confirmed.where) L.push(`- ${w}`);
    L.push("");
    L.push("## What counts as the operative provision");
    L.push("");
    L.push(confirmed.operativeTest);
    L.push("");
    L.push("## Why it matters");
    L.push("");
    L.push(confirmed.whyItMatters);
    L.push("");
    L.push("## Acceptance test");
    L.push("");
    L.push(`Closing this obligation requires the retrieved text to be committed and cited. It closes ${confirmed.closes}.`);
  } else {
    L.push("## What is wanted");
    L.push("");
    L.push(
      `The operative citation for **${provisional.subject}** in ${provisional.jurisdiction}, and then its text. This gap is recorded as *provisional* because no citation has been pinned — so the first deliverable is the identification, not a confirmation.`
    );
    L.push("");
    L.push("**Do not treat the starting points below as the answer.** They are where to begin looking. If the operative authority turns out to be a constitutional clemency provision with no statutory record-relief remedy, that is a real and reportable finding: it would mean the registry gap should be recorded as constitutional-clemency-only rather than left provisional.");
    L.push("");
    L.push("## Starting points");
    L.push("");
    for (const s of provisional.startingPoints) L.push(`- ${s}`);
    L.push("");
    L.push("## Acceptance test");
    L.push("");
    L.push(
      "Either an operative citation is pinned and its text committed, or it is established on the record that no statutory record-relief provision exists for this route. Either outcome lets the gap blocker leave provisional status; neither requires guessing."
    );
  }

  L.push("");
  L.push("## Where to file what comes back");
  L.push("");
  L.push(FILING(id));
  L.push("");
  L.push("## What NOT to do");
  L.push("");
  L.push("- Do not paraphrase the statute into the adjudication input. Commit the bytes as served and cite them.");
  L.push("- Do not substitute a secondary source (practice guide, law-firm summary, encyclopaedia) for the operative text. Secondary authority standing in for primary is a flagged defect in the source-support audit.");
  L.push("- Do not close the obligation on a citation that cannot be read. An unverifiable citation is what created this obligation.");
  L.push("");

  files.set(path.join(outDir, `${slug}.md`), `${L.join("\n")}\n`);
}

// A packet whose obligation has been CLOSED by a materialized, hash-receipted
// official source is no longer a live instruction — it is preserved retrieval
// evidence, pinned by sha256 in the final-official-sources receipts. Freezing
// happens here: when the committed packet bytes match the receipt's pin, those
// bytes are canonical and regeneration must not rewrite them. If the committed
// bytes have drifted from the pin, the computed body stands and the drift
// surfaces as staleness here and as a hash failure in the source verifier.
const officialSourcesRecordPath = path.join(
  rootDir,
  "data/rcap-crosswalk-enrichment/final-official-sources/final-official-sources.json"
);
if (fs.existsSync(officialSourcesRecordPath)) {
  const record = JSON.parse(fs.readFileSync(officialSourcesRecordPath, "utf8"));
  for (const subject of record.subjects || []) {
    if (subject.resolution !== "materialized") continue;
    if (subject.retrievalPacket?.preserved !== true || !subject.retrievalPacket.sha256) continue;
    const packetAbs = path.join(rootDir, subject.retrievalPacket.path);
    if (!fs.existsSync(packetAbs)) continue;
    const committed = fs.readFileSync(packetAbs);
    if (crypto.createHash("sha256").update(committed).digest("hex") === subject.retrievalPacket.sha256) {
      files.set(packetAbs, committed.toString("utf8"));
    }
  }
}

const manifest = {
  schemaVersion: "rcap-retrieval-packets/v1",
  generatedBy: "scripts/generate-rcap-retrieval-packets.mjs",
  purpose:
    "Exact retrieval packets for the seven official-source obligations, for a web-capable or human lane. Generated because every coding terminal is egress-blocked to legislative hosts and repository-only research against these seven has already returned nothing.",
  egress: {
    probedAt: "integration tip",
    reachable: ["api.github.com"],
    blocked: ["www.legis.state.pa.us", "www.scstatehouse.gov", "le.utah.gov", "docs.legis.wisconsin.gov", "legislature.maine.gov"],
    conclusion: "host allowlist, not an outage"
  },
  input: {
    jobGraph: "data/rcap-ledger/e3-job-graph.json",
    crosswalkContentHash: graph.input.crosswalkContentHash,
    crosswalkEvidenceHash: graph.input.crosswalkEvidenceHash
  },
  packets: targets.map((id) => ({
    jobId: id,
    jurisdiction: jobsById.get(id).jurisdiction,
    type: PACKETS[id] ? "confirmed_citation" : "provisional_identification",
    citation: PACKETS[id]?.citation ?? null,
    blocksMilestone1Item2: jobsById.get(id).obligations.some((o) => o.milestone1Item2),
    packet: `docs/record-clearing/retrieval-packets/${id.replace(/[:/]/g, "_")}.md`
  }))
};

const manifestSerialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (check) {
  const failures = [];
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, "utf8") !== manifestSerialized) {
    failures.push("retrieval packet manifest is stale");
  }
  for (const [file, body] of files) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== body) failures.push(`stale packet: ${path.relative(rootDir, file)}`);
  }
  if (failures.length > 0) {
    console.error("Retrieval packets are stale. Run: npm run rcap:retrieval-packets");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(`Retrieval packets current. ${files.size} packets.`);
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
for (const [file, body] of files) fs.writeFileSync(file, body);
fs.writeFileSync(manifestPath, manifestSerialized);

console.log(`Retrieval packets written: ${files.size}`);
for (const p of manifest.packets) {
  console.log(`  ${p.jobId.padEnd(66)} ${p.type}${p.blocksMilestone1Item2 ? "  [blocks M1 item 2]" : ""}`);
}
