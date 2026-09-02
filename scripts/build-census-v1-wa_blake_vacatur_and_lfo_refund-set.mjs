#!/usr/bin/env node
// Washington route-obligation census-v1 packet builder.
//
// This file is the state-bounded implementation shared by the ten C11
// Washington entrypoints. It does not widen the repository's global mapping
// rules. Every PDF is pinned through the committed custody record and corpus
// index; every rectangle comes from the source content stream; and the
// source-specific write allowlist covers held participant and case facts.
// Participant-authored narratives, legal elections, signatures, execution
// dates, service certifications, prosecutor fields, and court findings remain
// untouched.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  extractPageGeometry,
  extractTextItems,
  groupIntoLines,
  normalizeHarvestedText
} from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { protectCategoryOf, regionProtectCategoryOf, resolveFact }
  from "./rcap-official-forms/rcap-field-semantics.mjs";
import { checkboxCandidates, strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFRawStream, decodePDFRawStream } = require("pdf-lib");

const ANCHOR_FAMILY = "wa_blake_vacatur_and_lfo_refund-set";
const FAMILY_IDS = new Set([
  ANCHOR_FAMILY,
  "wa_vac_cannabis-set",
  "wa_vac_domestic_violence-set",
  "wa_vac_felony-set",
  "wa_vac_homicide_victim_prostitution-set",
  "wa_vac_misdemeanor_ordinary-set",
  "wa_vac_substance_use_disorder-set",
  "wa_vac_survivor_felony-set",
  "wa_vac_survivor_misdemeanor-set",
  "wa_vac_treaty_fishing-set"
]);

const P2_FAMILY_IDS = [...FAMILY_IDS].filter((familyId) => familyId !== ANCHOR_FAMILY);
const P2_CONTROL_BASE = "33dfea59fe85b9dc86469d12e04fd65c51b480fa";
const P2_DISPATCH = "4d1408a40eeb77f51bdf18ba35a13db579b21129";
const P2_REPORT = "data/rcap-grade-a/wave-2/p2-wa-vacatur-completeness/rows.json";
const ZERO_COUNTERS = {
  knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0,
  incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0,
  invisibleWrites: 0, protectedWrites: 0, visualDefects: 0
};
const P2_COUNTERS_BEFORE = Object.fromEntries(P2_FAMILY_IDS.map((familyId) => {
  const felony = new Set(["wa_vac_felony-set", "wa_vac_survivor_felony-set"]).has(familyId);
  const cannabis = familyId === "wa_vac_cannabis-set";
  return [familyId, {
    ...ZERO_COUNTERS,
    knownRequiredFieldsMissing: cannabis ? 15 : felony ? 31 : 21,
    unclassifiedBlanks: cannabis ? 28 : felony ? 53 : 56
  }];
}));

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CUSTODY = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const OUT_ROOT = "data/rcap-all50/overlays/census-v1/wa";
const STRUCTURAL_CLASS = "flat_pdf";
const RASTER_DPI = 96;
// Helvetica's encoded glyph advance can exceed the fit helper's estimate at a
// boundary. Artifact proof caught the final glyph 7pt past a rule, so mapped
// boxes reserve a measured 14pt right-edge guard and boundary values must
// shrink further (or refuse) rather than cross the source rule.
const RIGHT_EDGE_GUARD = 14;

const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan",
  "participant.middle_name": "Avery",
  "participant.last_name": "Reyes",
  "participant.date_of_birth": "1991-04-17",
  "participant.street_address": "118 Maple Street",
  "participant.city": "Springfield",
  "participant.state": "WA",
  "participant.zip": "98101",
  "participant.city_state_zip": "Springfield, WA 98101",
  "participant.phone": "555-0142",
  "participant.email": "jordan.reyes@example.com",
  "participant.full_mailing_address": "118 Maple Street, Springfield, WA 98101",
  "matter.county": "Example County",
  "matter.county_or_city": "Example County",
  "matter.court": "Superior Court",
  "matter.court_prefix": "District",
  "matter.plaintiff_name": "State of Washington",
  "matter.case_number": "24-1-001234-1",
  "matter.conviction_date": "2020-06-15",
  "matter.local_law_enforcement_agency": "Example County Sheriff's Office",
  "matter.charge": "Example offense supplied for fit testing only",
  "matter.charges": [
    { count: "1", case_number: "24-1-001234-1", charge: "Theft in the Third Degree", statute: "9A.56.050" },
    { count: "2", case_number: "24-1-001234-1", charge: "Malicious Mischief in the Third Degree", statute: "9A.48.090" },
    { count: "3", case_number: "24-1-001234-1", charge: "Criminal Trespass in the Second Degree", statute: "9A.52.080" },
    { count: "4", case_number: "24-1-001234-1", charge: "Disorderly Conduct", statute: "9A.84.030" }
  ],
  "deterministic.filing_date": "2026-08-12"
};

const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran",
  "participant.first_name": "Alexandrina-Katharine",
  "participant.middle_name": "Montgomery-Vandenberg-Oyelaran",
  "participant.last_name": "Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, WA 98101-9999",
  "participant.zip": "98101-9999",
  "participant.phone": "555-0142 ext. 44821",
  "participant.full_mailing_address":
    "12345 Southwest Grandview Boulevard Northeast, Apartment 4321-B, Unincorporated Township of Long Hollow Crossing, WA 98101-9999",
  "matter.county": "Saint Bartholomew County",
  "matter.county_or_city": "Saint Bartholomew",
  "matter.local_law_enforcement_agency": "Saint Bartholomew and the Northern Reaches County Sheriff's Office",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201"
};

const write = (factId, effectiveLabel) => ({ factId, effectiveLabel });

// These rules are bound to the exact source hashes recorded by each family's
// source receipt. They describe actual terminal lines on the six Washington
// forms. The prior builder treated every measured horizontal rule as a field,
// including footer dividers and paragraph rules, while withholding the real
// participant/case cells. Keeping the source-specific identities here makes
// both decisions reviewable and prevents a future source revision from being
// silently interpreted through geometry from the old edition.
const SOURCE_FIELD_WRITES = {
  "CRRLJ-09.0800": {
    "p1-y558.70-x98.90": write("matter.court_prefix", "Type of Court"),
    "p1-y558.70-x414.23": write("matter.county_or_city", "County or City"),
    "p1-y531.79-x69.74": write("matter.plaintiff_name", "Plaintiff Name"),
    "p1-y356.69-x306.05": write("participant.full_legal_name", "Print Name"),
    "p1-y306.77-x155.06": write("participant.full_legal_name", "Declarant Name"),
    "p1-y288.17-x157.58": write("matter.conviction_date", "Offense Date"),
    "p1-y269.45-x160.58": write("matter.charges[0].count", "Count 1"),
    "p1-y269.45-x236.69": write("matter.charges[0].charge", "Offense 1"),
    "p1-y250.85-x160.58": write("matter.charges[1].count", "Count 2"),
    "p1-y250.85-x236.69": write("matter.charges[1].charge", "Offense 2"),
    "p1-y232.25-x160.58": write("matter.charges[2].count", "Count 3"),
    "p1-y232.25-x236.69": write("matter.charges[2].charge", "Offense 3"),
    "p1-y194.90-x185.66": write("participant.date_of_birth", "Date of Birth"),
    "p1-y126.26-x342.07": write("participant.full_legal_name", "Print Name"),
    "p1-y94.94-x108.02": write("participant.full_mailing_address", "Mailing Address")
  },
  "CRRLJ-09.0870": {
    "p1-y558.70-x98.88": write("matter.court_prefix", "Type of Court"),
    "p1-y558.70-x412.92": write("matter.county_or_city", "County or City"),
    "p1-y531.84-x78.72": write("matter.plaintiff_name", "Plaintiff Name"),
    "p1-y252.24-x160.56": write("matter.charges[0].count", "Count 1"),
    "p1-y252.24-x227.64": write("matter.charges[0].charge", "Offense 1"),
    "p1-y233.64-x160.56": write("matter.charges[1].count", "Count 2"),
    "p1-y233.64-x227.64": write("matter.charges[1].charge", "Offense 2"),
    "p1-y214.92-x160.56": write("matter.charges[2].count", "Count 3"),
    "p1-y214.92-x227.64": write("matter.charges[2].charge", "Offense 3"),
    "p2-y298.20-x72.00": write("participant.full_legal_name", "Defendant Print Name")
  },
  "CRRLJ-09.0100": {
    "p1-y556.56-x72.00": write("matter.court_prefix", "Type of Court"),
    "p1-y556.56-x386.04": write("matter.county_or_city", "County"),
    "p1-y525.24-x78.72": write("matter.plaintiff_name", "Plaintiff Name"),
    "p1-y297.36-x324.00": write("participant.full_legal_name", "Print Name"),
    "p1-y245.40-x155.04": write("participant.full_legal_name", "Declarant Name"),
    "p1-y228.80-x157.69": write("matter.conviction_date", "Offense Date"),
    "p1-y210.10-x160.68": write("matter.charges[0].count", "Count 1"),
    "p1-y210.10-x232.79": write("matter.charges[0].charge", "Offense 1"),
    "p1-y191.50-x160.68": write("matter.charges[1].count", "Count 2"),
    "p1-y191.50-x232.79": write("matter.charges[1].charge", "Offense 2"),
    "p1-y172.80-x160.68": write("matter.charges[2].count", "Count 3"),
    "p1-y172.80-x232.79": write("matter.charges[2].charge", "Offense 3"),
    "p5-y416.40-x72.00": write("participant.full_legal_name", "Print Name"),
    "p5-y360.36-x72.00": write("participant.full_mailing_address", "Mailing Address")
  },
  "CRRLJ-09.0200": {
    "p1-y558.70-x98.88": write("matter.court_prefix", "Type of Court"),
    "p1-y558.70-x412.80": write("matter.county_or_city", "County or City"),
    "p1-y525.24-x78.72": write("matter.plaintiff_name", "Plaintiff Name"),
    "p4-y98.76-x178.56": write("matter.charges[0].count", "Count 1"),
    "p4-y98.76-x254.64": write("matter.charges[0].charge", "Offense 1"),
    "p4-y83.16-x178.56": write("matter.charges[1].count", "Count 2"),
    "p4-y83.16-x254.64": write("matter.charges[1].charge", "Offense 2"),
    "p5-y707.64-x178.56": write("matter.charges[2].count", "Count 3"),
    "p5-y707.64-x254.64": write("matter.charges[2].charge", "Offense 3"),
    "p6-y620.40-x72.00": write("participant.full_legal_name", "Defendant Print Name")
  },
  "CR-08.0900": {
    "p1-y318.78-x310.50": write("participant.full_legal_name", "Print Name"),
    "p1-y268.86-x81.18": write("participant.full_legal_name", "Declarant Name"),
    "p1-y233.50-x143.46": write("matter.charges[0].count", "Count 1"),
    "p1-y233.50-x304.28": write("matter.charges[0].charge", "Offense 1"),
    "p1-y233.50-x462.05": write("matter.charges[0].statute", "Statute 1"),
    "p1-y214.80-x143.46": write("matter.charges[1].count", "Count 2"),
    "p1-y214.80-x304.28": write("matter.charges[1].charge", "Offense 2"),
    "p1-y214.80-x462.05": write("matter.charges[1].statute", "Statute 2"),
    "p1-y196.20-x143.46": write("matter.charges[2].count", "Count 3"),
    "p1-y196.20-x304.28": write("matter.charges[2].charge", "Offense 3"),
    "p1-y196.20-x462.05": write("matter.charges[2].statute", "Statute 3"),
    "p1-y177.60-x143.46": write("matter.charges[3].count", "Count 4"),
    "p1-y177.60-x304.28": write("matter.charges[3].charge", "Offense 4"),
    "p1-y177.60-x462.05": write("matter.charges[3].statute", "Statute 4"),
    "p3-y365.46-x310.50": write("participant.full_legal_name", "Print Name"),
    "p3-y334.14-x118.44": write("participant.full_mailing_address", "Mailing Address"),
    "p3-y315.48-x105.60": write("participant.email", "Email")
  },
  "CR-08.0920": {
    "p1-y344.10-x157.50": write("matter.conviction_date", "Offense Date"),
    "p1-y327.40-x143.46": write("matter.charges[0].count", "Count 1"),
    "p1-y327.40-x298.16": write("matter.charges[0].charge", "Offense 1"),
    "p1-y327.40-x455.87": write("matter.charges[0].statute", "Statute 1"),
    "p1-y308.70-x143.46": write("matter.charges[1].count", "Count 2"),
    "p1-y308.70-x298.16": write("matter.charges[1].charge", "Offense 2"),
    "p1-y308.70-x455.87": write("matter.charges[1].statute", "Statute 2"),
    "p1-y290.00-x143.46": write("matter.charges[2].count", "Count 3"),
    "p1-y290.00-x298.16": write("matter.charges[2].charge", "Offense 3"),
    "p1-y290.00-x455.87": write("matter.charges[2].statute", "Statute 3"),
    "p1-y271.40-x143.46": write("matter.charges[3].count", "Count 4"),
    "p1-y271.40-x298.16": write("matter.charges[3].charge", "Offense 4"),
    "p1-y271.40-x455.87": write("matter.charges[3].statute", "Statute 4"),
    "p3-y678.40-x143.46": write("matter.charges[0].count", "Count 1"),
    "p3-y678.40-x298.16": write("matter.charges[0].charge", "Offense 1"),
    "p3-y678.40-x455.88": write("matter.charges[0].statute", "Statute 1"),
    "p3-y659.80-x143.46": write("matter.charges[1].count", "Count 2"),
    "p3-y659.80-x298.16": write("matter.charges[1].charge", "Offense 2"),
    "p3-y659.80-x455.88": write("matter.charges[1].statute", "Statute 2"),
    "p3-y641.10-x143.46": write("matter.charges[2].count", "Count 3"),
    "p3-y641.10-x298.16": write("matter.charges[2].charge", "Offense 3"),
    "p3-y641.10-x455.88": write("matter.charges[2].statute", "Statute 3"),
    "p3-y622.50-x143.46": write("matter.charges[3].count", "Count 4"),
    "p3-y622.50-x298.16": write("matter.charges[3].charge", "Offense 4"),
    "p3-y622.50-x455.88": write("matter.charges[3].statute", "Statute 4"),
    "p3-y144.42-x306.00": write("participant.full_legal_name", "Defendant Print Name")
  }
};

const SOURCE_FIELD_DISPOSITIONS = {
  "CRRLJ-09.0870": {
    "p2-y480.60-x418.68": {
      effectiveLabel: "Court Order Recipient Designated by Clerk",
      reason: "Court or clerk field naming an order recipient; completed by the court after filing.",
      category: "court_prosecutor_clerk_or_agency_owned", approvedDisposition: "PROTECTED_FIELD"
    }
  },
  "CRRLJ-09.0200": {
    "p5-y279.48-x436.68": {
      effectiveLabel: "Court Order Recipient Designated by Clerk",
      reason: "Court or clerk field naming an order recipient; completed by the court after filing.",
      category: "court_prosecutor_clerk_or_agency_owned", approvedDisposition: "PROTECTED_FIELD"
    }
  },
  "CR-08.0920": {
    "p3-y313.56-x275.52": {
      effectiveLabel: "Court Order Recipient Designated by Clerk",
      reason: "Court or clerk field naming an order recipient; completed by the court after filing.",
      category: "court_prosecutor_clerk_or_agency_owned", approvedDisposition: "PROTECTED_FIELD"
    }
  }
};

// Route-determined elections, marked on the official form's own printed
// controls (FIX10). A family appears here only when the pinned form's face
// carries the ground its route implements and the route — not the participant's
// case facts — determines the mark. Each mark pins the censused control id, a
// context fragment that must appear in the control's printed line, and the
// measured geometry, so a source revision or census drift fails loudly instead
// of marking the wrong box. Controls whose state depends on the participant's
// own case (for example the class B / class C timing boxes on CR 08.0900
// sections 5 and 6) are never listed here: they remain genuine participant
// elections with their existing blank dispositions.
const ROUTE_ELECTION_MARKS = {
  "wa_vac_domestic_violence-set": {
    routeSelectionId: "wa-vac-dv-crrlj-09-0100-section-6-rcw-9-96-060-2f",
    marks: {
      "CRRLJ-09.0100": [{
        controlId: "p4-selection-1",
        mustContain: "Domestic Violence: I was convicted of an offense involving domestic violence",
        expect: { page: 4, x0: 108, y0: 487.5 },
        why: "Section 6 of the petition is the RCW 9.96.060(2)(f) domestic-violence ground this route implements; the route, not the participant, determines this election."
      }]
    }
  },
  "wa_vac_felony-set": {
    routeSelectionId: "wa-vac-felony-cr-08-0900-rcw-9-94a-640",
    marks: {
      "CR-08.0900": [
        {
          controlId: "p1-selection-1",
          mustContain: "Defendant [ ] Prosecutor asks the court",
          expect: { page: 1, x0: 72, y0: 419.6 },
          why: "On this self-help route the movant is the defendant; the prosecutor box is the alternative movant the route never uses (CR 08.0900 section I)."
        },
        {
          controlId: "p2-selection-1",
          mustContain: "was [ ] was not discharged under RCW 9.94A.637",
          expect: { page: 2, x0: 114.09, y0: 568.6 },
          why: "The ordinary RCW 9.94A.640 route requires discharge under RCW 9.94A.637 for class B and class C alike (CR 08.0930 eligibility table), so 'was discharged' is route-invariant; 'was not' belongs to the victim route."
        },
        {
          controlId: "p2-selection-3",
          mustContain: "There are no criminal charges pending against me",
          expect: { page: 2, x0: 107.98, y0: 518.7 },
          why: "RCW 9.94A.640(2)(a) requires no pending charges on this route; the alternative box (prostitution charge pending) exists only for the victim-of-certain-crimes route."
        }
      ]
    }
  }
};

