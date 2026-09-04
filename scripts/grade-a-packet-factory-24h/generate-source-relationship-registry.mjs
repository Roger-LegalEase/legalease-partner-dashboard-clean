#!/usr/bin/env node
/**
 * The source relationship model, and the human queue that survives it.
 *
 * ROGER_SOURCE_UNBLOCK_LIST.md was invalid output and an external audit proved
 * it. I re-measured every structural claim against the committed file before
 * accepting any of it, and all of them matched: 232 of 232 rows said
 * "Form title: REQUIRES_LOOKUP"; 206 of 232 issuer fields held a plus-joined
 * list of form IDs rather than the name of any issuing body; two "official
 * URLs" were entire CSV rows with a domain, a date, a revision, a SHA-256 and a
 * private/source-imports path appended after a comma; and the Top 20 summed to
 * 125 family references over 67 unique families, so the ranking counted the
 * same family several times.
 *
 * The substantive defect underneath all of that: the generator had four action
 * kinds and squeezed every blocker into them. A public form nobody had fetched,
 * a page inside a public bundle, a form ID missing its current suffix, a
 * statute, and a form whose publisher forbids commercial reuse all came out as
 * "find this form" or "ask a clerk". Nineteen of the top twenty said contact a
 * clerk or hunt a portal; the external check found ZERO of them justified a
 * clerk call, and exactly one was real human work.
 *
 * That is worse than a wrong list. It is a list that would have sent a person
 * to several offices to ask for documents that are published, embedded in
 * bundles he already had addresses for, or not documents at all.
 *
 * So blocker class is preserved rather than flattened, and a human task must
 * earn itself: a verified target and a specific unanswered question, or an
 * official artifact URL on a host that refuses automated fetching. Everything
 * else is ACQ, PROMO, DISC, Captain or counsel work and is routed there by name.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeEmitter } from "../lib/generator-emit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const DIR = "data/rcap-grade-a/packet-factory-24h";
const VERIFICATION = "data/rcap-grade-a/source-verification/TOP20_EXTERNAL_VERIFICATION.json";
const CAPTAIN_DETERMINATIONS = "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json";
const OUT_REGISTRY = `${DIR}/SOURCE_RELATIONSHIP_REGISTRY.json`;
const OUT_JSON = `${DIR}/ROGER_SOURCE_UNBLOCK_LIST.json`;
const OUT_MD = "docs/rcap/grade-a/packet-factory-24h/ROGER_SOURCE_UNBLOCK_LIST.md";

/* The closed vocabulary. A record in no state, or in an undeclared one, refuses. */
const SOURCE_STATES = [
  "PUBLIC_DOWNLOAD", "PUBLIC_DOWNLOAD_BOT_BLOCKED", "STANDALONE_ARTIFACT",
  "BUNDLE_COMPONENT", "EMBEDDED_SECTION", "STALE_OR_VARIANT_ID",
  "SOURCE_SCOPE_AND_VERSION_AMBIGUITY", "MISSING_SOURCE_BINARY",
  "MISSING_CANONICAL_RELATIONSHIP_METADATA", "CURRENTNESS_UNVERIFIED",
  "FAMILY_IDENTITY_AMBIGUOUS", "UNSUPPORTED_RELATIONSHIP",
  "STATUTORY_CUSTOM_PLEADING", "LICENSE_PERMISSION_REVIEW", "HUMAN_CONTACT_REQUIRED"
];

/* The externally verified dispositions, mapped onto that vocabulary. The
 * reviewer's names are kept alongside so the mapping is auditable rather than
 * silent. */
const VERIFIED_STATE = {
  PUBLIC_DOWNLOAD_BOT_BLOCKED: "PUBLIC_DOWNLOAD_BOT_BLOCKED",
  PUBLIC_STANDALONE_ARTIFACT: "STANDALONE_ARTIFACT",
  BUNDLE_COMPONENT: "BUNDLE_COMPONENT",
  EMBEDDED_SECTION_PATTERN: "EMBEDDED_SECTION",
  EMBEDDED_RULE_FORM_COMPONENT: "EMBEDDED_SECTION",
  PUBLIC_VARIANT_ID: "STALE_OR_VARIANT_ID",
  SOURCE_SCOPE_AND_VERSION_AMBIGUITY: "SOURCE_SCOPE_AND_VERSION_AMBIGUITY",
  PUBLIC_ARTIFACT_WITH_REUSE_RESTRICTION: "LICENSE_PERMISSION_REVIEW",
  PUBLIC_AGENCY_ARTIFACT_PLUS_ROUTE_MAPPING_DEFECT: "UNSUPPORTED_RELATIONSHIP"
};

