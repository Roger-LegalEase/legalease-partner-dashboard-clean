// The shared packet-completeness contract.
//
// WHAT THE OLD PASS DEFINITION PROVED, AND WHAT IT DID NOT
//
// The build verifiers proved that every write was correct: bound to exact source
// bytes, inside a measured box, not on a protected field. Every one of those
// checks asks about the writes that were MADE. None asks about the writes that
// were OWED.
//
// So a family could be classified PASS having written six fields out of a
// hundred and eighty-seven. CR-180 did: it wrote the case number and the
// defendant's name, and left every offence row -- code, section, offence type,
// and both statutory eligibility elections, five rows of them -- entirely blank,
// under the reason "No allowlisted, source-supported fact is offered to this
// terminal field." That sentence describes the build's allowlist. It is not a
// justification for a blank on a filing.
//
// This contract closes that by inverting the question. Every blank must earn its
// blankness against a CLOSED vocabulary, and three of the nine dispositions are
// defects. A free-text reason is not an approved reason: prose that states what
// the build does ("agency fields are never prefilled by this build") classifies
// as KNOWN_FACT_NOT_WRITTEN, because the arresting agency is a case fact the
// platform holds or must collect, and declaring a policy does not make the
// filing complete.

/**
 * REQUIRED_BEFORE_FILING is the one disposition a build must DECLARE.
 *
 * It was in the vocabulary from the first version of this contract and no path
 * through classifyBlank returned it, so a genuinely unavailable participant fact
 * was always counted as KNOWN_FACT_NOT_WRITTEN even when the family classified
 * it, disclosed it and told the participant to supply it. That is the same
 * failure this contract was written to catch, inverted: a disposition that
 * exists in the vocabulary and is unreachable proves nothing, and a family doing
 * the right thing failed for it.
 *
 * The disposition is now reachable, and only through an explicit declaration on
 * the field-map row. It is never inferred from prose: a reason that says "this
 * must be supplied before filing" is a sentence, and a sentence is what the
 * policy-shaped reasons above already taught us not to accept. Every condition
 * below must hold, and each one is a way the declaration could otherwise be used
 * to excuse a blank that is not excusable.
 */
export const REQUIRED_BEFORE_FILING_CONDITIONS = [
  "DECLARED: the field-map row sets requiredBeforeFiling explicitly. Prose is never enough and is never read for it.",
  "IDENTIFIED: the row names the field and carries a printed label, so the packet can tell the participant which blank to fill.",
  "GENUINELY UNAVAILABLE: the platform holds no value for the fact. A fact written anywhere else in the same packet is available, and refusing it here is a missing known fact.",
  "PARTICIPANT-COMPLETABLE: the field is one the participant may fill. A protected, court-completed or attorney-only field is not required-before-filing; it is not theirs to fill at all.",
  "NOT ROUTE-DETERMINED: an election the route determines may never be required-before-filing. A packet built for one statutory route must state which route it is, rather than asking the participant.",
  "DISCLOSED: the item is named in the packet's participant-instructions.md. Without the disclosure the blank is a required fact nobody was asked for, which is what requiredFactsNotCollected counts."
];

/**
 * The conditions a declared NOT_APPLICABLE_ON_THIS_ROUTE must meet.
 *
 * BLANK_DISPOSITIONS has always said this disposition "requires a named route
 * condition, not a general statement that the build does not fill it", and
 * until now nothing could supply one: classifyBlank accepted the name as in
 * vocabulary and then fell through to class inference and the APPROVED_REASONS
 * prose table, whose only routes to this disposition are the attorney-only and
 * viewer-control patterns. So a packet whose route genuinely does not reach a
 * blank had two options, and both were wrong: word a refusal until it matched
 * one of those regexes, or leave the blank unclassified and carry the counter.
 *
 * Three New Mexico families measured it first hand -- Form 4-960.1 NMRA carries
 * four service blocks, twenty blanks, and on the identity-theft track Rule
 * 1-077.1(E) serves nobody -- and a Maryland builder had already written the
 * same finding into a comment. The gate below is the declared channel those
 * families needed, on the terms the disposition already stated.
 */
export const NOT_APPLICABLE_CONDITIONS = [
  "DECLARED: the field-map row states the disposition. Prose is never read for it.",
  "NAMED: the row carries routeConditionThatMakesItInapplicable, naming the branch of the form, the rule, or the route fact that puts this blank outside the route. A statement that the build does not fill it is not a route condition.",
  "GENUINELY UNREACHED: the packet holds no value for the fact and writes none elsewhere. A fact the packet writes on another component is reached by this route.",
  "NOT ROUTE-DETERMINED-AND-UNMADE: a route election this route DOES use may never be inapplicable. Declaring both routeDetermined and this disposition is a contradiction and refuses."
];

