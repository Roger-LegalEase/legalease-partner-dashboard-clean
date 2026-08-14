#!/usr/bin/env node
// Evidence briefs for the emergency 497/497 terminalization window.
//
// Roger authorized every currently nonterminal track to receive the strongest
// complete, safe, repository-supported terminal treatment available now. This
// script is the input side of that authorization: for every live nonterminal
// track it extracts, from the byte-pinned legal-design registry, exactly the
// evidence a treatment author is allowed to rely on, and proposes which of the
// five lawful terminal treatments that evidence supports.
//
//   node scripts/generate-rcap-terminalization-briefs.mjs
//   node scripts/generate-rcap-terminalization-briefs.mjs --check
//
// It writes no participant copy. Authoring is a separate, reviewed step: this
// file only decides what may be said and on whose authority, so that a later
// reviewer can compare a treatment against the exact bytes it claims to rest
// on rather than against a summary of them.
//
// The registry is read from the pinned commit and hash-checked before use. If
// those bytes move, every brief derived from them is stale by construction and
// this script refuses rather than quietly re-deriving from different evidence.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(rootDir, "data/rcap-all50/review-artifacts/terminalization-evidence-briefs.json");
const LEDGER = path.join(rootDir, "data/rcap-ledger/track-terminalization.json");
const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";

const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`FAIL terminalization briefs — ${message}`);
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const regSrc = ledger.registrySource;

const registryRaw = execFileSync("git", ["show", `${regSrc.commit}:${REGISTRY_PATH}`], {
  cwd: rootDir,
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024
});
const registrySha = crypto.createHash("sha256").update(registryRaw).digest("hex");
if (registrySha !== regSrc.sha256[REGISTRY_PATH]) {
  fail(`registry bytes at ${regSrc.commit.slice(0, 8)}… hash to ${registrySha.slice(0, 12)}…, ledger pinned ${regSrc.sha256[REGISTRY_PATH].slice(0, 12)}…`);
}
const registry = JSON.parse(registryRaw);
const byKey = new Map(registry.tracks.map((t) => [`${t.jurisdiction}:${t.trackId}`, t]));

// The window's track set, not "whatever is nonterminal right now".
//
// These briefs are the evidence record for one terminalization window: the 114
// tracks that were nonterminal when it opened. Once those tracks are terminal —
// which is the point of the exercise — deriving from the live nonterminal set
// would empty the artifact and strand every treatment and review that cites it.
// So the committed artifact's own track list is authoritative once it exists,
// and the pinned registry is still the only source of what each brief may say.
const committed = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
const windowTrackKeys = committed
  ? new Set(committed.briefs.map((b) => b.key))
  : new Set(ledger.tracks.filter((t) => !t.terminal).map((t) => `${t.jurisdiction}:${t.trackId}`));
const nonterminal = ledger.tracks.filter((t) => windowTrackKeys.has(`${t.jurisdiction}:${t.trackId}`));
if (nonterminal.length === 0) {
  fail("no window track set could be derived: the ledger reports no nonterminal tracks and no committed briefs artifact exists");
}
if (committed && nonterminal.length !== committed.briefs.length) {
  fail(`the committed briefs cover ${committed.briefs.length} tracks but only ${nonterminal.length} resolve in the ledger`);
}

/**
 * Whether the participant themselves files something.
 *
 * Read from the committed packet set rather than from prose: a track whose
 * components are all process guidance, or which has no filing component at all,
 * is one where the participant does not file and another actor controls the
 * outcome. That is the complete-guidance case, and it is a fact about the
 * mechanism, not a judgement about our readiness.
 */
function filingProfile(record) {
  const components = record.packetSet?.components ?? [];
  const filingComponents = components.filter((c) => c.outputStrategy !== "process_guidance");
  return {
    componentCount: components.length,
    filingComponentCount: filingComponents.length,
    participantFiles: filingComponents.length > 0,
    officialFormIds: [...new Set(filingComponents.map((c) => c.officialFormId).filter(Boolean))],
    outputStrategies: [...new Set(components.map((c) => c.outputStrategy).filter(Boolean))].sort()
  };
}