/* Who each state belongs to. Roger appears exactly twice, and both require a
 * fully specified receipt. */
const OWNER = {
  PUBLIC_DOWNLOAD: "ACQ obtains the public bytes; PROMO verifies receipt, hash and custody",
  PUBLIC_DOWNLOAD_BOT_BLOCKED: "Roger downloads in a normal browser; ACQ, PROMO and Captain afterward",
  STANDALONE_ARTIFACT: "ACQ obtains the public bytes; PROMO verifies receipt, hash and custody",
  BUNDLE_COMPONENT: "DISC records the component locator and alias; ACQ acquires the bundle ONCE",
  EMBEDDED_SECTION: "DISC maps the embedded section in each applicable form; ACQ acquires the containing document ONCE",
  STALE_OR_VARIANT_ID: "DISC normalizes the identity to its current, mode-specific form; then ACQ and PROMO",
  SOURCE_SCOPE_AND_VERSION_AMBIGUITY: "DISC and Captain settle statewide versus local scope and the alias relationship before any inquiry",
  MISSING_SOURCE_BINARY: "ACQ, once DISC has settled an exact official address",
  MISSING_CANONICAL_RELATIONSHIP_METADATA: "DISC settles source identity and the route or family relationship",
  CURRENTNESS_UNVERIFIED: "DISC compares the held edition against the publisher's own forms index",
  FAMILY_IDENTITY_AMBIGUOUS: "DISC settles which document the route actually requires",
  UNSUPPORTED_RELATIONSHIP: "DISC and legal decide which families the artifact genuinely serves",
  STATUTORY_CUSTOM_PLEADING: "a packet-build lane, drafting against the statute",
  LICENSE_PERMISSION_REVIEW: "counsel and business decide reuse; ACQ may evaluate the bytes",
  HUMAN_CONTACT_REQUIRED: "Roger, and only with a verified target and an exact unanswered question"
};

/* Only these two produce a task for a person. */
const HUMAN_STATES = new Set(["PUBLIC_DOWNLOAD_BOT_BLOCKED", "HUMAN_CONTACT_REQUIRED"]);

const read = (rel, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); } catch { return d; } };
const fail = (why) => { console.error(`REFUSED source-relationship registry — ${why}`); process.exit(1); };

const master = read(`${DIR}/MASTER_QUEUE.json`) ?? fail("the master queue is not readable");
const verification = read(VERIFICATION) ?? fail(`${VERIFICATION} is not readable; the corrected dispositions are evidence and cannot be reconstructed here`);
const artifacts = (read("data/record-clearing/source-artifact-registry.json", { artifacts: [] }).artifacts) ?? [];

const checkpoint = read(`${DIR}/CHECKPOINT.json`, {});
const captainDeterminations = read(CAPTAIN_DETERMINATIONS) ?? fail(`${CAPTAIN_DETERMINATIONS} is not readable`);
const reconciliation42 = captainDeterminations.reconciliation42 ?? fail(`${CAPTAIN_DETERMINATIONS} carries no reconciliation42 record`);

/* A bare statutory citation is not a form and nobody can download one. A title
 * that carries its authority -- "Petition for Expungement, G.L. c. 276, § 100K"
 * -- is a form, and an earlier version of this rule matched anywhere in the
 * string and dropped it. */
const CITATION_SHAPED = /^[A-Z]{2}-(CCRP|RS|CRS|STAT|CODE)-[A-Z-]*\d+$|^\d+\s*U\.?S\.?C\.?\s*§?\s*[\d.]+$|^[A-Z. ]*§\s*[\d.A-Z]+$/i;

const norm = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/*
 * Bytes a person went and fetched, recorded by
 * scripts/rcap-record-human-source-return.mjs.
 *
 * A returned file closes the part only a person could do, and it does not close
 * the record. The Texas statement came back as a real 12-page AcroForm with 132
 * fields and a filename matching the expected artifact URL exactly -- but the
 * address it was downloaded from, the date, and the form's printed revision line
 * were not stated, and only the person who opened the browser can witness those.
 *
 * So the state becomes CURRENTNESS_UNVERIFIED, which is the accurate one: we
 * hold the bytes, and what is open is whether they are the edition the
 * publisher issues today. That is not a nag about paperwork -- the download date
 * and the printed revision are exactly what would settle it.
 */
