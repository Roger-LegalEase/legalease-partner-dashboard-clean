#!/usr/bin/env node
/**
 * The current legal delta of proven packet families outside the owner approval.
 *
 * Some current COMPLETE_PACKET_PROVEN families are named in the decision
 * owner's completed-output legal approval (auth-2026-08-19). The others are
 * outside that approval's family list -- and the owner's
 * instruction is that being outside an older family list is NOT itself proof of
 * a substantive legal change. Most of these families implement a legal design
 * that is already settled; they were built by a later generator than the one the
 * approval enumerated.
 *
 * This record classifies each current out-of-approval family into exactly one of four buckets and
 * consolidates the questions, so the owner reads a handful of distinct legal
 * questions rather than one memo per family.
 *
 *   A TECHNICAL_ONLY_EXISTING_DESIGN        renders the bound official form; the
 *                                           delta is confined to the approval's
 *                                           own correctionsNotRequiringANewLegalDecision
 *   B BATCH_OWNER_ADOPTION_READY            platform-authored output faithful to
 *                                           a settled design; one consolidated
 *                                           family-level owner adoption covers it
 *   C SUBSTANTIVE_COUNSEL_REVIEW_REQUIRED   an exact change to remedy, eligibility,
 *                                           filing, venue, service, official-form
 *                                           strategy or substantive legal language
 *   D WRONG_DELIVERY_TYPE_OR_UNRESOLVED     no approval is possible until an exact
 *                                           product-treatment decision is made
 *
 * WHAT THIS RECORD DOES NOT DO. It creates no approval. It marks no family
 * approved. It edits no packet, opens no route, and consumes nothing. It names
 * the treatment each family needs; the decision owner decides.
 *
 * THE TEST. For each family the script resolves the settled legal design, then
 * measures whether the rendered output asserts anything the design does not
 * contain: the memo is flattened into a string corpus, every fragment of 30
 * characters or more that the corpus already holds is deleted from the
 * normalised text of the family's canonical PDF and participant-instructions.md,
 * and the residue of 60 characters or more is what the packet adds. Residue that
 * is captions and scaffolding means the packet asserts only what the design
 * holds. Substantive residue is quoted. Two structural traps are checked for
 * every family: components a field map declares that rendered-artifacts.json
 * omits, and a caption or recipient that contradicts the route's destination.
 *
 * MEASURED VERSUS ADJUDICATED. Every number below is measured per family by this
 * script. The bucket C and D determinations additionally rest on readings of the
 * design records, recorded in ADJUDICATIONS with the exact quotation each rests
 * on, because whether an assertion is substantive is a reading and not a
 * computation. Anything not adjudicated is classified from the measurements.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-proven-family-legal-delta.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const abs = (rel) => path.join(ROOT, rel);
const read = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const exists = (rel) => fs.existsSync(abs(rel));
const OUT = "data/rcap-grade-a/legal-decisions/PROVEN_FAMILY_LEGAL_DELTA_2026-09-02.json";

const COHORT = "data/rcap-grade-a/FIRST_ROUTE_COHORT.json";
const MASTER_QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const CENSUS_ROOT = "data/rcap-all50/overlays/census-v1";
const INTAKE = "data/record-clearing/legal-design-intake";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const NATIONAL = "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json";
const RATIFICATION = "data/record-clearing/legal-decisions/route-ratification-registry.json";
const CENSUS_ROUTES = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const AUTH_QUEUE = "data/rcap-authorization-queue.json";

const sha256 = (rel) => crypto.createHash("sha256").update(fs.readFileSync(abs(rel))).digest("hex");
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const nz = (s) => ` ${String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

/* ---------------------------------------------------------------- inputs */

const cohort = read(COHORT);
const rowsById = new Map(cohort.allRows.map((r) => [r.familyId, r]));
const families = cohort.provenFamiliesNeedingANewLegalReview.map((r) => r.familyId);
const queueRowsById = new Map(read(MASTER_QUEUE).families.map((r) => [r.familyId, r]));
const NINE_COUNTERS = [
  "knownRequiredFieldsMissing",
  "requiredFactsNotCollected",
  "unclassifiedBlanks",
  "incompleteRows",
  "requiredOptionsMissing",
  "requiredComponentsMissing",
  "invisibleWrites",
  "protectedWrites",
  "visualDefects"
];

const readBlockingBuildFindings = (dir, familyId) => {
  const findingsPath = `${dir}/build-findings.json`;
  if (exists(findingsPath)) return read(findingsPath).blocking ?? [];

  // Modern official-form builders emit reports/build-summary.json rather than
  // the legacy build-findings shape.  The summary identifies the build; the
  // current generated queue supplies the later independent, terminal proof.
  const summaryPath = `${dir}/reports/build-summary.json`;
  if (!exists(summaryPath)) throw new Error(`no build findings or build summary for family ${familyId}`);
  const summary = read(summaryPath);
  if (summary.familyId !== familyId) throw new Error(`build summary family mismatch for ${familyId}`);

  const queueRow = queueRowsById.get(familyId);
  if (!queueRow || queueRow.state !== "COMPLETE_PACKET_PROVEN") {
    throw new Error(`modern build evidence is not terminal for family ${familyId}`);
  }
  if (queueRow.allNineCountersZero !== true || (queueRow.failingCounters ?? []).length !== 0) {
    throw new Error(`modern build evidence has incomplete counters for family ${familyId}`);
  }
  for (const counter of NINE_COUNTERS) {
    const value = queueRow.counters?.[counter];
    if (!Number.isFinite(value) || value !== 0) {
      throw new Error(`modern build evidence counter ${counter} is not zero for family ${familyId}`);
    }
  }
  if (queueRow.selectedIndependentVerdict?.verdict !== "PASS_COMPLETE_INDEPENDENT") {
    throw new Error(`modern build evidence lacks current independent verification for family ${familyId}`);
  }
  return [];
};

const approval = (() => {
  const q = read(AUTH_QUEUE);
  const e = (q.entries ?? []).find((x) => x.id === "auth-2026-08-19-owner-legal-approval-completed-output");
  if (!e) throw new Error("owner approval auth-2026-08-19-owner-legal-approval-completed-output not in the authorization queue");
  return e;
})();
const TECHNICAL_CORRECTIONS = approval.correctionsNotRequiringANewLegalDecision ?? [];
const SUBSTANTIVE_TRIGGERS = approval.requiresANewDecisionOwnerDecision ?? [];

