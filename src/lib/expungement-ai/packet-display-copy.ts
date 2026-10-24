import { georgiaPardonDisplay } from "@/lib/rcap-engine/georgia-pardon-facts";
import "server-only";
import type { BriefcasePresentationItem } from "@/lib/expungement-ai/briefcase-presentation-authority";
import { isMsTimingDisplayText, msTimingDisplayContext, reviewedResultRouteLabel, reviewedResultText } from "@/lib/expungement-ai/reviewed-result-copy";
import { interpolate, resolveRuntimeText } from "@/lib/expungement-ai/localization";
import catalog from "@/lib/expungement-ai/frontend/reviewed-packet-display-copy.json";

/** Display metadata only: both the authoritative route and original text must match. */
export function packetDisplayCopy(
  kind: "route_label" | "expected_packet_component",
  jurisdiction: string | null | undefined,
  pathwayId: string | null | undefined,
  english: string
): { en: string; es?: string } {
  const adopted = kind === "route_label" ? georgiaPardonDisplay(jurisdiction, pathwayId, english) : null;
  if (adopted) return adopted;
  if (!jurisdiction || !pathwayId) return { en: english };
  const routeKey = `${jurisdiction}:${pathwayId}`;
  const matches = catalog.entries.filter((entry) => entry.kind === kind
    && entry.english === english && entry.routeKeys.includes(routeKey));
  if (matches.length === 1) return { en: english, es: matches[0].spanish };
  // Preserve the packet's existing reviewed wording when screening labels grow.
  const reviewed = matches.length === 0 && kind === "route_label"
    ? reviewedResultRouteLabel(jurisdiction, pathwayId, english) : null;
  return reviewed ?? { en: english };
}

/** Translate generated route titles only; preserve other titles exactly. */
export function packetMatterTitleCopy(item: Pick<BriefcasePresentationItem,
  "authorityStatus" | "title" | "pathwayLabel" | "jurisdiction" | "pathwayId"
>): { en: string; es?: string } {
  if (item.authorityStatus === "unavailable" || item.title !== item.pathwayLabel) {
    return { en: item.title };
  }
  return packetDisplayCopy("route_label", item.jurisdiction, item.pathwayId, item.title);
}

type MatterDisplayIdentity = Pick<BriefcasePresentationItem,
  "authorityStatus" | "title" | "pathwayLabel" | "jurisdiction" | "pathwayId" | "createdAt" | "summary"
>;

export function packetMatterSummaryCopy(item: Pick<MatterDisplayIdentity, "authorityStatus" | "summary">
  & Partial<Pick<BriefcasePresentationItem, "jurisdiction" | "pathwayId" | "msTimingSummary" | "packetDraft">>): { en: string; es?: string } {
  const en = item.summary ?? "";
  if (item.authorityStatus === "unavailable") return { en };
  if (isMsTimingDisplayText(en)) {
    const generated = item.msTimingSummary;
    if (!generated || generated.context.kind !== "ms_generated_timing_display" || generated.context.jurisdiction !== "MS"
      || generated.originalEnglish !== en || item.jurisdiction !== "MS"
      || item.pathwayId !== generated.context.pathwayId || item.packetDraft?.status !== "available"
      || !generated.context.reasons.some(reason => reason.text === en)) return { en };
    // Recheck the current presented facts as well as the generated reason.
    // A copied/stale mark cannot carry an old fine/court interpretation forward.
    const current = msTimingDisplayContext({
      evaluation: { jurisdiction: item.jurisdiction, pathwayId: item.pathwayId,
        reasons: generated.context.reasons, missingQuestionIds: generated.context.missingQuestionIds },
      answers: item.packetDraft.initialAnswers,
      unresolvedFactIds: [...item.packetDraft.recordClarificationIds ?? [],
        ...item.packetDraft.questions.filter(q => q.savedAnswerNeedsClarification).map(q => q.id)]
    });
    if (!current || current.fineImposed !== generated.context.fineImposed
      || current.convictionCourt !== generated.context.convictionCourt
      || current.sentenceDate !== generated.context.sentenceDate
      || current.paymentDate !== generated.context.paymentDate) return { en };
    return reviewedResultText(en, current) ?? { en };
  }
  const reviewed = reviewedResultText(en);
  return reviewed ? { en, es: reviewed.es } : { en };
}

/** Translate only the exact generated route label; dates and saved text stay literal. */
export function packetMatterSubtitleCopy(item: MatterDisplayIdentity): { en: string; es?: string } {
  const date = new Date(item.createdAt);
  const year = Number.isNaN(date.getTime()) ? null : String(date.getFullYear());
  const label = item.authorityStatus === "unavailable" ? { en: item.pathwayLabel ?? "" }
    : packetDisplayCopy("route_label", item.jurisdiction, item.pathwayId, item.pathwayLabel ?? "");
  const en = [item.jurisdiction, label.en, year].filter(Boolean).join(", ");
  return en ? { en, es: [item.jurisdiction, label.es ?? label.en, year].filter(Boolean).join(", ") }
    : packetMatterSummaryCopy(item);
}

type MatterSentenceTemplate =
  | "Finish your {title} check"
  | "Your packet for {title} is ready with filing next steps."
  | "{title} is filed and waiting on a decision. There's nothing to do right now. We'll help you keep track."
  | "We saved step-by-step guidance for {title}. Open it whenever you're ready."
  | "Open {title} ({where}) to review what we found and what you can do next.";

/** Localize the fixed sentence before inserting protected metadata or literal user text. */
export function packetMatterSentenceCopy(item: MatterDisplayIdentity, template: MatterSentenceTemplate): { en: string; es: string } {
  const title = packetMatterTitleCopy(item);
  const where = packetMatterSubtitleCopy({ ...item, summary: null });
  return {
    en: interpolate(template, { title: title.en, where: where.en || item.jurisdiction || "saved matter" }),
    es: interpolate(resolveRuntimeText("es", template), { title: title.es ?? title.en, where: where.es || where.en || item.jurisdiction || "saved matter" })
  };
}
