// E2 source-support audit — does each submitted citation actually support the
// claim attached to it?
//
// The intake check (verify-rcap-e2-evidence-intake.mjs) proves coverage and
// that sources resolve, and it publishes a single verbatim rate. This audit
// goes one level deeper, producing one row per evidence citation for final E3:
//
//   - the source is resolved (including path@commit pins, read at the pin);
//   - the pointer is checked (jurisdiction-scoped sources must belong to the
//     job's jurisdiction; identifiers named by the entry must exist in the
//     cited bytes);
//   - the submitted `quote` is classified: exact_verbatim,
//     faithful_paraphrase, interpretive_conclusion,
//     unsupported_by_cited_source, source_missing, pointer_invalid;
//   - a support verdict is stated for the attached factual proposition:
//     textual / derivable / requires_reread / no;
//   - the smallest located source span that carries the support is recorded;
//   - structural flags are raised (secondary authority standing in where
//     primary would be required, official-source claims with no official
//     source in the repository, mapping conclusions resting only on a broad
//     section, quantity-only reconciliation).
//
// The audit does NOT adjudicate whether E3 should accept any relationship.
// Every rule here is deterministic over committed bytes, so the verifier can
// recompute the entire artifact and fail on any drift.
//
// Usage:
//   node scripts/verify-rcap-e2-source-support-audit.mjs          # verify
//   node scripts/verify-rcap-e2-source-support-audit.mjs --write  # regenerate
//
// Verification fails on: a missing evidence entry (row count drift against the
// lane files), duplicate evidence identity, an unresolved pinned commit, a
// missing source path, an invalid pointer row not classified pointer_invalid,
// an exact_verbatim row whose text is not present in the cited bytes, an
// unsupported row carrying a supporting verdict, and silent omission of a lane.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");
const STATS = process.argv.includes("--stats");

const ASSIGNMENT = "data/rcap-ledger/e2-dispatch-assignment.json";
const AUDIT_JSON = "data/rcap-crosswalk-enrichment/e2-source-support-audit.json";
const AUDIT_MD = "docs/rcap-crosswalk-enrichment/e2-source-support-audit.md";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// --- normalization (same spirit as the intake check, kept byte-mappable) ----

const DROP = new Set([..."§§ \t\r\n.,()[]{}–—-\"'`“”‘’*_|"]);

/** Lower-cases and drops punctuation, keeping a map back to raw offsets. */
function normalizeMapped(raw) {
  const chars = [];
  const map = [];
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    if (DROP.has(c)) continue;
    chars.push(c.toLowerCase());
    map.push(i);
  }
  return { text: chars.join(""), map };
}

const normalize = (value) => normalizeMapped(String(value)).text;

// --- source resolution ------------------------------------------------------

const sourceToken = (source) => String(source ?? "").split(/[\s(]/)[0].replace(/[,;]$/, "");

const blobCache = new Map();
/** Returns {ok, raw} for a working-tree path or a path@ref pin. */
function readSource(token) {
  if (blobCache.has(token)) return blobCache.get(token);
  let result;
  const pinned = /^(.+?)@([0-9a-f]{7,40})$/.exec(token);
  try {
    if (pinned) {
      const raw = execFileSync("git", ["show", `${pinned[2]}:${pinned[1]}`], {
        cwd: rootDir,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024
      });
      result = { ok: true, raw, path: pinned[1], ref: pinned[2] };
    } else {
      const abs = path.join(rootDir, token);
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        result = { ok: false, raw: "", path: token, ref: null };
      } else {
        result = { ok: true, raw: fs.readFileSync(abs, "utf8"), path: token, ref: null };
      }
    }
  } catch {
    result = { ok: false, raw: "", path: pinned ? pinned[1] : token, ref: pinned ? pinned[2] : null };
  }
  blobCache.set(token, result);
  return result;
}

const normCache = new Map();
function normalizedSource(token) {
  if (!normCache.has(token)) {
    const src = readSource(token);
    normCache.set(token, src.ok ? normalizeMapped(src.raw) : { text: "", map: [] });
  }
  return normCache.get(token);
}

// Citation spine, mirroring the crosswalk generator's rule: the ordered tuple
// of numeric groups inside one citation, with leading zeros dropped, so
// `12.55.085`, `12-55-85` and `AS 12.55.085(e)` all yield `12.55.85`.
function spinesOf(text) {
  const spines = new Set();
  const re = /\d+(?:[a-z]?)(?:\s*[.:\-/–—]\s*\d+[a-z]?)+/gi;
  for (const match of String(text).matchAll(re)) {
    const groups = match[0].split(/[^0-9a-z]+/i).filter(Boolean);
    if (groups.length < 2) continue;
    spines.add(groups.map((g) => g.replace(/^0+(?=\d)/, "").toLowerCase()).join("."));
  }
  return spines;
}

