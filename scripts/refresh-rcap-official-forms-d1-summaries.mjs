// Refreshes each D1 jurisdiction summary from the implementation index.
//
// The summaries were written when the canonical binaries were absent, so every
// track reads "blocked_pending_bundle_binaries_and_release_gates". The
// binaries have since landed and been hash-verified, so the binary half of
// that readiness string is stale. The release gates are not: a source-gated,
// currentness, counsel or state-legal-review hold survives the binary arriving,
// and nothing here promotes a track to terminal.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const SLUG = { WI: "wisconsin", AL: "alabama", AR: "arkansas", VA: "virginia", AK: "alaska",
  KY: "kentucky", NC: "north-carolina", NE: "nebraska", VT: "vermont" };

const impl = readJson(path.join(OUT, "implementation-index.json"));
const byJurisdiction = new Map();
for (const fam of impl.families) {
  if (!byJurisdiction.has(fam.jurisdiction)) byJurisdiction.set(fam.jurisdiction, []);
  byJurisdiction.get(fam.jurisdiction).push(fam);
}

const READINESS = {
  implemented_pending_independent_review: "implemented_pending_release_gates_and_independent_visual_review",
  overlay_implemented_pending_independent_review: "overlay_implemented_pending_release_gates_and_independent_visual_review",
  overlay_labels_measured_write_box_pending_review: "overlay_labels_measured_write_box_pending_independent_visual_review",
  overlay_no_participant_label_matched: "no_participant_fact_label_on_this_form_pending_review",
  overlay_no_extractable_text_layer: "no_extractable_text_layer_pending_review",
  acroform_mapped_all_fields_manual_or_unwritable: "mapped_no_auto_fill_every_field_manual_or_unwritable",
  no_fill_instructional_document: "instructional_document_no_participant_fill",
  no_fill_outside_party_document: "outside_party_document_no_participant_fill"
};

let touched = 0;
for (const [jurisdiction, families] of byJurisdiction) {
  const summaryPath = path.join(OUT, SLUG[jurisdiction], "jurisdiction-summary.json");
  if (!fs.existsSync(summaryPath)) continue;
  const summary = readJson(summaryPath);

  // A track's readiness follows the families that actually back it.
  const statuses = families.map((f) => f.status);
  const anyImplemented = statuses.some((s) => s.endsWith("pending_independent_review"));
  for (const track of summary.tracks ?? []) {
    const matched = families.filter((f) =>
      (track.officialFormRefs ?? []).some((ref) =>
        f.family.startsWith(String(ref).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""))));
    const relevant = matched.length > 0 ? matched : families;
    const best = relevant.find((f) => f.status.endsWith("pending_independent_review")) ?? relevant[0];
    track.readiness = READINESS[best?.status] ?? track.readiness;
    track.terminal = false;
    track.sourceBinariesPresent = true;
  }

  summary.implementation = {
    generatedFrom: "scripts/implement-rcap-official-forms-d1.mjs",
    families: families.length,
    implemented: statuses.filter((s) => s.endsWith("pending_independent_review")).length,
    noFillByOwnership: statuses.filter((s) => s.startsWith("no_fill_")).length,
    boundFields: families.reduce((a, f) => a + (f.bound ?? 0), 0),
    contactSheets: families.filter((f) => f.contactSheet).length,
    holdsPreserved: "Source-gated, currentness, counsel and state-legal-review holds are unchanged by the binaries arriving. No track is promoted to terminal here.",
    independentVisualReview: "Owned by F. This lane does not self-approve."
  };
  summary.jobOutcome = anyImplemented
    ? "official_forms_implemented_pending_release_gates_and_independent_visual_review"
    : summary.jobOutcome;
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  touched++;
}
console.log(`refreshed ${touched} jurisdiction summaries`);
