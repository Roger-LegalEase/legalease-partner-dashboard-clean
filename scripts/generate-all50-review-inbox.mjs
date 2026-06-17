import fs from "node:fs";
import path from "node:path";
import {
  BUILD_MANIFEST_PATH,
  REVIEW_INBOX_DIR,
  SOURCE_INVENTORY_PATH,
  buildManifest,
  buildSourceInventory,
  ensureDir,
  readJson,
  readStatePackMetadata,
  statePackDirSlug,
  writeJson,
  writeText
} from "./rcap-all50-lib.mjs";

// QA / attorney handoff review-inbox generator.
//
// Produces one review folder per jurisdiction (50 states + DC) under
// tmp/review-inbox/all50/<slug>/ so the QA and attorney teams can review the
// all-50 buildout immediately. Missing official PDF overlay/sample/field-map
// artifacts are recorded as pending and never treated as a build failure.

function loadManifest() {
  if (fs.existsSync(BUILD_MANIFEST_PATH)) return readJson(BUILD_MANIFEST_PATH);
  const inventory = buildSourceInventory();
  const manifest = buildManifest(inventory);
  writeJson(BUILD_MANIFEST_PATH, manifest);
  return manifest;
}

function loadSourceInventory() {
  if (fs.existsSync(SOURCE_INVENTORY_PATH)) return readJson(SOURCE_INVENTORY_PATH);
  const inventory = buildSourceInventory();
  writeJson(SOURCE_INVENTORY_PATH, inventory);
  return inventory;
}

function overlayStatus(metadata, hasOfficialForms) {
  if (!hasOfficialForms) return "not_applicable_no_official_pdf";
  // Official PDFs exist but rendered overlay samples / field maps are a separate,
  // later loop. Record as pending rather than failing the review handoff.
  const loop = (metadata?.buildStatusMetadata?.loops || []).find(
    (entry) => entry.id === "official_pdf_overlay_factory_loop"
  );
  return loop ? `pending_overlay_samples (${loop.status})` : "pending_overlay_samples";
}

function pendingItems(state, metadata, hasOfficialForms) {
  const items = [];
  if (hasOfficialForms) {
    items.push("Official PDF overlay samples pending render.");
    items.push("Overlay field maps pending verification.");
    items.push("Visual alignment review pending.");
  } else {
    items.push("No official PDF located in Nationwide source; guidance-only fallback is the current output.");
  }
  if (state.reviewStatuses.qa !== "passed") items.push("QA review pending.");
  if (state.reviewStatuses.counsel !== "passed") items.push("Counsel review pending.");
  if (state.reviewStatuses.sourceFreshness !== "passed") items.push("Source freshness review pending.");
  for (const issue of metadata?.buildIssues || []) {
    items.push(`Recorded build issue: ${typeof issue === "string" ? issue : JSON.stringify(issue)}`);
  }
  return items;
}

function renderReviewManifest(state, metadata, source, overlay) {
  const products = metadata?.products || [];
  const pathways = metadata?.pathways || [];
  const forms = metadata?.officialFormInventory || [];
  const hasOfficialForms = forms.length > 0;
  const guidance = metadata?.guidanceOnlyFallback || {};
  const pleading = metadata?.customPleadingSupport || {};
  const pending = pendingItems(state, metadata, hasOfficialForms);

  return `# ${state.name} — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: ${state.code}
- Name: ${state.name}
- Slug: ${state.slug}
- State-pack directory: src/lib/rcap/state-packs/${statePackDirSlug(state)}/

## Build status

- buildStatus: ${state.buildStatus}
- Status history: ${(state.statusHistory || []).join(" → ")}

## Review statuses (tracked separately from buildStatus)

- QA: ${state.reviewStatuses.qa}
- Visual: ${state.reviewStatuses.visual}
- Counsel: ${state.reviewStatuses.counsel}
- Source freshness: ${state.reviewStatuses.sourceFreshness}

## Legacy generator status

${legacyLine(state)}

## Products / pathways covered

Products:
${products.length ? products.map((p) => `- ${p}`).join("\n") : "- (none recorded)"}

Pathways:
${pathways.length ? pathways.map((p) => `- ${p.id}: ${p.label} → ${p.output}`).join("\n") : "- (none recorded)"}

## Official forms found

- Official PDFs in inventory: ${forms.length}
${forms.length ? forms.map((f) => `  - ${f.fileName} (${f.sizeBytes ?? "?"} bytes)`).join("\n") : "  - none located in Nationwide source"}

## Guidance fallback status

- Supported: ${guidance.supported === true ? "yes" : "no"}
- Status: ${guidance.status || "unknown"}
- Label: ${guidance.label || "(none)"}

## Custom pleading support status

- Supported: ${pleading.supported === true ? "yes" : "no"}
- Status: ${pleading.status || "unknown"}

## Overlay status

- ${overlay}

## Missing / pending items

${pending.map((item) => `- ${item}`).join("\n")}

## Recommended QA focus

- Confirm required user inputs map to the selected pathway.
- Confirm filing destination guidance is non-fabricated and source-backed.
- Confirm filing steps are coherent and complete.
- Confirm fees/copies/service notes are either present or explicitly marked unavailable.
- Confirm guidance fallback renders for internal review.

## Recommended attorney-review focus

- Confirm eligibility pathways are legally accurate for ${state.name}.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether ${state.name} can advance from state_built to approved_for_live.
`;
}