const humanReturns = new Map();
const HR_DIR = "data/rcap-grade-a/source-verification/human-source-returns";
try {
  for (const f of fs.readdirSync(path.join(ROOT, HR_DIR)).filter((x) => x.endsWith(".receipt.json"))) {
    const r = JSON.parse(fs.readFileSync(path.join(ROOT, HR_DIR, f), "utf8"));
    humanReturns.set(`${r.jurisdiction}::${norm(r.canonicalArtifactId)}`, r);
  }
} catch (e) {
  /*
   * ENOENT only. A bare catch here turned a real bug into silence: this block
   * used `norm` before it was defined, the temporal-dead-zone ReferenceError
   * was swallowed, and the generator reported "none returned yet" while a
   * receipt sat on disk. A catch that cannot tell a missing directory from a
   * broken program will always eventually report the second as the first.
   */
  if (e?.code !== "ENOENT") throw e;
}
const artifactsByJur = new Map();
for (const a of artifacts) {
  const j = (a.jurisdiction ?? "").toUpperCase();
  if (!artifactsByJur.has(j)) artifactsByJur.set(j, []);
  artifactsByJur.get(j).push(a);
}
/*
 * One match, or none. Never the first of several.
 *
 * This used .find(), which silently took the first artifact whose name
 * contained the form token, and four identities match more than one document:
 * MI "MC 227" matches mc227.pdf AND MC-227a (set-aside misdemeanour) AND
 * MC-227b (human trafficking), which are different forms; MN "EXP101" matches
 * its Hmong, Somali and Spanish translations; NM "4-960" matches 4-960.1 and
 * 4-960.2; MT-OCA-MMRTA matches a certificate of service and a proposed order.
 *
 * Taking the first would have attached MC-227a's bytes and hash to a family
 * that needs MC 227, and stated it as a measurement. An ambiguous identity is a
 * DISC question -- which document does this route actually require -- and
 * answering it by array order is the same class of defect as everything else
 * corrected here: a guess wearing the clothes of a fact.
 */
const heldArtifactFor = (jur, form) => {
  const f = norm(form);
  if (f.length < 4) return { artifact: null, candidates: [] };
  const hits = (artifactsByJur.get(jur) ?? []).filter((a) => norm(a.artifactId).includes(f) || norm(a.fileName).includes(f));
  if (hits.length === 1) return { artifact: hits[0], candidates: hits };
  return { artifact: null, candidates: hits };
};

/* The verified rows, keyed by state + queue identity. */
const verifiedByKey = new Map();
for (const r of verification.rows ?? []) {
  const mapped = VERIFIED_STATE[r.disposition];
  if (!mapped) fail(`the verification carries disposition ${r.disposition}, which maps to no declared source state`);
  verifiedByKey.set(`${r.state}::${norm(r.queue_identity)}`, { ...r, mappedState: mapped });
}

/* ---- one record per (jurisdiction, canonical artifact identity) ---------- */
const blocked = master.families.filter((f) => f.state === "SOURCE_BLOCKED");
const records = new Map();
const familiesNamingNoForm = [];

for (const f of blocked) {
  const jur = (f.jurisdiction ?? "??").toUpperCase();
  const forms = (f.forms ?? []).filter(Boolean);
  if (forms.length === 0) { familiesNamingNoForm.push(f.familyId); continue; }
  for (const form of forms) {
    const key = `${jur}::${norm(form)}`;
    if (!records.has(key)) records.set(key, { jurisdiction: jur, canonicalArtifactId: form, families: new Set(), sourceIds: new Set(), reasons: new Set(), custodyClasses: new Set() });
    const rec = records.get(key);
    rec.families.add(f.familyId);
    for (const s of f.sourceIds ?? []) rec.sourceIds.add(s);
    for (const r of f.sourceReadiness?.reasons ?? []) rec.reasons.add(r);
    if (f.sourceReadiness?.custodyClass) rec.custodyClasses.add(f.sourceReadiness.custodyClass);
  }
}