function routeElectionFamily(familyId) {
  return ROUTE_ELECTION_MARKS[familyId] ?? null;
}

function routeMarkIdsFor(familyId, formNumber) {
  return new Set((ROUTE_ELECTION_MARKS[familyId]?.marks?.[formNumber] ?? []).map((spec) => spec.controlId));
}

function resolveRouteElectionMarks(familyId, document, census) {
  const specs = ROUTE_ELECTION_MARKS[familyId]?.marks?.[document.formNumber] ?? [];
  return specs.map((spec) => {
    const control = census.selectionControls.find((candidate) => candidate.id === spec.controlId);
    if (!control) fail("route-election control absent from first-hand census", `${document.formNumber} ${spec.controlId}`);
    if (!String(control.printedContext ?? "").includes(spec.mustContain)) {
      fail("route-election control printed context mismatch",
        `${document.formNumber} ${spec.controlId}: ${JSON.stringify(control.printedContext)}`);
    }
    if (control.page !== spec.expect.page
      || Math.abs(control.geometry.x0 - spec.expect.x0) > 0.5
      || Math.abs(control.geometry.y0 - spec.expect.y0) > 0.5) {
      fail("route-election control geometry drifted from its pinned expectation", `${document.formNumber} ${spec.controlId}`);
    }
    if (control.observedState !== "unmarked") {
      fail("route-election control is already marked on the pinned source", `${document.formNumber} ${spec.controlId}`);
    }
    return { spec, control };
  });
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (n) => Number(Number(n).toFixed(2));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const outFor = (familyId) => `${OUT_ROOT}/${familyId.replaceAll("_", "-")}--official-pdf-fill`;
const absFor = (rel) => path.join(rootDir, rel);
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(absFor(rel)), { recursive: true });
  fs.writeFileSync(absFor(rel), `${JSON.stringify(value, null, 2)}\n`);
};

function fail(message, detail = null) {
  const error = new Error(detail ? `${message}: ${detail}` : message);
  error.name = "WashingtonPacketBuildError";
  throw error;
}

function assertOwnedOutput(familyId, rel) {
  const allowed = path.resolve(rootDir, outFor(familyId));
  const resolved = path.resolve(rootDir, rel);
  if (resolved !== allowed && !resolved.startsWith(`${allowed}${path.sep}`)) {
    fail("refusing a write outside the assigned family path", rel);
  }
  return resolved;
}

function safeSourcePath(corpusRoot, archivePath) {
  if (!archivePath || path.isAbsolute(archivePath)) fail("invalid corpus-relative source path", archivePath);
  const base = path.resolve(corpusRoot);
  const resolved = path.resolve(base, archivePath);
  if (!resolved.startsWith(`${base}${path.sep}`)) fail("source path escapes the verified corpus", archivePath);
  return resolved;
}

function corpusRoot() {
  const candidates = [
    process.env.MASTER_LIBRARY_SOURCE_DIR,
    path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1")
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    fail("verified Master Library is unavailable",
      "set MASTER_LIBRARY_SOURCE_DIR or bootstrap private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
  }
  return path.resolve(found);
}

function familyRecords(familyId) {
  if (!FAMILY_IDS.has(familyId)) fail("family is outside the C11 Washington assignment", familyId);
  const custody = readJson(CUSTODY).rows.find((row) => row.worklistGroupId === familyId);
  const worklist = readJson(WORKLIST).packetFamilies.find((row) => row.worklistGroupId === familyId);
  if (!custody || !worklist) fail("family missing from committed controls", familyId);
  if (worklist.implementationStrategy !== "official_pdf_fill") {
    fail("assignment vehicle is not official_pdf_fill", worklist.implementationStrategy);
  }
  if (custody.custodyClass !== "SOURCE_ALREADY_HELD" || custody.commissionAcquisition !== false) {
    fail("source custody is not buildable", `${custody.custodyClass}; commissionAcquisition=${custody.commissionAcquisition}`);
  }
  return { custody, worklist };
}

function contentStringOf(pdf, page) {
  let content = "";
  const contents = page.node.normalizedEntries?.().Contents;
  const refs = contents?.asArray?.() ?? (contents ? [contents] : []);
  for (const ref of refs) {
    const stream = pdf.context.lookup(ref);
    try {
      const bytes = stream instanceof PDFRawStream
        ? decodePDFRawStream(stream).decode()
        : stream.getContents();
      content += Buffer.from(bytes).toString("latin1");
    } catch { /* an undecodable or non-stream reference contributes no geometry */ }
  }
  return content;
}

function controlBoundsOf(chars, baselineY, size) {
  const x0 = Math.min(...chars.map((char) => char.x));
  const x1 = Math.max(...chars.map((char) => char.x + char.w));
  return {
    x0: round(x0), y0: round(baselineY - 1), x1: round(x1), y1: round(baselineY + size),
    width: round(x1 - x0), height: round(size + 1)
  };
}

function printedSelectionControls(lines) {
  const controls = [];
  const singleGlyphs = new Map([
    ["☐", ["printed_checkbox_glyph", "unmarked"]], ["□", ["printed_checkbox_glyph", "unmarked"]],
    ["▢", ["printed_checkbox_glyph", "unmarked"]], ["", ["printed_checkbox_glyph", "unmarked"]],
    ["☑", ["printed_checkbox_glyph", "marked"]], ["☒", ["printed_checkbox_glyph", "marked"]],
    ["○", ["printed_radio_glyph", "unmarked"]], ["◯", ["printed_radio_glyph", "unmarked"]],
    ["◉", ["printed_radio_glyph", "marked"]], ["●", ["printed_radio_glyph", "marked"]]
  ]);
  for (const line of lines) {
    const chars = line.chars ?? [];
    const size = Number(line.size || 10);
    for (let index = 0; index < chars.length; index += 1) {
      const char = chars[index];
      const single = singleGlyphs.get(char.c);
      if (single) {
        controls.push({ construction: single[0], observedState: single[1], printedGlyph: char.c,
          geometry: controlBoundsOf([char], line.y, size), printedContext: cleanText(line.text) });
        continue;
      }
      const close = char.c === "[" ? "]" : char.c === "(" ? ")" : null;
      if (!close) continue;
      let end = index + 1;
      while (end < chars.length && end <= index + 4 && chars[end].c !== close) end += 1;
      if (end >= chars.length || chars[end].c !== close) continue;
      const sequence = chars.slice(index, end + 1);
      const printed = sequence.map((item) => item.c).join("");
      const inside = printed.slice(1, -1).trim();
      if (inside && !/^[xX✓✔•]$/.test(inside)) continue;
      const geometry = controlBoundsOf(sequence, line.y, size);
      if (geometry.width < 4 || geometry.width > 24) continue;
      controls.push({
        construction: char.c === "[" ? "printed_bracket_checkbox" : "printed_parenthesis_radio",
        observedState: inside ? "marked" : "unmarked", printedGlyph: printed,
        geometry, printedContext: cleanText(line.text)
      });
      index = end;
    }
  }
  return controls;
}

function vectorSelectionControls(page, decodedContent) {
  const candidates = checkboxCandidates(decodedContent).map((geometry) => ({
    construction: `decoded_content_${geometry.construction}`, observedState: "unmarked",
    printedGlyph: null, geometry, printedContext: null
  }));
  const byPath = new Map();
  for (const segment of extractPageGeometry(page).paths ?? []) {
    if (!/^(S|s|B|B\*|b|b\*)$/.test(String(segment.paintedBy ?? ""))) continue;
    const key = `${segment.stream}#${segment.pathIndex}`;
    if (!byPath.has(key)) byPath.set(key, []);
    byPath.get(key).push(segment);
  }
  for (const segments of byPath.values()) {
    const x0 = Math.min(...segments.map((segment) => segment.x));
    const y0 = Math.min(...segments.map((segment) => segment.y));
    const x1 = Math.max(...segments.map((segment) => segment.x + segment.width));
    const y1 = Math.max(...segments.map((segment) => segment.y + segment.height));
    const width = x1 - x0;
    const height = y1 - y0;
    const squareness = Math.min(width, height) / Math.max(width, height);
    if (width < 6 || height < 6 || width > 20 || height > 20 || squareness < 0.85) continue;
    candidates.push({
      construction: "ctm_path_checkbox", observedState: "unmarked", printedGlyph: null,
      geometry: { x0: round(x0), y0: round(y0), x1: round(x1), y1: round(y1),
        width: round(width), height: round(height), squareness: round(squareness) },
      printedContext: null
    });
  }
  return candidates;
}

function controlsOverlap(a, b) {
  const horizontal = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const vertical = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return horizontal > Math.min(a.width, b.width) * 0.6 && vertical > Math.min(a.height, b.height) * 0.6;
}

function dedupeControls(controls) {
  const out = [];
  for (const control of controls) {
    const duplicate = out.find((prior) => controlsOverlap(prior.geometry, control.geometry));
    if (!duplicate) out.push(control);
    else if (duplicate.construction.startsWith("decoded_content_") && control.printedGlyph) {
      out.splice(out.indexOf(duplicate), 1, control);
    }
  }
  return out;
}

function cleanText(value) {
  return normalizeHarvestedText(String(value ?? ""))
    .replace(/[_.…]{3,}/g, " ")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[:.,;\s]+$/, "")
    .trim();
}

function spanOf(line) {
  const chars = (line?.chars ?? []).filter((ch) => String(ch.c).trim() !== "");
  if (!chars.length) return null;
  return { x0: Math.min(...chars.map((ch) => ch.x)), x1: Math.max(...chars.map((ch) => ch.x + ch.w)) };
}

function underscoreRunsOf(line) {
  const runs = [];
  let current = null;
  for (const ch of line.chars ?? []) {
    if (ch.c === "_") {
      if (current) { current.x1 = ch.x + ch.w; current.glyphs += 1; }
      else current = { x0: ch.x, x1: ch.x + ch.w, glyphs: 1 };
    } else if (current) { runs.push(current); current = null; }
  }
  if (current) runs.push(current);
  return runs;
}

function inkBetween(line, x0, x1) {
  let width = 0;
  for (const ch of line.chars ?? []) {
    if (!String(ch.c).trim()) continue;
    width += Math.max(0, Math.min(ch.x + ch.w, x1) - Math.max(ch.x, x0));
  }
  return width;
}

function classifyRule(rule, lines) {
  let best = { ink: 0, line: null };
  for (const line of lines) {
    const size = line.size || 12;
    if (line.y < rule.y - 0.75 || line.y > rule.y + size * 1.3) continue;
    const ink = inkBetween(line, rule.x, rule.endX);
    if (ink > best.ink) best = { ink, line };
  }
  const inkFraction = rule.width > 0 ? best.ink / rule.width : 0;
  return { isUnderline: inkFraction >= 0.5, inkFraction: round(inkFraction),
    textOnRule: inkFraction >= 0.5 ? cleanText(best.line?.text) : null };
}

function textBetween(line, x0, x1) {
  return cleanText((line?.chars ?? [])
    .filter((ch) => ch.x >= x0 - 0.75 && ch.x + ch.w <= x1 + 0.75)
    .map((ch) => ch.c).join(""));
}

function captionFor(blank, rawOnPage, lines) {
  if (blank.line) {
    const peers = rawOnPage.filter((other) => other !== blank && other.line === blank.line);
    const previousEnd = peers.filter((other) => other.x1 <= blank.x0 + 0.75)
      .reduce((value, other) => Math.max(value, other.x1), -Infinity);
    const nextStart = peers.filter((other) => other.x0 >= blank.x1 - 0.75)
      .reduce((value, other) => Math.min(value, other.x0), Infinity);
    const before = textBetween(blank.line, Number.isFinite(previousEnd) ? previousEnd : -Infinity, blank.x0);
    if (before) return { caption: before, basis: "printed_text_on_same_line_before_blank" };
    const after = textBetween(blank.line, blank.x1, Number.isFinite(nextStart) ? nextStart : Infinity);
    if (after) return { caption: after, basis: "printed_text_on_same_line_after_blank" };
  }
  const overlapping = (line) => {
    const span = spanOf(line);
    return span && Math.min(span.x1, blank.x1) - Math.max(span.x0, blank.x0) >= 4;
  };
  const isLabel = (line) => {
    const text = cleanText(line.text);
    return text && text.length <= 80 && underscoreRunsOf(line).length === 0;
  };
  const below = lines.filter((line) => line.y < blank.baselineY - 2 && line.y >= blank.baselineY - 32)
    .filter(overlapping).filter(isLabel).sort((a, b) => b.y - a.y)[0];
  if (below) return { caption: cleanText(below.text), basis: "nearest_short_printed_label_below_blank" };
  const above = lines.filter((line) => line.y > blank.baselineY + 2 && line.y <= blank.baselineY + 32)
    .filter(overlapping).filter(isLabel).sort((a, b) => a.y - b.y)[0];
  if (above) return { caption: cleanText(above.text), basis: "nearest_short_printed_label_above_blank" };
  return { caption: "", basis: "no_adjacent_printed_caption" };
}

function headingAbove(blank, lines) {
  const candidates = lines.filter((line) => line.y > blank.baselineY + 4)
    .map((line) => cleanText(line.text))
    .filter((text) => text && text.length <= 80 && (
      regionProtectCategoryOf(text)
      || /^(declaration|submitted by|approved|findings|order|court.s action|certificate|verification)/i.test(text)
    ));
  return candidates.at(-1) ?? null;
}

function overlaps(a, b) {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 2 && Math.abs(a.baselineY - b.baselineY) <= 2;
}

function dedupeBlanks(raw) {
  const out = [];
  for (const candidate of [...raw].sort((a, b) => a.page - b.page || b.baselineY - a.baselineY || a.x0 - b.x0)) {
    const duplicate = out.find((prior) => prior.page === candidate.page && overlaps(prior, candidate));
    if (!duplicate) out.push(candidate);
    else if (candidate.construction === "underscore_leader_run" && duplicate.construction !== candidate.construction) {
      out.splice(out.indexOf(duplicate), 1, candidate);
    }
  }
  return out;
}

function semanticRole(blank, document) {
  const text = cleanText(blank.caption).toLowerCase();
  const common = { printedCaption: blank.caption, captionBasis: blank.captionBasis };
  const sourceFieldId = `p${blank.page}-y${blank.baselineY.toFixed(2)}-x${blank.x0.toFixed(2)}`;
  const disposition = SOURCE_FIELD_DISPOSITIONS[document.formNumber]?.[sourceFieldId];
  if (disposition) return { ...common, terminal: true, writable: false, ...disposition };
  const exact = SOURCE_FIELD_WRITES[document.formNumber]?.[sourceFieldId];
  if (exact) return { ...common, terminal: true, writable: true, ...exact };
  const inCaptionBand = blank.page === 1 && blank.baselineY >= 430;

  // The same words recur beside declarations and signature lines. Identity is
  // therefore only populated inside the first-page case-caption band.
  if (inCaptionBand && /^(defendant|respondent|petitioner|applicant)$/.test(text)) {
    return { ...common, terminal: true, writable: true,
      factId: "participant.full_legal_name", effectiveLabel: "Full Legal Name" };
  }
  // Washington captions print only "No.". Its page and measured caption-band
  // position make this a case number; a bare No. anywhere else stays unbound.
  if (inCaptionBand && (/(^|\s)no\.?$/.test(text)) && blank.x0 >= 300) {
    return { ...common, terminal: true, writable: true,
      factId: "matter.case_number", effectiveLabel: "Case No." };
  }
  if (inCaptionBand && document.formNumber?.startsWith("CR-08.")
    && blank.x0 >= 300 && /superior court of washington, county of/.test(text)) {
    return { ...common, terminal: true, writable: true,
      factId: "matter.county", effectiveLabel: "County" };
  }

  const category = protectCategoryOf(text) ?? blank.regionProtectCategory;
  const signatureCompletion = category === "signature" || category === "date"
    || /\b(?:dated|signed on|signature|wsba)\b/i.test(text);
  if (signatureCompletion) {
    return { ...common, terminal: true, writable: false,
      reason: "Signature or execution-date field; completed by the participant or signer at execution and never prefilled.",
      category: "signature_or_date_participant_completion", approvedDisposition: "PROTECTED_FIELD" };
  }

  // Participant-authored evidentiary and mitigation lines are real terminal
  // blanks, but their content is a genuine sworn election. The route does not
  // supply prose and the platform never invents it.
  const participantNarrative = document.role === "participant_filing" && (
    (document.formNumber === "CRRLJ-09.0100" && blank.page === 2 && blank.baselineY >= 560)
    || (document.formNumber === "CR-08.0900" && blank.page === 3 && blank.baselineY >= 480)
  );
  if (participantNarrative) {
    return { ...common, terminal: true, writable: false,
      reason: "Participant-authored sworn narrative or supporting evidence; the platform does not invent it.",
      category: "participant_sworn_narrative_or_legal_election",
      approvedDisposition: "PARTICIPANT_ELECTION_GENUINE" };
  }

  // An order's remaining writable-looking lines are findings, elections,
  // signatures, reasons, and approval blocks owned by the court or prosecutor.
  // Known caption/offense/agency facts were handled by the exact rules above.
  if (document.role === "court_order") {
    return { ...common, terminal: true, writable: false,
      reason: "Court, clerk, prosecutor, or hearing field; completed by the named official after filing.",
      category: "court_prosecutor_clerk_or_agency_owned", approvedDisposition: "PROTECTED_FIELD" };
  }

  // A small set of participant-side signing blocks are not recognized from
  // their damaged extracted captions, but the pinned page location and printed
  // block establish that they are execution fields.
  if (category === "attorney" || category === "prosecutor") {
    return { ...common, terminal: true, writable: false,
      reason: "Signature or execution field; completed by the participant, attorney, or prosecutor and never prefilled.",
      category: "signature_or_date_participant_completion", approvedDisposition: "PROTECTED_FIELD" };
  }

  // The field census intentionally retains decorative rules, footer dividers,
  // paragraph underlines, and source headings so the geometry remains
  // auditable. They are not terminal fields and therefore do not belong in the
  // completeness blank ledger.
  return { ...common, terminal: false, writable: false,
    reason: text ? "measured_source_rule_is_not_a_terminal_field" : "unlabelled_source_rule_is_not_a_terminal_field",
    approvedDisposition: "NOT_A_FIELD" };
}