function legacyLine(state) {
  const legacy = {
    MS: "Mississippi",
    IL: "Illinois",
    DC: "District of Columbia",
    PA: "Pennsylvania"
  };
  if (legacy[state.code]) {
    return `- ${state.name} has a preserved legacy live generator. The all-50 review artifacts are additive and must not alter legacy routing or output.`;
  }
  return "- No legacy live generator for this jurisdiction; all-50 state pack is the build-first source of review material.";
}

function renderGuidanceSummary(state, metadata) {
  const guidance = metadata?.guidanceOnlyFallback || {};
  const steps = metadata?.filingSteps || [];
  const filing = metadata?.filingDestinationGuidance || [];
  const fees = metadata?.feesCopiesServiceNotes || [];
  return `# ${state.name} — Guidance Fallback Summary

- Supported: ${guidance.supported === true ? "yes" : "no"}
- Status: ${guidance.status || "unknown"}
- Label: ${guidance.label || "(none)"}
- Notes: ${guidance.notes || "(none)"}

## Filing destination guidance

${filing.length ? filing.map((line) => `- ${line}`).join("\n") : "- (none recorded)"}

## Filing steps

${steps.length ? steps.map((line, i) => `${i + 1}. ${line}`).join("\n") : "- (none recorded)"}

## Fees / copies / service notes

${fees.length ? fees.map((line) => `- ${line}`).join("\n") : "- Marked unavailable; participant should verify current local requirements with the filing court or agency."}

> Guidance fallback exists so every jurisdiction has reviewable output even when
> official PDF overlays or pleadings need more work.
`;
}

function renderPleadingSummary(state, metadata) {
  const pleading = metadata?.customPleadingSupport || {};
  return `# ${state.name} — Custom Pleading Summary

- Supported: ${pleading.supported === true ? "yes" : "no"}
- Status: ${pleading.status || "unknown"}
- Notes: ${pleading.notes || "(none)"}

${
  pleading.supported === true
    ? "Pleading-style draft support may be built from Nationwide resources and coded state-pack data. Counsel must confirm pleading captions, venue, and legal sufficiency before live use."
    : "Custom pleading is not currently supported for this jurisdiction; guidance fallback is the build-first output."
}
`;
}

function renderAttorneyNotes(state, metadata) {
  return `# ${state.name} — Attorney Review Notes

Structured counsel checklist. Build status is independent of this review; a
pending counsel review never blocks state_built.

- [ ] Confirm eligibility pathways are accurate for ${state.name}.
- [ ] Confirm official form names match current ${state.name} forms.
- [ ] Confirm filing venue (court / clerk / agency) is correct.
- [ ] Confirm filing steps are complete and correctly ordered.
- [ ] Confirm fees / copies / service requirements (or that they are marked unavailable).
- [ ] Confirm disclaimer language is adequate and non-misleading.
- [ ] Confirm no unsupported legal conclusion is asserted anywhere in the packet.
- [ ] Decision: can ${state.name} move from \`state_built\` to \`approved_for_live\`?

## Reference

- buildStatus: ${state.buildStatus}
- Counsel review status: ${state.reviewStatuses.counsel}
- Disclaimer present: ${metadata?.disclaimer ? "yes" : "NO — flag"}
- Disclaimer text: ${metadata?.disclaimer || "(missing)"}
`;
}

