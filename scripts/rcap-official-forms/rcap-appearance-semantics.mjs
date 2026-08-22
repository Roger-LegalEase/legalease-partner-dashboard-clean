#!/usr/bin/env node
// What a form field's appearance MEANS, as distinct from where it is stored.
//
// Flattening stamps a widget's appearance onto the page as ordinary ink, so the
// finalizer has to decide what each field may contribute before it flattens.
// Field type and flags answer that for a pushbutton and for an unanswered
// chooser. They do not answer it for a text field, and on the Nebraska caption
// forms that is the whole problem: "(Enter the type of court)" and
// "COUNTY, NEBRASKA" are both unwritten /Tx widgets whose appearance draws text.
// One is a placeholder the court printed for a person filling the form in by
// hand; the other is the court's own caption. Nothing structural separates them
// — not the flag word, not RichText or Multiline, not whether the text lives in
// a widget XObject or in page content. Suppressing every unwritten /Tx
// appearance removes the caption with the placeholder, which is why that attempt
// was reverted rather than tuned.
//
// So the distinction is recorded as meaning, per field, in a registry the
// finalizer reads. The finalizer switches on the disposition and never on the
// family, the form, the field name or the text.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const APPEARANCE_SEMANTICS_PATH = "data/rcap-all50/shared/field-appearance-semantics.json";

/**
 * The three meanings a field's appearance can carry.
 *
 * PRESERVE_SOURCE_APPEARANCE is the default for anything unclassified: text the
 * court put on its own form is preserved unless something says otherwise, which
 * is the safe direction to be wrong in.
 */
export const APPEARANCE_DISPOSITION = Object.freeze({
  PRESERVE_SOURCE_APPEARANCE: "preserve_source_appearance",
  RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN: "render_participant_value_only_when_written",
  SUPPRESS_CONTROL_APPEARANCE: "suppress_control_appearance"
});

export const APPEARANCE_DISPOSITIONS = Object.freeze(Object.values(APPEARANCE_DISPOSITION));

export function isAppearanceDisposition(value) {
  return APPEARANCE_DISPOSITIONS.includes(value);
}

/**
 * The disposition a field carries when the registry says nothing about it.
 *
 * This is the generic rule, expressed once: a control is chrome, a chooser
 * nobody answered would draw the court's prompt, and everything else is the
 * court's own ink. It reads field structure only — no name, no text, no family.
 */
export function structuralDisposition({ isPushButton = false, isChoice = false } = {}) {
  if (isPushButton) return APPEARANCE_DISPOSITION.SUPPRESS_CONTROL_APPEARANCE;
  if (isChoice) return APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN;
  return APPEARANCE_DISPOSITION.PRESERVE_SOURCE_APPEARANCE;
}

/** The registry, or an empty one. Never throws on a missing file. */
export function loadAppearanceSemantics(file = path.join(rootDir, APPEARANCE_SEMANTICS_PATH)) {
  if (!fs.existsSync(file)) return { schemaVersion: null, families: {} };
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [familyId, family] of Object.entries(parsed.families ?? {})) {
    for (const [field, entry] of Object.entries(family.fields ?? {})) {
      if (!isAppearanceDisposition(entry.disposition)) {
        throw new Error(`${familyId}.${field} carries an unknown disposition ${JSON.stringify(entry.disposition)}`);
      }
    }
  }
  return parsed;
}

/**
 * One family's dispositions as a plain field-name map.
 *
 * The finalizer is handed this and nothing else — it never learns which family
 * it came from, so it cannot branch on one.
 */
export function dispositionsForFamily(registry, familyId) {
  const out = new Map();
  for (const [field, entry] of Object.entries(registry?.families?.[familyId]?.fields ?? {})) {
    out.set(field, entry.disposition);
  }
  return out;
}
