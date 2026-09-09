/**
 * SHARED BUILD CORE FOR THE DELAWARE SUPERIOR COURT EXPUNGEMENT PACKET FAMILIES.
 *
 * ONE WRITER, TWO FAMILIES. `de_pardon_expungement-set` (11 Del. C. § 4375) and
 * `de_discretionary_superior_court-set` (11 Del. C. § 4374) are separate routes
 * with separate proposed orders, and they bind the SAME required primary
 * filing: CIV_EXP_02_A, the Superior Court's Petition for Expungement of Adult
 * Record. Two builders reading that one document independently is two chances
 * to read it differently, so the reading lives here once and each family
 * supplies only what is its own.
 *
 * Everything in this module is family-independent plumbing: deterministic
 * rendering, the encrypted-source transport, the census, the byte proof, the
 * builder's own count of the nine completeness counters, and the census-v1
 * output records. It is a direct descendant of the core proven by
 * scripts/build-census-v1-me-seal-gen-set.mjs, which is itself the FABLE-B12
 * composed-treatment core plus an official-document component.
 *
 * WHAT THIS CORE ADDS TO THE ONE IT DESCENDS FROM
 *
 *   1. A GATE COMPARING THE FINALIZER'S WRITES TO THE FIELD MAP'S WRITES.
 *      DEFECTS_NO_COUNTER_CAN_SEE `map-honest-writes-not`. The completeness
 *      contract reads the map; a finalizer that writes something else is
 *      invisible to all nine counters. Any disagreement, in either direction,
 *      stops the family.
 *
 *   2. A TABLE GEOMETRY GATE. DEFECTS_NO_COUNTER_CAN_SEE
 *      `acroform-index-is-not-the-printed-row` and
 *      `extracted-line-order-is-not-column-order`. Both Delaware charge tables
 *      name their widgets RowN and ColumnName, and neither name is evidence of
 *      where the cell sits on the paper. Before anything is rendered this core
 *      reads the printed headings by x-position from the document's own bytes,
 *      proves each declared column's cells sit under the heading the family
 *      claims for them and under no other, proves the rows descend the page in
 *      the declared order with no two rows sharing a band, and proves the table
 *      body carries no printed row numbers that a geometric order could
 *      contradict. A table that does not measure stops the family.
 *
 *   3. CAPTION CORRECTIONS AS FAMILY DATA rather than as a constant. The
 *      Delaware forms print a two-column caption block whose right-hand column
 *      is the Attorney General's three county addresses, and the shared capture
 *      reaches across it: on the pinned CIV_EXP_02_A it captions the Date of
 *      Birth blank "Sussex County", the P.O. Box line "Wilmington, DE 19801"
 *      and the street-address line "New Castle County Crim. Case No". A caption
 *      is matched against the protect rules and against the descriptor
 *      registry, so those are not mislabels -- they are bindings. Each is
 *      corrected against the printed page, and a correction whose recorded
 *      capture no longer matches stops the build rather than being applied.
 *
 * THE SOURCES ARE ENCRYPTED, AND THAT IS HANDLED BY TRANSPORT, NOT SUBSTITUTION
 *
 * Every Delaware Superior Court expungement binary this core reads is an
 * AES-256 encrypted PDF (V=5, R=6, StdCF, empty user password). pdf-lib has no
 * security handler at all: `ignoreEncryption: true` suppresses the throw and
 * then parses ciphertext, which surfaces as "Expected instance of PDFDict, but
 * got instance of undefined". No census, no write and no ink audit is possible
 * against those bytes directly.
 *
 * This core does not answer that by binding some other file. The identity stays
 * the pinned official binary, byte for byte, and its SHA-256 is recomputed from
 * the file on disk before and after the read. What changes is transport: at
 * build time the exact pinned bytes are opened with pikepdf (libqpdf) and saved
 * as a decrypted derivative with deterministic_id, so two builds of the same
 * pinned source produce the same derivative; the derivative is then PROVED
 * equivalent to the official binary by the repository's own fidelity reader,
 * scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py -- page count,
 * page geometry, the terminal field set, every field difference, the page
 * content streams and XFA -- and the family STOPS with stopClass
 * UNLOCKED_DERIVATIVE_IS_NOT_EQUIVALENT_TO_THE_OFFICIAL_BINARY rather than
 * rendering if any of them differ.
 *
 * That is the pattern census-v1-ca-1203-4-set proved on five encrypted
 * California forms and census-v1-me-seal-gen-set carried to a terminal family
 * on Maine's CR-218, where the field map records renderStrategy
 * "pikepdf_unlocked_derivative_then_official_form_finalizer". The derivative is
 * a transport step. It is not committed, it is deleted when the build ends, and
 * it is never the bound identity.
 *
 * THE REVIEW DERIVATIVES IN THE REPOSITORY ARE NOT USED AND MUST NOT BE.
 * data/rcap-all50/overlays/rescued-encrypted-pdfs/delaware-download-aspx-rescued.pdf
 * (sha256 bc39abcda95beef0...) is a review derivative. Its digest appears in no
 * committed source record and in no corpus-index entry, and binding it would
 * satisfy one identity with the bytes of another. This core generates its own
 * derivative from the pinned bytes at build time and binds neither.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { preserveIdentityRefresh } from "../rcap-packet-completeness/identity-refresh.mjs";

import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "../rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay, finalizeOfficialForm } from "../rcap-official-forms/rcap-official-form-finalize.mjs";
import { captureWidgetContext } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "../rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { isoDateInPrintedOrder } from "../rcap-official-forms/rcap-official-form-finalize.mjs";
import { resolveFact } from "../rcap-official-forms/rcap-field-semantics.mjs";
import { makeCorpusEntryResolver } from "../lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "../rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(thisFile), "..", "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, StandardFonts, rgb } = require("pdf-lib");

/* ---- the printed page, read in the order it is printed ------------------------ *
 *
 * The repository's own extractTextItems is the reader every builder uses, and
 * on these four Delaware binaries it is not a reliable reader of PRINTED ORDER.
 * Measured on the unlocked derivative of CIV_EXP_02_A: the sentence the form
 * prints as "Pursuant to 11 Del. C. § 4374," comes back as "Pursuant to 11 Del.
 * C. § 7443,", because the form draws "43" at x=144.36 and "74" at x=144.31 --
 * two runs whose declared advance widths are 0.07pt, overlapping each other, so
 * an x-ordered read of them is a coin toss. Whole lines arrive scrambled the
 * same way ("uperSior Court", "crminali record").
 *
 * That does not affect the ink audit, which subtracts the source's own items
 * from the output's by position and content and is therefore unaffected by a
 * scrambling both sides share. It does affect anything that has to READ the
 * page: the table-geometry gate below has to know where a heading is printed.
 *
 * So the gate reads the page with poppler's pdftotext -bbox-layout, which
 * orders by advance width rather than by declared width and returns the
 * printed text correctly on these forms, and it reads the UNLOCKED DERIVATIVE,
 * which has been proved content-stream identical to the pinned binary. Where
 * poppler is absent the gate cannot run and the family stops; it is never
 * skipped.
 */
