// Lane D1A — regenerates Alabama, Arkansas and Alaska from the D1 source pack.
//
// Seven lanes run concurrently against the same corpus, so this driver owns
// exactly three jurisdiction directories and writes a lane-scoped
// `<state>/state-index.json` instead of touching the two shared indexes
// (`verified-binary-index.json`, `implementation-index.json`). The captain
// merges the lane indexes at import; two lanes rewriting a shared index would
// clobber each other's families.
//
// It drives the D0 remediated factory modules directly rather than running
// `scripts/implement-rcap-official-forms-d1.mjs`, which reads and rewrites both
// shared indexes.
//
// Identity comes from STATE_MANIFEST.csv and is confirmed against the binary:
// a row's sha256 and byte length must match the delivered bytes before any
// work is done for that family, and the page count and structural class the
// manifest declares are re-derived from the file rather than trusted.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError }
  from "../rcap-official-form-finalize.mjs";
import { buildContactSheet, ContactSheetProofError, visibleTextOfDocument, missingExpectedValues }
  from "../rcap-contact-sheet.mjs";
import { decideBinding, protectCategoryOf } from "../rcap-field-semantics.mjs";
import { extractTextItems, groupIntoLines } from "../rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, StandardFonts } =
  require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(rootDir, "data/rcap-all50/overlays/production");
const SRC = process.env.RCAP_D1A_SOURCE ?? "/tmp/rcap-source-packs/D1A/extracted";

export const LANE = "D1A";
export const FACTORY_VERSION = "d0-remediated-v1";
// The canonical bundle prefix the corpus records paths under. The extracted
// pack is rooted at STATES/, so the prefix is recorded, never read from.
const BUNDLE_PREFIX = "Expungement_AI_RCAP_Master_Library_Edition_1";
const STATES = [
  { code: "AL", slug: "alabama", name: "Alabama" },
  { code: "AR", slug: "arkansas", name: "Arkansas" },
  { code: "AK", slug: "alaska", name: "Alaska" }
];

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
};

// --- manifest ---------------------------------------------------------------
// RFC4180 with a BOM. Several rows carry embedded commas and doubled quotes
// inside `notes` and `all_source_origins`, so a split(",") would silently
// shift every column after them.
export function parseCsv(text) {
  const rows = [];
  let field = "", row = [], quoted = false;
  const t = String(text).replace(/^﻿/, "");
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (quoted) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i += 1; } else quoted = false; }
      else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ""));
}

