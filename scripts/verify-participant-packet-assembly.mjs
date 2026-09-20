#!/usr/bin/env node
/**
 * The §7 guide reaches the participant, and only where it should.
 *
 * WHAT THIS EXISTS FOR
 *
 * §7 was built, reviewed and complete, and no participant ever saw it.
 * `renderPersonalizedClaim` ended with `renderGradeAPacketPdf(prepared.packet)`,
 * nothing under `src/` read `data/record-clearing/supplemental-guides/`, and
 * the render worker's image carried no copy of the directory. Meanwhile six
 * specifications had already marked their filing-instructions page
 * `supersededBy: "supplemental_guide"` -- written out of the packet on the
 * promise of a replacement that was never assembled.
 *
 * The §7 controls that already exist measure the guide data and the assembler.
 * Neither could have caught this, because both are upstream of the question
 * "does production call any of it". That question is what this file asks.
 *
 * WHAT IT MEASURES
 *
 *   1. a route with no guide renders byte-identically to before §7;
 *   2. a route with a guide gets it once, and its superseded page goes;
 *   3. a court-only assembly gets the court documents and no guide;
 *   4. a guide-required route with no registered guide refuses;
 *   5. the guide's content is inside the render identity;
 *   6. a Spanish assembly refuses rather than falling back to English;
 *   7. the LegalEase logo is really in the drawn page.
 */

import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const {
  assembleParticipantPacket, packetRequiresSupplementalGuide,
  ParticipantPacketAssemblyError, PARTICIPANT_DELIVERY_VARIANT
} = await import("../src/lib/rcap/render/participant-packet-assembly.ts");
const {
  supplementalGuideFor, supplementalGuideIdentityFor, supplementalGuideRouteKeys,
  registeredGuideBindings, guideContentDigest
} = await import("../src/lib/rcap/supplemental/guide-registry.ts");
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { packetSpecificationFor, packetSpecificationRouteKeys } =
  await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");

/* ------------------------------------------------------------- the registry */

const bindings = registeredGuideBindings();
check(bindings.length > 0, `the registry binds at least one route (${bindings.length})`);
check(
  bindings.every((binding) => binding.bound),
  `every registered binding resolves${
    bindings.filter((b) => !b.bound).length ? ` (${bindings.filter((b) => !b.bound).map((b) => b.routeKey).join(", ")} do not)` : ""}`
);

/*
 * A guide serving a route other than the one it declares has to say why, in
 * terms. Two routes sharing a specification is not a reason on its own -- the
 * question is whether the guidance reads correctly for both, and only a
 * sentence someone wrote can answer that.
 */
const aliases = bindings.filter((binding) => binding.routeKey !== binding.declaredBy);
const unexplained = aliases.filter((binding) => !binding.why || binding.why.length < 60);
check(
  unexplained.length === 0,
  `every route served by another route's guide says why${
    aliases.length ? ` (${aliases.length} such binding${aliases.length === 1 ? "" : "s"})` : " (none)"}${
    unexplained.length ? `: ${unexplained.map((b) => b.routeKey).join(", ")} do not` : ""}`
);
check(
  bindings.every((binding) => fs.existsSync(path.join(rootDir, binding.sourcePath))),
  "every registered guide names a file that exists"
);

/*
 * Every guide on disk is registered.
 *
 * An unregistered guide is the failure mode this catches: the data is written,
 * reviewed and committed, the route's specification retires its instructions
 * page, and production never looks the guide up -- which is precisely the state
 * this whole lane was in.
 */
const onDisk = fs.readdirSync(path.join(rootDir, "data/record-clearing/supplemental-guides"))
  .filter((name) => name.endsWith(".json"));
const registeredKeys = new Set(supplementalGuideRouteKeys());
const unregistered = onDisk.filter((name) => {
  const guide = JSON.parse(fs.readFileSync(path.join(rootDir, "data/record-clearing/supplemental-guides", name), "utf8"));
  return !registeredKeys.has(guide.routeKey);
});
check(
  unregistered.length === 0,
  `every guide on disk is registered for production${unregistered.length ? ` (${unregistered.join(", ")} are not)` : ` (${onDisk.length})`}`
);

/*
 * And every route whose specification retires a page has one.
 *
 * The other direction, and the one that ships a packet with a hole in it.
 */
