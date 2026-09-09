#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family
 * `tx_nd_automatic_misdemeanor_deferred-set`.
 *
 *   node scripts/build-census-v1-tx_nd_automatic_misdemeanor_deferred-set.mjs
 *
 * Texas, an order of nondisclosure under Government Code Section 411.072 that
 * the court should have issued automatically. Three declared components, three
 * held binaries:
 *
 *   recovery-letter-2       OCA Instructions and Model Letter for an Order of
 *                           Nondisclosure under Section 411.072, REV 2022-02.
 *   proposed-order-3        OCA Model Order of Nondisclosure under Section
 *                           411.072, REV 2022-02.
 *   fee-waiver-statement-4  Statement of Inability to Afford Payment of Court
 *                           Costs or an Appeal Bond, approved by the Supreme
 *                           Court of Texas in Misc. Docket No. 22-9090.
 *
 * THIS BUILD REFUSES, AND THE REASON IS IN THE THIRD BINARY
 *
 * The Statement of Inability cannot record two elections THIS ROUTE DETERMINES,
 * because its AcroForm makes them mutually exclusive:
 *
 *   item 3, page 3   "Are you represented by Legal Aid? Check only one box."
 *                    This packet is drafted for a self-represented filer, so the
 *                    answer is "I am not represented by legal aid."
 *   item 9, page 9   "Ability to Pay Court Costs. Check only one box."
 *                    This component IS the statement of inability, so the answer
 *                    is "I cannot afford to pay court costs."
 *
 * Both live in ONE radio field named `Group10` - one top-level field, four kid
 * widgets, export values Choice1..Choice4, two of them on page 3 and two on page
 * 9. A radio group holds one selection. Marking item 9 unmarks item 3 and the
 * other way round, so a filer can answer one question or the other and never
 * both, whatever tool they use.
 *
 * There are three ways past that and this lane takes none of them:
 *
 *   - declaring the two as participant elections would launder a route-determined
 *     election into the participant's lap to keep a counter at zero, which is the
 *     exact move the completeness contract exists to catch;
 *   - drawing marks into page content beside the widgets would put ink on a
 *     declaration sworn under penalty of perjury through a control the form does
 *     not provide;
 *   - editing the binary to split the field would change the structure of a form
 *     the Supreme Court of Texas approved, which is not a builder's act.
 *
 * Whether the Court's own published form carries this, or whether the copy held
 * at private/human-source-returns/TX/ was re-fielded by whoever returned it,
 * cannot be established from what is mounted here. Both readings make it a
 * source question rather than a build one.
 *
 * THREE MORE THINGS MEASURED HERE, SO THE NEXT LANE DOES NOT RE-SURVEY
 *
 *   1. The OCA model letter is AES-256 encrypted and pdf-lib cannot open it at
 *      all. The house pikepdf bridge opens it with an empty user password and
 *      saves a deterministic derivative - the same pattern
 *      scripts/build-census-v1-ca-1203-4-set.mjs records as
 *      "pikepdf.open(exact_source).save(derived_path, deterministic_id=True)".
 *      Two runs produce the identical digest. That component is buildable.
 *   2. The proposed order is a flat three-page document with no AcroForm at all,
 *      which the court completes. That component is buildable and needs no fill.
 *   3. The Statement of Inability carries three source-authored defaults that a
 *      build must clear rather than deliver: `Today` = "12/15/2022", on the line
 *      beneath a declaration under penalty of perjury, and the two computed
 *      totals `Value / Valor 11` and `Amount Cantidad 15`, both "0", which state
 *      that the filer owns nothing and spends nothing.
 *
 * Nothing is written. No overlay directory is created or touched, and all nine
 * completeness counters are null rather than zero, because a family that was not
 * built was not measured.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const FAMILY_ID = "tx_nd_automatic_misdemeanor_deferred-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/tx/tx-nd-automatic-misdemeanor-deferred-set--official-pdf-fill";
const ROUTE_KEYS = [
  "obligation:unit:TX:tx_nd_automatic_misdemeanor_deferred:tx-nd072-automatic-and-verification",
  "obligation:unit:TX:tx_nd_automatic_misdemeanor_deferred:tx-nd072-recovery-letter"
];
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const LETTER = "OCA Instructions and Model Letter for an Order of Nondisclosure under Section 411.072";
const ORDER = "OCA Model Order of Nondisclosure under Section 411.072";
const STATEMENT = "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond";

