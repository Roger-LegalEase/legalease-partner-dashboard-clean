import { createHash } from "node:crypto";

import districtOfColumbiaActualInnocence from "@/../data/record-clearing/supplemental-guides/DC-actual-innocence-expungement.v1.json";
import georgiaPardonedFelonyRestriction from "@/../data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json";
import georgiaSb288MisdemeanorRestriction from "@/../data/record-clearing/supplemental-guides/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json";
import illinoisFelonyProstitutionRelief from "@/../data/record-clearing/supplemental-guides/IL-felony-prostitution-relief.v1.json";
import illinoisMistakenIdentityRelief from "@/../data/record-clearing/supplemental-guides/IL-criminal-identity-theft-mistaken-identity-relief.v1.json";
import mississippiAdditionalMisdemeanorRelief from "@/../data/record-clearing/supplemental-guides/MS-additional-misdemeanor-relief.v1.json";
import mississippiFirstOffenderMisdemeanor from "@/../data/record-clearing/supplemental-guides/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json";
import mississippiNonConviction from "@/../data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json";
import wyomingFelonyConvictionExpungement from "@/../data/record-clearing/supplemental-guides/WY-felony-conviction-expungement.v1.json";

import { type SupplementalGuide } from "@/lib/rcap/supplemental/guide-contract";
import { stableStringify } from "@/lib/rcap/fulfillment/grade-a-registry";

/**
 * THE §7 GUIDES, AS A RUNTIME INPUT.
 *
 * Until this file existed the guides were verifier-only data. Three scripts
 * under `scripts/` read `data/record-clearing/supplemental-guides/`; nothing
 * under `src/` did, the render worker's image carried no copy of the
 * directory, and `renderPersonalizedClaim` ended by returning the court packet
 * directly. The guide system was complete and disconnected: a participant who
 * paid received the packet as though §7 had never been built.
 *
 * STATIC IMPORTS, NOT A DIRECTORY SCAN
 *
 * Deliberately the same shape as `packet-specification.ts`. A scan would make
 * the set of guides depend on what happens to be on disk in the image, so a
 * guide omitted from the Docker build context would read as "this route has no
 * guide" -- which is a silent downgrade to a court-only packet, exactly what
 * the §7 contract refuses. A static import cannot fail that way: the module
 * graph does not load at all if the file is missing, and the worker's preflight
 * says so before it claims a job.
 *
 * It also makes the binding reviewable. Adding a route to participant delivery
 * is a diff someone reads, not a file that appeared in a directory.
 *
 * THE DIGEST IS THE POINT
 *
 * `contentSha256` is computed over the guide's own stable serialisation, and it
 * enters the render identity. A guide whose text changes therefore changes the
 * packet id and the input hash of every job on that route: the worker cannot
 * serve bytes built from yesterday's guide under today's identity, and a stored
 * artifact cannot be re-verified against a digest recorded for different words.
 */

type RegisteredGuide = {
  /** The route the guide itself declares. Checked against the guide's own `routeKey`. */
  routeKey: string;
  guide: SupplementalGuide;
  /** The file this came from, for evidence that names a path rather than a variable. */
  sourcePath: string;
  /**
   * Other exact route keys this same guide serves, with the reason.
   *
   * One specification can serve more than one route. Mississippi's additional
   * misdemeanour relief is the live case: `ms-additional-misdemeanor-relief`
   * is the specification for both the justice-court route under 9-11-15-3 and
   * the municipal-court route under 21-23-7-6, and both retire the same two
   * components in favour of the same guide. Binding the guide to only the key
   * it declares left the municipal route retiring its filing instructions with
   * no replacement registered -- which the assembly control caught on its
   * first run.
   *
   * Listed here, one exact key at a time, rather than inferred from a shared
   * specification id or a shared family. A guide reaching a route because the
   * two happen to share a specification is how a participant ends up holding
   * another court's instructions, and nothing about sharing a document set
   * establishes that the guidance reads correctly for both.
   */
  alsoServes?: ReadonlyArray<{ routeKey: string; why: string }>;
};