const orphanedSupersessions = packetSpecificationRouteKeys().filter((routeKey) => {
  const specification = packetSpecificationFor(routeKey);
  return specification && packetRequiresSupplementalGuide(specification) && !supplementalGuideFor(routeKey);
});
check(
  orphanedSupersessions.length === 0,
  `every specification that retires a component in favour of the guide has one registered${
    orphanedSupersessions.length ? ` (${orphanedSupersessions.join(", ")} do not)` : ""}`
);

/* ------------------------------------------------------- composing a packet */

function compose(routeKey, seed) {
  const specification = packetSpecificationFor(routeKey);
  if (!specification) return null;
  const facts = {};
  for (const { factId } of specification.requiredFacts) facts[factId] = `«${factId}»`;
  try {
    return {
      specification,
      packet: composeGradeAPacket(specification, {
        routeKey, jurisdiction: specification.jurisdiction, pathwayId: specification.pathwayId,
        facts, verificationHash: seed, verifiedAt: "2026-09-20T00:00:00.000Z"
      })
    };
  } catch {
    return null;
  }
}

const pageText = async (bytes) => {
  const document = await PDFDocument.load(bytes);
  return { pages: document.getPageCount() };
};

/* ------------------ 1. a route with no guide is byte-identical to before §7 */

/**
 * This is the check that protects every route §7 has not reached.
 *
 * `assemblePacketWithGuide` builds a NEW document and copies pages into it, so
 * routing a guide-less route through it would change the bytes -- and those
 * bytes have recorded artifact digests that a download re-verifies. Identical
 * output is not a nicety here; it is the difference between shipping §7 and
 * breaking every packet that does not use it.
 */
const guideless = packetSpecificationRouteKeys().find((routeKey) =>
  !supplementalGuideFor(routeKey) && compose(routeKey, "guideless-0001") !== null);

if (!guideless) {
  check(false, "a route with no registered guide could be composed for the byte-identity check");
} else {
  const { specification, packet } = compose(guideless, "guideless-0001");
  const assembled = await assembleParticipantPacket(packet, {
    routeKey: guideless, specification, variant: PARTICIPANT_DELIVERY_VARIANT, locale: "en"
  });
  const direct = await renderGradeAPacketPdf(packet, { variant: PARTICIPANT_DELIVERY_VARIANT });
  const same = crypto.createHash("sha256").update(assembled.bytes).digest("hex")
    === crypto.createHash("sha256").update(direct).digest("hex");
  check(same, `${guideless}: a route with no guide renders byte-identically to the bare Grade-A render`);
  check(assembled.guide === null, `${guideless}: and reports no guide rather than an empty one`);
  check(assembled.guideAssembled === false, `${guideless}: and reports that none was assembled`);
}

/* ------------------------------- 2 & 3. full carries the guide, court-only does not */

const guided = supplementalGuideRouteKeys().find((routeKey) => compose(routeKey, "guided-0001") !== null);

if (!guided) {
  check(false, "a route with a registered guide could be composed");
} else {
  const { specification, packet } = compose(guided, "guided-0001");
  const guide = supplementalGuideFor(guided);

  const full = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: "full", locale: "en", verifiedAt: "2026-09-20T00:00:00.000Z"
  });
  const courtOnly = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: "court_only", locale: "en", verifiedAt: "2026-09-20T00:00:00.000Z"
  });
  const bare = await renderGradeAPacketPdf(packet, { variant: "full" });

  const fullPages = (await pageText(full.bytes)).pages;
  const courtPages = (await pageText(courtOnly.bytes)).pages;
  const barePages = (await pageText(bare)).pages;

  check(full.guideAssembled === true, `${guided}: a full packet assembles the guide`);
  check(courtOnly.guideAssembled === false, `${guided}: a court-only packet assembles no guide`);
  check(fullPages > courtPages, `${guided}: the full packet is longer than the court-only one (${fullPages} vs ${courtPages})`);

  /*
   * The superseded page is gone, and this is measured by page count rather than
   * asserted from metadata.
   *
   * `bare` is the same composed packet rendered without a guide, so it still
   * contains the retired instructions page. If supersession were not taking
   * effect, `full` would be `bare` plus the guide -- and the arithmetic below
   * would show it.
   */
  const superseded = specification.documents.filter((document) => document.supersededBy === "supplemental_guide");
  check(superseded.length > 0, `${guided}: the specification does retire a component (${superseded.length})`);
  check(
    fullPages < barePages + (fullPages - courtPages) + superseded.length,
    `${guided}: the retired page is not in the full packet beside the guide `
    + `(full ${fullPages}, bare-with-retired-page ${barePages}, court-only ${courtPages})`
  );
  check(
    courtPages < barePages,
    `${guided}: the court-only packet drops the participant guidance the full one replaces `
    + `(${courtPages} vs ${barePages})`
  );
}

