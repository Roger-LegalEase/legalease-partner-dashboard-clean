// The root-cause catalogue for problematic-PDF findings.
//
// A register that reports "128 technical defects" invites two opposite errors.
// Read one way it says 128 things are broken and each needs its own fix; read
// the other it tempts someone to shrink the number by dropping assets. Both are
// wrong, because two different quantities are being confused: how many assets
// carry a finding, and how many distinct problems produce those findings.
//
// Every finding therefore names a root cause from this catalogue, and every
// root cause declares its SCOPE. The test is a single question:
//
//   would fixing one upstream thing clear this finding on every asset carrying
//   it?
//
// If yes the cause is `systemic` -- one problem, many impacted assets, one fix.
// Supplying the source bundle clears the absent-binary finding on all of them
// at once; re-running the current factory clears the unflattened-artifact
// finding on all of them at once. If no the cause is `family_specific`: this
// form's own geometry, edition or binary is what is wrong, and it needs its own
// work regardless of what happens to any other asset.
//
// Counting a systemic cause once per impacted asset would report one factory
// problem as 128 independent problems. Counting impacted assets once per root
// cause would report 62 unreviewable artifacts as a handful. The register
// reports both dimensions and neither substitutes for the other.

/**
 * @typedef {"technical" | "visual" | "source" | "governance"} Dimension
 * @typedef {"systemic" | "family_specific"} Scope
 */

