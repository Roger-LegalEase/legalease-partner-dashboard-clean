#!/usr/bin/env node
// Source-identity resolution for the census's SOURCE_IDENTITY_UNRESOLVED rows.
//
//   node scripts/grade-a-route-obligation-census/resolve-census-source-identity.mjs --batch 2
//   node scripts/grade-a-route-obligation-census/resolve-census-source-identity.mjs --batch 2 --check
//
// WHY THIS EXISTS
//
// data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json
// classifies 166 of its 295 acquisition tasks SOURCE_IDENTITY_UNRESOLVED. That
// class mixes two different problems, and an acquisition lane cannot act on
// either while they are one number:
//
//   (a) the family names no document-shaped source at all -- only components,
//       compiled profiles, route contracts and reference URLs; and
//   (b) the family names a label that does not resolve -- a prose title such as
//       "Statement of Inability to Afford Payment of Court Costs", or a citation
//       such as LA-CCRP-ART-988, which is a Louisiana Code of Criminal Procedure
//       article and not a form.
//
// This resolves what document each route actually needs, from what is already
// committed. NOTHING IS FETCHED. Every answer is derived from files in this
// repository and every answer carries the evidence it was derived from.
//
// WHY THE CENSUS COULD NOT DO THIS ITSELF
//
// The census reconciles `requiredSourceIds` against the corpus index and nothing
// else. It never reads the legal-design record. But the legal-design intake
// memos under data/record-clearing/legal-design-intake/ carry, for every track,
// the components with their `officialFormId` and `officialSourceUrl`, and an
// `officialSources` list of titled, dated citations. That is the record which
// says what a label means. Joining the census's labels to it resolves 82 of the
// 83 rows in this batch on an exact string equality of the label against the
// memo's own `officialFormId` -- no fuzzy matching anywhere.
//
// HOW "HELD" IS DECIDED, AND WHY IT IS NARROWER THAN IT LOOKS
//
// Four tiers, each recorded on the obligation it decided:
//
//   exact_content_hash                 a sha256 the corpus index carries.
//   private_source_path_content_hash   the memo's officialSourceUrl is a path in
//                                      private/Nationwide Record Clearing/; the
//                                      source-artifact registry gives that path's
//                                      measured digest; the corpus carries it.
//                                      This is still a content-hash identity, so
//                                      it is exact.
//   corpus_form_number_exact           normalised equality with a corpus form
//                                      number in the same jurisdiction.
//   corpus_doc_kind_and_statute        for form families numbered by statute
//                                      section (Texas's TX-GC-411.xxxx suite),
//                                      a match on (document kind, section set,
//                                      qualifier set), unique or it is refused.
//
// A tie is not a match. Two corpus entries that both satisfy an obligation mean
// the obligation identifies neither, and the obligation is reported unresolved
// rather than bound to a guess: a wrong resolution sends someone to acquire the
// wrong document, which is worse than acquiring nothing.
//
// The corpus index holds PDFs only (329 of them, all .pdf). A source published
// as .docx therefore cannot be held by it however completely its identity is
// known. That is recorded as its own non-holding reason rather than as absence.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const batchArgIndex = process.argv.indexOf("--batch");
const BATCH = batchArgIndex === -1 ? 2 : Number(process.argv[batchArgIndex + 1]);
if (BATCH !== 2) {
  console.error(`This script implements batch 2 only. Batch 1 is owned by a sibling lane.`);
  process.exit(2);
}

// Rows 84..166 of the 166 SOURCE_IDENTITY_UNRESOLVED rows, sorted by
// worklistGroupId, as the reconciliation itself sorts them.
const SLICE_START = 83;
const SLICE_END = 166;

const RECONCILIATION = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const SOURCE_ARTIFACT_REGISTRY = "data/record-clearing/source-artifact-registry.json";
const MEMO_DIR = "data/record-clearing/legal-design-intake";
const OVERLAY_ROOT = "data/rcap-all50/overlays";
const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";
const OUT = "data/rcap-grade-a/route-obligation-census-v1/identity-resolution/batch-2/resolved.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const normalise = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// ---------------------------------------------------------------- evidence in

const reconciliation = readJson(RECONCILIATION);
const worklist = readJson(WORKLIST);
const corpus = readJson(CORPUS_INDEX);
const packetSets = readJson(PACKET_SET_MANIFESTS).packetSets;
const registry = readJson(SOURCE_ARTIFACT_REGISTRY).artifacts;

const memoTracks = new Map(); // trackId -> { jurisdiction, track }
for (const file of fs.readdirSync(path.join(rootDir, MEMO_DIR)).sort()) {
  if (!file.endsWith(".memo.json")) continue;
  const memo = readJson(path.join(MEMO_DIR, file));
  for (const track of memo.tracks ?? []) {
    memoTracks.set(track.trackId, { jurisdiction: memo.jurisdiction, track, memoFile: path.join(MEMO_DIR, file) });
  }
}

// url -> the titled, dated citation the legal-design memo recorded for it.
// Every officialFormId any legal-design track uses, so a corpus file whose form
// number appears nowhere in the design record can be flagged. The corpus index
// extracts form numbers from the file itself, and it does not always get one:
// North Dakota's Close-Nonconviction-Records bundle is indexed as "EXPERTISE".
const legalDesignFormIds = new Set();
const memoTitleByUrl = new Map();
for (const { track } of memoTracks.values()) {
  for (const source of track.officialSources ?? []) {
    if (source.url && source.title && !memoTitleByUrl.has(source.url)) {
      memoTitleByUrl.set(source.url, source.title);
    }
  }
}

const overlays = [];
(function walkOverlays(dir) {
  for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) walkOverlays(next);
    else if (entry.name === "source-record.json") overlays.push({ recordPath: next, record: readJson(next) });
  }
})(OVERLAY_ROOT);
const overlayByHash = new Map();
for (const { recordPath, record } of overlays) {
  for (const hash of [record.sha256, record.expectedSha256, record.declaredSha256]) {
    if (hash && !overlayByHash.has(hash)) overlayByHash.set(hash, { recordPath, record });
  }
}

const profileFormCandidateFiles = new Set();
for (const file of fs.readdirSync(path.join(rootDir, PROFILE_DIR))) {
  if (!file.endsWith(".json")) continue;
  const profile = readJson(path.join(PROFILE_DIR, file));
  for (const pathway of profile.packetGenerator?.pathways ?? []) {
    for (const candidate of pathway.formCandidates ?? []) {
      if (candidate.relativePath) profileFormCandidateFiles.add(candidate.relativePath);
    }
  }
}

// --------------------------------------------------------------- corpus index

const corpusByHash = new Map(corpus.entries.map((e) => [e.sha256, e]));
const corpusByStateForm = new Map();
for (const entry of corpus.entries) {
  if (!entry.formNumber) continue;
  const key = `${entry.state}|${normalise(entry.formNumber)}`;
  if (!corpusByStateForm.has(key)) corpusByStateForm.set(key, []);
  corpusByStateForm.get(key).push(entry);
}

const registryByPath = new Map(registry.map((a) => [a.sourcePath, a]));
const registryByBasename = new Map();
for (const artifact of registry) {
  const base = path.posix.basename(artifact.sourcePath).toLowerCase();
  if (!registryByBasename.has(base)) registryByBasename.set(base, []);
  registryByBasename.get(base).push(artifact);
}
const registryDigest = (artifact) => artifact?.measuredSha256 || artifact?.inventorySha256 || null;

// The Nationwide inventory keyed by percent-decoded file name, which is how an
// official URL and a held file meet: the same publisher file name on both sides.
const registryByDecodedBasename = new Map();
for (const artifact of registry) {
  let base;
  try { base = decodeURIComponent(path.posix.basename(artifact.sourcePath)); } catch { base = path.posix.basename(artifact.sourcePath); }
  const key = base.toLowerCase();
  if (!registryByDecodedBasename.has(key)) registryByDecodedBasename.set(key, []);
  registryByDecodedBasename.get(key).push(artifact);
}