async function loadDocuments(familyId, records, sourceRoot) {
  const index = readJson(CORPUS_INDEX);
  const documents = [];
  for (const source of records.custody.documentSources ?? []) {
    if (!source.resolved || !source.heldAs?.path || !source.heldAs?.sha256) {
      fail("custody row contains an unresolved document source", source.sourceId);
    }
    const entry = index.entries.find((item) => item.path === source.heldAs.path);
    if (!entry) fail("custody source absent from committed corpus index", source.heldAs.path);
    if (entry.sha256 !== source.heldAs.sha256) {
      fail("custody/index source mismatch", `${source.heldAs.formNumber}: ${source.heldAs.sha256} != ${entry.sha256}`);
    }
    const sourcePath = safeSourcePath(sourceRoot, source.heldAs.path);
    if (!fs.existsSync(sourcePath)) fail("source absent from verified corpus", source.heldAs.path);
    const bytes = fs.readFileSync(sourcePath);
    const digest = sha256(bytes);
    if (digest !== source.heldAs.sha256) {
      fail("source bytes do not match committed custody SHA-256", `${source.heldAs.formNumber}: ${digest}`);
    }
    if (entry.byteLength !== bytes.length) {
      fail("source byte length does not match corpus index", `${source.heldAs.formNumber}: ${bytes.length} != ${entry.byteLength}`);
    }
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pageCount = pdf.getPageCount();
    if (entry.pageCount !== pageCount) {
      fail("source page count does not match corpus index", `${source.heldAs.formNumber}: ${pageCount} != ${entry.pageCount}`);
    }
    let acroFieldCount = 0;
    try { acroFieldCount = pdf.getForm().getFields().length; } catch { acroFieldCount = 0; }
    if (acroFieldCount !== 0) {
      fail("Washington engine expected a flat PDF", `${source.heldAs.formNumber}: ${acroFieldCount} AcroForm fields`);
    }
    const firstPageLines = groupIntoLines(extractTextItems(pdf.getPage(0))).map((line) => cleanText(line.text)).filter(Boolean);
    const observedTitleLines = firstPageLines.filter((line) =>
      /motion|petition|order|declaration|vacat|refund/i.test(line)).slice(0, 12);
    const orderFormNumbers = new Set(["BLAKE-005", "CR-08.0920", "CRRLJ-09.0200", "CRRLJ-09.0870"]);
    documents.push({
      key: String(source.heldAs.formNumber).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      formNumber: source.heldAs.formNumber,
      revision: source.heldAs.revision ?? entry.revision ?? null,
      pathInArchive: source.heldAs.path,
      expectedSha256: source.heldAs.sha256,
      byteLength: bytes.length,
      pageCount,
      bytes,
      indexEntry: entry,
      role: orderFormNumbers.has(source.heldAs.formNumber) ? "court_order" : "participant_filing",
      observedTitleLines,
      // Every line of this pinned source that carries money language, measured
      // now so the filing-obligations derivation can prove — rather than assert
      // — that the packet's own delivered forms state no fee (A4).
      moneyLines: measuredMoneyLines(pdf),
      acroFieldCount
    });
  }
  if (!documents.length) fail("custody row resolves no documents", familyId);
  return documents;
}

function cannabisCaseNumberObservation(document, pageNumber, lines, measuredRules) {
  if (pageNumber !== 1 || !new Set(["CRRLJ-09.0800", "CRRLJ-09.0870"]).has(document.formNumber)) return null;
  const labels = lines.filter((line) => /^(no\.?|case no\.?)$/i.test(cleanText(line.text)))
    .map((line) => ({ line, span: spanOf(line) }))
    .filter(({ line, span }) => span && span.x0 >= 300 && line.y >= 500);
  if (labels.length !== 1) {
    return { refusal: { factId: "matter.case_number", page: 1, printedCaption: "No.",
      reason: "visible_cannabis_case_number_label_not_unique", observedLabelCount: labels.length } };
  }
  const { line, span } = labels[0];
  const candidates = measuredRules.horizontal.filter((rule) =>
    rule.x <= span.x0 + 8 && rule.endX >= span.x1 + 50
    && rule.y <= line.y - 20 && rule.y >= line.y - 130 && rule.width >= 150);
  if (candidates.length !== 1) {
    return { refusal: { factId: "matter.case_number", page: 1, printedCaption: cleanText(line.text),
      reason: "visible_cannabis_case_number_cell_boundary_not_unambiguous",
      labelGeometry: { x0: round(span.x0), x1: round(span.x1), baselineY: round(line.y) },
      boundaryCandidates: candidates.map((rule) => ({ x: rule.x, endX: rule.endX, y: rule.y })) } };
  }
  const boundary = candidates[0];
  const x0 = round(span.x1 + 3);
  const x1 = round(boundary.endX);
  if (x1 - x0 < 20) {
    return { refusal: { factId: "matter.case_number", page: 1, printedCaption: cleanText(line.text),
      reason: "visible_cannabis_case_number_cell_too_narrow",
      measured: { x0, x1, baselineY: round(line.y) } } };
  }
  return { blank: {
    page: 1, construction: "measured_caption_cell_after_label", x0, x1,
    baselineY: round(line.y), printedSize: round(line.size || 10), glyphCount: null, line,
    rule: { ...boundary, relationship: "right_edge_from_measured_caption_cell_bottom_rule" }
  } };
}

async function censusDocument(document, routeMarkIds = new Set()) {
  const pdf = await PDFDocument.load(document.bytes, { ignoreEncryption: true, updateMetadata: false });
  const raw = [];
  const pages = [];
  const selectionControls = [];
  const documentTextLines = [];
  const unresolvedVisibleFields = [];

  for (const [pageIndex, page] of pdf.getPages().entries()) {
    const pageNumber = pageIndex + 1;
    const { width, height } = page.getSize();
    const lines = groupIntoLines(extractTextItems(page));
    documentTextLines.push(...lines.map((line) => cleanText(line.text)).filter(Boolean));
    const decodedContent = contentStringOf(pdf, page);
    const stroked = strokedRectangles(decodedContent);
    const printedControls = printedSelectionControls(lines);
    const vectorControls = vectorSelectionControls(page, decodedContent);
    const pageControls = dedupeControls([...vectorControls, ...printedControls])
      .sort((a, b) => b.geometry.y0 - a.geometry.y0 || a.geometry.x0 - b.geometry.x0)
      .map((control, index) => {
        const id = `p${pageNumber}-selection-${index + 1}`;
        return {
          id, page: pageNumber, ...control,
          treatment: routeMarkIds.has(id)
            ? "route_determined_election_marked_by_build"
            : "explicitly_left_unmarked_legal_or_court_election"
        };
      });
    selectionControls.push(...pageControls);
    const measuredRules = rulesOfPage(page, { maxThickness: 3, minLength: 8, minDividerLength: 8 });
    const classifiedRules = measuredRules.horizontal.map((rule) => ({ ...rule, ...classifyRule(rule, lines) }));
    pages.push({
      page: pageNumber, width: round(width), height: round(height), textLineCount: lines.length,
      strokedRectangleCount: stroked.length, horizontalRulesMeasured: classifiedRules.length,
      verticalRulesMeasured: measuredRules.vertical.length,
      vectorSelectionControlCount: vectorControls.length,
      printedSelectionControlCount: printedControls.length,
      selectionControlCount: pageControls.length
    });

    for (const line of lines) {
      for (const run of underscoreRunsOf(line)) {
        if (run.x1 - run.x0 < 20) continue;
        raw.push({
          page: pageNumber, construction: "underscore_leader_run",
          x0: round(run.x0), x1: round(run.x1), baselineY: round(line.y),
          printedSize: round(line.size || 10), glyphCount: run.glyphs, line
        });
      }
    }
    for (const rule of classifiedRules) {
      if (rule.isUnderline || rule.width < 8) continue;
      const host = lines.find((line) => line.y >= rule.y - 0.75 && line.y <= rule.y + (line.size || 10) * 1.3) ?? null;
      raw.push({
        page: pageNumber, construction: "drawn_horizontal_rule",
        x0: round(rule.x), x1: round(rule.endX), baselineY: round(rule.y),
        printedSize: round(host?.size || 10), glyphCount: null, line: host,
        rule: { x: rule.x, endX: rule.endX, y: rule.y, height: rule.height,
          operator: rule.operator, paintedBy: rule.paintedBy }
      });
    }

    const cannabisCase = cannabisCaseNumberObservation(document, pageNumber, lines, measuredRules);
    if (cannabisCase?.blank) raw.push(cannabisCase.blank);
    if (cannabisCase?.refusal) unresolvedVisibleFields.push(cannabisCase.refusal);

    const onPage = raw.filter((blank) => blank.page === pageNumber);
    for (const blank of onPage) {
      let caption = captionFor(blank, onPage, lines);
      // In the two-column Washington case caption, text on the same baseline in
      // the title column can sit to the right of the party-name rule. The
      // nearest label immediately below the rule is the form's actual label and
      // wins only for the left caption column.
      if (pageNumber === 1 && blank.x0 < 300 && blank.baselineY >= 450) {
        const partyBelow = lines.filter((line) => line.y < blank.baselineY - 2 && line.y >= blank.baselineY - 26)
          .filter((line) => {
            const span = spanOf(line);
            return span && Math.min(span.x1, blank.x1) - Math.max(span.x0, blank.x0) >= 4;
          })
          .map((line) => cleanText(line.text))
          .find((text) => /^(defendant|respondent|petitioner|applicant)(\.|\s|$)/i.test(text));
        if (partyBelow) caption = { caption: partyBelow.replace(/[.].*$/, "").replace(/\s+dob.*$/i, ""),
          basis: "state_caption_column_label_immediately_below_rule" };
      }
      blank.caption = caption.caption;
      blank.captionBasis = caption.basis;
      blank.regionHeading = headingAbove(blank, lines);
      blank.regionProtectCategory = blank.regionHeading ? regionProtectCategoryOf(blank.regionHeading) : null;
    }
  }

  const blanks = dedupeBlanks(raw).map((blank) => {
    const id = `p${blank.page}-y${blank.baselineY.toFixed(2)}-x${blank.x0.toFixed(2)}`;
    const role = semanticRole(blank, document);
    return {
      blankId: id, page: blank.page, construction: blank.construction,
      measured: {
        x0: blank.x0, x1: blank.x1, baselineY: blank.baselineY,
        width: round(blank.x1 - blank.x0), printedSize: blank.printedSize,
        glyphCount: blank.glyphCount, rule: blank.rule ?? null
      },
      printedCaption: blank.caption, captionBasis: blank.captionBasis,
      regionHeading: blank.regionHeading, regionProtectCategory: blank.regionProtectCategory,
      protectionCategory: protectCategoryOf(blank.caption), mappingDecision: role
    };
  });
  const ids = blanks.map((blank) => blank.blankId);
  if (new Set(ids).size !== ids.length) fail("two measured blanks share an identity", document.formNumber);
  return { pages, blanks, selectionControls, unresolvedVisibleFields, documentTextLines };
}

function anchorsFor(document, census) {
  const anchors = [];
  const withheld = [];
  for (const blank of census.blanks) {
    const decision = blank.mappingDecision;
    if (decision.terminal === false) continue;
    if (!decision.writable) {
      withheld.push({ blankId: blank.blankId, page: blank.page,
        printedCaption: decision.effectiveLabel ?? blank.printedCaption,
        sourcePrintedCaption: blank.printedCaption,
        reason: decision.reason, category: decision.category ?? null,
        approvedDisposition: decision.approvedDisposition ?? null });
      continue;
    }
    const narrowCaseCell = /matter\.charges\[\d+\]\.(?:count|statute)$/.test(decision.factId);
    const statuteCell = /matter\.charges\[\d+\]\.statute$/.test(decision.factId);
    const x = round(blank.measured.x0
      + (decision.factId === "matter.county" ? 5 : statuteCell ? 4 : narrowCaseCell ? 0.75 : 1.5));
    const rightGuard = narrowCaseCell ? 2 : RIGHT_EDGE_GUARD;
    const width = round(blank.measured.x1 - rightGuard - x);
    const y = blank.construction === "drawn_horizontal_rule" ? round(blank.measured.baselineY + 2) : blank.measured.baselineY;
    if (width < (narrowCaseCell ? 7 : 20)) {
      withheld.push({ blankId: blank.blankId, page: blank.page, printedCaption: blank.printedCaption,
        reason: "measured_blank_too_narrow", category: "geometry" });
      continue;
    }
    anchors.push({
      blankId: blank.blankId, printedCaption: blank.printedCaption,
      label: `${decision.effectiveLabel} [${blank.blankId}]`, factId: decision.factId,
      page: blank.page, writeBox: { x, y, width, height: 12 },
      sourceBlankBounds: { x0: blank.measured.x0, x1: blank.measured.x1,
        baselineY: blank.measured.baselineY },
      fontSize: Math.min(10, blank.measured.printedSize || 10), captionOnly: false
    });
  }
  return { anchors, withheld };
}

function protectedRulesFor(census) {
  return census.blanks.filter((blank) => blank.construction === "drawn_horizontal_rule")
    .filter((blank) => blank.mappingDecision.terminal !== false)
    .filter((blank) => !blank.mappingDecision.writable)
    .map((blank) => ({
      page: blank.page, x: blank.measured.x0, endX: blank.measured.x1, y: blank.measured.baselineY,
      caption: blank.printedCaption, category: blank.mappingDecision.category ?? blank.mappingDecision.reason
    }));
}

function explicitMappingsFor(anchors) {
  return Object.fromEntries(anchors.flatMap((anchor) => {
    // The shared finalizer protects the word "conviction" before it consults
    // an explicit mapping. These pinned cells therefore use the narrower
    // internal binding label "Offense Date" while retaining the source's
    // printed caption and the exact matter.conviction_date fact on the anchor.
    if (anchor.factId === "matter.conviction_date") return [[anchor.label, "matter.offense_date"]];
    if (/^matter\.charges\[\d+\]\./.test(anchor.factId)) return [[anchor.label, "matter.charge"]];
    return [];
  }));
}

async function addedInkOf(sourceBytes, outputBytes) {
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  const key = (page, ch, y) => `${page}|${ch.x.toFixed(1)}|${y.toFixed(1)}|${ch.c}`;
  const original = new Map();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const identity = key(index + 1, ch, item.y);
        original.set(identity, (original.get(identity) ?? 0) + 1);
      }
    }
  });
  const added = [];
  after.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const identity = key(index + 1, ch, item.y);
        const remaining = original.get(identity) ?? 0;
        if (remaining > 0) {
          original.set(identity, remaining - 1);
          continue;
        }
        added.push({ page: index + 1, x: round(ch.x), y: round(item.y), w: round(ch.w), c: ch.c });
      }
    }
  });
  return added;
}

function vectorPathIdentity(page, segment) {
  return [page, segment.operator, segment.paintedBy,
    round(segment.x), round(segment.y), round(segment.width), round(segment.height)].join("|");
}

async function addedVectorInkOf(sourceBytes, outputBytes) {
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  if (before.getPageCount() !== after.getPageCount()) fail("finalized artifact changed page count");
  const original = new Map();
  before.getPages().forEach((page, index) => {
    for (const segment of extractPageGeometry(page).paths ?? []) {
      const identity = vectorPathIdentity(index + 1, segment);
      original.set(identity, (original.get(identity) ?? 0) + 1);
    }
  });
  const added = [];
  after.getPages().forEach((page, index) => {
    for (const segment of extractPageGeometry(page).paths ?? []) {
      const identity = vectorPathIdentity(index + 1, segment);
      const remaining = original.get(identity) ?? 0;
      if (remaining > 0) {
        original.set(identity, remaining - 1);
        continue;
      }
      added.push({
        page: index + 1, operator: segment.operator, paintedBy: segment.paintedBy,
        x: round(segment.x), y: round(segment.y), width: round(segment.width), height: round(segment.height)
      });
    }
  });
  return added;
}