/** Field requirements a participant may complete themselves. */
export const PARTICIPANT_COMPLETABLE_REQUIREMENTS = new Set([
  "REQUIRED_KNOWN", "OPTIONAL_OR_REQUIRED_BEFORE_FILING", "UNKNOWN"
]);

/** Every blank on a rendered packet resolves to exactly one of these. */
export const BLANK_DISPOSITIONS = {
  NON_FILING_SOURCE_ELEMENT: {
    allowed: true,
    meaning: "An exact-source instruction example, viewer control or caption presentation, not a separate participant filing blank.",
    requires: "Source census evidence verified by the reader; any caption companion must still be completed or disclosed."
  },
  MATERIALIZED_SOURCE_CONTROL: {
    allowed: true,
    meaning: "A source screen control whose held value is already printed by its source-bound companion field.",
    requires: "The same fact, document, exact source and current printable artifact write in every fixture."
  },
  PROTECTED_FIELD: {
    allowed: true,
    meaning: "The field must remain blank. A participant signature, a signature date, a certificate of mailing before mailing has happened, or a court-only or prosecutor-only field.",
    requires: "The field's role or label matches a protected pattern."
  },
  LATER_COMPLETION: {
    allowed: true,
    meaning: "The field is completed at or after filing, by the court or the clerk: an assigned case number, a filing stamp, a hearing date the court sets.",
    requires: "A named later-completion trigger."
  },
  NOT_APPLICABLE_ON_THIS_ROUTE: {
    allowed: true,
    meaning: "The field belongs to a branch of the form this route does not use.",
    requires: "A named route condition, not a general statement that the build does not fill it.",
    declaredOnly: true,
    conditions: NOT_APPLICABLE_CONDITIONS
  },
  REQUIRED_BEFORE_FILING: {
    allowed: true,
    meaning: "A required fact the platform does not hold. The blank is permitted only because the packet tells the participant it must be supplied before filing.",
    requires: "The fact is surfaced to the participant as a required-before-filing item.",
    declaredOnly: true,
    conditions: REQUIRED_BEFORE_FILING_CONDITIONS
  },
  PARTICIPANT_ELECTION_GENUINE: {
    allowed: true,
    meaning: "A choice only the participant can make, and one the route does not determine.",
    requires: "The election is not implied by the route the packet was built for."
  },
  OPTIONAL_PARTICIPANT_CONTENT: {
    allowed: true,
    meaning: "The form marks the field optional and the participant supplies it if they wish.",
    requires: "The field's own label says optional."
  },
  KNOWN_FACT_NOT_WRITTEN: {
    allowed: false,
    defectClass: "FAIL_MISSING_REQUIRED_FACTS",
    meaning: "A participant or case fact the platform holds, or must collect and did not, left blank on the filing."
  },
  ROUTE_OPTION_NOT_SELECTED: {
    allowed: false,
    defectClass: "FAIL_ROUTE_SELECTION",
    meaning: "An election the route determines, left for the participant. A petition built for one statutory route must state which route it is."
  },
  UNCLASSIFIED_BLANK: {
    allowed: false,
    defectClass: "FAIL_MISSING_PREFILLS",
    meaning: "A blank with no approved reason. The old field maps carried free prose; prose is not a disposition."
  }
};

/**
 * What a field is, decided from its label rather than its per-state field name.
 *
 * Field names differ on every form -- CR-180[0].Page1[0].P1Caption[0] on one and
 * a measured rule id on another -- so the label is the only surface that is
 * comparable across 43 families. The patterns are deliberately narrow: a label
 * that matches nothing is UNKNOWN and its blank is UNCLASSIFIED, which is a
 * defect, because a field nobody can classify is exactly the one that goes
 * missing.
 */