const spineCache = new Map();
function sourceSpines(token) {
  if (!spineCache.has(token)) {
    const src = readSource(token);
    spineCache.set(token, src.ok ? spinesOf(src.raw) : new Set());
  }
  return spineCache.get(token);
}

// --- quote decomposition ----------------------------------------------------

/** Quoted cores inside the submitted quote: '…' or "…" segments long enough to
 * be checkable text rather than a term of art. */
function quotedCores(quote) {
  const cores = [];
  const re = /['"“‘]([^'"“”‘’]{20,})['"”’]/g;
  for (const match of String(quote).matchAll(re)) cores.push(match[1]);
  return cores;
}

const CONCLUSION_MARKERS = [
  "therefore", "thus", "yields", "replaying", "sha256", "zero hits",
  "matches no", "appears in none", "in none of", "no track", "no other",
  "none of them", "in full:", "comparison", "presupposes", "downstream of",
  "not an implementation", "does not apply", "cannot have", "never satisfied",
  "the opposite of", "note:", "does not seal", "does not expunge",
  "is excluded", "forecloses", "already happened", "which is not",
  "carries no", "contains no", "returns zero", "not within", "never cites"
];

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "under",
  "record", "records", "track", "tracks", "pathway", "pathways", "registry",
  "compiled", "profile", "authority", "section", "statute", "court", "form",
  "petition", "expungement", "sealing", "conviction", "because", "which",
  "where", "when", "their", "there", "these", "those", "shall", "must",
  "state", "states", "county", "district", "within", "after", "before",
  "against", "granted", "denied", "filing", "filed", "order", "relief"
]);

/** Salient anchors of an entry: statute spines plus distinctive long tokens. */
function anchorsOf(value, quote) {
  const text = `${value ?? ""} ${quote ?? ""}`;
  const spines = [...spinesOf(text)].map((s) => ({ type: "spine", key: s }));
  const words = new Map();
  for (const match of text.toLowerCase().matchAll(/[a-z][a-z0-9_-]{6,}/g)) {
    const w = match[0];
    if (STOPWORDS.has(w)) continue;
    words.set(w, { type: "token", key: w });
  }
  return [...spines, ...words.values()];
}

// --- flags ------------------------------------------------------------------

const OFFICIAL_ROOTS = ["private/Nationwide Record Clearing/", "data/record-clearing/"];
const isOfficialRoot = (p) => OFFICIAL_ROOTS.some((root) => p.startsWith(root));

function sourceKindOf(p) {
  if (p.startsWith("src/lib/rcap-engine/compiled/profiles/")) return "compiled_profile";
  if (p.startsWith("data/rcap-ledger/")) return "ledger_artifact";
  if (p.startsWith("data/record-clearing/")) return "legal_design_source";
  if (p.startsWith("scripts/")) return "generator_script";
  return "other";
}

// The identifier universe: real registry-track and compiled-pathway ids, so
// hyphenated English phrases in a `value` are never mistaken for pointers.
let ID_UNIVERSE = null;
function idUniverse() {
  if (ID_UNIVERSE) return ID_UNIVERSE;
  ID_UNIVERSE = new Set();
  const collect = (node) => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (node && typeof node === "object") {
      for (const [key, val] of Object.entries(node)) {
        if (typeof val === "string" && /Id$|^id$|^slug$/.test(key) && /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$/.test(val)) {
          ID_UNIVERSE.add(val);
        }
        collect(val);
      }
    }
  };
  for (const file of ["data/rcap-ledger/registry-crosswalk-projection.json", "data/rcap-ledger/track-pathway-crosswalk.json"]) {
    const abs = path.join(rootDir, file);
    if (fs.existsSync(abs)) collect(JSON.parse(fs.readFileSync(abs, "utf8")));
  }
  return ID_UNIVERSE;
}

