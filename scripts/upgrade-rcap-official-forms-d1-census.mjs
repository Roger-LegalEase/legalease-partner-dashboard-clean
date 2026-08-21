// Lane D1 census upgrade pass.
//
// The committed shadow-batch samples embed the source PDFs' real AcroForm
// dictionaries even though the field-map drafts are placeholders. This pass
// (technique proven by lane D2) extracts the full field census from each
// committed sample for the D1 jurisdictions, classifies every field
// conservatively, and promotes bindings for participant/deterministic
// fields only. Order-role components are never populatable at all.
//
// Families whose official PDF appears in the overlay-factory manifest but
// not in the compiled profile formInventory (KY, NC) are added with the
// manifest as the source of record; their sha256 is taken from
// packetGenerator.allSourceFiles when recorded there, else marked
// sha256_unrecorded_in_repo with the acquisition requirement stated.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { completenessCounters } from "./rcap-official-forms/rcap-classification-completeness.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");
const REGISTRY_PIN = "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5";
const JURISDICTIONS = {
  AL: { slug: "alabama", profile: "AL-alabama" },
  AR: { slug: "arkansas", profile: "AR-arkansas" },
  VA: { slug: "virginia", profile: "VA-virginia" },
  AK: { slug: "alaska", profile: "AK-alaska" },
  KY: { slug: "kentucky", profile: "KY-kentucky" },
  NC: { slug: "north-carolina", profile: "NC-north-carolina" },
  WI: { slug: "wisconsin", profile: "WI-wisconsin" },
  NE: { slug: "nebraska", profile: "NE-nebraska" },
  VT: { slug: "vermont", profile: "VT-vermont" }
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const slugify = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const manifest = readJson(path.join(rootDir, "data/rcap-all50/overlays/overlay-factory-manifest.json"));

function fieldType(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionlist";
  return "other";
}

function classify(name, type, role) {
  const n = name.toLowerCase();
  if (role === "court_order_component_never_participant_filed") return "court_or_agency";
  if (/notar/.test(n)) return "protected";
  if (/sign|signature/.test(n)) return "signature";
  if (/judge|clerk|magistrate|commissioner|bench|so ordered|court use/.test(n)) return "court_or_agency";
  if (/prosecut|district attorney|commonwealth attorney|state'?s attorney|da[_ ]/.test(n)) return "prosecutor_or_outside_party";
  if (/order|granted|denied|hearing|disposition of (this )?petition|ruling/.test(n)) return "court_or_agency";
  if (/served|service|certificate of service|mailed to/.test(n)) return "protected";
  if (/ssn|social security/.test(n)) return "manual_participant";
  if (/name|petitioner|applicant|defendant/.test(n) && !/judge|clerk|attorney/.test(n)) return "participant";
  if (/address|street|city|state|zip|phone|telephone|email/.test(n)) return "participant";
  if (/dob|birth/.test(n)) return "participant";
  if (/county|court name|division|district/.test(n)) return "participant";
  if (/case.?(no|num)|docket|citation.?(no|num)|tracking/.test(n)) return "participant";
  if (/charge|offense|statute|arrest date|offense date|date of (arrest|offense|charge)/.test(n)) return "participant";
  if (/date/.test(n) && /file|filing|today/.test(n)) return "deterministic";
  if (type === "checkbox" || type === "radio") return "manual_participant";
  return "manual_participant";
}

const POPULATABLE = new Set(["participant", "deterministic"]);
const FACT_BINDINGS = [
  [/county/, "county"],
  [/court name|division|district court/, "court"],
  [/case.?(no|num)|docket/, "case_identifier"],
  [/charge|offense(?! date)|statute/, "charge"],
  [/name|petitioner|applicant|defendant/, "packet_intake:full_legal_name"],
  [/address|street/, "packet_intake:mailing_address"],
  [/city/, "packet_intake:city"],
  [/zip/, "packet_intake:zip"],
  [/phone|telephone/, "packet_intake:phone"],
  [/email/, "packet_intake:email"],
  [/dob|birth/, "packet_intake:date_of_birth"],
  [/arrest date|date of arrest/, "packet_intake:arrest_date"],
  [/file|filing date/, "deterministic:filing_date"]
];
function bindingFor(name, cls) {
  if (!POPULATABLE.has(cls)) return null;
  const n = name.toLowerCase();
  for (const [pattern, target] of FACT_BINDINGS) if (pattern.test(n)) return target;
  return null;
}

const upgraded = [];
const added = [];
(async () => {
  for (const [st, { slug, profile: profileName }] of Object.entries(JURISDICTIONS)) {
    const profile = readJson(path.join(rootDir, `src/lib/rcap-engine/compiled/profiles/${profileName}.json`));
    const invByFile = new Map((profile.packetGenerator?.formInventory ?? []).map((f) => [f.fileName, f]));
    const allSource = new Map((profile.packetGenerator?.allSourceFiles ?? []).map((f) => [f.fileName, f]));

    for (const record of manifest.forms) {
      if (record.jurisdictionCode !== st) continue;
      if (!record.samplePath || !fs.existsSync(path.join(rootDir, record.samplePath))) continue;
      let doc, fields = [];
      try {
        doc = await PDFDocument.load(fs.readFileSync(path.join(rootDir, record.samplePath)), { ignoreEncryption: true });
        fields = doc.getForm().getFields();
      } catch { continue; }
      if (fields.length === 0) continue;

      const familySlug = slugify(record.fileName);
      const familyDir = path.join(OUT_ROOT, slug, familySlug);
      const isNew = !fs.existsSync(path.join(familyDir, "source-record.json"));
      fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
      fs.mkdirSync(path.join(familyDir, "reports"), { recursive: true });

      const inv = invByFile.get(record.fileName) ?? allSource.get(record.fileName) ?? null;
      const role = /order/i.test(record.fileName) ? "court_order_component_never_participant_filed"
        : /instruction|inst\b|filing-a|checklist/i.test(record.fileName) ? "instructions"
        : "principal_petition_or_request";

      // Page lookup for widget rects.
      const pages = doc.getPages();
      const pageIndexOfRef = new Map();
      pages.forEach((p, i) => pageIndexOfRef.set(p.ref.toString(), i + 1));

      const census = [];
      for (const f of fields) {
        const type = fieldType(f);
        const widgets = (f.acroField?.getWidgets?.() ?? []).map((w) => {
          const rect = w.getRectangle?.();
          const pref = w.P?.()?.toString?.();
          return {
            page: pref ? (pageIndexOfRef.get(pref) ?? null) : null,
            rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
          };
        });
        const entry = { name: f.getName(), type, widgets };
        if (type === "text") { try { entry.maxLength = f.getMaxLength() ?? null; } catch {} }
        if (type === "dropdown" || type === "optionlist" || type === "radio") { try { entry.options = f.getOptions(); } catch {} }
        census.push(entry);
      }
      const classification = census.map((c) => ({ name: c.name, class: classify(c.name, c.type, role) }));
      const map = { schemaVersion: "rcap-production-field-map/v1", family: familySlug, mapKind: "acroform", componentRole: role,
        censusBasis: "extracted_from_committed_shadow_sample", bindings: [], boundsChecks: { longText: "shrink_to_fit_then_addendum" } };
      for (const c of classification) {
        const target = bindingFor(c.name, c.class);
        if (target) map.bindings.push({ field: c.name, class: c.class, factId: target,
          maturity: target.startsWith("packet_intake:") ? "binding_vocabulary_pending_packet_intake_schema" : "profile_question_bound" });
      }
      if (role === "court_order_component_never_participant_filed") map.bindings = [];

      fs.writeFileSync(path.join(familyDir, "field-census.json"), JSON.stringify({
        schemaVersion: "rcap-field-census/v1", family: familySlug, jurisdiction: st,
        censusBasis: "extracted_from_committed_shadow_sample", samplePath: record.samplePath,
        fieldCount: census.length, fields: census }, null, 2) + "\n");
      // The census this pass just extracted IS the denominator: these families
      // are AcroForms, so a field is a field however many widgets draw it.
      fs.writeFileSync(path.join(familyDir, "field-classification.json"), JSON.stringify({
        schemaVersion: "rcap-field-classification/v1", family: familySlug,
        ...completenessCounters({
          familyKind: "acroform",
          census: { fieldCount: census.length, fields: census },
          entries: classification
        }),
        entries: classification }, null, 2) + "\n");
      fs.writeFileSync(path.join(familyDir, "production-field-map.json"), JSON.stringify(map, null, 2) + "\n");
      fs.writeFileSync(path.join(familyDir, "reports/populated-fields.json"), JSON.stringify(
        map.bindings.map((b) => ({ field: b.field, factId: b.factId })), null, 2) + "\n");
      fs.writeFileSync(path.join(familyDir, "reports/protected-fields.json"), JSON.stringify(
        classification.filter((c) => !POPULATABLE.has(c.class)).map((c) => ({ field: c.name, class: c.class })), null, 2) + "\n");

      // Update or create the source record with the new extraction status.
      const srPath = path.join(familyDir, "source-record.json");
      const base = isNew ? {
        schemaVersion: "rcap-official-form-source-record/v1", lane: "D1", jurisdiction: st,
        fileName: record.fileName, relativePath: record.relativePath,
        expectedSha256: inv?.sha256 ?? "sha256_unrecorded_in_repo", expectedSizeBytes: inv?.sizeBytes ?? null,
        kind: "pdf", isPdf: true, componentRole: role, classification: record.classification,
        pageCount: record.pageCount ?? pages.length,
        currentnessBasis: `registry pin ${REGISTRY_PIN} + overlay-factory manifest + state pack citation`,
        sourcePresenceInClone: false, failClosed: true,
        exactSourceRequirement: `Supply 'private/Nationwide Record Clearing/${record.relativePath}' ${inv?.sha256 ? `with sha256 ${inv.sha256}` : "(record the hash on supply)"}, then verify against this census before any fill or flatten.`,
        coBrandingRule: "No LegalEase or partner branding may be added to the official form itself."
      } : readJson(srPath);
      base.fieldExtractionStatus = "extracted_from_committed_shadow_sample";
      base.extractedFieldCount = census.length;
      fs.writeFileSync(srPath, JSON.stringify(base, null, 2) + "\n");

      if (isNew) {
        const crypto = require("crypto");
        const sampleSha = crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, record.samplePath))).digest("hex");
        fs.writeFileSync(path.join(familyDir, "field-classification-policy.json"), JSON.stringify({
          schemaVersion: "rcap-field-classification-policy/v1", appliesWhen: "now — census extracted from committed sample",
          populatableClasses: ["participant", "deterministic"], manualClasses: ["manual_participant"],
          neverPopulated: ["judge","clerk","prosecutor","agency_certification","hearing_result","service_completion","signature","notarization","court_disposition","outside_party_fact"],
          census: "see field-census.json", flattenPolicy: "flatten only when the route's adopted behavior requires it; preserve official appearance" }, null, 2) + "\n");
        for (const fx of ["canonical","boundary","negative"]) {
          fs.writeFileSync(path.join(familyDir, `fixtures/${fx}.json`), JSON.stringify({
            schemaVersion: "rcap-official-form-fact-fixture/v1", family: familySlug, jurisdiction: st,
            level: "participant_fact", label: fx,
            facts: fx === "negative" ? { expectEmptyClasses: ["court_or_agency","prosecutor_or_outside_party","signature","protected"] }
              : Object.fromEntries((profile.questions ?? []).slice(0, 10).map((q) => [q.id, fx])) }, null, 2) + "\n");
        }
        fs.writeFileSync(path.join(familyDir, "reports/prior-render-evidence.json"), JSON.stringify({
          schemaVersion: "rcap-prior-render-evidence/v1",
          committedShadowRender: { path: record.samplePath, sha256: sampleSha },
          contactSheetStatus: "blocked_pending_source_binary", thumbnails: "blocked_pending_source_binary" }, null, 2) + "\n");
        fs.writeFileSync(path.join(familyDir, "handoff.md"), [
          `# ${st} ${record.fileName} — production readiness handoff (lane D1, census-upgraded)`, "",
          `Component role: ${role}. Census: ${census.length} fields extracted from the committed shadow sample.`,
          `Source: \`${record.relativePath}\` (${base.expectedSha256}).`, "",
          "Render + contact sheet remain blocked pending the source binary at the recorded path;",
          "F owns visual approval. Only participant/deterministic fields are bound; order components bind nothing."
        ].join("\n") + "\n");
        added.push(`${st}/${familySlug} (${census.length} fields)`);
      } else {
        upgraded.push(`${st}/${familySlug} (${census.length} fields)`);
      }
    }

    // Recompute jurisdiction summary readiness.
    const summaryPath = path.join(OUT_ROOT, slug, "jurisdiction-summary.json");
    const summary = readJson(summaryPath);
    const familyDirs = fs.readdirSync(path.join(OUT_ROOT, slug), { withFileTypes: true }).filter((e) => e.isDirectory());
    summary.families = familyDirs.map((e) => {
      const sr = readJson(path.join(OUT_ROOT, slug, e.name, "source-record.json"));
      return { familySlug: e.name, fileName: sr.fileName, componentRole: sr.componentRole,
        status: sr.fieldExtractionStatus === "extracted_from_committed_shadow_sample"
          ? "readyExceptRender" : "blocked_pending_source_binary_and_field_extraction" };
    });
    const principalReady = summary.families.some((f) => f.componentRole === "principal_petition_or_request" && f.status === "readyExceptRender");
    summary.tracks = summary.tracks.map((t) => ({ ...t,
      readiness: principalReady ? "readyExceptRender" : t.readiness, terminal: false }));
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  }
  console.log("upgraded existing families:", upgraded.length);
  for (const u of upgraded) console.log("  ", u);
  console.log("added families:", added.length);
  for (const a of added) console.log("  ", a);
})();
