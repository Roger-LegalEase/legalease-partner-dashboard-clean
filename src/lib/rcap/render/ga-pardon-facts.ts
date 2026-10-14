import { GA_PARDON_ROUTE, georgiaConvictionCitation } from "@/lib/rcap-engine/georgia-pardon-facts";
import { GA_PARDON_CAPTION_QUESTIONS } from "@/lib/expungement-ai/ga-pardon-caption";
import { unresolvedRecordFactConfirmations } from "@/lib/expungement-ai/record-fact-clarification";
import { uncertaintyState } from "@/lib/expungement-ai/question-answer-state";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";

export const GA_PERSONALIZED_DELIVERY_ROUTE = `GA:${GA_PARDON_ROUTE}`;
const FACT_IDS = ["ga_pardoned_offense_section", "ga_pardon_date", "court", "county", "case_number", "arrest_date", "participant_narrative"] as const;
type DocumentFacts = Record<(typeof FACT_IDS)[number], string>;

/** Source-supported participant facts carried to the GA pleading. This validates
 * known protected values, not eligibility, verification or fulfillment authority.
 * Court findings, signatures and service facts are never supplied here. */
export function gaPardonDocumentFacts(snapshot: Pick<PacketVerificationSnapshot,
  "jurisdiction" | "pathwayId" | "verifiedAt" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "serverFacts"
> & Partial<Pick<PacketVerificationSnapshot, "dependencies">>): DocumentFacts {
  if (`${snapshot.jurisdiction}:${snapshot.pathwayId}` !== GA_PERSONALIZED_DELIVERY_ROUTE) {
    throw new Error("Georgia pardon document route mismatch");
  }
  const verified = new Date(snapshot.verifiedAt);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(snapshot.verifiedAt) || !Number.isFinite(verified.getTime())
    || verified.toISOString().slice(0, 10) !== snapshot.verifiedAt.slice(0, 10)) {
    throw new Error("Georgia pardon document verification date invalid");
  }
  const facts = {} as DocumentFacts;
  for (const id of FACT_IDS) {
    const supplied: string[] = [];
    for (const map of [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers, snapshot.serverFacts]) {
      if (!Object.hasOwn(map, id)) continue;
      const raw = map[id];
      const value = raw && typeof raw === "object" && !Array.isArray(raw)
        && (raw as { unknown?: unknown }).unknown === false
        ? (raw as { value?: unknown }).value : raw;
      if (typeof value !== "string" || !value.trim() || uncertaintyState(value)) throw new Error(`Georgia pardon document fact missing or unknown: ${id}`);
      supplied.push(value);
    }
    if (!supplied.length) throw new Error(`Georgia pardon document fact missing or unknown: ${id}`);
    // Preserve the established map precedence for equivalent known facts. A
    // prefix, dash style or subsection spacing is not a changed conviction.
    const meaning = (value: string) => {
      if (id !== "ga_pardoned_offense_section") return value;
      const citation = georgiaConvictionCitation(value);
      return citation ? `${citation.section}${citation.subsection}` : null;
    };
    const canonical = meaning(supplied[0]);
    if (canonical === null) throw new Error("Georgia pardon document conviction citation invalid");
    if (supplied.some(value => meaning(value) !== canonical)) throw new Error(`Georgia pardon document fact conflict: ${id}`);
    facts[id] = supplied[supplied.length - 1];
  }
  if (!georgiaConvictionCitation(facts.ga_pardoned_offense_section)) {
    throw new Error("Georgia pardon document conviction citation invalid");
  }
  for (const id of ["ga_pardon_date", "arrest_date"] as const) {
    const date = facts[id];
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== date || date > verified.toISOString().slice(0, 10)) {
      throw new Error(`Georgia pardon document ${id === "ga_pardon_date" ? "Board pardon" : "arrest"} date invalid`);
    }
  }
  const captionQuestions = new Map(GA_PARDON_CAPTION_QUESTIONS.map(question => [question.id, {
    ...question, contextOnly: question.contextOnly === true, options: null
  }]));
  if (unresolvedRecordFactConfirmations(GA_PERSONALIZED_DELIVERY_ROUTE, facts, captionQuestions,
    snapshot.dependencies?.recordFactConfirmations).length) {
    throw new Error("Georgia pardon document convicting court caption is not confirmed");
  }
  return facts;
}