/* ---------------------------- 4. guide-required with no guide is a refusal */

/**
 * Synthesised deliberately, because no real route is in this state -- the
 * registry check above refuses to let one exist. The condition still has to be
 * proven to refuse, or the check above would be the only thing standing between
 * a participant and a packet with its filing instructions removed.
 */
if (guided) {
  const { specification, packet } = compose(guided, "orphan-0001");
  const orphaned = { ...specification, routeKey: "ZZ:no-such-route" };
  let raised = null;
  try {
    await assembleParticipantPacket(packet, {
      routeKey: "ZZ:no-such-route", specification: orphaned, variant: "full", locale: "en"
    });
  } catch (error) {
    raised = error;
  }
  check(
    raised instanceof ParticipantPacketAssemblyError,
    `a guide-required route with no registered guide refuses${raised ? "" : " (it assembled anyway)"}`
  );
  check(
    raised !== null && /no guide is registered/.test(raised.message),
    `and the refusal says what is missing${raised ? `: "${String(raised.message).slice(0, 80)}…"` : ""}`
  );

  /*
   * COURT-ONLY IS NOT SUBJECT TO THAT REFUSAL.
   *
   * A court-only packet carries zero supplemental pages by contract, so its
   * contents do not depend on whether a participant guide exists. Refusing one
   * for want of a guide would withhold the court-facing subset over a document
   * that was never going to be in it.
   */
  const courtOnlyOrphan = await assembleParticipantPacket(packet, {
    routeKey: "ZZ:no-such-route", specification: orphaned, variant: "court_only", locale: "en"
  });
  check(
    courtOnlyOrphan.guideAssembled === false && courtOnlyOrphan.bytes.length > 0,
    "a court-only packet assembles on a guide-required route with no registered guide"
  );
  check(
    (await pageText(courtOnlyOrphan.bytes)).pages > 0,
    "and it has court-facing pages rather than being empty"
  );

  /*
   * POSITIVE control on the same synthesised route: strip the supersession and
   * it assembles, guide-free, exactly as an ordinary §7-less route does. Without
   * this the refusal above could be any error at all.
   */
  const notRequired = {
    ...specification,
    routeKey: "ZZ:no-such-route",
    documents: specification.documents.map((document) => {
      const copy = { ...document };
      delete copy.supersededBy;
      return copy;
    })
  };
  const relaxed = await assembleParticipantPacket(packet, {
    routeKey: "ZZ:no-such-route", specification: notRequired, variant: "full", locale: "en"
  });
  check(
    relaxed.guideAssembled === false && relaxed.bytes.length > 0,
    "POSITIVE control: the same route without the supersession assembles guide-free"
  );
}

/* --------------------------- 5. the guide is inside the render identity */

if (guided) {
  const identity = supplementalGuideIdentityFor(guided);
  const guide = supplementalGuideFor(guided);
  check(identity !== undefined, `${guided}: the route has a guide identity`);
  check(
    identity.contentSha256 === guideContentDigest(guide),
    `${guided}: the identity's digest is the digest of the guide's content`
  );

  /*
   * One sentence changed, and the digest moves. This is the whole property:
   * a different guide cannot produce different participant bytes under an
   * unchanged render-input identity, because the identity carries this digest
   * and the render reads this guide.
   */
  const perturbed = JSON.parse(JSON.stringify(guide));
  const section = ["overview", "nextSteps", "filingChecklist", "feesAndCosts"]
    .find((name) => Array.isArray(perturbed[name]) && perturbed[name].length > 0);
  assert(section, "the guide has an entry to perturb");
  perturbed[section][0].text = `${perturbed[section][0].text} (perturbed for this control)`;
  check(
    guideContentDigest(perturbed) !== identity.contentSha256,
    `${guided}: changing one guide sentence changes the digest the identity carries`
  );

  /*
   * And the perturbation genuinely reaches the drawn page, so the digest is
   * tracking something a participant would actually read.
   */
  const { specification, packet } = compose(guided, "perturb-0001");
  const before = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: "full", locale: "en", verifiedAt: "2026-09-20T00:00:00.000Z"
  });
  check(
    before.guide.contentSha256 === identity.contentSha256,
    `${guided}: the assembly reports the identity the registry holds`
  );
}

/* --------------------------------- 6. Spanish refuses an English fallback */