const registry = [...records.values()].map((rec) => {
  const verified = verifiedByKey.get(`${rec.jurisdiction}::${norm(rec.canonicalArtifactId)}`) ?? null;
  const { artifact: held, candidates: heldCandidates } = heldArtifactFor(rec.jurisdiction, rec.canonicalArtifactId);

  /*
   * State, in priority order. Verified evidence outranks inference, always: an
   * external reviewer looked at the publisher's live page and I cannot.
   */
  const humanReturn = humanReturns.get(`${rec.jurisdiction}::${norm(rec.canonicalArtifactId)}`) ?? null;

  let sourceState;
  let basis;
  if (humanReturn?.currentnessEstablished) {
    /*
     * Currentness is settled, and the absence of a "Rev." line does not unsettle
     * it. The official Texas host served exactly these bytes at exactly this
     * address on 2026-08-31 -- that is what current means for a published form.
     * The form prints no revision field at all; what it prints is the Supreme
     * Court docket that adopted it, which is the publisher's own versioning.
     * Holding the record open for a label the publisher does not use would be
     * demanding evidence of a different kind than the evidence that exists.
     *
     * So it is a settled public artifact in hand, and the remaining work is
     * PROMO's: verify the receipt, compare the hash, create the custody record.
     * No revision date is derived from the docket number, the PDF timestamps or
     * the filename.
     */
    sourceState = "STANDALONE_ARTIFACT";
    basis = `a person returned the bytes and the chain is witnessed end to end: ${humanReturn.currentnessBasis}. The form publishes no revision line; its printed approval marker is "${humanReturn.printedApprovalMarker}". Remaining work is PROMO custody.`;
  }
  else if (humanReturn) {
    sourceState = "CURRENTNESS_UNVERIFIED";
    basis = `a person returned the bytes (${humanReturn.observedByteLength} bytes, ${humanReturn.observedPageCount} pages, ${humanReturn.observedStructuralClass}, sha ${humanReturn.sha256.slice(0, 12)}). ${humanReturn.provenanceNotSupplied?.length ? `Not witnessed: ${humanReturn.provenanceNotSupplied.join("; ")}. Until the download date and the printed revision are stated, nothing establishes that this is the current edition.` : "The chain is witnessed end to end."}`;
  }
  else if (verified) { sourceState = verified.mappedState; basis = `externally verified ${verification.verified_on}: ${verified.disposition}`; }
  else if (CITATION_SHAPED.test(rec.canonicalArtifactId.trim())) { sourceState = "STATUTORY_CUSTOM_PLEADING"; basis = "the identity is a bare statutory citation, and there is no document at the other end"; }
  else if (heldCandidates.length > 1) {
    sourceState = "FAMILY_IDENTITY_AMBIGUOUS";
    basis = `${heldCandidates.length} held artifacts match this identity (${heldCandidates.map((a) => a.fileName).slice(0, 3).join(", ")}); which one the route requires is unsettled, and choosing by array order would state a guess as a measurement`;
  }
  else if (held && held.presence === "present" && held.hashState === "match") {
    // Held bytes are not a missing source. Whether they are the CURRENT edition
    // is a different question, and it is the one that is actually open.
    sourceState = "CURRENTNESS_UNVERIFIED";
    basis = `the corpus holds ${held.fileName} with a matching hash; what is unverified is whether it is the edition the publisher issues today`;
  } else if (held && held.presence === "missing") { sourceState = "MISSING_SOURCE_BINARY"; basis = `the artifact registry expects ${held.fileName} and the bytes are absent`; }
  else { sourceState = "MISSING_CANONICAL_RELATIONSHIP_METADATA"; basis = "no canonical publisher, address or component locator is recorded for this identity"; }

  /*
   * ISSUER. Never a plus-joined list of form IDs -- 206 rows carried one, and a
   * list of form numbers does not name an issuing body. The artifact registry
   * records issuingAuthority as "unknown" for all 583 of its entries, so absent
   * external verification the honest value is that it must be looked up.
   */
  const issuer = verified?.source_page
    ? `publisher of ${verified.source_page}`
    : "REQUIRES_LOOKUP — no issuing body is recorded for this identity in any committed record";

  return {
    jurisdiction: rec.jurisdiction,
    canonicalArtifactId: rec.canonicalArtifactId,
    canonicalArtifactTitle: verified?.locator ?? held?.fileName ?? "REQUIRES_LOOKUP — no printed title is recorded",
    canonicalPublisher: issuer,
    officialSourcePage: verified?.source_page ?? null,
    officialArtifactUrl: verified?.artifact_url ?? null,
    artifactSha256: humanReturn?.sha256 ?? held?.measuredSha256 ?? null,
    humanReturn: humanReturn
      ? { returnedBy: humanReturn.returnedBy, sha256: humanReturn.sha256, storedAt: humanReturn.storedAt,
          pages: humanReturn.observedPageCount, technology: humanReturn.observedStructuralClass,
          fieldCount: humanReturn.observedFieldCount, filenameMatchesExpectedUrl: humanReturn.filenameMatchesExpectedUrl,
          provenanceNotSupplied: humanReturn.provenanceNotSupplied ?? [], bodyCommitted: false,
          statedUrl: humanReturn.statedUrl ?? null, statedDownloadDate: humanReturn.statedDownloadDate ?? null,
          printedRevision: humanReturn.printedRevision ?? null,
          printedRevisionAbsentOnTheForm: humanReturn.printedRevisionAbsentOnTheForm ?? false,
          printedApprovalMarker: humanReturn.printedApprovalMarker ?? null,
          currentnessEstablished: Boolean(humanReturn.currentnessEstablished),
          currentnessBasis: humanReturn.currentnessBasis ?? null }
      : null,
    heldPath: held?.sourcePath ?? null,
    // Named rather than counted: an ambiguity is only actionable if you can see
    // what it is between.
    heldCandidates: heldCandidates.length > 1 ? heldCandidates.map((a) => ({ artifactId: a.artifactId, fileName: a.fileName, sha256: a.measuredSha256 })) : [],
    // When a reviewer read the publisher's page, their identification settles a
    // local name collision. Recorded so the resolution is visible instead of
    // looking like the ambiguity was never there.
    localAmbiguityResolvedByVerification: Boolean(verified) && heldCandidates.length > 1,
    sourceState, sourceStateBasis: basis,
    externallyVerified: Boolean(verified),
    aliases: verified?.locator && /^Current identity|Current e-file identity/.test(verified.locator) ? [verified.locator] : [],
    components: verified && ["BUNDLE_COMPONENT", "EMBEDDED_SECTION"].includes(verified.mappedState)
      ? [{ componentId: rec.canonicalArtifactId, printedIdentity: rec.canonicalArtifactId, pageOrSectionLocator: verified.locator, filingMode: null, jurisdictionScope: held?.geographicScope ?? "unknown" }]
      : [],
    relationships: [...rec.families].sort().map((familyId) => ({
      routeOrFamilyId: familyId, componentId: rec.canonicalArtifactId,
      relationshipState: verified?.mappedState === "UNSUPPORTED_RELATIONSHIP" ? "UNSUPPORTED_RELATIONSHIP" : "ASSERTED_BY_THE_QUEUE_NOT_INDEPENDENTLY_CONFIRMED"
    })),
    reuseStatus: verified?.mappedState === "LICENSE_PERMISSION_REVIEW"
      ? { restricted: true, note: verified.note, decidedBy: "counsel and business, not a clerk" }
      : { restricted: null, note: "not assessed" },
    jurisdictionScope: held?.geographicScope ?? "unknown",
    owner: OWNER[sourceState],
    uniqueFamilies: [...rec.families].sort(),
    uniqueFamilyCount: rec.families.size,
    sourceIds: [...rec.sourceIds].sort(),
    queueReasons: [...rec.reasons].sort(),
    verifiedNote: verified?.note ?? null,
    /*
     * A human task must earn itself. A verified target and an exact unanswered
     * question, or an official artifact URL on a host that refuses an automated
     * fetch. Nothing here manufactures a contact: this repository holds no
     * phone number or email address for any court or agency, and a plausible
     * one nobody verified is a fabricated record.
     */
    humanContactTarget: verified?.owner?.startsWith("Roger") ? verified.source_page ?? verified.artifact_url : null,
    humanContactQuestion: null,
    humanAction: verified?.human_action ?? null
  };
});

