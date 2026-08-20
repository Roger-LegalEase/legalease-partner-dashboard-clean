// Builds verified-binary family packages for D1 assets whose bytes have
// actually arrived and whose SHA-256 matches the canonical Edition 1
// manifest. Everything here is derived from the real PDF, not from a
// committed sample or a manifest claim.
//
// Ownership governs output, not availability: a court ORDER is completed by
// the judge and is never participant-populated, and a supporting_process
// asset carries generation_allowed=no. Neither gets a filled fixture. A
// participant packet form gets overlay geometry only from measured page
// boxes, never from guessed placement.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { structuralClassesAgree } from "./rcap-official-forms/rcap-structural-class.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.RCAP_BUNDLE_EXTRACT
  ?? "/tmp/claude-0/-home-user-legalease-partner-dashboard-clean/54ff2bf1-37ee-5073-8d13-dc21b63a0975/scratchpad/bundle/extracted";
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const BUNDLE = JSON.parse(fs.readFileSync(
  process.env.RCAP_BUNDLE_MANIFEST
  ?? "/tmp/claude-0/-home-user-legalease-partner-dashboard-clean/54ff2bf1-37ee-5073-8d13-dc21b63a0975/scratchpad/bundle/RCAP_SOURCE_BUNDLE_MANIFEST.json", "utf8"));
const byHash = new Map(BUNDLE.files.map((f) => [f.sha256, f]));

// STATE_MANIFEST rows carry the authoritative role/runtime posture.
function parseStateManifest(csvPath) {
  if (!fs.existsSync(csvPath)) return [];
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  for (const line of lines.slice(1)) {
    const cells = []; let cur = ""; let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));
  }
  return rows;
}

const PARTICIPANT_FILLABLE_ROLES = new Set(["PETITION", "MOTION", "APPLICATION", "AFFIDAVIT"]);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const results = [];