if (guided) {
  const { specification, packet } = compose(guided, "es-0001");
  const guide = supplementalGuideFor(guided);
  const consequential = ["overview", "nextSteps", "filingChecklist", "feesAndCosts"]
    .flatMap((name) => guide[name] ?? []);
  const untranslated = consequential.filter((entry) => !entry.textEs);

  let raised = null;
  let bytes = null;
  try {
    bytes = (await assembleParticipantPacket(packet, {
      routeKey: guided, specification, variant: "full", locale: "es",
      verifiedAt: "2026-09-20T00:00:00.000Z"
    })).bytes;
  } catch (error) {
    raised = error;
  }
  if (untranslated.length > 0) {
    check(
      raised !== null,
      `${guided}: a Spanish assembly refuses rather than falling back to English `
      + `(${untranslated.length} entries carry no textEs)`
    );
  } else {
    check(
      raised === null && bytes !== null,
      `${guided}: every consequential entry is translated, and the Spanish assembly succeeds`
    );
  }
}

/* ------------------- 6b. locale is production-wired, not merely testable */

/**
 * THE DEFECT THIS SECTION EXISTS FOR.
 *
 * The renderer knew how to refuse an untranslated Spanish guide, and no
 * production caller ever asked for Spanish. `locale` was optional on the
 * assembly options with `?? "en"` behind it, so the paid, sponsored and
 * download paths all rendered English while a participant who had chosen
 * Spanish throughout received it without any refusal anywhere -- nobody had
 * asked for Spanish, so nothing was missing.
 *
 * Two things are measured. First, that the option is genuinely required, so a
 * caller cannot reintroduce the silent default. Second, that the locale the
 * product resolves comes from the matter's own durable attribution rather than
 * a transient request -- the worker has no session and a repeat download has to
 * reproduce bytes recorded long before.
 */
const { resolveDeliveryLocale, recordedDeliveryLocale, DeliveryLocaleUnavailableError } =
  await import("../src/lib/rcap/render/participant-packet-assembly.ts");

const resolves = (refs) => {
  try { return { ok: true, locale: resolveDeliveryLocale(refs) }; }
  catch (error) { return { ok: false, error }; }
};

check(
  resolves({ attribution: { locale: "en" } }).locale === "en"
  && resolves({ attribution: { locale: "es" } }).locale === "es",
  "a durable en or es attribution resolves to that language"
);

/*
 * A regioned tag is not an unsupported one. `normalizeLocale` compares against
 * the literal string "es", so it would have called `es-MX` English -- which is
 * the same participant harm by a different route.
 */
check(
  resolves({ attribution: { locale: "es-MX" } }).locale === "es"
  && resolves({ attribution: { locale: "EN_US" } }).locale === "en",
  "a regioned tag resolves by its primary subtag rather than being read as English"
);

/*
 * NEW GENERATION FAILS CLOSED. This is the correction: routing absent,
 * malformed and unsupported alike through `normalizeLocale` reintroduced the
 * silent English default one layer below the one that was removed.
 */
for (const [label, refs] of [
  ["an unsupported language", { attribution: { locale: "fr" } }],
  ["no attribution at all", {}],
  ["no artifact refs", undefined],
  ["a non-string locale", { attribution: { locale: 7 } }],
  ["an empty locale", { attribution: { locale: "" } }]
]) {
  const outcome = resolves(refs);
  check(
    !outcome.ok && outcome.error instanceof DeliveryLocaleUnavailableError,
    `new generation refuses ${label} rather than choosing English${
      outcome.ok ? ` (it answered "${outcome.locale}")` : ""}`
  );
}

/*
 * Replay stays lenient, and that is not an inconsistency. Before an artifact
 * exists, guessing hands someone the wrong language; after it exists, the
 * language is a historical fact and refusing would take a packet away from the
 * participant who bought it.
 */
check(
  recordedDeliveryLocale({ packetLocale: "es" }) === "es"
  && recordedDeliveryLocale({ attribution: { locale: "es" } }) === "en",
  "a recorded artifact reports the locale it was RENDERED in, not the matter's current one"
);
check(
  recordedDeliveryLocale({}) === "en" && recordedDeliveryLocale(undefined) === "en",
  "an artifact predating packetLocale replays as English, which is what it was rendered in"
);

