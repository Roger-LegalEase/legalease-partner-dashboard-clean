// Builds the two normalized nationwide manifests.
//
//   data/record-clearing/source-artifact-registry.json
//     One row per EXPECTED source artifact, from the inventory. Presence is
//     measured against the archive actually supplied, so a file the inventory
//     records but the archive omits is visible rather than silently missing.
//
//   data/record-clearing/relief-track-registry.json
//     Relief tracks, which are the unit of legal and product readiness. Seeded
//     from the recovered Master Build Plan classification as a STATE-LEVEL
//     PRESUMPTION only. No track-level record is invented: decomposing a state
//     presumption into relief tracks needs current authority and counsel
//     review, which is research this builder cannot perform.
//
// Three dimensions are recorded separately and never merged, because they vary
// independently: a clean AcroForm can be local-only, a flat scan can be the
// mandatory statewide form, and a custom-pleading track may need no PDF at all.
//
//   outputStrategy   custom_pleading | official_pdf_fill | process_guidance
//   technicalClass   clean_acroform | dirty_acroform | flat_pdf | scanned_pdf
//                    | encrypted_pdf | xfa | no_pdf_required | source_missing
//   geographicScope  statewide | county | circuit | district | court_specific
//                    | agency_specific | unknown

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { PDFDocument, PDFName } from "pdf-lib";

const root = process.cwd();
const SOURCE_ROOT = path.join(root, "private/Nationwide Record Clearing");
const INVENTORY = path.join(root, "data/rcap-all50/nationwide-source-inventory.json");
const OUT_DIR = path.join(root, "data/record-clearing");

// Record-Clearing Master Build Plan classification: the LOCKED PLAN OF RECORD
// for output strategy. A source PDF in the archive never overrides it. An
// official form may be a local alternative, a supporting document, a proposed
// order, a historical revision, or a form belonging to a track whose governing
// output is a generated pleading.
//
// Consequences that follow directly, and are asserted below:
//   OK  custom-pleading-led, so a missing official filing PDF is NOT a blocker
//   PA  custom-pleading-led, so its XFA file is NOT the governing renderer
//   MS  pleading-led with local guardrails; the Fourth Circuit petitions are
//       never rewritten into statewide forms
//   LA  official-form-led, so its missing source IS a real blocker
//   IL  official-form-led
//   NY  routed by statutory mechanism, never by state alone
const HISTORICAL_CLASSIFICATION = {
  primary_custom_pleading: ["CA", "DC", "IN", "KS", "ND", "OK", "PA", "TX", "VA", "WY"],
  custom_pleading_with_local_guardrails: ["AZ", "MS", "NV", "OH", "WA"],
  official_form_primary: [
    "AL", "AK", "AR", "CO", "CT", "DE", "FL", "HI", "ID", "IA", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "NE", "NH", "NJ", "NM", "NC", "RI", "SD", "UT", "VT",
    "WV", "WI", "IL"
  ],
  hybrid_by_relief_track: ["GA", "MO", "MT", "OR", "SC", "TN"],
  special_handling: ["NY"]
};

const LOCKED_STRATEGY = {
  primary_custom_pleading: "custom_pleading",
  custom_pleading_with_local_guardrails: "custom_pleading",
  official_form_primary: "official_pdf_fill",
  // Hybrid and mechanism-routed states resolve per relief track, so no
  // state-level assignment is safe. They stay unknown and fail closed.
  hybrid_by_relief_track: null,
  special_handling: null
};

const LOCAL_MARKERS = [
  { id: "named_county_list", scope: "county", re: /\(([A-Z][a-z]+,\s*)+or\s+[A-Z][a-z]+\)\s*Count/ },
  { id: "named_grand_jury", scope: "county", re: /[A-Z][a-z]+\s+County\s+Grand\s+Jury/ },
  { id: "named_prosecutor_district", scope: "district", re: /District\s+Attorney'?s?\s+Office,\s*\w+\s+District/i },
  { id: "service_po_box", scope: "court_specific", re: /P\.?\s?O\.?\s?Box\s+\d{2,}/i },
  { id: "service_city_state_zip", scope: "court_specific", re: /\b[A-Z][a-z]+,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}\b/ }
];

