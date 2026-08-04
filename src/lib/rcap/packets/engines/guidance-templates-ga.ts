// Georgia guidance templates — Superior Court pleading family, Tranche 3.
//
// This pack is deliberately empty, and that is the finding rather than an
// omission.
//
// Nine of the ten tracks in this family are pure petition routes. Every
// component of every one of them is a `custom_pleading`: a petition or motion,
// a proposed order, a certificate of service and exhibit cover sheets. None of
// them carries a `process_guidance` component, so none of them needs a guidance
// template, and inventing one would put a document in a filing packet that the
// adopted legal design does not contain.
//
// The tenth track, `ga-jail-k2`, does carry one:
// `ga-jail-k2-process-guidance-3`, a required component. It is the reason that
// track is not implemented. Its guidance specification has not been drafted —
// `legal-design-specifications.json` carries process-guidance specifications
// for four Georgia tracks (`ga-nonconv-post2013`, `ga-time-expired`,
// `ga-fo-sentencing-post2026` and `ga-rfo`) and for none of the ten in this
// family. Writing the § 35-3-37(k)(2) guidance here would be authoring Georgia
// legal design inside an implementation job, which this job may not do.
//
// So the guidance pack stays empty and `ga-jail-k2` is registered as an
// explicit typed stop in
// `src/lib/rcap/packets/registry-ga-superior-court-pleading-family.ts`. A track
// whose packet cannot be completed fails closed and says why; it is not
// silently dropped from the registry, and its two drafted pleading components
// are not shipped as though they were a whole packet.
//
// When counsel drafts the `ga-jail-k2` guidance specification, the template
// belongs in this file and the typed stop comes out. Until then the empty pack
// is what honestly represents the state of the work.

import type { GuidanceTemplate } from "@/lib/rcap/packets/engines/process-guidance";

/**
 * Guidance templates for the Georgia Superior Court pleading family.
 *
 * Empty by design. See the file header: the nine implemented tracks carry no
 * `process_guidance` component, and the one that does is a typed stop because
 * its guidance specification is undrafted.
 */
export const GEORGIA_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {};

/**
 * The component that keeps `ga-jail-k2` out of the implemented set.
 *
 * Named here so the registry's typed stop and the tranche record point at the
 * same identifier rather than repeating a string literal, and so a future
 * drafting job can find every place that has to change from one symbol.
 */
export const GA_JAIL_K2_UNDRAFTED_GUIDANCE_COMPONENT_ID = "ga-jail-k2-process-guidance-3";
