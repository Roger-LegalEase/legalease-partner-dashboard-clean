// Lane D1 official-form production-readiness package builder.
//
// The official source binaries live in `private/Nationwide Record Clearing/`,
// which is not part of this repository clone, and 288 of the 300 committed
// field-map drafts (including every draft for the D1 jurisdictions) are
// build-first placeholders with zero extracted fields. Under the lane's
// source-integrity rule both gaps fail closed: no filled PDF, no contact
// sheet, and no field census is fabricated here.
//
// What this builder CAN produce honestly, per official-form family, from
// committed evidence alone:
//   - an exact, machine-checkable source record (path + sha256 + size pinned
//     from the compiled profile's packetGenerator.formInventory, which was
//     generated against the real binaries);
//   - the fixed field-classification policy the census must be filed under
//     when the binary arrives;
//   - participant-fact-level fixtures (canonical / boundary / negative)
//     bound to the jurisdiction's real compiled-profile question ids;
//   - prior-render evidence: sha256 of committed shadow-batch renders of the
//     same form where they exist;
//   - a handoff naming the exact two-step unblock (binary at recorded
//     path+sha, then field extraction against it).
//
// Consumed by scripts/verify-rcap-official-forms-d1.mjs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_PIN = "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5";
const OUT_ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");

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

const PROTECTED_CATEGORIES = [
  "judge", "clerk", "prosecutor", "agency_certification", "hearing_result",
  "service_completion", "signature", "notarization", "court_disposition",
  "outside_party_fact"
];

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const slugify = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const ledger = readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"));
const registry = readJson(path.join(rootDir, "data/rcap-ledger/registry-crosswalk-projection.json"));
const manifest = readJson(path.join(rootDir, "data/rcap-all50/overlays/overlay-factory-manifest.json"));

const registryTracks = Array.isArray(registry) ? registry : registry.tracks ?? registry.entries ?? [];
const trackById = new Map();
for (const t of registryTracks) trackById.set(t.trackId, t);

const manifestByJurisdictionFile = new Map();
for (const f of manifest.forms) manifestByJurisdictionFile.set(`${f.jurisdictionCode}:${f.fileName}`, f);

const laneJobs = ledger.jobs.filter((j) => j.lane === "D" && JURISDICTIONS[j.jurisdiction]);

function componentRole(fileName) {
  const n = fileName.toLowerCase();
  if (/instruction|inst\b|filing-a|checklist|how-to/.test(n)) return "instructions";
  if (/order/.test(n)) return "court_order_component_never_participant_filed";
  if (/waiver|fee/.test(n)) return "fee_waiver";
  return "principal_petition_or_request";
}

function draftPathFor(jur, formSlugFromManifest) {
  const p = path.join(rootDir, "docs/record-clearing/field-map-drafts/all50", `${jur}-${formSlugFromManifest}.field-map-draft.json`);
  return fs.existsSync(p) ? p : null;
}