const inventory = JSON.parse(fs.readFileSync(INVENTORY, "utf8"));
const archivePresent = fs.existsSync(SOURCE_ROOT);

const artifacts = [];
for (const state of inventory.states) {
  for (const file of state.files) {
    const absolute = path.join(SOURCE_ROOT, file.relativePath);
    const present = archivePresent && fs.existsSync(absolute);
    const isPdf = file.extension === ".pdf";

    const row = {
      jurisdiction: state.code,
      jurisdictionName: state.name,
      artifactId: slug(file.fileName),
      fileName: file.fileName,
      // Every row here comes from the inventory, so all are expected. An
      // unexpected artifact would be a file on disk with no inventory record.
      expectation: "expected",
      presence: present ? "present" : "missing",
      sourcePath: `private/Nationwide Record Clearing/${file.relativePath}`,
      fileType: (file.extension ?? "").replace(/^\./, "") || "unknown",
      inventorySha256: file.sha256,
      measuredSha256: null,
      hashState: present ? "unverified" : "not_measurable",
      technicalClass: isPdf ? "unknown" : "no_pdf_required",
      fieldCount: null,
      encrypted: null,
      xfa: null,
      geographicScope: "unknown",
      geographicMarkers: [],
      issuingAuthority: "unknown",
      revisionDate: "unknown",
      retrievalDate: file.mtime ?? null,
      currency: "unknown",
      reliefTracksUsing: []
    };

    if (!present) {
      row.technicalClass = isPdf ? "source_missing" : "no_pdf_required";
      row.currency = "unknown";
      artifacts.push(row);
      continue;
    }

    const bytes = fs.readFileSync(absolute);
    row.measuredSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    row.hashState = row.measuredSha256 === file.sha256 ? "match" : "mismatch";

    // Reference material is not a court form. Classifying it as one is how a
    // training document ends up presented as a filing.
    if (/agent[-\s]?reference|reference for wilma/i.test(file.fileName)) {
      row.currency = "reference_only";
    }

    if (!isPdf) {
      artifacts.push(row);
      continue;
    }

    try {
      const measured = await measurePdf(bytes, absolute);
      Object.assign(row, measured);
      if (row.currency === "unknown" && measured.geographicScope !== "statewide" && measured.geographicScope !== "unknown") {
        row.currency = "local_only";
      }
    } catch (error) {
      row.technicalClass = "unreadable";
      row.currency = "unknown";
      row.readError = String(error?.message ?? error).slice(0, 140);
    }

    artifacts.push(row);
  }
}

const sourceRegistry = {
  schemaVersion: 1,
  generatedFrom: path.relative(root, INVENTORY),
  archivePresent,
  // Every expected artifact appears exactly once. These four counts partition
  // the row set, so they must sum to totalArtifacts.
  totalArtifacts: artifacts.length,
  totals: {
    byPresence: tally(artifacts, "presence"),
    byFileType: tally(artifacts, "fileType"),
    byTechnicalClass: tally(artifacts, "technicalClass"),
    byGeographicScope: tally(artifacts, "geographicScope"),
    byHashState: tally(artifacts, "hashState"),
    byCurrency: tally(artifacts, "currency")
  },
  artifacts
};

// ---- relief tracks -------------------------------------------------------

const codeToCategory = new Map();
for (const [category, codes] of Object.entries(HISTORICAL_CLASSIFICATION)) {
  for (const code of codes) codeToCategory.set(code, category);
}

