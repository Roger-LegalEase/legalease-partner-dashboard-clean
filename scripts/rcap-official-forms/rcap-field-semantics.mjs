// Typed, fail-closed binding for official-form fields.
//
// The previous binder was permissive by construction: a field bound whenever
// its name matched any participant-ish pattern, and protection depended on a
// deny pattern having been thought of first. Anything unanticipated therefore
// defaulted to writable, which is the wrong direction for a document that gets
// filed in court.
//
// This module inverts that. Every field starts PROTECTED. A field becomes
// writable only when all of the following hold:
//
//   1. no protect rule matches it;
//   2. its PDF type is one this binder is willing to write (text or dropdown
//      -- never a checkbox, radio group, multi-select, button or signature,
//      because those encode legal elections rather than transcribed facts);
//   3. its name matches exactly one allowlisted fact descriptor;
//   4. the descriptor's declared value type is one the field can carry;
//   5. any descriptor marked `requiresExplicitMapping` has been named for this
//      exact field by the caller;
//   6. an indexed charge-row fact resolves to a row the caller actually
//      supplied.
//
// A field that fails any of these is reported with the reason it was refused,
// so a refusal is auditable rather than silent.

// --- PDF-level types --------------------------------------------------------
export const WRITABLE_PDF_TYPES = new Set(["text", "dropdown"]);