// Absence claims a lane wrote as a scan result: `'X' 0 hits`, `X appears
// nowhere`, `no occurrence of X`. Each claimed-absent literal is re-checked;
// a literal that IS present falsifies the claim.
function claimedAbsentLiterals(quote) {
  const literals = [];
  for (const m of String(quote).matchAll(/['"“‘]([^'"“”‘’]{2,60})['"”’]\s*(?::\s*)?0 hits/g)) literals.push(m[1]);
  for (const m of String(quote).matchAll(/no occurrence of\s+([^\s,;]+(?:\s\d[\w().-]*)?)/gi)) literals.push(m[1]);
  for (const m of String(quote).matchAll(/([^\s,;]+)\s+appears nowhere/gi)) literals.push(m[1]);
  return literals
    .map((l) => l.replace(/[.,;]$/, ""))
    .filter((l) => /\d/.test(l) || (normalize(l).length >= 6 && !STOPWORDS.has(l.toLowerCase())));
}

const JURISDICTION_OF_JOB = (laneId, jobId) => {
  const rest = jobId.startsWith(`${laneId}-`) ? jobId.slice(laneId.length + 1) : jobId;
  const first = rest.split("-")[0];
  return /^[A-Z]{2}$/.test(first) ? first : null;
};

// --- the audited package set ------------------------------------------------

// The eight dispatched E2 lanes are named by the frozen assignment. E-SPECIAL is
// a ninth evidence package, authored during final E3 for the six subjects no
// lane owned; nothing in the assignment names it, so an audit that enumerated
// only assignment.lanes would silently exclude its citations and report a
// denominator short by exactly those rows. It is audited on identical terms.
const EXTRA_PACKAGES = [
  { laneId: "E-SPECIAL", evidencePath: "data/rcap-ledger/e2-evidence/E-SPECIAL.json" }
];

/** Every evidence package the audit must cover: dispatched lanes plus E-SPECIAL. */
function auditPackages() {
  const assignment = JSON.parse(fs.readFileSync(path.join(rootDir, ASSIGNMENT), "utf8"));
  const named = new Set(assignment.lanes.map((l) => l.laneId));
  return [...assignment.lanes, ...EXTRA_PACKAGES.filter((p) => !named.has(p.laneId))];
}

// --- the audit engine -------------------------------------------------------

function buildAudit() {
  const rows = [];
  const laneMeta = [];
  const problems = []; // structural problems found while building (verify-mode failures)

  for (const lane of auditPackages()) {
    const abs = path.join(rootDir, lane.evidencePath);
    if (!fs.existsSync(abs)) {
      problems.push(`lane ${lane.laneId}: evidence file ${lane.evidencePath} is missing`);
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(abs, "utf8"));
    const findings = Array.isArray(doc.findings) ? doc.findings : [];
    laneMeta.push({
      laneId: lane.laneId,
      evidencePath: lane.evidencePath,
      evidenceSha256: sha256(fs.readFileSync(abs, "utf8")),
      baseCommit: doc.baseCommit ?? null,
      webAccessAvailable: doc.webAccessAvailable ?? null,
      findings: findings.length
    });

    for (const finding of findings) {
      const jurisdiction = JURISDICTION_OF_JOB(lane.laneId, String(finding.jobId ?? ""));
      const groups = [
        { pathwayId: null, evidence: Array.isArray(finding.evidence) ? finding.evidence : [] },
        ...(Array.isArray(finding.surplusPathways)
          ? finding.surplusPathways.map((p) => ({
              pathwayId: p.compiledPathwayId ?? null,
              evidence: Array.isArray(p.evidence) ? p.evidence : []
            }))
          : [])
      ];

      // Finding-level context for flags.
      const findingSources = groups.flatMap((g) => g.evidence.map((e) => sourceToken(e.source)));
      const findingHasOfficialSource = findingSources.some((t) => isOfficialRoot(t.split("@")[0]));
      const findingStatuteValues = groups
        .flatMap((g) => g.evidence)
        .filter((e) => e.kind === "statutory_citation")
        .map((e) => String(e.value ?? ""));
      const findingHasSubsection = findingStatuteValues.some((v) => /\(\s*[0-9a-z]{1,3}\s*\)/i.test(v));
      const proposesMapping = finding.proposedMapping != null || finding.proposedRegistryTrack != null;

      for (const group of groups) {
        group.evidence.forEach((entry, index) => {
          rows.push(
            auditEntry({
              lane,
              doc,
              finding,
              jurisdiction,
              pathwayId: group.pathwayId,
              index,
              entry,
              findingHasOfficialSource,
              findingHasSubsection,
              proposesMapping
            })
          );
        });
      }
    }
  }

  rows.sort((a, b) => (a.evidenceId < b.evidenceId ? -1 : a.evidenceId > b.evidenceId ? 1 : 0));

  // Duplicate identity: two byte-identical submissions inside one lane.
  const identitySeen = new Map();
  for (const row of rows) {
    const key = row.identitySha256;
    if (identitySeen.has(key)) {
      row.flags.push("duplicate_of:" + identitySeen.get(key));
    } else {
      identitySeen.set(key, row.evidenceId);
    }
  }

  return { rows, laneMeta, problems };
}