registry.sort((a, b) => b.uniqueFamilyCount - a.uniqueFamilyCount || a.jurisdiction.localeCompare(b.jurisdiction) || a.canonicalArtifactId.localeCompare(b.canonicalArtifactId));

const registryIdentityKeys = new Set(registry.map((r) => `${r.jurisdiction}::${norm(r.canonicalArtifactId)}`));
const externallyVerifiedDischarged = (verification.rows ?? [])
  .filter((r) => !registryIdentityKeys.has(`${r.state}::${norm(r.queue_identity)}`))
  .map((r) => ({
    jurisdiction: r.state,
    canonicalArtifactId: r.queue_identity,
    disposition: r.disposition,
    reason: "no current SOURCE_BLOCKED family names this canonical identity after regeneration"
  }));

/* ---- fail-closed invariants --------------------------------------------- */
const URL_JUNK = /private\/source-imports|[0-9a-f]{64}|,/;
const violations = [];
for (const r of registry) {
  if (!SOURCE_STATES.includes(r.sourceState)) violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: undeclared source state ${r.sourceState}`);
  if (/\+/.test(String(r.canonicalPublisher))) violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: the issuer field carries a plus-joined list of form IDs, which names no issuing body`);
  for (const u of [r.officialSourcePage, r.officialArtifactUrl]) {
    if (!u) continue;
    if (URL_JUNK.test(u) || (u.match(/https?:\/\//g) ?? []).length > 1) violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: the official URL carries corpus metadata, a SHA, a repository path or more than one address`);
  }
  if (["BUNDLE_COMPONENT", "EMBEDDED_SECTION"].includes(r.sourceState) && HUMAN_STATES.has(r.sourceState)) violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: an embedded component is queued as its own acquisition`);
  if (r.sourceState === "STATUTORY_CUSTOM_PLEADING" && HUMAN_STATES.has(r.sourceState)) violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: a statutory citation is queued as a form fetch`);
  if (r.sourceState === "HUMAN_CONTACT_REQUIRED" && (!r.humanContactTarget || !r.humanContactQuestion)) violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: a human-contact task with no verified target or no exact unresolved question`);
  if (HUMAN_STATES.has(r.sourceState) && r.officialArtifactUrl === null && r.sourceState === "PUBLIC_DOWNLOAD_BOT_BLOCKED") violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: a browser download task with no artifact URL to open`);
}
// ASK_CLERK may never be emitted where a public source is known. There is no
// ASK_CLERK state any more, and this asserts the absence rather than trusting it.
for (const r of registry) {
  if (/ASK_CLERK|ask a clerk/i.test(JSON.stringify({ s: r.sourceState, o: r.owner, a: r.humanAction })) && r.officialSourcePage) {
    violations.push(`${r.jurisdiction}/${r.canonicalArtifactId}: a clerk request while an official public source is known`);
  }
}
if (violations.length) {
  console.error(`REFUSED source-relationship registry — ${violations.length} invariant violation(s):`);
  for (const v of violations.slice(0, 12)) console.error(`  ${v}`);
  process.exit(1);
}

