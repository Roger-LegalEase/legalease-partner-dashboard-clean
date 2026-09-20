// The Colorado families this lane engineered, and the six whose render receipt
// named a renderer that is not in the tree.
//
// The two petition families are the ones with a specification. The other four
// carry participant artifacts from the same 2026-08-12 D3A run and inherit the
// same renderer-provenance correction, because the correction is about where
// the bytes came from and that is the same question for all six.
import { JDF_417_AUTHORED } from "./jdf-417.authored";
import { JDF_612_AUTHORED } from "./jdf-612.authored";
import {
  JDF_417_BOUNDARY,
  JDF_417_CANONICAL,
  JDF_417_NEGATIVE,
  JDF_612_BOUNDARY,
  JDF_612_CANONICAL,
  JDF_612_NEGATIVE,
} from "./fixtures";
import type { AuthoredFormSpec } from "./authoring";
import type { ColoradoFactSet } from "./types";

export const COLORADO_OVERLAY_ROOT = "data/rcap-all50/overlays/production/colorado";

export interface SpecifiedFamily {
  readonly family: string;
  readonly authored: AuthoredFormSpec;
  readonly fixtures: {
    readonly canonical: ColoradoFactSet;
    readonly boundary: ColoradoFactSet;
    readonly negative: ColoradoFactSet;
  };
  /** The route this document is a component of. */
  readonly routeId: string;
}

export const SPECIFIED_FAMILIES: readonly SpecifiedFamily[] = [
  {
    family: "jdf-417-form-petition-en",
    authored: JDF_417_AUTHORED,
    fixtures: {
      canonical: JDF_417_CANONICAL,
      boundary: JDF_417_BOUNDARY,
      negative: JDF_417_NEGATIVE,
    },
    routeId: "CO:petition-based-non-conviction-sealing-jdf-417-24-72-704",
  },
  {
    family: "jdf-612-form-motion-en",
    authored: JDF_612_AUTHORED,
    fixtures: {
      canonical: JDF_612_CANONICAL,
      boundary: JDF_612_BOUNDARY,
      negative: JDF_612_NEGATIVE,
    },
    routeId: "CO:petition-based-conviction-sealing-jdf-612-24-72-706",
  },
];

/**
 * Every family whose render receipt named
 * `scripts/rcap-official-forms/lanes/d3a-regenerate.mjs`.
 *
 * Listed here rather than discovered by scanning, so a family that later
 * acquires a real renderer drops off this list by being edited out of it and
 * not by a scan quietly finding nothing.
 */
export const DANGLING_RENDERER_FAMILIES: readonly string[] = [
  "jdf-2363-form-form-en",
  "jdf-2371-form-motion-en",
  "jdf-417-form-petition-en",
  "jdf-477-form-motion-en",
  "jdf-612-form-motion-en",
  "jdf-641-form-motion-en",
];

/** The renderer path the ported manifests named, which the tree does not hold. */
export const UNRECOVERABLE_RENDERER = "scripts/rcap-official-forms/lanes/d3a-regenerate.mjs";

/** The commit the renderer's blob sits in, which is not an ancestor of the captain branch. */
export const UNRECOVERABLE_RENDERER_COMMIT = "a967fc118c4d0d864b1b8a7007635500d78758d7";

/** The commit that brought the Colorado packages onto accepted history without their renderer. */
export const PORTING_COMMIT = "9a755faf3c4baeddedb7b1665f8d5cc07ccbc06c";