/**
 * A scope exclusion is claimed only when the committed legal design excludes
 * the MECHANISM, not when it merely limits how far self-help can carry a
 * participant through it. Nearly every track carries stop conditions; those
 * make a route bounded, not out of scope. The distinction matters because an
 * exclusion tells the participant we will never do this, and that statement has
 * to be true.
 */
function scopeExclusionEvidence(record) {
  const hits = [];
  for (const limitation of record.legalDesignLimitations ?? []) {
    const statement = String(limitation.statement ?? "");
    if (limitation.classification !== "scope_restriction") continue;
    if (/outside scope|out of scope|outside self-help|not (?:in|within) scope|should not be advising|is outside/i.test(statement)) {
      hits.push({ classification: limitation.classification, statement });
    }
  }
  const wholeMechanismExcluded = hits.some((h) => /the (?:entire |whole )?(?:mechanism|route|track) is|LegalEase (?:cannot|does not|will not) (?:support|assist)/i.test(h.statement));
  return { hits, wholeMechanismExcluded };
}

const committedByKey = new Map((committed?.briefs ?? []).map((b) => [b.key, b]));
const briefs = [];
const counts = { complete_guidance: 0, exact_supported_deferral: 0, deliberate_scope_exclusion: 0 };

for (const track of nonterminal.slice().sort((a, b) => `${a.jurisdiction}:${a.trackId}`.localeCompare(`${b.jurisdiction}:${b.trackId}`))) {
  const key = `${track.jurisdiction}:${track.trackId}`;
  const record = byKey.get(key);
  if (!record) fail(`${key} is nonterminal in the ledger but absent from the pinned registry`);

  const filing = filingProfile(record);
  const exclusion = scopeExclusionEvidence(record);

  // The five lawful treatments, narrowed by evidence rather than by preference.
  //
  // A production packet is excluded for every track in this window on a fact,
  // not a mood: each one is missing_from_compiled_runtime, so it fails the
  // "runtime-bound" limb of the production-packet standard no matter how good
  // its form work is. A complete composed route needs every legal unit to be
  // independently terminal, which no unit in this window is. What remains is
  // guidance where the participant does not file, exclusion where the design
  // puts the mechanism outside self-help, and an exact supported deferral for
  // every in-scope filing route whose safe filing product is not available yet.
  let proposed;
  let basis;
  if (exclusion.wholeMechanismExcluded) {
    proposed = "deliberate_scope_exclusion";
    basis = "the committed legal design places this mechanism outside what LegalEase can safely support";
  } else if (!filing.participantFiles) {
    proposed = "complete_guidance";
    basis = "the committed packet set contains no participant filing component, so another actor controls the outcome and monitoring plus next steps is the correct product";
  } else {
    proposed = "exact_supported_deferral";
    basis = "the participant does file, the mechanism is in scope, and the committed evidence does not yet support a safe filing product for it";
  }
  counts[proposed] += 1;

  briefs.push({
    key,
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    proposedTreatment: proposed,
    proposedTreatmentBasis: basis,
    // Why no packet, stated exactly and from committed bytes. This is the
    // sentence a participant is owed, and the one a reviewer checks.
    // The ledger-derived blocks are the ENTRY-TIME snapshot: why this track had
    // no packet when the window opened. They are preserved verbatim once
    // committed, because that is the evidence every treatment was authored
    // against and every reviewer cited. Re-deriving them after the window closed
    // would rewrite history to say the tracks were already terminal, which is
    // both untrue of the moment and useless to a reader. Everything sourced from
    // the pinned registry below is still re-derived on every run.
    exactUnavailabilityEvidence: committedByKey.get(key)?.exactUnavailabilityEvidence ?? {
      coverageDisposition: track.coverageDisposition,
      holds: track.holds ?? [],
      mappedCompiledPathwayIds: track.mappedCompiledPathwayIds ?? [],
      runtimeDisabledReason: record.runtimeDisabledReason ?? null,
      legalStatus: record.legalStatus ?? null,
      legalDesignStatus: record.legalDesignStatus ?? null
    },
    ledger: committedByKey.get(key)?.ledger ?? {
      requiredTreatment: track.requiredTreatment,
      implementationFamily: track.implementationFamily,
      declaredStrategy: track.declaredStrategy,
      candidateTreatment: track.candidateTreatment ?? null,
      candidateStatus: track.candidateStatus ?? null,
      candidateEvidence: track.candidateEvidence ?? null
    },
    legalName: record.legalName,
    publicName: record.publicName,
    mechanism: record.mechanism,
    authority: record.authority ?? [],
    venue: record.venue ?? null,
    destination: record.destination ?? null,
    officialSources: (record.officialSources ?? []).map((s) => ({
      title: s.title, url: s.url ?? null, retrievedOn: s.retrievedOn ?? null
    })),
    filingProfile: filing,
    packetSetComponents: (record.packetSet?.components ?? []).map((c) => ({
      componentId: c.componentId, role: c.role, requirement: c.requirement,
      outputStrategy: c.outputStrategy, officialFormId: c.officialFormId ?? null,
      officialSourceUrl: c.officialSourceUrl ?? null
    })),
    participantFilingRequirements: (record.participantFilingRequirements ?? []).map((r) => ({
      name: r.name, obtainedFrom: r.obtainedFrom ?? null, requirement: r.requirement ?? null,
      howToObtain: r.howToObtain ?? null
    })),
    manualCompletionItems: record.manualCompletionItems ?? [],
    selfHelpStopConditions: record.selfHelpStopConditions ?? [],
    scopeRestrictions: record.scopeRestrictions ?? [],
    scopeExclusionEvidence: exclusion.hits,
    legalDesignLimitations: (record.legalDesignLimitations ?? []).map((l) => ({
      classification: l.classification, statement: l.statement,
      undeterminedElement: l.undeterminedElement ?? null
    })),
    postGenerationHandoffs: record.postGenerationHandoffs ?? [],
    packetInstructions: record.packetInstructions ?? null,
    waitingPeriods: record.waitingPeriods ?? [],
    exclusions: record.exclusions ?? [],
    reviewedAsOf: record.reviewedAsOf ?? null
  });
}