function lookupRegistry(sourcePath) {
  if (!sourcePath) return null;
  const exact = registryByPath.get(sourcePath);
  if (exact) return exact;
  const byName = registryByBasename.get(path.posix.basename(sourcePath).toLowerCase());
  return byName && byName.length === 1 ? byName[0] : null;
}

// An official URL's own file name, decoded. A landing page has none.
function urlBasename(sourceUrl) {
  if (!sourceUrl || !/^https?:\/\//.test(sourceUrl)) return null;
  let pathname;
  try { pathname = new URL(sourceUrl).pathname; } catch { return null; }
  const base = path.posix.basename(pathname);
  if (!base || !/\.[a-z0-9]{2,5}$/i.test(base)) return null;
  try { return decodeURIComponent(base); } catch { return base; }
}

// The Nationwide inventory names a file `LABEL__slug__revision.ext` for the
// assets it curated. The slug is the document's role within the label, and it is
// what separates the two documents Montana files under one MT-OCA-MMRTA label.
function registryBySlugLabel(jurisdiction, label, roles) {
  if (!label) return null;
  const prefix = `${label}__`.toLowerCase();
  const candidates = registry.filter((a) => a.jurisdiction === jurisdiction
    && path.posix.basename(a.sourcePath).toLowerCase().startsWith(prefix));
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) return null;
  const roleTokens = [...roles].flatMap((r) => String(r).split(/[^a-z]+/i)).filter((t) => t.length > 2).map((t) => t.toLowerCase());
  if (roleTokens.length === 0) return null;
  const byRole = candidates.filter((a) => {
    const slug = path.posix.basename(a.sourcePath).toLowerCase();
    return roleTokens.every((t) => slug.includes(t));
  });
  return byRole.length === 1 ? byRole[0] : null;
}

// MT-FORM-B is the inventory's form-b.docx. The jurisdiction code is a prefix the
// census added, not part of the publisher's name for the file.
function registryByStrippedLabel(jurisdiction, label) {
  if (!label) return null;
  const stripped = normalise(String(label).replace(new RegExp(`^${jurisdiction}-`, "i"), ""));
  if (stripped.length < 4) return null;
  const candidates = registry.filter((a) => {
    if (a.jurisdiction !== jurisdiction) return false;
    const base = normalise(path.posix.basename(a.sourcePath).replace(/\.[a-z0-9]+$/i, ""));
    return base === stripped || base.endsWith(stripped);
  });
  return candidates.length === 1 ? candidates[0] : null;
}

// A title the legal-design note states, matched against the title the inventory
// recorded for a binary, or against the inventory file name's own slug. Equality
// of normalised titles, not similarity.
function registryByTitle(jurisdiction, title) {
  if (!title) return null;
  const key = normalise(title);
  if (key.length < 12) return null;
  const candidates = registry.filter((a) => {
    if (a.jurisdiction !== jurisdiction) return false;
    if (a.officialTitle && normalise(a.officialTitle) === key) return true;
    const parts = path.posix.basename(a.sourcePath).split("__");
    return parts.length > 1 && normalise(parts[1]) === key;
  });
  return candidates.length === 1 ? candidates[0] : null;
}

// A title-phrase matcher against corpus file names was written and then removed.
// It bound LA-CCRP-ART-992 (Order of Expungement of Arrest/Conviction Record) to
// the corpus's LA-CCRP-ART-995 (Order of Expungement of Interim Arrest Record) on
// the shared phrase "order of expungement of", and Michigan's MC 227
// (Application to Set Aside Conviction(s)) to MC-228 (Order ON Application to Set
// Aside Conviction(s)). Both are the dangerous failure: a route sent to acquire
// or fill the wrong document. Titles inside one form family differ by a word, so
// phrase similarity cannot separate them and is not used.

// The corpus file name is `ST__CLASS__FORMNUMBER__slug__REV__LANG.pdf`. The slug
// is the indexer's rendering of the document's own title and is the only part
// that says what kind of document it is.
const corpusSlug = (entry) => {
  const parts = entry.fileName.split("__");
  return parts.length > 3 ? parts[3] : entry.fileName;
};

const DOC_KINDS = [
  "instructions", "petition", "motion", "order", "application", "request",
  "affidavit", "declaration", "notice", "certificate", "statement", "brief",
  "response", "stipulation", "reply", "proof", "letter"
];
// Left-to-right: "Model Petition for an Order of Nondisclosure" is a petition,
// "Instructions and Model Letter for an Order" is instructions.
function docKindOf(text) {
  const words = String(text ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const word of words) {
    const singular = word.endsWith("s") && word !== "instructions" ? word.slice(0, -1) : word;
    if (DOC_KINDS.includes(word)) return word;
    if (DOC_KINDS.includes(singular)) return singular;
  }
  return null;
}
// Section numbers as they are written in a label ("Section 411.0735") and as a
// corpus form number carries them ("TX-GC-411.0725-411.073-411.0735").
function sectionKeysOf(text) {
  const keys = new Set();
  for (const match of String(text ?? "").matchAll(/\b\d{1,4}\.\d{1,5}\b/g)) keys.add(match[0]);
  return keys;
}
const QUALIFIERS = ["dwi", "bwi", "felony", "misdemeanor", "juvenile", "cannabis", "marijuana", "commissioner"];
function qualifiersOf(text) {
  const lower = String(text ?? "").toLowerCase();
  const found = new Set();
  for (const q of QUALIFIERS) if (new RegExp(`(^|[^a-z])${q}([^a-z]|$)`).test(lower)) found.add(q);
  if (/driving while intoxicated/.test(lower)) found.add("dwi");
  if (/boating while intoxicated/.test(lower)) found.add("bwi");
  return found;
}
const setEquals = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// ------------------------------------------------------------- who publishes