export const ROOT_CAUSES = {
  // ---- technical, systemic -------------------------------------------------
  "RC-T-FACTORY-PROVENANCE": {
    dimension: "technical", scope: "systemic",
    title: "Final-artifact producer evidence missing",
    detail: "The artifact does not carry the producer string the current finalizer stamps, so it cannot say which factory built it and was not built by this one.",
    clearedBy: "Re-rendering the affected families through the current official-form factory.",
    owner: "Official-form factory owner"
  },
  "RC-T-OBJECT-STREAMS": {
    dimension: "technical", scope: "systemic",
    title: "Object-stream-aware active-content proof unavailable",
    detail: "The artifact is serialized with object streams, so the residue scan cannot see into the objects it judges and cannot return a clean verdict. Absence of a hit is not absence of active content here.",
    clearedBy: "Re-serializing the affected families without object streams, which the current finalizer already does.",
    owner: "Official-form factory owner"
  },
  "RC-T-UNFLATTENED-FIELDS": {
    dimension: "technical", scope: "systemic",
    title: "Live AcroForm fields remain in a final artifact",
    detail: "The artifact still exposes its form fields, so a value can depend on a viewer choosing to draw a widget appearance.",
    clearedBy: "Re-rendering through the current factory, which flattens before emitting.",
    owner: "Official-form factory owner"
  },
  "RC-T-VALUES-IN-APPEARANCES": {
    dimension: "technical", scope: "systemic",
    title: "Participant values confined to widget appearances",
    detail: "The participant values are present as field values and absent from page content, so nothing is drawn on the page a reviewer or a clerk would look at.",
    clearedBy: "Re-rendering through the current factory, which materializes values into page content before flattening.",
    owner: "Official-form factory owner"
  },
  "RC-T-SOURCE-DEFAULT-IN-PROTECTED-FIELD": {
    dimension: "technical", scope: "systemic",
    title: "A form's preprinted default survives in a protected field",
    detail: "A field the family's own policy marks unwritable holds a value the factory never bound: the form's own default, surviving because the artifact was never flattened. This is not a factory write.",
    clearedBy: "Flattening the affected artifacts, which drops the default with every other unflattened widget.",
    owner: "Official-form factory owner"
  },

  // ---- technical, family-specific ------------------------------------------
  "RC-T-NO-DERIVABLE-WRITE-BOX": {
    dimension: "technical", scope: "family_specific",
    title: "The document expresses no write box for a matched label",
    detail: "A participant label was found but the document does not express a rectangle for its value, so no coordinate is asserted. Re-running the factory reproduces the same refusal.",
    clearedBy: "A reviewed and recorded placement decision for this form.",
    owner: "Independent visual reviewer"
  },
  "RC-T-FLAT-GEOMETRY": {
    dimension: "technical", scope: "family_specific",
    title: "Flat PDF: every value is placed by measured geometry",
    detail: "The binary carries no widgets, so nothing can be bound or read back; placement is measured against the page rather than a field.",
    clearedBy: "Measured anchors approved for this form.",
    owner: "Official-form factory owner"
  },
  "RC-T-NO-FIELD-CENSUS": {
    dimension: "technical", scope: "family_specific",
    title: "No field census could be extracted",
    detail: "Overlay geometry cannot be measured or read back for this asset because no census exists.",
    clearedBy: "A census taken from this form's verified binary.",
    owner: "Official-form factory owner"
  },
  "RC-T-ALL-FIELDS-UNWRITABLE": {
    dimension: "technical", scope: "family_specific",
    title: "Every field on the form is manual or unwritable",
    detail: "The mapping leaves no participant-writable field, so the asset produces no filled component.",
    clearedBy: "A reviewed mapping decision for this form, or a decision that it is court-completed.",
    owner: "Independent technical reviewer"
  },
  "RC-T-VALUES-ABSENT": {
    dimension: "technical", scope: "family_specific",
    title: "The fixture carries no participant values at all",
    detail: "Neither page content nor field values carry any canonical fixture value: the fixture is the blank form.",
    clearedBy: "Bindings or anchors for this form, then a re-render.",
    owner: "Official-form factory owner"
  },
  "RC-T-ARTIFACT-UNPARSEABLE": {
    dimension: "technical", scope: "family_specific",
    title: "A committed artifact does not parse as a PDF",
    detail: "The bytes cannot be loaded, so nothing about the artifact can be verified.",
    clearedBy: "Re-rendering this family and replacing the artifact.",
    owner: "Official-form factory owner"
  },
  "RC-T-DIRTY-ACROFORM-SOURCE": {
    dimension: "technical", scope: "family_specific",
    title: "The source binary is a dirty AcroForm",
    detail: "The source carries active-content or residue that must be neutralised before any fill.",
    clearedBy: "Sanitation of this form through the current pipeline, proved on the output.",
    owner: "Official-form factory owner"
  },
  "RC-T-ACTIVE-CONTENT-IN-OUTPUT": {
    dimension: "technical", scope: "family_specific",
    title: "Active content or XFA observed in a committed artifact",
    detail: "The artifact carries residue the sanitation pass is required to remove.",
    clearedBy: "Re-rendering this family through the current factory, which refuses to emit such a file.",
    owner: "Official-form factory owner"
  },
  "RC-T-PROTECTED-FIELD-FACTORY-WRITE": {
    dimension: "technical", scope: "family_specific",
    title: "The factory wrote a participant value into a protected field",
    detail: "A field this family's policy marks unwritable holds a value the factory's own binding report names. This is a factory defect, not a preprinted default.",
    clearedBy: "Removing the binding for this form and re-rendering.",
    owner: "Official-form factory owner"
  },

  // ---- visual, systemic ----------------------------------------------------
  "RC-V-SHEET-FROM-UNFINALIZED-SOURCE": {
    dimension: "visual", scope: "systemic",
    title: "Contact sheet generated from an unfinalized or unflattened source",
    detail: "The sheet embeds page content, and an unflattened field's value lives in a widget appearance, so the filled panel carries none of the values it was built to show.",
    clearedBy: "Re-rendering the affected families and rebuilding their sheets from the finalized artifact.",
    owner: "Official-form factory owner"
  },
  "RC-V-SHEET-PANELS-IDENTICAL": {
    dimension: "visual", scope: "systemic",
    title: "Contact-sheet before/after panels are materially identical",
    detail: "Rendered and measured, the sheet's two panels show the same blank form, so it cannot support visual approval of a fill.",
    clearedBy: "Rebuilding the affected sheets from finalized artifacts; the current builder refuses to emit a sheet whose panels match.",
    owner: "Official-form factory owner"
  },
  "RC-V-SHEET-NO-VISIBILITY-PROOF": {
    dimension: "visual", scope: "systemic",
    title: "Contact sheet carries no visibility proof",
    detail: "The sheet predates the proof-backed builder, so nothing establishes that its filled panel ever showed the expected values.",
    clearedBy: "Rebuilding the affected sheets with the current builder, which writes the proof beside the sheet.",
    owner: "Official-form factory owner"
  },
  "RC-V-NO-SHEET-PRODUCED": {
    dimension: "visual", scope: "systemic",
    title: "No contact sheet was produced",
    detail: "The family carries no blank-versus-filled sheet, so there is no visual artifact to review at all.",
    clearedBy: "Rendering the affected families, which produces the sheet as part of the run.",
    owner: "Official-form factory owner"
  },
  "RC-V-NO-INDEPENDENT-VISUAL-APPROVAL": {
    dimension: "visual", scope: "systemic",
    title: "No independent visual approval exists",
    detail: "The family's visual-review job is open, so no independent reviewer has approved its rendered output.",
    clearedBy: "Completing independent visual review once reviewable artifacts exist.",
    owner: "Independent visual reviewer"
  },

  // ---- visual, family-specific ---------------------------------------------
  "RC-V-CLIPPING": {
    dimension: "visual", scope: "family_specific",
    title: "A value is clipped by its own widget rectangle",
    detail: "Measured against this form's widget geometry and font metrics, a fixture value does not fit the box it would be drawn into.",
    clearedBy: "Re-measuring and re-fitting this form's failing widgets until no clipping finding remains.",
    owner: "Official-form factory owner"
  },
  "RC-V-UNSAFE-PLACEMENT": {
    dimension: "visual", scope: "family_specific",
    title: "A measured placement finding other than clipping",
    detail: "This form's own overflow report records a placement the fixture cannot satisfy safely.",
    clearedBy: "Re-measuring this form's geometry and re-rendering the boundary fixture.",
    owner: "Official-form factory owner"
  },

  // ---- source --------------------------------------------------------------
  "RC-S-BUNDLE-ABSENT": {
    dimension: "source", scope: "systemic",
    title: "The verified source binary is not in this clone",
    detail: "The canonical source bundle is not present and outbound access to the issuing bodies is refused, so the bytes every downstream step reads are unavailable. This is one absence, not one per asset.",
    clearedBy: "Supplying the canonical source bundle, or opening access to the issuing bodies.",
    owner: "Roger (official source acquisition)"
  },
  "RC-S-STALE-OR-SUPERSEDED": {
    dimension: "source", scope: "family_specific",
    title: "The held edition is superseded, withdrawn or repealed",
    detail: "This form's own recorded freshness says the held bytes are not the currently published edition.",
    clearedBy: "Acquiring the current edition of this form and recording the supersession.",
    owner: "Roger (official source acquisition)"
  },
  "RC-S-CURRENTNESS-UNVERIFIED": {
    dimension: "source", scope: "systemic",
    title: "No independent currentness review exists",
    detail: "The held revision is a candidate current source that no independent review has confirmed against the issuing body. No such review has been performed for this lane at all.",
    clearedBy: "A currentness review pass against the issuing bodies' own publications.",
    owner: "Source-currentness reviewer"
  },
  "RC-S-IDENTITY-AMBIGUOUS": {
    dimension: "source", scope: "family_specific",
    title: "The source identity does not verify",
    detail: "This asset's hash, byte length, page count or structural class disagrees with the manifest that pinned it.",
    clearedBy: "Re-verifying this asset's bytes against the canonical manifest.",
    owner: "Roger (official source acquisition)"
  },

  // ---- governance ----------------------------------------------------------
  "RC-G-PRODUCTION-HOLD": {
    dimension: "governance", scope: "systemic",
    title: "A recorded production hold stands against the asset",
    detail: "The asset's source record carries a hold that withholds generation or runtime selection. These holds are lane-wide postures, not per-form findings.",
    clearedBy: "Lifting the holds deliberately, which is a release decision and not a build one.",
    owner: "Roger"
  },
  "RC-G-GENERATION-NOT-ALLOWED": {
    dimension: "governance", scope: "systemic",
    title: "Generation is not permitted from this asset",
    detail: "The committed source record fails closed: no generation is allowed from it in its current state.",
    clearedBy: "A recorded decision to permit generation, after the source and design questions are answered.",
    owner: "Roger"
  },
  "RC-G-NO-INDEPENDENT-TECHNICAL-APPROVAL": {
    dimension: "governance", scope: "systemic",
    title: "No independent technical approval exists",
    detail: "No independent technical review has approved any track this asset serves.",
    clearedBy: "Independent technical review once reviewable artifacts exist.",
    owner: "Independent technical reviewer"
  },
  "RC-G-TECHNICAL-CORRECTION-REQUIRED": {
    dimension: "governance", scope: "family_specific",
    title: "An independent technical review returned correction_required",
    detail: "A review of a track this asset serves asked for a correction that has not been closed.",
    clearedBy: "Making the recorded correction and obtaining a fresh review.",
    owner: "Independent technical reviewer"
  }
};

/** Throws if `id` is not in the catalogue. Keeps a typo from becoming a cause. */
export function rootCause(id) {
  const entry = ROOT_CAUSES[id];
  if (!entry) throw new Error(`unknown root cause id: ${id}`);
  return entry;
}

export const ROOT_CAUSE_IDS = Object.keys(ROOT_CAUSES);