/* ---- the residual human queue ------------------------------------------- */
const humanTasks = registry.filter((r) => HUMAN_STATES.has(r.sourceState));

const byState = Object.fromEntries(SOURCE_STATES.map((s) => [s, registry.filter((r) => r.sourceState === s).length]));
const uniqueArtifacts = registry.length;
const uniqueFamilies = new Set(registry.flatMap((r) => r.uniqueFamilies)).size;

const registryDoc = {
  schemaVersion: "rcap-source-relationship-registry/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-source-relationship-registry.mjs",
  captainHead: checkpoint.captainHead ?? null,
  question: "What is actually blocking each source, and who can move it?",
  answer: `${uniqueArtifacts} canonical artifact identities over ${uniqueFamilies} unique families. ${humanTasks.length} require a person; everything else is ACQ, PROMO, DISC, Captain or counsel work.`,
  whyTheOldListWasInvalid: {
    verdict: verification.verdict,
    structuralDefectsIndependentlyConfirmed: {
      rowsAll: 232, formTitleRequiresLookup: 232, plusJoinedIssuerFields: 206,
      findTasks: 120, askTasks: 101, openTasks: 11,
      knownOfficialUrlRows: 11, malformedKnownUrlRows: 2,
      top20FamilyReferenceSum: 125, top20UniqueFamilies: 67
    },
    theSubstantiveDefect: "Four action kinds absorbed every blocker class. A public form nobody had fetched, a page inside a public bundle, a form ID missing its current suffix, a statute, and a form whose publisher forbids commercial reuse all came out as 'find this form' or 'ask a clerk'. Nineteen of the top twenty said contact a clerk or hunt a portal; zero of them justified a clerk call.",
    whyThatMattered: "It would have sent a person to several offices to ask for documents that are published, embedded in bundles he already had addresses for, or not documents at all."
  },
  sourceStateVocabulary: SOURCE_STATES,
  ownerByState: OWNER,
  humanStates: [...HUMAN_STATES],
  externalVerification: {
    file: VERIFICATION, verifiedOn: verification.verified_on,
    rowsVerified: (verification.rows ?? []).length,
    scopeLimit: verification.provenance?.scopeLimit,
    note: "These dispositions come from a reviewer with access to live publisher sources. This session cannot reach a publisher's website, so they are evidence consumed here, not conclusions derived here.",
    dischargedBecauseNoCurrentSourceBlock: externallyVerifiedDischarged
  },
  reconciliation42: {
    input: CAPTAIN_DETERMINATIONS,
    familiesExamined: (reconciliation42.families ?? []).length,
    byDisposition: Object.fromEntries(["SOURCE_READY", "PRODUCT_PATH_PENDING", "SOURCE_BLOCKED"]
      .map((state) => [state, (reconciliation42.families ?? []).filter((r) => r.disposition === state).length])),
    byGroup: Object.fromEntries(["A", "B", "C"]
      .map((group) => [group, (reconciliation42.families ?? []).filter((r) => r.group === group).length])),
    remainingSourceBlockedFamilyIds: (reconciliation42.families ?? [])
      .filter((r) => r.disposition === "SOURCE_BLOCKED").map((r) => r.familyId).sort(),
    laterSourceBlockersKeptSeparate: reconciliation42.laterSourceBlockersKeptSeparate,
    manualAcquisitionCohortUntouchedCount: reconciliation42.manualAcquisitionCohortUntouchedCount,
    families: (reconciliation42.families ?? []).map((r) => ({
      familyId: r.familyId,
      group: r.group,
      decidedDisposition: r.disposition,
      projectedState: master.families.find((f) => f.familyId === r.familyId)?.state ?? null,
      exactNextAction: r.exactNextAction,
      exactResidual: r.exactResidual ?? null
    }))
  },
  counts: {
    uniqueCanonicalArtifacts: uniqueArtifacts,
    uniqueFamilies,
    byState,
    residualHumanActionCount: humanTasks.length,
    externallyVerifiedRecords: registry.filter((r) => r.externallyVerified).length,
    familiesNamingNoForm: familiesNamingNoForm.length
  },
  rankingRule: "unique canonical artifact and unique family. The old list summed row-family references, so one family counted several times and inflated its own rank.",
  familiesNamingNoForm: familiesNamingNoForm.sort(),
  records: registry,
  commercialRoutesOpened: 0,
  productionTouched: false,
  packetArtifactsChanged: 0
};