const summaryLines = [];
for (const job of laneJobs) {
  const st = job.jurisdiction;
  const { slug, profile: profileName } = JURISDICTIONS[st];
  const profile = readJson(path.join(rootDir, `src/lib/rcap-engine/compiled/profiles/${profileName}.json`));
  const inventory = profile.packetGenerator?.formInventory ?? [];
  const questionIds = (profile.questions ?? []).map((q) => q.id);
  const jurisdictionDir = path.join(OUT_ROOT, slug);
  fs.mkdirSync(jurisdictionDir, { recursive: true });

  const families = [];
  for (const inv of inventory) {
    const isPdf = inv.fileName.toLowerCase().endsWith(".pdf");
    const familySlug = slugify(inv.fileName);
    const manifestRecord = manifestByJurisdictionFile.get(`${st}:${inv.fileName}`) ?? null;
    const draftFile = manifestRecord ? draftPathFor(slug, manifestRecord.formSlug.replace(/^legalease-[a-z-]+?-/, "")) : null;
    let draft = null;
    if (manifestRecord?.fieldMapPath && fs.existsSync(path.join(rootDir, manifestRecord.fieldMapPath))) {
      draft = readJson(path.join(rootDir, manifestRecord.fieldMapPath));
    } else if (draftFile) {
      draft = readJson(draftFile);
    }
    const extractedFields = draft?.acroFields?.length ?? 0;

    const familyDir = path.join(jurisdictionDir, familySlug);
    fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
    fs.mkdirSync(path.join(familyDir, "reports"), { recursive: true });

    const sourceRecord = {
      schemaVersion: "rcap-official-form-source-record/v1",
      lane: "D1",
      jurisdiction: st,
      fileName: inv.fileName,
      relativePath: inv.relativePath,
      expectedSha256: inv.sha256 ?? "sha256_unrecorded_in_repo",
      expectedSizeBytes: inv.sizeBytes ?? null,
      kind: inv.kind ?? null,
      isPdf,
      componentRole: componentRole(inv.fileName),
      classification: manifestRecord?.classification ?? "not_in_overlay_factory_manifest",
      pageCount: manifestRecord?.pageCount ?? null,
      currentnessBasis: `registry pin ${REGISTRY_PIN} + compiled profile ${profileName} formInventory + state pack citation`,
      sourcePresenceInClone: false,
      fieldExtractionStatus: extractedFields > 0 ? "extracted_fields_committed" : "field_census_unavailable_in_repo",
      extractedFieldCount: extractedFields,
      failClosed: true,
      exactSourceRequirement: `Supply 'private/Nationwide Record Clearing/${inv.relativePath}' with sha256 ${inv.sha256 ?? "(record the hash on supply)"}${isPdf ? ", then run field extraction against the verified binary before any fill or flatten" : ""}.`,
      coBrandingRule: "No LegalEase or partner branding may be added to the official form itself."
    };
    fs.writeFileSync(path.join(familyDir, "source-record.json"), JSON.stringify(sourceRecord, null, 2) + "\n");

    fs.writeFileSync(path.join(familyDir, "field-classification-policy.json"), JSON.stringify({
      schemaVersion: "rcap-field-classification-policy/v1",
      appliesWhen: "a verified field census exists for the source binary above",
      populatableClasses: ["participant", "deterministic"],
      manualClasses: ["manual_participant"],
      neverPopulated: PROTECTED_CATEGORIES,
      census: extractedFields > 0 ? "see field-census.json" : "blocked_pending_source_binary_and_field_extraction",
      flattenPolicy: "flatten only when the route's adopted behavior requires it; preserve official appearance"
    }, null, 2) + "\n");

    const factFixture = (label, facts) => ({
      schemaVersion: "rcap-official-form-fact-fixture/v1",
      family: familySlug,
      jurisdiction: st,
      level: "participant_fact",
      note: "Field-level expected values attach when the verified census exists; fact ids are the compiled profile's real question ids.",
      label,
      facts
    });
    const sample = Object.fromEntries(questionIds.slice(0, 12).map((q) => [q, "canonical"]));
    fs.writeFileSync(path.join(familyDir, "fixtures/canonical.json"), JSON.stringify(factFixture("canonical participant", sample), null, 2) + "\n");
    fs.writeFileSync(path.join(familyDir, "fixtures/boundary.json"), JSON.stringify(factFixture("boundary lengths", {
      ...sample,
      boundary_full_name: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
      boundary_address: "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B, Unincorporated Township of Long Hollow Crossing, ZZ 99999-9999",
      boundary_case_number: "01-CC-2026-900123.00-AB-CDE-FGH/2201",
      boundary_multiline_explanation: "Line one of a long participant explanation.\nLine two continues the explanation with additional detail.\nLine three concludes it."
    }), null, 2) + "\n");
    fs.writeFileSync(path.join(familyDir, "fixtures/negative.json"), JSON.stringify(factFixture("protected fields must remain empty", {
      expectEmptyClasses: PROTECTED_CATEGORIES
    }), null, 2) + "\n");

    const priorSample = manifestRecord?.samplePath && fs.existsSync(path.join(rootDir, manifestRecord.samplePath))
      ? { path: manifestRecord.samplePath, sha256: sha256File(path.join(rootDir, manifestRecord.samplePath)) }
      : null;
    fs.writeFileSync(path.join(familyDir, "reports/prior-render-evidence.json"), JSON.stringify({
      schemaVersion: "rcap-prior-render-evidence/v1",
      committedShadowRender: priorSample,
      contactSheetStatus: "blocked_pending_source_binary",
      thumbnails: "blocked_pending_source_binary"
    }, null, 2) + "\n");

    fs.writeFileSync(path.join(familyDir, "handoff.md"), [
      `# ${st} ${inv.fileName} — production readiness handoff (lane D1)`,
      "",
      `Component role: ${sourceRecord.componentRole}. Classification: ${sourceRecord.classification}.`,
      `Source pinned: \`${inv.relativePath}\` sha256 \`${inv.sha256 ?? "unrecorded"}\` (${inv.sizeBytes ?? "?"} bytes).`,
      "",
      "Status: FAIL-CLOSED. The source binary is not in this clone and the",
      "committed field-map draft carries no extracted fields, so no census,",
      "no filled PDF, no flatten, and no contact sheet were produced.",
      "",
      "Exact unblock, in order:",
      `1. ${sourceRecord.exactSourceRequirement}`,
      "2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.",
      "3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).",
      "",
      priorSample ? `Prior committed shadow render: \`${priorSample.path}\` (sha256 \`${priorSample.sha256.slice(0, 16)}…\`).` : "No committed shadow render exists for this form.",
      "",
      "Populate policy on census arrival: participant + deterministic fields only;",
      "judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court",
      "disposition/outside-party fields are never populated. No co-branding on the official form."
    ].join("\n") + "\n");

    families.push({
      familySlug,
      fileName: inv.fileName,
      componentRole: sourceRecord.componentRole,
      status: "blocked_pending_source_binary_and_field_extraction"
    });
  }

  const jobTracks = job.trackIds.map((tid) => {
    const reg = trackById.get(tid) ?? null;
    return {
      trackId: tid,
      officialFormRefs: reg?.officialFormRefs ?? [],
      readiness: "blocked_pending_source_binary_and_field_extraction",
      terminal: false
    };
  });
  fs.writeFileSync(path.join(jurisdictionDir, "jurisdiction-summary.json"), JSON.stringify({
    schemaVersion: "rcap-official-forms-jurisdiction-summary/v1",
    lane: "D1",
    jobId: job.jobId,
    jurisdiction: st,
    families,
    tracks: jobTracks,
    jobOutcome: "fail_closed_with_exact_source_requirements",
    generatedFrom: "committed evidence only; no source binary present in clone"
  }, null, 2) + "\n");

  summaryLines.push(`${st}: ${families.length} families, ${jobTracks.length} tracks — fail-closed packages written`);
}

console.log(summaryLines.join("\n"));