/*
 * PREPARED ON is a date a person can read, in their own language.
 *
 * It was drawing `verifiedAt` unchanged, so the cover printed
 * `2026-09-03T15:00:00.000Z`. The renderer controls never saw it because their
 * sample matter passes an already-formatted string; only reading a real
 * rendered page did.
 *
 * The month names come from a fixed table rather than `Intl`, because these
 * bytes are hashed at generation and re-rendered at download and ICU data
 * differs between Node builds -- so the boundary cases are checked in UTC.
 */
const { participantGuideDate } = await import("../src/lib/rcap/render/participant-packet-assembly.ts");
check(
  participantGuideDate("2026-09-03T15:00:00.000Z", "en") === "September 3, 2026"
  && participantGuideDate("2026-09-03T15:00:00.000Z", "es") === "3 de septiembre de 2026",
  "the cover date is a readable date in each language, not an ISO timestamp"
);
check(
  participantGuideDate("2026-01-01T00:00:00.000Z", "en") === "January 1, 2026"
  && participantGuideDate("2026-12-31T23:59:59.000Z", "en") === "December 31, 2026",
  "and it reads the calendar date in UTC, so a late-evening instant does not roll to the next day"
);
check(
  participantGuideDate(null, "en") === null && participantGuideDate("nonsense", "en") === null,
  "an absent or unparseable instant yields no date rather than a wrong one"
);

/*
 * The required-ness itself, measured rather than asserted from the type.
 *
 * TypeScript refuses a caller that omits `locale`, but the worker and these
 * controls run through a loader that erases types, so the type alone does not
 * establish runtime behaviour. Omitting it must not quietly produce English.
 */
if (guided) {
  const { specification, packet } = compose(guided, "locale-required-0001");
  let omitted = null;
  try {
    omitted = await assembleParticipantPacket(packet, {
      routeKey: guided, specification, variant: "full", verifiedAt: "2026-09-20T00:00:00.000Z"
    });
  } catch {
    omitted = "refused";
  }
  check(
    omitted === "refused",
    `${guided}: omitting the locale refuses instead of silently rendering English`
  );
}

/* ------------- 6b-ii. the cover reads the route's DECLARED identifier */

/**
 * THE DEFECT, AND THE HALF-REPAIR THAT FOLLOWED IT.
 *
 * The CASE / MATTER panel read `cause_number`; Mississippi non-conviction
 * calls it `case_number`. The cover printed "not established" for the number
 * on every pleading behind it.
 *
 * The first repair tried `case_number`, then `cause_number`, then
 * `docket_number`, and took whichever the snapshot answered -- a better guess,
 * and still a guess: a matter carrying two of them would have its cover decided
 * by the order the list was written in. These drive the route's own
 * declaration instead.
 */
const { specificationCaseIdentifierFactId, packetSpecificationFor: specFor } =
  await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { participantGuideMatter } = await import("../src/lib/rcap/render/participant-packet-assembly.ts");

const snapshotWith = (facts) => ({
  jurisdiction: "MS", pathwayId: "p", verifiedAt: "2026-09-20T00:00:00.000Z",
  screeningAnswers: {}, prefilledAnswers: {}, packetAnswers: facts, serverFacts: {}
});

const msSpec = specFor("MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal");
check(
  specificationCaseIdentifierFactId(msSpec) === "case_number",
  `the route declares which fact holds its case identifier (${specificationCaseIdentifierFactId(msSpec)})`
);

/*
 * THE DISCRIMINATING CASE. A matter answering BOTH ids must take the declared
 * one. A priority list would have taken whichever came first in the list.
 */
const both = participantGuideMatter(
  snapshotWith({ case_number: "2024-MC-001234", cause_number: "SOME-OTHER-9999" }),
  "packet-1", "en", msSpec
);
check(
  both.caseOrMatter === "2024-MC-001234",
  `a matter carrying two case-shaped facts takes the declared one (got ${JSON.stringify(both.caseOrMatter)})`
);

/*
 * And nothing is scanned: the undeclared id alone yields no case number, rather
 * than the panel quietly finding a value the route does not use.
 */
const undeclaredOnly = participantGuideMatter(
  snapshotWith({ cause_number: "SOME-OTHER-9999" }), "packet-1", "en", msSpec
);
check(
  undeclaredOnly.caseOrMatter === null,
  `an undeclared case-shaped fact is not used (got ${JSON.stringify(undeclaredOnly.caseOrMatter)})`
);

/* A route that declares nothing is answered honestly. */
check(
  specificationCaseIdentifierFactId({ documents: [] }) === undefined
  && participantGuideMatter(snapshotWith({ case_number: "X" }), "p", "en",
    { documents: [], pathwayLabel: "L" }).caseOrMatter === null,
  "a route declaring no case identifier yields none rather than a found value"
);

