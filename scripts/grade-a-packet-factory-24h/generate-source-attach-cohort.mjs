import fs from "node:fs";

const d = JSON.parse(fs.readFileSync("data/rcap-grade-a/fable-packet-factory/SOURCE_BACKLOG_CLASSIFICATION.json", "utf8"));
const idx = JSON.parse(fs.readFileSync("data/rcap-all50/local-source-corpus-index.json", "utf8"));
const byPath = new Map((idx.entries ?? []).map((e) => [e.path, e]));

const READ = /^confirmed_from_document_text(_|$)/;
const oneReadAway = new Map();   // artifactId -> record
const readAndRefused = new Map();
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
    /*
     * An artifact carrying a readOutcome HAS been read; the read refused it.
     * Keying this cohort off identityConfidence alone left all eleven of
     * FABLE-A1's refusals sitting under ONE_DOCUMENT_READ_AWAY with the read
     * already done, which overstates the work remaining and would send a
     * second lane to repeat it. A1 caught that in its own return.
     *
     * A refusal is a finished result, so it leaves the cohort -- and it is not
     * discarded either: these are the artifacts where reading the document
     * produced a question rather than a binding, and the question is named.
     */
    if (a.readOutcome) { if (!readAndRefused.has(id)) readAndRefused.set(id, { ...rec, readOutcome: a.readOutcome }); continue; }
    if (indexed) { if (!oneReadAway.has(id)) oneReadAway.set(id, rec); }
    else if (h.pathInArchive) { if (!outsideIndex.has(id)) outsideIndex.set(id, rec); }
  }
}

const famCount = (m) => new Set([...m.values()].flatMap((r) => r.servesFamilies)).size;
const byCustody = (m) => { const c = {}; for (const r of m.values()) c[r.custody ?? "(none)"] = (c[r.custody ?? "(none)"] ?? 0) + 1; return c; };
const byConfidence = (m) => { const c = {}; for (const r of m.values()) c[r.identityConfidence ?? "(none)"] = (c[r.identityConfidence ?? "(none)"] ?? 0) + 1; return c; };

/* ---- the generic source-blocked population, sized against the D packs -------
 *
 * A family is generically source-blocked when the queue says SOURCE_BLOCKED and
 * no classification entry names an actionable class for it. That population is
 * the one the mission is trying to drive to zero, and until now nobody could
 * say which of them the newly installed d_source_packs custody can reach.
 *
 * This measures it three ways, because the three call for different work:
 *
 *   STRING_MATCHED     — the reconciler's own two tiers already bind a named
 *                        form to a D-pack document. These need nothing but a
 *                        reconciliation run.
 *   JURISDICTION_HELD  — the packs carry documents for this family's state, but
 *                        no named form matches by string. The census labels and
 *                        the packs' form numbers are simply different names for
 *                        the same paper, which is exactly what the reconciler's
 *                        read-identity tier exists to settle: open the document,
 *                        read page one, record the sentence.
 *   NOT_IN_THE_PACKS   — the packs carry nothing for this jurisdiction at all.
 *                        No amount of reading reaches these; they need an
 *                        acquisition or a composed treatment.
 *
 * The counts are recomputed here rather than remembered, so a pack landing or a
 * family attaching moves them without anyone editing a list.
 */