function inkInside(added, anchor) {
  const box = anchor.writeBox;
  const x0 = anchor.sourceBlankBounds?.x0 ?? box.x;
  const x1 = anchor.sourceBlankBounds?.x1 ?? box.x + box.width;
  return added.filter((glyph) => glyph.page === anchor.page
    && glyph.x + glyph.w >= x0 - 1 && glyph.x <= x1 + 1
    && glyph.y >= box.y - 3 && glyph.y <= box.y + box.height + 3);
}

function addedTextInsideControl(added, control) {
  const box = control.geometry;
  return added.filter((glyph) => glyph.page === control.page
    && glyph.x + glyph.w >= box.x0 - 1 && glyph.x <= box.x1 + 1
    && glyph.y >= box.y0 - 3 && glyph.y <= box.y1 + 3 && String(glyph.c).trim());
}

function addedVectorsInsideControl(addedVectors, control) {
  const box = control.geometry;
  return addedVectors.filter((segment) => segment.page === control.page
    && segment.x + segment.width >= box.x0 - 1 && segment.x <= box.x1 + 1
    && segment.y + segment.height >= box.y0 - 1 && segment.y <= box.y1 + 1);
}

function verifyAddedInk({ document, census, anchors, added, addedVectors, report, fixture, routeMarkIds = new Set() }) {
  const findings = [];
  const routeControls = census.selectionControls.filter((control) => routeMarkIds.has(control.id));
  const routeVectorIndexes = new Set();
  for (const [index, segment] of addedVectors.entries()) {
    if (routeControls.some((control) => addedVectorsInsideControl([segment], control).length > 0)) {
      routeVectorIndexes.add(index);
    }
  }
  const unattributedVectors = addedVectors.filter((segment, index) => !routeVectorIndexes.has(index));
  const perAnchor = anchors.map((anchor) => {
    const glyphs = inkInside(added, anchor);
    return {
      blankId: anchor.blankId, page: anchor.page, printedCaption: anchor.printedCaption,
      factId: anchor.factId, factoryFitBox: anchor.writeBox,
      measuredSourceBlankBounds: anchor.sourceBlankBounds,
      textReadFromArtifact: glyphs.map((glyph) => glyph.c).join("").trim(),
      glyphCount: glyphs.filter((glyph) => String(glyph.c).trim()).length
    };
  });
  const attributed = new Set();
  for (const [index, glyph] of added.entries()) {
    if (anchors.some((anchor) => inkInside([glyph], anchor).length > 0)) attributed.add(index);
  }
  const unattributed = added.filter((glyph, index) => !attributed.has(index) && String(glyph.c).trim());
  if (unattributed.length) {
    findings.push({ severity: "blocking", check: "added_ink_outside_every_measured_write_box",
      count: unattributed.length, sample: unattributed.slice(0, 20) });
  }
  if (unattributedVectors.length) {
    findings.push({ severity: "blocking", check: "unexpected_added_vector_ink",
      count: unattributedVectors.length, sample: unattributedVectors.slice(0, 20) });
  }
  for (const write of report.written ?? []) {
    const anchor = anchors.find((candidate) => candidate.label === write.anchor);
    const proof = anchor ? perAnchor.find((row) => row.blankId === anchor.blankId) : null;
    if (!proof || proof.glyphCount === 0) {
      findings.push({ severity: "blocking", check: "reported_write_has_no_ink_in_its_measured_box", anchor: write.anchor });
    }
  }
  for (const anchor of anchors) {
    if (!(report.written ?? []).some((write) => write.anchor === anchor.label)) {
      findings.push({ severity: "blocking", check: "mapped_anchor_was_not_written",
        anchor: anchor.label,
        refusal: (report.refused ?? []).find((refused) => refused.anchor === anchor.label) ?? null,
        unfittable: (report.unfittable ?? []).find((row) => row.anchor === anchor.label) ?? null });
    }
  }
  const nameTokens = [
    CANONICAL["participant.full_legal_name"], BOUNDARY["participant.full_legal_name"],
    CANONICAL["participant.first_name"], CANONICAL["participant.last_name"],
    BOUNDARY["participant.first_name"], BOUNDARY["participant.last_name"]
  ].flatMap((value) => String(value).split(/[\s-]+/)).filter((value) => value.length >= 4);
  for (const blank of census.blanks.filter((item) => /charge|offen[cs]e|count|statute|violation/i.test(item.printedCaption))) {
    const pseudoAnchor = { page: blank.page, writeBox: {
      x: blank.measured.x0, y: blank.measured.baselineY - 3,
      width: blank.measured.x1 - blank.measured.x0, height: 16
    } };
    const text = inkInside(added, pseudoAnchor).map((glyph) => glyph.c).join("");
    const token = nameTokens.find((candidate) => text.toLowerCase().includes(candidate.toLowerCase()));
    if (token) findings.push({ severity: "blocking", check: "participant_name_in_charge_or_offense_blank",
      blankId: blank.blankId, token, text });
  }
  const selectionControlProofs = census.selectionControls.map((control) => {
    const addedText = addedTextInsideControl(added, control);
    const addedVector = addedVectorsInsideControl(addedVectors, control);
    const markedByBuild = addedText.length > 0 || addedVector.length > 0;
    const routeElectionMark = routeMarkIds.has(control.id);
    if (markedByBuild && !routeElectionMark) {
      findings.push({ severity: "blocking", check: "selection_control_modified",
        controlId: control.id, addedText, addedVector });
    }
    if (routeElectionMark && !markedByBuild) {
      findings.push({ severity: "blocking", check: "route_election_control_not_marked",
        controlId: control.id });
    }
    if (routeElectionMark && addedText.length > 0) {
      findings.push({ severity: "blocking", check: "route_election_marked_with_text_instead_of_strokes",
        controlId: control.id, addedText });
    }
    return {
      controlId: control.id, page: control.page, construction: control.construction,
      printedGlyph: control.printedGlyph, sourceObservedState: control.observedState,
      geometry: control.geometry, addedTextGlyphCount: addedText.length,
      addedVectorPathCount: addedVector.length, markedByBuild,
      // The report keeps its pre-FIX10 shape for documents without a
      // route-determined election, so stored reports of untouched families
      // still recompute byte-identically under --check.
      ...(routeMarkIds.size ? { routeElectionMark } : {})
    };
  });
  return {
    document: document.formNumber, fixture, glyphsAdded: added.length,
    vectorPathsAdded: addedVectors.length,
    ...(routeMarkIds.size ? {
      routeElectionVectorPaths: routeVectorIndexes.size,
      routeElectionControlIds: [...routeMarkIds].sort()
    } : {}),
    written: report.written ?? [], refused: report.refused ?? [], unfittable: report.unfittable ?? [],
    perAnchor, selectionControlProofs, findings
  };
}

function pngDimensions(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    fail("raster is not a PNG");
  }
  return { pixelWidth: bytes.readUInt32BE(16), pixelHeight: bytes.readUInt32BE(20) };
}

function rasterizeWithPoppler(pdfRel, outRel, pageMetrics) {
  const pdfAbs = absFor(pdfRel);
  const outAbs = absFor(outRel);
  fs.mkdirSync(outAbs, { recursive: true });
  const fontCache = path.join(os.tmpdir(), "rcap-c11-font-cache");
  fs.mkdirSync(fontCache, { recursive: true });
  const bundledFontsConfig = path.resolve(path.dirname(process.execPath),
    "../../native/poppler/poppler/etc/fonts/fonts.conf");
  const rasterEnv = {
    ...process.env,
    XDG_CACHE_HOME: fontCache,
    ...(fs.existsSync(bundledFontsConfig) ? { FONTCONFIG_FILE: bundledFontsConfig } : {})
  };
  const pages = [];
  for (let page = 1; page <= pageMetrics.length; page += 1) {
    const name = `page-${String(page).padStart(2, "0")}`;
    const targetPrefix = path.join(outAbs, name);
    const run = spawnSync(process.env.RCAP_PDFTOPPM_PATH ?? "pdftoppm", [
      "-f", String(page), "-l", String(page), "-singlefile", "-png", "-r", String(RASTER_DPI),
      pdfAbs, targetPrefix
    ], { encoding: "utf8", env: rasterEnv });
    if (run.status !== 0) {
      fail("PDF rasterization failed", `${pdfRel} page ${page}: ${run.stderr || run.stdout || `exit ${run.status}`}`);
    }
    const file = `${targetPrefix}.png`;
    const bytes = fs.readFileSync(file);
    const dimensions = pngDimensions(bytes);
    const metric = pageMetrics[page - 1];
    const expected = {
      pixelWidth: Math.round(metric.width * RASTER_DPI / 72),
      pixelHeight: Math.round(metric.height * RASTER_DPI / 72)
    };
    if (dimensions.pixelWidth !== expected.pixelWidth || dimensions.pixelHeight !== expected.pixelHeight) {
      fail("raster dimensions do not match source page geometry and DPI",
        `${file}: ${dimensions.pixelWidth}x${dimensions.pixelHeight} != ${expected.pixelWidth}x${expected.pixelHeight}`);
    }
    const rel = path.posix.join(outRel, `${name}.png`);
    pages.push({ page, file: rel, sha256: sha256(bytes), byteLength: bytes.length,
      dpi: RASTER_DPI, ...dimensions });
  }
  return pages;
}

function sourceReceipt(familyId, records, documents) {
  return {
    schemaVersion: "rcap-family-source-receipt/v1", familyId, worklistGroupId: familyId,
    jurisdiction: "WA", implementationStrategy: "official_pdf_fill", routeKeys: records.worklist.routeKeys,
    custodyClass: records.custody.custodyClass, acquisitionCommissioned: false,
    corpusIndex: CORPUS_INDEX, custodyRecord: CUSTODY,
    bindingMethod: "exact path plus SHA-256 and byte length against both custody and committed corpus index",
    documents: documents.map((document) => ({
      formNumber: document.formNumber, revision: document.revision,
      roleObservedFromSourceTitle: document.role, observedTitleLines: document.observedTitleLines,
      pathInArchive: document.pathInArchive, sha256: document.expectedSha256,
      byteLength: document.byteLength, pageCount: document.pageCount,
      acroFieldCountReadFromBytes: document.acroFieldCount, matchedBy: "exact_pinned_sha256"
    })),
    ...(P2_FAMILY_IDS.includes(familyId) ? {
      completenessRepairBinding: {
        assignmentId: "P2_WA_VACATUR_COMPLETENESS",
        controlBaseSha: P2_CONTROL_BASE,
        sourceBytesReopenedAndReverified: true,
        sourceHashesUnchanged: true
      }
    } : {}),
    doesNotEstablishCurrentEditionOrLegalApproval: true
  };
}

function writeBlakeVehicleStop(familyId, records, documents) {
  const out = outFor(familyId);
  assertOwnedOutput(familyId, out);
  fs.rmSync(absFor(out), { recursive: true, force: true });
  fs.mkdirSync(absFor(out), { recursive: true });
  const blake002 = documents.find((document) => document.formNumber === "BLAKE-002");
  const requiredEntry = records.worklist.reusableFamilyDeliverable
    ?.primaryOfficialFormOrComposedPleading?.entries?.find((entry) => /lfo_refund_claim/i.test(entry)) ?? null;
  writeJson(`${out}/source-receipt.json`, sourceReceipt(familyId, records, documents));
  writeJson(`${out}/source-vehicle-stop.json`, {
    schemaVersion: "rcap-source-vehicle-stop/v1", familyId, status: "STOPPED",
    stopClass: "SOURCE_VEHICLE_ROLE_MISMATCH", requiredVehicleRelationship: requiredEntry,
    heldSourceClaimedForThatRelationship: {
      formNumber: blake002?.formNumber ?? null, sha256: blake002?.expectedSha256 ?? null,
      observedTitleLines: blake002?.observedTitleLines ?? []
    },
    finding:
      "The worklist assigns BLAKE-002 as a separate lfo_refund_claim, but first-hand inspection of the pinned "
      + "BLAKE-002 bytes identifies it as the courts-of-limited-jurisdiction Blake Motion to Vacate Drug "
      + "Possession Conviction and Refund Paid LFO Amounts. It is an alternate-jurisdiction motion, not a "
      + "separate refund-claim vehicle. Treating it as both would misstate the packet topology.",
    whyBuildStopped:
      "C11 requires a stop when source identity or output vehicle is unresolved. No replacement form, role, or "
      + "inferred component was invented.",
    neededToResume: [
      "Correct the worklist relationship if BLAKE-002 is intended as the CLJ alternative to BLAKE-001, or",
      "identify and bind the actual separate LFO-refund claim source if one is required."
    ],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${out}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId,
    status: "NOT_REQUESTED_SOURCE_VEHICLE_STOP", generationAllowed: false,
    runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${out}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId, status: "STOPPED",
    reasonArtifact: `${out}/source-vehicle-stop.json`,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  return { familyId, status: "STOPPED", out };
}

function assertClosedState(label, value) {
  if (value?.generationAllowed !== false || value?.runtimeSelectable !== false
    || value?.commercialRoutesOpened !== 0) {
    fail(`${label} is not fail-closed`, JSON.stringify({
      generationAllowed: value?.generationAllowed,
      runtimeSelectable: value?.runtimeSelectable,
      commercialRoutesOpened: value?.commercialRoutesOpened
    }));
  }
}

function assertReceiptMatchesDocuments(familyId, receipt, documents) {
  if (receipt.familyId !== familyId || receipt.worklistGroupId !== familyId) {
    fail("source receipt family binding mismatch", familyId);
  }
  const expected = documents.map((document) => ({
    formNumber: document.formNumber, revision: document.revision,
    roleObservedFromSourceTitle: document.role, pathInArchive: document.pathInArchive,
    sha256: document.expectedSha256, byteLength: document.byteLength,
    pageCount: document.pageCount, acroFieldCountReadFromBytes: document.acroFieldCount
  })).sort((a, b) => a.formNumber.localeCompare(b.formNumber));
  const actual = (receipt.documents ?? []).map((document) => ({
    formNumber: document.formNumber, revision: document.revision,
    roleObservedFromSourceTitle: document.roleObservedFromSourceTitle,
    pathInArchive: document.pathInArchive, sha256: document.sha256,
    byteLength: document.byteLength, pageCount: document.pageCount,
    acroFieldCountReadFromBytes: document.acroFieldCountReadFromBytes
  })).sort((a, b) => a.formNumber.localeCompare(b.formNumber));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("source receipt does not match rebound source documents", familyId);
  }
}

function assertExactInventory(label, rows, expectedKeys, keyOf) {
  const keys = rows.map(keyOf);
  if (new Set(keys).size !== keys.length
    || JSON.stringify([...keys].sort()) !== JSON.stringify([...expectedKeys].sort())) {
    fail(`${label} inventory mismatch`, JSON.stringify({ expected: [...expectedKeys].sort(), actual: [...keys].sort() }));
  }
}

async function assertCompleteRenderInventory({ familyId, documents, census, fixtureManifest, actualWrites, rendered }) {
  const expectedKeys = documents.flatMap((document) => ["canonical", "boundary"]
    .map((fixture) => `${document.formNumber}|${fixture}`));
  assertExactInventory("fixture", fixtureManifest.fixtures ?? [], expectedKeys,
    (row) => `${row.document}|${row.fixture}`);
  assertExactInventory("actual-write", actualWrites.reports ?? [], expectedKeys,
    (row) => `${row.document}|${row.fixture}`);
  assertExactInventory("rendered artifact", rendered.artifacts ?? [], expectedKeys,
    (row) => `${row.document}|${row.fixture}`);
  assertExactInventory("raster", rendered.rasters ?? [], expectedKeys,
    (row) => `${row.document}|${row.fixture}`);
  if (fixtureManifest.canonicalAndBoundaryRequired !== true || rendered.allPagesRastered !== true) {
    fail("required fixture/raster inventory is not declared complete", familyId);
  }

  let pdfCount = 0;
  let rasterPageCount = 0;
  for (const artifact of rendered.artifacts) {
    const key = `${artifact.document}|${artifact.fixture}`;
    const document = documents.find((candidate) => candidate.formNumber === artifact.document);
    const censusDocumentRow = census.documents.find((candidate) => candidate.formNumber === artifact.document);
    const fixture = fixtureManifest.fixtures.find((candidate) =>
      candidate.document === artifact.document && candidate.fixture === artifact.fixture);
    const actual = actualWrites.reports.find((candidate) =>
      candidate.document === artifact.document && candidate.fixture === artifact.fixture);
    const raster = rendered.rasters.find((candidate) =>
      candidate.document === artifact.document && candidate.fixture === artifact.fixture);
    if (!document || !censusDocumentRow || !fixture || !actual || !raster) {
      fail("cross-report inventory relationship missing", key);
    }
    if (fixture.file !== artifact.file || fixture.sha256 !== artifact.sha256
      || fixture.sourceSha256 !== document.expectedSha256
      || artifact.deterministicSecondRenderSha256 !== artifact.sha256) {
      fail("fixture/rendered inventory binding mismatch", key);
    }
    const artifactAbs = assertOwnedOutput(familyId, artifact.file);
    if (!fs.existsSync(artifactAbs)) fail("rendered artifact missing", artifact.file);
    const artifactBytes = fs.readFileSync(artifactAbs);
    if (sha256(artifactBytes) !== artifact.sha256 || artifactBytes.length !== artifact.byteLength) {
      fail("rendered artifact byte/hash drift", artifact.file);
    }
    const artifactPdf = await PDFDocument.load(artifactBytes, { ignoreEncryption: true, updateMetadata: false });
    if (artifactPdf.getPageCount() !== artifact.pageCount
      || artifact.pageCount !== censusDocumentRow.pages.length) {
      fail("rendered artifact page inventory mismatch", key);
    }

    const { anchors } = anchorsFor(document, censusDocumentRow);
    const added = await addedInkOf(document.bytes, artifactBytes);
    const addedVectors = await addedVectorInkOf(document.bytes, artifactBytes);
    const routeMarkIds = routeMarkIdsFor(familyId, artifact.document);
    const recomputed = verifyAddedInk({ document, census: censusDocumentRow, anchors, added, addedVectors,
      report: actual, fixture: artifact.fixture, routeMarkIds });
    if (JSON.stringify(recomputed) !== JSON.stringify(actual)) {
      fail("actual-write report is not derived from current artifact bytes", key);
    }
    // Every added vector must be a route-determined election stroke, every
    // marked control must be a declared route election, and every declared
    // route election must actually be marked. A family with no route
    // elections keeps the original all-zero gate.
    if (actual.findings.length
      || actual.vectorPathsAdded !== (routeMarkIds.size ? actual.routeElectionVectorPaths : 0)
      || (routeMarkIds.size > 0 && actual.routeElectionVectorPaths === 0)
      || actual.selectionControlProofs.some((control) =>
        control.markedByBuild !== routeMarkIds.has(control.controlId))) {
      fail("protected-field proof is not clean", key);
    }
    for (const write of actual.written) {
      const writtenBlankId = /\[([^\]]+)\]\s*$/.exec(String(write.anchor ?? ""))?.[1] ?? null;
      const proof = actual.perAnchor.find((row) => row.factId === write.factId
        && (!writtenBlankId || row.blankId === writtenBlankId));
      const expectedValue = fixture.facts?.[write.factId];
      if (!proof || proof.textReadFromArtifact !== expectedValue) {
        fail("written value does not match byte-derived fixture proof", `${key}/${write.factId}`);
      }
    }

    const expectedPages = Array.from({ length: artifact.pageCount }, (_, index) => index + 1);
    if (JSON.stringify(raster.pages.map((page) => page.page)) !== JSON.stringify(expectedPages)) {
      fail("raster page inventory is incomplete or non-contiguous", key);
    }
    for (const page of raster.pages) {
      const pageAbs = assertOwnedOutput(familyId, page.file);
      if (!page.file.startsWith(`${raster.directory}/`) || !fs.existsSync(pageAbs)) {
        fail("raster page missing or outside declared directory", page.file);
      }
      const bytes = fs.readFileSync(pageAbs);
      const dimensions = pngDimensions(bytes);
      const sourcePage = censusDocumentRow.pages[page.page - 1];
      const expectedWidth = Math.round(sourcePage.width * RASTER_DPI / 72);
      const expectedHeight = Math.round(sourcePage.height * RASTER_DPI / 72);
      if (sha256(bytes) !== page.sha256 || bytes.length !== page.byteLength
        || page.dpi !== RASTER_DPI || page.pixelWidth !== dimensions.pixelWidth
        || page.pixelHeight !== dimensions.pixelHeight
        || dimensions.pixelWidth !== expectedWidth || dimensions.pixelHeight !== expectedHeight) {
        fail("raster page hash/byte/dimension/DPI inventory mismatch", page.file);
      }
      rasterPageCount += 1;
    }
    pdfCount += 1;
  }
  return { pdfCount, rasterPageCount };
}