// The publisher of record for a form is the body that publishes it. Each entry
// below is decided by something committed in this repository, and the deciding
// text is carried onto every obligation the entry answers, so a reader can check
// it without trusting this table.
const PUBLISHERS = [
  { hosts: ["www.txcourts.gov", "txcourts.gov"], name: "Texas Office of Court Administration",
    evidence: "The census and the legal design both name these documents 'OCA Model ...', and they are published at txcourts.gov/forms/orders-of-nondisclosure/." },
  { hosts: ["www.legis.la.gov", "legis.la.gov"], name: "Louisiana Legislature (statutory form set out in the Code of Criminal Procedure article itself)",
    evidence: "data/record-clearing/legal-design-intake/LA.memo.json cites each article as 'La. C.Cr.P. Art. NNN -- ... form to be used'; the form is the article's own text, not a form a court publishes." },
  { hosts: ["www.ndcourts.gov", "ndcourts.gov"], name: "North Dakota Supreme Court (State Court Administrator's Office / ND Legal Self Help Center)",
    evidence: "data/record-clearing/legal-design-intake/ND.memo.json: 'published by the North Dakota State Court Administrator's Office' and 'published by the ND Legal Self Help Center'." },
  { hosts: ["courts.mt.gov", "www.courts.mt.gov"], name: "Montana Supreme Court, Office of the Court Administrator",
    evidence: "data/record-clearing/legal-design-intake/MT.memo.json: 'published by the Office of the Court Administrator under AF 22-0129'." },
  { hosts: ["dojmt.gov", "www.dojmt.gov"], name: "Montana Department of Justice (CRISS)",
    evidence: "data/record-clearing/legal-design-intake/MT.memo.json names it 'The CRISS Expungement/Removal Request Form'; the census carries dojmt.gov/dci-home/conviction-expungement-process/ on the same family." },
  { hosts: ["legacy.utcourts.gov", "www.utcourts.gov", "utcourts.gov"], name: "Utah State Courts",
    evidence: "data/record-clearing/legal-design-intake/UT.memo.json: 'published by Utah Courts alongside 1501CR' and 'Utah Courts publishes 1110GE ... and 1111GE'." },
  { hosts: ["ilcourtsaudio.blob.core.windows.net", "www.illinoiscourts.gov", "illinoiscourts.gov"],
    name: "Illinois Supreme Court Commission on Access to Justice / Administrative Office of the Illinois Courts",
    evidence: "data/record-clearing/legal-design-intake/IL.memo.json: 'approved by the Illinois Supreme Court Commission on Access to Justice and required in all Illinois Circuit Courts'; the suite is listed at illinoiscourts.gov/documents-and-forms/approved-forms/." }
];
// Forms whose only committed source path is inside private/Nationwide Record
// Clearing/, which names a folder and not a publisher. The publisher is taken
// from a committed statement about the document itself.
const PUBLISHERS_BY_FORM = [
  { jurisdiction: "MI", match: /^MC 227/, name: "Michigan State Court Administrative Office (SCAO)",
    evidence: "data/record-clearing/legal-design-intake/MI.memo.json describes MC 227 as 'Application to Set Aside Conviction(s), SCAO-approved'; the corpus carries the same series as MC-227A and MC-227B." },
  { jurisdiction: "MI", match: /^Proof of Service$/, name: "Michigan State Court Administrative Office (SCAO)",
    evidence: "The component sits on the SCAO MC 227b application in data/record-clearing/legal-design-intake/MI.memo.json; the proof of service travels with that SCAO form." },
  { jurisdiction: "IL", match: /^FW-CIV/, name: "Illinois Supreme Court Commission on Access to Justice / Administrative Office of the Illinois Courts",
    evidence: "data/record-clearing/legal-design-intake/IL.memo.json records the component as 'approved by the Illinois Supreme Court Commission on Access to Justice and required in all Illinois Circuit Courts'." },
  { jurisdiction: "IL", match: /^PRB /, name: "Illinois Prisoner Review Board",
    evidence: "data/record-clearing/legal-design-intake/IL.memo.json records the il-prb-cert destination as 'Illinois Prisoner Review Board, then the circuit court of conviction'." },
  { jurisdiction: "IN", match: /^CCA/, name: "Indiana Coalition for Court Access",
    evidence: "data/record-clearing/source-artifact-registry.json titles the bundle 'Coalition for Court Access Section 1 Non-Conviction Expungement Petition and Order Bundle'; the corpus file name repeats it." },
  { jurisdiction: "MA", match: /^Petition for Expungement, G\.L\./, name: "Massachusetts Trial Court",
    evidence: "data/record-clearing/legal-design-intake/MA.memo.json records this component as 'Trial Court of Massachusetts, Rev. 12.20.18, with instructions on the reverse.'" },
  { jurisdiction: "MA", match: /Probation|Commissioner of Probation/, name: "Massachusetts Trial Court, Office of the Commissioner of Probation (Massachusetts Probation Service)",
    evidence: "The corpus carries the form under form number MA-PROBATION-SERVICE and the census label itself reads '(Office of the Commissioner of Probation)'." }
];

// A census label with no legal-design component behind it, resolved by hand
// against a committed record and cited. Nothing here is inferred from
// similarity; each entry names the file that decides it.
const LABEL_RESOLUTIONS = [
  {
    jurisdiction: "AL",
    label: "Alabama AOC Order of Limited Relief packet",
    officialTitle: "Petition for Order of Limited Relief",
    formNumber: "C-94A",
    issuingAuthority: "Alabama Administrative Office of Courts",
    corpusSha256: "e7ebe16d45d9a5619fd36f2834d4696efc4c0e7bf3ef42c44fa684906effc2c2",
    evidence: [
      { kind: "overlay_source_record", path: "data/rcap-all50/overlays/production/alabama/c-94a-source-gated-en/source-record.json", detail: "documentId C-94A, documentRole PETITION, officialTitle 'Petition for Order of Limited Relief', REV-2023-10" },
      { kind: "legal_design_track", path: "data/record-clearing/legal-design-intake/AL.memo.json", detail: "track al-olr legalName 'Petition for an Order of Limited Relief, Ala. Code s 12-26-1 et seq.'" }
    ],
    caveat: "AL.memo.json records this track's packetIdentity and outputStrategy as 'unresolved' and carries blocker AL-9: counsel has not decided whether an AOC form governs the route. The document identity is settled here; whether the route may use it is a legal-design question this record does not answer."
  }
];

function publisherFor(jurisdiction, formId, sourceUrl) {
  if (sourceUrl && /^https?:\/\//.test(sourceUrl)) {
    let host = null;
    try { host = new URL(sourceUrl).host; } catch { host = null; }
    const hit = PUBLISHERS.find((p) => p.hosts.includes(host));
    if (hit) return { name: hit.name, basis: `publisher of record for ${host}`, evidence: hit.evidence };
  }
  const byForm = PUBLISHERS_BY_FORM.find((p) => p.jurisdiction === jurisdiction && p.match.test(String(formId ?? "")));
  if (byForm) return { name: byForm.name, basis: "stated about this document in a committed record", evidence: byForm.evidence };
  return { name: null, basis: "no committed record names the publisher of this document", evidence: null };
}

// ------------------------------------------------- what the label actually is

// The census's own test, reused unchanged so this agrees with it on what a form
// number looks like. An article or section citation is not a form number
// however code-like it looks.
const STATUTORY_REFERENCE = /(^|[^a-z])(art|article|sect|section|ch|chapter|stat)([^a-z]|$)/i;
function looksLikeAFormNumber(label) {
  const text = String(label).trim();
  if (/\s/.test(text)) return false;
  if (!/[0-9]/.test(text)) return false;
  if (STATUTORY_REFERENCE.test(text)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._/-]+$/.test(text);
}
const isStatuteCitation = (label) => {
  const text = String(label).trim();
  return !/\s/.test(text) && /[0-9]/.test(text) && STATUTORY_REFERENCE.test(text);
};

// "MC 227 page 3 Proof of Service" and "Petition to Seal (...), Part A box 4"
// are locations inside a document, not documents. Splitting them is the whole
// point: the census counted four Massachusetts obligations where the design
// record names three documents.
const LOCATOR = /^(.*?)[,]?\s+(page\s+\d+.*|item\s+[\w.]+.*|part\s+[A-Z]\b.*|box\s+\d+.*)$/i;
function splitLocator(label) {
  const match = LOCATOR.exec(String(label ?? ""));
  if (!match) return { base: label, locator: null };
  return { base: match[1].trim().replace(/,$/, ""), locator: match[2].trim() };
}

// "1110GE or 1111GE" names two alternative forms, one per branch of the track.
function splitAlternatives(label) {
  const text = String(label ?? "");
  if (!/\bor\b/.test(text)) return [text];
  const parts = text.split(/\s+or\s+/).map((s) => s.trim());
  return parts.every((p) => looksLikeAFormNumber(p)) ? parts : [text];
}

// A legal-design note opens with the document's name and then explains it. The
// opening phrase is taken only when it begins like a document name; otherwise
// nothing is derived, because a sentence such as "Completed by the participant
// after service." is not a title and must not be recorded as one.
const NOTE_TITLE_STOP = /(,\s+(?:Rev\b|rev\b|SCAO-approved\b|published\b|approved\b|pages\b|retained\b|required\b|which\b|carries\b|used\b|completed\b|filed\b|issued\b|left\b|Part\s+I\b|[A-Z][a-z]{2}\s+\d{4}\b))|(\s+[\u2014-]{1,2}\s+)|(\.\s+[A-Z])/;
const TITLE_OPENERS = /^(The\s+Article\s+\d|Verified\s|Proposed\s|MMRTA\s|Appearance\s|Petition\b|Motion\b|Order\b|Application\b|Request\b|Notice\b|Certificate\b|Affidavit\b|Declaration\b|Brief\b|Statement\b|Instructions\b|Response\b|Stipulation\b|Reply\b)/;
function titleFromNote(note) {
  if (!note) return null;
  const stop = NOTE_TITLE_STOP.exec(note);
  let phrase = (stop ? note.slice(0, stop.index) : note).trim().replace(/[.;,]$/, "");
  if (!phrase || phrase.length > 180) return null;
  if (!TITLE_OPENERS.test(phrase)) return null;
  return phrase;
}