const master = JSON.parse(fs.readFileSync("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json", "utf8"));
const classifiedFamilies = new Set((d.entries ?? []).map((e) => e.familyId));
const dPack = (idx.entries ?? []).filter((e) => e.custody === "d_source_packs");
const dPackByState = new Map();
for (const e of dPack) { if (!dPackByState.has(e.state)) dPackByState.set(e.state, []); dPackByState.get(e.state).push(e); }
const normForm = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const formTokens = (v) => String(v ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
const dPackByForm = new Map();
for (const e of dPack) { const k = normForm(e.formNumber); if (!dPackByForm.has(k)) dPackByForm.set(k, []); dPackByForm.get(k).push(e); }

const genericBlocked = { STRING_MATCHED: [], JURISDICTION_HELD: [], NOT_IN_THE_PACKS: [] };
for (const f of master.families) {
  if (f.state !== "SOURCE_BLOCKED" || classifiedFamilies.has(f.familyId)) continue;
  const named = (f.sourceReadiness?.reasons ?? [])
    .map((r) => (r.match(/^official-form:(.+?):/) ?? [])[1]).filter(Boolean);
  const matched = [];
  for (const label of named) {
    const exact = dPackByForm.get(normForm(label)) ?? [];
    if (exact.length === 1) { matched.push({ label, path: exact[0].path, tier: "exact_form_number" }); continue; }
    const lt = formTokens(label);
    if (lt.length < 3) continue;
    const cand = dPack.filter((e) => e.state === f.jurisdiction && e.formNumber
      && lt.every((t) => new Set(formTokens(e.formNumber)).has(t)));
    if (cand.length === 1) matched.push({ label, path: cand[0].path, tier: "token_subset_same_jurisdiction" });
  }
  const inState = dPackByState.get(f.jurisdiction) ?? [];
  const row = { familyId: f.familyId, jurisdiction: f.jurisdiction, namedForms: named, dPackDocumentsInJurisdiction: inState.length };
  if (matched.length) genericBlocked.STRING_MATCHED.push({ ...row, matched });
  else if (inState.length) genericBlocked.JURISDICTION_HELD.push(row);
  else genericBlocked.NOT_IN_THE_PACKS.push(row);
}

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

  readAndRefused: {
    name: "READ_AND_REFUSED",
    artifacts: readAndRefused.size,
    familiesAffected: famCount(readAndRefused),
    whatIsTrueOfThemAll: "Somebody opened the document and what it said did not establish the identity the family names. These are finished reads, not owed ones.",
    whatIsOwed: "A determination, not another read. Each entry's readOutcome names the question: one census label over two held documents, a held document narrower than the label it is asked to serve, or a later revision than the family names.",
    artifactList: [...readAndRefused.values()].sort((a, b) => a.artifactId.localeCompare(b.artifactId))
  },

  genericSourceBlocked: {
    whatThisIs: "families the queue calls SOURCE_BLOCKED that carry no actionable classification, measured against what the D source packs actually hold",
    total: genericBlocked.STRING_MATCHED.length + genericBlocked.JURISDICTION_HELD.length + genericBlocked.NOT_IN_THE_PACKS.length,
    STRING_MATCHED: {
      count: genericBlocked.STRING_MATCHED.length,
      whatIsOwed: "a reconciliation run; the reconciler's own tiers already bind these",
      families: genericBlocked.STRING_MATCHED
    },
    JURISDICTION_HELD: {
      count: genericBlocked.JURISDICTION_HELD.length,
      whatIsOwed: "one document read each: the packs hold paper for this jurisdiction under different form numbers than the census uses, and the read-identity tier is what settles that",
      families: genericBlocked.JURISDICTION_HELD
    },
    NOT_IN_THE_PACKS: {
      count: genericBlocked.NOT_IN_THE_PACKS.length,
      whatIsOwed: "an acquisition or a composed treatment; no reading reaches a jurisdiction the packs do not carry",
      families: genericBlocked.NOT_IN_THE_PACKS
    }
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
console.log(`read and refused: ${doc.readAndRefused.artifacts} artifact(s) / ${doc.readAndRefused.familiesAffected} famil(ies) — a determination each`);
console.log(`generic source-blocked: ${doc.genericSourceBlocked.total} — ${doc.genericSourceBlocked.STRING_MATCHED.count} string-matched, ${doc.genericSourceBlocked.JURISDICTION_HELD.count} one read away, ${doc.genericSourceBlocked.NOT_IN_THE_PACKS.count} not in the packs`);