const unblockDoc = {
  schemaVersion: "rcap-roger-source-unblock-list/v2",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-source-relationship-registry.mjs",
  supersedes: "rcap-roger-source-unblock-list/v1, which was 232 rows and invalid as a human-action queue",
  question: "What is left that only a person can do?",
  answer: humanTasks.length === 1
    ? "One task. Everything else in the source backlog is ACQ, PROMO, DISC, Captain or counsel work."
    : `${humanTasks.length} task(s).`,
  whyThisIsShortNow: "Blocker class is preserved instead of flattened. A public artifact is an ACQ fetch, a bundle page is a DISC locator, a variant ID is a DISC normalization, a statute is drafting, and a reuse restriction is a counsel decision. None of those is an errand.",
  noContactIsInvented: "This repository holds no phone number or email address for any court or agency. A human-contact task requires a verified target AND an exact unanswered question; without both, the generator refuses to emit one.",
  counts: {
    residualHumanActionCount: humanTasks.length,
    manualBrowserDownload: humanTasks.filter((r) => r.sourceState === "PUBLIC_DOWNLOAD_BOT_BLOCKED").length,
    humanContactRequired: humanTasks.filter((r) => r.sourceState === "HUMAN_CONTACT_REQUIRED").length,
    uniqueFamiliesUnlockedByHumanTasks: new Set(humanTasks.flatMap((r) => r.uniqueFamilies)).size,
    uniqueCanonicalArtifacts: uniqueArtifacts,
    uniqueFamilies
  },
  tasks: humanTasks.map((r) => ({
    jurisdiction: r.jurisdiction,
    canonicalArtifactId: r.canonicalArtifactId,
    sourceState: r.sourceState,
    officialSourcePage: r.officialSourcePage,
    officialArtifactUrl: r.officialArtifactUrl,
    uniqueFamiliesUnlocked: r.uniqueFamilies,
    uniqueFamilyCount: r.uniqueFamilyCount,
    whyAPersonAndNotALane: "The identity is settled and the official host refuses automated acquisition. A browser session is the only part of this a machine here cannot do.",
    preciseAction: r.humanAction,
    evidenceToReturn: [
      "the file exactly as downloaded — no print-to-PDF, no optimize, no re-save, no export, because a round trip through a viewer changes the bytes and the hash is the identity",
      "the exact URL from the address bar",
      "the download date",
      "the form's own printed revision line, if it has one"
    ],
    whatDoesNotCount: [
      "a screenshot, a photograph or a printout",
      "a copy from a commercial forms site — uslegalforms, pdffiller, formsworkflow and the rest are refused by name",
      "a file re-saved by a PDF editor"
    ],
    ownerAfterYouReturnIt: "ACQ records the bytes and their SHA-256; PROMO verifies the receipt and creates custody; Captain regenerates the queue and releases the families. None of that is yours."
  })),
  INTERNAL_SOURCE_WORK_NOT_FOR_ROGER: {
    rule: "If an item would have Roger touch this repository, compute a hash, map a route or promote custody, it is misfiled.",
    byState: Object.fromEntries(SOURCE_STATES.filter((s) => !HUMAN_STATES.has(s)).map((s) => [s, { records: byState[s], owner: OWNER[s] }])),
    familiesNamingNoForm: `${familiesNamingNoForm.length} SOURCE_BLOCKED famil(ies) name no official form at all. That is DISC discovery, not an errand.`
  },
  commercialRoutesOpened: 0,
  productionTouched: false
};