function auditEntry(ctx) {
  const { lane, finding, jurisdiction, pathwayId, index, entry } = ctx;
  const source = String(entry.source ?? "");
  const token = sourceToken(source);
  const pinned = /^(.+?)@([0-9a-f]{7,40})$/.exec(token);
  const sourcePath = pinned ? pinned[1] : token;
  const sourceRef = pinned ? pinned[2] : null;
  const quote = String(entry.quote ?? "");
  const value = String(entry.value ?? "");

  const row = {
    evidenceId: `${lane.laneId}:${finding.jobId}:${pathwayId ?? "-"}:${index}`,
    laneId: lane.laneId,
    jobId: finding.jobId,
    jurisdiction,
    pathwayId,
    kind: entry.kind ?? null,
    value,
    sourcePath,
    sourceRef,
    sourceKind: sourceKindOf(sourcePath),
    quoteSha256: sha256(quote),
    quotePreview: quote.length > 110 ? `${quote.slice(0, 110)}…` : quote,
    identitySha256: sha256([lane.laneId, finding.jobId, pathwayId ?? "", entry.kind ?? "", value, token, quote].join(" ")),
    classification: null,
    quoteVerbatim: false,
    quotedCores: 0,
    coresVerified: 0,
    supportScore: null,
    supportsProposition: null,
    smallestSupportingLocation: null,
    flags: []
  };

  // 1-2. Resolve bytes.
  const src = readSource(token);
  if (!src.ok) {
    row.classification = "source_missing";
    row.supportsProposition = "no";
    return finishFlags(row, ctx);
  }

  // 3. Pointer: a jurisdiction-scoped source must belong to the job's
  // jurisdiction, and identifiers the entry names must exist in the bytes.
  const norm = normalizedSource(token);
  if (row.sourceKind === "compiled_profile" && jurisdiction) {
    const fileJur = /profiles\/([A-Z]{2})-/.exec(sourcePath)?.[1] ?? null;
    if (fileJur && fileJur !== jurisdiction) {
      row.classification = "pointer_invalid";
      row.supportsProposition = "no";
      row.flags.push(`pointer_jurisdiction_mismatch:${fileJur}`);
      return finishFlags(row, ctx);
    }
  }
  const universe = idUniverse();
  // Only unambiguous identifiers act as pointers: underscore ids, ids with
  // digits, or three-plus-segment kebab ids. Two-segment kebab ids collide
  // with adjectival English ("juvenile-sealing text") and are not checked.
  const namedIds = [...value.matchAll(/\b[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+\b/g)]
    .map((m) => m[0])
    .filter((id) => universe.has(id))
    .filter((id) => id.includes("_") || /\d/.test(id) || id.split("-").length >= 3);
  const missingIds = namedIds.filter((id) => !norm.text.includes(normalize(id)));
  if (namedIds.length > 0 && missingIds.length === namedIds.length && entry.kind !== "absence_proof") {
    row.classification = "pointer_invalid";
    row.supportsProposition = "no";
    row.flags.push(`pointer_ids_absent:${missingIds.slice(0, 3).join(",")}`);
    return finishFlags(row, ctx);
  }

  // Absence claims are verified as absences: a literal the quote says has
  // zero hits, but which IS in the cited bytes, falsifies the submission.
  const absentLiterals = claimedAbsentLiterals(quote);
  const falselyAbsent = absentLiterals.filter((l) => norm.text.includes(normalize(l)));
  if (falselyAbsent.length > 0) {
    row.classification = "unsupported_by_cited_source";
    row.supportsProposition = "no";
    row.flags.push(`false_absence:${falselyAbsent.slice(0, 3).join(",")}`);
    return finishFlags(row, ctx);
  }

  // 4. Quote classification.
  const normQuote = normalize(quote);
  const cores = quotedCores(quote);
  row.quotedCores = cores.length;

  if (normQuote.length > 0 && norm.text.includes(normQuote)) {
    row.classification = "exact_verbatim";
    row.quoteVerbatim = true;
    row.supportsProposition = "textual";
    row.smallestSupportingLocation = locate(src, norm, normQuote);
    return finishFlags(row, ctx);
  }

  const verifiedCores = cores.filter((c) => norm.text.includes(normalize(c)));
  row.coresVerified = verifiedCores.length;
  const coreFailed = cores.length > 0 && verifiedCores.length < cores.length;
  if (coreFailed) row.flags.push(`quoted_core_not_in_source:${cores.length - verifiedCores.length}`);

  // Support score: fraction of salient anchors present in the cited bytes.
  const anchors = anchorsOf(value, quote);
  const srcSpines = sourceSpines(token);
  let hit = 0;
  for (const anchor of anchors) {
    if (anchor.type === "spine" ? srcSpines.has(anchor.key) : norm.text.includes(normalize(anchor.key))) hit += 1;
  }
  row.supportScore = anchors.length > 0 ? Number((hit / anchors.length).toFixed(3)) : 0;

  const lowerQuote = quote.toLowerCase();
  const concludes = CONCLUSION_MARKERS.some((m) => lowerQuote.includes(m));
  const isAbsence = entry.kind === "absence_proof";

  if (cores.length > 0 && verifiedCores.length === cores.length) {
    // Every quoted fragment is really in the source; the wrapper is the lane's.
    row.classification = concludes || isAbsence ? "interpretive_conclusion" : "faithful_paraphrase";
    row.supportsProposition = "derivable";
    row.smallestSupportingLocation = locate(src, norm, normalize(verifiedCores[0]));
    return finishFlags(row, ctx);
  }

  if (isAbsence) {
    // An absence proof is never text in the source; it is a scan result over
    // the source. Its support is derivable exactly when its positive anchors
    // (the things it says ARE there) check out.
    row.classification = "interpretive_conclusion";
    row.supportsProposition = row.supportScore >= 0.5 ? "derivable" : "requires_reread";
    row.smallestSupportingLocation = firstAnchorLocation(src, norm, srcSpines, anchors);
    return finishFlags(row, ctx);
  }

  if (row.supportScore >= 0.6) {
    row.classification = concludes ? "interpretive_conclusion" : "faithful_paraphrase";
    row.supportsProposition = concludes || coreFailed ? "requires_reread" : "derivable";
    row.smallestSupportingLocation = firstAnchorLocation(src, norm, srcSpines, anchors);
    return finishFlags(row, ctx);
  }

  if (row.supportScore >= 0.3) {
    row.classification = "interpretive_conclusion";
    row.supportsProposition = "requires_reread";
    row.smallestSupportingLocation = firstAnchorLocation(src, norm, srcSpines, anchors);
    return finishFlags(row, ctx);
  }

  row.classification = "unsupported_by_cited_source";
  row.supportsProposition = "no";
  return finishFlags(row, ctx);
}

function finishFlags(row, ctx) {
  // 7. Secondary authority where the finding proposes an operative outcome and
  // no primary/official source appears anywhere in the finding's evidence.
  if (
    row.kind === "statutory_citation" &&
    ctx.proposesMapping &&
    !ctx.findingHasOfficialSource &&
    (row.sourceKind === "compiled_profile" || row.sourceKind === "ledger_artifact")
  ) {
    row.flags.push("secondary_authority_for_operative_claim");
  }
  // 8. Official-source claims with no official source in the repository.
  if (row.kind === "official_form" && !isOfficialRoot(row.sourcePath)) {
    row.flags.push("official_claim_no_official_source_in_repo");
  }
  // 9. Mapping conclusions resting only on a broad section.
  if (ctx.proposesMapping && !ctx.findingHasSubsection && row.kind === "statutory_citation") {
    row.flags.push("mapping_without_subsection_granularity");
  }
  if (ctx.finding && ctx.finding.delta != null && row.kind !== "statutory_citation" && row.kind !== "official_form") {
    const supportKinds = ["registry_scope_restriction", "absence_proof"];
    if (!supportKinds.includes(row.kind ?? "")) row.flags.push("quantity_reconciliation_context");
  }
  return row;
}

/** Line span of the first normalized match, mapped back to raw bytes. */
function locate(src, norm, normNeedle) {
  const at = norm.text.indexOf(normNeedle);
  if (at < 0 || norm.map.length === 0) return null;
  const rawStart = norm.map[at];
  const rawEnd = norm.map[Math.min(at + normNeedle.length - 1, norm.map.length - 1)];
  const before = src.raw.slice(0, rawStart);
  const lineStart = before.split("\n").length;
  const lineEnd = lineStart + src.raw.slice(rawStart, rawEnd + 1).split("\n").length - 1;
  return { path: src.path, ref: src.ref, lineStart, lineEnd };
}

function firstAnchorLocation(src, norm, srcSpines, anchors) {
  for (const anchor of anchors) {
    if (anchor.type === "spine") continue; // spines match structurally, not positionally
    const found = locate(src, norm, normalize(anchor.key));
    if (found) return found;
  }
  return null;
}

// --- aggregation ------------------------------------------------------------

function aggregate(rows, laneMeta) {
  const by = (keyFn) => {
    const out = {};
    for (const row of rows) {
      const k = keyFn(row);
      out[k] = (out[k] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(out).sort());
  };
  const severityOf = (row) => {
    if (["source_missing", "pointer_invalid", "unsupported_by_cited_source"].includes(row.classification)) return "high";
    if (row.classification === "interpretive_conclusion" || row.supportsProposition === "requires_reread") return "medium";
    return "low";
  };
  for (const row of rows) row.severity = severityOf(row);

  const perLane = {};
  for (const meta of laneMeta) {
    const laneRows = rows.filter((r) => r.laneId === meta.laneId);
    perLane[meta.laneId] = {
      evidenceEntries: laneRows.length,
      classifications: countBy(laneRows, (r) => r.classification),
      severity: countBy(laneRows, (r) => r.severity),
      flagged: laneRows.filter((r) => r.flags.length > 0).length
    };
  }
  return {
    totals: {
      evidenceEntries: rows.length,
      classifications: countBy(rows, (r) => r.classification),
      severity: countBy(rows, (r) => r.severity),
      supportsProposition: countBy(rows, (r) => r.supportsProposition),
      flags: countFlags(rows),
      nonVerbatimRate: rows.length
        ? Number((100 * (rows.length - rows.filter((r) => r.classification === "exact_verbatim").length) / rows.length).toFixed(1))
        : 0
    },
    perLane
  };
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const k = keyFn(row);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort());
}

function countFlags(rows) {
  const out = {};
  for (const row of rows) {
    for (const flag of row.flags) {
      const base = flag.split(":")[0];
      out[base] = (out[base] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(out).sort());
}

// --- artifact ---------------------------------------------------------------

function buildArtifact() {
  const { rows, laneMeta, problems } = buildAudit();
  const aggregates = aggregate(rows, laneMeta);
  return {
    artifact: {
      schemaVersion: "rcap-e2-source-support-audit/v1",
      purpose:
        "One audited row per E2 evidence citation: source resolution, pointer validity, quote classification, support verdict, smallest supporting location, and structural flags. Intake aid for final E3; adjudicates nothing.",
      generatedBy: "scripts/verify-rcap-e2-source-support-audit.mjs --write",
      deterministic: true,
      input: {
        assignment: ASSIGNMENT,
        lanes: laneMeta
      },
      aggregates,
      rows
    },
    problems
  };
}

function writeArtifacts() {
  const { artifact } = buildArtifact();
  const jsonAbs = path.join(rootDir, AUDIT_JSON);
  fs.mkdirSync(path.dirname(jsonAbs), { recursive: true });
  fs.writeFileSync(jsonAbs, `${JSON.stringify(artifact, null, 1)}\n`);

  const mdAbs = path.join(rootDir, AUDIT_MD);
  fs.mkdirSync(path.dirname(mdAbs), { recursive: true });
  fs.writeFileSync(mdAbs, renderMarkdown(artifact));
  console.log(`wrote ${AUDIT_JSON} (${artifact.rows.length} rows) and ${AUDIT_MD}`);
}

function renderMarkdown(artifact) {
  const { aggregates } = artifact;
  const t = aggregates.totals;
  const lines = [];
  lines.push("# E2 Source-Support Audit (intake aid for final E3)");
  lines.push("");
  lines.push(
    "One row per evidence citation submitted by the eight E2 lanes, answering one question per row: do the cited bytes actually support the claim attached to them? The audit adjudicates nothing — E3 owns every acceptance decision. Machine-readable rows: `data/rcap-crosswalk-enrichment/e2-source-support-audit.json`. Every classification is deterministic over committed bytes; `node scripts/verify-rcap-e2-source-support-audit.mjs` recomputes the whole artifact and fails on any drift."
  );
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push("- Sources resolve from the working tree, or from the pinned commit for `path@commit` citations (read with `git show`, unlike the intake check, which skips fidelity on pins).");
  lines.push("- Pointer checks: a jurisdiction-scoped source must belong to the job's jurisdiction; kebab/snake identifiers named in `value` must exist in the cited bytes (absence proofs exempt — absence is their point).");
  lines.push("- `exact_verbatim` means the whole normalized `quote` is present in the cited bytes (case, whitespace and punctuation insensitive — the same normalization family as the intake check).");
  lines.push("- A quote whose inner 'quoted cores' all verify but whose wrapper is the lane's own prose is `faithful_paraphrase`, or `interpretive_conclusion` when the wrapper draws an inference (marker vocabulary in the script).");
  lines.push("- Unquoted text is scored by salient-anchor support: statute citation spines (leading zeros dropped, so `12.55.085` matches `12-55-85`) plus distinctive tokens. High support without inference markers → `faithful_paraphrase`; inference markers → `interpretive_conclusion`; low support → `unsupported_by_cited_source`.");
  lines.push("- Support verdicts: `textual` (the bytes state it), `derivable` (verified fragments or anchors carry it), `requires_reread` (a conclusion E3 must re-derive), `no`.");
  lines.push("- Severity: high = source_missing / pointer_invalid / unsupported; medium = conclusions and anything requiring a re-read; low = verbatim and supported paraphrase.");
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- Evidence entries audited: **${t.evidenceEntries}**`);
  lines.push(`- Non-verbatim rate (recomputed, denominator = all ${t.evidenceEntries} entries incl. pinned): **${t.nonVerbatimRate}%** (prior provisional figure: 32.6% over 903 unpinned quotes)`);
  lines.push("");
  lines.push("| Classification | Count |");
  lines.push("|---|---|");
  for (const [k, v] of Object.entries(t.classifications)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("| Support verdict | Count |");
  lines.push("|---|---|");
  for (const [k, v] of Object.entries(t.supportsProposition)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|---|---|");
  for (const [k, v] of Object.entries(t.severity)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("| Flag | Count |");
  lines.push("|---|---|");
  for (const [k, v] of Object.entries(t.flags)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("## Per lane");
  lines.push("");
  lines.push("| Lane | Entries | exact_verbatim | faithful_paraphrase | interpretive_conclusion | unsupported | source_missing | pointer_invalid | high sev | flagged |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const [laneId, lane] of Object.entries(aggregates.perLane)) {
    const c = lane.classifications;
    lines.push(
      `| ${laneId} | ${lane.evidenceEntries} | ${c.exact_verbatim ?? 0} | ${c.faithful_paraphrase ?? 0} | ${c.interpretive_conclusion ?? 0} | ${c.unsupported_by_cited_source ?? 0} | ${c.source_missing ?? 0} | ${c.pointer_invalid ?? 0} | ${lane.severity.high ?? 0} | ${lane.flagged} |`
    );
  }
  lines.push("");
  lines.push("## Systemic observations (facts, not adjudications)");
  lines.push("");
  lines.push("- **No official source store exists at this base.** `private/Nationwide Record Clearing/` and `data/record-clearing/` are absent from the tree; the nine pinned `data/record-clearing/...@3b6f4c10` citations resolve only through git history. Every `official_form` citation cites a compiled profile or ledger artifact — the `official_claim_no_official_source_in_repo` flag is therefore systemic, not a lane defect: no E2 lane *could* cite an official artifact from this tree, and lanes that tried the web recorded EGRESS_BLOCKED (e.g. E2-D's webAccessNote).");
  lines.push("- **Statutory support is secondary throughout.** Statutory citations resolve to compiled profiles and crosswalk artifacts (repository-derived descriptions of statutes), never to statute text. `secondary_authority_for_operative_claim` marks the subset where a finding proposes an operative outcome with no official source anywhere in its evidence set.");
  lines.push("- **Absence proofs are scans, not quotes.** They are classified `interpretive_conclusion` by construction and their support verdict reflects whether the positive anchors they enumerate really are in the cited bytes.");
  lines.push("- E2-C carries its evidence under `surplusPathways`, per its surplus-reconciliation contract; its rows carry the `pathwayId` column and its delta-context rows are flagged `quantity_reconciliation_context` so E3 sees which citations exist to reconcile counts rather than to establish authority.");
  lines.push("");
  lines.push("## What this audit does not do");
  lines.push("");
  lines.push("It does not decide whether any proposed mapping, disposition or relationship is correct, does not re-litigate the frozen assignment or denominators, and does not modify any lane's evidence. A `requires_reread` or `high` row is a reading instruction for E3, not a verdict against the finding.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// --- verification -----------------------------------------------------------

function verify() {
  const failures = [];
  const { artifact: recomputed, problems } = buildArtifact();
  for (const problem of problems) failures.push(problem);

  const jsonAbs = path.join(rootDir, AUDIT_JSON);
  if (!fs.existsSync(jsonAbs)) {
    console.error(`verify-rcap-e2-source-support-audit FAILED\n - ${AUDIT_JSON} does not exist; run with --write`);
    process.exit(1);
  }
  const committed = JSON.parse(fs.readFileSync(jsonAbs, "utf8"));

  // Silent lane omission — every audited package must appear, E-SPECIAL included.
  for (const lane of auditPackages()) {
    if (!committed.input.lanes.some((l) => l.laneId === lane.laneId)) {
      failures.push(`lane omitted from audit input: ${lane.laneId}`);
    }
    if (!committed.rows.some((r) => r.laneId === lane.laneId)) {
      failures.push(`lane has no audited rows: ${lane.laneId}`);
    }
  }

  // Missing evidence entries — the audit must carry one row per citation.
  if (committed.rows.length !== recomputed.rows.length) {
    failures.push(`row count drift: committed ${committed.rows.length}, recomputed ${recomputed.rows.length}`);
  }

  // Duplicate evidence identity of audit rows.
  const ids = new Set();
  for (const row of committed.rows) {
    if (ids.has(row.evidenceId)) failures.push(`duplicate evidenceId: ${row.evidenceId}`);
    ids.add(row.evidenceId);
  }

  // Row-level invariants on the committed artifact.
  for (const row of committed.rows) {
    const token = row.sourceRef ? `${row.sourcePath}@${row.sourceRef}` : row.sourcePath;
    const src = readSource(token);
    if (row.sourceRef && !src.ok && row.classification !== "source_missing") {
      failures.push(`${row.evidenceId}: pinned commit ${row.sourceRef.slice(0, 10)} does not resolve`);
      continue;
    }
    if (!src.ok && row.classification !== "source_missing") {
      failures.push(`${row.evidenceId}: source ${row.sourcePath} missing but classified ${row.classification}`);
      continue;
    }
    if (row.classification === "exact_verbatim") {
      const norm = normalizedSource(token);
      const committedQuoteOk = row.quoteSha256 && norm.text.length > 0;
      // Recompute from the lane file via the recomputed twin row (same id).
      const twin = recomputed.rows.find((r) => r.evidenceId === row.evidenceId);
      if (!twin || twin.classification !== "exact_verbatim" || !committedQuoteOk) {
        failures.push(`${row.evidenceId}: classified exact_verbatim but the text is not present in the cited bytes`);
      }
    }
    if (row.classification === "unsupported_by_cited_source" && ["textual", "derivable"].includes(row.supportsProposition)) {
      failures.push(`${row.evidenceId}: unsupported by cited source yet carries a supporting verdict`);
    }
    if (row.classification === "pointer_invalid" && row.supportsProposition !== "no") {
      failures.push(`${row.evidenceId}: pointer_invalid must not carry support`);
    }
  }

  // Full determinism: the committed artifact must equal the recomputation.
  const strip = (a) => JSON.stringify(a);
  if (strip(committed) !== strip(recomputed)) {
    failures.push("artifact drift: committed audit does not equal deterministic recomputation (run --write and inspect the diff)");
  }

  if (failures.length > 0) {
    console.error("verify-rcap-e2-source-support-audit FAILED");
    for (const failure of failures.slice(0, 40)) console.error(` - ${failure}`);
    if (failures.length > 40) console.error(` … and ${failures.length - 40} more`);
    process.exit(1);
  }

  const t = committed.aggregates.totals;
  console.log("verify-rcap-e2-source-support-audit passed.");
  console.log(`  rows: ${t.evidenceEntries} across ${committed.input.lanes.length} lanes; artifact equals deterministic recomputation`);
  console.log(`  classifications: ${JSON.stringify(t.classifications)}`);
  console.log(`  non-verbatim rate (all entries, pins included): ${t.nonVerbatimRate}%`);
}

if (WRITE) {
  writeArtifacts();
} else if (STATS) {
  const { artifact } = buildArtifact();
  console.log(JSON.stringify(artifact.aggregates, null, 1));
} else {
  verify();
}