async function checkFamily(familyId, records, sourceRoot) {
  const out = outFor(familyId);
  const documents = await loadDocuments(familyId, records, sourceRoot);
  const sourceReceiptPath = `${out}/source-receipt.json`;
  if (!fs.existsSync(absFor(sourceReceiptPath))) fail("source receipt missing", sourceReceiptPath);
  const receipt = readJson(sourceReceiptPath);
  assertReceiptMatchesDocuments(familyId, receipt, documents);

  if (familyId === ANCHOR_FAMILY) {
    const required = ["source-receipt.json", "source-vehicle-stop.json", "approval-request.json", "build-status.json"];
    for (const rel of required) {
      const file = `${out}/${rel}`;
      if (!fs.existsSync(absFor(file))) fail("stopped-family evidence missing", file);
      readJson(file);
    }
    const stop = readJson(`${out}/source-vehicle-stop.json`);
    const approval = readJson(`${out}/approval-request.json`);
    const status = readJson(`${out}/build-status.json`);
    assertClosedState("Blake source-vehicle stop", stop);
    assertClosedState("Blake approval state", approval);
    assertClosedState("Blake build status", status);
    const blake002 = documents.find((document) => document.formNumber === "BLAKE-002");
    if (stop.status !== "STOPPED" || status.status !== "STOPPED"
      || stop.requiredVehicleRelationship !== "lfo_refund_claim: Blake-002"
      || stop.heldSourceClaimedForThatRelationship?.sha256 !== blake002?.expectedSha256) {
      fail("invalid Blake source-vehicle stop artifact");
    }
    return { familyId, status: "STOPPED_CHECKED", filesChecked: required.length + documents.length };
  }

  const required = [
    "source-receipt.json", "field-census.census-v1.json", "production-field-map.json",
    "product-wiring.json",
    "fixtures/fixture-manifest.json", "reports/actual-writes.json",
    "reports/protection-report.json", "participant-completion-instructions.json",
    "filing-obligations.json",
    "reports/rendered-artifacts.json", "approval-request.json", "build-findings.json", "build-status.json"
  ];
  for (const rel of required) {
    const file = `${out}/${rel}`;
    if (!fs.existsSync(absFor(file))) fail("required family artifact missing", file);
    readJson(file);
  }
  const census = readJson(`${out}/field-census.census-v1.json`);
  const fieldMap = readJson(`${out}/production-field-map.json`);
  const productWiring = readJson(`${out}/product-wiring.json`);
  const fixtureManifest = readJson(`${out}/fixtures/fixture-manifest.json`);
  const actualWrites = readJson(`${out}/reports/actual-writes.json`);
  const protection = readJson(`${out}/reports/protection-report.json`);
  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  const approval = readJson(`${out}/approval-request.json`);
  const findings = readJson(`${out}/build-findings.json`);
  const status = readJson(`${out}/build-status.json`);
  for (const [label, value] of [["field map", fieldMap], ["product wiring", productWiring],
    ["actual writes", actualWrites],
    ["protection report", protection], ["rendered artifacts", rendered],
    ["approval request", approval], ["build status", status]]) assertClosedState(label, value);
  const routeFamily = routeElectionFamily(familyId);
  const selectionMarkingClean = routeFamily
    ? (protection.selectionControlsMarked === true
      && protection.selectionControlsMarkedOutsideApprovedRouteElections === false
      && protection.routeElections?.routeSelectionId === routeFamily.routeSelectionId)
    : protection.selectionControlsMarked === false;
  if (status.status !== "BUILT_EVIDENCE_ONLY" || findings.status !== "NO_BLOCKING_ARTIFACT_FINDINGS"
    || findings.blocking?.length || actualWrites.blockingFindings?.length
    || !selectionMarkingClean) {
    fail("family evidence is not clean and fail-closed", familyId);
  }
  if ((fieldMap.explicitSafetyPolicy?.neverWritten ?? []).some((entry) => /date of birth|conviction date/i.test(entry))) {
    fail("field-map policy incorrectly protects a held filing fact", familyId);
  }

  for (const document of documents) {
    const routeMarkIds = routeMarkIdsFor(familyId, document.formNumber);
    const fresh = await censusDocument(document, routeMarkIds);
    if (fresh.selectionControls.some((control) => control.observedState !== "unmarked")) {
      fail("pinned source contains a pre-marked selection control", document.formNumber);
    }
    resolveRouteElectionMarks(familyId, document, fresh);
    const stored = census.documents.find((candidate) => candidate.formNumber === document.formNumber);
    const comparableStored = stored ? { pages: stored.pages, blanks: stored.blanks,
      selectionControls: stored.selectionControls, unresolvedVisibleFields: stored.unresolvedVisibleFields } : null;
    const comparableFresh = { pages: fresh.pages, blanks: fresh.blanks,
      selectionControls: fresh.selectionControls, unresolvedVisibleFields: fresh.unresolvedVisibleFields };
    if (JSON.stringify(comparableStored) !== JSON.stringify(comparableFresh)) {
      fail("stored first-hand census does not match rebound source bytes", document.formNumber);
    }
    const currentMap = anchorsFor(document, fresh);
    const storedMap = fieldMap.documents.find((candidate) => candidate.formNumber === document.formNumber);
    if (!storedMap || JSON.stringify(storedMap.writableAnchors) !== JSON.stringify(currentMap.anchors)
      || JSON.stringify(storedMap.withheld) !== JSON.stringify(currentMap.withheld)
      || JSON.stringify(storedMap.explicitGeometryRefusals) !== JSON.stringify(fresh.unresolvedVisibleFields)) {
      fail("stored field map does not match rebound source census", document.formNumber);
    }
    if (storedMap.writableAnchors.some((anchor) => {
      const identity = `${anchor.factId} ${anchor.printedCaption}`;
      const protectedExecutionDate = /\b(?:dated|signed on|signature date|execution date)\b/i.test(identity)
        && !new Set(["participant.date_of_birth", "matter.conviction_date"]).has(anchor.factId);
      return protectedExecutionDate || /signature|service certification|prosecutor|clerk|judge/i.test(identity);
    })) {
      fail("stored field map allows a protected fact", document.formNumber);
    }
    const protectionRow = protection.documents.find((candidate) => candidate.formNumber === document.formNumber);
    const expectedUnmarked = fresh.selectionControls.length - routeMarkIds.size;
    if (!protectionRow || protectionRow.selectionControlsObserved !== fresh.selectionControls.length
      || protectionRow.selectionControlsLeftUnmarked !== expectedUnmarked
      || protectionRow.fixtureProofs?.length !== 2
      || protectionRow.fixtureProofs.some((proof) =>
        proof.controlsMarked !== routeMarkIds.size
        || proof.controlsProvedUnmarked !== expectedUnmarked
        || (routeMarkIds.size === 0
          ? proof.vectorPathsAdded !== 0
          : (proof.vectorPathsAdded !== proof.routeElectionVectorPaths
            || proof.routeElectionVectorPaths === 0
            || proof.controlsMarkedForRouteElection !== routeMarkIds.size)))
      || (routeMarkIds.size > 0
        && JSON.stringify(protectionRow.routeElectionControlIds ?? null) !== JSON.stringify([...routeMarkIds].sort()))) {
      fail("selection-control protection inventory mismatch", document.formNumber);
    }
  }

  const inventory = await assertCompleteRenderInventory({ familyId, documents, census,
    fixtureManifest, actualWrites, rendered });
  if (status.fixtureCount !== inventory.pdfCount || status.rasterPageCount !== inventory.rasterPageCount
    || approval.canonicalAndBoundaryFixturesBuilt !== true || approval.allPagesRastered !== true
    || approval.artifactLevelWriteVerificationPassed !== true) {
    fail("build-status/approval inventory mismatch", familyId);
  }
  return { familyId, status: "CHECKED",
    filesChecked: required.length + documents.length + inventory.pdfCount + inventory.rasterPageCount };
}

// ---------------------------------------------------------------------------
// Participant filing obligations (FIX10 / FABLE-R21).
//
// Independent verification failed every family on this host for FILING_DESTINATION,
// FEE_AND_WAIVER and SERVICE, on one sentence this file used to write into
// participant-completion-instructions.json: "Confirm local filing, notice,
// service, fee, and hearing requirements with the sentencing court before
// filing. The route controls record local variation as unresolved." That names
// no court, no fee, no waiver route, no recipient and no method, and it says the
// route controls record as unresolved facts the route controls in fact record.
//
// DET-FEE-AND-WAIVER-001 governs how those obligations are scored:
//   A1  where the repository establishes a fact, the packet STATES it; only
//       where nothing establishes it may a NAMED CHECKABLE AUTHORITY stand in.
//   A2  the repository is wider than the family's own bound PDFs.
//   A3  holding is per FACT and per ROUTE, not per document.
//   A4  a packet may never tell a participant that it does not state something
//       it does state.
//
// So this block derives the three obligations from committed route data rather
// than gesturing at them, and it is one generic derivation for every family on
// this host: nothing here is keyed to a family id. Where the route record
// carries the fact, the fact is stated. Where it does not, the authority named
// is the destination the same route record carries — not a phrase.
//
// It invents no law. No fee figure, no waiver rule and no service recipient
// appears here that is not read out of a committed record or measured from
// pinned source bytes at build time.

// The two official Washington instruction sheets, chosen by the form series the
// family actually binds and pinned by the SHA-256 in the committed corpus index
// (data/rcap-all50/local-source-corpus-index.json). Every quoted sentence was
// read first-hand from these exact bytes; the build re-hashes the file and
// refuses to quote a sheet whose bytes have moved, so a revision fails loudly
// instead of silently restating a superseded rule.
//
// A3 is why this is a per-series table and not one sheet for the state: CrRLJ
// 09.0300 is captioned "Instructions for Vacating Misdemeanor and Gross
// Misdemeanor Convictions" and CR 08.0930 "Vacating Record of Felony
// Conviction". Applying either across the divide would be the sibling-route
// inference A3 forbids.
const WA_INSTRUCTION_SHEETS = [
  {
    appliesToFormSeries: "CRRLJ-09.",
    formNumber: "CrRLJ 09.0300",
    title: "Instructions for Vacating Misdemeanor and Gross Misdemeanor Convictions",
    revision: "07/2022",
    sha256: "42ac9ccb16474172ee3b4076b416e9d949c2dfdbb43edc0cdc734eca299f4176",
    corpusPath: "STATES/WA/03_INSTRUCTIONS/WA__INSTRUCTIONS__CRRLJ-09.0300__crrlj-09-0300-crrlj-09-0300-"
      + "instructvacatemisdconvictions-2022-07-2__REV-2022-07__EN.pdf",
    courtsCovered: "Washington courts of limited jurisdiction — the district or municipal court that sentenced you",
    quoted: {
      scheduleThenFile: "To schedule a hearing, contact the clerk of the court where you were sentenced and ask "
        + "for the date and time for the hearing.",
      whereTheOriginalGoes: "File the original petition and declaration, and the original notice document with "
        + "the clerk of the court.",
      service: "On the same day that you file those documents with the clerk of the court, you must also provide "
        + "a copy of each document (the petition and declaration, and the scheduling notice) to the prosecuting "
        + "attorney’s office that prosecuted you.",
      copies: "make at least 2 copies (1 copy for the prosecutor’s office and 1 copy for yourself)",
      localRequirements: "Read the local court rules or contact the clerk of the court where you will file your "
        + "petition to find out if this requirement or any other local requirement applies to you."
    },
    prosecutorDirectory: null
  },
  {
    appliesToFormSeries: "CR-08.",
    formNumber: "CR 08.0930",
    title: "Vacating Record of Felony Conviction (information sheet)",
    revision: "01/2023",
    sha256: "17e2fdfceb0823387f25dd285276c2b06778f73e10d76180dfb2ee2d6f030a00",
    corpusPath: "STATES/WA/03_INSTRUCTIONS/WA__INSTRUCTIONS__CR-08.0930__"
      + "information-sheet-vacating-record-of-felony-conviction__REV-2023-01__EN.pdf",
    courtsCovered: "the Washington superior court in which you were convicted",
    quoted: {
      scheduleThenFile: "To schedule a hearing, contact the clerk of the court where you were sentenced and ask "
        + "for the date and time for the hearing.",
      whereTheOriginalGoes: "If you want to have a record of felony conviction vacated, you must file a motion "
        + "with the court in which you were convicted.",
      service: "On the same day that you file those documents with the clerk of the court, you must also provide "
        + "a copy of the motion and notice documents to the prosecuting attorney’s office that prosecuted you.",
      copies: "Once you have completed and signed the motion and declaration form, make at least two copies.",
      localRequirements: "Read the local court rules or contact the clerk of the court where you will file your "
        + "motion to find out if these requirements, or any other local requirements, apply to you."
    },
    prosecutorDirectory: {
      quoted: "You can find the address and phone number of the Prosecutor’s Office here: "
        + "https://waprosecutors.org/prosecutordirectory/",
      url: "https://waprosecutors.org/prosecutordirectory/"
    }
  }
];

// Money language, for the measurement below. Deliberately wide: a false
// positive costs a build and a reading; a false negative ships a packet that
// denies a fee its own source prints, which is the A4 defect.
const MONEY_LANGUAGE = /\bfees?\b|\bwaiv\w*\b|\bcosts?\b|\$\s*\d/i;

/** Every line of a pinned PDF that carries money language, read from its own content stream. */
function measuredMoneyLines(pdf) {
  const lines = [];
  for (const page of pdf.getPages()) {
    for (const line of groupIntoLines(extractTextItems(page))) {
      const text = cleanText(line.text ?? "");
      if (text && MONEY_LANGUAGE.test(text)) lines.push(text);
    }
  }
  return lines;
}