// --- protect rules ----------------------------------------------------------
// Deny-first. Each entry names the category so a refusal explains itself.
// Ordered most-specific first only where two categories could both match; the
// reported category is the first that fires.
export const PROTECT_RULES = [
  ["money", /\$|\bfee\b|\bfees\b|\bcost[s]?\b|\bamount\b|\bbalance\b|\bpaid\b|\bpayment\b|\brestitution\b|\bfine[s]?\b|\bsurcharge\b|\bdollar|\bowed\b|\barrears\b/],
  ["race", /\brace\b|\bethnic|\bskin\b|\bcomplexion\b/],
  ["responsible_official", /responsible\s*(official|party|person)|authorized\s*(official|representative|signer)|custodian\s*of\s*record|records?\s*officer|designee/],
  // A government identifier is never a fact the platform supplies. KY AOC-334,
  // AOC-496 and AOC-496.2 each wrote the participant's full legal name into a
  // "Defendant's SSN" box, because nothing claimed the box and
  // full_legal_name's /\bdef\b/ pattern did. Jail and booking identifiers sit
  // in the same rule: they identify a person through a custodial system the
  // platform has no knowledge of, and AOC-496 put a name in one of those too.
  // The licence block, not just the licence number. NC AOC-CR-296 names the
  // issuing state DLState, and `\bstate\b` claimed it as the participant's
  // state of residence: the licence-issuing state is part of a government
  // identifier the platform has no knowledge of, and the canonical fixture
  // hid the difference only because both read "XX".
  ["government_identifier", /\bssn\b|social\s*security|\bsid\s*(no|num|#)?\b|\bfbi\s*(no|num|#)|jail\s*id|booking\s*(no|num|#|id)|\bdoc\s*(no|num|#)\b|driver\s*s?\s*licen[cs]e|\bdl\s*(no|num|#|state|st|class|exp|issuer)\b|licen[cs]e\s*(state|class|expir)/],
  ["signature", /signature|\bsigned\b|\bsign\s*here\b|^\s*sign\b|\bsig\b|\binitials?\b/],
  ["notarization", /notar|jurat|acknowledg(ed|ment)\s*before\s*me|sworn\s*to\s*before|my\s*commission\s*expires|seal\s*of\s*office/],
  // `cert date` was the hole. The rule matched the printed heading and the
  // filing_date descriptor matched /cert\s*date/, so on AK TF-800 and TF-805 a
  // field named certDate — sitting 28pt under a printed "Certificate of
  // Service" — took the platform's filing date and produced a half-completed
  // sworn certification: "I certify on 2026-08-12 at ______". A service block
  // is a statement about something a person did, so nothing in it is
  // deterministic.
  ["service_block", /certificate\s*of\s*service|proof\s*of\s*service|service\s*of\s*process|process\s*server|\bserved\s*(on|by|upon)\b|date\s*served|manner\s*of\s*service|\bcert\s*(date|time)\b|certif(y|ied|icate)\s*(on|date)/],
  ["licensing_board", /licens(e|ing)\s*(board|authority|agency)|board\s*of\s*(nursing|medicine|pharmacy|education|examiners)|professional\s*board|certification\s*board/],
  ["agency", /\bagency\b|\bsheriff\b|\bpolice\b|law\s*enforcement|\bbureau\b|state\s*patrol|\bprobation\b|\bparole\b|department\s*of\s*(public\s*safety|justice|corrections)|\bdps\b|\bsbi\b|\bacic\b|\bapsin\b|\bfbi\b/],
  ["court", /\bjudge\b|magistrate|commissioner|hearing\s*officer|referee|so\s*ordered|it\s*is\s*(hereby\s*)?ordered|ordered\s*(and\s*)?adjudged|adjudged|\bdecree\b|is\s*(hereby\s*)?(granted|denied)|court\s*use\s*only|for\s*(court|office|clerk|official)\s*use|do\s*not\s*write|\bruling\b/],
  ["clerk", /\bclerk\b|deputy\s*clerk|file\s*stamp|filed\s*stamp|filing\s*stamp|court\s*seal|scan\s*num|\bbarcode\b|entered\s*on|\bdistribution\b/],
  ["prosecutor", /prosecut|district\s*attorney|commonwealth\s*s?\s*attorney|state\s*s?\s*attorney|county\s*attorney|solicitor/],
  // `atty` is how North Carolina's AOC forms abbreviate it, and the rule
  // spelled only the long form. NC AOC-CR-288 names the attorney block
  // NameAtty / CityAtty / StateAtty / ZipCodeAtty, none of which contain
  // "attorney", so the petitioner's own name and address were written into
  // "Name And Address Of Petitioner's Attorney" — a filed petition asserting
  // the petitioner is represented by counsel who is the petitioner.
  ["attorney", /\battorney\b|\battys?\b|\bcounsel\b|\besq\b|law\s*firm|bar\s*(no|num|number)|\bvsb\b/],
  ["outside_party", /\bopposing\b|third\s*party|\bvictim\b|\bcomplainant\b|\bemployer\b|\bwitness\b|\bco-?defendant\b/],
  ["disposition_or_hearing", /\bdisposition\b|hearing\s*(date|time|result)|\bsentenc(e|ing)\b|\bconvict(ed|ion)\b|\bplea\b|\bverdict\b/]
];

// The protect categories that describe an AREA of a page rather than a box.
// A widget inside a section headed by one of these is in territory the
// participant does not complete, whatever the widget is called.
//
// The rest are deliberately absent. A "$" or a race question is a property of
// one field; a heading that mentions a fee does not make the page a fee block.
export const REGIONAL_PROTECT_CATEGORIES = new Set([
  "service_block", "notarization", "court", "clerk", "prosecutor",
  "attorney", "outside_party", "responsible_official", "licensing_board", "agency"
]);

// What a printed SECTION HEADING means, which is not the same question as what
// a field name means.
//
// NC AOC-CR-288 is the case. Page 2 prints "FINDINGS OF FACT" and under it
// "ORDER"; the fields in that band are named PetitionerIsEligibleBecauseText1
// and PetitionerIsEligibleCbx. Every one of those names is innocent, the
// petitioner's own name is in them, and the binder wrote the petitioner's name
// into the judge's findings — a filed document on which the petitioner appears
// to have made the court's findings for it.
//
// These patterns are deliberately NOT in PROTECT_RULES. "Order" as a substring
// of a field name is far too common to deny on — order of protection, birth
// order, ordered list — but a form that prints ORDER as a section heading is
// telling the reader that everything below it is the court speaking. The
// distinction is the position, so the vocabulary is separate.
export const REGION_HEADING_RULES = [
  ["court", /findings?\s*of\s*fact|conclusions?\s*of\s*law|^\s*order\b|\border\s*of\s*(the\s*)?court\b|\bjudgment\b|\bdecree\b|\bdetermination\b|to\s*be\s*completed\s*by\s*the\s*court|court\s*findings/i],
  ["clerk", /certification\s*by\s*(the\s*)?clerk|clerk\s*s?\s*certificate|entry\s*of\s*(judgment|record)/i],
  ["service_block", /certificate\s*of\s*service|proof\s*of\s*service|return\s*of\s*service/i],
  ["notarization", /acknowledg(e?ment|ed)|jurat|verification|sworn\s*statement/i]
];

/**
 * The protected category a printed section heading opens, if any.
 *
 * The heading vocabulary is tried first because it is the more specific claim,
 * and the field-name vocabulary second so a heading that names a judge or a
 * prosecutor still counts. A heading that matches neither opens no protected
 * region, which is the safe answer only because the field-name rules still run
 * independently on every binding.
 */
export function regionProtectCategoryOf(heading) {
  const text = String(heading ?? "").trim();
  if (!text) return null;
  for (const [category, pattern] of REGION_HEADING_RULES) {
    if (pattern.test(text)) return category;
  }
  const byName = protectCategoryOf(text);
  return byName && REGIONAL_PROTECT_CATEGORIES.has(byName) ? byName : null;
}

// --- allowlisted fact descriptors ------------------------------------------
// The ONLY things that may ever be written. Each declares the value type it
// carries and, where the fact is legally sensitive, that it may not bind
// without the caller naming the field explicitly.
export const FACT_DESCRIPTORS = [
  { factId: "participant.city_state_zip", valueType: "string", match: /city\s*state\s*zip/ },
  { factId: "participant.date_of_birth", valueType: "date", match: /\bdob\b|date\s*of\s*birth|birth\s*date/ },
  { factId: "participant.first_name", valueType: "string", match: /first\s*name/ },
  { factId: "participant.last_name", valueType: "string", match: /last\s*name|surname/ },
  { factId: "participant.middle_name", valueType: "string", match: /middle\s*(name|initial)/ },
  // Email precedes street address, AND street address explicitly refuses an
  // email label. "Email Address" contains "address", so with the address rule
  // first it won, and a participant's street address was written onto an email
  // line — a contact detail replaced by one that is not it, on a filed
  // document. Ordering alone would fix it today and break again the next time
  // these are sorted, so the refusal is stated as well.
  //
  // The email fact binds only to the canonical participant email. No other
  // contact value substitutes for it, and no email is ever synthesised from
  // other participant data: a missing email leaves the line blank.
  { factId: "participant.email", valueType: "string", match: /\be[-\s]?mail\b/ },
  // The alternative block, and it is tried first because its own name contains
  // the primary block's. NC AOC-CV-226 prints a second address block headed
  // "Full Permanent Mailing Address (if different than above)": the primary
  // participant facts must not be copied into it, or a sworn affidavit states
  // a second address the participant never gave. These descriptors resolve
  // their own facts, and they bind only when the caller says the alternative
  // address is genuinely different.
  { factId: "participant.mailing_street_address", valueType: "string", requiresDistinctAlternate: true,
    match: /(full\s*)?(permanent\s*)?mailing\s*address\s*(addr(ess)?)?\s*(line\s*)?\d?$|mailing\s*address\s*addr/,
    refuseWhen: /\be[-\s]?mail\b|\bcity\b|\bstate\b|\bzip\b|postal/ },
  { factId: "participant.mailing_city", valueType: "string", requiresDistinctAlternate: true, match: /mailing\s*address\s*city/ },
  { factId: "participant.mailing_state", valueType: "string", requiresDistinctAlternate: true, match: /mailing\s*address\s*state/ },
  { factId: "participant.mailing_zip", valueType: "string", requiresDistinctAlternate: true, match: /mailing\s*address\s*(zip|postal)/ },
  // The address guards, widened. `\baddress\b` matched a City box on KY
  // AOC-496.2 (Def.Address.City) and printed the street line there as well as
  // on the street line, and it matched a bank-name box on NC AOC-CV-226's
  // affidavit of indigency, where the applicant's street address was printed
  // as the name of their bank. A haystack that names a more specific slot than
  // "address" is that slot, not the street line.
  //
  // "Street Number And Street Name" is a street address written out. It
  // matched nothing at all, so NC AOC-CV-226's sworn affidavit of indigency
  // was filed with no street address anywhere on it while the participant's
  // city, state and zip were each printed twice.
  { factId: "participant.street_address", valueType: "string", match: /street\s*addr|mailing\s*addr|addr(ess)?\s*(line\s*)?\d|^\s*addr|\baddress\b|street\s*(number|name|no\b)/, refuseWhen: /\be[-\s]?mail\b|\bcity\b|\bstate\b|\bzip\b|postal|\bcounty\b|\bbank\b|\bemployer\b|\bcourt\b/ },
  { factId: "participant.city", valueType: "string", match: /\bcity\b/, refuseWhen: /\be[-\s]?mail\b|\bcourt\b|\bcounty\s*(of|or)\s*city\b|\bcity\s*(of|or)\s*county\b/ },
  { factId: "participant.zip", valueType: "string", match: /\bzip\b|postal/ },
  { factId: "participant.phone", valueType: "string", match: /\bphone\b|telephone/, refuseWhen: /\be[-\s]?mail\b/ },
  { factId: "participant.state", valueType: "string", match: /\bstate\b/ },
  { factId: "matter.county", valueType: "string", match: /\bcounty\b/ },
  { factId: "matter.court", valueType: "string", match: /court\s*name|type\s*of\s*court|judicial\s*(district|circuit)/ },
  { factId: "matter.case_number", valueType: "string", match: /case\s*(no|num|#)|docket|cause\s*(no|num)|file\s*(no|num)|case\s*id/,
    refuseWhenTrailing: /\b(addendums?|attachments?|exhibits?|pages?|copies|counts?|items?)\s+(are|is|were|was)\s+attached\b|^\s*(addendums?|attachments?|exhibits?|pages?|copies)\b/ },
  { factId: "matter.citation_number", valueType: "string", match: /citation\s*(no|num)/ },
  // full_legal_name's patterns are broad on purpose — a party token is how
  // most forms label the filer's own name — and that breadth is what put the
  // petitioner's name on NC AOC-CR-288's "Name And Address Of Petitioner's
  // Attorney" block, on AOC-CR-296's "District Attorney Name" line, in KY's
  // SSN and Jail ID boxes, and on AOC-CV-226's bank-name line. The protect
  // rules stop the attorney, prosecutor and identifier cases now; this refusal
  // stops the rest, where the haystack names a slot that is plainly not a
  // person's name.
  { factId: "participant.full_legal_name", valueType: "string", match: /printed\s*name|full\s*legal\s*name|your\s*name|\badult\s*name\b|petitioner|applicant|defendant|movant|\bdef\b|party\s*names?|case\s*name|\bname\b/, refuseWhen: /\bbank\b|\bstreet\b|\baddr(ess)?\b|\bcity\b|\bzip\b|postal|\bphone\b|telephone|\be[-\s]?mail\b|\bemployer\b|\bschool\b|\bcourt\s*name\b|type\s*of\s*court|\bcounty\b/ },
  { factId: "deterministic.filing_date", valueType: "date", match: /date\s*signed|signature\s*date|date\s*of\s*(this\s*)?(filing|signature)|today\s*s?\s*date|^\s*dated?\s*$|cert\s*date/ },
  // Legally sensitive dates. These describe the criminal event itself, and a
  // wrong value misstates the record to a court, so they never bind on a name
  // match alone -- the caller must name the field.
  { factId: "matter.arrest_date", valueType: "date", requiresExplicitMapping: true, match: /arrest\s*date|date\s*of\s*arrest/ },
  { factId: "matter.offense_date", valueType: "date", requiresExplicitMapping: true, match: /offense\s*date|date\s*of\s*offense|violation\s*date/ },
  { factId: "matter.conviction_date", valueType: "date", requiresExplicitMapping: true, match: /conviction\s*date/ },
  { factId: "matter.disposition_date", valueType: "date", requiresExplicitMapping: true, match: /disposition\s*date/ },
  { factId: "matter.charge", valueType: "string", requiresExplicitMapping: true, match: /\bcharge\b|\boffense\b|\bstatute\b|\bviolation\b|\bcount\b/ }
];

// Facts that describe one row of a charge table rather than the matter itself.
const ROW_FACTS = new Set([
  "matter.case_number", "matter.citation_number", "matter.charge",
  "matter.arrest_date", "matter.offense_date", "matter.conviction_date", "matter.disposition_date"
]);

// A caption fact is the only thing a court-issued order ever accepts.
export const CAPTION_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);

// Field names arrive as camelCase, dotted paths, PascalCase and squashed
// lowercase, so every rule is matched against a haystack holding a
// separator-normalized and a fully squashed form at once.
/**
 * Whether a measured string is text the document could actually decode.
 *
 * A caption read out of an Identity-H run with no usable /ToUnicode entry is a
 * string of glyph ids, and glyph ids are not words: NC AOC-CV-226's "Full
 * Permanent Mailing Address" arrived as codes whose Latin-1 reading contains a
 * dollar sign, the money rule matched it, and the applicant's mailing address
 * was refused as a fee. An undecodable subject can neither protect nor bind --
 * it says nothing, so it is allowed to decide nothing.
 */
export function isUndecodableText(value) {
  const text = String(value ?? "");
  if (text === "") return false;
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
}

/** The separator-normalized reading of a field name, without the squashed form. */
export function spacedName(name) {
  return String(name ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[._\-/\\]+/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * The line number a continuation field carries, or null.
 *
 * A street address printed over two lines is one address: "Addr1" holds it and
 * "Addr2" holds the rest of it, and writing the whole value into both prints
 * the participant's street twice on a filed affidavit.
 */
export function continuationLineOf(name) {
  const m = /(?:line|addr(?:ess)?|ln)\s*(\d{1,2})$/.exec(spacedName(name));
  return m ? Number(m[1]) : null;
}

export function haystack(name) {
  const raw = String(name ?? "");
  const spaced = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[._\-/\\]+/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `${spaced} || ${raw.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

// The protect categories that name a PARTY who might complete a box, as
// opposed to a kind of box nobody but the court completes.
const PARTY_PROTECT_CATEGORIES = new Set([
  "attorney", "prosecutor", "outside_party", "responsible_official", "agency", "licensing_board"
]);

const ELECTION_MARKER = /(\[\s*\]|\(\s*\)|\u2610|\u25a1)/g;
const PARTICIPANT_TOKEN = /\bpetitioner\b|\bapplicant\b|\bdefendant\b|\bmovant\b|\brespondent\b/i;

/**
 * Whether a printed caption offers the participant and somebody else as a
 * CHOICE rather than naming an owner.
 *
 * VA CC-1473 captions its contact rules "ADDRESS OF [ ] PETITIONER [ ]
 * ATTORNEY FOR PETITIONER" with both elections drawn between the words. Read
 * as a statement of ownership the word "ATTORNEY" refuses the box, and the
 * petitioner's own address comes off their own petition. The caption is not
 * making that claim: it is offering two, one of which is the participant, and
 * which one applies is the election checkbox's business -- and those are
 * classified `manual` and never ticked.
 *
 * This narrows nothing that names one owner: "SIGNATURE OF [ ] PETITIONER [ ]
 * ATTORNEY" is still a signature block, because `signature` is a kind of box
 * rather than a party.
 */
export function isElectionCaption(text) {
  const value = String(text ?? "");
  const markers = value.match(ELECTION_MARKER);
  return markers !== null && markers.length >= 2 && PARTICIPANT_TOKEN.test(value);
}

export function protectCategoryOf(name) {
  const hay = haystack(name);
  for (const [category, re] of PROTECT_RULES) if (re.test(hay)) return category;
  return null;
}

// A trailing one- or two-digit number is a row index only when it is the whole
// number. VA CC-1201 names a field `User.CaseNumber1201` after the form it is
// printed on; the lazy prefix let "1201" be read as "12" plus row "01", and
// the petition's addendum-count box was filled with the first charge's case
// number as though it were row one of a charge table.
function rowIndexOf(name) {
  const m = /^(?:.*\D)?(\d{1,2})$/.exec(String(name).trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 40 ? n - 1 : null;
}

/** The allowlisted facts one subject string matches, refusals already applied. */
export function descriptorsMatching(subject) {
  const hay = haystack(subject);
  return FACT_DESCRIPTORS.filter((d) => d.match.test(hay) && !(d.refuseWhen && d.refuseWhen.test(hay)));
}

/**
 * Decides, for one field, whether anything may be written into it.
 *
 * Returns { writable: false, reason, category? } or
 * { writable: true, factId, valueType, rowIndex? }.
 *
 * `options.explicitMappings` is a map of fieldName -> factId supplied by the
 * caller. It is the only way a `requiresExplicitMapping` descriptor can bind,
 * and it can never override a protect rule or a type guard.
 */
export function decideBinding(field, options = {}) {
  const { name, pdfType, regionHeading, regionIsDocumentTitle = false } = field;
  const {
    explicitMappings = {},
    captionOnly = false,
    availableChargeRows = 0,
    documentAcceptsFill = true,
    // Whether the caller has established that this participant's alternative
    // mailing address is genuinely different from their street address. A
    // second address block is conditional on the paper -- "if different than
    // above" -- so it is conditional here.
    alternateAddressDiffers = false
  } = options;

  if (!documentAcceptsFill) return { writable: false, reason: "document_does_not_accept_fill" };

  // A caption the document could not decode is not a caption. It is dropped
  // rather than matched, so glyph ids can neither protect a field nor bind it.
  const rawLabel = field.effectiveLabel ?? null;
  const effectiveLabel = isUndecodableText(rawLabel) ? null : rawLabel;
  const rawTrailing = field.trailingLabel ?? null;
  const trailingLabel = isUndecodableText(rawTrailing) ? null : rawTrailing;
  const labelDropped = rawLabel !== null && effectiveLabel === null;

  // The label a form prints beside a positional widget names it, but it is
  // also matched against the protect rules -- a measured label must not become
  // a way around them.
  const subject = effectiveLabel ?? name;

  let category = protectCategoryOf(subject) ?? protectCategoryOf(name);
  let electionCaptionIgnored = null;
  if (category && subject !== name && effectiveLabel && isElectionCaption(effectiveLabel)
    && PARTY_PROTECT_CATEGORIES.has(category) && protectCategoryOf(effectiveLabel) === category) {
    electionCaptionIgnored = { category, effectiveLabel };
    category = protectCategoryOf(name);
  }
  if (category) return { writable: false, reason: "protected_category", category };

  // Geometry. A widget sits inside a printed section of the page, and when
  // that section's own heading is one the protect rules name, the widget is in
  // court-owned territory whatever it is called. AK TF-800's certDate and NE
  // DC 1:15's printedname both sit under a printed "Certificate of Service"
  // and neither name says so; a platform that fills them signs and dates a
  // sworn statement about service it has no knowledge of.
  //
  // This is the channel that makes protection independent of naming: renaming
  // a protected field to something innocuous does not move it off the page.
  //
  // Two guards keep this narrow, and the canary suite put both there. Only
  // REGIONAL_PROTECT_CATEGORIES apply: those name an area of a page that
  // somebody other than the participant completes. `money`, `race` and
  // `disposition_or_hearing` describe a box, not a section, and reading them
  // as sections silenced every field on a form headed "APPLICATION TO WAIVE
  // FILING FEES". And a document's own title never protects, because a title
  // names the form rather than an area of it.
  // The heading vocabulary, not the field-name one. NC AOC-CR-288 prints
  // "FINDINGS OF FACT" over the judge's block on page 2 and the field-name
  // rules match none of it, so the region channel above -- which exists
  // precisely for this -- returned null and the petitioner's name was written
  // into the court's own findings. A heading is a different kind of claim from
  // a field name and needs its own words.
  const regionCategory = regionHeading && !regionIsDocumentTitle ? regionProtectCategoryOf(regionHeading) : null;
  if (regionCategory && REGIONAL_PROTECT_CATEGORIES.has(regionCategory)) {
    return { writable: false, reason: "protected_page_region", category: regionCategory, regionHeading };
  }

  if (!WRITABLE_PDF_TYPES.has(pdfType)) {
    return { writable: false, reason: "non_text_field_type", category: "type_guard", pdfType };
  }

  // Two channels, tried in order, and the order matters. The field NAME is
  // authored by whoever built the form and is usually the more precise of the
  // two, so it is asked first and every family whose names already work is
  // unaffected. The printed LABEL is the fallback, for forms whose names carry
  // no words at all: VT 600-00228 names its fields 2, 3, 4, 5, 5a, and with
  // only the name channel a fee-waiver application filled nothing — no name,
  // no address, no income — and said nothing about why.
  //
  // The fallback widens what can bind, never what can be written: both
  // channels have already been past the protect rules above, and the label is
  // checked against refuseWhen exactly as the name is.
  let factBasis = "field_name";
  let matches = descriptorsMatching(name);
  if (matches.length === 0 && effectiveLabel && effectiveLabel !== name) {
    matches = descriptorsMatching(effectiveLabel);
    factBasis = matches.length > 0 ? "printed_label" : factBasis;
  }
  if (matches.length === 0) return { writable: false, reason: "no_allowlisted_fact_matches" };

  // Most-specific-first ordering makes the first match the intended one; a
  // descriptor list is authored, not inferred, so ties are a defect in the
  // list rather than something to resolve at runtime.
  const descriptor = matches[0];

  // The field name and the printed caption are two claims about one box, and
  // where they disagree about WHAT KIND OF VALUE the box takes, the disagreement
  // is the finding. VA CC-1201 names a field `User.CourtName` on a rule the
  // form captions "CITY OR COUNTY" and continues "Circuit Court": the name says
  // court, the paper says locality, and the petition was filed reading
  // "District Court ... Circuit Court". Neither channel is trusted over the
  // other; the box is left alone and the conflict is reported.
  //
  // The test is whether the caption says ANYTHING that supports the name's
  // reading, not whether the caption would resolve to the same descriptor on
  // its own. NC AOC-CR-296 captions its name box "Name And Address Of
  // Defendant (type or print full name)"; that caption also names an address,
  // so resolving it alone yields the street-address descriptor -- but it says
  // "name" twice, so it does not contradict the field name and the box binds.
  //
  // Both printed channels count as support. NC's AOC forms print the county
  // blank under the heading "STATE OF NORTH CAROLINA" and follow it with the
  // word "County" on the same line, so the caption above says nothing about a
  // county and the words after the blank say exactly that.
  if (factBasis === "field_name" && effectiveLabel && effectiveLabel !== name) {
    const fromLabel = descriptorsMatching(effectiveLabel);
    const supported = descriptor.match.test(haystack(effectiveLabel))
      || (trailingLabel ? descriptor.match.test(haystack(trailingLabel)) : false);
    if (fromLabel.length > 0 && !supported) {
      return {
        writable: false,
        reason: "field_name_and_printed_caption_disagree",
        category: "channel_conflict",
        factId: descriptor.factId,
        effectiveLabel,
        trailingLabel,
        captionFactIds: fromLabel.map((d) => d.factId)
      };
    }
  }

  // What the form prints AFTER the blank, on the blank's own line, describes
  // what the blank is for. "____ addendums are attached to this petition" is a
  // count of attachments; VA CC-1201 wrote a case number there.
  if (trailingLabel && descriptor.refuseWhenTrailing && descriptor.refuseWhenTrailing.test(haystack(trailingLabel))) {
    return { writable: false, reason: "printed_words_after_the_blank_describe_a_different_value",
      category: "trailing_context", factId: descriptor.factId, trailingLabel };
  }

  // A second address block is written only when the caller has established
  // that it differs; otherwise the participant's one address stays in the one
  // block the form asks for it in.
  if (descriptor.requiresDistinctAlternate && alternateAddressDiffers !== true) {
    return { writable: false, reason: "alternate_address_block_not_established_as_different",
      category: "conditional_block", factId: descriptor.factId };
  }

  const explicit = explicitMappings[name];
  if (descriptor.requiresExplicitMapping && explicit !== descriptor.factId) {
    return { writable: false, reason: "requires_explicit_mapping", category: "sensitive_fact", factId: descriptor.factId };
  }
  if (explicit && explicit !== descriptor.factId) {
    return { writable: false, reason: "explicit_mapping_conflicts_with_field_name", category: "mapping_conflict", factId: descriptor.factId };
  }

  if (captionOnly && !CAPTION_FACTS.has(descriptor.factId)) {
    return { writable: false, reason: "court_issued_order_accepts_caption_facts_only", category: "court", factId: descriptor.factId };
  }

  // A charge table repeats one row of facts N times. Row N may only be written
  // when the caller actually supplied an Nth charge; otherwise the row is left
  // alone rather than stamped with the first charge.
  if (ROW_FACTS.has(descriptor.factId)) {
    const row = rowIndexOf(name);
    if (row !== null) {
      if (row >= availableChargeRows) {
        return { writable: false, reason: "repeating_row_without_indexed_fact", category: "charge_row", factId: descriptor.factId, rowIndex: row };
      }
      const leaf = descriptor.factId.slice("matter.".length);
      return { writable: true, factId: `matter.charges[${row}].${leaf}`, valueType: descriptor.valueType, rowIndex: row, factBasis };
    }
  }

  // A continuation line of a block whose first line already carries the fact.
  const continuation = continuationLineOf(name);
  if (continuation !== null && continuation > 1) {
    return { writable: false, reason: "continuation_line_of_a_block_written_on_its_first_line",
      category: "block_continuation", factId: descriptor.factId, lineNumber: continuation };
  }

  return { writable: true, factId: descriptor.factId, valueType: descriptor.valueType, factBasis,
    ...(labelDropped ? { labelDroppedAsUndecodable: true } : {}),
    ...(electionCaptionIgnored ? { electionCaptionIgnored } : {}) };
}

/** Confirms a resolved value matches the type its descriptor declared. */
export function valueMatchesType(value, valueType) {
  if (value === undefined || value === null) return false;
  const s = String(value);
  if (s.trim() === "") return false;
  if (valueType === "date") return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  return true;
}

/** Resolves a plain or indexed charge-row fact id against a fact set. */
export function resolveFact(facts, factId) {
  const m = /^matter\.charges\[(\d+)\]\.(.+)$/.exec(factId);
  if (!m) return facts[factId];
  return facts["matter.charges"]?.[Number(m[1])]?.[m[2]];
}

// --- one widget per slot ----------------------------------------------------
//
// A binding decision is made one field at a time, which is correct for
// deciding whether a field MAY be written and wrong for deciding whether it
// SHOULD be. Nebraska's caption band is the case that shows the difference:
// CC 6:12 carries TYPEOFCOURTRESULTS, TYPEOFCOURTDROPDOWN and a field named
// "enter the type of court", all three overlapping between x 138 and x 242,
// and all three legitimately matching matter.court. Each decision was right on
// its own and the page rendered "District Court" twice, about 5pt apart, over
// the court's own printed caption words.
//
// So this is a second pass over the decisions, not a change to any of them: a
// fact that has already been allowed is placed once per slot.
//
// A slot is a group of widgets on one page that overlap each other and carry
// the same fact. Overlap is the whole test — two widgets that do not overlap
// are two places the form means the value to appear, and a form that prints a
// name in the caption and again above the signature line is not defective.

const CHOICE_PDF_TYPES = new Set(["dropdown", "optionlist"]);

const rectsOverlap = (a, b) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0 &&
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0;

/**
 * Ranks two widgets competing for one slot. Lower sorts first and wins.
 *
 * The ordering is stated rather than discovered, because an arbitrary winner
 * is an unreviewable one:
 *
 *   1. a text field beats a choice field. A dropdown renders from an
 *      appearance stream the source document authored, and the source's is
 *      what carries "Choose the court";
 *   2. the larger box beats the smaller. The bigger widget is the one the form
 *      means to be read;
 *   3. then topmost, then leftmost, then the name, so the result does not
 *      depend on the order the fields happen to arrive in.
 */
function slotRank(a, b) {
  const choice = (w) => (CHOICE_PDF_TYPES.has(w.pdfType) ? 1 : 0);
  if (choice(a) !== choice(b)) return choice(a) - choice(b);
  const area = (w) => (w.rect ? w.rect.width * w.rect.height : 0);
  if (area(a) !== area(b)) return area(b) - area(a);
  if (a.rect && b.rect && a.rect.y !== b.rect.y) return b.rect.y - a.rect.y;
  if (a.rect && b.rect && a.rect.x !== b.rect.x) return a.rect.x - b.rect.x;
  return String(a.name).localeCompare(String(b.name));
}

/**
 * Reduces already-writable candidates to one widget per slot.
 *
 * `candidates` is [{ name, factId, pdfType, page, rect }]. Returns
 * { kept, refused } where every input appears in exactly one of them, so the
 * count is conserved and a family map still accounts for every field.
 *
 * A candidate with no page or no rectangle is kept untouched: without geometry
 * there is no way to tell whether it collides with anything, and refusing on
 * an absence would drop bindings that are fine.
 */
export function selectOnePerSlot(candidates) {
  const kept = [];
  const refused = [];
  const grouped = new Map();

  for (const candidate of candidates) {
    if (!candidate.rect || !candidate.page) { kept.push(candidate); continue; }
    const key = `${candidate.page}::${candidate.factId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(candidate);
  }

  for (const group of grouped.values()) {
    // Slots are built by transitive overlap: A overlapping B and B overlapping
    // C is one slot, even where A and C do not touch. Three widgets stacked
    // down a caption band are one place on the paper.
    const slots = [];
    for (const candidate of group) {
      const touching = slots.filter((slot) => slot.some((m) => rectsOverlap(m.rect, candidate.rect)));
      if (touching.length === 0) { slots.push([candidate]); continue; }
      const merged = touching.flat().concat(candidate);
      for (const slot of touching) slots.splice(slots.indexOf(slot), 1);
      slots.push(merged);
    }
    for (const slot of slots) {
      if (slot.length === 1) { kept.push(slot[0]); continue; }
      const ordered = [...slot].sort(slotRank);
      const winner = ordered[0];
      kept.push(winner);
      for (const loser of ordered.slice(1)) {
        refused.push({
          ...loser,
          reason: "duplicate_widget_for_one_slot",
          category: "caption_slot",
          keptInstead: winner.name,
          overlapsWith: slot.filter((m) => m.name !== loser.name).map((m) => m.name)
        });
      }
    }
  }

  return { kept, refused };
}

/**
 * Whether a choice field's current value is the source document's own chooser
 * prompt rather than a selection.
 *
 * Nebraska's dropdowns ship selected on "Choose the court" and "Choose the
 * county". Left alone through a flatten those strings are drawn onto the page
 * as ordinary ink, and a filed pleading tells the court to choose one.
 */
export function isChooserPrompt(value, options = []) {
  const text = String(value ?? "").trim();
  if (text === "") return false;
  if (/^[\s_\-–—.·•]+$/.test(text)) return true;
  if (/^(--+|choose|select|pick|click|please\s+(choose|select|pick)|enter\s+the)\b/i.test(text)) return true;
  // A value that is the first option of a list it does not otherwise resemble
  // is the list's own placeholder: forms put the prompt in slot zero.
  return options.length > 1 && String(options[0]).trim() === text && /\b(choose|select|pick|none)\b/i.test(text);
}