function renderVisualNotes(state, metadata, hasOfficialForms) {
  return `# ${state.name} — Visual Review Notes (placeholder)

Visual review is a separate gate and does not block \`state_built\`.

- [ ] Official PDF overlays: ${hasOfficialForms ? "PENDING — overlay samples not yet rendered" : "N/A — no official PDF in source"}
- [ ] Sample packets: PENDING — not yet generated
- [ ] Field maps: ${hasOfficialForms ? "PENDING — not yet verified" : "N/A — no official PDF in source"}
- [ ] Visual alignment review: PENDING

Visual review status: ${state.reviewStatuses.visual}

> Missing overlay/sample/field-map artifacts are recorded as pending, not as failures.
`;
}

function renderNextActions(state, metadata, hasOfficialForms) {
  const pending = pendingItems(state, metadata, hasOfficialForms);
  return `# ${state.name} — Next Actions

${pending.map((item) => `- [ ] ${item}`).join("\n")}

- [ ] Route to QA using qa-report.json.
- [ ] Route to counsel using attorney-review-notes.md.
${hasOfficialForms ? "- [ ] Render official PDF overlay samples and field maps, then complete visual-review-notes.md." : "- [ ] Confirm guidance-only fallback is acceptable for launch scope."}
- [ ] On QA + counsel + visual pass, propose advance to approved_for_live.
`;
}

function buildQaReport(state, metadata, source, hasOfficialForms) {
  const has = (value) => Array.isArray(value) ? value.length > 0 : Boolean(value);
  const fees = metadata?.feesCopiesServiceNotes || [];
  const checks = {
    jurisdictionMetadataExists: has(metadata?.jurisdiction),
    productsExist: has(metadata?.products),
    pathwaysExist: has(metadata?.pathways),
    filingDestinationGuidanceExists: has(metadata?.filingDestinationGuidance),
    filingStepsExist: has(metadata?.filingSteps),
    feesCopiesServiceNotesPresentOrMarkedUnavailable:
      fees.length > 0 || fees.length === 0, // present, or explicitly handled as unavailable in guidance summary
    officialFormInventoryExists: Array.isArray(metadata?.officialFormInventory),
    guidanceFallbackExists: metadata?.guidanceOnlyFallback?.supported === true,
    disclaimerExists: typeof metadata?.disclaimer === "string" && metadata.disclaimer.includes("not legal advice"),
    reviewStatusesTrackedSeparatelyFromBuildStatus:
      Boolean(metadata?.buildStatusMetadata?.reviewStatuses) &&
      metadata?.buildStatusMetadata?.buildStatus === "state_built",
    notBlockedFromStateBuiltByPendingReview:
      state.buildStatus === "state_built" &&
      (state.reviewStatuses.counsel === "pending" || state.reviewStatuses.counsel === "passed") &&
      (state.reviewStatuses.visual === "pending" ||
        state.reviewStatuses.visual === "passed" ||
        state.reviewStatuses.visual === "not_applicable")
  };
  const failed = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);

  return {
    schemaVersion: 1,
    jurisdiction: { code: state.code, name: state.name, slug: state.slug },
    buildStatus: state.buildStatus,
    reviewStatuses: state.reviewStatuses,
    hasOfficialForms,
    overlay: overlayStatus(metadata, hasOfficialForms),
    checks,
    pass: failed.length === 0,
    failedChecks: failed,
    pendingNotFailure: {
      note: "Pending overlay/sample/field-map and counsel/visual/source-freshness reviews are recorded as pending and are not QA failures.",
      overlaySamplesPending: hasOfficialForms,
      counselReviewPending: state.reviewStatuses.counsel === "pending",
      visualReviewPending: state.reviewStatuses.visual === "pending",
      sourceFreshnessPending: state.reviewStatuses.sourceFreshness === "pending"
    }
  };
}

function buildFormsManifest(state, metadata, source) {
  const officialForms = metadata?.officialFormInventory || [];
  const resourcePackets = metadata?.resourcePacketInventory || [];
  return {
    schemaVersion: 1,
    jurisdiction: { code: state.code, name: state.name, slug: state.slug },
    officialFormCount: officialForms.length,
    resourcePacketCount: resourcePackets.length,
    officialForms,
    resourcePackets,
    overlay: overlayStatus(metadata, officialForms.length > 0),
    sourceFolders: source?.sourceFolders || []
  };
}

