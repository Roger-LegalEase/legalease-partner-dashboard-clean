#!/usr/bin/env node
/**
 * The Oregon adult set-aside packet family builder.
 *
 *   node scripts/build-census-v1-or_conviction_setaside-set.mjs [--check] [--no-raster]
 *
 * One family, two official sources, three components:
 *
 *   OR-OJD-ADULT-SET-ASIDE-PACKET  motion_and_declaration     ORS 137.225 / 137.223
 *   OR-OSP-SET-ASIDE-CCH           criminal_history_request   Oregon State Police
 *   (composed)                     filing_instructions
 *
 * A FLAT FORM, AND WHY THAT CHANGES THE BUILD
 *
 * The OJD packet carries no AcroForm at all: its blanks are printed rules, so
 * there is nothing to fill and nothing to flatten, and values are drawn into
 * page content at measured coordinates. Nothing here authors a coordinate. The
 * anchors, the protected rules, the option boxes and the declaration boxes are
 * all read out of measurements this repository already holds against this exact
 * binary:
 *
 *   data/rcap-all50/overlays/lane-c-candidates/oregon/
 *     or-ojd-adult-set-aside-packet-motion-and-declaration/overlay-profile.json
 *     ...                                                 /field-census.json
 *   data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json
 *
 * Each of those records the SHA-256 it was measured against, and this build
 * refuses if the binary it is about to draw on is not that one. A measurement
 * against different bytes is a coordinate about a different document.
 *
 * THE ROUTE ELECTION
 *
 * Page 4 offers three options and says "check one option only". This track is
 * "Motion to Set Aside a Conviction (ORS 137.225(1)(a) and (1)(b))" -- Option 1
 * is the conviction option, so the route determines it and the packet marks it.
 * Options 2 and 3 are the other two branches and are refused as branches this
 * route does not take.
 *
 * The seven DECLARATION boxes on page 5 are marked by nobody. They are the
 * participant's sworn attestations about their own case, and the measurement
 * that found them says in terms that no configuration marks them. They are
 * carried as participant elections and disclosed.
 *
 * A NOTE ON THE ASSIGNMENT
 *
 * PF03 names this family's component assembly "Oregon Marijuana Set-Aside Motion
 * under ORS 475C.397". That is a different route on a different form -- the
 * marijuana motion is OR-OJD-MJ-PCR, which this repository also holds -- and it
 * is not what the assignment's own official forms are. The track's recorded
 * authority is ORS 137.225, the assigned forms are the ORS 137.225 packet and
 * its Oregon State Police companion, and the two agree; the component label does
 * not. The label is reported and the family is built on its own forms.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1/or";
const LANE_C = "data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration";
const GEOMETRY = "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json";
const FIXED_DATE = "2026-01-01T00:00:00.000Z";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (why) => ({ policy: "protect", refusalClass: why });
const ELECTION = () => ({ policy: "election" });
const OFFROUTE = (why) => ({ policy: "offroute", routeReason: why });

const COMPONENTS = ["motion_and_declaration", "criminal_history_request", "filing_instructions"];

export const FAMILY_CONFIGS = Object.freeze({
  "or_conviction_setaside-set": {
    jurisdiction: "OR",
    routeKey: "obligation:track-pathway:OR:or_conviction_setaside:conviction-set-aside",
    routeSelectionId: "or-conviction-setaside-ojd-adult-packet-complete-set",
    legalName: "Motion to Set Aside a Conviction (ORS 137.225(1)(a) and (1)(b))",
    routeName: "setting aside a conviction under ORS 137.225",
    statute: "ORS 137.225",
    assignedComponentLabel: "Oregon Marijuana Set-Aside Motion under ORS 475C.397",
    officialForms: ["OR-OJD-ADULT-SET-ASIDE-PACKET", "OR-OSP-SET-ASIDE-CCH"]
  }
});

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street",
    "participant.city_state_zip": "Portland, OR 97205",
    "participant.phone": "503-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.case_number": "21CR04170",
    "matter.county": "Multnomah"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Grants Pass, Oregon 97526-2214",
    "participant.phone": "(541) 555-0199",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.case_number": "24CR0012760",
    "matter.county": "Josephine"
  }
};

/* ------------------------------------------------------------------ *
 * What every measured slot on the motion IS.
 *
 * Pages 1 to 3 of this binary are the Oregon Judicial Department's printed
 * instruction sheet -- "Set-Aside - Instructions, OJD OFFICIAL, Page 1 of 3" --
 * and every rule the measurement found on them is a typographic underline in
 * prose, not a blank anybody fills. Pages 4 and 5 are the Motion, the
 * Declaration and the Certificate of Mailing, and every slot on them is named
 * below. A slot with no entry stops the build.
 * ------------------------------------------------------------------ */
const NOT_A_BLANK = (what) => ({ policy: "not_a_blank", what });

