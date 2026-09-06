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
  // The driver's-licence cluster is a cluster, not one field. NC AOC-CR-296
  // names its columns DLNo, DLState and DLExpires; only DLNo matched, so
  // `DLState` took participant.state and the canonical fixture printed the
  // applicant's residence state in the Drivers License State column. The state
  // that issued a licence and the state someone lives in are different facts,
  // and the field prints no caption, so nothing but its name could refuse it.
  // The fingerprint number is the same class of thing and was missing. Oregon's
  // set-aside packet prints "Fingerprint number (FPN #) if known" on both the
  // instructions and the motion, and neither the SID pattern nor the FBI one
  // reached it: the FPN is assigned by the state police when a card is
  // processed, so it is theirs to state and never the platform's to supply.
  // Nothing bound it before this, so protecting it can only refuse writes that
  // were already impossible -- but "nothing happens to match it" is not the same
  // guarantee as "it is refused".
  //
  // That last sentence is why the spelling list keeps growing, and four
  // spellings were still outside it. Forms do not agree on how to write this.
  // NC AOC-CR-288 and AOC-CR-287 name the box `SNN` -- a transposition, on the
  // form itself, of the one abbreviation the rule did match. WV SCA-C906 names
  // it `PetSocSecno`, which is the abbreviation of the abbreviation and reaches
  // neither `ssn` nor `social security`. IN CCA-XP-0220-7009 collects aliases,
  // dates of birth and numbers in one box named `AliasNamesDOBsSSNs`, where the
  // plural puts a letter after the `n` and the word-boundary anchor stops
  // matching. Each of the four is an identifier blank on an official form that
  // identifier protection was silently not covering.
  //
  // The widening is deny-only and its blast radius was measured before it
  // landed: across 10,084 distinct field names in 520 committed field maps,
  // exactly these four names change category and nothing else does, and none of
  // the four carries a written value in any family, so no packet byte moves.
  // The families holding them were each held by another writer at the time, so
  // the rebuild that records the refusal belongs to that writer and not here.
  ["government_identifier", /\bssn\b|ssns|\bsnn\b|soc\s*sec|social\s*security|\bsid\s*(no|num|#)?\b|\bfbi\s*(no|num|#)|\bfpn\b|finger\s*print\s*(number|no|#)|jail\s*id|booking\s*(no|num|#|id)|\bdoc\s*(no|num|#)\b|driver\s*s?\s*licen[cs]e|\bdl\s*(no|num|#)\b|\bdl\s*(state|exp|expires|expiration|class|type|issued)\b|licen[cs]e\s*(state|class|expires|expiration)/],
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
  // The records-custody clause is the second half of this rule and it earns its
  // place on KY AOC-334. The form prints "The Kentucky State Police and other
  // following agencies listed below are hereby ordered to seal any records in
  // their custody regarding the above-named Defendant and above-listed
  // charge(s): ____". The slot lists the AGENCIES the court is ordering. The
  // caption harvester reached it as the tail fragment "their custody regarding
  // the above-named Defendant and above-", which contains the word "Defendant"
  // and no word this rule knew — so full_legal_name claimed it and the
  // petitioner's name was filed as the list of agencies ordered to seal.
  // Matching the directive rather than the agency names closes it wherever the
  // caption is truncated.
  ["agency", /\bagency\b|\bagencies\b|\bsheriff\b|\bpolice\b|law\s*enforcement|\bbureau\b|state\s*patrol|\bprobation\b|\bparole\b|department\s*of\s*(public\s*safety|justice|corrections)|\bdps\b|\bsbi\b|\bacic\b|\bapsin\b|\bfbi\b|records?\s*in\s*(their|our|its)\s*custody|\bcustody\s*regarding\b|ordered\s*to\s*seal|records?\s*custodian/],
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
// A second address block is not a second address.
//
// NC AOC-CV-226 prints "Full Permanent Mailing Address Of Applicant (if
// different than above)". It is conditional by its own printed words: it is
// completed only when the applicant's mailing address differs from the one
// already given. Writing the same street, city, state and ZIP into both blocks
// files an affidavit asserting the two are different and then showing them
// identical. The platform holds one address, so it fills one block.
export const ALTERNATE_BLOCK = /\bif\s*different\b|\bif\s*other\s*than\b|\bif\s*not\s*the\s*same\b|\bother\s*than\s*above\b|\bif\s*changed\b/;

/**
 * Vocabulary for the thing a criminal-record form asks a filer to describe: the
 * charge itself. `statute` and `violation` are here because a form that asks for
 * "the statute violated" is asking the same question in other words.
 */
export const CHARGE_VALUE_WORDS = /\b(charges?|offen[cs]es?|counts?|statutes?|violations?)\b/i;

/**
 * Constructions that ASK for a person's name.
 *
 * The distinction this draws is grammatical rather than lexical. "Defendant" as
 * a bare caption labels the blank and means the defendant's name goes in it.
 * The same word inside a sentence -- "the defendant was convicted of the
 * offense(s) of ______" -- is the subject of a clause, and what the blank holds
 * is the offence at the end of it. So a party word alone does not make a caption
 * a name caption; a construction that actually requests a name does.
 */
export const ASKS_FOR_A_PERSONS_NAME =
  /\b(?:printed?|typed|full\s*legal|your|party|case|first|last|middle|maiden|legal)\s+names?\b/i.source
  + "|" + /\bnames?\s+(?:and\s+\w+\s+)?of\s+(?:the\s+)?(?:defendant|petitioner|applicant|movant|respondent|plaintiff|person|individual|party|filer|affiant|declarant)\b/i.source
  + "|" + /\b(?:defendant|petitioner|applicant|movant|respondent|plaintiff|person|individual|party|filer|affiant|declarant)['\u2019]?s?\s+names?\b/i.source
  + "|" + /\bnames?\s*\(\s*(?:printed|typed)/i.source;
const ASKS_FOR_A_PERSONS_NAME_RE = new RegExp(ASKS_FOR_A_PERSONS_NAME, "i");

/**
 * True when a caption presents a charge, offence, count, statute or violation as
 * the thing the blank holds, rather than as something a person is described in
 * relation to.
 *
 * Why it exists: `participant.full_legal_name` matches a bare `\bname\b` and
 * every party word, deliberately, because that is how most forms label the
 * filer's own name. The cost is that a caption which merely CONTAINS one of
 * those tokens can claim the blank. Eleven committed captions did -- Arkansas's
 * "2.The defendant was convicted of the offense(s) of", Kentucky's "regarding
 * the above-named Defendant and offense(s): ______", North Carolina's "3. (if
 * the defendant was charged with multiple offenses..." among them -- and in each
 * one the participant's own name would have been written where their offence
 * belongs.
 *
 * It subsumes the earlier Oregon-specific refusal, which was anchored to the
 * whole caption ("Name of Charges", "Name of Citation/Arrest Offenses") and so
 * could not reach a sentence. Those two headings still refuse here, through the
 * same rule as the rest, rather than through a second one kept beside it.
 *
 * It is NOT "contains a party word and an offence word". A caption that asks for
 * a name keeps binding the name, however much it also says about the offence:
 * "Name of Defendant charged with the offense" is a name blank and stays one.
 */
export function captionDescribesChargeValue(subject) {
  const text = String(subject ?? "");
  if (!CHARGE_VALUE_WORDS.test(text)) return false;
  return !ASKS_FOR_A_PERSONS_NAME_RE.test(text);
}

export const FACT_DESCRIPTORS = [
  { factId: "participant.city_state_zip", valueType: "string", match: /city\s*state\s*zip/, refuseWhen: /\bif\s*different\b|\bif\s*other\s*than\b|\bif\s*not\s*the\s*same\b|\bother\s*than\s*above\b|\bif\s*changed\b/ },
  { factId: "participant.date_of_birth", valueType: "date", match: /\bdob\b|date\s*of\s*birth|birth\s*date/ },
  { factId: "participant.first_name", valueType: "string", match: /first\s*name/, refuseWhenCaption: captionAsksForEveryNamePart },
  { factId: "participant.last_name", valueType: "string", match: /last\s*name|surname/, refuseWhenCaption: captionAsksForEveryNamePart },
  { factId: "participant.middle_name", valueType: "string", match: /middle\s*(name|initial)/, refuseWhenCaption: captionAsksForEveryNamePart },
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
  // The address guards, widened. `\baddress\b` matched a City box on KY
  // AOC-496.2 (Def.Address.City) and printed the street line there as well as
  // on the street line, and it matched a bank-name box on NC AOC-CV-226's
  // affidavit of indigency, where the applicant's street address was printed
  // as the name of their bank. A haystack that names a more specific slot than
  // "address" is that slot, not the street line.
  { factId: "participant.street_address", valueType: "string", match: /street\s*addr|mailing\s*addr|addr(ess)?\s*(line\s*)?\d|^\s*addr|\baddress\b/, refuseWhen: /\be[-\s]?mail\b|\bcity\b|\bstate\b|\bzip\b|postal|\bcounty\b|\bbank\b|\bemployer\b|\bcourt\b|\bif\s*different\b|\bif\s*other\s*than\b|\bif\s*not\s*the\s*same\b|\bother\s*than\s*above\b|\bif\s*changed\b/ },
  { factId: "participant.city", valueType: "string", match: /\bcity\b/, refuseWhen: /\be[-\s]?mail\b|\bcourt\b|\bcounty\s*(of|or)\s*city\b|\bif\s*different\b|\bif\s*other\s*than\b|\bif\s*not\s*the\s*same\b|\bother\s*than\s*above\b|\bif\s*changed\b/ },
  { factId: "participant.zip", valueType: "string", match: /\bzip\b|postal/, refuseWhen: /\bif\s*different\b|\bif\s*other\s*than\b|\bif\s*not\s*the\s*same\b|\bother\s*than\s*above\b|\bif\s*changed\b/ },
  { factId: "participant.phone", valueType: "string", match: /\bphone\b|telephone/, refuseWhen: /\be[-\s]?mail\b/ },
  { factId: "participant.state", valueType: "string", match: /\bstate\b/, refuseWhen: /\bif\s*different\b|\bif\s*other\s*than\b|\bif\s*not\s*the\s*same\b|\bother\s*than\s*above\b|\bif\s*changed\b/ },
  { factId: "matter.county", valueType: "string", match: /\bcounty\b/ },
  { factId: "matter.court", valueType: "string", match: /court\s*name|type\s*of\s*court|judicial\s*(district|circuit)/ },
  { factId: "matter.case_number", valueType: "string", match: /case\s*(no|num|#)|docket|cause\s*(no|num)|file\s*(no|num)|case\s*id/ },
  { factId: "matter.citation_number", valueType: "string", match: /citation\s*(no|num)/ },
  // full_legal_name's patterns are broad on purpose — a party token is how
  // most forms label the filer's own name — and that breadth is what put the
  // petitioner's name on NC AOC-CR-288's "Name And Address Of Petitioner's
  // Attorney" block, on AOC-CR-296's "District Attorney Name" line, in KY's
  // SSN and Jail ID boxes, and on AOC-CV-226's bank-name line. The protect
  // rules stop the attorney, prosecutor and identifier cases now; this refusal
  // stops the rest, where the haystack names a slot that is plainly not a
  // person's name.
  // `refuseWhenCaption` is the charge-value predicate above. It replaces an
  // earlier clause anchored to the whole caption, which caught Oregon's two
  // table headings and by design could not reach a sentence; the predicate
  // catches both, so there is one rule here rather than two overlapping ones.
  { factId: "participant.full_legal_name", valueType: "string", match: /printed\s*name|full\s*legal\s*name|your\s*name|petitioner|applicant|defendant|movant|\bdef\b|party\s*names?|case\s*name|\bname\b/, refuseWhen: /\bbank\b|\bstreet\b|\baddr(ess)?\b|\bcity\b|\bzip\b|postal|\bphone\b|telephone|\be[-\s]?mail\b|\bemployer\b|\bschool\b|\bcourt\s*name\b|type\s*of\s*court|\bcounty\b/, refuseWhenCaption: captionDescribesChargeValue },
  { factId: "deterministic.filing_date", valueType: "date", match: /date\s*signed|signature\s*date|date\s*of\s*(this\s*)?(filing|signature)|today\s*s?\s*date|^\s*dated?\s*$|cert\s*date/ },
  // Legally sensitive dates. These describe the criminal event itself, and a
  // wrong value misstates the record to a court, so they never bind on a name
  // match alone -- the caller must name the field.
  { factId: "matter.arrest_date", valueType: "date", requiresExplicitMapping: true, match: /arrest\s*date|date\s*of\s*arrest/ },
  { factId: "matter.offense_date", valueType: "date", requiresExplicitMapping: true, match: /offense\s*date|date\s*of\s*offense|violation\s*date/ },
  { factId: "matter.conviction_date", valueType: "date", requiresExplicitMapping: true, match: /conviction\s*date/ },
  { factId: "matter.disposition_date", valueType: "date", requiresExplicitMapping: true, match: /disposition\s*date/ },
  { factId: "matter.charge", valueType: "string", requiresExplicitMapping: true, match: /\bcharge\b|\boffense\b|\bstatute\b|\bviolation\b|\bcount\b/ },
  // The agency a movant states cited or arrested them. Deliberately the whole
  // printed caption rather than a word: "agency" on its own is protected, and
  // must stay protected, because a slot listing the agencies a court orders to
  // seal is not the participant's to fill. This binds one caption, and only
  // when a caller names the fact for it.
  { factId: "matter.citing_or_arresting_agency", valueType: "string", requiresExplicitMapping: true, match: /citing\s*\/?\s*arresting\s+law\s+enforcement\s+agency/ }
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
export function normalizedFieldWords(name) {
  return String(name ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[._\-/\\]+/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function haystack(name) {
  const raw = String(name ?? "");
  return `${normalizedFieldWords(raw)} || ${raw.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

/**
 * A field whose NAME is, by itself, one component of a date.
 *
 * Matched against the whole normalized name and nothing less: `day`, `month`,
 * `year`, optionally carrying the index a form adds when it repeats the trio
 * ("Day 01", "MONTH 2", "Year_3"). A name that says anything else -- `birthday`,
 * `dayphone`, `year of conviction` -- is not this, and is left to the ordinary
 * rules.
 *
 * The point is that such a name is not silent. The printed-label fallback below
 * exists for widgets whose names carry no words at all; a widget named `MONTH`
 * has already said what it holds, and what it holds is one third of a date.
 */
export const DATE_COMPONENT_FIELD_NAME = /^(?:day|month|year)(?:\s+\d{1,2})?$/;
export function isDateComponentFieldName(name) {
  return DATE_COMPONENT_FIELD_NAME.test(normalizedFieldWords(name));
}

/**
 * True when a caption names every part of a person's name at once.
 *
 * Arkansas's ACIC forms print the defendant caption blank and name the field
 * "First Middle and Last name"; Alabama SBI Form 46 prints "Full Name (First,
 * Middle, Last, Suffix)". A caption that enumerates the parts is asking for the
 * assembled whole, and `participant.full_legal_name` is the fact that carries
 * it.
 *
 * What went wrong without this: `participant.last_name` matches /last\s*name/,
 * which the trailing two words of "First Middle and Last name" satisfy, and
 * last_name is ordered ahead of full_legal_name in FACT_DESCRIPTORS. The
 * most-specific-first rule therefore selected the surname, and nineteen
 * committed captions asking for a defendant's whole name resolved to "Reyes".
 *
 * It is deliberately a conjunction of all three parts plus the word "name". Two
 * parts are not enough: "First and Last Name" is a form that genuinely wants
 * only those, and a caption naming one part is that part.
 */
export const NAME_PART_WORDS = [/\bfirst\b/, /\bmiddle\b/, /\blast\b/];
export function captionAsksForEveryNamePart(subject, hay = haystack(subject)) {
  if (!/\bnames?\b/.test(hay)) return false;
  return NAME_PART_WORDS.every((re) => re.test(hay));
}

/**
 * Captions where the protected word is the SUBJECT of the answer rather than
 * the owner of the blank.
 *
 * The `agency` rule exists because a slot that lists the agencies a court is
 * ordering to seal is not the participant's to fill; KY AOC-334 proved that by
 * printing the petitioner's name as the list of agencies ordered. But Oregon's
 * set-aside motion prints "Citing/arresting law enforcement agency: ______" and
 * then, under the blank, "(Example: Salem Police Dept. or Coos County Sheriff)".
 * That is the court instructing the movant to name the agency. Refusing it
 * leaves a required allegation of the motion blank.
 *
 * So this is not a way around a protect rule and must never become one. Each
 * entry names ONE printed caption, matched as that caption, and exempts only
 * the categories it lists. The KY directive caption ("records in their custody",
 * "ordered to seal") matches nothing here and stays refused.
 */
export const PARTICIPANT_STATED_SUBJECT = [
  {
    id: "al_cr65_participant_charge",
    match: /^(?:charge or conviction to be expunged|criminal charge or conviction from the record to be considered) \|\|/,
    exempts: ["disposition_or_hearing"],
    because: "CR-65 Rev. 10/2024 pages 1 and 5 ask the petitioner to identify the charge being petitioned; these are not a court finding or disposition entry."
  },
  {
    id: "al_cr65_participant_arresting_agency",
    match: /^(?:the agency or department that made the arrest|3 the agency or department that made the arrest [12]) \|\|/,
    exempts: ["agency"],
    because: "CR-65 Rev. 10/2024 page 5 item 3 expressly asks the petitioner to name the agency that made the arrest; it is not an agency certification or court order."
  },
  {
    id: "al_cr65_participant_detention_agency",
    match: /^any agency or department where the petitioner was booked or was incarcerated or detained pursuant to the arrest or charge sought to be expunged \|\|/,
    exempts: ["agency"],
    because: "CR-65 Rev. 10/2024 page 5 item 4 requires the petitioner to identify every booking or detention record holder, or state that no booking or detention occurred."
  },
  {
    id: "al_cr65_participant_pro_se_choice",
    match: /^pro se \(not represented by an attorney\) \|\|/,
    exempts: ["attorney"],
    because: "CR-65 Rev. 10/2024 page 6 asks the petitioner whether they are pro se. Only an explicit held participant answer may settle this checkbox; the attorney block stays protected."
  },
  {
    id: "al_c10_participant_expungement_fee_request",
    match: /^i, because of financial hardship, am unable to pay the expungement petition administrative filing fee and request that these fees be waived \|\|/,
    exempts: ["money"],
    because: "C-10-CRIMINAL Rev. 5/2024 page 1 asks for the participant's financial-hardship fee-waiver request. It does not decide indigency, waive a fee, or fill the court's page-3 findings."
  },
  {
    id: "or_ojd_set_aside_citing_or_arresting_agency",
    // The exact printed caption, tolerant only of how it is spaced.
    match: /citing\s*\/?\s*arresting\s+law\s+enforcement\s+agency/,
    exempts: ["agency"],
    because:
      "The Oregon OJD set-aside motion asks the movant to name the agency that cited or arrested them, "
      + "and prints an example under the blank. The agency does not complete it; the participant alleges it."
  }
];

/** The categories one caption is exempt from, because it states rather than owns. */
export function statedSubjectExemptions(name) {
  const hay = haystack(name);
  const out = new Set();
  for (const rule of PARTICIPANT_STATED_SUBJECT) {
    if (rule.match.test(hay)) for (const c of rule.exempts) out.add(c);
  }
  return out;
}

export function protectCategoryOf(name) {
  const hay = haystack(name);
  const exempt = statedSubjectExemptions(name);
  for (const [category, re] of PROTECT_RULES) {
    if (exempt.has(category)) continue;
    if (re.test(hay)) return category;
  }
  return null;
}

function rowIndexOf(name) {
  const m = /^(.*?)(\d{1,2})$/.exec(String(name).trim());
  if (!m) return null;
  const n = Number(m[2]);
  return n >= 1 && n <= 40 ? n - 1 : null;
}

/** The allowlisted facts one subject string matches, refusals already applied. */
export function descriptorsMatching(subject) {
  const hay = haystack(subject);
  // Two refusal channels. `refuseWhen` reads the haystack, which is normalised
  // for token matching; `refuseWhenCaption` reads the caption as printed,
  // because the rules that need it are about how a sentence is built and the
  // haystack has already flattened the punctuation those rules turn on.
  return FACT_DESCRIPTORS.filter((d) => d.match.test(hay)
    && !(d.refuseWhen && d.refuseWhen.test(hay))
    && !(d.refuseWhenCaption && d.refuseWhenCaption(subject, hay)));
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
  const { name, pdfType, effectiveLabel, regionHeading, regionIsDocumentTitle = false } = field;
  const {
    explicitMappings = {},
    captionOnly = false,
    availableChargeRows = 0,
    documentAcceptsFill = true
  } = options;

  if (!documentAcceptsFill) return { writable: false, reason: "document_does_not_accept_fill" };

  // The label a form prints beside a positional widget names it, but it is
  // also matched against the protect rules -- a measured label must not become
  // a way around them.
  const subject = effectiveLabel ?? name;

  const category = protectCategoryOf(subject) ?? protectCategoryOf(name);
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
  // A date component is excluded from the fallback entirely, whatever the label
  // offers. Arkansas's ACIC petition names three blanks DAY, MONTH and YEAR and
  // prints "1.The Defendant was arrested on the ___ day of ______, ____" across
  // them. None of the three names matches a descriptor, so the label decided,
  // and the harvested sentence says "Defendant" -- so the participant's own name
  // bound to the month of their arrest, and the canonical fixture read "arrested
  // on the ___ day of Jordan Avery Reyes". Twenty-nine committed blanks across
  // the corpus bound the name that way.
  //
  // The refusal is anchored to the NAME rather than to the caption because the
  // caption is not trustworthy here and does not need to be: on this same form
  // MONTH harvested the wrong sentence altogether and YEAR harvested the digit
  // "1". A rule reading those would be reasoning from noise. The name is the
  // reliable signal in this class, and it is sufficient -- a widget that says it
  // is a day, a month or a year holds one component of a date, and the platform
  // has no day, month or year fact to put there.
  //
  // This does not bind anything new and cannot: it only withholds the fallback,
  // so a date component with a silent name reports `no_allowlisted_fact_matches`
  // exactly as it would have had its label matched nothing at all.
  if (matches.length === 0 && effectiveLabel && effectiveLabel !== name && !isDateComponentFieldName(name)) {
    // The label is a fallback for a field whose own name says nothing, and it
    // must not reintroduce a fact the NAME already rules out. Arkansas ACIC's
    // order to seal is the case: the blank is named "and charged with the
    // offenses of" and the sentence printed above it reads "1.The Defendant was
    // arrested on the day of". The name says an offence goes in the blank; the
    // label says "Defendant"; so the label won, and the participant's own name
    // was written as the offences they were charged with.
    matches = descriptorsMatching(effectiveLabel)
      .filter((d) => !(d.refuseWhenCaption && d.refuseWhenCaption(name, haystack(name))));
    factBasis = matches.length > 0 ? "printed_label" : factBasis;
  }
  if (matches.length === 0) return { writable: false, reason: "no_allowlisted_fact_matches" };

  // Most-specific-first ordering makes the first match the intended one; a
  // descriptor list is authored, not inferred, so ties are a defect in the
  // list rather than something to resolve at runtime.
  const descriptor = matches[0];

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

  return { writable: true, factId: descriptor.factId, valueType: descriptor.valueType, factBasis };
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
