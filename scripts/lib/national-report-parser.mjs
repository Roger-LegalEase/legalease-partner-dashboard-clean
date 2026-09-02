// A heading-driven parser for the national legal decision report.
//
// The first version of this took the first fenced ```text block inside a
// section and called it that section's product disposition. Five of the
// thirteen sections that carry a disposition have an earlier fence, so five
// machine-readable dispositions were something else entirely:
//
//   Georgia          the process sequence diagram
//   Missouri         the proposed caption
//   North Dakota     the service workflow
//   South Carolina   the fee schedule
//   New York         the correction workflow
//
// Georgia's real disposition carries PRECONDITION: VERIFIED WRITTEN PROSECUTOR
// CONSENT, and New York's carries EFFECT: PARTIAL SEAL; COURT FILE PUBLIC. Both
// are the operative condition of their decision, and both were dropped. A
// position-in-section rule cannot express "the disposition"; only the heading
// can, so the heading is what this reads.

import crypto from "node:crypto";

export const sha256 = (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex");

/** Trim, collapse internal whitespace. Enough to survive reflow, not enough to hide an edit. */
export const normaliseText = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

/**
 * Every ATX heading in the document, with its level, title and 1-based line.
 * Headings inside fenced code blocks are not headings.
 */
export function headingIndex(lines) {
  const headings = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const m = line.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (m) headings.push({ level: m[1].length, title: m[2], line: i + 1 });
  });
  return headings;
}

/**
 * The section a heading opens: from its own line to the line before the next
 * heading at the same level or above. Line numbers are 1-based and inclusive,
 * and the heading line is part of the section so that renaming a heading
 * changes the section hash.
 */
export function sectionAt(lines, headings, headingPos) {
  const self = headings[headingPos];
  let end = lines.length;
  for (let i = headingPos + 1; i < headings.length; i += 1) {
    if (headings[i].level <= self.level) { end = headings[i].line - 1; break; }
  }
  const text = lines.slice(self.line - 1, end).join("\n").replace(/\s+$/, "");
  return {
    heading: self.title,
    level: self.level,
    lineStart: self.line,
    lineEnd: self.line + text.split("\n").length - 1,
    text,
    sha256: sha256(text)
  };
}

/** The level-3 subsections directly inside a level-2 section. */
export function subsections(lines, headings, headingPos) {
  const self = headings[headingPos];
  const out = [];
  for (let i = headingPos + 1; i < headings.length; i += 1) {
    if (headings[i].level <= self.level) break;
    if (headings[i].level === self.level + 1) out.push(sectionAt(lines, headings, i));
  }
  return out;
}

/**
 * A fenced ```text block parsed as KEY: VALUE pairs, preserving order. A line
 * with no colon is kept with a null value rather than dropped, so a block that
 * is not in key/value shape is visible as such instead of silently emptying.
 */
export function fencedKeyValues(text) {
  const fence = text.match(/```text\n([\s\S]*?)```/);
  if (!fence) return null;
  const entries = [];
  for (const raw of fence[1].split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    const at = line.indexOf(":");
    if (at === -1) { entries.push({ key: line, value: null }); continue; }
    entries.push({ key: line.slice(0, at).trim(), value: line.slice(at + 1).trim() });
  }
  return entries;
}

/**
 * Bold-label blocks inside a question section: **Holding:**, **Disposition:**,
 * **Product rule:** and the eight other one-off labels the report uses. Each
 * block runs to the next label or the end of the section, so a holding that
 * spans several paragraphs is captured whole.
 */
export function labelledBlocks(sectionText) {
  const lines = sectionText.split("\n");
  const marks = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\*\*([^*]+?):\*\*/);
    if (m) marks.push({ label: m[1].trim(), index: i });
  });
  return marks.map((mark, n) => {
    const end = n + 1 < marks.length ? marks[n + 1].index : lines.length;
    const body = lines.slice(mark.index, end).join("\n").replace(/\s+$/, "");
    return {
      label: mark.label,
      text: body,
      // The label itself removed, so the value reads as the answer alone.
      value: body.replace(/^\*\*[^*]+?:\*\*\s*/, "").trim(),
      sha256: sha256(body)
    };
  });
}

/**
 * Map a subsection heading onto the role it plays. Headings vary across the
 * report — Missouri writes "A. Filing mechanics" where Georgia writes "Filing
 * vehicle" — so the mapping is explicit and anything unmatched is retained
 * rather than discarded.
 */
const ROLE_PATTERNS = [
  ["decision", /^decision$/i],
  ["decision", /^current legal status$/i],
  ["decision", /^correct legal identity$/i],
  ["decision", /^legal mechanism$/i],
  ["decision", /^governing mechanism$/i],
  // Missouri splits its holding across lettered headings: "A. Filing mechanics"
  // is the filing vehicle, "B. Municipal ordinance coverage" is the scope
  // holding — "do not include municipal convictions merely because the
  // ordinance is similar". Without this the Missouri record carries no decision
  // at all while the decision sits one heading away.
  ["decision", /^[A-Z]\.\s*municipal ordinance coverage$/i],
  ["filingVehicle", /^filing vehicle$/i],
  ["filingVehicle", /^[A-Z]\.\s*filing mechanics$/i],
  ["filingVehicle", /^filing mechanism$/i],
  ["filingVehicle", /^destination and mechanism$/i],
  ["filingVehicle", /^destination$/i],
  ["filingVehicle", /^mechanism$/i],
  ["filingVehicle", /^receiving entity and output$/i],
  ["packetOrDeliverable", /^packet$/i],
  ["packetOrDeliverable", /^packet and service$/i],
  ["packetOrDeliverable", /^participant-facing output$/i],
  ["packetOrDeliverable", /^output correction$/i],
  ["serviceWorkflow", /^service workflow$/i],
  ["serviceWorkflow", /^correction workflow$/i],
  ["selfHelpBoundary", /^self-help boundary$/i],
  ["productDisposition", /^product disposition$/i]
];

export function roleOf(heading) {
  for (const [role, pattern] of ROLE_PATTERNS) {
    if (pattern.test(heading)) return role;
  }
  return null;
}