/* family id -> census-v1 directory (the directory name is the family id
 * lower-cased with the delivery type appended after a double dash). */
const dirIndex = new Map();
for (const st of fs.readdirSync(abs(CENSUS_ROOT))) {
  const stDir = path.join(CENSUS_ROOT, st);
  if (!fs.statSync(abs(stDir)).isDirectory()) continue;
  for (const fam of fs.readdirSync(abs(stDir))) {
    const core = fam.includes("--") ? fam.slice(0, fam.lastIndexOf("--")) : fam;
    dirIndex.set(norm(core), path.join(stDir, fam));
  }
}

const registryTracks = read(TRACK_REGISTRY).tracks;
const registryByTrack = new Map(registryTracks.map((t) => [`${String(t.jurisdiction).toUpperCase()}|${norm(t.trackId)}`, t]));

const memos = new Map();
for (const f of fs.readdirSync(abs(INTAKE))) {
  if (!f.endsWith(".memo.json")) continue;
  const st = f.split(".")[0].toUpperCase();
  memos.set(st, { path: `${INTAKE}/${f}`, sha256: sha256(`${INTAKE}/${f}`), memo: read(`${INTAKE}/${f}`) });
}
const memoTrack = new Map();
for (const [st, m] of memos) for (const t of m.memo.tracks ?? []) memoTrack.set(`${st}|${norm(t.trackId)}`, t);

const national = read(NATIONAL);
const nationalByTrack = new Map();
for (const q of national.questionDecisions ?? []) {
  const k = `${q.jurisdiction}|${norm(q.trackId)}`;
  if (!nationalByTrack.has(k)) nationalByTrack.set(k, []);
  nationalByTrack.get(k).push(q);
}
for (const r of national.researchTrackDecisions ?? []) {
  const k = `${r.jurisdiction}|${norm(r.trackId)}`;
  if (!nationalByTrack.has(k)) nationalByTrack.set(k, []);
  nationalByTrack.get(k).push({ reportQuestionId: "researchTrackDecision", affectedElement: "governing_mechanism", holding: r.productDisposition?.text ?? null });
}

const ratification = new Map(read(RATIFICATION).routes.map((r) => [norm(r.routeKey), r]));
const censusRoutes = new Map(read(CENSUS_ROUTES).routes.map((r) => [r.routeKey, r]));

/* The runtime route-authority contracts. For a route with no state-memo track
 * these carry the settled design: the decision id, the outcome mode, the packet
 * family the contract names, and the statute. */
const ROUTE_AUTHORITY_DIR = "src/lib/legal-authority/routes";
const routeAuthority = new Map();
const routeAuthorityFiles = [];
for (const f of fs.readdirSync(abs(ROUTE_AUTHORITY_DIR)).sort()) {
  if (!f.endsWith(".json")) continue;
  const rel = `${ROUTE_AUTHORITY_DIR}/${f}`;
  const doc = read(rel);
  let list = Array.isArray(doc) ? doc : doc.routes;
  if (list && !Array.isArray(list)) list = Object.values(list);
  if (!Array.isArray(list)) continue;
  let used = false;
  for (const r of list) {
    if (!r || typeof r !== "object" || !r.routeKey || routeAuthority.has(r.routeKey)) continue;
    routeAuthority.set(r.routeKey, { ...r, sourceFile: rel });
    used = true;
  }
  if (used) routeAuthorityFiles.push({ path: rel, sha256: sha256(rel) });
}

const DESIGN_SOURCES = {
  stateMemos: INTAKE,
  trackRegistry: { path: TRACK_REGISTRY, sha256: sha256(TRACK_REGISTRY) },
  nationalLegalDecisions: { path: NATIONAL, sha256: sha256(NATIONAL) },
  routeRatificationRegistry: { path: RATIFICATION, sha256: sha256(RATIFICATION) },
  routeObligationCensus: { path: CENSUS_ROUTES, sha256: sha256(CENSUS_ROUTES) },
  routeAuthorityContracts: routeAuthorityFiles
};

/* ------------------------------------------------------- the residue test */

const flatten = (o, out = []) => {
  if (o === null || o === undefined) return out;
  if (typeof o === "string") out.push(o);
  else if (Array.isArray(o)) for (const v of o) flatten(v, out);
  else if (typeof o === "object") for (const [k, v] of Object.entries(o)) { out.push(k); flatten(v, out); }
  else out.push(String(o));
  return out;
};

const K = 30;
const gramCache = new Map();
const gramsFor = (st) => {
  if (gramCache.has(st)) return gramCache.get(st);
  const parts = [];
  if (memos.has(st)) flatten(memos.get(st).memo, parts);
  flatten(registryTracks.filter((t) => String(t.jurisdiction).toUpperCase() === st), parts);
  flatten((national.questionDecisions ?? []).filter((q) => q.jurisdiction === st), parts);
  flatten((national.researchTrackDecisions ?? []).filter((r) => r.jurisdiction === st), parts);
  const corpus = nz(parts.join(" \n "));
  const set = new Set();
  for (let i = 0; i + K <= corpus.length; i += 1) set.add(corpus.slice(i, i + K));
  const v = { corpus, set };
  gramCache.set(st, v);
  return v;
};

/* Delete every fragment the design corpus already holds; what survives is what
 * the packet adds. Runs shorter than 60 characters are word-level noise. */
const residue = (text, grams, minRun = 60) => {
  const t = nz(text);
  const kept = [];
  let cur = "";
  let i = 0;
  while (i < t.length) {
    if (i + K <= t.length && grams.has(t.slice(i, i + K))) {
      let j = i + K;
      while (j < t.length && grams.has(t.slice(j - K + 1, j + 1))) j += 1;
      if (cur) { kept.push(cur); cur = ""; }
      i = j;
    } else { cur += t[i]; i += 1; }
  }
  if (cur) kept.push(cur);
  return kept.map((r) => r.trim()).filter((r) => r.length >= minRun);
};