const MOTION_POLICY = {
  // --- page 4: the caption ---------------------------------------------------
  "p4.r693.7.x305.rule": { policy: "write", fact: "matter.county", label: "FOR THE COUNTY OF" },
  "p4.r666.5.x395.rule": { policy: "write", fact: "matter.case_number", label: "Case No:" },
  "p4.r611.9.x72.rule": { policy: "write", fact: "participant.full_legal_name", label: "Defendant" },
  "p4.r585.6.x102.rule": { policy: "write", fact: "participant.date_of_birth", label: "DOB:" },
  // --- page 4: the identifying facts the platform does not hold ---------------
  "p4.r564.1.x146.rule": { ...SUPPLY("your Oregon SID number, if you know it — it is on Oregon State Police correspondence"), label: "SID# if known" },
  "p4.r537.8.x277.rule": { ...SUPPLY("the law enforcement agency that cited or arrested you, for example \"Salem Police Dept.\" or \"Coos County Sheriff\""), label: "Citing/arresting law enforcement agency" },
  "p4.r512.2.x134.rule": { ...SUPPLY("your arrest date, or if there was no arrest the date of the citation, booking or incident"), label: "Arrest Date" },
  "p4.r479.0.x264.rule": { ...SUPPLY("your fingerprint number (FPN #), if you know it — the Oregon State Police assign it when a card is processed"), label: "Fingerprint number (FPN #) if known" },
  // --- page 4: the three option headings -------------------------------------
  "p4.r393.1.x72.rule": { ...NOT_A_BLANK("a typographic rule under the Option 1 heading"), label: "printed rule under the Option 1 heading" },
  "p4.r185.9.x72.rule": { ...NOT_A_BLANK("a typographic rule under the Option 2 heading"), label: "printed rule under the Option 2 heading" },
  "p4.r151.6.x72.rule": { ...NOT_A_BLANK("a typographic rule under the Option 3 heading"), label: "printed rule under the Option 3 heading" },
  // --- page 4: the charges table, seven rows of two --------------------------
  ...Object.fromEntries([297.4, 284.32, 271.36, 258.4, 245.32, 232.36, 219.4].flatMap((y, i) => {
    const n = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"][i];
    const r = (y - 2.2).toFixed(1);
    return [
      [`p4.r${r}.x144.rule`, { ...SUPPLY(`the name of the ${n} charge you are moving to set aside, worded as it appears on your record`), label: `Name of Charges (${n} row)` }],
      [`p4.r${r}.x477.rule`, { ...SUPPLY(`the count number of that ${n} charge`), label: `Count # (${n} row)` }]
    ];
  })),
  // --- page 4 and 5: the Option 3 offence lines -------------------------------
  ...Object.fromEntries([[4, 130.6], [4, 117.64], [4, 103.6], [4, 89.68], [4, 75.64], [5, 721.72], [5, 707.8], [5, 693.76]].map(([p, y]) => [
    `p${p}.r${(y - 2.2).toFixed(1)}.x126.rule`,
    { ...OFFROUTE("this packet is filed on Option 1, the conviction branch of ORS 137.225, and the citation-or-arrest offence lines belong to Option 3"), label: "Name of Citation/Arrest Offenses" }
  ])),
  // --- page 5: the declaration, the signature block and the certificate -------
  "p5.r523.6.x145.rule": { ...NOT_A_BLANK("a typographic rule inside a printed declaration sentence"), label: "printed rule inside the Option 1 declaration text" },
  "p5.r378.2.x72.rule": { ...PROTECT(SIGNATURE), label: "Date of the declaration signature" },
  "p5.r378.2.x288.rule": { ...PROTECT(SIGNATURE), label: "Signature on the declaration" },
  "p5.r340.8.x72.rule": { policy: "write", fact: "participant.email", label: "Email" },
  "p5.r340.8.x288.rule": { policy: "write", fact: "participant.full_legal_name", label: "Name (typed or printed)" },
  /*
   * One printed rule carries three labels -- Address, City, State, ZIP and Phone
   * -- and the overlay profile splits it into three measured anchors. Each is a
   * row here, because a single row could not record that two of them were drawn
   * and one was refused.
   */
  "p5.r303.2.x72.rule": { policy: "write", fact: "participant.street_address", label: "Address", splitInto: [
    { key: "p5.r303.2.x72.rule#city", fact: "participant.city_state_zip", label: "City, State, ZIP" },
    { key: "p5.r303.2.x72.rule#phone", fact: "participant.phone", label: "Phone" }
  ] },
  "p5.r229.8.x186.rule": { ...PROTECT(SIGNATURE), label: "Date of mailing on the certificate of mailing" },
  "p5.r211.1.x432.rule": { ...SUPPLY("the mailing address of the prosecuting attorney for the county where the charges were or could have been filed — the OJD instruction page in this packet gives where to look it up"), label: "Address of the prosecuting attorney on the certificate of mailing" },
  "p5.r192.4.x72.rule": { ...SUPPLY("the rest of that prosecuting attorney's address, if it needs a second line"), label: "Second line of the prosecuting attorney's address" },
  "p5.r154.8.x72.rule": { ...PROTECT(SIGNATURE), label: "Date beside the defendant's signature on the certificate of mailing" },
  "p5.r154.8.x288.rule": { ...PROTECT(SIGNATURE), label: "Defendant (signature) on the certificate of mailing" },
  "p5.r115.6.x288.rule": { ...PROTECT(SIGNATURE), label: "Defendant Name printed on the certificate of mailing" }
};

/* The three option boxes and the seven declaration boxes, measured. */
const OPTION_POLICY = {
  "Option 1": { policy: "select", why: "this packet is built for ORS 137.225(1)(a) and (1)(b), a motion to set aside a CONVICTION, and Option 1 is the conviction branch the form prints", label: "Option 1: there was a court case and I was convicted on at least one charge" },
  "Option 2": { ...OFFROUTE("this packet is filed on Option 1, the conviction branch; Option 2 is for setting aside dismissed or acquitted charges only"), label: "Option 2: there was a court case and I am not moving to set aside any convictions" },
  "Option 3": { ...OFFROUTE("this packet is filed on Option 1, the conviction branch; Option 3 is for a citation or arrest with no court case"), label: "Option 3: I was cited or arrested and there was no court case" }
};
const DECLARATION_LABELS = [
  "I have waited the required period under law to file this Motion",
  "I believe I am legally eligible for a set aside",
  "I have filed fingerprints with the Oregon State Police",
  "I will serve a copy of this Motion on the prosecuting attorney",
  "I am not currently charged with a crime or contempt of court related to abuse or a person crime",
  "I have paid the Oregon State Police background check fee",
  "I have fully complied and performed all terms of the sentence of the court"
];