const md = () => {
  const p = [];
  p.push("# Roger — what is actually left for a person", "");
  p.push(`**RESIDUAL HUMAN-ACTION ITEMS: ${humanTasks.length}**`, "");
  p.push(`**UNIQUE CANONICAL ARTIFACTS: ${uniqueArtifacts}**  ·  **UNIQUE FAMILIES: ${uniqueFamilies}**`, "");
  p.push("## What changed, and why the old list was withdrawn", "");
  p.push("The previous version of this file had 232 rows and was invalid as a human-action queue. An external audit said so and I re-measured every structural claim against the committed file before accepting it — all matched:", "");
  p.push("- 232 of 232 rows said `Form title: REQUIRES_LOOKUP`;");
  p.push("- 206 of 232 issuer fields held a plus-joined list of form IDs, which names no issuing body;");
  p.push("- two \"official URLs\" were entire CSV rows, with a domain, date, revision, SHA-256 and a `private/source-imports` path appended after a comma;");
  p.push("- the Top 20 summed to 125 family references over 67 unique families, so the ranking counted the same family several times.", "");
  p.push("The defect underneath: four action kinds absorbed every blocker class. A public form nobody had fetched, a page inside a public bundle, a form ID missing its current suffix, a statute, and a form whose publisher forbids commercial reuse all came out as \"find this form\" or \"ask a clerk\". Nineteen of the top twenty said contact a clerk or hunt a portal. **Zero of them justified a clerk call.** It would have sent you to several offices to ask for documents that are published, embedded in bundles we already had addresses for, or not documents at all.", "");
  p.push("Blocker class is preserved now, and a human task has to earn itself.", "");
  if (humanTasks.length === 0) p.push("_Nothing currently requires a person._", "");
  for (const t of unblockDoc.tasks) {
    p.push(`## ${t.jurisdiction} — ${t.canonicalArtifactId}`, "");
    p.push(`**Unlocks ${t.uniqueFamilyCount} famil(ies).**  State: \`${t.sourceState}\`.`, "");
    p.push(`- **Official page:** ${t.officialSourcePage ?? "(none recorded)"}`);
    p.push(`- **Artifact:** ${t.officialArtifactUrl ?? "(none recorded)"}`);
    p.push(`- **Why you and not a lane:** ${t.whyAPersonAndNotALane}`);
    p.push(`- **Do:** ${t.preciseAction}`, "");
    p.push("**Return:**");
    for (const e of t.evidenceToReturn) p.push(`- ${e}`);
    p.push("", "**Does not count:**");
    for (const e of t.whatDoesNotCount) p.push(`- ${e}`);
    p.push("", `**After you return it:** ${t.ownerAfterYouReturnIt}`, "");
  }
  p.push("## Everything else, routed by name", "");
  p.push("| State | Records | Owner |", "|---|---:|---|");
  for (const s of SOURCE_STATES) {
    if (HUMAN_STATES.has(s) || !byState[s]) continue;
    p.push(`| \`${s}\` | ${byState[s]} | ${OWNER[s]} |`);
  }
  p.push("", `${familiesNamingNoForm.length} SOURCE_BLOCKED famil(ies) name no official form at all — DISC discovery, not an errand.`, "");
  p.push("## Scope limit, stated rather than implied", "");
  p.push(`${(verification.rows ?? []).length} of 232 original rows were externally verified against live publisher sources on ${verification.verified_on}. The rest are classified from committed records only, and carry no current-source determination. Where the corpus already holds matching bytes they are \`CURRENTNESS_UNVERIFIED\` rather than missing — held bytes are not an absent source, and the open question is whether the edition is current.`, "");
  return p.join("\n");
};

const EMIT = makeEmitter({ root: ROOT, check: CHECK, label: "source relationship registry" });
EMIT.emit(OUT_REGISTRY, `${JSON.stringify(registryDoc, null, 2)}\n`);
EMIT.emit(OUT_JSON, `${JSON.stringify(unblockDoc, null, 2)}\n`);
EMIT.emit(OUT_MD, `${md()}\n`);
EMIT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${OUT_REGISTRY}, ${OUT_JSON} and ${OUT_MD}`);
console.log(`  ${uniqueArtifacts} canonical artifact(s) · ${uniqueFamilies} unique famil(ies)`);
console.log(`  residual human tasks: ${humanTasks.length}`);
for (const s of SOURCE_STATES) if (byState[s]) console.log(`    ${s.padEnd(42)} ${byState[s]}`);
