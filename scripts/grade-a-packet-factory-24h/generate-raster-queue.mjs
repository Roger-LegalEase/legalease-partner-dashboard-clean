#!/usr/bin/env node
/**
 * The raster queue, and the four lanes that consume it.
 *
 * Every packet-build lane in the fleet returned STOPPED on the same thing:
 * PF09 and PF15 on `pdftoppm ENOENT`, PF11 and PF12 on "Playwright cannot find
 * Chromium", and ENV-RAS01 then established that the Codex container cannot
 * even fetch one -- the Playwright CDN answers HTTP 403 from inside it. So the
 * visual gate is unreachable from the place the packets are built, and it has
 * been stopping lanes that had every other obligation in hand.
 *
 * The wrong fix is to weaken PASS_COMPLETE, and it is not taken here. A family
 * with no successful raster verdict is not PASS_COMPLETE, full stop. The visual
 * gate still has to prove every page rendered, no page blank, expected
 * dimensions, no clipped write, no overlapping participant text, no placeholder
 * text, no protected-field ink, and artifact hashes matching the submitted PDFs.
 *
 * The right fix is to move the render somewhere a browser exists. A builder
 * finishes every nonvisual obligation, records the exact SHA-256 of the PDFs it
 * produced, and returns BUILT_RASTER_PENDING -- a factory workflow state, not a
 * launch verdict, and one that zeroes and waives nothing. A GitHub-hosted runner
 * with a real Chrome renders those exact bytes and publishes receipts. RAS01-04
 * read the receipts, check the hashes bind to the queued PDFs, and write a
 * verdict. RASTER_PASS sends the family to independent verification;
 * RASTER_FAIL sends it to FIX.
 *
 * A family enters RASTER_PENDING only when its sources bind, its components
 * exist, both PDFs exist, and the nonvisual completeness checks pass. Queuing a
 * family whose packet is not finished would send the runner to render an
 * absence, and an absence renders as a defect.
 */
import crypto from "node:crypto";
import { conditionalPacketDocuments } from "./conditional-raster-documents.mjs";
import { resolveMiMoRasterEnrollment } from "../rcap-packet-recovery/chat1/mi-mo-declared-candidates.mjs";
import { resolveIaForm1RasterEnrollment } from "../rcap-packet-recovery/chat1/ia-form1-expected-candidates.mjs";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeEmitter } from "../lib/generator-emit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPTS = "docs/rcap/grade-a/packet-factory-24h/raster";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const OUT = `${DIR}/RASTER_QUEUE.json`;
const WORKFLOW = ".github/workflows/rcap-packet-raster-acceptance-batch.yml";

const RASTER_STATES = ["RASTER_PENDING", "RASTER_RUNNING", "RASTER_PASS", "RASTER_FAIL", "RASTER_BLOCKED_ENVIRONMENT"];
const LANES = ["RAS01", "RAS02", "RAS03", "RAS04"];
const REQUESTED_SCALE = 2.5;

const git = (a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } };
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")); } catch { return d; } };

const master = read(`${DIR}/MASTER_QUEUE.json`);
if (!master) { console.error("REFUSED: the master queue is not readable; a raster queue built from nothing would queue nothing and say so cheerfully."); process.exit(1); }
const active = read(`${DIR}/ACTIVE_ASSIGNMENTS.json`, { assignments: [] });
const builderOf = new Map();
for (const a of active.assignments ?? []) for (const f of a.items ?? []) if (typeof f === "string") builderOf.set(f, a.assignmentId);

// pdf-lib is what the builders use; the page count is read from the bytes, not
// from anyone's report about the bytes.
// Parsed, not scanned. The byte scan for /Type /Page sees nothing when the page
// dictionaries live in a compressed object stream, so a valid PDF would report
// no pages. Same defect already repaired in rcap-raster-batch.mjs; it was here
// too.
const pageCount = async (p) => {
  const { PDFDocument } = await import("pdf-lib");
  return (await PDFDocument.load(fs.readFileSync(p), { ignoreEncryption: true, updateMetadata: false })).getPageCount();
};

/*
 * A page count the reader could not read is `null`, not a throw and not a zero.
 *
 * Reading the fixture directories recursively exposed 38 PDFs pdf-lib cannot
 * open at all: the untouched `*-unchanged-official.pdf` Judicial Council forms
 * shipped by the seven California families are ENCRYPTED and store their
 * objects in cross-reference streams, so `ignoreEncryption` skips the
 * permission check without decrypting anything and object resolution fails.
 * (Each of those families keeps a pikepdf-unlocked copy under derived-sources/
 * for exactly this reason.)
 *
 * Zero would be a lie and a throw would take the whole queue down, so the
 * probe returns null. The caller then asks Poppler's pdfinfo to independently
 * parse the exact bytes. Without that second reader and a positive count the
 * family is still refused: a receipt over an unknown number of pages is
 * exactly the kind of verdict this queue exists to prevent.
 *
 * The parser narrates each unresolved object on the console. That chatter is
 * the reader's, not this generator's finding -- the finding is the named
 * refusal below -- so it is muted for the probe only.
 */
const pageCountOrNull = async (p) => {
  const { warn, log, error } = console;
  Object.assign(console, { warn: () => {}, log: () => {}, error: () => {} });
  try { return await pageCount(p); } catch { return null; } finally { Object.assign(console, { warn, log, error }); }
};

/* Poppler reads the encryption wrapper and page tree independently of pdf-lib.
 * This is evidence from the exact queued bytes, not a builder assertion. If it
 * is unavailable or its output is ambiguous, the family remains ineligible. */