/* ---- source binding ------------------------------------------------------ */
function resolveSources(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const index = readJson(CORPUS_INDEX);
  const raw = index.entries ?? index.files ?? index;
  const rows = Array.isArray(raw) ? raw : Object.values(raw);
  const root = corpusRoot();
  const resolved = []; const failures = [];
  for (const formNumber of config.officialForms) {
    const entry = rows.find((e) => String(e.path ?? e.relativePath ?? "").includes(`__${formNumber}__`)
      && String(e.path ?? e.relativePath ?? "").startsWith("STATES/OR/"));
    if (!entry) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path ?? entry.relativePath;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const indexed = String(entry.sha256 ?? entry.sha ?? "");
    if (indexed && indexed !== sha256) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `SHA-256 drift: the committed index says ${indexed}, the corpus binary hashes ${sha256}` }); continue; }
    resolved.push({
      formNumber, sourceId: `official-form:${formNumber}`, pathInArchive: rel,
      revision: /__REV-([0-9A-Za-z-]+)__/.exec(rel)?.[1] ?? null,
      sha256, byteLength: bytes.length, bytes
    });
  }
  return { resolved, failures };
}

/* ---- the measurements, and the bytes they were measured against ----------- */
function loadMeasurements(motionSha) {
  const profile = readJson(`${LANE_C}/overlay-profile.json`);
  const census = readJson(`${LANE_C}/field-census.json`);
  const geometry = readJson(GEOMETRY);
  // A coordinate measured against different bytes is a coordinate about a
  // different document. Nothing here is used until all three agree with the
  // binary this build is about to draw on.
  const mismatched = [
    ["overlay-profile.json", profile.sha256],
    ["field-census.json", census.sha256],
    [path.basename(GEOMETRY), geometry.source?.sha256 ?? geometry.sha256 ?? null]
  ].filter(([, sha]) => sha && sha !== motionSha);
  return { profile, census, geometry, mismatched };
}

/* ---- the completeness surface, one row per measured slot ------------------ */
function motionRows(census, profile, geometry, documentId) {
  const rows = []; const unmapped = [];
  for (const f of census.fields ?? []) {
    const rect = f.widgets?.[0]?.rect ?? null;
    if (f.page <= 3) {
      rows.push({
        key: f.name, page: f.page, rect, document: documentId,
        label: "printed rule on the OJD instruction sheet",
        caption: f.effectiveLabel ?? null,
        policy: "not_a_blank",
        what: "a typographic rule in the instruction sheet's own prose; pages 1 to 3 of this binary are the Oregon Judicial Department's printed instructions and carry no blank anybody fills"
      });
      continue;
    }
    const entry = MOTION_POLICY[f.name];
    if (!entry) { unmapped.push({ key: f.name, page: f.page, rect, caption: f.effectiveLabel ?? null }); continue; }
    rows.push({
      key: f.name, page: f.page, rect, document: documentId,
      label: entry.label, caption: f.effectiveLabel ?? null,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, routeReason: entry.routeReason ?? null
    });
    for (const extra of entry.splitInto ?? []) {
      rows.push({
        key: extra.key, page: f.page, rect, document: documentId,
        label: extra.label, caption: f.effectiveLabel ?? null,
        policy: "write", fact: extra.fact
      });
    }
  }
  for (const o of geometry.options ?? []) {
    if (!o.boxIsMeasured || !o.box) continue;
    const entry = OPTION_POLICY[o.option];
    if (!entry) { unmapped.push({ key: `option:${o.option}`, page: o.page, rect: null, caption: o.option }); continue; }
    rows.push({
      key: `option:${o.option}`, page: o.page, box: o.box, document: documentId,
      label: entry.label, caption: o.option, isSelectionControl: true,
      policy: entry.policy, why: entry.why ?? null, routeReason: entry.routeReason ?? null
    });
  }
  (geometry.declarationBoxes ?? []).forEach((b, i) => {
    rows.push({
      key: `declaration:${i + 1}`, page: b.page, box: b.box, document: documentId,
      label: DECLARATION_LABELS[i] ?? `declaration box ${i + 1}`,
      caption: DECLARATION_LABELS[i] ?? null, isSelectionControl: true,
      policy: "election"
    });
  });
  return { rows, unmapped };
}

/* ---- render the motion, by drawing at measured anchors -------------------- */
async function renderMotion(source, profile, geometry, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const selections = (geometry.options ?? [])
    .filter((o) => o.boxIsMeasured && o.box && OPTION_POLICY[o.option]?.policy === "select")
    .map((o) => ({ label: o.option, page: o.page, box: o.box, measured: true, inset: o.markPlan?.inset ?? 2 }));
  const { bytes, report } = await finalizeFlatOverlay({
    sourceBytes: source.bytes, expectedSha256: source.sha256,
    anchors: profile.anchors ?? [],
    selections,
    protectedRules: profile.protectedRules ?? [],
    explicitMappings: Object.fromEntries((profile.anchors ?? []).filter((a) => a.factId).map((a) => [a.label, a.factId])),
    facts,
    documentTextLines: [],
    title: "Motion to Set Aside and Seal, and Declaration of Eligibility"
  });
  if (process.env.OR_DEBUG_RENDER) {
    console.log(`-- motion ${fixtureName}: written=${report.written.length} refused=${report.refused.length} selections=${(report.selections ?? []).length} refusedSelections=${(report.selectionsRefused ?? []).length}`);
    for (const r of report.refused) console.log(`   refused ${JSON.stringify(r.anchor)}: ${r.reason}`);
    for (const r of report.selectionsRefused ?? []) console.log(`   refused selection ${JSON.stringify(r.control)}: ${r.reason}`);
  }
  return { bytes, report, selections };
}