// --------------------------------------------------------- resolve one source

function resolveHeld(jurisdiction, formId, sourceUrl, obligationTitle, roles) {
  const record = (tier, entry, artifact, extra = {}) => ({ tier: entry ? tier : null, entry, registryArtifact: artifact ?? null, ...extra });

  // Tier: a source path or an official file name that the Nationwide inventory
  // carries, whose measured digest the corpus carries. An exact identity.
  let artifact = null;
  if (sourceUrl && sourceUrl.startsWith("private/")) {
    artifact = lookupRegistry(sourceUrl);
    if (artifact) {
      const digest = registryDigest(artifact);
      if (digest && corpusByHash.has(digest)) return record("private_source_path_content_hash", corpusByHash.get(digest), artifact);
    }
  }
  if (!artifact) {
    const base = urlBasename(sourceUrl);
    if (base) {
      const byName = (registryByDecodedBasename.get(base.toLowerCase()) ?? []).filter((a) => a.jurisdiction === jurisdiction);
      if (byName.length === 1) {
        artifact = byName[0];
        const digest = registryDigest(artifact);
        if (digest && corpusByHash.has(digest)) return record("official_file_name_in_nationwide_inventory_content_hash", corpusByHash.get(digest), artifact);
      }
    }
  }
  if (!artifact) artifact = registryBySlugLabel(jurisdiction, formId, roles ?? new Set());
  if (!artifact) artifact = registryByStrippedLabel(jurisdiction, formId);
  if (!artifact) artifact = registryByTitle(jurisdiction, obligationTitle);
  if (artifact) {
    const digest = registryDigest(artifact);
    if (digest && corpusByHash.has(digest)) return record("nationwide_inventory_identity_content_hash", corpusByHash.get(digest), artifact);
  }

  // Tier: exact form-number equality inside the jurisdiction.
  const exact = corpusByStateForm.get(`${jurisdiction}|${normalise(formId)}`) ?? [];
  if (exact.length === 1) return record("corpus_form_number_exact", exact[0], artifact);

  // Tier: document kind + statute section set + qualifier set, unique or refused.
  const text = `${formId ?? ""} ${obligationTitle ?? ""}`;
  const kind = docKindOf(text);
  const sections = sectionKeysOf(text);
  const quals = qualifiersOf(text);
  if (kind && sections.size > 0) {
    const candidates = corpus.entries.filter((entry) => {
      if (entry.state !== jurisdiction) return false;
      if (docKindOf(corpusSlug(entry)) !== kind) return false;
      const entrySections = sectionKeysOf(entry.formNumber);
      for (const section of sections) if (!entrySections.has(section)) return false;
      return true;
    });
    if (candidates.length === 1) return record("corpus_doc_kind_and_statute", candidates[0], artifact);
    if (candidates.length > 1) {
      const byQualifier = candidates.filter((entry) => setEquals(qualifiersOf(entry.formNumber), quals));
      if (byQualifier.length === 1) return record("corpus_doc_kind_and_statute", byQualifier[0], artifact);
      return record(null, null, artifact, { ambiguous: candidates.map((e) => ({ path: e.path, formNumber: e.formNumber })) });
    }
  }

  return record(null, null, artifact);
}

function heldAs(entry) {
  return entry
    ? { path: entry.path, state: entry.state, assetClass: entry.assetClass, formNumber: entry.formNumber, revision: entry.revision, sha256: entry.sha256, pageCount: entry.pageCount }
    : null;
}

// A note that places the component inside another document rather than naming a
// separate one: "from the ... bundle", "pages 5 to 6 of the same official
// bundle", "from the same Coalition set".
const BUNDLE_NOTE = /\b(bundle|packet|the same(?:\s+[A-Za-z]+){0,4}\s+(?:bundle|packet|set|form)|pages?\s+\d+\s+to\s+\d+)\b/i;

function unresolvedReason(officialTitle, located, formId) {
  if (!officialTitle && !located) {
    return {
      code: "LABEL_NAMES_NEITHER_A_TITLE_NOR_A_LOCATION",
      detail: `no committed record gives ${formId} a title, an official URL, a Nationwide inventory entry or a held binary`
    };
  }
  if (!officialTitle) {
    return {
      code: "LOCATED_BUT_UNTITLED",
      detail: `a source is recorded for ${formId} but no committed record states the document's official title`
    };
  }
  return {
    code: "IDENTITY_DESCRIBED_BUT_NOT_LOCATED",
    detail: `the design record describes ${formId} but records no official URL, no Nationwide inventory entry and no held binary, so there is no document to go and get`
  };
}

function whatWouldResolveIt(formId, jurisdiction, memoFile, roles) {
  const isServiceComponent = [...(roles ?? [])].some((r) => /service/i.test(String(r)));
  return [
    isServiceComponent
      ? `a statement in ${memoFile ?? "the legal-design record"} of which form ${formId} is a page of; the component carries no source of its own and the design record does not say whether it travels with the primary filing`
      : null,
    memoFile ? `an officialSourceUrl on the ${formId} component, or a titled entry for it in officialSources, in ${memoFile}` : `a legal-design track that names ${formId}`,
    `an entry for ${formId} in ${SOURCE_ARTIFACT_REGISTRY} under jurisdiction ${jurisdiction}`,
    `the binary itself in ${CORPUS_INDEX}`
  ].filter(Boolean);
}