export const FIELD_CLASSES = [
  { id: "PROTECTED_SIGNATURE", requirement: "PROTECTED", label: /\b(signature|sign here|declarant.*sign)\b/i },
  { id: "PROTECTED_SIGNATURE_DATE", requirement: "PROTECTED", label: /signature.*date|date.*signature|\(type or print your name\)/i },
  { id: "COURT_ONLY", requirement: "PROTECTED", label: /\b(clerk|judge|judicial officer|court use only|for court use|by the court|deputy)\b/i },
  { id: "PROSECUTOR_ONLY", requirement: "PROTECTED", label: /\b(district attorney'?s use|prosecutor'?s use|people'?s response)\b/i },
  { id: "COURT_ASSIGNED", requirement: "LATER_COMPLETION", label: /\b(hearing date|date of hearing|dept\.?|department|time|courtroom|filed on|filing stamp)\b/i },
  { id: "ATTORNEY_BLOCK", requirement: "ATTORNEY", label: /\b(attorney|state bar|bar no|bar number|ldp|counsel for)\b/i },
  { id: "PARTICIPANT_IDENTITY", requirement: "REQUIRED_KNOWN", label: /\b(defendant|petitioner|applicant|filer|your name|full name|name of person|movant)\b/i },
  { id: "PARTICIPANT_CONTACT", requirement: "REQUIRED_KNOWN", label: /\b(mailing address|street address|address|city.*state.*zip|telephone|phone|e-?mail)\b/i },
  { id: "MATTER_IDENTIFIER", requirement: "REQUIRED_KNOWN", label: /\b(case number|docket|cause no|citation number|court number)\b/i },
  { id: "COURT_IDENTITY", requirement: "REQUIRED_KNOWN", label: /\b(superior court of|court name|name of court|branch|county of|judicial district|street address of court)\b/i },
  { id: "OFFENSE_ROW_CELL", requirement: "REQUIRED_KNOWN", label: /\b(code \(penal|^section$|type of offense|offense|charge|count|statute)\b/i },
  { id: "DISPOSITION_FACT", requirement: "REQUIRED_KNOWN", label: /\b(date of conviction|conviction date|date of arrest|arrest date|date of dismissal|disposition|sentenc|probation)\b/i },
  { id: "AGENCY_FACT", requirement: "REQUIRED_KNOWN", label: /\b(arresting agency|citing.*agency|law enforcement agency|prosecuting agency|agency)\b/i },
  { id: "ROUTE_ELECTION", requirement: "ROUTE_DETERMINED", label: /\beligible for reduction|under penal code, ?§ ?17|yes or no\b/i },
  { id: "PARTICIPANT_NARRATIVE", requirement: "OPTIONAL_OR_REQUIRED_BEFORE_FILING", label: /\b(explain|describe|reason|statement|supporting documentation|interests of justice)\b/i },
  { id: "VIEWER_CONTROL", requirement: "NOT_A_FILING_FACT", label: /\b(save this form|print this form|clear this form|reset|for your records)\b/i }
];

/**
 * Reason strings that DESCRIBE THE BUILD rather than justify the blank.
 *
 * Each of these was accepted by the old verifier. Each is now a defect when the
 * field it excuses is a required known fact: the platform holding no allowlisted
 * value for a case number is a gap in the platform, not a property of the form.
 */
export const POLICY_SHAPED_REASONS = [
  { re: /no allowlisted[^.]*fact is offered/i, disposition: "KNOWN_FACT_NOT_WRITTEN", why: "This states that the build's allowlist offers nothing. It says nothing about whether the filing needs the value." },
  { re: /never prefilled by this build/i, disposition: "KNOWN_FACT_NOT_WRITTEN", why: "A statement of build policy. A case fact does not stop being required because the build declines to write it." },
  { re: /are never prefilled\b/i, disposition: "KNOWN_FACT_NOT_WRITTEN", why: "Same shape: a blanket policy standing in for a per-field justification." },
  { re: /not established by this evidence variant/i, disposition: "ROUTE_OPTION_NOT_SELECTED", why: "A fixture that does not establish a route election is an incomplete fixture, not a reason to ship the election blank." },
  { re: /the shared semantics never writes a checkbox/i, disposition: "ROUTE_OPTION_NOT_SELECTED", why: "A shared limitation, not a determination that this election belongs to the participant." }
];

/** Reason strings that DO justify a blank, mapped to their disposition. */
export const APPROVED_REASONS = [
  { re: /signature (and )?(date )?(is|are)? ?(completed|signed) by the participant|never prefilled.*signature|signature.*never prefilled/i, disposition: "PROTECTED_FIELD" },
  { re: /^signature or date field; never prefilled/i, disposition: "PROTECTED_FIELD" },
  { re: /attorney[- ]only|attorney\/ldp|no representation fact is held|never populated with participant data/i, disposition: "NOT_APPLICABLE_ON_THIS_ROUTE" },
  { re: /court, clerk, prosecutor, agency, or hearing field/i, disposition: "PROTECTED_FIELD" },
  { re: /viewer ui control|never a filing fact/i, disposition: "NOT_APPLICABLE_ON_THIS_ROUTE" },
  { re: /optional participant-authored|the platform does not invent it/i, disposition: "OPTIONAL_PARTICIPANT_CONTENT" }
];

/**
 * Typed refusal classes, where a family emits them instead of prose.
 *
 * These read as authoritative and two of them are. The other two are the same
 * policy-shaped excuse with a schema around it:
 *
 *   not_supported_by_exact_participant_fact_map -- the build's fact map offers
 *   nothing. Eighty-eight New Jersey fields sit behind this, including the
 *   participant's own identifying facts.
 *
 *   court_prosecutor_clerk_or_agency_owned -- three of those four are genuinely
 *   protected and the fourth is not. An arresting or prosecuting AGENCY name is
 *   a case fact the participant already has from the record they screened with;
 *   bundling it with the clerk and the judge lets a required fact hide inside a
 *   protected class. The class is honoured for court, prosecutor and clerk
 *   fields and refused for agency fields.
 */
export const REFUSAL_CLASSES = {
  signature_or_date_participant_completion: { disposition: "PROTECTED_FIELD", trusted: true },
  court_prosecutor_clerk_or_agency_owned: { disposition: "PROTECTED_FIELD", trusted: true, notForFieldClasses: ["AGENCY_FACT"] },
  participant_sworn_narrative_or_legal_election: { disposition: "PARTICIPANT_ELECTION_GENUINE", trusted: true, notForFieldClasses: ["ROUTE_ELECTION", "OFFENSE_ROW_CELL", "MATTER_IDENTIFIER", "PARTICIPANT_IDENTITY", "PARTICIPANT_CONTACT", "COURT_IDENTITY", "DISPOSITION_FACT"] },
  not_supported_by_exact_participant_fact_map: { disposition: "KNOWN_FACT_NOT_WRITTEN", trusted: false, why: "This states that the build's fact map offers no value. It says nothing about whether the filing needs one." }
};

/** The nine counters a packet must zero to return PASS. */
export const PASS_COUNTERS = [
  "knownRequiredFieldsMissing", "requiredFactsNotCollected", "unclassifiedBlanks",
  "incompleteRows", "requiredOptionsMissing", "requiredComponentsMissing",
  "invisibleWrites", "protectedWrites", "visualDefects"
];

/** The result vocabulary. Order matters: the first failing class is reported. */
export const RESULT_CLASSES = [
  "PASS_COMPLETE",
  "FAIL_PROTECTED_WRITE",
  "FAIL_VISIBLE_APPEARANCE",
  "FAIL_MISSING_REQUIRED_FACTS",
  "FAIL_ROUTE_SELECTION",
  "FAIL_MISSING_PREFILLS",
  "FAIL_COMPONENT_SET",
  "FAIL_CURRENTNESS"
];

/**
 * Classify one field from its label. Never guesses: an unmatched label is UNKNOWN.
 *
 * A SELECTION CONTROL is classified differently, because its caption is a
 * sentence rather than a field name and the patterns above then read it wrong.
 * Utah's certificate of service found this: `[ ] Email` was counted as a missing
 * participant email address, `[ ] Left at business (With person in charge` as a
 * missing offence-row cell, and `I am the [ ] Petitioner` as a missing
 * participant identity. All three are service-method checkboxes. None is a place
 * a fact goes, and calling them missing facts made a correctly built certificate
 * of service fail for sixteen defects it did not have.
 *
 * A checkbox that is protected stays protected, and one the route determines
 * stays route-determined -- those two are read from the same patterns first.
 * Everything else is an election, which is what a checkbox is.
 */
export function classifyField(label, isSelectionControl = false) {
  const text = String(label ?? "").trim();
  if (!text) return { id: "UNLABELLED", requirement: "UNKNOWN" };
  if (isSelectionControl) {
    for (const cls of FIELD_CLASSES) {
      if (!cls.label.test(text)) continue;
      if (cls.requirement === "PROTECTED" || cls.requirement === "ROUTE_DETERMINED") return cls;
    }
    return { id: "SELECTION_CONTROL", requirement: "PARTICIPANT_ELECTION" };
  }
  for (const cls of FIELD_CLASSES) if (cls.label.test(text)) return cls;
  return { id: "UNMATCHED", requirement: "UNKNOWN" };
}

/**
 * Classify one blank.
 *
 * Order is deliberate. A protected field is protected whatever the reason says,
 * so the field class is consulted first for those. Otherwise a policy-shaped
 * reason is a defect even when it sounds authoritative, and only then is an
 * approved reason accepted. A blank with neither is UNCLASSIFIED.
 */
export function classifyBlank(field, reason, refusalClass = null, declared = null) {
  const cls = classifyField(field.label, field.isSelectionControl === true);
  const text = String(reason ?? "");
  const dec = declared ?? {};
  // A row "uses the declared channel" when it states a disposition or states
  // requiredBeforeFiling as a boolean. A legacy row states neither, and nothing
  // below changes how a legacy row is read.
  const declaresDisposition = dec.disposition !== undefined && dec.disposition !== null;
  const declaresRequiredBeforeFiling = typeof dec.requiredBeforeFiling === "boolean";
  const usesDeclaredChannel = declaresDisposition || declaresRequiredBeforeFiling;

  // An unknown disposition fails closed. A build that invents a disposition name
  // is not classifying a blank, and reading it as unrecognised-and-therefore-fine
  // is exactly how UNCLASSIFIED_BLANK became a defect class in the first place.
  if (declaresDisposition && !Object.hasOwn(BLANK_DISPOSITIONS, String(dec.disposition))) {
    return {
      disposition: "UNCLASSIFIED_BLANK", fieldClass: cls.id,
      basis: `the field map declares the disposition "${dec.disposition}", which is outside the closed vocabulary`,
      declaredDisposition: String(dec.disposition)
    };
  }
  // Same rule for a refusal class, but only on the declared channel: a legacy row
  // whose category happens to be an unrecognised string is read as it always was,
  // so this correction cannot silently move families it was not written for.
  if (usesDeclaredChannel && refusalClass && !Object.hasOwn(REFUSAL_CLASSES, refusalClass)) {
    return {
      disposition: "UNCLASSIFIED_BLANK", fieldClass: cls.id,
      basis: `the field map declares the refusal class "${refusalClass}", which is outside the closed vocabulary`,
      declaredRefusalClass: String(refusalClass)
    };
  }

  // Source presentation is a distinct question from whether a filing fact is
  // available. The reader validates the source identity and any companion write;
  // map prose, a read-only flag alone, or a caller-supplied `verified` flag cannot
  // grant this disposition. Ordinary undeclared blanks keep the existing path.
  if (dec.sourcePresentation) {
    if (cls.requirement === "PROTECTED") return { disposition: "PROTECTED_FIELD", fieldClass: cls.id, basis: "the field itself is protected" };
    const proof = dec.sourcePresentation;
    const expectedDisposition = proof.kind === "materialized_control" ? "MATERIALIZED_SOURCE_CONTROL" : "NON_FILING_SOURCE_ELEMENT";
    if (dec.requiredBeforeFiling === true || dec.disposition !== expectedDisposition) return {
      disposition: "UNCLASSIFIED_BLANK", fieldClass: cls.id,
      basis: "source presentation contradicts its declared filing-blank disposition"
    };
    if (dec.routeDetermined === true && proof.kind !== "materialized_control") return {
      disposition: "ROUTE_OPTION_NOT_SELECTED", fieldClass: cls.id,
      basis: "a source presentation declaration cannot excuse an unmade route-determined election"
    };
    if (proof.verified !== true) return {
      disposition: proof.kind === "materialized_control" ? "KNOWN_FACT_NOT_WRITTEN" : "UNCLASSIFIED_BLANK",
      fieldClass: cls.id, basis: proof.failure ?? "source presentation has no verified source/companion evidence"
    };
    return {
      disposition: proof.kind === "materialized_control" ? "MATERIALIZED_SOURCE_CONTROL" : "NON_FILING_SOURCE_ELEMENT",
      fieldClass: cls.id, basis: proof.basis
    };
  }

  // A typed refusal class is consulted before prose, but it is not obeyed
  // blindly: each carries the field classes it may NOT excuse, so a protected
  // class cannot be used to hide a required case fact.
  const typed = refusalClass ? REFUSAL_CLASSES[refusalClass] : null;
  if (typed) {
    const excluded = (typed.notForFieldClasses ?? []).includes(cls.id);
    if (typed.trusted && !excluded) return { disposition: typed.disposition, fieldClass: cls.id, basis: `refusal class ${refusalClass}` };
    if (typed.trusted && excluded) {
      return {
        disposition: cls.requirement === "ROUTE_DETERMINED" ? "ROUTE_OPTION_NOT_SELECTED" : "KNOWN_FACT_NOT_WRITTEN",
        fieldClass: cls.id,
        basis: `refusal class ${refusalClass} does not excuse a ${cls.id} field`,
        policyShapedReason: text || refusalClass
      };
    }
    if (!typed.trusted && (cls.requirement === "REQUIRED_KNOWN" || cls.requirement === "ROUTE_DETERMINED" || cls.requirement === "UNKNOWN")) {
      return {
        disposition: cls.requirement === "ROUTE_DETERMINED" ? "ROUTE_OPTION_NOT_SELECTED" : "KNOWN_FACT_NOT_WRITTEN",
        fieldClass: cls.id, basis: typed.why, policyShapedReason: text || refusalClass
      };
    }
  }
  if (cls.requirement === "PROTECTED") return { disposition: "PROTECTED_FIELD", fieldClass: cls.id, basis: "the field itself is protected" };
  if (cls.requirement === "LATER_COMPLETION") return { disposition: "LATER_COMPLETION", fieldClass: cls.id, basis: "the court completes this field at or after filing" };
  if (cls.requirement === "NOT_A_FILING_FACT") return { disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", fieldClass: cls.id, basis: "a viewer control, not a filing fact" };
  if (cls.requirement === "ATTORNEY" && /attorney|representation/i.test(text)) {
    return { disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", fieldClass: cls.id, basis: "no attorney-representation fact is held for this participant" };
  }
  // ---- the declared not-applicable-on-this-route gate ---------------------------
  //
  // Reachable only from an explicit declaration carrying a NAMED route
  // condition, which is what BLANK_DISPOSITIONS has required of this
  // disposition all along. Before this gate existed the name was in the closed
  // vocabulary but nothing honoured it, so a family whose route genuinely does
  // not reach a blank had to word its refusal until it matched the attorney-only
  // or viewer-control regex, or carry the blank as unclassified. Wording a
  // refusal to match a regex is the thing these counters exist to prevent.
  //
  // Every failure below returns the defect the declaration was standing in
  // front of, so a family reading its own report can tell which condition it
  // missed.
  //
  // The gate is entered only when a condition is actually NAMED. A row that
  // declares the disposition without one falls through to every path that
  // existed before, so this gate can only ADD a way to reach the disposition
  // and never takes one away. Three California MC-025 page-chrome refusals and
  // a Hawaii route refusal are the measured reason for that shape: they declare
  // the disposition and reach it through the approved prose table, and a gate
  // that intercepted them would have turned two passing families red to close a
  // gap neither of them has.
  const namedRouteCondition = String(dec.routeConditionThatMakesItInapplicable ?? "").trim();
  if (String(dec.disposition) === "NOT_APPLICABLE_ON_THIS_ROUTE" && namedRouteCondition) {
    const condition = namedRouteCondition;
    /* The same shape the policy-shaped table refuses in prose is refused here,
     * so moving the sentence into a typed field does not launder it. */
    const policyShaped = POLICY_SHAPED_REASONS.find((p) => p.re.test(condition));
    if (policyShaped) {
      return {
        disposition: cls.requirement === "ROUTE_DETERMINED" ? "ROUTE_OPTION_NOT_SELECTED" : "KNOWN_FACT_NOT_WRITTEN",
        fieldClass: cls.id,
        basis: `declared not-applicable-on-this-route, but the named condition is a statement of build policy: ${policyShaped.why}`,
        declaredNotApplicable: true, policyShapedReason: condition
      };
    }
    if (dec.routeDetermined === true) {
      return {
        disposition: "ROUTE_OPTION_NOT_SELECTED", fieldClass: cls.id,
        basis: "declared both route-determined and not-applicable-on-this-route; an election this route makes is an election this route reaches, and the refusal stands rather than the more permissive half winning",
        declaredNotApplicable: true
      };
    }
    if (dec.factAvailable === true) {
      return {
        disposition: "KNOWN_FACT_NOT_WRITTEN", fieldClass: cls.id,
        basis: `declared not-applicable-on-this-route, but the packet holds a value for ${dec.factId ?? "this fact"} and writes it elsewhere; a fact this packet writes is a fact this route reaches`,
        declaredNotApplicable: true, factId: dec.factId ?? null
      };
    }
    return {
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", fieldClass: cls.id,
      basis: `the field map names the route condition that puts this blank outside the route: ${condition}`,
      declaredNotApplicable: true,
      routeCondition: condition
    };
  }

  // ---- the declared required-before-filing gate ---------------------------------
  //
  // Reachable only from an explicit declaration, and only when every condition in
  // REQUIRED_BEFORE_FILING_CONDITIONS holds. Each failure below returns the
  // defect the declaration was standing in front of, rather than a generic one,
  // so a family reading its own report can tell which condition it missed.
  if (declaresRequiredBeforeFiling ? dec.requiredBeforeFiling === true : String(dec.disposition) === "REQUIRED_BEFORE_FILING") {
    /*
     * AN ELECTION THE CASE DETERMINES IS NOT AN ELECTION THE ROUTE DETERMINES.
     *
     * The rule below is right in general: a packet built for one statutory
     * route states which route it is rather than asking the participant. It
     * was applied to every field whose printed caption LOOKS like a route
     * election, and some of those are determined by the case rather than by
     * the route.
     *
     * California CR-180 is the measured instance. Its per-offence
     * "Penal Code section 17(b)" and "17(d)(2)" cells ask, of each listed
     * conviction, whether that offence is a wobbler. The route does not decide
     * that; the offence does, and answering it is a legal characterisation of
     * a code section. Because the class outranked the declaration, the only
     * way to clear the counter was to WRITE a yes or no that no held record
     * establishes -- onto a petition sworn under penalty of perjury. A counter
     * that can only be satisfied by guessing a legal conclusion is pressure to
     * ship an unsafe filing, which is the one thing these counters exist to
     * prevent.
     *
     * So a family may say that a route-election-shaped field is determined by
     * the CASE, and must say WHY the route cannot determine it. The general
     * rule is untouched: without that explicit, reasoned declaration a
     * route-determined field still has to be stated by the packet, and
     * declaring routeDetermined true still refuses.
     */
    const caseDetermined = dec.determinedByTheCaseNotTheRoute === true
      && typeof dec.whyTheRouteCannotDetermineIt === "string"
      && dec.whyTheRouteCannotDetermineIt.trim().length > 0;
    if (dec.determinedByTheCaseNotTheRoute === true && !caseDetermined) {
      return {
        disposition: "ROUTE_OPTION_NOT_SELECTED", fieldClass: cls.id,
        basis: "declared determinedByTheCaseNotTheRoute without whyTheRouteCannotDetermineIt; the exception is auditable or it is not available",
        declaredRequiredBeforeFiling: true
      };
    }
    /* The exception overrides the CLASS inference, never an explicit
     * declaration. A family that says both routeDetermined and
     * determinedByTheCaseNotTheRoute is contradicting itself, and the refusal
     * stands rather than the more permissive half winning. */
    if (dec.routeDetermined === true || (!caseDetermined && cls.requirement === "ROUTE_DETERMINED")) {
      return {
        disposition: "ROUTE_OPTION_NOT_SELECTED", fieldClass: cls.id,
        basis: "declared required-before-filing, but the route determines this election; a packet built for one statutory route states which route it is rather than asking the participant",
        declaredRequiredBeforeFiling: true
      };
    }
    const identity = String(dec.identity ?? field.name ?? field.id ?? "").trim();
    const label = String(field.label ?? "").trim();
    if (!identity || !label) {
      return {
        disposition: "UNCLASSIFIED_BLANK", fieldClass: cls.id,
        basis: "declared required-before-filing with no field identity or no printed label; the packet cannot tell the participant which blank to fill",
        declaredRequiredBeforeFiling: true
      };
    }
    if (dec.factAvailable === true) {
      return {
        disposition: "KNOWN_FACT_NOT_WRITTEN", fieldClass: cls.id,
        basis: `declared required-before-filing, but the packet holds a value for ${dec.factId ?? "this fact"} and writes it elsewhere; an available fact is not an unavailable one`,
        declaredRequiredBeforeFiling: true, factId: dec.factId ?? null
      };
    }
    /* The case-determined exception carries through here too. Its whole claim
     * is that this particular cell IS the participant's to answer, so refusing
     * it as "not the participant's to complete" on the strength of the same
     * class the exception was granted against would leave the family exactly
     * where it started -- trading requiredOptionsMissing for
     * unclassifiedBlanks and calling it a repair. */
    if (!caseDetermined && !PARTICIPANT_COMPLETABLE_REQUIREMENTS.has(cls.requirement)) {
      return {
        disposition: "UNCLASSIFIED_BLANK", fieldClass: cls.id,
        basis: `declared required-before-filing on a ${cls.id} field, which is not the participant's to complete`,
        declaredRequiredBeforeFiling: true
      };
    }
    return {
      disposition: "REQUIRED_BEFORE_FILING", fieldClass: cls.id,
      basis: "the field map declares this fact required before filing, the packet holds no value for it, and it is the participant's to supply",
      declaredRequiredBeforeFiling: true,
      requiresParticipantDisclosure: true,
      factId: dec.factId ?? null,
      identity
    };
  }

  // A declared route election is a route election whatever its prose says. The
  // build states this as typed data so the audit does not have to recognise a
  // sentence to reach the same conclusion.
  if (dec.routeDetermined === true) {
    return {
      disposition: "ROUTE_OPTION_NOT_SELECTED", fieldClass: cls.id,
      basis: "the field map declares this election route-determined and left unmade; a packet built for one statutory route must state which route it is",
      declaredRouteDetermined: true
    };
  }

  for (const p of POLICY_SHAPED_REASONS) {
    if (p.re.test(text)) {
      if (cls.requirement === "REQUIRED_KNOWN" || cls.requirement === "ROUTE_DETERMINED"
        || cls.requirement === "UNKNOWN" || cls.requirement === "PARTICIPANT_ELECTION") {
        return { disposition: p.disposition, fieldClass: cls.id, basis: p.why, policyShapedReason: text };
      }
    }
  }
  if (cls.requirement === "ROUTE_DETERMINED") {
    return { disposition: "ROUTE_OPTION_NOT_SELECTED", fieldClass: cls.id, basis: "the route determines this election; it may not be left to the participant on a route-specific packet" };
  }
  for (const a of APPROVED_REASONS) if (a.re.test(text)) return { disposition: a.disposition, fieldClass: cls.id, basis: text };
  if (cls.requirement === "REQUIRED_KNOWN") {
    return { disposition: "KNOWN_FACT_NOT_WRITTEN", fieldClass: cls.id, basis: "a required known fact with no approved reason for being blank", policyShapedReason: text || null };
  }
  if (cls.requirement === "OPTIONAL_OR_REQUIRED_BEFORE_FILING") {
    return /optional/i.test(String(field.label))
      ? { disposition: "OPTIONAL_PARTICIPANT_CONTENT", fieldClass: cls.id, basis: "the form marks this field optional" }
      : { disposition: "KNOWN_FACT_NOT_WRITTEN", fieldClass: cls.id, basis: "a narrative the filing requires, with no approved reason for being blank" };
  }
  return { disposition: "UNCLASSIFIED_BLANK", fieldClass: cls.id, basis: text || "no reason recorded" };
}

/**
 * Row identity for a repeating table.
 *
 * CR-180 numbers its offence rows inside the field name; a measured overlay
 * numbers them in the label. A row is complete when, once ANY cell in it is
 * written, every required cell in it is written too -- a case number with no
 * offence code beside it is worse than an empty row, because it looks finished.
 */
export function rowKeyOf(field) {
  const name = String(field.name ?? "");
  // A bare trailing "[0]" is NOT a row marker. XFA terminal names index every
  // path segment — CR-409[0].Page1[0].rightCaption[0].CourtInfo[0] — so the
  // old `\[(\d+)\]` alternative keyed nearly every field of every XFA-named
  // family to the single pseudo-row "table::[0]". On the California families
  // that "row" contained the petition's caption, the proposed order's court
  // block and the proof of service's cells — fields on different pages of
  // DIFFERENT PDFs — and one written caption anywhere made every required
  // blank on every companion an incompleteRows finding, while CR-180's real
  // conviction table (ConvTable[0].Row1..Row5, all cells ending "[0]") was
  // collapsed into that same key and never measured per-row at all. A row
  // marker is a NAMED one: Item/Row/Line in the terminal segment, an
  // Item[n].Row[n] pair anywhere, or the printed label's own row number.
  const m = name.match(/(Item\d+|Row\d+|Line\d+)[^.]*$/i) ?? name.match(/(Item\d+\[\d+\]\.Row\d+\[\d+\])/i);
  if (m) {
    const table = name.match(/(Item\d+|Table\d+|Offense\w*)/i);
    return `${table ? table[1] : "table"}::${m[0]}`;
  }
  const label = String(field.label ?? "");
  const lm = label.match(/\brow\s*(\d+)|\bcount\s*(\d+)|\b(\d+)\.\s/i);
  return lm ? `label-row::${lm[0].trim()}` : null;
}