const pdfText = (rel) => {
  try { return execFileSync("pdftotext", ["-layout", abs(rel), "-"], { encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch { return ""; }
};

/* Fixture identity and generator scaffolding. Residue made only of these is the
 * packet describing itself, not asserting law. */
const SCAFFOLD = [
  /jordan avery reyes/, /example\.?\s?org/, /jordan reyes/, /555 0142/, /1991 04 17/,
  /the blank on the form/, /dotted blank/, /certificate of service/, /printed name/, /mailing address/,
  /what this packet is/, /what is in this packet/, /the pages in this set/, /sign and date/,
  /the platform never signs/, /no source this packet is built from/, /things the platform deliberately left blank/,
  /component what it is/, /participant and reviewer instructions/, /deterministic review fixtures/,
  /what you do in order/, /when to stop and get help/, /page \d+ of \d+/
];

/* ----------------------------------------------------------- the two traps */

const INSTRUMENT_ROLE = /([a-z_]+):\s*([A-Za-z0-9_\-.]+)/g;

const declaredComponents = (fieldMap) => {
  const declared = new Map();
  for (const c of fieldMap.componentSet ?? []) declared.set(c, "componentSet");
  const selections = []
    .concat(Array.isArray(fieldMap.routeSelectionsMade) ? fieldMap.routeSelectionsMade : [])
    .concat(Array.isArray(fieldMap.routeDeterminedSelections) ? fieldMap.routeDeterminedSelections : []);
  for (const sel of selections) {
    if (!sel || typeof sel.instrument !== "string") continue;
    for (const m of sel.instrument.matchAll(INSTRUMENT_ROLE)) {
      if (!declared.has(m[2])) declared.set(m[2], `roleDeclared:${m[1]}`);
    }
  }
  for (const c of Object.keys(fieldMap.componentRoutes ?? {})) if (!declared.has(c)) declared.set(c, "componentRoutes");
  return declared;
};

const renderedComponents = (rendered) => {
  const set = new Set(rendered.componentSet ?? []);
  for (const a of rendered.artifacts ?? []) for (const k of ["componentId", "component", "id", "documentId"]) if (a?.[k]) set.add(String(a[k]));
  for (const p of rendered.pdfs ?? []) if (p?.documentId) set.add(String(p.documentId));
  return set;
};

const COURT_SIGNAL = /\b(in the .{0,80}court|superior court|district court|circuit court|county court|court of common pleas|clerk of (the )?court|magistrate|municipal court|justice court|to the honorable)\b/i;
const PROSECUTOR_SIGNAL = /\b(prosecut|district attorney|solicitor|commonwealth'?s attorney|county attorney|state'?s attorney|attorney general)\b/i;
const AGENCY_SIGNAL = /\b(bureau|department of|state police|sheriff|records division|identification|sled|gbi|osbi|dps|dmv|facility)\b/i;
/* A clerk destination is a court destination: the clerk is the court's filing
 * office, so a court caption on a clerk route is not a contradiction. */
const DESTINATION_FAMILY = { court: "court", clerk: "court", prosecutor: "prosecutor", agency: "agency", automatic: "automatic" };

/* ----------------------- assertions the design record does not carry ------- */

const CITATION = /(?<![\d.\-])\d{1,3}[A-Za-z]?(?:[-.]\d+[A-Za-z]?){1,4}(?:\([a-zA-Z0-9]+\))*/g;
const MONEY = /\$\s?([\d,]+(?:\.\d\d)?)/g;
const DURATION = /\b(\d{1,3})[- ](year|month|day)s?\b/gi;
const PHONE = /^\d{3}[-.]\d{4}$|^\d{3}[-.]\d{3}[-.]\d{4}$|^1-\d/;
const DATEISH = /^(19|20)\d\d[-./]/;
const moneyKey = (a) => { const v = a.replace(/,/g, ""); return v.endsWith(".00") ? v.slice(0, -3) : v; };

const unsourcedAssertions = (surfaces, corpus) => {
  const cites = new Set(); const money = new Set(); const durations = new Set();
  for (const m of corpus.matchAll(CITATION)) cites.add(norm(m[0]));
  for (const m of corpus.matchAll(MONEY)) money.add(moneyKey(m[1]));
  for (const m of corpus.matchAll(DURATION)) durations.add(`${m[1]}|${m[2].toLowerCase()}`);
  const low = corpus.toLowerCase();
  const found = [];
  for (const [surface, text] of Object.entries(surfaces)) {
    const seen = new Set();
    for (const m of text.matchAll(CITATION)) {
      const c = m[0].trim();
      if (PHONE.test(c) || DATEISH.test(c) || norm(c).length < 4 || cites.has(norm(c)) || seen.has(c)) continue;
      seen.add(c); found.push({ kind: "citation", value: c, surface });
    }
    for (const m of text.matchAll(MONEY)) {
      const k = moneyKey(m[1]);
      if (money.has(k) || low.includes(k) || seen.has(`$${k}`)) continue;
      seen.add(`$${k}`); found.push({ kind: "money", value: m[0].trim(), surface });
    }
    for (const m of text.matchAll(DURATION)) {
      const k = `${m[1]}|${m[2].toLowerCase()}`;
      if (durations.has(k) || seen.has(k)) continue;
      seen.add(k); found.push({ kind: "duration", value: m[0].trim(), surface });
    }
  }
  return found;
};

/* ------------------------------------------------------------ adjudications
 *
 * Read, not computed. Each entry quotes the design record or the family's own
 * build record that the determination rests on. Everything absent from this
 * table is classified from the measurements alone.
 */
const Q = {
  GUIDANCE_ONLY_ROUTE: {
    id: "Q1-route-treatment-guidance-or-packet",
    question:
      "Counsel's route-ratification registry records this route's approved service behaviour for this release as guidance only, or as deliberately out of scope, while a complete packet family exists for it. Is the completed packet the approved treatment for this route, or does the guidance-only / out-of-scope determination stand and the family remain an internal review fixture?"
  },
  REFERRAL_OR_PETITION: {
    id: "Q2-composed-petition-or-attorney-referral",
    question:
      "The compiled profile routes this fact pattern to legal aid or an attorney while the committed route contract names a composed participant petition. Is a composed draft the right deliverable at all, or must the family become referral guidance only?"
  },
  OFFICIAL_FORM_MAY_GOVERN: {
    id: "Q3-official-form-supersedes-composed-instrument",
    question:
      "The design record's own release blocker leaves open whether an official form governs this filing. If the issuing court or agency publishes one, it governs by localFormOverride and this composed instrument becomes a covering document or is withdrawn. Is the composed instrument the approved output, and what happens to it when the official form is located?"
  },
  FEE_FIGURE_PUBLISHED: {
    id: "Q4-publishing-a-filing-fee-the-design-declines-to-publish",
    question:
      "The controlling design rule for this route directs the participant to the clerk or agency without a figure, or records the figure as unconfirmed and release-blocking. The rendered packet publishes a figure. May the packet state this amount, or must it carry the design's refusal?"
  },
  UNSOURCED_TIMING: {
    id: "Q5-timing-rule-with-no-source-in-the-design",
    question:
      "The rendered participant instructions state a filing or decision timing rule that appears in no design record, no controlling decision and not on the bound official form. Is that rule correct, and may the packet state it?"
  },
  CORRECTED_AWAITING_RECONFIRMATION: {
    id: "Q6-corrected-wait-anchor-and-gates-not-reconfirmed",
    question:
      "Counsel's ratification registry records this route as built with a corrected waiting period, anchor and gates that counsel has not reconfirmed. Does the completed output implement the corrected rule counsel intended?"
  },
  COMPONENT_DELIBERATELY_ABSENT: {
    id: "Q7-required-component-deliberately-absent",
    question:
      "A component the family's own record names as required is deliberately not rendered, and the family ships without it. Is the reduced packet shape the approved delivery for this family, or must the family remain unapproved until the missing component is built?"
  },
  INSTRUMENT_VOCABULARY_DISAGREES: {
    id: "Q8-records-disagree-on-whether-this-family-carries-a-filing-instrument",
    question:
      "Two committed records disagree about whether this family carries a custom-pleading instrument: one names the motion as an instrument of the family, the other carries a guidance-only component set with the motion branch unavailable and records the branch as a legal-design blocker. Which record governs the family's delivery?"
  }
};

const ADJUDICATIONS = {
  /* D - product treatment. Counsel ratified the route as guidance-only or out of
   * scope; a complete packet family nevertheless exists for it. */
  "ak-mistaken-identity-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: AK:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180 = intentional_unsupported (\"Deliberately out of scope.\")" },
  "dc_seal_conviction-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: DC:dc_motion_seal_felony_conviction_8yr_16_806 and DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806 = intentional_unsupported" },
  "dc_seal_nonconviction-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: DC:dc_motion_seal_nonconviction_16_806 = intentional_unsupported" },
  "ky_felony_vacatur_expungement-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: KY:felony-conviction-431073 = intentional_unsupported, basis \"Lawrence named substantive gate required before selling\"" },
  "md_second_chance_shielding-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: MD:second-chance-act-shielding = intentional_unsupported, basis \"Lawrence named substantive gate required before selling\"" },
  "ma-expunge-mj-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: MA:marijuana-only-expungement = held_guidance (\"Held to substantive guidance only. Not a packet route.\")" },
  "ne-expunge-le-error-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: NE:law-enforcement-error-expungement = held_guidance" },
  "nj_clean_slate-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: NJ:clean-slate-petition-under-n-j-s-a-2c-52-5-3 = held_guidance" },
  "or_conviction_setaside-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: OR:marijuana-specific-set-aside-redesignation = held_guidance" },
  "pa_9122_1_limited_access-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: PA:path-i-petition-for-limited-access = approved_release_guidance (\"no paid court packet opens for this route\")" },
  "pa_age70_deceased-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: PA:path-e-age-70-expungement and PA:path-f-deceased-person-expungement = approved_release_guidance" },
  "pa_summary_conviction-set": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "route-ratification-registry: PA:path-c-summary-conviction-expungement = approved_release_guidance" },
  "composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement": { bucket: "D", q: Q.GUIDANCE_ONLY_ROUTE, basis: "two controlling records disagree on the product treatment. route-ratification-registry: PA:path-k-human-trafficking-vacatur-expungement = approved_release_guidance, basis \"Roger Roman and the LegalEase legal team approved state-specific guidance as the complete service behavior for this release; no paid court packet opens for this route\". The route-authority contract in src/lib/legal-authority/routes/route-splits.json (decisionId LD-PA-03) says outcomeMode participant_packet, packetFamily \"Pennsylvania § 3019 Trafficking Vacatur and Expungement Packet\". The family renders that packet." },

  "composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247": { bucket: "D", q: Q.REFERRAL_OR_PETITION, basis: "the family's own approval-request.json: \"The compiled profile routes this fact pattern to legal aid or an attorney. This packet composes the petition and puts that instruction first. Confirm that a composed draft is the right deliverable here at all, or direct that it become referral guidance only.\"" },
  "composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement": { bucket: "D", q: Q.REFERRAL_OR_PETITION, basis: "the family's own build-findings.json records the compiled South Dakota pathway as saying the route \"should be routed to legal aid or an attorney\" against a committed contract note \"Do not preserve the prior blanket attorney-referral treatment for an otherwise complete intake\"; approval-request.json asks counsel to \"Confirm that reading of the two records together\". No SD.memo track carries this route." },

  "in_infraction_nondisclosure-set": { bucket: "D", q: Q.COMPONENT_DELIBERATELY_ABSENT, basis: "the family's own approval-request.json: \"The stage-2 verified petition is deliberately absent: the release gates ... are open and the component's dependency record prohibits drafting until they close ... the family then needs a second build that adds the petition\", and \"Confirm the guidance-only packet shape is acceptable for this family at state_built\"" },
  "ct-nolle-auto-set": { bucket: "D", q: Q.INSTRUMENT_VOCABULARY_DISAGREES, basis: "the family's own approval-request.json: \"The MASTER_QUEUE row's instrument list names the (c)(2) motion as a custom_pleading instrument while the manifest and memo carry a guidance-only component set with the motion branch unavailable\", the branch itself being \"the record's own legal_design_blocker\"" },

  /* C - substantive. Each rests on an exact quotation from the design record. */
  "sc_17_22_950_summary-set": {
    bucket: "C", q: Q.UNSOURCED_TIMING,
    delta: "participant-instructions.md states \"If no objection is filed, the trial judge signs the order no sooner than 31 and no later than 40 days after notice\", and a stop condition turns on \"no signed order appears within the 40-day window\".",
    basis: "SC.memo records only the two statutory periods -- § 17-22-950(C)'s window of no sooner than the appeal expiration date and no later than thirty days after it, and the thirty-day objection window of § 17-22-950(F). Neither \"31\" nor \"40\" nor \"forty\" appears anywhere in SC.memo, in the track registry, in the national legal decision report overlay, or in the rendered SCCA 223E form text."
  },
  "ms-fel-set": {
    bucket: "C", q: Q.FEE_FIGURE_PUBLISHED,
    delta: "The rendered packet states \"Miss. Code Ann. Sec. 99-19-72 levies a filing fee of ONE HUNDRED FIFTY DOLLARS ($150.00) on each petition to expunge an offense under Sec. 99-19-71\" and its distribution, as this route's cost.",
    basis: "MS.memo rules.fees for ms-fel reads \"No amount is published here ... the section's current text could not be retrieved on this pass, so the participant confirms the amount with the circuit clerk before filing\", and the fee's reach is carried as a release_blocker on filing_process. The family's own approval-request.json records the decision as taken by the build: \"THE FEE QUESTION, RAISED RATHER THAN DECIDED ... This build states the $150 for this route\". Its five sibling MS families carry the refusal instead."
  },
  "ut_pet_limitations-set": {
    bucket: "C", q: Q.FEE_FIGURE_PUBLISHED,
    delta: "participant-instructions.md states \"The BCI application fee is $65.00, and it is non-refundable\" as fact, sourced to the BCI application bound into the packet.",
    basis: "UT.memo ut_pet_limitations carries the unresolved question \"What are the current BCI application and issuance fees? The statute sets them through the Section 63J-1-504 process rather than by number, and the secondary figures of 65 dollars each are unconfirmed\", impact release_blocker, affectedElement participant_instructions. The instructions also name the fee-waiver instrument (Utah court form 1305GE under Utah Code 78A-2-302 and CJA Rule 4-508); neither citation nor the form number appears in UT.memo."
  },
  "ut_pet_traffic-set": {
    bucket: "C", q: Q.FEE_FIGURE_PUBLISHED,
    delta: "participant-instructions.md names the fee-waiver instrument as Utah court form 1305GE under Utah Code 78A-2-302 and Code of Judicial Administration Rule 4-508, and carries the cover-sheet fee figures.",
    basis: "UT.memo ut_pet_traffic carries the unresolved question \"What is the current court filing fee for an expungement petition under Utah Code 78A-2-301, in district and in justice court? The Utah Courts page defers to the cover sheet rather than publishing a figure\", impact release_blocker, affectedElement participant_instructions, and rules.fees says \"the packet does not quote one. The exact current amount is an open release-blocking question\". Neither 78A-2-302, nor Rule 4-508, nor form 1305GE appears in UT.memo."
  },
  "composed-treatment:nd-nonconviction-auto-close-verify": {
    bucket: "C", q: Q.CORRECTED_AWAITING_RECONFIRMATION,
    delta: "The family renders a day-62 written clerk correction request and an original-case enforcement motion on the two failure-disposition branches of the route.",
    basis: "route-ratification-registry: ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05 = corrected_awaiting_reconfirmation (\"Built with corrected wait, anchor and gates; counsel has not reconfirmed. Payment stays shut.\"). No ND.memo track carries the nd_still_public_day_62 branches; their design is the route-obligation census row and decision records CLD-2026-08-28-ND-NONCONV / LA-IMM-03."
  },
  "ga-jail-k2-set": {
    bucket: "C", q: Q.OFFICIAL_FORM_MAY_GOVERN,
    delta: "The family renders a participant-signed § 35-3-37(k)(2) written request to the booking facility as the statewide output, modelled with localFormOverride and an ask-the-facility-first instruction.",
    basis: "the family's own approval-request.json: \"Is the generated participant-signed § 35-3-37(k)(2) request letter the controlling output statewide, or must it yield to a facility's own published form where one exists?\""
  },
  "ma-bmc-multi-set": {
    bucket: "C", q: Q.OFFICIAL_FORM_MAY_GOVERN,
    delta: "The family renders a composed consolidated multi-record petition for the Boston Municipal Court.",
    basis: "the family's own approval-request.json: \"Whether the Boston Municipal Court publishes a dedicated form for the consolidated multi-record petition -- the record's own release blocker on correct_form. If one exists, it governs (localFormOverride) and this composed petition becomes the covering instrument or is withdrawn\", and \"The Batch 2 resolution permits 'a counsel-approved custom consolidated petition'. This composed petition is the candidate for that approval; nothing here asserts it.\""
  },
  "vt_seal_under_25-set": {
    bucket: "C", q: Q.OFFICIAL_FORM_MAY_GOVERN,
    delta: "The family renders a composed § 5119(g) application where the Vermont Judiciary publishes no form.",
    basis: "the family's own approval-request.json: \"Whether the composed § 5119(g) application is sufficient where the Judiciary publishes no form -- and, should the Judiciary publish one, whether the packet should become a completed official form instead (the recorded release blocker).\""
  }
};