const REGISTERED: ReadonlyArray<RegisteredGuide> = [
  {
    routeKey: "DC:dc_actual_innocence_expungement_16_803",
    guide: districtOfColumbiaActualInnocence as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/DC-actual-innocence-expungement.v1.json"
  },
  {
    routeKey: "GA:restriction-and-sealing-of-a-pardoned-felony",
    guide: georgiaPardonedFelonyRestriction as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json"
  },
  {
    routeKey: "GA:sb-288-misdemeanor-conviction-restriction-and-sealing",
    guide: georgiaSb288MisdemeanorRestriction as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json"
  },
  {
    routeKey: "IL:felony-prostitution-relief",
    guide: illinoisFelonyProstitutionRelief as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/IL-felony-prostitution-relief.v1.json"
  },
  {
    routeKey: "IL:criminal-identity-theft-mistaken-identity-relief",
    guide: illinoisMistakenIdentityRelief as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/IL-criminal-identity-theft-mistaken-identity-relief.v1.json"
  },
  {
    routeKey: "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
    guide: mississippiAdditionalMisdemeanorRelief as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/MS-additional-misdemeanor-relief.v1.json",
    alsoServes: [{
      routeKey: "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
      why:
        "The same specification, ms-additional-misdemeanor-relief, serves both routes and retires the same two "
        + "components on both. The guide is written for both on its face: its packet family reads "
        + "\"Additional Justice Court or Municipal Court Misdemeanors\" and its filing strip says \"Clerk of the "
        + "justice court or municipal court of conviction\". Without this the municipal route retired its filing "
        + "instructions with nothing registered to replace them."
    }]
  },
  {
    routeKey: "MS:first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1",
    guide: mississippiFirstOffenderMisdemeanor as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json"
  },
  {
    routeKey: "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
    guide: mississippiNonConviction as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json"
  },
  {
    routeKey: "WY:felony-conviction-expungement-w-s-7-13-1502",
    guide: wyomingFelonyConvictionExpungement as unknown as SupplementalGuide,
    sourcePath: "data/record-clearing/supplemental-guides/WY-felony-conviction-expungement.v1.json"
  }
];

/**
 * The route key each guide claims, checked against the key it is filed under.
 *
 * A guide bound to the wrong route would ship one jurisdiction's filing
 * instructions inside another's packet. The guides carry their own `routeKey`,
 * so the two can be compared rather than trusted, and a mismatch removes the
 * entry instead of serving it: an absent guide is a route without §7, which the
 * assembler handles; a wrong guide is a participant filing in the wrong court.
 */
const GUIDES: ReadonlyMap<string, RegisteredGuide> = new Map(
  REGISTERED
    .filter((entry) => entry.guide?.routeKey === entry.routeKey)
    .flatMap((entry) => [
      [entry.routeKey, entry] as const,
      ...(entry.alsoServes ?? []).map((alias) => [alias.routeKey, entry] as const)
    ])
);

export type SupplementalGuideIdentity = {
  routeKey: string;
  /** The guide's own schema version, so a contract change is visible in the identity. */
  schemaVersion: string;
  sourcePath: string;
  contentSha256: string;
};

/**
 * The digest that enters the render identity.
 *
 * Exported so a control can measure the property that matters -- two guides
 * that differ produce two digests -- with the same function the identity uses,
 * rather than a reimplementation of it that could agree with itself while
 * disagreeing with production.
 */
export function guideContentDigest(guide: SupplementalGuide): string {
  return createHash("sha256").update(stableStringify(guide)).digest("hex");
}

/** The registered guide for a route, or undefined where the route has none. */
export function supplementalGuideFor(routeKey: string): SupplementalGuide | undefined {
  return GUIDES.get(routeKey)?.guide;
}

/**
 * What the render identity records about the guide.
 *
 * `undefined` for a route with no guide, and that absence is itself carried
 * into the identity by the caller as an explicit null rather than an omitted
 * key -- "this route has no guide" and "nobody asked" must not serialise the
 * same way.
 */
export function supplementalGuideIdentityFor(routeKey: string): SupplementalGuideIdentity | undefined {
  const entry = GUIDES.get(routeKey);
  if (!entry) return undefined;
  return {
    routeKey: entry.routeKey,
    schemaVersion: entry.guide.schemaVersion,
    sourcePath: entry.sourcePath,
    contentSha256: guideContentDigest(entry.guide)
  };
}

export function supplementalGuideRouteKeys(): string[] {
  return [...GUIDES.keys()].sort();
}

/**
 * Every registered binding, including any dropped for a route-key mismatch and
 * every additional route a guide serves.
 */
export function registeredGuideBindings(): ReadonlyArray<{
  routeKey: string; sourcePath: string; bound: boolean; declaredBy: string; why?: string;
}> {
  return REGISTERED.flatMap((entry) => [
    {
      routeKey: entry.routeKey,
      sourcePath: entry.sourcePath,
      bound: GUIDES.get(entry.routeKey) === entry,
      declaredBy: entry.routeKey
    },
    ...(entry.alsoServes ?? []).map((alias) => ({
      routeKey: alias.routeKey,
      sourcePath: entry.sourcePath,
      bound: GUIDES.get(alias.routeKey) === entry,
      declaredBy: entry.routeKey,
      why: alias.why
    }))
  ]);
}