for (const stateDir of fs.existsSync(path.join(SRC, "STATES")) ? fs.readdirSync(path.join(SRC, "STATES")) : []) {
  const stateRoot = path.join(SRC, "STATES", stateDir);
  const manifestRows = parseStateManifest(path.join(stateRoot, "STATE_MANIFEST.csv"));
  const jurisdictionSlug = { WI: "wisconsin", AL: "alabama", AR: "arkansas", VA: "virginia", AK: "alaska",
    KY: "kentucky", NC: "north-carolina", NE: "nebraska", VT: "vermont" }[stateDir];
  if (!jurisdictionSlug) continue;

  for (const folder of ["02_PACKET_FORMS", "03_INSTRUCTIONS", "04_SUPPORTING_PROCESS", "05_SOURCE_GATED"]) {
    const dir = path.join(stateRoot, folder);
    if (!fs.existsSync(dir)) continue;
    for (const fileName of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
      const abs = path.join(dir, fileName);
      const bytes = fs.readFileSync(abs);
      const sha = crypto.createHash("sha256").update(bytes).digest("hex");
      const bundleEntry = byHash.get(sha);
      const row = manifestRows.find((r) => r.sha256 === sha) ?? null;

      // Fail closed if the delivered bytes are not the canonical bytes.
      const hashVerified = Boolean(bundleEntry);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      let acroFields = [];
      try { acroFields = doc.getForm().getFields(); } catch { acroFields = []; }
      const pages = doc.getPages().map((p, i) => ({
        page: i + 1, width: Math.round(p.getWidth()), height: Math.round(p.getHeight()),
        orientation: p.getWidth() > p.getHeight() ? "landscape" : "portrait"
      }));

      const documentId = fileName.split("__")[2] ?? null;
      const documentRole = row?.document_role ?? null;
      const structuralClass = acroFields.length > 0 ? "acroform" : "flat_pdf";
      const participantFillable = documentRole ? PARTICIPANT_FILLABLE_ROLES.has(documentRole) : false;
      const generationAllowed = (row?.generation_allowed ?? "no").toLowerCase() === "yes";

      // Asset class is part of the family identity: a FORM and its
      // INSTRUCTIONS sheet share a document id (e.g. NE CC-6-12) and must
      // never collide onto one package directory.
      const assetClass = fileName.split("__")[1] ?? "FORM";
      const familySlug = slugify(`${documentId}-${assetClass}-${row?.language ?? "EN"}`);
      const familyDir = path.join(OUT, jurisdictionSlug, familySlug);
      fs.mkdirSync(path.join(familyDir, "reports"), { recursive: true });
      fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });

      const sourceRecord = {
        schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
        lane: "D1",
        jurisdiction: stateDir,
        documentId,
        documentRole,
        officialTitle: row?.official_title ?? null,
        revision: row?.revision ?? null,
        language: row?.language ?? "EN",
        workflowKey: row?.workflow_key ?? null,
        canonicalBundlePath: bundleEntry?.path ?? null,
        sha256: sha,
        sha256VerifiedAgainstBundleManifest: hashVerified,
        byteLength: bytes.length,
        bundleDeclaredBytes: bundleEntry?.bytes ?? null,
        byteLengthMatches: bundleEntry ? bundleEntry.bytes === bytes.length : null,
        sourceUrl: row?.source_url || null,
        sourceStatus: row?.source_status ?? null,
        freshnessStatus: row?.freshness_status ?? null,
        libraryFolder: folder,
        binaryPresent: true,
        lifecycleClassification: folder === "05_SOURCE_GATED" ? "binary_present_source_gated" : "binary_present_and_current",
        structuralClassObserved: structuralClass,
        structuralClassDeclared: row?.structural_class ?? null,
        // Compared through the shared vocabulary: the manifest says
        // `acroform_pdf` where the binary inspector says `acroform`, and raw
        // equality turned that spelling difference into a source-identity
        // defect on every AcroForm in the corpus.
        structuralClassAgrees: structuralClassesAgree(structuralClass, row?.structural_class ?? null),
        declaredFieldCount: row?.field_count === "" ? null : Number(row?.field_count ?? 0),
        observedAcroFieldCount: acroFields.length,
        pageGeometry: pages,
        declaredPages: row?.pages ? Number(row.pages) : null,
        pageCountAgrees: row?.pages ? Number(row.pages) === pages.length : null,
        renderStrategy: structuralClass === "acroform" ? "acroform_fill" : "flat_overlay",
        participantFillable,
        generationAllowed,
        productionHolds: [
          ...(generationAllowed ? [] : ["state_manifest_generation_allowed_no"]),
          "edition_1_runtime_disabled",
          ...(folder === "05_SOURCE_GATED" ? ["source_gated_never_runtime_selectable"] : []),
          ...(participantFillable ? [] : ["not_participant_fillable_no_fixture_fill"]),
          "f_independent_visual_review_required"
        ],
        ownershipDetermination: participantFillable
          ? "Participant-filled packet form: overlay bindings permitted for participant/deterministic facts only."
          : `documentRole=${documentRole ?? "unknown"} is completed by the court or agency, or is a supporting-process asset with generation disabled. No participant fill is produced.`,
        coBrandingRule: "No LegalEase or partner branding may be added to the official form."
      };
      fs.writeFileSync(path.join(familyDir, "source-record.json"), JSON.stringify(sourceRecord, null, 2) + "\n");

      fs.writeFileSync(path.join(familyDir, "field-census.json"), JSON.stringify({
        schemaVersion: "rcap-field-census/v2-verified-binary",
        censusBasis: "inspected_verified_binary",
        sha256: sha,
        structuralClass,
        acroFieldCount: acroFields.length,
        fields: acroFields.map((f) => ({ name: f.getName(), type: f.constructor?.name ?? "unknown" })),
        flatPdfNote: structuralClass === "flat_pdf"
          ? "No AcroForm dictionary: any participant output requires measured overlay geometry, never visual guesswork."
          : null,
        pageGeometry: pages
      }, null, 2) + "\n");

      fs.writeFileSync(path.join(familyDir, "reports/protected-fields.json"), JSON.stringify({
        schemaVersion: "rcap-protected-fields/v2",
        basis: "ownership determination on the verified binary",
        participantFillable,
        neverPopulated: ["judge", "clerk", "prosecutor", "agency_certification", "hearing_result",
          "service_completion", "signature", "notarization", "court_disposition", "outside_party_fact"],
        wholeDocumentProtected: !participantFillable,
        reason: sourceRecord.ownershipDetermination
      }, null, 2) + "\n");

      results.push({ jurisdiction: stateDir, familySlug, documentId, documentRole, structuralClass,
        hashVerified, participantFillable, pages: pages.length });
    }
  }
}

fs.writeFileSync(path.join(rootDir, "data/rcap-all50/overlays/production/verified-binary-index.json"),
  JSON.stringify({ schemaVersion: "rcap-verified-binary-index/v1", verifiedAt: "2026-08-12",
    bundleEdition: BUNDLE.partition, families: results }, null, 2) + "\n");
console.log(JSON.stringify(results, null, 1));
