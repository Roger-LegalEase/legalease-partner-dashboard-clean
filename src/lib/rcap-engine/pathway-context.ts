import { GA_PARDON_ROUTE, GA_PARDON_OLD_LABEL, GA_PARDON_LABEL } from "@/lib/rcap-engine/georgia-pardon-facts";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";

/** Existing optional-hint interpretation shared by screening and evaluation. */
export function pathwayFromContext(profile: EngineProfile, context: string) {
  context = context.toLowerCase();
  if (profile.jurisdiction.code === "GA" && [GA_PARDON_ROUTE, GA_PARDON_OLD_LABEL, GA_PARDON_LABEL.en].some(value => normalizeContextMatch(value) === normalizeContextMatch(context))) return profile.pathways.find(p => p.id === GA_PARDON_ROUTE);
  return profile.pathways.find(pathway => normalizeContextMatch(pathway.label) === normalizeContextMatch(context))
    ?? profile.pathways.find(pathway => numericContextMatch(context, `${pathway.id} ${pathway.label} ${pathway.summary}`))
    ?? profile.pathways.find(pathway => contextTokenMatch(context, pathway.label) || contextTokenMatch(context, pathway.summary));
}


function contextTokenMatch(context: string, value: string) {
  const stopwords = new Set(["pathway", "record", "records", "sealing", "expungement", "erasure", "petition", "relief", "compiled", "source"]);
  if (numericContextMatch(context, value)) return true;
  const tokens = value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 4 && !stopwords.has(token));
  return tokens.some((token) => context.includes(token));
}

function numericContextMatch(context: string, value: string) {
  const numericTokens = value.toLowerCase().match(/\b\d{2,}(?:-\d+)?\b/g) ?? [];
  return numericTokens
    .filter((token) => token.includes("-") || token.replace(/\D/g, "").length >= 3)
    .some((token) => context.includes(token));
}

function normalizeContextMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