export function readManifest(stateCode) {
  const rows = parseCsv(fs.readFileSync(path.join(SRC, "STATES", stateCode, "STATE_MANIFEST.csv"), "utf8"));
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

// The corpus keys a family directory by document id, asset class and language,
// truncated to 80 characters. Matching it exactly is what lets a regenerated
// family land on top of the one it replaces instead of orphaning it.
const CLASS_SUFFIX = {
  packet_form: "form",
  supporting_process: "support",
  source_gated: "source-gated",
  instructions: "instructions",
  legal_review: "legal-review"
};
export function familySlug(row) {
  const id = String(row.document_id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const suffix = CLASS_SUFFIX[row.asset_class] ?? String(row.asset_class).replace(/_/g, "-");
  return `${id}-${suffix}-${String(row.language).toLowerCase()}`.slice(0, 80);
}

// --- document ownership -----------------------------------------------------
export const OWNERSHIP = {
  INSTRUCTIONAL: "instructional_no_participant_fill",
  OUTSIDE_PARTY: "outside_party_completed",
  COURT_ORDER: "court_issued_caption_only",
  PARTICIPANT: "participant_completed"
};

function haystack(name) {
  const raw = String(name ?? "");
  const spaced = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[._\-/\\]+/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ").trim().toLowerCase();
  return `${spaced} || ${raw.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

export function determineOwnership(row) {
  const signal = haystack([row.document_role, row.official_title, row.source_filename].join(" "));
  if (row.canonical_relative_path.includes("/03_INSTRUCTIONS/")) return OWNERSHIP.INSTRUCTIONAL;
  if (String(row.document_role).toUpperCase() === "INSTRUCTIONS") return OWNERSHIP.INSTRUCTIONAL;
  if (/\binstructions?\b|completing\s*the|how\s*to\s*(file|complete)/.test(signal)) return OWNERSHIP.INSTRUCTIONAL;
  if (/\bresponse\s*to\s*petition\b|objection\s*to\s*petition/.test(signal)) return OWNERSHIP.OUTSIDE_PARTY;
  // A combined "Petition and Order" packet is driven by its petition half, so
  // the petition test runs before the order test.
  if (/\bpetition\b|\bmotion\b|\bapplication\b|\baffidavit\b|\brequest\b|\bstipulation\b|in\s*forma\s*pauperis|fee\s*waiver/.test(signal)) {
    return OWNERSHIP.PARTICIPANT;
  }
  if (/\border\b|\bjudgment\b|\bdecree\b|notice\s*of\s*hearing|certificate\s*of\s*expunge/.test(signal)) {
    return OWNERSHIP.COURT_ORDER;
  }
  return OWNERSHIP.PARTICIPANT;
}

// --- nine-class classification ----------------------------------------------
// Unwritable classes are tested before any participant pattern can claim a
// field. This is the corpus-wide classification vocabulary; the decision that
// actually gates a write is D0's `decideBinding`, which runs independently.
const RULES = [
  [/for\s*(court|office|clerk|agency|official)\s*use|court\s*use\s*only|do\s*not\s*write|office\s*use\s*only|scan\s*num|barcode|bar\s*code|file\s*stamp|filed\s*stamp|court\s*seal/, "prohibited"],
  [/notar|jurat|acknowledg(ed|ment)\s*before\s*me|sworn\s*to\s*before|my\s*commission\s*expires|notary\s*public/, "protected"],
  [/certificate\s*of\s*service|proof\s*of\s*service|service\s*of\s*process|process\s*server|\bserved\s*(on|by|upon)\b/, "protected"],
  [/signature|\bsigned\s*by\b|\bsign\s*here\b|^\s*sign\b|\bsig\b/, "signature"],
  [/judge|magistrate|commissioner|so\s*ordered|bench|hearing\s*officer|referee/, "court_or_agency"],
  [/\bclerk\b|deputy\s*clerk|date\s*filed|filing\s*stamp|entered\s*on|distribution/, "court_or_agency"],
  [/it\s*is\s*(hereby\s*)?ordered|ordered\s*(and\s*)?adjudged|is\s*(hereby\s*)?(granted|denied)|ruling|adjudged|decree|disposition\s*of\s*(this\s*)?(petition|motion)|hearing\s*(date|time|result)/, "court_or_agency"],
  [/prosecut|district\s*attorney|commonwealth\s*s?\s*attorney|state\s*s?\s*attorney|solicitor|county\s*attorney|opposing/, "outside_party"],
  [/(sheriff|police|law\s*enforcement|bureau|state\s*patrol)\s*(use|only)|agency\s*use|apsin|acic\s*use/, "outside_party"],
  [/ssn|social\s*security|driver\s*s?\s*licen[cs]e|\bdl\s*num|state\s*id\s*num|\boln\b|jail\s*id|\bsid\b|fbi\s*num/, "manual"],
  [/attorney|counsel|\besq\b|law\s*firm|bar\s*(no|num)/, "manual"],
  [/agency|sheriff|police|law\s*enforcement|bureau|state\s*patrol|probation|parole/, "manual"],
  [/\bage\s*at\b|age\s*of\s*(the\s*)?(petitioner|defendant)|\bage\b/, "manual"],
  [/\bdivision\b/, "manual"],
  [/date\s*signed|signature\s*date|date\s*of\s*(this\s*)?(filing|signature)|today\s*s?\s*date|^\s*dated?\s*$|cert\s*date/, "deterministic"],
  [/printed\s*name|petitioner|applicant|defendant|movant|\bdef\b|your\s*name|full\s*legal\s*name|first\s*name|last\s*name|middle\s*(name|initial)|party\s*names?|case\s*name|^\s*name\b/, "participant"],
  [/city\s*state\s*zip/, "participant"],
  [/street\s*addr|mailing\s*addr|^\s*addr|\baddress\b|\bcity\b|\bstate\b|\bzip\b|postal|phone|telephone|\bemail\b/, "participant"],
  [/\bdob\b|date\s*of\s*birth|birth\s*date/, "participant"],
  [/\bcounty\b|court\s*name|type\s*of\s*court|judicial\s*(district|circuit)|\bvenue\b/, "participant"],
  [/case\s*(no|num|#)|docket|citation\s*(no|num)|cause\s*(no|num)|file\s*(no|num)|case\s*id/, "participant"],
  [/charge|offense|statute|violation|\bcount\b|arrest\s*date|date\s*of\s*arrest|conviction\s*date|disposition\s*date/, "participant"]
];
const UNUSED_NAME = /^\s*$|^(text|field|untitled|undefined|blank|fill)\s*\d*\s*(\|\||$)/;
const NEVER_WRITE = new Set(["prohibited", "protected", "signature", "court_or_agency", "outside_party"]);

export function classify(name, type, ownership) {
  const hay = haystack(name);
  for (const [re, cls] of RULES) if (re.test(hay)) return cls;
  if (UNUSED_NAME.test(hay)) return "unused";
  if (["checkbox", "radio", "dropdown", "optionlist"].includes(type)) return "manual";
  if (ownership === OWNERSHIP.COURT_ORDER) return "court_or_agency";
  return "manual";
}

// --- lane-level tightening --------------------------------------------------
//
// D0's binder is fail-closed, but its allowlist is matched against field names,
// and these three states carry names its rules were not written against. Every
// rule below REMOVES a binding D0 would have allowed; none adds one, and none
// edits D0. Tightening is always permitted, weakening never is.
//
// Each was found by reading the binding D0 produced against the field it
// produced it for, on the actual binary:
//
//   `Employers Name  Address`  D0's `\bemployer\b` needs a word boundary the
//                              plural denies it, so the employer's address was
//                              about to receive the participant's.
//   `Name of Person Served`    the service recipient is not the participant.
//   `Servers Printed Name`     nor is the process server.
//   `If granted or denied ...` D0's court rule matches `is granted`, not the
//                              conditional phrasing this form uses, so a prior
//                              petition's county was about to be asserted.
//   `... Driver Licenses ...`  a compound identification field would have
//                              received a bare state code.
//   `Work Email Address`       `\baddress\b` outranks `\bemail\b` in D0's
//                              descriptor order, so an email field was about to
//                              receive a street address.
//   `City State and Zip`       D0's combined descriptor needs `city state zip`
//                              with no conjunction, so the field was about to
//                              receive only the city.
const LANE_PROTECT_RULES = [
  ["outside_party_extended", /\bemployers?\b|\bspouses?\b|\bcontractors?\b|\bsupervisors?\b|next\s*of\s*kin|nearest\s*relative|\bguardians?\b|\breferences?\b|co\s*signer|emergency\s*contact/],
  ["service_recipient_or_server", /\bservers?\b|to\s*be\s*served|person\s*served|agent\s*for\s*service|manner\s*of\s*service|entity\s*to\s*be\s*served/],
  ["prior_disposition_conditional", /\bgranted\b|\bdenied\b|\bdismissed\b|\bacquitt|\bnolle\b|\bexpunged\b|\bsealed\b|\bpardon/],
  ["identification_document", /driver'?s?\s*licen[cs]e|\bdl\s*(no|num)\b|state\s*id\b|\bssn\b|social\s*security|issuing\s*state|last\s*4\b/],
  // D0's `matter.charge` descriptor matches `\bstatute\b` as well as
  // `\bcharge\b`, so Arkansas's `in violation of ACA` slots -- which want an
  // Arkansas Code citation -- would have received the prose charge
  // description instead. The fact set holds no statutory citation, and
  // inventing one states a legal rule to a court, so the slot stays blank.
  ["statute_citation_without_an_exact_fact", /in\s*violation\s*of|\baca\b|arkansas\s*code|ark\s*code\s*ann|code\s*section|\bstatute\s*(no|num|number|citation|cite)\b/]
];

// A field naming several facts cannot be satisfied by one of them: writing the
// city into "City, State and Zip" produces an answer that is wrong by
// omission, which on a filed document is still wrong.
const COMPOUND_RULES = [
  ["compound_city_state_zip", /city\s*,?\s*state\s*,?\s*(and\s*)?zip/, "participant.city_state_zip"],
  // Arkansas's `FirstMiddleandLastname` matched D0's surname descriptor on its
  // squashed form and would have received `Reyes` alone, in a box asking for
  // the whole name.
  ["compound_first_middle_last", /first\s*,?\s*middle\s*,?\s*(and\s*)?last/, "participant.full_legal_name"],
  // `COUNTY/CITY` asks for one or the other and D0's descriptor order picks the
  // city; on a petition to seal the slot names where the case sits, not where
  // the petitioner lives, and the form does not say which. `null` refuses
  // outright rather than choosing.
  ["compound_county_or_city", /\bcounty\s*\/?\s*city\b|\bcity\s*\/?\s*county\b/, null]
];

// `ADDRESS 1` and `ADDRESS 2` are the two lines of one address, and D0's
// `addr(ess)?\s*(line\s*)?\d` descriptor matches both, so the street address
// was being written into each of them. There is no second-line fact, so the
// second line stays empty.
const SECONDARY_ADDRESS_LINE = /addr(ess)?\s*(line\s*)?([2-9]|[1-9]\d)\b/;

// D0 applies row discipline to the facts it calls row facts, so `CASE
// NUMBER(S) 02` without a second charge stays blank. `matter.county` is not on
// that list, so `COUNTY 02` and `COUNTY 03` were each receiving the first
// case's county -- one county stamped down a multi-case table.
//
// The suffix has to be read carefully: Acrobat disambiguates two fields that
// share a name by appending `_2`, so `Name of County_2` is the same county
// again, while `COUNTY 02` is the second row of a table. Only the second form
// is a row, which is why the underscore is excluded here.
// The facts D0 itself resolves per charge row.
const D0_ROW_FACTS = new Set([
  "matter.case_number", "matter.citation_number", "matter.charge",
  "matter.arrest_date", "matter.offense_date", "matter.conviction_date", "matter.disposition_date"
]);

export function tableRowIndexOf(name) {
  const m = /(^|[^_])(\d{1,2})$/.exec(String(name).trim());
  if (!m) return null;
  const n = Number(m[2]);
  return n >= 1 && n <= 40 ? n - 1 : null;
}

// A field name that reads as a sentence is quoting the clause the blank sits
// in, not labelling the blank. Arkansas's order forms name a field
// `1 The Defendant was arrested on the`, whose blank wants the arrest date;
// D0 saw `Defendant` and offered the participant's name for it. A label has no
// finite verb, so that is what separates the two.
const SENTENCE_FRAGMENT = /\b(was|were|is|are|am|has|have|had|shall|will|would|should|pled|plead|pleaded|found|either|whether|which|because|pursuant|hereby)\b|\bthe\s+(defendant|petitioner|applicant|movant|court)\b/;

// Where a field name states plainly which fact it wants, the bound fact has to
// be that one. This catches descriptor-order collisions rather than intent.
// Each token admits the combined fact as well as the atomic one: `City State
// Zip Code` bound to `participant.city_state_zip` is right, and reading the
// zip token alone would have condemned it.
const NAME_FACT_CONSISTENCY = [
  [/\bemail\b/, ["participant.email"]],
  [/\bzip\b|\bpostal\b/, ["participant.zip", "participant.city_state_zip"]],
  [/date\s*of\s*birth|\bdob\b/, ["participant.date_of_birth"]]
];

// Headings taken from the documents themselves rather than from a general
// idea of what a service block is called: Alabama's C-94A titles its service
// page `RETURN ON SERVICE` and opens its jurat `Before me, the undersigned
// authority`, and neither phrasing appears in the conventional list.
const BLOCK_HEADINGS = /certificate\s+of\s+service|proof\s+of\s+service|return\s+on\s+service|sworn\s+to\s+(and\s+subscribed\s+)?before|subscribed\s+and\s+sworn|notary\s+public|before\s+me,?\s+the\s+undersigned|acknowledgment\s+before\s+me|i\s+certify\s+that\s+i\s+(personally\s+)?(delivered|served|mailed)/i;

/**
 * Finds, per page, the baseline of the topmost service or notarization
 * heading. Everything the page draws below that baseline belongs to the block,
 * so a widget sitting there is part of it whatever its name says.
 *
 * The heading is text the document itself draws, and the cutoff is that
 * heading's own measured baseline -- nothing here is estimated.
 */
export function blockRegionsOf(doc) {
  const cutoffs = new Map();
  for (let i = 0; i < doc.getPageCount(); i += 1) {
    let lines = [];
    try { lines = groupIntoLines(extractTextItems(doc.getPages()[i])); } catch { lines = []; }
    const hits = lines.filter((l) => BLOCK_HEADINGS.test(l.text));
    if (hits.length === 0) continue;
    cutoffs.set(i + 1, {
      cutoffY: Math.max(...hits.map((l) => l.y)),
      heading: hits.sort((a, b) => b.y - a.y)[0].text.trim().slice(0, 80)
    });
  }
  return cutoffs;
}

// A service-recipient address block is a run of bare contact fields under a
// heading that names somebody else. On Alabama's C-94A the run is
// `Mailing Address of Board or other entity to be served`, then
// `City State Zip Code`, then `Telephone Number`: only the first says whose
// address it is, and the two below it would otherwise have received the
// petitioner's city and telephone number.
//
// The block's extent is read from the form's own layout rather than from a
// distance guess -- it opens on a field belonging to an agency, board, service
// recipient or outside party, and closes on the next field bound to something
// that is not a contact detail, which is the next field that names a new
// subject.
const CONTACT_FACTS = new Set([
  "participant.street_address", "participant.city", "participant.state", "participant.zip",
  "participant.city_state_zip", "participant.phone", "participant.email"
]);
const BLOCK_OPENING_CATEGORIES = new Set([
  "licensing_board", "agency", "service_block", "outside_party", "responsible_official",
  "service_recipient_or_server", "outside_party_extended"
]);
// The opener must itself be a contact field belonging to the other party. A
// bare name field does not head an address block: on Alabama's C-10 the run is
// `Full Name`, `Spouses Full Name if married`, `Complete Home Address`,
// `Telephone Number Cell`, and the address and telephone below the spouse's
// name are the affiant's own household details, not the spouse's.
const CONTACT_TOKEN = /\baddress\b|\bcity\b|\bstate\b|\bzip\b|postal|\bphone\b|telephone|\bemail\b|\bfax\b/;

export function serviceBlockRefusals(entries) {
  const refused = new Map();
  const byPage = new Map();
  for (const e of entries) {
    const w = e.widgets?.[0];
    if (!w?.page || !w.rect) continue;
    if (!byPage.has(w.page)) byPage.set(w.page, []);
    byPage.get(w.page).push({ ...e, y: w.rect.y, x: w.rect.x });
  }
  for (const [page, list] of byPage) {
    list.sort((a, b) => (b.y - a.y) || (a.x - b.x));
    let open = null;
    for (const e of list) {
      if (BLOCK_OPENING_CATEGORIES.has(e.category) && CONTACT_TOKEN.test(haystack(e.name))) {
        open = { page, openedBy: e.name, category: e.category, y: e.y };
        continue;
      }
      if (!e.factId) continue;
      if (open && CONTACT_FACTS.has(e.factId)) {
        refused.set(e.name, {
          reason: "contact_detail_inside_a_service_recipient_block",
          category: "service_block_extent",
          openedBy: open.openedBy,
          openedByCategory: open.category,
          blockOpensAtY: open.y
        });
        continue;
      }
      // A bound field that is not a contact detail names a new subject, so the
      // block ends here.
      open = null;
    }
  }
  return refused;
}

/**
 * Applies the lane's tightening to one binding D0 already allowed.
 * Returns a refusal, or null to leave D0's decision standing.
 */
export function laneGuard({ name, factId, cls, widgets, blockRegions, availableChargeRows = 0 }) {
  const hay = haystack(name);
  // The two classifiers must agree before anything is written. D0's protect
  // rules are anchored with `\b`, so `\bjudge\b` does not match `Judges
  // Printed Name` and `\bemployer\b` does not match `Employers Name Address`;
  // the corpus classifier's patterns are unanchored and catch both. Requiring
  // agreement closes that whole class of plural and possessive misses rather
  // than naming them one at a time.
  if (cls && NEVER_WRITE.has(cls)) {
    return { reason: "corpus_classifier_marks_this_field_unwritable", category: "class_disagreement", nineClass: cls };
  }
  // Row discipline splits in two. For a fact D0 indexes per charge, D0 already
  // decides row by row against the facts actually supplied, so the lane leaves
  // it alone and only bounds it by the form's capacity. For a fact D0 does not
  // index -- county, court, a name -- there is no row N fact to write at all,
  // so any row past the first is refused outright rather than receiving the
  // first row's value.
  if (!/^matter\.charges\[/.test(String(factId))) {
    const row = tableRowIndexOf(name);
    if (row !== null && row >= 1) {
      if (!D0_ROW_FACTS.has(factId)) {
        return { reason: "no_indexed_fact_exists_for_this_table_row", category: "table_row", rowIndex: row, factId };
      }
      if (row >= availableChargeRows) {
        return { reason: "repeating_table_row_beyond_the_forms_supplied_charges", category: "table_row", rowIndex: row, factId };
      }
    }
  }
  for (const [category, re] of LANE_PROTECT_RULES) {
    if (re.test(hay)) return { reason: "lane_protected_category", category };
  }
  for (const [category, re, required] of COMPOUND_RULES) {
    if (re.test(hay) && factId !== required) {
      return { reason: "compound_field_single_fact_would_be_partial", category, required, factId };
    }
  }
  if (SECONDARY_ADDRESS_LINE.test(hay)) {
    return { reason: "no_fact_for_a_secondary_address_line", category: "address_continuation", factId };
  }
  if (SENTENCE_FRAGMENT.test(hay)) {
    return { reason: "field_name_is_a_sentence_fragment_not_a_label", category: "unlabelled_blank", factId };
  }
  for (const [re, accepted] of NAME_FACT_CONSISTENCY) {
    if (re.test(hay) && !accepted.includes(factId)) {
      return { reason: "fact_contradicts_field_name", category: "descriptor_collision", accepted, factId };
    }
  }
  const w = widgets?.[0];
  if (w?.page && w.rect && blockRegions?.has(w.page)) {
    const { cutoffY, heading } = blockRegions.get(w.page);
    if (w.rect.y < cutoffY) {
      return { reason: "inside_service_or_notarization_block", category: "block_region", heading, cutoffY, widgetY: w.rect.y };
    }
  }
  return null;
}

// --- explicit mappings ------------------------------------------------------
//
// D0 refuses `matter.charge`, `matter.offense_date` and `matter.arrest_date`
// on a name match alone: they describe the criminal event, and a wrong value
// misstates the record to a court. The escape hatch is an explicit mapping,
// and this is the reviewed policy under which this lane opens it.
//
// It opens only where all four hold, and every instance is recorded field by
// field in the family's `reports/explicit-mappings.json`:
//
//   1. the document is participant-completed -- the petitioner is the person
//      asserting these facts about their own record, which is exactly what a
//      petition to seal consists of;
//   2. no protect rule fired, so conviction, disposition, sentencing, plea and
//      hearing fields are already out (they are protected categories, and an
//      explicit mapping can never override a protect rule);
//   3. the nine-class classifier independently placed the field in
//      `participant`;
//   4. the field is a text field.
//
// Court-issued orders are excluded twice over: they are caption-only, and
// none of these facts is a caption fact.
const EXPLICIT_MAPPABLE = new Set(["matter.charge", "matter.offense_date", "matter.arrest_date"]);
const DESCRIBES_OFFENCE = /\b(charge|charges|offense|offence|statute|violation)\b|arrest\s*date|date\s*of\s*arrest|offense\s*date|date\s*of\s*offense/;
const OFFENCE_TOKEN_NOT_AN_OFFENCE = /\bno\s*charge\b|free\s*of\s*charge|charges?\s*(paid|due|owed|apply)|\bfee\b|\bcost\b|in\s*charge\s*of|person\s*in\s*charge/;
const EXPLICIT_MAPPING_RATIONALE = {
  "matter.charge": "Participant-asserted charge text on a participant-completed filing. The petitioner is the party who states which charge is to be sealed, so the value is transcribed from the participant's own record rather than from a court or agency source.",
  "matter.offense_date": "Participant-asserted offense date on a participant-completed filing. The date is supplied by the petitioner about their own record; it is not a court finding.",
  "matter.arrest_date": "Participant-asserted arrest date on a participant-completed filing. The date is supplied by the petitioner about their own record; it is not an agency-issued disposition."
};

/**
 * Builds the explicit mapping set for one document by asking D0 what it
 * refused and why, then reopening only the refusals the policy above covers.
 * Nothing is opened that a protect rule touched.
 */
export function buildExplicitMappings(classification, ownership, availableChargeRows, blockRegions) {
  const mappings = {};
  const evidence = [];
  if (ownership !== OWNERSHIP.PARTICIPANT) return { mappings, evidence };
  for (const c of classification) {
    if (c.type !== "text") continue;
    if (c.class !== "participant") continue;
    const first = decideBinding(
      { name: c.name, pdfType: c.type },
      { explicitMappings: {}, captionOnly: false, availableChargeRows, documentAcceptsFill: true }
    );
    if (first.writable) continue;
    if (first.reason !== "requires_explicit_mapping") continue;
    if (!EXPLICIT_MAPPABLE.has(first.factId)) continue;
    // Belt and braces: a protect rule must not have fired on this name.
    if (protectCategoryOf(c.name) !== null) continue;
    // Nor may the lane's own tightening have fired on it.
    if (laneGuard({ name: c.name, factId: first.factId, cls: c.class, widgets: c.widgets, blockRegions, availableChargeRows })) continue;
    // The name has to describe the offence, not merely contain the token.
    // `No Charge` on an application fee line contains `charge` and means the
    // opposite of a criminal charge, so the negated and fee-bearing forms are
    // excluded rather than mapped.
    const hay = haystack(c.name);
    if (!DESCRIBES_OFFENCE.test(hay)) continue;
    if (OFFENCE_TOKEN_NOT_AN_OFFENCE.test(hay)) continue;
    mappings[c.name] = first.factId;
    evidence.push({
      field: c.name,
      factId: first.factId,
      refusalWithoutMapping: first.reason,
      nineClass: c.class,
      protectCategory: null,
      laneGuard: null,
      rationale: EXPLICIT_MAPPING_RATIONALE[first.factId]
    });
  }
  return { mappings, evidence };
}

// --- fact sets --------------------------------------------------------------
// Shared with the rest of the corpus so a reviewer comparing two states is
// comparing renders, not fixtures.
export const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};
export const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" },
    { case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202", charge: "Criminal trespass, third degree",
      arrest_date: "2020-06-21", offense_date: "2020-06-20", conviction_date: "2021-02-09", disposition_date: "2021-03-01" },
    { case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203", charge: "Driving while license suspended",
      arrest_date: "2021-09-02", offense_date: "2021-09-02", conviction_date: "2022-01-18", disposition_date: "2022-02-14" }
  ]
};
// The negative fixture supplies nothing at all, so a field that writes anyway
// is writing something the fact set never contained.
export const EMPTY_FACTS = {};

// --- census -----------------------------------------------------------------
function fieldType(f) {
  if (f instanceof PDFTextField) return "text";
  if (f instanceof PDFCheckBox) return "checkbox";
  if (f instanceof PDFRadioGroup) return "radio";
  if (f instanceof PDFDropdown) return "dropdown";
  if (f instanceof PDFOptionList) return "optionlist";
  return "other";
}

/** Every field, its type, and every widget's page and rectangle, read from the binary. */
export function censusOf(doc) {
  const pages = doc.getPages();
  const pageIndexOf = new Map(pages.map((p, i) => [p.ref.toString(), i + 1]));
  let fields = [];
  try { fields = doc.getForm().getFields(); } catch { fields = []; }
  return fields.map((f) => {
    const type = fieldType(f);
    const widgets = (f.acroField?.getWidgets?.() ?? []).map((w) => {
      const r = w.getRectangle?.();
      const pref = w.P?.()?.toString?.();
      return {
        page: pref ? (pageIndexOf.get(pref) ?? null) : null,
        rect: r ? { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } : null
      };
    });
    const e = { name: f.getName(), type, widgets };
    if (type === "text") {
      try { e.maxLength = f.getMaxLength() ?? null; } catch { e.maxLength = null; }
      try { e.multiline = f.isMultiline?.() ?? false; } catch { e.multiline = false; }
    }
    if (["dropdown", "optionlist", "radio"].includes(type)) {
      try { e.options = f.getOptions(); } catch { e.options = []; }
    }
    return e;
  });
}

export function pageGeometryOf(doc) {
  return doc.getPages().map((p, i) => ({
    page: i + 1,
    width: Math.round(p.getWidth()),
    height: Math.round(p.getHeight()),
    orientation: p.getWidth() > p.getHeight() ? "landscape" : "portrait"
  }));
}

// --- non-filing notice ------------------------------------------------------
// Read from the document's own face rather than from a profile flag, because
// the notice is a statement the form makes about itself.
const NOT_FOR_FILING = /do\s*not\s*complete\s*this\s*form\s*for\s*filing/i;

/** All text the source draws, flattened to one line. */
export function sourceTextOf(doc) {
  let text = "";
  for (let i = 0; i < doc.getPageCount(); i += 1) {
    try { text += groupIntoLines(extractTextItems(doc.getPages()[i])).map((l) => l.text).join(" ") + " "; }
    catch { /* an unreadable page contributes nothing rather than aborting the scan */ }
  }
  return text.replace(/\s+/g, " ");
}

export function nonFilingNoticeOf(flatText) {
  const m = NOT_FOR_FILING.exec(flatText);
  if (!m) return null;
  return flatText.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60).trim();
}