/* ----------------------------------------------------------------- measure */

const rows = [];
for (const familyId of families) {
  const row = rowsById.get(familyId);
  const dir = dirIndex.get(norm(familyId));
  if (!dir) throw new Error(`no census-v1 directory for family ${familyId}`);
  const st = String(row.jurisdiction).toUpperCase();

  const fieldMapPath = `${dir}/production-field-map.json`;
  const renderedPath = `${dir}/reports/rendered-artifacts.json`;
  const fieldMap = read(fieldMapPath);
  const rendered = read(renderedPath);
  const sourceReceipt = read(`${dir}/source-receipt.json`);
  const approvalRequest = read(`${dir}/approval-request.json`);
  const blockingBuildFindings = readBlockingBuildFindings(dir, familyId);
  const buildStatus = exists(`${dir}/build-status.json`) ? read(`${dir}/build-status.json`) : null;
  const implementation = fieldMap.implementationStrategy ?? sourceReceipt.implementationStrategy ?? row.deliveryType;

  /* design records */
  const designRecords = [];
  if (memos.has(st)) designRecords.push({ role: "state_legal_design_memo", path: memos.get(st).path, sha256: memos.get(st).sha256 });
  designRecords.push({ role: "legal_design_track_registry", ...DESIGN_SOURCES.trackRegistry });

  const tracks = [];
  let anyDesign = false;
  for (const routeKey of row.routeKeys) {
    const parts = routeKey.split(":");
    const trackId = parts[3] ?? null;
    const key = `${st}|${norm(trackId)}`;
    const mt = memoTrack.get(key) ?? null;
    const rt = registryByTrack.get(key) ?? null;
    const nat = nationalByTrack.get(key) ?? [];
    const censusRow = censusRoutes.get(routeKey) ?? null;
    const ratKeys = [parts[2] && parts[3] ? `${parts[2]}:${parts[3]}` : null, parts[2] && parts[4] ? `${parts[2]}:${parts[4]}` : null].filter(Boolean);
    const rat = ratKeys.map((k) => ratification.get(norm(k))).find(Boolean) ?? null;
    const auth = ratKeys.map((k) => routeAuthority.get(k)).find(Boolean) ?? null;
    const design = mt ?? rt ?? null;
    const resolvedBy = mt ? "state_memo.trackId"
      : rt ? "track_registry.trackId"
      : auth ? "route_authority_contract"
      : censusRow ? "route_obligation_census_row"
      : null;
    if (resolvedBy) anyDesign = true;
    tracks.push({
      routeKey,
      trackId,
      settledDesignResolvedBy: resolvedBy,
      designOutputStrategy: design?.outputStrategy ?? censusRow?.currentOutputStrategy ?? null,
      designOutputStrategyStatus: design?.outputStrategyStatus ?? null,
      designDestinationKind: design?.destination?.kind ?? null,
      designDestinationName: design?.destination?.name ?? censusRow?.destination ?? null,
      censusInstrument: censusRow?.participantFacingInstrument ?? null,
      censusLegalDecisionRecordIds: censusRow?.legalDecisionRecordIds ?? [],
      nationalDecisionsOnThisTrack: nat.map((q) => q.reportQuestionId ?? q.registerQuestionId ?? null).filter(Boolean),
      routeRatification: rat ? { routeKey: rat.routeKey, status: rat.status, legalBasis: rat.legalBasis ?? null } : null,
      routeAuthorityContract: auth
        ? { routeKey: auth.routeKey, sourceFile: auth.sourceFile, decisionId: auth.decisionId ?? null, outcomeMode: auth.outcomeMode ?? null, packetFamily: auth.packetFamily ?? auth.mechanism ?? null, statute: auth.statute ?? null }
        : null,
      designReleaseBlockers: (design?.unresolvedQuestions ?? [])
        .filter((q) => q.impact === "release_blocker")
        .map((q) => ({ affectedElement: q.affectedElement, question: q.question }))
    });
  }
  if (tracks.some((t) => t.censusLegalDecisionRecordIds.length)) {
    designRecords.push({ role: "route_obligation_census", ...DESIGN_SOURCES.routeObligationCensus });
  }
  if (tracks.some((t) => t.nationalDecisionsOnThisTrack.length)) {
    designRecords.push({ role: "national_legal_decision_overlay", ...DESIGN_SOURCES.nationalLegalDecisions });
  }
  if (tracks.some((t) => t.routeRatification)) {
    designRecords.push({ role: "route_ratification_registry", ...DESIGN_SOURCES.routeRatificationRegistry });
  }
  for (const rel of [...new Set(tracks.map((t) => t.routeAuthorityContract?.sourceFile).filter(Boolean))]) {
    designRecords.push({ role: "route_authority_contract", path: rel, sha256: sha256(rel) });
  }

  /* output proof */
  const canonicalPdfs = fs.existsSync(abs(`${dir}/fixtures`))
    ? fs.readdirSync(abs(`${dir}/fixtures`)).filter((f) => f.endsWith(".pdf") && f.includes("canonical")).sort().map((f) => `${dir}/fixtures/${f}`)
    : [];
  const instructionsPath = `${dir}/participant-instructions.md`;
  const outputProof = {
    renderedArtifacts: { path: renderedPath, sha256: sha256(renderedPath) },
    productionFieldMap: { path: fieldMapPath, sha256: sha256(fieldMapPath) },
    participantInstructions: { path: instructionsPath, sha256: sha256(instructionsPath) },
    canonicalPdfs: canonicalPdfs.map((p) => ({ path: p, sha256: sha256(p) })),
    independentVerification: row.independentVerification ?? null
  };

  /* trap 1: declared but not rendered */
  const declared = declaredComponents(fieldMap);
  const renderedSet = renderedComponents(rendered);
  const declaredButUnrendered = [...declared.entries()]
    .filter(([c]) => !renderedSet.has(c))
    .map(([component, declaredBy]) => ({ component, declaredBy }));

  /* trap 2: caption against destination */
  const pdfAll = canonicalPdfs.map((p) => pdfText(p)).join("\n");
  const instructions = fs.readFileSync(abs(instructionsPath), "utf8");
  /* Whitespace is normalised before the caption is read: pdftotext breaks a
   * caption across lines, and "in the Superior\nCourt" is a court caption. */
  const head = pdfAll.split("\n").slice(0, 60).join(" ").replace(/\s+/g, " ");
  const captionSignals = [];
  if (COURT_SIGNAL.test(head)) captionSignals.push("court");
  if (PROSECUTOR_SIGNAL.test(head)) captionSignals.push("prosecutor");
  if (AGENCY_SIGNAL.test(head)) captionSignals.push("agency");
  const destinationFamilies = [...new Set(tracks.map((t) => DESTINATION_FAMILY[t.designDestinationKind] ?? t.designDestinationKind).filter(Boolean))];
  const captionContradictsDestination =
    destinationFamilies.length > 0 && captionSignals.length > 0 &&
    !destinationFamilies.includes("automatic") &&
    destinationFamilies.every((d) => !captionSignals.includes(d));

  /* the residue test */
  const { corpus, set: grams } = gramsFor(st);
  const pdfResidue = residue(pdfAll, grams);
  const instructionsResidue = residue(instructions, grams);
  const allResidue = [...pdfResidue, ...instructionsResidue];
  const substantiveResidue = allResidue.filter((r) => !SCAFFOLD.some((p) => p.test(r)));

  /* assertions with no source in the design corpus. On an official_pdf_fill
   * family the PDF is the state's own form, so only the platform-authored
   * instructions are read as platform assertions. */
  const surfaces = implementation === "official_pdf_fill"
    ? { instructions }
    : { instructions, pdf: pdfAll };
  const unsourced = unsourcedAssertions(surfaces, corpus);

  const adjudication = ADJUDICATIONS[familyId] ?? null;

  /* classification */
  let bucket;
  let rationale;
  if (adjudication) {
    bucket = adjudication.bucket;
    rationale = adjudication.basis;
  } else if (!anyDesign) {
    bucket = "D";
    rationale = "no settled legal design record could be resolved for any of this family's routes";
  } else if (declaredButUnrendered.length > 0) {
    bucket = "C";
    rationale = `the production field map declares ${declaredButUnrendered.length} component(s) that rendered-artifacts.json does not carry`;
  } else if (captionContradictsDestination) {
    bucket = "C";
    rationale = `the rendered caption addresses ${captionSignals.join("/")} on a route whose design destination is ${destinationFamilies.join("/")}`;
  } else if (implementation === "official_pdf_fill") {
    bucket = "A";
    rationale = "the rendered artifact is the official form bound by source-receipt.json; the platform-authored surfaces surface that form's own text and packet scaffolding, so the delta is confined to renderer wiring, field mapping, flattening and caption correction";
  } else {
    bucket = "B";
    rationale = "the completed output is platform-authored prose faithful to a settled design record; the words are the platform's, so one consolidated family-level owner adoption covers the family";
  }

  rows.push({
    familyId,
    jurisdiction: st,
    routeKeys: row.routeKeys,
    routeCount: row.routeCount,
    deliveryType: row.deliveryType,
    implementationStrategy: implementation,
    builtBy: buildStatus?.builtBy ?? null,
    legalDesignRecords: designRecords,
    tracks,
    outputProof,
    changeClassification: bucket,
    changeClassificationName: {
      A: "TECHNICAL_ONLY_EXISTING_DESIGN",
      B: "BATCH_OWNER_ADOPTION_READY",
      C: "SUBSTANTIVE_COUNSEL_REVIEW_REQUIRED",
      D: "WRONG_DELIVERY_TYPE_OR_UNRESOLVED"
    }[bucket],
    exactDelta: adjudication?.delta ?? rationale,
    classificationBasis: adjudication ? "adjudicated_by_reading_the_design_record" : "measured",
    rationale,
    recommendedApprovalTreatment: {
      A: "Cover in the consolidated technical annex: the corrections are named in the approval's own correctionsNotRequiringANewLegalDecision list and need no new legal decision.",
      B: "Cover by one consolidated family-level decision-owner adoption of the completed output. No counsel question is raised by this family.",
      C: "Hold for counsel review on the named question before any owner adoption. Do not include in a batch adoption.",
      D: "Hold for an exact product-treatment decision by the decision owner before any legal review is commissioned."
    }[bucket],
    substantiveQuestionForReviewer: bucket === "C" ? (adjudication?.q ?? null) : null,
    productTreatmentQuestion: bucket === "D" ? (adjudication?.q ?? null) : null,
    measurements: {
      designCorpusChars: corpus.length,
      canonicalPdfChars: pdfAll.length,
      participantInstructionsChars: instructions.length,
      residueRunsOverSixtyChars: allResidue.length,
      residueRunsAfterRemovingScaffolding: substantiveResidue.length,
      declaredComponents: declared.size,
      renderedComponents: renderedSet.size,
      declaredButUnrendered,
      designDestinationFamilies: destinationFamilies,
      captionSignals,
      captionContradictsDestination,
      assertionsWithNoSourceInTheDesignCorpus: unsourced,
      designReleaseBlockerCount: tracks.reduce((n, t) => n + t.designReleaseBlockers.length, 0),
      routeRatificationStatuses: [...new Set(tracks.map((t) => t.routeRatification?.status).filter(Boolean))],
      counselQuestionsRaisedAtBuild: (approvalRequest.counselQuestionsRaised ?? []).length,
      blockingBuildFindings: blockingBuildFindings.length
    }
  });
}