const payload = {
  schemaVersion: "rcap-terminalization-evidence-briefs/v1",
  generatedBy: "scripts/generate-rcap-terminalization-briefs.mjs",
  purpose: "Exact per-track evidence for the emergency 497/497 terminalization window. A treatment may state a fact only when this brief carries it.",
  authorizationNote: "Roger authorized every nonterminal track to receive the strongest complete, safe, repository-supported terminal treatment available now. A production packet is preferred but never required merely to improve the launch count.",
  registrySource: {
    commit: regSrc.commit,
    path: REGISTRY_PATH,
    sha256: registrySha
  },
  // Also the entry-time snapshot, and for the same reason.
  ledgerSource: committed?.ledgerSource ?? {
    path: "data/rcap-ledger/track-terminalization.json",
    windowId: ledger.windowId ?? null,
    tracksTerminal: ledger.aggregates?.tracksTerminal ?? null,
    tracksNonterminal: ledger.aggregates?.tracksNonterminal ?? null
  },
  productionPacketExcludedBecause: "Every track in this window is missing_from_compiled_runtime and therefore fails the runtime-bound limb of the production-packet standard. That is a fact about routing, not a judgement about the underlying form work, and it is why the strongest available treatment for these tracks is a non-packet one.",
  counts: { briefed: briefs.length, ...counts },
  briefs
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== serialized) {
    fail("data/rcap-all50/review-artifacts/terminalization-evidence-briefs.json is stale; re-run scripts/generate-rcap-terminalization-briefs.mjs");
  }
  console.log(`OK terminalization briefs — ${briefs.length} briefed (guidance ${counts.complete_guidance}, deferral ${counts.exact_supported_deferral}, exclusion ${counts.deliberate_scope_exclusion})`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, serialized);
  console.log(`OK terminalization briefs — ${briefs.length} briefed (guidance ${counts.complete_guidance}, deferral ${counts.exact_supported_deferral}, exclusion ${counts.deliberate_scope_exclusion})`);
}