function buildObligation({ jurisdiction, formId, sourceUrl, roles, requirements, notes, namedInCensusAs, locator, memoFile, bundleFallback }) {
  const explicit = LABEL_RESOLUTIONS.find((r) => r.jurisdiction === jurisdiction && r.label === formId) ?? null;
  const statute = isStatuteCitation(formId);
  const memoTitle = sourceUrl ? memoTitleByUrl.get(sourceUrl) ?? null : null;
  const derivedTitle = titleFromNote(notes);
  const registryArtifact = sourceUrl && sourceUrl.startsWith("private/") ? lookupRegistry(sourceUrl) : null;

  const held = resolveHeld(jurisdiction, formId, sourceUrl, derivedTitle ?? memoTitle ?? formId, roles);
  // A component the design record places inside another document -- "Order from
  // the Coalition for Court Access Section 1 bundle", "pages 5 to 6 of the same
  // official bundle" -- is that document, not a separate one to acquire. The
  // referent is the nearest preceding component of the same track that carries a
  // source, which is what "the same" refers to in the memo's own ordering.
  let containedIn = null;
  if (!held.entry && bundleFallback && BUNDLE_NOTE.test(String(notes ?? ""))) {
    containedIn = bundleFallback;
    if (bundleFallback.entry) {
      held.entry = bundleFallback.entry;
      held.tier = "contained_in_a_bundle_the_corpus_holds";
    }
  }
  const corpusEntry = held.entry;
  const artifact = held.registryArtifact ?? registryArtifact ?? containedIn?.artifact ?? null;

  // Official title, most authoritative first: the registry's recorded title for
  // the exact binary, then the memo's titled citation for the exact URL, then an
  // overlay identity for the same bytes, then the phrase the legal-design note
  // opens with, then -- only when the label is itself prose -- the label.
  const overlay = corpusEntry ? overlayByHash.get(corpusEntry.sha256) : null;
  let officialTitle = null, titleBasis = null;
  if (artifact?.officialTitle) {
    officialTitle = artifact.officialTitle;
    titleBasis = `source-artifact registry, ${SOURCE_ARTIFACT_REGISTRY}, for ${artifact.sourcePath}`;
  } else if (memoTitle && urlBasename(sourceUrl)) {
    officialTitle = memoTitle;
    titleBasis = `titled citation recorded against this exact file URL in ${memoFile}`;
  } else if (overlay?.record?.officialTitle) {
    officialTitle = overlay.record.officialTitle;
    titleBasis = `overlay source record ${overlay.recordPath}`;
  } else if (derivedTitle) {
    officialTitle = derivedTitle;
    titleBasis = `derived from the opening phrase of the legal-design component note in ${memoFile}`;
  } else if (memoTitle) {
    officialTitle = memoTitle;
    titleBasis = `titled citation in ${memoFile} for ${sourceUrl}, which is a landing page rather than the document itself: this is the page the form is published on, not the form's own title`;
  } else if (!looksLikeAFormNumber(formId) && !statute) {
    officialTitle = formId;
    titleBasis = "the label the census names is itself prose, not a form number; it is carried as the title";
  }

  if (explicit) {
    const entry = corpusByHash.get(explicit.corpusSha256) ?? null;
    return {
      obligationLabel: formId,
      namedInCensusAs,
      componentRoles: [...roles].sort(),
      requirement: null,
      partOfAnotherDocument: locator,
      identityResolved: true,
      issuingAuthority: explicit.issuingAuthority,
      issuingAuthorityBasis: "named in the cited committed record",
      issuingAuthorityEvidence: explicit.evidence.map((e) => e.detail).join("; "),
      formNumber: explicit.formNumber,
      labelIsAStatuteCitationNotAForm: false,
      statuteCitation: null,
      theFormTheArticleImplies: null,
      officialTitle: explicit.officialTitle,
      officialTitleBasis: "resolved against a cited committed record, not by similarity",
      officialSourceUrl: sourceUrl ?? null,
      legalDesignNote: notes ?? null,
      heldInCorpus: Boolean(entry),
      heldBy: entry ? "exact_content_hash" : null,
      heldAs: heldAs(entry),
      containedInDocument: null,
      matchedPhrase: null,
      notHeldBecause: entry ? null : "NOT_IN_THE_VERIFIED_CORPUS",
      ambiguousAgainst: null,
      resolutionCaveat: explicit.caveat,
      evidence: explicit.evidence,
      unresolvedBecause: null,
      whatWouldResolveIt: null
    };
  }

  const publisher = publisherFor(jurisdiction, formId, sourceUrl);

  const evidence = [];
  if (memoFile) evidence.push({ kind: "legal_design_component", path: memoFile, detail: `component officialFormId "${formId}"${sourceUrl ? ` -> ${sourceUrl}` : ""}` });
  if (artifact) evidence.push({ kind: "source_artifact_registry", path: SOURCE_ARTIFACT_REGISTRY, detail: `${artifact.sourcePath} sha256 ${registryDigest(artifact) ?? "not measured"}` });
  if (corpusEntry) evidence.push({ kind: "corpus_index", path: CORPUS_INDEX, detail: `${corpusEntry.path} sha256 ${corpusEntry.sha256}` });
  if (overlay) evidence.push({ kind: "overlay_source_record", path: overlay.recordPath, detail: `documentId ${overlay.record.documentId ?? "unrecorded"}` });
  if (memoTitle) evidence.push({ kind: "legal_design_official_source", path: memoFile, detail: memoTitle });

  // Why this is not held, when it is not.
  let notHeldBecause = null;
  if (!corpusEntry) {
    const inventoryType = artifact ? String(artifact.fileType ?? "").toLowerCase() : null;
    const urlType = /\.(docx?|rtf|html?)$/i.exec(sourceUrl ?? "")?.[1]?.toLowerCase() ?? null;
    const type = inventoryType || urlType;
    if (held.ambiguous) notHeldBecause = "AMBIGUOUS_AGAINST_CORPUS";
    else if (type === "html" || type === "htm") notHeldBecause = "HELD_ONLY_AS_AN_HTML_CAPTURE_OF_THE_PUBLISHING_PAGE_NOT_AS_A_FORM_DOCUMENT";
    else if (type === "docx" || type === "doc" || type === "rtf") notHeldBecause = "PUBLISHED_AS_A_WORD_DOCUMENT_AND_THE_CORPUS_INDEXES_PDFS_ONLY";
    else if (artifact) notHeldBecause = "PRESENT_IN_THE_NATIONWIDE_INVENTORY_AS_A_PDF_BUT_NOT_TAKEN_INTO_THE_VERIFIED_CORPUS";
    else notHeldBecause = "NOT_IN_THE_VERIFIED_CORPUS";
  }

  // A title alone is not an identity. The document must also be located: an
  // official URL, an entry in the Nationwide inventory, a held corpus file, or
  // an overlay record for the same bytes. Echoing the census's own label back as
  // a title would report resolution where none happened.
  const located = Boolean(sourceUrl) || Boolean(artifact) || Boolean(corpusEntry) || Boolean(overlay);
  const resolvedIdentity = Boolean(officialTitle) && located;

  return {
    obligationLabel: formId,
    namedInCensusAs,
    componentRoles: [...roles].sort(),
    requirement: [...requirements].sort().join("/") || null,
    partOfAnotherDocument: locator,
    identityResolved: resolvedIdentity,
    issuingAuthority: publisher.name,
    issuingAuthorityBasis: publisher.basis,
    issuingAuthorityEvidence: publisher.evidence,
    formNumber: statute ? null : (looksLikeAFormNumber(formId) ? formId : null),
    labelIsAStatuteCitationNotAForm: statute,
    statuteCitation: statute ? statuteCitationOf(jurisdiction, formId) : null,
    theFormTheArticleImplies: statute ? (memoTitle ?? derivedTitle ?? null) : null,
    officialTitle,
    officialTitleBasis: titleBasis,
    officialSourceUrl: sourceUrl ?? null,
    legalDesignNote: notes ?? null,
    heldInCorpus: Boolean(corpusEntry),
    heldBy: held.tier,
    heldAs: heldAs(corpusEntry),
    corpusFormNumberIsNotUsedByAnyLegalDesignRecord: corpusEntry
      ? !legalDesignFormIds.has(normalise(corpusEntry.formNumber))
      : null,
    containedInDocument: containedIn
      ? {
          path: containedIn.entry?.path ?? null,
          formNumber: containedIn.entry?.formNumber ?? null,
          nationwideInventoryPath: containedIn.artifact?.sourcePath ?? null,
          becauseTheDesignNoteSays: notes,
          andTheComponentItFollowsIs: containedIn.referentLabel
        }
      : null,
    resolutionCaveat: null,
    matchedPhrase: held.matchedPhrase ?? null,
    notHeldBecause,
    ambiguousAgainst: held.ambiguous ?? null,
    unresolvedBecause: resolvedIdentity ? null : unresolvedReason(officialTitle, located, formId).code,
    unresolvedDetail: resolvedIdentity ? null : unresolvedReason(officialTitle, located, formId).detail,
    whatWouldResolveIt: resolvedIdentity ? null : whatWouldResolveIt(formId, jurisdiction, memoFile, roles)
  };
}

// LA-CCRP-ART-988 -> La. C.Cr.P. art. 988. Only the Louisiana convention is
// decoded, because it is the only statute-citation-as-form-number convention
// this batch contains; anything else is left as the raw label rather than
// decoded on a guess.
function statuteCitationOf(jurisdiction, label) {
  const match = /^LA-CCRP-ART-([\d.]+)$/.exec(String(label ?? ""));
  if (jurisdiction === "LA" && match) return `La. Code Crim. Proc. art. ${match[1]}`;
  return String(label ?? "");
}

// ------------------------------------------------------------------- the rows