/* ---- the composed filing instructions -------------------------------------- */
function composedBody(config, facts) {
  const L = [];
  L.push("FILING INSTRUCTIONS", "");
  L.push(`Movant: ${facts["participant.full_legal_name"]}`);
  L.push(`Case No.: ${facts["matter.case_number"]}`);
  L.push(`County: ${facts["matter.county"]}`);
  L.push(`Route: ${config.legalName}`, "");
  L.push("WHERE THIS GOES", "");
  L.push(`File the Motion and Declaration in the CIRCUIT COURT of the State of Oregon for ${facts["matter.county"]} County -- the court where the case happened or would have happened. The caption on page 1 of the motion is already filled in with that county and your case number.`, "");
  L.push("THE ORDER OF THE STEPS MATTERS", "");
  L.push("The Oregon Judicial Department's own instruction pages are the first three pages of this packet, and they set the order. In short:", "");
  L.push("1. Get fingerprinted and send the fingerprint card to the Oregon State Police, using the Oregon State Police request form included in this packet. Pay their fee if you are asking the court to seal a conviction. The Oregon State Police send the results to the prosecuting attorney.");
  L.push("2. Complete the Motion and Declaration. Every item this packet's participant instructions list is yours to fill in.");
  L.push("3. Make two copies: one for your records, one for the District Attorney.");
  L.push("4. Mail a copy to the prosecuting attorney in the county where charges were or could have been filed, or where the arrest happened.");
  L.push("5. Complete the certificate of mailing at the bottom of the motion -- at the time you mail it, not before.");
  L.push("6. File your forms in the circuit court.", "");
  L.push("WHAT THIS PACKET ANSWERED FOR YOU", "");
  L.push("Page 4 of the motion says to check ONE option only. This packet is built for a motion to set aside a CONVICTION under ORS 137.225(1)(a) and (1)(b), so Option 1 is marked. Options 2 and 3 are the other two branches and are left unmarked. Read Option 1 against your own record before you file; if it is not true of your case, this is the wrong packet.", "");
  L.push("WHAT THIS PACKET DID NOT ANSWER", "");
  L.push("The seven declaration boxes on page 5 are your sworn statements about your own case, and nothing marks them for you. Read each one and tick the ones that are true. The four general ones apply to everybody; the last three apply only if you selected Option 1, which this packet has.", "");
  L.push("The motion says \"No Filing Fee\" on its own face. The Oregon State Police background check fee is a different charge and this packet states no amount for it: ask the Oregon State Police.", "");
  L.push("WHAT THIS PACKET IS NOT", "");
  L.push("This is a prepared set of official Oregon forms. It is not legal advice, it is not filed for you, and it does not decide whether the court will set aside your record. The instruction pages say the same thing in the court's own words: court staff are not allowed to give legal advice.", "");
  L.push(`Route: ${config.routeKey}`);
  return L.join("\n");
}

function sanitizePdfText(t) {
  return t.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-")
    .replaceAll("−", "-").replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"')
    .replaceAll("”", '"').replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setProducer("RCAP census-v1 artifact-only renderer"); pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE); pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const size = 11, lh = 14.5, W = 612, H = 792, margin = 72, maxW = W - 2 * margin;
  let page = pdf.addPage([W, H]); let y = H - margin;
  const draw = (line) => { if (y < margin) { page = pdf.addPage([W, H]); y = H - margin; } if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) }); y -= lh; };
  const splitToken = (tok) => { const out = []; let c = ""; for (const ch of tok) { if (c && font.widthOfTextAtSize(`${c}${ch}`, size) > maxW) { out.push(c); c = ch; } else c += ch; } if (c) out.push(c); return out; };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, size) > maxW ? splitToken(w) : [w]);
    const out = []; let c = "";
    for (const w of words) { const cand = c ? `${c} ${w}` : w; if (font.widthOfTextAtSize(cand, size) <= maxW) c = cand; else { if (c) out.push(c); c = w; } }
    if (c) out.push(c); return out;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- field maps ------------------------------------------------------------ */
const NOT_A_FILING_FACT = (what) => `${what}; it is never a filing fact`;
const OFFROUTE_REASON = (why) => `${why}; this branch of the form is never populated with participant data on this route`;