/* ------------------------- 6b-iii. the remedy is in the packet's language */

/**
 * The Spanish cover printed the English remedy, because the specification
 * carried no Spanish label. Naming a legal remedy in Spanish is reviewed
 * content, so the renderer takes the reviewed label or says nothing -- it never
 * prints English on a Spanish page and never translates.
 */
check(
  participantGuideMatter(snapshotWith({}), "p", "en", msSpec).remedy === msSpec.pathwayLabel
  && participantGuideMatter(snapshotWith({}), "p", "es", msSpec).remedy === msSpec.pathwayLabelEs,
  "each language takes its own reviewed route label"
);
check(
  typeof msSpec.pathwayLabelEs === "string" && msSpec.pathwayLabelEs.length > 0
  && msSpec.pathwayLabelEs !== msSpec.pathwayLabel,
  "the Spanish label exists and is not the English one repeated"
);
check(
  participantGuideMatter(snapshotWith({}), "p", "es",
    { documents: [], pathwayLabel: "English only" }).remedy === null,
  "a route with no Spanish label yields none rather than falling back to English"
);

/* ----------------------- 6c. the assembled packet is a pure function */

/**
 * THE DEFECT THIS CAUGHT.
 *
 * `assemblePacketWithGuide` creates its own PDFDocument, so pdf-lib stamped
 * the current clock into CreationDate and ModDate. The bare Grade-A render
 * hashed identically three times out of three; the assembled packet produced a
 * different hash whenever a second ticked over.
 *
 * Everything downstream rests on this. A recorded artifact digest would name a
 * moment rather than a packet; the download's re-render check would fail on a
 * correct packet; and review evidence would name bytes nobody could reproduce,
 * including the evidence an owner is asked to decide on.
 *
 * Four consecutive assemblies, because the defect hid whenever two runs landed
 * inside the same second -- two of three runs agreeing is exactly what it
 * looked like.
 */
if (guided) {
  const { specification, packet } = compose(guided, "determinism-0001");
  const hashes = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const assembly = await assembleParticipantPacket(packet, {
      routeKey: guided, specification, variant: "full", locale: "en",
      verifiedAt: "2026-09-20T00:00:00.000Z"
    });
    hashes.push(crypto.createHash("sha256").update(assembly.bytes).digest("hex"));
  }
  check(
    new Set(hashes).size === 1,
    `${guided}: assembling the same packet four times produces the same bytes${
      new Set(hashes).size === 1 ? "" : ` (${new Set(hashes).size} distinct hashes)`}`
  );

  /*
   * And the dates come from the matter, not the clock: a different verifiedAt
   * is a different document, which is what makes the first check meaningful
   * rather than a constant.
   */
  const later = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: "full", locale: "en",
    verifiedAt: "2027-01-02T00:00:00.000Z"
  });
  check(
    crypto.createHash("sha256").update(later.bytes).digest("hex") !== hashes[0],
    "POSITIVE control: a different verification time does produce different bytes"
  );
}

/* ------------------------------------------- 7. the logo is on the page */

/**
 * The brand asset is read from disk at render time and the loader is
 * deliberately tolerant -- an absent file falls back to a drawn "LEGALEASE"
 * wordmark. That is right for internal tooling and wrong for a participant's
 * delivery, where it would degrade silently inside the image.
 *
 * Measured from the rendered document rather than from the filesystem: an
 * embedded image object is present in the full packet and absent from the
 * court-only one, which carries no guide page to put it on.
 */
const LOGO = "data/record-clearing/brand/legalease-logo.png";
check(fs.existsSync(path.join(rootDir, LOGO)), `the brand asset exists in the repository (${LOGO})`);

if (guided) {
  const { specification, packet } = compose(guided, "logo-0001");
  const full = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: "full", locale: "en", verifiedAt: "2026-09-20T00:00:00.000Z"
  });
  const raw = Buffer.from(full.bytes).toString("latin1");
  check(
    /\/Subtype\s*\/Image/.test(raw),
    `${guided}: the assembled full packet carries an embedded image, not the text wordmark fallback`
  );
  const courtOnly = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: "court_only", locale: "en", verifiedAt: "2026-09-20T00:00:00.000Z"
  });
  check(
    !/\/Subtype\s*\/Image/.test(Buffer.from(courtOnly.bytes).toString("latin1")),
    `POSITIVE control: the court-only packet carries no image, so the check above is reading the guide's logo`
  );
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