const acquisitionFamilies = worklist.packetFamilies
  .filter((f) => f.workTypes.includes("OFFICIAL_SOURCE_ACQUISITION_REQUIRED"))
  .slice()
  .sort((a, b) => a.worklistGroupId.localeCompare(b.worklistGroupId));

if (acquisitionFamilies.length !== reconciliation.rows.length) {
  console.error("The worklist and the reconciliation no longer line up; refusing to guess which family a row is.");
  process.exit(1);
}

const unresolvedRows = [];
reconciliation.rows.forEach((row, index) => {
  if (row.custodyClass !== "SOURCE_IDENTITY_UNRESOLVED") return;
  const family = acquisitionFamilies[index];
  if (family.worklistGroupId !== row.worklistGroupId || family.packetFamilyId !== row.packetFamilyId) {
    console.error(`Row ${index} does not correspond to its family; refusing to resolve against the wrong route.`);
    process.exit(1);
  }
  unresolvedRows.push({ row, family, ordinal: unresolvedRows.length + 1 });
});

const mine = unresolvedRows.slice(SLICE_START, SLICE_END);

const packetSetById = new Map(packetSets.map((p) => [p.packetSetId, p]));

const resolvedRows = mine.map(({ row, family, ordinal }) => {
  const jurisdiction = family.jurisdictions[0] ?? null;
  const censusSourceIds = [...new Set(family.routes.flatMap((r) => r.requiredSourceIds ?? []))].sort();
  const censusLabels = censusSourceIds.filter((id) => id.startsWith("official-form:")).map((id) => id.slice("official-form:".length));
  const censusHashes = censusSourceIds.filter((id) => id.startsWith("source-sha256:")).map((id) => id.slice("source-sha256:".length));

  // Every document the design record says this family's packet sets are built
  // on, keyed by the label the census would have used.
  const obligations = new Map();
  const memoFilesUsed = new Set();
  const participantObtained = [];
  const noFormReasons = [];
  const legalDesignCaveats = [];

  for (const packetSetId of family.packetSetIds ?? []) {
    const trackId = packetSetId.endsWith("-set") ? packetSetId.slice(0, -4) : packetSetId;
    const memo = memoTracks.get(trackId);
    if (!memo) continue;
    memoFilesUsed.add(memo.memoFile);
    const componentsWithForms = (memo.track.components ?? []).filter((c) => c.officialFormId);
    if (componentsWithForms.length === 0) {
      noFormReasons.push({
        packetSetId,
        everyComponentIs: [...new Set((memo.track.components ?? []).map((c) => c.outputStrategy))].sort(),
        statedIn: memo.memoFile
      });
    }
    let lastComponentWithASource = null;
    for (const component of componentsWithForms) {
      const { base, locator } = splitLocator(component.officialFormId);
      const referentLabel = component.officialSourceUrl ? null : lastComponentWithASource;
      if (component.officialSourceUrl) lastComponentWithASource = splitLocator(component.officialFormId).base;
      for (const alternative of splitAlternatives(base)) {
        const key = `${alternative}|${component.officialSourceUrl ?? ""}|${locator ?? ""}|${component.role ?? ""}`;
        if (!obligations.has(key)) {
          obligations.set(key, {
            jurisdiction: memo.jurisdiction, formId: alternative, sourceUrl: component.officialSourceUrl ?? null,
            roles: new Set(), requirements: new Set(), notes: component.notes ?? null,
            namedInCensusAs: null, locator, memoFile: memo.memoFile, bundleReferentLabel: referentLabel
          });
        }
        const entry = obligations.get(key);
        if (component.role) entry.roles.add(component.role);
        if (component.requirement) entry.requirements.add(component.requirement);
        if (!entry.notes && component.notes) entry.notes = component.notes;
      }
      // Attribute the census label to whichever obligation carries it.
      if (censusLabels.includes(component.officialFormId)) {
        for (const alternative of splitAlternatives(base)) {
          const key = `${alternative}|${component.officialSourceUrl ?? ""}|${locator ?? ""}|${component.role ?? ""}`;
          obligations.get(key).namedInCensusAs = `official-form:${component.officialFormId}`;
        }
      }
    }
    if (memo.track.packetIdentity === "unresolved" || memo.track.outputStrategyStatus === "unresolved") {
      legalDesignCaveats.push({
        packetSetId, packetIdentity: memo.track.packetIdentity ?? null,
        outputStrategyStatus: memo.track.outputStrategyStatus ?? null,
        statedIn: memo.memoFile,
        meaning: "the legal-design record has not settled what this route outputs; a resolved document identity does not settle it either"
      });
    }
    for (const question of memo.track.unresolvedQuestions ?? []) {
      if (question.impact === "build_blocker") {
        legalDesignCaveats.push({ packetSetId, blocker: question.question, affectedElement: question.affectedElement ?? null, statedIn: memo.memoFile });
      }
    }
    for (const unit of memo.track.units ?? []) {
      if (unit.available === false) {
        legalDesignCaveats.push({ packetSetId, unavailableUnit: unit.unitId ?? unit.label ?? null, reason: unit.unavailableReason ?? null, statedIn: memo.memoFile });
      }
    }
    for (const doc of memo.track.supportingDocuments ?? []) {
      participantObtained.push({ name: doc.name, obtainedFrom: doc.obtainedFrom, requirement: doc.requirement, statedIn: memo.memoFile });
    }
  }

  // Census labels the design record does not carry. These are resolved against
  // the corpus and the overlays directly, with no design backing.
  const designLabels = new Set([...obligations.values()].map((o) => o.formId));
  const unbackedLabels = censusLabels.filter((label) => {
    const { base } = splitLocator(label);
    if (designLabels.has(label) || designLabels.has(base)) return false;
    return !splitAlternatives(base).every((alternative) => designLabels.has(alternative));
  });
  for (const label of unbackedLabels) {
    const { base, locator } = splitLocator(label);
    obligations.set(`${base}||${locator ?? ""}|`, {
      jurisdiction, formId: base, sourceUrl: null, roles: new Set(), requirements: new Set(),
      notes: null, namedInCensusAs: `official-form:${label}`, locator, memoFile: null
    });
  }

  // A component recorded as a location inside a form ("MC 227 page 3 Proof of
  // Service") carries no source of its own; the form it is a page of does.
  const urlByBaseLabel = new Map();
  for (const obligation of obligations.values()) {
    if (obligation.sourceUrl && !urlByBaseLabel.has(obligation.formId)) urlByBaseLabel.set(obligation.formId, obligation.sourceUrl);
  }
  for (const obligation of obligations.values()) {
    if (!obligation.sourceUrl && obligation.locator && urlByBaseLabel.has(obligation.formId)) {
      obligation.sourceUrl = urlByBaseLabel.get(obligation.formId);
      obligation.sourceUrlInheritedFrom = `the ${obligation.formId} component of the same track, which this component is a location inside`;
    }
  }

  // "Order from the same Coalition set", "pages 5 to 6 of the same official
  // bundle": the document such a component means is the one the memo lists just
  // before it with a source of its own. Resolving that referent first, then
  // handing it to the components that point at it, keeps containment a reading
  // of the memo's own ordering rather than a guess from adjacency.
  const documents = [...obligations.values()].map((obligation) => {
    const first = buildObligation(obligation);
    if (first.heldInCorpus || !obligation.bundleReferentLabel) return first;
    const referentKey = [...obligations.values()].find((o) => o.formId === obligation.bundleReferentLabel && o.sourceUrl);
    if (!referentKey) return first;
    const referent = buildObligation(referentKey);
    const referentEntry = referent.heldAs ? corpusByHash.get(referent.heldAs.sha256) ?? null : null;
    const referentArtifact = referentKey.sourceUrl?.startsWith("private/") ? lookupRegistry(referentKey.sourceUrl) : null;
    if (!referentEntry && !referentArtifact) return first;
    return buildObligation({
      ...obligation,
      bundleFallback: { entry: referentEntry, artifact: referentArtifact, referentLabel: referentKey.formId }
    });
  });

  // The exact content hashes the census names, carried through so the row
  // records every document identity it touches, not only the labelled ones.
  const contentHashDocuments = censusHashes.map((hash) => {
    const entry = corpusByHash.get(hash) ?? null;
    const artifact = registry.find((a) => registryDigest(a) === hash) ?? null;
    const overlay = overlayByHash.get(hash) ?? null;
    return {
      obligationLabel: `source-sha256:${hash}`,
      namedInCensusAs: `source-sha256:${hash}`,
      identityResolved: Boolean(entry || artifact || overlay),
      issuingAuthority: null,
      officialTitle: artifact?.officialTitle ?? overlay?.record?.officialTitle ?? null,
      formNumber: entry?.formNumber ?? null,
      heldInCorpus: Boolean(entry),
      heldBy: entry ? "exact_content_hash" : null,
      heldAs: heldAs(entry),
      notHeldBecause: entry ? null
        : artifact && /\.docx?$/i.test(artifact.sourcePath) ? "PUBLISHED_AS_A_WORD_DOCUMENT_AND_THE_CORPUS_INDEXES_PDFS_ONLY"
        : artifact ? "PRESENT_IN_THE_NATIONWIDE_INVENTORY_BUT_NOT_IN_THE_VERIFIED_CORPUS"
        : "NOT_IN_THE_VERIFIED_CORPUS",
      evidence: [
        artifact ? { kind: "source_artifact_registry", path: SOURCE_ARTIFACT_REGISTRY, detail: artifact.sourcePath } : null,
        entry ? { kind: "corpus_index", path: CORPUS_INDEX, detail: entry.path } : null
      ].filter(Boolean)
    };
  });

  const packetSetsSeen = (family.packetSetIds ?? []).map((id) => {
    const manifest = packetSetById.get(id);
    return manifest ? { packetSetId: id, componentCount: manifest.components.length, componentsCarryingAnOfficialForm: manifest.components.filter((c) => c.officialFormId).length } : { packetSetId: id, componentCount: null, componentsCarryingAnOfficialForm: null };
  });

  const identityResolvedCount = documents.filter((d) => d.identityResolved).length;
  let resolution;
  if (documents.length === 0) {
    resolution = "NO_OFFICIAL_DOCUMENT_REQUIRED";
  } else if (identityResolvedCount === documents.length) {
    resolution = "RESOLVED";
  } else if (identityResolvedCount > 0) {
    resolution = "PARTIALLY_RESOLVED";
  } else {
    resolution = "UNRESOLVED";
  }

  const whyTheCensusCouldNotResolveIt = [];
  if (row.documentSourcesNamed === 0) whyTheCensusCouldNotResolveIt.push("the family named no document-shaped source: every requiredSourceId was a component, a compiled profile, a route contract or a reference URL");
  for (const source of row.documentSources) {
    if (source.absence === "label_does_not_identify_a_document") {
      whyTheCensusCouldNotResolveIt.push(`the label ${source.sourceId} is a prose title or a statute citation, and the reconciliation matches only content hashes and form numbers`);
    }
  }

  return {
    rowOrdinalWithinUnresolved: ordinal,
    worklistGroupId: row.worklistGroupId,
    packetFamilyId: row.packetFamilyId,
    jurisdictions: row.jurisdictions,
    routeCount: row.routeCount,
    routeKeys: family.routeKeys,
    implementationStrategy: family.implementationStrategy,
    packetSets: packetSetsSeen,
    censusRecorded: {
      custodyClass: row.custodyClass,
      documentSourcesNamed: row.documentSourcesNamed,
      documentSourcesResolved: row.documentSourcesResolved,
      nonDocumentSourceIds: row.nonDocumentSourceIds
    },
    whyTheCensusCouldNotResolveIt: [...new Set(whyTheCensusCouldNotResolveIt)],
    resolution,
    resolvedFrom: [...memoFilesUsed].sort(),
    documentsTheRouteNeeds: documents,
    contentHashSourcesTheCensusNames: contentHashDocuments,
    noOfficialFormIsRequiredBecause: documents.length === 0 ? noFormReasons : [],
    participantObtainedDocuments: participantObtained,
    legalDesignCaveats,
    documentsResolved: identityResolvedCount,
    documentsUnresolved: documents.length - identityResolvedCount,
    documentsHeldInCorpus: documents.filter((d) => d.heldInCorpus).length
  };
});

