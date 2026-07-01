import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const TODAY = new Date("2026-07-01T00:00:00.000Z");
const failures = [];
const stateRows = [];
const fullyPacketCapable = [];
const failClosed = [];
const boundaryFailed = [];
const legalReviewFlags = [];
const WILMA_FACT_IDS = new Set([
  "waiting_rule_id",
  "sentence_completion_actual_date",
  "release_date",
  "sentencing_date",
  "discharge_date",
  "last_conviction_date",
  "conviction_date",
  "probation_parole_supervision_end_date"
]);

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function normalized(text) {
  return String(text ?? "").toLowerCase();
}

function humanOutcome(value) {
  if (value === "arrest_no_charge") return "Arrest or citation with no charge filed";
  if (value === "dismissed") return "Dismissed, no-billed, nolle prosequi, or not prosecuted";
  if (value === "acquitted") return "Acquitted or found not guilty";
  if (value === "diversion_or_deferred") return "Diversion, deferred disposition, supervision, or similar program";
  if (value === "convicted_felony") return "Felony conviction";
  if (value === "convicted_misdemeanor") return "Misdemeanor conviction";
  if (value === "convicted_other") return "Conviction or adjudication";
  if (value === "juvenile") return "Juvenile adjudication or offense committed as a minor";
  if (value === "pardon") return "Pardoned conviction";
  return "Conviction or adjudication";
}

function pathwayFixture(pathway, routeRule = {}) {
  const haystack = normalized(`${pathway.id} ${pathway.label} ${pathway.summary} ${routeRule.when?.sourceConditionText ?? ""}`);
  const outcomes = routeRule.when?.caseOutcomes ?? pathway.caseOutcomes ?? [];
  const outcome = haystack.includes("arrest") && haystack.includes("no charge")
    ? "arrest_no_charge"
    : haystack.includes("dismiss") || haystack.includes("nolle")
      ? "dismissed"
      : haystack.includes("acquit")
        ? "acquitted"
        : haystack.includes("felony")
          ? "convicted_felony"
          : outcomes.find((candidate) => !["arrest_no_charge", "dismissed", "acquitted", "diversion_or_deferred"].includes(candidate)) ?? outcomes[0] ?? "convicted_misdemeanor";
  const offenseLevel = outcome === "convicted_felony" || haystack.includes("felony") ? "Felony" : "Misdemeanor";
  const charge = haystack.includes("class c")
    ? "Class C misdemeanor synthetic charge"
    : haystack.includes("class a") || haystack.includes("class b")
      ? "Class A misdemeanor synthetic charge"
      : offenseLevel === "Felony"
        ? "Synthetic felony conviction"
        : "Synthetic misdemeanor conviction";
  return {
    context: pathway.label,
    caseOutcome: humanOutcome(outcome),
    offenseLevel,
    charge
  };
}

function answerFor(question, stateName, fixture) {
  const id = question.id;
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return "State or local";
  if (id === "case_outcome") return fixture.caseOutcome;
  if (id === "offense_level") return fixture.offenseLevel;
  if (id === "possible_pathway_context") return fixture.context;
  if (id === "waiting_rule_id") return fixture.waitingRuleId ?? "";
  if (WILMA_FACT_IDS.has(id)) return fixture.date;
  if (id === "state_exclusion_categories") return ["None of these"];
  if (id === "sentence_completion_date" || id === "financial_obligations") return "Yes";
  if (id === "new_convictions_during_waiting_period") return "No";
  if (id === "special_preconditions_confirmed") return "Yes";
  if (id === "wi_expungement_ordered_at_sentencing" || id === "wi_no_probation_jail_prison") return "Yes";
  if (id === "eligible_conviction_count") return 1;
  if (id === "eligible_conviction_class") return fixture.offenseLevel;
  if (id === "route_family_detail") return fixture.context;
  if (id === "pending_cases" || id === "pardon_status" || id === "identity_error" || id === "trafficking_status") return "No";
  if (id === "disposition_date" || id === "arrest_date") return fixture.date;
  if (id === "record_documents" || id === "criminal_history") return "Yes";
  if (id === "court") return `${stateName} trial court`;
  if (id === "charge") return fixture.charge;
  if (id === "county_or_filing_location" || id === "county") return "Synthetic County";
  if (id === "case_identifier") return "SYN-CASE-001";
  if (id === "offense_category") return "None of these";
  if (id === "prior_conviction_count") return 0;
  if (id === "prior_felony_count") return 0;
  if (question.type === "number_or_range") return 30;
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.find((option) => !/federal|not sure|unknown|prefer not|none of these/i.test(String(option))) ?? question.options[0];
  }
  return "Synthetic answer";
}