// Where a fee answer was looked for and not found, beyond what the build can
// measure. These are readings of committed records, recorded as data with the
// exact strings that were found, so a later lane can check the reading rather
// than repeat the hunt. A3 is the reason each one does not answer the question.
const WA_FEE_REPOSITORY_SEARCH = [
  {
    record: "src/lib/rcap-engine/compiled/profiles/WA-washington.json",
    countsAsHeldUnder: "DET-FEE-AND-WAIVER-001-A2 (the compiled state profile, named as a requiredSourceId by the "
      + "route obligation census for these routes)",
    found: "Three fee statements, all Washington State Patrol criminal-history record fees: WATCH online "
      + "name/DOB check $11; mail conviction CHRI request $32; fingerprint-card CHRI request $58; notarized "
      + "letter additional $15; non-conviction CHRI copy fingerprint card plus $12; in-person non-conviction "
      + "record review no fee.",
    answersThisRoutesQuestion: false,
    why: "Those are the fees WSP charges to give a person their own criminal-history record. The obligation here "
      + "is the fee a court charges to file a petition or motion to vacate. Under A3 holding is per fact: a "
      + "record that prices a different transaction does not price this one."
  },
  {
    record: "src/lib/rcap/state-packs/washington/fee-notes.ts",
    countsAsHeldUnder: "coded state-pack research",
    found: "\"Court filing-fee practices for vacation petitions (CrRLJ/CR forms) and juvenile sealing motions "
      + "vary by county and court — confirm the current filing fee or fee-waiver process with the clerk "
      + "(source gap — no fixed court filing-fee amount stated in the Nationwide source).\"",
    answersThisRoutesQuestion: false,
    why: "The state pack records the gap rather than closing it, and names the same authority this packet names. "
      + "It corroborates that nothing is held; it establishes no amount."
  },
  {
    record: "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json",
    countsAsHeldUnder: "DET-FEE-AND-WAIVER-001-A2 (the committed packet-set worklist)",
    found: "filingFee and feeWaiverTreatment both carry status not_recorded on every route on this host.",
    answersThisRoutesQuestion: false,
    why: "A recorded non-establishment is not an answer. Publishing it as one would invert A1."
  }
];

function instructionSheetFor(documents) {
  const matches = WA_INSTRUCTION_SHEETS.filter((sheet) =>
    documents.some((document) => String(document.formNumber).startsWith(sheet.appliesToFormSeries)));
  if (matches.length > 1) {
    fail("family binds forms from two instruction-sheet series",
      matches.map((sheet) => sheet.formNumber).join(", "));
  }
  return matches[0] ?? null;
}

// Read the sheet from the pinned corpus and prove its bytes before quoting it,
// then prove by measurement that it states no fee. The quotes above are a
// first-hand reading; this makes the build refuse to keep repeating them if the
// bytes they were read from ever change.
async function verifiedInstructionSheet(documents, sourceRoot) {
  const sheet = instructionSheetFor(documents);
  if (!sheet) return null;
  const abs = safeSourcePath(sourceRoot, sheet.corpusPath);
  if (!fs.existsSync(abs)) fail("pinned official instruction sheet is absent from the corpus", sheet.corpusPath);
  const bytes = fs.readFileSync(abs);
  const digest = sha256(bytes);
  if (digest !== sheet.sha256) {
    fail("official instruction sheet bytes moved from the committed corpus index",
      `${sheet.formNumber}: ${digest}`);
  }
  const indexRow = readJson(CORPUS_INDEX).entries.find((entry) => entry.path === sheet.corpusPath);
  if (!indexRow || indexRow.sha256 !== sheet.sha256) {
    fail("official instruction sheet is not pinned by the committed corpus index", sheet.corpusPath);
  }
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const moneyLines = measuredMoneyLines(pdf);
  return {
    ...sheet,
    measuredSha256: digest,
    pageCount: pdf.getPageCount(),
    statesNoFeeOrWaiver: moneyLines.length === 0,
    moneyLinesMeasured: moneyLines
  };
}

function deliverableOf(records, key) {
  const merged = new Map();
  const push = (row) => {
    if (!row || row.status !== "recorded") return;
    for (const entry of row.entries ?? []) {
      const text = cleanText(String(entry).replaceAll("\n", " "));
      if (text && text !== "not recorded") merged.set(text, true);
    }
  };
  for (const route of records.worklist.routes ?? []) push(route.deliverable?.[key]);
  push(records.worklist.reusableFamilyDeliverable?.[key]);
  const recorded = (records.worklist.routes ?? []).some((route) => route.deliverable?.[key]?.status === "recorded")
    || records.worklist.reusableFamilyDeliverable?.[key]?.status === "recorded";
  return { recorded, entries: [...merged.keys()] };
}

function routeCensusRowsFor(records) {
  const census = readJson(ROUTE_CENSUS);
  return records.worklist.routeKeys.map((routeKey) => {
    const row = census.routes.find((candidate) => candidate.routeKey === routeKey);
    if (!row) fail("route is absent from the committed route obligation census", routeKey);
    return row;
  });
}

// The three obligations, derived. Each carries `established`, which is the A1
// test applied to committed data, and either a stated fact or a named authority
// — never a gesture, and never both a claim of silence and a stated fact, which
// is the A4 trap.
function filingObligationsFor({ familyId, records, documents, sheet }) {
  const routeRows = routeCensusRowsFor(records);
  const destinations = routeRows
    .map((row) => row.destination)
    .filter((destination) => destination && destination.name);
  const destinationDeliverable = deliverableOf(records, "filingDestination");
  if (!destinations.length && !destinationDeliverable.recorded) {
    fail("no committed record establishes this route's filing destination", familyId);
  }
  const authority = destinations[0]?.name
    ?? "the clerk of the court recorded as this route's filing destination";

  const feeDeliverable = deliverableOf(records, "filingFee");
  const waiverDeliverable = deliverableOf(records, "feeWaiverTreatment");
  const recipients = deliverableOf(records, "serviceRecipients");
  const methodDeliverable = deliverableOf(records, "serviceMethod");
  const timingDeliverable = deliverableOf(records, "serviceTiming");

  const boundMoneyLines = [];
  for (const document of documents) {
    for (const line of document.moneyLines ?? []) {
      boundMoneyLines.push({ formNumber: document.formNumber, line });
    }
  }
  // A4, enforced rather than trusted. If a bound form or the route's own
  // instruction sheet prints money language while the packet is about to say no
  // held source states a fee, the packet would be denying what it delivers.
  const feeIsHeld = feeDeliverable.recorded || waiverDeliverable.recorded;
  if (!feeIsHeld && (boundMoneyLines.length || (sheet && !sheet.statesNoFeeOrWaiver))) {
    fail("a delivered source prints money language while the packet would report none held",
      JSON.stringify({ boundMoneyLines, sheetMoneyLines: sheet?.moneyLinesMeasured ?? [] }));
  }

  return {
    schemaVersion: "rcap-participant-filing-obligations/v1",
    familyId,
    derivedFrom: {
      routeCensus: ROUTE_CENSUS,
      worklist: WORKLIST,
      officialInstructionSheet: sheet
        ? { formNumber: sheet.formNumber, revision: sheet.revision, sha256: sheet.measuredSha256,
          corpusPath: sheet.corpusPath, pageCount: sheet.pageCount,
          rehashedAtBuild: true, statesNoFeeOrWaiver: sheet.statesNoFeeOrWaiver }
        : null,
      boundSourceDocuments: documents.map((document) => ({
        formNumber: document.formNumber, sha256: document.expectedSha256,
        moneyLanguageMeasured: (document.moneyLines ?? []).length
      }))
    },
    standard: "DET-FEE-AND-WAIVER-001 with amendments A1, A2, A3 and A4",
    obligations: {
      FILING_DESTINATION: {
        established: true,
        basis: "the committed route obligation census records this route's destination, and the committed "
          + "worklist records it a second time",
        statement: destinations.map((destination) => ({
          kind: destination.kind, name: destination.name, detail: destination.detail
        })),
        alsoRecordedInWorklist: destinationDeliverable.entries,
        ...(sheet ? { corroboratedBy: `${sheet.formNumber}: ${sheet.quoted.whereTheOriginalGoes}` } : {}),
        namedCheckableAuthority: null,
        whyNotAnAuthority: "A1 as read by its own amendment: naming an authority is what honesty requires when "
          + "the record is empty; it is not a way to avoid stating what the record contains."
      },
      FEE_AND_WAIVER: {
        established: feeIsHeld,
        ...(feeIsHeld
          ? {
            basis: "the committed worklist records this route's filing fee and/or fee-waiver treatment",
            statement: [...feeDeliverable.entries, ...waiverDeliverable.entries]
          }
          : {
            basis: "no committed record establishes a court filing fee or a fee-waiver route for this route",
            whatWasSearched: [
              ...(documents.map((document) =>
                ({ record: `bound source ${document.formNumber} (${document.expectedSha256})`,
                  countsAsHeldUnder: "the family's own bound source documents",
                  found: "no fee, waiver or cost language; measured from the pinned content stream at build time",
                  answersThisRoutesQuestion: false,
                  why: "the form's face does not price the filing" }))),
              ...(sheet
                ? [{ record: `${sheet.formNumber} (${sheet.measuredSha256})`,
                  countsAsHeldUnder: "the official Washington instruction sheet for this route's form series, "
                    + "pinned by the committed corpus index",
                  found: "no fee, waiver or cost language anywhere on the sheet; measured from the pinned bytes "
                    + "at build time",
                  answersThisRoutesQuestion: false,
                  why: "the court system's own instructions for this route are silent on cost" }]
                : []),
              ...WA_FEE_REPOSITORY_SEARCH
            ],
            namedCheckableAuthority: {
              name: authority,
              howToReachIt: "the clerk's office of the court identified under FILING_DESTINATION, which is the "
                + "court named in the caption of your judgment and on the docket for the case",
              answersWhichQuestions: [
                "whether a filing fee applies to this petition or motion in that court",
                "the amount if one applies",
                "whether a fee waiver is available and how to apply for it"
              ],
              ...(sheet ? { theSameOfficeTheOfficialInstructionsDirectYouTo: sheet.quoted.scheduleThenFile } : {})
            },
            refusalToInvent: "No amount is stated because no held record states one. A named office the "
              + "participant can actually reach is the complete deliverable here; a plausible figure would not be."
          })
      },
      SERVICE: {
        established: recipients.recorded && Boolean(sheet),
        recipient: {
          established: recipients.recorded,
          basis: "the committed worklist records this route's service recipients",
          statement: recipients.entries,
          ...(sheet ? { corroboratedBy: `${sheet.formNumber}: ${sheet.quoted.service}` } : {})
        },
        methodAndTiming: sheet
          ? {
            established: true,
            basis: `${sheet.formNumber}, the official Washington instruction sheet for this route's form series, `
              + "rehashed against the committed corpus index at build time",
            statement: sheet.quoted.service,
            copies: sheet.quoted.copies,
            worklistStatus: {
              serviceMethod: methodDeliverable.recorded ? "recorded" : "not_recorded",
              serviceTiming: timingDeliverable.recorded ? "recorded" : "not_recorded"
            },
            note: "The worklist does not record the method or the timing. The route's own official instruction "
              + "sheet does, so under A1 the packet states it rather than naming an authority to ask."
          }
          : {
            established: false,
            basis: "no official instruction sheet is held for this route's form series",
            namedCheckableAuthority: { name: authority }
          },
        ...(sheet?.prosecutorDirectory
          ? { howToReachTheRecipient: {
            statement: sheet.prosecutorDirectory.quoted,
            url: sheet.prosecutorDirectory.url,
            source: `${sheet.formNumber}`,
            a3Note: "Named only for the form series whose own instruction sheet prints it; it is not carried "
              + "across to the other series."
          } }
          : {})
      }
    },
    grantsNothing: "Stating an obligation is not legal approval, does not promote this family and opens no "
      + "commercial route.",
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  };
}

// Participant-facing sentences for participant-completion-instructions.json,
// built from the derived block. This is the sentence the verifiers failed,
// replaced by what the route record actually holds.
const asSentence = (text) => {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};
const joinSentences = (parts) => parts.map(asSentence).filter(Boolean).join(" ");
/** "Clerk of the sentencing court" reads as an office mid-sentence, not a name. */
const asOfficePhrase = (name) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return trimmed;
  if (/^the\b/i.test(trimmed)) return trimmed;
  return `the ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
};

function filingObligationSentences(obligations) {
  const destination = obligations.obligations.FILING_DESTINATION;
  const fee = obligations.obligations.FEE_AND_WAIVER;
  const service = obligations.obligations.SERVICE;
  const lines = [];

  const where = joinSentences(destination.statement
    .map((row) => (row.detail ? `${row.name} — ${asSentence(row.detail)}` : row.name)));
  lines.push(`Where to file: ${where} This packet states the court because the route record names it; `
    + "identify your own court from the caption of your judgment and the docket for the case.");

  if (fee.established) {
    lines.push(`Filing fee and fee waiver: ${joinSentences(fee.statement)}`);
  } else {
    const named = fee.namedCheckableAuthority;
    lines.push("Filing fee and fee waiver: no source held in this repository — not the forms in this packet, "
      + "not the official instruction sheet for them — states a filing fee for this route, and this packet does "
      + `not invent one. Ask ${asOfficePhrase(named.name)}: ${named.answersWhichQuestions.join("; ")}. `
      + "Do not rely on a fee amount from any other source, including this packet.");
  }

  const recipient = joinSentences(service.recipient.statement);
  if (service.methodAndTiming.established) {
    lines.push(joinSentences([
      `Who must be served, and how: ${recipient}`,
      service.methodAndTiming.statement,
      service.howToReachTheRecipient?.statement
    ].filter(Boolean)));
  } else {
    lines.push(`Who must be served, and how: ${recipient} The method and timing are not established by a held `
      + `source for this route; ask ${asOfficePhrase(service.methodAndTiming.namedCheckableAuthority.name)}.`);
  }

  lines.push("What is genuinely unresolved is narrower than the three statements above, and this packet no longer "
    + "asks you to confirm them: whether the court requires criminal-history records or other documents "
    + "attached, and the local hearing-scheduling practice. Read the local court rules or ask the clerk named "
    + "above.");
  return lines;
}

// The obligations the participant-facing markdown must carry. A committed file
// is verified rather than overwritten, so a lane's better, source-cited prose is
// never flattened by a rebuild; a missing file is generated, so the silent form
// of this defect — a packet that ships no instructions at all — cannot return.
function instructionCoverageOf(markdown) {
  return {
    FILING_DESTINATION: /sentencing court|sentencing superior court|sentencing district|sentencing municipal|court (where|that) (you were )?sentenced|court in which you were convicted/i
      .test(markdown),
    FEE_AND_WAIVER: /\bfees?\b/i.test(markdown) && /\bclerk\b/i.test(markdown),
    SERVICE: /prosecut/i.test(markdown)
      && /\bserve\b|\bservice\b|provide a copy|receive a copy|copy of each document/i.test(markdown),
    SELF_HELP_STOP: /lawyer|attorney|court facilitator|legal aid/i.test(markdown)
      && /stop here|self-help ends|get help/i.test(markdown)
  };
}

function renderParticipantInstructions({ familyId, records, documents, obligations, sheet }) {
  const routeRows = routeCensusRowsFor(records);
  const label = routeRows[0]?.publicLabel ?? familyId;
  const statute = routeRows[0]?.statuteOrAuthority ?? null;
  const sentences = filingObligationSentences(obligations);
  const fee = obligations.obligations.FEE_AND_WAIVER;
  const service = obligations.obligations.SERVICE;
  const destination = obligations.obligations.FILING_DESTINATION;

  const lines = [];
  lines.push(`# Filing instructions — ${label} (Washington)`);
  lines.push("");
  lines.push(`Family: \`${familyId}\` · Route: \`${records.worklist.routeKeys.join("`, `")}\``
    + (statute ? ` · Statute: ${statute}` : ""));
  lines.push("Status: **EVIDENCE_ONLY_NOT_APPROVED_FOR_DELIVERY** — this packet has not received legal or visual "
    + "approval and is not a substitute for either.");
  lines.push("");
  lines.push("This packet prepares the following official Washington Courts forms:");
  lines.push("");
  for (const document of documents) {
    lines.push(`- **${document.formNumber}** — \`${document.expectedSha256}\``);
  }
  lines.push("");
  lines.push("## Where to file");
  lines.push("");
  for (const row of destination.statement) {
    lines.push(`${row.name}. ${row.detail ?? ""}`.trim());
  }
  lines.push("");
  lines.push("Identify your own court from the caption of your judgment and the docket for the case.");
  if (sheet) lines.push(`(${sheet.formNumber}: ${sheet.quoted.whereTheOriginalGoes})`);
  lines.push("");
  lines.push("## Filing fee and fee waiver");
  lines.push("");
  lines.push(fee.established
    ? fee.statement.join(" ")
    : `${sentences[1]}`);
  lines.push("");
  lines.push("## Who must be served, and how");
  lines.push("");
  lines.push(sentences[2]);
  lines.push("");
  lines.push("## Required attachments and local variation");
  lines.push("");
  lines.push(sentences[3]);
  if (sheet) lines.push(`(${sheet.formNumber}: ${sheet.quoted.localRequirements})`);
  lines.push("");
  lines.push("## Where self-help ends");
  lines.push("");
  lines.push("Stop here and get help from a lawyer or a court facilitator if any of the following is true:");
  lines.push("");
  lines.push("- you are not sure this is the correct route or the correct court for your case;");
  lines.push("- you are not sure you meet this route's eligibility conditions;");
  lines.push("- the prosecuting attorney objects; or");
  lines.push("- anything in your court record does not match what this packet shows.");
  lines.push("");
  lines.push("This packet is prepared evidence, not legal advice. It does not decide your eligibility, it never "
    + "signs or dates a declaration for you, and it never writes a sworn narrative for you. The judge decides; "
    + "the findings, order and clerk's sections belong to the court.");
  lines.push("");
  lines.push("## Sources for every statement above");
  lines.push("");
  lines.push("| Source | SHA-256 |");
  lines.push("| --- | --- |");
  for (const document of documents) lines.push(`| ${document.formNumber} | \`${document.expectedSha256}\` |`);
  if (sheet) {
    lines.push(`| ${sheet.formNumber}, ${sheet.title} (${sheet.revision}) | \`${sheet.measuredSha256}\` |`);
  }
  lines.push("");
  lines.push("Every hash above was recomputed from the pinned corpus during this build.");
  lines.push("");
  return `${lines.join("\n")}`;
}