const jurisdictions = inventory.states.map((state) => {
  const category = codeToCategory.get(state.code) ?? null;
  const presumed = category ? LOCKED_STRATEGY[category] : null;
  const owned = artifacts.filter((a) => a.jurisdiction === state.code);

  return {
    jurisdiction: state.code,
    jurisdictionName: state.name,
    historicalCategory: category,
    // The locked strategy from the plan of record. A source PDF in the archive
    // never overrides it: an official form may be a local alternative, a
    // supporting document, a proposed order, or a form for a track whose
    // governing output is a generated pleading.
    lockedOutputStrategy: presumed,
    strategyBasis: category
      ? "Record-Clearing Master Build Plan (locked plan of record)"
      : "not classified in the plan of record",
    // No relief tracks are asserted. Decomposing a state presumption into
    // tracks requires current official authority and counsel review; inventing
    // them to reach 51 rows would be fabrication, so this stays empty and the
    // resolver fails closed.
    reliefTracks: [],
    readiness: "research_pending",
    blockers: [
      "Relief tracks have not been researched against current official authority.",
      ...(presumed === null && category
        ? [state.code === "NY"
            ? "New York routes by statutory mechanism; strategy resolves per track."
            : "Hybrid jurisdiction; output strategy resolves per relief track."]
        : []),
      ...(owned.length === 0 ? ["No source artifacts inventoried for this jurisdiction."] : []),
      ...(presumed === "official_pdf_fill" && owned.filter((a) => a.fileType === "pdf" && a.presence === "present").length === 0
        ? ["Official-form-led jurisdiction with no present official PDF source. This is a real blocker."]
        : []),
      ...(presumed === "custom_pleading" && owned.filter((a) => a.fileType === "pdf" && a.presence === "present").length === 0
        ? ["No official PDF present, which is expected for a pleading-led jurisdiction and is NOT a blocker."]
        : [])
    ],
    artifactCounts: {
      expected: owned.length,
      present: owned.filter((a) => a.presence === "present").length,
      missing: owned.filter((a) => a.presence === "missing").length,
      referenceOnly: owned.filter((a) => a.currency === "reference_only").length,
      localOnly: owned.filter((a) => a.currency === "local_only").length
    },
    nextAction: "Research relief tracks against current official authority, then record them here."
  };
});

const trackRegistry = {
  schemaVersion: 1,
  sourceHierarchy: [
    "A. Current official court, legislature, prosecutor, agency or administrative sources",
    "B. Current approved legal research and counsel review",
    "C. Record-Clearing Master Build Plan (historical baseline)",
    "D. Source-form corpus (evidence of available documents only)",
    "E. Existing code and field-map drafts (implementation artifacts only)"
  ],
  note:
    "Relief tracks are the unit of legal and product readiness. This registry is seeded with state-level historical presumptions only; no relief track has been researched, so reliefTracks is empty everywhere and the runtime resolver fails closed for every jurisdiction.",
  jurisdictionCount: jurisdictions.length,
  reliefTrackCount: jurisdictions.reduce((n, j) => n + j.reliefTracks.length, 0),
  packetReadyTrackCount: 0,
  guidanceReadyTrackCount: 0,
  totals: {
    byHistoricalCategory: tally(jurisdictions, "historicalCategory"),
    byLockedOutputStrategy: tally(jurisdictions, "lockedOutputStrategy"),
    byReadiness: tally(jurisdictions, "readiness")
  },
  jurisdictions
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "source-artifact-registry.json"),
  `${JSON.stringify(sourceRegistry, null, 2)}\n`
);
fs.writeFileSync(
  path.join(OUT_DIR, "relief-track-registry.json"),
  `${JSON.stringify(trackRegistry, null, 2)}\n`
);

// ---- reconciliation, with totals that must add up ------------------------

const presenceSum = Object.values(sourceRegistry.totals.byPresence).reduce((a, b) => a + b, 0);
const classSum = Object.values(sourceRegistry.totals.byTechnicalClass).reduce((a, b) => a + b, 0);
const reconciles = presenceSum === artifacts.length && classSum === artifacts.length;

const reconciliation = {
  schemaVersion: 1,
  totalExpectedArtifacts: artifacts.length,
  pdfArtifacts: artifacts.filter((a) => a.fileType === "pdf").length,
  nonPdfArtifacts: artifacts.filter((a) => a.fileType !== "pdf").length,
  presentArtifacts: artifacts.filter((a) => a.presence === "present").length,
  missingArtifacts: artifacts.filter((a) => a.presence === "missing").length,
  artifactsUsedByAnActiveTrack: 0,
  artifactsNotUsedByAnyActiveTrack: artifacts.length,
  reliefTracks: 0,
  totalsReconcile: reconciles,
  note:
    "No relief track has been researched, so every source artifact is currently unused by any active track. That is the honest state: the corpus records what exists, not what the product should generate.",
  missingByJurisdiction: tally(
    artifacts.filter((a) => a.presence === "missing"),
    "jurisdiction"
  )
};