const pdfInfoPageEvidenceOrNull = (p) => {
  try {
    const result = spawnSync("pdfinfo", [p], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (result.status !== 0) return null;
    const hit = result.stdout.match(/^Pages:\s+(\d+)\s*$/m);
    const n = hit ? Number(hit[1]) : 0;
    if (!Number.isInteger(n) || n <= 0) return null;
    const vr = spawnSync("pdfinfo", ["-v"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const version = `${vr.stdout ?? ""}\n${vr.stderr ?? ""}`.match(/pdfinfo version\s+([^\s]+)/i)?.[1] ?? "unknown";
    return { method: "Poppler pdfinfo", version, pageCount: n, sourceSha256: sha256(p) };
  } catch { return null; }
};

const packetCommit = git(["rev-parse", "HEAD"]);
const rows = [];
const notEligible = [];

/*
 * Carry forward verdicts that a central raster run already earned.
 *
 * This generator rebuilt every row as RASTER_PENDING, so regenerating it after
 * a batch silently destroyed 25 hash-bound RASTER_PASS receipts from run
 * 33488713831 -- evidence that cost a full workflow run and cannot be
 * reconstructed from the tree. Captain hit it while refreshing the queue for
 * newly built families and restored from a copy taken seconds earlier.
 *
 * A verdict is carried forward ONLY if the row's pinned bytes are unchanged.
 * If either hash moved, the packet is different bytes and the old receipt
 * describes a packet nobody queued, so the row correctly returns to
 * RASTER_PENDING.
 */
/*
 * Which PDF in a fixtures directory IS the family's fixture.
 *
 * This was `pdfs.find((x) => /canonical/.test(x))` over a SORTED listing, and
 * that picks the wrong file for every family that also emits its primary
 * filing as a separate component: "canonical--CC-1201-primary-filing.pdf"
 * sorts before "canonical.pdf" because '-' precedes '.'. Nine families were
 * queued to raster one component of a multi-component packet -- four pages of
 * an eight-page Virginia packet, one page of a four-page Kentucky one -- and a
 * pass over that subset would have been written into the row as the FAMILY's
 * raster receipt. It reads as a complete verdict and is not one.
 *
 * It also made two Kentucky families byte-identical in the queue, because the
 * component they both pointed at is a generic proposed order with no
 * charge-specific fill. One render would have produced two receipts.
 *
 * The builder already records which file is the deliverable, so ask it instead
 * of inferring from names. Where it does not, prefer the exact name, and where
 * the family names its packet after the form, take the sole substring match.
 * Never guess between several: an ambiguous directory makes the family
 * ineligible and says so.
 */
const fixtureBasis = new Map();
const fixtureCoverage = new Map();

/*
 * What the row's verdict actually covers.
 *
 * Picking the right fixture is not the same as covering the family. Eleven
 * families ship several canonical documents with no assembled canonical.pdf --
 * Washington's vacate packets carry both a petition and an order, Arkansas the
 * same -- so one row rasters one document and leaves the other unrendered.
 * Nine of those already carry RASTER_PASS. The receipts are honest about which
 * SHA-256 they bound to, but a row that says RASTER_PASS next to a familyId
 * reads as a verdict on the family, and for these it is a verdict on one of
 * its documents.
 *
 * So the row states its coverage and whether that coverage is complete. A
 * partial row is not promotable no matter how green its receipt is; the gate
 * that consumes this queue reads `coverage.complete`, not the state alone.
 */
/*
 * WHAT THIS GATE RENDERS, SAID PLAINLY.
 *
 * `complete` is asked of the CANONICAL documents, because those are what the
 * gate renders and what a participant receives. That was always what it
 * measured; what it did not do was say so. Every row declares a boundary
 * fixture, and on all 171 of them this returned notRastered: [] and
 * complete: true, so each receipt read as though the whole declared document
 * set had been through the gate. It had not: the boundary fixtures, and the
 * route-level fixtures on families that ship them, are hash-bound and never
 * rendered.
 *
 * That overclaim is how two real pagination defects survived a green gate --
 * an orphan page in an Oklahoma boundary fixture and a contact block splitting
 * across a page break in eleven of North Dakota's twelve PDFs. Both live in
 * bytes this gate never looked at, while the receipt said it had covered the
 * whole family.
 *
 * The boundary fixture is a stress artifact rather than a participant
 * deliverable, so this does not mean the canonical packets are unverified and
 * `complete` keeps the meaning the promotion path already depends on. What
 * changes is that the row now NAMES what went unrendered instead of implying
 * nothing did, so a reader can see the edge of the gate rather than having to
 * find it the way a verification lane just did.
 */
const coverageOf = (pdfs, fixture, rendered, allDeclared = [], selected = null) => {
  const outsideThisGate = allDeclared
    .filter((d) => d.role !== "canonical")
    .map((d) => d.name)
    .filter((name) => !rendered.includes(name));
  const edge = {
    notRenderedByThisGate: outsideThisGate,
    whatCompleteMeansHere: "every canonical document is rendered. Boundary and route-level fixtures are declared and bound by hash but are not rendered by this gate, and a defect that appears only in them is not something a RASTER_PASS has excluded.",
  };
  if (allDeclared.some(d => d.conditionalPacketBranch)) {
    const docs = allDeclared.filter(d => d.role === fixture).map(d => d.name);
    const missed = docs.filter(name => !rendered.includes(name));
    return { documents: docs, rastered: rendered, notRastered: missed,
      complete: missed.length === 0,
      basis: "Every canonical assembled diagnostic and explicitly declared conditional packet is included; the central renderer separately measures all declared boundary outputs.",
      ...edge };
  }
  if (pdfs.includes(`${fixture}.pdf`)) {
    return { documents: [`${fixture}.pdf`], rastered: rendered, notRastered: [],
      complete: rendered.includes(`${fixture}.pdf`),
      basis: "the family ships one assembled packet, so rendering it covers every canonical page of the family",
      ...edge };
  }
  /* The documents this row is answerable for are the ones it was asked to render:
   * the declaration-selected set where the family declares one, and otherwise every
   * listed PDF carrying the role, exactly as before. Reading this from the listing
   * while the row renders a selected set would report Oregon's four component motion
   * PDFs as canonical documents the gate had skipped, and fail a family for
   * delivering exactly what it declares. */
  const docs = selected ?? pdfs.filter((x) => x.includes(fixture));
  const missed = docs.filter((x) => !rendered.includes(x));
  return {
    documents: docs, rastered: rendered, notRastered: missed,
    complete: missed.length === 0,
    basis: missed.length === 0
      ? `the family ships ${docs.length} canonical document(s) with no assembled packet, and the row renders all of them`
      : `the family ships ${docs.length} canonical documents and this row renders ${rendered.length}`,
    ...edge,
  };
};

/*
 * Every document the row must render, not one pair of them.
 *
 * A row used to name one canonical and one boundary PDF, which is right for a
 * family that ships an assembled packet and wrong for the eleven that ship a
 * petition and an order with no assembly: those rendered the petition, and the
 * order -- the document a court signs -- had never been through the visual gate.
 * Nine of them were carrying RASTER_PASS.
 *
 * The job is still one per family and the artifact is still one per family, so
 * this changes what a job renders and touches neither the workflow matrix nor
 * the receipt naming.
 */
const documentSet = async (dir, fixtures, pdfs) => {
  const rows = [];
  const conditional = conditionalPacketDocuments({
    report: read(path.relative(ROOT, path.join(dir, "reports", "rendered-artifacts.json"))),
    fixtures, root: ROOT,
  });
  const declaration = declaredCompleteOutputs(dir, fixtures);
  for (const role of ["canonical", "boundary"]) {
    const primary = declaredSelection(discoveredForRole(pdfs, role), declaration, role, pdfs);
    const named = [...new Set([
      ...primary,
      ...conditional.filter(d => d.role === role).map(d => d.name),
      ...declaredButNotDiscovered(declaration, role, pdfs),
    ])];
    for (const name of named) {
      const abs = path.join(fixtures, name);
      const parsed = await pageCountOrNull(abs);
      const branch = conditional.find(d => d.role === role && d.name === name);
      if (branch && parsed !== null && parsed !== branch.declaredPageCount) {
        throw new Error(`Conditional packet page count drift: ${name}`);
      }
      const independentlyParsed = parsed === null ? pdfInfoPageEvidenceOrNull(abs) : null;
      const pageCountEvidence = parsed !== null
        ? { method: "pdf-lib", version: "1.17.1", pageCount: parsed, sourceSha256: sha256(abs) }
        : independentlyParsed;
      rows.push({
        role, name, path: POSIX(path.relative(ROOT, abs)), sha256: sha256(abs),
        ...(branch ? { conditionalPacketBranch: branch.branch } : {}),
        ...(branch?.selectionKind ? { selectionKind: branch.selectionKind,
          requiredBeforeFiling: branch.requiredBeforeFiling, filingReady: false } : {}),
        pageCount: pageCountEvidence?.pageCount ?? null,
        pageCountEvidence,
        pageCountBasis: parsed !== null
          ? "parsed from the queued PDF bytes with pdf-lib"
          : independentlyParsed
            ? "pdf-lib could not read the encrypted official PDF; Poppler pdfinfo independently parsed this count from the exact queued bytes"
            : null,
      });
    }
  }
  return rows;
};

/* The identity of the REQUESTED document set. A receipt describes the set that
 * was rendered, so when the set changes the receipt stops describing the row
 * and must not be carried forward -- exactly as a changed hash must not be. */
const documentsDigestOf = (docs) => crypto.createHash("sha256")
  .update(JSON.stringify(docs.map((d) => [d.role, d.path, d.sha256])))
  .digest("hex");

/*
 * Where a family keeps its fixtures, and every PDF inside it.
 *
 * This listed the ROOT of `fixtures/` and nothing below it (DF-003). Seven
 * California families keep their fixtures one directory deeper, one directory
 * per variant -- ca-prop64-set has
 * `fixtures/hs-11361-8-completed-sentence-application-canonical/cr-400-filled.pdf`
 * and eleven siblings -- so the listing came back empty, `pickFixture` found no
 * canonical and no boundary, and the family was recorded as not eligible for
 * the reason "no canonical PDF, no boundary PDF". Literally true of the
 * directory that was read and completely false about the family: 58 fixture
 * PDFs across seven families had never been listed, let alone rendered.
 *
 * Two Ohio families fail the same way for a different reason: they keep no
 * `fixtures/` directory at all and render into `tracks/<track>/rendered/<role>/`,
 * so the scan had nothing to open and said "no fixtures directory".
 *
 * Neither is repaired by inventing a second naming convention, and neither is
 * California-specific. The role these families need is already carried -- by
 * the variant DIRECTORY for the seven, and by the builder's own declaration in
 * reports/rendered-artifacts.json for the two -- so:
 *
 *   - the listing walks the whole tree and names each PDF RELATIVE to the
 *     fixtures root, which preserves a role that lives in a directory name and
 *     is byte-identical to the old basename listing for a flat directory; and
 *   - a family with no `fixtures/` directory is located by the files its
 *     builder declares as fixtures, which is the same evidence `pickFixture`
 *     already prefers over any inference from a name.
 *
 * Everything downstream already handles a set rather than a pair: the row
 * carries `documents[]` and rcap-raster-batch.mjs renders each of them into its
 * own slugged directory. Nothing here widens what a RASTER_PASS means; it only
 * stops the queue from silently declining to look.
 */
const POSIX = (p) => p.split(path.sep).join("/");

const walkPdfs = (root, rel = "") => {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walkPdfs(root, next));
    else if (e.name.endsWith(".pdf")) out.push(next);
  }
  return out;
};

/* A declared path is repo-relative in every declaration in the tree; resolving
 * it against the family directory too costs nothing and stops a differently
 * written declaration from reading as an absent file. */
const resolveDeclared = (dir, file) => {
  for (const c of [path.resolve(ROOT, file), path.resolve(dir, file)]) if (fs.existsSync(c)) return c;
  return null;
};

const declaredFixturePdfs = (dir) => {
  const p = path.join(dir, "reports", "rendered-artifacts.json");
  if (!fs.existsSync(p)) return [];
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
  return [...(doc.artifacts ?? []), ...(doc.pdfs ?? [])]
    .filter((a) => a?.fixture && a?.file)
    .map((a) => resolveDeclared(dir, a.file))
    .filter(Boolean);
};

/* The fixtures root is `fixtures/` wherever it exists -- which is every family
 * already in the queue -- and only where it does not exist does the builder's
 * declaration locate the fixtures instead. A family that has neither still has
 * no fixtures, and still says so. */
const fixturesOf = (dir) => {
  const fx = path.join(dir, "fixtures");
  if (fs.existsSync(fx)) return { root: fx, pdfs: walkPdfs(fx).sort(), basis: "the family's fixtures/ directory, read recursively" };
  const declared = declaredFixturePdfs(dir);
  if (!declared.length) return { root: null, pdfs: [], basis: null };
  return {
    root: dir,
    pdfs: [...new Set(declared.map((abs) => POSIX(path.relative(dir, abs))))].sort(),
    basis: "the family keeps no fixtures/ directory, so its fixtures are the files its builder declares as fixtures in reports/rendered-artifacts.json",
  };
};

const declaredFixture = (dir, root, fixture, pdfs) => {
  const p = path.join(dir, "reports", "rendered-artifacts.json");
  if (!fs.existsSync(p)) return null;
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
  /* Two declaration shapes exist: the WA-style host writes `artifacts` rows
   * with `document`, the east host writes rcap-rendered-artifacts/v1 `pdfs`
   * rows with `documentId`. Both name each file's fixture; the first declared
   * match is the row's primary, and coverage still spans every document. */
  const hit = [...(doc.artifacts ?? []), ...(doc.pdfs ?? [])].find((a) => a.fixture === fixture);
  if (!hit?.file) return null;
  /* Named the way the listing names it. For a flat fixtures/ directory that is
   * the basename this always used; for a per-variant one it is the path that
   * still carries the variant, and a declaration pointing outside the fixtures
   * root resolves to a name the listing does not hold and is refused. */
  const abs = resolveDeclared(dir, hit.file);
  const name = abs ? POSIX(path.relative(root, abs)) : path.basename(hit.file);
  return pdfs.includes(name) ? name : null;
};

const pickFixture = (dir, root, fixture, pdfs) => {
  const exact = `${fixture}.pdf`;
  if (pdfs.includes(exact)) return { name: exact, basis: "the assembled packet, matched by exact name", why: null };

  const declared = declaredFixture(dir, root, fixture, pdfs);
  if (declared) return { name: declared, basis: `declared by the builder as the ${fixture} artifact in reports/rendered-artifacts.json`, why: null };

  const matches = pdfs.filter((x) => x.includes(fixture));
  if (matches.length === 1) return { name: matches[0], basis: "the only PDF in the directory carrying this fixture name", why: null };
  if (matches.length === 0) return { name: null, basis: null, why: `no ${fixture} PDF` };
  /* Several PDFs carry the role and none is declared under the bare role label.
   * That is not the same as the builder declaring none: a family that ships one
   * packet per variant labels every row with a variant label. Ask for the declared
   * complete outputs of this role before refusing.
   *
   * The row's primary is the FIRST one declared -- declaration order, which is the
   * order declaredFixture already documents for the bare-label case, and
   * deliberately not whichever name sorts first. The primary is only the row's
   * pinned canonicalPdfSha256; the row renders every one of them and coverage is
   * asked of the whole set. This branch is reached only where the generator
   * previously recorded the family as ineligible, so it can add a family to the
   * matrix and can never restate one already in it. */
  const declaredComplete = (declaredCompleteOutputs(dir, root)?.named.get(fixture) ?? []).filter((n) => pdfs.includes(n));
  if (declaredComplete.length) {
    return {
      name: declaredComplete[0],
      basis: `the builder declares ${declaredComplete.length} complete ${fixture} output(s) in reports/rendered-artifacts.json (${declaredComplete.join(", ")}); this row pins the first declared as its primary and renders all of them`,
      why: null,
    };
  }
  return {
    name: null, basis: null,
    why: `${matches.length} PDFs could be the ${fixture} fixture (${matches.join(", ")}) and the builder declares none — refusing to guess which one the receipt would describe`,
  };
};

/*
 * WHAT A FAMILY DECLARES AS A COMPLETE OUTPUT, ASKED OF THE FAMILY'S OWN REPORT.
 *
 * Three families were read wrongly, and all three for the same reason: the only
 * question this generator ever put to a declaration was a.fixture === "canonical",
 * over the artifacts and pdfs arrays only. A builder that ships one packet per variant labels
 * its rows "canonical--felony" or "canonical-misdemeanor_5yr", never the bare role,
 * so the exact match found nothing, pickFixture fell through to its several-matches
 * refusal, and al-trafficking-set, ne-seal-pre2017-set and rcap-or-official-pdf-fill
 * were recorded as ineligible for "the builder declares none". Each of them declares
 * all of them. Fourteen complete PDFs -- 44 Alabama pages, 30 Nebraska, 36 Oregon --
 * had never been enrolled in the visual gate, and the queue read as complete while
 * saying only that it had refused to guess.
 *
 * So the declaration is asked three things instead of one:
 *
 *   1. WHICH ROLE a declared row is. Preferring an explicit fixtureClass/role key
 *      where the builder writes one (Nebraska does), and otherwise reading the role
 *      off the FIXTURE LABEL the builder chose -- "canonical", or a variant label
 *      built on it. That label is declaration content, written by the builder to
 *      name the row; it is not the filename, and nothing here reads one.
 *
 *   2. WHICH FILES are complete outputs of that role: the file of each such row.
 *      Alabama's four, Nebraska's six, Oregon's four.
 *
 *   3. WHICH FILES the declaration mentions AT ALL, under any key, complete output
 *      or not. Oregon needs this: it carries a motionFile beside each file, and the
 *      motion-and-declaration PDF is a component of the nine-page packet rather than
 *      the packet. Without question 3 the gate would enrol eight Oregon PDFs and
 *      call four of them complete packets, which is the same overclaim in a new place.
 *
 * The two rules that govern how the answers are USED are in declaredSelection below,
 * and they exist because getting this wrong has already cost receipts twice.
 */
const ROLE_LABELS = ["canonical", "boundary"];

const reportCache = new Map();
const familyReport = (dir) => {
  if (reportCache.has(dir)) return reportCache.get(dir);
  const p = path.join(dir, "reports", "rendered-artifacts.json");
  let doc = null;
  try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { doc = null; }
  reportCache.set(dir, doc);
  return doc;
};

/* The role of a declared row, from what the builder WROTE, in this order: an
 * explicit role-class key, then the bare fixture label, then a variant label built
 * on a role ("canonical--felony", "canonical-misdemeanor_5yr"). A label that names
 * no role returns null and the row is not treated as a fixture at all. */
const declaredRoleOf = (row) => {
  for (const key of ["fixtureClass", "fixtureRole"]) {
    if (ROLE_LABELS.includes(row?.[key])) return row[key];
  }
  if (ROLE_LABELS.includes(row?.role)) return row.role;
  const label = row?.fixture;
  if (typeof label !== "string") return null;
  return ROLE_LABELS.find((r) => label === r || label.startsWith(r + "-")) ?? null;
};

/* Every PDF path the report mentions anywhere, at any depth, under any key. This is
 * deliberately indiscriminate: its only job is to answer "does the declaration
 * account for this file", and a file named under motionFile, components[].file or
 * anywhere else is accounted for. */
const pdfPathsMentioned = (node, out = new Set()) => {
  if (typeof node === "string") { if (node.toLowerCase().endsWith(".pdf")) out.add(node); return out; }
  if (Array.isArray(node)) { for (const v of node) pdfPathsMentioned(v, out); return out; }
  if (node && typeof node === "object") { for (const v of Object.values(node)) pdfPathsMentioned(v, out); return out; }
  return out;
};

const declarationCache = new Map();
const declaredCompleteOutputs = (dir, root) => {
  const key = dir + " :: " + root;
  if (declarationCache.has(key)) return declarationCache.get(key);
  const doc = familyReport(dir);
  const named = new Map(ROLE_LABELS.map((r) => [r, []]));
  const mentioned = new Set();
  let result = null;
  if (doc) {
    const seen = new Set();
    for (const container of ["artifacts", "pdfs", "packets"]) {
      for (const row of Array.isArray(doc[container]) ? doc[container] : []) {
        const role = declaredRoleOf(row);
        if (!role || typeof row?.file !== "string") continue;
        const abs = resolveDeclared(dir, row.file);
        if (!abs) continue;
        const name = POSIX(path.relative(root, abs));
        if (seen.has(role + " :: " + name)) continue;
        seen.add(role + " :: " + name);
        named.get(role).push(name);
      }
    }
    for (const p of pdfPathsMentioned(doc)) {
      const abs = resolveDeclared(dir, p);
      if (abs) mentioned.add(POSIX(path.relative(root, abs)));
    }
    if ([...named.values()].some((v) => v.length)) result = { named, mentioned };
  }
  declarationCache.set(key, result);
  return result;
};

/* What the fixtures listing finds for a role. Unchanged behaviour, named once so the
 * document set and the coverage statement cannot drift apart. */
const discoveredForRole = (pdfs, role) =>
  pdfs.includes(role + ".pdf") ? [role + ".pdf"] : pdfs.filter((x) => x.includes(role));

/*
 * THE DECLARED SET, SUBJECT TO TWO RULES THAT PROTECT STANDING RECEIPTS.
 *
 * A documentsDigest hashes the row's documents IN ORDER, so a reader that lets a
 * declaration decide the ORDER restates sets that have not changed and invalidates
 * every receipt over them. And a declaration that omits a delivered PDF is a gap in
 * the declaration, not permission to stop measuring the PDF: dc_seal_conviction-set
 * ships four fixtures on disk, and reading a declaration as an exhaustive list once
 * cut it to two while both variants had been rendering and passing.
 *
 * So:
 *
 *   ORDER IS NEVER THE DECLARATION'S. The listing's order is kept exactly. The
 *   declaration selects; it does not sort. A family whose declared set is what the
 *   listing already found gets a byte-identical document list and keeps its receipt,
 *   which is the case for every family already in the queue.
 *
 *   NARROWING REQUIRES THE DECLARATION TO ACCOUNT FOR WHAT IT DROPS. A discovered
 *   PDF is dropped only where the declaration names that exact file somewhere and
 *   classifies it as something other than a complete output of this role -- Oregon's
 *   motionFile. Where the declaration is SILENT about a discovered PDF, the file
 *   stays in the set and keeps being measured, because silence is a gap.
 *
 * And one exemption, which the measurement found rather than the reasoning:
 *
 *   A FAMILY THAT SHIPS AN ASSEMBLED <role>.pdf IS NOT SELECTED FROM AT ALL. Some
 *   hosts put the bare role label on rows that are not the assembled packet.
 *   wa_vac_felony-set declares its four per-form filled COMPONENTS as fixture
 *   "canonical" and "boundary" and keeps the assembled canonical.pdf under a
 *   different key entirely, so selecting on that declaration replaced a standing
 *   Washington row with two components and dropped the family out of the live matrix.
 *   An assembled packet needs no help being identified -- the listing names it
 *   exactly -- so where one exists the listing decides alone, and this reader stays
 *   confined to the multi-variant families with no assembled packet that are the
 *   reason it exists.
 */
const declaredSelection = (discovered, declaration, role, pdfs) => {
  if (pdfs.includes(role + ".pdf")) return discovered;
  const complete = declaration?.named.get(role) ?? [];
  if (!complete.length) return discovered;
  const everyDiscoveredFileIsAccountedFor = discovered.every((n) => declaration.mentioned.has(n));
  return everyDiscoveredFileIsAccountedFor
    ? discovered.filter((n) => complete.includes(n))
    : discovered;
};

/* A declared complete output of this role that the listing did not name for it. It is
 * enrolled LAST -- after the listing's order and after the conditional branches -- so
 * that enrolling it can never restate the order of a set already under receipt.
 * nc_146_dismissal_petition-set is why: its four conditional branch PDFs are declared
 * in one order and merged in another, and letting the declaration place them cost the
 * family its RASTER_PASS for a set that had not changed by one file. */
const declaredButNotDiscovered = (declaration, role, pdfs) =>
  pdfs.includes(role + ".pdf")
    ? []
    : (declaration?.named.get(role) ?? []).filter((n) => pdfs.includes(n));

const previous = fs.existsSync(path.join(ROOT, OUT)) ? read(OUT) : { rows: [] };
/* A temporarily ineligible family cannot stay in the live render matrix, but
 * its old hash-bound receipt is still evidence about the bytes it names. Keep
 * the full prior row in history, and consult that history if the family later
 * becomes eligible again. */
const priorByFamily = new Map([
  ...(previous.historicalRasterRows ?? []),
  ...(previous.rows ?? []),
].map((r) => [r.familyId, r]));
let carried = 0, invalidated = 0;
/*
 * THE RECEIPT MUST NOT CLAIM MORE COVERAGE THAN THE ROW MEASURED.
 *
 * coverageOf above already fixed this overclaim for the row: a receipt that
 * said it covered the whole family while the gate rendered only the canonical
 * document is how an orphan page in an Oklahoma boundary fixture and a split
 * contact block in eleven North Dakota PDFs survived a green gate. The row now
 * names what went unrendered.
 *
 * The RECEIPT never got the same treatment. It is ingested once and carried
 * forward verbatim, so 141 live rows still carried `coversTheWholeFamily: true`
 * beside `documentsNotCovered: []` and `whatThisGateDidNotRender: []` while the
 * row beside them named boundary.pdf as unrendered. A verification lane found
 * the two records contradicting each other on ms-nonconv-set and failed the
 * family for it, which is the right outcome and would have recurred on any of
 * the other 140 the moment someone read them side by side.
 *
 * So the carried receipt's coverage claims are re-derived from the row's own
 * measured coverage on every generation. Nothing else in the receipt is
 * touched: the run, the job, the rendered commit, the bound digests, the
 * verdict and the canary precondition are the gate's own record and are carried
 * exactly as ingested. The pre-reconciliation claim is kept beside it, because
 * what a receipt once said is part of the record.
 */
const reconcileReceiptCoverage = (receipt, row) => {
  const cov = row.coverage;
  if (!receipt || !cov) return receipt;
  const wasClaimed = {
    coversTheWholeFamily: receipt.coversTheWholeFamily ?? null,
    documentsCovered: receipt.documentsCovered ?? null,
    documentsNotCovered: receipt.documentsNotCovered ?? null,
    whatThisGateDidNotRender: receipt.whatThisGateDidNotRender ?? null,
  };
  /*
   * coversTheWholeFamily STAYS, and is re-derived rather than deleted.
   * generate-rcap-grade-a-fulfillment-authority.mjs requires it true before a
   * family carries fulfillment authority, so removing it would fail that gate
   * closed for every family — a far worse outcome than the ambiguity being
   * fixed. Its honest value is the row's own `complete`: every canonical
   * document rendered. What made it read as more than that was the empty
   * documentsNotCovered beside it, and that is what changes here.
   */
  /*
   * A frozen history row from before coverageOf learned to name unrendered
   * fixtures has no notRenderedByThisGate key at all. Writing [] there would
   * assert a measurement that row never made — the same overclaim in a new
   * place — so the absence is named instead of filled in.
   */
  const measuredTheEdge = Object.hasOwn(cov, "notRenderedByThisGate");
  const unrendered = measuredTheEdge ? (cov.notRenderedByThisGate ?? []) : null;
  const reconciled = {
    ...receipt,
    coversTheWholeFamily: cov.complete === true,
    everyCanonicalDocumentRendered: cov.complete === true,
    documentsCovered: cov.rastered ?? receipt.documentsCovered ?? [],
    /*
     * TWO DIFFERENT QUESTIONS, AND THEY MUST NOT BE MERGED.
     *
     * documentsNotCovered means "a canonical document this gate was asked for
     * and did not render" — evaluateAcceptance fails a row outright on a
     * non-empty list, and rightly so. whatThisGateDidNotRender means "a
     * declared fixture this gate never renders by design", which is the
     * boundary artifact on nearly every family. Filling the first from the
     * second demoted de_mandatory_expungement-set out of GUIDANCE_READY for
     * having an ordinary boundary fixture. So notRastered feeds the first and
     * notRenderedByThisGate the second, and the sentence beside them says which
     * is which.
     */
    documentsNotCovered: cov.notRastered ?? receipt.documentsNotCovered ?? [],
    ...(measuredTheEdge
      ? { whatThisGateDidNotRender: unrendered, whatCompleteMeansHere: cov.whatCompleteMeansHere }
      : {
        whatThisGateDidNotRender: null,
        whatCompleteMeansHere: "unknown for this row: it was frozen into history before the queue measured which declared fixtures a gate leaves unrendered, so an empty list here would be an assertion it never made. Read it as every canonical document rendered and the edge of the gate unrecorded.",
      }),
    coverageBasis: cov.basis,
  };
  const drifted = JSON.stringify(wasClaimed.documentsNotCovered) !== JSON.stringify(reconciled.documentsNotCovered)
    || JSON.stringify(wasClaimed.whatThisGateDidNotRender) !== JSON.stringify(reconciled.whatThisGateDidNotRender)
    || wasClaimed.coversTheWholeFamily !== reconciled.coversTheWholeFamily;
  if (drifted) reconciled.theTwoCoverageQuestions = "documentsNotCovered names canonical documents this gate was asked for and did not render. whatThisGateDidNotRender names declared fixtures it never renders by design, which is normally the boundary artifact. An empty documentsNotCovered beside a populated whatThisGateDidNotRender is the ordinary, correct shape.";
  if (drifted) {
    reconciled.coverageReconciledFromTheRow = {
      why: "the ingested receipt claimed a coverage the row does not measure; the row is the measurement and the receipt is a record of one run",
      wasClaimed,
    };
  }
  return reconciled;
};
const carryVerdict = (row) => {
  const prior = priorByFamily.get(row.familyId);
  if (!prior?.rasterReceipt) {
    return (prior?.supersededReceipts ?? []).length
      ? { ...row, supersededReceipts: prior.supersededReceipts }
      : row;
  }
  /* A receipt describes the document set that was rendered. If the row now asks
   * for a different set -- which is exactly what happens when a family that was
   * rendering one of its two canonical documents starts rendering both -- the
   * old receipt no longer describes this row and carrying it forward would
   * launder a partial verdict into a complete one. */
  /*
   * A row written before the document set existed carries no documentsDigest.
   * Comparing null against the new digest invalidated all 47 receipts on the
   * first run, including the 36 whose set is exactly the pair they already
   * rendered -- the receipts were preserved, but 36 families would have been
   * re-rendered to prove what was already proven. So an absent prior digest is
   * answered by asking whether the new set IS that legacy pair.
   */
  const legacyPairUnchanged = () => {
    const docs = row.documents ?? [];
    if (docs.length !== 2) return false;
    const c = docs.find((d) => d.role === "canonical");
    const b = docs.find((d) => d.role === "boundary");
    return Boolean(c && b)
      && c.path === prior.canonicalPdfPath && c.sha256 === prior.canonicalPdfSha256
      && b.path === prior.boundaryPdfPath && b.sha256 === prior.boundaryPdfSha256;
  };
  const setUnchanged = prior.documentsDigest
    ? prior.documentsDigest === row.documentsDigest
    : legacyPairUnchanged();
  const same = prior.canonicalPdfSha256 === row.canonicalPdfSha256
    && prior.boundaryPdfSha256 === row.boundaryPdfSha256
    && setUnchanged;
  if (!same) {
    invalidated++;
    /* Keep the superseded verdict. It was true of the bytes it named and the
     * set it covered, and discarding it destroys the record of what the gate
     * had already established. */
    return { ...row, supersededReceipts: [...(prior.supersededReceipts ?? []), {
      ...prior.rasterReceipt,
      supersededBecause: (prior.documentsDigest ?? null) !== row.documentsDigest
        ? "the row now renders a different set of documents"
        : "the pinned bytes changed",
      supersededAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    }] };
  }
  /*
   * The central gate is the acceptance workflow, and a receipt is only a
   * RASTER_PASS for this queue when a workflow run is bound to it. A pass
   * recorded from a local runner (executionEnvironment says so, workflowRunId
   * is null) is real evidence of what that runner saw and is kept, but it does
   * not satisfy the gate: the row stays RASTER_PENDING so the workflow can be
   * dispatched for it, and the local pass travels beside it as
   * localRasterEvidence. Nothing here widens what a RASTER_PASS means; it
   * narrows what may be called one.
   */
  if (prior.rasterReceipt && !prior.rasterReceipt.workflowRunId) {
    carried++;
    return {
      ...row,
      currentRasterState: "RASTER_PENDING",
      localRasterEvidence: prior.rasterReceipt,
      ...((prior.supersededReceipts ?? []).length ? { supersededReceipts: prior.supersededReceipts } : {}),
    };
  }
  carried++;
  return {
    ...row,
    currentRasterState: prior.currentRasterState,
    nextOwner: prior.nextOwner,
    rasterReceipt: reconcileReceiptCoverage(prior.rasterReceipt, row),
    ...((prior.supersededReceipts ?? []).length ? { supersededReceipts: prior.supersededReceipts } : {}),
  };
};

for (const f of master.families) {
  const dir = f.directory ? path.join(ROOT, f.directory) : null;
  const rel = f.directory ?? null;
  const prepared = dir && fs.existsSync(dir)
    ? await resolveMiMoRasterEnrollment(f) ?? await resolveIaForm1RasterEnrollment(f) : null;
  const found = prepared ?? (dir && fs.existsSync(dir) ? fixturesOf(dir) : { root: null, pdfs: [], basis: null });
  const fixtures = found.root;
  const eligibility = [];

  if (!rel || !fs.existsSync(dir)) eligibility.push("no overlay directory");
  else if (!fixtures) eligibility.push("no fixtures directory");

  let canonical = null; let boundary = null; let documents = null;
  if (fixtures) {
    const pdfs = found.pdfs;
    const c = prepared?.canonical ?? pickFixture(dir, fixtures, "canonical", pdfs);
    const b = prepared?.boundary ?? pickFixture(dir, fixtures, "boundary", pdfs);
    canonical = c.name; boundary = b.name;
    if (!canonical) eligibility.push(c.why);
    if (!boundary) eligibility.push(b.why);
    fixtureBasis.set(f.familyId, { canonical: c.basis, boundary: b.basis });
    if (canonical && boundary) {
      /* Read the set the row would render before deciding the family may be
       * queued, so a document the parser cannot open refuses the family here
       * rather than aborting the render job that was dispatched to prove it. */
      documents = prepared?.documents ?? await documentSet(dir, fixtures, pdfs);
      const unreadable = documents.filter((d) => d.pageCount === null).map((d) => d.name);
      if (unreadable.length) {
        eligibility.push(`${unreadable.length} of ${documents.length} queued document(s) have neither a parser-readable page count nor a hash-bound builder count, so "every page rendered" cannot be proven about them: ${unreadable.join(", ")}`);
      }
    }
  }

  // The four preconditions, each asked of a record rather than assumed.
  if (f.state === "SOURCE_BLOCKED") eligibility.push("sources do not bind");
  if (f.state === "SOURCE_READY") eligibility.push("packet build has not completed");
  if (f.state === "BUILD_IN_PROGRESS") eligibility.push("packet build is still in progress");
  if (f.state === "FAIL_REPAIR_REQUIRED") eligibility.push("the current failed obligations have not been repaired");
  if (f.state === "LEGAL_BLOCKED") eligibility.push("an open legal input");
  const comp = f.counters ?? null;
  const nonVisual = comp
    ? Object.entries(comp).filter(([k, v]) => !/visual/i.test(k) && Number(v) > 0).map(([k]) => k)
    : null;
  if (comp && nonVisual.length) eligibility.push(`nonvisual completeness counters not zero: ${nonVisual.join(", ")}`);
  if (!comp) eligibility.push("no completeness audit");

  if (eligibility.length) { notEligible.push({ familyId: f.familyId, why: eligibility }); continue; }

  const cPath = path.join(fixtures, canonical);
  const bPath = path.join(fixtures, boundary);
  const pdfsHere = found.pdfs;
  const canonicalSelection = declaredSelection(
    discoveredForRole(pdfsHere, "canonical"), declaredCompleteOutputs(dir, fixtures), "canonical", pdfsHere);
  const coverage = prepared?.coverage ?? coverageOf(pdfsHere, "canonical", documents.filter((x) => x.role === "canonical").map((x) => x.name), documents, canonicalSelection);
  const primaryCanonical = documents.find((d) => d.role === "canonical" && d.name === canonical);
  if (!primaryCanonical) {
    notEligible.push({
      familyId: f.familyId,
      why: [`the selected canonical fixture ${canonical} is not present in the declared canonical document set`],
    });
    continue;
  }
  rows.push({
    familyId: f.familyId,
    packetCommitSha: packetCommit,
    canonicalPdfPath: path.relative(ROOT, cPath),
    canonicalPdfSha256: sha256(cPath),
    boundaryPdfPath: path.relative(ROOT, bPath),
    boundaryPdfSha256: sha256(bPath),
    expectedPages: primaryCanonical.pageCount,
    fixtureSelection: fixtureBasis.get(f.familyId) ?? null,
    /* Every document this row renders. canonicalPdfPath/boundaryPdfPath above
     * remain the primary pair -- other checks read them -- but they are no
     * longer the whole job. */
    documents,
    documentsDigest: documentsDigestOf(documents),
    coverage,
    requestedScale: REQUESTED_SCALE,
    builderAssignment: builderOf.get(f.familyId) ?? null,
    currentRasterState: "RASTER_PENDING",
    nextOwner: null
  });
}

/*
 * Captain-recorded facts survive regeneration too, not only the row verdicts.
 *
 * The first carry-forward saved the 25 receipts and still lost everything
 * around them: the RASTER_LOCAL_PENDING_CENTRAL vocabulary entry and its
 * semantics, the workflowReachability record of how the gate reached the
 * default branch, and the lastBatch history of run 33488713831. None of that
 * is derivable from the tree, and under the no-idle rule this generator runs
 * every integration cycle, so losing it once means losing it repeatedly.
 *
 * Only additive keys are carried. Anything the generator computes -- rows,
 * counts, byLane, the pinned commit -- is left to the generator, so a carried
 * key can never mask a stale measurement.
 */
const CARRIED_KEYS = [
  "rasterStateSemantics", "workflowReachability", "lastBatch",
  "whatRasterPassDoesNotMean", "grantsNothing",
];
const carriedRows = rows.map(carryVerdict);
rows.length = 0;
rows.push(...carriedRows);
rows.sort((a, b) => a.familyId.localeCompare(b.familyId));
// Nonoverlapping batches, round-robin so a slow family does not concentrate in
// one lane. One family, one lane: a second claim would be two readers writing
// one verdict.
rows.forEach((r, i) => { r.nextOwner = LANES[i % LANES.length]; });

const liveFamilyIds = new Set(rows.map((r) => r.familyId));
const historicalByFamily = new Map((previous.historicalRasterRows ?? []).map((r) => [r.familyId, r]));
for (const prior of previous.rows ?? []) {
  if (liveFamilyIds.has(prior.familyId) || (!prior.rasterReceipt && !(prior.supersededReceipts ?? []).length)) continue;
  historicalByFamily.set(prior.familyId, {
    ...prior,
    movedToHistoryBecause: "the family is not eligible for the current raster matrix; the receipt remains true only of the exact bytes and coverage it names",
  });
}
for (const id of liveFamilyIds) historicalByFamily.delete(id);
const currentIneligibility = new Map(notEligible.map((r) => [r.familyId, r.why]));
const historicalRasterRows = [...historicalByFamily.values()]
  .map((r) => {
    const { packetCommitSha, historicalPacketCommitSha, ...evidence } = r;
    return {
      ...evidence,
      /* This is evidence history, not this dispatch's pin. Naming it as a
       * packetCommitSha would make the convergence checker correctly read two
       * active dispatch pins from one generated manifest. */
      historicalPacketCommitSha: historicalPacketCommitSha ?? packetCommitSha ?? null,
      historicalOnly: true,
      currentGateAuthority: false,
      /* A row in history is still read — a verification lane read exactly this
       * one on ms-nonconv-set and failed the family because the receipt here
       * claimed a coverage the row beside it did not measure. Leaving history
       * uncorrected would keep every such contradiction in place for the next
       * reader, so the same reconciliation the live rows get is applied here.
       * The row's own measured coverage travels with it into history, so this
       * needs nothing the record does not already hold. */
      ...(evidence.rasterReceipt ? { rasterReceipt: reconcileReceiptCoverage(evidence.rasterReceipt, evidence) } : {}),
      currentIneligibility: currentIneligibility.get(r.familyId) ?? ["not present in the current live raster matrix"],
    };
  })
  .sort((a, b) => a.familyId.localeCompare(b.familyId));

const byLane = Object.fromEntries(LANES.map((l) => [l, rows.filter((r) => r.nextOwner === l).map((r) => r.familyId)]));
const duplicated = rows.map((r) => r.familyId).filter((x, i, a) => a.indexOf(x) !== i);
if (duplicated.length) { console.error(`REFUSED: ${duplicated.length} famil(ies) queued twice: ${duplicated.slice(0, 5).join(", ")}`); process.exit(1); }

// Additive Captain facts, restored onto the freshly computed document. Spread
// FIRST so nothing carried can shadow a value this run measured.
const carriedMeta = Object.fromEntries(
  CARRIED_KEYS.filter((k) => previous[k] !== undefined).map((k) => [k, previous[k]])
);
// The vocabulary is a union: the generator's closed list plus any state a
// Captain declared, so a declared state is never silently un-declared.
const carriedVocabulary = [...new Set([...(previous.rasterStateVocabulary ?? []), ...RASTER_STATES])];

const doc = {
  ...carriedMeta,
  schemaVersion: "rcap-raster-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs",
  packetCommitSha: packetCommit,
  /*
   * WHAT packetCommitSha IS, AND WHAT IT IS NOT.
   *
   * It is `git rev-parse HEAD` AT THE MOMENT THIS QUEUE WAS GENERATED. It is
   * NOT the commit a raster run rendered, and it does NOT bind the bytes any
   * row describes -- those are bound by the row's own canonicalPdfSha256 and
   * boundaryPdfSha256, and by the renderedCommitSha the receipt itself records.
   *
   * The name reads like a byte binding and two admission lanes in a row have
   * reported it as stale for exactly that reason: run 34418960259 rendered
   * deead9f25 against rows carrying 90eab8052, and run 34428745884 rendered
   * 8d49da424 against rows carrying 60e02b0a9. Both times the fixtures were
   * byte-identical at both commits so nothing turned on it, and both times the
   * lane was right to record it rather than rely on it.
   *
   * The value is correct for what it measures and the field is left alone. What
   * was missing is this sentence, so that a reader binding a receipt to a
   * commit reaches for renderedCommitSha instead.
   */
  packetCommitShaIsAGenerationStampNotAByteBinding: "This field records when the queue was written, not what a raster rendered. Bind a receipt with the row's canonicalPdfSha256 and boundaryPdfSha256 and with the receipt's own renderedCommitSha. A queue regenerated after a run will carry a newer commit than the run that produced its receipts, and that is not drift.",
  whyThisExists: "The Codex container cannot resolve or fetch a Chromium (ENV-RAS01: Playwright CDN answers HTTP 403), so the visual gate is unreachable from where packets are built. The render moves to a browser-equipped GitHub runner. Nothing about PASS_COMPLETE is weakened.",
  rasterStateVocabulary: carriedVocabulary,
  entryPreconditions: [
    "source binding passes",
    "packet components exist",
    "canonical and boundary PDFs exist",
    "nonvisual completeness checks pass"
  ],
  /* How "the PDFs exist" is decided, stated because it used to be decided
   * wrongly and silently: the listing read only the root of fixtures/, so a
   * family that keeps its fixtures one directory deeper was recorded as having
   * none. See DF-003. */
  fixtureDiscovery: {
    root: "the family's fixtures/ directory where it exists; otherwise, for a family that keeps none, the family directory with its fixtures located by the files its builder declares as fixtures in reports/rendered-artifacts.json",
    listing: "recursive, and each PDF is named relative to that root, so a role carried by a variant directory name is preserved rather than discarded",
    whyItMatters: "a family whose fixtures are not found never enters the queue, never earns a RASTER_PASS and can never be PASS_COMPLETE, and the queue reads as complete while saying nothing about what it declined to enrol",
    grantsNothing: "finding a fixture queues a render. It renders nothing, proves nothing, and promotes nothing.",
  },
  whatTheVisualGateStillProves: [
    "every page rendered",
    "no page is blank",
    "expected dimensions for the requested PDF-point scale",
    "no clipped write",
    "no overlapping participant text",
    "no placeholder text",
    "no protected-field ink",
    "artifact hashes match the submitted PDFs"
  ],
  builtRasterPending: {
    state: "BUILT_RASTER_PENDING",
    meaning: "packet construction is finished and the visual gate has not run",
    isNotALaunchVerdict: true,
    doesNotZeroOrWaive: "visualDefects stays whatever it is; BUILT_RASTER_PENDING records that nobody has looked, not that there is nothing to see",
    noPassCompleteWithout: "RASTER_PASS"
  },
  routing: {
    RASTER_PASS: "the family goes to independent verification",
    RASTER_FAIL: "the family goes to FIX",
    RASTER_BLOCKED_ENVIRONMENT: "the runner could not render at all; this is an environment defect and not a packet defect, and it never becomes RASTER_FAIL"
  },
  workflow: WORKFLOW,
  /*
   * The gate is correct and it is not yet reachable, which is a different thing
   * from working and must not be recorded as the same.
   *
   * GitHub dispatches a workflow_dispatch workflow only from the DEFAULT
   * branch. It landed on main (the raster infra PR merged and the canary ran),
   * so reachability is now MEASURED here rather than asserted: the recorded
   * state is true only while `git cat-file -e origin/main:<workflow>` passes,
   * and goes back to unreachable-with-consequence the moment it does not.
   */
  workflowReachability: (() => {
    const wf = ".github/workflows/rcap-packet-raster-acceptance-batch.yml";
    let onMain = false;
    try { execFileSync("git", ["cat-file", "-e", `origin/main:${wf}`], { cwd: ROOT, stdio: "ignore" }); onMain = true; } catch { /* measured as absent */ }
    return {
      dispatchableFrom: "the repository default branch only, which is how GitHub scopes workflow_dispatch",
      defaultBranch: "main",
      presentOnDefaultBranch: onMain,
      observed: onMain
        ? `origin/main carries ${wf}; dispatched batches have returned receipts (e.g. run 33495068504, whose complete-coverage RASTER_PASS receipts the VF26 verdicts bind to)`
        : `origin/main does not carry ${wf}`,
      consequence: onMain
        ? "RASTER_PASS is obtainable: dispatch from main with the full 40-hex commit SHA of the pushed head. PASS_COMPLETE still requires a hash-bound complete-coverage receipt plus an independent read; reachability waives neither."
        : "No family can obtain a RASTER_PASS until this workflow lands on main. PASS_COMPLETE requires one, so no family can reach PASS_COMPLETE until then.",
      whatThisIsNot: "This is not a defect in the gate and not a reason to relax it.",
      whoDecides: "merging workflow changes to the default branch is Roger's decision"
    };
  })(),
  maxParallel: 20,
  lanes: LANES,
  counts: {
    queued: rows.length,
    byLane: Object.fromEntries(LANES.map((l) => [l, byLane[l].length])),
    byState: Object.fromEntries(RASTER_STATES.map((s) => [s, rows.filter((r) => r.currentRasterState === s).length])),
    notEligible: notEligible.length
  },
  byLane,
  rows,
  historicalRasterRows,
  historicalRasterRowCount: historicalRasterRows.length,
  // Named rather than counted, because "not eligible" hides the difference
  // between a family with no packet and a family with a failing counter.
  notEligible: notEligible.slice(0, 400),
  packetPdfsModified: 0,
  bodiesCommitted: 0,
  commercialRoutesOpened: 0,
  productionTouched: false,
  grantsNothing: "A RASTER_PASS proves the pages render as measured. It is one gate of several, it promotes nothing, and it opens no commercial route."
};

const promptFor = (lane) => {
  const fams = byLane[lane];
  const p = [];
  p.push(`# ${lane}`, "");
  p.push(`**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence`);
  p.push(`**Repository branch to select:** \`claude/legalease-sprint-captain-utucnw\``);
  p.push(`**Minimum required ancestor:** \`${packetCommit}\``);
  p.push(`**Execution contract:** \`docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md\` — read it before you start.`, "");
  p.push("> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.", ">",
    `> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**`,
    "> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**", "");
  p.push("## You do not render anything", "");
  p.push("There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.", "");
  p.push(`The rendering happens in \`${WORKFLOW}\` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.`, "");
  p.push(`## Your families (${fams.length})`, "");
  for (const f of fams) {
    const r = rows.find((x) => x.familyId === f);
    p.push(`### ${f}`, "");
    /*
     * NAME EVERY DOCUMENT THE JOB RENDERS, not the primary pair.
     *
     * This printed canonicalPdfPath and boundaryPdfPath and nothing else, which
     * was the whole row while a family was a pair. It has not been for some
     * time: nc_146_dismissal_petition-set renders ten documents,
     * dc_seal_conviction-set four, and al-trafficking-set, ne-seal-pre2017-set
     * and rcap-or-official-pdf-fill four, six and four. The row carries
     * `documents` and rcap-raster-batch.mjs renders each of them, so the gate
     * was right and the prompt was thin -- it told a reader to check two
     * documents of a receipt covering ten, and "every expected page has a PNG"
     * cannot be checked against a page count for one of them.
     */
    const docs = r.documents ?? [];
    if (docs.length > 2) {
      p.push(`- **${docs.length} documents**, and the receipt must cover every one of them:`);
      for (const d of docs) p.push(`  - ${d.role} \`${d.path}\` — \`${d.sha256}\` · ${d.pageCount ?? "unread"} page(s)`);
      p.push(`- the row pins \`${r.canonicalPdfPath}\` and \`${r.boundaryPdfPath}\` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered`);
    } else {
      p.push(`- canonical \`${r.canonicalPdfPath}\` — \`${r.canonicalPdfSha256}\``);
      p.push(`- boundary \`${r.boundaryPdfPath}\` — \`${r.boundaryPdfSha256}\``);
    }
    const pages = docs.length > 2
      ? docs.reduce((n, d) => n + (d.pageCount ?? 0), 0) || null
      : r.expectedPages;
    p.push(`- expected pages ${pages ?? "unread"}${docs.length > 2 ? " across all documents" : ""} · requested scale ${r.requestedScale}`);
    p.push(`- built by ${r.builderAssignment ?? "(no builder lane recorded)"}`, "");
  }
  p.push("## What you check, per family", "");
  p.push("1. The receipt names this run and this artifact, and the workflow run id is the one you were given.");
  p.push("2. **The hashes bind.** The receipt's canonical and boundary SHA-256 must equal the values above, exactly. A receipt that describes different bytes describes a different packet, and no amount of clean-looking rasters makes it this family's evidence.");
  p.push("3. Every expected page has a PNG.");
  p.push("4. No page is blank.");
  p.push("5. Dimensions match the requested PDF-point scale.");
  p.push("6. No clipped write, no overlapping participant text, no placeholder text, no protected-field ink.", "");
  p.push("All six, or the family is `RASTER_FAIL`. If the workflow could not render at all — no browser, a launch failure — that is `RASTER_BLOCKED_ENVIRONMENT` and **never** `RASTER_FAIL`: an environment that cannot look at the packet has said nothing about the packet.", "");
  p.push("## What you may write", "");
  p.push(`- \`data/rcap-grade-a/codex-cloud/${lane.toLowerCase()}-raster-evidence/**\` — and nothing else.`, "");
  p.push("## What you may not touch", "");
  p.push("- any packet PDF, overlay directory, build script or field map — you modify **no** packet bytes;");
  p.push(`- \`${OUT}\` — Captain writes the queue; you report and Captain records;`);
  p.push("- another RAS lane's evidence directory;");
  p.push("- anything in `private/`, any commercial route, any Production resource.", "");
  p.push("## One family's failure does not stop another", "");
  p.push("Write a row for every family you were assigned, `RASTER_PASS`, `RASTER_FAIL` or `RASTER_BLOCKED_ENVIRONMENT`, with the measurement behind it. A lane that returns fewer rows than it was assigned families has lost work silently.", "");
  p.push("## How you return", "");
  p.push("The diff is the return.", "", "```text",
    `LANE: ${lane}`, `FAMILIES ASSIGNED: ${fams.length}`,
    "RASTER_PASS:", "RASTER_FAIL:", "RASTER_BLOCKED_ENVIRONMENT:",
    "HASH MISMATCHES:", "PACKET PDFS MODIFIED: 0",
    "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO", "```", "");
  p.push("## What finishing does not do", "");
  p.push("A RASTER_PASS is one gate. It does not make a family PASS_COMPLETE, it does not promote anything, and it opens no commercial route.", "");
  return p.join("\n");
};

const EMIT = makeEmitter({ root: ROOT, check: CHECK, label: "raster queue" });
EMIT.emit(OUT, `${JSON.stringify(rasterStableObject(doc), null, 2)}\n`);
for (const l of LANES) EMIT.emit(`${PROMPTS}/${l}_PACKET_RASTER_EVIDENCE.md`, promptFor(l));
EMIT.sweep(PROMPTS, (n) => n.endsWith(".md"));
EMIT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${OUT} and ${LANES.length} raster prompts into ${PROMPTS}/`);
console.log(`  ${rows.length} queued (${rows.filter((r) => r.currentRasterState === "RASTER_PENDING").length} RASTER_PENDING) · ${notEligible.length} not eligible`);
for (const l of LANES) console.log(`    ${l}: ${byLane[l].length} famil(ies)`);


// Deterministic output representation only. Document hashes and acceptance predicates are unchanged.
function rasterStableObject(value) {
  if (Array.isArray(value)) return value.map(rasterStableObject);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, rasterStableObject(value[key])]));
  }
  return value;
}