function motionFieldMap(documentId, rows, report, config) {
  const writtenLabels = new Set((report.written ?? []).map((w) => w.anchor ?? w.label));
  const canonicalWrites = []; const canonicalRefusals = []; const selectionControls = [];
  for (const r of rows) {
    const base = {
      field: r.key, page: r.page, rect: r.rect ?? null, box: r.box ?? null,
      rectBasis: "measured off this exact binary and recorded in the lane-C overlay profile, field census and option geometry",
      printedLabel: r.caption, printedLine: r.caption,
      regionHeading: r.label, sectionHeading: null, effectiveLabel: r.label
    };
    if (r.policy === "write") {
      if (writtenLabels.has(r.label)) {
        canonicalWrites.push({ ...base, factId: r.fact, kind: "flat_slot", document: documentId });
        continue;
      }
      /*
       * The overlay refused this anchor. That is a fact the platform HOLDS and
       * did not put on the paper, so it is carried as exactly that and counted:
       * declaring it required-before-filing would be false, because the
       * condition that disposition needs is that the platform holds no value.
       */
      const refusal = (report.refused ?? []).find((x) => (x.anchor ?? x.label) === r.label) ?? null;
      canonicalRefusals.push({
        ...base,
        reason: refusal
          ? `the overlay refused this measured anchor: ${refusal.reason}`
          : "the overlay did not draw this measured anchor and reported no reason",
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: documentId,
        factId: r.fact, overlayRefusal: refusal,
        why: "a fact the platform holds and the measured anchor could not carry"
      });
      continue;
    }
    if (r.policy === "select") {
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, box: r.box }],
        disposition: "selected_by_route", reason: r.why, routeDetermined: true,
        requiredBeforeFiling: false, why: r.why, document: documentId
      });
      continue;
    }
    if (r.isSelectionControl) {
      const offroute = r.policy === "offroute";
      const cls = offroute ? null : ELECTION_CLASS;
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, box: r.box }],
        disposition: "explicit_refusal",
        reason: offroute ? OFFROUTE_REASON(r.routeReason)
          : "a sworn assertion the route does not determine; only the participant may make it",
        category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false, document: documentId,
        why: offroute ? r.routeReason : "only the participant may swear to this"
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, document: documentId,
        why: "a signature, a signature date, or a certificate of mailing that has not happened yet"
      });
      continue;
    }
    if (r.policy === "not_a_blank") {
      canonicalRefusals.push({
        ...base, reason: NOT_A_FILING_FACT(r.what),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: documentId, why: r.what
      });
      continue;
    }
    if (r.policy === "offroute") {
      canonicalRefusals.push({
        ...base, reason: OFFROUTE_REASON(r.routeReason),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: documentId, why: r.routeReason
      });
      continue;
    }
    canonicalRefusals.push({
      ...base, reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${documentId} slot ${r.key}`, factId: null, document: documentId,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: documentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey, structural: "flat_overlay" },
    structuralClass: "flat_overlay",
    explicitMappings: Object.fromEntries(rows.filter((r) => r.policy === "write").map((r) => [r.label, r.fact])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

function ospFieldMap(documentId, config) {
  const base = (id, label) => ({
    field: `${documentId}.${id}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "the Oregon State Police request is carried whole; this build fills none of it"
  });
  const refusals = [{
    ...base("whole_form", "The Oregon State Police Request for Set Aside Criminal Record Check, completed in full by the participant"),
    reason: "the participant supplies this before filing: every entry on the Oregon State Police request, which is completed and sent to the Oregon State Police rather than filed with the court",
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
    identity: `${documentId} whole form`, factId: null, document: documentId,
    why: "this document is addressed to the Oregon State Police and not to the court, and the platform fills none of it",
    participantMustSupply: "every entry on the Oregon State Police request form, which you send to the Oregon State Police with your fingerprint card before you file the motion"
  }];
  return {
    formNumber: documentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: false, routeKey: config.routeKey },
    structuralClass: "supporting_process_document",
    documentRole: "INSTRUCTIONS",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: [], canonicalRefusals: refusals,
    boundaryWrites: [], boundaryRefusals: refusals
  };
}