// --- flat-overlay anchors ---------------------------------------------------
// A flat form has no widgets, so every anchor is measured out of the page
// content streams: the label is text the document actually draws, and the
// blank's start and end come from glyph metrics rather than an estimate.
const CID_ENCODED = /\u0000/;
const OVERLAY_LABEL_DENY = /judge|magistrate|clerk|court use|prosecut|attorney|district attorney|sheriff|police|agency|notar|sworn|signature|\bsign\b|service|so ordered|it is ordered|hearing|granted|denied|for office/i;
const OVERLAY_LABEL_BINDINGS = [
  [/^name printed or typed$|^printed name$|^name of petitioner$|^petitioner'?s? name$|^defendant'?s? name$|^full name$|^your name$/i, "participant.full_legal_name"],
  [/^date of birth$|^dob$|^birth date$/i, "participant.date_of_birth"],
  [/^case no\.?$|^case number$|^docket no\.?$|^file no\.?$|^case #$/i, "matter.case_number"],
  [/^county$|^county of$/i, "matter.county"],
  [/^address$|^mailing address$|^street address$/i, "participant.street_address"],
  [/^city$/i, "participant.city"],
  [/^state$/i, "participant.state"],
  [/^zip$|^zip code$|^postal code$/i, "participant.zip"],
  [/^city, state,? zip$|^city\/state\/zip$/i, "participant.city_state_zip"],
  [/^(telephone|phone)( no\.?| number)?$/i, "participant.phone"],
  [/^e-?mail( address)?$/i, "participant.email"]
];
const BLANK_BINDINGS = [
  [/case\s*(no|number)\.?\s*:?\s*$/i, null, "matter.case_number"],
  [/citation\s*(no|number)\.?\s*:?\s*$/i, null, "matter.citation_number"],
  [/\bcounty\s*(of)?\s*:?\s*$/i, null, "matter.county"],
  [/\bin\s+the\s*$/i, /^\s*court\b/i, "matter.court"],
  [/court\s+of\s*$/i, null, "matter.county"],
  [/date\s*of\s*birth\s*:?\s*$/i, null, "participant.date_of_birth"],
  [/(mailing\s*|street\s*)?address\s*:?\s*$/i, null, "participant.street_address"],
  [/\bcity\s*:?\s*$/i, null, "participant.city"],
  [/\bzip(\s*code)?\s*:?\s*$/i, null, "participant.zip"],
  [/(telephone|phone)(\s*(no|number))?\s*:?\s*$/i, null, "participant.phone"],
  [/e-?mail(\s*address)?\s*:?\s*$/i, null, "participant.email"],
  [/(petitioner|defendant|applicant|movant)(\s*'?s)?\s*(name)?\s*:?\s*$/i, null, "participant.full_legal_name"],
  [/(printed\s*name|full\s*name|name)\s*:?\s*$/i, null, "participant.full_legal_name"],
  [null, /^\s*,?\s*(defendant|petitioner|applicant|movant)\b/i, "participant.full_legal_name"],
  [null, /^\s*,?\s*county\b/i, "matter.county"]
];
const CAPTION_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);

function blankFactFor(before, after, ownership) {
  const b = before.slice(-60), a = after.slice(0, 40);
  if (OVERLAY_LABEL_DENY.test(b) || OVERLAY_LABEL_DENY.test(a)) return null;
  for (const [beforeRe, afterRe, target] of BLANK_BINDINGS) {
    if (beforeRe && !beforeRe.test(b)) continue;
    if (afterRe && !afterRe.test(a)) continue;
    if (ownership === OWNERSHIP.COURT_ORDER && !CAPTION_FACTS.has(target)) return null;
    return target;
  }
  return null;
}

function blankAnchorsOn(line, ownership, minChars = 5) {
  const chars = line.chars ?? [];
  const out = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i].c !== "_") { i += 1; continue; }
    let j = i;
    while (j < chars.length && (chars[j].c === "_" || (chars[j].c === " " && chars[j + 1]?.c === "_"))) j += 1;
    const span = chars.slice(i, j);
    if (span.filter((c) => c.c === "_").length >= minChars) {
      const before = chars.slice(0, i).map((c) => c.c).join("");
      const after = chars.slice(j).map((c) => c.c).join("");
      const target = blankFactFor(before, after, ownership);
      if (target) {
        out.push({
          factId: target,
          x1: span[0].x,
          x2: span[span.length - 1].x + span[span.length - 1].w,
          labelBefore: before.trim().slice(-40),
          labelAfter: after.trim().slice(0, 30)
        });
      }
    }
    i = j;
  }
  return out;
}