const SOURCES = Object.freeze({
  [LETTER]: {
    sourceId: `official-form:${LETTER}`,
    path: "STATES/TX/03_INSTRUCTIONS/TX__INSTRUCTIONS__TX-GC-411.072__instructions-for-petition-for-order-of-nondisclosure-under-411-072__REV-2022-02__EN.pdf",
    sha256: "ae4427a75eb7c10c33d8e8cd3c4dca2092a8a83237204ec72cdcfc8c504ba1c7",
    component: "recovery_letter", pageCount: 7
  },
  [ORDER]: {
    sourceId: `official-form:${ORDER}`,
    path: "STATES/TX/02_PACKET_FORMS/TX__FORM__TX-GC-411.072__order-of-nondisclosure-under-411-072__REV-2022-02__EN.pdf",
    sha256: "7e35a724b6de6aac1f0cc11296596377df19786e597090c73384c87fd067fa39",
    component: "proposed_order", pageCount: 3
  },
  [STATEMENT]: {
    sourceId: `official-form:${STATEMENT}`,
    path: "private/human-source-returns/TX/TX__STATEMENTOFINABILITYTOAFFORDPAYMENTOFCOURTCOSTSO.pdf",
    sha256: "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d",
    component: "fee_waiver_statement", pageCount: 12
  }
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = {};
  const failures = [];
  for (const [key, want] of Object.entries(SOURCES)) {
    const entry = (index.entries ?? []).find((row) => row.path === want.path);
    if (!entry) { failures.push({ sourceIdentity: want.sourceId, why: `no committed index entry at ${want.path}` }); continue; }
    if (entry.sha256 !== want.sha256) { failures.push({ sourceIdentity: want.sourceId, why: `the committed index pins ${entry.sha256}` }); continue; }
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) { failures.push({ sourceIdentity: want.sourceId, why: `the custody holding ${want.path} is not mounted here` }); continue; }
    const bytes = fs.readFileSync(absolute);
    const digest = sha256(bytes);
    if (digest !== want.sha256) { failures.push({ sourceIdentity: want.sourceId, why: `SHA-256 drift: the corpus binary hashes ${digest}` }); continue; }
    resolved[key] = { ...want, absolute, bytes, byteLength: bytes.length, custody: entry.custody };
  }
  return { resolved, failures };
}

/** The house pikepdf bridge, used exactly as the California builder records it. */
function pikepdfUnlock(source) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rcap-tx-")), "unlocked.pdf");
  const script = [
    "import sys, pikepdf",
    "with pikepdf.open(sys.argv[1]) as pdf:",
    "    encrypted = pdf.is_encrypted",
    "    pdf.save(sys.argv[2], deterministic_id=True)",
    "print('ENCRYPTED' if encrypted else 'NOT_ENCRYPTED')"
  ].join("\n");
  const status = execFileSync("python3", ["-c", script, source, out], { encoding: "utf8" }).trim();
  const bytes = fs.readFileSync(out);
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
  return { wasEncrypted: status === "ENCRYPTED", bytes, sha256: sha256(bytes), byteLength: bytes.length };
}

/** Every radio field of a document, with the page each of its widgets is on. */
async function radioGroupSpans(bytes) {
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const pages = pdf.getPages();
  const pageOf = (widget) => {
    for (let i = 0; i < pages.length; i += 1) {
      const annots = pages[i].node.Annots();
      if (annots && annots.asArray().some((ref) => pdf.context.lookup(ref) === widget.dict)) return i + 1;
    }
    return -1;
  };
  const rows = [];
  for (const field of form.getFields()) {
    if (field.constructor.name !== "PDFRadioGroup") continue;
    const widgets = field.acroField.getWidgets();
    rows.push({
      name: field.getName(),
      options: field.getOptions(),
      widgets: widgets.map((widget) => {
        const rect = widget.getRectangle();
        return { page: pageOf(widget), x: Number(rect.x.toFixed(1)), y: Number(rect.y.toFixed(1)) };
      })
    });
  }
  return rows;
}

async function sourceCarriedDefaults(bytes) {
  const pdf = await PDFDocument.load(bytes);
  const carried = [];
  for (const field of pdf.getForm().getFields()) {
    if (field.constructor.name !== "PDFTextField") continue;
    const value = field.getText();
    if (typeof value === "string" && value.trim() !== "") carried.push({ field: field.getName(), sourceCarriedValue: value });
  }
  return carried;
}

