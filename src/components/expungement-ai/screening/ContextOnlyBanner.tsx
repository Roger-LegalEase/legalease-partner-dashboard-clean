/**
 * Banner shown on a `contextOnly` question. It makes unmistakably clear that the question is
 * optional and never blocks Continue.
 *
 * EXPAI-FA-023: for most contextOnly questions the promise "it does not decide your result" is
 * true, and it stays. For `possible_pathway_context` it was not: the projection marks that
 * question contextOnly and doesNotSelectPathway, and `selectPathway` in the evaluator reads it as
 * its first and strongest signal — so a participant was told an answer was inert while it chose
 * their remedy. Rather than change which remedy anyone gets, the promise is made accurate: the
 * question stays optional and skippable, and the copy says what the answer is actually used for.
 */
import { Info } from "lucide-react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

/** Questions that are optional but DO steer the route, and must not claim otherwise. */
const ROUTE_STEERING_CONTEXT_QUESTION_IDS = new Set(["possible_pathway_context"]);

export function ContextOnlyBanner({ id, questionId }: { id?: string; questionId?: string }) {
  const { t: translate } = useLocalization();
  const steersTheRoute = questionId !== undefined && ROUTE_STEERING_CONTEXT_QUESTION_IDS.has(questionId);
  return (
    <p
      id={id}
      className="flex items-start gap-2 rounded-xl border border-[#CFEAE6] bg-[#E7F7F4] px-4 py-3 text-[13px] leading-6 text-[#0B5C54]"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-bold">{translate("common.optional", "Optional")}.</strong>{" "}
        {steersTheRoute
          ? translate(
            "screening.context_note_route_steering",
            "You can skip this. If you do answer it, we use it to decide which route to check for you, so answer it only if you are confident."
          )
          : translate("screening.context_note", "This question is just for context. It does not decide your result and you can skip it.")}
      </span>
    </p>
  );
}