/* ---------------------------------------------------------- consolidation */

const counts = { A: 0, B: 0, C: 0, D: 0 };
for (const r of rows) counts[r.changeClassification] += 1;

const questionIndex = new Map();
for (const r of rows) {
  const q = r.substantiveQuestionForReviewer ?? r.productTreatmentQuestion;
  if (!q) continue;
  if (!questionIndex.has(q.id)) questionIndex.set(q.id, { ...q, bucket: r.changeClassification, families: [] });
  questionIndex.get(q.id).families.push(r.familyId);
}
const distinct = [...questionIndex.values()].sort((a, b) => a.id.localeCompare(b.id));

const noDesign = rows.filter((r) => r.tracks.every((t) => !t.settledDesignResolvedBy));

const documentCounts = (bucket) => {
  const sel = rows.filter((r) => r.changeClassification === bucket);
  return {
    families: sel.length,
    routes: sel.reduce((n, r) => n + r.routeKeys.length, 0),
    canonicalPdfDocuments: sel.reduce((n, r) => n + r.outputProof.canonicalPdfs.length, 0),
    participantInstructionDocuments: sel.length,
    renderedComponents: sel.reduce((n, r) => n + r.measurements.renderedComponents, 0)
  };
};

const record = {
  schemaVersion: "rcap-proven-family-legal-delta/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-proven-family-legal-delta.mjs",
  generatedOn: "2026-09-02",
  createsApproval: false,
  marksNoFamilyApproved: true,
  opensNoRoute: true,
  editsNoPacket: true,
  purpose:
    `Classify the ${rows.length} current COMPLETE_PACKET_PROVEN packet families that sit outside the decision owner's completed-output legal approval, so the owner reads a small number of distinct legal questions rather than ${rows.length} per-family memos.`,
  theOwnersInstruction:
    "Being outside the older approval's family list is not proof of a substantive legal change. Most of these families implement a legal design that is already settled and were built by a later generator than the one the approval enumerated.",
  approvalFramework: {
    approvalId: approval.id,
    decisionOwner: approval.decisionOwner ?? null,
    scopeStatement: approval.decisionScope?.statement ?? null,
    correctionsNotRequiringANewLegalDecision: TECHNICAL_CORRECTIONS,
    requiresANewDecisionOwnerDecision: SUBSTANTIVE_TRIGGERS,
    doesNotAuthorize: approval.doesNotAuthorize ?? []
  },
  method: {
    residueTest:
      "The state's legal-design memo, its track-registry projection and the national legal decision overlay for the jurisdiction are flattened into one string corpus. Every fragment of 30 normalised characters or more that the corpus already holds is deleted from the normalised text of the family's canonical PDF and participant-instructions.md. What survives in runs of 60 characters or more is what the packet adds to the design.",
    trapOne:
      "Components a production field map declares -- in componentSet, in componentRoutes, and in the role list of each routeSelectionsMade instrument string -- that reports/rendered-artifacts.json does not carry. A declared but unrendered mandatory official form is an official-form-strategy change.",
    trapTwo:
      "Each route's design destination kind against what the rendered packet is captioned to and who it addresses. A clerk destination is treated as a court destination, because the clerk is the court's filing office.",
    assertionTest:
      "Every statutory citation, currency amount and duration on a platform-authored surface is checked for a source in the design corpus. On an official_pdf_fill family the PDF is the state's own form, so only participant-instructions.md is read as a platform assertion.",
    whatIsMeasuredAndWhatIsRead:
      "Every figure in measurements is computed per family by this script. Bucket C and D determinations additionally rest on readings of the design records, carried in the generator's ADJUDICATIONS table with the exact quotation each rests on, because whether an assertion is substantive is a reading and not a computation.",
    fromTheOwnersRule:
      "Fee, waiver, service and self-help text verbatim from the design record surfaces the approved design rather than adding to it. The same text with no source in the design is substantive. Where a family is genuinely ambiguous it is classified C, because wrongly claiming coverage attaches an approval to something nobody approved while wrongly withholding it costs only a review."
  },
  legalDesignSources: DESIGN_SOURCES,
  counts: {
    familiesClassified: rows.length,
    byBucket: counts,
    bucketNames: {
      A: "TECHNICAL_ONLY_EXISTING_DESIGN",
      B: "BATCH_OWNER_ADOPTION_READY",
      C: "SUBSTANTIVE_COUNSEL_REVIEW_REQUIRED",
      D: "WRONG_DELIVERY_TYPE_OR_UNRESOLVED"
    },
    distinctSubstantiveQuestions: distinct.filter((q) => q.bucket === "C").length,
    distinctProductTreatmentQuestions: distinct.filter((q) => q.bucket === "D").length,
    consolidation:
      `${counts.C} bucket C families reduce to ${distinct.filter((q) => q.bucket === "C").length} distinct substantive questions; ${counts.D} bucket D families reduce to ${distinct.filter((q) => q.bucket === "D").length} distinct product-treatment questions.`
  },
  structuralTrapResults: {
    trapOne_declaredButUnrenderedComponents: {
      familiesChecked: rows.length,
      familiesWithAGap: rows.filter((r) => r.measurements.declaredButUnrendered.length > 0).map((r) => r.familyId),
      componentsDeclaredAcrossTheCohort: rows.reduce((n, r) => n + r.measurements.declaredComponents, 0),
      finding:
        "No family in this cohort declares a component that reports/rendered-artifacts.json omits. The defect this trap was written for -- a required official_form_reference declared in a field map and rendered nowhere while a custom pleading ships -- appears in rcap-sc-custom-pleading, which is outside this current cohort."
    },
    trapTwo_captionContradictsDestination: {
      familiesChecked: rows.length,
      familiesWithAContradiction: rows.filter((r) => r.measurements.captionContradictsDestination).map((r) => r.familyId),
      finding:
        "No family in this cohort is captioned to a destination family its design does not name. Every prosecutor-, agency- and automatic-destination route in the cohort was read: the Georgia prosecutor routes address the prosecuting attorney, the Georgia jail route says on its face that it is not a court filing, and the Connecticut and Rhode Island automatic routes tell the participant that nothing is filed."
    }
  },
  documentCountsByBucket: {
    A: documentCounts("A"),
    B: documentCounts("B"),
    C: documentCounts("C"),
    D: documentCounts("D")
  },
  distinctQuestions: distinct,
  familiesWhoseSettledDesignIsNotAStateMemoTrack: rows
    .filter((r) => r.tracks.every((t) => t.settledDesignResolvedBy !== "state_memo.trackId" && t.settledDesignResolvedBy !== "track_registry.trackId"))
    .map((r) => ({
      familyId: r.familyId,
      jurisdiction: r.jurisdiction,
      changeClassification: r.changeClassification,
      note: "No state legal-design memo track carries this route. Its settled design is the runtime route-authority contract and the route-obligation census row named below, which is a thinner record than a memo track and names the packet family without carrying eligibility, venue, service or fee rules.",
      designActuallyCarriedBy: r.tracks.map((t) => ({
        routeKey: t.routeKey,
        routeAuthorityContract: t.routeAuthorityContract,
        censusInstrument: t.censusInstrument,
        censusLegalDecisionRecordIds: t.censusLegalDecisionRecordIds,
        routeRatification: t.routeRatification
      }))
    })),
  familiesWithNoSettledLegalDesignOnAnyRoute: noDesign.map((r) => ({
    familyId: r.familyId,
    jurisdiction: r.jurisdiction,
    routeKeys: r.routeKeys,
    whereItsDesignActuallyLives: r.tracks.map((t) => ({
      routeKey: t.routeKey,
      censusInstrument: t.censusInstrument,
      censusLegalDecisionRecordIds: t.censusLegalDecisionRecordIds,
      routeRatification: t.routeRatification
    }))
  })),
  explicitNonGrants: [
    "This record creates no approval and marks no family approved.",
    "It opens no commercial route, creates no fulfillment record and consumes no packet credit.",
    "It edits, builds and rebuilds no packet family.",
    "A bucket A or B classification is a recommendation about the treatment a family needs. It is not the treatment, and only the decision owner can give it.",
    "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else."
  ],
  families: rows
};

fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(record, null, 2)}\n`);

console.log(`${OUT}`);
console.log(`  families classified: ${rows.length}`);
console.log(`  A TECHNICAL_ONLY_EXISTING_DESIGN       ${counts.A}`);
console.log(`  B BATCH_OWNER_ADOPTION_READY           ${counts.B}`);
console.log(`  C SUBSTANTIVE_COUNSEL_REVIEW_REQUIRED  ${counts.C}`);
console.log(`  D WRONG_DELIVERY_TYPE_OR_UNRESOLVED    ${counts.D}`);
console.log(`  distinct questions: ${distinct.length}`);
for (const q of distinct) console.log(`    [${q.bucket}] ${q.id}  ${q.families.length} famil${q.families.length === 1 ? "y" : "ies"}`);