export function printedWords(pdfPath) {
  let xml;
  try {
    xml = execFileSync("pdftotext", ["-bbox-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    return { ok: false, why: `pdftotext could not read the page: ${String(error.stderr ?? error.message).slice(0, 400)}` };
  }
  const pages = [];
  const pageRe = /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g;
  const wordRe = /<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)">([\s\S]*?)<\/word>/g;
  let page;
  while ((page = pageRe.exec(xml)) !== null) {
    const height = Number(page[2]);
    const words = [];
    let w;
    while ((w = wordRe.exec(page[3])) !== null) {
      words.push({
        text: w[5].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        x0: Number(w[1]), x1: Number(w[3]),
        // pdftotext measures from the top of the page; PDF user space measures
        // from the bottom, and every widget rectangle in this build is in user
        // space.
        y0: height - Number(w[4]), y1: height - Number(w[2])
      });
    }
    pages.push(words);
  }
  return { ok: true, pages };
}

const normalizeCaption = (s) => String(s ?? "").normalize("NFKD").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim();

/*
 * The composed page is drawn in StandardFonts.TimesRoman.
 *
 * The SECTION SIGN substitution the core this descends from makes -- "§" to
 * "Sec. " -- is dropped here, deliberately. WinAnsiEncoding carries U+00A7 at
 * 0xA7 and pdf-lib draws it (measured: widthOfTextAtSize returns 6 at 12pt), so
 * the substitution is not required, and a Delaware filing that cites "11 Del.
 * C. Sec. 4375" where the Code says 11 Del. C. § 4375 is printing a citation
 * the Code does not use. Every other substitution stands.
 */
function sanitizePdfText(text) {
  return String(text).replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("…", "...").replaceAll("Φ", "-");
}

const DOTS = (n = 84) => ".".repeat(n);

/**
 * Builds one family's runner over this core.
 *
 * @param {object} SPEC the family's own bindings, components, maps and copy.
 * @returns {{ runFamily: (argv?: string[]) => Promise<object> }}
 */
export function makeFamily(SPEC) {
const PACKET_SET_MANIFESTS = SPEC.packetSetManifests ?? "data/record-clearing/legal-design-packet-set-manifests.json";
const PACKET_SET_ID = SPEC.packetSetId ?? SPEC.familyId;
const FORBIDDEN_WORD = SPEC.forbiddenWord ?? null;
const FORBIDDEN_WORD_IS_ALLOWED_ONLY_IN = SPEC.forbiddenWordAllowedOnlyIn ?? [];

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const MASTER_LIBRARY = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";

const STRATEGY = SPEC.implementationStrategy ?? "participant_agency_application";
const OFFICIAL = SPEC.officialComponents ?? {};
const isOfficial = (componentId) => Object.hasOwn(OFFICIAL, componentId);

/* ---- committed-record binding ------------------------------------------------ *
 * The authority this family composes from is a set of COMMITTED repository
 * records, each bound by exact SHA-256 at build time, and each anchor string a
 * statement this build RELIES ON, re-read from the committed bytes before
 * anything is composed. The build refuses if a record is missing or an anchor
 * is no longer there. */
function resolveRecords() {
  const resolved = [];
  const failures = [];
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const missing = (rec.mustContain ?? []).filter((a) => !text.includes(a));
    if (missing.length > 0) {
      failures.push({
        recordId: rec.recordId, path: rec.path,
        why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`,
        missingAnchors: missing
      });
      continue;
    }
    resolved.push({
      recordId: rec.recordId, path: rec.path, role: rec.role,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length
    });
  }
  return { resolved, failures };
}

/* ---- transport: an encrypted official binary, unlocked and PROVED --------------- *
 *
 * The identity is the pinned official binary and stays the pinned official
 * binary. This step exists because the corpus toolchain cannot READ those
 * bytes: CR-218 is encrypted with an empty user password and pdf-lib throws in
 * PDFCatalog.Pages before it reaches a page.
 *
 * pikepdf (libqpdf) opens the exact pinned bytes and saves a decrypted
 * derivative with deterministic_id, so the derivative is a function of the
 * pinned source and two builds agree. The derivative is then PROVED equivalent
 * to the official binary by the repository's own fidelity reader — page count,
 * page geometry, the terminal field set, every field difference, the page
 * content streams and XFA — and the family stops rather than rendering if any
 * of them differ. The source's own SHA-256 is recomputed before and after, so
 * a read that altered the source would be caught rather than assumed away.
 *
 * The derivative is written to a build-time temporary directory, is never
 * committed, and is deleted when the build ends. It is transport, not identity.
 */
const UNLOCK_FIDELITY_READER = "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py";

const UNLOCK_BRIDGE = `
import hashlib, importlib.util, json, os, sys
import pikepdf

request = json.loads(sys.argv[1])

def sha256_file(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

def load_module(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(request["root"], rel))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

fidelity = load_module("pf07_fidelity_reader", request["fidelityReader"])

source = request["sourcePath"]
derived = request["derivedPath"]
pinned = request["pinnedSha256"]

before = sha256_file(source)
if before != pinned:
    print(json.dumps({"ok": False, "why": "the source on disk does not hash to the pinned SHA-256 before the read",
                      "observed": before, "pinned": pinned}))
    sys.exit(0)

with pikepdf.open(source) as pdf:
    source_encrypted = pdf.is_encrypted
    # deterministic_id derives the trailer /ID from the file contents. Without
    # it every save mints a fresh random /ID and the family can never rebuild
    # byte-identically.
    pdf.save(derived, deterministic_id=True)

after = sha256_file(source)

official = fidelity.describe(source)
derivative = fidelity.describe(derived)
delta = fidelity.diff(official, derivative)

with pikepdf.open(derived) as d:
    derived_encrypted = d.is_encrypted

equivalent = (
    delta["pageCount"] is None
    and not delta["pageGeometry"]
    and not delta["fieldsOnlyInOfficial"]
    and not delta["fieldsOnlyInDerivative"]
    and not delta["fieldDifferences"]
    and not delta["contentStreamChangedPages"]
)

print(json.dumps({
    "ok": True,
    "sourceSha256Before": before,
    "sourceSha256After": after,
    "sourceUnchanged": before == after == pinned,
    "sourceEncrypted": source_encrypted,
    "derivedSha256": sha256_file(derived),
    "derivedByteLength": os.path.getsize(derived),
    "derivedEncrypted": derived_encrypted,
    "equivalent": bool(equivalent),
    "delta": delta,
    "pikepdfVersion": pikepdf.__version__,
    "libqpdfVersion": pikepdf.__libqpdf_version__,
    "createdBy": "pikepdf.open(exact_pinned_source).save(derived, deterministic_id=True)",
    "fidelityLogic": request["fidelityReader"],
}))
`;

/**
 * Unlocks one bound document in place and returns the transport record. Throws
 * nothing: an unusable result is returned so the caller stops the family with
 * it rather than rendering.
 */
function unlockBoundDocument(b, scratchDir) {
  const sourcePath = path.join(scratchDir, `${b.doc.documentId}-pinned-source.pdf`);
  const derivedPath = path.join(scratchDir, `${b.doc.documentId}-unlocked-derivative.pdf`);
  fs.writeFileSync(sourcePath, b.bytes);

  let raw;
  try {
    raw = execFileSync("python3", ["-c", UNLOCK_BRIDGE, JSON.stringify({
      root: ROOT, sourcePath, derivedPath,
      pinnedSha256: b.doc.sha256,
      fidelityReader: UNLOCK_FIDELITY_READER
    })], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
      /* The bridge imports a module from a directory this lane does not own;
       * without this it leaves a __pycache__ behind in it. */
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    });
  } catch (error) {
    return { ok: false, why: `the unlock bridge did not run: ${String(error.stderr ?? error.message).slice(0, 2000)}` };
  }
  let result;
  try { result = JSON.parse(raw.trim().split("\n").pop()); }
  catch { return { ok: false, why: `the unlock bridge returned output this build cannot read: ${raw.slice(0, 800)}` }; }

  if (result.ok !== true) return { ok: false, why: result.why, observed: result.observed ?? null };
  if (result.sourceUnchanged !== true) {
    return { ok: false, why: "the pinned source's SHA-256 did not survive the read unchanged", record: result };
  }
  if (result.derivedEncrypted !== false) {
    return { ok: false, why: "the derivative is still encrypted, so nothing was gained by it", record: result };
  }
  if (result.equivalent !== true) {
    return { ok: false, why: "the unlocked derivative is not equivalent to the official binary", record: result };
  }
  return { ok: true, derivedPath, record: result };
}

/* ---- official-document binding ------------------------------------------------ *
 * Resolved through the committed corpus index and its declared custody roots,
 * never by joining a path onto a guessed root: the index carries more than one
 * custody now and every custody but the Master Library writes
 * repository-relative paths. The pinned SHA-256 is what decides these are the
 * document's bytes, and it is re-computed from the file on disk. */
/*
 * A DOCUMENT THE COMMITTED MANIFEST DECLARES CONDITIONAL, WHOSE CONDITION THESE
 * FIXTURES DO NOT MEET.
 *
 * It is bound by exact SHA-256 and carried through the same proved-equivalent
 * unlock as every rendered document, so the receipt can say the source is held
 * here and readable here; it is NOT censused, NOT written on and NOT copied
 * into either packet, because a continuation sheet delivered blank is a sheet
 * that says the participant has more charges than the petition holds when they
 * have not. The condition and the reason it is unmet travel with it.
 */
function resolveDeclaredNotExercised() {
  const out = [];
  const failures = [];
  const declared = SPEC.declaredNotExercised ?? {};
  if (Object.keys(declared).length === 0) return { out, failures };
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: ROOT, masterLibraryRoot: path.join(ROOT, MASTER_LIBRARY)
  });
  for (const [componentId, doc] of Object.entries(declared)) {
    const candidates = (index.entries ?? []).filter((e) => e.sha256 === doc.sha256);
    let boundHere = null;
    const tried = [];
    for (const entry of candidates) {
      const file = resolver.resolve(entry);
      if (file === null || !fs.existsSync(file)) { tried.push({ custody: entry.custody, path: entry.path, why: "not mounted in this checkout" }); continue; }
      const bytes = fs.readFileSync(file);
      const observed = crypto.createHash("sha256").update(bytes).digest("hex");
      if (observed !== doc.sha256) { tried.push({ custody: entry.custody, path: entry.path, why: "the bytes on disk do not hash to the pinned SHA-256", observed }); continue; }
      boundHere = { componentId, doc, bytes, entry, custody: entry.custody, pathInCustody: entry.path };
      break;
    }
    if (!boundHere) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, custodiesTried: tried,
        why: "no custody here supplies bytes that hash to the pinned SHA-256 of a document this family declares" });
      continue;
    }
    out.push(boundHere);
  }
  return { out, failures };
}

function resolveOfficialDocuments() {
  const bound = [];
  const failures = [];
  if (Object.keys(OFFICIAL).length === 0) return { bound, failures };
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: ROOT, masterLibraryRoot: path.join(ROOT, MASTER_LIBRARY)
  });
  for (const [componentId, doc] of Object.entries(OFFICIAL)) {
    /*
     * One document, several custodies, and only some of them mounted.
     *
     * Both of this family's binaries appear TWICE in the committed index at
     * the same SHA-256: once under master_library and once under
     * d_source_packs, which is a pinned release this container does not carry.
     * Taking the FIRST entry that carries the hash makes the binding depend on
     * the index's row order rather than on the bytes, and reports a document
     * as unmounted while its identical bytes sit on disk under another
     * custody.
     *
     * So every candidate entry is tried, and the one that binds is the one
     * whose bytes are PRESENT and hash to the pinned digest. That is a
     * stricter test than the original, not a looser one: identity is still the
     * SHA-256 and nothing is accepted on a path alone. The receipt records
     * which custody actually supplied the bytes.
     */
    const candidates = (index.entries ?? []).filter((e) => e.sha256 === doc.sha256);
    if (candidates.length === 0) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, why: "no committed corpus-index entry carries this SHA-256" });
      continue;
    }
    let boundHere = null;
    const tried = [];
    for (const entry of candidates) {
      const file = resolver.resolve(entry);
      if (file === null || !fs.existsSync(file)) {
        tried.push({ custody: entry.custody ?? "master_library", path: entry.path, why: "not mounted in this checkout" });
        continue;
      }
      const bytes = fs.readFileSync(file);
      const observed = crypto.createHash("sha256").update(bytes).digest("hex");
      if (observed !== doc.sha256) {
        tried.push({ custody: entry.custody ?? "master_library", path: entry.path, why: "the bytes on disk do not hash to the pinned SHA-256", observed });
        continue;
      }
      boundHere = { componentId, doc, bytes, entry, custody: entry.custody, pathInCustody: entry.path };
      break;
    }
    if (!boundHere) {
      failures.push({
        sourceId: doc.sourceId, componentId, sha256: doc.sha256, custodiesTried: tried,
        why: "the corpus index names this document in one or more custodies and none of them supplies bytes here that hash to the pinned SHA-256"
      });
      continue;
    }
    bound.push(boundHere);
  }
  return { bound, failures };
}

/* ---- measured write boxes, read from the document's own strokes ---------------- *
 * A write box is four strokes read from the page content stream — the rule
 * above, the rule below, and a vertical divider on each side — and never a
 * constant offset from a caption. The top of the box is measured too: it
 * begins a fixed clearance under the LOWEST printed line inside the cell, so a
 * caption that wraps to two lines cannot have a value drawn over its second
 * line. A cell that does not measure is recorded as geometry drift and nothing
 * is drawn in it. */
const RULE_TOLERANCE = 1.6;
const SPAN_OVERLAP = 0.55;
const CELL_INSET = 3;
const WRITE_BOX_LIFT = 3.5;
const CAPTION_CLEARANCE = 2.5;
const MIN_WRITE_BOX_HEIGHT = 7.5;
const MAX_WRITE_BOX_HEIGHT = 12;

/*
 * The second measured shape: a RULED BLANK.
 *
 * Not every official form draws a cell grid. Alaska's DPS CRI-103 draws a
 * printed caption followed by a single horizontal stroke, and there is no
 * vertical divider on either side of it — so the four-stroke cell test above
 * finds nothing and would report the whole form as geometry drift. The stroke
 * IS the measurement here: its own x and endX give the horizontal extent the
 * form intends for the value, and the value sits on it, which is why the
 * finalizer's protected-rule test is expressed in the same terms.
 *
 * The ceiling is still measured rather than assumed: the box stops a fixed
 * clearance below the lowest printed baseline that sits above this stroke
 * inside its own span, so a value can never be drawn over the caption of the
 * line above. Where nothing is printed above inside the span, the box takes
 * the maximum height and the fitter decides the rest.
 */
const BASELINE_ABOVE_RULE = 2;

function measureRuledBlank(page, cell) {
  const candidates = page.horizontal
    .filter((r) => Math.abs(r.y - cell.ruleY) <= RULE_TOLERANCE
      && Math.abs(r.x - cell.ruleFromX) <= RULE_TOLERANCE
      && Math.abs(r.endX - cell.ruleToX) <= RULE_TOLERANCE)
    .sort((a, b) => Math.abs(a.y - cell.ruleY) - Math.abs(b.y - cell.ruleY));
  const rule = candidates[0];
  if (!rule) return null;
  const boxBottom = rule.y + BASELINE_ABOVE_RULE;
  const above = page.items
    .filter((t) => String(t.text).trim() && t.x >= rule.x - 2 && t.x <= rule.endX + 2 && t.y > boxBottom + 2)
    .map((t) => t.y);
  const ceiling = above.length > 0 ? Math.min(...above) - CAPTION_CLEARANCE : boxBottom + MAX_WRITE_BOX_HEIGHT;
  const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
  const writeBox = {
    x: Number((rule.x + CELL_INSET).toFixed(2)),
    y: Number(boxBottom.toFixed(2)),
    width: Number((rule.endX - rule.x - CELL_INSET * 2).toFixed(2)),
    height: Math.max(0, height)
  };
  return {
    writeBox,
    tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
    rectBasis:
      "measured_ruled_blank: one horizontal stroke read from the page content stream — the rule the value is "
      + "written on — matched on its own y, start x and end x against the pinned binary, with the box ceiling "
      + "taken from the lowest printed baseline above it inside its own span",
    measuredCell: {
      ruleY: rule.y, ruleFromX: rule.x, ruleToX: rule.endX,
      ruleThickness: rule.height ?? null,
      lowestPrintedBaselineAboveInsideSpan: above.length > 0 ? Math.min(...above) : null
    }
  };
}

async function measureCells(bytes, cells) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const perPage = new Map();
  for (const [i, page] of pages.entries()) {
    const rules = await rulesOfPage(page);
    perPage.set(i + 1, {
      horizontal: rules.horizontal ?? [], vertical: rules.vertical ?? [],
      items: extractTextItems(page),
      size: page.getSize()
    });
  }
  const measured = [];
  const drift = [];
  for (const cell of cells) {
    const here = perPage.get(cell.page) ?? { horizontal: [], vertical: [], items: [] };
    if (Object.hasOwn(cell, "ruleY")) {
      const ruled = measureRuledBlank(here, cell);
      if (!ruled) {
        drift.push({
          cell: cell.key, page: cell.page, shape: "ruled_blank",
          expected: { ruleY: cell.ruleY, ruleFromX: cell.ruleFromX, ruleToX: cell.ruleToX },
          nearest: here.horizontal
            .filter((r) => Math.abs(r.y - cell.ruleY) <= 6)
            .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 4)
        });
        continue;
      }
      measured.push({ ...cell, ...ruled, rect: ruled.writeBox });
      continue;
    }
    const cellHeight = cell.top - cell.bottom;
    const overlapOf = (v) => {
      const y0 = Number(v.y);
      const y1 = y0 + Number(v.height ?? 0);
      return Math.max(0, Math.min(y1, cell.top) - Math.max(y0, cell.bottom)) / cellHeight;
    };
    const hRule = (y) => here.horizontal
      .filter((r) => Math.abs(r.y - y) <= RULE_TOLERANCE)
      .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
    const vRule = (x) => here.vertical
      .filter((v) => Math.abs(v.x - x) <= RULE_TOLERANCE && overlapOf(v) >= SPAN_OVERLAP)
      .sort((a, b) => overlapOf(b) - overlapOf(a))[0];
    const top = hRule(cell.top);
    const bottom = hRule(cell.bottom);
    const left = vRule(cell.left);
    const right = vRule(cell.right);
    if (!top || !bottom || !left || !right) {
      drift.push({
        cell: cell.key, page: cell.page,
        expected: { top: cell.top, bottom: cell.bottom, left: cell.left, right: cell.right },
        found: { top: top?.y ?? null, bottom: bottom?.y ?? null, left: left?.x ?? null, right: right?.x ?? null }
      });
      continue;
    }
    const printedInCell = here.items
      .filter((t) => String(t.text).trim() && t.x >= left.x - 2 && t.x <= right.x + 2 && t.y >= bottom.y - 1 && t.y <= top.y + 1)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lowestPrintedLine = printedInCell.length > 0 ? Math.min(...printedInCell.map((t) => t.y)) : null;
    /*
     * Where in a measured cell the value sits.
     *
     * By default it sits on the cell's bottom rule, which is where a person
     * writing on paper puts it: the caption is printed at the top of the cell
     * and the line beneath is the line you write on.
     *
     * `writeUnderCaption` is for a TALL cell -- Alaska's DPS mailing-address
     * box is 80 points deep because it expects two or three lines -- where the
     * default would leave a single-line value floating sixty points below its
     * own caption. It places the box directly under the lowest printed line
     * inside the cell instead. BOTH rules are still measured, and the box is
     * still required to sit above the cell's own bottom rule; the flag moves
     * the value inside a measured cell and can never move it out of one.
     */
    const floor = bottom.y + WRITE_BOX_LIFT;
    const ceiling = lowestPrintedLine === null ? top.y - CAPTION_CLEARANCE : lowestPrintedLine - CAPTION_CLEARANCE;
    const boxBottom = cell.writeUnderCaption === true
      ? Math.max(floor, ceiling - MAX_WRITE_BOX_HEIGHT)
      : floor;
    const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
    const writeBox = {
      x: Number((left.x + CELL_INSET).toFixed(2)),
      y: Number(boxBottom.toFixed(2)),
      width: Number((right.x - left.x - CELL_INSET * 2).toFixed(2)),
      height: Math.max(0, height)
    };
    measured.push({
      ...cell, writeBox, rect: writeBox,
      tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
      placedUnderCaption: cell.writeUnderCaption === true,
      sitsAboveTheCellsOwnBottomRule: boxBottom >= bottom.y,
      lowestPrintedLineInCell: lowestPrintedLine,
      rectBasis:
        "measured_table_cell: four strokes read from the page content stream — the rule above, the rule below, "
        + "and the vertical divider on each side, each re-checked against the pinned binary",
      measuredCell: {
        topRuleY: top.y, bottomRuleY: bottom.y, leftDividerX: left.x, rightDividerX: right.x,
        leftDividerCoversCell: Number(overlapOf(left).toFixed(4)),
        rightDividerCoversCell: Number(overlapOf(right).toFixed(4)),
        topRuleSpan: [top.x, top.endX], bottomRuleSpan: [bottom.x, bottom.endX]
      },
      printedTextInThisCell: printedInCell.slice(0, 10).map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), extracted: t.text }))
    });
  }
  return { measured, drift, pageCount: pages.length };
}

/* ---- an AcroForm document's own census, read from the document ---------------- *
 * Every write box is the widget's own /Rect, read from the binary. No box is
 * derived from a caption position; the caption is captured separately and
 * decides only what a blank MEANS, never where it is.
 */
const FIELD_TYPE = (f) => {
  const n = f.constructor?.name ?? "";
  if (n === "PDFTextField") return "text";
  if (n === "PDFCheckBox") return "checkbox";
  if (n === "PDFRadioGroup") return "radio";
  if (n === "PDFDropdown") return "dropdown";
  if (n === "PDFOptionList") return "optionlist";
  return "unknown";
};

/*
 * MEASURED CAPTION CORRECTIONS.
 *
 * CR-218 prints every caption BELOW the rule it captions. The shared capture
 * (rcap-pdf-anchor-capture.mjs) looks above and to the left, so on this form it
 * reaches for the caption of the row ABOVE or finds nothing at all. The
 * finalizer's protect test runs on `effectiveLabel ?? name` before anything
 * else, so a caption that belongs to another blank does not merely mislabel
 * this one -- it decides it.
 *
 * This family writes six blanks and refuses nine. Corrections are recorded only
 * where the capture returns a caption this form does not print at that widget,
 * measured from the unlocked derivative's own page-1 content stream (the
 * derivative is proved equivalent to the pinned binary content stream for
 * content stream, so a position read from it is a position on the official
 * form).
 *
 * A correction that does not correct the caption it names is refused by
 * censusAcroForm below rather than applied, so a capture repaired upstream
 * stops this build instead of being silently overridden. The table is
 * populated from that refusal: this build was run once with it empty, the
 * captures were read from the census, and only the ones that are wrong are
 * corrected here.
 *
 * WHAT THIS DOES NOT DO. It does not disable, weaken or bypass a protect rule.
 * The protect test still runs, on the corrected caption AND on the field name.
 * It does not touch the shared capture, which every builder in the corpus sits
 * on and which this lane may not change; the finding stays reported in
 * build-findings.json for the lane that owns it.
 */
const CAPTION_CORRECTIONS = SPEC.captionCorrections ?? {};

/** Corrections actually applied, so the report states them rather than implying them. */
const captionCorrectionsApplied = [];

async function censusAcroForm(bytes, documentId = null) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageIndexOfRef = new Map(pages.map((p, i) => [p.ref, i + 1]));
  const form = doc.getForm();
  const raw = form.getFields().map((f) => {
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      return {
        page: pageIndexOfRef.get(w.P()) ?? null,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height }
      };
    });
    return {
      name: f.getName(),
      type: FIELD_TYPE(f),
      multiline: (() => { try { return f.isMultiline?.() === true; } catch { return false; } })(),
      maxLength: (() => { try { return f.getMaxLength?.() ?? null; } catch { return null; } })(),
      widgets
    };
  });
  // Captions, page by page, so a widget's printed label comes from the page it
  // actually sits on.
  const byPage = new Map();
  for (const f of raw) for (const w of f.widgets) {
    if (!w.page) continue;
    if (!byPage.has(w.page)) byPage.set(w.page, []);
    byPage.get(w.page).push({ name: f.name, rect: w.rect });
  }
  const labelOf = new Map();
  for (const [pageNo, widgets] of byPage) {
    const context = captureWidgetContext(pages[pageNo - 1], widgets, { isFirstPage: pageNo === 1 });
    for (const c of context) if (!labelOf.has(c.name)) labelOf.set(c.name, c);
  }
  const corrections = (documentId && CAPTION_CORRECTIONS[documentId]) || {};
  const fields = raw.map((f) => {
    const c = labelOf.get(f.name) ?? {};
    const captured = c.effectiveLabel ?? null;
    const fix = Object.prototype.hasOwnProperty.call(corrections, f.name) ? corrections[f.name] : null;
    if (fix) {
      /* A correction that does not correct the caption it names is a stale
       * record, and a stale record is worse than none: it would silently keep
       * overriding a capture that had already been repaired upstream. */
      if (captured !== fix.capturedLabel) {
        throw new Error(
          `caption correction for ${documentId}.${f.name} expected the capture to return ` +
          `${JSON.stringify(fix.capturedLabel)} and it returned ${JSON.stringify(captured)}; ` +
          `re-measure the printed caption before this correction is used`);
      }
      captionCorrectionsApplied.push({
        document: documentId, field: f.name, capturedLabel: fix.capturedLabel,
        measuredLabel: fix.measuredLabel, measuredAt: fix.measuredAt
      });
    }
    return {
      ...f,
      effectiveLabel: fix ? fix.measuredLabel : captured,
      labelBasis: fix ? "measured_from_the_pinned_forms_own_300_dpi_raster_and_rule_strokes" : (c.labelBasis ?? null),
      regionHeading: c.regionHeading ?? null,
      regionIsDocumentTitle: c.regionIsDocumentTitle ?? false
    };
  });
  const documentTextLines = pages.flatMap((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text));
  return { fields, documentTextLines, pageCount: pages.length };
}


/* ---- the charge tables, measured against the paper --------------------------- *
 *
 * DEFECTS_NO_COUNTER_CAN_SEE, two entries at once.
 *
 * `acroform-index-is-not-the-printed-row`: on a Massachusetts sealing petition
 * 52 of 111 cells carried an AcroForm index that disagreed with the row number
 * printed beside them, and the cell count and the label count both read clean
 * while every affected charge sat on the wrong line. Delaware names its cells
 * `ChargeRow1`, `DispositionRow4` and so on; that name is authored metadata and
 * is not evidence of where the cell is on the paper.
 *
 * `extracted-line-order-is-not-column-order`: a table's headings joined into
 * one extracted line read as though the columns ran in a different order than
 * they do. Delaware makes this live: CIV_EXP_02_A's table runs Case ID, Charge,
 * Offense Date, Disposition Date, Disposition, and CIV_EXP_02_B's -- the
 * continuation sheet for the SAME charges -- runs Case ID, Charge, Disposition,
 * Disposition Date, Court of Record. Two tables, one charge list, different
 * column orders, and a builder that assumed one order for both would put a
 * disposition in the disposition-date box.
 *
 * So each declared column is proved against the printed heading by x-position,
 * each declared row against the widget's own y, and the table body against the
 * paper's own silence about row numbers.
 */
function auditTableGeometry(documentId, table, census, words) {
  const findings = [];
  const byName = new Map(census.fields.map((f) => [f.name, f]));
  const round = (v) => Number(Number(v).toFixed(2));

  /* Every declared cell, resolved to a real censused widget with a real
   * rectangle. A cell this family names that the document does not carry is a
   * table this family has not read. */
  const cells = [];
  for (const [rowIndex, row] of table.rows.entries()) {
    for (const column of table.columns) {
      const name = row[column.columnId];
      const field = byName.get(name);
      const rect = field?.widgets?.[0]?.rect ?? null;
      if (!field || !rect) {
        findings.push({
          documentId, row: rowIndex + 1, column: column.columnId, field: name,
          why: field
            ? "the censused field carries no widget, so it has no position on the page"
            : "this family names a table cell the document's own census does not carry"
        });
        continue;
      }
      cells.push({ rowIndex, columnId: column.columnId, field: name, rect });
    }
  }
  if (findings.length > 0) return { ok: false, findings };

  /* Each column's own horizontal extent, measured from its cells and from
   * nothing else. */
  const spans = new Map();
  for (const column of table.columns) {
    const here = cells.filter((c) => c.columnId === column.columnId);
    spans.set(column.columnId, {
      x0: Math.min(...here.map((c) => c.rect.x)),
      x1: Math.max(...here.map((c) => c.rect.x + c.rect.width))
    });
  }

  /* No two columns may overlap horizontally: where they do, no word and no
   * cell can be resolved to one of them by x-position, and the reading this
   * gate exists to perform is not available. */
  const ordered = [...table.columns].map((c) => ({ columnId: c.columnId, ...spans.get(c.columnId) }))
    .sort((a, b) => a.x0 - b.x0);
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].x0 < ordered[i - 1].x1 - (table.columnGapTolerance ?? 0.5)) {
      findings.push({
        documentId, why: "two columns of this table overlap horizontally, so no cell can be resolved to one column by x-position",
        columns: [ordered[i - 1], ordered[i]].map((c) => ({ columnId: c.columnId, x: [round(c.x0), round(c.x1)] }))
      });
    }
  }
  if (ordered.map((c) => c.columnId).join("|") !== table.columns.map((c) => c.columnId).join("|")) {
    return { ok: false, findings: [{
      documentId, why: "the columns this family declares are not in left-to-right page order",
      declaredOrder: table.columns.map((c) => c.columnId),
      pageOrderByCellXPosition: ordered.map((c) => c.columnId)
    }] };
  }
  if (findings.length > 0) return { ok: false, findings };

  /*
   * THE HEADINGS, READ BY X-POSITION.
   *
   * DEFECTS_NO_COUNTER_CAN_SEE `extracted-line-order-is-not-column-order`. A
   * header row is not a line of text: on CIV_EXP_04_A it prints "Case ID# or /
   * Criminal Case #" and "Disposition and Disposition / Date" across two
   * printed lines, so any reader that joins the band into one string reads the
   * columns in an order the page does not have. Here each printed word in the
   * header band is assigned to the column whose CELLS its horizontal centre
   * sits in -- a word that lands in no column, or in more than one, stops the
   * family -- and each column's words are then read down its own lines and
   * across each line, and compared to the heading this family claims for it.
   */
  const band = words.filter((w) =>
    w.y0 >= table.headerBand[0] && w.y1 <= table.headerBand[1] && String(w.text).trim() !== "");
  if (band.length === 0) {
    return { ok: false, findings: [{ documentId, why: "no printed word sits in the header band this family declares for the table", headerBand: table.headerBand }] };
  }
  const wordsOfColumn = new Map(table.columns.map((c) => [c.columnId, []]));
  for (const w of band) {
    const centre = (w.x0 + w.x1) / 2;
    const inside = table.columns.filter((c) => centre >= spans.get(c.columnId).x0 - (table.headingInset ?? 8)
      && centre <= spans.get(c.columnId).x1 + (table.headingInset ?? 8));
    if (inside.length !== 1) {
      findings.push({
        documentId, printedWord: w.text, x: [round(w.x0), round(w.x1)], y: [round(w.y0), round(w.y1)],
        columnsItLandsIn: inside.map((c) => c.columnId),
        why: inside.length === 0
          ? "a printed heading word in the table's header band sits over no column of cells"
          : "a printed heading word in the table's header band sits over more than one column of cells"
      });
      continue;
    }
    wordsOfColumn.get(inside[0].columnId).push(w);
  }
  if (findings.length > 0) return { ok: false, findings };

  const headings = [];
  for (const column of table.columns) {
    const here = wordsOfColumn.get(column.columnId)
      .sort((a, b) => (Math.abs(a.y0 - b.y0) > 2 ? b.y0 - a.y0 : a.x0 - b.x0));
    const read = here.map((w) => w.text).join(" ");
    if (normalizeCaption(read) !== normalizeCaption(column.printedHeading)) {
      findings.push({
        documentId, column: column.columnId,
        headingThisFamilyClaims: column.printedHeading,
        headingReadFromThePageByXPosition: read,
        why: "the heading this family claims for a column is not the heading the page prints over that column's cells"
      });
      continue;
    }
    headings.push({
      columnId: column.columnId, printedHeading: column.printedHeading, readFromThePage: read,
      x: [round(Math.min(...here.map((w) => w.x0))), round(Math.max(...here.map((w) => w.x1)))],
      y: [round(Math.min(...here.map((w) => w.y0))), round(Math.max(...here.map((w) => w.y1)))],
      cellsX: [round(spans.get(column.columnId).x0), round(spans.get(column.columnId).x1)]
    });
  }
  if (findings.length > 0) return { ok: false, findings };

  /*
   * A ROW'S NUMBER IS ITS POSITION DOWN THE PAGE, NOT THE DIGIT IN ITS FIELD
   * NAME. DEFECTS_NO_COUNTER_CAN_SEE `acroform-index-is-not-the-printed-row`:
   * on a 37-row Massachusetts charge table 52 of 111 cells carried an index
   * that disagreed with the number printed beside them, and the cell count and
   * the label count both read clean while every affected charge sat on the
   * wrong line. So each declared row must be one horizontal band, and the
   * declared rows must descend the page strictly, in order.
   */
  let previousBottom = Infinity;
  const rowBands = [];
  for (const [rowIndex] of table.rows.entries()) {
    const here = cells.filter((c) => c.rowIndex === rowIndex);
    const top = Math.max(...here.map((c) => c.rect.y + c.rect.height));
    const bottom = Math.min(...here.map((c) => c.rect.y));
    const tallest = Math.max(...here.map((c) => c.rect.height));
    if (top - bottom > tallest + (table.rowBandTolerance ?? 2)) {
      findings.push({
        documentId, row: rowIndex + 1, band: [round(bottom), round(top)], tallestCell: round(tallest),
        why: "the cells this family declares as one row do not sit in one horizontal band"
      });
    }
    if (top > previousBottom) {
      findings.push({
        documentId, row: rowIndex + 1, top: round(top), bottomOfTheRowDeclaredBefore: round(previousBottom),
        why: "this row is not below the row declared before it, so the declared row order is not the printed order"
      });
    }
    previousBottom = bottom;
    rowBands.push({ printedRow: rowIndex + 1, y: [round(bottom), round(top)], fields: here.map((c) => c.field) });
  }
  if (findings.length > 0) return { ok: false, findings };

  /*
   * AND THE PAPER'S OWN SILENCE ABOUT ROW NUMBERS. These tables print none, so
   * there is no printed number for a geometric order to contradict -- but that
   * is a measurement rather than an assumption, and a revision that started
   * printing one would stop this build rather than pass through it.
   */
  const bodyTop = Math.max(...cells.map((c) => c.rect.y + c.rect.height));
  const bodyBottom = Math.min(...cells.map((c) => c.rect.y));
  const bodyLeft = Math.min(...cells.map((c) => c.rect.x));
  const bodyRight = Math.max(...cells.map((c) => c.rect.x + c.rect.width));
  const printedInsideTheBody = words.filter((w) =>
    String(w.text).trim() !== ""
    && w.y0 >= bodyBottom - 1 && w.y1 <= bodyTop + 1
    && w.x1 >= bodyLeft - (table.rowNumberGutter ?? 28) && w.x0 <= bodyRight + 1);
  if (printedInsideTheBody.length > 0) {
    return { ok: false, findings: [{
      documentId,
      why: "the table body carries printed text; a row number printed beside a row would have to be read before a geometric row order could be trusted",
      printed: printedInsideTheBody.slice(0, 12).map((w) => ({ text: w.text, x: [round(w.x0), round(w.x1)], y: [round(w.y0), round(w.y1)] }))
    }] };
  }

  return {
    ok: true,
    record: {
      documentId, page: table.page, rows: table.rows.length, columns: table.columns.length,
      columnOrderReadFromTheCellsOwnXPositions: ordered.map((c) => c.columnId),
      headingsReadByXPosition: headings,
      rowBandsReadFromTheWidgetsOwnRectangles: rowBands,
      tableBodyPrintsNoRowNumbers: true,
      method:
        "printed words located with poppler pdftotext -bbox-layout over the unlocked derivative, which is "
        + "proved content stream for content stream identical to the pinned official binary; each header word "
        + "assigned to the column whose cells its horizontal centre sits in, each column's heading read down "
        + "its own printed lines and across each line, and each row resolved from the widgets' own rectangles"
    }
  };
}

/* ---- what the official page actually carries, read from its own bytes -------- *
 * The finalizer's report says what this build BELIEVES it wrote. This says what
 * the paper shows, and it is the only channel that can catch the two failures
 * the report structurally cannot: ink that landed outside every box this family
 * measured, and ink sitting on a blank the map refused.
 *
 * The source's own printed text is subtracted first, by position and content,
 * because an official form prints captions inside and beside the very boxes it
 * strokes — counting those as our ink would report every form as defective.
 * What remains is exactly what this build added.
 */
const INK_TOLERANCE = 2.5;

async function itemsOfDocument(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => extractTextItems(page).map((t) => ({
    x: t.x, y: t.y, text: String(t.text ?? ""), width: t.width ?? 0
  })));
}

const inkKey = (t) => `${Math.round(t.x)}|${Math.round(t.y)}|${t.text}`;
const insideBox = (t, box) =>
  t.x >= box.x - INK_TOLERANCE && t.x <= box.x + box.width + INK_TOLERANCE
  && t.y >= box.y - INK_TOLERANCE && t.y <= box.y + box.height + INK_TOLERANCE;

async function auditOfficialInk(sourceBytes, outputBytes, boxes) {
  const source = await itemsOfDocument(sourceBytes);
  const output = await itemsOfDocument(outputBytes);
  const added = [];
  for (const [i, page] of output.entries()) {
    const before = new Map();
    for (const t of source[i] ?? []) before.set(inkKey(t), (before.get(inkKey(t)) ?? 0) + 1);
    for (const t of page) {
      const key = inkKey(t);
      const seen = before.get(key) ?? 0;
      if (seen > 0) { before.set(key, seen - 1); continue; }
      added.push({ page: i + 1, ...t });
    }
  }
  let glyphsOutsideMeasuredWriteBoxes = 0;
  /*
   * DEFECTS_NO_COUNTER_CAN_SEE `a-geometry-counter-with-no-teeth`. On CA
   * CR-180 the privacy banner drew at the Warning PUSHBUTTON's own rect, which
   * is in the census, so it landed inside a measured box and
   * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes read zero with the defect
   * present. The reading with teeth for that class is the ink sitting at a
   * CONTROL widget -- a pushbutton, a check box, a radio -- which no
   * participant value is ever written into. It is counted here from the
   * delivered bytes rather than argued away.
   */
  let controlChromeGlyphs = 0;
  const controlChrome = [];
  const refusedFieldsWithInk = [];
  const written = boxes.filter((b) => b.written);
  const refused = boxes.filter((b) => !b.written);
  const controls = boxes.filter((b) => b.isControl === true);
  for (const t of added) {
    const glyphs = t.text.replace(/\s+/g, "").length;
    if (glyphs === 0) continue;
    /*
     * Ink is attributed to a WRITTEN box first, and ink a written box
     * accounts for is never also charged to a neighbour.
     *
     * AOC-CR-287 is why. Its petitioner block stacks four widgets 13pt tall
     * at 12pt intervals, so PetitionerAddr1 (y 667-680) and PetitionerAddr2
     * (y 655-668) OVERLAP by a point, and the street address drawn correctly
     * on line one has its origin inside line two's rectangle as well. Charged
     * to both, that reported a refused field carrying ink on a page where
     * nothing had gone wrong -- a false protected-write on a correct build,
     * which is the worst kind of finding because it teaches a reader to
     * distrust the counter.
     *
     * The real defect this test exists for survives the change intact: ink on
     * a refused blank that NO written box explains is still ink nobody
     * accounted for, and is still reported.
     */
    for (const c of controls) {
      if (c.page === t.page && c.rect && insideBox(t, c.rect)) {
        controlChromeGlyphs += glyphs;
        controlChrome.push({ fieldId: c.key, drawnText: t.text, page: t.page });
        break;
      }
    }
    const explainedBy = written.filter((b) => b.page === t.page && insideBox(t, b.rect));
    if (explainedBy.length > 0) continue;
    glyphsOutsideMeasuredWriteBoxes += glyphs;
    for (const b of refused) {
      if (b.page === t.page && b.rect && insideBox(t, b.rect)) {
        refusedFieldsWithInk.push({ fieldId: b.key, drawnText: t.text, page: t.page });
      }
    }
  }
  return {
    addedItems: added,
    addedTextItems: added.length,
    addedGlyphs: added.reduce((n, t) => n + t.text.replace(/\s+/g, "").length, 0),
    glyphsOutsideMeasuredWriteBoxes,
    controlChromeGlyphs,
    controlChrome,
    refusedFieldsWithInk,
    method:
      "every text item of the finished document compared against the pinned source document's own items by "
      + "position and content; what remains is what this build added, and each added item is tested against "
      + "every measured box"
  };
}

/* ---- deterministic composed-page rendering ---------------------------------- */
async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- field-map helpers, in the maps-with-canonical-and-boundary shape -------- */
function mapHelpers(componentId) {
  const base = (id, label, page = 1) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: isOfficial(componentId)
      ? "measured_table_cell_read_from_the_official_documents_own_rule_strokes"
      : "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId, page = 1) => ({ ...base(id, label, page), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    agencyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "court, clerk, prosecutor, agency, or hearing field; the agency completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /*
     * A control the reader marks, which THIS ROUTE does not determine.
     *
     * Only ever for an election that is genuinely the participant's: a route
     * that determines its own election must state it, and a packet built for
     * one statutory route may never hand that choice back. Every use of this
     * helper carries the reason the route leaves the choice open.
     */
    election: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      isSelectionControl: true, kind: "selection_control",
      reason: "a sworn assertion or legal election the route does not determine",
      category: "participant_sworn_narrative_or_legal_election",
      completenessClass: "participant_sworn_narrative_or_legal_election",
      class: "participant_sworn_narrative_or_legal_election",
      requiredBeforeFiling: false, routeDetermined: false, document: componentId, why
    }),
    /*
     * An ATTORNEY block on a form a self-represented participant files.
     * The platform holds no representation fact, and writing participant
     * data into a block the court reads as counsel's would tell the court
     * something untrue about who is appearing.
     */
    attorneyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `attorney-only, and no representation fact is held for this participant: ${why}`,
      category: null, completenessClass: null, class: null,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /*
     * A blank the FORM ITSELF marks optional or conditional: a second address
     * line, a second offence rule, a number the form prints "(if known)".
     * Never for a blank the filing needs — that is a required fact wearing a
     * softer word, and the reason it may stay empty is the form's own, stated
     * here so a reader can check it against the printed page.
     */
    optional: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `optional participant-authored content, and the platform does not invent it: ${why}`,
      category: null, completenessClass: null, class: null,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why, page = 1) => ({
      ...base(id, label, page),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

function composedMap(componentId) {
  const h = mapHelpers(componentId);
  const { writes, refusals } = SPEC.mapFor(componentId, h);
  return {
    formNumber: OFFICIAL[componentId]?.documentId ?? componentId,
    documentId: OFFICIAL[componentId]?.documentId ?? componentId,
    documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: SPEC.componentRoutes?.[componentId] ?? SPEC.routes[0].routeKey,
      ...(SPEC.componentConditions[componentId] ? { conditional: true, conditionDescription: SPEC.componentConditions[componentId] } : {})
    },
    structuralClass: isOfficial(componentId) ? "official_flat_document_with_measured_overlay" : "composed_document",
    composedFrom: isOfficial(componentId) ? null : SPEC.composedFromNote,
    officialSource: isOfficial(componentId)
      ? { sourceId: OFFICIAL[componentId].sourceId, sha256: OFFICIAL[componentId].sha256 } : null,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the writes ------------------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. For an overlaid official document
 * that is the page's own drawn text, which is where a flat overlay puts it. */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues, rectOf, addedInk) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  const pagesOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
    pagesOfComponent.set(m.component, [...(pagesOfComponent.get(m.component) ?? []), { packetPageIndex: i, sourcePage: m.sourcePage }]);
  }

  const squash = (s) => String(s).replace(/\s+/g, " ").trim();
  const tight = (s) => String(s).replace(/\s+/g, "");

  /*
   * WHAT THE BOX ACTUALLY CARRIES.
   *
   * The proof this core inherited asked whether the value appears anywhere in
   * the component's extracted text. On these Delaware forms that question has
   * two wrong answers available. A value the form's own box wraps onto two
   * lines -- the boundary fixture's street address on CIV_EXP_08_A, whose
   * street field is 26pt tall -- is on the page, correctly, in its own box, and
   * is not one contiguous run of extracted text, because the Attorney General's
   * printed address column sits between the two lines in reading order. And a
   * value that appeared somewhere else on the page entirely would satisfy a
   * whole-component search while sitting in the wrong box.
   *
   * So an official form's write is proved INSIDE THE WIDGET'S OWN RECTANGLE,
   * over the ink THIS BUILD ADDED. The form's own printed captions sit inside
   * the very boxes it strokes -- CIV_EXP_02_A prints "Petitioner" inside the
   * Petitioner widget's own rectangle -- so the source document's items are
   * subtracted first, by position and content, exactly as the ink audit
   * subtracts them. What remains inside the rectangle is what this build put
   * there, and its non-whitespace glyphs must be exactly the non-whitespace
   * glyphs of the value the finalizer says it drew. A composed page this build
   * authored is proved against its own text, because there is no widget
   * rectangle to read.
   */
  const inBox = (t, r) =>
    t.x >= r.x - 1.5 && t.x <= r.x + r.width + 1.5 && t.y >= r.y - 1.5 && t.y <= r.y + r.height + 1.5;

  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentId = map.documentRole;
    const componentText = squash(textOfComponent.get(componentId) ?? "");
    for (const w of map.canonicalWrites ?? []) {
      const fieldName = String(w.field).slice(`${componentId}.`.length);
      const drawn = drawnValues.get(`${componentId} ${w.field}`);
      if (isOfficial(componentId) && drawn === undefined) continue;
      const value = sanitizePdfText(String(drawn ?? facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${componentId}/${w.field}: no fixture value for ${w.factId}`);
      let proof;
      if (isOfficial(componentId)) {
        const rect = rectOf(componentId, fieldName);
        assert.ok(rect, `${fixtureName} ${componentId}/${w.field}: the census carries no rectangle for this field`);
        const page = (pagesOfComponent.get(componentId) ?? []).find((p) => p.sourcePage === (w.page ?? 1));
        assert.ok(page, `${fixtureName} ${componentId}/${w.field}: no packet page carries source page ${w.page ?? 1}`);
        const items = (addedInk.get(`${componentId} ${w.page ?? 1}`) ?? []).filter((t) => inBox(t, rect))
          .sort((a, b) => (Math.abs(a.y - b.y) > 1.5 ? b.y - a.y : a.x - b.x));
        const readBack = squash(items.map((t) => t.text).join(" "));
        assert.ok(tight(readBack) === tight(value),
          `${fixtureName} ${componentId}/${w.field}: the widget's own rectangle carries ${JSON.stringify(readBack)} `
          + `and the value bound to ${w.factId} is ${JSON.stringify(value)}`);
        proof =
          "every text item of the delivered page whose origin falls inside this field's own widget rectangle, "
          + "read down its lines and across each line, matched glyph for glyph against the value the "
          + "finalizer drew";
        actualWrites.push({
          field: w.field, document: componentId, factId: w.factId,
          expected: value, readBackFromTheWidgetRectangle: readBack,
          widgetRect: { x: Number(rect.x.toFixed(2)), y: Number(rect.y.toFixed(2)), width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2)) },
          packetPage: page.packetPageIndex + 1,
          foundInOutputBytes: true, proof
        });
      } else {
        assert.ok(componentText.includes(squash(value)),
          `${fixtureName} ${componentId}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
        actualWrites.push({
          field: w.field, document: componentId, factId: w.factId,
          expected: value, foundInOutputBytes: true,
          proof: "value read back from the extracted text of the composed page this build authored"
        });
      }
      glyphs += tight(value).length;
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ----------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: r.isSelectionControl === true,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: r.fieldId ?? r, why: "a field the map refused carries ink in the output" });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------- */
function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.components.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.documentRole, documentId: m.documentId, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    /*
     * Component order, then DECLARATION order inside a component, which each
     * map declares in the order the blanks appear down the printed page.
     * Sorting by field name instead -- which is what the core this descends
     * from did -- groups a charge table by column, so a participant reads four
     * "Case ID #" rows, then four "Charge" rows, and has to reassemble their
     * own charge list from a table that has been transposed on them.
     */
    .sort((a, b) => order[a.document] - order[b.document]);
}

/*
 * WHAT THE COMMITTED RECORD ITSELF DECLARES MUST BE DONE BEFORE FILING.
 *
 * Read from the committed packet-set manifest AT BUILD TIME, by packet set id,
 * and printed verbatim. Three Illinois builders in this sprint printed none of
 * their own packet set's requiredBeforeFiling list because they never
 * referenced the record, and nine zero counters never saw it: the completeness
 * verifier reads canonical-side records and does not read
 * participant-instructions.md against the controlling record at all.
 *
 * So this is not a copy of the list. It IS the list, resolved from the bytes
 * whose SHA-256 the source receipt records, and a build whose record has
 * stopped declaring it STOPS rather than printing a guide the record no longer
 * supports.
 */
function declaredRequiredBeforeFiling() {
  const abs = path.join(ROOT, PACKET_SET_MANIFESTS);
  if (!fs.existsSync(abs)) {
    return { ok: false, why: `the committed packet-set manifest is not at ${PACKET_SET_MANIFESTS}` };
  }
  const bytes = fs.readFileSync(abs);
  let manifest;
  try { manifest = JSON.parse(bytes.toString("utf8")); }
  catch (error) { return { ok: false, why: `the committed packet-set manifest does not parse: ${error.message}` }; }
  const set = (manifest.packetSets ?? []).find((s) => s.packetSetId === PACKET_SET_ID);
  if (!set) {
    return { ok: false, why: `the committed packet-set manifest no longer carries packet set ${PACKET_SET_ID}` };
  }
  const items = (set.requiredBeforeFiling ?? []).map((s) => String(s)).filter((s) => s.trim().length > 0);
  if (items.length === 0) {
    return { ok: false, why: `packet set ${PACKET_SET_ID} no longer declares a requiredBeforeFiling list` };
  }
  const components = (set.components ?? []).map((c) => ({
    componentId: c.componentId, role: c.role, requirement: c.requirement,
    outputStrategy: c.outputStrategy, officialFormId: c.officialFormId ?? null,
    conditionDescription: c.conditionDescription ?? null
  }));
  if (components.length === 0) {
    return { ok: false, why: `packet set ${PACKET_SET_ID} no longer declares any components` };
  }
  return {
    ok: true, items, components,
    path: PACKET_SET_MANIFESTS, packetSetId: PACKET_SET_ID,
    packetSetVersion: set.version ?? null,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}

/*
 * THE WORD THIS JURISDICTION'S COMMITTED RECORD FORBIDS IN PARTICIPANT COPY.
 *
 * "Maine seals; it does not expunge. The Judicial Branch says in terms that
 * Maine does not have expungement and the record is not completely erased.
 * Never use 'expungement' in Maine participant copy." -- committed track
 * registry, me-seal-gen, packetInstructions.
 *
 * That is a packet instruction, so it is asserted over the generated bytes
 * rather than merely intended by the author. Every occurrence of the word must
 * sit inside one of the sentences that exist to say Maine does not have it; any
 * other occurrence stops the family. A later edit cannot reintroduce it
 * quietly.
 */
function forbiddenWordBreaches(markdown) {
  const breaches = [];
  if (!FORBIDDEN_WORD) return breaches;
  const hay = String(markdown);
  const needle = new RegExp(FORBIDDEN_WORD, "gi");
  for (const match of hay.matchAll(needle)) {
    const from = Math.max(0, match.index - 160);
    const window = hay.slice(from, match.index + 160);
    if ((FORBIDDEN_WORD_IS_ALLOWED_ONLY_IN ?? []).some((allowed) => window.includes(allowed))) continue;
    breaches.push({ at: match.index, matched: match[0], context: hay.slice(Math.max(0, match.index - 80), match.index + 80).replace(/\s+/g, " ") });
  }
  return breaches;
}

function participantInstructions(maps, rbf, declared) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${SPEC.instructionsHeading}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  out.push("## Who decides this, and what you do not file", "");
  for (const p of SPEC.whoDecides) out.push(p, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c}\` | ${SPEC.componentDescriptions[c]} |`);
  out.push("");

  out.push("## Where this goes", "");
  for (const p of SPEC.filingDestination) out.push(p, "");

  out.push("## What it costs", "");
  for (const p of SPEC.feeAndWaiver) out.push(p, "");

  out.push("## Who else has to be told", "");
  for (const p of SPEC.service) out.push(p, "");

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    out.push("## Documents you must obtain first", "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is a labelled blank on the page named beside it. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${SPEC.componentTitles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## Everything the committed record requires before you file", "");
  out.push(
    `These ${declared.items.length} items are printed word for word from the committed packet-set manifest for `
    + `packet set \`${declared.packetSetId}\` (version ${declared.packetSetVersion ?? "unversioned"}), read from `
    + `\`${declared.path}\` at build time. The file's SHA-256 is \`${declared.sha256}\`. Nothing here is this `
    + "packet's own restatement of the record: if the record changes, this list changes with it, and if the "
    + "record stops declaring it the packet is not built.", "");
  for (const item of declared.items) out.push(`- ${item}`);
  out.push("");

  out.push("### The components the same record declares for this packet set", "");
  out.push("| Component | Role | Required | How it is produced | Official form |", "| --- | --- | --- | --- | --- |");
  for (const c of declared.components) {
    out.push(`| \`${c.componentId}\` | ${c.role} | ${c.requirement}${c.conditionDescription ? ` — ${c.conditionDescription}` : ""} | ${c.outputStrategy} | ${c.officialFormId ?? "—"} |`);
  }
  out.push("");
  for (const p of (SPEC.componentCarriageNotes ?? [])) out.push(p, "");

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  if ((SPEC.notTold ?? []).length > 0) {
    out.push("## What this packet does not tell you, and who does", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help", "");
  for (const s of SPEC.stopConditions) out.push(`- ${s}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeKey).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------------ */
async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveRecords();
  const { bound, failures: sourceFailures } = resolveOfficialDocuments();
  const { out: notExercised, failures: notExercisedFailures } = resolveDeclaredNotExercised();
  if (failures.length > 0 || sourceFailures.length > 0 || notExercisedFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE",
      failedSourceIdentities: [...failures, ...sourceFailures, ...notExercisedFailures],
      why: "a committed record or a bound official document this family builds from is missing, unmounted, or no longer carries what this build relies on; nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }
  /*
   * TRANSPORT, BEFORE ANY CENSUS. A document whose spec declares transportUnlock
   * is carried through a proved-equivalent decryption; every later step -- the
   * census, the finalizer and the ink audit -- then reads the derivative, which
   * has been proved equal to the official binary rather than assumed to be.
   */
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), `${SPEC.familyId}-transport-`));
  const transportRecords = [];
  for (const b of [...bound, ...notExercised]) {
    if (!b.doc.transportUnlock) continue;
    const unlocked = unlockBoundDocument(b, scratchDir);
    if (!unlocked.ok) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
      return {
        familyId: SPEC.familyId, status: "STOPPED",
        stopClass: "UNLOCKED_DERIVATIVE_IS_NOT_EQUIVALENT_TO_THE_OFFICIAL_BINARY",
        why: unlocked.why, sourceId: b.doc.sourceId, pinnedSha256: b.doc.sha256,
        evidence: unlocked.record ?? null,
        overlayDirectoryTouched: false
      };
    }
    b.officialBytes = b.bytes;
    b.bytes = fs.readFileSync(unlocked.derivedPath);
    b.derivedPath = unlocked.derivedPath;
    b.transport = unlocked.record;
    transportRecords.push({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, ...unlocked.record });
  }

  const boundByComponent = new Map(bound.map((b) => [b.componentId, b]));

  // Every cell this family writes into is measured from the official
  // document's own strokes before anything is drawn. A cell that does not
  // measure stops the family rather than being drawn at a guessed rectangle.
  // An AcroForm document is censused once, from the document itself, and the
  // census is reused for both fixtures: the geometry is a property of the form,
  // not of the facts written onto it.
  const censusByComponent = new Map();
  for (const b of bound) {
    if (b.doc.acroform === true) censusByComponent.set(b.componentId, await censusAcroForm(b.bytes, b.doc.documentId));
  }

  /*
   * THE CHARGE TABLES, MEASURED AGAINST THE PAPER, BEFORE ANYTHING IS RENDERED.
   * See auditTableGeometry. A table that does not measure stops the family with
   * the measurement, and leaves the overlay directory untouched.
   */
  const tableGeometry = [];
  for (const b of bound) {
    const table = SPEC.officialTables?.[b.componentId];
    if (!table) continue;
    const readable = printedWords(b.derivedPath ?? null);
    if (!readable.ok) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
      return {
        familyId: SPEC.familyId, status: "STOPPED", stopClass: "TABLE_GEOMETRY_COULD_NOT_BE_MEASURED",
        why:
          "the printed column headings of a charge table could not be read from the document's own bytes, so "
          + "no cell can be resolved to a column by geometry and nothing is drawn on a name alone",
        documentId: b.doc.documentId, reader: readable.why, overlayDirectoryTouched: false
      };
    }
    const audit = auditTableGeometry(b.doc.documentId, table, censusByComponent.get(b.componentId), readable.pages[table.page - 1] ?? []);
    if (!audit.ok) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
      return {
        familyId: SPEC.familyId, status: "STOPPED", stopClass: "TABLE_GEOMETRY_DOES_NOT_MATCH_THE_PRINTED_PAGE",
        why:
          "a charge-table cell could not be resolved to exactly one printed column, or the declared row order "
          + "is not the order the rows appear down the page; an AcroForm index is not a printed row",
        documentId: b.doc.documentId, findings: audit.findings, overlayDirectoryTouched: false
      };
    }
    tableGeometry.push(audit.record);
  }

  const cellsByComponent = new Map();
  const allDrift = [];
  for (const b of bound) {
    const cells = SPEC.officialCells?.[b.componentId] ?? [];
    if (cells.length === 0) { cellsByComponent.set(b.componentId, []); continue; }
    const { measured, drift } = await measureCells(b.bytes, cells);
    cellsByComponent.set(b.componentId, measured);
    for (const d of drift) allDrift.push({ component: b.componentId, ...d });
  }
  if (allDrift.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", geometryDrift: allDrift,
      why: "a write box could not be measured from the official document's own rule strokes; nothing is drawn at a guessed rectangle",
      overlayDirectoryTouched: false
    };
  }

  /*
   * Every censused field of every AcroForm document appears in the field map
   * exactly once, as a write or as a classified blank.
   *
   * The completeness audit reads the MAP, not the form: a field left out of
   * the map is a field nothing asks about, and a hundred and nineteen-field
   * petition could pass on nine declared rows. So the map is checked against
   * the document's own census before anything is rendered, and a family that
   * does not cover its own form stops rather than shipping a partial audit.
   */
  const coverageFailures = [];
  for (const b of bound) {
    if (b.doc.acroform !== true) continue;
    const census = censusByComponent.get(b.componentId);
    const { writes, refusals } = SPEC.mapFor(b.componentId, mapHelpers(b.componentId));
    const prefix = `${b.componentId}.`;
    const declared = [...writes, ...refusals].map((r) => String(r.field).slice(prefix.length));
    const seen = new Set();
    const twice = [];
    for (const d of declared) { if (seen.has(d)) twice.push(d); seen.add(d); }
    const censused = new Set(census.fields.map((f) => f.name));
    const missing = [...censused].filter((n) => !seen.has(n));
    const unknown = [...seen].filter((n) => !censused.has(n));
    if (missing.length || unknown.length || twice.length) {
      coverageFailures.push({
        component: b.componentId, documentId: b.doc.documentId,
        censusedFields: censused.size, declaredRows: declared.length,
        censusedButNotDeclared: missing, declaredButNotOnTheForm: unknown, declaredTwice: twice
      });
    }
  }
  if (coverageFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "FIELD_MAP_DOES_NOT_COVER_THE_FORM",
      why:
        "the completeness audit reads the field map rather than the form, so a censused field missing from "
        + "the map is a blank nothing asks about; this family does not cover its own document and nothing was "
        + "rendered",
      coverageFailures, overlayDirectoryTouched: false
    };
  }

  /*
   * THE RECORD THE GUIDE PRINTS FROM, RESOLVED BEFORE ANYTHING IS RENDERED.
   *
   * participant-instructions.md prints the committed packet-set manifest's own
   * requiredBeforeFiling list and its own component table. If the record has
   * stopped declaring either, the guide would silently become this builder's
   * own account of a record that no longer says it. That is a stop, not a
   * degraded build, and it is taken here so that a family which stops leaves
   * its overlay directory untouched.
   */
  const declaredRecord = declaredRequiredBeforeFiling();
  if (!declaredRecord.ok) {
    return {
      familyId: SPEC.familyId, status: "STOPPED",
      stopClass: "RECORD_NO_LONGER_DECLARES_WHAT_THE_PACKET_PRINTS",
      why: declaredRecord.why,
      record: PACKET_SET_MANIFESTS, packetSetId: PACKET_SET_ID,
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = SPEC.components.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, sha256: b.doc.sha256, custody: b.custody })),
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      cellsMeasured: [...cellsByComponent.values()].reduce((n, c) => n + c.length, 0),
      chargeTableGeometry: tableGeometry,
      components: SPEC.components,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  /*
   * THE GUIDE IS BUILT AND GATED BEFORE ANYTHING IS WRITTEN.
   *
   * The field map, the required-before-filing list and the participant guide
   * are all pure functions of the SPEC and the committed records, so they can
   * be produced -- and refused -- before a single byte of this family's output
   * directory is created. That ordering is the point: a family that stops must
   * leave its overlay directory byte-for-byte unchanged, and a guide checked
   * after the fixtures were rendered would have stopped a family that had
   * already half-written itself.
   */
  const maps = SPEC.components.map((c) => composedMap(c));
  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf, declaredRecord);
  const wordBreaches = forbiddenWordBreaches(instructionsText);
  if (wordBreaches.length > 0) {
    fs.rmSync(scratchDir, { recursive: true, force: true });
    return {
      familyId: SPEC.familyId, status: "STOPPED",
      stopClass: "FORBIDDEN_JURISDICTION_WORD_IN_PARTICIPANT_COPY",
      why: SPEC.forbiddenWordWhy ?? "a word this jurisdiction's committed record forbids in participant copy appears in the generated guide outside the sentences that are allowed to carry it",
      breaches: wordBreaches,
      overlayDirectoryTouched: false
    };
  }

  const blocked = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, STALE_BLOCK), "utf8")).hashes ?? []);
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  const overlayReports = [];
  const inkAudits = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];
    const drawnValues = new Map();

    for (const componentId of SPEC.components) {
      let componentBytes;
      let sourceSha = null;
      if (isOfficial(componentId)) {
        const b = boundByComponent.get(componentId);
        sourceSha = b.doc.sha256;
        let bytes;
        let report;
        let boxes;
        if (b.doc.acroform === true) {
          // An AcroForm document. Every decision about what MAY be written is
          // the shared semantics'; this supplies only the family's own explicit
          // mappings and its role classification, and then proves the result
          // from the artifact bytes rather than from the finalizer's report.
          const census = censusByComponent.get(componentId);
          const result = await finalizeOfficialForm({
            sourceBytes: b.bytes,
            /* The digest of the bytes actually handed over. Where a document was
             * carried through transport that is the proved-equivalent
             * derivative; the OFFICIAL identity is b.doc.sha256 and it is what
             * the receipt binds. */
            expectedSha256: b.transport ? b.transport.derivedSha256 : b.doc.sha256,
            census: census.fields,
            facts,
            explicitMappings: b.doc.explicitMappings ?? {},
            /* One held fact on the ruled line the form prints for it, where no
             * shared descriptor reaches the printed caption. Named per document
             * and empty for every document that does not name it, so the
             * petition is byte-unaffected. See the fee_waiver document's
             * narrativeLines note for the refusal it answers. */
            narrativeAcrossFields: b.doc.narrativeLines ?? [],
            /* The order the form prints beneath the blank, named per field by
             * this caller because this caller read the printed line. */
            printedDateOrderByField: b.doc.printedDateOrder ?? {},
            unwritableFields: (b.doc.unwritable ?? []).map((u) => ({ field: u.field, class: u.class })),
            captionOnly: b.doc.captionOnly === true,
            documentTextLines: census.documentTextLines,
            evaluateDeclaredMinimumSize: true,
            alignWidgetFontSizeToFit: true,
            /*
             * SYNTHESIZED CHECKBOX SQUARES, REFUSED BEFORE THEY ARE DRAWN.
             *
             * pdf-lib's default appearance provider paints a black stroked
             * square sized to the widget /Rect for any check box whose CURRENT
             * /AS state has no /AP /N entry, and flatten() stamps it into page
             * content. VF03 measured exactly that on the delivered bytes of the
             * sibling family nc_145_5_felony-set: 60 such squares across
             * AOC-CR-297 and AOC-CV-226, reproduced by a zero-write baseline,
             * so the ink was the sanitizer's and not the family's.
             *
             * The same condition holds on THIS family's binaries: read from the
             * pinned AOC-CR-298 (sha256 8f526257..) and AOC-CV-226 (sha256
             * 74057a13..), the unmarked selection widgets are /AS /Off with
             * /Yes the only state in /AP /N and /MK carrying no /BC and no /BG,
             * so under ISO 32000-1 12.5.5 a conforming viewer paints nothing
             * for the current state. Both AOC forms print their own smaller box
             * at each of those positions, so a synthesized square would hand
             * the participant a doubled outline where the court prints one.
             *
             * Opting in installs an EMPTY appearance for the state the source
             * omitted, so nothing is synthesized and nothing is flattened
             * there. It never touches a widget that ships its own appearance
             * for its current state, a widget of a field this run wrote, a
             * widget with no /AS, or a widget whose /AP /N is a bare stream.
             * Every intended mark and every write is unchanged. The delivered
             * bytes are scanned afterwards by
             * scripts/grade-a-packet-factory-24h/scan-synthesized-widget-borders.mjs,
             * which is the measurement rather than this note.
             */
            suppressSynthesizedAppearances: true,
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenNames = new Set(report.written.map((w) => w.field));
          /*
           * GATE: THE FINALIZER'S WRITES MUST BE THE MAP'S WRITES.
           *
           * DEFECTS_NO_COUNTER_CAN_SEE `map-honest-writes-not`: PF04 found a
           * build that wrote four values onto a notarised petition its own
           * field map declared blank -- the legal name on both lines of
           * "current name, previous names, and all aliases", and one address on
           * both lines of "all addresses since the offense". The completeness
           * contract reads the MAP, the map was honest about its intent, and
           * nothing compared the two. Every nine counters read zero.
           *
           * So they are compared here, before the component reaches the packet,
           * and any disagreement in either direction stops the family: a field
           * the map declares written that the finalizer refused is a packet
           * missing a fact its own map promises, and a field the finalizer wrote
           * that the map declares blank is ink nobody classified.
           */
          const declaredWrites = new Set(
            (maps.find((m) => m.documentRole === componentId)?.canonicalWrites ?? [])
              .map((w) => String(w.field).slice(`${componentId}.`.length)));
          const wroteButNotDeclared = [...writtenNames].filter((n) => !declaredWrites.has(n));
          const declaredButNotWritten = [...declaredWrites].filter((n) => !writtenNames.has(n));
          if (wroteButNotDeclared.length > 0 || declaredButNotWritten.length > 0) {
            fs.rmSync(scratchDir, { recursive: true, force: true });
            return {
              familyId: SPEC.familyId, status: "STOPPED",
              stopClass: "FINALIZER_WRITES_DISAGREE_WITH_THE_FIELD_MAP",
              why:
                "the field map and the finalizer disagree about what was written onto an official form; the "
                + "completeness contract reads the map, so a disagreement here is invisible to all nine counters",
              fixture: fixtureName, component: componentId, documentId: b.doc.documentId,
              wroteButTheMapDeclaresBlank: wroteButNotDeclared,
              theMapDeclaresWrittenButTheFinalizerRefused: declaredButNotWritten,
              finalizerRefusals: (report.refused ?? []).filter((r) => declaredButNotWritten.includes(r.field)),
              overlayDirectoryTouched: true
            };
          }
          boxes = census.fields.flatMap((f) => (f.widgets ?? []).map((w) => ({
            key: f.name, page: w.page, rect: w.rect, written: writtenNames.has(f.name),
            isControl: f.type !== "text"
          })));
          for (const w of report.written) {
            const value = resolveFact(facts, w.factId);
            if (value !== undefined && value !== null && String(value) !== "") {
              /*
               * The byte proof looks for the string the page CARRIES, not the
               * string the fact is stored as. Where this build asked for a date
               * in the order the form prints beneath the blank, the ink is
               * "11/06/1990" and a proof that hunted for "1990-11-06" would
               * fail on a correct write -- or, worse, pass on an incorrect one
               * if it were ever relaxed. So the same transformation the
               * finalizer applied is applied here, from the same shared
               * function, and the proof still reads the delivered bytes.
               */
              const order = b.doc.printedDateOrder?.[w.field];
              const drawn = order ? isoDateInPrintedOrder(String(value), order, w.field) : String(value);
              drawnValues.set(`${componentId} ${componentId}.${w.field}`, drawn);
            }
          }
        } else {
          // A flat document. Every value sits on a stroke the form itself drew.
          const cells = cellsByComponent.get(componentId) ?? [];
          const writable = cells.filter((c) => c.fact && !c.tooShallowToWriteIn);
          const result = await finalizeFlatOverlay({
            sourceBytes: b.bytes,
            expectedSha256: b.doc.sha256,
            anchors: writable.map((c) => ({
              label: c.bindingLabel ?? c.label, page: c.page, writeBox: c.writeBox,
              factId: c.fact, protectedRules: []
            })),
            explicitMappings: Object.fromEntries(writable.map((c) => [c.bindingLabel ?? c.label, c.fact])),
            facts,
            documentTextLines: [],
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenAnchors = new Set(report.written.map((w) => w.anchor));
          for (const w of report.written) {
            const cell = writable.find((c) => (c.bindingLabel ?? c.label) === w.anchor);
            if (cell) drawnValues.set(`${componentId} ${componentId}.${cell.key}`, String(facts[cell.fact] ?? ""));
          }
          boxes = cells.map((c) => ({
            key: c.key, page: c.page, rect: c.writeBox,
            written: writtenAnchors.has(c.bindingLabel ?? c.label)
          }));
        }
        const ink = await auditOfficialInk(b.bytes, bytes, boxes);
        inkAudits.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...ink });
        overlayReports.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...report });
        componentBytes = Buffer.from(bytes);
      } else {
        const body = SPEC.composedBody(componentId, facts);
        assert.ok(body.includes(facts["participant.full_legal_name"]),
          `${componentId}: the composed page must carry the participant's name`);
        componentBytes = await renderComposedPdf(body, SPEC.componentTitles[componentId]);
      }
      const component = await PDFDocument.load(componentBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(component, component.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), component: componentId,
          documentId: OFFICIAL[componentId]?.documentId ?? componentId,
          sourcePage: i + 1, sourceSha256: sourceSha
        });
      }
      documents.push(OFFICIAL[componentId]?.documentId ?? componentId);
    }

    /*
     * DEFECTS_NO_COUNTER_CAN_SEE `a-published-zero-where-a-measurement-existed`:
     * a family published a hardcoded literal 0 for a quantity it could have
     * read. flattenedWidgetAppearancesReadFromOutputBytes is zero here BECAUSE
     * every official document is flattened before it is copied and a composed
     * page never had a widget -- but that is a claim about the build, so it is
     * turned into a reading of the delivered bytes: the number of widget
     * annotations the finished packet still carries.
     */
    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const delivered = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
    const widgetsRemaining = delivered.getPages().reduce((n, page) => {
      const annots = page.node.Annots();
      if (!annots) return n;
      let here = 0;
      for (let i = 0; i < annots.size(); i += 1) {
        const a = annots.lookup(i);
        const subtype = a?.get?.(PDFName.of("Subtype"));
        if (String(subtype) === "/Widget") here += 1;
      }
      return n + here;
    }, 0);
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    if (blocked.has(sha256)) {
      return { familyId: SPEC.familyId, status: "STOPPED", stopClass: "RENDERED_TO_A_BLOCKED_HASH", sha256 };
    }

    const addedInk = new Map();
    for (const audit of inkAudits.filter((a) => a.fixture === fixtureName)) {
      for (const item of audit.addedItems ?? []) {
        const key = `${audit.component} ${item.page}`;
        addedInk.set(key, [...(addedInk.get(key) ?? []), item]);
      }
    }
    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues,
      (componentId, fieldName) =>
        (censusByComponent.get(componentId)?.fields ?? []).find((f) => f.name === fieldName)?.widgets?.[0]?.rect ?? null,
      addedInk);
    // The ink audit is per OFFICIAL document and is the only channel that can
    // see ink outside a measured box, or ink sitting on a blank the map
    // refused. A composed page raises no such question: this build authored
    // every mark on it.
    const inkHere = inkAudits.filter((a) => a.fixture === fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod:
        "every written fact value read back from the extracted text of its component's own pages in the saved "
        + "packet bytes, and every official document's finished text compared item by item against the pinned "
        + "source document's own text so that only what this build added is measured",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: widgetsRemaining,
      flattenedWidgetNote:
        "read from the delivered bytes rather than asserted: this is the number of /Widget annotations the "
        + "finished packet still carries. An AcroForm document is flattened into page content before it is "
        + "copied into the packet and a composed page never had a widget, so the expected reading is zero "
        + "and every mark this family makes is counted as a glyph in the column beside this one -- but the "
        + "zero is a measurement of the artifact, not a statement about the build",
      flattenedControlChromeGlyphsReadFromOutputBytes:
        inkHere.reduce((n, a) => n + (a.controlChromeGlyphs ?? 0), 0),
      flattenedControlChrome: inkHere.flatMap((a) => (a.controlChrome ?? []).map((c) => ({ ...c, documentId: a.documentId }))),
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:
        inkHere.reduce((n, a) => n + a.glyphsOutsideMeasuredWriteBoxes, 0),
      refusedFieldsWithInk: inkHere.flatMap((a) => a.refusedFieldsWithInk.map((r) => ({ ...r, documentId: a.documentId }))),
      officialInkAudits: inkHere.map(({ addedItems, ...rest }) => rest),
      actualWrites: proof.actualWrites
    });

    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: SPEC.components
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: SPEC.assembledPacketRole ?? "assembled_agency_application_packet",
      fixture: fixtureName, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.worklistGroupId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: STRATEGY,
    custodyClass: SPEC.custodyClass, acquisitionCommissioned: false,
    bindingMethod:
      "committed repository records bound by exact SHA-256 at build time with every relied-on statement re-read "
      + "from the committed bytes as an anchor"
      + (bound.length > 0 ? ", and every official agency document bound by exact SHA-256 resolved through the committed corpus index and its declared custody roots" : ""),
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    agencyTreatmentNote: SPEC.agencyTreatmentNote,
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role, anchorStatementsVerified: r.anchorsVerified
    })),
    /*
     * TRANSPORT IS RECORDED BESIDE IDENTITY AND NEVER IN PLACE OF IT. Each entry
     * below binds the OFFICIAL binary by its pinned SHA-256, recomputed from the
     * file on disk. Where the official binary had to be carried through a
     * decryption to be readable at all, the derivative's own digest, the method
     * that produced it and the equivalence that was proved of it are recorded
     * under `transport`, which is not an identity and is not a source.
     */
    transport: transportRecords,
    documents: bound.map((b) => ({
      sourceIds: [b.doc.sourceId], documentId: b.doc.documentId, formNumber: b.doc.formNumber ?? b.doc.documentId,
      officialTitle: b.doc.officialTitle, revision: b.doc.revision ?? null,
      sha256: b.doc.sha256, byteLength: b.bytes.length,
      custody: b.custody, pathInCustody: b.pathInCustody,
      matchedBy: "exact_pinned_sha256_recomputed_from_the_bytes_on_disk",
      ...(b.transport ? { transport: {
        why: b.doc.transportUnlock.why,
        method: b.transport.createdBy,
        derivedSha256: b.transport.derivedSha256,
        derivedByteLength: b.transport.derivedByteLength,
        sourceEncrypted: b.transport.sourceEncrypted,
        derivedEncrypted: b.transport.derivedEncrypted,
        officialSha256UnchangedByTheRead: b.transport.sourceUnchanged,
        equivalenceProvedBy: b.transport.fidelityLogic,
        equivalenceDelta: b.transport.delta,
        pikepdfVersion: b.transport.pikepdfVersion,
        libqpdfVersion: b.transport.libqpdfVersion,
        derivativeIsNotAnIdentity:
          "the bound identity is the official binary above; this derivative is a build-time transport copy, "
          + "is not committed, and is deleted when the build ends"
      } } : {}),
      corpusIndexAgrees: b.entry.sha256 === b.doc.sha256 && b.entry.byteLength === b.bytes.length,
      pageCount: b.entry.pageCount, acroFieldCount: b.entry.acroFieldCount,
      structuralClassObserved: b.entry.structuralClassObserved,
      instrumentKind: b.doc.instrumentKind ?? "participant_agency_application_form",
      /*
       * WHAT WAS ACTUALLY DONE TO THIS DOCUMENT'S PAGES, which is not the same
       * question as whether the family declared measured cells for it. This
       * read "delivered_unmodified" for every AcroForm document in the packet,
       * including the ones this build writes onto and flattens -- a false
       * statement about the delivered bytes sitting in the source receipt,
       * where it is exactly the sentence a reviewer would rely on.
       */
      renderStrategy: (SPEC.officialCells?.[b.componentId] ?? []).length > 0
        ? "measured_flat_overlay"
        : b.doc.acroform === true
          ? `acroform_filled_and_flattened_by_the_shared_official_form_finalizer${b.transport ? "_after_a_proven_equivalent_unlock" : ""}`
          : "delivered_unmodified"
    })),
    composedComponentsAuthoredByThisBuild: SPEC.components.filter((c) => !isOfficial(c)),
    conditionalDocumentsBoundButNotExercised: notExercised.map((b) => ({
      sourceIds: [b.doc.sourceId], documentId: b.doc.documentId, formNumber: b.doc.formNumber ?? b.doc.documentId,
      officialTitle: b.doc.officialTitle, revision: b.doc.revision ?? null,
      componentId: b.doc.componentId ?? b.componentId,
      sha256: b.doc.sha256, byteLength: b.bytes.length, custody: b.custody, pathInCustody: b.pathInCustody,
      matchedBy: "exact_pinned_sha256_recomputed_from_the_bytes_on_disk",
      declaredRequirement: b.doc.declaredRequirement ?? "conditional",
      conditionDescription: b.doc.conditionDescription ?? null,
      whyTheConditionIsUnmetInTheseFixtures: b.doc.whyUnmet ?? null,
      ...(b.transport ? { transport: {
        why: b.doc.transportUnlock.why, method: b.transport.createdBy,
        derivedSha256: b.transport.derivedSha256, derivedByteLength: b.transport.derivedByteLength,
        sourceEncrypted: b.transport.sourceEncrypted, derivedEncrypted: b.transport.derivedEncrypted,
        officialSha256UnchangedByTheRead: b.transport.sourceUnchanged,
        equivalenceProvedBy: b.transport.fidelityLogic, equivalenceDelta: b.transport.delta,
        pikepdfVersion: b.transport.pikepdfVersion, libqpdfVersion: b.transport.libqpdfVersion
      } } : {}),
      renderStrategy: "not_rendered_in_either_fixture",
      whatThisBindingEstablishes:
        "that the pinned official binary is held in this container, hashes to its declared digest, and opens "
        + "and proves equivalent through the same transport as every rendered document; it establishes nothing "
        + "about a packet, because this document is in neither packet"
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family prepares for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    /*
     * The vocabulary census-v1-ca-1203-4-set established for an encrypted
     * official form, recorded here in the same two keys so a reader comparing
     * the two families is comparing like with like.
     *
     * One difference is recorded rather than smoothed over. ca-1203-4-set reads
     * the official encrypted binaries in place through pikepdf and records
     * derivativesUsedForMeasurement false. This family SAVES a derivative,
     * because the census, the finalizer and the ink audit here are pdf-lib and
     * pdf-lib cannot open the encrypted bytes at all; so the derivative is the
     * surface that is read, and the equivalence proof beneath is what makes
     * that a reading of the official binary rather than of something else. The
     * proof is per document in source-receipt.json under `transport`.
     */
    renderStrategy: "pikepdf_unlocked_derivative_then_official_form_finalizer",
    measurementSurface:
      "a build-time pikepdf derivative of each exact official encrypted binary, proved equivalent to it "
      + "page for page, page geometry for page geometry, terminal field for terminal field, content stream "
      + "for content stream and XFA for XFA before it is read",
    derivativesUsedForMeasurement: true,
    derivativesCommitted: false,
    derivativeEquivalenceProof: transportRecords.map((t) => ({
      documentId: t.documentId, sourceId: t.sourceId,
      officialSha256: bound.concat(notExercised).find((b) => b.doc.sourceId === t.sourceId)?.doc.sha256 ?? null,
      derivedSha256: t.derivedSha256,
      officialSha256UnchangedByTheRead: t.sourceUnchanged,
      sourceEncrypted: t.sourceEncrypted, derivedEncrypted: t.derivedEncrypted,
      equivalenceProvedBy: t.fidelityLogic, equivalenceDelta: t.delta,
      pikepdfVersion: t.pikepdfVersion, libqpdfVersion: t.libqpdfVersion
    })),
    composedRenderStrategy: SPEC.components.some((c) => !isOfficial(c))
      ? "deterministic_composed_page_authored_by_this_build" : null,
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: STRATEGY,
    agencyTreatmentNote: SPEC.agencyTreatmentNote ?? null,
    officialForm: bound.length > 0 ? bound.map((b) => b.doc.documentId) : null,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routeSelectionsMade ?? [],
    routeSelectionNote: SPEC.routeSelectionNote,
    measuredCells: Object.fromEntries([...cellsByComponent.entries()].map(([k, v]) => [k, v.map((c) => ({
      key: c.key, page: c.page, label: c.label, fact: c.fact ?? null, rect: c.rect,
      rectBasis: c.rectBasis, measuredCell: c.measuredCell, tooShallowToWriteIn: c.tooShallowToWriteIn
    }))])),
    chargeTableGeometry: tableGeometry,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  /*
   * THE FIELD CENSUS, AND THE CAPTION EVIDENCE UNDER IT.
   *
   * Every blank of every bound official document, as the document itself
   * declares it: its type, its widgets and their rectangles, the caption the
   * shared capture returned, the caption the printed page carries, and what
   * this family did with it. This is the surface the field map is checked
   * against before anything is rendered, and it is published so a reviewer can
   * check the map against the form without opening the form.
   */
  const mapRowByDocument = new Map();
  for (const m of maps) {
    const rows = new Map();
    for (const w of m.canonicalWrites ?? []) rows.set(String(w.field).slice(`${m.documentRole}.`.length), { disposition: "written", factId: w.factId ?? null, printedLabel: w.effectiveLabel });
    for (const r of m.canonicalRefusals ?? []) rows.set(String(r.field).slice(`${m.documentRole}.`.length), {
      disposition: r.completenessDisposition ?? r.category ?? "blank",
      requiredBeforeFiling: r.requiredBeforeFiling === true,
      isSelectionControl: r.isSelectionControl === true,
      printedLabel: r.effectiveLabel, why: r.why ?? r.reason ?? null
    });
    mapRowByDocument.set(m.documentRole, rows);
  }
  const correctionByKey = new Map(captionCorrectionsApplied.map((c) => [`${c.document} ${c.field}`, c]));
  writeJson(`${OUT}/reports/field-census.json`, {
    schemaVersion: "rcap-official-form-field-census/v1", familyId: SPEC.familyId,
    whatThisIs:
      "Every AcroForm blank of every bound official document, read from the document's own bytes through a "
      + "derivative proved equivalent to the pinned official binary, with the caption the shared capture "
      + "returned beside the caption the printed page carries.",
    documents: bound.filter((b) => b.doc.acroform === true).map((b) => {
      const census = censusByComponent.get(b.componentId);
      const rows = mapRowByDocument.get(b.componentId) ?? new Map();
      return {
        documentId: b.doc.documentId, componentId: b.componentId,
        officialSha256: b.doc.sha256, derivedSha256: b.transport?.derivedSha256 ?? null,
        pageCount: census.pageCount, fieldCount: census.fields.length,
        fields: census.fields.map((f) => ({
          name: f.name, type: f.type, multiline: f.multiline === true, maxLength: f.maxLength ?? null,
          widgets: (f.widgets ?? []).map((w) => ({
            page: w.page,
            rect: { x: Number(w.rect.x.toFixed(2)), y: Number(w.rect.y.toFixed(2)), width: Number(w.rect.width.toFixed(2)), height: Number(w.rect.height.toFixed(2)) }
          })),
          /* `?? f.effectiveLabel` would be wrong here: a capture that returned
           * NULL is exactly the case this column exists to show, and nullish
           * coalescing would replace it with the corrected caption and report a
           * capture that never happened. */
          capturedLabel: correctionByKey.has(`${b.doc.documentId} ${f.name}`)
            ? correctionByKey.get(`${b.doc.documentId} ${f.name}`).capturedLabel
            : f.effectiveLabel,
          captureAgreedWithThePrintedPage: correctionByKey.has(`${b.doc.documentId} ${f.name}`)
            ? correctionByKey.get(`${b.doc.documentId} ${f.name}`).capturedLabel === f.effectiveLabel
            : null,
          printedCaption: f.effectiveLabel,
          captionEvidence: correctionByKey.get(`${b.doc.documentId} ${f.name}`)?.measuredAt ?? null,
          labelBasis: f.labelBasis,
          inFieldMapAs: rows.get(f.name) ?? null
        }))
      };
    }),
    chargeTableGeometry: tableGeometry,
    everyCensusedFieldAppearsInTheFieldMapExactlyOnce: true
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    boundOfficialDocuments: bound.map((b) => ({ documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    conditionalDocumentsBoundButNotExercised: notExercised.map((b) => ({
      documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody,
      conditionDescription: b.doc.conditionDescription ?? null,
      whyTheConditionIsUnmetInTheseFixtures: b.doc.whyUnmet ?? null,
      inEitherPacket: false
    })),
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note: "Every written fact value was read back from the extracted text of its component's own pages in the saved packet bytes, not from this builder's intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      flattenedControlChromeGlyphsReadFromOutputBytes: p.flattenedControlChromeGlyphsReadFromOutputBytes,
      flattenedControlChrome: p.flattenedControlChrome,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    overlayReports: overlayReports.map((r) => ({
      fixture: r.fixture, component: r.component, documentId: r.documentId,
      sourceSha256: r.sourceSha256, outputSha256: r.outputSha256,
      written: r.written, refused: r.refused, unfittable: r.unfittable
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.documentRole, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    implementationStrategy: STRATEGY,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId, blocking: [],
    findings: SPEC.buildFindings,
    /* Stated, not implied: every caption this build corrected before the shared
     * protect test read it, with the capture it replaced and the measurement it
     * rests on. Two entries per fixture build, one per official AcroForm pass. */
    captionCorrectionsApplied
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    implementationStrategy: STRATEGY,
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  fs.rmSync(scratchDir, { recursive: true, force: true });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: STRATEGY,
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    conditionalDocumentsBoundButNotExercised: notExercised.map((b) => ({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    chargeTableGeometry: tableGeometry.map((t) => ({ documentId: t.documentId, rows: t.rows, columns: t.columns, columnOrder: t.columnOrderReadFromTheCellsOwnXPositions })),
    components: SPEC.components,
    documents: artifacts[0]?.documents ?? [],
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, bytes: a.byteLength, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };}

  return { runFamily };
}