async function build() {
  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayDirectoryTouched: false,
      counters: null, countersAreNullBecause: "no family was built, so nothing was measured"
    };
  }

  /* 1. The letter: encrypted, and openable only through the pikepdf bridge. */
  const unlocked = pikepdfUnlock(resolved[LETTER].absolute);
  let pdfLibCanOpenTheLetterDirectly = true;
  try { await PDFDocument.load(resolved[LETTER].bytes); } catch { pdfLibCanOpenTheLetterDirectly = false; }
  const letterDerived = await PDFDocument.load(unlocked.bytes);
  const letterFields = letterDerived.getForm().getFields().length;

  /* 2. The order: flat, nothing to fill. */
  const orderDoc = await PDFDocument.load(resolved[ORDER].bytes);
  const orderFields = orderDoc.getForm().getFields().length;

  /* 3. The statement: the refusal. */
  const spans = await radioGroupSpans(resolved[STATEMENT].bytes);
  const group10 = spans.find((row) => row.name === "Group10") ?? null;
  const pagesSpanned = group10 ? [...new Set(group10.widgets.map((w) => w.page))].sort((a, b) => a - b) : [];
  const carried = await sourceCarriedDefaults(resolved[STATEMENT].bytes);

  const oneGroupTwoQuestions = group10 !== null && pagesSpanned.length > 1;

  const measurements = {
    recoveryLetter: {
      sourceId: SOURCES[LETTER].sourceId, sha256: resolved[LETTER].sha256,
      encryptedInTheCustody: unlocked.wasEncrypted,
      pdfLibCanOpenItDirectly: pdfLibCanOpenTheLetterDirectly,
      pikepdfDerivative: {
        createdBy: "pikepdf.open(exact_source).save(derived_path, deterministic_id=True)",
        openedWithEmptyUserPassword: true,
        sha256: unlocked.sha256, byteLength: unlocked.byteLength,
        pageCount: letterDerived.getPageCount(), acroFormFields: letterFields
      },
      buildable: true
    },
    proposedOrder: {
      sourceId: SOURCES[ORDER].sourceId, sha256: resolved[ORDER].sha256,
      pageCount: orderDoc.getPageCount(), acroFormFields: orderFields,
      buildable: true,
      note: "a flat proposed order the court completes; nothing on it is the participant's to fill"
    },
    feeWaiverStatement: {
      sourceId: SOURCES[STATEMENT].sourceId, sha256: resolved[STATEMENT].sha256,
      custody: resolved[STATEMENT].custody,
      radioGroups: spans,
      oneRadioGroupSpansTwoQuestions: oneGroupTwoQuestions,
      group10: group10 === null ? null : { ...group10, pagesSpanned },
      whyThatStops: oneGroupTwoQuestions
        ? "Group10 is one top-level radio field with four kid widgets. Two are item 3 on page 3 (\"Are you "
          + "represented by Legal Aid? Check only one box\") and two are item 9 on page 9 (\"Ability to Pay Court "
          + "Costs. Check only one box\"). This route determines both answers - a self-represented filer who cannot "
          + "afford court costs - and a radio group holds one selection, so the form cannot record both."
        : null,
      sourceCarriedDefaults: carried,
      whySourceCarriedDefaultsMatter:
        "`Today` carries 12/15/2022 on the line beneath a declaration made under penalty of perjury, and the two "
        + "computed totals carry \"0\", which read as a statement that the filer owns nothing and spends nothing. "
        + "A build must clear all three rather than deliver them; they are recorded here so the next lane does not "
        + "have to find them again.",
      buildable: false
    }
  };

  if (oneGroupTwoQuestions) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      routeKeys: ROUTE_KEYS, directory: OUT_REL, overlayDirectoryTouched: false,
      counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured. A zero here would be a claim about "
        + "a packet that does not exist.",
      failedSourceIdentities: [{
        sourceIdentity: SOURCES[STATEMENT].sourceId,
        why: measurements.feeWaiverStatement.whyThatStops
      }],
      componentsBuildable: ["recovery_letter", "proposed_order"],
      componentsBlocked: ["fee_waiver_statement"],
      whatWouldUnblockIt: [
        "a Statement of Inability binary whose item-3 and item-9 elections are separate AcroForm fields, or",
        "an owner determination that this packet may mark those two elections outside the form's own controls, or",
        "an owner determination that the fee-waiver component may be dropped from this family's declared set and "
          + "replaced by the $28 fee the OCA instructions name as its alternative"
      ],
      measurements,
      packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }

  return {
    familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
    overlayDirectoryTouched: false, counters: null,
    countersAreNullBecause: "no packet was built",
    why: "the measurement this refusal rests on did not reproduce; re-read the statement binary before building",
    measurements
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL };
