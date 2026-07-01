/**
 * Banner shown on a `contextOnly` question. It makes unmistakably clear that the question is
 * optional and does NOT decide the result or select a pathway (safety constraint #4). It never
 * blocks Continue.
 */
import { Info } from "lucide-react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function ContextOnlyBanner({ id }: { id?: string }) {
  const { t: translate } = useLocalization();
  return (
    <p
      id={id}
      className="flex items-start gap-2 rounded-xl border border-[#CFEAE6] bg-[#E7F7F4] px-4 py-3 text-[13px] leading-6 text-[#0B5C54]"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-bold">{translate("common.optional", "Optional")}.</strong>{" "}
        {translate("screening.context_note", "This question is just for context. It does not decide your result and you can skip it.")}
      </span>
    </p>
  );
}
