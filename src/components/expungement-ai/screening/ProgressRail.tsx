"use client";

/**
 * The "path forward" progress rail — the signature element of the flow. Everything else stays
 * quiet; this is the one piece that moves. It respects reduced-motion (no width animation when
 * the user prefers reduced motion).
 */
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function ProgressRail({
  current,
  total
}: {
  /** 1-based index of the current screen. */
  current: number;
  /** Total number of question screens. */
  total: number;
}) {
  const { t: translate } = useLocalization();
  const safeTotal = Math.max(total, 1);
  const clampedCurrent = Math.min(Math.max(current, 0), safeTotal);
  const pct = Math.round((clampedCurrent / safeTotal) * 100);

  return (
    <div className="mb-6">
      <div
        className="flex items-center gap-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={clampedCurrent}
        aria-label={translate("screening.step_aria", "Step {current} of {total}", { current: clampedCurrent, total: safeTotal })}
      >
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E4E8EF]">
          <div
            className="h-full rounded-full bg-[#00A99D] transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-[#5A6275]">
          {translate("screening.step_count", "{current} of {total}", { current: clampedCurrent, total: safeTotal })}
        </span>
      </div>
    </div>
  );
}