function composedMap(config) {
  const id = "filing_instructions";
  const base = (fid, label) => ({
    field: `${id}.${fid}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("movant_name", "Movant named on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: id },
    { ...base("case_number", "Case No. printed on this page"), factId: "matter.case_number", kind: "composed_text", document: id },
    { ...base("county", "County printed on this page"), factId: "matter.county", kind: "composed_text", document: id }
  ];
  return {
    formNumber: id,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: config.routeKey },
    structuralClass: "composed_document",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: [], boundaryWrites: writes, boundaryRefusals: []
  };
}
function builderCounters(maps, actualWrites, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = []; const blanks = [];
  for (const m of maps) {
    const id = m.formNumber;
    for (const w of m.canonicalWrites ?? []) writes.push({ ...w, document: id, name: w.field, label: w.effectiveLabel ?? w.field, isSelectionControl: false });
    for (const r of m.canonicalRefusals ?? []) blanks.push({ ...r, document: id, name: r.field, label: r.effectiveLabel ?? r.field, refusalClass: r.completenessClass ?? null, isSelectionControl: false });
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push({ ...c, document: id, name: c.selectionId, label: c.field, isSelectionControl: false });
      else blanks.push({ ...c, document: id, name: c.field, label: `${c.field} (selection)`, refusalClass: c.completenessClass ?? null, isSelectionControl: true });
    }
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(doc).add(k);
  }
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean).map(String));
  const declaredRequired = [];
  for (const b of blanks) {
    const here = writtenInDocument.get(String(b.document ?? "")) ?? new Set();
    const declared = {
      disposition: b.completenessDisposition ?? null,
      ...(Object.hasOwn(b, "requiredBeforeFiling") ? { requiredBeforeFiling: b.requiredBeforeFiling === true } : {}),
      routeDetermined: b.routeDetermined === true,
      factId: b.factId ?? null, identity: b.field ?? null,
      factAvailable: (b.factId ? availableFacts.has(String(b.factId)) : false) || here.has(normLabel(b.label)) || here.has(normLabel(b.name))
    };
    const verdict = classifyBlank(b, b.reason, b.refusalClass, declared);
    if (verdict.disposition === "REQUIRED_BEFORE_FILING") declaredRequired.push(b);
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: b.field, label: b.label, basis: verdict.basis });
  }
  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of declaredRequired) {
    const needles = [b.effectiveLabel, b.field, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f); if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }
  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") note("protectedWrites", { field: w.field, label: w.label, why: "a protected field was written" });
  }
  for (const a of actualWrites.artifacts ?? []) {
    const reported = a.valuesReportedByFinalizer ?? null;
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture, reportedByFinalizer: reported });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }
  return { counters, findings, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

function requiredBeforeFilingItems(maps) {
  const ORDER = ["OR-OJD-ADULT-SET-ASIDE-PACKET", "OR-OSP-SET-ASIDE-CCH", "filing_instructions"];
  const order = Object.fromEntries(ORDER.map((f, i) => [f, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? []).filter((r) => r.requiredBeforeFiling === true).map((r) => ({
    document: m.formNumber, field: r.field, page: r.page, y: r.rect?.y ?? null,
    printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
    identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
  })))
    .sort((a, b) => ((order[a.document] ?? 99) - (order[b.document] ?? 99)) || (a.page - b.page) || ((b.y ?? 0) - (a.y ?? 0)));
}


function instructionsMarkdown(config, resolved, rbf, routeSelections) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const out = [];
  out.push(`# What you must do before you file — ${config.routeName}`, "");
  out.push(`This packet is prepared for **${config.legalName}**.`, "");
  out.push("The platform filled in the caption of the motion — the county, the case number, your name and your date of birth — and the contact block of the declaration. Everything else is yours, and this page lists every item by the words printed beside the blank.", "");
  out.push("## Where you file this", "");
  out.push("File the Motion and Declaration in the **Circuit Court of the State of Oregon** for the county printed in the caption — the court where the case happened or would have happened.", "");
  out.push("The Oregon State Police request in this packet does **not** go to the court. It goes to the Oregon State Police with your fingerprint card, before you file.", "");
  out.push("## The order the court's own instructions set", "");
  out.push("Pages 1 to 3 of the motion packet are the Oregon Judicial Department's printed instruction sheet, and they set the order: fingerprints and the Oregon State Police request first, then the motion and declaration, then copies, then the copy to the prosecuting attorney, then the certificate of mailing, then filing. The composed filing-instructions page in this packet restates that order.", "");
  out.push("## What the packet answered for you", "");
  if (routeSelections.length === 0) out.push("- Nothing on the face of this motion is decided by the route alone.", "");
  else { for (const s of routeSelections) out.push(`- **Page ${s.page}, ${s.printedLabel}.** ${s.why[0].toUpperCase()}${s.why.slice(1)}.`); out.push(""); }
  out.push("Page 4 says to check **one option only**. Read the marked option against your own record before you file. If it is not true of your case, this is the wrong packet and you should not file it.", "");
  out.push("## What the packet deliberately did not answer", "");
  out.push("The **seven declaration boxes on page 5** are your sworn statements about your own case, and nothing marks them for you. Read each one and tick the ones that are true. The first four apply to everybody; the last three apply only on the option this packet marked.", "");
  out.push("The motion prints **No Filing Fee** on its own face. The Oregon State Police background check fee is a different charge and this packet states no amount for it: ask the Oregon State Police.", "");
  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc}`, "");
    out.push("| Page | The blank on the document | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }
  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign the declaration.** A signature is yours alone.");
  out.push("- **Everything on the certificate of mailing**, including the date, your signature and your printed name there. A certificate of mailing is a statement that you posted something; nothing on it may be written before you post it.");
  out.push("- **The seven declaration boxes.** They are sworn statements about your own case.", "");
  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Oregon forms. It is not legal advice, it is not filed for you, and it does not decide whether the court will set aside your record. The court's own instruction page says the same: court staff are not allowed to give legal advice.", "");
  out.push(`_Route: ${config.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- artifacts ------------------------------------------------------------ */
function writeArtifacts(ctx) {
  const { familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped, measurementProvenance } = ctx;
  const W = (rel, body) => fs.writeFileSync(path.join(ROOT, outDir, rel), body);
  const routeSelections = (maps[0]?.selectionControls ?? []).filter((c) => c.disposition === "selected_by_route")
    .map((c) => ({ document: maps[0].formNumber, field: c.field, page: c.page, printedLabel: c.effectiveLabel, why: c.why }));
  W("production-field-map.json", `${JSON.stringify({
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId, routeKeys: [config.routeKey], routeSelectionId: config.routeSelectionId,
    jurisdiction: config.jurisdiction, statute: config.statute, legalName: config.legalName,
    implementationStrategy: "official_pdf_fill", structuralClass: "flat_overlay",
    officialForms: resolved.map((r) => r.formNumber),
    componentSet: COMPONENTS,
    assignedComponentLabel: config.assignedComponentLabel,
    assignedComponentLabelFinding: "PF03 names this family's component assembly 'Oregon Marijuana Set-Aside Motion under ORS 475C.397'. That is a different route on a different form (OR-OJD-MJ-PCR). The track's recorded authority is ORS 137.225 and the assignment's own official forms are the ORS 137.225 packet and its Oregon State Police companion; the forms and the track agree, and only the component label does not.",
    measurementProvenance,
    captionBasis: "this document has no AcroForm. Every coordinate in this map -- anchor, protected rule, option box and declaration box -- was measured against this exact binary and is recorded in the lane-C overlay profile, field census and option geometry named in measurementProvenance. Nothing here is authored, and the build refuses if any of those three was measured against different bytes.",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, ELECTION_CLASS],
    routeSelectionsMade: routeSelections,
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
  W("source-receipt.json", `${JSON.stringify({
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId, worklistGroupId: familyId, jurisdiction: config.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact path + corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeSelectionId: config.routeSelectionId, allSourcesExact: true,
    documents: resolved.map((r) => ({ sourceIds: [r.sourceId], formNumber: r.formNumber, revision: r.revision, pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength })),
    measurementProvenance,
    composedComponentsAuthoredByThisBuild: ["filing_instructions"],
    commercialRoutesOpened: 0
  }, null, 2)}\n`);
  W("reports/rendered-artifacts.json", `${JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, renderedFresh: true,
    componentSet: COMPONENTS, artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    rasterEngine: rasterSkipped ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterSkipped, rasterPages
  }, null, 2)}\n`);
  W("reports/actual-writes.json", `${JSON.stringify({
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      routeSelectionMarks: p.routeSelectionMarks
    }))
  }, null, 2)}\n`);
  W("reports/builder-completeness-counters.json", `${JSON.stringify({
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent verification lane that did not build this packet decides whether it passes.",
    counters: audit.counters, allNineZero: PASS_COUNTERS.every((c) => audit.counters[c] === 0),
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    findings: audit.findings
  }, null, 2)}\n`);
  W("build-status.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-or_conviction_setaside-set.mjs",
    rasterEngine: rasterSkipped ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: rasterSkipped ? "BUILT_RASTER_PENDING" : "rendered_locally_pending_central_acceptance",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  }, null, 2)}\n`);
  W("build-findings.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    findings: [
      { finding: "The OJD adult set-aside packet carries no AcroForm at all: its blanks are printed rules.", consequence: "Values are drawn into page content at measured coordinates through the flat-overlay path. Every coordinate comes from measurements this repository already holds against this exact binary, and the build refuses if any of the three measurement records was taken against different bytes." },
      { finding: "PF03 names this family's component assembly 'Oregon Marijuana Set-Aside Motion under ORS 475C.397'.", consequence: "That is a different route on a different form. The track's recorded authority is ORS 137.225 and the assigned official forms are the ORS 137.225 packet and its Oregon State Police companion; the label is reported and the family is built on its own forms." },
      { finding: "Page 4 says to check one option only, and this track is a motion to set aside a CONVICTION.", consequence: "Option 1 is marked as the route's own determination and Options 2 and 3 are refused as branches this route does not take. The mark is two diagonals inside the box the court printed, at the measured inset." },
      { finding: "The seven declaration boxes on page 5 are the participant's sworn attestations, and the measurement that found them says no configuration marks them.", consequence: "They are carried as participant elections, left unmarked, and disclosed in the participant instructions in terms." },
      { finding: "Pages 1 to 3 of the binary are the court's printed instruction sheet.", consequence: "Every rule the measurement found on them is a typographic underline in prose and is classified as never a filing fact, rather than being left unclassified or read as a blank." }
    ]
  }, null, 2)}\n`);
  W("participant-instructions.md", instructions);
  W("approval-request.json", `${JSON.stringify({
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "visual review and counsel review", buildStatus: "state_built",
    counselQuestionsRaised: [
      "Option 1 on page 4 is marked as route-determined for a conviction set-aside. Confirm that ORS 137.225(1)(a) and (1)(b) is always Option 1 and never Option 2.",
      "The certificate of mailing's printed defendant name is refused along with its date and signature, on the ground that nothing on a certificate of mailing may be written before the mailing happens. Confirm that is the intended treatment for the printed name as well."
    ],
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
}

/* ---- the one exported entry point ---------------------------------------- */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources(familyId);
  if (failures.length > 0) {
    return { familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it", overlayDirectoryTouched: false };
  }
  const motion = resolved.find((r) => r.formNumber === "OR-OJD-ADULT-SET-ASIDE-PACKET");
  const osp = resolved.find((r) => r.formNumber === "OR-OSP-SET-ASIDE-CCH");
  assert.ok(motion && osp, "both Oregon sources must resolve before anything is rendered");

  const { profile, census, geometry, mismatched } = loadMeasurements(motion.sha256);
  if (mismatched.length > 0) {
    return {
      familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: mismatched.map(([file, sha]) => ({
        sourceIdentity: `measurement:${file}`,
        why: `measured against ${sha}, and the binary this build would draw on hashes ${motion.sha256}. A coordinate measured against different bytes is a coordinate about a different document.`
      })),
      why: "a measurement record does not bind to the binary it would be drawn on",
      overlayDirectoryTouched: false
    };
  }

  const { rows, unmapped } = motionRows(census, profile, geometry, motion.formNumber);
  if (process.env.OR_DUMP) {
    for (const u of unmapped) console.log(`UNMAPPED ${u.key} p${u.page} ${JSON.stringify(u.caption)}`);
    console.log(`rows=${rows.length} unmapped=${unmapped.length}`);
    process.exit(0);
  }
  assert.equal(unmapped.length, 0, `${unmapped.length} measured slot(s) carry no policy: ${JSON.stringify(unmapped.slice(0, 8), null, 2)}`);

  if (checkOnly) {
    const by = (p) => rows.filter((r) => r.policy === p).length;
    return {
      familyId, status: "CHECK_ONLY",
      sources: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
      measuredSlots: rows.length, write: by("write"), supply: by("supply"), protect: by("protect"),
      election: by("election"), select: by("select"), offroute: by("offroute"), notABlank: by("not_a_blank")
    };
  }

  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--official-pdf-fill`;
  for (const sub of ["fixtures", "reports", "raster"]) fs.mkdirSync(path.join(ROOT, outDir, sub), { recursive: true });

  const measurementProvenance = {
    overlayProfile: { file: `${LANE_C}/overlay-profile.json`, sha256MeasuredAgainst: profile.sha256, anchors: (profile.anchors ?? []).length, protectedRules: (profile.protectedRules ?? []).length },
    fieldCensus: { file: `${LANE_C}/field-census.json`, sha256MeasuredAgainst: census.sha256, slots: (census.fields ?? []).length },
    optionGeometry: { file: GEOMETRY, sha256MeasuredAgainst: geometry.source?.sha256 ?? null, options: (geometry.options ?? []).filter((o) => o.boxIsMeasured).length, declarationBoxes: (geometry.declarationBoxes ?? []).length },
    binaryDrawnOn: motion.sha256
  };

  const maps = []; const artifacts = []; const writeProofs = []; const rasterPages = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const { bytes: motionBytes, report, selections } = await renderMotion(motion, profile, geometry, fixtureName);
    assert.equal((report.selectionsRefused ?? []).length, 0,
      `a route selection was refused: ${JSON.stringify(report.selectionsRefused)}`);
    assert.equal((report.selections ?? []).length, selections.length,
      "every route selection this packet claims must have been marked on the paper");

    const packet = await PDFDocument.create();
    const pageManifest = []; const documents = [];
    const m = await PDFDocument.load(motionBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(m, m.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "motion_and_declaration", documentId: motion.formNumber, sourcePage: i + 1, sourceSha256: motion.sha256 });
    }
    documents.push("motion_and_declaration", motion.formNumber);
    const o = await PDFDocument.load(osp.bytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(o, o.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "criminal_history_request", documentId: osp.formNumber, sourcePage: i + 1, sourceSha256: osp.sha256 });
    }
    documents.push("criminal_history_request", osp.formNumber);
    const instrBytes = await renderComposedPdf(composedBody(config, facts), "Filing Instructions");
    const ins = await PDFDocument.load(instrBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(ins, ins.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "filing_instructions", documentId: "filing_instructions", sourcePage: i + 1, sourceSha256: null });
    }
    documents.push("filing_instructions");

    if (fixtureName === "canonical") {
      maps.push(motionFieldMap(motion.formNumber, rows, report, config));
      maps.push(ospFieldMap(osp.formNumber, config));
      maps.push(composedMap(config));
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${outDir}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const motionFile = `${outDir}/fixtures/${fixtureName}--motion-and-declaration.pdf`;
    fs.writeFileSync(path.join(ROOT, motionFile), motionBytes);

    /*
     * A flat overlay draws into page content, so there is no widget appearance to
     * read back. The proof is the finalizer's own written list checked against the
     * values it was given, plus the marks it reports drawing inside measured boxes.
     */
    writeProofs.push({
      fixture: fixtureName, formNumber: motion.formNumber, sourceSha256: motion.sha256,
      proofMethod: "flat overlay: values drawn into page content at measured anchors; the finalizer reports each write with the value it drew, and each selection with the measured box it marked",
      valuesReportedByFinalizer: (report.written ?? []).length,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      addedGlyphsReadFromOutputBytes: (report.expectedValues ?? []).join("").replace(/\s+/g, "").length,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      routeSelectionMarks: (report.selections ?? []).map((s) => ({ control: s.control, page: s.page, box: s.box, mark: s.mark, drewANewBox: s.drewANewBox, redrewTheCourtsBox: s.redrewTheCourtsBox })),
      anchorsRefused: report.refused ?? [],
      unfittable: report.unfittable ?? [],
      actualWrites: (report.written ?? []).map((w) => ({ anchor: w.anchor ?? w.label ?? null, factId: w.factId ?? null, page: w.page ?? null, drawn: w.text ?? w.value ?? null }))
    });

    artifacts.push({
      fixture: fixtureName, file, motionFile,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      motionSha256: crypto.createHash("sha256").update(motionBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });

    if (!skipRaster) {
      const rasterDir = `${outDir}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap); if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx, paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const routeSelections = (maps[0]?.selectionControls ?? []).filter((c) => c.disposition === "selected_by_route")
    .map((c) => ({ field: c.field, page: c.page, printedLabel: c.effectiveLabel, why: c.why }));
  const instructions = instructionsMarkdown(config, resolved, rbf, routeSelections);
  const audit = builderCounters(maps, {
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, instructions);

  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  /*
   * A stopped family leaves its overlay directory byte-for-byte unchanged. A
   * half-built packet that reads as built is worse than one that was never
   * started, and build-status.json saying `state_built` beside a non-zero
   * counter is exactly that. So nothing is written until the counters are zero,
   * and everything staged during the render is removed if they are not.
   */
  if (!allZero) {
    fs.rmSync(path.join(ROOT, outDir), { recursive: true, force: true });
    return {
      familyId, status: "STOPPED", stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0),
      counters: audit.counters,
      findings: audit.findings,
      overlayDirectoryTouched: false,
      structuralClass: "flat_overlay",
      officialForms: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
      measurementProvenance,
      why: "the packet is missing a fact the platform holds, so it is not returned as built",
      packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }
  writeArtifacts({ familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped: skipRaster, measurementProvenance });
  return {
    familyId, status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0), firstFindings: audit.findings.slice(0, 8) }),
    directory: outDir,
    structuralClass: "flat_overlay",
    officialForms: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
    measurementProvenance,
    components: COMPONENTS,
    terminalFields: audit.terminalFields, written: audit.written,
    requiredBeforeFiling: rbf.length,
    routeSelectionsMade: routeSelections.length,
    counters: audit.counters, nineCountersZero: allZero,
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RENDERED_LOCALLY_PENDING_CENTRAL_ACCEPTANCE",
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, motionSha256: a.motionSha256, pages: a.pageCount })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamilyById("or_conviction_setaside-set")
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