function buildAnswers(profile, fixture) {
  const pub = projectPublicProfile(profile);
  const answers = {};
  for (const question of pub.questions) {
    answers[question.id] = answerFor(question, pub.jurisdiction.name, fixture);
  }
  return answers;
}

function evaluate(profile, pathway, date) {
  const routeRule = profile.orderedDecisionRules.find((rule) => rule.when?.backendPathwayId === pathway.id || rule.id === `route-${pathway.id}`);
  const selectedWait = waitingRuleFor(profile, pathway);
  const fixture = { ...pathwayFixture(pathway, routeRule), date, waitingRuleId: selectedWait?.id };
  return evaluateScreening({
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: `all51-provability-${profile.jurisdiction.code}-${pathway.id}`,
    answers: buildAnswers(profile, fixture)
  });
}

function parseDuration(text) {
  const lower = normalized(text);
  const numeric = lower.match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/);
  if (numeric) return { value: Number(numeric[1]), unit: numeric[2].startsWith("day") ? "days" : numeric[2].startsWith("month") ? "months" : "years" };
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const word = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|month|months|year|years)\b/);
  if (word) return { value: words[word[1]], unit: word[2].startsWith("day") ? "days" : word[2].startsWith("month") ? "months" : "years" };
  if (/immediate|no waiting period|upon event/.test(lower)) return { value: 0, unit: "days" };
  return undefined;
}

function durationDays(duration) {
  if (!duration) return -1;
  if (duration.unit === "days") return duration.value;
  if (duration.unit === "months") return duration.value * 31;
  return duration.value * 366;
}

function addDuration(date, duration, direction) {
  const next = new Date(date.getTime());
  const amount = direction * duration.value;
  if (duration.unit === "days") next.setUTCDate(next.getUTCDate() + amount);
  else if (duration.unit === "months") next.setUTCMonth(next.getUTCMonth() + amount);
  else next.setUTCFullYear(next.getUTCFullYear() + amount);
  return next;
}

function pathwayWaitingRows(pathway) {
  return (pathway.waitingRules ?? []).map((text, index) => ({
    id: `pathway-wait-${index}`,
    text,
    duration: parseDuration(text),
    anchor: undefined
  }));
}

function compiledWaitingRows(profile) {
  return (profile.waitingPeriodRules ?? []).map((rule) => ({
    id: rule.id,
    text: rule.ruleText ?? "",
    duration: rule.duration ?? parseDuration(rule.ruleText ?? ""),
    anchor: rule.anchor ?? undefined
  }));
}

function pathwayRouteTokens(pathway) {
  return normalized(`${pathway.id} ${pathway.label} ${pathway.summary}`)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 5);
}

function waitingRuleFor(profile, pathway) {
  const routeText = normalized(`${pathway.id} ${pathway.label} ${pathway.summary}`);
  const tokens = pathwayRouteTokens(pathway);
  const rows = [...compiledWaitingRows(profile), ...pathwayWaitingRows(pathway)];
  const candidates = rows
    .map((row) => {
      const text = normalized(row.text);
      const duration = row.duration ?? parseDuration(text);
      const score = tokens.filter((token) => text.includes(token)).length;
      const outcomeScore =
        (/arrest/.test(routeText) && /arrest/.test(text) ? 2 : 0)
        + (/dismiss|nonconviction/.test(routeText) && /dismiss|non-conviction|nonconviction/.test(text) ? 2 : 0)
        + (/acquit/.test(routeText) && /acquit|not guilty/.test(text) ? 2 : 0)
        + (/felony/.test(routeText) && /felony/.test(text) ? 2 : 0)
        + (/misdemeanor/.test(routeText) && /misdemeanor/.test(text) ? 2 : 0);
      return { ...row, text, duration, score: score + outcomeScore };
    })
    .filter((row) => row.id && row.duration && row.duration.value >= 0 && row.score > 0)
    .sort((left, right) => right.score - left.score || durationDays(right.duration) - durationDays(left.duration));
  return candidates[0];
}

function boundaryDates(duration) {
  const threshold = addDuration(TODAY, duration, -1);
  const under = new Date(threshold.getTime());
  under.setUTCDate(under.getUTCDate() + 1);
  const over = new Date(threshold.getTime());
  over.setUTCDate(over.getUTCDate() - 1);
  return {
    under: under.toISOString().slice(0, 10),
    over: over.toISOString().slice(0, 10)
  };
}

function waitingDurationFor(profile, pathway) {
  if (profile.jurisdiction.code === "WI" && pathway.id === "adult-conviction-expungement-under-wis-stat-973-015") return undefined;
  const routeRule = profile.orderedDecisionRules.find((rule) => rule.when?.backendPathwayId === pathway.id || rule.id === `route-${pathway.id}`);
  const routeDuration = routeRule?.when?.duration;
  if (routeDuration && typeof routeDuration.value === "number" && typeof routeDuration.unit === "string") {
    return routeDuration.value > 0 ? routeDuration : undefined;
  }
  const rule = waitingRuleFor(profile, pathway);
  return rule?.duration && rule.duration.value > 0 ? rule.duration : undefined;
}