// ---------------------------------------------------- one form, one identity

// The same form number in the same jurisdiction is the same document, so a
// component that carries no title or no source of its own -- "MC 227 item 2.c",
// "MC 227 page 3 Proof of Service", the EXP-AD Request cited without a URL on the
// Prisoner Review Board track -- takes the identity already established for that
// form elsewhere in this batch. This joins on an exact (jurisdiction, form label)
// pair and never across labels.
const establishedIdentity = new Map();
for (const row of resolvedRows) {
  for (const document of row.documentsTheRouteNeeds) {
    const key = `${row.jurisdictions[0]}|${document.obligationLabel}`;
    const current = establishedIdentity.get(key) ?? {};
    if (!current.officialTitle && document.officialTitle
      && document.officialTitleBasis && !/is itself prose/.test(document.officialTitleBasis)) {
      current.officialTitle = document.officialTitle;
      current.officialTitleBasis = document.officialTitleBasis;
      current.from = row.worklistGroupId;
    }
    if (!current.issuingAuthority && document.issuingAuthority) {
      current.issuingAuthority = document.issuingAuthority;
      current.issuingAuthorityEvidence = document.issuingAuthorityEvidence;
    }
    if (!current.officialSourceUrl && document.officialSourceUrl) current.officialSourceUrl = document.officialSourceUrl;
    establishedIdentity.set(key, current);
  }
}
for (const row of resolvedRows) {
  for (const document of row.documentsTheRouteNeeds) {
    const known = establishedIdentity.get(`${row.jurisdictions[0]}|${document.obligationLabel}`);
    if (!known) continue;
    if (known.officialTitle && (!document.officialTitle || /is itself prose/.test(document.officialTitleBasis ?? ""))) {
      document.officialTitle = known.officialTitle;
      document.officialTitleBasis = `${known.officialTitleBasis} (established for the same form label in the same jurisdiction on ${known.from}; this component carries no title of its own)`;
    }
    if (!document.issuingAuthority && known.issuingAuthority) {
      document.issuingAuthority = known.issuingAuthority;
      document.issuingAuthorityBasis = "established for the same form label in the same jurisdiction elsewhere in this batch";
      document.issuingAuthorityEvidence = known.issuingAuthorityEvidence;
    }
    if (!document.officialSourceUrl && known.officialSourceUrl) {
      document.officialSourceUrl = known.officialSourceUrl;
      document.officialSourceUrlBasis = "the same form label in the same jurisdiction is published at this URL elsewhere in this batch";
    }
    if (!document.identityResolved && document.officialTitle && (document.officialSourceUrl || document.heldInCorpus)) {
      document.identityResolved = true;
      document.unresolvedBecause = null;
      document.unresolvedDetail = null;
      document.whatWouldResolveIt = null;
    }
  }
}
for (const row of resolvedRows) {
  const documents = row.documentsTheRouteNeeds;
  row.documentsResolved = documents.filter((d) => d.identityResolved).length;
  row.documentsUnresolved = documents.length - row.documentsResolved;
  row.documentsHeldInCorpus = documents.filter((d) => d.heldInCorpus).length;
  row.resolution = documents.length === 0 ? "NO_OFFICIAL_DOCUMENT_REQUIRED"
    : row.documentsUnresolved === 0 ? "RESOLVED"
      : row.documentsResolved > 0 ? "PARTIALLY_RESOLVED" : "UNRESOLVED";
}

// ------------------------------------------------------------------- totals

