import fs from "node:fs";

const d = JSON.parse(fs.readFileSync("data/rcap-grade-a/fable-packet-factory/SOURCE_BACKLOG_CLASSIFICATION.json", "utf8"));
const idx = JSON.parse(fs.readFileSync("data/rcap-all50/local-source-corpus-index.json", "utf8"));
const byPath = new Map((idx.entries ?? []).map((e) => [e.path, e]));

const READ = /^confirmed_from_document_text\b/;
const oneReadAway = new Map();   // artifactId -> record
const outsideIndex = new Map();
const alreadyBinding = [];

for (const e of d.entries) {
  for (const a of e.artifacts ?? []) {
    const h = a.held ?? {};
    const id = a.artifactId ?? `${a.jurisdiction}:${a.officialTitle}`;
    const held = h.pathInArchive ? byPath.get(h.pathInArchive) : null;
    const indexed = Boolean(held) && held.sha256 === h.sha256;
    const rec = {
      artifactId: id,
      jurisdiction: a.jurisdiction ?? null,
      officialTitle: a.officialTitle ?? null,
      identityConfidence: a.identityConfidence ?? null,
      custody: h.custody ?? null,
      pathInArchive: h.pathInArchive ?? null,
      sha256: h.sha256 ?? null,
      servesFamilies: [...new Set(a.servesFamilies ?? a.namedInFamiliesAs ?? [])],
      namedInFamiliesAs: a.namedInFamiliesAs ?? []
    };
    if (READ.test(String(a.identityConfidence ?? ""))) { if (indexed) alreadyBinding.push(id); continue; }
    if (indexed) { if (!oneReadAway.has(id)) oneReadAway.set(id, rec); }
    else if (h.pathInArchive) { if (!outsideIndex.has(id)) outsideIndex.set(id, rec); }
  }
}

const famCount = (m) => new Set([...m.values()].flatMap((r) => r.servesFamilies)).size;
const byCustody = (m) => { const c = {}; for (const r of m.values()) c[r.custody ?? "(none)"] = (c[r.custody ?? "(none)"] ?? 0) + 1; return c; };
const byConfidence = (m) => { const c = {}; for (const r of m.values()) c[r.identityConfidence ?? "(none)"] = (c[r.identityConfidence ?? "(none)"] ?? 0) + 1; return c; };

const doc = {
  schemaVersion: "rcap-source-attach-cohort/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-source-attach-cohort.mjs",
  question: "FABLE-C4 established that 46 of 70 generically source-blocked families are held after all. Five attached. What stands between the repository and the other forty-one, exactly?",
  answer: "Two bounded populations and nothing else. Neither is a search: every artifact below is already named, already located, and already carries a recorded SHA-256. One population needs a page opened; the other needs an index extended to bytes this container cannot currently see.",

  whatAlreadyAttached: {
    tier: "exact_identity_confirmed_from_document_text",
    admittedBy: "scripts/grade-a-route-obligation-census/reconcile-census-source-custody.mjs",
    artifacts: alreadyBinding.sort(),
    whyTheseAndNotTheRest: "The reconciler admits an identity established by reading the document itself, and refuses one established from a title, a filename or a revision date. That line is FABLE-C4's own; this file does not move it, it measures what it costs."
  },

  cohortA: {
    name: "ONE_DOCUMENT_READ_AWAY",
    artifacts: oneReadAway.size,
    familiesServed: famCount(oneReadAway),
    whatIsTrueOfThemAll: "The bytes are held in the Master Library, the committed corpus index carries the exact path at the exact SHA-256, and FABLE-C4 established the identity from the corpus's recorded title or form number rather than from the document's own text.",
    whatIsOwed: "One read per artifact: open the held file, read the identity printed on page one, and record it as confirmed_from_document_text with the sentence it was read from. The reconciler then binds it with no further change — the tier already exists and the hash already matches.",
    whyItIsNotDoneHere: "Reading a PDF's printed identity requires the Master Library mounted (bash scripts/rcap-corpus/bootstrap-private-corpus.sh). A Captain integrating central state does not hold the corpus, and asserting an identity it has not read would be exactly the inference the tier refuses.",
    byConfidence: byConfidence(oneReadAway),
    byCustody: byCustody(oneReadAway),
    artifactList: [...oneReadAway.values()].sort((a, b) => a.artifactId.localeCompare(b.artifactId))
  },

  cohortB: {
    name: "HELD_BUT_OUTSIDE_THE_COMMITTED_INDEX",
    artifacts: outsideIndex.size,
    familiesServed: famCount(outsideIndex),
    whatIsTrueOfThemAll: "FABLE-C4 located the bytes and recorded a SHA-256, but the path is not in data/rcap-all50/local-source-corpus-index.json, which indexes the Master Library and nothing else.",
    whatIsOwed: "Extend the committed corpus index to these custodies, hashing each file at index time rather than trusting the recorded hash. Once a path is in the index at its real hash, cohort A's rule and the existing tiers reach it unchanged.",
    whyItIsNotDoneHere: "private/Nationwide Record Clearing is not mounted in this container and private/human-source-returns holds only part of what is named. An index entry written from a hash nobody recomputed is an assertion wearing a measurement's clothes.",
    byCustody: byCustody(outsideIndex),
    artifactList: [...outsideIndex.values()].sort((a, b) => a.artifactId.localeCompare(b.artifactId))
  },

  whatThisDoesNotEstablish: [
    "No family is promoted, and no family's state changes because this file exists.",
    "An artifact appearing here is not proof the family that names it will build; it is proof that its source is located and what remains to be done about it.",
    "FABLE-C3 established that 37 source obligations across this territory are held live by other lanes, and that no packet-build grant exists for any of the 67 families it read. Attaching a source does not mint a grant."
  ],
  commercialRoutesOpened: 0,
  productionTouched: false
};

fs.writeFileSync("data/rcap-grade-a/fable-packet-factory/SOURCE_ATTACH_COHORT.json", `${JSON.stringify(doc, null, 2)}\n`);
console.log(`cohort A ${doc.cohortA.artifacts} artifact(s) / ${doc.cohortA.familiesServed} famil(ies) — one read each`);
console.log(`cohort B ${doc.cohortB.artifacts} artifact(s) / ${doc.cohortB.familiesServed} famil(ies) — index extension`);
console.log(`already attached: ${alreadyBinding.length}`);