for (const profile of getAllJurisdictionProfiles().sort((a, b) => a.jurisdiction.code.localeCompare(b.jurisdiction.code))) {
  const code = profile.jurisdiction.code;
  const packetPlans = profile.packetGenerator.pathways.filter((plan) => plan.mode !== "automatic_relief_verification_and_guidance");
  const packetPathways = packetPlans
    .map((plan) => profile.pathways.find((pathway) => pathway.id === plan.pathwayId))
    .filter(Boolean);
  const results = [];
  for (const pathway of packetPathways) {
    const current = evaluate(profile, pathway, "2000-01-01");
    const duration = waitingDurationFor(profile, pathway);
    let boundary = "no executable positive wait detected";
    if (duration) {
      const dates = boundaryDates(duration);
      const under = evaluate(profile, pathway, dates.under);
      const over = evaluate(profile, pathway, dates.over);
      const underClosed = under.paymentAllowed === false && under.resultCode !== "packet_ready" && under.resultCode !== "packet_ready_with_caution";
      const overOpen = over.paymentAllowed === true && (over.resultCode === "packet_ready" || over.resultCode === "packet_ready_with_caution");
      boundary = `${duration.value} ${duration.unit}: under=${under.resultCode}/${under.paymentAllowed} over=${over.resultCode}/${over.paymentAllowed}`;
      if (!underClosed || !overOpen) boundaryFailed.push(`${code} ${pathway.label}: ${boundary}`);
    }
    const packetOpen = current.paymentAllowed === true && (current.resultCode === "packet_ready" || current.resultCode === "packet_ready_with_caution");
    results.push({
      label: pathway.label,
      result: current.resultCode,
      payment: current.paymentAllowed,
      packetOpen,
      reason: current.reasons.map((reason) => reason.code).join(","),
      boundary
    });
    assert(current.paymentAllowed === false || packetOpen, `${code} ${pathway.label}: payment allowed outside packet-ready result.`);
    assert(current.paymentAllowed === false || current.reasons.some((reason) => reason.code.includes("compiled_rule_match")), `${code} ${pathway.label}: payment allowed without compiled-rule match.`);
  }
  const reachable = results.some((result) => result.packetOpen);
  const unsafeUnderOpen = boundaryFailed.some((failure) => failure.startsWith(`${code} `) && /under=packet_ready/.test(failure));
  const boundaryOk = !boundaryFailed.some((failure) => failure.startsWith(`${code} `));
  if (reachable && boundaryOk) fullyPacketCapable.push(code);
  if (!reachable) {
    const why = results[0]?.reason || (packetPathways.length === 0 ? "guidance-only/no packet plans" : "no packet route opened");
    failClosed.push(`${code}: ${why}`);
  }
  const packetReadyReachable = reachable ? "yes" : `no: ${results[0]?.reason ?? "guidance-only/no packet plans"}`;
  stateRows.push({
    code,
    outcomesReachable: [...new Set(results.map((result) => result.result))].join("/") || "guidance_only",
    packetReadyReachable,
    paymentGated: results.every((result) => result.payment === false || result.packetOpen) ? "yes" : "no",
    boundary: boundaryOk ? "ok" : unsafeUnderOpen ? "needs_source_review_under_open" : "fail_closed_or_unproven",
    failClosed: reachable ? "none" : packetReadyReachable
  });
  if (results.some((result) => /waiting_anchor_not_determined|waiting_rule_not_executed/.test(result.reason))) {
    legalReviewFlags.push(`${code}: at least one packet route has unexecutable timing/anchor language requiring source/legal review before payment.`);
  }
}

console.log("state | outcomes now reachable | packet_ready reachable | payment correctly gated | boundary flips correct | still-fail-closed path + reason");
for (const row of stateRows) {
  console.log(`${row.code} | ${row.outcomesReachable} | ${row.packetReadyReachable} | ${row.paymentGated} | ${row.boundary} | ${row.failClosed}`);
}
console.log(`fully_packet_capable=${fullyPacketCapable.join(",")}`);
console.log(`still_fail_closed=${failClosed.join(" || ") || "none"}`);
console.log(`boundary_failures=${boundaryFailed.join(" || ") || "none"}`);
console.log(`legal_review_flags=${legalReviewFlags.join(" || ") || "none"}`);

if (failures.length > 0) {
  console.error("verify-rcap-evaluator-all51-provability failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-evaluator-all51-provability: OK");