const allDocuments = resolvedRows.flatMap((r) => r.documentsTheRouteNeeds);
const distinctDocuments = new Map();
for (const doc of allDocuments) {
  const key = `${doc.officialSourceUrl ?? ""}|${doc.obligationLabel}`;
  if (!distinctDocuments.has(key)) distinctDocuments.set(key, doc);
}

const tally = (list, key) => {
  const out = {};
  for (const item of list) {
    const value = item[key];
    if (value === null || value === undefined) continue;
    out[value] = (out[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};

const unresolvedDocuments = allDocuments.filter((d) => !d.identityResolved);

const doc = {
  schemaVersion: "rcap-census-source-identity-resolution/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/resolve-census-source-identity.mjs",
  batch: 2,
  question: "For each of the census's unresolved source-identity rows, what document does the route actually need, and does the corpus already hold it?",
  scope: {
    of: RECONCILIATION,
    rowsOfClass: "SOURCE_IDENTITY_UNRESOLVED",
    totalOfThatClass: unresolvedRows.length,
    sortedBy: "worklistGroupId",
    thisBatchCovers: `rows ${SLICE_START + 1} through ${SLICE_END}`,
    rowsInThisBatch: resolvedRows.length,
    batchOneIsOwnedElsewhere: "data/rcap-grade-a/route-obligation-census-v1/identity-resolution/batch-1/"
  },
  nothingWasFetched: "No network call is made. Every resolution is against files committed to this repository; egress to court hosts is refused in this environment and a resolution that depended on it would not be reproducible anyway.",
  resolvedAgainst: [
    { path: WORKLIST, whatItGives: "the packet family behind each census row: its routes, packet sets and requiredSourceIds" },
    { path: MEMO_DIR, whatItGives: "the legal-design intake memo per jurisdiction: every track's components with officialFormId and officialSourceUrl, its titled officialSources, its destination and its supporting documents. This is the record that says what a census label means." },
    { path: PACKET_SET_MANIFESTS, whatItGives: "the compiled packet set per track, used to corroborate the component counts" },
    { path: SOURCE_ARTIFACT_REGISTRY, whatItGives: "the measured digest and recorded title for every file in the Nationwide inventory, which turns a private source path into a content identity" },
    { path: CORPUS_INDEX, whatItGives: "the 329 verified PDFs held, with state, form number, revision and sha256" },
    { path: OVERLAY_ROOT, whatItGives: "overlay source records, which carry a document id and official title against a digest" }
  ],
  whatThisDoesNotEstablish: [
    "that a resolved document is the current official edition, or that it has not been superseded since it was collected",
    "that a route may use a document whose identity is resolved here; output strategy, legal approval and packet verification are separate gates this record does not touch",
    "that a document recorded as held is present on this machine right now; that is a live check against a mounted corpus"
  ],
  compiledProfilesWereNotUsedToResolveIdentity: {
    why: "The compiled profiles carry packetGenerator.pathways[].formCandidates, but the same candidate file is repeated across every pathway of a jurisdiction -- IL-illinois.json offers 'CXP Additional Cannabis Convictions.pdf' as the candidate for all seven of its pathways, including adult conviction sealing. Resolving a label from that would bind routes to the wrong document.",
    candidateFilesSeen: profileFormCandidateFiles.size
  },
  resolutionVocabulary: {
    RESOLVED: "Every document this route needs is identified: a publisher, a title, and a form number where one exists.",
    PARTIALLY_RESOLVED: "Some of the documents this route needs are identified and at least one is not.",
    NO_OFFICIAL_DOCUMENT_REQUIRED: "The legal-design record carries no official form for this family: every component is a custom pleading or process guidance. There is nothing here to acquire, and the census's unresolved classification was an absence of a source rather than an unidentified one.",
    UNRESOLVED: "No document this route needs could be identified from a committed record."
  },
  heldVocabulary: {
    exact_content_hash: "The census names a sha256 the corpus index carries.",
    private_source_path_content_hash: "The design record's officialSourceUrl is a path in the Nationwide inventory; the registry gives that path's measured digest and the corpus carries it. Still an exact content identity.",
    corpus_form_number_exact: "Normalised equality with a corpus form number in the same jurisdiction.",
    corpus_doc_kind_and_statute: "A unique match on document kind, statute section set and qualifier set within the jurisdiction. Used for form suites numbered by statute section; a tie is refused rather than resolved."
  },
  notHeldVocabulary: {
    NOT_IN_THE_VERIFIED_CORPUS: "A known document the corpus does not carry. Acquire it; the target is exact.",
    PRESENT_IN_THE_NATIONWIDE_INVENTORY_BUT_NOT_IN_THE_VERIFIED_CORPUS: "The bytes exist in the working inventory with a measured digest, but Master Library Edition 1 did not take them. Promote rather than acquire.",
    PUBLISHED_AS_A_WORD_DOCUMENT_AND_THE_CORPUS_INDEXES_PDFS_ONLY: "The corpus index is 329 PDFs and nothing else, so a .docx source can never be held by it however exactly its identity is known. This is an index limitation, not an absence.",
    AMBIGUOUS_AGAINST_CORPUS: "More than one corpus entry satisfies the obligation, so the obligation identifies none of them. Refused rather than bound to a guess."
  },
  counts: {
    rows: resolvedRows.length,
    byResolution: tally(resolvedRows, "resolution"),
    rowsFullyResolved: resolvedRows.filter((r) => r.resolution === "RESOLVED" || r.resolution === "NO_OFFICIAL_DOCUMENT_REQUIRED").length,
    rowsNotFullyResolved: resolvedRows.filter((r) => r.resolution === "PARTIALLY_RESOLVED" || r.resolution === "UNRESOLVED").length,
    documentObligations: allDocuments.length,
    distinctDocuments: distinctDocuments.size,
    documentObligationsResolved: allDocuments.filter((d) => d.identityResolved).length,
    documentObligationsUnresolved: unresolvedDocuments.length,
    documentObligationsHeld: allDocuments.filter((d) => d.heldInCorpus).length,
    distinctDocumentsHeld: [...distinctDocuments.values()].filter((d) => d.heldInCorpus).length,
    labelsThatAreStatuteCitationsNotForms: allDocuments.filter((d) => d.labelIsAStatuteCitationNotAForm).length,
    obligationsThatAreALocationInsideAnotherDocument: allDocuments.filter((d) => d.partOfAnotherDocument).length,
    byHeldTier: tally(allDocuments, "heldBy"),
    byNotHeldReason: tally(allDocuments, "notHeldBecause")
  },
  whyResolutionFailed: tally(unresolvedDocuments, "unresolvedBecause"),
  whyResolutionFailedInDetail: tally(unresolvedDocuments, "unresolvedDetail"),
  whyTheDocumentsThatAreIdentifiedAreStillNotHeld: tally(allDocuments.filter((d) => d.identityResolved && !d.heldInCorpus), "notHeldBecause"),
  rows: resolvedRows
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);

if (CHECK) {
  if (!fs.existsSync(outPath)) {
    console.error(`${OUT} does not exist. Run without --check to generate it.`);
    process.exit(1);
  }
  const onDisk = fs.readFileSync(outPath, "utf8");
  if (onDisk !== serialized) {
    console.error(`${OUT} is not a fixed point: regenerating it from the committed inputs produces different bytes.`);
    process.exit(1);
  }
  console.log(`${OUT} is a fixed point: ${doc.counts.rows} rows, ${doc.counts.documentObligations} document obligations, ${doc.counts.documentObligationsResolved} resolved.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`${OUT}`);
console.log(`  rows ${doc.counts.rows}  resolved ${doc.counts.rowsFullyResolved}  not fully resolved ${doc.counts.rowsNotFullyResolved}`);
console.log(`  document obligations ${doc.counts.documentObligations}  identity resolved ${doc.counts.documentObligationsResolved}  held ${doc.counts.documentObligationsHeld}`);