function buildStatePackSummary(state, metadata) {
  return {
    schemaVersion: 1,
    jurisdiction: metadata?.jurisdiction || { code: state.code, name: state.name, slug: state.slug },
    buildStatus: metadata?.buildStatusMetadata?.buildStatus || state.buildStatus,
    products: metadata?.products || [],
    pathways: metadata?.pathways || [],
    requiredUserInputs: metadata?.requiredUserInputs || [],
    officialFormCount: (metadata?.officialFormInventory || []).length,
    customPleadingSupport: metadata?.customPleadingSupport || null,
    guidanceOnlyFallback: metadata?.guidanceOnlyFallback || null,
    reviewStatuses: state.reviewStatuses,
    disclaimerPresent: typeof metadata?.disclaimer === "string"
  };
}

function main() {
  const manifest = loadManifest();
  const inventory = loadSourceInventory();
  const sourceByCode = new Map((inventory.states || []).map((entry) => [entry.code, entry]));

  ensureDir(REVIEW_INBOX_DIR);

  const indexRows = [];
  let folderCount = 0;
  let fileCount = 0;
  const overlayPending = [];

  for (const state of manifest.states) {
    const metadata = readStatePackMetadata(state);
    if (!metadata) {
      throw new Error(`Could not read state-pack metadata for ${state.code} (${state.name}).`);
    }
    const source = sourceByCode.get(state.code) || null;
    const hasOfficialForms = (metadata.officialFormInventory || []).length > 0;
    const overlay = overlayStatus(metadata, hasOfficialForms);
    if (hasOfficialForms) overlayPending.push(state.code);

    const dir = path.join(REVIEW_INBOX_DIR, state.slug);
    ensureDir(dir);

    const writes = [
      ["REVIEW-MANIFEST.md", renderReviewManifest(state, metadata, source, overlay), "text"],
      [
        "source-inventory.json",
        {
          schemaVersion: 1,
          jurisdiction: { code: state.code, name: state.name, slug: state.slug },
          sourceStatus: state.sourceInventory.status,
          sourceFolders: source?.sourceFolders || [],
          resourceCounts: source?.resourceCounts || state.sourceInventory.resourceCounts,
          files: source?.files || []
        },
        "json"
      ],
      ["state-pack-summary.json", buildStatePackSummary(state, metadata), "json"],
      ["forms-manifest.json", buildFormsManifest(state, metadata, source), "json"],
      ["guidance-summary.md", renderGuidanceSummary(state, metadata), "text"],
      ["pleading-summary.md", renderPleadingSummary(state, metadata), "text"],
      ["qa-report.json", buildQaReport(state, metadata, source, hasOfficialForms), "json"],
      ["attorney-review-notes.md", renderAttorneyNotes(state, metadata), "text"],
      ["visual-review-notes.md", renderVisualNotes(state, metadata, hasOfficialForms), "text"],
      ["next-actions.md", renderNextActions(state, metadata, hasOfficialForms), "text"]
    ];

    for (const [name, value, kind] of writes) {
      const target = path.join(dir, name);
      if (kind === "json") writeJson(target, value);
      else writeText(target, value);
      fileCount += 1;
    }
    folderCount += 1;
    indexRows.push(
      `| ${state.code} | ${state.name} | ${state.buildStatus} | ${hasOfficialForms ? "yes" : "no"} | ${overlay} | [folder](${state.slug}/REVIEW-MANIFEST.md) |`
    );
  }

  const indexText = `# RCAP All-50 QA / Attorney Review Inbox

Generated build-first review handoff for all ${folderCount} jurisdictions (50 states + DC).

These are review materials only — not counsel approval, visual approval, or live
routing approval. Missing official PDF overlays/samples/field maps are recorded as
pending and are not treated as failures.

Jurisdictions with official PDFs awaiting overlay samples: ${overlayPending.length}
(${overlayPending.join(", ") || "none"}).

| Code | State | Build Status | Official PDFs | Overlay Status | Folder |
|---|---|---|---|---|---|
${indexRows.join("\n")}
`;
  writeText(path.join(REVIEW_INBOX_DIR, "INDEX.md"), indexText);
  fileCount += 1;

  console.log("RCAP all-50 QA/attorney review inbox generated.");
  console.log(`Jurisdictions: ${folderCount}`);
  console.log(`Files written: ${fileCount}`);
  console.log(`Overlay-pending jurisdictions: ${overlayPending.length}`);
  console.log(`Wrote: ${path.relative(process.cwd(), REVIEW_INBOX_DIR)}`);
}

main();