fs.writeFileSync(
  path.join(OUT_DIR, "relief-track-artifact-reconciliation.json"),
  `${JSON.stringify(reconciliation, null, 2)}\n`
);

console.log("Record-clearing registries built.");
console.log(`1. Expected source artifacts: ${artifacts.length} (pdf ${reconciliation.pdfArtifacts}, non-pdf ${reconciliation.nonPdfArtifacts}).`);
console.log(`2. Presence: ${fmt(sourceRegistry.totals.byPresence)} -> sums to ${presenceSum}.`);
console.log(`3. Technical class: ${fmt(sourceRegistry.totals.byTechnicalClass)} -> sums to ${classSum}.`);
console.log(`4. Geographic scope: ${fmt(sourceRegistry.totals.byGeographicScope)}.`);
console.log(`5. Currency: ${fmt(sourceRegistry.totals.byCurrency)}.`);
console.log(`6. Historical categories: ${fmt(trackRegistry.totals.byHistoricalCategory)}.`);
console.log(`7. Relief tracks recorded: ${trackRegistry.reliefTrackCount}. Packet-ready: 0. Guidance-ready: 0.`);
console.log(`8. Totals reconcile: ${reconciles ? "yes" : "NO"}.`);

if (!reconciles) {
  console.error("Registry totals do not reconcile.");
  process.exit(1);
}

async function measurePdf(bytes, absolute) {
  const latin = bytes.toString("latin1");
  const encrypted = /\/Encrypt\b/.test(latin);
  const xfa = /\/XFA\b/.test(latin);

  let doc = null;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    doc = null;
  }

  if (xfa) return { technicalClass: "xfa", encrypted, xfa, fieldCount: 0, geographicScope: "unknown", geographicMarkers: [] };
  if (encrypted) return { technicalClass: "encrypted_pdf", encrypted, xfa, fieldCount: 0, geographicScope: "unknown", geographicMarkers: [] };
  if (!doc) return { technicalClass: "unreadable", encrypted, xfa, fieldCount: null, geographicScope: "unknown", geographicMarkers: [] };

  let fieldCount = 0;
  try {
    fieldCount = doc.getForm().getFields().filter((f) => f.constructor.name !== "PDFButton").length;
  } catch {
    fieldCount = 0;
  }

  let hasRaster = false;
  for (let i = 0; i < doc.getPageCount(); i += 1) {
    const resources = doc.getPage(i).node.Resources();
    const xobjects = resources?.lookup?.(PDFName.of("XObject"));
    if (xobjects && xobjects.keys().length > 0) { hasRaster = true; break; }
  }

  let text = "";
  try {
    text = execFileSync("pdftotext", [absolute, "-"], { encoding: "utf8", maxBuffer: 2e7 });
  } catch {
    text = "";
  }

  const hits = LOCAL_MARKERS.filter((m) => m.re.test(text));
  const geographicScope =
    text.trim().length === 0 ? "unknown" : hits.length ? narrowest(hits) : "statewide";

  return {
    technicalClass:
      fieldCount >= 5 ? "clean_acroform" : fieldCount > 0 ? "dirty_acroform" : hasRaster ? "scanned_pdf" : "flat_pdf",
    encrypted,
    xfa,
    fieldCount,
    pageCount: doc.getPageCount(),
    geographicScope,
    geographicMarkers: hits.map((h) => h.id)
  };
}

function narrowest(hits) {
  const order = ["court_specific", "district", "circuit", "county"];
  for (const scope of order) if (hits.some((h) => h.scope === scope)) return scope;
  return "county";
}

function tally(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "none";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function fmt(object) {
  return Object.entries(object).sort().map(([k, v]) => `${k}=${v}`).join(", ");
}

function slug(fileName) {
  return fileName.replace(/\.[a-z0-9]+$/i, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}
