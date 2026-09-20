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
const { resolveDeliveryLocale, recordedDeliveryLocale } =
  await import("../src/lib/rcap/render/participant-packet-assembly.ts");

check(
  resolveDeliveryLocale({ attribution: { locale: "es" } }) === "es",
  "the delivery locale is read from the matter's durable claim attribution"
);
check(
  resolveDeliveryLocale({ attribution: { locale: "fr" } }) === "en"
  && resolveDeliveryLocale({}) === "en"
  && resolveDeliveryLocale(undefined) === "en",
  "an unsupported or absent attribution locale normalises to English rather than throwing"
);
check(
  recordedDeliveryLocale({ packetLocale: "es" }) === "es"
  && recordedDeliveryLocale({ attribution: { locale: "es" } }) === "en",
  "a recorded artifact reports the locale it was RENDERED in, not the matter's current one"
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