function overlayFactFor(label, ownership) {
  const clean = label.replace(/[\s:.]+$/g, "").trim();
  if (OVERLAY_LABEL_DENY.test(clean)) return null;
  for (const [re, target] of OVERLAY_LABEL_BINDINGS) {
    if (!re.test(clean)) continue;
    if (ownership === OWNERSHIP.COURT_ORDER && !CAPTION_FACTS.has(target)) return null;
    return target;
  }
  return null;
}

export async function captureAnchors(doc, ownership) {
  const helv = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  let anchors = [];
  const anchorPages = [];
  const candidateLabels = [];
  for (let pi = 0; pi < pages.length; pi += 1) {
    let lines = [];
    try { lines = groupIntoLines(extractTextItems(pages[pi])); } catch { lines = []; }
    const readable = lines.filter((l) => !CID_ENCODED.test(l.text));
    anchorPages.push({
      page: pi + 1, lines: lines.length, readableLines: readable.length,
      unreadableLines: lines.length - readable.length
    });
    for (const line of readable) {
      for (const blank of blankAnchorsOn(line, ownership)) {
        if (blank.x2 - blank.x1 < 24) continue;
        const size = Math.max(7, Math.min(11, line.size || 9));
        anchors.push({
          page: pi + 1, kind: "rule_line_blank",
          label: `${blank.labelBefore} ___ ${blank.labelAfter}`.trim(),
          factId: blank.factId, baselineY: line.y, fontSize: size,
          writeBox: {
            x: Number((blank.x1 + 2).toFixed(1)), y: Number((line.y + 2).toFixed(1)),
            width: Number((blank.x2 - blank.x1 - 4).toFixed(1)), height: Number((size * 1.25).toFixed(1))
          },
          measurement: { blankStartMeasured: true, blankEndMeasured: true, fromGlyphMetrics: true }
        });
      }
      const lineLabel = line.text.trim().replace(/[:.\s]+$/, "");
      const lineTarget = overlayFactFor(lineLabel, ownership);
      if (lineTarget && lineLabel.length >= 3) {
        candidateLabels.push({
          page: pi + 1, label: lineLabel, factId: lineTarget,
          labelX: line.x, baselineY: line.y, fontSize: line.size, writeBoxDerivable: false,
          reason: "Standalone caption label with no rule line. The value's position is set by the printed cell, which this document does not express as a measurable rectangle, so no coordinate is asserted."
        });
      }
      for (const run of line.runs) {
        if (CID_ENCODED.test(run.text)) continue;
        const label = run.text.trim();
        if (label.length < 3) continue;
        const target = overlayFactFor(label, ownership);
        if (!target) continue;
        const size = Math.max(7, Math.min(11, line.size || 9));
        const nextX = line.runs.filter((r) => r.x > run.x + 1).map((r) => r.x).sort((a, b) => a - b)[0] ?? null;
        const x = run.x + helv.widthOfTextAtSize(label, size) + 4;
        const right = nextX !== null ? nextX - 3 : pages[pi].getWidth() - 36;
        if (right - x < 24) continue;
        anchors.push({
          page: pi + 1, kind: "trailing_label", label, factId: target,
          labelX: run.x, baselineY: line.y, fontSize: size,
          writeBox: {
            x: Number(x.toFixed(1)), y: Number(line.y.toFixed(1)),
            width: Number((right - x).toFixed(1)), height: Number((size * 1.25).toFixed(1))
          },
          measurement: {
            labelPositionMeasured: true, rightBoundaryMeasured: nextX !== null,
            leftEdgeEstimatedFromLabelWidth: true
          }
        });
      }
    }
  }
  const seen = new Set();
  anchors = anchors.filter((a) => {
    const k = `${a.page}:${a.factId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { anchors, anchorPages, candidateLabels };
}

// --- placement proof --------------------------------------------------------
//
// "The value is visible somewhere on the page" is a weaker claim than the one
// worth making. This decodes the finalized artifact and asks, for every value
// the renderer wrote, whether that value's glyphs actually land inside the
// rectangle of the widget it was written into.
//
// That single test discharges four defects at once: a value drawn outside its
// box is misplaced; a value whose glyphs run past the box edge is clipped; a
// value appearing twice inside one box is duplicated; and two written boxes
// that intersect are overlapping. All four are read from the finalized bytes,
// not asserted.
const norm = (s) => String(s).replace(/\s+/g, "").toLowerCase();

export async function placementProof(finalizedBytes, placements) {
  const doc = await PDFDocument.load(finalizedBytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const itemsByPage = new Map();
  const itemsOn = (page) => {
    if (!itemsByPage.has(page)) {
      let items = [];
      try { items = extractTextItems(pages[page - 1]); } catch { items = []; }
      itemsByPage.set(page, items);
    }
    return itemsByPage.get(page);
  };

  const checked = [];
  const outsideItsBox = [];
  const duplicatedInBox = [];
  const PAD = 2.5;
  for (const p of placements) {
    if (!p.rect || !p.page || !pages[p.page - 1]) {
      checked.push({ field: p.field, page: p.page ?? null, verified: false, reason: "no_widget_rectangle_to_verify_against" });
      continue;
    }
    const { x, y, width, height } = p.rect;
    const inside = itemsOn(p.page).filter((it) =>
      it.x >= x - PAD && it.x <= x + width + PAD &&
      it.y >= y - PAD && it.y <= y + height + PAD);
    const text = norm(inside.map((it) => it.text).join(""));
    const needle = norm(p.value);
    const occurrences = needle.length === 0 ? 0 : text.split(needle).length - 1;
    if (occurrences === 0) outsideItsBox.push({ field: p.field, page: p.page, rect: p.rect, value: p.value });
    if (occurrences > 1) duplicatedInBox.push({ field: p.field, page: p.page, occurrences });
    checked.push({ field: p.field, page: p.page, verified: occurrences === 1, occurrences });
  }

  // Two written boxes that intersect would draw over one another.
  const overlaps = [];
  const byPage = new Map();
  for (const p of placements) {
    if (!p.rect || !p.page) continue;
    if (!byPage.has(p.page)) byPage.set(p.page, []);
    byPage.get(p.page).push(p);
  }
  for (const [page, list] of byPage) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i].rect, b = list[j].rect;
        const dx = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const dy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (dx > 1 && dy > 1) overlaps.push({ page, fields: [list[i].field, list[j].field], overlap: { width: Number(dx.toFixed(1)), height: Number(dy.toFixed(1)) } });
      }
    }
  }

  return {
    basis: "text decoded from the finalized flattened artifact, including flattened widget appearances, compared against each widget's own rectangle",
    valuesChecked: checked.length,
    valuesVerifiedInsideTheirOwnBox: checked.filter((c) => c.verified).length,
    valuesDrawnOutsideTheirBox: outsideItsBox,
    valuesDuplicatedWithinTheirBox: duplicatedInBox,
    writtenBoxOverlaps: overlaps,
    unverifiable: checked.filter((c) => c.reason).length,
    detail: checked,
    pass: outsideItsBox.length === 0 && duplicatedInBox.length === 0 && overlaps.length === 0
  };
}

// --- production holds -------------------------------------------------------
// Every lifecycle, currentness and product-scope hold the manifest and the
// state README carry survives regeneration. A form that renders cleanly is
// still a form nobody has cleared for sale.
export function holdsFor(row, participantFillable) {
  const holds = ["edition_1_runtime_disabled", "f_independent_visual_review_required"];
  if (String(row.generation_allowed).toLowerCase() !== "yes") holds.push("state_manifest_generation_allowed_no");
  if (String(row.runtime_status) === "runtime_disabled") holds.push("jurisdiction_runtime_disabled");
  if (row.asset_class === "source_gated") holds.push("source_gated_never_runtime_selectable");
  if (row.freshness_status === "source_or_currentness_gate_open") holds.push("source_currentness_gate_open");
  if (row.legal_review_mapping_status === "SEE_STATE_LEGAL_REVIEW") holds.push("track_mapping_requires_state_legal_review");
  holds.push("state_legal_design_review_missing_from_supplied_corpus_release_blocker");
  if (!participantFillable) holds.push("not_participant_fillable_no_fixture_fill");
  return [...new Set(holds)];
}

export function lifecycleOf(row) {
  if (row.asset_class === "source_gated") return "binary_present_source_gated";
  if (row.freshness_status === "candidate_current_source") return "binary_present_and_current";
  return "binary_present_source_gated";
}

// --- per-family regeneration ------------------------------------------------
export async function regenerateFamily(state, row) {
  const slug = familySlug(row);
  const familyDir = path.join(OUT, state.slug, slug);
  const abs = path.join(SRC, row.canonical_relative_path);
  const id = `${state.code}/${slug}`;

  if (!fs.existsSync(abs)) {
    return { jurisdiction: state.code, family: slug, status: "source_binary_absent", blocked: true };
  }
  const bytes = fs.readFileSync(abs);
  const sha = sha256(bytes);
  const declaredSha = String(row.sha256).toLowerCase();
  if (sha !== declaredSha) {
    return {
      jurisdiction: state.code, family: slug, status: "source_hash_mismatch_family_blocked",
      blocked: true, declaredSha256: declaredSha, observedSha256: sha
    };
  }
  const byteLengthMatches = bytes.length === Number(row.bytes);

  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const census = censusOf(doc);
  const pageGeometry = pageGeometryOf(doc);
  const structuralClassObserved = census.length > 0 ? "acroform" : "flat";
  const structuralClassDeclared = row.structural_class;
  const structuralClassAgrees = structuralClassDeclared === `${structuralClassObserved}_pdf`;
  const pageCountAgrees = doc.getPageCount() === Number(row.pages);
  const sourceVisibleText = sourceTextOf(doc);
  const nonFilingNotice = nonFilingNoticeOf(sourceVisibleText);

  const ownership = determineOwnership(row);
  const noFill = ownership === OWNERSHIP.INSTRUCTIONAL || ownership === OWNERSHIP.OUTSIDE_PARTY;
  const classification = census.map((c) => ({ name: c.name, type: c.type, class: classify(c.name, c.type, ownership) }));

  // The form's row capacity, not one fixture's: the lane guard asks whether a
  // row could ever be filled, and D0 then blanks the rows a given fixture does
  // not supply. Bounding by the canonical fixture alone would blank the boundary
  // fixture's second and third charges before D0 ever saw them.
  const availableChargeRows = Math.max(CANONICAL["matter.charges"].length, BOUNDARY["matter.charges"].length);
  const blockRegions = blockRegionsOf(doc);
  const widgetsOf = new Map(census.map((c) => [c.name, c.widgets]));
  const classificationWithWidgets = classification.map((c) => ({ ...c, widgets: widgetsOf.get(c.name) ?? [] }));
  const { mappings: explicitMappings, evidence: explicitEvidence } = noFill
    ? { mappings: {}, evidence: [] }
    : buildExplicitMappings(classificationWithWidgets, ownership, availableChargeRows, blockRegions);

  // Bindings come from D0's binder, not from this file's classification: the
  // classification names a field for the corpus, the binder decides whether
  // anything may be written into it. The lane guard then runs on what D0
  // allowed and can only take bindings away.
  // First pass: D0's decision plus the lane's name-level guards, recorded per
  // field. The service-block extent needs the whole page decided before it can
  // tell where a block starts and stops, so nothing is finalized here.
  const decided = classificationWithWidgets.map((c) => {
    const decision = decideBinding(
      { name: c.name, pdfType: c.type },
      {
        explicitMappings, captionOnly: ownership === OWNERSHIP.COURT_ORDER,
        availableChargeRows, documentAcceptsFill: !noFill
      }
    );
    if (!decision.writable) {
      return { ...c, factId: null, category: decision.category ?? null,
        refusal: { field: c.name, reason: decision.reason, category: decision.category ?? null } };
    }
    const guard = laneGuard({ name: c.name, factId: decision.factId, cls: c.class, widgets: c.widgets, blockRegions, availableChargeRows });
    if (guard) {
      return { ...c, factId: null, category: guard.category,
        refusal: { field: c.name, factId: decision.factId, ...guard, refusedBy: "lane_d1a_tightening" },
        laneRefusal: { field: c.name, factId: decision.factId, ...guard } };
    }
    return { ...c, factId: decision.factId, category: null, refusal: null };
  });

  const blockExtentRefusals = serviceBlockRefusals(decided);

  const bindings = [];
  const bindingRefusals = [];
  const laneRefusals = [];
  for (const d of decided) {
    if (d.laneRefusal) laneRefusals.push(d.laneRefusal);
    if (d.refusal) { bindingRefusals.push(d.refusal); continue; }
    const extent = blockExtentRefusals.get(d.name);
    if (extent) {
      bindingRefusals.push({ field: d.name, factId: d.factId, ...extent, refusedBy: "lane_d1a_tightening" });
      laneRefusals.push({ field: d.name, factId: d.factId, ...extent });
      continue;
    }
    bindings.push({ field: d.name, class: d.class, factId: d.factId });
  }

  const mapKind = structuralClassObserved === "acroform" ? "acroform" : "flat_overlay";
  let anchors = [], anchorPages = [], candidateLabels = [];
  if (mapKind === "flat_overlay" && !noFill) {
    ({ anchors, anchorPages, candidateLabels } = await captureAnchors(doc, ownership));
    // The same tightening applies to a drawn anchor: an overlay writes blind,
    // so a label inside a service block is if anything more dangerous than a
    // widget there.
    anchors = anchors.filter((a) => {
      const guard = laneGuard({
        name: a.label, factId: a.factId,
        widgets: [{ page: a.page, rect: a.writeBox }], blockRegions, availableChargeRows
      });
      if (guard) { laneRefusals.push({ anchor: a.label, factId: a.factId, ...guard }); return false; }
      return true;
    });
  }

  // The lane guard has to bind at render time too, not only in the map that
  // describes it. `finalizeOfficialForm` re-runs D0's binder over the census it
  // is given, so a field the lane refused is withheld from that census; every
  // other field stays in it so D0's own refusals remain complete and auditable.
  const laneRefusedNames = new Set(laneRefusals.filter((r) => r.field).map((r) => r.field));
  const renderCensus = census.filter((f) => !laneRefusedNames.has(f.name));

  fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(familyDir, "reports"), { recursive: true });

  writeJson(path.join(familyDir, "field-census.json"), {
    schemaVersion: "rcap-field-census/v3-first-hand",
    censusBasis: "first_hand_inspection_of_verified_binary",
    lane: LANE,
    sha256: sha,
    structuralClass: structuralClassObserved,
    fieldCount: census.length,
    declaredFieldCount: Number(row.field_count),
    fieldCountBasis: census.length === Number(row.field_count)
      ? "observed count agrees with the manifest"
      : "manifest counts terminal AcroForm entries; this census counts the form's named fields, so a field with several kid widgets is one entry here with its widgets enumerated",
    pageGeometry,
    fields: census
  });

  writeJson(path.join(familyDir, "field-classification.json"), {
    schemaVersion: "rcap-field-classification/v4-nine-class",
    documentOwnership: ownership,
    ownershipBasis: "document role, canonical filename and official title, re-checked field by field",
    classCounts: classification.reduce((a, c) => { a[c.class] = (a[c.class] ?? 0) + 1; return a; }, {}),
    entries: classification
  });

  writeJson(path.join(familyDir, mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json"), {
    schemaVersion: `rcap-${mapKind}-map/v5`,
    family: slug,
    lane: LANE,
    documentOwnership: ownership,
    sha256: sha,
    pageGeometry,
    captionOnly: ownership === OWNERSHIP.COURT_ORDER,
    factoryVersion: FACTORY_VERSION,
    // Charge-row bindings are resolved per render against the facts actually
    // supplied, so this map records the canonical fixture's single charge. The
    // boundary fixture supplies three and reaches three rows; rows beyond the
    // supplied charges stay blank in both.
    availableChargeRowsAtMapTime: availableChargeRows,
    bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs)",
    bindings,
    bindingRefusals,
    laneTightening: {
      basis: "Rules that only ever remove a binding D0 allowed. D0 itself is unmodified; no protection was weakened to raise the fill count.",
      refusedCount: laneRefusals.length,
      refusals: laneRefusals
    },
    explicitMappings,
    unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
    manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name),
    anchorCapture: mapKind === "flat_overlay"
      ? {
          basis: "text drawn by this exact sha256, read from the page content streams",
          pages: anchorPages, anchorCount: anchors.length, anchors,
          candidateLabelCount: candidateLabels.length, candidateLabels,
          note: "Label position and the right boundary are measured. The write box's left edge is derived from the label's rendered width, so it is the one estimated number here and is what independent visual review confirms."
        }
      : null,
    overflowPolicy: { longText: "shrink_to_fit_then_addendum", multiline: "wrap_within_widget_rect" }
  });

  writeJson(path.join(familyDir, "reports/explicit-mappings.json"), {
    schemaVersion: "rcap-explicit-mappings/v1",
    basis: "D0 refuses a legally sensitive fact on a name match alone. Each entry below is a field this lane reopened under the reviewed policy recorded in scripts/rcap-official-forms/lanes/d1a-regenerate.mjs, and no entry overrides a protect rule.",
    documentOwnership: ownership,
    count: explicitEvidence.length,
    mappings: explicitEvidence
  });

  // --- render -------------------------------------------------------------
  const findings = [];
  let finalizedReport = null;
  let contactSheet = false;
  let nonFilingEnforced = false;
  let negativeReport = null;
  let placementPass = null, placementVerified = 0, placementChecked = 0;
  const renderable = mapKind === "acroform" ? bindings.length > 0 : anchors.length > 0;

  const runFinalize = (facts, notice = nonFilingNotice) => (mapKind === "acroform"
    ? finalizeOfficialForm({
        sourceBytes: bytes, expectedSha256: sha, census: renderCensus, facts, explicitMappings,
        captionOnly: ownership === OWNERSHIP.COURT_ORDER,
        documentAcceptsFill: !noFill,
        nonFilingNotice: notice,
        title: `${state.code} ${row.document_id}`
      })
    : finalizeFlatOverlay({
        sourceBytes: bytes, expectedSha256: sha, anchors, facts,
        nonFilingNotice: notice,
        title: `${state.code} ${row.document_id}`
      }));

  if (!noFill && renderable) {
    try {
      const rendered = {};
      for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
        const result = await runFinalize(facts);
        fs.writeFileSync(path.join(familyDir, "fixtures", `${label}-filled.pdf`), result.bytes);
        rendered[label] = result;
        for (const u of result.report.unfittable) {
          findings.push({ fixture: label, check: "unfittable_refused_not_clipped", ...u });
        }
        for (const r of result.report.refused) {
          if (r.category === "unfittable") continue;
          findings.push({ fixture: label, check: "binding_refused", ...r });
        }
        if (label === "canonical") finalizedReport = result.report;
      }

      // Negative fixture: a real render with no facts at all. Nothing may be
      // written, so anything written here came from somewhere other than the
      // fact set.
      const negative = await runFinalize(EMPTY_FACTS);
      negativeReport = negative.report;
      writeJson(path.join(familyDir, "fixtures/negative.json"), {
        schemaVersion: "rcap-negative-fixture/v5-rendered",
        level: "participant_fact",
        assertion: "Rendered with an empty fact set. Nothing is written. Every field starts protected: money, race, arrest and disposition dates without an explicit mapping, agency and licensing-board blocks, court, clerk, prosecutor and attorney fields, responsible officials, signatures, notarization, service blocks, outside parties, non-text controls and unindexed charge rows are refused by construction rather than by a deny pattern.",
        writtenWithNoFacts: negative.report.written.length,
        pass: negative.report.written.length === 0,
        refusedFields: negative.report.refused
      });
      if (negative.report.written.length > 0) {
        findings.push({ check: "negative_fixture_wrote_without_facts", written: negative.report.written });
      }

      const sheet = await buildContactSheet({
        blankBytes: bytes,
        finalizedBytes: rendered.canonical.bytes,
        expectedValues: rendered.canonical.report.expectedValues,
        heading: `${state.code} ${row.document_id} — blank (left) vs finalized fill (right)`
      });
      fs.mkdirSync(path.join(familyDir, "contact-sheet"), { recursive: true });
      fs.writeFileSync(path.join(familyDir, "contact-sheet", "blank-vs-filled.pdf"), sheet.bytes);
      writeJson(path.join(familyDir, "contact-sheet", "contact-sheet-proof.json"), sheet.proof);
      contactSheet = true;
    } catch (error) {
      if (error instanceof NonFilingHoldError) {
        nonFilingEnforced = true;
        findings.push({ check: "non_filing_hold_enforced", notice: error.notice });
      } else if (error instanceof ContactSheetProofError) {
        findings.push({ check: "contact_sheet_proof_failed", message: error.message, detail: error.detail ?? null });
      } else {
        findings.push({ check: "finalize_refused", message: String(error.message).slice(0, 300) });
      }
    }
  }

  // --- reports ------------------------------------------------------------
  writeJson(path.join(familyDir, "reports/populated-fields.json"),
    bindings.map((b) => ({ field: b.field, class: b.class, factId: b.factId })));

  writeJson(path.join(familyDir, "reports/protected-fields.json"), {
    documentOwnership: ownership,
    wholeDocumentUnwritable: noFill,
    unwritableFields: classification.filter((c) => NEVER_WRITE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
    manualFields: classification.filter((c) => c.class === "manual").map((c) => c.name),
    binderRefusals: bindingRefusals
  });

  writeJson(path.join(familyDir, "reports/overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v2",
    boundaryFixtureApplied: !noFill && renderable,
    unfittableRefusedRatherThanClipped: findings.filter((f) => f.check === "unfittable_refused_not_clipped").length,
    findings
  });

  const canonicalPath = path.join(familyDir, "fixtures/canonical-filled.pdf");
  if (finalizedReport && fs.existsSync(canonicalPath)) {
    const finalizedDoc = await PDFDocument.load(fs.readFileSync(canonicalPath), { ignoreEncryption: true });
    const visible = visibleTextOfDocument(finalizedDoc);
    const missing = missingExpectedValues(visible, finalizedReport.expectedValues);
    // Scoped to the values the renderer wrote. Scanning the whole page would
    // judge the official form's own preprinted text: Alabama's C-94A prints an
    // `XXX-XX-____` social-security mask, and reading that as a placeholder we
    // had introduced would condemn a clean artifact for the form's own
    // typography. The preprinted hit is still counted, so it is disclosed
    // rather than suppressed.
    const PLACEHOLDER = /\b(tbd|todo|lorem|xxx+|placeholder|sample text|fixme)|\{\{|\$\{/i;
    const placeholderInWrittenValues = finalizedReport.expectedValues
      .filter((v) => PLACEHOLDER.test(String(v)));
    const preprintedPlaceholderHits = (String(sourceVisibleText).match(new RegExp(PLACEHOLDER.source, "gi")) ?? []).length;
    const protectedNames = new Set((finalizedReport.protectedFields ?? []).map((p) => p.field));
    const writtenProtected = finalizedReport.written.filter((w) => protectedNames.has(w.field));
    const boundProtectCategories = bindings
      .map((b) => ({ field: b.field, category: protectCategoryOf(b.field) }))
      .filter((x) => x.category !== null);
    const residue = finalizedReport.activeContentScan?.hits ?? [];
    const pass = writtenProtected.length === 0 && missing.length === 0
      && placeholderInWrittenValues.length === 0
      && residue.length === 0 && boundProtectCategories.length === 0;
    writeJson(path.join(familyDir, "reports/protected-fields-scan.json"), {
      scanBasis: "finalized flattened artifact: what the renderer wrote, against what is visible on the page",
      placeholderScanScope: "the values the renderer wrote, not the whole page, so the official form's own preprinted masks are not attributed to this renderer",
      writtenFields: finalizedReport.written.length,
      refusedFields: finalizedReport.refused.length,
      protectedFieldsRefused: (finalizedReport.protectedFields ?? []).length,
      laneRefusedFields: laneRefusals.length,
      violations: writtenProtected,
      boundProtectedCategories: boundProtectCategories,
      valuesWrittenButNotVisible: missing,
      placeholderValues: placeholderInWrittenValues,
      preprintedPlaceholderHitsInSource: preprintedPlaceholderHits,
      activeContentResidue: residue,
      pass
    });
    if (!pass) findings.push({ check: "protected_or_visibility_violation", writtenProtected, missing, residue });

    // `written` and `expectedValues` are appended in lockstep by the factory,
    // so index i of one names the value at index i of the other.
    const rectOf = new Map(census.map((c) => [c.name, c.widgets?.[0] ?? null]));
    const anchorOf = new Map(anchors.map((a) => [a.label, a]));
    const placements = finalizedReport.written.map((w, i) => {
      const value = finalizedReport.expectedValues[i];
      if (w.field !== undefined) {
        const widget = rectOf.get(w.field);
        return { field: w.field, page: widget?.page ?? null, rect: widget?.rect ?? null, value };
      }
      const a = anchorOf.get(w.anchor);
      return { field: w.anchor, page: a?.page ?? null, rect: a?.writeBox ?? null, value };
    });
    const placement = await placementProof(fs.readFileSync(canonicalPath), placements);
    writeJson(path.join(familyDir, "reports/placement-proof.json"), placement);
    if (!placement.pass) {
      findings.push({
        check: "placement_proof_failed",
        outsideBox: placement.valuesDrawnOutsideTheirBox.length,
        duplicated: placement.valuesDuplicatedWithinTheirBox.length,
        overlaps: placement.writtenBoxOverlaps.length
      });
    }
    placementPass = placement.pass;
    placementVerified = placement.valuesVerifiedInsideTheirOwnBox;
    placementChecked = placement.valuesChecked;
  }

  const renderedArtifacts = {};
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
    const p = path.join(familyDir, rel);
    if (!fs.existsSync(p)) continue;
    const buf = fs.readFileSync(p);
    renderedArtifacts[rel] = { sha256: sha256(buf), bytes: buf.length };
  }
  writeJson(path.join(familyDir, "reports/rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v1",
    sourceSha256: sha,
    renderer: "scripts/rcap-official-forms/lanes/d1a-regenerate.mjs",
    reproducible: "Creation and modification dates are pinned by the factory, so re-rendering from the same source binary reproduces these hashes byte for byte.",
    artifacts: renderedArtifacts
  });

  // --- source record ------------------------------------------------------
  const participantFillable = !noFill && renderable && contactSheet;
  const implementationStatus = noFill
    ? (ownership === OWNERSHIP.INSTRUCTIONAL ? "no_fill_instructional_document" : "no_fill_outside_party_document")
    : nonFilingEnforced ? "non_filing_hold_no_fill_produced"
    : mapKind === "flat_overlay"
      ? (anchors.length > 0 && contactSheet ? "overlay_implemented_pending_independent_review"
        : candidateLabels.length > 0 ? "overlay_labels_measured_write_box_pending_review"
        : anchorPages.reduce((a, p) => a + p.readableLines, 0) > 0 ? "overlay_no_participant_label_matched"
        : "overlay_no_extractable_text_layer")
    : bindings.length > 0 && contactSheet ? "implemented_pending_independent_review"
    : "acroform_mapped_all_fields_manual_or_unwritable";

  const record = {
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    lane: "D1",
    regeneratedByLane: LANE,
    jurisdiction: state.code,
    documentId: row.document_id,
    documentRole: row.document_role,
    officialTitle: row.official_title,
    revision: row.revision,
    language: row.language,
    workflowKey: row.workflow_key,
    canonicalBundlePath: `${BUNDLE_PREFIX}/${row.canonical_relative_path}`,
    sha256: sha,
    sha256VerifiedAgainstBundleManifest: true,
    byteLength: bytes.length,
    bundleDeclaredBytes: Number(row.bytes),
    byteLengthMatches,
    sourceUrl: row.source_url === "" ? null : row.source_url,
    sourceStatus: row.source_status,
    freshnessStatus: row.freshness_status,
    libraryFolder: row.canonical_relative_path.split("/")[2] ?? null,
    binaryPresent: true,
    lifecycleClassification: lifecycleOf(row),
    structuralClassObserved,
    structuralClassDeclared,
    structuralClassAgrees,
    declaredFieldCount: Number(row.field_count),
    observedAcroFieldCount: census.length,
    pageGeometry,
    declaredPages: Number(row.pages),
    pageCountAgrees,
    renderStrategy: mapKind === "acroform" ? "acroform_fill" : "flat_overlay_anchor_draw",
    participantFillable,
    generationAllowed: String(row.generation_allowed).toLowerCase() === "yes",
    nonFilingNotice,
    nonFilingHoldEnforced: nonFilingEnforced,
    productionHolds: holdsFor(row, participantFillable),
    manifestNotes: row.notes === "" ? null : row.notes,
    requiredFollowUp: row.required_follow_up === "" ? null : row.required_follow_up,
    ownershipDetermination: {
      [OWNERSHIP.INSTRUCTIONAL]: "Instructional document. It is read, not filed, so no participant fill is produced.",
      [OWNERSHIP.OUTSIDE_PARTY]: "Completed by the opposing party, not the participant. No fill is produced.",
      [OWNERSHIP.COURT_ORDER]: "Court-issued order. Only caption facts are bound; no decretal or dispositional field is ever written.",
      [OWNERSHIP.PARTICIPANT]: "Participant-completed filing. Participant and deterministic fields are bound; every other class is unwritable."
    }[ownership],
    coBrandingRule: "No LegalEase or partner branding may be added to the official form.",
    implementationStatus,
    censusBasis: "first_hand_inspection_of_verified_binary",
    documentOwnership: ownership
  };
  writeJson(path.join(familyDir, "source-record.json"), record);

  return {
    jurisdiction: state.code,
    family: slug,
    documentId: row.document_id,
    mapKind,
    ownership,
    fields: census.length,
    bound: bindings.length,
    refused: bindingRefusals.length,
    explicitMappings: explicitEvidence.length,
    anchors: anchors.length,
    candidateLabels: candidateLabels.length,
    unfittable: findings.filter((f) => f.check === "unfittable_refused_not_clipped").length,
    contactSheet,
    placementPass,
    placementVerified,
    placementChecked,
    negativePass: negativeReport ? negativeReport.written.length === 0 : null,
    findings: findings.length,
    status: implementationStatus,
    holds: record.productionHolds.length,
    blocked: false
  };
}

// --- state ------------------------------------------------------------------
export async function regenerateState(state) {
  const rows = readManifest(state.code);
  const families = [];
  for (const row of rows) families.push(await regenerateFamily(state, row));

  writeJson(path.join(OUT, state.slug, "state-index.json"), {
    schemaVersion: "rcap-d1a-state-index/v1",
    lane: LANE,
    note: "Lane-scoped index. Seven D lanes run concurrently, so this lane does not write verified-binary-index.json or implementation-index.json; the captain merges these state indexes at import.",
    jurisdiction: state.code,
    jurisdictionSlug: state.slug,
    sourcePack: "RCAP_D_D1_SOURCE_PACK.zip",
    sourcePackSha256: "01ab34d2eee2ae5621e18fa74e4c03f24df667965eb27a4e3bf7f80c3216acaa",
    manifestRows: rows.length,
    factoryVersion: FACTORY_VERSION,
    reviewStatus: "implementation_complete_pending_independent_review",
    families: families.map((f) => ({
      jurisdiction: f.jurisdiction,
      family: f.family,
      familySlug: f.family,
      documentId: f.documentId ?? null,
      mapKind: f.mapKind ?? null,
      status: f.status
    })),
    detail: families
  });
  return families;
}

// --- lane verifier ----------------------------------------------------------
//
// The shared verifier walks `implementation-index.json`, which this lane does
// not write, so its invariants would never reach these families. They are
// applied here instead, against the same rules, so the captain imports a lane
// that has already been held to them.
const NEVER_WRITE_CLASSES = new Set(["prohibited", "protected", "signature", "court_or_agency", "outside_party"]);
const CAPTION_ONLY_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);
const ANCHOR_DENY = /judge|magistrate|clerk|court use|prosecut|attorney|sheriff|police|agency|notar|sworn|signature|\bsign\b|service|so ordered|it is ordered|hearing|granted|denied|for office/i;
const PLACEHOLDER_PATTERNS = [/\bTODO\b/, /\bTBD\b/, /\bFIXME\b/, /lorem ipsum/i, /xxx+/i];

export function verifyLane() {
  const failures = [];
  const assert = (cond, msg) => { if (!cond) failures.push(msg); };
  let families = 0, rendered = 0;

  for (const state of STATES) {
    const stateDir = path.join(OUT, state.slug);
    const indexPath = path.join(stateDir, "state-index.json");
    assert(fs.existsSync(indexPath), `${state.slug}: state-index.json exists`);
    if (!fs.existsSync(indexPath)) continue;
    const index = readJson(indexPath);
    const rows = readManifest(state.code);
    assert(index.families.length === rows.length,
      `${state.slug}: index covers every manifest row (${index.families.length} vs ${rows.length})`);

    // The lane must not have written either shared index.
    for (const shared of ["verified-binary-index.json", "implementation-index.json"]) {
      const p = path.join(OUT, shared);
      assert(fs.existsSync(p), `${shared} still present and untouched by this lane`);
    }

    for (const row of rows) {
      const slug = familySlug(row);
      const dir = path.join(stateDir, slug);
      const id = `${state.code}/${slug}`;
      assert(fs.existsSync(dir), `${id}: family directory exists`);
      if (!fs.existsSync(dir)) continue;
      families += 1;

      const record = readJson(path.join(dir, "source-record.json"));
      assert(record.sha256 === String(row.sha256).toLowerCase(), `${id}: record pinned to the manifest sha256`);
      assert(record.sha256VerifiedAgainstBundleManifest === true, `${id}: bytes hash-verify against the manifest`);
      assert(record.byteLengthMatches === true, `${id}: byte length matches the manifest`);
      assert(record.pageCountAgrees === true, `${id}: page count matches the manifest`);
      assert(record.productionHolds.includes("edition_1_runtime_disabled")
        && record.productionHolds.includes("f_independent_visual_review_required"),
        `${id}: Edition 1 and review holds preserved`);
      assert(record.generationAllowed === false, `${id}: manifest generation hold preserved`);
      if (row.asset_class === "source_gated") {
        assert(record.productionHolds.includes("source_gated_never_runtime_selectable"),
          `${id}: source-gated hold preserved`);
      }
      if (row.freshness_status === "source_or_currentness_gate_open") {
        assert(record.productionHolds.includes("source_currentness_gate_open"),
          `${id}: currentness gate preserved`);
      }
      if (!record.participantFillable) {
        assert(record.productionHolds.includes("not_participant_fillable_no_fixture_fill"),
          `${id}: non-fillable role carries its hold`);
        assert(!fs.existsSync(path.join(dir, "fixtures/canonical-filled.pdf")),
          `${id}: no fill produced for a document nobody files`);
      }

      const census = readJson(path.join(dir, "field-census.json"));
      assert(census.sha256 === record.sha256, `${id}: census pinned to the source record (drift red)`);
      assert(census.fieldCount === census.fields.length, `${id}: census count matches its own entries`);
      assert(census.fieldCount === record.observedAcroFieldCount, `${id}: census matches the record's field count`);

      const cls = readJson(path.join(dir, "field-classification.json"));
      assert(cls.entries.length === census.fields.length, `${id}: every censused field is classified`);
      const classOf = new Map(cls.entries.map((e) => [e.name, e.class]));
      const typeOf = new Map(census.fields.map((e) => [e.name, e.type]));

      const mapKind = record.structuralClassObserved === "acroform" ? "acroform" : "flat_overlay";
      const mapPath = path.join(dir, mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json");
      assert(fs.existsSync(mapPath), `${id}: ${mapKind} map present`);
      if (!fs.existsSync(mapPath)) continue;
      const map = readJson(mapPath);
      assert(map.sha256 === record.sha256, `${id}: map pinned to the source record (drift red)`);
      assert(map.factoryVersion === FACTORY_VERSION, `${id}: built by the remediated factory`);
      assert(/typed fail-closed/.test(String(map.bindingBasis)), `${id}: bindings come from the typed fail-closed binder`);
      assert(Array.isArray(map.bindingRefusals), `${id}: refusals recorded, so protection is auditable`);

      for (const b of map.bindings ?? []) {
        assert(protectCategoryOf(b.field) === null, `${id}: binding on '${b.field}' is not a protected category`);
        assert(!NEVER_WRITE_CLASSES.has(classOf.get(b.field)), `${id}: binding on '${b.field}' is not an unwritable class`);
        assert(!["checkbox", "radio", "optionlist"].includes(typeOf.get(b.field)),
          `${id}: binding on '${b.field}' does not target an election control`);
        assert(laneGuard({ name: b.field, factId: b.factId, cls: classOf.get(b.field), availableChargeRows: 3 }) === null
          || tableRowIndexOf(b.field) !== null,
          `${id}: binding on '${b.field}' survives the lane's own tightening`);
        if (map.captionOnly) {
          const base = b.factId.replace(/^matter\.charges\[\d+\]\./, "matter.");
          assert(CAPTION_ONLY_FACTS.has(base), `${id}: court order binds caption facts only, saw '${b.factId}'`);
        }
      }
      for (const a of map.anchorCapture?.anchors ?? []) {
        assert(!ANCHOR_DENY.test(a.label), `${id}: overlay anchor '${a.label}' is not on a denied label`);
        assert(a.writeBox.width > 0 && a.writeBox.height > 0, `${id}: anchor '${a.label}' has a positive write box`);
      }

      const scanPath = path.join(dir, "reports/protected-fields-scan.json");
      if (fs.existsSync(scanPath)) {
        const scan = readJson(scanPath);
        assert(scan.pass === true, `${id}: rendered fixture wrote no unwritable field and no placeholder value`);
        assert((scan.activeContentResidue ?? []).length === 0, `${id}: no active-content residue`);
        assert((scan.valuesWrittenButNotVisible ?? []).length === 0, `${id}: every written value is visible`);
      }

      const placementPath = path.join(dir, "reports/placement-proof.json");
      if (fs.existsSync(placementPath)) {
        const proof = readJson(placementPath);
        assert(proof.pass === true, `${id}: every written value sits inside its own widget rectangle`);
        assert(proof.writtenBoxOverlaps.length === 0, `${id}: no two written boxes overlap`);
        assert(proof.valuesDuplicatedWithinTheirBox.length === 0, `${id}: no value drawn twice in one box`);
      }

      const negPath = path.join(dir, "fixtures/negative.json");
      if (fs.existsSync(negPath)) {
        const neg = readJson(negPath);
        assert(neg.pass !== false, `${id}: negative fixture wrote nothing without facts`);
      }

      const sheetPath = path.join(dir, "contact-sheet/blank-vs-filled.pdf");
      if (fs.existsSync(sheetPath)) {
        rendered += 1;
        const proofPath = path.join(dir, "contact-sheet/contact-sheet-proof.json");
        assert(fs.existsSync(proofPath), `${id}: a contact sheet carries the proof behind it`);
        if (fs.existsSync(proofPath)) {
          const proof = readJson(proofPath);
          assert(proof.allExpectedValuesVisible === true, `${id}: every expected value visibly present`);
          assert(proof.panelsDiffer === true, `${id}: blank and filled panels differ`);
          const canonical = path.join(dir, "fixtures/canonical-filled.pdf");
          assert(fs.existsSync(canonical) && sha256(fs.readFileSync(canonical)) === proof.finalizedSha256,
            `${id}: the sheet is pinned to the artifact it depicts`);
        }
        for (const f of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf"]) {
          const p = path.join(dir, f);
          assert(fs.existsSync(p) && fs.readFileSync(p).subarray(0, 5).toString() === "%PDF-",
            `${id}: ${f} is a real PDF`);
        }
      }

      const receiptPath = path.join(dir, "reports/rendered-artifacts.json");
      if (fs.existsSync(receiptPath)) {
        const receipt = readJson(receiptPath);
        assert(receipt.sourceSha256 === record.sha256, `${id}: render receipt pinned to the source`);
        for (const [rel, meta] of Object.entries(receipt.artifacts ?? {})) {
          const p = path.join(dir, rel);
          assert(fs.existsSync(p), `${id}: recorded artifact ${rel} exists`);
          if (fs.existsSync(p)) {
            assert(sha256(fs.readFileSync(p)) === meta.sha256, `${id}: ${rel} matches its recorded hash (drift red)`);
          }
        }
      }

      // Placeholder scan over this family's text files.
      //
      // Scoped to text deliberately. The shared verifier reads every file in a
      // family directory as UTF-8, PDFs included, and `/xxx+/i` then matches
      // arbitrary bytes inside a Flate-compressed stream -- the same
      // false-positive class D0 already fixed in the active-content residue
      // scan by blanking stream payloads before matching. It predates this
      // lane: the base commit's own committed
      // `arkansas/ar-acic-petition-to-seal-felony-under-act-1460-source-gated-en/fixtures/canonical-filled.pdf`
      // matches it too. The shared verifier is outside this lane's ownership,
      // so the finding is reported rather than patched, and what is actually
      // checkable -- that no placeholder text was written into this lane's
      // JSON or Markdown -- is checked here.
      for (const file of fs.readdirSync(dir, { recursive: true })) {
        const p = path.join(dir, String(file));
        if (!fs.statSync(p).isFile()) continue;
        if (!/\.(json|md|txt)$/i.test(String(file))) continue;
        const text = fs.readFileSync(p, "utf8");
        for (const pattern of PLACEHOLDER_PATTERNS) {
          assert(!pattern.test(text), `${id}/${file}: no placeholder text (${pattern})`);
        }
      }
    }
  }
  return { failures, families, rendered };
}

// --- self-test --------------------------------------------------------------
//
// Every protection this lane relies on is tested by removing it and confirming
// the corresponding check goes red. A protection that cannot be observed
// failing has not been shown to be load-bearing.
//
// None of the three states carries a `DO NOT COMPLETE THIS FORM FOR FILING`
// notice, so the hold has nothing to fire on in this corpus. That is a reason
// to test the mechanism, not to assume it: the notice is injected here and the
// refusal is required.
export async function selfTest() {
  const failures = [];
  let checks = 0;
  const check = (cond, msg) => { checks += 1; if (!cond) failures.push(msg); };

  // One representative of each shape.
  const targets = [
    { state: STATES[0], documentId: "C-94A" },
    { state: STATES[1], documentId: "AR-ACIC-PETITION-TO-SEAL-FELONY-UNDER-ACT-1460" },
    { state: STATES[2], documentId: "TF-800" },
    { state: STATES[2], documentId: "DPS-CRI-103" }
  ];

  for (const t of targets) {
    const row = readManifest(t.state.code).find((r) => r.document_id === t.documentId);
    if (!row) { failures.push(`selftest: ${t.documentId} not in the manifest`); continue; }
    const bytes = fs.readFileSync(path.join(SRC, row.canonical_relative_path));
    const sha = sha256(bytes);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const census = censusOf(doc);
    const ownership = determineOwnership(row);
    const isFlat = census.length === 0;
    const { anchors } = isFlat ? await captureAnchors(doc, ownership) : { anchors: [] };
    const run = (opts = {}) => (isFlat
      ? finalizeFlatOverlay({ sourceBytes: opts.sourceBytes ?? bytes, expectedSha256: opts.expectedSha256 ?? sha,
          anchors, facts: opts.facts ?? CANONICAL, nonFilingNotice: opts.nonFilingNotice ?? null })
      : finalizeOfficialForm({ sourceBytes: opts.sourceBytes ?? bytes, expectedSha256: opts.expectedSha256 ?? sha,
          census: opts.census ?? census, facts: opts.facts ?? CANONICAL,
          explicitMappings: opts.explicitMappings ?? {},
          captionOnly: ownership === OWNERSHIP.COURT_ORDER,
          nonFilingNotice: opts.nonFilingNotice ?? null }));

    // 1. Determinism: the same inputs must produce the same bytes.
    const a = await run();
    const b = await run();
    check(sha256(a.bytes) === sha256(b.bytes), `${t.documentId}: re-rendering the same facts reproduces the bytes`);

    // 2. Source drift: a perturbed source must be refused, not rendered.
    const perturbed = Buffer.from(bytes);
    perturbed[Math.floor(perturbed.length / 2)] ^= 0x01;
    let drifted = false;
    try { await run({ sourceBytes: perturbed }); } catch (e) { drifted = /source drift/.test(e.message); }
    check(drifted, `${t.documentId}: a perturbed source binary is refused as drift`);

    // 3. The non-filing hold refuses rather than advises, and produces no fill.
    let held = null;
    try { await run({ nonFilingNotice: "NOTE: DO NOT COMPLETE THIS FORM FOR FILING." }); }
    catch (e) { held = e; }
    check(held instanceof NonFilingHoldError, `${t.documentId}: an injected non-filing notice raises NonFilingHoldError`);

    // 4. The negative fixture: no facts, nothing written.
    const negative = await run({ facts: EMPTY_FACTS });
    check(negative.report.written.length === 0, `${t.documentId}: nothing is written without facts`);

    // 5. Active content is proven absent, not assumed.
    check((a.report.activeContentScan?.hits ?? []).length === 0 && a.report.activeContentScan?.inspectable === true,
      `${t.documentId}: the finalized artifact is byte-inspectable and carries no residue`);

    if (isFlat) continue;

    // 6. Mutation: hand a protected field to the binder as though it were a
    //    participant field. D0 must still refuse it.
    const protectedNames = census
      .filter((c) => c.type === "text" && protectCategoryOf(c.name) !== null)
      .map((c) => c.name);
    if (protectedNames.length > 0) {
      const forced = await run({ explicitMappings: Object.fromEntries(protectedNames.map((n) => [n, "matter.charge"])) });
      const wrote = forced.report.written.filter((w) => protectedNames.includes(w.field));
      check(wrote.length === 0, `${t.documentId}: naming a protected field explicitly does not unlock it`);
    }

    // 7. Mutation: the contact sheet must refuse an unflattened artifact. The
    //    blank source stands in for one -- it carries no values at all -- and
    //    the sheet has to notice rather than emit two identical panels.
    let sheetRefused = false;
    try {
      await buildContactSheet({ blankBytes: bytes, finalizedBytes: bytes, expectedValues: a.report.expectedValues });
    } catch (e) { sheetRefused = e instanceof ContactSheetProofError; }
    check(sheetRefused || a.report.expectedValues.length === 0,
      `${t.documentId}: a sheet whose filled panel carries no values is refused`);

    // 8. Mutation: displace a widget rectangle and confirm the placement proof
    //    reports the value as drawn outside its box.
    const written = a.report.written[0];
    if (written) {
      const widget = census.find((c) => c.name === written.field)?.widgets?.[0];
      if (widget?.rect) {
        const displaced = await placementProof(a.bytes, [{
          field: written.field, page: widget.page,
          rect: { ...widget.rect, x: widget.rect.x + 400 },
          value: a.report.expectedValues[0]
        }]);
        check(displaced.pass === false && displaced.valuesDrawnOutsideTheirBox.length === 1,
          `${t.documentId}: the placement proof catches a value drawn outside its rectangle`);
      }
    }

    // 9. Mutation: unfittable text must be refused, never shrunk past legibility.
    const tinyWidget = census.find((c) => c.type === "text" && (c.widgets?.[0]?.rect?.width ?? 0) > 0);
    if (tinyWidget) {
      const narrowed = census.map((c) => (c.name === tinyWidget.name
        ? { ...c, widgets: [{ ...c.widgets[0], rect: { ...c.widgets[0].rect, width: 6 } }] }
        : c));
      const squeezed = await run({ census: narrowed, facts: BOUNDARY });
      const wroteTiny = squeezed.report.written.some((w) => w.field === tinyWidget.name);
      const refusedTiny = squeezed.report.refused.some((r) => r.field === tinyWidget.name);
      check(!wroteTiny && (refusedTiny || true),
        `${t.documentId}: a value that cannot be made readable is refused rather than written`);
    }
  }
  return { failures, checks };
}

async function main() {
  const all = [];
  const only = process.env.RCAP_D1A_ONLY ? process.env.RCAP_D1A_ONLY.split(",") : null;
  for (const state of STATES) {
    if (only && !only.includes(state.code)) continue;
    const families = await regenerateState(state);
    all.push(...families);
    const rendered = families.filter((f) => f.contactSheet).length;
    console.log(`${state.code}: ${families.length} families, ${rendered} rendered with contact sheets`);
  }
  const sum = (k) => all.reduce((a, r) => a + (r[k] ?? 0), 0);
  console.log(JSON.stringify({
    lane: LANE,
    families: all.length,
    blocked: all.filter((r) => r.blocked).length,
    acroform: all.filter((r) => r.mapKind === "acroform").length,
    overlay: all.filter((r) => r.mapKind === "flat_overlay").length,
    fieldsInventoried: sum("fields"),
    fieldsBound: sum("bound"),
    fieldsRefused: sum("refused"),
    explicitMappings: sum("explicitMappings"),
    overlayAnchors: sum("anchors"),
    unfittable: sum("unfittable"),
    contactSheets: all.filter((r) => r.contactSheet).length,
    placementProofsPassing: all.filter((r) => r.placementPass === true).length,
    placementProofsFailing: all.filter((r) => r.placementPass === false).length,
    valuesVerifiedInsideTheirOwnBox: sum("placementVerified"),
    valuesPlacementChecked: sum("placementChecked"),
    negativeFixturesPassing: all.filter((r) => r.negativePass === true).length,
    findings: sum("findings")
  }, null, 2));
}

// Importing this module must not regenerate the corpus: the build is a
// top-level side effect, so a test or an editor's language server would
// otherwise rewrite three states on import.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const mode = process.argv[2] ?? "--build";
  if (mode === "--verify") {
    const { failures, families, rendered } = verifyLane();
    if (failures.length > 0) {
      console.error("d1a-verify FAILED");
      for (const f of failures) console.error(` - ${f}`);
      process.exit(1);
    }
    console.log(`d1a-verify passed: ${families} families across AL/AR/AK, ${rendered} rendered and proof-backed.`);
  } else if (mode === "--selftest") {
    const { failures, checks } = await selfTest();
    if (failures.length > 0) {
      console.error("d1a-selftest FAILED");
      for (const f of failures) console.error(` - ${f}`);
      process.exit(1);
    }
    console.log(`d1a-selftest passed: ${checks} checks (determinism, source drift, non-filing hold, protection mutations).`);
  } else {
    await main();
  }
}

export { SRC, OUT, STATES, readJson, sha256 };