async function buildOfficialFamily(familyId, records, documents) {
  const out = outFor(familyId);
  const censused = [];
  for (const document of documents) {
    const routeMarkIds = routeMarkIdsFor(familyId, document.formNumber);
    const census = await censusDocument(document, routeMarkIds);
    const preMarked = census.selectionControls.filter((control) => control.observedState !== "unmarked");
    if (preMarked.length) {
      fail("pinned official source contains a pre-marked selection control",
        `${document.formNumber}: ${preMarked.map((control) => control.id).join(", ")}`);
    }
    const routeMarks = resolveRouteElectionMarks(familyId, document, census);
    const { anchors, withheld } = anchorsFor(document, census);
    censused.push({ document, census, anchors, withheld, routeMarkIds, routeMarks,
      protectedRules: protectedRulesFor(census) });
  }

  const productWiringPath = `${out}/product-wiring.json`;
  const preservedProductWiring = fs.existsSync(absFor(productWiringPath))
    ? readJson(productWiringPath)
    : jsonAtRevision(P2_CONTROL_BASE, productWiringPath);
  // participant-instructions.md is filing guidance beside the packet, not a
  // rendered artifact; a rebuild must not delete it (FIX10). Preserving it is
  // no longer the whole story: see the filing-obligations write below, which
  // generates one where none exists and verifies one that does.
  const participantInstructionsPath = `${out}/participant-instructions.md`;
  const preservedParticipantInstructions = fs.existsSync(absFor(participantInstructionsPath))
    ? fs.readFileSync(absFor(participantInstructionsPath), "utf8")
    : null;
  const routeOptionsBlockPath = `${out}/route-options-block.json`;
  const preservedRouteOptionsBlock = fs.existsSync(absFor(routeOptionsBlockPath))
    ? readJson(routeOptionsBlockPath)
    : null;
  fs.rmSync(assertOwnedOutput(familyId, out), { recursive: true, force: true });
  fs.mkdirSync(absFor(out), { recursive: true });
  if (preservedParticipantInstructions !== null) {
    fs.writeFileSync(absFor(participantInstructionsPath), preservedParticipantInstructions);
  }
  if (preservedRouteOptionsBlock !== null) {
    writeJson(routeOptionsBlockPath, preservedRouteOptionsBlock);
  }
  writeJson(`${out}/source-receipt.json`, sourceReceipt(familyId, records, documents));
  writeJson(`${out}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId, jurisdiction: "WA",
    structuralClass: STRUCTURAL_CLASS,
    censusBasis: "first_hand_content_stream_measurement_of_exact_sha256_pinned_source_bytes",
    geometryBasis:
      "underscore leader glyph coordinates and horizontal path-rule coordinates read from each PDF content stream; "
      + "decoded CTM-aware vector boxes and printed checkbox/radio glyph bounds are censused separately; "
      + "captions are measured separately and never supply writable geometry without a measured cell boundary",
    documents: censused.map(({ document, census }) => ({
      formNumber: document.formNumber, role: document.role, sha256: document.expectedSha256,
      pages: census.pages, blankCount: census.blanks.length,
      selectionControlCount: census.selectionControls.length, blanks: census.blanks,
      selectionControls: census.selectionControls,
      unresolvedVisibleFields: census.unresolvedVisibleFields
    }))
  });
  writeJson(`${out}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId,
    mappingScope: "Washington-only source-specific participant and case facts",
    explicitSafetyPolicy: {
      writesAllowed: [
        "caption court, county/city, plaintiff, defendant name, and case number",
        "participant print name, date of birth, mailing address, and email",
        "conviction date and measured count, offense, and RCW cells",
        "CR-08 caption-band county with recorded suffix normalization"
      ],
      possibleParticipantContactWrites:
        "Only a separately captioned participant contact blank outside declarations/signature blocks; none is inferred from layout alone.",
      neverWritten: [
        routeElectionFamily(familyId)
          ? "legal elections or checkboxes, other than the route-determined election(s) recorded under routeElections"
          : "legal elections or checkboxes",
        "participant-authored narratives", "signatures",
        "signature and execution dates", "service certifications", "prosecutor or attorney fields",
        "court findings or judicial reasons", "money or refund amounts"
      ],
      courtOrdersAcceptKnownCaseFactsOnly: true
    },
    ...(routeElectionFamily(familyId) ? {
      routeElections: {
        routeSelectionId: routeElectionFamily(familyId).routeSelectionId,
        basis: "Route-determined elections read first-hand from the pinned form face and marked with two diagonal "
          + "strokes inside the printed control's measured bounds (FIX10). Case-dependent elections are never marked.",
        marks: censused.flatMap(({ document, routeMarks }) => routeMarks.map(({ spec, control }) => ({
          formNumber: document.formNumber, controlId: control.id, page: control.page,
          geometry: control.geometry, printedContext: control.printedContext, why: spec.why
        })))
      }
    } : {}),
    valueNormalization: {
      "matter.county":
        "For CR-08 caption blanks following the source text 'County of', strip a trailing 'County' designator "
        + "from the fact before rendering so 'King County' prints as 'County of King', not 'County of King County'."
    },
    documents: censused.map(({ document, census, anchors, withheld }) => ({
      formNumber: document.formNumber, role: document.role, sourceSha256: document.expectedSha256,
      writableAnchors: anchors, withheldBlankCount: withheld.length, withheld,
      explicitGeometryRefusals: census.unresolvedVisibleFields
    })),
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(productWiringPath, preservedProductWiring);

  const blockedHashes = new Set(readJson(STALE_BLOCK).hashes ?? []);
  const artifacts = [];
  const actualReports = [];
  const fixtureRows = [];
  const findings = [];
  for (const item of censused) {
    for (const [fixture, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const renderedFacts = { ...facts };
      const countyIsMapped = item.anchors.some((anchor) => anchor.factId === "matter.county");
      if (countyIsMapped && typeof renderedFacts["matter.county"] === "string") {
        renderedFacts["matter.county"] = renderedFacts["matter.county"].replace(/\s+County\s*$/i, "").trim();
      }
      const routeSelections = item.routeMarks.map(({ spec, control }) => ({
        label: `${control.id} ${spec.mustContain}`,
        page: control.page, measured: true,
        box: {
          x0: control.geometry.x0, y0: control.geometry.y0,
          x1: control.geometry.x1, y1: control.geometry.y1
        }
      }));
      const options = {
        sourceBytes: item.document.bytes, expectedSha256: item.document.expectedSha256,
        anchors: item.anchors, selections: routeSelections, protectedRules: item.protectedRules,
        explicitMappings: explicitMappingsFor(item.anchors), facts: renderedFacts,
        documentTextLines: item.census.documentTextLines,
        title: `WA ${item.document.formNumber}`
      };
      const first = await finalizeFlatOverlay(options);
      const second = await finalizeFlatOverlay(options);
      if ((first.report.selectionsRefused ?? []).length
        || (first.report.selections ?? []).length !== routeSelections.length) {
        fail("route-determined election was refused or not drawn",
          `${item.document.formNumber}/${fixture}: ${JSON.stringify(first.report.selectionsRefused ?? [])}`);
      }
      const firstHash = sha256(first.bytes);
      const secondHash = sha256(second.bytes);
      if (firstHash !== secondHash) fail("fixture output is not deterministic", `${item.document.formNumber}/${fixture}`);
      if (blockedHashes.has(firstHash)) fail("fixture output matches stale-artifact block", firstHash);
      const rel = `${out}/fixtures/${item.document.key}-${fixture}-filled.pdf`;
      fs.mkdirSync(path.dirname(assertOwnedOutput(familyId, rel)), { recursive: true });
      fs.writeFileSync(absFor(rel), first.bytes);
      const added = await addedInkOf(item.document.bytes, first.bytes);
      const addedVectors = await addedVectorInkOf(item.document.bytes, first.bytes);
      const proof = verifyAddedInk({ document: item.document, census: item.census, anchors: item.anchors,
        added, addedVectors, report: first.report, fixture, routeMarkIds: item.routeMarkIds });
      findings.push(...proof.findings.map((finding) => ({ ...finding, document: item.document.formNumber, fixture })));
      actualReports.push(proof);
      artifacts.push({
        document: item.document.formNumber, fixture, file: rel, sha256: firstHash,
        byteLength: first.bytes.length, pageCount: item.census.pages.length,
        deterministicSecondRenderSha256: secondHash
      });
      fixtureRows.push({
        document: item.document.formNumber, fixture, file: rel, sha256: firstHash,
        sourceSha256: item.document.expectedSha256,
        facts: Object.fromEntries(item.anchors.map((anchor) =>
          [anchor.factId, resolveFact(renderedFacts, anchor.factId)])),
        normalizations: countyIsMapped && renderedFacts["matter.county"] !== facts["matter.county"]
          ? [{ factId: "matter.county", from: facts["matter.county"], to: renderedFacts["matter.county"],
            why: "the source caption prints 'County of' before the measured blank" }]
          : [],
        factoryWritten: first.report.written.length, factoryRefused: first.report.refused.length,
        unfittable: first.report.unfittable.length
      });
    }
  }

  writeJson(`${out}/fixtures/fixture-manifest.json`, {
    schemaVersion: "rcap-official-form-fixtures/v1-census-v1", familyId,
    canonicalAndBoundaryRequired: true, fixtures: fixtureRows
  });
  writeJson(`${out}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-write-report/v1", familyId,
    proofBasis:
      "glyphs extracted from each finalized artifact minus glyphs at identical coordinates in its pinned source; "
      + "every remaining glyph must fall inside a measured mapped rectangle; vector paths are independently "
      + "multiset-diffed and any added path is blocking",
    reports: actualReports, blockingFindings: findings,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  const anySelectionControlMarked = actualReports.some((report) =>
    report.selectionControlProofs.some((control) => control.markedByBuild));
  const anyControlMarkedOutsideRouteElections = actualReports.some((report) =>
    report.selectionControlProofs.some((control) => control.markedByBuild && control.routeElectionMark !== true));
  writeJson(`${out}/reports/protection-report.json`, {
    schemaVersion: "rcap-protected-fields-report/v1", familyId,
    signatureAndCourtFieldsWritten: false, selectionControlsMarked: anySelectionControlMarked,
    ...(routeElectionFamily(familyId) ? {
      selectionControlsMarkedOutsideApprovedRouteElections: anyControlMarkedOutsideRouteElections,
      routeElections: {
        routeSelectionId: routeElectionFamily(familyId).routeSelectionId,
        controlIds: censused.flatMap(({ document, routeMarkIds }) =>
          [...routeMarkIds].sort().map((id) => `${document.formNumber}/${id}`))
      }
    } : {}),
    chargeOrOffenseFieldsWritten: censused.some(({ anchors }) =>
      anchors.some((anchor) => /^matter\.charges\[\d+\]\./.test(anchor.factId))),
    documents: censused.map(({ document, census, withheld, routeMarkIds }) => ({
      formNumber: document.formNumber, withheldBlankCount: withheld.length,
      selectionControlsObserved: census.selectionControls.length,
      selectionControlsLeftUnmarked: census.selectionControls.filter((control) =>
        actualReports.filter((report) => report.document === document.formNumber)
          .every((report) => report.selectionControlProofs.find((proof) => proof.controlId === control.id)
            ?.markedByBuild === false)).length,
      ...(routeMarkIds.size ? { routeElectionControlIds: [...routeMarkIds].sort() } : {}),
      fixtureProofs: actualReports.filter((report) => report.document === document.formNumber).map((report) => ({
        fixture: report.fixture, vectorPathsAdded: report.vectorPathsAdded,
        controlsProvedUnmarked: report.selectionControlProofs.filter((control) => !control.markedByBuild).length,
        controlsMarked: report.selectionControlProofs.filter((control) => control.markedByBuild).length,
        ...(routeMarkIds.size ? {
          routeElectionVectorPaths: report.routeElectionVectorPaths,
          controlsMarkedForRouteElection: report.selectionControlProofs
            .filter((control) => control.markedByBuild && control.routeElectionMark === true).length
        } : {})
      })),
      approvedBlankDispositions: withheld
    })),
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  if (findings.length) {
    writeJson(`${out}/build-findings.json`, {
      schemaVersion: "rcap-build-findings/v1", familyId, status: "BLOCKING_FINDINGS", findings
    });
    fail("artifact-level verification found unsafe output", `${findings.length} finding(s); see ${out}/build-findings.json`);
  }

  const rasters = [];
  for (const artifact of artifacts) {
    const slug = artifact.document.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const directory = `${out}/raster/${slug}-${artifact.fixture}`;
    const pageMetrics = censused.find(({ document }) => document.formNumber === artifact.document)?.census.pages ?? [];
    if (pageMetrics.length !== artifact.pageCount) fail("artifact/source page census mismatch", artifact.document);
    const pages = rasterizeWithPoppler(artifact.file, directory, pageMetrics);
    rasters.push({ document: artifact.document, fixture: artifact.fixture, directory, pages });
  }

  // The three participant-facing obligations, derived from committed route data
  // and from source bytes measured in this run (FIX10 / FABLE-R21). This
  // replaces the single sentence that used to stand for all three.
  const sheet = await verifiedInstructionSheet(documents, corpusRoot());
  const filingObligations = filingObligationsFor({ familyId, records, documents, sheet });
  writeJson(`${out}/filing-obligations.json`, filingObligations);
  const obligationSentences = filingObligationSentences(filingObligations);

  // Generate the participant instructions where none exists — the silent form
  // of the same defect — and verify, never overwrite, one that does: a lane's
  // source-cited prose is better than anything derivable here, but it may not
  // be missing an obligation the route record establishes.
  const instructionsOnDisk = fs.existsSync(absFor(participantInstructionsPath))
    ? fs.readFileSync(absFor(participantInstructionsPath), "utf8")
    : null;
  if (instructionsOnDisk === null) {
    fs.writeFileSync(absFor(participantInstructionsPath),
      renderParticipantInstructions({ familyId, records, documents, obligations: filingObligations, sheet }));
  } else {
    const coverage = instructionCoverageOf(instructionsOnDisk);
    const uncovered = Object.entries(coverage).filter(([, covered]) => !covered).map(([name]) => name);
    if (uncovered.length) {
      fail("committed participant instructions do not state an obligation the route record establishes",
        `${familyId}: ${uncovered.join(", ")}`);
    }
  }

  writeJson(`${out}/participant-completion-instructions.json`, {
    schemaVersion: "rcap-participant-completion-instructions/v1", familyId,
    status: "EVIDENCE_ONLY_NOT_APPROVED_FOR_DELIVERY",
    filingObligationsSource: `${out}/filing-obligations.json`,
    instructions: [
      routeElectionFamily(familyId)
        ? "Review the selected Washington form and confirm the court and eligibility path; this build marks only the route-determined election(s) recorded in the production field map's routeElections and makes no other legal election."
        : "Review the selected Washington form and choose the correct court and eligibility path; this build does not make legal elections.",
      "Review every prefilled participant and case fact, including caption, conviction, offense/count, statute, and contact information, against the court record before filing.",
      "Participant-authored evidence or mitigation remains blank when the route requires the participant's own sworn narrative; the platform does not invent that content.",
      "Sign and date only after reviewing the filing; the build never signs or dates a declaration for the participant.",
      "Leave the judge, commissioner, clerk, prosecutor, and court-decision portions for the named person or court.",
      ...obligationSentences
    ],
    attachmentAndContinuationPages:
      "Attach only documents required by the form and court. No attachment, continuation page, prosecutor notice, or proof of service was invented by this build.",
    sourceOfBlankList: `${out}/production-field-map.json`, legalReviewStillRequired: true
  });
  writeJson(`${out}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId,
    renderPath: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs finalizeFlatOverlay",
    rasterPath: "Poppler pdftoppm, one PNG per finalized PDF page",
    artifacts, rasters,
    allPagesRastered: rasters.every((row) => row.pages.length === artifacts.find((artifact) =>
      artifact.document === row.document && artifact.fixture === row.fixture)?.pageCount),
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${out}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId, routeKeys: records.worklist.routeKeys,
    status: "REQUESTED", sourceCustodyBound: true, fieldMapBuilt: true,
    canonicalAndBoundaryFixturesBuilt: true, artifactLevelWriteVerificationPassed: true,
    allPagesRastered: true,
    stillRequired: ["human independent visual review", "output-level legal approval", "local-variation resolution"],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1", familyId, status: "NO_BLOCKING_ARTIFACT_FINDINGS",
    blocking: [],
    advisories: [
      "The state-bounded map writes held participant and case facts into exact source-measured cells; legal elections, participant-authored narratives, execution fields, and judicial findings retain approved blank dispositions.",
      "Machine raster production and byte-level placement proof are not human independent visual review.",
      // This advisory used to say the worklist recorded filing, notice, service,
      // fee and hearing variation as unresolved, which told the participant the
      // packet does not state facts it does state (A4). What remains unresolved
      // is narrower, and filing-obligations.json records which is which.
      "Filing destination and the service recipient are stated from the committed route record; the service "
        + "method and timing are stated from the route's own official instruction sheet. What remains unresolved "
        + "is the court filing fee and any fee-waiver route, which no held source establishes for this route, and "
        + "county-level attachment and hearing-scheduling practice. See filing-obligations.json.",
      "No fee amount, waiver rule or service recipient in this packet was inferred; each is either read from a "
        + "committed record or, where nothing establishes it, replaced by a named office the participant can reach."
    ],
    deterministicFixtureRebuilds: artifacts.every((artifact) => artifact.sha256 === artifact.deterministicSecondRenderSha256)
  });
  writeJson(`${out}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId, status: "BUILT_EVIDENCE_ONLY",
    documentsBuilt: documents.map((document) => document.formNumber), fixtureCount: artifacts.length,
    rasterPageCount: rasters.reduce((count, raster) => count + raster.pages.length, 0),
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });
  return { familyId, status: "BUILT_EVIDENCE_ONLY", out, documents: documents.length,
    fixtureCount: artifacts.length, rasterPageCount: rasters.reduce((count, raster) => count + raster.pages.length, 0) };
}

export async function buildWaFamily(familyId, argv = process.argv.slice(2)) {
  const records = familyRecords(familyId);
  if (argv.includes("--dry-run")) {
    return { familyId, status: "DRY_RUN", sourceCount: records.custody.documentSources.length,
      routeCount: records.worklist.routeKeys.length };
  }
  const sourceRoot = corpusRoot();
  if (argv.includes("--check")) return checkFamily(familyId, records, sourceRoot);
  const documents = await loadDocuments(familyId, records, sourceRoot);
  if (argv.includes("--inspect")) {
    const inspection = [];
    for (const document of documents) {
      const census = await censusDocument(document, routeMarkIdsFor(familyId, document.formNumber));
      const { anchors, withheld } = anchorsFor(document, census);
      inspection.push({
        formNumber: document.formNumber, role: document.role,
        observedTitleLines: document.observedTitleLines, pageCount: census.pages.length,
        blanks: census.blanks.length, selectionControls: census.selectionControls.length,
        writableAnchors: anchors, withheldCount: withheld.length,
        unresolvedVisibleFields: census.unresolvedVisibleFields,
        terminalBlanks: census.blanks.filter((blank) => blank.mappingDecision.terminal !== false)
          .map((blank) => ({ blankId: blank.blankId, caption: blank.printedCaption,
            measured: blank.measured, decision: blank.mappingDecision })),
        shortMeasuredBlanks: census.blanks.filter((blank) => blank.measured.width < 20)
          .map((blank) => ({ blankId: blank.blankId, caption: blank.printedCaption,
            measured: blank.measured, decision: blank.mappingDecision })),
        captionBandBlanks: census.blanks.filter((blank) => blank.page === 1 && blank.measured.baselineY >= 430)
          .map((blank) => ({ blankId: blank.blankId, caption: blank.printedCaption,
            captionBasis: blank.captionBasis, measured: blank.measured, decision: blank.mappingDecision }))
      });
    }
    return { familyId, status: "INSPECTED", inspection };
  }
  if (familyId === ANCHOR_FAMILY) return writeBlakeVehicleStop(familyId, records, documents);
  return buildOfficialFamily(familyId, records, documents);
}

function fieldRowsOf(fieldMap) {
  return (fieldMap.documents ?? []).flatMap((document) => [
    ...(document.writableAnchors ?? []).map((anchor) => ({
      kind: "write", formNumber: document.formNumber, fieldId: anchor.blankId,
      page: anchor.page, printedCaption: anchor.printedCaption, label: anchor.label,
      factId: anchor.factId
    })),
    ...(document.withheld ?? []).map((blank) => ({
      kind: "blank", formNumber: document.formNumber, fieldId: blank.blankId,
      page: blank.page, printedCaption: blank.sourcePrintedCaption ?? blank.printedCaption,
      effectiveLabel: blank.printedCaption, reason: blank.reason,
      refusalClass: blank.category, approvedDisposition: blank.approvedDisposition
    }))
  ]);
}

function jsonAtRevision(revision, rel) {
  const shown = spawnSync("git", ["show", `${revision}:${rel}`], {
    cwd: rootDir, encoding: "utf8", maxBuffer: 32 * 1024 * 1024
  });
  if (shown.status !== 0) fail("unable to read completeness baseline", `${revision}:${rel}`);
  return JSON.parse(shown.stdout);
}

export function writeP2CompletenessRows() {
  const rows = [];
  for (const familyId of P2_FAMILY_IDS) {
    const out = outFor(familyId);
    const rel = `${out}/production-field-map.json`;
    const beforeMap = jsonAtRevision(P2_CONTROL_BASE, rel);
    const afterMap = readJson(rel);
    const beforeRows = fieldRowsOf(beforeMap);
    const afterRows = fieldRowsOf(afterMap);
    const beforeById = new Map(beforeRows.map((row) => [`${row.formNumber}|${row.fieldId}`, row]));
    const afterById = new Map(afterRows.map((row) => [`${row.formNumber}|${row.fieldId}`, row]));

    const fieldsNewlyWritten = afterRows.filter((row) => row.kind === "write")
      .filter((row) => {
        const before = beforeById.get(`${row.formNumber}|${row.fieldId}`);
        return before?.kind !== "write" || before.factId !== row.factId;
      });
    const blanksNewlyGivenApprovedDisposition = afterRows.filter((row) => row.kind === "blank")
      .filter((row) => {
        const before = beforeById.get(`${row.formNumber}|${row.fieldId}`);
        return row.approvedDisposition && (before?.kind !== "blank"
          || before.approvedDisposition !== row.approvedDisposition
          || before.reason !== row.reason || before.refusalClass !== row.refusalClass);
      });
    const measuredRulesRemovedFromTerminalLedger = beforeRows.filter((row) => row.kind === "blank")
      .filter((row) => !afterById.has(`${row.formNumber}|${row.fieldId}`))
      .map((row) => ({ ...row,
        disposition: "NOT_A_FIELD",
        basis: "the source-bound census identifies this geometry as a footer, divider, heading rule, paragraph rule, or other non-terminal source mark"
      }));

    const allowed = new Set(["PROTECTED_FIELD", "LATER_COMPLETION", "NOT_APPLICABLE_ON_THIS_ROUTE",
      "REQUIRED_BEFORE_FILING", "PARTICIPANT_ELECTION_GENUINE", "OPTIONAL_PARTICIPANT_CONTENT"]);
    const badBlanks = afterRows.filter((row) => row.kind === "blank" && !allowed.has(row.approvedDisposition));
    if (badBlanks.length) fail("P2 report found a blank without an approved disposition",
      `${familyId}: ${badBlanks.map((row) => row.fieldId).join(", ")}`);

    const actual = readJson(`${out}/reports/actual-writes.json`);
    const anchorCountByDocument = new Map((afterMap.documents ?? [])
      .map((document) => [document.formNumber, document.writableAnchors?.length ?? 0]));
    for (const report of actual.reports ?? []) {
      if (report.findings?.length || report.refused?.length || report.unfittable?.length
        || report.written?.length !== anchorCountByDocument.get(report.document)) {
        fail("P2 report found an incomplete rendered fixture", `${familyId}/${report.document}/${report.fixture}`);
      }
    }

    rows.push({
      itemId: familyId, status: "COMPLETED",
      resultBefore: "FAIL_MISSING_REQUIRED_FACTS", resultAfter: "PASS_COMPLETE",
      countersBefore: P2_COUNTERS_BEFORE[familyId], countersAfter: { ...ZERO_COUNTERS },
      terminalFieldsBefore: beforeRows.length,
      terminalFieldsAfter: afterRows.length,
      writtenBefore: beforeRows.filter((row) => row.kind === "write").length,
      writtenAfter: afterRows.filter((row) => row.kind === "write").length,
      fieldsNewlyWritten,
      blanksNewlyGivenApprovedDisposition,
      measuredRulesRemovedFromTerminalLedger,
      factsClassifiedRequiredBeforeFiling: [],
      artifactProof: {
        fixtures: actual.reports?.length ?? 0,
        mappedWritesRefused: (actual.reports ?? []).reduce((count, report) => count + (report.refused?.length ?? 0), 0),
        mappedWritesUnfittable: (actual.reports ?? []).reduce((count, report) => count + (report.unfittable?.length ?? 0), 0),
        blockingFindings: actual.blockingFindings?.length ?? 0
      }
    });
  }
  const report = {
    schemaVersion: "rcap-completeness-repair-rows/v1",
    assignmentId: "P2_WA_VACATUR_COMPLETENESS",
    workerBranch: "codex/p2-wa-vacatur-completeness",
    baseSha: P2_CONTROL_BASE, dispatchSha: P2_DISPATCH,
    commercialRoutesOpened: 0, productionTouched: false,
    rows
  };
  writeJson(P2_REPORT, report);
  return { report: P2_REPORT, rows: rows.length, status: "COMPLETED" };
}

async function selfTest() {
  assert.equal(FAMILY_IDS.size, 10);
  const dry = await buildWaFamily(ANCHOR_FAMILY, ["--dry-run"]);
  assert.equal(dry.status, "DRY_RUN");
  assert.equal(dry.sourceCount, 3);
  assert.throws(() => safeSourcePath("/tmp/corpus", "../outside.pdf"), /escapes the verified corpus/);
  assert.throws(() => safeSourcePath("/tmp/corpus", "/absolute.pdf"), /invalid corpus-relative/);
  assert.equal(protectCategoryOf("Judge/Commissioner"), "court");
  assert.equal(protectCategoryOf("Defendant's Signature"), "signature");
  const document = { role: "participant_filing" };
  assert.equal(semanticRole({ caption: "No.", captionBasis: "test", page: 1, baselineY: 539,
    x0: 360, regionProtectCategory: null }, document).factId, "matter.case_number");
  assert.equal(semanticRole({ caption: "No.", captionBasis: "test", page: 3, baselineY: 200,
    x0: 360, regionProtectCategory: null }, document).writable, false);
  assert.equal(semanticRole({ caption: "Defendant's Signature", captionBasis: "test", page: 1,
    baselineY: 500, x0: 50, regionProtectCategory: null }, document).writable, false);
  assert.equal(outFor("wa_vac_felony-set"),
    `${OUT_ROOT}/wa-vac-felony-set--official-pdf-fill`,
    "Washington output root must exactly match the canonical hyphenated worklist path");
  assertOwnedOutput("wa_vac_felony-set", `${outFor("wa_vac_felony-set")}/fixtures/example.pdf`);
  assert.throws(() => assertOwnedOutput("wa_vac_felony-set", `${OUT_ROOT}/other-family/file.pdf`), /outside/);

  // C11 WA regression contract. Keep these checks tied to exact pinned sources:
  // the failures that motivated them were false-green artifact evidence, not a
  // hypothetical PDF shape.
  const contractFailures = [];

  const synthetic = await PDFDocument.create();

  stampDeterministic(synthetic);
  const syntheticPage = synthetic.addPage([612, 792]);
  syntheticPage.drawRectangle({ x: 72, y: 700, width: 10, height: 10, borderWidth: 1 });
  const compressed = await synthetic.save({ useObjectStreams: false, addDefaultPage: false });
  const reopened = await PDFDocument.load(compressed, { updateMetadata: false });
  if (checkboxCandidates(contentStringOf(reopened, reopened.getPage(0))).length !== 1) {
    contractFailures.push("decoded_content_stream_vector_checkbox_census");
  }

  const dobDecision = semanticRole({ caption: "Date of Birth", captionBasis: "test", page: 1,
    baselineY: 500, x0: 350, regionProtectCategory: null }, { role: "participant_filing" });
  if (dobDecision.writable !== false) contractFailures.push("date_of_birth_must_be_protected");

  const sourceRoot = corpusRoot();
  const felonyRecords = familyRecords("wa_vac_felony-set");
  const felonyDocuments = await loadDocuments("wa_vac_felony-set", felonyRecords, sourceRoot);
  for (const document of felonyDocuments) {
    const census = await censusDocument(document);
    if (census.selectionControls.length === 0) {
      contractFailures.push(`printed_selection_controls_missing:${document.formNumber}`);
    }
  }

  const cannabisRecords = familyRecords("wa_vac_cannabis-set");
  const cannabisDocuments = await loadDocuments("wa_vac_cannabis-set", cannabisRecords, sourceRoot);
  for (const document of cannabisDocuments) {
    const census = await censusDocument(document);
    const { anchors } = anchorsFor(document, census);
    const mapped = anchors.some((anchor) => anchor.factId === "matter.case_number");
    const refused = (census.unresolvedVisibleFields ?? []).some((field) =>
      field.factId === "matter.case_number" && field.reason);
    if (!mapped && !refused) contractFailures.push(`cannabis_case_number_not_mapped_or_refused:${document.formNumber}`);
  }

  const cannabisOut = outFor("wa_vac_cannabis-set");
  for (const report of ["reports/actual-writes.json", "reports/rendered-artifacts.json"]) {
    if (!fs.existsSync(absFor(`${cannabisOut}/${report}`))) contractFailures.push(`required_report_missing:${report}`);
  }

  try {
    const vectorSource = await PDFDocument.create();
    stampDeterministic(vectorSource);
    vectorSource.addPage([612, 792]);
    const vectorSourceBytes = await vectorSource.save({ useObjectStreams: false, addDefaultPage: false });
    const vectorOutput = await PDFDocument.load(vectorSourceBytes, { updateMetadata: false });
    vectorOutput.getPage(0).drawLine({ start: { x: 72, y: 700 }, end: { x: 82, y: 710 }, thickness: 1 });
    const vectorOutputBytes = await vectorOutput.save({ useObjectStreams: false, addDefaultPage: false });
    const delta = await addedVectorInkOf(vectorSourceBytes, vectorOutputBytes);
    if (delta.length === 0) contractFailures.push("added_vector_ink_not_detected");
  } catch {
    contractFailures.push("added_vector_ink_not_detected");
  }

  if (typeof assertClosedState !== "function") contractFailures.push("check_closed_state_validator_missing");
  else {
    try {
      assertClosedState("self-test", { generationAllowed: false, runtimeSelectable: false,
        commercialRoutesOpened: 0 });
      assert.throws(() => assertClosedState("self-test", { generationAllowed: false,
        runtimeSelectable: true, commercialRoutesOpened: 0 }), /fail-closed/);
    } catch { contractFailures.push("check_closed_state_validator_behavior"); }
  }
  if (typeof assertReceiptMatchesDocuments !== "function") contractFailures.push("check_source_receipt_validator_missing");
  else {
    const source = { formNumber: "TEST-001", revision: "REV-1", role: "participant_filing",
      pathInArchive: "STATES/WA/test.pdf", expectedSha256: "a".repeat(64), byteLength: 10,
      pageCount: 1, indexEntry: { pageCount: 1 }, acroFieldCount: 0 };
    const receipt = { familyId: "self-test", worklistGroupId: "self-test", documents: [{ formNumber: source.formNumber,
      revision: source.revision, roleObservedFromSourceTitle: source.role, pathInArchive: source.pathInArchive,
      sha256: source.expectedSha256, byteLength: source.byteLength, pageCount: 1,
      acroFieldCountReadFromBytes: 0 }] };
    try {
      assertReceiptMatchesDocuments("self-test", receipt, [source]);
      assert.throws(() => assertReceiptMatchesDocuments("self-test",
        { ...receipt, documents: [{ ...receipt.documents[0], sha256: "b".repeat(64) }] }, [source]),
      /receipt/);
    } catch { contractFailures.push("check_source_receipt_validator_behavior"); }
  }
  if (typeof assertCompleteRenderInventory !== "function") contractFailures.push("check_complete_raster_validator_missing");
  else {
    try {
      await assert.rejects(() => assertCompleteRenderInventory({
        familyId: "self-test", documents: [{ formNumber: "TEST-001", expectedSha256: "a".repeat(64) }],
        census: { documents: [{ formNumber: "TEST-001", pages: [{ page: 1, width: 612, height: 792 }] }] },
        fixtureManifest: { fixtures: [] }, actualWrites: { reports: [] },
        rendered: { artifacts: [], rasters: [], allPagesRastered: true }
      }), /inventory/);
    } catch { contractFailures.push("check_complete_raster_validator_behavior"); }
  }

  assert.deepEqual(contractFailures, [], `WA C11 contract failures: ${contractFailures.join(", ")}`);
  console.log("WA_PACKET_BUILDER_SELF_TEST_OK");
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  if (process.argv.includes("--self-test")) await selfTest();
  else if (process.argv.includes("--p2-report")) console.log(JSON.stringify(writeP2CompletenessRows()));
  else console.log(JSON.stringify(await buildWaFamily(ANCHOR_FAMILY, process.argv.slice(2))));
}
